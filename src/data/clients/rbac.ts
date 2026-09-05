/**
 * Roles, per-operator overrides and role changes (D17, D20). Every write audits
 * both states (AC-923); the F-016 guard covers overrides and role changes
 * (AC-922); a built-in role is fixed and a custom one is deleted only unheld.
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { EYVAR_NOW } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import { ApiError } from '../types/common'
import type { PermissionKey } from '../types/navigation'
import type { PermissionDeltaInput, PermissionHolder, RbacGuardCode, Role, RoleInput } from '../types/rbac'
import { ROLE_NAMES, ROLE_PERMISSIONS, isBuiltInRole, type PermissionDelta, type RoleId, type TeamUser } from '../types/session'
import { manageTeamGuard, type TeamGuardCode } from '../types/team'
import { appendAudit } from './audit'
import { http } from './http'
import {
  baselineFor,
  customRoleList,
  findOperator,
  getRoster,
  resolvePermissions,
  setCustomRoles,
  setRoster,
  withEffective,
} from './rosterStore'
import { currentMockUserId } from './session'
import { notifyTeam } from './notifications'

export const RBAC_OPERATIONS = {
  roles: 'rbac.roles',
  createRole: 'rbac.createRole',
  updateRole: 'rbac.updateRole',
  deleteRole: 'rbac.deleteRole',
  holders: 'rbac.holders',
  setDelta: 'team.setDelta',
  changeRole: 'team.changeRole',
} as const

registerOperations(...Object.values(RBAC_OPERATIONS))

function refuse(code: RbacGuardCode | TeamGuardCode, message: string): ApiError {
  return new ApiError({ status: 409, kind: 'conflict', code, message, retryable: false })
}

const LAST_HOLDER_MESSAGE =
  'Refused: this is the last active operator holding `manage_team`. ' +
  'The last holder cannot be stripped of it, suspended or removed (F-016).'

function holderCount(role: RoleId): number {
  return getRoster().filter((u) => u.role === role).length
}

function builtInRoles(): Role[] {
  return ROLE_NAMES.map((name) => ({
    name,
    builtIn: true,
    basedOn: null,
    permissions: [...ROLE_PERMISSIONS[name]],
    holders: holderCount(name),
    createdAt: null,
    createdBy: null,
  }))
}

/** Built-ins in authority order, then custom roles in creation order. */
function allRoles(): Role[] {
  return [
    ...builtInRoles(),
    ...customRoleList().map((r) => ({ ...r, permissions: [...r.permissions], holders: holderCount(r.name) })),
  ]
}

/** The refusal the surface renders before a control, or `null`. Same predicate the client throws with. */
export function roleDeletionRefusal(role: Role): RbacGuardCode | null {
  if (role.builtIn) return 'role_built_in'
  return role.holders > 0 ? 'role_has_holders' : null
}

/* ─────────────────────────────── roles ─────────────────────────────────── */

/**
 * GET /api/v1/rbac/roles
 *   -> { items: Role[] }
 */
export async function listRoles(signal?: AbortSignal): Promise<Role[]> {
  if (DATA_SOURCE === 'http') {
    const res = await http.get<{ items: Role[] }>('/rbac/roles', undefined, { signal })
    return res.items
  }
  return mock(RBAC_OPERATIONS.roles, signal, () => allRoles())
}

/**
 * POST /api/v1/rbac/roles
 *   -> Role
 */
export async function createRole(input: RoleInput, signal?: AbortSignal): Promise<Role> {
  if (DATA_SOURCE === 'http') return http.post<Role>('/rbac/roles', input, { signal })
  return mockMutation(RBAC_OPERATIONS.createRole, signal, () => {
    const name = input.name.trim()
    if (name === '') throw refuse('role_name_empty', 'A role needs a name')
    if (allRoles().some((r) => r.name.toLowerCase() === name.toLowerCase())) {
      throw refuse('role_name_taken', `A role named ${name} already exists`)
    }
    const created: Role = {
      name,
      builtIn: false,
      basedOn: input.basedOn,
      permissions: dedupe(input.permissions),
      holders: 0,
      createdAt: EYVAR_NOW,
      createdBy: currentMockUserId(),
    }
    setCustomRoles([...customRoleList(), created])
    appendAudit({
      action: 'role.create',
      subjectType: 'role',
      subjectId: created.name,
      amountHalalas: null,
      reasonCode: null,
      note: null,
      detail: {
        key: 'admin.audit.role.created',
        params: { name: created.name, basedOn: created.basedOn ?? '', count: created.permissions.length },
      },
    })
    return { ...created }
  })
}

