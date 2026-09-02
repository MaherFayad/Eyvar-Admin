/**
 * Ride requests — Operations › Requests.
 *
 * A work queue (§8.4, pattern **P8**) over two legacy collections merged into
 * one resource; `types/request.ts` explains why one and not two.
 *
 * The claim operations are the same four `applicants.ts` established. They are
 * duplicated rather than abstracted because each queue's 409 message names its
 * own domain, and a shared `claimEntity(type, id)` helper buys three lines and
 * costs the endpoint comment above each function.
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { EYVAR_NOW, toInstant } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import { computeFacets, runQuery, type QueryShape } from '../mock/query'
import { ApiError, type Claim, type Facets, type Paginated, type QueryParams } from '../types/common'
import type { RequestChannel, RequestStatus, RideRequest } from '../types/request'
import { http } from './http'
import { currentMockUserId } from './session'
import { onFixturesLoaded, type Fixtures } from '../mock/fixtures'

/* Late-bound fixture rows. `mock/fixtures.ts` says why this is not a static
   import: a static one pins seeded data into every build, including the http
   build that can never read it. Bound before any mock read, because `mock()`
   and `mockMutation()` await `loadFixtures()`. */
let allRequestFixtures!: Fixtures['allRequestFixtures']
let teamUserFixtures!: Fixtures['teamUserFixtures']
let OWNERSHIP_STALE_MINUTES!: Fixtures['OWNERSHIP_STALE_MINUTES']
onFixturesLoaded((f) => {
  allRequestFixtures = f.allRequestFixtures
  teamUserFixtures = f.teamUserFixtures
  OWNERSHIP_STALE_MINUTES = f.OWNERSHIP_STALE_MINUTES
})

export const REQUEST_OPERATIONS = {
  facets: 'requests.facets',
  list: 'requests.list',
  get: 'requests.get',
  claim: 'requests.claim',
  release: 'requests.release',
  assign: 'requests.assign',
  expire: 'requests.expire',
} as const

/* Registered at module load, not on first call. `config.ts` says *"each client
   registers its ids here at module load"*, and `mock()` only registers when it
   runs — so an operation nobody has invoked yet is missing from a QA panel's
   list and from any validation of `?mockFail=`. Every id in this module is
   listed the moment the module is imported. */
registerOperations(...Object.values(REQUEST_OPERATIONS))

export interface RequestQuery extends QueryParams {
  channel?: RequestChannel
  status?: RequestStatus
}

/** Minutes waited, frozen at the disposition for a closed row. Legacy's `waiting` counter, done properly. */
function waitedMinutes(r: RideRequest): number {
  const end = r.assignedAt ?? r.expiredAt ?? r.cancelledAt ?? EYVAR_NOW
  return Math.round((Date.parse(end) - Date.parse(r.requestedAt)) / 60_000)
}

