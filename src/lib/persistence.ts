/**
 * The one seam for persisted operator UI state.
 *
 * **Q1 is closed by D16** (`docs/05-restructure/DECISIONS.md` § "D16 —
 * Persistence"). The ruling, in the three sentences this file has to obey:
 *
 * 1. **URL-expressible state — `q`, `sort`, `page`, `filter`, `view` — never
 *    comes here.** It lives in the URL and only in the URL (`useUrlTableState`).
 *    A filter that is also in a store is two truths and the store wins the race
 *    on mount.
 * 2. **Unnamed per-operator preference** — column layout, pins, page size,
 *    density, language, palette recents, last-used view — is a **server**
 *    resource behind `src/data/clients/preferences.ts`.
 * 3. **This file gains exactly one `localStorage` adapter, and it is a
 *    per-operator write-through cache that is never the truth.** On
 *    `DATA_SOURCE='http'` nothing special happens: the cache paints first, the
 *    server response overwrites it, **the server always wins.** A cache that can
 *    override a fetch is not a cache.
 *
 * ## Why the adapter looks like this
 *
 * `localStorage` is not a reliable store and the entire cost of this file is
 * refusing to treat it as one. Five things it must survive, each of which is a
 * real browser and not a hypothetical:
 *
 * | Hostile environment | What the adapter does |
 * |---|---|
 * | Private window / third-party cookies blocked — **the accessor itself throws** | `resolveStorage` reads `globalThis.localStorage` inside a `try`. This is the one that takes the whole app down rather than losing a preference. |
 * | Quota exceeded on write | `write` is a **no-op**, not a rejection. The value stays in the memory tier for the session. |
 * | Cleared site data, different browser, first run | A miss. `read()` returns `null` and the screen renders defaults. |
 * | Malformed content — half a JSON blob, a value written by hand | A miss, and the poisoned key is evicted so it is not re-parsed on every render. |
 * | **Stale** content — a bag written by an older shape of the app | A miss. Detected three ways; see `decode` and the note on `UiStateValidator`. |
 *
 * **The contract, stated so a call site never has to think about it:** a read
 * returns the cached value or the absence of one — never an exception, never a
 * half-parsed object. A write that fails is a no-op, not an error the caller
 * handles. **If you are adding a `try`/`catch` at a call site, this file is
 * wrong.** The screen renders correctly with no stored value, always.
 *
 * ## Per operator, never per tenant
 *
 * D16: two operators share a machine at shift change. One browser's
 * `localStorage` then holds the other's column layout and recents under no
 * identity at all — and **"what did I just do" is a privacy surface**. So every
 * cache key carries the operator id (`setUiStateOwner`), an unowned store
 * degrades to memory rather than writing to a shared namespace, and changing the
 * owner drops the memory tier as well as re-pointing the storage tier.
 */

/* ─────────────────────────── the interface ─────────────────────────────── */

export interface UiStateStore<T> {
  /** The stored value, or `null` when nothing has been stored yet. */
  read(): T | null
  write(value: T): void
}

/**
 * The guard that turns "some JSON parsed" into "a `T`".
 *
 * **Required by every cached store, and that is the point.** `JSON.parse`
 * returns `unknown`; casting it to `T` is how a value written by last month's
 * column shape reaches a renderer as though it were this month's. The validator
 * is what makes a stale cache entry a **miss** rather than a crash three screens
 * away, and it is why `createCachedStore` cannot be called without one.
 */
export type UiStateValidator<T> = (value: unknown) => value is T

/**
 * The slice of `Storage` this file uses. Narrower than the DOM `Storage`
 * interface so a test can supply a hostile one in four lines — `window
 * .localStorage` is structurally assignable to it.
 */
