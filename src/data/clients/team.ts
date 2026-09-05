/**
 * The operator lifecycle — plan task **P6-T5**, legacy defect **F-016**.
 *
 * ## What this replaces
 *
 * `AdminTeamScreen.tsx:118`'s `handleAddUser` minted an id as
 * `USR-${users.length + 1}`, pushed the row onto a component-local `invited[]`
 * and toasted *"Invitation sent"*. There was no `inviteTeamUser` anywhere in
 * `src/data/`. A second array, `statusOverrides`, held Active/Suspended and was
 * erased by the next refetch. So the screen could invite an operator, suspend
 * them, and lose both on a navigation — while telling the operator otherwise.
 *
 * Six transitions are real here: **invite · resend · revoke · suspend ·
 * reinstate · offboard**, plus a seventh, `permissions`, which F-016 also
 * guards. Every one writes an audit entry naming who did what to whom.
 *
 * ## F-016 is enforced HERE, not in the screen
 *
 * *"The last holder of `manage_team` cannot be stripped of it, suspended, or
 * removed."* The predicate is `manageTeamGuard` in `types/team.ts` and it is
 * called on the way into every guarded mutation. A rule that lives in a
 * component is a rule the next surface forgets — and this product already has
 * the evidence: D9 records `Suspend captain` declared four times with two
 * different `disabled` predicates, so the same operator was stopped by the row
 * kebab and allowed by the bulk bar over the same record.
 *
 * The screen calls the same exported predicate to render the control disabled
 * in place with its reason (§11.2). It does not re-implement it, and it cannot
 * disagree with the client, because there is one implementation.
 *
 * ## Shape
 *
 * `tickets.ts` and `auth.ts` are the models: a `DATA_SOURCE` branch on every
 * operation, `mock`/`mockMutation` around every mock body, an operation-id
 * constant per endpoint so `?mockFail=team.invite` reaches the error state, and
 * `Paginated<T>` on the list. Ids are minted from a sequence seeded at 900 —
 * **not `Date.now()`** — for the reason `tickets.ts:28` gives at length: a
 * clock-derived id is a different id on every run and nothing that diffs output
 * can tell a real change from the clock ticking.
 *
 * ## One roster
 *
 * The roster lives in `rosterStore.ts`, which `session.ts` reads too, so a
 * lifecycle change here is what the next `getSession` resolves. Roles,
 * overrides and role changes are `rbac.ts`.
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { EYVAR_NOW, offsetFromNow } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import { runQuery, type QueryShape } from '../mock/query'
import { ApiError, type LocalisedText, type Paginated, type QueryParams } from '../types/common'
import type { PermissionKey } from '../types/navigation'
import type { RoleId, TeamUser } from '../types/session'
import {
  manageTeamGuard,
  manageTeamHolders,
  type OnCallRota,
  type OperatorSession,
  type OperatorSessionsResult,
  type TeamGuardCode,
  type TeamInvite,
  type TeamInviteInput,
  type TeamTransition,
} from '../types/team'
import type { DeviceSession } from '../types/auth'
import type { AuditAction } from '../types/audit'
import { appendAudit } from './audit'
import { listDevices, revokeDevice } from './auth'
import { http } from './http'
import { currentMockPermissions, currentMockUserId } from './session'
import { fixturesLoaded, onFixturesLoaded, type Fixtures } from '../mock/fixtures'
import {
  baselineFor,
  getInvites,
  getRoster,
  inviteExpired,
  resetRosterStore,
  setInvites,
  setRoster,
  withEffective,
} from './rosterStore'
import { recordEmailDelivery } from './emails'
import { roleCapDefault } from './policy'
import { notifyTeam } from './notifications'
import { listWorkItems } from './myWork'
import { releaseApplicant } from './applicants'
import { releaseRequest } from './requests'
import { releaseAssuranceTrip } from './assurance'
import { releaseSafetyIncident } from './safety'
import { releaseFairnessCase } from './fairness'
import { releaseTicket } from './tickets'
import { releaseDispute } from './disputes'

/* Late-bound fixture rows. `mock/fixtures.ts` says why this is not a static
   import: a static one pins seeded data into every build, including the http
   build that can never read it. Bound before any mock read, because `mock()`
   and `mockMutation()` await `loadFixtures()`. */
