/**
 * Trip Assurance — Operations › Trip Assurance.
 *
 * **Two resources on one sub-tab**, the way People carries four: upcoming legs
 * (`AssuranceTrip`) and the strike ledger (`AbsenceEvent`). `types/assurance.ts`
 * explains why they are not one type.
 *
 * The `absences` view is served by `listAbsences` and is **empty by default** —
 * legacy ships `DB.absenceEvents = []` (`:16564`) and an empty strike ledger is
 * the healthy state, not a missing fixture. `useAbsenceHistory()` populates it.
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { EYVAR_NOW, toInstant } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import { computeFacets, runQuery, type QueryShape } from '../mock/query'
import { ApiError, type Facets, type Paginated, type QueryParams } from '../types/common'
import type { AbsenceEvent, AssuranceTrip, LegAckSource } from '../types/assurance'
import {
  ASSURANCE_DEPARTING_WINDOW_HOURS,
  BACKUP_OFFER_WINDOW_MINUTES,
  LEG_ACK_WEIGHT,
} from '../types/assurance'
import { http } from './http'
import { currentMockUserId } from './session'
import { nextClaim } from './requests'
import { onFixturesLoaded, type Fixtures } from '../mock/fixtures'

/* Late-bound fixture rows. `mock/fixtures.ts` says why this is not a static
   import: a static one pins seeded data into every build, including the http
   build that can never read it. Bound before any mock read, because `mock()`
   and `mockMutation()` await `loadFixtures()`. */
let absenceEventFixtures!: Fixtures['absenceEventFixtures']
let absenceEventHistoryFixtures!: Fixtures['absenceEventHistoryFixtures']
let assuranceTripFixtures!: Fixtures['assuranceTripFixtures']
let teamUserFixtures!: Fixtures['teamUserFixtures']
onFixturesLoaded((f) => {
  absenceEventFixtures = f.absenceEventFixtures
  absenceEventHistoryFixtures = f.absenceEventHistoryFixtures
  assuranceTripFixtures = f.assuranceTripFixtures
  teamUserFixtures = f.teamUserFixtures
})

export const ASSURANCE_OPERATIONS = {
  facets: 'assurance.facets',
  list: 'assurance.list',
  get: 'assurance.get',
  claim: 'assurance.claim',
  release: 'assurance.release',
  acknowledge: 'assurance.acknowledge',
  offerBackup: 'assurance.offerBackup',
  absences: 'assurance.absences',
  waiveAbsence: 'assurance.waiveAbsence',
} as const

/* Registered at module load, not on first call. `config.ts` says *"each client
   registers its ids here at module load"*, and `mock()` only registers when it
   runs — so an operation nobody has invoked yet is missing from a QA panel's
   list and from any validation of `?mockFail=`. Every id in this module is
   listed the moment the module is imported. */
registerOperations(...Object.values(ASSURANCE_OPERATIONS))

export interface AssuranceQuery extends QueryParams {
  subscriptionId?: string
}

export interface AbsenceQuery extends QueryParams {
  driverId?: string
}

/** Hours from the fixed clock to departure. Negative once a leg has left. */
const hoursToDeparture = (t: AssuranceTrip): number =>
  (Date.parse(t.departsAt) - Date.parse(EYVAR_NOW)) / 3_600_000

/**
 * Legacy `coverageStats` counts a plan **eligible** only when the registered
 * backup would actually be dispatched (`:17500`). `no-backup-captain` is the
 * complement — the gap `renderCoverage` calls the only number that matters.
 */
const lacksEligibleBackup = (t: AssuranceTrip): boolean => !t.backupEligible

