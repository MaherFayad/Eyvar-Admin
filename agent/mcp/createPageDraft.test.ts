/** T15 `create_page_draft` — AC-1240, AC-1244. */

import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import { disableMockLatency, resetDataLayer, switchMockUser, getPage } from '../../src/data/clients/index'
import { buildTestClient, callTool, textOf } from './testHarness.js'
import type { Client } from '@modelcontextprotocol/sdk/client/index.js'

const blocks = [
  { id: 'b1', type: 'heading', level: 1, text: 'Why cancellations rose' },
  { id: 'b2', type: 'text', md: 'A short summary of the finding.' },
]

describe('T15 create_page_draft', () => {
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

  it('creates a private, unpublished page owned by the acting operator, tagged analyst (AC-1244)', async () => {
    await switchMockUser('USR-7')
    const body = textOf(await callTool(client, 'eyvar_create_page_draft', { title: 'Agent draft', kind: 'case-study', blocks }))
    expect(body.publishedAt).toBeNull()
    const id = body.id as string
    const saved = await getPage(id)
    expect(saved.data.ownerId).toBe('USR-7')
    expect(saved.data.visibility).toBe('private')
    expect(saved.data.tags).toContain('analyst')
    expect(saved.data.publishedAt).toBeNull()
  })

  it('refuses an empty blocks array with the schema error (AC-1240)', async () => {
    const result = await callTool(client, 'eyvar_create_page_draft', { title: 'Empty', kind: 'case-study', blocks: [] })
    expect(result.isError).toBe(true)
  })

  it('refuses a kind outside case-study/dashboard with the schema error', async () => {
    const result = await callTool(client, 'eyvar_create_page_draft', { title: 'Bad kind', kind: 'note', blocks })
    expect(result.isError).toBe(true)
  })

  it('refuses a block with no type field', async () => {
    const result = await callTool(client, 'eyvar_create_page_draft', {
      title: 'Bad block',
      kind: 'case-study',
      blocks: [{ id: 'b1' }],
    })
    expect(result.isError).toBe(true)
  })
})
