/**
 * The rider sheet's footer — **and it is §6.2's footer exactly, which is not
 * where this started.**
 *
 * ```
 *  ┌─────────────────────────────────────────────────────────────────────┐
 *  │ Open full profile                                                   │
 *  └─────────────────────────────────────────────────────────────────────┘
 * ```
 *
 * ## What was here, and why it is not
 *
 * The design brief put `Release 98.00` and `Renew plan` at the inline-end and
 * asked for both to be **disabled in place with a stated reason** (§11.2). They
 * were built that way, and then removed, on a ruling that outranks §11.2 for
 * this case: §11.2 governs a control that is BLOCKED — the operator cannot take
 * it today, someone can take it tomorrow. Neither of these is blocked. **Neither
 * exists.**
 *
 * | control | the operation that would commit it |
 * |---|---|
 * | `Release` | none. `WALLET_OPERATIONS` is `list · facets · ledger · authority · adjust`. `payouts.releaseEscrow` acts on an `EscrowHold` — `subscriptionId`, `captainId`, `tripsRequired` — which is subscription escrow released **to a captain** after N delivered trips. The rider's held money is `PAY-6150`, a `quick-ride-fare` Payment with `subscriptionId: null` frozen for fraud review, and **no `EscrowHold` references this rider at all.** Wiring the two together would have printed `0 of 5 trips delivered` as the reason a fraud hold cannot be lifted: a confidently wrong sentence, which is worse than no control. |
 * | `Renew plan` | none. `SUBSCRIPTION_OPERATIONS` carries `freeze` and `cancel` and no renewal. |
 *
 * A command with no operation is not declared, so it is **absent from both
 * profile surfaces together** rather than present-and-broken on one. A disabled
 * button whose reason is *"this does not exist"* teaches an operator to expect a
 * capability the product has not got, and a stub to make it look wired would put
 * money movement behind a control with no authority check, no audit line and no
 * inverse — which D18 forbids outright.
 *
 * The held amount is not lost with the control: it is a **fact**, and it renders
 * as one — on the wallet block in the rail, and on the payment's own row in the
 * Money tab with its `Held` badge.
 *
 * Rules applied
 *   §6.2       `Open full profile` as a plain LINK at the inline-start, and NO
 *              primary — *"the layer commits nothing"*. With both commands gone
 *              that is now literally true again, rather than true-with-a-note.
 *   §9.1       one logical row. Nothing here is placed by a physical side.
 */

import { Button } from '@/components/ui/button'
import type { Translate } from '@/lib'

export interface RiderFooterProps {
  onOpenFullProfile: () => void
  t: Translate
}

export function RiderFooter({ onOpenFullProfile, t }: RiderFooterProps) {
  return (
    <div className="flex shrink-0 items-center border-t border-border px-3 py-2">
      <Button variant="link" onClick={onOpenFullProfile}>
        {t('shell.layer.openFullProfile')}
      </Button>
    </div>
  )
}
