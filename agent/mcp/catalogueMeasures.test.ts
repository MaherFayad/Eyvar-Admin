/** T1 `catalogue_measures` — AC-1240, AC-1243. */

import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import { disableMockLatency, resetDataLayer, switchMockUser } from '../../src/data/clients/index'
import { buildTestClient, callTool, textOf } from './testHarness.js'
import type { Client } from '@modelcontextprotocol/sdk/client/index.js'

describe('T1 catalogue_measures', () => {
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

  it('lists measures with the documented shape', async () => {
    const result = await callTool(client, 'eyvar_catalogue_measures', {})
    const body = textOf(result)
    expect(result.isError).toBeFalsy()
    const measures = body.measures as Array<Record<string, unknown>>
    expect(Array.isArray(measures)).toBe(true)
    expect(measures.length).toBeGreaterThan(0)
    const trips = measures.find((m) => m.key === 'trips.completed')!
    expect(trips).toMatchObject({ key: 'trips.completed', unit: expect.any(String), minGrain: expect.any(String) })
    expect(typeof trips.label).toBe('string')
    expect(trips.label).not.toBe('rb.measure.trips.completed') // resolved, not a raw key
    expect(trips.coverage).toMatchObject({ from: expect.any(String), to: expect.any(String) })
    expect(Array.isArray(trips.dimensions)).toBe(true)
    expect(Array.isArray(trips.filterableFields)).toBe(true)
    expect(typeof trips.blocked).toBe('boolean')
  })

  it('narrows by category', async () => {
    const all = textOf(await callTool(client, 'eyvar_catalogue_measures', {}))
    const allMeasures = all.measures as Array<{ category: unknown }>
    const oneCategory = (allMeasures[0] as { category: string }).category
    const narrowed = textOf(await callTool(client, 'eyvar_catalogue_measures', { category: oneCategory }))
    const narrowedMeasures = narrowed.measures as Array<{ category: string }>
    expect(narrowedMeasures.length).toBeGreaterThan(0)
    for (const m of narrowedMeasures) expect(m.category).toBe(oneCategory)
  })

  it('marks a measure blocked for an operator without its permission (AC-1242 sibling rule for T1)', async () => {
    await switchMockUser('USR-7') // Trust & Safety: view_analytics, no view_finance
    const body = textOf(await callTool(client, 'eyvar_catalogue_measures', {}))
    const measures = body.measures as Array<{ key: string; blocked: boolean }>
    const revenue = measures.find((m) => m.key === 'revenue.total')!
    expect(revenue.blocked).toBe(true)
    const trips = measures.find((m) => m.key === 'trips.completed')!
    expect(trips.blocked).toBe(false)
  })

  it('refuses malformed input with the schema error, not an empty result (AC-1240)', async () => {
    const result = await callTool(client, 'eyvar_catalogue_measures', { category: 42 })
    expect(result.isError).toBe(true)
    const text = (result.content[0] as { type: 'text'; text: string }).text
    expect(text).toMatch(/expected string|invalid/i)
  })

  it('stays under the 64 KB output cap (AC-1243)', async () => {
    const result = await callTool(client, 'eyvar_catalogue_measures', {})
    const text = (result.content[0] as { type: 'text'; text: string }).text
    expect(Buffer.byteLength(text, 'utf8')).toBeLessThan(64 * 1024)
  })
})
