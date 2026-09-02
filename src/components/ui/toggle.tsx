/**
 * Toggle - restyled for Eyvar.
 *
 * Rules applied
 *   §1.2       heights are tokens: `--ev-control-h` (28px) default and
 *              `--ev-control-h-lg` (36px) large, so they widen in Arabic through
 *              the token. The stock 7, 8 and 9 height literals are replaced.
 *   R3         THE ON STATE IS NOT `bg-primary`. Brand blue means "primary
 *              action" under R3/D-1; a pressed toggle is a state, not an action.
 *              On = white surface PLUS weight 600 on the `--ev-bg2` track - two
 *              carriers, so it survives greyscale (§7.5).
 *   §7.2       2px `--ev-blue` ring at 2px offset; `aria-pressed` carries the
 *              state to assistive tech.
 *   §7.6       `transition-colors`, and NOT the blanket `all` variant. With
 *              `all`, `aria-pressed:font-semibold` INTERPOLATED: `--font-sans`
 *              leads with Inter Variable declared `font-weight: 100 900`
 *              (`globals.css` @font-face), so pressing a toggle grew its own
 *              label from 500 to 600 over 150ms. `motion.md` licenses five
 *              kinds of motion and text thickening is none of them. `all`
 *              also transitioned the focus ring on `box-shadow` (§7.2), and
 *              a ring that fades in is a ring that is not there yet. Arabic
 *              carries the same axis (Naskh 400-700). The class name is
 *              deliberately not spelled here - Tailwind v4 scans comments as
 *              plain text and would emit the utility from this very line.
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
  "group/toggle inline-flex items-center justify-center gap-1 rounded-lg text-sm font-medium whitespace-nowrap transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-pressed:bg-card aria-pressed:font-semibold data-[state=on]:bg-card data-[state=on]:font-semibold [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
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
