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
 *     (**AC-27**), and the tile's badge is **never suppressed when the sub-tab
 *     column is collapsed** — that is the only state in which it is the sole
 *     backlog signal.
 *   - **never red.** R5a enumerates the four permitted uses of red and a nav
 *     badge is not among them. `attention` maps to **warning**.
 *
 * **The Q12 ruling, and why the roll-up is done here rather than read off
 * `navCounts.workspaces`.** The server's roll-up sums *every* sub-tab; it
 * cannot know which rows this role can see. The invariant is:
 *
 * > **Any tone on a tile must be explained by a visible row with the same tone
 * > and a non-zero count.**
 *
 * So the tile is computed over the **visible** rows only, and `warning`
 * requires `badgeTone === 'attention'` **AND `count > 0`**. That second gate is
 * the part worth getting right: `badgeTone` says what *kind* of backlog a
 * sub-tab is, not what its number currently is, so it stays `attention` when
 * the queue empties. Ungated, a tile would show warning because of a row that
 * shows nothing when you expand it.
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
  let anyAttention = false
  for (const row of rows) {
    const entry = counts.subTabs.find((c) => c.subTabId === row.subTabId)
    if (!entry || entry.count === null || entry.count <= 0) continue
    total += entry.count
    /* Q12: `attention` AND `count > 0`. A row contributing nothing to the
       number contributes nothing to the tone either. */
    if (entry.tone === 'attention') anyAttention = true
  }

  if (total <= 0) return null
  return { count: total, tone: anyAttention ? 'warning' : 'neutral' }
}

/**
 * The numeral. Goes through `formatCount` at the call site for the thousands
 * separator; this only applies §2.4's overflow rule, and it returns a **key
 * name or a number**, never a concatenated string (**AC-75**).
 */
export function badgeOverflows(count: number): boolean {
  return count > BADGE_MAX
}
