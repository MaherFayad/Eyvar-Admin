/**
 * The books. Every journal entry and every subject-ledger posting the seven
 * Financials sub-tabs read.
 *
 * ## How to read this file
 *
 * Two flat arrays and nothing clever. `journalEntryFixtures` is the GL —
 * balanced double entries, oldest-first. `ledgerPostingFixtures` is the same
 * money seen from each *subject's* side: one row per rider wallet, captain
 * payable, captain receivable, escrow account and the platform refunds ledger.
 * A posting carries the id of the entry that produced it, so the journal and
 * the subject ledgers are two views of one fact rather than two datasets.
 *
 * **The trial balance is not in this file.** It is computed from
 * `journalEntryFixtures` by `clients/ledger.ts`, which is what makes AC-417
 * true by construction — change a fixture and the account balance changes —
 * and what makes an account that can never be posted to impossible to hide.
 *
 * ## Invariants, all asserted in `clients/financials.test.ts`
 *
 *   - every `amountHalalas` is a positive integer (AC-300)
 *   - every entry's debit lines sum to its credit lines (AC-343)
 *   - every subject ledger's `balanceAfterHalalas` chain is arithmetic:
 *     `previous + (credit ? +amount : −amount)` on its normal side (AC-311)
 *   - a rider's `walletBalanceHalalas` equals their wallet ledger's closing
 *     balance, so two screens cannot disagree about one number
 *   - `reversesPostingId` is set **iff** `kind === 'reversal'`
 *   - VAT is always the residual: `vat = gross − net` (M-3)
 *
 * ## The period
 *
 * Everything is June 2026, the month containing `EYVAR_NOW`
 * (2026-06-25T09:14+03:00). Nothing is dated in the future — see the finding
 * on `WTX-0002` below, which is where two legacy dates put it.
 *
 * ## Two consequences of §3.8's closed chart, recorded rather than worked around
 *
 * 1. **There is no equity or opening-balance account**, so an opening balance
 *    cannot be carried forward in a balanced entry. Every balance in this
 *    fixture is therefore built from in-period activity, and `JE-00001` is an
 *    opening *wallet* balance only because it has a real second leg
 *    (`cash.gateway`) to face.
 * 2. **There is no promotions, referral or incentive expense account**, though
 *    §6.2 lists promo, referral and incentive as three separate giveback lines.
 *    They can only land in `expense.goodwill`, which means the GL cannot
 *    separate them. The three figures are served as operational values on
 *    `financialsOverviewFixture` and the gap is a finding for product-owner.
 */

import { cycle } from './cycle'
import type {
  AccountLine,
  JournalEntry,
  LedgerPosting,
  RefusedPosting,
} from '../types/ledger'

/* ────────────────────────── the journal ─────────────────────── */

const dr = (account: AccountLine['account'], amountHalalas: number): AccountLine => ({
  account,
  direction: 'debit',
  amountHalalas,
})
const cr = (account: AccountLine['account'], amountHalalas: number): AccountLine => ({
  account,
  direction: 'credit',
  amountHalalas,
})

/**
 * VAT at 15 %, extracted from a VAT-inclusive amount, **as a residual**.
 *
 * Written out beside every entry below rather than computed here, so the file
 * stays greppable — but this is the arithmetic each pair satisfies:
 * `net = round(gross / 1.15)` half away from zero, `vat = gross − net`
 * (`:19966`, M-3). Never `round(gross × 0.15/1.15)`, which rounds the second
 * leg independently and lets the two miss by a halala.
 */

/**
 * Oldest-first. The journal **renders** newest-first (§6.8) — the one exception
 * to oldest-first in this wave, because the journal carries no running balance
 * — and `clients/ledger.ts` reverses on the way out rather than storing it
 * backwards.
 */
