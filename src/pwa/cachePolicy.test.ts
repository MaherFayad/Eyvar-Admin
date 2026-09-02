/**
 * **The test that stops this shipping wrong.**
 *
 * `docs/ref/pwa.md` calls the caching policy *"the part that can lose money"*.
 * A unit test of a handful of hand-picked paths would prove the function runs;
 * it would not prove the policy is right, because being right means being right
 * about **every** endpoint in the product, including the ones added last week.
 *
 * So the interesting half of this file walks the real endpoint list — read out
 * of `src/data/clients/` at test time, not copied — and asserts that not one of
 * them lands in a class where a money figure could be cached. If someone adds
 * `/api/v1/settlements` next month and does not classify it, it arrives as a
 * `read` (stale-while-revalidate) and the money-shaped-path check below fails.
 */

import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { API_PREFIX, apiSegment, classify, KILL_SWITCH_PATH, mayStore } from './cachePolicy'

const ORIGIN = 'https://ops.eyvar.test'
const V = `${API_PREFIX}v1`

/** Shorthand: classify a same-origin GET of this path. */
function get(pathname: string) {
  return classify({ pathname, method: 'GET', sameOrigin: true })
}

/* ─────────────── the real endpoint list, read from source ─────────────── */

/**
 * Every path any client passes to `http.*()`, with `${…}` interpolations
 * collapsed to `:id`.
 *
 * Lexical, like `i18n/localisedKeys.test.ts` is and for the same reason: the
 * alternative is walking the TypeScript AST for the argument of a member call,
 * and the paths in this codebase are string or template literals in every one
 * of the 60 client files. A path assembled indirectly would be invisible here —
 * recorded, not hidden.
 */
