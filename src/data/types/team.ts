/**
 * The operator lifecycle — plan task **P6-T5**, legacy defect **F-016**.
 *
 * Admin › Team & Access held its whole lifecycle in a component: an id
 * fabricated as `USR-${users.length + 1}`, a push onto a local `invited[]`, and
 * a `statusOverrides` map that a refetch erased. Inviting an operator did
 * nothing, and did it convincingly.
 *
 * These are the types the client works in. Three of them are worth reading
 * before the client:
 *
 *   `TeamTransition`   the closed set of things that can happen to an operator.
 *                      A free-text transition cannot be audited or guarded.
 *   `TeamGuardCode`    a machine-readable refusal. §11.2 requires a refusal to
 *                      be **stated**, and a sentence assembled in the client
 *                      cannot be translated (`LocalisedText`'s whole argument).
 *                      The client throws the code; the surface renders the key.
 *   `SecurityPolicy`   the three controls at `AdminTeamScreen.tsx:315`–`:335`
 *                      that were `useState` with no save path anywhere.
 *
 * ## F-016, and why the guard is a pure function in this file
 *
 * *"The last holder of `manage_team` cannot be stripped of it, suspended, or
 * removed."* The rule is enforced in `clients/team.ts`, because a rule that
 * lives in a component is a rule the next surface forgets — and the predicate
 * lives **here**, exported, so the screen can disable the control in place with
 * the same answer the client would have thrown. One rule, two surfaces, no
 * drift. That is the same argument `src/commands/` makes for row and bulk
 * actions and it is the reason D9 exists.
 */

import type { DeviceSession } from './auth'
import type { IsoDateTime } from './common'
import type { PermissionKey } from './navigation'
import type { RoleId, TeamUser } from './session'

/* ───────────────────────────── transitions ───────────────────────────── */

/**
 * Every state change an operator record can undergo. Closed, because
 * `AuditAction` is closed and the two have to stay in step.
 *
 *   `invite`      a new record, `status: 'Invited'`, never logged in
 *   `resend`      re-send the outstanding invitation; no state change
 *   `revoke`      withdraw an outstanding invitation; the record is removed
 *   `suspend`     an active operator loses access, keeps their record
 *   `reinstate`   the inverse
 *   `offboard`    the record leaves the roster. Not `Suspended`, not a flag
 *   `permissions` the override (signed delta) is rewritten
 *   `role`        the operator moves to another role; the override is cleared
 */
export type TeamTransition =
  | 'invite'
  | 'resend'
  | 'revoke'
  | 'suspend'
  | 'reinstate'
  | 'offboard'
  | 'permissions'
  | 'role'

/** What the invite form collects. `permissions` is derived from the role by the client. */
export interface TeamInviteInput {
  name: string
  email: string
  /** `TeamUser.phone` is nullable and the invite flow does not require one. */
  phone: string | null
  role: RoleId
  compensationCapHalalas: number | null
}

/**
 * The outstanding invitation behind an `Invited` row. Separate from `TeamUser`
 * because it is the *invitation* that is resent and revoked, not the person.
 */
export interface TeamInvite {
  userId: string
  email: string
  /** What the activation link carries. Renewed on resend; dead after `expiresAt`. */
  token: string
  sentAt: IsoDateTime
  expiresAt: IsoDateTime
  /** How many times `resend` has been called. An invite nobody accepts is a finding. */
  resendCount: number
}

/* ────────────────────────── the F-016 invariant ───────────────────────── */

/**
 * A refusal the client raises, as a code rather than a sentence.
 *
 * `last_manage_team_holder` is F-016. The other three exist so that every
 * refusal on this screen arrives by the same door — a surface that has to
 * handle one code and three ad-hoc `Error`s will handle the code and swallow
 * the rest.
 */
export type TeamGuardCode =
  | 'last_manage_team_holder'
  | 'not_invited'
  | 'not_active'
  | 'not_suspended'
  | 'no_manage_team'

/**
 * Who currently *holds* `manage_team` in the sense F-016 means.
 *
 * **`Active` only, deliberately.** An `Invited` operator has never signed in
 * and a `Suspended` one cannot; counting either as a holder would let the last
 * working administrator suspend themselves because a colleague was invited last
 * week and never accepted. Legacy's own bug was the opposite mistake — it
 * counted nobody, because it never counted at all.
 */
