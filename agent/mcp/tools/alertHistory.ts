/** T16 `alert_history` — 01-analyst-agent.md §5. */

import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getBackend } from '../source.js'
import { ok, refuse } from '../result.js'

const inputShape = { ruleId: z.string().min(1) }

export function registerAlertHistory(server: McpServer): void {
  server.registerTool(
    'eyvar_alert_history',
    {
      description: 'Past firings of one alert rule, newest first. Up to 50.',
      inputSchema: inputShape,
    },
    async ({ ruleId }) => {
      const backend = await getBackend()
      const rule = await backend.getAlertRule(ruleId).catch(() => null)
      if (!rule) return refuse('not-found', `No alert rule with id "${ruleId}".`, { ruleId })
      const page = await backend.listAlertFirings(ruleId, { pageSize: 50 })
      return ok('alert_history', { ruleId, firings: page.items, total: page.total })
    },
  )
}
