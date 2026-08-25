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
 */

import { useCallback, useEffect, useRef, useState } from 'react'

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
  const { deps = [], isEmpty = defaultIsEmpty as (data: T) => boolean, enabled = true } = options

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

  const refetch = useCallback(() => {
    setReloadToken((token) => token + 1)
  }, [])

  useEffect(() => {
    if (!enabled) {
      setState({ status: 'loading', data: null, error: null, isRefreshing: false })
      return
    }

    const runId = ++runIdRef.current
    const controller = new AbortController()

    setState((previous) => ({
      status: 'loading',
      data: null,
      error: null,
      // A refetch with rows already on screen is a refresh, not a first load.
      isRefreshing: previous.status === 'content' || previous.status === 'empty',
    }))

    runRef
      .current(controller.signal)
      .then((data) => {
        if (runId !== runIdRef.current || controller.signal.aborted) return
        setState({
          status: isEmptyRef.current(data) ? 'empty' : 'content',
          data,
          error: null,
          isRefreshing: false,
        })
      })
      .catch((thrown: unknown) => {
        if (runId !== runIdRef.current || controller.signal.aborted) return
        setState({ status: 'error', data: null, error: toError(thrown), isRefreshing: false })
      })

    return () => {
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `deps` is the caller's dependency array by design.
  }, [enabled, reloadToken, ...deps])

  return { ...state, refetch }
}
