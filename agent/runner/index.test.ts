/**
 * AC-1247: exactly one retry on an evidence mismatch, then `failed:evidence`.
 * Tests `processJob`'s own orchestration (§7), with `./httpClient.js` and
 * `./spawn.js` mocked and everything else real, against the actual `agent/prompts/`/`agent/schemas/` files.
 */

import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readRunnerEnv } from './env.js'
import type { SpawnOutcome } from './spawn.js'
import type { AgentJobLike } from './httpClient.js'

const httpClientMocks = vi.hoisted(() => ({
  heartbeat: vi.fn(),
  claimJob: vi.fn(),
  postEvents: vi.fn(),
  postResult: vi.fn(),
  postFail: vi.fn(),
}))
vi.mock('./httpClient.js', () => httpClientMocks)

const runAnalystSpawn = vi.hoisted(() => vi.fn())
vi.mock('./spawn.js', async () => {
  const actual = await vi.importActual<typeof import('./spawn.js')>('./spawn.js')
  return { ...actual, runAnalystSpawn }
})

const { processJob } = await import('./index.js')

const REPO_ROOT = resolve(__dirname, '../..')

const JOB: AgentJobLike = {
  id: 'AGT-TEST-1',
  kind: 'case-study',
  question: 'Why did the cancellation rate rise?',
  language: 'en',
  requestedBy: 'USR-1',
  contextObjects: [],
}

function outcome(overrides: Partial<SpawnOutcome> = {}): SpawnOutcome {
  return {
    toolLog: [],
    events: [],
    findings: [],
    candidate: null,
    rateLimit: { limited: false },
    timedOut: false,
    exitCode: 0,
    toolCallCount: 0,
    turns: 1,
    ...overrides,
  }
}

// A structurally valid case study whose one finding cites RUN-1 — matched against the tool log
// per test to control whether it passes or fails evidence.
function candidateCiting(value: number) {
  return {
    title: 't',
    language: 'en',
    question: 'q',
    decision: 'd',
    headline: { text: 'h', confidence: 'high', confidenceReason: 'r' },
    baseline: { measureKey: 'trips.cancellationRate', runId: 'RUN-1', level: 5 },
    findings: [{ id: 'F1', text: 'f', values: [{ runId: 'RUN-1', seriesId: 's1', bucket: 'total', value, unit: 'percent', currency: null }], evidence: ['RUN-1'] }],
    contributors: [],
    alternatives: [
      { hypothesis: 'a', tested: true, evidence: [], verdict: 'not-supported', text: 'x' },
      { hypothesis: 'b', tested: true, evidence: [], verdict: 'not-supported', text: 'y' },
    ],
    dataQuality: { gaps: [], partialBucketsExcluded: true, blockedSeries: [], truncated: false, coverageNote: 'c' },
    recommendations: [],
    followUps: [],
  }
}

