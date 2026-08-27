import { describe, expect, it } from 'vitest'
import { createTranslator, type Dictionary } from './translate'
import {
  PLURAL_CATEGORIES,
  isPluralCategory,
  pluralCategory,
  pluralCountIn,
  pluralFormKey,
  pluralFormsIn,
  selectPluralForm,
} from './plural'

/**
 * **Arabic is tested against SYNTHETIC copy, and this is a real limitation.**
 *
 * `src/i18n/dictionaries.ts` ships `ar: {}` on purpose — translating 200
 * operator-facing strings is a content decision, and an empty `ar` is AC-74's
 * own fixture. So there is no Arabic plural string in the product to assert
 * against, and there will not be until product-designer lands one.
 *
 * What is therefore tested here:
 *   - the **selection** — `Intl.PluralRules('ar-SA…')` picking `zero one two few
 *     many other` at the right counts. That is the runtime's CLDR table and it
 *     is real.
 *   - the **plumbing** — that a dictionary declaring six Arabic forms gets the
 *     right one, using a made-up dictionary below.
 *
 * What is NOT tested and cannot be: that the Arabic *sentences* are correct
 * Arabic. When `AR` lands, the strings below are the shape it has to fill.
 */
const AR_SYNTHETIC: Dictionary = {
  'auth.otp.resendsLeft#zero': 'ar-zero {count}',
  'auth.otp.resendsLeft#one': 'ar-one {count}',
  'auth.otp.resendsLeft#two': 'ar-two {count}',
  'auth.otp.resendsLeft#few': 'ar-few {count}',
  'auth.otp.resendsLeft#many': 'ar-many {count}',
  'auth.otp.resendsLeft#other': 'ar-other {count}',
}

/** English, in the shape design/08 §11 specifies. `#0` is ICU's `=0`. */
const EN: Dictionary = {
  'auth.otp.resendsLeft#one': '1 resend left before you’ll need to sign in again.',
  'auth.otp.resendsLeft#other':
    '{count} resends left before you’ll need to sign in again.',

  'auth.reset.done#0':
    'Every remembered device will ask for a code again. Sign in with your new password.',
  'auth.reset.done#one':
    '1 other session ended, and every remembered device will ask for a code again. Sign in with your new password.',
  'auth.reset.done#other':
    '{count} other sessions ended, and every remembered device will ask for a code again. Sign in with your new password.',

  'auth.otp.resendIn#one': 'Resend code in {seconds}s',
  'auth.otp.resendIn#other': 'Resend code in {seconds}s',

  'session.idleWarning#0': 'Your session ends in less than a minute.',
  'session.idleWarning#one': 'Your session ends in 1 minute.',
  'session.idleWarning#other': 'Your session ends in {minutes} minutes.',

  'auth.lockout.retryIn#one': 'Wait 1 minute, then sign in again.',
  'auth.lockout.retryIn#other': 'Wait {minutes} minutes, then sign in again.',

  /* Not a plural key: one sentence, two numbers. Here to prove the refusal. */
  'onboarding.progress': '{done} of {total} completed',
}

const en = () => createTranslator({ dictionary: EN, language: 'en', fallbackLanguage: 'en' })
const ar = () =>
  createTranslator({
    dictionary: AR_SYNTHETIC,
    fallback: EN,
    language: 'ar',
    fallbackLanguage: 'en',
  })

describe('pluralCategory — the CLDR table the runtime holds', () => {
  it('gives English two forms', () => {
    expect(pluralCategory(0, 'en')).toBe('other')
    expect(pluralCategory(1, 'en')).toBe('one')
    expect(pluralCategory(2, 'en')).toBe('other')
    expect(pluralCategory(11, 'en')).toBe('other')
  })

  /* The whole reason a plural API exists. If this ever regresses, every Arabic
     count sentence is grammatically wrong and nothing else notices. */
  it('gives Arabic all six — AC-670', () => {
    expect(pluralCategory(0, 'ar')).toBe('zero')
    expect(pluralCategory(1, 'ar')).toBe('one')
    expect(pluralCategory(2, 'ar')).toBe('two')
    expect(pluralCategory(3, 'ar')).toBe('few')
    expect(pluralCategory(10, 'ar')).toBe('few')
    expect(pluralCategory(11, 'ar')).toBe('many')
    expect(pluralCategory(99, 'ar')).toBe('many')
    expect(pluralCategory(100, 'ar')).toBe('other')
    /* The rule is on n % 100, not on n: 103 is `few` again and 111 is `many`
       again. A count that only ever gets tested below 100 hides this. */
    expect(pluralCategory(103, 'ar')).toBe('few')
    expect(pluralCategory(111, 'ar')).toBe('many')
    expect(pluralCategory(200, 'ar')).toBe('other')
  })

  it('reaches every one of the six categories in Arabic', () => {
    const reached = new Set(
      [0, 1, 2, 3, 11, 100].map((count) => pluralCategory(count, 'ar')),
    )
    expect([...reached].sort()).toEqual([...PLURAL_CATEGORIES].sort())
  })

  it('is a closed set', () => {
    expect(PLURAL_CATEGORIES).toEqual(['zero', 'one', 'two', 'few', 'many', 'other'])
    expect(isPluralCategory('other')).toBe(true)
    expect(isPluralCategory('plural')).toBe(false)
    expect(isPluralCategory('')).toBe(false)
  })

  it('handles a very large count without falling over', () => {
    expect(pluralCategory(1_000_000, 'en')).toBe('other')
    /* MAX_SAFE_INTEGER % 100 === 91, so Arabic says `many` — the right answer,
       and proof the rule is modular rather than a lookup that runs out. */
    expect(pluralCategory(Number.MAX_SAFE_INTEGER, 'ar')).toBe('many')
    expect(pluralCategory(Number.MAX_SAFE_INTEGER, 'en')).toBe('other')
  })
})

