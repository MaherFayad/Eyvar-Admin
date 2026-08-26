/**
 * Metric tiles and chart cards — the nine table-less boards.
 *
 * Eight are the sub-tabs with no table: Management × 5 plus the Operations,
 * Support and Admin overviews. The ninth is `support-fairness`, whose
 * `captain-economics` view is a reading surface inside an otherwise
 * queue-shaped sub-tab (`renderCaptainEconomics`, legacy) — a chart behind a
 * claim button is the alternative, so it is served here.
 *
 * ## Values are seeded; several are *derived*
 *
 * A metric whose value is an aggregate over a resource this layer already
 * serves carries `value: null` here and `sourceResource` set. `clients/metrics.ts`
 * computes it **from the same fixture the index client serves**, so the
 * overview and the table cannot disagree about the number of active captains.
 * That is the single most common way two screens end up contradicting each
 * other, and it is avoidable for free.
 *
 * Everything else — anything with a denominator this dataset does not hold — is
 * a literal, and says so.
 *
 * ## Deltas are not in this file
 *
 * `deltaPercent` and `direction` are computed by the client from `value` and
 * `comparison`, which is what guarantees §3.7's rule: **`deltaPercent` is
 * `null` if and only if `comparison.kind === 'none'`** — em-dash, never `0%`,
 * never blank. A seeded delta could contradict its own comparison; a computed
 * one cannot.
 *
 * ## Why so many comparisons are `none`
 *
 * The legacy app holds **one point in time** and says so in its own copy:
 * *"The Data Export → Daily Snapshots tool builds a real historical trend the
 * longer it's used — capture one regularly and this section will show true
 * month-over-month growth instead of a single-point read"* (`:6979`). Seeding a
 * previous period we do not have would put a number on a screen that the
 * backend cannot reproduce on day one. `reason: 'no-history'` is that sentence
 * as data, and it is the most common arm in this file on purpose.
 */

import type { Metric, SeriesPoint, TimeSeries } from '../types/metrics'
import { EYVAR_NOW } from '../mock/clock'

/** What a fixture carries. `deltaPercent` and `direction` are the client's. */
export type MetricSeed = Omit<Metric, 'deltaPercent' | 'direction'>

/** The current chart window: the seven days ending on the fixed clock's day. */
export const CURRENT_PERIOD = { start: '2026-06-19', end: '2026-06-25' } as const
/** The comparison window: the seven days before it. */
export const PREVIOUS_PERIOD = { start: '2026-06-12', end: '2026-06-18' } as const

const CURRENT_DAYS = [
  '2026-06-19',
  '2026-06-20',
  '2026-06-21',
  '2026-06-22',
  '2026-06-23',
  '2026-06-24',
  '2026-06-25',
] as const
const PREVIOUS_DAYS = [
  '2026-06-12',
  '2026-06-13',
  '2026-06-14',
  '2026-06-15',
  '2026-06-16',
  '2026-06-17',
  '2026-06-18',
] as const

/** Pair seven values with the seven days of a window. Flat, greppable, hand-editable. */
const points = (days: readonly string[], values: ReadonlyArray<number | null>): SeriesPoint[] =>
  days.map((at, i) => ({ at, value: values[i] ?? null }))

/* ═══════════════════════════════ metrics ═══════════════════════════════ */

