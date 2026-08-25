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
 * There is no plural API here on purpose. A count that changes the sentence gets
 * two keys chosen by the caller, because Arabic has six plural categories and a
 * half-built plural engine is worse than an explicit choice.
 */

import { isDevEnvironment } from '../invariant'

export type Dictionary = Readonly<Record<string, string>>
export type TranslateParams = Readonly<Record<string, string | number>>
export type Translate = (key: string, params?: TranslateParams) => string

export interface TranslatorOptions {
  /** The active language's dictionary. May be empty — that is AC-74's test. */
  dictionary: Dictionary
  /** English. Complete by contract; every key in the product exists here. */
  fallback?: Dictionary
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

export function createTranslator(options: TranslatorOptions): Translate {
  const { dictionary, fallback = {}, onMissingKey = defaultOnMissingKey } = options

  return function translate(key: string, params?: TranslateParams): string {
    const template = dictionary[key] ?? fallback[key]
    if (template === undefined) return onMissingKey(key)
    return interpolate(template, key, params)
  }
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
