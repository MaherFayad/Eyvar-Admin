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

/**
 * **"Is this trip still open?" — one answer, here, for every screen that asks.**
 *
 * It was two. `screens/operations/dispatch/DispatchScreen.tsx:94` declares its
 * own `ACTIVE_TRIP_STATUSES = ['assigned', 'en-route', 'in-trip']`, and the
 * rider profile's *open trip* card is built around `TRP-9104` — a `requested`
 * trip, which that list excludes. Two screens, one trip, two answers to the
 * same question. `types/rider.ts` opens with the reason that is not survivable:
 * *"a derived value computed in three screens produces three answers."*
 *
 * ## The set, and the one that was nearly wrong
 *
 * | status | open | why |
 * |---|---|---|
 * | `requested`  | ✅ | No captain yet. **The state that most wants an operator** — `TRP-9104` has been unassigned since 09:11 — and the one Dispatch's local list drops. |
 * | `assigned`   | ✅ | Captain accepted, not moving yet. |
 * | `en-route`   | ✅ | Captain on the way to the pickup. |
 * | `in-trip`    | ✅ | Rider on board. |
 * | `late`       | ❌ | **Terminal. This was nearly wrong and the data settled it** — see below. |
 * | `done`       | ❌ | Terminal. |
 * | `cancelled`  | ❌ | Terminal; `endedAt` is set (`TRP-9003`, `TRP-9108`). |
 * | `no-show`    | ❌ | Terminal, and surfaced by its own queue (`assurance`). |
 *
 * ## `late` means *arrived late*, not *running late*
 *
 * The seeded `TRP-7742` carries `endedAt: null`, which reads as a trip still in
 * flight and overdue — and on that reading `late` belongs in this set. It is a
 * fixture bug, and legacy proves it. `DB.trips['TRP-7742']` (`:2677`) is
 * `status:'Late +8'` **with** `km:'11.0'`, `min:'30'`, `fare:'29.40'`,
 * `driverEarn:'23.52'` and `pay:'PAY-5475'` — a distance, a duration, a fare, a
 * captain payout and a settled payment. A trip that has been measured, priced,
 * paid out and settled is not still running. `Late +8` is *"it arrived eight
 * minutes late"*.
 *
 * The generated rows agree: all **sixteen** filler `late` trips set `endedAt`.
 * One hand-written row disagrees with legacy, with its own fare and with every
 * other row of its status.
 *
 * **Finding, not fixed here:** `TRP-7742.endedAt` should be
 * `2026-06-25T08:23:00+03:00` (`startedAt` + `durationMinutes` + the 8 minutes
 * of lateness). It is left alone because it is a trips fixture outside this
 * change and because `'route-history'` (`clients/trips.ts:113`) selects on
 * `endedAt !== null && distanceKm !== null` — this row satisfies the second
 * half, so setting the first moves what that view returns.
 * `management.performance.tripsCompleted` is **not** affected: it filters
 * `status === 'done'` (`clients/metrics.ts:126`).
 *
 * ## Adopting this **changes what Dispatch shows** — that is a product call
 *
 * Dispatch's feed gains `requested` trips and gains nothing else. That is a
 * change to an operator's queue, not a refactor, so it is named rather than
 * assumed: the constant is exported and Dispatch has not been edited.
 */
export const OPEN_TRIP_STATUSES: readonly TripStatus[] = [
  'requested',
  'assigned',
  'en-route',
  'in-trip',
]

/**
 * The predicate form. Takes a status rather than a `Trip` so it can be applied
 * to a filter value, a facet key or a row — a screen filtering a status
 * dropdown has no `Trip` to hand.
 */
export function isOpenTripStatus(status: TripStatus): boolean {
  return OPEN_TRIP_STATUSES.includes(status)
}

/** Row form, for the common case. */
export function isOpenTrip(trip: Pick<Trip, 'status'>): boolean {
  return isOpenTripStatus(trip.status)
}

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
