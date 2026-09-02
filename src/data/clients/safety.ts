/**
 * Safety & incidents — Support › Safety & Incidents, three views
 * (`open`, `critical-sos`, `closed`).
 *
 * The queue notification **N7** has been pointing at since the notification
 * fixtures were written. `fixtures/navCounts.ts` recorded that gap and left
 * `support-safety` at zero because there was nothing to count; it now spends
 * the product's one visible `attention` tone here.
 *
 * A work queue (§8.4, **P8**) with an unusual disposition: the four-step
 * protocol, and `closeIncident` refuses while any step is unticked (`:13483`).
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { EYVAR_NOW, toInstant } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import { computeFacets, runQuery, type QueryShape } from '../mock/query'
import { ApiError, type Facets, type Paginated, type QueryParams } from '../types/common'
import type {
  SafetyIncident,
  SafetyIncidentStatus,
  SafetyIncidentType,
  SafetyProtocolStepKey,
} from '../types/safety'
import { SAFETY_PROTOCOL_STEPS } from '../types/safety'
import { http } from './http'
import { currentMockUserId } from './session'
import { nextClaim } from './requests'
import { onFixturesLoaded, type Fixtures } from '../mock/fixtures'

/* Late-bound fixture rows. `mock/fixtures.ts` says why this is not a static
   import: a static one pins seeded data into every build, including the http
   build that can never read it. Bound before any mock read, because `mock()`
   and `mockMutation()` await `loadFixtures()`. */
let safetyIncidentFixtures!: Fixtures['safetyIncidentFixtures']
let safetyIncidentFixturesAllClosed!: Fixtures['safetyIncidentFixturesAllClosed']
let teamUserFixtures!: Fixtures['teamUserFixtures']
onFixturesLoaded((f) => {
  safetyIncidentFixtures = f.safetyIncidentFixtures
  safetyIncidentFixturesAllClosed = f.safetyIncidentFixturesAllClosed
  teamUserFixtures = f.teamUserFixtures
})

export const SAFETY_OPERATIONS = {
  facets: 'safety.facets',
  list: 'safety.list',
  get: 'safety.get',
  claim: 'safety.claim',
  release: 'safety.release',
  step: 'safety.step',
  suspend: 'safety.suspend',
  close: 'safety.close',
} as const

/* Registered at module load, not on first call. `config.ts` says *"each client
   registers its ids here at module load"*, and `mock()` only registers when it
   runs — so an operation nobody has invoked yet is missing from a QA panel's
   list and from any validation of `?mockFail=`. Every id in this module is
   listed the moment the module is imported. */
registerOperations(...Object.values(SAFETY_OPERATIONS))

export interface SafetyQuery extends QueryParams {
  status?: SafetyIncidentStatus
  type?: SafetyIncidentType
}

/** Which fixture set the mock serves. Switched by QA; never by app code. */
type SafetyScenario = 'default' | 'quiet'
let scenario: SafetyScenario = 'default'
const rows = () => (scenario === 'quiet' ? safetyIncidentFixturesAllClosed : safetyIncidentFixtures)

const stepsDone = (i: SafetyIncident) => i.protocol.filter((s) => s.done).length

