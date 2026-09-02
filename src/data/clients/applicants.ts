/**
 * Captain applications — Operations › People, view *Applications*, and the
 * level-3 detail.
 *
 * **A work queue** (§8.4, pattern P8): claim, SLA, disposition. The claim
 * operations below are the ones five surfaces across three workspaces will
 * reuse, so they are modelled once and properly rather than per screen.
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { EYVAR_NOW, toInstant } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import { computeFacets, runQuery, type QueryShape } from '../mock/query'
import { ApiError, type Claim, type Facets, type Paginated, type QueryParams } from '../types/common'
import type { Applicant, ApplicantStatus } from '../types/applicant'
import { http } from './http'
import { currentMockUserId } from './session'
import { onFixturesLoaded, type Fixtures } from '../mock/fixtures'

/* Late-bound fixture rows. `mock/fixtures.ts` says why this is not a static
   import: a static one pins seeded data into every build, including the http
   build that can never read it. Bound before any mock read, because `mock()`
   and `mockMutation()` await `loadFixtures()`. */
let applicantFixtures!: Fixtures['applicantFixtures']
let teamUserFixtures!: Fixtures['teamUserFixtures']
let OWNERSHIP_STALE_MINUTES!: Fixtures['OWNERSHIP_STALE_MINUTES']
onFixturesLoaded((f) => {
  applicantFixtures = f.applicantFixtures
  teamUserFixtures = f.teamUserFixtures
  OWNERSHIP_STALE_MINUTES = f.OWNERSHIP_STALE_MINUTES
})

export const APPLICANT_OPERATIONS = {
  facets: 'applicants.facets',
  list: 'applicants.list',
  get: 'applicants.get',
  claim: 'applicants.claim',
  release: 'applicants.release',
  approve: 'applicants.approve',
  reject: 'applicants.reject',
} as const

/* Registered at module load, not on first call. `config.ts` says *"each client
   registers its ids here at module load"*, and `mock()` only registers when it
   runs — so an operation nobody has invoked yet is missing from a QA panel's
   list and from any validation of `?mockFail=`. Every id in this module is
   listed the moment the module is imported. */
registerOperations(...Object.values(APPLICANT_OPERATIONS))

export interface ApplicantQuery extends QueryParams {
  status?: ApplicantStatus
}

const applicantShape: QueryShape<Applicant> = {
  searchable: [(a) => a.name, (a) => a.id, (a) => a.phone, (a) => a.plate, (a) => a.nationalId],
  sortable: {
    name: (a) => a.name,
    appliedAt: (a) => a.appliedAt,
    slaDueAt: (a) => a.slaDueAt,
    status: (a) => a.status,
  },
  filterable: {
    /* identity — text */
    id: (a) => a.id,
    name: (a) => a.name,
    phone: (a) => a.phone,
    plate: (a) => a.plate,
    vehicle: (a) => a.vehicle,
    nationalId: (a) => a.nationalId,

    /* closed sets — options via `getApplicantFacets` */
    status: (a) => a.status,
    vehicleClass: (a) => a.vehicleClass,
    city: (a) => a.city,
    gender: (a) => a.gender,
    appLanguage: (a) => a.appLanguage,
    bankStatus: (a) => a.bank.status,
    claimedBy: (a) => a.claim?.ownerId ?? null,
    decidedByUserId: (a) => a.decidedByUserId,

    /* booleans */
    unclaimed: (a) => a.claim === null || a.claim.state !== 'claimed',
    hasPhoto: (a) => a.hasPhoto,
    /** **The stamp, never `slaDueAt < now`** — see `types/workQueue.ts`. */
    breached: (a) => a.slaBreachedAt !== null,
    hasSla: (a) => a.slaDueAt !== null,

    /* numbers */
    acceptedTrips: (a) => a.acceptedTrips,
    cancelledTrips: (a) => a.cancelledTrips,
    /* Outstanding paperwork, as a number-range: `1 …` is "has a blocker". */
    docsOutstanding: (a) => a.docs.filter((d) => d.status !== 'verified').length,

    /* closed set — where the SLA number came from. `unset` on every applicant
       row: the 48-hour window is a placeholder waiting on Q8. */
    slaSource: (a) => a.slaSource,

    /* numbers */
    slaTargetMinutes: (a) => a.slaTargetMinutes,

    /* dates — the SLA columns a work queue is sorted and filtered by */
    appliedAt: (a) => toInstant(a.appliedAt),
    slaStartedAt: (a) => toInstant(a.slaStartedAt),
    slaDueAt: (a) => toInstant(a.slaDueAt),
    slaBreachedAt: (a) => toInstant(a.slaBreachedAt),
    decidedAt: (a) => toInstant(a.decidedAt),
    dateOfBirth: (a) => toInstant(a.dateOfBirth),

    /* fraud signals */
    lastIp: (a) => a.lastIp,
    ipLocation: (a) => a.ipLocation,
    device: (a) => a.device,
  },
  facetable: [
    'status',
    'vehicleClass',
    'city',
    'gender',
    'appLanguage',
    'bankStatus',
    'claimedBy',
    'slaSource',
  ],
  views: {
    applications: () => true,
    mine: (a) => a.claim?.state === 'claimed' && a.claim.ownerId === currentMockUserId(),
    unassigned: (a) => a.claim === null || a.claim.state !== 'claimed',
    /**
     * SLA breached — **the server's stamp**, not `slaDueAt < now`.
     *
     * Wave 1 compared the deadline to the fixed clock. That is wrong on
     * `APP-2203`, approved on the 24th against a deadline on the 25th: its
     * deadline has passed and it never breached. One row is enough to matter,
     * and there are three more like it across wave 2.
     */
    breached: (a) => a.slaBreachedAt !== null,
  },
}

