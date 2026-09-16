/**
 * Cohort analysis engine (G11), grain-generic across `day`/`week`/`month`.
 * Ages entities under `rolling` (active at N+), `nday` (active at exactly
 * N) or `bracket` (active within an operator's `[lo, hi)`).
 */

import { addDays, bucketStartOf, localDayOf } from './buckets'
import type { IsoDate, IsoDateTime } from '../types/common'

export type CohortGrain = 'day' | 'week' | 'month'
export type CohortMethod = 'rolling' | 'nday' | 'bracket'

export interface CohortRow {
  /** The cohort's own label — `'2026-01'` at `month`, a full date at `day`/`week`. */
  cohortKey: string
  /** The cohort's bucket start, always a full `IsoDate` regardless of grain — what a caller buckets the result on. */
  cohortStart: IsoDate
  size: number
  /** Keyed by the `intervals` this matrix was built with — `'M0'…` for `rolling`/`nday`, `'{lo}-{hi}'` for `bracket`. */
  retentionByInterval: Record<string, number | null>
}

export interface CohortMatrix {
  intervals: string[]
  rows: CohortRow[]
  overallSurvivalRate: number | null
}

export interface CohortMatrixOptions {
  /** Default `'month'` — `buildCohortMatrix`'s original, only-computed grain. */
  grain?: CohortGrain
  /** Default `'rolling'`. */
  method?: CohortMethod
  /** `[lo, hi)` pairs in `grain` units, read only when `method === 'bracket'`. */
  brackets?: readonly [number, number][] | null
}

/**
 * Computes calendar month difference between two ISO dates/datetimes.
 */
export function monthDiff(fromIso: IsoDate | IsoDateTime, toIso: IsoDate | IsoDateTime): number {
  const fromYear = Number(fromIso.slice(0, 4))
  const fromMonth = Number(fromIso.slice(5, 7))
  const toYear = Number(toIso.slice(0, 4))
  const toMonth = Number(toIso.slice(5, 7))

  return (toYear - fromYear) * 12 + (toMonth - fromMonth)
}

