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

/** Legacy `TEAM_ROLES` (`eyvar_ops_panel_v40_fixed.html:10501`). Four, not six. */
export type RoleName = 'Owner' | 'Ops Manager' | 'Finance' | 'Support'

export const ROLE_NAMES: readonly RoleName[] = ['Owner', 'Ops Manager', 'Finance', 'Support'] as const

/**
 * **Q3 is open.** `PROPOSED-STRUCTURE.md` §10.4 proposes `Trust & Safety` and
 * `Dispatcher`; §10.3's visibility matrix and §13.1 R5 both assume they exist.
 * D1 explicitly did *not* adopt them (DECISIONS.md D1 "Scope of this decision").
 * They are named here as a type so the shell can be written against a superset
 * without anyone shipping them by accident — `ROLE_NAMES` is what exists.
 */
export type ProposedRoleName = 'Trust & Safety' | 'Dispatcher'

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
  role: RoleName
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
  permissions: PermissionKey[]
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
  role: RoleName
  permissions: PermissionKey[]
  /** Derived from the role → workspace map (§3.3). Falls back to `/operations/overview`. */
  landingRoute: string
  landingWorkspaceId: WorkspaceId
  /**
   * 34 entries required (§11.3). **Empty today**: Q4 is open and the route
   * table ships every `permission` as `null`, so there is nothing to derive
   * from. An empty map means "no sub-tab is gated" — which is exactly what the
   * product does today, and the recorded gap AC-61 fails against.
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
