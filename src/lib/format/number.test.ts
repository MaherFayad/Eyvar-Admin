import { describe, expect, it } from 'vitest'
import { formatCount, formatRange } from './number'

describe('formatCount', () => {
  it('groups thousands', () => {
    expect(formatCount(4218)).toBe('4,218')
    expect(formatCount(999)).toBe('999')
    expect(formatCount(1_000_000)).toBe('1,000,000')
  })

  it('renders zero as 0 — the "no badge at zero" rule is the badge´s, not the formatter´s', () => {
    // AC-26 says a nav badge renders nothing at zero. That is a render decision;
    // a formatter that refused to format 0 would break `Showing 0 of 0`.
    expect(formatCount(0)).toBe('0')
    expect(formatCount(-0)).toBe('0')
  })

  it('renders a negative count with the locale minus', () => {
    expect(formatCount(-5)).toBe('-5')
  })

  it('uses Western digits in Arabic — AC-73', () => {
    expect(formatCount(4218, 'ar')).toBe('4,218')
    expect(formatCount(4218, 'ar')).not.toMatch(/[٠-٩]/)
  })

  it('reads identically in both languages', () => {
    expect(formatCount(1_234_567, 'ar')).toBe(formatCount(1_234_567, 'en'))
  })

  it('rejects a non-integer count and non-finite input', () => {
    expect(() => formatCount(1.5)).toThrow(/integer/)
    expect(() => formatCount(Number.NaN)).toThrow(/finite/)
  })
})

describe('formatRange', () => {
  it('renders the pagination range with an en dash', () => {
    expect(formatRange(1, 50)).toBe('1–50')
    expect(formatRange(1, 50)).not.toContain('-')
  })

  it('groups both ends', () => {
    expect(formatRange(4201, 4218)).toBe('4,201–4,218')
  })

  it('handles a single-row range', () => {
    expect(formatRange(7, 7)).toBe('7–7')
  })

  it('refuses a reversed range', () => {
    expect(() => formatRange(50, 1)).toThrow(/from <= to/)
  })
})
