/**
 * Identity and session — foundation spec §8.2.
 *
 * **Q2 is open**: authentication is not in scope and `session.userId` has no
 * source. Under D1 the role now decides the landing workspace (§3.3), so a
 * mocked role is no longer cosmetic. The types below model what a real
 * `GET /session` would return, so the shell reads the same shape either way and
 * only the boot sequence changes when auth arrives.
 */

import type { SecondFactor } from './auth'
import type { IsoDateTime } from './common'
import type { PermissionKey, WorkspaceId } from './navigation'

/**
 * **The six roles — DECISIONS.md D17, which closes Q3.**
 *
 * The legacy `TEAM_ROLES` (`eyvar_ops_panel_v40_fixed.html:10501`) had four.
 * `Dispatcher` and `Trust & Safety` are the two §10.4 proposed and D17 adopted:
 * declining them left Safety & Incidents write permanently Ops-Manager-gated
 * (§13.1 R5) and gave the shift dispatcher the Ops Manager's pricing authority.
 *
 * Declaration order is authority order, and it is the order Admin › Team &
 * Access lists them in.
 */
export type RoleName =
  | 'Owner'
  | 'Ops Manager'
  | 'Dispatcher'
  | 'Trust & Safety'
  | 'Finance'
  | 'Support'

export const ROLE_NAMES: readonly RoleName[] = [
  'Owner',
  'Ops Manager',
  'Dispatcher',
  'Trust & Safety',
  'Finance',
  'Support',
] as const

/**
 * A role as an operator carries it: one of the six built-ins, or the name of a
 * custom role (D17: *a named role like any other*). `RoleName` stays the
 * closed set for baselines, landing routes and onboarding tracks; a custom
 * role reaches those through the built-in it was duplicated from.
 */
export type RoleId = string

export function isBuiltInRole(role: string): role is RoleName {
  return (ROLE_NAMES as readonly string[]).includes(role)
}

/**
 * @deprecated **D17 closed Q3 and both of these are now real `RoleName`s.**
 * Kept only so a stale import does not break; it is a subset of `RoleName` and
 * carries no meaning of its own. Delete on sight.
 */
export type ProposedRoleName = 'Trust & Safety' | 'Dispatcher'

/* ─────────────────── The role baseline and the delta ──────────────────── */

/**
 * **D17 — effective permissions are a role baseline plus a signed per-user
 * delta, never a free-floating permission set.**
 *
 * > `Support + release_escrow − contact_users`
 *
 * The delta is **displayed as a delta and never flattened** (AC-921): a
 * flattened list makes an exception look like a role, and nobody ever audits it
 * back. `role` is carried on the delta as well as on the `TeamUser` so the
 * delta is meaningless if it is ever separated from the role it was signed
 * against.
 *
 * Every grant, revoke and role change **writes an audit entry naming both
 * states** (AC-923). The legacy already does this for role changes (`:10498`)
 * and not for permission changes.
 */
export interface PermissionDelta {
  role: RoleId
  granted: PermissionKey[]
  revoked: PermissionKey[]
}

/**
 * **The six role baselines — D17's table, verbatim.**
 *
 * This is data, not code: adding a role is a row here and a holder in
 * `fixtures/teamUsers.ts`, and `shell/permissions.ts` contains no role name at
 * all (design finding F-6). The legacy proves what happens without a baseline —
 * `defaultPermissionsForRole()` (`:10521`) returns `[]` for a role with no
 * existing member, so the first Dispatcher invited would arrive with **zero**
 * permissions.
 *
 * **`manage_settings` appears on `Owner` and nowhere else.** It is retired (see
 * `PermissionKey`) and gates no route-table row; it is granted to the Owner
 * only so the five screens still reading it directly do not go read-only for
 * the one operator who holds it today, mid-migration. Remove it the day those
 * five screens move to the four successor keys.
 *
 * **`manage_security_policy` is Owner-only**, deliberately: it decides how
 * people authenticate, which is the highest-privilege setting in the console.
 */
