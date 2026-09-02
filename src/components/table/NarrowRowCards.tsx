/**
 * **The compact render mode — a stacked card per row, below `--ev-bp-compact`.**
 *
 * `index.html` used to declare `width=1280`, so a phone was handed a 1280px
 * layout viewport scaled to about 0.305x: nine columns fitted perfectly and
 * nothing overflowed, because the whole table had been shrunk to 4pt type. The
 * viewport tag is now `width=device-width`, and a 390px viewport reaches
 * `DataTable` for the first time. This file is what it reaches.
 *
 * ## Why a card and not "the primary column plus one more"
 *
 * Two columns of a nine-column table is not a smaller table, it is a worse
 * list. It keeps every cost of the grid — a header strip, vertical column
 * rules, horizontal alignment across rows, a sort control that names columns
 * you cannot see — and drops the only thing the grid buys, which is comparison
 * ACROSS columns. And the choice of which single column survives has no honest
 * answer at forty screens: Payouts wants the amount, Safety wants the severity,
 * People wants the status, and a table engineer picking one per screen is forty
 * decisions that will disagree with each other within a month.
 *
 * A card makes it ONE decision, and it makes it from declarations that already
 * exist rather than from a new per-screen prop:
 *
 * | tier | compact treatment |
 * |---|---|
 * | `primary` | the card's heading, with its `secondaryLine` beneath it |
 * | `data` | the label/value pairs in the card's body |
 * | `meta` | **dropped** — ids, cities, provenance, timestamps |
 *
 * `emphasisOf` is what reads the tier, and it anchors its fallback to the
 * DECLARED column array, never the visible one. So hiding or reordering a
 * column cannot move which value becomes the card's heading, for the same
 * reason it cannot move the row's ink on the desktop table. **Nothing is keyed
 * off a column index or a label string here**, which is the rule that P0-2's
 * row-click regex and the old `columnIndex === 0` emphasis both broke.
 *
 * Dropping `meta` is the load-bearing half. Nine columns do not fit; three or
 * four do, and the tier already records which three or four an operator came
 * to read. A screen that finds its card missing something has mis-declared a
 * column, and the fix is the declaration — which then improves the desktop
 * table's scan path too.
 *
 * ## What is deliberately UNAVAILABLE below the breakpoint
 *
 * Absent, never disabled — `globals.css` §2.3: *"Disabled does not exist."*
 * A greyed control that can never be un-greyed at this width is a promise the
 * layout cannot keep.
 *
 *   **Bulk selection.** Owner ruling. The bulk bar is a multi-state refusal
 *     interaction — *refuse the whole set and name the count*, *Select only the
 *     N eligible*, the bar's own exit — and a card list can carry a checkbox
 *     but not that grammar without becoming a second design. A mistaken bulk
 *     action is high-cost and feels irreversible, and a phone is the worst
 *     place to take one. The narrow operator's task is triage: read a queue,
 *     open one entity, act on it. `DataTable` turns `selectable` off, so the
 *     lane, the header checkbox, the row checkbox and the floating bar are all
 *     out of the DOM together rather than four separate suppressions.
 *   **Column resize and column reorder.** Both are direct manipulation of a
 *     grid that is not on screen. There is no width model to manipulate: this
 *     mode has no `table-layout: fixed` contract because it has no table.
 *   **The pinned action lane.** There is no lane. A row's declared actions are
 *     not lost — they render inside the card, at its inline-end — but they stop
 *     being a sticky column, because a 390px viewport has no residual to pin
 *     against.
 *
 * **Sort, filter, search, column visibility and pagination all survive**, and
 * needed nothing: they are band 2 and band 5, they live outside the grid, and
 * they never depended on a header cell being visible.
 *
 * ## Row activation
 *
 * The card takes the SAME `rowItemProps` the desktop `<tr>` takes — one tab
 * stop for the whole list, arrows to move, `Home`/`End`, `Enter`/`Space` to
 * activate — and the same click handler. There is no second contract, so a
 * screen that is safe to click on a desktop is safe to tap here, and the P0-2
 * ruling (**no destructive action reachable by a row click**) holds at both
 * widths by construction rather than by a second review.
 */

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { emphasisOf, isolatesValue, type DataColumn } from './columns'

export interface NarrowRowCardsProps<T> {
  rows: readonly T[]
  /**
   * The VISIBLE column set, in the order the table would render it — so hiding
   * a column in the popover hides it here too, and the two modes never disagree
   * about what is on screen.
   */
  visible: ReadonlyArray<DataColumn<T>>
  /**
   * The DECLARED set, in declaration order. `emphasisOf` anchors its fallback
   * to this and never to `visible`; passing the visible array here would
   * reintroduce exactly the positional bug the tier exists to remove.
   */
  declared: ReadonlyArray<DataColumn<T>>
  getRowId: (row: T) => string
  isRowCritical?: (row: T) => boolean
  rowClassName?: (row: T) => string | undefined
  /** The affordance and the behaviour come from one test, as on the desktop row. */
  hasRowClickAction: boolean
  onRowClick: (row: T, event: React.MouseEvent<HTMLElement>) => void
  /** `DataTable`'s roving-focus item props — the same ones the `<tr>` takes. */
  rowItemProps: (index: number, row: T) => Record<string, unknown>
  /** The row's declared actions, rendered by `DataTable` so there is one copy. */
  renderRowActions?: (row: T, id: string) => ReactNode
  /** A2 — the same `<bdi>` wrapper the desktop cell uses. */
  cellValue: (isolated: boolean, children: ReactNode) => ReactNode
  /** §9.2 / AC-49 — a ledger's opening and closing balance rows. */
  boundary?: { opening: ReactNode; closing: ReactNode } | null
}