const safetyShape: QueryShape<SafetyIncident> = {
  searchable: [
    (i) => i.id,
    (i) => i.summary,
    (i) => i.reporterName,
    (i) => i.againstName,
    (i) => i.tripId,
  ],
  sortable: {
    id: (i) => i.id,
    openedAt: (i) => i.openedAt,
    closedAt: (i) => i.closedAt,
    slaDueAt: (i) => i.slaDueAt,
    severity: (i) => ({ critical: 0, high: 1, normal: 2 })[i.severity],
    status: (i) => i.status,
    type: (i) => i.type,
    stepsComplete: (i) => stepsDone(i),
    /**
     * The inbox's own order — breached first, then by deadline, undated last
     * (`:19212`). **Not by severity**: *"a 'critical' incident with four hours
     * left is less urgent than a High ticket breaching in ninety seconds"*
     * (`:19074`).
     */
    urgency: (i) =>
      i.firstResponseBreachedAt || i.slaBreachedAt
        ? -1
        : i.slaDueAt
          ? Date.parse(i.slaDueAt)
          : Number.MAX_SAFE_INTEGER,
  },
  filterable: {
    /* identity — text */
    id: (i) => i.id,
    summary: (i) => i.summary,
    tripId: (i) => i.tripId,
    reporterId: (i) => i.reporterId,
    reporterName: (i) => i.reporterName,
    againstId: (i) => i.againstId,
    againstName: (i) => i.againstName,

    /* closed sets — options via `getSafetyFacets` */
    type: (i) => i.type,
    severity: (i) => i.severity,
    status: (i) => i.status,
    reporterKind: (i) => i.reporterKind,
    reasonCode: (i) => i.reasonCode,
    workSeverity: (i) => i.workSeverity,
    slaSource: (i) => i.slaSource,
    claimedBy: (i) => i.claim?.ownerId ?? null,
    closedByUserId: (i) => i.closedByUserId,
    suspendedDriverId: (i) => i.precautionarySuspension?.driverId ?? null,

    /* booleans */
    unclaimed: (i) => i.claim === null || i.claim.state !== 'claimed',
    /** Either clock. An SOS breaches its response long before its resolution. */
    breached: (i) => i.slaBreachedAt !== null || i.firstResponseBreachedAt !== null,
    resolveBreached: (i) => i.slaBreachedAt !== null,
    firstResponseBreached: (i) => i.firstResponseBreachedAt !== null,
    /** **The `null` case is real and the filter has to reach it** — `INC-017`. */
    hasReporter: (i) => i.reporterId !== null,
    hasCounterparty: (i) => i.againstId !== null,
    precautionarySuspension: (i) => i.precautionarySuspension !== null,
    /** No `reasonCode` covers this type, so there is no clock. Not a breach; not a zero. */
    hasSla: (i) => i.slaDueAt !== null,
    protocolComplete: (i) => stepsDone(i) === SAFETY_PROTOCOL_STEPS.length,

    /* numbers */
    stepsComplete: (i) => stepsDone(i),
    stepsOutstanding: (i) => SAFETY_PROTOCOL_STEPS.length - stepsDone(i),
    slaTargetMinutes: (i) => i.slaTargetMinutes,

    /* dates */
    openedAt: (i) => toInstant(i.openedAt),
    closedAt: (i) => toInstant(i.closedAt),
    slaStartedAt: (i) => toInstant(i.slaStartedAt),
    slaDueAt: (i) => toInstant(i.slaDueAt),
    slaBreachedAt: (i) => toInstant(i.slaBreachedAt),
    firstResponseDueAt: (i) => toInstant(i.firstResponseDueAt),
    firstResponseAt: (i) => toInstant(i.firstResponseAt),
    firstResponseBreachedAt: (i) => toInstant(i.firstResponseBreachedAt),
  },
  facetable: [
    'type',
    'severity',
    'status',
    'reporterKind',
    'reasonCode',
    'workSeverity',
    'slaSource',
    'claimedBy',
    'againstId',
  ],
  views: {
    /* The three the route table declares (`fixtures/routeTable.ts:602`). */
    open: (i) => i.status === 'open',
    'critical-sos': (i) => i.severity === 'critical',
    closed: (i) => i.status === 'closed',

    all: () => true,
    mine: (i) => i.claim?.state === 'claimed' && i.claim.ownerId === currentMockUserId(),
    unassigned: (i) => i.claim === null || i.claim.state !== 'claimed',
    breached: (i) => i.slaBreachedAt !== null || i.firstResponseBreachedAt !== null,
  },
}

