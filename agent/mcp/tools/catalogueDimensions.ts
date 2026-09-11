/**
 * T2 `catalogue_dimensions` — 01-analyst-agent.md §5. Every group-by key
 * `plan_query`/`run_report` accepts comes from here (or from a measure's own
 * `dimensions` on T1's output).
 */

import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getBackend } from '../source.js'
import { ok, refuse } from '../result.js'
import { resolveKey } from '../labels.js'

const inputShape = {
  forMeasure: z.string().optional(),
}

export function registerCatalogueDimensions(server: McpServer): void {
  server.registerTool(
    'eyvar_catalogue_dimensions',
    {
      description:
        'Lists group-by dimensions, with a cardinality hint each (§7.4: a split with more than 8 groups folds ' +
        'the rest into "Other"). Pass `forMeasure` to narrow to the dimensions legal for that one measure key — ' +
        'an unrecognised key is refused (unknown-measure), never silently ignored. Returns at most 200 rows.',
      inputSchema: inputShape,
    },
    async ({ forMeasure }) => {
      const backend = await getBackend()
      const dimensionPage = await backend.listDimensions({ pageSize: 200 })
      const dimensionsByKey = new Map(dimensionPage.items.map((d) => [d.key, d]))

      if (forMeasure === undefined) {
        const dimensions = dimensionPage.items.map((d) => ({
          key: d.key,
          label: resolveKey(d.labelKey),
          resource: d.resource,
          cardinalityHint: d.cardinalityHint,
        }))
        return ok('catalogue_dimensions', { dimensions })
      }

      const measurePage = await backend.listMeasures({ pageSize: 200 })
      const measure = measurePage.items.find((m) => m.key === forMeasure)
      if (!measure) {
        return refuse('unknown-measure', `"${forMeasure}" is not a measure key catalogue_measures returned.`, { forMeasure })
      }
      const dimensions = measure.dimensions
        .map((ref) => {
          const catalogued = dimensionsByKey.get(ref.key)
          if (!catalogued) return null
          return {
            key: ref.key,
            label: resolveKey(catalogued.labelKey),
            resource: catalogued.resource,
            /** The measure's own hint, not the catalogue-wide one — §7.4's fold is measure-specific. */
            cardinalityHint: ref.cardinalityHint,
          }
        })
        .filter((d): d is NonNullable<typeof d> => d !== null)
      return ok('catalogue_dimensions', { dimensions, forMeasure })
    },
  )
}