export const journalEntryFixtures: JournalEntry[] = [
  {
    id: 'JE-00001',
    postedAt: '2026-06-01T00:00:00+03:00',
    type: 'opening_balance',
    reference: 'opening|RDR-1075|wallet',
    lines: [dr('cash.gateway', 1_000), cr('liability.wallet', 1_000)],
    totalHalalas: 1_000,
    meta: { riderId: 'RDR-1075', migration: 'wallet-balances-2026-06' },
  },
  {
    id: 'JE-00002',
    postedAt: '2026-06-01T08:00:00+03:00',
    type: 'escrow_hold',
    reference: 'escrow_hold|ESC-1060',
    lines: [dr('cash.gateway', 3_298), cr('liability.escrow', 3_298)],
    totalHalalas: 3_298,
    meta: { escrowId: 'ESC-1060', subscriptionId: 'SUB-1060' },
  },
  {
    id: 'JE-00003',
    postedAt: '2026-06-05T08:00:00+03:00',
    type: 'escrow_hold',
    reference: 'escrow_hold|ESC-1041',
    lines: [dr('cash.gateway', 6_920), cr('liability.escrow', 6_920)],
    totalHalalas: 6_920,
    meta: { escrowId: 'ESC-1041', subscriptionId: 'SUB-1041' },
  },
  {
    id: 'JE-00004',
    postedAt: '2026-06-05T09:00:00+03:00',
    type: 'wallet_credit',
    reference: 'wallet_credit|RDR-2031|3000|promo',
    lines: [dr('expense.goodwill', 3_000), cr('liability.wallet', 3_000)],
    totalHalalas: 3_000,
    meta: { riderId: 'RDR-2031', reasonCode: 'BKG_NO_SUPPLY' },
  },
  {
    id: 'JE-00005',
    postedAt: '2026-06-08T08:00:00+03:00',
    type: 'escrow_hold',
    reference: 'escrow_hold|ESC-0987',
    lines: [dr('cash.gateway', 6_920), cr('liability.escrow', 6_920)],
    totalHalalas: 6_920,
    meta: { escrowId: 'ESC-0987', subscriptionId: 'SUB-0987' },
  },
  {
    /* The cash a captain collected on trips 1–10 June. The platform's share of
       a cash fare is receivable from the captain, so this is the fare-capture
       recipe with `ar.driver` standing in for `cash.gateway`. §3 gives no GL
       recipe for a cash report; this is the smallest extension of one it does
       give, and it is flagged in the handoff. */
    id: 'JE-00006',
    postedAt: '2026-06-10T18:00:00+03:00',
    type: 'cash_report_debt',
    reference: 'cash_debt|DRV-0103|2026-06-01..10',
    lines: [dr('ar.driver', 12_400), cr('revenue.fares', 10_783), cr('tax.vat_output', 1_617)],
    totalHalalas: 12_400,
    meta: { captainId: 'DRV-0103', reports: '9' },
  },
  {
    id: 'JE-00007',
    postedAt: '2026-06-12T08:00:00+03:00',
    type: 'escrow_hold',
    reference: 'escrow_hold|ESC-1052',
    lines: [dr('cash.gateway', 32_960), cr('liability.escrow', 32_960)],
    totalHalalas: 32_960,
    meta: { escrowId: 'ESC-1052', subscriptionId: 'SUB-1052' },
  },
  {
    id: 'JE-00008',
    postedAt: '2026-06-13T10:20:00+03:00',
    type: 'wallet_credit',
    reference: 'wallet_credit|RDR-4001|5000|goodwill',
    lines: [dr('expense.goodwill', 5_000), cr('liability.wallet', 5_000)],
    totalHalalas: 5_000,
    meta: { riderId: 'RDR-4001', reasonCode: 'CAP_LATE', actorId: 'USR-3' },
  },
  {
    id: 'JE-00009',
    postedAt: '2026-06-15T23:59:00+03:00',
    type: 'driver_accrual',
    reference: 'accrual|DRV-0101|2026-06-01..15',
    lines: [dr('expense.driver_pay', 64_000), cr('liability.driver', 64_000)],
    totalHalalas: 64_000,
    meta: { captainId: 'DRV-0101' },
  },
  {
    id: 'JE-00010',
    postedAt: '2026-06-15T23:59:00+03:00',
    type: 'driver_accrual',
    reference: 'accrual|DRV-0102|2026-06-01..15',
    lines: [dr('expense.driver_pay', 82_000), cr('liability.driver', 82_000)],
    totalHalalas: 82_000,
    meta: { captainId: 'DRV-0102' },
  },
  {
    id: 'JE-00011',
    postedAt: '2026-06-15T23:59:00+03:00',
    type: 'driver_accrual',
    reference: 'accrual|DRV-0103|2026-06-01..15',
    lines: [dr('expense.driver_pay', 40_000), cr('liability.driver', 40_000)],
    totalHalalas: 40_000,
    meta: { captainId: 'DRV-0103' },
  },
  {
    id: 'JE-00012',
    postedAt: '2026-06-15T23:59:00+03:00',
    type: 'driver_accrual',
    reference: 'accrual|DRV-0104|2026-06-01..15',
    lines: [dr('expense.driver_pay', 90_000), cr('liability.driver', 90_000)],
    totalHalalas: 90_000,
    meta: { captainId: 'DRV-0104' },
  },
  {
    id: 'JE-00013',
    postedAt: '2026-06-15T23:59:00+03:00',
    type: 'driver_accrual',
    reference: 'accrual|DRV-0105|2026-06-01..15',
    lines: [dr('expense.driver_pay', 5_200), cr('liability.driver', 5_200)],
    totalHalalas: 5_200,
    meta: { captainId: 'DRV-0105' },
  },
  {
    id: 'JE-00014',
    postedAt: '2026-06-15T23:59:00+03:00',
    type: 'driver_accrual',
    reference: 'accrual|DRV-0201|2026-06-01..15',
    lines: [dr('expense.driver_pay', 66_217), cr('liability.driver', 66_217)],
    totalHalalas: 66_217,
    meta: { captainId: 'DRV-0201' },
  },
  {
    /* Wallet paying a fare. **Finding, kept because it is legacy's own
       recipe** (`:19997`): a wallet debit books the *gross* to `revenue.fares`
       with no VAT leg, while `fare_capture` splits the same money into net +
       VAT (`:20044`). A fare paid from a wallet therefore overstates net
       revenue by its VAT and understates output tax. See `JE-00042`, which
       splits the tender properly and is what a corrected recipe looks like. */
    id: 'JE-00015',
    postedAt: '2026-06-16T18:05:00+03:00',
    type: 'wallet_debit',
    reference: 'wallet_debit|RDR-4001|1500|TRP-9101',
    lines: [dr('liability.wallet', 1_500), cr('revenue.fares', 1_500)],
    totalHalalas: 1_500,
    meta: { riderId: 'RDR-4001', tripId: 'TRP-9101' },
  },
  {
    id: 'JE-00016',
    postedAt: '2026-06-18T09:30:00+03:00',
    type: 'wallet_credit',
    reference: 'wallet_credit|RDR-1041|2000|referral',
    lines: [dr('expense.goodwill', 2_000), cr('liability.wallet', 2_000)],
    totalHalalas: 2_000,
    meta: { riderId: 'RDR-1041', refereeId: 'RDR-1075', actorId: 'USR-3' },
  },
  {
    /* 73.50 gross → net 63.91 + VAT 9.59. */
    id: 'JE-00017',
    postedAt: '2026-06-18T14:10:00+03:00',
    type: 'refund',
    reference: 'refund|RDR-2055|7350|SUB-0987',
    lines: [dr('contra.refunds', 6_391), dr('tax.vat_output', 959), cr('cash.gateway', 7_350)],
    totalHalalas: 7_350,
    meta: { refundId: 'REF-0001', riderId: 'RDR-2055', destination: 'instrument' },
  },
  {
    id: 'JE-00018',
    postedAt: '2026-06-19T06:30:00+03:00',
    type: 'emergency_cover',
    reference: 'emergency_accept|EMG-0004|pay',
    lines: [dr('expense.emergency', 4_000), cr('liability.driver', 4_000)],
    totalHalalas: 4_000,
    meta: { dispatchId: 'EMG-0004', captainId: 'DRV-0106' },
  },
  {
    id: 'JE-00019',
    postedAt: '2026-06-19T06:31:00+03:00',
    type: 'emergency_recovery',
    reference: 'emergency_accept|EMG-0004|recover',
    lines: [dr('liability.driver', 1_500), cr('expense.emergency', 1_500)],
    totalHalalas: 1_500,
    meta: { dispatchId: 'EMG-0004', captainId: 'DRV-0202' },
  },
  {
    id: 'JE-00020',
    postedAt: '2026-06-19T08:12:00+03:00',
    type: 'wallet_debit',
    reference: 'wallet_debit|RDR-1041|640|TRP-7741',
    lines: [dr('liability.wallet', 640), cr('revenue.fares', 640)],
    totalHalalas: 640,
    meta: { riderId: 'RDR-1041', tripId: 'TRP-7741' },
  },
  {
    id: 'JE-00021',
    postedAt: '2026-06-19T10:52:00+03:00',
    type: 'wallet_credit',
    reference: 'wallet_credit|RDR-2087|1730|compensation',
    lines: [dr('expense.compensation', 1_730), cr('liability.wallet', 1_730)],
    totalHalalas: 1_730,
    meta: { riderId: 'RDR-2087', reasonCode: 'CAP_NOSHOW', actorId: 'USR-2' },
  },
  {
    /* The mirror image of JE-00020's lines. Same accounts, directions flipped,
       amount **copied** rather than recomputed, so the net effect is exactly
       zero and cannot drift by a halala (§3.4a). */
    id: 'JE-00022',
    postedAt: '2026-06-19T11:47:00+03:00',
    type: 'reversal',
    reference: 'reverse|WTX-0003',
    lines: [dr('revenue.fares', 640), cr('liability.wallet', 640)],
    totalHalalas: 640,
    meta: { reverses: 'JE-00020', postingId: 'WTX-0003', actorId: 'USR-2' },
  },
  {
    /* 69.20 gross → net 60.17 + VAT 9.03. */
    id: 'JE-00023',
    postedAt: '2026-06-19T15:00:00+03:00',
    type: 'refund',
    reference: 'refund|RDR-2087|6920|SUB-0998',
    lines: [dr('contra.refunds', 6_017), dr('tax.vat_output', 903), cr('cash.gateway', 6_920)],
    totalHalalas: 6_920,
    meta: { refundId: 'REF-0002', riderId: 'RDR-2087', destination: 'instrument' },
  },
  {
    id: 'JE-00024',
    postedAt: '2026-06-20T10:00:00+03:00',
    type: 'payout',
    reference: 'payout|PO-0001',
    lines: [dr('liability.driver', 90_000), cr('cash.gateway', 90_000)],
    totalHalalas: 90_000,
    meta: { payoutId: 'PO-0001', captainId: 'DRV-0104', actorId: 'USR-2' },
  },
  {
    id: 'JE-00025',
    postedAt: '2026-06-21T08:00:00+03:00',
    type: 'escrow_hold',
    reference: 'escrow_hold|ESC-1075',
    lines: [dr('cash.gateway', 6_920), cr('liability.escrow', 6_920)],
    totalHalalas: 6_920,
    meta: { escrowId: 'ESC-1075', subscriptionId: 'SUB-1075' },
  },
  {
    /* The release that gives `liability.escrow` a debit and `liability.driver`
       a credit — two accounts that have been declared and unposted since they
       were written (`12a` R11). */
    id: 'JE-00026',
    postedAt: '2026-06-21T09:00:00+03:00',
    type: 'escrow_release',
    reference: 'escrow_release|ESC-1060',
    lines: [dr('liability.escrow', 3_298), cr('liability.driver', 3_298)],
    totalHalalas: 3_298,
    meta: { escrowId: 'ESC-1060', captainId: 'DRV-0102', actorId: 'USR-2' },
  },
  {
    /* 40.00 gross → net 34.78 + VAT 5.22. Destination **wallet**, so the
       credit leg is `liability.wallet` and not `cash.gateway`. One refund, one
       destination — never both (`12a` R1, AC-337). */
    id: 'JE-00027',
    postedAt: '2026-06-22T11:30:00+03:00',
    type: 'refund',
    reference: 'refund|RDR-1090|4000|SERVICE_FAILURE',
    lines: [dr('contra.refunds', 3_478), dr('tax.vat_output', 522), cr('liability.wallet', 4_000)],
    totalHalalas: 4_000,
    meta: { refundId: 'REF-0003', riderId: 'RDR-1090', destination: 'wallet' },
  },
  {
    id: 'JE-00028',
    postedAt: '2026-06-22T20:00:00+03:00',
    type: 'cash_report_debt',
    reference: 'cash_debt|DRV-0206|CASH-0005',
    lines: [dr('ar.driver', 25_690), cr('revenue.fares', 22_339), cr('tax.vat_output', 3_351)],
    totalHalalas: 25_690,
    meta: { captainId: 'DRV-0206', reportId: 'CASH-0005' },
  },
  {
    /* Submitted, then rejected by the bank. The entry stays; the correction is
       a reversal the operator must raise, which is why AC-367's banner exists
       and why the row is not quietly deleted. */
    id: 'JE-00029',
    postedAt: '2026-06-23T11:00:00+03:00',
    type: 'payout',
    reference: 'payout|PO-0003',
    lines: [dr('liability.driver', 5_200), cr('cash.gateway', 5_200)],
    totalHalalas: 5_200,
    meta: { payoutId: 'PO-0003', captainId: 'DRV-0105', actorId: 'USR-2' },
  },
  {
    /* **The recipe §3.4c does not give.** A chargeback of a *wallet top-up*:
       the card capture that funded the wallet is clawed back, so the wallet
       must be debited and the balance goes negative — which is the −41.50
       outcome §3.4c itself asserts for RDR-4001. §3.4c's stated GL
       (`Dr ar.rider · Cr cash.gateway`) cannot produce that outcome, because it
       never touches `liability.wallet`.

       **Settled: the spec was missing a recipe, not describing the wrong one**
       (D-F23, AC-451). `Dr ar.rider · Cr cash.gateway` is correct for a **fare**
       chargeback and stays verbatim at `JE-00036`. This entry — the **top-up**
       chargeback — is now §3.4c **(c-ii)**, and it is the only recipe that
       yields RDR-4001's -41.50. **Both fixtures stay; neither was a defect.**

       §3.4c's *"the balance may go negative"* bullet belongs to (c-ii) and to
       this entry alone: a rider's balance **is** the `liability.wallet` balance,
       and a fare chargeback never touches it. */
    id: 'JE-00030',
    postedAt: '2026-06-23T14:32:00+03:00',
    type: 'chargeback_wallet',
    reference: 'chargeback|CBK-0001',
    lines: [dr('liability.wallet', 7_650), cr('cash.gateway', 7_650)],
    totalHalalas: 7_650,
    meta: { chargebackId: 'CBK-0001', riderId: 'RDR-4001' },
  },
  {
    /* 21.85 gross → net 19.00 + VAT 2.85. The one amount in this fixture where
       the VAT extraction is exact: 2185 is divisible by 23. */
    id: 'JE-00031',
    postedAt: '2026-06-24T06:35:00+03:00',
    type: 'fare_capture',
    reference: 'fare|TRP-7738',
    lines: [dr('cash.gateway', 2_185), cr('revenue.fares', 1_900), cr('tax.vat_output', 285)],
    totalHalalas: 2_185,
    meta: { tripId: 'TRP-7738' },
  },
  {
    id: 'JE-00032',
    postedAt: '2026-06-24T06:35:00+03:00',
    type: 'driver_accrual',
    reference: 'fare|TRP-7738|drv',
    lines: [dr('expense.driver_pay', 1_748), cr('liability.driver', 1_748)],
    totalHalalas: 1_748,
    meta: { tripId: 'TRP-7738', captainId: 'DRV-0103' },
  },
  {
    /* 4.37 commission → net 3.80 + VAT 0.57. Exact again: 437 = 19 × 23. */
    id: 'JE-00033',
    postedAt: '2026-06-24T06:40:00+03:00',
    type: 'cash_report_debt',
    reference: 'cash_debt|DRV-0103|CASH-0002',
    lines: [dr('ar.driver', 437), cr('revenue.fares', 380), cr('tax.vat_output', 57)],
    totalHalalas: 437,
    meta: { captainId: 'DRV-0103', reportId: 'CASH-0002' },
  },
  {
    /* 41.22 gross → net 35.84 + VAT 5.38. */
    id: 'JE-00034',
    postedAt: '2026-06-24T07:10:00+03:00',
    type: 'fare_capture',
    reference: 'fare|TRP-7735',
    lines: [dr('cash.gateway', 4_122), cr('revenue.fares', 3_584), cr('tax.vat_output', 538)],
    totalHalalas: 4_122,
    meta: { tripId: 'TRP-7735' },
  },
  {
    id: 'JE-00035',
    postedAt: '2026-06-24T07:10:00+03:00',
    type: 'driver_accrual',
    reference: 'fare|TRP-7735|drv',
    lines: [dr('expense.driver_pay', 3_298), cr('liability.driver', 3_298)],
    totalHalalas: 3_298,
    meta: { tripId: 'TRP-7735', captainId: 'DRV-0102' },
  },
  {
    id: 'JE-00036',
    postedAt: '2026-06-24T09:20:00+03:00',
    type: 'chargeback',
    reference: 'chargeback|CBK-0002',
    /* §3.4c verbatim, and `ar.rider`'s first posting since it was declared
       (`:19867`, `12a` G8). A chargeback **never reverses fare revenue**: the
       trip happened and the revenue was earned; we were simply not paid. */
    lines: [dr('ar.rider', 2_450), cr('cash.gateway', 2_450)],
    totalHalalas: 2_450,
    meta: { chargebackId: 'CBK-0002', riderId: 'RDR-2087', tripId: 'TRP-9012' },
  },
  {
    id: 'JE-00037',
    postedAt: '2026-06-24T12:00:00+03:00',
    type: 'payout',
    reference: 'payout|PO-0002',
    lines: [dr('liability.driver', 20_000), cr('cash.gateway', 20_000)],
    totalHalalas: 20_000,
    meta: { payoutId: 'PO-0002', captainId: 'DRV-0102', actorId: 'USR-2' },
  },
  {
    id: 'JE-00038',
    postedAt: '2026-06-24T15:30:00+03:00',
    type: 'reversal',
    reference: 'reverse|PAY-0102-4',
    lines: [dr('cash.gateway', 20_000), cr('liability.driver', 20_000)],
    totalHalalas: 20_000,
    meta: { reverses: 'JE-00037', postingId: 'PAY-0102-4', actorId: 'USR-2' },
  },
  {
    /* Reversing a reversal is legal and produces a third row (§3.4a). It is
       not an edit and not a re-instatement — the balance simply returns. */
    id: 'JE-00039',
    postedAt: '2026-06-24T17:00:00+03:00',
    type: 'reversal',
    reference: 'reverse|PAY-0102-5',
    lines: [dr('liability.driver', 20_000), cr('cash.gateway', 20_000)],
    totalHalalas: 20_000,
    meta: { reverses: 'JE-00038', postingId: 'PAY-0102-5', actorId: 'USR-1' },
  },
  {
    /* 60.00 commission → net 52.17 + VAT 7.83. */
    id: 'JE-00040',
    postedAt: '2026-06-24T21:00:00+03:00',
    type: 'cash_report_debt',
    reference: 'cash_debt|DRV-0206|CASH-0006',
    lines: [dr('ar.driver', 6_000), cr('revenue.fares', 5_217), cr('tax.vat_output', 783)],
    totalHalalas: 6_000,
    meta: { captainId: 'DRV-0206', reportId: 'CASH-0006' },
  },
  {
    /* The whole month's captured fares, as one batch. A real June has
       thousands of captures; enumerating them would make this file unreadable
       and would not make it more true. Trip-level captures below are the ones
       a source link has to resolve. */
    id: 'JE-00041',
    postedAt: '2026-06-24T23:59:00+03:00',
    type: 'fare_capture_batch',
    reference: 'fare_batch|2026-06-01..24',
    lines: [dr('cash.gateway', 380_000), cr('revenue.fares', 330_435), cr('tax.vat_output', 49_565)],
    totalHalalas: 380_000,
    meta: { trips: '4180', from: '2026-06-01', to: '2026-06-24' },
  },
  {
    /* **Split tender**, and the corrected shape of `JE-00015`: 30.00 from the
       rider's wallet and 8.00 from the card, one VAT split over the whole
       38.00. Two debit legs, one entry, still balanced. */
    id: 'JE-00042',
    postedAt: '2026-06-25T08:12:00+03:00',
    type: 'fare_capture',
    reference: 'fare|TRP-9008',
    lines: [
      dr('cash.gateway', 800),
      dr('liability.wallet', 3_000),
      cr('revenue.fares', 3_304),
      cr('tax.vat_output', 496),
    ],
    totalHalalas: 3_800,
    meta: { tripId: 'TRP-9008', tender: 'wallet+card' },
  },
  {
    id: 'JE-00043',
    postedAt: '2026-06-25T07:40:00+03:00',
    type: 'fare_capture',
    reference: 'fare|TRP-9005',
    /* 15.75 gross → net 13.70 + VAT 2.05. */
    lines: [dr('cash.gateway', 1_575), cr('revenue.fares', 1_370), cr('tax.vat_output', 205)],
    totalHalalas: 1_575,
    meta: { tripId: 'TRP-9005' },
  },
  {
    id: 'JE-00044',
    postedAt: '2026-06-25T07:40:00+03:00',
    type: 'driver_accrual',
    reference: 'fare|TRP-9005|drv',
    lines: [dr('expense.driver_pay', 1_260), cr('liability.driver', 1_260)],
    totalHalalas: 1_260,
    meta: { tripId: 'TRP-9005', captainId: 'DRV-0101' },
  },
  {
    /* 3.15 commission → net 2.74 + VAT 0.41. */
    id: 'JE-00045',
    postedAt: '2026-06-25T07:45:00+03:00',
    type: 'cash_report_debt',
    reference: 'cash_debt|DRV-0101|CASH-0003',
    lines: [dr('ar.driver', 315), cr('revenue.fares', 274), cr('tax.vat_output', 41)],
    totalHalalas: 315,
    meta: { captainId: 'DRV-0101', reportId: 'CASH-0003' },
  },
  {
    /* The captain took 20.00 in cash to top up a rider's wallet. The rider's
       wallet is credited and the captain owes us the cash. */
    id: 'JE-00046',
    postedAt: '2026-06-25T07:46:00+03:00',
    type: 'cash_topup',
    reference: 'cash_topup|CASH-0003',
    lines: [dr('ar.driver', 2_000), cr('liability.wallet', 2_000)],
    totalHalalas: 2_000,
    meta: { captainId: 'DRV-0101', riderId: 'RDR-2090', reportId: 'CASH-0003' },
  },
  {
    /* 29.40 gross → net 25.57 + VAT 3.83. */
    id: 'JE-00047',
    postedAt: '2026-06-25T07:55:00+03:00',
    type: 'fare_capture',
    reference: 'fare|TRP-7742',
    lines: [dr('cash.gateway', 2_940), cr('revenue.fares', 2_557), cr('tax.vat_output', 383)],
    totalHalalas: 2_940,
    meta: { tripId: 'TRP-7742' },
  },
  {
    id: 'JE-00048',
    postedAt: '2026-06-25T07:55:00+03:00',
    type: 'driver_accrual',
    reference: 'fare|TRP-7742|drv',
    lines: [dr('expense.driver_pay', 2_352), cr('liability.driver', 2_352)],
    totalHalalas: 2_352,
    meta: { tripId: 'TRP-7742', captainId: 'DRV-0103' },
  },
  {
    /* 5.88 commission → net 5.11 + VAT 0.77. */
    id: 'JE-00049',
    postedAt: '2026-06-25T08:00:00+03:00',
    type: 'cash_report_debt',
    reference: 'cash_debt|DRV-0103|CASH-0001',
    lines: [dr('ar.driver', 588), cr('revenue.fares', 511), cr('tax.vat_output', 77)],
    totalHalalas: 588,
    meta: { captainId: 'DRV-0103', reportId: 'CASH-0001' },
  },
  {
    /* 3.00 commission → net 2.61 + VAT 0.39. */
    id: 'JE-00050',
    postedAt: '2026-06-25T08:05:00+03:00',
    type: 'cash_report_debt',
    reference: 'cash_debt|DRV-0207|CASH-0004',
    lines: [dr('ar.driver', 300), cr('revenue.fares', 261), cr('tax.vat_output', 39)],
    totalHalalas: 300,
    meta: { captainId: 'DRV-0207', reportId: 'CASH-0004' },
  },
  {
    /* 7.60 commission → net 6.61 + VAT 0.99. */
    id: 'JE-00051',
    postedAt: '2026-06-25T08:10:00+03:00',
    type: 'cash_report_debt',
    reference: 'cash_debt|DRV-0104|CASH-0007',
    lines: [dr('ar.driver', 760), cr('revenue.fares', 661), cr('tax.vat_output', 99)],
    totalHalalas: 760,
    meta: { captainId: 'DRV-0104', reportId: 'CASH-0007' },
  },
  {
    /* An over-report: the captain handed in 12.00 more cash than the trip
       expected. Their receivable goes **negative** — Eyvar owes them — which
       is the captain AC-381 forbids dropping from the debt total. */
    id: 'JE-00052',
    postedAt: '2026-06-25T08:11:00+03:00',
    type: 'cash_surplus',
    reference: 'cash_surplus|CASH-0007',
    lines: [dr('cash.gateway', 1_200), cr('ar.driver', 1_200)],
    totalHalalas: 1_200,
    meta: { captainId: 'DRV-0104', reportId: 'CASH-0007' },
  },
  {
    id: 'JE-00053',
    postedAt: '2026-06-25T08:12:00+03:00',
    type: 'driver_accrual',
    reference: 'fare|TRP-9008|drv',
    lines: [dr('expense.driver_pay', 3_040), cr('liability.driver', 3_040)],
    totalHalalas: 3_040,
    meta: { tripId: 'TRP-9008', captainId: 'DRV-0104' },
  },
  {
    id: 'JE-00054',
    postedAt: '2026-06-25T08:30:00+03:00',
    type: 'deduction',
    reference: 'deduction|DED-03',
    lines: [dr('liability.driver', 2_000), cr('expense.driver_pay', 2_000)],
    totalHalalas: 2_000,
    meta: { deductionId: 'DED-03', captainId: 'DRV-0103', actorId: 'USR-2' },
  },
  {
    /* **Partial.** 50.00 against 134.25 outstanding, and the remaining 84.25
       stays visible. `commitCashRepayment` sets the debt to `0` by assignment
       with no amount field at all (`:12207`) and the modal copy calls that a
       feature (`:12197`) — D-F5, closed by AC-379. */
    id: 'JE-00055',
    postedAt: '2026-06-25T09:05:00+03:00',
    type: 'cash_repayment',
    reference: 'cash_repayment|REPAY-0001',
    lines: [dr('cash.gateway', 5_000), cr('ar.driver', 5_000)],
    totalHalalas: 5_000,
    meta: { captainId: 'DRV-0103', repaymentId: 'REPAY-0001', actorId: 'USR-2' },
  },

  /* == the five accounts the owner added, each with a real consumer =========
     **AC-415** puts every account on the trial balance whether or not it has
     moved, so these entries are not needed to make the accounts *appear*. They
     exist because an account with no posting is an account nobody has proved is
     postable — and because `givebackOperationalFixture` **retires here**: promo,
     referral and incentive stop being operational figures served beside the
     books and become GL balances inside them.

     **Every one of these credits `cash.gateway`**, and that is deliberate as
     well as convenient. Economically it is the true leg — a promo discount means
     the card was charged less than the fare; a referral reward and a captain
     incentive leave the bank. Structurally it is the only counter-leg with no
     subject ledger, so none of these entries can put a subject ledger out of
     step with its account balance, which `financials.test.ts` asserts for the
     six accounts that do have one.                                            */
  {
    /**
     * **`givebackOperationalFixture.promoHalalas`, now a GL balance.**
     *
     * A promo code is a discount at the point of payment: the fare is earned in
     * full, the gateway collects less, and the difference is a marketing cost.
     * Booking it to `expense.goodwill` — the only home the closed chart had —
     * conflated a marketing spend with a service-failure apology, which is why
     * §6.2 wanted them separate and why the contribution margin could not be
     * read off the trial balance.
     */
    id: 'JE-00056',
    postedAt: '2026-06-25T09:06:00+03:00',
    type: 'promo_credit',
    reference: 'promo|JUNE-RIDE20',
    lines: [dr('expense.promo', 8_400), cr('cash.gateway', 8_400)],
    totalHalalas: 8_400,
    meta: { campaignId: 'JUNE-RIDE20' },
  },
  {
    /** `givebackOperationalFixture.referralHalalas`, now a GL balance. */
    id: 'JE-00057',
    postedAt: '2026-06-25T09:06:30+03:00',
    type: 'referral_reward',
    reference: 'referral|JUNE-2026',
    lines: [dr('expense.referral', 3_000), cr('cash.gateway', 3_000)],
    totalHalalas: 3_000,
    meta: { programme: 'rider-referral' },
  },
  {
    /**
     * `givebackOperationalFixture.incentiveHalalas`, now a GL balance.
     *
     * Captain incentives — `DB.steerOffers` and the tier bonuses — are **not**
     * `expense.driver_pay`: driver pay is what a trip earned, and an incentive
     * is what we paid on top to move supply. A contribution margin that cannot
     * tell the two apart cannot answer whether steering was worth it.
     */
    id: 'JE-00058',
    postedAt: '2026-06-25T09:07:00+03:00',
    type: 'captain_incentive',
    reference: 'incentive|JUNE-2026',
    lines: [dr('expense.incentive', 6_500), cr('cash.gateway', 6_500)],
    totalHalalas: 6_500,
    meta: { programme: 'tier-bonus' },
  },
  {
    /**
     * The processor's cut on June's captures — money that left the gateway and
     * never was ours. **No tile reads it yet**, and that is not an oversight: an
     * account exists because money moves through it, and whether the overview
     * grows a line for it is product's call, not this fixture's.
     */
    id: 'JE-00059',
    postedAt: '2026-06-25T09:07:30+03:00',
    type: 'gateway_fee',
    reference: 'gateway_fee|2026-06',
    lines: [dr('expense.gateway_fees', 3_220), cr('cash.gateway', 3_220)],
    totalHalalas: 3_220,
    meta: { gateway: 'mada', period: '2026-06' },
  },
  {
    /**
     * **`equity.opening`'s first consumer, and the gap it closes.**
     *
     * `JE-00001` opens a rider's wallet as `Dr cash.gateway · Cr
     * liability.wallet` — correct, because that migration brought real money
     * with it. §3.4d's case is the other one: a balance migrated in with **no
     * cash behind it**, where the closed chart had nothing to put on the other
     * side. §3.3 declares an `opening` posting type and §3.6 Path 2 assumes
     * opening postings exist; neither could be honoured.
     *
     * This is the platform's opening cash position at migration. Its counter-leg
     * is equity rather than a liability, because nobody is owed it.
     */
    id: 'JE-00060',
    postedAt: '2026-06-01T00:00:00+03:00',
    type: 'opening_balance',
    reference: 'opening|platform|cash',
    lines: [dr('cash.gateway', 50_000), cr('equity.opening', 50_000)],
    totalHalalas: 50_000,
    meta: { migration: 'wallet-balances-2026-06', source: 'legacy-import' },
  },
  {
    /**
     * A corporate rider's plan invoiced on account in **May**, and voided in
     * June. The pair `JE-00061` / `JE-00062` exists to give `SettlementState`
     * its `voided` member a posting, and the two dates are deliberate:
     *
     *  - the raise sits **outside** `FINANCIALS_PERIOD` (June), so its
     *    `revenue.fares` credit cannot inflate `grossBookingsHalalas`, which
     *    `clients/financialsOverview.ts` reads as in-window **credits only**
     *    and AC-347 pins to `revenueByPlanFixtures`;
     *  - the void is a **debit** of the same accounts inside June, which that
     *    same credits-only read ignores.
     *
     * Net effect on every account, and on the trial balance, is exactly zero.
     * 86.50 gross → net 75.22 + VAT 11.28, the residual arithmetic every other
     * pair in this file uses.
     */
    id: 'JE-00063',
    postedAt: '2026-05-22T12:00:00+03:00',
    type: 'payout',
    reference: 'payout|PO-0007',
    lines: [dr('liability.driver', 30_000), cr('cash.gateway', 30_000)],
    totalHalalas: 30_000,
    meta: { captainId: 'DRV-0207', payoutId: 'PO-0007' },
  },
  {
    /**
     * The claw-back. `PO-0007` was released against a payable that was already
     * zero, so `liability.driver` went to −300.00 and this entry returns it.
     * The pair nets to zero on both accounts, which is what lets the payout
     * summary carry `state: 'reversed'` without moving the AC-348 total.
     */
    id: 'JE-00064',
    postedAt: '2026-05-24T10:15:00+03:00',
    type: 'payout_reversal',
    reference: 'payout_reversal|PO-0007',
    lines: [dr('cash.gateway', 30_000), cr('liability.driver', 30_000)],
    totalHalalas: 30_000,
    meta: { captainId: 'DRV-0207', payoutId: 'PO-0007' },
  },
  {
    id: 'JE-00061',
    postedAt: '2026-05-28T09:00:00+03:00',
    type: 'invoice_raised',
    reference: 'invoice|RDR-1045|EYV-2026-001180',
    lines: [dr('ar.rider', 8_650), cr('revenue.fares', 7_522), cr('tax.vat_output', 1_128)],
    totalHalalas: 8_650,
    meta: { riderId: 'RDR-1045', invoice: 'EYV-2026-001180' },
  },
  {
    /* The void. Same three accounts, opposite sides — see `JE-00061`. */
    id: 'JE-00062',
    postedAt: '2026-06-24T15:40:00+03:00',
    type: 'invoice_voided',
    reference: 'invoice_void|RDR-1045|EYV-2026-001180',
    lines: [dr('revenue.fares', 7_522), dr('tax.vat_output', 1_128), cr('ar.rider', 8_650)],
    totalHalalas: 8_650,
    meta: { riderId: 'RDR-1045', invoice: 'EYV-2026-001180' },
  },
]

