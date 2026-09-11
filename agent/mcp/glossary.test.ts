/** T3 `glossary` — AC-1240. */

import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import { disableMockLatency, resetDataLayer } from '../../src/data/clients/index'
import { buildTestClient, callTool, textOf } from './testHarness.js'
import type { Client } from '@modelcontextprotocol/sdk/client/index.js'

describe('T3 glossary', () => {
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

  it('returns the whole glossary with no term', async () => {
    const body = textOf(await callTool(client, 'eyvar_glossary', {}))
    const entries = body.entries as Array<{ term: string; definition: string }>
    expect(entries.length).toBeGreaterThan(3)
    expect(entries.some((e) => e.term === 'money')).toBe(true)
    expect(entries.some((e) => e.term === 'gap-vs-zero')).toBe(true)
  })

  it('matches a partial term', async () => {
    const body = textOf(await callTool(client, 'eyvar_glossary', { term: 'partial' }))
    const entries = body.entries as Array<{ term: string }>
    expect(entries.some((e) => e.term === 'partial-bucket')).toBe(true)
  })

  it('folds in a measure caption when term is a measure key', async () => {
    const body = textOf(await callTool(client, 'eyvar_glossary', { term: 'trips.completed' }))
    const entries = body.entries as Array<{ term: string; definition: string }>
    const own = entries.find((e) => e.term === 'trips.completed')
    expect(own).toBeDefined()
    expect(own!.definition.length).toBeGreaterThan(0)
  })

  it('refuses a non-string term with the schema error', async () => {
    const result = await callTool(client, 'eyvar_glossary', { term: 5 })
    expect(result.isError).toBe(true)
  })
})
