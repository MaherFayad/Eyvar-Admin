/**
 * The Report Builder's query model, its result, and the three things that
 * persist over it — `06-report-builder.md` §3, §4.2, §11, §12.
 *
 * §3.1 in one sentence: **everything in this module is one object at four
 * levels of persistence.** A composed query is a `ReportQuery`; the URL is that
 * object serialised; a saved report is that object plus a name and an owner; a
 * dashboard tile is a pointer to a saved report; an alert rule is a pointer to
 * one series of one saved report plus a comparator and a threshold.
 *
 * ## Why this is a different data contract
 *
 * `Paginated<T>` answers *"which records"*. `ReportResult` answers *"how many,
 * bucketed how"*. D13: *"the 34 sub-tabs are served by typed, per-resource
 * clients… that shape cannot answer 'drivers vs passengers, weekly, last 90
 * days', because the question names no resource."* They share
 * `QueryParams.filters` and nothing else, and that sharing is deliberate (§3.4).
 *
 * ## Comparison, and why small multiples fall out of the model
 *
 * Two controls share the word *compare* and they are not the same control:
 * a second **measure** (§6.1) and a previous **period** (§6.3). They compose,
 * and 2 measures × a period comparison is four series, which is the ceiling.
 *
 * **R4-1 ruled the rendering and this type encodes it rather than restating
 * it.** There is no `yAxis` on a result and no `sharedScale` flag. Instead every
 * series names a `panelId`, and **two series share a y-axis if and only if they
 * share a panel**. The only rule that puts two series in one panel is *same
 * measure, same group, current vs comparison* — same number, same scale, and
 * §3.7 already rules that pair is one hue, dotted for the comparison.
 *
 * So small multiples are not a rendering the UI chooses; they are what the
 * result already is. And a shared axis stays *possible* — if §12 **D-12** is
 * ever signed and a categorical palette is minted, two measures share a panel
 * by changing one function in `reporting/plan.ts`. No type changes, no screen
 * changes, no saved report migrates.
 *
 * R4-1 §1.2(c) is the reason this matters more than colour: *"drivers vs
 * passengers"* differ by an order of magnitude by construction, so on a shared
 * axis the captains line is a flat trace and its trend — the thing the owner
 * asked to see — is invisible. **Two hues would make it a coloured flat trace.**
 */

import type {
  CurrencyCode,
  FilterSpec,
  Halalas,
  IsoDate,
  IsoDateTime,
} from './common'
import type { MetricUnit } from './metrics'
import type { PermissionKey } from './navigation'
import type { MeasureGrain, MeasureKey, Temporality } from './measure'

/* ─────────────────────────── the query ─────────────────────────────────── */

/**
 * §3.2's nine values, **verbatim from §3.7's own preset list**, so the range
 * popover this module needs is the popover the metric boards already specify.
 * It is not a new control.
 */
export type ReportPreset =
  | 'today'
  | 'yesterday'
  | 'last-7d'
  | 'last-30d'
  | 'last-90d'
  | 'last-365d'
  | 'last-month'
  | 'last-12-months'
  | 'last-year'

export type ReportWindow =
  | { kind: 'preset'; preset: ReportPreset }
  /** Inclusive of the whole end day in Riyadh — the rule `lib/columnFilter.ts` already encodes. */
  | { kind: 'absolute'; from: IsoDate; to: IsoDate }

/**
 * `'none'` **collapses the window to one bucket**. It is what a pie or a
 * single-value read requires, and it is a legal grain, not an absence of one
 * (§3.5).
 *
 * `'hour'` is here because R4-1 §4.4 moved the hourly trend to this module. No
 * measure answers at it today; it is offered and disabled with a reason.
 */
export type ReportGrain = MeasureGrain | 'none'

export type PeriodComparison = 'none' | 'previous-period' | 'previous-year'

export type ChartType = 'line' | 'bar' | 'pie' | 'table'

/** §3.2. A ref, not a copy of the measure — the catalogue is the definition. */
export interface MeasureRef {
  key: MeasureKey
}

