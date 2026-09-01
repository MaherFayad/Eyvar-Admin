/**
 * The documents around the postings — refunds, credit notes, escrow holds,
 * deductions, captain payout positions, cash reports, gateways, VAT config.
 *
 * Every money figure here is reconciled against `fixtures/ledger.ts`. Where a
 * figure could be derived from the postings it is **not** duplicated: the
 * client derives it, so the two can never disagree. Where a figure is a
 * server-side aggregate a client could not compute from one page of postings
 * (revenue by plan, gateway volume), it is a literal here and the comment says
 * what it is an aggregate of.
 *
 * The period is June 2026 throughout — `FINANCIALS_PERIOD` below, the month
 * containing `EYVAR_NOW`.
 */

import type { LocalisedText } from '../types/common'
import type {
  CaptainDebt,
  CaptainPayout,
  CashReport,
  CreditNote,
  Deduction,
  EscrowHold,
  FinancialsPeriod,
  InvoiceSequence,
  PaymentGateway,
  Refund,
  RevenueByPlanRow,
  VatConfig,
} from '../types/financials'
import { cycleRecord } from './cycle'
import { fillerDrivers } from './drivers'
import { fillerSubscriptions } from './subscriptions'
import { allTripFixtures } from './trips'

/**
 * The default window. **Q-F8 open**: nobody has said whether a period closes.
 * This ships as an open range with no close concept.
 */
export const FINANCIALS_PERIOD: FinancialsPeriod = { start: '2026-06-01', end: '2026-06-30' }

/**
 * Server policy, per Admin › Operational Policy. `CASH_DEBT_CAP = -300` is a
 * client constant today (`:12080`) and its sign is inverted, because legacy
 * stores captain debt as a negative number.
 */
export const CASH_DEBT_CAP_HALALAS = 30_000

/** `CASH_TOLERANCE = 2.00` (`:12079`). Server policy; the client never classifies. */
export const CASH_TOLERANCE_HALALAS = 200

/** `CASH_COMMISSION_RATE = 0.20` (`:12078`) — one of the four commission answers §4.1 lists. */
export const CASH_COMMISSION_PERCENT = 20

/* ────────────────────────── refunds ─────────────────────────── */

/**
 * Three refunds, deliberately covering the three cases the screen must handle:
 * an ordinary instrument refund, a second instrument refund with a different
 * reason, and a **wallet** refund with **no source payment** — the row §6.3
 * says renders as a warning rather than a fabricated link.
 *
 * Legacy's two seeds (`:2882`) are REF-0002 and REF-0001, and their ids are
 * derived from `DB.refunds.length + 1`, which is not gapless the moment one is
 * deleted (`12a` R5). Here they are server-allocated.
 */
export const refundFixtures: Refund[] = [
  {
    id: 'REF-0001',
    issuedAt: '2026-06-18T14:10:00+03:00',
    riderId: 'RDR-2055',
    riderName: 'Bandar Al-Harbi',
    amountHalalas: 7_350,
    reasonCode: 'BKG_NO_SUPPLY',
    destination: 'instrument',
    sourcePaymentId: 'PAY-5977',
    relatedId: 'SUB-0987',
    processedByUserId: 'USR-2',
    processedByUserName: 'Fahad Al-Dosari',
    postingId: 'REF-0001-P',
    creditNoteId: 'CN-0001',
    settlement: 'settled',
  },
  {
    id: 'REF-0002',
    issuedAt: '2026-06-19T15:00:00+03:00',
    riderId: 'RDR-2087',
    riderName: 'Layla Al-Faraj',
    amountHalalas: 6_920,
    reasonCode: 'PAY_REFUND_REQ',
    destination: 'instrument',
    sourcePaymentId: 'PAY-5988',
    relatedId: 'SUB-0998',
    processedByUserId: 'USR-2',
    processedByUserName: 'Fahad Al-Dosari',
    postingId: 'REF-0002-P',
    creditNoteId: 'CN-0002',
    settlement: 'settled',
  },
  {
    /* No traceable payment. `sourcePaymentId: null` is legitimate and the row
       renders as a warning; the credit note it minted is `unlinked`. */
    id: 'REF-0003',
    issuedAt: '2026-06-22T11:30:00+03:00',
    riderId: 'RDR-1090',
    riderName: 'Reem Al-Dosari',
    amountHalalas: 4_000,
    reasonCode: 'PAY_REFUND_REQ',
    destination: 'wallet',
    sourcePaymentId: null,
    relatedId: null,
    processedByUserId: 'USR-3',
    processedByUserName: 'Lina Al-Otaibi',
    postingId: 'REF-0003-P',
    creditNoteId: 'CN-0003',
    settlement: 'settled',
  },
]

/**
 * One credit note per refund, VAT as the residual. Two carry an invoice; the
 * third carries `null` and says so, because a credit note against an unrelated
 * invoice is worse than one against none (`:15857`, `12a` R7).
 */
export const creditNoteFixtures: CreditNote[] = [
  {
    id: 'CN-0001',
    noteNumber: 'EYV-CN-2026-000041',
    refundId: 'REF-0001',
    buyerId: 'RDR-2055',
    buyerName: 'Bandar Al-Harbi',
    subtotalHalalas: 6_391,
    vatHalalas: 959,
    totalHalalas: 7_350,
    againstInvoice: 'EYV-2026-001102',
    againstPaymentId: 'PAY-5977',
    unlinked: false,
    issuedAt: '2026-06-18T14:10:00+03:00',
    issuedByUserId: 'USR-2',
  },
  {
    id: 'CN-0002',
    noteNumber: 'EYV-CN-2026-000042',
    refundId: 'REF-0002',
    buyerId: 'RDR-2087',
    buyerName: 'Layla Al-Faraj',
    subtotalHalalas: 6_017,
    vatHalalas: 903,
    totalHalalas: 6_920,
    againstInvoice: 'EYV-2026-001148',
    againstPaymentId: 'PAY-5988',
    unlinked: false,
    issuedAt: '2026-06-19T15:00:00+03:00',
    issuedByUserId: 'USR-2',
  },
  {
    id: 'CN-0003',
    noteNumber: 'EYV-CN-2026-000043',
    refundId: 'REF-0003',
    buyerId: 'RDR-1090',
    buyerName: 'Reem Al-Dosari',
    subtotalHalalas: 3_478,
    vatHalalas: 522,
    totalHalalas: 4_000,
    againstInvoice: null,
    againstPaymentId: null,
    unlinked: true,
    issuedAt: '2026-06-22T11:30:00+03:00',
    issuedByUserId: 'USR-3',
  },
]

