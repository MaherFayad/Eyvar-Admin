/**
 * Pure condition evaluator (04-alerting-v2.md §3, spec 06 §12.3). A partial
 * bucket is never the tested bucket, a baseline point, or one of `missing`'s
 * counted buckets; a gap stays `null`, read only by `missing`.
 */

import type { AlertComparator, AlertCondition, AlertRule } from '../../types/alert'
import { alertCondition } from '../../types/alert'
import type { IsoDate, IsoDateTime } from '../../types/common'
import { anomalyBandAt, type AnomalyBand } from '../anomaly'
import { difference, percentChange } from '../transforms'

/** The slice of a resolved `ReportSeries` a condition is tested against, plus the shared `ReportResult.buckets` it is parallel to. */
export interface ResolvedSeries {
  buckets: readonly IsoDate[]
  points: readonly (number | null)[]
  partialBucketIndexes: readonly number[]
  /**
   * The report's `role: 'comparison'` series (§2 previous-period), index-
   * aligned with `points` and already sliced to the same bucket count by
   * `resolveReport.ts`, so `previous-period` just indexes it. `null`/absent if disabled.
   */
  previousPeriodPoints?: readonly (number | null)[] | null
}

export type AlertConditionOutcome =
  | 'would-fire'
  | 'would-not-fire'
  /** No complete bucket exists to test — every candidate bucket is partial, the series is empty, or the most recent complete bucket is itself a gap (`missing` aside). */
  | 'no-complete-bucket'
  /** `relative`: the reference bucket is missing, partial or a zero percent baseline. `anomaly`: fewer than the floor of usable baseline points precede the tested bucket. */
  | 'no-baseline'
  /** `relative` naming `same-bucket-previous-week` at a grain other than `day` (AC-1222). */
  | 'invalid-condition'

export interface AlertConditionEvaluation {
  evaluatedAt: IsoDateTime
  outcome: AlertConditionOutcome
  bucketStart: IsoDate | null
  /** The tested bucket's own value. `null` when there is nothing to test. */
  value: number | null
  /** `static`: the rule's threshold. `relative`: the rule's `amount`. `null` for `anomaly` and `missing`, and whenever nothing was tested. */
  threshold: number | null
  /** `relative` only — the bucket `value` was compared against. */
  reference: { value: number; bucketStart: IsoDate } | null
  /** `anomaly` only. */
  band: AnomalyBand | null
  /** `missing` only — how many of the last `bucketsMissing` complete buckets were `null`. */
  missingCount: number | null
}

function empty(evaluatedAt: IsoDateTime, outcome: AlertConditionOutcome): AlertConditionEvaluation {
  return { evaluatedAt, outcome, bucketStart: null, value: null, threshold: null, reference: null, band: null, missingCount: null }
}

/** Walks back from the end, skipping only partial indexes — the definition of "the most recent complete bucket" (§12.3). A `null` value there is a gap, not a reason to keep walking. */
function lastCompleteIndex(length: number, partialBucketIndexes: readonly number[]): number {
  const partial = new Set(partialBucketIndexes)
  for (let i = length - 1; i >= 0; i -= 1) {
    if (!partial.has(i)) return i
  }
  return -1
}

/** The last `n` complete bucket indexes, ascending, skipping partial ones. Shorter than `n` when there is not yet that much complete history. */
function lastNCompleteIndexes(length: number, partialBucketIndexes: readonly number[], n: number): number[] {
  const partial = new Set(partialBucketIndexes)
  const out: number[] = []
  for (let i = length - 1; i >= 0 && out.length < n; i -= 1) {
    if (partial.has(i)) continue
    out.unshift(i)
  }
  return out
}

function compareStatic(value: number, comparator: AlertComparator, threshold: number): boolean {
  switch (comparator) {
    case 'gt':
      return value > threshold
    case 'gte':
      return value >= threshold
    case 'lt':
      return value < threshold
    case 'lte':
      return value <= threshold
  }
}

