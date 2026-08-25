/**
 * The permission filter — **AC-56**, **AC-57**, **AC-58**, **AC-61**, and
 * design spec finding **F-6**.
 *
 * Two things these tests are careful about, and a reviewer should keep them
 * that way:
 *
 *   **No role name appears anywhere below.** F-6: visibility is a filter over
 *   the route table, not a layout branch, and adding `Trust & Safety` or
 *   `Dispatcher` (Q3) must be a data change. A test that asserts "Support sees
 *   X" would bake the role model into the suite and make Q3 a code change
 *   after all. The tests take a `PermissionContext` — two fields — and say
 *   nothing about who holds it.
 *
 *   **The current pass-everything behaviour is asserted as the RECORDED GAP,
 *   not as correct.** Q4 is unanswered and every route-table `permission` is
 *   `null`, so `isSubTabVisible` returns `true` for all 34. The test below says
 *   so in its own name, so when Q4 lands the failure names the reason instead
 *   of looking like a regression.
 */

import { describe, expect, it } from 'vitest'
import { getRouteTable } from '@/data/clients'
import type { PermissionKey, SubTabRoute, Workspace } from '@/data/types'
import {
  canWriteSubTab,
  forbiddenReason,
  holdsPermission,
  isSubTabVisible,
  visibleSubTabs,
  visibleWorkspaces,
  type PermissionContext,
} from './permissions'

const table = getRouteTable()

const ctx = (permissions: PermissionKey[] = [], subTabPermissions = {}): PermissionContext => ({
  permissions,
  subTabPermissions,
})

/** A row with a permission attached, so the gated path is testable while Q4 is open. */
const gated = (row: SubTabRoute, key: PermissionKey, level: 'full' | 'read' = 'full'): SubTabRoute => ({
  ...row,
  permission: { key, level },
})

const firstOf = (workspaceId: Workspace['id']) => {
  const row = table.subTabs.find((r) => r.workspaceId === workspaceId)
  if (!row) throw new Error(`no row for ${workspaceId}`)
  return row
}

describe('AC-61 — the recorded gap: Q4 is open, so nothing is gated yet', () => {
  it('ships every one of the 34 rows with a null permission', () => {
    expect(table.subTabs).toHaveLength(34)
    expect(table.subTabs.every((r) => r.permission === null)).toBe(true)
  })

  it('therefore shows every row to a role holding no permissions at all', () => {
    /* An UNGATED row is one nobody has gated yet, which is exactly what the
       product does today. The alternative — deny by default — is a console
       with no navigation until a business decision lands. */
    const empty = ctx([])
    expect(table.subTabs.every((row) => isSubTabVisible(empty, row))).toBe(true)
    expect(visibleWorkspaces(empty, table.workspaces, table.subTabs)).toHaveLength(5)
  })
})

describe('holdsPermission', () => {
  it('passes an unresolved requirement — see AC-61 above', () => {
    expect(holdsPermission(ctx([]), null)).toBe(true)
  })

  it('denies a key the role does not hold', () => {
    expect(holdsPermission(ctx(['view_finance']), { key: 'manage_team', level: 'full' })).toBe(false)
  })

  it('grants a key the role holds', () => {
    expect(holdsPermission(ctx(['manage_team']), { key: 'manage_team', level: 'full' })).toBe(true)
  })

  it('treats read-only as VISIBLE — §11.2, the actions differ, not the row', () => {
    const row = gated(firstOf('financials'), 'view_finance', 'read')
    expect(isSubTabVisible(ctx(['view_finance']), row)).toBe(true)
    /* …and read-only is where `canWrite` says no, which is what "write actions
       disabled in place" is built on. */
    expect(canWriteSubTab(ctx(['view_finance']), row)).toBe(false)
  })

  it('grants write only at level `full`', () => {
    const row = gated(firstOf('financials'), 'view_finance', 'full')
    expect(canWriteSubTab(ctx(['view_finance']), row)).toBe(true)
    expect(canWriteSubTab(ctx([]), row)).toBe(false)
  })
})

