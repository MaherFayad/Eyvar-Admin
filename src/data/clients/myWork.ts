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
 * ## Two queues are missing and it is not an oversight
 *
 * Legacy's inbox covers twelve collections. Four of them — tickets, disputes,
 * lost & found, PDPL erasure — are **wave 3**, and three more (emergency
 * claims, emergency dispatches, departure risk) belong to Live Dispatch, which
 * is a monitor surface and not a queue. As each lands, one entry is added to
 * `SOURCES` below and nothing else changes. The `WorkQueueId` union already
 * names them, so a missing source is a compile error the day someone tries.
 */

import { DATA_SOURCE } from '../config'
import { EYVAR_NOW, toInstant } from '../mock/clock'
import { mock } from '../mock/delay'
import { computeFacets, runQuery, type QueryShape } from '../mock/query'
import { allRequestFixtures } from '../fixtures/requests'
import { assuranceTripFixtures } from '../fixtures/assurance'
import { applicantFixtures } from '../fixtures/applicants'
import { fairnessCaseFixtures } from '../fixtures/fairness'
import { safetyIncidentFixtures } from '../fixtures/safety'
import { CURRENT_USER_ID, teamUserFixtures } from '../fixtures/teamUsers'
import type { Facets, Paginated, QueryParams } from '../types/common'
import type { WorkItem } from '../types/work'
import { WORK_QUEUE_ROUTE, WORK_ROUTING } from '../types/work'
import type { WorkQueueId } from '../types/workQueue'
import type { RoleName } from '../types/session'
import { http } from './http'

export const WORK_OPERATIONS = {
  list: 'work.list',
  facets: 'work.facets',
} as const

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
      title: `Captain application — ${a.name}`,
      subtitle: `${a.vehicleClass} · ${a.docs.filter((d) => d.status !== 'verified').length} documents outstanding`,
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
      title:
        r.channel === 'instant'
          ? `Ride request — ${r.pickup} → ${r.destination}`
          : `Subscription request — ${r.riderName}`,
      subtitle: `${r.riderName} · ${r.vehicleClass}${r.status === 'no-drivers' ? ' · no captain found' : ''}`,
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
      title: t.uncovered
        ? `Leg uncovered — ${t.subscriptionId}`
        : `Unconfirmed leg — ${t.driverName ?? 'no captain'}`,
      subtitle: `${t.riderName} · ${t.planName} · departs ${t.departsAt}`,
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
      title: `${i.type} — ${i.summary}`,
      subtitle: i.reporterName
        ? `Reporter ${i.reporterName}`
        : /* `INC-017`. Legacy prints `Reporter undefined` here (`:13432`). */
          'Raised automatically — no reporter',
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
      title: `${c.kind} — ${c.driverName}`,
      subtitle: c.detail,
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

  return items
}

const workShape: QueryShape<WorkItem> = {
  searchable: [(w) => w.id, (w) => w.title, (w) => w.subtitle, (w) => w.entityId],
  sortable: {
    key: (w) => w.key,
    queue: (w) => w.queue,
    title: (w) => w.title,
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
    title: (w) => w.title,
    subtitle: (w) => w.subtitle,
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
    heldByMe: (w) => w.claim?.state === 'claimed' && w.claim.ownerId === CURRENT_USER_ID,
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
    mine: (w) => w.claim?.state === 'claimed' && w.claim.ownerId === CURRENT_USER_ID,
    unassigned: (w) => w.claim === null || w.claim.state !== 'claimed',
    everything: () => true,

    breached: (w) => w.breached,
  },
}

/** The role the mock scopes to. Reads the same `CURRENT_USER_ID` the claim logic does. */
function currentRole(): RoleName {
  return teamUserFixtures.find((u) => u.id === CURRENT_USER_ID)?.role ?? 'Support'
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
      (w.claim === null || w.claim.state !== 'claimed' || w.claim.ownerId === CURRENT_USER_ID),
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
]

/** The fixed clock this client measures against, re-exported so a test need not import `mock/`. */
export { EYVAR_NOW }