export const metricSeeds: MetricSeed[] = [
  /* ── Management › Overview ───────────────────────────────────────────── */
  {
    key: 'management.overview.totalRevenue',
    subTabId: 'management-overview',
    category: 'revenue',
    /* Literal: the trip fixtures carry fares but not the payment ledger, and
       "revenue" is Finance's definition to make (Q7 is still open on the
       commission split). Derived would be a guess dressed as a join. */
    value: 4_218_650,
    unit: 'money',
    currency: 'SAR',
    asOf: EYVAR_NOW,
    periodStart: '2026-06-01',
    periodEnd: '2026-06-25',
    comparison: {
      kind: 'previous-period',
      value: 3_902_400,
      periodStart: '2026-05-01',
      periodEnd: '2026-05-25',
    },
    higherIsBetter: true,
    sourceResource: null,
    drilldownRoute: '/financials/revenue',
  },
  {
    key: 'management.overview.activeSubscriptions',
    subTabId: 'management-overview',
    category: 'subscriptions',
    /* Derived — `listSubscriptions({ status: 'active' }).total`. */
    value: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: true,
    sourceResource: 'subscriptions',
    drilldownRoute: '/operations/subscriptions?view=active',
  },
  {
    key: 'management.overview.activeCaptains',
    subTabId: 'management-overview',
    category: 'supply',
    /* Derived — the same count the People index shows. Legacy computes it
       independently on four screens (`:6903` is one) and they disagree whenever
       the "pending" exclusion drifts. */
    value: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: true,
    sourceResource: 'drivers',
    drilldownRoute: '/operations/people?view=captains',
  },
  {
    key: 'management.overview.registeredRiders',
    subTabId: 'management-overview',
    category: 'demand',
    value: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: true,
    sourceResource: 'riders',
    drilldownRoute: '/operations/people?view=riders',
  },
  {
    key: 'management.overview.sameCaptainKept',
    subTabId: 'management-overview',
    category: 'service',
    /* `sameCaptainStats()` (`:15702`) — plans that never changed captain. One
       of the two promises printed on the rider's plan card, and until that
       function was written it was measured nowhere. */
    value: 83,
    unit: 'percent',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: '2026-06-01',
    periodEnd: '2026-06-25',
    comparison: { kind: 'target', value: 95, setByUserId: null, effectiveFrom: '2026-01-01' },
    higherIsBetter: true,
    sourceResource: 'subscriptions',
    drilldownRoute: '/operations/subscriptions',
  },
  {
    key: 'management.overview.onTimePickup',
    subTabId: 'management-overview',
    category: 'service',
    /* `onTimeStats()` (`:15708`). The second printed promise. */
    value: 91,
    unit: 'percent',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: '2026-06-01',
    periodEnd: '2026-06-25',
    comparison: { kind: 'target', value: 95, setByUserId: null, effectiveFrom: '2026-01-01' },
    higherIsBetter: true,
    sourceResource: 'trips',
    drilldownRoute: '/operations/trips',
  },

  /* ── Management › Performance ────────────────────────────────────────── */
  {
    key: 'management.performance.contributionMargin',
    subTabId: 'management-performance',
    category: 'revenue',
    /**
     * `contributionMargin()` (`:15731`) — the take rate **after** promos,
     * referral bonuses, incentives, refunds and goodwill. Legacy's headline
     * 19.2 % subtracts none of them and is *"structurally overstated"* by its
     * own comment. This is the number a board asks for.
     */
    value: 11,
    unit: 'percent',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: '2026-06-01',
    periodEnd: '2026-06-25',
    comparison: {
      kind: 'previous-period',
      value: 13,
      periodStart: '2026-05-01',
      periodEnd: '2026-05-25',
    },
    higherIsBetter: true,
    sourceResource: null,
    drilldownRoute: '/financials/revenue',
  },
  {
    key: 'management.performance.avgRenewalRate',
    subTabId: 'management-performance',
    category: 'subscriptions',
    /**
     * **`null`, and that is not zero.** Legacy gets this one right —
     * `renewRateAvg != null ? renewRateAvg+'%' : '—'` (`:6913`) — because too
     * few subscriptions carry a renewal history to average. A `0 %` here would
     * read as total churn.
     */
    value: null,
    unit: 'percent',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: '2026-06-01',
    periodEnd: '2026-06-25',
    comparison: { kind: 'none', reason: 'insufficient-data' },
    higherIsBetter: true,
    sourceResource: null,
    drilldownRoute: '/operations/subscriptions',
  },
  {
    key: 'management.performance.tripsCompleted',
    subTabId: 'management-performance',
    category: 'demand',
    value: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: CURRENT_PERIOD.start,
    periodEnd: CURRENT_PERIOD.end,
    comparison: {
      kind: 'previous-period',
      value: 38,
      periodStart: PREVIOUS_PERIOD.start,
      periodEnd: PREVIOUS_PERIOD.end,
    },
    higherIsBetter: true,
    sourceResource: 'trips',
    drilldownRoute: '/operations/trips',
  },
  {
    key: 'management.performance.avgCaptainRating',
    subTabId: 'management-performance',
    category: 'service',
    value: null,
    unit: 'rating',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: true,
    sourceResource: 'drivers',
    drilldownRoute: '/operations/people?view=captains',
  },

  /* ── Management › Risk & Signals ─────────────────────────────────────── */
  /**
   * **M1: Risk & Signals has no work queue.** Every action on the legacy page
   * is a `go()` to somewhere else (`:14320`, `:14336`, `:14351`, `:14363`), so
   * it computes a flag and routes the operator. That makes it a *reading*
   * surface: metrics and series, no rows, no claims, no dispositions — which is
   * why its nav tone is `neutral` and stays that way.
   *
   * Every tile below therefore carries a `drilldownRoute` to the queue that
   * owns the work. That is the whole design of the page.
   */
  {
    key: 'management.risk.openSignals',
    subTabId: 'management-risk',
    category: 'risk',
    /* `renderPredictivePage` (`:14367`) — churn-risk subs + at-risk captains +
       flagged renewals. Six, matching the nav count. */
    value: 6,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
    /** Fewer signals is better. No screen can derive that from the key. */
    higherIsBetter: false,
    sourceResource: null,
    drilldownRoute: null,
  },
  {
    key: 'management.risk.revenueAtRisk',
    subTabId: 'management-risk',
    category: 'risk',
    /* `revenueAtRisk` (`:14372`) — deferred value on subscriptions scoring
       below 50. Halalas; legacy carries it as a float of SAR and prints
       `toFixed(0)`. */
    value: 184_700,
    unit: 'money',
    currency: 'SAR',
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: false,
    sourceResource: 'subscriptions',
    drilldownRoute: '/operations/subscriptions?view=at-risk',
  },
  {
    key: 'management.risk.atRiskCaptains',
    subTabId: 'management-risk',
    category: 'risk',
    /* `driverRiskScore` below 80 (`:14369`): expiring documents, suspensions,
       open incidents, cash debt. */
    value: 3,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: false,
    sourceResource: 'drivers',
    drilldownRoute: '/operations/people?view=compliance',
  },
  {
    key: 'management.risk.repeatIncidentCaptains',
    subTabId: 'management-risk',
    category: 'risk',
    /* `renderPredIncidents` (`:14345`): captains with 2+ incidents or disputes
       against them — *"a pattern, not a one-off"*. */
    value: 1,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: '2026-05-25',
    periodEnd: '2026-06-25',
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: false,
    sourceResource: 'safety',
    drilldownRoute: '/support/safety?view=open',
  },

  /* ── Management › Growth ─────────────────────────────────────────────── */
  {
    key: 'management.growth.promoSpend',
    subTabId: 'management-growth',
    category: 'revenue',
    /* `DB.promos` (`:13500`): 4,180 + 3,000 + 1,240 + 5,920 SAR spent. */
    value: 1_434_000,
    unit: 'money',
    currency: 'SAR',
    asOf: EYVAR_NOW,
    periodStart: '2026-01-01',
    periodEnd: '2026-06-25',
    comparison: { kind: 'target', value: 2_200_000, setByUserId: 'USR-1', effectiveFrom: '2026-01-01' },
    higherIsBetter: false,
    sourceResource: null,
    drilldownRoute: null,
  },
  {
    key: 'management.growth.subscriptionsFromPromos',
    subTabId: 'management-growth',
    category: 'subscriptions',
    /* `DB.promos[].newSubs`: 61 + 32 + 38 + 88. */
    value: 219,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: '2026-01-01',
    periodEnd: '2026-06-25',
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: true,
    sourceResource: null,
    drilldownRoute: null,
  },
  {
    key: 'management.growth.newRiders',
    subTabId: 'management-growth',
    category: 'demand',
    value: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: '2026-06-23',
    periodEnd: '2026-06-25',
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: true,
    sourceResource: 'riders',
    drilldownRoute: '/operations/people?view=riders',
  },
  {
    key: 'management.growth.dormantRiderShare',
    subTabId: 'management-growth',
    category: 'demand',
    /**
     * Legacy defines dormancy as *"no recorded trip and no active
     * subscription"* and immediately warns that *"this dataset has no precise
     * 'last app open' timestamp per rider, so treat this as a proxy, not an
     * exact figure"* (`:6971`). The proxy is kept and the caveat belongs in the
     * tile's copy — the design spec's call, flagged here because a percentage
     * with an asterisk is a copy problem, not a data one.
     */
    value: 19,
    unit: 'percent',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: false,
    sourceResource: 'riders',
    drilldownRoute: '/operations/people?view=riders',
  },

  /* ── Management › Market & Zones ─────────────────────────────────────── */
  {
    key: 'management.zones.trackedZones',
    subTabId: 'management-zones',
    category: 'supply',
    /* `DB.zones` (`:13952`), six districts. */
    value: 6,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: true,
    sourceResource: null,
    drilldownRoute: null,
  },
  {
    key: 'management.zones.worstDemandSupplyRatio',
    subTabId: 'management-zones',
    category: 'supply',
    /* Al Narjis: 14 demand against 2 captains (`:13953`). */
    value: 7,
    unit: 'ratio',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: false,
    sourceResource: null,
    drilldownRoute: null,
  },
  {
    key: 'management.zones.avgFailureRate',
    subTabId: 'management-zones',
    category: 'service',
    /* `zoneFailRate` averaged (`:13977`): failures in 30 days over demand. */
    value: 42,
    unit: 'percent',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: '2026-05-25',
    periodEnd: '2026-06-25',
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: false,
    sourceResource: null,
    drilldownRoute: null,
  },
  {
    key: 'management.zones.liveCities',
    subTabId: 'management-zones',
    category: 'supply',
    /**
     * `DB.cities` (`:13946`) — four seeded, **one live**. The tile that reads
     * `1` against a denominator of 4 and needs the denominator to make sense;
     * a bare `1` is meaningless and a `25 %` is worse.
     */
    value: 1,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'target', value: 4, setByUserId: 'USR-1', effectiveFrom: '2026-01-01' },
    higherIsBetter: true,
    sourceResource: null,
    drilldownRoute: null,
  },

  /* ── Operations › Overview ───────────────────────────────────────────── */
  {
    key: 'operations.overview.openRequests',
    subTabId: 'operations-overview',
    category: 'demand',
    value: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: false,
    sourceResource: 'requests',
    drilldownRoute: '/operations/requests?view=pending',
  },
  {
    key: 'operations.overview.breachedWorkItems',
    subTabId: 'operations-overview',
    category: 'service',
    /* Derived across every wave-2 queue, through `listWorkItems`. The one tile
       that answers "is anything on fire" without naming a queue. */
    value: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: false,
    sourceResource: 'work-items',
    drilldownRoute: '/operations/my-work?view=everything',
  },
  {
    key: 'operations.overview.legsUncovered',
    subTabId: 'operations-overview',
    category: 'supply',
    value: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: false,
    sourceResource: 'assurance',
    drilldownRoute: '/operations/assurance?view=no-backup-captain',
  },
  {
    key: 'operations.overview.pendingApplications',
    subTabId: 'operations-overview',
    category: 'supply',
    value: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: false,
    sourceResource: 'applications',
    drilldownRoute: '/operations/people?view=applications',
  },

  /* ── Customer Support › Overview ─────────────────────────────────────── */
  {
    key: 'support.overview.openIncidents',
    subTabId: 'support-overview',
    category: 'risk',
    value: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: false,
    sourceResource: 'safety',
    drilldownRoute: '/support/safety?view=open',
  },
  {
    key: 'support.overview.openFairnessCases',
    subTabId: 'support-overview',
    category: 'service',
    value: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: false,
    sourceResource: 'fairness',
    drilldownRoute: '/support/fairness?view=suspension-appeals',
  },
  {
    key: 'support.overview.contactsPerThousandTrips',
    subTabId: 'support-overview',
    category: 'service',
    /**
     * CPT — *"the one number that…"* (`:14980`). **`null`**: `DB.contacts` is
     * seeded empty (`:14719`) and every contact is written at runtime, so the
     * numerator does not exist on a fresh load. Zero would claim a perfect
     * support record; `null` says we have not measured it.
     */
    value: null,
    unit: 'ratio',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: CURRENT_PERIOD.start,
    periodEnd: CURRENT_PERIOD.end,
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: false,
    sourceResource: null,
    drilldownRoute: '/support/contact-centre',
  },
  {
    key: 'support.overview.overturnRate',
    subTabId: 'support-overview',
    category: 'service',
    /**
     * Decided fairness cases that were overturned (`:15641`). **Higher is not
     * worse**: *"A high overturn rate on this page is not a failure — it means
     * the appeal route is doing its job and catching bad calls before they cost
     * you a captain"* (`:15690`).
     *
     * So `higherIsBetter: true` on a metric every instinct says to colour red.
     * This is precisely the field a screen cannot derive.
     */
    value: null,
    unit: 'percent',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: true,
    sourceResource: 'fairness',
    drilldownRoute: '/support/fairness',
  },

  /* ── Admin › Overview ────────────────────────────────────────────────── */
  {
    key: 'admin.overview.activeOperators',
    subTabId: 'admin-overview',
    category: 'supply',
    value: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: true,
    sourceResource: 'team-users',
    drilldownRoute: '/admin/team',
  },
  {
    key: 'admin.overview.operatorsWithoutTwoFactor',
    subTabId: 'admin-overview',
    category: 'risk',
    /* Derived. `USR-2` moves real money with 2FA off — the fixture that makes
       this tile non-zero without hand-editing. */
    value: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'target', value: 0, setByUserId: 'USR-1', effectiveFrom: '2026-01-01' },
    higherIsBetter: false,
    sourceResource: 'team-users',
    drilldownRoute: '/admin/team',
  },
  {
    key: 'admin.overview.activityEvents',
    subTabId: 'admin-overview',
    category: 'service',
    /* The 1,247 on the Activity Log badge. Four digits in a narrow column,
       here as well as in the rail. */
    value: 1_247,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: CURRENT_PERIOD.start,
    periodEnd: CURRENT_PERIOD.end,
    comparison: {
      kind: 'previous-period',
      value: 1_190,
      periodStart: PREVIOUS_PERIOD.start,
      periodEnd: PREVIOUS_PERIOD.end,
    },
    higherIsBetter: true,
    sourceResource: null,
    drilldownRoute: '/admin/activity',
  },
  {
    key: 'admin.overview.openErasureRequests',
    subTabId: 'admin-overview',
    category: 'risk',
    /**
     * PDPL carries a **statutory** clock, which is the one kind of deadline
     * that is not ours to move. One request, inside its window today. If it
     * ever runs out it displaces `support-safety` for the nav's single visible
     * `attention` tone — see `fixtures/navCounts.ts`.
     */
    value: 1,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: false,
    sourceResource: null,
    drilldownRoute: '/admin/data',
  },

  /* ── Customer Support › Captain Fairness, view captain-economics ─────── */
  {
    key: 'support.fairness.earningsPerEngagedHour',
    subTabId: 'support-fairness',
    category: 'supply',
    /**
     * `renderCaptainEconomics` — earnings per *engaged* hour, not per shift.
     * The number that decides whether a captain stays, and the reason
     * `captain-economics` is a reading surface inside a queue-shaped sub-tab.
     */
    value: 4_180,
    unit: 'money',
    currency: 'SAR',
    asOf: EYVAR_NOW,
    periodStart: CURRENT_PERIOD.start,
    periodEnd: CURRENT_PERIOD.end,
    comparison: {
      kind: 'previous-period',
      value: 4_620,
      periodStart: PREVIOUS_PERIOD.start,
      periodEnd: PREVIOUS_PERIOD.end,
    },
    higherIsBetter: true,
    sourceResource: null,
    drilldownRoute: null,
  },
  {
    key: 'support.fairness.suspendedCaptains',
    subTabId: 'support-fairness',
    category: 'supply',
    /* `renderFairnessPage`'s third tile (`:15694`) — *"each may appeal"*. */
    value: null,
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    periodStart: null,
    periodEnd: null,
    comparison: { kind: 'none', reason: 'no-history' },
    higherIsBetter: false,
    sourceResource: 'drivers',
    drilldownRoute: '/operations/people?view=captains',
  },
]

