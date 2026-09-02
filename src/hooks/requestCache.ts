/**
 * A keyed, in-memory, stale-while-revalidate store for `useAsync`.
 *
 * `OPERATOR-EXPERIENCE-PLAN.md` §0.3 finding 11 and task **P1-T3** — *"No request
 * cache. Every mount refetches. Pricing and Ledger each fire 9 concurrent reads at
 * 320 ms mock latency."* A round-trip into a detail screen and back re-pays the
 * full cost of the list, every time, on twenty index screens.
 *
 * ## What this is not
 *
 * It is **not** a data layer. It holds whatever `useAsync` resolved, keyed by a
 * string the caller supplied; it does not know about `fetch`, fixtures or
 * `DATA_SOURCE`. That seam stays mock-data-engineer's.
 *
 * It is **not** a request deduplicator. Two components mounting the same key at
 * the same time still fire two requests. Sharing one in-flight promise would mean
 * sharing one `AbortSignal`, and then the first component to unmount cancels the
 * second one's read — a worse bug than a duplicate request, and finding 11 is
 * about *nine different* operations per screen, not nine copies of one.
 *
 * It **never holds an error**. See `useAsync`: a failed read deletes its entry, so
 * the next attempt is a real attempt. Failure injection (`mockFailures`,
 * `?mockFail=`) has to reach the error state on every try or AC-24/AC-36 become
 * untestable.
 */

/**
 * How long an entry may be *shown* before it is dropped in favour of a skeleton.
 *
 * `useAsync` revalidates in the background on every mount regardless, so this is
 * not "how long we trust the data" — it is "how old may the rows on screen be
 * during the ~320 ms before the revalidation lands".
 *
 * Ten seconds covers the case finding 11 names: open a row, read the header,
 * press Back. That round trip is single-digit seconds. An entry older than that
 * belongs to a different sitting, and in an operations console a board that is
 * tens of seconds stale is a correctness problem, not a convenience — so past the
 * TTL the operator gets an honest skeleton instead of a flash of yesterday.
 */
export const REQUEST_CACHE_TTL_MS = 10_000

/**
 * Upper bound on entries. 34 sub-tabs times a handful of filter combinations each
 * sits well under this; the cap only exists so an operator who pages through
 * 4 000 trips does not grow the map without limit. Oldest-inserted goes first,
 * which `Map` gives us for free.
 */
const MAX_ENTRIES = 200

interface CacheEntry {
  data: unknown
  storedAt: number
}

/** What a hit looks like. Wrapped, so a cached `undefined` is still a hit. */
export interface CacheHit<T> {
  data: T
  ageMs: number
}

const entries = new Map<string, CacheEntry>()

let enabled = true

/**
 * The off switch. A test that wants to prove the un-cached path, or a devtool
 * that wants to measure cold latency, turns it off. Off means every read misses
 * and every write is dropped — never a half-warm state.
 */
export function setRequestCacheEnabled(next: boolean): void {
  enabled = next
  if (!next) entries.clear()
}

export function isRequestCacheEnabled(): boolean {
  return enabled
}

/**
 * Fresh entry, or `null`. Expired entries are evicted on read rather than swept,
 * because the only thing that ever looks at a key is the mount that wants it.
 */
export function readCache<T>(key: string, now: number = Date.now()): CacheHit<T> | null {
  if (!enabled) return null
  const entry = entries.get(key)
  if (!entry) return null
  const ageMs = now - entry.storedAt
  if (ageMs >= REQUEST_CACHE_TTL_MS) {
    entries.delete(key)
    return null
  }
  return { data: entry.data as T, ageMs }
}

/** Store a **successful, un-aborted** result. Callers must not call this on failure. */
export function writeCache(key: string, data: unknown, now: number = Date.now()): void {
  if (!enabled) return
  // Re-insert rather than update, so a refreshed entry moves to the young end of
  // the eviction order.
  entries.delete(key)
  entries.set(key, { data, storedAt: now })
  while (entries.size > MAX_ENTRIES) {
    const oldest = entries.keys().next()
    if (oldest.done) break
    entries.delete(oldest.value)
  }
}

/**
 * Drop everything whose key starts with `prefix`. This is what a mutation calls.
 *
 * Keys are `"<operation>::<deps>"` and operation ids are dotted
 * (`'drivers.list'`), so the useful prefixes fall out of the naming already in
 * `src/data/config.ts`:
 *
 * ```
 * invalidate('drivers.list')   every page and filter combination of one list
 * invalidate('drivers.')       every read of the drivers resource
 * invalidate()                 everything — for a sign-out or an actor change
 * ```
 *
 * Nothing in this repo calls it yet; screens adopt it as they gain mutations.
 * Deliberately imperative and module-level: a mutation is not a React render, and
 * routing invalidation through a context would make every writer take a hook.
 */
export function invalidate(prefix?: string): void {
  if (prefix === undefined) {
    entries.clear()
    return
  }
  for (const key of entries.keys()) {
    if (key.startsWith(prefix)) entries.delete(key)
  }
}

