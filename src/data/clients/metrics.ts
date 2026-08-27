/**
 * Metric tiles and chart cards — the nine table-less boards (§3.7).
 *
 * Two things this client does that a fixture cannot:
 *
 * **1. It derives.** Any metric whose `sourceResource` is set is computed from
 * the *same fixture array the index client serves*, so the Management overview
 * and the People table cannot disagree about the number of active captains.
 * Legacy computes that figure independently on four screens and they drift
 * whenever the "exclude pending" rule changes on one of them (`:6903`).
 *
 * **2. It computes the delta.** `deltaPercent` and `direction` are never
 * seeded. They fall out of `value` and `comparison`, which is what makes §3.7's
 * rule structurally true rather than a convention: **`deltaPercent` is `null`
 * if and only if `comparison.kind === 'none'`** — em-dash, never `0%`, never
 * blank. `metrics.test.ts` asserts the biconditional over every metric.
 *
 * ## There is no third series, here or anywhere
 *
 * `TimeSeries` has `current` and `comparison` and nothing else, so this client
 * has no endpoint that could return a third. §3.7 requires the comparison to be
 * the same hue, dotted; `globals.css:919` records that there is therefore no
 * categorical palette and **no `--chart-3`**. The type is the enforcement.
 */

import { DATA_SOURCE } from '../config'
import { EYVAR_NOW, toInstant } from '../mock/clock'
import { mock, notFound } from '../mock/delay'
import { computeFacets, runQuery, type QueryShape } from '../mock/query'
import {
  boardBreakdowns,
  boardNotices,
  metricSeeds,
  timeSeriesFixtures,
  type MetricSeed,
} from '../fixtures/metrics'
import {
  SNAPSHOT_CURRENT,
  snapshotsBetween,
  type DailySnapshotWindow,
} from '../fixtures/dailySnapshots'
import { allDriverFixtures } from '../fixtures/drivers'
import { riderFixtures } from '../fixtures/riders'
import { allSubscriptionFixtures } from '../fixtures/subscriptions'
import { allTripFixtures } from '../fixtures/trips'
import { applicantFixtures } from '../fixtures/applicants'
import { complianceFixtures } from '../fixtures/compliance'
import { allRequestFixtures } from '../fixtures/requests'
import { assuranceTripFixtures } from '../fixtures/assurance'
import { fairnessCaseFixtures } from '../fixtures/fairness'
import { safetyIncidentFixtures } from '../fixtures/safety'
import { teamUserFixtures } from '../fixtures/teamUsers'
import type { DailySnapshot } from '../types/metrics'
import type { Facets, Paginated, QueryParams } from '../types/common'
import type {
  Metric,
  MetricBoard,
  MetricBreakdown,
  MetricCategory,
  TimeSeries,
} from '../types/metrics'
import { workBacklogByQueue } from './myWork'
import { http } from './http'

/* ── window arithmetic, shared by the derived metrics below ──────────────
   Flat helpers over fixture arrays. Every one takes its window as an
   argument: there is no ambient period in this client, exactly as there is no
   ambient clock in this layer.                                             */

const snapshotSum = (w: DailySnapshotWindow, pick: (s: DailySnapshot) => number): number =>
  snapshotsBetween(w.start, w.end).reduce((total, s) => total + pick(s), 0)

/** To one decimal, **at the source**, so two screens show one number. */
const snapshotMean = (w: DailySnapshotWindow, pick: (s: DailySnapshot) => number): number => {
  const rows = snapshotsBetween(w.start, w.end)
  return Math.round((snapshotSum(w, pick) / rows.length) * 10) / 10
}

/** Inclusive on both bounds, comparing calendar days rather than instants. */
const inWindow = (iso: string | null, w: DailySnapshotWindow): boolean =>
  iso !== null && iso.slice(0, 10) >= w.start && iso.slice(0, 10) <= w.end

