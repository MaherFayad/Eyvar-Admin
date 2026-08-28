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
  withShareOfMax,
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
import { listCities, resolveZones, summariseZones } from './zones'
import { concentrationShare, median, p10, p90 } from '../reporting/distribution'
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
  'management.overview.arpa': () => {
    const subs = snapshotMean(SNAPSHOT_CURRENT, (s) => s.activeSubs)
    const rev = snapshotSum(SNAPSHOT_CURRENT, (s) => s.subRevenueHalalas)
    if (subs === 0) return null
    return Math.round(rev / subs)
  },
  'management.overview.revenueMix': () => {
    const gross = snapshotSum(SNAPSHOT_CURRENT, (s) => s.totalRevenueHalalas)
    const subRev = snapshotSum(SNAPSHOT_CURRENT, (s) => s.subRevenueHalalas)
    if (gross === 0) return null
    return Math.round((subRev / gross) * 1000) / 10
  },
  'management.overview.revenuePerActiveCaptain': () => {
    const drivers = snapshotMean(SNAPSHOT_CURRENT, (s) => s.drivers)
    const gross = snapshotSum(SNAPSHOT_CURRENT, (s) => s.totalRevenueHalalas)
    if (drivers === 0) return null
    return Math.round(gross / drivers)
  },
  'management.overview.tripMix': () => {
    const subs = allTripFixtures.filter((t) => t.kind.toLowerCase().includes('sub')).length
    const qr = allTripFixtures.filter((t) => t.kind.toLowerCase().includes('quick')).length
    if (qr === 0) return null
    return Math.round((subs / qr) * 10) / 10
  },
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
  'management.performance.complaintRatePer100Trips': () => {
    const complaints = allDriverFixtures.reduce((sum, d) => sum + d.openComplaints, 0)
    const trips = allTripFixtures.length
    if (trips === 0) return null
    return Math.round((complaints / trips) * 100 * 10) / 10
  },
  'management.performance.repeatLatenessConcentration': () => {
    const driverLates: Record<string, number> = {}
    allTripFixtures.forEach((t) => {
      // `driverId` is null on unassigned trips, which no driver can concentrate.
      if (t.status === 'done' && t.driverId !== null) {
        driverLates[t.driverId] = (driverLates[t.driverId] ?? 0) + 1
      }
    })
    const lateShares = Object.values(driverLates)
    return concentrationShare(lateShares, 3)
  },
  /**
   * **Scoped to the window the tile declares.** It used to count every trip in
   * the fixture that had ever finished — 98 — against a literal 38 over seven
   * days, and reported `+157.9 %`: defect L-3's shape, a delta across two
   * populations. `endedAt` is on every trip, so the fix is to use it.
   */
  'management.performance.tripsCompleted': () => completedIn(SNAPSHOT_CURRENT),
  /**
   * **The average renewal rate — a derivation, and the population is declared.**
   */
  'management.performance.avgRenewalRate': () => {
    const rated = riderFixtures.filter((r) => r.renewalRatePercent !== null)
    if (rated.length === 0) return null
    const total = rated.reduce((sum, r) => sum + (r.renewalRatePercent ?? 0), 0)
    /* One decimal, at the source, so two screens show one number. */
    return Math.round((total / rated.length) * 10) / 10
  },

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
  'management.risk.revenueAtRiskShareOfMrr': () => {
    const mrr = 18_943_50
    const atRisk = 224_900
    return Math.round((atRisk / mrr) * 1000) / 10
  },
  'management.risk.daysToRenewalAtRisk': () => {
    const atRiskSubs = allSubscriptionFixtures.filter(
      (s) => s.status === 'at-risk' || (s.renewalLikelihoodPercent !== null && s.renewalLikelihoodPercent < 50),
    )
    if (atRiskSubs.length === 0) return null
    const daysLeft = atRiskSubs.map((s) => {
      const ms = Date.parse(s.endsOn) - Date.parse('2026-06-25')
      return Math.max(0, Math.round(ms / (24 * 3600 * 1000)))
    })
    return median(daysLeft)
  },

  'management.growth.newRiders': () =>
    riderFixtures.filter((r) => Date.parse(r.joinedAt) >= Date.parse('2026-06-23T00:00:00+03:00'))
      .length,
  'management.growth.registeredRiders': () => riderFixtures.length,
  'management.growth.activationRate7d': () => {
    const activated = riderFixtures.filter((r) => {
      if (r.totalTrips === 0 || !r.lastTripAt) return false
      const joined = Date.parse(r.joinedAt)
      const firstTrip = Date.parse(r.lastTripAt)
      return firstTrip - joined <= 7 * 24 * 3600 * 1000
    }).length
    return Math.round((activated / riderFixtures.length) * 1000) / 10
  },
  'management.growth.qrToSubConversionRate': () => {
    const qrRiders = riderFixtures.filter((r) => r.quickRides > 0)
    if (qrRiders.length === 0) return null
    const converted = qrRiders.filter((r) => r.subscriptionIds.length > 0).length
    return Math.round((converted / qrRiders.length) * 1000) / 10
  },
  'management.growth.cacPerSubscription': () => {
    const spendHalalas = 9_500 * 100
    const newSubs = allSubscriptionFixtures.length
    if (newSubs === 0) return null
    return Math.round(spendHalalas / newSubs)
  },
  'management.growth.ltvCacRatio': () => {
    const meanLtv =
      riderFixtures.reduce((sum, r) => sum + r.lifetimeValueHalalas, 0) / (riderFixtures.length || 1)
    const cac = (9_500 * 100) / (allSubscriptionFixtures.length || 1)
    if (cac === 0) return null
    return Math.round((meanLtv / cac) * 10) / 10
  },
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
  'operations.overview.oldestItemWaitingMinutes': () => {
    const pendingRequests = allRequestFixtures.filter(
      (r) => r.status === 'searching' || r.status === 'offered',
    )
    if (pendingRequests.length === 0) return 18
    const waitTimes = pendingRequests.map((r) => {
      const start = Date.parse(r.requestedAt)
      return Math.round((Date.parse('2026-06-25T09:14:00+03:00') - start) / 60000)
    })
    return Math.max(...waitTimes)
  },
  'operations.overview.medianTimeToAssign': () => {
    const assigned = allRequestFixtures.filter((r) => r.assignedAt !== null)
    if (assigned.length === 0) return 2.4
    const diffs = assigned.map((r) => (Date.parse(r.assignedAt!) - Date.parse(r.requestedAt)) / 60000)
    return median(diffs) ?? 2.4
  },
  'operations.overview.slaAttainmentPercent': () => {
    const items = applicantFixtures
    const withinSla = items.filter((a) => a.slaBreachedAt === null).length
    return Math.round((withinSla / (items.length || 1)) * 1000) / 10
  },
  'operations.overview.riderAbandonmentRate': () => {
    const total = allRequestFixtures.length
    if (total === 0) return 4.2
    const abandoned = allRequestFixtures.filter(
      (r) => r.status === 'cancelled' || r.status === 'no-drivers',
    ).length
    return Math.round((abandoned / total) * 1000) / 10
  },
  /**
   * Across every wave-2 queue, from the **same builder `listWorkItems` uses**
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

  /* ── Management › Market & Zones ───────────────────────────────────────── */
  'management.zones.captainsNeeded': () => summariseZones(resolveZones()).captainsNeeded,
  'management.zones.starvedZones': () => summariseZones(resolveZones()).starvedZones,
  'management.zones.unservedRequests30d': () => summariseZones(resolveZones()).unservedRequests30d,
  'management.zones.avgFailureRate': () => summariseZones(resolveZones()).avgFailureRate,
  'management.zones.worstDemandSupplyRatio': () =>
    summariseZones(resolveZones()).worstDemandSupplyRatio,
  'management.zones.unservedDemandCities': () => {
    const candidateCities = new Set(
      allDriverFixtures.map((d) => d.city).filter((c) => c !== 'Riyadh'),
    )
    return riderFixtures.filter((r) => candidateCities.has(r.city)).length
  },
  'management.zones.applicantPipelinePerCity': () =>
    applicantFixtures.filter((a) => a.status === 'pending' || a.status === 'in-review').length,
  'management.zones.steerOfferAcceptanceRate': () => 68.5,

  'support.overview.openIncidents': () =>
    safetyIncidentFixtures.filter((i) => i.status === 'open').length,
  'support.overview.unacknowledgedCriticalIncidents': () =>
    safetyIncidentFixtures.filter(
      (i) => i.status === 'open' && i.severity === 'critical' && i.firstResponseBreachedAt !== null,
    ).length,
  'support.overview.openFairnessCases': () =>
    fairnessCaseFixtures.filter((c) => c.status === 'open').length,
  'support.overview.medianTimeToFirstResponse': () => {
    const incidents = safetyIncidentFixtures.filter((i) => i.firstResponseAt !== null)
    if (incidents.length === 0) return 12
    const mins = incidents.map((i) =>
      Math.max(1, Math.round((Date.parse(i.firstResponseAt!) - Date.parse(i.openedAt)) / 60000)),
    )
    return median(mins) ?? 12
  },
  'support.overview.repeatContactRate': () => {
    const repeats = riderFixtures.filter((r) => r.complaintIds.length > 1).length
    return Math.round((repeats / (riderFixtures.length || 1)) * 1000) / 10
  },
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
    teamUserFixtures.filter((u) => u.secondFactor === null).length,
  'admin.overview.itemsResolvedPerOperatorHour': () => 4.8,
  'admin.overview.workloadBalance': () => 1.4,

  'support.fairness.earningsP10': () => {
    const rates = allDriverFixtures.map((d) => Math.round(d.monthEarningsHalalas / 160))
    const val = p10(rates)
    return val !== null ? Math.round(val) : 2100
  },
  'support.fairness.earningsP90': () => {
    const rates = allDriverFixtures.map((d) => Math.round(d.monthEarningsHalalas / 160))
    const val = p90(rates)
    return val !== null ? Math.round(val) : 5400
  },
  'support.fairness.suspensionRatePer100': () => {
    const suspended = allDriverFixtures.filter((d) => d.suspended).length
    const active = allDriverFixtures.filter((d) => d.status === 'active').length
    return Math.round((suspended / (active || 1)) * 100 * 10) / 10
  },
  'support.fairness.overturnRate': () => {
    const decided = fairnessCaseFixtures.filter((c) => c.status === 'upheld' || c.status === 'overturned')
    if (decided.length === 0) return null
    return Math.round((decided.filter((c) => c.status === 'overturned').length / decided.length) * 100)
  },
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
    /* R5-1. `null` on a tile that has a value, which is where the facet's own
       count comes from: three of fifty-one. */
    absenceReason: (m) => m.absenceReason,
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
  facetable: [
    'subTabId',
    'category',
    'unit',
    'sourceResource',
    'comparisonKind',
    'noComparisonReason',
    /* New with R5-1, and facetable for the same reason `noComparisonReason` is:
       *how many of our numbers are absent, and for which of two reasons* is a
       question the metrics library should be able to answer without a join. */
    'absenceReason',
  ],
  views: {
    all: () => true,
    derived: (m) => m.sourceResource !== null,
    /* The tiles §3.7 renders with an em-dash instead of a delta. */
    'no-comparison': (m) => m.comparison.kind === 'none',
    'against-target': (m) => m.comparison.kind === 'target',
    /**
     * **Renamed from `not-computable` by R5-1, and the rename is the point.**
     * This view selects every metric with no value, whatever the reason. Once
     * `ValueAbsenceReason` has a member *called* `not-computable` that means
     * something strictly narrower — the inputs exist and the calculation has no
     * answer — a view of the same name selecting a superset is a contradiction
     * inside one contract. Filter by `absenceReason` for the narrow set.
     */
    'value-absent': (m) => m.value === null,
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
  const rows = queues.map((q) => ({
    id: q.queue,
    /* A closed set of five, so unlike a captain's name this really is a key —
       `kind: 'key'`, which takes the page direction (R5-7). */
    label: { kind: 'key' as const, key: `breakdown.queue.${q.queue}`, params: null },
    /* **B-6, reverted — R5-5, and the designer overruled their own objection.**
       This was `{secondary} past their SLA`; a previous pass changed it to
       `Open · past their SLA` because the rule of the day gave the number to
       the second column. The column is withdrawn and the original was right, so
       the number comes back into the phrase as `{past} past their SLA`. A
       column legend repeated identically on every row is what a header row
       exists to avoid, and a breakdown has no header row.

       `{past}` is a bare count and `BreakdownList` formats it — the sub-label
       is a key with parameters, never a sentence built by concatenation
       (AC-713).

       **C-6, and it is a knowing deviation rather than an oversight.** AC-663
       asks a backlog row for **three** counts — open, breached and unclaimed.
       R5-5 gives the row one numeric column and one sub-label, and §11.4's
       string spends both on open and breached. `q.unassigned` is therefore not
       on the row. It is not lost — it is the `operations.overview.unclaimedWork`
       tile on the same board, summed from this same builder — but AC-663 as
       written is no longer satisfied by this list and **nobody has amended it**.
       Reported rather than left to surface as a regression. */
    subLabelKey: 'breakdown.sub.queuePastSla',
    subLabelParams: { past: q.breached },
    value: q.open,
    unit: 'count' as const,
    currency: null,
    /* Overwritten by `withShareOfMax` on the next line. */
    barFraction: null,
    drilldownRoute: WORK_QUEUE_ROUTES[q.queue] ?? null,
  }))
  return {
    ...declared,
    rowsTotal: queues.length,
    /**
     * **`false`, and R5-12 is why: a bar is legal only where the rows are
     * ordered by the measure the bar draws.**
     *
     * This list is sorted **breached-first**, which is what a work queue is
     * for — an overview's job is to say which screen to open next, and the
     * queue with the breach is that screen. The bar would draw `open`. Sorted
     * by breaches, its fractions ran **1, 0.857, 0.571, 0.714, 0.714**: falling,
     * then rising, then flat. A bar chart whose bars do not descend is not read
     * as *"a ranking with an exception"*; it is read as a rendering fault.
     *
     * **It loses nothing, because this is a routing table and not a ranking.**
     * R5-6's three conditions are all satisfied — one unit, one denominator,
     * `max > min` — so `barIsLegal` returns `true` and would have drawn one.
     * That is the point of R5-12 being a separate rule: legality of the *scale*
     * is not legality of the *ordering*.
     *
     * Worth recording how it survived two build passes: at the old
     * `--chart-fill`'s 1.142 : 1 the bars were too faint to see the disorder in.
     * **A token faint enough to conceal a data defect is a second, independent
     * reason it was the wrong token.**
     *
     * `withShareOfMax` still runs, and still returns `null` on every row
     * whenever the bar would be illegal — but with `bar: false` the fractions
     * it computes must not be carried either: `MetricBreakdownRow.barFraction`
     * is documented `null` whenever the breakdown's `bar` is false, *so a row
     * cannot draw a bar the list forbids*.
     */
    bar: false,
    rows: withShareOfMax(rows).map((row) => ({ ...row, barFraction: null })),
  }
}

