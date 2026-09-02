/**
 * Riders and new riders — Operations › People, view *Riders*.
 *
 * Two resources: `Rider` (the full record) and `NewRider` (last-24-h
 * registrations, a different shape, `DB.newRiders`). Separate endpoints because
 * they are separate queries with separate cardinality.
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { toInstant } from '../mock/clock'
import { mock, notFound } from '../mock/delay'
import { computeFacets, runQuery, type QueryShape } from '../mock/query'
import type { Facets, Paginated, QueryParams } from '../types/common'
import type { ChurnRisk, NewRider, Rider, RiderStatus } from '../types/rider'
import { http } from './http'
import { onFixturesLoaded, type Fixtures } from '../mock/fixtures'

/* Late-bound fixture rows. `mock/fixtures.ts` says why this is not a static
   import: a static one pins seeded data into every build, including the http
   build that can never read it. Bound before any mock read, because `mock()`
   and `mockMutation()` await `loadFixtures()`. */
let newRiderFixtures!: Fixtures['newRiderFixtures']
let riderFixtures!: Fixtures['riderFixtures']
onFixturesLoaded((f) => {
  newRiderFixtures = f.newRiderFixtures
  riderFixtures = f.riderFixtures
})

export const RIDER_OPERATIONS = {
  facets: 'riders.facets',
  list: 'riders.list',
  get: 'riders.get',
  listNew: 'riders.listNew',
} as const

/* Registered at module load, not on first call. `config.ts` says *"each client
   registers its ids here at module load"*, and `mock()` only registers when it
   runs — so an operation nobody has invoked yet is missing from a QA panel's
   list and from any validation of `?mockFail=`. Every id in this module is
   listed the moment the module is imported. */
registerOperations(...Object.values(RIDER_OPERATIONS))

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
  /* Declared for the resource, not for Operations › People — Rider Wallets,
     Growth and Contact Centre all query riders from other surfaces. Dates go
     through `toInstant`; see `mock/clock.ts`. */
  filterable: {
    /* identity — text */
    id: (r) => r.id,
    name: (r) => r.name,
    phone: (r) => r.phone,
    address: (r) => r.address,

    /* closed sets — options via `getRiderFacets` */
    status: (r) => r.status,
    tier: (r) => r.tier,
    churnRisk: (r) => r.churnRisk,
    city: (r) => r.city,
    gender: (r) => r.gender,
    appLanguage: (r) => r.appLanguage,
    driverGenderPreference: (r) => r.driverGenderPreference,
    corporateAccountId: (r) => r.corporateAccountId,

    /* booleans */
    hasPhoto: (r) => r.hasPhoto,

    /* numbers — number-range and money-range */
    rating: (r) => r.rating,
    walletBalanceHalalas: (r) => r.walletBalanceHalalas,
    totalTrips: (r) => r.totalTrips,
    lifetimeValueHalalas: (r) => r.lifetimeValueHalalas,
    renewalRatePercent: (r) => r.renewalRatePercent,
    quickRides: (r) => r.quickRides,

    /* dates */
    joinedAt: (r) => toInstant(r.joinedAt),
    lastTripAt: (r) => toInstant(r.lastTripAt),

    /* fraud signals — two seeded riders share `160.156.4.90` */
    lastIp: (r) => r.lastIp,
    ipLocation: (r) => r.ipLocation,
    device: (r) => r.device,
  },
  facetable: [
    'status',
    'tier',
    'churnRisk',
    'city',
    'gender',
    'appLanguage',
    'driverGenderPreference',
    'corporateAccountId',
  ],
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
  filterable: {
    id: (r) => r.id,
    name: (r) => r.name,
    phone: (r) => r.phone,
    firstAction: (r) => r.firstAction,
    city: (r) => r.city,
    gender: (r) => r.gender,
    appLanguage: (r) => r.appLanguage,
    hasPhoto: (r) => r.hasPhoto,
    ipLocation: (r) => r.ipLocation,
    joinedAt: (r) => toInstant(r.joinedAt),
    dateOfBirth: (r) => toInstant(r.dateOfBirth),
  },
  facetable: ['city', 'gender', 'appLanguage', 'firstAction'],
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

/**
 * GET /api/v1/riders/facets
 *   params: view
 *   -> Facets — field name -> [{ value, count }], count-descending
 *
 * The option set for every `select` / `multi-select` filter over riders,
 * **derived from the data**. A screen that hard-codes `Riyadh` / `Jeddah` is
 * wrong the first time a third city is seeded (finding **F-6**). Scoped by
 * `view` only, so narrowing one filter never removes the options you would
 * need to widen it again.
 *
 * Facetable fields are declared on the shape's `facetable` list above.
 */
export async function getRiderFacets(
  view?: string | null,
  signal?: AbortSignal,
): Promise<Facets> {
  if (DATA_SOURCE === 'http') {
    return http.get<Facets>('/riders/facets', { view: view ?? undefined }, { signal })
  }
  return mock(RIDER_OPERATIONS.facets, signal, () => computeFacets(riderFixtures, riderShape, view))
}
