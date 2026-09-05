/**
 * Complaints — the queue behind `Driver.openComplaints`.
 *
 * It is a work queue in the §5.1 **P8** sense — claim, SLA, disposition — so it
 * follows `clients/fairness.ts` line for line: the same `nextClaim` from
 * `clients/requests.ts`, the same `mockMutation` on every write, the same
 * conflict/validation errors. Three queues answering claim differently is three
 * take-over affordances to design.
 *
 * The one operation that is not fairness's is `resolve`, and the difference is
 * that a complaint can **pay**: `expense.compensation` exists in the chart and
 * `DB.reasonCodes[].comp` already states a per-code ceiling. That makes the
 * authority envelope (`AuthorityCheck`, §6.6) the server's business and not the
 * browser's — a ceiling the browser evaluates is a ceiling the browser can be
 * asked not to evaluate (D-F21).
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { EYVAR_NOW, toInstant } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import { computeFacets, runQuery, type QueryShape } from '../mock/query'
import { ApiError, type Facets, type Paginated, type QueryParams } from '../types/common'
import {
  isOpenComplaint,
  outcomeAuthorisesCompensation,
  type Complaint,
  type ComplaintCategory,
  type ComplaintOutcome,
  type ComplaintSeverity,
  type ComplaintStatus,
} from '../types/complaint'
import { http } from './http'
import { signalled } from '../signals'
import { currentMockUserId } from './session'
import { nextClaim, persistRow } from './requests'
import { fixturesLoaded, onFixturesLoaded, type Fixtures } from '../mock/fixtures'

/* Late-bound fixture rows. `mock/fixtures.ts` says why this is not a static
   import: a static one pins seeded data into every build, including the http
   build that can never read it. Bound before any mock read, because `mock()`
   and `mockMutation()` await `loadFixtures()`. */
/* A session COPY: a claim is written back here (AC-288). See `requests.ts`. */
let complaintSeed!: Fixtures['complaintFixtures']
let complaintFixtures!: Fixtures['complaintFixtures']
let teamUserFixtures!: Fixtures['teamUserFixtures']
onFixturesLoaded((f) => {
  complaintSeed = f.complaintFixtures
  complaintFixtures = [...f.complaintFixtures]
  teamUserFixtures = f.teamUserFixtures
})

export const COMPLAINT_OPERATIONS = {
  facets: 'complaints.facets',
  list: 'complaints.list',
  get: 'complaints.get',
  countForDriver: 'complaints.countForDriver',
  claim: 'complaints.claim',
  release: 'complaints.release',
  resolve: 'complaints.resolve',
} as const

/* Registered at module load, not on first call. `config.ts` says *"each client
   registers its ids here at module load"*, and `mock()` only registers when it
   runs — so an operation nobody has invoked yet is missing from a QA panel's
   list and from any validation of `?mockFail=`. Every id in this module is
   listed the moment the module is imported. */
registerOperations(...Object.values(COMPLAINT_OPERATIONS))

export interface ComplaintQuery extends QueryParams {
  category?: ComplaintCategory
  severity?: ComplaintSeverity
  status?: ComplaintStatus
  driverId?: string
  riderId?: string
}

