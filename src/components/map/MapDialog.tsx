/**
 * **The map, big enough to work in** — one expanded surface, shared by every
 * sheet that draws a journey.
 *
 * ```
 *  inline, in the sheet                    expanded
 *  ┌──────────────────────────┐            ┌────────────────────────────────┐
 *  │                   [ ⤢ ]  │            │ Al Malaz → Riyadh Park     [✕] │
 *  │        ●────▪            │  click  →  │ ┌────────────────────────────┐ │
 *  │                          │            │ │                            │ │
 *  │ ● PICKUP    Al Malaz     │            │ │      the same picture,     │ │
 *  │ ▪ DROP-OFF  Riyadh Park  │            │ │      the whole viewport    │ │
 *  └──────────────────────────┘            │ └────────────────────────────┘ │
 *       224px tall, 480px wide             └────────────────────────────────┘
 * ```
 *
 * ## Why an expanded surface rather than a taller inline one
 *
 * The sheet is 480px wide and the map gets 224px of it. That is enough to
 * answer *roughly where did this happen*, and it is not enough for the thing an
 * operator actually does next: follow the route, find the junction the detour
 * went through, read the street names around a pickup. Panning a city inside a
 * 480 × 224 window is the interaction the owner asked to be rid of.
 *
 * Making the inline map taller does not fix it — the sheet's width is the
 * binding constraint, and the rest of the record has to fit under it.
 *
 * ## What is shared, and what deliberately is not
 *
 * **The chrome is here. The picture is not.** Each caller renders *itself*
 * again inside this dialog with `variant="expanded"`, so the expanded map is
 * the same component drawing the same marks at a different size — never a
 * second implementation that can drift. `route.ts` records the same split for
 * the arithmetic: *"the numbers are shared; the picture is each one's own."*
 *
 * The expanded instance gets its **own** `useMapViewport`, which is the point:
 * pan and zoom in the big map do not disturb the small one behind it, and
 * closing returns the operator to the frame they left.
 *
 * ## The §5.5 conflict, stated plainly
 *
 * §5.5 forbids a modal opening inside a drawer, and every caller of this is
 * inside one. The alternative — expanding the map in place inside the sheet
 * (§4.7 / §6.4's pattern) — keeps the rule and cannot deliver what was asked
 * for: the sheet is 480px wide, so an in-place expansion is a taller map at the
 * same useless width.
 *
 * **The owner asked for a popup**, in those words, so the rule is knowingly
 * suspended here and the cost is the one §5.5 names: while the map is open the
 * sheet behind it is scrimmed and the operator is two surfaces deep. It is the
 * same suspension `components/actions/ActionBar.tsx` records for the three
 * confirmations, on the same authority.
 *
 * The way back, if it reads badly in use: the record surfaces have a full-page
 * twin at `/entity/:id`, and the trip's already leads with a full-width map. A
 * caller could route to that instead of opening this — the dialog would lose
 * its only callers rather than needing to be unpicked.
 *
 * Rules applied
 *   §7.3.3      the scrim decides the trap. This one dims the page, so it owns
 *               the keyboard — `Dialog` traps, and `Escape` closes the MAP
 *               rather than the sheet under it, because the topmost dismissable
 *               layer takes the key.
 *   AC-30       the expand affordance is a real `<button>`. The click-anywhere
 *               on the canvas is a mouse convenience ON TOP of it, never the
 *               only way in — see `MapExpandButton`.
 *   §11.3       no spinner. The expanded map paints its frame and the tiles
 *               land into it.
 *   R18         no animation beyond the dialog's own one-shot fade.
 *   §9.1        nothing is placed on a physical side. The canvas inside pins
 *               `dir="ltr"` for itself, as every map does.
 */

import type { ReactNode } from 'react'
import { Maximize2Icon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export interface MapDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The record the map is of — `Al Malaz → Riyadh Park`. Becomes the dialog's name. */
  title: string
  /**
   * One line under it saying what the picture is and is not.
   *
   * Required rather than optional: every one of these maps draws hand-placed
   * district anchors joined by a straight connector, and `places.ts`'s caveat
   * has to travel with the picture when the picture gets big enough to look
   * authoritative.
   */
  description: string
  /** The caller, rendering itself again with `variant="expanded"`. */
  children: ReactNode
}

export function MapDialog({ open, onOpenChange, title, description, children }: MapDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        /* **Near-viewport, not one of the three dialog widths.** 440 / 560 /
           800 are sized for confirmations and forms; a map at 800px on a 2,560px
           display would be the sheet's problem again with more scrim around it.
           The inset is the modal record's own 24px (`sheet.tsx`'s `overlay`
           side), so the two full-surface layers in the product frame themselves
           identically. */
        className={cn(
          'top-6 bottom-6 start-6 end-6 w-auto max-w-none translate-x-0 translate-y-0 rtl:translate-x-0',
          'grid-rows-[auto_1fr] gap-3 overflow-hidden',
        )}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {/* **A flex column, and both halves of that are load-bearing.**
            `min-h-0` stops the canvas pushing the dialog past the viewport,
            which is how a map ends up with its own scrollbar. `flex` is what
            gives the child a height at all: the callers render a `flex-1`
            section, and `flex-1` in a block parent is inert — the first cut of
            this drew a correctly-titled dialog with a zero-height map in it. */}
        <div className="flex min-h-0 flex-col">{children}</div>
      </DialogContent>
    </Dialog>
  )
}

export interface MapExpandButtonProps {
  label: string
  onClick: () => void
  className?: string
}

/**
 * The affordance, and **the keyboard's only way in**.
 *
 * It sits at the canvas's inline-start top corner, opposite the zoom controls,
 * which are bottom inline-end on every one of these maps. A control the mouse
 * can reach and the keyboard cannot is not a control — the whole-canvas click
 * the callers also wire is a convenience layered over this, not a replacement
 * for it.
 */
export function MapExpandButton({ label, onClick, className }: MapExpandButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'absolute top-2 end-2 z-10 flex size-7 items-center justify-center rounded-lg border border-border bg-card/95 text-foreground shadow-2',
        'hover:bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-none',
        className,
      )}
    >
      <Maximize2Icon aria-hidden="true" className="size-3.5" />
    </button>
  )
}
