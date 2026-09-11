/**
 * Report transforms — §2.3, §2.6. Pure functions over `ReportSeries.points`'
 * shape (`(number | null)[]`), applied by the resolver after aggregation. A gap
 * (`null`) never becomes a `0` (README non-negotiable 3). `percentOfTotal`,
 * `difference` and `percentChange` also null a partial bucket's own output
 * (non-negotiable 4); `cumulative`/`rollingAverage` are not comparisons, so a
 * partial bucket's real value still counts — the renderer marks it separately.
 */

/**
 * A running total across buckets (§2.3). A gap does not reset or zero the total —
 * it carries forward silently — but the gap's own bucket is `null`, never the
 * carried number, so the chart draws the break instead of a flat continuation.
 */
export function cumulative(points: readonly (number | null)[]): (number | null)[] {
  let running = 0
  return points.map((value) => {
    if (value === null) return null
    running += value
    return running
  })
}

/**
 * The trailing `window`-bucket mean, including the current bucket (§2.3's ROLLAVG
 * wording). `null` for the first `window − 1` buckets, and `null` for any bucket
 * whose window contains a gap — averaging around a missing value would invent one,
 * which the gap rule forbids as much as substituting a zero would.
 */
export function rollingAverage(points: readonly (number | null)[], window: number): (number | null)[] {
  if (!Number.isInteger(window) || window < 1) {
    throw new TypeError(`rollingAverage window must be a positive integer, got ${window}`)
  }
  return points.map((_, i) => {
    if (i < window - 1) return null
    let sum = 0
    for (let j = i - window + 1; j <= i; j += 1) {
      const v = points[j]
      if (v === null || v === undefined) return null
      sum += v
    }
    return sum / window
  })
}

/**
 * Each series' bucket value as a share of the sum across every series at that same
 * bucket (a split's groups, `Other` included) — §2.3, AC-1110. A `null` value stays
 * `null`; a bucket where every series is `null`, or whose real total is `0`, has no
 * defined share and every series reads `null` there rather than a divide-by-zero.
 */
export function percentOfTotal(
  series: readonly (readonly (number | null)[])[],
  partialBucketIndexes: readonly number[] = [],
): (number | null)[][] {
  const partial = new Set(partialBucketIndexes)
  const bucketCount = series.reduce((max, s) => Math.max(max, s.length), 0)
  const totals: (number | null)[] = []
  for (let i = 0; i < bucketCount; i += 1) {
    let sum = 0
    let any = false
    for (const s of series) {
      const v = s[i]
      if (v !== null && v !== undefined) {
        sum += v
        any = true
      }
    }
    totals.push(any ? sum : null)
  }
  return series.map((s) =>
    s.map((value, i) => {
      if (partial.has(i) || value === null) return null
      const total = totals[i]
      if (total === null || total === undefined || total === 0) return null
      return (value / total) * 100
    }),
  )
}

/**
 * `comparisonDisplay: 'difference'` (§2.6): `current − comparison`, per bucket, in
 * the current series' unit. `null` where either side is a gap or the bucket is
 * partial (excluded from every comparison — README non-negotiable 4).
 */
export function difference(
  current: readonly (number | null)[],
  comparison: readonly (number | null)[],
  partialBucketIndexes: readonly number[] = [],
): (number | null)[] {
  const partial = new Set(partialBucketIndexes)
  return current.map((c, i) => {
    if (partial.has(i)) return null
    const b = comparison[i] ?? null
    if (c === null || b === null) return null
    return c - b
  })
}

/**
 * `comparisonDisplay: 'percent-change'` (§2.6): `(current − comparison) / |comparison| × 100`.
 * A zero or missing comparison baseline has no percentage — `metrics.ts`'s
 * previous-period rule ("dividing by a zero baseline yields ∞ or NaN … no
 * comparison is the honest answer for a period") applies here unconditionally,
 * since a period comparison is exactly what this is. A partial current bucket
 * is excluded like any comparison.
 */
export function percentChange(
  current: readonly (number | null)[],
  comparison: readonly (number | null)[],
  partialBucketIndexes: readonly number[] = [],
): (number | null)[] {
  const partial = new Set(partialBucketIndexes)
  return current.map((c, i) => {
    if (partial.has(i)) return null
    const b = comparison[i] ?? null
    if (c === null || b === null || b === 0) return null
    return ((c - b) / Math.abs(b)) * 100
  })
}
