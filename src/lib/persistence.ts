/**
 * The one seam for persisted shell UI state.
 *
 * **Q1 is unanswered.** `ui.subTabNavCollapsed`, `ui.language` and per-table view
 * state have nowhere to live (foundation spec §12.2, design spec finding F-7),
 * and until the engineering lead answers, the shell holds them in memory and
 * **fails AC-33 explicitly, as a recorded gap**. That is the decision already
 * taken; this file exists so acting on the answer is one file, not thirty-four.
 *
 * There is deliberately **no** `localStorage` adapter here. Shipping one would
 * be answering Q1 by writing code, and two agents inventing the same missing
 * decision differently is exactly the failure this seam prevents. When Q1 lands,
 * add the adapter here and change `defaultUiStore`. Nothing else moves.
 */

export interface UiStateStore<T> {
  /** The stored value, or `null` when nothing has been stored yet. */
  read(): T | null
  write(value: T): void
}

/**
 * In-memory, per-store. Survives route changes and re-renders because the store
 * instance outlives the component; does **not** survive reload, which is the
 * whole of the AC-33 gap.
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

/**
 * The default every shell hook uses when no store is injected.
 *
 * Module-scoped and keyed, so `useNavCollapse()` in two components shares one
 * value rather than two. Swap the body of this function when Q1 is answered.
 */
const defaultStores = new Map<string, UiStateStore<unknown>>()

export function defaultUiStore<T>(key: string): UiStateStore<T> {
  let store = defaultStores.get(key)
  if (!store) {
    store = createMemoryStore<unknown>()
    defaultStores.set(key, store)
  }
  return store as UiStateStore<T>
}

/** Test seam: forget every default store. Called from `resetSharedLayer`. */
export function resetDefaultUiStores(): void {
  defaultStores.clear()
}

/** The keys the shell persists, so a Q1 implementation has the full list in one place. */
export const UI_STATE_KEYS = {
  /** foundation spec §8.3 `ui.subTabNavCollapsed`, AC-33. */
  subTabNavCollapsed: 'ui.subTabNavCollapsed',
  /** foundation spec §8.3 `ui.language`. Reseeded to `en` on every load today (`:2570`). */
  language: 'ui.language',
} as const
