/**
 * `reports.run`, resolved against fixtures — §4.4, *"what the mock layer must
 * fake, honestly"*.
 *
 * ## The rule that governs every line here
 *
 * > A 90-day window over a store that holds one month is **legitimately mostly
 * > gaps**. The mock emits `null` outside a store's coverage — **not zeros, and
 * > not synthetic noise.** A mock that invents a smooth 90-day trend produces a
 * > screen that is a lie, and the first real backend response will look broken
 * > by comparison.
 *
 * `warnings: ['gaps-outside-fixture-range']` says so on the wire.
 *
 * A second, subtler rule sits beside it: **inside coverage, a bucket with no
 * rows is a real `0`, not a gap.** "Nobody joined on Tuesday" is a fact; "we
 * have no reading for Tuesday" is a different fact. `types/metrics.ts` already
 * argues this on `SeriesPoint` — *"a chart draws a break, not a dip to the
 * axis, and conflating them is how an outage looks like a collapse in demand."*
 *
 * ## Every source is declared here, once, in a flat table
 *
 * A measure's `population` says *which store, which rows, which date*. This
 * file is the only place that knows how to read those three off a fixture row.
 * One entry per store, each a visible line, so the next person to check whether
 * `trips.completed` buckets on `endedAt` reads one line instead of a call graph.
 */

import { dailySnapshotFixtures } from '../fixtures/dailySnapshots'
import { allDriverFixtures } from '../fixtures/drivers'
import { riderFixtures } from '../fixtures/riders'
import { allSubscriptionFixtures } from '../fixtures/subscriptions'
import { allTripFixtures } from '../fixtures/trips'
import { measuresByKey } from '../fixtures/measures'
import {
  addDays,
  bucketEndExclusive,
  bucketStarts,
  comparisonWindow,
  localDayOf,
  partialBucketIndexes,
  resolveWindow,
} from '../reporting/buckets'
import {
  MAX_GROUPS,
  MAX_JOURNEY_DEPTH,
  cohortIntervals,
  planQuery,
  type Catalogue,
} from '../reporting/plan'
import { buildCohortMatrix } from '../reporting/cohorts'
import { subjectKindOf, type SubjectKind } from '../reporting/subjects'
import { EYVAR_NOW } from './clock'
import { matchesFilter } from './query'
import type { FilterSpec, IsoDate } from '../types/common'
import type { Measure } from '../types/measure'
import type { PermissionKey } from '../types/navigation'
import { reportMode } from '../types/report'
import type {
  ReportGrain,
  ReportPanel,
  ReportQuery,
  ReportResult,
  ReportSeries,
  ReportWarning,
} from '../types/report'

/* ─────────────────────── the row-source table ──────────────────────────── */

/**
 * How to read one store. Deliberately five small functions and no inheritance:
 * the point is that a reader can check a population claim against the fixture
 * without leaving this file.
 */
interface RowSource<T> {
  rows: readonly T[]
  /** The measure's `population.timeField`, read off a row. `null` when the row has no such date. */
  dateOf: (row: T, timeField: string) => IsoDate | null
  /** What one row contributes. `1` for a count, the halalas for a money sum. */
  valueOf: (row: T, valueField: string | null) => number
  /** Stock only: was this row live as at the end of `day`? `null` for a flow-only store. */
  liveAt: ((row: T, day: IsoDate) => boolean) | null
  /** Namespaced field → value, for both group-by and filters. One map, one vocabulary. */
  fields: Record<string, (row: T) => string | number | boolean | null>
  /**
   * **Who this row is about** — the fact the funnel, the cohort and the journey
   * need and the trend does not (P7-T3).
   *
   * `null` for a store whose rows name nobody. `reporting/subjects.ts` declares
   * the same fact one layer up, where `planQuery` can refuse a cohort anchored
   * on a subject-less measure before a request exists; this is the half that
   * reads the id off the row, and `subjects.test.ts` holds the two to each
   * other so they cannot drift.
   */
  subject: { kind: SubjectKind; idOf: (row: T) => string | null } | null
}

type AnyRow = Record<string, never>

const driverSource: RowSource<(typeof allDriverFixtures)[number]> = {
  rows: allDriverFixtures,
  dateOf: (d) => d.joinedAt,
  valueOf: () => 1,
  /* A captain who joined in March had joined by April: registration is monotone
     and irreversible, so a cumulative stock over `joinedAt` is honest. Status is
     **not** monotone and no status history exists on the row, which is why no
     measure in the catalogue reads status as a stock. */
  liveAt: (d, day) => d.joinedAt <= day,
  subject: { kind: 'driver', idOf: (d) => d.id },
  fields: {
    'driver.city': (d) => d.city,
    'driver.vehicleClass': (d) => d.vehicleClass,
    'driver.status': (d) => d.status,
  },
}

const riderSource: RowSource<(typeof riderFixtures)[number]> = {
  rows: riderFixtures,
  dateOf: (r) => r.joinedAt,
  valueOf: () => 1,
  liveAt: (r, day) => r.joinedAt <= day,
  subject: { kind: 'rider', idOf: (r) => r.id },
  fields: {
    'rider.city': (r) => r.city,
    'rider.status': (r) => r.status,
  },
}

const subscriptionSource: RowSource<(typeof allSubscriptionFixtures)[number]> = {
  rows: allSubscriptionFixtures,
  dateOf: (s, timeField) =>
    timeField === 'cancelledAt' ? (s.cancelledAt === null ? null : localDayOf(s.cancelledAt)) : s.startedOn,
  valueOf: (s, valueField) => (valueField === 'paidHalalas' ? s.paidHalalas : 1),
  /* Live at the end of `day`: started, not cancelled by then, not ended by then.
     Three dates on the row reconstruct it exactly, with no status history — which
     is what separates this stock from an "active captains" stock. */
  liveAt: (s, day) =>
    s.startedOn <= day && (s.cancelledAt === null || localDayOf(s.cancelledAt) > day) && s.endsOn >= day,
  /* A subscription is a rider's record. The captain on it is who serves it, not
     who bought it, and a funnel that changed subject halfway down would be
     measuring two populations under one picture. */
  subject: { kind: 'rider', idOf: (s) => s.riderId },
  fields: {
    'subscription.plan': (s) => s.planKey,
    'subscription.vehicleClass': (s) => s.vehicleClass,
    'subscription.status': (s) => s.status,
    /* Readable but not filterable: `subscriptions.cancelled` names it in its
       population predicate, and a predicate field must resolve even when the
       filter picker does not offer it. */
    'subscription.cancelledAt': (s) => s.cancelledAt,
  },
}