const startedIn = (w: DailySnapshotWindow): number =>
  allSubscriptionFixtures.filter((s) => inWindow(s.startedOn, w)).length

const cancelledIn = (w: DailySnapshotWindow): number =>
  allSubscriptionFixtures.filter((s) => inWindow(s.cancelledAt, w)).length

/** Trips that **finished** inside the window. `endedAt`, never `startedAt`. */
const completedIn = (w: DailySnapshotWindow): number =>
  allTripFixtures.filter((t) => t.status === 'done' && inWindow(t.endedAt, w)).length

export const METRIC_OPERATIONS = {
  board: 'metrics.board',
  list: 'metrics.list',
  series: 'metrics.series',
  facets: 'metrics.facets',
} as const

export interface MetricQuery extends QueryParams {
  subTabId?: string
  category?: MetricCategory
}

/**
 * Metrics that are aggregates over a resource this layer already serves.
 *
 * **Flat and boring on purpose.** One line per metric, each a visible
 * expression over a fixture array, so anyone can check the overview's number
 * against the table's by reading rather than by running. A clever registry that
 * inferred these from `sourceResource` would be shorter and unreadable.
 */
const DERIVED: Record<string, () => number | null> = {
  'management.overview.activeSubscriptions': () =>
    allSubscriptionFixtures.filter((s) => s.status === 'active').length,
  /**
   * Sum of `totalRevenueHalalas` over the current snapshot fortnight. Replaces
   * a seeded literal nobody could reproduce (Q-102): the two Overview revenue
   * charts plot the two halves of this figure, so the tile is the sum of the
   * cards beneath it.
   */
  'management.overview.grossRevenue': () =>
    snapshotSum(SNAPSHOT_CURRENT, (s) => s.totalRevenueHalalas),
  /**
   * **Spec §5.1 tile 4** — subscriptions started in the window minus
   * subscriptions cancelled in it. Two period-scoped counts over one
   * population, which is what makes it not defect L-3 (`:6969`), where legacy
   * compares a current-state count against a cumulative one.
   */
  'management.overview.netSubscriptionMovement': () =>
    startedIn(SNAPSHOT_CURRENT) - cancelledIn(SNAPSHOT_CURRENT),

  /**
   * **The cancellation rate. Spec §6.1 tile 1.** The mean of `cancelRatePct`
   * over the current fifteen snapshot days, to one decimal.
   *
   * A **rate**, so it is level-independent: 3–9 % is as true of 47
   * subscriptions as of the legacy demo's 6, which is why this one field
   * survives the mismatch that keeps twenty-two other comparisons on
   * `no-history`.
   */
  'management.performance.cancellationRate': () =>
    snapshotMean(SNAPSHOT_CURRENT, (s) => s.cancelRatePct),
  /**
   * **Scoped to the window the tile declares.** It used to count every trip in
   * the fixture that had ever finished — 98 — against a literal 38 over seven
   * days, and reported `+157.9 %`: defect L-3's shape, a delta across two
   * populations. `endedAt` is on every trip, so the fix is to use it.
   */
  'management.performance.tripsCompleted': () => completedIn(SNAPSHOT_CURRENT),
  'management.performance.avgCaptainRating': () => {
    const rated = allDriverFixtures.filter((d) => d.rating !== null)
    if (rated.length === 0) return null
    return Math.round((rated.reduce((s, d) => s + (d.rating ?? 0), 0) / rated.length) * 10) / 10
  },

  /* Excludes `pending` — an applicant is not a captain. Legacy's own rule (`:6903`). */
  'management.overview.activeCaptains': () =>
    allDriverFixtures.filter((d) => d.status === 'active').length,

  /**
   * A phone number shared by a rider account and a captain account
   * (`identityCollisions()` `:16461`). **Zero today, and zero is the answer.**
   * Riders carry no `email`, so only half of legacy's predicate is expressible.
   */
  'management.risk.identityCollisions': () => {
    const captainPhones = new Set(allDriverFixtures.map((d) => d.phone))
    return riderFixtures.filter((r) => captainPhones.has(r.phone)).length
  },

  'management.growth.newRiders': () =>
    riderFixtures.filter((r) => Date.parse(r.joinedAt) >= Date.parse('2026-06-23T00:00:00+03:00'))
      .length,
  'management.growth.registeredRiders': () => riderFixtures.length,
  /**
   * *"No recorded trip and no subscription"* (`:6963`–`:6968`), as a share of
   * all riders. One of thirteen qualifies. The proxy is legacy's and so is the
   * caveat the tile's caption now carries (AC-641).
   */
  'management.growth.dormantRiderShare': () => {
    const dormant = riderFixtures.filter(
      (r) => r.totalTrips === 0 && r.subscriptionIds.length === 0,
    ).length
    return Math.round((dormant / riderFixtures.length) * 100)
  },

  'operations.overview.openRequests': () =>
    allRequestFixtures.filter(
      (r) => r.status === 'searching' || r.status === 'offered' || r.status === 'no-drivers',
    ).length,
  /**
   * Across every wave-2 queue, from the **same builder `listWorkItems` uses**
   * rather than from five re-implemented predicates. `metrics.test.ts` asserts
   * the tile equals `listWorkItems({ view: 'breached' })`, and building both
   * from `workBacklogByQueue` makes that true by construction rather than by
   * two copies of a rule staying in step.
   */
  'operations.overview.breachedWorkItems': () =>
    workBacklogByQueue().reduce((total, q) => total + q.breached, 0),
  /** Spec §10.1 tile 4 — routed to a role and in no operator's name. */
  'operations.overview.unclaimedWork': () =>
    workBacklogByQueue().reduce((total, q) => total + q.unassigned, 0),
  'operations.overview.legsUncovered': () =>
    assuranceTripFixtures.filter((t) => !t.backupEligible).length,
  'operations.overview.pendingApplications': () =>
    applicantFixtures.filter((a) => a.status === 'pending' || a.status === 'in-review').length,
  /** The half that decides anything: how many are past the 48-hour window. */
  'operations.overview.applicationsPastWindow': () =>
    applicantFixtures.filter(
      (a) => (a.status === 'pending' || a.status === 'in-review') && a.slaBreachedAt !== null,
    ).length,
  /** `complianceScan()` `worst === 0` (`:13322`) — a captain who is legally off dispatch. */
  'operations.overview.complianceExpired': () =>
    complianceFixtures.filter((c) => c.worstState === 'expired').length,
  /** Active captains not on a trip right now (`driverLiveState` `:7283`). */
  'operations.overview.captainsAvailable': () => {
    const onTrip = new Set(
      allTripFixtures.filter((t) => t.status === 'in-trip').map((t) => t.driverId),
    )
    return allDriverFixtures.filter((d) => d.status === 'active' && !onTrip.has(d.id)).length
  },

  'support.overview.openIncidents': () =>
    safetyIncidentFixtures.filter((i) => i.status === 'open').length,
  /**
   * Open `critical` incidents whose first-response clock has breached — the one
   * number in the product whose bad value is `1`, and the condition behind this
   * board's notice. `T1.firstResponseMin` is `0` (`:14652`).
   */
  'support.overview.unacknowledgedCriticalIncidents': () =>
    safetyIncidentFixtures.filter(
      (i) => i.status === 'open' && i.severity === 'critical' && i.firstResponseBreachedAt !== null,
    ).length,
  'support.overview.openFairnessCases': () =>
    fairnessCaseFixtures.filter((c) => c.status === 'open').length,
  /** Overturned as a share of *decided*. `null` when nothing has been decided — not `0 %`. */
  'support.overview.overturnRate': () => {
    const decided = fairnessCaseFixtures.filter((c) => c.status === 'upheld' || c.status === 'overturned')
    if (decided.length === 0) return null
    return Math.round(
      (decided.filter((c) => c.status === 'overturned').length / decided.length) * 100,
    )
  },

  'admin.overview.activeOperators': () =>
    teamUserFixtures.filter((u) => u.status === 'Active').length,
  'admin.overview.operatorsWithoutTwoFactor': () =>
    teamUserFixtures.filter((u) => !u.twoFactorEnabled).length,

  'support.fairness.suspendedCaptains': () =>
    allDriverFixtures.filter((d) => d.suspended).length,
}

