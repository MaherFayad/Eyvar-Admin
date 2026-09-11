/** T8 `correlate` — AC-1240. */

import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import { disableMockLatency, resetDataLayer } from '../../src/data/clients/index'
import { buildTestClient, callTool, textOf } from './testHarness.js'
import { tripsCompletedTrend } from './testQueries.js'
import type { Client } from '@modelcontextprotocol/sdk/client/index.js'

describe('T8 correlate', () => {
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

  it('correlates a series with itself (a different run of the same deterministic query) at pearson 1', async () => {
    const runA = textOf(await callTool(client, 'eyvar_run_report', { query: tripsCompletedTrend }))
    const runB = textOf(await callTool(client, 'eyvar_run_report', { query: tripsCompletedTrend }))
    const seriesA = (runA.series as Array<{ id: string }>)[0]!.id
    const seriesB = (runB.series as Array<{ id: string }>)[0]!.id

    const body = textOf(
      await callTool(client, 'eyvar_correlate', {
        a: { runId: runA.runId, seriesId: seriesA },
        b: { runId: runB.runId, seriesId: seriesB },
      }),
    )
    expect(body.ok).toBe(true)
    expect(body.causationCaveat).toBe('correlation-not-causation')
    const lags = body.lags as Array<{ lag: number; pearson: number | null }>
    expect(lags[0]!.pearson).toBeCloseTo(1, 5)
  })

  it('refuses (insufficient-pairs) below 8 usable paired buckets', async () => {
    const shortQuery = { ...tripsCompletedTrend, window: { kind: 'preset', preset: 'today' } }
    const runA = textOf(await callTool(client, 'eyvar_run_report', { query: shortQuery }))
    const runB = textOf(await callTool(client, 'eyvar_run_report', { query: shortQuery }))
    const seriesA = (runA.series as Array<{ id: string }>)[0]!.id
    const seriesB = (runB.series as Array<{ id: string }>)[0]!.id

    const body = textOf(
      await callTool(client, 'eyvar_correlate', {
        a: { runId: runA.runId, seriesId: seriesA },
        b: { runId: runB.runId, seriesId: seriesB },
      }),
    )
    expect(body.refused).toBe(true)
    expect(body.code).toBe('insufficient-pairs')
  })

  it('refuses an unknown run with the run-not-found code', async () => {
    const body = textOf(
      await callTool(client, 'eyvar_correlate', {
        a: { runId: 'RUN-missing', seriesId: 'x' },
        b: { runId: 'RUN-missing-2', seriesId: 'y' },
      }),
    )
    expect(body.refused).toBe(true)
    expect(body.code).toBe('run-not-found')
  })

  it('refuses a malformed ref with the schema error (AC-1240)', async () => {
    const result = await callTool(client, 'eyvar_correlate', { a: { runId: 'x' }, b: { runId: 'y', seriesId: 'z' } })
    expect(result.isError).toBe(true)
  })
})
