/**
 * **Is the shell in compact mode right now?**
 *
 * One boolean, one subscription, one source of truth. `src/lib/breakpoint.ts`
 * owns the number (read from `--ev-bp-compact` in `globals.css`, the same
 * declaration the `compact:` variant's media query is written from); this owns
 * the React binding.
 *
 * The two are not interchangeable and both are needed. The `compact:` variant
 * moves what is PAINTED and needs no JavaScript. This moves what is RENDERED —
 * whether the nav is inside a focus-trapped dialog at all, whether its trigger
 * exists, whether the drawer's open state is meaningful — and no media query
 * can tell React that.
 *
 * ## Why a subscription, when `isWideViewport` deliberately has none
 *
 * `breakpoint.ts` explains that `isWideViewport` reads `innerWidth` once and
 * never listens, because design spec §3.9 forbids re-deriving NAV STATE from a
 * resize — an operator who drags a window must not have their sub-tab column
 * collapse under them.
 *
 * This is a different question and it needs the opposite answer. §3.9 is about
 * a *preference* (is the column open?) being overwritten by a resize. Compact
 * mode is not a preference; it is a fact about whether the navigation is
 * physically on screen. A phone rotated from portrait to landscape crosses the
 * boundary in a way the operator did not choose and cannot undo, and a shell
 * that answered from the first paint would leave the rail off screen with no
 * hamburger to bring it back — an unreachable navigation, which is a worse
 * failure than the one §3.9 prevents.
 *
 * `useSyncExternalStore`, not `useState` + `useEffect`: the store is external
 * (the `MediaQueryList`), and this is exactly what the hook is for. It also
 * gives a correct value on the FIRST render rather than after a paint, so the
 * shell never renders desktop chrome for one frame and then swaps — which on a
 * phone reads as a visible flash of a 1280px layout.
 *
 * ## jsdom
 *
 * `src/test/setup.ts` shims `matchMedia` to always report `matches: false` with
 * no-op listeners, so every existing test sees the desktop shell and none of
 * them change behaviour. A test that wants compact mode replaces the shim; see
 * `useCompactShell.test.ts`.
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { compactMediaQuery } from '@/lib'

/** No `window` (a build step, a node test) is not a compact viewport. */
function getSnapshot(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(compactMediaQuery()).matches
}

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}
  const list = window.matchMedia(compactMediaQuery())
  /* `addEventListener` where it exists, `addListener` where it does not. Safari
     only gained the former on `MediaQueryList` in 14, and an operations console
     that throws on an older iPad renders nothing at all. */
  if (typeof list.addEventListener === 'function') {
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }
  list.addListener(onChange)
  return () => list.removeListener(onChange)
}

/**
 * `true` below `--ev-bp-compact`. Re-renders on crossing, in both directions.
 */
export function useCompactShell(): boolean {
  /* The server snapshot is `false`: a document rendered without a window is not
     a phone, and guessing compact would ship a hamburger to a desktop for one
     commit. */
  const getServerSnapshot = useCallback(() => false, [])
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export interface DisclosureState {
  open: boolean
  setOpen: (open: boolean) => void
  close: () => void
}

/**
 * The off-canvas drawer's open/closed state, with the three rules that make it
 * safe rather than merely functional.
 *
 * 1. **Closed by default.** The initial value is `false` and nothing sets it
 *    true except an operator pressing the control.
 * 2. **Closes on route change.** A nav drawer whose whole purpose is to
 *    navigate must not survive the navigation it caused — leaving it open puts
 *    a scrim over the page the operator just asked for. The key is the full
 *    location, so a `?view=` change closes it too; every entry in the drawer
 *    changes the pathname, and one that changes only the query is still a
 *    navigation the operator made from inside it.
 * 3. **Closes when compact mode ends.** Rotating to landscape, or an operator
 *    widening a desktop window they had narrowed, puts the real nav back on
 *    screen. Leaving `open` true would then hold a scrim over a console whose
 *    navigation is already visible, with the control that closes it no longer
 *    rendered.
 *
 * Escape and the scrim click are NOT handled here — Radix's modal `Dialog`
 * owns both, along with the focus trap and the focus restore. Re-implementing
 * them would be a second, worse copy of behaviour the primitive already has.
 */
export function useDrawerDisclosure(routeKey: string, compact: boolean): DisclosureState {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  /* `useRef` + compare, rather than `[routeKey]` as a dependency with a bare
     `setOpen(false)`: the effect must not fire on mount, only on a CHANGE. An
     effect that closes on mount is invisible today (it is already closed) and
     becomes a bug the moment anything opens the drawer during the same commit
     that navigates. */
  const lastRoute = useRef(routeKey)
  useEffect(() => {
    if (lastRoute.current === routeKey) return
    lastRoute.current = routeKey
    setOpen(false)
  }, [routeKey])

  useEffect(() => {
    if (!compact) setOpen(false)
  }, [compact])

  return { open, setOpen, close }
}
