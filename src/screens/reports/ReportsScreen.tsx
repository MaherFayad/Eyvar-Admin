/**
 * The Report Builder sub-tab — **one screen, four surfaces, and no route
 * table row.**
 *
 * ## Why this is not routed yet, and why that is correct
 *
 * The spec puts this at `management-reports`, Management order 6. **That makes
 * 35 sub-tabs and D1 says 34.** The spec's own words: this *"is a **D1
 * amendment** and must be recorded as one in `DECISIONS.md` before the route
 * table is edited"*, and **Q-RB-1 is the business owner's and is unanswered**.
 * The data layer declined to add the row for that reason and it was right to.
 *
 * So the screens are built and mounted **behind a single mount point keyed on a
 * sub-tab id that does not exist in the table** (`routes.tsx`, `screenFor`). The
 * day the row lands, the screen appears with no code change here. Mounting it on
 * a borrowed route in the meantime would answer D1 by writing code, which is the
 * failure mode `lib/persistence.ts` names for Q1 one layer down. **AC-800 and
 * AC-806 are blocked, not passing.**
 *
 * ## `?view=` is a control, not a level
 *
 * §3.8 rule 3: the three views change the content of the sub-tab without
 * changing the path, and Browser Back returns to the previous view (AC-802).
 * They are `reports` · `dashboards` · `alerts`.
 *
 * ## `?q=` is the storage adapter
 *
 * A `?q=` on the sub-tab path opens the **builder** on that question rather than
 * the library. That is what makes `reportQueryPath` — the same function an alert
 * notification's `route` is built from (§12.5) — land the operator on the
 * picture of the thing rather than on a list, and it is what lets the core ship
 * with Q1 open (§9.2, AC-853 … AC-855).
 *
 * ## The no-data sentence comes from the metric boards' own key
 *
 * §3.7 requires it byte-identical everywhere, punctuation included. This screen
 * resolves `overview.noData` — the board's key, not a copy of its string — and
 * passes it down, so "identical everywhere" is true by construction rather than
 * by two dictionaries agreeing today (AC-844).
 */

import { useCallback } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAsync } from '@/hooks'
import { useNowIso } from '@/screens/queues'
import { useShell } from '@/shell/ShellContext'
import { EYVAR_TODAY, REPORT_QUERY_PARAM, getReport, localDayOf } from '@/data/clients'
import type { Dashboard, SavedReport, SubTabRoute } from '@/data/types'
import { Button } from '@/components/ui/button'
import { NotFoundScreen } from '@/screens/RouteStates'
import { AlertsView } from './AlertsView'
import { DashboardScreen, DashboardsView } from './DashboardsView'
import { ReportBuilder } from './ReportBuilder'
import { ReportLibrary } from './ReportLibrary'

/**
 * The id the route table will carry once **Q-RB-1** is answered. Declared here
 * so `routes.tsx` has one symbol to key its mount point on and no string to get
 * out of step with this file.
 */
export const REPORTS_SUB_TAB_ID = 'management-reports'

type View = 'reports' | 'dashboards' | 'alerts'
const VIEWS: View[] = ['reports', 'dashboards', 'alerts']

export interface ReportsScreenProps {
  /** The route-table row, once one exists. Absent today; the screen names itself. */
  row?: SubTabRoute
}

