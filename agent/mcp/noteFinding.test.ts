/** T19 `note_finding` — AC-1240. */

import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import { disableMockLatency, resetDataLayer } from '../../src/data/clients/index'
import { buildTestClient, callTool, textOf } from './testHarness.js'
import { tripsCompletedTrend } from './testQueries.js'
import type { Client } from '@modelcontextprotocol/sdk/client/index.js'

describe('T19 note_finding', () => {
  let client: Client
  let close: () => Promise<void>

  beforeEach(async () => {
    disableMockLatency()
    resetDataLayer()
    process.env.EYVAR_JOB_ID = 'AGT-1'
    ;({ client, close } = await buildTestClient())
  })

  afterEach(async () => {
    delete process.env.EYVAR_JOB_ID
    await close()
  })

  it('records a finding that cites a real run', async () => {
    const run = textOf(await callTool(client, 'eyvar_run_report', { query: tripsCompletedTrend }))
    const runId = run.runId as string

    const body = textOf(await callTool(client, 'eyvar_note_finding', { text: 'Trips rose 12% week over week.', runIds: [runId] }))
    expect(body.ok).toBe(true)

    const { findingsRecordedFor } = await import('./mockBackend.js')
    const recorded = findingsRecordedFor('AGT-1')
    expect(recorded.some((f) => f.text === 'Trips rose 12% week over week.' && f.runIds.includes(runId))).toBe(true)
  })

  it('refuses a finding that cites a runId not in this job\'s tool log', async () => {
    const body = textOf(await callTool(client, 'eyvar_note_finding', { text: 'Unsupported claim.', runIds: ['RUN-never-happened'] }))
    expect(body.refused).toBe(true)
    expect(body.code).toBe('run-not-found')
  })

  it('refuses an empty runIds array with the schema error, never an unevidenced finding (AC-1240)', async () => {
    const result = await callTool(client, 'eyvar_note_finding', { text: 'No evidence.', runIds: [] })
    expect(result.isError).toBe(true)
  })

  it('refuses empty text with the schema error', async () => {
    const result = await callTool(client, 'eyvar_note_finding', { text: '', runIds: ['RUN-1'] })
    expect(result.isError).toBe(true)
  })
})
