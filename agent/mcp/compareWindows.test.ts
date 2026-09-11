/** T6 `compare_windows` — AC-1240. */

import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import { disableMockLatency, resetDataLayer } from '../../src/data/clients/index'
import { buildTestClient, callTool, textOf } from './testHarness.js'
import { tripsCompletedTrend, queryWithUnknownMeasure } from './testQueries.js'
import type { Client } from '@modelcontextprotocol/sdk/client/index.js'

describe('T6 compare_windows', () => {
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

  it('records two runs and returns per-series deltas', async () => {
    const body = textOf(
      await callTool(client, 'eyvar_compare_windows', {
        query: tripsCompletedTrend,
        windowA: { kind: 'preset', preset: 'last-30d' },
        windowB: { kind: 'preset', preset: 'last-7d' },
      }),
    )
    expect(typeof body.runIdA).toBe('string')
    expect(typeof body.runIdB).toBe('string')
    expect(body.runIdA).not.toBe(body.runIdB)
    const deltas = body.deltas as Array<{ deltaAbs: number | null; deltaPct: number | null }>
    expect(deltas.length).toBeGreaterThan(0)
  })

  it('refuses a query with planner violations', async () => {
    const body = textOf(
      await callTool(client, 'eyvar_compare_windows', {
        query: queryWithUnknownMeasure,
        windowA: { kind: 'preset', preset: 'last-30d' },
        windowB: { kind: 'preset', preset: 'last-7d' },
      }),
    )
    expect(body.refused).toBe(true)
    expect(body.code).toBe('invalid-query')
  })

  it('refuses a malformed window with the schema error (AC-1240)', async () => {
    const result = await callTool(client, 'eyvar_compare_windows', {
      query: tripsCompletedTrend,
      windowA: { kind: 'not-a-kind' },
      windowB: { kind: 'preset', preset: 'last-7d' },
    })
    expect(result.isError).toBe(true)
  })
})
