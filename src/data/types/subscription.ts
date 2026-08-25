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
