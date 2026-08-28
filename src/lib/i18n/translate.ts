/**
 * The translation lookup. One key in, one finished string out.
 *
 * Enforces two acceptance criteria that are otherwise a code-review comment:
 *  - **AC-74** — every operator-facing string resolves through a key, and an
 *    empty Arabic dictionary falls back to English rather than showing a raw key.
 *  - **AC-75** — no string is assembled by concatenating a translated fragment
 *    with a value. Interpolation is a **named placeholder inside a single key**:
 *    `'{count} items are past their SLA.'`, never `t('sla.past') + count`.
 *
 * **Plurals live in `./plural.ts`**, reached through `t.plural`. This file used
 * to say there was no plural API on purpose — *"a count that changes the
 * sentence gets two keys chosen by the caller"* — which holds for English's two
 * forms and fails at Arabic's six, because it makes the *caller* the thing
 * holding the CLDR table. `Intl.PluralRules` already holds it. The eight keys in
 * design/08 §11 that **AC-670** and **AC-671** cover are the reason it landed.
 * `t()` itself is unchanged: one key, one string, and it still throws on a
 * missing key in dev.
 */

import { isDevEnvironment } from '../invariant'
import { formatCount } from '../format/number'
import { type Language } from './direction'
import { pluralCategory, pluralCountIn, pluralFormKey, selectPluralForm } from './plural'

export type Dictionary = Readonly<Record<string, string>>
export type TranslateParams = Readonly<Record<string, string | number>>

/**
 * The plain call signature. Every component that only renders strings declares
 * `t: Translate` and keeps working — a `Translator` is assignable to it.
 */
export type Translate = (key: string, params?: TranslateParams) => string

/**
 * What `createTranslator` returns: `Translate` plus the plural selector.
 *
 * A separate type rather than a member on `Translate`, so that the ~20 existing
 * `t: Translate` props stay valid and only a component that actually needs a
 * plural has to widen. Declare `Translator` when you call `.plural`.
 */
export interface Translator {
  (key: string, params?: TranslateParams): string
  /**
   * One key family, one count, one finished sentence — **AC-670 / AC-671**.
   *
   * `t.plural('auth.otp.resendsLeft', { count: 2 })` reads
   * `auth.otp.resendsLeft#other` and returns `2 resends left before you'll need
   * to sign in again.` The **one numeric parameter selects the form**; it is
   * also the one that gets formatted with `formatCount`, so a screen cannot
   * hand an Arabic page an ungrouped `4218`.
   */
  readonly plural: (key: string, params: TranslateParams) => string
}

export interface TranslatorOptions {
  /** The active language's dictionary. May be empty — that is AC-74's test. */
  dictionary: Dictionary
  /** English. Complete by contract; every key in the product exists here. */
  fallback?: Dictionary
  /**
   * Which language `dictionary` is. Only plural selection reads it — the six
   * CLDR categories are per-locale — so it defaults to `'en'` and no existing
   * caller has to change.
   */
  language?: Language
  /** The language `fallback` is written in. English, and there is no second answer. */
  fallbackLanguage?: Language
  /**
   * What to do when neither dictionary has the key. Default: throw in dev and
   * under test so the gap is found, return the key in production so one missing
   * string never blanks an operations console mid-shift.
   */
  onMissingKey?: (key: string) => string
}

const PLACEHOLDER = /\{(\w+)\}/g

function defaultOnMissingKey(key: string): string {
  if (isDevEnvironment()) {
    throw new TypeError(
      `Missing translation key "${key}". Every operator-facing string needs a key in the English dictionary (AC-74).`,
    )
  }
  return key
}

export function createTranslator(options: TranslatorOptions): Translator {
  const {
    dictionary,
    fallback = {},
    language = 'en',
    fallbackLanguage = 'en',
    onMissingKey = defaultOnMissingKey,
  } = options

  function translate(key: string, params?: TranslateParams): string {
    const template = dictionary[key] ?? fallback[key] ?? (params as any)?.defaultValue
    if (template === undefined) return onMissingKey(key)
    return interpolate(template, key, params)
  }

  /**
   * The family is resolved in **one** dictionary at a time (`selectPluralForm`),
   * and only falls back to English as a whole. Mixing an Arabic `#other` with an
   * English `#few` would render a different language at count 3 than at count
   * 100 — a defect that shows up only at certain numbers.
   *
   * The count is formatted in the **UI** language, not the language the winning
   * template happened to come from, so it groups the same way as every other
   * number on the page (§9.2).
   */
  function plural(key: string, params: TranslateParams): string {
    const { name, count } = pluralCountIn(key, params)

    const template =
      selectPluralForm(dictionary, key, count, language) ??
      selectPluralForm(fallback, key, count, fallbackLanguage)

    if (template === undefined) {
      /* Name the form, not the family: `auth.reset.done#few` tells whoever reads
         the throw exactly which line to add. */
      return onMissingKey(pluralFormKey(key, pluralCategory(count, language)))
    }

    return interpolate(template, key, { ...params, [name]: formatCount(count, language) })
  }

  return Object.assign(translate, { plural })
}

/**
 * Substitutes `{name}` placeholders. A placeholder with no matching parameter
 * throws rather than rendering the literal `{count}` to an operator.
 */
export function interpolate(template: string, key: string, params?: TranslateParams): string {
  return template.replace(PLACEHOLDER, (_match, name: string) => {
    const value = params?.[name]
    if (value === undefined) {
      throw new TypeError(`Translation "${key}" needs a "${name}" parameter, and none was given.`)
    }
    return String(value)
  })
}

/** Every placeholder a key declares. Lets a test assert a dictionary and its call sites agree. */
export function placeholdersIn(template: string): string[] {
  return [...template.matchAll(PLACEHOLDER)].map((m) => m[1] ?? '')
}
