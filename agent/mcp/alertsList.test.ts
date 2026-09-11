/** T16 `alerts_list` — AC-1240. */

import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import { disableMockLatency, resetDataLayer } from '../../src/data/clients/index'
import { buildTestClient, callTool, textOf } from './testHarness.js'
import type { Client } from '@modelcontextprotocol/sdk/client/index.js'

describe('T16 alerts_list', () => {
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

  it('lists alert rules', async () => {
    const body = textOf(await callTool(client, 'eyvar_alerts_list', {}))
    const rules = body.rules as Array<Record<string, unknown>>
    expect(rules.length).toBeGreaterThan(0)
    expect(rules.some((r) => r.id === 'ALR-1')).toBe(true)
  })

  it('stays under the 64 KB output cap (AC-1243)', async () => {
    const result = await callTool(client, 'eyvar_alerts_list', {})
    const text = (result.content[0] as { type: 'text'; text: string }).text
    expect(Buffer.byteLength(text, 'utf8')).toBeLessThan(64 * 1024)
  })
})
