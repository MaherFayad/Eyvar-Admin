/**
 * `reports.run` and the saved-report library — §3, §9, §10.
 *
 * `reports.run` is **the** operation of this module: §3.1 says the panel is a
 * form whose value is a `ReportQuery`, the URL is that object serialised, a
 * saved report is that object plus a name, a dashboard tile is a pointer to one
 * and an alert rule is a pointer to one of its series. Everything else here is
 * CRUD around it.
 *
 * ## Why it does not go through the 34 per-resource clients
 *
 * `drivers.list` returns `Paginated<Driver>` and there is no argument to it
 * that means *"weekly, last 90 days, counted"*. D13 named this before anyone
 * started building: *"that shape cannot answer 'drivers vs passengers, weekly,
 * last 90 days', because the question names no resource."*
 *
 * ## Two things this client refuses to do
 *
 * **It does not resolve an illegal query.** `planQuery` runs first and its
 * violations come back as a returned outcome, not a throw — including for a
 * hand-edited URL (AC-825). The previous result is the caller's to retain.
 *
 * **It does not redact in the response body.** A blocked series comes back with
 * `blocked` set and **no points**, because *"a client-side filter over a full
 * payload is not a permission control, it is a rendering choice with the data
 * still in the response"* (§13.1). AC-888 verifies that against the response.
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { EYVAR_NOW, EYVAR_TODAY } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import { paginate } from '../mock/query'
/* **The seams come from `mock/rowCap`, the resolver does not come from here at
   all.** `resolveReport.ts` statically imports six fixture modules, so a static
   import of it — even one only the mock branch calls — put seeded rows and the
   Arabic name pool into the entry chunk of the `VITE_DATA_SOURCE=http` build,
   where the resolver can never run. It is now reached by `await import()` inside
   the branch that uses it. */
import { resetReportRowCap, useTruncatedReports } from '../mock/rowCap'
import {
  MAX_COHORT_HORIZON,
  MAX_FUNNEL_STEPS,
  MAX_JOURNEY_DEPTH,
  MIN_COHORT_HORIZON,
  MIN_FUNNEL_STEPS,
  MIN_JOURNEY_DEPTH,
  applyReportMode,
  planQuery,
  type Catalogue,
} from '../reporting/plan'
import { resolveWindow } from '../reporting/buckets'
import { serialiseReportQuery } from '../reporting/serialise'
import {
  contribution as runContribution,
  describe as describeStats,
  type ContributionResult,
  type DescribeResult,
} from '../reporting/stats'
import type { FilterSpec, IsoDate, Paginated, QueryParams, Single } from '../types/common'
import type { PermissionKey } from '../types/navigation'
import {
  REPORT_NAME_MAX,
  type DeleteReportOutcome,
  type ReportCsv,
  type ReportCsvRow,
  type ReportQuery,
  type ReportResult,
  type RunReportOutcome,
  type SaveInvalidReason,
  type SaveReportOutcome,
  type SavedReport,
} from '../types/report'
import { currentMockPermissions, currentMockUserId } from './session'
import { http } from './http'
import { fixturesLoaded, onFixturesLoaded, type Fixtures } from '../mock/fixtures'

/* Late-bound fixture rows. `mock/fixtures.ts` says why this is not a static
   import: a static one pins seeded data into every build, including the http
   build that can never read it. Bound before any mock read, because `mock()`
   and `mockMutation()` await `loadFixtures()`. */
let dimensionFixtures!: Fixtures['dimensionFixtures']
let measureFixtures!: Fixtures['measureFixtures']
let dashboardFixtures!: Fixtures['dashboardFixtures']
let savedReportFixtures!: Fixtures['savedReportFixtures']
onFixturesLoaded((f) => {
  dimensionFixtures = f.dimensionFixtures
  measureFixtures = f.measureFixtures
  dashboardFixtures = f.dashboardFixtures
  savedReportFixtures = f.savedReportFixtures
  /* Seeded here rather than at module load: these locals are built from
     late-bound fixtures, which are undefined until the fixture chunk lands. */
  CATALOGUE = { measures: measureFixtures, dimensions: dimensionFixtures }
  reports = savedReportFixtures.map((r) => ({ ...r }))
})

