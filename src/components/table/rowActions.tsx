/**
 * The row action, its two shapes, and the half of §11.2 that had nowhere to
 * live — **AC-368**.
 *
 * §11.2 is one sentence with two clauses: an action the operator may not take
 * is *"never hidden, disabled in place **with its reason**"*. `DataTable` has
 * always kept the first clause — `RowAction.disabled` is a predicate evaluated
 * at RENDER, so the refusal is on screen before anyone clicks. The second
 * clause had no field to carry it, so `SingleRowAction` and the kebab item both
 * rendered a dead control that explained nothing, and three written, translated
 * refusal sentences sat unreachable in the Financials dictionary.
 *
 * `reason` is that field.
 *
 * ## Why the reason is a rendered line and not an attribute
 *
 * The obvious fix is `title`, and it is the wrong one twice over. `DESIGN.md`
 * §5.7 confines a tooltip to **naming** an icon-only control and forbids it from
 * carrying a constraint; §8.4.4 says the same thing about the blocked pin in
 * as many words — *"the reason MUST NOT be a tooltip"*, and specifies instead
 * that it renders *"on a second line inside the menu item"*. A hover-only
 * explanation is also unreachable by keyboard and unreachable on touch, which
 * is the accessibility ruling this project has already made elsewhere.
 *
 * So the reason is a real element with real text, and the control points
 * `aria-describedby` at it. Sighted operators read it; assistive technology
 * reads it as the control's description; nobody has to hover to find out why
 * the button is dead.
 *
 * ## The accessible name stays the label
 *
 * A description rendered *inside* a menu item would otherwise be folded into
 * that item's accessible name — `Pay Add a bank account before paying this
 * captain` — and every caller that finds an action by its label would stop
 * finding it. So an item carrying a reason declares `aria-label` with the bare
 * label, which wins over its contents, and hangs the sentence off
 * `aria-describedby`. Name and description stay separate, which is what the two
 * attributes are for.
 *
 * Rules applied
 *   §11.2 / AC-368
 *              gated at render, disabled in place, **and the reason with it**.
 *   §8.4.4     the reason renders on a second line inside the item. Never a
 *              tooltip, and never discovered by clicking.
 *   §5.7       a tooltip names; it does not explain a constraint.
 *   §7.2       the disabled control keeps whatever focus-ring declaration its
 *              primitive ships with; nothing here removes an outline, and no
 *              utility name is written into this comment.
 *   §7.3       the labelled shape keeps the lane's declared width — the button
 *              still truncates its label rather than widening the column. The
 *              reason line beneath it is the one thing in the lane allowed to
 *              wrap, because a truncated explanation explains nothing.
 */

import { useId } from 'react'
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
}

/** The reason a caller supplies, resolved once, for a single row. */
export function refusalFor<T>(action: RowAction<T>, row: T): string | null {
  if (!(action.disabled?.(row) ?? false)) return null
  return action.reason?.(row) ?? null
}

/**
 * The second line itself. Muted, small, and the only thing in the action lane
 * permitted to wrap (§7.3 rule 5 is about values, and this is a sentence).
 */
function RefusalLine({ id, children }: { id: string; children: string }) {
  return (
    <span id={id} className="block text-2xs font-normal whitespace-normal text-muted-foreground">
      {children}
    </span>
  )
}

/**
 * §7.8 / **D8** — the one-action shape. A labelled control, visible at rest
 * (**AC-68**), disabled in place when the role may not use it (§11.2), and now
 * with the reason under it when there is one.
 *
 * The button fills its lane and clips an over-long label rather than growing
 * past the lane's declared width (§7.3) — otherwise the label pushes the column
 * wider and takes the table over budget in the one language nobody previewed.
 * The utilities are on the element below; they are deliberately not named in
 * prose here, because a hyphenated utility written in a comment is a valid
 * candidate and has shipped a real CSS rule out of a doc comment in this repo
 * more than once.
 */
export function SingleRowAction<T>({ action, row }: { action: RowAction<T>; row: T }) {
  const disabled = action.disabled?.(row) ?? false
  const reason = refusalFor(action, row)
  const reasonId = useId()

  return (
    <span className="flex flex-col items-stretch gap-1">
      <Button
        variant="secondary"
        size="xs"
        className="w-full justify-center truncate"
        disabled={disabled}
        aria-describedby={reason === null ? undefined : reasonId}
        onClick={() => action.onSelect(row)}
      >
        {action.label}
      </Button>
      {reason !== null && <RefusalLine id={reasonId}>{reason}</RefusalLine>}
    </span>
  )
}

/**
 * The kebab's item. §8.4.4's construction exactly: disabled in place, with the
 * reason on a second line **inside** the item.
 */
export function RowActionMenuItem<T>({ action, row }: { action: RowAction<T>; row: T }) {
  const disabled = action.disabled?.(row) ?? false
  const reason = refusalFor(action, row)
  const reasonId = useId()

  return (
    <DropdownMenuItem
      onSelect={() => action.onSelect(row)}
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
