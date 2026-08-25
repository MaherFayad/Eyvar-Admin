/**
 * Direction, language and the one locale string every `Intl` call must use.
 *
 * DESIGN.md §9 / design spec 00-shell §14, and the trap this module exists to
 * close: a bare `'ar-SA'` silently switches `Intl` to the **Hijri** calendar and
 * **Arabic-Indic** digits. Every locale here carries an explicit calendar and
 * numbering system, so no call site can get it wrong by forgetting one.
 *
 * §9.7 rules that a dimension varying by language is a custom property under
 * **one** language hook. The DOM hook is `<html lang>` + `<html dir>` (AC-70),
 * set by `applyDocumentDirection` in `@/hooks/useLanguage`. CSS keys off
 * `:root:lang(ar)` and nothing else — never both `.lang-ar` and `[dir="rtl"]`.
 */

export type Language = 'en' | 'ar'
export type Direction = 'ltr' | 'rtl'

/**
 * `-u-ca-gregory` — never the Hijri default of `ar-SA`.
 * `-u-nu-latn`    — Western digits `0`-`9`, the Saudi digital convention (§9.2).
 */
const LOCALES: Readonly<Record<Language, string>> = {
  en: 'en-GB-u-ca-gregory-nu-latn',
  ar: 'ar-SA-u-ca-gregory-nu-latn',
}

export const LANGUAGES: readonly Language[] = ['en', 'ar']

/** The only locale string permitted in an `Intl` constructor anywhere in the app. */
export function localeFor(language: Language): string {
  return LOCALES[language]
}

export function directionFor(language: Language): Direction {
  return language === 'ar' ? 'rtl' : 'ltr'
}

export function isRtl(language: Language): boolean {
  return directionFor(language) === 'rtl'
}

export function isLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'ar'
}

/**
 * Glyphs that mirror, swapped at **string-construction time**, never with CSS
 * (§9.5, design spec §14). The map is closed on purpose: `↑ ↓ ▶ ✓ × +` and every
 * brand or object glyph are absent because they must **not** mirror, and an
 * unknown glyph is returned unchanged rather than guessed at.
 *
 * Covers: the detail back arrow, the top-bar `›` separator, pagination `‹ ›`,
 * disclosure chevrons and the full-bleed editor's `⇤` exit.
 */
const MIRRORED_GLYPHS: Readonly<Record<string, string>> = {
  '\u2190': '\u2192', // ← →
  '\u2192': '\u2190',
  '\u2039': '\u203A', // ‹ ›
  '\u203A': '\u2039',
  '\u00AB': '\u00BB', // « »
  '\u00BB': '\u00AB',
  '\u21E4': '\u21E5', // ⇤ ⇥
  '\u21E5': '\u21E4',
  '\u21B3': '\u21B2', // ↳ ↲  (ledger source-document link, §8.3.3)
  '\u21B2': '\u21B3',
}

/** Returns the glyph that reads the same way in `direction`. Unknown glyphs pass through. */
export function mirrorGlyph(glyph: string, direction: Direction): string {
  if (direction === 'ltr') return glyph
  return MIRRORED_GLYPHS[glyph] ?? glyph
}

/** True when this glyph is one the design says mirrors. Lets a test enumerate the closed set. */
export function mirrors(glyph: string): boolean {
  return glyph in MIRRORED_GLYPHS
}
