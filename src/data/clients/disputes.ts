/**
 * Support › Disputes & Lost and Found.
 *
 * Built to the shape of `clients/tickets.ts`: `DATA_SOURCE` branch on every
 * operation, `mock` / `mockMutation` around every mock body, operation-id
 * constants, `Paginated<T>` envelopes, and a `reset` that puts both collections
 * back where they started.
 *
 * ## The resolution moves real money, through the operations that already exist
 *
 * The screen it replaces did not. `DisputesScreen.tsx:129` mapped the local
 * array to `status: 'resolved'` and named its refund argument `_refundHalalas`,
 * so a verdict that was supposed to move money moved none and nothing recorded
 * that it had not. There is no second refund path here either — this file calls
 * the two client operations that already own captain- and rider-side money:
 *
 * | claimant | outcome | operation | what it writes |
 * |---|---|---|---|
 * | rider | `full-refund` · `partial-refund` | `issueRefund` (`clients/revenue.ts`) | a `Refund`, a `CreditNote`, `Dr contra.refunds` + `Dr tax.vat_output` / `Cr liability.wallet`, and a `refund.issue` audit entry |
 * | rider | `goodwill-credit` | `adjustWallet` (`clients/wallets.ts`) | `Dr expense.goodwill` / `Cr liability.wallet`, the authority ceiling, and a `wallet.adjust` audit entry |
 * | captain | any paying outcome | `postEntry` (`clients/ledger.ts`) | `Dr expense.compensation` / `Cr liability.driver` |
 * | either | `declined` | — | nothing. That is the point of the verdict |
 *
 * **Why a goodwill credit is not `issueRefund`.** `issueRefund` mints a credit
 * note and debits `contra.refunds` **and** `tax.vat_output`: it reverses a fare
 * and reclaims the VAT on it. A goodwill credit reverses nothing — no fare was
 * wrong — so putting one through that path would file a VAT credit note against
 * a sale that still stands. `adjustWallet` is the operation for money the
 * platform gives rather than gives back, and it books to `expense.goodwill`
 * exactly as §3.8 says goodwill is booked.
 *
 * **Why a captain settlement is neither.** `issueRefund` looks its subject up in
 * `riderFixtures` and 404s on a captain id; `adjustWallet` is the rider wallet.
 * **The captain side has no credit operation at all** — `payouts.ts` can pay a
 * payout, hold escrow and apply or waive a deduction, and none of those is
 * settling a claim. So this file writes the entry itself with `postEntry`, the
 * same shared primitive `wallets.ts` and `revenue.ts` use. See FINDING 1 below;
 * that posting wants to move into a financials client the day one owns it.
 *
 * ## FINDING 1 — `expense.compensation` is labelled *Rider* compensation
 *
 * `types/ledger.ts:136`. It is the only expense account in the chart that means
 * *"we settled a claim"*, and the captain side of a claim has nowhere else to
 * go: `expense.driver_pay` is earnings and `expense.incentive` is a bonus.
 * Booking a captain's damage settlement to an account whose label says *Rider*
 * is the least wrong of the available answers and it is still wrong. For
 * product-owner and mock-data-engineer.
 *
 * ## FINDING 2 — `AuditAction` has no `dispute.resolve`
 *
 * `types/audit.ts:26` is a closed union and neither that file nor
 * `screens/financials/copy.ts` is in this agent's scope. The consequence, stated
 * rather than smoothed over: the two rider paths get an audit entry for free
 * from `issueRefund` and `adjustWallet`, and **the captain path gets a journal
 * entry and a `DisputeResolution` but no audit-log row.** Closing it is one
 * member on the union plus one `fin.audit.disputeSettled` key. For whoever owns
 * those two files.
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { EYVAR_NOW } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import { computeFacets, runQuery, type QueryShape } from '../mock/query'
import { ApiError, type Facets, type Paginated, type QueryParams } from '../types/common'
import {
  nextLostFoundStatus,
  outcomeMovesMoney,
  type Dispute,
  type DisputeClaimantType,
  type DisputeKind,
  type DisputeOutcome,
  type DisputeStatus,
  type LostFoundItem,
  type LostFoundStatus,
} from '../types/dispute'
import type { Refund } from '../types/financials'
import { http } from './http'
import { currentMockUserId } from './session'
import { postEntry } from './ledger'
import { issueRefund } from './revenue'
import { adjustWallet } from './wallets'
import { fixturesLoaded, onFixturesLoaded, type Fixtures } from '../mock/fixtures'

/* Late-bound fixture rows. `mock/fixtures.ts` says why this is not a static
   import: a static one pins seeded data into every build, including the http
   build that can never read it. Bound before any mock read, because `mock()`
   and `mockMutation()` await `loadFixtures()`. */