const tripSource: RowSource<(typeof allTripFixtures)[number]> = {
  rows: allTripFixtures,
  /* `endedAt`, never `startedAt` — the same sentence `clients/metrics.ts`
     carries. A trip that started on Monday and ended after midnight belongs to
     Tuesday, and the two fields give different weekly totals. */
  dateOf: (t) => (t.endedAt === null ? null : localDayOf(t.endedAt)),
  valueOf: (t, valueField) => (valueField === 'fareHalalas' ? t.fareHalalas : 1),
  liveAt: null,
  /* Both ids are on the row and the rider is the subject — see
     `reporting/subjects.ts` for why, and for what a captain-side funnel would
     need before it could exist. */
  subject: { kind: 'rider', idOf: (t) => t.riderId },
  fields: {
    'trip.kind': (t) => t.kind,
    'trip.status': (t) => t.status,
    'trip.pickup': (t) => t.pickup,
  },
}

const snapshotSource: RowSource<(typeof dailySnapshotFixtures)[number]> = {
  rows: dailySnapshotFixtures,
  dateOf: (s) => s.date,
  valueOf: (s, valueField) => {
    switch (valueField) {
      case 'riders':
        return s.riders
      case 'drivers':
        return s.drivers
      case 'activeSubs':
        return s.activeSubs
      case 'quickRides':
        return s.quickRides
      case 'cancelRatePct':
        return s.cancelRatePct
      case 'totalRevenueHalalas':
        return s.totalRevenueHalalas
      case 'quickRideRevenueHalalas':
        return s.quickRideRevenueHalalas
      case 'subRevenueHalalas':
        return s.subRevenueHalalas
      default:
        return 0
    }
  },
  liveAt: null,
  /* One row is one day's number, captured by hand. It names nobody, which is
     why a cohort or a journey over it is refused by the planner. */
  subject: null,
  /* A snapshot row is one number for one day. It carries no city, no plan and no
     district, so there is nothing to split it by — and the catalogue says so with
     an empty `dimensions`, rather than the picker offering `city` and the
     operator learning the rule from an error (§4.1 F-3). */
  fields: {},
}

/** `population.resource` → how to read it. The only mapping of its kind. */
const SOURCES: Record<string, RowSource<AnyRow>> = {
  drivers: driverSource as unknown as RowSource<AnyRow>,
  riders: riderSource as unknown as RowSource<AnyRow>,
  subscriptions: subscriptionSource as unknown as RowSource<AnyRow>,
  trips: tripSource as unknown as RowSource<AnyRow>,
  'daily-snapshots': snapshotSource as unknown as RowSource<AnyRow>,
}

/** Which stores this mock can read. A measure naming anything else is a catalogue defect. */
export const READABLE_RESOURCES: string[] = Object.keys(SOURCES)

/* ───────────────────────── the row cap ─────────────────────────────────── */

/**
 * §4.4.3 requires `truncated: true` to be reachable. It is reachable by
 * **actually truncating**, never by setting a flag: `useTruncatedReports()`
 * lowers the cap to 40 rows, `trips` holds 132, and the numbers that come back
 * really are short. A flag with full data behind it would let the caveat's copy
 * ship while the state it describes never occurs.
 */
const DEFAULT_ROW_CAP = 5_000
let rowCap = DEFAULT_ROW_CAP

export function useTruncatedReports(cap = 40): void {
  rowCap = cap
}

export function resetReportRowCap(): void {
  rowCap = DEFAULT_ROW_CAP
}

export function currentRowCap(): number {
  return rowCap
}

/* ──────────────────────────── the resolver ─────────────────────────────── */

export interface ResolveContext {
  /** The **requesting** viewer's permissions, not the report owner's. §13.1. */
  permissions: readonly PermissionKey[]
  /** The fixed clock's day. Passed, never read from a global. */
  today: IsoDate
  /** Measure keys whose series should come back failed — reaches §8.3 state 10. */
  failMeasureKeys?: readonly string[]
}

/** §7.4's fold bucket. Always last, always rendered, even at zero. */
export const OTHER = '__other__'

/**
 * Resolve a query that `planQuery` has already found legal.
 *
 * Returns a `ReportResult` and nothing else: legality is the planner's job and
 * `reports.run` runs it first, so this function never has to decide whether a
 * query should exist.
 */