function relativeFires(change: number, direction: 'up' | 'down' | 'either', amount: number): boolean {
  if (direction === 'up') return change >= amount
  if (direction === 'down') return change <= -amount
  return Math.abs(change) >= amount
}

/**
 * `AlertCondition.relative`'s reference point. `previous-bucket`/`same-bucket-previous-week`
 * are index offsets; the latter REFUSES outside `day` grain (AC-1222) rather
 * than picking the nearest legal thing. `previous-period` reads `series.previousPeriodPoints` instead.
 */
function reference(
  condition: Extract<AlertCondition, { kind: 'relative' }>,
  series: ResolvedSeries,
  testedIndex: number,
  grain: AlertRule['evaluationGrain'],
): { value: number; bucketStart: IsoDate } | null | 'invalid' {
  const partial = new Set(series.partialBucketIndexes)
  if (condition.against === 'previous-period') {
    const value = series.previousPeriodPoints?.[testedIndex]
    if (value === null || value === undefined) return null
    // The prior window's own calendar date is not reconstructed here — the
    // resolver never exposes it per-series, only the current window's
    // `buckets` — so the nominal (current) bucket anchors the evidence.
    return { value, bucketStart: series.buckets[testedIndex]! }
  }
  if (condition.against === 'same-bucket-previous-week' && grain !== 'day') return 'invalid'
  const refIdx = condition.against === 'previous-bucket' ? testedIndex - 1 : testedIndex - 7
  if (refIdx < 0 || partial.has(refIdx)) return null
  const value = series.points[refIdx]
  if (value === null || value === undefined) return null
  return { value, bucketStart: series.buckets[refIdx]! }
}

function evaluateStatic(
  condition: Extract<AlertCondition, { kind: 'static' }>,
  series: ResolvedSeries,
  now: IsoDateTime,
): AlertConditionEvaluation {
  const idx = lastCompleteIndex(series.buckets.length, series.partialBucketIndexes)
  if (idx === -1 || series.points[idx] === null) return empty(now, 'no-complete-bucket')
  const value = series.points[idx] as number
  const fires = compareStatic(value, condition.comparator, condition.threshold)
  return {
    evaluatedAt: now,
    outcome: fires ? 'would-fire' : 'would-not-fire',
    bucketStart: series.buckets[idx]!,
    value,
    threshold: condition.threshold,
    reference: null,
    band: null,
    missingCount: null,
  }
}

function evaluateRelative(
  condition: Extract<AlertCondition, { kind: 'relative' }>,
  series: ResolvedSeries,
  rule: AlertRule,
  now: IsoDateTime,
): AlertConditionEvaluation {
  const idx = lastCompleteIndex(series.buckets.length, series.partialBucketIndexes)
  if (idx === -1 || series.points[idx] === null) return empty(now, 'no-complete-bucket')
  const value = series.points[idx] as number
  const bucketStart = series.buckets[idx]!

  const ref = reference(condition, series, idx, rule.evaluationGrain)
  if (ref === 'invalid') {
    return { evaluatedAt: now, outcome: 'invalid-condition', bucketStart, value, threshold: condition.amount, reference: null, band: null, missingCount: null }
  }
  if (ref === null) {
    return { evaluatedAt: now, outcome: 'no-baseline', bucketStart, value, threshold: condition.amount, reference: null, band: null, missingCount: null }
  }

  const change =
    condition.measure === 'delta'
      ? difference([value], [ref.value])[0]
      : percentChange([value], [ref.value])[0]
  // `percentChange` nulls a zero baseline (transforms.ts) — that is this
  // condition's `no-baseline` too, not a divide-by-zero the caller sees.
  if (change === null || change === undefined) {
    return { evaluatedAt: now, outcome: 'no-baseline', bucketStart, value, threshold: condition.amount, reference: ref, band: null, missingCount: null }
  }

  const fires = relativeFires(change, condition.direction, condition.amount)
  return {
    evaluatedAt: now,
    outcome: fires ? 'would-fire' : 'would-not-fire',
    bucketStart,
    value,
    threshold: condition.amount,
    reference: ref,
    band: null,
    missingCount: null,
  }
}

