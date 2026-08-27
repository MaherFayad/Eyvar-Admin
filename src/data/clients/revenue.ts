/**
 * Financials › Revenue & Refunds.
 *
 * Five views on one route: `All postings` (the `contra.refunds` and
 * `revenue.fares` ledgers), `Revenue`, `Refunds`, `Credit notes` and
 * `Contribution margin`. Views are **controls, not levels** (foundation §3.8
 * rule 3), so they ride as `?view=` and never become a second endpoint.
 */

import { DATA_SOURCE } from '../config'
import { EYVAR_NOW, toInstant } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import { computeFacets, runQuery, type QueryShape } from '../mock/query'
import {
  creditNoteFixtures,
  FINANCIALS_PERIOD,
  refundFixtures,
  revenueByPlanFixtures,
} from '../fixtures/financials'
import { CURRENT_USER_ID, teamUserFixtures } from '../fixtures/teamUsers'
import { riderFixtures } from '../fixtures/riders'
import {
  ApiError,
  type Facets,
  type Paginated,
  type QueryParams,
} from '../types/common'
import type {
  CreditNote,
  FinancialsPeriod,
  Refund,
  RefundDestination,
  RevenueByPlanRow,
} from '../types/financials'
import type { Ledger } from '../types/ledger'
import { appendAudit } from './audit'
import { buildLedger, postEntry } from './ledger'
import { http } from './http'

export const REVENUE_OPERATIONS = {
  ledger: 'revenue.ledger',
  refunds: 'revenue.refunds',
  refundFacets: 'revenue.refundFacets',
  creditNotes: 'revenue.creditNotes',
  byPlan: 'revenue.byPlan',
  issueRefund: 'revenue.issueRefund',
} as const

/* ─────────────────── session state ──────────────────────────── */

let sessionRefunds: Refund[] = []
let sessionCreditNotes: CreditNote[] = []
let refundSequence = refundFixtures.length
let creditNoteSequence = creditNoteFixtures.length

export function resetRevenue(): void {
  sessionRefunds = []
  sessionCreditNotes = []
  refundSequence = refundFixtures.length
  creditNoteSequence = creditNoteFixtures.length
}

const allRefunds = (): Refund[] => [...refundFixtures, ...sessionRefunds]
/** Fixture plus session, for the Overview banner count that used to read the fixture array. */
export const allCreditNotes = (): CreditNote[] => [...creditNoteFixtures, ...sessionCreditNotes]

/* ───────────────────────── refunds ──────────────────────────── */

const refundShape: QueryShape<Refund> = {
  searchable: [(r) => r.id, (r) => r.riderName, (r) => r.riderId, (r) => r.relatedId],
  sortable: {
    id: (r) => r.id,
    issuedAt: (r) => r.issuedAt,
    amountHalalas: (r) => r.amountHalalas,
    riderName: (r) => r.riderName,
  },
  filterable: {
    id: (r) => r.id,
    riderId: (r) => r.riderId,
    riderName: (r) => r.riderName,
    reasonCode: (r) => r.reasonCode,
    destination: (r) => r.destination,
    processedByUserId: (r) => r.processedByUserId,
    settlement: (r) => r.settlement,
    /** `true` on a refund with no traceable payment — the warning row (§6.3). */
    unsourced: (r) => r.sourcePaymentId === null,
    amountHalalas: (r) => r.amountHalalas,
    issuedAt: (r) => toInstant(r.issuedAt),
  },
  facetable: ['reasonCode', 'destination', 'processedByUserId', 'settlement'],
  views: {
    all: () => true,
    'to-wallet': (r) => r.destination === 'wallet',
    'to-instrument': (r) => r.destination === 'instrument',
    unsourced: (r) => r.sourcePaymentId === null,
  },
}

/**
 * GET /api/v1/refunds
 *   params: q · page · pageSize · sort · filter · view=all|to-wallet|to-instrument|unsourced
 *   -> Paginated<Refund>
 */
export async function listRefunds(
  params: QueryParams = {},
  signal?: AbortSignal,
): Promise<Paginated<Refund>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<Refund>>('/refunds', { ...params }, { signal })
  }
  return mock(REVENUE_OPERATIONS.refunds, signal, () => runQuery(allRefunds(), params, refundShape))
}

