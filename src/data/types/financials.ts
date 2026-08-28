/**
 * The five money sub-tabs' domain types — Overview, Revenue & Refunds,
 * Payouts & Escrow, Cash & Captain Debt, Rider Wallets.
 *
 * The ledger vocabulary they all share lives in `types/ledger.ts`. This file is
 * the documents *around* the postings: what a refund is, what an escrow hold
 * is, what a cash report is. Every field here is `docs/05-restructure/specs/
 * 03-financials.md` §6.2–§6.6, and every one marked **derived** there is
 * deliberately **absent** — a derived value computed in three screens produces
 * three answers, and a derived value stored in a fixture is D-F19.
 */

import type { Claim, Halalas, IsoDate, IsoDateTime, LocalisedText } from './common'
import type { SettlementState } from './ledger'
import type { SlaTracked } from './workQueue'

/* ───────────────────────────── period ───────────────────────── */

/**
 * The reporting window every figure on Overview and Revenue & Refunds is
 * scoped to.
 *
 * **Q-F8 is open** — nobody has said whether a period closes or whether a
 * posting may be backdated into a closed one. So this ships as an open date
 * range with no close concept, which is honest and incomplete rather than
 * wrong, and the shape does not change when the answer lands: a `closedAt`
 * field is additive.
 *
 * Legacy has no period at all. Every Financials figure is "June 2026" from a
 * frozen demo clock (`:929`, `:3182`).
 */
export interface FinancialsPeriod {
  /** Inclusive. */
  start: IsoDate
  /** Inclusive. */
  end: IsoDate
}

/* ──────────────────────────── overview ──────────────────────── */

/**
 * Overview's tiles (§6.2).
 *
 * **Every value here is server-computed from postings.** The legacy Finance
 * page's seven KPI tiles are static HTML strings (`:931`–`:939`) and three of
 * them contradict the live data beside them (`12a` R12) — it claims
 * `Eyvar net 9,246 / 19.2%` above a table saying `8,752 / 18.1%`. AC-346
 * exists to stop that returning: change a fixture, the tile changes.
 *
 * The **derived** fields of §6.2 are not on this type. `grossMarginHalalas`,
 * `grossMarginPercent`, `givebackHalalas`, `contributionMarginHalalas` and
 * `contributionMarginPercent` are computed by the screen from the components
 * below, once, by the shared helper — including the `null`-when-`gross === 0`
 * rule that makes AC-342 render `—` rather than `0%`.
 */
export interface FinancialsOverview {
  period: FinancialsPeriod
  /** Sum of `revenue.fares` + `tax.vat_output` credits in period — captured payments only. */
  grossBookingsHalalas: Halalas
  /**
   * `expense.driver_pay` debits in period, **excluding cancelled trips**.
   *
   * Legacy filters gross to captured payments and does *not* filter captain
   * earnings to non-cancelled trips (`:15721` vs `:15722`, `12a` R14), so a
   * cancelled trip carrying a `driverEarn` depresses margin with no matching
   * revenue line. AC-352.
   */
  captainEarningsHalalas: Halalas

  /* ── the giveback lines, each counted exactly once (`:15730`) ────────── */
  promoHalalas: Halalas
  referralHalalas: Halalas
  incentiveHalalas: Halalas
  /**
   * `contra.refunds` debits in period. **A refund appears here and nowhere
   * else** — legacy books the cancellation path as `refunds` *and* as
   * `goodwill` (`12a` R1) and the contribution card subtracts it twice.
   */
  refundsHalalas: Halalas
  goodwillHalalas: Halalas
  emergencyCoverHalalas: Halalas

  /* ── balances, each the account's own (§3.8's three new consumers) ───── */
  pendingPayoutsHalalas: Halalas
  escrowHeldHalalas: Halalas
  escrowReadyHalalas: Halalas
  /** Positive `ar.driver` balances only — a captain in credit does not offset. */
  captainDebtHalalas: Halalas
  riderWalletLiabilityHalalas: Halalas

  /* ── the books ──────────────────────────────────────────────────────── */
  trialBalanceBalanced: boolean
  /** Signed. `0` when balanced. The critical banner names it in SAR (AC-351). */
  trialBalanceDifferenceHalalas: Halalas
  refusedPostingCount: number
  /** Counts for the R5a banners: `Show only failed`, `Show only breached`. */
  failedPayoutCount: number
  unlinkedCreditNoteCount: number
  escalatedCashReportCount: number
}

/* ───────────────────── revenue & refunds ────────────────────── */

