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

import { currentRowCap } from './rowCap'
import { dailySnapshotFixtures } from '../fixtures/dailySnapshots'
import { allDriverFixtures } from '../fixtures/drivers'
import { riderFixtures } from '../fixtures/riders'
import { allSubscriptionFixtures } from '../fixtures/subscriptions'
import { allTripFixtures } from '../fixtures/trips'
import { allRequestFixtures } from '../fixtures/requests'
import { measuresByKey } from '../fixtures/measures'
import { segmentFixtures } from '../fixtures/segments'
import {
  addDays,
  bucketEndExclusive,
  bucketStarts,
  comparisonWindow,
  daysInclusive,
  localDayOf,
  partialBucketIndexes,
  resolveWindow,
} from '../reporting/buckets'
import { percentile } from '../reporting/distribution'
import {
  MAX_GROUPS,
  MAX_JOURNEY_DEPTH,
  cohortIntervals,
  planQuery,
  type Catalogue,
} from '../reporting/plan'
import { buildCohortMatrix } from '../reporting/cohorts'
import { subjectKindOf, type SubjectKind } from '../reporting/subjects'
import { dropoffByGroup, medianDaysToNextStep } from '../reporting/funnelSteps'
import {
  OTHER,
  resolveFormulaLeg,
  resolveTrendLeg,
  type CoreLegResult,
  type CoreMeasureRows,
  type CoreRow,
} from '../reporting/resolve/core'
import { EYVAR_NOW } from './clock'
import { matchesFilter } from './query'
import type { FilterSpec, IsoDate } from '../types/common'
import type { BucketAggregate, Measure } from '../types/measure'
import type { PermissionKey } from '../types/navigation'
import {
  DEFAULT_COMPARISON_DISPLAY,
  DEFAULT_REPORT_TRANSFORM,
  normaliseReportQuery,
  REPORT_GROUP_BY_MAX,
} from '../types/report'
import type {
  FunnelStep,
  FunnelStepDetail,
  ReportPanel,
  ReportQuery,
  ReportResult,
  ReportSeries,
  ReportWarning,
} from '../types/report'
import type { PerformedSpec, SegmentRef } from '../types/segment'

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
      /* ARPA — same-row revenue ÷ same-row active count, never the
         row-level `subscriptions.active` stock (file header). `activeSubs`
         is never 0 across the 30 seeded rows; the guard is defensive, not
         exercised — a genuine zero belongs in `dailySnapshots.ts`, not here. */
      case 'arpaHalalas':
        return s.activeSubs > 0 ? Math.round(s.subRevenueHalalas / s.activeSubs) : 0
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

const requestSource: RowSource<(typeof allRequestFixtures)[number]> = {
  rows: allRequestFixtures,
  /* Bucketed by when the request came in, the SLA clock's own start. */
  dateOf: (r) => localDayOf(r.requestedAt),
  /* Minutes from request to captain assignment. The population predicate
     (`request.assignedAt` isNotNull) already keeps an unassigned row out of
     `rows`, so the `null` branch here is the belt to that brace, never load-
     bearing on its own — see `matchesAll`'s comment on the same pattern. */
  valueOf: (r) => (r.assignedAt === null ? 0 : (Date.parse(r.assignedAt) - Date.parse(r.requestedAt)) / 60_000),
  liveAt: null,
  subject: { kind: 'rider', idOf: (r) => r.riderId },
  fields: {
    'request.assignedAt': (r) => r.assignedAt,
  },
}

