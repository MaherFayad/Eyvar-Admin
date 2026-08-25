/**
 * Label - restyled for Eyvar.
 *
 * Rules applied
 *   §10.2/D22  ABOVE the field, inline-start, 13px/400 `--ev-ink`, 4px gap,
 *              sentence case. The stock `font-medium` + `leading-none` becomes
 *              `font-normal`. This is the fix for D22: legacy labels are 11px
 *              `--ev-text-2`, which makes them read as hints rather than as the
 *              field's name.
 *   §10.2      `(optional)` as a SUFFIX. NO ASTERISKS anywhere in the product.
 *   §7.4.5     a placeholder is never a label. Every input has an associated
 *              `<label>`; an icon-only control gets an accessible name instead.
 *   §14        no `text-transform`, no non-zero `letter-spacing`, no italic -
 *              §9.4 forbids all three on anything that can render Arabic, and 8
 *              legacy selectors break it (D18).
 */
"use client"

import * as React from "react"
import { Label as LabelPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm font-normal text-foreground select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Label }