/**
 * `zones.citiesHealth`, computed — and **this is where legacy defect L-6 is
 * preserved in shape and removed as a bug.**
 *
 * Legacy (`:6940`–`:6942`) computes a city's average request-failure rate as:
 *
 * ```js
 * var zonesForCity = (DB.zones||[]);              // ← every zone, unfiltered
 * var avgFail = c.name === 'Riyadh' && zonesForCity.length ? …average… : null;
 * ```
 *
 * Two faults in three lines. It never filters the zones **to the city**, and it
 * then covers for that by gating the whole computation on a **string literal**.
 * So Jeddah, Dammam and Makkah render an em-dash forever — not because they have
 * no zones, but because their names are not `'Riyadh'`. Seed one Jeddah zone and
 * the column stays blank; seed a zone in a city called `riyadh` and it also
 * stays blank.
 *
 * Here the reading exists **iff the city has tracked zones**, and it averages
 * *that city's* zones. Today that produces the identical output — one reading
 * for Riyadh, three genuine `null`s — which is the point: **three of four rows
 * really have no reading, and `secondaryValue` is nullable for exactly them.**
 * The em-dashes are kept because they are true, and they stop being permanent
 * the day a second city launches.
 *
 * `value` is the **zone count**, not the rate, because `MetricBreakdownRow.value`
 * is `number` and not `number | null` — ranking on a field three rows cannot
 * fill is not a ranking. That constraint is a live finding for
 * product-designer, recorded at the declaration in `fixtures/metrics.ts`.
 *
 * **AC-695**: Riyadh's `6` is the same six rows `listZones()` serves and its
 * `45` is the same `avgFailureRate` the tile shows, because both come from
 * `summariseZones()`.
 */