/**
 * A migration entry whose two sides do not agree — the only way a trial
 * balance goes out of balance under this model, because `postLedger` refuses an
 * unbalanced entry at write time (`:19926`) and always has.
 *
 * Not in the default data: a trial balance that never balances makes AC-416's
 * happy path unreachable. Reached through `useOutOfBalanceLedger()` in
 * `clients/ledger.ts`, the same way `useQuietSafetyQueue()` reaches a quiet
 * safety queue. §14 asks for the state; this is where it lives.
 */
export const outOfBalanceEntryFixture: JournalEntry = {
  id: 'JE-90001',
  postedAt: '2026-06-02T03:00:00+03:00',
  type: 'opening_balance',
  reference: 'migration|2026-06-02|batch-7',
  lines: [dr('cash.gateway', 41_250), cr('liability.wallet', 40_000)],
  totalHalalas: 41_250,
  meta: { migration: 'batch-7', source: 'legacy-import' },
}

/**
 * Postings the ledger refused. Kept visible rather than dropped — the one thing
 * the legacy money module gets unambiguously right (`:19926`) and the one thing
 * this spec keeps unchanged.
 */
export const refusedPostingFixtures: RefusedPosting[] = [
  {
    reference: 'payout|PO-0004',
    type: 'payout',
    reason: {
      key: 'fin.refused.unbalanced',
      params: { debitsHalalas: 90_000, creditsHalalas: 89_000 },
    },
    attemptedAt: '2026-06-20T09:58:00+03:00',
    lines: [dr('liability.driver', 90_000), cr('cash.gateway', 89_000)],
  },
  {
    /**
     * **Re-targeted, and the trap is worth naming.**
     *
     * This row used to be refused for naming `expense.promo` — the account §6.2
     * needed and §3.8's closed chart did not have. **`expense.promo` is now a
     * valid key.** Left as it was, this fixture would either start refusing a
     * legitimate account or stop refusing at all, and **AC-455 depends on a
     * refusal existing**. So it names an account that is genuinely absent.
     *
     * `expense.marketing` is the right kind of absence: a plausible-sounding
     * cost line the chart deliberately does not carry, because campaign spend
     * outside the three giveback lines has no defined home. If it ever gains
     * one, this fixture needs re-targeting again — which is the point of a
     * refusal fixture and the reason this note is here.
     *
     * The invalid key rides in `reason.params` and not in `lines`, because
     * `AccountLine.account` is `AccountKey` and the type will not hold one. The
     * lines are the valid half of an attempt that was rejected whole.
     */
    reference: 'campaign_spend|CMP-0042|12000',
    type: 'campaign_spend',
    reason: { key: 'fin.refused.unknownAccount', params: { account: 'expense.marketing' } },
    attemptedAt: '2026-06-22T11:22:00+03:00',
    lines: [dr('expense.goodwill', 12_000), cr('cash.gateway', 12_000)],
  },

  /**
   * Ten more refusals, so the panel is a **log** rather than two examples.
   *
   * Two rows could not page, could not be sorted by date and — the part that
   * matters — could not show a *pattern*. A refusal log's whole value is that
   * the same integration fails the same way forty times in a week; with two
   * rows an operator cannot tell a one-off from a broken caller, which is the
   * only question the panel answers.
   *
   * Both reasons alternate, and every unbalanced row is genuinely unbalanced:
   * `debits !== credits` in `reason.params` **and** in `lines`, so a screen
   * that renders the arithmetic is rendering the refusal rather than repeating
   * a claim about it. `postLedger` refuses these at write time (`:19926`),
   * which is the one thing the legacy money module gets unambiguously right.
   */
  ...Array.from({ length: 10 }, (_, i) => {
    const unbalanced = i % 2 === 0
    const debits = 5_000 + i * 1_450
    const credits = debits - (100 + i * 25)
    const day = String(8 + i).padStart(2, '0')
    const attemptedAt = `2026-06-${day}T${String(9 + (i % 9)).padStart(2, '0')}:${String((i * 13) % 60).padStart(2, '0')}:00+03:00`
    return unbalanced
      ? {
          reference: `payout|PO-1${String(100 + i).padStart(3, '0')}`,
          type: 'payout',
          reason: {
            key: 'fin.refused.unbalanced',
            params: { debitsHalalas: debits, creditsHalalas: credits },
          },
          attemptedAt,
          lines: [dr('liability.driver', debits), cr('cash.gateway', credits)],
        }
      : {
          reference: `adjustment|ADJ-${String(400 + i)}`,
          type: 'adjustment',
          /* Accounts a caller keeps reaching for and the chart does not carry.
             Each is a plausible cost line with no defined home — the same kind
             of absence `expense.marketing` is above, and the same signal: an
             integration written against a chart nobody read. */
          reason: {
            key: 'fin.refused.unknownAccount',
            params: {
              account: cycle(
                ['expense.fuel_subsidy', 'expense.training', 'liability.tips', 'revenue.subscriptions'],
                i,
              ),
            },
          },
          attemptedAt,
          lines: [dr('expense.goodwill', debits), cr('cash.gateway', debits)],
        }
  }),
]

