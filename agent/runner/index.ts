/**
 * The daemon (§3.3, §7, §10): poll, claim, run, report — one job at a time
 * (`lock.ts`). `processJob` is exported separately from `main` so a test
 * can drive one cycle without a real poll loop or live backend.
 */

import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { readRunnerEnv, type RunnerEnv } from './env.js'
import { checkLogin } from './loginCheck.js'
import { acquireLock, RunnerAlreadyRunningError, type RunnerLock } from './lock.js'
import { heartbeat, claimJob, postEvents, postResult, postFail, type AgentJobLike, type RunnerEventInput } from './httpClient.js'
import { buildJobPrompt, readPromptVersion, type AgentJobKind } from './jobAssembly.js'
import { runAnalystSpawn, type SpawnOutcome } from './spawn.js'
import { validate } from './validate.js'
import { checkSchedulesDue, initialScheduleCheckState, type ScheduleCheckState } from './schedule.js'

function riyadhToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

/** Chunks to the backend's own cap (`05-backend.md` §5: "≤ 50 per post"). */
async function postEventsChunked(env: RunnerEnv, jobId: string, events: RunnerEventInput[]): Promise<void> {
  const CHUNK = 50
  for (let i = 0; i < events.length; i += CHUNK) {
    await postEvents(env, jobId, events.slice(i, i + CHUNK))
  }
}

function toolLogPathFor(env: RunnerEnv, jobId: string): string {
  return resolve(env.agentDir, 'runner', `${jobId}.jsonl`)
}

/**
 * Runs one spawn attempt (or the retry) and returns everything `processJob`
 * needs to decide what happened. Exported for the E2E test — the only test
 * gated behind `AGENT_E2E=1`.
 */
export async function runOneAttempt(env: RunnerEnv, job: AgentJobLike, prompt: string, mcpSource: 'mock' | 'http'): Promise<SpawnOutcome> {
  return runAnalystSpawn(
    {
      claudeBin: env.claudeBin,
      cwd: env.sandboxDir,
      mcpConfigPath: env.mcpConfigPath,
      settingsPath: env.settingsPath,
      systemPromptFile: env.analystPromptPath,
      schemasDir: env.schemasDir,
      kind: job.kind,
      maxTurns: env.maxTurns,
      prompt,
      env: {
        EYVAR_MCP_SOURCE: mcpSource,
        EYVAR_JOB_ID: job.id,
        EYVAR_ACTING_FOR: job.requestedBy,
        AGENT_RUNNER_TOKEN: env.runnerToken,
        EYVAR_API_BASE_URL: env.apiBaseUrl,
        EYVAR_TOOL_LOG_PATH: toolLogPathFor(env, job.id),
      },
    },
    env.jobTimeoutMs,
  )
}

/** AC-1247's mismatch note, appended verbatim to the retry prompt. */
function appendMismatch(prompt: string, violations: string[]): string {
  return [
    prompt,
    '',
    '# Evidence mismatch in your previous attempt — fix these and answer again',
    ...violations.map((v) => `- ${v}`),
  ].join('\n')
}

export interface ProcessJobResult {
  outcome: 'done' | 'deferred' | 'failed:timeout' | 'failed:evidence' | 'failed:schema'
  retryAt?: string
}

