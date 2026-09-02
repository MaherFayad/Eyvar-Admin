/**
 * Captains and fleet compliance — Operations › People, views *Captains* and
 * *Compliance*.
 *
 * **Two resources, one file, separate functions.** People also covers
 * Applications (`applicants.ts`) and Riders (`riders.ts`). Four resources share
 * one route; they do not share a type, a query or an endpoint. §5.1: "the
 * component set a single sub-tab needs is the *union* of its patterns" — the
 * data set is a union too, not a fusion.
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { toInstant } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import { computeFacets, runQuery, type QueryShape } from '../mock/query'
import type { Facets, Paginated, QueryParams } from '../types/common'
import type { Driver, DriverCompliance, DriverStatus } from '../types/driver'
import { http } from './http'
import { onFixturesLoaded, type Fixtures } from '../mock/fixtures'

/* Late-bound fixture rows. `mock/fixtures.ts` says why this is not a static
   import: a static one pins seeded data into every build, including the http
   build that can never read it. Bound before any mock read, because `mock()`
   and `mockMutation()` await `loadFixtures()`. */
let allDriverFixtures!: Fixtures['allDriverFixtures']
let complianceFixtures!: Fixtures['complianceFixtures']
onFixturesLoaded((f) => {
  allDriverFixtures = f.allDriverFixtures
  complianceFixtures = f.complianceFixtures
})

export const DRIVER_OPERATIONS = {
  complianceFacets: 'compliance.facets',
  facets: 'drivers.facets',
  list: 'drivers.list',
  get: 'drivers.get',
  suspend: 'drivers.suspend',
  reinstate: 'drivers.reinstate',
  complianceList: 'compliance.list',
  complianceGet: 'compliance.get',
} as const

/* Registered at module load, not on first call. `config.ts` says *"each client
   registers its ids here at module load"*, and `mock()` only registers when it
   runs — so an operation nobody has invoked yet is missing from a QA panel's
   list and from any validation of `?mockFail=`. Every id in this module is
   listed the moment the module is imported. */
registerOperations(...Object.values(DRIVER_OPERATIONS))

export interface DriverQuery extends QueryParams {
  status?: DriverStatus
}

/** What the mock engine may search, sort and filter on. Anything not here throws rather than silently returning everything. */
const driverShape: QueryShape<Driver> = {
  searchable: [(d) => d.name, (d) => d.id, (d) => d.phone, (d) => d.vehicle, (d) => d.email],
  sortable: {
    name: (d) => d.name,
    rating: (d) => d.rating,
    totalTrips: (d) => d.totalTrips,
    monthEarningsHalalas: (d) => d.monthEarningsHalalas,
    onTimePercent: (d) => d.onTimePercent,
    joinedAt: (d) => d.joinedAt,
    lastTripAt: (d) => d.lastTripAt,
    activeSubscriptions: (d) => d.activeSubscriptions,
  },
  /**
   * **Filterability is a property of the resource, not of the screen.** Wave 1
   * renders captains on Operations › People, but Risk & Signals, Trip
   * Assurance, Payouts and Admin all query the same records from other
   * surfaces. The full set is declared here so those waves do not each come
   * back for one more accessor — and because `runQuery` throws on an
   * undeclared field, which reaches the operator as the error state.
   *
   * Every **date** field goes through `toInstant`, so a `date-range` filter
   * compares instant against instant. See `mock/clock.ts` for why a bare
   * `2025-02-01` is not safe to compare against a Riyadh-bounded range.
   */
  filterable: {
    /* identity — text */
    id: (d) => d.id,
    name: (d) => d.name,
    phone: (d) => d.phone,
    email: (d) => d.email,
    vehicle: (d) => d.vehicle,

    /* closed sets — select / multi-select, options via `getDriverFacets` */
    status: (d) => d.status,
    tier: (d) => d.tier,
    vehicleClass: (d) => d.vehicleClass,
    city: (d) => d.city,
    gender: (d) => d.gender,
    appLanguage: (d) => d.appLanguage,
    planAccess: (d) => d.planAccess,
    bankStatus: (d) => d.bank.status,

    /* booleans */
    suspended: (d) => d.suspended,
    hasPhoto: (d) => d.hasPhoto,
    multiSubException: (d) => d.multiSubException,
    flaggedForDeclines: (d) => d.flaggedForDeclines,
    manualFlag: (d) => d.manualFlag,

    /* numbers — number-range and money-range */
    rating: (d) => d.rating,
    openComplaints: (d) => d.openComplaints,
    totalTrips: (d) => d.totalTrips,
    monthEarningsHalalas: (d) => d.monthEarningsHalalas,
    onTimePercent: (d) => d.onTimePercent,
    activeSubscriptions: (d) => d.activeSubscriptions,
    maxSubscriptions: (d) => d.maxSubscriptions,
    openSubscriptionSlots: (d) => d.openSubscriptionSlots,

    /* dates — the kind that had no reachable field until now */
    joinedAt: (d) => toInstant(d.joinedAt),
    lastTripAt: (d) => toInstant(d.lastTripAt),
    planFrozenUntil: (d) => toInstant(d.planFrozenUntil),

    /* fraud signals — Management › Risk & Signals (wave 4) reads these */
    lastIp: (d) => d.lastIp,
    ipLocation: (d) => d.ipLocation,
    device: (d) => d.device,
  },
  facetable: [
    'status',
    'tier',
    'vehicleClass',
    'city',
    'gender',
    'appLanguage',
    'planAccess',
    'bankStatus',
  ],
  views: {
    captains: () => true,
  },
}

