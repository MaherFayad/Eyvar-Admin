import { describe, expect, it } from 'vitest'
import { createTranslator } from '../i18n/translate'
import { formatLocalisedText, isMoneyParam, moneyParamsIn } from './localisedText'

const t = createTranslator({
  dictionary: {},
  fallback: {
    'test.plain': 'Nothing happened.',
    'test.money': 'Paid {netHalalas}.',
    'test.mixed': 'Paid {netHalalas} against {reference}.',
    'test.several': 'Paid {netHalalas} — {payableHalalas} less {cashDebtHalalas}.',
    'test.lookalike': 'Reference {reference}.',
  },
})

describe('isMoneyParam — the suffix rule', () => {
  it('marks a param whose name ends in Halalas', () => {
    expect(isMoneyParam('netHalalas')).toBe(true)
    expect(isMoneyParam('cashDebtHalalas')).toBe(true)
  })

  it('leaves everything else alone', () => {
    expect(isMoneyParam('reference')).toBe(false)
    expect(isMoneyParam('gateway')).toBe(false)
    expect(isMoneyParam('destination')).toBe(false)
  })

  it('does not treat the bare suffix as a money param', () => {
    /* `halalas` on its own names a unit, not an amount in one. Requiring a
       prefix keeps the rule "an amount OF something" rather than "the word". */
    expect(isMoneyParam('Halalas')).toBe(false)
  })

  it('is case-sensitive, so `halalas` is not money', () => {
    expect(isMoneyParam('nethalalas')).toBe(false)
  })
})

describe('formatLocalisedText', () => {
  it('resolves a key with no params', () => {
    expect(formatLocalisedText({ key: 'test.plain' }, t)).toBe('Nothing happened.')
  })

  it('formats a money param through formatMoney rather than String()', () => {
    /* The whole reason this module exists. `interpolate` ends in `String(value)`,
       so without it an operator reads `Paid 450000.`
       The code trails the amount — that is `formatMoney`'s convention, not this
       module's, and asserting it here keeps the two in step. */
    expect(formatLocalisedText({ key: 'test.money', params: { netHalalas: 450000 } }, t)).toBe(
      'Paid 4,500.00 SAR.',
    )
  })

  it('formats every money param in a sentence that carries three', () => {
    const out = formatLocalisedText(
      {
        key: 'test.several',
        params: { netHalalas: 450000, payableHalalas: 500000, cashDebtHalalas: 50000 },
      },
      t,
    )
    expect(out).toBe('Paid 4,500.00 SAR — 5,000.00 SAR less 500.00 SAR.')
  })

  it('passes a non-money param through untouched', () => {
    expect(
      formatLocalisedText(
        { key: 'test.mixed', params: { netHalalas: 100, reference: 'DED-9' } },
        t,
      ),
    ).toBe('Paid 1.00 SAR against DED-9.')
  })

  it('never formats a large integer that is not named as money', () => {
    /* A value is not evidence of its unit. `reference: 450000` is an id. */
    expect(
      formatLocalisedText({ key: 'test.lookalike', params: { reference: 450000 } }, t),
    ).toBe('Reference 450000.')
  })

  it('throws on a missing key, the same way `t()` does', () => {
    /* Deliberate. AC-74's dev-time throw is how a key the data layer mints and
       the dictionary lacks gets found; swallowing it here would hide the exact
       defect this module was written in response to. */
    expect(() => formatLocalisedText({ key: 'test.absent' }, t)).toThrow(/Missing translation key/)
  })

  it('throws on a fractional money amount rather than rendering something plausible', () => {
    /* `formatMoney` refuses non-integer minor units, naming DESIGN.md §8.3.1. */
    expect(() =>
      formatLocalisedText({ key: 'test.money', params: { netHalalas: 12.5 } }, t),
    ).toThrow()
  })
})

describe('moneyParamsIn', () => {
  it('reports which params will be formatted, so a fixture can be asserted', () => {
    expect(
      moneyParamsIn({
        key: 'fin.audit.payoutPaid',
        params: { netHalalas: 1, payableHalalas: 2, cashDebtHalalas: 3, reference: 'X' },
      }),
    ).toEqual(['cashDebtHalalas', 'netHalalas', 'payableHalalas'])
  })

  it('returns nothing for a text with no params', () => {
    expect(moneyParamsIn({ key: 'test.plain' })).toEqual([])
  })
})
