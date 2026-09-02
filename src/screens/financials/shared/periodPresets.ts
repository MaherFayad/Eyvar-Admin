/**
 * **The reporting periods a close process recognises**, as pure functions on a
 * day string.
 *
 * Separated from the control so the arithmetic is testable without a DOM, and
 * because every one of these is a place a date library silently gets a month
 * boundary wrong. `PeriodControl`'s own note already recorded one such defect —
 * `new Date(y, m - 1, 31)` walks into the next month for every 30-day month,
 * "which is how a period control ends up showing `1 Jul to 1 Jul`". All of the
 * arithmetic below is `Date.UTC` with the DAY taken out of it, for that reason.
 *
 * **Every preset lands on month boundaries and that is the point.** The picker
 * added beside these can express any range at all; these are the ranges a
 * Finance lead's close process actually recognises, so they are one click and
 * everything else is two. See `PeriodPicker` for why both halves exist.
 */

import type { FinancialsPeriod } from '@/data/types'

const pad = (n: number) => String(n).padStart(2, '0')

/** The `[year, month]` a day string names, 1-based month. */
function partsOf(day: string): [number, number] {
  const [year = 2026, month = 1] = day.split('-').map(Number)
  return [year, month]
}

/** The whole calendar month containing `year`/`month` (1-based). */
export function monthPeriod(year: number, month: number): FinancialsPeriod {
  const anchor = new Date(Date.UTC(year, month - 1, 1))
  const y = anchor.getUTCFullYear()
  const m = anchor.getUTCMonth()
  /* Day 0 of the NEXT month is the last day of this one — the one form of this
     that needs no leap-year branch and no table of month lengths. */
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  return { start: `${y}-${pad(m + 1)}-01`, end: `${y}-${pad(m + 1)}-${pad(last)}` }
}

/**
 * Move a calendar month, staying on month boundaries.
 *
 * Kept exported and unchanged in behaviour: it is `PeriodControl`'s original
 * export, it is covered by existing tests, and the picker's `Previous`/`Next`
 * still call it. Only its home moved.
 */
export function shiftPeriodMonths(period: FinancialsPeriod, delta: number): FinancialsPeriod {
  const [year, month] = partsOf(period.start)
  const anchor = new Date(Date.UTC(year, month - 1 + delta, 1))
  return monthPeriod(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1)
}

/** The calendar month `today` falls in. */
export function thisMonth(today: string): FinancialsPeriod {
  const [year, month] = partsOf(today)
  return monthPeriod(year, month)
}

export function lastMonth(today: string): FinancialsPeriod {
  return shiftPeriodMonths(thisMonth(today), -1)
}

/**
 * The three whole months ending with the one `today` falls in.
 *
 * Inclusive of the current month rather than the three BEFORE it: a Finance
 * lead asking for "last 3 months" mid-June wants April, May and June, and a
 * window that stopped at May would silently exclude the period every other
 * control on the page is showing.
 */
export function lastThreeMonths(today: string): FinancialsPeriod {
  const current = thisMonth(today)
  return { start: shiftPeriodMonths(current, -2).start, end: current.end }
}

/** 1 Jan of `today`'s year to the end of `today`'s month. */
export function yearToDate(today: string): FinancialsPeriod {
  const [year] = partsOf(today)
  return { start: `${year}-01-01`, end: thisMonth(today).end }
}

/**
 * The calendar quarter `today` falls in, to the end of `today`'s month.
 *
 * Calendar quarters, not fiscal ones. **Q-F8 is open** — the close process has
 * not defined a fiscal year — so this is the one preset here that a close
 * process might later disagree with, and it is named `quarterToDate` rather
 * than `fiscalQuarter` so the disagreement is visible when it happens.
 */
export function quarterToDate(today: string): FinancialsPeriod {
  const [year, month] = partsOf(today)
  const firstOfQuarter = Math.floor((month - 1) / 3) * 3 + 1
  return { start: `${year}-${pad(firstOfQuarter)}-01`, end: thisMonth(today).end }
}

export type PeriodPresetId =
  | 'thisMonth'
  | 'lastMonth'
  | 'lastThreeMonths'
  | 'quarterToDate'
  | 'yearToDate'

export const PERIOD_PRESETS: ReadonlyArray<{
  id: PeriodPresetId
  of: (today: string) => FinancialsPeriod
}> = [
  { id: 'thisMonth', of: thisMonth },
  { id: 'lastMonth', of: lastMonth },
  { id: 'lastThreeMonths', of: lastThreeMonths },
  { id: 'quarterToDate', of: quarterToDate },
  { id: 'yearToDate', of: yearToDate },
]

/**
 * Which preset a period IS, or `null` for a custom range.
 *
 * §10.2 requires "a check on the active preset", and this is what makes that
 * statable rather than a guess: the check is on the preset whose computed
 * window equals the live one, so a range typed by hand that happens to be last
 * month is correctly shown as last month.
 */
export function activePreset(period: FinancialsPeriod, today: string): PeriodPresetId | null {
  const match = PERIOD_PRESETS.find((preset) => {
    const range = preset.of(today)
    return range.start === period.start && range.end === period.end
  })
  return match?.id ?? null
}

/** `true` when `start` is after `end` — the one state `Apply` must refuse. */
export function isInverted(period: FinancialsPeriod): boolean {
  return period.start > period.end
}
