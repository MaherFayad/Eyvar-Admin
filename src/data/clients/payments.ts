/**
 * Payments — the resource 119 trips, two refunds and two credit notes have been
 * pointing at with nothing behind it.
 *
 * There is no *"Payments"* sub-tab: this client serves the `payments` section
 * of the 360° profile (`SECTIONS` in `clients/profile.ts` lists it on riders,
 * captains, trips, subscriptions and corporate accounts), the payment identity
 * card behind `?entity=PAY-*`, and the gateway attribution Ledger & Payment
 * Controls needs. Everything it exposes is a query over one collection, so it
 * is one shape and four operations rather than five bespoke lookups.
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { toInstant } from '../mock/clock'
import { mock, notFound } from '../mock/delay'
import { computeFacets, runQuery, type QueryShape } from '../mock/query'
import type { Facets, Paginated, QueryParams } from '../types/common'
import { isPendingSettlement, type SettlementState } from '../types/ledger'
import type { Payment, PaymentDirection, PaymentKind } from '../types/payment'
import { http } from './http'
import { onFixturesLoaded, type Fixtures } from '../mock/fixtures'

/* Late-bound fixture rows. `mock/fixtures.ts` says why this is not a static
   import: a static one pins seeded data into every build, including the http
   build that can never read it. Bound before any mock read, because `mock()`
   and `mockMutation()` await `loadFixtures()`. */
let paymentFixtures!: Fixtures['paymentFixtures']
onFixturesLoaded((f) => {
  paymentFixtures = f.paymentFixtures
})

export const PAYMENT_OPERATIONS = {
  facets: 'payments.facets',
  list: 'payments.list',
  get: 'payments.get',
  listForEntity: 'payments.listForEntity',
} as const

/* Registered at module load, not on first call. `config.ts` says *"each client
   registers its ids here at module load"*, and `mock()` only registers when it
   runs — so an operation nobody has invoked yet is missing from a QA panel's
   list and from any validation of `?mockFail=`. Every id in this module is
   listed the moment the module is imported. */
registerOperations(...Object.values(PAYMENT_OPERATIONS))

export interface PaymentQuery extends QueryParams {
  kind?: PaymentKind
  settlement?: SettlementState
  direction?: PaymentDirection
  riderId?: string
  captainId?: string
  tripId?: string
  subscriptionId?: string
  gatewayId?: string
}

const paymentShape: QueryShape<Payment> = {
  searchable: [
    (p) => p.id,
    (p) => p.riderName,
    (p) => p.captainName,
    (p) => p.tripId,
    (p) => p.subscriptionId,
    (p) => p.invoiceNumber,
    (p) => p.gatewayReference,
  ],
  sortable: {
    id: (p) => p.id,
    amountHalalas: (p) => p.amountHalalas,
    vatHalalas: (p) => p.vatHalalas,
    gatewayFeeHalalas: (p) => p.gatewayFeeHalalas,
    refundedHalalas: (p) => p.refundedHalalas,
    riderName: (p) => p.riderName,
    captainName: (p) => p.captainName,
    settlement: (p) => p.settlement,
    initiatedAt: (p) => p.initiatedAt,
    capturedAt: (p) => p.capturedAt,
    settledAt: (p) => p.settledAt,
  },
  filterable: {
    /* identity — text */
    id: (p) => p.id,
    riderName: (p) => p.riderName,
    captainName: (p) => p.captainName,
    invoiceNumber: (p) => p.invoiceNumber,
    gatewayReference: (p) => p.gatewayReference,
    instrumentLast4: (p) => p.instrumentLast4,

    /* closed sets — options via `getPaymentFacets` */
    kind: (p) => p.kind,
    direction: (p) => p.direction,
    settlement: (p) => p.settlement,
    /**
     * The foreign key, not the display string. D-F16: `gatewayStats` (`:7457`)
     * attributes volume by prefix-matching `'Mada ···2210'`, so renaming a
     * gateway silently reattributes it. An id cannot be renamed out from under
     * its own volume.
     */
    gatewayId: (p) => p.gatewayId,

    /* relations */
    riderId: (p) => p.riderId,
    captainId: (p) => p.captainId,
    tripId: (p) => p.tripId,
    subscriptionId: (p) => p.subscriptionId,
    postingId: (p) => p.postingId,

    /* booleans, each a question an operator actually asks */
    /** `PENDING_SETTLEMENTS` — the rows excluded from a balance (AC-312). */
    pending: (p) => isPendingSettlement(p.settlement),
    refunded: (p) => p.refundedHalalas > 0,
    fullyRefunded: (p) => p.refundedHalalas >= p.amountHalalas && p.amountHalalas > 0,
    /** Captured but never settled. The reconciliation backlog. */
    unsettled: (p) => p.capturedAt !== null && p.settledAt === null,
    /** No processor at all — a wallet-funded ride. `gatewayId === null` is real. */
    walletFunded: (p) => p.gatewayId === null,
    /** Money captured with no invoice against it. A hole in the VAT return. */
    uninvoiced: (p) => p.capturedAt !== null && p.invoiceNumber === null,
    escalated: (p) => p.settlement === 'escalated',
    failed: (p) => p.settlement === 'failed',

    /* numbers — money-range */
    amountHalalas: (p) => p.amountHalalas,
    vatHalalas: (p) => p.vatHalalas,
    gatewayFeeHalalas: (p) => p.gatewayFeeHalalas,
    refundedHalalas: (p) => p.refundedHalalas,

    /* dates */
    initiatedAt: (p) => toInstant(p.initiatedAt),
    capturedAt: (p) => toInstant(p.capturedAt),
    settledAt: (p) => toInstant(p.settledAt),
    escalatedAt: (p) => toInstant(p.escalatedAt),
  },
  facetable: ['kind', 'direction', 'settlement', 'gatewayId'],
  views: {
    all: () => true,
    /* Reachable without hand-editing a fixture, which is the point of a view. */
    pending: (p) => isPendingSettlement(p.settlement),
    /** The two states `SETTLEMENT_BADGE_TONE` returns `null` for (R5a). */
    attention: (p) => p.settlement === 'failed' || p.settlement === 'escalated',
    refunded: (p) => p.refundedHalalas > 0,
    payouts: (p) => p.direction === 'outbound',
  },
}

