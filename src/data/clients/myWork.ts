/**
 * My Work — Operations › My Work, three views (`mine`, `unassigned`,
 * `everything`).
 *
 * **Derived, never seeded.** Legacy builds its inbox by walking twelve
 * collections at render time and normalising each through `wi()` (`:19119`);
 * this client walks the wave-2 fixtures and does the same. There is no
 * `fixtures/work.ts` and there must not be — a second copy of these rows is how
 * My Work ends up showing a breach the queue it links to says is resolved.
 *
 * `clients/workQueues.test.ts` asserts the derivation both ways: every open,
 * breached row in a source queue appears here, and every row here resolves back
 * to a real record in its own client.
 *
 * Seven of the nine queues project here. `absence` records a fact rather than
 * a task (Q-60) and `erasure` has no client yet.
 *
 * No row carries a sentence: every title is a key plus its values (X2, T4.1).
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { EYVAR_NOW, toInstant } from '../mock/clock'
import { mock } from '../mock/delay'
import { computeFacets, runQuery, type QueryShape } from '../mock/query'
import type { Claim, Facets, Paginated, QueryParams } from '../types/common'
import type { DisputeKind } from '../types/dispute'
import type { FairnessCaseKind } from '../types/fairness'
import type { SafetyIncidentType } from '../types/safety'
import type { TicketPriority } from '../types/ticket'
import type { VehicleClass } from '../types/driver'
import type { WorkItem } from '../types/work'
import { WORK_QUEUE_ROUTE, WORK_ROUTING } from '../types/work'
import type { WorkItemSeverity, WorkQueueId } from '../types/workQueue'
import type { RoleName } from '../types/session'
import { currentDisputes } from './disputes'
import { http } from './http'
import { currentMockUserId } from './session'
import { currentTickets } from './tickets'
import { onFixturesLoaded, type Fixtures } from '../mock/fixtures'

/* Late-bound fixture rows. `mock/fixtures.ts` says why this is not a static
   import: a static one pins seeded data into every build, including the http
   build that can never read it. Bound before any mock read, because `mock()`
   and `mockMutation()` await `loadFixtures()`. */
let allRequestFixtures!: Fixtures['allRequestFixtures']
let assuranceTripFixtures!: Fixtures['assuranceTripFixtures']
let applicantFixtures!: Fixtures['applicantFixtures']
let fairnessCaseFixtures!: Fixtures['fairnessCaseFixtures']
let safetyIncidentFixtures!: Fixtures['safetyIncidentFixtures']
let teamUserFixtures!: Fixtures['teamUserFixtures']
onFixturesLoaded((f) => {
  allRequestFixtures = f.allRequestFixtures
  assuranceTripFixtures = f.assuranceTripFixtures
  applicantFixtures = f.applicantFixtures
  fairnessCaseFixtures = f.fairnessCaseFixtures
  safetyIncidentFixtures = f.safetyIncidentFixtures
  teamUserFixtures = f.teamUserFixtures
})

export const WORK_OPERATIONS = {
  list: 'work.list',
  facets: 'work.facets',
} as const

/* Registered at module load, not on first call. `config.ts` says *"each client
   registers its ids here at module load"*, and `mock()` only registers when it
   runs — so an operation nobody has invoked yet is missing from a QA panel's
   list and from any validation of `?mockFail=`. Every id in this module is
   listed the moment the module is imported. */
registerOperations(...Object.values(WORK_OPERATIONS))

export interface WorkQuery extends QueryParams {
  queue?: WorkQueueId
  /**
   * Show queues this role is not accountable for. Default `false` — *"an
   * operator sees their own work first and can switch to everything in one
   * click"* (`:19080`). Never a permission; §11.2 owns those.
   */
  includeOtherRoles?: boolean
}

const route = (queue: WorkQueueId, id: string) => WORK_QUEUE_ROUTE[queue].replace(':id', id)

/* ─────────────── enum members, as the keys their own screens own ──────────
   X2 — the projection used to print `suspension-appeal` and `Economy` into a
   cell. Each map points at the key the owning screen already ships, so My Work
   and the queue it links to name a value the same way in both languages. */