/**
 * One row of `Revenue by plan`. Every one of the seven values is a hardcoded
 * string today (`:951`–`:957`).
 *
 * `platformPercent` is **derived** — `platform / gross` (M-4) — and is
 * therefore not a field. A percentage is never a stored input to a money value.
 */
export interface RevenueByPlanRow {
  planId: string
  planName: string
  activeSubs: number
  trips: number
  grossHalalas: Halalas
  platformHalalas: Halalas
  captainHalalas: Halalas
  givebacksHalalas?: Halalas
}

/**
 * Where a refund lands.
 *
 * **New field; legacy has no equivalent because it does both** — `recordRefund`
 * *and* `creditRiderWallet` fire with the same amount (`:5562`–`:5563`,
 * `12a` R1) and the business is charged twice for one refund. AC-337.
 *
 * **Q-F5 is open**: which of the two is the default is a commercial choice for
 * the Finance lead. The mechanism ships either way — the operator chooses per
 * refund and the confirmation names it — so the open question blocks a default,
 * not a build. The fixtures carry both values so both render.
 */
export type RefundDestination = 'instrument' | 'wallet'

export interface Refund {
  /** `REF-nnnn` (`:3181`). Legacy derives it from `array.length + 1`, which is not gapless (`12a` R5). */
  id: string
  issuedAt: IsoDateTime
  riderId: string
  riderName: string
  amountHalalas: Halalas
  reasonCode: string
  destination: RefundDestination
  /**
   * `null` is legitimate — a refund with no traceable payment. It renders as a
   * warning row, never as a fabricated link.
   */
  sourcePaymentId: string | null
  /** The subscription or trip the refund relates to. */
  relatedId: string | null
  processedByUserId: string
  processedByUserName: string
  /** The posting this refund wrote. One refund, one posting, one destination. */
  postingId: string
  creditNoteId: string
  settlement: SettlementState
}

/**
 * The tax document a refund mints (`:15862`). A refund with no credit note is
 * not a refund; it is a hole in the VAT return.
 *
 * `vatHalalas` is the **residual** (M-3): `total − subtotal`, never rounded
 * independently, so the two always sum to the total exactly (AC-338, AC-345).
 */
export interface CreditNote {
  id: string
  /** Gapless sequence, server-owned (`:15872`). `EYV-CN-2026-000012`. */
  noteNumber: string
  refundId: string
  buyerId: string
  buyerName: string
  subtotalHalalas: Halalas
  vatHalalas: Halalas
  totalHalalas: Halalas
  /**
   * `null` when nothing matched. **Never guessed.** Legacy falls back to *the
   * first paid payment for that rider* when it cannot match (`:15857`,
   * `12a` R7) and still marks the note linked — a credit note against an
   * unrelated invoice, silently "correct". AC-356, AC-357.
   */
  againstInvoice: string | null
  againstPaymentId: string | null
  /** `true` iff `againstInvoice === null`. Carried so the filter is one field, not a derivation. */
  unlinked: boolean
  /** The date it was issued. Legacy freezes it (`12a` R18); AC-360 forbids that. */
  issuedAt: IsoDateTime
  issuedByUserId: string
}

/* ─────────────────────── payouts & escrow ───────────────────── */

export type PayoutState = 'due' | 'processing' | 'paid' | 'failed' | 'reversed'

/**
 * A captain's payout position for the period (§6.4).
 *
 * `netPayableHalalas` is **derived** — `payable − cashDebt` — and is therefore
 * not a field, even though it is the amount the payout action commits
 * (AC-366). It is derived because it must be computed the same way in the
 * confirmation modal, on the row and in the audit entry, from two server
 * values that are each independently true.
 *
 * **D-F6:** captain cash debt is never actually deducted from a payout today.
 * `payDriver` reads only `p.pending` (`:7026`) while the page copy at `:1000`
 * says the debt is *"deducted automatically from their next payout"*. Every
 * payout over-pays by the outstanding debt. AC-366 closes it.
 */
export interface CaptainPayout {
  captainId: string
  captainName: string
  tier: string
  tripsInPeriod: number
  earnedHalalas: Halalas
  paidOutHalalas: Halalas
  /**
   * The `liability.driver` balance for this captain — **server, not
   * `earned − paidOut`.** The two can legitimately differ: an escrow release
   * and a deduction both move the payable without moving either component.
   */
  payableHalalas: Halalas
  /** The `ar.driver` balance. Positive = the captain owes Eyvar. */
  cashDebtHalalas: Halalas
  lastPayoutAt: IsoDateTime | null
  state: PayoutState
  /** Set only when `state === 'failed'`. The bank's words, keyed. */
  failureReason: LocalisedText | null
  /** The bank account the money goes to, last four only. `null` = no account on file. */
  bankAccountLast4: string | null
}

