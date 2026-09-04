/**
 * Rider — Operations › People, view *Riders*.
 *
 * Derived from `DB.riders` (`eyvar_ops_panel_v40_fixed.html:2593`–`:2632`) and
 * `renderRidersTable()` (`:6406`).
 *
 * **A rider has no status field in the legacy data.** The status cell is
 * computed from `subs.length` — `Active` when the rider holds a subscription,
 * `On-demand` when they do not (`:6428`). Same for churn risk and lifetime
 * value, both computed at render time (`riderChurnRisk`, `riderLTV`). All three
 * are modelled as server fields here for the reason §8.2 gives: a derived value
 * computed in three screens produces three answers.
 */

import type { Halalas, IsoDate, IsoDateTime, LocalisedText, RelatedCount } from './common'
import type { MovementLogEntry } from './driver'
import type { PostingDirection, SettlementState } from './ledger'
import type { ProfileEntityType } from './profile'

/** Legacy `lvl` (`:2594`). `new` is a real seeded value — a rider with no rating yet. */
export type RiderTier = 'gold' | 'silver' | 'bronze' | 'new'

/** Derived in legacy from `subs.length` (`:6428`). Tones (R7): subscriber → `success`, on-demand → `info`. */
export type RiderStatus = 'subscriber' | 'on-demand'

/** Legacy `riderChurnRisk(rr).level` — `'High' | 'Medium' | 'Low'` (`:6420`). */
export type ChurnRisk = 'low' | 'medium' | 'high'

/**
 * **The reason vocabulary behind `Rider.churnReason`.**
 *
 * Not invented: legacy `riderChurnRisk(d)` already returns
 * `{level, score, reasons[]}` and pushes one of five sentences per signal
 * (`eyvar_ops_panel_v40_fixed.html:4048`–`:4064`). It is rendered twice —
 * `risk.reasons[0]` on the retention watchlist (`:6994`) and the whole list in
 * the *"Why this risk level"* block of the 360 card (`:6995`) — so the reason
 * is a fact the product already states, not a label a screen invented.
 *
 * Legacy composes the sentence in the renderer. Here it is a **key**, because
 * the same five sentences are hard-coded English in two places and this product
 * ships Arabic first. `params` carries the count for `complaintsFiled`; nothing
 * here is ever a concatenated string.
 *
 * | key | legacy line |
 * |---|---|
 * | `rider.churn.noSubscription`   | *"No subscription — quick-ride only…"* (`:4055`) |
 * | `rider.churn.cancelledOnRecord`| *"Has a cancelled subscription on record"* (`:4057`) |
 * | `rider.churn.complaintsFiled`  | *"N complaints filed"* (`:4058`) |
 * | `rider.churn.ratingBelowFour`  | *"Rating below 4★"* (`:4059`) |
 * | `rider.churn.lowRenewalRate`   | **replaces** `autoRenewOff` — see below |
 * | `rider.churn.lapsedUnused`     | **new** — see below |
 *
 * ## Two deliberate differences from legacy's list
 *
 * **`rider.churn.lapsedUnused` is added.** Legacy has **no branch for an
 * expired subscription at all**: `hasCancelled` tests `/cancel/i` on the
 * status, so a plan that simply ran out with `0 of 5` trips used scores zero
 * and reads *"No negative signals on record"*. That is the exact state
 * `RDR-4002` is in. A vocabulary that cannot name the strongest churn signal in
 * the dataset is the gap, not a licence for a screen to write its own sentence.
 *
 * **`autoRenewOff` is dropped, and that is a finding.** Legacy scores
 * `s.autoRenew === false` at +2, the joint-heaviest signal it has — and
 * `types/subscription.ts` **has no `autoRenew` field**. Nothing in this data
 * layer can produce the value, so the arm would be dead in the union and
 * unreachable in the fixtures, which is the *"state with no representable
 * data"* case. `rider.churn.lowRenewalRate` stands in its place because
 * `Rider.renewalRatePercent` is real, is already served, and says the same
 * thing about the same rider from the other end. Restoring the legacy signal is
 * a question for whoever owns `types/subscription.ts`.
 */
export type ChurnReasonKey =
  | 'rider.churn.noSubscription'
  | 'rider.churn.cancelledOnRecord'
  | 'rider.churn.complaintsFiled'
  | 'rider.churn.ratingBelowFour'
  | 'rider.churn.lowRenewalRate'
  | 'rider.churn.lapsedUnused'

