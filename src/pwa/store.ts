/**
 * A twenty-line external store, for the three pieces of PWA state that arrive
 * from outside React: read staleness, update readiness, and the browser's
 * install prompt.
 *
 * `useSyncExternalStore` rather than a context and a `useState`, for the same
 * reason `useOnline` in `src/hooks/` gives: every one of these is external state
 * that can change between a render and the subscription, and this is the API
 * that closes that window. It also means the producers (`register.ts`, the
 * `beforeinstallprompt` listener) can run before React mounts — which they must,
 * because `beforeinstallprompt` fires once and is not replayed.
 *
 * `getSnapshot` must return a **stable reference** or React re-renders forever,
 * so the snapshot is stored, not computed.
 */

export interface Store<T> {
  get(): T
  set(next: T): void
  subscribe(listener: () => void): () => void
}

export function createStore<T>(initial: T): Store<T> {
  let value = initial
  const listeners = new Set<() => void>()
  return {
    get: () => value,
    set(next: T) {
      if (Object.is(next, value)) return
      value = next
      for (const listener of listeners) listener()
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