/**
 * An escrow hold against undelivered plan trips.
 *
 * `progressPercent` and `isReleasable` are **derived** and absent by design.
 *
 * **D-F19 closed:** legacy stores `status: 'ready'` (`:2803`) — a *computed*
 * state (`tripsCompleted >= tripsRequired`) persisted as data, which can
 * disagree with the trip counts printed beside it. `settlement` here carries
 * only facts: `held`, `released`, `reversed`.
 */
export interface EscrowHold {
  id: string
  subscriptionId: string
  captainId: string
  captainName: string
  riderId: string
  riderName: string
  amountHalalas: Halalas
  tripsRequired: number
  tripsCompleted: number
  settlement: Extract<SettlementState, 'held' | 'released' | 'reversed'>
  heldSince: IsoDateTime
  releasedAt: IsoDateTime | null
  /**
   * **Q-F4 is open.** A subscription cancelled mid-plan leaves a hold that is
   * neither releasable nor refundable under any rule anybody has written:
   * the captain delivered some trips, the rider is owed a pro-rata refund, and
   * the hold covers the whole plan. Legacy has no such state — `escrow.status`
   * is only `held` or `ready` and cancellation touches neither.
   *
   * The flag exists so the gap is **visible rather than absent**. `ESC-1075` is
   * the fixture.
   */
  subscriptionCancelled: boolean
}

export type DeductionState = 'pending' | 'applied' | 'waived'

export interface Deduction {
  id: string
  captainId: string
  captainName: string
  /** Keyed. Legacy stores an English sentence as the type (`'Late pickup (+8 min)'`, `:2807`). */
  type: LocalisedText
  tripId: string | null
  amountHalalas: Halalas
  status: DeductionState
  raisedAt: IsoDateTime
  appliedAt: IsoDateTime | null
  /* ── all four are NEW ─────────────────────────────────────────────────
     `waiveDeduction` today has no permission check, no confirmation, no
     reason and no audit entry (`12b` R1). AC-369, AC-370. */
  waivedAt: IsoDateTime | null
  waivedByUserId: string | null
  waivedByUserName: string | null
  waivedReasonCode: string | null
}

/* ──────────────────── cash & captain debt ───────────────────── */

export type CashClassification = 'match' | 'over_report' | 'under_report' | 'no_report'

export type CashReportStatus = 'pending' | 'resolved' | 'escalated'

/**
 * One captain cash report awaiting review — a **work queue** row (§8.4), not a
 * ledger row. It extends `SlaTracked` and carries a `Claim` for the same reason
 * every other queue does: an operator has to be able to see who owns it.
 *
 * `deviationHalalas` and `isOverCap` are **derived** and absent.
 * `repeatCount` is **not** derived here: legacy computes it client-side by
 * filtering the whole ledger once per rendered row (`:12098`), which is
 * O(rows²) and gives a different answer on a truncated page.
 */
export interface CashReport extends SlaTracked {
  id: string
  tripId: string
  captainId: string
  captainName: string
  riderId: string
  riderName: string
  reportedAt: IsoDateTime
  /** From the trip — GPS plus pricing. Never zero on a real report. */
  expectedFareHalalas: Halalas
  /**
   * **`null` means never reported**, which is a distinct state from zero and
   * renders `Never reported` in words (AC-372). Legacy already models it
   * (`reportedAmount: null`, `:12126`) and then renders `0.00` for it.
   */
  reportedHalalas: Halalas | null
  topupHalalas: Halalas
  /**
   * Server policy, not a client constant. The tolerance band that produces it
   * is `CASH_TOLERANCE = 2.00` in the browser today (`:12079`).
   */
  classification: CashClassification
  riderConfirmed: boolean
  /** The captain's own explanation. `null` when they gave none. */
  captainNote: string | null
  /** `commission + topup` (`:12089`). What this report added to `ar.driver`. */
  debtAddedHalalas: Halalas
  status: CashReportStatus
  /** Server-computed: prior under-reports and no-reports by this captain. */
  repeatCount: number
  claim: Claim | null
  resolvedAt: IsoDateTime | null
  resolvedByUserId: string | null
  resolvedByUserName: string | null
  resolutionReasonCode: string | null
}