const requestShape: QueryShape<RideRequest> = {
  searchable: [
    (r) => r.id,
    (r) => r.riderName,
    (r) => r.riderId,
    (r) => r.pickup,
    (r) => r.destination,
    (r) => r.assignedDriverName,
    (r) => r.assignedSubscriptionId,
  ],
  sortable: {
    id: (r) => r.id,
    riderName: (r) => r.riderName,
    requestedAt: (r) => r.requestedAt,
    slaDueAt: (r) => r.slaDueAt,
    status: (r) => r.status,
    channel: (r) => r.channel,
    waitedMinutes: (r) => waitedMinutes(r),
    /**
     * Legacy `reqUrgencyScore` (`:10057`): breached first, then longest
     * waiting. Reproduced as a sort key so the table's default order is the
     * legacy order and nobody re-implements it in a component.
     */
    urgency: (r) => (r.slaBreachedAt ? 1_000_000 : 0) + waitedMinutes(r),
  },
  filterable: {
    /* identity — text */
    id: (r) => r.id,
    riderId: (r) => r.riderId,
    riderName: (r) => r.riderName,
    pickup: (r) => r.pickup,
    destination: (r) => r.destination,
    notes: (r) => r.notes,
    assignedSubscriptionId: (r) => r.assignedSubscriptionId,
    assignedDriverName: (r) => r.assignedDriverName,

    /* closed sets — options via `getRequestFacets` */
    channel: (r) => r.channel,
    status: (r) => r.status,
    vehicleClass: (r) => r.vehicleClass,
    planKey: (r) => r.planKey,
    slaSource: (r) => r.slaSource,
    claimedBy: (r) => r.claim?.ownerId ?? null,
    assignedDriverId: (r) => r.assignedDriverId,
    assignedByUserId: (r) => r.assignedByUserId,
    offeredToDriverId: (r) => r.offeredToDriverId,

    /* booleans */
    vip: (r) => r.vip,
    riderHasPriorSubscription: (r) => r.riderHasPriorSubscription,
    unclaimed: (r) => r.claim === null || r.claim.state !== 'claimed',
    /** **Breach is the stamp, never `slaDueAt < now`.** See `types/workQueue.ts`. */
    breached: (r) => r.slaBreachedAt !== null,
    /** Open = still needs a captain. What the nav badge counts. */
    open: (r) => r.status === 'searching' || r.status === 'offered' || r.status === 'no-drivers',
    hasRating: (r) => r.riderRating !== null,

    /* numbers */
    riderRating: (r) => r.riderRating,
    slaTargetMinutes: (r) => r.slaTargetMinutes,
    waitedMinutes: (r) => waitedMinutes(r),

    /* dates — every one through `toInstant`, so a bare date and an instant
       compare against the same Riyadh-bounded range */
    requestedAt: (r) => toInstant(r.requestedAt),
    slaStartedAt: (r) => toInstant(r.slaStartedAt),
    slaDueAt: (r) => toInstant(r.slaDueAt),
    slaBreachedAt: (r) => toInstant(r.slaBreachedAt),
    offerExpiresAt: (r) => toInstant(r.offerExpiresAt),
    assignedAt: (r) => toInstant(r.assignedAt),
    expiredAt: (r) => toInstant(r.expiredAt),
    cancelledAt: (r) => toInstant(r.cancelledAt),
  },
  facetable: [
    'channel',
    'status',
    'vehicleClass',
    'planKey',
    'slaSource',
    'claimedBy',
    'assignedDriverId',
    'assignedByUserId',
  ],
  views: {
    /* The six the route table declares (`fixtures/routeTable.ts:274`). */
    all: () => true,
    instant: (r) => r.channel === 'instant',
    subscription: (r) => r.channel === 'subscription',
    /* Legacy `reqStatusMatch` (`:10046`): pending ≡ searching ∪ offered. */
    pending: (r) => r.status === 'searching' || r.status === 'offered',
    assigned: (r) => r.status === 'assigned',
    /* Legacy folds `no_drivers` into `expired` (`:10051`) — both are "we did
       not find anyone", from the operator's point of view. */
    expired: (r) => r.status === 'expired' || r.status === 'no-drivers',

    /* Not tab views — filter and cross-link targets. `mine` and `unassigned`
       back the My Work links; `breached` backs the SLA chip. */
    mine: (r) => r.claim?.state === 'claimed' && r.claim.ownerId === currentMockUserId(),
    unassigned: (r) => r.claim === null || r.claim.state !== 'claimed',
    breached: (r) => r.slaBreachedAt !== null,
  },
}

/**
 * GET /api/v1/requests
 *   params: q · channel · status · page · pageSize · sort · filter ·
 *           view=all|instant|subscription|pending|assigned|expired|mine|unassigned|breached
 *   -> Paginated<RideRequest>
 *
 * Sortable: id · riderName · requestedAt · slaDueAt · status · channel ·
 *           waitedMinutes · urgency
 * Default sort is `urgency` descending — legacy `sortInstantByUrgency`
 * (`:10062`), which puts breached rows above everything because *"a broken
 * promise is not a queue position"* (`:19076`).
 *
 * `slaDueAt` is never null on this resource: both channels have a shipped
 * window (`REQUEST_SLA_MINUTES`). `slaBreachedAt` may be non-null on a closed
 * row — breached and resolved is a real combination.
 */
