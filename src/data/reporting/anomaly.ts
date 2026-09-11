/**
 * The anomaly band — 04-alerting-v2.md §2. Pure, shared by mock and server;
 * `alerts/evaluate.ts` calls `anomalyBandAt` per evaluation and compares the
 * tested bucket's value against it. `median ± k·MAD·1.4826`, k by confidence,
 * a weekday baseline at `day` grain, `null` below the 8-point floor.
 */

import type { IsoDate } from '../types/common'
import type { ReportGrain } from '../types/report'
import { usablePoints, type UsablePoint } from './stats'

export type AnomalyConfidence = 95 | 99

/** §2: 28 daily, 12 weekly, 6 monthly buckets of history by default. */
const DEFAULT_LOOKBACK: Record<'day' | 'week' | 'month', number> = { day: 28, week: 12, month: 6 }

/** §2: below this many usable baseline points, no band can be honestly drawn. */
const MIN_BASELINE_POINTS = 8

/** §2: at least this many same-weekday buckets before the weekday baseline is used over the full window. */
const MIN_WEEKDAY_POINTS = 4

function kFor(confidence: AnomalyConfidence): number {
  return confidence === 99 ? 2.6 : 2.0
}

function medianOf(sorted: readonly number[]): number {
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!
}

export interface AnomalyBand {
  low: number
  high: number
  median: number
  mad: number
  /** How many baseline points formed this band. */
  n: number
  /** Whether the same-weekday subset was used (`day` grain only) rather than the full lookback window. */
  weekdayBaseline: boolean
}

export interface AnomalyBandOptions {
  confidence: AnomalyConfidence
  grain: ReportGrain
  /** `null` uses the §2 default for `grain`. Buckets at any other grain fall back to the `day` default. */
  lookback: number | null
}

function weekdayOf(bucket: IsoDate): number {
  return new Date(`${bucket}T00:00:00Z`).getUTCDay()
}

/** The floor (§2) gates the pool this draws from — `anomalyBandAt` enforces it before calling this. */
function bandFrom(baseline: readonly UsablePoint[], confidence: AnomalyConfidence, weekdayBaseline: boolean): AnomalyBand | null {
  if (baseline.length === 0) return null
  const values = [...baseline.map((p) => p.value)].sort((a, b) => a - b)
  const median = medianOf(values)
  const deviations = values.map((v) => Math.abs(v - median)).sort((a, b) => a - b)
  const mad = medianOf(deviations)
  const scaled = mad * 1.4826
  const k = kFor(confidence)
  return { low: median - k * scaled, high: median + k * scaled, median, mad, n: baseline.length, weekdayBaseline }
}

/**
 * The band for the bucket at `evaluatedIndex`, built from the usable buckets
 * strictly before it — a point never appears in its own baseline. `null`
 * (`no-baseline`) if the evaluated bucket is itself partial, or if fewer than
 * `MIN_BASELINE_POINTS` usable buckets precede it.
 */
export function anomalyBandAt(
  points: readonly (number | null)[],
  buckets: readonly IsoDate[],
  partialBucketIndexes: readonly number[],
  evaluatedIndex: number,
  options: AnomalyBandOptions,
): AnomalyBand | null {
  if (partialBucketIndexes.includes(evaluatedIndex)) return null

  const grain = options.grain === 'week' || options.grain === 'month' ? options.grain : 'day'
  const lookback = options.lookback ?? DEFAULT_LOOKBACK[grain]

  const priorUsable = usablePoints(points.slice(0, evaluatedIndex), buckets.slice(0, evaluatedIndex), partialBucketIndexes)
  const window = priorUsable.slice(Math.max(0, priorUsable.length - lookback))
  // §2's 8-point floor gates the pool a band may be drawn from at all; the
  // weekday subset below may be smaller than 8 once that pool is established.
  if (window.length < MIN_BASELINE_POINTS) return null

  if (options.grain === 'day') {
    const targetWeekday = weekdayOf(buckets[evaluatedIndex]!)
    const sameWeekday = window.filter((p) => weekdayOf(p.bucket) === targetWeekday)
    if (sameWeekday.length >= MIN_WEEKDAY_POINTS) {
      return bandFrom(sameWeekday, options.confidence, true)
    }
  }

  return bandFrom(window, options.confidence, false)
}

/**
 * Whether `value` falls outside `band` in the asked direction. `false` for a
 * `null` value or a `null` band — never a default to "not anomalous by
 * omission" masquerading as a real reading, callers branch on the band first.
 */
export function isOutside(
  value: number | null,
  band: AnomalyBand | null,
  direction: 'above' | 'below' | 'either' = 'either',
): boolean {
  if (value === null || band === null) return false
  const above = value > band.high
  const below = value < band.low
  if (direction === 'above') return above
  if (direction === 'below') return below
  return above || below
}
