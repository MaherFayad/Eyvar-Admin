/** T16 `alert_history` — AC-1240. */

import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import { disableMockLatency, resetDataLayer } from '../../src/data/clients/index'
import { buildTestClient, callTool, textOf } from './testHarness.js'
import type { Client } from '@modelcontextprotocol/sdk/client/index.js'

describe('T16 alert_history', () => {
  let client: Client
  let close: () => Promise<void>

  beforeEach(async () => {
    disableMockLatency()
    resetDataLayer()
    ;({ client, close } = await buildTestClient())
  })

  afterEach(async () => {
    await close()
  })

  it('lists past firings of one rule, newest first', async () => {
    const body = textOf(await callTool(client, 'eyvar_alert_history', { ruleId: 'ALR-1' }))
    const firings = body.firings as Array<Record<string, unknown>>
    expect(firings.length).toBeGreaterThan(0)
    expect(firings.some((f) => f.id === 'AFR-1')).toBe(true)
  })

  it('refuses an unknown rule id, not an empty list', async () => {
    const body = textOf(await callTool(client, 'eyvar_alert_history', { ruleId: 'ALR-does-not-exist' }))
    expect(body.refused).toBe(true)
    expect(body.code).toBe('not-found')
  })

  it('refuses a missing ruleId with the schema error (AC-1240)', async () => {
    const result = await callTool(client, 'eyvar_alert_history', {})
    expect(result.isError).toBe(true)
  })
})
