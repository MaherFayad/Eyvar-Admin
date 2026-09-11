/**
 * T9 `contribution` — 01-analyst-agent.md §5. Which groups of `query.groupBy[0]`
 * explain the change between two windows. Records the two runs it composes.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getBackend } from '../source.js'
import { ok } from '../result.js'
import { reportQuerySchema, reportWindowSchema } from '../reportQuerySchema.js'
import type { ReportQuery, ReportWindow } from '../../../src/data/types/report'

const inputShape = {
  query: reportQuerySchema,
  windowA: reportWindowSchema,
  windowB: reportWindowSchema,
}

export function registerContribution(server: McpServer): void {
  server.registerTool(
    'eyvar_contribution',
    {
      description:
        'Which groups of `query.groupBy[0]` explain the change between windowA and windowB: each group\'s ' +
        'absolute delta, its share of the total change, and its rank. `query` must have at least one groupBy. ' +
        'Records both underlying runs.',
      inputSchema: inputShape,
    },
    async ({ query, windowA, windowB }) => {
      const backend = await getBackend()
      const result = await backend.contribution({
        query: query as unknown as ReportQuery,
        windowA: windowA as unknown as ReportWindow,
        windowB: windowB as unknown as ReportWindow,
      })
      return ok('contribution', result)
    },
  )
}