/* ───────────────────── subject-ledger postings ──────────────── */

/**
 * Shorthand so a posting row fits on a screen and the fields that vary between
 * rows are the ones you can see. Everything defaulted here is the common case
 * and every row that differs states it.
 */
function posting(p: {
  id: string
  subjectAccount: LedgerPosting['subjectAccount']
  subjectId: string | null
  postedAt: string
  direction: LedgerPosting['direction']
  amountHalalas: number
  descriptionKey: string
  descriptionParams?: Record<string, string | number>
  reference?: string | null
  sourceType: LedgerPosting['sourceType']
  sourceId?: string | null
  kind?: LedgerPosting['kind']
  reversesPostingId?: string | null
  reversedByPostingId?: string | null
  settlement?: LedgerPosting['settlement']
  balanceAfterHalalas: number | null
  journalEntryId: string | null
  actorId?: string | null
  reasonCode?: string | null
}): LedgerPosting {
  return {
    id: p.id,
    subjectAccount: p.subjectAccount,
    subjectId: p.subjectId,
    postedAt: p.postedAt,
    direction: p.direction,
    amountHalalas: p.amountHalalas,
    description: p.descriptionParams
      ? { key: p.descriptionKey, params: p.descriptionParams }
      : { key: p.descriptionKey },
    reference: p.reference ?? null,
    sourceType: p.sourceType,
    sourceId: p.sourceId ?? null,
    kind: p.kind ?? 'primary',
    reversesPostingId: p.reversesPostingId ?? null,
    reversedByPostingId: p.reversedByPostingId ?? null,
    settlement: p.settlement ?? 'settled',
    balanceAfterHalalas: p.balanceAfterHalalas,
    journalEntryId: p.journalEntryId,
    actorId: p.actorId ?? null,
    reasonCode: p.reasonCode ?? null,
  }
}

/**
 * Every subject-ledger row, oldest-first within each subject.
 *
 * `clients/*.ts` filter this array by `subjectAccount` + `subjectId`; there is
 * no per-subject array, because a server has one postings table and a screen
 * that works against six arrays will not work against one endpoint.
 */
