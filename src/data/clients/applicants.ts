/**
 * Captain applications — Operations › People, view *Applications*, and the
 * level-3 detail.
 *
 * **A work queue** (§8.4, pattern P8): claim, SLA, disposition. The claim
 * operations below are the ones five surfaces across three workspaces will
 * reuse, so they are modelled once and properly rather than per screen.
 */

import { DATA_SOURCE } from '../config'
import { EYVAR_NOW } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import { runQuery, type QueryShape } from '../mock/query'
import { applicantFixtures } from '../fixtures/applicants'
import { CURRENT_USER_ID, teamUserFixtures } from '../fixtures/teamUsers'
import { OWNERSHIP_STALE_MINUTES } from '../fixtures/claims'
import { ApiError, type Claim, type Paginated, type QueryParams } from '../types/common'
import type { Applicant, ApplicantStatus } from '../types/applicant'
import { http } from './http'

export const APPLICANT_OPERATIONS = {
  list: 'applicants.list',
  get: 'applicants.get',
  claim: 'applicants.claim',
  release: 'applicants.release',
  approve: 'applicants.approve',
  reject: 'applicants.reject',
} as const

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
    status: (a) => a.status,
    vehicleClass: (a) => a.vehicleClass,
    city: (a) => a.city,
    claimedBy: (a) => a.claim?.ownerId ?? null,
    unclaimed: (a) => a.claim === null || a.claim.state !== 'claimed',
  },
  views: {
    applications: () => true,
    mine: (a) => a.claim?.state === 'claimed' && a.claim.ownerId === CURRENT_USER_ID,
    unassigned: (a) => a.claim === null || a.claim.state !== 'claimed',
    /* SLA breached. Compared against the fixed clock, not a live one, so the
       set is stable for a visual diff. */
    breached: (a) => a.slaDueAt !== null && Date.parse(a.slaDueAt) < Date.parse(EYVAR_NOW),
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
    if (held && held.ownerId !== CURRENT_USER_ID && !opts.takeOver) {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'claimed_by_other',
        message: `${held.ownerName} is holding this application`,
        retryable: false,
      })
    }
    const me = teamUserFixtures.find((u) => u.id === CURRENT_USER_ID)!
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
      decidedByUserId: CURRENT_USER_ID,
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
      decidedByUserId: CURRENT_USER_ID,
    }
  })
}

/** A claim past the stale window is already free — legacy `whoHolds` (`:18866`), minus the write. */
function liveClaim(claim: Claim | null): Claim | null {
  if (!claim || claim.state !== 'claimed') return null
  const idleMinutes = (Date.parse(EYVAR_NOW) - Date.parse(claim.touchedAt)) / 60_000
  return idleMinutes > OWNERSHIP_STALE_MINUTES ? null : claim
}
