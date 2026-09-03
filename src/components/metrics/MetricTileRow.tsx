/**
 * **What is left of the metric-tile grid**, which is one list item.
 *
 * This file used to hold `MetricTileRow`, `MetricLeadRow` and
 * `supportingColumns` — a 3/4/5-column chooser that picked the arrangement
 * leaving the fewest empty cells in a trailing row of BORDERED tiles, because a
 * remainder of one left a visible hole in a row of boxes.
 *
 * The boxes are gone. A board is now a band and a set of chapters, and a
 * chapter is always three across (`ChapterFigures`) so a reader's eye comes
 * down the same three tracks through the whole page rather than re-finding them
 * at each heading — which means the arithmetic that chose between three, four
 * and five has nothing left to choose. The trailing cell of an odd chapter is
 * page ground, and on a page with no card edges that is simply how a row ends.
 *
 * The item survives because both boards still render lists: `<li>` with
 * `min-w-0`, which is the one thing a grid cell must carry or its contents
 * refuse to shrink below their intrinsic width and the row overflows.
 *
 * ── ONE WARNING FROM THE DELETED CODE, KEPT BECAUSE IT COST A DAY ──────────
 * Tailwind v4 scans this comment as plain text and has no idea it is a comment.
 * A prose sentence that happens to spell a utility MINTS THAT UTILITY into
 * `dist`. The original of this header joined a physical side-word to the rail
 * noun with a hyphen while explaining that the product uses logical insets —
 * and that phrase alone emitted a rule setting a PHYSICAL inset from
 * `--ev-rail-w` into the built stylesheet. `globals.css` records the first
 * occurrence and `scratch/prose-class-leak.mjs` is the check that finds them.
 *
 * **Name the parts, never the token. Verify in `dist`, not in `src`.**
 */

import type { ReactNode } from 'react'

export function MetricTileItem({ children }: { children: ReactNode }) {
  return <li className="min-w-0">{children}</li>
}
