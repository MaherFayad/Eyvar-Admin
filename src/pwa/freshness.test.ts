/**
 * The staleness store — the half of *"a cached figure is never rendered as if it
 * were live"* that the page is responsible for.
 *
 * The other half is `cachePolicy.test.ts`: money is never cached, so its
 * staleness can never need showing. This file proves the remaining case — an
 * index or detail read served from cache is **knowable** as such, with an
 * *as-of* a banner can state.
 */

import { renderHook, act } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  applyWorkerMessage,
  markRevalidated,
  markServedFromCache,
  readFreshness,
  resetFreshness,
  useDataFreshness,
} from './freshness'
import { MSG_KILLED, MSG_REVALIDATED, MSG_SERVED_FROM_CACHE } from './protocol'

const T1 = '2026-09-02T09:14:00.000Z'
const T2 = '2026-09-02T09:41:00.000Z'

beforeEach(resetFreshness)

describe('the store', () => {
  it('starts clean — nothing is stale before anything has been served', () => {
    const { result } = renderHook(() => useDataFreshness())
    expect(result.current).toEqual({ isStale: false, oldestCachedAt: null, stalePaths: [] })
  })

  it('reports a cached read, and the as-of a banner would state', () => {
    const { result } = renderHook(() => useDataFreshness())
    act(() => markServedFromCache('/api/v1/drivers', { cachedAt: T1, ageMs: 60_000 }))
    expect(result.current.isStale).toBe(true)
    expect(result.current.oldestCachedAt).toBe(T1)
    expect(result.current.stalePaths).toEqual(['/api/v1/drivers'])
  })

  it('states the OLDEST as-of, not the most recent', () => {
    const { result } = renderHook(() => useDataFreshness())
    act(() => {
      markServedFromCache('/api/v1/trips', { cachedAt: T2, ageMs: 1_000 })
      markServedFromCache('/api/v1/drivers', { cachedAt: T1, ageMs: 60_000 })
    })
    /* A banner that quoted the newest timestamp would overstate how fresh the
       page is, which is the exact failure this whole module exists to prevent. */
    expect(result.current.oldestCachedAt).toBe(T1)
  })

  it('goes live again when the background revalidation lands', () => {
    const { result } = renderHook(() => useDataFreshness())
    act(() => markServedFromCache('/api/v1/drivers', { cachedAt: T1, ageMs: 60_000 }))
    act(() => markRevalidated('/api/v1/drivers'))
    expect(result.current).toEqual({ isStale: false, oldestCachedAt: null, stalePaths: [] })
  })

  it('stays stale while any read is still stale', () => {
    const { result } = renderHook(() => useDataFreshness())
    act(() => {
      markServedFromCache('/api/v1/drivers', { cachedAt: T1, ageMs: 60_000 })
      markServedFromCache('/api/v1/trips', { cachedAt: T2, ageMs: 1_000 })
    })
    act(() => markRevalidated('/api/v1/drivers'))
    expect(result.current.isStale).toBe(true)
    expect(result.current.oldestCachedAt).toBe(T2)
  })

  it('sorts paths, so a banner listing them does not reorder itself', () => {
    const { result } = renderHook(() => useDataFreshness())
    act(() => {
      markServedFromCache('/api/v1/zones', { cachedAt: T1, ageMs: 1 })
      markServedFromCache('/api/v1/alerts', { cachedAt: T1, ageMs: 1 })
    })
    expect(result.current.stalePaths).toEqual(['/api/v1/alerts', '/api/v1/zones'])
  })

  it('keeps per-path detail for a caller that wants to stamp one figure', () => {
    markServedFromCache('/api/v1/drivers', { cachedAt: T1, ageMs: 60_000 })
    expect(readFreshness('/api/v1/drivers')).toEqual({ cachedAt: T1, ageMs: 60_000 })
    expect(readFreshness('/api/v1/trips')).toBeNull()
  })

  it('does not notify for a revalidation of something that was never stale', () => {
    let renders = 0
    renderHook(() => {
      renders += 1
      return useDataFreshness()
    })
    const before = renders
    act(() => markRevalidated('/api/v1/never-seen'))
    expect(renders).toBe(before)
  })
})

describe('applyWorkerMessage', () => {
  it('handles the two messages it owns and declines the rest', () => {
    expect(
      applyWorkerMessage({ type: MSG_SERVED_FROM_CACHE, path: '/api/v1/drivers', cachedAt: T1, ageMs: 5 }),
    ).toBe(true)
    expect(readFreshness('/api/v1/drivers')).not.toBeNull()

    expect(applyWorkerMessage({ type: MSG_REVALIDATED, path: '/api/v1/drivers' })).toBe(true)
    expect(readFreshness('/api/v1/drivers')).toBeNull()

    /* `register.ts` passes every message through, so declining is load-bearing:
       it is how the kill message reaches its own handler. */
    expect(applyWorkerMessage({ type: MSG_KILLED, reason: 'test' })).toBe(false)
  })
})