let disputeFixtures!: Fixtures['disputeFixtures']
let lostFoundFixtures!: Fixtures['lostFoundFixtures']
let teamUserFixtures!: Fixtures['teamUserFixtures']
onFixturesLoaded((f) => {
  disputeFixtures = f.disputeFixtures
  lostFoundFixtures = f.lostFoundFixtures
  teamUserFixtures = f.teamUserFixtures
  /* Seeded here rather than at module load: these locals are built from
     late-bound fixtures, which are undefined until the fixture chunk lands. */
  dynamicDisputes = [...disputeFixtures]
  dynamicLostFound = [...lostFoundFixtures]
})

export const DISPUTE_OPERATIONS = {
  list: 'disputes.list',
  get: 'disputes.get',
  facets: 'disputes.facets',
  claim: 'disputes.claim',
  resolve: 'disputes.resolve',
  lostFoundList: 'lostFound.list',
  lostFoundGet: 'lostFound.get',
  lostFoundAdvance: 'lostFound.advance',
} as const

/* Registered at module load, not on first call. `config.ts` says *"each client
   registers its ids here at module load"*, and `mock()` only registers when it
   runs — so an operation nobody has invoked yet is missing from a QA panel's
   list and from any validation of `?mockFail=`. Every id in this module is
   listed the moment the module is imported. */
registerOperations(...Object.values(DISPUTE_OPERATIONS))

export interface DisputeQuery extends QueryParams {
  status?: DisputeStatus
  kind?: DisputeKind
  claimantType?: DisputeClaimantType
}

export interface LostFoundQuery extends QueryParams {
  status?: LostFoundStatus
}

/* ─────────────────── mutable mock state ─────────────────────── */

let dynamicDisputes!: typeof disputeFixtures
let dynamicLostFound!: typeof lostFoundFixtures

export function resetDisputes(): void {
  /* Nothing seeded yet: the fixture chunk has not landed, so there is no
     state to reset and the rows this would read are still undefined. The
     binder in this module seeds fresh state when it does land. */
  if (!fixturesLoaded()) return
  dynamicDisputes = [...disputeFixtures]
  dynamicLostFound = [...lostFoundFixtures]
}

/* ────────────────────── query shapes ────────────────────────── */

/**
 * `facetable` is the list the Filter control sources its options from, and
 * every one of these fields has at least one row per value in the fixtures —
 * see the table in `fixtures/disputes.ts`. A facet whose value set can never
 * match is an invisible hole, so the fixture depth and this list are one
 * decision made twice.
 */