/* ─────────────────── revenue by plan (§6.3) ─────────────────── */

/**
 * Server aggregates over the period's postings. Every one of these seven values
 * is a hardcoded HTML string today (`:951`–`:957`).
 *
 * The four rows' `grossHalalas` sum to 443,252 — exactly the gross bookings the
 * Overview client computes from `revenue.fares` + `tax.vat_output` credits, so
 * AC-347's cross-screen agreement is a property of the data rather than a
 * coincidence a reviewer has to check.
 */
export const revenueByPlanFixtures: RevenueByPlanRow[] = [
  {
    planId: 'weekly',
    planName: 'Weekly',
    activeSubs: 148,
    trips: 2_960,
    grossHalalas: 178_400,
    platformHalalas: 35_680,
    captainHalalas: 142_720,
    givebacksHalalas: 3_200,
  },
  {
    planId: 'biweekly',
    planName: 'Bi-weekly',
    activeSubs: 62,
    trips: 1_240,
    grossHalalas: 121_900,
    platformHalalas: 21_942,
    captainHalalas: 99_958,
    givebacksHalalas: 1_800,
  },
  {
    /* Draft plan, nine subscribers on a pilot. A row whose plan is not live is
       a real state and the table must not drop it. */
    planId: 'monthly',
    planName: 'Monthly',
    activeSubs: 9,
    trips: 198,
    grossHalalas: 41_500,
    platformHalalas: 6_225,
    captainHalalas: 35_275,
    givebacksHalalas: 600,
  },
  {
    /* Not a plan. Quick rides are the majority of trips and would otherwise be
       missing from a revenue table that claims to add up (AC-355). */
    planId: 'quick-ride',
    planName: 'Quick rides',
    activeSubs: 0,
    trips: 4_180,
    grossHalalas: 101_452,
    platformHalalas: 20_290,
    captainHalalas: 81_162,
    givebacksHalalas: 2_400,
  },
]

/**
 * **`givebackOperationalFixture` is retired. Do not reinstate it.**
 *
 * It held promo `8_400`, referral `3_000` and incentive `6_500` as *operational*
 * figures, because §3.8's closed chart had no account for any of them and they
 * could only have been booked to `expense.goodwill`. The finding was raised
 * rather than worked around, and the owner opened the chart: `expense.promo`,
 * `expense.referral` and `expense.incentive` now exist, and the three figures
 * are **GL balances** posted by `JE-00056` – `JE-00058` in `fixtures/ledger.ts`.
 *
 * The reason it mattered is worth keeping where the fixture used to be.
 * `givebackHalalas` feeds `contributionMarginHalalas`, and the contribution
 * margin is one of the two numbers the Owner is asked to be able to state
 * (`owner.position`, design §10.5). Served from outside the books it is not
 * derivable from the trial balance — so a `✓ books balance` would certify only
 * part of the number it appears to certify, which §3.8 calls **worse than an
 * honest OUT OF BALANCE**.
 *
 * > **A management number is a GL number or it is not auditable.**
 *
 * `clients/financialsOverview.ts` reads all three through `accountFlowFrom`,
 * the same way it reads every other line on that card. Nothing on
 * `FinancialsOverview` is a literal any more, and `financials.test.ts` asserts
 * the three against the ledger rather than against a constant.
 */

/* ──────────────────── payouts & escrow ──────────────────────── */

/**
 * Ten captains' payout positions. The payables sum to 247,713, which is the
 * `liability.driver` balance the trial balance computes — AC-348.
 *
 * Note three rows that exist to break assumptions: `DRV-0103`, whose payable is
 * **not** `earned − paidOut` because a deduction moved it; `DRV-0202`, whose
 * payable is **negative**; and `DRV-0206`, who is owed nothing and owes 316.90.
 */
