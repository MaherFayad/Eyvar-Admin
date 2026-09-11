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
import type { BucketAggregate, DimensionKey, MeasureGrain, MeasureKey, Temporality } from './measure'
import type { SegmentRef } from './segment'
import type { AlertRule } from './alert'

/**
 * Alert types moved to `alert.ts` (D42). Re-exported here for one phase so
 * `import { AlertRule } from './report'` keeps compiling.
 */
export type {
  AlertCadence,
  AlertChannel,
  AlertComparator,
  AlertCondition,
  AlertEvaluation,
  AlertFiring,
  AlertRule,
  AlertSeverity,
  AlertState,
} from './alert'
export { alertChannels, alertCondition, alertSeverity, normaliseAlertRule } from './alert'

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

/**
 * The nine, in the order every range control offers them.
 *
 * Exported so a second range control cannot be built with eight of them in a
 * different order: the list and the union are one declaration, and a preset
 * added to the type without a place in this array does not compile.
 */
export const REPORT_PRESETS: readonly ReportPreset[] = [
  'today',
  'yesterday',
  'last-7d',
  'last-30d',
  'last-90d',
  'last-365d',
  'last-month',
  'last-12-months',
  'last-year',
]

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

/**
 * G6 (`02-report-builder-v2.md` §2.6): v2 adds `previous-quarter` and a fixed
 * range. `fixed` must have the same bucket count as the current window, or the
 * planner emits `comparison-length`.
 */
export type PeriodComparison =
  | 'none'
  | 'previous-period'
  | 'previous-quarter'
  | 'previous-year'
  | { kind: 'fixed'; from: IsoDate; to: IsoDate }

/** §2.6. `'series'` is R7's dashed-overlay default; `difference` and `percent-change` are resolved, not drawn client-side. */
export type ComparisonDisplay = 'series' | 'difference' | 'percent-change'

export const DEFAULT_COMPARISON_DISPLAY: ComparisonDisplay = 'series'

/** G8: v1's four plus area, the two stacked forms, horizontal bar and kpi (§3 legality gates each). */
export type ChartType =
  | 'line'
  | 'area'
  | 'bar'
  | 'stacked-bar'
  | 'stacked-100'
  | 'horizontal-bar'
  | 'pie'
  | 'kpi'
  | 'table'

/**
 * §3.2. A ref, not a copy of the measure — the catalogue is the definition.
 *
 * `aggregate` (G1) is legal only when `Measure.bucketAggregateOptions`
 * includes it; the planner emits `illegal-aggregate` otherwise. Absent means
 * the catalogue's own `Measure.bucketAggregate`.
 */
export interface MeasureRef {
  key: MeasureKey
  aggregate?: BucketAggregate
}

/** G2 (§2.2): `A / B`, `A * n`, `ROLLAVG(A, n)`, `CUMSUM(A)`, `DELTA(A)`, `PCT(A)`. Parsed by `reporting/formula.ts`. */
export interface ReportFormula {
  expression: string
  label: string
}

/**
 * G3 (§2.3), applied by the resolver after aggregation, before comparison.
 * `cumulative` requires `additive`; `percentOfTotal` requires a split;
 * `rollingAverage` is 2 … 30 and disabled below that many buckets.
 */
export interface ReportTransform {
  cumulative: boolean
  rollingAverage: number | null
  percentOfTotal: boolean
}

export const DEFAULT_REPORT_TRANSFORM: ReportTransform = {
  cumulative: false,
  rollingAverage: null,
  percentOfTotal: false,
}

/** G4: two levels keeps the legend readable. Series ids become `<measureKey>#<g1>|<g2>#<role>`. */
export const REPORT_GROUP_BY_MAX = 2

/** G5: the series ceiling counts `measures × segments × groups` (24 with a comparison). */
export const REPORT_SEGMENTS_MAX = 4

/* ──────────────────────── the analysis mode ────────────────────────────── */

