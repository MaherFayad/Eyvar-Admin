/**
 * Captain fairness — Support › Captain Fairness.
 *
 * Three of the sub-tab's four views are this queue; the fourth,
 * `captain-economics`, is a **reading surface** and is served by
 * `clients/metrics.ts`. See `types/fairness.ts` for why.
 *
 * The one queue in wave 2 whose SLA needed no product decision: every case
 * carries a `reasonCode` and `rcTargets(code).res` is a shipped window
 * (`:14730`).
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { EYVAR_NOW, toInstant } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import { computeFacets, runQuery, type QueryShape } from '../mock/query'
import { ApiError, type Facets, type Paginated, type QueryParams } from '../types/common'
import type { FairnessCase, FairnessCaseKind, FairnessCaseStatus } from '../types/fairness'
import { http } from './http'
import { currentMockUserId } from './session'
import { nextClaim } from './requests'
import { onFixturesLoaded, type Fixtures } from '../mock/fixtures'

/* Late-bound fixture rows. `mock/fixtures.ts` says why this is not a static
   import: a static one pins seeded data into every build, including the http
   build that can never read it. Bound before any mock read, because `mock()`
   and `mockMutation()` await `loadFixtures()`. */
let fairnessCaseFixtures!: Fixtures['fairnessCaseFixtures']
let teamUserFixtures!: Fixtures['teamUserFixtures']
onFixturesLoaded((f) => {
  fairnessCaseFixtures = f.fairnessCaseFixtures
  teamUserFixtures = f.teamUserFixtures
})

/* Session state: a mutation's result replaces its row, so the record and the
   queue read the same case after a claim or a decision (S-8). */
let dynamic: FairnessCase[] | null = null
const rows = (): readonly FairnessCase[] => dynamic ?? fairnessCaseFixtures

function commit(updated: FairnessCase): FairnessCase {
  dynamic = rows().map((c) => (c.id === updated.id ? updated : c))
  return updated
}

export function resetFairnessCases(): void {
  dynamic = null
}

export const FAIRNESS_OPERATIONS = {
  facets: 'fairness.facets',
  list: 'fairness.list',
  get: 'fairness.get',
  claim: 'fairness.claim',
  release: 'fairness.release',
  decide: 'fairness.decide',
} as const

/* Registered at module load, not on first call. `config.ts` says *"each client
   registers its ids here at module load"*, and `mock()` only registers when it
   runs — so an operation nobody has invoked yet is missing from a QA panel's
   list and from any validation of `?mockFail=`. Every id in this module is
   listed the moment the module is imported. */
registerOperations(...Object.values(FAIRNESS_OPERATIONS))

export interface FairnessQuery extends QueryParams {
  kind?: FairnessCaseKind
  status?: FairnessCaseStatus
}