export interface ChurnReason extends LocalisedText {
  key: ChurnReasonKey
}

/**
 * `WalletTransaction` **was here and is gone.**
 *
 * It modelled the same fact as `LedgerPosting` — `{type:'credit'|'debit',
 * amountHalalas, balanceAfterHalalas}` — and the financials spec is explicit
 * that it *"should be subsumed by `LedgerPosting` rather than kept beside it"*
 * (`specs/03-financials.md` §14). Two shapes for one concept is the defect that
 * wave produced four disagreeing money surfaces, so the second shape is
 * retired rather than kept for convenience.
 *
 * `Rider.walletTransactions` went with it. A wallet ledger is a paginated
 * server read — `getWalletLedger(riderId)` in `clients/wallets.ts` — not an
 * array embedded on an index row, because a rider with 412 postings cannot
 * have them all on the row that lists them.
 *
 * `walletBalanceHalalas` stays, and `clients/financials.test.ts` asserts it
 * equals that rider's ledger closing balance, so the index and the ledger can
 * never disagree about one number.
 */

export interface Rider {
  id: string
  name: string
  phone: string
  /** `0` in legacy means "no rating yet" (`RDR-2090`, `:2607`), not a zero rating. `null` on the wire. */
  rating: number | null
  tier: RiderTier
  status: RiderStatus
  churnRisk: ChurnRisk
  /**
   * **Why that level.** The strongest single signal, as a key + params.
   *
   * A server field for the reason stated at the top of this file: *"a derived
   * value computed in three screens produces three answers."* The level already
   * is one; a level with no reason just moves the derivation one field along —
   * the side sheet would infer *"lapsed"* from an expired subscription, the
   * full page would infer *"quick-ride only"* from `subscriptionIds`, and
   * `RDR-4002` would carry two different explanations of one badge on two
   * surfaces of the same record.
   *
   * `null` is legitimate and means **no negative signal on record**, which is
   * legacy's own sixth branch (`:4062`) expressed as an absence rather than as
   * a sentence saying nothing is wrong. It is `null` only when `churnRisk` is
   * `'low'`; `medium` and `high` always name a reason, asserted in
   * `clients/riders.test.ts`.
   *
   * **One reason, not legacy's array.** Legacy accumulates every signal and
   * renders the list in a *"Why this risk level"* block no surface in this
   * rebuild draws. Both profile surfaces show one line. The array is a real
   * shape and it can come back the day a screen renders it — widening
   * `ChurnReason | null` to `ChurnReason[]` is a typed break, which is the
   * right kind.
   */
  churnReason: ChurnReason | null
  /** Legacy `joined: 'Mar 2026'` — month precision, day is 01. */
  joinedAt: IsoDate
  hasPhoto: boolean
  gender: 'Male' | 'Female'
  /** Legacy `driverGenderPref` — present on one seeded rider only (`:2594`), absent on the rest. */
  driverGenderPreference: 'male' | 'female' | null
  city: string
  address: string
  /**
   * **`null` when no device has ever been recorded against this account.**
   *
   * Was `string`, which is why the profile's *"No device recorded"* sentence had
   * no value that could make it true. A screen cannot test a fact the type
   * cannot express, and `''` is the wrong way to say it — the same argument
   * `rating` makes two fields up: `0` is a rating, `''` is a device name.
   *
   * `RDR-2090` is the row that carries the absence, and it is the row where it
   * contradicts least: the wallet was funded by a captain collecting cash at
   * the kerb (`CASH-0003`), which is an account that can exist without an app
   * install behind it.
   *
   * **`RDR-4002` keeps its device**, deliberately. The reference design prints
   * *"No device recorded"* on that record and the record says otherwise — she
   * registered three days ago on an iPhone 15 Pro Max and requested `TRP-9104`
   * three minutes ago, so an absent device would contradict a trip the same
   * screen renders. The sentence is conditional; the fixture is not wrong.
   *
   * `lastIp` and `ipLocation` stay `string`. They are a different fact — the
   * network the last request came from — and nothing has asked for their
   * absent case yet. When something does, it is the same one-line change and
   * the same argument.
   */
  device: string | null
  appLanguage: 'Arabic' | 'English'
  lastIp: string
  ipLocation: string

  /**
   * Wallet balance in halalas. **May be negative** — nothing in the legacy app
   * prevents it, and no spec says what happens when it goes below zero. That is
   * an open question for product-owner, flagged in the handoff; the fixtures
   * carry an overdrawn wallet so the screen has to answer it.
   */
  walletBalanceHalalas: Halalas

