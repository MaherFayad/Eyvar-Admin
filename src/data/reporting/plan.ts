/**
 * The legality engine — §3.5, §6.2 and §7, as one pure function.
 *
 * ## Why this is not inside the client
 *
 * Almost every acceptance criterion in §7 is about what happens **before** a
 * request: AC-809 (*no query runs until `Run`*), AC-816 (*a finer grain is
 * disabled in place with a reason*), AC-817 (*more than 400 buckets leaves the
 * grain disabled and no request issued*), AC-836 (*an illegal chart type is
 * present and disabled, never hidden*). A rule that only exists on the server
 * cannot disable a control, and a rule implemented twice — once here for the
 * control and once there for the response — is a rule that will disagree with
 * itself. So the legality rules are one synchronous function over the
 * catalogue, and `reports.run` calls the same function before it resolves
 * anything.
 *
 * That is also what makes AC-825 cheap: a hand-edited URL asking for a stock
 * and a flow on one axis is refused by the same code path that greys out the
 * option in the picker, and gets the same reason.
 *
 * ## The rendering rule, and where it would change
 *
 * `panelCount` is *measures × groups*. **Two series share a y-axis if and only
 * if they share a panel, and the only pair that shares one is a measure and its
 * own period comparison.** That is R4-1 — *"everything multi-series renders as
 * small multiples… this covers both multi-series cases, not just the one the
 * spec raised"* — expressed as arithmetic rather than as a rendering
 * instruction, so a screen cannot accidentally overlay two measures.
 *
 * If §12 **D-12** is ever signed and a categorical palette is minted, the
 * change is `panelIdFor` in `resolve.ts` returning one id for two measures.
 * Nothing else moves: not this file's rules, not a type, not a saved report.
 *
 * ## Per-mode legality — P7-T2
 *
 * The same argument, one level up. `mode` is in the query as of P7-T1, and each
 * mode has a shape it cannot be asked in: **a funnel needs ordered steps, a
 * cohort needs an anchor event and a window long enough to reach its horizon, a
 * journey needs a root.** `trend` and `table` keep today's rules exactly.
 *
 * Every one of those refusals comes back as a `QueryViolation` in the shape
 * `LegalityOptions.tsx` already renders — `{ code, field, reasonKey,
 * reasonParams }` — so the component needs no change and did not get one. The
 * new `field` values (`mode`, `funnel`, `cohort`, `journey`) say which control
 * the sentence belongs beside; that is the only thing that grew.
 *
 * Two rules the modes impose on controls that already existed, rather than on
 * new ones:
 *
 *   **the mode picks the chart** — a funnel is a bar cascade and a cohort is a
 *   heat matrix, so `MODE_CHART` fixes it and the other three options are
 *   disabled in place with the reason, never removed (AC-836);
 *
 *   **the mode picks the grain** where its x-axis is not a calendar. A funnel's
 *   x-axis is its steps, a cohort's is age, a journey's is depth. Each collapses
 *   the window to one period, which `grain: 'none'` already means.
 */

import { GRAIN_RANK, pairRefusal, type Dimension, type Measure, type MeasureKey } from '../types/measure'
import { REPORT_GROUP_BY_MAX, normaliseReportQuery, reportMode } from '../types/report'
import type {
  ChartType,
  CohortGrain,
  FunnelMeasuredAs,
  OptionLegality,
  QueryPlan,
  QueryViolation,
  ReportGrain,
  ReportMode,
  ReportQuery,
  TransformLegality,
} from '../types/report'
import type { IsoDate } from '../types/common'
import { comparisonWindow, countBuckets, resolveWindow } from './buckets'
import { bracketsOverlap } from './cohorts'
import { subjectKindOf } from './subjects'
import { formulaUnit, type FormulaError, type FormulaRefs, type FormulaViolationCode } from './formula'

/* ─────────────────────────── the constants ─────────────────────────────── */

/** §6.1. *"The third series is where a chart stops answering a question and starts being a dashboard."* */
export const MAX_MEASURES = 2

/** §3.5. Per series, and it is counted before a request is issued (AC-817). */
export const MAX_BUCKETS = 400

/** §7.4. The ninth group and beyond fold into one `Other` series, which is always rendered. */
export const MAX_GROUPS = 8

/** §7.2's hard ceiling. A pie with seven parts is a legend with a chart attached. */
export const PIE_MAX_PARTS = 6

/**
 * §7.2 / §3 / AC-839, AC-1115. A share of these three units is arithmetic
 * nonsense wearing a chart — a pie of percentages, a stack of ratios — under
 * every combination that would otherwise be legal. Shared by `pie` and the two
 * stacked forms rather than declared twice.
 */
const SHARE_ILLEGAL_UNITS = new Set(['percent', 'ratio', 'rating'])

/** All nine (02 §2.8 / G8), always offered. An illegal one is disabled in place, never hidden (D9 CQ-3). */
export const CHART_TYPES: ChartType[] = [
  'line',
  'area',
  'bar',
  'stacked-bar',
  'stacked-100',
  'horizontal-bar',
  'pie',
  'kpi',
  'table',
]

/** §2.5's ceiling: `measures × segments × groups`. 24 with a comparison, but the query-time count is unhalved. */
export const MAX_CURRENT_SERIES = 12

/** Offered in this order. `'hour'` is here so its reason is readable, not so it works (R4-1 §4.4). */
export const GRAINS: ReportGrain[] = ['hour', 'day', 'week', 'month', 'none']

/* ─────────────────────── the per-mode constants ────────────────────────── */

/**
 * §P7-T2. **A funnel with fewer than two rungs is a number, not a funnel** —
 * there is no conversion between one step and nothing.
 */
export const MIN_FUNNEL_STEPS = 2

/**
 * `ReportStudio.tsx:210` refused a seventh event (`if (events.length >= 6)
 * return`). Carried over rather than reinvented: six rungs is already a funnel
 * whose last bar is a rounding error, and the number came from the screen that
 * had operators in front of it.
 */
export const MAX_FUNNEL_STEPS = 6

