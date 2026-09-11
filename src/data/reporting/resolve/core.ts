/**
 * The pure aggregation core (AC-1121). Rows in, a result out: no fixture
 * imports, no clock reads, no randomness. `mock/resolveReport.ts` reads the
 * fixture stores into `CoreRow`s and is the only caller; population/predicate
 * matching and permission redaction stay there, as viewer- and fixture-shaped
 * concerns this module has no business knowing about.
 */

import { evaluateFormula, formulaUnit, type FormulaRefInfo, type FormulaSeriesInput } from '../formula'
import { cumulative, difference, percentChange, percentOfTotal, rollingAverage } from '../transforms'
import { bucketEndExclusive, addDays, bucketStarts, partialBucketIndexes as computePartials } from '../buckets'
import type { CurrencyCode, IsoDate } from '../../types/common'
import type { MetricUnit } from '../../types/metrics'
import type { BucketAggregate, MeasureKey, Temporality } from '../../types/measure'
import type {
  ComparisonDisplay,
  ReportFormula,
  ReportGrain,
  ReportTransform,
} from '../../types/report'

/* ─────────────────────────────── constants ─────────────────────────────── */

/** §7.4's fold bucket, one per level (§2.4). Always last, always rendered, even at zero. */
export const OTHER = '__other__'

/** §7.4 / G4: the ninth group and beyond fold into `Other`, at every split level. */
export const MAX_GROUPS_PER_LEVEL = 8

/* ────────────────────────────── the row shape ──────────────────────────── */

/**
 * One fixture row, flattened to exactly what aggregation needs — no store
 * name, no field name, nothing the adapter's `RowSource` table already
 * resolved. A closure rather than a plain boolean for `liveAt`, because a
 * stock reading depends on *which day* it is asked about (the bucket's last
 * instant), and that is only known once bucketing starts.
 */
export interface CoreRow {
  /** Which bucket a flow row falls in, and what a split's rank is computed over. `null` = no date on this row. */
  date: IsoDate | null
  /** This row's contribution — `1` for a count, the halalas (or other value) for a sum/mean. */
  value: number
  /** Stock aggregates only. `null` when this row carries no stock reading (see `CoreMeasureRows.supportsStock`). */
  liveAt: ((day: IsoDate) => boolean) | null
  /** `groupKeys[0]` is the level-1 split value, `groupKeys[1]` the level-2. `null`/`''` rows are ungrouped and never rank. */
  groupKeys: (string | null)[]
}

/** The measure metadata a leg needs, plus every row matching its population, predicate and the query's filters. */
export interface CoreMeasureRows {
  key: MeasureKey
  unit: MetricUnit
  currency: CurrencyCode | null
  temporality: Temporality
  additive: boolean
  /** `Measure.bucketAggregate`, already substituted for a legal `MeasureRef.aggregate` (G1) by the adapter. */
  bucketAggregate: BucketAggregate
  coverage: { from: IsoDate; to: IsoDate }
  /**
   * Whether this measure's store can answer *"was this row live at instant
   * X"* at all — `RowSource.liveAt !== null`. Zero matching rows is a real
   * `0`; a store with no stock predicate is a real `null`. Row presence alone
   * cannot tell the two apart, so this is a fact carried once per leg rather
   * than inferred from `rows`.
   */
  supportsStock: boolean
  /** Every row matching population, predicate and the query's filters. Not window-filtered — a leg buckets it twice, current and comparison. */
  rows: CoreRow[]
}

/* ──────────────────────────────── bucketing ─────────────────────────────── */

/** The inclusive day range one bucket covers. `grain: 'none'` is the whole window, one bucket. */
export function bucketSpan(
  bucketStart: IsoDate,
  grain: ReportGrain,
  window: { from: IsoDate; to: IsoDate },
): { first: IsoDate; last: IsoDate } {
  if (grain === 'none' || grain === 'hour') return { first: window.from, last: window.to }
  const g = grain as 'day' | 'week' | 'month' | 'quarter'
  return { first: bucketStart, last: addDays(bucketEndExclusive(bucketStart, g), -1) }
}

