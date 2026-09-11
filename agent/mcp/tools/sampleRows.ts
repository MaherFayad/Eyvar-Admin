/**
 * T10 `sample_rows` — 01-analyst-agent.md §5, D44, AC-1242. "The only
 * row-level access", masked server-side, capped at 50 rows. Masking happens
 * in `src/data/mock/resolveReport.ts::sampleRows` (mock) / the real backend
 * (http) — this tool never sees an unmasked row, so no argument here can
 * defeat it. The permission gate is this tool's own, since a raw resource
 * has no `Measure.permission` to inherit (see `permissions.ts`).
 */

import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getBackend } from '../source.js'
import { ok, refuse } from '../result.js'
import { filterSpecSchema } from '../reportQuerySchema.js'
import { requiredPermissionFor } from '../permissions.js'
import { MAX_SAMPLE_ROWS } from '../limits.js'

const inputShape = {
  resource: z.enum(['drivers', 'riders', 'subscriptions', 'trips', 'daily-snapshots']),
  filters: z.array(filterSpecSchema).default([]),
  bucket: z.string().optional(),
  /** Values above 50 are clamped, never refused (D44's own rule) — see `limits.ts`. */
  limit: z.number().int().positive().optional(),
}

export function registerSampleRows(server: McpServer): void {
  server.registerTool(
    'eyvar_sample_rows',
    {
      description:
        'Row-level samples of a resource, PII masked server-side (name → initials, phone → last two digits, ' +
        'ids intact) — the only row-level access this agent has. Masked fields must not be treated as ' +
        'identities to infer. Capped at 50 rows regardless of `limit`. Refuses (forbidden) for an operator ' +
        'without view access to the resource.',
      inputSchema: inputShape,
    },
    async ({ resource, filters, bucket, limit }) => {
      const backend = await getBackend()
      const required = requiredPermissionFor(resource)
      if (required) {
        const permissions = await backend.currentPermissions()
        if (permissions !== null && !permissions.includes(required)) {
          return refuse('forbidden', `This operator lacks "${required}", required to view "${resource}" rows.`, {
            resource,
            requiredPermission: required,
          })
        }
      }
      const cappedLimit = limit === undefined ? MAX_SAMPLE_ROWS : Math.min(limit, MAX_SAMPLE_ROWS)
      const rows = await backend.sampleRows({ resource, filters, bucket, limit: cappedLimit })
      return ok('sample_rows', { resource, rows, rowCap: MAX_SAMPLE_ROWS })
    },
  )
}
