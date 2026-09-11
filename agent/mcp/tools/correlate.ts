/**
 * T8 `correlate` — 01-analyst-agent.md §5. Pearson and Spearman between two
 * series of two stored runs, at lag 0…maxLag. Arithmetic is
 * `src/data/reporting/stats.ts`'s `correlate()` — called, never
 * reimplemented.
 */

import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getBackend } from '../source.js'
import { ok, refuse } from '../result.js'
import { correlate } from '../../../src/data/reporting/stats'
import type { Backend } from '../backendTypes.js'

const seriesRef = z.object({ runId: z.string().min(1), seriesId: z.string().min(1) })

const inputShape = {
  a: seriesRef,
  b: seriesRef,
  maxLag: z.number().int().min(0).max(30).optional(),
}

async function resolveSeries(backend: Backend, ref: { runId: string; seriesId: string }) {
  const run = await backend.getRun(ref.runId).catch(() => null)
  if (!run) return { error: `No run with id "${ref.runId}" in this job's tool log.` as const }
  const series = run.data.result.series.find((s) => s.id === ref.seriesId)
  if (!series) return { error: `Run "${ref.runId}" has no series "${ref.seriesId}".` as const }
  return { series }
}

export function registerCorrelate(server: McpServer): void {
  server.registerTool(
    'eyvar_correlate',
    {
      description:
        'Pearson and Spearman correlation between two series (each from a run already produced), at lag ' +
        '0…maxLag (default 0, max 30). Refuses (insufficient-pairs) below 8 usable paired buckets rather than ' +
        'reporting a weak correlation on too little data. Always carries the correlation-not-causation caveat.',
      inputSchema: inputShape,
    },
    async ({ a, b, maxLag }) => {
      const backend = await getBackend()
      const [resolvedA, resolvedB] = await Promise.all([resolveSeries(backend, a), resolveSeries(backend, b)])
      if ('error' in resolvedA) return refuse('run-not-found', resolvedA.error, { ref: a })
      if ('error' in resolvedB) return refuse('run-not-found', resolvedB.error, { ref: b })

      const result = correlate(
        resolvedA.series.points,
        resolvedB.series.points,
        maxLag ?? 0,
        resolvedA.series.partialBucketIndexes,
        resolvedB.series.partialBucketIndexes,
      )
      if (!result.ok) {
        return refuse('insufficient-pairs', `Only ${result.pairs} usable paired buckets; at least 8 are needed.`, {
          pairs: result.pairs,
        })
      }
      return ok('correlate', result)
    },
  )
}