interface BucketPlan {
  buckets: IsoDate[]
  spans: { first: IsoDate; last: IsoDate }[]
}

function planBuckets(window: { from: IsoDate; to: IsoDate }, grain: ReportGrain): BucketPlan {
  const buckets = bucketStarts(window.from, window.to, grain)
  return { buckets, spans: buckets.map((b) => bucketSpan(b, grain, window)) }
}

/* ──────────────────────────────── grouping ──────────────────────────────── */

interface LevelRank {
  /** Ranked descending by total value, tie-broken by key — deterministic (§7.4). */
  top: string[]
  folded: number
}

function rankLevel(rows: readonly CoreRow[], level: number): LevelRank {
  const totals = new Map<string, number>()
  for (const row of rows) {
    const key = row.groupKeys[level]
    if (key === null || key === undefined || key === '') continue
    totals.set(key, (totals.get(key) ?? 0) + row.value)
  }
  const ranked = [...totals.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], ['ar', 'en']))
    .map(([k]) => k)
  if (ranked.length <= MAX_GROUPS_PER_LEVEL) return { top: ranked, folded: 0 }
  return { top: ranked.slice(0, MAX_GROUPS_PER_LEVEL), folded: ranked.length - MAX_GROUPS_PER_LEVEL }
}

function levelValues(rank: LevelRank): string[] {
  return rank.folded > 0 ? [...rank.top, OTHER] : rank.top
}

function levelMatch(row: CoreRow, level: number, value: string, rank: LevelRank): boolean {
  const key = row.groupKeys[level] ?? ''
  /* `Other` is the complement of the named top values, so its total is the real tail and not a placeholder. */
  return value === OTHER ? !rank.top.includes(key) : key === value
}

export interface GroupPath {
  /** `null` = no split. One level: the value itself. Two levels: `g1|g2`, the joined display value (AC-1123). */
  display: string | null
  matches: (row: CoreRow) => boolean
}

/**
 * The groups a split produces, ranked over the rows landing in `window`,
 * folded at eight **per level** (G4). Level two is ranked *within* its
 * level-one parent, so `Other` at level one still gets a real level-two split
 * rather than one lump sum.
 *
 * Ranking uses `window` — never the comparison window — and the same paths
 * are reused for the comparison leg (mirrors the v1 resolver's rule: *"the
 * window, which this ranking used to ignore… the rank-1 group could
 * contribute 0.00 to the period actually on screen"*).
 */
export function planGroupPaths(
  rows: readonly CoreRow[],
  window: { from: IsoDate; to: IsoDate },
  levels: 0 | 1 | 2,
): { paths: GroupPath[]; folded: number } {
  if (levels === 0) return { paths: [{ display: null, matches: () => true }], folded: 0 }

  const inWindow = rows.filter((r) => r.date !== null && r.date >= window.from && r.date <= window.to)
  const l1 = rankLevel(inWindow, 0)
  const l1Values = levelValues(l1)

  if (levels === 1) {
    return {
      paths: l1Values.map((v) => ({ display: v, matches: (row: CoreRow) => levelMatch(row, 0, v, l1) })),
      folded: l1.folded,
    }
  }

  const paths: GroupPath[] = []
  let folded = l1.folded
  for (const g1 of l1Values) {
    const subset = inWindow.filter((r) => levelMatch(r, 0, g1, l1))
    const l2 = rankLevel(subset, 1)
    folded += l2.folded
    for (const g2 of levelValues(l2)) {
      paths.push({
        display: `${g1}|${g2}`,
        matches: (row: CoreRow) => levelMatch(row, 0, g1, l1) && levelMatch(row, 1, g2, l2),
      })
    }
  }
  return { paths, folded }
}

/* ─────────────────────────────── aggregation ────────────────────────────── */

/**
 * One bucket, one number — §6.2's two temporality rules, generalised off
 * `RowSource` onto `CoreRow`. Stock reads `liveAt` as at the bucket's last
 * instant; flow aggregates rows whose `date` falls in the span.
 */
