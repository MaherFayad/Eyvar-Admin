/**
 * Payment — the document 119 trips, three riders, three captains, two refunds
 * and two credit notes have been pointing at since the rebuild started, and
 * which had no type, no fixture and no client until now.
 *
 * Legacy has it as a first-class collection: `DB.payments`
 * (`eyvar_ops_panel_v40_fixed.html:2695`–`:2705`), ten rows, resolved by
 * `resolveId` (`:3269`) and rendered on the 360° profile. The rebuild ported
 * the *references* and not the record, so `clients/profile.ts` grew a
 * `paymentIndex` derived from whoever happened to mention an id — a workaround
 * whose own comment (`:176`–`:196`) names this file as the fix.
 *
 * ## Legacy's ten fields and what each became
 *
 * ```js
 * {id, entity, type, amount, method, date, status, trip}      // `:2696`
 * ```
 *
 * | legacy | here | why |
 * |---|---|---|
 * | `entity: 'RDR-1041' \| 'DRV-0101'` | `riderId` + `captainId` | one field holding either a rider or a captain cannot be joined, filtered or faceted. A payout's counterparty is a captain; a fare's is a rider; they are different columns. |
 * | `type: 'Subscription charge'` | `kind` | a display string cannot be filtered or translated — the same argument `types/safety.ts` makes about `inc.type`. |
 * | `amount: '86.50 SAR'` | `amountHalalas` | a formatted string with a currency in it, parsed with `parseFloat` at render. Integer minor units, always. |
 * | `method: 'Visa ···4821'` | `gatewayId` + `instrumentLast4` | **this is D-F16.** `gatewayStats` (`:7457`) attributes volume by prefix-matching this string, so renaming a gateway silently reattributes its volume. A foreign key into `paymentGatewayFixtures` cannot do that. |
 * | `date: '19 Jun'` | `initiatedAt` / `capturedAt` / `settledAt` | one display string standing in for three different instants, none of them sortable. |
 * | `status: 'Paid' \| 'Refunded' \| 'Pending'` | `settlement: SettlementState` | see below. |
 * | `trip: 'SUB-1041' \| 'TRP-9008' \| '—'` | `tripId` + `subscriptionId` | legacy's `trip` field holds a **subscription** id on five of its ten rows. Two fields, each nullable, each true. |
 *
 * ## Why `settlement` is `SettlementState` and not a new `PaymentStatus`
 *
 * `types/ledger.ts` already owns the ten-value union for *where money has got
 * to*, `SETTLEMENT_BADGE_TONE` already assigns its tones under R7, and
 * `PENDING_SETTLEMENTS` already decides what is excluded from a balance.
 * `Refund.settlement` and `LedgerPosting.settlement` both use it. A payment
 * with its own three-value status would mean two vocabularies for one question
 * and two badge-tone tables to keep in step — and the moment a payment says
 * `Paid` while its posting says `reconciling`, an operator has to decide which
 * screen is lying.
 *
 * So there is **no new enum here and no new tone**. In particular `escalated`
 * and `failed` are the two states `SETTLEMENT_BADGE_TONE` returns `null` for
 * (R5a: no red badge, no sixth tone), and the fixtures now carry a record in
 * each so the row-level critical treatment is finally reachable.
 *
 * `PostingSourceType` has included `'payment'` since the ledger was written
 * (`types/ledger.ts`), and `WTX-0005` in `fixtures/ledger.ts` is a
 * payment-sourced posting with `sourceId: null` *because the payment it
 * describes did not exist yet*. `postingId` below is the other half of that
 * link.
 *
 * ## The sign convention, inherited rather than re-invented
 *
 * `amountHalalas` is a **positive integer, always**, and `direction` says which
 * way the money went. That is §3.1's rule for postings (D-F1) applied to the
 * document that causes them, and it is why a captain payout — money leaving
 * Eyvar — is not modelled as a negative fare.
 */

import type { Halalas, IsoDateTime, LocalisedText } from './common'
import type { SettlementState } from './ledger'

/**
 * Legacy `type` (`:2696`), slugged, plus the one the wallet ledger already
 * writes and legacy's payment table never showed.
 *
 *   `subscription-charge`  `'Subscription charge'` — seven of legacy's ten rows.
 *   `quick-ride-fare`      `'Quick ride fare'` — three.
 *   `captain-payout`       `'Driver payout'` — `PAY-W640` (`:2704`). The one
 *                          **outbound** kind in the legacy seed.
 *   `wallet-topup`         `creditRiderWallet` (`:3937`) and its seeded
 *                          `{type:'credit', amount, balanceAfter}` rows
 *                          (`:2595`). Money in that buys no trip yet.
 *
 * Closed. A fifth kind needs a label key, a fixture and a facet entry, so it is
 * a finding for product-designer rather than a string a screen adds.
 */
export type PaymentKind =
  | 'subscription-charge'
  | 'quick-ride-fare'
  | 'wallet-topup'
  | 'captain-payout'

export const PAYMENT_KINDS: readonly PaymentKind[] = [
  'subscription-charge',
  'quick-ride-fare',
  'wallet-topup',
  'captain-payout',
]

/**
 * Which way the money moved, from Eyvar's point of view.
 *
 * `inbound` — a rider paid. `outbound` — Eyvar paid a captain.
 *
 * Not derivable from `kind` on purpose: it is the field a money column signs
 * itself from, and a screen that switched on `kind === 'captain-payout'` would
 * have to be edited the day a fifth kind arrives.
 */
export type PaymentDirection = 'inbound' | 'outbound'

/**
 * The only outbound kind today. Stated as data so a screen asks the domain
 * rather than hardcoding the one exception.
 */