const namedCaptainPayoutFixtures: CaptainPayout[] = [
  {
    captainId: 'DRV-0101',
    captainName: 'Ahmed Salem',
    tier: 'gold',
    tripsInPeriod: 96,
    earnedHalalas: 65_260,
    paidOutHalalas: 0,
    payableHalalas: 65_260,
    cashDebtHalalas: 2_315,
    lastPayoutAt: '2026-05-22T12:00:00+03:00',
    state: 'due',
    failureReason: null,
    bankAccountLast4: '4821',
  },
  {
    captainId: 'DRV-0102',
    captainName: 'Omar Farouk',
    tier: 'silver',
    tripsInPeriod: 88,
    earnedHalalas: 88_596,
    /* 200.00 paid, reversed, and the reversal itself reversed. Net: paid. */
    paidOutHalalas: 20_000,
    payableHalalas: 68_596,
    cashDebtHalalas: 0,
    lastPayoutAt: '2026-06-24T12:00:00+03:00',
    state: 'paid',
    failureReason: null,
    bankAccountLast4: '2210',
  },
  {
    /* `payable ≠ earned − paidOut`: a 20.00 deduction was applied. This is why
       §6.4 marks `payableHalalas` server-sourced and not derived. */
    captainId: 'DRV-0103',
    captainName: 'Khalid Mansour',
    tier: 'silver',
    tripsInPeriod: 74,
    earnedHalalas: 44_100,
    paidOutHalalas: 0,
    payableHalalas: 42_100,
    cashDebtHalalas: 8_425,
    lastPayoutAt: '2026-05-22T12:00:00+03:00',
    state: 'due',
    failureReason: null,
    bankAccountLast4: '5540',
  },
  {
    /* Cash position is **negative** — Eyvar owes this captain 4.40 on the
       receivable — so the net payable is *more* than the payable. */
    captainId: 'DRV-0104',
    captainName: 'Hassan Al-Ghamdi',
    tier: 'gold',
    tripsInPeriod: 118,
    earnedHalalas: 93_040,
    paidOutHalalas: 90_000,
    payableHalalas: 3_040,
    cashDebtHalalas: -440,
    lastPayoutAt: '2026-06-20T10:00:00+03:00',
    state: 'paid',
    failureReason: null,
    bankAccountLast4: '9013',
  },
  {
    /* **The failed payout.** No bank account on file, which is why. The row
       carries the R5a critical signal, the word in its description, and a page
       banner count — never a red badge (AC-367). */
    captainId: 'DRV-0105',
    captainName: 'Youssef Nouri',
    tier: 'standard',
    tripsInPeriod: 11,
    earnedHalalas: 5_200,
    paidOutHalalas: 0,
    payableHalalas: 0,
    cashDebtHalalas: 0,
    lastPayoutAt: null,
    state: 'failed',
    failureReason: { key: 'fin.payout.failure.noBankAccount' },
    bankAccountLast4: null,
  },
  {
    /**
     * **`processing` — submitted to the bank this morning and not yet
     * confirmed.** `PayoutState` declares five states and three had rows;
     * `processing` is the one an operator sees most of a payout run in, and the
     * filter facet for it had never matched.
     *
     * Nothing about the money changes: a payout in flight has not settled, so
     * the payable is still 40.00 and still inside `liability.driver`. The state
     * is the only difference between this row and a `due` one — which is
     * precisely why the screen must not offer *Pay* on it twice.
     */
    captainId: 'DRV-0106',
    captainName: 'Reem Al-Otaibi',
    tier: 'gold',
    tripsInPeriod: 32,
    earnedHalalas: 4_000,
    paidOutHalalas: 0,
    payableHalalas: 4_000,
    cashDebtHalalas: 0,
    lastPayoutAt: '2026-05-22T12:00:00+03:00',
    state: 'processing',
    failureReason: null,
    bankAccountLast4: '7766',
  },
  {
    /* 62 characters of Arabic in the identity column. */
    captainId: 'DRV-0201',
    captainName: 'عبد الرحمن بن محمد بن عبد الله آل عبد الله القحطاني الدوسري',
    tier: 'gold',
    tripsInPeriod: 214,
    earnedHalalas: 66_217,
    paidOutHalalas: 0,
    payableHalalas: 66_217,
    cashDebtHalalas: 0,
    lastPayoutAt: '2026-05-22T12:00:00+03:00',
    state: 'due',
    failureReason: null,
    bankAccountLast4: '1180',
  },
  {
    /* **Negative payable.** The absentee forfeited an emergency cover cost, so
       this captain owes Eyvar 15.00 on the payable account. */
    captainId: 'DRV-0202',
    captainName: 'Majed Al-Shamrani',
    tier: 'standard',
    tripsInPeriod: 0,
    earnedHalalas: 0,
    paidOutHalalas: 0,
    payableHalalas: -1_500,
    cashDebtHalalas: 0,
    lastPayoutAt: null,
    state: 'due',
    failureReason: null,
    bankAccountLast4: '3390',
  },
  {
    /* Owed nothing, owes 316.90 — over the 300.00 cap, cash collection
       suspended. `netPayable` is deeply negative and a payout must not run. */
    captainId: 'DRV-0206',
    captainName: 'Ibrahim Diarra Coulibaly',
    tier: 'gold',
    tripsInPeriod: 0,
    earnedHalalas: 0,
    paidOutHalalas: 0,
    payableHalalas: 0,
    cashDebtHalalas: 31_690,
    lastPayoutAt: '2026-05-22T12:00:00+03:00',
    state: 'due',
    failureReason: null,
    bankAccountLast4: '6644',
  },
  {
    /**
     * **`reversed` — a payout run that went out against a payable that was not
     * there, and came back.**
     *
     * `PO-0007` paid 300.00 on 22 May while this captain's payable was zero,
     * driving `liability.driver` to −300.00; the reversal on the 24th put it
     * back. `fixtures/ledger.ts` carries both legs (`PAY-0207-1`,
     * `PAY-0207-2`), they net to zero on every account they touch, and that is
     * why the period figures below are all zero while the state records what
     * happened.
     *
     * An erroneous payout that had to be clawed back is the ugliest ordinary
     * event on this screen and nothing seeded it. `paidOutHalalas` is **0**,
     * not 300: net of the reversal, nothing was paid, and a screen that reads
     * `paidOut` as "money that left" would otherwise be wrong here.
     */
    captainId: 'DRV-0207',
    captainName: 'Saud Al-Harbi',
    tier: 'silver',
    tripsInPeriod: 0,
    earnedHalalas: 0,
    paidOutHalalas: 0,
    payableHalalas: 0,
    cashDebtHalalas: 300,
    lastPayoutAt: '2026-05-22T12:00:00+03:00',
    state: 'reversed',
    failureReason: null,
    bankAccountLast4: '2071',
  },
]

/**
 * Five escrow holds. Amounts from the legacy seeds (`:2802`), converted to
 * halalas; `status: 'ready'` is gone, because it was a computed state stored as
 * data (**D-F19**) and the two trip counts beside it are what actually decide
 * releasability.
 */
const namedEscrowHoldFixtures: EscrowHold[] = [
  {
    /* 4 of 5. `Release` renders **disabled in place** with the reason and the
       progress stated in words (AC-365). */
    id: 'ESC-1041',
    subscriptionId: 'SUB-1041',
    captainId: 'DRV-0101',
    captainName: 'Ahmed Salem',
    riderId: 'RDR-1041',
    riderName: 'Nora Al-Harbi',
    amountHalalas: 6_920,
    tripsRequired: 5,
    tripsCompleted: 4,
    settlement: 'held',
    heldSince: '2026-06-05T08:00:00+03:00',
    releasedAt: null,
    subscriptionCancelled: false,
  },
  {
    /* 10 of 10 — releasable. The only row on this list whose action is live. */
    id: 'ESC-1052',
    subscriptionId: 'SUB-1052',
    captainId: 'DRV-0103',
    captainName: 'Khalid Mansour',
    riderId: 'RDR-2031',
    riderName: 'Tariq Al-Saud',
    amountHalalas: 32_960,
    tripsRequired: 10,
    tripsCompleted: 10,
    settlement: 'held',
    heldSince: '2026-06-12T08:00:00+03:00',
    releasedAt: null,
    subscriptionCancelled: false,
  },
  {
    /* Released on 21 June. **The row stays in the list** with its `Released`
       state — `releaseEscrow` splices it out of the array today (`:7064`), so
       the operator cannot see what the balance was or who changed it (AC-364). */
    id: 'ESC-1060',
    subscriptionId: 'SUB-1060',
    captainId: 'DRV-0102',
    captainName: 'Omar Farouk',
    riderId: 'RDR-1080',
    riderName: 'Mohammed Al-Qahtani',
    amountHalalas: 3_298,
    tripsRequired: 1,
    tripsCompleted: 1,
    settlement: 'released',
    heldSince: '2026-06-01T08:00:00+03:00',
    releasedAt: '2026-06-21T09:00:00+03:00',
    subscriptionCancelled: false,
  },
  {
    id: 'ESC-1075',
    subscriptionId: 'SUB-1075',
    captainId: 'DRV-0101',
    captainName: 'Ahmed Salem',
    riderId: 'RDR-1075',
    riderName: 'Sara Al-Ghamdi',
    amountHalalas: 6_920,
    tripsRequired: 5,
    tripsCompleted: 2,
    settlement: 'held',
    heldSince: '2026-06-21T08:00:00+03:00',
    releasedAt: null,
    subscriptionCancelled: false,
  },
  {
    /* **Q-F4, made visible.** A live hold on a cancelled subscription: the
       captain delivered 2 of 5, the rider is owed a pro-rata refund, and no
       rule anybody has written says what happens to the other 41.52. Legacy
       has no such state — cancellation touches escrow at all. */
    id: 'ESC-0987',
    subscriptionId: 'SUB-0987',
    captainId: 'DRV-0105',
    captainName: 'Youssef Nouri',
    riderId: 'RDR-2055',
    riderName: 'Bandar Al-Harbi',
    amountHalalas: 6_920,
    tripsRequired: 5,
    tripsCompleted: 2,
    settlement: 'held',
    heldSince: '2026-06-08T08:00:00+03:00',
    releasedAt: null,
    subscriptionCancelled: true,
  },
]