function valueForSpan(
  rows: readonly CoreRow[],
  bucketAggregate: BucketAggregate,
  supportsStock: boolean,
  first: IsoDate,
  last: IsoDate,
): number | null {
  if (bucketAggregate === 'cumulative-count' || bucketAggregate === 'end-of-period') {
    if (!supportsStock) return null
    return rows.reduce((n, r) => n + (r.liveAt !== null && r.liveAt(last) ? 1 : 0), 0)
  }

  const inBucket = rows.filter((r) => r.date !== null && r.date >= first && r.date <= last)
  if (bucketAggregate === 'count') return inBucket.length
  if (bucketAggregate === 'sum') return inBucket.reduce((total, r) => total + r.value, 0)
  /* mean — a rate is meaned, never summed. An empty bucket has no mean. */
  if (inBucket.length === 0) return null
  const sum = inBucket.reduce((total, r) => total + r.value, 0)
  return Math.round((sum / inBucket.length) * 10) / 10
}

function pointsForRows(
  rows: readonly CoreRow[],
  measure: Pick<CoreMeasureRows, 'bucketAggregate' | 'supportsStock' | 'coverage'>,
  spans: readonly { first: IsoDate; last: IsoDate }[],
): { points: (number | null)[]; hadGap: boolean } {
  const points: (number | null)[] = []
  let hadGap = false
  for (const span of spans) {
    /* Outside the store's declared coverage the answer is unknown, and unknown is `null`. */
    if (span.last < measure.coverage.from || span.first > measure.coverage.to) {
      points.push(null)
      hadGap = true
      continue
    }
    points.push(valueForSpan(rows, measure.bucketAggregate, measure.supportsStock, span.first, span.last))
  }
  return { points, hadGap }
}

/* ────────────────────────────── transforms ──────────────────────────────── */

/** §2.3's pipeline, applied to one leg's groups together — `cumulative`, then `rollingAverage`, then `percentOfTotal`. */
function applyTransform(
  pointsByGroup: readonly (number | null)[][],
  transform: ReportTransform,
  partials: readonly number[],
): (number | null)[][] {
  let out = pointsByGroup.map((points) => points)
  if (transform.cumulative) out = out.map((points) => cumulative(points))
  if (transform.rollingAverage !== null) out = out.map((points) => rollingAverage(points, transform.rollingAverage!))
  if (transform.percentOfTotal) out = percentOfTotal(out, partials)
  return out
}

/* ────────────────────────────── the leg result ──────────────────────────── */

export interface CoreLeg {
  groupValue: string | null
  current: { points: (number | null)[]; unit: MetricUnit; currency: CurrencyCode | null }
  /** `null` when `periodComparison === 'none'`. */
  comparison: { points: (number | null)[]; unit: MetricUnit; currency: CurrencyCode | null } | null
}

export interface CoreLegResult {
  measureKey: MeasureKey
  temporality: Temporality
  buckets: IsoDate[]
  partialBucketIndexes: number[]
  groups: CoreLeg[]
  /** Total folded across every level and every level-one parent. `null` when nothing was folded. */
  foldedGroupCount: number | null
  hadGap: boolean
}

export interface ResolveTrendLegInput {
  measure: CoreMeasureRows
  groupLevels: 0 | 1 | 2
  transform: ReportTransform
  comparisonDisplay: ComparisonDisplay
  window: { from: IsoDate; to: IsoDate }
  /** `null` means `periodComparison: 'none'`. */
  comparisonWindow: { from: IsoDate; to: IsoDate } | null
  grain: ReportGrain
  /** The fixed clock's day — a parameter, never read from a global (matches `resolveWindow`'s rule). */
  today: IsoDate
}

/**
 * **One measure, current plus its optional comparison, resolved.** AC-1121:
 * this is the function under test for purity, and `mock/resolveReport.ts`
 * calls it once per measure it is not redacting — a two-measure trend is two
 * calls, a formula is `resolveFormulaLeg` below instead of one of them.
 */
