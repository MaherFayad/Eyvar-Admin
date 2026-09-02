/**
 * Duration as a **magnitude**, in the four shapes the design permits.
 *
 * Design spec 00-shell §9.3 fixes the SLA countdown formats:
 * `12m left` · `3h 20m left` · `2d 4h left` · `overdue 14m`. The word
 * (`left` / `overdue`) carries the sign — §7.5, so the state survives colour
 * being removed — which is why this function renders no sign at all.
 *
 * Ported from `fmtAge` (`eyvar_ops_panel_v40_fixed.html:14630`), with two of its
 * behaviours deliberately **not** carried across:
 *
 * 1. `Math.max(0, ms)` clamped negatives to zero, so every call site that wanted
 *    "overdue" had to pass `-ms` (`:14797`, `:19234`). Sign handling belonged in
 *    one place and was in twelve. Here the input is a magnitude by contract.
 * 2. `Math.round(ms/60000)` rounded to the nearest minute, so 20 seconds left
 *    rendered `0m` — a live countdown that reads "0m left" for a whole minute.
 *    The minute tier rounds **up** instead: anything above zero reads at least
 *    `1m`, and only a true zero reads `0m`.
 *
 * ## The seconds tier — Q-13 / AC-215 (`specs/02-work-queues.md` §4.3)
 *
 * > Where a window is **under 10 minutes**, the countdown renders in seconds —
 * > `45s left`, `overdue 20s` — because `2m left` … `1m left` … `0m left` is
 * > not a countdown a person can act on. It is a new tier below the existing
 * > `Nm` tier; the three existing tiers are unchanged.
 *
 * D22's **45-second chat first-response target** is the case that made this
 * urgent: for the entire life of that clock the minute tier reads `1m`, and
 * then the item is breached. A countdown that cannot move is not a countdown.
 *
 * **Seconds are opt-in, and that is the whole point.** The tier is chosen by
 * the *promise being measured*, never by the number: a 4-hour ticket clock must
 * not start flickering `47s` in its last minute, because second-by-second
 * precision on a four-hour promise is noise an operator cannot use. So the
 * caller passes `precision: 'second'`, and the one caller that decides it from
 * a rule is `lib/sla.ts` — which reads the item's own window and applies
 * Q-13's 10-minute test centrally, so no screen can get it wrong.
 *
 * ## Which way the rounding goes, and why it differs per tier
 *
 * The minute tier rounds **up** (`Math.ceil`), and on the *remaining* side that
 * overstates: 44 seconds left reads `1m left`, which claims more time than
 * there is. That is a real, deliberate trade — it is the only thing standing
 * between the minute tier and `0m left` for a whole minute (the legacy defect
 * above, and `MyWorkScreen`'s AC-290 note: "no row shows `overdue 0m` at
 * rest"). Truncating the minute tier would re-open both, so it stays.
 *
 * The seconds tier does not have that problem — every sub-minute value is
 * expressible — so it takes the safe direction and **truncates**: 44.9 seconds
 * remaining reads `44s`, never `45s`. Inside the tier that measures a
 * 45-second promise, the number never claims more time than there is.
 */

import { invariant } from '../invariant'

const MS_PER_SECOND = 1_000
const MS_PER_MINUTE = 60_000
const MINUTES_PER_HOUR = 60
const MINUTES_PER_DAY = 1_440

/**
 * Which tier a duration may fall into.
 *
 * `'minute'` — the default and the historic behaviour: `14m`, `3h 20m`, `2d 4h`.
 * `'second'` — the same three, plus `44s` below one minute.
 */
export type DurationPrecision = 'minute' | 'second'

export interface FormatDurationOptions {
  /** Defaults to `'minute'`. See the tier note above before widening a caller. */
  precision?: DurationPrecision
}

/**
 * `840000` -> `14m`. `12000000` -> `3h 20m`. `187200000` -> `2d 4h`.
 * With `{ precision: 'second' }`, `44000` -> `44s`.
 *
 * Takes the absolute value, so a caller holding a negative "remaining" does not
 * have to negate it and cannot forget to.
 *
 * **The tier boundary is one minute**, chosen to sit exactly where the existing
 * ladder already turns over (`Ns` below a minute, `Nm` below an hour, `Nh Mm`
 * below a day). It is the only boundary that needs no second rule: below it the
 * minute tier cannot express the value at all without rounding to a whole
 * minute, and at or above it a seconds digit is precision nobody reads.
 */
export function formatDuration(ms: number, options: FormatDurationOptions = {}): string {
  invariant(Number.isFinite(ms), `formatDuration needs a finite number of milliseconds, got ${ms}.`)

  const magnitude = Math.abs(ms)

  if (options.precision === 'second' && magnitude < MS_PER_MINUTE) {
    return `${Math.floor(magnitude / MS_PER_SECOND)}s`
  }

  const totalMinutes = Math.ceil(magnitude / MS_PER_MINUTE)

  if (totalMinutes < MINUTES_PER_HOUR) return `${totalMinutes}m`
  if (totalMinutes < MINUTES_PER_DAY) {
    const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR)
    return `${hours}h ${totalMinutes % MINUTES_PER_HOUR}m`
  }
  const days = Math.floor(totalMinutes / MINUTES_PER_DAY)
  const hours = Math.floor((totalMinutes % MINUTES_PER_DAY) / MINUTES_PER_HOUR)
  return `${days}d ${hours}h`
}
