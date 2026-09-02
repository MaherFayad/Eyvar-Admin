/**
 * **What is on screen that came out of a cache, and how old it is.**
 *
 * This module exists to make one rule enforceable rather than aspirational:
 *
 * > `docs/ref/pwa.md` — *"A cached figure is never rendered as if it were live.
 * > If you cannot show the staleness, you may not serve the cache."*
 *
 * The page cannot tell a cached response from a live one — by the time it
 * reaches `http.ts` it is a `Response` like any other, and by the time it
 * reaches a screen it is parsed JSON with no provenance at all. The **worker**
 * knows, because the worker decided. So the worker says so (`MSG_SERVED_FROM_CACHE`),
 * this store records it, and `useDataFreshness()` hands it to whatever renders
 * the *as-of* line.
 *
 * ## Which half of the rule this is
 *
 * The rule has two halves and they are enforced in two places:
 *
 *   - *"you may not serve the cache"* is enforced in `cachePolicy.ts`, by
 *     classification. Money is never written to a cache at all, so the question
 *     of whether its staleness is shown cannot arise.
 *   - *"never rendered as if it were live"* is enforced here, for the index and
 *     detail reads that **are** cached, by making the fact available to the UI.
 *
 * The second half needs a surface to be complete, and the surface is a shell
 * banner — which belongs to the product-designer, not to this layer
 * (`docs/ref/pwa.md`: *"If offline needs a banner, spec it and hand it to the
 * product-designer"*). The mechanism ships here, tested, with a hook the banner
 * consumes in one line. Until it lands, nothing renders an *as-of* stamp — and
 * nothing renders a stale money figure either, which is the half that could
 * cost money.
 *
 * ## Why paths, not operation ids
 *
 * The worker sees URLs. `useAsync`'s `cacheKey` is an operation id
 * (`'drivers.list'`). Mapping between them is data-layer knowledge that lives in
 * `src/data/clients/`, and the PWA layer does not get to invent a second copy of
 * it. So this store is keyed by path, and the aggregate view — *"something on
 * this screen is stale, and the oldest piece is from 09:14"* — is what a shell
 * banner needs anyway. Per-read attribution is available through
 * `readFreshness(path)` for whoever wants it later.
 */

import { useCallback, useSyncExternalStore } from 'react'
import { createStore } from './store'
import {
  MSG_REVALIDATED,
  MSG_SERVED_FROM_CACHE,
  type WorkerMessage,
} from './protocol'

export interface ReadFreshness {
  /** ISO 8601, when the worker stored the entry. */
  cachedAt: string
  /** Age at the moment it was served. Not live — it does not tick. */
  ageMs: number
}

export interface Freshness {
  /** Is anything currently on screen known to have come from a cache? */
  isStale: boolean
  /** The oldest such entry, ISO 8601, or `null`. The *as-of* a banner states. */
  oldestCachedAt: string | null
  /** Paths served from cache and not yet revalidated. Sorted, for a stable render. */
  stalePaths: readonly string[]
}

const EMPTY: Freshness = { isStale: false, oldestCachedAt: null, stalePaths: [] }

const entries = new Map<string, ReadFreshness>()
const store = createStore<Freshness>(EMPTY)

function recompute(): void {
  if (entries.size === 0) {
    store.set(EMPTY)
    return
  }
  let oldest: string | null = null
  for (const { cachedAt } of entries.values()) {
    if (oldest === null || cachedAt < oldest) oldest = cachedAt
  }
  store.set({
    isStale: true,
    oldestCachedAt: oldest,
    /* Sorted so the snapshot is deterministic: a banner listing paths must not
       reorder itself because a Map's insertion order changed. */
    stalePaths: [...entries.keys()].sort(),
  })
}

/**
 * Record that `path` was answered from the cache.
 *
 * Exported for the message handler and for tests. Nothing else should call it —
 * a screen marking its own data stale would be a second source of truth for the
 * one fact this module exists to hold honestly.
 */
export function markServedFromCache(path: string, freshness: ReadFreshness): void {
  entries.set(path, freshness)
  recompute()
}

/** Record that the background revalidation for `path` landed. It is live again. */
export function markRevalidated(path: string): void {
  if (!entries.delete(path)) return
  recompute()
}

/** Per-path detail, for a caller that wants to stamp one figure rather than the page. */
export function readFreshness(path: string): ReadFreshness | null {
  return entries.get(path) ?? null
}

/** Test seam, and what a sign-out would call. */
export function resetFreshness(): void {
  entries.clear()
  store.set(EMPTY)
}

/**
 * Apply a worker message. Returns whether it was one this module handles, so
 * `register.ts` can pass every message through without knowing the protocol.
 */
export function applyWorkerMessage(message: WorkerMessage): boolean {
  if (message.type === MSG_SERVED_FROM_CACHE) {
    markServedFromCache(message.path, { cachedAt: message.cachedAt, ageMs: message.ageMs })
    return true
  }
  if (message.type === MSG_REVALIDATED) {
    markRevalidated(message.path)
    return true
  }
  return false
}

/**
 * What a banner reads.
 *
 * `getServerSnapshot` returns the empty value: a server render has no worker and
 * no cache, and rendering *"you are looking at old data"* into static HTML is
 * the one wrong answer — the same reasoning `useOnline` gives for returning
 * `true` on the server.
 */
export function useDataFreshness(): Freshness {
  const getServerSnapshot = useCallback(() => EMPTY, [])
  return useSyncExternalStore(store.subscribe, store.get, getServerSnapshot)
}
