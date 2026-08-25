import { describe, expect, it } from 'vitest'
import { formatMoney } from '../format/money'
import { parseMoneyInput, parseNumericInput, toLatinDigits } from './input'

/** Written as code points so the test says what it means in a diff. */
const ARABIC_INDIC = (digits: string) =>
  digits.replace(/\d/g, (d) => String.fromCharCode(0x0660 + Number(d)))
const EXTENDED_ARABIC_INDIC = (digits: string) =>
  digits.replace(/\d/g, (d) => String.fromCharCode(0x06f0 + Number(d)))
const ARABIC_DECIMAL = String.fromCharCode(0x066b)
const ARABIC_THOUSANDS = String.fromCharCode(0x066c)
const RLM = String.fromCharCode(0x200f)
const LRM = String.fromCharCode(0x200e)
const ALM = String.fromCharCode(0x061c)
const FSI = String.fromCharCode(0x2068)
const PDI = String.fromCharCode(0x2069)
const NBSP = String.fromCharCode(0x00a0)
const NARROW_NBSP = String.fromCharCode(0x202f)
const MINUS = String.fromCharCode(0x2212)

describe('toLatinDigits', () => {
  it('maps both Arabic-Indic ranges', () => {
    expect(toLatinDigits(ARABIC_INDIC('0123456789'))).toBe('0123456789')
    expect(toLatinDigits(EXTENDED_ARABIC_INDIC('0123456789'))).toBe('0123456789')
  })

  it('leaves everything else alone, including Arabic letters', () => {
    expect(toLatinDigits('الرياض')).toBe('الرياض')
    expect(toLatinDigits('12 SAR')).toBe('12 SAR')
    expect(toLatinDigits('')).toBe('')
  })
})

describe('parseNumericInput — the one blank semantic (§8.2.5)', () => {
  it('returns null for blank, not 0 and not the previous value', () => {
    // Legacy `gv()` (:12984) answers 0 here and `numval()` (:6150) answers the
    // stored value. Both are wrong, and they disagree, which is D2's cousin.
    expect(parseNumericInput('')).toBeNull()
    expect(parseNumericInput('   ')).toBeNull()
    expect(parseNumericInput('\t\n')).toBeNull()
  })

  it('distinguishes a typed zero from a blank field', () => {
    expect(parseNumericInput('0')).toBe(0)
    expect(parseNumericInput('0.00')).toBe(0)
    expect(parseNumericInput('')).toBeNull()
  })

  it('returns null rather than 0 for text', () => {
    expect(parseNumericInput('abc')).toBeNull()
    expect(parseNumericInput('12px')).toBeNull()
    expect(parseNumericInput('1.2.3')).toBeNull()
    expect(parseNumericInput('-')).toBeNull()
    expect(parseNumericInput('.')).toBeNull()
    expect(parseNumericInput('+')).toBeNull()
    expect(parseNumericInput('12 SAR')).toBeNull()
  })

  it('rejects exponent notation, so a slipped keystroke cannot become 100,000', () => {
    expect(parseNumericInput('1e5')).toBeNull()
    expect(parseNumericInput('1E5')).toBeNull()
    expect(Number('1e5')).toBe(100000)
  })

  it('rejects Infinity and NaN spellings', () => {
    expect(parseNumericInput('Infinity')).toBeNull()
    expect(parseNumericInput('-Infinity')).toBeNull()
    expect(parseNumericInput('NaN')).toBeNull()
  })

  it('parses signs, fractions and leading/trailing dots', () => {
    expect(parseNumericInput('12')).toBe(12)
    expect(parseNumericInput('12.5')).toBe(12.5)
    expect(parseNumericInput('.5')).toBe(0.5)
    expect(parseNumericInput('12.')).toBe(12)
    expect(parseNumericInput('-12.5')).toBe(-12.5)
    expect(parseNumericInput('+12.5')).toBe(12.5)
  })

  it('accepts group separators, including the ones a paste brings', () => {
    expect(parseNumericInput('1,234')).toBe(1234)
    expect(parseNumericInput('1,234.50')).toBe(1234.5)
    expect(parseNumericInput(`1${NBSP}234`)).toBe(1234)
    expect(parseNumericInput(`1${NARROW_NBSP}234`)).toBe(1234)
    expect(parseNumericInput("1'234")).toBe(1234)
  })

  it('accepts the U+2212 minus that formatMoney emits, so a value round-trips', () => {
    expect(parseNumericInput(`${MINUS}12.5`)).toBe(-12.5)
    const rendered = formatMoney(-123450, { unit: 'none' })
    expect(rendered).toBe(`${MINUS}1,234.50`)
    expect(parseNumericInput(rendered)).toBe(-1234.5)
  })

  it('handles very large and very small magnitudes', () => {
    expect(parseNumericInput('9007199254740991')).toBe(Number.MAX_SAFE_INTEGER)
    expect(parseNumericInput('0.0001')).toBe(0.0001)
  })
})

