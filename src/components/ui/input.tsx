/**
 * Input - restyled for Eyvar.
 *
 * Rules applied
 *   §10.2      `--ev-control-h` 32px (36px in Arabic — `globals.css:946`,
 *              `:1112`), radius 8px, 1px
 *              `--ev-hairline`, WHITE fill, 10px inline padding, 13px value.
 *              ONE HEIGHT for input, select and combobox. The stock `h-8` and
 *              `text-base` are replaced; the transparent field fill becomes `bg-card`,
 *              because a transparent input on the `--ev-bg` canvas has no fill.
 *   §10.2      the LABEL sits above the field at 13px/400 `--ev-ink` - see
 *              `label.tsx`. This closes D22, where labels are 11px `--ev-text-2`
 *              and read as hints. A PLACEHOLDER IS NEVER A LABEL (§7.4.5).
 *   §10.2      the placeholder is grey, the same size as the value, and exists
 *              only for a genuine format example. Most fields ship with none.
 *   §7.2 / D20 2px `--ev-blue` ring at 2px offset; THE FILL DOES NOT CHANGE on
 *              focus. `outline: none` with no replacement is a defect - 11
 *              occurrences in the legacy app, six inline inside JS templates.
 *   §4.6       disabled = `--ev-bg2` fill + hairline + `opacity-50`, and it
 *              means "not yet".
 *   §2.5       READ-ONLY IS NOT DISABLED, and the difference is load-bearing.
 *              A read-only field keeps the `--ev-bg2` fill and the border but
 *              its value stays at FULL INK, it stays focusable and it stays in
 *              the assistive-technology tree. `disabled` greys the value and
 *              drops out of some AT trees, which loses the operator the one
 *              thing a frozen or in-flight field exists to protect (AC-562,
 *              AC-563, AC-586). `AuthTextField` has no `disabled` prop at all
 *              for this reason. Two carriers separate the two states: opacity,
 *              and whether Tab reaches it.
 *              A DERIVED VALUE MUST NOT USE IT (§8.2.1) - a derived value has no
 *              box at all. Reusing this treatment for a computed field asks the
 *              border to mean two opposite things, and it resolves the wrong way.
 *   §10.4      invalid = 1px `--ev-red` border AND a 12px message below. Never
 *              colour alone. The message is `Field`'s, not this file's.
 *              THE FILL IS DELIBERATELY ABSENT AND THIS IS NOT A REGRESSION.
 *              §10.4 as written also demands an `--ev-red-lt` fill, which has
 *              never been implemented on any primitive and which `globals.css`
 *              pins to banners only (`:585`, `:954`). Striking that clause is
 *              §6.2 **D-14**, awaiting the owner. Do not "repair" this by adding
 *              a fill: it would paint the same plate as the page-level critical
 *              banner that §4.4 puts on screen at the same time, making the
 *              summary and the items indistinguishable. Border + message is two
 *              carriers and one of them is words, which is what §4.4 requires.
 *   §10.2      a MONEY input carries `SAR` as an in-field inline-START prefix; a
 *              money OUTPUT carries it trailing (§9.2's trap). Use `InputGroup`
 *              for the prefix - never a placeholder.
 *   §9.2       a PHONE value needs `dir="ltr"` plus bidi isolation, or a leading
 *              `+` jumps sides in RTL.
 *
 * Removed on arrival: `dark:` variants (four), the stock second-breakpoint font-size override
 * (there is one breakpoint in this product and it is `--ev-bp-wide`), the stock 3px focus ring, the stock half-opacity ring colour.
 */
import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-control w-full min-w-0 rounded-lg border border-input bg-card px-2.5 py-1 text-sm transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background read-only:bg-muted read-only:cursor-default disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
