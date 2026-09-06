/**
 * `StatusBadge` (V-01) — design spec §12.1, **R7**, **R5a**, **R15**.
 *
 * A thin, deliberate wrapper over the restyled `badge` primitive. It exists to
 * make two rules unrepresentable rather than merely documented:
 *
 *   **There is no red badge** (R5a). `badge.tsx` already deletes the stock
 *   `destructive` variant; this adds no way back. Per-row criticality is the
 *   row's own ground plus the countdown pill's words — never a badge.
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
 * Geometry (§12.1): rounded rectangle, radius 4px, 20px tall, 12px/600 label,
 * 6px inline padding, no border. **Never a stadium** (R15) and never the 8px
 * control radius, so a chip is never read as a control (AC-CC-02).
 *
 * §7.5 — colour is never the only carrier: every tone pairs with a word, and
 * the word is required by the type.
 */

import { Badge } from '@/components/ui/badge'
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