/**
 * Drop one exact key. What `useAsync` calls when a read fails: an entry we have
 * just proved we cannot confirm should not be painted on the next mount.
 *
 * Separate from `invalidate` on purpose — a full key is a *prefix* of a longer
 * one (`'trips.list::[n:1]'` of `'trips.list::[n:11]'`), so prefix semantics
 * would quietly over-delete here.
 */
export function deleteCache(key: string): void {
  entries.delete(key)
}

/**
 * Full reset — contents **and** the enabled flag. Wired into `src/test/setup.ts`'s
 * `beforeEach` next to `resetDataLayer()`. A cache that leaks between tests turns
 * one broken test into three mysterious ones in another file.
 */
export function resetRequestCache(): void {
  entries.clear()
  enabled = true
}

/** Entry count. For tests and a future QA panel; not part of the read path. */
export function requestCacheSize(): number {
  return entries.size
}

/* ─────────────────────────── key material ──────────────────────────── */

/**
 * `null` from a serialiser means **this value cannot be keyed honestly**, which
 * propagates all the way out to "do not cache". Never a guess, never a fallback
 * string — two different values sharing a key is the one failure this module must
 * not have.
 */
const UNCACHEABLE = null

const MAX_DEPTH = 6

function isPlainObject(value: object): boolean {
  const proto = Object.getPrototypeOf(value) as object | null
  return proto === Object.prototype || proto === null
}

/** Commas and backslashes are structural in the output, so strings escape them. */
function escapeString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/,/g, '\\,')
}

function serialize(value: unknown, depth: number): string | typeof UNCACHEABLE {
  if (depth > MAX_DEPTH) return UNCACHEABLE
  if (value === null) return 'null'
  switch (typeof value) {
    case 'undefined':
      return 'undef'
    case 'string':
      return `s:${escapeString(value)}`
    case 'number':
      // `Object.is(NaN, NaN)` is true, which is how React compares deps, so a NaN
      // dep is stable and keyable.
      return `n:${Number.isNaN(value) ? 'NaN' : String(value)}`
    case 'boolean':
      return `b:${String(value)}`
    case 'bigint':
      return `g:${String(value)}`
    // A function has no stable identity across renders, and a symbol has no
    // stable text. Either one means the key would be a lie.
    case 'function':
    case 'symbol':
      return UNCACHEABLE
  }

  const object = value as object
  if (Array.isArray(object)) {
    const parts: string[] = []
    for (const item of object) {
      const part = serialize(item, depth + 1)
      if (part === UNCACHEABLE) return UNCACHEABLE
      parts.push(part)
    }
    return `[${parts.join(',')}]`
  }
  if (object instanceof Date) {
    const time = object.getTime()
    return `d:${Number.isNaN(time) ? 'Invalid' : String(time)}`
  }
  // A `Map`, a `Set`, a class instance, a `URLSearchParams`: keyable only by
  // guessing at its internals. Refuse instead.
  if (!isPlainObject(object)) return UNCACHEABLE

  const record = object as Record<string, unknown>
  // Sorted, so `{ page, q }` and `{ q, page }` are the same request.
  const keys = Object.keys(record).sort()
  const parts: string[] = []
  for (const key of keys) {
    const part = serialize(record[key], depth + 1)
    if (part === UNCACHEABLE) return UNCACHEABLE
    parts.push(`${escapeString(key)}:${part}`)
  }
  return `{${parts.join(',')}}`
}

/**
 * The key, or `null` for "do not cache".
 *
 * ## The key scheme, and the failure mode it accepts
 *
 * `useAsync` takes a fetcher closure, and a closure has no stable identity — two
 * renders produce two different functions for the same request, and two different
 * requests can produce structurally identical functions. So the closure cannot
 * contribute to the key at all. That leaves two honest inputs:
 *
 *   1. `cacheKey` — an operation id the caller supplies, e.g. `'drivers.list'`.
 *      The ids in `src/data/config.ts`'s failure registry are exactly the right
 *      granularity and already exist.
 *   2. `deps` — the caller's dependency array, serialised structurally.
 *
 * **Accepted failure mode:** if a caller passes `cacheKey: 'drivers.list'` but
 * closes over a parameter that is *not* in `deps`, two genuinely different
 * requests collide on one key and the wrong rows are served. This is precisely
 * the existing consequence of an incomplete `useEffect` dependency array — the
 * request would already fail to re-run when that parameter changed — so it adds
 * no new class of mistake, only a second symptom of an old one.
 *
 * Everything else fails closed: no `cacheKey` means no caching (today's exact
 * behaviour, which is what the ~40 existing call sites get), and a dep that
 * cannot be serialised honestly means no caching either.
 */
export function requestCacheKey(cacheKey: string, deps: readonly unknown[]): string | null {
  if (!cacheKey) return null
  const serialized = serialize(deps as unknown[], 0)
  if (serialized === UNCACHEABLE) return null
  return `${cacheKey}::${serialized}`
}
