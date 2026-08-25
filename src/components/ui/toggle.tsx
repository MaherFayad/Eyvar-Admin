/**
 * Toggle - restyled for Eyvar.
 *
 * Rules applied
 *   §1.2       heights are tokens: `--ev-control-h` (28px) default and
 *              `--ev-control-h-lg` (36px) large, so they widen in Arabic through
 *              the token. The stock `h-8` / `h-9` / `h-7` literals are replaced.
 *   R3         THE ON STATE IS NOT `bg-primary`. Brand blue means "primary
 *              action" under R3/D-1; a pressed toggle is a state, not an action.
 *              On = white surface PLUS weight 600 on the `--ev-bg2` track - two
 *              carriers, so it survives greyscale (§7.5).
 *   §7.2       2px `--ev-blue` ring at 2px offset; `aria-pressed` carries the
 *              state to assistive tech.
 *   R15        radius 8px.
 *
 * Use it through `ToggleGroup`. A lone toggle is almost always a checkbox or a
 * switch in disguise - `checkbox.tsx` says which.
 */
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Toggle as TogglePrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

const toggleVariants = cva(
  "group/toggle inline-flex items-center justify-center gap-1 rounded-lg text-sm font-medium whitespace-nowrap transition-all outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-pressed:bg-card aria-pressed:font-semibold data-[state=on]:bg-card data-[state=on]:font-semibold [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-input bg-card hover:bg-accent",
      },
      size: {
        default:
          "h-control min-w-control px-2.5 has-data-[icon=inline-end]:pe-2 has-data-[icon=inline-start]:ps-2",
        sm: "h-6 min-w-6 rounded-lg px-2.5 text-xs has-data-[icon=inline-end]:pe-1.5 has-data-[icon=inline-start]:ps-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-control-lg min-w-control-lg px-2.5 has-data-[icon=inline-end]:pe-2 has-data-[icon=inline-start]:ps-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
