/**
 * One series over a window, collapsed to one number — and **the catalogue's own
 * declaration is what collapses it.**
 *
 * ## Why this is not a free choice
 *
 * A panel wants a headline figure and a period delta. Picking how to combine
 * buckets is exactly the decision R5-15 was written about: four people computed
 * one metric carefully and got four different populations seven points apart.
 * So nothing is chosen here. `Measure.bucketAggregate` already declares how a
 * bucket's rows collapse to one number, and §6.2 rule 2 says a flow is *"summed
 * if `additive`, otherwise the catalogue's declared aggregate"*. This applies
 * the **same declaration one level up**, across buckets:
 *
 *   `count` · `sum`                     → the sum of the readings
 *   `mean`                              → their mean
 *   `end-of-period` · `cumulative-count` → the last reading. A stock's headline
 *                                          is a level, and summing levels is
 *                                          how a chart becomes confidently
 *                                          wrong.
 *
 * A measure whose aggregate this file does not recognise returns `null` rather
 * than falling back to a sum — a guessed rollup is indistinguishable from a
 * declared one once it is on a card, which is AC-453's rule in a smaller slot.
 *
 * ## Partial buckets are excluded, and gaps are not zeros
 *
 * §3.5 and **AC-818**: a partial bucket is drawn and marked but **left out of
 * the comparison delta**, because a flow measure's current partial bucket is
 * always short and would read as a collapse. A `null` point is a **gap**, not a
 * zero — it is skipped, and it lowers the reading count the panel states rather
 * than dragging a mean towards nothing. A `0` inside coverage is a real zero
 * and counts.
 *
 * ## The base travels with the number
 *
 * `readings` is returned beside `value` and the panel renders both. A number
 * whose base is only in its definition gets quoted without it; a number whose
 * base is on the card next to it does not.
 */

import type { BucketAggregate, ReportSeries } from '@/data/types'

export interface Rollup {
  /** `null` when nothing could be computed — no readings, or an aggregate this file will not guess. */
  value: number | null
  /** How many complete buckets carried a reading. **The base.** */
  readings: number
  /** How many buckets were eligible: every bucket that is not partial. */
  eligible: number
}

export function rollUpSeries(
  series: ReportSeries,
  aggregate: BucketAggregate,
  bucketCount: number,
): Rollup {
  const partial = new Set(series.partialBucketIndexes)
  const readings: number[] = []
  let eligible = 0

  for (let i = 0; i < bucketCount; i += 1) {
    if (partial.has(i)) continue
    eligible += 1
    const point = series.points[i]
    /* `null` and `undefined` are both "no reading". `0` is a reading. */
    if (point === null || point === undefined) continue
    readings.push(point)
  }

  return { value: combine(readings, aggregate), readings: readings.length, eligible }
}

function combine(readings: readonly number[], aggregate: BucketAggregate): number | null {
  if (readings.length === 0) return null
  switch (aggregate) {
    case 'count':
    case 'sum':
      return readings.reduce((total, value) => total + value, 0)
    case 'mean':
      return readings.reduce((total, value) => total + value, 0) / readings.length
    case 'end-of-period':
    case 'cumulative-count':
      return readings[readings.length - 1] ?? null
    default:
      /* Unreachable while `BucketAggregate` is the five above. It is here so a
         sixth member arrives as a missing number rather than as a wrong one. */
      return null
  }
}

/**
 * The period delta, as a signed fraction of the comparison — `0.12` is up 12 %.
 *
 * `null` where there is nothing to compare, and **`null` renders as an em dash,
 * never as `0%` and never as blank** (AC-834). A comparison of zero is a real
 * problem rather than an infinite rise, so it also returns `null`: "up ∞ %" is
 * not a fact an operator can act on.
 */
export function periodDelta(current: number | null, comparison: number | null): number | null {
  if (current === null || comparison === null || comparison === 0) return null
  return (current - comparison) / Math.abs(comparison)
}
