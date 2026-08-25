/**
 * Riders and new riders — Operations › People, view *Riders*.
 *
 * Two resources: `Rider` (the full record) and `NewRider` (last-24-h
 * registrations, a different shape, `DB.newRiders`). Separate endpoints because
 * they are separate queries with separate cardinality.
 */

import { DATA_SOURCE } from '../config'
import { mock, notFound } from '../mock/delay'
import { runQuery, type QueryShape } from '../mock/query'
import { newRiderFixtures, riderFixtures } from '../fixtures/riders'
import type { Paginated, QueryParams } from '../types/common'
import type { ChurnRisk, NewRider, Rider, RiderStatus } from '../types/rider'
import { http } from './http'

export const RIDER_OPERATIONS = {
  list: 'riders.list',
  get: 'riders.get',
  listNew: 'riders.listNew',
} as const

export interface RiderQuery extends QueryParams {
  status?: RiderStatus
  churnRisk?: ChurnRisk
}

const riderShape: QueryShape<Rider> = {
  searchable: [(r) => r.name, (r) => r.id, (r) => r.phone, (r) => r.address],
  sortable: {
    name: (r) => r.name,
    rating: (r) => r.rating,
    totalTrips: (r) => r.totalTrips,
    lifetimeValueHalalas: (r) => r.lifetimeValueHalalas,
    walletBalanceHalalas: (r) => r.walletBalanceHalalas,
    renewalRatePercent: (r) => r.renewalRatePercent,
    joinedAt: (r) => r.joinedAt,
    lastTripAt: (r) => r.lastTripAt,
  },
  filterable: {
    status: (r) => r.status,
    tier: (r) => r.tier,
    churnRisk: (r) => r.churnRisk,
    city: (r) => r.city,
    corporateAccountId: (r) => r.corporateAccountId,
    walletBalanceHalalas: (r) => r.walletBalanceHalalas,
  },
  views: {
    riders: () => true,
    /* Reachable without hand-editing: the overdrawn-wallet backlog. */
    overdrawn: (r) => r.walletBalanceHalalas < 0,
  },
}

/**
 * GET /api/v1/riders
 *   params: q · status · churnRisk · page · pageSize · sort · filter · view=riders|overdrawn
 *   -> Paginated<Rider>
 *
 * Sortable: name · rating · totalTrips · lifetimeValueHalalas ·
 *           walletBalanceHalalas · renewalRatePercent · joinedAt · lastTripAt
 * Filterable: status · tier · churnRisk · city · corporateAccountId ·
 *             walletBalanceHalalas
 *
 * `status` and `churnRisk` are server-derived; legacy computes both at render
 * (`:6428`, `riderChurnRisk`). `walletBalanceHalalas` **may be negative** — what
 * the product does about that is an unanswered question, not a data error.
 */
export async function listRiders(
  params: RiderQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<Rider>> {
  if (DATA_SOURCE === 'http') return http.get<Paginated<Rider>>('/riders', { ...params }, { signal })
  return mock(RIDER_OPERATIONS.list, signal, () => {
    const extra = [
      ...(params.status ? [{ field: 'status', op: 'eq' as const, value: params.status }] : []),
      ...(params.churnRisk ? [{ field: 'churnRisk', op: 'eq' as const, value: params.churnRisk }] : []),
    ]
    return runQuery(riderFixtures, { ...params, filters: [...(params.filters ?? []), ...extra] }, riderShape)
  })
}

/**
 * GET /api/v1/riders/:id
 *   -> Rider
 */
export async function getRider(id: string, signal?: AbortSignal): Promise<Rider> {
  if (DATA_SOURCE === 'http') return http.get<Rider>(`/riders/${id}`, undefined, { signal })
  return mock(RIDER_OPERATIONS.get, signal, () => {
    const row = riderFixtures.find((r) => r.id === id)
    if (!row) throw notFound('rider', id)
    return row
  })
}

const newRiderShape: QueryShape<NewRider> = {
  searchable: [(r) => r.name, (r) => r.id, (r) => r.phone],
  sortable: { name: (r) => r.name, joinedAt: (r) => r.joinedAt },
  filterable: { city: (r) => r.city, gender: (r) => r.gender },
}

/**
 * GET /api/v1/riders/new
 *   params: q · page · pageSize · sort
 *   -> Paginated<NewRider>
 *
 * Registrations in the last 24 h. A separate shape, not a filtered `Rider`:
 * these records carry KYC fields (`dateOfBirth`, `nationalId`) that full riders
 * do not, and carry none of the stats that full riders do.
 */
export async function listNewRiders(
  params: QueryParams = {},
  signal?: AbortSignal,
): Promise<Paginated<NewRider>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<NewRider>>('/riders/new', { ...params }, { signal })
  }
  return mock(RIDER_OPERATIONS.listNew, signal, () => runQuery(newRiderFixtures, params, newRiderShape))
}