/**
 * Resolve one seed into the metric a screen receives: fill a derived value,
 * then compute the delta from the comparison.
 *
 * Rounded to one decimal **at the source**, so two screens showing the same
 * tile show the same number rather than two roundings of the same ratio.
 *
 * ## The zero baseline, and why the two arms are not the same case
 *
 * This function used to collapse **any** zero baseline to
 * `{ kind: 'none', reason: 'insufficient-data' }` to avoid dividing by zero.
 * That is right for a **previous period** — `0 → 5` is "new", not "up 500 %" —
 * and wrong for a **target**, where it silently deleted the target, its owner
 * and its effective date, and printed *"Too little data to compare"* under a
 * number somebody had set an explicit goal for.
 *
 * The casualty was `admin.overview.operatorsWithoutTwoFactor`: target `0`, set
 * by `USR-1`, **the only owned target on any board**, and a target of zero is
 * the most meaningful target there is. So the guard now belongs to the
 * previous-period arm only.
 *
 * A zero target still has no *percentage*, because there is no percentage
 * change from nothing — so:
 *
 *   - `value === 0` against target `0` → **`0 %`, `flat`.** On target, exactly.
 *     A real delta, not an em-dash.
 *   - `value !== 0` against target `0` → **`deltaPercent: null`, and the
 *     `direction` is still set** from the sign of `value − target`, because
 *     over or under target is a fact even when "by what percent" is not.
 *
 * **This is the one documented break in the biconditional** that `deltaPercent`
 * is null iff `comparison.kind === 'none'`. The comparison survives, which is
 * the whole point — the tile can still render `vs 0 target`.
 *
 * **It touches AC-605**, which says a tile whose comparison is `none` shows an
 * em-dash and one of exactly three reason strings. Before this change the tile
 * was inside AC-605 by accident; now it is outside it by design, and the screen
 * needs a fourth branch — see the handoff note in `MetricTile`'s
 * `ComparisonLine`, which today falls back to the `no-history` string for any
 * `deltaPercent === null`, and would say *"No comparison period yet"* beside a
 * target that exists.
 */