export interface ReportQuery {
  /**
   * One or two. **Capped at two** (§6.1) — *"the third series is where a chart
   * stops answering a question and starts being a dashboard"*. An operator who
   * needs three builds two reports and pins both to a dashboard, which is
   * exactly what §11 is for.
   */
  measures: MeasureRef[]
  /** A dimension key legal for **every** measure listed. `null` is no split. */
  groupBy: string | null
  /** The existing vocabulary, unchanged. No second filter model (AC-814). */
  filters: FilterSpec[]
  window: ReportWindow
  grain: ReportGrain
  periodComparison: PeriodComparison
  chartType: ChartType
}

/* ─────────────────────────── the result ────────────────────────────────── */

/**
 * Conditions the result must state out loud. Every one of these has a rendering
 * and none of them is silent.
 *
 * `gaps-outside-fixture-range` is deliberately named for what it is: §4.4.1
 * requires the mock to emit `null` outside a store's coverage rather than
 * inventing a smooth trend, and this warning is that admission on the wire. In
 * http mode a server emits it when a store genuinely does not reach back that
 * far, which is the same fact.
 */
export type ReportWarning =
  | 'partial-first'
  | 'partial-last'
  | 'grain-coarsened'
  | 'groups-folded'
  | 'gaps-outside-fixture-range'

/**
 * A y-axis and a chart card. **The unit of rendering, and the reason two
 * measures cannot silently share a scale.**
 *
 * Panels lay out on the metric-tile grid already in the product —
 * `auto-fill minmax(268px, 1fr)`, four above `--ev-bp-wide`, three below
 * (R4-1 §1.4). No new grid, no new breakpoint, no new token.
 */
export interface ReportPanel {
  panelId: string
  /**
   * The panel's title as a key plus params — the measure name, or measure and
   * group for a split. **One key with named parameters, never `a + ' vs ' + b`**
   * (AC-895).
   */
  titleKey: string
  titleParams: Record<string, string | number>
  /** Every series in this panel shares this unit. That is what makes one axis honest. */
  unit: MetricUnit
  currency: CurrencyCode | null
  /** Ascending draw order. Chosen-measure order, then group rank descending, `Other` last. */
  seriesIds: string[]
}

export interface ReportSeries {
  /** Stable within the result. Saved by an alert rule, so it must not be an index. */
  id: string
  measureKey: MeasureKey
  /** `null` when there is no group-by. `'__other__'` for §7.4's fold. */
  groupValue: string | null
  role: 'current' | 'comparison'
  /**
   * Which panel — and therefore which y-axis — this series belongs to.
   * A `comparison` series always shares its `current` series' panel.
   */
  panelId: string
  unit: MetricUnit
  currency: CurrencyCode | null
  /** Echoed from the catalogue, so a chart can label a stock and a flow differently. */
  temporality: Temporality
  /**
   * Parallel to `ReportResult.buckets`.
   *
   * **`null` is a gap, not a zero** — the rule `types/metrics.ts` already argues
   * for on `SeriesPoint`: *"a chart draws a break, not a dip to the axis, and
   * conflating them is how an outage looks like a collapse in demand."* This
   * type inherits it rather than restating it.
   *
   * **Empty when `blocked` is non-null** — §13.1 requires redaction in the
   * payload, and AC-888 verifies it against the response, not the rendering.
   */
  points: (number | null)[]
  /** Indexes into `buckets` whose bucket is incomplete. Rendered and marked, never dropped (§3.5). */
  partialBucketIndexes: number[]
  /**
   * The permission the viewer lacks. **Per series, not per result** — a
   * two-measure report where one measure is unauthorised renders the half that
   * worked (§3.6).
   */
  blocked: PermissionKey | null
  /** One leg failed. Its panel carries its own retry; the rest of the report is live (AC-851). */
  failed: { code: string; retryable: boolean } | null
}

export interface ReportResult {
  /** Echoed, so a stale response is detectable and state 2 (Dirty) can mark the canvas. */
  query: ReportQuery
  /** When the server computed it. **Required** — §3.6, and no KPI in the legacy app has one. */
  asOf: IsoDateTime
  /** Bucket start boundaries, ascending, Riyadh-local midnights. */
  buckets: IsoDate[]
  panels: ReportPanel[]
  series: ReportSeries[]
  /** A server-side row cap was hit. The chart renders **with** a stated caveat (AC-849). */
  truncated: boolean
  /** The cap that was hit, so the caveat can name it. `null` when `truncated` is false. */
  truncatedAtRows: number | null
  warnings: ReportWarning[]
  /** How many groups §7.4 folded into `Other`. `null` when nothing was folded. */
  foldedGroupCount: number | null
}

