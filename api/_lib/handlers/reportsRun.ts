/**
 * `POST /api/v1/reports/run` — WP-6.4, `05-backend.md` §4, §6, §7.
 * `reports.run`'s client docblock (`src/data/clients/reports.ts`) types the
 * response bare (`-> ReportResult`, one of Q5's four bare-`T` endpoints), so
 * this handler returns the `ReportResult` JSON directly — never `single()`.
 *
 * A separate file from `handlers/reports.ts` (WP-6.5's saved-report CRUD
 * library, §7's other endpoints) on purpose: two agents building against the
 * same brief's endpoint list both reached for the name `reports.ts`, and
 * `AGENT-BRIEF.md` is explicit that a same-named file is a collision to
 * avoid, not resolve by overwriting. `reportsRun.ts` keeps this WP's own file
 * disjoint from theirs; only `[...route].ts`'s router wiring — a few lines,
 * anchored — is shared.
 *
 * Mirrors `src/data/mock/resolveReport.ts`'s control flow measure-by-measure
 * and segment-by-segment, but calls `compile.ts`'s `fetchMeasureRows` for the
 * population instead of a fixture array, and calls `resolveTrendLeg`/
 * `resolveFormulaLeg` — the **same functions the mock calls** — for
 * bucketing, aggregation, grouping and the comparison. See `compile.ts`'s
 * header for why that split is the compiler, not a shortcut around it.
 *
 * Every run is persisted to `report_runs` (`0005_runs.sql`) before the
 * response is sent, so the analyst path's `runId` (`05-backend.md` §5) is
 * always real.
 */

import {
  DEFAULT_COMPARISON_DISPLAY,
  DEFAULT_REPORT_TRANSFORM,
  normaliseReportQuery,
  REPORT_GROUP_BY_MAX,
} from '@/data/types/report'
import type { ReportPanel, ReportQuery, ReportResult, ReportSeries, ReportWarning } from '@/data/types/report'
import { planQuery } from '@/data/reporting/plan'
import {
  OTHER,
  resolveFormulaLeg,
  resolveTrendLeg,
  type CoreLegResult,
  type CoreMeasureRows,
} from '@/data/reporting/resolve/core'
import { bucketStarts, comparisonWindow, localDayOf, partialBucketIndexes, resolveWindow } from '@/data/reporting/buckets'
import type { FilterSpec, IsoDate } from '@/data/types/common'
import type { BucketAggregate, Measure } from '@/data/types/measure'
import type { PermissionKey } from '@/data/types/navigation'
import type { PerformedSpec, SegmentRef } from '@/data/types/segment'
import { DEFAULT_ROW_CAP, fetchMeasureRows, loadCatalogue, subjectsMeetingPerformed } from '../compile'
import { validationError } from '../errors'
import { jsonResponse } from '../envelope'
import { requirePermission, type RequestContext } from '../auth'
import type { RouteHandler } from '../router'
import type { Database } from '../db'

export { OTHER as REPORT_OTHER_GROUP }

export interface RunReportDeps {
  /** Injectable so a test resolves presets deterministically. Defaults to the real Riyadh-local day. */
  today?: () => IsoDate
  /** Injectable so a test pins `asOf`. Defaults to `new Date().toISOString()`. */
  now?: () => string
  rowCap?: number
}

async function parseReportQuery(req: Request): Promise<ReportQuery> {
  let text: string
  try {
    text = await req.text()
  } catch {
    throw validationError([{ field: 'body', code: 'unreadable', message: 'Could not read the request body' }])
  }
  if (!text) throw validationError([{ field: 'body', code: 'required', message: 'A report query body is required' }])
  try {
    return JSON.parse(text) as ReportQuery
  } catch {
    throw validationError([{ field: 'body', code: 'invalid_json', message: 'The request body is not valid JSON' }])
  }
}

function emptyModeResult(query: ReportQuery, asOf: string, warnings: ReportWarning[]): ReportResult {
  return {
    query,
    asOf,
    buckets: [],
    panels: [],
    series: [],
    truncated: false,
    truncatedAtRows: null,
    warnings,
    foldedGroupCount: null,
  }
}

async function persistRun(db: Database, userId: string, query: ReportQuery, result: ReportResult): Promise<void> {
  await db.sql`
    INSERT INTO report_runs (user_id, query_json, result_json, as_of)
    VALUES (${userId}, ${JSON.stringify(query)}::jsonb, ${JSON.stringify(result)}::jsonb, ${result.asOf})
  `
}

/** G1: a legal `MeasureRef.aggregate` override, or the catalogue's own — `resolveAggregate` in the mock. */
function resolveAggregate(ref: { aggregate?: BucketAggregate }, measure: Measure): BucketAggregate {
  if (ref.aggregate && measure.bucketAggregateOptions?.includes(ref.aggregate)) return ref.aggregate
  return measure.bucketAggregate
}

/** `panelIdFor` in the mock (`resolveReport.ts`), verbatim — the wire id format, not this file's to invent. */
function panelIdFor(measureKey: string, groupValue: string | null): string {
  return groupValue === null ? `p:${measureKey}` : `p:${measureKey}:${groupValue}`
}

