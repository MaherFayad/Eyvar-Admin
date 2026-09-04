/**
 * Ride request — Operations › Requests, six views
 * (`all`, `instant`, `subscription`, `pending`, `assigned`, `expired`).
 *
 * Derived from **two** legacy collections and one screen:
 *   `DB.rideRequests`         instant rides (`eyvar_ops_panel_v40_fixed.html:2786`)
 *   `DB.subscriptionRequests` plan sign-ups  (`:2794`)
 *   `renderRequestsPage()`    (`:10068`) — the authority on what is consumed
 *
 * ## Why one type and not two
 *
 * Wave 1 split People into four resources because *"they share a screen, not a
 * type"*. Requests is the opposite case and the difference is testable: three
 * of the six views — `pending`, `assigned`, `expired` — cut **across** both
 * collections (`reqStatusMatch`, `:10046`), the rail badge sums both
 * (`:9401`), and the snapshot export ships both under one envelope (`:9767`).
 * A cross-cutting view over two clients forces the *screen* to do the union,
 * the sort and the pagination — which is the join defect the seam exists to
 * prevent. So: one resource, one `channel` discriminant, and the
 * channel-specific fields nullable.
 *
 * The cost is honest and visible: `pickup`/`destination` are always set,
 * `planKey`/`preferredPickupTime` only on `subscription`, `offeredToDriverId`
 * only on `instant`. Each is documented at its field.
 */

import type { Claim, Halalas, IsoDateTime } from './common'
import type { VehicleClass } from './driver'
import type { PlanKey } from './subscription'
import type { SlaTracked } from './workQueue'

/**
 * Which of the two legacy collections the row came from. Drives the `instant`
 * and `subscription` views, which are `select`-style filters over one list.
 */
export type RequestChannel = 'instant' | 'subscription'

/**
 * The union of both collections' statuses, minus one duplicate.
 *
 * Legacy instant: `searching` · `offered` · `assigned` · `no_drivers` · `expired` (`:9840`–`:9848`).
 * Legacy subscription: `pending` · `assigned` · `expired` (`:2794`).
 *
 * `pending` and `searching` are **the same state under two names** — the
 * subscription SLA badge for `status==='pending'` literally renders
 * `🔍 Searching — 1h 12m left` (`subReqSlaBadge`, `:9938`). Merged to
 * `searching`; nothing is lost and the `pending` view (`:10049`) still
 * resolves to `searching ∪ offered`.
 *
 * `no-drivers` is legacy `no_drivers`, set automatically **at the moment of
 * breach**: `if(secs>=180){ r.status='no_drivers'; … logAction('sla_breach', …) }`
 * (`:9832`–`:9838`). It is therefore the one status that *is* a breach state,
 * and `slaBreachedAt` is non-null on every row carrying it.
 *
 * Tones (R7): searching → `info`, offered → `new`, assigned → `success`,
 * no-drivers → `warning`, expired → `neutral`, cancelled → `neutral`.
 *
 * **Finding for product-designer.** Legacy paints `no_drivers` with `b-red`
 * (`:9893`) and the row background `--red-lt` (`:9950`). R5a permits no red
 * badge, so the badge is `warning`; whether the *row* keeps a marker is §8.4's
 * call, not this file's.
 */
export type RequestStatus =
  | 'searching'
  | 'offered'
  | 'assigned'
  | 'no-drivers'
  | 'expired'
  | 'cancelled'

export interface RideRequest extends SlaTracked {
  id: string
  channel: RequestChannel
  status: RequestStatus

  riderId: string
  /** Denormalised — legacy calls `nm2(r.rider)` per row per render (`:9913`). */
  riderName: string
  /**
   * Legacy `starLine` (`:9906`): `★4.8` when the rider has a rating, the literal
   * chip `★ new` when they do not. `null` is that second case — a first-time
   * rider, and the most common row in a growth month.
   */
  riderRating: number | null
  /** Legacy `riderHasPriorSub` → the `🔁 Existing subscriber` tag (`:9909`). */
  riderHasPriorSubscription: boolean
  /** Legacy `r.vip` — skips the auto-offer delay (`:9825`). Rare; `false` on nearly every row. */
  vip: boolean

  pickup: string
  destination: string
  vehicleClass: VehicleClass

  requestedAt: IsoDateTime