/**
 * How far a cohort matrix reaches: `M0 … M12`. Twelve is where a retention
 * matrix stops being a matrix and becomes a spreadsheet — the same argument
 * `MAX_GROUPS` makes about eight series, applied to columns.
 */
export const MAX_COHORT_HORIZON = 12

/** `M0` alone is a column of 100 %s. A cohort report reaches at least `M1`. */
export const MIN_COHORT_HORIZON = 1

/**
 * All three offered, and two disabled with a reason rather than removed.
 * See `CohortGrain` for why only `'month'` computes today.
 */
export const COHORT_GRAINS: CohortGrain[] = ['day', 'week', 'month']

/**
 * Which cohort grains `reporting/cohorts.ts` can actually compute. **This
 * constant is the wiring**: the `day` and `week` engines exist and are
 * tested (`gapDiff`, `cohorts.test.ts`), so all three are reachable; if a
 * future grain has no engine, it is added to `COHORT_GRAINS` and left out of
 * this list, exactly as `month` alone used to be.
 */
const COMPUTED_COHORT_GRAINS: readonly CohortGrain[] = ['day', 'week', 'month']

/** A journey deeper than this is a diagram nobody reads. `ReportStudio` drew two. */
export const MAX_JOURNEY_DEPTH = 5
export const MIN_JOURNEY_DEPTH = 1

/**
 * **The mode decides the chart, and in four of five cases the operator does
 * not.** A funnel is a cascade of bars, a cohort is a heat matrix, a journey is
 * a tree, a data table is a table. Only `trend` puts the choice in the
 * operator's hands, and §7.1's matrix is about that mode.
 *
 * `null` means "the operator chooses" — `trend`, and only `trend`.
 */
const MODE_CHART: Record<ReportMode, ChartType | null> = {
  trend: null,
  funnel: 'bar',
  table: 'table',
  cohort: 'table',
  journey: 'table',
}

/**
 * §3.5. A cohort's x-axis is age, a journey's is depth, neither a calendar, so
 * each collapses the window to `grain: 'none'`. A funnel's cascade and its
 * time-to-convert do the same — but `conversion-over-time` buckets BY entry
 * date, and `resolveFunnelOverTime` is already grain-aware, so that one shape
 * keeps the grain the way `table` does.
 */
function modeFixesGrainToNone(mode: ReportMode, funnelMeasuredAs: FunnelMeasuredAs | undefined): boolean {
  if (mode === 'funnel') return funnelMeasuredAs !== 'conversion-over-time'
  return mode === 'cohort' || mode === 'journey'
}

/**
 * §7.3 / 02 §3. *Nearest* is defined, not inferred, and v2 extends the same
 * table rather than replacing it: `area → line → bar → table`,
 * `stacked-bar → bar → table`, `stacked-100 → stacked-bar → table`,
 * `horizontal-bar → bar → table`, `kpi → table` — each a chain, walked in order
 * until a legal one is found (AC-1119).
 */
const NEAREST: Record<ChartType, ChartType[]> = {
  line: ['bar', 'table'],
  area: ['line', 'bar', 'table'],
  bar: ['table'],
  'stacked-bar': ['bar', 'table'],
  'stacked-100': ['stacked-bar', 'table'],
  'horizontal-bar': ['bar', 'table'],
  pie: ['bar', 'table'],
  kpi: ['table'],
  table: [],
}

export interface Catalogue {
  measures: readonly Measure[]
  dimensions: readonly Dimension[]
}

/* ─────────────────────── switching mode, legally ───────────────────────── */

/**
 * **The query the operator gets when they change the question they are asking.**
 *
 * Switching mode is not editing a field: four of the five modes decide the
 * chart and three of them collapse the grain, so a raw `{ ...query, mode }`
 * produces a query the planner immediately refuses — a funnel still asking for
 * a daily line — and the operator's first sight of a new mode is two
 * violations they did not cause. §3.2's rule is to **validate by disabling the
 * primary, not by an error after the fact**; this is the same rule one level
 * up.
 *
 * It reads `MODE_CHART` and `modeFixesGrainToNone` — the same rules the
 * legality above is written from — so the switch and the refusal cannot
 * disagree. A screen that hardcoded *"a funnel is bars"* would be a second copy
 * of that rule, and the day a mode's chart changed the two would drift.
 *
 * **Nothing already configured is thrown away.** A funnel's steps survive a
 * trip through `cohort` and back, because an operator comparing two shapes of
 * one question should not have to retype it — and because `serialiseReportQuery`
 * carries all three configurations regardless of which one the mode reads.
 * The only fields that change are the ones the new mode decides.
 */
export function applyReportMode(query: ReportQuery, mode: ReportMode): ReportQuery {
  const next: ReportQuery = { ...query, mode }

  const chart = MODE_CHART[mode]
  if (chart !== null) next.chartType = chart
  if (modeFixesGrainToNone(mode, next.funnel?.measuredAs)) next.grain = 'none'
  /* Coming BACK to a series mode from one that collapsed the grain: `none` is
     a legal grain and a legitimate choice, so it is left alone. The operator
     picks a grain in a control that is now enabled, which is the whole point
     of disabling it in place rather than hiding it. */

  /* An unstarted configuration, not an empty one. `FunnelSpec` with no steps
     reads as "no rungs chosen yet" and the planner says exactly that
     (`funnel-needs-steps`); leaving `funnel` undefined would render a panel
     with no controls to start from. The defaults are the ones the constants
     above already justify, and none of them is a business rule invented here. */
  if (mode === 'funnel' && !next.funnel) {
    next.funnel = {
      steps: [],
      conversionWindow: null,
      mode: 'ordered',
      holdConstant: null,
      exclude: [],
      measuredAs: 'conversion',
      groupBy: null,
    }
  }
  if (mode === 'cohort' && !next.cohort) {
    next.cohort = {
      anchorMeasureKey: null,
      returnMeasureKeys: [],
      /* The only grain the retention engine measures age at. The other two are
         offered by the picker and disabled with the reason (`CohortGrain`). */
      cohortGrain: 'month',
      method: 'rolling',
      brackets: null,
      /* `M0…M3` — the same four columns the seeded cohort report uses, and the
         narrowest matrix that is still a matrix. */
      horizon: 3,
    }
  }
  if (mode === 'journey' && !next.journey) {
    next.journey = { rootMeasureKey: null, depth: 2 }
  }

  return next
}