export const REPORT_OPERATIONS = {
  run: 'reports.run',
  list: 'reports.list',
  get: 'reports.get',
  save: 'reports.save',
  delete: 'reports.delete',
  export: 'reports.export',
  duplicate: 'reports.duplicate',
  star: 'reports.star',
  versions: 'reports.versions',
  sample: 'reports.sample',
  contribution: 'reports.contribution',
  describe: 'reports.describe',
} as const

/* Registered at module load, not on first call. `config.ts` says *"each client
   registers its ids here at module load"*, and `mock()` only registers when it
   runs — so an operation nobody has invoked yet is missing from a QA panel's
   list and from any validation of `?mockFail=`. Every id in this module is
   listed the moment the module is imported. */
registerOperations(...Object.values(REPORT_OPERATIONS))

let CATALOGUE!: Catalogue

/** Mutable copies, so a save is observable within a session. **Not persistence** — see `fixtures/reports.ts`. */
let reports!: SavedReport[]

/* ───────────────────────────── run ─────────────────────────────────────── */

export interface RunReportOptions {
  /**
   * Make one measure's series come back `failed` while the rest resolve —
   * §8.3 state 10, and AC-851's *"retrying it does not re-request the resolved
   * series"*.
   *
   * Separate from `?mockFail=reports.run`, which fails the whole operation.
   * Both are needed: one is a transport failure, the other is a partial one,
   * and a UI that only handles the first renders a blank canvas for the second.
   */
  failMeasureKeys?: readonly string[]
  /** The day to resolve presets against. Defaults to the fixed clock. Never a global read. */
  today?: IsoDate
  signal?: AbortSignal
}

/**
 * POST /api/v1/reports/run
 *   body: ReportQuery
 *   -> ReportResult
 *
 * **A POST, because a filter list can exceed a URL** (§4.3). The *sharing* URL
 * is a separate, client-side serialisation of the same object (§9.2) — the
 * tension is real and is resolved by keeping the two encodings independent
 * rather than by making one serve both.
 *
 * Each series is authorised **against the requesting session, not the report's
 * owner** (§13.1). In mock mode that is `currentMockPermissions()`, so
 * `switchMockUser('USR-3')` reaches the blocked state today, before D4 lands.
 */
export async function runReport(
  query: ReportQuery,
  options: RunReportOptions = {},
): Promise<RunReportOutcome> {
  const { signal } = options
  if (DATA_SOURCE === 'http') {
    const result = await http.post<ReportResult>('/reports/run', query, { signal })
    return { status: 'ok', result }
  }
  /* The resolver and its fixtures arrive with this chunk, not with the app. */
  const { resolveReport: resolve } = await import('../mock/resolveReport')
  return mock(REPORT_OPERATIONS.run, signal, () => {
    const today = options.today ?? EYVAR_TODAY
    const plan = planQuery(query, CATALOGUE, today)
    /* An illegal query is a **domain** answer, returned. A hand-edited URL
       asking for a stock and a flow on one axis gets the same violation the
       picker would have shown, and the caller keeps its previous result. */
    if (plan.violations.length > 0) {
      return { status: 'invalid-query' as const, violations: plan.violations }
    }
    return {
      status: 'ok' as const,
      result: resolve(query, CATALOGUE, {
        permissions: currentMockPermissions() as readonly PermissionKey[],
        today,
        failMeasureKeys: options.failMeasureKeys,
      }),
    }
  })
}

/* ─────────────────────────── the library ───────────────────────────────── */

export interface SavedReportQuery extends QueryParams {
  /** `mine` or `team`. A control, not an endpoint (§3.8 rule 3). */
  view?: string | null
}

