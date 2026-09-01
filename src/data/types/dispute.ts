/**
 * Support › Disputes & Lost and Found — the two records the screen was
 * inventing in a module literal.
 *
 * `DisputesScreen.tsx` held `INITIAL_DISPUTES` (`:30`) and `INITIAL_LOST_FOUND`
 * (`:66`) in `useState`, and `DisputeItem` was declared inside a modal file. So
 * the product had a money-moving surface with **no domain type at all**: no
 * client, no failure injection, no paging, and a `status` union that only the
 * three seeded rows had to satisfy.
 *
 * ## What legacy actually models, and what the literal had dropped
 *
 * `DB.disputes` (`eyvar_ops_panel_v40_fixed.html:14391`) is:
 *
 * ```js
 * {id, sub, claim, claimant, against, status, evidence:[[label, detail], …]}
 * ```
 *
 * Three of those fields were missing from `DisputeItem` and each of them is
 * load-bearing:
 *
 * - **`against`** — who the claim is *against*. It is read in three other
 *   places: the repeat-incident panel counts disputes per captain (`:14344`),
 *   subscription readiness deducts 25 points for *"assigned driver has an open
 *   dispute/incident"* (`:14222`), and captain risk deducts 15 per open claim
 *   (`:14294`). A dispute record with no `against` silently zeroes three other
 *   surfaces.
 * - **`evidence`** — the whole page is titled *"evidence-first resolution"*
 *   (`:1370`). Resolving without it is the thing the screen exists to prevent.
 * - **`outcome`** — legacy sets `status='resolved'` **and** `outcome`
 *   (`:14439`). One field cannot carry both *"is it decided"* and *"what was
 *   decided"*, which is why `DisputeResolution` below is a separate object.
 *
 * ## Two deliberate departures from legacy, both stated
 *
 * 1. **`kind` is a closed union, not free text.** Legacy's `claim` is a prose
 *    sentence and the screen literal's `kind` was a display string
 *    (`'Toll Discrepancy'`). Neither can be filtered, counted or translated —
 *    the same argument `types/safety.ts` makes about `inc.type`. The prose
 *    survives as `claim`, which is the claimant's own words and is data.
 * 2. **`amountHalalas` is stored, not derived.** Legacy computes the amount at
 *    stake from the subscription's per-trip economics at render
 *    (`subEconomics(sub).perTrip`, `:14403`), so the figure an operator
 *    approved is not recoverable afterwards. A settlement ceiling that moves
 *    when a plan is re-priced is not a ceiling.
 */

import type { Halalas, IsoDateTime } from './common'

/* ────────────────────────────── disputes ───────────────────────────── */

/**
 * What is being claimed. **Closed**, and every member is evidenced:
 *
 * | member | evidence |
 * |---|---|
 * | `no-show` | legacy `DSP-07` — *"Driver never arrived on Tuesday"* (`:14392`) |
 * | `vehicle-class` | legacy `DSP-06` — *"Charged for Comfort, driver arrived in Economy"* (`:14394`) |
 * | `fare-dispute` | `fixtures/tickets.ts` `TKT-501`, reason code `fare_dispute` |
 * | `toll-charge` | the screen literal's `DSP-101` |
 * | `cancellation-fee` | the screen literal's `DSP-102` |
 * | `vehicle-damage` | the screen literal's `DSP-103` — and the only kind a captain files |
 *
 * A seventh kind is a **finding for product-designer**, not a string a screen
 * adds: it needs a label key, a fixture and a place in the facet list.
 */
export type DisputeKind =
  | 'no-show'
  | 'vehicle-class'
  | 'fare-dispute'
  | 'toll-charge'
  | 'cancellation-fee'
  | 'vehicle-damage'

export const DISPUTE_KINDS: readonly DisputeKind[] = [
  'no-show',
  'vehicle-class',
  'fare-dispute',
  'toll-charge',
  'cancellation-fee',
  'vehicle-damage',
]

