import { describe, expect, it } from 'vitest'
import { buildCohortMatrix, monthDiff } from './cohorts'

describe('cohort utilities', () => {
  it('computes month difference accurately', () => {
    expect(monthDiff('2026-01-15', '2026-03-20')).toBe(2)
    expect(monthDiff('2025-12-01', '2026-01-01')).toBe(1)
    expect(monthDiff('2026-06-01', '2026-06-25')).toBe(0)
  })

  it('builds cohort matrix from entity list', () => {
    const users = [
      { id: '1', joinedAt: '2026-01-10', lastActiveAt: '2026-03-15' }, // survived M0, M1, M2
      { id: '2', joinedAt: '2026-01-15', lastActiveAt: '2026-01-20' }, // survived M0 only
      { id: '3', joinedAt: '2026-02-01', lastActiveAt: '2026-03-01' }, // survived M0, M1
    ]

    /* `today` is now required: a cohort cell for a month that has not happened is
       unknown, not zero. 2026-04-01 is far enough past every cohort here that all
       three intervals have elapsed, so the existing expectations are unchanged —
       which is the point. The new behaviour is asserted separately below. */
    const matrix = buildCohortMatrix(
      users,
      (u) => u.joinedAt,
      (u) => u.lastActiveAt,
      '2026-04-01',
      ['M0', 'M1', 'M2'],
    )

    expect(matrix.rows).toHaveLength(2) // '2026-01' and '2026-02'
    const janCohort = matrix.rows.find((r) => r.cohortKey === '2026-01')
    expect(janCohort).toBeDefined()
    expect(janCohort?.size).toBe(2)
    expect(janCohort?.retentionByMonth['M0']).toBe(100)
    expect(janCohort?.retentionByMonth['M1']).toBe(50) // 1 of 2
    expect(janCohort?.retentionByMonth['M2']).toBe(50) // 1 of 2
  })

  it('reports a month that has not happened yet as null, not 0%', () => {
    /* The defect this replaced: on 2026-06-25 the June cohort read
       `100 / 0 / 0 / 0` — and 0% retention is a business emergency, while the
       truth was "ask again in a month". */
    const users = [{ id: '1', joinedAt: '2026-06-02', lastActiveAt: '2026-06-20' }]

    const matrix = buildCohortMatrix(
      users,
      (u) => u.joinedAt,
      (u) => u.lastActiveAt,
      '2026-06-25',
      ['M0', 'M1', 'M2', 'M3'],
    )

    const june = matrix.rows.find((r) => r.cohortKey === '2026-06')
    expect(june?.retentionByMonth['M0']).toBe(100)
    expect(june?.retentionByMonth['M1'], 'M1 has not elapsed').toBeNull()
    expect(june?.retentionByMonth['M2'], 'M2 has not elapsed').toBeNull()
    expect(june?.retentionByMonth['M3'], 'M3 has not elapsed').toBeNull()
  })

  it('cuts per cohort, not per table: an older row keeps the months it has lived', () => {
    const users = [
      { id: 'old', joinedAt: '2026-01-05', lastActiveAt: '2026-05-01' },
      { id: 'new', joinedAt: '2026-06-02', lastActiveAt: '2026-06-20' },
    ]

    const matrix = buildCohortMatrix(
      users,
      (u) => u.joinedAt,
      (u) => u.lastActiveAt,
      '2026-06-25',
      ['M0', 'M3'],
    )

    expect(matrix.rows.find((r) => r.cohortKey === '2026-01')?.retentionByMonth['M3']).toBe(100)
    expect(matrix.rows.find((r) => r.cohortKey === '2026-06')?.retentionByMonth['M3']).toBeNull()
  })
})
