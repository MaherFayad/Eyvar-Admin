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
 * ## Switching a view amends the address; it never composes a new one
 *
 * `selectView` used to write `search: v === 'reports' ? '' : '?view=' + v`.
 * **That threw the rest of the query string away in both directions**, and the
 * rest of the query string is not decoration:
 *
 * - `?q=` — the composed report. Compose a question, look at Dashboards, come
 *   back, and every control was empty again. That is the owner's own sentence:
 *   *"I shouldn't keep choosing all values over and over again everytime I
 *   change one tab."*
 * - `?q=` / `?sort=` / `?page=` / `?filter=` **as `useUrlTableState` writes
 *   them** — the library's search text, its sort and its filter chips. §3.1's
 *   index-table state lives in the address (`useUrlTableState.ts`), so a
 *   composed `search` string wiped the operator's list query too.
 * - `?failSeries=` — the partial-failure seam AC-852 rides on.
 *
 * So every writer here goes through `URLSearchParams` built **from the current
 * search**, and the view switch goes through `withView` — `routeState.ts`'s one
 * writer for `?view=`, the same helper `useScreenViews` uses on the other seven
 * screens. There is no second copy of this rule in this file.
 *
 * ## `?view=` decides the surface; `?q=` rides along
 *
 * A composed question used to win over `?view=` unconditionally, which is why
 * preserving it is not enough on its own: `?q=…&view=dashboards` would have
 * rendered the builder and the Dashboards tab would have looked broken. The
 * view decides **which of the four surfaces renders**, and the question is
 * *retained state* that the Reports view picks back up. Both directions of the
 * round trip therefore work, and neither loses anything.
 *
 * ## `?q=` has two owners, and one of them is not this screen
 *
 * `useUrlTableState` writes the index table's free-text search as a **bare
 * `q`** whenever the table is mounted under the default view (`tableScope`
 * returns `''` with no `?view=`). `ReportLibrary` passes no `urlKey`, so typing
 * `nora` into the library's search box puts `?q=nora` in the address — which
 * this screen read as a composed report and answered with an empty builder.
 *
 * The guard below is the local half of the fix: a `?q=` that is not an empty
 * string and does not deserialise is **not a report query**, so the library
 * renders and its search keeps working. The real fix is a `urlKey` on
 * `ReportLibrary`'s table so the two parameters never share a name; that file
 * has another owner and it is named in the handoff rather than edited here.
 *
 * ## The no-data sentence comes from the metric boards' own key
 *
 * §3.7 requires it byte-identical everywhere, punctuation included. This screen
 * resolves `overview.noData` — the board's key, not a copy of its string — and
 * passes it down, so "identical everywhere" is true by construction rather than
 * by two dictionaries agreeing today (AC-844).
 */

import { Suspense, lazy, useCallback, useMemo } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAsync } from '@/hooks'
import { useNowIso } from '@/screens/queues'
import { useShell } from '@/shell/ShellContext'
/* `?view=` has exactly one writer in this product and it is not this file
   (`routeState.ts`). Importing it is what keeps "a view switch preserves every
   other parameter" one rule rather than eight screens agreeing today. */
import { withView } from '@/shell/routeState'
import {
  EYVAR_TODAY,
  REPORT_QUERY_PARAM,
  deserialiseReportQuery,
  getReport,
  localDayOf,
} from '@/data/clients'
import type { SavedReport, SubTabRoute } from '@/data/types'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { AnalystView } from '@/screens/analyst/AnalystView'
import { PagesView } from '@/screens/pages/PagesView'
import { ReportBuilder } from './ReportBuilder'
import { ReportLibrary } from './ReportLibrary'
import { REPORTS_VIEWS, normaliseReportsView, type ReportsView } from './views'
import { withFallback } from '../operations/localCopy'
import { REPORTS_EN } from './copy'
import { PAGES_EN } from '@/screens/pages/copy'
import { ANALYST_EN } from '@/screens/analyst/copy'

/**
 * `AlertsView` statically imports recharts for its per-rule sparkline, so a
 * static import here would pull recharts into every `/management/reports`
 * visit. Deferred the same way `routes.tsx`'s `Chunk` defers a whole screen
 * chunk: recharts loads only once an operator opens the Alerts view.
 */