/** Whole Riyadh-local calendar days between two dates/datetimes, `to − from`. */
function dayDiff(fromIso: IsoDate | IsoDateTime, toIso: IsoDate | IsoDateTime): number {
  const from = localDayOf(fromIso)
  const to = localDayOf(toIso)
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

/**
 * How many `grain` periods separate two dates — the one function every method
 * below reads age through, so `rolling`, `nday` and `bracket` cannot disagree
 * about what "period 3" means.
 */
export function gapDiff(
  fromIso: IsoDate | IsoDateTime,
  toIso: IsoDate | IsoDateTime,
  grain: CohortGrain,
): number {
  if (grain === 'month') return monthDiff(fromIso, toIso)
  const days = dayDiff(fromIso, toIso)
  return grain === 'week' ? Math.floor(days / 7) : days
}

/** The cohort a `joinedAt` falls into, at `grain` — its label and its bucket's real start date. */
function cohortKeyOf(joinedAt: IsoDate | IsoDateTime, grain: CohortGrain): { key: string; start: IsoDate } {
  const day = localDayOf(joinedAt)
  if (grain === 'month') return { key: day.slice(0, 7), start: `${day.slice(0, 7)}-01` }
  const start = bucketStartOf(day, grain)
  return { key: start, start }
}

/**
 * §6 / AC-1172: `[lo, hi)` brackets overlap when one starts before the
 * other ends. Half-open on purpose — `[[0,7],[7,14]]` is legal, touching;
 * inclusive-inclusive would flag day 7 as belonging to both.
 */
export function bracketsOverlap(brackets: readonly [number, number][]): boolean {
  for (let i = 0; i < brackets.length; i += 1) {
    for (let j = i + 1; j < brackets.length; j += 1) {
      const [aLo, aHi] = brackets[i]!
      const [bLo, bHi] = brackets[j]!
      if (aLo < bHi && bLo < aHi) return true
    }
  }
  return false
}

/**
 * Builds a cohort retention matrix from a population of entities. `today`
 * is required: a cell for a period that hasn't elapsed for a given cohort
 * is `null`, never `0`.
 */
export function buildCohortMatrix<T>(
  entities: readonly T[],
  getJoinedAt: (entity: T) => IsoDate | IsoDateTime,
  getLastActiveAt: (entity: T) => IsoDate | IsoDateTime | null,
  today: IsoDate,
  intervals: string[] = ['M0', 'M1', 'M2', 'M3', 'M6'],
  options: CohortMatrixOptions = {},
): CohortMatrix {
  const grain = options.grain ?? 'month'
  const method = options.method ?? 'rolling'
  const brackets = options.method === 'bracket' ? (options.brackets ?? null) : null

  const cohorts: Record<string, { start: IsoDate; size: number; gaps: number[] }> = {}

  entities.forEach((entity) => {
    const joinedAt = getJoinedAt(entity)
    if (!joinedAt) return
    const { key, start } = cohortKeyOf(joinedAt, grain)
    const cohort = cohorts[key] ?? (cohorts[key] = { start, size: 0, gaps: [] })
    cohort.size += 1

    const lastActiveAt = getLastActiveAt(entity)
    /* No further activity is period 0, not "no data": the join itself is one
       recorded moment, and a subject not seen again is "still here at M0". */
    const gap = lastActiveAt ? Math.max(gapDiff(joinedAt, lastActiveAt, grain), 0) : 0
    cohort.gaps.push(gap)
  })

  const sortedCohortKeys = Object.keys(cohorts).sort()
  const rows: CohortRow[] = sortedCohortKeys.map((cohortKey) => {
    const cohort = cohorts[cohortKey]!
    /* Has this period elapsed for THIS cohort? Per row, never per table — an
       older cohort has lived through periods a newer one has not reached. */
    const elapsed = gapDiff(cohort.start, today, grain)
    const retentionByInterval: Record<string, number | null> = {}

    if (method === 'bracket' && brackets) {
      brackets.forEach(([lo, hi]) => {
        const label = `${lo}-${hi}`
        retentionByInterval[label] =
          elapsed < lo
            ? null
            : Math.round((cohort.gaps.filter((g) => g >= lo && g < hi).length / cohort.size) * 1000) / 10
      })
    } else {
      intervals.forEach((intervalStr) => {
        const n = Number(intervalStr.replace(/^M/, ''))
        if (Number.isNaN(n)) return
        if (n > elapsed) {
          retentionByInterval[intervalStr] = null
          return
        }
        /* `rolling`: still here AT LEAST N periods on — the cumulative curve.
           `nday`: returned on EXACTLY period N — a bump, not a ramp. Both read
           the same `gaps`, so the two methods cannot disagree about who came
           back, only about which periods that counts toward. */
        const active =
          method === 'nday'
            ? cohort.gaps.filter((g) => g === n).length
            : cohort.gaps.filter((g) => g >= n).length
        retentionByInterval[intervalStr] = Math.round((active / cohort.size) * 1000) / 10
      })
    }

    return { cohortKey, cohortStart: cohort.start, size: cohort.size, retentionByInterval }
  })

  const totalEntities = entities.length
  const second = intervals[1] ?? null
  const totalSecondSurviving = second
    ? rows.reduce((sum, r) => {
        const pct = r.retentionByInterval[second]
        return sum + (pct !== null && pct !== undefined ? (pct / 100) * r.size : 0)
      }, 0)
    : 0

  return {
    intervals,
    rows,
    overallSurvivalRate:
      totalEntities > 0 && second ? Math.round((totalSecondSurviving / totalEntities) * 1000) / 10 : null,
  }
}

/** Re-exported so a caller building bracket columns need not reach into `buckets.ts` itself. */
export { addDays }
