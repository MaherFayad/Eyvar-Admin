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
import { metricSeeds, timeSeriesFixtures, type MetricSeed } from '../fixtures/metrics'
import { allDriverFixtures } from '../fixtures/drivers'
import { riderFixtures } from '../fixtures/riders'
import { allSubscriptionFixtures } from '../fixtures/subscriptions'
import { allTripFixtures } from '../fixtures/trips'
import { applicantFixtures } from '../fixtures/applicants'
import { allRequestFixtures } from '../fixtures/requests'
import { assuranceTripFixtures } from '../fixtures/assurance'
import { fairnessCaseFixtures } from '../fixtures/fairness'
import { safetyIncidentFixtures } from '../fixtures/safety'
import { teamUserFixtures } from '../fixtures/teamUsers'
import type { Facets, Paginated, QueryParams } from '../types/common'
import type { Metric, MetricBoard, MetricCategory, TimeSeries } from '../types/metrics'
import { http } from './http'

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
  /* Excludes `pending` — an applicant is not a captain. Legacy's own rule (`:6903`). */
  'management.overview.activeCaptains': () =>
    allDriverFixtures.filter((d) => d.status === 'active').length,
  'management.overview.registeredRiders': () => riderFixtures.length,

  'management.performance.tripsCompleted': () =>
    allTripFixtures.filter((t) => t.status === 'done').length,
  'management.performance.avgCaptainRating': () => {
    const rated = allDriverFixtures.filter((d) => d.rating !== null)
    if (rated.length === 0) return null
    return Math.round((rated.reduce((s, d) => s + (d.rating ?? 0), 0) / rated.length) * 10) / 10
  },

  'management.growth.newRiders': () =>
    riderFixtures.filter((r) => Date.parse(r.joinedAt) >= Date.parse('2026-06-23T00:00:00+03:00'))
      .length,

  'operations.overview.openRequests': () =>
    allRequestFixtures.filter(
      (r) => r.status === 'searching' || r.status === 'offered' || r.status === 'no-drivers',
    ).length,
  /**
   * Across every wave-2 queue. Counted here rather than by calling
   * `listWorkItems` so this client stays synchronous and side-effect free — the
   * predicate is the same one, and `metrics.test.ts` asserts the two agree.
   */
  'operations.overview.breachedWorkItems': () =>
    applicantFixtures.filter(
      (a) => (a.status === 'pending' || a.status === 'in-review') && a.slaBreachedAt !== null,
    ).length +
    allRequestFixtures.filter(
      (r) =>
        (r.status === 'searching' || r.status === 'offered' || r.status === 'no-drivers') &&
        r.slaBreachedAt !== null,
    ).length +
    assuranceTripFixtures.filter((t) => !t.autoHandedOff && t.slaBreachedAt !== null).length +
    safetyIncidentFixtures.filter(
      (i) => i.status === 'open' && (i.slaBreachedAt !== null || i.firstResponseBreachedAt !== null),
    ).length +
    fairnessCaseFixtures.filter(
      (c) => c.status === 'open' && (c.slaBreachedAt !== null || c.firstResponseBreachedAt !== null),
    ).length,
  'operations.overview.legsUncovered': () =>
    assuranceTripFixtures.filter((t) => !t.backupEligible).length,
  'operations.overview.pendingApplications': () =>
    applicantFixtures.filter((a) => a.status === 'pending' || a.status === 'in-review').length,

  'support.overview.openIncidents': () =>
    safetyIncidentFixtures.filter((i) => i.status === 'open').length,
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
    /* Dividing by a zero baseline yields ∞ or NaN and renders as `Infinity%`.
       No comparison is the honest answer; `0 → 5` is "new", not "up 500 %". */
    return {
      ...seed,
      value,
      comparison: { kind: 'none', reason: 'insufficient-data' },
      deltaPercent: null,
      direction: null,
    }
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
 * GET /api/v1/metrics/boards/:subTabId
 *   params: from · to   (the §3.7 date-range chip; the mock serves one window)
 *   -> MetricBoard  { subTabId, asOf, metrics[], charts[] }
 *
 * **One request per screen, not one per tile.** Eight overviews × six tiles is
 * forty-eight round trips, and §3.7's grid settles as a unit — a page that
 * resolves tile-by-tile reflows six times before it stops moving.
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
    return { subTabId, asOf: EYVAR_NOW, metrics, charts }
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
