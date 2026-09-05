/**
 * **The screen behind all eight metric-tile sub-tabs** — `DESIGN.md` §3.7,
 * `specs/00-foundation.md` §3.4.
 *
 * | Sub-tab | Route | Contributing legacy pages |
 * |---|---|---|
 * | Management › Overview | `/management/overview` | `exec-overview` — the KPI strip, the financial position block, subscription growth (`:6901`–`:6935`) |
 * | Management › Performance | `/management/performance` | `exec-overview` (trends, cities health, rider engagement) + `growth` (retention cohorts, CSAT/NPS) |
 * | Management › Risk & Signals | `/management/risk` | `predictive` + `fraud`, merged by **M1** |
 * | Management › Growth | `/management/growth` | `growth` — promos, referrals, incentives, bulk messaging |
 * | Management › Market & Zones | `/management/zones` | `zones` + `exec-overview`'s expansion-ready list |
 * | Operations › Overview | `/operations/overview` | `dashboard` + `inbox`'s two ownership counters |
 * | Support › Overview | `/support/overview` | assembled from `support`, `contacts`, `safety`, `fairness` |
 * | Admin › Overview | `/admin/overview` | **new** — `auditLog`, `teamUsers`, `integrity`, `rotaGaps()`, `legalDocuments`, the erasure queue, `dataWindow` |
 *
 * **One component, not eight**, and that is the point rather than an economy.
 * Wave 4's bar is *"eight screens that are individually fine but do not read as
 * one family is a failure of this wave"*; one component makes that structural.
 * The board's contents come from `getMetricBoard(subTabId)` — which tiles and
 * which charts a workspace cares about is a data question, and it is answered
 * in the data layer where the numbers are. There is nothing in a per-screen
 * file for two overviews to drift apart on, because there is no per-screen file.
 *
 * `routes.tsx` mounts this for every id in **`METRIC_BOARD_SUB_TABS`**, so
 * adding a ninth board is a data change and not a code change — the same rule
 * §11.3 applies to permissions.
 *
 * ```
 *  Overview                                            <- 22px/600
 *  Computed 25 Jun 09:14                               <- §8 meta, data-derived
 *
 *  ┌──────────────────────────────────────────┐       <- AT MOST ONE notice
 *  └──────────────────────────────────────────┘          (R4-4 §4.3, R10, R5a)
 *
 *  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        <- 3 up, 4 above wide:
 *  └────────┘ └────────┘ └────────┘ └────────┘
 *
 *  ┌────────────────────┐ ┌────────────────────┐   <- ONE section grid, R4-4 §4.5:
 *  │ chart card          │ │ breakdown card      │      charts first, then breakdowns,
 *  └────────────────────┘ └────────────────────┘      each at HALF the content width
 *  ┌────────────────────┐
 *  │ breakdown card      │                            <- odd count: the trailing cell is
 *  └────────────────────┘                               page ground, never filled
 * ```
 *
 * Rules applied
 *   §3.7        metric tiles then chart cards, in that order. A tile is a
 *               summary of something a card explains; reading the explanation
 *               first is backwards.
 *   R4-4 §4.3   **a board declares conditions; this page renders at most one
 *               banner** — highest tone, then `severity`. **R5-3 deleted the
 *               declaration-order clause**; see `selectNotice`.
 *   R4-4 §4.5   **charts and breakdowns share ONE two-column grid**, charts
 *               first, each at half the content width (R5-8). The order is
 *               still `05-metrics-content.md`'s — tiles, charts, breakdowns.
 *   §7.1 / V5   ONE page width. `SingleColumnPage` has no `width` prop and the
 *               32px gutter is `--ev-page-pad`, so an operator moving between
 *               `/management/overview` and `/management/risk` finds the `<h1>`
 *               in the same place.
 *   §8 / V4     the `meta` line is **data-derived only**, and `MetricBoard.asOf`
 *               is exactly that. The route table's static `subtitleKey` is
 *               deliberately not rendered — see `SubTabScreen`'s note.
 *   §8 slot 4c  **no page-level action.** A board is a read surface: every
 *               action it could offer belongs on the screen that owns the
 *               record, and R3's one primary is better spent nowhere than on a
 *               button that has to invent a flow.
 *   `states.md` all four states, none a TODO. See `isBoardEmpty` for which kind
 *               of empty and why the choice is mechanical (AC-37 / AC-38).
 *   **AC-24**   the error is the SCREEN's; the rail, the sub-tab column and the
 *               top bar keep working and the operator can navigate away without
 *               a reload.
 *   **AC-35**   the loading state is `P5` — the metric-tile skeleton, shaped
 *               like the tiles it replaces. Never a centred spinner.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAsync } from '@/hooks'
import { getMetricBoard } from '@/data/clients'
import type { MetricPeriod } from './periods'
import type { BoardNotice, IsoDate, Metric, MetricBoard, SubTabRoute } from '@/data/types'
import type { Language, Translate } from '@/lib'
import { cn } from '@/lib/utils'
import {
  BoardHero,
  BoardHeroItem,
  BoardHeroRow,
  BreakdownList,
  Chapter,
  ChapterFigures,
  chaptersOf,
  chapterSummary,
  ChartCard,
  MetricTile,
  MetricTileItem,
} from '@/components/metrics'
import { Banner } from '@/components/Banner'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { SingleColumnPage } from '@/components/PageShell'
import { useShell } from '@/shell/ShellContext'
import { withFallback } from '../operations/localCopy'
import { OVERVIEW_EN } from './copy'

/**
 * **Which kind of empty, decided mechanically** (AC-37 / AC-38).
 *
 * `states.md`: the empty *kind* comes from whether a filter is active, not from
 * taste. A board has no filter — there is no query to relax and no `Clear
 * filters` to offer — so a board with nothing on it can only be `first-run`,
 * the illustrated whole-page state (R8). `no-match` is not representable here.
 *
 * A board is empty when it has **no computable number, no drawable chart and
 * no ranked row**. One `value: null` tile is not emptiness: a board carrying
 * four real counts beside two that cannot be computed is a content page with
 * honest holes in it, which reads differently and must not be replaced by an
 * illustration.
 *
 * **`breakdowns` was missing from this test and that was a defect**, not an
 * omission of degree: R4-4 §4.1 makes a ranked list a first-class thing a board
 * can hold, and `05-metrics-content.md` §11.3 calls one of them *"the most
 * valuable list in the product"*. A board whose only content is a ranked list
 * read as **empty** and was replaced, whole, by a first-run illustration —
 * which is R8's other kind of empty and the wrong one. A row is content.
 *
 * **A notice does not count and must not.** R4-4 §4.3's own test is that *"a
 * notice may only exist for a condition the board already shows a number
 * for"*, so a notice can never be the only thing on a board; if one ever were,
 * counting it here would paper over the ruling's violation rather than
 * surface it.
 *
 * Note the client 404s for a sub-tab with no board at all, so that case arrives
 * as an ERROR rather than as emptiness — deliberately, per `getMetricBoard`:
 * *"a table screen calling this is a bug, and a silently empty board would hide
 * it."*
 */