/**
 * GET /api/v1/reports
 *   params: q · view=mine|team · filters[chartType|ownerId|lastRunAt] · page · pageSize
 *   -> Paginated<SavedReport>
 *
 * Needs Q1: without a storage adapter this serves seeded rows (§9.1).
 */
export async function listReports(
  params: SavedReportQuery = {},
  signal?: AbortSignal,
): Promise<Paginated<SavedReport>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<SavedReport>>('/reports', { ...params, signal }, { signal })
  }
  return mock(REPORT_OPERATIONS.list, signal, () => {
    const me = currentMockUserId()
    let rows = reports.filter((r) => r.visibility === 'team' || r.ownerId === me)
    if (params.view === 'mine') rows = rows.filter((r) => r.ownerId === me)
    if (params.view === 'team') rows = rows.filter((r) => r.visibility === 'team')
    for (const filter of params.filters ?? []) {
      const wanted = Array.isArray(filter.value)
        ? filter.value.map(String)
        : [String(filter.value)]
      if (filter.field === 'chartType') {
        rows = rows.filter((r) => wanted.includes(r.query.chartType))
      }
      if (filter.field === 'ownerId') rows = rows.filter((r) => wanted.includes(r.ownerId))
      /* A report never run is outside every window, rather than inside all of
         them: `null` is an absence, not a date before time. */
      if (filter.field === 'lastRunAt') {
        const bound = String(filter.value)
        if (filter.op === 'gte') rows = rows.filter((r) => r.lastRunAt !== null && r.lastRunAt >= bound)
        if (filter.op === 'lte') rows = rows.filter((r) => r.lastRunAt !== null && r.lastRunAt <= bound)
      }
    }
    const q = params.q?.trim().toLowerCase()
    if (q) rows = rows.filter((r) => r.name.toLowerCase().includes(q))
    return paginate(rows, params)
  })
}

/**
 * GET /api/v1/reports/:id
 *   -> Single<SavedReport>
 *
 * A 404 here is §8.3 state 12 — the report was deleted while open. The screen
 * becomes read-only with a notice and `Save` becomes `Save as new`; it does not
 * navigate away, and the URL is not rewritten (AC-804).
 */
export async function getReport(id: string, signal?: AbortSignal): Promise<Single<SavedReport>> {
  if (DATA_SOURCE === 'http') return http.get<Single<SavedReport>>(`/reports/${id}`, undefined, { signal })
  return mock(REPORT_OPERATIONS.get, signal, () => {
    const row = reports.find((r) => r.id === id)
    if (!row) throw notFound('report', id)
    return { data: { ...row } }
  })
}

export interface SaveReportInput {
  /** `null` creates; a value updates in place. `Save` and `Save as` are two calls, not a mode. */
  id: string | null
  name: string
  description: string | null
  query: ReportQuery
  visibility: SavedReport['visibility']
}

/**
 * POST /api/v1/reports · PATCH /api/v1/reports/:id
 *   body: { name, description, query, visibility }
 *   -> Single<SavedReport>
 *
 * Validation is a **returned** outcome, not a throw: a failed save never closes
 * the dialog it came from and the operator's input is preserved (§8.3, AC-859).
 * `?mockFail=reports.save` still throws, because that is a transport failure and
 * the two must stay distinguishable.
 */
