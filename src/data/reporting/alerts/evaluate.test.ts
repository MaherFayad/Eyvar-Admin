import { describe, expect, it } from 'vitest'
import { evaluate, isNewBucket, type ResolvedSeries } from './evaluate'
import type { AlertRule } from '../../types/alert'

const NOW = '2026-06-25T09:14:00+03:00'

function rule(overrides: Partial<AlertRule> = {}): AlertRule {
  return {
    id: 'ALR-1',
    name: 'Test rule',
    reportId: 'RPT-1',
    seriesId: 'trips.count#none#current',
    comparator: 'gt',
    threshold: 40,
    thresholdUnit: 'count',
    thresholdCurrency: null,
    evaluationGrain: 'day',
    cadence: null,
    minReArmMinutes: null,
    consecutiveFailuresBeforeError: 5,
    state: 'armed',
    enabled: true,
    mutedUntil: null,
    recipientIds: [],
    ownerId: 'U-1',
    notificationPriority: 'high',
    lastEvaluatedAt: null,
    lastFiredAt: null,
    lastValue: null,
    stateReasonKey: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

function series(overrides: Partial<ResolvedSeries> = {}): ResolvedSeries {
  return {
    buckets: ['2026-06-21', '2026-06-22', '2026-06-23', '2026-06-24', '2026-06-25'],
    points: [10, 20, 30, 45, 50],
    partialBucketIndexes: [4],
    ...overrides,
  }
}

describe('evaluate — static', () => {
  it('fires when the most recent complete bucket crosses the threshold', () => {
    const result = evaluate(rule({ comparator: 'gt', threshold: 40 }), series(), NOW)
    expect(result.outcome).toBe('would-fire')
    expect(result.bucketStart).toBe('2026-06-24')
    expect(result.value).toBe(45)
  })

  it('does not fire when the most recent complete bucket is on the legal side', () => {
    const result = evaluate(rule({ comparator: 'gt', threshold: 100 }), series(), NOW)
    expect(result.outcome).toBe('would-not-fire')
  })

  // The partial-bucket non-negotiable: index 4 (today, partial) is never the
  // tested bucket even though it holds the highest value in the fixture.
  it('never evaluates a partial bucket — the tested bucket is the last non-partial one', () => {
    const result = evaluate(
      rule({ comparator: 'gt', threshold: 49 }),
      series({ points: [10, 20, 30, 45, 999], partialBucketIndexes: [4] }),
      NOW,
    )
    expect(result.bucketStart).toBe('2026-06-24')
    expect(result.value).toBe(45)
    expect(result.outcome).toBe('would-not-fire')
  })

  it('a gap at the most recent complete bucket is no-complete-bucket, never treated as 0 or skipped over', () => {
    const result = evaluate(
      rule({ comparator: 'gt', threshold: 0 }),
      series({ points: [10, 20, 30, null, 999], partialBucketIndexes: [4] }),
      NOW,
    )
    expect(result.outcome).toBe('no-complete-bucket')
    expect(result.value).toBeNull()
  })

  it('no-complete-bucket when every bucket is partial', () => {
    const result = evaluate(rule(), series({ partialBucketIndexes: [0, 1, 2, 3, 4] }), NOW)
    expect(result.outcome).toBe('no-complete-bucket')
  })
})

describe('evaluate — relative', () => {
  it('AC-1222: computes against previous-bucket', () => {
    const result = evaluate(
      rule({ condition: { kind: 'relative', direction: 'up', measure: 'delta', amount: 10, against: 'previous-bucket' } }),
      series(),
      NOW,
    )
    expect(result.reference).toEqual({ value: 30, bucketStart: '2026-06-23' })
    expect(result.value).toBe(45)
    expect(result.outcome).toBe('would-fire') // 45 - 30 = 15 >= 10
  })

  it('AC-1222: computes against same-bucket-previous-week at day grain', () => {
    const buckets = Array.from({ length: 9 }, (_, i) => `2026-06-${16 + i}`.padStart(10, '0'))
    const points = [100, 0, 0, 0, 0, 0, 0, 50, 60]
    const result = evaluate(
      rule({
        evaluationGrain: 'day',
        condition: { kind: 'relative', direction: 'down', measure: 'delta', amount: 20, against: 'same-bucket-previous-week' },
      }),
      series({ buckets, points, partialBucketIndexes: [8] }),
      NOW,
    )
    // tested index 7 (value 50), reference index 0 (value 100)
    expect(result.reference).toEqual({ value: 100, bucketStart: buckets[0] })
    expect(result.outcome).toBe('would-fire') // 50 - 100 = -50, down by 50 >= amount 20
  })

  it('AC-1222: refuses same-bucket-previous-week outside day grain', () => {
    const result = evaluate(
      rule({
        evaluationGrain: 'week',
        condition: { kind: 'relative', direction: 'either', measure: 'delta', amount: 1, against: 'same-bucket-previous-week' },
      }),
      series(),
      NOW,
    )
    expect(result.outcome).toBe('invalid-condition')
  })

  it('AC-1222: previous-period reads the report\'s own aligned comparison series, not a second query', () => {
    const result = evaluate(
      rule({ condition: { kind: 'relative', direction: 'up', measure: 'percent', amount: 20, against: 'previous-period' } }),
      series({ points: [10, 20, 30, 45, 100], partialBucketIndexes: [4], previousPeriodPoints: [8, 16, 24, 36, 50] }),
      NOW,
    )
    // tested index 3 (value 45), previousPeriodPoints[3] = 36 -> +25% >= 20%
    expect(result.reference).toEqual({ value: 36, bucketStart: '2026-06-24' })
    expect(result.outcome).toBe('would-fire')
  })

  it('previous-period is no-baseline when the report has no period comparison enabled', () => {
    const result = evaluate(
      rule({ condition: { kind: 'relative', direction: 'up', measure: 'delta', amount: 1, against: 'previous-period' } }),
      series({ previousPeriodPoints: null }),
      NOW,
    )
    expect(result.outcome).toBe('no-baseline')
  })

  it('a zero-baseline percent comparison is no-baseline, not a division error', () => {
    const result = evaluate(
      rule({ condition: { kind: 'relative', direction: 'up', measure: 'percent', amount: 10, against: 'previous-bucket' } }),
      series({ points: [0, 0, 0, 45, 50], partialBucketIndexes: [4] }),
      NOW,
    )
    expect(result.outcome).toBe('no-baseline')
  })

  it('a partial reference bucket is never used as a baseline', () => {
    const result = evaluate(
      rule({ condition: { kind: 'relative', direction: 'up', measure: 'delta', amount: 1, against: 'previous-bucket' } }),
      series({ points: [10, 20, 30, 45, 50], partialBucketIndexes: [3, 4] }),
      NOW,
    )
    // tested index becomes 2 (30); its reference (index 1) is fine, so this asserts the *tested* bucket skips the partial one at 3.
    expect(result.bucketStart).toBe('2026-06-23')
  })
})

describe('evaluate — anomaly', () => {
  // 12 baseline buckets (2026-06-10 … 2026-06-21) — comfortably over the 8-point floor.
  const dayBuckets = Array.from({ length: 12 }, (_, i) => `2026-06-${(10 + i).toString().padStart(2, '0')}`)
  const baseline = [50, 51, 49, 50, 52, 48, 50, 51, 49, 50, 52, 51]
  const testedDate = '2026-06-22'

  it('AC-1230: fewer than 8 baseline points yields no-baseline', () => {
    const buckets = dayBuckets.slice(0, 6)
    const points = [50, 51, 49, 50, 52, 999]
    const result = evaluate(
      rule({ condition: { kind: 'anomaly', direction: 'either', confidence: 95, lookback: null } }),
      series({ buckets, points, partialBucketIndexes: [5] }),
      NOW,
    )
    expect(result.outcome).toBe('no-baseline')
  })

  it('fires when the tested value falls outside the band in the named direction', () => {
    const buckets = [...dayBuckets, testedDate]
    const points = [...baseline, 500]
    const result = evaluate(
      rule({ condition: { kind: 'anomaly', direction: 'above', confidence: 95, lookback: null } }),
      series({ buckets, points, partialBucketIndexes: [] }),
      NOW,
    )
    expect(result.outcome).toBe('would-fire')
    expect(result.band).not.toBeNull()
  })

  it('does not fire when the tested value sits inside the band', () => {
    const buckets = [...dayBuckets, testedDate]
    const points = [...baseline, 50]
    const result = evaluate(
      rule({ condition: { kind: 'anomaly', direction: 'either', confidence: 95, lookback: null } }),
      series({ buckets, points, partialBucketIndexes: [] }),
      NOW,
    )
    expect(result.outcome).toBe('would-not-fire')
  })

  it('never evaluates a partial bucket as the anomaly candidate', () => {
    const buckets = [...dayBuckets, testedDate]
    const points = [...baseline, 500]
    const result = evaluate(
      rule({ condition: { kind: 'anomaly', direction: 'above', confidence: 95, lookback: null } }),
      series({ buckets, points, partialBucketIndexes: [12] }),
      NOW,
    )
    // index 12 (the 500 outlier) is partial and excluded — the tested bucket
    // falls back to index 11, the last baseline point (51), well inside any band.
    expect(result.outcome).toBe('would-not-fire')
    expect(result.bucketStart).toBe(dayBuckets[dayBuckets.length - 1])
  })
})

describe('evaluate — missing', () => {
  it('AC-1223: fires when the last n complete buckets are all null', () => {
    const result = evaluate(
      rule({ condition: { kind: 'missing', bucketsMissing: 3 } }),
      series({ points: [10, null, null, null, 999], partialBucketIndexes: [4] }),
      NOW,
    )
    expect(result.outcome).toBe('would-fire')
    expect(result.missingCount).toBe(3)
  })

  it('AC-1223: does not fire when one of the last n complete buckets is a real 0', () => {
    const result = evaluate(
      rule({ condition: { kind: 'missing', bucketsMissing: 3 } }),
      series({ points: [10, null, 0, null, 999], partialBucketIndexes: [4] }),
      NOW,
    )
    expect(result.outcome).toBe('would-not-fire')
    expect(result.missingCount).toBe(2)
  })

  it('excludes a partial bucket from the counted window rather than treating it as missing', () => {
    const result = evaluate(
      rule({ condition: { kind: 'missing', bucketsMissing: 2 } }),
      series({ points: [10, null, null, null, 999], partialBucketIndexes: [3, 4] }),
      NOW,
    )
    // last 2 complete buckets are indexes 1 and 2 (both null) — index 3 is partial and skipped.
    expect(result.outcome).toBe('would-fire')
    expect(result.bucketStart).toBe('2026-06-23')
  })

  it('no-complete-bucket when there is not yet enough complete history', () => {
    const result = evaluate(
      rule({ condition: { kind: 'missing', bucketsMissing: 10 } }),
      series(),
      NOW,
    )
    expect(result.outcome).toBe('no-complete-bucket')
  })
})

describe('isNewBucket — AC-1221', () => {
  it('is false when the tested bucket has not changed since the last transition', () => {
    expect(isNewBucket('2026-06-24', '2026-06-24')).toBe(false)
  })

  it('is true when the tested bucket has moved on', () => {
    expect(isNewBucket('2026-06-25', '2026-06-24')).toBe(true)
  })

  it('is false when there was no complete bucket to test', () => {
    expect(isNewBucket(null, '2026-06-24')).toBe(false)
  })
})
