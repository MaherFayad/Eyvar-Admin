/**
 * Payments — the ten legacy seeds, ten more that exist only to make a
 * `SettlementState` reachable, and one derived row for every trip that names a
 * payment id.
 *
 * ## Why the volume rows are derived and not 119 literals
 *
 * `Trip.paymentId` is populated on 118 of the 132 rows in `fixtures/trips.ts`,
 * 109 of them from `fillerTrips`' own `PAY-${7000 + n}` expression (`:406`).
 * Copying those out as literals would be correct exactly once: the moment
 * anyone changes the filler expression, the trip index and the payment index
 * disagree and every `?entity=PAY-70xx` 404s again — which is the defect this
 * file exists to fix, reintroduced by the fix.
 *
 * So the rule is: **anything a hand-written row does not already cover is
 * derived from the reference itself.** Three passes, in order, each skipping
 * ids an earlier pass already produced:
 *
 *   1. `seededPayments`   — literals. Every legacy row, every settlement state,
 *                           every awkward shape. Hand-editable, greppable.
 *   2. trips              — one payment per `allTripFixtures[].paymentId`.
 *   3. the orphan sweep   — `Rider.paymentIds`, `Driver.paymentIds`,
 *                           `Refund.sourcePaymentId`, `CreditNote.againstPaymentId`.
 *                           Normally produces **nothing**, because passes 1 and
 *                           2 already cover all of them. It is the guarantee,
 *                           not the source: if another fixture grows a
 *                           reference tomorrow, the id still resolves.
 *
 * `paymentFixtures` therefore has **no dangling reference by construction**,
 * and stays that way while trips, riders and drivers move underneath it.
 *
 * ## Not in this file
 *
 * `PAY-0101-1`, `PAY-0102-4` and friends in `fixtures/ledger.ts` are **posting
 * ids**, not payment ids — `payablePrefix()` mints them as
 * `PAY-<captain number>` (`clients/payouts.ts:138`). Two id spaces share one
 * prefix. Nothing here claims them, and `resolveProfile('PAY-0102-4')` still
 * 404s, which is correct but is a collision worth naming: a four-character
 * prefix is doing the work of a namespace. Recorded for product-owner.
 */

import type { Payment, PaymentKind } from '../types/payment'
import { paymentDirectionFor } from '../types/payment'
import type { Halalas, IsoDateTime } from '../types/common'
import type { Trip } from '../types/trip'
import { allDriverFixtures } from './drivers'
import { creditNoteFixtures, refundFixtures, vatConfigFixture } from './financials'
import { riderFixtures } from './riders'
import { allTripFixtures } from './trips'

/* ─────────────────────────── money helpers ──────────────────────────── */

/**
 * The VAT **included in** a gross amount, as the residual — the rule
 * `CreditNote` already follows (M-3, AC-345). `7_350 → 959`, which is
 * `CN-0001`'s figure exactly.
 *
 * A function rather than a literal per row because it is arithmetic, not a
 * choice: computing it by hand 130 times is 130 chances to produce a subtotal
 * and a VAT that do not sum to the total.
 */
function includedVat(totalHalalas: Halalas): Halalas {
  return totalHalalas - Math.round(totalHalalas / (1 + vatConfigFixture.ratePercent / 100))
}

/**
 * The processor's cut, in basis points of the gross.
 *
 * **These rates are fixture values, not policy.** The real per-gateway fee
 * schedule is Finance's and nobody has published it; `expense.gateway_fees` was
 * added to the chart with no consumer, and this is the first data behind it.
 * When the real schedule lands it changes this table and nothing else.
 */
const GATEWAY_FEE_BPS: Readonly<Record<string, number>> = {
  mada: 100,
  visa: 275,
  apple_pay: 200,
  bank_transfer: 0,
}

function gatewayFee(gatewayId: string | null, amountHalalas: Halalas): Halalas {
  if (gatewayId === null) return 0
  return Math.round((amountHalalas * (GATEWAY_FEE_BPS[gatewayId] ?? 0)) / 10_000)
}

/* ───────────────────────── the hand-written rows ─────────────────────── */

/**
 * Every legacy `DB.payments` row (`:2695`–`:2705`) with its own amount, method
 * and date, plus the two extra trip payments the rebuild's trip fixtures added
 * (`PAY-6103`, `PAY-6104`), plus the three captain payouts
 * `Driver.paymentIds` names, plus one row for each settlement state that had no
 * record anywhere in the repo.
 *
 * `PAY-6120` is worth pointing at: `fixtures/ledger.ts` already carries
 * `WTX-0005`, a `sourceType: 'payment'` posting with `sourceId: null` and
 * reference `AUTH-6120`, whose comment says *"no captured payment yet, so no
 * source document"*. That payment now exists.
 */
