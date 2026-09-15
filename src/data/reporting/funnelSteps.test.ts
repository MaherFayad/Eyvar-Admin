/**
 * F-V2-49, F-V2-57 — pure aggregation over `computeFunnelCore`'s own
 * `reachedByRung` shape (`subjectId -> IsoDate`), the mock's contract.
 */

import { describe, expect, it } from 'vitest'
import { DROPOFF_OTHER, dropoffByGroup, medianDaysToNextStep } from './funnelSteps'

const mapOf = (entries: [string, string][]) => new Map(entries)

describe('medianDaysToNextStep', () => {
  it('is the middle delta for an odd count, in days', () => {
    const from = mapOf([['a', '2026-06-01'], ['b', '2026-06-01'], ['c', '2026-06-01']])
    const to = mapOf([['a', '2026-06-02'], ['b', '2026-06-05'], ['c', '2026-06-03']])
    /* deltas: 1, 4, 2 -> sorted 1,2,4 -> median 2 */
    expect(medianDaysToNextStep(from, to)).toBe(2)
  })

  it('averages the two middle deltas for an even count', () => {
    const from = mapOf([['a', '2026-06-01'], ['b', '2026-06-01']])
    const to = mapOf([['a', '2026-06-02'], ['b', '2026-06-04']])
    /* deltas: 1, 3 -> median 2 */
    expect(medianDaysToNextStep(from, to)).toBe(2)
  })

  it('ignores a subject who reached `from` but never `to`', () => {
    const from = mapOf([['a', '2026-06-01'], ['b', '2026-06-01']])
    const to = mapOf([['a', '2026-06-03']])
    expect(medianDaysToNextStep(from, to)).toBe(2)
  })

  it('is `null` with nobody to measure — never zero', () => {
    expect(medianDaysToNextStep(mapOf([]), mapOf([]))).toBeNull()
    expect(medianDaysToNextStep(mapOf([['a', '2026-06-01']]), mapOf([]))).toBeNull()
  })
})

describe('dropoffByGroup', () => {
  it('counts only subjects who reached `previous` but not `current`, by their group', () => {
    const previous = mapOf([['a', '2026-06-01'], ['b', '2026-06-01'], ['c', '2026-06-01']])
    const current = mapOf([['a', '2026-06-02']])
    const groupOf = (id: string) => (id === 'b' ? 'riyadh' : 'jeddah')
    expect(dropoffByGroup(previous, current, groupOf)).toEqual([
      { groupValue: 'jeddah', count: 1 },
      { groupValue: 'riyadh', count: 1 },
    ])
  })

  it('excludes an ungrouped subject rather than inventing a group for them', () => {
    const previous = mapOf([['a', '2026-06-01']])
    const current = mapOf([])
    expect(dropoffByGroup(previous, current, () => null)).toEqual([])
  })

  it('folds the ninth group and beyond into `DROPOFF_OTHER`, ranked by count then key (§7.4)', () => {
    const previous = new Map<string, string>()
    const groups: Record<string, number> = { a: 5, b: 4, c: 4, d: 3, e: 3, f: 2, g: 2, h: 1, i: 1, j: 1 }
    let n = 0
    for (const count of Object.values(groups)) {
      for (let i = 0; i < count; i += 1) {
        previous.set(`s${n}`, '2026-06-01')
        n += 1
      }
    }
    const groupOf = (id: string) => {
      const index = Number(id.slice(1))
      let cursor = 0
      for (const [group, count] of Object.entries(groups)) {
        cursor += count
        if (index < cursor) return group
      }
      return null
    }
    const result = dropoffByGroup(previous, mapOf([]), groupOf)
    expect(result).toHaveLength(9)
    expect(result.slice(0, 8).map((g) => g.groupValue)).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'])
    expect(result[8]).toEqual({ groupValue: DROPOFF_OTHER, count: 2 }) // i:1 + j:1
  })
})