/* ─────────────────────────── the planner ───────────────────────────────── */

/**
 * Resolve everything the panel needs to disable a control with a reason, and
 * everything `reports.run` needs to refuse a query.
 *
 * `today` is a parameter. There is no ambient clock in `src/data/`.
 */
export function planQuery(query: ReportQuery, catalogue: Catalogue, today: IsoDate): QueryPlan {
  /* A public entry point: a stored saved report, a URL or a test may still
     hold a v1 shape (`groupBy` a bare dimension or `null`, a funnel with no
     `exclude`). `resolveReport` defends the same way — normalise once, at the
     boundary, so every rule below can assume the v2 shape (AC-1100). */
  query = normaliseReportQuery(query)

  const violations: QueryViolation[] = []
  const byKey = new Map(catalogue.measures.map((m) => [m.key, m]))

  /* ── the mode, first, because four of the blocks below depend on it ───── */
  const mode = reportMode(query)
  /* `trend` and `table` are one shape asked two ways: the same measures, the
     same grain, the same groups, drawn as a chart or listed as rows. Everywhere
     below that says "today's rules", this is the predicate that says so. */
  const isSeriesMode = mode === 'trend' || mode === 'table'

  /* ── measures ─────────────────────────────────────────────────────────── */
  /* Which keys this mode measures over, and which control owns the reason when
     one of them does not resolve. In a funnel the steps are the measures; in a
     cohort the anchor and the return event are; in a journey the root is. They
     all feed the dimension and filter-field intersections below identically,
     which is why there is one list and not four code paths. */
  const measureSource = measureKeysForMode(query, mode)

  const measures: Measure[] = []
  for (const key of measureSource.keys) {
    const m = byKey.get(key)
    if (!m) {
      violations.push({
        code: 'unknown-measure',
        field: measureSource.field,
        reasonKey: 'rb.violation.unknownMeasure',
        reasonParams: { key },
      })
      continue
    }
    measures.push(m)
  }

  /* §6.1's cap and §6.2's pairing rule are about **two series on one canvas**,
     which is the series modes' question. A five-rung funnel is not five series
     and is not capped at two; its own ceiling is `MAX_FUNNEL_STEPS`. */
  if (isSeriesMode) {
    if (query.measures.length === 0) {
      violations.push({
        code: 'no-measure',
        field: 'measures',
        reasonKey: 'rb.violation.noMeasure',
        reasonParams: {},
      })
    }
    if (query.measures.length > MAX_MEASURES) {
      violations.push({
        code: 'too-many-measures',
        field: 'measures',
        reasonKey: 'rb.violation.tooManyMeasures',
        reasonParams: { max: MAX_MEASURES },
      })
    }
  }

  /* §6.2's refusal, applied wherever a pair arrives from — the picker, a saved
     report, or a hand-edited URL. AC-825. This is about **two raw measures
     sharing one y-axis** (R4-1). A formula produces one series with one unit
     that `formulaUnit` below decides for itself — 02 §2.2's table legalises
     `A / B` across units on purpose, a currency over a count, so the raw pair
     must not also refuse it (WP-1.4b). `Show A and B too` redraws the operands
     as dashed context series from a view-only option (§2.2), never from
     `ReportQuery`, so it never reaches this planner and needs no rule here. */
  const [first, second] = measures
  if (isSeriesMode && first && second && !query.formula) {
    const refusal = pairRefusal(first, second)
    if (refusal === 'different-temporality') {
      violations.push({
        code: 'mixed-temporality',
        field: 'measures',
        reasonKey: 'rb.violation.mixedTemporality',
        reasonParams: {
          a: first.labelKey,
          b: second.labelKey,
          aTemporality: first.temporality,
          bTemporality: second.temporality,
        },
      })
    } else if (refusal !== null) {
      violations.push({
        code: 'mixed-unit',
        field: 'measures',
        reasonKey: 'rb.violation.mixedUnit',
        reasonParams: { a: first.unit, b: second.unit },
      })
    }
  }

  /* G1 / AC-1120: `aggregate` is only legal when it is one of the measure's own
     `bucketAggregateOptions`. Read off `query.measures` directly rather than
     the mode-generic `measureSource` above — a funnel step is not a `MeasureRef`
     and has no aggregate to check. */
  if (isSeriesMode) {
    for (const ref of query.measures) {
      if (ref.aggregate === undefined) continue
      const options = byKey.get(ref.key)?.bucketAggregateOptions ?? []
      if (!options.includes(ref.aggregate)) {
        violations.push({
          code: 'illegal-aggregate',
          field: 'measures',
          reasonKey: 'rb.violation.illegalAggregate',
          reasonParams: { key: ref.key, aggregate: ref.aggregate },
        })
      }
    }
  }

  /* G5 / AC-1122: a `performed` segment needs the server support the
     catalogue's `supportsPerformed` declares. Absent means `false` — same
     conservative default `Measure.supportsPerformed` documents. */
  if (isSeriesMode) {
    for (const segment of query.segments ?? []) {
      if (segment.kind !== 'inline' || !segment.performed) continue
      if (byKey.get(segment.performed.measureKey)?.supportsPerformed !== true) {
        violations.push({
          code: 'segment-performed-unsupported',
          field: 'segments',
          reasonKey: 'rb.violation.segmentPerformedUnsupported',
          reasonParams: { measure: segment.performed.measureKey },
        })
      }
    }
  }

  /* ── window ───────────────────────────────────────────────────────────── */
  const window = resolveWindow(query.window, today)
  if (window.from > window.to) {
    violations.push({
      code: 'window-inverted',
      field: 'window',
      reasonKey: 'rb.violation.windowInverted',
      reasonParams: { from: window.from, to: window.to },
    })
  }

  /* ── dimensions and filter fields: the intersection, always ───────────── */
  const legalDimensions = intersect(measures.map((m) => m.dimensions.map((d) => d.key)))
  const legalFilterFields = intersect(measures.map((m) => m.filterableFields))

  /* G4: up to two levels. Each is checked against the same intersection a
     single level always was — a hand-edited second level is no more legal
     than a hand-edited first one. */
  for (const dimension of query.groupBy) {
    if (!legalDimensions.includes(dimension)) {
      violations.push({
        code: 'illegal-dimension',
        field: 'groupBy',
        reasonKey: 'rb.violation.illegalDimension',
        reasonParams: { dimension },
      })
    }
  }

  /* WP-2.6b, gap 3: `REPORT_GROUP_BY_MAX` is the rail's cap, not a type
     constraint, so a hand-edited URL can still hold a third level. Refused the
     same way a third measure is (`too-many-measures`), and the rail's own
     "add a third split" control reads this reason rather than inventing one. */
  if (query.groupBy.length > REPORT_GROUP_BY_MAX) {
    violations.push({
      code: 'too-many-group-levels',
      field: 'groupBy',
      reasonKey: 'rb.violation.tooManyGroupLevels',
      reasonParams: { max: REPORT_GROUP_BY_MAX },
    })
  }

  for (const f of query.filters) {
    if (!legalFilterFields.includes(f.field)) {
      violations.push({
        code: 'no-shared-filter-field',
        field: 'filters',
        reasonKey: 'rb.violation.filterFieldNotShared',
        reasonParams: { field: f.field },
      })
    }
  }

  /* ── grain ────────────────────────────────────────────────────────────── */
  const coarsestMin = measures.length
    ? Math.max(...measures.map((m) => GRAIN_RANK[m.minGrain]))
    : GRAIN_RANK.day
  const minGrainName =
    measures.length === 0
      ? 'day'
      : measures.reduce((worst, m) => (GRAIN_RANK[m.minGrain] > GRAIN_RANK[worst.minGrain] ? m : worst))
          .minGrain

  /* A mode whose x-axis is not a calendar collapses the window to one period.
     Every other grain is offered and disabled with the reason — the operator
     sees that the control exists and why it is off, rather than watching it
     disappear when they switch mode (D9 CQ-3, AC-816). */
  const grainFixed = modeFixesGrainToNone(mode, query.funnel?.measuredAs)

  const grains: OptionLegality<ReportGrain>[] = GRAINS.map((g) => {
    if (grainFixed) {
      return g === 'none' ? legal(g) : illegal(g, 'rb.grain.modeFixed', { grain: g, mode })
    }
    if (g === 'none') return legal(g)
    if (GRAIN_RANK[g] < coarsestMin) {
      return illegal(g, 'rb.grain.belowMin', { grain: g, minGrain: minGrainName })
    }
    const n = countBuckets(window.from, window.to, g)
    if (n > MAX_BUCKETS) {
      return illegal(g, 'rb.grain.tooManyBuckets', { grain: g, buckets: n, max: MAX_BUCKETS })
    }
    return legal(g)
  })

  const grainOption = grains.find((o) => o.value === query.grain)
  if (grainOption && !grainOption.legal) {
    violations.push({
      code: GRAIN_VIOLATION[grainOption.reasonKey ?? 'rb.grain.belowMin'] ?? 'grain-below-min',
      field: 'grain',
      reasonKey: grainOption.reasonKey ?? 'rb.grain.belowMin',
      reasonParams: grainOption.reasonParams,
    })
  }

  const bucketCount = countBuckets(window.from, window.to, query.grain)

  /* §2.6 / AC-1112: a fixed comparison window must produce the same bucket
     count, at this grain, as the primary window — the primitive
     `buckets.test.ts` proves the two counts genuinely disagree for a
     mismatched window; this is the refusal built on it. `reasonParams.required`
     is the current window's count, so the date popover can state exactly how
     many days/weeks/months the fixed window needs to be. */
  if (isSeriesMode && typeof query.periodComparison === 'object' && query.periodComparison.kind === 'fixed') {
    const comparison = comparisonWindow(window, query.periodComparison)
    const comparisonBucketCount = countBuckets(comparison.from, comparison.to, query.grain)
    if (comparisonBucketCount !== bucketCount) {
      violations.push({
        code: 'comparison-length',
        field: 'periodComparison',
        reasonKey: 'rb.violation.comparisonLength',
        reasonParams: { required: bucketCount, got: comparisonBucketCount },
      })
    }
  }

  /* G4: up to two levels. `splitParts` is the product of each level's
     cardinality hint — the catalogue's forecast of how many series the split
     produces, same role the single-level version always played. */
  const groupLevels = query.groupBy.length
  const hasSplit = groupLevels > 0

  /* G3 (§2.3) / WP-2.6b gap 1: each toggle's legality computed exactly once —
     read by the rail to disable the control **before** an illegal state
     exists, and read again below to refuse a hand-edited URL that already
     holds one. `TransformControls` used to carry a second copy of these three
     predicates; it renders this instead now. */
  const transformOptions: TransformLegality = {
    cumulative: !first
      ? illegal('cumulative', 'rb.control.disabled.unstarted', {})
      : first.additive
        ? legal('cumulative')
        : illegal('cumulative', 'rb.control.transform.cumulative.disabled', {}),
    rollingAverage:
      bucketCount < 2
        ? illegal('rollingAverage', 'rb.control.transform.rollingAverage.disabled', { count: bucketCount })
        : legal('rollingAverage'),
    percentOfTotal: hasSplit
      ? legal('percentOfTotal')
      : illegal('percentOfTotal', 'rb.control.transform.percentOfTotal.disabled', {}),
  }
  if (isSeriesMode && query.transform) {
    const { cumulative, rollingAverage, percentOfTotal } = query.transform
    if (cumulative && !transformOptions.cumulative.legal) {
      violations.push({
        code: 'transform-needs-additive',
        field: 'transform',
        reasonKey: transformOptions.cumulative.reasonKey ?? 'rb.control.transform.cumulative.disabled',
        reasonParams: transformOptions.cumulative.reasonParams,
      })
    }
    /* The checkbox's own gate is "at least 2 buckets exist"; this is the
       value-specific rule a clamped `Input` enforces in the UI and a
       hand-edited URL can skip — `rollingAverage` asking for more buckets
       than the window actually holds. */
    if (rollingAverage !== null && rollingAverage > bucketCount) {
      violations.push({
        code: 'transform-needs-buckets',
        field: 'transform',
        reasonKey: 'rb.control.transform.rollingAverage.disabled',
        reasonParams: { count: bucketCount },
      })
    }
    if (percentOfTotal && !transformOptions.percentOfTotal.legal) {
      violations.push({
        code: 'transform-needs-split',
        field: 'transform',
        reasonKey: transformOptions.percentOfTotal.reasonKey ?? 'rb.control.transform.percentOfTotal.disabled',
        reasonParams: transformOptions.percentOfTotal.reasonParams,
      })
    }
  }

  /* ── chart type ───────────────────────────────────────────────────────── */
  const splitParts = hasSplit
    ? query.groupBy.reduce((total, dimension) => total * expectedGroupCount(dimension, catalogue), 1)
    : 1
  const hasSegments = (query.segments ?? []).length > 0
  const modeChart = MODE_CHART[mode]

  const chartTypes =
    modeChart === null
      ? CHART_TYPES.map((c) =>
          chartLegality(c, { measures, groupLevels, hasSplit, splitParts, hasSegments, grain: query.grain, bucketCount }),
        )
      : /* The mode already answered this question. The other three stay on
           screen, disabled, saying which mode decided and what it decided —
           because an option that vanishes teaches nobody the rule (AC-836). */
        CHART_TYPES.map((c) =>
          c === modeChart ? legal(c) : illegal(c, 'rb.chart.modeFixed', { chart: modeChart, mode }),
        )

  const chosen = chartTypes.find((o) => o.value === query.chartType)
  const effectiveChartType = chosen?.legal
    ? query.chartType
    : modeChart ?? nearestLegal(query.chartType, chartTypes)

  /* G5, AC-1113: the series ceiling, counted **before** a request exists.
     `measures × segments × groups`, each folded to at least one so an
     unstarted picker does not read as zero series, and the group term folded
     at `MAX_GROUPS` the same way the fold warning itself will be. Doubling for
     a period comparison is a display fact (§2.6), not part of this ceiling —
     the ceiling is stated in "current series". */
  if (isSeriesMode) {
    const segmentCount = Math.max(1, (query.segments ?? []).length)
    const currentSeriesCount = Math.max(1, measures.length) * segmentCount * Math.min(splitParts, MAX_GROUPS + 1)
    if (currentSeriesCount > MAX_CURRENT_SERIES) {
      violations.push({
        code: 'too-many-series',
        field: 'segments',
        reasonKey: 'rb.violation.tooManySeries',
        reasonParams: { count: currentSeriesCount, max: MAX_CURRENT_SERIES },
      })
    }
  }

  /* G2 / AC-1104…AC-1107: the formula's own grammar and unit rules live in
     `reporting/formula.ts`; this delegates rather than re-checking, and maps
     `FormulaViolationCode` onto `QueryViolationCode` 1:1 (the two unions are
     the same five strings by construction) so the two never drift. The error's
     source position is carried through in `reasonParams` so the field can
     underline exactly where the expression broke. */
  if (isSeriesMode && query.formula && measures[0]) {
    const refs: FormulaRefs = {
      A: {
        unit: measures[0].unit,
        currency: measures[0].currency,
        additive: measures[0].additive,
        temporality: measures[0].temporality,
      },
      B: measures[1]
        ? {
            unit: measures[1].unit,
            currency: measures[1].currency,
            additive: measures[1].additive,
            temporality: measures[1].temporality,
          }
        : undefined,
      hasSplit,
    }
    const result = formulaUnit(query.formula.expression, refs)
    if (!result.ok) {
      violations.push(formulaViolation(result.error))
    }
  }

  /* ── the per-mode configuration ───────────────────────────────────────── */
  const cohortGrains = mode === 'cohort' ? planCohortGrains() : []
  if (mode === 'funnel') violations.push(...funnelViolations(query, byKey))
  if (mode === 'cohort') violations.push(...cohortViolations(query, window, byKey))
  if (mode === 'journey') violations.push(...journeyViolations(query, byKey))

  return {
    violations,
    bucketCount,
    grains,
    chartTypes,
    effectiveChartType,
    chartTypeCoerced: effectiveChartType !== query.chartType,
    legalDimensions,
    legalFilterFields,
    transformOptions,
    /* One panel per measure per group. `splitParts` is the catalogue's hint, so
       this is a forecast — the resolved result is authoritative. It is enough
       to tell the operator "this will draw four panels" before they run it.

       **The other three modes are one panel by construction.** A funnel is one
       cascade, a cohort is one matrix, a journey is one tree; R4-1's small
       multiples answer a question about two y-axes, and none of the three has
       a y-axis in that sense. */
    panelCount: isSeriesMode
      ? Math.max(1, measures.length) * Math.min(splitParts, MAX_GROUPS + 1)
      : 1,
    mode,
    cohortGrains,
    cohortIntervals: mode === 'cohort' ? cohortIntervals(query.cohort?.horizon) : [],
    funnelStepKeys: mode === 'funnel' ? (query.funnel?.steps ?? []).map((s) => s.measureKey) : [],
  }
}

