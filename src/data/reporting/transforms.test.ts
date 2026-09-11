import { describe, expect, it } from 'vitest'
import { cumulative, difference, percentChange, percentOfTotal, rollingAverage } from './transforms'

describe('cumulative', () => {
  it('runs a total across positive, negative and zero values', () => {
    expect(cumulative([1, 2, 3])).toEqual([1, 3, 6])
    expect(cumulative([-5, 10, -20])).toEqual([-5, 5, -15])
    expect(cumulative([0, 0, 0])).toEqual([0, 0, 0])
  })

  it('carries the running total across a gap without inventing a value at the gap (AC-1110)', () => {
    expect(cumulative([10, null, 5])).toEqual([10, null, 15])
  })

  it('stays null while the running total has not started', () => {
    expect(cumulative([null, null, 10])).toEqual([null, null, 10])
  })
})

describe('rollingAverage', () => {
  it('is null until the window has enough buckets, then averages the trailing window', () => {
    expect(rollingAverage([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4])
  })

  it('a window of 1 is just the point itself', () => {
    expect(rollingAverage([4, -2, 0], 1)).toEqual([4, -2, 0])
  })

  it('a gap anywhere in the trailing window makes that position null, and it recovers once the gap ages out', () => {
    expect(rollingAverage([1, 2, null, 4, 5, 6], 3)).toEqual([null, null, null, null, null, 5])
  })

  it('rejects a non-positive or non-integer window', () => {
    expect(() => rollingAverage([1, 2], 0)).toThrow(TypeError)
    expect(() => rollingAverage([1, 2], 1.5)).toThrow(TypeError)
  })
})

describe('percentOfTotal (AC-1110)', () => {
  it('sums to 100 across groups, including Other, for every bucket', () => {
    const [a, b, other] = percentOfTotal([
      [10, 20],
      [30, 40],
      [0, 10],
    ])
    expect(a![0]! + b![0]! + other![0]!).toBeCloseTo(100)
    expect(a![1]! + b![1]! + other![1]!).toBeCloseTo(100)
    expect(a![0]).toBe(25) // 10 / (10+30+0) * 100
    expect(a![1]).toBeCloseTo(28.571, 2) // 20 / (20+40+10) * 100
  })

  it('a null value in one group is null for that group and excluded from the others’ total', () => {
    const [a, b] = percentOfTotal([
      [null, 20],
      [30, 40],
    ])
    expect(a![0]).toBeNull()
    expect(b![0]).toBe(100) // the only real value in that bucket is 100% of the total
    expect(a![1]).toBeCloseTo(33.33, 1)
    expect(b![1]).toBeCloseTo(66.67, 1)
  })

  it('of a null is null, and a bucket whose real total is zero has no defined share', () => {
    const [a, b] = percentOfTotal([
      [0],
      [0],
    ])
    expect(a![0]).toBeNull()
    expect(b![0]).toBeNull()
  })

  it('excludes a partial bucket from every group’s share', () => {
    const [a, b] = percentOfTotal(
      [
        [10, 20],
        [30, 40],
      ],
      [1],
    )
    expect(a![1]).toBeNull()
    expect(b![1]).toBeNull()
    expect(a![0]).toBe(25) // the non-partial bucket is unaffected
  })
})

describe('difference (comparisonDisplay: "difference", AC-1111)', () => {
  it('is current minus comparison, in the current series’ unit', () => {
    expect(difference([10, 20, 30], [5, 15, 25])).toEqual([5, 5, 5])
    expect(difference([5], [10])).toEqual([-5])
  })

  it('is null where the current side is a gap', () => {
    expect(difference([null, 20], [5, 15])).toEqual([null, 5])
  })

  it('is null where the comparison side is a gap', () => {
    expect(difference([10, 20], [null, 15])).toEqual([null, 5])
  })

  it('is null at a partial bucket even when both sides have a value', () => {
    expect(difference([10, 20], [5, 15], [0])).toEqual([null, 5])
  })
})

describe('percentChange (comparisonDisplay: "percent-change", AC-1111)', () => {
  it('is (current - comparison) / |comparison| x 100', () => {
    expect(percentChange([110], [100])[0]).toBeCloseTo(10)
    expect(percentChange([-50], [-100])[0]).toBeCloseTo(50)
  })

  it('percent change from a zero baseline is null, never Infinity — a period comparison has no percentage there', () => {
    expect(percentChange([5], [0])).toEqual([null])
    expect(percentChange([0], [0])).toEqual([null]) // on-target-at-zero is still not a percentage
  })

  it('percent change from a null comparison, or of a null current value, is null', () => {
    expect(percentChange([10], [null])).toEqual([null])
    expect(percentChange([null], [10])).toEqual([null])
  })

  it('is null at a partial bucket even when both sides have a value', () => {
    expect(percentChange([110, 220], [100, 200], [0])).toEqual([null, 10])
  })
})
