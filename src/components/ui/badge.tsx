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
        /* The NAV's neutral count chip, and only the nav's — V3.
           This is NOT a sixth content tone and R7 is untouched: it is the same
           `neutral` meaning on a different GROUND. `--ev-bg2` is 1.073 : 1
           LIGHTER than `--ev-bg-nav`, so the stock neutral chip on the nav is a
           plate nobody can see, and that invisibility is exactly why every nav
           badge got promoted to `attention` — peach was the only fill with a
           shape. `--ev-nav-chip` is 1.141 : 1 DARKER, matching Shopify's own
           measured chip step (`#DDDDDD` on `#EBEBEB`, 1.139 : 1) to three
           decimals. Digits are `--ev-ink` (12.92 : 1), never `--ev-text-2`,
           which fails AA at 11px on any plate dark enough to read. */
        "nav-neutral": "bg-nav-chip text-nav-chip-foreground",
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

/**
 * **AC-73 / §9.2 — a count badge is a numeral run and is bidi-ISOLATED.**
 *
 * Found in the RTL screenshot at 1280: the overflow marker `99+` rendered as
 * `+99`. `+` is a bidi-neutral character, and a neutral at the end of a run
 * inside an RTL paragraph takes the paragraph's direction and jumps to the
 * other side. The same would happen to any future `+`/`−` delta or trailing
 * unit.
 *
 * **U+2066 LEFT-TO-RIGHT ISOLATE … U+2069 POP DIRECTIONAL ISOLATE, not a `dir`
 * attribute.** `dir="ltr"` on the span would fix the glyph order and break
 * **AC-70** — *"`dir=rtl` is set on the document element, not on a subtree"* —
 * which asserts that every `[dir]` in the body reads `rtl`. The isolate
 * characters are text, carry no attribute, and are the mechanism the Unicode
 * bidi algorithm provides for exactly this case. One criterion is not traded
 * for another.
 *
 * `default`-size badges carry WORDS, which must mirror, so only `count` is
 * isolated. A non-string child (an icon, a `<Slot>`) is passed through
 * untouched.
 */
const LRI = "\u2066"
const PDI = "\u2069"

function Badge({
  className,
  tone = "neutral",
  size = "default",
  asChild = false,
  children,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"
  /* Isolate ONLY when the run actually contains a bidi-neutral character. A
     pure digit run (`12`, `7`) has strong-LTR direction of its own and needs no
     help; `99+`, a future `+3` delta or a trailing unit does. Narrowing it this
     way also keeps the badge's `textContent` byte-identical for the common
     case, which matters because tests and screen readers both read it. */
  const raw = typeof children === "string" || typeof children === "number" ? String(children) : null
  const content =
    size === "count" && !asChild && raw !== null && /\D/.test(raw)
      ? `${LRI}${raw}${PDI}`
      : children

  return (
    <Comp
      data-slot="badge"
      data-tone={tone}
      data-size={size}
      className={cn(badgeVariants({ tone, size }), className)}
      {...props}
    >
      {content}
    </Comp>
  )
}

export { Badge, badgeVariants }
