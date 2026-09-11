/**
 * `auth.ts`'s sign-in/sign-out/sign-out-everywhere, simplified to
 * `05-backend.md` §2 Q1's own description: "email + password (argon2id)
 * sets an … cookie". The richer `SignInOutcome` union the frontend client
 * declares — challenge, enrolment-required, TOTP, device trust, password
 * reset — is the mock's elaboration of a second factor this plan's backend
 * assumptions do not cover; it is out of scope here and named in WP-6.2's
 * report rather than half-built. A rejected sign-in is a 401 here, not a
 * `{ kind: 'failed' }` 200, but the "one message for every cause" rule
 * (§4.5 of the client docblock) still holds: unknown email, wrong password
 * and a non-Active account all answer the same 401.
 */
import type { PermissionKey } from '@/data/types/navigation'
import type { ApiErrorDetail } from '../errors'
import { unauthorizedError, validationError } from '../errors'
import { jsonResponse } from '../envelope'
import {
  clearSessionCookieHeader,
  requireSessionSecret,
  sessionCookieHeader,
  signSessionId,
  type RequestContext,
} from '../auth'
import type { RouteHandler } from '../router'
import type { Database } from '../db'
import { verifyPassword } from '../password'
import { buildSessionPayload } from './session'

async function parseJsonBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const text = await req.text()
    if (!text) return null
    const parsed: unknown = JSON.parse(text)
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/** POST /api/v1/auth/sign-in — body: `{ email, password }` -> bare `Session`, `Set-Cookie` on success. */
export function createSignInHandler(db: Database): RouteHandler<RequestContext> {
  return async (req) => {
    const body = await parseJsonBody(req)
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body?.password === 'string' ? body.password : ''
    if (!email || !password) {
      const details: ApiErrorDetail[] = []
      if (!email) details.push({ field: 'email', code: 'required', message: 'Email is required' })
      if (!password) details.push({ field: 'password', code: 'required', message: 'Password is required' })
      throw validationError(details)
    }

    const rows = await db.sql<{ id: string; role_id: string; status: string; password_hash: string }>`
      SELECT id, role_id, status, password_hash FROM users WHERE email = ${email}
    `
    const user = rows[0]
    if (!user || user.status !== 'Active' || !(await verifyPassword(password, user.password_hash))) {
      throw unauthorizedError()
    }

    const secret = requireSessionSecret()
    const sessionRows = await db.sql<{ id: string }>`
      INSERT INTO sessions (user_id, device) VALUES (${user.id}, ${req.headers.get('user-agent')})
      RETURNING id
    `
    const sessionId = sessionRows[0]!.id
    const permissionRows = await db.sql<{ permission_key: string }>`
      SELECT permission_key FROM role_permissions WHERE role_id = ${user.role_id}
    `
    const permissions = permissionRows.map((r) => r.permission_key) as PermissionKey[]
    const session = await buildSessionPayload(db, { userId: user.id, role: user.role_id, permissions })

    return jsonResponse(session, 200, { 'set-cookie': sessionCookieHeader(signSessionId(sessionId, secret)) })
  }
}

/** POST /api/v1/auth/sign-out -> `{ signedOut: true }`. This session only. */
export function createSignOutHandler(db: Database): RouteHandler<RequestContext> {
  return async (_req, ctx) => {
    if (!ctx.operator) throw unauthorizedError()
    await db.sql`
      UPDATE sessions SET revoked_at = now() WHERE id = ${ctx.operator.sessionId} AND revoked_at IS NULL
    `
    return jsonResponse({ signedOut: true }, 200, { 'set-cookie': clearSessionCookieHeader() })
  }
}

/** POST /api/v1/auth/sign-out-everywhere -> `{ sessionsEnded: number }`. Every OTHER session for this user (AC-576). */
export function createSignOutEverywhereHandler(db: Database): RouteHandler<RequestContext> {
  return async (_req, ctx) => {
    if (!ctx.operator) throw unauthorizedError()
    const rows = await db.sql<{ id: string }>`
      UPDATE sessions SET revoked_at = now()
      WHERE user_id = ${ctx.operator.userId} AND id <> ${ctx.operator.sessionId} AND revoked_at IS NULL
      RETURNING id
    `
    return jsonResponse({ sessionsEnded: rows.length })
  }
}
