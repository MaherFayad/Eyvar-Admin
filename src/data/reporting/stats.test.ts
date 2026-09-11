import { describe as suite, expect, it } from 'vitest'
import { addDays } from './buckets'
import { contribution, correlate, describe, MIN_CORRELATION_PAIRS } from './stats'

const DAY0 = '2026-01-04' // a Sunday — see verify.mjs in the scratch log

function days(n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(DAY0, i))
}

suite('describe — AC-1124', () => {
  it('matches a hand-computed two-point fixture', () => {
    // sorted [5, 15]: median = p50 = 10, p10 = 6, p90 = 14 (linear interpolation)
    // mean = 10, population stdDev = 5, MAD = median(|5-10|, |15-10|) = 5
    const result = describe([5, 15], days(2), 'day')
    expect(result.count).toBe(2)
    expect(result.gapCount).toBe(0)
    expect(result.min).toBe(5)
    expect(result.max).toBe(15)
    expect(result.mean).toBe(10)
    expect(result.median).toBe(10)
    expect(result.p10).toBe(6)
    expect(result.p90).toBe(14)
    expect(result.stdDev).toBe(5)
    expect(result.mad).toBe(5)
    expect(result.first).toEqual({ index: 0, bucket: days(2)[0], value: 5 })
    expect(result.last).toEqual({ index: 1, bucket: days(2)[1], value: 15 })
    // a perfect line through two points: slope 10, r² 1
    expect(result.trend).toEqual({ slope: 10, r2: 1 })
  })

  it('flags the single outlier and only the outlier (hand-computed median/MAD)', () => {
    // median 10.5, MAD 1 (see verify.mjs); 100's modified z-score is ~60.4, every other point's is < 3.5
    const series = [10, 12, 9, 11, 100, 10, 11, 9, 12, 10]
    const result = describe(series, days(series.length), 'day')
    expect(result.median).toBe(10.5)
    expect(result.mad).toBe(1)
    expect(result.mean).toBe(19.4)
    expect(result.outliers).toEqual([4])
  })

  it('does not flag every point of a constant series even though MAD is zero', () => {
    const result = describe(new Array(10).fill(50), days(10), 'day')
    expect(result.mad).toBe(0)
    expect(result.stdDev).toBe(0)
    expect(result.outliers).toEqual([])
    expect(result.changePoints).toEqual([]) // no shift exists in a flat series
  })

  it('answers an all-null series with nulls and zero counts, never a computed value', () => {
    const result = describe([null, null, null], days(3), 'day')
    expect(result.count).toBe(0)
    expect(result.gapCount).toBe(3)
    expect(result.min).toBeNull()
    expect(result.mean).toBeNull()
    expect(result.median).toBeNull()
    expect(result.mad).toBeNull()
    expect(result.first).toBeNull()
    expect(result.last).toBeNull()
    expect(result.trend).toBeNull()
    expect(result.weekdayProfile).toHaveLength(7)
    expect(result.weekdayProfile!.every((w) => w.count === 0 && w.mean === null)).toBe(true)
  })

  it('excludes a partial bucket from every count, never lets it stand in as a value', () => {
    // bucket 2 is partial and carries a value that would otherwise be an outlier
    const series = [10, 10, 999, 10, 10, 10, 10, 10, 10, 10]
    const result = describe(series, days(series.length), 'day', [2])
    expect(result.count).toBe(9)
    expect(result.gapCount).toBe(0)
    expect(result.max).toBe(10)
    expect(result.outliers).toEqual([])
  })

  it('separates every weekday when they genuinely differ (5 full weeks, one distinct value per weekday)', () => {
    const buckets = days(35)
    const points = buckets.map((b) => (new Date(`${b}T00:00:00Z`).getUTCDay() + 1) * 10)
    const result = describe(points, buckets, 'day')
    expect(result.weekdayProfile).toEqual(
      Array.from({ length: 7 }, (_, weekday) => ({ weekday, mean: (weekday + 1) * 10, count: 5 })),
    )
  })

  it('omits the weekday profile below day grain', () => {
    const result = describe([1, 2, 3], days(3), 'week')
    expect(result.weekdayProfile).toBeNull()
  })
})

