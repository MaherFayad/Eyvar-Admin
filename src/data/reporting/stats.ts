/**
 * Descriptive, correlation and contribution stats (§5's describe_series/
 * correlate/contribution). Unrounded internally — `anomaly.ts`'s ×1.4826×k
 * amplifies rounding error. Nulls are gaps; partial buckets excluded everywhere.
 */

import type { IsoDate } from '../types/common'
import type { ReportGrain } from '../types/report'

/* ─────────────────────────── shared arithmetic ─────────────────────────── */

/** Linear-interpolated percentile over already-sorted values. Unrounded — see the file header. */
function percentileOf(sorted: readonly number[], p: number): number {
  if (sorted.length === 1) return sorted[0]!
  const index = (p / 100) * (sorted.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sorted[lower]!
  const weight = index - lower
  return sorted[lower]! * (1 - weight) + sorted[upper]! * weight
}

function medianOf(values: readonly number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  return percentileOf(sorted, 50)
}

function meanOf(values: readonly number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

/** Population standard deviation — the series describes itself, not a sample of a larger one. */
function stdDevOf(values: readonly number[], mean: number): number | null {
  if (values.length === 0) return null
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

/** Median absolute deviation from the median, unscaled. `anomaly.ts` applies the ×1.4826 itself. */
function madOf(values: readonly number[], median: number): number | null {
  if (values.length === 0) return null
  const deviations = values.map((v) => Math.abs(v - median))
  return medianOf(deviations)
}

/**
 * The points and buckets that survive the gap/partial rule, as
 * `{ index, bucket, value }` triples in original series order. Every
 * function below is built on this one filter so the rule is enforced once.
 */
export interface UsablePoint {
  index: number
  bucket: IsoDate
  value: number
}

export function usablePoints(
  points: readonly (number | null)[],
  buckets: readonly IsoDate[],
  partialBucketIndexes: readonly number[] = [],
): UsablePoint[] {
  const partial = new Set(partialBucketIndexes)
  const out: UsablePoint[] = []
  for (let i = 0; i < points.length; i += 1) {
    if (partial.has(i)) continue
    const value = points[i]
    if (value === null || value === undefined) continue
    out.push({ index: i, bucket: buckets[i]!, value })
  }
  return out
}

/* ────────────────────────────── describe ───────────────────────────────── */

export interface Trend {
  /** Value change per bucket index, from a least-squares fit over the usable points. */
  slope: number
  /** Coefficient of determination, 0…1. */
  r2: number
}

export interface WeekdayProfilePoint {
  /** 0 = Sunday … 6 = Saturday, the calendar week (`WEEK_START_DOW` in `buckets.ts` is about bucket boundaries, not this). */
  weekday: number
  mean: number | null
  count: number
}

export interface DescribeResult {
  /** Usable (non-gap, non-partial) points. */
  count: number
  /** Null points among the non-partial buckets. */
  gapCount: number
  min: number | null
  max: number | null
  mean: number | null
  median: number | null
  p10: number | null
  p90: number | null
  stdDev: number | null
  mad: number | null
  first: UsablePoint | null
  last: UsablePoint | null
  trend: Trend | null
  /** Bucket indexes where a CUSUM detector (see below) finds a level shift. */
  changePoints: number[]
  /** Bucket indexes where `|value - median| / (MAD × 1.4826) > 3.5` (the modified z-score, T7's own threshold). */
  outliers: number[]
  /** Only when `grain === 'day'`; always 7 entries, weekdays with no data carry `mean: null, count: 0`. */
  weekdayProfile: WeekdayProfilePoint[] | null
}

function weekdayOf(bucket: IsoDate): number {
  // Bucket dates are plain calendar days (`IsoDate`), so parsing as UTC midnight
  // reads the calendar weekday regardless of the host's local timezone.
  return new Date(`${bucket}T00:00:00Z`).getUTCDay()
}

function computeTrend(usable: readonly UsablePoint[]): Trend | null {
  if (usable.length < 2) return null
  const n = usable.length
  const xs = usable.map((p) => p.index)
  const ys = usable.map((p) => p.value)
  const sumX = xs.reduce((a, b) => a + b, 0)
  const sumY = ys.reduce((a, b) => a + b, 0)
  const meanX = sumX / n
  const meanY = sumY / n
  let sxy = 0
  let sxx = 0
  for (let i = 0; i < n; i += 1) {
    sxy += (xs[i]! - meanX) * (ys[i]! - meanY)
    sxx += (xs[i]! - meanX) ** 2
  }
  if (sxx === 0) return null // every usable point in the same bucket — no line to fit
  const slope = sxy / sxx
  const intercept = meanY - slope * meanX
  let ssRes = 0
  let ssTot = 0
  for (let i = 0; i < n; i += 1) {
    const predicted = slope * xs[i]! + intercept
    ssRes += (ys[i]! - predicted) ** 2
    ssTot += (ys[i]! - meanY) ** 2
  }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot
  return { slope, r2 }
}

/**
 * Two-sided CUSUM (Montgomery): allowance k = 0.5σ, threshold h = 4σ, over
 * the mean of the usable points. `04-alerting-v2.md` names CUSUM but not
 * its tuning, so this is a stated choice, not a hidden one.
 */
function computeChangePoints(usable: readonly UsablePoint[]): number[] {
  if (usable.length < 2) return []
  const values = usable.map((p) => p.value)
  const mean = meanOf(values)!
  const std = stdDevOf(values, mean)!
  if (std === 0) return []
  const allowance = 0.5 * std
  const threshold = 4 * std
  const points: number[] = []
  let high = 0
  let low = 0
  for (const point of usable) {
    high = Math.max(0, high + (point.value - mean) - allowance)
    low = Math.min(0, low + (point.value - mean) + allowance)
    if (high > threshold) {
      points.push(point.index)
      high = 0
    }
    if (low < -threshold) {
      points.push(point.index)
      low = 0
    }
  }
  return points
}

function computeOutliers(usable: readonly UsablePoint[], median: number, mad: number): number[] {
  if (mad === 0) {
    // Any non-median point is an unbounded modified z-score; a point equal to
    // the median is 0/0 (NaN), which the comparison below correctly excludes.
    return usable.filter((p) => p.value !== median).map((p) => p.index)
  }
  const scale = mad * 1.4826
  return usable.filter((p) => Math.abs(p.value - median) / scale > 3.5).map((p) => p.index)
}

function computeWeekdayProfile(usable: readonly UsablePoint[]): WeekdayProfilePoint[] {
  const byWeekday: number[][] = [[], [], [], [], [], [], []]
  for (const point of usable) byWeekday[weekdayOf(point.bucket)]!.push(point.value)
  return byWeekday.map((values, weekday) => ({
    weekday,
    mean: meanOf(values),
    count: values.length,
  }))
}

export function describe(
  points: readonly (number | null)[],
  buckets: readonly IsoDate[],
  grain: ReportGrain,
  partialBucketIndexes: readonly number[] = [],
): DescribeResult {
  const usable = usablePoints(points, buckets, partialBucketIndexes)
  const partial = new Set(partialBucketIndexes)
  let gapCount = 0
  for (let i = 0; i < points.length; i += 1) {
    if (partial.has(i)) continue
    if (points[i] === null || points[i] === undefined) gapCount += 1
  }

  if (usable.length === 0) {
    return {
      count: 0,
      gapCount,
      min: null,
      max: null,
      mean: null,
      median: null,
      p10: null,
      p90: null,
      stdDev: null,
      mad: null,
      first: null,
      last: null,
      trend: null,
      changePoints: [],
      outliers: [],
      weekdayProfile: grain === 'day' ? computeWeekdayProfile(usable) : null,
    }
  }

  const values = usable.map((p) => p.value)
  const sorted = [...values].sort((a, b) => a - b)
  const mean = meanOf(values)!
  const median = percentileOf(sorted, 50)
  const mad = madOf(values, median)!

  return {
    count: usable.length,
    gapCount,
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    mean,
    median,
    p10: percentileOf(sorted, 10),
    p90: percentileOf(sorted, 90),
    stdDev: stdDevOf(values, mean),
    mad,
    first: usable[0]!,
    last: usable[usable.length - 1]!,
    trend: computeTrend(usable),
    changePoints: computeChangePoints(usable),
    outliers: computeOutliers(usable, median, mad),
    weekdayProfile: grain === 'day' ? computeWeekdayProfile(usable) : null,
  }
}

/* ────────────────────────────── correlate ───────────────────────────────── */

/** T8's own floor: "a warning when n < 8". Below it a correlation is refused, not reported weak. */
export const MIN_CORRELATION_PAIRS = 8

export type CorrelateRefusalReason = 'insufficient-pairs'

export interface LagCorrelation {
  lag: number
  pearson: number | null
  spearman: number | null
  n: number
}

export interface CorrelateResult {
  ok: true
  pairs: number
  hasGaps: boolean
  lags: LagCorrelation[]
  /**
   * A typed marker, not prose — this module carries no copy (CLAUDE.md rule
   * 7). Whatever surface renders a correlation reads this code and supplies
   * the caveat sentence from its own `copy.ts`.
   */
  causationCaveat: 'correlation-not-causation'
}

export interface CorrelateRefusal {
  ok: false
  reason: CorrelateRefusalReason
  pairs: number
}

function pearsonOf(xs: readonly number[], ys: readonly number[]): number | null {
  const n = xs.length
  if (n < 2) return null
  const meanX = meanOf(xs)!
  const meanY = meanOf(ys)!
  let sxy = 0
  let sxx = 0
  let syy = 0
  for (let i = 0; i < n; i += 1) {
    const dx = xs[i]! - meanX
    const dy = ys[i]! - meanY
    sxy += dx * dy
    sxx += dx * dx
    syy += dy * dy
  }
  if (sxx === 0 || syy === 0) return null // one side is constant — no linear relationship to state
  return sxy / Math.sqrt(sxx * syy)
}

/** Ranks with ties averaged, the standard input to a Spearman correlation. */
function rankOf(values: readonly number[]): number[] {
  const order = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value)
  const ranks = new Array<number>(values.length)
  let i = 0
  while (i < order.length) {
    let j = i
    while (j + 1 < order.length && order[j + 1]!.value === order[i]!.value) j += 1
    const averageRank = (i + j) / 2 + 1
    for (let k = i; k <= j; k += 1) ranks[order[k]!.index] = averageRank
    i = j + 1
  }
  return ranks
}

function spearmanOf(xs: readonly number[], ys: readonly number[]): number | null {
  if (xs.length < 2) return null
  return pearsonOf(rankOf(xs), rankOf(ys))
}

/**
 * Pearson and Spearman at lag 0…`maxLag` (T8), over buckets where BOTH
 * series have a value. `b` shifts forward by `lag` — positive asks "does a lead b".
 * Refuses below `MIN_CORRELATION_PAIRS` at lag 0, the base rate every other lag is judged against.
 */
export function correlate(
  a: readonly (number | null)[],
  b: readonly (number | null)[],
  maxLag = 0,
  partialA: readonly number[] = [],
  partialB: readonly number[] = [],
): CorrelateResult | CorrelateRefusal {
  const partialAset = new Set(partialA)
  const partialBset = new Set(partialB)
  const hasGaps = a.some((v, i) => !partialAset.has(i) && v === null) || b.some((v, i) => !partialBset.has(i) && v === null)

  const pairAt = (lag: number): { xs: number[]; ys: number[] } => {
    const xs: number[] = []
    const ys: number[] = []
    for (let i = 0; i < a.length; i += 1) {
      const j = i + lag
      if (j < 0 || j >= b.length) continue
      if (partialAset.has(i) || partialBset.has(j)) continue
      const x = a[i]
      const y = b[j]
      if (x === null || x === undefined || y === null || y === undefined) continue
      xs.push(x)
      ys.push(y)
    }
    return { xs, ys }
  }

  const base = pairAt(0)
  if (base.xs.length < MIN_CORRELATION_PAIRS) {
    return { ok: false, reason: 'insufficient-pairs', pairs: base.xs.length }
  }

  const lags: LagCorrelation[] = []
  for (let lag = 0; lag <= maxLag; lag += 1) {
    const { xs, ys } = lag === 0 ? base : pairAt(lag)
    lags.push({
      lag,
      pearson: pearsonOf(xs, ys),
      spearman: spearmanOf(xs, ys),
      n: xs.length,
    })
  }

  return { ok: true, pairs: base.xs.length, hasGaps, lags, causationCaveat: 'correlation-not-causation' }
}

/* ───────────────────────────── contribution ─────────────────────────────── */

export interface ContributionPartInput {
  groupValue: string
  /** The window sums. `null` means the group had no rows in that window (not a gap — a group's absence, unlike a time bucket's, is not shrunk to a mid-series null). */
  totalA: number | null
  totalB: number | null
}

export interface ContributionInput {
  totalA: number | null
  totalB: number | null
  parts: readonly ContributionPartInput[]
}

export interface ContributionPart {
  groupValue: string
  /** `null` only when the group has no data in either window. */
  deltaAbs: number | null
  /** Signed share of the whole series' change, percent. `null` when the whole series had no net change, or this part has no data. */
  share: number | null
  /** 1-based, by `|deltaAbs|` descending. `null` for a part with no data (ranked after every scored part, order otherwise unspecified). */
  rank: number | null
}

export interface ContributionResult {
  totalChange: number | null
  parts: ContributionPart[]
}

/**
 * Which groups explain the change between two windows (T9): absolute and
 * share-of-change per part, ranked by absolute contribution. `parts` should
 * already carry `Other`, folded upstream — this is arithmetic only.
 */
export function contribution(input: ContributionInput): ContributionResult {
  const totalChange = input.totalA === null || input.totalB === null ? null : input.totalB - input.totalA

  const scored = input.parts.map((part) => {
    // A group missing from one window is treated as zero activity there (it
    // appeared or disappeared) — a different fact from a time-series gap, so
    // it does not inherit the "null, never 0" rule those carry.
    const a = part.totalA ?? (part.totalB === null ? null : 0)
    const b = part.totalB ?? (part.totalA === null ? null : 0)
    const deltaAbs = a === null || b === null ? null : b - a
    return { groupValue: part.groupValue, deltaAbs }
  })

  const rankable = scored
    .filter((p): p is { groupValue: string; deltaAbs: number } => p.deltaAbs !== null)
    .sort((x, y) => Math.abs(y.deltaAbs) - Math.abs(x.deltaAbs))
  const rankByGroup = new Map(rankable.map((p, i) => [p.groupValue, i + 1]))

  const parts: ContributionPart[] = scored.map((p) => ({
    groupValue: p.groupValue,
    deltaAbs: p.deltaAbs,
    share: p.deltaAbs === null || !totalChange ? null : (p.deltaAbs / totalChange) * 100,
    rank: rankByGroup.get(p.groupValue) ?? null,
  }))
  parts.sort((x, y) => {
    if (x.deltaAbs === null) return y.deltaAbs === null ? 0 : 1
    if (y.deltaAbs === null) return -1
    return Math.abs(y.deltaAbs) - Math.abs(x.deltaAbs)
  })

  return { totalChange, parts }
}
