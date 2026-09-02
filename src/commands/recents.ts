/**
 * **Resume, and recent commands — P3-T8 blocks ③ and ④.**
 *
 * ## Where this lives, and why it is not a fourth store
 *
 * **D16 closed Q1.** Unnamed per-operator preference is a **server** resource
 * behind `clients/preferences.ts`, and `UiState.paletteRecents` is already
 * declared there, per operator, with `localStorage` as a write-through cache
 * that is never the truth. This file writes nothing of its own: it reads that
 * field, derives two lists from it, and PATCHes it back.
 *
 * The cache is what makes block ③ possible at all. P3-T8's requirement is that
 * the palette is **populated before a key is pressed** — including the first
 * ⌘K of a session, which lands before any network read has returned. So the
 * first paint comes from `cachedUiState()`, synchronously, and the server
 * response overwrites it when it arrives. That is the cache's documented job
 * and not a shortcut around the seam.
 *
 * ## One log, two derivations
 *
 * `paletteRecents` is a flat `readonly string[]`, and the seeded example in
 * `preferences.ts` (`['nav.operations.people', 'command.suspendDriver']`)
 * already mixes destinations and commands in one list. This file makes that
 * explicit with two prefixes:
 *
 *   `go:<subTabId>`    a destination the operator arrived at
 *   `do:<commandId>`   a command the operator ran
 *
 * An entry with any other prefix is **ignored, not discarded** — a future block
 * may add a third kind, and a client that throws away what it does not
 * understand makes that a breaking change.
 *
 * **The log keeps duplicates**, most-recent-first, bounded. That is the one
 * design decision here and it is what makes both derivations honest:
 *
 *   - **Resume** wants the last three *distinct* destinations — recency.
 *   - **Recent commands** wants "most-used first" (§4) — frequency.
 *
 * A de-duplicated list can express recency and cannot express frequency, and a
 * counted map cannot be stored in a `string[]` without inventing a second
 * encoding inside the first. A bounded event log expresses both: frequency is
 * the count within the window, recency is the first index, and the window's
 * length is what "recently most-used" means. Forty entries is roughly a shift's
 * worth of navigation and about a kilobyte.
 *
 * ## Write failures are swallowed, and that is a deviation
 *
 * D16: *"a silent write failure is how a preference appears to work for a week
 * and then does not"*, and the caller owes the operator a toast. **This caller
 * does not toast**, because the write happens on every navigation and on every
 * command — an operator who loses connectivity would get a toast per click for
 * a preference they never set. `Resume` degrading to a shorter list is visible
 * on its own surface and costs nothing.
 *
 * Recorded here rather than left implicit, and raised in the handoff: the right
 * answer is probably that `updateUiState` reports a *sustained* failure once,
 * which is a change in a file this task does not own.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { cachedUiState, getUiState, updateUiState } from '@/data/clients'
import type { CommandId } from './registry'

/** A destination entry: the sub-tab the operator arrived at. */
const GO = 'go:'
/** A command entry: the id that ran. Never a label — `command.id` is the telemetry key (§6). */
const DO = 'do:'

/**
 * How much history the derivations see. Recency uses the head of it; frequency
 * counts within it. Both meanings move together, on purpose.
 */
const LOG_LIMIT = 40

/** §4 — "the last three destinations". The number is the spec's. */
export const RESUME_LIMIT = 3

/** Block ④'s cap. Five rows keeps the whole at-rest list inside CQ-1's scroll. */
export const RECENT_COMMAND_LIMIT = 5

/** Coalesces a burst of navigations into one PATCH. Shorter than a deliberate click. */
const WRITE_DEBOUNCE_MS = 400

export interface PaletteRecents {
  /** Sub-tab ids, most recent first, current route excluded. */
  resume: readonly string[]
  /** Command ids, most-used first within the window, ties broken by recency. */
  recentCommands: readonly CommandId[]
  /** Record that a command ran. Called from the palette's one dispatch path. */
  recordCommand: (id: CommandId) => void
}

/* ───────────────────────────── derivations ───────────────────────────── */