/* ──────────────────────── mode legality ────────────────────────────────── */

/** Which reason maps to which violation code, so the grain block reads as a table. */
const GRAIN_VIOLATION: Record<string, QueryViolation['code']> = {
  'rb.grain.tooManyBuckets': 'too-many-buckets',
  'rb.grain.belowMin': 'grain-below-min',
  'rb.grain.modeFixed': 'mode-fixes-grain',
}

/**
 * The measure keys a mode is asked over, and the control that owns the reason
 * when one of them does not resolve.
 *
 * Deliberately one function and one shape: the dimension intersection, the
 * filter-field intersection and the unknown-measure check are the same rules in
 * all five modes, and a mode that got its own copy of them would be a mode
 * where a filter silently applies to some steps and not others — the exact
 * failure §3.4 refuses.
 */
function measureKeysForMode(
  query: ReportQuery,
  mode: ReportMode,
): { keys: MeasureKey[]; field: QueryViolation['field'] } {
  if (mode === 'funnel') {
    return { keys: (query.funnel?.steps ?? []).map((s) => s.measureKey), field: 'funnel' }
  }
  if (mode === 'cohort') {
    const c = query.cohort
    /* G11: `returnMeasureKeys` is OR-combined and may be several. */
    return {
      keys: [c?.anchorMeasureKey, ...(c?.returnMeasureKeys ?? [])].filter((k): k is MeasureKey => Boolean(k)),
      field: 'cohort',
    }
  }
  if (mode === 'journey') {
    const root = query.journey?.rootMeasureKey
    return { keys: root ? [root] : [], field: 'journey' }
  }
  return { keys: query.measures.map((m) => m.key), field: 'measures' }
}

