/**
 * T4 `plan_query` — a query with violations is never run. Imported directly
 * from `src/data/reporting/plan.ts`, never `src/data/clients` (which pulls
 * in `config.ts`), so this runs identically in mock and http mode.
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
