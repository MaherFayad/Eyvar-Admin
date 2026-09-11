/**
 * `session.ts`'s `listTeamUsers`/`getTeamUser` docblocks: `GET /team-users`
 * and `GET /team-users/:id`, both bare (no `Single<T>` wrapper), both gated
 * on `manage_team` — "who exists" is a different read from "who am I".
 *
 * `users` (`0002_auth.sql`) carries only what WP-6.2's auth/session/
 * permission scope needs: no `phone`, `photoUrl`, `secondFactor`,
 * `permissionDelta` or `compensationCapHalalas` columns. Those fields come
 * back `null`/`[]` here rather than invented — the invite/suspend/reinstate/
 * offboard lifecycle those columns belong to (F-016, `team.ts`'s other nine
 * operations) is not built in this WP; it needs its own migration and is
 * named as deferred in WP-6.2's report.
 */
import type { TeamUser, TeamUserStatus } from '@/data/types/session'
import { notFoundError } from '../errors'
import { jsonResponse } from '../envelope'
import { requirePermission, type RequestContext } from '../auth'
import type { RouteHandler } from '../router'
import type { Database } from '../db'

interface UserRow {
  id: string
  email: string
  name_en: string
  role_id: string
  status: string
}

function toTeamUser(row: UserRow): TeamUser {
  return {
    id: row.id,
    name: row.name_en,
    email: row.email,
    phone: null,
    photoUrl: null,
    role: row.role_id,
    lastLoginAt: null,
    status: row.status as TeamUserStatus,
    secondFactor: null,
    permissions: [],
    permissionDelta: null,
    compensationCapHalalas: null,
  }
}

/** GET /api/v1/team-users -> `{ items: TeamUser[] }` */
export function createListTeamUsersHandler(db: Database): RouteHandler<RequestContext> {
  return async (_req, ctx) => {
    requirePermission(ctx, 'manage_team')
    const rows = await db.sql<UserRow>`
      SELECT id, email, name_en, role_id, status FROM users ORDER BY name_en
    `
    return jsonResponse({ items: rows.map(toTeamUser) })
  }
}

/** GET /api/v1/team-users/:id -> `TeamUser` */
export function createGetTeamUserHandler(db: Database): RouteHandler<RequestContext> {
  return async (_req, ctx) => {
    requirePermission(ctx, 'manage_team')
    const rows = await db.sql<UserRow>`
      SELECT id, email, name_en, role_id, status FROM users WHERE id = ${ctx.params.id}
    `
    const row = rows[0]
    if (!row) throw notFoundError(`team user ${ctx.params.id}`)
    return jsonResponse(toTeamUser(row))
  }
}
