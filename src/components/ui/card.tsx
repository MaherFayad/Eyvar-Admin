/**
 * Card — restyled for Eyvar. Do not use the stock shadcn version.
 *
 * Rules applied
 *   R15 / C3    radius 12px = `--ev-radius-card`, exposed as `rounded-xl`.
 *               Larger than the 8px control radius, and R13 preserves the
 *               measured figure.
 *   D33         the card is `--ev-surface`, one value step RECESSED under the
 *               page in both themes. This closes legacy defect D1 and D-11,
 *               where the card and the page were both white.
 *   D34         its second carrier is `border-card-border`, a real 1px
 *               hairline in BOTH themes. There is no shadow and no inset
 *               highlight; a step plus a line is the whole of elevation.
 *   §10.1       ONE CONCERN PER CARD. Bold card title, 12px internal padding,
 *               12px between cards. `--card-spacing` is 12px, not the stock
 *               16px — D-2, density is the product.
 *   §10.1       card title is 13px/600 `--ev-ink`, not 15px/500. The stock
 *               `font-heading text-base font-medium` is replaced.
 *   §9.4/D18    no `text-transform`, no `letter-spacing` anywhere on a card.
 *   §3.5        an empty pair inside a rail card renders an explicit grey
 *               placeholder sentence, never blank — that is `EmptyState`
 *               `no-match`, and it is the caller's job.
 *
 * Removed on arrival: the stock 1px translucent ring, `bg-muted/50` on the
 * footer (a filled grey band; D18), `font-heading`.
 */
import * as React from "react"

import { cn } from "@/lib/utils"

function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card flex flex-col gap-(--card-spacing) overflow-hidden",
        "rounded-xl border border-card-border bg-card py-(--card-spacing)",
        "text-sm text-card-foreground",
        "[--card-spacing:--spacing(3)] data-[size=sm]:[--card-spacing:--spacing(2)]",
        "has-data-[slot=card-footer]:pb-0",
        "has-[>img:first-child]:pt-0",
        "*:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header grid auto-rows-min items-start gap-1 px-(--card-spacing)",
        "has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        "has-data-[slot=card-description]:grid-rows-[auto_auto]",
        "[.border-b]:pb-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

/**
 * 16px/600 `--ev-ink`. A fragment, so no trailing period (R6).
 *
 * **Raised from `text-sm` — this was the weakest boundary in the type system.**
 * A card title rendered at body size, separated from the paragraph beneath it
 * by one weight step and nothing else: 14px/600 against 14px/400. Fifty call
 * sites, so fifty cards whose heading did not read as a heading.
 *
 * `--text-base` is where every dialog, drawer, nav-column and empty-state
 * heading already sits, so this joins an established step rather than inventing
 * one. `globals.css` names it as the largest single hierarchy gain left in the
 * product and explicitly cannot take it: a utility beats a base-layer rule, so
 * the fix has to be here, at the one line that decides it for all fifty.
 */
function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-base font-semibold text-foreground", className)}
      {...props}
    />
  )
}

/** One line of grey prose — 12px `--ev-text-2` (§10.1 layout B). */
function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center gap-2 border-t border-border p-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
