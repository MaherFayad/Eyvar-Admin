/**
 * Duration as a **magnitude**, in the exactly-three shapes the design permits.
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
 *    This rounds **up** to the minute instead: anything above zero reads at
 *    least `1m`, and only a true zero reads `0m`.
 */

import { invariant } from '../invariant'

const MS_PER_MINUTE = 60_000
const MINUTES_PER_HOUR = 60
const MINUTES_PER_DAY = 1_440

/**
 * `840000` -> `14m`. `12000000` -> `3h 20m`. `187200000` -> `2d 4h`.
 *
 * Takes the absolute value, so a caller holding a negative "remaining" does not
 * have to negate it and cannot forget to.
 */
export function formatDuration(ms: number): string {
  invariant(Number.isFinite(ms), `formatDuration needs a finite number of milliseconds, got ${ms}.`)

  const totalMinutes = Math.ceil(Math.abs(ms) / MS_PER_MINUTE)

  if (totalMinutes < MINUTES_PER_HOUR) return `${totalMinutes}m`
  if (totalMinutes < MINUTES_PER_DAY) {
    const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR)
    return `${hours}h ${totalMinutes % MINUTES_PER_HOUR}m`
  }
  const days = Math.floor(totalMinutes / MINUTES_PER_DAY)
  const hours = Math.floor((totalMinutes % MINUTES_PER_DAY) / MINUTES_PER_HOUR)
  return `${days}d ${hours}h`
}
