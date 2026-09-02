import { beforeEach, describe, expect, it } from 'vitest'

import { disableMockLatency, knownOperations, mockFailures } from '../config'
import { isApiError } from '../types/common'
import {
  UI_STATE_KEYS,
  UI_STATE_SCHEMA_VERSION,
  defaultUiStore,
  setUiStateOwner,
} from '../../lib/persistence'
import {
  DEFAULT_UI_STATE,
  PREFERENCE_OPERATIONS,
  cachedUiState,
  getUiState,
  isUiColumnPinList,
  isUiState,
  readUiState,
  resetMockUiState,
  resetPreferences,
  updateUiState,
  usePopulatedUiState,
  useUnknownUiStateVersion,
} from './preferences'

const OWNER = 'USR-1'

beforeEach(() => {
  disableMockLatency()
  setUiStateOwner(null)
  resetPreferences()
  setUiStateOwner(OWNER)
})

/* ── the seam's own four properties, for this client ─────────────────────── */

describe('the seam', () => {
  it('returns a Promise from both operations', async () => {
    const read = getUiState()
    expect(read).toBeInstanceOf(Promise)
    await expect(read).resolves.toBeDefined()
    await expect(updateUiState({ density: 'compact' })).resolves.toBeDefined()
  })

  it('registers both operation ids, so `?mockFail=preferences.get` reaches the fallback', async () => {
    await getUiState()
    await updateUiState({})
    expect(knownOperations()).toContain(PREFERENCE_OPERATIONS.get)
    expect(knownOperations()).toContain(PREFERENCE_OPERATIONS.update)
  })

  it('can be made to fail, in both directions', async () => {
    mockFailures.always(PREFERENCE_OPERATIONS.get)
    await expect(getUiState()).rejects.toSatisfy(isApiError)
    mockFailures.clear(PREFERENCE_OPERATIONS.get)

    mockFailures.always(PREFERENCE_OPERATIONS.update)
    await expect(updateUiState({ density: 'compact' })).rejects.toSatisfy(isApiError)
  })

  it('is deterministic — two reads return identical data', async () => {
    expect(await getUiState()).toStrictEqual(await getUiState())
  })
})

/* ── the bag ─────────────────────────────────────────────────────────────── */

describe('the bag', () => {
  it('serves the defaults on first run', async () => {
    const { state, discarded } = await getUiState()
    expect(discarded).toBe(false)
    expect(state).toStrictEqual(DEFAULT_UI_STATE)
  })

  it('has no `subTabNavCollapsed` — D5 removed the collapse and D16 deletes rather than migrates it', async () => {
    const { state } = await getUiState()
    expect(Object.keys(state).some((key) => /collaps/i.test(key))).toBe(false)
  })

  it('holds one field per `UI_STATE_KEYS` entry, so the bag and the cache namespace cannot drift', async () => {
    const { state } = await getUiState()
    const fields = Object.values(UI_STATE_KEYS).map((key) => key.replace(/^ui\./, ''))
    expect(fields.every((field) => field in state)).toBe(true)
    // The reverse direction: every field except the version is a named key.
    expect(Object.keys(state).filter((key) => key !== 'schemaVersion').sort()).toEqual(
      [...fields].sort(),
    )
  })

  it('round-trips a patch and does not accept a caller-supplied schema version', async () => {
    const written = await updateUiState({ density: 'compact', pageSize: 50 })
    expect(written.state.density).toBe('compact')
    expect(written.state.pageSize).toBe(50)
    expect(written.state.schemaVersion).toBe(UI_STATE_SCHEMA_VERSION)
    expect((await getUiState()).state.density).toBe('compact')
  })

  it('leaves untouched fields alone on a partial patch', async () => {
    await updateUiState({ language: 'ar' })
    await updateUiState({ density: 'compact' })
    const { state } = await getUiState()
    expect(state.language).toBe('ar')
    expect(state.density).toBe('compact')
  })

  it('reaches a populated layout without editing a fixture', async () => {
    usePopulatedUiState()
    const { state } = await getUiState()
    expect(state.columnPins['drivers.all']).toStrictEqual([{ id: 'name', edge: 'start' }])
    expect(state.paletteRecents.length).toBe(2)
  })
})

/* ── stale detection ─────────────────────────────────────────────────────── */

