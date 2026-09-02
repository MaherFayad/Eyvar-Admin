/**
 * **The colour theme.** One class on `<html>`, one persisted preference, and
 * nothing else in the product knows this exists.
 *
 * The whole theme is a block of `--ev-*` overrides in `globals.css` under
 * `.dark`. This file's only job is deciding whether that class is on the
 * document, which is why it is ~60 lines for a feature usually measured in
 * hundreds: layer 1 holds every raw value and layer 2 only maps, so no
 * component has a `dark:` utility and none needed changing.
 *
 * ## Three settings, not two
 *
 * `system` is the default and is a real value, not the absence of one. It
 * follows `prefers-color-scheme` for the life of the session — an operator
 * whose machine flips at sunset flips with it — and it is the only setting
 * that can express "follow my machine". Storing `light | dark` alone would
 * force a choice at first run and silently freeze it.
 *
 * `light` and `dark` are decisions and they OUTRANK the machine, in both
 * directions. A dispatcher who wants the dark console on a bright morning gets
 * it; so does the one who wants the light console at 3am.
 *
 * ## Why `applyTheme` is exported and idempotent
 *
 * Exactly the shape `applyDocumentDirection` has, and for the same reason: the
 * document has to be right on the FIRST paint, before React has rendered
 * anything, or the console flashes light and then repaints dark. `main.tsx`
 * calls it at boot from the stored value; this hook calls it on every change.
 * Calling it twice with the same value does nothing.
 */

import { useCallback, useEffect, useState } from 'react'
import { UI_STATE_KEYS, defaultUiStore, type UiStateStore } from '@/lib/persistence'

export type ThemeChoice = 'light' | 'dark' | 'system'

/** What `system` resolves to right now, or `light` where nothing can be asked. */
export type ResolvedTheme = 'light' | 'dark'

const DARK_QUERY = '(prefers-color-scheme: dark)'

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return value === 'light' || value === 'dark' || value === 'system'
}

/**
 * The machine's answer. `light` when there is no `matchMedia` — a server
 * render, an old jsdom, a browser with the feature disabled — because a
 * console that cannot ask should render the theme it was designed in first.
 */
export function systemTheme(win: Window | undefined = globalThis.window): ResolvedTheme {
  if (typeof win?.matchMedia !== 'function') return 'light'
  return win.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

export function resolveTheme(
  choice: ThemeChoice,
  win: Window | undefined = globalThis.window,
): ResolvedTheme {
  return choice === 'system' ? systemTheme(win) : choice
}

/**
 * Puts `.dark` on `<html>`, or takes it off. **AC-70's shape, for colour.**
 * Idempotent; safe to call at boot and on every change.
 */
export function applyTheme(
  resolved: ResolvedTheme,
  doc: Document | undefined = globalThis.document,
): void {
  if (!doc?.documentElement) return
  doc.documentElement.classList.toggle('dark', resolved === 'dark')
}

export interface ThemeState {
  /** What the operator chose. `system` unless they said otherwise. */
  choice: ThemeChoice
  /** What that resolves to right now. This is what is on the document. */
  resolved: ResolvedTheme
  setTheme: (next: ThemeChoice) => void
}

export function useTheme(options?: {
  store?: UiStateStore<ThemeChoice>
  /** `false` in a test that does not want the jsdom document mutated. */
  applyToDocument?: boolean
  document?: Document
  window?: Window
}): ThemeState {
  const {
    store = defaultUiStore(UI_STATE_KEYS.theme, isThemeChoice),
    applyToDocument = true,
    document: doc,
    window: win,
  } = options ?? {}

  const [choice, setChoice] = useState<ThemeChoice>(() => {
    const stored = store.read()
    return isThemeChoice(stored) ? stored : 'system'
  })
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(choice, win))

  /* The choice is the operator's; the resolution is the machine's. Kept as two
     pieces of state because a `system` operator's resolution changes without
     their choice changing, and a settings control has to go on showing
     `system` when that happens rather than flipping to `dark` under them. */
  useEffect(() => {
    const next = resolveTheme(choice, win)
    setResolved(next)
    if (applyToDocument) applyTheme(next, doc)
  }, [choice, applyToDocument, doc, win])

  /* Only `system` listens. A `light` or `dark` operator has overruled the
     machine and must not be moved by it — which is the half of this that is
     easy to get wrong by listening unconditionally and letting the listener
     win. */
  useEffect(() => {
    if (choice !== 'system') return
    const target = win ?? globalThis.window
    if (typeof target?.matchMedia !== 'function') return
    const media = target.matchMedia(DARK_QUERY)
    const onChange = () => {
      const next: ResolvedTheme = media.matches ? 'dark' : 'light'
      setResolved(next)
      if (applyToDocument) applyTheme(next, doc)
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [choice, applyToDocument, doc, win])

  const setTheme = useCallback(
    (next: ThemeChoice) => {
      setChoice(next)
      store.write(next)
    },
    [store],
  )

  return { choice, resolved, setTheme }
}
