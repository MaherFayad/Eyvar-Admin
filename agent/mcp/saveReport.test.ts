/** T13 `save_report` — AC-1240, AC-1244. */

import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import { disableMockLatency, resetDataLayer, switchMockUser } from '../../src/data/clients/index'
import { buildTestClient, callTool, textOf } from './testHarness.js'
import { tripsCompletedTrend } from './testQueries.js'
import type { Client } from '@modelcontextprotocol/sdk/client/index.js'

describe('T13 save_report', () => {
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

  it('creates a private report owned by the acting operator, tagged analyst (AC-1244)', async () => {
    await switchMockUser('USR-7')
    const body = textOf(
      await callTool(client, 'eyvar_save_report', {
        name: 'Trips completed, agent draft',
        query: tripsCompletedTrend,
        visibility: 'private',
      }),
    )
    const report = body.report as Record<string, unknown>
    expect(report.ownerId).toBe('USR-7')
    expect(report.visibility).toBe('private')
    expect(report.tags).toContain('analyst')
    expect(report.id).toBeDefined()
  })

  it('refuses a visibility other than private, rather than downgrading it (AC-1244)', async () => {
    const result = await callTool(client, 'eyvar_save_report', {
      name: 'Team report attempt',
      query: tripsCompletedTrend,
      visibility: 'team',
    })
    expect(result.isError).toBe(true)
  })

  it('refuses a name over 80 characters with the schema error (AC-1240)', async () => {
    const result = await callTool(client, 'eyvar_save_report', {
      name: 'x'.repeat(81),
      query: tripsCompletedTrend,
      visibility: 'private',
    })
    expect(result.isError).toBe(true)
  })
})
