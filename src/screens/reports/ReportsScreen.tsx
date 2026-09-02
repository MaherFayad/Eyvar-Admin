/**
 * The Report Builder sub-tab — **one screen, four surfaces**, at
 * `/management/reports`.
 *
 * ## It shipped unrouted for a wave, and that was the right call
 *
 * The spec puts this at `management-reports`, Management order 6. **That made
 * 35 sub-tabs where D1 said 34.** The spec's own words: it *"is a **D1
 * amendment** and must be recorded as one in `DECISIONS.md` before the route
 * table is edited"*, and Q-RB-1 was the business owner's. The data layer
 * declined to add the row and was right to.
 *
 * So the screens were built and mounted **behind a mount point keyed on a
 * sub-tab id that did not yet exist in the table** (`routes.tsx`, `screenFor`).
 * Mounting them on a borrowed route in the meantime would have answered D1 by
 * writing code — the failure mode `lib/persistence.ts` names for Q1 one layer
 * down. **Q-RB-1 is now answered and D1a is recorded**; the row landed and this
 * file did not change, which is the whole argument for having waited.
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

import { useCallback, useMemo } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAsync } from '@/hooks'
import { useNowIso } from '@/screens/queues'
import { useShell } from '@/shell/ShellContext'
import { EYVAR_TODAY, REPORT_QUERY_PARAM, getReport, localDayOf } from '@/data/clients'
import type { SavedReport, SubTabRoute } from '@/data/types'
import { AlertsView } from './AlertsView'
import { DashboardsView } from './DashboardsView'
import { ReportBuilder } from './ReportBuilder'
import { ReportLibrary } from './ReportLibrary'
import { REPORTS_VIEWS, type ReportsView } from './views'
import { withFallback } from '../operations/localCopy'
import { REPORTS_EN } from './copy'

/**
 * The id the route table carries. **Moved to `./ids.ts`** when route-level code
 * splitting landed: `routes.tsx` keys its Reports branch on this id, and a
 * static import of a symbol declared *here* would drag this screen — and through
 * the barrel, the whole Report Builder — back into the entry chunk.
 *
 * Re-exported so every existing importer is unaffected. There is still exactly
 * one declaration and no string to get out of step.
 */
export { REPORTS_SUB_TAB_ID } from './ids'

/**
 * **Three, and the list lives in `views.ts`.**
 *
 * This file declared two — `'reports' | 'alerts'` — against the route table's
 * three, and the mismatch was silent: `?view=dashboards` failed the `find`
 * below and fell back to `reports`, so the Dashboards view was *unreachable*
 * rather than broken and nothing on screen said so. That is the assertion
 * failing at `clients/routes.test.ts:225`.
 *
 * `REPORTS_VIEWS` is re-exported unchanged, because `routes.test.ts` imports it
 * from here and the route table is what it is held against.
 */
const VIEWS: ReportsView[] = [...REPORTS_VIEWS]
export { REPORTS_VIEWS }

export interface ReportsScreenProps {
  /** The route-table row, once one exists. Absent today; the screen names itself. */
  row?: SubTabRoute
}

export function ReportsScreen({ row }: ReportsScreenProps) {
  const shell = useShell()
  const navigate = useNavigate()
  const location = useLocation()
  /* AC-74 — the copy lives in `./copy.ts` and travels in this screen's
     own chunk. `withFallback` resolves a key the shell dictionary does
     not carry, so nothing here needs registering there. */
  const t = useMemo(
    /* **Memoised, and it is load-bearing.** `withFallback` returns a NEW
       function on every call, and several screens carry `t` in a `deps`
       array — so an unmemoised wrapper re-ran the fetch, which re-rendered,
       which rebuilt the wrapper. Two suites hung outright. */
    () => withFallback(shell.language.t, REPORTS_EN),
    [shell.language.t],
  )
  const { dir, language } = shell.language
  const now = useNowIso()
  /* Passed down, never read from an ambient clock inside a control. */
  const today = now ? localDayOf(now) : EYVAR_TODAY
  const params = new URLSearchParams(location.search)
  const view = (VIEWS.find((v) => v === params.get('view')) ?? 'reports') as ReportsView
  const composed = params.get(REPORT_QUERY_PARAM)

  const title = row ? t(row.titleKey) : t('rb.page.title')
  /* One key, resolved once, passed down. See the file header. */
  const noDataSentence = t('overview.noData')

  const openReport = useCallback(
    (report: SavedReport) => navigate(`/management/reports/${report.id}`),
    [navigate],
  )
  const newReport = useCallback(
    () => navigate({ pathname: location.pathname, search: `?${REPORT_QUERY_PARAM}=` }),
    [navigate, location.pathname],
  )

  const selectView = useCallback(
    (v: ReportsView) => {
      navigate({ pathname: location.pathname, search: v === 'reports' ? '' : `?view=${v}` })
    },
    [navigate, location.pathname],
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
      <DashboardsView
        title={title}
        activeView={view}
        onSelectView={selectView}
        /* §3.8 rule 2 — a named record is a LEVEL, not a `?view=`. Opening a
           dashboard is a navigation, and Back returns to the list. */
        onOpen={(dashboard) => navigate(`/management/reports/dashboards/${dashboard.id}`)}
        t={t}
        language={language}
        dir={dir}
      />
    )
  }

  if (view === 'alerts') {
    return (
      <AlertsView
        title={title}
        activeView={view}
        onSelectView={selectView}
        today={today}
        t={t}
        language={language}
        dir={dir}
      />
    )
  }

  return (
    <ReportLibrary
      title={title}
      activeView={view}
      onSelectView={selectView}
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
  }, {
    /* **Deliberately NOT cached (P3-13).** The `catch` above turns *any*
       failure - including a transient transport error - into
       `{ report: null, deleted: true }`, which `useAsync` would then store as a
       success. A blip would become a sticky "this report was deleted" for the
       full TTL across remounts. Cacheable once the catch is narrowed to
       `isApiError(e) && e.kind === 'not-found'`. */
    deps: [reportId],
    isEmpty: () => false,
  })

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

/* `DashboardDetailScreen` used to live here and return `null`. It is a real
   screen now — `DashboardDetailScreen.tsx` — and `routes.tsx` dispatches to it
   on `detail.kind === 'dashboard'`. The barrel keeps the export name. */
