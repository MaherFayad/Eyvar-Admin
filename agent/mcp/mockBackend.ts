/**
 * The mock `Backend`. Imports the frontend clients directly, loaded only
 * via `source.ts`'s dynamic `import()` (see that file for why). `noteFinding`
 * writes to a module-level map since no client function exists yet (F-V2-54).
 */

import {
  DATA_SOURCE,
  EYVAR_TODAY,
  contribution,
  describeSeries,
  disableMockLatency,
  getAgentJob,
  getAlertRule,
  getPage,
  getReport,
  getRun,
  getSession,
  listAlertFirings,
  listAlertRules,
  listAnnotations,
  listDimensions,
  listFirings,
  listMeasures,
  listPages,
  listReports,
  recordRun,
  runReport,
  sampleRows,
  savePage,
  saveReport,
  compareWindows,
} from '../../src/data/clients/index'
import { buildGlossaryMarkdown } from '../../api/_lib/glossary'
import type { AlertContextResult, Backend } from './backendTypes.js'

/** T16's `alert_context` reaches ±14 buckets either side of the firing (§5). */
const ALERT_CONTEXT_RADIUS = 14

if (DATA_SOURCE === 'http') {
  // `mockBackend.ts` must never load in an http build. `source.ts` only
  // imports this module when `EYVAR_MCP_SOURCE !== 'http'`; the frontend's
  // own `DATA_SOURCE` (its `VITE_DATA_SOURCE`) is a separate switch and
  // disagreeing with it here would silently talk to fixtures in a build that
  // believes it is live.
  throw new Error('mockBackend loaded against DATA_SOURCE=http — this indicates a misconfigured environment, not a legal state.')
}

/* Zero artificial latency: a tool call is a model turn, not a skeleton a
   human watches render. */
disableMockLatency()

/** T19's stand-in store. See the file header. */
const findingsByJob = new Map<string, Array<{ text: string; runIds: string[] }>>()

export const mockBackend: Backend = {
  today: () => EYVAR_TODAY,

  currentPermissions: async () => {
    const session = await getSession()
    return session.permissions
  },

  listMeasures: (params) => listMeasures({ pageSize: 500, ...params }),
  listDimensions: (params) => listDimensions({ pageSize: 500, ...params }),
  glossary: async (term) => {
    /* The same generator `GET /catalogue/glossary` runs, fed the fixture
       catalogue instead of a database row set — one implementation, two
       measure sources (F-V2-54). */
    const page = await listMeasures({ pageSize: 500 })
    return { markdown: buildGlossaryMarkdown(page.items, term ?? null) }
  },

  recordRun: (query, jobId) => recordRun(query, { jobId }),
  getRun: (runId) => getRun(runId),
  compareWindows: (query, windowA, windowB) => compareWindows(query, windowA, windowB),
  describeSeries: (runId, seriesId) => describeSeries(runId, seriesId),
  contribution: (input) => contribution(input),
  sampleRows: (input) => sampleRows(input),

  listReports: (params) => listReports(params),
  getReport: (id) => getReport(id),
  saveReport: (input) =>
    saveReport({
      id: null,
      name: input.name,
      description: input.description,
      query: input.query,
      visibility: input.visibility,
      tags: input.tags,
    }),

  listPages: (params) => listPages(params),
  getPage: (id) => getPage(id),
  savePage: (input) =>
    savePage({
      id: null,
      kind: input.kind,
      title: input.title,
      icon: null,
      description: null,
      visibility: 'private',
      tags: input.tags,
      scope: { range: null, filters: [] },
      blocks: input.blocks,
    }),

  listAlertRules: (params) => listAlertRules(params),
  getAlertRule: (id) => getAlertRule(id),
  listAlertFirings: (ruleId, params) => listAlertFirings(ruleId, params),
  listFirings: (params) => listFirings(params),
  alertContext: async (firingId) => {
    /* No `getFiring(id)` client exists — `listFirings` is the only read, so
       every firing is paged through once. The seeded fixture set is small
       (tens of rows); a real backend has the dedicated endpoint §5 names. */
    const allFirings = await listFirings({ pageSize: 500 })
    const firing = allFirings.items.find((f) => f.id === firingId)
    if (!firing) return null

    const ruleResult = await getAlertRule(firing.ruleId).catch(() => null)
    if (!ruleResult) return null
    const rule = ruleResult.data

    let series: AlertContextResult['series'] = null
    const reportResult = await getReport(rule.reportId).catch(() => null)
    if (reportResult) {
      const outcome = await runReport(reportResult.data.query)
      if (outcome.status === 'ok') {
        const found = outcome.result.series.find((s) => s.id === rule.seriesId)
        if (found) {
          const bucketIndex = outcome.result.buckets.indexOf(firing.bucketStart)
          const start = bucketIndex === -1 ? 0 : Math.max(0, bucketIndex - ALERT_CONTEXT_RADIUS)
          const end = bucketIndex === -1 ? outcome.result.buckets.length : Math.min(outcome.result.buckets.length, bucketIndex + ALERT_CONTEXT_RADIUS + 1)
          series = {
            id: found.id,
            measureKey: found.measureKey,
            groupValue: found.groupValue,
            buckets: outcome.result.buckets.slice(start, end),
            points: found.points.slice(start, end),
            partialBucketIndexes: found.partialBucketIndexes.filter((i) => i >= start && i < end).map((i) => i - start),
          }
        }
      }
    }

    const priorFirings = (await listAlertFirings(rule.id, { pageSize: 50 })).items
      .filter((f) => f.id !== firing.id && Date.parse(f.firedAt) < Date.parse(firing.firedAt))
      .slice(0, 10)

    const annotations =
      series && series.buckets.length > 0
        ? await listAnnotations({ from: series.buckets[0], to: series.buckets[series.buckets.length - 1] })
        : []

    return {
      rule,
      bucketStart: firing.bucketStart,
      value: firing.value,
      threshold: firing.threshold,
      series,
      priorFirings,
      annotations,
    }
  },

  listAnnotations: (params) => listAnnotations(params),

  getAgentJob: (id) => getAgentJob(id),
  noteFinding: async (jobId, text, runIds) => {
    const existing = findingsByJob.get(jobId) ?? []
    findingsByJob.set(jobId, [...existing, { text, runIds }])
    return { ok: true }
  },
}

/** Test-only seam for `noteFinding.test.ts` to read back what was recorded. */
export function findingsRecordedFor(jobId: string): Array<{ text: string; runIds: string[] }> {
  return findingsByJob.get(jobId) ?? []
}

export function resetMockBackendState(): void {
  findingsByJob.clear()
}
