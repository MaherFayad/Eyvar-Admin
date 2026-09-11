import { describe, expect, it } from 'vitest'
import {
  evaluateFormula,
  formulaUnit,
  parseFormula,
  type FormulaRefInfo,
  type FormulaRefs,
} from './formula'
import { cumulative } from './transforms'

/* ──────────────────────────── fixtures ──────────────────────────────────── */

const COUNT: FormulaRefInfo = { unit: 'count', currency: null, additive: true, temporality: 'flow' }
const COUNT_STOCK: FormulaRefInfo = { unit: 'count', currency: null, additive: true, temporality: 'stock' }
const COUNT_NON_ADDITIVE: FormulaRefInfo = { unit: 'count', currency: null, additive: false, temporality: 'flow' }
const MONEY: FormulaRefInfo = { unit: 'money', currency: 'SAR', additive: true, temporality: 'flow' }
const MINUTES: FormulaRefInfo = { unit: 'minutes', currency: null, additive: false, temporality: 'flow' }

/** Two same-shaped count measures, no split. */
const twoCounts: FormulaRefs = { A: COUNT, B: COUNT, hasSplit: false }
/** One measure only — `B` is unknown. */
const oneCount: FormulaRefs = { A: COUNT, hasSplit: false }
/** Two counts with an active group-by split, for `PCT`. */
const splitCounts: FormulaRefs = { A: COUNT, B: COUNT, hasSplit: true }

describe('parseFormula — grammar coverage (AC-1104)', () => {
  it('parses a bare number', () => {
    expect(parseFormula('100')).toMatchObject({ ok: true, node: { kind: 'number', value: 100 } })
  })

  it('parses a bare ref A', () => {
    expect(parseFormula('A')).toMatchObject({ ok: true, node: { kind: 'ref', ref: 'A' } })
  })

  it('parses a bare ref B', () => {
    expect(parseFormula('B')).toMatchObject({ ok: true, node: { kind: 'ref', ref: 'B' } })
  })

  it('parses A + B', () => {
    expect(parseFormula('A + B')).toMatchObject({ ok: true, node: { kind: 'binary', op: '+' } })
  })

  it('parses A - B', () => {
    expect(parseFormula('A - B')).toMatchObject({ ok: true, node: { kind: 'binary', op: '-' } })
  })

  it('parses A * B', () => {
    expect(parseFormula('A * B')).toMatchObject({ ok: true, node: { kind: 'binary', op: '*' } })
  })

  it('parses A / B', () => {
    expect(parseFormula('A / B')).toMatchObject({ ok: true, node: { kind: 'binary', op: '/' } })
  })

  it('parses A * n (scale by a literal)', () => {
    expect(parseFormula('A * 3')).toMatchObject({ ok: true, node: { kind: 'binary', op: '*' } })
  })

  it('parses A / n (scale by a literal)', () => {
    expect(parseFormula('A / 3')).toMatchObject({ ok: true, node: { kind: 'binary', op: '/' } })
  })

  it('parses ROLLAVG(A, n)', () => {
    expect(parseFormula('ROLLAVG(A, 7)')).toMatchObject({
      ok: true,
      node: { kind: 'call', func: 'ROLLAVG', n: 7, arg: { kind: 'ref', ref: 'A' } },
    })
  })

  it('parses CUMSUM(A)', () => {
    expect(parseFormula('CUMSUM(A)')).toMatchObject({
      ok: true,
      node: { kind: 'call', func: 'CUMSUM', n: null, arg: { kind: 'ref', ref: 'A' } },
    })
  })

  it('parses DELTA(A)', () => {
    expect(parseFormula('DELTA(A)')).toMatchObject({
      ok: true,
      node: { kind: 'call', func: 'DELTA', n: null, arg: { kind: 'ref', ref: 'A' } },
    })
  })

  it('parses PCT(A)', () => {
    expect(parseFormula('PCT(A)')).toMatchObject({
      ok: true,
      node: { kind: 'call', func: 'PCT', n: null, arg: { kind: 'ref', ref: 'A' } },
    })
  })

  it('parses A / B * 100, the documented percent idiom', () => {
    expect(parseFormula('A / B * 100')).toMatchObject({
      ok: true,
      node: { kind: 'binary', op: '*', left: { kind: 'binary', op: '/' }, right: { kind: 'number', value: 100 } },
    })
  })

  it('* and / bind tighter than + and - (A + B * 2 is A + (B * 2))', () => {
    const result = evaluateFormula({ length: 1, A: [1], B: [2] }, 'A + B * 2')
    expect(result).toEqual([5]) // not (A + B) * 2 = 6
  })

  it('parenthesisation overrides precedence ((A + B) * 2)', () => {
    const result = evaluateFormula({ length: 1, A: [1], B: [2] }, '(A + B) * 2')
    expect(result).toEqual([6])
  })

  it('a function argument may itself be a compound expression', () => {
    expect(parseFormula('ROLLAVG(A / B, 3)')).toMatchObject({
      ok: true,
      node: { kind: 'call', func: 'ROLLAVG', n: 3, arg: { kind: 'binary', op: '/' } },
    })
  })

  it('nested parens and functions parse', () => {
    expect(parseFormula('CUMSUM((A + B) / 2)').ok).toBe(true)
  })
})