export function resolveReport(
  query: ReportQuery,
  catalogue: Catalogue,
  ctx: ResolveContext,
): ReportResult {
  const window = resolveWindow(query.window, ctx.today)
  const buckets = bucketStarts(window.from, window.to, query.grain)

  /* ── the five modes ───────────────────────────────────────────────────── */
  /* `trend` and `table` fall through and resolve exactly as they always have:
     one is the other's numbers listed instead of drawn, and neither needs a
     line here. The other three ask about **people over time** rather than
     numbers over time, so each has its own resolver below — and each returns
     the same `ReportResult` shape, which is what lets one CSV exporter, one
     alert rule and one dashboard tile serve all five (P7-T3). */
  const mode = reportMode(query)
  if (mode === 'funnel') return resolveFunnel(query, window, ctx)
  if (mode === 'cohort') return resolveCohort(query, window, ctx)
  if (mode === 'journey') return resolveJourney(query, window, ctx)
  const partials = partialBucketIndexes(buckets, query.grain, window, ctx.today)
  const warnings = new Set<ReportWarning>()

  if (partials.includes(0)) warnings.add('partial-first')
  if (buckets.length > 0 && partials.includes(buckets.length - 1)) warnings.add('partial-last')

  const plan = planQuery(query, catalogue, ctx.today)
  if (plan.chartTypeCoerced) warnings.add('grain-coarsened')

  const measures = query.measures
    .map((ref) => measuresByKey[ref.key])
    .filter((m): m is Measure => Boolean(m))

  const panels: ReportPanel[] = []
  const series: ReportSeries[] = []
  let truncated = false
  let foldedGroupCount: number | null = null

  for (const measure of measures) {
    /* §13.1 — authorised per viewer, per measure, at the data layer. A blocked
       series carries **no points**, verified against the response (AC-888). */
    const required = measure.permission
    const blocked: PermissionKey | null =
      required && !ctx.permissions.includes(required.key) ? required.key : null

    const failed = ctx.failMeasureKeys?.includes(measure.key)
      ? { code: 'series_failed', retryable: true }
      : null

    const grouping = blocked || failed ? { values: [null], folded: 0, top: [] } : groupsFor(measure, query)
    if (grouping.folded > 0) {
      warnings.add('groups-folded')
      foldedGroupCount = (foldedGroupCount ?? 0) + grouping.folded
    }

    for (const groupValue of grouping.values) {
      const panelId = panelIdFor(measure.key, groupValue)
      const panel: ReportPanel = {
        panelId,
        titleKey: groupValue === null ? 'rb.panel.measure' : 'rb.panel.measureByGroup',
        titleParams:
          groupValue === null
            ? { measure: measure.labelKey }
            : { measure: measure.labelKey, group: groupValue },
        unit: measure.unit,
        currency: measure.currency,
        seriesIds: [],
      }
      panels.push(panel)

      const current = buildSeries({
        measure,
        query,
        buckets,
        window,
        groupValue,
        topGroups: grouping.top,
        role: 'current',
        panelId,
        partials,
        blocked,
        failed,
      })
      truncated = truncated || current.truncated
      if (current.hadGap) warnings.add('gaps-outside-fixture-range')
      series.push(current.series)
      panel.seriesIds.push(current.series.id)

      if (query.periodComparison !== 'none' && !blocked && !failed) {
        const prior = comparisonWindow(window, query.periodComparison)
        const priorBuckets = bucketStarts(prior.from, prior.to, query.grain).slice(0, buckets.length)
        const comparison = buildSeries({
          measure,
          query,
          buckets: priorBuckets,
          window: prior,
          groupValue,
          topGroups: grouping.top,
          role: 'comparison',
          panelId,
          /* A partial bucket is excluded from the period-comparison delta
             (AC-818), so the comparison series carries none of its own. */
          partials: [],
          blocked: null,
          failed: null,
        })
        truncated = truncated || comparison.truncated
        if (comparison.hadGap) warnings.add('gaps-outside-fixture-range')
        series.push(comparison.series)
        /* Same panel, therefore the same y-axis — the one and only pair for
           which a shared axis is honest. §3.7: dotted, same hue, never a
           second colour. */
        panel.seriesIds.push(comparison.series.id)
      }
    }
  }

  return {
    query,
    asOf: EYVAR_NOW,
    buckets,
    panels,
    series,
    truncated,
    truncatedAtRows: truncated ? rowCap : null,
    warnings: [...warnings],
    foldedGroupCount,
  }
}

/* ═══════════════════ the three subject-shaped modes ═══════════════════════ */

/**
 * **What separates these three from `trend` and `table`.**
 *
 * A trend asks *how many, bucketed how*. A funnel, a cohort and a journey each
 * ask *what happened to the same people over time* — which is a different
 * question over the same rows, and the reason `reporting/subjects.ts` exists:
 * a store whose rows name nobody can answer the first question and cannot
 * answer the second.
 *
 * All three return the ordinary `ReportResult`. **That is the whole design
 * decision of P7-T3, and everything downstream falls out of it:**
 *
 *   *shareable* — `serialiseReportQuery` already carries `mode` (P7-T1), so a
 *   funnel has a link exactly as a trend does (AC-853 … AC-855).
 *   *alertable* — every rung, every retention column and every path is a
 *   `ReportSeries` with a stable id, so `alerts.evaluate` reads them with no
 *   new code and `AlertRuleDialog`'s series picker lists them.
 *   *exportable* — `reportToCsv` walks `buckets × series` and therefore emits a
 *   funnel as one row per rung, a cohort as one row per cohort × column and a
 *   journey as one row per path, with no mode-specific branch.
 *   *pinnable*  — a dashboard tile renders a `ReportResult`.
 *
 * The rejected alternative was a `ReportResult.funnel` / `.cohort` / `.journey`
 * block per mode. It reads more directly and it costs four rewrites: the CSV,
 * the alert evaluator, the tile and the alert-rule picker would each need to
 * learn five shapes instead of one, and a mode added later would need all four
 * again. The one thing that genuinely does not fit a series is a cohort's row
 * sizes, and that is the one field added (`ReportResult.cohortSizes`).
 */

/** One thing one subject did, once. */
interface SubjectEvent {
  subjectId: string
  date: IsoDate
  /**
   * Which row it came from. Two measures can describe the same row — *riders
   * who joined* and *registered riders* are one `joinedAt` read two ways — and
   * a journey that let a subject's root event reappear as its own next step
   * would draw *joined → joined* for everybody.
   */
  rowId: string
}

interface EventSet {
  /** `null` when the store names nobody. The funnel falls back; the other two are refused by the planner. */
  kind: SubjectKind | null
  events: SubjectEvent[]
  /**
   * The measure's **own** aggregate over the whole window — `valueForBucket`
   * at `grain: 'none'`, which is what one collapsed period already means. Used
   * only by the counted funnel, where there is no subject to follow.
   */
  total: number | null
  truncated: boolean
}

/**
 * Every row of a measure's population that falls inside the window, as events.
 *
 * The predicate and the filters are applied by the same `matchesAll` the trend
 * resolver uses, so a funnel rung filtered to Quick Rides narrows by exactly
 * the rule a trend filtered to Quick Rides narrows by. **There is no second
 * filter model** (AC-814).
 */