const seededPayments: Payment[] = [
  /* ══ legacy `DB.payments`, verbatim ═══════════════════════════════════ */
  {
    /* `:2696` — 86.50 SAR, Visa ···4821, 19 Jun, Paid, SUB-1041. `TRP-7741`
       names it as its `paymentId`, so both links are set and both are true;
       legacy's single `trip` field holds the subscription id and loses the trip. */
    id: 'PAY-5510',
    kind: 'subscription-charge',
    direction: 'inbound',
    settlement: 'settled',
    riderId: 'RDR-1041',
    riderName: 'Nora Al-Harbi',
    captainId: 'DRV-0101',
    captainName: 'Ahmed Salem',
    tripId: 'TRP-7741',
    subscriptionId: 'SUB-1041',
    amountHalalas: 8_650,
    vatHalalas: 1_128,
    gatewayFeeHalalas: 238,
    refundedHalalas: 0,
    gatewayId: 'visa',
    instrumentLast4: '4821',
    gatewayReference: 'VIS-8841-0619',
    initiatedAt: '2026-06-19T06:02:00+03:00',
    capturedAt: '2026-06-19T06:02:04+03:00',
    settledAt: '2026-06-20T02:00:00+03:00',
    invoiceNumber: 'EYV-2026-001061',
    postingId: 'WTX-0003',
    failureCode: null,
    failureReason: null,
    escalatedAt: null,
    escalationReason: null,
  },
  {
    /* `:2697` — 412.00 SAR, Mada ···2210, 12 Jun. The largest subscription
       charge in the legacy seed. */
    id: 'PAY-5491',
    kind: 'subscription-charge',
    direction: 'inbound',
    settlement: 'settled',
    riderId: 'RDR-2031',
    riderName: 'Tariq Al-Saud',
    captainId: 'DRV-0103',
    captainName: 'Khalid Mansour',
    tripId: 'TRP-7738',
    subscriptionId: 'SUB-1052',
    amountHalalas: 41_200,
    vatHalalas: 5_374,
    gatewayFeeHalalas: 412,
    refundedHalalas: 0,
    gatewayId: 'mada',
    instrumentLast4: '2210',
    gatewayReference: 'MDA-4471-0612',
    initiatedAt: '2026-06-12T05:40:00+03:00',
    capturedAt: '2026-06-12T05:40:03+03:00',
    settledAt: '2026-06-13T02:00:00+03:00',
    invoiceNumber: 'EYV-2026-000984',
    postingId: null,
    failureCode: null,
    failureReason: null,
    escalatedAt: null,
    escalationReason: null,
  },
  {
    /* `:2698` — 41.22 SAR, Apple Pay, 01 Jun. **No last four**: a wallet
       instrument has no card number to show, and rendering `···null` is the
       row this fixture exists to catch. */
    id: 'PAY-5480',
    kind: 'subscription-charge',
    direction: 'inbound',
    settlement: 'settled',
    riderId: 'RDR-1080',
    riderName: 'Mohammed Al-Qahtani',
    captainId: 'DRV-0102',
    captainName: 'Omar Farouk',
    tripId: 'TRP-7735',
    subscriptionId: 'SUB-1060',
    amountHalalas: 4_122,
    vatHalalas: 538,
    gatewayFeeHalalas: 82,
    refundedHalalas: 0,
    gatewayId: 'apple_pay',
    instrumentLast4: null,
    gatewayReference: 'APL-2290-0601',
    initiatedAt: '2026-06-01T07:15:00+03:00',
    capturedAt: '2026-06-01T07:15:02+03:00',
    settledAt: '2026-06-02T02:00:00+03:00',
    invoiceNumber: 'EYV-2026-000771',
    postingId: null,
    failureCode: null,
    failureReason: null,
    escalatedAt: null,
    escalationReason: null,
  },
  {
    /* `:2699` — 29.40 SAR, Mada ···5540, 25 Jun. `TRP-7742` is the late trip
       and the SOS trip; this is the charge behind it. */
    id: 'PAY-5475',
    kind: 'subscription-charge',
    direction: 'inbound',
    settlement: 'settled',
    riderId: 'RDR-2055',
    riderName: 'Bandar Al-Harbi',
    captainId: 'DRV-0103',
    captainName: 'Khalid Mansour',
    tripId: 'TRP-7742',
    subscriptionId: 'SUB-1041',
    amountHalalas: 2_940,
    vatHalalas: 383,
    gatewayFeeHalalas: 29,
    refundedHalalas: 0,
    gatewayId: 'mada',
    instrumentLast4: '5540',
    gatewayReference: 'MDA-9012-0625',
    initiatedAt: '2026-06-25T07:00:00+03:00',
    capturedAt: '2026-06-25T07:00:03+03:00',
    settledAt: null,
    invoiceNumber: 'EYV-2026-001188',
    postingId: null,
    failureCode: null,
    failureReason: null,
    escalatedAt: null,
    escalationReason: null,
  },
  {
    /* `:2700` — 38.00 SAR, Mada ···2210, 25 Jun, TRP-9008. */
    id: 'PAY-6008',
    kind: 'quick-ride-fare',
    direction: 'inbound',
    settlement: 'settled',
    riderId: 'RDR-2031',
    riderName: 'Tariq Al-Saud',
    captainId: 'DRV-0104',
    captainName: 'Hassan Al-Ghamdi',
    tripId: 'TRP-9008',
    subscriptionId: null,
    amountHalalas: 3_800,
    vatHalalas: 496,
    gatewayFeeHalalas: 38,
    refundedHalalas: 0,
    gatewayId: 'mada',
    instrumentLast4: '2210',
    gatewayReference: 'MDA-9114-0625',
    initiatedAt: '2026-06-25T09:08:20+03:00',
    capturedAt: '2026-06-25T09:08:24+03:00',
    settledAt: null,
    invoiceNumber: 'EYV-2026-001191',
    postingId: null,
    failureCode: null,
    failureReason: null,
    escalatedAt: null,
    escalationReason: null,
  },
  {
    /* `:2701` — 24.50 SAR, Visa ···7766, 25 Jun, TRP-9012. The trip is still
       `in-trip`, so the charge is **authorised and not captured**: `capturedAt`
       null, no invoice, no posting. */
    id: 'PAY-6001',
    kind: 'quick-ride-fare',
    direction: 'inbound',
    settlement: 'authorised',
    riderId: 'RDR-2087',
    riderName: 'Layla Al-Faraj',
    captainId: 'DRV-0102',
    captainName: 'Omar Farouk',
    tripId: 'TRP-9012',
    subscriptionId: null,
    amountHalalas: 2_450,
    vatHalalas: 320,
    gatewayFeeHalalas: 0,
    refundedHalalas: 0,
    gatewayId: 'visa',
    instrumentLast4: '7766',
    gatewayReference: 'VIS-7731-0625',
    initiatedAt: '2026-06-25T08:52:00+03:00',
    capturedAt: null,
    settledAt: null,
    invoiceNumber: null,
    postingId: null,
    failureCode: null,
    failureReason: null,
    escalatedAt: null,
    escalationReason: null,
  },
  {
    /* `:2702` — 86.50 SAR, Visa ···7766, 12 Jun, **Refunded**, SUB-0998.
       `REF-0002` names it as `sourcePaymentId`; `CN-0002` names it as
       `againstPaymentId` and matches on `invoiceNumber`.

       Partially refunded — 69.20 of 86.50 — and it is still `settled`. A refund
       is a **separate document and a new economic event** (§3.4); flipping the
       payment's state would be the ledger editing history, and it is what loses
       the amount in legacy, where `status: 'Refunded'` is all that survives. */
    id: 'PAY-5988',
    kind: 'subscription-charge',
    direction: 'inbound',
    settlement: 'settled',
    riderId: 'RDR-2087',
    riderName: 'Layla Al-Faraj',
    captainId: 'DRV-0102',
    captainName: 'Omar Farouk',
    tripId: null,
    subscriptionId: 'SUB-0998',
    amountHalalas: 8_650,
    vatHalalas: 1_128,
    gatewayFeeHalalas: 238,
    refundedHalalas: 6_920,
    gatewayId: 'visa',
    instrumentLast4: '7766',
    gatewayReference: 'VIS-6620-0612',
    initiatedAt: '2026-06-12T09:30:00+03:00',
    capturedAt: '2026-06-12T09:30:05+03:00',
    settledAt: '2026-06-13T02:00:00+03:00',
    invoiceNumber: 'EYV-2026-001148',
    postingId: null,
    failureCode: null,
    failureReason: null,
    escalatedAt: null,
    escalationReason: null,
  },
  {
    /* `:2703` — 122.50 SAR, Mada ···5540, 11 Jun, **Refunded**, SUB-0987.
       `REF-0001` / `CN-0001` / invoice `EYV-2026-001102`. */
    id: 'PAY-5977',
    kind: 'subscription-charge',
    direction: 'inbound',
    settlement: 'settled',
    riderId: 'RDR-2055',
    riderName: 'Bandar Al-Harbi',
    captainId: 'DRV-0105',
    captainName: 'Youssef Nouri',
    tripId: null,
    subscriptionId: 'SUB-0987',
    amountHalalas: 12_250,
    vatHalalas: 1_598,
    gatewayFeeHalalas: 123,
    refundedHalalas: 7_350,
    gatewayId: 'mada',
    instrumentLast4: '5540',
    gatewayReference: 'MDA-5511-0611',
    initiatedAt: '2026-06-11T06:20:00+03:00',
    capturedAt: '2026-06-11T06:20:04+03:00',
    settledAt: '2026-06-12T02:00:00+03:00',
    invoiceNumber: 'EYV-2026-001102',
    postingId: null,
    failureCode: null,
    failureReason: null,
    escalatedAt: null,
    escalationReason: null,
  },
  {
    /* `:2704` — 15.75 SAR, Mada ···9013, 25 Jun, TRP-9005. */
    id: 'PAY-6010',
    kind: 'quick-ride-fare',
    direction: 'inbound',
    settlement: 'settled',
    riderId: 'RDR-2090',
    riderName: 'Hessa Al-Mutlaq',
    captainId: 'DRV-0101',
    captainName: 'Ahmed Salem',
    tripId: 'TRP-9005',
    subscriptionId: null,
    amountHalalas: 1_575,
    vatHalalas: 205,
    gatewayFeeHalalas: 16,
    refundedHalalas: 0,
    gatewayId: 'mada',
    instrumentLast4: '9013',
    gatewayReference: 'MDA-8807-0625',
    initiatedAt: '2026-06-25T08:34:10+03:00',
    capturedAt: '2026-06-25T08:34:14+03:00',
    settledAt: null,
    invoiceNumber: 'EYV-2026-001189',
    postingId: 'PAY-0101-2',
    failureCode: null,
    failureReason: null,
    escalatedAt: null,
    escalationReason: null,
  },
  {
    /* `:2705` — 640 SAR, bank transfer, 25 Jun, **Pending**, `trip: '—'`.
       The only outbound row in the legacy seed and the reason `direction`
       exists. `DRV-0101`'s `liability.driver` balance is 65,260 halalas
       (`fixtures/ledger.ts`, `PAY-0101-2`), so 64,000 is payable against it. */
    id: 'PAY-W640',
    kind: 'captain-payout',
    direction: 'outbound',
    settlement: 'pending',
    riderId: null,
    riderName: null,
    captainId: 'DRV-0101',
    captainName: 'Ahmed Salem',
    tripId: null,
    subscriptionId: null,
    amountHalalas: 64_000,
    vatHalalas: 0,
    gatewayFeeHalalas: 0,
    refundedHalalas: 0,
    gatewayId: 'bank_transfer',
    instrumentLast4: '4408',
    gatewayReference: null,
    initiatedAt: '2026-06-25T06:00:00+03:00',
    capturedAt: null,
    settledAt: null,
    invoiceNumber: null,
    postingId: null,
    failureCode: null,
    failureReason: null,
    escalatedAt: null,
    escalationReason: null,
  },

  /* ══ the trip fixtures' two extra ids ═════════════════════════════════ */
  {
    /* `TRP-9101` is a **no-show** — 15.00 SAR charged on a trip with no
       distance and no duration. Money on a journey that did not happen. */
    id: 'PAY-6103',
    kind: 'quick-ride-fare',
    direction: 'inbound',
    settlement: 'settled',
    riderId: 'RDR-4001',
    riderName: 'Abdulaziz Al-Suwailem',
    captainId: 'DRV-0207',
    captainName: 'Saud Al-Harbi',
    tripId: 'TRP-9101',
    subscriptionId: null,
    amountHalalas: 1_500,
    vatHalalas: 196,
    gatewayFeeHalalas: 15,
    refundedHalalas: 0,
    gatewayId: 'mada',
    instrumentLast4: '3372',
    gatewayReference: 'MDA-3301-0616',
    initiatedAt: '2026-06-16T08:14:00+03:00',
    capturedAt: '2026-06-16T08:14:06+03:00',
    settledAt: '2026-06-17T02:00:00+03:00',
    invoiceNumber: 'EYV-2026-001120',
    postingId: null,
    failureCode: null,
    failureReason: null,
    escalatedAt: null,
    escalationReason: null,
  },
  {
    /* `TRP-9102` — 1,284.50 SAR fare plus a 50.00 SAR tip. **The largest
       amount in the set**, on a trip with a 61-character Arabic captain name.
       Whether the money column is wide enough in RTL is decided here. */
    id: 'PAY-6104',
    kind: 'quick-ride-fare',
    direction: 'inbound',
    settlement: 'settled',
    riderId: 'RDR-4003',
    riderName: 'Meshari Al-Dossari',
    captainId: 'DRV-0201',
    captainName: 'عبد الرحمن بن محمد بن عبد الله آل عبد الله القحطاني الدوسري',
    tripId: 'TRP-9102',
    subscriptionId: null,
    amountHalalas: 133_450,
    vatHalalas: 17_407,
    gatewayFeeHalalas: 3_670,
    refundedHalalas: 0,
    gatewayId: 'visa',
    instrumentLast4: '0114',
    gatewayReference: 'VIS-1140-0625',
    initiatedAt: '2026-06-25T07:16:00+03:00',
    capturedAt: '2026-06-25T07:16:09+03:00',
    settledAt: null,
    invoiceNumber: 'EYV-2026-001190',
    postingId: null,
    failureCode: null,
    failureReason: null,
    escalatedAt: null,
    escalationReason: null,
  },

  /* ══ the other two captain payouts `Driver.paymentIds` names ══════════ */
  {
    /* `DRV-0102`'s payout, its reversal and the reversal of that reversal are
       three rows in `fixtures/ledger.ts` (`PAY-0102-4/5/6`) with nothing in
       front of them. This is the document those postings describe. 820.00 SAR
       out, then back. */
    id: 'PAY-W820',
    kind: 'captain-payout',
    direction: 'outbound',
    settlement: 'reversed',
    riderId: null,
    riderName: null,
    captainId: 'DRV-0102',
    captainName: 'Omar Farouk',
    tripId: null,
    subscriptionId: null,
    amountHalalas: 82_000,
    vatHalalas: 0,
    gatewayFeeHalalas: 0,
    refundedHalalas: 0,
    gatewayId: 'bank_transfer',
    instrumentLast4: '7712',
    gatewayReference: 'SARIE-770412',
    initiatedAt: '2026-06-16T10:00:00+03:00',
    capturedAt: '2026-06-16T10:04:00+03:00',
    settledAt: null,
    invoiceNumber: null,
    postingId: 'PAY-0102-4',
    failureCode: null,
    failureReason: null,
    escalatedAt: null,
    escalationReason: null,
  },
  {
    /* A payout that simply worked. Every set needs one. */
    id: 'PAY-W900',
    kind: 'captain-payout',
    direction: 'outbound',
    settlement: 'settled',
    riderId: null,
    riderName: null,
    captainId: 'DRV-0104',
    captainName: 'Hassan Al-Ghamdi',
    tripId: null,
    subscriptionId: null,
    amountHalalas: 45_500,
    vatHalalas: 0,
    gatewayFeeHalalas: 0,
    refundedHalalas: 0,
    gatewayId: 'bank_transfer',
    instrumentLast4: '9031',
    gatewayReference: 'SARIE-901255',
    initiatedAt: '2026-06-16T10:00:00+03:00',
    capturedAt: '2026-06-16T10:03:00+03:00',
    settledAt: '2026-06-16T14:20:00+03:00',
    invoiceNumber: null,
    postingId: null,
    failureCode: null,
    failureReason: null,
    escalatedAt: null,
    escalationReason: null,
  },

  /* ══ the settlement states nothing in the repo could reach ════════════
     `pending`, `reconciling`, `voided` and `escalated` had **zero records**
     anywhere before this file, so four of the ten arms of `SettlementState`
     — and both of the two `SETTLEMENT_BADGE_TONE` returns `null` for — had
     never rendered. `PAY-W640` covers `pending` above; the rest are here. */
  {
    /* `authorised`, and the counterpart to `WTX-0005` in `fixtures/ledger.ts`:
       a `sourceType: 'payment'` posting with `sourceId: null`, reference
       `AUTH-6120`, 120.00 SAR, whose comment says *"no captured payment yet, so
       no source document and no journal entry"*. The source document now
       exists, and it is this. */
    id: 'PAY-6120',
    kind: 'subscription-charge',
    direction: 'inbound',
    settlement: 'authorised',
    riderId: 'RDR-1041',
    riderName: 'Nora Al-Harbi',
    captainId: null,
    captainName: null,
    tripId: null,
    subscriptionId: 'SUB-1041',
    amountHalalas: 12_000,
    vatHalalas: 1_565,
    gatewayFeeHalalas: 0,
    refundedHalalas: 0,
    gatewayId: 'visa',
    instrumentLast4: '4821',
    gatewayReference: 'AUTH-6120',
    initiatedAt: '2026-06-20T07:05:00+03:00',
    capturedAt: null,
    settledAt: null,
    invoiceNumber: null,
    postingId: 'WTX-0005',
    failureCode: null,
    failureReason: null,
    escalatedAt: null,
    escalationReason: null,
  },
  {
    /* `pending` on the inbound side — raised eight minutes ago and the gateway
       has said nothing. `PAY-W640` is the outbound one. */
    id: 'PAY-6130',
    kind: 'wallet-topup',
    direction: 'inbound',
    settlement: 'pending',
    riderId: 'RDR-1090',
    riderName: 'Reem Al-Dosari',
    captainId: null,
    captainName: null,
    tripId: null,
    subscriptionId: null,
    /* A top-up buys nothing, so it carries no VAT — the tax lands when the
       balance is spent on a trip. */
    amountHalalas: 5_000,
    vatHalalas: 0,
    gatewayFeeHalalas: 50,
    refundedHalalas: 0,
    gatewayId: 'mada',
    instrumentLast4: '2214',
    gatewayReference: 'MDA-9931-0625',
    initiatedAt: '2026-06-25T09:06:00+03:00',
    capturedAt: null,
    settledAt: null,
    invoiceNumber: null,
    postingId: null,
    failureCode: null,
    failureReason: null,
    escalatedAt: null,
    escalationReason: null,
  },
  {
    /* `failed` — one of the two states with **no badge tone** (R5a). The card
       was declined, so no trip followed, so `tripId` is null: the failure is
       the whole record. `PAY_DECLINED` §3.2 is the reason code a support agent
       would raise against it. */
    id: 'PAY-6140',
    kind: 'quick-ride-fare',
    direction: 'inbound',
    settlement: 'failed',
    riderId: 'RDR-1052',
    riderName: 'Omar Al-Shehri',
    captainId: null,
    captainName: null,
    tripId: null,
    subscriptionId: null,
    amountHalalas: 2_600,
    vatHalalas: 339,
    gatewayFeeHalalas: 0,
    refundedHalalas: 0,
    gatewayId: 'visa',
    instrumentLast4: '1187',
    gatewayReference: 'VIS-0031-0624',
    initiatedAt: '2026-06-24T18:41:00+03:00',
    capturedAt: null,
    settledAt: null,
    invoiceNumber: null,
    postingId: null,
    failureCode: 'insufficient_funds',
    failureReason: { key: 'fin.payment.failure.insufficientFunds' },
    escalatedAt: null,
    escalationReason: null,
  },
  {
    /* `held` — captured and frozen for fraud review. `RDR-4002` and one other
       rider share `160.156.4.90` in `fixtures/riders.ts`, which is the signal
       that put a hold on it. `isPendingSettlement` is true, so this amount sits
       on the separate `Pending` line and **not** inside the balance (AC-312). */
    id: 'PAY-6150',
    kind: 'quick-ride-fare',
    direction: 'inbound',
    settlement: 'held',
    riderId: 'RDR-4002',
    riderName: 'الجوهرة بنت عبد العزيز بن سعود آل مقرن العتيبي',
    captainId: 'DRV-0206',
    captainName: 'Ibrahim Diarra Coulibaly',
    tripId: null,
    subscriptionId: null,
    amountHalalas: 9_800,
    vatHalalas: 1_278,
    gatewayFeeHalalas: 98,
    refundedHalalas: 0,
    gatewayId: 'mada',
    instrumentLast4: '6644',
    gatewayReference: 'MDA-6644-0623',
    initiatedAt: '2026-06-23T21:10:00+03:00',
    capturedAt: '2026-06-23T21:10:07+03:00',
    settledAt: null,
    invoiceNumber: null,
    postingId: null,
    failureCode: null,
    failureReason: null,
    escalatedAt: null,
    escalationReason: null,
  },
  {
    /* `released` — the same rider, the previous week, hold cleared. Two rows so
       the *before* and *after* of a fraud hold sit side by side in one list. */
    id: 'PAY-6151',
    kind: 'quick-ride-fare',
    direction: 'inbound',
    settlement: 'released',
    riderId: 'RDR-4002',
    riderName: 'الجوهرة بنت عبد العزيز بن سعود آل مقرن العتيبي',
    captainId: 'DRV-0206',
    captainName: 'Ibrahim Diarra Coulibaly',
    tripId: null,
    subscriptionId: null,
    amountHalalas: 6_400,
    vatHalalas: 835,
    gatewayFeeHalalas: 64,
    refundedHalalas: 0,
    gatewayId: 'mada',
    instrumentLast4: '6644',
    gatewayReference: 'MDA-6640-0617',
    initiatedAt: '2026-06-17T20:02:00+03:00',
    capturedAt: '2026-06-17T20:02:05+03:00',
    settledAt: '2026-06-19T02:00:00+03:00',
    invoiceNumber: 'EYV-2026-001131',
    postingId: null,
    failureCode: null,
    failureReason: null,
    escalatedAt: null,
    escalationReason: null,
  },
  {
    /* `reconciling` — captured, but the gateway's settlement file reports a
       different figure and nobody has decided which is right yet. Also
       `isPendingSettlement`. */
    id: 'PAY-6160',
    kind: 'subscription-charge',
    direction: 'inbound',
    settlement: 'reconciling',
    riderId: 'RDR-1060',
    riderName: 'Khaled Al-Zahrani',
    captainId: 'DRV-0105',
    captainName: 'Youssef Nouri',
    tripId: null,
    subscriptionId: 'SUB-1060',
    amountHalalas: 3_450,
    vatHalalas: 450,
    gatewayFeeHalalas: 69,
    refundedHalalas: 0,
    gatewayId: 'apple_pay',
    instrumentLast4: null,
    gatewayReference: 'APL-4530-0621',
    initiatedAt: '2026-06-21T05:55:00+03:00',
    capturedAt: '2026-06-21T05:55:02+03:00',
    settledAt: null,
    invoiceNumber: 'EYV-2026-001155',
    postingId: null,
    failureCode: null,
    failureReason: null,
    escalatedAt: null,
    escalationReason: null,
  },
  {
    /* **`escalated`** — the second of the two states `SETTLEMENT_BADGE_TONE`
       returns `null` for, and until this row **no record in the repo was in
       it**, so the R5a critical-row treatment that stands in for the red badge
       R5 forbids had never been rendered, let alone reviewed.

       Captured six days ago, still not settled, three reconciliation cycles
       missed, escalated to Finance. */
    id: 'PAY-6161',
    kind: 'subscription-charge',
    direction: 'inbound',
    settlement: 'escalated',
    riderId: 'RDR-3001',
    riderName: 'Abdullah Al-Rasheed',
    captainId: 'DRV-0103',
    captainName: 'Khalid Mansour',
    tripId: null,
    subscriptionId: null,
    amountHalalas: 7_400,
    vatHalalas: 965,
    gatewayFeeHalalas: 204,
    refundedHalalas: 0,
    gatewayId: 'visa',
    instrumentLast4: '3390',
    gatewayReference: 'VIS-3390-0619',
    initiatedAt: '2026-06-19T13:30:00+03:00',
    capturedAt: '2026-06-19T13:30:11+03:00',
    settledAt: null,
    invoiceNumber: 'EYV-2026-001142',
    postingId: null,
    failureCode: null,
    failureReason: null,
    escalatedAt: '2026-06-24T11:00:00+03:00',
    escalationReason: { key: 'fin.payment.escalation.unsettledPastCycle', params: { days: 5 } },
  },
  {
    /* `voided` — an authorisation released before capture, because the rider
       cancelled before a captain was assigned. Nothing moved, so there is no
       posting, no invoice and no capture instant. */
    id: 'PAY-6170',
    kind: 'quick-ride-fare',
    direction: 'inbound',
    settlement: 'voided',
    riderId: 'RDR-1075',
    riderName: 'Sara Al-Ghamdi',
    captainId: null,
    captainName: null,
    tripId: null,
    subscriptionId: null,
    amountHalalas: 3_000,
    vatHalalas: 391,
    gatewayFeeHalalas: 0,
    refundedHalalas: 0,
    gatewayId: 'mada',
    instrumentLast4: '7788',
    gatewayReference: 'MDA-7788-0622',
    initiatedAt: '2026-06-22T16:44:00+03:00',
    capturedAt: null,
    settledAt: null,
    invoiceNumber: null,
    postingId: null,
    failureCode: null,
    failureReason: null,
    escalatedAt: null,
    escalationReason: null,
  },
  {
    /* `reversed` on the inbound side — a **chargeback**. The rider's bank
       pulled the money back. §3.4c calls this a new economic event and not a
       correction, which is why `refundedHalalas` stays `0`: nothing was
       refunded, it was taken. It is also the first thing that would ever post
       to `ar.rider`, declared at `:19867` and never used. */
    id: 'PAY-6180',
    kind: 'quick-ride-fare',
    direction: 'inbound',
    settlement: 'reversed',
    riderId: 'RDR-1080',
    riderName: 'Mohammed Al-Qahtani',
    captainId: 'DRV-0104',
    captainName: 'Hassan Al-Ghamdi',
    tripId: null,
    subscriptionId: null,
    amountHalalas: 5_200,
    vatHalalas: 678,
    gatewayFeeHalalas: 143,
    refundedHalalas: 0,
    gatewayId: 'visa',
    instrumentLast4: '4821',
    gatewayReference: 'VIS-4821-0610',
    initiatedAt: '2026-06-10T19:22:00+03:00',
    capturedAt: '2026-06-10T19:22:06+03:00',
    settledAt: '2026-06-11T02:00:00+03:00',
    invoiceNumber: 'EYV-2026-001090',
    postingId: null,
    failureCode: null,
    failureReason: null,
    escalatedAt: null,
    escalationReason: null,
  },
  {
    /* **No gateway at all** — paid from the rider's wallet balance. `gatewayId`
       and `instrumentLast4` are both null and the fee is zero, which is the row
       that finds out whether the instrument column renders an empty cell or the
       string `null`. */
    id: 'PAY-6190',
    kind: 'quick-ride-fare',
    direction: 'inbound',
    settlement: 'settled',
    riderId: 'RDR-2090',
    riderName: 'Hessa Al-Mutlaq',
    captainId: 'DRV-0101',
    captainName: 'Ahmed Salem',
    tripId: null,
    subscriptionId: null,
    amountHalalas: 2_100,
    vatHalalas: 274,
    gatewayFeeHalalas: 0,
    refundedHalalas: 0,
    gatewayId: null,
    instrumentLast4: null,
    gatewayReference: null,
    initiatedAt: '2026-06-24T07:12:00+03:00',
    capturedAt: '2026-06-24T07:12:01+03:00',
    settledAt: '2026-06-24T07:12:01+03:00',
    invoiceNumber: 'EYV-2026-001176',
    postingId: null,
    failureCode: null,
    failureReason: null,
    escalatedAt: null,
    escalationReason: null,
  },
]

