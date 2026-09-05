/**
 * Popover - restyled for Eyvar.
 *
 * Rules applied
 *   §5.4       STAYS OPEN WHILE ADJUSTING. The sort popover, the filter value
 *              pickers and the notification preview all keep their popover open
 *              across changes.
 *   §3.2/§5.4  THE SORT POPOVER HAS NO APPLY AND NO CANCEL: a `Sort by` label, a
 *              RADIO GROUP of fields, a divider, then a direction pair. The date
 *              RANGE popover is the one exception - it does carry
 *              `Cancel` / `Apply`, with `Apply` disabled until the range changes.
 *   §3.2       the sub-tab popover is 224px, anchored to the rail disclosure's
 *              inline-end with an 8px offset, and carries the SAME rows, order,
 *              badges and active treatment as the expanded column (AC-33).
 *   §7.3.3     A POPOVER DOES NOT TRAP FOCUS - no scrim, no trap. `Tab` closes it
 *              and moves on; `Escape` closes it and returns focus to the control
 *              that opened it (AC-66).
 *   §5.7       a popover is not a tooltip. Constraints and consequences live in
 *              helper text, never in either.
 *   R15        radius 8px, 1px hairline, never a stadium.
 *
 * Removed on arrival: the stock 1px translucent ring - a translucent black ring over
 * an unknown backdrop - replaced by a `--ev-hairline` border.
 */
import * as React from "react"
import { Popover as PopoverPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Popover({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 flex w-72 origin-(--radix-popover-content-transform-origin) flex-col gap-2.5 rounded-lg bg-popover p-2.5 text-sm text-popover-foreground border border-popover-border outline-hidden duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}

function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />
}

function PopoverHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="popover-header"
      className={cn("flex flex-col gap-0.5 text-sm", className)}
      {...props}
    />
  )
}

function PopoverTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <div
      data-slot="popover-title"
      className={cn("font-medium", className)}
      {...props}
    />
  )
}

function PopoverDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="popover-description"
      className={cn("text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
}
