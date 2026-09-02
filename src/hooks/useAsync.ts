/**
 * The hook that gives a screen its four states.
 *
 * `DESIGN.md` §5 and the team brief's rule 3 — *"Four states per screen: content,
 * empty, loading, error. A PR with only the happy path is not done."* That is a
 * discipline for as long as each screen decides for itself what "empty" means.
 * Here it is a return value: `status` is one of exactly four strings, every
 * caller has to handle all four, and `empty` is determined the same way on all
 * 34 sub-tabs.
 *
 * Transport-agnostic by contract. It takes a promise-returning function and an
 * `AbortSignal`; it does not know about `fetch`, `DATA_SOURCE`, or fixtures.
 * That seam is mock-data-engineer's (`src/data/clients/*`) and stays theirs.
 *
 * It also does not distinguish `no-match` from `first-run` empty (**AC-37** vs
 * **AC-38**). That difference is "are there filters applied", which the table
 * knows and the request does not — `useIndexTable` exposes `isFiltered` for it.
 *
 * ## Caching (P1-T3)
 *
 * Opt in with `cacheKey`. Without it nothing is cached and the hook behaves
 * exactly as it always has — which is what the ~40 existing call sites get. With
 * it, a warm mount paints content immediately and revalidates behind
 * `isRefreshing`; a cold mount still shows the skeleton. See `requestCache.ts`
 * for the key scheme, the TTL and the invalidation API.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { deleteCache, readCache, requestCacheKey, writeCache } from './requestCache'

export type AsyncStatus = 'loading' | 'error' | 'empty' | 'content'

export interface AsyncResult<T> {
  /** Exactly four values. Screens switch on this and handle all of them. */
  status: AsyncStatus
  /** `null` while loading and on error, so a stale row set cannot render under an error state. */
  data: T | null
  /** Normalised to an `Error`; `isApiError(error)` narrows it to the data layer's `ApiError`. */
  error: Error | null
  /** True during a `refetch` that already has data on screen. Drives a subtle bar, never a skeleton. */
  isRefreshing: boolean
  /** What the error state's action calls. Re-runs the same request. */
  refetch: () => void
}

export interface UseAsyncOptions<T> {
  /**
   * Re-run when any of these change — the query params, the record id, the acting
   * user. Compared shallowly, like a dependency array, because that is what it is.
   */
  deps?: readonly unknown[]
  /**
   * Decides `empty` from `content`. The default covers the two shapes the data
   * layer returns: an array, and a `Paginated<T>` envelope (`total === 0`).
   * Override for a resource whose emptiness is a domain question.
   */
  isEmpty?: (data: T) => boolean
  /** `false` holds the hook in `loading` without firing a request. For a dependent read. */
  enabled?: boolean
  /**
   * Opt in to the stale-while-revalidate cache. **Omit it and nothing is cached**
   * — that is the safe default, and it is what every call site written before
   * P1-T3 gets.
   *
   * Pass the data-layer operation id the fetcher calls: `'drivers.list'`,
   * `'pricing.rules'`. The full key is that id plus a structural serialisation of
   * `deps`, so the contract is: **everything the fetcher varies on must be in
   * `deps`.** If it is not, this hook already fails to re-run when it changes;
   * with a `cacheKey` it will also serve the wrong rows. `requestCacheKey` in
   * `requestCache.ts` states that failure mode in full.
   *
   * The hook always revalidates in the background, so a hit is a head start, not
   * a substitute for the request.
   */
  cacheKey?: string
}

interface PaginatedLike {
  total: number
}

function isPaginatedLike(value: unknown): value is PaginatedLike {
  return typeof value === 'object' && value !== null && typeof (value as PaginatedLike).total === 'number'
}

/** Array is empty, `Paginated` has `total: 0`, `null`/`undefined` is empty. */
export function defaultIsEmpty(data: unknown): boolean {
  if (data === null || data === undefined) return true
  if (Array.isArray(data)) return data.length === 0
  if (isPaginatedLike(data)) return data.total === 0
  return false
}