/* ────────────────────── pass 2 · derived from trips ──────────────────── */

/**
 * The gateway rotation for derived rows. Four ids, deliberately not six:
 * `stc_pay` and `tabby` ship `enabled: false` with `transactionCount: 0`, and
 * AC-432 says a count of zero renders **no badge**. Attributing volume to a
 * disabled gateway would make that state unreachable.
 */
const DERIVED_GATEWAYS = ['mada', 'visa', 'apple_pay', 'bank_transfer'] as const

/** `mada` and `visa` show a card number; `apple_pay` and a bank transfer do not. */
const DERIVED_LAST4: Readonly<Record<string, string | null>> = {
  mada: '5540',
  visa: '7766',
  apple_pay: null,
  bank_transfer: null,
}

/**
 * One payment per trip that names one. Everything is a function of the trip and
 * of the row's position, so two loads produce byte-identical output — the third
 * seam property, and the reason `Math.random` and `Date.now` are banned in this
 * directory.
 *
 * `amountHalalas` is `fare + tip`: `extraStopFeeHalalas` is already inside the
 * fare (legacy computes `platformCut = fare − driverEarn − stopFee`, `:3422`),
 * so adding it again would double-count the stop.
 */
function paymentFromTrip(trip: Trip, paymentId: string, index: number): Payment {
  const gatewayId: string = DERIVED_GATEWAYS[index % DERIVED_GATEWAYS.length] ?? 'mada'
  const amountHalalas = trip.fareHalalas + trip.tipHalalas
  const kind: PaymentKind =
    trip.subscriptionId === null ? 'quick-ride-fare' : 'subscription-charge'
  /* A settlement file that has not matched yet. Every twenty-third row, so the
     `reconciling` filter and the `Pending` line have volume behind them and not
     just the one hand-written case. */
  const reconciling = index % 23 === 0
  const capturedAt: IsoDateTime = trip.endedAt ?? trip.startedAt
  return {
    id: paymentId,
    kind,
    direction: paymentDirectionFor(kind),
    settlement: reconciling ? 'reconciling' : 'settled',
    riderId: trip.riderId,
    riderName: trip.riderName,
    captainId: trip.driverId,
    captainName: trip.driverName,
    tripId: trip.id,
    subscriptionId: trip.subscriptionId,
    amountHalalas,
    vatHalalas: includedVat(amountHalalas),
    gatewayFeeHalalas: gatewayFee(gatewayId, amountHalalas),
    refundedHalalas: 0,
    gatewayId,
    instrumentLast4: DERIVED_LAST4[gatewayId] ?? null,
    gatewayReference: `${gatewayId.slice(0, 3).toUpperCase()}-${paymentId.slice(-4)}`,
    initiatedAt: trip.startedAt,
    capturedAt,
    settledAt: reconciling ? null : capturedAt,
    invoiceNumber: `EYV-2026-${String(2_000 + index).padStart(6, '0')}`,
    postingId: null,
    failureCode: null,
    failureReason: null,
    escalatedAt: null,
    escalationReason: null,
  }
}