  /**
   * **Captured and frozen — money attached to this rider that is not in the
   * balance above.** Non-negative, and `0` means *nothing held*, which is a
   * real answer and not an absence.
   *
   * The sum of the rider's **payments** whose settlement is one of
   * `PENDING_SETTLEMENTS` (`types/ledger.ts` — `held`, `authorised`, `pending`,
   * `reconciling`), inbound positive and outbound negative. `RDR-4002` carries
   * `9_800` from `PAY-6150`, a `mada` fare frozen for fraud review.
   *
   * ## Why it sits here and not only in the movements envelope
   *
   * The profile's money block renders **balance · held · lifetime value** as
   * one row of three figures. Two are fields on this record; making the third a
   * second async read gives one row of three numbers two loading states and two
   * error states. It is served with the record for the same reason
   * `walletBalanceHalalas` is.
   *
   * ## It is NOT `WalletSummary.pendingHalalas`
   *
   * That one is the **wallet ledger's** pending rows (`clients/wallets.ts`),
   * i.e. money moving through `liability.wallet`. This one is the **payments**
   * side — card money captured at a gateway that has not settled. For
   * `RDR-4002` the first is `0` and the second is `9_800`, and they are
   * different facts about different accounts. `clients/riders.test.ts` asserts
   * this field against `paymentFixtures`, so the denormalisation cannot drift
   * the way `walletBalanceHalalas` is stopped from drifting by AC-347.
   */
  heldHalalas: Halalas

  movementLog: MovementLogEntry[]

  /* ── stats, all `stats.*` in legacy (`:2597`) ──────────────────────── */
  totalTrips: number
  /** Legacy `stats.totalPaid: '1,040.00 SAR'` → halalas. */
  lifetimeValueHalalas: Halalas
  /** Legacy `stats.renewalRate: '100%' | '—'`. `null` for the em dash: no renewal history, not 0%. */
  renewalRatePercent: number | null
  quickRides: number
  /** `null` for a rider who has never taken a trip. */
  lastTripAt: IsoDateTime | null

  subscriptionIds: string[]
  tripIds: string[]
  paymentIds: string[]
  complaintIds: string[]
  /** The corporate account covering this rider, when one does (`corpForRider`, `:4910`). */
  corporateAccountId: string | null
}

/* ─────────────────────────── the record's history ───────────────────────── */

/**
 * **What happened to this record, as events rather than as sentences.**
 *
 * The 360° profile draws a dated timeline — *"25 Jun · Trip requested ·
 * TRP-9104, still unassigned"*. Three things follow from that being Arabic-first
 * and from it spanning three resources:
 *
 *   1. **It is not a stored log.** `Rider.movementLog` holds `{at, action,
 *      location}` where `action` is free English text (`'Account registered'`)
 *      with no record id on it. It can render line one of the timeline and
 *      nothing else — a trip, a subscription start and a subscription expiry
 *      are not in it and never were.
 *   2. **It is not a client-side merge.** A side sheet and a full page both
 *      draw it. Merging trips and subscriptions in each is the "three screens,
 *      three answers" defect with two screens; ordering alone (does an expiry
 *      dated `2026-06-08` sort before or after a trip on the same day?) has two
 *      plausible answers and must have one.
 *   3. **It carries no rendered string.** `kind` picks the sentence, `detail`
 *      fills its placeholders, `recordId` links it. A pre-joined title would be
 *      untranslatable and would take the link with it.
 *
 * ## What is deliberately NOT in it
 *
 * **Money.** Top-ups, fares and holds are the movements list
 * (`RiderMoneyMovement`), which both surfaces already draw as its own card. Put
 * them in both and `RDR-4002`'s four-event history becomes six, half of it
 * repeating the card above it. The timeline is the record's lifecycle;
 * the movements list is its money.
 */
export type RiderTimelineKind =
  | 'account-registered'
  | 'trip-requested'
  | 'trip-completed'
  | 'trip-cancelled'
  | 'trip-no-show'
  | 'subscription-started'
  | 'subscription-expired'
  | 'subscription-cancelled'

/**
 * The placeholders each `kind`'s sentence needs, and nothing else.
 *
 * Every key is optional because the set differs per kind, and a bag of
 * optionals is honest about that where a union of eight interfaces would only
 * be tidier. Which keys a kind sets is documented per key below and asserted in
 * `clients/riders.test.ts`.
 */