/**
 * **The five questions one editor can ask.** P7-T1.
 *
 * `ReportStudio.tsx:111` had these as `AnalysisNavMode` — a `useState` inside an
 * unrouted screen, so a funnel could not be reloaded, bookmarked, sent to
 * anyone, pinned to a dashboard or alerted on. Moving the value into the query
 * is what makes the other four modes reach the same governance `trend` already
 * has: §9.2 makes the URL the storage adapter, and **a mode that does not
 * serialise is a mode nobody can send to anyone** (AC-853/854/855).
 *
 * The names are the domain's, not the legacy screen's: `ReportStudio` called
 * them `segmentation`, `retention` and `journeys`. `trend` is what §3 already
 * calls this module's default question, `cohort` is what `reporting/cohorts.ts`
 * already computes, and singulars match every other enum here.
 *
 * ## Why `mode` is optional and why that is the contract, not a shortcut
 *
 * **Absence means `'trend'`, on the wire and in the URL.** Every report saved,
 * bookmarked or pasted into a chat window before this field existed carries no
 * mode, and those links must keep resolving to the report they named — which is
 * AC-853 applied to the field that was added rather than to the field that
 * changed. So the default is never written (`serialiseReportQuery` omits it)
 * and never required (`reportMode()` resolves it). A server rolling this out
 * additively answers the same way.
 *
 * Read it through `reportMode(query)`. Do not read `query.mode` directly; the
 * `undefined` arm is meaningful and reading it raw is how one call site decides
 * `undefined` is an error state.
 */
export type ReportMode = 'trend' | 'funnel' | 'table' | 'cohort' | 'journey'

/** All five, in switcher order. An illegal configuration disables in place, never hides a mode. */
export const REPORT_MODES: readonly ReportMode[] = ['trend', 'funnel', 'table', 'cohort', 'journey']

/** What an absent `mode` means — in a saved report, in a URL, and in a request body. */
export const DEFAULT_REPORT_MODE: ReportMode = 'trend'

/**
 * One rung of a funnel: a population, narrowed.
 *
 * `filters` is per step and not per query, because *"requested a trip in
 * Riyadh, then completed it anywhere"* is a different funnel from
 * *"requested and completed in Riyadh"*, and a single query-level filter cannot
 * express the first. It is the **same** `FilterSpec` vocabulary — no second
 * filter model (AC-814).
 */
export interface FunnelStep {
  measureKey: MeasureKey
  filters: FilterSpec[]
}

/**
 * §P7-T2: *a funnel needs ordered steps*. **The array order is the order** —
 * there is no `position` field, because two sources of truth for an ordering is
 * how a funnel ends up rendering its steps in one order and computing drop-off
 * in another.
 */
export type FunnelMode = 'ordered' | 'unordered' | 'sequential'
export type FunnelMeasuredAs = 'conversion' | 'conversion-over-time' | 'time-to-convert'

export interface FunnelSpec {
  steps: FunnelStep[]
  /**
   * How long one subject has to reach the last step from the first. **`null`
   * means the report window** — any other default is invented (AC-453).
   * `normaliseReportQuery` migrates v1's `conversionWindowDays: n` here as
   * `{ value: n, unit: 'day' }` (G10, §5).
   */
  conversionWindow: { value: number; unit: 'hour' | 'day' | 'week' } | null
  /** Default `'ordered'`. `sequential` needs `Measure.funnelCapabilities.sequential`. */
  mode: FunnelMode
  /** Needs `Measure.funnelCapabilities.holdConstant`. `null` holds nothing constant. */
  holdConstant: DimensionKey | null
  /** Populations that disqualify a subject anywhere in the funnel. */
  exclude: MeasureKey[]
  /** Default `'conversion'`. */
  measuredAs: FunnelMeasuredAs
  /** The drop-off group table's split, opened by clicking a step. `null` is ungrouped. */
  groupBy: DimensionKey | null
}

/** v1's shape. `normaliseReportQuery` accepts either this or `FunnelSpec`. */
export interface FunnelSpecV1 {
  steps: FunnelStep[]
  conversionWindowDays: number | null
}

/**
 * How cohorts are bucketed and how their age is counted.
 *
 * **Only `'month'` computes today**, and the reason is a data fact rather than
 * an unwritten feature: `reporting/cohorts.ts` measures age with `monthDiff`
 * over a single `lastActiveAt` per subject. That is honest at month resolution
 * — "was this subject still around in month 3" — and it is not honest at day
 * resolution, where a day-7 column derived from one last-seen timestamp is a
 * survival curve wearing a retention matrix. `planQuery` therefore returns
 * `'day'` and `'week'` **disabled in place with that reason** (D9 CQ-3) rather
 * than omitting them from the type, because a server with a real activity
 * history answers all three and the contract is written for that server.
 */
export type CohortGrain = 'day' | 'week' | 'month'