const assuranceShape: QueryShape<AssuranceTrip> = {
  searchable: [
    (t) => t.id,
    (t) => t.subscriptionId,
    (t) => t.riderName,
    (t) => t.driverName,
    (t) => t.route,
  ],
  sortable: {
    id: (t) => t.id,
    departsAt: (t) => t.departsAt,
    slaDueAt: (t) => t.slaDueAt,
    riderName: (t) => t.riderName,
    driverName: (t) => t.driverName,
    planKey: (t) => t.planKey,
    minutesToPickup: (t) => t.minutesToPickup,
    nearbyEligibleCount: (t) => t.nearbyEligibleCount,
    /* Departure order, which is the order the risk arrives in. */
    urgency: (t) => Date.parse(t.departsAt),
  },
  filterable: {
    /* identity — text */
    id: (t) => t.id,
    subscriptionId: (t) => t.subscriptionId,
    riderId: (t) => t.riderId,
    riderName: (t) => t.riderName,
    driverId: (t) => t.driverId,
    driverName: (t) => t.driverName,
    route: (t) => t.route,
    pickup: (t) => t.pickup,
    destination: (t) => t.destination,
    backupIneligibleReason: (t) => t.backupIneligibleReason,
    captainUnavailableReason: (t) => t.captainUnavailableReason,

    /* closed sets — options via `getAssuranceFacets` */
    planKey: (t) => t.planKey,
    planName: (t) => t.planName,
    captainDepartureState: (t) => t.captainDepartureState,
    ackSource: (t) => t.acknowledgement?.source ?? null,
    /** `strong` | `attested` | `weak` — three different things that all look like a tick (`:18127`). */
    ackWeight: (t) => t.acknowledgement?.weight ?? null,
    offerState: (t) => t.backupOffer?.state ?? null,
    backupDriverId: (t) => t.backupDriverId,
    claimedBy: (t) => t.claim?.ownerId ?? null,
    slaSource: (t) => t.slaSource,

    /* booleans */
    riderConfirmed: (t) => t.riderConfirmed,
    captainAcknowledged: (t) => t.acknowledgement !== null,
    /** The `assumed` case. Not a confirmation (`:18135`), and the filter has to find it. */
    ackAssumed: (t) => t.acknowledgement?.weight === 'weak',
    autoHandedOff: (t) => t.autoHandedOff,
    backupEligible: (t) => t.backupEligible,
    backupRegistered: (t) => t.backupDriverId !== null,
    /** Registered **and** ineligible — nominal coverage. The gap `renderCoverage` names. */
    coverageNominal: (t) => t.backupDriverId !== null && !t.backupEligible,
    uncovered: (t) => t.uncovered,
    unclaimed: (t) => t.claim === null || t.claim.state !== 'claimed',
    breached: (t) => t.slaBreachedAt !== null,

    /* numbers */
    minutesToPickup: (t) => t.minutesToPickup,
    nearbyEligibleCount: (t) => t.nearbyEligibleCount,
    nearestEligibleKm: (t) => t.nearestEligibleKm,
    hoursToDeparture: (t) => Math.round(hoursToDeparture(t) * 10) / 10,
    slaTargetMinutes: (t) => t.slaTargetMinutes,

    /* dates */
    departsAt: (t) => toInstant(t.departsAt),
    riderConfirmedAt: (t) => toInstant(t.riderConfirmedAt),
    acknowledgedAt: (t) => toInstant(t.acknowledgement?.at ?? null),
    offerExpiresAt: (t) => toInstant(t.backupOffer?.expiresAt ?? null),
    slaStartedAt: (t) => toInstant(t.slaStartedAt),
    slaDueAt: (t) => toInstant(t.slaDueAt),
    slaBreachedAt: (t) => toInstant(t.slaBreachedAt),
  },
  facetable: [
    'planKey',
    'planName',
    'captainDepartureState',
    'ackSource',
    'ackWeight',
    'offerState',
    'backupDriverId',
    'claimedBy',
  ],
  views: {
    /* Three of the four the route table declares (`fixtures/routeTable.ts:359`);
       `absences` is a different resource — see `listAbsences`. */
    'departing-24h': (t) => {
      const h = hoursToDeparture(t)
      return h >= 0 && h <= ASSURANCE_DEPARTING_WINDOW_HOURS
    },
    'no-backup-captain': lacksEligibleBackup,
    'awaiting-confirmation': (t) =>
      !t.autoHandedOff && (!t.riderConfirmed || t.acknowledgement === null),

    all: () => true,
    uncovered: (t) => t.uncovered,
    mine: (t) => t.claim?.state === 'claimed' && t.claim.ownerId === currentMockUserId(),
    unassigned: (t) => t.claim === null || t.claim.state !== 'claimed',
    breached: (t) => t.slaBreachedAt !== null,
  },
}