/* ─────────────────── pass 3 · the dangling-id sweep ──────────────────── */

/**
 * A minimal record for an id that is referenced and that passes 1 and 2 did not
 * produce.
 *
 * **This should normally emit nothing** — and it does today. It exists because
 * the failure it prevents is silent: a `PAY-*` on a rider, a captain, a refund
 * or a credit note that resolves to nothing gives the operator *"No record
 * found"* on a link the product itself rendered, which is the exact behaviour
 * `clients/profile.ts` set out to improve on. A placeholder that says *"we know
 * about this payment and little else"* is strictly better than a 404, and it
 * cannot rot, because it is derived from the reference.
 */
function placeholderPayment(
  id: string,
  party: { riderId: string; riderName: string } | { captainId: string; captainName: string },
): Payment {
  const isPayout = 'captainId' in party
  const kind: PaymentKind = isPayout ? 'captain-payout' : 'quick-ride-fare'
  return {
    id,
    kind,
    direction: paymentDirectionFor(kind),
    settlement: 'settled',
    riderId: isPayout ? null : party.riderId,
    riderName: isPayout ? null : party.riderName,
    captainId: isPayout ? party.captainId : null,
    captainName: isPayout ? party.captainName : null,
    tripId: null,
    subscriptionId: null,
    amountHalalas: 0,
    vatHalalas: 0,
    gatewayFeeHalalas: 0,
    refundedHalalas: 0,
    gatewayId: null,
    instrumentLast4: null,
    gatewayReference: null,
    initiatedAt: '2026-06-01T00:00:00+03:00',
    capturedAt: '2026-06-01T00:00:00+03:00',
    settledAt: '2026-06-01T00:00:00+03:00',
    invoiceNumber: null,
    postingId: null,
    failureCode: null,
    failureReason: null,
    escalatedAt: null,
    escalationReason: null,
  }
}