/** `population.resource` → how to read it. The only mapping of its kind. */
const SOURCES: Record<string, RowSource<AnyRow>> = {
  drivers: driverSource as unknown as RowSource<AnyRow>,
  riders: riderSource as unknown as RowSource<AnyRow>,
  subscriptions: subscriptionSource as unknown as RowSource<AnyRow>,
  trips: tripSource as unknown as RowSource<AnyRow>,
  'daily-snapshots': snapshotSource as unknown as RowSource<AnyRow>,
  requests: requestSource as unknown as RowSource<AnyRow>,
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
/* The cap and its two QA seams live in `./rowCap`, which imports no fixture —
   see that file for why the split is a bug fix rather than tidiness. */

/* ──────────────────────────── the resolver ─────────────────────────────── */

export interface ResolveContext {
  /** The **requesting** viewer's permissions, not the report owner's. §13.1. */
  permissions: readonly PermissionKey[]
  /** The fixed clock's day. Passed, never read from a global. */
  today: IsoDate
  /** Measure keys whose series should come back failed — reaches §8.3 state 10. */
  failMeasureKeys?: readonly string[]
}

/** §7.4's fold bucket, re-exported so `clients/index.ts`'s `OTHER_GROUP` keeps resolving. */
export { OTHER }

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

  /* `reports.ts` calls this directly, never through `normaliseReportQuery`, so
     a v1 caller's `groupBy: null` is still real at runtime (AC-1100). `query`
     itself still echoes on the result — §8.3 state 2 compares it by
     reference — so only the local `q` is normalised. */
  const q = normaliseReportQuery(query)

  /* ── the five modes ───────────────────────────────────────────────────── */
  /* `trend` and `table` fall through and resolve exactly as they always have:
     one is the other's numbers listed instead of drawn, and neither needs a
     line here. The other three ask about **people over time** rather than
     numbers over time, so each has its own resolver below — and each returns
     the same `ReportResult` shape, which is what lets one CSV exporter, one
     alert rule and one dashboard tile serve all five (P7-T3). */
  if (q.mode === 'funnel') return resolveFunnel(query, q, window, ctx)
  if (q.mode === 'cohort') return resolveCohort(query, q, window, ctx)
  if (q.mode === 'journey') return resolveJourney(query, q, window, ctx)

  const buckets = bucketStarts(window.from, window.to, q.grain)
  const partials = partialBucketIndexes(buckets, q.grain, window, ctx.today)
  const warnings = new Set<ReportWarning>()

  if (partials.includes(0)) warnings.add('partial-first')
  if (buckets.length > 0 && partials.includes(buckets.length - 1)) warnings.add('partial-last')

  /* `planQuery` normalises on entry (AC-1100), same as this function, so the
     original (possibly v1) `query` is a legal argument here too. */
  const plan = planQuery(query, catalogue, ctx.today)
  if (plan.chartTypeCoerced) warnings.add('grain-coarsened')

  const groupBy = q.groupBy.slice(0, REPORT_GROUP_BY_MAX)
  const transform = q.transform ?? DEFAULT_REPORT_TRANSFORM
  const comparisonDisplay = q.comparisonDisplay ?? DEFAULT_COMPARISON_DISPLAY
  /* G5: `[]` or absent means "everyone" — one iteration, the whole population. */
  const segments: (SegmentRef | null)[] = q.segments && q.segments.length > 0 ? q.segments : [null]
  const comparisonWin = q.periodComparison !== 'none' ? comparisonWindow(window, q.periodComparison) : null

  const measures = q.measures
    .map((ref) => ({ ref, measure: measuresByKey[ref.key] }))
    .filter((m): m is { ref: (typeof q.measures)[number]; measure: Measure } => Boolean(m.measure))

  const panels: ReportPanel[] = []
  const series: ReportSeries[] = []
  let truncated = false
  let foldedGroupCount: number | null = null
  const addFolded = (n: number | null): void => {
    if (n !== null && n > 0) {
      warnings.add('groups-folded')
      foldedGroupCount = (foldedGroupCount ?? 0) + n
    }
  }

  if (q.formula && measures[0]) {
    /* G2: a formula replaces the measure series in the plot — one leg, not
       one per measure. `resolveFormulaLeg` groups by A's rows and reuses the
       same paths against B's, so the two align group for group. */
    const a = measures[0].measure
    const b = measures[1]?.measure ?? null
    for (const [segIndex, segment] of segments.entries()) {
      const idSuffix = segments.length > 1 ? `#seg${segIndex}` : ''
      const resolved = resolveSegment(segment, b ? [a, b] : [a], window)
      if (resolved.failed) {
        emitRedacted(a, idSuffix, { blocked: null, failed: resolved.failed }, panels, series)
        continue
      }
      const aInput = buildMeasureRows(a, resolveAggregate(measures[0].ref, a), q, resolved.filters, resolved.subjectAllow)
      const bInput = b ? buildMeasureRows(b, resolveAggregate(measures[1]!.ref, b), q, resolved.filters, resolved.subjectAllow) : null
      truncated = truncated || aInput.truncated || (bInput?.truncated ?? false)
      const groupLevels = effectiveLevels(a, groupBy)
      const leg = resolveFormulaLeg({
        formula: q.formula,
        a: aInput.rows,
        b: bInput ? bInput.rows : null,
        groupLevels,
        transform,
        comparisonDisplay,
        window,
        comparisonWindow: comparisonWin,
        grain: q.grain,
        today: ctx.today,
      })
      emitLeg(leg, 'rb.canvas.heading', idSuffix, panels, series, warnings, addFolded)
    }
  } else {
    for (const { ref, measure } of measures) {
      /* §13.1 — authorised per viewer, per measure, at the data layer. A blocked
         series carries **no points**, verified against the response (AC-888). */
      const required = measure.permission
      const blocked: PermissionKey | null =
        required && !ctx.permissions.includes(required.key) ? required.key : null
      const failed = ctx.failMeasureKeys?.includes(measure.key)
        ? { code: 'series_failed', retryable: true }
        : null

      if (blocked || failed) {
        emitRedacted(measure, '', { blocked, failed }, panels, series)
        continue
      }

      for (const [segIndex, segment] of segments.entries()) {
        const idSuffix = segments.length > 1 ? `#seg${segIndex}` : ''
        const resolved = resolveSegment(segment, [measure], window)
        if (resolved.failed) {
          emitRedacted(measure, idSuffix, { blocked: null, failed: resolved.failed }, panels, series)
          continue
        }
        const input = buildMeasureRows(measure, resolveAggregate(ref, measure), q, resolved.filters, resolved.subjectAllow)
        truncated = truncated || input.truncated
        const groupLevels = effectiveLevels(measure, groupBy)
        const leg = resolveTrendLeg({
          measure: input.rows,
          groupLevels,
          transform,
          comparisonDisplay,
          window,
          comparisonWindow: comparisonWin,
          grain: q.grain,
          today: ctx.today,
        })
        emitLeg(leg, measure.labelKey, idSuffix, panels, series, warnings, addFolded)
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
    truncatedAtRows: truncated ? currentRowCap() : null,
    warnings: [...warnings],
    foldedGroupCount,
  }
}

/* ─────────────────── one leg, filed as panels and series ───────────────── */

/**
 * `CoreLegResult` → the wire shape, mechanical: one panel and one-or-two
 * series (current, and comparison when asked) per group. `idSuffix` is empty
 * unless more than one segment is in play, in which case every id from it
 * carries `#seg<n>` — the ordinary, single-segment id is untouched, matching
 * AC-1123's format exactly (`<measure>#<g1>|<g2>#<role>`).
 */
function emitLeg(
  leg: CoreLegResult,
  measureLabelKey: string,
  idSuffix: string,
  panels: ReportPanel[],
  series: ReportSeries[],
  warnings: Set<ReportWarning>,
  addFolded: (n: number | null) => void,
): void {
  addFolded(leg.foldedGroupCount)
  if (leg.hadGap) warnings.add('gaps-outside-fixture-range')

  for (const group of leg.groups) {
    const panelId = panelIdFor(leg.measureKey, group.groupValue)
    const panel: ReportPanel = {
      panelId,
      titleKey: group.groupValue === null ? 'rb.panel.measure' : 'rb.panel.measureByGroup',
      titleParams:
        group.groupValue === null
          ? { measure: measureLabelKey }
          : { measure: measureLabelKey, group: group.groupValue },
      unit: group.current.unit,
      currency: group.current.currency,
      seriesIds: [],
    }
    panels.push(panel)

    const currentId = `${leg.measureKey}#${group.groupValue ?? '_'}#current${idSuffix}`
    series.push({
      id: currentId,
      measureKey: leg.measureKey,
      groupValue: group.groupValue,
      role: 'current',
      panelId,
      unit: group.current.unit,
      currency: group.current.currency,
      temporality: leg.temporality,
      points: group.current.points,
      partialBucketIndexes: leg.partialBucketIndexes,
      blocked: null,
      failed: null,
    })
    panel.seriesIds.push(currentId)

    if (group.comparison) {
      const comparisonId = `${leg.measureKey}#${group.groupValue ?? '_'}#comparison${idSuffix}`
      series.push({
        id: comparisonId,
        measureKey: leg.measureKey,
        groupValue: group.groupValue,
        role: 'comparison',
        panelId,
        unit: group.comparison.unit,
        currency: group.comparison.currency,
        temporality: leg.temporality,
        points: group.comparison.points,
        partialBucketIndexes: [],
        blocked: null,
        failed: null,
      })
      panel.seriesIds.push(comparisonId)
    }
  }
}

/** One redacted series (blocked or failed) — no points, its own single-series panel. §13.1 / AC-888. */
function emitRedacted(
  measure: Measure,
  idSuffix: string,
  reason: { blocked: PermissionKey | null; failed: { code: string; retryable: boolean } | null },
  panels: ReportPanel[],
  series: ReportSeries[],
): void {
  const panelId = panelIdFor(measure.key, null)
  const panel: ReportPanel = {
    panelId,
    titleKey: 'rb.panel.measure',
    titleParams: { measure: measure.labelKey },
    unit: measure.unit,
    currency: measure.currency,
    seriesIds: [],
  }
  panels.push(panel)
  const id = `${measure.key}#_#current${idSuffix}`
  series.push({
    id,
    measureKey: measure.key,
    groupValue: null,
    role: 'current',
    panelId,
    unit: measure.unit,
    currency: measure.currency,
    temporality: measure.temporality,
    points: [],
    partialBucketIndexes: [],
    blocked: reason.blocked,
    failed: reason.failed,
  })
  panel.seriesIds.push(id)
}

/** G1: a legal `MeasureRef.aggregate` override, or the catalogue's own. */
function resolveAggregate(ref: { aggregate?: BucketAggregate }, measure: Measure): BucketAggregate {
  if (ref.aggregate && measure.bucketAggregateOptions?.includes(ref.aggregate)) return ref.aggregate
  return measure.bucketAggregate
}

/** How many split levels this measure's own store can actually answer — never more than the query asks for. */
function effectiveLevels(measure: Measure, groupBy: readonly string[]): 0 | 1 | 2 {
  const source = SOURCES[measure.population.resource]
  const level0 = source && groupBy[0] ? Boolean(source.fields[groupBy[0]]) : false
  if (!level0) return 0
  const level1 = source && groupBy[1] ? Boolean(source.fields[groupBy[1]]) : false
  return level1 ? 2 : 1
}

/* ───────────────────────────── segments (G5) ───────────────────────────── */

interface SegmentResolution {
  filters: FilterSpec[]
  /** Subjects the `performed` clause admits, or `null` when there is none to apply. */
  subjectAllow: Set<string> | null
  failed: { code: string; retryable: boolean } | null
}

/**
 * A segment narrows the measure's population before bucketing (§2.5).
 * `'saved'` resolves against `segmentFixtures` (F-V2-18); an unknown id is a
 * refusal, `segment-not-found`, never a silent fall-through to "everyone".
 * `performed` (AC-1122) needs a subject on both measures or is refused with
 * `segment-performed-unsupported`.
 */
function resolveSegment(
  segment: SegmentRef | null,
  measures: readonly Measure[],
  window: { from: IsoDate; to: IsoDate },
): SegmentResolution {
  if (!segment) return { filters: [], subjectAllow: null, failed: null }
  if (segment.kind === 'saved') {
    const saved = segmentFixtures.find((s) => s.id === segment.id)
    if (!saved) return { filters: [], subjectAllow: null, failed: { code: 'segment-not-found', retryable: false } }
    return resolveSegment(
      { kind: 'inline', label: saved.name, filters: saved.filters, performed: saved.performed ?? undefined },
      measures,
      window,
    )
  }

  const filters = segment.filters ?? []
  if (!segment.performed) return { filters, subjectAllow: null, failed: null }

  const everySubjectShaped = measures.every((m) => subjectKindOf(m.population.resource) !== null)
  const performedMeasure = measuresByKey[segment.performed.measureKey]
  const performedIsSubject = performedMeasure ? subjectKindOf(performedMeasure.population.resource) !== null : false

  if (!everySubjectShaped || !performedMeasure || !performedIsSubject) {
    return { filters, subjectAllow: null, failed: { code: 'segment-performed-unsupported', retryable: false } }
  }

  return { filters, subjectAllow: subjectsMeetingPerformed(performedMeasure, segment.performed, window), failed: null }
}

/**
 * `subjectId → how many times its rows matched, within `window`` — then the
 * ids meeting `op`/`count`. A deliberate simplification (WP-1.6 report):
 * `PerformedSpec.window`'s `'each-bucket'` vs `{rollingDays}` distinction is
 * not applied per bucket here, only over the whole report window; a bucket-
 * accurate mock is future work, not a change this package's ACs ask for.
 */
function subjectsMeetingPerformed(
  performedMeasure: Measure,
  spec: PerformedSpec,
  window: { from: IsoDate; to: IsoDate },
): Set<string> {
  const source = SOURCES[performedMeasure.population.resource]
  const allow = new Set<string>()
  if (!source || !source.subject) return allow

  const counts = new Map<string, number>()
  for (const row of source.rows.slice(0, currentRowCap())) {
    if (!matchesAll(row, performedMeasure.population.predicate, source)) continue
    const date = source.dateOf(row, performedMeasure.population.timeField)
    if (date === null || date < window.from || date > window.to) continue
    const id = source.subject.idOf(row)
    if (!id) continue
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  for (const [id, n] of counts) {
    const meets = spec.op === 'gte' ? n >= spec.count : spec.op === 'lte' ? n <= spec.count : n === spec.count
    if (meets) allow.add(id)
  }
  return allow
}

/* ─────────────────────── measure rows, for one leg ──────────────────────── */

/**
 * Every row matching a measure's population, the query's own filters and (if
 * segmented) the segment's, flattened to `CoreRow` — the only place fixture
 * field names (`driver.city`, `trip.kind`, …) are read for the trend/table
 * path. Not window-filtered: `resolveTrendLeg`/`resolveFormulaLeg` bucket the
 * same set twice, current and comparison.
 */
function buildMeasureRows(
  measure: Measure,
  bucketAggregate: BucketAggregate,
  query: ReportQuery,
  extraFilters: readonly FilterSpec[],
  subjectAllow: Set<string> | null,
): { rows: CoreMeasureRows; truncated: boolean } {
  const source = SOURCES[measure.population.resource]
  if (!source) {
    throw new Error(
      `Measure "${measure.key}" declares population "${measure.population.resource}", which no source reads. ` +
        `A population that cannot be read is a measure that should not be in the catalogue (R5-15).`,
    )
  }

  const capped = source.rows.slice(0, currentRowCap())
  const truncated = capped.length < source.rows.length
  const groupBy = query.groupBy.slice(0, REPORT_GROUP_BY_MAX)
  const level0 = groupBy[0] ? source.fields[groupBy[0]] ?? null : null
  const level1 = level0 && groupBy[1] ? source.fields[groupBy[1]] ?? null : null
  const liveAtOf = source.liveAt

  const rows: CoreRow[] = []
  for (const row of capped) {
    if (!matchesAll(row, measure.population.predicate, source)) continue
    if (!matchesAll(row, query.filters, source)) continue
    if (!matchesAll(row, extraFilters, source)) continue
    if (subjectAllow) {
      const id = source.subject ? source.subject.idOf(row) : null
      if (!id || !subjectAllow.has(id)) continue
    }
    rows.push({
      date: source.dateOf(row, measure.population.timeField),
      value: source.valueOf(row, measure.population.valueField),
      liveAt: liveAtOf ? (day: IsoDate) => liveAtOf(row, day) : null,
      groupKeys: [level0 ? String(level0(row) ?? '') : null, level1 ? String(level1(row) ?? '') : null],
    })
  }

  return {
    rows: {
      key: measure.key,
      unit: measure.unit,
      currency: measure.currency,
      temporality: measure.temporality,
      additive: measure.additive,
      bucketAggregate,
      coverage: measure.population.coverage,
      supportsStock: source.liveAt !== null,
      rows,
    },
    truncated,
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

  const capped = source.rows.slice(0, currentRowCap())
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

/**
 * `subjectId → the entry rung's own value of `groupBy`` — the same field
 * accessor `buildMeasureRows`' `level0` reads for a trend column, read once
 * off the population that seeds the funnel (AC-1170). `groupBy` naming a
 * field the entry resource does not have resolves to an empty map, same
 * silent no-op `level0` already makes when a resource lacks the field.
 */
function subjectGroupsOf(
  measure: Measure,
  filters: readonly FilterSpec[],
  window: { from: IsoDate; to: IsoDate },
  groupBy: string,
): Map<string, string | null> {
  const source = SOURCES[measure.population.resource]
  const field = source?.fields[groupBy]
  const out = new Map<string, string | null>()
  if (!source || !field || !source.subject) return out

  for (const row of source.rows.slice(0, currentRowCap())) {
    if (!matchesAll(row, measure.population.predicate, source)) continue
    if (!matchesAll(row, filters, source)) continue
    const date = source.dateOf(row, measure.population.timeField)
    if (date === null || date < window.from || date > window.to) continue
    const id = source.subject.idOf(row)
    if (!id || out.has(id)) continue
    const value = field(row)
    out.set(id, value === null ? null : String(value))
  }
  return out
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
/**
 * §5. `measuredAs` picks the shape: the cascade (default), a trend of the
 * final rung's conversion rate over entry date, or a distribution of how long
 * a converting subject took. All three read the same rungs the same way
 * (`computeFunnelCore`) so the three pictures cannot disagree about who
 * converted, only about how that fact is drawn.
 */
function resolveFunnel(
  original: ReportQuery,
  query: ReportQuery,
  window: { from: IsoDate; to: IsoDate },
  ctx: ResolveContext,
): ReportResult {
  const steps = query.funnel?.steps ?? []
  if (steps.length === 0) return emptyModeResult(original)

  /* `sequential` needs event-level ordering no store here has. `planQuery`
     refuses it without a capability flag (`funnel-needs-server`); reached
     directly — `reports.export` does this today, bypassing the planner — the
     resolver itself must refuse rather than quietly compute `ordered`'s
     answer under a different name. A silently wrong funnel is the one
     failure this product cannot produce. */
  if ((query.funnel?.mode ?? 'ordered') === 'sequential') {
    return emptyModeResult(original, ['funnel-sequential-not-resolved'])
  }

  const measuredAs = query.funnel?.measuredAs ?? 'conversion'
  if (measuredAs === 'conversion-over-time') return resolveFunnelOverTime(original, query, window, ctx)
  if (measuredAs === 'time-to-convert') return resolveFunnelTimeToConvert(original, query, window, ctx)
  return resolveFunnelConversion(original, query, window, ctx)
}

function resolveFunnelConversion(
  original: ReportQuery,
  query: ReportQuery,
  window: { from: IsoDate; to: IsoDate },
  ctx: ResolveContext,
): ReportResult {
  const steps = query.funnel?.steps ?? []
  const warnings = new Set<ReportWarning>()
  const panelId = 'p:funnel'
  const series: ReportSeries[] = []
  let truncated = false

  const rungs = steps.map((step) => ({ step, measure: measuresByKey[step.measureKey] ?? null }))
  const kinds = rungs.map((r) => (r.measure ? subjectKindOf(r.measure.population.resource) : null))
  const first = kinds[0] ?? null
  const follow = first !== null && kinds.every((k) => k === first)
  if (!follow) warnings.add('funnel-counted-not-followed')

  const funnelMode = query.funnel?.mode ?? 'ordered'
  const windowDays = conversionWindowDays(query.funnel?.conversionWindow ?? null)
  const groupByKey = query.funnel?.groupBy ?? null

  /* `subjectId → the date of its event at the rung reached so far`, and the
     date of its FIRST rung, which the conversion window is measured from. */
  let reached: Map<string, IsoDate> = new Map()
  const entered = new Map<string, IsoDate>()
  /* A blocked rung stops the funnel there: every rung after it is derived from
     a population this viewer may not read, so reporting a number for it would
     leak the blocked one by subtraction. */
  let blockedFrom = false

  /* AC-1170 — one run, one query. `reachedByRung`/`detailSeriesIds` walk in
     lockstep with the non-blocked, measure-found rungs `series` gains below —
     the same set `FunnelCascade` renders as `rungs` — so a rung's detail is
     read off the query that already ran, never a second one (WP-3.5 ruling). */
  const reachedByRung: (ReadonlyMap<string, IsoDate> | null)[] = []
  const detailSeriesIds: string[] = []
  let groupOf: ((subjectId: string) => string | null) | null = null

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
      /* The entry rung's own row carries the subject's group value — a rider's
         city does not change mid-funnel, so one read here stands for the whole
         cascade rather than a lookup repeated, and possibly disagreeing, per
         rung (AC-1170). `undefined` when the entry resource has no such field,
         same silent no-op a trend's own `groupBy` already makes (`level0`). */
      if (groupByKey) {
        const groups = subjectGroupsOf(measure, [...query.filters, ...(step.filters ?? [])], window, groupByKey)
        groupOf = (id) => groups.get(id) ?? null
      }
    } else {
      const bySubject = groupBySubject(set.events)
      const next = new Map<string, IsoDate>()
      reached.forEach((previousDate, id) => {
        const startedOn = entered.get(id) ?? previousDate
        const deadline = windowDays === null ? window.to : addDays(startedOn, windowDays)
        /* `unordered` (G10): still bounded by the conversion window from
           ENTRY, but not required to fall after the previous rung's own
           date — the three rungs may land in any order. `ordered` keeps the
           `>= previousDate` requirement; `sequential` never reaches here —
           `resolveFunnel` refuses it before dispatching to this function. */
        const earliestLegal = funnelMode === 'unordered' ? startedOn : previousDate
        const match = (bySubject.get(id) ?? []).find((e) => e.date >= earliestLegal && e.date <= deadline)
        if (match) next.set(id, match.date)
      })
      reached = next
      count = reached.size
    }

    reachedByRung.push(follow ? reached : null)
    detailSeriesIds.push(`${measure.key}#${groupValue}#current`)

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

  /* AC-1170 — the rung's own median-to-next and drop-off-by-group, built from
     the maps this same run already produced (`reachedByRung`), never a second
     `eventsOf` pass. A `null` at either edge of a pair (no next rung, no
     previous rung, or nobody followed) reads as "no one", not `0`. */
  const funnelStepDetail: FunnelStepDetail[] = detailSeriesIds.map((seriesId, i) => {
    const current = reachedByRung[i] ?? null
    const next = reachedByRung[i + 1] ?? null
    const previous = i > 0 ? reachedByRung[i - 1] ?? null : null
    return {
      seriesId,
      medianDaysToNext: current && next ? medianDaysToNextStep(current, next) : null,
      dropoffGroups: groupByKey && groupOf && previous && current ? dropoffByGroup(previous, current, groupOf) : null,
    }
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
    query: original,
    asOf: EYVAR_NOW,
    /* One bucket: the window, collapsed. A funnel's x-axis is its rungs, which
       is exactly what `grain: 'none'` already means (§3.5). */
    buckets: [window.from],
    panels: [panel],
    series,
    truncated,
    truncatedAtRows: truncated ? currentRowCap() : null,
    warnings: [...warnings],
    foldedGroupCount: null,
    funnelStepDetail,
  }
}

/**
 * §5's `conversion-over-time`: the last rung's conversion rate, bucketed by
 * ENTRY date at `query.grain`. A bucket nobody entered is `null` — a rate over
 * zero entrants is not zero, it is undefined, the same rule §4.4.1 states for
 * a gap outside a store's coverage.
 */
function resolveFunnelOverTime(
  original: ReportQuery,
  query: ReportQuery,
  window: { from: IsoDate; to: IsoDate },
  ctx: ResolveContext,
): ReportResult {
  const steps = query.funnel?.steps ?? []
  const rungs = funnelRungs(steps)
  if (rungs.length === 0) return emptyModeResult(original)

  const blocked = firstBlockedRung(rungs, ctx)
  const panelId = 'p:funnel-trend'
  const buckets = bucketStarts(window.from, window.to, query.grain)
  const firstMeasure = rungs[0]!.measure

  if (blocked) {
    return {
      ...emptyModeResult(original),
      buckets,
      panels: [{ panelId, titleKey: 'rb.panel.funnel', titleParams: { measure: firstMeasure.labelKey }, unit: 'percent', currency: null, seriesIds: [`${firstMeasure.key}#_#current`] }],
      series: [redactedSeries(firstMeasure, '_', panelId, blocked)],
    }
  }

  const funnelMode = query.funnel?.mode ?? 'ordered'
  const windowDays = conversionWindowDays(query.funnel?.conversionWindow ?? null)
  const points: (number | null)[] = buckets.map((bucketStart) => {
    const entryGrain = query.grain === 'none' || query.grain === 'hour' ? 'day' : query.grain
    const entryTo = addDays(bucketEndExclusive(bucketStart, entryGrain), -1)
    const core = computeFunnelCore(rungs, query.filters, window, funnelMode, windowDays, { from: bucketStart, to: entryTo })
    if (!core.follow) return null
    const enteredCount = core.reachedByRung[0]?.size ?? 0
    const lastCount = core.reachedByRung[core.reachedByRung.length - 1]?.size ?? 0
    /* Nobody entered in this bucket: the rate is unknown, not `0 %` — the
       same "a gap is `null`" rule every other trend in this file follows. */
    return enteredCount === 0 ? null : Math.round((lastCount / enteredCount) * 1000) / 10
  })

  const lastMeasure = rungs[rungs.length - 1]!.measure
  const seriesId = `${lastMeasure.key}#_#current`
  return {
    query: original,
    asOf: EYVAR_NOW,
    buckets,
    panels: [{ panelId, titleKey: 'rb.panel.funnel', titleParams: { measure: firstMeasure.labelKey }, unit: 'percent', currency: null, seriesIds: [seriesId] }],
    series: [
      {
        id: seriesId,
        measureKey: lastMeasure.key,
        groupValue: null,
        role: 'current',
        panelId,
        unit: 'percent',
        currency: null,
        temporality: lastMeasure.temporality,
        points,
        partialBucketIndexes: partialBucketIndexes(buckets, query.grain, window, ctx.today),
        blocked: null,
        failed: null,
      },
    ],
    truncated: false,
    truncatedAtRows: null,
    warnings: [],
    foldedGroupCount: null,
  }
}

/**
 * §5's `time-to-convert`: p25/p50/p75/p90/p95 of how long a converting
 * subject took, in minutes (`MetricUnit` has no coarser duration). Five
 * panels of one reading each, for `DistributionCard`'s `bar` kind.
 */
function resolveFunnelTimeToConvert(
  original: ReportQuery,
  query: ReportQuery,
  window: { from: IsoDate; to: IsoDate },
  ctx: ResolveContext,
): ReportResult {
  const steps = query.funnel?.steps ?? []
  const rungs = funnelRungs(steps)
  if (rungs.length === 0) return emptyModeResult(original)

  const blocked = firstBlockedRung(rungs, ctx)
  const firstMeasure = rungs[0]!.measure
  if (blocked) {
    const panelId = 'p:funnel-ttc'
    return {
      ...emptyModeResult(original),
      panels: [{ panelId, titleKey: 'rb.panel.funnel', titleParams: { measure: firstMeasure.labelKey }, unit: 'minutes', currency: null, seriesIds: [`${firstMeasure.key}#_#current`] }],
      series: [redactedSeries(firstMeasure, '_', panelId, blocked)],
    }
  }

  const funnelMode = query.funnel?.mode ?? 'ordered'
  const windowDays = conversionWindowDays(query.funnel?.conversionWindow ?? null)
  const core = computeFunnelCore(rungs, query.filters, window, funnelMode, windowDays, window)

  const minutes: number[] = []
  if (core.follow) {
    const entered = core.reachedByRung[0] ?? new Map()
    const converted = core.reachedByRung[core.reachedByRung.length - 1] ?? new Map()
    converted.forEach((reachedDate, id) => {
      const startedOn = entered.get(id)
      if (!startedOn) return
      minutes.push((daysInclusive(startedOn, reachedDate) - 1) * 1440)
    })
  }

  const PERCENTILES = [25, 50, 75, 90, 95] as const
  const panels: ReportPanel[] = []
  const series: ReportSeries[] = []
  for (const p of PERCENTILES) {
    const panelId = `p:funnel-ttc-p${p}`
    const seriesId = `${firstMeasure.key}#p${p}#current`
    panels.push({
      panelId,
      titleKey: 'rb.funnel.timeToConvert.percentile',
      titleParams: { percentile: p },
      unit: 'minutes',
      currency: null,
      seriesIds: [seriesId],
    })
    series.push({
      id: seriesId,
      measureKey: firstMeasure.key,
      groupValue: `p${p}`,
      role: 'current',
      panelId,
      unit: 'minutes',
      currency: null,
      temporality: firstMeasure.temporality,
      points: [percentile(minutes, p)],
      partialBucketIndexes: [],
      blocked: null,
      failed: null,
    })
  }

  return {
    query: original,
    asOf: EYVAR_NOW,
    buckets: [window.from],
    panels,
    series,
    truncated: core.truncated,
    truncatedAtRows: core.truncated ? currentRowCap() : null,
    warnings: core.follow ? [] : ['funnel-counted-not-followed'],
    foldedGroupCount: null,
  }
}

/** Every step whose measure resolves, paired with it. An unknown rung is dropped, not thrown (`reports.export` resolves without planning first). */
function funnelRungs(steps: readonly FunnelStep[]): { step: FunnelStep; measure: Measure }[] {
  return steps
    .map((step) => ({ step, measure: measuresByKey[step.measureKey] }))
    .filter((r): r is { step: FunnelStep; measure: Measure } => Boolean(r.measure))
}

/** §13.1 — the first rung this viewer may not read, if any. */
function firstBlockedRung(rungs: readonly { measure: Measure }[], ctx: ResolveContext): PermissionKey | null {
  for (const rung of rungs) {
    const blocked = blockedFor(rung.measure, ctx)
    if (blocked) return blocked
  }
  return null
}

/**
 * §5's shared core: who reached each rung, and when. `entryWindow` narrows
 * rung 0 to one bucket for a trend, or the whole window for a distribution.
 * `!follow` returns an empty `reachedByRung` — no counted-totals fallback.
 */
function computeFunnelCore(
  rungs: readonly { step: FunnelStep; measure: Measure }[],
  queryFilters: readonly FilterSpec[],
  window: { from: IsoDate; to: IsoDate },
  mode: 'ordered' | 'unordered' | 'sequential',
  windowDays: number | null,
  entryWindow: { from: IsoDate; to: IsoDate },
): { reachedByRung: Map<string, IsoDate>[]; follow: boolean; truncated: boolean } {
  const kinds = rungs.map((r) => subjectKindOf(r.measure.population.resource))
  const first = kinds[0] ?? null
  const follow = first !== null && kinds.every((k) => k === first)

  const eventSets = rungs.map((r) => eventsOf(r.measure, [...queryFilters, ...(r.step.filters ?? [])], window))
  const truncated = eventSets.some((s) => s.truncated)
  if (!follow) return { reachedByRung: [], follow, truncated }

  const entered = earliestPerSubject(eventSets[0]!.events)
  const boundedEntered = new Map(
    [...entered].filter(([, date]) => date >= entryWindow.from && date <= entryWindow.to),
  )
  const reachedByRung: Map<string, IsoDate>[] = [boundedEntered]

  let carried = boundedEntered
  for (let i = 1; i < rungs.length; i += 1) {
    const bySubject = groupBySubject(eventSets[i]!.events)
    const next = new Map<string, IsoDate>()
    carried.forEach((previousDate, id) => {
      const startedOn = entered.get(id)!
      const deadline = windowDays === null ? window.to : addDays(startedOn, windowDays)
      const earliestLegal = mode === 'unordered' ? startedOn : previousDate
      const match = (bySubject.get(id) ?? []).find((e) => e.date >= earliestLegal && e.date <= deadline)
      if (match) next.set(id, match.date)
    })
    reachedByRung.push(next)
    carried = next
  }

  return { reachedByRung, follow, truncated }
}

/** G10's `{value, unit}` in days; `'week'` scales, `'hour'` rounds to same-day (sub-day windows are P3 work). `null` is the report window. */
function conversionWindowDays(cw: { value: number; unit: 'hour' | 'day' | 'week' } | null): number | null {
  if (cw === null) return null
  if (cw.unit === 'week') return cw.value * 7
  if (cw.unit === 'hour') return 0
  return cw.value
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
  original: ReportQuery,
  query: ReportQuery,
  window: { from: IsoDate; to: IsoDate },
  ctx: ResolveContext,
): ReportResult {
  const spec = query.cohort
  const anchor = spec?.anchorMeasureKey ? measuresByKey[spec.anchorMeasureKey] ?? null : null
  if (!spec || !anchor) return emptyModeResult(original)

  const panelId = 'p:cohort'
  /* §6: `bracket` names its own columns — `{lo}-{hi}`, in `cohortGrain` units —
     because `cohortIntervals` (the planner's `M0…M{horizon}` list) has no
     brackets to draw. Every other method keeps the planner's columns, so a
     saved alert on `M1` still points at the column it was written against. */
  const intervals =
    spec.method === 'bracket' && spec.brackets
      ? spec.brackets.map(([lo, hi]) => `${lo}-${hi}`)
      : cohortIntervals(spec.horizon)
  const blocked = blockedFor(anchor, ctx)
  if (blocked) {
    return {
      ...emptyModeResult(original),
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

  /* §6: OR-combined — "still here" is true the moment any named return event
     recorded it, so the merge keeps each subject's LATEST qualifying date. A
     blocked return measure is left out rather than leaking a number through it. */
  const returnMeasures = (spec.returnMeasureKeys ?? [])
    .map((k) => measuresByKey[k])
    .filter((m): m is Measure => Boolean(m && !blockedFor(m, ctx)))
  const returned =
    returnMeasures.length > 0
      ? mergeLatest(returnMeasures.map((m) => latestPerSubject(eventsOf(m, query.filters, window).events)))
      : null

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

  const matrix = buildCohortMatrix(entities, (e) => e.joinedAt, (e) => e.lastActiveAt, ctx.today, intervals, {
    grain: spec.cohortGrain,
    method: spec.method,
    brackets: spec.brackets,
  })

  /* `cohortStart` is always a full `IsoDate`, at every grain — `cohorts.ts`
     does the grain-specific formatting so this file does not string-build one. */
  const buckets = matrix.rows.map((row) => row.cohortStart)

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
    points: matrix.rows.map((row) => row.retentionByInterval[interval] ?? null),
    partialBucketIndexes: [],
    blocked: null,
    failed: null,
  }))

  return {
    query: original,
    asOf: EYVAR_NOW,
    buckets,
    panels: [cohortPanel(panelId, series.map((s) => s.id), anchor.labelKey)],
    series,
    truncated: anchorSet.truncated,
    truncatedAtRows: anchorSet.truncated ? currentRowCap() : null,
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

/** Several `latestPerSubject` maps, OR-combined: each subject keeps the latest date any of them recorded. */
function mergeLatest(maps: readonly Map<string, IsoDate>[]): Map<string, IsoDate> {
  const out = new Map<string, IsoDate>()
  for (const m of maps) {
    for (const [id, date] of m) {
      const held = out.get(id)
      if (held === undefined || date > held) out.set(id, date)
    }
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
  original: ReportQuery,
  query: ReportQuery,
  window: { from: IsoDate; to: IsoDate },
  ctx: ResolveContext,
): ReportResult {
  const spec = query.journey
  const root = spec?.rootMeasureKey ? measuresByKey[spec.rootMeasureKey] ?? null : null
  if (!spec || !root) return emptyModeResult(original)

  const panelId = 'p:journey'
  const kind = subjectKindOf(root.population.resource)
  const blocked = blockedFor(root, ctx)
  if (blocked || kind === null) {
    return {
      ...emptyModeResult(original),
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
    query: original,
    asOf: EYVAR_NOW,
    buckets: [window.from],
    panels: [journeyPanel(panelId, series.map((s) => s.id), root.labelKey)],
    series,
    truncated,
    truncatedAtRows: truncated ? currentRowCap() : null,
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

/* `buildSeries`, `bucketSpan` and `groupsFor` moved to
   `reporting/resolve/core.ts` (`resolveTrendLeg`/`resolveFormulaLeg`,
   `planGroupPaths`) as the pure aggregation core — WP-1.6. `buildMeasureRows`
   above is what replaced them here: population, predicate, filter and segment
   matching, flattened to the `CoreRow` shape core operates on. `valueForBucket`
   stays — `eventsOf`'s counted-funnel fallback still needs the one-window
   aggregate and does not go through `CoreRow` at all. */

/** One window, one number — `eventsOf`'s `total` for a rung nobody can be followed on. Same rules as `core.ts`'s `valueForSpan`. */
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
  /* mean — a rate is meaned, never summed. An empty bucket has no mean. */
  if (inBucket.length === 0) return null
  const sum = inBucket.reduce((total, row) => total + source.valueOf(row, population.valueField), 0)
  return Math.round((sum / inBucket.length) * 10) / 10
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

/* ────────────────────── sample rows (D44, T10) ──────────────────────────── */

/**
 * Masked fixture rows behind `reports.sample` (T10) — `resource`-scoped,
 * never joined across stores. `name → initials`, `phone → last 2 digits`,
 * every other field (including ids) unmasked, matching the field-name rule
 * the tool's own contract states rather than a per-resource PII schema.
 */
export function sampleRows(
  resource: string,
  filters: readonly FilterSpec[],
  limit: number,
  bucket?: IsoDate,
): Array<Record<string, unknown>> {
  const source = SOURCES[resource]
  if (!source) return []
  const capped = source.rows.slice(0, currentRowCap())
  const matching = capped.filter((row) => {
    if (!matchesAll(row, filters, source)) return false
    /* The row's own primary date — most sources ignore `timeField` and
       return it regardless, which is a reasonable default for a resource-
       scoped sample that names no measure to read a population field from. */
    return bucket === undefined || source.dateOf(row, '') === bucket
  })
  return matching.slice(0, Math.max(0, Math.min(limit, 50))).map((row) => maskRow(row as unknown as Record<string, unknown>))
}

function maskRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (typeof value === 'string' && /name/i.test(key)) out[key] = initialsOf(value)
    else if (typeof value === 'string' && /phone/i.test(key)) out[key] = lastTwoDigitsOf(value)
    else out[key] = value
  }
  return out
}

/** `Nora Al-Qahtani` → `N.A.`. Every whitespace-separated part contributes one initial. */
function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ''}.`)
    .join('')
}

/** `+966501234567` → `•••4567`'s tool-stated shape, the last two digits kept. */
function lastTwoDigitsOf(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return `••••${digits.slice(-2)}`
}
