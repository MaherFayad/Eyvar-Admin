/** T17 `annotations_list` — AC-1240. */

import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import { disableMockLatency, resetDataLayer } from '../../src/data/clients/index'
import { buildTestClient, callTool, textOf } from './testHarness.js'
import type { Client } from '@modelcontextprotocol/sdk/client/index.js'

describe('T17 annotations_list', () => {
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

  it('lists annotations, sorted by date', async () => {
    const body = textOf(await callTool(client, 'eyvar_annotations_list', {}))
    const annotations = body.annotations as Array<{ date: string }>
    expect(annotations.length).toBeGreaterThan(0)
    const dates = annotations.map((a) => a.date)
    expect([...dates].sort()).toEqual(dates)
  })

  it('narrows to a date range', async () => {
    const all = textOf(await callTool(client, 'eyvar_annotations_list', {}))
    const allAnnotations = all.annotations as Array<{ date: string }>
    const midpoint = allAnnotations[Math.floor(allAnnotations.length / 2)]!.date
    const body = textOf(await callTool(client, 'eyvar_annotations_list', { from: midpoint }))
    const annotations = body.annotations as Array<{ date: string }>
    for (const a of annotations) expect(a.date >= midpoint).toBe(true)
  })

  it('refuses a non-string from with the schema error (AC-1240)', async () => {
    const result = await callTool(client, 'eyvar_annotations_list', { from: 123 })
    expect(result.isError).toBe(true)
  })
})
