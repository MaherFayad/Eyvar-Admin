/** T14 `pages_search` — AC-1240. */

import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import { disableMockLatency, resetDataLayer } from '../../src/data/clients/index'
import { buildTestClient, callTool, textOf } from './testHarness.js'
import type { Client } from '@modelcontextprotocol/sdk/client/index.js'

describe('T14 pages_search', () => {
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

  it('lists pages with id, kind and title', async () => {
    const body = textOf(await callTool(client, 'eyvar_pages_search', {}))
    const pages = body.pages as Array<Record<string, unknown>>
    expect(pages.length).toBeGreaterThan(0)
    expect(typeof pages[0]!.kind).toBe('string')
    expect(typeof pages[0]!.title).toBe('string')
  })

  it('refuses a non-string query with the schema error (AC-1240)', async () => {
    const result = await callTool(client, 'eyvar_pages_search', { query: true })
    expect(result.isError).toBe(true)
  })
})
