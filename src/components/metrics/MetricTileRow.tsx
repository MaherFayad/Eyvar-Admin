/**
 * The metric-tile grid — `design/03-navattic-language.md` §4.9, and the one
 * sanctioned use of the `wide:` variant outside the shell (`globals.css`:
 * *"its three uses are fixed: the sub-tab list's first-run default, the detail
 * right-rail drop, and the metric-tile grid"*).
 *
 * **Three across below `--ev-bp-wide`, four above it, 12px between.** The
 * reference shows four across on `02b895df` and six in two rows of three on
 * `5b908c10`; the drawer stat row in `79a31934` is three. Three and four are
 * the two the product uses and the breakpoint chooses between them — there is
 * no third arrangement and no second breakpoint (§0.1).
 *
 * The gap is 12px (`gap-3`), measured at 7 destination px between tiles. It is
 * deliberately tighter than the 16px between page-level cards: a tile row is
 * one object read across, not four cards read in turn.
 *
 * **It is a list, and it says so.** Four tiles are four items; without a list
 * role a screen reader gets a run of headings-that-are-not-headings and no
 * count. `role="list"` on the grid keeps the semantics while the display
 * property strips them (a known `display: grid` behaviour in WebKit).
 *
 * §7.1's measure note: page width is fixed and the MEASURE moves down to here.
 * `auto-fill minmax(268px, 1fr)` is D7's own formulation; expressed as a fixed
 * 3/4 split it is the same two outcomes at the two widths the product has,
 * without a container query the rest of the tree does not use.
 */

import type { ReactNode } from 'react'

export function MetricTileRow({ children }: { children: ReactNode }) {
  return (
    <ul role="list" className="grid list-none grid-cols-3 gap-3 wide:grid-cols-4">
      {children}
    </ul>
  )
}

export function MetricTileItem({ children }: { children: ReactNode }) {
  return <li className="min-w-0">{children}</li>
}
