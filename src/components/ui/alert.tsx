/**
 * Alert — the base for Eyvar's `Banner` (B-01). Restyled on arrival.
 *
 * `docs/ref/components.md`: "Banner — none, build it. shadcn `alert` is close;
 * restyle." This file is the restyled base; `Banner` (0.7) composes it and
 * owns the merge rule, the dismiss rule and the copy.
 *
 * Rules applied
 *   R1 / R16   a PALE TINTED CARD in one of four tones. The stock left-border
 *              strip and the saturated red strip in
 *              `02-orders/draft-order-validation-error-banner.webp` are banner
 *              Family A and R1 kills both. The stock `destructive` variant —
 *              white card, red text — is deleted.
 *   R17        ONE warning tone. Separate "waiting on them" from "waiting on
 *              you" with the label, never a second fill.
 *   R5a use #2 `critical` is the only red surface here, and there is at most
 *              ONE critical banner per page.
 *   R10 / §5.2 at most one page-level banner, ever. Two or more true
 *              conditions MERGE into one carrying a count (AC-40). The merge
 *              lives in `Banner`, not here — but nothing in this file makes
 *              stacking easy, deliberately.
 *   §11.4      anatomy: 16px glyph inline-start · title 13px/600 · optional
 *              body sentence 13px/400 · zero to two secondary buttons BENEATH
 *              the body, inline-start aligned · optional dismiss.
 *              The stock `AlertAction` pins actions to the top inline-end
 *              corner; §11.4 puts them under the body, so the slot is renamed
 *              `AlertActions` and re-placed. `AlertDismiss` is the ✕ slot.
 *   §11.4      `shell` variant: full-bleed above the top bar, 32px, NO radius
 *              (it spans the viewport, so a card radius is wrong), bottom
 *              hairline, one line plus actions.
 *   R6         full sentences take a period; fragments and button labels do not.
 *   §9.1       `text-start`, `ps-`/`pe-` — logical only.
 *
 * Removed on arrival: the `default`/`destructive` variant pair, `md:` (there is
 * one breakpoint and it is `--ev-bp-wide`), and an off-grid inline-end padding
 * step. (Described rather than spelled - a utility named in prose ships as a rule.)
 */
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  [
    "group/alert relative w-full text-start text-sm",
    "grid gap-x-2 gap-y-1",
    "has-[>svg]:grid-cols-[auto_1fr]",
    "*:[svg]:row-span-3 *:[svg]:translate-y-0.5 *:[svg]:text-current",
    "*:[svg:not([class*='size-'])]:size-4",
  ].join(" "),
  {
    variants: {
      // R1 / R16 — four tones, pale tinted, label colour carries the meaning.
      tone: {
        info: "bg-info text-info-foreground",
        success: "bg-success text-success-foreground",
        warning: "bg-warning text-warning-foreground",
        critical: "bg-critical text-critical-foreground",
      },
      // §11.4 placement variants.
      variant: {
        // First element of the content block, spanning main + rail.
        page: "rounded-xl border border-transparent px-3 py-2.5",
        // Scoped to a card when the condition belongs to that card only.
        card: "rounded-lg border border-transparent px-2.5 py-2",
        // Full-bleed above the top bar: 32px, no radius, bottom hairline.
        shell:
          "h-shellbar items-center rounded-none border-0 border-b border-border px-3 py-0",
      },
    },
    defaultVariants: {
      tone: "info",
      variant: "page",
    },
  }
)

function Alert({
  className,
  tone = "info",
  variant = "page",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      data-tone={tone}
      data-variant={variant}
      role="alert"
      className={cn(alertVariants({ tone, variant }), className)}
      {...props}
    />
  )
}

/** Title — 13px/600. A fragment, so no trailing period (R6). */
function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "font-semibold group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-4",
        className
      )}
      {...props}
    />
  )
}

/**
 * Body — 13px/400, inherits the tone's label colour rather than dropping to
 * `--muted-foreground`: grey body text inside a tinted card fails contrast
 * against the tint and drops the tone's meaning.
 */
function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-sm group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-4",
        className
      )}
      {...props}
    />
  )
}

/**
 * Actions — zero to TWO secondary buttons, beneath the body, inline-start
 * aligned (§11.4). Never a primary: a banner states a condition, the page owns
 * the primary action.
 */
function AlertActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-actions"
      className={cn(
        "flex items-center gap-2 group-has-[>svg]/alert:col-start-2 group-data-[variant=shell]/alert:col-start-auto group-data-[variant=shell]/alert:ms-auto",
        className
      )}
      {...props}
    />
  )
}

/**
 * Dismiss — present ONLY when the banner announces a completed action.
 * ABSENT when it names a standing condition (§11.4): an operator must not be
 * able to dismiss "You are offline."
 */
function AlertDismiss({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dismiss"
      className={cn("absolute top-2 end-2", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, AlertActions, AlertDismiss }
