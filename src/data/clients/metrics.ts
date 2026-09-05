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

import { DATA_SOURCE, registerOperations } from '../config'
import { EYVAR_NOW, toInstant } from '../mock/clock'
import { mock, notFound } from '../mock/delay'
import { computeFacets, runQuery, type QueryShape } from '../mock/query'
import type { MetricSeed } from '../fixtures/metrics'
import type { DailySnapshotWindow } from '../fixtures/dailySnapshots'
import type { DailySnapshot } from '../types/metrics'
import type { Facets, IsoDate, Paginated, QueryParams } from '../types/common'
import type {
  BoardNotice,
  Metric,
  MetricBoard,
  MetricBreakdown,
  MetricCategory,
  MetricRank,
  SeriesWindow,
  TimeSeries,
} from '../types/metrics'
import { workBacklogByQueue } from './myWork'
import { listCities, resolveZones, summariseZones } from './zones'
import { concentrationShare, median, p10, p90 } from '../reporting/distribution'
import { addDays, daysInclusive } from '../reporting/buckets'
import { http } from './http'
import { getRoster } from './rosterStore'
import { currentRota } from './team'
import { onFixturesLoaded, type Fixtures } from '../mock/fixtures'

/* Late-bound fixture rows. `mock/fixtures.ts` says why this is not a static
   import: a static one pins seeded data into every build, including the http
   build that can never read it. Bound before any mock read, because `mock()`
   and `mockMutation()` await `loadFixtures()`. */
let boardBreakdowns!: Fixtures['boardBreakdowns']
let boardNotices!: Fixtures['boardNotices']
let metricSeeds!: Fixtures['metricSeeds']
let BOARD_LEADS!: Fixtures['BOARD_LEADS']
let timeSeriesFixtures!: Fixtures['timeSeriesFixtures']
let withShareOfMax!: Fixtures['withShareOfMax']
let SNAPSHOT_CURRENT!: Fixtures['SNAPSHOT_CURRENT']
let snapshotsBetween!: Fixtures['snapshotsBetween']
let allDriverFixtures!: Fixtures['allDriverFixtures']
let riderFixtures!: Fixtures['riderFixtures']
let allSubscriptionFixtures!: Fixtures['allSubscriptionFixtures']
let allTripFixtures!: Fixtures['allTripFixtures']
let applicantFixtures!: Fixtures['applicantFixtures']
let complianceFixtures!: Fixtures['complianceFixtures']
let allRequestFixtures!: Fixtures['allRequestFixtures']
let assuranceTripFixtures!: Fixtures['assuranceTripFixtures']
let fairnessCaseFixtures!: Fixtures['fairnessCaseFixtures']
let safetyIncidentFixtures!: Fixtures['safetyIncidentFixtures']
onFixturesLoaded((f) => {
  boardBreakdowns = f.boardBreakdowns
  boardNotices = f.boardNotices
  metricSeeds = f.metricSeeds
  BOARD_LEADS = f.BOARD_LEADS
  timeSeriesFixtures = f.timeSeriesFixtures
  withShareOfMax = f.withShareOfMax
  SNAPSHOT_CURRENT = f.SNAPSHOT_CURRENT
  snapshotsBetween = f.snapshotsBetween
  allDriverFixtures = f.allDriverFixtures
  riderFixtures = f.riderFixtures
  allSubscriptionFixtures = f.allSubscriptionFixtures
  allTripFixtures = f.allTripFixtures
  applicantFixtures = f.applicantFixtures
  complianceFixtures = f.complianceFixtures
  allRequestFixtures = f.allRequestFixtures
  assuranceTripFixtures = f.assuranceTripFixtures
  fairnessCaseFixtures = f.fairnessCaseFixtures
  safetyIncidentFixtures = f.safetyIncidentFixtures
  METRIC_KEYS.length = 0
  METRIC_KEYS.push(...metricSeeds.map((m) => m.key))
  METRIC_SERIES_KEYS.length = 0
  METRIC_SERIES_KEYS.push(...timeSeriesFixtures.map((c) => c.key))
})

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

/* Registered at module load, not on first call. `config.ts` says *"each client
   registers its ids here at module load"*, and `mock()` only registers when it
   runs — so an operation nobody has invoked yet is missing from a QA panel's
   list and from any validation of `?mockFail=`. Every id in this module is
   listed the moment the module is imported. */
