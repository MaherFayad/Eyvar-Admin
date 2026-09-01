/**
 * The fixed clock every fixture and every mock client is written against.
 *
 * `Date.now()` must never appear at module scope in this data layer. A fixture
 * whose "3 days ago" moves every run cannot be diffed by a visual regression
 * test, and a snapshot taken at 23:59 fails at 00:01 for a reason nobody can
 * reproduce.
 *
 * The value is not arbitrary — it is the legacy app's own internal "today":
 *   `REQ_NOW_REF = new Date(2026,5,25,9,14,0)`  (`eyvar_ops_panel_v40_fixed.html:9555`)
 *   `EYVAR_TODAY = new Date(2026,5,25)`         (`:11232`)
 *   dashboard subtitle `'Thursday 25 Jun 2026 · 09:14 AM'` (`:2169`)
 * All three agree, and every seeded date in the file is relative to them.
 *
 * Callers that need relative time ("expires in 3 days", "claimed 12 minutes
 * ago") take a clock argument. They do not read a global.
 */

import type { IsoDate, IsoDateTime } from '../types/common'

/** Riyadh. The whole dataset is one city; the offset is explicit so parsing is not host-dependent. */
export const EYVAR_TZ_OFFSET = '+03:00'

/** `2026-06-25T09:14:00+03:00` — the instant the fixtures describe. */
export const EYVAR_NOW: IsoDateTime = `2026-06-25T09:14:00${EYVAR_TZ_OFFSET}`

/** `2026-06-25` — the calendar day the fixtures describe. */
export const EYVAR_TODAY: IsoDate = '2026-06-25'

/**
 * A clock is a function returning the current instant. Production passes
 * `systemClock`; fixtures, tests and Playwright pass `fixedClock`.
 *
 * Every helper that computes an elapsed or remaining duration takes one of
 * these. That is the whole contract — there is no ambient time in `src/data/`.
 */
export type Clock = () => IsoDateTime

export const fixedClock: Clock = () => EYVAR_NOW

/** The only sanctioned reader of the host clock in this directory. */
export const systemClock: Clock = () => new Date().toISOString()

/** Epoch milliseconds for an ISO instant. Throws on garbage rather than yielding NaN silently. */
export function toEpochMs(iso: IsoDateTime): number {
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) throw new TypeError(`Not an ISO date-time: ${iso}`)
  return ms
}

/** Whole days from `iso` to `now`, negative when `iso` is in the future. */
export function daysSince(iso: IsoDateTime | IsoDate, now: IsoDateTime = EYVAR_NOW): number {
  return Math.floor((toEpochMs(now) - toEpochMs(normaliseDate(iso))) / 86_400_000)
}

/** Whole days remaining until `iso`, negative when it has passed. Legacy `docDaysLeft` (`:13287`). */
export function daysUntil(iso: IsoDateTime | IsoDate, now: IsoDateTime = EYVAR_NOW): number {
  return -daysSince(iso, now)
}

export function minutesSince(iso: IsoDateTime, now: IsoDateTime = EYVAR_NOW): number {
  return Math.floor((toEpochMs(now) - toEpochMs(iso)) / 60_000)
}

/**
 * Widen a date to an instant. A bare `2026-06-25` is **midnight in Riyadh**,
 * not midnight UTC — `Date.parse('2026-06-25')` returns UTC midnight, which is
 * 03:00 local, three hours into the wrong day at every boundary.
 *
 * This is what every date field goes through before it is compared, so a
 * `date-range` filter is matching instant against instant. The range control
 * emits Riyadh instants with an inclusive `23:59:59.999+03:00` upper bound; a
 * value left as a bare date string would be compared against those bounds by
 * luck of the offset's sign rather than by construction.
 *
 * Null-safe on purpose: nullable date columns are the common case
 * (`lastTripAt` on a captain who has never driven), and `isNull` / `isNotNull`
 * must keep working on them.
 */
export function toInstant(iso: IsoDateTime | IsoDate | null | undefined): IsoDateTime | null {
  if (iso === null || iso === undefined) return null
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00${EYVAR_TZ_OFFSET}` : iso
}

/** Internal alias kept so the day-arithmetic helpers above read as they did. */
const normaliseDate = (iso: IsoDateTime | IsoDate): IsoDateTime => toInstant(iso) as IsoDateTime

/**
 * Build a fixture timestamp by offsetting the fixed clock. Keeps fixtures
 * readable and still deterministic.
 *
 * **`seconds` exists because of D22.** The chat first-response promise is
 * **45 seconds**, and D22 is explicit that the number is chosen to be *"inside
 * a minute"*. A fixture that could only express whole minutes would have to
 * round it to 0 or 1, and rounding a promise is how the promise stops being the
 * one that was ruled.
 */
export function offsetFromNow(opts: {
  days?: number
  hours?: number
  minutes?: number
  seconds?: number
}): IsoDateTime {
  const ms =
    toEpochMs(EYVAR_NOW) +
    (opts.days ?? 0) * 86_400_000 +
    (opts.hours ?? 0) * 3_600_000 +
    (opts.minutes ?? 0) * 60_000 +
    (opts.seconds ?? 0) * 1_000
  // Re-render in the dataset's offset so fixtures read as Riyadh local time.
  const d = new Date(ms + 3 * 3_600_000)
  const p = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}` +
    `T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}${EYVAR_TZ_OFFSET}`
  )
}
