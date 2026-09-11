/**
 * T4 `plan_query` — 01-analyst-agent.md §5. "T4 before T5. A query with
 * violations is never run." Pure, imported directly from
 * `src/data/reporting/plan.ts` (never through `src/data/clients`, which pulls
 * in `config.ts` — see `source.ts`'s header) so this runs identically in
 * mock and http mode; only the catalogue fetch is source-gated.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { planQuery, type Catalogue } from '../../../src/data/reporting/plan'
import type { ReportQuery } from '../../../src/data/types/report'
import { getBackend } from '../source.js'
import { ok } from '../result.js'
import { reportQuerySchema } from '../reportQuerySchema.js'

const inputShape = {
  query: reportQuerySchema,
}

export function registerPlanQuery(server: McpServer): void {
  server.registerTool(
    'eyvar_plan_query',
    {
      description:
        'Checks a ReportQuery for legality before it runs: violations with reasons, which grains and chart ' +
        'types are legal, the bucket count, and the effective chart type. Always call this before run_report — ' +
        'a query with violations is never run. Returns the same shape whether the query is legal or not.',
      inputSchema: inputShape,
    },
    async ({ query }) => {
      const backend = await getBackend()
      const [measures, dimensions] = await Promise.all([
        backend.listMeasures({ pageSize: 200 }),
        backend.listDimensions({ pageSize: 200 }),
      ])
      const catalogue: Catalogue = { measures: measures.items, dimensions: dimensions.items }
      const plan = planQuery(query as unknown as ReportQuery, catalogue, backend.today())
      return ok('plan_query', { plan })
    },
  )
}
