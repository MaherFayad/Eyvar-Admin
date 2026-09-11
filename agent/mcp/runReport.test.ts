/** T5 `run_report` — AC-1240, AC-1241, AC-1243. */

import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import { disableMockLatency, resetDataLayer } from '../../src/data/clients/index'
import { buildTestClient, callTool, textOf } from './testHarness.js'
import { tripsCompletedTrend, invalidQuery } from './testQueries.js'
import { truncateSeries, MAX_SERIES_POINTS } from './limits.js'
import type { Client } from '@modelcontextprotocol/sdk/client/index.js'

describe('T5 run_report', () => {
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

  it('runs a legal query and returns a runId with a summary that excludes partial buckets (AC-1241)', async () => {
    const body = textOf(await callTool(client, 'eyvar_run_report', { query: tripsCompletedTrend }))
    expect(typeof body.runId).toBe('string')
    expect((body.runId as string).length).toBeGreaterThan(0)
    const summary = body.summary as Record<string, { partialExcluded: boolean }>
    for (const s of Object.values(summary)) expect(s.partialExcluded).toBe(true)
    const series = body.series as Array<{ points: unknown[] }>
    expect(series.length).toBeGreaterThan(0)
  })

  it('refuses a query with planner violations rather than running it (AC-1241)', async () => {
    const body = textOf(await callTool(client, 'eyvar_run_report', { query: invalidQuery }))
    expect(body.refused).toBe(true)
    expect(body.code).toBe('invalid-query')
    expect(Array.isArray(body.violations)).toBe(true)
  })

  it('a live run over the largest legal window still fits under the 400-point cap', async () => {
    /* The planner itself refuses any query producing more than 400 buckets
       (AC-817), so no *legal* run_report call can actually exceed the cap
       today — the truncation logic below is what guards the case where a
       future measure at finer grain makes one possible. */
    const longQuery = { ...tripsCompletedTrend, window: { kind: 'preset', preset: 'last-365d' }, grain: 'day' }
    const body = textOf(await callTool(client, 'eyvar_run_report', { query: longQuery }))
    const series = body.series as Array<{ points: unknown[] }>
    for (const s of series) expect(s.points.length).toBeLessThanOrEqual(MAX_SERIES_POINTS)
  })

  it('truncateSeries caps at 400 points, keeping the most recent, and says so (AC-1243)', () => {
    const buckets = Array.from({ length: 500 }, (_, i) => `2026-01-${String((i % 28) + 1).padStart(2, '0')}`)
    const points = Array.from({ length: 500 }, (_, i) => i)
    const result = truncateSeries(buckets, points, [499])
    expect(result.truncated).toBe(true)
    expect(result.points.length).toBe(MAX_SERIES_POINTS)
    expect(result.points[result.points.length - 1]).toBe(499) // most recent kept
    expect(result.points[0]).toBe(100) // 500 - 400
    expect(result.partialBucketIndexes).toEqual([MAX_SERIES_POINTS - 1])
  })

  it('refuses a malformed query with the schema error, not an empty result (AC-1240)', async () => {
    const result = await callTool(client, 'eyvar_run_report', { query: { ...tripsCompletedTrend, grain: 'not-a-grain' } })
    expect(result.isError).toBe(true)
  })

  it('stays under the 64 KB output cap (AC-1243)', async () => {
    const result = await callTool(client, 'eyvar_run_report', { query: tripsCompletedTrend })
    const text = (result.content[0] as { type: 'text'; text: string }).text
    expect(Buffer.byteLength(text, 'utf8')).toBeLessThan(64 * 1024)
  })
})
