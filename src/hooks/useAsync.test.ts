import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError, isApiError } from '@/data/types/common'
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