export async function saveReport(
  input: SaveReportInput,
  signal?: AbortSignal,
): Promise<SaveReportOutcome> {
  if (DATA_SOURCE === 'http') {
    const res = input.id
      ? await http.patch<Single<SavedReport>>(`/reports/${input.id}`, input, { signal })
      : await http.post<Single<SavedReport>>('/reports', input, { signal })
    return { status: 'saved', report: res.data }
  }
  return mockMutation(REPORT_OPERATIONS.save, signal, () => {
    const reasons = validateName(input.name)
    if (planQuery(input.query, CATALOGUE, EYVAR_TODAY).violations.length > 0) {
      reasons.push('query-invalid')
    }
    if (reasons.length > 0) return { status: 'invalid' as const, reasons }

    if (input.id) {
      const existing = reports.find((r) => r.id === input.id)
      if (!existing) throw notFound('report', input.id)
      /* §8's version history — the PREVIOUS query, kept before it is
         overwritten, newest last, capped at the last 20 (server-kept). */
      const priorVersion = { at: existing.updatedAt, by: existing.updatedBy ?? existing.ownerId, query: existing.query }
      const updated: SavedReport = {
        ...existing,
        name: input.name,
        description: input.description,
        query: input.query,
        visibility: input.visibility,
        updatedAt: EYVAR_NOW,
        updatedBy: currentMockUserId(),
        versions: [...(existing.versions ?? []), priorVersion].slice(-20),
      }
      reports = reports.map((r) => (r.id === updated.id ? updated : r))
      return { status: 'saved' as const, report: { ...updated } }
    }

    const created: SavedReport = {
      id: `RPT-${reports.length + 1}${reports.length}`,
      name: input.name,
      description: input.description,
      query: input.query,
      ownerId: currentMockUserId(),
      visibility: input.visibility,
      createdAt: EYVAR_NOW,
      updatedAt: EYVAR_NOW,
      /* Saving is not running. A report saved from the builder has been run in
         the builder, but nothing on the wire says so, so this stays `null`
         until a run endpoint records one (T9.13). */
      lastRunAt: null,
      pinnedToDashboardIds: [],
    }
    reports = [...reports, created]
    return { status: 'saved' as const, report: { ...created } }
  })
}

/**
 * DELETE /api/v1/reports/:id
 *   -> 204, or 409 with the dashboards that pin it
 *
 * §11.3: **deleting a pinned report is refused by default**, and the
 * confirmation names the dashboards. The names come back as data because a bare
 * `409` could not name them, and `Remove from those dashboards and delete` has
 * to be an explicit second step — `force` (AC-868).
 *
 * *"A dangling reference cannot be created through the UI."*
 */
export async function deleteReport(
  id: string,
  options: { force?: boolean; signal?: AbortSignal } = {},
): Promise<DeleteReportOutcome> {
  const { force = false, signal } = options
  if (DATA_SOURCE === 'http') {
    await http.delete<void>(`/reports/${id}${force ? '?force=true' : ''}`, { signal })
    return { status: 'deleted' }
  }
  return mockMutation(REPORT_OPERATIONS.delete, signal, () => {
    const row = reports.find((r) => r.id === id)
    if (!row) throw notFound('report', id)
    if (row.pinnedToDashboardIds.length > 0 && !force) {
      return {
        status: 'pinned' as const,
        dashboards: row.pinnedToDashboardIds.map((dashboardId) => ({
          id: dashboardId,
          name: dashboardFixtures.find((d) => d.id === dashboardId)?.name ?? dashboardId,
        })),
      }
    }
    reports = reports.filter((r) => r.id !== id)
    return { status: 'deleted' as const }
  })
}

/* ───────────────────────── §8: library and organisation ────────────────── */

/**
 * POST /api/v1/reports/:id/duplicate
 *   -> Single<SavedReport>
 *
 * §8's `Duplicate` row action. Owned by the acting operator, private, never
 * pinned to a dashboard — a copy starts with none of the original's
 * arrangements, only its query.
 */
export async function duplicateReport(id: string, signal?: AbortSignal): Promise<Single<SavedReport>> {
  if (DATA_SOURCE === 'http') return http.post<Single<SavedReport>>(`/reports/${id}/duplicate`, undefined, { signal })
  return mockMutation(REPORT_OPERATIONS.duplicate, signal, () => {
    const row = reports.find((r) => r.id === id)
    if (!row) throw notFound('report', id)
    const copy: SavedReport = {
      ...row,
      id: `RPT-${reports.length + 1}${reports.length}`,
      name: `${row.name} copy`,
      ownerId: currentMockUserId(),
      visibility: 'private',
      official: false,
      starredBy: [],
      versions: [],
      updatedBy: currentMockUserId(),
      createdAt: EYVAR_NOW,
      updatedAt: EYVAR_NOW,
      lastRunAt: null,
      pinnedToDashboardIds: [],
    }
    reports = [...reports, copy]
    return { data: { ...copy } }
  })
}

