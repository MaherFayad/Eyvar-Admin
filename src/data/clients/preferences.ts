/**
 * Preferences client — **D16**, `docs/05-restructure/DECISIONS.md`
 * § "D16 — Persistence".
 *
 * The home of **class 2**: unnamed per-operator preference. Column visibility,
 * column pins, page size, density, language, command-palette recents, and the
 * last view an operator chose on a sub-tab. One versioned bag, one endpoint
 * pair, per operator.
 *
 * The two classes that are **not** here, so nobody adds them:
 *
 * - **Class 1, URL-expressible** — `q`, `sort`, `page`, `filter`, `view`. Those
 *   live in the URL and only in the URL (`src/hooks/useUrlTableState.ts`). A
 *   filter that is also in a bag is two truths and the bag wins the race on
 *   mount.
 * - **Class 3, named artefacts** — saved reports, dashboards, alert rules, named
 *   saved filters, canned responses. Those have an owner, a name, an audit trail
 *   and a visibility, and they belong to their own domain client. **A draft
 *   canned response is class 3**: a half-written macro stored in a preferences
 *   blob is invisible to the library it belongs in.
 *
 * ## Why this is a new client and not `session.ts`
 *
 * `session.ts`'s `getPreferences`/`updatePreferences` were written before D16
 * and describe a different operation: `/me/preferences` returning
 * `UserPreferences`, a two-field bag with **no version** and with
 * `subTabNavCollapsed`, which D16 deletes rather than migrates. D16's wording is
 * that this client *"absorbs and widens"* them. It cannot adopt them in place —
 * `session.ts` belongs to mock-data-engineer and the retirement of
 * `UserPreferences` is a request, not an edit. Until that lands the old pair
 * still exists, has zero callers, and must gain none.
 *
 * ## The cache
 *
 * `lib/persistence.ts`'s `localStorage` adapter is a **paint accelerator and
 * never the source of truth**. Data flows one way — server → cache — and the
 * only writer of the cache in this file is a successful server response. On
 * `DATA_SOURCE='http'` nothing special happens: the cache paints first, the
 * fetch overwrites it, **the server always wins.**
 */

import { DATA_SOURCE } from '../config'
import { mock, mockMutation } from '../mock/delay'
import { DEFAULT_PAGE_SIZE } from '../types/common'
import {
  UI_STATE_KEYS,
  UI_STATE_SCHEMA_VERSION,
  clearCachedUiState,
  defaultUiStore,
} from '../../lib/persistence'
import { http } from './http'

export const PREFERENCE_OPERATIONS = {
  get: 'preferences.get',
  update: 'preferences.update',
} as const

/* ─────────────────────────────── the bag ───────────────────────────────── */

/** P1-T5's row density. Two values; a third would be a design decision, not a schema one. */
export type UiDensity = 'comfortable' | 'compact'

export const UI_DENSITIES: readonly UiDensity[] = ['comfortable', 'compact'] as const

/**
 * A pinned column. Structurally identical to `useColumnPinning`'s `ColumnPin`
 * and deliberately declared here instead of imported: the **server** owns the
 * shape a preference is stored in, and a hook's interface changing must not
 * silently change what a stored bag means.
 */
export interface UiColumnPin {
  readonly id: string
  readonly edge: 'start' | 'end'
}

/**
 * Everything class 2 holds, versioned.
 *
 * Every field maps onto an entry in `UI_STATE_KEYS` — D16 promotes that list
 * from a checklist to the schema, and `preferences.test.ts` asserts the mapping
 * so the bag and the cache namespace cannot drift.
 *
 * `subTabNavCollapsed` is **absent, not migrated**. D5 removed the collapse; a
 * preference nothing reads is a field the next migration has to reason about.
 */