/**
 * §P7-T2: *a cohort needs an anchor event and a window*.
 *
 * The **anchor** is what puts a subject in a cohort and starts its clock; the
 * **window** is `ReportQuery.window` — there is no second date range here,
 * because a cohort report with its own window and the query's window would be
 * two ranges the operator has to reconcile. `horizon` says how far past the
 * anchor the matrix reaches, and the plan checks the window is long enough to
 * reach it (`cohort-window-too-short`).
 */
export type CohortMethod = 'rolling' | 'nday' | 'bracket'

export interface CohortSpec {
  /** The event that forms the cohort. `null` is an unstarted cohort report, not an error. */
  anchorMeasureKey: MeasureKey | null
  /**
   * What counts as *still here*, OR-combined. `[]` means the anchor's own
   * subject activity (`buildCohortMatrix`'s `getLastActiveAt`). v2 (G11, §6);
   * `normaliseReportQuery` migrates v1's single `returnMeasureKey` into this.
   */
  returnMeasureKeys: MeasureKey[]
  cohortGrain: CohortGrain
  /** Default `'rolling'`. */
  method: CohortMethod
  /** In `cohortGrain` units, e.g. `[[0,7],[7,14]]`. `null` unless `method === 'bracket'`. */
  brackets: [number, number][] | null
  /**
   * How many intervals after the anchor the matrix reaches — `M0 … M{horizon}`,
   * the exact vocabulary `reporting/cohorts.ts` already consumes.
   */
  horizon: number
}

/** v1's shape. `normaliseReportQuery` accepts either this or `CohortSpec`. */
export interface CohortSpecV1 {
  anchorMeasureKey: MeasureKey | null
  returnMeasureKey: MeasureKey | null
  cohortGrain: CohortGrain
  horizon: number
}

/**
 * §P7-T2: *a journey needs a root*.
 *
 * `depth` is how many steps forward the tree expands. There is no
 * `direction` field: `ReportStudio`'s journeys were forward-only
 * (`:1370–1470`) and a backwards journey is a different question nobody has
 * asked for.
 */
export interface JourneySpec {
  /** Where every path starts. `null` is an unstarted journey report, not an error. */
  rootMeasureKey: MeasureKey | null
  depth: number
}

/** G12, §7: a measure per column rather than a series per row. Each column resolves as its own leg. */
export type TableColumn =
  | { kind: 'measure'; ref: MeasureRef; filters?: FilterSpec[]; label?: string }
  | { kind: 'formula'; expression: string; label: string }

export interface TableFormatBand {
  lte: number
  tone: 'success' | 'warning' | 'neutral'
}

export interface TableSpec {
  /** 1 … 8. */
  columns: TableColumn[]
  /** 0 … 2, folded at 8 each. `'time'` uses the query's own grain. */
  rows: ('time' | DimensionKey)[]
  /** A totals row, only when every column is additive — otherwise the cell reads the aggregate word. */
  totals: boolean
  format: { column: number; bands: TableFormatBand[] }[]
}

export interface ReportQuery {
  /**
   * One or two. **Capped at two** (§6.1) — *"the third series is where a chart
   * stops answering a question and starts being a dashboard"*. An operator who
   * needs three builds two reports and pins both to a dashboard, which is
   * exactly what §11 is for.
   */
  measures: MeasureRef[]
  /** G4: legal for every measure listed, capped at `REPORT_GROUP_BY_MAX`. `[]` is no split. */
  groupBy: DimensionKey[]
  /** The existing vocabulary, unchanged. No second filter model (AC-814). */
  filters: FilterSpec[]
  window: ReportWindow
  grain: ReportGrain
  periodComparison: PeriodComparison
  chartType: ChartType

  /** G2. Replaces the measure series in the plot when set. */
  formula?: ReportFormula
  /** G3. Applied after aggregation, before comparison. Absent means `DEFAULT_REPORT_TRANSFORM`. */
  transform?: ReportTransform
  /** G5, capped at `REPORT_SEGMENTS_MAX`. Absent or `[]` means "everyone". */
  segments?: SegmentRef[]
  /** G6. Absent means `DEFAULT_COMPARISON_DISPLAY`. */
  comparisonDisplay?: ComparisonDisplay

  /* ── the mode, and the four configurations only one mode reads ────────── */

  /**
   * Which of the five questions this is. **Absent means `'trend'`** — read it
   * through `reportMode(query)`, never directly. See `ReportMode`.
   */
  mode?: ReportMode
  /** Read only when `mode` is `'funnel'`. Absent is an unstarted funnel. */
  funnel?: FunnelSpec
  /** Read only when `mode` is `'cohort'`. Absent is an unstarted cohort report. */
  cohort?: CohortSpec
  /** Read only when `mode` is `'journey'`. Absent is an unstarted journey. */
  journey?: JourneySpec
  /** Read only when `mode` is `'table'` (§7). Absent is the degenerate series table, `rows: ['time']`. */
  table?: TableSpec
}