/**
 * GET /api/v1/drivers
 *   params: q · status · page · pageSize · sort=<field>:<dir> · filter=<field>:<op>:<value>
 *   -> Paginated<Driver>
 *
 * Sortable: name · rating · totalTrips · monthEarningsHalalas · onTimePercent ·
 *           joinedAt · lastTripAt · activeSubscriptions
 * Filterable: status · tier · vehicleClass · city · suspended · planAccess ·
 *             rating · openComplaints
 *
 * `status` is server-derived from `suspended`, the flag set and the open
 * complaint count (see `types/driver.ts`). Do not recompute it client-side.
 */
export async function listDrivers(
  params: DriverQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<Driver>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<Driver>>('/drivers', { ...params }, { signal })
  }
  return mock(DRIVER_OPERATIONS.list, signal, () => {
    const filters = params.status
      ? [...(params.filters ?? []), { field: 'status', op: 'eq' as const, value: params.status }]
      : params.filters
    return runQuery(allDriverFixtures, { ...params, filters }, driverShape)
  })
}

/**
 * GET /api/v1/drivers/:id
 *   -> Driver
 *   404 when the id does not exist
 */
export async function getDriver(id: string, signal?: AbortSignal): Promise<Driver> {
  if (DATA_SOURCE === 'http') return http.get<Driver>(`/drivers/${id}`, undefined, { signal })
  return mock(DRIVER_OPERATIONS.get, signal, () => {
    const row = allDriverFixtures.find((d) => d.id === id)
    if (!row) throw notFound('captain', id)
    return row
  })
}

/**
 * POST /api/v1/drivers/:id/suspend
 *   body: { reason: string }
 *   -> Driver
 *
 * `reason` is required by the domain: the suspension banner names it, and a
 * suspension with no stated reason is not appealable.
 */
export async function suspendDriver(
  id: string,
  reason: string,
  signal?: AbortSignal,
): Promise<Driver> {
  if (DATA_SOURCE === 'http') return http.post<Driver>(`/drivers/${id}/suspend`, { reason }, { signal })
  return mockMutation(DRIVER_OPERATIONS.suspend, signal, () => {
    const row = allDriverFixtures.find((d) => d.id === id)
    if (!row) throw notFound('captain', id)
    return { ...row, status: 'suspended' as const, suspended: true, suspensionReason: reason }
  })
}

/**
 * POST /api/v1/drivers/:id/reinstate
 *   -> Driver
 */
export async function reinstateDriver(id: string, signal?: AbortSignal): Promise<Driver> {
  if (DATA_SOURCE === 'http') return http.post<Driver>(`/drivers/${id}/reinstate`, undefined, { signal })
  return mockMutation(DRIVER_OPERATIONS.reinstate, signal, () => {
    const row = allDriverFixtures.find((d) => d.id === id)
    if (!row) throw notFound('captain', id)
    return { ...row, status: 'active' as const, suspended: false, suspensionReason: null }
  })
}

/* ────────────────────────────── Compliance ─────────────────────────────── */

