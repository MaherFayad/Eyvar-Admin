/**
 * The kill switch, tested for the property that matters: **it fails toward
 * keeping the app alive, and only an explicit instruction takes it away.**
 *
 * An operator who is offline must not lose the console because the check could
 * not complete — that would make the offline shell self-defeating. Every failure
 * mode a real network produces is enumerated below, and all of them mean "not
 * killed".
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  deleteOwnCaches,
  isKilledRemotely,
  resolveDisableFlag,
  tearDownServiceWorkers,
} from './killSwitch'
import { CACHE_PREFIX, DISABLE_STORAGE_KEY } from './protocol'

/** A `Response`-shaped stub. `Response` exists in jsdom but is fussy to build. */
function ok(body: unknown): Response {
  return { ok: true, json: async () => body } as unknown as Response
}

describe('isKilledRemotely', () => {
  it('kills on an explicit disabled:true, and reports the reason', async () => {
    const fetchImpl = vi.fn(async () => ok({ disabled: true, reason: 'bad deploy 4821' }))
    expect(await isKilledRemotely(fetchImpl as unknown as typeof fetch)).toBe('bad deploy 4821')
  })

  it('kills with a default reason when none is given', async () => {
    const fetchImpl = vi.fn(async () => ok({ disabled: true }))
    expect(await isKilledRemotely(fetchImpl as unknown as typeof fetch)).toBe('kill switch')
  })

  it('does not kill on disabled:false', async () => {
    const fetchImpl = vi.fn(async () => ok({ disabled: false }))
    expect(await isKilledRemotely(fetchImpl as unknown as typeof fetch)).toBe(false)
  })

  it('fetches with no-store — a cached kill switch is not a kill switch', async () => {
    const fetchImpl = vi.fn(async () => ok({ disabled: false }))
    await isKilledRemotely(fetchImpl as unknown as typeof fetch)
    expect(fetchImpl).toHaveBeenCalledWith('/pwa-kill-switch.json', {
      cache: 'no-store',
      credentials: 'omit',
    })
  })

  describe('fails toward staying alive', () => {
    it('when offline', async () => {
      const fetchImpl = vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      })
      expect(await isKilledRemotely(fetchImpl as unknown as typeof fetch)).toBe(false)
    })

    it('when the file is missing', async () => {
      const fetchImpl = vi.fn(async () => ({ ok: false, status: 404 }) as unknown as Response)
      expect(await isKilledRemotely(fetchImpl as unknown as typeof fetch)).toBe(false)
    })

    it('when the body is not JSON', async () => {
      const fetchImpl = vi.fn(
        async () =>
          ({
            ok: true,
            json: async () => {
              throw new SyntaxError('Unexpected token <')
            },
          }) as unknown as Response,
      )
      expect(await isKilledRemotely(fetchImpl as unknown as typeof fetch)).toBe(false)
    })

    it('when the body is JSON but the wrong shape', async () => {
      for (const body of [null, {}, { disabled: 'true' }, { disabled: 1 }, []]) {
        const fetchImpl = vi.fn(async () => ok(body))
        expect(await isKilledRemotely(fetchImpl as unknown as typeof fetch)).toBe(false)
      }
    })
  })
})