describe('parseFormula — refusals carry a position and expected token (AC-1104)', () => {
  it('empty expression fails at position 0', () => {
    const result = parseFormula('')
    expect(result).toMatchObject({ ok: false, error: { code: 'formula-parse', position: 0 } })
  })

  it('whitespace-only expression fails at the end of the whitespace', () => {
    const result = parseFormula('   ')
    expect(result).toMatchObject({ ok: false, error: { code: 'formula-parse', position: 3 } })
  })

  it('a trailing operator with no right operand fails at the position past it', () => {
    const result = parseFormula('A /')
    expect(result).toMatchObject({ ok: false, error: { code: 'formula-parse', position: 3 } })
  })

  it('a leading operator with no left operand fails at position 0', () => {
    const result = parseFormula('+ A')
    expect(result).toMatchObject({ ok: false, error: { code: 'formula-parse', position: 0 } })
  })

  it('a doubled operator fails at the second operator', () => {
    const result = parseFormula('A + + B')
    expect(result).toMatchObject({ ok: false, error: { code: 'formula-parse', position: 4 } })
  })

  it('an unclosed paren fails at the end of input', () => {
    const result = parseFormula('(A + B')
    expect(result).toMatchObject({ ok: false, error: { code: 'formula-parse', position: 6, expected: "')'" } })
  })

  it('an unexpected trailing paren fails at that paren', () => {
    const result = parseFormula('A + B)')
    expect(result).toMatchObject({ ok: false, error: { code: 'formula-parse', position: 5 } })
  })

  it('an unknown single-letter reference fails at that letter', () => {
    const result = parseFormula('C')
    expect(result).toMatchObject({ ok: false, error: { code: 'formula-parse', position: 0 } })
  })

  it('an illegal character fails at that character', () => {
    const result = parseFormula('A $ B')
    expect(result).toMatchObject({ ok: false, error: { code: 'formula-parse', position: 2 } })
  })

  it('ROLLAVG without its window argument fails expecting one', () => {
    const result = parseFormula('ROLLAVG(A)')
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'formula-parse', position: 9, expected: "', <window size>'" },
    })
  })

  it('CUMSUM given a window argument it does not take fails at the comma', () => {
    const result = parseFormula('CUMSUM(A, 3)')
    expect(result).toMatchObject({ ok: false, error: { code: 'formula-parse', position: 8, expected: "')'" } })
  })

  it('DELTA given a window argument fails at the comma', () => {
    const result = parseFormula('DELTA(A, 3)')
    expect(result).toMatchObject({ ok: false, error: { code: 'formula-parse', position: 7 } })
  })

  it('PCT given a window argument fails at the comma', () => {
    const result = parseFormula('PCT(A, 3)')
    expect(result).toMatchObject({ ok: false, error: { code: 'formula-parse', position: 5 } })
  })

  it('a function name not followed by ( fails expecting one', () => {
    const result = parseFormula('CUMSUM A')
    expect(result).toMatchObject({ ok: false, error: { code: 'formula-parse', position: 7, expected: "'('" } })
  })

  it('a second decimal point in one number is read as two numbers, which then fails for want of an operator', () => {
    const result = parseFormula('1.2.3')
    expect(result).toMatchObject({ ok: false, error: { code: 'formula-parse', position: 3 } })
  })

  it('a bare decimal point with no digits fails as not a number', () => {
    const result = parseFormula('A + .')
    expect(result).toMatchObject({ ok: false, error: { code: 'formula-parse', position: 4 } })
  })
})

