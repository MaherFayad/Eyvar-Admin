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
 */

import type { CurrencyCode, IsoDate, IsoDateTime } from './common'

/**
 * What the number is, so `formatMoney` / `formatPercent` are chosen from data
 * rather than guessed from the key's name.
 *
 * `money` is **always halalas** (`Halalas`), never a float and never a
 * pre-formatted string — same rule as everywhere else in this layer.
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
   * Whether `up` is the good direction. Drives the delta's colour, which §3.7
   * requires alongside the caret. Cannot be derived from the key, the unit or
   * the sign.
   */
  higherIsBetter: boolean

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
}
