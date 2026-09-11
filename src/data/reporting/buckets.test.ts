import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMonths,
  bucketEndExclusive,
  bucketIndexOf,
  bucketStartOf,
  bucketStarts,
  comparisonWindow,
  countBuckets,
  daysInclusive,
  localDayOf,
  partialBucketIndexes,
  resolvePreset,
  resolveWindow,
} from './buckets'
import type { ReportGrain } from '../types/report'

describe('date <-> shifted epoch', () => {
  it('holds a plain date steady', () => {
    expect(localDayOf('2026-06-25')).toBe('2026-06-25')
  })

  it('rolls a late-UTC instant into the next Riyadh day (AC-1108 boundary direction 1)', () => {
    // Riyadh is UTC+03:00: 21:00 UTC is already local midnight of the next day.
    expect(localDayOf('2026-01-01T21:00:00Z')).toBe('2026-01-02')
  })

  it('keeps an instant just before Riyadh midnight on the earlier day (direction 2)', () => {
    expect(localDayOf('2026-01-01T20:59:00Z')).toBe('2026-01-01')
  })

  it('adds and subtracts days across a month end', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('clamps the day when adding months lands past the shorter month end', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28') // 2026 is not a leap year
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29') // 2024 is
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28')
  })

  it('counts inclusive days, including the degenerate single-day case', () => {
    expect(daysInclusive('2026-06-01', '2026-06-01')).toBe(1)
    expect(daysInclusive('2026-06-01', '2026-06-07')).toBe(7)
  })
})

describe('resolvePreset — existing nine (unchanged)', () => {
  const today = '2026-06-25'

  it('resolves the day and rolling presets', () => {
    expect(resolvePreset('today', today)).toEqual({ from: today, to: today })
    expect(resolvePreset('yesterday', today)).toEqual({ from: '2026-06-24', to: '2026-06-24' })
    expect(resolvePreset('last-7d', today)).toEqual({ from: '2026-06-19', to: today })
    expect(resolvePreset('last-30d', today)).toEqual({ from: '2026-05-27', to: today })
  })

  it('resolves the closed calendar presets', () => {
    expect(resolvePreset('last-month', today)).toEqual({ from: '2026-05-01', to: '2026-05-31' })
    expect(resolvePreset('last-year', today)).toEqual({ from: '2025-01-01', to: '2025-12-31' })
    expect(resolvePreset('last-12-months', today)).toEqual({ from: '2025-06-01', to: '2026-05-31' })
  })
})

describe('resolvePreset — v2 quarter and year presets (AC-1109)', () => {
  it('this-quarter is quarter-to-date', () => {
    expect(resolvePreset('this-quarter', '2026-05-15')).toEqual({ from: '2026-04-01', to: '2026-05-15' })
  })

  it('this-quarter on the first day of a quarter is a one-day window', () => {
    expect(resolvePreset('this-quarter', '2026-07-01')).toEqual({ from: '2026-07-01', to: '2026-07-01' })
  })

  it('last-quarter is the whole closed prior quarter, across a year boundary', () => {
    expect(resolvePreset('last-quarter', '2026-05-15')).toEqual({ from: '2026-01-01', to: '2026-03-31' })
    expect(resolvePreset('last-quarter', '2026-01-15')).toEqual({ from: '2025-10-01', to: '2025-12-31' })
  })

  it('this-year and year-to-date both resolve to Jan 1 through today', () => {
    expect(resolvePreset('this-year', '2026-05-15')).toEqual({ from: '2026-01-01', to: '2026-05-15' })
    expect(resolvePreset('year-to-date', '2026-05-15')).toEqual({ from: '2026-01-01', to: '2026-05-15' })
  })

  it('resolveWindow reaches the same presets through a window', () => {
    expect(resolveWindow({ kind: 'preset', preset: 'last-90d' }, '2026-06-25')).toEqual({
      from: '2026-03-28',
      to: '2026-06-25',
    })
    expect(resolveWindow({ kind: 'absolute', from: '2026-01-01', to: '2026-01-10' }, '2026-06-25')).toEqual({
      from: '2026-01-01',
      to: '2026-01-10',
    })
  })
})

