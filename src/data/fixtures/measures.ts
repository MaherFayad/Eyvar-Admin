/**
 * The measure catalogue — fourteen measures and eleven dimensions.
 *
 * **Flat arrays of literals, on purpose.** Someone will need to hand-edit one of
 * these to reproduce a bug, and a clever factory is a fixture nobody can read.
 *
 * ## Every measure here declares a population, and that is the entry condition
 *
 * **R5-15**: *"`sourceResource` is required on an aggregate, and `null` means it
 * does not render."* `Measure.population` is non-nullable, so a measure that
 * cannot name one is not representable — the invariant is the type, not a test
 * over this array. That matters more here than on a board: every ad-hoc measure
 * an operator composes in the report builder is a new aggregate, and one that
 * cannot name its population is one that cannot be trusted or compared.
 *
 * **Nine measures that exist as board tiles today are deliberately absent**, for
 * exactly the reason `fixtures/metrics.ts` gives under R5-14: they are seeded
 * literals with no store behind them (`promoROI`, `promoBudgetConsumed`,
 * `subscriptionsFromPromos`, `referralAndIncentiveSpend`, `steerOffersLive`,
 * `erasureOverdue`, `rotaGaps`, `earningsPerEngagedHour`,
 * `churnPredictedSubscriptions`). Naming a resource on a value not derived from
 * it *"would make the check runnable **and false** — a worse failure than the
 * one the rule closes, because it looks audited."* They enter this catalogue
 * the day their store does.
 *
 * ## The two histories in this product, and why they are named separately
 *
 * There are exactly two places a number can come from over time:
 *
 * **1. Row-level stores** — `drivers`, `riders`, `subscriptions`, `trips`. Each
 * row carries a date, so a bucket is a real count of real rows and it
 * reconciles with the index table that serves the same rows.
 *
 * **2. `daily-snapshots`** — thirty daily rows, `2026-05-27` … `2026-06-25`
 * (`fixtures/dailySnapshots.ts:87`, `:116`). The only pre-aggregated history.
 *
 * **They do not agree about levels, and `fixtures/dailySnapshots.ts` says so at
 * the top:** the final snapshot row reads 10 riders, 7 captains and 6 active
 * subscriptions, while this data layer's fixtures hold 13 riders, 52 active
 * captains and 47 active subscriptions — *"the two datasets are an order of
 * magnitude apart"*. So **no measure below is sourced from both.** A stock is
 * taken from the row-level store where the rows carry enough to reconstruct it
 * honestly; a rate or a money total, which no row-level store can reconstruct,
 * is taken from the snapshots and its caption says so.
 *
 * That split is the whole point of declaring a population. Without it, two
 * operators comparing "active captains" would get 7 and 52 and both would be
 * reading a correctly-computed number.
 *
 * ## What a stock may be split by, and what it may not
 *
 * A cumulative stock reconstructed from `joinedAt` is honest, because
 * registration is monotone: a captain who joined in March had joined by April.
 * **Splitting that stock by `status` is not honest**, because it applies
 * today's status to every past bucket — a captain suspended yesterday would
 * appear suspended for all of last year. So mutable-state fields are absent
 * from `dimensions` on stock measures and present on flow measures, where the
 * row's state at the moment of the event is what is being counted.
 *
 * The same reasoning is why there is **no `captains.active` trend measure**: a
 * driver row carries no status history, so "how many were active on 3 June" is
 * not computable from `drivers` and would be a confidently wrong chart. The
 * snapshot's `drivers` column answers it over a different population, at a
 * different order of magnitude, and merging the two would be the defect this
 * file exists to prevent.
 */

import type { Dimension, Measure } from '../types/measure'

/* ───────────────────────────── dimensions ──────────────────────────────── */

/**
 * Keys are `<resource>.<field>`, and so are `Measure.filterableFields`.
 *
 * **The namespace is load-bearing, not decoration.** `FilterSpec.field` is a
 * bare string, and `subscriptions` and `trips` both have a field called
 * `status` whose vocabularies are unrelated. Un-namespaced, the intersection
 * §3.4 computes for a two-measure query would contain `status` and a filter
 * chosen from one measure's vocabulary would be applied to the other. Namespaced,
 * *"the intersection is empty for a two-measure query across two resources,
 * and that is the correct behaviour, not a bug"* — AC-813 becomes true by
 * construction rather than by hoping the field names differ.
 */
