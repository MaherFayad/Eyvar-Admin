/**
 * Saved reports and dashboards — §11 of the v1 spec, §2/§8 of
 * `02-report-builder-v2.md`.
 *
 * ## These persist nowhere, and that is not an accident
 *
 * **Q1 is open.** The mock clients keep a mutable copy of these arrays exactly
 * as `clients/notifications.ts` keeps its `rows`, so a save is observable
 * within a session and gone on reload. **That is not a storage adapter and does
 * not answer Q1** — `lib/persistence.ts` is explicit that shipping a
 * `localStorage` adapter would be *"answering Q1 by writing code"*. §9.1 states
 * what each artifact degrades to without it, and the composed query degrades to
 * nothing at all, because §9.2 makes the URL its storage.
 *
 * ## v2 migration (D42, WP-1.8)
 *
 * Every query below is written in the v2 shape directly: `groupBy` is always
 * an array, `funnel`/`cohort` carry every v2 field. `normaliseReportQuery`
 * still accepts the v1 shapes — `serialise.v1.fixtures.ts` (WP-1.5) is where
 * those live — but a fixture typed `ReportQuery` has to satisfy the v2 type to
 * compile, and F-V2-9 already logged that ten queries is thin for a library
 * screen. `RPT-10` … `RPT-19` below are new, one per v2 control this file did
 * not previously exercise. **Alert rules and firings moved to `alerts.ts`**
 * (D42 split `AlertRule` out of this module's concerns); `ALR_1_ROUTE` stays
 * here because it is derived from `cancellationTrend`, a query this file owns.
 *
 * ## The seeded set, and which state each one exists to reach
 *
 * | Fixture | State it makes reachable |
 * |---|---|
 * | `RPT-1` two stock measures | the owner's headline example, as two panels |
 * | `RPT-2` a split by district | §7.4's fold — twelve groups, eight named plus `Other` |
 * | `RPT-3` money, 90 days | a mostly-gap window **and** a series a Support operator may not see |
 * | `RPT-4` pinned to two dashboards | §11.3's refused delete, with both dashboards named |
 * | `RPT-5` an Arabic name | AC-898 — user content, never translated, correct direction inside an English UI |
 * | `RPT-6` a three-rung funnel | `mode: 'funnel'`, with a filter on one rung only |
 * | `RPT-7` monthly cohorts, `M0…M3` | `mode: 'cohort'`, over a window long enough to reach `M3` |
 * | `RPT-8` a journey rooted at signup | `mode: 'journey'`, and `mode-not-resolved` on the wire |
 * | `RPT-9` a daily data table | `mode: 'table'` — a real grain and a real split, unlike the other three |
 * | `RPT-10` a formula | G2 — `A / B * 100`, a percent-of-count formula |
 * | `RPT-11` two saved segments | G5 — `segments`, compared side by side on one measure |
 * | `RPT-12` two-level split | G4 — `groupBy` of two dimensions, drawn as a table |
 * | `RPT-13` a fixed comparison | G6 — `periodComparison: { kind: 'fixed' }`, equal bucket counts, `percent-change` display |
 * | `RPT-14` `area` | G8 |
 * | `RPT-15` `stacked-bar` | G8 |
 * | `RPT-16` `stacked-100` | G8 |
 * | `RPT-17` `horizontal-bar` | G8 |
 * | `RPT-18` `kpi` | G8 |
 * | `RPT-19` money over count | G2, WP-1.4b — `A / B`, a currency measure over a count one |
 * | `oneRungFunnel` (not saved) | AC-825's hand-edited URL: legal to link, refused when planned |
 * | `DSH-1` three tiles, the first `span: 'full'` | a rendered dashboard, and §C5's hero-over-grid layout |
 * | `DSH-2` no tiles | §11.4's first-run empty *for that dashboard* |
 * | `DSH-3` a dangling `reportId` | §11.3's missing tile, which cannot be created through the UI |
 * | `DSH-3` `range` + `filters` | §C4's board scope: one tile answering the board's window, one refusing it, one filter one tile takes and one it cannot |
 *
 * `DSH-1` … `DSH-3` also migrate through `dashboardToPage` into `pages.ts`'s
 * `pageFixtures` at load — see that file.
 */

