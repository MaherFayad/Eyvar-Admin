/**
 * Trip — Operations › Trips (all six views), and the trip cards on the 360°
 * profile.
 *
 * Derived from `DB.trips` (`eyvar_ops_panel_v40_fixed.html:2675`–`:2684`) and
 * `renderTripsTable()` (`:3388`), which is the authority on which fields are
 * actually consumed.
 *
 * Every numeric field in the legacy record is a **string**: `km:'6.5'`,
 * `min:'18'`, `fare:'17.65'`, `driverEarn:'14.12'`, and `'—'` where the value
 * is absent (`TRP-9003`, `:2683`). The renderer then does
 * `parseFloat(t.fare) || 0`, so a missing fare silently becomes zero and the
 * Eyvar cut is computed from it. Numbers and nulls here.
 */

import type { Halalas, IsoDateTime } from './common'

/** Legacy `kind` (`:2676`). The Trips index splits its views on this. */
export type TripKind = 'Subscription' | 'Quick ride'

/**
 * Legacy `status` is a **free string that carries a value inside it** —
 * `'Late +8'` (`:2679`) is a status and a lateness in one field, and the
 * renderer regex-matches `/no-show|cancel/i` on it (`:3423`) to decide the
 * badge. That cannot be filtered, sorted or translated.
 *
 * Split here: a closed enum plus `latenessMinutes`.
 *
 * Tones (R7): requested/assigned/en-route/in-trip → `info`, done → `success`,
 * late → `warning`, cancelled → `neutral`, no-show → `neutral` + the §8.4 row
 * marker. **There is no red badge** (R5a/R7).
 */
export type TripStatus =
  | 'requested'
  | 'assigned'
  | 'en-route'
  | 'in-trip'
  | 'done'
  | 'late'
  | 'cancelled'
  | 'no-show'

export interface Trip {
  id: string
  kind: TripKind
  status: TripStatus
  /** Minutes late. `null` unless `status === 'late'`. Legacy encodes it in the status string. */
  latenessMinutes: number | null

  riderId: string
  /** Denormalised for the index table — legacy calls `nm2(t.rider)` per row (`:3427`), an N+1 lookup per render. */
  riderName: string
  /** `null` for a trip cancelled before assignment. */
  driverId: string | null
  driverName: string | null
  /** `null` for a quick ride. Legacy already models this correctly (`:2680`). */
  subscriptionId: string | null

  startedAt: IsoDateTime
  /** `null` while in progress, and for a cancellation. */
  endedAt: IsoDateTime | null

  /** `'King Fahd St → KFUPM'`. One display string in legacy; genuinely one field for a list row. */
  route: string
  pickup: string | null
  destination: string | null

  /** `null` where legacy stores `'—'` — a cancelled trip has no distance, and `0` would be a lie. */
  distanceKm: number | null
  durationMinutes: number | null

  fareHalalas: Halalas
  driverEarningsHalalas: Halalas
  /**
   * Legacy computes this at render: `fare - driverEarn - stopFee` (`:3422`).
   * **Q7 is open** — four disjoint pricing models disagree on commission
   * (escrow embeds a flat 20%, the history builder hardcodes 20%, the rate card
   * says 22%, per-plan `commission` is editable). Returned by the server so
   * every screen shows one number; which number is Finance's to decide.
   */
  platformCutHalalas: Halalas
  /** Legacy `stopFee` — absent on most trips. `0`, not null: no extra stop is a real zero. */
  extraStopFeeHalalas: Halalas
  /** Legacy `tip: 5` — a bare number, present on one seeded trip (`:2681`). `0` when none. */
  tipHalalas: Halalas

  /** Legacy `driverRatingGiven` — the rating the **rider gave the captain**. `null` when not yet rated. */
  driverRatingGiven: number | null
  /** Legacy `flagged` — a bare boolean driving a row highlight (`:3424`). */
  flagged: boolean
  /**
   * Legacy `desyncedTripIds()` — the rider app never acknowledged a state
   * transition. A KPI tile on the Trips index counts these.
   */
  stateDesynced: boolean

  paymentId: string | null
}