const complianceShape: QueryShape<DriverCompliance> = {
  searchable: [(c) => c.driverName, (c) => c.driverId, (c) => c.vehicle],
  sortable: {
    driverName: (c) => c.driverName,
    worstState: (c) => c.worstState,
    /* Soonest expiry across the file — what an operator actually sorts by. */
    soonestExpiry: (c) => c.docs.map((d) => d.expiresOn).sort()[0] ?? null,
  },
  filterable: {
    driverId: (c) => c.driverId,
    driverName: (c) => c.driverName,
    vehicle: (c) => c.vehicle,
    worstState: (c) => c.worstState,
    suspended: (c) => c.suspendedReason !== null,
    /**
     * Soonest expiry across the file — the field a `date-range` filter uses to
     * answer "whose documents lapse this month". `null` for a captain with no
     * documents, which sorts and filters as "not set" rather than as "never".
     */
    soonestExpiry: (c) => toInstant(c.docs.map((d) => d.expiresOn).sort()[0] ?? null),
    /**
     * How many documents are on file at all.
     *
     * **This is the answer to finding F-5.** Compliance's old hand-built filter
     * offered `No file` — `worstState === null` — and `toFilterSpec` cannot
     * express "this field IS null", because `select` reserves `null` for `Any`.
     * A **number-range** filter of `0 … 0` on this field selects exactly the
     * same captains, using a control that already exists. It is a workaround,
     * not a reason to stop fixing `isNull`.
     */
    docCount: (c) => c.docs.length,
    expiredCount: (c) => c.docs.filter((d) => d.state === 'expired').length,
  },
  facetable: ['worstState'],
  views: {
    compliance: () => true,
    /* The backlog view: anything not clean, including captains with no file. */
    'needs-attention': (c) => c.worstState !== 'valid',
  },
}

/**
 * GET /api/v1/compliance/drivers
 *   params: q · page · pageSize · sort · filter · view=compliance|needs-attention
 *   -> Paginated<DriverCompliance>
 *
 * `worstState` is `null` for a captain with **no documents on file** — a real
 * and common case (legacy `DB.driverDocs` covers five captains out of six).
 * `null` is not `valid`; the UI must not render it as compliant.
 *
 * Days-remaining is **not** returned. It depends on the clock; the UI computes
 * it from `expiresOn` against a clock it is passed (`mock/clock.ts`).
 */
export async function listDriverCompliance(
  params: QueryParams = {},
  signal?: AbortSignal,
): Promise<Paginated<DriverCompliance>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<DriverCompliance>>('/compliance/drivers', { ...params }, { signal })
  }
  return mock(DRIVER_OPERATIONS.complianceList, signal, () =>
    runQuery(complianceFixtures, params, complianceShape),
  )
}

/**
 * GET /api/v1/compliance/drivers/:driverId
 *   -> DriverCompliance
 */
export async function getDriverCompliance(
  driverId: string,
  signal?: AbortSignal,
): Promise<DriverCompliance> {
  if (DATA_SOURCE === 'http') {
    return http.get<DriverCompliance>(`/compliance/drivers/${driverId}`, undefined, { signal })
  }
  return mock(DRIVER_OPERATIONS.complianceGet, signal, () => {
    const row = complianceFixtures.find((c) => c.driverId === driverId)
    if (!row) throw notFound('compliance record', driverId)
    return row
  })
}

/**
 * GET /api/v1/drivers/facets
 *   params: view
 *   -> Facets — field name -> [{ value, count }], count-descending
 *
 * The option set for every `select` / `multi-select` filter over captains,
 * **derived from the data**. A screen that hard-codes `Riyadh` / `Jeddah` is
 * wrong the first time a third city is seeded (finding **F-6**). Scoped by
 * `view` only, so narrowing one filter never removes the options you would
 * need to widen it again.
 *
 * Facetable fields are declared on the shape's `facetable` list above.
 */
export async function getDriverFacets(
  view?: string | null,
  signal?: AbortSignal,
): Promise<Facets> {
  if (DATA_SOURCE === 'http') {
    return http.get<Facets>('/drivers/facets', { view: view ?? undefined }, { signal })
  }
  return mock(DRIVER_OPERATIONS.facets, signal, () => computeFacets(allDriverFixtures, driverShape, view))
}

/**
 * GET /api/v1/compliance/drivers/facets
 *   params: view
 *   -> Facets — field name -> [{ value, count }], count-descending
 *
 * The option set for every `select` / `multi-select` filter over compliance records,
 * **derived from the data**. A screen that hard-codes `Riyadh` / `Jeddah` is
 * wrong the first time a third city is seeded (finding **F-6**). Scoped by
 * `view` only, so narrowing one filter never removes the options you would
 * need to widen it again.
 *
 * Facetable fields are declared on the shape's `facetable` list above.
 */
export async function getDriverComplianceFacets(
  view?: string | null,
  signal?: AbortSignal,
): Promise<Facets> {
  if (DATA_SOURCE === 'http') {
    return http.get<Facets>('/compliance/drivers/facets', { view: view ?? undefined }, { signal })
  }
  return mock(DRIVER_OPERATIONS.complianceFacets, signal, () => computeFacets(complianceFixtures, complianceShape, view))
}