describe('parseFormula — self-referential, unicode digits, very long input', () => {
  it('a self-referential expression (A used against itself) parses', () => {
    expect(parseFormula('A / A').ok).toBe(true)
  })

  it('reads Arabic-Indic digits as a window size', () => {
    // U+0663 U+0664 is Arabic-Indic "34".
    const result = parseFormula('ROLLAVG(A, ٣٤)')
    expect(result).toMatchObject({ ok: true, node: { kind: 'call', n: 34 } })
  })

  it('reports a position in an Arabic-Indic expression using the original string\'s offsets', () => {
    // "٥ + " — Arabic-Indic 5, a trailing "+" with nothing after it.
    const source = '٥ + '
    const result = parseFormula(source)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.position).toBe(source.length)
    }
  })

  it('parses a very long chain of additions', () => {
    const source = Array.from({ length: 200 }, () => 'A').join(' + ')
    const result = parseFormula(source)
    expect(result.ok).toBe(true)
  })

  it('reports a position deep inside a very long expression', () => {
    const source = Array.from({ length: 50 }, () => 'A + B').join(' + ') + ' + $'
    const result = parseFormula(source)
    expect(result).toMatchObject({ ok: false, error: { code: 'formula-parse', position: source.length - 1 } })
  })
})

describe('formulaUnit — the semantics table (AC-1105, AC-1106, AC-1107)', () => {
  it('A / B is unit ratio', () => {
    expect(formulaUnit('A / B', twoCounts)).toMatchObject({ ok: true, unit: 'ratio' })
  })

  it('A / B * 100 is unit percent', () => {
    expect(formulaUnit('A / B * 100', twoCounts)).toMatchObject({ ok: true, unit: 'percent' })
  })

  it('A / B * 2 (not 100) stays a ratio', () => {
    expect(formulaUnit('A / B * 2', twoCounts)).toMatchObject({ ok: true, unit: 'ratio' })
  })

  it('A + B with the same unit is legal, in A\'s unit', () => {
    expect(formulaUnit('A + B', twoCounts)).toMatchObject({ ok: true, unit: 'count' })
  })

  it('A - B with the same unit is legal', () => {
    expect(formulaUnit('A - B', twoCounts)).toMatchObject({ ok: true, unit: 'count' })
  })

  it('A - B with different units is refused with formula-unit', () => {
    const refs: FormulaRefs = { A: COUNT, B: MONEY, hasSplit: false }
    expect(formulaUnit('A - B', refs)).toMatchObject({ ok: false, error: { code: 'formula-unit' } })
  })

  it('A + B with different units is refused with formula-unit', () => {
    const refs: FormulaRefs = { A: COUNT, B: MINUTES, hasSplit: false }
    expect(formulaUnit('A + B', refs)).toMatchObject({ ok: false, error: { code: 'formula-unit' } })
  })

  it('A - B with the same unit but different currency is refused with formula-unit', () => {
    // The catalogue only has SAR today; the cast stands in for a second
    // currency the unit rule must still reject on sight.
    const otherCurrency = { ...MONEY, currency: 'USD' } as unknown as FormulaRefInfo
    const refs: FormulaRefs = { A: MONEY, B: otherCurrency, hasSplit: false }
    expect(formulaUnit('A - B', refs)).toMatchObject({ ok: false, error: { code: 'formula-unit' } })
  })

  it('A * n scales, keeping A\'s unit', () => {
    expect(formulaUnit('A * 3', oneCount)).toMatchObject({ ok: true, unit: 'count' })
  })

  it('A / n scales, keeping A\'s unit', () => {
    expect(formulaUnit('A / 3', oneCount)).toMatchObject({ ok: true, unit: 'count' })
  })

  it('A * B (two measures multiplied) is refused with formula-unit', () => {
    expect(formulaUnit('A * B', twoCounts)).toMatchObject({ ok: false, error: { code: 'formula-unit' } })
  })

  it('B without a second measure is refused with formula-unknown-ref', () => {
    expect(formulaUnit('B', oneCount)).toMatchObject({ ok: false, error: { code: 'formula-unknown-ref', ref: 'B' } })
  })

  it('A - B without a second measure is refused with formula-unknown-ref, not formula-unit', () => {
    expect(formulaUnit('A - B', oneCount)).toMatchObject({ ok: false, error: { code: 'formula-unknown-ref' } })
  })

  it('ROLLAVG(A, n) keeps A\'s unit', () => {
    expect(formulaUnit('ROLLAVG(A, 7)', oneCount)).toMatchObject({ ok: true, unit: 'count' })
  })

  it('CUMSUM on an additive measure is legal', () => {
    expect(formulaUnit('CUMSUM(A)', oneCount)).toMatchObject({ ok: true, unit: 'count' })
  })

  it('CUMSUM on a non-additive measure is refused with formula-needs-additive', () => {
    const refs: FormulaRefs = { A: COUNT_NON_ADDITIVE, hasSplit: false }
    expect(formulaUnit('CUMSUM(A)', refs)).toMatchObject({ ok: false, error: { code: 'formula-needs-additive' } })
  })

  it('CUMSUM of a compound additive expression is legal', () => {
    expect(formulaUnit('CUMSUM(A + B)', twoCounts)).toMatchObject({ ok: true, unit: 'count' })
  })

  it('CUMSUM of a ratio (A / B, not additive) is refused with formula-needs-additive', () => {
    expect(formulaUnit('CUMSUM(A / B)', twoCounts)).toMatchObject({
      ok: false,
      error: { code: 'formula-needs-additive' },
    })
  })

  it('DELTA keeps its argument\'s unit and has no additive requirement', () => {
    const refs: FormulaRefs = { A: COUNT_NON_ADDITIVE, hasSplit: false }
    expect(formulaUnit('DELTA(A)', refs)).toMatchObject({ ok: true, unit: 'count' })
  })

  it('PCT without a split is refused with formula-needs-split', () => {
    expect(formulaUnit('PCT(A)', oneCount)).toMatchObject({ ok: false, error: { code: 'formula-needs-split' } })
  })

  it('PCT with a split is legal and unit percent', () => {
    expect(formulaUnit('PCT(A)', splitCounts)).toMatchObject({ ok: true, unit: 'percent' })
  })

  it('a parse failure surfaces through formulaUnit unchanged', () => {
    expect(formulaUnit('A /', oneCount)).toMatchObject({ ok: false, error: { code: 'formula-parse', position: 3 } })
  })

  it('the first violation found wins, depth-first left to right', () => {
    // A * B fails before DELTA(A) would ever be reached.
    const result = formulaUnit('A * B + DELTA(A)', twoCounts)
    expect(result).toMatchObject({ ok: false, error: { code: 'formula-unit' } })
  })

  it('temporality is flow unless every referenced measure is a stock', () => {
    const bothStock: FormulaRefs = { A: COUNT_STOCK, B: COUNT_STOCK, hasSplit: false }
    const mixed: FormulaRefs = { A: COUNT_STOCK, B: COUNT, hasSplit: false }
    expect(formulaUnit('A + B', bothStock)).toMatchObject({ ok: true, temporality: 'stock' })
    expect(formulaUnit('A + B', mixed)).toMatchObject({ ok: true, temporality: 'flow' })
  })

  it('a constant-only formula is a dimensionless ratio', () => {
    expect(formulaUnit('5 + 3', oneCount)).toMatchObject({ ok: true, unit: 'ratio', currency: null })
  })
})