import { EYVAR_NOW, offsetFromNow } from '../mock/clock'
import { reportQueryPath } from '../reporting/serialise'
import type { Dashboard, ReportQuery, SavedReport } from '../types/report'

/* ─────────────────────────── the queries ───────────────────────────────── */

/**
 * The business owner's own example: *"number of drivers vs passengers trend"*.
 *
 * Both stock, both count, so §6.2 lets them into one query — and they render as
 * **two panels**, because R4-1 §1.2(c) measured what a shared axis does to
 * them: they differ by an order of magnitude by construction, so one line is a
 * flat trace and its trend, the thing the owner asked to see, is invisible.
 */
const captainsVsRiders: ReportQuery = {
  measures: [{ key: 'captains.registered' }, { key: 'riders.registered' }],
  groupBy: [],
  filters: [],
  window: { kind: 'preset', preset: 'last-30d' },
  grain: 'day',
  periodComparison: 'none',
  chartType: 'line',
}

const tripsByDistrict: ReportQuery = {
  measures: [{ key: 'trips.completed' }],
  groupBy: ['trip.pickup'],
  filters: [],
  window: { kind: 'preset', preset: 'last-30d' },
  grain: 'week',
  periodComparison: 'none',
  chartType: 'line',
}

const revenueNinetyDays: ReportQuery = {
  measures: [{ key: 'revenue.total' }],
  groupBy: [],
  filters: [],
  /* Ninety days over a store that holds thirty. Sixty buckets of `null`, and
     `gaps-outside-fixture-range` on the wire saying so. */
  window: { kind: 'preset', preset: 'last-90d' },
  grain: 'day',
  periodComparison: 'previous-period',
  chartType: 'line',
}

const subscriptionsByPlan: ReportQuery = {
  measures: [{ key: 'subscriptions.started' }],
  groupBy: ['subscription.plan'],
  filters: [],
  window: { kind: 'preset', preset: 'last-30d' },
  /* The one shape that makes a pie legal: one measure, a split, a single
     period, an additive measure and three parts (§7.2, AC-838). */
  grain: 'none',
  periodComparison: 'none',
  chartType: 'pie',
}

/** User content (RPT-5), Arabic, never translated — AC-898. */
const cancellationTrend: ReportQuery = {
  measures: [{ key: 'trips.cancellationRate' }],
  groupBy: [],
  filters: [],
  window: { kind: 'preset', preset: 'last-30d' },
  grain: 'day',
  periodComparison: 'none',
  chartType: 'line',
}

/* ───────────────── the four modes that are not `trend` ─────────────────── */

/**
 * A funnel over the one subject that crosses all three stores: a rider joins,
 * takes a trip, buys a subscription. Three rungs, ordered, no duplicate.
 *
 * Query-level `filters` is empty and has to be: `planQuery` intersects the
 * filterable fields of every step, and `rider.*`, `trip.*` and
 * `subscription.*` share none. A filter that applied to one rung and not the
 * others would be the §3.4 failure, so the plan refuses it rather than the
 * fixture pretending otherwise. Per-step filters are where a funnel narrows.
 */
const riderActivationFunnel: ReportQuery = {
  measures: [],
  groupBy: [],
  filters: [],
  window: { kind: 'preset', preset: 'last-90d' },
  /* A funnel has no calendar x-axis, so the window collapses to one period.
     `planQuery` disables every other grain with the reason. */
  grain: 'none',
  periodComparison: 'none',
  chartType: 'bar',
  mode: 'funnel',
  funnel: {
    steps: [
      { measureKey: 'riders.joined', filters: [] },
      /* Narrowed at the rung, not at the query: *joined anywhere, then took a
         Quick Ride*. This is the shape a query-level filter cannot express. */
      { measureKey: 'trips.completed', filters: [{ field: 'trip.kind', op: 'eq', value: 'quick' }] },
      { measureKey: 'subscriptions.started', filters: [] },
    ],
    /* Unset, so the funnel's window is the report's window. No conversion
       window has been specified by the business and none is invented (AC-453). */
    conversionWindow: null,
    mode: 'ordered',
    holdConstant: null,
    exclude: [],
    measuredAs: 'conversion',
    groupBy: null,
  },
}

