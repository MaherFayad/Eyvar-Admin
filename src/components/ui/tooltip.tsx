/**
 * Tooltip - restyled for Eyvar.
 *
 * Rules applied
 *   §5.7       NAMING ICON-ONLY CONTROLS, AND NOTHING ELSE. Never a constraint,
 *              never help text, never a formula. Constraints and consequences go
 *              in helper text below the field (§10.2); the formula goes in
 *              `FormulaDisclosure` (V-12), which §8.2.2 says is an inline panel
 *              and explicitly NOT a tooltip.
 *   a11y.md    hover may change emphasis and must NEVER gate reachability. A
 *              tooltip sits on top of an accessible name; it is never the
 *              accessible name itself.
 *   §0.2       this is why the workspace rail is icon PLUS LABEL and not
 *              icon-only: at 1280px the sub-tab column is collapsed by default,
 *              so the rail is the entire visible navigation, and five glyphs
 *              behind a hover delay are a recall test performed all day.
 *   R15        radius 8px, dark `--ev-ink` fill, white label, 12px.
 *   §7.6       `duration-100` — the licensed value for a popover, dropdown,
 *              tooltip or command list (`motion.md`). It carried NO duration
 *              class, so it ran at tw-animate-css's `.15s` default: a tooltip
 *              arriving slower than the dropdown beside it. Tailwind's scale
 *              is the token set; there is no `--ev-duration-*`.
 *   §14        the `Cmd K` chip's POSITION mirrors in Arabic; its GLYPH ORDER
 *              does not.
 */
"use client"

import * as React from "react"
import { Tooltip as TooltipPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "z-50 inline-flex w-fit max-w-xs origin-(--radix-tooltip-content-transform-origin) items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-xs text-background duration-100 has-data-[slot=kbd]:pe-1.5 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 **:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:z-50 **:data-[slot=kbd]:rounded-sm data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="z-50 size-2.5 -translate-y-1/2 rotate-45 rounded-xs bg-foreground fill-foreground" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
