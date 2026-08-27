/**
 * Metric tiles and chart cards — the eight table-less sub-tabs:
 * Management × 5 (Overview, Performance, Risk & Signals, Growth, Market &
 * Zones) plus the Operations, Support and Admin overviews.
 *
 * Governed by `DESIGN.md` §3.7.
 *
 * ## The three fields the legacy app does not have, and needs
 *
 * **`asOf`.** No KPI anywhere in `eyvar_ops_panel_v40_fixed.html` records when
 * it was computed — every tile is `Object.keys(DB.x).filter(...).length`
 * evaluated during the render (`renderExecOverview`, `:6901`). An overview that
 * cannot say when it was computed is one an operator cannot trust, and the
 * first question on any escalation is *"is this number from before or after the
 * incident?"*. Required on every metric and every series.
 *
 * **An explicit comparison.** §3.7 requires a delta and requires an em-dash
 * when no comparison is possible — *never `0%` and never blank*. A screen that
 * subtracts two numbers cannot tell "no change" from "no comparison". So
 * `comparison` is a tagged union with a `none` arm carrying a **reason**, and
 * `deltaPercent` is `null` exactly when that arm is taken.
 *
 * The legacy app is candid about why so many of these are `none`: it holds one
 * point in time and says so — *"The Data Export → Daily Snapshots tool builds a
 * real historical trend the longer it's used… this section will show true
 * month-over-month growth instead of a single-point read"* (`:6979`).
 * `reason: 'no-history'` is that sentence, as data.
 *
 * **`higherIsBetter`.** A delta's colour is not a property of the arrow. Churn
 * up is bad; renewal up is good; a cancellation-fee total going up is neither.
 * No screen can derive this and every screen needs it, so it is on the metric.
 *
 * ## Two series maximum, by construction
 *
 * §3.7: *"the comparison series MUST be dotted/dashed and MUST use the same hue
 * as the primary series, never a second colour"*, and `globals.css:919` records
 * that there is therefore **no categorical chart palette and no `--chart-3`**.
 *
 * `TimeSeries` has two named fields — `current` and `comparison` — not a
 * `series: Series[]`. A screen literally cannot ask for a third, because there
 * is no third to ask for. That is the cheapest possible enforcement of the
 * rule and it costs nothing: no chart in the product wants one.
 *
 * ## Three fields added by ruling R4-4 (`design/07-rulings-r4.md` §4)
 *
 * **`MetricBoard.breakdowns`** — a ranked list. Six of the eight boards specify
 * one and the contract had no shape for it (spec **F-1**). The shape is not
 * invented here: `DESIGN.md` §3.7 describes it `[observed]` twice, and R4-4
 * §4.1 fuses the two variants into one anatomy. There is **no `BreakdownList`
 * component** — the brief that commissioned this work said one shipped in wave
 * 4 and it did not; `src/components/metrics/` holds `ChartCard`, `MetricTile`,
 * `MetricTileRow`, `TrendChart` and `formatMetric`, and R4-4 §4 says the same.
 * The contract lands first; the component is frontend-engineer's.
 *
 * **`MetricBoard.notices`** — a board *declares conditions*; the page renders
 * **at most one** banner (R10 forbids two page-level banners). So this is a
 * declaration list, not a banner, and the name says so. The selection rule
 * lives on the screen: highest tone, then highest `severity`, then declaration
 * order. `03-financials.md` **AC-351** needs the same shape from a different
 * direction, which is why it is modelled for both.
 *
 * **`Metric.caption`** — a scope limit or a denominator, under a hard scope so
 * it does not become a slop field (R4-4 §4.2). Three tiles cannot ship without
 * one: AC-641, AC-674, AC-675.
 *
 * **F-12 is closed by `breakdowns`, not by a new grain.** *"Zone demand by
 * hour"* is a **profile** — 24 buckets that repeat — not a trend, so it is a
 * breakdown on an `hour-of-day` dimension. `SeriesPoint.at` stays an `IsoDate`
 * and there is no hourly grain in this contract; the genuine hourly *trend*
 * belongs to the report builder, where grain is a control (R4-4 §4.4).
 */

