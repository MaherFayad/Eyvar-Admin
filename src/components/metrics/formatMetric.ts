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
import type { CurrencyCode, MetricUnit } from '@/data/types'

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
 * **Is this movement good news or bad news?** The one place that decides, so
 * the word a reader sees and the clause a screen reader hears are the same
 * judgement rather than two implementations of it.
 *
 * `higherIsBetter` has been on `Metric` since the data layer was written, with
 * its own doc comment explaining exactly this use — *"Churn up is bad; renewal
 * up is good"*. D7 §4.9 then forbade toning the delta chip, which spent the
 * field on a screen-reader phrase and left a sighted operator with no valence
 * carrier at all. The amendment does not un-forbid the tone: the chip is still
 * neutral, and this drives a WORD and a caret colour beside it.
 *
 * **Zero is `null`, not `'better'`.** Nothing moved, so nothing improved or
 * worsened — and the tile already renders `unchanged` for that case. Returning
 * a valence at zero would paint every flat metric green or red, which is the
 * failure mode people cite when they argue against coloured deltas at all.
 */
export type MetricValence = 'better' | 'worse'

export function metricValence(
  deltaPercent: number,
  higherIsBetter: boolean,
): MetricValence | null {
  if (deltaPercent === 0) return null
  return deltaPercent > 0 === higherIsBetter ? 'better' : 'worse'
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
/**
 * **A metric's value split into the numeral and the unit beside it.**
 *
 * `formatMetricValue` returns `8,075.70 SAR` — one string, which is right for
 * a screen that prints a money value inside a sentence and wrong for one that
 * sets it at 40px. Two reasons, and the second is the one that forced this:
 *
 *   1. **The reference sets the unit on the line below the numeral**, in the
 *      caption's type, with the comparison phrase. `8,075.70` at 40px beside
 *      `↑ +57%` is a quantity and its change; `SAR` is neither, and putting it
 *      between them makes the eye cross a word to get from one to the other.
 *   2. **It was wrapping, measurably.** At 1440 the band's column is 343px and
 *      `8,075.70 SAR` at 40px is 270 — so the numeral and its delta needed 350
 *      and the delta fell to its own line, on the one figure of the three that
 *      is the board's headline. Arabic is longer still. Taking the unit out
 *      leaves the numeral at ~150 and the pair fits at every width in both
 *      languages, rather than fitting until somebody adds a digit.
 *
 * **It does NOT format money itself** (AC-340). `formatMoney`'s own
 * `unit: 'none'` option produces the digits and `Metric.currency` carries the
 * code — which is the exact string `formatMoney` would have appended. The two
 * halves recombine to the byte the one-string version returns.
 *
 * `unit` is `null` for every non-money measure: a percent, a count and a ratio
 * carry their unit IN the numeral (`11%`, `0.5×`) and splitting them would
 * leave a bare number and a stranded sign.
 */
export function splitMetricValue(
  value: number | null,
  unit: MetricUnit,
  currency: CurrencyCode | null,
  language: Language,
): { value: string; unit: string | null } {
  if (value !== null && unit === 'money') {
    return { value: formatMoney(value, { unit: 'none' }), unit: currency ?? 'SAR' }
  }
  return { value: formatMetricValue(value, unit, language), unit: null }
}

/**
 * The window's one number, by the rule the series declares.
 *
 * `null` when the series declares no rule, and also when the rule is declared
 * but the window has no reading to apply it to — an empty window and a window
 * of gaps both give `last` nothing to return, and a `sum` over no readings is
 * not zero, it is unknown. §3.7's distinction between *"we measured and the
 * answer was 0"* and *"we have no reading"* is the whole reason this returns
 * `null` rather than `0`.
 */
export function seriesWindowTotal(series: {
  windowTotal?: 'sum' | 'last' | null
  current: { points: readonly { value: number | null }[] }
}): number | null {
  const rule = series.windowTotal
  if (!rule) return null
  const readings = series.current.points
    .map((point) => point.value)
    .filter((value): value is number => value !== null)
  if (readings.length === 0) return null
  if (rule === 'last') return readings[readings.length - 1] ?? null
  return readings.reduce((total, value) => total + value, 0)
}

export function formatSeriesValue(value: number, unit: MetricUnit, language: Language): string {
  if (unit === 'money') return formatMoney(value, { unit: 'none' })
  return formatMetricValue(value, unit, language)
}
