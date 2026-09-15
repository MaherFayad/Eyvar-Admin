/**
 * The row action, its two shapes, and §11.2's second clause — **AC-368**. An
 * action the operator may not take is never hidden: it is disabled in place,
 * gated at render, **with its reason**, and `RowAction.reason` is that field.
 *
 * The reason is a rendered element, never only a `title` (§5.7, §8.4.4, D17
 * clause 3): a hover-only explanation is unreachable by keyboard and by touch.
 * **R2-3** moved it out of the action lane — `DataTable` renders it in the row
 * and passes its `reasonId` here, so a refused row no longer sets the pitch of
 * every row beside it.
 *
 * The description never becomes the name: an item carrying a reason declares
 * `aria-label` with the bare label, so a caller finding an action by its label
 * keeps finding it.
 */

import { useId, type MutableRefObject } from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export interface RowAction<T> {
  label: string
  onSelect: (row: T) => void
  /** §11.2 — gate at RENDER, not at commit. Disabled in place, never hidden. */
  disabled?: (row: T) => boolean
  /**
   * §11.2's second clause — **why** this row cannot take this action.
   *
   * Read only when `disabled` returns `true`, and returning `null` is allowed:
   * some refusals are self-evident from the row itself and a restatement beside
   * the control would be noise. Everything else owes the operator a sentence,
   * because a dead control with no explanation is indistinguishable from a
   * broken one.
   *
   * Return a **translated sentence**, not a key — the caller holds `t` and the
   * row, and only the caller knows which of several refusals applied. Do not
   * return the label, and do not return a pixel figure, a field name or an
   * error code: this is read by the operator, not by the person who wrote it.
   */
  reason?: (row: T) => string | null
  /**
   * **The row-click target, declared — P0-2 (`17-reconciled-findings.md` §1).**
   *
   * `true` means: *a plain click anywhere on the row that is not on a control
   * performs this action.* Exactly one action per table may declare it;
   * `DataTable` takes the first and ignores any later one.
   *
   * ## Why this is a declared field and not a guess
   *
   * `DataTable` used to pick the row-click target by regex-matching the
   * **translated display label** —
   * `/view|open|detail|inspect|claim|show|عرض|تفاصيل|فتح/i` — and to fall
   * through to `declaredActions[0]` when nothing matched. Both halves are
   * defects, and the second is the dangerous one: a screen whose only action is
   * destructive got that action wired to a plain row click. `EmailLogCard`
   * declares one action, `Resend`, with no confirm, so **clicking an email-log
   * row re-sent a message to a customer.** API-key rotation and webhook replay
   * had the same shape. A label is content — it is translated, it is rewritten
   * by copy edits, and `Claim` matched the pattern while meaning *mutate this
   * record*. Nothing about a string can carry intent.
   *
   * ## The rule for declaring it
   *
   * Set it **only on an action that opens the record** — navigates to a detail
   * route, opens the record's drawer or 360° layer, or opens the ledger for the
   * row. Never on an action that mutates, sends, rotates, replays, claims,
   * resolves, applies or deletes, even behind a confirm: a confirm dialog that
   * the operator did not ask for is still a defect, and a stray click on a
   * table row must never be able to reach one.
   *
   * **Omitting it is a valid and safe answer.** A table whose actions are all
   * mutations gets no row click at all — no `cursor-pointer`, no `onClick` —
   * and its identity cell remains the way into the record.
   *
   * Honoured only when the action is enabled for that row: `disabled` is
   * evaluated first, and a refused action is not silently run by a row click.
   * A ledger declares no row actions at all (§8.3.3), so this never applies
   * there.
   */
  rowClick?: boolean
}

/** The reason a caller supplies, resolved once, for a single row. */
export function refusalFor<T>(action: RowAction<T>, row: T): string | null {
  if (!(action.disabled?.(row) ?? false)) return null
  return action.reason?.(row) ?? null
}

/**
 * **R2-3** — every distinct reason this row is refused, in declaration order.
 * Deduplicated, because two actions refused by one cause (Deductions' `Apply`
 * and `Waive`) are one fact and the row states it once.
 */