/* ═══════════════════════════════ charts ════════════════════════════════ */

/**
 * Five of these exist to be the **no-data cases**, because "no data" is not one
 * state and an empty array standing in for all of them produces one screen
 * where four are needed:
 *
 *   `management.growth.newSubscriptions`   **no comparison period yet** —
 *      `comparison: null`. The line draws; the legend has one chip, not two;
 *      the tile's delta is an em-dash.
 *   `management.performance.onTimePickup`  **a gap in the middle** — 21 Jun is
 *      `null`. The line breaks and resumes. It does **not** dip to zero, and a
 *      chart that renders it as zero reports an outage as a collapse.
 *   `management.zones.failedRequests`      **the whole range is zero.** Every
 *      point is `0`, which is a real and good answer. It draws a flat line on
 *      the axis and must **not** show the no-data sentence.
 *   `support.overview.contactsPerThousandTrips`  **genuinely no data** —
 *      `points: []`. §3.7's centred sentence, card and title retained.
 *   `management.risk.openSignals`          a reading surface's series: current
 *      only, small integers, no comparison.
 */
export const timeSeriesFixtures: TimeSeries[] = [
  {
    /* The complete case: both windows, both populated. What §3.7's legend
       describes — solid current, dotted comparison, same hue. */
    key: 'management.overview.revenue',
    subTabId: 'management-overview',
    unit: 'money',
    currency: 'SAR',
    asOf: EYVAR_NOW,
    current: {
      periodStart: CURRENT_PERIOD.start,
      periodEnd: CURRENT_PERIOD.end,
      points: points(CURRENT_DAYS, [612_400, 588_100, 701_250, 664_900, 590_300, 631_800, 429_900]),
    },
    comparison: {
      periodStart: PREVIOUS_PERIOD.start,
      periodEnd: PREVIOUS_PERIOD.end,
      points: points(PREVIOUS_DAYS, [571_200, 549_800, 640_100, 618_450, 552_700, 601_200, 468_950]),
    },
    higherIsBetter: true,
  },
  {
    /**
     * **The gap.** 21 Jun is `null` — the telemetry pipeline dropped a day. A
     * break in the line, not a dip to the axis.
     */
    key: 'management.performance.onTimePickup',
    subTabId: 'management-performance',
    unit: 'percent',
    currency: null,
    asOf: EYVAR_NOW,
    current: {
      periodStart: CURRENT_PERIOD.start,
      periodEnd: CURRENT_PERIOD.end,
      points: points(CURRENT_DAYS, [93, 91, null, 88, 90, 92, 91]),
    },
    comparison: {
      periodStart: PREVIOUS_PERIOD.start,
      periodEnd: PREVIOUS_PERIOD.end,
      points: points(PREVIOUS_DAYS, [90, 89, 91, 92, 90, 88, 89]),
    },
    higherIsBetter: true,
  },
  {
    /** **No comparison period yet** — the first week of a metric's life. */
    key: 'management.growth.newSubscriptions',
    subTabId: 'management-growth',
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    current: {
      periodStart: CURRENT_PERIOD.start,
      periodEnd: CURRENT_PERIOD.end,
      points: points(CURRENT_DAYS, [4, 6, 3, 7, 5, 8, 2]),
    },
    comparison: null,
    higherIsBetter: true,
  },
  {
    /**
     * **The whole range is zero, and that is the good news.** No request failed
     * for want of a captain in Al Malaz all week. A flat line on the axis —
     * emphatically *not* the no-data sentence, which would tell an operator we
     * stopped measuring.
     */
    key: 'management.zones.failedRequests',
    subTabId: 'management-zones',
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    current: {
      periodStart: CURRENT_PERIOD.start,
      periodEnd: CURRENT_PERIOD.end,
      points: points(CURRENT_DAYS, [0, 0, 0, 0, 0, 0, 0]),
    },
    comparison: {
      periodStart: PREVIOUS_PERIOD.start,
      periodEnd: PREVIOUS_PERIOD.end,
      points: points(PREVIOUS_DAYS, [0, 1, 0, 0, 2, 0, 0]),
    },
    higherIsBetter: false,
  },
  {
    /**
     * **Genuinely no data.** `DB.contacts` is seeded empty (`:14719`), so there
     * is nothing to plot for any day in the range. §3.7: keep the card, the
     * title and the report link; one centred sentence in the plot area.
     */
    key: 'support.overview.contactsPerThousandTrips',
    subTabId: 'support-overview',
    unit: 'ratio',
    currency: null,
    asOf: EYVAR_NOW,
    current: { periodStart: CURRENT_PERIOD.start, periodEnd: CURRENT_PERIOD.end, points: [] },
    comparison: null,
    higherIsBetter: false,
  },
  {
    /* Risk & Signals reads; it does not queue (M1). Small integers, current
       only — the shape of a watchlist over time. */
    key: 'management.risk.openSignals',
    subTabId: 'management-risk',
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    current: {
      periodStart: CURRENT_PERIOD.start,
      periodEnd: CURRENT_PERIOD.end,
      points: points(CURRENT_DAYS, [4, 5, 5, 7, 6, 6, 6]),
    },
    comparison: null,
    higherIsBetter: false,
  },
  {
    key: 'operations.overview.completedTrips',
    subTabId: 'operations-overview',
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    current: {
      periodStart: CURRENT_PERIOD.start,
      periodEnd: CURRENT_PERIOD.end,
      points: points(CURRENT_DAYS, [58, 61, 47, 66, 59, 63, 21]),
    },
    comparison: {
      periodStart: PREVIOUS_PERIOD.start,
      periodEnd: PREVIOUS_PERIOD.end,
      points: points(PREVIOUS_DAYS, [54, 57, 50, 60, 55, 58, 44]),
    },
    higherIsBetter: true,
  },
  {
    key: 'admin.overview.activityEvents',
    subTabId: 'admin-overview',
    unit: 'count',
    currency: null,
    asOf: EYVAR_NOW,
    current: {
      periodStart: CURRENT_PERIOD.start,
      periodEnd: CURRENT_PERIOD.end,
      points: points(CURRENT_DAYS, [184, 201, 152, 199, 176, 188, 147]),
    },
    comparison: {
      periodStart: PREVIOUS_PERIOD.start,
      periodEnd: PREVIOUS_PERIOD.end,
      points: points(PREVIOUS_DAYS, [170, 192, 148, 187, 165, 179, 149]),
    },
    higherIsBetter: true,
  },
  {
    /* Captain economics over time — the trend that decides whether supply
       stays. Halalas per engaged hour. */
    key: 'support.fairness.earningsPerEngagedHour',
    subTabId: 'support-fairness',
    unit: 'money',
    currency: 'SAR',
    asOf: EYVAR_NOW,
    current: {
      periodStart: CURRENT_PERIOD.start,
      periodEnd: CURRENT_PERIOD.end,
      points: points(CURRENT_DAYS, [4_410, 4_260, 4_050, 4_190, 4_120, 4_230, 3_980]),
    },
    comparison: {
      periodStart: PREVIOUS_PERIOD.start,
      periodEnd: PREVIOUS_PERIOD.end,
      points: points(PREVIOUS_DAYS, [4_700, 4_640, 4_520, 4_610, 4_580, 4_660, 4_430]),
    },
    higherIsBetter: true,
  },
]