let teamUserFixtures!: Fixtures['teamUserFixtures']
onFixturesLoaded((f) => {
  teamUserFixtures = f.teamUserFixtures
})

export const TEAM_OPERATIONS = {
  list: 'team.list',
  get: 'team.get',
  invite: 'team.invite',
  resendInvite: 'team.resendInvite',
  revokeInvite: 'team.revokeInvite',
  suspend: 'team.suspend',
  reinstate: 'team.reinstate',
  offboard: 'team.offboard',
  rota: 'team.rota',
  updateRota: 'team.updateRota',
  sessions: 'team.sessions',
  allSessions: 'team.allSessions',
  setCap: 'team.setCap',
  revokeSession: 'team.revokeSession',
} as const

/* Registered at module load, not on first call. `config.ts` says *"each client
   registers its ids here at module load"*, and `mock()` only registers when it
   runs — so an operation nobody has invoked yet is missing from a QA panel's
   list and from any validation of `?mockFail=`. Every id in this module is
   listed the moment the module is imported. */
registerOperations(...Object.values(TEAM_OPERATIONS))

/**
 * **Q4 is closed by D17, and this now reads the ruling's baseline directly.**
 *
 * It used to read the permission array off *an existing seeded operator with
 * the same role* — which was the right answer while the baselines were
 * unwritten, and is the exact failure mode D17 names the moment a role has no
 * holder yet: the legacy `defaultPermissionsForRole()` (`:10521`) *"returns `[]`
 * for a role with no existing member, so the first Dispatcher invited would
 * arrive with zero permissions."* `Dispatcher` and `Trust & Safety` have no
 * seeded holder in `fixtures/teamUsers.ts` yet, so this function would have
 * reproduced that bug on the day it was created.
 *
 * `ROLE_PERMISSIONS` is one table, in `types/session.ts`, and it is what
 * `buildSession` resolves against too — so an invited operator gets the same set
 * the router will gate them on, rather than a copy of whoever happened to be
 * seeded first.
 */
export function permissionsForRole(role: RoleId): PermissionKey[] {
  return [...(baselineFor(role) ?? [])]
}

/**
 * Compensation authority cap by role — legacy `compPolicy` (`:15379`), joined on
 * the seed.
 *
 * **A role with no seeded holder gets the most restrictive seeded cap, not
 * `null`.** `null` means *"no cap — the Owner"*, and returning it for a role
 * nobody has seeded would hand an invited Dispatcher unlimited compensation
 * authority through a gap in the fixture. D17 records that `DB.compPolicy`
 * already carries a `default` tier (50/300 SAR) and that *"a new role gets a
 * compensation cap on the day it is created"* — **that default tier is the real
 * answer and it is not in the fixture**; this is the conservative stand-in until
 * the fixture owner seeds it, and it is deliberately the floor rather than a
 * number invented here.
 */
export function capForRole(role: RoleId): number | null {
  /* The Limits pane's role default (O-T5) decides; the seed is the fallback for
     a role the pane has not named. Sync, and callable from a closed dialog's
     first render, before the fixture chunk has landed. */
  const fromPolicy = roleCapDefault(role)
  if (fromPolicy !== undefined) return fromPolicy
  const rows: readonly TeamUser[] = teamUserFixtures ?? []
  const exemplar = rows.find((u) => u.role === role)
  if (exemplar) return exemplar.compensationCapHalalas
  const caps = rows
    .map((u) => u.compensationCapHalalas)
    .filter((cap): cap is number => cap !== null)
  return caps.length > 0 ? Math.min(...caps) : 0
}

/* ─────────────────────────── mutable mock state ────────────────────────── */


/**
 * `USR-901` upward. Seeded at 900 so a session-minted id is greppably distinct
 * from the fixtures' `USR-1`…`USR-5` and can never collide with them — the same
 * separation `ledger.ts` gets from its `JE-9…` prefix and `tickets.ts` from
 * `MSG-9…`, and for the same reason.
 */
let userSequence = 900

/**
 * Seeded to the two operators the legacy rota named. Both are `Active`, which
 * matters: `updateOnCallRota` refuses a suspended or invited operator, and a
 * seed that violated its own rule would make the refusal untestable.
 */