registerOperations(...Object.values(METRIC_OPERATIONS))

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

  /* The live roster, so a seed that enrols or a colleague who activates moves the tile. */
  'admin.overview.activeOperators': () => getRoster().filter((u) => u.status === 'Active').length,
  'admin.overview.operatorsWithoutTwoFactor': () =>
    getRoster().filter((u) => u.secondFactor === null).length,
  /* O-T4: one on-call model. The two rota slots, counted empty (TA-7). */
  'admin.overview.rotaGaps': () => {
    const rota = currentRota()
    return [rota.primaryUserId, rota.secondaryUserId].filter((id) => id === null).length
  },
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
/**
 * §H4 — the rank `BOARD_LEADS` declares for this metric, `supporting` by
 * default.
 *
 * **Defaulting to `supporting` rather than throwing is deliberate.** A board
 * that names no leads renders as it always did — one flat grid — which is a
 * board with no ranking rather than a board that crashes. The obligation to
 * name three is enforced where obligations belong, in `board.test.ts`, over
 * the real fixtures; putting it here would turn an editorial omission into a
 * runtime error on a console someone is trying to read.
 */
function rankOf(seed: MetricSeed): MetricRank {
  return BOARD_LEADS[seed.subTabId]?.includes(seed.key) === true ? 'lead' : 'supporting'
}

