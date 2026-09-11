/** T2 `catalogue_dimensions` — AC-1240. */

import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import { disableMockLatency, resetDataLayer } from '../../src/data/clients/index'
import { buildTestClient, callTool, textOf } from './testHarness.js'
import type { Client } from '@modelcontextprotocol/sdk/client/index.js'

describe('T2 catalogue_dimensions', () => {
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

  it('lists every dimension with a cardinality hint', async () => {
    const body = textOf(await callTool(client, 'eyvar_catalogue_dimensions', {}))
    const dimensions = body.dimensions as Array<Record<string, unknown>>
    expect(dimensions.length).toBeGreaterThan(0)
    for (const d of dimensions) {
      expect(typeof d.key).toBe('string')
      expect(typeof d.cardinalityHint).toBe('number')
    }
  })

  it('narrows to the dimensions legal for one measure', async () => {
    const body = textOf(await callTool(client, 'eyvar_catalogue_dimensions', { forMeasure: 'trips.completed' }))
    const dimensions = body.dimensions as Array<{ key: string }>
    expect(dimensions.length).toBeGreaterThan(0)
    expect(dimensions.some((d) => d.key === 'trip.pickup')).toBe(true)
  })

  it('refuses an unknown measure key rather than returning an empty list (AC-1240)', async () => {
    const body = textOf(await callTool(client, 'eyvar_catalogue_dimensions', { forMeasure: 'not.a.real.measure' }))
    expect(body.refused).toBe(true)
    expect(body.code).toBe('unknown-measure')
  })

  it('refuses a non-string forMeasure with the schema error', async () => {
    const result = await callTool(client, 'eyvar_catalogue_dimensions', { forMeasure: 7 })
    expect(result.isError).toBe(true)
  })
})