function eventsOf(
  measure: Measure,
  filters: readonly FilterSpec[],
  window: { from: IsoDate; to: IsoDate },
): EventSet {
  const source = SOURCES[measure.population.resource]
  if (!source) return { kind: null, events: [], total: null, truncated: false }

  const capped = source.rows.slice(0, rowCap)
  const truncated = capped.length < source.rows.length
  const subject = source.subject
  const events: SubjectEvent[] = []
  const matching: AnyRow[] = []

  capped.forEach((row, index) => {
    if (!matchesAll(row, measure.population.predicate, source)) return
    if (!matchesAll(row, filters, source)) return
    matching.push(row)
    const date = source.dateOf(row, measure.population.timeField)
    if (date === null || date < window.from || date > window.to) return
    const subjectId = subject ? subject.idOf(row) : null
    if (!subjectId) return
    events.push({ subjectId, date, rowId: `${measure.population.resource}#${index}` })
  })

  /* Outside the store's declared coverage the answer is unknown, and unknown is
     `null` — the same rule the trend resolver applies bucket by bucket (§4.4.1).
     A funnel rung of `0` over a period nobody recorded is a lie. */
  const coverage = measure.population.coverage
  const covered = !(window.to < coverage.from || window.from > coverage.to)

  return {
    kind: subject?.kind ?? null,
    /* Deterministic: date, then subject, then row. A tie must not reshuffle
       between renders or visual regression cannot diff it. */
    events: events.sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.subjectId.localeCompare(b.subjectId) ||
        a.rowId.localeCompare(b.rowId),
    ),
    total: covered ? valueForBucket(measure, source, matching, window.from, window.to) : null,
    truncated,
  }
}

/** §13.1 — authorised per viewer, per measure, at the data layer. */
function blockedFor(measure: Measure, ctx: ResolveContext): PermissionKey | null {
  const required = measure.permission
  return required && !ctx.permissions.includes(required.key) ? required.key : null
}

/** A series carrying no points, for a rung or a column the viewer may not read. */
function redactedSeries(
  measure: Measure,
  groupValue: string,
  panelId: string,
  blocked: PermissionKey,
): ReportSeries {
  return {
    id: `${measure.key}#${groupValue}#current`,
    measureKey: measure.key,
    groupValue,
    role: 'current',
    panelId,
    unit: measure.unit,
    currency: measure.currency,
    temporality: measure.temporality,
    /* No points. Redaction is at the data layer, never a client-side filter
       over a full payload (§13.1, AC-888). */
    points: [],
    partialBucketIndexes: [],
    blocked,
    failed: null,
  }
}

/** A well-formed result with nothing in it, for a configuration the planner refuses. */
function emptyModeResult(query: ReportQuery, warnings: ReportWarning[] = []): ReportResult {
  return {
    query,
    asOf: EYVAR_NOW,
    buckets: [],
    panels: [],
    series: [],
    truncated: false,
    truncatedAtRows: null,
    warnings,
    foldedGroupCount: null,
  }
}

/* ──────────────────────────────  funnel  ───────────────────────────────── */

/**
 * **Of the people who did A, how many went on to do B?**
 *
 * One series per rung, one bucket each, one panel — so the cascade's numbers,
 * the CSV's rows and an alert's series are the same objects. Conversion and
 * drop-off are **not** on the wire: they are `count[i] / count[0]` and
 * `1 − count[i] / count[i-1]`, arithmetic the renderer does, and a second copy
 * of them here is a second number that can disagree with the first.
 *
 * ## Following subjects, and the honest fallback
 *
 * A funnel follows one subject down the rungs: a rider counts at rung 2 only if
 * their rung-2 event is **at or after** their rung-1 event. That is the
 * difference between a funnel and three totals side by side, and it is why
 * rung 2 can be smaller than the number of trips completed in the window.
 *
 * It is only possible when every rung names the same kind of subject. A rung
 * over `daily-snapshots` names nobody; a funnel mixing rider rungs with captain
 * rungs follows two populations. `planQuery` deliberately allows both — *how
 * many quick rides against how many signups* is a real question — so rather
 * than refuse, the resolver counts each rung's population over the window and
 * **says on the wire that it did**, with `funnel-counted-not-followed`. Without
 * that admission one picture would carry two very different meanings.
 *
 * ## `conversionWindowDays`
 *
 * `null` means the report window (`FunnelSpec`): *of the people who entered in
 * these 90 days, how many finished in these 90 days*. A number means each
 * subject has that many days from **their own first rung**, which is why the
 * first rung's date is carried forward rather than recomputed.
 */
function resolveFunnel(
  query: ReportQuery,
  window: { from: IsoDate; to: IsoDate },
  ctx: ResolveContext,
): ReportResult {
  const steps = query.funnel?.steps ?? []
  if (steps.length === 0) return emptyModeResult(query)

  const warnings = new Set<ReportWarning>()
  const panelId = 'p:funnel'
  const series: ReportSeries[] = []
  let truncated = false

  const rungs = steps.map((step) => ({ step, measure: measuresByKey[step.measureKey] ?? null }))
  const kinds = rungs.map((r) => (r.measure ? subjectKindOf(r.measure.population.resource) : null))
  const first = kinds[0] ?? null
  const follow = first !== null && kinds.every((k) => k === first)
  if (!follow) warnings.add('funnel-counted-not-followed')

  /* `subjectId → the date of its event at the rung reached so far`, and the
     date of its FIRST rung, which the conversion window is measured from. */
  let reached: Map<string, IsoDate> = new Map()
  const entered = new Map<string, IsoDate>()
  /* A blocked rung stops the funnel there: every rung after it is derived from
     a population this viewer may not read, so reporting a number for it would
     leak the blocked one by subtraction. */
  let blockedFrom = false

  rungs.forEach(({ step, measure }, index) => {
    const groupValue = String(index + 1)

    if (!measure) {
      /* `planQuery` refuses an unknown rung before a run; `reports.export`
         resolves without planning, so this path is real. One null point rather
         than a thrown error keeps the other rungs readable. */
      return
    }

    const blocked = blockedFor(measure, ctx)
    if (blocked || blockedFrom) {
      blockedFrom = true
      series.push(redactedSeries(measure, groupValue, panelId, blocked ?? (measure.permission?.key ?? 'view_finance')))
      return
    }

    const set = eventsOf(measure, [...query.filters, ...(step.filters ?? [])], window)
    truncated = truncated || set.truncated

    let count: number | null
    if (!follow) {
      count = set.total
    } else if (index === 0) {
      reached = earliestPerSubject(set.events)
      reached.forEach((date, id) => entered.set(id, date))
      count = reached.size
    } else {
      const bySubject = groupBySubject(set.events)
      const next = new Map<string, IsoDate>()
      reached.forEach((previousDate, id) => {
        const startedOn = entered.get(id) ?? previousDate
        const deadline =
          query.funnel?.conversionWindowDays == null
            ? window.to
            : addDays(startedOn, query.funnel.conversionWindowDays)
        const match = (bySubject.get(id) ?? []).find((e) => e.date >= previousDate && e.date <= deadline)
        if (match) next.set(id, match.date)
      })
      reached = next
      count = reached.size
    }

    series.push({
      id: `${measure.key}#${groupValue}#current`,
      measureKey: measure.key,
      groupValue,
      role: 'current',
      panelId,
      /* A followed funnel counts PEOPLE, whatever the rung's own measure counts
         — the rung is *riders who completed a trip*, not *trips*. A counted
         funnel is the measure's own number and keeps the measure's own unit. */
      unit: follow ? 'count' : measure.unit,
      currency: follow ? null : measure.currency,
      temporality: measure.temporality,
      points: [count],
      partialBucketIndexes: [],
      blocked: null,
      failed: null,
    })
  })

  const firstMeasure = rungs[0]?.measure ?? null
  const panel: ReportPanel = {
    panelId,
    titleKey: 'rb.panel.funnel',
    /* **`measure` is carried even though the funnel's own title does not use
       it**, because `panelTitle()` — the one title resolver the panel card, the
       result table and a dashboard tile share — reads `titleParams.measure` as
       a translation key. Omitting it would make a funnel pinned to a dashboard
       resolve the empty string, which throws in dev (AC-74). The rung it names
       is the first, which is the population the whole cascade narrows. */
    titleParams: { measure: firstMeasure?.labelKey ?? 'rb.canvas.heading' },
    unit: follow ? 'count' : firstMeasure?.unit ?? 'count',
    currency: follow ? null : firstMeasure?.currency ?? null,
    seriesIds: series.map((s) => s.id),
  }

  return {
    query,
    asOf: EYVAR_NOW,
    /* One bucket: the window, collapsed. A funnel's x-axis is its rungs, which
       is exactly what `grain: 'none'` already means (§3.5). */
    buckets: [window.from],
    panels: [panel],
    series,
    truncated,
    truncatedAtRows: truncated ? rowCap : null,
    warnings: [...warnings],
    foldedGroupCount: null,
  }
}