/* ──────────────────── query legality, as data ──────────────────────────── */

/**
 * Why a query, a grain, a chart type or a dimension is not legal.
 *
 * **These are returned, never thrown, and they are the same objects the panel
 * uses to disable a control in place with a reason** (D9 CQ-3: *destinations
 * and records are absent; actions are disabled in place with a reason*). One
 * vocabulary for "you cannot" whether it is discovered before a run or after a
 * hand-edited URL (AC-825).
 */
export type QueryViolationCode =
  | 'no-measure'
  | 'unknown-measure'
  | 'too-many-measures'
  | 'mixed-temporality'
  | 'mixed-unit'
  | 'illegal-dimension'
  | 'no-shared-filter-field'
  | 'grain-below-min'
  | 'too-many-buckets'
  | 'illegal-chart-type'
  | 'window-inverted'

export interface QueryViolation {
  code: QueryViolationCode
  /** Which control the reason belongs beside. */
  field: 'measures' | 'groupBy' | 'filters' | 'window' | 'grain' | 'chartType'
  /** The reason, as a key with params. Never assembled from fragments (AC-894). */
  reasonKey: string
  reasonParams: Record<string, string | number>
}

/** One option of a control, with the reason it is disabled. Never hidden (AC-836, AC-816). */
export interface OptionLegality<T extends string> {
  value: T
  legal: boolean
  /** `null` when legal. */
  reasonKey: string | null
  reasonParams: Record<string, string | number>
}

/** §7.1's matrix and §3.5's grain gate, resolved for the query currently in the panel. */
export interface QueryPlan {
  violations: QueryViolation[]
  /** How many buckets the window and grain produce. Drives AC-817's 400 cap **before** a run. */
  bucketCount: number
  grains: OptionLegality<ReportGrain>[]
  chartTypes: OptionLegality<ChartType>[]
  /** The chart type that will actually be drawn — §7.3's nearest-legal coercion. */
  effectiveChartType: ChartType
  /** True when `effectiveChartType !== query.chartType`, so the card can say so inline. */
  chartTypeCoerced: boolean
  /** Dimension keys legal for **every** measure in the query. */
  legalDimensions: string[]
  /** The intersection of every measure's `filterableFields`. Empty disables the filter control (AC-813). */
  legalFilterFields: string[]
  /** How many panels the result will have. > 1 is small multiples, unconditionally (R4-1). */
  panelCount: number
}

/* ────────────────────────── run outcome ────────────────────────────────── */

/**
 * `reports.run`'s outcome.
 *
 * **A returned union, not a throw**, for the same reason the auth client
 * returns its outcomes: an illegal query is a domain answer the panel renders
 * beside a control, not a transport failure. `ApiError` is still thrown for
 * transport, and `?mockFail=reports.run` still produces one (AC-846).
 *
 * `invalid-query` is what a hand-edited URL gets (AC-825): the previous result
 * is retained by the caller, and the violations say what to fix.
 */
export type RunReportOutcome =
  | { status: 'ok'; result: ReportResult }
  | { status: 'invalid-query'; violations: QueryViolation[] }

/* ─────────────────────── saved reports (Q1) ────────────────────────────── */

export type ReportVisibility = 'private' | 'team'

/** §4.2. 1–80 characters, asserted at the client (AC-856). */
export const REPORT_NAME_MAX = 80

export interface SavedReport {
  id: string
  name: string
  description: string | null
  query: ReportQuery
  /** A `TeamUser.id`, taken from the session at create time. */
  ownerId: string
  visibility: ReportVisibility
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
  /**
   * **Derived, read-only.** A reverse index, and the reason §11.3's delete
   * confirmation can name the dashboards it will affect (AC-868).
   */
  pinnedToDashboardIds: string[]
}

export interface DashboardTile {
  tileId: string
  /** **A reference, never a copy.** §11.3 — editing a report changes every dashboard that pins it. */
  reportId: string
  /**
   * Copied at pin time and **display fallback only**: rendered *only* when
   * `reportId` no longer resolves, so a missing tile can name what it used to
   * be (AC-869). It is never the source of truth for a resolvable tile.
   */
  pinnedName: string
  /** `Move up` / `Move down` — keyboard-operable by construction. §11.2 rejects a drag grid for the core. */
  order: number
}