/**
 * GET /api/v1/incidents
 *   params: q · status · type · page · pageSize · sort · filter ·
 *           view=open|critical-sos|closed|all|mine|unassigned|breached
 *   -> Paginated<SafetyIncident>
 *
 * Sortable: id · openedAt · closedAt · slaDueAt · severity · status · type ·
 *           stepsComplete · urgency
 *
 * **Two clocks.** `firstResponseDueAt` and `slaDueAt` are independent, and an
 * open SOS breaches the first while the second still runs — see
 * `types/workQueue.ts`. A screen that renders one countdown must say which.
 *
 * `slaDueAt` is `null` on `harassment` and `other`: no §6 reason code covers
 * them and **Q8 has not set one**. That renders no countdown and no breach, not
 * a zero.
 */
export async function listSafetyIncidents(
  params: SafetyQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<SafetyIncident>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<SafetyIncident>>('/incidents', { ...params }, { signal })
  }
  return mock(SAFETY_OPERATIONS.list, signal, () => {
    const extra = [
      ...(params.status ? [{ field: 'status', op: 'eq' as const, value: params.status }] : []),
      ...(params.type ? [{ field: 'type', op: 'eq' as const, value: params.type }] : []),
    ]
    const filters = extra.length ? [...(params.filters ?? []), ...extra] : params.filters
    return runQuery(rows(), { ...params, filters }, safetyShape)
  })
}

/**
 * GET /api/v1/incidents/:id
 *   -> SafetyIncident
 */
export async function getSafetyIncident(id: string, signal?: AbortSignal): Promise<SafetyIncident> {
  if (DATA_SOURCE === 'http') return http.get<SafetyIncident>(`/incidents/${id}`, undefined, { signal })
  return mock(SAFETY_OPERATIONS.get, signal, () => {
    const row = rows().find((i) => i.id === id)
    if (!row) throw notFound('incident', id)
    return row
  })
}

/**
 * POST /api/v1/incidents/:id/claim
 *   body: { takeOver?: boolean }  ·  409 when another operator holds it
 *   -> SafetyIncident   (with `firstResponseAt` stamped, if it was not already)
 *
 * ## **Claiming IS the acknowledgement — AC-305**
 *
 * This endpoint used to set `claim` and nothing else, and the criterion failed
 * *here*, in the client, rather than on the screen: an incident could be
 * claimed, worked and closed while the acknowledgement clock still read as never
 * answered. Safety carries two independent clocks (`firstResponseDueAt` and
 * `slaDueAt`) and this is the one that makes the first of them mean anything.
 *
 * The protocol's first tick already stamped a response (`setSafetyProtocolStep`
 * below), which was the right rule applied one step too late: an operator who
 * claims an SOS at 09:14 and reaches the rider before opening the checklist had
 * responded, and the queue said otherwise.
 *
 * > **Stamped only when `firstResponseAt` is null. Never overwritten.**
 *
 * A claim released and re-taken must not reset it. First response is *first*;
 * a stamp that moved would measure the last handler's arrival instead of the
 * response, which is the number a regulator and a post-incident review both
 * ask for. `takeOver` is the case that proves it — a supervisor seizing the
 * incident half an hour in does not un-answer the phone.
 *
 * `firstResponseBreachedAt` clears on the same terms as the protocol path: the
 * *response* breach ends when someone responds, and the resolve clock's
 * `slaBreachedAt` is untouched, because answering is not resolving.
 */
export async function claimSafetyIncident(
  id: string,
  opts: { takeOver?: boolean } = {},
  signal?: AbortSignal,
): Promise<SafetyIncident> {
  if (DATA_SOURCE === 'http') {
    return http.post<SafetyIncident>(`/incidents/${id}/claim`, opts, { signal })
  }
  return mockMutation(SAFETY_OPERATIONS.claim, signal, () => {
    const row = rows().find((i) => i.id === id)
    if (!row) throw notFound('incident', id)
    const respondingNow = row.firstResponseAt === null
    return {
      ...row,
      claim: nextClaim('incident', id, row.claim, opts.takeOver),
      firstResponseAt: respondingNow ? EYVAR_NOW : row.firstResponseAt,
      firstResponseBreachedAt: respondingNow ? null : row.firstResponseBreachedAt,
    }
  })
}

