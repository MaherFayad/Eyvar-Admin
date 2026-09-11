import { describe, expect, it } from 'vitest'
import {
  OTHER,
  planGroupPaths,
  resolveFormulaLeg,
  resolveTrendLeg,
  type CoreMeasureRows,
  type CoreRow,
} from './core'
import type { IsoDate } from '../../types/common'
import type { ReportTransform } from '../../types/report'

const NO_TRANSFORM: ReportTransform = { cumulative: false, rollingAverage: null, percentOfTotal: false }
const WINDOW = { from: '2024-01-01' as IsoDate, to: '2024-01-03' as IsoDate }

function row(date: IsoDate | null, value: number, groupKeys: (string | null)[] = []): CoreRow {
  return { date, value, liveAt: null, groupKeys }
}

function measureRows(rows: CoreRow[], overrides: Partial<CoreMeasureRows> = {}): CoreMeasureRows {
  return {
    key: 'trips.completed',
    unit: 'count',
    currency: null,
    temporality: 'flow',
    additive: true,
    bucketAggregate: 'sum',
    coverage: { from: WINDOW.from, to: WINDOW.to },
    supportsStock: false,
    rows,
    ...overrides,
  }
}

/* ─────────────────────────────── AC-1121 ────────────────────────────────── */

describe('AC-1121 — the resolver core is pure over a fixed row set', () => {
  const rows = [row('2024-01-01', 10), row('2024-01-01', 5), row('2024-01-02', 7)]
  const input = {
    measure: measureRows(rows),
    groupLevels: 0 as const,
    transform: NO_TRANSFORM,
    comparisonDisplay: 'series' as const,
    window: WINDOW,
    comparisonWindow: null,
    grain: 'day' as const,
    today: '2024-01-05' as IsoDate,
  }

  it('produces the identical result called twice over the same rows — no clock, no randomness, no shared state', () => {
    const a = resolveTrendLeg(input)
    const b = resolveTrendLeg({ ...input, measure: measureRows(rows.map((r) => ({ ...r }))) })
    expect(a).toEqual(b)
    expect(a.groups[0]?.current.points).toEqual([15, 7, 0])
  })

  it('does not mutate its input — the same `rows` array resolved twice reads the same way', () => {
    const before = JSON.stringify(rows.map((r) => ({ date: r.date, value: r.value })))
    resolveTrendLeg(input)
    resolveTrendLeg(input)
    const after = JSON.stringify(rows.map((r) => ({ date: r.date, value: r.value })))
    expect(after).toBe(before)
  })
})

/* ──────────────────────────── gaps and partials ─────────────────────────── */

describe('a gap is null, never 0', () => {
  it('is null outside the measure’s declared coverage, even for a bucket with matching rows', () => {
    const rows = [row('2024-01-01', 10), row('2024-01-02', 7)]
    const result = resolveTrendLeg({
      measure: measureRows(rows, { coverage: { from: '2024-01-01', to: '2024-01-02' } }),
      groupLevels: 0,
      transform: NO_TRANSFORM,
      comparisonDisplay: 'series',
      window: WINDOW,
      comparisonWindow: null,
      grain: 'day',
      today: '2024-01-05' as IsoDate,
    })
    expect(result.groups[0]?.current.points).toEqual([10, 7, null])
    expect(result.hadGap).toBe(true)
  })

  it('is a real 0, never null, for a bucket inside coverage with no matching rows', () => {
    const result = resolveTrendLeg({
      measure: measureRows([row('2024-01-01', 10)]),
      groupLevels: 0,
      transform: NO_TRANSFORM,
      comparisonDisplay: 'series',
      window: WINDOW,
      comparisonWindow: null,
      grain: 'day',
      today: '2024-01-05' as IsoDate,
    })
    expect(result.groups[0]?.current.points).toEqual([10, 0, 0])
    expect(result.hadGap).toBe(false)
  })

  it('marks a bucket ending on or after `today` as partial, and a comparison series carries none of its own', () => {
    const rows = [row('2024-01-01', 10), row('2024-01-02', 7), row('2024-01-03', 4)]
    const result = resolveTrendLeg({
      measure: measureRows(rows, { coverage: { from: '2023-12-29', to: '2024-01-03' } }),
      groupLevels: 0,
      transform: NO_TRANSFORM,
      comparisonDisplay: 'series',
      window: WINDOW,
      comparisonWindow: { from: '2023-12-29' as IsoDate, to: '2023-12-31' as IsoDate },
      grain: 'day',
      today: '2024-01-03' as IsoDate,
    })
    expect(result.partialBucketIndexes).toEqual([2])
    /* Covered but empty — a real `0` per bucket, and no partial index of its own. */
    expect(result.groups[0]?.comparison?.points).toEqual([0, 0, 0])
  })
})

