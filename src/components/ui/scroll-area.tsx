/**
 * ScrollArea - restyled for Eyvar.
 *
 * Rules applied
 *   AC-19      the shell has THREE INDEPENDENT SCROLL CONTEXTS - the rail (which
 *              never scrolls), the sub-tab column, and the content region.
 *              Scrolling one leaves the other two untouched. This component is
 *              what makes that testable.
 *   §8.1.1     the monitoring shell's 340px side list is its own scroll context,
 *              and it shares ONE SELECTION MODEL with the canvas pane. Two panes
 *              that do not share a selection are two cards and must use §2.2.
 *   §8.1       a live list MUST NOT re-sort or remove rows while the pointer is
 *              inside it or anything inside it has focus.
 *   §3.8       timelines and activity feeds scroll here, not on the page.
 *   §5.4       end-of-list is stated in words (`No more notifications`), never a
 *              blank surface.
 *   §9.1       replaces the ~20 legacy `max-height + overflow-y:auto` regions.
 *   §7.2       the viewport keeps a visible focus ring when it is focusable.
 */
import * as React from "react"
import { ScrollArea as ScrollAreaPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function ScrollArea({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="size-full transition-[color,box-shadow] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-1"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-2.5 data-vertical:border-s data-vertical:border-s-transparent",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-border"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}

export { ScrollArea, ScrollBar }
