/**
 * T3 `glossary` — 01-analyst-agent.md §5. Reads the same generator the
 * server's `GET /catalogue/glossary` runs (`api/_lib/glossary.ts`), so a
 * redefined measure never leaves a stale copy behind (F-V2-54). The two
 * tool-only rules with no catalogue counterpart (`glossaryData.ts`) are
 * appended.
 */

import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getBackend } from '../source.js'
import { ok } from '../result.js'
import { toolGlossaryMarkdown } from '../glossaryData.js'

const inputShape = {
  term: z.string().optional(),
}

export function registerGlossary(server: McpServer): void {
  server.registerTool(
    'eyvar_glossary',
    {
      description:
        'The catalogue glossary, generated from the live measure catalogue: business rules (the Riyadh-day ' +
        'rule, the Sunday-week rule, the money rule, gap-vs-zero, partial buckets, coverage) plus every ' +
        "measure's own definition. Never hand-maintained, so a redefined measure cannot go stale here. Also " +
        'carries two tool-only rules the catalogue cannot state: blocked series, run provenance. Omit `term` ' +
        'for the whole glossary; `term` narrows by measure key, label key or category.',
      inputSchema: inputShape,
    },
    async ({ term }) => {
      const backend = await getBackend()
      const { markdown } = await backend.glossary(term)
      const toolRules = toolGlossaryMarkdown(term)
      return ok('glossary', { markdown: toolRules ? `${markdown}\n${toolRules}` : markdown })
    },
  )
}
