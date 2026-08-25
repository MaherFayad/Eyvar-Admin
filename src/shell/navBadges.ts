/**
 * Count badges for both nav columns — design spec §2.4, spec §8.4, **AC-26**,
 * **AC-27**, and the **Q12 ruling**.
 *
 * §2.4's rules, all of them mechanical:
 *
 *   - zero or null **renders nothing at all**. Never a `0`, never a `—`, never
 *     an empty chip (**AC-26**). Legacy renders `0` on eleven rail badges at
 *     boot (`:491`–`:533`) and that is precisely what teaches operators to stop
 *     reading badges.
 *   - above 99 the badge reads `99+`.
 *   - a workspace tile's count is the **sum of its sub-tabs'** counts
 *     (**AC-27**'s count clause, which survives verbatim). AC-27's *"never
 *     suppressed when the column is collapsed"* clause is void with the
 *     collapse itself (**D5**).
 *   - **never red.** R5a enumerates the four permitted uses of red and a nav
 *     badge is not among them. `attention` maps to **warning**.
 *
 * **Q12's tone roll-up is SUPERSEDED (V6).** It was sound as an invariant —
 * *any tone on a tile must be explained by a visible row with the same tone and
 * a non-zero count* — and it still produced a rail that was permanently amber:
 * a workspace tile sums ~7 rows, so one toned row in seven turned the whole
 * tile. Measured on the running build at 1440, **8 of 11 visible nav badges
 * were warning, including 4 of the 5 rail tiles.** The invariant held at every
 * step and the result was meaningless.
 *
 * **The ruling: a workspace tile's badge is `neutral`, always.** Not
 * expedience — a tile's number is a **sum of heterogeneous queues** (three
 * applications, four expiring documents, one dispute) and a sum of different
 * kinds of thing has no single status to report. Only the row knows what its
 * number means. The count still rolls up; the tone does not.
 *
 * **Why the roll-up is still done here rather than read off
 * `navCounts.workspaces`.** The server's roll-up sums *every* sub-tab; it
 * cannot know which rows this role can see. So the tile is computed over the
 * **visible** rows only.
 *
 * **There is no `navCounts.workspaces` to be tempted by.** 0.6 deleted the
 * field from the wire type after this file shipped, so a server roll-up is now
 * impossible to consume rather than merely discouraged — the endpoint returns
 * per-sub-tab counts and nothing else. `workspaceBadge` below is the single
 * implementation of the rule, in the whole repo; the data layer's own tests
 * were moved here in 0.7 (`navBadges.test.ts`) so that the arrow between the
 * layers points one way.
 */

import type { NavBadgeTone, NavCounts, SubTabRoute, WorkspaceId } from '@/data/types'

/** What a badge renders as. `null` means **render nothing** — not a zero. */
export interface NavBadge {
  count: number
  /** R7's tone names, not §8.4's vocabulary. `attention` → `warning`. */
  tone: 'warning' | 'neutral'
}

/** §2.4 — above 99 the badge reads `99+`. */
export const BADGE_MAX = 99

function toBadge(count: number | null, tone: NavBadgeTone): NavBadge | null {
  /* AC-26. `null` (no backlog concept) and `0` (empty backlog) are different
     facts and render identically: nothing. */
  if (count === null || count <= 0) return null
  return { count, tone: tone === 'attention' ? 'warning' : 'neutral' }
}

/** One sub-tab row's badge. */
export function subTabBadge(counts: NavCounts | null, subTabId: string): NavBadge | null {
  const row = counts?.subTabs.find((c) => c.subTabId === subTabId)
  if (!row) return null
  return toBadge(row.count, row.tone)
}

/**
 * A workspace tile's badge, summed over the rows the operator can actually
 * see. See the header for why this is not `navCounts.workspaces`.
 *
 * `visibleRows` must already be permission-filtered (`visibleSubTabs`).
 */
export function workspaceBadge(
  counts: NavCounts | null,
  visibleRows: readonly SubTabRoute[],
  workspaceId: WorkspaceId,
): NavBadge | null {
  if (!counts) return null
  const rows = visibleRows.filter((row) => row.workspaceId === workspaceId)
  if (rows.length === 0) return null

  let total = 0
  for (const row of rows) {
    const entry = counts.subTabs.find((c) => c.subTabId === row.subTabId)
    if (!entry || entry.count === null || entry.count <= 0) continue
    total += entry.count
  }

  if (total <= 0) return null
  /* V6 — `neutral` UNCONDITIONALLY. There is no tone branch here and there is
     not meant to be one; a `tone` parameter would be an invitation to put it
     back. The sub-tab ROW keeps its tone, and `warning` there now means
     BREACHED, rarely, which is the only thing worth a colour in peripheral
     vision. Never on a tile, never red (R5a), never a sixth tone (R7). */
  return { count: total, tone: 'neutral' }
}

/**
 * The numeral. Goes through `formatCount` at the call site for the thousands
 * separator; this only applies §2.4's overflow rule, and it returns a **key
 * name or a number**, never a concatenated string (**AC-75**).
 */
export function badgeOverflows(count: number): boolean {
  return count > BADGE_MAX
}
