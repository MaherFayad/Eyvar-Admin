import { afterEach, describe, expect, it } from 'vitest'
import {
  UI_STATE_CACHE_PREFIX,
  UI_STATE_KEYS,
  UI_STATE_SCHEMA_VERSION,
  clearCachedUiState,
  createCachedStore,
  createMemoryStore,
  createNullStore,
  currentUiStateOwner,
  defaultUiStore,
  resetDefaultUiStores,
  setUiStateOwner,
  uiStateCacheKey,
  type StorageLike,
} from './persistence'

afterEach(() => {
  resetDefaultUiStores()
  setUiStateOwner(null)
  // The default store writes to the real jsdom `localStorage`; without this a
  // cached value from one test paints in the next.
  clearCachedUiState(null)
})

/* ── test doubles ────────────────────────────────────────────────────────
   Written by hand rather than mocked, because every one of them models a real
   browser: a working store, one that is out of quota, one that has been
   disabled since the last read, and an accessor that throws on access. */

interface FakeStorage extends StorageLike {
  readonly entries: Map<string, string>
}

function fakeStorage(seed: Record<string, string> = {}): FakeStorage {
  const entries = new Map<string, string>(Object.entries(seed))
  return {
    entries,
    get length() {
      return entries.size
    },
    key: (index: number) => [...entries.keys()][index] ?? null,
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value)
    },
    removeItem: (key: string) => {
      entries.delete(key)
    },
  }
}

/** Safari in a private window: reads fine, throws `QuotaExceededError` on write. */
function outOfQuotaStorage(seed: Record<string, string> = {}): FakeStorage {
  const base = fakeStorage(seed)
  return {
    ...base,
    get length() {
      return base.length
    },
    setItem: () => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
    },
  }
}

/** Site data cleared, or storage disabled, after the store was constructed. */
function deniedStorage(): FakeStorage {
  const deny = (): never => {
    throw new DOMException('The operation is insecure.', 'SecurityError')
  }
  return {
    entries: new Map(),
    get length(): number {
      return deny()
    },
    key: deny,
    getItem: deny,
    setItem: deny,
    removeItem: deny,
  }
}

const isString = (value: unknown): value is string => typeof value === 'string'
const isStringList = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string')

const KEY = UI_STATE_KEYS.language
const OWNER = 'USR-1'

/* ── the interface, unchanged ────────────────────────────────────────────── */

describe('the store interface', () => {
  it('reports nothing stored on first run', () => {
    expect(createMemoryStore<boolean>().read()).toBeNull()
  })

  it('distinguishes "nothing stored" from "stored false"', () => {
    // The whole reason `read()` returns `null` rather than a default: a stored
    // `false` must not be mistaken for an unanswered first run.
    const store = createMemoryStore<boolean>()
    store.write(false)
    expect(store.read()).toBe(false)
    expect(store.read()).not.toBeNull()
  })

  it('accepts an initial value', () => {
    expect(createMemoryStore(true).read()).toBe(true)
  })

  it('offers a null store for a caller that has opted out', () => {
    const store = createNullStore<boolean>()
    store.write(true)
    expect(store.read()).toBeNull()
  })

  it('shares one value between two callers of the same default key', () => {
    defaultUiStore<boolean>(UI_STATE_KEYS.columnPins).write(true)
    expect(defaultUiStore<boolean>(UI_STATE_KEYS.columnPins).read()).toBe(true)
  })

  it('keeps different keys apart', () => {
    defaultUiStore<boolean>(UI_STATE_KEYS.columnPins).write(true)
    expect(defaultUiStore<string>(UI_STATE_KEYS.language).read()).toBeNull()
  })

  it('names every key the shell persists, and D16 makes that list the schema', () => {
    // The three prefixes are **prefixes**, not keys: per-table column state is
    // stored under `<prefix>.<tableId>.<view>` and last-view under
    // `<prefix>.<subTabId>`. `ui.subTabNavCollapsed` is absent and stays absent
    // (D5 removed the collapse; D16 deletes rather than migrates it).
    expect(Object.values(UI_STATE_KEYS)).toEqual([
      'ui.language',
      'ui.theme',
      'ui.columnPins',
      'ui.columnVisibility',
      'ui.density',
      'ui.pageSize',
      'ui.paletteRecents',
      'ui.lastView',
    ])
    expect(Object.values(UI_STATE_KEYS).some((key) => /collaps/i.test(key))).toBe(false)
  })
})

/* ── the write-through cache, happy path ─────────────────────────────────── */

