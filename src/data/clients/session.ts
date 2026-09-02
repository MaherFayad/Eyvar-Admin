/**
 * Session client — foundation spec §8.2, §8.3.
 *
 * The shell's boot read. Everything here can **load, fail and be empty**, which
 * is why it is a client and not a constant: §9.1's shell error state ("Identity
 * or permissions could not be loaded") is unreachable otherwise, and an
 * unreachable state does not get built.
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { EYVAR_NOW } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import type { PermissionKey, WorkspaceId } from '../types/navigation'
import { effectivePermissions } from '../types/session'
import type { Session, TeamUser, UserPreferences } from '../types/session'
import { subTabViewPermissions } from './routes'
import { http } from './http'
import { fixturesLoaded, onFixturesLoaded, type Fixtures } from '../mock/fixtures'

/* Late-bound fixture rows. `mock/fixtures.ts` says why this is not a static
   import: a static one pins seeded data into every build, including the http
   build that can never read it. Bound before any mock read, because `mock()`
   and `mockMutation()` await `loadFixtures()`. */
let CURRENT_USER_ID!: Fixtures['CURRENT_USER_ID']
let DEFAULT_LANDING!: Fixtures['DEFAULT_LANDING']
let ROLE_LANDING!: Fixtures['ROLE_LANDING']
let teamUserFixtures!: Fixtures['teamUserFixtures']
let claimFixtures!: Fixtures['claimFixtures']
onFixturesLoaded((f) => {
  CURRENT_USER_ID = f.CURRENT_USER_ID
  DEFAULT_LANDING = f.DEFAULT_LANDING
  ROLE_LANDING = f.ROLE_LANDING
  teamUserFixtures = f.teamUserFixtures
  claimFixtures = f.claimFixtures
  /* Seeded here rather than at module load: these locals are built from
     late-bound fixtures, which are undefined until the fixture chunk lands. */
  mockUserId = CURRENT_USER_ID
})

export const SESSION_OPERATIONS = {
  current: 'session.current',
  teamUsers: 'session.teamUsers',
  preferences: 'session.preferences',
  updatePreferences: 'session.updatePreferences',
  switchUser: 'session.switchUser',
} as const

/* Registered at module load, not on first call. `config.ts` says *"each client
   registers its ids here at module load"*, and `mock()` only registers when it
   runs — so an operation nobody has invoked yet is missing from a QA panel's
   list and from any validation of `?mockFail=`. Every id in this module is
   listed the moment the module is imported. */
registerOperations(...Object.values(SESSION_OPERATIONS))

/**
 * Which operator the mock is signed in as. **Not `Math.random()` and not
 * persisted** — a module-level variable a devtool and a test can set, so QA can
 * check AC-07 (role → landing workspace) for all four roles without an auth
 * system existing. Resets to `USR-1` between test files because the module is
 * re-evaluated.
 */
let mockUserId!: string

/* ─────────────────────────────── reads ─────────────────────────────────── */

/**
 * GET /api/v1/session
 *   params: none — the server reads the auth cookie
 *   -> Session
 *
 * **Q2 (auth in scope?) is unanswered.** When it is, this endpoint stays; only
 * what populates it changes. `landingRoute`, `subTabPermissions` and
 * `claimedCount` are derived server-side and arrive resolved (§8.2).
 */
export async function getSession(signal?: AbortSignal): Promise<Session> {
  if (DATA_SOURCE === 'http') return http.get<Session>('/session', undefined, { signal })
  return mock(SESSION_OPERATIONS.current, signal, () => buildSession(mockUserId))
}

/**
 * GET /api/v1/team-users
 *   params: none (the roster is five people; pagination would be theatre)
 *   -> { items: TeamUser[] }
 *
 * Consumed by the account menu, the audit-log actor column, and Admin › Team &
 * Access. Not the same endpoint as `/session` — one is "who am I", the other is
 * "who exists", and they have different permissions (`manage_team`).
 */
export async function listTeamUsers(signal?: AbortSignal): Promise<TeamUser[]> {
  if (DATA_SOURCE === 'http') {
    const res = await http.get<{ items: TeamUser[] }>('/team-users', undefined, { signal })
    return res.items
  }
  return mock(SESSION_OPERATIONS.teamUsers, signal, () => teamUserFixtures)
}

/**
 * GET /api/v1/team-users/:id
 *   -> TeamUser
 */
export async function getTeamUser(id: string, signal?: AbortSignal): Promise<TeamUser> {
  if (DATA_SOURCE === 'http') return http.get<TeamUser>(`/team-users/${id}`, undefined, { signal })
  return mock(SESSION_OPERATIONS.teamUsers, signal, () => {
    const user = teamUserFixtures.find((u) => u.id === id)
    if (!user) throw notFound('team user', id)
    return user
  })
}

/**
 * GET /api/v1/me/preferences
 *   -> UserPreferences
 *
 * **Q1 is open** — nothing in the legacy app persists anything, and no store
 * has been chosen. Modelled server-side because that shape survives whichever
 * way Q1 goes. The mock holds it in memory, so **AC-33 (nav collapse persists
 * across reload) fails today** — a recorded gap, not a surprise.
 */
export async function getPreferences(signal?: AbortSignal): Promise<UserPreferences> {
  if (DATA_SOURCE === 'http') return http.get<UserPreferences>('/me/preferences', undefined, { signal })
  return mock(SESSION_OPERATIONS.preferences, signal, () => ({ ...mockPreferences }))
}

/**
 * PATCH /api/v1/me/preferences
 *   body: Partial<UserPreferences>
 *   -> UserPreferences
 */