const disputeShape: QueryShape<Dispute> = {
  searchable: [
    (d) => d.id,
    (d) => d.claim,
    (d) => d.claimantName,
    (d) => d.claimantId,
    (d) => d.againstName,
    (d) => d.againstId,
    (d) => d.tripId,
    (d) => d.subscriptionId,
  ],
  sortable: {
    filedAt: (d) => d.filedAt,
    dueAt: (d) => d.dueAt,
    amountHalalas: (d) => d.amountHalalas,
    status: (d) => d.status,
    kind: (d) => d.kind,
    claimantName: (d) => d.claimantName,
  },
  filterable: {
    id: (d) => d.id,
    status: (d) => d.status,
    kind: (d) => d.kind,
    claimantType: (d) => d.claimantType,
    claimantId: (d) => d.claimantId,
    againstId: (d) => d.againstId,
    tripId: (d) => d.tripId,
    subscriptionId: (d) => d.subscriptionId,
    ownerId: (d) => d.ownerId,
    outcome: (d) => d.resolution?.outcome ?? null,
  },
  facetable: ['status', 'kind', 'claimantType', 'outcome'],
}

const lostFoundShape: QueryShape<LostFoundItem> = {
  searchable: [
    (l) => l.id,
    (l) => l.item,
    (l) => l.riderName,
    (l) => l.riderId,
    (l) => l.driverName,
    (l) => l.driverId,
    (l) => l.tripId,
  ],
  sortable: {
    reportedAt: (l) => l.reportedAt,
    updatedAt: (l) => l.updatedAt,
    status: (l) => l.status,
    item: (l) => l.item,
  },
  filterable: {
    id: (l) => l.id,
    status: (l) => l.status,
    riderId: (l) => l.riderId,
    driverId: (l) => l.driverId,
    tripId: (l) => l.tripId,
  },
  facetable: ['status'],
}

/* ──────────────────────── disputes ──────────────────────────── */

/**
 * GET /api/v1/disputes
 *   params: QueryParams + status · kind · claimantType
 *   -> Paginated<Dispute>
 */
export async function listDisputes(
  params: DisputeQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<Dispute>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<Dispute>>('/disputes', { ...params }, { signal })
  }
  return mock(DISPUTE_OPERATIONS.list, signal, () => runQuery(dynamicDisputes, params, disputeShape))
}

/**
 * GET /api/v1/disputes/facets
 *   -> Facets — field name -> [{ value, count }], count-descending
 *
 * The Filter control's option sets, from the data (F-6).
 */
export async function getDisputeFacets(signal?: AbortSignal): Promise<Facets> {
  if (DATA_SOURCE === 'http') {
    return http.get<Facets>('/disputes/facets', undefined, { signal })
  }
  return mock(DISPUTE_OPERATIONS.facets, signal, () =>
    computeFacets(dynamicDisputes, disputeShape),
  )
}

/**
 * GET /api/v1/disputes/:id
 *   -> Dispute
 *   404 when the id does not exist
 */
export async function getDispute(id: string, signal?: AbortSignal): Promise<Dispute> {
  if (DATA_SOURCE === 'http') {
    return http.get<Dispute>(`/disputes/${id}`, undefined, { signal })
  }
  return mock(DISPUTE_OPERATIONS.get, signal, () => {
    const row = dynamicDisputes.find((d) => d.id === id)
    if (!row) throw notFound('dispute', id)
    return row
  })
}

/**
 * POST /api/v1/disputes/:id/claim
 *   body: { userId }
 *   -> Dispute
 *   404 when the id does not exist
 *   409 when the dispute is already resolved
 *
 * Taking ownership moves an `open` claim to `under-review`, which is the only
 * way that status is reached — it is *"somebody is on it"*, not a separate
 * decision an operator makes.
 */
export async function claimDispute(
  id: string,
  userId: string,
  userName: string,
  signal?: AbortSignal,
): Promise<Dispute> {
  if (DATA_SOURCE === 'http') {
    return http.post<Dispute>(`/disputes/${id}/claim`, { userId }, { signal })
  }
  return mockMutation(DISPUTE_OPERATIONS.claim, signal, () => {
    const idx = dynamicDisputes.findIndex((d) => d.id === id)
    const existing = dynamicDisputes[idx]
    if (!existing) throw notFound('dispute', id)
    if (existing.status === 'resolved') throw alreadyResolved(existing)
    const updated: Dispute = {
      ...existing,
      ownerId: userId,
      ownerName: userName,
      status: existing.status === 'open' ? 'under-review' : existing.status,
    }
    dynamicDisputes = replaceAt(dynamicDisputes, idx, updated)
    return updated
  })
}