let rota: OnCallRota = {
  primaryUserId: 'USR-5',
  secondaryUserId: 'USR-3',
  updatedAt: null,
  updatedBy: null,
}


/** Back to the seed, and back to the first minted id. Both halves, for `tickets.ts:52`'s reason. */
export function resetTeam(): void {
  /* Nothing seeded yet: the fixture chunk has not landed, so there is no
     state to reset and the rows this would read are still undefined. The
     binder in this module seeds fresh state when it does land. */
  if (!fixturesLoaded()) return
  resetRosterStore()
  userSequence = 900
  rota = { primaryUserId: 'USR-5', secondaryUserId: 'USR-3', updatedAt: null, updatedBy: null }
}

/**
 * **QA affordance: a roster with two `manage_team` holders.**
 *
 * F-016 only bites at one holder, and the seed has exactly one (`USR-1`). A
 * test that could only ever observe the refusal cannot show that the *guard* is
 * what refuses — anything that always throws would pass. This grants
 * `manage_team` to `USR-5` so the same three calls can be run against a roster
 * where the invariant does not apply, which is the falsification half of the
 * proof.
 */
export function useTwoManageTeamHolders(): void {
  setRoster(
    getRoster().map((u) =>
      u.id === 'USR-5' && !u.permissions.includes('manage_team')
        ? withEffective({
            ...u,
            permissionDelta: { role: u.role, granted: ['manage_team'], revoked: [] },
          })
        : u,
    ),
  )
}

/* ───────────────────────────── refusals ───────────────────────────────── */

/**
 * A refusal, as the one error type that crosses the seam. `code` is the machine
 * -readable half — the surface maps it to a translated sentence — and `message`
 * **names the rule** so a log line or a thrown error read in a console says
 * what happened rather than `409`.
 */
function refuse(code: TeamGuardCode, detail: string): ApiError {
  return new ApiError({
    status: 409,
    kind: 'conflict',
    code,
    message: detail,
    retryable: false,
  })
}

const LAST_HOLDER_MESSAGE =
  'Refused: this is the last active operator holding `manage_team`. ' +
  'The last holder cannot be stripped of it, suspended or removed (F-016).'

/** Throws the F-016 refusal, or returns. One call site per guarded mutation. */
function assertNotLastManageTeamHolder(
  userId: string,
  transition: TeamTransition,
  nextPermissions?: readonly PermissionKey[],
): void {
  const code = manageTeamGuard(getRoster(), userId, transition, nextPermissions)
  if (code !== null) throw refuse(code, LAST_HOLDER_MESSAGE)
}

/**
 * The same question the client asks, asked by a surface **before** it renders a
 * control — §11.2: *"never hidden, disabled in place with its reason"*.
 *
 * Exported so the screen disables `Suspend` on the last holder rather than
 * discovering the refusal after the click. Returns the code, never a sentence:
 * the sentence is copy and copy is resolved through `t`.
 */
export function transitionRefusal(
  users: readonly TeamUser[],
  user: TeamUser,
  transition: TeamTransition,
  nextPermissions?: readonly PermissionKey[],
): TeamGuardCode | null {
  switch (transition) {
    case 'resend':
    case 'revoke':
      return user.status === 'Invited' ? null : 'not_invited'
    case 'suspend':
      if (user.status !== 'Active') return 'not_active'
      break
    case 'reinstate':
      return user.status === 'Suspended' ? null : 'not_suspended'
    default:
      break
  }
  return manageTeamGuard(users, user.id, transition, nextPermissions)
}

/** How many active operators hold `manage_team` right now. The cheapest form of F-016's assertion. */
export function manageTeamHolderCount(users: readonly TeamUser[]): number {
  return manageTeamHolders(users).length
}

/* ───────────────────────────── the roster ─────────────────────────────── */

const teamShape: QueryShape<TeamUser> = {
  searchable: [(u) => u.name, (u) => u.email, (u) => u.id, (u) => u.role],
  sortable: {
    name: (u) => u.name,
    role: (u) => u.role,
    status: (u) => u.status,
    lastLoginAt: (u) => u.lastLoginAt ?? '',
  },
  filterable: {
    id: (u) => u.id,
    role: (u) => u.role,
    status: (u) => u.status,
  },
  facetable: ['role', 'status'],
  views: {
    all: () => true,
    active: (u) => u.status === 'Active',
    invited: (u) => u.status === 'Invited',
    suspended: (u) => u.status === 'Suspended',
  },
}

