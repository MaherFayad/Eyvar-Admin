/** T20 `job_context` — AC-1240. */

import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import { disableMockLatency, resetDataLayer } from '../../src/data/clients/index'
import { buildTestClient, callTool, textOf } from './testHarness.js'
import type { Client } from '@modelcontextprotocol/sdk/client/index.js'

describe('T20 job_context', () => {
  let client: Client
  let close: () => Promise<void>

  afterEach(async () => {
    delete process.env.EYVAR_JOB_ID
    await close()
  })

  it("resolves the job's kind, question, language, today and its context objects", async () => {
    disableMockLatency()
    resetDataLayer()
    process.env.EYVAR_JOB_ID = 'AGT-1'
    ;({ client, close } = await buildTestClient())

    const body = textOf(await callTool(client, 'eyvar_job_context', {}))
    expect(body.jobId).toBe('AGT-1')
    expect(body.kind).toBe('triage-alert')
    expect(typeof body.question).toBe('string')
    expect(body.language).toBe('en')
    expect(typeof body.today).toBe('string')
    expect(body.dataCoverage).toMatchObject({ from: expect.any(String), to: expect.any(String) })

    const contextObjects = body.contextObjects as Array<{ kind: string; id?: string; content: unknown }>
    expect(contextObjects).toHaveLength(1)
    expect(contextObjects[0]!.kind).toBe('firing')
    expect(contextObjects[0]!.id).toBe('AFR-1')
    expect(contextObjects[0]!.content).not.toBeNull() // resolved, not just echoed back as {kind, id}
  })

  it('refuses with no-job when EYVAR_JOB_ID is unset (AC-1240)', async () => {
    disableMockLatency()
    resetDataLayer()
    delete process.env.EYVAR_JOB_ID
    ;({ client, close } = await buildTestClient())

    const body = textOf(await callTool(client, 'eyvar_job_context', {}))
    expect(body.refused).toBe(true)
    expect(body.code).toBe('no-job')
  })

  it('refuses an unknown job id, not an empty result', async () => {
    disableMockLatency()
    resetDataLayer()
    process.env.EYVAR_JOB_ID = 'AGT-does-not-exist'
    ;({ client, close } = await buildTestClient())

    const body = textOf(await callTool(client, 'eyvar_job_context', {}))
    expect(body.refused).toBe(true)
    expect(body.code).toBe('not-found')
  })
})