export const dimensionFixtures: Dimension[] = [
  { key: 'subscription.plan', labelKey: 'rb.dim.subscription.plan', resource: 'subscriptions', field: 'planKey', cardinalityHint: 3 },
  { key: 'subscription.vehicleClass', labelKey: 'rb.dim.subscription.vehicleClass', resource: 'subscriptions', field: 'vehicleClass', cardinalityHint: 2 },
  { key: 'subscription.status', labelKey: 'rb.dim.subscription.status', resource: 'subscriptions', field: 'status', cardinalityHint: 6 },
  { key: 'trip.kind', labelKey: 'rb.dim.trip.kind', resource: 'trips', field: 'kind', cardinalityHint: 2 },
  { key: 'trip.status', labelKey: 'rb.dim.trip.status', resource: 'trips', field: 'status', cardinalityHint: 8 },
  /* Twelve districts in the trip fixtures. The one dimension that trips §7.4's
     eight-group fold, so `groups-folded` is reachable without hand-editing. */
  { key: 'trip.pickup', labelKey: 'rb.dim.trip.pickup', resource: 'trips', field: 'pickup', cardinalityHint: 12 },
  { key: 'driver.city', labelKey: 'rb.dim.driver.city', resource: 'drivers', field: 'city', cardinalityHint: 2 },
  { key: 'driver.vehicleClass', labelKey: 'rb.dim.driver.vehicleClass', resource: 'drivers', field: 'vehicleClass', cardinalityHint: 2 },
  { key: 'driver.status', labelKey: 'rb.dim.driver.status', resource: 'drivers', field: 'status', cardinalityHint: 4 },
  /* Every seeded rider is in Riyadh. A split producing exactly one series is a
     real answer and the screen must not treat it as an empty. */
  { key: 'rider.city', labelKey: 'rb.dim.rider.city', resource: 'riders', field: 'city', cardinalityHint: 1 },
  { key: 'rider.status', labelKey: 'rb.dim.rider.status', resource: 'riders', field: 'status', cardinalityHint: 2 },
]

/* ─────────────────── coverage, declared once and cited ─────────────────── */

/**
 * How far back each store runs. **Declared, never derived from the rows
 * present** — `max(row.date)` cannot tell a store that ends early from a store
 * with a hole in the middle, and that inference is the seed-shaped predicate
 * R5-15 forbids.
 *
 * Outside these bounds every point is `null` — a gap, never a zero (§4.4.1).
 */
const COVERAGE = {
  /** `fixtures/dailySnapshots.ts:87` … `:116`. Thirty consecutive daily rows. */
  snapshots: { from: '2026-05-27', to: '2026-06-25' },
  /** Earliest `joinedAt` in `fixtures/drivers.ts`. */
  drivers: { from: '2024-11-01', to: '2026-06-25' },
  /** Earliest `joinedAt` in `fixtures/riders.ts`. */
  riders: { from: '2025-11-01', to: '2026-06-25' },
  /** Earliest `startedOn` across `allSubscriptionFixtures`. */
  subscriptions: { from: '2026-06-01', to: '2026-06-25' },
  /** `fillerTrips` reaches 45 days back from the fixed clock. */
  trips: { from: '2026-05-11', to: '2026-06-25' },
} as const

/* ──────────────────────────── the catalogue ────────────────────────────── */

