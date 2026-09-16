/**
 * The login check (§3.3, AC-1245, AC-1250, D38): runs `claude -p --max-turns 1 "reply with the word ready"` at start, and refuses to claim jobs unless `system/init`'s `apiKeySource` names a subscription mechanism — `"none"` or the long-lived `"CLAUDE_CODE_OAUTH_TOKEN"`.
 * Anything else (`ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `apiKeyHelper`, a cloud credential) is a pay-per-token key, refused outright: D38 forbids API-key auth entirely, and this is the one check that must not be fooled.
 */

import { spawn } from 'node:child_process'

export const SUBSCRIPTION_API_KEY_SOURCES: readonly string[] = ['none', 'CLAUDE_CODE_OAUTH_TOKEN']

export type LoginCheckResult =
  | { ok: true; apiKeySource: string }
  | { ok: false; reason: 'api-key-auth' | 'no-init-event' | 'process-failed' | 'no-reply'; detail: string; apiKeySource?: string }

interface InitEventLike {
  type?: unknown
  subtype?: unknown
  apiKeySource?: unknown
}

/** Pure: given the parsed `system`/`init` event (or `null` if none arrived), decide whether this session may claim jobs. */
export function evaluateInitEvent(initEvent: InitEventLike | null): LoginCheckResult {
  if (!initEvent) {
    return { ok: false, reason: 'no-init-event', detail: 'claude -p produced no system/init event — cannot verify the auth source.' }
  }
  const source = typeof initEvent.apiKeySource === 'string' ? initEvent.apiKeySource : null
  if (source === null) {
    return { ok: false, reason: 'no-init-event', detail: 'The system/init event carried no apiKeySource field.' }
  }
  if (!SUBSCRIPTION_API_KEY_SOURCES.includes(source)) {
    return {
      ok: false,
      reason: 'api-key-auth',
      detail: `This session is authenticated via "${source}", an API-key mechanism — D38 requires the owner's subscription login, not an API key.`,
      apiKeySource: source,
    }
  }
  return { ok: true, apiKeySource: source }
}

interface StreamLine {
  type?: unknown
  subtype?: unknown
  result?: unknown
  is_error?: unknown
}

function findInitEvent(lines: readonly string[]): InitEventLike | null {
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as StreamLine
      if (parsed.type === 'system' && parsed.subtype === 'init') return parsed as InitEventLike
    } catch {
      /* not JSON, or not this line — the stream also carries rate_limit_event and others */
    }
  }
  return null
}

function findResult(lines: readonly string[]): StreamLine | null {
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      const parsed = JSON.parse(lines[i]!) as StreamLine
      if (parsed.type === 'result') return parsed
    } catch {
      /* skip */
    }
  }
  return null
}

/**
 * Spawns the real check. Kept separate from `evaluateInitEvent` so the
 * decision logic is unit-testable without a subscription; only this
 * function needs a live `claude` binary.
 */
export async function checkLogin(claudeBin = 'claude', extraEnv: Record<string, string> = {}): Promise<LoginCheckResult> {
  const lines: string[] = []
  const exitInfo = await new Promise<{ code: number | null; error: Error | null }>((resolve) => {
    const child = spawn(
      claudeBin,
      ['-p', '--max-turns', '1', 'reply with the word ready', '--output-format', 'stream-json', '--verbose'],
      { shell: true, env: { ...process.env, ...extraEnv } },
    )
    let buffer = ''
    child.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf8')
      const parts = buffer.split('\n')
      buffer = parts.pop() ?? ''
      lines.push(...parts.filter((l) => l.trim().length > 0))
    })
    child.on('error', (error) => resolve({ code: null, error }))
    child.on('close', (code) => {
      if (buffer.trim().length > 0) lines.push(buffer)
      resolve({ code, error: null })
    })
  })

  if (exitInfo.error) {
    return { ok: false, reason: 'process-failed', detail: `Could not start "${claudeBin}": ${exitInfo.error.message}` }
  }
  if (exitInfo.code !== 0) {
    return { ok: false, reason: 'process-failed', detail: `claude -p exited with code ${exitInfo.code}.` }
  }

  const initResult = evaluateInitEvent(findInitEvent(lines))
  if (!initResult.ok) return initResult

  const result = findResult(lines)
  const resultText = typeof result?.result === 'string' ? result.result : ''
  if (!/ready/i.test(resultText)) {
    return { ok: false, reason: 'no-reply', detail: `Expected "ready" in the reply, got: ${JSON.stringify(resultText)}` }
  }

  return initResult
}