/** One full poll-claim cycle's work for an already-claimed job. */
export async function processJob(env: RunnerEnv, job: AgentJobLike, mcpSource: 'mock' | 'http' = 'http'): Promise<ProcessJobResult> {
  const promptVersion = readPromptVersion(env.analystPromptPath)
  const prompt = buildJobPrompt(job.kind as AgentJobKind, env.promptsDir, {
    kind: job.kind as AgentJobKind,
    question: job.question,
    language: job.language,
    today: riyadhToday(),
    // The model's own `job_context` tool (T20) is the authoritative coverage source (§7 step 2:
    // "discover, never guess") — the runner does not duplicate a second, unverified path to it here.
    dataCoverageFrom: '(call job_context for the authoritative window)',
    dataCoverageTo: '(call job_context for the authoritative window)',
    contextObjectsJson: JSON.stringify(job.contextObjects ?? []),
  })

  await postEventsChunked(env, job.id, [{ type: 'tool-call', tool: 'analyst-prompt-version', summary: promptVersion, durationMs: 0 }])

  let outcome = await runOneAttempt(env, job, prompt, mcpSource)
  await postEventsChunked(env, job.id, outcome.events)
  for (const finding of outcome.findings) {
    await postEvents(env, job.id, [{ type: 'finding', text: finding.text, runIds: finding.runIds }])
  }

  if (outcome.rateLimit.limited) {
    await postFail(env, job.id, { outcome: 'deferred', retryAt: outcome.rateLimit.retryAt })
    return { outcome: 'deferred', retryAt: outcome.rateLimit.retryAt }
  }
  if (outcome.timedOut) {
    await postFail(env, job.id, { outcome: 'failed', reason: 'timeout' })
    return { outcome: 'failed:timeout' }
  }

  let result = validate(outcome.candidate, outcome.toolLog)

  // AC-1247: exactly one retry, only for an evidence mismatch.
  if (!result.ok && result.category === 'evidence') {
    const retryPrompt = appendMismatch(prompt, result.violations)
    outcome = await runOneAttempt(env, job, retryPrompt, mcpSource)
    await postEventsChunked(env, job.id, outcome.events)
    for (const finding of outcome.findings) {
      await postEvents(env, job.id, [{ type: 'finding', text: finding.text, runIds: finding.runIds }])
    }
    if (outcome.rateLimit.limited) {
      await postFail(env, job.id, { outcome: 'deferred', retryAt: outcome.rateLimit.retryAt })
      return { outcome: 'deferred', retryAt: outcome.rateLimit.retryAt }
    }
    if (outcome.timedOut) {
      await postFail(env, job.id, { outcome: 'failed', reason: 'timeout' })
      return { outcome: 'failed:timeout' }
    }
    result = validate(outcome.candidate, outcome.toolLog)
  }

  if (!result.ok) {
    await postFail(env, job.id, { outcome: 'failed', reason: result.category })
    return { outcome: `failed:${result.category}` }
  }

  await postResult(env, job.id, { ...result.study, turns: outcome.turns })
  return { outcome: 'done' }
}

/* ─────────────────────────────── the loop ─────────────────────────────── */

export interface RunnerState {
  limitedUntil: string | null
}

async function pollOnce(env: RunnerEnv, state: RunnerState, mcpSource: 'mock' | 'http', scheduleState: ScheduleCheckState): Promise<void> {
  // §8's fallback — throttled internally, so this costs nothing on the
  // ticks it skips. Runs regardless of `limitedUntil`: a usage limit stops
  // the runner from spawning `claude -p`, not from telling the backend a
  // schedule is due (that part needs no model turn at all).
  await checkSchedulesDue(env, scheduleState)

  if (state.limitedUntil && new Date(state.limitedUntil).getTime() > Date.now()) return // AC-1248: claim nothing until retryAt

  const job = await claimJob(env)
  if (!job) return

  const result = await processJob(env, job, mcpSource)
  if (result.outcome === 'deferred' && result.retryAt) state.limitedUntil = result.retryAt
  else state.limitedUntil = null
}

export async function main(): Promise<void> {
  const env = readRunnerEnv()

  const login = await checkLogin(env.claudeBin)
  if (!login.ok) {
    console.error(`Login check failed (${login.reason}): ${login.detail}`)
    process.exitCode = 1
    return
  }
  console.error(`Login check passed (apiKeySource: ${login.apiKeySource}).`)

  let lock: RunnerLock
  try {
    lock = acquireLock(resolve(env.agentDir, 'runner', 'runner.lock'))
  } catch (error) {
    if (error instanceof RunnerAlreadyRunningError) {
      console.error(error.message)
      process.exitCode = 1
      return
    }
    throw error
  }

  const mcpSource = process.env.EYVAR_MCP_SOURCE === 'mock' ? 'mock' : 'http'
  const state: RunnerState = { limitedUntil: null }
  const scheduleState = initialScheduleCheckState()

  const shutdown = (): void => {
    lock.release()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  const heartbeatTimer = setInterval(() => {
    heartbeat(env, state.limitedUntil).catch((error: unknown) => console.error('heartbeat failed:', error))
  }, env.heartbeatIntervalMs)
  await heartbeat(env, state.limitedUntil).catch((error: unknown) => console.error('heartbeat failed:', error))

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      await pollOnce(env, state, mcpSource, scheduleState).catch((error: unknown) => console.error('poll cycle failed:', error))
      await new Promise((r) => setTimeout(r, env.pollIntervalMs))
    }
  } finally {
    clearInterval(heartbeatTimer)
    lock.release()
  }
}

// `pathToFileURL(resolve(...))`, not a hand-built `file://` string: a hand-built one broke on
// Windows two ways at once (confirmed by actually running the compiled output) — `process.argv[1]`
// arrives relative when the process is invoked with a relative path, and the repo path itself has
// a space ("Eyvar Admin") that needs `%20` encoding, neither of which a plain string template does.
const isMainModule = process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
if (isMainModule) {
  main().catch((error: unknown) => {
    console.error('runner crashed:', error)
    process.exitCode = 1
  })
}
