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

import { useNavigate } from 'react-router-dom'
import { useAsync } from '@/hooks'
import { getMetricBoard } from '@/data/clients'
import type { BoardNotice, MetricBoard, SubTabRoute } from '@/data/types'
import { formatDate, type Translate } from '@/lib'
import {
  BreakdownList,
  ChartCard,
  MetricTile,
  MetricTileItem,
  MetricTileRow,
} from '@/components/metrics'
import { Banner } from '@/components/Banner'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { useShell } from '@/shell/ShellContext'

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
  const { t, dir, language } = shell.language

  const board = useAsync<MetricBoard>((signal) => getMetricBoard(row.subTabId, signal), {
    deps: [row.subTabId],
    isEmpty: isBoardEmpty,
  })

  const title = t(row.titleKey)
  const data = board.status === 'content' ? board.data : null

  const header = (
    <PageHeader
      title={title}
      /* §8's metadata line — the board's computation instant, and `null` in
         every state but `content`, because a page that has not loaded cannot
         honestly claim a freshness. */
      meta={
        data
          ? t('overview.asOf', {
              time: formatDate(data.asOf, { style: 'day-month-time', language }),
            })
          : null
      }
      /* §8 slot 1 — no back arrow. A board is an index route (§2.2). */
      t={t}
      dir={dir}
    />
  )

  return (
    <SingleColumnPage header={header}>
      {board.status === 'loading' ? (
        /* AC-35 — the tile-shaped skeleton, not a spinner. */
        <LoadingSkeleton pattern="P5" label={t('overview.loading', { resource: title })} />
      ) : board.status === 'error' ? (
        /* AC-24 — the SCREEN fails, the shell does not. `Try again` re-runs the
           same request; it is the one primary on a page showing nothing else. */
        <ErrorState
          scope="page"
          heading={t('state.pageError.title', { resource: title })}
          message={t('state.pageError.body')}
          action={{ label: t('state.pageError.action'), onClick: board.refetch }}
        />
      ) : board.status === 'empty' || !data ? (
        /* R8 / AC-38 — whole page, zero records ever: the illustrated state,
           with a heading naming what the section is FOR rather than what is
           missing from it. */
        <EmptyState
          kind="first-run"
          heading={t('overview.empty.heading')}
          body={t('overview.empty.body')}
          actions={[
            { label: t('overview.empty.action'), onClick: () => navigate('/operations/trips') },
          ]}
        />
      ) : (
        <BoardContent board={data} />
      )}
    </SingleColumnPage>
  )

  function BoardContent({ board: loaded }: { board: MetricBoard }) {
    const notice = selectNotice(loaded.notices)

    return (
      <div className="flex flex-col gap-4">
        {/* R4-4 §4.3 — the page banner slot, **between the page header and the
            tile grid**, holding exactly one notice however many the board
            declared. §11.4 puts a banner first in the content block, spanning
            the full width, above every card, and that is this position.

            No dismiss: every one of these names a STANDING condition — an
            unacknowledged SOS, a statutory deadline already passed — and
            §11.4 reserves dismissal for a completed action. An operator must
            not be able to dismiss a breached statutory clock. */}
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
                      /* `Banner`'s action is a button, so the route is
                         followed with the router rather than by an anchor.
                         `Banner` is not this role's file and its shape is
                         §11.4's; raised in the handoff, because a destination
                         an operator cannot open in a new tab is a small loss
                         worth someone deciding on rather than absorbing. */
                      onClick: () => navigate(notice.action?.route ?? ''),
                    },
                  ]
                : [],
            }}
          />
        )}

        {loaded.metrics.length > 0 && (
          <MetricTileRow>
            {loaded.metrics.map((metric) => (
              <MetricTileItem key={metric.key}>
                <MetricTile
                  metric={metric}
                  boardAsOf={loaded.asOf}
                  t={t}
                  language={language}
                />
              </MetricTileItem>
            ))}
          </MetricTileRow>
        )}

        {/* **R4-4 §4.5 — ONE section grid, two columns, charts then
            breakdowns, each at half the content width.** R5-8.

            The order is `05-metrics-content.md`'s and is unchanged: tiles,
            then charts, then breakdowns, on all eight boards. A tile is a
            summary, a chart is its shape over time, and a list is which rows
            are responsible; reading them in the other order is reading the
            answer before the question. What changes is that charts and
            breakdowns are no longer two grids that each decide their own
            width — they are **one grid**, so a lone breakdown lands in a half
            beside a chart instead of taking the page.

            **The defect this closes (V-3).** Measured at 1440 on
            `management/zones`: `Riyadh` at x = 368 and its `6` at x = 1326 —
            **958px of white between a name and its number**. Five of the six
            boards that carry a breakdown carry exactly one, so five of six
            rendered that. The reference never gives a breakdown a row of its
            own: `Online store conversion rate` sits in the same three-across
            row as two charts, sharing their top and bottom edges, at ~200px
            label-to-value.

            **Halves, not thirds, and Eyvar's own content is the reason.**
            Content width at 1440 is ~990px; thirded that is ~320px, and an
            Eyvar row carries a label, a sub-label that now holds a phrase
            (R5-5) and a numeric column — at 13px an entity name truncates at
            ~320px, and V-4 proves truncation is destructive in Arabic. Half is
            ~490px, which is what `management/risk` already rendered and what
            measured at ~140px label-to-value. The product contained its own
            worked counter-example and it read correctly.

            **The trailing cell of an odd row is page ground.** Not filled, not
            stretched, not padded — no placeholder and no spanning last child.
            That is not V-6: a tile grid is a row of LIKE objects, so a gap in
            it reads as a missing sibling, and a section grid is a two-column
            layout, where a short last row is simply how one ends.

            **Arabic:** the grid mirrors and the first cell is at the
            inline-start. Nothing here depends on anything being on the left. */}
        {(loaded.charts.length > 0 || loaded.breakdowns.length > 0) && (
          <div className="grid grid-cols-2 gap-4">
            {loaded.charts.map((chart) => (
              <ChartCard
                key={chart.key}
                series={chart}
                /* §3.7's report icon. `TimeSeries` carries no route, so it
                   borrows the one from the metric with the same key — which is
                   the surface that owns the number, by definition. `null` when
                   the series has no tile beside it. */
                reportHref={
                  loaded.metrics.find((metric) => metric.key === chart.key)?.drilldownRoute ?? null
                }
                t={t}
                language={language}
              />
            ))}
            {loaded.breakdowns.map((breakdown) => (
              <BreakdownList
                key={breakdown.key}
                breakdown={breakdown}
                t={t}
                language={language}
              />
            ))}
          </div>
        )}
      </div>
    )
  }
}
