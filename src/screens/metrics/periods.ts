/**
 * Metrics › **the windows a board can be asked for.**
 *
 * ## Why these are rolling and Finance's are calendar
 *
 * `src/screens/financials/shared/periodPresets.ts` offers `This month`,
 * `Last month`, `Quarter to date` — CALENDAR windows, because a ledger closes
 * on a month boundary and a finance lead reconciles against one. A metrics
 * board is not closing anything. Its question is *how has this been running*,
 * and the answer is always relative to now: the last day, the last week, the
 * last quarter. So these are ROLLING windows ending on the board's own day, and
 * the two sets are deliberately not shared.
 *
 * The one exception is `year`, which most products render as a fiscal
 * year-to-date. It is a rolling 365 here for the same reason as the rest, and
 * it is named `year` rather than `yearToDate` so nobody reads a fiscal claim
 * into it. Eyvar has not declared a fiscal year; when it does, that is a
 * Finance concept and it belongs in the Finance table.
 *
 * ## The day count is inclusive
 *
 * `week` is seven days INCLUDING today, so 19 Jun – 25 Jun rather than 18 – 25.
 * An operator asking for a week expects seven rows in the chart underneath, and
 * a window that quietly runs to eight is the kind of off-by-one that only
 * surfaces when somebody sums the column by hand.
 */

import type { IsoDate } from '@/data/types'

/** A closed window, both ends inclusive, in the board's own timezone. */
export interface MetricPeriod {
  start: IsoDate
  end: IsoDate
}

export type MetricPeriodId = 'day' | 'week' | 'twoWeeks' | 'month' | 'quarter' | 'year'

/** Days in each window, counting the end day itself. */
const SPAN: Record<MetricPeriodId, number> = {
  day: 1,
  week: 7,
  twoWeeks: 14,
  month: 30,
  quarter: 90,
  year: 365,
}

/**
 * The order the picker lists them in — shortest first, which is the order an
 * operator narrows in. `METRIC_PERIODS` is the single source for both the list
 * and the match, so a seventh window cannot be offered without being
 * recognisable.
 */
export const METRIC_PERIODS: readonly MetricPeriodId[] = [
  'day',
  'week',
  'twoWeeks',
  'month',
  'quarter',
  'year',
]

/** `2026-06-25` minus `days`, in UTC arithmetic so no zone can shift a date. */
function minusDays(day: IsoDate, days: number): IsoDate {
  const at = Date.parse(`${day}T00:00:00Z`)
  const moved = new Date(at - days * 86_400_000)
  return moved.toISOString().slice(0, 10) as IsoDate
}

/** The window a preset resolves to, ending on `today`. */
export function periodOf(id: MetricPeriodId, today: IsoDate): MetricPeriod {
  return { start: minusDays(today, SPAN[id] - 1), end: today }
}

/**
 * Which preset a window IS, or `null` for one the operator typed.
 *
 * Matched on the resolved dates rather than on a stored id, so a range picked
 * by hand that happens to be the last seven days is correctly shown as `Week` —
 * the same rule `activePreset` follows in Finance, and for the same reason: the
 * check has to describe the window that is live, not the button last pressed.
 */
export function activeMetricPeriod(
  period: MetricPeriod | null,
  today: IsoDate,
): MetricPeriodId | null {
  if (!period) return null
  return (
    METRIC_PERIODS.find((id) => {
      const range = periodOf(id, today)
      return range.start === period.start && range.end === period.end
    }) ?? null
  )
}

/** `true` when `start` is after `end` — the one state `Apply` must refuse. */
export function isInverted(period: MetricPeriod): boolean {
  return period.start > period.end
}
