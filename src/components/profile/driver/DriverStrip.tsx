/**
 * The captain page's summary strip — **the same four blocks the sheet's rail
 * stacks, laid across instead.**
 *
 * ```
 *  at and above --ev-bp-wide
 *  ┌──────────────┬──────────────┬───────────────┬────────────────────┐
 *  │ Standing     │ Documents    │ Earnings      │ Subscription slots │
 *  │ Under review │ Expiring     │ 652.60 SAR    │ 1                  │
 *  │ 1 open       │ Registration │ payable to    │ 1 slot open        │
 *  │ complaint    │ expires      │ this captain  │ ▮▮▮▮▭              │
 *  │              │ 19 Jul 2026  │ Cash debt …   │ 4 of 5 slots taken │
 *  └──────────────┴──────────────┴───────────────┴────────────────────┘
 *
 *  below it — 2 × 2, never one column (D-CP-2)
 *  ┌────────────────────┬────────────────────┐
 *  │ Standing           │ Documents          │
 *  │ Under review       │ Expiring           │
 *  │ 1 open complaint   │ Registration       │
 *  │                    │ 19 Jul 2026        │
 *  ├────────────────────┼────────────────────┤
 *  │ Earnings           │ Subscription slots │
 *  │ 652.60  SAR        │ 1                  │
 *  │ payable            │ 1 slot open        │
 *  │ Cash debt 23.15    │ ▮▮▮▮▭              │
 *  └────────────────────┴────────────────────┘
 * ```
 *
 * `bg-muted`, divided by rules rather than by card edges — the subdued fill does
 * work a border cannot: it says *this is a readout of what is below, not another
 * card of content*. That is D-RP-2, the seventh job the rider wave's spec added
 * to the one subdued fill, and it applies here for the same reason.
 *
 * ## D-CP-2 — this never becomes a single column, at any width
 *
 * Four across at and above `--ev-bp-wide`; **2 × 2 below it**, where it used to
 * restack to one column. That is the captain spec's largest non-colour
 * differentiator and the invariant is one sentence: *no captain surface ever
 * renders the four summary blocks in a single column* (AC-CP-06). The rider's
 * strip still restacks to one, so the two summaries have different silhouettes
 * before a word is read.
 *
 * **AC-34 is not breached, and the distinction matters.** AC-34 governs
 * `DetailPage`'s RAIL — the side cards, which restack beneath main in array
 * order with nothing dropped. The strip is a projection of the record above the
 * two columns, not a rail card, and nothing here is dropped or collapsed:
 * reading order stays row-major and therefore stays Standing → Documents →
 * Earnings → Slots in both directions, because a CSS grid's row-major order
 * follows the document (AC-CP-07).
 *
 * **The dividers are logical, and there are now two axes of them** (AC-CP-08):
 * `border-inline-start` on the second column, `border-block-start` on the
 * second row. At `wide:` the block rule is dropped and every cell after the
 * first takes the inline rule. A `border-l` or a `border-t` on a cell is a
 * defect on arrival (§9.1, §10.3).
 *
 * **Cells are top-aligned and a short cell leaves quiet ground beneath it.**
 * Accepted rather than overlooked: the alternative was to pair the blocks by
 * height, which puts Slots second and breaks `DriverBlocks`' priority order for
 * a cosmetic reason. Order beats evenness.
 */

import { cn } from '@/lib/utils'
import {
  CapacityBlock,
  DocumentsBlock,
  EarningsBlock,
  StandingBlock,
  type DriverBlockProps,
} from './DriverBlocks'

export function DriverStrip(props: DriverBlockProps) {
  return (
    <div
      data-numeric
      className={cn(
        /* **Two, not one — D-CP-2.** `grid-cols-1` was the whole of the
           single-column restack this replaces; there is no other change needed
           to satisfy AC-CP-06, because row-major order is already the grid's. */
        'grid grid-cols-2 rounded-xl bg-muted',
        'wide:grid-cols-4',
        /* The colour once, on every cell; the WIDTHS are what the two rules
           below turn on, so a cell with no rule draws nothing. */
        '[&>*]:border-border',
        /* 2 × 2 — an inline-start rule down the second column (cells 2 and 4),
           a block-start rule across the second row (cells 3 and 4). Both
           logical, so both follow the document and neither needs a mirrored
           counterpart (§9.1, AC-CP-08). */
        '[&>*:nth-child(2n)]:border-s',
        '[&>*:nth-child(n+3)]:border-t',
        /* 4 across — one inline-start rule between every pair, and the second
           row no longer exists, so its block rule is dropped rather than
           overdrawn. */
        'wide:[&>*+*]:border-s',
        'wide:[&>*:nth-child(n+3)]:border-t-0',
      )}
    >
      <StandingBlock {...props} />
      <DocumentsBlock {...props} />
      <EarningsBlock {...props} />
      <CapacityBlock {...props} />
    </div>
  )
}
