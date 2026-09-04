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

import { DATA_SOURCE, registerOperations } from '../config'
import { EYVAR_NOW } from '../mock/clock'
import { mock } from '../mock/delay'
import { captainCount } from './drivers'
import { myWorkBacklogSize } from './myWork'
import { openRequestCount } from './requests'
import { subscriptionCount } from './subscriptions'
import { starvedZoneCount } from './zones'
import type { NavCounts, SubTabCount } from '../types/navigation'
import { http } from './http'
import { onFixturesLoaded, type Fixtures } from '../mock/fixtures'

/* Late-bound fixture rows. `mock/fixtures.ts` says why this is not a static
   import: a static one pins seeded data into every build, including the http
   build that can never read it. Bound before any mock read, because `mock()`
   and `mockMutation()` await `loadFixtures()`. */
let navCountFixtures!: Fixtures['navCountFixtures']
let navCountFixturesAllEmpty!: Fixtures['navCountFixturesAllEmpty']
onFixturesLoaded((f) => {
  navCountFixtures = f.navCountFixtures
  navCountFixturesAllEmpty = f.navCountFixturesAllEmpty
})

export const NAV_COUNT_OPERATIONS = {
  list: 'navCounts.list',
} as const

/* Registered at module load, not on first call. `config.ts` says *"each client
   registers its ids here at module load"*, and `mock()` only registers when it
   runs — so an operation nobody has invoked yet is missing from a QA panel's
   list and from any validation of `?mockFail=`. Every id in this module is
   listed the moment the module is imported. */
registerOperations(...Object.values(NAV_COUNT_OPERATIONS))

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
 * **O8** — each badge counts what its sub-tab's default view shows, computed by
 * that sub-tab's own client, so the badge and the page cannot disagree (X3).
 *
 * `management-risk` is absent: its three contributing tiles are literals that
 * `fixtures/metrics.ts:1022` derives *from* this badge, so summing them would
 * invert AC-720's authority. An owner question, not a predicate to invent.
 */
const COMPUTED: Readonly<Record<string, () => number>> = {
  'management-zones': starvedZoneCount,
  'operations-my-work': myWorkBacklogSize,
  'operations-ride-requests': () => openRequestCount('instant'),
  'operations-subscription-requests': () => openRequestCount('subscription'),
  'operations-subscriptions': subscriptionCount,
  'operations-people': captainCount,
}

/**
 * The seeded number stays in the fixture as the expected value — a grep-able
 * number a bug report can name — and this is what makes it true rather than
 * agreed.
 *
 * **`all-empty` is NOT grounded.** The clean-shift scenario asserts what the
 * nav looks like when every backlog is empty, and a badge that recomputed
 * itself would make that scenario unreachable.
 */
function ground(row: SubTabCount): SubTabCount {
  const compute = COMPUTED[row.subTabId]
  if (!compute || row.count === null) return row
  return { ...row, count: compute() }
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
