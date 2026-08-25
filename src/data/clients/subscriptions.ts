/**
 * Subscriptions — Operations › Subscriptions, five views.
 *
 * The *Expiring ≤ 7 days* view is the merged legacy `renewal` page, and it is
 * the destination global search resolves "Renewal pipeline" to (§4.3.4).
 */

import { DATA_SOURCE } from '../config'
import { EYVAR_TODAY } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import { runQuery, type QueryShape } from '../mock/query'
import { allSubscriptionFixtures } from '../fixtures/subscriptions'
import { ApiError, type Paginated, type QueryParams } from '../types/common'
import type { PlanKey, Subscription, SubscriptionStatus } from '../types/subscription'
import { http } from './http'

export const SUBSCRIPTION_OPERATIONS = {
  list: 'subscriptions.list',
  get: 'subscriptions.get',
  freeze: 'subscriptions.freeze',
  cancel: 'subscriptions.cancel',
} as const

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
    status: (s) => s.status,
    planKey: (s) => s.planKey,
    vehicleClass: (s) => s.vehicleClass,
    riderId: (s) => s.riderId,
    driverId: (s) => s.driverId,
    endsOn: (s) => s.endsOn,
  },
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
 *   body: { until: IsoDate, reason?: string }
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