export function resolveTrendLeg(input: ResolveTrendLegInput): CoreLegResult {
  const { measure, groupLevels, transform, comparisonDisplay, window, comparisonWindow, grain, today } = input
  const plan = planBuckets(window, grain)
  const partials = computePartials(plan.buckets, grain, window, today)
  const { paths, folded } = planGroupPaths(measure.rows, window, groupLevels)

  let hadGap = false
  const currentByGroup = paths.map((path) => {
    const rows = measure.rows.filter(path.matches)
    const { points, hadGap: gap } = pointsForRows(rows, measure, plan.spans)
    hadGap = hadGap || gap
    return points
  })
  const transformedCurrent = applyTransform(currentByGroup, transform, partials)

  let comparisonByGroup: (number | null)[][] | null = null
  if (comparisonWindow) {
    const cPlan = planBuckets(comparisonWindow, grain)
    /* Aligned by index to `plan.buckets`, never by date — a comparison series
       is drawn against the current period's positions (R7's dashed overlay). */
    const cSpans = cPlan.spans.slice(0, plan.buckets.length)
    const raw = paths.map((path) => {
      const rows = measure.rows.filter(path.matches)
      const { points, hadGap: gap } = pointsForRows(rows, measure, cSpans)
      hadGap = hadGap || gap
      return points
    })
    /* A comparison series carries no partial bucket of its own (AC-818): the
       period-comparison delta excludes the current window's partial edge, not
       a second one the prior window happens to also have. */
    comparisonByGroup = applyTransform(raw, transform, [])
  }

  const groups: CoreLeg[] = paths.map((path, i) => {
    const current = { points: transformedCurrent[i]!, unit: measure.unit, currency: measure.currency }
    if (!comparisonByGroup) return { groupValue: path.display, current, comparison: null }

    const comparisonPoints = comparisonByGroup[i]!
    if (comparisonDisplay === 'difference') {
      return {
        groupValue: path.display,
        current,
        comparison: {
          points: difference(current.points, comparisonPoints, partials),
          unit: measure.unit,
          currency: measure.currency,
        },
      }
    }
    if (comparisonDisplay === 'percent-change') {
      return {
        groupValue: path.display,
        current,
        comparison: {
          points: percentChange(current.points, comparisonPoints, partials),
          unit: 'percent',
          currency: null,
        },
      }
    }
    return {
      groupValue: path.display,
      current,
      comparison: { points: comparisonPoints, unit: measure.unit, currency: measure.currency },
    }
  })

  return {
    measureKey: measure.key,
    temporality: measure.temporality,
    buckets: plan.buckets,
    partialBucketIndexes: partials,
    groups,
    foldedGroupCount: folded > 0 ? folded : null,
    hadGap,
  }
}

/* ──────────────────────────────── formula ───────────────────────────────── */

export interface ResolveFormulaLegInput {
  formula: ReportFormula
  a: CoreMeasureRows
  /** Absent when the formula has no `B` reference legal in this query. */
  b: CoreMeasureRows | null
  groupLevels: 0 | 1 | 2
  transform: ReportTransform
  comparisonDisplay: ComparisonDisplay
  window: { from: IsoDate; to: IsoDate }
  comparisonWindow: { from: IsoDate; to: IsoDate } | null
  grain: ReportGrain
  today: IsoDate
}

function refInfo(m: CoreMeasureRows): FormulaRefInfo {
  return { unit: m.unit, currency: m.currency, additive: m.additive, temporality: m.temporality }
}

/**
 * G2: a formula replaces the measure series in the plot. Groups are planned
 * once, over `A`'s rows — `formula.ts`'s `REF` comment: *"'A' | 'B' — the
 * measures in listed order"* — and the **same paths** are applied to `B`'s
 * rows, so group *i* pairs "A's riyadh" with "B's riyadh" even where B's own
 * ranking would have ordered them differently. `totalA`/`totalB` are this
 * bucket's sum across every group (including `Other`), which is what `PCT`
 * needs and no single group can derive alone.
 */