describe('the localStorage cache — write-through, per operator', () => {
  it('round-trips a value through storage, not through the memory tier', () => {
    const storage = fakeStorage()
    const write = createCachedStore(KEY, isString, { owner: OWNER, storage })
    write.write('ar')

    // A *different* store instance: this is what a reload produces, and it is
    // the only thing the cache buys.
    const afterReload = createCachedStore(KEY, isString, { owner: OWNER, storage })
    expect(afterReload.read()).toBe('ar')
  })

  it('keys by operator and schema version, exactly as D16 specifies', () => {
    const storage = fakeStorage()
    createCachedStore(KEY, isString, { owner: OWNER, storage }).write('ar')
    expect([...storage.entries.keys()]).toEqual([
      `${UI_STATE_CACHE_PREFIX}.${UI_STATE_SCHEMA_VERSION}.${OWNER}.${KEY}`,
    ])
  })

  it('does not serve one operator the previous operator’s layout', () => {
    // The shift-change case, and the reason the ruling says "per operator,
    // never per tenant".
    const storage = fakeStorage()
    createCachedStore(KEY, isString, { owner: 'USR-1', storage }).write('ar')
    expect(createCachedStore(KEY, isString, { owner: 'USR-3', storage }).read()).toBeNull()
  })

  it('writes nothing at all before an operator is known', () => {
    const storage = fakeStorage()
    const store = createCachedStore(KEY, isString, { storage })
    store.write('ar')
    expect(storage.entries.size).toBe(0)
    // Still usable for the session: the memory tier took it.
    expect(store.read()).toBe('ar')
  })

  it('re-points at the new operator when the session changes, and drops the memory tier', () => {
    const storage = fakeStorage()
    setUiStateOwner('USR-1')
    expect(currentUiStateOwner()).toBe('USR-1')
    const store = defaultUiStore(KEY, isString)
    store.write('ar')

    setUiStateOwner('USR-3')
    // A fresh store for the same key, because `setUiStateOwner` cleared the map.
    expect(defaultUiStore(KEY, isString).read()).toBeNull()
    expect(storage.entries.size).toBe(0) // wrote to the real jsdom store, not this one
  })

  it('clears one operator’s namespace on sign-out and leaves the other’s', () => {
    const storage = fakeStorage()
    createCachedStore(KEY, isString, { owner: 'USR-1', storage }).write('ar')
    createCachedStore(KEY, isString, { owner: 'USR-3', storage }).write('en')

    clearCachedUiState('USR-1', storage)

    expect(createCachedStore(KEY, isString, { owner: 'USR-1', storage }).read()).toBeNull()
    expect(createCachedStore(KEY, isString, { owner: 'USR-3', storage }).read()).toBe('en')
  })

  it('clears every namespace when sign-out no longer knows who is leaving', () => {
    const storage = fakeStorage({ 'unrelated.key': 'kept' })
    createCachedStore(KEY, isString, { owner: 'USR-1', storage }).write('ar')
    createCachedStore(KEY, isString, { owner: 'USR-3', storage }).write('en')

    clearCachedUiState(undefined, storage)

    expect([...storage.entries.keys()]).toEqual(['unrelated.key'])
  })

  it('sweeps entries left behind by an earlier schema version', () => {
    const storage = fakeStorage({
      [uiStateCacheKey(OWNER, KEY, 0)]: '{"v":0,"value":"ar"}',
      [uiStateCacheKey(OWNER, KEY)]: '{"v":1,"value":"en"}',
    })
    clearCachedUiState(OWNER, storage)
    expect(storage.entries.size).toBe(0)
  })
})

/* ── the remembered owner ────────────────────────────────────────────────── */

describe('the operator id is remembered, so the namespace is known at first render', () => {
  /*
   * Not an optimisation. The owner is confirmed by an asynchronous session read,
   * and every persisting hook seeds its state during the FIRST render. An owner
   * that only ever arrives from that response arrives one hop too late, the seed
   * reads an unowned store, and the whole cache is inert while passing every
   * test. `src/hooks/uiStatePersistence.test.tsx` asserts the consequence
   * end-to-end; this asserts the mechanism.
   */
  it('writes the owner where the next boot can find it before anything async runs', () => {
    setUiStateOwner('USR-1')
    expect(localStorage.getItem(`${UI_STATE_CACHE_PREFIX}.owner`)).toBe('USR-1')
  })

  it('forgets it on sign-out, which is the whole of the shift-change rule', () => {
    setUiStateOwner('USR-1')
    setUiStateOwner(null)
    expect(localStorage.getItem(`${UI_STATE_CACHE_PREFIX}.owner`)).toBeNull()
  })

  it('is swept by a sign-out that no longer knows who is leaving', () => {
    setUiStateOwner('USR-1')
    clearCachedUiState()
    expect(localStorage.getItem(`${UI_STATE_CACHE_PREFIX}.owner`)).toBeNull()
  })

  it('is left alone by a sweep scoped to one operator', () => {
    // It carries no operator segment, so it is not one operator's data to clear;
    // only a full sign-out retires it.
    setUiStateOwner('USR-1')
    clearCachedUiState('USR-1')
    expect(localStorage.getItem(`${UI_STATE_CACHE_PREFIX}.owner`)).toBe('USR-1')
  })

  it('replaces it when a different operator signs in', () => {
    setUiStateOwner('USR-1')
    setUiStateOwner('USR-3')
    expect(localStorage.getItem(`${UI_STATE_CACHE_PREFIX}.owner`)).toBe('USR-3')
    expect(currentUiStateOwner()).toBe('USR-3')
  })
})