import type { CurrencyCode, IsoDate, IsoDateTime } from './common'

/**
 * What the number is, so `formatMoney` / `formatPercent` are chosen from data
 * rather than guessed from the key's name.
 *
 * `money` is **always halalas** (`Halalas`), never a float and never a
 * pre-formatted string — same rule as everywhere else in this layer.
 *
 * **`ratio` renders as `{value}×`** with the multiplication sign U+00D7, and
 * **the operands belong in the label, never in the value** (R4-12, closing
 * W4-F7). So the tile reads `7.0×` over the label `Worst demand-to-supply
 * ratio`. Legacy writes `2.4× demand/supply` into the value itself (`:6953`)
 * and that value cannot be right-aligned against another number (R4) and
 * cannot be translated (AC-713). The `×` is the UI's to add — `formatRatio`
 * in `src/lib/format/number.ts`, W4-F5's fifth call site — and this layer
 * sends the bare number, as it does for every other unit.
 */
export type MetricUnit = 'count' | 'money' | 'percent' | 'ratio' | 'minutes' | 'rating'

/**
 * Why a metric has no comparison. Three genuinely different situations, and
 * they read differently to an operator:
 *
 *   `no-history`         the period exists but we have no data from it — the
 *                        legacy app's whole position (`:6979`). "First month."
 *   `no-target`          a target-comparison metric nobody has set a target
 *                        for. Q-open, not a data gap.
 *   `insufficient-data`  the comparison period exists and has data, but too
 *                        little for the delta to mean anything (a renewal rate
 *                        over 3 subscriptions). Suppressing it is the honest
 *                        move; §3.7's em-dash is what it renders as.
 */
export type NoComparisonReason = 'no-history' | 'no-target' | 'insufficient-data'

/**
 * The comparison a delta is computed against, named explicitly.
 *
 * §3.7's legend requires the comparison period to be *named with dates*, which
 * is only possible if the comparison carries them. A bare `previousValue:
 * number` cannot fill in `Dec 26, 2023–Jan 1, 2024`.
 */
export type MetricComparison =
  | {
      kind: 'previous-period'
      value: number
      periodStart: IsoDate
      periodEnd: IsoDate
    }
  | {
      kind: 'target'
      value: number
      /** Who set it and when it applies from. A target with no owner drifts. */
      setByUserId: string | null
      effectiveFrom: IsoDate
    }
  | { kind: 'none'; reason: NoComparisonReason }

/** Which way the value moved. `null` when there is nothing to compare against. */
export type MetricDirection = 'up' | 'down' | 'flat'

export interface Metric {
  /** Stable, dotted, namespaced by sub-tab: `management.overview.activeSubscriptions`. */
  key: string
  /**
   * The sub-tab this tile belongs to — a `SubTabRoute['subTabId']`. Lets the
   * metrics library sidebar (§3.7 customise mode) group and filter without a
   * second table.
   */
  subTabId: string
  /**
   * §3.7's metrics-library grouping. Legacy has no such taxonomy; these are the
   * five categories the reference sidebar uses, mapped onto this product.
   */
  category: MetricCategory

  /**
   * **`null` means not computable, and it is not `0`.** An average renewal rate
   * over zero subscriptions is `null`; a renewal rate that is genuinely zero is
   * `0`. Legacy conflates them — `renewRateAvg != null ? renewRateAvg+'%' : '—'`
   * gets it right on that one tile (`:6913`) and `activeSubs.length` gets it
   * wrong on every other, because a count of an empty set and a count that
   * failed to compute look identical.
   */
  value: number | null
  unit: MetricUnit
  /** Set iff `unit === 'money'`. The product is Saudi-only; the field exists so that stays a choice. */
  currency: CurrencyCode | null

