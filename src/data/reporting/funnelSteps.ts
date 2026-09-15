/**
 * §5's per-rung detail (F-V2-49, F-V2-57) — pure over the subject dates
 * `computeFunnelCore` (`mock/resolveReport.ts`) already extracts, so the mock
 * can fill `ReportResult.funnelStepDetail` without a second query. Fixture
 * and permission access stay in the mock; this file only aggregates.
 */

import { daysInclusive } from './buckets'
import { OTHER } from './resolve/core'
import type { IsoDate } from '../types/common'
import type { FunnelDropoffGroup } from '../types/report'

/** §7.4's own fold threshold, applied to a rung's drop-off breakdown. */
export const MAX_DROPOFF_GROUPS = 8
/** §7.4's fold bucket — `resolve/core.ts`'s own `OTHER`, not a second sentinel that only agrees with it by coincidence of literal value. */
export const DROPOFF_OTHER = OTHER

/**
 * The median days from `from` to `to`, over subjects present in both — the
 * even-count average of the two middle deltas, `null` with nobody to measure.
 */
export function medianDaysToNextStep(
  from: ReadonlyMap<string, IsoDate>,
  to: ReadonlyMap<string, IsoDate>,
): number | null {
  const deltas: number[] = []
  from.forEach((fromDate, id) => {
    const toDate = to.get(id)
    if (toDate !== undefined) deltas.push(daysInclusive(fromDate, toDate) - 1)
  })
  if (deltas.length === 0) return null
  deltas.sort((a, b) => a - b)
  const mid = Math.floor(deltas.length / 2)
  return deltas.length % 2 === 0 ? (deltas[mid - 1]! + deltas[mid]!) / 2 : deltas[mid]!
}

/**
 * Who reached `previous` but not `current`, grouped by `groupOf`, folded into
 * `DROPOFF_OTHER` past `MAX_DROPOFF_GROUPS` (§7.4, applied to a rung rather
 * than a series). A `null` or `''` group excludes a subject, matching
 * `resolve/core.ts`'s `planGroupPaths` convention for an ungrouped row.
 */
export function dropoffByGroup(
  previous: ReadonlyMap<string, IsoDate>,
  current: ReadonlyMap<string, IsoDate>,
  groupOf: (subjectId: string) => string | null,
): FunnelDropoffGroup[] {
  const counts = new Map<string, number>()
  previous.forEach((_date, id) => {
    if (current.has(id)) return
    const group = groupOf(id)
    if (!group) return
    counts.set(group, (counts.get(group) ?? 0) + 1)
  })
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], ['ar', 'en']))
  if (ranked.length <= MAX_DROPOFF_GROUPS) {
    return ranked.map(([groupValue, count]) => ({ groupValue, count }))
  }
  const top = ranked.slice(0, MAX_DROPOFF_GROUPS).map(([groupValue, count]) => ({ groupValue, count }))
  const folded = ranked.slice(MAX_DROPOFF_GROUPS).reduce((sum, [, count]) => sum + count, 0)
  return [...top, { groupValue: DROPOFF_OTHER, count: folded }]
}