export interface UiState {
  /**
   * The shape this bag was written in. **On a version this client does not
   * know it discards and re-defaults** rather than half-reading, and says so
   * once — see `UiStateResult.discarded`.
   */
  readonly schemaVersion: number
  /** §8.3. Legacy reseeds to `en` on every load (`eyvar_ops_panel_v40_fixed.html:2570`); that is the defect this fixes. */
  readonly language: 'en' | 'ar'
  readonly density: UiDensity
  /** Applied when the URL does not name one. The URL still wins — class 1 beats class 2. */
  readonly pageSize: number
  /** Hidden column ids, keyed `<tableId>.<view ?? 'all'>` — §7.6, column state is per table **and per view**. */
  readonly columnVisibility: Readonly<Record<string, readonly string[]>>
  /** Operator pins, keyed `<tableId>.<view ?? 'all'>`. */
  readonly columnPins: Readonly<Record<string, readonly UiColumnPin[]>>
  /** P3-T8 block ④, most-recent-first. Per operator, which is what makes them safe to render at rest. */
  readonly paletteRecents: readonly string[]
  /** The last view chosen per sub-tab, keyed by sub-tab id. */
  readonly lastView: Readonly<Record<string, string>>
}

/** Everything a client may write. `schemaVersion` is the server's, never the caller's. */
export type UiStatePatch = Partial<Omit<UiState, 'schemaVersion'>>

/**
 * What a read or a write returns.
 *
 * Not a bare `UiState`, because D16 requires the discard to be **visible**:
 * "On a version the client does not know, it discards and re-defaults … and it
 * says so in a toast, once." A screen cannot toast about something the client
 * swallowed.
 */
export interface UiStateResult {
  /** Always usable. The server's bag, or the defaults when it could not be read. */
  readonly state: UiState
  /** `true` when the server's bag was unreadable or a version this client does not know. */
  readonly discarded: boolean
}

/**
 * First run, and the fallback for every failure. **A failed preferences read is
 * not an `ErrorState`** — a column layout that will not load is not a reason to
 * withhold the table (D16).
 */
const UI_STATE_DEFAULTS: UiState = {
  schemaVersion: UI_STATE_SCHEMA_VERSION,
  language: 'en',
  density: 'comfortable',
  pageSize: DEFAULT_PAGE_SIZE,
  columnVisibility: {},
  columnPins: {},
  paletteRecents: [],
  lastView: {},
}

export const DEFAULT_UI_STATE: UiState = Object.freeze(UI_STATE_DEFAULTS)

/* ────────────────────────────── validators ─────────────────────────────── */
/*
 * Exported because they are what lets a hook's `defaultUiStore` call become a
 * cached store: `lib/persistence.ts` will not cache without a type guard, and
 * the guard belongs beside the schema it guards rather than being reinvented in
 * `src/hooks`.
 */

export function isUiLanguage(value: unknown): value is UiState['language'] {
  return value === 'en' || value === 'ar'
}

export function isUiDensity(value: unknown): value is UiDensity {
  return value === 'comfortable' || value === 'compact'
}

/** Positive integer. **Which sizes are *offered* is P1-T5's toolbar decision, not the schema's.** */
export function isUiPageSize(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

/** One string, for the `ui.lastView.<subTabId>` entries. */
export function isUiViewName(value: unknown): value is string {
  return typeof value === 'string'
}

export function isUiStringList(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

export function isUiColumnPinList(value: unknown): value is readonly UiColumnPin[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry): boolean =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as { id?: unknown }).id === 'string' &&
        ((entry as { edge?: unknown }).edge === 'start' ||
          (entry as { edge?: unknown }).edge === 'end'),
    )
  )
}

export function isUiState(value: unknown): value is UiState {
  return readUiState(value) !== null
}

/**
 * The one place a bag of `unknown` becomes a `UiState`, or does not.
 *
 * Two levels, and the difference matters:
 *
 * - **Wrong version, or not an object → `null`.** The whole bag is discarded and
 *   re-defaulted. This is D16's rule verbatim.
 * - **Right version, one bad field → that field defaults.** Not a discard: a
 *   server that adds a field this client has not learned yet, or one bad entry
 *   in `columnPins`, must not cost the operator their language. Every field is
 *   either valid or the default; **no field is ever half-read.**
 */
export function readUiState(value: unknown): UiState | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const raw = value as Record<string, unknown>
  if (raw.schemaVersion !== UI_STATE_SCHEMA_VERSION) return null

  return {
    schemaVersion: UI_STATE_SCHEMA_VERSION,
    language: isUiLanguage(raw.language) ? raw.language : DEFAULT_UI_STATE.language,
    density: isUiDensity(raw.density) ? raw.density : DEFAULT_UI_STATE.density,
    pageSize: isUiPageSize(raw.pageSize) ? raw.pageSize : DEFAULT_UI_STATE.pageSize,
    columnVisibility: readRecord(raw.columnVisibility, isUiStringList),
    columnPins: readRecord(raw.columnPins, isUiColumnPinList),
    paletteRecents: isUiStringList(raw.paletteRecents)
      ? [...raw.paletteRecents]
      : DEFAULT_UI_STATE.paletteRecents,
    lastView: readRecord(raw.lastView, isUiViewName),
  }
}

