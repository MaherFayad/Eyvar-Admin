/**
 * The request sheet's footer — §6.2's footer exactly: one plain link at the
 * inline-start, and no primary.
 *
 * ```
 *  ┌─────────────────────────────────────────────────────────────────────┐
 *  │ Open full profile                                                   │
 *  └─────────────────────────────────────────────────────────────────────┘
 * ```
 *
 * ## Why the queue's five commands are not here
 *
 * `Claim`, `Release`, `Take over`, `Assign captain` and `Close` all exist, all
 * reach the data layer, and none of them belongs on this surface. §6.2 is
 * explicit that **the layer commits nothing**, and the reason is sharper on
 * this record than on any other in the product: assigning a captain to a
 * subscription request **captures the rider's authorisation hold** — money
 * moves, and `RequestsScreen` confirms it with a sentence saying it cannot be
 * undone from here.
 *
 * A command that moves money needs its confirmation, its take-over check
 * (AC-209: an item held by another operator is the moment a customer gets two
 * answers), its permission gate and its row-level failure state. All four exist
 * on the queue, correctly, one layer up. Rebuilding them inside a drawer would
 * be a second implementation of the same decision — and §5.5 forbids the modal
 * that confirmation would need to open here anyway (*"a modal nested inside a
 * drawer is FORBIDDEN"*).
 *
 * So the sheet **reads** and the queue **acts**, which is the same division the
 * rider and captain sheets already keep. The operator closes the sheet knowing
 * what the ride is worth and how long it has waited, and the row they came from
 * is still under their cursor with every control on it.
 *
 * Rules applied
 *   §6.2       `Open full profile` as a plain LINK at the inline-start, NO
 *              primary — the layer commits nothing, and here that is literal.
 *   §9.1       one logical row. Nothing is placed by a physical side.
 */

import { Button } from '@/components/ui/button'
import type { Translate } from '@/lib'

export interface RequestFooterProps {
  onOpenFullProfile: () => void
  t: Translate
}

export function RequestFooter({ onOpenFullProfile, t }: RequestFooterProps) {
  return (
    <div className="flex shrink-0 items-center border-t border-border px-3 py-2">
      <Button variant="link" onClick={onOpenFullProfile}>
        {t('shell.layer.openFullProfile')}
      </Button>
    </div>
  )
}