/**
 * POST /api/v1/reports/:id/star
 *   -> Single<SavedReport>
 *
 * Toggles the acting operator in `starredBy` — the `starred` library view's
 * source. Mirrors `pages.ts`'s `starPage`, the same control on the sibling resource.
 */
export async function starReport(id: string, signal?: AbortSignal): Promise<Single<SavedReport>> {
  if (DATA_SOURCE === 'http') return http.post<Single<SavedReport>>(`/reports/${id}/star`, undefined, { signal })
  return mockMutation(REPORT_OPERATIONS.star, signal, () => {
    const row = reports.find((r) => r.id === id)
    if (!row) throw notFound('report', id)
    const me = currentMockUserId()
    const current = row.starredBy ?? []
    const starred: SavedReport = {
      ...row,
      starredBy: current.includes(me) ? current.filter((u) => u !== me) : [...current, me],
    }
    reports = reports.map((r) => (r.id === id ? starred : r))
    return { data: { ...starred } }
  })
}

/**
 * GET /api/v1/reports/:id/versions
 *   -> Paginated<SavedReportVersion>
 *
 * Newest last on the record (`saveReport` appends), newest **first** on the
 * wire — the order `Version history` renders (§8, `Restore` loads the query
 * into the draft, never saves over it).
 */
export async function listReportVersions(
  id: string,
  params: QueryParams = {},
  signal?: AbortSignal,
): Promise<Paginated<{ at: string; by: string; query: ReportQuery }>> {
  if (DATA_SOURCE === 'http') {
    return http.get(`/reports/${id}/versions`, { ...params, signal }, { signal })
  }
  return mock(REPORT_OPERATIONS.versions, signal, () => {
    const row = reports.find((r) => r.id === id)
    if (!row) throw notFound('report', id)
    return paginate([...(row.versions ?? [])].reverse(), params)
  })
}

/* ─────────────────────── the agent's tools (T7, T9, T10) ───────────────── */

export interface SampleRowsInput {
  resource: string
  filters: FilterSpec[]
  bucket?: IsoDate
  /** ≤ 50 (D44). Values above the cap are silently clamped, never refused. */
  limit?: number
}

/**
 * POST /api/v1/reports/sample
 *   body: SampleRowsInput
 *   -> Record<string, unknown>[]
 *
 * T10 (D44): masked rows, `name → initials`, `phone → last 2 digits`, ids
 * intact. Audit-logging the read is the server's job, not this mock's.
 */
export async function sampleRows(input: SampleRowsInput, signal?: AbortSignal): Promise<Array<Record<string, unknown>>> {
  if (DATA_SOURCE === 'http') {
    return http.post<Array<Record<string, unknown>>>('/reports/sample', input, { signal })
  }
  const { sampleRows: resolve } = await import('../mock/resolveReport')
  return mock(REPORT_OPERATIONS.sample, signal, () =>
    resolve(input.resource, input.filters, input.limit ?? 50, input.bucket),
  )
}

export interface ContributionInput {
  query: ReportQuery
  windowA: ReportQuery['window']
  windowB: ReportQuery['window']
}

/**
 * POST /api/v1/reports/contribution
 *   body: ContributionInput
 *   -> ContributionResult
 *
 * T9: which groups of `query.groupBy[0]` explain the change between two
 * windows, via `reporting/stats.ts`'s pure `contribution`.
 */
