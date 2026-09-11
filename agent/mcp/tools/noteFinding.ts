/**
 * T19 `note_finding` — 01-analyst-agent.md §5. Appends an interim finding to
 * the job, shown live in the timeline. Refuses a `runId` this job has not
 * actually produced — a finding citing a run nobody ran is exactly the
 * "no number without a run" defect §7 exists to prevent, caught here as
 * early as it can be rather than only at the runner's final validation.
 */

import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getBackend } from '../source.js'
import { ok, refuse } from '../result.js'

const inputShape = {
  text: z.string().min(1),
  runIds: z.array(z.string().min(1)).min(1),
}

export function registerNoteFinding(server: McpServer): void {
  server.registerTool(
    'eyvar_note_finding',
    {
      description:
        'Appends an interim finding to this job, shown live on the job page before the final answer. Every ' +
        'finding must name at least one runId from run_report/compare_windows/contribution — a finding with no ' +
        'evidence is refused, not recorded.',
      inputSchema: inputShape,
    },
    async ({ text, runIds }) => {
      const backend = await getBackend()
      for (const runId of runIds) {
        const run = await backend.getRun(runId).catch(() => null)
        if (!run) return refuse('run-not-found', `No run with id "${runId}" in this job's tool log.`, { runId })
      }
      const jobId = process.env.EYVAR_JOB_ID
      if (!jobId) return refuse('no-job', 'EYVAR_JOB_ID is not set — note_finding has no job to append to.')
      await backend.noteFinding(jobId, text, runIds)
      return ok('note_finding', { ok: true })
    },
  )
}