function evaluateAnomaly(
  condition: Extract<AlertCondition, { kind: 'anomaly' }>,
  series: ResolvedSeries,
  rule: AlertRule,
  now: IsoDateTime,
): AlertConditionEvaluation {
  const idx = lastCompleteIndex(series.buckets.length, series.partialBucketIndexes)
  if (idx === -1 || series.points[idx] === null) return empty(now, 'no-complete-bucket')
  const value = series.points[idx] as number
  const bucketStart = series.buckets[idx]!

  // `anomalyBandAt` owns the floor, the weekday baseline and the "never the
  // evaluated bucket's own value" rule — not reimplemented here (`anomaly.ts`).
  const band = anomalyBandAt(series.points, series.buckets, series.partialBucketIndexes, idx, {
    confidence: condition.confidence,
    grain: rule.evaluationGrain,
    lookback: condition.lookback,
  })
  if (band === null) {
    return { evaluatedAt: now, outcome: 'no-baseline', bucketStart, value, threshold: null, reference: null, band: null, missingCount: null }
  }
  const above = value > band.high
  const below = value < band.low
  const fires = condition.direction === 'above' ? above : condition.direction === 'below' ? below : above || below
  return {
    evaluatedAt: now,
    outcome: fires ? 'would-fire' : 'would-not-fire',
    bucketStart,
    value,
    threshold: null,
    reference: null,
    band,
    missingCount: null,
  }
}

function evaluateMissing(
  condition: Extract<AlertCondition, { kind: 'missing' }>,
  series: ResolvedSeries,
  now: IsoDateTime,
): AlertConditionEvaluation {
  const idxs = lastNCompleteIndexes(series.buckets.length, series.partialBucketIndexes, condition.bucketsMissing)
  if (idxs.length < condition.bucketsMissing) return empty(now, 'no-complete-bucket')
  const nullCount = idxs.filter((i) => series.points[i] === null).length
  const last = idxs[idxs.length - 1]!
  const fires = nullCount === condition.bucketsMissing
  return {
    evaluatedAt: now,
    // `fires` only when every one of the last n complete buckets is `null` —
    // a real `0` among them is a value, not a gap (AC-1223).
    outcome: fires ? 'would-fire' : 'would-not-fire',
    bucketStart: series.buckets[last]!,
    value: series.points[last] ?? null,
    threshold: null,
    reference: null,
    band: null,
    missingCount: nullCount,
  }
}

/** `04-alerting-v2.md` §3: `evaluate(rule, result, now)`, read here as a resolved series rather than the whole `ReportResult` — the caller has already resolved `series-missing` / `series-blocked` before this is reached. */
export function evaluate(rule: AlertRule, series: ResolvedSeries, now: IsoDateTime): AlertConditionEvaluation {
  const condition = alertCondition(rule)
  switch (condition.kind) {
    case 'static':
      return evaluateStatic(condition, series, now)
    case 'relative':
      return evaluateRelative(condition, series, rule, now)
    case 'anomaly':
      return evaluateAnomaly(condition, series, rule, now)
    case 'missing':
      return evaluateMissing(condition, series, now)
  }
}

/**
 * AC-1221's second half: a weekly rule on a daily cadence must transition
 * at most once per new bucket. Called before `machine.nextAlertState` — an
 * unchanged bucket means "nothing new happened," not "the condition held."
 */
export function isNewBucket(bucketStart: IsoDate | null, lastBucketStart: IsoDate | null): boolean {
  if (bucketStart === null) return false
  return bucketStart !== lastBucketStart
}
