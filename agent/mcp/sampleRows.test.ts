/** T10 `sample_rows` — D44, AC-1240, AC-1242, AC-1243. */

import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import { disableMockLatency, resetDataLayer, switchMockUser } from '../../src/data/clients/index'
import { buildTestClient, callTool, textOf } from './testHarness.js'
import { MAX_SAMPLE_ROWS } from './limits.js'
import type { Client } from '@modelcontextprotocol/sdk/client/index.js'

describe('T10 sample_rows', () => {
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

  it('masks a driver row\'s name and phone, and leaves the id intact (D44)', async () => {
    const body = textOf(await callTool(client, 'eyvar_sample_rows', { resource: 'drivers', filters: [], limit: 5 }))
    const rows = body.rows as Array<Record<string, unknown>>
    expect(rows.length).toBeGreaterThan(0)
    const row = rows[0]!
    expect(typeof row.id).toBe('string')
    expect(row.id).toMatch(/^DRV-/)
    // Name is masked to initials: no lowercase letters survive (every part capitalised + a dot).
    expect(row.name as string).toMatch(/^(\S\.)+$/)
    expect((row.name as string).length).toBeLessThan(8) // initials, not the full name
    // Phone is masked to the last two digits behind bullets.
    expect(row.phone as string).toMatch(/^••••\d{2}$/)
    expect(row.phone).not.toContain('+966')
  })

  it('the limit argument cannot defeat the 50-row cap (D44)', async () => {
    const body = textOf(await callTool(client, 'eyvar_sample_rows', { resource: 'drivers', filters: [], limit: 10_000 }))
    const rows = body.rows as unknown[]
    expect(rows.length).toBeLessThanOrEqual(MAX_SAMPLE_ROWS)
    expect(body.rowCap).toBe(MAX_SAMPLE_ROWS)
  })

  it('no filter can defeat the masking — filtering to one named row still returns masked fields', async () => {
    const body = textOf(
      await callTool(client, 'eyvar_sample_rows', {
        resource: 'drivers',
        filters: [{ field: 'driver.city', op: 'eq', value: 'Riyadh' }],
        limit: 50,
      }),
    )
    const rows = body.rows as Array<Record<string, unknown>>
    for (const row of rows) {
      expect(row.name).toMatch(/^(\S\.)+$/)
      if (typeof row.phone === 'string' && row.phone.length > 0) expect(row.phone).toMatch(/^••••\d{2}$/)
    }
  })

  it('refuses an operator without view on the resource (AC-1242)', async () => {
    await switchMockUser('USR-2') // Finance: view_finance, view_analytics — no view_operations
    const body = textOf(await callTool(client, 'eyvar_sample_rows', { resource: 'drivers', filters: [] }))
    expect(body.refused).toBe(true)
    expect(body.code).toBe('forbidden')
  })

  it('allows an operator who does hold the resource\'s view permission', async () => {
    await switchMockUser('USR-2') // Finance: view_analytics covers daily-snapshots
    const body = textOf(await callTool(client, 'eyvar_sample_rows', { resource: 'daily-snapshots', filters: [] }))
    expect(body.refused).toBeUndefined()
    expect(Array.isArray(body.rows)).toBe(true)
  })

  it('refuses an unrecognised resource with the schema error, not an empty result (AC-1240)', async () => {
    const result = await callTool(client, 'eyvar_sample_rows', { resource: 'not-a-resource', filters: [] })
    expect(result.isError).toBe(true)
  })

  it('stays under the 64 KB output cap even at the full row cap (AC-1243)', async () => {
    const result = await callTool(client, 'eyvar_sample_rows', { resource: 'drivers', filters: [], limit: 50 })
    const text = (result.content[0] as { type: 'text'; text: string }).text
    expect(Buffer.byteLength(text, 'utf8')).toBeLessThan(64 * 1024)
  })
})