describe('quarter grain — boundaries (AC-1108)', () => {
  it('starts on 1 Jan, 1 Apr, 1 Jul, 1 Oct', () => {
    expect(bucketStartOf('2026-02-14', 'quarter')).toBe('2026-01-01')
    expect(bucketStartOf('2026-04-01', 'quarter')).toBe('2026-04-01')
    expect(bucketStartOf('2026-06-30', 'quarter')).toBe('2026-04-01')
    expect(bucketStartOf('2026-07-01', 'quarter')).toBe('2026-07-01')
    expect(bucketStartOf('2026-11-11', 'quarter')).toBe('2026-10-01')
  })

  it('ends exclusive three months after the start', () => {
    expect(bucketEndExclusive('2026-01-01', 'quarter')).toBe('2026-04-01')
    expect(bucketEndExclusive('2026-10-01', 'quarter')).toBe('2027-01-01')
  })

  it('produces one bucket per quarter across a year', () => {
    expect(bucketStarts('2026-01-01', '2026-12-31', 'quarter')).toEqual([
      '2026-01-01',
      '2026-04-01',
      '2026-07-01',
      '2026-10-01',
    ])
  })

  it('finds the bucket a date falls into with the linear scan', () => {
    const starts = bucketStarts('2026-01-01', '2026-12-31', 'quarter')
    expect(bucketIndexOf('2026-08-15', starts, 'quarter')).toBe(2)
    expect(bucketIndexOf('2025-12-31', starts, 'quarter')).toBe(-1)
  })
})

describe('countBuckets matches bucketStarts().length for every grain, every preset (AC-1108)', () => {
  const grains: Exclude<ReportGrain, 'hour'>[] = ['none', 'day', 'week', 'month', 'quarter']
  const presets = [
    'today',
    'yesterday',
    'last-7d',
    'last-30d',
    'last-90d',
    'last-365d',
    'last-month',
    'last-12-months',
    'last-year',
    'this-quarter',
    'last-quarter',
    'this-year',
    'year-to-date',
  ] as const
  const today = '2026-06-25'

  for (const preset of presets) {
    for (const grain of grains) {
      it(`${preset} × ${grain}`, () => {
        const { from, to } = resolvePreset(preset, today)
        expect(countBuckets(from, to, grain)).toBe(bucketStarts(from, to, grain).length)
      })
    }
  }
})

describe('Riyadh boundaries, both directions, every grain that can straddle one', () => {
  // Riyadh local midnight of a date `d` is `d`-1 day at 21:00 UTC (+03:00 offset).
  it('day: a UTC instant after 21:00 lands on the next Riyadh day, one before does not', () => {
    expect(localDayOf('2026-01-01T20:59:00Z')).toBe('2026-01-01')
    expect(localDayOf('2026-01-01T21:00:00Z')).toBe('2026-01-02')
  })

  it('week: the boundary instant crosses into the Sunday bucket, the one before stays Saturday', () => {
    // 2026-02-01 is a Sunday; Riyadh midnight of it is 2026-01-31T21:00:00Z.
    const before = localDayOf('2026-01-31T20:59:00Z')
    const after = localDayOf('2026-01-31T21:00:00Z')
    expect(bucketStartOf(before, 'week')).toBe('2026-01-25')
    expect(bucketStartOf(after, 'week')).toBe('2026-02-01')
  })

  it('month: the boundary instant crosses into March, the one before stays in February', () => {
    // Riyadh midnight of 2026-03-01 is 2026-02-28T21:00:00Z (2026 is not a leap year).
    const before = localDayOf('2026-02-28T20:59:00Z')
    const after = localDayOf('2026-02-28T21:00:00Z')
    expect(bucketStartOf(before, 'month')).toBe('2026-02-01')
    expect(bucketStartOf(after, 'month')).toBe('2026-03-01')
  })

  it('quarter: the boundary instant crosses into Q2, the one before stays in Q1', () => {
    // Riyadh midnight of 2026-04-01 is 2026-03-31T21:00:00Z.
    const before = localDayOf('2026-03-31T20:59:00Z')
    const after = localDayOf('2026-03-31T21:00:00Z')
    expect(bucketStartOf(before, 'quarter')).toBe('2026-01-01')
    expect(bucketStartOf(after, 'quarter')).toBe('2026-04-01')
  })

  it('year: the boundary instant crosses into the next year, the one before stays in the old one', () => {
    // Riyadh midnight of 2027-01-01 is 2026-12-31T21:00:00Z.
    const before = localDayOf('2026-12-31T20:59:00Z')
    const after = localDayOf('2026-12-31T21:00:00Z')
    expect(bucketStartOf(before, 'quarter')).toBe('2026-10-01')
    expect(bucketStartOf(after, 'quarter')).toBe('2027-01-01')
  })
})