/** *A funnel needs ordered steps.* The array order **is** the order (`FunnelSpec`). */
function funnelViolations(query: ReportQuery, byKey: Map<MeasureKey, Measure>): QueryViolation[] {
  const out: QueryViolation[] = []
  const spec = query.funnel
  const steps = spec?.steps ?? []

  if (steps.length < MIN_FUNNEL_STEPS) {
    out.push({
      code: 'funnel-needs-steps',
      field: 'funnel',
      reasonKey: 'rb.funnel.needsSteps',
      reasonParams: { steps: steps.length, min: MIN_FUNNEL_STEPS },
    })
  }
  if (steps.length > MAX_FUNNEL_STEPS) {
    out.push({
      code: 'funnel-too-many-steps',
      field: 'funnel',
      reasonKey: 'rb.funnel.tooManySteps',
      reasonParams: { steps: steps.length, max: MAX_FUNNEL_STEPS },
    })
  }

  /* Two rungs with the same population and the same filters convert at 100 %
     by construction. It is not a drop-off of zero; it is a measurement of
     nothing, and it is easy to reach by adding a step and forgetting to change
     it. The **second** occurrence is the one named, because the first is the
     one the operator meant. */
  const seen = new Set<string>()
  steps.forEach((step, index) => {
    const signature = `${step.measureKey}|${JSON.stringify(step.filters ?? [])}`
    if (seen.has(signature)) {
      out.push({
        code: 'funnel-duplicate-step',
        field: 'funnel',
        reasonKey: 'rb.funnel.duplicateStep',
        reasonParams: { key: step.measureKey, position: index + 1 },
      })
      return
    }
    seen.add(signature)
  })

  /* G10 / §5: `sequential`, `holdConstant` and `exclude` all need event-level
     data no store here has — the same footing, gated the same way, unless
     every rung's measure declares `funnelCapabilities` for the one asked. One
     violation, not three: the three options share a control and a query
     asking for more than one gets one reason, not a stack of identical
     sentences. */
  if (spec) {
    const wantsSequential = spec.mode === 'sequential'
    const wantsHoldConstant = spec.holdConstant !== null
    const wantsExclude = spec.exclude.length > 0
    if (wantsSequential || wantsHoldConstant || wantsExclude) {
      const supported = steps.every((step) => {
        const caps = byKey.get(step.measureKey)?.funnelCapabilities
        return (
          (!wantsSequential || caps?.sequential === true) &&
          (!wantsHoldConstant || caps?.holdConstant === true) &&
          (!wantsExclude || caps?.exclude === true)
        )
      })
      if (!supported) {
        out.push({
          code: 'funnel-needs-server',
          field: 'funnel',
          reasonKey: 'rb.funnel.needsServer',
          reasonParams: {},
        })
      }
    }
  }

  return out
}

