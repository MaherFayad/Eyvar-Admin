/**
 * T7 `describe_series` — 01-analyst-agent.md §5. Descriptive stats over a
 * stored run's series, read back rather than re-run, so the numbers match
 * what was cited. The arithmetic is `src/data/reporting/stats.ts`'s
 * `describe()` — called, never reimplemented (AGENT-BRIEF.md).
 */

import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getBackend } from '../source.js'
import { ok, refuse } from '../result.js'

const inputShape = {
  runId: z.string().min(1),
  seriesId: z.string().min(1),
}

export function registerDescribeSeries(server: McpServer): void {
  server.registerTool(
    'eyvar_describe_series',
    {
      description:
        'Descriptive stats for one series of a run already produced by run_report/compare_windows: mean, ' +
        'median, p10/p90, MAD, a linear trend with r², CUSUM change points, outliers (|z-MAD| > 3.5), and a ' +
        'weekday profile at day grain. Refuses (series-not-found) a seriesId not on that run.',
      inputSchema: inputShape,
    },
    async ({ runId, seriesId }) => {
      const backend = await getBackend()
      const run = await backend.getRun(runId).catch(() => null)
      if (!run) return refuse('run-not-found', `No run with id "${runId}" in this job's tool log.`, { runId })
      const exists = run.data.result.series.some((s) => s.id === seriesId)
      if (!exists) {
        return refuse('series-not-found', `Run "${runId}" has no series "${seriesId}".`, {
          runId,
          seriesId,
          availableSeriesIds: run.data.result.series.map((s) => s.id),
        })
      }
      const result = await backend.describeSeries(runId, seriesId)
      return ok('describe_series', { runId, seriesId, ...result })
    },
  )
}