/* ── hostile environment 1: the accessor throws ──────────────────────────── */

describe('hostile: `localStorage` throws on access', () => {
  /*
   * The failure mode people forget, and the only one on this page that takes
   * the whole app down rather than losing a preference. A browser with site
   * data blocked does not return `undefined` from `window.localStorage` — the
   * *getter throws a `SecurityError`*, so `typeof localStorage` and
   * `'localStorage' in window` are both useless as guards.
   */
  function withThrowingAccessor(run: () => void): void {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('The operation is insecure.', 'SecurityError')
      },
    })
    try {
      run()
    } finally {
      if (original) Object.defineProperty(globalThis, 'localStorage', original)
      else Reflect.deleteProperty(globalThis, 'localStorage')
    }
  }

  it('reads null and writes nothing, without ever throwing', () => {
    withThrowingAccessor(() => {
      const store = createCachedStore(KEY, isString, { owner: OWNER })
      expect(() => store.read()).not.toThrow()
      expect(store.read()).toBeNull()
      expect(() => store.write('ar')).not.toThrow()
    })
  })

  it('still behaves like the in-memory store for the life of the session', () => {
    withThrowingAccessor(() => {
      const store = createCachedStore(KEY, isString, { owner: OWNER })
      store.write('ar')
      // Degrades to exactly the pre-D16 behaviour rather than to nothing:
      // the operator keeps their choice until they reload.
      expect(store.read()).toBe('ar')
    })
  })

  it('lets the sign-out sweep run harmlessly', () => {
    withThrowingAccessor(() => {
      expect(() => clearCachedUiState(OWNER)).not.toThrow()
    })
  })

  it('lets the owner be set and forgotten without a store to remember it in', () => {
    withThrowingAccessor(() => {
      expect(() => setUiStateOwner('USR-9')).not.toThrow()
      expect(currentUiStateOwner()).toBe('USR-9')
      expect(() => setUiStateOwner(null)).not.toThrow()
    })
  })

  it('survives a storage object that throws on every method, not just the accessor', () => {
    const store = createCachedStore(KEY, isString, { owner: OWNER, storage: deniedStorage() })
    expect(store.read()).toBeNull()
    expect(() => store.write('ar')).not.toThrow()
    expect(store.read()).toBe('ar')
    expect(() => clearCachedUiState(OWNER, deniedStorage())).not.toThrow()
  })
})

/* ── hostile environment 2: the write fails ──────────────────────────────── */

describe('hostile: quota exceeded on write', () => {
  it('makes a failed write a no-op rather than an error the caller handles', () => {
    const storage = outOfQuotaStorage()
    const store = createCachedStore(KEY, isString, { owner: OWNER, storage })
    expect(() => store.write('ar')).not.toThrow()
    expect(storage.entries.size).toBe(0)
  })

  it('keeps the value for the session, so only the reload is lost', () => {
    const store = createCachedStore(KEY, isString, { owner: OWNER, storage: outOfQuotaStorage() })
    store.write('ar')
    expect(store.read()).toBe('ar')
  })

  it('does not report success — a later reader gets a miss, not a stale hit', () => {
    const storage = outOfQuotaStorage()
    createCachedStore(KEY, isString, { owner: OWNER, storage }).write('ar')
    expect(createCachedStore(KEY, isString, { owner: OWNER, storage }).read()).toBeNull()
  })

  it('does not throw on a value that cannot be serialised', () => {
    const storage = fakeStorage()
    const cyclic: { self?: unknown } = {}
    cyclic.self = cyclic
    const store = createCachedStore<object>(KEY, (v): v is object => typeof v === 'object', {
      owner: OWNER,
      storage,
    })
    expect(() => store.write(cyclic)).not.toThrow()
    expect(storage.entries.size).toBe(0)
  })
})

