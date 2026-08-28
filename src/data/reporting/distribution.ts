/**
 * Statistical, percentile and distribution utilities for Eyvar analytics.
 *
 * Implements P10, median (P50), P90, histogram binning, and concentration metrics.
 * All calculations round cleanly to 1 decimal place or halalas at the source.
 */

/**
 * Calculates the given percentile (0..100) from an array of numbers using linear interpolation.
 * Returns null if the array is empty.
 */
export function percentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  if (p <= 0) return sorted[0]!
  if (p >= 100) return sorted[sorted.length - 1]!

  const index = (p / 100) * (sorted.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  const weight = index - lower

  if (lower === upper) return sorted[lower]!
  const val = sorted[lower]! * (1 - weight) + sorted[upper]! * weight
  return Math.round(val * 10) / 10
}

export function p10(values: readonly number[]): number | null {
  return percentile(values, 10)
}

export function median(values: readonly number[]): number | null {
  return percentile(values, 50)
}

export function p90(values: readonly number[]): number | null {
  return percentile(values, 90)
}

export interface DistributionSummary {
  p10: number | null
  median: number | null
  p90: number | null
  mean: number | null
  count: number
}

export function summarizeDistribution(values: readonly number[]): DistributionSummary {
  if (values.length === 0) {
    return { p10: null, median: null, p90: null, mean: null, count: 0 }
  }
  const sum = values.reduce((acc, v) => acc + v, 0)
  return {
    p10: p10(values),
    median: median(values),
    p90: p90(values),
    mean: Math.round((sum / values.length) * 10) / 10,
    count: values.length,
  }
}

export interface HistogramBin {
  min: number
  max: number
  label: string
  count: number
  fraction: number
}

/**
 * Generates histogram bins for a given numeric series.
 */
export function createHistogram(
  values: readonly number[],
  binEdges: readonly number[],
  labels?: readonly string[],
): HistogramBin[] {
  if (binEdges.length < 2) throw new Error('At least 2 bin edges are required')
  const counts = new Array<number>(binEdges.length - 1).fill(0)

  values.forEach((v) => {
    for (let i = 0; i < binEdges.length - 1; i += 1) {
      const min = binEdges[i]!
      const max = binEdges[i + 1]!
      const isLast = i === binEdges.length - 2
      if ((v >= min && v < max) || (isLast && v >= min && v <= max)) {
        counts[i]! += 1
        break
      }
    }
  })

  const total = values.length
  return counts.map((count, i) => {
    const min = binEdges[i]!
    const max = binEdges[i + 1]!
    const label = labels?.[i] ?? `${min}–${max}`
    return {
      min,
      max,
      label,
      count,
      fraction: total > 0 ? Math.round((count / total) * 1000) / 1000 : 0,
    }
  })
}

/**
 * Computes concentration share: sum of top N items divided by total sum.
 * Returns percentage (0..100).
 */
export function concentrationShare(values: readonly number[], topN: number): number {
  if (values.length === 0) return 0
  const total = values.reduce((sum, v) => sum + v, 0)
  if (total === 0) return 0
  const sorted = [...values].sort((a, b) => b - a)
  const topSum = sorted.slice(0, topN).reduce((sum, v) => sum + v, 0)
  return Math.round((topSum / total) * 1000) / 10
}
