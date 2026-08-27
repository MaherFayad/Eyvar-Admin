/**
 * Hold the operator's place across a **session freeze**. §8.1, **AC-565**.
 *
 * > Focus is **captured**: the element that had focus at freeze time is recorded
 * > and restored on success. Scroll is untouched.
 *
 * The freeze is the case §7.3 calls *"the most important rule in §7 and the one
 * an implementation will get wrong"*: a session expires while a Finance lead is
 * halfway through a payout adjustment, nothing unmounts, every input goes
 * `readOnly`, every mutating button goes `disabled`, and a re-auth modal opens
 * over the top. When they sign back in, the console has to be exactly where they
 * left it — including the caret.
 *
 * ## Why this is a sibling of `useFocusEntry` and not a mode on it
 *
 * `useFocusEntry` is *"move focus into a surface on open, put it back on close"*:
 * capture and restore are the two ends of **one surface's** mount lifecycle, it
 * focuses the container on activation, and it restores in an effect **cleanup**.
 * Every one of those is wrong here.
 *
 * | | `useFocusEntry` | the freeze |
 * |---|---|---|
 * | Capture | when the layer opens | before the freeze commits — **and before the shell layers close**, because each of those restores focus to *its* opener on the way out and would otherwise be the last writer |
 * | On activate | focuses the container | focuses **nothing**. The re-auth modal owns focus from here (its password field), and it has a scrim, so it traps |
 * | Restore | effect cleanup, as the surface unmounts | after the freeze **lifts** — a `disabled` button cannot take focus, so restoring one tick early silently sends focus to `<body>` |
 * | Between the ends | nothing | a whole modal's lifecycle, a network round trip, and possibly a sign-out |
 *
 * Generalising `useFocusEntry` to cover both would give it two modes, three more
 * options and a comment explaining which combinations are legal — for a hook
 * whose current value is that it fits on one screen. Two small hooks that each
 * do one thing.
 *
 * ## The timing, which is the whole hook
 *
 * The capture reads `document.activeElement` **during render**, on the pass that
 * first sees `captured === true`. That is deliberate and it is the only phase
 * that works: React has not committed anything yet, so the DOM is still the
 * pre-freeze DOM — inputs not yet `readOnly`, buttons not yet `disabled`, shell
 * layers not yet closed. An effect, layout or otherwise, runs *after* those
 * mutations and after every closing layer has already moved focus somewhere
 * else. It is a DOM read with no DOM write, it produces the same answer however
 * many times a render is replayed, and there is no hook equivalent of
 * `getSnapshotBeforeUpdate` to do it more politely.
 *
 * The restore runs in an effect on the `true → false` edge, which is after the
 * commit that lifted the freeze — so the element is focusable again by the time
 * we reach for it.
 *
 * ## What the caller still has to do
 *
 * Give the re-auth `AlertDialog` `onCloseAutoFocus={(event) => event.preventDefault()}`.
 * Radix restores focus to whatever was focused when the dialog opened, which by
 * then is `<body>` (the freeze disabled the real element before the modal
 * mounted). Two restores in one commit race; this hook should win, so the
 * modal's own should be switched off.
 */

import { useEffect, useRef } from 'react'

export interface UseFocusCaptureOptions {
  /**
   * `true` while the session is frozen. Capture happens on the `false → true`
   * edge, restore on `true → false`.
   */
  captured: boolean
  /** For a test that runs against a document other than the global one. */
  document?: Document
}

export interface FocusCapture {
  /**
   * The element focus will go back to, or `null`. For an assertion, and for a
   * caller that wants to decide what to do when it is `null`.
   */
  capturedElement: () => HTMLElement | null
  /**
   * Forget the captured element without restoring it — the `Sign out` path,
   * where the console the operator was standing in is about to be torn down and
   * putting focus back into it would be worse than not.
   */
  release: () => void
}

export function useFocusCapture(options: UseFocusCaptureOptions): FocusCapture {
  const { captured, document: doc } = options

  const capturedRef = useRef<HTMLElement | null>(null)
  const wasCaptured = useRef(false)

  const activeDocument = doc ?? (typeof document === 'undefined' ? undefined : document)

  /* Render-phase capture. See the timing note above: this has to happen before
     React commits the freeze, and every effect phase is already too late. */
  if (captured && !wasCaptured.current) {
    wasCaptured.current = true
    const active = activeDocument?.activeElement
    /* `<body>` is what `activeElement` reports when nothing is focused. Storing
       it would make the restore a no-op that looks like a success. */
    capturedRef.current =
      active instanceof HTMLElement && active !== activeDocument?.body ? active : null
  }

  useEffect(() => {
    if (captured) return
    if (!wasCaptured.current) return
    wasCaptured.current = false

    const target = capturedRef.current
    capturedRef.current = null
    /* The element can have been unmounted while the session was frozen — a row
       a background refresh replaced, or a screen the re-auth flow navigated
       away from. Focusing a detached node silently sends focus to `<body>`,
       which loses the operator's place rather than keeping it, so this checks
       first and leaves focus where the browser put it. Same judgement as
       `useFocusEntry`. */
    if (target && target.isConnected) target.focus()
  }, [captured])

  const handle = useRef<FocusCapture>({
    capturedElement: () => capturedRef.current,
    /* Clears the target, not the edge flag: the freeze is still on, and
       re-arming the capture would grab whatever the sign-out confirmation
       focused. `wasCaptured` is reset by the unfreeze effect, once. */
    release: () => {
      capturedRef.current = null
    },
  })

  return handle.current
}