/** `CoreLegResult` → panels + series — mechanical, mirrors `emitLeg` in the mock exactly (same id format, AC-1123). */
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

/** One redacted series (blocked or failed) — mirrors `emitRedacted` in the mock (§13.1, AC-888: no points on the wire). */
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

interface SegmentResolution {
  filters: FilterSpec[]
  subjectAllow: string[] | null
  failed: { code: string; retryable: boolean } | null
}

/** `JSONB` column → typed value, `NULL` and the JS-`undefined`-as-`'null'::jsonb` case both falling back (`handlers/segments.ts`'s `parseJsonColumn`, same shape). */
function parseJsonColumn<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback
  return (typeof value === 'string' ? JSON.parse(value) : value) as T
}

interface SavedSegmentRow {
  name: string
  filters_json: unknown
  performed_json: unknown
}

/**
 * `resolveSegment` in the mock (`src/data/mock/resolveReport.ts`):
 *   - `null` → "everyone".
 *   - `'saved'` → a real lookup against `segments` (WP-6.5's `0006_pages.sql`),
 *     re-run as `'inline'` with the saved row's own filters/performed —
 *     exactly the mock's own recursion. An unknown id is `segment-not-found`,
 *     never a silent fall-through to "everyone" (WP-6.4b Gap 2).
 *   - `'inline'` with `performed` → needs a subject on both the segmented
 *     measures and the performed measure (`subjectKindOf`, mirrored below via
 *     `measure_sources.subject_column`), or `segment-performed-unsupported`.
 */
async function resolveSegment(
  db: Database,
  segment: SegmentRef | null,
  measures: readonly Measure[],
  measureSubjectKinds: readonly (string | null)[],
  window: { from: IsoDate; to: IsoDate },
): Promise<SegmentResolution> {
  if (!segment) return { filters: [], subjectAllow: null, failed: null }
  if (segment.kind === 'saved') {
    const rows = await db.sql<SavedSegmentRow>`
      SELECT name, filters_json, performed_json FROM segments WHERE id = ${segment.id}
    `
    const saved = rows[0]
    if (!saved) return { filters: [], subjectAllow: null, failed: { code: 'segment-not-found', retryable: false } }
    return resolveSegment(
      db,
      {
        kind: 'inline',
        label: saved.name,
        filters: parseJsonColumn<FilterSpec[]>(saved.filters_json, []),
        performed: parseJsonColumn<PerformedSpec | null>(saved.performed_json, null) ?? undefined,
      },
      measures,
      measureSubjectKinds,
      window,
    )
  }

  const filters = segment.filters ?? []
  if (!segment.performed) return { filters, subjectAllow: null, failed: null }

  const performedMeasure = measures.find((m) => m.key === segment.performed!.measureKey) ?? null
  const everySubjectShaped = measureSubjectKinds.every((k) => k !== null)
  const performedIsSubject = performedMeasure
    ? (await subjectKindOf(db, performedMeasure)) !== null
    : false

  if (!everySubjectShaped || !performedMeasure || !performedIsSubject) {
    return { filters, subjectAllow: null, failed: { code: 'segment-performed-unsupported', retryable: false } }
  }

  const allow = await subjectsMeetingPerformed(db, performedMeasure, segment.performed, window)
  return { filters, subjectAllow: [...allow], failed: null }
}

async function subjectKindOf(db: Database, measure: Measure): Promise<string | null> {
  const rows = await db.sql<{ subject_column: string | null }>`
    SELECT subject_column FROM measure_sources WHERE resource = ${measure.population.resource}
  `
  return rows[0]?.subject_column ?? null
}

/**
 * POST /api/v1/reports/run
 *   body: ReportQuery
 *   -> ReportResult
 */