const FAIRNESS_KIND_KEY: Readonly<Record<FairnessCaseKind, string>> = {
  'suspension-appeal': 'fairness.kind.suspensionAppeal',
  'rating-dispute': 'fairness.kind.ratingDispute',
  'rider-report': 'fairness.kind.riderReport',
}

const SAFETY_TYPE_KEY: Readonly<Record<SafetyIncidentType, string>> = {
  sos: 'safety.type.sos',
  accident: 'safety.type.accident',
  harassment: 'safety.type.harassment',
  'unsafe-driving': 'safety.type.unsafeDriving',
  theft: 'safety.type.theft',
  other: 'safety.type.other',
}

const VEHICLE_CLASS_KEY: Readonly<Record<VehicleClass, string>> = {
  Economy: 'people.class.economy',
  Comfort: 'people.class.comfort',
}

const DISPUTE_KIND_KEY: Readonly<Record<DisputeKind, string>> = {
  'no-show': 'dispute.kind.no-show',
  'vehicle-class': 'dispute.kind.vehicle-class',
  'fare-dispute': 'dispute.kind.fare-dispute',
  'toll-charge': 'dispute.kind.toll-charge',
  'cancellation-fee': 'dispute.kind.cancellation-fee',
  'vehicle-damage': 'dispute.kind.vehicle-damage',
}

/** A ticket's priority word, as this projection's three-step severity. */
const TICKET_SEVERITY: Readonly<Record<TicketPriority, WorkItemSeverity>> = {
  Critical: 'critical',
  High: 'high',
  Medium: 'normal',
  Low: 'normal',
}

/**
 * Zero outstanding documents is a different fact from three, so it gets its own
 * key rather than an English plural the data layer would have to inflect.
 */
function applicationSubtitle(
  vehicleClass: VehicleClass,
  outstanding: number,
): Pick<WorkItem, 'subtitleKey' | 'subtitleParams'> {
  return {
    subtitleKey:
      outstanding === 0 ? 'myWork.item.application.sub.clear' : 'myWork.item.application.sub',
    subtitleParams: { vehicleClass: { key: VEHICLE_CLASS_KEY[vehicleClass] }, documents: outstanding },
  }
}

/** An uncovered leg, a named captain who has not confirmed, or no captain at all. */
function assuranceTitle(
  uncovered: boolean,
  subscriptionId: string,
  driverName: string | null,
): Pick<WorkItem, 'titleKey' | 'titleParams'> {
  if (uncovered) {
    return {
      titleKey: 'myWork.item.assurance.uncovered',
      titleParams: { subscription: subscriptionId },
    }
  }
  if (driverName === null) {
    return { titleKey: 'myWork.item.assurance.unconfirmed.noCaptain', titleParams: {} }
  }
  return { titleKey: 'myWork.item.assurance.unconfirmed', titleParams: { captain: driverName } }
}

/**
 * A `Claim` for a queue that records ownership as two columns rather than as a
 * claim record. Tickets and Disputes both do; everything the inbox needs
 * — who holds it, and is it live — is present either way.
 */
function ownerClaim(
  entityType: string,
  entityId: string,
  ownerId: string | null,
  ownerName: string | null,
  since: string,
): Claim | null {
  if (ownerId === null) return null
  return {
    key: `${entityType}:${entityId}`,
    entityType,
    entityId,
    ownerId,
    ownerName: ownerName ?? ownerId,
    claimedAt: since,
    touchedAt: EYVAR_NOW,
    state: 'claimed',
    releasedAt: null,
    releaseReason: null,
    takeovers: [],
  }
}

/**
 * The union, built once per call.
 *
 * Only **open** rows are inbox items: a disposed row is not somebody's work,
 * however recently it closed. That mirrors every `if(x.status!=='open')return;`
 * guard in `inboxItems()` (`:19122`, `:19134`, `:19140`).
 */