/**
 * A captain's cash-receivable position — the `ar.driver` ledger's header row.
 *
 * `isOverCap` is **derived** from `balanceHalalas >= capHalalas`, so it is not
 * a field. `capHalalas` is **server policy** (Admin › Operational Policy), not
 * the client constant `CASH_DEBT_CAP = -300` (`:12080`).
 */
export interface CaptainDebt {
  captainId: string
  captainName: string
  /**
   * Signed, on `ar.driver`'s normal side: **positive = the captain owes
   * Eyvar**. A captain in credit is negative and must not be silently dropped
   * from the total (AC-381).
   *
   * Note the sign flip against legacy: `DB.driverCashDebt` stores debt as a
   * *negative* number and compares `<= -300` (`:12082`), so every reader has to
   * negate it (`:12190`, `:12240`, `:14300`). On a debit-normal account, debt
   * is positive.
   */
  balanceHalalas: Halalas
  capHalalas: Halalas
  lastReportAt: IsoDateTime | null
  openReportCount: number
}

/* ────────────────────────── rider wallets ───────────────────── */

/**
 * The wallet **index** row (§6.6). The index is an index table — selection,
 * sort and filters all apply (foundation §7.1). The per-rider ledger reached
 * from the identity link is a `Ledger` and none of the three applies there
 * (AC-382). The boundary is the identity link and the two rule sets do not mix.
 *
 * `isNegative` is **derived** from `balanceHalalas < 0`.
 */
export interface WalletSummary {
  riderId: string
  riderName: string
  /** Signed. **Q-F6 / foundation Q9 open**: whether negative blocks a booking. */
  balanceHalalas: Halalas
  pendingHalalas: Halalas
  postingCount: number
  lastActivityAt: IsoDateTime | null
}

/**
 * The authority envelope around a goodwill credit or an adjustment
 * (`compCheck`, `:15412`).
 *
 * **Server-computed, always.** Authority is not a client computation: a
 * ceiling the browser evaluates is a ceiling the browser can be asked not to
 * evaluate. AC-384, AC-439.
 *
 * **D-F21:** `compCheck` is bypassed today unless the reason label contains the
 * literal string `'Goodwill'` (`:3985`), so choosing `Manual top-up` moves any
 * amount with no ceiling at all. AC-385 requires the check to apply regardless
 * of reason, and this envelope is returned for every reason code.
 *
 * **D-F20:** `DB.compPolicy.roles` is keyed `Owner / Operations / Support /
 * Finance / default` while seeded roles are `Owner / Finance / Support /
 * Ops Manager` (`:15380` vs `:2831`), so `Ops Manager` silently falls to
 * `default` (50 / 300) and the `Operations` tier (200 / 2000) is unreachable
 * configuration. `appliedRole` names which entry was used, so the fall-through
 * is visible instead of silent (AC-439).
 */
export interface AuthorityCheck {
  allowed: boolean
  /** Which `compPolicy.roles` entry was applied — `'default'` when the role fell through. */
  appliedRole: string
  perCaseCapHalalas: Halalas
  dailyCapHalalas: Halalas
  dailyUsedHalalas: Halalas
  per30dCapHalalas: Halalas
  per30dUsedHalalas: Halalas
  per30dCount: number
  per30dCountCap: number
  /** `> 200 SAR` (`:15388`). **Q-F7 open**: there is no second-approver surface anywhere. */
  needsSecondApproval: boolean
  secondApprovalThresholdHalalas: Halalas
  /** Keyed. `null` when `allowed`. Never a silently trimmed amount (`:15412`'s own comment). */
  blockedReason: LocalisedText | null
}

/* ───────────────── ledger & payment controls ────────────────── */

export interface PaymentGateway {
  id: string
  name: string
  type: 'Card' | 'Wallet' | 'Bank' | 'BNPL'
  enabled: boolean
  isDefault: boolean
  isCustom: boolean
  /**
   * Server-attributed, per period. Computed live today by prefix-matching a
   * payment's `method` string (`gatewayStats`, `:7457`) — string matching
   * standing in for a foreign key, so a renamed gateway silently reattributes
   * volume (**D-F16**). AC-423.
   */
  transactionCount: number
  volumeHalalas: Halalas
}

export interface VatConfig {
  registrationNumber: string
  companyLegalName: string
  companyAddress: string
  ratePercent: number
}

/**
 * Gapless numbering is a legal requirement, so the sequence is server-owned and
 * a client never allocates one (AC-424).
 */
export interface InvoiceSequence {
  next: number
  lastIssued: string | null
  prefix: string
}
