/**
 * **T6.2 — the keyboard grammar, declared once.** `j`/`k` move row focus, `.`
 * opens the focused row's actions, `g` then a letter jumps to a sub-tab.
 *
 * Here rather than in `DataTable` for CM-1's reason: a screen resolves a
 * declared intent and never invents one. `DataTable` reads `rowIntentFor`;
 * `useSubTabShortcut` owns the `g` prefix. Neither surface knows a key.
 */

import { useEffect, useRef } from 'react'
import { getSubTabs } from '@/data/clients'
import type { SubTabRoute, WorkspaceId } from '@/data/types'

/* ─────────────────────────── row intents ─────────────────────────── */

/**
 * What a key press over a focused row MEANS. `null` is "not ours" — the row
 * hands the event on, which is how `Escape` still reaches a sheet above it.
 */
export type RowIntent = 'row.next' | 'row.previous' | 'row.actions' | 'row.claim'

/**
 * `j`/`k` are the vi pair every list keyboard in this class uses, and they sit
 * under the operator's resting hand; `.` is the row menu. Case-sensitive, so
 * `J` in a search field is never a movement, and modified presses are somebody
 * else's (⌘K is global search).
 */
export function rowIntentFor(event: {
  key: string
  metaKey: boolean
  ctrlKey: boolean
  altKey: boolean
}): RowIntent | null {
  if (event.metaKey || event.ctrlKey || event.altKey) return null
  if (event.key === 'j') return 'row.next'
  if (event.key === 'k') return 'row.previous'
  if (event.key === '.') return 'row.actions'
  if (event.key === 'c') return 'row.claim'
  return null
}

/* ───────────────────────── the `g` prefix ───────────────────────── */

/**
 * The letter that jumps to a sub-tab, derived from its **id** rather than its
 * title: a title is translated, and an Arabic operator pressing `g` then a
 * Latin letter has to be pressing the same letter as an English one.
 *
 * First unclaimed letter of the id's own segment, in route-table order, so the
 * mapping is total, collision-free and stable under a title change.
 */
export function subTabLetters(rows: readonly SubTabRoute[]): Map<string, SubTabRoute> {
  const letters = new Map<string, SubTabRoute>()
  for (const row of rows) {
    const name = row.subTabId.slice(row.subTabId.indexOf('-') + 1)
    for (const letter of name.toLowerCase()) {
      if (letter < 'a' || letter > 'z' || letters.has(letter)) continue
      letters.set(letter, row)
      break
    }
  }
  return letters
}

/** The letter `g` reaches this row by, or `null` when the row claimed none. */
export function subTabLetterOf(rows: readonly SubTabRoute[], subTabId: string): string | null {
  for (const [letter, row] of subTabLetters(rows)) {
    if (row.subTabId === subTabId) return letter
  }
  return null
}

/**
 * F4 — the same chord, as the palette shows it: one kbd chip per token, Latin
 * glyphs in both languages (§14). Display only; `useSubTabShortcut` still owns
 * the keys themselves.
 */
export function subTabChord(rows: readonly SubTabRoute[], subTabId: string): string | null {
  const letter = subTabLetterOf(rows, subTabId)
  return letter === null ? null : `G ${letter.toUpperCase()}`
}

/** The sub-tab `g` + `letter` reaches inside `workspaceId`, or `null`. */
export function subTabForLetter(
  workspaceId: WorkspaceId | null,
  letter: string,
): SubTabRoute | null {
  if (workspaceId === null) return null
  return subTabLetters(getSubTabs(workspaceId)).get(letter.toLowerCase()) ?? null
}

/**
 * True while the operator is typing into something. A grammar of bare letters
 * has to yield to every field in the product or it eats the search box.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

/**
 * Installs the `g` prefix on the document. The prefix is armed by a bare `g`
 * and disarmed by the next key whatever it is, so a stale `g` can never turn a
 * later letter into a navigation.
 */
export function useSubTabShortcut(
  workspaceId: WorkspaceId | null,
  onJump: (row: SubTabRoute) => void,
): void {
  const armed = useRef(false)
  /* Refs so the listener is installed once and still reads the live route. */
  const latest = useRef({ workspaceId, onJump })
  latest.current = { workspaceId, onJump }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTypingTarget(event.target)) return

      if (!armed.current) {
        armed.current = event.key === 'g'
        return
      }
      armed.current = false
      const row = subTabForLetter(latest.current.workspaceId, event.key)
      if (row === null) return
      event.preventDefault()
      latest.current.onJump(row)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])
}