/**
 * GET /api/v1/team/operators
 *   params: page · pageSize · q · sort · filters · view
 *   -> Paginated<TeamUser>
 *
 * Distinct from `session.listTeamUsers` — that one answers *"who exists"* for
 * the account menu and the audit actor column and takes no query. This one is
 * the administered roster, and it is the only read that reflects a lifecycle
 * mutation.
 */
export async function listOperators(
  params: QueryParams = {},
  signal?: AbortSignal,
): Promise<Paginated<TeamUser>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<TeamUser>>('/team/operators', { ...params }, { signal })
  }
  return mock(TEAM_OPERATIONS.list, signal ?? params.signal, () => runQuery(getRoster(), params, teamShape))
}

/**
 * GET /api/v1/team/operators/:id
 *   -> TeamUser
 */
export async function getOperator(id: string, signal?: AbortSignal): Promise<TeamUser> {
  if (DATA_SOURCE === 'http') {
    return http.get<TeamUser>(`/team/operators/${id}`, undefined, { signal })
  }
  return mock(TEAM_OPERATIONS.get, signal, () => {
    const found = getRoster().find((u) => u.id === id)
    if (!found) throw notFound('operator', id)
    return found
  })
}

/**
 * GET /api/v1/team/invites
 *   -> { items: TeamInvite[] }
 *
 * The outstanding invitations, so a row can say *"sent 6 days ago, expires
 * tomorrow"* rather than only `Invited`.
 */
export async function listInvites(signal?: AbortSignal): Promise<TeamInvite[]> {
  if (DATA_SOURCE === 'http') {
    const res = await http.get<{ items: TeamInvite[] }>('/team/invites', undefined, { signal })
    return res.items
  }
  return mock(TEAM_OPERATIONS.list, signal, () => getInvites().map((i) => ({ ...i })))
}

/**
 * GET /api/v1/team/invites/:userId
 *   -> TeamInvite
 */
export async function getInvite(userId: string, signal?: AbortSignal): Promise<TeamInvite> {
  if (DATA_SOURCE === 'http') return http.get<TeamInvite>(`/team/invites/${userId}`, undefined, { signal })
  return mock(TEAM_OPERATIONS.get, signal, () => {
    const found = getInvites().find((i) => i.userId === userId)
    if (!found) throw notFound('invitation', userId)
    return { ...found }
  })
}

/** Expired against the fixed clock; the surface says so and offers resend only. */
export { inviteExpired }

/* ──────────────────────────── the lifecycle ───────────────────────────── */

/**
 * POST /api/v1/team/operators
 *   body: { name, email, phone, role, compensationCapHalalas }
 *   -> TeamUser
 *
 * The record lands `Invited` with `lastLoginAt: null` and `secondFactor: null`
 * — never activated, so never enrolled, which is exactly `USR-4`'s seeded
 * state. Permissions come from the role, not from the caller: a free permission
 * set on an invite is **P6-T7**, and P6-T7 is gated on the role model (D4).
 */
export async function inviteOperator(
  input: TeamInviteInput,
  signal?: AbortSignal,
): Promise<TeamUser> {
  if (DATA_SOURCE === 'http') {
    return http.post<TeamUser>('/team/operators', input, { signal })
  }
  return mockMutation(TEAM_OPERATIONS.invite, signal, () => {
    const email = input.email.trim().toLowerCase()
    if (getRoster().some((u) => u.email.trim().toLowerCase() === email)) {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'email_taken',
        message: `An operator already exists with the email ${input.email}`,
        retryable: false,
      })
    }

    userSequence += 1
    const created: TeamUser = {
      id: `USR-${userSequence}`,
      name: input.name.trim(),
      email: input.email.trim(),
      phone: input.phone === null || input.phone.trim() === '' ? null : input.phone.trim(),
      photoUrl: null,
      role: input.role,
      lastLoginAt: null,
      status: 'Invited',
      secondFactor: null,
      permissions: permissionsForRole(input.role),
      compensationCapHalalas: input.compensationCapHalalas ?? capForRole(input.role),
    }
    setRoster([created, ...getRoster()])
    const invite: TeamInvite = {
      userId: created.id,
      email: created.email,
      token: `INV-${userSequence}`,
      sentAt: EYVAR_NOW,
      expiresAt: offsetFromNow({ days: 7 }),
      resendCount: 0,
    }
    setInvites([invite, ...getInvites()])
    /* The invitation is an email the product sends, so it is in the log (O-T6). */
    recordEmailDelivery({
      recipient: created.email,
      recipientName: created.name,
      templateKey: 'team.invite',
      locale: 'en',
    })
    writeAudit({
      action: 'team.invite',
      subject: created,
      detail: { key: 'admin.audit.team.invited', params: { name: created.name, role: created.role } },
    })
    return created
  })
}