/**
 * GET /api/v1/refunds/facets
 *   params: view
 *   -> Facets
 */
export async function getRefundFacets(view?: string | null, signal?: AbortSignal): Promise<Facets> {
  if (DATA_SOURCE === 'http') {
    return http.get<Facets>('/refunds/facets', { view: view ?? undefined }, { signal })
  }
  return mock(REVENUE_OPERATIONS.refundFacets, signal, () =>
    computeFacets(allRefunds(), refundShape, view),
  )
}

export interface IssueRefundInput {
  riderId: string
  amountHalalas: number
  reasonCode: string
  destination: RefundDestination
  /** The payment or subscription this refund relates to. `null` is legitimate. */
  relatedId?: string | null
  sourcePaymentId?: string | null
  /**
   * The operator has seen a matching earlier refund and says this one is a
   * different act. **Q-F3**: what distinguishes a duplicate from two legitimate
   * identical refunds is an unanswered product question, and the conservative
   * interim rule is that the *operator's confirmation* is the distinguishing
   * input — not elapsed time (AC-358).
   */
  confirmDuplicate?: boolean
}

/**
 * POST /api/v1/refunds
 *   body: IssueRefundInput
 *   -> { refund: Refund, creditNote: CreditNote }
 *   409 when an identical unconfirmed refund already exists
 *   422 on a non-positive amount
 *
 * **One refund lands in exactly one place** — the payment instrument or the
 * rider wallet, never both. Legacy calls `recordRefund` *and*
 * `creditRiderWallet` with the same amount (`:5562`–`:5563`) and the business
 * is charged twice for one refund (`12a` R1, AC-337).
 *
 * **It mints exactly one credit note**, whose VAT is the residual so subtotal
 * and VAT sum to the total to the halala (AC-338, M-3). A refund with no credit
 * note is a hole in the VAT return.
 *
 * `againstInvoice` is **never guessed**: when nothing matches, the note is
 * `unlinked: true`, full stop. Legacy falls back to *the first paid payment for
 * that rider* (`:15857`) and marks the note linked — a credit note against an
 * unrelated invoice, silently "correct" (AC-356, AC-357).
 *
 * **Not implemented here, and deliberately: the authority ceiling.** Q-F3 has
 * not been answered, so no ceiling is invented. `recordRefund` validates only
 * `amount > 0` today (`:3177`, `12a` R3) and this matches that, minus the
 * double-post and plus the duplicate check.
 *
 * ## What it posts, and the false tick that hid the fact that it did not
 *
 * | Leg | Ledger | Direction | Amount |
 * |---|---|---|---|
 * | 1 | `contra.refunds` (platform) | debit | the **net** |
 * | 2 | `liability.wallet` (the rider) | credit | the gross — **wallet destination only** |
 * | GL | `tax.vat_output` | debit | the VAT |
 * | GL | `cash.gateway` | credit | the gross — **instrument destination only** |
 *
 * `issueRefund` set `refund.postingId` to a string and wrote **no posting** —
 * and the suite ticked AC-337 by asserting that string, `expect(refund.postingId)
 * .toBe('REF-0004-P')`. A green line asserting the *name* of a row that does not
 * exist. `postingId` now names the posting `postEntry` actually wrote, which is
 * what makes the assertion mean what it always read as meaning.
 *
 * **One refund, one destination**, and the destination decides which credit leg
 * exists — never both (`12a` R1, AC-337). VAT is the residual, so the two debit
 * legs sum to the gross to the halala (M-3).
 */