const namedDeductionFixtures: Deduction[] = [
  {
    id: 'DED-01',
    captainId: 'DRV-0103',
    captainName: 'Khalid Mansour',
    type: { key: 'fin.deduction.latePickup', params: { minutes: 8 } },
    tripId: 'TRP-7742',
    amountHalalas: 1_500,
    status: 'pending',
    raisedAt: '2026-06-25T08:05:00+03:00',
    appliedAt: null,
    waivedAt: null,
    waivedByUserId: null,
    waivedByUserName: null,
    waivedReasonCode: null,
  },
  {
    id: 'DED-02',
    captainId: 'DRV-0105',
    captainName: 'Youssef Nouri',
    type: { key: 'fin.deduction.riderNoShow' },
    tripId: 'TRP-9003',
    amountHalalas: 3_000,
    status: 'pending',
    raisedAt: '2026-06-25T07:20:00+03:00',
    appliedAt: null,
    waivedAt: null,
    waivedByUserId: null,
    waivedByUserName: null,
    waivedReasonCode: null,
  },
  {
    id: 'DED-03',
    captainId: 'DRV-0103',
    captainName: 'Khalid Mansour',
    type: { key: 'fin.deduction.latePickupRepeat', params: { occurrence: 3 } },
    tripId: 'TRP-7738',
    amountHalalas: 2_000,
    status: 'applied',
    raisedAt: '2026-06-24T09:00:00+03:00',
    appliedAt: '2026-06-25T08:30:00+03:00',
    waivedAt: null,
    waivedByUserId: null,
    waivedByUserName: null,
    waivedReasonCode: null,
  },
  {
    /* **Waived, and still visible**, with the actor and the reason on the row.
       `waiveDeduction` today has no permission check, no confirmation, no
       reason and no audit entry (`12b` R1). AC-369, AC-370. */
    id: 'DED-04',
    captainId: 'DRV-0102',
    captainName: 'Omar Farouk',
    type: { key: 'fin.deduction.vehicleCleanliness' },
    tripId: 'TRP-7735',
    amountHalalas: 2_500,
    status: 'waived',
    raisedAt: '2026-06-23T18:40:00+03:00',
    appliedAt: null,
    waivedAt: '2026-06-24T09:15:00+03:00',
    waivedByUserId: 'USR-1',
    waivedByUserName: 'Sarah Al-Rashid',
    waivedReasonCode: 'TRP_ROUTE_DEVIATION',
  },
]

/* ─────────────────── cash & captain debt ────────────────────── */

/**
 * The reconciliation queue.
 *
 * **`slaSource: 'unset'` on every row, and that is a finding, not a
 * placeholder.** §7.3 and AC-374 require an SLA countdown and an "past its SLA"
 * state on this queue, and **no window exists**: the legacy cash module
 * enforces none, a cash report carries no reason code to look one up from, and
 * `types/workQueue.ts`'s own rule is that an invented window must not hide
 * among measured ones. So the clock fields are null, the queue renders with no
 * countdown, and the window is a product decision. Ownership, claims and
 * take-over are all fully seeded and unaffected.
 */