const complaintShape: QueryShape<Complaint> = {
  searchable: [
    (c) => c.id,
    (c) => c.driverName,
    (c) => c.riderName,
    (c) => c.subject,
    (c) => c.detail,
    (c) => c.tripId,
  ],
  sortable: {
    id: (c) => c.id,
    filedAt: (c) => c.filedAt,
    slaDueAt: (c) => c.slaDueAt,
    driverName: (c) => c.driverName,
    riderName: (c) => c.riderName,
    category: (c) => c.category,
    severity: (c) => c.severity,
    status: (c) => c.status,
    resolvedAt: (c) => c.resolution?.resolvedAt ?? null,
    compensationHalalas: (c) => c.resolution?.compensationHalalas ?? null,
    /* Deadline, not severity. *"A 'critical' incident with four hours left is
       less urgent than a High ticket breaching in ninety seconds"* (`:19075`). */
    urgency: (c) =>
      c.slaBreachedAt ? -1 : c.slaDueAt ? Date.parse(c.slaDueAt) : Number.MAX_SAFE_INTEGER,
  },
  filterable: {
    /* identity — text */
    id: (c) => c.id,
    driverId: (c) => c.driverId,
    driverName: (c) => c.driverName,
    riderId: (c) => c.riderId,
    riderName: (c) => c.riderName,
    subject: (c) => c.subject,
    detail: (c) => c.detail,

    /* closed sets — options via `getComplaintFacets` */
    category: (c) => c.category,
    severity: (c) => c.severity,
    status: (c) => c.status,
    reasonCode: (c) => c.reasonCode,
    slaSource: (c) => c.slaSource,
    outcome: (c) => c.resolution?.outcome ?? null,
    claimedBy: (c) => c.claim?.ownerId ?? null,
    resolvedByUserId: (c) => c.resolution?.resolvedByUserId ?? null,

    /* relations */
    tripId: (c) => c.tripId,
    subscriptionId: (c) => c.subscriptionId,
    ticketId: (c) => c.ticketId,
    disputeId: (c) => c.disputeId,

    /* booleans */
    /** **The definition `Driver.openComplaints` counts** — `types/complaint.ts`. */
    open: (c) => isOpenComplaint(c.status),
    unclaimed: (c) => c.claim === null || c.claim.state !== 'claimed',
    breached: (c) => c.slaBreachedAt !== null,
    firstResponseBreached: (c) => c.firstResponseBreachedAt !== null,
    /** Nobody has answered yet, whatever the clock says about it. */
    unanswered: (c) => c.firstResponseAt === null,
    /** Whether any money moved. `0` on an upheld complaint is a real answer. */
    compensated: (c) => (c.resolution?.compensationHalalas ?? 0) > 0,
    escalatedToDispute: (c) => c.disputeId !== null,
    /** The `vehicle-condition` case: no reason code, so no clock at all (Q8). */
    unclocked: (c) => c.slaDueAt === null,

    /* numbers */
    slaTargetMinutes: (c) => c.slaTargetMinutes,
    compensationHalalas: (c) => c.resolution?.compensationHalalas ?? null,

    /* dates */
    filedAt: (c) => toInstant(c.filedAt),
    resolvedAt: (c) => toInstant(c.resolution?.resolvedAt ?? null),
    slaStartedAt: (c) => toInstant(c.slaStartedAt),
    slaDueAt: (c) => toInstant(c.slaDueAt),
    slaBreachedAt: (c) => toInstant(c.slaBreachedAt),
    firstResponseDueAt: (c) => toInstant(c.firstResponseDueAt),
    firstResponseAt: (c) => toInstant(c.firstResponseAt),
    firstResponseBreachedAt: (c) => toInstant(c.firstResponseBreachedAt),
  },
  facetable: ['category', 'severity', 'status', 'reasonCode', 'slaSource', 'claimedBy', 'driverId'],
  views: {
    all: () => true,
    open: (c) => isOpenComplaint(c.status),
    resolved: (c) => c.status === 'resolved',
    mine: (c) => c.claim?.state === 'claimed' && c.claim.ownerId === currentMockUserId(),
    unassigned: (c) => c.claim === null || c.claim.state !== 'claimed',
    breached: (c) => c.slaBreachedAt !== null,
    /** Severity `critical`, whatever the clock says. The triage lane. */
    critical: (c) => c.severity === 'critical' && isOpenComplaint(c.status),
  },
}

/**
 * GET /api/v1/complaints
 *   params: q · category · severity · status · driverId · riderId ·
 *           page · pageSize · sort · filter ·
 *           view=all|open|resolved|mine|unassigned|breached|critical
 *   -> Paginated<Complaint>
 *
 * Sortable: id · filedAt · slaDueAt · driverName · riderName · category ·
 *           severity · status · resolvedAt · compensationHalalas · urgency
 *
 * `severity` is a **domain** field and does not order the queue — `urgency`
 * does, off the deadline (`types/workQueue.ts`). `slaDueAt === null` is a value
 * and not a missing one: `vehicle-condition` has no reason code, so it has no
 * clock, and it sorts last rather than first.
 */
export async function listComplaints(
  params: ComplaintQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<Complaint>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<Complaint>>('/complaints', { ...params }, { signal })
  }
  return mock(COMPLAINT_OPERATIONS.list, signal, () => {
    const extra = [
      ...(params.category ? [{ field: 'category', op: 'eq' as const, value: params.category }] : []),
      ...(params.severity ? [{ field: 'severity', op: 'eq' as const, value: params.severity }] : []),
      ...(params.status ? [{ field: 'status', op: 'eq' as const, value: params.status }] : []),
      ...(params.driverId ? [{ field: 'driverId', op: 'eq' as const, value: params.driverId }] : []),
      ...(params.riderId ? [{ field: 'riderId', op: 'eq' as const, value: params.riderId }] : []),
    ]
    const filters = extra.length ? [...(params.filters ?? []), ...extra] : params.filters
    return runQuery(complaintFixtures, { ...params, filters }, complaintShape)
  })
}