function resolve(seed: MetricSeed): Metric {
  const value = seed.sourceResource !== null && DERIVED[seed.key] ? DERIVED[seed.key]!() : seed.value

  if (seed.comparison.kind === 'none' || value === null) {
    /* A metric with no value has no delta either — there is nothing to compare.
       The comparison stays as declared so the legend can still name the period
       it *would* have used. */
    return { ...seed, value, deltaPercent: null, direction: null }
  }

  const base = seed.comparison.value

  if (base === 0) {
    /* No percentage to take a sign from, so the direction comes from the two
       numbers themselves. This is the only branch that does that: everywhere
       else `direction` is the sign of the delta a screen renders, so a delta
       that rounds to `0.0 %` reads `flat` rather than contradicting its own
       caret. */
    const direction = value > base ? 'up' : value < base ? 'down' : 'flat'
    if (seed.comparison.kind === 'previous-period') {
      /* Dividing by a zero baseline yields ∞ or NaN and renders as
         `Infinity%`. No comparison is the honest answer for a *period*. */
      return {
        ...seed,
        value,
        comparison: { kind: 'none', reason: 'insufficient-data' },
        deltaPercent: null,
        direction: null,
      }
    }
    /* A target of zero. The target survives; the percentage does not exist
       unless the value is also zero, in which case it is exactly `0 %`. */
    return { ...seed, value, deltaPercent: value === 0 ? 0 : null, direction }
  }

  const deltaPercent = Math.round(((value - base) / Math.abs(base)) * 1000) / 10
  return {
    ...seed,
    value,
    deltaPercent,
    direction: deltaPercent > 0 ? 'up' : deltaPercent < 0 ? 'down' : 'flat',
  }
}