export const ledgerPostingFixtures: LedgerPosting[] = [
  /* ══ liability.wallet — RDR-1075 · Sara Al-Ghamdi ═══════════════════════
     One migrated opening row and nothing else. Its source document does not
     exist, which makes it §3.6's **Path 2** case: the reversal cannot start
     from a source link and has to be raised from the page-level action. */
  posting({
    id: 'WTX-1075-1',
    subjectAccount: 'liability.wallet',
    subjectId: 'RDR-1075',
    postedAt: '2026-06-01T00:00:00+03:00',
    direction: 'credit',
    amountHalalas: 1_000,
    descriptionKey: 'fin.posting.openingBalance',
    sourceType: 'opening',
    sourceId: null,
    balanceAfterHalalas: 1_000,
    journalEntryId: 'JE-00001',
  }),

  /* ══ liability.wallet — RDR-2031 · Tariq Al-Saud ════════════════════════
     Closes at zero **with history**. That is the *filtered-to-zero* empty
     state, not the first-run one — a wallet with history filtered to a date
     range containing nothing gets one grey sentence and a clear-filters
     action, never the illustration (§7.1, AC-427). RDR-2055's ledger below is
     the other kind. */
  posting({
    id: 'WTX-2031-1',
    subjectAccount: 'liability.wallet',
    subjectId: 'RDR-2031',
    postedAt: '2026-06-05T09:00:00+03:00',
    direction: 'credit',
    amountHalalas: 3_000,
    descriptionKey: 'fin.posting.promoCredit',
    reference: 'WTX-2031-1',
    sourceType: 'adjustment',
    sourceId: null,
    kind: 'adjustment',
    reasonCode: 'BKG_NO_SUPPLY',
    actorId: 'USR-3',
    balanceAfterHalalas: 3_000,
    journalEntryId: 'JE-00004',
  }),
  posting({
    id: 'WTX-2031-2',
    subjectAccount: 'liability.wallet',
    subjectId: 'RDR-2031',
    postedAt: '2026-06-25T08:12:00+03:00',
    direction: 'debit',
    amountHalalas: 3_000,
    descriptionKey: 'fin.posting.tripFarePart',
    descriptionParams: { tripId: 'TRP-9008' },
    reference: 'WTX-2031-2',
    sourceType: 'trip',
    sourceId: 'TRP-9008',
    balanceAfterHalalas: 0,
    journalEntryId: 'JE-00042',
  }),

  /* ══ liability.wallet — RDR-4001 · Abdulaziz Al-Suwailem ════════════════
     Ends at −41.50. Whether that blocks a booking is **Q-F6 / foundation Q9**,
     still unanswered; the ledger states the balance and takes no position. */
  posting({
    id: 'WTX-4001-1',
    subjectAccount: 'liability.wallet',
    subjectId: 'RDR-4001',
    postedAt: '2026-06-13T10:20:00+03:00',
    direction: 'credit',
    amountHalalas: 5_000,
    descriptionKey: 'fin.posting.goodwillCredit',
    reference: 'WTX-4001-1',
    sourceType: 'adjustment',
    sourceId: null,
    kind: 'adjustment',
    reasonCode: 'CAP_LATE',
    actorId: 'USR-3',
    balanceAfterHalalas: 5_000,
    journalEntryId: 'JE-00008',
  }),
  posting({
    id: 'WTX-4001-2',
    subjectAccount: 'liability.wallet',
    subjectId: 'RDR-4001',
    postedAt: '2026-06-16T18:05:00+03:00',
    direction: 'debit',
    amountHalalas: 1_500,
    descriptionKey: 'fin.posting.tripFare',
    descriptionParams: { tripId: 'TRP-9101' },
    reference: 'WTX-4001-2',
    sourceType: 'trip',
    sourceId: 'TRP-9101',
    balanceAfterHalalas: 3_500,
    journalEntryId: 'JE-00015',
  }),
  posting({
    id: 'WTX-4001-3',
    subjectAccount: 'liability.wallet',
    subjectId: 'RDR-4001',
    postedAt: '2026-06-23T14:32:00+03:00',
    direction: 'debit',
    amountHalalas: 7_650,
    descriptionKey: 'fin.posting.chargeback',
    descriptionParams: { reference: 'CBK-0001' },
    reference: 'CBK-0001',
    sourceType: 'chargeback',
    sourceId: 'CBK-0001',
    /* `reversesPostingId` stays null. A chargeback is not a correction — the
       money left and we did not decide it (§3.4c). */
    kind: 'chargeback',
    balanceAfterHalalas: -4_150,
    journalEntryId: 'JE-00030',
  }),

  /* ══ liability.wallet — RDR-1041 · Nora Al-Harbi ════════════════════════
     `DESIGN.md` §8.3.3's wireframe, posting for posting.

     **Two departures from the wireframe, both deliberate.**

     1. The wireframe dates these 18–20 **July** — three weeks *after*
        `EYVAR_NOW` (25 Jun 2026). It inherits that from the legacy referral
        log, which is seeded `'18 Jul 09:30'` (`:13888`) against an app whose
        today is 25 June. A future-dated posting in the current period is a
        defect a period selector will surface immediately, so these are June.
     2. The wireframe's header reads `Pending 0.00 SAR` while its own
        `WTX-0005` row is 120.00 authorised and excluded from the balance. The
        two cannot both be right. `pendingHalalas` here is 12,000. */
  posting({
    id: 'WTX-0002',
    subjectAccount: 'liability.wallet',
    subjectId: 'RDR-1041',
    postedAt: '2026-06-18T09:30:00+03:00',
    direction: 'credit',
    amountHalalas: 2_000,
    descriptionKey: 'fin.posting.referralBonus',
    descriptionParams: { refereeName: 'Sara Al-Ghamdi' },
    reference: 'WTX-0002',
    sourceType: 'adjustment',
    sourceId: null,
    kind: 'adjustment',
    reasonCode: 'BKG_CAPTAIN_PREF',
    actorId: 'USR-3',
    balanceAfterHalalas: 2_000,
    journalEntryId: 'JE-00016',
  }),
  posting({
    id: 'WTX-0003',
    subjectAccount: 'liability.wallet',
    subjectId: 'RDR-1041',
    postedAt: '2026-06-19T08:12:00+03:00',
    direction: 'debit',
    amountHalalas: 640,
    descriptionKey: 'fin.posting.tripFare',
    descriptionParams: { tripId: 'TRP-7741' },
    reference: 'WTX-0003',
    sourceType: 'trip',
    sourceId: 'TRP-7741',
    /* Reversed — and it keeps its amount, its column, its balance-after and
       its place in posting order (AC-328). Only these two fields changed. */
    settlement: 'reversed',
    reversedByPostingId: 'WTX-0004',
    balanceAfterHalalas: 1_360,
    journalEntryId: 'JE-00020',
  }),
  posting({
    id: 'WTX-0004',
    subjectAccount: 'liability.wallet',
    subjectId: 'RDR-1041',
    postedAt: '2026-06-19T11:47:00+03:00',
    direction: 'credit',
    amountHalalas: 640,
    descriptionKey: 'fin.posting.reverses',
    descriptionParams: { reference: 'WTX-0003' },
    reference: 'WTX-0004',
    sourceType: 'reversal',
    sourceId: 'WTX-0003',
    kind: 'reversal',
    reversesPostingId: 'WTX-0003',
    reasonCode: 'PAY_INCORRECT_CHARGE',
    actorId: 'USR-2',
    balanceAfterHalalas: 2_000,
    journalEntryId: 'JE-00022',
  }),
  posting({
    id: 'WTX-0005',
    subjectAccount: 'liability.wallet',
    subjectId: 'RDR-1041',
    postedAt: '2026-06-20T07:05:00+03:00',
    direction: 'credit',
    amountHalalas: 12_000,
    descriptionKey: 'fin.posting.subscriptionAuthorised',
    reference: 'AUTH-6120',
    /* No captured payment yet, so no source document and **no journal entry**:
       an authorisation moved no money. This is why `journalEntryId` is
       nullable and why `sourceId` is (AC-312, §3.3). */
    sourceType: 'payment',
    sourceId: null,
    settlement: 'authorised',
    balanceAfterHalalas: null,
    journalEntryId: null,
  }),

  /* ══ liability.wallet — RDR-1044 · Fatimah Al-Qurashi ══════════════════
     **`pending`.** A card top-up submitted forty minutes ago and not yet
     confirmed by the gateway. Like `reconciling` it is in
     `PENDING_SETTLEMENTS`, so `balanceAfterHalalas` is `null`, no journal entry
     exists, and the wallet's closing balance stays at 0.00 while the index row
     shows 42.00 on the `Pending` line beside it.

     That divergence is the entire point of AC-312, and it was untestable: every
     wallet in the set was either settled or empty, so the `Pending` line had no
     data and the "balance excludes pending" rule had never been exercised. */
  posting({
    id: 'WTX-1044-1',
    subjectAccount: 'liability.wallet',
    subjectId: 'RDR-1044',
    postedAt: '2026-06-25T08:34:00+03:00',
    direction: 'credit',
    amountHalalas: 4_200,
    descriptionKey: 'fin.posting.walletTopup',
    reference: 'TOP-4412',
    sourceType: 'payment',
    sourceId: null,
    settlement: 'pending',
    balanceAfterHalalas: null,
    journalEntryId: null,
  }),

  /* ══ liability.wallet — RDR-2087 · Layla Al-Faraj ═══════════════════════ */
  posting({
    id: 'WTX-2087-1',
    subjectAccount: 'liability.wallet',
    subjectId: 'RDR-2087',
    postedAt: '2026-06-19T10:52:00+03:00',
    direction: 'credit',
    amountHalalas: 1_730,
    descriptionKey: 'fin.posting.compensationCredit',
    reference: 'WTX-2087-1',
    sourceType: 'adjustment',
    sourceId: null,
    kind: 'adjustment',
    reasonCode: 'CAP_NOSHOW',
    actorId: 'USR-2',
    balanceAfterHalalas: 1_730,
    journalEntryId: 'JE-00021',
  }),

  /* ══ liability.wallet — RDR-1090 · Reem Al-Dosari ═══════════════════════
     A refund that landed in the **wallet** rather than the instrument. One
     destination, never both. */
  posting({
    id: 'WTX-1090-1',
    subjectAccount: 'liability.wallet',
    subjectId: 'RDR-1090',
    postedAt: '2026-06-22T11:30:00+03:00',
    direction: 'credit',
    amountHalalas: 4_000,
    descriptionKey: 'fin.posting.refundToWallet',
    descriptionParams: { reference: 'REF-0003' },
    reference: 'REF-0003',
    sourceType: 'refund',
    sourceId: 'REF-0003',
    kind: 'refund',
    reasonCode: 'PAY_REFUND_REQ',
    actorId: 'USR-3',
    balanceAfterHalalas: 4_000,
    journalEntryId: 'JE-00027',
  }),

  /* ══ liability.wallet — RDR-2090 · Hessa Al-Mutlaq ══════════════════════
     A top-up the captain collected in cash. The rider's wallet goes up; the
     captain's receivable goes up by the same amount (`ar.driver`, below). */
  posting({
    id: 'WTX-2090-1',
    subjectAccount: 'liability.wallet',
    subjectId: 'RDR-2090',
    postedAt: '2026-06-25T07:46:00+03:00',
    direction: 'credit',
    amountHalalas: 2_000,
    descriptionKey: 'fin.posting.cashTopup',
    descriptionParams: { captainName: 'Ahmed Salem' },
    reference: 'CASH-0003',
    sourceType: 'cash-report',
    sourceId: 'CASH-0003',
    balanceAfterHalalas: 2_000,
    journalEntryId: 'JE-00046',
  }),

  /* ══ ar.rider — RDR-2087 ════════════════════════════════════════════════
     The account's **first posting since it was declared** (`:19867`). A
     chargeback of a captured fare: the bank took the money back, so the rider
     owes it. Fare revenue is untouched — the trip happened. */
  posting({
    id: 'ARR-2087-1',
    subjectAccount: 'ar.rider',
    subjectId: 'RDR-2087',
    postedAt: '2026-06-24T09:20:00+03:00',
    direction: 'debit',
    amountHalalas: 2_450,
    descriptionKey: 'fin.posting.chargebackReceivable',
    descriptionParams: { tripId: 'TRP-9012' },
    reference: 'CBK-0002',
    sourceType: 'chargeback',
    sourceId: 'CBK-0002',
    kind: 'chargeback',
    balanceAfterHalalas: 2_450,
    journalEntryId: 'JE-00036',
  }),

  /* ══ ar.rider — RDR-1045 · Youssef Abdelrahman El-Sayed Farag ═══════════
     **`voided`.** A plan invoiced on account in May and cancelled before it was
     ever paid: the receivable is raised, then written back in full. Both legs
     are real journal entries (`JE-00061`, `JE-00062`) and the pair nets to zero
     on every account it touches, which is why adding it disturbs no
     cross-screen total.

     `voided` is **not** in `PENDING_SETTLEMENTS`, so both rows carry a real
     `balanceAfterHalalas` and the chain closes back at zero.

     **A finding for whoever owns `types/ledger.ts`, raised here because this is
     the row that exposes it.** `PENDING_SETTLEMENTS` excludes `authorised` but
     includes `voided`. An authorisation that is later voided therefore moves
     from *outside* the balance to *inside* it, and the void adds money to a
     balance the authorisation never contributed to. That is unreachable in this
     fixture only because the void modelled here is of an **invoice**, which was
     inside the balance to begin with. A voided *authorisation* has no
     representable shape today. */
  posting({
    id: 'ARR-1045-1',
    subjectAccount: 'ar.rider',
    subjectId: 'RDR-1045',
    postedAt: '2026-05-28T09:00:00+03:00',
    direction: 'debit',
    amountHalalas: 8_650,
    descriptionKey: 'fin.posting.invoiceRaised',
    descriptionParams: { reference: 'EYV-2026-001180' },
    reference: 'EYV-2026-001180',
    sourceType: 'payment',
    sourceId: null,
    balanceAfterHalalas: 8_650,
    journalEntryId: 'JE-00061',
  }),
  posting({
    id: 'ARR-1045-2',
    subjectAccount: 'ar.rider',
    subjectId: 'RDR-1045',
    postedAt: '2026-06-24T15:40:00+03:00',
    direction: 'credit',
    amountHalalas: 8_650,
    descriptionKey: 'fin.posting.invoiceVoided',
    descriptionParams: { reference: 'EYV-2026-001180' },
    reference: 'EYV-2026-001180',
    sourceType: 'adjustment',
    sourceId: null,
    kind: 'adjustment',
    reasonCode: 'PAY_INCORRECT_CHARGE',
    actorId: 'USR-2',
    settlement: 'voided',
    balanceAfterHalalas: 0,
    journalEntryId: 'JE-00062',
  }),

  /* ══ ar.rider — RDR-1046 · Noura Al-Harbi ═══════════════════════════════
     **`reconciling`.** The gateway has confirmed the capture and the settlement
     file has not been matched to it yet — the state between `authorised` and
     `settled` that a payments operator spends most of their day in, and that
     nothing seeded.

     `reconciling` **is** in `PENDING_SETTLEMENTS`, so: `balanceAfterHalalas` is
     `null` (AC-312), the row is excluded from the running balance and from the
     subject-ledger-versus-GL agreement, and it has **no journal entry** —
     nothing has moved yet. It shows in the separate `Pending` line beneath the
     card-header balance, never inside it. */
  posting({
    id: 'ARR-1046-1',
    subjectAccount: 'ar.rider',
    subjectId: 'RDR-1046',
    postedAt: '2026-06-25T07:40:00+03:00',
    direction: 'debit',
    amountHalalas: 4_200,
    descriptionKey: 'fin.posting.gatewaySettlementPending',
    descriptionParams: { reference: 'STL-2026-06-25-A' },
    reference: 'STL-2026-06-25-A',
    sourceType: 'payment',
    sourceId: null,
    settlement: 'reconciling',
    balanceAfterHalalas: null,
    journalEntryId: null,
  }),

  /* ══ ar.driver — DRV-0103 · Khalid Mansour ══════════════════════════════
     The account that replaces `DB.driverCashDebt` (`:12081`). Note the sign:
     on a debit-normal account, **debt is positive**. Legacy stores it negative
     and every reader negates it (`:12190`, `:12240`, `:14300`). */
  posting({
    id: 'ARD-0103-1',
    subjectAccount: 'ar.driver',
    subjectId: 'DRV-0103',
    postedAt: '2026-06-10T18:00:00+03:00',
    direction: 'debit',
    amountHalalas: 12_400,
    descriptionKey: 'fin.posting.cashCommissionBatch',
    descriptionParams: { reports: 9 },
    reference: 'ARD-0103-1',
    sourceType: 'cash-report',
    sourceId: null,
    balanceAfterHalalas: 12_400,
    journalEntryId: 'JE-00006',
  }),
  posting({
    id: 'ARD-0103-2',
    subjectAccount: 'ar.driver',
    subjectId: 'DRV-0103',
    postedAt: '2026-06-24T06:40:00+03:00',
    direction: 'debit',
    amountHalalas: 437,
    descriptionKey: 'fin.posting.cashCommission',
    descriptionParams: { tripId: 'TRP-7738' },
    reference: 'CASH-0002',
    sourceType: 'cash-report',
    sourceId: 'CASH-0002',
    /**
     * **`escalated` — and this is where it belongs, not on a row invented for
     * it.** `CASH-0002` is already `status: 'escalated'` in
     * `fixtures/financials.ts`: a captain who never reported, twice, referred
     * to Trust & Safety. The posting stayed `settled` while the document it
     * sources said otherwise, so the two disagreed about the same event.
     *
     * It is one of only **two** states `SETTLEMENT_BADGE_TONE` returns `null`
     * for — R5 leaves no red badge, so `failed` and `escalated` owe the
     * three-part R5a critical treatment instead of a sixth tone — and `failed`
     * was the only one of the two any row reached. The critical row treatment
     * was therefore half-testable.
     *
     * `escalated` is **not** in `PENDING_SETTLEMENTS`, so the amount stays
     * inside the balance and the running chain is untouched. The money is
     * owed; who is chasing it is the part that escalated.
     */
    settlement: 'escalated',
    balanceAfterHalalas: 12_837,
    journalEntryId: 'JE-00033',
  }),
  posting({
    id: 'ARD-0103-3',
    subjectAccount: 'ar.driver',
    subjectId: 'DRV-0103',
    postedAt: '2026-06-25T08:00:00+03:00',
    direction: 'debit',
    amountHalalas: 588,
    descriptionKey: 'fin.posting.cashCommission',
    descriptionParams: { tripId: 'TRP-7742' },
    reference: 'CASH-0001',
    sourceType: 'cash-report',
    sourceId: 'CASH-0001',
    balanceAfterHalalas: 13_425,
    journalEntryId: 'JE-00049',
  }),
  posting({
    id: 'ARD-0103-4',
    subjectAccount: 'ar.driver',
    subjectId: 'DRV-0103',
    postedAt: '2026-06-25T09:05:00+03:00',
    direction: 'credit',
    amountHalalas: 5_000,
    descriptionKey: 'fin.posting.cashRepayment',
    reference: 'REPAY-0001',
    sourceType: 'cash-report',
    sourceId: 'REPAY-0001',
    actorId: 'USR-2',
    reasonCode: 'CAP_OFFPLATFORM_PAY',
    /* 84.25 still outstanding and still visible. */
    balanceAfterHalalas: 8_425,
    journalEntryId: 'JE-00055',
  }),

  /* ══ ar.driver — DRV-0101 · Ahmed Salem ═════════════════════════════════ */
  posting({
    id: 'ARD-0101-1',
    subjectAccount: 'ar.driver',
    subjectId: 'DRV-0101',
    postedAt: '2026-06-25T07:45:00+03:00',
    direction: 'debit',
    amountHalalas: 315,
    descriptionKey: 'fin.posting.cashCommission',
    descriptionParams: { tripId: 'TRP-9005' },
    reference: 'CASH-0003',
    sourceType: 'cash-report',
    sourceId: 'CASH-0003',
    balanceAfterHalalas: 315,
    journalEntryId: 'JE-00045',
  }),
  posting({
    id: 'ARD-0101-2',
    subjectAccount: 'ar.driver',
    subjectId: 'DRV-0101',
    postedAt: '2026-06-25T07:46:00+03:00',
    direction: 'debit',
    amountHalalas: 2_000,
    descriptionKey: 'fin.posting.cashTopupCollected',
    descriptionParams: { riderName: 'Hessa Al-Mutlaq' },
    reference: 'CASH-0003',
    sourceType: 'cash-report',
    sourceId: 'CASH-0003',
    balanceAfterHalalas: 2_315,
    journalEntryId: 'JE-00046',
  }),

  /* ══ ar.driver — DRV-0207 · Saud Al-Harbi ═══════════════════════════════ */
  posting({
    id: 'ARD-0207-1',
    subjectAccount: 'ar.driver',
    subjectId: 'DRV-0207',
    postedAt: '2026-06-25T08:05:00+03:00',
    direction: 'debit',
    amountHalalas: 300,
    descriptionKey: 'fin.posting.cashCommission',
    descriptionParams: { tripId: 'TRP-9101' },
    reference: 'CASH-0004',
    sourceType: 'cash-report',
    sourceId: 'CASH-0004',
    balanceAfterHalalas: 300,
    journalEntryId: 'JE-00050',
  }),

  /* ══ ar.driver — DRV-0206 · Ibrahim Diarra Coulibaly ════════════════════
     **Over the cap.** 316.90 against a 300.00 ceiling, so cash collection is
     suspended for this captain and the row carries the R5a leading edge. */
  posting({
    id: 'ARD-0206-1',
    subjectAccount: 'ar.driver',
    subjectId: 'DRV-0206',
    postedAt: '2026-06-22T20:00:00+03:00',
    direction: 'debit',
    amountHalalas: 25_690,
    descriptionKey: 'fin.posting.cashCommission',
    descriptionParams: { tripId: 'TRP-9102' },
    reference: 'CASH-0005',
    sourceType: 'cash-report',
    sourceId: 'CASH-0005',
    balanceAfterHalalas: 25_690,
    journalEntryId: 'JE-00028',
  }),
  posting({
    id: 'ARD-0206-2',
    subjectAccount: 'ar.driver',
    subjectId: 'DRV-0206',
    postedAt: '2026-06-24T21:00:00+03:00',
    direction: 'debit',
    amountHalalas: 6_000,
    descriptionKey: 'fin.posting.cashCommissionUnreported',
    reference: 'CASH-0006',
    sourceType: 'cash-report',
    sourceId: 'CASH-0006',
    balanceAfterHalalas: 31_690,
    journalEntryId: 'JE-00040',
  }),

  /* ══ ar.driver — DRV-0104 · Hassan Al-Ghamdi ════════════════════════════
     Ends **in credit**: Eyvar owes this captain 4.40. AC-381 exists because a
     total that only sums positives silently drops them. */
  posting({
    id: 'ARD-0104-1',
    subjectAccount: 'ar.driver',
    subjectId: 'DRV-0104',
    postedAt: '2026-06-25T08:10:00+03:00',
    direction: 'debit',
    amountHalalas: 760,
    descriptionKey: 'fin.posting.cashCommission',
    descriptionParams: { tripId: 'TRP-9008' },
    reference: 'CASH-0007',
    sourceType: 'cash-report',
    sourceId: 'CASH-0007',
    balanceAfterHalalas: 760,
    journalEntryId: 'JE-00051',
  }),
  posting({
    id: 'ARD-0104-2',
    subjectAccount: 'ar.driver',
    subjectId: 'DRV-0104',
    postedAt: '2026-06-25T08:11:00+03:00',
    direction: 'credit',
    amountHalalas: 1_200,
    descriptionKey: 'fin.posting.cashSurplus',
    reference: 'CASH-0007',
    sourceType: 'cash-report',
    sourceId: 'CASH-0007',
    balanceAfterHalalas: -440,
    journalEntryId: 'JE-00052',
  }),

  /* ══ liability.driver — DRV-0101 · Ahmed Salem ══════════════════════════ */
  posting({
    id: 'PAY-0101-1',
    subjectAccount: 'liability.driver',
    subjectId: 'DRV-0101',
    postedAt: '2026-06-15T23:59:00+03:00',
    direction: 'credit',
    amountHalalas: 64_000,
    descriptionKey: 'fin.posting.earningsAccrual',
    descriptionParams: { from: '2026-06-01', to: '2026-06-15' },
    reference: 'PAY-0101-1',
    sourceType: 'trip',
    sourceId: null,
    balanceAfterHalalas: 64_000,
    journalEntryId: 'JE-00009',
  }),
  posting({
    id: 'PAY-0101-2',
    subjectAccount: 'liability.driver',
    subjectId: 'DRV-0101',
    postedAt: '2026-06-25T07:40:00+03:00',
    direction: 'credit',
    amountHalalas: 1_260,
    descriptionKey: 'fin.posting.tripEarnings',
    descriptionParams: { tripId: 'TRP-9005' },
    reference: 'PAY-0101-2',
    sourceType: 'trip',
    sourceId: 'TRP-9005',
    balanceAfterHalalas: 65_260,
    journalEntryId: 'JE-00044',
  }),

  /* ══ liability.driver — DRV-0102 · Omar Farouk ══════════════════════════
     A payout, its reversal, and the reversal of that reversal. Three rows,
     none of them an edit, and the balance simply returns. */
  posting({
    id: 'PAY-0102-1',
    subjectAccount: 'liability.driver',
    subjectId: 'DRV-0102',
    postedAt: '2026-06-15T23:59:00+03:00',
    direction: 'credit',
    amountHalalas: 82_000,
    descriptionKey: 'fin.posting.earningsAccrual',
    descriptionParams: { from: '2026-06-01', to: '2026-06-15' },
    reference: 'PAY-0102-1',
    sourceType: 'trip',
    sourceId: null,
    balanceAfterHalalas: 82_000,
    journalEntryId: 'JE-00010',
  }),
  posting({
    id: 'PAY-0102-2',
    subjectAccount: 'liability.driver',
    subjectId: 'DRV-0102',
    postedAt: '2026-06-21T09:00:00+03:00',
    direction: 'credit',
    amountHalalas: 3_298,
    descriptionKey: 'fin.posting.escrowReleased',
    descriptionParams: { escrowId: 'ESC-1060' },
    reference: 'ESC-1060',
    sourceType: 'escrow',
    sourceId: 'ESC-1060',
    actorId: 'USR-2',
    balanceAfterHalalas: 85_298,
    journalEntryId: 'JE-00026',
  }),
  posting({
    id: 'PAY-0102-3',
    subjectAccount: 'liability.driver',
    subjectId: 'DRV-0102',
    postedAt: '2026-06-24T07:10:00+03:00',
    direction: 'credit',
    amountHalalas: 3_298,
    descriptionKey: 'fin.posting.tripEarnings',
    descriptionParams: { tripId: 'TRP-7735' },
    reference: 'PAY-0102-3',
    sourceType: 'trip',
    sourceId: 'TRP-7735',
    balanceAfterHalalas: 88_596,
    journalEntryId: 'JE-00035',
  }),
  posting({
    id: 'PAY-0102-4',
    subjectAccount: 'liability.driver',
    subjectId: 'DRV-0102',
    postedAt: '2026-06-24T12:00:00+03:00',
    direction: 'debit',
    amountHalalas: 20_000,
    descriptionKey: 'fin.posting.payout',
    descriptionParams: { reference: 'PO-0002' },
    reference: 'PO-0002',
    sourceType: 'payout',
    sourceId: 'PO-0002',
    settlement: 'reversed',
    reversedByPostingId: 'PAY-0102-5',
    actorId: 'USR-2',
    balanceAfterHalalas: 68_596,
    journalEntryId: 'JE-00037',
  }),
  posting({
    id: 'PAY-0102-5',
    subjectAccount: 'liability.driver',
    subjectId: 'DRV-0102',
    postedAt: '2026-06-24T15:30:00+03:00',
    direction: 'credit',
    amountHalalas: 20_000,
    descriptionKey: 'fin.posting.reverses',
    descriptionParams: { reference: 'PAY-0102-4' },
    reference: 'PAY-0102-5',
    sourceType: 'reversal',
    sourceId: 'PAY-0102-4',
    kind: 'reversal',
    reversesPostingId: 'PAY-0102-4',
    /* Itself reversed. A reversal is a posting like any other and may be
       reversed exactly once, like any other. */
    settlement: 'reversed',
    reversedByPostingId: 'PAY-0102-6',
    reasonCode: 'PAY_DECLINED',
    actorId: 'USR-2',
    balanceAfterHalalas: 88_596,
    journalEntryId: 'JE-00038',
  }),
  posting({
    id: 'PAY-0102-6',
    subjectAccount: 'liability.driver',
    subjectId: 'DRV-0102',
    postedAt: '2026-06-24T17:00:00+03:00',
    direction: 'debit',
    amountHalalas: 20_000,
    descriptionKey: 'fin.posting.reverses',
    descriptionParams: { reference: 'PAY-0102-5' },
    reference: 'PAY-0102-6',
    sourceType: 'reversal',
    sourceId: 'PAY-0102-5',
    kind: 'reversal',
    reversesPostingId: 'PAY-0102-5',
    reasonCode: 'PAY_INCORRECT_CHARGE',
    actorId: 'USR-1',
    balanceAfterHalalas: 68_596,
    journalEntryId: 'JE-00039',
  }),

  /* ══ liability.driver — DRV-0103 · Khalid Mansour ═══════════════════════ */
  posting({
    id: 'PAY-0103-1',
    subjectAccount: 'liability.driver',
    subjectId: 'DRV-0103',
    postedAt: '2026-06-15T23:59:00+03:00',
    direction: 'credit',
    amountHalalas: 40_000,
    descriptionKey: 'fin.posting.earningsAccrual',
    descriptionParams: { from: '2026-06-01', to: '2026-06-15' },
    reference: 'PAY-0103-1',
    sourceType: 'trip',
    sourceId: null,
    balanceAfterHalalas: 40_000,
    journalEntryId: 'JE-00011',
  }),
  posting({
    id: 'PAY-0103-2',
    subjectAccount: 'liability.driver',
    subjectId: 'DRV-0103',
    postedAt: '2026-06-24T06:35:00+03:00',
    direction: 'credit',
    amountHalalas: 1_748,
    descriptionKey: 'fin.posting.tripEarnings',
    descriptionParams: { tripId: 'TRP-7738' },
    reference: 'PAY-0103-2',
    sourceType: 'trip',
    sourceId: 'TRP-7738',
    balanceAfterHalalas: 41_748,
    journalEntryId: 'JE-00032',
  }),
  posting({
    id: 'PAY-0103-3',
    subjectAccount: 'liability.driver',
    subjectId: 'DRV-0103',
    postedAt: '2026-06-25T07:55:00+03:00',
    direction: 'credit',
    amountHalalas: 2_352,
    descriptionKey: 'fin.posting.tripEarnings',
    descriptionParams: { tripId: 'TRP-7742' },
    reference: 'PAY-0103-3',
    sourceType: 'trip',
    sourceId: 'TRP-7742',
    balanceAfterHalalas: 44_100,
    journalEntryId: 'JE-00048',
  }),
  posting({
    id: 'PAY-0103-4',
    subjectAccount: 'liability.driver',
    subjectId: 'DRV-0103',
    postedAt: '2026-06-25T08:30:00+03:00',
    direction: 'debit',
    amountHalalas: 2_000,
    descriptionKey: 'fin.posting.deductionApplied',
    descriptionParams: { reference: 'DED-03' },
    reference: 'DED-03',
    sourceType: 'deduction',
    sourceId: 'DED-03',
    actorId: 'USR-2',
    balanceAfterHalalas: 42_100,
    journalEntryId: 'JE-00054',
  }),

  /* ══ liability.driver — DRV-0104 · Hassan Al-Ghamdi ═════════════════════
     Paid in full on 20 June, then earned again. The payout is a **debit** and
     it decreases what Eyvar owes (AC-306); it never sets a balance by
     assignment, which `payDriver` does today (`pending = 0`, `:7030`). */
  posting({
    id: 'PAY-0104-1',
    subjectAccount: 'liability.driver',
    subjectId: 'DRV-0104',
    postedAt: '2026-06-15T23:59:00+03:00',
    direction: 'credit',
    amountHalalas: 90_000,
    descriptionKey: 'fin.posting.earningsAccrual',
    descriptionParams: { from: '2026-06-01', to: '2026-06-15' },
    reference: 'PAY-0104-1',
    sourceType: 'trip',
    sourceId: null,
    balanceAfterHalalas: 90_000,
    journalEntryId: 'JE-00012',
  }),
  posting({
    id: 'PAY-0104-2',
    subjectAccount: 'liability.driver',
    subjectId: 'DRV-0104',
    postedAt: '2026-06-20T10:00:00+03:00',
    direction: 'debit',
    amountHalalas: 90_000,
    descriptionKey: 'fin.posting.payout',
    descriptionParams: { reference: 'PO-0001' },
    reference: 'PO-0001',
    sourceType: 'payout',
    sourceId: 'PO-0001',
    actorId: 'USR-2',
    balanceAfterHalalas: 0,
    journalEntryId: 'JE-00024',
  }),
  posting({
    id: 'PAY-0104-3',
    subjectAccount: 'liability.driver',
    subjectId: 'DRV-0104',
    postedAt: '2026-06-25T08:12:00+03:00',
    direction: 'credit',
    amountHalalas: 3_040,
    descriptionKey: 'fin.posting.tripEarnings',
    descriptionParams: { tripId: 'TRP-9008' },
    reference: 'PAY-0104-3',
    sourceType: 'trip',
    sourceId: 'TRP-9008',
    balanceAfterHalalas: 3_040,
    journalEntryId: 'JE-00053',
  }),

  /* ══ liability.driver — DRV-0105 · Youssef Nouri ════════════════════════
     **The failed payout.** `failed` is not in `PENDING_SETTLEMENTS`, so the
     row is inside the balance and the payable reads 0.00 while Eyvar still
     owes 52.00. That is not an oversight — it is why AC-367's banner exists.
     The correction is a reversal the operator must raise; the ledger does not
     quietly undo it. */
  posting({
    id: 'PAY-0105-1',
    subjectAccount: 'liability.driver',
    subjectId: 'DRV-0105',
    postedAt: '2026-06-15T23:59:00+03:00',
    direction: 'credit',
    amountHalalas: 5_200,
    descriptionKey: 'fin.posting.earningsAccrual',
    descriptionParams: { from: '2026-06-01', to: '2026-06-15' },
    reference: 'PAY-0105-1',
    sourceType: 'trip',
    sourceId: null,
    balanceAfterHalalas: 5_200,
    journalEntryId: 'JE-00013',
  }),
  posting({
    id: 'PAY-0105-2',
    subjectAccount: 'liability.driver',
    subjectId: 'DRV-0105',
    postedAt: '2026-06-23T11:00:00+03:00',
    direction: 'debit',
    amountHalalas: 5_200,
    descriptionKey: 'fin.posting.payoutFailed',
    descriptionParams: { reference: 'PO-0003' },
    reference: 'PO-0003',
    sourceType: 'payout',
    sourceId: 'PO-0003',
    settlement: 'failed',
    actorId: 'USR-2',
    balanceAfterHalalas: 0,
    journalEntryId: 'JE-00029',
  }),

  /* ══ liability.driver — DRV-0106 · Reem Al-Otaibi ═══════════════════════ */
  posting({
    id: 'PAY-0106-1',
    subjectAccount: 'liability.driver',
    subjectId: 'DRV-0106',
    postedAt: '2026-06-19T06:30:00+03:00',
    direction: 'credit',
    amountHalalas: 4_000,
    descriptionKey: 'fin.posting.emergencyCover',
    descriptionParams: { dispatchId: 'EMG-0004' },
    reference: 'EMG-0004',
    sourceType: 'trip',
    sourceId: null,
    balanceAfterHalalas: 4_000,
    journalEntryId: 'JE-00018',
  }),

  /* ══ liability.driver — DRV-0202 · Majed Al-Shamrani ════════════════════
     A **negative payable**: the absentee forfeited the cover cost, so this
     captain owes Eyvar 15.00 on the payable account. Signed balances are the
     point of D-F1 and this is the row that proves it. */
  posting({
    id: 'PAY-0202-1',
    subjectAccount: 'liability.driver',
    subjectId: 'DRV-0202',
    postedAt: '2026-06-19T06:31:00+03:00',
    direction: 'debit',
    amountHalalas: 1_500,
    descriptionKey: 'fin.posting.emergencyForfeit',
    descriptionParams: { dispatchId: 'EMG-0004' },
    reference: 'EMG-0004',
    sourceType: 'trip',
    sourceId: null,
    balanceAfterHalalas: -1_500,
    journalEntryId: 'JE-00019',
  }),

  /* ══ liability.driver — DRV-0207 · Saud Al-Harbi ════════════════════════
     **The reversed payout.** 300.00 released on 22 May against a payable of
     zero, and returned on the 24th. The balance goes negative and comes back,
     which is the only honest way to render a payout that should never have run:
     `reversedByPostingId` on the first row is what lets the drawer walk from the
     erroneous payment to its correction rather than leaving an operator to
     match two amounts by eye. */
  posting({
    id: 'PAY-0207-1',
    subjectAccount: 'liability.driver',
    subjectId: 'DRV-0207',
    postedAt: '2026-05-22T12:00:00+03:00',
    direction: 'debit',
    amountHalalas: 30_000,
    descriptionKey: 'fin.posting.payoutReleased',
    descriptionParams: { reference: 'PO-0007' },
    reference: 'PO-0007',
    sourceType: 'payout',
    sourceId: 'PO-0007',
    settlement: 'reversed',
    reversedByPostingId: 'PAY-0207-2',
    actorId: 'USR-2',
    balanceAfterHalalas: -30_000,
    journalEntryId: 'JE-00063',
  }),
  posting({
    id: 'PAY-0207-2',
    subjectAccount: 'liability.driver',
    subjectId: 'DRV-0207',
    postedAt: '2026-05-24T10:15:00+03:00',
    direction: 'credit',
    amountHalalas: 30_000,
    descriptionKey: 'fin.posting.payoutReversed',
    descriptionParams: { reference: 'PO-0007' },
    reference: 'PO-0007',
    sourceType: 'reversal',
    sourceId: 'PAY-0207-1',
    kind: 'reversal',
    reversesPostingId: 'PAY-0207-1',
    reasonCode: 'PAY_INCORRECT_CHARGE',
    actorId: 'USR-2',
    balanceAfterHalalas: 0,
    journalEntryId: 'JE-00064',
  }),

  /* ══ liability.driver — DRV-0201 ════════════════════════════════════════
     The captain whose name is 62 characters of Arabic. Included so a payouts
     table has to survive it in the identity column. */
  posting({
    id: 'PAY-0201-1',
    subjectAccount: 'liability.driver',
    subjectId: 'DRV-0201',
    postedAt: '2026-06-15T23:59:00+03:00',
    direction: 'credit',
    amountHalalas: 66_217,
    descriptionKey: 'fin.posting.earningsAccrual',
    descriptionParams: { from: '2026-06-01', to: '2026-06-15' },
    reference: 'PAY-0201-1',
    sourceType: 'trip',
    sourceId: null,
    balanceAfterHalalas: 66_217,
    journalEntryId: 'JE-00014',
  }),

  /* ══ liability.escrow — one ledger per subscription ═════════════════════
     **A decision, recorded.** These postings are `settled`, not `held`.

     §3.2 says a positive `liability.escrow` balance means *"held against
     undelivered trips"*. §7.2 says a `held` posting is *"excluded from the
     balance and from the running-balance column"*. Both cannot be true: if
     every escrow posting were `held`, the escrow balance would always be zero
     and could never mean what §3.2 says it means.

     Resolved in favour of §3.2 for the **posting**, and §7.2 for the
     **document**: money moving into escrow is a fact and settles on arrival,
     while `EscrowHold.settlement` carries `held | released | reversed` exactly
     as §6.4 specifies. AC-312's pending case is still reachable — `WTX-0005`
     is authorised and the cash reports are pending. Flagged for
     product-owner. */
  posting({
    id: 'ESC-1060-1',
    subjectAccount: 'liability.escrow',
    subjectId: 'SUB-1060',
    postedAt: '2026-06-01T08:00:00+03:00',
    direction: 'credit',
    amountHalalas: 3_298,
    descriptionKey: 'fin.posting.escrowHeld',
    descriptionParams: { subscriptionId: 'SUB-1060' },
    reference: 'ESC-1060',
    sourceType: 'escrow',
    sourceId: 'ESC-1060',
    balanceAfterHalalas: 3_298,
    journalEntryId: 'JE-00002',
  }),
  posting({
    id: 'ESC-1060-2',
    subjectAccount: 'liability.escrow',
    subjectId: 'SUB-1060',
    postedAt: '2026-06-21T09:00:00+03:00',
    direction: 'debit',
    amountHalalas: 3_298,
    descriptionKey: 'fin.posting.escrowReleasedToCaptain',
    descriptionParams: { captainName: 'Omar Farouk' },
    reference: 'ESC-1060',
    sourceType: 'escrow',
    sourceId: 'ESC-1060',
    actorId: 'USR-2',
    balanceAfterHalalas: 0,
    journalEntryId: 'JE-00026',
  }),
  posting({
    id: 'ESC-1041-1',
    subjectAccount: 'liability.escrow',
    subjectId: 'SUB-1041',
    postedAt: '2026-06-05T08:00:00+03:00',
    direction: 'credit',
    amountHalalas: 6_920,
    descriptionKey: 'fin.posting.escrowHeld',
    descriptionParams: { subscriptionId: 'SUB-1041' },
    reference: 'ESC-1041',
    sourceType: 'escrow',
    sourceId: 'ESC-1041',
    balanceAfterHalalas: 6_920,
    journalEntryId: 'JE-00003',
  }),
  posting({
    id: 'ESC-0987-1',
    subjectAccount: 'liability.escrow',
    subjectId: 'SUB-0987',
    postedAt: '2026-06-08T08:00:00+03:00',
    direction: 'credit',
    amountHalalas: 6_920,
    descriptionKey: 'fin.posting.escrowHeld',
    descriptionParams: { subscriptionId: 'SUB-0987' },
    reference: 'ESC-0987',
    sourceType: 'escrow',
    sourceId: 'ESC-0987',
    balanceAfterHalalas: 6_920,
    journalEntryId: 'JE-00005',
  }),
  posting({
    id: 'ESC-1052-1',
    subjectAccount: 'liability.escrow',
    subjectId: 'SUB-1052',
    postedAt: '2026-06-12T08:00:00+03:00',
    direction: 'credit',
    amountHalalas: 32_960,
    descriptionKey: 'fin.posting.escrowHeld',
    descriptionParams: { subscriptionId: 'SUB-1052' },
    reference: 'ESC-1052',
    sourceType: 'escrow',
    sourceId: 'ESC-1052',
    balanceAfterHalalas: 32_960,
    journalEntryId: 'JE-00007',
  }),
  posting({
    id: 'ESC-1075-1',
    subjectAccount: 'liability.escrow',
    subjectId: 'SUB-1075',
    postedAt: '2026-06-21T08:00:00+03:00',
    direction: 'credit',
    amountHalalas: 6_920,
    descriptionKey: 'fin.posting.escrowHeld',
    descriptionParams: { subscriptionId: 'SUB-1075' },
    reference: 'ESC-1075',
    sourceType: 'escrow',
    sourceId: 'ESC-1075',
    balanceAfterHalalas: 6_920,
    journalEntryId: 'JE-00025',
  }),

  /* ══ contra.refunds — the platform refunds ledger ═══════════════════════
     `subjectId` is null: this is a platform-level account and the ledger has
     no party. The amounts are the **net** legs, because this ledger is the GL
     account's own ledger and its balance must equal the trial balance's. The
     VAT leg of each refund sits on `tax.vat_output`, and the refund
     *document's* gross is on `Refund.amountHalalas`. */
  posting({
    id: 'REF-0001-P',
    subjectAccount: 'contra.refunds',
    subjectId: null,
    postedAt: '2026-06-18T14:10:00+03:00',
    direction: 'debit',
    amountHalalas: 6_391,
    descriptionKey: 'fin.posting.refundIssued',
    descriptionParams: { reference: 'REF-0001', riderName: 'Bandar Al-Harbi' },
    reference: 'REF-0001',
    sourceType: 'refund',
    sourceId: 'REF-0001',
    kind: 'refund',
    reasonCode: 'BKG_NO_SUPPLY',
    actorId: 'USR-2',
    balanceAfterHalalas: 6_391,
    journalEntryId: 'JE-00017',
  }),
  posting({
    /**
     * **`sourceType: 'credit-note'` — the twelfth source type, and the first
     * posting to carry it.**
     *
     * `PostingSourceType` lists `credit-note` and three credit notes exist, and
     * **none of them sourced a posting**: every refund row pointed at the
     * refund, so the tax document that reverses the output VAT had no ledger
     * evidence of its own. The filter facet has never matched and the drill
     * from a credit note to its posting has never had a target.
     *
     * The subject account is `tax.vat_output`, which is not a subject ledger,
     * so this row is outside the six-account agreement check and adds nothing
     * to any of them. It shares `JE-00017` with `REF-0001-P` — one entry, two
     * subject views of it, which is exactly what a subject ledger is for. The
     * 959 halalas is `CN-0001.vatHalalas`, the residual on a 73.50 note.
     */
    id: 'CN-0001-P',
    subjectAccount: 'tax.vat_output',
    subjectId: null,
    postedAt: '2026-06-18T14:10:00+03:00',
    direction: 'debit',
    amountHalalas: 959,
    descriptionKey: 'fin.posting.creditNoteVatReversal',
    descriptionParams: { noteNumber: 'EYV-CN-2026-000041' },
    reference: 'CN-0001',
    sourceType: 'credit-note',
    sourceId: 'CN-0001',
    kind: 'refund',
    reasonCode: 'BKG_NO_SUPPLY',
    actorId: 'USR-2',
    balanceAfterHalalas: -959,
    journalEntryId: 'JE-00017',
  }),
  posting({
    id: 'REF-0002-P',
    subjectAccount: 'contra.refunds',
    subjectId: null,
    postedAt: '2026-06-19T15:00:00+03:00',
    direction: 'debit',
    amountHalalas: 6_017,
    descriptionKey: 'fin.posting.refundIssued',
    descriptionParams: { reference: 'REF-0002', riderName: 'Layla Al-Faraj' },
    reference: 'REF-0002',
    sourceType: 'refund',
    sourceId: 'REF-0002',
    kind: 'refund',
    reasonCode: 'PAY_REFUND_REQ',
    actorId: 'USR-2',
    balanceAfterHalalas: 12_408,
    journalEntryId: 'JE-00023',
  }),
  posting({
    id: 'REF-0003-P',
    subjectAccount: 'contra.refunds',
    subjectId: null,
    postedAt: '2026-06-22T11:30:00+03:00',
    direction: 'debit',
    amountHalalas: 3_478,
    descriptionKey: 'fin.posting.refundIssued',
    descriptionParams: { reference: 'REF-0003', riderName: 'Reem Al-Dosari' },
    reference: 'REF-0003',
    sourceType: 'refund',
    sourceId: 'REF-0003',
    kind: 'refund',
    reasonCode: 'PAY_REFUND_REQ',
    actorId: 'USR-3',
    balanceAfterHalalas: 15_886,
    journalEntryId: 'JE-00027',
  }),
]