/**
 * PUT /api/v1/rbac/roles/:name
 *   -> Role
 *
 * Custom roles only; a built-in is fixed.
 */
export async function updateRole(
  name: RoleId,
  permissions: readonly PermissionKey[],
  signal?: AbortSignal,
): Promise<Role> {
  if (DATA_SOURCE === 'http') {
    return http.put<Role>(`/rbac/roles/${encodeURIComponent(name)}`, { permissions }, { signal })
  }
  return mockMutation(RBAC_OPERATIONS.updateRole, signal, () => {
    if (isBuiltInRole(name)) throw refuse('role_built_in', `${name} is a built-in role and cannot be edited`)
    const existing = customRoleList().find((r) => r.name === name)
    if (!existing) throw notFound('role', name)
    const next = dedupe(permissions)
    const added = next.filter((k) => !existing.permissions.includes(k)).length
    const removed = existing.permissions.filter((k) => !next.includes(k)).length
    /* Every holder's effective set moves with the baseline (F-016 applies to each). */
    const roster = getRoster()
    for (const u of roster) {
      if (u.role !== name) continue
      const code = manageTeamGuard(roster, u.id, 'permissions', resolveWith(u, next))
      if (code !== null) throw refuse(code, LAST_HOLDER_MESSAGE)
    }
    const updated: Role = { ...existing, permissions: next }
    setCustomRoles(customRoleList().map((r) => (r.name === name ? updated : r)))
    setRoster(roster.map((u) => (u.role === name ? withEffective(u) : u)))
    appendAudit({
      action: 'role.update',
      subjectType: 'role',
      subjectId: name,
      amountHalalas: null,
      reasonCode: null,
      note: null,
      detail: { key: 'admin.audit.role.updated', params: { name, added, removed } },
    })
    return { ...updated, holders: holderCount(name) }
  })
}

/**
 * DELETE /api/v1/rbac/roles/:name
 *   -> { deleted: true }
 *
 * Refused while the role has holders.
 */
export async function deleteRole(name: RoleId, signal?: AbortSignal): Promise<{ deleted: true }> {
  if (DATA_SOURCE === 'http') {
    return http.delete<{ deleted: true }>(`/rbac/roles/${encodeURIComponent(name)}`, { signal })
  }
  return mockMutation(RBAC_OPERATIONS.deleteRole, signal, () => {
    if (isBuiltInRole(name)) throw refuse('role_built_in', `${name} is a built-in role and cannot be deleted`)
    const existing = customRoleList().find((r) => r.name === name)
    if (!existing) throw notFound('role', name)
    const holders = holderCount(name)
    if (holders > 0) throw refuse('role_has_holders', `${holders} operators still hold ${name}`)
    setCustomRoles(customRoleList().filter((r) => r.name !== name))
    appendAudit({
      action: 'role.delete',
      subjectType: 'role',
      subjectId: name,
      amountHalalas: null,
      reasonCode: null,
      note: null,
      detail: { key: 'admin.audit.role.deleted', params: { name } },
    })
    return { deleted: true }
  })
}

/* ─────────────────────── overrides and role changes ────────────────────── */

/**
 * PUT /api/v1/team/operators/:id/override
 *   -> TeamUser
 *
 * The delta is signed against the operator's current role. A granted key the
 * baseline already holds, or a revoked key it never held, is dropped rather
 * than stored: an override says only what differs from the role.
 */