/**
 * Monthly rider cohorts, four columns — `M0 … M3`.
 *
 * `last-365d` rather than `last-30d` on purpose: `M3` needs four calendar
 * months in the window, and a 30-day window holds one. `planQuery` refuses the
 * short version with `cohort-window-too-short`, which is a state QA reaches by
 * changing this one preset.
 */
const riderRetentionCohort: ReportQuery = {
  measures: [],
  groupBy: [],
  filters: [],
  window: { kind: 'preset', preset: 'last-365d' },
  grain: 'none',
  periodComparison: 'none',
  chartType: 'table',
  mode: 'cohort',
  cohort: {
    anchorMeasureKey: 'riders.joined',
    /* `[]`: *still here* means the anchor subject's own activity, which is
       what `buildCohortMatrix`'s `getLastActiveAt` reads. A return event
       distinct from the anchor is legal in the type and unused here. */
    returnMeasureKeys: [],
    /* The only grain the retention engine measures age at. `day` and `week`
       are offered by the picker and disabled with the reason (`CohortGrain`). */
    cohortGrain: 'month',
    method: 'rolling',
    brackets: null,
    horizon: 3,
  },
}

/** A journey rooted at the rider signup, two steps forward. */
const riderJourney: ReportQuery = {
  measures: [],
  groupBy: [],
  filters: [],
  window: { kind: 'preset', preset: 'last-90d' },
  grain: 'none',
  periodComparison: 'none',
  chartType: 'table',
  mode: 'journey',
  journey: { rootMeasureKey: 'riders.joined', depth: 2 },
}

/**
 * `table` mode — the same question `tripsByDistrict` asks, listed instead of
 * drawn. It keeps a real grain and a real split, because that is the whole
 * difference between `table` and the three modes that collapse the window.
 */
const tripsByDistrictTable: ReportQuery = {
  measures: [{ key: 'trips.completed' }],
  groupBy: ['trip.pickup'],
  filters: [],
  window: { kind: 'preset', preset: 'last-30d' },
  grain: 'day',
  periodComparison: 'none',
  chartType: 'table',
  mode: 'table',
}

/**
 * **Deliberately illegal, and deliberately not a `SavedReport`.**
 *
 * A funnel with one rung is a number, not a funnel, and `planQuery` returns
 * `funnel-needs-steps` for it. It is exported as a bare query rather than
 * seeded into the library because §4.2 refuses to save a query with
 * violations, so a seeded illegal `SavedReport` would contradict the rule it
 * exists to demonstrate.
 *
 * The path it does exist for is the one AC-825 names: a **hand-edited URL**.
 * `reportQueryPath(oneRungFunnel)` produces a link that parses, plans, and
 * comes back refused with the reason beside the funnel control — which is the
 * only way to reach that state without editing a fixture.
 */
export const oneRungFunnel: ReportQuery = {
  measures: [],
  groupBy: [],
  filters: [],
  window: { kind: 'preset', preset: 'last-30d' },
  grain: 'none',
  periodComparison: 'none',
  chartType: 'bar',
  mode: 'funnel',
  funnel: {
    steps: [{ measureKey: 'riders.joined', filters: [] }],
    conversionWindow: null,
    mode: 'ordered',
    holdConstant: null,
    exclude: [],
    measuredAs: 'conversion',
    groupBy: null,
  },
}

/* ───────────────────────── v2 queries (WP-1.8) ──────────────────────────── */

/** G2 — percent-of-count (02 §2.2); `revenuePerCompletedTrip` below is the
 * money-over-count shape. `mode` is explicit, unlike the five pre-P7-T1
 * reports `serialise.test.ts` pins to an exact mode-less count (AC-1101). */
const quickRideShareOfTrips: ReportQuery = {
  measures: [{ key: 'trips.quickRides' }, { key: 'trips.completed' }],
  formula: { expression: 'A / B * 100', label: 'Quick rides as a share of completed trips' },
  groupBy: [],
  filters: [],
  window: { kind: 'preset', preset: 'last-30d' },
  grain: 'day',
  periodComparison: 'none',
  chartType: 'line',
  mode: 'trend',
}

/**
 * WP-1.4b — a genuine money-over-count formula: `A` is `revenue.total`
 * (`money`, `SAR`), `B` is `trips.completed` (`count`). The raw pair disagrees
 * on unit and would refuse under §6.2 alone; `formulaUnit` (`formula.ts`) is
 * what legalises `A / B` here, resolving to one `ratio` series — SAR per trip.
 */