function buildWorkItems(role: RoleName): WorkItem[] {
  const items: WorkItem[] = []

  /* ── applications (wave 1) ───────────────────────────────────────────── */
  for (const a of applicantFixtures) {
    if (a.status !== 'pending' && a.status !== 'in-review') continue
    items.push({
      key: `application:${a.id}`,
      queue: 'application',
      id: a.id,
      titleKey: 'myWork.item.application',
      titleParams: { name: a.name },
      ...applicationSubtitle(a.vehicleClass, a.docs.filter((d) => d.status !== 'verified').length),
      dueAt: a.slaDueAt,
      breached: a.slaBreachedAt !== null,
      severity: 'normal',
      entityId: a.id,
      entityType: 'application',
      route: route('application', a.id),
      routedToMyRole: WORK_ROUTING.application.includes(role),
      claim: a.claim,
      slaStartedAt: a.slaStartedAt,
      slaDueAt: a.slaDueAt,
      slaTargetMinutes: a.slaTargetMinutes,
      slaBreachedAt: a.slaBreachedAt,
      slaSource: a.slaSource,
      firstResponseDueAt: a.firstResponseDueAt,
      firstResponseAt: a.firstResponseAt,
      firstResponseBreachedAt: a.firstResponseBreachedAt,
    })
  }

  /* ── requests ────────────────────────────────────────────────────────── */
  for (const r of allRequestFixtures) {
    if (r.status !== 'searching' && r.status !== 'offered' && r.status !== 'no-drivers') continue
    items.push({
      key: `request:${r.id}`,
      queue: 'request',
      id: r.id,
      titleKey:
        r.channel === 'instant' ? 'myWork.item.request.instant' : 'myWork.item.request.subscription',
      titleParams:
        r.channel === 'instant'
          ? { pickup: r.pickup, destination: r.destination }
          : { rider: r.riderName },
      subtitleKey:
        r.status === 'no-drivers' ? 'myWork.item.request.sub.noCaptain' : 'myWork.item.request.sub',
      subtitleParams: {
        rider: r.riderName,
        vehicleClass: { key: VEHICLE_CLASS_KEY[r.vehicleClass] },
      },
      dueAt: r.slaDueAt,
      breached: r.slaBreachedAt !== null,
      /* `no-drivers` is the status the tick engine writes *at* the breach
         (`:9832`), so it is the one request state that is not routine. */
      severity: r.status === 'no-drivers' ? 'high' : 'normal',
      entityId: r.riderId,
      entityType: 'rider',
      route: route('request', r.id),
      routedToMyRole: WORK_ROUTING.request.includes(role),
      claim: r.claim,
      slaStartedAt: r.slaStartedAt,
      slaDueAt: r.slaDueAt,
      slaTargetMinutes: r.slaTargetMinutes,
      slaBreachedAt: r.slaBreachedAt,
      slaSource: r.slaSource,
      firstResponseDueAt: r.firstResponseDueAt,
      firstResponseAt: r.firstResponseAt,
      firstResponseBreachedAt: r.firstResponseBreachedAt,
    })
  }

  /* ── trip assurance ──────────────────────────────────────────────────── */
  for (const t of assuranceTripFixtures) {
    /**
     * Legs that need a human: nobody has *actually* confirmed, or there is
     * nobody to fall back on. A confirmed, covered leg is not work.
     *
     * **A `weak` acknowledgement is not a confirmation.** `ACK_SOURCE.assumed`
     * is explicit: *"Not a confirmation. Use only when the leg must proceed and
     * somebody has decided to carry the risk"* (`:18135`). Treating it as one
     * dropped `UST-4` out of the inbox — a captain who has not started with
     * twelve minutes to pickup — and the disagreement was caught by
     * `metrics.test.ts` comparing this count against the overview tile's.
     * That is what a cross-check between two derivations is for.
     */
    const confirmed = t.acknowledgement !== null && t.acknowledgement.weight !== 'weak'
    const needsWork = t.uncovered || !confirmed || !t.backupEligible
    if (!needsWork || t.autoHandedOff) continue
    items.push({
      key: `assurance:${t.id}`,
      queue: 'assurance',
      id: t.id,
      ...assuranceTitle(t.uncovered, t.subscriptionId, t.driverName),
      /* **`departs {ISO}` is gone.** It printed the raw instant into the cell;
         a time is the UI's to format (§8.3) and this row already carries a
         deadline column. The Assurance queue owns the departure clock. */
      subtitleKey: 'myWork.item.assurance.sub',
      subtitleParams: { rider: t.riderName, plan: t.planName },
      dueAt: t.slaDueAt,
      breached: t.slaBreachedAt !== null,
      /* Legacy pushes an uncovered leg at `critical` (`:19161`) — the rider is
         standing at the kerb and nobody is coming. */
      severity: t.uncovered ? 'critical' : 'high',
      entityId: t.subscriptionId,
      entityType: 'subscription',
      route: route('assurance', t.id),
      routedToMyRole: WORK_ROUTING.assurance.includes(role),
      claim: t.claim,
      slaStartedAt: t.slaStartedAt,
      slaDueAt: t.slaDueAt,
      slaTargetMinutes: t.slaTargetMinutes,
      slaBreachedAt: t.slaBreachedAt,
      slaSource: t.slaSource,
      firstResponseDueAt: t.firstResponseDueAt,
      firstResponseAt: t.firstResponseAt,
      firstResponseBreachedAt: t.firstResponseBreachedAt,
    })
  }

  /* ── safety ──────────────────────────────────────────────────────────── */
  for (const i of safetyIncidentFixtures) {
    if (i.status !== 'open') continue
    items.push({
      key: `incident:${i.id}`,
      queue: 'incident',
      id: i.id,
      titleKey: 'myWork.item.incident',
      titleParams: { type: { key: SAFETY_TYPE_KEY[i.type] }, summary: i.summary },
      /* `INC-017`. Legacy prints `Reporter undefined` here (`:13432`). */
      subtitleKey: i.reporterName
        ? 'myWork.item.incident.sub'
        : 'myWork.item.incident.sub.noReporter',
      subtitleParams: i.reporterName ? { name: i.reporterName } : {},
      /* The **response** clock leads on this queue: an SOS breaches its promise
         to answer long before its promise to resolve. */
      dueAt: i.firstResponseDueAt ?? i.slaDueAt,
      breached: i.firstResponseBreachedAt !== null || i.slaBreachedAt !== null,
      severity: i.workSeverity,
      entityId: i.tripId,
      entityType: i.tripId ? 'trip' : null,
      route: route('incident', i.id),
      routedToMyRole: WORK_ROUTING.incident.includes(role),
      claim: i.claim,
      slaStartedAt: i.slaStartedAt,
      slaDueAt: i.slaDueAt,
      slaTargetMinutes: i.slaTargetMinutes,
      slaBreachedAt: i.slaBreachedAt,
      slaSource: i.slaSource,
      firstResponseDueAt: i.firstResponseDueAt,
      firstResponseAt: i.firstResponseAt,
      firstResponseBreachedAt: i.firstResponseBreachedAt,
    })
  }

  /* ── fairness ────────────────────────────────────────────────────────── */
  for (const c of fairnessCaseFixtures) {
    if (c.status !== 'open') continue
    items.push({
      key: `fairness:${c.id}`,
      queue: 'fairness',
      id: c.id,
      titleKey: 'myWork.item.fairness',
      titleParams: { kind: { key: FAIRNESS_KIND_KEY[c.kind] }, captain: c.driverName },
      /* The case's own words, which are data and not copy. */
      subtitleKey: 'myWork.item.text',
      subtitleParams: { text: c.detail },
      dueAt: c.slaDueAt,
      breached: c.slaBreachedAt !== null || c.firstResponseBreachedAt !== null,
      severity: 'normal',
      entityId: c.driverId,
      entityType: 'driver',
      route: route('fairness', c.id),
      routedToMyRole: WORK_ROUTING.fairness.includes(role),
      claim: c.claim,
      slaStartedAt: c.slaStartedAt,
      slaDueAt: c.slaDueAt,
      slaTargetMinutes: c.slaTargetMinutes,
      slaBreachedAt: c.slaBreachedAt,
      slaSource: c.slaSource,
      firstResponseDueAt: c.firstResponseDueAt,
      firstResponseAt: c.firstResponseAt,
      firstResponseBreachedAt: c.firstResponseBreachedAt,
    })
  }

  /* ── tickets (T1.6) ──────────────────────────────────────────────────
     `claimTicket` exists, so the "source queue unavailable" refusal this
     projection used to inherit is stale. Anything not disposed of is work:
     a ticket goes `in-progress` the moment it is claimed, and dropping it
     here would make an operator's own claim erase the row from their inbox. */
  for (const k of currentTickets()) {
    if (k.status === 'resolved' || k.status === 'closed') continue
    items.push({
      key: `ticket:${k.id}`,
      queue: 'ticket',
      id: k.id,
      /* The subject is the customer's own words: data, not copy. */
      titleKey: 'myWork.item.text',
      titleParams: { text: k.subject },
      subtitleKey: 'myWork.item.ticket.sub',
      subtitleParams: { entity: k.entityName, category: k.category },
      dueAt: k.slaDueAt,
      breached: k.slaBreached,
      severity: TICKET_SEVERITY[k.priority],
      entityId: k.entityId,
      entityType: k.entityType,
      route: route('ticket', k.id),
      routedToMyRole: WORK_ROUTING.ticket.includes(role),
      claim: ownerClaim('ticket', k.id, k.ownerId, k.ownerName, k.createdAt),
      slaStartedAt: k.createdAt,
      slaDueAt: k.slaDueAt,
      /* The window is the tier's, resolved server-side; the row carries the
         due stamp and not the promise it came from. */
      slaTargetMinutes: null,
      slaBreachedAt: k.slaBreached ? k.slaDueAt : null,
      slaSource: 'legacy-reason-code',
      firstResponseDueAt: null,
      firstResponseAt: null,
      firstResponseBreachedAt: null,
    })
  }

  /* ── disputes (T1.6) ─────────────────────────────────────────────────
     `claimDispute` exists for the same reason. A dispute records no breach
     stamp, so the clock is the comparison the queue itself makes. */
  for (const d of currentDisputes()) {
    if (d.status === 'resolved') continue
    const breached = d.dueAt !== null && Date.parse(d.dueAt) < Date.parse(EYVAR_NOW)
    items.push({
      key: `dispute:${d.id}`,
      queue: 'dispute',
      id: d.id,
      titleKey: 'myWork.item.dispute',
      titleParams: { kind: { key: DISPUTE_KIND_KEY[d.kind] }, claimant: d.claimantName },
      subtitleKey: d.againstName === null ? 'myWork.item.dispute.sub.platform' : 'myWork.item.dispute.sub',
      subtitleParams: d.againstName === null ? {} : { name: d.againstName },
      dueAt: d.dueAt,
      breached,
      severity: 'normal',
      entityId: d.claimantId,
      entityType: d.claimantType,
      route: route('dispute', d.id),
      routedToMyRole: WORK_ROUTING.dispute.includes(role),
      claim: ownerClaim('dispute', d.id, d.ownerId, d.ownerName, d.filedAt),
      slaStartedAt: d.filedAt,
      slaDueAt: d.dueAt,
      slaTargetMinutes: null,
      slaBreachedAt: breached ? d.dueAt : null,
      slaSource: 'legacy-policy',
      firstResponseDueAt: null,
      firstResponseAt: null,
      firstResponseBreachedAt: null,
    })
  }

  return items
}

