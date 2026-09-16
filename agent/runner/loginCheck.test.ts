/**
 * AC-1245, AC-1250 (D38). `evaluateInitEvent` is the decision logic, tested
 * without a subscription; the real spawn is the gated `spawn.e2e.test.ts`.
 * The `"none"` case is a real subscription `system/init` event; the API-key case mirrors it with the CLI's own literal `apiKeySource` string.
 */

import { describe, expect, it } from 'vitest'
import { evaluateInitEvent, SUBSCRIPTION_API_KEY_SOURCES } from './loginCheck.js'

describe('login check — a real subscription session (apiKeySource: "none")', () => {
  it('accepts it', () => {
    const result = evaluateInitEvent({ type: 'system', subtype: 'init', apiKeySource: 'none' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.apiKeySource).toBe('none')
  })
})

describe('login check — a long-lived subscription OAuth token (apiKeySource: "CLAUDE_CODE_OAUTH_TOKEN")', () => {
  it('accepts it — this is the documented headless-subscription mechanism, not a pay-per-token key', () => {
    const result = evaluateInitEvent({ type: 'system', subtype: 'init', apiKeySource: 'CLAUDE_CODE_OAUTH_TOKEN' })
    expect(result.ok).toBe(true)
  })
})

describe('login check — AC-1245: an API-key session', () => {
  it('refuses a session authenticated via ANTHROPIC_API_KEY, naming the source', () => {
    const result = evaluateInitEvent({ type: 'system', subtype: 'init', apiKeySource: 'ANTHROPIC_API_KEY' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('api-key-auth')
      expect(result.apiKeySource).toBe('ANTHROPIC_API_KEY')
      expect(result.detail).toContain('ANTHROPIC_API_KEY')
    }
  })

  it('refuses every other key mechanism the CLI reports, not only ANTHROPIC_API_KEY', () => {
    for (const source of ['ANTHROPIC_AUTH_TOKEN', 'apiKeyHelper', '/login managed key']) {
      const result = evaluateInitEvent({ type: 'system', subtype: 'init', apiKeySource: source })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.reason).toBe('api-key-auth')
    }
  })

  it('refuses when no init event arrived at all', () => {
    const result = evaluateInitEvent(null)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('no-init-event')
  })

  it('refuses when the init event carries no apiKeySource field', () => {
    const result = evaluateInitEvent({ type: 'system', subtype: 'init' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('no-init-event')
  })
})

describe('login check — the allowed-source list is exactly the two subscription mechanisms', () => {
  it('is none and CLAUDE_CODE_OAUTH_TOKEN, nothing else', () => {
    expect(SUBSCRIPTION_API_KEY_SOURCES).toEqual(['none', 'CLAUDE_CODE_OAUTH_TOKEN'])
  })
})
