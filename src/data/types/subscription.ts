/**
 * Subscription — Operations › Subscriptions (five views, including the merged
 * *Expiring ≤ 7 days* that absorbs the legacy `renewal` page).
 *
 * Derived from `DB.subscriptions` (`eyvar_ops_panel_v40_fixed.html:2686`–`:2693`),
 * `renderSubscriptionsTable()` (`:3477`) and the status filter at `:3501`.
 */

import type { Halalas, IsoDate, IsoDateTime } from './common'
import type { VehicleClass } from './driver'

/**
 * The five values the status filter actually offers (`:3501`): `Active`,
 * `Expiring`, `At risk`, `Frozen`, `Cancelled`. Only three are seeded, and
 * `Frozen` is written by `freezeSubscription` (`:5510`).
 *
 * Note the seam this exposes: `expiring` is stored as a **status** and the
 * *Expiring ≤ 7 days* view is a **date window**. Those can disagree — a
 * subscription can be `Active` and end in five days. The view filters on
 * `endsOn`, not on `status`; the status is the operator-visible label. Called
 * out here because the Subscriptions spec has to decide which one the badge
 * shows.
 *
 * Tones (R7): active → `success`, expiring → `warning`, at-risk → `warning`,
 * frozen → `info`, cancelled → `neutral`, expired → `neutral`.
 */
export type SubscriptionStatus = 'active' | 'expiring' | 'at-risk' | 'frozen' | 'cancelled' | 'expired'

/** Legacy `DB.plans` keys (`:2890`). The plan catalogue, not free text. */
export type PlanKey = 'weekly' | 'biweekly' | 'monthly'

/**
 * A daily leg out, or out and back.
 *
 * Two members and no `flexible`: every plan in the catalogue is sold as a fixed
 * commute, and a third member would be a product decision this file does not
 * get to make on its own. If one arrives it is additive.
 */
export type SubscriptionTripKind = 'one-way' | 'round-trip'

export interface Subscription {
  id: string
  riderId: string
  riderName: string
  /** `null` for a subscription request that has not been assigned a captain yet. */
  driverId: string | null
  driverName: string | null

  status: SubscriptionStatus
  planKey: PlanKey
  /** `'Weekly Economy'` — the display name legacy stores in `plan` (`:2687`). */
  planName: string
  vehicleClass: VehicleClass

  /* ── the commitment's route ─────────────────────────────────────────── */
  /**
   * **Where the ride goes, every day of the subscription.**
   *
   * A subscription is not one journey and it is not a journeyless commitment
   * either: it is **one route, repeated** — a commute — and the route is the
   * thing the rider actually bought. `RideRequest` has carried `pickup` and
   * `destination` since wave 1 and the subscription created from one dropped
   * them on the floor, so a plan an operator was asked about could be read for
   * its price, its legs and its captain but not for **where it goes**.
   *
   * That was a modelling gap rather than a display one, which is why it is
   * fixed here and not papered over in a component: the subscription sheet
   * draws the same map the request sheet draws, and it draws it from these two
   * fields rather than from a scan of the trips — most cycles have no leg
   * recorded yet, and a record whose own route depends on rows that may not
   * exist is a record that cannot answer for itself.
   *
   * Always set. A cycle exists because a request named these two places, and
   * `assignedSubscriptionId` is the link that carried them across.
   */
  pickup: string
  destination: string
  /**
   * Whether the daily leg comes back.
   *
   * `round-trip` is two legs a day against the same pair of places — the
   * commute out and the commute home — and it is the difference between five
   * legs a week and ten. It is a field rather than something inferred from
   * `tripsIncluded / durationDays`, because that ratio is also moved by a plan
   * changing its allowance, and two facts sharing one derivation is how they
   * start disagreeing.
   */
  tripKind: SubscriptionTripKind

  /** Legacy `started: '19 Jun'` / `ends: '26 Jun'` — day-and-month, no year. */
  startedOn: IsoDate
  endsOn: IsoDate
  /** `null` unless frozen. Legacy stores only a duration string on freeze (`:5514`). */
  frozenUntil: IsoDate | null

  /** Legacy `trips: '5/5'` split. A ratio string cannot drive a progress bar or a sort. */
  tripsCompleted: number
  tripsIncluded: number

  /** Legacy `paid: '86.50 SAR'` → halalas. */
  paidHalalas: Halalas
  /**
   * Escrow held against this subscription — legacy `DB.escrowHolds` (`:2801`),
   * a **separate collection** keyed by `sub`. Denormalised onto the row because
   * the index shows it; the ledger detail stays in the Financials client.
   * `null` when no hold exists.
   */
  escrowHeldHalalas: Halalas | null

  /**
   * Legacy computes this in `riderChurnRisk`. Percent 0–100, `null` when there
   * is no renewal history to predict from — which is most first-cycle riders.
   */
  renewalLikelihoodPercent: number | null

  cancelledAt: IsoDateTime | null
  /** Free text in legacy (`confirmCancelSub`). A reason code is a product decision, not a data one. */
  cancellationReason: string | null
  /** Legacy `DB.refunds[]` links back by `relatedId` (`:2865`). `null` when nothing was refunded. */
  refundedHalalas: Halalas | null
}