/**
 * GET /api/v1/applications
 *   params: q · status · page · pageSize · sort · filter ·
 *           view=applications|mine|unassigned|breached
 *   -> Paginated<Applicant>
 *
 * Sortable: name · appliedAt · slaDueAt · status
 * Filterable: status · vehicleClass · city · claimedBy · unclaimed
 *
 * `slaDueAt` may be `null` — **the legacy data has no SLA at all** and the
 * window is an open product question. A null SLA renders no countdown, not a
 * breach.
 */
export async function listApplicants(
  params: ApplicantQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<Applicant>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<Applicant>>('/applications', { ...params }, { signal })
  }
  return mock(APPLICANT_OPERATIONS.list, signal, () => {
    const filters = params.status
      ? [...(params.filters ?? []), { field: 'status', op: 'eq' as const, value: params.status }]
      : params.filters
    return runQuery(applicantFixtures, { ...params, filters }, applicantShape)
  })
}

/**
 * GET /api/v1/applications/:id
 *   -> Applicant
 */
export async function getApplicant(id: string, signal?: AbortSignal): Promise<Applicant> {
  if (DATA_SOURCE === 'http') return http.get<Applicant>(`/applications/${id}`, undefined, { signal })
  return mock(APPLICANT_OPERATIONS.get, signal, () => {
    const row = applicantFixtures.find((a) => a.id === id)
    if (!row) throw notFound('application', id)
    return row
  })
}

/**
 * POST /api/v1/applications/:id/claim
 *   body: { takeOver?: boolean }
 *   -> Applicant
 *   409 when another operator holds it and `takeOver` was not sent
 *
 * **A claim is not a lock** (`:18841`): a colleague can take over deliberately,
 * and the take-over is recorded. The 409 exists so the take-over is a decision
 * the operator makes, not something that happens silently. A claim idle longer
 * than `OWNERSHIP_STALE_MINUTES` is already free.
 */
export async function claimApplicant(
  id: string,
  opts: { takeOver?: boolean } = {},
  signal?: AbortSignal,
): Promise<Applicant> {
  if (DATA_SOURCE === 'http') {
    return http.post<Applicant>(`/applications/${id}/claim`, opts, { signal })
  }
  return mockMutation(APPLICANT_OPERATIONS.claim, signal, () => {
    const row = applicantFixtures.find((a) => a.id === id)
    if (!row) throw notFound('application', id)
    const held = liveClaim(row.claim)
    if (held && held.ownerId !== currentMockUserId() && !opts.takeOver) {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'claimed_by_other',
        message: `${held.ownerName} is holding this application`,
        retryable: false,
      })
    }
    const me = teamUserFixtures.find((u) => u.id === currentMockUserId())!
    const claim: Claim = {
      key: `application:${id}`,
      entityType: 'application',
      entityId: id,
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
    return { ...row, claim }
  })
}

/**
 * POST /api/v1/applications/:id/release
 *   -> Applicant
 */
