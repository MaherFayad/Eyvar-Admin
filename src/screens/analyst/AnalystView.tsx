/**
 * The analyst index (`22-analytics-v2.md` §4/§5.4, AC-1254/AC-1255/AC-1264)
 * — `?view=analyst`. **Index table** (`patterns.md`) over `agent.jobs.list`,
 * the ask composer inline above it, never a dialog. State badge: `queued`
 * neutral · `running` info · `deferred` warning · `done` success · `failed`
 * warning — no red (R7). Restyled on arrival: `DataTable`, `Badge`, `Tabs`.
 */

import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { DataTable, type RowAction } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { DataColumn } from '@/components/table/columns'
import { useAsync, useIndexTable } from '@/hooks'
import { createAgentJob, getAgentStatus, listAgentJobs } from '@/data/clients'
import type { AgentJob, AgentJobKind, AgentJobState, AgentRunner } from '@/data/types/agent'
import { formatDate, isolatedRunProps, type Language, type Translator } from '@/lib'
import { reportsViewTabs, type ReportsView } from '@/screens/reports/views'
import { AskComposer } from './AskComposer'
import { readAnalystEntryContext, toAgentJobContext, withoutAnalystEntryContext } from './entryContext'
import { SchedulesPanel } from './SchedulesPanel'

export interface AnalystViewProps {
  title: string
  activeView?: ReportsView
  onSelectView?: (view: ReportsView) => void
  currentUserId: string
  t: Translator
  language: Language
  dir: 'ltr' | 'rtl'
}

const STATE_TONE: Record<AgentJobState, 'neutral' | 'info' | 'warning' | 'success'> = {
  queued: 'neutral',
  running: 'info',
  deferred: 'warning',
  done: 'success',
  failed: 'warning',
}

const KIND_KEY: Record<AgentJobKind, string> = {
  ask: 'an.kind.ask',
  'case-study': 'an.kind.caseStudy',
  'build-page': 'an.kind.buildPage',
  'triage-alert': 'an.kind.triageAlert',
  'weekly-review': 'an.kind.weeklyReview',
}

type AnalystIndexView = 'mine' | 'team'
const ANALYST_INDEX_VIEWS: readonly AnalystIndexView[] = ['mine', 'team']

/** §8 — the top-level content switch. `jobs` is what the screen has always shown; `schedules` is new. Exactly one of the two is mounted at a time, so the screen still has exactly one primary button (R3) regardless of which tab is active. */
type AnalystContentTab = 'jobs' | 'schedules'
const ANALYST_CONTENT_TABS: readonly AnalystContentTab[] = ['jobs', 'schedules']

/** §5.4 — a leading dot plus text, `role="status"`. Omitted entirely when the request itself fails (a missing fact is honest, a guessed one is not). */
function RunnerStatusLine({ runner, language, t }: { runner: AgentRunner; language: Language; t: Translator }) {
  if (runner.online && runner.limitedUntil === null) {
    return (
      <span role="status" className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-success-foreground animate-live-pulse" />
        {t('an.runner.online', {
          time: runner.lastHeartbeatAt ? formatDate(runner.lastHeartbeatAt, { style: 'time', language }) : '',
        })}
      </span>
    )
  }
  if (runner.limitedUntil !== null) {
    return (
      <span role="status" className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-muted-foreground" />
        {t('an.runner.limited', { time: formatDate(runner.limitedUntil, { style: 'time', language }) })}
      </span>
    )
  }
  return (
    <span role="status" className="inline-flex items-center gap-1.5">
      <span aria-hidden="true" className="size-1.5 rounded-full bg-muted-foreground" />
      {t('an.runner.offline')}
    </span>
  )
}

