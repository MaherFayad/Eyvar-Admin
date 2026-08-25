/**
 * Switch — restyled for Eyvar.
 *
 * Rules applied
 *   §4.3 / §10.2
 *               **INSTANT-EFFECT SETTINGS ONLY. If it needs a Save, it is a
 *               checkbox.** This is the whole reason the two components are
 *               not interchangeable, and it is the most common misuse.
 *   R15         a switch is a stadium BY DEFINITION — R15 governs badges,
 *               buttons, toasts, avatars and nav pills, not a track-and-thumb
 *               control. `rounded-full` is correct here and only here.
 *   D-2 / D15   28 x 16 default, 24 x 14 small — all on the 4px grid. The
 *               stock the stock 18.4 x 32 and 14 x 24 pixel literals
 *               arbitrary values are gone; `18.4px` in particular is exactly
 *               the off-grid literal D15 records as a defect.
 *   §9.5 / RTL  the thumb travel mirrors: `+X` in LTR, `-X` in RTL. The `rtl:`
 *               variants were written by the CLI (`"rtl": true`) and are
 *               retained; the arbitrary `calc(100%-2px)` is replaced by a
 *               grid value so the travel is legible.
 *   §7.2 / D20  2px `--ev-blue` ring at 2px offset. `outline-hidden` is never
 *               left bare.
 *   §7.7        >= 24px hit area via the `after:` pseudo-element, rendered box
 *               unchanged.
 *   §7.5        a switch is never the only carrier of its state — it always
 *               has a label, and the label says what ON means.
 *
 * Removed on arrival: `dark:` variants (four), the stock 3px focus ring, the stock half-opacity ring colour,
 * the stock fifth-opacity invalid ring.
 */
import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 items-center",
        "rounded-full border border-transparent transition-colors outline-hidden",
        "after:absolute after:-inset-x-3 after:-inset-y-2",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "aria-invalid:border-destructive",
        "data-[size=default]:h-4 data-[size=default]:w-7",
        "data-[size=sm]:h-3.5 data-[size=sm]:w-6",
        "data-checked:bg-primary data-unchecked:bg-input",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-card ring-0 transition-transform",
          "group-data-[size=default]/switch:size-3 group-data-[size=sm]/switch:size-2.5",
          // §9.5 — mirrored travel, one grid value per size.
          "group-data-[size=default]/switch:data-checked:translate-x-3",
          "rtl:group-data-[size=default]/switch:data-checked:-translate-x-3",
          "group-data-[size=sm]/switch:data-checked:translate-x-2.5",
          "rtl:group-data-[size=sm]/switch:data-checked:-translate-x-2.5",
          "data-unchecked:translate-x-0.5 rtl:data-unchecked:-translate-x-0.5"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