describe('selectPluralForm — one dictionary at a time', () => {
  it('prefers an exact form over the category — ICU =0', () => {
    expect(selectPluralForm(EN, 'auth.reset.done', 0, 'en')).toBe(EN['auth.reset.done#0'])
    expect(pluralFormKey('auth.reset.done', 0)).toBe('auth.reset.done#0')
  })

  it('falls back to #other inside the SAME dictionary rather than reaching for English', () => {
    const partial: Dictionary = { 'auth.otp.resendsLeft#other': 'ar-other {count}' }
    /* Arabic count 3 is `few`, which this dictionary does not declare. It must
       land on the Arabic `other`, never on an English `few`. */
    expect(selectPluralForm(partial, 'auth.otp.resendsLeft', 3, 'ar')).toBe('ar-other {count}')
  })

  it('returns undefined when the dictionary declares no form of the family', () => {
    expect(selectPluralForm({}, 'auth.reset.done', 4, 'en')).toBeUndefined()
  })

  it('does not treat a bare key as a member of its own family', () => {
    expect(selectPluralForm({ 'auth.reset.done': 'bare' }, 'auth.reset.done', 4, 'en')).toBeUndefined()
  })
})

describe('pluralFormsIn — for a dictionary`s own copy test', () => {
  it('lists the selectors a family declares', () => {
    expect(pluralFormsIn(EN, 'auth.reset.done').sort()).toEqual(['0', 'one', 'other'])
  })

  it('does not leak a neighbouring key that shares a prefix', () => {
    const dictionary: Dictionary = { 'a#one': 'x', 'a#other': 'y', 'ab#other': 'z' }
    expect(pluralFormsIn(dictionary, 'a').sort()).toEqual(['one', 'other'])
  })

  it('returns nothing for a key with no family', () => {
    expect(pluralFormsIn(EN, 'onboarding.progress')).toEqual([])
  })
})

describe('pluralCountIn — exactly one numeric parameter', () => {
  it('finds the count whatever the placeholder is called', () => {
    expect(pluralCountIn('k', { seconds: 27 })).toEqual({ name: 'seconds', count: 27 })
    expect(pluralCountIn('k', { minutes: 2 })).toEqual({ name: 'minutes', count: 2 })
    expect(pluralCountIn('k', { count: 0, email: 'a@b.com' })).toEqual({ name: 'count', count: 0 })
  })

  it('refuses a key with no number — a stringified count would never pluralise', () => {
    expect(() => pluralCountIn('auth.reset.done', { count: '4' })).toThrow(/exactly one numeric/)
  })

  it('refuses a key with two numbers — onboarding.progress is not a plural', () => {
    expect(() => pluralCountIn('onboarding.progress', { done: 2, total: 7 })).toThrow(
      /only one may govern/,
    )
  })

  it('refuses a fraction', () => {
    expect(() => pluralCountIn('k', { minutes: 2.5 })).toThrow(/fractional count/)
  })

  it('refuses a negative count', () => {
    expect(() => pluralCountIn('k', { count: -1 })).toThrow(/negative count/)
  })
})

