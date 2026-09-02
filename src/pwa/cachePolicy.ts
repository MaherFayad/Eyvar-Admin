/**
 * **The caching policy, as one pure function.**
 *
 * `docs/ref/pwa.md` states the policy as a five-row table. This file is that
 * table, executable, and it is the only place in the PWA layer that decides
 * whether a response may be stored. The service worker switches on the result;
 * it never pattern-matches a URL itself.
 *
 * | Class      | Policy                                                          |
 * |------------|-----------------------------------------------------------------|
 * | `shell`    | precache, cache-first, versioned                                 |
 * | `read`     | stale-while-revalidate, **and the staleness is broadcast**       |
 * | `money`    | network-first — and see below, which today means network-only    |
 * | `no-store` | never cached, never intercepted                                  |
 *
 * ## Why this is a pure function in its own file
 *
 * Everything else in `src/pwa/` needs a service worker global to run, which
 * means it cannot be unit-tested in jsdom. The one decision that can lose money
 * — *is this response allowed into a cache?* — is therefore separated from the
 * machinery that acts on it, so `cachePolicy.test.ts` can walk the **whole**
 * endpoint list from `src/data/clients/` and assert the classification of every
 * path in the product. A regex buried in a `fetch` handler could not be checked
 * that way, and this is the check that matters.
 *
 * ## The money rule, stated exactly
 *
 * `docs/ref/pwa.md`: *"Money figures, balances, payout state: **network-first**.
 * A stale halala is worse than a spinner"*, and *"A cached figure is never
 * rendered as if it were live. If you cannot show the staleness, you may not
 * serve the cache."*
 *
 * Those two sentences together decide the implementation. Network-first's
 * fallback leg is *serve the cache when the network fails* — which is only
 * permitted once a surface exists that renders the staleness. **No such surface
 * ships in P1 or P2** (the shell banner is specced and handed to the
 * product-designer; see the handoff in the report). So money is classified
 * `money`, and `money` means **the worker does not intercept at all**: the
 * request goes to the network, and if the network is down the data layer throws
 * its ordinary `network` `ApiError` and the screen shows its error state.
 *
 * That is deliberately *stricter* than network-first, and it is stricter in the
 * one direction the policy says to err in. It is also stricter **by
 * construction rather than by discipline**: there is no branch in the worker
 * that can write a money response to a cache, so "no money figure was served
 * from cache" is not a thing anyone has to remember — it is a thing the code
 * cannot do. Enabling the fallback leg later is a real change to this file plus
 * a real staleness surface, which is the correct price for it.
 *
 * ## The edge headers, which this file does not control
 *
 * `vercel.json` sets four `Cache-Control` rules at the CDN. They are stated
 * here because JSON carries no comments and the reasoning belongs with the
 * policy:
 *
 *   `/pwa-kill-switch.json`  `no-store, max-age=0`
 *       **The kill switch must not be cacheable.** A kill switch behind a CDN
 *       cache is a kill switch that takes an hour to arrive, which on the day
 *       it is needed is the same as not having one. See `killSwitch.ts`.
 *
 *   `/sw.js`  `no-cache`
 *       The worker script itself. A stale `sw.js` is a stale cache policy, and
 *       the browser only re-checks it on navigation. Revalidate every time
 *       rather than `no-store`, so an unchanged worker costs a 304 and not a
 *       full download.
 *
 *   `/manifest.webmanifest`  `no-cache`
 *       Changes with the build and is small. Revalidate rather than pin.
 *
 *   `/assets/(.*)`  `public, max-age=31536000, immutable`
 *       Content-hashed filenames are immutable by construction, so this is the
 *       one place a year-long `max-age` is honest. The worker precaches them
 *       anyway; this is for the first visit and for anyone who never installs.
 *
 * ## How to change a classification
 *
 * Move the prefix between the two lists below and the test tells you what else
 * moved. **Never add a rule at the `fetch` handler.** One table, one place.
 */

/* The one path this policy exempts by name. Declared in `protocol.ts` with the
   other strings the page and the worker have to spell identically, and
   re-exported here so a reader of the policy does not have to open a second
   file to see what it excludes. */
import { KILL_SWITCH_PATH } from './protocol'
export { KILL_SWITCH_PATH }

/** What may be done with a response. */
export type CacheClass =
  /** App shell, fonts, icons: precached at install, served cache-first. */
  | 'shell'
  /** Index and detail reads: stale-while-revalidate, staleness broadcast. */
  | 'read'
  /** Money, balances, payout state: not intercepted. See the file header. */
  | 'money'
  /** Auth, session, reports, exports, secrets: not intercepted, never stored. */
  | 'no-store'

/** The prefix `http.ts` puts in front of every client path (`buildUrl`). */
export const API_PREFIX = '/api/'

