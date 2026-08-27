import { describe, expect, it } from 'vitest'
import {
  MULTIPLICATION_SIGN,
  formatCount,
  formatDecimal,
  formatPercent,
  formatRange,
  formatRatio,
} from './number'

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

describe('formatDecimal', () => {
  it('holds the precision it is given, including trailing zeros', () => {
    expect(formatDecimal(4.2, 1)).toBe('4.2')
    expect(formatDecimal(7, 1)).toBe('7.0')
    expect(formatDecimal(4.25, 0)).toBe('4')
    expect(formatDecimal(0, 2)).toBe('0.00')
  })

  it('groups thousands like every other number on the page', () => {
    expect(formatDecimal(12345.6, 1)).toBe('12,345.6')
  })

  it('signs a negative with U+2212, never a hyphen — §8.3.2', () => {
    expect(formatDecimal(-4.2, 1)).toBe('\u22124.2')
    expect(formatDecimal(-4.2, 1)).not.toContain('-')
  })

  it('renders negative zero as zero', () => {
    expect(formatDecimal(-0, 1)).toBe('0.0')
  })

  it('uses Western digits in Arabic — §9.2', () => {
    expect(formatDecimal(4.2, 1, 'ar')).toBe('4.2')
    expect(formatDecimal(4.2, 1, 'ar')).not.toMatch(/[٠-٩]/)
  })

  it('refuses a value that is not a finite number', () => {
    expect(() => formatDecimal(Number.NaN, 1)).toThrow(/finite/)
    expect(() => formatDecimal(Number.POSITIVE_INFINITY, 1)).toThrow(/finite/)
  })

  it('refuses a nonsense precision', () => {
    expect(() => formatDecimal(4.2, -1)).toThrow(/precision/)
    expect(() => formatDecimal(4.2, 1.5)).toThrow(/precision/)
  })

  it('handles a very large value', () => {
    expect(formatDecimal(1_234_567_890.5, 1)).toBe('1,234,567,890.5')
  })
})

describe('formatPercent — points in, never a fraction', () => {
  it('drops the decimal when there is not one', () => {
    expect(formatPercent(92)).toBe('92%')
    expect(formatPercent(100)).toBe('100%')
    expect(formatPercent(0)).toBe('0%')
  })

  it('keeps one decimal when the value has one', () => {
    expect(formatPercent(4.5)).toBe('4.5%')
    expect(formatPercent(4.55)).toBe('4.6%')
  })

  it('signs a negative percentage typographically', () => {
    expect(formatPercent(-4)).toBe('\u22124%')
  })

  it('treats 0.92 as under one percent, because points are the unit', () => {
    // The stated contract, asserted so nobody "fixes" it into a fraction.
    expect(formatPercent(0.92)).toBe('0.9%')
  })

  it('reads identically in both languages', () => {
    expect(formatPercent(92, 'ar')).toBe(formatPercent(92, 'en'))
  })

  it('handles a value above 100 — a ratio expressed as a percentage', () => {
    expect(formatPercent(1240)).toBe('1,240%')
  })
})

describe('formatRatio — R4-12', () => {
  it('renders one decimal and U+00D7', () => {
    expect(formatRatio(7)).toBe('7.0\u00D7')
    expect(formatRatio(2.4)).toBe('2.4\u00D7')
    expect(formatRatio(0)).toBe('0.0\u00D7')
  })

  it('uses the multiplication sign, not the letter x and not an asterisk', () => {
    expect(formatRatio(7)).toContain(MULTIPLICATION_SIGN)
    expect(MULTIPLICATION_SIGN).toBe('\u00D7')
    expect(formatRatio(7)).not.toMatch(/[x*]/)
  })

  it('carries no operands — the label names them, never the value', () => {
    // Legacy writes `2.4× demand/supply` into the value (`:6953`), which cannot
    // be right-aligned against another number and cannot be translated.
    expect(formatRatio(2.4)).toBe('2.4\u00D7')
  })

  it('keeps the decimal so a column of ratios aligns', () => {
    expect(formatRatio(7)).toHaveLength(formatRatio(7.4).length)
  })

  it('signs a negative ratio typographically', () => {
    expect(formatRatio(-1.5)).toBe('\u22121.5\u00D7')
  })

  it('reads identically in both languages', () => {
    expect(formatRatio(7.4, 'ar')).toBe(formatRatio(7.4, 'en'))
    expect(formatRatio(7.4, 'ar')).not.toMatch(/[٠-٩]/)
  })

  it('groups a large ratio', () => {
    expect(formatRatio(1234.5)).toBe('1,234.5\u00D7')
  })
})
