/**
 * The mock roster and the custom-role table, read by both `team.ts` and
 * `session.ts`, so a change made on Team & Access is what the next session
 * resolves (D17, AC-921). `TeamUser.permissions` is kept equal to the
 * effective set, so the F-016 guard reads the same answer the session carries.
 */

import { fixturesLoaded, onFixturesLoaded, type Fixtures } from '../mock/fixtures'
import type { PermissionKey } from '../types/navigation'
import type { Role } from '../types/rbac'
import type { TeamInvite } from '../types/team'
import { EYVAR_NOW, offsetFromNow } from '../mock/clock'
import {
  ROLE_PERMISSIONS,
  effectivePermissions,
  isBuiltInRole,
  type RoleId,
  type RoleName,
  type TeamUser,
} from '../types/session'

let teamUserFixtures!: Fixtures['teamUserFixtures']
let roster: TeamUser[] = []
let customRoles: Role[] = []
let invites: TeamInvite[] = []

onFixturesLoaded((f) => {
  teamUserFixtures = f.teamUserFixtures
  roster = seed()
  invites = seedInvites()
})

/* `USR-4` is the one seeded `Invited` row; its token is the auth fixture's
   `invite`, so the activation screen and this store agree on one link. */
function seedInvites(): TeamInvite[] {
  return teamUserFixtures
    .filter((u) => u.status === 'Invited')
    .map((u) => ({
      userId: u.id,
      email: u.email,
      token: 'invite',
      sentAt: offsetFromNow({ days: -6 }),
      expiresAt: offsetFromNow({ days: 1 }),
      resendCount: 0,
    }))
}

function seed(): TeamUser[] {
  return teamUserFixtures.map((u) => withEffective({ ...u }))
}

/** Back to the seed and to no custom roles. Called by `resetTeam`. */
export function resetRosterStore(): void {
  if (!fixturesLoaded()) return
  roster = seed()
  customRoles = []
  invites = seedInvites()
}

export function getRoster(): TeamUser[] {
  return roster
}

export function setRoster(next: TeamUser[]): void {
  roster = next
}

export function findOperator(id: string): TeamUser | undefined {
  return roster.find((u) => u.id === id)
}

export function customRoleList(): Role[] {
  return customRoles
}

export function setCustomRoles(next: Role[]): void {
  customRoles = next
}

/** The role's baseline, built-in or custom; `null` for a role nobody defined. */
export function baselineFor(role: RoleId): readonly PermissionKey[] | null {
  if (isBuiltInRole(role)) return ROLE_PERMISSIONS[role]
  return customRoles.find((r) => r.name === role)?.permissions ?? null
}

/** The built-in whose landing route and onboarding track a role inherits. */
export function trackRoleFor(role: RoleId): RoleName | null {
  if (isBuiltInRole(role)) return role
  return customRoles.find((r) => r.name === role)?.basedOn ?? null
}

/** Baseline plus signed delta, resolved (D17). */
export function resolvePermissions(user: Pick<TeamUser, 'role' | 'permissionDelta'>): PermissionKey[] {
  return effectivePermissions(user.role, user.permissionDelta, baselineFor(user.role) ?? [])
}

/** The same record with `permissions` recomputed from role and delta. */
export function withEffective(user: TeamUser): TeamUser {
  return { ...user, permissions: resolvePermissions(user) }
}

export function getInvites(): TeamInvite[] {
  return invites
}

export function setInvites(next: TeamInvite[]): void {
  invites = next
}

export function findInviteByToken(token: string): TeamInvite | undefined {
  return invites.find((i) => i.token === token)
}

/** Past `expiresAt` against the fixed clock. */
export function inviteExpired(invite: TeamInvite): boolean {
  return Date.parse(invite.expiresAt) < Date.parse(EYVAR_NOW)
}