/**
 * First path segment after `/api/<version>/` for every endpoint that carries a
 * monetary amount, a balance, a settlement state, or the pricing that produces
 * one. Collected by walking every `http.*()` call in `src/data/clients/`.
 *
 * The judgement calls, named so a reviewer can overrule them rather than
 * discover them:
 *
 *   `plans`, `subscriptions`, `rate-cards`, `surge-windows`,
 *   `surge-suspensions`, `cancellation-rules`, `quick-ride-types`
 *       Pricing configuration. Not a balance, but every one of them renders a
 *       SAR figure, and a stale price is the same defect as a stale balance.
 *
 *   `metrics`, `dashboards`
 *       The overview tiles. They mix operational counts with revenue, and the
 *       endpoint cannot tell us which a given board asked for. A tile reading
 *       yesterday's GMV under today's date is exactly the failure the policy
 *       names, so the whole family is treated as money. **This is the single
 *       most expensive line here for offline usefulness**, and it is the one to
 *       revisit first once the staleness surface exists.
 *
 *   `gateways`, `vat-config`, `invoice-sequence`
 *       Settlement configuration. Wrong here means money routed wrongly.
 */
const MONEY_SEGMENTS: ReadonlySet<string> = new Set([
  'captain-debts',
  'cash-reports',
  'credit-notes',
  'dashboards',
  'deductions',
  'escrow',
  'gateways',
  'invoice-sequence',
  'ledger',
  'metrics',
  'payments',
  'payouts',
  'postings',
  'refunds',
  'wallets',
  /* pricing — see the note above */
  'cancellation-rules',
  'plans',
  'quick-ride-types',
  'rate-cards',
  'subscriptions',
  'surge-suspensions',
  'surge-windows',
  /* Settlement configuration. The doc block above already named these three as
     money and the set had only two of them, so `/vat-config` was classified
     cacheable while the comment said it was not - a stale VAT rate computes a
     wrong figure just as surely as a stale balance does. Found by the policy's
     own sweep over every endpoint in the product, which is what that test is
     for. */
  'vat-config',
])

/**
 * Endpoints that must never touch a cache at all.
 *
 *   `auth`, `session`, `me`
 *       The policy's own row. A cached session is a cached identity, and an
 *       identity served after a sign-out is a security defect, not a stale read.
 *       `me/*` covers preferences, devices and UI state — per-operator, and
 *       cheap enough that caching buys nothing.
 *
 *   `reports`
 *       The policy's other row: reports and exports are never cached. Covers
 *       `/reports`, `/reports/run` and `/reports/export`.
 *
 *   `presence`, `security-policy`, `team`, `team-users`, `integrations`
 *       Security surfaces. `integrations/api-keys` returns key material;
 *       `team/*` returns permissions and device trust. Serving any of those
 *       from a cache after a revocation is the same class of defect as a cached
 *       session. Not named by the policy table, classified with it deliberately.
 *
 *   `search`
 *       The command palette. A cached answer to a *different* query is the only
 *       thing worse than a slow one; the key would be right but the surface
 *       treats the result as live by construction.
 */
const NO_STORE_SEGMENTS: ReadonlySet<string> = new Set([
  'auth',
  'integrations',
  'me',
  'presence',
  'push',
  'reports',
  'search',
  'security-policy',
  'session',
  'team',
  'team-users',
])

export interface ClassifyInput {
  /** `URL.pathname`. */
  pathname: string
  /** HTTP method, any case. */
  method: string
  /** Is the request for this worker's own origin? */
  sameOrigin: boolean
}

/**
 * The whole policy.
 *
 * Everything fails **closed**: an unrecognised request, a cross-origin request
 * and any non-`GET` are `no-store`. A new endpoint therefore arrives uncached
 * and someone has to choose to cache it, rather than arriving cached and
 * someone having to notice.
 */
export function classify({ pathname, method, sameOrigin }: ClassifyInput): CacheClass {
  /* A mutation is P3's problem and P3 has not been built. Until the idempotency
     question (`docs/07-api/OPEN-QUESTIONS.md` Q3) is answered, no non-GET is
     stored, replayed or intercepted in any way. */
  if (method.toUpperCase() !== 'GET') return 'no-store'

  /* Cross-origin is somebody else's cache-control header to honour. The one
     third-party we could plausibly want (a font CDN) is not used — every font
     is self-hosted through `@fontsource-variable`, so it arrives as `shell`. */
  if (!sameOrigin) return 'no-store'

  if (pathname === KILL_SWITCH_PATH) return 'no-store'

  if (!pathname.startsWith(API_PREFIX)) return 'shell'

  const segment = apiSegment(pathname)
  if (segment === null) return 'no-store'
  if (NO_STORE_SEGMENTS.has(segment)) return 'no-store'
  if (MONEY_SEGMENTS.has(segment)) return 'money'
  return 'read'
}

/**
 * `/api/v1/payouts/PAY-1?page=2` → `'payouts'`.
 *
 * `null` when the path is `/api/` with nothing useful after it — which is not a
 * real endpoint, and `classify` turns it into `no-store` rather than guessing.
 */
export function apiSegment(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean)
  /* ['api', 'v1', 'payouts', ...] — the version segment is `API_VERSION` from
     `src/data/config.ts` and is not assumed to be literally `v1`. */
  const segment = parts[2]
  return segment === undefined || segment === '' ? null : segment
}

/** True when a response of this class may be written to a cache. */
export function mayStore(cacheClass: CacheClass): boolean {
  return cacheClass === 'shell' || cacheClass === 'read'
}
