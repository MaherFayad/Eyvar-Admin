/**
 * **What is selected on screen, published to the palette — P3-T7.**
 *
 * ## Why this is a module-scope store and not a context
 *
 * The palette lives in `TopBar`, which is mounted **above** the router outlet;
 * every index screen lives **below** it. A context would therefore have to be
 * provided in `AppLayout` — a shell file with another owner and three agents in
 * it — and mounted before any screen could publish. A module-scope store with
 * `useSyncExternalStore` needs no provider, no mount order, and no edit outside
 * this directory.
 *
 * That is a real trade and it is bounded on purpose: **exactly one selection
 * exists at a time**, because exactly one index table is on screen at a time.
 * The store holds one entry, the publisher clears it on unmount, and a stale
 * entry is impossible because the only writer is the screen that owns the rows.
 * If a second table ever renders beside the first, this becomes a keyed map and
 * the palette asks for the focused one — the shape below does not have to
 * change for that, only the store behind it.
 *
 * **This is not a fourth storage class (D16).** Nothing here is persisted, read
 * back after a reload, or namespaced per operator. A selection is ephemeral
 * working state — `useIndexTable` already says so, and keeps it out of the URL
 * for the same reason.
 *
 * ## What the palette does with it
 *
 * `[2 captains]`. Rows selected when ⌘K opens **are** the target: the chip is
 * already committed, the target step is skipped, and `⌘K → suspend → Enter`
 * acts on exactly those records. Without that, the palette is a slower bulk
 * bar — which is the whole reason §3 records the pre-seed as load-bearing
 * rather than as a convenience.
 *
 * **Frozen at open, not live.** The palette captures this once, when it opens,
 * and does not re-read it while it is open. Two reasons, and the second is the
 * one that matters:
 *
 *   1. The operator aimed at what was on screen when they pressed ⌘K. A
 *      selection that changed underneath them — a background refetch, `AC-25`'s
 *      reset on a view change — would silently retarget a command they had
 *      already started composing.
 *   2. **AC-961**: the number in the outcome toast must equal the number that
 *      was in the bulk bar when the command was invoked. A live read cannot
 *      promise that; a captured one cannot break it.
 *
 * Closing and reopening the palette re-captures. That is the affordance for
 * "I changed my mind about what I selected", and it costs one keystroke.
 */

import { useEffect, useSyncExternalStore } from 'react'
import type { ProfileEntityType } from '@/data/types'

/**
 * One index table's selection, as the palette needs to see it.
 *
 * Ids rather than records, deliberately: the screen holds a page of rows and
 * the palette holds none, so the seam that survives paging is the id set. The
 * palette resolves them through the same client the screen read them from
 * (`targets.ts`), which is also what makes a selection that spans two pages
 * work at all.
 */
export interface CommandSelection {
  /** Which registry's commands apply. `driver` today; one per index screen. */
  entityType: ProfileEntityType
  /** The selected row ids, in the order the table holds them. Never empty — an empty selection publishes `null`. */
  ids: readonly string[]
  /**
   * **D21's escape hatch, and the only reason the palette may write here.**
   *
   * A bulk command refused because *some* of the selection is ineligible is
   * offered `Select only the N eligible` — which must change **the operator's
   * own selection, visibly**, not quietly narrow what the palette is about to
   * act on. A palette that narrowed only its private copy would run on nine
   * records while the bulk bar behind it still read twelve, which is exactly
   * the toast/bar disagreement D21 forbids.
   *
   * Optional, so a screen may publish a selection it cannot narrow; the palette
   * then renders the refusal with no escape hatch, which is `.all`'s shape and
   * is correct rather than degraded.
   */
  selectOnly?: (ids: readonly string[]) => void
}

let current: CommandSelection | null = null
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function snapshot(): CommandSelection | null {
  return current
}

/**
 * Publish this screen's selection for as long as the screen is mounted.
 *
 * Call it from an index screen with the selection it already holds:
 *
 * ```ts
 * usePublishCommandSelection('driver', table.selectedIds, table.selectOnly)
 * ```
 *
 * Publishing `null` (an empty selection) is the same as not publishing, so a
 * screen never has to branch. The entry is cleared on unmount, which is what
 * makes "exactly one selection at a time" true rather than hoped for.
 *
 * **No screen calls this yet** — the ten screens that gain a bulk bar in P4-T1
 * are its call sites, and `CaptainsView` is the first. Until then the palette's
 * pre-seed comes from the open 360° profile, which needs no screen change at
 * all. Stated plainly so nobody reads the absence as the seam being unused.
 */
export function usePublishCommandSelection(
  entityType: ProfileEntityType,
  ids: ReadonlySet<string> | readonly string[],
  selectOnly?: (ids: readonly string[]) => void,
): void {
  /* A `Set` has no stable identity across renders, so the effect keys on the
     joined ids rather than on the collection — otherwise every render of the
     table would publish again and wake every palette subscriber. */
  const list = Array.isArray(ids) ? (ids as readonly string[]) : [...(ids as ReadonlySet<string>)]
  const key = list.join(',')

  useEffect(() => {
    const next = key === '' ? null : { entityType, ids: key.split(','), selectOnly }
    current = next
    emit()
    return () => {
      /* Only clear what we published. A screen unmounting after another has
         already published would otherwise wipe the newer entry. */
      if (current === next) {
        current = null
        emit()
      }
    }
  }, [entityType, key, selectOnly])
}

/** The live selection, for a surface that re-renders when it changes. */
export function useCommandSelection(): CommandSelection | null {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}

/**
 * The selection **right now**, without subscribing — what the palette captures
 * at the instant it opens. See the header on why the capture is frozen.
 */
export function readCommandSelection(): CommandSelection | null {
  return current
}

/** Test seam. Nothing in production calls this. */
export function resetCommandSelection(): void {
  current = null
  emit()
}
