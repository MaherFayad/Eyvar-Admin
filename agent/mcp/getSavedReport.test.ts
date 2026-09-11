/** T12 `get_saved_report` — AC-1240. */

import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import { disableMockLatency, resetDataLayer } from '../../src/data/clients/index'
import { buildTestClient, callTool, textOf } from './testHarness.js'
import type { Client } from '@modelcontextprotocol/sdk/client/index.js'

describe('T12 get_saved_report', () => {
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

  it('returns the full report for a known id', async () => {
    const body = textOf(await callTool(client, 'eyvar_get_saved_report', { id: 'RPT-1' }))
    const report = body.report as Record<string, unknown>
    expect(report.id).toBe('RPT-1')
    expect(report.query).toBeDefined()
  })

  it('refuses an unknown id, not an empty result', async () => {
    const body = textOf(await callTool(client, 'eyvar_get_saved_report', { id: 'RPT-does-not-exist' }))
    expect(body.refused).toBe(true)
    expect(body.code).toBe('not-found')
  })

  it('refuses a missing id with the schema error (AC-1240)', async () => {
    const result = await callTool(client, 'eyvar_get_saved_report', {})
    expect(result.isError).toBe(true)
  })
})