export async function updatePreferences(
  patch: Partial<UserPreferences>,
  signal?: AbortSignal,
): Promise<UserPreferences> {
  if (DATA_SOURCE === 'http') {
    return http.patch<UserPreferences>('/me/preferences', patch, { signal })
  }
  return mockMutation(SESSION_OPERATIONS.updatePreferences, signal, () => {
    mockPreferences = { ...mockPreferences, ...patch }
    return { ...mockPreferences }
  })
}

/** Defaults match §3.9 and §8.3: expanded at first run, English until Admin › Workspace changes it. */
let mockPreferences: UserPreferences = { subTabNavCollapsed: false, language: 'en' }

/* ───────────────────────── mock-only affordances ───────────────────────── */

/**
 * Sign the mock in as another seeded operator. **Mock mode only** — in http
 * mode this is impersonation and belongs to a real, audited endpoint.
 * Exists so AC-07 can be verified for all four roles today.
 */
export async function switchMockUser(userId: string, signal?: AbortSignal): Promise<Session> {
  if (DATA_SOURCE === 'http') {
    throw new Error('switchMockUser is mock-only; use the impersonation endpoint in http mode')
  }
  return mockMutation(SESSION_OPERATIONS.switchUser, signal, () => {
    if (!teamUserFixtures.some((u) => u.id === userId)) throw notFound('team user', userId)
    mockUserId = userId
    return buildSession(mockUserId)
  })
}

/**
 * The signed-in mock operator's permissions, **synchronously**.
 *
 * Added for `reports.run`, which resolves each series against the **requesting**
 * session (§13.1) and must therefore know who is asking while it is building a
 * response. Reading `CURRENT_USER_ID` instead — as every client below this one
 * once did — would make `switchMockUser` invisible to it, and §8.3 states 9 and
 * 15 are both reachable only through `switchMockUser`.
 *
 * **Mock-only.** In http mode the server reads the auth cookie and this is
 * never called; the report client guards on `DATA_SOURCE` before it gets here.
 */
export function currentMockPermissions(): readonly PermissionKey[] {
  /**
   * **Resolved the way `buildSession` resolves it — role baseline plus the
   * signed delta — and NOT read off `TeamUser.permissions`.**
   *
   * That field is the legacy *absolute* set D17 retired, and `types/session.ts`
   * marks it `@deprecated`. Reading it made this function disagree with the
   * session the console is actually showing: `USR-1` is an Owner holding all
   * twenty keys on `Session.permissions`, while this returned the thirteen
   * legacy strings — no `view_analytics`, no `manage_workspace`.
   *
   * Anything gating on it therefore gated on a set the operator is never shown,
   * and `clients/reports.ts` is a live caller. Found by the Integrations build,
   * which worked around it with a local copy of this resolution rather than
   * inherit the disagreement; that workaround can now be deleted.
   *
   * One resolution, in `types/session.ts`, called from both places — because
   * two implementations of "what may this operator do" is how they drift, which
   * is the whole of D17's §8.2.
   */
  const user = teamUserFixtures.find((u) => u.id === mockUserId)
  return user === undefined ? [] : effectivePermissions(user.role, user.permissionDelta)
}

/**
 * The signed-in mock operator's id, synchronously. Same rationale as above.
 *
 * **The one answer to "who is acting right now" in the mock data layer.** Every
 * client that stamps an actor, filters a `mine`/`heldByMe` view, decides a
 * take-over 409, or scopes an authority by role reads this. It replaced
 * `fixtures/teamUsers.CURRENT_USER_ID` in twenty clients: two thirds of the
 * layer resolved the actor against that constant and one third against this
 * session, and **the two halves disagreed** — `nextClaim` wrote
 * `ownerId: CURRENT_USER_ID` while `conversations.ts` read `view: 'mine'` off
 * the session, so a claim made after `switchMockUser('USR-3')` landed on
 * `USR-1` and the `mine` view never saw it.
 *
 * `CURRENT_USER_ID` is still correct for exactly one thing — the **seeded
 * default**, which is what `mockUserId` is initialised to and what
 * `resetMockSession` restores. If a new use of it answers "who is acting", it
 * is a defect; see `identity.test.ts`.
 */
export function currentMockUserId(): string {
  return mockUserId
}

/** Reset between tests, so one file's `switchMockUser` cannot leak into the next. */
export function resetMockSession(): void {
  /* Nothing seeded yet: the fixture chunk has not landed, so there is no
     state to reset and the rows this would read are still undefined. The
     binder in this module seeds fresh state when it does land. */
  if (!fixturesLoaded()) return
  mockUserId = CURRENT_USER_ID
  mockPreferences = { subTabNavCollapsed: false, language: 'en' }
}

/* ─────────────────────────────── derivation ────────────────────────────── */

function buildSession(userId: string): Session {
  const user = teamUserFixtures.find((u) => u.id === userId)
  if (!user) throw notFound('team user', userId)
  const landing = ROLE_LANDING[user.role] ?? DEFAULT_LANDING

  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    photoUrl: user.photoUrl,
    role: user.role,
    /* **D17 — the role baseline plus the signed per-user delta, resolved.**
       Not `user.permissions`: the legacy seed stores an absolute set per
       operator, which is the free-floating permission set D17 rules out. The
       server computes this and delivers it resolved, so nothing in the UI ever
       re-derives its own authority (§8.2). */
    permissions: effectivePermissions(user.role, user.permissionDelta),
    landingRoute: landing.path,
    landingWorkspaceId: landing.workspaceId as WorkspaceId,
    /* One entry per sub-tab, derived from the route table's `viewPermission`
       column so the map and the table cannot disagree (§11.3, D17). */
    subTabPermissions: subTabViewPermissions(),
    isImpersonating: false,
    impersonatedUser: null,
    claimedCount: claimFixtures.filter((c) => c.state === 'claimed' && c.ownerId === user.id).length,
    issuedAt: EYVAR_NOW,
  }
}
