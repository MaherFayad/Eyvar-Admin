/**
 * Turning a `Metric`'s bare `number | null` into a string, in one place.
 *
 * The data layer sends a number and a `MetricUnit` and nothing else — which is
 * deliberate (`types/metrics.ts`: *"so `formatMoney` / `formatPercent` are
 * chosen from data rather than guessed from the key's name"*). This file is
 * the other half of that contract: one `switch`, six units, no screen ever
 * reaching for `toLocaleString()`.
 *
 * **Nothing here computes.** `deltaPercent` arrives signed and rounded from the
 * server; this picks a string for it. `types/metrics.ts` is explicit about why:
 * *"a screen that subtracts two numbers cannot tell 'no change' from 'no
 * comparison'."*
 *
 * Rules applied
 *   §9.2 / R4  Western digits in both languages, via `localeFor`'s `-nu-latn`.
 *              The numeral run does not mirror; the CELL aligns.
 *   §8.3.2     the sign is **U+2212**, not a hyphen-minus, and it is
 *              typographic — never chromatic, never in a toned pill.
 *   §3.7       `null` renders an em dash, never `0`. A count of an empty set
 *              and a count that could not be computed are different facts, and
 *              `Metric.value`'s own doc comment names conflating them as the
 *              legacy defect (`:6913` gets it right on one tile and wrong on
 *              every other).
 *   §8.3.1     money is halalas in, `formatMoney` out, `SAR` trailing.
 *
 * **`formatPercent` has no home in `src/lib` yet and should get one.**
 * `src/lib/format/number.ts` owns counts and ranges and this belongs beside
 * them, but `src/lib` is utilities-engineer's file. Raised in the wave-4
 * handoff with the call sites already in hand.
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
import type { MetricUnit } from '@/data/types'

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
 * rating, a ratio, a percentage with a fraction in it. `formatCount` refuses a
 * fraction on purpose, so this is the other half of that rule rather than a
 * loosening of it.
 */
export function formatDecimal(value: number, precision: number, language: Language): string {
  const magnitude = decimalFormatter(language, precision).format(Math.abs(value))
  return value < 0 ? `${MINUS_SIGN}${magnitude}` : magnitude
}

/**
 * `92` → `92%`. Percentage POINTS in, never a fraction.
 *
 * A decimal only when the value has one: `92%` and `4.5%` both read cleanly,
 * `92.0%` reads as spurious precision on a tile the operator scans past.
 */
export function formatPercent(value: number, language: Language): string {
  return `${formatDecimal(value, Number.isInteger(value) ? 0 : 1, language)}%`
}

/**
 * A signed change, as §3.7's delta text: `+12%`, `−4%`, `0%`.
 *
 * **`0%` is a real answer and is never an em dash.** "Measured, did not move"
 * and "nothing to compare to" are different facts and §3.7 requires different
 * strings; the em dash belongs to `deltaPercent === null` and is chosen by the
 * tile, not here.
 */
export function formatSignedPercent(value: number, language: Language): string {
  const magnitude = formatPercent(Math.abs(value), language)
  if (value > 0) return `+${magnitude}`
  if (value < 0) return `${MINUS_SIGN}${magnitude}`
  return magnitude
}

/**
 * The one formatter a tile, an axis tick or a legend calls.
 *
 * `null` returns the em dash — the single place in the metric layer that
 * decides what "we could not compute this" looks like. `formatMoney` refuses to
 * return one itself, for the same reason (`money.ts`), so the decision has to
 * live above it and it lives here.
 */
export function formatMetricValue(
  value: number | null,
  unit: MetricUnit,
  language: Language,
): string {
  if (value === null) return ABSENT
  switch (unit) {
    case 'count':
      return formatCount(Math.round(value), language)
    case 'money':
      return formatMoney(value)
    case 'percent':
      return formatPercent(value, language)
    case 'minutes':
      return formatDuration(value * MS_PER_MINUTE)
    case 'rating':
    case 'ratio':
      return formatDecimal(value, 1, language)
  }
}

/**
 * The same, for a chart's y-axis and its tooltip.
 *
 * Money drops the trailing `SAR` — §8.3.1: in a repeated numeric context the
 * unit appears once, and on a chart that place is the card, not every gridline.
 */
export function formatSeriesValue(value: number, unit: MetricUnit, language: Language): string {
  if (unit === 'money') return formatMoney(value, { unit: 'none' })
  return formatMetricValue(value, unit, language)
}
