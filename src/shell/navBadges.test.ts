/**
 * `workspaceBadge` — the Q12 roll-up rule, and the fixture that makes its
 * `count > 0` gate testable.
 *
 * **Adopted from `src/data/clients/navCounts.test.ts` in 0.7, unchanged except
 * for its imports.** mock-data-engineer wrote these eleven while building the
 * fixture, and they were the only coverage `src/shell/` had. They lived on the
 * wrong side of the layer boundary: the data layer must not import from
 * `@/shell`. Moving the file reverses the arrow.
 *
 * **The fixture imports went with it — through the seam, not around it.**
 * `seam.test.ts` guards one rule: everything outside `src/data` reaches data
 * through `@/data/clients`, never `@/data/fixtures`. The original file was
 * inside `src/data` and so could import a fixture directly; here it cannot, and
 * the fix is to consume `getNavCounts()` and `getRouteTable()` rather than to
 * exempt test files from the guard. That is strictly better than a fixture
 * import: the shell's own test now walks the same path the shell walks, so a
 * seam regression fails this suite too.
 *
 * The `count > 0` gate inside `workspaceBadge` looks like a redundant clause
 * next to the tone check, and the first person to tidy that expression will drop
 * it. These tests are what stops that. Verified by mutation: deleting the gate
 * fails "rolls up neutral…" and "shows no badge…" below.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import {
  disableMockLatency,
  getNavCounts,
  getRouteTable,
  mockFailures,
  resetNavCounts,
  useEmptyNavCounts,
} from '@/data/clients'
import { workspaceBadge } from './navBadges'
import type { NavCounts } from '@/data/types'

/** Every sub-tab row, through the seam. The shell reads exactly this. */
const SUB_TABS = getRouteTable().subTabs

/** The default scenario's counts, through the seam rather than off the fixture. */
let navCountFixtures: NavCounts['subTabs']

beforeEach(async () => {
  disableMockLatency()
  mockFailures.clear()
  resetNavCounts()
  navCountFixtures = (await getNavCounts()).subTabs
})

const asCounts = (subTabs: NavCounts['subTabs']): NavCounts => ({
  subTabs,
  computedAt: '2026-06-25T09:14:00+03:00',
})

const tile = (subTabs: NavCounts['subTabs'], workspaceId: 'financials' | 'operations') =>
  workspaceBadge(asCounts(subTabs), SUB_TABS, workspaceId)

describe('the fixture the `count > 0` gate needs', () => {
  const financialsIds = new Set(
    SUB_TABS.filter((r) => r.workspaceId === 'financials').map((r) => r.subTabId),
  )
  /* Read per-test rather than at module scope: `navCountFixtures` is now the
     seam's answer, resolved in `beforeEach`, not a statically imported array. */
  const financialsRows = () => navCountFixtures.filter((c) => financialsIds.has(c.subTabId))

  it('keeps a sub-tab that is attention-kind and currently empty', () => {
    expect(financialsRows().some((c) => c.tone === 'attention' && c.count === 0)).toBe(true)
  })

  it('sits it beside a non-zero neutral sibling, or the roll-up proves nothing', () => {
    expect(financialsRows().some((c) => c.tone === 'neutral' && (c.count ?? 0) > 0)).toBe(true)
  })

  it('has nothing else in Financials that is attention-with-work, or the case is masked', () => {
    expect(financialsRows().some((c) => c.tone === 'attention' && (c.count ?? 0) > 0)).toBe(false)
  })
})

describe('workspaceBadge against that fixture', () => {
  it('rolls up neutral when the only attention sub-tab has a count of 0', () => {
    /* Financials: Payouts 2/neutral · Cash 0/attention · the rest null. */
    expect(tile(navCountFixtures, 'financials')).toEqual({ count: 2, tone: 'neutral' })
  })

  it('escalates as soon as that same sub-tab has one item', () => {
    const withWork = navCountFixtures.map((c) =>
      c.subTabId === 'financials-cash' ? { ...c, count: 1 } : c,
    )
    expect(tile(withWork, 'financials')).toEqual({ count: 3, tone: 'warning' })
  })

  it('still escalates when an attention sub-tab has work — the rule is a gate, not a removal', () => {
    /* Operations: My Work 12/attention. */
    expect(tile(navCountFixtures, 'operations')?.tone).toBe('warning')
  })

  it('shows no badge when the sum is zero, even with attention children', async () => {
    useEmptyNavCounts()
    const counts = await getNavCounts()
    for (const workspace of ['management', 'operations', 'financials', 'support', 'admin'] as const) {
      expect(workspaceBadge(counts, SUB_TABS, workspace), workspace).toBeNull()
    }
  })

  it('treats a null child as contributing nothing, not as breaking the sum', () => {
    expect(
      tile(
        [
          { subTabId: 'financials-overview', count: null, tone: 'neutral' },
          { subTabId: 'financials-payouts', count: 4, tone: 'neutral' },
        ],
        'financials',
      ),
    ).toEqual({ count: 4, tone: 'neutral' })
  })
})

describe('the wire contract', () => {
  it('sends no workspace roll-up — the shell derives it (§11.2, Q12)', async () => {
    const counts = await getNavCounts()
    expect(Object.keys(counts).sort()).toEqual(['computedAt', 'subTabs'])
    expect(counts).not.toHaveProperty('workspaces')
  })

  it('covers every sub-tab in the route table, so no tile is summed over a gap', async () => {
    const counts = await getNavCounts()
    expect(counts.subTabs.map((c) => c.subTabId).sort()).toEqual(SUB_TABS.map((r) => r.subTabId).sort())
  })

  it('distinguishes "no backlog concept" (null) from "empty backlog" (0)', async () => {
    const counts = await getNavCounts()
    expect(counts.subTabs.some((c) => c.count === null)).toBe(true)
    expect(counts.subTabs.some((c) => c.count === 0)).toBe(true)
  })
})