/**
 * GET /api/v1/assurance/trips
 *   params: q · subscriptionId · page · pageSize · sort · filter ·
 *           view=departing-24h|no-backup-captain|awaiting-confirmation|all|uncovered|mine|unassigned|breached
 *   -> Paginated<AssuranceTrip>
 *
 * Sortable: id · departsAt · slaDueAt · riderName · driverName · planKey ·
 *           minutesToPickup · nearbyEligibleCount · urgency
 *
 * **`slaTargetMinutes` is `null` on every row and that is deliberate.** The
 * deadline is a policy constant (21:00 the evening before,
 * `DB.commitPolicy.confirmDeadline` `:16545`); the *window length* is not
 * defined anywhere, so there is no denominator and no progress track. **Q8.**
 */
export async function listAssuranceTrips(
  params: AssuranceQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<AssuranceTrip>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<AssuranceTrip>>('/assurance/trips', { ...params }, { signal })
  }
  return mock(ASSURANCE_OPERATIONS.list, signal, () => {
    const filters = params.subscriptionId
      ? [
          ...(params.filters ?? []),
          { field: 'subscriptionId', op: 'eq' as const, value: params.subscriptionId },
        ]
      : params.filters
    return runQuery(assuranceTripFixtures, { ...params, filters }, assuranceShape)
  })
}

/**
 * GET /api/v1/assurance/trips/:id
 *   -> AssuranceTrip
 */
export async function getAssuranceTrip(id: string, signal?: AbortSignal): Promise<AssuranceTrip> {
  if (DATA_SOURCE === 'http') {
    return http.get<AssuranceTrip>(`/assurance/trips/${id}`, undefined, { signal })
  }
  return mock(ASSURANCE_OPERATIONS.get, signal, () => {
    const row = assuranceTripFixtures.find((t) => t.id === id)
    if (!row) throw notFound('assurance trip', id)
    return row
  })
}

/**
 * POST /api/v1/assurance/trips/:id/claim
 *   body: { takeOver?: boolean }
 *   -> AssuranceTrip
 *   404 when the trip does not exist
 *   409 when another operator holds it
 */
export async function claimAssuranceTrip(
  id: string,
  opts: { takeOver?: boolean } = {},
  signal?: AbortSignal,
): Promise<AssuranceTrip> {
  if (DATA_SOURCE === 'http') {
    return http.post<AssuranceTrip>(`/assurance/trips/${id}/claim`, opts, { signal })
  }
  return mockMutation(ASSURANCE_OPERATIONS.claim, signal, () => {
    const row = assuranceTripFixtures.find((t) => t.id === id)
    if (!row) throw notFound('assurance trip', id)
    return { ...row, claim: nextClaim('assurance', id, row.claim, opts.takeOver) }
  })
}

/**
 * POST /api/v1/assurance/trips/:id/release
 *   -> AssuranceTrip
 *   404 when the trip does not exist
 */
