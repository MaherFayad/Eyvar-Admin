/**
 * The job page (AC-1256…AC-1264), `/management/reports/analyst/:jobId`.
 * Main + rail (§7.2): the timeline and, once `done`, the result main,
 * with `Provenance` in the rail.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
import { DetailPage } from '@/components/PageShell'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { PageHeader } from '@/components/PageHeader'
import { BlockList } from '@/components/pages/BlockList'
import { PageBlocksProvider } from '@/components/pages/PageBlocksContext'
import { useAsync } from '@/hooks'
import {
  EYVAR_TODAY,
  createAgentJob,
  getAgentJob,
  getAgentStatus,
  getPage,
  getRun,
  listAgentJobEvents,
  listDimensions,
  listMeasures,
  listPages,
  localDayOf,
  publishPage,
  savePage,
} from '@/data/clients'
import { isApiError } from '@/data/types/common'
import type { AgentEvent, AgentJob, AgentJobState } from '@/data/types/agent'
import type { AlertRule } from '@/data/types'
import type { SavedReport } from '@/data/types'
import { pageTemplate, type AgentAlertProposal, type Block, type Page } from '@/data/types/page'
import { formatDate } from '@/lib'
import { useNowIso } from '@/screens/queues'
import { useShell } from '@/shell/ShellContext'
import { withFallback } from '@/screens/operations/localCopy'
import { AlertRuleDialog } from '@/screens/reports/AlertRuleDialog'
import { REPORTS_EN } from '@/screens/reports/copy'
import { withIsolatedParam } from './bidiSentence'
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

/** Every `runId` an `agent-insight` block carries, depth-first through `toggle`/`columns` (`caseStudyToBlocks`'s own nesting, F-V2-90). */
function collectAgentInsightRunIds(blocks: readonly Block[]): string[] {
  const ids: string[] = []
  for (const block of blocks) {
    if (block.type === 'agent-insight') ids.push(...block.runIds)
    if (block.type === 'toggle') ids.push(...collectAgentInsightRunIds(block.blocks))
    if (block.type === 'columns') for (const column of block.columns) ids.push(...collectAgentInsightRunIds(column.blocks))
  }
  return ids
}

/** AC-1260 — the first finding that got one (`caseStudyToBlocks.ts`'s
 * `alertProposalFor`), same depth-first order as `collectAgentInsightRunIds`.
 * `null` when the study proposed no alert, which disables the action with a
 * reason rather than hiding it. */
