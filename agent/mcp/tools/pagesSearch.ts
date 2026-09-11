/** T14 `pages_search` — 01-analyst-agent.md §5. */

import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getBackend } from '../source.js'
import { ok } from '../result.js'

const inputShape = { query: z.string().optional() }

export function registerPagesSearch(server: McpServer): void {
  server.registerTool(
    'eyvar_pages_search',
    {
      description: 'Searches pages (dashboards, case studies, notes) by free text. Blocks are not included — call get_page for those. Up to 50 matches.',
      inputSchema: inputShape,
    },
    async ({ query }) => {
      const backend = await getBackend()
      const page = await backend.listPages({ q: query, pageSize: 50 })
      const pages = page.items.map((p) => ({
        id: p.id,
        kind: p.kind,
        title: p.title,
        description: p.description,
        publishedAt: p.publishedAt,
      }))
      return ok('pages_search', { pages, total: page.total })
    },
  )
}
