import { describe, expect, it } from 'vitest'
import { anomalyBandAt, isOutside } from './anomaly'
import { addDays } from './buckets'

const DAY0 = '2026-01-04' // a Sunday

function days(n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(DAY0, i))
}

describe('anomalyBandAt — AC-1127, §2 04-alerting-v2.md', () => {
  it('is null (no-baseline) below the 8-point minimum, including a two-point history', () => {
    const points = [10, 12, null]
    const band = anomalyBandAt(points, days(3), [], 2, { confidence: 95, grain: 'day', lookback: 8 })
    expect(band).toBeNull()
  })

  it('is null for an all-null history', () => {
    const points = new Array(9).fill(null)
    const band = anomalyBandAt(points, days(9), [], 8, { confidence: 95, grain: 'day', lookback: 8 })
    expect(band).toBeNull()
  })

  it('never computes a band from fewer points than it has, even with a generous lookback', () => {
    const points = [1, 2, 3, 4, 5, 6, 7, 100]
    // only 7 prior points exist — below the 8-point floor regardless of `lookback`
    const band = anomalyBandAt(points, days(8), [], 7, { confidence: 95, grain: 'day', lookback: 28 })
    expect(band).toBeNull()
  })

  it('flags an outlier at 95% confidence but not at 99% (hand-computed band, see verify.mjs)', () => {
    // baseline median 100, MAD 1.5 → 95%: [95.5522, 104.4478], 99%: [94.21786, 105.78214]
    const points = [100, 102, 98, 101, 99, 100, 102, 98, 105]
    const bucketDates = days(points.length)
    const band95 = anomalyBandAt(points, bucketDates, [], 8, { confidence: 95, grain: 'week', lookback: 8 })
    const band99 = anomalyBandAt(points, bucketDates, [], 8, { confidence: 99, grain: 'week', lookback: 8 })
    expect(band95).not.toBeNull()
    expect(band95!.low).toBeCloseTo(95.5522, 4)
    expect(band95!.high).toBeCloseTo(104.4478, 4)
    expect(band99!.low).toBeCloseTo(94.21786, 4)
    expect(band99!.high).toBeCloseTo(105.78214, 4)
    expect(isOutside(105, band95)).toBe(true)
    expect(isOutside(105, band99)).toBe(false)
  })

  it('does not flag every point of a constant baseline (MAD zero), only a real deviation from it', () => {
    const points = new Array(10).fill(50)
    const bucketDates = days(10)
    const band = anomalyBandAt(points, bucketDates, [], 9, { confidence: 95, grain: 'week', lookback: 9 })
    expect(band!.mad).toBe(0)
    expect(band!.low).toBe(50)
    expect(band!.high).toBe(50)
    expect(isOutside(50, band)).toBe(false) // every baseline point equals the median — none is flagged
    expect(isOutside(60, band)).toBe(true) // a genuine break from the flatline is
  })

  it('uses the weekday baseline at day grain once 4 same-weekday buckets exist, separating it from the rest of the week', () => {
    // every day is 10 except Monday, which is 100 — 5 Mondays across 5 weeks
    const bucketDates = days(35)
    const points = bucketDates.map((b) => (new Date(`${b}T00:00:00Z`).getUTCDay() === 1 ? 100 : 10))
    const mondayIndex = 29 // the 5th Monday; 4 prior Mondays fall inside the 28-bucket lookback
    const band = anomalyBandAt(points, bucketDates, [], mondayIndex, { confidence: 95, grain: 'day', lookback: null })
    expect(band).not.toBeNull()
    expect(band!.weekdayBaseline).toBe(true)
    expect(band!.n).toBe(4)
    expect(band!.median).toBe(100) // not 10 — the mixed-weekday median a non-weekday baseline would give
    expect(isOutside(100, band)).toBe(false) // this Monday is ordinary for a Monday
  })

  it('falls back to the full lookback window when fewer than 4 same-weekday buckets exist', () => {
    const bucketDates = days(9)
    const points = [10, 10, 10, 10, 10, 10, 10, 10, 10]
    // only one prior bucket shares the evaluated bucket's weekday
    const band = anomalyBandAt(points, bucketDates, [], 8, { confidence: 95, grain: 'day', lookback: 8 })
    expect(band!.weekdayBaseline).toBe(false)
    expect(band!.n).toBe(8)
  })

  it('is null for a partial bucket, and a partial bucket is excluded from another bucket’s baseline', () => {
    const points = [10, 10, 10, 10, 10, 10, 10, 10, 999]
    const bucketDates = days(9)
    // bucket 8 is itself partial: no band is drawn for it
    expect(anomalyBandAt(points, bucketDates, [8], 8, { confidence: 95, grain: 'day', lookback: 8 })).toBeNull()
    // a partial bucket earlier in the series never enters someone else's baseline
    const withEarlierPartial = [999, 10, 10, 10, 10, 10, 10, 10, 10, 10]
    const band = anomalyBandAt(withEarlierPartial, days(10), [0], 9, {
      confidence: 95,
      grain: 'day',
      lookback: 9,
    })
    expect(band!.median).toBe(10)
    expect(band!.n).toBe(8) // 9 prior buckets minus the excluded partial
  })
})

describe('isOutside', () => {
  it('is false for a null value or a null (no-baseline) band', () => {
    const band = { low: 0, high: 10, median: 5, mad: 1, n: 8, weekdayBaseline: false }
    expect(isOutside(null, band)).toBe(false)
    expect(isOutside(20, null)).toBe(false)
  })

  it('respects a one-sided direction', () => {
    const band = { low: 0, high: 10, median: 5, mad: 1, n: 8, weekdayBaseline: false }
    expect(isOutside(-5, band, 'above')).toBe(false)
    expect(isOutside(-5, band, 'below')).toBe(true)
    expect(isOutside(15, band, 'below')).toBe(false)
  })
})
