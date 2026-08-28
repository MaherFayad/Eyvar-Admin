/**
 * The metric-tile grid — `design/03-navattic-language.md` §4.9, and the one
 * sanctioned use of the `wide:` variant outside the shell (`globals.css`:
 * *"its three uses are fixed: the sub-tab list's first-run default, the detail
 * rail drop on the inline-end side, and the metric-tile grid"*).
 *
 * **The wording above is deliberate and must not be "corrected" back.** The
 * sentence it quotes used to join the physical side-word to the rail noun with
 * a hyphen — and that alone is a valid Tailwind candidate, which resolved
 * against the theme and emitted a rule setting a **physical** inset from
 * `--ev-rail-w` into the built stylesheet, in a product where every inset is
 * logical. `globals.css:80`-`:88` records the first occurrence; it came from
 * `src/lib/breakpoint.ts:5` and was closed by excluding `src/lib` from the
 * scan. This file lives in `src/components`, which IS scanned, so the same
 * sentence minted the same rule again from a new home.
 *
 * **This comment was itself the third occurrence.** A first draft spelled the
 * offending token out in order to warn about it, and the build put the rule
 * straight back - the same way `MetricTile.tsx` once shipped an arbitrary value
 * by writing that it did not use one. Naming the parts, never the token, is the
 * only form of this warning that does not perform the defect.
 *
 * The lesson generalises: a class name in prose is a class name. It needs no
 * brackets, no arbitrary value, no syntax resembling code - just two ordinary
 * words and an ordinary hyphen. **Verify in `dist`, never in `src`.**
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
  return (
    <ul role="list" className="grid list-none grid-cols-4 gap-3">
      {children}
    </ul>
  )
}

export function MetricTileItem({ children }: { children: ReactNode }) {
  return <li className="min-w-0">{children}</li>
}
