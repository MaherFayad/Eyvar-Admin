/** T4 `plan_query` — AC-1240, AC-1241 (its own "refuses a query with planner violations" sibling for T5). */

import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import { disableMockLatency, resetDataLayer } from '../../src/data/clients/index'
import { buildTestClient, callTool, textOf } from './testHarness.js'
import { tripsCompletedTrend, invalidQuery } from './testQueries.js'
import type { Client } from '@modelcontextprotocol/sdk/client/index.js'

describe('T4 plan_query', () => {
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

  it('returns no violations for a legal query', async () => {
    const body = textOf(await callTool(client, 'eyvar_plan_query', { query: tripsCompletedTrend }))
    const plan = body.plan as { violations: unknown[]; bucketCount: number; effectiveChartType: string }
    expect(plan.violations).toEqual([])
    expect(plan.bucketCount).toBeGreaterThan(0)
    expect(typeof plan.effectiveChartType).toBe('string')
  })

  it('names the violation for an illegal query, as data — never a throw', async () => {
    const body = textOf(await callTool(client, 'eyvar_plan_query', { query: invalidQuery }))
    const plan = body.plan as { violations: Array<{ code: string; field: string }> }
    expect(plan.violations.some((v) => v.code === 'window-inverted')).toBe(true)
  })

  it('refuses a query missing every measure with the schema error (AC-1240)', async () => {
    const result = await callTool(client, 'eyvar_plan_query', {
      query: { ...tripsCompletedTrend, measures: [] },
    })
    expect(result.isError).toBe(true)
  })

  it('refuses more than two measures with the schema error', async () => {
    const result = await callTool(client, 'eyvar_plan_query', {
      query: { ...tripsCompletedTrend, measures: [{ key: 'a' }, { key: 'b' }, { key: 'c' }] },
    })
    expect(result.isError).toBe(true)
  })

  it('refuses an unrecognised field on the query (strict schema)', async () => {
    const result = await callTool(client, 'eyvar_plan_query', {
      query: { ...tripsCompletedTrend, notAField: true },
    })
    expect(result.isError).toBe(true)
  })
})
