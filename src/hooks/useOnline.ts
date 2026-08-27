/**
 * Is the browser online? The producer for `ShellConditions.offline` and for the
 * auth card's `offline` condition (design §3.2, §4.5, §8.2).
 *
 * **`ShellConditions.offline` has existed since the shell was built and nothing
 * has ever set it.** 00-shell §11.6 row 20's banner and its copy are in the
 * dictionary; the flag was wired to a `setConditions` call no code makes, so
 * the state was unreachable in the product and reachable only from a test that
 * called the setter itself. The auth screens need the same signal and cannot
 * read a flag nobody sets, so this is the missing half.
 *
 * ## One implementation, and it lives here
 *
 * It was written in `src/shell/` while that directory had a different owner,
 * with a note asking for promotion. This is the promotion. Three consumers now
 * read it — the shell banner, the auth cards and the re-authentication modal —
 * and a shared three-line hook with three call sites is exactly what
 * `src/hooks/` is for.
 *
 * `useSyncExternalStore` rather than `useState` plus two listeners: the value
 * is external state that can change between the render and the subscribe, and
 * this is the API that closes that window. `getServerSnapshot` returns `true`,
 * because a server render has no network state to report and rendering
 * *"You're offline"* into static HTML is the one wrong answer.
 */

import { useCallback, useSyncExternalStore } from 'react'

function subscribe(onChange: () => void): () => void {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

export function useOnline(): boolean {
  const getSnapshot = useCallback(
    () => (typeof navigator === 'undefined' ? true : navigator.onLine),
    [],
  )
  const getServerSnapshot = useCallback(() => true, [])
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
