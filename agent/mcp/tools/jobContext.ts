/**
 * T20 `job_context` — the job's record, its context objects resolved to
 * full content, the operator's language, today in Riyadh, and the
 * catalogue's coverage window. `EYVAR_JOB_ID` names which job.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getBackend } from '../source.js'
import { ok, refuse } from '../result.js'

export function registerJobContext(server: McpServer): void {
  server.registerTool(
    'eyvar_job_context',
    {
      description:
        "This job's own kind, question, attached context objects (resolved to their content — a report, a " +
        "page or a firing, not just an id), the operator's language, today's date in Asia/Riyadh, and the " +
        'catalogue\'s overall data coverage window. Call once at the start of a job.',
    },
    async () => {
      const jobId = process.env.EYVAR_JOB_ID
      if (!jobId) return refuse('no-job', 'EYVAR_JOB_ID is not set — job_context has no job to describe.')

      const backend = await getBackend()
      const job = await backend.getAgentJob(jobId).catch(() => null)
      if (!job) return refuse('not-found', `No job with id "${jobId}".`, { jobId })

      const contextObjects = await Promise.all(
        job.data.contextObjects.map(async (c) => {
          if (c.kind === 'report') {
            const r = await backend.getReport(c.id).catch(() => null)
            return { kind: c.kind, id: c.id, content: r?.data ?? null }
          }
          if (c.kind === 'page') {
            const p = await backend.getPage(c.id).catch(() => null)
            return { kind: c.kind, id: c.id, content: p?.data ?? null }
          }
          if (c.kind === 'firing') {
            const ctx = await backend.alertContext(c.id)
            return { kind: c.kind, id: c.id, content: ctx }
          }
          return { kind: c.kind, window: c.window }
        }),
      )

      const measures = (await backend.listMeasures({ pageSize: 200 })).items
      const coverage = measures.reduce<{ from: string | null; to: string | null }>(
        (acc, m) => ({
          from: acc.from === null || m.population.coverage.from < acc.from ? m.population.coverage.from : acc.from,
          to: acc.to === null || m.population.coverage.to > acc.to ? m.population.coverage.to : acc.to,
        }),
        { from: null, to: null },
      )

      return ok('job_context', {
        jobId,
        kind: job.data.kind,
        question: job.data.question,
        language: job.data.language,
        contextObjects,
        today: backend.today(),
        dataCoverage: coverage,
      })
    },
  )
}