describe('comparisonWindow — existing kinds unchanged', () => {
  it('previous-period shifts by the equal window length', () => {
    expect(comparisonWindow({ from: '2026-06-19', to: '2026-06-25' }, 'previous-period')).toEqual({
      from: '2026-06-12',
      to: '2026-06-18',
    })
  })

  it('previous-year shifts by calendar year, clamping 29 Feb', () => {
    expect(comparisonWindow({ from: '2024-02-29', to: '2024-02-29' }, 'previous-year')).toEqual({
      from: '2023-02-28',
      to: '2023-02-28',
    })
  })
})

describe('comparisonWindow — v2 kinds (AC-1112 support)', () => {
  it('previous-quarter shifts by three calendar months', () => {
    // 30 June minus three months is 30 March, not 31 — addMonths keeps the day
    // number when the target month is long enough, it does not snap to month end.
    expect(comparisonWindow({ from: '2026-04-01', to: '2026-06-30' }, 'previous-quarter')).toEqual({
      from: '2026-01-01',
      to: '2026-03-30',
    })
  })

  it('previous-quarter clamps a month-end day across a shorter month', () => {
    expect(comparisonWindow({ from: '2026-05-31', to: '2026-05-31' }, 'previous-quarter')).toEqual({
      from: '2026-02-28',
      to: '2026-02-28',
    })
  })

  it('fixed returns the named window verbatim, regardless of the current window', () => {
    const fixed = { kind: 'fixed' as const, from: '2025-01-01', to: '2025-01-31' }
    expect(comparisonWindow({ from: '2026-06-01', to: '2026-06-30' }, fixed)).toEqual({
      from: '2025-01-01',
      to: '2025-01-31',
    })
  })
})

describe('fixed comparison length — the primitive AC-1112 is built on', () => {
  it('countBuckets differs for a fixed window of a different length than the current one', () => {
    // AC-1112 itself (`comparison-length`, `reasonParams.required`) is emitted by the
    // planner (plan.ts, out of this work package's file set); this proves the bucket
    // counts the planner compares actually disagree for a mismatched fixed window.
    const current = { from: '2026-06-01', to: '2026-06-30' }
    const fixed = comparisonWindow(current, { kind: 'fixed', from: '2025-01-01', to: '2025-01-10' })
    expect(countBuckets(current.from, current.to, 'day')).toBe(30)
    expect(countBuckets(fixed.from, fixed.to, 'day')).toBe(10)
  })
})

describe('partialBucketIndexes — unchanged', () => {
  it('marks the bucket containing today as partial', () => {
    const buckets = bucketStarts('2026-06-01', '2026-06-25', 'week')
    const idx = partialBucketIndexes(buckets, 'week', { from: '2026-06-01', to: '2026-06-25' }, '2026-06-25')
    expect(idx).toContain(buckets.length - 1)
  })

  it('marks a quarter bucket cut short by the window as partial', () => {
    const buckets = bucketStarts('2026-04-01', '2026-05-15', 'quarter')
    const idx = partialBucketIndexes(buckets, 'quarter', { from: '2026-04-01', to: '2026-05-15' }, '2026-12-01')
    expect(idx).toEqual([0])
  })
})
