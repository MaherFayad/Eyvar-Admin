/**
 * Plural selection — the half of a translation a count changes.
 *
 * **The rule this encodes.** design/08-auth-and-onboarding.md §11 / §12,
 * **AC-670** and **AC-671**: eight auth strings vary with a number, and none of
 * them may be assembled by concatenation. `count + ' minutes'` is legal English
 * grammar and illegal Arabic grammar — Arabic has **six** cardinal categories
 * (`zero one two few many other`), so `2` needs a dual form, `3`–`10` a paucal
 * form, and `11`+ another. A sentence built by gluing a number to a translated
 * noun cannot express any of that, which is why §11 states the rule as *"this
 * can never be `n + ' minutes'`"*.
 *
 * `translate.ts` used to say, correctly for the time:
 *
 * > There is no plural API here on purpose. A count that changes the sentence
 * > gets two keys chosen by the caller, because Arabic has six plural categories
 * > and a half-built plural engine is worse than an explicit choice.
 *
 * Two keys chosen by the caller works for English's two forms and breaks the
 * moment Arabic needs six, because the *caller* would then be the thing holding
 * the CLDR table. `Intl.PluralRules` already holds it, per locale, in the
 * runtime. This module is the lookup convention on top of it and nothing more —
 * it is not a message-format parser and it does not do gender, ordinals or
 * nested selects.
 *
 * ## The convention
 *
 * A plural key is a **family**, not a key. Its members are `key#<selector>`,
 * where the selector is a CLDR category or an **exact integer**:
 *
 * ```ts
 * 'auth.reset.done#0':     'Your password is set. Sign in with your new password.',
 * 'auth.reset.done#one':   '1 other session ended, and every remembered device …',
 * 'auth.reset.done#other': '{count} other sessions ended, and every remembered device …',
 * ```
 *
 * Why `#` and not a ninth dot segment:
 *   - `t('auth.reset.done')` still **throws** in dev. The family bears no bare
 *     key, so the missing-key guard in `createTranslator` — which is deliberate
 *     and must survive — fires on a caller who forgot `.plural`.
 *   - `grep "auth.reset.done#"` returns the whole family and nothing else.
 *   - No existing key can collide: `#` appears in no key in `src/i18n`.
 *
 * The **exact form wins over the category**, which is ICU's `=0` and is what
 * §11 asks for on `auth.reset.done`: at zero the sentence is not "0 other
 * sessions ended", it is a different sentence. `session.idleWarning#0` carries
 * the same design's *"less than a minute"* form for the same reason.
 *
 * `#other` is **mandatory** in every dictionary that declares a family — it is
 * the only selector every locale can reach. `pluralFormsIn` exists so a
 * dictionary's own `copy.test.ts` can assert that without importing this file's
 * internals.
 */

import { invariant } from '../invariant'
import { type Language, localeFor } from './direction'

/** The CLDR cardinal categories. Arabic uses all six; English uses two. */
export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other'

/** Closed, in CLDR's own order. Enumerable so a test can walk every branch. */
export const PLURAL_CATEGORIES: readonly PluralCategory[] = [
  'zero',
  'one',
  'two',
  'few',
  'many',
  'other',
]

/** `key#selector`. Not a dot, so a family never looks like a namespace. */
export const PLURAL_SEPARATOR = '#'

export function isPluralCategory(value: string): value is PluralCategory {
  return (PLURAL_CATEGORIES as readonly string[]).includes(value)
}

/** One `Intl.PluralRules` per locale; construction is the expensive part. */
const rulesByLocale = new Map<string, Intl.PluralRules>()

function pluralRules(language: Language): Intl.PluralRules {
  const locale = localeFor(language)
  let rules = rulesByLocale.get(locale)
  if (!rules) {
    rules = new Intl.PluralRules(locale, { type: 'cardinal' })
    rulesByLocale.set(locale, rules)
  }
  return rules
}

/**
 * Which of the six forms `count` takes in `language`.
 *
 * Arabic, for the record, because it is the reason this exists:
 * `0` → `zero`, `1` → `one`, `2` → `two`, `3`–`10` → `few`, `11`–`99` → `many`,
 * `100`+ → `other`. English: `1` → `one`, everything else → `other`.
 */