const fairnessShape: QueryShape<FairnessCase> = {
  searchable: [
    (c) => c.id,
    (c) => c.driverName,
    (c) => c.subjectName,
    (c) => c.detail,
    (c) => c.tripId,
  ],
  sortable: {
    id: (c) => c.id,
    openedAt: (c) => c.openedAt,
    decidedAt: (c) => c.decidedAt,
    slaDueAt: (c) => c.slaDueAt,
    driverName: (c) => c.driverName,
    kind: (c) => c.kind,
    status: (c) => c.status,
    urgency: (c) =>
      c.slaBreachedAt ? -1 : c.slaDueAt ? Date.parse(c.slaDueAt) : Number.MAX_SAFE_INTEGER,
    /* **Added by the sort/filter sweep.** A column the operator can read is a
       column they can order by, unless ordering it is meaningless — see
       `docs/TABLE-SORT-AUDIT.md` for the three kinds this sweep left alone. */
    reasonCode: (r) => r.reasonCode,
  },
  filterable: {
    /* identity — text */
    id: (c) => c.id,
    driverId: (c) => c.driverId,
    driverName: (c) => c.driverName,
    subjectId: (c) => c.subjectId,
    subjectName: (c) => c.subjectName,
    detail: (c) => c.detail,
    tripId: (c) => c.tripId,
    rationale: (c) => c.rationale,
    suspensionReason: (c) => c.suspensionReason,

    /* closed sets — options via `getFairnessFacets` */
    kind: (c) => c.kind,
    status: (c) => c.status,
    reasonCode: (c) => c.reasonCode,
    slaSource: (c) => c.slaSource,
    claimedBy: (c) => c.claim?.ownerId ?? null,
    decidedByUserId: (c) => c.decidedByUserId,

    /* booleans */
    unclaimed: (c) => c.claim === null || c.claim.state !== 'claimed',
    breached: (c) => c.slaBreachedAt !== null,
    firstResponseBreached: (c) => c.firstResponseBreachedAt !== null,
    open: (c) => c.status === 'open',
    /** `null` until decided; `false` is *"score voided, average not recomputable"*. Three states, not two. */
    averageAdjusted: (c) => c.averageAdjusted,
    /** Whether anyone wrote down why. `false` on every legacy decision (`:15597`). */
    hasRationale: (c) => c.rationale !== null,
    reinstated: (c) => c.reinstatedAt !== null,

    /* numbers */
    disputedRating: (c) => c.disputedRating,
    slaTargetMinutes: (c) => c.slaTargetMinutes,

    /* dates */
    openedAt: (c) => toInstant(c.openedAt),
    decidedAt: (c) => toInstant(c.decidedAt),
    reinstatedAt: (c) => toInstant(c.reinstatedAt),
    slaStartedAt: (c) => toInstant(c.slaStartedAt),
    slaDueAt: (c) => toInstant(c.slaDueAt),
    slaBreachedAt: (c) => toInstant(c.slaBreachedAt),
    firstResponseDueAt: (c) => toInstant(c.firstResponseDueAt),
    firstResponseAt: (c) => toInstant(c.firstResponseAt),
    firstResponseBreachedAt: (c) => toInstant(c.firstResponseBreachedAt),
  },
  facetable: ['kind', 'status', 'reasonCode', 'slaSource', 'claimedBy', 'decidedByUserId', 'driverId'],
  views: {
    /* Three of the four the route table declares (`fixtures/routeTable.ts:581`).
       `captain-economics` is not a case list and is not here. */
    'suspension-appeals': (c) => c.kind === 'suspension-appeal',
    'rating-disputes': (c) => c.kind === 'rating-dispute',
    'rider-reports': (c) => c.kind === 'rider-report',

    all: () => true,
    open: (c) => c.status === 'open',
    decided: (c) => c.status !== 'open',
    mine: (c) => c.claim?.state === 'claimed' && c.claim.ownerId === currentMockUserId(),
    unassigned: (c) => c.claim === null || c.claim.state !== 'claimed',
    breached: (c) => c.slaBreachedAt !== null,
  },
}

/**
 * GET /api/v1/fairness-cases
 *   params: q · kind · status · page · pageSize · sort · filter ·
 *           view=suspension-appeals|rating-disputes|rider-reports|all|open|decided|mine|unassigned|breached
 *   -> Paginated<FairnessCase>
 *
 * Sortable: id · openedAt · decidedAt · slaDueAt · driverName · kind · status · urgency
 */
export async function listFairnessCases(
  params: FairnessQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<FairnessCase>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<FairnessCase>>('/fairness-cases', { ...params }, { signal })
  }
  return mock(FAIRNESS_OPERATIONS.list, signal, () => {
    const extra = [
      ...(params.kind ? [{ field: 'kind', op: 'eq' as const, value: params.kind }] : []),
      ...(params.status ? [{ field: 'status', op: 'eq' as const, value: params.status }] : []),
    ]
    const filters = extra.length ? [...(params.filters ?? []), ...extra] : params.filters
    return runQuery(rows(), { ...params, filters }, fairnessShape)
  })
}

/**
 * GET /api/v1/fairness-cases/:id
 *   -> FairnessCase
 */
export async function getFairnessCase(id: string, signal?: AbortSignal): Promise<FairnessCase> {
  if (DATA_SOURCE === 'http') {
    return http.get<FairnessCase>(`/fairness-cases/${id}`, undefined, { signal })
  }
  return mock(FAIRNESS_OPERATIONS.get, signal, () => {
    const row = rows().find((c) => c.id === id)
    if (!row) throw notFound('fairness case', id)
    return row
  })
}

/**
 * POST /api/v1/fairness-cases/:id/claim
 *   body: { takeOver?: boolean }  ·  409 when another operator holds it
 *   -> FairnessCase
 */
