/**
 * Roles, overrides and role changes (D17, D20): AC-921 to AC-924, TA-3, TA-4.
 * Refusals are built from state the test controls, and each has a positive twin.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { disableMockLatency, mockFailures } from '../config'
import { ROLE_PERMISSIONS, isBuiltInRole } from '../types/session'
import { isApiError, type ApiError } from '../types/common'
import { auditLogSize, listAuditEntries, resetAudit } from './audit'
import { changeRole, createRole, deleteRole, holdersOf, listRoles, setPermissionDelta, updateRole } from './rbac'
import { getOperator, listOperators, resetTeam, useTwoManageTeamHolders } from './team'
import { getSession, resetMockSession, switchMockUser } from './session'
import { getOnboarding } from './onboarding'
import { getNotificationSummary, listNotifications, resetNotifications } from './notifications'

beforeEach(() => {
  disableMockLatency()
  mockFailures.clear()
  resetTeam()
  resetAudit()
  resetMockSession()
})

async function refusalOf(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise
  } catch (thrown) {
    if (isApiError(thrown)) return thrown
    throw thrown
  }
  throw new Error('expected a refusal')
}

describe('the roles table', () => {
  it('lists the six built-ins first, each fixed, with the seeded holder counts', async () => {
    const roles = await listRoles()
    expect(roles.slice(0, 6).map((r) => r.name)).toEqual([
      'Owner',
      'Ops Manager',
      'Dispatcher',
      'Trust & Safety',
      'Finance',
      'Support',
    ])
    expect(roles.every((r) => r.builtIn)).toBe(true)
    expect(roles.find((r) => r.name === 'Support')?.holders).toBe(2)
    expect(roles.find((r) => r.name === 'Dispatcher')?.holders).toBe(1)
  })

  it('refuses to edit or delete a built-in, and says which rule', async () => {
    expect((await refusalOf(updateRole('Support', ['view_support']))).code).toBe('role_built_in')
    expect((await refusalOf(deleteRole('Support'))).code).toBe('role_built_in')
  })
})

describe('TA-4 — a custom role is created from a built-in and lives like one', () => {
  it('creates, grants, invites into, refuses deletion while held, and deletes once free', async () => {
    const created = await createRole({
      name: 'Night dispatcher',
      basedOn: 'Dispatcher',
      permissions: [...ROLE_PERMISSIONS.Dispatcher, 'manage_subscriptions'],
    })
    expect(created.builtIn).toBe(false)
    expect(isBuiltInRole(created.name)).toBe(false)
    expect(created.permissions).toContain('manage_subscriptions')
    expect((await listRoles()).map((r) => r.name)).toContain('Night dispatcher')

    /* A holder arrives through a role change; the role now has one. */
    await useTwoManageTeamHolders()
    const moved = await changeRole('USR-6', 'Night dispatcher', 'covering nights')
    expect(moved.role).toBe('Night dispatcher')
    expect(moved.permissions).toContain('manage_subscriptions')
    expect(moved.permissions).toContain('live_ops')
    expect((await listRoles()).find((r) => r.name === 'Night dispatcher')?.holders).toBe(1)

    const held = await refusalOf(deleteRole('Night dispatcher'))
    expect(held.code).toBe('role_has_holders')
    expect(held.message).toContain('1')

    /* Editing the role moves its holder's effective set with it. */
    await updateRole('Night dispatcher', [...ROLE_PERMISSIONS.Dispatcher])
    expect((await getOperator('USR-6')).permissions).not.toContain('manage_subscriptions')

    await changeRole('USR-6', 'Dispatcher', 'back to days')
    await expect(deleteRole('Night dispatcher')).resolves.toEqual({ deleted: true })
    expect((await listRoles()).map((r) => r.name)).not.toContain('Night dispatcher')
  })

  it('refuses an empty or duplicate name', async () => {
    expect((await refusalOf(createRole({ name: '  ', basedOn: 'Support', permissions: [] }))).code).toBe(
      'role_name_empty',
    )
    expect((await refusalOf(createRole({ name: 'support', basedOn: 'Support', permissions: [] }))).code).toBe(
      'role_name_taken',
    )
  })

  it('lands and onboards a custom-role holder as the built-in it came from', async () => {
    await createRole({ name: 'Night dispatcher', basedOn: 'Dispatcher', permissions: [...ROLE_PERMISSIONS.Dispatcher] })
    await changeRole('USR-6', 'Night dispatcher', 'nights')
    await switchMockUser('USR-6')
    const session = await getSession()
    expect(session.role).toBe('Night dispatcher')
    expect(session.landingRoute).toBe('/operations/dispatch')
    const checklist = await getOnboarding('USR-6')
    expect(checklist.steps.map((s) => s.id)).toContain('ops.requests')
  })
})

