/**
 * Card — restyled for Eyvar. Do not use the stock shadcn version.
 *
 * Rules applied
 *   R15 / C3    radius 12px = `--ev-radius-card`, exposed as `rounded-xl`.
 *               Larger than the 8px control radius, and R13 preserves the
 *               measured figure.
 *   §1.1 / D1   the card is `--ev-surface` (white) on an `--ev-bg` canvas, so
 *               canvas and card are finally distinct. This closes legacy
 *               defect D1, where both were white.
 *   §2.1        separated from the canvas by a 1px `--ev-hairline` BORDER, not
 *               a ring and not a shadow. The stock `ring-1 ring-foreground/10`
 *               is a translucent black ring over an unknown backdrop; a token
 *               hairline is the sanctioned separator (design spec §1.1).
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
 * Removed on arrival: `ring-1 ring-foreground/10`, `bg-muted/50` on the
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
        "rounded-xl border border-border bg-card shadow-1 py-(--card-spacing)",
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

/** 13px/600 `--ev-ink`. A fragment, so no trailing period (R6). */
function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-sm font-semibold text-foreground", className)}
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
