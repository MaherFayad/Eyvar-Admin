/**
 * Plain integer counts — row totals, pagination, nav badges, queue counts.
 *
 * DESIGN.md §9.2 / design spec §14: numeral runs do **not** mirror and digits are
 * Western `0`-`9` in both languages. `localeFor` carries `-nu-latn` so this holds
 * even when the UI language is Arabic; the *cell* aligns inline-end, the *string*
 * does not reorder (AC-73).
 */

import { invariant } from '../invariant'
import { type Language, localeFor } from '../i18n/direction'

/** One formatter per locale. `Intl.NumberFormat` construction is the expensive part. */
const countFormatters = new Map<string, Intl.NumberFormat>()

function countFormatter(language: Language): Intl.NumberFormat {
  const locale = localeFor(language)
  let formatter = countFormatters.get(locale)
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      numberingSystem: 'latn',
      useGrouping: true,
      maximumFractionDigits: 0,
    })
    countFormatters.set(locale, formatter)
  }
  return formatter
}

/**
 * `4218` -> `4,218`. Integers only: a count is a count.
 * `-0` renders `0`, because `−0` is not a thing an operator has ever needed to see.
 */
export function formatCount(value: number, language: Language = 'en'): string {
  invariant(Number.isFinite(value), `formatCount needs a finite number, got ${value}.`)
  invariant(Number.isInteger(value), `formatCount needs an integer count, got ${value}.`)
  return countFormatter(language).format(value === 0 ? 0 : value)
}

/**
 * The pagination range, `1–50` — an en dash (U+2013), not a hyphen, and the
 * numerals grouped the same way as every other number on the page.
 * §9.1's line is `Showing 1–50 of 4,218`; the surrounding sentence is a
 * translation key, this is only the range inside it.
 */
export function formatRange(from: number, to: number, language: Language = 'en'): string {
  invariant(from <= to, `formatRange needs from <= to, got ${from}–${to}.`)
  return `${formatCount(from, language)}\u2013${formatCount(to, language)}`
}
