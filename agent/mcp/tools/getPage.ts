/**
 * T14 `get_page` — 01-analyst-agent.md §5. Blocks are capped: a page with
 * many blocks is truncated with a stated count, matching §5's "pages
 * (blocks capped)" and the 64 KB rule every tool follows (AC-1243).
 */

import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getBackend } from '../source.js'
import { ok, refuse } from '../result.js'

const inputShape = { id: z.string().min(1) }

/** A page's blocks can be arbitrarily long prose; 40 is generous for a page a tool call reasons over. */
const MAX_BLOCKS = 40

export function registerGetPage(server: McpServer): void {
  server.registerTool(
    'eyvar_get_page',
    {
      description: `The full page for an id from pages_search/prior_studies_search, blocks capped at ${MAX_BLOCKS} with a stated truncation.`,
      inputSchema: inputShape,
    },
    async ({ id }) => {
      const backend = await getBackend()
      const page = await backend.getPage(id).catch(() => null)
      if (!page) return refuse('not-found', `No page with id "${id}".`, { id })
      const blocks = page.data.blocks.slice(0, MAX_BLOCKS)
      return ok('get_page', {
        page: { ...page.data, blocks },
        blocksTruncated: page.data.blocks.length > MAX_BLOCKS,
        totalBlocks: page.data.blocks.length,
      })
    },
  )
}
