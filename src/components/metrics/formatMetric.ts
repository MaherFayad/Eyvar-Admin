/**
 * Turning a `MetricValue` into a string, in one place.
 *
 * Eight screens, ~34 tiles and ~10 chart axes render numbers on this wave. The
 * legacy app has three money formatters across 87 call sites
 * (`src/lib/format/money.ts` header); this exists so the metric layer does not
 * repeat that with percentages.
 *
 * **Nothing here computes anything.** `formatSignedPercent` is handed a signed
 * number by the data layer and chooses a glyph for it; it never subtracts one
 * period from another. That is the contract's fact 1, enforced by there being
 * no arithmetic to find.
 *
 * Rules applied
 *   §9.2 / R4  Western digits in both languages, via `localeFor`'s `-nu-latn`.
 *              The numeral run does not mirror; the CELL aligns.
 *   §8.3.2     the sign is **U+2212**, not a hyphen-minus, and it is
 *              typographic — never chromatic, never in a toned pill.
 *   §3.7       an absent comparison is an em dash, never `0%` and never blank.
 *              `0%` means "measured, did not move" and is a different string.
 *   `money.ts` `formatMoney` never returns an em dash, so `absent` is decided
 *              here, above it, exactly once.
 *
 * **`formatPercent` has no home in `src/lib` yet and should get one.**
 * `src/lib/format/number.ts` owns counts and ranges and this belongs beside
 * them, but `src/lib` is utilities-engineer's file. Raised in the wave-4
 * handoff with the three call sites already in hand.
 */

import {
  ABSENT,
  MINUS_SIGN,
  formatCount,
  formatDuration,
  formatMoney,
  localeFor,
  type Language,
} from '@/lib'
/* Type-only. When the metrics resource lands this import becomes
   `@/data/types` and nothing else in this file changes. */
import type { MetricValue } from '@/screens/metrics/contract'

const MS_PER_MINUTE = 60_000

/** One formatter per locale/precision pair; construction is the expensive part. */
const decimalFormatters = new Map<string, Intl.NumberFormat>()

function decimalFormatter(language: Language, precision: number): Intl.NumberFormat {
  const locale = localeFor(language)
  const key = `${locale}|${precision}`
  let found = decimalFormatters.get(key)
  if (!found) {
    /* `localeFor` already carries `-u-ca-gregory-nu-latn`; `numberingSystem`
       says it again where a reader can see it, as `date.ts` does. */
    found = new Intl.NumberFormat(locale, {
      numberingSystem: 'latn',
      useGrouping: true,
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    })
    decimalFormatters.set(key, found)
  }
  return found
}

/**
 * `4.2` → `4.2`. A measured quantity that is not a whole count — an average
 * rating, a ratio. `formatCount` refuses a fraction on purpose, so this is the
 * other half of that rule rather than a loosening of it.
 */
export function formatDecimal(value: number, precision: number, language: Language): string {
  const magnitude = decimalFormatter(language, precision).format(Math.abs(value))
  return value < 0 ? `${MINUS_SIGN}${magnitude}` : magnitude
}

/** `92` → `92%`. Percentage POINTS in, never a fraction. */
export function formatPercent(value: number, language: Language, precision = 0): string {
  return `${formatDecimal(value, precision, language)}%`
}

/**
 * A signed change, as §3.7's delta text: `+12%`, `−4%`, `0%`.
 *
 * **`0%` is a real answer and is never an em dash.** "Measured, did not move"
 * and "nothing to compare to" are different facts and §3.7 requires different
 * strings; the em dash belongs to `Comparison.kind === 'none'` and is chosen by
 * the tile, not here.
 */
export function formatSignedPercent(value: number, language: Language): string {
  const magnitude = formatPercent(Math.abs(value), language)
  if (value > 0) return `+${magnitude}`
  if (value < 0) return `${MINUS_SIGN}${magnitude}`
  return magnitude
}

/**
 * The one formatter a tile, an axis tick or a breakdown row calls.
 * `absent` returns the em dash — the single place in the metric layer that
 * decides what "we do not have this number" looks like.
 */
export function formatMetricValue(value: MetricValue, language: Language): string {
  switch (value.kind) {
    case 'count':
      return formatCount(value.value, language)
    case 'money':
      return formatMoney(value.halalas)
    case 'percent':
      return formatPercent(value.value, language)
    case 'duration':
      return formatDuration(value.minutes * MS_PER_MINUTE)
    case 'decimal':
      return formatDecimal(value.value, value.precision, language)
    case 'absent':
      return ABSENT
  }
}

/** The axis and tooltip formatter for a trend, chosen by the series' unit. */
export function formatSeriesValue(
  value: number,
  unit: 'count' | 'money' | 'percent' | 'duration' | 'decimal',
  language: Language,
): string {
  switch (unit) {
    case 'money':
      return formatMoney(value, { unit: 'none' })
    case 'percent':
      return formatPercent(value, language)
    case 'duration':
      return formatDuration(value * MS_PER_MINUTE)
    case 'decimal':
      return formatDecimal(value, 1, language)
    case 'count':
      return formatCount(Math.round(value), language)
  }
}