export interface StorageLike {
  readonly length: number
  key(index: number): string | null
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/* ───────────────────────── in-memory adapters ──────────────────────────── */

/**
 * In-memory, per-store. Survives route changes and re-renders because the store
 * instance outlives the component; does not survive reload. Still the base tier
 * of every cached store, because it is what a private window degrades to.
 */
export function createMemoryStore<T>(initial: T | null = null): UiStateStore<T> {
  let value: T | null = initial
  return {
    read: () => value,
    write: (next: T) => {
      value = next
    },
  }
}

/**
 * A store that reads and writes nothing. For a test that wants the first-run
 * path on every render, and for a caller that has explicitly opted out.
 */
export function createNullStore<T>(): UiStateStore<T> {
  return {
    read: () => null,
    write: () => undefined,
  }
}

/* ──────────────────────── the operator namespace ───────────────────────── */

/**
 * Bumped when the meaning of a stored value changes in a way an older bag
 * cannot express. It is in the **cache key**, so a bump orphans every old entry
 * instead of reading it, and in the **envelope**, so a value written by anything
 * other than this adapter is a miss rather than a guess (D16: "a preference bag
 * with no version is a migration you cannot write").
 *
 * The server bag in `clients/preferences.ts` imports this constant rather than
 * declaring a second one — one version number, or the cache and the bag can
 * disagree about which shape they hold.
 */
export const UI_STATE_SCHEMA_VERSION = 1

/** Every cache key this app writes starts here, so the sign-out sweep can find them all. */
export const UI_STATE_CACHE_PREFIX = 'eyvar'

/** `eyvar.<schemaVersion>.<userId>.<key>` — D16, "The cache is keyed". */
export function uiStateCacheKey(
  owner: string,
  key: string,
  schemaVersion: number = UI_STATE_SCHEMA_VERSION,
): string {
  return `${UI_STATE_CACHE_PREFIX}.${schemaVersion}.${owner}.${key}`
}

/**
 * Where the operator id itself is remembered. **Not namespaced**, because it is
 * what the namespace is built from.
 */
const UI_STATE_OWNER_KEY = `${UI_STATE_CACHE_PREFIX}.owner`

/**
 * **Seeded from storage at module load, and that is load-bearing rather than an
 * optimisation.**
 *
 * The owner can only be *confirmed* by `GET /session`, which is asynchronous.
 * Every hook that persists UI state reads its store in a `useState` initialiser
 * during the first render — long before that resolves. So an owner that is only
 * ever set from the session response is set too late to matter: the seed reads
 * an unowned store, gets `null`, and no stored preference is ever restored. The
 * cache passes every test, returns the correct empty result every time, and is
 * **inert**. Measured, not assumed: with the owner set from an effect the
 * restored column set is `[]`; with it known before the first render it is the
 * stored one.
 *
 * A cache that cannot be read until a fetch completes is not a paint
 * accelerator, and D16 asks for a paint accelerator — *"the `localStorage` cache
 * still paints first, and the server response overwrites it"*.
 *
 * **Why remembering it does not reopen the shift-change leak.** The remembered
 * id survives only a reload that was *not* a sign-out — sign-out sweeps it with
 * everything else. A browser resuming a session nobody signed out of is still
 * that operator's session, because the auth cookie decides who is signed in and
 * this value does not. The moment `getSession` disagrees, `setUiStateOwner`
 * replaces it and drops the memory tier.
 */
let uiStateOwnerId: string | null = rememberedUiStateOwner()

/** The operator every cached store namespaces by, or `null` before a first sign-in. */
export function currentUiStateOwner(): string | null {
  return uiStateOwnerId
}

function rememberedUiStateOwner(): string | null {
  const storage = resolveStorage()
  if (storage === null) return null
  const raw = safeGetItem(storage, UI_STATE_OWNER_KEY)
  return typeof raw === 'string' && raw.length > 0 ? raw : null
}

function rememberUiStateOwner(userId: string | null): void {
  const storage = resolveStorage()
  if (storage === null) return
  if (userId === null) safeRemoveItem(storage, UI_STATE_OWNER_KEY)
  else safeSetItem(storage, UI_STATE_OWNER_KEY, userId)
}

/**
 * Point the cache at an operator. Called once the session resolves, and with
 * `null` on sign-out.
 *
 * **Dropping the default stores is not housekeeping, it is the shift-change
 * fix.** The memory tier is what survives when storage is unavailable; leaving
 * it populated across an operator change would paint the previous operator's
 * column layout and recents for the next one, which is exactly the leak D16
 * rejects `localStorage`-as-the-store for.
 */
export function setUiStateOwner(userId: string | null): void {
  if (userId === uiStateOwnerId) return
  uiStateOwnerId = userId
  /* Remembered so the *next* boot knows the namespace during its first render
     rather than one async hop later. See the note on `uiStateOwnerId`. */
  rememberUiStateOwner(userId)
  resetDefaultUiStores()
}

/* ───────────────────── the localStorage adapter ────────────────────────── */

export interface CachedStoreOptions {
  /**
   * Overrides the signed-in operator. Tests, and nothing else — a screen that
   * knows better than `setUiStateOwner` who is signed in is a bug.
   */
  owner?: string | null
  /**
   * Overrides the backing storage. `null` means "there is none", which is the
   * private-window path; omitted means `globalThis.localStorage`, probed safely.
   */
  storage?: StorageLike | null
  schemaVersion?: number
}

/**
 * A `UiStateStore<T>` backed by `localStorage`, in front of an in-memory tier.
 *
 * Read order is **storage, then memory**: storage is shared across tabs and is
 * therefore the fresher of the two, and falling back to memory is what makes a
 * private window and a quota failure degrade to today's behaviour instead of to
 * nothing.
 *
 * Neither method throws. Ever. That is the whole contract.
 */
export function createCachedStore<T>(
  key: string,
  isValid: UiStateValidator<T>,
  options: CachedStoreOptions = {},
): UiStateStore<T> {
  const schemaVersion = options.schemaVersion ?? UI_STATE_SCHEMA_VERSION
  const memory = createMemoryStore<T>()
  /* Resolved per call, never at construction: the owner changes at sign-in, and
     a test may replace `globalThis.localStorage` after the store is built. */
  const owner = (): string | null =>
    options.owner !== undefined ? options.owner : currentUiStateOwner()

  return {
    read(): T | null {
      const fallback = memory.read()
      const who = owner()
      if (who === null) return fallback
      const storage = resolveStorage(options.storage)
      if (storage === null) return fallback

      const cacheKey = uiStateCacheKey(who, key, schemaVersion)
      const raw = safeGetItem(storage, cacheKey)
      if (raw === null) return fallback

      const decoded = decode(raw, schemaVersion)
      if (decoded === null || !isValid(decoded.value)) {
        /* Stale or malformed. Evict rather than re-parse it on every render —
           and evicting is safe because a value we will never accept is not
           somebody else's data, it is our own dead cache entry. */
        safeRemoveItem(storage, cacheKey)
        return fallback
      }
      return decoded.value
    },

    write(value: T): void {
      /* Memory first and unconditionally, so a quota failure costs the reload
         and not the session. */
      memory.write(value)
      const who = owner()
      if (who === null) return
      const storage = resolveStorage(options.storage)
      if (storage === null) return
      const raw = encode(value, schemaVersion)
      if (raw === null) return
      safeSetItem(storage, uiStateCacheKey(who, key, schemaVersion), raw)
    },
  }
}

/**
 * Forget cached UI state. **Call this on sign-out** — D16: "the cache … is
 * cleared on sign-out".
 *
 * With an `owner`, sweeps that operator's namespace. Without one, sweeps every
 * `eyvar.*` entry, which is the right default for a sign-out that no longer
 * knows who is leaving: over-clearing costs a repaint, under-clearing leaks the
 * previous operator's layout to the next one.
 *
 * **Drops the memory tier too, unconditionally and before touching storage.**
 * Forgetting one tier and not the other is not forgetting: a store whose
 * storage entry is gone still answers from memory, which is how a cleared cache
 * keeps painting the value it was told to forget.
 */
export function clearCachedUiState(owner?: string | null, storage?: StorageLike | null): void {
  resetDefaultUiStores()
  const store = resolveStorage(storage)
  if (store === null) return

  const doomed: string[] = []
  try {
    for (let i = 0; i < store.length; i += 1) {
      const found = store.key(i)
      if (found === null) continue
      const parts = found.split('.')
      if (parts[0] !== UI_STATE_CACHE_PREFIX) continue
      /* parts: [prefix, schemaVersion, owner, ...key]. The version is not
         pinned, so a sign-out clears entries left by an earlier schema too.
         `eyvar.owner` has no operator segment, so a per-operator sweep leaves
         it and a full sweep — which is what sign-out does — takes it. */
      if (owner != null && parts[2] !== owner) continue
      doomed.push(found)
    }
  } catch {
    /* Enumeration itself can throw when storage is disabled mid-session. */
    return
  }
  for (const key of doomed) safeRemoveItem(store, key)
}

/* ─────────────────────────── the default store ─────────────────────────── */

/**
 * The default every shell hook uses when no store is injected.
 *
 * Module-scoped and keyed, so one key read from two components shares one value
 * rather than two.
 *
 * **Pass `isValid` and the store becomes the D16 write-through cache; omit it
 * and it stays in memory.** That conditional is deliberate and is the one place
 * this file departs from P1-T4's "with no call-site change": a cached store
 * without a validator would have to cast `JSON.parse`'s `unknown` to `T`, which
 * is precisely the half-parsed object the ruling forbids. Three call sites need
 * a one-line change to opt in — `useLanguage`, `useColumnVisibility`,
 * `useColumnPinning` — and the validators they need are exported from
 * `@/data/clients` beside the schema they validate.
 *
 * The first call for a key decides which kind it is; a later call with a
 * different validator gets the store that already exists.
 */
const defaultStores = new Map<string, UiStateStore<unknown>>()

export function defaultUiStore<T>(key: string, isValid?: UiStateValidator<T>): UiStateStore<T> {
  let store = defaultStores.get(key)
  if (!store) {
    store = isValid
      ? (createCachedStore<T>(key, isValid) as UiStateStore<unknown>)
      : createMemoryStore<unknown>()
    defaultStores.set(key, store)
  }
  return store as UiStateStore<T>
}

/**
 * Test seam: forget every default store. Called from `resetSharedLayer` and from
 * `setUiStateOwner`. Drops the **memory** tier only — storage is
 * `clearCachedUiState`'s job, because a test that wants a warm cache across two
 * renders needs exactly this asymmetry.
 */
export function resetDefaultUiStores(): void {
  defaultStores.clear()
}

/* ───────────────────────────── the schema ──────────────────────────────── */

/**
 * The keys the shell persists.
 *
 * **D16 promotes this from a checklist to the schema**: "That list exists
 * precisely so a Q1 implementation does not discover thirty-four unlisted keys.
 * **It is now the schema.**" Every entry here has a field on `UiState` in
 * `src/data/clients/preferences.ts`, and `preferences.test.ts` asserts that
 * mapping so the two cannot drift.
 *
 * `ui.subTabNavCollapsed` is **absent and stays absent** — D5 removed the
 * collapse and D16 deletes rather than migrates the preference.
 */
export const UI_STATE_KEYS = {
  /** foundation spec §8.3 `ui.language`. Legacy reseeds to `en` on every load (`:2570`); that is the defect. */
  language: 'ui.language',
  /**
   * The colour theme: `light`, `dark`, or `system` (the default).
   *
   * Class 2 under D16 — a per-operator display choice with no record in it,
   * which is why it stores beside `density` rather than going to the server. A
   * dispatcher on nights and a finance operator on days share a console and
   * should not share a theme.
   *
   * `system` is the default and is a real third value, not the absence of a
   * choice: it follows `prefers-color-scheme` for the life of the session, so
   * an operator whose machine flips at sunset flips with it. Storing only
   * `light | dark` would make "follow my machine" unexpressible.
   */
  theme: 'ui.theme',
  /**
   * **Prefix, not a key.** Column pins are per table *and per view* (§7.6), so
   * `useColumnPinning` stores under `ui.columnPins.<tableId>.<view>`.
   */
  columnPins: 'ui.columnPins',
  /** **Prefix.** `useColumnVisibility` stores hidden ids under `ui.columnVisibility.<tableId>.<view>`. */
  columnVisibility: 'ui.columnVisibility',
  /** P1-T5. Row density for every index table. Class 2 under D16. */
  density: 'ui.density',
  /** P1-T5. The operator's chosen page size, applied when the URL does not name one. */
  pageSize: 'ui.pageSize',
  /**
   * P3-T8 block ④. Recent command ids, most-recent-first. **Per operator is
   * what makes these safe to render at rest** — a shift-change console showing
   * the previous operator's last five commands is a leak with a keyboard
   * shortcut (D16).
   */
  paletteRecents: 'ui.paletteRecents',
  /** **Prefix.** The last view an operator chose on a sub-tab: `ui.lastView.<subTabId>`. */
  lastView: 'ui.lastView',
  /** Whether alert firings arrive as one daily digest instead of singly (WP-5.6). Off by default. */
  alertDigest: 'ui.alertDigest',
} as const

/* ────────────────────────────── internals ──────────────────────────────── */

/**
 * `globalThis.localStorage`, or `null`.
 *
 * **The property access is inside the `try` on purpose.** When a browser blocks
 * site data the accessor *throws a `SecurityError`* rather than returning
 * `undefined`, and an unguarded read at module scope takes down the whole app —
 * the failure mode that loses the console rather than a preference.
 */
function resolveStorage(explicit?: StorageLike | null): StorageLike | null {
  if (explicit !== undefined) return explicit
  try {
    const candidate = (globalThis as { localStorage?: StorageLike | null }).localStorage
    return candidate ?? null
  } catch {
    return null
  }
}

function safeGetItem(storage: StorageLike, key: string): string | null {
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

function safeSetItem(storage: StorageLike, key: string, value: string): void {
  try {
    storage.setItem(key, value)
  } catch {
    /* Quota exceeded, or storage disabled since the read. A cache that cannot
       be written is a cache miss next time, not a failure the caller handles. */
  }
}

function safeRemoveItem(storage: StorageLike, key: string): void {
  try {
    storage.removeItem(key)
  } catch {
    /* Same. Eviction is best-effort; a surviving bad entry is re-rejected. */
  }
}

/**
 * The stored envelope: `{"v":<schemaVersion>,"value":<json>}`.
 *
 * The version is already in the key, so this second check is not redundancy for
 * its own sake — it is what makes a value written under the same key by
 * **anything other than this adapter** a miss instead of a `T`.
 */
function decode(raw: string, schemaVersion: number): { value: unknown } | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
  const envelope = parsed as { v?: unknown; value?: unknown }
  if (envelope.v !== schemaVersion) return null
  if (!('value' in envelope)) return null
  return { value: envelope.value }
}

/** `null` when the value cannot be serialised — a cycle, a `BigInt`, `undefined`. */
function encode(value: unknown, schemaVersion: number): string | null {
  try {
    const raw = JSON.stringify({ v: schemaVersion, value })
    return typeof raw === 'string' ? raw : null
  } catch {
    return null
  }
}
