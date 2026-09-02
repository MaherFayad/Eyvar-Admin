/**
 * Cohort analysis engine for Eyvar analytics.
 *
 * Groups entities by signup/creation period (month/quarter) and evaluates activity or retention
 * across subsequent age intervals (M0, M1, M3, M6).
 */

import type { IsoDate, IsoDateTime } from '../types/common'

export interface CohortRow {
  cohortKey: string // e.g. "2026-01"
  size: number
  retentionByMonth: Record<string, number | null> // e.g. { M0: 100, M1: 85.5, M3: 70.2 }
}

export interface CohortMatrix {
  intervals: string[] // ['M0', 'M1', 'M2', 'M3', 'M6']
  rows: CohortRow[]
  overallSurvivalRate: number | null
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

/**
 * Builds a cohort retention matrix from a population of entities.
 */
export function buildCohortMatrix<T>(
  entities: readonly T[],
  getJoinedAt: (entity: T) => IsoDate | IsoDateTime,
  getLastActiveAt: (entity: T) => IsoDate | IsoDateTime | null,
  /**
   * **Today, and it is not optional.** A cohort cell for a month that has not
   * happened yet is unknown, not zero.
   *
   * Without this the June-2026 cohort read `100 / 0 / 0 / 0` on 25 June 2026 —
   * three of twelve rows wrong on screen, and wrong in the most damaging
   * direction, because `0%` retention is a business emergency and the truth was
   * "ask again in a month". The type already allows `null` and the renderer
   * already blanks it; only the arithmetic was missing.
   */
  today: IsoDate,
  intervals = ['M0', 'M1', 'M2', 'M3', 'M6'],
): CohortMatrix {
  const cohorts: Record<string, { size: number; activeAtMonth: Record<number, number> }> = {}

  entities.forEach((entity) => {
    const joinedAt = getJoinedAt(entity)
    if (!joinedAt) return
    const cohortKey = joinedAt.slice(0, 7) // "YYYY-MM"

    if (!cohorts[cohortKey]) {
      cohorts[cohortKey] = { size: 0, activeAtMonth: {} }
    }
    cohorts[cohortKey].size += 1

    const lastActiveAt = getLastActiveAt(entity)
    const survivedMonths = lastActiveAt ? monthDiff(joinedAt, lastActiveAt) : 0

    // Mark as active for all months up to survivedMonths
    for (let m = 0; m <= Math.max(survivedMonths, 0); m += 1) {
      cohorts[cohortKey].activeAtMonth[m] = (cohorts[cohortKey].activeAtMonth[m] ?? 0) + 1
    }
  })

  const sortedCohortKeys = Object.keys(cohorts).sort()
  const rows: CohortRow[] = sortedCohortKeys.map((cohortKey) => {
    const cohort = cohorts[cohortKey]!
    const retentionByMonth: Record<string, number | null> = {}

    intervals.forEach((intervalStr) => {
      const monthNum = Number(intervalStr.replace(/^M/, ''))
      if (Number.isNaN(monthNum)) return

      /* Has this month elapsed for THIS cohort? `M3` is meaningful for a cohort
         that joined four months ago and unknowable for one that joined last
         week — so the cut is per row, never per table. */
      const elapsed = monthDiff(`${cohortKey}-01`, today)
      if (monthNum > elapsed) {
        retentionByMonth[intervalStr] = null
      } else if (cohort.size === 0) {
        retentionByMonth[intervalStr] = null
      } else {
        const active = cohort.activeAtMonth[monthNum] ?? 0
        retentionByMonth[intervalStr] = Math.round((active / cohort.size) * 1000) / 10
      }
    })

    return {
      cohortKey,
      size: cohort.size,
      retentionByMonth,
    }
  })

  const totalEntities = entities.length
  const totalM1Surviving = rows.reduce((sum, r) => {
    const m1Pct = r.retentionByMonth['M1']
    return sum + (m1Pct !== null && m1Pct !== undefined ? (m1Pct / 100) * r.size : 0)
  }, 0)

  return {
    intervals,
    rows,
    overallSurvivalRate: totalEntities > 0 ? Math.round((totalM1Surviving / totalEntities) * 1000) / 10 : null,
  }
}