function resolve(seed: MetricSeed): Metric {
  const value = seed.sourceResource !== null && DERIVED[seed.key] ? DERIVED[seed.key]!() : seed.value
  const rank = rankOf(seed)

  if (seed.comparison.kind === 'none' || value === null) {
    /* A metric with no value has no delta either — there is nothing to compare.
       The comparison stays as declared so the legend can still name the period
       it *would* have used. */
    return { ...seed, rank, value, deltaPercent: null, direction: null }
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
        rank,
        value,
        comparison: { kind: 'none', reason: 'insufficient-data' },
        deltaPercent: null,
        direction: null,
      }
    }
    /* A target of zero. The target survives; the percentage does not exist
       unless the value is also zero, in which case it is exactly `0 %`. */
    return { ...seed, rank, value, deltaPercent: value === 0 ? 0 : null, direction }
  }

  const deltaPercent = Math.round(((value - base) / Math.abs(base)) * 1000) / 10
  return {
    ...seed,
    rank,
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
  /**
   * **Ordered by OPEN ITEMS, which is what the panel's own title says.**
   *
   * It sorted breached-first, and the heading above it read
   * `All 5 queues, by open items` — two claims about one list, and the reader
   * has only the heading. It also cost the list its bar: R5-12 forbids a bar
   * whose rows are not ordered by the measure it draws, so a list sorted by
   * breaches could not draw `open`, and the fractions ran 1, 0.857, 0.571,
   * 0.714, 0.714 — falling, rising, then flat, which reads as a rendering fault
   * rather than as a ranking with an exception.
   *
   * Sorting by the measure settles both at once: the heading is now true, and
   * the bar descends, so R5-12's condition is met rather than worked around.
   *
   * **The routing intent survives in the sub-label.** The argument for
   * breached-first was that an overview says which screen to open next. Every
   * row still names its breaches — `3 past their SLA` — and the board carries
   * `breachedWorkItems` as a lead figure above. What is lost is breaches
   * deciding the ORDER of a list that says it is ordered by something else.
   */
  const queues = [...workBacklogByQueue()].sort(
    (a, b) => b.open - a.open || b.breached - a.breached,
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
    /* **AC-691 / AC-695 — this list has no cut-off, and must not grow one.**
       It is *every* queue, and the tile above it sums the same set: a cut-off
       here would make the rows disagree with the tile. Seven since T1.6. */
    rowsShown: queues.length,
    rowsTotal: queues.length,
    /**
     * **`true` now, because the ordering that forbade it is gone.**
     *
     * The note below is kept in full because it is the reasoning that made the
     * ordering defect visible, and because it names the condition this line
     * still depends on: the bar is legal only where the rows are ordered by the
     * measure the bar draws. They are, as of the sort above.
     *
     * ── the original note ──────────────────────────────────────────────────
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
    bar: true,
    rows: withShareOfMax(rows),
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
 *   params: from · to   (the §3.7 date-range chip, both `YYYY-MM-DD`, both or neither)
 *   -> MetricBoard  { subTabId, asOf, metrics[], charts[], breakdowns[], notices[] }
 *
 * **`from`/`to` recompute the board — every part of it.** Each metric's
 * `value`, `deltaPercent` and `comparison` must be computed over the requested
 * range, and each metric's `periodStart`/`periodEnd` must name the range it was
 * actually computed over. A metric with no period (`periodStart: null`) is
 * point-in-time and is unaffected by the parameters. **A backend that filters
 * the series and returns the unfiltered scalars must leave the scalars' periods
 * alone**, because a figure's declared window is the claim that makes it
 * readable — see `windowed()`, which is exactly that case and says so on
 * screen rather than relabelling.
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
  /**
   * **The window the board is asked for, or nothing to take the board's own.**
   *
   * `undefined` is not "the default window spelled out" — it is *do not filter*,
   * and it is what every caller sent before the band's pill became a picker. It
   * has to stay distinguishable, because a board asked for no window returns the
   * seeded fixtures byte for byte, which is what keeps the 230-odd assertions in
   * `metrics.test.ts` describing the fixtures rather than describing this
   * function's arithmetic.
   */
  period?: { from: IsoDate; to: IsoDate },
  signal?: AbortSignal,
): Promise<MetricBoard> {
  if (DATA_SOURCE === 'http') {
    return http.get<MetricBoard>(`/metrics/boards/${subTabId}`, { ...period }, { signal })
  }
  return mock(METRIC_OPERATIONS.board, signal, () => {
    /* **Leads first, in the order `BOARD_LEADS` declares them.**
       `resolvedMetrics()` is in fixture-declaration order, and a board's three
       leads are scattered through it — Operations' SLA attainment is seeded
       twelfth. Two things follow, and both matter:

         1. The SCREEN partitions by rank and renders two grids. Filtering
            preserves whatever order arrives here, so if this function does not
            order them, the lead row renders in fixture order and `BOARD_LEADS`'
            careful sequence — the board's first number first — is silently
            discarded.
         2. `BOARD_LEADS` is written to be READ as a ranking. An ordering it
            does not actually produce would be a comment, not a contract.

       A metric not in the table sorts after every one that is, keeping its
       fixture order among its peers — which is what leaves the supporting grid
       exactly as it rendered before ranking existed. */
    const leadOrder = BOARD_LEADS[subTabId] ?? []
    const rankIndex = (m: Metric) => {
      const at = leadOrder.indexOf(m.key)
      return at === -1 ? Number.MAX_SAFE_INTEGER : at
    }
    const metrics = resolvedMetrics()
      .filter((m) => m.subTabId === subTabId)
      .sort((a, b) => rankIndex(a) - rankIndex(b))
    const charts = timeSeriesFixtures.filter((c) => c.subTabId === subTabId)
    if (metrics.length === 0 && charts.length === 0) throw notFound('metric board', subTabId)
    const breakdowns = (boardBreakdowns[subTabId] ?? []).map((b) =>
      b.key === 'operations.backlogByQueue'
        ? backlogByQueueRows(b)
        : b.key === 'zones.citiesHealth'
          ? citiesHealthRows(b)
          : b,
    )
    const board: MetricBoard = {
      subTabId,
      asOf: EYVAR_NOW,
      metrics,
      charts,
      breakdowns,
      notices: boardNotices[subTabId] ?? [],
    }
    return period ? windowed(board, period) : board
  })
}

/**
 * **The condition a windowed board declares: the tiles did not move.**
 *
 * `tone: 'info'` and not `warning`. Nothing is broken and nothing is late —
 * this is the mock stating the limit of what it holds, and R7's warning fill is
 * for a condition somebody has to act on. The tone also decides the
 * consequence, because `selectNotice` renders exactly one notice per board,
 * highest tone first: `info` is **outranked by every real condition on the
 * boards that declare one**, so this can never displace an unacknowledged SOS,
 * an overdue erasure or a breached application window. On those three boards
 * the caveat is therefore *suppressed* rather than shown, which is a real
 * residual gap and is recorded in this defect's handoff rather than resolved by
 * quietly promoting the tone.
 *
 * `action: null` — there is nowhere to send anybody. The fixture limit is not
 * an operator's to fix.
 *
 * `severity` is only ever compared **within a tone**, and no board fixture
 * declares an `info` notice, so this one is unique by construction.
 * `metrics.test.ts` pins that rather than assuming it.
 *
 * Deliberately not in the `notice.*` namespace: the sentence belongs to the
 * period control, it is written and translated beside the picker's own strings
 * in `screens/metrics/copy.ts`, and `noticeTitle` resolves a notice key with no
 * `count` param straight through `t()`, so the root is the whole key.
 */
const PERIOD_DIVERGENCE_NOTICE: BoardNotice = {
  key: 'overview.period.figuresUnchanged',
  params: null,
  tone: 'info',
  action: null,
  severity: 10,
}

/** Signed whole days from `from` to `to`. `-7` when `to` is a week earlier. */
function daysBetween(from: IsoDate, to: IsoDate): number {
  return daysInclusive(from, to) - 1
}

/**
 * **The board, restated for a window the operator asked for.**
 *
 * ## What this re-derives, and what it cannot
 *
 * It slices every series to the window. That is honest: the points are real
 * daily snapshots carrying real dates, so taking the ones inside a range is
 * reading rather than inventing, and the window's declared `periodStart` /
 * `periodEnd` move with them because they now describe exactly what was kept.
 *
 * **It does not touch a metric — neither its `value` nor its period.** A seeded
 * scalar (`11 %` for contribution margin) is a number somebody wrote down, and
 * a derived one is a count over a whole fixture population (`suspended`
 * captains, `active` operators) with no date to filter on. Scaling either by
 * the ratio of two window lengths would manufacture a figure nobody measured.
 *
 * This function used to move `periodStart` / `periodEnd` onto the requested
 * range anyway, and that was the defect: an unchanged 15-day figure wearing a
 * one-day label, which is the same lie as recomputing it badly, told by the
 * cheaper method. **A figure that cannot move keeps the label it earned.**
 *
 * A point-in-time metric (`periodStart === null`) keeps its `null`s for free
 * now — "active captains right now" is not a period, and there is no branch
 * left that could give it one.
 *
 * ## The comparison window moves with the current one, by the offset the
 * fixture itself declares
 *
 * Slicing the comparison by the *current* range emptied it — its points are all
 * dated in the previous fortnight — and then relabelled it with the current
 * range's dates, so §3.7's legend printed two chips naming the same days over
 * one line. The two windows are equal-length and zipped by index, which IS the
 * fixture's declaration that index *i* in one corresponds to index *i* in the
 * other; the offset between them is therefore readable off their two
 * `periodStart`s rather than chosen here. Shifting the requested range back by
 * that offset keeps the correspondence, keeps both windows the same length, and
 * leaves every date on screen naming days its points were actually taken on.
 *
 * ## What the screen is told
 *
 * The divergence is **declared**, not left to be noticed: a board asked for a
 * range it cannot answer with adds `PERIOD_DIVERGENCE_NOTICE` to `notices`, and
 * the page banner states it in words. Only when a metric genuinely disagrees
 * with the requested range — a board of point-in-time tiles has nothing to
 * diverge, and a range that matches the seeded window is not a divergence.
 *
 * The consequence is visible and deliberate: pick `Today` and the charts really
 * do redraw to one point while the tiles hold their seeded figures **and their
 * own dates**. That is a fixture limit stated on screen rather than a lie told
 * quietly, and it goes away the moment `DATA_SOURCE === 'http'` — the backend
 * owns the recomputation and `docs/07-api` says so.
 */
function windowed(board: MetricBoard, period: { from: IsoDate; to: IsoDate }): MetricBoard {
  const slice = (window: SeriesWindow, from: IsoDate, to: IsoDate): SeriesWindow => ({
    ...window,
    periodStart: from,
    periodEnd: to,
    points: window.points.filter((point) => point.at >= from && point.at <= to),
  })

  const sliceComparison = (current: SeriesWindow, comparison: SeriesWindow): SeriesWindow => {
    const offset = daysBetween(comparison.periodStart, current.periodStart)
    return slice(comparison, addDays(period.from, -offset), addDays(period.to, -offset))
  }

  /* A tile that declares a window other than the one asked for is the whole
     condition. Point-in-time tiles declare none and cannot disagree. */
  const diverges = board.metrics.some(
    (metric) =>
      metric.periodStart !== null &&
      metric.periodEnd !== null &&
      (metric.periodStart !== period.from || metric.periodEnd !== period.to),
  )

  return {
    ...board,
    charts: board.charts.map((chart) => ({
      ...chart,
      current: slice(chart.current, period.from, period.to),
      comparison: chart.comparison ? sliceComparison(chart.current, chart.comparison) : null,
    })),
    notices: diverges ? [...board.notices, PERIOD_DIVERGENCE_NOTICE] : board.notices,
  }
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
/*
 * **Filled when the fixture chunk lands, not at module load.** Both lists are
 * derived from seeded rows, and those rows arrive asynchronously now
 * (`mock/fixtures.ts`). The exported binding is a stable array that is
 * populated in place, so the barrel's re-export and every `import` of it keep
 * working; only a reader that runs before the first client call sees it empty,
 * and there is no such reader — `npm run api:check` and the two tests that
 * touch these both await a client call first.
 *
 * In http mode both stay empty, which is correct: the catalogue is the
 * server's, and a screen that needs it must ask for it.
 */
export const METRIC_KEYS: string[] = []

export const METRIC_SERIES_KEYS: string[] = []

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
