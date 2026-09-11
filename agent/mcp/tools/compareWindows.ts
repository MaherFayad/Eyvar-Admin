/**
 * T6 `compare_windows` — 01-analyst-agent.md §5. Two `run_report`-equivalent
 * calls at `windowA`/`windowB`, joined by measure + group. Records two runs.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getBackend } from '../source.js'
import { ok, refuse } from '../result.js'
import { reportQuerySchema, reportWindowSchema } from '../reportQuerySchema.js'
import type { ReportQuery, ReportWindow } from '../../../src/data/types/report'

const inputShape = {
  query: reportQuerySchema,
  windowA: reportWindowSchema,
  windowB: reportWindowSchema,
}

export function registerCompareWindows(server: McpServer): void {
  server.registerTool(
    'eyvar_compare_windows',
    {
      description:
        'Runs the same query over two windows and returns per-series deltas (absolute and percent), with a ' +
        'null on either side where that window has a gap. Records both runs — cite both runIds in a finding ' +
        'that uses this. Refuses (invalid-query) when the query has planner violations.',
      inputSchema: inputShape,
    },
    async ({ query, windowA, windowB }) => {
      const backend = await getBackend()
      const outcome = await backend.compareWindows(
        query as unknown as ReportQuery,
        windowA as unknown as ReportWindow,
        windowB as unknown as ReportWindow,
      )
      if ('status' in outcome && outcome.status === 'invalid-query') {
        return refuse('invalid-query', 'The query has planner violations — call plan_query to see them.')
      }
      return ok('compare_windows', outcome)
    },
  )
}