export async function listRequests(
  params: RequestQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<RideRequest>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<RideRequest>>('/requests', { ...params }, { signal })
  }
  return mock(REQUEST_OPERATIONS.list, signal, () => {
    const extra = [
      ...(params.channel ? [{ field: 'channel', op: 'eq' as const, value: params.channel }] : []),
      ...(params.status ? [{ field: 'status', op: 'eq' as const, value: params.status }] : []),
    ]
    const filters = extra.length ? [...(params.filters ?? []), ...extra] : params.filters
    return runQuery(allRequestFixtures, { ...params, filters }, requestShape)
  })
}

/**
 * GET /api/v1/requests/:id
 *   -> RideRequest
 */
export async function getRequest(id: string, signal?: AbortSignal): Promise<RideRequest> {
  if (DATA_SOURCE === 'http') return http.get<RideRequest>(`/requests/${id}`, undefined, { signal })
  return mock(REQUEST_OPERATIONS.get, signal, () => {
    const row = allRequestFixtures.find((r) => r.id === id)
    if (!row) throw notFound('request', id)
    return row
  })
}

/**
 * POST /api/v1/requests/:id/claim
 *   body: { takeOver?: boolean }
 *   -> RideRequest
 *   409 when another operator holds it and `takeOver` was not sent
 */
export async function claimRequest(
  id: string,
  opts: { takeOver?: boolean } = {},
  signal?: AbortSignal,
): Promise<RideRequest> {
  if (DATA_SOURCE === 'http') {
    return http.post<RideRequest>(`/requests/${id}/claim`, opts, { signal })
  }
  return mockMutation(REQUEST_OPERATIONS.claim, signal, () => {
    const row = allRequestFixtures.find((r) => r.id === id)
    if (!row) throw notFound('request', id)
    return { ...row, claim: nextClaim('request', id, row.claim, opts.takeOver) }
  })
}

/**
 * POST /api/v1/requests/:id/release
 *   -> RideRequest
 */
export async function releaseRequest(id: string, signal?: AbortSignal): Promise<RideRequest> {
  if (DATA_SOURCE === 'http') {
    return http.post<RideRequest>(`/requests/${id}/release`, undefined, { signal })
  }
  return mockMutation(REQUEST_OPERATIONS.release, signal, () => {
    const row = allRequestFixtures.find((r) => r.id === id)
    if (!row) throw notFound('request', id)
    if (!row.claim) return row
    return {
      ...row,
      claim: { ...row.claim, state: 'released' as const, releasedAt: EYVAR_NOW, releaseReason: 'manual' as const },
    }
  })
}

/**
 * POST /api/v1/requests/:id/assign
 *   body: { driverId: string }
 *   -> RideRequest
 *   409 when the request is no longer open — legacy re-reads the index before
 *       splicing precisely because two operators can assign the same row
 *       (`:11886`–`:11897`)
 *   422 when `driverId` is empty
 *
 * **Assigning does not clear `slaBreachedAt`.** A request found at 07:26 against
 * a 07:05 deadline is resolved *and* late, and the operations review needs both.
 */
export async function assignRequest(
  id: string,
  driverId: string,
  signal?: AbortSignal,
): Promise<RideRequest> {
  if (DATA_SOURCE === 'http') {
    return http.post<RideRequest>(`/requests/${id}/assign`, { driverId }, { signal })
  }
  return mockMutation(REQUEST_OPERATIONS.assign, signal, () => {
    const row = allRequestFixtures.find((r) => r.id === id)
    if (!row) throw notFound('request', id)
    if (!driverId.trim()) {
      throw new ApiError({
        status: 422,
        kind: 'validation',
        code: 'driver_required',
        message: 'Choose a captain to assign',
        details: [{ field: 'driverId', code: 'required', message: 'Choose a captain' }],
        retryable: false,
      })
    }
    if (row.status === 'assigned' || row.status === 'expired' || row.status === 'cancelled') {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'request_not_open',
        message: `${id} is already ${row.status}`,
        retryable: false,
      })
    }
    const me = teamUserFixtures.find((u) => u.id === currentMockUserId())!
    return {
      ...row,
      status: 'assigned' as const,
      assignedDriverId: driverId,
      assignedDriverName: null,
      assignedByUserId: me.id,
      assignedByUserName: me.name,
      assignedAt: EYVAR_NOW,
    }
  })
}