describe('parseNumericInput — the Arabic path (§9.2)', () => {
  it('reads Arabic-Indic digits, which parseFloat cannot', () => {
    expect(parseNumericInput(ARABIC_INDIC('12'))).toBe(12)
    expect(parseNumericInput(EXTENDED_ARABIC_INDIC('12'))).toBe(12)
    expect(Number.isNaN(parseFloat(ARABIC_INDIC('12')))).toBe(true)
  })

  it('reads the Arabic decimal and thousands separators', () => {
    expect(parseNumericInput(ARABIC_INDIC('12') + ARABIC_DECIMAL + ARABIC_INDIC('5'))).toBe(12.5)
    expect(parseNumericInput(ARABIC_INDIC('1') + ARABIC_THOUSANDS + ARABIC_INDIC('234'))).toBe(1234)
  })

  it('strips the bidi controls a copy-paste out of an RTL paragraph drags along', () => {
    expect(parseNumericInput(`${RLM}12.5`)).toBe(12.5)
    expect(parseNumericInput(`${LRM}12.5${LRM}`)).toBe(12.5)
    expect(parseNumericInput(`${ALM}12.5`)).toBe(12.5)
    expect(parseNumericInput(`${FSI}12.5${PDI}`)).toBe(12.5)
  })

  it('gives the same answer for the Arabic and the Latin spelling of one amount', () => {
    const arabic = `${RLM}${ARABIC_INDIC('1')}${ARABIC_THOUSANDS}${ARABIC_INDIC('234')}${ARABIC_DECIMAL}${ARABIC_INDIC('50')}`
    expect(parseNumericInput(arabic)).toBe(parseNumericInput('1,234.50'))
  })

  it('still rejects Arabic prose', () => {
    expect(parseNumericInput('الرياض')).toBeNull()
  })
})

describe('parseMoneyInput — major units in, integer halalas out (§8.3)', () => {
  it('returns null for blank', () => {
    expect(parseMoneyInput('')).toBeNull()
    expect(parseMoneyInput('  ')).toBeNull()
  })

  it('converts without touching a float', () => {
    expect(parseMoneyInput('19.99')).toBe(1999)
    expect(parseMoneyInput('12.34')).toBe(1234)
    expect(parseMoneyInput('0.01')).toBe(1)
    expect(parseMoneyInput('0.1')).toBe(10)
    expect(parseMoneyInput('482.30')).toBe(48230)
    expect(parseMoneyInput('1,234.50')).toBe(123450)
  })

  it('is exact where value * 100 is not', () => {
    // The reason this is done on the digit string.
    expect(19.99 * 100).not.toBe(1999)
    expect(parseMoneyInput('19.99')).toBe(1999)
    expect(parseMoneyInput('1.005')).toBe(101)
    expect(parseMoneyInput('8.115')).toBe(812)
  })

  it('always returns an integer, so formatMoney never throws on its output', () => {
    for (const raw of ['0', '0.005', '19.99', '1,234.567', '-8.115', '99999.999']) {
      const halalas = parseMoneyInput(raw)
      expect(halalas).not.toBeNull()
      expect(Number.isInteger(halalas)).toBe(true)
      expect(() => formatMoney(halalas as number)).not.toThrow()
    }
  })

  it('rounds a third decimal half-away-from-zero', () => {
    expect(parseMoneyInput('12.344')).toBe(1234)
    expect(parseMoneyInput('12.345')).toBe(1235)
    expect(parseMoneyInput('-12.345')).toBe(-1235)
    expect(parseMoneyInput('12.3456')).toBe(1235)
    expect(parseMoneyInput('0.999')).toBe(100)
  })

  it('handles zero, negative zero and a bare sign', () => {
    expect(parseMoneyInput('0')).toBe(0)
    expect(parseMoneyInput('-0')).toBe(0)
    expect(parseMoneyInput('-0.00')).toBe(0)
    expect(Object.is(parseMoneyInput('-0'), -0)).toBe(false)
    expect(parseMoneyInput('-')).toBeNull()
  })

  it('handles negatives — an overdrawn wallet is a real value', () => {
    expect(parseMoneyInput('-48.30')).toBe(-4830)
    expect(parseMoneyInput(`${MINUS}48.30`)).toBe(-4830)
  })

  it('round-trips through formatMoney', () => {
    for (const halalas of [0, 1, -1, 1234, -123450, 48230, 999999]) {
      expect(parseMoneyInput(formatMoney(halalas, { unit: 'none' }))).toBe(halalas)
    }
  })

  it('reads an Arabic-typed amount', () => {
    const typed = ARABIC_INDIC('19') + ARABIC_DECIMAL + ARABIC_INDIC('99')
    expect(parseMoneyInput(typed)).toBe(1999)
  })

  it('returns null rather than an unsafe integer', () => {
    expect(parseMoneyInput('99999999999999999999')).toBeNull()
    expect(parseMoneyInput('90071992547409.91')).toBe(9007199254740991)
    expect(parseMoneyInput('90071992547409.92')).toBeNull()
  })

  it('rejects text, so a pasted "12.34 SAR" does not become 12 SAR', () => {
    expect(parseMoneyInput('12.34 SAR')).toBeNull()
    expect(parseMoneyInput('SAR 12.34')).toBeNull()
    expect(parseMoneyInput('abc')).toBeNull()
  })
})
