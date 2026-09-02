/**
 * Subscriptions — Operations › Subscriptions, five views.
 *
 * The *Expiring ≤ 7 days* view is the merged legacy `renewal` page, and it is
 * the destination global search resolves "Renewal pipeline" to (§4.3.4).
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { EYVAR_TODAY, toInstant } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import { computeFacets, runQuery, type QueryShape } from '../mock/query'
import { ApiError, type Facets, type Paginated, type QueryParams } from '../types/common'
import type { PlanKey, Subscription, SubscriptionStatus } from '../types/subscription'
import { http } from './http'
import { onFixturesLoaded, type Fixtures } from '../mock/fixtures'

/* Late-bound fixture rows. `mock/fixtures.ts` says why this is not a static
   import: a static one pins seeded data into every build, including the http
   build that can never read it. Bound before any mock read, because `mock()`
   and `mockMutation()` await `loadFixtures()`. */
let allSubscriptionFixtures!: Fixtures['allSubscriptionFixtures']
onFixturesLoaded((f) => {
  allSubscriptionFixtures = f.allSubscriptionFixtures
})

export const SUBSCRIPTION_OPERATIONS = {
  facets: 'subscriptions.facets',
  list: 'subscriptions.list',
  get: 'subscriptions.get',
  freeze: 'subscriptions.freeze',
  cancel: 'subscriptions.cancel',
} as const

/* Registered at module load, not on first call. `config.ts` says *"each client
   registers its ids here at module load"*, and `mock()` only registers when it
   runs — so an operation nobody has invoked yet is missing from a QA panel's
   list and from any validation of `?mockFail=`. Every id in this module is
   listed the moment the module is imported. */
registerOperations(...Object.values(SUBSCRIPTION_OPERATIONS))

export interface SubscriptionQuery extends QueryParams {
  status?: SubscriptionStatus
  planKey?: PlanKey
  riderId?: string
  driverId?: string
}

/** The *Expiring ≤ 7 days* window. Days, so the endpoint's name and the view's name agree. */
export const EXPIRING_WINDOW_DAYS = 7

/**
 * `endsOn` within the window, measured against the **fixed clock**, not the
 * host's. A view whose membership changes at midnight cannot be snapshot-tested.
 */
function endsWithinDays(endsOn: string, days: number, today: string = EYVAR_TODAY): boolean {
  const delta = (Date.parse(endsOn) - Date.parse(today)) / 86_400_000
  return delta >= 0 && delta <= days
}

const subscriptionShape: QueryShape<Subscription> = {
  searchable: [(s) => s.id, (s) => s.riderName, (s) => s.driverName, (s) => s.planName],
  sortable: {
    endsOn: (s) => s.endsOn,
    startedOn: (s) => s.startedOn,
    riderName: (s) => s.riderName,
    driverName: (s) => s.driverName,
    paidHalalas: (s) => s.paidHalalas,
    escrowHeldHalalas: (s) => s.escrowHeldHalalas,
    renewalLikelihoodPercent: (s) => s.renewalLikelihoodPercent,
    tripsCompleted: (s) => s.tripsCompleted,
  },
  filterable: {
    /* identity — text */
    id: (s) => s.id,
    riderName: (s) => s.riderName,
    driverName: (s) => s.driverName,
    planName: (s) => s.planName,
    cancellationReason: (s) => s.cancellationReason,

    /* closed sets — options via `getSubscriptionFacets` */
    status: (s) => s.status,
    planKey: (s) => s.planKey,
    vehicleClass: (s) => s.vehicleClass,

    /* relations */
    riderId: (s) => s.riderId,
    driverId: (s) => s.driverId,

    /* numbers */
    tripsCompleted: (s) => s.tripsCompleted,
    tripsIncluded: (s) => s.tripsIncluded,
    paidHalalas: (s) => s.paidHalalas,
    escrowHeldHalalas: (s) => s.escrowHeldHalalas,
    refundedHalalas: (s) => s.refundedHalalas,
    renewalLikelihoodPercent: (s) => s.renewalLikelihoodPercent,

    /**
     * Dates. `endsOn` is what the *Expiring ≤ 7 days* view filters on, and it
     * is deliberately **not** the same thing as `status: 'expiring'` — a
     * subscription can be `active` and end tomorrow. Both are exposed so a
     * screen can filter on either, which is the open question flagged for the
     * Subscriptions spec rather than resolved here.
     */
    startedOn: (s) => toInstant(s.startedOn),
    endsOn: (s) => toInstant(s.endsOn),
    frozenUntil: (s) => toInstant(s.frozenUntil),
    cancelledAt: (s) => toInstant(s.cancelledAt),
  },
  facetable: ['status', 'planKey', 'vehicleClass', 'planName'],
  views: {
    all: () => true,
    active: (s) => s.status === 'active',
    /**
     * **Filters on the date window, not on the status.** SUB-1052 is `Active`
     * and ends tomorrow, so it appears here with an `Active` badge. Which of
     * the two the operator sees is a decision the Subscriptions spec owes —
     * flagged, not resolved here.
     */
    'expiring-7d': (s) =>
      s.status !== 'cancelled' && s.status !== 'expired' && endsWithinDays(s.endsOn, EXPIRING_WINDOW_DAYS),
    'at-risk': (s) => s.status === 'at-risk',
    frozen: (s) => s.status === 'frozen',
  },
}