/**
 * *A cohort needs an anchor event and a window.*
 *
 * The window rule is arithmetic, not policy: a 30-day window holds one calendar
 * month, and one month cannot show an `M6` column. Saying so before the run is
 * the difference between a disabled control with a reason and a matrix of empty
 * cells the operator has to interpret (AC-817's discipline, applied to columns).
 */
function cohortViolations(
  query: ReportQuery,
  window: { from: IsoDate; to: IsoDate },
  byKey: Map<MeasureKey, Measure>,
): QueryViolation[] {
  const out: QueryViolation[] = []
  const spec = query.cohort

  if (!spec || spec.anchorMeasureKey === null) {
    out.push({
      code: 'cohort-needs-anchor',
      field: 'cohort',
      reasonKey: 'rb.cohort.needsAnchor',
      reasonParams: {},
    })
  }
  if (!spec) return out

  /* A cohort is people, and `reporting/subjects.ts` is the table that says
     which stores hold people. A measure that resolves but names none of them
     gets the reason beside the anchor control rather than an empty matrix.
     An UNRESOLVED measure is left alone: `unknown-measure` already named it,
     and two reasons for one mistake is one reason too many. */
  for (const key of [spec.anchorMeasureKey, ...spec.returnMeasureKeys]) {
    if (key === null) continue
    const measure = byKey.get(key)
    if (!measure) continue
    if (subjectKindOf(measure.population.resource) === null) {
      out.push({
        code: 'cohort-anchor-not-subject',
        field: 'cohort',
        reasonKey: 'rb.cohort.anchorNotSubject',
        reasonParams: { measure: measure.labelKey },
      })
    }
  }

  const grainOption = planCohortGrains().find((o) => o.value === spec.cohortGrain)
  if (grainOption && !grainOption.legal) {
    out.push({
      code: 'cohort-grain-unavailable',
      field: 'cohort',
      reasonKey: grainOption.reasonKey ?? 'rb.cohort.grainUnavailable',
      reasonParams: grainOption.reasonParams,
    })
  }

  /* AC-1172: the client already refuses two overlapping `[lo, hi)` brackets
     before they reach state; a hand-edited URL must meet the same refusal
     (§3.5's rule, applied to a control the picker enforces client-side). */
  if (spec.method === 'bracket' && spec.brackets && bracketsOverlap(spec.brackets)) {
    out.push({
      code: 'cohort-brackets-overlap',
      field: 'cohort',
      reasonKey: 'rb.cohort.brackets.overlap',
      reasonParams: {},
    })
  }

  if (spec.horizon < MIN_COHORT_HORIZON || spec.horizon > MAX_COHORT_HORIZON) {
    out.push({
      code: 'cohort-horizon-out-of-range',
      field: 'cohort',
      reasonKey: 'rb.cohort.horizonOutOfRange',
      reasonParams: { horizon: spec.horizon, min: MIN_COHORT_HORIZON, max: MAX_COHORT_HORIZON },
    })
    return out
  }

  /* `M0 … M{horizon}` is `horizon + 1` periods of the cohort grain. */
  const periods = countBuckets(window.from, window.to, spec.cohortGrain)
  const needed = spec.horizon + 1
  if (periods < needed) {
    out.push({
      code: 'cohort-window-too-short',
      field: 'window',
      reasonKey: 'rb.cohort.windowTooShort',
      reasonParams: { periods, needed, grain: spec.cohortGrain },
    })
  }

  return out
}

