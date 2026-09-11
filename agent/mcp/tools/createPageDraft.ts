/**
 * T15 `create_page_draft` — 01-analyst-agent.md §5, AC-1244. Writes only a
 * private draft owned by the acting operator, tagged `analyst`, always
 * `publishedAt: null`.
 */

import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getBackend } from '../source.js'
import { ok, refuse } from '../result.js'
import { blockSchema } from '../blockSchema.js'
import type { Block, PageKind } from '../../../src/data/types/page'

const inputShape = {
  title: z.string().min(1).max(120),
  kind: z.enum(['case-study', 'dashboard']),
  blocks: z.array(blockSchema).min(1).max(200),
}

export function registerCreatePageDraft(server: McpServer): void {
  server.registerTool(
    'eyvar_create_page_draft',
    {
      description:
        'Creates a page draft (case-study or dashboard) from blocks, owned by the acting operator, visibility ' +
        'always private, tagged "analyst", publishedAt always null — nothing this tool writes is visible to ' +
        'the team until an operator publishes it. Up to 200 blocks.',
      inputSchema: inputShape,
    },
    async ({ title, kind, blocks }) => {
      const backend = await getBackend()
      const outcome = await backend.savePage({
        kind: kind as PageKind,
        title,
        blocks: blocks as unknown as Block[],
        tags: ['analyst'],
      })
      if (outcome.status !== 'saved' || !outcome.page) {
        return refuse('invalid', 'The page could not be saved.', { violations: outcome.violations ?? [] })
      }
      return ok('create_page_draft', { id: outcome.page.id, publishedAt: outcome.page.publishedAt })
    },
  )
}
