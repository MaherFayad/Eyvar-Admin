/**
 * The pseudo-locale's own gate.
 *
 * Two halves, and the second is the one that fails a build:
 *
 *  - the transform's invariants, in isolation;
 *  - **a sweep of the real English dictionary** — all ~4,500 keys — asserting
 *    that every one of them survives pseudo-localisation and still interpolates.
 *    Without this the mode is a switch nobody can trust: a single template that
 *    loses a `{placeholder}` turns a pseudo run from "a review with findings"
 *    into "the console crashed", and a reviewer reasonably concludes the mode is
 *    broken rather than the string.
 */

import { describe, expect, it } from 'vitest'
import { EN } from '@/i18n/dictionaries'
import { createTranslator } from './translate'
import {
  PSEUDO_CLOSE,
  PSEUDO_EXPANSION,
  PSEUDO_OPEN,
  isPseudoLocaleEnabled,
  pseudoLocalise,
  setPseudoLocaleEnabled,
} from './pseudo'

const PLACEHOLDER = /\{(\w+)\}/g

function placeholders(template: string): string[] {
  return [...template.matchAll(PLACEHOLDER)].map((m) => m[1] ?? '')
}

describe('pseudoLocalise', () => {
  it('marks the string at both ends, so an unkeyed literal is the plain one on screen', () => {
    const out = pseudoLocalise('Save changes')
    expect(out.startsWith(PSEUDO_OPEN)).toBe(true)
    expect(out.endsWith(PSEUDO_CLOSE)).toBe(true)
  })

  it('lengthens by at least the expansion factor — Arabic is 4-8%, this over-shoots', () => {
    for (const source of ['Save', 'Save changes', 'Assign this trip to another captain']) {
      const grown = pseudoLocalise(source).length - 2 /* the two brackets */
      expect(grown).toBeGreaterThanOrEqual(Math.ceil(source.length * (1 + PSEUDO_EXPANSION)))
    }
  })

  it('leaves {placeholder} runs byte-identical', () => {
    const out = pseudoLocalise('{count} trips past their SLA in {zone}.')
    expect(out).toContain('{count}')
    expect(out).toContain('{zone}')
  })

  it('never invents or drops a placeholder', () => {
    const source = '{a} and {b} but not {c}'
    expect(placeholders(pseudoLocalise(source))).toEqual(['a', 'b', 'c'])
  })

  it('keeps digits, punctuation and Latin proper nouns legible', () => {
    /* Sec 9.6: a Latin proper noun keeps its capitalisation. Accenting is a
       look-alike substitution, so `SAR 1,240.00` is still recognisably itself. */
    const out = pseudoLocalise('SAR 1,240.00')
    expect(out).toContain('1,240.00')
  })

  it('returns an empty template unchanged', () => {
    /* Bracketing '' would give an empty label a width it does not have and
       report a layout defect that is not there. */
    expect(pseudoLocalise('')).toBe('')
  })

  it('grows a two-character label too', () => {
    expect(pseudoLocalise('OK').length).toBeGreaterThan('OK'.length + 2)
  })
})

describe('the flag', () => {
  it('is off unless something turns it on — no test or build changes by accident', () => {
    setPseudoLocaleEnabled(undefined)
    expect(isPseudoLocaleEnabled()).toBe(false)
  })

  it('can be forced per translator without touching the environment', () => {
    const t = createTranslator({ dictionary: { 'a.b': 'Trips' }, pseudo: true })
    expect(t('a.b')).toMatch(/^⟦.*⟧$/)
  })

  it('still throws on a missing key — pseudo is a lens, not a fallback', () => {
    const t = createTranslator({ dictionary: {}, pseudo: true })
    expect(() => t('nope.missing')).toThrow(/Missing translation key/)
  })

  it('interpolates after transforming, so a parameter still lands', () => {
    const t = createTranslator({ dictionary: { 'a.b': '{count} trips' }, pseudo: true })
    expect(t('a.b', { count: 42 })).toContain('42')
  })

  it('transforms a plural form as well as a plain key', () => {
    const t = createTranslator({
      dictionary: { 'a.b#one': '{count} trip', 'a.b#other': '{count} trips' },
      pseudo: true,
    })
    expect(t.plural('a.b', { count: 9 })).toMatch(/^⟦.*⟧$/)
    expect(t.plural('a.b', { count: 9 })).toContain('9')
  })
})

describe('the whole English dictionary survives the pseudo-locale', () => {
  const entries = Object.entries(EN)

  it('has something to sweep', () => {
    expect(entries.length).toBeGreaterThan(3_000)
  })

  it('preserves every placeholder in every key', () => {
    const broken = entries
      .filter(([, template]) => {
        const before = placeholders(template).join(',')
        return placeholders(pseudoLocalise(template)).join(',') !== before
      })
      .map(([key]) => key)
    expect(broken).toEqual([])
  })

  it('renders every key through a pseudo translator without throwing', () => {
    const t = createTranslator({ dictionary: EN, fallback: EN, pseudo: true })
    const failures: string[] = []
    for (const [key, template] of entries) {
      /* Supply every declared placeholder; `interpolate` throws on a missing
         one by design and that is not what this test is about. */
      const params = Object.fromEntries(placeholders(template).map((name) => [name, '1']))
      try {
        t(key, params)
      } catch (error) {
        failures.push(`${key}: ${(error as Error).message}`)
      }
    }
    expect(failures).toEqual([])
  })
})
