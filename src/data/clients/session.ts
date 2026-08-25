/**
 * Session client — foundation spec §8.2, §8.3.
 *
 * The shell's boot read. Everything here can **load, fail and be empty**, which
 * is why it is a client and not a constant: §9.1's shell error state ("Identity
 * or permissions could not be loaded") is unreachable otherwise, and an
 * unreachable state does not get built.
 */

import { DATA_SOURCE } from '../config'
import { EYVAR_NOW } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import {
  CURRENT_USER_ID,
  DEFAULT_LANDING,
  ROLE_LANDING,
  teamUserFixtures,
} from '../fixtures/teamUsers'
import { claimFixtures } from '../fixtures/claims'
import type { WorkspaceId } from '../types/navigation'
import type { Session, TeamUser, UserPreferences } from '../types/session'
import { http } from './http'

export const SESSION_OPERATIONS = {
  current: 'session.current',
  teamUsers: 'session.teamUsers',
  preferences: 'session.preferences',
  updatePreferences: 'session.updatePreferences',
  switchUser: 'session.switchUser',
} as const

/**
 * Which operator the mock is signed in as. **Not `Math.random()` and not
 * persisted** — a module-level variable a devtool and a test can set, so QA can
 * check AC-07 (role → landing workspace) for all four roles without an auth
 * system existing. Resets to `USR-1` between test files because the module is
 * re-evaluated.
 */
let mockUserId: string = CURRENT_USER_ID

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

/** Reset between tests, so one file's `switchMockUser` cannot leak into the next. */
export function resetMockSession(): void {
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
    permissions: user.permissions,
    landingRoute: landing.path,
    landingWorkspaceId: landing.workspaceId as WorkspaceId,
    /* 34 entries required (§11.3). Empty because **Q4 is open** and every
       route-table `permission` is null — there is nothing to derive from, and
       fabricating a map here would ship an answer nobody gave. */
    subTabPermissions: {},
    isImpersonating: false,
    impersonatedUser: null,
    claimedCount: claimFixtures.filter((c) => c.state === 'claimed' && c.ownerId === user.id).length,
    issuedAt: EYVAR_NOW,
  }
}
