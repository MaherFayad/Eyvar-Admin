/**
 * T5 `run_report` — 01-analyst-agent.md §5. "T5 always records." Every call
 * mints a fresh `runId`; that id is the unit of evidence a finding cites and
 * the runner validates against.
 */

import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getBackend } from '../source.js'
import { ok, refuse } from '../result.js'
import { reportQuerySchema } from '../reportQuerySchema.js'
import { truncateSeries } from '../limits.js'
import type { ReportQuery } from '../../../src/data/types/report'

const inputShape = {
  query: reportQuerySchema,
  label: z.string().optional(),
}

export function registerRunReport(server: McpServer): void {
  server.registerTool(
    'eyvar_run_report',
    {
      description:
        'Runs a ReportQuery and records it as a run: every finding must cite the returned runId. Refuses a ' +
        'query with planner violations rather than running it (call plan_query first to see them coming). ' +
        'Each series is truncated to the most recent 400 buckets, and the summary excludes partial buckets.',
      inputSchema: inputShape,
    },
    async ({ query, label }) => {
      const backend = await getBackend()
      const jobId = process.env.EYVAR_JOB_ID ?? null
      const outcome = await backend.recordRun(query as unknown as ReportQuery, jobId)
      if (outcome.status === 'invalid-query') {
        return refuse('invalid-query', 'The query has planner violations — call plan_query to see them.', {
          violations: outcome.violations,
        })
      }
      /* Every series shares `result.buckets`, so the truncation window is the
         same for all of them — computed once against buckets alone, then
         applied per series so each keeps its own points/partial indexes
         aligned to the (possibly shorter) shared bucket list. */
      const bucketWindow = truncateSeries(outcome.result.buckets, outcome.result.buckets)
      const series = outcome.result.series.map((s) => {
        const t = truncateSeries(outcome.result.buckets, s.points, s.partialBucketIndexes)
        return {
          id: s.id,
          measureKey: s.measureKey,
          groupValue: s.groupValue,
          role: s.role,
          unit: s.unit,
          currency: s.currency,
          blocked: s.blocked,
          failed: s.failed,
          points: t.points,
          partialBucketIndexes: t.partialBucketIndexes,
        }
      })
      return ok('run_report', {
        runId: outcome.runId,
        label: label ?? null,
        buckets: bucketWindow.points,
        seriesTruncated: bucketWindow.truncated,
        asOf: outcome.result.asOf,
        rowCapTruncated: outcome.result.truncated,
        series,
        summary: outcome.summary,
      })
    },
  )
}