suite('correlate — AC-1125', () => {
  it('refuses with a typed reason below the minimum pair count', () => {
    const outcome = correlate([1, 2, 3, 4, 5], [1, 2, 3, 4, 5])
    expect(outcome.ok).toBe(false)
    expect(outcome).toEqual({ ok: false, reason: 'insufficient-pairs', pairs: 5 })
  })

  it(`requires at least MIN_CORRELATION_PAIRS (${MIN_CORRELATION_PAIRS}) pairs to proceed`, () => {
    const exact = Array.from({ length: MIN_CORRELATION_PAIRS }, (_, i) => i)
    const outcome = correlate(exact, exact)
    expect(outcome.ok).toBe(true)
  })

  it('reports Pearson, Spearman, n and the causation caveat for a perfectly correlated pair', () => {
    const series = Array.from({ length: 10 }, (_, i) => i + 1)
    const outcome = correlate(series, series)
    if (!outcome.ok) throw new Error('expected ok')
    expect(outcome.pairs).toBe(10)
    expect(outcome.hasGaps).toBe(false)
    expect(outcome.lags).toEqual([{ lag: 0, pearson: 1, spearman: 1, n: 10 }])
    expect(outcome.causationCaveat).toBe('correlation-not-causation')
  })

  it('warns of gaps when either side has a null, without counting the gap as a pair', () => {
    const a = [1, 2, 3, 4, 5, 6, 7, 8, null, 10]
    const b = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]
    const outcome = correlate(a, b)
    if (!outcome.ok) throw new Error('expected ok')
    expect(outcome.pairs).toBe(9)
    expect(outcome.hasGaps).toBe(true)
  })

  it('finds the true lag between a leading series and a lagging one', () => {
    // b[i] = a[i-1]: a and b are anti-correlated at lag 0 and perfectly correlated at lag 1
    const a = [1, 5, 1, 5, 1, 5, 1, 5, 1, 5, 1, 5]
    const b = [5, 1, 5, 1, 5, 1, 5, 1, 5, 1, 5, 1]
    const outcome = correlate(a, b, 2)
    if (!outcome.ok) throw new Error('expected ok')
    expect(outcome.lags).toEqual([
      { lag: 0, pearson: -1, spearman: -1, n: 12 },
      { lag: 1, pearson: 1, spearman: 1, n: 11 },
      { lag: 2, pearson: -1, spearman: -1, n: 10 },
    ])
  })

  it('excludes a partial bucket on either side from the pairing', () => {
    const a = [1, 2, 3, 4, 5, 6, 7, 8, 9]
    const b = [1, 2, 3, 4, 5, 6, 7, 8, 9]
    const outcome = correlate(a, b, 0, [3])
    if (!outcome.ok) throw new Error('expected ok')
    expect(outcome.pairs).toBe(8)
  })
})

suite('contribution — AC-1126', () => {
  it('shares sum to 100% across groups including Other, ranked by absolute delta', () => {
    const result = contribution({
      totalA: 100,
      totalB: 160,
      parts: [
        { groupValue: 'sedan', totalA: 50, totalB: 90 }, // Δ40
        { groupValue: 'suv', totalA: 30, totalB: 40 }, // Δ10
        { groupValue: '__other__', totalA: 20, totalB: 30 }, // Δ10
      ],
    })
    expect(result.totalChange).toBe(60)
    expect(result.parts).toEqual([
      { groupValue: 'sedan', deltaAbs: 40, share: expect.closeTo(66.667, 2), rank: 1 },
      { groupValue: 'suv', deltaAbs: 10, share: expect.closeTo(16.667, 2), rank: 2 },
      { groupValue: '__other__', deltaAbs: 10, share: expect.closeTo(16.667, 2), rank: 3 },
    ])
    const shareSum = result.parts.reduce((sum, p) => sum + (p.share ?? 0), 0)
    expect(shareSum).toBeCloseTo(100, 5)
  })

  it('treats a group missing from one window as zero activity there, not a gap', () => {
    const result = contribution({
      totalA: 100,
      totalB: 120,
      parts: [{ groupValue: 'new-city', totalA: null, totalB: 20 }],
    })
    expect(result.parts[0]!.deltaAbs).toBe(20)
  })

  it('gives a group with no data in either window a null delta, share and rank, sorted last', () => {
    const result = contribution({
      totalA: 100,
      totalB: 110,
      parts: [
        { groupValue: 'active', totalA: 50, totalB: 60 },
        { groupValue: 'unseen', totalA: null, totalB: null },
      ],
    })
    expect(result.parts.at(-1)).toEqual({ groupValue: 'unseen', deltaAbs: null, share: null, rank: null })
  })

  it('returns a null share for every part when the series had no net change', () => {
    const result = contribution({
      totalA: 100,
      totalB: 100,
      parts: [{ groupValue: 'a', totalA: 60, totalB: 40 }, { groupValue: 'b', totalA: 40, totalB: 60 }],
    })
    expect(result.totalChange).toBe(0)
    expect(result.parts.every((p) => p.share === null)).toBe(true)
  })
})