  /** **Required.** When the server computed it. There is no such field anywhere in the legacy app. */
  asOf: IsoDateTime

  /**
   * The window the value covers. **Both `null` on a point-in-time metric** —
   * "active captains right now" is not a period, and giving it one invites a
   * date-range control that would do nothing.
   */
  periodStart: IsoDate | null
  periodEnd: IsoDate | null

  comparison: MetricComparison
  /**
   * The delta, in percent, computed **server-side**. `null` if and only if
   * `comparison.kind === 'none'` — asserted in `clients/metrics.test.ts`, so a
   * screen may branch on either and get the same answer.
   *
   * Signed: `-12.5` is down 12.5 %. Rounded to one decimal at the source, so
   * two screens showing the same tile show the same number.
   */
  deltaPercent: number | null
  direction: MetricDirection | null
  /**
   * Whether `up` is the good direction.
   *
   * **Drives the delta's screen-reader valence phrase. It does NOT drive
   * colour** — the chip is neutral, always (D7 §4.9, and R5a, which enumerates
   * red's four permitted uses and a delta chip is none of them). See
   * `design/07-rulings-r4.md` R4-5, which voids §3.7's colour-coding MUST for
   * Eyvar. The field is still required: a rising cancellation rate is not a
   * win, and no screen can derive that from the key, the unit or the sign.
   */
  higherIsBetter: boolean

  /**
   * One line under the label stating a **scope limit or a denominator**, as a
   * translation key. `null` on a tile that needs none, which is most of them.
   *
   * **The scope is the whole of the rule** (R4-4 §4.2). A caption never states
   * a value, never states a status, never carries a call to action and never
   * carries a link. ≤60 characters, one line, truncates, never wraps. It is a
   * key with parameters, never a concatenation (AC-713).
   *
   *   legal    `Excludes pending applicants.` · `1 of 4 cities live.` ·
   *            `Ceiling is 3%.`
   *   illegal  `Up 8% on last week.` (that is the delta) · `Needs attention.`
   *            (that is a status, and R7 owns those) · `Review the queue →`
   *            (that is an action, and a tile is not a banner)
   *
   * Legacy carries exactly this line on the tiles that need one — *"excludes
   * pending applicants"* (`:10374`), *"5 of 12 total"* (`:6916`), *"ceiling
   * 3 %"* (`:15025`) — and three tiles here cannot ship without it (AC-641,
   * AC-674, AC-675). A number whose scope is not stated is a number that gets
   * quoted wrong.
   */
  caption: string | null

  /**
   * The resource this is an aggregate **of**, when it is one — `'drivers'`,
   * `'subscriptions'`, `'trips'`. `null` for a metric with no row-level source.
   *
   * This is what stops the overview and the index table disagreeing about the
   * number of active captains: the mock derives the value from the same fixture
   * the index client serves, and this field records that it did.
   */
  sourceResource: string | null
  /** Where the rows are. §3.7's report icon target. `null` when there is nothing to drill into. */
  drilldownRoute: string | null
}

/** §3.7's metrics-library categories, mapped onto this product. */
export type MetricCategory =
  | 'revenue'
  | 'subscriptions'
  | 'supply'
  | 'demand'
  | 'service'
  | 'risk'

/**
 * One point. `value: null` is a **gap** — the day exists in the range and we
 * have no reading for it. A gap is not a zero: a chart draws a break, not a dip
 * to the axis, and conflating them is how an outage looks like a collapse in
 * demand.
 */
export interface SeriesPoint {
  at: IsoDate
  value: number | null
}

export interface SeriesWindow {
  periodStart: IsoDate
  periodEnd: IsoDate
  /**
   * Ordered by `at`, ascending, no duplicates. **Empty means no data for this
   * range** — §3.7's centred sentence, card and title retained. Distinct from
   * a window of all-`null` points (we know the days and have no readings) and
   * from a window of all-zero points (we know the days and the answer is zero).
   */
  points: SeriesPoint[]
}