/* ─────────────────────────────── the cache ─────────────────────────────── */

/**
 * The cached bag, synchronously, for the first paint.
 *
 * `Partial`, and that is the honest type: `localStorage` is not a store and any
 * subset of it may be missing, stale or in a browser the operator has never used.
 * **A screen must render correctly from `{}`** — the cache is an accelerator,
 * and every caller merges it over `DEFAULT_UI_STATE`.
 */
export function cachedUiState(): UiStatePatch {
  const patch: {
    language?: UiState['language']
    density?: UiDensity
    pageSize?: number
    paletteRecents?: readonly string[]
  } = {}
  const language = defaultUiStore(UI_STATE_KEYS.language, isUiLanguage).read()
  if (language !== null) patch.language = language
  const density = defaultUiStore(UI_STATE_KEYS.density, isUiDensity).read()
  if (density !== null) patch.density = density
  const pageSize = defaultUiStore(UI_STATE_KEYS.pageSize, isUiPageSize).read()
  if (pageSize !== null) patch.pageSize = pageSize
  const recents = defaultUiStore(UI_STATE_KEYS.paletteRecents, isUiStringList).read()
  if (recents !== null) patch.paletteRecents = recents
  /*
   * `columnVisibility`, `columnPins` and `lastView` are **prefixes, not keys** —
   * one entry per table, view and sub-tab. There is no way to enumerate them
   * from here without a second index, and the hooks that own them read their own
   * key directly through `defaultUiStore`. That is the whole reason the cache is
   * per key rather than one blob: `useColumnPinning` paints from
   * `ui.columnPins.<tableId>.<view>` without waiting for the bag.
   */
  return patch
}

/**
 * Fan a server bag out into the per-key cache. **The only writer of the cache in
 * this file**, and it runs only on a successful server response — which is what
 * "write-through cache, never the truth" means mechanically.
 */
function writeUiStateToCache(state: UiState): void {
  defaultUiStore(UI_STATE_KEYS.language, isUiLanguage).write(state.language)
  defaultUiStore(UI_STATE_KEYS.density, isUiDensity).write(state.density)
  defaultUiStore(UI_STATE_KEYS.pageSize, isUiPageSize).write(state.pageSize)
  defaultUiStore(UI_STATE_KEYS.paletteRecents, isUiStringList).write(state.paletteRecents)
  for (const [scope, hidden] of Object.entries(state.columnVisibility)) {
    defaultUiStore(`${UI_STATE_KEYS.columnVisibility}.${scope}`, isUiStringList).write(hidden)
  }
  for (const [scope, pins] of Object.entries(state.columnPins)) {
    defaultUiStore(`${UI_STATE_KEYS.columnPins}.${scope}`, isUiColumnPinList).write(pins)
  }
  for (const [subTabId, view] of Object.entries(state.lastView)) {
    defaultUiStore(`${UI_STATE_KEYS.lastView}.${subTabId}`, isUiViewName).write(view)
  }
}

/* ─────────────────────────────── reads ─────────────────────────────────── */

/**
 * GET /api/v1/me/ui-state
 *   params: none — the server reads the auth cookie
 *   -> UiState
 *
 * A registered operation id, so QA can fail it from the URL like every other
 * read (`?mockFail=preferences.get`). **On failure the screen renders defaults,
 * not an `ErrorState`** — D16 — which means the caller catches and falls back to
 * `DEFAULT_UI_STATE` rather than showing the table's error surface.
 */
export async function getUiState(signal?: AbortSignal): Promise<UiStateResult> {
  if (DATA_SOURCE === 'http') {
    return receive(await http.get<unknown>('/me/ui-state', undefined, { signal }))
  }
  return mock(PREFERENCE_OPERATIONS.get, signal, () => receive(hydratedMockState()))
}

/**
 * PATCH /api/v1/me/ui-state
 *   body: Partial<UiState> — `schemaVersion` is the server's and is not accepted
 *   -> UiState
 *
 * **A silent write failure is how a preference appears to work for a week and
 * then does not** (D16): this rejects, and the caller owes the operator a toast
 * saying the preference did not stick.
 */
