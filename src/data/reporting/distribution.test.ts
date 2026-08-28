import { describe, expect, it } from 'vitest'
import {
  concentrationShare,
  createHistogram,
  median,
  p10,
  p90,
  percentile,
  summarizeDistribution,
} from './distribution'

describe('distribution utilities', () => {
  it('computes percentiles accurately', () => {
    const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
    expect(p10(values)).toBe(19)
    expect(median(values)).toBe(55)
    expect(p90(values)).toBe(91)
    expect(percentile([], 50)).toBeNull()
  })

  it('summarizes distribution', () => {
    const values = [10, 20, 30, 40, 50]
    const summary = summarizeDistribution(values)
    expect(summary.count).toBe(5)
    expect(summary.mean).toBe(30)
    expect(summary.median).toBe(30)
  })

  it('creates histogram bins', () => {
    const values = [5, 12, 18, 25, 33, 48, 52]
    const bins = createHistogram(values, [0, 20, 40, 60], ['0-20', '20-40', '40-60'])
    expect(bins).toHaveLength(3)
    expect(bins[0]!.count).toBe(3) // 5, 12, 18
    expect(bins[1]!.count).toBe(2) // 25, 33
    expect(bins[2]!.count).toBe(2) // 48, 52
  })

  it('computes concentration share', () => {
    const values = [100, 50, 25, 25] // total 200
    expect(concentrationShare(values, 1)).toBe(50) // 100 / 200 = 50%
    expect(concentrationShare(values, 2)).toBe(75) // 150 / 200 = 75%
  })
})
