/**
 * Nav count badges — foundation spec §8.4.
 *
 * Seventeen badge ids exist today across 30 rail items
 * (`GROUND-TRUTH-INVENTORY.md` §B). Under D1 they redistribute across 34
 * sub-tabs. The numbers below are the seeded backlogs the legacy renderers
 * compute at boot, restated per sub-tab.
 *
 * Three cases every screen has to handle, all present here on purpose:
 *
 *   `null`  the sub-tab has no backlog concept — **no badge, ever**
 *   `0`     the backlog is empty — **still no badge**, not a `0`. Legacy paints
 *           the literal `0` on eleven rail badges at boot (`:491`, `:492`,
 *           `:496`, `:508`, `:514`–`:518`, `:523`, `:533`), which is defect
 *           D-L8 and is why operators stop reading them.
 *   `> 0`   a badge, toned `attention` or `neutral` (`.sb-badge a` `:491` vs
 *           `.sb-badge n` `:502`).
 *
 * The 1,247 on Activity Log is deliberate: a four-digit count in a narrow rail
 * column is the layout case nobody designs for until it ships.
 */

import type { SubTabCount } from '../types/navigation'

export const navCountFixtures: SubTabCount[] = [
  /* Management */
  { subTabId: 'management-overview', count: null, tone: 'neutral' },
  { subTabId: 'management-performance', count: null, tone: 'neutral' },
  { subTabId: 'management-risk', count: 6, tone: 'attention' },
  { subTabId: 'management-growth', count: null, tone: 'neutral' },
  /* Zero, not null: the zone watchlist exists and is currently empty. No badge. */
  { subTabId: 'management-zones', count: 0, tone: 'neutral' },

  /* Operations */
  { subTabId: 'operations-overview', count: null, tone: 'neutral' },
  { subTabId: 'operations-my-work', count: 12, tone: 'attention' },
  { subTabId: 'operations-dispatch', count: null, tone: 'neutral' },
  { subTabId: 'operations-requests', count: 3, tone: 'attention' },
  { subTabId: 'operations-subscriptions', count: 8, tone: 'neutral' },
  /* One pending corporate account — CORP-001 (`:13847`). */
  { subTabId: 'operations-corporate', count: 1, tone: 'neutral' },
  { subTabId: 'operations-trips', count: null, tone: 'neutral' },
  { subTabId: 'operations-assurance', count: 4, tone: 'attention' },
  /* Five pending applications (`DB.pendingDrivers`, `:2712`) + 2 compliance expiries. */
  { subTabId: 'operations-people', count: 7, tone: 'attention' },

  /* Financials */
  { subTabId: 'financials-overview', count: null, tone: 'neutral' },
  { subTabId: 'financials-revenue', count: null, tone: 'neutral' },
  { subTabId: 'financials-payouts', count: 2, tone: 'neutral' },
  /**
   * **The `count > 0` gate's fixture.** Cash & Captain Debt's escalations are a
   * work queue, so the sub-tab is an `attention` *kind* of backlog — and right
   * now it is empty.
   *
   * Financials therefore rolls up to `count: 2` (from Payouts) and
   * `tone: 'neutral'`, because the only `attention` child has nothing in it.
   * Without the gate the Financials tile would read `warning` over a `2` that,
   * when expanded, shows two routine neutral payout batches and an empty
   * escalation queue with **no badge at all** — a warning the operator cannot
   * trace to anything. Asserted in `clients/navCounts.test.ts`; do not
   * "simplify" it back to a bare `tone === 'attention'` check.
   */
  { subTabId: 'financials-cash', count: 0, tone: 'attention' },
  { subTabId: 'financials-rider-wallets', count: null, tone: 'neutral' },
  { subTabId: 'financials-pricing', count: null, tone: 'neutral' },
  { subTabId: 'financials-ledger', count: null, tone: 'neutral' },

  /* Customer Support */
  { subTabId: 'support-overview', count: null, tone: 'neutral' },
  /* Three open/in-progress tickets (`DB.tickets`, `:2763`). */
  { subTabId: 'support-tickets', count: 3, tone: 'attention' },
  { subTabId: 'support-disputes', count: 0, tone: 'neutral' },
  { subTabId: 'support-fairness', count: 2, tone: 'neutral' },
  { subTabId: 'support-safety', count: 0, tone: 'neutral' },
  { subTabId: 'support-contact-centre', count: 5, tone: 'neutral' },

  /* Admin */
  { subTabId: 'admin-overview', count: 2, tone: 'attention' },
  { subTabId: 'admin-workspace', count: null, tone: 'neutral' },
  /* USR-4 is `Invited` and has never logged in (`:2837`). */
  { subTabId: 'admin-team', count: 1, tone: 'neutral' },
  { subTabId: 'admin-policy', count: null, tone: 'neutral' },
  { subTabId: 'admin-communications', count: 0, tone: 'neutral' },
  { subTabId: 'admin-data', count: 1, tone: 'attention' },
  /* Four digits in a rail badge. Someone will discover this the hard way. */
  { subTabId: 'admin-activity', count: 1247, tone: 'neutral' },
]

/**
 * The "every backlog is empty" fixture. Not reachable by filtering the set
 * above, and it is a **real state**: the console after a clean shift. QA
 * switches to it with `useEmptyNavCounts()`.
 */
export const navCountFixturesAllEmpty: SubTabCount[] = navCountFixtures.map((c) => ({
  ...c,
  count: c.count === null ? null : 0,
}))