describe('evaluateFormula — a gap is null, never 0 (every operator)', () => {
  it('+ propagates a null left operand', () => {
    expect(evaluateFormula({ length: 3, A: [null, 1, 2], B: [1, 1, 1] }, 'A + B')).toEqual([null, 2, 3])
  })

  it('+ propagates a null right operand', () => {
    expect(evaluateFormula({ length: 3, A: [1, 2, 3], B: [1, null, 1] }, 'A + B')).toEqual([2, null, 4])
  })

  it('- propagates a null operand', () => {
    expect(evaluateFormula({ length: 2, A: [5, null], B: [2, 2] }, 'A - B')).toEqual([3, null])
  })

  it('* propagates a null operand', () => {
    expect(evaluateFormula({ length: 2, A: [5, null], B: [2, 2] }, 'A * 2')).toEqual([10, null])
  })

  it('/ propagates a null operand', () => {
    expect(evaluateFormula({ length: 2, A: [5, null], B: [2, 2] }, 'A / B')).toEqual([2.5, null])
  })

  it('/ by zero is null, never Infinity', () => {
    expect(evaluateFormula({ length: 2, A: [5, 5], B: [0, 2] }, 'A / B')).toEqual([null, 2.5])
  })

  it('A / B * 100 is null wherever B is null or zero', () => {
    const result = evaluateFormula({ length: 3, A: [1, 1, 1], B: [null, 0, 2] }, 'A / B * 100')
    expect(result).toEqual([null, null, 50])
  })
})