/**
 * POST /api/v1/team/invites/:userId/resend
 *   -> TeamInvite
 *
 * No state change on the operator — the invitation's clock restarts and the
 * resend count goes up. **404 on a record that is not `Invited`**, because
 * resending an invitation to somebody who accepted it three months ago is not a
 * retry, it is a different act nobody asked for.
 */
export async function resendInvite(userId: string, signal?: AbortSignal): Promise<TeamInvite> {
  if (DATA_SOURCE === 'http') {
    return http.post<TeamInvite>(`/team/invites/${userId}/resend`, {}, { signal })
  }
  return mockMutation(TEAM_OPERATIONS.resendInvite, signal, () => {
    const user = requireOperator(userId)
    if (user.status !== 'Invited') {
      throw refuse('not_invited', `Operator ${userId} has no outstanding invitation to resend`)
    }
    const invites = getInvites()
    const idx = invites.findIndex((i) => i.userId === userId)
    const existing = invites[idx]
    const next: TeamInvite = {
      userId,
      email: user.email,
      token: existing?.token ?? `INV-${userId}`,
      sentAt: EYVAR_NOW,
      expiresAt: offsetFromNow({ days: 7 }),
      resendCount: (existing?.resendCount ?? 0) + 1,
    }
    setInvites(idx === -1 ? [next, ...invites] : invites.map((i, n) => (n === idx ? next : i)))
    recordEmailDelivery({
      recipient: user.email,
      recipientName: user.name,
      templateKey: 'team.invite',
      locale: 'en',
    })
    writeAudit({
      action: 'team.inviteResend',
      subject: user,
      detail: { key: 'admin.audit.team.inviteResent', params: { name: user.name, count: next.resendCount } },
    })
    return next
  })
}

/**
 * DELETE /api/v1/team/invites/:userId
 *   -> { revoked: true }
 *
 * The record goes with the invitation. An invitee has never signed in, holds
 * nothing and did nothing — there is no history to preserve and no `Suspended`
 * tombstone worth carrying. An *accepted* operator leaving is `offboard`, and
 * that is a different operation with a different audit verb on purpose.
 */
export async function revokeInvite(
  userId: string,
  signal?: AbortSignal,
): Promise<{ revoked: true }> {
  if (DATA_SOURCE === 'http') {
    return http.delete<{ revoked: true }>(`/team/invites/${userId}`, { signal })
  }
  return mockMutation(TEAM_OPERATIONS.revokeInvite, signal, () => {
    const user = requireOperator(userId)
    if (user.status !== 'Invited') {
      throw refuse('not_invited', `Operator ${userId} has no outstanding invitation to revoke`)
    }
    setRoster(getRoster().filter((u) => u.id !== userId))
    setInvites(getInvites().filter((i) => i.userId !== userId))
    writeAudit({
      action: 'team.inviteRevoke',
      subject: user,
      detail: { key: 'admin.audit.team.inviteRevoked', params: { name: user.name } },
    })
    return { revoked: true }
  })
}

/**
 * POST /api/v1/team/operators/:id/suspend
 *   body: { reason }
 *   -> TeamUser
 *
 * **F-016 applies.** Refused in place when the target is the last active holder
 * of `manage_team`, with the rule named.
 */
