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

import { useEffect, useMemo, useState } from 'react'
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

export function MetricBoardScreen({ row }: { row: SubTabRoute }) {
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

  const from = period?.start ?? null
  const to = period?.end ?? null

  const board = useAsync<MetricBoard>(
    (signal) =>
      getMetricBoard(row.subTabId, from && to ? { from, to } : undefined, signal),
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
  })

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
            t={t}
            language={language}
          >
            <BoardHeroRow>
              {data.metrics
                .filter((metric) => metric.rank === 'lead')
                .map((metric) => (
                  <BoardHeroItem key={metric.key}>
                    <MetricTile
                      metric={metric}
                      boardAsOf={data.asOf}
                      surface="band"
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
      {board.status === 'loading' ? (
        <div className="flex flex-col gap-12">
          {/* AC-35 — the figure-shaped skeleton, not a spinner. */}
          <LoadingSkeleton pattern="P5" label={t('overview.loading', { resource: title })} />
        </div>
      ) : board.status === 'error' ? (
        <div className="flex flex-col gap-12">
          {/* AC-24 — the SCREEN fails, the shell does not. `Try again` re-runs
              the same request; it is the one primary on a page showing nothing
              else. */}
          <ErrorState
            scope="page"
            heading={t('state.pageError.title', { resource: title })}
            message={t('state.pageError.body')}
            action={{ label: t('state.pageError.action'), onClick: board.refetch }}
          />
        </div>
      ) : board.status === 'empty' || !data ? (
        <div className="flex flex-col gap-12">
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
        <BoardContent board={data} t={t} language={language} navigate={navigate} />
      )}
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
  t,
  language,
  navigate,
}: {
  board: MetricBoard
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

  return (
    /* 48px between the band and the first chapter, and between chapters. It is
       four times the 12px the bordered grid used between tiles, and it has to
       be: with no card edges, SPACE is the only thing that says one chapter has
       ended and another has begun. The rule in each chapter heading closes the
       previous one; this is what opens the next. */
    <div className="flex flex-col gap-12">

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
                <MetricTile
                  metric={metric}
                  boardAsOf={loaded.asOf}
                  t={t}
                  language={language}
                />
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
      {(loaded.charts.length > 0 || loaded.breakdowns.length > 0) && (
        <section
          className={cn(
            /* 72px between panels, which is the reference's gutter and is what
               a chromeless panel needs: with no card edges, space is the only
               thing separating one plot's axis labels from the next panel's
               title. */
            'grid gap-x-18 gap-y-12 border-t border-border pt-12 compact:grid-cols-1',
            loaded.charts.length + loaded.breakdowns.length === 1
              ? 'grid-cols-1'
              : 'grid-cols-2',
          )}
        >
          {loaded.charts.map((chart) => {
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
                frame="plain"
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
              frame="plain"
              t={t}
              language={language}
            />
          ))}
        </section>
      )}
    </div>
  )
}

/**
 * **The window the board's numbers cover**, for the band's period pill.
 *
 * A board has no period of its own — `MetricBoard` carries an `asOf` and
 * nothing else — so it is read off the metrics, which each carry the window
 * they were computed over. The first metric that has one wins, and the metrics
 * arrive leads-first, so the pill states the window of the number the board is
 * most about.
 *
 * `null` when no metric has one, and that is the common case rather than an
 * edge: a point-in-time metric has `periodStart` and `periodEnd` both `null` by
 * design — *"active captains right now is not a period, and giving it one
 * invites a date-range control that would do nothing"* — so a board made
 * entirely of them shows no pill at all. Which is correct: it is not filtered
 * to a range, and a pill would say it was.
 *
 * **It does NOT check that the metrics agree.** They are computed by one
 * server pass over one window and `clients/metrics.ts` is where that would be
 * enforced; a screen that re-verified it would be asserting a data invariant
 * from the outside, in a place that could only respond by rendering nothing.
 */
function boardPeriod(metrics: readonly Metric[]): { start: IsoDate; end: IsoDate } | null {
  for (const metric of metrics) {
    if (metric.periodStart !== null && metric.periodEnd !== null) {
      return { start: metric.periodStart, end: metric.periodEnd }
    }
  }
  return null
}
