/**
 * Move focus into a surface on open, put it back on close. **Explicitly not a
 * focus trap.**
 *
 * **AC-67**, as amended after 0.2:
 *
 * > Opening a shell layer moves focus into it, and closing it returns focus to
 * > the control that opened it. Focus is **not** trapped: `Tab` past the layer's
 * > last control moves into the page behind it and the layer stays open.
 *
 * The reasoning, from design spec finding F-1: `DESIGN.md` §7.3.3 forbids a focus
 * trap on any surface without a scrim, §5.5 forbids the scrim on these layers,
 * and §7 outranks an acceptance criterion. The layers are deliberately non-modal —
 * an operator reads a 360° profile while working the queue behind it. If a future
 * layer genuinely needs a trap it needs a scrim first, and that is a change to
 * §5.5.
 *
 * Radix already does trapping, dismissal and portalling for the components that
 * *should* trap (modal, alert dialog). This hook is for the three shell layers
 * (`?entity`, `?notifications`, `?account`) which are drawers with no scrim and
 * therefore have no Radix equivalent.
 *
 * `Escape` is **not** handled here: **AC-66** covers menus, sheets and modals as
 * well, and the shell owns one key handler rather than four competing ones.
 */

import { useEffect, useRef, type RefObject } from 'react'

export interface UseFocusEntryOptions {
  /** Whether the surface is open. */
  active: boolean
  /** The surface. Focused itself when no `initialFocusRef` is given — needs `tabIndex={-1}`. */
  containerRef: RefObject<HTMLElement | null>
  /** The control inside the surface that should receive focus first. */
  initialFocusRef?: RefObject<HTMLElement | null>
  /**
   * Skip returning focus — for the case where closing also navigates, and the
   * opener no longer exists.
   */
  restoreFocus?: boolean
}

export function useFocusEntry(options: UseFocusEntryOptions): void {
  const { active, containerRef, initialFocusRef, restoreFocus = true } = options
  const openerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!active) return

    const opener = document.activeElement
    openerRef.current = opener instanceof HTMLElement ? opener : null

    const target = initialFocusRef?.current ?? containerRef.current
    target?.focus()

    return () => {
      if (!restoreFocus) return
      const returnTo = openerRef.current
      openerRef.current = null
      // The opener can have been unmounted while the layer was open — a row that
      // a background refresh replaced. Focusing a detached node silently sends
      // focus to <body>, which loses the operator's place; checking first lets
      // the caller decide.
      if (returnTo && returnTo.isConnected) returnTo.focus()
    }
  }, [active, containerRef, initialFocusRef, restoreFocus])
}
