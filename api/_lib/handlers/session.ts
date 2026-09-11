/**
 * `GET /api/v1/session` — `session.ts`'s `getSession` docblock: "the server
 * reads the auth cookie" and returns a bare `Session`. Built from the
 * operator + permissions the router's auth step already resolved (no second
 * permission query) plus one lookup for the user's display fields.
 *
 * `landingRoute`/`landingWorkspaceId`/`subTabPermissions`/`claimedCount` were
 * WP-6.2's placeholders; `sessionDerive.ts` (WP-6.2b) resolves all four from
 * `roles`, the route table and `claims`.
 */
import type { Session } from '@/data/types/session'
import type { IsoDateTime } from '@/data/types/common'
import { unauthorizedError } from '../errors'
import { jsonResponse } from '../envelope'
import type { RequestContext } from '../auth'
import type { RouteHandler } from '../router'
import type { Database } from '../db'
import { deriveShellFields } from './sessionDerive'

/** Shared by `session.current` and every `auth.*` operation that hands back the same shape on success. */
export async function buildSessionPayload(db: Database, operator: { userId: string; role: string; permissions: Session['permissions'] }): Promise<Session> {
  const rows = await db.sql<{ email: string; name_en: string; photo_url: string | null }>`
    SELECT email, name_en, photo_url FROM users WHERE id = ${operator.userId}
  `
  const user = rows[0]
  if (!user) throw unauthorizedError()
  const shell = await deriveShellFields(db, operator.userId, operator.role)

  return {
    userId: operator.userId,
    name: user.name_en,
    email: user.email,
    photoUrl: user.photo_url,
    role: operator.role,
    permissions: operator.permissions,
    landingRoute: shell.landingRoute,
    landingWorkspaceId: shell.landingWorkspaceId,
    subTabPermissions: shell.subTabPermissions,
    isImpersonating: false,
    impersonatedUser: null,
    claimedCount: shell.claimedCount,
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
