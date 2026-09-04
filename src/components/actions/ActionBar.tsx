/**
 * **The record sheet's action row** — the controls a table row offers, on the
 * surface that row opens.
 *
 * ```
 *  ┌─────────────────────────────────────────────────────────────────────┐
 *  │ Open full record            [ Change captain ] [ Freeze ] [ Cancel ]│
 *  └─────────────────────────────────────────────────────────────────────┘
 * ```
 *
 * ## Why this exists, and what it changes about §6.2
 *
 * §6.2 says *the layer commits nothing*, and until now every sheet obeyed it:
 * the sheet read and the queue acted. The owner has asked for the table's
 * actions to be present in the sheet as well, which is a deliberate amendment
 * and not an oversight — an operator who has opened a record to decide
 * something should not have to close it to act on the decision.
 *
 * What the amendment does NOT relax, and what this component enforces:
 *
 *   **§11.2 — every control is gated at RENDER**, disabled in place with its
 *   reason, never hidden and never "click and be told no". `reason` is
 *   required whenever `disabled` is true, and it rides on `title` and on
 *   `aria-describedby` rather than only on a tooltip.
 *
 *   **R3 — no filled primary, and R5a no red.** A sheet is a place to read a
 *   record; a blue button on it competes with the page behind, and a red one
 *   would be a fifth use of a colour R5a closes at four. Every control here is
 *   `secondary`, including `Cancel and settle` — the destructive weight belongs
 *   on the confirmation, which is where `CancelSettleModal` already spends it.
 *
 *   **One gate.** The `disabled` and `reason` a caller passes come from the
 *   shared predicate in `./subscription.ts` or `./trip.ts` — the same call the
 *   table makes — so the two surfaces cannot refuse the same record
 *   differently.
 *
 * ## The §5.5 conflict, stated plainly
 *
 * §5.5 forbids a modal opening inside a drawer, and the confirmations these
 * controls need — `Freeze`, `Cancel and settle`, `Flag` — are modals today. The
 * two options were put to the owner: expand the confirmation in place inside
 * the sheet (§4.7 / §6.4's pattern, which keeps §5.5), or reuse the queue's
 * existing modal (one confirmation implementation, but a modal over a drawer).
 * **The owner chose to reuse the existing modals.** So the rule is knowingly
 * suspended for these three commands, the reason is on the record here, and the
 * cost is the one §5.5 names: while the confirmation is open the sheet behind it
 * is scrimmed and the operator is two surfaces deep.
 *
 * If that reads badly in use, the fix is the in-place expansion rather than a
 * third confirmation: the modals are already pure presentation — they take
 * records, a reason list and an `onConfirm` — so the form survives the move.
 */

import { Button } from '@/components/ui/button'

export interface SheetAction {
  /** Stable across renders; also the `aria-describedby` anchor for the reason. */
  id: string
  label: string
  onSelect: () => void
  /** §11.2 — disabled in place, never hidden. */
  disabled?: boolean
  /** Required whenever `disabled`. The sentence an operator reads instead. */
  reason?: string | null
}

export interface ActionBarProps {
  /** The escape to the full record. Always first, always a plain link (§6.2). */
  onOpenFullRecord: () => void
  openLabel: string
  actions: readonly SheetAction[]
}

export function ActionBar({ onOpenFullRecord, openLabel, actions }: ActionBarProps) {
  return (
    /* `flex-wrap` and not a scroller: at 480px three controls plus the link do
       not fit on one line, and a footer that scrolls sideways hides the control
       an operator was reaching for. The link stays first in source order, so it
       is first for a screen reader and for `Tab` whichever way the row wraps. */
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border px-3 py-2">
      <Button variant="link" onClick={onOpenFullRecord}>
        {openLabel}
      </Button>

      {/* `ms-auto` on the group, so the commands sit at the inline-END and the
          link at the inline-start — mirroring with the document, since neither
          is placed on a physical side (§9.1). */}
      {actions.length > 0 && (
        <div className="ms-auto flex flex-wrap items-center gap-2">
          {actions.map((action) => {
            const refused = action.disabled === true
            const reasonId = `${action.id}-reason`
            return (
              <span key={action.id} className="flex items-center">
                <Button
                  /* **`secondary` for all of them, including `Cancel and
                     settle`.** R5a closes red at four uses and a footer button
                     is not one of them; the destructive weight belongs on the
                     CONFIRMATION, which is where `CancelSettleModal` already
                     spends it. A red button here would also make the sheet
                     compete with the page behind it, which R3 forbids
                     separately. */
                  variant="secondary"
                  size="xs"
                  disabled={refused}
                  onClick={action.onSelect}
                  /* §11.2 — the reason is ON the control. `title` for a mouse,
                     `aria-describedby` for everything else; a disabled button
                     with no announced reason is a dead end. */
                  title={refused ? (action.reason ?? undefined) : undefined}
                  aria-describedby={refused && action.reason ? reasonId : undefined}
                >
                  {action.label}
                </Button>
                {refused && action.reason && (
                  <span id={reasonId} className="sr-only">
                    {action.reason}
                  </span>
                )}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