/* ───────────────────────────── assembly ──────────────────────────────── */

function buildPaymentFixtures(): Payment[] {
  const out: Payment[] = [...seededPayments]
  const seen = new Set(out.map((p) => p.id))

  for (const trip of allTripFixtures) {
    const paymentId = trip.paymentId
    if (paymentId === null || seen.has(paymentId)) continue
    seen.add(paymentId)
    out.push(paymentFromTrip(trip, paymentId, out.length))
  }

  for (const rider of riderFixtures) {
    for (const id of rider.paymentIds) {
      if (seen.has(id)) continue
      seen.add(id)
      out.push(placeholderPayment(id, { riderId: rider.id, riderName: rider.name }))
    }
  }

  for (const driver of allDriverFixtures) {
    for (const id of driver.paymentIds) {
      if (seen.has(id)) continue
      seen.add(id)
      out.push(placeholderPayment(id, { captainId: driver.id, captainName: driver.name }))
    }
  }

  for (const refund of refundFixtures) {
    const id = refund.sourcePaymentId
    if (id === null || seen.has(id)) continue
    seen.add(id)
    out.push(placeholderPayment(id, { riderId: refund.riderId, riderName: refund.riderName }))
  }

  for (const note of creditNoteFixtures) {
    const id = note.againstPaymentId
    if (id === null || seen.has(id)) continue
    seen.add(id)
    out.push(placeholderPayment(id, { riderId: note.buyerId, riderName: note.buyerName }))
  }

  return out
}

/**
 * ~130 rows: 21 hand-written and the rest derived. Deep enough to page five
 * times at the default 25, and every one of the ten `SettlementState` arms has
 * at least one record.
 */
export const paymentFixtures: Payment[] = buildPaymentFixtures()