/**
 * POST /api/v1/requests/:id/expire
 *   body: { reason?: string }
 *   -> RideRequest
 *
 * Closing a request nobody can serve. Distinct from `cancel`, which is the
 * rider's action, and the distinction survives into `status`.
 */
export async function expireRequest(id: string, signal?: AbortSignal): Promise<RideRequest> {
  if (DATA_SOURCE === 'http') {
    return http.post<RideRequest>(`/requests/${id}/expire`, undefined, { signal })
  }
  return mockMutation(REQUEST_OPERATIONS.expire, signal, () => {
    const row = allRequestFixtures.find((r) => r.id === id)
    if (!row) throw notFound('request', id)
    return { ...row, status: 'expired' as const, expiredAt: EYVAR_NOW }
  })
}

/**
 * GET /api/v1/requests/facets
 *   params: view
 *   -> Facets
 */
export async function getRequestFacets(
  view?: string | null,
  signal?: AbortSignal,
): Promise<Facets> {
  if (DATA_SOURCE === 'http') {
    return http.get<Facets>('/requests/facets', { view: view ?? undefined }, { signal })
  }
  return mock(REQUEST_OPERATIONS.facets, signal, () =>
    computeFacets(allRequestFixtures, requestShape, view),
  )
}

/**
 * The claim transition, shared by the four wave-2 queues that have one.
 *
 * Exported from here rather than duplicated four times because the *rule* is
 * one rule — a claim is not a lock, a take-over is deliberate and recorded, a
 * claim idle past `OWNERSHIP_STALE_MINUTES` is already free (`:18866`). The
 * endpoint comments stay per-client; only the state machine is shared.
 *
 * **The owner it stamps is the signed-in operator, read from the session.**
 * It used to write `ownerId: CURRENT_USER_ID`, the module constant, while the
 * `mine` views that read ownership back had moved to `currentMockUserId()` —
 * so **the two halves of ownership disagreed about who is acting.** A claim
 * made after `switchMockUser('USR-3')` landed on `USR-1` and `USR-3`'s `mine`
 * never saw it; the take-over 409 fired against the wrong holder for the same
 * reason. This function is imported by five wave-2 queues and by
 * `conversations.ts`, so the disagreement was not one screen's.
 *
 * `clients/session.ts` states the rule: *"Reading `CURRENT_USER_ID` instead —
 * as some older clients do — would make `switchMockUser` invisible to it."*
 * Mock-only, and every caller is inside a `DATA_SOURCE === 'mock'` branch; in
 * http mode the server resolves the claimant from the auth cookie.
 */
export function nextClaim(
  entityType: string,
  entityId: string,
  current: Claim | null,
  takeOver: boolean | undefined,
): Claim {
  const held = liveClaim(current)
  if (held && held.ownerId !== currentMockUserId() && !takeOver) {
    throw new ApiError({
      status: 409,
      kind: 'conflict',
      code: 'claimed_by_other',
      message: `${held.ownerName} is holding this ${entityType}`,
      retryable: false,
    })
  }
  const me = teamUserFixtures.find((u) => u.id === currentMockUserId())!
  return {
    key: `${entityType}:${entityId}`,
    entityType,
    entityId,
    ownerId: me.id,
    ownerName: me.name,
    claimedAt: held?.ownerId === me.id ? held.claimedAt : EYVAR_NOW,
    touchedAt: EYVAR_NOW,
    state: 'claimed',
    releasedAt: null,
    releaseReason: null,
    takeovers:
      held && held.ownerId !== me.id
        ? [
            ...held.takeovers,
            {
              fromUserId: held.ownerId,
              fromUserName: held.ownerName,
              toUserId: me.id,
              toUserName: me.name,
              at: EYVAR_NOW,
            },
          ]
        : (held?.takeovers ?? []),
  }
}

/** A claim past the stale window is already free — legacy `whoHolds` (`:18866`), minus the write. */
export function liveClaim(claim: Claim | null): Claim | null {
  if (!claim || claim.state !== 'claimed') return null
  const idleMinutes = (Date.parse(EYVAR_NOW) - Date.parse(claim.touchedAt)) / 60_000
  return idleMinutes > OWNERSHIP_STALE_MINUTES ? null : claim
}