/**
 * A `ReportQuery` as a v1 URL, saved report or caller may still carry it —
 * `groupBy` a bare dimension, `funnel`/`cohort` in their v1 shapes.
 * `normaliseReportQuery` is the only function that reads this type.
 */
export type ReportQueryInput = Omit<ReportQuery, 'groupBy' | 'funnel' | 'cohort'> & {
  groupBy: DimensionKey[] | DimensionKey | null
  funnel?: FunnelSpec | FunnelSpecV1
  cohort?: CohortSpec | CohortSpecV1
}

/**
 * The **one** reader of `query.mode`.
 *
 * Everything downstream — the planner, the resolver, the serialiser, a screen
 * — goes through this, so `undefined` is interpreted in exactly one place. The
 * alternative is five call sites each deciding for themselves whether a missing
 * mode is a trend or a bug, and four of them being right.
 */
export function reportMode(query: Pick<ReportQuery, 'mode'>): ReportMode {
  return query.mode ?? DEFAULT_REPORT_MODE
}

/** `groupBy` migrated: a bare dimension becomes a one-element array, `null` becomes `[]`. */
function normaliseGroupBy(groupBy: DimensionKey[] | DimensionKey | null): DimensionKey[] {
  if (groupBy === null) return []
  return Array.isArray(groupBy) ? groupBy : [groupBy]
}

/** `funnel.conversionWindowDays` migrated to `conversionWindow`; every v2 default filled. */
function normaliseFunnelSpec(funnel: FunnelSpec | FunnelSpecV1): FunnelSpec {
  const conversionWindow: FunnelSpec['conversionWindow'] =
    'conversionWindow' in funnel
      ? funnel.conversionWindow
      : funnel.conversionWindowDays == null
        ? null
        : { value: funnel.conversionWindowDays, unit: 'day' }
  return {
    steps: funnel.steps,
    conversionWindow,
    mode: 'mode' in funnel ? funnel.mode : 'ordered',
    holdConstant: 'holdConstant' in funnel ? funnel.holdConstant : null,
    exclude: 'exclude' in funnel ? funnel.exclude : [],
    measuredAs: 'measuredAs' in funnel ? funnel.measuredAs : 'conversion',
    groupBy: 'groupBy' in funnel ? funnel.groupBy : null,
  }
}

/** `cohort.returnMeasureKey` migrated into a one-element `returnMeasureKeys`; every v2 default filled. */
function normaliseCohortSpec(cohort: CohortSpec | CohortSpecV1): CohortSpec {
  const returnMeasureKeys: MeasureKey[] =
    'returnMeasureKeys' in cohort
      ? cohort.returnMeasureKeys
      : cohort.returnMeasureKey == null
        ? []
        : [cohort.returnMeasureKey]
  return {
    anchorMeasureKey: cohort.anchorMeasureKey,
    returnMeasureKeys,
    cohortGrain: cohort.cohortGrain,
    method: 'method' in cohort ? cohort.method : 'rolling',
    brackets: 'brackets' in cohort ? cohort.brackets : null,
    horizon: cohort.horizon,
  }
}

/**
 * The query with every v1 shape migrated and every v2 default made explicit
 * (D42). `serialiseReportQuery` is **lossless up to this normalisation**: a
 * query with no `mode` and one with `mode: 'trend'` produce the same URL and
 * so come back as one value — the property the round-trip tests assert.
 */