/**
 * Three states, not four. Legacy has two — `open` and `resolved` (`:14439`) —
 * and the screen literal had three, of which `pending` and `open` are the same
 * state under two names. `under-review` is the middle one legacy expresses
 * through the claim/ownership chip rather than through `status`, and it is kept
 * because the screen's own facet list needs a value for *"somebody is on it"*.
 *
 * **There is no `rejected` status.** Rejecting a claim is an OUTCOME
 * (`declined` below), and the record is `resolved` either way — which is what
 * legacy does and what stops *"decided against the claimant"* from looking like
 * *"still open"* in every count.
 */
export type DisputeStatus = 'open' | 'under-review' | 'resolved'

export const DISPUTE_STATUSES: readonly DisputeStatus[] = ['open', 'under-review', 'resolved']

/**
 * The verdict. Four, and they are the four the resolve modal already offered —
 * mapped onto legacy's three (`refund` · `goodwill` · `reject`, `:14424`–`:14426`)
 * with legacy's fixed *"one trip"* / *"50 %"* amounts replaced by an operator
 * -entered figure, because a fixed fraction of a per-trip value is not a
 * settlement, it is a guess with two decimal places.
 *
 * `declined` is legacy's `reject`: **nothing is paid.** It is named for what
 * happens to the claim rather than for what happens to the person, because
 * *"reject"* on a screen full of people reads as a judgement of the claimant —
 * and it is claimant-neutral, which `upheld` was not: a captain's damage claim
 * has no charge to uphold.
 */
export type DisputeOutcome = 'full-refund' | 'partial-refund' | 'goodwill-credit' | 'declined'

export const DISPUTE_OUTCOMES: readonly DisputeOutcome[] = [
  'full-refund',
  'partial-refund',
  'goodwill-credit',
  'declined',
]

/** The only outcome that moves no money, stated once so no screen re-derives it. */
export function outcomeMovesMoney(outcome: DisputeOutcome): boolean {
  return outcome !== 'declined'
}

/**
 * Who filed. A captain files too — `vehicle-damage` is a claim against a rider
 * — and the two are paid through different accounts, so this is not cosmetic.
 */
export type DisputeClaimantType = 'rider' | 'captain'

/**
 * Where a piece of evidence came from. Legacy's `evidence` is
 * `[label, detail]` pairs with the label written by hand at seed time
 * (`'GPS trail'`, `'App events'`, `'Contact log'`, `'Vehicle registry'`,
 * `'Trip photo'`, `'History'` — `:14392`–`:14396`). A hand-written label cannot
 * be grouped, so the label becomes this union and the detail stays prose.
 */
export type DisputeEvidenceSource =
  | 'gps-trail'
  | 'app-events'
  | 'contact-log'
  | 'vehicle-registry'
  | 'trip-photo'
  | 'history'

export interface DisputeEvidence {
  source: DisputeEvidenceSource
  /**
   * The finding, as the source system reported it. **Data, not UI copy** — the
   * same category as `Ticket.callGuideScript.say`. It is not translated because
   * nothing translates a GPS trail's readout.
   */
  detail: string
}

/**
 * The verdict and the money that went with it. One object rather than five
 * nullable fields, because they only ever exist together: a dispute either has
 * been decided — in which case all of this is known — or has not.
 */
export interface DisputeResolution {
  outcome: DisputeOutcome
  /**
   * What actually moved, integer halalas. **`0` on `declined`, and only there.**
   * The old modal discarded this argument entirely (`DisputesScreen.tsx:129`
   * named it `_refundHalalas`), so a resolution that was supposed to move money
   * moved none and nothing on the record said so.
   */
  refundHalalas: Halalas
  /**
   * The `Refund` this resolution issued — `clients/revenue.ts` `issueRefund`.
   * `null` when the outcome moved no money, and never a fabricated id: a
   * `postingId`-shaped string naming a posting that does not exist is the
   * precise defect `issueRefund`'s own header records — a green assertion on
   * the *name* of a row nothing ever wrote.
   */
  refundId: string | null
  note: string | null
  resolvedAt: IsoDateTime
  resolvedByUserId: string
  resolvedByUserName: string
}