export async function releaseAssuranceTrip(
  id: string,
  signal?: AbortSignal,
): Promise<AssuranceTrip> {
  if (DATA_SOURCE === 'http') {
    return http.post<AssuranceTrip>(`/assurance/trips/${id}/release`, undefined, { signal })
  }
  return mockMutation(ASSURANCE_OPERATIONS.release, signal, () => {
    const row = assuranceTripFixtures.find((t) => t.id === id)
    if (!row) throw notFound('assurance trip', id)
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
 * POST /api/v1/assurance/trips/:id/acknowledge
 *   body: { source: 'app' | 'phone' | 'whatsapp' | 'assumed', note?: string }
 *   -> AssuranceTrip
 *   422 when `source === 'assumed'` and no note is given
 *
 * **The three weights are the whole point.** `app` is the captain acting;
 * `phone`/`whatsapp` are an operator attesting under their own name;
 * `assumed` is *"⚠ Not a confirmation. Use only when the leg must proceed and
 * somebody has decided to carry the risk"* (`:18135`). The 422 exists so the
 * risk has a name attached to it — legacy takes a note and never requires one.
 */
export async function acknowledgeLeg(
  id: string,
  source: LegAckSource,
  note?: string,
  signal?: AbortSignal,
): Promise<AssuranceTrip> {
  if (DATA_SOURCE === 'http') {
    return http.post<AssuranceTrip>(`/assurance/trips/${id}/acknowledge`, { source, note }, { signal })
  }
  return mockMutation(ASSURANCE_OPERATIONS.acknowledge, signal, () => {
    const row = assuranceTripFixtures.find((t) => t.id === id)
    if (!row) throw notFound('assurance trip', id)
    if (source === 'assumed' && !note?.trim()) {
      throw new ApiError({
        status: 422,
        kind: 'validation',
        code: 'note_required',
        message: 'Recording a leg as assumed needs a note saying who is carrying the risk',
        details: [{ field: 'note', code: 'required', message: 'Say why this leg is proceeding unconfirmed' }],
        retryable: false,
      })
    }
    const me = teamUserFixtures.find((u) => u.id === currentMockUserId())!
    return {
      ...row,
      acknowledgement: {
        source,
        weight: LEG_ACK_WEIGHT[source],
        at: EYVAR_NOW,
        byUserId: source === 'app' ? null : me.id,
        byUserName: source === 'app' ? 'captain' : me.name,
        note: note ?? null,
      },
    }
  })
}

/**
 * POST /api/v1/assurance/trips/:id/backup-offer
 *   body: { driverId: string }
 *   -> AssuranceTrip
 *   409 when an offer is already outstanding
 *
 * **Handing over is not accepting** (`:18159`). The leg is not covered until the
 * backup answers, and the offer expires unanswered after
 * `BACKUP_OFFER_WINDOW_MINUTES` (20, `:18126`) — at which point the leg is
 * uncovered again and nobody has been told. `UST-7` is that row.
 */
export async function offerBackup(
  id: string,
  driverId: string,
  signal?: AbortSignal,
): Promise<AssuranceTrip> {
  if (DATA_SOURCE === 'http') {
    return http.post<AssuranceTrip>(`/assurance/trips/${id}/backup-offer`, { driverId }, { signal })
  }
  return mockMutation(ASSURANCE_OPERATIONS.offerBackup, signal, () => {
    const row = assuranceTripFixtures.find((t) => t.id === id)
    if (!row) throw notFound('assurance trip', id)
    if (row.backupOffer?.state === 'offered') {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'offer_outstanding',
        message: `${row.backupOffer.driverName} has not answered the current offer yet`,
        retryable: false,
      })
    }
    const expiresAt = new Date(
      Date.parse(EYVAR_NOW) + BACKUP_OFFER_WINDOW_MINUTES * 60_000,
    ).toISOString()
    return {
      ...row,
      backupOffer: {
        driverId,
        driverName: driverId,
        state: 'offered' as const,
        offeredAt: EYVAR_NOW,
        expiresAt,
        respondedAt: null,
      },
    }
  })
}

/**
 * GET /api/v1/assurance/trips/facets
 *   params: view
 *   -> Facets
 */
export async function getAssuranceFacets(
  view?: string | null,
  signal?: AbortSignal,
): Promise<Facets> {
  if (DATA_SOURCE === 'http') {
    return http.get<Facets>('/assurance/trips/facets', { view: view ?? undefined }, { signal })
  }
  return mock(ASSURANCE_OPERATIONS.facets, signal, () =>
    computeFacets(assuranceTripFixtures, assuranceShape, view),
  )
}

/* ─────────────────────────── absences ──────────────────────────────────── */

type AbsenceScenario = 'empty' | 'history'
let absenceScenario: AbsenceScenario = 'empty'
const absenceRows = () =>
  absenceScenario === 'history' ? absenceEventHistoryFixtures : absenceEventFixtures

const absenceShape: QueryShape<AbsenceEvent> = {
  searchable: [(e) => e.id, (e) => e.driverName, (e) => e.driverId, (e) => e.subscriptionId],
  sortable: {
    id: (e) => e.id,
    occurredAt: (e) => e.occurredAt,
    driverName: (e) => e.driverName,
    tier: (e) => e.tier,
    forfeitedHalalas: (e) => e.forfeitedHalalas,
  },
  filterable: {
    /* identity — text */
    id: (e) => e.id,
    driverId: (e) => e.driverId,
    driverName: (e) => e.driverName,
    subscriptionId: (e) => e.subscriptionId,
    waivedReason: (e) => e.waivedReason,
    appealCaseId: (e) => e.appealCaseId,
    emergencyClaimId: (e) => e.emergencyClaimId,

    /* closed sets */
    tier: (e) => e.tier,

    /* booleans — `waived` and `decayed` both stop a strike counting, for
       completely different reasons. Collapsing them into "inactive" loses the
       distinction between a captain who was excused and one who recovered. */
    waived: (e) => e.waived,
    decayed: (e) => e.decayed,
    terminated: (e) => e.terminated,
    counting: (e) => !e.waived && !e.decayed,
    appealed: (e) => e.appealCaseId !== null,

    /* numbers — money is halalas (§8.3 formats; this layer never formats) */
    forfeitedHalalas: (e) => e.forfeitedHalalas,
    reserveForfeitedHalalas: (e) => e.reserveForfeitedHalalas,
    freezeDays: (e) => e.freezeDays,
    liveStrikesAtEvent: (e) => e.liveStrikesAtEvent,

    /* dates */
    occurredAt: (e) => toInstant(e.occurredAt),
  },
  facetable: ['tier', 'driverId', 'subscriptionId'],
  views: {
    absences: () => true,
    all: () => true,
    counting: (e) => !e.waived && !e.decayed,
    waived: (e) => e.waived,
    decayed: (e) => e.decayed,
  },
}

/**
 * GET /api/v1/assurance/absences
 *   params: q · driverId · page · pageSize · sort · filter ·
 *           view=absences|all|counting|waived|decayed
 *   -> Paginated<AbsenceEvent>
 *
 * Sortable: id · occurredAt · driverName · tier · forfeitedHalalas
 *
 * **Empty by default**, and legitimately so — see `fixtures/assurance.ts`. The
 * empty state here is "nothing has gone wrong", not "your filter matched
 * nothing", and those are different screens (`docs/ref/states.md`).
 *
 * `AbsenceEvent` has **no claim and no SLA**: it is a recorded fact, not a task.
 * The task it generates is the appeal (`FairnessCase`), which has both. This is
 * the one wave-2 resource that is not a `WorkQueueRow`, and saying so is more
 * useful than bolting a null claim onto it.
 */
export async function listAbsences(
  params: AbsenceQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<AbsenceEvent>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<AbsenceEvent>>('/assurance/absences', { ...params }, { signal })
  }
  return mock(ASSURANCE_OPERATIONS.absences, signal, () => {
    const filters = params.driverId
      ? [...(params.filters ?? []), { field: 'driverId', op: 'eq' as const, value: params.driverId }]
      : params.filters
    return runQuery(absenceRows(), { ...params, filters }, absenceShape)
  })
}

