/**
 * T13 `save_report` — 01-analyst-agent.md §5, AC-1244. Writes only a private
 * draft owned by the acting operator, tagged `analyst`.
 */

import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getBackend } from '../source.js'
import { ok, refuse } from '../result.js'
import { reportQuerySchema } from '../reportQuerySchema.js'
import type { ReportQuery } from '../../../src/data/types/report'

const inputShape = {
  name: z.string().min(1).max(80),
  description: z.string().nullable().optional(),
  query: reportQuerySchema,
  visibility: z.literal('private'),
}

export function registerSaveReport(server: McpServer): void {
  server.registerTool(
    'eyvar_save_report',
    {
      description:
        'Saves a query as a report, owned by the acting operator, visibility always private, tagged ' +
        '"analyst" — nothing this tool writes is visible to the team until an operator publishes it. ' +
        '`visibility` must be "private"; any other value is refused, not silently downgraded.',
      inputSchema: inputShape,
    },
    async ({ name, description, query }) => {
      const backend = await getBackend()
      const outcome = await backend.saveReport({
        name,
        description: description ?? null,
        query: query as unknown as ReportQuery,
        visibility: 'private',
        tags: ['analyst'],
      })
      if (outcome.status !== 'saved' || !outcome.report) {
        return refuse('invalid', 'The report could not be saved.', { reasons: outcome.reasons ?? [] })
      }
      return ok('save_report', { report: outcome.report })
    },
  )
}