/** Most recent first, distinct, excluding where the operator already is. */
export function deriveResume(log: readonly string[], currentSubTabId: string | null): string[] {
  const out: string[] = []
  for (const entry of log) {
    if (!entry.startsWith(GO)) continue
    const id = entry.slice(GO.length)
    if (id === '' || id === currentSubTabId || out.includes(id)) continue
    out.push(id)
    if (out.length === RESUME_LIMIT) break
  }
  return out
}

/**
 * Most-used first. Ties break on recency, so two commands run once each appear
 * in the order they were run rather than in whatever order `Map` iteration
 * happens to give — which would reshuffle the block between renders.
 */
export function deriveRecentCommands(log: readonly string[]): CommandId[] {
  const count = new Map<string, number>()
  const firstSeen = new Map<string, number>()
  log.forEach((entry, index) => {
    if (!entry.startsWith(DO)) return
    const id = entry.slice(DO.length)
    if (id === '') return
    count.set(id, (count.get(id) ?? 0) + 1)
    if (!firstSeen.has(id)) firstSeen.set(id, index)
  })
  return [...count.keys()]
    .sort((a, b) => {
      const byUse = (count.get(b) ?? 0) - (count.get(a) ?? 0)
      return byUse !== 0 ? byUse : (firstSeen.get(a) ?? 0) - (firstSeen.get(b) ?? 0)
    })
    .slice(0, RECENT_COMMAND_LIMIT) as CommandId[]
}

function push(log: readonly string[], entry: string): readonly string[] {
  /* The head is deduplicated only against itself: arriving twice at the same
     sub-tab in a row is one visit, but visiting it again after going elsewhere
     is a second one, and frequency depends on that being counted. */
  if (log[0] === entry) return log
  return [entry, ...log].slice(0, LOG_LIMIT)
}

/* ─────────────────────────────── the hook ─────────────────────────────── */

/**
 * @param currentSubTabId the route the operator is on. Recorded as a visit, and
 *   excluded from `Resume` — a "go back to where you were" list whose first row
 *   is where you are wastes the row an operator's eye lands on first.
 */
export function usePaletteRecents(currentSubTabId: string | null): PaletteRecents {
  /* Synchronous first paint (see the header). `cachedUiState` returns a
     `Partial`, and rendering correctly from `{}` is its documented contract. */
  const [log, setLog] = useState<readonly string[]>(() => cachedUiState().paletteRecents ?? [])

  /**
   * Whether this session has written anything yet. Until it has, a late server
   * response replaces what the cache painted; after it has, the server's older
   * bag must not resurrect over a visit the operator has already made.
   */
  const touched = useRef(false)
  const pending = useRef<readonly string[] | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let alive = true
    /* D16 — a failed preferences read is NOT an error state. The palette
       renders whatever the cache had, which on a first run is nothing. */
    getUiState()
      .then((result) => {
        if (!alive || touched.current) return
        setLog(result.state.paletteRecents)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const flush = useCallback(() => {
    const next = pending.current
    pending.current = null
    timer.current = null
    if (next === null) return
    /* Swallowed on purpose — see the header. */
    void updateUiState({ paletteRecents: [...next] }).catch(() => {})
  }, [])

  const record = useCallback(
    (entry: string) => {
      touched.current = true
      setLog((current) => {
        const next = push(current, entry)
        if (next === current) return current
        pending.current = next
        if (timer.current !== null) clearTimeout(timer.current)
        timer.current = setTimeout(flush, WRITE_DEBOUNCE_MS)
        return next
      })
    },
    [flush],
  )

  /* A visit is recorded where the palette can see every route change, which is
     the top bar. It belongs in the shell's own route handling and is raised as
     such in the handoff; putting it here keeps it in one file with the two
     derivations that read it, rather than split across an owner boundary. */
  useEffect(() => {
    if (currentSubTabId === null) return
    record(`${GO}${currentSubTabId}`)
  }, [currentSubTabId, record])

  /* A pending write must not be lost to an unmount — the shell is mounted for
     the session, so this fires on reload rather than on navigation. */
  useEffect(
    () => () => {
      if (timer.current !== null) {
        clearTimeout(timer.current)
        flush()
      }
    },
    [flush],
  )

  const recordCommand = useCallback((id: CommandId) => record(`${DO}${id}`), [record])

  return {
    resume: deriveResume(log, currentSubTabId),
    recentCommands: deriveRecentCommands(log),
    recordCommand,
  }
}
