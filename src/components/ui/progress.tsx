/**
 * Progress — restyled for Eyvar. Exists for ONE job.
 *
 * It is the 3px SLA track inside `SlaCountdown` (V-04), and nothing else. It
 * is not a page loading indicator (that is `Skeleton`), not a file-upload bar
 * and not a KPI meter.
 *
 * Rules applied
 *   §8.4.2 / V-04
 *               the track is shown ONLY when the total window is known, and
 *               **its denominator is the item's OWN SLA target**. The legacy
 *               hard-coded `90` (`:11652`) means the bar says something
 *               different on every queue that borrows it — that must not ship.
 *               This component therefore takes `value` as a percentage and
 *               refuses to guess: `max` is the caller's, always.
 *   §8.4.2      three bands, and the BAND is the caller's (`SlaCountdown`
 *               computes it from the item's target): >= 50% neutral · < 50%
 *               warning · breached hands over to the critical row's ground.
 *               So the fill takes a `tone`, and there is no `default` blue —
 *               blue would read as "primary action" under R3.
 *   §7.5 / AC-50
 *               COLOUR IS NEVER THE ONLY CARRIER. The track always accompanies
 *               a countdown pill that says `12m left` or `overdue 14m` in
 *               words. Rendering this bar alone is a defect.
 *   R18         the track NEVER pulses, blinks or loops. A loop may only
 *               signal "this feed is live" and may never encode severity.
 *   §9.2 / RTL  the fill is expressed as a WIDTH, not the stock
 *               `transform: translateX(-N%)`. A negative X translation fills
 *               from the wrong edge under `dir="rtl"`; a width grows from the
 *               inline-start in both directions.
 *   §1.2        3px = `--ev-marker`, the same token as the R5a row-critical
 *               leading edge, so the two 3px signals cannot drift apart.
 *   a11y        Radix supplies `role="progressbar"` and the aria value pair;
 *               the caller must still supply an accessible name.
 */
import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Progress({
  className,
  value,
  tone = "neutral",
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  tone?: "neutral" | "warning"
}) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      data-tone={tone}
      value={value}
      className={cn(
        "relative h-marker w-full overflow-hidden rounded-xs bg-muted",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          "h-full transition-[width]",
          tone === "warning" ? "bg-warning-foreground" : "bg-muted-foreground"
        )}
        style={{ width: `${Math.min(100, Math.max(0, value ?? 0))}%` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
