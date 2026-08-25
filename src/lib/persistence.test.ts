import { afterEach, describe, expect, it } from 'vitest'
import {
  UI_STATE_KEYS,
  createMemoryStore,
  createNullStore,
  defaultUiStore,
  resetDefaultUiStores,
} from './persistence'

afterEach(() => resetDefaultUiStores())

describe('the Q1 seam', () => {
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

  it('does not persist across a reload, which is the recorded AC-33 gap', () => {
    const before = createMemoryStore<boolean>()
    before.write(true)
    // A fresh module instance is what a reload produces.
    expect(createMemoryStore<boolean>().read()).toBeNull()
  })

  it('shares one value between two callers of the same default key', () => {
    defaultUiStore<boolean>(UI_STATE_KEYS.columnPins).write(true)
    expect(defaultUiStore<boolean>(UI_STATE_KEYS.columnPins).read()).toBe(true)
  })

  it('keeps different keys apart', () => {
    defaultUiStore<boolean>(UI_STATE_KEYS.columnPins).write(true)
    expect(defaultUiStore<string>(UI_STATE_KEYS.language).read()).toBeNull()
  })

  it('offers a null store for a caller that has opted out', () => {
    const store = createNullStore<boolean>()
    store.write(true)
    expect(store.read()).toBeNull()
  })

  it('names every key the shell persists, so a Q1 answer has the full list', () => {
    // The last two are **prefixes**, not keys: per-table column state is stored
    // under `<prefix>.<tableId>.<view>`, so a Q1 answer must wildcard them
    // rather than expect two literal entries.
    expect(Object.values(UI_STATE_KEYS)).toEqual([
      'ui.language',
      'ui.columnPins',
      'ui.columnVisibility',
    ])
  })
})