/**
 * POST /api/v1/incidents/:id/release
 *   -> SafetyIncident
 */
export async function releaseSafetyIncident(
  id: string,
  signal?: AbortSignal,
): Promise<SafetyIncident> {
  if (DATA_SOURCE === 'http') {
    return http.post<SafetyIncident>(`/incidents/${id}/release`, undefined, { signal })
  }
  return mockMutation(SAFETY_OPERATIONS.release, signal, () => {
    const row = rows().find((i) => i.id === id)
    if (!row) throw notFound('incident', id)
    if (!row.claim) return row
    return {
      ...row,
      claim: {
        ...row.claim,
        state: 'released' as const,
        releasedAt: EYVAR_NOW,
        releaseReason: 'manual' as const,
      },
    }
  })
}

/**
 * PATCH /api/v1/incidents/:id/protocol/:step
 *   body: { done: boolean }
 *   -> SafetyIncident
 *   409 on a closed incident — legacy disables the checkbox (`:13425`) rather
 *       than refusing, so the rule was never expressible over an API
 *
 * **The first tick is the first response.** Ticking `contact` on an incident
 * with no `firstResponseAt` stamps one, which is what stops an SOS sitting in
 * the breached band after someone has actually picked up the phone.
 *
 * Un-ticking is deliberately supported and deliberately audited: legacy logs it
 * and toasts it, because *"undoing a safety-record step is still a notable
 * action, not silent"* (`:13453`).
 */
export async function setSafetyProtocolStep(
  id: string,
  step: SafetyProtocolStepKey,
  done: boolean,
  signal?: AbortSignal,
): Promise<SafetyIncident> {
  if (DATA_SOURCE === 'http') {
    return http.patch<SafetyIncident>(`/incidents/${id}/protocol/${step}`, { done }, { signal })
  }
  return mockMutation(SAFETY_OPERATIONS.step, signal, () => {
    const row = rows().find((i) => i.id === id)
    if (!row) throw notFound('incident', id)
    if (row.status === 'closed') {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'incident_closed',
        message: `${id} is closed — reopen it before changing the record`,
        retryable: false,
      })
    }
    const me = teamUserFixtures.find((u) => u.id === currentMockUserId())!
    const respondingNow = done && row.firstResponseAt === null
    return {
      ...row,
      protocol: row.protocol.map((s) =>
        s.key === step
          ? {
              ...s,
              done,
              completedByUserId: done ? me.id : null,
              completedByUserName: done ? me.name : null,
              completedAt: done ? EYVAR_NOW : null,
            }
          : s,
      ),
      firstResponseAt: respondingNow ? EYVAR_NOW : row.firstResponseAt,
      /* Answering clears the *response* breach going forward; it does not
         rewrite history — `slaBreachedAt` on the resolve clock is untouched. */
      firstResponseBreachedAt: respondingNow ? null : row.firstResponseBreachedAt,
    }
  })
}

/**
 * POST /api/v1/incidents/:id/precautionary-suspension
 *   body: { reason: string }
 *
 * `driverId` is NOT sent: the incident already names its counterparty and the
 * server resolves it, which is also why the 422 below is the server's to raise.
 * A client-supplied id would let a caller suspend somebody the incident does
 * not name.
 *   -> SafetyIncident   (with `act` ticked and `precautionarySuspension` set)
 *   403 without `approve_drivers`
 *   422 when the incident has no counterparty to suspend
 *
 * Suspending is the `act` step, so it ticks it (`:13473`). The 422 exists
 * because `INC-013` and `INC-017` have `againstId: null` — a captain reporting
 * their own collision, and a device-raised incident with nobody named. Legacy
 * hides the button in that case (`:13444`); an API has to answer.
 */