describe('evaluateFormula — ROLLAVG (AC-1107)', () => {
  it('is null for the first n-1 buckets', () => {
    const result = evaluateFormula({ length: 5, A: [1, 2, 3, 4, 5] }, 'ROLLAVG(A, 3)')
    expect(result).toEqual([null, null, 2, 3, 4])
  })

  it('is null across the whole window when any point in it is a gap', () => {
    const result = evaluateFormula({ length: 5, A: [1, 2, null, 4, 5] }, 'ROLLAVG(A, 3)')
    // index 2 (window [1,2,null]), index 3 (window [2,null,4]) and index 4
    // (window [null,4,5]) each touch the gap.
    expect(result).toEqual([null, null, null, null, null])
  })

  it('recovers once the gap has scrolled out of the window', () => {
    const result = evaluateFormula({ length: 6, A: [1, 2, null, 4, 5, 6] }, 'ROLLAVG(A, 2)')
    expect(result[5]).toBe(5.5) // window [5,6], the null is two buckets back
  })
})

describe('evaluateFormula — CUMSUM (carries the running total across a gap, matching transforms.ts — AC-1110)', () => {
  it('accumulates while every point so far is known', () => {
    const result = evaluateFormula({ length: 4, A: [1, 2, 3, 4] }, 'CUMSUM(A)')
    expect(result).toEqual([1, 3, 6, 10])
  })

  it('the gap\'s own bucket is null, but the running total resumes on the next value', () => {
    const result = evaluateFormula({ length: 5, A: [1, 2, null, 4, 5] }, 'CUMSUM(A)')
    expect(result).toEqual([1, 3, null, 7, 12])
  })

  it('a leading gap is null, then the running total starts from the first known value', () => {
    const result = evaluateFormula({ length: 3, A: [null, 1, 2] }, 'CUMSUM(A)')
    expect(result).toEqual([null, 1, 3])
  })

  it('agrees with transforms.ts\'s cumulative over a series with two separate gaps, one leading', () => {
    const points = [null, 1, 2, null, 5, 6]
    const fromTransform = cumulative(points)
    const fromFormula = evaluateFormula({ length: points.length, A: points }, 'CUMSUM(A)')
    expect(fromFormula).toEqual(fromTransform)
  })
})

