/**
 * `StatusBadge` (V-01) — design spec §12.1, **R7**, **R5a**, **R15**.
 *
 * A thin, deliberate wrapper over the restyled `badge` primitive. It exists to
 * make two rules unrepresentable rather than merely documented:
 *
 *   **There is no red badge** (R5a). `badge.tsx` already deletes the stock
 *   `destructive` variant; this adds no way back. Per-row criticality is
 *   `RowCriticalMarker` (V-05, a 3px inset leading edge) plus the countdown
 *   pill's own words — never a badge.
 *
 *   **Badges are never interactive** (§12.1). There is no `onClick`, no
 *   `href`, no focus ring. An editable status uses a select or a card action.
 *
 * The five tones (R7 closes the set):
 *   `success`  live · complete · money settled. **`Paid` is always success** (R14).
 *   `warning`  needs attention · blocks money or fulfilment. **ONE tone** (R17):
 *              "waiting on them" and "waiting on you" differ by LABEL.
 *   `info`     not yet live · withheld — `Draft`, `Hidden`.
 *   `neutral`  inert · terminal factual outcome — `Archived`, `Refunded`,
 *              **`Rejected`**. A rejection is neutral, never red (V-07, R5).
 *   `new`      an **OUTLINE**, not a fifth fill. The rebuilt token set has no
 *              fifth pale tint and §6.4 forbids introducing a colour, so the
 *              outline is a TREATMENT and R7's closed set of five is intact.
 *              Nobody adds `--ev-teal-lt` to solve this.
 *
 * Geometry (§12.1): rounded rectangle, radius 8px, 20px tall, 11px/600 label
 * (12px in Arabic, through the `text-2xs` token), 6px inline padding. **Never a
 * stadium** (R15) — this retires the legacy `border-radius:999px` (`:117`).
 *
 * §7.5 — colour is never the only carrier: every tone pairs with a word, and
 * the word is required by the type.
 */

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { BadgeTone } from '@/data/types'

export interface StatusBadgeProps {
  tone: BadgeTone
  /** Required. A badge with no word is colour alone, which §7.5 forbids. */
  children: string
  className?: string
}

export function StatusBadge({ tone, children, className }: StatusBadgeProps) {
  return (
    <Badge tone={tone} className={className}>
      {children}
    </Badge>
  )
}

/**
 * `RowCriticalMarker` (V-05) — **R5a use #3**, design spec §9.3 (b).
 *
 * A 3px full-height `--ev-red` marker on a breached row's **leading edge**.
 * Legal because it is not a badge: no pill geometry, no fill-plus-text pairing,
 * no label, and it sits outside the row's content box.
 *
 * Implemented as an absolutely positioned span at `start-0`, **not** as
 * `box-shadow: inset 3px 0 0`. Two reasons, and both are rules:
 *   - `box-shadow` is one property and §7.2's focus ring already occupies it
 *     (the R-3 elevation ruling), so a row carrying both would drop one;
 *   - a physical `inset 3px 0 0` does not mirror in Arabic, and §9.1 admits no
 *     physical direction anywhere.
 *
 * **At most ONE red carrier per row** (§9.3): this marker **or** an icon tile,
 * never both, or red stops meaning "this one". And a breached row **must not
 * pulse, blink or loop** — R18: a loop may only signal "this feed is live" and
 * may never encode severity.
 *
 * The row must also carry the countdown reading `overdue 14m` **in words**, so
 * the state survives colour being removed (**AC-50**): rendering the queue in
 * greyscale still shows which rows are breached.
 */
export function RowCriticalMarker({ className }: { className?: string } = {}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-y-0 -start-3 w-[3.5px] bg-destructive z-10",
        className
      )}
    />
  )
}