/** A thrown non-`Error` still has to be renderable. Never swallow, never `any`. */
function toError(thrown: unknown): Error {
  if (thrown instanceof Error) return thrown
  return new Error(typeof thrown === 'string' ? thrown : 'Something went wrong.')
}

interface AsyncState<T> {
  status: AsyncStatus
  data: T | null
  error: Error | null
  isRefreshing: boolean
}

export function useAsync<T>(
  run: (signal: AbortSignal) => Promise<T>,
  options: UseAsyncOptions<T> = {},
): AsyncResult<T> {
  const {
    deps = [],
    isEmpty = defaultIsEmpty as (data: T) => boolean,
    enabled = true,
    cacheKey,
  } = options

  const [state, setState] = useState<AsyncState<T>>({
    status: 'loading',
    data: null,
    error: null,
    isRefreshing: false,
  })

  // Latest-wins. Without this, a slow page 1 resolving after a fast page 2
  // repaints page 1's rows under page 2's pagination — the classic index-table
  // race, and invisible until a reviewer is on a bad connection.
  const runIdRef = useRef(0)
  const runRef = useRef(run)
  runRef.current = run
  const isEmptyRef = useRef(isEmpty)
  isEmptyRef.current = isEmpty

  const [reloadToken, setReloadToken] = useState(0)

  // A `refetch` is someone pressing `Try again` or a refresh control. Serving it
  // from the cache would make the button appear to do nothing, so the next effect
  // run skips the read. Consumed once, by that run.
  const bypassCacheRef = useRef(false)

  const refetch = useCallback(() => {
    bypassCacheRef.current = true
    setReloadToken((token) => token + 1)
  }, [])

  useEffect(() => {
    if (!enabled) {
      setState({ status: 'loading', data: null, error: null, isRefreshing: false })
      return
    }

    const runId = ++runIdRef.current
    const controller = new AbortController()

    // `null` whenever caching is off, opted out of, or cannot be keyed honestly.
    const key = cacheKey === undefined ? null : requestCacheKey(cacheKey, deps)
    const bypassCache = bypassCacheRef.current
    bypassCacheRef.current = false
    const hit = key !== null && !bypassCache ? readCache<T>(key) : null

    if (hit) {
      // Warm: content is on screen this tick, and `isRefreshing` puts the same
      // subtle bar over it that a manual refresh does. Never a skeleton — there
      // is nothing to wait for before painting.
      setState({
        status: isEmptyRef.current(hit.data) ? 'empty' : 'content',
        data: hit.data,
        error: null,
        isRefreshing: true,
      })
    } else {
      // Cold: unchanged from before P1-T3, skeleton included. A first load must
      // never be dressed up as a refresh.
      setState((previous) => ({
        status: 'loading',
        data: null,
        error: null,
        // A refetch with rows already on screen is a refresh, not a first load.
        isRefreshing: previous.status === 'content' || previous.status === 'empty',
      }))
    }

    runRef
      .current(controller.signal)
      .then((data) => {
        // Aborted or superseded: do not write. A response nobody is waiting for
        // may be for a stale set of deps, and caching it would leak it into a
        // later mount as if it were current.
        if (runId !== runIdRef.current || controller.signal.aborted) return
        if (key !== null) writeCache(key, data)
        setState({
          status: isEmptyRef.current(data) ? 'empty' : 'content',
          data,
          error: null,
          isRefreshing: false,
        })
      })
      .catch((thrown: unknown) => {
        if (runId !== runIdRef.current || controller.signal.aborted) return
        // Errors are never cached, and a read that just failed invalidates what
        // it was revalidating: the next mount must make a real attempt and reach
        // the error state again. Failure injection (`mockFailures`, `?mockFail=`)
        // depends on this — AC-24 / AC-36.
        if (key !== null) deleteCache(key)
        setState({ status: 'error', data: null, error: toError(thrown), isRefreshing: false })
      })

    return () => {
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `deps` is the caller's dependency array by design.
  }, [enabled, reloadToken, cacheKey, ...deps])

  return { ...state, refetch }
}