export async function contribution(input: ContributionInput, signal?: AbortSignal): Promise<ContributionResult> {
  if (DATA_SOURCE === 'http') {
    return http.post<ContributionResult>('/reports/contribution', input, { signal })
  }
  const [a, b] = await Promise.all([
    runReport({ ...input.query, window: input.windowA }, { signal }),
    runReport({ ...input.query, window: input.windowB }, { signal }),
  ])
  return mock(REPORT_OPERATIONS.contribution, signal, () => {
    const totalOf = (result: ReportResult, groupValue: string | null): number | null => {
      const series = result.series.find((s) => s.role === 'current' && s.groupValue === groupValue)
      if (!series) return null
      const usable = series.points.filter((p, i) => p !== null && !series.partialBucketIndexes.includes(i))
      return usable.length === 0 ? null : (usable as number[]).reduce((sum, v) => sum + v, 0)
    }
    const groupsA = a.status === 'ok' ? a.result.series.filter((s) => s.role === 'current').map((s) => s.groupValue) : []
    const groupsB = b.status === 'ok' ? b.result.series.filter((s) => s.role === 'current').map((s) => s.groupValue) : []
    const groupValues = [...new Set([...groupsA, ...groupsB])]
    return runContribution({
      totalA: a.status === 'ok' ? totalOf(a.result, null) : null,
      totalB: b.status === 'ok' ? totalOf(b.result, null) : null,
      parts: groupValues
        .filter((g): g is string => g !== null)
        .map((groupValue) => ({
          groupValue,
          totalA: a.status === 'ok' ? totalOf(a.result, groupValue) : null,
          totalB: b.status === 'ok' ? totalOf(b.result, groupValue) : null,
        })),
    })
  })
}

/**
 * POST /api/v1/reports/runs/:runId/describe
 *   body: { seriesId }
 *   -> DescribeResult
 *
 * T7: descriptive stats over one series of a stored run, read back through
 * `runs.ts` rather than re-run, so the numbers match what was cited.
 */
export async function describeSeries(runId: string, seriesId: string, signal?: AbortSignal): Promise<DescribeResult> {
  if (DATA_SOURCE === 'http') {
    return http.post<DescribeResult>(`/reports/runs/${runId}/describe`, { seriesId }, { signal })
  }
  const { getRun } = await import('./runs')
  const run = await getRun(runId, signal)
  return mock(REPORT_OPERATIONS.describe, signal, () => {
    const series = run.data.result.series.find((s) => s.id === seriesId)
    if (!series) throw notFound('series', seriesId)
    return describeStats(series.points, run.data.result.buckets, run.data.result.query.grain, series.partialBucketIndexes)
  })
}

/* ─────────────────────────── export (§10) ──────────────────────────────── */

/**
 * The resolved result as §10.1's long format — one row per bucket × series,
 * with a header block naming the report, the window, the grain, the comparison,
 * every filter and the `asOf`.
 *
 * Pure, and in the data layer rather than in a screen, for one reason: **§10.2's
 * deliberate break of the halalas rule**. Money in the CSV is decimal SAR with
 * an explicit currency column, because a CSV's consumer is a human in a
 * spreadsheet and `29505` in a revenue column is a defect they will not catch.
 * Left to a component, that conversion gets "fixed" back to halalas by the next
 * person who greps for the money rule. Here it is one function with the reason
 * attached.
 *
 * A blocked series is **omitted and named** in the header (AC-890): exporting a
 * redacted row would be a permission leak with a `null` in it.
 */
export function reportToCsv(result: ReportResult, reportName: string | null, today: IsoDate = EYVAR_TODAY): ReportCsv {
  const window = resolveWindow(result.query.window, today)
  const rows: ReportCsvRow[] = []
  const omitted: Array<{ measureKey: string; permission: PermissionKey }> = []

  for (const series of result.series) {
    if (series.blocked) {
      omitted.push({ measureKey: series.measureKey, permission: series.blocked })
      continue
    }
    result.buckets.forEach((bucket, i) => {
      const raw = series.points[i] ?? null
      rows.push({
        bucket_start: bucket,
        series: series.id,
        measure_key: series.measureKey,
        group_value: series.groupValue,
        role: series.role,
        /* §10.2. Halalas → decimal SAR, here and nowhere else in the product. */
        value: raw === null ? null : series.unit === 'money' ? raw / 100 : raw,
        unit: series.unit,
        currency: series.currency,
        is_partial_bucket: series.partialBucketIndexes.includes(i),
      })
    })
  }

  return {
    header: {
      reportName,
      windowFrom: window.from,
      windowTo: window.to,
      grain: result.query.grain,
      periodComparison: result.query.periodComparison,
      filters: result.query.filters,
      asOf: result.asOf,
      omittedSeries: omitted,
    },
    rows,
  }
}

