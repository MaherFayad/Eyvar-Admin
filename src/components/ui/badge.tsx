/**
 * Badge — restyled for Eyvar. Do not use the stock shadcn version.
 *
 * Rules applied
 *   R7          FIVE tones and no sixth: success · warning · info · neutral ·
 *               new. The tone set is closed. The legacy app ships 11 tones
 *               across three byte-identical systems (D5, D6); they collapse to
 *               these five.
 *   R5a         THERE IS NO RED BADGE. The stock `destructive` variant is
 *               DELETED, not restyled. Per-row criticality is carried by
 *               `RowCriticalMarker` (V-05, a 3px inset leading edge) plus the
 *               countdown pill's own words — never by a badge.
 *   R15         rounded rectangle, `rounded-lg` (8px). NEVER a stadium. This
 *               retires the legacy `border-radius:999px`. The stock
 *               the stock stadium radius is gone.
 *   R17         ONE warning tone. "Waiting on them" and "waiting on you" are
 *               separated by the LABEL, never by a second fill.
 *   §12.1       `new` is an OUTLINE, not a fifth fill — the rebuilt token set
 *               has no fifth pale tint and §6.4 forbids inventing a colour.
 *               An outline is a treatment, not a sixth tone. Do not add
 *               `--ev-teal-lt` to "solve" this.
 *   §12.1       geometry: 20px tall, 11px/600 label (12px in Arabic via the
 *               `text-2xs` token), 6px inline padding.
 *   §2.4        the `count` size is the nav badge: 16px tall, min-width 16px,
 *               4px inline padding. It renders NOTHING at zero (AC-26) — that
 *               is the caller's job; this component never invents a `0`.
 *   §12.1       badges are NEVER interactive. No hover state, no link variant,
 *               no focus ring — an editable status uses a select or a card
 *               action. `asChild` is kept only so a badge can be a `<span>`
 *               inside a heading, never so it can be an `<a>`.
 *   §7.5        colour is never the only carrier: every tone pairs with a word.
 *
 * Removed on arrival: `destructive`, `default`, `secondary`, `ghost`, `link`
 * variants; all `[a]:hover:` rules; `dark:` variants; the stock 3px focus ring.
 */
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  [
    "inline-flex w-fit shrink-0 items-center justify-center gap-1",
    "rounded-lg border border-transparent",
    "font-semibold whitespace-nowrap tabular-nums",
    "[&>svg]:pointer-events-none [&>svg]:size-3",
  ].join(" "),
  {
    variants: {
      tone: {
        // live · complete · money settled. `Paid` is always success (R14).
        success: "bg-success text-success-foreground",
        // needs attention · blocks money or fulfilment. One tone (R17).
        warning: "bg-warning text-warning-foreground",
        // not yet live · withheld — `Draft`, `Hidden`.
        info: "bg-info text-info-foreground",
        // inert · terminal factual outcome — `Archived`, `Refunded`, `Rejected`.
        // A rejection is NEUTRAL (§8.4.5, V-07), never red.
        neutral: "bg-neutral text-neutral-foreground",
        // a new or promotional marker — outline, not a fill (§12.1).
        new: "border-primary bg-transparent text-info-foreground",
      },
      size: {
        // Status badge: 20px, 11px/600, 6px inline padding.
        default: "h-5 px-1.5 text-2xs",
        // Nav count badge (§2.4): 16px, min-width 16px, 4px inline padding.
        count: "h-4 min-w-4 px-1 text-2xs",
      },
    },
    defaultVariants: {
      tone: "neutral",
      size: "default",
    },
  }
)

function Badge({
  className,
  tone = "neutral",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-tone={tone}
      data-size={size}
      className={cn(badgeVariants({ tone, size }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
