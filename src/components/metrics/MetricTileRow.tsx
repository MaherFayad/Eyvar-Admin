/**
 * The metric-tile grid — `design/03-navattic-language.md` §4.9, and the one
 * sanctioned use of the `wide:` variant outside the shell (`globals.css`:
 * *"its three uses are fixed: the sub-tab list's first-run default, the detail
 * right-rail drop, and the metric-tile grid"*).
 *
 * **Three across below `--ev-bp-wide`. Above it, four — but only when four
 * divides the row.** The reference shows both and shows why: `02b895df` is four
 * across, and `5b908c10` is **six in two rows of three**, not four-then-two.
 * A trailing row of two under a row of four reads as a layout that ran out,
 * and the eye stops at the ragged edge instead of at the last number.
 *
 * So the column count is chosen from the tile count rather than fixed:
 *
 * ```
 *  4 tiles   ->  4 across          (one clean row)
 *  6 tiles   ->  3 across          (two rows of three — the reference's own)
 *  5 tiles   ->  3 across          (3 + 2 beats 4 + 1)
 * ```
 *
 * **The choice only exists above the breakpoint.** Below it the content region
 * is 912px and D7's 268px tile floor allows three columns and no more, so a
 * four-tile board renders 3 + 1 at 1280 — which is exactly what
 * `auto-fill minmax(268px, 1fr)` does, and shrinking to 219px tiles to avoid a
 * ragged edge would wrap every label instead.
 *
 * The gap is 12px (`gap-3`), measured at 7 destination px between tiles. It is
 * deliberately tighter than the 16px between page-level cards: a tile row is
 * one object read across, not four cards read in turn.
 *
 * **It is a list, and it says so.** Six tiles are six items; without a list
 * role a screen reader gets a run of links with no count. `role="list"` keeps
 * the semantics that `display: grid` strips in WebKit.
 *
 * §7.1's measure note: the PAGE width is fixed and the measure moves down to
 * here. D7 formulates this as `auto-fill minmax(268px, 1fr)`; at the two widths
 * this product has, that yields 3 and 4 — the same two outcomes, without a
 * container query the rest of the tree does not use, and without `auto-fill`'s
 * four-then-two problem.
 */

import type { ReactNode } from 'react'
import { Children } from 'react'
import { cn } from '@/lib/utils'

export function MetricTileRow({ children }: { children: ReactNode }) {
  const count = Children.count(children)
  /* Static class strings, both of them. A computed `grid-cols-${n}` is a class
     Tailwind's scanner never sees and therefore never emits. */
  const wide = count % 4 === 0 ? 'wide:grid-cols-4' : 'wide:grid-cols-3'

  return (
    <ul role="list" className={cn('grid list-none grid-cols-3 gap-3', wide)}>
      {children}
    </ul>
  )
}

export function MetricTileItem({ children }: { children: ReactNode }) {
  return <li className="min-w-0">{children}</li>
}
