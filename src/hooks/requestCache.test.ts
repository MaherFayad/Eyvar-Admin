import { beforeEach, describe, expect, it } from 'vitest'
import {
  REQUEST_CACHE_TTL_MS,
  deleteCache,
  invalidate,
  isRequestCacheEnabled,
  readCache,
  requestCacheKey,
  requestCacheSize,
  resetRequestCache,
  setRequestCacheEnabled,
  writeCache,
} from './requestCache'

beforeEach(() => {
  resetRequestCache()
})

describe('read and write', () => {
  it('returns what was written', () => {
    writeCache('drivers.list::[]', ['DRV-1'])
    expect(readCache<string[]>('drivers.list::[]')?.data).toEqual(['DRV-1'])
  })

  it('misses on a key that was never written', () => {
    expect(readCache('trips.list::[]')).toBeNull()
  })

  it('wraps the hit, so a cached undefined is still a hit and not a miss', () => {
    writeCache('void.op::[]', undefined)
    expect(readCache('void.op::[]')).toEqual({ data: undefined, ageMs: 0 })
  })

  it('reports the age of the entry', () => {
    writeCache('drivers.list::[]', ['DRV-1'], 1_000)
    expect(readCache('drivers.list::[]', 3_500)?.ageMs).toBe(2_500)
  })

  it('caches falsy and zero-shaped payloads without confusing them for a miss', () => {
    writeCache('a::[]', 0)
    writeCache('b::[]', '')
    writeCache('c::[]', null)
    writeCache('d::[]', [])
    expect(readCache('a::[]')?.data).toBe(0)
    expect(readCache('b::[]')?.data).toBe('')
    expect(readCache('c::[]')?.data).toBeNull()
    expect(readCache('d::[]')?.data).toEqual([])
  })
})

describe('TTL', () => {
  it('serves an entry inside the TTL', () => {
    writeCache('k', 'rows', 1_000)
    expect(readCache('k', 1_000 + REQUEST_CACHE_TTL_MS - 1)?.data).toBe('rows')
  })

  it('misses exactly at the TTL boundary', () => {
    writeCache('k', 'rows', 1_000)
    expect(readCache('k', 1_000 + REQUEST_CACHE_TTL_MS)).toBeNull()
  })

  it('evicts the expired entry rather than leaving it to be re-read', () => {
    writeCache('k', 'rows', 1_000)
    readCache('k', 1_000 + REQUEST_CACHE_TTL_MS)
    expect(requestCacheSize()).toBe(0)
  })

  it('is measured in low seconds — an ops console must not paint minute-old rows', () => {
    expect(REQUEST_CACHE_TTL_MS).toBeGreaterThan(0)
    expect(REQUEST_CACHE_TTL_MS).toBeLessThanOrEqual(15_000)
  })

  it('restarts the clock on a rewrite', () => {
    writeCache('k', 'old', 0)
    writeCache('k', 'new', 9_000)
    expect(readCache('k', 9_500)?.data).toBe('new')
  })
})

describe('invalidate — what a mutation calls', () => {
  it('drops every key under a prefix and nothing else', () => {
    writeCache('drivers.list::[n:1]', 'a')
    writeCache('drivers.list::[n:2]', 'b')
    writeCache('drivers.get::[s:DRV-1]', 'c')
    writeCache('trips.list::[n:1]', 'd')

    invalidate('drivers.')

    expect(readCache('drivers.list::[n:1]')).toBeNull()
    expect(readCache('drivers.list::[n:2]')).toBeNull()
    expect(readCache('drivers.get::[s:DRV-1]')).toBeNull()
    expect(readCache('trips.list::[n:1]')?.data).toBe('d')
  })

  it('drops every page of one list when given the operation id', () => {
    writeCache('drivers.list::[n:1]', 'a')
    writeCache('drivers.get::[s:DRV-1]', 'c')
    invalidate('drivers.list')
    expect(readCache('drivers.list::[n:1]')).toBeNull()
    expect(readCache('drivers.get::[s:DRV-1]')?.data).toBe('c')
  })

  it('drops everything when given no prefix — for a sign-out or an actor change', () => {
    writeCache('a::[]', 1)
    writeCache('b::[]', 2)
    invalidate()
    expect(requestCacheSize()).toBe(0)
  })

  it('is a no-op for a prefix that matches nothing', () => {
    writeCache('a::[]', 1)
    invalidate('zzz')
    expect(requestCacheSize()).toBe(1)
  })
})

describe('deleteCache', () => {
  it('drops one exact key', () => {
    writeCache('trips.list::[n:1]', 'one')
    deleteCache('trips.list::[n:1]')
    expect(readCache('trips.list::[n:1]')).toBeNull()
  })

  it('does not over-delete a longer key it happens to prefix', () => {
    // The bug `deleteCache` exists to avoid: `[n:1]` is a string prefix of `[n:11]`.
    writeCache('trips.list::[n:1]', 'page one')
    writeCache('trips.list::[n:11]', 'page eleven')
    deleteCache('trips.list::[n:1]')
    expect(readCache('trips.list::[n:11]')?.data).toBe('page eleven')
  })
})

describe('the off switch and the reset', () => {
  it('misses every read while disabled', () => {
    writeCache('k', 'rows')
    setRequestCacheEnabled(false)
    expect(readCache('k')).toBeNull()
  })

  it('drops writes while disabled, so re-enabling does not reveal a half-warm cache', () => {
    setRequestCacheEnabled(false)
    writeCache('k', 'rows')
    setRequestCacheEnabled(true)
    expect(readCache('k')).toBeNull()
  })

  it('resets contents and re-enables, so a beforeEach cannot leave the switch off', () => {
    writeCache('k', 'rows')
    setRequestCacheEnabled(false)
    resetRequestCache()
    expect(isRequestCacheEnabled()).toBe(true)
    expect(requestCacheSize()).toBe(0)
  })
})