function citiesHealthRows(declared: MetricBreakdown): MetricBreakdown {
  const zones = resolveZones()
  const cities = listCities()
  return {
    ...declared,
    rowsShown: cities.length,
    rowsTotal: cities.length,
    rows: cities.map((city) => {
      const own = zones.filter((z) => z.city === city.name)
      const summary = summariseZones(own)
      return {
        /* `CITY-RUH`, `CITY-JED`, … — the ids `entityRow` seeded, kept stable so
           a bug report can still name a row. */
        id: `CITY-${CITY_IDS[city.name] ?? city.name.slice(0, 3).toUpperCase()}`,
        /* A city name is **data**, not copy — `kind: 'text'`, which carries its
           own direction and truncates at its tail in an Arabic console (R5-7,
           V-4). */
        label: { kind: 'text' as const, text: city.name },
        /* **R5-5.** The rate is a noun phrase now, not a nullable second
           column: `Live · 45% of requests unserved`. A city with no tracked
           zones states no rate at all and `Not launched` says why — which is
           the difference between *no reading* and *a reading of zero*, and the
           thing the column form could only spell as an em dash. */
        /**
         * Three cases, and `summary.avgFailureRate`'s `null` is never coerced
         * to `0` — a city with no reading and a city reading zero are different
         * facts, which is R5-5's own argument for this shape.
         *
         * **The third case now has a key: `breakdown.sub.cityLive` = `Live`.**
         *
         * It previously rendered **no sub-label at all**. Refusing to fill
         * `{rate}` with a fabricated zero, or to label a live city
         * `Not launched`, was right and stays right — but rendering *nothing*
         * reproduces **V-2 at row scale**: an unexplained absence one level
         * down, which is the exact defect this round exists to close. An
         * operator reading a row with a count and no second line cannot tell a
         * live city awaiting its first zone reading from a rendering fault.
         *
         * `Live` closes it **without inventing a number**. It states the one
         * fact that is known — the city is launched — and says nothing about a
         * rate nobody has measured.
         *
         * Still unreachable today: Riyadh is the only active city and it has
         * six zones. It becomes reachable the day a second city launches before
         * its zones are tracked, which is exactly the day the old behaviour
         * would have shipped a blank.
         */
        subLabelKey: !city.active
          ? 'breakdown.sub.cityNotLive'
          : summary.avgFailureRate !== null
            ? 'breakdown.sub.cityLiveUnserved'
            : 'breakdown.sub.cityLive',
        subLabelParams:
          city.active && summary.avgFailureRate !== null
            ? { rate: summary.avgFailureRate }
            : null,
        value: own.length,
        unit: 'count' as const,
        currency: null,
        barFraction: null,
        drilldownRoute: null,
      }
    }),
  }
}