export function isBoardEmpty(board: MetricBoard): boolean {
  const hasNumber = board.metrics.some((metric) => metric.value !== null)
  /* **R5-11a §19.1 — a card awaiting a store does not count as content**, and
     the reasoning is R4-4 §4.3's about notices, one object over: a board whose
     every card is awaiting a store has nothing on it, and rendering the same
     sentence four times is worse than rendering R8's first kind once (AC-699).

     The two clauses below already say this by construction — §19.1's first
     invariant is that `awaitingStore !== null` implies the card is empty, so
     such a card has no points and no rows. It is written out anyway, because
     the invariant is asserted in the data layer and this file must not depend
     on a promise made in another tree. **Its converse is deliberately not
     asserted**: empty with `awaitingStore === null` is the legitimate *nothing
     to rank / nothing in this range* case, and collapsing the two is the defect
     the field exists to prevent.

     Neither Support nor Admin reaches the all-awaiting state — both keep
     computable tiles — but the rule has to be right before a board does. */
  const hasChart = board.charts.some(
    (chart) => chart.awaitingStore === null && chart.current.points.length > 0,
  )
  const hasRow = board.breakdowns.some(
    (breakdown) => breakdown.awaitingStore === null && breakdown.rows.length > 0,
  )
  return !hasNumber && !hasChart && !hasRow
}

/**
 * **A board declares conditions; the page renders at most one banner**
 * (R4-4 §4.3). This is that sentence as a function, and it lives on the screen
 * rather than in the client because *"the selection rule is a rendering rule"*
 * — `clients/metrics.ts` says so where it ships all of them.
 *
 * Why at most one, in the order the rules bite: **R10** forbids two page-level
 * banners on one page, and **R5a** permits exactly one page-level critical
 * banner. If `MetricBoard` rendered one and the shell rendered one the product
 * would have two, and the second is the one nobody reads.
 *
 * The order is the ruling's as amended: **highest tone, then highest
 * `severity`.** There is no third clause.
 *
 * **R5-3 deleted the declaration-order tie-break, and the reason is not
 * reachability.** *"A tie-break decided by the order somebody typed an array is
 * not a tie-break. It is a coin flip with a stable seed."* The clause made the
 * rule total by hiding a genuine ambiguity behind an implementation detail —
 * `Array.prototype.sort` happening to be stable in this runtime. Two conditions
 * equally severe and equally urgent is a real editorial problem on a board and
 * it must surface as a **fixture defect**, not be silently resolved by a line
 * number.
 *
 * The selection is total anyway, because **`severity` is unique among a board's
 * notices of the same tone** — and that is enforced by a test over the real
 * fixtures in `board.test.ts`, which is the opposite of a synthetic case: it
 * runs on real data, always, and never goes stale.
 *
 * The comparator is unchanged by the deletion. What changed is what may be
 * claimed about it: **nothing downstream may record the declaration-order
 * behaviour as a rule.** It is now an artefact of the sort, not a contract.
 *
 * **The suppressed conditions are not lost.** Each is independently visible in
 * the tile or the breakdown it came from — that is the ruling's own test for
 * whether a notice was allowed to exist at all.
 *
 * **What the seeded data does and does not prove, stated rather than assumed.**
 * `operations-overview` declares a `warning` at severity 70 **first** and a
 * `critical` at 95 second — ordered so that a declaration-order implementation
 * would render the wrong banner — so the **tone** comparison is exercised by
 * real data and has been watched choosing. No board declares two notices of one
 * tone, so the **`severity`** tie-break is exercised only by the synthetic cases
 * in `board.test.ts`, and they stay labelled as such.
 */
