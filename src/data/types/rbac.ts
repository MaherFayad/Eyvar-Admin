/**
 * Roles, overrides and holders (D17, D20). A built-in role is a
 * `ROLE_PERMISSIONS` row; a custom role is the same shape with `basedOn`,
 * which decides its landing route and onboarding track. An override is a
 * signed `PermissionDelta`, displayed as a delta and never flattened (AC-921).
 */

import type { IsoDateTime } from './common'
import type { PermissionKey } from './navigation'
import type { RoleId, RoleName, TeamUser } from './session'

export interface Role {
  name: RoleId
  builtIn: boolean
  /** Custom roles only: the built-in they were duplicated from. `null` on a built-in. */
  basedOn: RoleName | null
  permissions: PermissionKey[]
  /** Active, invited and suspended operators on the role; an offboarded one is gone. */
  holders: number
  createdAt: IsoDateTime | null
  createdBy: string | null
}

export interface RoleInput {
  name: string
  basedOn: RoleName
  permissions: PermissionKey[]
}

/** What the override dialog sends. The role is the operator's own; the client signs it. */
export interface PermissionDeltaInput {
  granted: PermissionKey[]
  revoked: PermissionKey[]
}

/** A refusal the rbac client raises as a code (§11.2: the surface renders the sentence). */
export type RbacGuardCode =
  | 'role_name_empty'
  | 'role_name_taken'
  | 'role_built_in'
  | 'role_has_holders'
  | 'role_unknown'

/** One operator who holds a key, and whether the role or an override gave it (T8.2). */
export interface PermissionHolder {
  user: TeamUser
  via: 'baseline' | 'granted'
}
