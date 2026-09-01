/**
 * **`CommandSession`, built once — the Q4 seam's other end.**
 *
 * `registry.ts` routes every role question through `roleRefusal`, which reads
 * exactly one field: `session.canWrite`. **Building that field is the part
 * nobody owned.** `PeopleScreen.tsx:105` computes it as
 * `shell.permissions.permissions.includes('approve_drivers')`, inline, and the
 * palette needed the same boolean — so without this file the permission name
 * would be written in two places and the two would eventually disagree, which
 * is the four-way duplication D9 exists to remove, reappearing one layer down.
 *
 * **CQ-7 / Q4 is still open**, and this is deliberately not a permission
 * engine. `permission: null` on all 35 route-table rows and
 * `session.subTabPermissions` is `{}`; there is nothing to evaluate. What
 * exists is one legacy permission key standing in for "may write", and naming
 * it here means that when **D17's** twenty keys land, the change is this
 * function's body plus a field on `CommandSession` — not a sweep through six
 * domain registries and every screen that computes a boolean.
 *
 * Raised in the handoff: `PeopleScreen` should call this rather than inline the
 * same expression. It is a screen file this task does not own.
 */

import type { PermissionKey } from '@/data/types'
import type { CommandSession } from './registry'

/**
 * The single permission `canWrite` stands for today, and the one
 * `captains.ts` names to `roleRefusal`. **One key, because there is one
 * boolean** — the moment there are twenty, this becomes the set and
 * `roleRefusal` starts asking it questions.
 */
export const COMMAND_WRITE_PERMISSION: PermissionKey = 'approve_drivers'

export function commandSession(permissions: readonly PermissionKey[]): CommandSession {
  return { canWrite: permissions.includes(COMMAND_WRITE_PERMISSION) }
}
