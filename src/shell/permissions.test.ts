/**
 * The permission filter and the write gate — **AC-56**, **AC-57**, **AC-58**,
 * **AC-61**, **AC-914 … AC-919**; design spec finding **F-6**; **D17**.
 *
 * ## What this file exists to prevent happening again
 *
 * Before D17 all 35 route-table rows carried `permission: null`, so
 * `canWriteSubTab` returned `true` for every operator on every screen and every
 * `disabled={!gate.canWrite}` in Payouts, Cash, Ledger, Wallets and Pricing was
 * decoration. **It failed green**: a test asserting *"an operator without
 * permission cannot do X"* could not fail, because no operator lacked a
 * permission, and every gating assertion written against `canWrite` looked like
 * coverage while proving nothing.
 *
 * So two rules govern everything below, and a reviewer should hold them:
 *
 *   **Every refusal is proved by its twin.** A test that asserts a denial sits
 *   beside one that asserts the grant **from the same input, changing only who
 *   is asking**. A vacuous pass on one is caught by the other: if the gate
 *   started returning a constant, exactly one of each pair would go red.
 *
 *   **The refusals are built from real seeded operators**, through
 *   `switchMockUser` and the real `getSession`, not from hand-rolled contexts.
 *   A hand-rolled context proves the predicate; only a real session proves that
 *   the data actually reaches it. Both appear here, and the role-switching
 *   tests are the ones that matter.
 *
 * **No role name appears in `permissions.ts` itself** and F-6 requires it stay
 * that way: visibility is a filter over the route table, and D17 added two roles
 * without touching one line of the module under test. Role names appear *here*,
 * because a test that never names a role cannot assert that Finance and Ops
 * Manager differ — which was exactly the assertion the old type made impossible.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { disableMockLatency, getRouteTable, getSession, resetDataLayer, switchMockUser } from '@/data/clients'
import { ROLE_PERMISSIONS, effectivePermissions } from '@/data/types'
import type { PermissionKey, RoleName, SubTabRoute, Workspace } from '@/data/types'
import {
  canWriteSubTab,
  forbiddenReason,
  holdsPermission,
  isSubTabVisible,
  permissionContext,
  visibleSubTabs,
  visibleWorkspaces,
  writeRefusalPermission,
  type PermissionContext,
} from './permissions'

const table = getRouteTable()

const ctx = (
  permissions: PermissionKey[] = [],
  subTabPermissions: Record<string, PermissionKey[]> = {},
): PermissionContext => ({ permissions, subTabPermissions })

/** A context holding exactly one role's baseline — no delta, no invention. */
const asRole = (role: RoleName): PermissionContext => ctx([...ROLE_PERMISSIONS[role]])

const row = (subTabId: string): SubTabRoute => {
  const found = table.subTabs.find((r) => r.subTabId === subTabId)
  if (!found) throw new Error(`no row ${subTabId}`)
  return found
}

const firstOf = (workspaceId: Workspace['id']) => {
  const found = table.subTabs.find((r) => r.workspaceId === workspaceId)
  if (!found) throw new Error(`no row for ${workspaceId}`)
  return found
}

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
})

/* ════════════════════════════════════════════════════════════════════════
   The two tests the old type made impossible. If you delete anything in this
   file, do not delete these.
   ════════════════════════════════════════════════════════════════════════ */