export function normaliseReportQuery(query: ReportQueryInput): ReportQuery & { mode: ReportMode } {
  return {
    ...query,
    mode: reportMode(query),
    groupBy: normaliseGroupBy(query.groupBy),
    funnel: query.funnel ? normaliseFunnelSpec(query.funnel) : undefined,
    cohort: query.cohort ? normaliseCohortSpec(query.cohort) : undefined,
  }
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
   * **The seam, stated on the wire.** P7-T1 put `funnel`, `cohort` and
   * `journey` in the query and P7-T2 made them legal; until P7-T3 the mock
   * resolved them to a result with no panels and no series, carrying this
   * warning, rather than silently resolving them as a trend.
   *
   * **P7-T3 resolved all three, so nothing emits this today.** It is kept in
   * the union rather than deleted because it is a *wire* value: a server that
   * has not caught up with a mode this client can ask for needs a way to say
   * so, and a screen that already renders the sentence handles that server
   * without a release. Deleting it would make the honest answer unrepresentable
   * and push a partial server towards an empty chart instead.
   */
  | 'mode-not-resolved'
  /**
   * **A funnel counted events instead of following subjects, and says so.**
   *
   * A funnel's real question is *of the people who did A, how many went on to
   * do B* — it follows one subject down the rungs. That is only possible when
   * every rung's population names the same kind of subject
   * (`reporting/subjects.ts`). A rung over `daily-snapshots` names nobody, and
   * a funnel mixing rider rungs with captain rungs follows two different
   * populations, so neither can be followed.
   *
   * Rather than refuse the query — `planQuery` deliberately does not, because
   * a count-to-count funnel is still a legitimate question — the resolver
   * counts each rung's population over the window and **admits on the wire that
   * the conversion between them is a ratio of two totals, not a rate at which
   * people progressed.** Without this the same picture would carry two very
   * different meanings and nothing on screen would separate them.
   */
  | 'funnel-counted-not-followed'

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
  /**
   * **`mode: 'cohort'` only — the denominators.** One per bucket, aligned to
   * `buckets`, in the same order.
   *
   * A retention matrix is percentages, and a percentage of an unstated base is
   * the exact defect R5-15 exists to prevent: *38 % retained* over a cohort of
   * 1 400 and over a cohort of 6 are not the same claim, and a matrix that
   * shows only the percentage lets an operator quote the second as if it were
   * the first.
   *
   * It is a field on the result rather than a series because it is not a
   * measurement over time — it is the size of each row, and there is no
   * bucket-by-bucket reading of it. `undefined` in every other mode, which is
   * how a renderer tells "not a cohort" from "a cohort of nobody".
   *
   * A cohort's overall survival rate is deliberately **not** here: it is
   * `Σ(size × M1 %) / Σ size`, arithmetic the renderer does over two things it
   * already holds, and a second copy of it on the wire is a second number that
   * can disagree with the matrix above it.
   */
  cohortSizes?: number[]
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
  /* ── per-mode legality, P7-T2. Same shape, same component, no new control. ── */
  /** A funnel with fewer than two rungs is a number, not a funnel. */
  | 'funnel-needs-steps'
  | 'funnel-too-many-steps'
  /** Two identical rungs convert at 100 % by construction and measure nothing. */
  | 'funnel-duplicate-step'
  | 'cohort-needs-anchor'
  /**
   * The anchor — or the return event — names a store whose rows are not about a
   * person, so there is nobody to put in a cohort and nobody to still be here
   * in month three. `reporting/subjects.ts` is the table this reads.
   */
  | 'cohort-anchor-not-subject'
  /** The window is shorter than the horizon it is asked to show. */
  | 'cohort-window-too-short'
  | 'cohort-horizon-out-of-range'
  /** No engine here buckets retention by day or week. See `CohortGrain`. */
  | 'cohort-grain-unavailable'
  | 'journey-needs-root'
  /** A journey follows a subject forward. A store that names nobody has no path. */
  | 'journey-root-not-subject'
  | 'journey-depth-out-of-range'
  /**
   * The mode, not the operator, decides the grain. A funnel, a cohort matrix
   * and a journey each collapse the window to one period; their x-axis is
   * steps, cohort age and path depth, none of which is a calendar.
   */
  | 'mode-fixes-grain'

export interface QueryViolation {
  code: QueryViolationCode
  /** Which control the reason belongs beside. */
  field:
    | 'measures'
    | 'groupBy'
    | 'filters'
    | 'window'
    | 'grain'
    | 'chartType'
    /* The mode switcher itself, and the three per-mode configurations. Each is
       a control on the panel, so each is somewhere a reason can sit. */
    | 'mode'
    | 'funnel'
    | 'cohort'
    | 'journey'
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

  /* ── mode, P7-T2 ──────────────────────────────────────────────────────── */

  /**
   * The mode this plan was computed for, resolved. Echoed so a plan held beside
   * a query that has since changed mode is detectable without re-deriving it.
   */
  mode: ReportMode
  /**
   * The cohort-grain switcher's options. Populated in `'cohort'` mode and empty
   * in every other, because a control that is not on screen has no options —
   * not options that are all illegal, which reads as a broken control.
   */
  cohortGrains: OptionLegality<CohortGrain>[]
  /**
   * Cohort mode: the age-interval column headers, `M0 … M{horizon}`.
   *
   * **This is the handoff to `reporting/cohorts.ts` and it is deliberately its
   * vocabulary, not a new one** — `buildCohortMatrix(entities, joined, active,
   * intervals)` takes exactly this array as its fourth argument. The retention
   * maths does not move; the plan hands it its columns. `[]` in every other
   * mode.
   */
  cohortIntervals: string[]
  /**
   * Funnel mode: the ordered step measure keys, resolved against the catalogue.
   * The renderer draws them in this order and computes drop-off between
   * neighbours. `[]` in every other mode.
   */
  funnelStepKeys: MeasureKey[]
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
   * When the report was last RUN, which is not when it was last edited: the
   * library's `Last run` column (T9.13). `null` on a report saved and never
   * opened since, and blank in the cell rather than a guess (O9).
   */
  lastRunAt: IsoDateTime | null
  /**
   * **Derived, read-only.** A reverse index, and the reason §11.3's delete
   * confirmation can name the dashboards it will affect (AC-868).
   */
  pinnedToDashboardIds: string[]
}

/**
 * How many columns of the board grid one tile occupies — Amplitude §C5's
 * different-sized tiles, and the reason a board reads as a composition rather
 * than as a uniform 2-up.
 *
 * **Two values, not a pixel geometry.** §11.2 costed a persisted geometry per
 * breakpoint and refused it; this is one enum on the tile, the grid decides
 * what it means at each width, and nothing has to be re-laid-out when the
 * breakpoints move. `'full'` spans the row at every width the grid is more
 * than one column wide; below that every tile is already full width, so the
 * value is inert rather than wrong.
 */
export type DashboardTileSpan = 'half' | 'full'

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
  /**
   * §C5's tile size. **Absent means `'half'`**, on the wire and in a record
   * saved before this field existed — the same additive contract
   * `ReportQuery.mode` states, for the same reason: every board an operator has
   * already arranged must keep the arrangement it had. Read it through
   * `tileSpan(tile)`, never directly.
   */
  span?: DashboardTileSpan
}