export async function issueRefund(
  input: IssueRefundInput,
  signal?: AbortSignal,
): Promise<{ refund: Refund; creditNote: CreditNote }> {
  if (DATA_SOURCE === 'http') {
    return http.post('/refunds', input, { signal })
  }
  return mockMutation(REVENUE_OPERATIONS.issueRefund, signal, () => {
    if (!Number.isInteger(input.amountHalalas) || input.amountHalalas <= 0) {
      throw new ApiError({
        status: 422,
        kind: 'validation',
        code: 'amount_invalid',
        message: 'Enter an amount above zero, in whole halalas',
        details: [{ field: 'amountHalalas', code: 'positive', message: 'Enter an amount' }],
        retryable: false,
      })
    }
    const rider = riderFixtures.find((r) => r.id === input.riderId)
    if (!rider) throw notFound('rider', input.riderId)

    const duplicate = allRefunds().find(
      (r) =>
        r.riderId === input.riderId &&
        r.amountHalalas === input.amountHalalas &&
        r.reasonCode === input.reasonCode &&
        (r.relatedId ?? null) === (input.relatedId ?? null),
    )
    if (duplicate && !input.confirmDuplicate) {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'possible_duplicate',
        /* Names the earlier refund so the confirmation can show it. The legacy
           key has **no time component** (`:19963`), so two genuinely distinct
           identical refunds collapse into one and the second is silently
           suppressed with a warn toast (D-F13). */
        message: `A matching refund already exists: ${duplicate.id}`,
        details: [{ field: 'confirmDuplicate', code: 'confirm', message: duplicate.id }],
        retryable: false,
      })
    }

    const me = teamUserFixtures.find((u) => u.id === CURRENT_USER_ID)!
    refundSequence += 1
    creditNoteSequence += 1
    const id = `REF-${String(refundSequence).padStart(4, '0')}`
    const creditNoteId = `CN-${String(creditNoteSequence).padStart(4, '0')}`

    /* VAT as the residual: `net = round(gross / 1.15)`, `vat = gross − net`
       (M-3, `:19966`). Never `round(gross × 0.15 / 1.15)`. */
    const subtotalHalalas = Math.round(input.amountHalalas / 1.15)
    const vatHalalas = input.amountHalalas - subtotalHalalas

    const refund: Refund = {
      id,
      issuedAt: EYVAR_NOW,
      riderId: rider.id,
      riderName: rider.name,
      amountHalalas: input.amountHalalas,
      reasonCode: input.reasonCode,
      destination: input.destination,
      sourcePaymentId: input.sourcePaymentId ?? null,
      relatedId: input.relatedId ?? null,
      processedByUserId: me.id,
      processedByUserName: me.name,
      postingId: `${id}-P`,
      creditNoteId,
      settlement: 'settled',
    }
    const creditNote: CreditNote = {
      id: creditNoteId,
      noteNumber: `EYV-CN-2026-${String(creditNoteSequence).padStart(6, '0')}`,
      refundId: id,
      buyerId: rider.id,
      buyerName: rider.name,
      subtotalHalalas,
      vatHalalas,
      totalHalalas: input.amountHalalas,
      againstInvoice: input.sourcePaymentId ? `EYV-2026-${input.sourcePaymentId.slice(-6)}` : null,
      againstPaymentId: input.sourcePaymentId ?? null,
      unlinked: !input.sourcePaymentId,
      issuedAt: EYVAR_NOW,
      issuedByUserId: me.id,
    }

    sessionRefunds = [...sessionRefunds, refund]
    sessionCreditNotes = [...sessionCreditNotes, creditNote]

    postEntry({
      type: 'refund',
      reference: `refund|${rider.id}|${input.amountHalalas}|${input.reasonCode}`,
      meta: { refundId: id, riderId: rider.id, destination: input.destination },
      postings: [
        {
          /* Named by the document, so `Refund.postingId` resolves. */
          id: refund.postingId,
          idPrefix: `${id}-P`,
          subjectAccount: 'contra.refunds',
          subjectId: null,
          direction: 'debit',
          amountHalalas: subtotalHalalas,
          description: {
            key: 'fin.posting.refundIssued',
            params: { reference: id, riderName: rider.name },
          },
          reference: id,
          sourceType: 'refund',
          sourceId: id,
          kind: 'refund',
          actorId: me.id,
          reasonCode: input.reasonCode,
        },
        {
          idPrefix: `WTX-${rider.id.replace(/^RDR-/, '')}`,
          subjectAccount: 'liability.wallet',
          subjectId: rider.id,
          direction: 'credit',
          amountHalalas: input.destination === 'wallet' ? input.amountHalalas : 0,
          description: { key: 'fin.posting.refundToWallet', params: { reference: id } },
          reference: id,
          sourceType: 'refund',
          sourceId: id,
          kind: 'refund',
          actorId: me.id,
          reasonCode: input.reasonCode,
        },
      ],
      counterLines: [
        { account: 'tax.vat_output', direction: 'debit', amountHalalas: vatHalalas },
        {
          account: 'cash.gateway',
          direction: 'credit',
          amountHalalas: input.destination === 'wallet' ? 0 : input.amountHalalas,
        },
      ],
    })

    /* `recordRefund` writes no audit entry of its own (`12a` R16). Closed. */
    appendAudit({
      action: 'refund.issue',
      subjectType: 'rider',
      subjectId: rider.id,
      amountHalalas: input.amountHalalas,
      reasonCode: input.reasonCode,
      note: null,
      detail: {
        key: 'fin.audit.refundIssued',
        params: { reference: id, destination: input.destination },
      },
    })

    return { refund, creditNote }
  })
}