const resolvedMetrics = (): Metric[] => metricSeeds.map(resolve)

const metricShape: QueryShape<Metric> = {
  searchable: [(m) => m.key, (m) => m.subTabId, (m) => m.category],
  sortable: {
    key: (m) => m.key,
    subTabId: (m) => m.subTabId,
    category: (m) => m.category,
    value: (m) => m.value,
    deltaPercent: (m) => m.deltaPercent,
    asOf: (m) => m.asOf,
  },
  filterable: {
    /* identity — text */
    key: (m) => m.key,
    drilldownRoute: (m) => m.drilldownRoute,

    /* closed sets — options via `getMetricFacets`. These are what §3.7's
       "Metrics library" sidebar groups by; it is a filterable list of metrics,
       which is why a board of charts still declares a filter surface. */
    subTabId: (m) => m.subTabId,
    category: (m) => m.category,
    unit: (m) => m.unit,
    currency: (m) => m.currency,
    sourceResource: (m) => m.sourceResource,
    comparisonKind: (m) => m.comparison.kind,
    /** Why there is no comparison. `null` when there *is* one. */
    noComparisonReason: (m) => (m.comparison.kind === 'none' ? m.comparison.reason : null),
    direction: (m) => m.direction,

    /* booleans */
    higherIsBetter: (m) => m.higherIsBetter,
    /** **`null` is "not computable", never `0`.** The filter has to reach it. */
    hasValue: (m) => m.value !== null,
    hasComparison: (m) => m.comparison.kind !== 'none',
    hasDrilldown: (m) => m.drilldownRoute !== null,
    derived: (m) => m.sourceResource !== null,
    /** Moved in the direction that is good for *this* metric. Not the sign of the delta. */
    improving: (m) =>
      m.direction === null ? null : m.higherIsBetter ? m.direction === 'up' : m.direction === 'down',

    /* numbers */
    value: (m) => m.value,
    deltaPercent: (m) => m.deltaPercent,
    comparisonValue: (m) => (m.comparison.kind === 'none' ? null : m.comparison.value),

    /* dates */
    asOf: (m) => toInstant(m.asOf),
    periodStart: (m) => toInstant(m.periodStart),
    periodEnd: (m) => toInstant(m.periodEnd),
    comparisonPeriodStart: (m) =>
      toInstant(m.comparison.kind === 'previous-period' ? m.comparison.periodStart : null),
    targetEffectiveFrom: (m) =>
      toInstant(m.comparison.kind === 'target' ? m.comparison.effectiveFrom : null),
  },
  facetable: ['subTabId', 'category', 'unit', 'sourceResource', 'comparisonKind', 'noComparisonReason'],
  views: {
    all: () => true,
    derived: (m) => m.sourceResource !== null,
    /* The three tiles §3.7 renders with an em-dash instead of a delta. */
    'no-comparison': (m) => m.comparison.kind === 'none',
    'against-target': (m) => m.comparison.kind === 'target',
    'not-computable': (m) => m.value === null,
  },
}

/**
 * The one breakdown whose rows are **computed rather than seeded**: Operations
 * › Overview's `Backlog by queue` (spec §10.3).
 *
 * It is computed because **AC-695** requires a breakdown to state the same
 * total as the tile above it when both measure the same set, and here two tiles
 * do: `breachedWorkItems` is the sum of this list's breached column and
 * `unclaimedWork` is the sum of its unassigned column. Seeding the rows would
 * make that a coincidence maintained by hand; building both from
 * `workBacklogByQueue()` makes it arithmetic.
 *
 * Ordered breached-first, then by open count — an overview's job is to say
 * which screen to open next, and the queue with the breach is that screen.
 */
