import { describe, expect, it } from 'vitest'
import { bracketsOverlap, buildCohortMatrix, gapDiff, monthDiff } from './cohorts'

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
    expect(janCohort?.retentionByInterval['M0']).toBe(100)
    expect(janCohort?.retentionByInterval['M1']).toBe(50) // 1 of 2
    expect(janCohort?.retentionByInterval['M2']).toBe(50) // 1 of 2
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
    expect(june?.retentionByInterval['M0']).toBe(100)
    expect(june?.retentionByInterval['M1'], 'M1 has not elapsed').toBeNull()
    expect(june?.retentionByInterval['M2'], 'M2 has not elapsed').toBeNull()
    expect(june?.retentionByInterval['M3'], 'M3 has not elapsed').toBeNull()
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

    expect(matrix.rows.find((r) => r.cohortKey === '2026-01')?.retentionByInterval['M3']).toBe(100)
    expect(matrix.rows.find((r) => r.cohortKey === '2026-06')?.retentionByInterval['M3']).toBeNull()
  })
})

/* ──────────────────────────── AC-1171 (grain) ───────────────────────────── */

describe('grain-generic ages (AC-1171)', () => {
  it('ages a day cohort in days, and keys it on its own join date', () => {
    const users = [
      { id: 'same-day', joinedAt: '2026-06-01', lastActiveAt: '2026-06-01' }, // gap 0
      { id: 'three-later', joinedAt: '2026-06-01', lastActiveAt: '2026-06-04' }, // gap 3
    ]
    const matrix = buildCohortMatrix(
      users,
      (u) => u.joinedAt,
      (u) => u.lastActiveAt,
      '2026-06-10',
      ['M0', 'M1', 'M3'],
      { grain: 'day' },
    )
    expect(matrix.rows).toHaveLength(1)
    const row = matrix.rows[0]!
    expect(row.cohortKey).toBe('2026-06-01')
    expect(row.cohortStart).toBe('2026-06-01')
    expect(row.retentionByInterval['M0']).toBe(100)
    expect(row.retentionByInterval['M1']).toBe(50)
    expect(row.retentionByInterval['M3']).toBe(50)
  })

  it('ages a week cohort in weeks, keyed to the week start (WEEK_START_DOW)', () => {
    const users = [
      { id: 'same-week', joinedAt: '2026-06-09', lastActiveAt: '2026-06-09' }, // gap 0 weeks
      { id: 'three-weeks', joinedAt: '2026-06-09', lastActiveAt: '2026-06-30' }, // gap 3 weeks
    ]
    const matrix = buildCohortMatrix(
      users,
      (u) => u.joinedAt,
      (u) => u.lastActiveAt,
      '2026-08-01',
      ['M0', 'M1', 'M3'],
      { grain: 'week' },
    )
    const row = matrix.rows[0]!
    /* 2026-06-09 is a Tuesday; the week it belongs to starts Sunday 2026-06-07. */
    expect(row.cohortKey).toBe('2026-06-07')
    expect(row.retentionByInterval['M0']).toBe(100)
    expect(row.retentionByInterval['M1']).toBe(50)
    expect(row.retentionByInterval['M3']).toBe(50)
  })

  it('a cell beyond the cohort\'s elapsed periods is null at every grain, never 0 (AC-1171)', () => {
    const users = [{ id: 'new', joinedAt: '2026-06-08', lastActiveAt: '2026-06-08' }]
    const matrix = buildCohortMatrix(
      users,
      (u) => u.joinedAt,
      (u) => u.lastActiveAt,
      '2026-06-09',
      ['M0', 'M1'],
      { grain: 'week' },
    )
    expect(matrix.rows[0]?.retentionByInterval['M0']).toBe(100)
    expect(matrix.rows[0]?.retentionByInterval['M1']).toBeNull()
  })

  it('gapDiff agrees with monthDiff at month grain and counts whole days/weeks otherwise', () => {
    expect(gapDiff('2026-01-15', '2026-03-20', 'month')).toBe(monthDiff('2026-01-15', '2026-03-20'))
    expect(gapDiff('2026-06-01', '2026-06-08', 'day')).toBe(7)
    expect(gapDiff('2026-06-01', '2026-06-15', 'week')).toBe(2)
  })
})

/* ──────────────────────────── method (AC-1172) ──────────────────────────── */

describe('method: rolling, nday, bracket', () => {
  it('nday counts a return on EXACTLY the period, not a cumulative one (contrast with rolling)', () => {
    const users = [
      { id: '1', joinedAt: '2026-01-10', lastActiveAt: '2026-03-15' }, // gap 2 months
      { id: '2', joinedAt: '2026-01-15', lastActiveAt: '2026-01-20' }, // gap 0 months
    ]
    const nday = buildCohortMatrix(
      users,
      (u) => u.joinedAt,
      (u) => u.lastActiveAt,
      '2026-04-01',
      ['M0', 'M1', 'M2'],
      { method: 'nday' },
    )
    const row = nday.rows[0]!
    expect(row.retentionByInterval['M0']).toBe(50) // only the gap-0 member
    expect(row.retentionByInterval['M1']).toBe(0) // nobody's LAST activity landed exactly here
    expect(row.retentionByInterval['M2']).toBe(50) // only the gap-2 member

    /* The same users under `rolling` read differently at M1 — cumulative, not exact. */
    const rolling = buildCohortMatrix(
      users,
      (u) => u.joinedAt,
      (u) => u.lastActiveAt,
      '2026-04-01',
      ['M0', 'M1', 'M2'],
      { method: 'rolling' },
    )
    expect(rolling.rows[0]?.retentionByInterval['M1']).toBe(50)
  })

  it('bracket buckets a return into the [lo, hi) window it fell in, half-open at the edge', () => {
    const users = [
      { id: 'a', joinedAt: '2026-06-01', lastActiveAt: '2026-06-02' }, // gap 1 -> [0,3)
      { id: 'b', joinedAt: '2026-06-01', lastActiveAt: '2026-06-06' }, // gap 5 -> [3,7)
      { id: 'c', joinedAt: '2026-06-01', lastActiveAt: null }, // gap 0 -> [0,3)
    ]
    const matrix = buildCohortMatrix(
      users,
      (u) => u.joinedAt,
      (u) => u.lastActiveAt,
      '2026-06-15',
      [],
      { grain: 'day', method: 'bracket', brackets: [[0, 3], [3, 7]] },
    )
    const row = matrix.rows[0]!
    expect(row.retentionByInterval['0-3']).toBeCloseTo(66.7, 1)
    expect(row.retentionByInterval['3-7']).toBeCloseTo(33.3, 1)
  })

  it('a bracket that has not started for a cohort yet is null, not 0', () => {
    const users = [{ id: 'a', joinedAt: '2026-06-01', lastActiveAt: '2026-06-01' }]
    const matrix = buildCohortMatrix(
      users,
      (u) => u.joinedAt,
      (u) => u.lastActiveAt,
      '2026-06-03', // 2 days elapsed
      [],
      { grain: 'day', method: 'bracket', brackets: [[5, 10]] },
    )
    expect(matrix.rows[0]?.retentionByInterval['5-10']).toBeNull()
  })

  it('bracketsOverlap: touching brackets are legal, overlapping ones are not (AC-1172)', () => {
    expect(bracketsOverlap([[0, 7], [7, 14]])).toBe(false)
    expect(bracketsOverlap([[0, 7]])).toBe(false)
    expect(bracketsOverlap([[0, 7], [5, 14]])).toBe(true)
  })
})