export function rowRefusals<T>(actions: ReadonlyArray<RowAction<T>>, row: T): string[] {
  const reasons: string[] = []
  for (const action of actions) {
    const reason = refusalFor(action, row)
    if (reason !== null && !reasons.includes(reason)) reasons.push(reason)
  }
  return reasons
}

/**
 * A refusal, **rendered**. D17 clause 3, §8.4.4 and §5.7 forbid a `title=`
 * being the only carrier: it is invisible until hover and unreachable by
 * keyboard and by touch. Clamped at two lines (R20) — the clamp bounds the
 * paint, not the text, so `aria-describedby` still resolves the whole sentence.
 * Exported because the hand-rolled `title=` shape had spread to other screens.
 */
export function RefusalLine({ id, children }: { id: string; children: string }) {
  return (
    <span
      id={id}
      /* No display utility beside the clamp: the clamp IS one — it sets a
         `-webkit-box` — and a block declaration next to it is a second rule in
         the same property whose winner is stylesheet order rather than class
         order. That is what made the first attempt at this measure identically
         to the defect. */
      className="line-clamp-2 text-xs font-normal whitespace-normal text-muted-foreground"
    >
      {children}
    </span>
  )
}

/**
 * §7.8 / **D8** — the one-action shape. A labelled control, visible at rest
 * (**AC-68**), disabled in place when the role may not use it (§11.2).
 *
 * The button fills its lane and clips an over-long label rather than growing
 * past the lane's declared width (§7.3).
 */
export function SingleRowAction<T>({
  action,
  row,
  reasonId,
}: {
  action: RowAction<T>
  row: T
  /**
   * **R2-3** — the id of the reason already rendered IN THE ROW, which the
   * control describes itself with instead of growing a second line of its own.
   * Absent (the narrow card, where there is no row and no pitch to keep), the
   * reason renders under the button as before.
   */
  reasonId?: string
}) {
  const disabled = action.disabled?.(row) ?? false
  const reason = refusalFor(action, row)
  const localId = useId()
  const describedBy = reasonId ?? localId

  return (
    <span className="flex flex-col items-stretch gap-1">
      <Button
        variant="secondary"
        size="xs"
        className="w-full justify-center truncate"
        /* T6.2 — how `.` finds the row's actions when there is no menu. */
        data-row-actions="direct"
        disabled={disabled}
        aria-describedby={reason === null ? undefined : describedBy}
        /* R2-3 — reinforcement beside the control now the sentence lives in
           another cell. §5.7 forbids a tooltip being the ONLY carrier; the
           rendered text and the description are still the carriers. */
        title={reason ?? undefined}
        onClick={() => action.onSelect(row)}
      >
        {action.label}
      </Button>
      {reason !== null && reasonId === undefined && (
        <RefusalLine id={localId}>{reason}</RefusalLine>
      )}
    </span>
  )
}

/**
 * The kebab's item. §8.4.4's construction exactly: disabled in place, with the
 * reason on a second line **inside** the item.
 */
export function RowActionMenuItem<T>({
  action,
  row,
  deferTo,
}: {
  action: RowAction<T>
  row: T
  /**
   * F-V2-83 — hand the action to the caller instead of running it inline.
   * `onSelect` fires while this menu's own close is still tearing down, and a
   * dialog opened here raced that teardown and lost about 1 run in 3.
   * `onCloseAutoFocus` is the point proven safe; `deferTo` is what its
   * `DropdownMenuContent` drains once that fires.
   */
  deferTo?: MutableRefObject<(() => void) | null>
}) {
  const disabled = action.disabled?.(row) ?? false
  const reason = refusalFor(action, row)
  const reasonId = useId()

  return (
    <DropdownMenuItem
      onSelect={() => {
        if (deferTo) deferTo.current = () => action.onSelect(row)
        else action.onSelect(row)
      }}
      disabled={disabled}
      /* The name is the label and the description is the reason — see the
         header. Neither attribute is set when there is no reason, so an
         ordinary item keeps computing its name from its contents. */
      aria-label={reason === null ? undefined : action.label}
      aria-describedby={reason === null ? undefined : reasonId}
      className={cn(reason !== null && 'flex-col items-start gap-0.5 whitespace-normal')}
    >
      {action.label}
      {reason !== null && <RefusalLine id={reasonId}>{reason}</RefusalLine>}
    </DropdownMenuItem>
  )
}
