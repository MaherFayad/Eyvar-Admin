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

    const matrix = buildCohortMatrix(
      users,
      (u) => u.joinedAt,
      (u) => u.lastActiveAt,
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
})
