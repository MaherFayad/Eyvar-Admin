/**
 * **Make the declared column budget fit the container it is actually in.**
 *
 * ## The defect
 *
 * §7.3's width contract says every column declares a `width`, one declares
 * `minWidth` and absorbs the residual, and the sum stays inside the content
 * region — `TABLE_INNER_WIDTH_1280` = 910px (en) / 870px (ar). That contract is
 * excellent and it was enforced by a test covering **four** of the product's
 * tables, all of them under `operations/people`. Every other table declared its
 * widths and nothing checked them.
 *
 * Measured in the running app at 1440px, where the content region is 1038px:
 *
 * ```
 *   /support/tickets          table 1178px   container 1038px   +140 CUT OFF
 *   /admin/communications     table 1098px   container 1022px    +76
 *   /support/disputes         table 1112px   container 1038px    +74
 *   /financials/payouts       table 1064px   container 1038px    +26
 * ```
 *
 * That is why the Disputes header reads `Verdic` — the last column is simply
 * outside the box. And at the same time **59 of 294 cell elements in Disputes
 * were truncated mid-word**, so the table was over budget and clipping its
 * content at the widest desktop size the product supports.
 *
 * The per-screen fix is to re-derive four sets of declared widths. The
 * structural fix is this: **the declared width is a preference and the
 * container is the constraint**, resolved at render, for every table at once.
 * Both are worth having; this is the one that cannot be forgotten by the next
 * table someone adds.
 *
 * ## The rule
 *
 * When the declared total exceeds the container, take the overflow out of the
 * columns that can afford it, in proportion to how much slack each has.
 *
 * **Three kinds of column never shrink, and each for a stated reason:**
 *
 *   1. **The lanes** — the checkbox and the action lane. Neither holds prose;
 *      both are sized to a control, and a control that shrinks stops being
 *      clickable. `LANE_WIDTH_PX` and the action lane are geometry, not budget.
 *
 *   2. **`money` and `id`** — §7.3 rule 5 names these two as *"the two values a
 *      reader cannot tell are truncated"*. `1,240.00` clipped to `1,240.0` is
 *      not visibly clipped and is a different number; `DSP-106` clipped to
 *      `DSP-10` is a different record. Every other type either wraps, or
 *      truncates with an ellipsis a reader can see.
 *
 *   3. **A column the operator resized.** A drag is an explicit decision about
 *      that column and this function does not overrule it. The consequence is
 *      honest and bounded: drag three columns wide enough and the table
 *      overflows and scrolls, exactly as it does today.
 *
 * If the shrinkable slack is not enough, every candidate goes to its floor and
 * the table still scrolls. **That is deliberately not hidden** — a table with
 * eleven columns in a 400px container has no good answer, and inventing one by
 * crushing columns to 20px would be worse than the scrollbar.
 *
 * ## Why not `table-layout: auto`
 *
 * Because the pinned identity column's sticky offsets are arithmetic over the
 * declared widths (`pinning.ts`), and `auto` makes the rendered width a
 * function of content the layout has not measured yet. `DataTable`'s own header
 * says it: under `table-fixed` *"the width model IS the declared column
 * widths"*. This keeps that model and changes the numbers inside it, which is
 * why the same resolved map must feed BOTH the cells and the pin descriptors —
 * see `DataTable`, where it does.
 */

import type { ColumnDataType } from './columns'

/**
 * The narrowest a shrinkable column may become. Below roughly this, a header
 * label plus its sort affordance no longer fit and the column stops being
 * readable rather than merely narrow — at which point hiding the column is the
 * honest answer and that is the operator's call, through the column picker.
 */
export const MIN_SHRINK_WIDTH_PX = 76

/** §7.3 rule 5 — the two types a reader cannot tell have been truncated. */
const UNSHRINKABLE_TYPES: ReadonlySet<ColumnDataType> = new Set<ColumnDataType>(['money', 'id'])

export interface FitColumn {
  readonly id: string
  /** The width in play: the operator's override if there is one, else declared. */
  readonly width: number
  readonly type?: ColumnDataType
  /** The checkbox lane and the action lane. Sized to a control, never budget. */
  readonly isLane?: boolean
  /** True when `width` came from a resize drag rather than from the declaration. */
  readonly userResized?: boolean
  /**
   * A declared floor for this specific column, if it has one — the flexible
   * identity column's `minWidth`. Beats `MIN_SHRINK_WIDTH_PX` when larger,
   * because §7.3 chose it deliberately for that column's content.
   */
  readonly floor?: number
}

/**
 * Resolved widths by column id, or `null` when nothing needs to change.
 *
 * `null` rather than an identity map on purpose: it lets `DataTable` keep the
 * exact object identity of its declared widths in the common case, so a table
 * that already fits does no extra work and re-renders nothing.
 */
export function fitColumnWidths(
  columns: readonly FitColumn[],
  containerWidth: number,
): ReadonlyMap<string, number> | null {
  /* Before first paint the container measures 0 and there is nothing to fit
     to. Returning `null` renders the declared widths, which is the correct
     first frame and is what the measurement then corrects if it must. */
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) return null

  const total = columns.reduce((sum, column) => sum + column.width, 0)
  const overflow = total - containerWidth
  /* 1px of slop: a fractional container width against integer columns must not
     put every table in the product through a shrink that changes nothing. */
  if (overflow <= 1) return null

  const floorOf = (column: FitColumn) => Math.max(column.floor ?? 0, MIN_SHRINK_WIDTH_PX)

  const candidates = columns.filter(
    (column) =>
      column.isLane !== true &&
      column.userResized !== true &&
      !(column.type !== undefined && UNSHRINKABLE_TYPES.has(column.type)) &&
      column.width > floorOf(column),
  )

  const slack = candidates.reduce((sum, column) => sum + (column.width - floorOf(column)), 0)
  if (slack <= 0) return null

  /* Proportional to SLACK, not to width. A 300px column with 224px of room to
     give should absorb more of the overflow than a 300px column pinned at a
     290px floor — sharing by width would take the same from both and drive the
     second through its floor. */
  const take = Math.min(overflow, slack)
  const resolved = new Map<string, number>()
  let assigned = 0

  candidates.forEach((column, index) => {
    const columnSlack = column.width - floorOf(column)
    /* The last candidate takes the remainder rather than its own rounded share,
       so the assigned total is exactly `take` and the table lands on the
       container instead of one or two pixels beside it. */
    const share =
      index === candidates.length - 1
        ? take - assigned
        : Math.round((columnSlack / slack) * take)
    const clamped = Math.min(Math.max(share, 0), columnSlack)
    assigned += clamped
    if (clamped > 0) resolved.set(column.id, column.width - clamped)
  })

  return resolved.size > 0 ? resolved : null
}
