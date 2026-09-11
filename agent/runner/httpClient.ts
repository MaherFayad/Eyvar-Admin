/**
 * The runner-token surface — `05-backend.md` §5, `api/_lib/agentAuth.ts`'s
 * "bare runner call" path: `AGENT_RUNNER_TOKEN` alone, no `X-Eyvar-Acting-For`.
 * Distinct from `agent/mcp/client.ts`, which is the *acting-for* transport
 * the spawned `claude -p` child's own MCP tools use — this file is the
 * daemon's own calls to claim work and report on it, never seen by the model.
 */

import { fetch } from 'undici'
import type { RunnerEnv } from './env.js'

export class RunnerHttpError extends Error {
  readonly status: number
  readonly body: string
  constructor(status: number, body: string) {
    super(`agent queue ${status}: ${body || 'no body'}`)
    this.status = status
    this.body = body
  }
}

async function request<T>(env: RunnerEnv, path: string, init: { method: string; body?: unknown }): Promise<{ status: number; data: T | null }> {
  const res = await fetch(env.apiBaseUrl + path, {
    method: init.method,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${env.runnerToken}` },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  const text = await res.text()
  if (!res.ok) throw new RunnerHttpError(res.status, text)
  return { status: res.status, data: text.length === 0 ? null : (JSON.parse(text) as T) }
}

export interface AgentJobLike {
  id: string
  kind: 'ask' | 'case-study' | 'build-page' | 'triage-alert' | 'weekly-review'
  question: string
  language: 'ar' | 'en'
  requestedBy: string
  contextObjects: unknown[]
}

/** `POST /api/v1/agent/heartbeat` — §3.3: every 30 s. `limitUntil` mirrors the runner's own known deferral, so the operator-facing status line can show it before the next claim attempt even runs. */
export async function heartbeat(env: RunnerEnv, limitUntil: string | null): Promise<void> {
  await request(env, '/agent/heartbeat', { method: 'POST', body: { id: env.runnerId, name: env.runnerName, limitUntil } })
}

/** `POST /api/v1/agent/jobs/claim` — 200 with the job, or 204 (`data: null`) when none is due. */
export async function claimJob(env: RunnerEnv): Promise<AgentJobLike | null> {
  const { status, data } = await request<{ data: AgentJobLike }>(env, '/agent/jobs/claim', { method: 'POST', body: { runnerId: env.runnerId } })
  if (status === 204 || !data) return null
  return data.data
}

export type RunnerEventInput =
  | { type: 'tool-call'; tool: string; summary: string; durationMs: number }
  | { type: 'finding'; text: string; runIds: string[] }

/** `POST /api/v1/agent/jobs/:id/events` — ≤ 50 per post (`05-backend.md` §5); the caller chunks. */
export async function postEvents(env: RunnerEnv, jobId: string, events: RunnerEventInput[]): Promise<void> {
  if (events.length === 0) return
  await request(env, `/agent/jobs/${jobId}/events`, { method: 'POST', body: { events } })
}

/** `POST /api/v1/agent/jobs/:id/result` — the runner's own validated output. 422 (a `RunnerHttpError`) means the backend's independent check disagreed; the caller decides whether to retry. */
export async function postResult(env: RunnerEnv, jobId: string, body: Record<string, unknown>): Promise<void> {
  await request(env, `/agent/jobs/${jobId}/result`, { method: 'POST', body })
}

export type FailBody = { outcome: 'failed'; reason: 'timeout' | 'evidence' | 'schema' } | { outcome: 'deferred'; retryAt?: string }

/** `POST /api/v1/agent/jobs/:id/fail` — the runner's own retry budget exhausted (§7, §10), or a rate limit (AC-1248). */
export async function postFail(env: RunnerEnv, jobId: string, body: FailBody): Promise<void> {
  await request(env, `/agent/jobs/${jobId}/fail`, { method: 'POST', body })
}
