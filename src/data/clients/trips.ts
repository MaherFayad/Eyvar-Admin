/**
 * Trips — Operations › Trips, all six views.
 *
 * The views are the merge register in action: *Quick rides* is the legacy
 * `quickrides` page, *Route history* is `live` in history mode, and both are
 * `?view=` params on one route, not separate endpoints (§3.8 rule 3).
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { toInstant } from '../mock/clock'
import { mock, notFound } from '../mock/delay'
import { computeFacets, runQuery, type QueryShape } from '../mock/query'
import type { Facets, Paginated, QueryParams } from '../types/common'
import type { Trip, TripKind, TripStatus } from '../types/trip'
import { http } from './http'
import { onFixturesLoaded, type Fixtures } from '../mock/fixtures'

/* Late-bound fixture rows. `mock/fixtures.ts` says why this is not a static
   import: a static one pins seeded data into every build, including the http
   build that can never read it. Bound before any mock read, because `mock()`
   and `mockMutation()` await `loadFixtures()`. */
let allTripFixtures!: Fixtures['allTripFixtures']
onFixturesLoaded((f) => {
  allTripFixtures = f.allTripFixtures
})

export const TRIP_OPERATIONS = {
  facets: 'trips.facets',
  list: 'trips.list',
  get: 'trips.get',
  flag: 'trips.flag',
} as const

/* Registered at module load, not on first call. `config.ts` says *"each client
   registers its ids here at module load"*, and `mock()` only registers when it
   runs — so an operation nobody has invoked yet is missing from a QA panel's
   list and from any validation of `?mockFail=`. Every id in this module is
   listed the moment the module is imported. */
registerOperations(...Object.values(TRIP_OPERATIONS))

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
    /* **Added by the sort/filter sweep.** A column the operator can read is a
       column they can order by, unless ordering it is meaningless — see
       `docs/TABLE-SORT-AUDIT.md` for the three kinds this sweep left alone. */
    /* **Latent crash, found by the sweep and closed here.** The column
       declared `sortField: 'id / status'` and this map had no accessor for it, and
       `sortRows` THROWS on an unknown field rather than ignoring it — so the
       first operator to order by this column lost the read. Nothing in the
       type checker sees a sort field; `scratch/sortfield-check.mjs` is what
       does. */
    id: (t) => t.id,
    status: (t) => t.status,
    subscriptionId: (r) => r.subscriptionId,
    paymentId: (r) => r.paymentId,
    flagged: (r) => (r.flagged ? 1 : 0),
  },
  filterable: {
    /* identity — text */
    id: (t) => t.id,
    riderName: (t) => t.riderName,
    driverName: (t) => t.driverName,
    route: (t) => t.route,
    pickup: (t) => t.pickup,
    destination: (t) => t.destination,
    paymentId: (t) => t.paymentId,

    /* closed sets — options via `getTripFacets` */
    kind: (t) => t.kind,
    status: (t) => t.status,

    /* relations */
    riderId: (t) => t.riderId,
    driverId: (t) => t.driverId,
    subscriptionId: (t) => t.subscriptionId,

    /* booleans */
    flagged: (t) => t.flagged,
    stateDesynced: (t) => t.stateDesynced,

    /* numbers — money-range and number-range */
    fareHalalas: (t) => t.fareHalalas,
    driverEarningsHalalas: (t) => t.driverEarningsHalalas,
    platformCutHalalas: (t) => t.platformCutHalalas,
    tipHalalas: (t) => t.tipHalalas,
    extraStopFeeHalalas: (t) => t.extraStopFeeHalalas,
    distanceKm: (t) => t.distanceKm,
    durationMinutes: (t) => t.durationMinutes,
    driverRatingGiven: (t) => t.driverRatingGiven,
    latenessMinutes: (t) => t.latenessMinutes,

    /* dates */
    startedAt: (t) => toInstant(t.startedAt),
    endedAt: (t) => toInstant(t.endedAt),
  },
  facetable: ['kind', 'status'],
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
 *   body: { flagged: boolean }
 *
 * **`reason` is discarded, and that looks like a bug rather than a decision.**
 * `flagTrip(id, _reason?)` takes it, the underscore says it is unused, and the
 * request omits it -- while the flag dialog makes the investigation note
 * REQUIRED. So an operator is compelled to explain a flag, and the explanation
 * is dropped between the dialog and the server. Raised, not silently fixed:
 * whether the note belongs on the trip or on an audit line is a product call.
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

export async function flagTrip(id: string, _reason?: string, signal?: AbortSignal): Promise<Trip> {
  return setTripFlag(id, true, signal)
}

export async function unflagTrip(id: string, signal?: AbortSignal): Promise<Trip> {
  return setTripFlag(id, false, signal)
}

/**
 * GET /api/v1/trips/facets
 *   params: view
 *   -> Facets — field name -> [{ value, count }], count-descending
 *
 * The option set for every `select` / `multi-select` filter over trips,
 * **derived from the data**. A screen that hard-codes `Riyadh` / `Jeddah` is
 * wrong the first time a third city is seeded (finding **F-6**). Scoped by
 * `view` only, so narrowing one filter never removes the options you would
 * need to widen it again.
 *
 * Facetable fields are declared on the shape's `facetable` list above.
 */
export async function getTripFacets(
  view?: string | null,
  signal?: AbortSignal,
): Promise<Facets> {
  if (DATA_SOURCE === 'http') {
    return http.get<Facets>('/trips/facets', { view: view ?? undefined }, { signal })
  }
  return mock(TRIP_OPERATIONS.facets, signal, () => computeFacets(allTripFixtures, tripShape, view))
}
