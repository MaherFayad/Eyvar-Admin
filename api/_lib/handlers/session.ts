/**
 * `GET /api/v1/session` — `session.ts`'s `getSession` docblock: "the server
 * reads the auth cookie" and returns a bare `Session`. Built from the
 * operator + permissions the router's auth step already resolved (no second
 * permission query) plus one lookup for the user's display name/email.
 *
 * `landingRoute`/`landingWorkspaceId`/`subTabPermissions`/`claimedCount` are
 * placeholders (the role→workspace map lives in the frontend's route table,
 * and there is no claims table yet — that is a navigation/dispatch WP, not
 * this one). Documented in WP-6.2's report rather than silently guessed.
 */
import type { Session } from '@/data/types/session'
import type { IsoDateTime } from '@/data/types/common'
import { unauthorizedError } from '../errors'
import { jsonResponse } from '../envelope'
import type { RequestContext } from '../auth'
import type { RouteHandler } from '../router'
import type { Database } from '../db'

/** Shared by `session.current` and `auth.signIn`, which both hand back the same shape on success. */
export async function buildSessionPayload(db: Database, operator: { userId: string; role: string; permissions: Session['permissions'] }): Promise<Session> {
  const rows = await db.sql<{ email: string; name_en: string }>`
    SELECT email, name_en FROM users WHERE id = ${operator.userId}
  `
  const user = rows[0]
  if (!user) throw unauthorizedError()

  return {
    userId: operator.userId,
    name: user.name_en,
    email: user.email,
    photoUrl: null,
    role: operator.role,
    permissions: operator.permissions,
    landingRoute: '/operations/overview',
    landingWorkspaceId: 'operations',
    subTabPermissions: {},
    isImpersonating: false,
    impersonatedUser: null,
    claimedCount: 0,
    issuedAt: new Date().toISOString() as IsoDateTime,
  }
}

export function createGetSessionHandler(db: Database): RouteHandler<RequestContext> {
  return async (_req, ctx) => {
    if (!ctx.operator) throw unauthorizedError()
    const session = await buildSessionPayload(db, ctx.operator)
    return jsonResponse(session)
  }
}