/**
 * What free-text search reads: the **facts** in a row's params, never its keys.
 * An operator types a captain's name or a place, not `myWork.item.fairness`.
 */
function searchText(item: WorkItem): string {
  const values = [...Object.values(item.titleParams), ...Object.values(item.subtitleParams)]
  return values.filter((v) => typeof v !== 'object').join(' ')
}

const workShape: QueryShape<WorkItem> = {
  searchable: [(w) => w.id, (w) => searchText(w), (w) => w.entityId],
  sortable: {
    key: (w) => w.key,
    queue: (w) => w.queue,
    /* The template first, then its values: rows from one queue group together
       and order by the name inside them. A sort on the rendered sentence is
       impossible here, because the sentence is made in the browser (X2). */
    title: (w) => `${w.titleKey} ${searchText(w)}`,
    severity: (w) => ({ critical: 0, high: 1, normal: 2 })[w.severity],
    dueAt: (w) => w.dueAt,
    /**
     * **The inbox's one true order** (`:19212`). Breached first, then by
     * deadline, undated last: *"it has no clock, so it cannot be more urgent
     * than something that has one"*.
     *
     * Sorting on `dueAt` alone gets the undated rows wrong — nulls sort last in
     * `compare()`, which is right, but a breached row with a deadline five days
     * ago and an unbreached row due in a minute compare on raw milliseconds and
     * happen to come out right. This key makes it deliberate.
     */
    urgency: (w) =>
      w.breached ? -1 : w.dueAt ? Date.parse(w.dueAt) : Number.MAX_SAFE_INTEGER,
  },
  filterable: {
    /* identity — text */
    key: (w) => w.key,
    id: (w) => w.id,
    titleKey: (w) => w.titleKey,
    subtitleKey: (w) => w.subtitleKey,
    entityId: (w) => w.entityId,
    route: (w) => w.route,

    /* closed sets — options via `getWorkFacets` */
    queue: (w) => w.queue,
    severity: (w) => w.severity,
    entityType: (w) => w.entityType,
    slaSource: (w) => w.slaSource,
    claimedBy: (w) => w.claim?.ownerId ?? null,

    /* booleans */
    breached: (w) => w.breached,
    unclaimed: (w) => w.claim === null || w.claim.state !== 'claimed',
    heldByMe: (w) => w.claim?.state === 'claimed' && w.claim.ownerId === currentMockUserId(),
    routedToMyRole: (w) => w.routedToMyRole,
    /** An item with no clock. Sorts last and is not a breach — §8.4's neutral band. */
    hasDeadline: (w) => w.dueAt !== null,

    /* numbers */
    slaTargetMinutes: (w) => w.slaTargetMinutes,

    /* dates */
    dueAt: (w) => toInstant(w.dueAt),
    slaStartedAt: (w) => toInstant(w.slaStartedAt),
    slaDueAt: (w) => toInstant(w.slaDueAt),
    slaBreachedAt: (w) => toInstant(w.slaBreachedAt),
    firstResponseDueAt: (w) => toInstant(w.firstResponseDueAt),
    firstResponseAt: (w) => toInstant(w.firstResponseAt),
    firstResponseBreachedAt: (w) => toInstant(w.firstResponseBreachedAt),
  },
  facetable: ['queue', 'severity', 'entityType', 'slaSource', 'claimedBy'],
  views: {
    /* The three the route table declares (`fixtures/routeTable.ts:236`). */
    mine: (w) => w.claim?.state === 'claimed' && w.claim.ownerId === currentMockUserId(),
    unassigned: (w) => w.claim === null || w.claim.state !== 'claimed',
    everything: () => true,

    breached: (w) => w.breached,
  },
}