export interface ResolveDisputeInput {
  disputeId: string
  outcome: DisputeOutcome
  /**
   * Integer halalas. **Required, and validated here as well as in the modal.**
   * The old modal disabled its primary on `busy` alone, so choosing *Partial
   * refund* and leaving the amount blank produced `refundAmount = 0` with the
   * button still live — a confirmable 0.00 SAR settlement. Disabling the
   * control is the courtesy; refusing at the seam is the guarantee.
   */
  refundHalalas: number
  note?: string | null
}

export interface ResolveDisputeResult {
  dispute: Dispute
  /** The refund this resolution issued, when the rider path issued one. */
  refund: Refund | null
}

/**
 * POST /api/v1/disputes/:id/resolve
 *   body: { outcome, refundHalalas, note }
 *   -> { dispute, refund }
 *   409 when the dispute is already resolved
 *   422 on an amount that contradicts the outcome
 *   403 when a goodwill credit is above the operator's authority (`adjustWallet`)
 *
 * **The money moves before the verdict is recorded.** If the refund fails —
 * injected, over an authority ceiling, or a real 500 — the dispute is still
 * open and the operator can try again. The other order leaves a claim marked
 * settled with nothing behind it, which is the state this whole file exists to
 * stop being reachable.
 */
export async function resolveDispute(
  input: ResolveDisputeInput,
  signal?: AbortSignal,
): Promise<ResolveDisputeResult> {
  if (DATA_SOURCE === 'http') {
    return http.post<ResolveDisputeResult>(
      `/disputes/${input.disputeId}/resolve`,
      { outcome: input.outcome, refundHalalas: input.refundHalalas, note: input.note ?? null },
      { signal },
    )
  }

  /* 1 — validate against current state. Injectable as `disputes.resolve`, so a
         rigged failure here moves nothing at all. */
  const dispute = await mockMutation(DISPUTE_OPERATIONS.resolve, signal, () => {
    const row = dynamicDisputes.find((d) => d.id === input.disputeId)
    if (!row) throw notFound('dispute', input.disputeId)
    if (row.status === 'resolved') throw alreadyResolved(row)
    assertAmountMatchesOutcome(row, input)
    return row
  })

  /* 2 — the money, through the operation that owns it. */
  let refund: Refund | null = null
  if (outcomeMovesMoney(input.outcome)) {
    refund = await settle(dispute, input, signal)
  }

  /* 3 — the verdict, recorded only now. */
  const me = teamUserFixtures.find((u) => u.id === currentMockUserId())
  const idx = dynamicDisputes.findIndex((d) => d.id === dispute.id)
  const resolved: Dispute = {
    ...dispute,
    status: 'resolved',
    ownerId: dispute.ownerId ?? currentMockUserId(),
    ownerName: dispute.ownerName ?? me?.name ?? currentMockUserId(),
    resolution: {
      outcome: input.outcome,
      refundHalalas: outcomeMovesMoney(input.outcome) ? input.refundHalalas : 0,
      refundId: refund?.id ?? null,
      note: input.note?.trim() ? input.note.trim() : null,
      resolvedAt: EYVAR_NOW,
      resolvedByUserId: currentMockUserId(),
      resolvedByUserName: me?.name ?? currentMockUserId(),
    },
  }
  dynamicDisputes = replaceAt(dynamicDisputes, idx, resolved)
  return { dispute: resolved, refund }
}

/**
 * The three paying paths. Returns the `Refund` where one was minted and `null`
 * where the money moved by another mechanism — a wallet adjustment and a
 * captain settlement are both real movements and neither is a refund document.
 */
