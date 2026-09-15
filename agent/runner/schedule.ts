/**
 * The runner-side fallback for scheduled reviews (§8, AC-1266/AC-1267).
 *
 * `/api/cron/agent-schedules` is the primary path, but §1a is explicit that
 * Vercel Hobby refuses a cron finer than daily — on that plan the 15-minute
 * `agent-schedules` cron may simply never run. The runner already polls the
 * job queue continuously, so it also checks for a due schedule on its own,
 * throttled to `scheduleCheckIntervalMs` rather than every poll tick. This
 * calls the exact same backend function (`enqueueDueAgentSchedules`) the
 * cron calls, through `POST /agent/schedules/enqueue-due` — AC-1266's
 * unique-constraint arbitration is what keeps the two from ever enqueuing
 * the same due schedule twice, not anything this file does.
 *
 * A failed check is logged and swallowed, exactly like `index.ts`'s own
 * heartbeat: a schedule that could not be checked this tick is checked
 * again next tick, and never crashes the poll loop.
 */

import { enqueueDueSchedules, type EnqueueDueSchedulesSummary } from './httpClient.js'
import type { RunnerEnv } from './env.js'

export interface ScheduleCheckState {
  /** `Date.now()`-scale. `0` means "due immediately" — the runner's first poll cycle always checks. */
  nextCheckAt: number
}

export function initialScheduleCheckState(): ScheduleCheckState {
  return { nextCheckAt: 0 }
}

/**
 * Called once per poll cycle; does nothing until `nextCheckAt` has passed, so
 * this shares the poll loop's own cadence and error handling instead of a
 * second timer racing the first. Returns the summary when a check actually
 * ran, `null` when it was throttled — the shape `index.test.ts` asserts on.
 */
export async function checkSchedulesDue(
  env: RunnerEnv,
  state: ScheduleCheckState,
  nowMs: () => number = Date.now,
): Promise<EnqueueDueSchedulesSummary | null> {
  const now = nowMs()
  if (now < state.nextCheckAt) return null
  state.nextCheckAt = now + env.scheduleCheckIntervalMs
  try {
    return await enqueueDueSchedules(env)
  } catch (error: unknown) {
    console.error('schedule check failed:', error)
    return null
  }
}
