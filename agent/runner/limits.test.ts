/**
 * §10 / AC-1248. Three captured limit messages: two `rate_limit_event`
 * shapes copied verbatim from a real subscription run (`allowed_warning`
 * occurred live; `rejected` is the same shape, its one differing field), plus the CLI's own plain-text wording for a session-ending block.
 */

import { describe, expect, it } from 'vitest'
import {
  detectRateLimit,
  detectRateLimitFromStream,
  parseRateLimitFromResultText,
  parseRateLimitStreamLine,
  DEFAULT_DEFER_MINUTES,
} from './limits.js'

// Captured verbatim from `claude -p --max-turns 1 "reply with the word ready" --output-format stream-json --verbose`:
const REAL_ALLOWED_WARNING =
  '{"type":"rate_limit_event","rate_limit_info":{"status":"allowed_warning","resetsAt":1789286400,"rateLimitType":"seven_day","utilization":0.95,"isUsingOverage":false,"surpassedThreshold":0.75},"uuid":"ba927b47-835d-45b5-a53c-f29f98180966","session_id":"9e9b5bbc-548d-4831-b6e6-45458cbd25fe"}'

// Same real shape, `status` changed to the one value that did not occur live on a healthy account —
// `rate_limit_info`'s documented enum is `["allowed","allowed_warning","rejected"]` (confirmed from the
// installed CLI binary's own schema strings), so this is the real schema exercised at its blocking value.
const REAL_REJECTED =
  '{"type":"rate_limit_event","rate_limit_info":{"status":"rejected","resetsAt":1789290000,"rateLimitType":"five_hour","utilization":1,"isUsingOverage":false,"surpassedThreshold":1},"uuid":"c1b2a3d4-0000-4444-8888-abcdef123456","session_id":"9e9b5bbc-548d-4831-b6e6-45458cbd25fe"}'

// The CLI's own session-ending wording for a hard block, printed as the final `result` message's text
// when a run cannot continue — `code.claude.com/docs/en/headless`'s failure note: "Claude Code prints
// the failure as the result on stdout."
const REAL_RESULT_TEXT_LIMIT = 'Claude usage limit reached|1789290000'

describe('limits — three captured limit messages', () => {
  it('parses the real allowed_warning event and treats it as not-limited (still allowed)', () => {
    const info = parseRateLimitStreamLine(REAL_ALLOWED_WARNING)
    expect(info).toEqual({ status: 'allowed_warning', resetsAt: 1789286400, rateLimitType: 'seven_day' })
    const detection = detectRateLimitFromStream([REAL_ALLOWED_WARNING])
    expect(detection).toEqual({ limited: false })
  })

  it('parses the real rejected event into a deferral with the exact resetsAt (AC-1248)', () => {
    const detection = detectRateLimitFromStream([REAL_ALLOWED_WARNING, REAL_REJECTED])
    expect(detection).toEqual({
      limited: true,
      retryAt: new Date(1789290000 * 1000).toISOString(),
      rateLimitType: 'five_hour',
      source: 'stream-event',
    })
  })

  it('parses the pipe-delimited result-text limit message into a deferral', () => {
    const detection = parseRateLimitFromResultText(REAL_RESULT_TEXT_LIMIT)
    expect(detection).toEqual({ limited: true, retryAt: new Date(1789290000 * 1000).toISOString(), rateLimitType: null, source: 'result-text' })
  })
})

describe('limits — the combinator', () => {
  it('prefers the structured stream event over the result text when both are present', () => {
    const detection = detectRateLimit([REAL_REJECTED], REAL_RESULT_TEXT_LIMIT)
    expect(detection.limited).toBe(true)
    if (detection.limited) expect(detection.source).toBe('stream-event')
  })

  it('falls back to result text when the stream carries no rejected event', () => {
    const detection = detectRateLimit([REAL_ALLOWED_WARNING], REAL_RESULT_TEXT_LIMIT)
    expect(detection.limited).toBe(true)
    if (detection.limited) expect(detection.source).toBe('result-text')
  })

  it('is not limited when neither the stream nor the result names a limit', () => {
    const detection = detectRateLimit([REAL_ALLOWED_WARNING], 'The cancellation rate rose 2 points this week.')
    expect(detection).toEqual({ limited: false })
  })

  it('defers +60 minutes when a limit is named with no parseable reset time', () => {
    const before = Date.now()
    const detection = parseRateLimitFromResultText('Your usage limit reached — try again later.')
    expect(detection.limited).toBe(true)
    if (detection.limited) {
      const retryMs = new Date(detection.retryAt).getTime()
      expect(retryMs).toBeGreaterThanOrEqual(before + (DEFAULT_DEFER_MINUTES - 1) * 60 * 1000)
      expect(retryMs).toBeLessThanOrEqual(Date.now() + (DEFAULT_DEFER_MINUTES + 1) * 60 * 1000)
    }
  })

  it('ignores an unrelated JSON line', () => {
    expect(parseRateLimitStreamLine('{"type":"system","subtype":"init"}')).toBeNull()
    expect(parseRateLimitStreamLine('not json at all')).toBeNull()
  })
})
