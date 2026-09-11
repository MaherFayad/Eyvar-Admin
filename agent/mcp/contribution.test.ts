/** T9 `contribution` — AC-1240. */

import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import { disableMockLatency, resetDataLayer } from '../../src/data/clients/index'
import { buildTestClient, callTool, textOf } from './testHarness.js'
import { tripsCompletedByKind } from './testQueries.js'
import type { Client } from '@modelcontextprotocol/sdk/client/index.js'

describe('T9 contribution', () => {
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

  it('ranks which groups explain the change between two windows', async () => {
    const body = textOf(
      await callTool(client, 'eyvar_contribution', {
        query: tripsCompletedByKind,
        windowA: { kind: 'preset', preset: 'last-30d' },
        windowB: { kind: 'preset', preset: 'last-7d' },
      }),
    )
    const parts = body.parts as Array<{ groupValue: string; deltaAbs: number | null; rank: number | null }>
    expect(parts.length).toBeGreaterThan(0)
    expect('totalChange' in body).toBe(true)
    const ranked = parts.filter((p) => p.rank !== null).map((p) => p.rank as number)
    expect(new Set(ranked).size).toBe(ranked.length) // ranks are unique
  })

  it('refuses a malformed query with the schema error (AC-1240)', async () => {
    const result = await callTool(client, 'eyvar_contribution', {
      query: { ...tripsCompletedByKind, chartType: 'not-a-chart-type' },
      windowA: { kind: 'preset', preset: 'last-30d' },
      windowB: { kind: 'preset', preset: 'last-7d' },
    })
    expect(result.isError).toBe(true)
  })
})
