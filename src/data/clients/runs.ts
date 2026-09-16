/**
 * Report runs, the provenance store behind `X-Eyvar-Record-Run: 1` (T5,
 * `05-backend.md` §5): `reports.run`'s answer kept with an id, so a finding
 * can cite it and `describe`/`Open in builder` read it back unre-run.
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { EYVAR_NOW, EYVAR_TODAY } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import { loadFixtures, onFixturesLoaded, type Fixtures } from '../mock/fixtures'
import { summariseRunSeries } from '../types/report'
import type { IsoDateTime } from '../types/common'
import type { ReportQuery, ReportResult, ReportWindow, RecordRunOutcome, RunSeriesSummary } from '../types/report'
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

/** Moved to `types/report.ts` (F-V2-90) so the server can share them; re-exported so existing imports of `./runs` keep resolving. */
export type { RunSeriesSummary, RecordRunOutcome }

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

/** Not persistence — session-scoped, the same as every mutable client store. */
let runs: ReportRun[] = []
let nextRunSeq = 1

/* Late-bound: `agent.ts`'s case study names ids no session has necessarily
   run (`mock/fixtures.ts` says why this is not a static import). */
let agentSeedRunQueries!: Fixtures['AGENT_SEEDED_RUN_QUERIES']
onFixturesLoaded((f) => {
  agentSeedRunQueries = f.AGENT_SEEDED_RUN_QUERIES
})

let seedingInFlight: Promise<void> | null = null

/**
 * AC-1258: an untouched session starts with an empty store, so it seeds by
 * actually running each query once, lazily on first `getRun` — never a
 * hand-typed total. `resetRuns()` clears `seedingInFlight` to reseed.
 */
async function ensureAgentSeedRuns(): Promise<void> {
  await loadFixtures()
  if (!seedingInFlight) {
    /* No caller's `signal` is threaded through: this primes a shared store
       for every concurrent `getRun`, so one caller navigating away must not
       abort the seed for the rest. */
    seedingInFlight = (async () => {
      for (const seed of agentSeedRunQueries) {
        if (runs.some((r) => r.id === seed.id)) continue
        const outcome = await runReport(seed.query, { today: EYVAR_TODAY })
        if (outcome.status !== 'ok') continue
        runs = [
          ...runs,
          {
            id: seed.id,
            userId: currentMockUserId(),
            query: seed.query,
            result: outcome.result,
            asOf: outcome.result.asOf,
            createdAt: EYVAR_NOW,
            jobId: seed.jobId,
          },
        ]
      }
    })()
  }
  await seedingInFlight
}

/**
 * POST /api/v1/reports/run, header `X-Eyvar-Record-Run: 1`
 *   -> { runId, result, summary }
 * T5's endpoint records unconditionally (§5: "T5 always records"), so every call mints a fresh `runId`.
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
    return { status: 'ok' as const, runId: run.id, result: run.result, summary: summariseRunSeries(run.result) }
  })
}

/**
 * GET /api/v1/reports/runs/:runId
 *   -> Single<ReportRun>
 * Read by `describeSeries` (`reports.ts`) and by the job page's `Open in builder` link per run (§4).
 */
export async function getRun(runId: string, signal?: AbortSignal): Promise<Single<ReportRun>> {
  if (DATA_SOURCE === 'http') return http.get<Single<ReportRun>>(`/reports/runs/${runId}`, undefined, { signal })
  await ensureAgentSeedRuns()
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

/** T6 `compare_windows`: two `recordRun` calls joined by `measureKey` +
 * `groupValue`, role `current` only — a comparison series inside either
 * window is `periodComparison`'s concern, not this tool's. */
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
    const totalsA = summariseRunSeries(a.result)
    const totalsB = summariseRunSeries(b.result)
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
  seedingInFlight = null
}
