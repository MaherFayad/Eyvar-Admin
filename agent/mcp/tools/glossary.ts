/**
 * T3 `glossary` — 01-analyst-agent.md §5. Definitions of business terms, plus
 * a matching measure's own caption when `term` is a measure key. See
 * `glossaryData.ts` for the gap this starter content stands in for.
 */

import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getBackend } from '../source.js'
import { ok } from '../result.js'
import { resolveKey } from '../labels.js'
import { findGlossaryEntries } from '../glossaryData.js'

const inputShape = {
  term: z.string().optional(),
}

export function registerGlossary(server: McpServer): void {
  server.registerTool(
    'eyvar_glossary',
    {
      description:
        'Definitions of business terms (the Riyadh-day rule, the Sunday-week rule, the money rule, gap-vs-zero, ' +
        'partial buckets, blocked series, run provenance) and a measure\'s own caption when `term` matches a ' +
        'measure key from catalogue_measures. Omit `term` for the whole glossary.',
      inputSchema: inputShape,
    },
    async ({ term }) => {
      const entries = findGlossaryEntries(term).map((e) => ({ term: e.term, definition: e.definition }))

      if (term !== undefined) {
        const backend = await getBackend()
        const page = await backend.listMeasures({ pageSize: 200 })
        const measure = page.items.find((m) => m.key === term)
        if (measure && measure.captionKey !== null) {
          entries.push({ term: measure.key, definition: resolveKey(measure.captionKey) as string })
        }
      }

      return ok('glossary', { entries })
    },
  )
}