const namedCashReportFixtures: CashReport[] = [
  {
    id: 'CASH-0001',
    tripId: 'TRP-7742',
    captainId: 'DRV-0103',
    captainName: 'Khalid Mansour',
    riderId: 'RDR-2055',
    riderName: 'Bandar Al-Harbi',
    reportedAt: '2026-06-25T08:00:00+03:00',
    expectedFareHalalas: 2_940,
    reportedHalalas: 2_100,
    topupHalalas: 0,
    classification: 'under_report',
    riderConfirmed: false,
    captainNote: 'Rider disputed the fare after a route change',
    debtAddedHalalas: 588,
    status: 'pending',
    repeatCount: 2,
    claim: null,
    resolvedAt: null,
    resolvedByUserId: null,
    resolvedByUserName: null,
    resolutionReasonCode: null,
    slaStartedAt: null,
    slaDueAt: null,
    slaTargetMinutes: null,
    slaBreachedAt: null,
    slaSource: 'unset',
    firstResponseDueAt: null,
    firstResponseAt: null,
    firstResponseBreachedAt: null,
  },
  {
    /* **`reportedHalalas: null` — never reported**, which renders in words and
       whose deviation renders `—`, not `0.00 SAR` (AC-372). Escalated to Trust
       & Safety, so the row carries the R5a critical signal and is counted in a
       page banner — it is not a red badge (AC-378).

       Also: **claimed by another operator.** Both dispositions render disabled
       in place with the owner named; a confirmed take-over is available and
       writes an audit entry (AC-374). */
    id: 'CASH-0002',
    tripId: 'TRP-7738',
    captainId: 'DRV-0103',
    captainName: 'Khalid Mansour',
    riderId: 'RDR-2031',
    riderName: 'Tariq Al-Saud',
    reportedAt: '2026-06-24T06:40:00+03:00',
    expectedFareHalalas: 2_185,
    reportedHalalas: null,
    topupHalalas: 0,
    classification: 'no_report',
    riderConfirmed: false,
    captainNote: null,
    debtAddedHalalas: 437,
    status: 'escalated',
    repeatCount: 2,
    claim: {
      key: 'cash:CASH-0002',
      entityType: 'cash',
      entityId: 'CASH-0002',
      ownerId: 'USR-3',
      ownerName: 'Lina Al-Otaibi',
      claimedAt: '2026-06-24T07:02:00+03:00',
      touchedAt: '2026-06-25T09:05:00+03:00',
      state: 'claimed',
      releasedAt: null,
      releaseReason: null,
      takeovers: [],
    },
    resolvedAt: null,
    resolvedByUserId: null,
    resolvedByUserName: null,
    resolutionReasonCode: null,
    slaStartedAt: null,
    slaDueAt: null,
    slaTargetMinutes: null,
    slaBreachedAt: null,
    slaSource: 'unset',
    firstResponseDueAt: null,
    firstResponseAt: null,
    firstResponseBreachedAt: null,
  },
  {
    /* A match **with a top-up**: the captain collected 20.00 in cash to credit
       the rider's wallet, so `reported − topup === expected` and the debt is
       commission plus the top-up (`:12089`). */
    id: 'CASH-0003',
    tripId: 'TRP-9005',
    captainId: 'DRV-0101',
    captainName: 'Ahmed Salem',
    riderId: 'RDR-2090',
    riderName: 'Hessa Al-Mutlaq',
    reportedAt: '2026-06-25T07:45:00+03:00',
    expectedFareHalalas: 1_575,
    reportedHalalas: 3_575,
    topupHalalas: 2_000,
    classification: 'match',
    riderConfirmed: true,
    captainNote: null,
    debtAddedHalalas: 2_315,
    status: 'resolved',
    repeatCount: 0,
    claim: null,
    resolvedAt: '2026-06-25T07:50:00+03:00',
    resolvedByUserId: 'USR-2',
    resolvedByUserName: 'Fahad Al-Dosari',
    resolutionReasonCode: 'PAY_INCORRECT_CHARGE',
    slaStartedAt: null,
    slaDueAt: null,
    slaTargetMinutes: null,
    slaBreachedAt: null,
    slaSource: 'unset',
    firstResponseDueAt: null,
    firstResponseAt: null,
    firstResponseBreachedAt: null,
  },
  {
    id: 'CASH-0004',
    tripId: 'TRP-9101',
    captainId: 'DRV-0207',
    captainName: 'Saud Al-Harbi',
    riderId: 'RDR-4001',
    riderName: 'Abdulaziz Al-Suwailem',
    reportedAt: '2026-06-25T08:05:00+03:00',
    expectedFareHalalas: 1_500,
    reportedHalalas: 1_500,
    topupHalalas: 0,
    classification: 'match',
    riderConfirmed: true,
    captainNote: null,
    debtAddedHalalas: 300,
    status: 'resolved',
    resolvedAt: '2026-06-25T08:08:00+03:00',
    resolvedByUserId: 'USR-2',
    resolvedByUserName: 'Fahad Al-Dosari',
    resolutionReasonCode: 'PAY_INCORRECT_CHARGE',
    repeatCount: 0,
    claim: null,
    slaStartedAt: null,
    slaDueAt: null,
    slaTargetMinutes: null,
    slaBreachedAt: null,
    slaSource: 'unset',
    firstResponseDueAt: null,
    firstResponseAt: null,
    firstResponseBreachedAt: null,
  },
  {
    /* A 1,284.50 SAR trip under-reported by 284.50. The amount that makes a
       money column wide. */
    id: 'CASH-0005',
    tripId: 'TRP-9102',
    captainId: 'DRV-0206',
    captainName: 'Ibrahim Diarra Coulibaly',
    riderId: 'RDR-4003',
    riderName: 'Meshari Al-Dossari',
    reportedAt: '2026-06-22T20:00:00+03:00',
    expectedFareHalalas: 128_450,
    reportedHalalas: 100_000,
    topupHalalas: 0,
    classification: 'under_report',
    riderConfirmed: false,
    captainNote: 'Rider only had partial cash on hand',
    debtAddedHalalas: 25_690,
    status: 'pending',
    repeatCount: 1,
    claim: null,
    resolvedAt: null,
    resolvedByUserId: null,
    resolvedByUserName: null,
    resolutionReasonCode: null,
    slaStartedAt: null,
    slaDueAt: null,
    slaTargetMinutes: null,
    slaBreachedAt: null,
    slaSource: 'unset',
    firstResponseDueAt: null,
    firstResponseAt: null,
    firstResponseBreachedAt: null,
  },
  {
    /* Second no-report from the same captain — the one that puts them over the
       cap, so `Cash collection suspended` renders here and on their 360°
       profile from the same source value (AC-380). */
    id: 'CASH-0006',
    tripId: 'TRP-8043',
    captainId: 'DRV-0206',
    captainName: 'Ibrahim Diarra Coulibaly',
    riderId: 'RDR-1046',
    /* Was `Nora Al-Harbi` -- RDR-1041's name on RDR-1046's id, and RDR-1046 did
       not exist. Both halves are fixed: the rider is a real record now
       (`fixtures/riders.ts`) and the name is hers. The two are one letter
       apart, which is how the mistake happened and why it is worth keeping
       both riders in the set. */
    riderName: 'Noura Al-Harbi',
    reportedAt: '2026-06-24T21:00:00+03:00',
    expectedFareHalalas: 30_000,
    reportedHalalas: null,
    topupHalalas: 0,
    classification: 'no_report',
    riderConfirmed: false,
    captainNote: null,
    debtAddedHalalas: 6_000,
    status: 'pending',
    repeatCount: 2,
    claim: null,
    resolvedAt: null,
    resolvedByUserId: null,
    resolvedByUserName: null,
    resolutionReasonCode: null,
    slaStartedAt: null,
    slaDueAt: null,
    slaTargetMinutes: null,
    slaBreachedAt: null,
    slaSource: 'unset',
    firstResponseDueAt: null,
    firstResponseAt: null,
    firstResponseBreachedAt: null,
  },
  {
    /* An **over-report**: the captain handed in 12.00 more than the trip
       expected, so their receivable goes into credit. */
    id: 'CASH-0007',
    tripId: 'TRP-9008',
    captainId: 'DRV-0104',
    captainName: 'Hassan Al-Ghamdi',
    riderId: 'RDR-2031',
    riderName: 'Tariq Al-Saud',
    reportedAt: '2026-06-25T08:10:00+03:00',
    expectedFareHalalas: 3_800,
    reportedHalalas: 5_000,
    topupHalalas: 0,
    classification: 'over_report',
    riderConfirmed: true,
    captainNote: null,
    debtAddedHalalas: 760,
    status: 'resolved',
    repeatCount: 0,
    claim: null,
    resolvedAt: '2026-06-25T08:14:00+03:00',
    resolvedByUserId: 'USR-2',
    resolvedByUserName: 'Fahad Al-Dosari',
    resolutionReasonCode: 'PAY_INCORRECT_CHARGE',
    slaStartedAt: null,
    slaDueAt: null,
    slaTargetMinutes: null,
    slaBreachedAt: null,
    slaSource: 'unset',
    firstResponseDueAt: null,
    firstResponseAt: null,
    firstResponseBreachedAt: null,
  },
]