export function pluralCategory(count: number, language: Language): PluralCategory {
  const selected: string = pluralRules(language).select(count)
  /* A runtime that returns something outside the six would otherwise silently
     miss every form. `other` exists in every family, so degrade to it. */
  return isPluralCategory(selected) ? selected : 'other'
}

/** `('auth.reset.done', 0)` → `'auth.reset.done#0'`. */
export function pluralFormKey(key: string, selector: PluralCategory | number): string {
  return `${key}${PLURAL_SEPARATOR}${selector}`
}

/**
 * The template for `count`, from **one** dictionary, or `undefined` if that
 * dictionary declares no usable form of the family.
 *
 * Resolution is deliberately whole-family and single-dictionary: exact form,
 * then category, then `#other`. It never reaches into a second dictionary
 * mid-walk, because an Arabic `#other` plus an English `#few` would render one
 * sentence in each language depending on the number — a defect that appears
 * only at certain counts and is exactly the kind of thing nobody reproduces.
 * Falling the *whole* family back to English is `createTranslator`'s job.
 */
export function selectPluralForm(
  dictionary: Readonly<Record<string, string>>,
  key: string,
  count: number,
  language: Language,
): string | undefined {
  if (Number.isInteger(count)) {
    const exact = dictionary[pluralFormKey(key, count)]
    if (exact !== undefined) return exact
  }
  const byCategory = dictionary[pluralFormKey(key, pluralCategory(count, language))]
  if (byCategory !== undefined) return byCategory
  return dictionary[pluralFormKey(key, 'other')]
}

/**
 * Every selector this dictionary declares for `key`, in declaration order —
 * `['0', 'one', 'other']`.
 *
 * For a dictionary's own test: a family without `other` is unreachable at some
 * count in some language, and that is a defect a copy test should catch rather
 * than an operator.
 */
export function pluralFormsIn(
  dictionary: Readonly<Record<string, string>>,
  key: string,
): string[] {
  const prefix = `${key}${PLURAL_SEPARATOR}`
  return Object.keys(dictionary)
    .filter((candidate) => candidate.startsWith(prefix))
    .map((candidate) => candidate.slice(prefix.length))
}

/**
 * The parameter that drives selection: the one and only `number` in `params`.
 *
 * **Exactly one.** `{minutes}`, `{seconds}` and `{count}` are three different
 * placeholder names across the eight keys, so hard-coding `count` would make
 * `t.plural('auth.otp.resendIn', { seconds: 27 })` silently unpluralised.
 * Naming the parameter at the call site instead means the string and the call
 * use the same word.
 *
 * Two numbers is a **type error at runtime, on purpose**: `onboarding.progress`
 * (`{done}` `{total}`) has two and is not a plural key — it is one sentence with
 * two numbers in it. There is no defensible way to guess which one governs the
 * verb, so this refuses rather than picks.
 */
export function pluralCountIn(key: string, params: Readonly<Record<string, string | number>>): {
  name: string
  count: number
} {
  const numeric = Object.entries(params).filter(
    (entry): entry is [string, number] => typeof entry[1] === 'number',
  )
  invariant(
    numeric.length === 1,
    numeric.length === 0
      ? `Plural key "${key}" needs exactly one numeric parameter to select a form, and got none. ` +
          `Pass the count as a number — { count: 4 }, not { count: '4' }.`
      : `Plural key "${key}" got ${numeric.length} numeric parameters ` +
          `(${numeric.map(([name]) => name).join(', ')}), and only one may govern the plural form. ` +
          `A sentence with two numbers in it is not a plural key; use t() with pre-formatted values.`,
  )
  const [name, count] = numeric[0] as [string, number]
  invariant(
    Number.isInteger(count),
    `Plural key "${key}" got a fractional count for "${name}" (${count}). ` +
      `Every plural string in the product counts whole things — minutes, seconds, sessions.`,
  )
  invariant(
    count >= 0,
    `Plural key "${key}" got a negative count for "${name}" (${count}). ` +
      `A count of things is never negative; a signed quantity is not a plural.`,
  )
  return { name, count }
}