/** The **one** reader of `tile.span`. See `DashboardTile.span`. */
export function tileSpan(tile: Pick<DashboardTile, 'span'>): DashboardTileSpan {
  return tile.span ?? 'half'
}

export interface Dashboard {
  id: string
  name: string
  /**
   * **User-authored, and the same field `SavedReport` already carries.** A
   * report can say what question it answers; without this a board could not say
   * what it is for, and the list had nothing to show but a name and a count.
   * `null` is a board whose author did not write one — never an empty string,
   * so "not written" and "written and then cleared" are the same state.
   */
  description: string | null
  ownerId: string
  tiles: DashboardTile[]
  /**
   * **§C4's board-level range — the window every tile answers at.**
   *
   * A board without one is nine unrelated windows: each tile renders whatever
   * its report happened to be saved with, and two tiles side by side can be a
   * week and a year without saying so. Amplitude's dashboards carry their own
   * period control and every tile answers to it; this is that control's
   * storage.
   *
   * **`null` is a first-class value and the default**, and it means *every tile
   * answers with its own saved window*. It is not "unset": a board whose author
   * has deliberately not imposed a range and a board that has never had one are
   * the same board, and the control says so in those words rather than showing
   * a range nothing is using.
   *
   * A tile whose report **cannot legally run at this window** — a cohort whose
   * horizon no longer fits, a grain that would exceed the bucket cap — keeps
   * its own and **says so on the tile**. Silently narrowing a matrix to fewer
   * columns than its report declares is the class of defect this module refuses
   * everywhere else.
   */
  range: ReportWindow | null
  /**
   * **§C4's `Add Filter`, in the existing vocabulary.**
   *
   * The same `FilterSpec` an index table emits and the same one
   * `ReportQuery.filters` carries — **there is no second filter model**
   * (AC-814), and `columnFilter.ts` is explicit that there must never be one.
   *
   * It applies to a tile **only where the tile's report can legally take it**:
   * `QueryPlan.legalFilterFields` is the intersection of every measure's
   * `filterableFields`, and a board filter on `trip.kind` means nothing to a
   * report counting subscriptions. A tile that cannot take one **names the
   * field it dropped** rather than rendering numbers that quietly ignore the
   * filter the operator can see above them.
   */
  filters: FilterSpec[]
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

/* Alert rules moved to `alert.ts` (D42) — see the re-export near the top of this file. */

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
