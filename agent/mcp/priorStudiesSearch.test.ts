/** T18 `prior_studies_search` — AC-1240. */

import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import { disableMockLatency, resetDataLayer, switchMockUser } from '../../src/data/clients/index'
import { buildTestClient, callTool, textOf } from './testHarness.js'
import type { Client } from '@modelcontextprotocol/sdk/client/index.js'

describe('T18 prior_studies_search', () => {
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

  it('finds the seeded case study by its question', async () => {
    /* `PAGE-CS-1` is private, owned by USR-7 — only visible to that operator (§13.1). */
    await switchMockUser('USR-7')
    const body = textOf(await callTool(client, 'eyvar_prior_studies_search', { query: 'cancellation' }))
    const studies = body.studies as Array<{ id: string; title: string; headline: string | null }>
    expect(studies.some((s) => s.id === 'PAGE-CS-1')).toBe(true)
  })

  it('never returns a dashboard or a note (kind is filtered to case-study)', async () => {
    const body = textOf(await callTool(client, 'eyvar_prior_studies_search', { query: 'a' }))
    // Narrowed by kind; nothing here should be a template dashboard.
    const studies = body.studies as Array<{ id: string }>
    expect(studies.every((s) => !s.id.startsWith('PAGE-TPL'))).toBe(true)
  })

  it('refuses an empty query with the schema error, not an unfiltered list (AC-1240)', async () => {
    const result = await callTool(client, 'eyvar_prior_studies_search', { query: '' })
    expect(result.isError).toBe(true)
  })

  it('refuses a missing query with the schema error (AC-1240)', async () => {
    const result = await callTool(client, 'eyvar_prior_studies_search', {})
    expect(result.isError).toBe(true)
  })
})