export function manageTeamHolders(users: readonly TeamUser[]): readonly TeamUser[] {
  return users.filter((u) => u.status === 'Active' && u.permissions.includes('manage_team'))
}

/**
 * **F-016.** Returns the refusal code, or `null` when the transition is legal.
 *
 * Guarded transitions are exactly the three the defect names: `suspend`,
 * `offboard`, and `permissions` when the new set drops the key. `reinstate`,
 * `resend` and `invite` cannot reduce the holder count and are not guarded;
 * `revoke` withdraws an invitation, and an invitee is not a holder.
 *
 * `nextPermissions` is only read for `permissions`. Omitting it there is
 * treated as "the set is unchanged", which is a no-op rather than a strip.
 */
export function manageTeamGuard(
  users: readonly TeamUser[],
  userId: string,
  transition: TeamTransition,
  nextPermissions?: readonly PermissionKey[],
): TeamGuardCode | null {
  const guarded: readonly TeamTransition[] = ['suspend', 'offboard', 'permissions', 'role']
  if (!guarded.includes(transition)) return null

  const holders = manageTeamHolders(users)
  const target = holders.find((u) => u.id === userId)
  /* Not a holder, or not the last one — nothing to protect. */
  if (target === undefined || holders.length > 1) return null

  if (transition === 'permissions' || transition === 'role') {
    const next = nextPermissions ?? target.permissions
    return next.includes('manage_team') ? null : 'last_manage_team_holder'
  }
  return 'last_manage_team_holder'
}

/* ───────────────────────── security & session policy ──────────────────── */

/**
 * The three controls at `AdminTeamScreen.tsx:315`, `:321` and `:335`. Each was
 * a `useState` seeded with a literal, and **no control on the screen saved
 * any of them** — the operator set a session timeout and the console forgot it
 * on the next navigation.
 *
 * `idleTimeoutMinutes` is the one with a consumer waiting for it:
 * `shell/session.ts:75` hardcodes `DEFAULT_IDLE_TIMEOUT_MINUTES = 30` and the
 * shell expires a session against that constant, so today the policy pane and
 * the thing it claims to configure cannot disagree only because the pane is
 * inert. Wiring the shell to this field is a `src/shell/` change and is
 * reported rather than made here.
 */
export interface SecurityPolicy {
  /**
   * §4.2 retires the legacy per-user `twoFA` toggle (`:3047`) and keeps the
   * workspace-level requirement. `TeamUser.secondFactor: null` then means
   * *enrolment pending*, not *opted out*.
   */
  requireSecondFactor: boolean
  /** Minutes. `shell/session.ts` clamps to 5…240; the client refuses outside it. */
  idleTimeoutMinutes: number
  /** Hours. The hard ceiling, regardless of activity. */
  absoluteExpiryHours: number
  updatedAt: IsoDateTime | null
  updatedBy: string | null
}

/**
 * On-call rota — `AdminTeamScreen.tsx:365` / `:381`, also local state.
 *
 * The consumer exists and is wired to nothing: `TopBar.tsx:105` takes
 * `onCallName` and `AppLayout.tsx:396` passes the literal `null`, so the top
 * bar's `No one on call` warning is unconditional. Both ids are nullable
 * because *nobody assigned* is a real and reportable state, not a default.
 */
export interface OnCallRota {
  primaryUserId: string | null
  secondaryUserId: string | null
  updatedAt: IsoDateTime | null
  updatedBy: string | null
}

/** One live session on the roster, for the Sessions & devices pane (D20). */
export interface OperatorSession {
  user: TeamUser
  device: DeviceSession
}

/** What `listOperatorSessions` answers with. One row per live device session. */
export interface OperatorSessionsResult {
  userId: string
  /**
   * Whether the caller may end the listed sessions: their own always, another
   * operator's when they hold `manage_team` (D20, Sessions & devices pane).
   * §11.2: a refused control renders disabled with `refusal` as its reason.
   */
  canRevoke: boolean
  /** Why not, as a code. `null` when `canRevoke` is `true`. */
  refusal: TeamGuardCode | null
}