export async function releaseApplicant(id: string, signal?: AbortSignal): Promise<Applicant> {
  if (DATA_SOURCE === 'http') {
    return http.post<Applicant>(`/applications/${id}/release`, undefined, { signal })
  }
  return mockMutation(APPLICANT_OPERATIONS.release, signal, () => {
    const row = applicantFixtures.find((a) => a.id === id)
    if (!row) throw notFound('application', id)
    if (!row.claim) return row
    return {
      ...row,
      claim: { ...row.claim, state: 'released', releasedAt: EYVAR_NOW, releaseReason: 'manual' },
    }
  })
}

/**
 * POST /api/v1/applications/:id/approve
 *   -> Applicant  (with `approvedDriverId` set to the new `DRV-*` record)
 *   403 without `approve_drivers`
 *   422 when a required document is not verified
 */
export async function approveApplicant(id: string, signal?: AbortSignal): Promise<Applicant> {
  if (DATA_SOURCE === 'http') {
    return http.post<Applicant>(`/applications/${id}/approve`, undefined, { signal })
  }
  return mockMutation(APPLICANT_OPERATIONS.approve, signal, () => {
    const row = applicantFixtures.find((a) => a.id === id)
    if (!row) throw notFound('application', id)
    const unverified = row.docs.filter((d) => d.status !== 'verified')
    if (unverified.length > 0) {
      throw new ApiError({
        status: 422,
        kind: 'validation',
        code: 'documents_unverified',
        message: `${unverified.length} document${unverified.length === 1 ? '' : 's'} still need verifying`,
        details: unverified.map((d) => ({
          field: `docs.${d.type}`,
          code: d.status,
          message: `${d.type} is ${d.status}`,
        })),
        retryable: false,
      })
    }
    return {
      ...row,
      status: 'approved' as const,
      approvedDriverId: `DRV-${id.slice(-4)}`,
      decidedAt: EYVAR_NOW,
      decidedByUserId: currentMockUserId(),
    }
  })
}

/**
 * POST /api/v1/applications/:id/reject
 *   body: { reason: string }
 *   -> Applicant
 *   422 when `reason` is empty — a rejection with no stated reason is not appealable
 */
export async function rejectApplicant(
  id: string,
  reason: string,
  signal?: AbortSignal,
): Promise<Applicant> {
  if (DATA_SOURCE === 'http') {
    return http.post<Applicant>(`/applications/${id}/reject`, { reason }, { signal })
  }
  return mockMutation(APPLICANT_OPERATIONS.reject, signal, () => {
    const row = applicantFixtures.find((a) => a.id === id)
    if (!row) throw notFound('application', id)
    if (!reason.trim()) {
      throw new ApiError({
        status: 422,
        kind: 'validation',
        code: 'reason_required',
        message: 'A rejection needs a reason the applicant can act on',
        details: [{ field: 'reason', code: 'required', message: 'Enter a reason' }],
        retryable: false,
      })
    }
    return {
      ...row,
      status: 'rejected' as const,
      rejectionReason: reason,
      decidedAt: EYVAR_NOW,
      decidedByUserId: currentMockUserId(),
    }
  })
}

/** A claim past the stale window is already free — legacy `whoHolds` (`:18866`), minus the write. */
function liveClaim(claim: Claim | null): Claim | null {
  if (!claim || claim.state !== 'claimed') return null
  const idleMinutes = (Date.parse(EYVAR_NOW) - Date.parse(claim.touchedAt)) / 60_000
  return idleMinutes > OWNERSHIP_STALE_MINUTES ? null : claim
}

/**
 * GET /api/v1/applications/facets
 *   params: view
 *   -> Facets — field name -> [{ value, count }], count-descending
 *
 * The option set for every `select` / `multi-select` filter over applications,
 * **derived from the data**. A screen that hard-codes `Riyadh` / `Jeddah` is
 * wrong the first time a third city is seeded (finding **F-6**). Scoped by
 * `view` only, so narrowing one filter never removes the options you would
 * need to widen it again.
 *
 * Facetable fields are declared on the shape's `facetable` list above.
 */
export async function getApplicantFacets(
  view?: string | null,
  signal?: AbortSignal,
): Promise<Facets> {
  if (DATA_SOURCE === 'http') {
    return http.get<Facets>('/applications/facets', { view: view ?? undefined }, { signal })
  }
  return mock(APPLICANT_OPERATIONS.facets, signal, () => computeFacets(applicantFixtures, applicantShape, view))
}