export async function updateUiState(
  patch: UiStatePatch,
  signal?: AbortSignal,
): Promise<UiStateResult> {
  if (DATA_SOURCE === 'http') {
    return receive(await http.patch<unknown>('/me/ui-state', patch, { signal }))
  }
  return mockMutation(PREFERENCE_OPERATIONS.update, signal, () => {
    const current = readUiState(hydratedMockState()) ?? DEFAULT_UI_STATE
    mockState = { ...current, ...patch, schemaVersion: UI_STATE_SCHEMA_VERSION }
    return receive(mockState)
  })
}

/**
 * Normalise a server response and write it through. The discard is reported
 * rather than swallowed, and a discarded bag **clears the cache** — keeping
 * entries a version bump orphaned is how a stale layout outlives the schema that
 * made sense of it.
 */
function receive(raw: unknown): UiStateResult {
  const state = readUiState(raw)
  if (state === null) {
    clearCachedUiState()
    return { state: DEFAULT_UI_STATE, discarded: true }
  }
  writeUiStateToCache(state)
  return { state, discarded: false }
}

/* ───────────────────────── mock-only affordances ───────────────────────── */

let mockState: unknown = { ...DEFAULT_UI_STATE }
let mockHydrated = false

/**
 * **The one reason the cache is worth building before a backend exists**, and it
 * is stated so nobody mistakes it for architecture (D16).
 *
 * In mock mode the "server" is a module variable, so it resets on every reload
 * and no preference would ever survive one. Seeding it from the cache **once per
 * session** makes reload-survival real without breaking "the server always
 * wins": the server is still the only thing `getUiState` returns; in mock mode
 * it is merely seeded from the cache instead of from a database.
 *
 * Idempotent, so two calls return identical data — the seam's determinism rule.
 */
function hydratedMockState(): unknown {
  if (mockHydrated) return mockState
  mockHydrated = true
  const cached = cachedUiState()
  if (Object.keys(cached).length > 0) {
    mockState = { ...(readUiState(mockState) ?? DEFAULT_UI_STATE), ...cached }
  }
  return mockState
}

/**
 * Serve a bag written by a schema this client does not know, so QA can reach the
 * discard-and-re-default path and its once-only toast without editing a fixture.
 */
export function useUnknownUiStateVersion(): void {
  mockHydrated = true
  mockState = { ...DEFAULT_UI_STATE, schemaVersion: UI_STATE_SCHEMA_VERSION + 1 }
}

/** Serve a bag with a column layout and recents already in it. */
export function usePopulatedUiState(): void {
  mockHydrated = true
  mockState = {
    ...DEFAULT_UI_STATE,
    language: 'ar',
    density: 'compact',
    pageSize: 50,
    columnVisibility: { 'drivers.all': ['phone', 'city'] },
    columnPins: { 'drivers.all': [{ id: 'name', edge: 'start' }] },
    paletteRecents: ['nav.operations.people', 'command.suspendDriver'],
    lastView: { 'operations-people': 'suspended' },
  }
}

/**
 * Reset the mock bag and its hydration flag, **leaving the cache alone**.
 *
 * This is precisely what a reload does: the module variable standing in for the
 * server is gone, the browser's cache is not. Exported so that behaviour is
 * assertable rather than inferred.
 */
export function resetMockUiState(): void {
  mockState = { ...DEFAULT_UI_STATE }
  mockHydrated = false
}

/**
 * Reset the mock bag, its hydration flag, **and** the cache it was seeded from.
 *
 * **Not yet wired into `resetDataLayer()`.** That function sits mid-file in
 * `clients/index.ts` and several agents are appending to that barrel at once, so
 * editing its body would corrupt their work. Raised in the handoff; until then a
 * test that touches preferences calls this itself.
 */
export function resetPreferences(): void {
  resetMockUiState()
  clearCachedUiState(null)
}

/* ─────────────────────────────── helpers ───────────────────────────────── */

function readRecord<T>(
  value: unknown,
  isValid: (entry: unknown) => entry is T,
): Readonly<Record<string, T>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}
  const out: Record<string, T> = {}
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (isValid(entry)) out[key] = entry
  }
  return out
}
