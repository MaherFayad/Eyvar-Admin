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
import { MINUS_SIGN } from './money'

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

/* ─────────────── decimals, percents and ratios (B-5) ───────────────
   Moved here from `src/components/metrics/formatMetric.ts`, which said of
   itself: *"`formatPercent` has no home in `src/lib` yet and should get one.
   `src/lib/format/number.ts` owns counts and ranges and this belongs beside
   them, but `src/lib` is utilities-engineer's file."* Raised in wave 4, raised
   again as **B-5** in `build/08-breakdowns-and-notices.md`, and `types/metrics.ts`
   counts `formatRatio` as W4-F5's fifth call site. This is the move.

   `formatMetric.ts` keeps `formatMetricValue`, `formatSeriesValue` and
   `formatSignedPercent`: the first two switch on a `MetricUnit`, which is a
   domain type, and the third is §3.7's *delta* — "measured, did not move" versus
   "nothing to compare to" is a metric-tile rule, not a number-formatting one. */

/** One formatter per locale/precision pair; construction is the expensive part. */
const decimalFormatters = new Map<string, Intl.NumberFormat>()

function decimalFormatter(language: Language, precision: number): Intl.NumberFormat {
  const locale = localeFor(language)
  const key = `${locale}|${precision}`
  let formatter = decimalFormatters.get(key)
  if (!formatter) {
    /* `localeFor` already carries `-u-ca-gregory-nu-latn`; `numberingSystem`
       says it again where a reader can see it, as `date.ts` does. */
    formatter = new Intl.NumberFormat(locale, {
      numberingSystem: 'latn',
      useGrouping: true,
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    })
    decimalFormatters.set(key, formatter)
  }
  return formatter
}

/**
 * `4.2` → `4.2`. A measured quantity that is not a whole count — an average
 * rating, a ratio, a percentage with a fraction in it. `formatCount` refuses a
 * fraction on purpose, so this is the other half of that rule rather than a
 * loosening of it.
 *
 * The sign is **U+2212** (§8.3.2), not a hyphen-minus, and it is typographic —
 * never chromatic, never in a toned pill. Formatting the magnitude and
 * prefixing the sign by hand is what guarantees that; `Intl`'s own minus is
 * locale-dependent.
 */
export function formatDecimal(value: number, precision: number, language: Language = 'en'): string {
  invariant(Number.isFinite(value), `formatDecimal needs a finite number, got ${value}.`)
  invariant(
    Number.isInteger(precision) && precision >= 0,
    `formatDecimal needs a non-negative integer precision, got ${precision}.`,
  )
  const magnitude = decimalFormatter(language, precision).format(Math.abs(value))
  return value < 0 ? `${MINUS_SIGN}${magnitude}` : magnitude
}

/**
 * `92` → `92%`. Percentage **POINTS** in, never a fraction.
 *
 * `0.92` is 1%, not 92%, and this function cannot tell the two apart — which is
 * why the unit is stated here rather than guessed. `Metric.unit === 'percent'`
 * carries points for the same reason.
 *
 * A decimal only when the value has one: `92%` and `4.5%` both read cleanly,
 * `92.0%` reads as spurious precision on a tile the operator scans past.
 */
export function formatPercent(value: number, language: Language = 'en'): string {
  return `${formatDecimal(value, Number.isInteger(value) ? 0 : 1, language)}%`
}

/**
 * `7` → `7.0×`. **R4-12**, closing W4-F7.
 *
 * *"The operands belong in the label, never in the value"*: the tile reads `7.0×`
 * over the label `Worst demand-to-supply ratio`. Legacy writes
 * `2.4× demand/supply` into the value itself (`eyvar_ops_panel_v40_fixed.html:6953`),
 * which cannot be right-aligned against another number (R4) and cannot be
 * translated (AC-713).
 *
 * **U+00D7, not the letter `x` and not `*`.** And not a glyph Inter lacks:
 * U+00D7 is Latin-1 Supplement, so it renders in Inter and in Noto Naskh Arabic
 * rather than falling through to an emoji font and painting in colour — the
 * wave-4 defect that took the tile glyphs out. `i18n/direction.ts` already
 * carries `×` in its closed set of marks that do **not** mirror.
 *
 * One decimal, always: a ratio is a comparison, and `7×` beside `7.4×` in the
 * same column is the ragged decimal point R4 exists to prevent.
 */
export function formatRatio(value: number, language: Language = 'en'): string {
  return `${formatDecimal(value, 1, language)}${MULTIPLICATION_SIGN}`
}

/** U+00D7. Exported so a test can assert the character rather than eyeball it. */
export const MULTIPLICATION_SIGN = '\u00D7'