/**
 * GET /api/v1/subscriptions
 *   params: q · status · planKey · riderId · driverId · page · pageSize ·
 *           sort · filter · view=all|active|expiring-7d|at-risk|frozen
 *   -> Paginated<Subscription>
 *
 * Sortable: endsOn · startedOn · riderName · driverName · paidHalalas ·
 *           escrowHeldHalalas · renewalLikelihoodPercent · tripsCompleted
 * Filterable: status · planKey · vehicleClass · riderId · driverId · endsOn
 *
 * `escrowHeldHalalas` is `null` when no hold exists — not `0`. `driverId` is
 * `null` for a subscription with no captain assigned yet.
 */
export async function listSubscriptions(
  params: SubscriptionQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<Subscription>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<Subscription>>('/subscriptions', { ...params }, { signal })
  }
  return mock(SUBSCRIPTION_OPERATIONS.list, signal, () => {
    const extra = (['status', 'planKey', 'riderId', 'driverId'] as const)
      .filter((k) => params[k] !== undefined)
      .map((k) => ({ field: k, op: 'eq' as const, value: params[k] as string }))
    return runQuery(
      allSubscriptionFixtures,
      { ...params, filters: [...(params.filters ?? []), ...extra] },
      subscriptionShape,
    )
  })
}

/**
 * GET /api/v1/subscriptions/:id
 *   -> Subscription
 */
export async function getSubscription(id: string, signal?: AbortSignal): Promise<Subscription> {
  if (DATA_SOURCE === 'http') return http.get<Subscription>(`/subscriptions/${id}`, undefined, { signal })
  return mock(SUBSCRIPTION_OPERATIONS.get, signal, () => {
    const row = allSubscriptionFixtures.find((s) => s.id === id)
    if (!row) throw notFound('subscription', id)
    return row
  })
}

/**
 * POST /api/v1/subscriptions/:id/freeze
 *   body: { until: IsoDate }
 *
 * `reason` is accepted by the function and recorded in the mock's audit line,
 * but it is not on the wire. Either add it to the request or drop the parameter
 * -- today it is a value the operator supplies and the server never sees.
 *   -> Subscription
 *   409 when the subscription is cancelled or expired
 */
export async function freezeSubscription(
  id: string,
  until: string,
  signal?: AbortSignal,
): Promise<Subscription> {
  if (DATA_SOURCE === 'http') {
    return http.post<Subscription>(`/subscriptions/${id}/freeze`, { until }, { signal })
  }
  return mockMutation(SUBSCRIPTION_OPERATIONS.freeze, signal, () => {
    const row = allSubscriptionFixtures.find((s) => s.id === id)
    if (!row) throw notFound('subscription', id)
    if (row.status === 'cancelled' || row.status === 'expired') {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'not_freezable',
        message: `${id} is ${row.status} and cannot be frozen`,
        retryable: false,
      })
    }
    return { ...row, status: 'frozen' as const, frozenUntil: until }
  })
}

/**
 * POST /api/v1/subscriptions/:id/cancel
 *   body: { reason: string }
 *   -> Subscription  (with `refundedHalalas` computed for unused trips)
 *
 * The refund is **server-computed**, and it is money: computing it client-side
 * from `paidHalalas` and `tripsCompleted` is how two screens end up offering
 * two refunds.
 */
export async function cancelSubscription(
  id: string,
  reason: string,
  signal?: AbortSignal,
): Promise<Subscription> {
  if (DATA_SOURCE === 'http') {
    return http.post<Subscription>(`/subscriptions/${id}/cancel`, { reason }, { signal })
  }
  return mockMutation(SUBSCRIPTION_OPERATIONS.cancel, signal, () => {
    const row = allSubscriptionFixtures.find((s) => s.id === id)
    if (!row) throw notFound('subscription', id)
    const unused = Math.max(0, row.tripsIncluded - row.tripsCompleted)
    const refunded = row.tripsIncluded > 0 ? Math.round((row.paidHalalas / row.tripsIncluded) * unused) : 0
    return {
      ...row,
      status: 'cancelled' as const,
      cancellationReason: reason,
      cancelledAt: `${EYVAR_TODAY}T09:14:00+03:00`,
      refundedHalalas: refunded,
    }
  })
}

/**
 * GET /api/v1/subscriptions/facets
 *   params: view
 *   -> Facets — field name -> [{ value, count }], count-descending
 *
 * The option set for every `select` / `multi-select` filter over subscriptions,
 * **derived from the data**. A screen that hard-codes `Riyadh` / `Jeddah` is
 * wrong the first time a third city is seeded (finding **F-6**). Scoped by
 * `view` only, so narrowing one filter never removes the options you would
 * need to widen it again.
 *
 * Facetable fields are declared on the shape's `facetable` list above.
 */
export async function getSubscriptionFacets(
  view?: string | null,
  signal?: AbortSignal,
): Promise<Facets> {
  if (DATA_SOURCE === 'http') {
    return http.get<Facets>('/subscriptions/facets', { view: view ?? undefined }, { signal })
  }
  return mock(SUBSCRIPTION_OPERATIONS.facets, signal, () => computeFacets(allSubscriptionFixtures, subscriptionShape, view))
}