export function createRunReportHandler(db: Database, deps: RunReportDeps = {}): RouteHandler<RequestContext> {
  const today = deps.today ?? (() => localDayOf(new Date().toISOString()))
  const now = deps.now ?? (() => new Date().toISOString())
  const rowCap = deps.rowCap ?? DEFAULT_ROW_CAP

  return async (req, ctx) => {
    const operator = requirePermission(ctx, 'view_analytics')
    const query = await parseReportQuery(req)
    const catalogue = await loadCatalogue(db)
    const todayDate = today()

    const plan = planQuery(query, catalogue, todayDate)
    if (plan.violations.length > 0) {
      throw validationError(
        plan.violations.map((v) => ({ field: v.field, code: v.code, message: v.code })),
        'This report query is not legal',
      )
    }

    const q = normaliseReportQuery(query)
    const asOf = now()

    if (q.mode !== 'trend' && q.mode !== 'table') {
      // §6 and this WP's brief cover the trend/formula path only (steps 1-6
      // over resolveTrendLeg/resolveFormulaLeg). Funnel, cohort and journey
      // resolution is a different WP; `mode-not-resolved` is the wire value
      // `types/report.ts` keeps exactly for a server that has not caught up
      // with a mode the client can ask for.
      const result = emptyModeResult(query, asOf, ['mode-not-resolved'])
      await persistRun(db, operator.userId, query, result)
      return jsonResponse(result)
    }

    const window = resolveWindow(query.window, todayDate)
    const buckets = bucketStarts(window.from, window.to, q.grain)
    const partials = partialBucketIndexes(buckets, q.grain, window, todayDate)
    const warnings = new Set<ReportWarning>()
    if (partials.includes(0)) warnings.add('partial-first')
    if (buckets.length > 0 && partials.includes(buckets.length - 1)) warnings.add('partial-last')
    if (plan.chartTypeCoerced) warnings.add('grain-coarsened')

    const groupBy = q.groupBy.slice(0, REPORT_GROUP_BY_MAX)
    const transform = q.transform ?? DEFAULT_REPORT_TRANSFORM
    const comparisonDisplay = q.comparisonDisplay ?? DEFAULT_COMPARISON_DISPLAY
    const segments: (SegmentRef | null)[] = q.segments && q.segments.length > 0 ? q.segments : [null]
    const comparisonWin = q.periodComparison !== 'none' ? comparisonWindow(window, q.periodComparison) : null

    const byKey = new Map(catalogue.measures.map((m) => [m.key, m]))
    const measures = q.measures
      .map((ref) => ({ ref, measure: byKey.get(ref.key) }))
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

    async function loadLegRows(
      measure: Measure,
      ref: { aggregate?: BucketAggregate },
      extraFilters: readonly FilterSpec[],
      subjectAllow: string[] | null,
    ) {
      const bucketAggregate = resolveAggregate(ref, measure)
      const filters = [...measure.population.predicate, ...q.filters, ...extraFilters]
      return fetchMeasureRows(db, measure, bucketAggregate, { filters, groupBy, subjectAllow, rowCap })
    }

    if (q.formula && measures[0]) {
      const a = measures[0].measure
      const b = measures[1]?.measure ?? null
      const subjectKinds = await Promise.all(
        (b ? [a, b] : [a]).map((m) => subjectKindOf(db, m)),
      )
      for (const [segIndex, segment] of segments.entries()) {
        const idSuffix = segments.length > 1 ? `#seg${segIndex}` : ''
        const resolved = await resolveSegment(db, segment, b ? [a, b] : [a], subjectKinds, window)
        if (resolved.failed) {
          emitRedacted(a, idSuffix, { blocked: null, failed: resolved.failed }, panels, series)
          continue
        }
        const aFetched = await loadLegRows(a, measures[0].ref, resolved.filters, resolved.subjectAllow)
        const bFetched = b ? await loadLegRows(b, measures[1]!.ref, resolved.filters, resolved.subjectAllow) : null
        truncated = truncated || aFetched.truncated || (bFetched?.truncated ?? false)
        const groupLevels = aFetched.groupLevels
        const leg = resolveFormulaLeg({
          formula: q.formula,
          a: aFetched.rows,
          b: bFetched ? bFetched.rows : null,
          groupLevels,
          transform,
          comparisonDisplay,
          window,
          comparisonWindow: comparisonWin,
          grain: q.grain,
          today: todayDate,
        })
        emitLeg(leg, 'rb.canvas.heading', idSuffix, panels, series, warnings, addFolded)
      }
    } else {
      for (const { ref, measure } of measures) {
        const required = measure.permission
        const blocked: PermissionKey | null =
          required && !operator.permissions.includes(required.key) ? required.key : null

        if (blocked) {
          emitRedacted(measure, '', { blocked, failed: null }, panels, series)
          continue
        }

        const subjectKind = await subjectKindOf(db, measure)
        for (const [segIndex, segment] of segments.entries()) {
          const idSuffix = segments.length > 1 ? `#seg${segIndex}` : ''
          const resolved = await resolveSegment(db, segment, [measure], [subjectKind], window)
          if (resolved.failed) {
            emitRedacted(measure, idSuffix, { blocked: null, failed: resolved.failed }, panels, series)
            continue
          }
          let fetched: Awaited<ReturnType<typeof loadLegRows>>
          try {
            fetched = await loadLegRows(measure, ref, resolved.filters, resolved.subjectAllow)
          } catch (err) {
            // A leg's own failure is reported on its series, never as a whole-result error (AC-1277).
            emitRedacted(
              measure,
              idSuffix,
              { blocked: null, failed: { code: 'series_failed', retryable: true } },
              panels,
              series,
            )
            console.error(err)
            continue
          }
          truncated = truncated || fetched.truncated
          const leg = resolveTrendLeg({
            measure: fetched.rows,
            groupLevels: fetched.groupLevels,
            transform,
            comparisonDisplay,
            window,
            comparisonWindow: comparisonWin,
            grain: q.grain,
            today: todayDate,
          })
          emitLeg(leg, measure.labelKey, idSuffix, panels, series, warnings, addFolded)
        }
      }
    }

    const result: ReportResult = {
      query,
      asOf,
      buckets,
      panels,
      series,
      truncated,
      truncatedAtRows: truncated ? rowCap : null,
      warnings: [...warnings],
      foldedGroupCount,
    }

    await persistRun(db, operator.userId, query, result)
    return jsonResponse(result)
  }
}

export type { CoreMeasureRows }