function firstAlertProposal(blocks: readonly Block[]): AgentAlertProposal | null {
  for (const block of blocks) {
    if (block.type === 'agent-insight' && block.alertProposal) return block.alertProposal
    if (block.type === 'toggle') {
      const nested = firstAlertProposal(block.blocks)
      if (nested) return nested
    }
    if (block.type === 'columns') {
      for (const column of block.columns) {
        const nested = firstAlertProposal(column.blocks)
        if (nested) return nested
      }
    }
  }
  return null
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

  /* F-V2-90 — every `runId` the study actually CITED, read from the page's
     own `agent-insight` blocks (`caseStudyToBlocks`'s `runIds`), not the
     `report` blocks a chart happens to have. A `report` block names a saved
     report and may cite none, few, or the wrong runs of what a finding's
     number was actually evidenced by. */
  const runIdsCited = useMemo(
    () => (pageQuery.data ? Array.from(new Set(collectAgentInsightRunIds(pageQuery.data.blocks))) : []),
    [pageQuery.data],
  )

  /* AC-1260 — the proposal the overflow action prefills the composer with,
     or `null` to disable it in place with a reason (never hidden, R rule
     "illegal is disabled in place"). */
  const alertProposal = useMemo(
    () => (pageQuery.data ? firstAlertProposal(pageQuery.data.blocks) : null),
    [pageQuery.data],
  )
  const runsAsync = useAsync<readonly ProvenanceRun[]>(
    async (signal) =>
      Promise.all(
        runIdsCited.map(async (runId): Promise<ProvenanceRun> => {
          try {
            const { data: run } = await getRun(runId, signal)
            return { runId, status: 'ok', query: run.query, asOf: run.asOf }
          } catch (error) {
            /* A citation that no longer resolves is the case an operator
               most needs to see, never a silent drop — anything else (a
               network fault) is a real panel error, not a missing run. */
            if (isApiError(error) && error.kind === 'not-found') return { runId, status: 'missing' }
            throw error
          }
        }),
      ),
    {
      deps: [runIdsCited.join(',')],
      enabled: pageQuery.data !== null && pageQuery.data !== undefined,
      isEmpty: (rows) => rows.length === 0,
    },
  )

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

  /* AC-1260 — inline, same no-dialog panel `AlertRuleDialog` already is
     everywhere else it opens (`BlockMenu.tsx`). The operator reviews and
     saves it themselves; nothing here calls `saveAlertRule` directly. */
  const [alertOpen, setAlertOpen] = useState(false)
  const onAlertSaved = useCallback(
    (rule: AlertRule) => {
      setAlertOpen(false)
      toast.success(t('rb.alert.toast.saved', { name: rule.name }))
    },
    [t],
  )

  /* AC-1260 — a bookmark block, `BookmarkBlockView`'s `{kind:'page'}`, is the
     same "pin this result onto a dashboard" shape `ReportBuilder`'s own
     `Pin to a page…` uses, restyled from that picker rather than a second one.
     Fetched only once the inline picker opens. */
  const [pinOpen, setPinOpen] = useState(false)
  const pinPages = useAsync(
    async (signal) => {
      const result = await listPages(
        { pageSize: 100, filters: [{ field: 'kind', op: 'eq', value: 'dashboard' }] },
        signal,
      )
      const items = result.items.filter((page) => !pageTemplate(page))
      return { ...result, items, total: items.length }
    },
    { deps: [pinOpen], enabled: pinOpen, cacheKey: 'pages.list.dashboard', isEmpty: (res) => res.items.length === 0 },
  )
  const pinToPage = useCallback(
    async (page: Page) => {
      if (!job || job.resultPageId === null) return
      try {
        const outcome = await savePage({
          id: page.id,
          kind: page.kind,
          title: page.title,
          icon: page.icon,
          description: page.description,
          visibility: page.visibility,
          tags: page.tags,
          scope: page.scope,
          blocks: [
            ...page.blocks,
            { id: `AIB-${page.id}-${job.id}`, type: 'bookmark', target: { kind: 'page', id: job.resultPageId } },
          ],
          version: page.version,
        })
        if (outcome.status !== 'saved') throw new Error('pin failed')
        setPinOpen(false)
        toast.success(t('rb.overflow.pin.toast', { page: page.title }))
      } catch {
        toast.error(t('rb.overflow.pin.failed'))
      }
    },
    [job, t],
  )

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
      meta={withIsolatedParam(
        t,
        'an.job.meta',
        { who: job.requestedBy, time: formatDate(job.createdAt, { style: 'day-month-time', language }) },
        'who',
      )}
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
          onClick: () => setPinOpen(true),
          disabled: job.state !== 'done' || job.resultPageId === null,
          reason: job.state !== 'done' || job.resultPageId === null ? t('an.job.action.pinToPage.noResult') : null,
        },
        {
          /* AC-1260 — disabled in place, never hidden, when this study
             proposed no alert (`alertProposal`, `caseStudyToBlocks.ts`). */
          label: t('an.job.action.createAlert'),
          onClick: () => setAlertOpen(true),
          disabled: alertProposal === null,
          reason: alertProposal === null ? t('an.job.action.createAlert.noProposal') : null,
        },
      ]}
      t={t}
      dir={dir}
    />
  )

  const main = (
    <>
      {/* AC-1260 — inline, never a dialog (the surface's own no-dialog
          ruling, `AskComposer.tsx`'s header comment). Closes itself once a
          page is picked; `Cancel` reuses the builder's own copy key. */}
      {pinOpen && (
        <div className="mb-3 flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
          <h2 className="text-sm font-medium text-foreground">{t('an.job.action.pinToPage')}</h2>
          <Command>
            <CommandList>
              <CommandEmpty>
                {pinPages.status === 'loading'
                  ? t('rb.overflow.pin.loading')
                  : pinPages.status === 'error'
                    ? t('rb.overflow.pin.error')
                    : t('rb.overflow.pin.empty')}
              </CommandEmpty>
              <CommandGroup>
                {(pinPages.data?.items ?? []).map((page) => (
                  <CommandItem key={page.id} value={page.title} onSelect={() => void pinToPage(page)}>
                    <bdi>{page.title}</bdi>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
          <div className="flex justify-end">
            <Button type="button" variant="secondary" size="xs" onClick={() => setPinOpen(false)}>
              {t('rb.save.cancel')}
            </Button>
          </div>
        </div>
      )}
      {/* AC-1260 — the operator's own review and save; nothing here arms a
          rule on the agent's say-so (§5, "an agent proposes, it never
          arms"). */}
      {alertOpen && alertProposal && (
        <AlertRuleDialog
          open
          onOpenChange={(next) => !next && setAlertOpen(false)}
          rule={null}
          presetReportId={alertProposal.reportId}
          presetSeriesId={alertProposal.seriesId}
          presetCondition={alertProposal.condition}
          onSaved={onAlertSaved}
          today={today}
          t={t}
          language={language}
        />
      )}
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
      rail={
        job.state === 'done'
          ? [
              <ProvenancePanel
                key="provenance"
                status={runsAsync.status}
                runs={runsAsync.data ?? []}
                onRetry={runsAsync.refetch}
                t={t}
                language={language}
              />,
            ]
          : []
      }
    />
  )
}
