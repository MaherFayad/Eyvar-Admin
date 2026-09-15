/**
 * `/api/cron/agent-schedules` (every 15 minutes, `vercel.json`) — WP-7.6,
 * `01-analyst-agent.md` §8: enqueues a job for every due, enabled
 * `agent_schedules` row via `enqueueDueAgentSchedules` (AC-1266's exactly-once
 * arbitration lives there, shared verbatim with the runner-side fallback's
 * `POST /agent/schedules/enqueue-due`).
 *
 * §1a: Hobby refuses a cron finer than daily, so this endpoint may simply
 * never run there — `agent/runner/schedule.ts` is the fallback, not this
 * file papering over the gap.
 */
import { createPgPoolDatabase, type Database } from '../_lib/db'
import { requireCronSecret } from '../_lib/cronAuth'
import { errorResponse } from '../_lib/errors'
import { jsonResponse } from '../_lib/envelope'
import { enqueueDueAgentSchedules, type EnqueueDueSchedulesSummary } from '../_lib/handlers/agent'

export interface AgentSchedulesCronDeps {
  db: Database
}

/** The core: `requireCronSecret` then `enqueueDueAgentSchedules`. Exported so a test drives it without an HTTP round trip. */
export async function runAgentSchedulesCron(req: Request, deps: AgentSchedulesCronDeps, cronSecret?: string): Promise<EnqueueDueSchedulesSummary> {
  requireCronSecret(req, cronSecret)
  return enqueueDueAgentSchedules(deps.db)
}

export default async function handler(req: Request): Promise<Response> {
  const requestId = req.headers.get('x-vercel-id') ?? crypto.randomUUID()
  try {
    requireCronSecret(req)
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) throw new Error('DATABASE_URL is not set')
    const db = createPgPoolDatabase(connectionString)
    try {
      const summary = await enqueueDueAgentSchedules(db)
      return jsonResponse(summary)
    } finally {
      await db.close()
    }
  } catch (err) {
    return errorResponse(err, requestId)
  }
}