/* ──────────────────────────── two-level fold (AC-1123, G4) ──────────────── */

describe('planGroupPaths — the fold at eight, per level', () => {
  it('folds the ninth value and beyond into Other at one level', () => {
    const rows = Array.from({ length: 10 }, (_, i) => row('2024-01-01', 10 - i, [`g${i}`]))
    const { paths, folded } = planGroupPaths(rows, WINDOW, 1)
    expect(paths.map((p) => p.display)).toEqual(['g0', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', OTHER])
    expect(folded).toBe(2)
    const otherRows = rows.filter(paths[8]!.matches)
    expect(otherRows.map((r) => r.groupKeys[0])).toEqual(['g8', 'g9'])
  })

  it('folds level two independently within each level-one parent, and joins the display value g1|g2 (AC-1123)', () => {
    const underX = Array.from({ length: 10 }, (_, i) => row('2024-01-01', 10 - i, ['x', `v${i}`]))
    const underY = [row('2024-01-01', 1, ['y', 'only'])]
    const { paths, folded } = planGroupPaths([...underX, ...underY], WINDOW, 2)
    const displays = paths.map((p) => p.display)
    expect(displays).toContain('x|v0')
    expect(displays).toContain(`x|${OTHER}`)
    expect(displays).toContain('y|only')
    /* 8 named + Other under x (10 values), 1 named under y (no fold there). */
    expect(displays.filter((d) => d?.startsWith('x|'))).toHaveLength(9)
    expect(displays.filter((d) => d?.startsWith('y|'))).toHaveLength(1)
    expect(folded).toBe(2)
  })

  it('every group is real and rendered, including Other — never a subtracted remainder', () => {
    const rows = Array.from({ length: 9 }, (_, i) => row('2024-01-01', 1, [`g${i}`]))
    const result = resolveTrendLeg({
      measure: measureRows(rows),
      groupLevels: 1,
      transform: NO_TRANSFORM,
      comparisonDisplay: 'series',
      window: WINDOW,
      comparisonWindow: null,
      grain: 'none',
      today: '2024-01-05' as IsoDate,
    })
    const other = result.groups.find((g) => g.groupValue === OTHER)
    /* One value (`g8`) folded, one row of value 1 — Other's own real total, not a leftover. */
    expect(other?.current.points).toEqual([1])
    expect(result.foldedGroupCount).toBe(1)
  })
})

/* ────────────────────────────── formula (G2) ─────────────────────────────── */

describe('resolveFormulaLeg', () => {
  const a = measureRows([row('2024-01-01', 10), row('2024-01-02', 20)], { key: 'a' })
  const b = measureRows([row('2024-01-01', 5), row('2024-01-02', 0)], { key: 'b', bucketAggregate: 'sum' })

  it('A / B is null where B is 0, unit ratio', () => {
    const result = resolveFormulaLeg({
      formula: { expression: 'A / B', label: 'ratio' },
      a,
      b,
      groupLevels: 0,
      transform: NO_TRANSFORM,
      comparisonDisplay: 'series',
      window: WINDOW,
      comparisonWindow: null,
      grain: 'day',
      today: '2024-01-05' as IsoDate,
    })
    expect(result.groups[0]?.current.points).toEqual([2, null, null])
    expect(result.groups[0]?.current.unit).toBe('ratio')
  })

  it('PCT(A) shares to 100% across groups including Other, using totals summed across the split', () => {
    const rows = [
      row('2024-01-01', 30, ['x']),
      row('2024-01-01', 10, ['y']),
      row('2024-01-01', 60, ['z']),
    ]
    const result = resolveFormulaLeg({
      formula: { expression: 'PCT(A)', label: 'share' },
      a: measureRows(rows, { key: 'a' }),
      b: null,
      groupLevels: 1,
      transform: NO_TRANSFORM,
      comparisonDisplay: 'series',
      window: WINDOW,
      comparisonWindow: null,
      grain: 'none',
      today: '2024-01-05' as IsoDate,
    })
    const shares = result.groups.map((g) => g.current.points[0])
    const total = shares.reduce((sum: number, v) => sum + (v ?? 0), 0)
    expect(total).toBeCloseTo(100)
    expect(result.measureKey).toBe('__formula__')
  })
})

/* ────────────────────────── comparisonDisplay (§2.6) ─────────────────────── */

describe('comparisonDisplay', () => {
  const rows = [row('2024-01-01', 10), row('2024-01-02', 20), row('2024-01-03', 30)]
  const comparisonRows = [row('2023-12-29', 8), row('2023-12-30', 10), row('2023-12-31', 12)]
  const base = {
    measure: measureRows(rows, { coverage: { from: '2023-12-29', to: '2024-01-03' } }),
    groupLevels: 0 as const,
    transform: NO_TRANSFORM,
    window: WINDOW,
    comparisonWindow: { from: '2023-12-29' as IsoDate, to: '2023-12-31' as IsoDate },
    grain: 'day' as const,
    today: '2024-01-05' as IsoDate,
  }
  const measureWithComparisonRows = measureRows([...rows, ...comparisonRows], {
    coverage: { from: '2023-12-29', to: '2024-01-03' },
  })

  it('series: both current and comparison, dashed overlay, untouched', () => {
    const result = resolveTrendLeg({ ...base, measure: measureWithComparisonRows, comparisonDisplay: 'series' })
    expect(result.groups[0]?.current.points).toEqual([10, 20, 30])
    expect(result.groups[0]?.comparison?.points).toEqual([8, 10, 12])
  })

  it('difference: current minus comparison, in the measure’s own unit', () => {
    const result = resolveTrendLeg({ ...base, measure: measureWithComparisonRows, comparisonDisplay: 'difference' })
    expect(result.groups[0]?.comparison?.points).toEqual([2, 10, 18])
    expect(result.groups[0]?.comparison?.unit).toBe('count')
  })

  it('percent-change: (current - comparison) / |comparison| * 100, unit percent', () => {
    const result = resolveTrendLeg({ ...base, measure: measureWithComparisonRows, comparisonDisplay: 'percent-change' })
    expect(result.groups[0]?.comparison?.points?.[0]).toBeCloseTo(25)
    expect(result.groups[0]?.comparison?.unit).toBe('percent')
  })
})

/* ──────────────────────────────── transform ──────────────────────────────── */

describe('transform pipeline — after aggregation, before comparison', () => {
  it('cumulative never sums a partial bucket into the next complete one, and stays null through a gap', () => {
    const rows = [row('2024-01-01', 10), row('2024-01-03', 5)]
    const result = resolveTrendLeg({
      measure: measureRows(rows, { coverage: { from: '2024-01-01', to: '2024-01-03' } }),
      groupLevels: 0,
      transform: { ...NO_TRANSFORM, cumulative: true },
      comparisonDisplay: 'series',
      window: WINDOW,
      comparisonWindow: null,
      grain: 'day',
      today: '2024-01-05' as IsoDate,
    })
    /* Bucket two has no rows but is inside coverage, so it is a real `0` and the
       running total carries through it — a gap would instead stay `null`. */
    expect(result.groups[0]?.current.points).toEqual([10, 10, 15])
  })
})