describe('THE DEFECT — one screen, two roles, two different answers', () => {
  /**
   * **This is the assertion `PermissionRef.level` could not express.** `level`
   * was a property of the ROW, so Financials › Payouts was read-only for
   * everybody or for nobody. It has to be `●` for Finance and `◐` for Ops
   * Manager at the same time, and D17's two-key row is what makes that sayable.
   *
   * Driven through `switchMockUser` and the real `getSession`, so it proves the
   * whole path: fixture → role baseline → `effectivePermissions` → session →
   * `permissionContext` → gate. A unit test on the predicate alone would have
   * passed under the old model too.
   */
  it('Payouts is WRITABLE for the seeded Finance operator', async () => {
    await switchMockUser('USR-2') // Fahad Al-Dosari, Finance
    const session = await getSession()
    expect(session.role).toBe('Finance')

    const gate = permissionContext(session)
    const payouts = row('financials-payouts')

    expect(isSubTabVisible(gate, payouts)).toBe(true)
    expect(canWriteSubTab(gate, payouts)).toBe(true)
    expect(writeRefusalPermission(gate, payouts)).toBeNull()
  })

  it('…and READ-ONLY for the seeded Ops Manager, on the same row, in the same run', async () => {
    await switchMockUser('USR-5') // Yousef Al-Balawi, Ops Manager
    const session = await getSession()
    expect(session.role).toBe('Ops Manager')

    const gate = permissionContext(session)
    const payouts = row('financials-payouts')

    /* `◐`. The row RENDERS — §11.2, a read-only sub-tab is not hidden — and its
       write actions are disabled in place with the reason named. This is one of
       D17's eight named deviations from §10.3, which had `○` here: a workspace
       read key cannot hide two rows inside the workspace it opens. */
    expect(isSubTabVisible(gate, payouts)).toBe(true)
    expect(canWriteSubTab(gate, payouts)).toBe(false)
    expect(writeRefusalPermission(gate, payouts)).toBe('process_payouts')
  })

  /**
   * **The twin, stated as one assertion so neither half can be vacuous.** Same
   * row, same predicate, same process; only the operator changes.
   */
  it('proves the difference is the OPERATOR and not the row', async () => {
    const payouts = row('financials-payouts')

    await switchMockUser('USR-2')
    const finance = permissionContext(await getSession())
    await switchMockUser('USR-5')
    const opsManager = permissionContext(await getSession())

    expect([canWriteSubTab(finance, payouts), canWriteSubTab(opsManager, payouts)]).toEqual([
      true,
      false,
    ])
  })
})

describe('canWriteSubTab CAN return false — which nothing could make it do before D17', () => {
  /**
   * The bare statement of the defect. `permissions.ts:77-80` read
   * `if (row.permission === null) return true`, and all 35 rows carried `null`.
   */
  it('returns false for a real row and a real operator who lacks its write key', () => {
    const support = asRole('Support')
    /* Support holds `view_support` and not `approve_drivers` — the D17 narrowing
       that moved suspension authority to Trust & Safety (§13.1 R5 applied). */
    expect(isSubTabVisible(support, row('support-safety'))).toBe(true)
    expect(canWriteSubTab(support, row('support-safety'))).toBe(false)
  })

  it('returns true for the same row and the operator who does hold it', () => {
    const trustAndSafety = asRole('Trust & Safety')
    expect(canWriteSubTab(trustAndSafety, row('support-safety'))).toBe(true)
  })

  /**
   * **The `null` case, inverted from the old behaviour.** A row with no write
   * key has nothing to write, and returning `true` there is the same
   * open-by-default that produced the defect.
   */
  it('returns false for a row that declares no write key at all, even for the Owner', () => {
    const owner = asRole('Owner')
    for (const id of ['management-overview', 'operations-overview', 'admin-activity']) {
      expect(canWriteSubTab(owner, row(id)), id).toBe(false)
      /* …and it is NOT a refusal: there is no permission to name, so no
         disabled control is rendered with a reason. */
      expect(writeRefusalPermission(owner, row(id)), id).toBeNull()
    }
  })

  it('is not simply always false: the Owner writes every row that declares a write key', () => {
    const owner = asRole('Owner')
    const writable = table.subTabs.filter((r) => r.writePermission !== null)
    /* 29 after D1b: splitting Trips in two produced a second row carrying
       `live_ops`. The literal is kept rather than derived from the table,
       because a count asserted against the thing it counts asserts nothing. */
    expect(writable.length).toBe(30)
    for (const r of writable) expect(canWriteSubTab(owner, r), r.subTabId).toBe(true)
  })
})

/* ════════════════════════════════════════════════════════════════════════
   D17's acceptance criteria
   ════════════════════════════════════════════════════════════════════════ */

describe('AC-914 — the Dispatcher sees Operations and a one-row Admin', () => {
  const dispatcher = () => asRole('Dispatcher')

  it('renders exactly one workspace tile plus the pinned Admin tile', () => {
    const tiles = visibleWorkspaces(dispatcher(), table.workspaces, table.subTabs)
    expect(tiles.map((w) => w.id)).toEqual(['operations', 'admin'])
    expect(tiles.at(-1)?.pinnedToBottom).toBe(true)
  })

  it("renders only the Activity Log in Admin's sub-tab list", () => {
    const rows = visibleSubTabs(dispatcher(), table.subTabs, 'admin')
    expect(rows.map((r) => r.subTabId)).toEqual(['admin-activity'])
  })

  it('is not a blanket denial: the Owner sees all five tiles and all seven Admin rows', () => {
    const owner = asRole('Owner')
    expect(visibleWorkspaces(owner, table.workspaces, table.subTabs)).toHaveLength(5)
    expect(visibleSubTabs(owner, table.subTabs, 'admin')).toHaveLength(7)
  })
})

