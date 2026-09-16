/**
 * §8's runner-side fallback (AC-1266/AC-1267): Vercel Hobby refuses a cron
 * finer than daily (§1a), so the runner also polls for a due schedule
 * itself, via the same backend call the cron uses — AC-1266's unique constraint prevents a double-enqueue.
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
 * Runs once per poll cycle; a no-op until `nextCheckAt` passes, sharing the
 * poll loop's own cadence and error handling rather than a second timer.
 * Returns the summary when a check ran, `null` when throttled.
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