const MATCHING_TOOL_LOG = [{ kind: 'run' as const, runId: 'RUN-1', result: { buckets: ['b'], series: [{ id: 's1', points: [7] }] } }]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('processJob — AC-1247: exactly one retry on an evidence mismatch', () => {
  it('retries once and succeeds when the second attempt is correct', async () => {
    runAnalystSpawn
      .mockResolvedValueOnce(outcome({ toolLog: MATCHING_TOOL_LOG, candidate: candidateCiting(999) })) // wrong number
      .mockResolvedValueOnce(outcome({ toolLog: MATCHING_TOOL_LOG, candidate: candidateCiting(7) })) // fixed

    const env = readRunnerEnv({ runnerToken: 'test-token', repoRoot: REPO_ROOT })
    const result = await processJob(env, JOB, 'mock')

    expect(result.outcome).toBe('done')
    expect(runAnalystSpawn).toHaveBeenCalledTimes(2)
    // the retry's prompt names the mismatch
    const secondCallPrompt = runAnalystSpawn.mock.calls[1]![0].prompt as string
    expect(secondCallPrompt).toContain('Evidence mismatch')
    expect(secondCallPrompt).toContain('999')
    expect(httpClientMocks.postResult).toHaveBeenCalledTimes(1)
    expect(httpClientMocks.postFail).not.toHaveBeenCalled()
  })

  it('fails the job as failed:evidence after a second consecutive mismatch, never a third attempt', async () => {
    runAnalystSpawn
      .mockResolvedValueOnce(outcome({ toolLog: MATCHING_TOOL_LOG, candidate: candidateCiting(999) }))
      .mockResolvedValueOnce(outcome({ toolLog: MATCHING_TOOL_LOG, candidate: candidateCiting(111) }))

    const env = readRunnerEnv({ runnerToken: 'test-token', repoRoot: REPO_ROOT })
    const result = await processJob(env, JOB, 'mock')

    expect(result.outcome).toBe('failed:evidence')
    expect(runAnalystSpawn).toHaveBeenCalledTimes(2) // exactly one retry, not a retry storm
    expect(httpClientMocks.postFail).toHaveBeenCalledTimes(1)
    expect(httpClientMocks.postFail).toHaveBeenCalledWith(env, JOB.id, { outcome: 'failed', reason: 'evidence' })
    expect(httpClientMocks.postResult).not.toHaveBeenCalled()
  })

  it('does not retry a schema failure (fewer than two alternatives) — fails immediately', async () => {
    const badShape = { ...candidateCiting(7), alternatives: [candidateCiting(7).alternatives[0]] }
    runAnalystSpawn.mockResolvedValueOnce(outcome({ toolLog: MATCHING_TOOL_LOG, candidate: badShape }))

    const env = readRunnerEnv({ runnerToken: 'test-token', repoRoot: REPO_ROOT })
    const result = await processJob(env, JOB, 'mock')

    expect(result.outcome).toBe('failed:schema')
    expect(runAnalystSpawn).toHaveBeenCalledTimes(1) // no retry for a schema-category failure
    expect(httpClientMocks.postFail).toHaveBeenCalledWith(env, JOB.id, { outcome: 'failed', reason: 'schema' })
  })

  it('AC-1248: a rate-limited spawn defers the job and never calls validate at all', async () => {
    runAnalystSpawn.mockResolvedValueOnce(outcome({ rateLimit: { limited: true, retryAt: '2026-06-25T14:00:00.000Z', rateLimitType: 'five_hour', source: 'stream-event' } }))

    const env = readRunnerEnv({ runnerToken: 'test-token', repoRoot: REPO_ROOT })
    const result = await processJob(env, JOB, 'mock')

    expect(result.outcome).toBe('deferred')
    expect(result.retryAt).toBe('2026-06-25T14:00:00.000Z')
    expect(runAnalystSpawn).toHaveBeenCalledTimes(1)
    expect(httpClientMocks.postFail).toHaveBeenCalledWith(env, JOB.id, { outcome: 'deferred', retryAt: '2026-06-25T14:00:00.000Z' })
  })

  it('a timed-out spawn fails as failed:timeout, no retry', async () => {
    runAnalystSpawn.mockResolvedValueOnce(outcome({ timedOut: true, exitCode: null }))

    const env = readRunnerEnv({ runnerToken: 'test-token', repoRoot: REPO_ROOT })
    const result = await processJob(env, JOB, 'mock')

    expect(result.outcome).toBe('failed:timeout')
    expect(runAnalystSpawn).toHaveBeenCalledTimes(1)
    expect(httpClientMocks.postFail).toHaveBeenCalledWith(env, JOB.id, { outcome: 'failed', reason: 'timeout' })
  })

  it('AC-1252: posts the prompt version as the first event of the job', async () => {
    runAnalystSpawn.mockResolvedValueOnce(outcome({ toolLog: MATCHING_TOOL_LOG, candidate: candidateCiting(7) }))

    const env = readRunnerEnv({ runnerToken: 'test-token', repoRoot: REPO_ROOT })
    await processJob(env, JOB, 'mock')

    const firstEventsCall = httpClientMocks.postEvents.mock.calls[0]!
    expect(firstEventsCall[1]).toBe(JOB.id)
    expect(firstEventsCall[2]).toEqual([{ type: 'tool-call', tool: 'analyst-prompt-version', summary: '1.0.0', durationMs: 0 }])
  })
})
