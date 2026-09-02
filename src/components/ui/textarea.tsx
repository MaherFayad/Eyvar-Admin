/**
 * Textarea - restyled for Eyvar.
 *
 * Rules applied
 *   §10.2      same border treatment as an input, ~72px tall (`min-h-18`),
 *              VERTICAL RESIZE ONLY. The stock 16-step minimum height and free resize are
 *              replaced; `text-base` becomes `text-sm` (13px).
 *   §10.2      a character counter, where a hard limit exists, is right-aligned
 *              INSIDE the field as `0/40`. Compose it with `InputGroup`.
 *   §7.2 / D20 2px `--ev-blue` ring at 2px offset, fill unchanged.
 *   §4.6       disabled = `--ev-bg2` fill + `opacity-50`. Never used for a
 *              derived value.
 *   §2.5       read-only = the same fill WITHOUT the opacity, still focusable,
 *              value at full ink. See `input.tsx` for why the two must not
 *              collapse into one treatment.
 *
 * Removed on arrival: `dark:` variants (four), the stock second-breakpoint font-size override, the stock 3px focus ring,
 * the stock half-opacity ring colour.
 */
import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-18 w-full resize-y rounded-lg border border-input bg-card px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background read-only:bg-muted read-only:cursor-default disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
