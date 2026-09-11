/** T16 `alert_context` — AC-1240. */

import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import { disableMockLatency, resetDataLayer } from '../../src/data/clients/index'
import { buildTestClient, callTool, textOf } from './testHarness.js'
import type { Client } from '@modelcontextprotocol/sdk/client/index.js'

describe('T16 alert_context', () => {
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

  it('returns the rule, the series around the bucket, prior firings and annotations', async () => {
    const body = textOf(await callTool(client, 'eyvar_alert_context', { firingId: 'AFR-1' }))
    const rule = body.rule as Record<string, unknown>
    expect(rule.id).toBe('ALR-1')
    expect(body.bucketStart).toBe('2026-06-24')
    expect(body.value).toBe(7)
    expect(body.threshold).toBe(6)
    const series = body.series as { buckets: string[]; points: unknown[] } | null
    expect(series).not.toBeNull()
    expect(series!.buckets.length).toBeGreaterThan(0)
    expect(series!.buckets.length).toBeLessThanOrEqual(29) // ±14 plus the bucket itself
    expect(Array.isArray(body.priorFirings)).toBe(true)
    expect(Array.isArray(body.annotations)).toBe(true)
  })

  it('refuses an unknown firing id, not an empty result', async () => {
    const body = textOf(await callTool(client, 'eyvar_alert_context', { firingId: 'AFR-does-not-exist' }))
    expect(body.refused).toBe(true)
    expect(body.code).toBe('not-found')
  })

  it('refuses a missing firingId with the schema error (AC-1240)', async () => {
    const result = await callTool(client, 'eyvar_alert_context', {})
    expect(result.isError).toBe(true)
  })
})