export async function precautionarilySuspend(
  id: string,
  reason: string,
  signal?: AbortSignal,
): Promise<SafetyIncident> {
  if (DATA_SOURCE === 'http') {
    return http.post<SafetyIncident>(`/incidents/${id}/precautionary-suspension`, { reason }, { signal })
  }
  return mockMutation(SAFETY_OPERATIONS.suspend, signal, () => {
    const row = rows().find((i) => i.id === id)
    if (!row) throw notFound('incident', id)
    if (!row.againstId) {
      throw new ApiError({
        status: 422,
        kind: 'validation',
        code: 'no_counterparty',
        message: `${id} names nobody to suspend`,
        retryable: false,
      })
    }
    const me = teamUserFixtures.find((u) => u.id === currentMockUserId())!
    return {
      ...row,
      precautionarySuspension: {
        driverId: row.againstId,
        driverName: row.againstName ?? row.againstId,
        reason,
        at: EYVAR_NOW,
        byUserId: me.id,
        byUserName: me.name,
      },
      protocol: row.protocol.map((s) =>
        s.key === 'act'
          ? { ...s, done: true, completedByUserId: me.id, completedByUserName: me.name, completedAt: EYVAR_NOW }
          : s,
      ),
    }
  })
}

/**
 * POST /api/v1/incidents/:id/close
 *   -> SafetyIncident
 *   422 when any protocol step is outstanding
 *
 * *"Nothing closes without all four steps"* (`:13388`). The 422 names the ones
 * that are missing, so the error state can list them rather than say "no".
 */
export async function closeSafetyIncident(
  id: string,
  signal?: AbortSignal,
): Promise<SafetyIncident> {
  if (DATA_SOURCE === 'http') {
    return http.post<SafetyIncident>(`/incidents/${id}/close`, undefined, { signal })
  }
  return mockMutation(SAFETY_OPERATIONS.close, signal, () => {
    const row = rows().find((i) => i.id === id)
    if (!row) throw notFound('incident', id)
    const outstanding = row.protocol.filter((s) => !s.done)
    if (outstanding.length > 0) {
      throw new ApiError({
        status: 422,
        kind: 'validation',
        code: 'protocol_incomplete',
        message: `${outstanding.length} of ${SAFETY_PROTOCOL_STEPS.length} protocol steps are outstanding`,
        details: outstanding.map((s) => ({
          field: `protocol.${s.key}`,
          code: 'incomplete',
          message: `${s.key} has not been completed`,
        })),
        retryable: false,
      })
    }
    const me = teamUserFixtures.find((u) => u.id === currentMockUserId())!
    return {
      ...row,
      status: 'closed' as const,
      closedAt: EYVAR_NOW,
      closedByUserId: me.id,
      closedByUserName: me.name,
    }
  })
}

/**
 * GET /api/v1/incidents/facets
 *   params: view
 *   -> Facets
 */
export async function getSafetyFacets(view?: string | null, signal?: AbortSignal): Promise<Facets> {
  if (DATA_SOURCE === 'http') {
    return http.get<Facets>('/incidents/facets', { view: view ?? undefined }, { signal })
  }
  return mock(SAFETY_OPERATIONS.facets, signal, () => computeFacets(rows(), safetyShape, view))
}

/* ─────────────────────────── QA affordances ────────────────────────────── */

/**
 * Serve the **quiet-queue** set: every incident closed, protocol complete,
 * nothing breached. The console at the end of a good night, and the state the
 * nav badge disappears in (`count: 0` renders nothing, Q12).
 */
export function useQuietSafetyQueue(): void {
  scenario = 'quiet'
}

export function resetSafetyIncidents(): void {
  scenario = 'default'
}