export async function claimFairnessCase(
  id: string,
  opts: { takeOver?: boolean } = {},
  signal?: AbortSignal,
): Promise<FairnessCase> {
  if (DATA_SOURCE === 'http') {
    return http.post<FairnessCase>(`/fairness-cases/${id}/claim`, opts, { signal })
  }
  return mockMutation(FAIRNESS_OPERATIONS.claim, signal, () => {
    const row = rows().find((c) => c.id === id)
    if (!row) throw notFound('fairness case', id)
    return commit({ ...row, claim: nextClaim('fairness', id, row.claim, opts.takeOver) })
  })
}

/**
 * POST /api/v1/fairness-cases/:id/release
 *   -> FairnessCase
 */
export async function releaseFairnessCase(id: string, signal?: AbortSignal): Promise<FairnessCase> {
  if (DATA_SOURCE === 'http') {
    return http.post<FairnessCase>(`/fairness-cases/${id}/release`, undefined, { signal })
  }
  return mockMutation(FAIRNESS_OPERATIONS.release, signal, () => {
    const row = rows().find((c) => c.id === id)
    if (!row) throw notFound('fairness case', id)
    if (!row.claim) return row
    return commit({
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

/**
 * POST /api/v1/fairness-cases/:id/decide
 *   body: { outcome: 'upheld' | 'overturned', rationale: string }
 *   -> FairnessCase
 *   403 without `approve_drivers`
 *   409 when the case is already decided
 *   422 when `rationale` is empty
 *
 * **The 422 is a proposal, not a legacy behaviour.** `decideFairness` writes
 * status, decider and timestamp and leaves `rationale` untouched (`:15597`), so
 * every decision in the legacy app is unexplained — an appeal answered with no
 * reason is the thing the appeal route exists to stop. Requiring it is a
 * **product decision for the product-owner**; the shape supports either, and
 * the mock currently enforces it so the validation state is reachable. Say the
 * word and it becomes optional in one line.
 *
 * *"A decision has to actually DO something, or an appeals process is theatre"*
 * (`:15588`): overturning a suspension sets `reinstatedAt`; overturning a
 * rating sets `averageAdjusted`, and `false` there is not a failure — it is the
 * server refusing to un-average a mean it has no denominator for (`:15606`).
 */
export async function decideFairnessCase(
  id: string,
  outcome: 'upheld' | 'overturned',
  rationale: string,
  signal?: AbortSignal,
): Promise<FairnessCase> {
  if (DATA_SOURCE === 'http') {
    return http.post<FairnessCase>(`/fairness-cases/${id}/decide`, { outcome, rationale }, { signal })
  }
  return mockMutation(FAIRNESS_OPERATIONS.decide, signal, () => {
    const row = rows().find((c) => c.id === id)
    if (!row) throw notFound('fairness case', id)
    if (row.status !== 'open') {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'already_decided',
        message: `${id} was already ${row.status}`,
        retryable: false,
      })
    }
    if (!rationale.trim()) {
      throw new ApiError({
        status: 422,
        kind: 'validation',
        code: 'rationale_required',
        message: 'A decision needs a reason the captain can read',
        details: [{ field: 'rationale', code: 'required', message: 'Enter a reason' }],
        retryable: false,
      })
    }
    const me = teamUserFixtures.find((u) => u.id === currentMockUserId())!
    const overturned = outcome === 'overturned'
    return commit({
      ...row,
      status: outcome,
      decidedAt: EYVAR_NOW,
      decidedByUserId: me.id,
      decidedByUserName: me.name,
      rationale,
      averageAdjusted:
        overturned && row.kind === 'rating-dispute'
          ? /* The server knows the rating count; the index row does not expose
               one, which is exactly why this is decided here and not in a
               component. `false` = voided, average left alone. */
            false
          : row.averageAdjusted,
      reinstatedAt: overturned && row.kind === 'suspension-appeal' ? EYVAR_NOW : row.reinstatedAt,
    })
  })
}

/**
 * GET /api/v1/fairness-cases/facets
 *   params: view
 *   -> Facets
 */
export async function getFairnessFacets(
  view?: string | null,
  signal?: AbortSignal,
): Promise<Facets> {
  if (DATA_SOURCE === 'http') {
    return http.get<Facets>('/fairness-cases/facets', { view: view ?? undefined }, { signal })
  }
  return mock(FAIRNESS_OPERATIONS.facets, signal, () =>
    computeFacets(rows(), fairnessShape, view),
  )
}