/**
 * Captain receivable positions. **Positive means the captain owes Eyvar** — the
 * sign convention of a debit-normal account, and the opposite of
 * `DB.driverCashDebt`, which stores debt negative and makes every reader negate
 * it (`:12082`, `:12190`, `:12240`, `:14300`).
 *
 * The five balances sum to 42,290, the `ar.driver` trial-balance figure. The
 * **positive-only** total is 42,730 — and that 440 gap is exactly what AC-381
 * is about: a captain in credit must not be silently dropped. The
 * reconciliation view carries the gap as a row rather than hiding it.
 */
const namedCaptainDebtFixtures: CaptainDebt[] = [
  {
    captainId: 'DRV-0103',
    captainName: 'Khalid Mansour',
    balanceHalalas: 8_425,
    capHalalas: CASH_DEBT_CAP_HALALAS,
    lastReportAt: '2026-06-25T08:00:00+03:00',
    openReportCount: 1,
  },
  {
    captainId: 'DRV-0101',
    captainName: 'Ahmed Salem',
    balanceHalalas: 2_315,
    capHalalas: CASH_DEBT_CAP_HALALAS,
    lastReportAt: '2026-06-25T07:45:00+03:00',
    openReportCount: 0,
  },
  {
    captainId: 'DRV-0207',
    captainName: 'Saud Al-Harbi',
    balanceHalalas: 300,
    capHalalas: CASH_DEBT_CAP_HALALAS,
    lastReportAt: '2026-06-25T08:05:00+03:00',
    openReportCount: 0,
  },
  {
    /* **Over the cap.** Cash collection suspended. */
    captainId: 'DRV-0206',
    captainName: 'Ibrahim Diarra Coulibaly',
    balanceHalalas: 31_690,
    capHalalas: CASH_DEBT_CAP_HALALAS,
    lastReportAt: '2026-06-24T21:00:00+03:00',
    openReportCount: 2,
  },
  {
    /* In credit. */
    captainId: 'DRV-0104',
    captainName: 'Hassan Al-Ghamdi',
    balanceHalalas: -440,
    capHalalas: CASH_DEBT_CAP_HALALAS,
    lastReportAt: '2026-06-25T08:10:00+03:00',
    openReportCount: 0,
  },
]


/* ══════════════════════════ volume ═══════════════════════════ */

/**
 * ## Why the filler money is all zero, or all outside the period
 *
 * Four of the five collections below are **reconciled against the general
 * ledger**, and `clients/financials.test.ts` asserts each one:
 *
 * | figure | must equal | AC |
 * |---|---|---|
 * | sum of `payableHalalas` | `liability.driver` balance | AC-348 |
 * | positive `balanceHalalas` | the captain-debt tile | AC-350 |
 * | held escrow | the escrow tile | AC-349 |
 * | each rider's wallet | that rider's ledger | — |
 *
 * So a filler row carrying money has to carry a matching journal entry and a
 * matching subject posting, or the books stop agreeing — and forty of those
 * would be forty chances to get double-entry wrong in a fixture nobody reads.
 *
 * The rows below take the honest way out instead: **every one of them is a
 * position that is genuinely zero, or a document from a period the ledger page
 * does not cover.** A captain who has been paid in full has a payable of zero
 * and a `liability.driver` balance of zero, and those two agree exactly. A cash
 * report from April is a real document whose postings are not on this page —
 * `fixtures/ledger.ts` says in its own header that it is *"built from in-period
 * activity"*, so an out-of-period document with no posting here is the
 * established shape, not a gap.
 *
 * Every row is still built the paired way: a cash report's trip, captain, rider
 * and expected fare all come off **one** `Trip` record, an escrow hold's plan,
 * captain and rider off **one** `Subscription`, and a payout's captain off one
 * `Driver`. None of these collections can drift from the records they describe.
 */

/** Finished legs with a captain on them — the source a cash report describes. */
const CASHABLE_TRIPS = allTripFixtures.flatMap((t) =>
  t.driverId === null || t.driverName === null || t.status !== 'done' || t.fareHalalas === 0
    ? []
    : [{ ...t, driverId: t.driverId, driverName: t.driverName }],
)

/**
 * The plans a **released** hold can be attached to: filler subscriptions that
 * carry no escrow of their own.
 *
 * Both halves of that are load-bearing.
 *
 * **Filler, not named.** `clients/integrity.test.ts` looks up
 * `agree.escrow-amount`'s finding for `SUB-1060` and asserts its counterpart is
 * `ESC-1060`. The check indexes holds by `subscriptionId`, so a second hold on
 * a named plan would silently take that slot and the finding would name the
 * wrong document.
 *
 * **`escrowHeldHalalas === null`, not any plan.** A subscription that still
 * claims escrow while its only hold is released is `escrowAfterRelease` — a
 * *critical* finding, and correctly so. Attaching forty-six released holds to
 * plans that claim escrow would have manufactured forty-six criticals out of
 * nothing but a pagination requirement.
 *
 * A plan legitimately carries several holds over its life — a weekly plan
 * raises and releases one per cycle — so cycling a smaller set of plans is the
 * shape, not a compromise.
 */
const ESCROWABLE_PLANS = fillerSubscriptions.flatMap((sub) =>
  sub.driverId === null || sub.driverName === null || sub.escrowHeldHalalas !== null
    ? []
    : [{ ...sub, driverId: sub.driverId, driverName: sub.driverName }],
)

