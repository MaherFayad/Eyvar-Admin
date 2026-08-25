/**
 * The sub-tab column's collapsed state. Foundation spec §3.9, design spec §3.3,
 * **AC-32** and **AC-33**.
 *
 * §3.3 exists because someone will "improve" this:
 *
 * > Default is derived from viewport **at first run only** — collapsed below
 * > 1344px, expanded at or above it. **Never auto-toggled by a resize
 * > afterwards.** Collapsing a nav out from under an operator mid-task is worse
 * > than a narrow column.
 *
 * So this file has **no resize listener, no `matchMedia` subscription and no
 * effect that re-reads the viewport**. The viewport is read exactly once, in a
 * lazy `useState` initialiser, and only when nothing has been stored. If you are
 * adding a listener here, read §3.3 first — the design names this behaviour as
 * the single most important thing not to get wrong.
 *
 * **AC-33 fails, and that is recorded, not hidden.** Persistence across reload
 * needs **Q1**, which is unanswered (finding F-7). Until it lands the default
 * store is in memory: the state survives every route change (AC-32's second
 * clause) and does **not** survive reload (AC-33's clause). Answering Q1 is a
 * change to `src/lib/persistence.ts` and to nothing else.
 */

import { useCallback, useState } from 'react'
import { isWideViewport } from '@/lib/breakpoint'
import { defaultUiStore, UI_STATE_KEYS, type UiStateStore } from '@/lib/persistence'

export interface UseNavCollapseOptions {
  /**
   * Where the flag lives. Defaults to the shared in-memory store keyed
   * `ui.subTabNavCollapsed`, so two components calling this hook agree.
   */
  store?: UiStateStore<boolean>
  /**
   * First-run viewport test. Injected only so a test can pin it; production
   * reads `--ev-bp-wide` through `isWideViewport`.
   */
  isWide?: () => boolean
}

export interface NavCollapseState {
  collapsed: boolean
  /** The rail's disclosure. It toggles both ways and is always present (AC-64). */
  toggle: () => void
  setCollapsed: (collapsed: boolean) => void
}

export function useNavCollapse(options: UseNavCollapseOptions = {}): NavCollapseState {
  const { store = defaultUiStore<boolean>(UI_STATE_KEYS.subTabNavCollapsed), isWide = isWideViewport } =
    options

  const [collapsed, setCollapsedState] = useState<boolean>(() => {
    const stored = store.read()
    if (stored !== null) return stored
    // First run, and only ever this once: collapsed below the breakpoint,
    // expanded at or above it (AC-32).
    return !isWide()
  })

  const setCollapsed = useCallback(
    (next: boolean) => {
      store.write(next)
      setCollapsedState(next)
    },
    [store],
  )

  const toggle = useCallback(() => {
    setCollapsedState((current) => {
      const next = !current
      store.write(next)
      return next
    })
  }, [store])

  return { collapsed, toggle, setCollapsed }
}