describe('AC-58 — a sub-tab the role cannot see does not render a row', () => {
  it('filters the row out of its workspace column', () => {
    const target = firstOf('admin')
    const rows = table.subTabs.map((r) => (r.subTabId === target.subTabId ? gated(r, 'manage_team') : r))
    const visible = visibleSubTabs(ctx([]), rows, 'admin')
    expect(visible.map((r) => r.subTabId)).not.toContain(target.subTabId)
  })

  it('keeps the rest of the workspace intact — one denial is not a blackout', () => {
    const target = firstOf('admin')
    const rows = table.subTabs.map((r) => (r.subTabId === target.subTabId ? gated(r, 'manage_team') : r))
    const visible = visibleSubTabs(ctx([]), rows, 'admin')
    const total = table.subTabs.filter((r) => r.workspaceId === 'admin').length
    expect(visible).toHaveLength(total - 1)
  })

  it('returns rows in display order, so the column never reorders itself', () => {
    const visible = visibleSubTabs(ctx([]), table.subTabs, 'operations')
    expect(visible.map((r) => r.order)).toEqual([...visible.map((r) => r.order)].sort((a, b) => a - b))
  })

  it('honours a derived subTabPermissions entry over the row default', () => {
    const target = firstOf('support')
    const denied = ctx([], { [target.subTabId]: ['manage_tickets'] })
    expect(isSubTabVisible(denied, target)).toBe(false)
    const allowed = ctx(['manage_tickets'], { [target.subTabId]: ['manage_tickets'] })
    expect(isSubTabVisible(allowed, target)).toBe(true)
  })
})

describe('AC-57 — a workspace with no visible sub-tab renders no rail tile', () => {
  it('drops the tile only when EVERY row in it is hidden', () => {
    const key: PermissionKey = 'manage_settings'
    const rows = table.subTabs.map((r) => (r.workspaceId === 'admin' ? gated(r, key) : r))

    const withoutKey = visibleWorkspaces(ctx([]), table.workspaces, rows)
    expect(withoutKey.map((w) => w.id)).not.toContain('admin')
    expect(withoutKey).toHaveLength(4)

    const withKey = visibleWorkspaces(ctx([key]), table.workspaces, rows)
    expect(withKey.map((w) => w.id)).toContain('admin')
  })

  it('keeps the tile when ONE row survives — §3.1: the column stays full width', () => {
    const adminRows = table.subTabs.filter((r) => r.workspaceId === 'admin')
    const survivor = adminRows[0]
    if (!survivor) throw new Error('admin has no rows')
    const rows = table.subTabs.map((r) =>
      r.workspaceId === 'admin' && r.subTabId !== survivor.subTabId ? gated(r, 'manage_settings') : r,
    )
    expect(visibleWorkspaces(ctx([]), table.workspaces, rows).map((w) => w.id)).toContain('admin')
    expect(visibleSubTabs(ctx([]), rows, 'admin')).toHaveLength(1)
  })

  it('returns tiles in rail order, with the pinned one last', () => {
    const order = visibleWorkspaces(ctx([]), table.workspaces, table.subTabs)
    expect(order.map((w) => w.order)).toEqual([1, 2, 3, 4, 5])
    expect(order[order.length - 1]?.pinnedToBottom).toBe(true)
  })
})

describe('AC-56 — a forbidden route NAMES the permission, and is not a redirect', () => {
  it('returns the key the forbidden state must render', () => {
    const row = gated(firstOf('financials'), 'view_finance')
    expect(forbiddenReason(ctx([]), row)).toBe('view_finance')
  })

  it('returns null for a permitted route', () => {
    const row = gated(firstOf('financials'), 'view_finance')
    expect(forbiddenReason(ctx(['view_finance']), row)).toBeNull()
  })

  it('returns null for an unresolved route — not-found is a different state', () => {
    expect(forbiddenReason(ctx([]), null)).toBeNull()
  })
})
