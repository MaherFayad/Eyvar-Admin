/**
 * Rate-limit detection — `01-analyst-agent.md` §10, AC-1248. `claude -p
 * --output-format stream-json` emits a `rate_limit_event` line whenever the
 * subscription's own usage-limit state changes (`rate_limit_info: {status:
 * "allowed"|"allowed_warning"|"rejected", resetsAt?, rateLimitType?}` — a
 * real shape, captured from a live `claude -p` run against this machine's
 * subscription, not a guess). `status: "rejected"` is the hard stop the
 * runner must turn into `deferred`, never a crash or a retry storm. A
 * plain-text fallback covers the case where the block instead ends the
 * session with a `result` message whose text names the limit rather than a
 * structured event (the CLI's own wording, e.g. "usage limit reached").
 */

export interface RateLimitInfo {
  status: 'allowed' | 'allowed_warning' | 'rejected'
  resetsAt?: number // unix seconds
  rateLimitType?: string
}

export interface RateLimitDetection {
  limited: true
  /** ISO 8601. Parsed from the message when it names a reset time, else now + `DEFAULT_DEFER_MINUTES`. */
  retryAt: string
  rateLimitType: string | null
  source: 'stream-event' | 'result-text'
}

export type RateLimitResult = RateLimitDetection | { limited: false }

/** §10's own fallback: "+60 min" when the message names no reset time. */
export const DEFAULT_DEFER_MINUTES = 60

/** One `stream-json` line → its `rate_limit_info`, or `null` for any other line (most lines are not this event). */
export function parseRateLimitStreamLine(line: string): RateLimitInfo | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(line)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') return null
  const obj = parsed as Record<string, unknown>
  if (obj.type !== 'rate_limit_event') return null
  const info = obj.rate_limit_info as Record<string, unknown> | undefined
  if (!info || typeof info.status !== 'string') return null
  if (info.status !== 'allowed' && info.status !== 'allowed_warning' && info.status !== 'rejected') return null
  return {
    status: info.status,
    resetsAt: typeof info.resetsAt === 'number' ? info.resetsAt : undefined,
    rateLimitType: typeof info.rateLimitType === 'string' ? info.rateLimitType : undefined,
  }
}

function retryAtFromEpochSeconds(resetsAt: number | undefined): string {
  if (resetsAt !== undefined && Number.isFinite(resetsAt)) return new Date(resetsAt * 1000).toISOString()
  return new Date(Date.now() + DEFAULT_DEFER_MINUTES * 60 * 1000).toISOString()
}

/** Every `rate_limit_event` line in a spawn's stream, most-severe-last (a later `rejected` overrides an earlier `allowed`). */
export function detectRateLimitFromStream(lines: readonly string[]): RateLimitResult {
  let rejected: RateLimitInfo | null = null
  for (const line of lines) {
    const info = parseRateLimitStreamLine(line)
    if (info?.status === 'rejected') rejected = info
  }
  if (!rejected) return { limited: false }
  return {
    limited: true,
    retryAt: retryAtFromEpochSeconds(rejected.resetsAt),
    rateLimitType: rejected.rateLimitType ?? null,
    source: 'stream-event',
  }
}

/**
 * Fallback over the final `result` message's own text — the CLI's own
 * wording when a block ends the session without (or in addition to) a
 * structured `rate_limit_event`. Two patterns, both real CLI phrasing:
 * a pipe-delimited unix timestamp (`"...reached|1735689600"`) and a
 * parenthetical reset clause (`"...reached (5h; resets 2026-06-25 14:00 UTC)"`).
 */
export function parseRateLimitFromResultText(text: string | null | undefined): RateLimitResult {
  if (!text) return { limited: false }
  if (!/usage limit reached|rate limit/i.test(text)) return { limited: false }

  const pipeMatch = text.match(/reached\|(\d+)/)
  if (pipeMatch) {
    return {
      limited: true,
      retryAt: retryAtFromEpochSeconds(Number(pipeMatch[1])),
      rateLimitType: null,
      source: 'result-text',
    }
  }

  const resetsMatch = text.match(/resets\s+(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?)\s*UTC/i)
  if (resetsMatch) {
    const iso = `${resetsMatch[1].replace(' ', 'T')}Z`
    const parsed = Date.parse(iso)
    if (!Number.isNaN(parsed)) {
      return { limited: true, retryAt: new Date(parsed).toISOString(), rateLimitType: null, source: 'result-text' }
    }
  }

  // A limit is clearly named but carries no parseable reset time — §10's own fallback.
  return { limited: true, retryAt: retryAtFromEpochSeconds(undefined), rateLimitType: null, source: 'result-text' }
}

/** The combinator `spawn.ts` calls once per finished job: the stream is authoritative; the result text is the fallback. */
export function detectRateLimit(streamLines: readonly string[], finalResultText: string | null): RateLimitResult {
  const fromStream = detectRateLimitFromStream(streamLines)
  if (fromStream.limited) return fromStream
  return parseRateLimitFromResultText(finalResultText)
}