/* ─────────────────────── credit notes ───────────────────────── */

const creditNoteShape: QueryShape<CreditNote> = {
  searchable: [(n) => n.noteNumber, (n) => n.buyerName, (n) => n.refundId, (n) => n.againstInvoice],
  sortable: {
    noteNumber: (n) => n.noteNumber,
    issuedAt: (n) => n.issuedAt,
    totalHalalas: (n) => n.totalHalalas,
  },
  filterable: {
    id: (n) => n.id,
    buyerId: (n) => n.buyerId,
    refundId: (n) => n.refundId,
    unlinked: (n) => n.unlinked,
    issuedByUserId: (n) => n.issuedByUserId,
    issuedAt: (n) => toInstant(n.issuedAt),
    totalHalalas: (n) => n.totalHalalas,
  },
  facetable: ['issuedByUserId'],
  views: {
    all: () => true,
    /* The population the page banner counts (AC-356). */
    unlinked: (n) => n.unlinked,
  },
}

/**
 * GET /api/v1/credit-notes
 *   params: q · page · pageSize · sort · filter · view=all|unlinked
 *   -> Paginated<CreditNote>
 */
export async function listCreditNotes(
  params: QueryParams = {},
  signal?: AbortSignal,
): Promise<Paginated<CreditNote>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<CreditNote>>('/credit-notes', { ...params }, { signal })
  }
  return mock(REVENUE_OPERATIONS.creditNotes, signal, () =>
    runQuery(allCreditNotes(), params, creditNoteShape),
  )
}

/* ────────────────────── revenue by plan ─────────────────────── */

/**
 * GET /api/v1/financials/revenue-by-plan
 *   params: from · to
 *   -> RevenueByPlanRow[]
 *
 * `platformPercent` is **derived** — `platform / gross` (M-4) — and is not on
 * the wire. A percentage is computed from two posted amounts, never stored.
 */
export async function listRevenueByPlan(
  period: FinancialsPeriod = FINANCIALS_PERIOD,
  signal?: AbortSignal,
): Promise<RevenueByPlanRow[]> {
  if (DATA_SOURCE === 'http') {
    return http.get<RevenueByPlanRow[]>(
      '/financials/revenue-by-plan',
      { from: period.start, to: period.end },
      { signal },
    )
  }
  return mock(REVENUE_OPERATIONS.byPlan, signal, () => revenueByPlanFixtures)
}

/* ────────────────────── the refunds ledger ──────────────────── */

/**
 * GET /api/v1/ledgers/contra.refunds
 *   params: from · to · page · pageSize
 *   -> Ledger
 *
 * A platform-level ledger: `subjectId` is null and there is no party. Its rows
 * carry the **net** legs, because a GL account's ledger balance must equal the
 * trial balance's figure for that account; each refund *document*'s gross is on
 * `Refund.amountHalalas` and its VAT leg is on `tax.vat_output`.
 */
export async function getRefundsLedger(
  period: FinancialsPeriod = FINANCIALS_PERIOD,
  signal?: AbortSignal,
): Promise<Ledger> {
  if (DATA_SOURCE === 'http') {
    return http.get<Ledger>(
      '/ledgers/contra.refunds',
      { from: period.start, to: period.end },
      { signal },
    )
  }
  return mock(REVENUE_OPERATIONS.ledger, signal, () =>
    buildLedger('contra.refunds', null, null, { from: period.start, to: period.end }),
  )
}