describe('AC-921 — an override is a signed delta, and the session resolves it', () => {
  it('grants release_escrow to Support, and the next session carries it without flattening', async () => {
    const updated = await setPermissionDelta('USR-3', { granted: ['view_finance', 'release_escrow'], revoked: [] })
    expect(updated.permissionDelta).toEqual({
      role: 'Support',
      granted: ['view_finance', 'release_escrow'],
      revoked: [],
    })
    expect(updated.permissions).toContain('release_escrow')
    /* The baseline itself is untouched: the delta is applied, never merged in. */
    expect(ROLE_PERMISSIONS.Support).not.toContain('release_escrow')

    await switchMockUser('USR-3')
    expect((await getSession()).permissions).toContain('release_escrow')
  })

  it('drops a granted key the role already holds and a revoked key it never held', async () => {
    const updated = await setPermissionDelta('USR-3', {
      granted: ['manage_tickets'],
      revoked: ['process_payouts'],
    })
    expect(updated.permissionDelta).toBeNull()
  })

  it('applies a revoke against the baseline', async () => {
    const updated = await setPermissionDelta('USR-3', { granted: [], revoked: ['contact_users'] })
    expect(updated.permissions).not.toContain('contact_users')
    expect(updated.permissions).toContain('manage_tickets')
  })
})

describe('AC-922 / TA-3 — the F-016 guard covers overrides and role changes', () => {
  it('refuses revoking manage_team from its last holder, and leaves the roster untouched', async () => {
    const before = (await listOperators({ pageSize: 100 })).items
    const refusal = await refusalOf(setPermissionDelta('USR-1', { granted: [], revoked: ['manage_team'] }))
    expect(refusal.code).toBe('last_manage_team_holder')
    expect((await listOperators({ pageSize: 100 })).items).toStrictEqual(before)
    expect(auditLogSize()).toBe(0)
  })

  it('refuses moving the last holder to a role without manage_team, and allows it with a second holder', async () => {
    expect((await refusalOf(changeRole('USR-1', 'Finance', 'stepping back'))).code).toBe(
      'last_manage_team_holder',
    )
    useTwoManageTeamHolders()
    const moved = await changeRole('USR-1', 'Finance', 'stepping back')
    expect(moved.role).toBe('Finance')
    expect(moved.permissionDelta).toBeNull()
    expect(moved.permissions).toEqual([...ROLE_PERMISSIONS.Finance])
  })

  it('refuses a role nobody defined', async () => {
    expect((await refusalOf(changeRole('USR-3', 'Wizard', 'why not'))).code).toBe('role_unknown')
  })
})

describe('AC-923 — every write audits both states', () => {
  it('records a role change naming the operator, the old role and the new one', async () => {
    await changeRole('USR-3', 'Dispatcher', 'moved to the night shift')
    const entry = (await listAuditEntries({ page: 1, pageSize: 1 })).items[0]
    expect(entry?.action).toBe('team.roleChange')
    expect(entry?.subjectId).toBe('USR-3')
    expect(entry?.note).toBe('moved to the night shift')
    expect(entry?.detail.params).toMatchObject({ name: 'Lina Al-Otaibi', from: 'Support', to: 'Dispatcher' })
  })

  it('records an override change with the counts before and after', async () => {
    await setPermissionDelta('USR-3', { granted: ['view_finance'], revoked: [] })
    await setPermissionDelta('USR-3', { granted: ['view_finance', 'release_escrow'], revoked: ['contact_users'] })
    const entry = (await listAuditEntries({ page: 1, pageSize: 1 })).items[0]
    expect(entry?.action).toBe('team.permissions')
    expect(entry?.detail.params).toMatchObject({ granted: 2, revoked: 1, wasGranted: 1, wasRevoked: 0 })
  })

  it('records create, update and delete of a custom role', async () => {
    await createRole({ name: 'Auditor', basedOn: 'Finance', permissions: ['view_finance', 'view_analytics'] })
    await updateRole('Auditor', ['view_finance'])
    await deleteRole('Auditor')
    const actions = (await listAuditEntries({ page: 1, pageSize: 3 })).items.map((e) => e.action)
    expect(actions).toEqual(['role.delete', 'role.update', 'role.create'])
  })
})

describe('T8.2 — who can do this?', () => {
  it('lists every holder of a key, and says whether the role or an override gave it', async () => {
    await setPermissionDelta('USR-3', { granted: ['release_escrow'], revoked: [] })
    const holders = await holdersOf('release_escrow')
    const byId = Object.fromEntries(holders.map((h) => [h.user.id, h.via]))
    expect(byId['USR-1']).toBe('baseline')
    expect(byId['USR-2']).toBe('baseline')
    expect(byId['USR-3']).toBe('granted')
    expect(byId['USR-5']).toBeUndefined()
  })
})

/* ─────────────────────── T6.5: team events reach the bell ─────────────── */

describe('T6.5 — a team event reaches the bell as a key, not an assembled sentence', () => {
  it('adds one unread team notification on a role change, carrying the key and params', async () => {
    resetNotifications()
    const before = await getNotificationSummary()

    await changeRole('USR-5', 'Dispatcher', 'night shift')

    const after = await getNotificationSummary()
    expect(after.total).toBe(before.total + 1)
    expect(after.unread).toBe(before.unread + 1)

    const team = await listNotifications({ filter: 'team', pageSize: 10 })
    expect(team.items[0]?.titleText).toEqual({
      key: 'admin.notification.team.roleChanged',
      params: { name: 'Yousef Al-Balawi', role: 'Dispatcher' },
    })
    /* No English in the data layer: the sentence is the dictionary's. */
    expect(team.items[0]?.title).toBe('')
    expect(team.items[0]?.route).toBe('/admin/team')
  })
})
