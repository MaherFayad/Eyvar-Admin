/** T7 `describe_series` — AC-1240. */

import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import { disableMockLatency, resetDataLayer } from '../../src/data/clients/index'
import { buildTestClient, callTool, textOf } from './testHarness.js'
import { tripsCompletedTrend } from './testQueries.js'
import type { Client } from '@modelcontextprotocol/sdk/client/index.js'

describe('T7 describe_series', () => {
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

  it('returns descriptive stats for a series of a produced run', async () => {
    const run = textOf(await callTool(client, 'eyvar_run_report', { query: tripsCompletedTrend }))
    const runId = run.runId as string
    const seriesId = (run.series as Array<{ id: string }>)[0]!.id

    const body = textOf(await callTool(client, 'eyvar_describe_series', { runId, seriesId }))
    expect(body.runId).toBe(runId)
    expect(body.seriesId).toBe(seriesId)
    expect(typeof body.count).toBe('number')
    expect('mean' in body).toBe(true)
    expect('trend' in body).toBe(true)
    expect(Array.isArray(body.changePoints)).toBe(true)
    expect(Array.isArray(body.outliers)).toBe(true)
  })

  it('refuses a runId not in this job\'s tool log', async () => {
    const body = textOf(await callTool(client, 'eyvar_describe_series', { runId: 'RUN-does-not-exist', seriesId: 'x' }))
    expect(body.refused).toBe(true)
    expect(body.code).toBe('run-not-found')
  })

  it('refuses a seriesId not on the named run', async () => {
    const run = textOf(await callTool(client, 'eyvar_run_report', { query: tripsCompletedTrend }))
    const body = textOf(await callTool(client, 'eyvar_describe_series', { runId: run.runId, seriesId: 'not-a-series' }))
    expect(body.refused).toBe(true)
    expect(body.code).toBe('series-not-found')
  })

  it('refuses a missing seriesId with the schema error (AC-1240)', async () => {
    const result = await callTool(client, 'eyvar_describe_series', { runId: 'RUN-1' })
    expect(result.isError).toBe(true)
  })
})
