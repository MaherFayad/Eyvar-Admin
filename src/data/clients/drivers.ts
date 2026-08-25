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

import { DATA_SOURCE } from '../config'
import { mock, mockMutation, notFound } from '../mock/delay'
import { runQuery, type QueryShape } from '../mock/query'
import { allDriverFixtures } from '../fixtures/drivers'
import { complianceFixtures } from '../fixtures/compliance'
import type { Paginated, QueryParams } from '../types/common'
import type { Driver, DriverCompliance, DriverStatus } from '../types/driver'
import { http } from './http'

export const DRIVER_OPERATIONS = {
  list: 'drivers.list',
  get: 'drivers.get',
  suspend: 'drivers.suspend',
  reinstate: 'drivers.reinstate',
  complianceList: 'compliance.list',
  complianceGet: 'compliance.get',
} as const

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
  filterable: {
    status: (d) => d.status,
    tier: (d) => d.tier,
    vehicleClass: (d) => d.vehicleClass,
    city: (d) => d.city,
    suspended: (d) => d.suspended,
    planAccess: (d) => d.planAccess,
    rating: (d) => d.rating,
    openComplaints: (d) => d.openComplaints,
  },
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
    worstState: (c) => c.worstState,
    suspended: (c) => c.suspendedReason !== null,
    driverId: (c) => c.driverId,
  },
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
