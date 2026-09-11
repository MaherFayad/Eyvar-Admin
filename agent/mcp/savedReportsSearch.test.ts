/** T11 `saved_reports_search` — AC-1240. */

import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import { disableMockLatency, resetDataLayer } from '../../src/data/clients/index'
import { buildTestClient, callTool, textOf } from './testHarness.js'
import type { Client } from '@modelcontextprotocol/sdk/client/index.js'

describe('T11 saved_reports_search', () => {
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

  it('lists saved reports with id, name, query and lastRunAt', async () => {
    const body = textOf(await callTool(client, 'eyvar_saved_reports_search', {}))
    const reports = body.reports as Array<Record<string, unknown>>
    expect(reports.length).toBeGreaterThan(0)
    const rpt1 = reports.find((r) => r.id === 'RPT-1')!
    expect(rpt1).toBeDefined()
    expect(typeof rpt1.name).toBe('string')
    expect(rpt1.query).toBeDefined()
  })

  it('narrows by free text', async () => {
    const body = textOf(await callTool(client, 'eyvar_saved_reports_search', { query: 'revenue' }))
    const reports = body.reports as Array<{ name: string }>
    expect(reports.length).toBeGreaterThan(0)
    for (const r of reports) expect(r.name.toLowerCase()).toContain('revenue')
  })

  it('refuses a non-string query with the schema error (AC-1240)', async () => {
    const result = await callTool(client, 'eyvar_saved_reports_search', { query: 9 })
    expect(result.isError).toBe(true)
  })
})