describe('evaluateFormula — DELTA', () => {
  it('the first bucket is always null', () => {
    const result = evaluateFormula({ length: 3, A: [10, 15, 20] }, 'DELTA(A)')
    expect(result[0]).toBeNull()
  })

  it('is bucket minus previous bucket', () => {
    const result = evaluateFormula({ length: 3, A: [10, 15, 12] }, 'DELTA(A)')
    expect(result).toEqual([null, 5, -3])
  })

  it('is null when either side of the pair is a gap', () => {
    const result = evaluateFormula({ length: 4, A: [10, null, 12, null] }, 'DELTA(A)')
    expect(result).toEqual([null, null, null, null])
  })
})

describe('evaluateFormula — PCT', () => {
  it('is the share of the bucket\'s cross-group total, as a percent', () => {
    const result = evaluateFormula({ length: 2, A: [25, 10], totalA: [100, 50] }, 'PCT(A)')
    expect(result).toEqual([25, 20])
  })

  it('is null where the value is a gap', () => {
    const result = evaluateFormula({ length: 2, A: [null, 10], totalA: [100, 50] }, 'PCT(A)')
    expect(result[0]).toBeNull()
  })

  it('is null where the cross-group total is zero (division by zero)', () => {
    const result = evaluateFormula({ length: 1, A: [0], totalA: [0] }, 'PCT(A)')
    expect(result).toEqual([null])
  })

  it('is null everywhere when the total is not supplied', () => {
    const result = evaluateFormula({ length: 2, A: [25, 10] }, 'PCT(A)')
    expect(result).toEqual([null, null])
  })

  it('PCT(B) reads totalB, independently of totalA', () => {
    const result = evaluateFormula({ length: 1, B: [5], totalB: [20] }, 'PCT(B)')
    expect(result).toEqual([25])
  })

  it('PCT of a compound expression has no cross-group total to divide by, so it is a gap', () => {
    const result = evaluateFormula({ length: 2, A: [1, 2], B: [1, 1], totalA: [10, 10] }, 'PCT(A - B)')
    expect(result).toEqual([null, null])
  })
})

describe('evaluateFormula — self-reference, unknown ref, and non-throwing on bad input', () => {
  it('a self-referential expression (A / A) is 1 wherever A is known and non-zero', () => {
    expect(evaluateFormula({ length: 3, A: [4, 0, null] }, 'A / A')).toEqual([1, null, null])
  })

  it('A - A is 0 wherever A is known', () => {
    expect(evaluateFormula({ length: 2, A: [4, null] }, 'A - A')).toEqual([0, null])
  })

  it('a reference to a measure absent from the query reads as a gap at every bucket', () => {
    const result = evaluateFormula({ length: 3, A: [1, 2, 3] }, 'A - B')
    expect(result).toEqual([null, null, null])
  })

  it('never throws on a syntactically invalid expression; it returns a gap series', () => {
    expect(() => evaluateFormula({ length: 3, A: [1, 2, 3] }, 'A + + B')).not.toThrow()
    expect(evaluateFormula({ length: 3, A: [1, 2, 3] }, 'A + + B')).toEqual([null, null, null])
  })

  it('never throws on an empty expression', () => {
    expect(() => evaluateFormula({ length: 2, A: [1, 2] }, '')).not.toThrow()
    expect(evaluateFormula({ length: 2, A: [1, 2] }, '')).toEqual([null, null])
  })

  it('never throws on a whitespace-only expression', () => {
    expect(evaluateFormula({ length: 2, A: [1, 2] }, '   ')).toEqual([null, null])
  })
})

describe('evaluateFormula — a constant expression fills every bucket with the same value', () => {
  it('a bare number evaluates to itself at every bucket', () => {
    expect(evaluateFormula({ length: 3 }, '42')).toEqual([42, 42, 42])
  })

  it('a constant arithmetic expression evaluates once per bucket', () => {
    expect(evaluateFormula({ length: 2 }, '2 * (3 + 4)')).toEqual([14, 14])
  })
})