async function settle(
  dispute: Dispute,
  input: ResolveDisputeInput,
  signal?: AbortSignal,
): Promise<Refund | null> {
  const reasonCode = `dispute_${dispute.kind.replace(/-/g, '_')}`

  if (dispute.claimantType === 'captain') {
    /* FINDING 1 — no captain-side credit operation exists. Written here with
       the shared primitive so the books balance; it belongs in a financials
       client the day one owns a captain settlement. */
    postEntry({
      type: 'dispute_settlement',
      reference: `dispute|${dispute.id}`,
      meta: { disputeId: dispute.id, captainId: dispute.claimantId, outcome: input.outcome },
      postings: [
        {
          idPrefix: `DSP-${dispute.claimantId.replace(/^DRV-/, '')}`,
          subjectAccount: 'liability.driver',
          subjectId: dispute.claimantId,
          direction: 'credit',
          amountHalalas: input.refundHalalas,
          description: {
            key: 'dispute.posting.settlement',
            params: { disputeId: dispute.id },
          },
          reference: dispute.id,
          sourceType: 'adjustment',
          sourceId: dispute.id,
          kind: 'adjustment',
          actorId: currentMockUserId(),
          reasonCode,
        },
      ],
      counterLines: [
        {
          account: 'expense.compensation',
          direction: 'debit',
          amountHalalas: input.refundHalalas,
        },
      ],
    })
    return null
  }

  if (input.outcome === 'goodwill-credit') {
    /* Not `issueRefund`: nothing is being given back, so nothing is a credit
       note and no VAT is reclaimed. `adjustWallet` also applies the authority
       ceiling, which is why a large goodwill gesture can legitimately 403. */
    await adjustWallet(
      {
        riderId: dispute.claimantId,
        amountHalalas: input.refundHalalas,
        direction: 'credit',
        reasonCode,
        note: input.note ?? undefined,
      },
      signal,
    )
    return null
  }

  const { refund } = await issueRefund(
    {
      riderId: dispute.claimantId,
      amountHalalas: input.refundHalalas,
      reasonCode,
      /* A dispute settlement lands in the wallet. The instrument path needs the
         original payment, and a dispute record does not carry one — guessing it
         is the `againstInvoice` fabrication `issueRefund` refuses to make. */
      destination: 'wallet',
      relatedId: dispute.tripId ?? dispute.subscriptionId ?? null,
      sourcePaymentId: null,
      /* Two disputes for the same rider, kind and amount are two claims, not
         one duplicate — the dispute id is what distinguishes them and
         `issueRefund`'s duplicate key cannot see it. */
      confirmDuplicate: true,
    },
    signal,
  )
  return refund
}

/**
 * The amount and the outcome have to agree, and neither the modal nor the
 * screen is the last word on that.
 *
 *   - `declined` moves nothing, so any non-zero amount is a contradiction.
 *   - every other outcome moves money, so `0` is one too — that is the blank
 *     *Partial refund* the old modal would confirm.
 *   - nothing may exceed the claim. A settlement above the amount claimed is
 *     not generous, it is unreconcilable.
 */
function assertAmountMatchesOutcome(dispute: Dispute, input: ResolveDisputeInput): void {
  const amount = input.refundHalalas
  if (!Number.isInteger(amount)) {
    throw validation('amount_invalid', 'A settlement is a whole number of halalas', 'refundHalalas')
  }
  if (input.outcome === 'declined') {
    if (amount !== 0) {
      throw validation(
        'amount_not_zero',
        'A declined claim moves no money',
        'refundHalalas',
      )
    }
    return
  }
  if (amount <= 0) {
    throw validation(
      'amount_required',
      'Enter an amount above zero',
      'refundHalalas',
    )
  }
  if (amount > dispute.amountHalalas) {
    throw validation(
      'amount_above_claim',
      `A settlement cannot exceed the ${dispute.amountHalalas} halalas claimed`,
      'refundHalalas',
    )
  }
}

/* ─────────────────────── lost and found ─────────────────────── */