function endpointPaths(): string[] {
  const dir = path.resolve(__dirname, '../data/clients')
  const found = new Set<string>()
  const call = /http\.[a-z]+(?:<[^(]*>)?\(\s*(`[^`]+`|'[^']+')/g
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.ts') || file.endsWith('.test.ts')) continue
    const source = readFileSync(path.join(dir, file), 'utf8')
    for (const match of source.matchAll(call)) {
      const literal = (match[1] ?? '').slice(1, -1).replace(/\$\{[^}]*\}/g, ':id')
      if (literal.startsWith('/')) found.add(literal)
    }
  }
  return [...found].sort()
}

/**
 * A path whose responses carry a monetary amount, a balance, a settlement state
 * or the price that produces one. Kept as a **separate, independently written
 * list** from `MONEY_SEGMENTS` in the module under test — if this were derived
 * from that set the test would only prove the set equals itself.
 */
const MONEY_SHAPED =
  /^\/(payouts|wallets|escrow|ledger|postings|credit-notes|captain-debts|deductions|refunds|payments|cash-reports|invoice-sequence|vat-config|gateways|rate-cards|plans|subscriptions|surge-windows|surge-suspensions|cancellation-rules|quick-ride-types|metrics|dashboards)(\/|$)/

/** Auth, session, personal state, reports, exports, and security surfaces. */
const NEVER_CACHED_SHAPED =
  /^\/(auth|session|me|presence|security-policy|reports|search|team|team-users|integrations|push)(\/|$)/

describe('the policy, against every endpoint in the product', () => {
  const paths = endpointPaths()

  it('found the client files (guards against a silently empty scan)', () => {
    expect(paths.length).toBeGreaterThan(150)
  })

  it('never lets a money-shaped endpoint into a cache', () => {
    const leaked = paths.filter((p) => MONEY_SHAPED.test(p) && mayStore(get(`${V}${p}`)))
    expect(leaked).toEqual([])
  })

  it('never lets auth, session, reports, exports or a security surface into a cache', () => {
    const leaked = paths.filter((p) => NEVER_CACHED_SHAPED.test(p) && mayStore(get(`${V}${p}`)))
    expect(leaked).toEqual([])
  })

  it('classifies every remaining read as stale-while-revalidate', () => {
    const ordinary = paths.filter((p) => !MONEY_SHAPED.test(p) && !NEVER_CACHED_SHAPED.test(p))
    /* Not a formality: this is what proves the offline-reads phase has anything
       to cache at all. If a later edit widened the money list to everything,
       every money test above would still pass and this one would not. */
    expect(ordinary.length).toBeGreaterThan(60)
    expect(ordinary.filter((p) => get(`${V}${p}`) !== 'read')).toEqual([])
  })
})

/* ─────────────────────────── the rules themselves ────────────────────── */

describe('classify', () => {
  it('treats a non-API same-origin GET as shell', () => {
    expect(get('/index.html')).toBe('shell')
    expect(get('/assets/index-a1b2c3.js')).toBe('shell')
    expect(get('/assets/inter-latin-400.woff2')).toBe('shell')
    expect(get('/icons/icon-512.png')).toBe('shell')
    expect(get('/management/overview')).toBe('shell')
  })

  it('never caches the kill switch — a cached kill switch is not a kill switch', () => {
    expect(get(KILL_SWITCH_PATH)).toBe('no-store')
    expect(mayStore(get(KILL_SWITCH_PATH))).toBe(false)
  })

  it('fails closed on every non-GET, because P3 has not been built', () => {
    for (const method of ['POST', 'PATCH', 'PUT', 'DELETE', 'post']) {
      expect(classify({ pathname: `${V}/drivers`, method, sameOrigin: true })).toBe('no-store')
    }
  })

  it('fails closed cross-origin', () => {
    expect(classify({ pathname: '/anything.js', method: 'GET', sameOrigin: false })).toBe('no-store')
  })

  it('fails closed on a malformed API path', () => {
    expect(get('/api/')).toBe('no-store')
    expect(get('/api/v1')).toBe('no-store')
    expect(get('/api/v1/')).toBe('no-store')
  })

  it('does not assume the version segment is literally v1', () => {
    expect(get('/api/v2/payouts')).toBe('money')
    expect(get('/api/v2/drivers')).toBe('read')
  })

  it('classifies by resource, not by query string', () => {
    expect(get(`${V}/payouts`)).toBe('money')
    expect(get(`${V}/payouts/PAY-1`)).toBe('money')
    expect(get(`${V}/payouts/facets`)).toBe('money')
    expect(get(`${V}/drivers`)).toBe('read')
    expect(get(`${V}/drivers/DRV-1`)).toBe('read')
  })

  it('is not fooled by a money word inside another segment', () => {
    /* `/api/v1/drivers/payouts-summary` would be a drivers endpoint. Only the
       resource segment decides, so this is `read` — and it is asserted so that
       a future substring match cannot be introduced silently. */
    expect(get(`${V}/drivers/payouts-summary`)).toBe('read')
  })

  it('mayStore is true for exactly the two cacheable classes', () => {
    expect(mayStore('shell')).toBe(true)
    expect(mayStore('read')).toBe(true)
    expect(mayStore('money')).toBe(false)
    expect(mayStore('no-store')).toBe(false)
  })
})

describe('apiSegment', () => {
  it('reads the resource segment', () => {
    expect(apiSegment('/api/v1/payouts/PAY-1')).toBe('payouts')
    expect(apiSegment('/api/v1/cash-reports')).toBe('cash-reports')
  })

  it('returns null when there is no resource', () => {
    expect(apiSegment('/api/v1')).toBeNull()
    expect(apiSegment('/api')).toBeNull()
    expect(apiSegment('/')).toBeNull()
  })
})

describe('the invariant, stated as a test', () => {
  /**
   * The one sentence the whole layer is answerable to:
   *
   *   *"A cached figure is never rendered as if it were live. If you cannot show
   *   the staleness, you may not serve the cache."*
   *
   * No staleness surface ships in P1 or P2, so **no money response may be
   * storable, under any input**. This walks the space rather than a sample.
   */
  it('has no input at all for which a money resource becomes storable', () => {
    const moneySegments = [
      'payouts', 'wallets', 'escrow', 'ledger', 'postings', 'credit-notes',
      'captain-debts', 'deductions', 'refunds', 'payments', 'cash-reports',
      'invoice-sequence', 'vat-config', 'gateways', 'rate-cards', 'plans',
      'subscriptions', 'surge-windows', 'surge-suspensions', 'cancellation-rules',
      'quick-ride-types', 'metrics', 'dashboards',
    ]
    const suffixes = ['', '/', '/ID-1', '/facets', '/ID-1/adjust', '/live']
    const methods = ['GET', 'POST', 'HEAD']
    for (const segment of moneySegments) {
      for (const suffix of suffixes) {
        for (const method of methods) {
          const url = new URL(`${V}/${segment}${suffix}?page=2&q=x`, ORIGIN)
          const result = classify({ pathname: url.pathname, method, sameOrigin: true })
          expect(mayStore(result), `${method} ${url.pathname}`).toBe(false)
        }
      }
    }
  })
})