/**
 * POST /api/v1/reports/export
 *   body: ReportQuery
 *   -> ReportCsv
 *
 * **Audit-logged, and that is the one thing legacy got right here**
 * (`logAction('export_data', …)`, `:7604`): an export of operational data that
 * leaves no trace is a compliance problem, not a feature. The audit entry names
 * the actor, the report and the window (AC-864); writing it is the server's job
 * and the endpoint exists so it has somewhere to happen.
 */
export async function exportReport(
  query: ReportQuery,
  options: { reportName?: string | null; today?: IsoDate; signal?: AbortSignal } = {},
): Promise<ReportCsv> {
  const { signal } = options
  if (DATA_SOURCE === 'http') {
    return http.post<ReportCsv>('/reports/export', query, { signal })
  }
  const { resolveReport: resolve } = await import('../mock/resolveReport')
  return mock(REPORT_OPERATIONS.export, signal, () => {
    const today = options.today ?? EYVAR_TODAY
    const outcome = resolve(query, CATALOGUE, {
      permissions: currentMockPermissions() as readonly PermissionKey[],
      today,
    })
    return reportToCsv(outcome, options.reportName ?? null, today)
  })
}

/* ─────────────────────────── QA affordances ────────────────────────────── */

/**
 * Serve results that really are cut short — §8.3 state 7.
 *
 * The cap is applied to the rows the resolver reads, so the numbers that come
 * back are genuinely short and `truncated: true` describes something that
 * happened. A flag with full data behind it would ship the caveat's copy for a
 * state that never occurs.
 */
export { useTruncatedReports }

/** The shareable link for a query, for a QA engineer pinning a state from the URL. */
export { serialiseReportQuery }

/* ─────────────── the mode, and the bounds its controls need ────────────── */

/**
 * Re-exported here rather than imported from `reporting/plan` by a screen, so
 * **the panel reaches the query model through the same door `reports.run`
 * does**. `applyReportMode` is the one function that may change a query's mode:
 * four of the five modes decide the chart and three collapse the grain, and a
 * screen doing that itself would be a second copy of the legality rules this
 * client validates against.
 *
 * The six bounds come with it because a stepper that lets an operator reach a
 * horizon the planner then refuses is a control that lies about its own range.
 * One declaration, read by the picker and by the refusal.
 */
export {
  MAX_COHORT_HORIZON,
  MAX_FUNNEL_STEPS,
  MAX_JOURNEY_DEPTH,
  MIN_COHORT_HORIZON,
  MIN_FUNNEL_STEPS,
  MIN_JOURNEY_DEPTH,
  applyReportMode,
}

/**
 * §3.2's nine presets, from the query model, so the range control this module's
 * mode panel needs offers the same nine in the same order as `QueryPanel`.
 */
export { REPORT_PRESETS } from '../types/report'

export function resetReports(): void {
  /* Nothing seeded yet: the fixture chunk has not landed, so there is no
     state to reset and the rows this would read are still undefined. The
     binder in this module seeds fresh state when it does land. */
  if (!fixturesLoaded()) return
  reports = savedReportFixtures.map((r) => ({ ...r }))
  resetReportRowCap()
}

/* ────────────────────────────── helpers ────────────────────────────────── */

/** 1–80 characters (AC-856). `Save` is disabled until a name exists, and carries no error text while it is. */
function validateName(name: string): SaveInvalidReason[] {
  const trimmed = name.trim()
  if (trimmed.length === 0) return ['name-required']
  if (trimmed.length > REPORT_NAME_MAX) return ['name-too-long']
  return []
}