/** *A journey needs a root.* */
function journeyViolations(query: ReportQuery, byKey: Map<MeasureKey, Measure>): QueryViolation[] {
  const out: QueryViolation[] = []
  const spec = query.journey

  if (!spec || spec.rootMeasureKey === null) {
    out.push({
      code: 'journey-needs-root',
      field: 'journey',
      reasonKey: 'rb.journey.needsRoot',
      reasonParams: {},
    })
  }
  if (!spec) return out

  /* Same rule as the cohort anchor, same table, same reason to state it before
     a request exists: a journey follows one subject forward, and a store whose
     rows name nobody has no forward. */
  const root = spec.rootMeasureKey === null ? null : byKey.get(spec.rootMeasureKey) ?? null
  if (root && subjectKindOf(root.population.resource) === null) {
    out.push({
      code: 'journey-root-not-subject',
      field: 'journey',
      reasonKey: 'rb.journey.rootNotSubject',
      reasonParams: { measure: root.labelKey },
    })
  }

  if (spec.depth < MIN_JOURNEY_DEPTH || spec.depth > MAX_JOURNEY_DEPTH) {
    out.push({
      code: 'journey-depth-out-of-range',
      field: 'journey',
      reasonKey: 'rb.journey.depthOutOfRange',
      reasonParams: { depth: spec.depth, min: MIN_JOURNEY_DEPTH, max: MAX_JOURNEY_DEPTH },
    })
  }

  return out
}

/** All three offered; the two the engine cannot measure are disabled with the reason. */
function planCohortGrains(): OptionLegality<CohortGrain>[] {
  return COHORT_GRAINS.map((g) =>
    COMPUTED_COHORT_GRAINS.includes(g)
      ? legal(g)
      : illegal(g, 'rb.cohort.grainUnavailable', { grain: g }),
  )
}

/**
 * `['M0', 'M1', … 'M{horizon}']` — **`buildCohortMatrix`'s fourth argument, in
 * its own vocabulary.**
 *
 * The retention maths does not move for P7. `reporting/cohorts.ts` already
 * computes a matrix from `(joinedAt, lastActiveAt)` at these exact interval
 * keys and is already tested; the plan's job is to hand it its columns and to
 * refuse, in advance, a horizon the window cannot reach.
 *
 * Clamped rather than trusted: an out-of-range horizon is already a violation
 * above, and generating ten thousand column headers for a hand-edited URL on
 * the way to reporting that violation is how a legality check becomes a hang.
 */
export function cohortIntervals(horizon: number | undefined): string[] {
  const n = Math.min(Math.max(Math.trunc(horizon ?? MIN_COHORT_HORIZON), 0), MAX_COHORT_HORIZON)
  return Array.from({ length: n + 1 }, (_, i) => `M${i}`)
}

/* ───────────────────────── chart legality ──────────────────────────────── */

interface ChartContext {
  measures: Measure[]
  /** G4: 0, 1 or 2. Only `stacked-bar`, `stacked-100` and `table` survive two. */
  groupLevels: number
  hasSplit: boolean
  splitParts: number
  hasSegments: boolean
  grain: ReportGrain
  bucketCount: number
}

/** `line`'s three gates (§3), reused as `area`'s first two — "as line" in the table's own words. */
function lineLikeLegality(chart: ChartType, ctx: ChartContext): OptionLegality<ChartType> {
  const { grain, bucketCount, groupLevels } = ctx
  if (groupLevels === 2) {
    return illegal(chart, 'rb.chart.twoLevelsNeedStack', {})
  }
  if (grain === 'none') {
    return illegal(chart, 'rb.chart.lineNeedsGrain', {})
  }
  if (bucketCount < 2) {
    /* Legacy already knows this and says so at `:6774`. */
    return illegal(chart, 'rb.chart.lineNeedsTwoPoints', { buckets: bucketCount })
  }
  return legal(chart)
}