export interface Dispute {
  id: string
  kind: DisputeKind
  status: DisputeStatus

  /** The claimant's own words. Legacy `claim` (`:14392`). */
  claim: string

  claimantId: string
  claimantName: string
  claimantType: DisputeClaimantType

  /**
   * Who the claim is against. Legacy `against` (`:14393`), and read by three
   * other surfaces — see the file header. `null` where the claim is against the
   * platform itself (a billing error nobody caused), which is a real case and
   * not a missing value.
   */
  againstId: string | null
  againstName: string | null

  /** The trip the claim is about. `null` on a subscription-level claim. */
  tripId: string | null
  /** Legacy `sub` (`:14392`). `null` on a quick-ride claim. */
  subscriptionId: string | null
  /** The support ticket this was raised from, when it was raised from one. */
  ticketId: string | null

  /**
   * The ceiling. A settlement may not exceed it, and `full-refund` is exactly
   * it. See the file header for why it is stored rather than derived.
   */
  amountHalalas: Halalas

  filedAt: IsoDateTime
  /**
   * When a verdict is owed. `null` is a **value** — *"no clock"* — and never a
   * synthetic deadline (`lib/sla.ts` rule 1).
   */
  dueAt: IsoDateTime | null

  ownerId: string | null
  ownerName: string | null

  evidence: DisputeEvidence[]

  /** `null` while `status !== 'resolved'`, and non-null exactly when it is. */
  resolution: DisputeResolution | null
}

/* ─────────────────────────── lost and found ────────────────────────── */

/**
 * Legacy's three states, verbatim: `searching` → `with_driver` → `returned`
 * (`:14448`–`:14452`), renamed only to hyphenate and to say *captain*, which is
 * what this product calls a driver everywhere else.
 *
 * **The screen literal had four** — `reported` · `item-found` · `in-transit` ·
 * `returned` — with no transition rule anywhere, so the advance button derived
 * the next state from a chain of ternaries that nothing could check. Four
 * states with no flow is three chances to get the order wrong.
 */
export type LostFoundStatus = 'searching' | 'with-captain' | 'returned'

export const LOST_FOUND_STATUSES: readonly LostFoundStatus[] = [
  'searching',
  'with-captain',
  'returned',
]

/**
 * Legacy `LF_FLOW` (`:14453`) as data: the one state each state may advance to,
 * and `null` for the terminal one. **The screen reads this**; it does not carry
 * its own ladder. A transition that is not in this map cannot be performed, in
 * the client or in the UI.
 */
export const LOST_FOUND_FLOW: Readonly<Record<LostFoundStatus, LostFoundStatus | null>> =
  Object.freeze({
    searching: 'with-captain',
    'with-captain': 'returned',
    returned: null,
  })

export function nextLostFoundStatus(status: LostFoundStatus): LostFoundStatus | null {
  return LOST_FOUND_FLOW[status]
}

export interface LostFoundItem {
  id: string
  /** What was left behind. Legacy `item` (`:14449`) — the claimant's description. */
  item: string
  tripId: string
  riderId: string
  riderName: string
  /**
   * The captain who drove the trip. **`null` is real**: a rider who cannot
   * identify the trip has no captain to ask, and the *"ask the captain to
   * check the vehicle"* step cannot be taken. §11.2 — the control is disabled
   * in place and says so, rather than being hidden or failing at commit.
   */
  driverId: string | null
  driverName: string | null
  status: LostFoundStatus
  /**
   * Legacy stores a display string here — `'08:55'`, `'Yesterday'`, `'22 Jun'`
   * (`:14449`–`:14451`) — which cannot be sorted, compared or localised. ISO,
   * like every other timestamp that crosses the seam.
   */
  reportedAt: IsoDateTime
  /** Last transition. Equal to `reportedAt` until the item first advances. */
  updatedAt: IsoDateTime
  /** Where the handover is arranged. `null` until it is. */
  handoverNote: string | null
}
