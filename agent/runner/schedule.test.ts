/**
 * §8's runner-side fallback (AC-1266/AC-1267) — `checkSchedulesDue`, with
 * `./httpClient.js` mocked. The exactly-once arbitration is a server
 * property (`api/v1/agent.test.ts`'s AC-1266 block); this only proves the throttle and the "never crashes the poll loop" contract.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readRunnerEnv } from './env.js'

const httpClientMocks = vi.hoisted(() => ({ enqueueDueSchedules: vi.fn() }))
vi.mock('./httpClient.js', () => httpClientMocks)

const { checkSchedulesDue, initialScheduleCheckState } = await import('./schedule.js')

beforeEach(() => {
  vi.clearAllMocks()
})

const ENV = readRunnerEnv({ runnerToken: 'test-token', scheduleCheckIntervalMs: 300_000 })

describe('checkSchedulesDue', () => {
  it('checks on the very first call (nextCheckAt starts at 0)', async () => {
    httpClientMocks.enqueueDueSchedules.mockResolvedValueOnce({ checked: 1, enqueued: 1 })
    const state = initialScheduleCheckState()

    const result = await checkSchedulesDue(ENV, state, () => 1_000)

    expect(httpClientMocks.enqueueDueSchedules).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ checked: 1, enqueued: 1 })
  })

  it('is throttled to scheduleCheckIntervalMs — a second call before the interval elapses does nothing', async () => {
    httpClientMocks.enqueueDueSchedules.mockResolvedValue({ checked: 1, enqueued: 0 })
    const state = initialScheduleCheckState()

    await checkSchedulesDue(ENV, state, () => 1_000)
    const second = await checkSchedulesDue(ENV, state, () => 1_000 + 60_000) // one minute later, interval is 5 minutes

    expect(httpClientMocks.enqueueDueSchedules).toHaveBeenCalledTimes(1)
    expect(second).toBeNull()
  })

  it('checks again once the interval has elapsed', async () => {
    httpClientMocks.enqueueDueSchedules.mockResolvedValue({ checked: 1, enqueued: 0 })
    const state = initialScheduleCheckState()

    await checkSchedulesDue(ENV, state, () => 1_000)
    await checkSchedulesDue(ENV, state, () => 1_000 + 300_001)

    expect(httpClientMocks.enqueueDueSchedules).toHaveBeenCalledTimes(2)
  })

  it('a failed check is swallowed — logged, not thrown, and the poll loop can keep going', async () => {
    httpClientMocks.enqueueDueSchedules.mockRejectedValueOnce(new Error('network down'))
    const state = initialScheduleCheckState()

    await expect(checkSchedulesDue(ENV, state, () => 1_000)).resolves.toBeNull()

    // The throttle still advances on a failed attempt — a broken backend
    // does not turn into a check on every single poll tick.
    const second = await checkSchedulesDue(ENV, state, () => 1_000 + 1_000)
    expect(second).toBeNull()
    expect(httpClientMocks.enqueueDueSchedules).toHaveBeenCalledTimes(1)
  })
})