/**
 * POST /api/v1/assurance/absences/:id/waive
 *   body: { reason: string }
 *   -> AbsenceEvent
 *   422 when `reason` is empty
 *
 * A waiver **adds** to the ledger; it never deletes. *"Deterrence without a
 * route back produces withdrawal, not compliance"* (`:16628`) — and a waived
 * strike whose row is gone is a waiver nobody can audit.
 */
export async function waiveAbsence(
  id: string,
  reason: string,
  signal?: AbortSignal,
): Promise<AbsenceEvent> {
  if (DATA_SOURCE === 'http') {
    return http.post<AbsenceEvent>(`/assurance/absences/${id}/waive`, { reason }, { signal })
  }
  return mockMutation(ASSURANCE_OPERATIONS.waiveAbsence, signal, () => {
    const row = absenceRows().find((e) => e.id === id)
    if (!row) throw notFound('absence', id)
    if (!reason.trim()) {
      throw new ApiError({
        status: 422,
        kind: 'validation',
        code: 'reason_required',
        message: 'A waiver needs a reason on the record',
        details: [{ field: 'reason', code: 'required', message: 'Enter a reason' }],
        retryable: false,
      })
    }
    return { ...row, waived: true, waivedReason: reason }
  })
}

/* ─────────────────────────── QA affordances ────────────────────────────── */

/** Serve the populated strike ledger — all three tiers, plus a waived and a decayed strike. */
export function useAbsenceHistory(): void {
  absenceScenario = 'history'
}

export function resetAssurance(): void {
  absenceScenario = 'empty'
}
