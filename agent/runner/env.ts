/**
 * The runner's own environment — distinct from `agent/mcp/*`'s, which the
 * `claude -p` child process reads for itself (`EYVAR_MCP_SOURCE`,
 * `EYVAR_JOB_ID`, …, `agent/README.md`). This file is what the daemon
 * process (`index.ts`) reads to know how to reach the backend and what to
 * spawn.
 */

import { resolve } from 'node:path'

export interface RunnerEnv {
  runnerId: string
  runnerName: string
  runnerToken: string
  apiBaseUrl: string
  claudeBin: string
  repoRoot: string
  agentDir: string
  sandboxDir: string
  mcpConfigPath: string
  settingsPath: string
  analystPromptPath: string
  promptsDir: string
  schemasDir: string
  pollIntervalMs: number
  heartbeatIntervalMs: number
  jobTimeoutMs: number
  maxTurns: number
}

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

/** §3.3's own numbers, overridable for tests: 20 min job timeout, 30 s heartbeat, 60 max-turns. */
export function readRunnerEnv(overrides: Partial<RunnerEnv> = {}): RunnerEnv {
  const runnerToken = overrides.runnerToken ?? process.env.AGENT_RUNNER_TOKEN
  if (!runnerToken) {
    throw new Error('AGENT_RUNNER_TOKEN is not set — the runner cannot authenticate to the job queue (01-analyst-agent.md §3.2).')
  }
  const repoRoot = overrides.repoRoot ?? process.env.EYVAR_REPO_ROOT ?? process.cwd()
  const agentDir = resolve(repoRoot, 'agent')

  return {
    runnerId: overrides.runnerId ?? process.env.AGENT_RUNNER_ID ?? 'runner-1',
    runnerName: overrides.runnerName ?? process.env.AGENT_RUNNER_NAME ?? 'eyvar-analyst-runner',
    runnerToken,
    apiBaseUrl: overrides.apiBaseUrl ?? (process.env.EYVAR_API_BASE_URL ?? 'http://localhost:3000/api/v1').replace(/\/+$/, ''),
    claudeBin: overrides.claudeBin ?? process.env.CLAUDE_BIN ?? 'claude',
    repoRoot,
    agentDir,
    sandboxDir: overrides.sandboxDir ?? resolve(agentDir, 'sandbox'),
    mcpConfigPath: overrides.mcpConfigPath ?? resolve(agentDir, 'mcp.json'),
    settingsPath: overrides.settingsPath ?? resolve(agentDir, 'settings.json'),
    analystPromptPath: overrides.analystPromptPath ?? resolve(agentDir, 'prompts', 'analyst.md'),
    promptsDir: overrides.promptsDir ?? resolve(agentDir, 'prompts'),
    schemasDir: overrides.schemasDir ?? resolve(agentDir, 'schemas'),
    pollIntervalMs: overrides.pollIntervalMs ?? intFromEnv('AGENT_POLL_INTERVAL_MS', 5_000),
    heartbeatIntervalMs: overrides.heartbeatIntervalMs ?? intFromEnv('AGENT_HEARTBEAT_INTERVAL_MS', 30_000),
    jobTimeoutMs: overrides.jobTimeoutMs ?? intFromEnv('AGENT_JOB_TIMEOUT_MS', 20 * 60 * 1000),
    maxTurns: overrides.maxTurns ?? intFromEnv('AGENT_MAX_TURNS', 60),
  }
}
