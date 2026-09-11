/**
 * Report runs — the provenance store behind `X-Eyvar-Record-Run: 1` (T5,
 * `05-backend.md` §5). `reports.run` answers a query; a **run** is that
 * answer kept, with an id, so a finding can cite it and `describe`/`Open in
 * builder` can read it back without re-running the query.
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { EYVAR_NOW, EYVAR_TODAY } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import { usablePoints } from '../reporting/stats'
import type { IsoDateTime } from '../types/common'
import type { QueryViolation, ReportQuery, ReportResult, ReportWindow } from '../types/report'
import type { Single } from '../types/common'
import { runReport } from './reports'
import { currentMockUserId } from './session'
import { http } from './http'

export const RUN_OPERATIONS = {
  record: 'runs.record',
  get: 'runs.get',
  compare: 'runs.compare',
} as const

registerOperations(...Object.values(RUN_OPERATIONS))

export interface RunSeriesSummary {
  total: number | null
  mean: number | null
  min: number | null
  max: number | null
  first: number | null
  last: number | null
  changeAbs: number | null
  changePct: number | null
  /** T5's own word for the rule every stat in this module already follows: partial buckets are excluded. */
  partialExcluded: true
}

export interface ReportRun {
  id: string
  userId: string
  query: ReportQuery
  result: ReportResult
  asOf: IsoDateTime
  createdAt: IsoDateTime
  /** Set when an analyst job records this run. `null` for an operator's own `Ask the analyst` off-ramp. */
  jobId: string | null
}

export type RecordRunOutcome =
  | { status: 'ok'; runId: string; result: ReportResult; summary: Record<string, RunSeriesSummary> }
  | { status: 'invalid-query'; violations: QueryViolation[] }

/** Not persistence — session-scoped, the same as every mutable client store. */
let runs: ReportRun[] = []
let nextRunSeq = 1

function summarise(result: ReportResult): Record<string, RunSeriesSummary> {
  const out: Record<string, RunSeriesSummary> = {}
  for (const series of result.series) {
    const usable = usablePoints(series.points, result.buckets, series.partialBucketIndexes)
    if (usable.length === 0) {
      out[series.id] = {
        total: null,
        mean: null,
        min: null,
        max: null,
        first: null,
        last: null,
        changeAbs: null,
        changePct: null,
        partialExcluded: true,
      }
      continue
    }
    const values = usable.map((p) => p.value)
    const first = usable[0]!.value
    const last = usable[usable.length - 1]!.value
    out[series.id] = {
      total: values.reduce((a, b) => a + b, 0),
      mean: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      first,
      last,
      changeAbs: last - first,
      changePct: first === 0 ? null : ((last - first) / Math.abs(first)) * 100,
      partialExcluded: true,
    }
  }
  return out
}

/**
 * POST /api/v1/reports/run, header `X-Eyvar-Record-Run: 1`
 *   body: ReportQuery
 *   -> { runId, result, summary }
 *
 * T5's tool endpoint. Records unconditionally — "T5 always records" (§5's
 * rule) — so every call mints a fresh `runId`, never reuses one.
 */
export async function recordRun(
  query: ReportQuery,
  options: { jobId?: string | null; today?: string; signal?: AbortSignal } = {},
): Promise<RecordRunOutcome> {
  const { signal } = options
  if (DATA_SOURCE === 'http') {
    return http.post<RecordRunOutcome>('/reports/run', query, {
      signal,
      headers: { 'X-Eyvar-Record-Run': '1' },
    })
  }
  const outcome = await runReport(query, { today: options.today ?? EYVAR_TODAY, signal })
  if (outcome.status === 'invalid-query') {
    return { status: 'invalid-query', violations: outcome.violations }
  }
  return mock(RUN_OPERATIONS.record, signal, () => {
    const run: ReportRun = {
      id: `RUN-${nextRunSeq}`,
      userId: currentMockUserId(),
      query,
      result: outcome.result,
      asOf: outcome.result.asOf,
      createdAt: EYVAR_NOW,
      jobId: options.jobId ?? null,
    }
    nextRunSeq += 1
    runs = [...runs, run]
    return { status: 'ok' as const, runId: run.id, result: run.result, summary: summarise(run.result) }
  })
}

/**
 * GET /api/v1/reports/runs/:runId
 *   -> Single<ReportRun>
 *
 * Read by `describeSeries` (`reports.ts`) and by the job page's `Open in
 * builder` link per run (§4).
 */
export async function getRun(runId: string, signal?: AbortSignal): Promise<Single<ReportRun>> {
  if (DATA_SOURCE === 'http') return http.get<Single<ReportRun>>(`/reports/runs/${runId}`, undefined, { signal })
  return mock(RUN_OPERATIONS.get, signal, () => {
    const row = runs.find((r) => r.id === runId)
    if (!row) throw notFound('run', runId)
    return { data: { ...row } }
  })
}

export interface SeriesDelta {
  seriesId: string
  measureKey: string
  groupValue: string | null
  deltaAbs: number | null
  deltaPct: number | null
}

export interface CompareWindowsResult {
  runIdA: string
  runIdB: string
  deltas: SeriesDelta[]
}

/**
 * T6 `compare_windows` — two `recordRun` calls at `windowA`/`windowB`, joined
 * by `measureKey` + `groupValue` (role `current` only; a comparison series
 * inside either window is not this tool's concern, `periodComparison` is).
 */
export async function compareWindows(
  query: ReportQuery,
  windowA: ReportWindow,
  windowB: ReportWindow,
  options: { today?: string; signal?: AbortSignal } = {},
): Promise<CompareWindowsResult | { status: 'invalid-query' }> {
  const [a, b] = await Promise.all([
    recordRun({ ...query, window: windowA }, options),
    recordRun({ ...query, window: windowB }, options),
  ])
  if (a.status !== 'ok' || b.status !== 'ok') return { status: 'invalid-query' }

  return mockMutation(RUN_OPERATIONS.compare, options.signal, () => {
    const totalsA = summarise(a.result)
    const totalsB = summarise(b.result)
    const deltas: SeriesDelta[] = []
    for (const seriesB of b.result.series.filter((s) => s.role === 'current')) {
      const seriesA = a.result.series.find(
        (s) => s.role === 'current' && s.measureKey === seriesB.measureKey && s.groupValue === seriesB.groupValue,
      )
      const totalA = seriesA ? (totalsA[seriesA.id]?.total ?? null) : null
      const totalB = totalsB[seriesB.id]?.total ?? null
      deltas.push({
        seriesId: seriesB.id,
        measureKey: seriesB.measureKey,
        groupValue: seriesB.groupValue,
        deltaAbs: totalA === null || totalB === null ? null : totalB - totalA,
        deltaPct: totalA === null || totalB === null || totalA === 0 ? null : ((totalB - totalA) / Math.abs(totalA)) * 100,
      })
    }
    return { runIdA: a.runId, runIdB: b.runId, deltas }
  })
}

export function resetRuns(): void {
  runs = []
  nextRunSeq = 1
}