/** The role the mock scopes to. Reads the same signed-in session the claim logic does. */
function currentRole(): RoleName {
  return teamUserFixtures.find((u) => u.id === currentMockUserId())?.role ?? 'Support'
}

/**
 * GET /api/v1/work-items
 *   params: q · queue · includeOtherRoles · page · pageSize · sort · filter ·
 *           view=mine|unassigned|everything|breached
 *   -> Paginated<WorkItem>
 *
 * Sortable: key · queue · title · severity · dueAt · urgency
 * Default sort is `urgency` ascending — breached, then by deadline, undated
 * last. **Not by severity** (`:19074`).
 *
 * The server composes this across every queue the caller can see; the mock
 * composes it across the wave-2 fixtures. Either way the rows are the *same
 * rows* the domain clients serve — never a parallel copy.
 */
export async function listWorkItems(
  params: WorkQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<WorkItem>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<WorkItem>>('/work-items', { ...params }, { signal })
  }
  return mock(WORK_OPERATIONS.list, signal, () => {
    const all = buildWorkItems(currentRole())
    const scoped = params.includeOtherRoles ? all : all.filter((w) => w.routedToMyRole)
    const filters = params.queue
      ? [...(params.filters ?? []), { field: 'queue', op: 'eq' as const, value: params.queue }]
      : params.filters
    return runQuery(
      scoped,
      { sort: { field: 'urgency', dir: 'asc' }, ...params, filters },
      workShape,
    )
  })
}