/** `subjectId → its earliest event`, which is when it entered. */
function earliestPerSubject(events: readonly SubjectEvent[]): Map<string, IsoDate> {
  const out = new Map<string, IsoDate>()
  for (const event of events) {
    const held = out.get(event.subjectId)
    if (held === undefined || event.date < held) out.set(event.subjectId, event.date)
  }
  return out
}

/** `subjectId → its events, ascending`. The input is already sorted. */
function groupBySubject(events: readonly SubjectEvent[]): Map<string, SubjectEvent[]> {
  const out = new Map<string, SubjectEvent[]>()
  for (const event of events) {
    const held = out.get(event.subjectId)
    if (held) held.push(event)
    else out.set(event.subjectId, [event])
  }
  return out
}

/* ──────────────────────────────  cohort  ───────────────────────────────── */

/**
 * **Of the people who arrived in March, how many are still here in June?**
 *
 * **The maths does not move.** `reporting/cohorts.ts` already computes the
 * matrix from `(joinedAt, lastActiveAt)` at `M0 … Mn` and is already tested;
 * `planQuery` already produces the column list. This function's whole job is to
 * turn a query into that function's three arguments and its output into a
 * `ReportResult`.
 *
 * ## The transposition, and why it is this way round
 *
 * A matrix has two axes and `ReportResult` has `buckets` and `series`, so one
 * of them has to be which:
 *
 *   **buckets are the cohorts** — `2026-03-01`, `2026-04-01`, … They are dates,
 *   and `IsoDate[]` is what `buckets` is. `M0 … Mn` are not dates and could not
 *   go there without lying about the type.
 *   **series are the columns** — one per interval, each with one reading per
 *   cohort.
 *
 * The consequence is worth stating: an alert on a cohort report watches **one
 * column across cohorts** — *tell me when month-1 retention drops below 40 %* —
 * which is the question anyone actually asks of a retention matrix.
 *
 * ## Still here, measured two ways
 *
 * `returnMeasureKey: null` means the subject's own activity, which is
 * `buildCohortMatrix`'s `getLastActiveAt` — a rider's last trip, a captain's
 * last trip driven. A named return measure means *still here* is *did this
 * again*, and the subject's latest such event inside the window is its last
 * active date. Both are read off recorded rows; neither is invented (AC-453).
 */
function resolveCohort(
  query: ReportQuery,
  window: { from: IsoDate; to: IsoDate },
  ctx: ResolveContext,
): ReportResult {
  const spec = query.cohort
  const anchor = spec?.anchorMeasureKey ? measuresByKey[spec.anchorMeasureKey] ?? null : null
  if (!spec || !anchor) return emptyModeResult(query)

  const panelId = 'p:cohort'
  const intervals = cohortIntervals(spec.horizon)
  const blocked = blockedFor(anchor, ctx)
  if (blocked) {
    return {
      ...emptyModeResult(query),
      panels: [
        cohortPanel(
          panelId,
          intervals.map((i) => `${anchor.key}#${i}#current`),
          anchor.labelKey,
        ),
      ],
      series: intervals.map((interval) => redactedSeries(anchor, interval, panelId, blocked)),
    }
  }

  const anchorSet = eventsOf(anchor, query.filters, window)
  const joined = earliestPerSubject(anchorSet.events)

  const returnMeasure = spec.returnMeasureKey ? measuresByKey[spec.returnMeasureKey] ?? null : null
  const returnBlocked = returnMeasure ? blockedFor(returnMeasure, ctx) : null
  const returned = returnMeasure && !returnBlocked ? latestPerSubject(eventsOf(returnMeasure, query.filters, window).events) : null

  const kind = anchorSet.kind
  const entities = [...joined.entries()]
    /* Deterministic order in, deterministic matrix out. `buildCohortMatrix`
       sorts its cohort keys, but the survival arithmetic reads every row. */
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([subjectId, joinedAt]) => ({
      joinedAt,
      lastActiveAt: returned
        ? returned.get(subjectId) ?? null
        : kind
          ? lastActiveOf(kind, subjectId)
          : null,
    }))

  const matrix = buildCohortMatrix(
    entities,
    (e) => e.joinedAt,
    (e) => e.lastActiveAt,
    intervals,
  )

  /* `YYYY-MM` is `buildCohortMatrix`'s own cohort key; a bucket is a date, so
     the cohort's first day is the date it is. */
  const buckets = matrix.rows.map((row) => `${row.cohortKey}-01` as IsoDate)

  const series: ReportSeries[] = intervals.map((interval) => ({
    id: `${anchor.key}#${interval}#current`,
    measureKey: anchor.key,
    groupValue: interval,
    role: 'current',
    panelId,
    /* A retention matrix is per cent whatever the anchor measure counts. */
    unit: 'percent',
    currency: null,
    temporality: anchor.temporality,
    points: matrix.rows.map((row) => row.retentionByMonth[interval] ?? null),
    partialBucketIndexes: [],
    blocked: null,
    failed: null,
  }))

  return {
    query,
    asOf: EYVAR_NOW,
    buckets,
    panels: [cohortPanel(panelId, series.map((s) => s.id), anchor.labelKey)],
    series,
    truncated: anchorSet.truncated,
    truncatedAtRows: anchorSet.truncated ? rowCap : null,
    warnings: [],
    foldedGroupCount: null,
    /* R5-15's rule applied to a percentage: the base travels with the number.
       *38 % retained* of 1 400 and of 6 are not the same claim. */
    cohortSizes: matrix.rows.map((row) => row.size),
  }
}

