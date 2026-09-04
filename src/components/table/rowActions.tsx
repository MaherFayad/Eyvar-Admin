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
 * The second line itself. Muted, small, and the only thing in the action lane
 * permitted to wrap (§7.3 rule 5 is about values, and this is a sentence).
 *
 * **BOUNDED, and the bound is R20.** Unbounded, this line was the largest row-
 * pitch defect in the product. Measured at 1280x800 on `/admin/communications`:
 * the lane is 88px, which is 64px of inside after the cell's inline padding, so
 * *"This message did not fail, so there is nothing to send again"* wrapped to
 * **96px of text** and the rows ran **141px** — with 205, 105 and 73 among
 * them, because a row's height then depended on whether that row happened to
 * be refused. §3.1's Rules block says row height *"MUST be uniform within a
 * table"*, and R20 makes the height the TABLE's; a sentence in a fixed-width
 * lane cannot satisfy either.
 *
 * The clamp bounds the paint and **not the text**: the full sentence is still
 * the node's only child, so the `aria-describedby` on the refused control still
 * resolves to the whole thing, and a screen reader still reads it whole. What a
 * sighted operator loses is the tail of a sentence that, on the screen where
 * this was measured, was **identical on all twenty-two rows** — the bulk bar
 * one file over already treats a reason repeated across a selection as one
 * fact, not N.
 *
 * **This is a bound, not the fix.** At 64px of wrap width two lines is a few
 * words, so the honest reading is that a sentence does not belong in a lane
 * this narrow at all. The two real fixes are a caller declaring a
 * `rowActionsWidth` wide enough to hold one, or the sentence moving off the row
 * the way the bulk bar moved it off the pill — both design decisions with an
 * owner, recorded here rather than taken in passing.
 */
/**
 * A refusal, **rendered**. D17 clause 3, §8.4.4 and §5.7 all forbid putting one in a
 * `title=` tooltip: it is invisible until hover, unreachable by keyboard and by touch,
 * and unreadable by a screen reader as anything but a label. Exported because the
 * hand-rolled `title={canWrite ? undefined : t('…noPermission')}` shape had spread to
 * screens outside this file.
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
      className="line-clamp-2 text-2xs font-normal whitespace-normal text-muted-foreground"
    >
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
export function SingleRowAction<T>({
  action,
  row,
  reserveRefusal = false,
}: {
  action: RowAction<T>
  row: T
  /**
   * **Hold the refusal line's space open even on a row that has no refusal.**
   *
   * The defect: a refusal renders as a block under the button, so a row WITH
   * one is taller than a row without. Measured at 1440, in one table:
   * `/support/disputes` shipped 54px and 77px rows, `/financials/payouts` the
   * same, and `/admin/communications` shipped **three** heights — 73, 77 and
   * 105. A table whose row pitch changes down the page cannot be scanned, and
   * scanning is the only thing an index screen is for.
   *
   * **The obvious fix is forbidden and rightly so.** D17 clause 3, §8.4.4 and
   * §5.7 all refuse to put a refusal in a hover tooltip: invisible until hover,
   * unreachable by keyboard and by touch, and announced as a label rather than
   * as a description. The reason must stay on the row.
   *
   * So the pitch is levelled UP instead of the reason being hidden. `DataTable`
   * asks whether any row on the CURRENT PAGE carries a refusal; if one does,
   * every row in that page reserves the same two lines and the pitch is
   * uniform again. A page with nothing refused reserves nothing and is exactly
   * as dense as it is today — which is most pages, and is why this is a
   * per-page question rather than a per-table one.
   */
  reserveRefusal?: boolean
}) {
  const disabled = action.disabled?.(row) ?? false
  const reason = refusalFor(action, row)
  const reasonId = useId()

  return (
    <span className="flex flex-col items-stretch gap-1">
      <Button
        variant="secondary"
        size="xs"
        className="w-full justify-center truncate"
        /* T6.2 — how `.` finds the row's actions when there is no menu. */
        data-row-actions="direct"
        disabled={disabled}
        aria-describedby={reason === null ? undefined : reasonId}
        onClick={() => action.onSelect(row)}
      >
        {action.label}
      </Button>
      {reason !== null ? (
        <RefusalLine id={reasonId}>{reason}</RefusalLine>
      ) : reserveRefusal ? (
        /* Exactly the box `RefusalLine` occupies and nothing in it: `h-8` is
           two lines of `--text-2xs` at its 16px line box, which is what
           `line-clamp-2` bounds the real one to. `aria-hidden` because there is
           no refusal to announce — a screen reader hears the button and stops,
           the same as it does today on a row with nothing refused. */
        <span aria-hidden="true" className="h-8" />
      ) : null}
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