/**
 * GET /api/v1/work-items/facets
 *   params: view
 *   -> Facets
 *
 * The `queue` facet is what makes the inbox navigable at 200 items — it is the
 * only place in the product where an operator can see the *shape* of their
 * backlog rather than its length.
 */
export async function getWorkFacets(view?: string | null, signal?: AbortSignal): Promise<Facets> {
  if (DATA_SOURCE === 'http') {
    return http.get<Facets>('/work-items/facets', { view: view ?? undefined }, { signal })
  }
  return mock(WORK_OPERATIONS.facets, signal, () =>
    computeFacets(
      buildWorkItems(currentRole()).filter((w) => w.routedToMyRole),
      workShape,
      view,
    ),
  )
}

/**
 * The nav badge's number: items routed to this role that are **not held by
 * somebody else** — what is actually mine to pick up.
 *
 * Legacy counts `breached || unclaimed` and tones `attention` whenever anything
 * is breached (`updateInboxBadge`, `:19312`). Under the wave-2 fixtures that
 * would light this chip permanently, which is the failure mode `attention` was
 * re-scoped to avoid — see `fixtures/navCounts.ts`. The count is the backlog;
 * the tone is the escalation, and they are separate decisions.
 *
 * `fixtures/navCounts.test.ts` asserts the fixture's `operations-my-work` count
 * equals this, so the badge and the screen cannot drift apart.
 */