const NOTICE_TONE_RANK: Record<BoardNotice['tone'], number> = {
  critical: 0,
  warning: 1,
  info: 2,
  success: 3,
}

export function selectNotice(notices: readonly BoardNotice[]): BoardNotice | null {
  if (notices.length === 0) return null
  return (
    [...notices].sort(
      (a, b) => NOTICE_TONE_RANK[a.tone] - NOTICE_TONE_RANK[b.tone] || b.severity - a.severity,
    )[0] ?? null
  )
}

/**
 * A notice's sentence, chosen by its count.
 *
 * `BoardNotice.key` is a **key root**, and R4-4 requires *"two keys per count —
 * `.one` / `.many` — never a pluralisation built by concatenation"* (AC-713),
 * because Arabic has six plural categories and `createTranslator` deliberately
 * ships no plural API. So a notice carrying a numeric `count` resolves to
 * `${key}.one` or `${key}.many`; a notice carrying no count is a condition that
 * does not count anything and resolves to the root itself.
 */
function noticeTitle(notice: BoardNotice, t: Translate): string {
  const params = notice.params ?? undefined
  const count = params?.['count']
  if (typeof count !== 'number') return t(notice.key, params)
  return t(`${notice.key}.${count === 1 ? 'one' : 'many'}`, params)
}

/* T7.1 — `views` is what a sub-tab hangs on its board, directly under the band
   and above the board's own evidence; Growth is the one caller (O3: four
   `?view=` tables). Undefined on the other eight, which render as before. */