/**
 * GET /api/v1/complaints/:id
 *   -> Complaint
 *   404 naming the id (§9.2 `overlay-not-found`).
 */
export async function getComplaint(id: string, signal?: AbortSignal): Promise<Complaint> {
  if (DATA_SOURCE === 'http') return http.get<Complaint>(`/complaints/${id}`, undefined, { signal })
  return mock(COMPLAINT_OPERATIONS.get, signal, () => {
    const row = complaintFixtures.find((c) => c.id === id)
    if (!row) throw notFound('complaint', id)
    return row
  })
}

/**
 * GET /api/v1/complaints/count
 *   params: driverId
 *   -> { count, ids }
 *
 * **What `Driver.openComplaints` is, computed from the complaints rather than
 * stored beside them.**
 *
 * It is here and not on the driver record because a count stored next to the
 * thing it counts is `EscrowHold.status: 'ready'` all over again (**D-F19**): a
 * derived value persisted as data, free to disagree with the rows printed
 * beside it — which is exactly what happened, `DRV-0202` claiming 2 open
 * complaints and carrying `complaintIds: []`.
 *
 * `Driver.openComplaints` stays on the driver record because the captains index
 * sorts and filters on it and an index cannot fan out per row; this endpoint is
 * what a **detail** surface reads, and what the two can be reconciled against.
 */
export async function countOpenComplaints(
  driverId: string,
  signal?: AbortSignal,
): Promise<{ count: number; ids: string[] }> {
  if (DATA_SOURCE === 'http') {
    return http.get<{ count: number; ids: string[] }>(
      '/complaints/count',
      { driverId },
      { signal },
    )
  }
  return mock(COMPLAINT_OPERATIONS.countForDriver, signal, () => {
    const open = complaintFixtures.filter(
      (c) => c.driverId === driverId && isOpenComplaint(c.status),
    )
    return { count: open.length, ids: open.map((c) => c.id) }
  })
}

/**
 * POST /api/v1/complaints/:id/claim
 *   body: { takeOver?: boolean }  ·  409 when another operator holds it
 *   -> Complaint
 */
export async function claimComplaint(
  id: string,
  opts: { takeOver?: boolean } = {},
  signal?: AbortSignal,
): Promise<Complaint> {
  if (DATA_SOURCE === 'http') {
    return signalled('queue.item.claimed', http.post<Complaint>(`/complaints/${id}/claim`, opts, { signal }))
  }
  return signalled('queue.item.claimed', mockMutation(COMPLAINT_OPERATIONS.claim, signal, () => {
    const row = complaintFixtures.find((c) => c.id === id)
    if (!row) throw notFound('complaint', id)
    return persistRow(complaintFixtures, {
      ...row,
      claim: nextClaim('complaint', id, row.claim, opts.takeOver),
    })
  }))
}

/**
 * POST /api/v1/complaints/:id/release
 *   -> Complaint
 */
export async function releaseComplaint(id: string, signal?: AbortSignal): Promise<Complaint> {
  if (DATA_SOURCE === 'http') {
    return http.post<Complaint>(`/complaints/${id}/release`, undefined, { signal })
  }
  return mockMutation(COMPLAINT_OPERATIONS.release, signal, () => {
    const row = complaintFixtures.find((c) => c.id === id)
    if (!row) throw notFound('complaint', id)
    if (!row.claim) return row
    return persistRow(complaintFixtures, {
      ...row,
      claim: {
        ...row.claim,
        state: 'released' as const,
        releasedAt: EYVAR_NOW,
        releaseReason: 'manual' as const,
      },
    })
  })
}

export interface ResolveComplaintInput {
  outcome: ComplaintOutcome
  /** Integer halalas. `0` is legitimate on any outcome; required to be `0` on `dismissed`. */
  compensationHalalas: number
  note: string | null
}

/**
 * POST /api/v1/complaints/:id/resolve
 *   body: { outcome, compensationHalalas, note }
 *   -> Complaint
 *   403 without the support disposition permission
 *   409 when the complaint is already disposed
 *   422 when `dismissed` carries compensation, or compensation is not a
 *       non-negative integer
 *
 * **The 422 on `dismissed` + money is a type invariant, not a house style.**
 * `ComplaintResolution.compensationHalalas` is documented as `0` on
 * `dismissed`, *and only there*; a client that could write both would make the
 * record say two things at once. The check is here because it is the server's:
 * legacy's `compCheck` is bypassed entirely unless the reason label contains
 * the literal string `'Goodwill'` (`:3985`, **D-F21**), which is what a ceiling
 * enforced on the caller's side looks like in practice.
 *
 * **Fractional halalas are refused rather than rounded.** Rounding here would
 * put a float into a ledger that has none, and the caller would never know.
 *
 * A `withdrawn` complaint is not resolvable through this endpoint: nobody
 * decided anything, and `resolution` must stay `null` (`types/complaint.ts`).
 *
 * The per-case ceiling itself is **not** checked here — it is
 * `AuthorityCheck`'s, served from `clients/wallets.ts`, because the ceiling
 * depends on the operator's role and on what they have already spent today
 * (§6.6, AC-384/AC-439). This endpoint refuses what is structurally impossible;
 * the envelope refuses what is unauthorised.
 */