/**
 * GET /api/v1/lost-found
 *   params: QueryParams + status
 *   -> Paginated<LostFoundItem>
 */
export async function listLostFound(
  params: LostFoundQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<LostFoundItem>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<LostFoundItem>>('/lost-found', { ...params }, { signal })
  }
  return mock(DISPUTE_OPERATIONS.lostFoundList, signal, () =>
    runQuery(dynamicLostFound, params, lostFoundShape),
  )
}

/**
 * GET /api/v1/lost-found/:id
 *   -> LostFoundItem
 *   404 when the id does not exist
 */
export async function getLostFoundItem(id: string, signal?: AbortSignal): Promise<LostFoundItem> {
  if (DATA_SOURCE === 'http') {
    return http.get<LostFoundItem>(`/lost-found/${id}`, undefined, { signal })
  }
  return mock(DISPUTE_OPERATIONS.lostFoundGet, signal, () => {
    const row = dynamicLostFound.find((l) => l.id === id)
    if (!row) throw notFound('lost property report', id)
    return row
  })
}

export interface AdvanceLostFoundInput {
  id: string
  /** Recorded on the transition — where the handover happens, or how. */
  handoverNote?: string | null
}

/**
 * POST /api/v1/lost-found/:id/advance
 *   -> LostFoundItem
 *   409 when the item is already returned
 *   422 when the next step needs a captain and the report has none
 *
 * **The ladder is `LOST_FOUND_FLOW`, not a chain of ternaries.** The screen it
 * replaces derived the next status inline from four states that had no declared
 * order, so the flow existed in one expression and nothing could check it.
 */
export async function advanceLostFoundItem(
  input: AdvanceLostFoundInput,
  signal?: AbortSignal,
): Promise<LostFoundItem> {
  if (DATA_SOURCE === 'http') {
    return http.post<LostFoundItem>(
      `/lost-found/${input.id}/advance`,
      { handoverNote: input.handoverNote ?? null },
      { signal },
    )
  }
  return mockMutation(DISPUTE_OPERATIONS.lostFoundAdvance, signal, () => {
    const idx = dynamicLostFound.findIndex((l) => l.id === input.id)
    const existing = dynamicLostFound[idx]
    if (!existing) throw notFound('lost property report', input.id)

    const next = nextLostFoundStatus(existing.status)
    if (next === null) {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'already_returned',
        message: `${existing.id} has already been returned`,
        retryable: false,
      })
    }
    /* The step is "ask the captain to check the vehicle". With no captain on
       the report there is nobody to ask, and the seam refuses rather than
       moving the item to a state that claims somebody is holding it. */
    if (next === 'with-captain' && existing.driverId === null) {
      throw validation(
        'no_captain_on_report',
        'This report names no captain, so nobody can be asked to check the vehicle',
        'driverId',
      )
    }

    const updated: LostFoundItem = {
      ...existing,
      status: next,
      updatedAt: EYVAR_NOW,
      handoverNote: input.handoverNote?.trim() ? input.handoverNote.trim() : existing.handoverNote,
    }
    dynamicLostFound = replaceAt(dynamicLostFound, idx, updated)
    return updated
  })
}

/* ──────────────────────── helpers ───────────────────────────── */

function replaceAt<T>(rows: readonly T[], index: number, row: T): T[] {
  const out = rows.slice()
  out[index] = row
  return out
}

function alreadyResolved(dispute: Dispute): ApiError {
  return new ApiError({
    status: 409,
    kind: 'conflict',
    code: 'already_resolved',
    message: `${dispute.id} was resolved on ${dispute.resolution?.resolvedAt ?? EYVAR_NOW}`,
    retryable: false,
  })
}

function validation(code: string, message: string, field: string): ApiError {
  return new ApiError({
    status: 422,
    kind: 'validation',
    code,
    message,
    details: [{ field, code, message }],
    retryable: false,
  })
}