export interface Dashboard {
  id: string
  name: string
  ownerId: string
  tiles: DashboardTile[]
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

/* ───────────────────────── alert rules (§12) ───────────────────────────── */

/**
 * Four values, and **deliberately the same four names `FilterOperator`
 * already uses** (§12.2). One comparator vocabulary in the product.
 */
export type AlertComparator = 'gt' | 'gte' | 'lt' | 'lte'

/**
 * How often the server looks. §4.2 offers two values.
 *
 * **Every seeded rule carries `cadence: null`, and that is the point.** The
 * business has not specified an evaluation cadence, no scheduler exists
 * (Q-RB-7), and `AC-453` is this project's standing rule for exactly this case:
 * *an invented window is indistinguishable from a measured one once it is in a
 * fixture*. So the field is modelled, left unset, and a rule with
 * `cadence: null` **does not evaluate** — the same shape R5-15 gives a measure
 * with no population.
 */
export type AlertCadence = 'hourly' | 'daily'

/** §12.4's state machine. Server state — *"state in a browser is not state"* (§12.1). */
export type AlertState = 'armed' | 'firing' | 'cooling' | 'suspended' | 'error'

export interface AlertRule {
  id: string
  name: string
  /** An alert targets a **saved** report — a stable identity, a name, and somewhere to send the operator. */
  reportId: string
  /** One `ReportSeries.id` of that report. */
  seriesId: string
  comparator: AlertComparator
  /**
   * The number the series is tested against, **in the series' own wire unit**.
   * Money is integer halalas here as everywhere; an operator typing `40`
   * against a money measure means 40 SAR and the wire carries `4000`.
   */
  threshold: number
  /**
   * **Derived** from the series' measure. An operator never picks a unit
   * (AC-876). Carried on the rule so a rule list can render a threshold without
   * resolving the report.
   */
  thresholdUnit: MetricUnit
  thresholdCurrency: CurrencyCode | null

  /** Which bucket's value is tested. */
  evaluationGrain: MeasureGrain

  /**
   * **Unset on every seeded rule.** See `AlertCadence`. `null` means no cadence
   * has been specified by the business, and the rule does not evaluate.
   */
  cadence: AlertCadence | null

  /**
   * §12.4's backstop for a value that oscillates across the line.
   *
   * **`null` on every seeded rule**, and `null` is meaningful: hysteresis alone
   * — the value must come back inside the threshold before the rule can fire
   * again — which §12.4 names as the default. No minimum has been specified and
   * none is invented.
   */
  minReArmMinutes: number | null

  /**
   * How many consecutive `reports.run` failures move the rule to `error`.
   * **AC-886 states five**, so this is specified rather than invented; it is a
   * field rather than a constant because the number is the business's to change.
   */
  consecutiveFailuresBeforeError: number

  state: AlertState
  enabled: boolean
  /**
   * A **deadline, not a duration** — the house rule. Silences notifications
   * without stopping evaluation: a rule muted while firing still re-arms
   * (AC-887).
   */
  mutedUntil: IsoDateTime | null

  /** `TeamUser.id`s. §13.3 — a recipient who cannot see the measure is not a legal recipient. */
  recipientIds: string[]
  /** **Evaluation authority** (§13.3): the rule is evaluated as its owner, never on wider rights. */
  ownerId: string

  /**
   * The priority the emitted `Notification` carries. `'high'` by default.
   *
   * **`'critical'` is unreachable today and deliberately so**: §13.2 restricts
   * marking a rule critical to a permission that does not exist, and Q-RB-9
   * asks the owner which. Not derived from how far past the threshold the value
   * went — *that is a magnitude, not an urgency* (§12.5).
   */
  notificationPriority: 'high' | 'critical'