function cohortPanel(panelId: string, seriesIds: string[], measureLabelKey: string): ReportPanel {
  return {
    panelId,
    titleKey: 'rb.panel.cohort',
    /* See `resolveFunnel`'s panel for why `measure` travels here. */
    titleParams: { measure: measureLabelKey },
    unit: 'percent',
    currency: null,
    seriesIds,
  }
}

/** `subjectId → its latest event`, which is the last time it was seen doing that. */
function latestPerSubject(events: readonly SubjectEvent[]): Map<string, IsoDate> {
  const out = new Map<string, IsoDate>()
  for (const event of events) {
    const held = out.get(event.subjectId)
    if (held === undefined || event.date > held) out.set(event.subjectId, event.date)
  }
  return out
}

/**
 * **When this subject was last seen** — the one `RowSource`-shaped fact the
 * cohort engine needs and the trend resolver never asks for.
 *
 * A rider carries `lastTripAt` on the row. A captain carries no activity field
 * at all, so it is **derived from the trips they drove** — which is a recorded
 * fact, not an invented one, and it is the reason this is a function rather
 * than a field on `RowSource`: the answer for a captain does not live in the
 * captain's store.
 *
 * Built once, lazily, and never rebuilt: the fixtures are static, so a memo
 * here is deterministic. No clock is read and nothing is randomised.
 */
let lastActiveIndex: Record<SubjectKind, Map<string, IsoDate>> | null = null

function lastActiveOf(kind: SubjectKind, subjectId: string): IsoDate | null {
  if (!lastActiveIndex) {
    const rider = new Map<string, IsoDate>()
    for (const r of riderFixtures) {
      if (r.lastTripAt) rider.set(r.id, localDayOf(r.lastTripAt))
    }
    const driver = new Map<string, IsoDate>()
    for (const t of allTripFixtures) {
      if (!t.driverId || t.endedAt === null) continue
      const day = localDayOf(t.endedAt)
      const held = driver.get(t.driverId)
      if (held === undefined || day > held) driver.set(t.driverId, day)
    }
    lastActiveIndex = { rider, driver }
  }
  return lastActiveIndex[kind].get(subjectId) ?? null
}

/* ─────────────────────────────  journey  ──────────────────────────────── */

/**
 * **After they did this, what did they do next?**
 *
 * One series per distinct path, one bucket each, `groupValue` the path itself
 * as `measureKey>measureKey>…`. The tree is not on the wire because it does not
 * need to be: a set of paths **is** a tree, the renderer groups by prefix, and
 * a tree on the wire would be a second structure that can disagree with the
 * paths beside it.
 *
 * ## The event vocabulary, and why it is not "every measure"
 *
 * A journey step is an **event** — something a subject did on a day. Two
 * catalogue measures often read the same rows at the same date: *registered
 * riders* and *riders who joined* are one `joinedAt` counted two ways. Left
 * alone, every subject's path would read *joined → joined* and the tree would
 * be a picture of the catalogue rather than of the product.
 *
 * So measures are grouped by **(store, date field, population predicate)** —
 * the three things that decide which rows at which instant — and one is kept
 * per group, preferring a **flow**: a flow measure is the catalogue's name for
 * an event, and a stock is its name for a level. *Subscriptions started* is a
 * thing that happened; *active subscriptions* is a number that was true.
 *
 * ## Known limit, reported rather than papered over
 *
 * A **captain-rooted** journey has one event in its vocabulary and therefore no
 * paths: `trips`' subject is the rider (`reporting/subjects.ts`), so nothing a
 * captain does after registering is reachable from the captain side. Giving a
 * store a second subject is a decision for the owner of the measure catalogue;
 * it is named in the handoff and not guessed at here.
 *
 * ## The subjects who did nothing
 *
 * They are the largest branch of most real journeys and they are counted, under
 * `NO_PATH`. Dropping them would make every share a share of the people who
 * continued, which is how a journey diagram claims a 100 % continuation rate.
 */
export const NO_PATH = '__none__'

