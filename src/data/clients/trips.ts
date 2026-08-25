/**
 * Trips — Operations › Trips, all six views.
 *
 * The views are the merge register in action: *Quick rides* is the legacy
 * `quickrides` page, *Route history* is `live` in history mode, and both are
 * `?view=` params on one route, not separate endpoints (§3.8 rule 3).
 */

import { DATA_SOURCE } from '../config'
import { mock, notFound } from '../mock/delay'
import { runQuery, type QueryShape } from '../mock/query'
import { allTripFixtures } from '../fixtures/trips'
import type { Paginated, QueryParams } from '../types/common'
import type { Trip, TripKind, TripStatus } from '../types/trip'
import { http } from './http'

export const TRIP_OPERATIONS = {
  list: 'trips.list',
  get: 'trips.get',
  flag: 'trips.flag',
} as const

export interface TripQuery extends QueryParams {
  kind?: TripKind
  status?: TripStatus
  riderId?: string
  driverId?: string
  subscriptionId?: string
}

/** Legacy `lowRatingThreshold()` — the *Low rating* view's boundary. A config value, not a magic number. */
export const LOW_RATING_THRESHOLD = 3

const tripShape: QueryShape<Trip> = {
  searchable: [(t) => t.id, (t) => t.riderName, (t) => t.driverName, (t) => t.route],
  sortable: {
    startedAt: (t) => t.startedAt,
    endedAt: (t) => t.endedAt,
    fareHalalas: (t) => t.fareHalalas,
    driverEarningsHalalas: (t) => t.driverEarningsHalalas,
    platformCutHalalas: (t) => t.platformCutHalalas,
    distanceKm: (t) => t.distanceKm,
    durationMinutes: (t) => t.durationMinutes,
    driverRatingGiven: (t) => t.driverRatingGiven,
    riderName: (t) => t.riderName,
    driverName: (t) => t.driverName,
  },
  filterable: {
    kind: (t) => t.kind,
    status: (t) => t.status,
    riderId: (t) => t.riderId,
    driverId: (t) => t.driverId,
    subscriptionId: (t) => t.subscriptionId,
    flagged: (t) => t.flagged,
    stateDesynced: (t) => t.stateDesynced,
    fareHalalas: (t) => t.fareHalalas,
    startedAt: (t) => t.startedAt,
  },
  /* The six views from the route table, as predicates. */
  views: {
    all: () => true,
    'quick-rides': (t) => t.kind === 'Quick ride',
    'subscription-legs': (t) => t.kind === 'Subscription',
    flagged: (t) => t.flagged,
    'low-rating': (t) => t.driverRatingGiven !== null && t.driverRatingGiven <= LOW_RATING_THRESHOLD,
    /* Legacy `live` in history mode — completed trips with a recorded route. */
    'route-history': (t) => t.endedAt !== null && t.distanceKm !== null,
  },
}

/**
 * GET /api/v1/trips
 *   params: q · kind · status · riderId · driverId · subscriptionId ·
 *           page · pageSize · sort · filter ·
 *           view=all|quick-rides|subscription-legs|flagged|low-rating|route-history
 *   -> Paginated<Trip>
 *
 * Sortable: startedAt · endedAt · fareHalalas · driverEarningsHalalas ·
 *           platformCutHalalas · distanceKm · durationMinutes ·
 *           driverRatingGiven · riderName · driverName
 * Filterable: kind · status · riderId · driverId · subscriptionId · flagged ·
 *             stateDesynced · fareHalalas · startedAt
 *
 * Money is halalas; `distanceKm` and `durationMinutes` are `null` on a
 * cancelled or unstarted trip. Legacy coerces those to `0` and then computes a
 * platform cut from them (`:3422`) — do not reproduce that.
 *
 * `platformCutHalalas` is server-computed. **Q7 is open** (four pricing models
 * disagree on commission); the server returning one number is what stops four
 * screens showing four.
 */
export async function listTrips(
  params: TripQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<Trip>> {
  if (DATA_SOURCE === 'http') return http.get<Paginated<Trip>>('/trips', { ...params }, { signal })
  return mock(TRIP_OPERATIONS.list, signal, () => {
    const extra = (['kind', 'status', 'riderId', 'driverId', 'subscriptionId'] as const)
      .filter((k) => params[k] !== undefined)
      .map((k) => ({ field: k, op: 'eq' as const, value: params[k] as string }))
    return runQuery(allTripFixtures, { ...params, filters: [...(params.filters ?? []), ...extra] }, tripShape)
  })
}

/**
 * GET /api/v1/trips/:id
 *   -> Trip
 */
export async function getTrip(id: string, signal?: AbortSignal): Promise<Trip> {
  if (DATA_SOURCE === 'http') return http.get<Trip>(`/trips/${id}`, undefined, { signal })
  return mock(TRIP_OPERATIONS.get, signal, () => {
    const row = allTripFixtures.find((t) => t.id === id)
    if (!row) throw notFound('trip', id)
    return row
  })
}

/**
 * POST /api/v1/trips/:id/flag
 *   body: { flagged: boolean, reason?: string }
 *   -> Trip
 */
export async function setTripFlag(
  id: string,
  flagged: boolean,
  signal?: AbortSignal,
): Promise<Trip> {
  if (DATA_SOURCE === 'http') {
    return http.post<Trip>(`/trips/${id}/flag`, { flagged }, { signal })
  }
  return mock(TRIP_OPERATIONS.flag, signal, () => {
    const row = allTripFixtures.find((t) => t.id === id)
    if (!row) throw notFound('trip', id)
    return { ...row, flagged }
  })
}