describe('eviction', () => {
  it('stays bounded under a caller that pages forever', () => {
    for (let page = 0; page < 500; page += 1) writeCache(`trips.list::[n:${page}]`, page)
    expect(requestCacheSize()).toBeLessThanOrEqual(200)
    // Oldest went first; the newest survived.
    expect(readCache('trips.list::[n:0]')).toBeNull()
    expect(readCache('trips.list::[n:499]')?.data).toBe(499)
  })
})

describe('requestCacheKey — the honesty rules', () => {
  it('includes the operation id, so two operations with identical deps do not collide', () => {
    expect(requestCacheKey('drivers.list', [1])).not.toBe(requestCacheKey('trips.list', [1]))
  })

  it('is stable across calls with equal deps', () => {
    expect(requestCacheKey('op', ['a', 2, true])).toBe(requestCacheKey('op', ['a', 2, true]))
  })

  it('separates values that differ only by type', () => {
    const keys = new Set([
      requestCacheKey('op', ['1']),
      requestCacheKey('op', [1]),
      requestCacheKey('op', [true]),
      requestCacheKey('op', [null]),
      requestCacheKey('op', [undefined]),
    ])
    expect(keys.size).toBe(5)
  })

  it('does not confuse one comma-bearing string with two strings', () => {
    expect(requestCacheKey('op', ['a,b'])).not.toBe(requestCacheKey('op', ['a', 'b']))
  })

  it('does not confuse a backslash-escaped string with the escape itself', () => {
    expect(requestCacheKey('op', ['a\\', 'b'])).not.toBe(requestCacheKey('op', ['a\\,b']))
  })

  it('treats an object dep as its sorted fields, so key order does not split the cache', () => {
    expect(requestCacheKey('op', [{ page: 1, q: 'ali' }])).toBe(
      requestCacheKey('op', [{ q: 'ali', page: 1 }]),
    )
  })

  it('distinguishes objects whose values differ', () => {
    expect(requestCacheKey('op', [{ page: 1 }])).not.toBe(requestCacheKey('op', [{ page: 2 }]))
  })

  it('distinguishes an empty object from an empty array from no deps at all', () => {
    const keys = new Set([
      requestCacheKey('op', [{}]),
      requestCacheKey('op', [[]]),
      requestCacheKey('op', []),
    ])
    expect(keys.size).toBe(3)
  })

  it('keys a Date by its instant, not its identity', () => {
    expect(requestCacheKey('op', [new Date('2026-09-01T00:00:00Z')])).toBe(
      requestCacheKey('op', [new Date('2026-09-01T00:00:00Z')]),
    )
    expect(requestCacheKey('op', [new Date('2026-09-01T00:00:00Z')])).not.toBe(
      requestCacheKey('op', [new Date('2026-09-02T00:00:00Z')]),
    )
  })

  it('keys an Invalid Date without throwing', () => {
    expect(requestCacheKey('op', [new Date('nonsense')])).toBeTypeOf('string')
  })

  it('keys NaN, Infinity and -0 the way React compares deps', () => {
    expect(requestCacheKey('op', [Number.NaN])).toBe(requestCacheKey('op', [Number.NaN]))
    expect(requestCacheKey('op', [Number.NaN])).not.toBe(requestCacheKey('op', [0]))
    expect(requestCacheKey('op', [Infinity])).not.toBe(requestCacheKey('op', [-Infinity]))
  })

  it('keys a bigint and a very large number distinctly', () => {
    expect(requestCacheKey('op', [10n])).not.toBe(requestCacheKey('op', [10]))
    expect(requestCacheKey('op', [Number.MAX_SAFE_INTEGER])).toBeTypeOf('string')
  })

  it('keys Arabic and mixed-direction strings', () => {
    expect(requestCacheKey('op', ['علي'])).toBe(requestCacheKey('op', ['علي']))
    expect(requestCacheKey('op', ['علي'])).not.toBe(requestCacheKey('op', ['محمد']))
  })

  it('refuses a function dep — a closure has no stable identity to key on', () => {
    expect(requestCacheKey('op', [() => 1])).toBeNull()
  })

  it('refuses a symbol dep', () => {
    expect(requestCacheKey('op', [Symbol('x')])).toBeNull()
  })

  it('refuses a class instance, a Map and a Set rather than guessing at their internals', () => {
    class Filter {}
    expect(requestCacheKey('op', [new Filter()])).toBeNull()
    expect(requestCacheKey('op', [new Map([['a', 1]])])).toBeNull()
    expect(requestCacheKey('op', [new Set([1])])).toBeNull()
    expect(requestCacheKey('op', [new URLSearchParams('a=1')])).toBeNull()
  })

  it('refuses a nested unkeyable value, not just a top-level one', () => {
    expect(requestCacheKey('op', [{ filters: { onSelect: () => 1 } }])).toBeNull()
    expect(requestCacheKey('op', [['ok', new Map()]])).toBeNull()
  })

  it('refuses rather than recursing forever on a cyclic dep', () => {
    const cyclic: Record<string, unknown> = { a: 1 }
    cyclic.self = cyclic
    expect(requestCacheKey('op', [cyclic])).toBeNull()
  })

  it('refuses an empty operation id — an unnamed operation cannot be invalidated', () => {
    expect(requestCacheKey('', [1])).toBeNull()
  })

  it('accepts a deep-but-finite dep', () => {
    expect(requestCacheKey('op', [{ a: { b: { c: [1, 2, { d: 'e' }] } } }])).toBeTypeOf('string')
  })
})
