/**
 * Button — restyled for Eyvar. Do not use the stock shadcn version.
 *
 * Rules applied
 *   R3 / D-1   primary is `bg-primary` (brand blue), never near-black.
 *              At most ONE primary per page header (design spec §8, slot 4c).
 *   R5a        `destructive` is a FILLED red primary and exists for exactly one
 *              use: the confirming primary of an UNRECOVERABLE action (§5.3,
 *              R5a use #1). It is not a row action, not an overflow item, not a
 *              bulk action. A recoverable destructive confirmation uses the
 *              normal blue primary. The stock pale-red "destructive" tint is
 *              deleted — a pale red button reads as a badge.
 *   R15        radius 8px (`rounded-lg`) at every size. Never a stadium.
 *   §1.2       two heights, both tokens: `--ev-control-h` 28px (compact — the
 *              toolbar, page-header and banner button) and `--ev-control-h-lg`
 *              36px (in-form and full-width primary). Both widen in Arabic
 *              through the token, not a second class (§9.7).
 *   §7.2 / D20 `outline-hidden` is paired with a 2px `--ev-blue` ring at 2px
 *              offset. Never removed.
 *   §9.1       logical utilities only; the CLI converted on add (`rtl: true`).
 *   D-2 / D15  every size is on the 4px grid. The stock
 *              the stock min() radius clamp and an 0.8rem arbitrary font size
 *              arbitrary values are gone.
 *
 * Removed on arrival: `dark:` variants (Eyvar ships one theme), the
 * `color-mix` hover literal, the stock 3px focus ring.
 *
 * DELIBERATE BEHAVIOUR CHANGE: the default variant is `secondary`, not
 * `default`. R3 allows one primary per screen, so the primary must be asked
 * for by name — `<Button variant="default">` — and cannot arrive by omission.
 */
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  [
    "group/button inline-flex shrink-0 items-center justify-center gap-1.5",
    "rounded-lg border border-transparent bg-clip-padding",
    "text-sm font-medium whitespace-nowrap select-none",
    "transition-colors outline-hidden",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    // §4.6 — disabled says "this will become available". It is never used to
    // express a derived value (§8.2.1) and never to hide a missing permission:
    // an action the role cannot use renders disabled IN PLACE (§11.2).
    "disabled:pointer-events-none disabled:opacity-50",
    "aria-invalid:border-destructive",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "[&_svg:not([class*='size-'])]:size-4",
  ].join(" "),
  {
    variants: {
      variant: {
        // R3 / D-1 — the one primary.
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        // The everyday secondary: white surface, hairline, ink label.
        //
        // **`border-border-control`, not `border-border` — R23, match audit
        // N3.** `--ev-hairline-control` #d0d7dd (1.454 : 1) is the CONTROL
        // weight and `--ev-hairline` #e3e7ea (1.244 : 1) is structure. The
        // token was measured, declared and had ZERO consumers; every button in
        // the product wore the structural weight instead, which is how
        // craft-critique F7 found a non-interactive `Pending` badge outlined in
        // near-black beside an `Approve` BUTTON outlined at 1.122 — the
        // affordance exactly inverted. The interactive element is now at least
        // as defined as the static one. Not a §7 contrast requirement either
        // way: the boundary is never the sole indicator, the label is.
        secondary:
          "border-border-control bg-secondary text-secondary-foreground hover:bg-accent aria-expanded:bg-accent",
        // Same geometry, no surface — toolbar icons, kebabs, nav rows.
        ghost:
          "text-foreground hover:bg-accent hover:text-accent-foreground aria-expanded:bg-accent",
        // R3 consequence — blue no longer carries links, so a link takes
        // --ev-blue-dk plus an underline. `text-info-foreground` IS --ev-blue-dk.
        link: "h-auto p-0 text-info-foreground underline underline-offset-4 hover:no-underline",
        // R5a use #1 only. See the header.
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive",
      },
      size: {
        // 28px — the compact button. --ev-control-h, 32px in Arabic.
        default: "h-control px-2.5",
        // 24px — top-bar chips (§4 slots 4a/4b) and in-cell controls.
        xs: "h-6 gap-1 px-2 text-2xs [&_svg:not([class*='size-'])]:size-3",
        // 36px — in-form and full-width primary. --ev-control-h-lg.
        lg: "h-control-lg px-3",
        // 28 × 28 — the top-bar icon buttons, the row kebab.
        icon: "size-control",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-lg": "size-control-lg",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "secondary",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
