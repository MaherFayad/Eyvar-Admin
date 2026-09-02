/**
 * The names the page and the worker have to agree on: cache prefixes, message
 * types, storage keys, the escape-hatch query parameter.
 *
 * One file, imported by both sides, because every one of these is a string that
 * is only correct if it is spelled identically in two places that never see
 * each other at runtime. A typo in a cache name leaks a cache that nothing ever
 * deletes; a typo in a message type turns the staleness signal off silently.
 */

/**
 * Cache-name prefix. **Every** cache this app creates starts with it, and
 * `activate` deletes anything under it that is not the current version — so the
 * app can only ever leak storage it can also find.
 */
export const CACHE_PREFIX = 'eyvar-pwa'

/** `eyvar-pwa:<version>:shell` — the precache. */
export function shellCacheName(version: string): string {
  return `${CACHE_PREFIX}:${version}:shell`
}

/**
 * `eyvar-pwa:<version>:read` — the stale-while-revalidate store for index and
 * detail reads.
 *
 * Versioned with the shell rather than kept across deploys, because the shape
 * of a response is part of the build: a new frontend reading an old cached
 * envelope is a class of bug with no symptom until it renders. A deploy costs
 * one cold read per screen, which is the right trade.
 */
export function readCacheName(version: string): string {
  return `${CACHE_PREFIX}:${version}:read`
}

/**
 * The kill switch's own file. Fetched by the worker with `cache: 'no-store'`,
 * excluded from the precache glob at build time, and classified `no-store` at
 * runtime — a kill switch that can itself be cached is not a kill switch.
 */
export const KILL_SWITCH_PATH = '/pwa-kill-switch.json'

/* ─────────────────────────── worker → page ─────────────────────────── */

/**
 * Sent every time the worker answers a `read` request out of the cache, and
 * again when the background revalidation lands. This is the whole mechanism
 * behind *"a cached figure is never rendered as if it were live"*: the page
 * cannot mistake cached data for live data, because the worker tells it.
 */
export const MSG_SERVED_FROM_CACHE = 'eyvar-pwa/served-from-cache'
export const MSG_REVALIDATED = 'eyvar-pwa/revalidated'
/** The worker has disabled itself and unregistered. The page should reload. */
export const MSG_KILLED = 'eyvar-pwa/killed'

export interface ServedFromCacheMessage {
  type: typeof MSG_SERVED_FROM_CACHE
  /** Path only — a full URL would leak query parameters into a log. */
  path: string
  /** When the entry was written, ISO 8601. */
  cachedAt: string
  /** How old it was at the moment it was served, in milliseconds. */
  ageMs: number
}

export interface RevalidatedMessage {
  type: typeof MSG_REVALIDATED
  path: string
}

export interface KilledMessage {
  type: typeof MSG_KILLED
  reason: string
}

export type WorkerMessage = ServedFromCacheMessage | RevalidatedMessage | KilledMessage

/* ─────────────────────────── page → worker ─────────────────────────── */

/** Take over from the waiting state. Sent when the operator asks to update. */
export const MSG_SKIP_WAITING = 'eyvar-pwa/skip-waiting'
/** Check the kill file now, rather than at the next throttled interval. */
export const MSG_CHECK_KILL_SWITCH = 'eyvar-pwa/check-kill-switch'

/* ───────────────────────────── headers ─────────────────────────────── */

/**
 * Stamped on every entry the worker writes, so age is computed from when *we*
 * stored it rather than from a `Date` header a proxy may have rewritten.
 */
export const HEADER_CACHED_AT = 'x-eyvar-cached-at'
/** Stamped on a response as it is served from the cache, never on a stored copy. */
export const HEADER_FROM_CACHE = 'x-eyvar-from-cache'

/* ────────────────────── the client escape hatch ────────────────────── */

/**
 * `?pwa=off` — the hatch that works when nothing else does.
 *
 * A service worker is a cache you cannot easily un-ship: a bad one serves a
 * broken app from its own cache, and the operator cannot get past it by
 * reloading, because the reload is answered by the broken worker. So the hatch
 * is honoured in **three** places, deliberately redundant:
 *
 *   1. `register.ts`, before it registers anything, on any page load.
 *   2. The worker's `fetch` handler, on any navigation carrying it — so it
 *      works even when the page's own JavaScript is the thing that is broken.
 *   3. The remote kill file, for the case where nobody can reach the operator
 *      to tell them to type a query parameter.
 *
 * Persisted to `localStorage` once used, so the operator does not have to keep
 * the parameter in the URL for the rest of the shift.
 */
export const DISABLE_QUERY_PARAM = 'pwa'
export const DISABLE_QUERY_VALUE = 'off'
export const DISABLE_STORAGE_KEY = 'eyvar.pwa.disabled'
/** `?pwa=on` clears the sticky flag. Symmetry, so the hatch is not a one-way door. */
export const ENABLE_QUERY_VALUE = 'on'