const revenuePerCompletedTrip: ReportQuery = {
  measures: [{ key: 'revenue.total' }, { key: 'trips.completed' }],
  formula: { expression: 'A / B', label: 'Revenue per completed trip' },
  groupBy: [],
  filters: [],
  window: { kind: 'preset', preset: 'last-30d' },
  grain: 'day',
  periodComparison: 'none',
  chartType: 'line',
  mode: 'trend',
}

/** G5 — two saved segments (`segments.ts`) compared on one measure, unsplit. */
const tripsQuickVsSubscription: ReportQuery = {
  measures: [{ key: 'trips.completed' }],
  groupBy: [],
  segments: [
    { kind: 'saved', id: 'SEG-1' },
    { kind: 'saved', id: 'SEG-2' },
  ],
  filters: [],
  window: { kind: 'preset', preset: 'last-30d' },
  grain: 'day',
  periodComparison: 'none',
  chartType: 'line',
  mode: 'trend',
}

/** G4 — two dimensions, the legal ceiling. Line and bar are disabled at this depth; a table is always legal. */
const tripsByPickupAndKind: ReportQuery = {
  measures: [{ key: 'trips.completed' }],
  groupBy: ['trip.pickup', 'trip.kind'],
  filters: [],
  window: { kind: 'preset', preset: 'last-30d' },
  grain: 'week',
  periodComparison: 'none',
  chartType: 'table',
  mode: 'trend',
}

/**
 * G6 — a fixed window compared against another fixed window, same bucket
 * count (seven days each) so the planner does not refuse it. Launch week
 * against the most recent week, drawn as a percentage change.
 */
const subscriptionsLaunchWeekVsNow: ReportQuery = {
  measures: [{ key: 'subscriptions.started' }],
  groupBy: [],
  filters: [],
  window: { kind: 'preset', preset: 'last-7d' },
  grain: 'day',
  periodComparison: { kind: 'fixed', from: '2026-06-01', to: '2026-06-07' },
  comparisonDisplay: 'percent-change',
  chartType: 'line',
  mode: 'trend',
}

/** G8 — `area`. One measure, a stock, so the fill reads as a level rather than a flow. */
const activeSubscriptionsArea: ReportQuery = {
  measures: [{ key: 'subscriptions.active' }],
  groupBy: [],
  filters: [],
  window: { kind: 'preset', preset: 'last-30d' },
  grain: 'day',
  periodComparison: 'none',
  chartType: 'area',
  mode: 'trend',
}

/** G8 — `stacked-bar`. Additive, one level, inside `subscriptions`' own 25-day coverage with a real partial-first edge. */
const subscriptionsByPlanStacked: ReportQuery = {
  measures: [{ key: 'subscriptions.started' }],
  groupBy: ['subscription.plan'],
  filters: [],
  window: { kind: 'preset', preset: 'last-30d' },
  grain: 'week',
  periodComparison: 'none',
  chartType: 'stacked-bar',
  mode: 'trend',
}

/** G8 — `stacked-100`. Six status values normalise to a share of each week's starts. */
const subscriptionsByStatusShare: ReportQuery = {
  measures: [{ key: 'subscriptions.started' }],
  groupBy: ['subscription.status'],
  filters: [],
  window: { kind: 'preset', preset: 'last-30d' },
  grain: 'week',
  periodComparison: 'none',
  chartType: 'stacked-100',
  mode: 'trend',
}

/** G8 — `horizontal-bar`. Grain collapses to `none`; districts sorted descending, `Other` last. */
const tripsByDistrictRanked: ReportQuery = {
  measures: [{ key: 'trips.completed' }],
  groupBy: ['trip.pickup'],
  filters: [],
  window: { kind: 'preset', preset: 'last-30d' },
  grain: 'none',
  periodComparison: 'none',
  chartType: 'horizontal-bar',
  mode: 'trend',
}

/** G8 — `kpi`. One measure, no split, no segments; the comparison delta reads against last week. */
const tripsThisWeekKpi: ReportQuery = {
  measures: [{ key: 'trips.completed' }],
  groupBy: [],
  filters: [],
  window: { kind: 'preset', preset: 'last-7d' },
  grain: 'day',
  periodComparison: 'previous-period',
  chartType: 'kpi',
  mode: 'trend',
}