const LazyAlertsView = lazy(() =>
  import('./AlertsView').then((m) => ({ default: m.AlertsView })),
)

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
    () => withFallback(shell.language.t, { ...REPORTS_EN, ...PAGES_EN, ...ANALYST_EN }),
    [shell.language.t],
  )
  const { dir, language } = shell.language
  const now = useNowIso()
  /* Passed down, never read from an ambient clock inside a control. */
  const today = now ? localDayOf(now) : EYVAR_TODAY
  const params = new URLSearchParams(location.search)
  /* D46/AC-1210 — `?view=dashboards` still resolves to `pages`. */
  const view: ReportsView = normaliseReportsView(params.get('view')) ?? 'reports'

  /**
   * The composed question, **only when it is one**.
   *
   * Two things write `?q=` on this address: `serialiseReportQuery` and — with
   * no `?view=` in the URL — `useUrlTableState`'s free-text search. An empty
   * value is `New report` (R8's second kind of empty). A value that
   * deserialises is a question. Anything else is somebody else's parameter and
   * this screen does not claim it. See the file header.
   */
  const encoded = params.get(REPORT_QUERY_PARAM)
  const composed =
    encoded === null || (encoded !== '' && deserialiseReportQuery(encoded) === null)
      ? null
      : encoded

  const title = row ? t(row.titleKey) : t('rb.page.title')
  /* One key, resolved once, passed down. See the file header. */
  const noDataSentence = t('overview.noData')

  const openReport = useCallback(
    (report: SavedReport) => navigate(`/management/reports/${report.id}`),
    [navigate],
  )
  /**
   * `New report` — an **empty** question, and nothing else disturbed.
   *
   * It used to write `?q=` as the whole search string, which dropped the view
   * and the library's own list query on the way into the builder. The empty
   * value is deliberate and is not a default leaking into the address: it is
   * the difference between *"the builder, on nothing"* and *"the library"*.
   */
  const newReport = useCallback(() => {
    const next = new URLSearchParams(location.search)
    next.set(REPORT_QUERY_PARAM, '')
    /* The builder is the Reports view's surface, so an explicit `?view=` from
       another tab would land the operator back on that tab holding a question
       they cannot see. */
    next.delete('view')
    navigate({ pathname: location.pathname, search: `?${next.toString()}` })
  }, [navigate, location.pathname, location.search])

  /**
   * **The tab switch, and the whole of TASK 1's defect.**
   *
   * `withView` amends: it sets or clears `view` and leaves every other
   * parameter byte-identical, so the composed `?q=`, the library's search text,
   * its sort, its filter chips and `?failSeries=` all survive a round trip
   * through Dashboards and back. `reports` clears the parameter rather than
   * writing `view=reports`, because absent *is* the default — and because
   * `tableScope` derives an index table's parameter namespace from `?view=`,
   * so writing the default would move the library's own query to a second set
   * of names and lose it exactly the way this fix exists to prevent.
   */
  const selectView = useCallback(
    (v: ReportsView) => {
      navigate({
        pathname: location.pathname,
        search: withView(location.search, v === 'reports' ? null : v),
      })
    },
    [navigate, location.pathname, location.search],
  )

  /* A composed question opens the builder. An empty `?q=` is `New report` —
     the builder on the unstarted question, which is R8's second kind of empty
     and not a first-run illustration.

     **`?view=` is checked first**, because the question is now RETAINED across
     a view switch rather than dropped by it (see the file header). Without this
     arm, `?q=…&view=dashboards` would answer the Dashboards tab with the
     builder — the tab strip would look broken and the fix above would be
     unusable. */
  if (composed !== null && view === 'reports') {
    return (
      <ReportBuilder
        report={null}
        noDataSentence={noDataSentence}
        title={title}
        t={t}
        language={language}
        onSaved={openReport}
      />
    )
  }

  if (view === 'pages') {
    return (
      <PagesView
        title={title}
        activeView={view}
        onSelectView={selectView}
        currentUserId={shell.session?.userId ?? ''}
        t={t}
        language={language}
        dir={dir}
      />
    )
  }

  /* D46 — the fourth view, WP-7.4. */
  if (view === 'analyst') {
    return (
      <AnalystView
        title={title}
        activeView={view}
        onSelectView={selectView}
        currentUserId={shell.session?.userId ?? ''}
        t={t}
        language={language}
        dir={dir}
      />
    )
  }

  if (view === 'alerts') {
    return (
      /* The same skeleton family a route-level chunk uses (`routes.tsx`'s
         `Chunk`), so the recharts fetch reads as one continuous loading shape
         rather than a blank pane — every screen needs a loading state (R3). */
      <Suspense fallback={<LoadingSkeleton pattern="P1" />}>
        <LazyAlertsView
          title={title}
          activeView={view}
          onSelectView={selectView}
          today={today}
          t={t}
          language={language}
          dir={dir}
        />
      </Suspense>
    )
  }

  return (
    <ReportLibrary
      title={title}
      activeView={view}
      onSelectView={selectView}
      onOpen={openReport}
      onNew={newReport}
      /* The SAME `today` `AlertsView` is given above. `Create alert` opens one
         dialog from two places; threading it here is what stops the two paths
         resolving a rule's test series against two different days the moment
         `DATA_SOURCE` stops being `mock`. */
      today={today}
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
  const { t, language } = shell.language

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
      onSaved={(saved) => navigate(`/management/reports/${saved.id}`)}
    />
  )
}

/* `DashboardDetailScreen` used to live here and return `null`. It is a real
   screen now — `DashboardDetailScreen.tsx` — and `routes.tsx` dispatches to it
   on `detail.kind === 'dashboard'`. The barrel keeps the export name. */