export async function setPermissionDelta(
  userId: string,
  input: PermissionDeltaInput,
  signal?: AbortSignal,
): Promise<TeamUser> {
  if (DATA_SOURCE === 'http') {
    return http.put<TeamUser>(`/team/operators/${userId}/override`, input, { signal })
  }
  return mockMutation(RBAC_OPERATIONS.setDelta, signal, () => {
    const user = requireOperator(userId)
    const baseline = baselineFor(user.role) ?? []
    const granted = dedupe(input.granted).filter((k) => !baseline.includes(k))
    const revoked = dedupe(input.revoked).filter((k) => baseline.includes(k))
    const delta: PermissionDelta | null =
      granted.length === 0 && revoked.length === 0 ? null : { role: user.role, granted, revoked }
    const next = resolvePermissions({ role: user.role, permissionDelta: delta })
    const roster = getRoster()
    const code = manageTeamGuard(roster, userId, 'permissions', next)
    if (code !== null) throw refuse(code, LAST_HOLDER_MESSAGE)
    const was = user.permissionDelta ?? null
    const updated = withEffective({ ...user, permissionDelta: delta })
    setRoster(roster.map((u) => (u.id === userId ? updated : u)))
    appendAudit({
      action: 'team.permissions',
      subjectType: 'operator',
      subjectId: userId,
      amountHalalas: null,
      reasonCode: null,
      note: null,
      detail: {
        key: 'admin.audit.team.overrideChanged',
        params: {
          name: updated.name,
          granted: granted.length,
          revoked: revoked.length,
          wasGranted: was?.granted.length ?? 0,
          wasRevoked: was?.revoked.length ?? 0,
        },
      },
    })
    return updated
  })
}

/**
 * POST /api/v1/team/operators/:id/role
 *   -> TeamUser
 *
 * The override is cleared, not carried: a delta signed against the old role
 * is void against the new one (D17), so an exception dies with a demotion.
 */
export async function changeRole(
  userId: string,
  role: RoleId,
  reason: string,
  signal?: AbortSignal,
): Promise<TeamUser> {
  if (DATA_SOURCE === 'http') {
    return http.post<TeamUser>(`/team/operators/${userId}/role`, { role, reason }, { signal })
  }
  return mockMutation(RBAC_OPERATIONS.changeRole, signal, () => {
    const user = requireOperator(userId)
    const baseline = baselineFor(role)
    if (baseline === null) throw refuse('role_unknown', `No role named ${role}`)
    const roster = getRoster()
    const code = manageTeamGuard(roster, userId, 'role', baseline)
    if (code !== null) throw refuse(code, LAST_HOLDER_MESSAGE)
    const from = user.role
    const updated = withEffective({ ...user, role, permissionDelta: null })
    setRoster(roster.map((u) => (u.id === userId ? updated : u)))
    appendAudit({
      action: 'team.roleChange',
      subjectType: 'operator',
      subjectId: userId,
      amountHalalas: null,
      reasonCode: null,
      note: reason,
      detail: { key: 'admin.audit.team.roleChanged', params: { name: updated.name, from, to: role } },
    })
    notifyTeam('admin.notification.team.roleChanged', { name: updated.name, role }, userId)
    return updated
  })
}

/**
 * GET /api/v1/rbac/holders/:key
 *   -> { items: PermissionHolder[] }
 *
 * Who holds a permission, and how (T8.2).
 */
export async function holdersOf(key: PermissionKey, signal?: AbortSignal): Promise<PermissionHolder[]> {
  if (DATA_SOURCE === 'http') {
    const res = await http.get<{ items: PermissionHolder[] }>(`/rbac/holders/${key}`, undefined, { signal })
    return res.items
  }
  return mock(RBAC_OPERATIONS.holders, signal, () =>
    getRoster()
      .filter((u) => resolvePermissions(u).includes(key))
      .map((u) => ({ user: u, via: (baselineFor(u.role) ?? []).includes(key) ? 'baseline' : 'granted' })),
  )
}

/* ─────────────────────────────── helpers ──────────────────────────────── */

function requireOperator(userId: string): TeamUser {
  const found = findOperator(userId)
  if (!found) throw notFound('operator', userId)
  return found
}

function resolveWith(user: TeamUser, baseline: readonly PermissionKey[]): PermissionKey[] {
  const revoked = new Set(user.permissionDelta?.revoked ?? [])
  const out = baseline.filter((k) => !revoked.has(k))
  for (const k of user.permissionDelta?.granted ?? []) if (!revoked.has(k) && !out.includes(k)) out.push(k)
  return out
}

function dedupe(keys: readonly PermissionKey[]): PermissionKey[] {
  return [...new Set(keys)]
}