export function MetricBoardScreen({ row, views }: { row: SubTabRoute; views?: ReactNode }) {
  const shell = useShell()
  const navigate = useNavigate()
  /* AC-74 — the copy lives in `./copy.ts` and travels in this screen's
     own chunk. `withFallback` resolves a key the shell dictionary does
     not carry, so nothing here needs registering there. */
  const t = useMemo(
    /* **Memoised, and it is load-bearing.** `withFallback` returns a NEW
       function on every call, and several screens carry `t` in a `deps`
       array — so an unmemoised wrapper re-ran the fetch, which re-rendered,
       which rebuilt the wrapper. Two suites hung outright. */
    () => withFallback(shell.language.t, OVERVIEW_EN),
    [shell.language.t],
  )
  const { language } = shell.language

  /**
   * **The window the operator asked for, or `null` for the board's own.**
   *
   * `null` is the load state and it is not the same as the preset that happens
   * to match the seeded window: it means *I have not asked for a range*, so the
   * read sends none and the board answers with whatever period its metrics
   * declare. Pinning it to a resolved range on mount would freeze the board to
   * a window that stops being right the day the data moves.
   *
   * **Reset by sub-tab.** A range chosen on Overview has no claim on Risk &
   * Signals — the boards do not share a question — and carrying it across would
   * silently filter a board the operator has just arrived on.
   */
  const [period, setPeriod] = useState<MetricPeriod | null>(null)
  useEffect(() => setPeriod(null), [row.subTabId])

  /**
   * **§E4 — which lead figure the chart under the band is drawing.**
   *
   * `null` means *I have not chosen*, and the board falls through to its first
   * chartable lead. It is not seeded with that key on mount for the same reason
   * `period` is not seeded with the resolved window: pinning it would freeze the
   * board to a metric that stops being its first the day the data or the
   * `BOARD_LEADS` order moves.
   *
   * **Component state, and deliberately not `localStorage`.** Which of three
   * numbers an operator is looking at right now is a fact about this visit to
   * this board, not a preference — restoring it a week later would open the
   * board on a chart nobody asked for, with no affordance saying why. The
   * period control persists nothing either, for the same reason.
   *
   * Reset by sub-tab: a key chosen on Overview names a metric Risk & Signals
   * does not have, and the fallback below would silently re-pick anyway. The
   * reset makes that explicit rather than incidental.
   */
  const [featured, setFeatured] = useState<string | null>(null)
  useEffect(() => setFeatured(null), [row.subTabId])

  const from = period?.start ?? null
  const to = period?.end ?? null

  const board = useAsync<MetricBoard>(
    (signal) => getMetricBoard(row.subTabId, from && to ? { from, to } : undefined, signal),
    {
      /* `subTabId` picks the board; `from`/`to` are the window it is asked for.
       Each metrics sub-tab keys separately - switching between two and back
       paints the second board's own rows instead of a skeleton - and a new
       window re-reads rather than re-filtering what is already here, which is
       what the backend will do. Two primitives rather than the object, because
       a fresh `{from,to}` each render is a fresh dep every render. */
      deps: [row.subTabId, from, to],
      cacheKey: 'metrics.board',
      isEmpty: isBoardEmpty,
    },
  )

  /* T1.5 — a board an operator comes back to after an hour in another window
     is an hour stale, and `asOf` is the only thing that ever said so. A window
     focus re-reads; `refetch` bypasses the cache, so the read is real. */
  const { refetch } = board
  useEffect(() => {
    window.addEventListener('focus', refetch)
    return () => window.removeEventListener('focus', refetch)
  }, [refetch])

  const title = t(row.titleKey)
  const data = board.status === 'content' ? board.data : null
  /* **The lede is keyed by sub-tab and resolved here rather than in the band**,
     so a board with no lede in the dictionary renders the band without one
     instead of printing a missing key across it. The membership test on
     `OVERVIEW_EN` is what distinguishes "not written yet" from "written as the
     empty string"; `t` then resolves it through the shell dictionary as
     normal, so Arabic is not bypassed by the check. */
  const ledeKey = `overview.lede.${row.subTabId}`
  const lede = ledeKey in OVERVIEW_EN ? t(ledeKey) : null

  /* **NO `PageHeader`.** The board's `<h1>`, its freshness line and §8's slot
     order all moved onto `BoardHero` — the same content in the same sequence,
     in a different box. There is still exactly one `h1` on the page and it
     still names the board, which is the contract §8 was protecting.

     The band renders in EVERY state, not only `content`. A board that is
     loading, that failed, or that has never had a number is still the same
     board, and stripping its identity down to a bare skeleton is what made
     those three states read as three different screens. What it does NOT carry
     in them is an `asOf` or a period — a page that has not loaded cannot
     honestly claim a freshness — so both are `null` and the band closes up
     around them. */
  const bandOnly = (
    <BoardHero title={title} lede={lede} asOf={null} period={null} t={t} language={language} />
  )

  /**
   * **§E4 — which lead figures are a CHOICE, and which are just figures.**
   *
   * A lead is selectable exactly when the board charts a series under the same
   * key, because that is the whole of what selecting does: it decides which
   * chart is drawn beneath the band. A lead with no such chart **renders exactly
   * as it does today** — a plain figure, not a radio — and no series is
   * fabricated for it. There is no honest thing to draw and drawing a
   * plausible-looking one would be the worst available answer.
   *
   * The lookup is `charts.find(c => c.key === metric.key)`, which is the join
   * this file already makes further down to give each card its headline and its
   * report link. One join, one meaning: **the metric with a chart's key is the
   * figure that owns that number.**
   */
  const leads = data ? data.metrics.filter((metric) => metric.rank === 'lead') : []
  const chartedKeys = new Set(data ? data.charts.map((chart) => chart.key) : [])
  const selectableLeads = leads.filter((metric) => chartedKeys.has(metric.key))
  /* The operator's choice while it still names a chart this board has; the
     board's own first chartable lead otherwise. `null` on a board where no lead
     is charted — the row is then a plain list and nothing is hoisted. */
  const featuredKey =
    featured !== null && chartedKeys.has(featured) ? featured : (selectableLeads[0]?.key ?? null)

  /**
   * **A choice needs two options, and a board with one chartable lead has
   * none.**
   *
   * A radiogroup of one radio, always checked, cannot be operated: every key
   * that would move it moves it back to itself. That is the *"affordance that
   * works and does nothing"* the band's own period pill refuses to be, and it
   * would be worse here because it is announced — a reader would be told
   * *"radio button, checked, 1 of 1"* about a control with no second state.
   *
   * So the row becomes a radiogroup at **two**. Below that the chart is still
   * hoisted under the band — it is the board's headline evidence either way,
   * and the reference puts it there for that reason and not because it is
   * selectable — and the figures render exactly as they always have.
   *
   * **Three boards clear it and the fixtures are what decide which**, so the
   * count is asserted over the real boards rather than described here:
   * `board.test.ts` pins `management-performance`, `support-overview` and
   * `support-fairness` at two charted leads each, `management-overview` at
   * exactly one — the case where the chart is hoisted with no control — and the
   * remaining five at none. `support-fairness` renders on its own screen
   * (`FairnessScreen`), which carries the same mechanism for the same reason.
   *
   * This paragraph used to say no board cleared the bar and the mechanism was
   * inert. It was written before the §E4 series were seeded and was false from
   * the commit that seeded them, with the test that disproves it landing in the
   * same change.
   */
  const leadChoice = selectableLeads.length >= 2

  /**
   * T5.7 — the window of the chart the band sits over, when the band sits over
   * one. The hoisted chart if a lead is charted; otherwise a board's SOLE
   * chart, which is Risk & Signals: point-in-time leads, so the pill reads
   * *All time*, above one plot covering seven days and saying so nowhere.
   * `null` where a board draws several, because there is no one window to name.
   */
  const featuredChart = data?.charts.find((chart) => chart.key === featuredKey) ?? null
  const scopedChart = featuredChart ?? (data?.charts.length === 1 ? data.charts[0] : null)
  const chartPeriod = scopedChart
    ? { start: scopedChart.current.periodStart, end: scopedChart.current.periodEnd }
    : null

  return (
    /* `flow` rather than the default `fill`. The board is now a long page —
       a band, then chapters, then a chart row — and `fill` claims the content
       region's height for the body, which is the right shape for a screen whose
       body IS a bounded table and the wrong one for a page that scrolls. */
    <SingleColumnPage
      body="flow"
      /* **The band is the page's bleed and is rendered in every state**, so a
         board that is loading, that failed and that has content are three
         states of one screen rather than three screens. What varies is what
         goes UNDER it. */
      bleed={
        data ? (
          <BoardHero
            title={title}
            lede={lede}
            asOf={data.asOf}
            period={period ?? boardPeriod(data.metrics)}
            onPeriod={setPeriod}
            chartPeriod={chartPeriod}
            onRefresh={board.refetch}
            refreshing={board.isRefreshing}
            t={t}
            language={language}
          >
            {/* §E4 — a row of figures that DRIVES the chart below it. The row
                is a radiogroup only when at least one of its figures charts
                something; on a board where none does it stays the plain list it
                was, because a group of one non-choice is not a control. */}
            <BoardHeroRow groupLabel={leadChoice ? t('overview.hero.group') : null}>
              {leads.map((metric) => (
                <BoardHeroItem key={metric.key} inGroup={leadChoice}>
                  <MetricTile
                    metric={metric}
                    boardAsOf={data.asOf}
                    surface="band"
                    selection={
                      leadChoice && chartedKeys.has(metric.key)
                        ? {
                            selected: metric.key === featuredKey,
                            onSelect: () => setFeatured(metric.key),
                            /* Roving: the checked radio is the group's one tab
                               stop, so `Tab` enters the row at the figure whose
                               chart is on screen rather than always at the
                               first. */
                            tabIndex: metric.key === featuredKey ? 0 : -1,
                          }
                        : undefined
                    }
                    t={t}
                    language={language}
                  />
                </BoardHeroItem>
              ))}
            </BoardHeroRow>
          </BoardHero>
        ) : (
          bandOnly
        )
      }
    >
      {/* The sub-tab's own views, then the board's four states. `views` is
          outside the switch because its read is its own: a board that failed
          must not blank a table that arrived (AC-24, one level down). It leads
          because a control the operator must scroll two viewports to reach is
          a control they do not have (measured at y = 1663 when it trailed). */}
      <>
      {views}
      {board.status === 'loading' ? (
        <div className="flex flex-col gap-8">
          {/* AC-35 — the figure-shaped skeleton, not a spinner. */}
          <LoadingSkeleton pattern="P5" label={t('overview.loading', { resource: title })} />
        </div>
      ) : board.status === 'error' ? (
        <div className="flex flex-col gap-8">
          {/* AC-24 — the SCREEN fails, the shell does not. `Try again` re-runs
              the same request; it is the one primary on a page showing nothing
              else. */}
          <ErrorState
            scope="page"
            heading={t('state.pageError.title', { resource: title })}
            message={t('state.pageError.body')}
            action={{
              label: t('state.pageError.action'),
              onClick: board.refetch,
            }}
          />
        </div>
      ) : board.status === 'empty' || !data ? (
        <div className="flex flex-col gap-8">
          {/* R8 / AC-38 — whole page, zero records ever: the illustrated state,
              with a heading naming what the section is FOR rather than what is
              missing from it. */}
          <EmptyState
            kind="first-run"
            heading={t('overview.empty.heading')}
            body={t('overview.empty.body')}
            actions={[
              {
                label: t('overview.empty.action'),
                onClick: () => navigate('/operations/quick-rides'),
              },
            ]}
          />
        </div>
      ) : (
        <BoardContent
          board={data}
          featuredKey={featuredKey}
          t={t}
          language={language}
          navigate={navigate}
        />
      )}
      </>
    </SingleColumnPage>
  )
}