function chartLegality(chart: ChartType, ctx: ChartContext): OptionLegality<ChartType> {
  const { measures, groupLevels, hasSplit, splitParts, hasSegments, grain } = ctx

  /* A table renders the same numbers the chart renders, for every query shape
     in §7.1. It is the floor and it is never illegal (AC-841). */
  if (chart === 'table') return legal(chart)

  if (chart === 'line') return lineLikeLegality(chart, ctx)

  if (chart === 'area') {
    /* AC-1118: "as line, and one measure" — line's own gates first, so a
       two-level split or a bare `grain: 'none'` reports line's reason rather
       than a generic one, then the one gate area adds on top. */
    const base = lineLikeLegality(chart, ctx)
    if (!base.legal) return base
    if (measures.length !== 1) {
      return illegal(chart, 'rb.chart.areaOneMeasure', {})
    }
    return legal(chart)
  }

  if (chart === 'bar') {
    if (groupLevels === 2) {
      return illegal(chart, 'rb.chart.twoLevelsNeedStack', {})
    }
    if (grain === 'none' && !hasSplit) {
      return illegal(chart, 'rb.chart.barNeedsGrainOrSplit', {})
    }
    return legal(chart)
  }

  if (chart === 'stacked-bar' || chart === 'stacked-100') {
    /* AC-1115: additive, a split or two same-unit measures, and none of the
       three share units. `measures.length === 2` stands in for "two same-unit
       measures" because a pair that disagreed on unit already carries
       `mixed-unit` from the pairing rule above — this gate does not repeat it. */
    if (measures.length === 0 || measures.some((m) => !m.additive)) {
      return illegal(chart, 'rb.chart.stackNeedsAdditive', {})
    }
    if (!hasSplit && measures.length !== 2) {
      return illegal(chart, 'rb.chart.stackNeedsParts', {})
    }
    const badUnit = measures.find((m) => SHARE_ILLEGAL_UNITS.has(m.unit))
    if (badUnit) {
      return illegal(chart, 'rb.chart.stackUnit', { unit: badUnit.unit })
    }
    if (chart === 'stacked-100') {
      const parts = hasSplit ? splitParts : measures.length
      if (parts < 2) {
        return illegal(chart, 'rb.chart.stack100NeedsParts', { parts })
      }
    }
    return legal(chart)
  }

  if (chart === 'horizontal-bar') {
    /* AC-1117: "requires grain: 'none' and a split" — bundled with "one
       measure" under the same reason, since a picker with two measures and a
       split is not a shape this chart can draw either. */
    if (!hasSplit || measures.length !== 1) {
      return illegal(chart, 'rb.chart.hbarNeedsSplit', {})
    }
    if (grain !== 'none') {
      return illegal(chart, 'rb.chart.hbarSinglePeriod', {})
    }
    return legal(chart)
  }

  if (chart === 'kpi') {
    /* AC-1116: one measure, no split, no segment — one reason for all three,
       because a KPI tile has no legend to show what the split or segment was. */
    if (measures.length !== 1 || hasSplit || hasSegments) {
      return illegal(chart, 'rb.chart.kpiOneSeries', {})
    }
    return legal(chart)
  }

  /* pie — five gates, and changing any one of them disables it (AC-838). */
  const m = measures.length === 1 ? measures[0] : undefined
  if (!m) {
    return illegal(chart, 'rb.chart.pieOneMeasure', {})
  }
  if (SHARE_ILLEGAL_UNITS.has(m.unit)) {
    return illegal(chart, 'rb.chart.pieUnit', { unit: m.unit })
  }
  if (!m.additive) {
    return illegal(chart, 'rb.chart.pieNotAdditive', {})
  }
  if (!hasSplit) {
    return illegal(chart, 'rb.chart.pieNeedsSplit', {})
  }
  if (grain !== 'none') {
    return illegal(chart, 'rb.chart.pieNeedsSinglePeriod', {})
  }
  if (splitParts > PIE_MAX_PARTS) {
    return illegal(chart, 'rb.chart.pieTooManyParts', { parts: splitParts, max: PIE_MAX_PARTS })
  }
  return legal(chart)
}

/**
 * §7.3. The query changed underneath a legal chart type; fall to the nearest
 * legal one **and say so inline in the chart card** — not a page banner (R5
 * sends critical state there and this is not critical), not a toast (R10: a
 * toast is a transient confirmation and this is a standing condition).
 */
function nearestLegal(from: ChartType, options: OptionLegality<ChartType>[]): ChartType {
  for (const candidate of NEAREST[from]) {
    if (options.find((o) => o.value === candidate)?.legal) return candidate
  }
  return 'table'
}

/* ────────────────────────── formula legality ───────────────────────────── */

/** `FormulaViolationCode` onto `rb.violation.formula*` — 02 §11's naming, one row per code. */
const FORMULA_REASON_KEY: Record<FormulaViolationCode, string> = {
  'formula-parse': 'rb.violation.formulaParse',
  'formula-unknown-ref': 'rb.violation.formulaUnknownRef',
  'formula-unit': 'rb.violation.formulaUnit',
  'formula-needs-additive': 'rb.violation.formulaNeedsAdditive',
  'formula-needs-split': 'rb.violation.formulaNeedsSplit',
}

/**
 * `FormulaError` → `QueryViolation`. The codes are the same five strings on
 * both sides by construction (`FormulaViolationCode` and the formula slice of
 * `QueryViolationCode`), so this is a field reshape, not a lookup — `position`
 * survives into `reasonParams` either way, which is what lets the rail
 * underline the exact character the expression broke on (AC-1104).
 */
function formulaViolation(error: FormulaError): QueryViolation {
  const reasonParams: Record<string, string | number> =
    error.code === 'formula-parse'
      ? { position: error.position, expected: error.expected }
      : { position: error.position, ref: error.ref ?? '' }
  return { code: error.code, field: 'formula', reasonKey: FORMULA_REASON_KEY[error.code], reasonParams }
}

/* ───────────────────────────── helpers ─────────────────────────────────── */

function legal<T extends string>(value: T): OptionLegality<T> {
  return { value, legal: true, reasonKey: null, reasonParams: {} }
}

function illegal<T extends string>(
  value: T,
  reasonKey: string,
  reasonParams: Record<string, string | number>,
): OptionLegality<T> {
  return { value, legal: false, reasonKey, reasonParams }
}

/**
 * The intersection of every measure's list, order preserved from the first.
 *
 * **Zero measures gives an empty list, not "everything."** An unstarted report
 * offers no dimension and no filter field, which is §5.3's rule that every
 * control but the measure picker is disabled in place (AC-807).
 */
function intersect(lists: string[][]): string[] {
  const [first] = lists
  if (!first) return []
  return first.filter((key) => lists.every((l) => l.includes(key)))
}

/** The catalogue's cardinality hint for a dimension. `1` when it is unknown. */
function expectedGroupCount(dimensionKey: string, catalogue: Catalogue): number {
  return catalogue.dimensions.find((d) => d.key === dimensionKey)?.cardinalityHint ?? 1
}
