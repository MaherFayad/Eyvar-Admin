/**
 * T1 `catalogue_measures` — 01-analyst-agent.md §5. "T1 before anything. The
 * system prompt forbids guessing a measure key." Every other tool that takes
 * a measure key refuses one this tool never returned.
 */

import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getBackend } from '../source.js'
import { ok } from '../result.js'
import { resolveKey } from '../labels.js'

const inputShape = {
  query: z.string().optional(),
  category: z.string().optional(),
}

export function registerCatalogueMeasures(server: McpServer): void {
  server.registerTool(
    'eyvar_catalogue_measures',
    {
      description:
        'Lists the measures this operator may query, optionally filtered by free-text `query` or `category`. ' +
        'Call this before naming any measure key elsewhere — a key this tool did not return is refused by ' +
        'plan_query/run_report as unknown-measure. Returns at most 200 measures; the catalogue is small ' +
        '(today, well under that), so this is never truncated in practice.',
      inputSchema: inputShape,
    },
    async ({ query, category }) => {
      const backend = await getBackend()
      const [page, permissions] = await Promise.all([
        backend.listMeasures({ q: query, category, pageSize: 200 }),
        backend.currentPermissions(),
      ])
      const measures = page.items.map((m) => ({
        key: m.key,
        label: resolveKey(m.labelKey),
        caption: resolveKey(m.captionKey),
        unit: m.unit,
        currency: m.currency,
        temporality: m.temporality,
        additive: m.additive,
        minGrain: m.minGrain,
        coverage: m.population.coverage,
        dimensions: m.dimensions,
        filterableFields: m.filterableFields,
        blocked: m.permission !== null && permissions !== null ? !permissions.includes(m.permission.key) : false,
      }))
      return ok('catalogue_measures', { measures, total: page.total })
    },
  )
}
