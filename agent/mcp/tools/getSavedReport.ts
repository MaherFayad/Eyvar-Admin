/** T12 `get_saved_report` — 01-analyst-agent.md §5. */

import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getBackend } from '../source.js'
import { ok, refuse } from '../result.js'

const inputShape = { id: z.string().min(1) }

export function registerGetSavedReport(server: McpServer): void {
  server.registerTool(
    'eyvar_get_saved_report',
    {
      description: 'The full saved report for an id from saved_reports_search or prior_studies_search.',
      inputSchema: inputShape,
    },
    async ({ id }) => {
      const backend = await getBackend()
      const report = await backend.getReport(id).catch(() => null)
      if (!report) return refuse('not-found', `No saved report with id "${id}".`, { id })
      return ok('get_saved_report', { report: report.data })
    },
  )
}
