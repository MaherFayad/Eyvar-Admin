/** T11 `saved_reports_search` — 01-analyst-agent.md §5. */

import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getBackend } from '../source.js'
import { ok } from '../result.js'

const inputShape = {
  query: z.string().optional(),
  mine: z.boolean().optional(),
}

export function registerSavedReportsSearch(server: McpServer): void {
  server.registerTool(
    'eyvar_saved_reports_search',
    {
      description:
        'Searches saved reports by free text; pass `mine: true` to scope to the acting operator\'s own. ' +
        'Returns id, name, description, query and lastRunAt for up to 50 matches.',
      inputSchema: inputShape,
    },
    async ({ query, mine }) => {
      const backend = await getBackend()
      const page = await backend.listReports({ q: query, view: mine ? 'mine' : undefined, pageSize: 50 })
      const reports = page.items.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        query: r.query,
        lastRunAt: r.lastRunAt,
      }))
      return ok('saved_reports_search', { reports, total: page.total })
    },
  )
}
