/** T16 `alert_context` — 01-analyst-agent.md §5. */

import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getBackend } from '../source.js'
import { ok, refuse } from '../result.js'

const inputShape = { firingId: z.string().min(1) }

export function registerAlertContext(server: McpServer): void {
  server.registerTool(
    'eyvar_alert_context',
    {
      description:
        'Everything to triage one alert firing: the rule, the threshold, the series ±14 buckets around the ' +
        'firing bucket, prior firings of the same rule, and product annotations in that range.',
      inputSchema: inputShape,
    },
    async ({ firingId }) => {
      const backend = await getBackend()
      const context = await backend.alertContext(firingId)
      if (!context) return refuse('not-found', `No alert firing with id "${firingId}".`, { firingId })
      return ok('alert_context', context)
    },
  )
}
