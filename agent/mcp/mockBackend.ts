/**
 * The mock `Backend` — `01-analyst-agent.md` §3.4. Imports the frontend
 * clients directly, the same seam every screen uses
 * (`src/data/clients/index.ts`'s "components import from here… nothing
 * else"). Loaded only when `EYVAR_MCP_SOURCE !== 'http'`, and only via
 * `source.ts`'s dynamic `import()` — see that file for why.
 *
 * **Gap, flagged for the report rather than fixed here (out of `agent/**`'s
 * touch scope is `src/`, but this specific gap is inside it too — noted, not
 * patched):** `noteFinding` below has no client function to call through.
 * `src/data/clients/agent.ts` exports `listAgentJobs/getAgentJob/
 * listAgentJobEvents/createAgentJob/getAgentStatus` but nothing that appends
 * a finding (`POST /api/v1/agent/jobs/:id/findings`, T19's own endpoint).
 * This backend keeps findings in a module-level map instead, so T19 is
 * exercised and testable, but it is not writing through the same seam as
 * every other tool. The owner of `agent.ts` should add `noteAgentFinding`.
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
  sampleRows,
  savePage,
  saveReport,
  compareWindows,
} from '../../src/data/clients/index'
import type { Backend } from './backendTypes.js'

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