describe('t.plural — the eight §11 keys, end to end', () => {
  it('picks the singular and the plural in English', () => {
    const t = en()
    expect(t.plural('auth.otp.resendsLeft', { count: 1 })).toBe(
      '1 resend left before you’ll need to sign in again.',
    )
    expect(t.plural('auth.otp.resendsLeft', { count: 2 })).toBe(
      '2 resends left before you’ll need to sign in again.',
    )
  })

  it('takes the =0 form on auth.reset.done rather than saying "0 other sessions"', () => {
    const t = en()
    expect(t.plural('auth.reset.done', { count: 0 })).toBe(
      'Every remembered device will ask for a code again. Sign in with your new password.',
    )
    expect(t.plural('auth.reset.done', { count: 0 })).not.toMatch(/\b0\b/)
    expect(t.plural('auth.reset.done', { count: 4 })).toMatch(/^4 other sessions ended/)
  })

  it('takes the "less than a minute" form at zero minutes — §11 session.idleWarning', () => {
    expect(en().plural('session.idleWarning', { minutes: 0 })).toBe(
      'Your session ends in less than a minute.',
    )
  })

  it('never assembles the sentence by concatenation — AC-671', () => {
    /* The count sits INSIDE the template, so the sentence around it can differ
       per form. `1 resend left` vs `2 resends left` is the proof: the noun
       changed, which no `count + ' resends left'` could do. */
    const t = en()
    expect(t.plural('auth.otp.resendsLeft', { count: 1 })).toContain('resend left')
    expect(t.plural('auth.otp.resendsLeft', { count: 2 })).toContain('resends left')
  })

  it('groups the count with formatCount — §9.2, not String(value)', () => {
    expect(en().plural('auth.reset.done', { count: 4218 })).toMatch(/^4,218 other sessions/)
  })

  it('selects on the Arabic table when the Arabic dictionary wins', () => {
    const t = ar()
    expect(t.plural('auth.otp.resendsLeft', { count: 0 })).toBe('ar-zero 0')
    expect(t.plural('auth.otp.resendsLeft', { count: 1 })).toBe('ar-one 1')
    expect(t.plural('auth.otp.resendsLeft', { count: 2 })).toBe('ar-two 2')
    expect(t.plural('auth.otp.resendsLeft', { count: 3 })).toBe('ar-few 3')
    expect(t.plural('auth.otp.resendsLeft', { count: 11 })).toBe('ar-many 11')
    expect(t.plural('auth.otp.resendsLeft', { count: 100 })).toBe('ar-other 100')
  })

  it('uses Western digits for the count in Arabic — AC-73', () => {
    expect(ar().plural('auth.otp.resendsLeft', { count: 100 })).not.toMatch(/[٠-٩]/)
  })

  it('falls the WHOLE family back to English when Arabic has none of it — AC-74', () => {
    const t = ar()
    /* `auth.reset.done` is absent from AR_SYNTHETIC entirely. Every count must
       come back in English — never a raw key, and never Arabic at one count and
       English at another. */
    expect(t.plural('auth.reset.done', { count: 0 })).toBe(EN['auth.reset.done#0'])
    expect(t.plural('auth.reset.done', { count: 2 })).toMatch(/^2 other sessions/)
    expect(t.plural('auth.reset.done', { count: 11 })).toMatch(/^11 other sessions/)
  })

  it('renders every §11 key in English through an EMPTY Arabic dictionary — AC-616 / AC-669', () => {
    const t = createTranslator({ dictionary: {}, fallback: EN, language: 'ar', fallbackLanguage: 'en' })
    expect(t.plural('auth.lockout.retryIn', { minutes: 12 })).toBe(
      'Wait 12 minutes, then sign in again.',
    )
    expect(t.plural('auth.otp.resendIn', { seconds: 27 })).toBe('Resend code in 27s')
    expect(t.plural('session.idleWarning', { minutes: 2 })).toBe('Your session ends in 2 minutes.')
  })

  it('throws on a missing family in dev, naming the form to add — the guard survives', () => {
    const t = en()
    expect(() => t.plural('auth.devices.signOutAllConfirm', { count: 3 })).toThrow(
      /auth\.devices\.signOutAllConfirm#other/,
    )
  })

  it('still throws when a plural family is called through plain t() — the bare key does not exist', () => {
    expect(() => en()('auth.reset.done')).toThrow(/Missing translation key "auth\.reset\.done"/)
  })

  it('returns the missing form rather than blanking the console in production', () => {
    const t = createTranslator({
      dictionary: {},
      fallback: {},
      language: 'en',
      onMissingKey: (key) => key,
    })
    expect(t.plural('auth.reset.done', { count: 4 })).toBe('auth.reset.done#other')
  })

  it('interpolates the other parameters alongside the count', () => {
    const t = createTranslator({
      dictionary: { 'x#other': '{count} codes went to {hint}' },
      language: 'en',
    })
    expect(t.plural('x', { count: 3, hint: '••••67' })).toBe(
      '3 codes went to ••••67',
    )
  })

  it('tolerates a form that does not use the count at all — the =0 case', () => {
    expect(() => en().plural('auth.reset.done', { count: 0 })).not.toThrow()
  })
})

describe('plain t() is untouched', () => {
  it('still resolves a non-plural key with two numbers', () => {
    expect(en()('onboarding.progress', { done: 2, total: 7 })).toBe('2 of 7 completed')
  })
})