export const ROLE_PERMISSIONS: Readonly<Record<RoleName, readonly PermissionKey[]>> = {
  /* All twenty, plus the retired alias. */
  Owner: [
    'view_analytics',
    'view_operations',
    'view_finance',
    'view_support',
    'view_admin',
    'view_profiles',
    'approve_drivers',
    'manage_subscriptions',
    'live_ops',
    'manage_plans',
    'process_payouts',
    'release_escrow',
    'apply_deductions',
    'manage_tickets',
    'contact_users',
    'manage_team',
    'manage_ops_policy',
    'manage_workspace',
    'manage_data_governance',
    'manage_security_policy',
  ],
  /* 13. Reads every workspace; writes everything operational. No money write,
     no `manage_team`, no `manage_workspace`, no governance, no security. */
  'Ops Manager': [
    'view_analytics',
    'view_operations',
    'view_finance',
    'view_support',
    'view_admin',
    'view_profiles',
    'approve_drivers',
    'manage_subscriptions',
    'live_ops',
    'manage_plans',
    'manage_tickets',
    'contact_users',
    'manage_ops_policy',
  ],
  /* 4. The narrowest role in the console: one workspace and the live board.
     They see an Admin tile containing only the Activity Log (AC-914). */
  Dispatcher: ['view_operations', 'view_profiles', 'live_ops', 'contact_users'],
  /* 7. Holds `approve_drivers`, which is what makes a suspension decision
     theirs and not Support's (AC-916, and §13.1 R5 applied). */
  'Trust & Safety': [
    'view_analytics',
    'view_operations',
    'view_support',
    'view_profiles',
    'approve_drivers',
    'manage_tickets',
    'contact_users',
  ],
  /* 7. `manage_plans` is here for Pricing, which is also why Management ›
     Growth is `●` rather than §10.3's `◐` — a D17 deviation. No `view_admin`,
     so Admin › Data & Compliance does not render (the other D17 narrowing). */
  Finance: [
    'view_analytics',
    'view_finance',
    'view_profiles',
    'process_payouts',
    'release_escrow',
    'apply_deductions',
    'manage_plans',
  ],
  /* 5. **No `view_finance`**, so the Financials tile does not render at all and
     Rider Wallets is `○` — the compensation credit Support needs mid-call is a
     command on the rider's 360° profile under `manage_tickets` plus the
     `compPolicy` cap, not a Financials screen (D17). */
  Support: ['view_operations', 'view_support', 'view_profiles', 'manage_tickets', 'contact_users'],
}

/**
 * **The role that can grant a permission**, for the `{granter}` half of D17's
 * refusal sentence: `You need the "{permission}" permission. {granter} can
 * grant it.`
 *
 * It is a **role and never a person** — naming *"ask Sarah Al-Rashid"* leaks the
 * roster to an operator who cannot open Team & Access. The answer is the same
 * for every key because granting is `manage_team`, and `Owner` is its only
 * holder; it is a function rather than a constant so it stays right when a
 * custom role is given `manage_team`.
 *
 * The caller renders `role.<name>.subject` — **a separate i18n key from the
 * role's display name**, because `{granter}` opens a sentence and Arabic needs
 * a definite form there (D17's two i18n flags).
 */
export function granterRoleFor(_key: PermissionKey): RoleName {
  return ROLE_NAMES.find((role) => ROLE_PERMISSIONS[role].includes('manage_team')) ?? 'Owner'
}

/**
 * **Effective permissions = baseline ∪ granted ∖ revoked.** D17.
 *
 * Computed **server-side and delivered resolved on `Session.permissions`** —
 * this function is the mock server's implementation of that, called from
 * `clients/session.ts` and `clients/auth.ts` and from nowhere in the UI. §8.2:
 * *"a derived value is not a disabled input"*, and a console that re-derives
 * its own authority will eventually disagree with the server that granted it.
 *
 * A `delta` whose `role` disagrees with `role` is ignored rather than merged: a
 * delta signed against a different role is stale, and applying it is how an
 * operator keeps an exception through a demotion.
 */
export function effectivePermissions(
  role: RoleId,
  delta?: PermissionDelta | null,
  baseline: readonly PermissionKey[] = isBuiltInRole(role) ? ROLE_PERMISSIONS[role] : [],
): PermissionKey[] {
  if (!delta || delta.role !== role) return [...baseline]
  const revoked = new Set<PermissionKey>(delta.revoked)
  const out = baseline.filter((key) => !revoked.has(key))
  for (const key of delta.granted) {
    if (!revoked.has(key) && !out.includes(key)) out.push(key)
  }
  return out
}

/** Legacy team-user status (`:2830`–`:2841`). `Invited` is a real, seeded state — USR-4 has never logged in. */
export type TeamUserStatus = 'Active' | 'Invited' | 'Suspended'

/**
 * An operator record. Legacy `DB.teamUsers[]` (`:2830`):
 * `{id,name,email,phone,photo,role,lastLogin,status,twoFA,permissions}`.
 */
