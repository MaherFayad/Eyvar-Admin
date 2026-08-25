import { describe, expect, it } from 'vitest'
import { LANGUAGES, directionFor, isLanguage, isRtl, localeFor, mirrorGlyph, mirrors } from './direction'
import { createTranslator, interpolate, placeholdersIn } from './translate'

describe('localeFor — the Hijri / Arabic-Indic trap', () => {
  it('always names a calendar and a numbering system', () => {
    for (const language of LANGUAGES) {
      expect(localeFor(language)).toContain('-ca-gregory')
      expect(localeFor(language)).toContain('-nu-latn')
    }
  })

  it('never returns a bare locale', () => {
    expect(localeFor('ar')).not.toBe('ar-SA')
    expect(localeFor('ar')).toBe('ar-SA-u-ca-gregory-nu-latn')
    expect(localeFor('en')).toBe('en-GB-u-ca-gregory-nu-latn')
  })

  it('resolves to Gregorian and Latin digits in both languages', () => {
    for (const language of LANGUAGES) {
      const resolved = new Intl.DateTimeFormat(localeFor(language)).resolvedOptions()
      expect(resolved.calendar).toBe('gregory')
      expect(resolved.numberingSystem).toBe('latn')
    }
  })
})

describe('direction', () => {
  it('maps language to direction', () => {
    expect(directionFor('en')).toBe('ltr')
    expect(directionFor('ar')).toBe('rtl')
    expect(isRtl('ar')).toBe(true)
    expect(isRtl('en')).toBe(false)
  })

  it('guards an unknown stored value', () => {
    expect(isLanguage('ar')).toBe(true)
    expect(isLanguage('fr')).toBe(false)
    expect(isLanguage(null)).toBe(false)
    expect(isLanguage(undefined)).toBe(false)
  })
})

describe('mirrorGlyph', () => {
  it('leaves everything alone in ltr', () => {
    expect(mirrorGlyph('←', 'ltr')).toBe('←')
    expect(mirrorGlyph('›', 'ltr')).toBe('›')
  })

  it('swaps the glyphs §14 lists as mirroring', () => {
    expect(mirrorGlyph('←', 'rtl')).toBe('→')
    expect(mirrorGlyph('→', 'rtl')).toBe('←')
    expect(mirrorGlyph('‹', 'rtl')).toBe('›')
    expect(mirrorGlyph('›', 'rtl')).toBe('‹')
    expect(mirrorGlyph('⇤', 'rtl')).toBe('⇥')
    expect(mirrorGlyph('↳', 'rtl')).toBe('↲')
  })

  it('leaves alone every glyph §14 says does NOT mirror', () => {
    // Objects, marks and brand: vertical arrows, media, checks, crosses, plus.
    for (const glyph of ['↑', '↓', '▶', '✓', '×', '+', '⌘', '🔍']) {
      expect(mirrorGlyph(glyph, 'rtl')).toBe(glyph)
      expect(mirrors(glyph)).toBe(false)
    }
  })

  it('passes an unknown glyph through rather than guessing', () => {
    expect(mirrorGlyph('※', 'rtl')).toBe('※')
    expect(mirrorGlyph('', 'rtl')).toBe('')
  })

  it('is its own inverse for every glyph in the closed set', () => {
    for (const glyph of ['←', '→', '‹', '›', '«', '»', '⇤', '⇥', '↳', '↲']) {
      expect(mirrorGlyph(mirrorGlyph(glyph, 'rtl'), 'rtl')).toBe(glyph)
    }
  })
})

describe('createTranslator', () => {
  const en = { 'shell.save': 'Save', 'sla.left': '{duration} left', 'table.count': '{n} selected' }

  it('resolves a key from the active dictionary', () => {
    const t = createTranslator({ dictionary: { 'shell.save': 'حفظ' }, fallback: en })
    expect(t('shell.save')).toBe('حفظ')
  })

  it('falls back to English for every missing key and shows no raw key — AC-74', () => {
    const t = createTranslator({ dictionary: {}, fallback: en })
    for (const key of Object.keys(en)) {
      const value = t(key, { duration: '12m', n: 3 })
      expect(value).not.toBe(key)
      expect(value).not.toContain('.')
    }
  })

  it('interpolates a named placeholder inside a single key — AC-75', () => {
    const t = createTranslator({ dictionary: en })
    expect(t('sla.left', { duration: '3h 20m' })).toBe('3h 20m left')
    expect(t('table.count', { n: 3 })).toBe('3 selected')
  })

  it('lets a translation reorder the sentence around the placeholder', () => {
    const t = createTranslator({ dictionary: { 'sla.left': 'متبقٍ {duration}' }, fallback: en })
    expect(t('sla.left', { duration: '12m' })).toBe('متبقٍ 12m')
  })

  it('throws on a missing parameter rather than rendering `{duration}` to an operator', () => {
    const t = createTranslator({ dictionary: en })
    expect(() => t('sla.left')).toThrow(/needs a "duration" parameter/)
  })

  it('throws in dev on a key that is in no dictionary, naming the key', () => {
    const t = createTranslator({ dictionary: {}, fallback: {} })
    expect(() => t('shell.nope')).toThrow(/shell\.nope/)
  })

  it('lets a caller supply its own missing-key policy', () => {
    const t = createTranslator({ dictionary: {}, fallback: {}, onMissingKey: () => '' })
    expect(t('shell.nope')).toBe('')
  })

  it('handles a template with no placeholders and an empty template', () => {
    const t = createTranslator({ dictionary: { a: 'Save', b: '' } })
    expect(t('a', { unused: 1 })).toBe('Save')
    expect(t('b')).toBe('')
  })

  it('substitutes every occurrence of a repeated placeholder', () => {
    expect(interpolate('{n} of {n}', 'k', { n: 5 })).toBe('5 of 5')
  })

  it('enumerates the placeholders a key declares', () => {
    expect(placeholdersIn('{count} items are past their SLA.')).toEqual(['count'])
    expect(placeholdersIn('No placeholders here.')).toEqual([])
  })
})
