/** T18 `prior_studies_search` — 01-analyst-agent.md §5. */

import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getBackend } from '../source.js'
import { ok } from '../result.js'

const inputShape = { query: z.string().min(1) }

export function registerPriorStudiesSearch(server: McpServer): void {
  server.registerTool(
    'eyvar_prior_studies_search',
    {
      description:
        'Searches previous case-study pages by free text: title, date, question, headline finding. Use before ' +
        'starting a new study on a similar question — §12 keeps no memory across jobs beyond this search.',
      inputSchema: inputShape,
    },
    async ({ query }) => {
      const backend = await getBackend()
      const page = await backend.listPages({
        q: query,
        pageSize: 50,
        filters: [{ field: 'kind', op: 'eq', value: 'case-study' }],
      })
      const studies = page.items.map((p) => ({
        id: p.id,
        title: p.title,
        date: p.createdAt,
        headline: p.description,
      }))
      return ok('prior_studies_search', { studies })
    },
  )
}
