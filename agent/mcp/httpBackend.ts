/**
 * The http `Backend` — `01-analyst-agent.md` §5's endpoint column,
 * `05-backend.md` §5. Loaded only when `EYVAR_MCP_SOURCE=http`.
 *
 * **Untested against a live backend** — none exists yet (P7 follows P6, per
 * the doc header). Every path and body below is copied from the endpoint the
 * catalogue names; a mismatch once the backend lands is this file's bug.
 */

import { httpGet, httpPost, EyvarHttpError } from './client.js'
import type { Backend, SavePageOutcomeLike, SaveReportOutcomeLike } from './backendTypes.js'
import type { Paginated, Single } from '../../src/data/types/common'
import type { Dimension, Measure } from '../../src/data/types/measure'
import type { ReportRun, RecordRunOutcome, CompareWindowsResult, SeriesDelta } from '../../src/data/clients/runs'
import type { SavedReport } from '../../src/data/types/report'
import type { Page } from '../../src/data/types/page'
import type { AlertRule, AlertFiring } from '../../src/data/types/alert'
import type { Annotation } from '../../src/data/types/annotation'
import type { AgentJob } from '../../src/data/types/agent'
import type { ContributionResult, DescribeResult } from '../../src/data/reporting/stats'

/** `today` has no endpoint — the runner's job prompt already states it (§6); the http backend reads real Riyadh clock time instead of a fixture. */
function riyadhToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(new Date())
}

async function saveReportOrInvalid(body: unknown): Promise<SaveReportOutcomeLike> {
  try {
    const res = await httpPost<Single<SavedReport>>('/reports', body)
    return { status: 'saved', report: res.data }
  } catch (e) {
    if (e instanceof EyvarHttpError && e.status === 422) {
      return { status: 'invalid', reasons: parseReasons(e.body) }
    }
    throw e
  }
}

async function savePageOrInvalid(body: unknown): Promise<SavePageOutcomeLike> {
  try {
    const res = await httpPost<Single<Page>>('/pages', body)
    return { status: 'saved', page: res.data }
  } catch (e) {
    if (e instanceof EyvarHttpError && e.status === 422) {
      return { status: 'invalid', violations: parseReasons(e.body) }
    }
    throw e
  }
}

function parseReasons(body: string): string[] {
  try {
    const parsed: unknown = JSON.parse(body)
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { reasons?: unknown }).reasons)) {
      return (parsed as { reasons: string[] }).reasons
    }
  } catch {
    /* body was not JSON — fall through to the generic reason below */
  }
  return ['request-rejected']
}

export const httpBackend: Backend = {
  today: riyadhToday,

  /* The server resolves permission from the acting-for operator on every
     call; the http backend never pre-checks locally (mock does, since it has
     no server to ask). A refusal still surfaces — as the 403 the failing
     call throws. */
  currentPermissions: async () => null,

  listMeasures: (params) => httpGet<Paginated<Measure>>('/catalogue/measures', params as Record<string, string | number | boolean | undefined>),
  listDimensions: (params) => httpGet<Paginated<Dimension>>('/catalogue/dimensions', params as Record<string, string | number | boolean | undefined>),

  recordRun: (query, jobId) =>
    httpPost<RecordRunOutcome>('/reports/run', query, {
      'x-eyvar-record-run': '1',
      ...(jobId ? { 'x-eyvar-job': jobId } : {}),
    }),
  getRun: (runId) => httpGet<Single<ReportRun>>(`/reports/runs/${runId}`),
  compareWindows: async (query, windowA, windowB) => {
    const [a, b] = await Promise.all([
      httpPost<RecordRunOutcome>('/reports/run', { ...query, window: windowA }, { 'x-eyvar-record-run': '1' }),
      httpPost<RecordRunOutcome>('/reports/run', { ...query, window: windowB }, { 'x-eyvar-record-run': '1' }),
    ])
    if (a.status !== 'ok' || b.status !== 'ok') return { status: 'invalid-query' }
    /* The same join `runs.ts`'s mock `compareWindows` does — measureKey +
       groupValue, current role only — reimplemented here because the
       backend has no dedicated compare endpoint (§5's own table: "two
       `reports.run`"), and `summarise()` is not exported to reuse. */
    const deltas: SeriesDelta[] = []
    for (const seriesB of b.result.series.filter((s) => s.role === 'current')) {
      const seriesA = a.result.series.find(
        (s) => s.role === 'current' && s.measureKey === seriesB.measureKey && s.groupValue === seriesB.groupValue,
      )
      const totalA = seriesA ? (a.summary[seriesA.id]?.total ?? null) : null
      const totalB = b.summary[seriesB.id]?.total ?? null
      deltas.push({
        seriesId: seriesB.id,
        measureKey: seriesB.measureKey,
        groupValue: seriesB.groupValue,
        deltaAbs: totalA === null || totalB === null ? null : totalB - totalA,
        deltaPct: totalA === null || totalB === null || totalA === 0 ? null : ((totalB - totalA) / Math.abs(totalA)) * 100,
      })
    }
    const result: CompareWindowsResult = { runIdA: a.runId, runIdB: b.runId, deltas }
    return result
  },
  describeSeries: (runId, seriesId) => httpPost<DescribeResult>(`/reports/runs/${runId}/describe`, { seriesId }),
  contribution: (input) => httpPost<ContributionResult>('/reports/contribution', input),
  sampleRows: (input) => httpPost<Array<Record<string, unknown>>>('/reports/sample', input),

  listReports: (params) => httpGet<Paginated<SavedReport>>('/reports', params as Record<string, string | number | boolean | undefined>),
  getReport: (id) => httpGet<Single<SavedReport>>(`/reports/${id}`),
  saveReport: (input) => saveReportOrInvalid(input),

  listPages: (params) => httpGet<Paginated<Page>>('/pages', params as Record<string, string | number | boolean | undefined>),
  getPage: (id) => httpGet<Single<Page>>(`/pages/${id}`),
  savePage: (input) => savePageOrInvalid(input),

  listAlertRules: (params) => httpGet<Paginated<AlertRule>>('/alerts', params as Record<string, string | number | boolean | undefined>),
  getAlertRule: (id) => httpGet<Single<AlertRule>>(`/alerts/${id}`),
  listAlertFirings: (ruleId, params) => httpGet<Paginated<AlertFiring>>(`/alerts/${ruleId}/history`, params as Record<string, string | number | boolean | undefined>),
  listFirings: (params) => httpGet<Paginated<AlertFiring>>('/alerts/firings', params as Record<string, string | number | boolean | undefined>),

  listAnnotations: (params) => httpGet<Annotation[]>('/annotations', params as Record<string, string | number | boolean | undefined>),

  getAgentJob: (id) => httpGet<Single<AgentJob>>(`/agent/jobs/${id}`),
  noteFinding: (jobId, text, runIds) => httpPost<{ ok: true }>(`/agent/jobs/${jobId}/findings`, { text, runIds }),
}