  /* ── the money at stake, one field per channel ───────────────────────── */
  /**
   * **Instant only.** The fare quoted to the rider when they asked, in halalas.
   * `null` on a subscription request, exactly as `offeredToDriverId` is.
   *
   * It is a QUOTE and not a charge: nothing has been captured, the ride has not
   * happened, and the row may still expire. The trip that follows carries the
   * real `fareHalalas` (`types/trip.ts`), and the two are allowed to differ —
   * a longer route, a wait, an extra stop. Any surface rendering this must say
   * *estimated*, which is why `profile.request.rail.fare` reads
   * `Estimated fare` and never `Fare`.
   *
   * **Nullable within the channel too.** A quote needs a priced route, and the
   * fixtures' `REQ-508` was cancelled before one was returned. `null` there is
   * *no quote was produced*, not zero — §3.5's distinction, and the rail prints
   * a sentence rather than `0.00 SAR`.
   *
   * **On the handover.** `GET /requests` does not return this today; it is
   * modelled here because the request sheet cannot answer *what is this ride
   * worth* without it, and an operator deciding whether to chase a breach is
   * asking exactly that.
   */
  quotedFareHalalas: Halalas | null
  /**
   * **Subscription only.** The rider's payment authorisation, in halalas —
   * placed when they signed up, captured when a captain is assigned.
   *
   * This is the field behind §5.1's *"this is the only queue where money moves
   * on disposition"*. `RequestsScreen`'s assign confirmation already says the
   * capture cannot be undone from here; this is the amount it captures, and an
   * operator committing that ought to be able to see it first.
   *
   * `null` on an instant request. Equal to the first cycle's charge on the
   * subscription this request would create — the same figure
   * `Subscription.paidHalalas` carries once it exists.
   */
  authorisationHoldHalalas: Halalas | null

  /* ── subscription-only ──────────────────────────────────────────────── */
  /** `null` on an instant request. Legacy `plan:'weekly'` (`:2794`). */
  planKey: PlanKey | null
  /**
   * `null` on an instant request. Legacy `preferredTime:'07:00 AM'` — a
   * 12-hour display string, stored. `'07:00'` here: a wall-clock time with no
   * date, because the rider is asking for a *daily* slot, not one instant.
   */
  preferredPickupTime: string | null
  /** Legacy `notes` — free text from the rider, `''` when none. `null`, not `''`. */
  notes: string | null

  /* ── the offer leg (instant only) ───────────────────────────────────── */
  /**
   * Who the automatic dispatcher offered it to. `null` unless `status` is
   * `offered`, or the offer was declined and the row fell back to `searching`.
   * Legacy `offeredTo` (`:9923`).
   */
  offeredToDriverId: string | null
  offeredToDriverName: string | null
  /**
   * `offeredAt + OFFER_WINDOW_SEC` (12 s, `:11988`). Twelve seconds is not a
   * countdown a human can act on — it is the *captain's app* window, shown to
   * ops as context. Distinct from `slaDueAt`, which is ops' own promise.
   */
  offerExpiresAt: IsoDateTime | null

  /* ── disposition ────────────────────────────────────────────────────── */
  assignedDriverId: string | null
  assignedDriverName: string | null
  /** Legacy `assignedSub` — the `SUB-*` created by `commitNewSub` (`:2795`). Subscription channel only. */
  assignedSubscriptionId: string | null
  /** Legacy `assignedBy:'Sarah Al-Rashid'` — a **name string with no id** (`:2795`). Both here. */
  assignedByUserId: string | null
  assignedByUserName: string | null
  assignedAt: IsoDateTime | null
  /** Legacy `expiredAt` (`:2797`). `null` unless `status === 'expired'`. */
  expiredAt: IsoDateTime | null
  cancelledAt: IsoDateTime | null

  /** §8.4 ownership. Legacy instant requests carry `claimedBy`/`claimedAt` (`:5230`, `:9954`). */
  claim: Claim | null
}

/**
 * The two windows the legacy app actually enforces, in minutes.
 *
 * **These are measured, not invented.** Exported so the fixtures, the client's
 * `breached` view and any screen that renders a track all read one number.
 *
 *   instant       3 min — `if(secs>=180){ r.status='no_drivers' … }` (`:9832`)
 *   subscription  2 h   — `SUBREQ_SEARCH_HOURS=2` (`:9577`), halved to a
 *                 reminder at `SUBREQ_REMINDER_HOURS=1` (`:9578`)
 *
 * The comment beside `SUBREQ_SEARCH_HOURS` records that it was 24 h and was
 * cut deliberately: *"a subscription commitment deserves a fast confirmation,
 * not a full day of uncertainty"*. Q8 should confirm both; unlike
 * `Applicant.slaDueAt` these have a shipped value to confirm rather than a
 * blank to fill.
 */
export const REQUEST_SLA_MINUTES: Record<RequestChannel, number> = {
  instant: 3,
  subscription: 120,
}

/** `SUBREQ_REMINDER_HOURS` (`:9578`) — half the window, when the rider is nudged. */
export const SUBSCRIPTION_REQUEST_REMINDER_MINUTES = 60

/** `OFFER_WINDOW_SEC` (`:11988`) — the captain app's own reply window, in seconds. */
export const OFFER_WINDOW_SECONDS = 12
