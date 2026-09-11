/** T16 `alerts_list` — 01-analyst-agent.md §5. */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getBackend } from '../source.js'
import { ok } from '../result.js'

export function registerAlertsList(server: McpServer): void {
  server.registerTool(
    'eyvar_alerts_list',
    {
      description: 'Lists every alert rule this operator may see: name, condition, state, last evaluation. Up to 50 rules.',
    },
    async () => {
      const backend = await getBackend()
      const page = await backend.listAlertRules({ pageSize: 50 })
      return ok('alerts_list', { rules: page.items, total: page.total })
    },
  )
}