/** Stable row ids for the four seeded cities. A new city falls back to its first three letters. */
const CITY_IDS: Record<string, string> = {
  Riyadh: 'RUH',
  Jeddah: 'JED',
  Dammam: 'DMM',
  Makkah: 'MAK',
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
 * **`metrics[]` is the board's tile list and the server decides its length.**
 * A measure with no store is **absent from the array** — not present with a
 * `null` value, not present with a flag (R4-11 §11.2, applied by R5-1). A
 * present tile with `value: null` is a measure we take and have no reading for,
 * and it always carries `absenceReason`. Whoever wires the real endpoint must
 * keep that distinction: returning a `null` tile for a measure the backend does
 * not hold puts an em-dash on the board claiming the number exists somewhere.
 *
 * A tile leaving or joining this array is a **spec** event — the AC that
 * enumerates the board is amended in the same pass and the tile is listed in
 * the spec's *deliberately not here* table against the store it waits on.
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
      b.key === 'operations.backlogByQueue'
        ? backlogByQueueRows(b)
        : b.key === 'zones.citiesHealth'
          ? citiesHealthRows(b)
          : b,
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
 *           view=all|derived|no-comparison|against-target|value-absent
 *   facets: subTabId · category · unit · sourceResource · comparisonKind ·
 *           noComparisonReason · absenceReason
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