export function ReportsScreen({ row }: ReportsScreenProps) {
  const shell = useShell()
  const navigate = useNavigate()
  const location = useLocation()
  const { t, dir, language } = shell.language
  const now = useNowIso()
  /* Passed down, never read from an ambient clock inside a control. */
  const today = now ? localDayOf(now) : EYVAR_TODAY
  const params = new URLSearchParams(location.search)
  const view = (VIEWS.find((v) => v === params.get('view')) ?? 'reports') as View
  const composed = params.get(REPORT_QUERY_PARAM)

  const title = row ? t(row.titleKey) : t('rb.page.title')
  /* One key, resolved once, passed down. See the file header. */
  const noDataSentence = t('overview.noData')

  const openReport = useCallback(
    (report: SavedReport) => navigate(`/management/reports/${report.id}`),
    [navigate],
  )
  const openDashboard = useCallback(
    (dashboard: Dashboard) => navigate(`/management/reports/dashboards/${dashboard.id}`),
    [navigate],
  )
  const newReport = useCallback(
    () => navigate({ pathname: location.pathname, search: `?${REPORT_QUERY_PARAM}=` }),
    [navigate, location.pathname],
  )

  /* §3.8 rule 3 — a control, not a level. The path does not change, so Back
     returns to the previous view (AC-802). */
  const views = (
    <nav aria-label={title} className="flex gap-1">
      {VIEWS.map((each) => (
        <Button
          key={each}
          type="button"
          size="xs"
          variant={view === each ? 'secondary' : 'ghost'}
          aria-current={view === each ? 'page' : undefined}
          onClick={() =>
            navigate({ pathname: location.pathname, search: each === 'reports' ? '' : `?view=${each}` })
          }
        >
          {t(`rb.view.${each}`)}
        </Button>
      ))}
    </nav>
  )

  /* A composed question opens the builder. An empty `?q=` is `New report` —
     the builder on the unstarted question, which is R8's second kind of empty
     and not a first-run illustration. */
  if (composed !== null) {
    return (
      <ReportBuilder
        report={null}
        noDataSentence={noDataSentence}
        title={title}
        t={t}
        language={language}
        dir={dir}
        onSaved={openReport}
      />
    )
  }

  if (view === 'dashboards') {
    return (
      <DashboardsView title={title} views={views} onOpen={openDashboard} t={t} language={language} dir={dir} />
    )
  }

  if (view === 'alerts') {
    return <AlertsView title={title} views={views} today={today} t={t} language={language} dir={dir} />
  }

  return (
    <ReportLibrary
      title={title}
      views={views}
      onOpen={openReport}
      onNew={newReport}
      t={t}
      language={language}
      dir={dir}
    />
  )
}

/* ─────────────────────────── the detail routes ─────────────────────────── */

/**
 * `/management/reports/:reportId` — a saved report, re-run.
 *
 * §9.3: re-opening a saved report **restores the query, runs it, and shows a
 * fresh `asOf`. It does not show the numbers from when it was saved** — a
 * report is a question, not an answer.
 *
 * A 404 is **§8.3 state 12**, not a navigation: the report was deleted while
 * someone had it open, so it becomes read-only with a stated notice and `Save`
 * becomes `Save as new`. The URL is not rewritten (AC-804).
 */
export function SavedReportScreen({ row }: ReportsScreenProps) {
  const shell = useShell()
  const navigate = useNavigate()
  const { reportId = '' } = useParams()
  const { t, dir, language } = shell.language

  const report = useAsync(async (signal) => {
    try {
      return { report: (await getReport(reportId, signal)).data, deleted: false }
    } catch {
      /* Deleted — or never existed. Both leave the operator on this URL with
         the shell intact; neither rewrites the address bar. */
      return { report: null, deleted: true }
    }
  }, { deps: [reportId], isEmpty: () => false })

  const title = report.data?.report?.name ?? (row ? t(row.titleKey) : t('rb.page.title'))

  if (report.status === 'loading') return null

  return (
    <ReportBuilder
      report={report.data?.report ?? null}
      deleted={report.data?.deleted ?? false}
      noDataSentence={t('overview.noData')}
      title={title}
      t={t}
      language={language}
      dir={dir}
      onSaved={(saved) => navigate(`/management/reports/${saved.id}`)}
    />
  )
}

/** `/management/reports/dashboards/:dashboardId`. */
export function DashboardDetailScreen() {
  const shell = useShell()
  const navigate = useNavigate()
  const { dashboardId = '' } = useParams()
  const { t, dir, language } = shell.language
  const now = useNowIso()
  const today = now ? localDayOf(now) : EYVAR_TODAY

  if (dashboardId === '') return <NotFoundScreen />

  return (
    <DashboardScreen
      dashboardId={dashboardId}
      today={today}
      onOpenReport={(report) => navigate(`/management/reports/${report.id}`)}
      onAddReport={() => navigate('/management/reports')}
      noDataSentence={t('overview.noData')}
      t={t}
      language={language}
      dir={dir}
    />
  )
}
