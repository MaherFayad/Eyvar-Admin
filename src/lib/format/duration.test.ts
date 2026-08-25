import { describe, expect, it } from 'vitest'
import { formatDuration } from './duration'

const minutes = (n: number) => n * 60_000
const hours = (n: number) => n * 3_600_000
const days = (n: number) => n * 86_400_000

describe('formatDuration', () => {
  it('renders the three shapes §9.3 permits', () => {
    expect(formatDuration(minutes(12))).toBe('12m')
    expect(formatDuration(hours(3) + minutes(20))).toBe('3h 20m')
    expect(formatDuration(days(2) + hours(4))).toBe('2d 4h')
  })

  it('switches unit exactly at 60 minutes and at 24 hours', () => {
    expect(formatDuration(minutes(59))).toBe('59m')
    expect(formatDuration(minutes(60))).toBe('1h 0m')
    expect(formatDuration(hours(23) + minutes(59))).toBe('23h 59m')
    expect(formatDuration(hours(24))).toBe('1d 0h')
  })

  /* ── zero ── */

  it('renders a true zero as 0m, and nothing else as 0m', () => {
    expect(formatDuration(0)).toBe('0m')
    expect(formatDuration(1)).toBe('1m')
    expect(formatDuration(20_000)).toBe('1m')
  })

  it('rounds up to the minute — the legacy `:14630` rounding bug is not carried across', () => {
    // fmtAge used Math.round, so 20 seconds left rendered `0m` and a live
    // countdown read "0m left" for a whole minute before breaching.
    expect(formatDuration(20_000)).not.toBe('0m')
    expect(formatDuration(minutes(1) + 1)).toBe('2m')
  })

  /* ── negative ── */

  it('takes the magnitude, so an overdue caller cannot forget to negate', () => {
    // Legacy clamped at zero (`Math.max(0, ms)`), forcing twelve call sites to
    // pass `-ms` for the overdue case (`:14797`, `:19234`).
    expect(formatDuration(minutes(-14))).toBe('14m')
    expect(formatDuration(minutes(14))).toBe(formatDuration(minutes(-14)))
    expect(formatDuration(-0)).toBe('0m')
  })

  /* ── very large ── */

  it('keeps counting in days rather than inventing a week or a month', () => {
    expect(formatDuration(days(30) + hours(5))).toBe('30d 5h')
    expect(formatDuration(days(365))).toBe('365d 0h')
  })

  /* ── bad input ── */

  it('throws on NaN and Infinity', () => {
    expect(() => formatDuration(Number.NaN)).toThrow(/finite/)
    expect(() => formatDuration(Number.POSITIVE_INFINITY)).toThrow(/finite/)
  })

  it('never contains a sign or a word — the caller supplies "left" or "overdue"', () => {
    for (const ms of [0, minutes(5), minutes(-5), days(3)]) {
      const out = formatDuration(ms)
      expect(out).not.toContain('-')
      expect(out).not.toContain('−')
      expect(out).not.toContain('left')
      expect(out).not.toContain('overdue')
    }
  })
})