function resolveJourney(
  query: ReportQuery,
  window: { from: IsoDate; to: IsoDate },
  ctx: ResolveContext,
): ReportResult {
  const spec = query.journey
  const root = spec?.rootMeasureKey ? measuresByKey[spec.rootMeasureKey] ?? null : null
  if (!spec || !root) return emptyModeResult(query)

  const panelId = 'p:journey'
  const kind = subjectKindOf(root.population.resource)
  const blocked = blockedFor(root, ctx)
  if (blocked || kind === null) {
    return {
      ...emptyModeResult(query),
      panels: [
        journeyPanel(panelId, blocked ? [`${root.key}#${NO_PATH}#current`] : [], root.labelKey),
      ],
      series: blocked ? [redactedSeries(root, NO_PATH, panelId, blocked)] : [],
    }
  }

  const rootSet = eventsOf(root, query.filters, window)
  const rootEvent = new Map<string, SubjectEvent>()
  for (const event of rootSet.events) {
    const held = rootEvent.get(event.subjectId)
    if (!held || event.date < held.date) rootEvent.set(event.subjectId, event)
  }

  /* The query's filters narrow **who enters** the journey. They are not applied
     to the following steps, and they cannot be: a filter on `rider.city` is not
     a field on the trips store, so `matchesAll` would reject every trip and the
     tree would be empty for a reason no operator could see. */
  const vocabulary = journeyVocabulary(kind, ctx)
  const timeline = new Map<string, Array<SubjectEvent & { measureKey: string }>>()
  let truncated = rootSet.truncated
  for (const measure of vocabulary) {
    const set = eventsOf(measure, [], window)
    truncated = truncated || set.truncated
    for (const event of set.events) {
      const held = timeline.get(event.subjectId)
      const stamped = { ...event, measureKey: measure.key }
      if (held) held.push(stamped)
      else timeline.set(event.subjectId, [stamped])
    }
  }

  const depth = Math.max(1, Math.min(spec.depth, MAX_JOURNEY_DEPTH))
  const counts = new Map<string, number>()
  rootEvent.forEach((start, subjectId) => {
    const after = (timeline.get(subjectId) ?? [])
      .filter((e) => e.rowId !== start.rowId && e.date >= start.date)
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          a.measureKey.localeCompare(b.measureKey) ||
          a.rowId.localeCompare(b.rowId),
      )
      .slice(0, depth)
    const path = after.length === 0 ? NO_PATH : after.map((e) => e.measureKey).join('>')
    counts.set(path, (counts.get(path) ?? 0) + 1)
  })

  /* §7.4's fold, on paths rather than on groups: the ninth path and beyond
     become one `Other`, and the result says how many were folded. Silently
     dropping the tail is how a report tells an operator it does not exist. */
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  const kept = ranked.slice(0, MAX_GROUPS)
  const foldedPaths = ranked.slice(MAX_GROUPS)
  const rows =
    foldedPaths.length === 0
      ? kept
      : [...kept, [OTHER, foldedPaths.reduce((sum, [, n]) => sum + n, 0)] as [string, number]]

  const series: ReportSeries[] = rows.map(([path, subjects]) => ({
    id: `${root.key}#${path}#current`,
    measureKey: root.key,
    groupValue: path,
    role: 'current',
    panelId,
    /* A journey counts subjects on a path, whatever its steps' measures count. */
    unit: 'count',
    currency: null,
    temporality: root.temporality,
    points: [subjects],
    partialBucketIndexes: [],
    blocked: null,
    failed: null,
  }))

  return {
    query,
    asOf: EYVAR_NOW,
    buckets: [window.from],
    panels: [journeyPanel(panelId, series.map((s) => s.id), root.labelKey)],
    series,
    truncated,
    truncatedAtRows: truncated ? rowCap : null,
    warnings: [],
    foldedGroupCount: foldedPaths.length === 0 ? null : foldedPaths.length,
  }
}

function journeyPanel(panelId: string, seriesIds: string[], measureLabelKey: string): ReportPanel {
  return {
    panelId,
    titleKey: 'rb.panel.journey',
    /* See `resolveFunnel`'s panel for why `measure` travels here. */
    titleParams: { measure: measureLabelKey },
    unit: 'count',
    currency: null,
    seriesIds,
  }
}

/**
 * The events a journey over this subject can step through — one per
 * (store, date field, predicate), preferring a flow. See `resolveJourney`.
 *
 * A measure this viewer may not read is left out, because a path built through
 * it would report the shape of data behind a permission (§13.1). The catalogue
 * as seeded has no permissioned measure that wins its group, so today this
 * removes nothing; it is here so that adding one does not open a side channel.
 */
function journeyVocabulary(kind: SubjectKind, ctx: ResolveContext): Measure[] {
  const groups = new Map<string, Measure>()
  for (const measure of Object.values(measuresByKey)) {
    const { resource, timeField, predicate } = measure.population
    if (subjectKindOf(resource) !== kind) continue
    if (blockedFor(measure, ctx)) continue
    const key = `${resource}|${timeField}|${JSON.stringify(predicate)}`
    const held = groups.get(key)
    if (!held) groups.set(key, measure)
    else if (held.temporality !== 'flow' && measure.temporality === 'flow') groups.set(key, measure)
  }
  /* Catalogue order is not guaranteed by `Object.values` across engines for
     integer-like keys; measure keys are not integer-like, so insertion order
     holds. Sorted anyway: determinism here decides which of two equal paths
     is drawn first. */
  return [...groups.values()].sort((a, b) => a.key.localeCompare(b.key))
}

/**
 * **Which series share a y-axis.**
 *
 * One panel per measure per group. A period comparison reuses its current
 * series' panel, because it is the same measure over the same population at the
 * same scale.
 *
 * **This function is the whole of R4-1.** If §12 D-12 is ever signed and a
 * categorical palette minted, two measures share a panel by returning one id
 * here for both. No type changes, no screen changes, no saved report migrates.
 */
function panelIdFor(measureKey: string, groupValue: string | null): string {
  return groupValue === null ? `p:${measureKey}` : `p:${measureKey}:${groupValue}`
}

/* ────────────────────────── one series ─────────────────────────────────── */

interface BuildArgs {
  measure: Measure
  query: ReportQuery
  buckets: IsoDate[]
  window: { from: IsoDate; to: IsoDate }
  groupValue: string | null
  topGroups: string[]
  role: 'current' | 'comparison'
  panelId: string
  partials: number[]
  blocked: PermissionKey | null
  failed: { code: string; retryable: boolean } | null
}