/* ───────────────────────── saved reports ───────────────────────────────── */

export const savedReportFixtures: SavedReport[] = [
  {
    id: 'RPT-1',
    name: 'Captains vs riders · 30 days',
    description: 'The owner’s standing question. Two panels, two scales, one x-axis.',
    query: captainsVsRiders,
    ownerId: 'USR-1',
    visibility: 'team',
    createdAt: offsetFromNow({ days: -12 }),
    updatedAt: offsetFromNow({ days: -3 }),
    lastRunAt: offsetFromNow({ hours: -3 }),
    pinnedToDashboardIds: ['DSH-1'],
    /* §8's `official` and `starredBy` — the owner's own standing question,
       marked and starred so the `official`/`starred` library views open with
       real content rather than a state QA has to manufacture. */
    tags: ['ops'],
    official: true,
    starredBy: ['USR-1', 'USR-5'],
  },
  {
    id: 'RPT-2',
    name: 'Completed trips by pickup district',
    description: null,
    query: tripsByDistrict,
    ownerId: 'USR-5',
    visibility: 'team',
    createdAt: offsetFromNow({ days: -9 }),
    updatedAt: offsetFromNow({ days: -9 }),
    lastRunAt: offsetFromNow({ days: -1 }),
    pinnedToDashboardIds: ['DSH-1'],
  },
  {
    id: 'RPT-3',
    name: 'Gross revenue · 90 days vs previous',
    description: 'Deliberately longer than the data. The break is the point.',
    query: revenueNinetyDays,
    ownerId: 'USR-2',
    visibility: 'team',
    createdAt: offsetFromNow({ days: -20 }),
    updatedAt: offsetFromNow({ days: -1 }),
    lastRunAt: offsetFromNow({ hours: -20 }),
    pinnedToDashboardIds: [],
  },
  {
    id: 'RPT-4',
    name: 'New subscriptions by plan',
    description: null,
    query: subscriptionsByPlan,
    ownerId: 'USR-1',
    visibility: 'private',
    createdAt: offsetFromNow({ days: -30 }),
    updatedAt: offsetFromNow({ days: -30 }),
    lastRunAt: null,
    /* Pinned to two dashboards, so §11.3's refused delete has two names to put
       in its confirmation (AC-868). */
    pinnedToDashboardIds: ['DSH-1', 'DSH-3'],
  },
  {
    id: 'RPT-6',
    name: 'Rider activation funnel · 90 days',
    description: 'Joined, rode, subscribed. Three rungs, and the drop-off between them.',
    query: riderActivationFunnel,
    ownerId: 'USR-1',
    visibility: 'team',
    createdAt: offsetFromNow({ days: -4 }),
    updatedAt: offsetFromNow({ days: -4 }),
    lastRunAt: offsetFromNow({ days: -4 }),
    pinnedToDashboardIds: [],
  },
  {
    id: 'RPT-7',
    name: 'Rider retention by joining month · M0 to M3',
    description: 'A year of monthly cohorts, four columns wide.',
    query: riderRetentionCohort,
    ownerId: 'USR-2',
    visibility: 'team',
    createdAt: offsetFromNow({ days: -8 }),
    updatedAt: offsetFromNow({ days: -8 }),
    lastRunAt: offsetFromNow({ days: -2 }),
    /* Pinned to `DSH-3`, whose board range it cannot answer at — the reverse
       index is kept in step so §11.3's refused delete still names the board a
       delete would leave with a dangling tile. */
    pinnedToDashboardIds: ['DSH-3'],
  },
  {
    id: 'RPT-8',
    /* A journey whose root is a signup. The mode resolves to no data today —
       `mode-not-resolved` on the wire — and the report exists so that state is
       reachable from the library rather than only from a hand-typed URL. */
    name: 'Where riders go after signing up',
    description: null,
    query: riderJourney,
    ownerId: 'USR-5',
    visibility: 'private',
    createdAt: offsetFromNow({ days: -2 }),
    updatedAt: offsetFromNow({ days: -2 }),
    lastRunAt: null,
    pinnedToDashboardIds: [],
  },
  {
    id: 'RPT-9',
    name: 'Completed trips by district · daily table',
    description: 'The same numbers as RPT-2, listed rather than drawn.',
    query: tripsByDistrictTable,
    ownerId: 'USR-3',
    visibility: 'team',
    createdAt: offsetFromNow({ days: -6 }),
    updatedAt: offsetFromNow({ days: -6 }),
    lastRunAt: offsetFromNow({ days: -6 }),
    pinnedToDashboardIds: [],
  },
  {
    id: 'RPT-5',
    /* User content. Never translated, and it must render right-to-left inside
       an English UI (AC-898). Long enough to find the column that breaks. */
    name: 'معدل الإلغاء اليومي · الرياض وجدة خلال الثلاثين يوماً الماضية',
    description: 'تقرير يومي لمتابعة نسبة الإلغاء',
    query: cancellationTrend,
    ownerId: 'USR-3',
    visibility: 'private',
    createdAt: offsetFromNow({ days: -5 }),
    updatedAt: offsetFromNow({ days: -5 }),
    lastRunAt: offsetFromNow({ days: -5 }),
    pinnedToDashboardIds: [],
  },
  {
    id: 'RPT-10',
    name: 'Quick rides as a share of completed trips',
    description: 'A / B * 100: the formula replaces the two measures with one line.',
    query: quickRideShareOfTrips,
    ownerId: 'USR-2',
    visibility: 'team',
    createdAt: offsetFromNow({ days: -3 }),
    updatedAt: offsetFromNow({ days: -3 }),
    lastRunAt: offsetFromNow({ hours: -4 }),
    pinnedToDashboardIds: [],
  },
  {
    id: 'RPT-11',
    name: 'Quick rides vs subscription trips',
    description: 'Two saved segments on the same measure, so the split is a population choice rather than a dimension.',
    query: tripsQuickVsSubscription,
    ownerId: 'USR-1',
    visibility: 'team',
    createdAt: offsetFromNow({ days: -2 }),
    updatedAt: offsetFromNow({ days: -2 }),
    lastRunAt: offsetFromNow({ hours: -6 }),
    pinnedToDashboardIds: [],
  },
  {
    id: 'RPT-12',
    name: 'Completed trips by district and kind · weekly table',
    description: 'Two dimensions, the legal ceiling. Split by district, then by ride kind.',
    query: tripsByPickupAndKind,
    ownerId: 'USR-5',
    visibility: 'team',
    createdAt: offsetFromNow({ days: -1 }),
    updatedAt: offsetFromNow({ days: -1 }),
    lastRunAt: offsetFromNow({ hours: -2 }),
    pinnedToDashboardIds: [],
  },
  {
    id: 'RPT-13',
    name: 'New subscriptions · this week vs launch week',
    description: 'A fixed comparison window rather than the previous period. Launch week, chosen by hand.',
    query: subscriptionsLaunchWeekVsNow,
    ownerId: 'USR-2',
    visibility: 'team',
    createdAt: offsetFromNow({ days: -1 }),
    updatedAt: offsetFromNow({ days: -1 }),
    lastRunAt: offsetFromNow({ hours: -1 }),
    pinnedToDashboardIds: [],
  },
  {
    id: 'RPT-14',
    name: 'Active subscriptions · 30 days',
    description: null,
    query: activeSubscriptionsArea,
    ownerId: 'USR-1',
    visibility: 'team',
    createdAt: offsetFromNow({ days: -16 }),
    updatedAt: offsetFromNow({ days: -16 }),
    lastRunAt: offsetFromNow({ days: -1 }),
    pinnedToDashboardIds: [],
  },
  {
    id: 'RPT-15',
    name: 'New subscriptions by plan · weekly, stacked',
    description: null,
    query: subscriptionsByPlanStacked,
    ownerId: 'USR-2',
    visibility: 'team',
    createdAt: offsetFromNow({ days: -13 }),
    updatedAt: offsetFromNow({ days: -13 }),
    lastRunAt: offsetFromNow({ days: -3 }),
    pinnedToDashboardIds: [],
  },
  {
    id: 'RPT-16',
    name: 'New subscriptions by status · share of total',
    description: null,
    query: subscriptionsByStatusShare,
    ownerId: 'USR-2',
    visibility: 'private',
    createdAt: offsetFromNow({ days: -10 }),
    updatedAt: offsetFromNow({ days: -10 }),
    lastRunAt: null,
    pinnedToDashboardIds: [],
  },
  {
    id: 'RPT-17',
    name: 'Completed trips by district · ranked',
    description: null,
    query: tripsByDistrictRanked,
    ownerId: 'USR-5',
    visibility: 'team',
    createdAt: offsetFromNow({ days: -7 }),
    updatedAt: offsetFromNow({ days: -7 }),
    lastRunAt: offsetFromNow({ days: -2 }),
    pinnedToDashboardIds: [],
  },
  {
    id: 'RPT-18',
    name: 'Completed trips this week',
    description: 'A single tile: the total, and the comparison delta against last week.',
    query: tripsThisWeekKpi,
    ownerId: 'USR-1',
    visibility: 'team',
    createdAt: offsetFromNow({ days: -1 }),
    updatedAt: offsetFromNow({ hours: -12 }),
    lastRunAt: offsetFromNow({ hours: -1 }),
    pinnedToDashboardIds: [],
    starredBy: ['USR-1'],
    /* One entry, so `Version history` opens on a real prior save rather than
       an empty list — the query is identical because no edit is seeded, only
       the fact that one was made. */
    versions: [{ at: offsetFromNow({ hours: -12 }), by: 'USR-1', query: tripsThisWeekKpi }],
  },
  {
    id: 'RPT-19',
    name: 'Revenue per completed trip',
    description: 'A / B: money over count, once the raw pair alone would have refused (WP-1.4b).',
    query: revenuePerCompletedTrip,
    ownerId: 'USR-2',
    visibility: 'team',
    createdAt: offsetFromNow({ days: -1 }),
    updatedAt: offsetFromNow({ days: -1 }),
    lastRunAt: offsetFromNow({ hours: -6 }),
    pinnedToDashboardIds: [],
  },
]