export function paymentDirectionFor(kind: PaymentKind): PaymentDirection {
  return kind === 'captain-payout' ? 'outbound' : 'inbound'
}

export interface Payment {
  /** `PAY-5510`, `PAY-W640`, `PAY-7043`. */
  id: string
  kind: PaymentKind
  direction: PaymentDirection
  /**
   * Where the money has got to. See `types/ledger.ts` — same union, same tone
   * table, and `isPendingSettlement` decides the same way it does for a
   * posting.
   */
  settlement: SettlementState

  /* ── the two counterparties, never one polymorphic `entity` ──────────── */
  /** The rider who paid. `null` on a captain payout. */
  riderId: string | null
  riderName: string | null
  /**
   * The captain being paid, or the captain who drove the trip that was paid
   * for. `null` when neither applies — a wallet top-up has no captain.
   */
  captainId: string | null
  captainName: string | null

  /* ── what it was for ─────────────────────────────────────────────────── */
  /** The trip whose `paymentId` names this record. `null` on a top-up or a payout. */
  tripId: string | null
  /** The plan this charge belongs to. `null` on a quick ride. Legacy puts both in one field. */
  subscriptionId: string | null

  /* ── money · integer halalas, positive, sign carried by `direction` ──── */
  /** Gross, as the rider was charged or the captain was paid. Never negative, never zero on a real payment. */
  amountHalalas: Halalas
  /**
   * The VAT **included in** `amountHalalas`, as the residual — `total −
   * round(total / (1 + rate))` — so subtotal and VAT sum to the total exactly
   * and neither is rounded independently (M-3, AC-338/AC-345, and the rule
   * `CreditNote` already follows).
   *
   * `0` where VAT does not apply: a captain payout and a wallet top-up are not
   * sales. Subtotal is **derived** (`amount − vat`) and is deliberately not a
   * field — a third stored number is a third chance for the three to disagree.
   */
  vatHalalas: Halalas
  /**
   * The processor's cut — the first data behind `expense.gateway_fees`, an
   * account §3.8 added and nothing has ever posted to.
   *
   * `0` on a wallet-funded payment and on a payout, where no gateway is
   * involved. **The rates the fixtures use are illustrative**; the real fee
   * schedule is Finance's and per-gateway, and when it lands it changes the
   * fixture, not this field.
   */
  gatewayFeeHalalas: Halalas
  /**
   * How much of this payment has been refunded, across all refunds against it.
   * `0` on most rows; equal to `amountHalalas` on a fully refunded one.
   *
   * Server-summed rather than derived in the browser, because the refunds are
   * separate documents and a partial-refund figure computed from whichever
   * refunds happened to be on the current page is wrong on page two. Legacy has
   * no equivalent — it flips `status` to `'Refunded'` and loses the amount.
   */
  refundedHalalas: Halalas

  /* ── the instrument ──────────────────────────────────────────────────── */
  /**
   * Foreign key into `paymentGatewayFixtures` — `mada` · `visa` · `apple_pay` ·
   * `bank_transfer` · `stc_pay` · `tabby`. **`null` is real**: a wallet-funded
   * ride touched no processor, and so is a payout that never left the books.
   *
   * This field is D-F16's fix. `gatewayStats` (`:7457`) attributes volume by
   * prefix-matching the display string; an id cannot be renamed out from under
   * its own volume.
   */
  gatewayId: string | null
  /** `'4821'`. `null` for Apple Pay, a bank transfer and anything with no card behind it. */
  instrumentLast4: string | null
  /** The processor's own reference, for a support agent reading a gateway console. `null` before authorisation. */
  gatewayReference: string | null

  /* ── three instants, because legacy's one display string was three ───── */
  /** When the charge was raised. Always set — a payment exists from the attempt onward. */
  initiatedAt: IsoDateTime
  /** When money actually moved. `null` on `pending`, `authorised`, `failed` and `voided`. */
  capturedAt: IsoDateTime | null
  /** When the gateway settled it to Eyvar. `null` while `isPendingSettlement`, and on every failure state. */
  settledAt: IsoDateTime | null

  /* ── the documents on either side ────────────────────────────────────── */
  /**
   * The VAT invoice this payment produced. **`null` is a value**: nothing is
   * invoiced until money is captured.
   *
   * It is what `CreditNote.againstInvoice` matches on, and it is why AC-356 /
   * AC-357 are now testable: legacy falls back to *the first paid payment for
   * that rider* when it cannot match (`:15857`) and still marks the note
   * linked. With an invoice number on the payment, "no match" is a fact rather
   * than a guess.
   */
  invoiceNumber: string | null
  /**
   * The `LedgerPosting` that recorded this payment — the other end of
   * `PostingSourceType: 'payment'`. `null` when no money moved, which is
   * exactly the case `WTX-0005` documents: an authorisation moves nothing, so
   * it has no journal entry and the payment has no posting.
   */
  postingId: string | null

  /* ── the two states with no badge (R5a) ──────────────────────────────── */
  /** Machine-readable, from the processor. Set **iff** `settlement === 'failed'`. */
  failureCode: string | null
  /** Keyed, never a concatenated sentence (§11). Set iff `settlement === 'failed'`. */
  failureReason: LocalisedText | null
  /**
   * When Finance escalated it. Set **iff** `settlement === 'escalated'`.
   *
   * `escalated` is one of only two states `SETTLEMENT_BADGE_TONE` returns
   * `null` for, and until this file there was **no record anywhere in the repo
   * in that state**, so the row treatment R5a mandates in place of a red badge
   * had never rendered.
   */
  escalatedAt: IsoDateTime | null
  /** Keyed. Why it was escalated. `null` unless `escalated`. */
  escalationReason: LocalisedText | null
}