export const measureFixtures: Measure[] = [
  /* ── stocks, count. The owner's headline example lives here. ──────────── */
  {
    key: 'captains.registered',
    labelKey: 'rb.measure.captains.registered',
    category: 'supply',
    population: {
      resource: 'drivers',
      predicate: [],
      predicateKey: 'rb.pop.drivers.all',
      timeField: 'joinedAt',
      valueField: null,
      coverage: COVERAGE.drivers,
    },
    temporality: 'stock',
    bucketAggregate: 'cumulative-count',
    additive: false,
    unit: 'count',
    currency: null,
    higherIsBetter: true,
    minGrain: 'day',
    /* `driver.status` is deliberately absent — see the file header. */
    dimensions: [
      { key: 'driver.city', cardinalityHint: 2 },
      { key: 'driver.vehicleClass', cardinalityHint: 2 },
    ],
    filterableFields: ['driver.city', 'driver.vehicleClass', 'driver.status'],
    permission: null,
    captionKey: 'rb.caption.captains.registered',
    /* No tile shows *registered* captains; `management.overview.activeCaptains`
       is a different population (active only). Listing it would make R5-14's
       cross-check runnable and false. */
    displayedAsMetricKeys: [],
  },
  {
    key: 'riders.registered',
    labelKey: 'rb.measure.riders.registered',
    category: 'demand',
    population: {
      resource: 'riders',
      predicate: [],
      predicateKey: 'rb.pop.riders.all',
      timeField: 'joinedAt',
      valueField: null,
      coverage: COVERAGE.riders,
    },
    temporality: 'stock',
    bucketAggregate: 'cumulative-count',
    additive: false,
    unit: 'count',
    currency: null,
    higherIsBetter: true,
    minGrain: 'day',
    dimensions: [{ key: 'rider.city', cardinalityHint: 1 }],
    filterableFields: ['rider.city', 'rider.status'],
    permission: null,
    captionKey: null,
    /* Same population and same predicate as the Growth tile: every rider row. */
    displayedAsMetricKeys: ['management.growth.registeredRiders'],
  },
  {
    key: 'subscriptions.active',
    labelKey: 'rb.measure.subscriptions.active',
    category: 'subscriptions',
    population: {
      resource: 'subscriptions',
      /* Live as at the bucket's last instant: started, not yet cancelled, not
         yet ended. Reconstructable from three dates on the row, which is what
         makes this stock honest where `captains.active` is not. */
      predicate: [],
      predicateKey: 'rb.pop.subscriptions.liveAtInstant',
      timeField: 'startedOn',
      valueField: null,
      coverage: COVERAGE.subscriptions,
    },
    temporality: 'stock',
    bucketAggregate: 'end-of-period',
    additive: false,
    unit: 'count',
    currency: null,
    higherIsBetter: true,
    minGrain: 'day',
    dimensions: [
      { key: 'subscription.plan', cardinalityHint: 3 },
      { key: 'subscription.vehicleClass', cardinalityHint: 2 },
    ],
    filterableFields: ['subscription.plan', 'subscription.vehicleClass'],
    permission: null,
    captionKey: 'rb.caption.subscriptions.active',
    displayedAsMetricKeys: ['management.overview.activeSubscriptions'],
  },

  /* ── flows, count ─────────────────────────────────────────────────────── */
  {
    key: 'captains.joined',
    labelKey: 'rb.measure.captains.joined',
    category: 'supply',
    population: {
      resource: 'drivers',
      predicate: [],
      predicateKey: 'rb.pop.drivers.all',
      timeField: 'joinedAt',
      valueField: null,
      coverage: COVERAGE.drivers,
    },
    temporality: 'flow',
    bucketAggregate: 'count',
    additive: true,
    unit: 'count',
    currency: null,
    higherIsBetter: true,
    minGrain: 'day',
    dimensions: [
      { key: 'driver.city', cardinalityHint: 2 },
      { key: 'driver.vehicleClass', cardinalityHint: 2 },
      { key: 'driver.status', cardinalityHint: 4 },
    ],
    filterableFields: ['driver.city', 'driver.vehicleClass', 'driver.status'],
    permission: null,
    captionKey: null,
    displayedAsMetricKeys: [],
  },
  {
    key: 'riders.joined',
    labelKey: 'rb.measure.riders.joined',
    category: 'demand',
    population: {
      resource: 'riders',
      predicate: [],
      predicateKey: 'rb.pop.riders.all',
      timeField: 'joinedAt',
      valueField: null,
      coverage: COVERAGE.riders,
    },
    temporality: 'flow',
    bucketAggregate: 'count',
    additive: true,
    unit: 'count',
    currency: null,
    higherIsBetter: true,
    minGrain: 'day',
    dimensions: [
      { key: 'rider.city', cardinalityHint: 1 },
      { key: 'rider.status', cardinalityHint: 2 },
    ],
    filterableFields: ['rider.city', 'rider.status'],
    permission: null,
    captionKey: null,
    displayedAsMetricKeys: ['management.growth.newRiders'],
  },
  {
    key: 'subscriptions.started',
    labelKey: 'rb.measure.subscriptions.started',
    category: 'subscriptions',
    population: {
      resource: 'subscriptions',
      predicate: [],
      predicateKey: 'rb.pop.subscriptions.all',
      timeField: 'startedOn',
      valueField: null,
      coverage: COVERAGE.subscriptions,
    },
    temporality: 'flow',
    bucketAggregate: 'count',
    /* Additive, three plan values — the one measure that makes a pie legal
       under §7.2's five gates, so AC-838 is reachable. */
    additive: true,
    unit: 'count',
    currency: null,
    higherIsBetter: true,
    minGrain: 'day',
    dimensions: [
      { key: 'subscription.plan', cardinalityHint: 3 },
      { key: 'subscription.vehicleClass', cardinalityHint: 2 },
      { key: 'subscription.status', cardinalityHint: 6 },
    ],
    filterableFields: ['subscription.plan', 'subscription.vehicleClass', 'subscription.status'],
    permission: null,
    captionKey: null,
    displayedAsMetricKeys: ['management.growth.newSubscriptions'],
  },
  {
    key: 'subscriptions.cancelled',
    labelKey: 'rb.measure.subscriptions.cancelled',
    category: 'subscriptions',
    population: {
      resource: 'subscriptions',
      predicate: [{ field: 'subscription.cancelledAt', op: 'isNotNull', value: null }],
      predicateKey: 'rb.pop.subscriptions.cancelled',
      /* `cancelledAt`, never `startedOn`. The measure is *when it ended*. */
      timeField: 'cancelledAt',
      valueField: null,
      coverage: COVERAGE.subscriptions,
    },
    temporality: 'flow',
    bucketAggregate: 'count',
    additive: true,
    unit: 'count',
    currency: null,
    higherIsBetter: false,
    minGrain: 'day',
    dimensions: [
      { key: 'subscription.plan', cardinalityHint: 3 },
      { key: 'subscription.vehicleClass', cardinalityHint: 2 },
    ],
    filterableFields: ['subscription.plan', 'subscription.vehicleClass'],
    permission: null,
    captionKey: null,
    displayedAsMetricKeys: [],
  },
  {
    key: 'trips.completed',
    labelKey: 'rb.measure.trips.completed',
    category: 'service',
    population: {
      resource: 'trips',
      predicate: [{ field: 'trip.status', op: 'eq', value: 'done' }],
      predicateKey: 'rb.pop.trips.completed',
      /* `clients/metrics.ts` already carries this exact sentence: trips that
         **finished** inside the window — `endedAt`, never `startedAt`. */
      timeField: 'endedAt',
      valueField: null,
      coverage: COVERAGE.trips,
    },
    temporality: 'flow',
    bucketAggregate: 'count',
    additive: true,
    unit: 'count',
    currency: null,
    higherIsBetter: true,
    minGrain: 'day',
    dimensions: [
      { key: 'trip.kind', cardinalityHint: 2 },
      { key: 'trip.pickup', cardinalityHint: 12 },
    ],
    filterableFields: ['trip.kind', 'trip.status', 'trip.pickup'],
    permission: null,
    captionKey: 'rb.caption.trips.completed',
    displayedAsMetricKeys: ['management.performance.tripsCompleted', 'operations.overview.completedTrips'],
  },
  {
    key: 'trips.quickRides',
    labelKey: 'rb.measure.trips.quickRides',
    category: 'demand',
    population: {
      resource: 'daily-snapshots',
      predicate: [],
      predicateKey: 'rb.pop.snapshot.daily',
      timeField: 'date',
      valueField: 'quickRides',
      coverage: COVERAGE.snapshots,
    },
    temporality: 'flow',
    bucketAggregate: 'sum',
    additive: true,
    unit: 'count',
    currency: null,
    higherIsBetter: true,
    minGrain: 'day',
    /* A snapshot row has no city, no plan and no district. Empty is the honest
       answer and it is what stops the split-by picker offering `city` on a
       measure with no geography (§4.1 F-3). */
    dimensions: [],
    filterableFields: [],
    permission: null,
    captionKey: 'rb.caption.snapshot.base',
    displayedAsMetricKeys: [],
  },

  /* ── flows, money. Halalas on the wire, SAR in the field. ─────────────── */
  {
    key: 'trips.fareCollected',
    labelKey: 'rb.measure.trips.fareCollected',
    category: 'revenue',
    population: {
      resource: 'trips',
      predicate: [{ field: 'trip.status', op: 'eq', value: 'done' }],
      predicateKey: 'rb.pop.trips.completed',
      timeField: 'endedAt',
      valueField: 'fareHalalas',
      coverage: COVERAGE.trips,
    },
    temporality: 'flow',
    bucketAggregate: 'sum',
    /* G1 (`02-report-builder-v2.md` §2.1): one row per trip, so both are
       honest — `sum` is the fare collected in the bucket, `mean` is the
       average fare per completed ride. The first genuinely multi-option
       measure in this catalogue; the `Measured as` control has nothing to
       show until at least one exists. */
    bucketAggregateOptions: ['sum', 'mean'],
    additive: true,
    unit: 'money',
    currency: 'SAR',
    higherIsBetter: true,
    minGrain: 'day',
    dimensions: [
      { key: 'trip.kind', cardinalityHint: 2 },
      { key: 'trip.pickup', cardinalityHint: 12 },
    ],
    filterableFields: ['trip.kind', 'trip.status', 'trip.pickup'],
    /* The four money measures are the only ones with a permission today. D4 is
       open; `view_finance` is a key that already exists, so nothing is invented
       to fill the gap, and switching to USR-3 (Support) makes §13.1's blocked
       series reachable now. */
    permission: { key: 'view_finance', level: 'read' },
    captionKey: null,
    displayedAsMetricKeys: [],
  },
  {
    key: 'revenue.total',
    labelKey: 'rb.measure.revenue.total',
    category: 'revenue',
    population: {
      resource: 'daily-snapshots',
      predicate: [],
      predicateKey: 'rb.pop.snapshot.daily',
      timeField: 'date',
      valueField: 'totalRevenueHalalas',
      coverage: COVERAGE.snapshots,
    },
    temporality: 'flow',
    bucketAggregate: 'sum',
    /* G1: one row per day, so `sum` is the period's total revenue and `mean`
       is the average daily revenue — both honest reads of the same rows at
       any grain coarser than a day. The second multi-option measure, deliberately
       a snapshot-sourced one rather than a second row-level pick (WP-2.6b). */
    bucketAggregateOptions: ['sum', 'mean'],
    additive: true,
    unit: 'money',
    currency: 'SAR',
    higherIsBetter: true,
    minGrain: 'day',
    dimensions: [],
    filterableFields: [],
    permission: { key: 'view_finance', level: 'read' },
    captionKey: 'rb.caption.snapshot.base',
    displayedAsMetricKeys: ['management.overview.grossRevenue'],
  },
  {
    key: 'revenue.quickRide',
    labelKey: 'rb.measure.revenue.quickRide',
    category: 'revenue',
    population: {
      resource: 'daily-snapshots',
      predicate: [],
      predicateKey: 'rb.pop.snapshot.daily',
      timeField: 'date',
      valueField: 'quickRideRevenueHalalas',
      coverage: COVERAGE.snapshots,
    },
    temporality: 'flow',
    bucketAggregate: 'sum',
    additive: true,
    unit: 'money',
    currency: 'SAR',
    higherIsBetter: true,
    minGrain: 'day',
    dimensions: [],
    filterableFields: [],
    permission: { key: 'view_finance', level: 'read' },
    captionKey: 'rb.caption.snapshot.base',
    displayedAsMetricKeys: ['management.overview.quickRideRevenue'],
  },
  {
    key: 'revenue.subscription',
    labelKey: 'rb.measure.revenue.subscription',
    category: 'revenue',
    population: {
      resource: 'daily-snapshots',
      predicate: [],
      predicateKey: 'rb.pop.snapshot.daily',
      timeField: 'date',
      valueField: 'subRevenueHalalas',
      coverage: COVERAGE.snapshots,
    },
    temporality: 'flow',
    bucketAggregate: 'sum',
    additive: true,
    unit: 'money',
    currency: 'SAR',
    higherIsBetter: true,
    minGrain: 'day',
    dimensions: [],
    filterableFields: [],
    permission: { key: 'view_finance', level: 'read' },
    captionKey: 'rb.caption.snapshot.base',
    displayedAsMetricKeys: ['management.overview.subscriptionRevenue'],
  },
  {
    key: 'requests.timeToAssign',
    labelKey: 'rb.measure.requests.timeToAssign',
    category: 'service',
    population: {
      resource: 'trips',
      predicate: [],
      predicateKey: 'rb.pop.trips.completed',
      timeField: 'endedAt',
      valueField: null,
      coverage: COVERAGE.trips,
    },
    temporality: 'flow',
    bucketAggregate: 'mean',
    additive: false,
    unit: 'minutes',
    currency: null,
    higherIsBetter: false,
    minGrain: 'day',
    dimensions: [],
    filterableFields: [],
    permission: null,
    captionKey: 'rb.caption.requests.timeToAssign',
    displayedAsMetricKeys: ['operations.overview.medianTimeToAssign'],
  },
  {
    key: 'riders.activated',
    labelKey: 'rb.measure.riders.activated',
    category: 'demand',
    population: {
      resource: 'riders',
      predicate: [],
      predicateKey: 'rb.pop.riders.all',
      timeField: 'joinedAt',
      valueField: null,
      coverage: COVERAGE.riders,
    },
    temporality: 'stock',
    bucketAggregate: 'cumulative-count',
    additive: false,
    unit: 'count',
    currency: null,
    higherIsBetter: true,
    minGrain: 'day',
    dimensions: [{ key: 'rider.city', cardinalityHint: 1 }],
    filterableFields: ['rider.city', 'rider.status'],
    permission: null,
    captionKey: 'rb.caption.riders.activated',
    displayedAsMetricKeys: ['management.growth.activationRate7d'],
  },
  {
    key: 'financials.arpa',
    labelKey: 'rb.measure.financials.arpa',
    category: 'revenue',
    population: {
      resource: 'daily-snapshots',
      predicate: [],
      predicateKey: 'rb.pop.snapshot.daily',
      timeField: 'date',
      valueField: 'subRevenueHalalas',
      coverage: COVERAGE.snapshots,
    },
    temporality: 'flow',
    bucketAggregate: 'mean',
    additive: false,
    unit: 'money',
    currency: 'SAR',
    higherIsBetter: true,
    minGrain: 'day',
    dimensions: [],
    filterableFields: [],
    permission: { key: 'view_finance', level: 'read' },
    captionKey: 'rb.caption.financials.arpa',
    displayedAsMetricKeys: ['management.overview.arpa'],
  },

  /* ── a rate. Never additive, and a pie is illegal against it always. ──── */
  {
    key: 'trips.cancellationRate',
    labelKey: 'rb.measure.trips.cancellationRate',
    category: 'service',
    population: {
      resource: 'daily-snapshots',
      predicate: [],
      predicateKey: 'rb.pop.snapshot.daily',
      timeField: 'date',
      valueField: 'cancelRatePct',
      coverage: COVERAGE.snapshots,
    },
    temporality: 'flow',
    /* A rate is meaned across buckets, never summed. §6.2 rule 2's "otherwise
       the catalogue's declared aggregate" is this field. */
    bucketAggregate: 'mean',
    additive: false,
    unit: 'percent',
    currency: null,
    higherIsBetter: false,
    minGrain: 'day',
    dimensions: [],
    filterableFields: [],
    permission: null,
    /* The one snapshot field that is level-independent: 3–9 % is as true of 47
       subscriptions as of 6. `fixtures/dailySnapshots.ts` calls it "the
       exception and the valuable one". */
    captionKey: 'rb.caption.trips.cancellationRate',
    displayedAsMetricKeys: ['management.performance.cancellationRate'],
  },
]

/** Lookup, built once. Boring on purpose. */
export const measuresByKey: Record<string, Measure> = Object.fromEntries(
  measureFixtures.map((m) => [m.key, m]),
)

export const dimensionsByKey: Record<string, Dimension> = Object.fromEntries(
  dimensionFixtures.map((d) => [d.key, d]),
)