export function resolveFormulaLeg(input: ResolveFormulaLegInput): CoreLegResult {
  const { formula, a, b, groupLevels, transform, comparisonDisplay, window, comparisonWindow, grain, today } = input
  const plan = planBuckets(window, grain)
  const partials = computePartials(plan.buckets, grain, window, today)
  const { paths, folded } = planGroupPaths(a.rows, window, groupLevels)

  const unitResult = formulaUnit(formula.expression, {
    A: refInfo(a),
    B: b ? refInfo(b) : undefined,
    hasSplit: groupLevels > 0,
  })
  /* `resolveReport` runs after `planQuery` has already refused an illegal
     formula (AC-1104…1107); an expression that still fails here evaluates to
     every bucket a gap, matching `evaluateFormula`'s own documented fallback. */
  const unit: MetricUnit = unitResult.ok ? unitResult.unit : a.unit
  const currency = unitResult.ok ? unitResult.currency : null

  let hadGap = false
  const evalOverWindow = (
    win: { from: IsoDate; to: IsoDate },
    length: number,
  ): (number | null)[][] => {
    const bPlan = planBuckets(win, grain)
    const spans = bPlan.spans.slice(0, length)
    const aByGroup = paths.map((path) => {
      const rows = a.rows.filter(path.matches)
      const { points, hadGap: gap } = pointsForRows(rows, a, spans)
      hadGap = hadGap || gap
      return points
    })
    const bByGroup = b
      ? paths.map((path) => {
          const rows = b.rows.filter(path.matches)
          const { points, hadGap: gap } = pointsForRows(rows, b, spans)
          hadGap = hadGap || gap
          return points
        })
      : null
    const totalA = sumAcrossGroups(aByGroup, length)
    const totalB = bByGroup ? sumAcrossGroups(bByGroup, length) : null
    return paths.map((_, i) => {
      const seriesInput: FormulaSeriesInput = {
        length,
        A: aByGroup[i],
        B: bByGroup?.[i],
        totalA,
        ...(totalB ? { totalB } : {}),
      }
      return evaluateFormula(seriesInput, formula.expression)
    })
  }

  const currentByGroup = evalOverWindow(window, plan.buckets.length)
  const transformedCurrent = applyTransform(currentByGroup, transform, partials)

  let comparisonByGroup: (number | null)[][] | null = null
  if (comparisonWindow) {
    const raw = evalOverWindow(comparisonWindow, plan.buckets.length)
    comparisonByGroup = applyTransform(raw, transform, [])
  }

  const groups: CoreLeg[] = paths.map((path, i) => {
    const current = { points: transformedCurrent[i]!, unit, currency }
    if (!comparisonByGroup) return { groupValue: path.display, current, comparison: null }
    const comparisonPoints = comparisonByGroup[i]!
    if (comparisonDisplay === 'difference') {
      return {
        groupValue: path.display,
        current,
        comparison: { points: difference(current.points, comparisonPoints, partials), unit, currency },
      }
    }
    if (comparisonDisplay === 'percent-change') {
      return {
        groupValue: path.display,
        current,
        comparison: { points: percentChange(current.points, comparisonPoints, partials), unit: 'percent', currency: null },
      }
    }
    return { groupValue: path.display, current, comparison: { points: comparisonPoints, unit, currency } }
  })

  return {
    measureKey: '__formula__',
    temporality: unitResult.ok ? unitResult.temporality : a.temporality,
    buckets: plan.buckets,
    partialBucketIndexes: partials,
    groups,
    foldedGroupCount: folded > 0 ? folded : null,
    hadGap,
  }
}

function sumAcrossGroups(byGroup: readonly (number | null)[][], length: number): (number | null)[] {
  const out: (number | null)[] = []
  for (let i = 0; i < length; i += 1) {
    let sum = 0
    let any = false
    for (const points of byGroup) {
      const v = points[i]
      if (v !== null && v !== undefined) {
        sum += v
        any = true
      }
    }
    out.push(any ? sum : null)
  }
  return out
}