/**
 * Forty-four archived cash reports, all `resolved`, all reconciled weeks ago.
 *
 * The queue an operator works is the seven above; this is the history behind
 * it, which is what makes the `resolved` view, the repeat-offender count and
 * the date-range filter worth anything.
 *
 * **`slaSource: 'unset'` and null clocks on every one**, exactly as on the
 * seven. `financials.test.ts:1042` states that as a *prohibition* rather than a
 * gap — *"if you can make a countdown render here, you have broken it"* —
 * because no cash SLA window exists to look up. Volume does not create one.
 */
export const fillerCashReports: CashReport[] = Array.from({ length: 44 }, (_, i) => {
  const trip = cycleRecord(CASHABLE_TRIPS, i * 3 + 1)
  const commission = Math.round(trip.fareHalalas * (CASH_COMMISSION_PERCENT / 100))
  const operator = cycleRecord(
    [
      { id: 'USR-2', name: 'Fahad Al-Dosari' },
      { id: 'USR-5', name: 'Yousef Al-Balawi' },
    ],
    i,
  )
  const reportedAt = `2026-0${4 + (i % 2)}-${String((i % 27) + 1).padStart(2, '0')}T${String(6 + (i % 14)).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}:00+03:00`
  return {
    id: `CASH-${String(1000 + i)}`,
    tripId: trip.id,
    captainId: trip.driverId,
    captainName: trip.driverName,
    riderId: trip.riderId,
    riderName: trip.riderName,
    reportedAt,
    expectedFareHalalas: trip.fareHalalas,
    /* Handed in to the halala. `match` is what most of an archive is; the
       interesting classifications stay on the seven rows that argue for them. */
    reportedHalalas: trip.fareHalalas,
    topupHalalas: 0,
    classification: 'match',
    riderConfirmed: true,
    captainNote: null,
    /* `commission + topup` (`:12089`), with no top-up. */
    debtAddedHalalas: commission,
    status: 'resolved',
    repeatCount: 0,
    claim: null,
    resolvedAt: reportedAt,
    resolvedByUserId: operator.id,
    resolvedByUserName: operator.name,
    resolutionReasonCode: 'PAY_INCORRECT_CHARGE',
    slaStartedAt: null,
    slaDueAt: null,
    slaTargetMinutes: null,
    slaBreachedAt: null,
    slaSource: 'unset',
    firstResponseDueAt: null,
    firstResponseAt: null,
    firstResponseBreachedAt: null,
  } satisfies CashReport
})

/** 51 rows — seven in the queue, forty-four reconciled. */
export const cashReportFixtures: CashReport[] = [...namedCashReportFixtures, ...fillerCashReports]

/**
 * Forty-one captains paid in full.
 *
 * `payableHalalas: 0`, and that is not a placeholder: it is the
 * `liability.driver` balance for a captain whose earnings have all been
 * released, and it agrees with the ledger exactly, which is what AC-348
 * requires. `earnedHalalas === paidOutHalalas` says the same thing from the
 * document side.
 *
 * The interesting positions — the failed payout, the negative payable, the
 * captain over the debt cap, the reversal — all stay on the ten hand-written
 * rows, where each is argued for. This is the population they are exceptions
 * to, and without it the exceptions were the entire table.
 */
export const fillerCaptainPayouts: CaptainPayout[] = Array.from({ length: 41 }, (_, i) => {
  const captain = cycleRecord(fillerDrivers, i)
  const earned = 12_000 + ((i * 4_150) % 90_000)
  return {
    captainId: captain.id,
    captainName: captain.name,
    tier: captain.tier,
    tripsInPeriod: 8 + ((i * 13) % 140),
    earnedHalalas: earned,
    paidOutHalalas: earned,
    payableHalalas: 0,
    cashDebtHalalas: 0,
    lastPayoutAt: `2026-06-${String(20 + (i % 5)).padStart(2, '0')}T12:00:00+03:00`,
    state: 'paid',
    failureReason: null,
    bankAccountLast4: String(1000 + i * 7).slice(-4),
  } satisfies CaptainPayout
})

/** 51 rows. */
export const captainPayoutFixtures: CaptainPayout[] = [
  ...namedCaptainPayoutFixtures,
  ...fillerCaptainPayouts,
]

/**
 * Forty-six escrow holds that have already been released.
 *
 * **All `released`, never `held`.** `financials.test.ts:1714` pins the
 * settlement set to exactly `{ held, released }`, the escrow tile is the sum of
 * the `held` rows, and a released row adds nothing to it — so this population
 * grows the table without moving a number. It also exercises the thing AC-364
 * is about: `releaseEscrow` splices a released hold **out of the array**
 * (`:7064`), so an operator cannot see what the balance was or who released it.
 * Forty-six rows that survived their release are the evidence that it should
 * not.
 */
export const fillerEscrowHolds: EscrowHold[] = Array.from({ length: 46 }, (_, i) => {
  const plan = cycleRecord(ESCROWABLE_PLANS, i)
  const heldSince = `2026-0${3 + (i % 3)}-${String((i % 27) + 1).padStart(2, '0')}T08:00:00+03:00`
  return {
    id: `ESC-${String(2000 + i)}`,
    subscriptionId: plan.id,
    captainId: plan.driverId,
    captainName: plan.driverName,
    riderId: plan.riderId,
    riderName: plan.riderName,
    amountHalalas: 3_298 + ((i * 617) % 30_000),
    tripsRequired: plan.tripsIncluded,
    /* Released, so the plan was delivered in full. `tripsCompleted` short of
       `tripsRequired` on a released hold would be the contradiction AC-365 is
       about. */
    tripsCompleted: plan.tripsIncluded,
    settlement: 'released',
    heldSince,
    releasedAt: `2026-0${4 + (i % 2)}-${String((i % 27) + 1).padStart(2, '0')}T09:00:00+03:00`,
    subscriptionCancelled: false,
  } satisfies EscrowHold
})

/** 51 rows — five live holds and forty-six released ones that stayed visible. */
export const escrowHoldFixtures: EscrowHold[] = [
  ...namedEscrowHoldFixtures,
  ...fillerEscrowHolds,
]