export async function suspendOperator(
  userId: string,
  reason: string,
  signal?: AbortSignal,
): Promise<TeamUser> {
  if (DATA_SOURCE === 'http') {
    return http.post<TeamUser>(`/team/operators/${userId}/suspend`, { reason }, { signal })
  }
  return mockMutation(TEAM_OPERATIONS.suspend, signal, async () => {
    const user = requireOperator(userId)
    if (user.status !== 'Active') {
      throw refuse('not_active', `Operator ${userId} is ${user.status}, not Active`)
    }
    assertNotLastManageTeamHolder(userId, 'suspend')
    const released = await releaseHoldingsOf(userId)
    const updated = replace(userId, { status: 'Suspended' })
    writeAudit({
      action: 'team.suspend',
      subject: updated,
      detail: { key: 'admin.audit.team.suspended', params: { name: updated.name, released } },
      note: reason,
    })
    notifyTeam('admin.notification.team.suspended', { name: user.name }, user.id)
    return updated
  })
}

/**
 * POST /api/v1/team/operators/:id/reinstate
 *   -> TeamUser
 *
 * Not guarded: reinstating cannot reduce the holder count. It can only raise it.
 */
export async function reinstateOperator(
  userId: string,
  signal?: AbortSignal,
): Promise<TeamUser> {
  if (DATA_SOURCE === 'http') {
    return http.post<TeamUser>(`/team/operators/${userId}/reinstate`, {}, { signal })
  }
  return mockMutation(TEAM_OPERATIONS.reinstate, signal, () => {
    const user = requireOperator(userId)
    if (user.status !== 'Suspended') {
      throw refuse('not_suspended', `Operator ${userId} is ${user.status}, not Suspended`)
    }
    const updated = replace(userId, { status: 'Active' })
    writeAudit({
      action: 'team.reinstate',
      subject: updated,
      detail: { key: 'admin.audit.team.reinstated', params: { name: updated.name } },
    })
    return updated
  })
}

/**
 * DELETE /api/v1/team/operators/:id
 *   (no body -- see below)
 *
 * **`reason` is required by the domain and cannot currently be sent.**
 * `http.delete` takes no body argument, so the audit reason this function
 * accepts reaches the mock and never the wire. Documenting a body the transport
 * cannot carry is worse than documenting none: it reads as agreed. The fix is a
 * transport change or a `POST /offboard`; until then the annotation says what
 * actually happens. **An irreversible act with an unrecorded reason.**
 *   -> { offboarded: true }
 *
 * **The transition the product did not have.** The plan's own audit of Admin ›
 * Team reads *"No offboarding (legacy F-016 verbatim)"*: the screen offered
 * Deactivate and nothing else, so an operator who left the company stayed on
 * the roster forever, suspended, still counted, still selectable in the on-call
 * rota.
 *
 * **F-016 applies**, and it applies here more sharply than anywhere: offboarding
 * the last administrator locks every remaining operator out of this screen
 * permanently, and no surface in the product could undo it.
 *
 * The rota is repaired in the same mutation. An offboarded operator left on
 * call is a rota entry pointing at a record that no longer exists, which is the
 * dangling-reference half of the same defect.
 */
export async function offboardOperator(
  userId: string,
  reason: string,
  signal?: AbortSignal,
): Promise<{ offboarded: true }> {
  if (DATA_SOURCE === 'http') {
    return http.delete<{ offboarded: true }>(`/team/operators/${userId}`, { signal })
  }
  return mockMutation(TEAM_OPERATIONS.offboard, signal, async () => {
    const user = requireOperator(userId)
    assertNotLastManageTeamHolder(userId, 'offboard')
    await releaseHoldingsOf(userId)
    setRoster(getRoster().filter((u) => u.id !== userId))
    setInvites(getInvites().filter((i) => i.userId !== userId))
    if (rota.primaryUserId === userId) rota = { ...rota, primaryUserId: null }
    if (rota.secondaryUserId === userId) rota = { ...rota, secondaryUserId: null }
    writeAudit({
      action: 'team.offboard',
      subject: user,
      detail: { key: 'admin.audit.team.offboarded', params: { name: user.name, role: user.role } },
      note: reason,
    })
    return { offboarded: true }
  })
}


/* ──────────────────────────── on-call rota ────────────────────────────── */

/** The rota as it stands, for a metric computed on the same clock as the chip (TA-7). */
export function currentRota(): OnCallRota {
  return { ...rota }
}

/**
 * GET /api/v1/team/on-call
 *   -> OnCallRota
 */
