/**
 * The http transport for `EYVAR_MCP_SOURCE=http` — fetches `/api/v1` with
 * the runner token, `X-Eyvar-Acting-For`, and `X-Eyvar-Job`. Untested
 * against a live backend; a shape mismatch is this file's bug.
 */

import { fetch } from 'undici'

export class EyvarHttpError extends Error {
  readonly status: number
  readonly body: string
  constructor(status: number, body: string) {
    super(`eyvar api ${status}: ${body || 'no body'}`)
    this.status = status
    this.body = body
  }
}

interface HttpConfig {
  baseUrl: string
  runnerToken: string
  actingFor: string
  jobId: string | null
}

function readConfig(): HttpConfig {
  const baseUrl = (process.env.EYVAR_API_BASE_URL ?? 'http://localhost:3000/api/v1').replace(/\/+$/, '')
  const runnerToken = process.env.AGENT_RUNNER_TOKEN
  const actingFor = process.env.EYVAR_ACTING_FOR
  if (!runnerToken) {
    throw new Error('AGENT_RUNNER_TOKEN is not set — the http transport cannot authenticate (01-analyst-agent.md §3.2).')
  }
  if (!actingFor) {
    throw new Error('EYVAR_ACTING_FOR is not set — every tool call must carry X-Eyvar-Acting-For (§3.2).')
  }
  return { baseUrl, runnerToken, actingFor, jobId: process.env.EYVAR_JOB_ID ?? null }
}

function headersFor(config: HttpConfig, extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    authorization: `Bearer ${config.runnerToken}`,
    'x-eyvar-acting-for': config.actingFor,
    ...extra,
  }
  if (config.jobId) headers['x-eyvar-job'] = config.jobId
  return headers
}

async function handle<T>(res: { ok: boolean; status: number; text: () => Promise<string> }): Promise<T> {
  const body = await res.text()
  if (!res.ok) throw new EyvarHttpError(res.status, body)
  return body.length === 0 ? (undefined as T) : (JSON.parse(body) as T)
}

export async function httpGet<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
  const config = readConfig()
  const url = new URL(config.baseUrl + path)
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value))
  }
  const res = await fetch(url, { headers: headersFor(config) })
  return handle<T>(res)
}

export async function httpPost<T>(path: string, body: unknown, extraHeaders?: Record<string, string>): Promise<T> {
  const config = readConfig()
  const res = await fetch(config.baseUrl + path, {
    method: 'POST',
    headers: headersFor(config, extraHeaders),
    body: JSON.stringify(body ?? {}),
  })
  return handle<T>(res)
}

/** Like `httpGet`, for the one endpoint that answers `text/markdown`, not JSON — T3's glossary. */
export async function httpGetText(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<string> {
  const config = readConfig()
  const url = new URL(config.baseUrl + path)
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value))
  }
  const res = await fetch(url, { headers: headersFor(config) })
  const body = await res.text()
  if (!res.ok) throw new EyvarHttpError(res.status, body)
  return body
}