/* ─────────────────────────── dashboards ────────────────────────────────── */

export const dashboardFixtures: Dashboard[] = [
  {
    id: 'DSH-1',
    name: 'Monday morning',
    /* User-authored, like a saved report's. It says what the board is FOR,
       which is the one thing a name and a tile count cannot. */
    description: 'The three numbers the owner asks about before anything else.',
    ownerId: 'USR-1',
    tiles: [
      {
        tileId: 'TIL-1',
        reportId: 'RPT-1',
        pinnedName: 'Captains vs riders · 30 days',
        order: 1,
        /* §C5 — the hero. A board reads as a composition when its first tile is
           the one the board is named after and the rest sit under it; a uniform
           2-up reads as a contact sheet. RPT-1 is the owner's standing question
           and it draws TWO panels, so it is the tile that most wants the width.
           Every other tile leaves `span` absent, which is `'half'` — the
           default is never written, exactly as `ReportQuery.mode` is not. */
        span: 'full',
      },
      { tileId: 'TIL-2', reportId: 'RPT-2', pinnedName: 'Completed trips by pickup district', order: 2 },
      { tileId: 'TIL-3', reportId: 'RPT-4', pinnedName: 'New subscriptions by plan', order: 3 },
    ],
    /* `null` — every tile answers with its own window. The commonest state of a
       board, the honest default, and the one the control names in those words
       rather than showing a range nothing is using. */
    range: null,
    filters: [],
    createdAt: offsetFromNow({ days: -14 }),
    updatedAt: offsetFromNow({ days: -2 }),
  },
  {
    /* No tiles — R8 first-run *for that dashboard*: illustration plus `Add a
       report`, which is a different empty from the library's (§11.4). */
    id: 'DSH-2',
    name: 'Finance weekly',
    /* Written before a single report was pinned — which is the point of
       AC-865: the board is a valid record the moment it has a name. */
    description: 'Built for Thursday’s finance review. Nothing pinned to it yet.',
    ownerId: 'USR-2',
    tiles: [],
    range: null,
    filters: [],
    createdAt: offsetFromNow({ days: -2 }),
    updatedAt: offsetFromNow({ days: -2 }),
  },
  {
    id: 'DSH-3',
    name: 'Growth review',
    /* `null` is a board whose author wrote nothing, and the list has to render
       that as an absent second line rather than as a blank one. */
    description: null,
    ownerId: 'USR-5',
    tiles: [
      { tileId: 'TIL-4', reportId: 'RPT-4', pinnedName: 'New subscriptions by plan', order: 1 },
      {
        /* A dangling reference. §11.3: it **cannot be created through the UI**
           — the delete is refused — but a concurrent session, a restore or a
           direct API call can still produce one, so the tile has a `missing`
           state and it needs a fixture to reach it (AC-869). `pinnedName` is
           what makes the missing tile able to say what it used to be. */
        tileId: 'TIL-5',
        reportId: 'RPT-DELETED',
        pinnedName: 'Promo ROI by campaign',
        order: 2,
      },
      {
        /**
         * **The tile that REFUSES the board's range, seeded so the state is
         * reachable without composing one.**
         *
         * `RPT-7` is a monthly cohort reaching `M3`, which needs four calendar
         * months in its window; this board asks for seven days. `planQuery`
         * answers `cohort-window-too-short`, so `applyBoardScope` backs the
         * override out, the tile runs at its own `last-365d`, and it says so on
         * itself — an `Own range` marker on the caption and one sentence under
         * the header. Quietly narrowing a four-column matrix to one column
         * because a board asked is the defect that sentence exists to prevent.
         */
        tileId: 'TIL-6',
        reportId: 'RPT-7',
        pinnedName: 'Rider retention by joining month · M0 to M3',
        order: 3,
        /* A retention matrix is thirteen columns wide. At half width it renders
           as a column of single characters, which is the reading failure §C5's
           different-sized tiles exist to fix — measured on the running board,
           not predicted. */
        span: 'full',
      },
    ],
    /**
     * **A board that imposes its own window, so §C4's override is reachable
     * without composing one.**
     *
     * `RPT-4` is saved at `last-30d`; this board asks it at `last-7d`, and the
     * tile answers at seven days while the report is untouched — which is the
     * whole point of a board-level range and the state QA otherwise has to
     * build by hand. The dangling tile beside it is unaffected: a range cannot
     * resolve a reference that is gone.
     */
    range: { kind: 'preset', preset: 'last-7d' },
    /**
     * **And a filter two of the three seeded boards' reports cannot take.**
     *
     * `subscription.status` is legal for `subscriptions.started` (`RPT-4`) and
     * for nothing else on any seeded board — `RPT-1` intersects driver and
     * rider fields to nothing at all, and `RPT-2` is a trips measure. So this
     * one fixture reaches BOTH halves of §C4's filter: a tile that narrows, and
     * a tile that says out loud that it cannot.
     *
     * **Status rather than plan**, deliberately: `RPT-4` splits BY plan and
     * draws a pie, so a plan filter would leave it one slice — a legal answer
     * that reads as a broken chart. A status narrows the population without
     * collapsing the split it is drawn by. `active` is a seeded value, not an
     * invented one.
     */
    filters: [{ field: 'subscription.status', op: 'eq', value: 'active' }],
    createdAt: offsetFromNow({ days: -21 }),
    updatedAt: offsetFromNow({ days: -6 }),
  },
]

/* ─────────────────── the route an alert sends you to ───────────────────── */

/**
 * §12.5: an alert notification routes to **the report that fired, at the window
 * and grain the rule evaluated** — so the operator lands on the picture of the
 * thing, not on a list.
 *
 * This also closes a defect the notification module already records: `alert` is
 * the most-produced runtime type and has **no click destination**
 * (`handleNotifClick`, `:2273`), modelled honestly as `route: null` in the
 * notification fixtures. Alert-produced notifications are the first
 * `alert`-type notifications in this product with a real destination.
 */
export const ALR_1_ROUTE = reportQueryPath(cancellationTrend)

/** `cancellationTrend` re-exported so `alerts.ts` and `agent.ts` can point at the exact query `ALR-1` watches and `RPT-5` names. */
export { cancellationTrend }

/** Exported for the alert client's `Test this rule`, which re-runs the rule's own query. */
export const reportQueriesById: Record<string, ReportQuery> = Object.fromEntries(
  savedReportFixtures.map((r) => [r.id, r.query]),
)

/** The instant the seeded set describes. Every timestamp above derives from it. */
export const REPORT_FIXTURES_AS_OF = EYVAR_NOW
