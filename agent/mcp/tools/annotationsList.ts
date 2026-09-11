/** T17 `annotations_list` — 01-analyst-agent.md §5. */

import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getBackend } from '../source.js'
import { ok } from '../result.js'

const inputShape = {
  from: z.string().optional(),
  to: z.string().optional(),
}

export function registerAnnotationsList(server: McpServer): void {
  server.registerTool(
    'eyvar_annotations_list',
    {
      description:
        'Product annotations (launches, price changes, outages, campaigns) between `from` and `to` (ISO dates, ' +
        'inclusive). A step-6 alternative explanation to test before proposing a cause of its own.',
      inputSchema: inputShape,
    },
    async ({ from, to }) => {
      const backend = await getBackend()
      const annotations = await backend.listAnnotations({ from, to })
      return ok('annotations_list', { annotations })
    },
  )
}
