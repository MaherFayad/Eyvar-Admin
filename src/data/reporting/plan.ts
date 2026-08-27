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
 */

import { GRAIN_RANK, pairRefusal, type Dimension, type Measure } from '../types/measure'
import type {
  ChartType,
  OptionLegality,
  QueryPlan,
  QueryViolation,
  ReportGrain,
  ReportQuery,
} from '../types/report'
import type { IsoDate } from '../types/common'
import { countBuckets, resolveWindow } from './buckets'

/* ─────────────────────────── the constants ─────────────────────────────── */

/** §6.1. *"The third series is where a chart stops answering a question and starts being a dashboard."* */
export const MAX_MEASURES = 2

/** §3.5. Per series, and it is counted before a request is issued (AC-817). */
export const MAX_BUCKETS = 400

/** §7.4. The ninth group and beyond fold into one `Other` series, which is always rendered. */
export const MAX_GROUPS = 8

/** §7.2's hard ceiling. A pie with seven parts is a legend with a chart attached. */
export const PIE_MAX_PARTS = 6

/** §7.2 / AC-839. A pie of these is arithmetic nonsense wearing a chart, under every other combination. */
const PIE_ILLEGAL_UNITS = new Set(['percent', 'ratio', 'rating'])

/** All four, always offered. An illegal one is disabled in place, never hidden (D9 CQ-3). */
export const CHART_TYPES: ChartType[] = ['line', 'bar', 'pie', 'table']

/** Offered in this order. `'hour'` is here so its reason is readable, not so it works (R4-1 §4.4). */
export const GRAINS: ReportGrain[] = ['hour', 'day', 'week', 'month', 'none']

/** §7.3. *Nearest* is defined, not inferred: line → bar → table, and pie → bar. */
const NEAREST: Record<ChartType, ChartType[]> = {
  line: ['bar', 'table'],
  bar: ['table'],
  pie: ['bar', 'table'],
  table: [],
}

export interface Catalogue {
  measures: readonly Measure[]
  dimensions: readonly Dimension[]
}

/* ─────────────────────────── the planner ───────────────────────────────── */

/**
 * Resolve everything the panel needs to disable a control with a reason, and
 * everything `reports.run` needs to refuse a query.
 *
 * `today` is a parameter. There is no ambient clock in `src/data/`.
 */
export function planQuery(query: ReportQuery, catalogue: Catalogue, today: IsoDate): QueryPlan {
  const violations: QueryViolation[] = []
  const byKey = new Map(catalogue.measures.map((m) => [m.key, m]))

  /* ── measures ─────────────────────────────────────────────────────────── */
  const measures: Measure[] = []
  for (const ref of query.measures) {
    const m = byKey.get(ref.key)
    if (!m) {
      violations.push({
        code: 'unknown-measure',
        field: 'measures',
        reasonKey: 'rb.violation.unknownMeasure',
        reasonParams: { key: ref.key },
      })
      continue
    }
    measures.push(m)
  }

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

  /* §6.2's refusal, applied wherever a pair arrives from — the picker, a saved
     report, or a hand-edited URL. AC-825. */
  const [first, second] = measures
  if (first && second) {
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

  if (query.groupBy !== null && !legalDimensions.includes(query.groupBy)) {
    violations.push({
      code: 'illegal-dimension',
      field: 'groupBy',
      reasonKey: 'rb.violation.illegalDimension',
      reasonParams: { dimension: query.groupBy },
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

  const grains: OptionLegality<ReportGrain>[] = GRAINS.map((g) => {
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
      code: grainOption.reasonKey === 'rb.grain.tooManyBuckets' ? 'too-many-buckets' : 'grain-below-min',
      field: 'grain',
      reasonKey: grainOption.reasonKey ?? 'rb.grain.belowMin',
      reasonParams: grainOption.reasonParams,
    })
  }

  const bucketCount = countBuckets(window.from, window.to, query.grain)

  /* ── chart type ───────────────────────────────────────────────────────── */
  const hasSplit = query.groupBy !== null
  const splitParts = hasSplit ? expectedGroupCount(query.groupBy!, catalogue) : 1
  const chartTypes = CHART_TYPES.map((c) =>
    chartLegality(c, {
      measures,
      hasSplit,
      splitParts,
      grain: query.grain,
      bucketCount,
    }),
  )

  const chosen = chartTypes.find((o) => o.value === query.chartType)
  const effectiveChartType = chosen?.legal
    ? query.chartType
    : nearestLegal(query.chartType, chartTypes)

  return {
    violations,
    bucketCount,
    grains,
    chartTypes,
    effectiveChartType,
    chartTypeCoerced: effectiveChartType !== query.chartType,
    legalDimensions,
    legalFilterFields,
    /* One panel per measure per group. `splitParts` is the catalogue's hint, so
       this is a forecast — the resolved result is authoritative. It is enough
       to tell the operator "this will draw four panels" before they run it. */
    panelCount: Math.max(1, measures.length) * Math.min(splitParts, MAX_GROUPS + 1),
  }
}

/* ───────────────────────── chart legality ──────────────────────────────── */

interface ChartContext {
  measures: Measure[]
  hasSplit: boolean
  splitParts: number
  grain: ReportGrain
  bucketCount: number
}

function chartLegality(chart: ChartType, ctx: ChartContext): OptionLegality<ChartType> {
  const { measures, hasSplit, splitParts, grain, bucketCount } = ctx

  /* A table renders the same numbers the chart renders, for every query shape
     in §7.1. It is the floor and it is never illegal (AC-841). */
  if (chart === 'table') return legal(chart)

  if (chart === 'line') {
    if (grain === 'none') {
      return illegal(chart, 'rb.chart.lineNeedsGrain', {})
    }
    if (bucketCount < 2) {
      /* Legacy already knows this and says so at `:6774`. */
      return illegal(chart, 'rb.chart.lineNeedsTwoPoints', { buckets: bucketCount })
    }
    return legal(chart)
  }

  if (chart === 'bar') {
    if (grain === 'none' && !hasSplit) {
      return illegal(chart, 'rb.chart.barNeedsGrainOrSplit', {})
    }
    return legal(chart)
  }

  /* pie — five gates, and changing any one of them disables it (AC-838). */
  const m = measures.length === 1 ? measures[0] : undefined
  if (!m) {
    return illegal(chart, 'rb.chart.pieOneMeasure', {})
  }
  if (PIE_ILLEGAL_UNITS.has(m.unit)) {
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