/**
 * GET /api/v1/payments
 *   params: q · kind · settlement · direction · riderId · captainId · tripId ·
 *           subscriptionId · gatewayId · page · pageSize · sort · filter ·
 *           view=all|pending|attention|refunded|payouts
 *   -> Paginated<Payment>
 *
 * Sortable: id · amountHalalas · vatHalalas · gatewayFeeHalalas ·
 *           refundedHalalas · riderName · captainName · settlement ·
 *           initiatedAt · capturedAt · settledAt
 * Filterable: everything in `paymentShape.filterable` above.
 *
 * `settlement` is server-owned and is the **same union a posting carries**
 * (`types/ledger.ts`), so a payment and the posting that records it can never
 * disagree about where the money is. `refundedHalalas` is server-summed across
 * every refund against the row — a figure derived from whichever refunds
 * happened to be on the current page is wrong on page two.
 */
export async function listPayments(
  params: PaymentQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<Payment>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<Payment>>('/payments', { ...params }, { signal })
  }
  return mock(PAYMENT_OPERATIONS.list, signal, () => {
    const extra = [
      ...(params.kind ? [{ field: 'kind', op: 'eq' as const, value: params.kind }] : []),
      ...(params.settlement
        ? [{ field: 'settlement', op: 'eq' as const, value: params.settlement }]
        : []),
      ...(params.direction
        ? [{ field: 'direction', op: 'eq' as const, value: params.direction }]
        : []),
      ...(params.riderId ? [{ field: 'riderId', op: 'eq' as const, value: params.riderId }] : []),
      ...(params.captainId
        ? [{ field: 'captainId', op: 'eq' as const, value: params.captainId }]
        : []),
      ...(params.tripId ? [{ field: 'tripId', op: 'eq' as const, value: params.tripId }] : []),
      ...(params.subscriptionId
        ? [{ field: 'subscriptionId', op: 'eq' as const, value: params.subscriptionId }]
        : []),
      ...(params.gatewayId
        ? [{ field: 'gatewayId', op: 'eq' as const, value: params.gatewayId }]
        : []),
    ]
    const filters = extra.length ? [...(params.filters ?? []), ...extra] : params.filters
    return runQuery(paymentFixtures, { ...params, filters }, paymentShape)
  })
}

/**
 * GET /api/v1/payments/:id
 *   -> Payment
 *   404 naming the id, so `overlay-not-found` can print it (§9.2).
 */
export async function getPayment(id: string, signal?: AbortSignal): Promise<Payment> {
  if (DATA_SOURCE === 'http') return http.get<Payment>(`/payments/${id}`, undefined, { signal })
  return mock(PAYMENT_OPERATIONS.get, signal, () => {
    const row = paymentFixtures.find((p) => p.id === id)
    if (!row) throw notFound('payment', id)
    return row
  })
}

/**
 * GET /api/v1/payments/for/:entityId
 *   params: page · pageSize · sort
 *   -> Paginated<Payment>
 *
 * **The 360° profile's `payments` section, for any of the five entity types
 * that declare it** — rider, captain, trip, subscription, corporate account.
 *
 * A separate endpoint rather than five call sites each assembling their own
 * filter, because *"which payments belong to this entity"* is a **server**
 * question and the answer is not the same shape for each: a rider's payments
 * are the ones they made, a captain's are the payouts to them **plus** the
 * fares on the trips they drove, and a subscription's include a charge that
 * names no trip at all. A component that had to know which of `riderId`,
 * `captainId`, `tripId` or `subscriptionId` to filter on would be re-deriving
 * that rule per screen, and the fifth screen would get it wrong.
 *
 * Newest first — a profile section is a history, and the last thing that
 * happened is the thing being asked about.
 */
export async function listPaymentsForEntity(
  entityId: string,
  params: QueryParams = {},
  signal?: AbortSignal,
): Promise<Paginated<Payment>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<Payment>>(`/payments/for/${entityId}`, { ...params }, { signal })
  }
  return mock(PAYMENT_OPERATIONS.listForEntity, signal, () => {
    const id = entityId.trim().toUpperCase()
    const rows = paymentFixtures.filter(
      (p) =>
        p.riderId === id ||
        p.captainId === id ||
        p.tripId === id ||
        p.subscriptionId === id ||
        p.id === id,
    )
    return runQuery(
      rows,
      { ...params, sort: params.sort ?? { field: 'initiatedAt', dir: 'desc' } },
      paymentShape,
    )
  })
}

/**
 * GET /api/v1/payments/facets
 *   params: view
 *   -> Facets — field name -> [{ value, count }], count-descending
 *
 * `gatewayId` is faceted here **and that is the point**: it is what a screen
 * sources its gateway filter from instead of hard-coding six names, and it is
 * the number Ledger & Payment Controls' per-gateway volume should be reconciled
 * against (AC-423, D-F16).
 */
export async function getPaymentFacets(
  view?: string | null,
  signal?: AbortSignal,
): Promise<Facets> {
  if (DATA_SOURCE === 'http') {
    return http.get<Facets>('/payments/facets', { view: view ?? undefined }, { signal })
  }
  return mock(PAYMENT_OPERATIONS.facets, signal, () =>
    computeFacets(paymentFixtures, paymentShape, view),
  )
}