export interface TeamUser {
  id: string
  name: string
  email: string
  /** Nullable: a seeded user could plausibly have none, and the invite flow does not require one. */
  phone: string | null
  /** Legacy seeds all five as `null` (`:2831`) — every avatar in the product is initials today. */
  photoUrl: string | null
  role: RoleId
  /** Legacy stores display strings `'Today 09:00'`, `'24 Jun'`, `'Not yet'` (`:2831`–`:2841`). ISO here; `null` for never. */
  lastLoginAt: IsoDateTime | null
  status: TeamUserStatus
  /**
   * **Replaces `twoFactorEnabled: boolean` (spec §4.2, §10.1).**
   *
   * `null` means **enrolment pending** — not "opted out". Second factor is a
   * property of the console, not of the user: §4.2 retires both legacy
   * switches, the per-user `twoFA` toggle (`:3047`) and the workspace
   * `require2FA` setting (`:8028`), because a policy whose "off" state is *"an
   * operator who can release escrow may sign in with one factor"* is not a
   * policy anyone should be able to set from a settings pane.
   *
   * What survives from the account's security section is *which* factor is
   * enrolled, what it is bound to, and the ability to re-enrol.
   */
  secondFactor: SecondFactor | null
  /**
   * **Superseded by `role` + `permissionDelta` (D17), and no longer the source
   * of `Session.permissions`.**
   *
   * The legacy shape stored an absolute set per operator (`:2830`), which is
   * exactly the free-floating permission set D17 rules out — it is why the seed
   * could not say *"Support, plus escrow"* and why nobody ever audits an
   * exception back to a role. `buildSession` now reads
   * `effectivePermissions(user.role, user.permissionDelta)`.
   *
   * Kept on the type because the fixture still carries it verbatim from the
   * legacy seed and Admin › Team & Access still reads it. **Do not add a new
   * reader.** It is asserted against the baseline in `rolePermissions.test.ts`,
   * so a fixture edit that disagrees with a role is caught rather than silently
   * ignored.
   *
   * @deprecated D17 — read `effectivePermissions(role, permissionDelta)`.
   */
  permissions: PermissionKey[]
  /**
   * **The signed per-user delta — D17.** `undefined` or `null` means "the role
   * baseline exactly", which is four of the five seeded operators.
   *
   * Optional so a fixture that has not been re-seeded still type-checks; the
   * resolver treats absent and empty identically.
   */
  permissionDelta?: PermissionDelta | null
  /**
   * Compensation authority cap in halalas. Support may write rider-wallet
   * credits only within it (§11.2; legacy `compPolicy`, `:15379`). `null` means
   * no cap — the Owner.
   */
  compensationCapHalalas: number | null
}

/**
 * What the shell reads at boot. Every field here is §8.2; the derived ones are
 * computed **server-side** and arrive resolved, because §8.2's own rule is that
 * "a derived value is not a disabled input" and a component that re-derives one
 * will eventually disagree with the server that granted it.
 */
export interface Session {
  userId: string
  name: string
  email: string
  photoUrl: string | null
  role: RoleId
  permissions: PermissionKey[]
  /** Derived from the role → workspace map (§3.3). Falls back to `/operations/overview`. */
  landingRoute: string
  landingWorkspaceId: WorkspaceId
  /**
   * One entry per sub-tab (§11.3), **derived server-side from the route table's
   * `viewPermission` column** (D17). `subTabViewPermissions()` in
   * `clients/routes.ts` is the mock server's derivation, so this map and the
   * route table cannot disagree — which is the whole reason it is derived and
   * not hand-written.
   *
   * `admin-activity` carries `[]`: the only row with no view key, open to every
   * authenticated operator. An **empty array is "ungated"**; an absent entry is
   * "the server did not say", and `isSubTabVisible` falls back to the row.
   */
  subTabPermissions: Record<string, PermissionKey[]>
  isImpersonating: boolean
  /** Who is being impersonated, for the undismissable banner (§4.2). `null` unless impersonating. */
  impersonatedUser: { id: string; name: string } | null
  /**
   * The `✋ N mine` chip. Ownership rows claimed by this user and not expired
   * (§8.2; legacy `myOpenClaims()`, `:18913`). Derived — the count and the chip
   * both come from here, never from a length computed in a component.
   */
  claimedCount: number
  /** Server time at issue. Lets the UI show relative times without reading a host clock. */
  issuedAt: IsoDateTime
}

/**
 * Shell UI state that must **persist across a reload** — §8.3.
 *
 * **Q1 is open**: `localStorage`, `sessionStorage`, `indexedDB` and
 * `document.cookie` are zero matches in the legacy file, so there is no
 * precedent and no decision. Modelled as a server-backed preferences resource
 * because that is the shape that survives either answer; the mock keeps it in
 * memory and **AC-33 fails explicitly** until Q1 lands.
 */
export interface UserPreferences {
  /** §3.9. Seeded from viewport at first run only, then never auto-toggled. */
  subTabNavCollapsed: boolean
  /**
   * §8.3. Legacy reseeds this to `en` on every load (`:2570`) — a defect. It
   * must persist, and `dir` is derived from it on the document, not a subtree.
   */
  language: 'en' | 'ar'
}