export async function resolveComplaint(
  id: string,
  input: ResolveComplaintInput,
  signal?: AbortSignal,
): Promise<Complaint> {
  if (DATA_SOURCE === 'http') {
    return signalled('queue.item.disposed', http.post<Complaint>(`/complaints/${id}/resolve`, { ...input }, { signal }))
  }
  return signalled('queue.item.disposed', mockMutation(COMPLAINT_OPERATIONS.resolve, signal, () => {
    const row = complaintFixtures.find((c) => c.id === id)
    if (!row) throw notFound('complaint', id)
    if (!isOpenComplaint(row.status)) {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'already_disposed',
        message: `${id} was already ${row.status}`,
        retryable: false,
      })
    }
    if (
      !Number.isInteger(input.compensationHalalas) ||
      input.compensationHalalas < 0
    ) {
      throw new ApiError({
        status: 422,
        kind: 'validation',
        code: 'compensation_not_minor_units',
        message: 'Compensation must be a non-negative whole number of halalas',
        details: [
          {
            field: 'compensationHalalas',
            code: 'invalid',
            message: 'Enter a whole amount',
          },
        ],
        retryable: false,
      })
    }
    if (!outcomeAuthorisesCompensation(input.outcome) && input.compensationHalalas > 0) {
      throw new ApiError({
        status: 422,
        kind: 'validation',
        code: 'dismissed_pays_nothing',
        message: 'A dismissed complaint pays nothing',
        details: [
          {
            field: 'compensationHalalas',
            code: 'must_be_zero',
            message: 'Choose an outcome that authorises compensation, or clear the amount',
          },
        ],
        retryable: false,
      })
    }
    const me = teamUserFixtures.find((u) => u.id === currentMockUserId())!
    return {
      ...row,
      status: 'resolved' as const,
      resolution: {
        outcome: input.outcome,
        compensationHalalas: input.compensationHalalas,
        /* **Never a fabricated id.** A compensation credit posts to
           `expense.compensation` and is not a refund of a sale, so it mints no
           `Refund` and no credit note (§3.4). The field exists for the case
           where the remedy genuinely was a refund, and that path issues one
           through `clients/revenue.ts`. */
        refundId: null,
        note: input.note,
        resolvedAt: EYVAR_NOW,
        resolvedByUserId: me.id,
        resolvedByUserName: me.name,
      },
    }
  }))
}

/**
 * GET /api/v1/complaints/facets
 *   params: view
 *   -> Facets
 *
 * `driverId` is faceted, so *"which captains have complaints, and how many"* is
 * one request rather than a client-side group-by over a paginated list — which
 * is what `repeatCount` on `CashReport` exists to avoid and what legacy does at
 * `:12098`, O(rows²) and wrong on a truncated page.
 */
export async function getComplaintFacets(
  view?: string | null,
  signal?: AbortSignal,
): Promise<Facets> {
  if (DATA_SOURCE === 'http') {
    return http.get<Facets>('/complaints/facets', { view: view ?? undefined }, { signal })
  }
  return mock(COMPLAINT_OPERATIONS.facets, signal, () =>
    computeFacets(complaintFixtures, complaintShape, view),
  )
}

/* ── AC-288 session state ──────────────────────────────────────────────── */

/**
 * Back to the seeded rows. Registered in `resetDataLayer`, for the reason
 * `tickets.ts` gives: one file's claim would otherwise ride into the next
 * file's count of open complaints.
 */
export function resetComplaintRows(): void {
  if (!fixturesLoaded()) return
  complaintFixtures = [...complaintSeed]
}

/**
 * The session's rows, synchronously, for the cross-queue projection in
 * `clients/myWork.ts`. Reads the same array a claim writes, so a claim made
 * from My Work is the claim this queue reports.
 *
 * Mock only. In http mode My Work is one server query and this is never called.
 */
export function currentComplaints(): readonly Complaint[] {
  return complaintFixtures ?? []
}
