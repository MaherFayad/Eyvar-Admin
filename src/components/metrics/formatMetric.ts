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
 * **`formatDecimal`, `formatPercent` and `formatRatio` now live in
 * `src/lib/format/number.ts`** — the wave-4 handoff landed, closing W4-F5 and
 * W4-F7. They are re-exported below so the old import path keeps working.
 * What stays here is what is genuinely about METRICS rather than about
 * numbers: `formatMetricValue` and `formatSeriesValue` switch on `MetricUnit`,
 * which is domain, and `formatSignedPercent` is §3.7's delta rule.
 */

import {
  ABSENT,
  MINUS_SIGN,
  formatCount,
  formatDecimal,
  formatDuration,
  formatMoney,
  formatPercent,
  formatRatio,
  type Language,
} from '@/lib'
import type { MetricUnit } from '@/data/types'

/* The old path keeps working: `index.ts` re-exports from this file, and
   screens imported these from here before the move. */
export { formatDecimal, formatPercent, formatRatio } from '@/lib'

const MS_PER_MINUTE = 60_000

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
      return formatDecimal(value, 1, language)
    case 'ratio':
      return formatRatio(value, language)
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