describe('a stale bag is detected, not trusted', () => {
  it('discards a whole bag written by a version this client does not know', () => {
    expect(readUiState({ ...DEFAULT_UI_STATE, schemaVersion: 99 })).toBeNull()
    expect(readUiState({ ...DEFAULT_UI_STATE, schemaVersion: 0 })).toBeNull()
    expect(readUiState({ ...DEFAULT_UI_STATE, schemaVersion: '1' })).toBeNull()
  })

  it.each([
    ['null', null],
    ['a string', 'ui-state'],
    ['a number', 7],
    ['an array', []],
    ['a bag with no version at all', { language: 'ar' }],
  ])('discards %s', (_label, value) => {
    expect(readUiState(value)).toBeNull()
    expect(isUiState(value)).toBe(false)
  })

  it('defaults one bad field rather than discarding the operator’s whole bag', () => {
    const state = readUiState({
      ...DEFAULT_UI_STATE,
      language: 'fr',
      density: 'cosy',
      pageSize: -3,
      paletteRecents: 'not a list',
    })
    expect(state).not.toBeNull()
    expect(state?.language).toBe('en')
    expect(state?.density).toBe('comfortable')
    expect(state?.pageSize).toBe(DEFAULT_UI_STATE.pageSize)
    expect(state?.paletteRecents).toStrictEqual([])
  })

  it('drops only the bad entries inside a record', () => {
    const state = readUiState({
      ...DEFAULT_UI_STATE,
      columnVisibility: { 'drivers.all': ['phone'], 'trips.all': 'nope', 'riders.all': [1, 2] },
    })
    expect(state?.columnVisibility).toStrictEqual({ 'drivers.all': ['phone'] })
  })

  it('rejects a pin list whose entries are last month’s shape', () => {
    // The case a version bump alone does not catch: same schema, different
    // element shape. Without this guard it reaches a renderer as a `ColumnPin`.
    expect(isUiColumnPinList([{ id: 'name', edge: 'start' }])).toBe(true)
    expect(isUiColumnPinList([{ id: 'name', side: 'left' }])).toBe(false)
    expect(isUiColumnPinList(['name'])).toBe(false)
    expect(isUiColumnPinList([{ id: 7, edge: 'start' }])).toBe(false)
    expect(isUiColumnPinList(null)).toBe(false)
  })

  it('ignores a field the server has and this client has not learned yet', () => {
    const state = readUiState({ ...DEFAULT_UI_STATE, somethingNew: { deep: true } })
    expect(state).toStrictEqual(DEFAULT_UI_STATE)
  })

  it('reports the discard so the screen can toast once, and re-defaults', async () => {
    useUnknownUiStateVersion()
    const { state, discarded } = await getUiState()
    expect(discarded).toBe(true)
    expect(state).toStrictEqual(DEFAULT_UI_STATE)
  })
})

/* ── the cache is a cache ────────────────────────────────────────────────── */

describe('the localStorage cache, which is never the truth', () => {
  it('writes through on a successful read', async () => {
    usePopulatedUiState()
    await getUiState()
    expect(cachedUiState()).toStrictEqual({
      language: 'ar',
      density: 'compact',
      pageSize: 50,
      paletteRecents: ['nav.operations.people', 'command.suspendDriver'],
    })
  })

  it('caches per-table column state under its own key, so a table paints without the bag', async () => {
    usePopulatedUiState()
    await getUiState()
    expect(
      defaultUiStore(`${UI_STATE_KEYS.columnPins}.drivers.all`, isUiColumnPinList).read(),
    ).toStrictEqual([{ id: 'name', edge: 'start' }])
  })

  it('lets the server overwrite a disagreeing cache — the server always wins', async () => {
    // `usePopulatedUiState` marks the mock hydrated, so this is a server bag
    // arriving over a warm cache rather than the mock-only seeding path.
    usePopulatedUiState() // the server says `compact`
    defaultUiStore(UI_STATE_KEYS.density, isUiDensityLocal).write('comfortable')
    expect(cachedUiState().density).toBe('comfortable')

    const { state } = await getUiState()
    expect(state.density).toBe('compact')
    expect(cachedUiState().density).toBe('compact')
  })

  it('never lets a cached value change what a fetch returns', async () => {
    usePopulatedUiState()
    defaultUiStore(UI_STATE_KEYS.language, isUiLanguageLocal).write('en')
    expect((await getUiState()).state.language).toBe('ar')
  })

  it('clears the cache when the bag is discarded, so a stale layout cannot outlive its schema', async () => {
    usePopulatedUiState()
    await getUiState()
    expect(cachedUiState().language).toBe('ar')

    useUnknownUiStateVersion()
    await getUiState()
    expect(cachedUiState()).toStrictEqual({})
  })

  it('is what makes a mock preference survive a reload, and nothing more', async () => {
    await updateUiState({ language: 'ar', density: 'compact' })
    // A reload is a fresh module: the "server" variable is gone, the cache is not.
    simulateReload()
    const { state } = await getUiState()
    expect(state.language).toBe('ar')
    expect(state.density).toBe('compact')
  })

  it('writes nothing to storage before an operator is known — the shift-change rule', async () => {
    setUiStateOwner(null)
    usePopulatedUiState()
    await getUiState()
    // Usable for the session (the memory tier took it), but nothing durable was
    // written under an unowned namespace, and signing in drops it.
    expect(localStorage.length).toBe(0)
    setUiStateOwner(OWNER)
    expect(cachedUiState()).toStrictEqual({})
  })

  it('renders defaults when the read fails, rather than an error state', async () => {
    mockFailures.always(PREFERENCE_OPERATIONS.get)
    const state = await getUiState().then(
      (result) => result.state,
      () => DEFAULT_UI_STATE,
    )
    expect(state).toStrictEqual(DEFAULT_UI_STATE)
  })
})

/* ── helpers ─────────────────────────────────────────────────────────────── */

const isUiDensityLocal = (value: unknown): value is 'comfortable' | 'compact' =>
  value === 'comfortable' || value === 'compact'

const isUiLanguageLocal = (value: unknown): value is 'en' | 'ar' =>
  value === 'en' || value === 'ar'

/**
 * What a reload does to the mock: the module bag is gone, the browser cache is
 * not, and every in-memory store tier is gone with the module graph.
 * `resetPreferences()` clears the cache too, which is right for isolation
 * between tests and wrong for this one assertion.
 */
function simulateReload(): void {
  resetMockUiState()
  setUiStateOwner(null) // drops the memory tier of every default store
  setUiStateOwner(OWNER)
}
