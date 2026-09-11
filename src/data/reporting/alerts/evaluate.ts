/**
 * The pure condition evaluator (04-alerting-v2.md §3, spec 06 §12.3):
 * `evaluate(rule, series, now)` decides whether an `AlertCondition` is met.
 * A partial bucket is never the tested bucket, a baseline point, or one of
 * `missing`'s counted buckets; a gap stays `null`, read only by `missing`.
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
 * `AlertCondition.relative`'s comparison window, resolved to a bucket index in
 * the same series — never a second query (`evaluate` is pure, no fetch). Refuses
 * `same-bucket-previous-week` outside `day` grain (AC-1222) instead of silently
 * picking the nearest legal thing.
 */
function referenceIndex(
  against: Extract<AlertCondition, { kind: 'relative' }>['against'],
  testedIndex: number,
  bucketCount: number,
  grain: AlertRule['evaluationGrain'],
): number | 'invalid' {
  if (against === 'previous-bucket') return testedIndex - 1
  if (against === 'same-bucket-previous-week') {
    if (grain !== 'day') return 'invalid'
    return testedIndex - 7
  }
  // 'previous-period': one full window back, the window being the length the
  // report itself was run over (04-alerting-v2.md §2's "the lookback the
  // report used") — i.e. shifted back by the whole result, not one bucket.
  return testedIndex - bucketCount
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

  const refIdx = referenceIndex(condition.against, idx, series.buckets.length, rule.evaluationGrain)
  if (refIdx === 'invalid') {
    return { evaluatedAt: now, outcome: 'invalid-condition', bucketStart, value, threshold: condition.amount, reference: null, band: null, missingCount: null }
  }
  const partial = new Set(series.partialBucketIndexes)
  const refValue = refIdx >= 0 && !partial.has(refIdx) ? series.points[refIdx] : null
  if (refIdx < 0 || refValue === null || refValue === undefined) {
    return { evaluatedAt: now, outcome: 'no-baseline', bucketStart, value, threshold: condition.amount, reference: null, band: null, missingCount: null }
  }
  const reference = { value: refValue, bucketStart: series.buckets[refIdx]! }

  const change =
    condition.measure === 'delta'
      ? difference([value], [reference.value])[0]
      : percentChange([value], [reference.value])[0]
  // `percentChange` nulls a zero baseline (transforms.ts) — that is this
  // condition's `no-baseline` too, not a divide-by-zero the caller sees.
  if (change === null || change === undefined) {
    return { evaluatedAt: now, outcome: 'no-baseline', bucketStart, value, threshold: condition.amount, reference, band: null, missingCount: null }
  }

  const fires = relativeFires(change, condition.direction, condition.amount)
  return {
    evaluatedAt: now,
    outcome: fires ? 'would-fire' : 'would-not-fire',
    bucketStart,
    value,
    threshold: condition.amount,
    reference,
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
 * AC-1221's second half: a weekly rule on a daily cadence must transition at
 * most once per new bucket. The scheduler calls this before feeding an
 * outcome to `machine.nextAlertState` — an unchanged bucket means "nothing
 * new happened," not "the condition held."
 */
export function isNewBucket(bucketStart: IsoDate | null, lastBucketStart: IsoDate | null): boolean {
  if (bucketStart === null) return false
  return bucketStart !== lastBucketStart
}