export interface TimeSeries {
  key: string
  subTabId: string
  unit: MetricUnit
  currency: CurrencyCode | null
  /** **Required**, same as `Metric.asOf`. */
  asOf: IsoDateTime
  /** The solid line. Always present, possibly with zero points. */
  current: SeriesWindow
  /**
   * The dotted line, same hue (§3.7). `null` when there is no comparison period
   * — which is most of this dataset, for the reason `:6979` states.
   *
   * **There is no third field and there will not be one.** See the file header.
   */
  comparison: SeriesWindow | null
  /** Mirrors `Metric.higherIsBetter` so a chart can tint a trend without joining to a tile. */
  higherIsBetter: boolean
}

/**
 * One row of a ranked list. **R4-4 §4.1, and every slot below is normative.**
 *
 * ```
 * ┌─ Top 5 zones by failure rate ───────────────────────────────────┐
 * │  Al Narjis                                          79%     3   │  label / value / secondary
 * │  ▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇                                 │  optional bar
 * │  Supply gap · captains needed                                   │  optional sub-label
 * │  Showing the top 5 of 14 zones.                                 │  AC-696
 * └─────────────────────────────────────────────────────────────────┘
 * ```
 */
export interface MetricBreakdownRow {
  id: string
  /** A key, never a string — AC-697. Truncates, never wraps. */
  labelKey: string
  labelParams: Record<string, string | number> | null
  /** The second **categorical** fact: a root-cause owner, a tier, a block. Optional. */
  subLabelKey: string | null
  value: number
  unit: MetricUnit
  currency: CurrencyCode | null
  /** The second **numeric** fact — captains needed, the count behind a rate. Right-aligned after the primary. */
  secondaryValue: number | null
  secondaryUnit: MetricUnit | null
  /** `0..1`. **`null` whenever the breakdown's `bar` is false**, so a row cannot draw a bar the list forbids. */
  barFraction: number | null
  /**
   * **`null` renders plain text, never a link** (AC-693, AC-653). A row links
   * only to a destination *already filtered to that row*; a link to an
   * unfiltered list is worse than no link, because it looks like it worked.
   */
  drilldownRoute: string | null
}

/**
 * A ranked list on a board. One construction, not three (R4-4 §4.1).
 *
 * Four rules the type cannot express and the fixtures obey:
 *
 *   - **No mutating control, ever** (AC-694). A breakdown is a reading surface.
 *     A row that can be acted on is a work-queue row and belongs on a queue.
 *   - **Fewer rows than the cut-off renders all of them** (AC-691) — no
 *     padding, no `and 0 more`.
 *   - **Zero rows is R8's second kind** (AC-692): one grey sentence, never the
 *     first-run illustration, because the section is empty and the page is not.
 *   - **The total agrees with the tile above it** when both measure the same
 *     set (AC-695). If they disagree the board is worse than having neither.
 */
export interface MetricBreakdown {
  /** Stable. The translation-key root for the heading (AC-690). */
  key: string
  /** `'zone' | 'reason-code' | 'queue' | 'hour-of-day' | …` — stated above the rows in words. */
  dimension: string
  /** The cut-off, `n`. */
  rowsShown: number
  /** So AC-696's `Showing the top {n} of {total}` needs no second request. */
  rowsTotal: number
  /**
   * **False unless every row shares one unit AND one denominator.** Where rows
   * are rates over their own bases, or counts of different things, the bar is a
   * lie about a shared scale — omit it. Half the breakdowns in this product
   * fail that test and carry `false`.
   */
  bar: boolean
  rows: MetricBreakdownRow[]
}

/** R7's five-tone palette, less `neutral`, which is not a banner tone. */
export type BoardNoticeTone = 'critical' | 'warning' | 'info' | 'success'