export async function getOnCallRota(signal?: AbortSignal): Promise<OnCallRota> {
  if (DATA_SOURCE === 'http') {
    return http.get<OnCallRota>('/team/on-call', undefined, { signal })
  }
  return mock(TEAM_OPERATIONS.rota, signal, () => ({ ...rota }))
}

/**
 * PUT /api/v1/team/on-call
 *   body: { primaryUserId, secondaryUserId }
 *   -> OnCallRota
 *
 * **Only an `Active` operator can be on call.** A suspended or never-activated
 * operator on the rota is a rota that names somebody who cannot sign in, and
 * the top bar would render their name as reassurance.
 */
export async function updateOnCallRota(
  next: { primaryUserId: string | null; secondaryUserId: string | null },
  signal?: AbortSignal,
): Promise<OnCallRota> {
  if (DATA_SOURCE === 'http') {
    return http.put<OnCallRota>('/team/on-call', next, { signal })
  }
  return mockMutation(TEAM_OPERATIONS.updateRota, signal, () => {
    for (const id of [next.primaryUserId, next.secondaryUserId]) {
      if (id === null) continue
      const user = getRoster().find((u) => u.id === id)
      if (!user) throw notFound('operator', id)
      if (user.status !== 'Active') {
        throw refuse('not_active', `Operator ${id} is ${user.status} and cannot be on call`)
      }
    }
    rota = { ...next, updatedAt: EYVAR_NOW, updatedBy: 'USR-1' }
    const primary = getRoster().find((u) => u.id === rota.primaryUserId)
    appendAudit({
      action: 'team.rota',
      subjectType: 'workspace',
      subjectId: 'on-call-rota',
      amountHalalas: null,
      reasonCode: null,
      note: null,
      detail: {
        key: 'admin.audit.team.rota',
        params: { primary: primary?.name ?? '—' },
      },
    })
    return { ...rota }
  })
}

/**
 * PUT /api/v1/team/operators/:id/compensation-cap
 *   -> TeamUser
 *
 * The operator's own cap, over the role default (O-T5). `null` is no cap.
 */
export async function setCompensationCap(
  userId: string,
  capHalalas: number | null,
  signal?: AbortSignal,
): Promise<TeamUser> {
  if (DATA_SOURCE === 'http') {
    return http.put<TeamUser>(`/team/operators/${userId}/compensation-cap`, { capHalalas }, { signal })
  }
  return mockMutation(TEAM_OPERATIONS.setCap, signal, () => {
    const user = requireOperator(userId)
    const updated = replace(userId, { compensationCapHalalas: capHalalas })
    writeAudit({
      action: 'team.cap',
      subject: updated,
      detail: { key: 'admin.audit.team.capChanged', params: { name: user.name } },
    })
    return updated
  })
}

/* ─────────────────────── sessions and devices (P6-T8) ─────────────────── */

/**
 * GET /api/v1/team/sessions
 *   -> { items: OperatorSession[] }
 *
 * Every live session across the roster (D20 Sessions & devices). An `Invited`
 * operator has none by definition and is not asked.
 */
export async function listAllSessions(signal?: AbortSignal): Promise<OperatorSession[]> {
  if (DATA_SOURCE === 'http') {
    const res = await http.get<{ items: OperatorSession[] }>('/team/sessions', undefined, { signal })
    return res.items
  }
  return mock(TEAM_OPERATIONS.allSessions, signal, async () => {
    const out: OperatorSession[] = []
    for (const user of getRoster()) {
      if (user.status === 'Invited') continue
      for (const device of await listDevices(user.id)) out.push({ user, device })
    }
    return out
  })
}

/**
 * GET /api/v1/team/operators/:id/sessions
 *   -> { items: DeviceSession[], canRevoke, refusal }
 *
 * Another operator's sessions are listed and ended under `manage_team` (D20,
 * Sessions & devices). `auth.listDevices` and `auth.revokeDevice` both take
 * the operator id, so nothing here reaches past the caller by accident.
 */
export async function listOperatorSessions(
  userId: string,
  signal?: AbortSignal,
): Promise<{ items: DeviceSession[] } & OperatorSessionsResult> {
  const items = await listDevices(userId, signal)
  /* Your own sessions always; a colleague's under `manage_team` (D20). Both
     read the live mock session, never a constant, so `switchMockUser` is seen. */
  const own = userId === currentMockUserId()
  const canRevoke = own || currentMockPermissions().includes('manage_team')
  return {
    items,
    userId,
    canRevoke,
    refusal: canRevoke ? null : 'no_manage_team',
  }
}

