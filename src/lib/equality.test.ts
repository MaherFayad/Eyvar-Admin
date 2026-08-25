import { describe, expect, it } from 'vitest'
import { isDeepEqual } from './equality'

describe('primitives', () => {
  it('compares by value', () => {
    expect(isDeepEqual(1, 1)).toBe(true)
    expect(isDeepEqual('a', 'a')).toBe(true)
    expect(isDeepEqual(true, true)).toBe(true)
    expect(isDeepEqual(null, null)).toBe(true)
    expect(isDeepEqual(undefined, undefined)).toBe(true)
    expect(isDeepEqual(1, 2)).toBe(false)
    expect(isDeepEqual('a', 'b')).toBe(false)
  })

  it('does not conflate null, undefined, 0 and the empty string', () => {
    // A cleared number field is `null`; a field that was never set is
    // `undefined`; a typed zero is `0`. All three are different payloads.
    expect(isDeepEqual(null, undefined)).toBe(false)
    expect(isDeepEqual(null, 0)).toBe(false)
    expect(isDeepEqual(0, '')).toBe(false)
    expect(isDeepEqual(0, false)).toBe(false)
    expect(isDeepEqual('', null)).toBe(false)
  })

  it('treats NaN as equal to NaN, so a NaN field is not permanently dirty', () => {
    expect(isDeepEqual(Number.NaN, Number.NaN)).toBe(true)
    expect(Number.NaN === Number.NaN).toBe(false)
  })

  it('treats -0 as equal to 0, because §8.3.1 renders them identically', () => {
    expect(isDeepEqual(-0, 0)).toBe(true)
    expect(Object.is(-0, 0)).toBe(false)
  })

  it('compares very large numbers exactly', () => {
    expect(isDeepEqual(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)).toBe(true)
    expect(isDeepEqual(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER - 1)).toBe(false)
    expect(isDeepEqual(Infinity, Infinity)).toBe(true)
    expect(isDeepEqual(Infinity, -Infinity)).toBe(false)
  })
})

describe('arrays — the tag input case (§10.2)', () => {
  it('compares by content, not by reference', () => {
    expect(isDeepEqual(['riyadh', 'jeddah'], ['riyadh', 'jeddah'])).toBe(true)
    const a: string[] = ['riyadh']
    const b: string[] = ['riyadh']
    expect(a === b).toBe(false)
  })

  it('is order-sensitive', () => {
    expect(isDeepEqual(['a', 'b'], ['b', 'a'])).toBe(false)
  })

  it('handles empty, length differences and nesting', () => {
    expect(isDeepEqual([], [])).toBe(true)
    expect(isDeepEqual([], ['a'])).toBe(false)
    expect(isDeepEqual(['a'], ['a', 'a'])).toBe(false)
    expect(isDeepEqual([['a', 1]], [['a', 1]])).toBe(true)
    expect(isDeepEqual([['a', 1]], [['a', 2]])).toBe(false)
  })

  it('does not treat an array and an object with the same keys as equal', () => {
    expect(isDeepEqual(['a'], { 0: 'a' })).toBe(false)
  })
})

describe('plain objects', () => {
  it('compares by content', () => {
    expect(isDeepEqual({ from: '09:00', to: '17:00' }, { from: '09:00', to: '17:00' })).toBe(true)
    expect(isDeepEqual({ from: '09:00' }, { from: '10:00' })).toBe(false)
  })

  it('ignores key order', () => {
    expect(isDeepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true)
  })

  it('separates a present undefined from an absent key', () => {
    // `{ note: undefined }` sends `note` in the payload; `{}` does not.
    expect(isDeepEqual({ note: undefined }, {})).toBe(false)
    expect(isDeepEqual({}, { note: undefined })).toBe(false)
    expect(isDeepEqual({ note: undefined }, { note: undefined })).toBe(true)
  })

  it('recurses', () => {
    const a = { window: { from: '09:00', tags: ['am'] } }
    const b = { window: { from: '09:00', tags: ['am'] } }
    expect(isDeepEqual(a, b)).toBe(true)
    expect(isDeepEqual(a, { window: { from: '09:00', tags: ['pm'] } })).toBe(false)
  })
})

describe('dates', () => {
  it('compares by instant', () => {
    expect(isDeepEqual(new Date('2026-06-25T09:14:00+03:00'), new Date('2026-06-25T06:14:00Z'))).toBe(true)
    expect(isDeepEqual(new Date('2026-06-25'), new Date('2026-06-26'))).toBe(false)
  })

  it('treats two Invalid Dates as equal rather than permanently dirty', () => {
    expect(isDeepEqual(new Date('nope'), new Date('nope'))).toBe(true)
  })

  it('does not equate a Date with its ISO string', () => {
    expect(isDeepEqual(new Date('2026-06-25T00:00:00Z'), '2026-06-25T00:00:00Z')).toBe(false)
  })
})

describe('Arabic and RTL values', () => {
  it('compares Arabic strings exactly, with no normalisation', () => {
    expect(isDeepEqual('الرياض', 'الرياض')).toBe(true)
    expect(isDeepEqual('الرياض', 'جدة')).toBe(false)
  })

  it('does not strip bidi marks - an RLM changes the stored value', () => {
    // A value pasted out of an RTL paragraph is genuinely a different string,
    // and a form that pretended otherwise would silently drop a character on
    // save. Stripping belongs in `parseNumericInput`, at the input boundary.
    const RLM = String.fromCharCode(0x200f)
    expect(isDeepEqual(RLM + 'الرياض', 'الرياض')).toBe(false)
  })

  it('does not trim', () => {
    expect(isDeepEqual('الرياض ', 'الرياض')).toBe(false)
    expect(isDeepEqual(' Riyadh', 'Riyadh')).toBe(false)
  })
})

describe('the documented limits', () => {
  it('falls back to reference equality for a Map or a Set', () => {
    const set = new Set([1])
    expect(isDeepEqual(set, set)).toBe(true)
    expect(isDeepEqual(new Set([1]), new Set([1]))).toBe(false)
    expect(isDeepEqual(new Map([['a', 1]]), new Map([['a', 1]]))).toBe(false)
  })

  it('falls back to reference equality for a class instance', () => {
    class Plan {
      constructor(readonly name: string) {}
    }
    const plan = new Plan('weekly')
    expect(isDeepEqual(plan, plan)).toBe(true)
    expect(isDeepEqual(new Plan('weekly'), new Plan('weekly'))).toBe(false)
  })

  it('handles a null-prototype object as a plain object', () => {
    const a = Object.assign(Object.create(null) as Record<string, unknown>, { a: 1 })
    const b = Object.assign(Object.create(null) as Record<string, unknown>, { a: 1 })
    expect(isDeepEqual(a, b)).toBe(true)
  })
})