export function myWorkBacklogSize(): number {
  return buildWorkItems(currentRole()).filter(
    (w) =>
      w.routedToMyRole &&
      (w.claim === null || w.claim.state !== 'claimed' || w.claim.ownerId === currentMockUserId()),
  ).length
}

/** One queue's standing at this instant. Three predicates, no ordering. */
export interface WorkQueueBacklog {
  queue: WorkQueueId
  /** Open items, whatever their claim state. */
  open: number
  /** Past an SLA clock — the same `breached` flag `view=breached` filters on. */
  breached: number
  /** In no operator's name — the same predicate `view=unassigned` uses. */
  unassigned: number
}

/**
 * The backlog, per queue, **synchronously**.
 *
 * Exists for one caller: Operations › Overview's `Backlog by queue` breakdown
 * and the two tiles above it (`05-metrics-content.md` §10.3). Counting there by
 * re-implementing five predicates is how a board and a queue start disagreeing
 * — spec **AC-695** requires the breakdown's columns to sum to the tiles, and
 * building both from `buildWorkItems` makes that true by construction rather
 * than by a test that notices later.
 *
 * **Across every role**, matching `listWorkItems({ includeOtherRoles: true })`.
 * A board states what the shift owes, not what one operator's inbox holds.
 */
export function workBacklogByQueue(): WorkQueueBacklog[] {
  const all = buildWorkItems(currentRole())
  return WORK_SOURCES.map((queue) => {
    const rows = all.filter((w) => w.queue === queue)
    return {
      queue,
      open: rows.length,
      breached: rows.filter((w) => w.breached).length,
      unassigned: rows.filter((w) => w.claim === null || w.claim.state !== 'claimed').length,
    }
  })
}

/** Exported for the cross-queue test; not part of the screen's surface. */
export const WORK_SOURCES: readonly WorkQueueId[] = [
  'application',
  'request',
  'assurance',
  'incident',
  'fairness',
  'ticket',
  'dispute',
]

/** The fixed clock this client measures against, re-exported so a test need not import `mock/`. */
export { EYVAR_NOW }