export function AnalystView({ title, activeView = 'analyst', onSelectView, currentUserId, t, language, dir }: AnalystViewProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const table = useIndexTable<AgentJob>({ mode: 'index', getRowId: (row) => row.id })
  const [indexView, setIndexView] = useState<AnalystIndexView>('team')
  const [contentTab, setContentTab] = useState<AnalystContentTab>('jobs')
  const [submitting, setSubmitting] = useState(false)

  /* AC-1262 — read once, on this mount, the context an entry point handed
     over; `undefined` means "not yet read" so a later render (after the
     strip below fires) does not overwrite it with `null`. */
  const entryContextRef = useRef<ReturnType<typeof readAnalystEntryContext> | undefined>(undefined)
  if (entryContextRef.current === undefined) {
    entryContextRef.current = readAnalystEntryContext(location.search)
  }
  useEffect(() => {
    if (!entryContextRef.current) return
    navigate(
      { pathname: location.pathname, search: withoutAnalystEntryContext(location.search) },
      { replace: true },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const status = useAsync((signal) => getAgentStatus(signal), { cacheKey: 'agent.status' })
  const jobs = useAsync((signal) => listAgentJobs({ ...table.params, view: indexView }, signal), {
    deps: [JSON.stringify(table.params), indexView],
    cacheKey: 'agent.jobs.list',
  })

  const rows = jobs.data?.items ?? []
  const openJob = (job: AgentJob) => navigate(`/management/reports/analyst/${job.id}`)

  const ask = async (input: { kind: AgentJobKind; question: string; contextObjects: AgentJob['contextObjects'] }) => {
    setSubmitting(true)
    try {
      const outcome = await createAgentJob({ ...input, language: language === 'ar' ? 'ar' : 'en' })
      openJob(outcome.data)
    } catch {
      toast.error(t('an.compose.error'))
    } finally {
      setSubmitting(false)
    }
  }

  const columns: Array<DataColumn<AgentJob>> = [
    {
      id: 'question',
      header: t('an.index.col.question'),
      alwaysVisible: true,
      minWidth: 280,
      dataType: 'text',
      /* A flex row around the truncating span, on `PagesView`'s own
         precedent — `min-w-0` only shrinks a FLEX child, so a bare span
         with no flex parent wraps instead of ellipsising (found live: the
         question column overlapped the row below it at 1280). */
      cell: (row) => (
        <span className="flex min-w-0 items-center">
          <span {...isolatedRunProps({ className: 'min-w-0 truncate' }).box}>
            <bdi {...isolatedRunProps().run}>{row.question}</bdi>
          </span>
        </span>
      ),
    },
    {
      id: 'kind',
      header: t('an.index.col.kind'),
      width: 120,
      dataType: 'enum',
      filter: {
        kind: 'select',
        field: 'kind',
        options: Object.entries(KIND_KEY).map(([value, key]) => ({ value, label: t(key) })),
      },
      cell: (row) => t(KIND_KEY[row.kind]),
    },
    {
      id: 'state',
      header: t('an.index.col.state'),
      width: 110,
      dataType: 'enum',
      filter: {
        kind: 'select',
        field: 'state',
        options: Object.keys(STATE_TONE).map((value) => ({ value, label: t(`an.job.state.${value}`) })),
      },
      cell: (row) => <Badge tone={STATE_TONE[row.state]}>{t(`an.job.state.${row.state}`)}</Badge>,
    },
    {
      id: 'requestedBy',
      header: t('an.index.col.requestedBy'),
      width: 130,
      dataType: 'text',
      /* AR2 — a raw operator id is content, not a translated word, and needs
         the same bidi isolation `PagesView.tsx`'s owner column already uses. */
      cell: (row) =>
        row.requestedBy === currentUserId ? (
          t('an.index.owner.you')
        ) : (
          <span {...isolatedRunProps({ className: 'min-w-0 truncate' }).box}>
            <bdi {...isolatedRunProps().run}>{row.requestedBy}</bdi>
          </span>
        ),
    },
    {
      id: 'started',
      header: t('an.index.col.started'),
      width: 150,
      sortField: 'createdAt',
      dataType: 'date',
      cell: (row) => (row.startedAt ? <bdi>{formatDate(row.startedAt, { style: 'day-month-time', language })}</bdi> : null),
    },
    {
      id: 'result',
      header: t('an.index.col.result'),
      width: 90,
      dataType: 'text',
      cell: (row) => (row.resultPageId !== null ? t('an.index.open') : null),
    },
  ]

  const rowActions: Array<RowAction<AgentJob>> = [{ label: t('an.index.open'), onSelect: openJob, rowClick: true }]

  return (
    <SingleColumnPage
      header={
        <PageHeader
          title={title}
          meta={status.data ? <RunnerStatusLine runner={status.data} language={language} t={t} /> : null}
          t={t}
          dir={dir}
        />
      }
    >
      <div className="flex flex-col gap-3">
        <Tabs value={contentTab} onValueChange={(value) => setContentTab(value as AnalystContentTab)}>
          <TabsList variant="segmented">
            {ANALYST_CONTENT_TABS.map((tab) => (
              <TabsTrigger key={tab} value={tab}>
                {t(`an.contentTab.${tab}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {contentTab === 'schedules' ? (
          <SchedulesPanel currentUserId={currentUserId} t={t} language={language} />
        ) : (
          <>
            <AskComposer
              runner={status.data ?? null}
              submitting={submitting}
              onAsk={ask}
              initialAttachment={
                entryContextRef.current
                  ? { context: toAgentJobContext(entryContextRef.current), label: entryContextRef.current.label }
                  : null
              }
              t={t}
              language={language}
            />

            <Tabs value={indexView} onValueChange={(value) => setIndexView(value as AnalystIndexView)}>
              <TabsList variant="segmented">
                {ANALYST_INDEX_VIEWS.map((view) => (
                  <TabsTrigger key={view} value={view}>
                    {t(`an.view.${view}`)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <DataTable
              table={table}
              rows={rows}
              columns={columns}
              getRowId={(row) => row.id}
              status={jobs.status}
              total={jobs.data?.total ?? 0}
              t={t}
              language={language}
              tableId="management-reports-analyst"
              view={activeView}
              tabs={reportsViewTabs(t)}
              activeTab={activeView}
              onSelectTab={(id) => onSelectView?.(id as ReportsView)}
              rowActions={rowActions}
              skeletonPattern="P1"
              searchPlaceholder={t('an.index.search')}
              firstRun={{ heading: t('an.index.firstRun.heading'), body: t('an.index.firstRun.body'), actions: [] }}
              noMatch={{ message: t('an.index.noMatch'), action: { label: t('an.index.noMatch.action'), onClick: table.clearAll } }}
              error={{ message: t('an.index.error'), onRetry: jobs.refetch }}
            />
          </>
        )}
      </div>
    </SingleColumnPage>
  )
}