/**
 * DELETE /api/v1/team/operators/:id/sessions/:deviceId
 *   -> { revoked: true }
 *
 * Delegates to `auth.revokeDevice` for the caller's own list, and refuses
 * anything else **before** it reaches a 404 that would read as a bug. The
 * refusal names the missing capability rather than the symptom.
 */
export async function revokeOperatorSession(
  userId: string,
  deviceId: string,
  signal?: AbortSignal,
): Promise<{ revoked: true }> {
  if (DATA_SOURCE === 'http') {
    return http.delete<{ revoked: true }>(
      `/team/operators/${userId}/sessions/${deviceId}`,
      { signal },
    )
  }
  /* The `cross_operator_session` refusal that stood here is **deleted, not
     disabled**. It existed because `auth.revokeDevice` resolved a device
     against the signed-in operator's own list and took no operator id, so an
     administered operator's device 404'd; the control refused in place with
     that stated reason rather than shipping something that would fail after the
     click. `revokeDevice` now takes the id (P6-T8), so the refusal is not
     merely unnecessary — it would be false. */
  const result = await revokeDevice(deviceId, userId, signal)
  const user = getRoster().find((u) => u.id === userId)
  if (user) {
    writeAudit({
      action: 'team.sessionRevoke',
      subject: user,
      detail: { key: 'admin.audit.team.sessionRevoked', params: { name: user.name, device: deviceId } },
    })
  }
  return result
}

/**
 * T6.4: what a suspended or offboarded operator held returns to Unassigned in
 * the same act, through each queue's own release. Returns how many.
 */
const RELEASE_BY_QUEUE: Record<string, (id: string) => Promise<unknown>> = {
  application: releaseApplicant,
  request: releaseRequest,
  assurance: releaseAssuranceTrip,
  incident: releaseSafetyIncident,
  fairness: releaseFairnessCase,
  ticket: releaseTicket,
  dispute: releaseDispute,
}

export async function releaseHoldingsOf(userId: string): Promise<number> {
  const page = await listWorkItems({ includeOtherRoles: true, pageSize: 500 })
  const held = page.items.filter((w) => w.claim?.state === 'claimed' && w.claim.ownerId === userId)
  let released = 0
  for (const item of held) {
    const release = RELEASE_BY_QUEUE[item.queue]
    if (!release) continue
    await release(item.id)
    released += 1
  }
  return released
}

/* ─────────────────────────────── helpers ──────────────────────────────── */

function requireOperator(userId: string): TeamUser {
  const found = getRoster().find((u) => u.id === userId)
  if (!found) throw notFound('operator', userId)
  return found
}

function replace(userId: string, patch: Partial<TeamUser>): TeamUser {
  const roster = getRoster()
  const idx = roster.findIndex((u) => u.id === userId)
  const existing = roster[idx]
  if (idx === -1 || !existing) throw notFound('operator', userId)
  const updated: TeamUser = { ...existing, ...patch }
  setRoster(roster.map((u, n) => (n === idx ? updated : u)))
  return updated
}

/**
 * One audit entry per transition, naming **who did what to whom**: the actor is
 * the session user (`appendAudit`'s default), the subject is the operator, and
 * the detail carries their name and the shape of the change.
 *
 * **The argument is an object with a literal `detail:` on purpose.**
 * `i18n/localisedKeys.test.ts` scans `src/data` **lexically, keyed on the field
 * name** — `detail: { key: '…'` — and fails the build if a key minted here is
 * missing from `EN`. A positional third parameter would have slipped past that
 * scan and the first render of the Activity table would have thrown instead,
 * which is exactly the three-waves-late failure that test was written to stop.
 */
function writeAudit(input: {
  action: AuditAction
  subject: TeamUser
  detail: LocalisedText
  note?: string | null
}): void {
  appendAudit({
    action: input.action,
    subjectType: 'operator',
    subjectId: input.subject.id,
    amountHalalas: null,
    reasonCode: null,
    note: input.note ?? null,
    detail: input.detail,
  })
}
