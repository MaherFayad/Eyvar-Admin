/**
 * ToggleGroup - restyled for Eyvar.
 *
 * A SEGMENTED CONTROL, NOT TABS. The distinction is load-bearing: tabs filter ONE
 * dataset into saved views and live inside the table card (§3.2); a segmented
 * control switches a MODE. Using tabs for a mode switch puts a second tab row on
 * the page and R10's one-surface discipline goes with it.
 *
 * Rules applied
 *   §8.1       the Live / History mode switch on the monitoring shell (legacy
 *              `setMapMode`).
 *   §8.1.5     the map's filter chips.
 *   §9.1       table density.
 *   §7.2       each item keeps a visible focus ring and raises its z-index while
 *              focused, so the ring is not clipped by its neighbour.
 *   §14        the group's ORDER follows `dir`; the items do not individually
 *              mirror.
 *
 * The stock the stock spacing-function gap arbitrary value is replaced by `gap-1`.
 */
"use client"

import * as React from "react"
import { type VariantProps } from "class-variance-authority"
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { toggleVariants } from "@/components/ui/toggle"

const ToggleGroupContext = React.createContext<
  VariantProps<typeof toggleVariants> & {
    spacing?: number
    orientation?: "horizontal" | "vertical"
  }
>({
  size: "default",
  variant: "default",
  spacing: 2,
  orientation: "horizontal",
})

function ToggleGroup({
  className,
  variant,
  size,
  spacing = 2,
  orientation = "horizontal",
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> &
  VariantProps<typeof toggleVariants> & {
    spacing?: number
    orientation?: "horizontal" | "vertical"
  }) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      data-spacing={spacing}
      data-orientation={orientation}
      style={{ "--gap": spacing } as React.CSSProperties}
      className={cn(
        "group/toggle-group flex w-fit flex-row items-center gap-1 rounded-lg data-[size=sm]:rounded-lg data-vertical:flex-col data-vertical:items-stretch",
        className
      )}
      {...props}
    >
      <ToggleGroupContext.Provider
        value={{ variant, size, spacing, orientation }}
      >
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  )
}

function ToggleGroupItem({
  className,
  children,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> &
  VariantProps<typeof toggleVariants>) {
  const context = React.useContext(ToggleGroupContext)

  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-variant={context.variant || variant}
      data-size={context.size || size}
      data-spacing={context.spacing}
      className={cn(
        "shrink-0 group-data-[spacing=0]/toggle-group:rounded-none group-data-[spacing=0]/toggle-group:px-2 focus:z-10 focus-visible:z-10 group-data-[spacing=0]/toggle-group:has-data-[icon=inline-end]:pe-1.5 group-data-[spacing=0]/toggle-group:has-data-[icon=inline-start]:ps-1.5 group-data-horizontal/toggle-group:data-[spacing=0]:first:rounded-s-lg group-data-vertical/toggle-group:data-[spacing=0]:first:rounded-t-lg group-data-horizontal/toggle-group:data-[spacing=0]:last:rounded-e-lg group-data-vertical/toggle-group:data-[spacing=0]:last:rounded-b-lg group-data-horizontal/toggle-group:data-[spacing=0]:data-[variant=outline]:border-s-0 group-data-vertical/toggle-group:data-[spacing=0]:data-[variant=outline]:border-t-0 group-data-horizontal/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-s group-data-vertical/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-t",
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        className
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  )
}

export { ToggleGroup, ToggleGroupItem }