/**
 * A condition a board **declares**. It is not a banner.
 *
 * > **A board declares conditions; the page renders at most one banner**
 * > (R4-4 §4.3). R10 forbids two page-level banners on one page, and R5a
 * > permits exactly one page-level critical banner — so "render at most one"
 * > is mandatory rather than tidy. If `MetricBoard` rendered one and the shell
 * > rendered one, the product would have two and the second is the one nobody
 * > reads.
 *
 * The screen renders the highest tone, then the highest `severity`, then
 * declaration order, in the page banner slot between the header and the tile
 * grid. A board declares **at most three**. The suppressed conditions are not
 * lost: each is independently visible in the tile or breakdown it came from,
 * and **that is the test — a notice may only exist for a condition the board
 * already shows a number for.** A banner nothing on the page corroborates is a
 * banner the operator cannot act on.
 */
export interface BoardNotice {
  /** Translation-key root. Two keys per count — `.one` / `.many` — never a pluralisation by concatenation (AC-713). */
  key: string
  params: Record<string, string | number> | null
  tone: BoardNoticeTone
  /** Verb-first fragment plus a route. No period (R6, §5.7). `null` when there is nowhere to send them. */
  action: { labelKey: string; route: string } | null
  /** Tie-break **within** a tone. Higher wins. */
  severity: number
}

/**
 * Everything one table-less sub-tab renders, in one response.
 *
 * One request per screen rather than one per tile: eight overviews × six tiles
 * is 48 round trips, and §3.7's grid is laid out as a unit — a page that
 * resolves tile-by-tile reflows six times before it settles.
 */
export interface MetricBoard {
  subTabId: string
  /** The board's own computation instant. Individual metrics may be older; each carries its own. */
  asOf: IsoDateTime
  metrics: Metric[]
  charts: TimeSeries[]
  /** Ranked lists, in the order the board declares them. Empty on a board that specifies none. */
  breakdowns: MetricBreakdown[]
  /** Declared conditions, **at most three**. The page renders at most one. */
  notices: BoardNotice[]
}

/**
 * One row of `DB.dailySnapshots` (`eyvar_ops_panel_v40_fixed.html:13803`–`:13832`),
 * the only real history the legacy app holds.
 *
 * `captureDailySnapshot` (`:7645`–`:7653`) writes nine fields once a day. The
 * legacy comment above the array is candid about what it is — *"a point-in-time
 * rollup captured on demand (this file has no server to run a real midnight
 * cron)"* (`:13796`–`:13800`) — and `renderTrendChart` (`:6769`) already plots
 * two of them and computes a first-to-last change percentage at `:6776`.
 *
 * **Money is halalas here, not the SAR strings legacy stores.** The legacy rows
 * carry `totalRevenue:'295.05'` and the app `toFixed(0)`s them at render
 * (`:14383`). The conversion happens once, at this fixture, per §4.3.
 *
 * **`date` is an `IsoDate`, not legacy's `'26 Jun 09:00'`.** The capture instant
 * is always 09:00 Riyadh and carrying it in a display string is how a series
 * ends up sorted lexically.
 */
export interface DailySnapshot {
  /** `SNAP-0001` … `SNAP-0030`, ascending with `date`. */
  id: string
  /** The day the rollup covers. Legacy captures at 09:00 Riyadh (`:13803`). */
  date: IsoDate
  /** Total riders on the platform that day — a census, not a period count. */
  riders: number
  /** Captains **excluding `pending`** — legacy's own exclusion (`:7649`). */
  drivers: number
  /** Subscriptions whose status does not match `/cancel/i` (`:7648`). */
  activeSubs: number
  /** Quick-ride trips that day (`:7648`). */
  quickRides: number
  /** Cancelled ÷ quick rides, rounded to a whole percent (`:7650`). */
  cancelRatePct: number
  /** All paid payments that day (`:7650`). */
  totalRevenueHalalas: number
  /** Paid payments of type `Quick ride fare` (`:7651`). */
  quickRideRevenueHalalas: number
  /** Paid payments of type `Subscription charge` (`:7651`). */
  subRevenueHalalas: number
}