/* D1b split Trips in two, so the Dispatcher's Operations count is 10 and both
   halves of the old Trips row are writable — six, not five. */
describe('AC-915 — the Dispatcher gets eleven Operations rows, seven writable', () => {
  const dispatcher = () => asRole('Dispatcher')

  it('lists eleven sub-tab rows', () => {
    expect(visibleSubTabs(dispatcher(), table.subTabs, 'operations')).toHaveLength(11)
  })

  it('enables the write actions on Dispatch, both Requests queues, Trips, Assurance and My Work', () => {
    const enabled = [
      'dispatch',
      /* Requests split by channel — two rows now, both `live_ops`. */
      'ride-requests',
      'subscription-requests',
      'quick-rides',
      'subscription-trips',
      'assurance',
      'my-work',
    ].map((id) => `operations-${id}`)
    for (const id of enabled) expect(canWriteSubTab(dispatcher(), row(id)), id).toBe(true)
  })

  it('disables them on Subscriptions, Corporate Accounts and People, naming the permission', () => {
    const denied: Array<[string, PermissionKey]> = [
      ['operations-subscriptions', 'manage_subscriptions'],
      ['operations-corporate', 'manage_subscriptions'],
      ['operations-people', 'approve_drivers'],
    ]
    for (const [id, key] of denied) {
      expect(canWriteSubTab(dispatcher(), row(id)), id).toBe(false)
      expect(writeRefusalPermission(dispatcher(), row(id)), id).toBe(key)
    }
  })
})

describe('AC-916 — Trust & Safety suspends, and cannot reach Financials at all', () => {
  const ts = () => asRole('Trust & Safety')

  it('enables the suspension write on Operations › People and on Safety & Incidents', () => {
    expect(canWriteSubTab(ts(), row('operations-people'))).toBe(true)
    expect(canWriteSubTab(ts(), row('support-safety'))).toBe(true)
  })

  it('renders no Financials tile, so every control on it is unreachable', () => {
    const tiles = visibleWorkspaces(ts(), table.workspaces, table.subTabs).map((w) => w.id)
    expect(tiles).not.toContain('financials')
    expect(visibleSubTabs(ts(), table.subTabs, 'financials')).toHaveLength(0)
  })

  it('is a permission answer and not a hard-coded one: Finance does see the tile', () => {
    const tiles = visibleWorkspaces(asRole('Finance'), table.workspaces, table.subTabs).map((w) => w.id)
    expect(tiles).toContain('financials')
  })
})

describe('AC-917 — Support is refused the suspension, by name', () => {
  it('returns approve_drivers as the key the disabled control must name', () => {
    /* The copy is `You need the “{permission}” permission. {granter} can grant
       it.` — rendered from `perm.label.approve_drivers`, as a quoted label and
       never as the bare key. This function supplies the key; the dictionary
       supplies the sentence. */
    expect(writeRefusalPermission(asRole('Support'), row('support-safety'))).toBe('approve_drivers')
  })

  it('returns null for Trust & Safety on the same control', () => {
    expect(writeRefusalPermission(asRole('Trust & Safety'), row('support-safety'))).toBeNull()
  })
})

describe('AC-918 — /financials/payouts as Support is forbidden, not redirected', () => {
  it('names view_finance as the permission the forbidden state must render', () => {
    expect(forbiddenReason(asRole('Support'), row('financials-payouts'))).toBe('view_finance')
  })

  it('returns null for Finance on the same route, so the guard is a pass-through', () => {
    expect(forbiddenReason(asRole('Finance'), row('financials-payouts'))).toBeNull()
  })

  it('returns null for an unresolved route — not-found is a different state', () => {
    expect(forbiddenReason(asRole('Support'), null)).toBeNull()
  })
})

describe('AC-920 — the Activity Log opens for every role', () => {
  it('renders for all six, including the one that sees a single workspace', () => {
    for (const role of Object.keys(ROLE_PERMISSIONS) as RoleName[]) {
      expect(isSubTabVisible(asRole(role), row('admin-activity')), role).toBe(true)
      expect(forbiddenReason(asRole(role), row('admin-activity')), role).toBeNull()
    }
  })

  it('opens for an operator holding literally nothing, which is what "no view key" means', () => {
    expect(isSubTabVisible(ctx([]), row('admin-activity'))).toBe(true)
    /* …and that is the ONLY row for which that is true. */
    const open = table.subTabs.filter((r) => isSubTabVisible(ctx([]), r))
    expect(open.map((r) => r.subTabId)).toEqual(['admin-activity'])
  })
})

