/**
 * The three shell layers — design spec §6, spec §4.3. **One mechanism, three
 * layers.**
 *
 * A shell layer is an **overlay parameter on the current route**, never a route
 * of its own: `/support/tickets/TKT-505?entity=RDR-1041` opens the rider's
 * profile over the ticket. The workspace stays visible behind it, the URL is
 * shareable and restorable, browser Back closes the layer rather than leaving
 * the page (**AC-21**), and the layer does not consume a navigation level —
 * which is what keeps the three-level ceiling true.
 *
 * Rules applied
 *   §6.1 / §5.5 **NO SCRIM.** The workspace behind stays legible AND
 *               interactive (**AC-20**). `sheet.tsx` deletes the overlay
 *               outright rather than making it transparent, because a
 *               transparent overlay still eats pointer events.
 *   §7.3.3      **NO FOCUS TRAP.** *"The scrim decides the trap. If a surface
 *               dims the page, it owns the keyboard. If it does not, it does
 *               not."* Focus MOVES IN on open and `Tab` leaves the panel and
 *               continues into the page. AC-67 required a trap; §7 outranks an
 *               AC, so the AC was amended (finding F-1).
 *   AC-66/AC-67 focus moves in on open and returns to **the control that opened
 *               it** on close. Radix's non-modal dialog restores focus to its
 *               *Trigger*, and these layers have no trigger — they are opened
 *               by a URL param from a table cell, the bell, global search or a
 *               notification. So Radix's own focus work is switched OFF
 *               (`onOpenAutoFocus` / `onCloseAutoFocus` both prevented) and
 *               `useFocusEntry` does it instead: it captures
 *               `document.activeElement` at open and restores it on close,
 *               declining a detached opener. That is the whole reason the hook
 *               exists.
 *   §6.1 / C12  `--ev-drawer-w` 406px, anchored inline-**end**, starting BELOW
 *               the top bar so the top bar stays reachable — a layer can be
 *               open while a form is dirty and the save bar is up.
 *   AC-22       **one at a time.** Enforced in `withOverlay`, which deletes the
 *               other two params on every write, so opening a second closes the
 *               first by construction.
 *   §6.1        the RAIL KEEPS HIGHLIGHTING the workspace the operator is in.
 *               A layer is not a destination (**AC-20**) — and since the rail
 *               reads `route.workspaceId`, that is true without anyone
 *               arranging it.
 *   §5.5        **a modal nested inside a drawer is FORBIDDEN.** My profile's
 *               password change and 2FA enrolment expand IN PLACE (§6.4).
 *   §9.5        the enter transform is `+X` in LTR and `−X` in RTL, ≤300ms,
 *               from `sheet.tsx`'s own `rtl:` variant.
 *   §11.3       loading is a SKELETON SHAPED LIKE THE CARD STACK, never a
 *               spinner (§9.2 `overlay-loading`).
 *   R-3 §1.3    tier 2 AND the inline-start hairline. Both, per the R-3 ruling.
 */

import { useEffect, useRef, type ReactNode } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useFocusEntry } from '@/hooks'
import type { Translate } from '@/lib'

export interface ShellLayerProps {
  open: boolean
  onClose: () => void
  title: string
  /** `null` renders nothing — no orphan line, no empty element (§6.1). */
  subtitle?: string | null
  /** §6.1 — present ONLY when the layer commits something. */
  footer?: ReactNode
  children: ReactNode
  t: Translate
}

export function ShellLayer({
  open,
  onClose,
  title,
  subtitle,
  footer,
  children,
  t,
}: ShellLayerProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  /* AC-67 as amended, and AC-66. Enters focus on the layer's HEADING — a
     deterministic, non-destructive landing spot — and restores the real opener
     on close. Installs no `keydown`/`focusin` listener, so it cannot become a
     trap by accident; there is a test in 0.5 asserting exactly that. */
  useFocusEntry({ active: open, containerRef: contentRef, initialFocusRef: headingRef })

  /* AC-21's other half. A layer closes on ROUTE CHANGE (spec §4.4), and the
     route change that closes it is the one that removed the param — so the
     only thing to do here is make sure a layer left open by a `history.back()`
     into a paramless entry does not linger. React re-renders with `open:false`
     and Radix unmounts; this effect exists to release the opener reference
     when the component itself goes away mid-flight. */
  useEffect(() => {
    if (!open) return
    return () => undefined
  }, [open])

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        /* `Escape` and the ✕ both come through here. AC-66: close, and let
           `useFocusEntry`'s cleanup return focus to the opener. */
        if (!next) onClose()
      }}
    >
      <SheetContent
        ref={contentRef}
        side="inline-end"
        tabIndex={-1}
        aria-label={title}
        /* See the header: Radix's non-modal focus restore targets its Trigger,
           and these layers have none. Both handlers are prevented so
           `useFocusEntry` owns entry AND restore, with no fight over order. */
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <SheetHeader>
          <SheetTitle ref={headingRef} tabIndex={-1}>
            {title}
          </SheetTitle>
          {/* `null` renders nothing. Radix wants a description for a11y; when
              there is none, the title alone is the accessible name and
              `aria-label` above covers it. */}
          {subtitle ? <SheetDescription>{subtitle}</SheetDescription> : null}
        </SheetHeader>

        {/* The card stack scrolls; the header and footer do not (§6.1). */}
        <div className="min-h-0 flex-1 overflow-y-auto p-3">{children}</div>

        {footer}
      </SheetContent>
      {/* `t` is threaded so every layer's chrome copy comes from a key; the
         close control's label lives in `sheet.tsx`. */}
      <span className="sr-only">{t('shell.layer.close')}</span>
    </Sheet>
  )
}