function backlogByQueueRows(declared: MetricBreakdown): MetricBreakdown {
  const queues = [...workBacklogByQueue()].sort(
    (a, b) => b.breached - a.breached || b.open - a.open,
  )
  const total = queues.reduce((sum, q) => sum + q.open, 0)
  return {
    ...declared,
    rowsTotal: queues.length,
    rows: queues.map((q) => ({
      id: q.queue,
      /* A closed set of five, so unlike a captain's name this really is a key. */
      labelKey: `breakdown.queue.${q.queue}`,
      labelParams: null,
      /* The two facts a routing table owes: how many are late, how many are
         nobody's. Both are counts, so the sub-label is a key with parameters
         rather than a sentence built by concatenation (AC-713). */
      subLabelKey: 'breakdown.sub.queueStanding',
      value: q.open,
      unit: 'count' as const,
      currency: null,
      secondaryValue: q.breached,
      secondaryUnit: 'count' as const,
      barFraction: total === 0 ? 0 : q.open / total,
      drilldownRoute: WORK_QUEUE_ROUTES[q.queue] ?? null,
    })),
  }
}

/**
 * Where each queue's rows live. Not `WORK_QUEUE_ROUTE` from `types/work.ts` —
 * that maps to a single *item* (`/operations/people/applications/:id`) and a
 * breakdown row points at the **list**, filtered to what the row counted
 * (AC-693).
 */
const WORK_QUEUE_ROUTES: Record<string, string> = {
  application: '/operations/people?view=applications',
  request: '/operations/requests?view=pending',
  assurance: '/operations/assurance?view=no-backup-captain',
  incident: '/support/safety?view=open',
  fairness: '/support/fairness',
}

/**
 * GET /api/v1/metrics/boards/:subTabId
 *   params: from · to   (the §3.7 date-range chip; the mock serves one window)
 *   -> MetricBoard  { subTabId, asOf, metrics[], charts[], breakdowns[], notices[] }
 *
 * **One request per screen, not one per tile.** Eight overviews × six tiles is
 * forty-eight round trips, and §3.7's grid settles as a unit — a page that
 * resolves tile-by-tile reflows six times before it stops moving.
 *
 * `breakdowns` and `notices` arrive in the same response for the same reason:
 * a ranked list is part of the board's layout, and a notice is a page-level
 * banner that must be decided before the page paints, not after.
 *
 * **The response never contains more than three notices** — R4-4 §4.3 — and the
 * *screen* renders at most one of them. This endpoint does not do the choosing:
 * the selection rule is a rendering rule and lives with the renderer.
 *
 * 404 when the sub-tab has no board, which is every sub-tab with a table. That
 * is deliberate: a table screen calling this is a bug, and a silently empty
 * board would hide it.
 */
export async function getMetricBoard(
  subTabId: string,
  signal?: AbortSignal,
): Promise<MetricBoard> {
  if (DATA_SOURCE === 'http') {
    return http.get<MetricBoard>(`/metrics/boards/${subTabId}`, undefined, { signal })
  }
  return mock(METRIC_OPERATIONS.board, signal, () => {
    const metrics = resolvedMetrics().filter((m) => m.subTabId === subTabId)
    const charts = timeSeriesFixtures.filter((c) => c.subTabId === subTabId)
    if (metrics.length === 0 && charts.length === 0) throw notFound('metric board', subTabId)
    const breakdowns = (boardBreakdowns[subTabId] ?? []).map((b) =>
      b.key === 'operations.backlogByQueue' ? backlogByQueueRows(b) : b,
    )
    return {
      subTabId,
      asOf: EYVAR_NOW,
      metrics,
      charts,
      breakdowns,
      notices: boardNotices[subTabId] ?? [],
    }
  })
}