describe('resolveDisableFlag', () => {
  let storage: Storage

  beforeEach(() => {
    const map = new Map<string, string>()
    storage = {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
    } as unknown as Storage
  })

  it('is off by default', () => {
    expect(resolveDisableFlag('', storage)).toEqual({ disabled: false, changed: false })
  })

  it('?pwa=off disables and sticks', () => {
    expect(resolveDisableFlag('?pwa=off', storage)).toEqual({ disabled: true, changed: true })
    expect(storage.getItem(DISABLE_STORAGE_KEY)).toBe('1')
    /* The operator should not have to keep the parameter in the URL all shift. */
    expect(resolveDisableFlag('', storage)).toEqual({ disabled: true, changed: false })
  })

  it('reports changed:false when it was already off, so nothing reloads in a loop', () => {
    resolveDisableFlag('?pwa=off', storage)
    expect(resolveDisableFlag('?pwa=off', storage)).toEqual({ disabled: true, changed: false })
  })

  it('?pwa=on is the way back — the hatch is not a one-way door', () => {
    resolveDisableFlag('?pwa=off', storage)
    expect(resolveDisableFlag('?pwa=on', storage)).toEqual({ disabled: false, changed: true })
    expect(storage.getItem(DISABLE_STORAGE_KEY)).toBeNull()
  })

  it('survives storage that throws — Safari private mode, a locked-down profile', () => {
    const hostile = {
      getItem: () => {
        throw new DOMException('denied')
      },
      setItem: () => {
        throw new DOMException('denied')
      },
      removeItem: () => {
        throw new DOMException('denied')
      },
    } as unknown as Storage
    expect(() => resolveDisableFlag('?pwa=off', hostile)).not.toThrow()
    expect(resolveDisableFlag('?pwa=off', hostile).disabled).toBe(true)
    /* No storage means no stickiness, and never a false "disabled". */
    expect(resolveDisableFlag('', hostile).disabled).toBe(false)
  })

  it('survives having no storage at all', () => {
    expect(resolveDisableFlag('?pwa=off', undefined)).toEqual({ disabled: true, changed: true })
    expect(resolveDisableFlag('', undefined)).toEqual({ disabled: false, changed: false })
  })
})

describe('deleteOwnCaches', () => {
  function cacheStorageWith(names: string[]) {
    const deleted: string[] = []
    return {
      deleted,
      storage: {
        keys: async () => names,
        delete: async (name: string) => {
          deleted.push(name)
          return true
        },
      } as unknown as CacheStorage,
    }
  }

  it('deletes every cache of ours, at any version', async () => {
    const { deleted, storage } = cacheStorageWith([
      `${CACHE_PREFIX}:aaaa1111:shell`,
      `${CACHE_PREFIX}:aaaa1111:read`,
      `${CACHE_PREFIX}:bbbb2222:shell`,
    ])
    expect(await deleteOwnCaches(storage)).toBe(3)
    expect(deleted).toHaveLength(3)
  })

  it('never touches a cache belonging to something else on the origin', async () => {
    const { deleted, storage } = cacheStorageWith([
      `${CACHE_PREFIX}:aaaa1111:shell`,
      'workbox-precache-v2',
      'some-other-app',
    ])
    expect(await deleteOwnCaches(storage)).toBe(1)
    expect(deleted).toEqual([`${CACHE_PREFIX}:aaaa1111:shell`])
  })

  it('is a no-op where CacheStorage does not exist', async () => {
    expect(await deleteOwnCaches(undefined)).toBe(0)
  })
})

describe('tearDownServiceWorkers', () => {
  afterEach(() => vi.restoreAllMocks())

  it('unregisters every registration and drops every cache', async () => {
    const unregister = vi.fn(async () => true)
    const container = {
      getRegistrations: async () => [{ unregister }, { unregister }],
    } as unknown as ServiceWorkerContainer
    const storage = {
      keys: async () => [`${CACHE_PREFIX}:x:shell`],
      delete: async () => true,
    } as unknown as CacheStorage

    expect(await tearDownServiceWorkers(container, storage)).toBe(true)
    expect(unregister).toHaveBeenCalledTimes(2)
  })

  it('reports false when there was nothing to remove, so nothing reloads', async () => {
    const container = { getRegistrations: async () => [] } as unknown as ServiceWorkerContainer
    const storage = { keys: async () => [], delete: async () => false } as unknown as CacheStorage
    expect(await tearDownServiceWorkers(container, storage)).toBe(false)
  })

  it('still purges caches when getRegistrations rejects', async () => {
    const container = {
      getRegistrations: async () => {
        throw new DOMException('not allowed')
      },
    } as unknown as ServiceWorkerContainer
    const deleted: string[] = []
    const storage = {
      keys: async () => [`${CACHE_PREFIX}:x:shell`],
      delete: async (n: string) => {
        deleted.push(n)
        return true
      },
    } as unknown as CacheStorage

    expect(await tearDownServiceWorkers(container, storage)).toBe(true)
    expect(deleted).toEqual([`${CACHE_PREFIX}:x:shell`])
  })
})