export interface RiderTimelineDetail {
  /** `subscription-*` — `'Weekly Economy'`. */
  planName?: string
  /** `subscription-expired` / `-cancelled` — `0` and `5` for *"0 of 5 trips used"*. */
  tripsUsed?: number
  tripsIncluded?: number
  /** `subscription-started` — the window, `1 Jun → 8 Jun`. */
  startedOn?: IsoDate
  endsOn?: IsoDate
  /** `account-registered` — `'Riyadh, SA'` from the movement log, and the tier granted. */
  location?: string
  tier?: RiderTier
  /** `trip-*` — the two ends of the route, never pre-joined. */
  pickup?: string
  destination?: string
  /** `trip-requested` — `false` on `TRP-9104`, which never got a captain. */
  captainAssigned?: boolean
}

export interface RiderTimelineEvent {
  /** Stable and deterministic — `trip-requested|TRP-9104`. A React key, and a name a test can assert. */
  id: string
  at: IsoDateTime
  kind: RiderTimelineKind
  /** The record this event is about. `null` on `account-registered`, which is about the rider. */
  recordId: string | null
  /** What `recordId` opens in the profile overlay. `null` with `recordId`. */
  recordType: ProfileEntityType | null
  detail: RiderTimelineDetail
}

/* ──────────────────────────── the money movements ───────────────────────── */

/** Which ledger a movement came off. See `movesWalletBalance` before using it. */
export type RiderMovementSource = 'wallet' | 'payment'

/**
 * One line of the rider's money list — a wallet posting **or** a payment.
 *
 * The profile shows both in one card, because an operator asking *"where did
 * the money go"* does not know or care that a top-up is a `liability.wallet`
 * posting and a quick-ride fare is a `mada` capture that never touched the
 * wallet. The card is one list; the arithmetic underneath it is two.
 *
 * ## `amountHalalas` is positive. Always.
 *
 * `types/ledger.ts` §3.1 is the rule the whole money layer hangs off — *"a
 * posting carries a positive integer `amountHalalas` and a `direction`.
 * Balances are signed; postings are not."* The design draws `−98.00` and
 * `+80.00`; the **sign is `direction` rendered**, and it is the UI's to render,
 * exactly as the currency symbol is (§8.3). A signed amount here would give
 * this list a second money convention and `0` no column to sit in.
 *
 * `direction` is **relative to the rider**: `credit` = the rider's money goes
 * up, `debit` = down. An `inbound` payment (the rider pays a fare) is therefore
 * a `debit` here, which is the bank-statement convention `clients/wallets.ts`
 * already documents for the wallet ledger.
 */
export interface RiderMoneyMovement {
  /** `WTX-4002-T2` for a wallet posting, `PAY-6150` for a payment. */
  id: string
  source: RiderMovementSource
  at: IsoDateTime
  /** i18n key + params — `fin.posting.walletTopup`, `fin.payment.kind.quickRideFare`. Never a sentence. */
  label: LocalisedText
  /** One vocabulary for both sources; `SETTLEMENT_BADGE_TONE` already tones every value. */
  state: SettlementState
  direction: PostingDirection
  /** Positive integer. See the note above. */
  amountHalalas: Halalas
  /** The payment this row **is**. `null` on a wallet posting; the design prints it beside the fare. */
  paymentId: string | null
  /**
   * **`true` iff this row is counted in `walletBalanceHalalas`.**
   *
   * The one field that keeps the card from lying: the rows that sum to the
   * balance are exactly the rows where this is `true`, and
   * `clients/riders.test.ts` asserts it for every rider.
   *
   * It is **not** the same as `source === 'wallet'`, and the difference is the
   * bug this field was renamed to stop. Two ways a row can be in the list and
   * out of the balance:
   *
   *   1. **A payment.** A `mada` fare never touched `liability.wallet`.
   *   2. **A wallet posting that has not settled.** AC-312 keeps pending
   *      postings out of the balance and out of the running-balance column;
   *      `clients/wallets.ts` reads the balance from the last *settled* row for
   *      exactly this reason. `RDR-1041` has 140.00 of wallet postings and a
   *      20.00 balance, and the 120.00 difference is one authorised row.
   *
   * A pending top-up is therefore `source: 'wallet'` with `inWalletBalance:
   * false` — in the list, correctly, because the operator is looking for it.
   */
  inWalletBalance: boolean
  /** The wallet's running balance after this row. `null` unless it is a settled wallet posting (AC-312). */
  balanceAfterHalalas: Halalas | null
}