export function NarrowRowCards<T>({
  rows,
  visible,
  declared,
  getRowId,
  isRowCritical,
  rowClassName,
  hasRowClickAction,
  onRowClick,
  rowItemProps,
  renderRowActions,
  cellValue,
  boundary,
}: NarrowRowCardsProps<T>) {
  /* Read once per render, not per row: the tier is a property of the COLUMN,
     so computing it inside the row loop would do the same work n times and
     invite someone to reach for the row while they were in there. */
  const heading = visible.find((column) => emphasisOf(column, declared) === 'primary')
  const declaredData = visible.filter((column) => emphasisOf(column, declared) === 'data')

  /**
   * **`meta` is a DEMOTION, and only where a screen has said what it is
   * demoting from.** Measured across the 29 files that declare columns: **ten
   * of them declare no `emphasis` at all** — `PeopleTable`, `QueuePage`,
   * `LedgerCard`, both Admin Workspace logs and five more. On those,
   * `emphasisOf` falls back to *"the first declared column is primary,
   * everything else is meta"*, which is a sensible default for INK and a
   * catastrophic one for a card: taken literally it renders a heading and
   * nothing under it, on ten screens.
   *
   * The fallback is not a statement that those columns are worthless; it is the
   * absence of a statement. So where a screen has made none, the card shows
   * every visible column, and where it has made one, the card obeys it exactly.
   * A screen gets a shorter, sharper card by DECLARING the tier — which also
   * sharpens its desktop scan path, since the same declaration drives the ink.
   */
  const body =
    declaredData.length > 0 ? declaredData : visible.filter((column) => column !== heading)

  return (
    /* The bounded scroller, exactly as band 4's table container is — so band 2
       and band 5 stay on screen and the pagination row is reachable without a
       page scroll, which is D-19's whole point and is not a desktop-only one.
       No horizontal axis: there is nothing to scroll sideways to. */
    <div className="min-h-54 flex-1 overflow-y-auto">
      <ul role="list" className="m-0 flex list-none flex-col p-0">
        {boundary && (
          <li className="border-b border-border px-3 py-2 text-sm font-semibold text-foreground">
            {boundary.opening}
          </li>
        )}

        {rows.map((row, index) => {
          const id = getRowId(row)
          const critical = isRowCritical?.(row) ?? false
          return (
            <li key={id}>
              <div
                {...rowItemProps(index, row)}
                onClick={hasRowClickAction ? (event) => onRowClick(row, event) : undefined}
                data-row-critical={critical ? '' : undefined}
                className={cn(
                  /* `min-h-row` and not `h-row`: the compact override already
                     raises the row token to a finger-sized value, and a card
                     with three label/value pairs is taller than any of them.
                     A height would clip it; a floor cannot. */
                  'group/row relative flex min-h-row flex-col gap-2 border-b border-border px-3 py-3 transition-colors',
                  /* The same inset ring the desktop row takes, for the same
                     reason: the global focus rule offsets by 2px, which on a
                     list item would draw over its neighbour. */
                  'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                  hasRowClickAction && 'cursor-pointer hover:bg-muted/60',
                  /* P1-4 — the critical ground and its derived ink, both on
                     token. The card reuses the row's pair rather than minting a
                     third: the ground clears 3:1 against white and the derived
                     ink clears AA on it, and neither fact is width-dependent. */
                  critical && 'bg-row-critical hover:bg-row-critical-emphasis',
                  rowClassName?.(row),
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="min-w-0 flex-1">
                    {heading && (
                      <span
                        className={cn(
                          'block text-sm font-medium text-foreground',
                          heading.align === 'end' && 'text-end',
                        )}
                      >
                        {cellValue(isolatesValue(heading), heading.cell(row))}
                      </span>
                    )}
                    {heading?.secondaryLine && (
                      <span
                        className={cn(
                          'block text-xs text-muted-foreground',
                          critical && 'text-row-critical-foreground',
                        )}
                      >
                        {heading.secondaryLine(row)}
                      </span>
                    )}
                  </span>

                  {renderRowActions && (
                    /* At the card's inline-end, not pinned, and carrying the
                       tap floor: an icon-only trigger is exactly the case that
                       floor exists for, because it has no height token of its
                       own for the compact query to raise. The utility is not
                       spelled in this comment — Tailwind v4 scans comments as
                       plain text and mints what it finds. */
                    <span className="flex min-h-tap shrink-0 items-center gap-1">
                      {renderRowActions(row, id)}
                    </span>
                  )}
                </div>

                {body.length > 0 && (
                  /* A description list, because that is what a label/value pair
                     is. Two columns: one is a wasteful column of short values on
                     a 390px viewport, three does not fit a money figure. */
                  <dl className="m-0 grid grid-cols-2 gap-x-3 gap-y-1.5">
                    {body.map((column) => (
                      <div key={column.id} className="min-w-0">
                        <dt
                          className={cn(
                            'text-2xs text-muted-foreground',
                            critical && 'text-row-critical-foreground',
                          )}
                        >
                          {column.header}
                        </dt>
                        <dd className="m-0 text-sm text-foreground">
                          {cellValue(isolatesValue(column), column.cell(row))}
                          {column.secondaryLine && (
                            <span
                              className={cn(
                                'block text-xs text-muted-foreground',
                                critical && 'text-row-critical-foreground',
                              )}
                            >
                              {column.secondaryLine(row)}
                            </span>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            </li>
          )
        })}

        {boundary && (
          <li className="px-3 py-2 text-sm font-semibold text-foreground">{boundary.closing}</li>
        )}
      </ul>
    </div>
  )
}