  lastEvaluatedAt: IsoDateTime | null
  lastFiredAt: IsoDateTime | null
  lastValue: number | null
  /** Why the rule is `suspended` or in `error`, as a key. `null` in every other state. */
  stateReasonKey: string | null

  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

/** One past crossing. `alerts.history`. */
export interface AlertFiring {
  id: string
  ruleId: string
  firedAt: IsoDateTime
  /** The complete bucket that tripped it. */
  bucketStart: IsoDate
  value: number
  threshold: number
  /** The `Notification.id` this firing produced, so the two can be reconciled. */
  notificationId: string | null
}

/**
 * `Test this rule` — §12.1's fourth client-owned item, and AC-877.
 *
 * **It says *would have fired*, never *fired*.** `stateChanged` is the literal
 * `false` so no caller can read it as anything else, and no notification is
 * emitted. This is how an operator discovers the threshold is on the wrong side
 * of the line.
 */
export interface AlertEvaluation {
  ruleId: string
  evaluatedAt: IsoDateTime
  /** The most recent **complete** bucket. `null` when the window holds none (§12.3). */
  bucketStart: IsoDate | null
  value: number | null
  unit: MetricUnit
  currency: CurrencyCode | null
  wouldFire: boolean
  outcome:
    | 'would-fire'
    | 'would-not-fire'
    | 'no-complete-bucket'
    | 'series-missing'
    | 'series-blocked'
    | 'report-missing'
  stateChanged: false
}

/* ───────────────────── mutation outcomes ───────────────────────────────── */

/**
 * Validation is a **returned** outcome. A failed save never closes the dialog
 * it came from (§8.3), and the operator's input is preserved — which is only
 * possible if the caller gets a value back rather than an exception it has to
 * pattern-match on.
 */
export type SaveInvalidReason =
  | 'name-required'
  | 'name-too-long'
  | 'query-invalid'
  | 'no-tiles'
  | 'threshold-required'
  | 'series-unknown'
  | 'report-unsaved'
  | 'recipient-not-permitted'

export interface SaveInvalid {
  status: 'invalid'
  reasons: SaveInvalidReason[]
}

export type SaveReportOutcome = { status: 'saved'; report: SavedReport } | SaveInvalid

/**
 * §11.3: deleting a pinned report is **refused by default**, and the
 * confirmation **names the dashboards**. Returning them as data is what lets it
 * name them — a bare `409` could not.
 */
export type DeleteReportOutcome =
  | { status: 'deleted' }
  | { status: 'pinned'; dashboards: Array<{ id: string; name: string }> }

export type SaveDashboardOutcome = { status: 'saved'; dashboard: Dashboard } | SaveInvalid

export type SaveAlertOutcome = { status: 'saved'; rule: AlertRule } | SaveInvalid

/* ──────────────────────────── export ───────────────────────────────────── */

/**
 * One row of §10.1's long-format CSV: one row per bucket × series.
 *
 * ## §10.2 — the one deliberate break of the halalas rule
 *
 * **`value` is decimal SAR for a money series, not halalas**, with an explicit
 * `currency` column. Everywhere else in this product money is `Halalas` and
 * that rule is absolute. A CSV's consumer is a spreadsheet operated by a human,
 * not the app, and `29505` in a revenue column is a defect the operator will
 * not catch. **This is stated here so nobody later "fixes" it.**
 *
 * The in-app number and the CSV number agree to the halala (AC-863) because
 * both come from the same integer; only the presentation differs.
 */
export interface ReportCsvRow {
  bucket_start: IsoDate
  series: string
  measure_key: MeasureKey
  group_value: string | null
  role: 'current' | 'comparison'
  /** Decimal SAR for money. `null` is an empty cell — a gap, never `0`. */
  value: number | null
  unit: MetricUnit
  currency: CurrencyCode | null
  is_partial_bucket: boolean
}

/**
 * The block that precedes the data. *"A CSV of bare numbers with no window is
 * unattributable the moment it reaches a spreadsheet, and unattributable
 * numbers are how the wrong figure ends up in a deck."* (§10.1)
 */
export interface ReportCsvHeader {
  reportName: string | null
  windowFrom: IsoDate
  windowTo: IsoDate
  grain: ReportGrain
  periodComparison: PeriodComparison
  filters: FilterSpec[]
  asOf: IsoDateTime
  /** AC-890 — a series the operator may not see is omitted, and the header says so and why. */
  omittedSeries: Array<{ measureKey: MeasureKey; permission: PermissionKey }>
}

export interface ReportCsv {
  header: ReportCsvHeader
  rows: ReportCsvRow[]
}

/** Re-exported so a caller formatting a threshold does not have to reach into `common`. */
export type { Halalas }
