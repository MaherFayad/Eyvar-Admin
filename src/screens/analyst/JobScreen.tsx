/**
 * The job page (`22-analytics-v2.md` §5.2/§5.3, AC-1256…AC-1264) —
 * `/management/reports/analyst/:jobId`. **Main + rail** (§7.2): the timeline
 * and, once `done`, the result main, `Provenance` the rail. Restyled on
 * arrival: `Badge` (R7 tones, no red), `PageHeader`'s action caps.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { DetailPage } from '@/components/PageShell'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { PageHeader } from '@/components/PageHeader'
import { BlockList } from '@/components/pages/BlockList'
import { collectReportIds } from '@/components/pages/blockOps'
import { PageBlocksProvider } from '@/components/pages/PageBlocksContext'
import { useAsync } from '@/hooks'
import {
  EYVAR_TODAY,
  createAgentJob,
  getAgentJob,
  getAgentStatus,
  getPage,
  getReport,
  listAgentJobEvents,
  listDimensions,
  listMeasures,
  localDayOf,
  publishPage,
} from '@/data/clients'
import { isApiError } from '@/data/types/common'
import type { AgentEvent, AgentJob, AgentJobState } from '@/data/types/agent'
import type { SavedReport } from '@/data/types'
import { formatDate } from '@/lib'
import { useNowIso } from '@/screens/queues'
import { useShell } from '@/shell/ShellContext'
import { withFallback } from '@/screens/operations/localCopy'
import { REPORTS_EN } from '@/screens/reports/copy'
import { ANALYST_EN } from './copy'
import { JobTimeline } from './JobTimeline'
import { ProvenancePanel, type ProvenanceRun } from './ProvenancePanel'

const STATE_TONE: Record<AgentJobState, 'neutral' | 'info' | 'warning' | 'success'> = {
  queued: 'neutral',
  running: 'info',
  deferred: 'warning',
  done: 'success',
  failed: 'warning',
}

const ANALYST_INDEX_ROUTE = '/management/reports?view=analyst'

export function JobScreen() {
  const shell = useShell()
  const navigate = useNavigate()
  const { jobId = '' } = useParams()
  const t = useMemo(() => withFallback(shell.language.t, { ...REPORTS_EN, ...ANALYST_EN }), [shell.language.t])
  const { language, dir } = shell.language
  const now = useNowIso()
  const today = now ? localDayOf(now) : EYVAR_TODAY

  const initial = useAsync(
    async (signal) => {
      const [jobResult, events] = await Promise.all([
        getAgentJob(jobId, signal),
        listAgentJobEvents(jobId, undefined, signal),
      ])
      return { job: jobResult.data, events }
    },
    { deps: [jobId], isEmpty: () => false },
  )
  const notFound = initial.status === 'error' && isApiError(initial.error) && initial.error.kind === 'not-found'

  /* Takes over from `initial` once the first poll lands, so the state that
     decides the badge and the timeline is one value, never two racing ones
     (the two-`useState` version flashed the error branch for a frame while
     `initial` had resolved but a mirroring effect had not yet run). */
  const [polled, setPolled] = useState<{ job: AgentJob; events: AgentEvent[] } | null>(null)
  useEffect(() => setPolled(null), [jobId])

  const job = polled?.job ?? initial.data?.job ?? null
  const events = polled?.events ?? initial.data?.events ?? []
  const eventsRef = useRef(events)
  eventsRef.current = events

  /* AC-1267 — the "why" a queued job is not moving: `getAgentStatus`
     already drives the runner-status line elsewhere (`AnalystView.tsx`);
     `null` while unresolved is the same "a missing fact is honest" default
     `AskComposer` uses, so a queued job never claims a reason it does not
     yet know. */
  const runnerStatus = useAsync((signal) => getAgentStatus(signal), {
    deps: [job?.state],
    cacheKey: 'agent.status',
    enabled: job?.state === 'queued',
  })

  /* AC-1256 — polls the job and its events every 2 s while the job is not
     terminal. The effect's cleanup clears the interval on every state
     change, and a terminal state never sets a new one, so polling a done or
     failed job costs nothing. */
  useEffect(() => {
    if (job === null) return
    if (job.state === 'done' || job.state === 'failed') return
    let cancelled = false
    const timer = setInterval(() => {
      void (async () => {
        const after = eventsRef.current[eventsRef.current.length - 1]?.id
        const [jobResult, newEvents] = await Promise.all([getAgentJob(jobId), listAgentJobEvents(jobId, after)])
        if (cancelled) return
        setPolled({
          job: jobResult.data,
          events: newEvents.length > 0 ? [...eventsRef.current, ...newEvents] : eventsRef.current,
        })
      })()
    }, 2000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [job?.state, jobId])

  const resultPageId = job !== null && job.state === 'done' ? job.resultPageId : null

  const pageQuery = useAsync(
    async (signal) => (resultPageId ? (await getPage(resultPageId, signal)).data : null),
    { deps: [resultPageId], enabled: resultPageId !== null, isEmpty: () => false },
  )

  const catalogue = useAsync(
    async (signal) => {
      const [measures, dimensions] = await Promise.all([
        listMeasures({ pageSize: 100 }, signal),
        listDimensions({ pageSize: 100 }, signal),
      ])
      return { measures: measures.items, dimensions: dimensions.items }
    },
    { deps: [], cacheKey: 'catalogue.measures', enabled: resultPageId !== null },
  )

  /* AC-1258/AC-1259 — every `report` block on the result page names a
     `reportId` T13 saved; that saved report's own `query` and `lastRunAt`
     ARE the run's query, window and `asOf` (§5.3). No separate "run" record
     reaches the frontend today; flagged in the handoff. */
  const [runs, setRuns] = useState<readonly ProvenanceRun[]>([])
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!pageQuery.data) {
        if (!cancelled) setRuns([])
        return
      }
      const ids = Array.from(new Set(collectReportIds(pageQuery.data.blocks)))
      const next: ProvenanceRun[] = []
      for (const id of ids) {
        try {
          const { data: report } = await getReport(id)
          next.push({ reportId: id, deleted: false, name: report.name, query: report.query, asOf: report.lastRunAt })
        } catch {
          next.push({ reportId: id, deleted: true })
        }
      }
      if (!cancelled) setRuns(next)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [pageQuery.data])

  const rerun = useCallback(async () => {
    if (job === null) return
    try {
      const outcome = await createAgentJob({
        kind: job.kind,
        question: job.question,
        language: job.language,
        contextObjects: job.contextObjects,
      })
      toast.success(t('an.job.action.rerun.toast'))
      navigate(`/management/reports/analyst/${outcome.data.id}`)
    } catch {
      toast.error(t('an.job.action.rerun.failed'))
    }
  }, [job, navigate, t])

  const saveAsPage = useCallback(async () => {
    if (job?.resultPageId === null || job?.resultPageId === undefined) return
    try {
      await publishPage(job.resultPageId)
      toast.success(t('an.job.action.saveAsPage.toast'))
    } catch {
      toast.error(t('an.job.action.saveAsPage.failed'))
    }
  }, [job, t])

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success(t('an.job.action.copyLink.toast'))
    } catch {
      toast.error(t('an.job.action.copyLink.failed'))
    }
  }, [t])

  if (initial.status === 'loading') {
    return (
      <DetailPage
        header={<PageHeader title={t('an.job.loading')} meta={null} t={t} dir={dir} />}
        main={<LoadingSkeleton pattern="P5" label={t('an.job.loading')} />}
        rail={[]}
      />
    )
  }

  if (job === null) {
    return (
      <ErrorState
        scope="page"
        message={notFound ? t('an.job.notFound') : t('an.job.error')}
        action={{ label: t('an.index.error.retry'), onClick: initial.refetch }}
        secondaryAction={{ label: t('an.index.title'), onClick: () => navigate(ANALYST_INDEX_ROUTE) }}
      />
    )
  }

  const header = (
    <PageHeader
      title={job.question}
      meta={t('an.job.meta', {
        who: job.requestedBy,
        time: formatDate(job.createdAt, { style: 'day-month-time', language }),
      })}
      badges={<Badge tone={STATE_TONE[job.state]}>{t(`an.job.state.${job.state}`)}</Badge>}
      primaryAction={
        job.state === 'done' && job.resultPageId !== null
          ? { label: t('an.job.action.saveAsPage'), onClick: () => void saveAsPage() }
          : undefined
      }
      secondaryActions={[
        { label: t('an.job.action.copyLink'), onClick: () => void copyLink() },
        { label: t('an.timeline.rerun'), onClick: () => void rerun() },
      ]}
      overflowActions={[
        {
          label: t('an.job.action.pinToPage'),
          onClick: () => undefined,
          disabled: true,
          reason: t('an.job.action.pinToPage.unwired'),
        },
        {
          label: t('an.job.action.createAlert'),
          onClick: () => undefined,
          disabled: true,
          reason: t('an.job.action.createAlert.unwired'),
        },
      ]}
      t={t}
      dir={dir}
    />
  )

  const main = (
    <>
      <JobTimeline job={job} events={events} runner={runnerStatus.data} onRerun={() => void rerun()} t={t} language={language} />
      {job.state === 'done' && pageQuery.data && catalogue.data && (
        <PageBlocksProvider
          value={{
            pageId: pageQuery.data.id,
            blocks: pageQuery.data.blocks,
            measures: catalogue.data.measures,
            dimensions: catalogue.data.dimensions,
            scope: pageQuery.data.scope,
            today,
            noDataSentence: t('overview.noData'),
            t,
            language,
            dir,
            editing: false,
            actions: null,
            onOpenReport: (report: SavedReport) => navigate(`/management/reports/${report.id}`),
          }}
        >
          <BlockList blocks={pageQuery.data.blocks} containerId={null} columnIndex={null} />
        </PageBlocksProvider>
      )}
    </>
  )

  return (
    <DetailPage
      header={header}
      main={main}
      rail={job.state === 'done' ? [<ProvenancePanel key="provenance" runs={runs} t={t} language={language} />] : []}
    />
  )
}
