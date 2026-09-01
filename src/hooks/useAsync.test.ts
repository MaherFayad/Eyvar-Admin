import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { mockFailures } from '@/data/config'
import { ApiError, isApiError } from '@/data/types/common'
import {
  REQUEST_CACHE_TTL_MS,
  invalidate,
  readCache,
  requestCacheSize,
  resetRequestCache,
  setRequestCacheEnabled,
} from './requestCache'
import { defaultIsEmpty, useAsync } from './useAsync'

const paginated = (total: number) => ({ items: [], page: 1, pageSize: 25, total, totalPages: 1 })

describe('the four states', () => {
  it('starts in loading', () => {
    const { result } = renderHook(() => useAsync(() => new Promise<string[]>(() => {})))
    expect(result.current.status).toBe('loading')
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('resolves to content', async () => {
    const { result } = renderHook(() => useAsync(async () => ['a', 'b']))
    await waitFor(() => expect(result.current.status).toBe('content'))
    expect(result.current.data).toEqual(['a', 'b'])
  })

  it('resolves an empty array to empty, not content', async () => {
    const { result } = renderHook(() => useAsync(async () => [] as string[]))
    await waitFor(() => expect(result.current.status).toBe('empty'))
    // The rows are still there — an empty state may need to know it got zero of
    // something rather than nothing at all.
    expect(result.current.data).toEqual([])
  })

  it('resolves a Paginated envelope with total 0 to empty', async () => {
    const { result } = renderHook(() => useAsync(async () => paginated(0)))
    await waitFor(() => expect(result.current.status).toBe('empty'))
  })

  it('resolves a Paginated envelope with rows to content', async () => {
    const { result } = renderHook(() => useAsync(async () => paginated(4218)))
    await waitFor(() => expect(result.current.status).toBe('content'))
  })

  it('rejects to error, and never leaves stale rows under an error state', async () => {
    const { result } = renderHook(() =>
      useAsync(async () => {
        throw new ApiError({ status: 503, message: 'Injected failure' })
      }),
    )
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.data).toBeNull()
    expect(isApiError(result.current.error)).toBe(true)
  })

  it('normalises a thrown non-Error so a screen can always read `.message`', async () => {
    const { result } = renderHook(() =>
      useAsync(async () => {
        throw 'a bare string'
      }),
    )
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toBe('a bare string')
  })

  it('accepts a custom emptiness rule for a domain that needs one', async () => {
    const { result } = renderHook(() =>
      useAsync(async () => ({ balance: 0 }), { isEmpty: (data) => data.balance === 0 }),
    )
    await waitFor(() => expect(result.current.status).toBe('empty'))
  })
})

describe('refetch — what the error state´s action calls', () => {
  it('re-runs and can recover from error to content', async () => {
    let attempt = 0
    const { result } = renderHook(() =>
      useAsync(async () => {
        attempt += 1
        if (attempt === 1) throw new Error('first attempt fails')
        return ['recovered']
      }),
    )
    await waitFor(() => expect(result.current.status).toBe('error'))
    act(() => result.current.refetch())
    await waitFor(() => expect(result.current.status).toBe('content'))
    expect(result.current.data).toEqual(['recovered'])
  })

  it('is referentially stable, so it can sit in a dependency array', async () => {
    const { result } = renderHook(() => useAsync(async () => ['a']))
    const first = result.current.refetch
    await waitFor(() => expect(result.current.status).toBe('content'))
    expect(result.current.refetch).toBe(first)
  })

  it('reports isRefreshing on a reload that already had rows', async () => {
    let resolveSecond: ((rows: string[]) => void) | null = null
    let call = 0
    const { result } = renderHook(() =>
      useAsync(() => {
        call += 1
        if (call === 1) return Promise.resolve(['a'])
        return new Promise<string[]>((resolve) => {
          resolveSecond = resolve
        })
      }),
    )
    await waitFor(() => expect(result.current.status).toBe('content'))
    act(() => result.current.refetch())
    await waitFor(() => expect(result.current.isRefreshing).toBe(true))
    await act(async () => resolveSecond?.(['b']))
    await waitFor(() => expect(result.current.status).toBe('content'))
    expect(result.current.isRefreshing).toBe(false)
  })

  it('does not report isRefreshing on the first load', () => {
    const { result } = renderHook(() => useAsync(() => new Promise<string[]>(() => {})))
    expect(result.current.isRefreshing).toBe(false)
  })
})

describe('races and cancellation', () => {
  it('ignores a slow first response that lands after a fast second one', async () => {
    const resolvers: Array<(rows: string[]) => void> = []
    const { result, rerender } = renderHook(
      ({ page }: { page: number }) =>
        useAsync(
          () =>
            new Promise<string[]>((resolve) => {
              resolvers.push(resolve)
            }),
          { deps: [page] },
        ),
      { initialProps: { page: 1 } },
    )

    rerender({ page: 2 })
    // Page 2 lands first, then page 1's slow response arrives.
    resolvers[1]?.(['page two'])
    await waitFor(() => expect(result.current.data).toEqual(['page two']))
    resolvers[0]?.(['page one'])
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(result.current.data).toEqual(['page two'])
  })

  it('aborts the in-flight request on unmount', () => {
    const run = vi.fn((signal: AbortSignal) => new Promise<string[]>(() => void signal))
    const { unmount } = renderHook(() => useAsync(run))
    const signal = run.mock.calls[0]?.[0]
    expect(signal?.aborted).toBe(false)
    unmount()
    expect(signal?.aborted).toBe(true)
  })

  it('re-runs when a dep changes and not when it does not', async () => {
    const run = vi.fn(async () => ['a'])
    const { rerender } = renderHook(
      ({ id }: { id: string }) => useAsync(run, { deps: [id] }),
      { initialProps: { id: 'DRV-1' } },
    )
    await waitFor(() => expect(run).toHaveBeenCalledTimes(1))
    rerender({ id: 'DRV-1' })
    expect(run).toHaveBeenCalledTimes(1)
    rerender({ id: 'DRV-2' })
    await waitFor(() => expect(run).toHaveBeenCalledTimes(2))
  })

  it('does not fire while disabled, and stays in loading', async () => {
    const run = vi.fn(async () => ['a'])
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useAsync(run, { enabled }),
      { initialProps: { enabled: false } },
    )
    expect(run).not.toHaveBeenCalled()
    expect(result.current.status).toBe('loading')
    rerender({ enabled: true })
    await waitFor(() => expect(result.current.status).toBe('content'))
  })
})

