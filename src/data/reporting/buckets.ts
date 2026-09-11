/**
 * Bucket arithmetic — §3.5.
 *
 * ## Why this is not in `src/data/mock/`
 *
 * A server buckets the rows, but the **panel** has to know how many buckets a
 * window and grain produce *before* it issues a request: AC-817 requires a
 * grain producing more than 400 buckets to be disabled in place with a reason
 * and **no request issued**. So this is app logic in both modes, not mock
 * logic, and it sits beside the planner that uses it rather than in the mock
 * folder that a component may not reach into.
 *
 * ## Two facts everything here rests on
 *
 * **1. Buckets are Riyadh-local.** `Asia/Riyadh`, UTC+03:00, no DST — the same
 * fact `src/lib/columnFilter.ts` is built on. A bucket boundary is a local
 * midnight, never a UTC one. Every function below works on the shifted epoch
 * (`ms + 3h`) so a host in `America/Los_Angeles` produces the same boundaries
 * (AC-819).
 *
 * **2. The week starts on Sunday**, because the Saudi working week is
 * Sunday–Thursday. §3.5 is explicit that this is *a position, not a
 * derivation* — **Q-RB-3 is the business owner's call and is unanswered.** It
 * is a single constant here (`WEEK_START_DOW`) so answering it is a one-line
 * change rather than a hunt, and every weekly number in every exported report
 * moves with it.
 *
 * ## The hour grain, and the contract change it would force
 *
 * `ReportResult.buckets` is `IsoDate[]`, so an hourly bucket has nowhere to put
 * its hour. No measure declares `minGrain: 'hour'` today, so `'hour'` is always
 * illegal and never reaches boundary generation — `countBuckets` answers it
 * arithmetically so the 400-bucket rule can still state a reason. **The day a
 * store carries sub-daily history, `buckets` must widen to `IsoDateTime[]`.**
 * That is a contract change and a finding, not something to paper over with a
 * date that silently loses the hour.
 */

import { EYVAR_TZ_OFFSET } from '../mock/clock'
import type { IsoDate, IsoDateTime } from '../types/common'
import type { PeriodComparison, ReportGrain, ReportPreset, ReportWindow } from '../types/report'

/** +03:00 in milliseconds. Riyadh has no DST, so this is a constant and not a lookup. */
const RIYADH_OFFSET_MS = 3 * 3_600_000

/**
 * **Q-RB-3, unanswered.** `0` = Sunday, `1` = Monday. §3.5 takes the Sunday
 * position; the owner has not ratified it. AC-819 tests whatever this says.
 */
export const WEEK_START_DOW = 0

const DAY_MS = 86_400_000

/* ───────────────────── date <-> shifted epoch ──────────────────────────── */

/** Riyadh-local midnight of `date`, as a shifted epoch (i.e. UTC arithmetic on local wall time). */
function dayEpoch(date: IsoDate): number {
  const ms = Date.parse(`${date}T00:00:00Z`)
  if (Number.isNaN(ms)) throw new TypeError(`Not an ISO date: ${date}`)
  return ms
}

function epochToDate(epoch: number): IsoDate {
  return new Date(epoch).toISOString().slice(0, 10)
}

/** The Riyadh-local calendar day an instant falls on. This is the whole timezone story. */
export function localDayOf(iso: IsoDateTime | IsoDate): IsoDate {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) throw new TypeError(`Not an ISO date-time: ${iso}`)
  return new Date(ms + RIYADH_OFFSET_MS).toISOString().slice(0, 10)
}

/** Riyadh-local midnight of `date`, as a real instant. Bucket boundaries on the wire. */
export function localMidnight(date: IsoDate): IsoDateTime {
  return `${date}T00:00:00${EYVAR_TZ_OFFSET}`
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return epochToDate(dayEpoch(date) + days * DAY_MS)
}

