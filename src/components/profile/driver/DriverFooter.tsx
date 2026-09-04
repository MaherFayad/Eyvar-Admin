/**
 * The captain sheet's footer — §6.2's footer exactly: `Open full profile` as a
 * plain link at the inline-start, and **no primary**.
 *
 * ```
 *  ┌─────────────────────────────────────────────────────────────────────┐
 *  │ Open full profile                                                   │
 *  └─────────────────────────────────────────────────────────────────────┘
 * ```
 *
 * ## Why there is no committing action here, when five operations exist
 *
 * This is the interesting difference from the rider, whose footer is empty
 * because `Release` and `Renew plan` have **no operation anywhere**. A captain
 * has five: `suspendDriver`, `reinstateDriver`, `payCaptain`, `applyDeduction`
 * and `waiveDeduction` all ship and all work. So the rider's reasoning does not
 * transfer, and a different one is needed.
 *
 * **Each of the five is already declared exactly once, elsewhere, on purpose.**
 * `commands/captains.ts` owns suspend and reinstate for the Captains index, the
 * bulk bar and the command palette, and its header records what happened the
 * last time one command had two declarations: *"`Suspend` in the row menu
 * carried `disabled: (d) => !canWrite || d.suspended`, and `Suspend` in the bulk
 * bar carried nothing — so selecting a suspended captain and using the bulk bar
 * suspended them a second time, while the kebab on that same row was dead."*
 * Declaring any of them a second time in this footer is that defect, reopened.
 *
 * **And every one of them needs a confirmation this surface cannot host.** Each
 * requires a §5.3 dialog with a validated reason — `suspendDriver` takes a
 * `reason` **by contract** — and §5.5 forbids a modal nested inside the profile
 * modal. So the sheet could not host it and the page could, which would put a
 * command on one surface and not the other: exactly what §3's parity contract
 * refuses.
 *
 * The two things that follow are both deliberate:
 *
 *   1. **Neither surface declares a captain command**, together, rather than one
 *      of them declaring it and the other going without.
 *   2. **Nothing here is a disabled button with an invented reason.** §11.2
 *      governs a control that is *blocked* — the operator cannot take it today,
 *      someone can take it tomorrow. None of these is blocked. None of them
 *      belongs on this surface at all, and a greyed `Suspend` reading *"use the
 *      Captains index"* would teach an operator that the console is broken
 *      rather than that the work lives somewhere specific.
 *
 * What the surface does instead is **navigate to where each decision is taken** —
 * `Open compliance file` on the documents list, and the page's `Open payouts`
 * beside the ledger. That is the conclusion the rider profile reached for
 * `Assign a captain`, for the same reason: the work needs a screen this one is
 * not, and Shopify's own precedent (`Fulfill item`, `Create shipping label`)
 * navigates rather than mutating in place.
 *
 * **Raised in the handoff:** wiring both profile surfaces into `src/commands/`
 * — one declaration, an in-place §4.7 confirmation that works inside a modal,
 * and `resolveCommands` at both call sites — is the real fix and it spans files
 * this task does not own.
 *
 * Rules applied
 *   §6.2       `Open full profile` as a plain LINK at the inline-start, and no
 *              primary — *"the layer commits nothing"*, which is literally true.
 *   §9.5       **No `↗`.** It is the external-link mark and this navigates in
 *              place; teaching an operator that it means nothing in particular
 *              costs more than the glyph buys.
 *   §9.1       one logical row. Nothing here is placed by a physical side.
 */

import { Button } from '@/components/ui/button'
import type { Translate } from '@/lib'

export interface DriverFooterProps {
  onOpenFullProfile: () => void
  t: Translate
}

export function DriverFooter({ onOpenFullProfile, t }: DriverFooterProps) {
  return (
    <div className="flex shrink-0 items-center border-t border-border px-3 py-2">
      <Button variant="link" onClick={onOpenFullProfile}>
        {t('shell.layer.openFullProfile')}
      </Button>
    </div>
  )
}
