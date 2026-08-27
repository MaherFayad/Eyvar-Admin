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
import { MAX_GROUPS, planQuery, type Catalogue } from '../reporting/plan'
import { EYVAR_NOW } from './clock'
import { matchesFilter } from './query'
import type { FilterSpec, IsoDate } from '../types/common'
import type { Measure } from '../types/measure'
import type { PermissionKey } from '../types/navigation'
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
