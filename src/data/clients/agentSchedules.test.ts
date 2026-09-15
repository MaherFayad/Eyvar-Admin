/**
 * `agent.schedules` (§8, WP-7.6) — the client half of AC-1266/AC-1267's
 * schedules tab: list, create, and the enable/disable toggle, in mock mode.
 * The exactly-once arbitration itself is a server property, proved against
 * the real database in `api/v1/agent.test.ts`; this file only proves the
 * client's own contract (the seam, and a round-trip that leaves other
 * schedules untouched).
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { disableMockLatency, knownOperations, mockFailures } from '../config'
import { isApiError } from '../types/common'
import { AGENT_OPERATIONS, createAgentSchedule, listAgentSchedules, resetAgent, updateAgentSchedule } from './agent'

beforeEach(() => {
  disableMockLatency()
  resetAgent()
})

describe('the seam', () => {
  it('registers every schedule operation id', async () => {
    await listAgentSchedules()
    await createAgentSchedule({ cron: '0 6 * * 0', reportIds: [], pageId: null })
    expect(knownOperations()).toContain(AGENT_OPERATIONS.schedules)
    expect(knownOperations()).toContain(AGENT_OPERATIONS.scheduleCreate)
    expect(knownOperations()).toContain(AGENT_OPERATIONS.scheduleUpdate)
  })

  it('can be made to fail, for every operation', async () => {
    mockFailures.always(AGENT_OPERATIONS.schedules)
    await expect(listAgentSchedules()).rejects.toSatisfy(isApiError)
    mockFailures.clear(AGENT_OPERATIONS.schedules)

    mockFailures.always(AGENT_OPERATIONS.scheduleCreate)
    await expect(createAgentSchedule({ cron: '0 6 * * 0', reportIds: [], pageId: null })).rejects.toSatisfy(isApiError)
    mockFailures.clear(AGENT_OPERATIONS.scheduleCreate)

    const [existing] = await listAgentSchedules()
    mockFailures.always(AGENT_OPERATIONS.scheduleUpdate)
    await expect(updateAgentSchedule(existing!.id, { enabled: false })).rejects.toSatisfy(isApiError)
  })
})

describe('the seeded schedule', () => {
  it('starts enabled, weekly-review, owned by USR-1', async () => {
    const schedules = await listAgentSchedules()
    expect(schedules.length).toBeGreaterThan(0)
    const seeded = schedules[0]!
    expect(seeded.kind).toBe('weekly-review')
    expect(seeded.enabled).toBe(true)
    expect(seeded.ownerId).toBe('USR-1')
  })
})

describe('create', () => {
  it('appends a new, enabled schedule owned by the acting operator, without disturbing the existing one', async () => {
    const before = await listAgentSchedules()
    const created = await createAgentSchedule({ cron: '0 5 * * 1', reportIds: ['RPT-9'], pageId: 'DSH-2' })
    expect(created.data.kind).toBe('weekly-review')
    expect(created.data.enabled).toBe(true)
    expect(created.data.cron).toBe('0 5 * * 1')
    expect(created.data.reportIds).toEqual(['RPT-9'])
    expect(created.data.pageId).toBe('DSH-2')

    const after = await listAgentSchedules()
    expect(after).toHaveLength(before.length + 1)
    expect(after.find((s) => s.id === before[0]!.id)).toStrictEqual(before[0])
  })
})

describe('update — the enable/disable toggle', () => {
  it('disables a schedule and leaves its other fields alone', async () => {
    const [seeded] = await listAgentSchedules()
    const disabled = await updateAgentSchedule(seeded!.id, { enabled: false })
    expect(disabled.data.enabled).toBe(false)
    expect(disabled.data.cron).toBe(seeded!.cron)
    expect(disabled.data.reportIds).toEqual(seeded!.reportIds)

    const reenabled = await updateAgentSchedule(seeded!.id, { enabled: true })
    expect(reenabled.data.enabled).toBe(true)
  })

  it('a partial patch leaves fields it did not name untouched', async () => {
    const created = await createAgentSchedule({ cron: '0 6 * * 0', reportIds: ['RPT-1'], pageId: null })
    const patched = await updateAgentSchedule(created.data.id, { cron: '0 7 * * 2' })
    expect(patched.data.cron).toBe('0 7 * * 2')
    expect(patched.data.reportIds).toEqual(['RPT-1'])
    expect(patched.data.enabled).toBe(true)
  })
})