/* ════════════════════════════════════════════════════════════════════════
   The eight deliberate deviations from §10.3, asserted as decisions
   ════════════════════════════════════════════════════════════════════════ */

describe("D17's eight named deviations from §10.3 — decisions, not drift", () => {
  type Cell = [role: RoleName, subTabId: string, visible: boolean, writable: boolean]

  const cells: Cell[] = [
    /* Six widenings — `○` or `◐` becoming more open. */
    ['Ops Manager', 'financials-payouts', true, false],
    ['Ops Manager', 'financials-ledger', true, false],
    ['Ops Manager', 'admin-workspace', true, false],
    ['Finance', 'management-zones', true, false],
    ['Finance', 'management-growth', true, true],
    ['Support', 'operations-corporate', true, false],
    /* Two narrowings, plus the third the ruling records in the same table. */
    ['Finance', 'admin-data', false, false],
    ['Support', 'support-safety', true, false],
    ['Support', 'financials-rider-wallets', false, false],
  ]

  it.each(cells)('%s × %s renders=%s writes=%s', (role, subTabId, visible, writable) => {
    const gate = asRole(role)
    expect(isSubTabVisible(gate, row(subTabId))).toBe(visible)
    expect(canWriteSubTab(gate, row(subTabId))).toBe(writable)
  })

  it('covers every one of the eight cells the ruling names', () => {
    /* Anti-vacuity: if someone trims the table above, this fails rather than
       quietly testing less. Nine rows — the eight deviations plus Rider
       Wallets, which the ruling lists in the same table. */
    expect(cells).toHaveLength(9)
  })
})

/* ════════════════════════════════════════════════════════════════════════
   The predicates, unit level
   ════════════════════════════════════════════════════════════════════════ */

describe('holdsPermission', () => {
  it('passes a null requirement — admin-activity and three of four shell layers', () => {
    expect(holdsPermission(ctx([]), null)).toBe(true)
  })

  it('denies a key the operator does not hold', () => {
    expect(holdsPermission(ctx(['view_finance']), 'manage_team')).toBe(false)
  })

  it('grants a key the operator holds', () => {
    expect(holdsPermission(ctx(['manage_team']), 'manage_team')).toBe(true)
  })
})

describe('AC-58 — a sub-tab the role cannot see does not render a row', () => {
  it('filters the row out of its workspace column', () => {
    const visible = visibleSubTabs(asRole('Dispatcher'), table.subTabs, 'admin')
    expect(visible.map((r) => r.subTabId)).not.toContain('admin-team')
  })

  it('keeps the rest of the workspace intact — one denial is not a blackout', () => {
    /* Ops Manager holds `view_admin` and not `manage_team`, so Admin loses
       exactly one row of seven. */
    const visible = visibleSubTabs(asRole('Ops Manager'), table.subTabs, 'admin')
    expect(visible).toHaveLength(6)
    expect(visible.map((r) => r.subTabId)).not.toContain('admin-team')
  })

  it('returns rows in display order, so the column never reorders itself', () => {
    const visible = visibleSubTabs(asRole('Owner'), table.subTabs, 'operations')
    expect(visible.map((r) => r.order)).toEqual([...visible.map((r) => r.order)].sort((a, b) => a - b))
  })

  it('honours a derived subTabPermissions entry over the row default', () => {
    const target = firstOf('support')
    const denied = ctx([], { [target.subTabId]: ['manage_tickets'] })
    expect(isSubTabVisible(denied, target)).toBe(false)
    const allowed = ctx(['manage_tickets'], { [target.subTabId]: ['manage_tickets'] })
    expect(isSubTabVisible(allowed, target)).toBe(true)
  })

  it('treats an EMPTY derived entry as "the server did not gate this"', () => {
    /* §8.2: `[]` = ungated, absent = the server did not say. Both fall through
       to the row, which is what makes `admin-activity`'s `[]` correct. */
    expect(isSubTabVisible(ctx([], { 'admin-activity': [] }), row('admin-activity'))).toBe(true)
    expect(isSubTabVisible(ctx([], { 'financials-payouts': [] }), row('financials-payouts'))).toBe(false)
  })
})

