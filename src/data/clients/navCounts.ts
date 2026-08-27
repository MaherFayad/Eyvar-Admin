/**
 * Navigation count badges — foundation spec §8.4.
 *
 * **This is a network read, not a constant.** That is the whole point of the
 * file. Nav counts are backlog sizes computed across seventeen queues; in
 * production one endpoint returns them and it can be slow, empty or down. §9.1
 * says the nav's *labels* render immediately from the route table and only the
 * *count badges* skeletonise — a distinction that is impossible to honour if
 * the counts are a hard-coded object.
 */

import { DATA_SOURCE } from '../config'
import { EYVAR_NOW } from '../mock/clock'
import { mock } from '../mock/delay'
import { navCountFixtures, navCountFixturesAllEmpty } from '../fixtures/navCounts'
import { starvedZoneCount } from './zones'
import type { NavCounts, SubTabCount } from '../types/navigation'
import { http } from './http'

export const NAV_COUNT_OPERATIONS = {
  list: 'navCounts.list',
} as const

/** Which fixture set the mock serves. Switched by QA; never by app code. */
type NavCountScenario = 'default' | 'all-empty'
let scenario: NavCountScenario = 'default'

/**
 * GET /api/v1/nav/counts
 *   params: none — the server scopes to the caller's permissions
 *   -> NavCounts
 *
 * Response contract:
 *   `subTabs[].count`   `null` = no backlog concept · `0` = empty backlog
 *   `subTabs[].tone`    what kind of backlog it is, independent of the count
 *   `computedAt`        ISO, so the UI can show staleness without a host clock
 *
 * **No workspace roll-up is returned.** The shell derives it with
 * `workspaceBadge` (`src/shell/navBadges.ts`), because the sum is over *visible* sub-tabs and
 * visibility is a role question the shell owns (§11.2).
 *
 * Poll cadence is the shell's one clock (§4.4 "One clock"), not a timer in this
 * client and not a per-page interval.
 */
export async function getNavCounts(signal?: AbortSignal): Promise<NavCounts> {
  if (DATA_SOURCE === 'http') return http.get<NavCounts>('/nav/counts', undefined, { signal })
  return mock(NAV_COUNT_OPERATIONS.list, signal, () => {
    if (scenario === 'all-empty') return { subTabs: navCountFixturesAllEmpty, computedAt: EYVAR_NOW }
    return { subTabs: navCountFixtures.map(ground), computedAt: EYVAR_NOW }
  })
}

/**
 * **`management-zones` is computed, not seeded — R4-6 §6.5 and §6.6.4.**
 *
 * The badge's legacy definition is the *starved* count (`sbb-zones`, `:14140`),
 * and until `clients/zones.ts` existed this layer had no zone array to count.
 * `fixtures/navCounts.ts` records the consequence in its own comment: the badge
 * and the `starvedZones` tile were *"asserted against each other"* and both
 * merely cited to `:14133`, with the closing line **"A real `clients/zones.ts`
 * closes it."** This is that close.
 *
 * The seeded `2` stays in the fixture as the expected value — a grep-able
 * number a bug report can name — and this function is what makes it *true*
 * rather than *agreed*. The badge, the tile and the table's first row now come
 * from one array (§6.6.4), so none of the three can drift from the others.
 *
 * **`all-empty` is NOT grounded**, and that is the one place the two must
 * differ: the clean-shift scenario asserts what the nav looks like when every
 * backlog is empty, and a badge that recomputed itself back to `2` would make
 * that scenario unreachable — the opposite of the point.
 */
function ground(row: SubTabCount): SubTabCount {
  if (row.subTabId !== 'management-zones') return row
  return { ...row, count: row.count === null ? null : starvedZoneCount() }
}

/**
 * **There is no workspace roll-up in this file, on purpose.**
 *
 * The rule — sum the visible sub-tabs, escalate the tone only when a visible
 * sub-tab is `attention` **and** `count > 0`, render nothing at zero — lives in
 * `src/shell/navBadges.ts` (`workspaceBadge`), which is the shell owner's file
 * and the single implementation.
 *
 * It belongs there rather than here because the sum is over the sub-tabs *this
 * role can see* (§11.2), and role visibility is resolved in the shell. A second
 * copy in the data layer would be a second answer to one question.
 *
 * What this file owes that rule is its **fixture**: `financials-cash` is
 * `attention` with `count: 0`, beside a non-zero neutral `financials-payouts`,
 * so the `count > 0` gate has a case that fails when it is removed. See
 * `fixtures/navCounts.ts` and `navCounts.test.ts`.
 */

/* ─────────────────────────── QA affordances ────────────────────────────── */

/** Serve the "every backlog empty" set — the clean-shift state (§9.1's empty case for the nav). */
export function useEmptyNavCounts(): void {
  scenario = 'all-empty'
}

export function resetNavCounts(): void {
  scenario = 'default'
}
