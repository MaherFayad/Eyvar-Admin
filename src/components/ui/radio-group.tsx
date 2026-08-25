/**
 * RadioGroup - restyled for Eyvar.
 *
 * Rules applied
 *   §10.2      inside a card, THE CARD TITLE IS THE QUESTION, and the permissive
 *              / no-op option comes FIRST and is selected. Selecting a non-default
 *              option REVEALS ITS DEPENDENT FIELDS IN PLACE.
 *   §3.2       THE SORT POPOVER IS A RADIO GROUP plus a direction pair. It stays
 *              open across changes; there is no Apply and no Cancel.
 *   §10.2      14px control, matching the checkbox, so a mixed form sits on one
 *              grid.
 *   §7.7       >= 24px hit area via the `after:` pseudo-element, rendered box
 *              unchanged.
 *   §7.2/D20   2px `--ev-blue` ring at 2px offset.
 *   R19/§7.1   RESOLVED IN 0.7, same ruling as `checkbox.tsx`. The resting ring
 *              of an UNSELECTED radio was `--ev-hairline` on white (1.15:1)
 *              where an interactive boundary needs 3:1. It is now
 *              `border-border-strong`, from `--ev-hairline-strong`; the value
 *              and its measurements live beside the token in `globals.css`.
 *              LICENSED FOR THIS ONE USE ONLY: not a border, not a divider,
 *              not an input border, not a hover state. The selected state
 *              keeps `border-primary`. The `group-has-[:focus-visible]` rule
 *              that restores the resting border while a sibling label has focus
 *              moves with it, or a focused group would drop back to 1.15:1.
 *   §4.3       32 radio inputs in the legacy app collapse to this one component.
 *
 * Removed on arrival: `dark:` variant, the stock 3px focus ring,
 * the stock fifth-opacity invalid ring.
 */
"use client"

import * as React from "react"
import { RadioGroup as RadioGroupPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid w-full gap-2", className)}
      {...props}
    />
  )
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "group/radio-group-item peer relative flex aspect-square size-3.5 shrink-0 rounded-full border border-border-strong outline-none group-has-[:focus-visible]/field-label:ring-0 group-has-[:focus-visible]/field-label:not-data-checked:border-border-strong after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:aria-checked:border-primary data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground group-has-[:focus-visible]/field-label:data-checked:border-primary",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="flex size-3.5 items-center justify-center"
      >
        <span className="absolute top-1/2 start-1/2 size-1.5 -translate-x-1/2 rtl:translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-foreground" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
}

export { RadioGroup, RadioGroupItem }