describe('AC-57 — a workspace with no visible sub-tab renders no rail tile', () => {
  it('drops the tile only when EVERY row in it is hidden', () => {
    const support = asRole('Support')
    expect(visibleWorkspaces(support, table.workspaces, table.subTabs).map((w) => w.id)).toEqual([
      'operations',
      'support',
      'admin',
    ])
  })

  it('keeps the tile when ONE row survives — §3.1: the column stays full width', () => {
    /* Admin, for Support: only the Activity Log renders, and the tile stays. */
    expect(visibleSubTabs(asRole('Support'), table.subTabs, 'admin').map((r) => r.subTabId)).toEqual([
      'admin-activity',
    ])
  })

  it('returns tiles in rail order, with the pinned one last', () => {
    const order = visibleWorkspaces(asRole('Owner'), table.workspaces, table.subTabs)
    expect(order.map((w) => w.order)).toEqual([1, 2, 3, 4, 5])
    expect(order.at(-1)?.pinnedToBottom).toBe(true)
  })
})

/* ════════════════════════════════════════════════════════════════════════
   AC-921 / AC-924 — the delta, and the preview that must agree with the gate
   ════════════════════════════════════════════════════════════════════════ */

describe('AC-921 — a per-user override is a signed delta against a named role', () => {
  it('makes the Ledger escrow control enabled for a Support operator granted release_escrow', () => {
    const granted = effectivePermissions('Support', {
      role: 'Support',
      granted: ['view_finance', 'release_escrow'],
      revoked: [],
    })
    const gate = ctx([...granted])
    expect(isSubTabVisible(gate, row('financials-ledger'))).toBe(true)
    expect(canWriteSubTab(gate, row('financials-ledger'))).toBe(true)
  })

  it('leaves the un-granted Support operator refused on the same control', () => {
    expect(canWriteSubTab(asRole('Support'), row('financials-ledger'))).toBe(false)
  })

  it('applies a revoke, and does not flatten the delta into the baseline', () => {
    const reduced = effectivePermissions('Support', {
      role: 'Support',
      granted: [],
      revoked: ['contact_users'],
    })
    expect(reduced).not.toContain('contact_users')
    expect(reduced).toContain('manage_tickets')
    /* The baseline itself is untouched — a delta is applied, never merged in. */
    expect(ROLE_PERMISSIONS.Support).toContain('contact_users')
  })

  it('ignores a delta signed against a different role, so an exception dies with a demotion', () => {
    const stale = effectivePermissions('Support', {
      role: 'Finance',
      granted: ['release_escrow'],
      revoked: [],
    })
    expect(stale).toEqual([...ROLE_PERMISSIONS.Support])
  })
})

describe('AC-924 — the effective-permission preview and the gate read the same keys', () => {
  it('resolves each role to exactly the keys the gate allows or denies on', () => {
    for (const role of Object.keys(ROLE_PERMISSIONS) as RoleName[]) {
      const preview = effectivePermissions(role)
      const gate = ctx(preview)
      for (const r of table.subTabs) {
        expect(isSubTabVisible(gate, r), `${role} × ${r.subTabId}`).toBe(
          r.viewPermission === null || preview.includes(r.viewPermission),
        )
        expect(canWriteSubTab(gate, r), `${role} × ${r.subTabId}`).toBe(
          r.writePermission !== null && preview.includes(r.writePermission),
        )
      }
    }
  })
})

describe('the role table itself', () => {
  it('gives every role a non-empty baseline — the legacy returned [] and stranded new hires', () => {
    for (const role of Object.keys(ROLE_PERMISSIONS) as RoleName[]) {
      expect(ROLE_PERMISSIONS[role].length, role).toBeGreaterThan(0)
    }
  })

  it('keeps manage_security_policy Owner-only — it decides how people authenticate', () => {
    const holders = (Object.keys(ROLE_PERMISSIONS) as RoleName[]).filter((r) =>
      ROLE_PERMISSIONS[r].includes('manage_security_policy'),
    )
    expect(holders).toEqual(['Owner'])
  })

  it('matches D17 on the size of each baseline', () => {
    expect(ROLE_PERMISSIONS.Owner).toHaveLength(20)
    expect(ROLE_PERMISSIONS['Ops Manager']).toHaveLength(13)
    expect(ROLE_PERMISSIONS.Dispatcher).toHaveLength(4)
    expect(ROLE_PERMISSIONS['Trust & Safety']).toHaveLength(7)
    expect(ROLE_PERMISSIONS.Finance).toHaveLength(7)
    expect(ROLE_PERMISSIONS.Support).toHaveLength(5)
  })
})
