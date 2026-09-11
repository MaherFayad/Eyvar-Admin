/** T14 `get_page` — AC-1240, AC-1243. */

import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import { disableMockLatency, resetDataLayer } from '../../src/data/clients/index'
import { buildTestClient, callTool, textOf } from './testHarness.js'
import type { Client } from '@modelcontextprotocol/sdk/client/index.js'

describe('T14 get_page', () => {
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

  it('returns the full page, blocks included, for a known id', async () => {
    const body = textOf(await callTool(client, 'eyvar_get_page', { id: 'PAGE-CS-1' }))
    const page = body.page as Record<string, unknown>
    expect(page.id).toBe('PAGE-CS-1')
    expect(Array.isArray(page.blocks)).toBe(true)
    expect(typeof body.totalBlocks).toBe('number')
    expect(body.blocksTruncated).toBe(false)
  })

  it('refuses an unknown id, not an empty result', async () => {
    const body = textOf(await callTool(client, 'eyvar_get_page', { id: 'PAGE-does-not-exist' }))
    expect(body.refused).toBe(true)
    expect(body.code).toBe('not-found')
  })

  it('refuses a missing id with the schema error (AC-1240)', async () => {
    const result = await callTool(client, 'eyvar_get_page', {})
    expect(result.isError).toBe(true)
  })
})