/* ────────────────────────── what else references this rider ─────────────── */

/**
 * How many records of one kind reference the rider, and how many still need
 * somebody.
 *
 * `open` and `total` are both here because they answer different sentences and
 * because **`0` open beside a non-zero `total` is a real state** — *"three
 * complaints, all resolved"* is not the same page as *"no complaints"*, and a
 * single count cannot say which.
 *
 * **Now an alias.** The captain profile's presence read needs the identical
 * shape, and a second interface with the same two fields is the "two shapes for
 * one concept" defect this file retired `WalletTransaction` over. The shape
 * moved to `common.ts` as `RelatedCount`; this name stays so nothing that
 * imports it has to change.
 */
export type RiderRelatedCount = RelatedCount

/**
 * **The presence of every support record that references this rider, from one
 * read.**
 *
 * The profile prints a paragraph of absent-and-present facts — *"No support
 * tickets reference this record"*. Two ways to get it wrong, and the reference
 * design got both:
 *
 *   1. **Composing the sentence from nothing.** The design asserts *"no
 *      tickets"* and *"no device"* about a rider who has an open complaint, an
 *      unanswered chat, a dispute under review, a lost-and-found search, an open
 *      fairness case and an SLA-breached ride request. Tickets are the one
 *      thing genuinely absent. A screen has to *ask* rather than assume.
 *   2. **Asking six times.** Six clients, six loading states and six error
 *      states, to render one paragraph. `components/profile/record.ts` makes
 *      this argument about the record itself — *"one request, not four"* — and
 *      it applies with more force to a paragraph than to a card.
 *
 * So it is one read of counts. A card that then wants the rows still calls that
 * resource's own client; this exists to answer *"is there anything there"*
 * without paying for six lists to find out.
 */
export interface RiderSupportPresence {
  riderId: string
  /** `fixtures/complaints.ts` — open = `OPEN_COMPLAINT_STATUSES` (`open`, `under-review`). */
  complaints: RiderRelatedCount
  /** Contact Centre threads about this rider. Open = anything not `closed`. */
  conversations: RiderRelatedCount
  /** Claims the rider filed **or** claims filed against them. Open = not `resolved`. */
  disputes: RiderRelatedCount
  /** Open = not `returned`. */
  lostAndFound: RiderRelatedCount
  /** Cases where the rider is the subject. Open = `open`. */
  fairnessCases: RiderRelatedCount
  /** Ride requests. Open = still looking for a captain (`searching`, `offered`, `no-drivers`). */
  requests: RiderRelatedCount
  /** Open = not `resolved` and not `closed`. `total: 0` on `RDR-4002`, which is the design's one true claim. */
  tickets: RiderRelatedCount
  computedAt: IsoDateTime
}

export interface RiderMoneyMovements {
  riderId: string
  /**
   * The wallet's closing balance — the signed sum of the `inWalletBalance`
   * rows, and equal to `Rider.walletBalanceHalalas`. **Not** the signed sum of
   * `movements`, which also contains card money and unsettled postings.
   */
  walletBalanceHalalas: Halalas
  /** Equal to `Rider.heldHalalas`. Captured, unsettled, outside the balance (AC-312). */
  heldHalalas: Halalas
  /** Newest first. */
  movements: RiderMoneyMovement[]
  computedAt: IsoDateTime
}

/**
 * New riders — legacy `DB.newRiders` (`:2744`), a **separate collection** with a
 * different shape: no rating, no tier, no stats, no wallet, plus `firstAction`
 * and the KYC fields (`dob`, `nid`) that full riders do not carry.
 *
 * Modelled separately rather than as a `Rider` with nulls, because it is a
 * separate query on a separate screen and merging them would put eight
 * always-null fields on the main type.
 */
export interface NewRider {
  id: string
  name: string
  phone: string
  joinedAt: IsoDate
  /** `'No trips yet'`, `'1 quick ride completed'`, `'Browsing — no trips yet'` (`:2745`). Free text in legacy. */
  firstAction: string
  dateOfBirth: IsoDate
  /** Saudi national id. PII — gated on `view_profiles` (§4.3.1). */
  nationalId: string
  address: string
  city: string
  hasPhoto: boolean
  gender: 'Male' | 'Female'
  device: string
  appLanguage: 'Arabic' | 'English'
  lastIp: string
  ipLocation: string
  movementLog: MovementLogEntry[]
}