export function addMonths(date: IsoDate, months: number): IsoDate {
  const d = new Date(dayEpoch(date))
  const targetMonth = d.getUTCMonth() + months
  const year = d.getUTCFullYear() + Math.floor(targetMonth / 12)
  const month = ((targetMonth % 12) + 12) % 12
  // Clamp the day: 31 Jan minus one month is 31 Dec, not 3 Mar.
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const day = Math.min(d.getUTCDate(), lastDay)
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Whole days between two dates, inclusive of both ends. `daysInclusive(d, d) === 1`. */
export function daysInclusive(from: IsoDate, to: IsoDate): number {
  return Math.floor((dayEpoch(to) - dayEpoch(from)) / DAY_MS) + 1
}

/* ─────────────────────────── window presets ────────────────────────────── */

/**
 * Resolve a window to an inclusive pair of Riyadh calendar dates.
 *
 * **`today` is a parameter, never a global.** There is no ambient clock in
 * `src/data/`; the caller passes the fixed clock's day in mock mode and the
 * server resolves it in http mode.
 *
 * `to` is the whole end day. `last-7d` includes today, matching §3.7's presets
 * and the inclusive-end-day rule `lib/columnFilter.ts` encodes.
 */
export function resolveWindow(window: ReportWindow, today: IsoDate): { from: IsoDate; to: IsoDate } {
  if (window.kind === 'absolute') return { from: window.from, to: window.to }
  return resolvePreset(window.preset, today)
}

/**
 * §2.7 adds four presets `ReportPreset` (`types/report.ts`) does not declare yet —
 * widening that union is that file's owner's call, not this one's (WP-1.3 report).
 * `resolvePreset` understands the superset so the range popover can be wired to it
 * the day the type catches up.
 */
export type ReportPresetV2 = ReportPreset | 'this-quarter' | 'last-quarter' | 'this-year' | 'year-to-date'

/** The Riyadh-local calendar quarter start (1 Jan / 1 Apr / 1 Jul / 1 Oct) `date` falls in. */
function quarterStartOf(date: IsoDate): IsoDate {
  const month = Number(date.slice(5, 7)) - 1
  const startMonth = Math.floor(month / 3) * 3
  return `${date.slice(0, 4)}-${String(startMonth + 1).padStart(2, '0')}-01`
}

export function resolvePreset(preset: ReportPresetV2, today: IsoDate): { from: IsoDate; to: IsoDate } {
  switch (preset) {
    case 'today':
      return { from: today, to: today }
    case 'yesterday': {
      const y = addDays(today, -1)
      return { from: y, to: y }
    }
    case 'last-7d':
      return { from: addDays(today, -6), to: today }
    case 'last-30d':
      return { from: addDays(today, -29), to: today }
    case 'last-90d':
      return { from: addDays(today, -89), to: today }
    case 'last-365d':
      return { from: addDays(today, -364), to: today }
    case 'last-month': {
      const firstOfThis = `${today.slice(0, 7)}-01`
      const firstOfLast = addMonths(firstOfThis, -1)
      return { from: firstOfLast, to: addDays(firstOfThis, -1) }
    }
    case 'last-12-months': {
      const firstOfThis = `${today.slice(0, 7)}-01`
      return { from: addMonths(firstOfThis, -12), to: addDays(firstOfThis, -1) }
    }
    case 'last-year': {
      const year = Number(today.slice(0, 4)) - 1
      return { from: `${year}-01-01`, to: `${year}-12-31` }
    }
    /* "This X" is to-date, matching §2.7's "no custom range" intent and this file's
       existing "last-X" = whole closed period pattern; "year-to-date" resolves the
       same window as "this-year" since that is what the term names (WP-1.3 report). */
    case 'this-quarter':
      return { from: quarterStartOf(today), to: today }
    case 'last-quarter': {
      const end = addDays(quarterStartOf(today), -1)
      return { from: quarterStartOf(end), to: end }
    }
    case 'this-year':
    case 'year-to-date':
      return { from: `${today.slice(0, 4)}-01-01`, to: today }
  }
}

/**
 * Equal-length prior window, the same calendar window one quarter/year earlier,
 * or an operator-named `fixed` window (§2.6, AC-830). `fixed` is returned as
 * named — the bucket-count match against the current window is `comparison-length`,
 * the planner's job, since this function has no `grain` to count with.
 */
export function comparisonWindow(
  current: { from: IsoDate; to: IsoDate },
  comparison: Exclude<PeriodComparison, 'none'>,
): { from: IsoDate; to: IsoDate } {
  if (typeof comparison === 'object') return { from: comparison.from, to: comparison.to }
  if (comparison === 'previous-year') {
    return { from: addMonths(current.from, -12), to: addMonths(current.to, -12) }
  }
  if (comparison === 'previous-quarter') {
    return { from: addMonths(current.from, -3), to: addMonths(current.to, -3) }
  }
  const length = daysInclusive(current.from, current.to)
  return { from: addDays(current.from, -length), to: addDays(current.to, -length) }
}

/* ──────────────────────────── boundaries ───────────────────────────────── */

/** The start of the bucket `date` falls in, at `grain`. */
export function bucketStartOf(date: IsoDate, grain: Exclude<ReportGrain, 'none' | 'hour'>): IsoDate {
  if (grain === 'day') return date
  if (grain === 'month') return `${date.slice(0, 7)}-01`
  if (grain === 'quarter') return quarterStartOf(date)
  // week — walk back to WEEK_START_DOW. 1970-01-01 was a Thursday (dow 4).
  const dow = (Math.floor(dayEpoch(date) / DAY_MS) + 4) % 7
  const back = (dow - WEEK_START_DOW + 7) % 7
  return addDays(date, -back)
}

/** The day after the bucket ends — an exclusive upper bound, so no `23:59:59.999` appears anywhere. */
export function bucketEndExclusive(
  bucketStart: IsoDate,
  grain: Exclude<ReportGrain, 'none' | 'hour'>,
): IsoDate {
  if (grain === 'day') return addDays(bucketStart, 1)
  if (grain === 'week') return addDays(bucketStart, 7)
  if (grain === 'quarter') return addMonths(bucketStart, 3)
  return addMonths(bucketStart, 1)
}

/**
 * Every bucket start in the window, ascending.
 *
 * `grain: 'none'` **collapses the window to one bucket** and that bucket starts
 * at `from` — it is a legal grain, not an absence of one (§3.5).
 */
export function bucketStarts(from: IsoDate, to: IsoDate, grain: ReportGrain): IsoDate[] {
  if (from > to) return []
  if (grain === 'none') return [from]
  if (grain === 'hour') {
    // Unreachable while no measure declares minGrain 'hour'; see the file header.
    throw new TypeError('hourly buckets need ReportResult.buckets to be IsoDateTime[]')
  }
  const out: IsoDate[] = []
  let cursor = bucketStartOf(from, grain)
  while (cursor <= to) {
    out.push(cursor)
    cursor = bucketEndExclusive(cursor, grain)
  }
  return out
}

/**
 * How many buckets, **without generating them** — so a 2-year hourly window can
 * be counted and refused rather than materialised (AC-817).
 */
export function countBuckets(from: IsoDate, to: IsoDate, grain: ReportGrain): number {
  if (from > to) return 0
  if (grain === 'none') return 1
  if (grain === 'hour') return daysInclusive(from, to) * 24
  if (grain === 'day') return daysInclusive(from, to)
  if (grain === 'week') {
    const first = bucketStartOf(from, 'week')
    return Math.floor((dayEpoch(to) - dayEpoch(first)) / (7 * DAY_MS)) + 1
  }
  if (grain === 'quarter') {
    const a = Number(from.slice(0, 4)) * 4 + Math.floor((Number(from.slice(5, 7)) - 1) / 3)
    const b = Number(to.slice(0, 4)) * 4 + Math.floor((Number(to.slice(5, 7)) - 1) / 3)
    return b - a + 1
  }
  const a = Number(from.slice(0, 4)) * 12 + Number(from.slice(5, 7))
  const b = Number(to.slice(0, 4)) * 12 + Number(to.slice(5, 7))
  return b - a + 1
}

/**
 * Which bucket a date falls into, or `-1`.
 *
 * A linear scan on purpose: a 400-bucket ceiling makes it irrelevant, and the
 * next person to debug a boundary needs to be able to read this.
 */
export function bucketIndexOf(date: IsoDate, buckets: readonly IsoDate[], grain: ReportGrain): number {
  if (buckets.length === 0) return -1
  if (grain === 'none') return 0
  for (let i = buckets.length - 1; i >= 0; i -= 1) {
    const start = buckets[i]
    if (start !== undefined && date >= start) return i
  }
  return -1
}

/**
 * Buckets the window only partly covers, or that have not finished yet.
 *
 * §3.5: partial buckets are **rendered and marked**, never dropped and never
 * extrapolated — *"a flow measure's final partial bucket is what makes every
 * trend look like a collapse at the right-hand edge"* — and a partial bucket is
 * excluded from the period-comparison delta (AC-818).
 *
 * `today` is passed, not read: a bucket whose natural end is in the future is
 * partial regardless of whether the window asked for it.
 *
 * **A bucket ending *on* `today` is partial too**, because today has not
 * finished. §12.3 depends on this: a rule reads the most recent *complete*
 * bucket, and *"a flow measure's current partial bucket is always below any
 * sensible floor, so evaluating it would fire every rule every morning."* The
 * fixed clock is 09:14, so 25 June is nine hours of a day, not a day.
 */
export function partialBucketIndexes(
  buckets: readonly IsoDate[],
  grain: ReportGrain,
  window: { from: IsoDate; to: IsoDate },
  today: IsoDate,
): number[] {
  if (grain === 'none' || buckets.length === 0) return []
  const g = grain as Exclude<ReportGrain, 'none' | 'hour'>
  const out: number[] = []
  buckets.forEach((start, i) => {
    const endExclusive = bucketEndExclusive(start, g)
    const lastDay = addDays(endExclusive, -1)
    const cutByWindow = start < window.from || lastDay > window.to
    const unfinished = lastDay >= today
    if (cutByWindow || unfinished) out.push(i)
  })
  return out
}
