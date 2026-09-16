/**
 * Effective-permission resolution by user id, not session — needed because a
 * cron evaluates a rule "as its owner" and checks a recipient's permission
 * at delivery time (D43), without either being the signed-in caller. D17's
 * rule: baseline `role_permissions` union signed grants, minus revokes. */
import type { PermissionKey } from '@/data/types/navigation'
import type { Database } from './db'

export interface OperatorPermissions {
  userId: string
  roleId: string
  status: string
  permissions: PermissionKey[]
}

interface PermissionRow {
  role_id: string
  status: string
  permission_granted: string[] | null
  permission_revoked: string[] | null
  baseline: (string | null)[]
}

/** `null` when the user id does not exist. A `Suspended`/`Invited` user comes back with `status` set so a caller can treat them as not live, same as `DbSessionStore`. */
export async function loadOperatorPermissions(db: Database, userId: string): Promise<OperatorPermissions | null> {
  const rows = await db.sql<PermissionRow>`
    SELECT u.role_id, u.status,
           COALESCE(u.permission_granted, ARRAY[]::text[]) AS permission_granted,
           COALESCE(u.permission_revoked, ARRAY[]::text[]) AS permission_revoked,
           array_remove(array_agg(rp.permission_key), NULL) AS baseline
    FROM users u
    LEFT JOIN role_permissions rp ON rp.role_id = u.role_id
    WHERE u.id = ${userId}
    GROUP BY u.id, u.role_id, u.status, u.permission_granted, u.permission_revoked
  `
  const row = rows[0]
  if (!row) return null

  const baseline = row.baseline.filter((p): p is string => p !== null) as PermissionKey[]
  const revoked = new Set(row.permission_revoked ?? [])
  const permissions = baseline.filter((key) => !revoked.has(key))
  for (const key of (row.permission_granted ?? []) as PermissionKey[]) {
    if (!revoked.has(key) && !permissions.includes(key)) permissions.push(key)
  }
  return { userId, roleId: row.role_id, status: row.status, permissions }
}

/** Live (Active) and holding `permissionKey` — `null` permissionKey means the measure is ungated (D4), which is always true. */
export function holdsPermission(operator: OperatorPermissions | null, permissionKey: PermissionKey | null): boolean {
  if (!operator || operator.status !== 'Active') return false
  if (permissionKey === null) return true
  return operator.permissions.includes(permissionKey)
}