/* ── hostile environment 3: stale or malformed content ───────────────────── */

describe('hostile: the stored value is stale or malformed', () => {
  const poisoned = (raw: string): FakeStorage =>
    fakeStorage({ [uiStateCacheKey(OWNER, KEY)]: raw })

  it.each([
    ['truncated JSON', '{"v":1,"value":"a'],
    ['not JSON at all', 'ar'],
    ['a bare value with no envelope', '"ar"'],
    ['an envelope from an older schema', '{"v":0,"value":"ar"}'],
    ['an envelope from a newer schema', '{"v":99,"value":"ar"}'],
    ['an envelope with no value', '{"v":1}'],
    ['null', 'null'],
    ['an array where an envelope was expected', '[1,2,3]'],
  ])('treats %s as a cache miss, never an exception', (_label, raw) => {
    const storage = poisoned(raw)
    const store = createCachedStore(KEY, isString, { owner: OWNER, storage })
    expect(() => store.read()).not.toThrow()
    expect(store.read()).toBeNull()
  })

  it('rejects a well-formed envelope whose value is the wrong shape', () => {
    // The case a version bump does not catch: same schema, but the field was a
    // string last month and is a list this month. Without the validator this is
    // the "half-parsed object" that reaches a renderer as though it were a `T`.
    const storage = poisoned('{"v":1,"value":{"id":"name","edge":"start"}}')
    expect(createCachedStore(KEY, isStringList, { owner: OWNER, storage }).read()).toBeNull()
  })

  it('rejects a list that is only partly the right shape', () => {
    const storage = poisoned('{"v":1,"value":["name",7,null]}')
    expect(createCachedStore(KEY, isStringList, { owner: OWNER, storage }).read()).toBeNull()
  })

  it('evicts a rejected entry rather than re-parsing it on every render', () => {
    const storage = poisoned('{"v":1,"value":{"nope":true}}')
    const seen: unknown[] = []
    const isValid = (value: unknown): value is string => {
      seen.push(value)
      return typeof value === 'string'
    }
    const store = createCachedStore(KEY, isValid, { owner: OWNER, storage })
    store.read()
    expect(storage.entries.size).toBe(0)
    store.read()
    // Second read never reached the validator: there is nothing left to reject.
    expect(seen).toHaveLength(1)
  })

  it('falls back to the memory tier rather than to null when one exists', () => {
    const storage = poisoned('not json')
    const store = createCachedStore(KEY, isString, { owner: OWNER, storage })
    store.write('en')
    storage.entries.set(uiStateCacheKey(OWNER, KEY), 'corrupted after the write')
    expect(store.read()).toBe('en')
  })

  it('a value the validator accepts is returned unchanged, including a falsy one', () => {
    const storage = fakeStorage()
    const isNumber = (v: unknown): v is number => typeof v === 'number'
    const store = createCachedStore(KEY, isNumber, { owner: OWNER, storage })
    store.write(0)
    expect(createCachedStore(KEY, isNumber, { owner: OWNER, storage }).read()).toBe(0)
  })
})

/* ── hostile environment 4: there is no storage ──────────────────────────── */

describe('hostile: no storage at all', () => {
  it('renders defaults in a private window with storage absent', () => {
    const store = createCachedStore(KEY, isString, { owner: OWNER, storage: null })
    expect(store.read()).toBeNull()
    expect(() => store.write('ar')).not.toThrow()
  })

  it('is indistinguishable from a first run after site data is cleared', () => {
    const storage = fakeStorage()
    createCachedStore(KEY, isString, { owner: OWNER, storage }).write('ar')
    storage.entries.clear() // the operator cleared site data in another tab
    expect(createCachedStore(KEY, isString, { owner: OWNER, storage }).read()).toBeNull()
  })

  it('is indistinguishable from a first run in a different browser', () => {
    const laptop = fakeStorage()
    createCachedStore(KEY, isString, { owner: OWNER, storage: laptop }).write('ar')
    const loaner = fakeStorage()
    expect(createCachedStore(KEY, isString, { owner: OWNER, storage: loaner }).read()).toBeNull()
  })

  it('keeps the default store in memory when no validator is supplied', () => {
    // The opt-in boundary: without a guard there is no safe way to type a
    // parsed value, so the store stays exactly what it was before D16.
    const storage = fakeStorage()
    setUiStateOwner(OWNER)
    defaultUiStore<string>(KEY).write('ar')
    expect(storage.entries.size).toBe(0)
    resetDefaultUiStores()
    expect(defaultUiStore<string>(KEY).read()).toBeNull()
  })
})