/**
 * **Declared at module scope, and that is a bug fix rather than tidiness.**
 *
 * This lived inside `MetricBoardScreen`'s render body, so every parent render
 * produced a NEW function identity and React unmounted and remounted the whole
 * subtree. The visible consequence: the critical banner's button never fired.
 * `mousedown` and `mouseup` both dispatched, the node was `isConnected === false`
 * by `mouseup`, and `click` -- which the browser only synthesises when both land
 * on the SAME element -- never happened. Six reproductions out of six, on the
 * landing screen of three of the five roles. The tiles kept working because they
 * are anchors, which navigate on `mousedown`.
 *
 * Everything it used to close over is now a prop. Nothing else changed.
 */
function BoardContent({
  board: loaded,
  featuredKey,
  t,
  language,
  navigate,
}: {
  board: MetricBoard
  /**
   * §E4 — the `Metric.key` of the lead figure the band has checked, and so the
   * `TimeSeries.key` of the chart hoisted directly under it. `null` on a board
   * where no lead is charted; nothing is hoisted then and the detail row is
   * exactly what it was.
   */
  featuredKey: string | null
  t: Translate
  language: Language
  navigate: (to: string) => void
}) {
  const notice = selectNotice(loaded.notices)
  /* **Partitioned rather than sorted, and the difference matters.** A sort by
     rank would put the leads first and leave them in one list — so the two
     ranks would share a grid, and the band could not exist at all. Two arrays
     is what lets them be two surfaces, and the leads' half is filtered by
     `MetricBoardScreen` where the band is rendered.

     Order is the CLIENT's: `getMetricBoard` sorts the leads into
     `BOARD_LEADS`' declared sequence before this screen sees them, so the
     board's first number is its first number. `filter` preserves whatever
     arrives, which is why the sort has to happen there and not here — a screen
     that re-derived it would be a second copy of the ranking. */
  const supporting = loaded.metrics.filter((metric) => metric.rank !== 'lead')
  const chapters = chaptersOf(supporting)

  /**
   * **§E4 — the one chart the band is driving, lifted out of the detail row.**
   *
   * It is REMOVED from the row below rather than repeated in it. A board that
   * drew the same series twice would leave an operator checking whether the two
   * plots agreed, and they always would, which is the worst kind of question to
   * make somebody answer.
   *
   * `find` by identity on the key, so a board whose `featuredKey` names nothing
   * it charts hoists nothing and loses nothing — the same total set of panels
   * renders either way.
   */
  const featured = loaded.charts.find((chart) => chart.key === featuredKey) ?? null
  const detailCharts = loaded.charts.filter((chart) => chart !== featured)
  const featuredOwner =
    featured === null
      ? null
      : (loaded.metrics.find((metric) => metric.key === featured.key) ?? null)

  return (
    /* **32px between the band and the first chapter, and between chapters —
       down from 48 (§E7 density).** With no card edges, SPACE is the only thing
       that says one chapter has ended and another has begun, so it cannot go to
       the gutter's 24; but 48 was set when a chapter's own internal pitch was 36
       and its heading sat 24 above its figures, and both of those came down
       with it. What matters is the RATIO — 32 between chapters against 28 within
       one and 16 under a heading — and it is preserved. The rule in each chapter
       heading closes the previous one; this is what opens the next. */
    <div className="flex flex-col gap-8">
      {/* R4-4 §4.3 — the page banner slot, holding exactly one notice however
          many the board declared. §11.4 puts a banner first in the content
          block, above every card; **the band is this page's header, so first in
          the content block is directly beneath it** and that is here.

          No dismiss: every one of these names a STANDING condition — an
          unacknowledged SOS, a statutory deadline already passed — and §11.4
          reserves dismissal for a completed action. An operator must not be
          able to dismiss a breached statutory clock. */}
      {notice && (
        <Banner
          banner={{
            id: notice.key,
            tone: notice.tone,
            title: noticeTitle(notice, t),
            actions: notice.action
              ? [
                  {
                    label: t(notice.action.labelKey),
                    /* `Banner`'s action is a button, so the route is followed
                       with the router rather than by an anchor. `Banner` is not
                       this role's file and its shape is §11.4's; raised in the
                       handoff, because a destination an operator cannot open in
                       a new tab is a small loss worth someone deciding on
                       rather than absorbing. */
                    onClick: () => navigate(notice.action?.route ?? ''),
                  },
                ]
              : [],
          }}
        />
      )}

      {/* **§E4 — THE CHART THE BAND IS DRIVING, directly under the band.**
          This is the reference's best single idea and the one part of it this
          product had every piece of and connected none: a row of lead figures,
          a set of charts keyed by the same `Metric.key`, and a `find` over both
          already written thirty lines below to give each card its headline.
          Selecting a figure above redraws THIS card and nothing else moves.

          **It sits after the banner rather than before it**, which is the one
          place *"directly under the band"* is qualified: §11.4 puts a page
          banner first in the content block, above every card, and a breached
          statutory clock does not queue behind a chart. On the six boards with
          no notice — which is most renders — the card is the first thing under
          the band with nothing between.

          Full width, and carded. It is the board's headline evidence, and the
          reference gives its hero card the whole column. */}
      {featured && (
        <ChartCard
          key={featured.key}
          series={featured}
          headline={featuredOwner}
          reportHref={featuredOwner?.drilldownRoute ?? null}
          t={t}
          language={language}
        />
      )}

      {/* **The supporting figures, in chapters.** Nine equal cells in one grid
          said nothing about what any of them had to do with each other;
          `Metric.category` already knew, and this is that field rendered. The
          chapters and their order are the client's — see `chaptersOf`.

          Guarded, and not because the fixtures reach the empty case: a board
          whose every metric is a lead renders the band and nothing under it,
          and a `<ul>` with no children inside a heading with a rule would print
          a chapter about nothing. */}
      {chapters.map((chapter) => (
        <Chapter
          key={chapter.category}
          category={chapter.category}
          summary={chapterSummary(chapter.metrics, t, language)}
          t={t}
        >
          <ChapterFigures>
            {chapter.metrics.map((metric) => (
              <MetricTileItem key={metric.key}>
                <MetricTile metric={metric} boardAsOf={loaded.asOf} t={t} language={language} />
              </MetricTileItem>
            ))}
          </ChapterFigures>
        </Chapter>
      ))}

      {/* **ONE section grid, two columns, charts then breakdowns, each at half
          the content width** — R4-4 §4.5, R5-8.

          The order is `05-metrics-content.md`'s and is unchanged: figures, then
          charts, then breakdowns, on all nine boards. A figure is a summary, a
          chart is its shape over time, and a list is which rows are
          responsible; reading them in the other order is reading the answer
          before the question.

          **The defect this closes (V-3).** Measured at 1440 on
          `management/zones`: `Riyadh` at x = 368 and its `6` at x = 1326 —
          **958px of white between a name and its number**. Five of the six
          boards that carry a breakdown carry exactly one, so five of six
          rendered that. Halves, not thirds, and Eyvar's own content is the
          reason: an Eyvar row carries a label, a sub-label holding a phrase
          (R5-5) and a numeric column, and at 13px an entity name truncates at
          ~320px — which V-4 proves is destructive in Arabic.

          **The trailing cell of an odd row is page ground.** Not filled, not
          stretched, not padded. A short last row is simply how a two-column
          layout ends.

          **It takes the same heading a chapter takes**, from the same component,
          so the board has one heading anatomy and not two. The word is generic
          because it has to be: the reference writes a per-screen title here
          (*"Revenue by line"*, *"Punctuality and cancellations"*) and that is a
          sentence about a chart set which varies by board and goes stale when
          one is added. What is true of this section on every board is what it
          IS — the evidence under the figures — and each panel states its own
          subject in its own title directly beneath. */}
      {/* **Charts and ranked lists are TWO sections, not one grid.**
          They shared a grid, and the arithmetic that split it counted panels
          rather than kinds: Risk & Signals has one chart and two lists, which
          made a three-across row and gave the chart a third of the width — a
          plot narrower than the list beside it, on the board where the plot is
          the only shape over time. The reference sets them as two rows with a
          rule between, and each row is columned by ITS OWN count.

          The order is `05-metrics-content.md`'s and is unchanged: figures, then
          charts, then lists. A figure is a summary, a chart is its shape over
          time, and a list is which rows are responsible; reading them in the
          other order is reading the answer before the question.

          **A lone panel takes the width**, which is the reference's rule and
          not a fallback: one chart across the measure is a plot you can read a
          day off, and one list across the measure is what Performance draws.
          V-3's finding — 958px between a name and its number — was about a
          BREAKDOWN alone in a half, and it is answered by the row gap and the
          numeric column, both of which this keeps. */}
      {/* **The detail is ONE row of panels, not two sections with a heading
          between them.**

          It was a `Behind the numbers` heading over a grid of charts, then a
          second grid of lists. On a board with one chart and one list — which
          is Operations Overview, and five of the nine — that drew each of them
          across the full measure, one under the other, with 958px between a
          queue's name and its number. The reference sets the pair SIDE BY SIDE
          under a single rule, which is also what makes the plot and the ranking
          readable as two views of the same week rather than as two sections.

          The heading is gone with them. `Behind the numbers` named a section
          that no longer exists: the rule above already says the figures have
          ended, and a heading that adds nothing but a line of type is a line of
          type. §8's slots are unaffected — this was never one of them.

          Charts come before lists and that order is `05-metrics-content.md`'s,
          unchanged: a figure is a summary, a chart is its shape over time, and
          a list is which rows are responsible. **A lone panel takes the
          width**; two or more flow two-up. */}
      {(detailCharts.length > 0 || loaded.breakdowns.length > 0) && (
        <section
          className={cn(
            /* **20px between panels and 20px between rows — §3.7's stated grid,
               and the panels took their card frames back to earn it.**

               It was 72/48 and had to be: the panels were chromeless, so space
               was the only thing separating one plot's axis labels from the
               next panel's title. §3.7 measures the reference's own analytics
               grid at a **~19–20px gutter**, and the reference can spend 20
               because every tile on it is a bordered card — the border does the
               separating that 72px of air was doing here. Taking the frame back
               (below) is what buys the density, and the two changes are one
               change.

               `@container` — see `panelColumns` for why this row is the one
               place in the product that earns one. */
            '@container border-t border-border pt-8',
          )}
        >
          {/* **The grid is a CHILD of the container and cannot be the
              container itself.** `container-type: inline-size` establishes a
              query context for an element's DESCENDANTS, so a grid carrying
              both its own `@container` and its own `@xl:` column count queries
              the next container up — which on this page is nothing, so every
              conditional column silently resolves to one. Measured before it
              was noticed: one column at all six widths, on all three boards,
              with the classes present in the markup and correct. */}
          <div
            className={cn(
              'grid gap-5',
              panelColumns(detailCharts.length + loaded.breakdowns.length),
            )}
          >
            {detailCharts.map((chart) => {
              /* ONE lookup, feeding both the headline and the report link. The
               metric with the same key is the surface that owns the number, by
               definition; `null` when the board charts something it does not
               also tile, which is legal — `TimeSeries.windowTotal` is how those
               eight state their own. */
              const owner = loaded.metrics.find((metric) => metric.key === chart.key) ?? null
              return (
                <ChartCard
                  key={chart.key}
                  series={chart}
                  headline={owner}
                  reportHref={owner?.drilldownRoute ?? null}
                  t={t}
                  language={language}
                />
              )
            })}

            {loaded.breakdowns.map((breakdown) => (
              <BreakdownList
                key={breakdown.key}
                breakdown={breakdown}
                /* **What the export attributes the file to.** A `MetricBreakdown`
                 is a ranking and carries no board, no sub-tab and no dates, so
                 the surface that renders it hands them over — and a list with
                 no scope offers no export, rather than writing a CSV that
                 cannot say what it is a slice of (`components/table/csv.ts`).

                 The window is the board's own, read off the metrics exactly as
                 the band's period pill reads it, so the pill and the file name
                 the same range. */
                scope={{
                  subTabId: loaded.subTabId,
                  period: boardPeriod(loaded.metrics),
                }}
                t={t}
                language={language}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

/**
 * **How many columns a row of `n` panels takes, and every answer is measured
 * against R4-1's 268px floor.**
 *
 * §3.7's grid is three columns. R4-1's floor is 268px per panel. Reconciling
 * them takes a container query, and this row is the one place in the product
 * that earns one — `ui/field.tsx` declines a container query for the opposite
 * and correct reason, that *"the pane is always the content region's width"*.
 * This row is not: what is left for it is the viewport less the 80px rail, less
 * the sub-tab column, less two page paddings, capped at the measure. A
 * VIEWPORT breakpoint cannot see any of that, and the console has only two of
 * them (768 and 1344) in any case.
 *
 * **The first attempt used them anyway, and the measurement is why it did not
 * survive.** `grid-cols-2` below `wide` reads as two comfortable halves and is
 * two 206px panels at an 800px viewport — under the floor, and 62px under it
 * rather than marginally. The arithmetic that predicted 318 there was wrong
 * about the content width by the whole sub-tab column, which is exactly the
 * quantity a container query does not have to guess at. `scratch/board-
 * density.mjs` is the check; it walks six widths on the three busiest boards
 * and fails on any panel under 268.
 *
 * Measured, after (`@container` widths in brackets):
 *
 * | viewport | 3 panels | 2 panels |
 * |---|---|---|
 * | 800 | 1 x **432** | 1 x **432** |
 * | 1024 | 2 x **318** | 2 x **318** |
 * | 1280 | 3 x **291** | 2 x **446** |
 * | 1344 | 3 x **301** | 2 x **462** |
 * | 1440 | 3 x **333** | 2 x **510** |
 * | 1920 | 3 x **435** | 2 x **662** |
 *
 * The two thresholds are the nearest container sizes ABOVE the arithmetic:
 * two columns need 2 × 268 + 20 = 556 and take `@xl` (576); three need
 * 3 × 268 + 40 = 844 and take `@4xl` (896). Rounding upward is what makes the
 * floor a guarantee rather than a near miss.
 *
 * A single panel takes the width at every size — the reference's rule and not a
 * fallback: one chart across the measure is a plot you can read a day off.
 *
 * **Static class strings, always.** A computed column count is a class
 * Tailwind's scanner never sees and therefore never emits, and the failure mode
 * is a one-column grid on a production build that every dev server renders
 * correctly.
 */
function panelColumns(panels: number): string {
  if (panels <= 1) return 'grid-cols-1'
  if (panels === 2) return 'grid-cols-1 @xl:grid-cols-2'
  return 'grid-cols-1 @xl:grid-cols-2 @4xl:grid-cols-3'
}

/**
 * **The window the board's LEAD figures cover**, for the band's period pill.
 *
 * A board has no period of its own — `MetricBoard` carries an `asOf` and
 * nothing else — so it is read off the metrics, which each carry the window
 * they were computed over. The first that has one wins.
 *
 * ## Why it stops at the leads, and the two boards that proved it has to
 *
 * It used to walk every metric on the board. The metrics arrive leads-first, so
 * on a board whose headline figures declare a window the answer is unchanged —
 * `management-overview` and `management-performance` both resolve to 11–25 Jun
 * either way, which is also the window their hoisted chart plots.
 *
 * On a board whose leads are **point-in-time** the loop walked straight past
 * them into the supporting figures and elevated one of those to *the board's*
 * window. Measured on the shipped fixtures:
 *
 * | board | leads | what the old loop found | what the board charts |
 * |---|---|---|---|
 * | `support-overview` | three, all point-in-time | `contactsPerThousandTrips`, **19–25 Jun** — one tile of eight | two of its three series run **11–25 Jun** |
 * | `management-risk` | three, all point-in-time | `repeatIncidentCaptains`, **25 May–25 Jun** — one tile of eight | its only series runs **19–25 Jun** |
 *
 * On `support-overview` that pill sits in the band ~100px above the §E4 chart
 * hoisted beneath it, both drawn as bare `{from} – {to}` runs, neither labelled
 * as belonging to a different thing — so a reader who takes the pill as the
 * board's window reads a fifteen-day plot as seven days. **The chart is right
 * about itself; the pill was wrong about the board**, and it was wrong the same
 * way on `management-risk`, where no chart is hoisted and nobody had noticed.
 *
 * A lead has no window, so there is none to state, and the pill falls to
 * `overview.period.none` — *All time* — which is exactly true: nothing has been
 * filtered, and the picker would say the same if it were opened. The alternative
 * considered and rejected was deriving the pill from the hoisted chart, which
 * would make the band lie about the tiles instead.
 *
 * `null` is therefore the common case rather than an edge: a point-in-time
 * metric has `periodStart` and `periodEnd` both `null` by design — *"active
 * captains right now is not a period, and giving it one invites a date-range
 * control that would do nothing"*.
 *
 * **One derivation, two readers.** The band's pill and the breakdown export's
 * `scope.period` both call this, so the range on screen and the range in the
 * CSV cannot disagree. A board that states no window writes none, which
 * `BreakdownScope.period` already declares as a real answer rather than a gap.
 *
 * **It does NOT check that the leads agree with each other.** They are computed
 * by one server pass over one window and `clients/metrics.ts` is where that
 * would be enforced; a screen that re-verified it would be asserting a data
 * invariant from the outside, in a place that could only respond by rendering
 * nothing.
 */
function boardPeriod(metrics: readonly Metric[]): { start: IsoDate; end: IsoDate } | null {
  for (const metric of metrics) {
    if (metric.rank !== 'lead') continue
    if (metric.periodStart !== null && metric.periodEnd !== null) {
      return { start: metric.periodStart, end: metric.periodEnd }
    }
  }
  return null
}