/**
 * GET /api/v1/metrics
 *   params: q · subTabId · category · page · pageSize · sort · filter ·
 *           view=all|derived|no-comparison|against-target|not-computable
 *   -> Paginated<Metric>
 *
 * Sortable: key · subTabId · category · value · deltaPercent · asOf
 *
 * The **metrics library** (§3.7 customise mode) is a filterable list grouped by
 * category — so the metric catalogue is a table even though no board is. This
 * is the endpoint that sidebar reads.
 */
export async function listMetrics(
  params: MetricQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<Metric>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<Metric>>('/metrics', { ...params }, { signal })
  }
  return mock(METRIC_OPERATIONS.list, signal, () => {
    const extra = [
      ...(params.subTabId ? [{ field: 'subTabId', op: 'eq' as const, value: params.subTabId }] : []),
      ...(params.category ? [{ field: 'category', op: 'eq' as const, value: params.category }] : []),
    ]
    const filters = extra.length ? [...(params.filters ?? []), ...extra] : params.filters
    return runQuery(resolvedMetrics(), { ...params, filters }, metricShape)
  })
}

/**
 * GET /api/v1/metrics/:key/series
 *   params: from · to · compare=previous-period|none
 *   -> TimeSeries  { current, comparison | null }
 *
 * **Exactly two windows, by construction.** There is no `series[]` and no
 * parameter that could add one — §3.7 permits one hue and one dotted
 * comparison in that hue, and `globals.css` deletes shadcn's `--chart-1…5` ramp
 * rather than remapping it.
 *
 * 404 when the metric has no series. A metric tile without a chart is normal
 * (§3.7's non-line tiles); an empty chart is not the same thing and must not be
 * faked by returning a zero-point series — see `points: []` versus
 * `points: [0,0,…]` in the fixture.
 */
export async function getMetricSeries(key: string, signal?: AbortSignal): Promise<TimeSeries> {
  if (DATA_SOURCE === 'http') {
    return http.get<TimeSeries>(`/metrics/${key}/series`, undefined, { signal })
  }
  return mock(METRIC_OPERATIONS.series, signal, () => {
    const series = timeSeriesFixtures.find((c) => c.key === key)
    if (!series) throw notFound('metric series', key)
    return series
  })
}

/**
 * GET /api/v1/metrics/facets
 *   params: view
 *   -> Facets — powers the metrics-library sidebar's category grouping
 */
export async function getMetricFacets(view?: string | null, signal?: AbortSignal): Promise<Facets> {
  if (DATA_SOURCE === 'http') {
    return http.get<Facets>('/metrics/facets', { view: view ?? undefined }, { signal })
  }
  return mock(METRIC_OPERATIONS.facets, signal, () =>
    computeFacets(resolvedMetrics(), metricShape, view),
  )
}

/**
 * The metric and series **key catalogues**, synchronously.
 *
 * `listMetrics()` is the real endpoint and is what a screen reads. These two
 * exist for the one job an async call cannot do: letting a *copy* test assert
 * that the dictionary covers every key without reaching into
 * `@/data/fixtures/metrics` — which is a seam violation `seam.test.ts` fails
 * the build on, and which `src/screens/metrics/copy.test.ts` is currently
 * committing.
 *
 * Same category as `WORKSPACE_IDS` and `NOTIFICATION_PREVIEW_SIZE`: a closed
 * catalogue the app is allowed to know, exported through the seam rather than
 * around it.
 */
export const METRIC_KEYS: readonly string[] = metricSeeds.map((m) => m.key)

export const METRIC_SERIES_KEYS: readonly string[] = timeSeriesFixtures.map((c) => c.key)

/** The sub-tabs that have a board. Every other sub-tab has a table instead. */
export const METRIC_BOARD_SUB_TABS: readonly string[] = [
  'management-overview',
  'management-performance',
  'management-risk',
  'management-growth',
  'management-zones',
  'operations-overview',
  'support-overview',
  'admin-overview',
  /* Not a table-less sub-tab — the `captain-economics` view inside a queue. */
  'support-fairness',
]