function buildSeries(args: BuildArgs): { series: ReportSeries; truncated: boolean; hadGap: boolean } {
  const { measure, query, buckets, groupValue, topGroups, role, panelId, partials, blocked, failed } = args
  const id = `${measure.key}#${groupValue ?? '_'}#${role}`

  if (blocked || failed) {
    return {
      /* No points. Redaction is at the data layer; a client-side filter over a
         full payload is not a permission control, it is a rendering choice with
         the data still in the response (§13.1). */
      series: {
        id,
        measureKey: measure.key,
        groupValue,
        role,
        panelId,
        unit: measure.unit,
        currency: measure.currency,
        temporality: measure.temporality,
        points: [],
        partialBucketIndexes: [],
        blocked,
        failed,
      },
      truncated: false,
      hadGap: false,
    }
  }

  const source = SOURCES[measure.population.resource]
  if (!source) {
    throw new Error(
      `Measure "${measure.key}" declares population "${measure.population.resource}", which no source reads. ` +
        `A population that cannot be read is a measure that should not be in the catalogue (R5-15).`,
    )
  }

  const capped = source.rows.slice(0, rowCap)
  const truncated = capped.length < source.rows.length
  const groupField = query.groupBy === null ? null : source.fields[query.groupBy] ?? null

  const rows = capped.filter((row) => {
    if (!matchesAll(row, measure.population.predicate, source)) return false
    if (!matchesAll(row, query.filters, source)) return false
    if (groupValue === null || groupField === null) return true
    const key = String(groupField(row) ?? '')
    /* `Other` is the complement of the eight named groups, so its value is the
       tail's real total and not a placeholder. */
    return groupValue === OTHER ? !topGroups.includes(key) : key === groupValue
  })

  const points: (number | null)[] = []
  let hadGap = false
  const coverage = measure.population.coverage

  for (const bucketStart of buckets) {
    const span = bucketSpan(bucketStart, query.grain, args.window)
    /* Outside the store's declared coverage the answer is unknown, and unknown
       is `null`. Inside it, "no rows" is a real zero. */
    if (span.last < coverage.from || span.first > coverage.to) {
      points.push(null)
      hadGap = true
      continue
    }
    points.push(valueForBucket(measure, source, rows, span.first, span.last))
  }

  return {
    series: {
      id,
      measureKey: measure.key,
      groupValue,
      role,
      panelId,
      unit: measure.unit,
      currency: measure.currency,
      temporality: measure.temporality,
      points,
      partialBucketIndexes: partials,
      blocked: null,
      failed: null,
    },
    truncated,
    hadGap,
  }
}

/** The inclusive day range a bucket covers. `grain: 'none'` is the whole window, one bucket. */
function bucketSpan(
  bucketStart: IsoDate,
  grain: ReportGrain,
  window: { from: IsoDate; to: IsoDate },
): { first: IsoDate; last: IsoDate } {
  if (grain === 'none') return { first: window.from, last: window.to }
  const g = grain as 'day' | 'week' | 'month'
  return { first: bucketStart, last: addDays(bucketEndExclusive(bucketStart, g), -1) }
}

/**
 * One bucket, one number.
 *
 * The two temporality rules of §6.2, and nothing else:
 *
 *   **stock** — read as at the bucket's last instant. Changing the grain changes
 *   the sampling density and never the values (AC-820).
 *
 *   **flow** — aggregate over the bucket. Changing the grain changes every
 *   value: weekly new subscriptions are roughly seven times daily, and the
 *   shape is not the same shape (AC-821).
 */
function valueForBucket(
  measure: Measure,
  source: RowSource<AnyRow>,
  rows: readonly AnyRow[],
  first: IsoDate,
  last: IsoDate,
): number | null {
  const { bucketAggregate, population } = measure

  if (bucketAggregate === 'cumulative-count' || bucketAggregate === 'end-of-period') {
    const liveAt = source.liveAt
    if (!liveAt) return null
    return rows.filter((row) => liveAt(row, last)).length
  }

  const inBucket = rows.filter((row) => {
    const d = source.dateOf(row, population.timeField)
    return d !== null && d >= first && d <= last
  })

  if (bucketAggregate === 'count') return inBucket.length
  if (bucketAggregate === 'sum') {
    return inBucket.reduce((total, row) => total + source.valueOf(row, population.valueField), 0)
  }
  /* mean — a rate is meaned, never summed. An empty bucket has no mean, and
     `null` is the honest answer: `0 %` cancellations on a day with no trips is
     a claim nobody measured. */
  if (inBucket.length === 0) return null
  const sum = inBucket.reduce((total, row) => total + source.valueOf(row, population.valueField), 0)
  return Math.round((sum / inBucket.length) * 10) / 10
}

/* ──────────────────────────── grouping ─────────────────────────────────── */

interface Grouping {
  values: (string | null)[]
  folded: number
  /** The named groups, so an `Other` series knows what it is the complement of. */
  top: string[]
}

/**
 * The groups a split produces, ranked by total descending, folded at eight.
 *
 * *"Silently dropping the tail is how a report tells an operator that the long
 * tail does not exist."* — §7.4. So the ninth and beyond become one `Other`
 * series, the legend names how many were folded, and the result carries
 * `groups-folded`.
 */
export function groupsFor(measure: Measure, query: ReportQuery): Grouping {
  if (query.groupBy === null) return { values: [null], folded: 0, top: [] }
  const source = SOURCES[measure.population.resource]
  const get = source?.fields[query.groupBy]
  if (!source || !get) return { values: [null], folded: 0, top: [] }

  const totals = new Map<string, number>()
  for (const row of source.rows.slice(0, rowCap)) {
    if (!matchesAll(row, measure.population.predicate, source)) continue
    if (!matchesAll(row, query.filters, source)) continue
    const key = String(get(row) ?? '')
    if (key === '') continue
    totals.set(key, (totals.get(key) ?? 0) + source.valueOf(row, measure.population.valueField))
  }

  const ranked = [...totals.entries()]
    /* Deterministic: total descending, then key ascending. A tie must not
       reshuffle between renders or visual regression cannot diff it. */
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], ['ar', 'en']))
    .map(([key]) => key)

  if (ranked.length <= MAX_GROUPS) return { values: ranked, folded: 0, top: ranked }
  const top = ranked.slice(0, MAX_GROUPS)
  return { values: [...top, OTHER], folded: ranked.length - MAX_GROUPS, top }
}

function matchesAll(row: AnyRow, filters: readonly FilterSpec[], source: RowSource<AnyRow>): boolean {
  return filters.every((f) => {
    const get = source.fields[f.field]
    /* A filter naming a field this source does not have cannot narrow it, and
       silently ignoring it would apply the filter to one series and not the
       other — the exact failure §3.4 refuses. The planner rejects such a query
       before it reaches here; this is the belt to that brace. */
    if (!get) return false
    return matchesFilter(get(row), f)
  })
}