/**
 * Forty-seven historical deductions.
 *
 * A deduction denormalises the captain and points at a trip, so both come off
 * **one** `Trip` record — the captain who drove the leg is the captain the
 * deduction is against, by construction rather than by care.
 *
 * The spread is deliberate: mostly `applied`, a fifth `waived` **with the actor
 * and the reason on the row**. `waiveDeduction` today has no permission check,
 * no confirmation, no reason and no audit entry (`12b` R1); AC-369 and AC-370
 * close that, and they need a population of waivers to close it against — one
 * waived row proves a badge renders, forty-seven prove the audit column is
 * never empty on a waiver.
 */
export const fillerDeductions: Deduction[] = Array.from({ length: 47 }, (_, i) => {
  const trip = cycleRecord(CASHABLE_TRIPS, i * 5 + 2)
  const waived = i % 5 === 0
  const raisedAt = `2026-0${4 + (i % 3)}-${String((i % 27) + 1).padStart(2, '0')}T${String(7 + (i % 12)).padStart(2, '0')}:${String((i * 11) % 60).padStart(2, '0')}:00+03:00`
  const type = cycleRecord(
    [
      { id: 'late', key: 'fin.deduction.latePickup' },
      { id: 'noshow', key: 'fin.deduction.riderNoShow' },
      { id: 'clean', key: 'fin.deduction.vehicleCleanliness' },
      { id: 'repeat', key: 'fin.deduction.latePickupRepeat' },
    ],
    i,
  )
  return {
    id: `DED-${String(100 + i)}`,
    captainId: trip.driverId,
    captainName: trip.driverName,
    type: (type.id === 'late'
      ? { key: type.key, params: { minutes: 5 + (i % 20) } }
      : type.id === 'repeat'
        ? { key: type.key, params: { occurrence: 2 + (i % 4) } }
        : { key: type.key }) as LocalisedText,
    tripId: trip.id,
    amountHalalas: 500 * (1 + (i % 8)),
    status: waived ? 'waived' : 'applied',
    raisedAt,
    appliedAt: waived ? null : raisedAt,
    waivedAt: waived ? raisedAt : null,
    waivedByUserId: waived ? 'USR-1' : null,
    waivedByUserName: waived ? 'Sarah Al-Rashid' : null,
    waivedReasonCode: waived ? 'TRP_ROUTE_DEVIATION' : null,
  } satisfies Deduction
})

/** 51 rows — four in the queue, forty-seven decided. */
export const deductionFixtures: Deduction[] = [...namedDeductionFixtures, ...fillerDeductions]

/**
 * Forty-six captains whose cash position is **flat**.
 *
 * `balanceHalalas: 0` is the answer for every captain who has handed in
 * everything they collected, which is most of them, and it keeps the positive
 * total at 42,730 — the figure AC-350 pins to the captain-debt tile and AC-381
 * measures the 440-halala credit gap against.
 *
 * A cash-position table where every row is in trouble is a table an operator
 * stops reading. These are the rows the four interesting ones — over the cap,
 * in credit, and two ordinary debts — are exceptions to.
 */
export const fillerCaptainDebts: CaptainDebt[] = Array.from({ length: 46 }, (_, i) => {
  const captain = cycleRecord(fillerDrivers, i)
  return {
    captainId: captain.id,
    captainName: captain.name,
    balanceHalalas: 0,
    capHalalas: CASH_DEBT_CAP_HALALAS,
    lastReportAt: `2026-06-${String(10 + (i % 15)).padStart(2, '0')}T${String(7 + (i % 12)).padStart(2, '0')}:00:00+03:00`,
    openReportCount: 0,
  } satisfies CaptainDebt
})

/** 51 rows. */
export const captainDebtFixtures: CaptainDebt[] = [
  ...namedCaptainDebtFixtures,
  ...fillerCaptainDebts,
]

/* ─────────────── ledger & payment controls ──────────────────── */

/**
 * Six gateways from `:13913`, with per-period volume the server attributes.
 * Two are disabled and one is the default — and the default's switch is
 * disabled with the reason `Set a different default first` (`:7480`, correct
 * behaviour, kept, AC-422).
 */
export const paymentGatewayFixtures: PaymentGateway[] = [
  {
    id: 'mada',
    name: 'Mada',
    type: 'Card',
    enabled: true,
    isDefault: true,
    isCustom: false,
    transactionCount: 412,
    volumeHalalas: 186_400,
  },
  {
    id: 'visa',
    name: 'Visa / Mastercard',
    type: 'Card',
    enabled: true,
    isDefault: false,
    isCustom: false,
    transactionCount: 268,
    volumeHalalas: 121_300,
  },
  {
    id: 'apple_pay',
    name: 'Apple Pay',
    type: 'Wallet',
    enabled: true,
    isDefault: false,
    isCustom: false,
    transactionCount: 96,
    volumeHalalas: 48_200,
  },
  {
    id: 'bank_transfer',
    name: 'Bank transfer',
    type: 'Bank',
    enabled: true,
    isDefault: false,
    isCustom: false,
    transactionCount: 12,
    volumeHalalas: 62_400,
  },
  {
    /* Enabled-but-unused and disabled-with-zero are different rows. A count of
       zero renders **no badge** (AC-432), not a `0` badge. */
    id: 'stc_pay',
    name: 'STC Pay',
    type: 'Wallet',
    enabled: false,
    isDefault: false,
    isCustom: false,
    transactionCount: 0,
    volumeHalalas: 0,
  },
  {
    id: 'tabby',
    name: 'Tabby (Buy now, pay later)',
    type: 'BNPL',
    enabled: false,
    isDefault: false,
    isCustom: false,
    transactionCount: 0,
    volumeHalalas: 0,
  },
]

/** `:13971`, unchanged. A VAT registration number is a company fact, not a price. */
export const vatConfigFixture: VatConfig = {
  registrationNumber: '310123456700003',
  companyLegalName: 'Eyvar Technologies LLC',
  companyAddress: 'Riyadh, Saudi Arabia',
  ratePercent: 15,
}

/**
 * `DB.invoiceSequence` starts at `0` and is incremented **at render time**
 * inside `getOrCreateInvoice` (`:4404`), so opening an invoice preview burns a
 * number. Gapless numbering is a legal requirement, so the sequence is
 * server-owned here and no client allocates one (AC-424).
 */
export const invoiceSequenceFixture: InvoiceSequence = {
  next: 1_287,
  lastIssued: 'EYV-2026-001286',
  prefix: 'EYV-2026-',
}
