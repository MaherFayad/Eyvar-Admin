import { describe, expect, it } from 'vitest'
import { ABSENT, MINUS_SIGN, formatMoney } from './money'

describe('formatMoney', () => {
  it('renders the ISO code trailing, with one space and exactly two decimals', () => {
    expect(formatMoney(4_821_800)).toBe('48,218.00 SAR')
    expect(formatMoney(8650)).toBe('86.50 SAR')
  })

  it('never trims a decimal and never rounds to whole', () => {
    expect(formatMoney(100)).toBe('1.00 SAR')
    expect(formatMoney(105)).toBe('1.05 SAR')
    expect(formatMoney(150)).toBe('1.50 SAR')
  })

  it('groups thousands with a comma', () => {
    expect(formatMoney(421_800)).toBe('4,218.00 SAR')
    expect(formatMoney(100_000_000)).toBe('1,000,000.00 SAR')
  })

  /* ── zero ── */

  it('renders a real zero as 0.00 SAR, never an em dash', () => {
    expect(formatMoney(0)).toBe('0.00 SAR')
    expect(formatMoney(0)).not.toContain(ABSENT)
  })

  it('renders negative zero as 0.00, never −0.00', () => {
    expect(formatMoney(-0)).toBe('0.00 SAR')
  })

  it('never returns the em dash — absence is the caller´s to render', () => {
    for (const amount of [0, 1, -1, 999_999]) {
      expect(formatMoney(amount)).not.toContain(ABSENT)
    }
    // ...and the constant it should use is exported so all 34 screens agree.
    expect(ABSENT).toBe('—')
  })

  /* ── negative, §8.3.2 ── */

  it('uses U+2212, not a hyphen, and sets it against the digits', () => {
    expect(formatMoney(-640)).toBe('−6.40 SAR')
    expect(formatMoney(-640)).toBe(`${MINUS_SIGN}6.40 SAR`)
    expect(formatMoney(-640)).not.toContain('-')
    expect(formatMoney(-640)).not.toMatch(/[()]/)
  })

  it('groups a negative the same way it groups a positive', () => {
    expect(formatMoney(-1_234_567)).toBe('−12,345.67 SAR')
  })

  /* ── the integer-minor-units rule ── */

  it('rejects a float, which is how a major-unit value gets caught', () => {
    expect(() => formatMoney(12.34)).toThrow(/integer minor units/)
    expect(() => formatMoney(0.5)).toThrow(/integer minor units/)
  })

  it('rejects NaN and Infinity rather than rendering them', () => {
    expect(() => formatMoney(Number.NaN)).toThrow(/finite/)
    expect(() => formatMoney(Number.POSITIVE_INFINITY)).toThrow(/finite/)
  })

  /* ── very large ── */

  it('keeps every digit on a value near MAX_SAFE_INTEGER', () => {
    // Integer arithmetic, not `n / 100`: dividing first loses the last digits.
    expect(formatMoney(9_007_199_254_740_991)).toBe('90,071,992,547,409.91 SAR')
  })

  it('keeps the last halala on a large round number', () => {
    expect(formatMoney(1_000_000_000_001)).toBe('10,000,000,000.01 SAR')
  })

  /* ── the table variant, §8.3.1 ── */

  it('omits the unit for a table cell whose header already carries (SAR)', () => {
    expect(formatMoney(8650, { unit: 'none' })).toBe('86.50')
    expect(formatMoney(-640, { unit: 'none' })).toBe('−6.40')
    expect(formatMoney(0, { unit: 'none' })).toBe('0.00')
  })

  /* ── Arabic, AC-73 ── */

  it('reads in the same character order in Arabic as in English', () => {
    // The formatter takes no language on purpose. AC-73: only the cell´s
    // alignment changes in Arabic; the string does not reorder and the digits
    // stay Western.
    const value = formatMoney(421_800)
    expect(value).toBe('4,218.00 SAR')
    expect(value).not.toMatch(/[٠-٩۰-۹]/) // no Arabic-Indic digits
    expect(value).not.toContain('٫') // no Arabic decimal separator
    expect(value).not.toContain('﷼') // never the ﷼ glyph
  })

  it('puts the unit last in every case — the position does not flip', () => {
    expect(formatMoney(100).endsWith('SAR')).toBe(true)
    expect(formatMoney(-100).endsWith('SAR')).toBe(true)
    expect(formatMoney(0).endsWith('SAR')).toBe(true)
  })
})