describe('defaultIsEmpty', () => {
  it('treats null, undefined, an empty array and total 0 as empty', () => {
    expect(defaultIsEmpty(null)).toBe(true)
    expect(defaultIsEmpty(undefined)).toBe(true)
    expect(defaultIsEmpty([])).toBe(true)
    expect(defaultIsEmpty(paginated(0))).toBe(true)
  })

  it('does not treat a single record, zero, or an empty string as empty', () => {
    // A detail page loading one record is `content`, and a record whose only
    // field is `0` is still a record.
    expect(defaultIsEmpty(['a'])).toBe(false)
    expect(defaultIsEmpty(paginated(1))).toBe(false)
    expect(defaultIsEmpty({ id: 'DRV-1' })).toBe(false)
    expect(defaultIsEmpty(0)).toBe(false)
    expect(defaultIsEmpty('')).toBe(false)
  })
})

/* ────────────────────────── P1-T3: the request cache ───────────────────────
 *
 * `src/test/setup.ts` already calls `resetRequestCache()` in a global
 * `beforeEach`; these tests rely on that and only reach for the module directly
 * when they are testing the reset or the invalidation API itself.
 */

describe('the request cache — opt-in', () => {
  it('does not cache an un-keyed caller: a remount is a cold load, exactly as before', async () => {
    const run = vi.fn(async () => ['a'])
    const first = renderHook(() => useAsync(run))
    await waitFor(() => expect(first.result.current.status).toBe('content'))
    first.unmount()

    const second = renderHook(() => useAsync(run))
    // Skeleton, not content. This is the behaviour every existing call site has.
    expect(second.result.current.status).toBe('loading')
    expect(second.result.current.isRefreshing).toBe(false)
    await waitFor(() => expect(second.result.current.status).toBe('content'))
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('shows the skeleton on a genuine cold load even with a cacheKey', () => {
    const { result } = renderHook(() =>
      useAsync(() => new Promise<string[]>(() => {}), { cacheKey: 'drivers.list' }),
    )
    expect(result.current.status).toBe('loading')
    expect(result.current.data).toBeNull()
    // A first load is never dressed up as a refresh.
    expect(result.current.isRefreshing).toBe(false)
  })

  it('paints content on a warm remount without ever passing through loading', async () => {
    const run = vi.fn(async () => ['DRV-1'])
    const first = renderHook(() => useAsync(run, { cacheKey: 'drivers.list', deps: [1] }))
    await waitFor(() => expect(first.result.current.status).toBe('content'))
    first.unmount()

    const second = renderHook(() => useAsync(run, { cacheKey: 'drivers.list', deps: [1] }))
    // Synchronously after mount: rows on screen, subtle bar, no skeleton.
    expect(second.result.current.status).toBe('content')
    expect(second.result.current.data).toEqual(['DRV-1'])
    expect(second.result.current.isRefreshing).toBe(true)
    await waitFor(() => expect(second.result.current.isRefreshing).toBe(false))
  })

  it('still revalidates behind the subtle bar, and swaps in the fresh rows', async () => {
    let call = 0
    const run = vi.fn(async () => (call++ === 0 ? ['stale'] : ['fresh']))
    const first = renderHook(() => useAsync(run, { cacheKey: 'drivers.list' }))
    await waitFor(() => expect(first.result.current.data).toEqual(['stale']))
    first.unmount()

    const second = renderHook(() => useAsync(run, { cacheKey: 'drivers.list' }))
    expect(second.result.current.data).toEqual(['stale'])
    await waitFor(() => expect(second.result.current.data).toEqual(['fresh']))
    expect(second.result.current.isRefreshing).toBe(false)
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('classifies a cached empty result as empty, not content', async () => {
    const run = vi.fn(async () => paginated(0))
    const first = renderHook(() => useAsync(run, { cacheKey: 'drivers.list' }))
    await waitFor(() => expect(first.result.current.status).toBe('empty'))
    first.unmount()

    const second = renderHook(() => useAsync(run, { cacheKey: 'drivers.list' }))
    expect(second.result.current.status).toBe('empty')
    expect(second.result.current.isRefreshing).toBe(true)
    await waitFor(() => expect(second.result.current.isRefreshing).toBe(false))
  })

  it('treats a different deps value as a different request, so page 2 never shows page 1', async () => {
    const run = vi.fn(async () => ['rows'])
    const first = renderHook(() => useAsync(run, { cacheKey: 'trips.list', deps: [1] }))
    await waitFor(() => expect(first.result.current.status).toBe('content'))
    first.unmount()

    const second = renderHook(() => useAsync(run, { cacheKey: 'trips.list', deps: [2] }))
    expect(second.result.current.status).toBe('loading')
    await waitFor(() => expect(second.result.current.status).toBe('content'))
  })

  it('treats a different cacheKey as a different request', async () => {
    const run = vi.fn(async () => ['rows'])
    const first = renderHook(() => useAsync(run, { cacheKey: 'trips.list' }))
    await waitFor(() => expect(first.result.current.status).toBe('content'))
    first.unmount()

    const second = renderHook(() => useAsync(run, { cacheKey: 'drivers.list' }))
    expect(second.result.current.status).toBe('loading')
    await waitFor(() => expect(second.result.current.status).toBe('content'))
  })

  it('does not cache when the deps cannot be keyed honestly', async () => {
    const run = vi.fn(async () => ['rows'])
    const options = { cacheKey: 'trips.list', deps: [() => 1] }
    const first = renderHook(() => useAsync(run, options))
    await waitFor(() => expect(first.result.current.status).toBe('content'))
    first.unmount()

    const second = renderHook(() => useAsync(run, options))
    expect(second.result.current.status).toBe('loading')
    await waitFor(() => expect(second.result.current.status).toBe('content'))
  })

  it('drops the entry past the TTL and shows a skeleton rather than minute-old rows', async () => {
    const start = Date.now()
    const clock = vi.spyOn(Date, 'now').mockReturnValue(start)

    const run = vi.fn(async () => ['rows'])
    const first = renderHook(() => useAsync(run, { cacheKey: 'trips.list' }))
    await waitFor(() => expect(first.result.current.status).toBe('content'))
    first.unmount()

    clock.mockReturnValue(start + REQUEST_CACHE_TTL_MS + 1)
    const second = renderHook(() => useAsync(run, { cacheKey: 'trips.list' }))
    expect(second.result.current.status).toBe('loading')
    await waitFor(() => expect(second.result.current.status).toBe('content'))
    clock.mockRestore()
  })
})

describe('the request cache — errors are never cached', () => {
  it('reaches the error state on every attempt while a failure is injected', async () => {
    // The shape every mock client uses: ask the registry before returning.
    // `mockFailures.always` here stands in for `?mockFail=drivers.list`.
    mockFailures.always('drivers.list')
    const run = async () => {
      const injected = mockFailures.take('drivers.list')
      if (injected) throw injected
      return ['rows']
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const view = renderHook(() => useAsync(run, { cacheKey: 'drivers.list' }))
      await waitFor(() => expect(view.result.current.status).toBe('error'))
      expect(view.result.current.data).toBeNull()
      expect(isApiError(view.result.current.error)).toBe(true)
      view.unmount()
    }
    mockFailures.clear()
  })

  it('drops the cached rows when a revalidation fails, so the next mount is a real attempt', async () => {
    let shouldFail = false
    const run = async () => {
      if (shouldFail) throw new ApiError({ status: 503, message: 'Injected failure' })
      return ['rows']
    }

    const first = renderHook(() => useAsync(run, { cacheKey: 'drivers.list' }))
    await waitFor(() => expect(first.result.current.status).toBe('content'))
    first.unmount()

    shouldFail = true
    const second = renderHook(() => useAsync(run, { cacheKey: 'drivers.list' }))
    // Warm paint first…
    expect(second.result.current.status).toBe('content')
    // …then the failed revalidation wins, and never leaves stale rows under it.
    await waitFor(() => expect(second.result.current.status).toBe('error'))
    expect(second.result.current.data).toBeNull()
    second.unmount()

    // The entry is gone: a third mount is cold, not a flash of the old rows.
    const third = renderHook(() => useAsync(run, { cacheKey: 'drivers.list' }))
    expect(third.result.current.status).toBe('loading')
    await waitFor(() => expect(third.result.current.status).toBe('error'))
  })
})

describe('the request cache — abort, refetch and invalidation', () => {
  it('does not cache a response that arrives after the request was aborted', async () => {
    let resolveFirst: ((rows: string[]) => void) | null = null
    const run = vi.fn(() => {
      if (resolveFirst === null) {
        return new Promise<string[]>((resolve) => {
          resolveFirst = resolve
        })
      }
      return Promise.resolve(['second'])
    })

    const first = renderHook(() => useAsync(run, { cacheKey: 'trips.list' }))
    first.unmount()
    // The abandoned request resolves after unmount. It must not be stored.
    await act(async () => resolveFirst?.(['leaked']))
    expect(requestCacheSize()).toBe(0)

    const second = renderHook(() => useAsync(run, { cacheKey: 'trips.list' }))
    expect(second.result.current.status).toBe('loading')
    await waitFor(() => expect(second.result.current.data).toEqual(['second']))
  })

  it('does not cache a superseded response when a dep changes mid-flight', async () => {
    const resolvers: Array<(rows: string[]) => void> = []
    const { result, rerender } = renderHook(
      ({ page }: { page: number }) =>
        useAsync(
          () =>
            new Promise<string[]>((resolve) => {
              resolvers.push(resolve)
            }),
          { cacheKey: 'trips.list', deps: [page] },
        ),
      { initialProps: { page: 1 } },
    )

    rerender({ page: 2 })
    resolvers[1]?.(['page two'])
    await waitFor(() => expect(result.current.data).toEqual(['page two']))
    await act(async () => resolvers[0]?.(['page one']))

    // Only page 2 is in the cache; page 1's abandoned response was dropped.
    expect(readCache('trips.list::[n:1]')).toBeNull()
    expect(readCache<string[]>('trips.list::[n:2]')?.data).toEqual(['page two'])
  })

  it('bypasses the cache on refetch, so `Try again` is a real attempt', async () => {
    let call = 0
    const run = vi.fn(async () => {
      call += 1
      return [`call-${call}`]
    })
    const first = renderHook(() => useAsync(run, { cacheKey: 'drivers.list' }))
    await waitFor(() => expect(first.result.current.data).toEqual(['call-1']))
    first.unmount()

    const second = renderHook(() => useAsync(run, { cacheKey: 'drivers.list' }))
    expect(second.result.current.data).toEqual(['call-1'])
    await waitFor(() => expect(second.result.current.data).toEqual(['call-2']))

    act(() => second.result.current.refetch())
    // No warm paint: straight to the refreshing state with no rows re-served
    // from the cache underneath it.
    expect(second.result.current.status).toBe('loading')
    expect(second.result.current.isRefreshing).toBe(true)
    await waitFor(() => expect(second.result.current.data).toEqual(['call-3']))
  })

  it('makes the next mount cold after invalidate(prefix) — what a mutation calls', async () => {
    const run = vi.fn(async () => ['rows'])
    const first = renderHook(() => useAsync(run, { cacheKey: 'drivers.list', deps: [1] }))
    await waitFor(() => expect(first.result.current.status).toBe('content'))
    first.unmount()

    invalidate('drivers.')

    const second = renderHook(() => useAsync(run, { cacheKey: 'drivers.list', deps: [1] }))
    expect(second.result.current.status).toBe('loading')
    await waitFor(() => expect(second.result.current.status).toBe('content'))
  })

  it('makes the next mount cold after resetRequestCache — the test-isolation switch', async () => {
    const run = vi.fn(async () => ['rows'])
    const first = renderHook(() => useAsync(run, { cacheKey: 'drivers.list' }))
    await waitFor(() => expect(first.result.current.status).toBe('content'))
    first.unmount()

    resetRequestCache()
    expect(requestCacheSize()).toBe(0)

    const second = renderHook(() => useAsync(run, { cacheKey: 'drivers.list' }))
    expect(second.result.current.status).toBe('loading')
    await waitFor(() => expect(second.result.current.status).toBe('content'))
  })

  it('caches nothing at all while the cache is switched off', async () => {
    setRequestCacheEnabled(false)
    const run = vi.fn(async () => ['rows'])
    const first = renderHook(() => useAsync(run, { cacheKey: 'drivers.list' }))
    await waitFor(() => expect(first.result.current.status).toBe('content'))
    first.unmount()

    const second = renderHook(() => useAsync(run, { cacheKey: 'drivers.list' }))
    expect(second.result.current.status).toBe('loading')
    await waitFor(() => expect(second.result.current.status).toBe('content'))
    setRequestCacheEnabled(true)
  })

  it('does not fire or cache while disabled', () => {
    const run = vi.fn(async () => ['rows'])
    const { result } = renderHook(() => useAsync(run, { cacheKey: 'drivers.list', enabled: false }))
    expect(run).not.toHaveBeenCalled()
    expect(result.current.status).toBe('loading')
    expect(requestCacheSize()).toBe(0)
  })
})
