/**
 * Cookie session read, the request-context type every handler receives, and
 * `SessionStore`, backed by `sessions`/`users`/`role_permissions` (05-backend.md §2 Q1).
 * `StubSessionStore` is an always-signed-out store with no database.
 */

import { createHmac, timingSafeEqual } from 'node:crypto'
import { forbiddenError, unauthorizedError, HttpError } from './errors'
import type { Database } from './db'
import type { PermissionKey } from '@/data/types/navigation'

/** `05-backend.md` §2 Q1: `POST /api/v1/auth/sign-in` sets an HttpOnly, Secure, SameSite=Lax cookie. */
export const SESSION_COOKIE_NAME = 'eyvar_session'

/** Matches `sessions.expires_at`'s default in `0002_auth.sql`. */
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30

/**
 * AC-573's device check: a second cookie, separate from the session one, so
 * a device stays "remembered" across a sign-out/sign-in that rotates the
 * session cookie. Signed the same way — `signSessionId`/`verifySessionCookieValue`
 * are generic over any id. */
export const DEVICE_COOKIE_NAME = 'eyvar_device'
export const DEVICE_TRUST_SECONDS = 60 * 60 * 24 * 30

/**
 * Bounded write (05-backend.md §2 Q1): `readSession` only issues the
 * `UPDATE` when the session has not been touched in this long, so a screen
 * polling every few seconds costs one write per five minutes, not one per
 * request. */
const LAST_SEEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000

export interface AuthenticatedOperator {
  userId: string
  role: string
  permissions: PermissionKey[]
  /** The session row that authenticated this request — `sign-out` and `sign-out-everywhere` need it. */
  sessionId: string
}

/** What every handler receives after the router's auth step. */
export interface RequestContext {
  operator: AuthenticatedOperator | null
  requestId: string
}

/** Behind this interface so a caller never depends on which table backs it. */
export interface SessionStore {
  /** Resolves a session id to the operator it authenticates, or `null` if absent, expired, revoked, or not `Active`. */
  readSession(sessionId: string): Promise<AuthenticatedOperator | null>
}

/** Always signed out. For call sites that want a store with no database (WP-6.1's original scaffold role). */
export class StubSessionStore implements SessionStore {
  async readSession(_sessionId: string): Promise<AuthenticatedOperator | null> {
    return null
  }
}

/**
 * `sessions` joined to `users`/`role_permissions`, one round trip — the
 * permission set comes back `array_agg`'d rather than a second query. A
 * `Suspended`/`Invited` user reads as signed out even with a live session
 * row: the row can outlive an account action taken elsewhere. */
export class DbSessionStore implements SessionStore {
  constructor(private readonly db: Database) {}

  async readSession(sessionId: string): Promise<AuthenticatedOperator | null> {
    const rows = await this.db.sql<{
      user_id: string
      role_id: string
      status: string
      last_seen_at: string
      permissions: (string | null)[]
    }>`
      SELECT s.user_id, u.role_id, u.status, s.last_seen_at,
             array_remove(array_agg(rp.permission_key), NULL) AS permissions
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN role_permissions rp ON rp.role_id = u.role_id
      WHERE s.id = ${sessionId} AND s.revoked_at IS NULL AND s.expires_at > now()
      GROUP BY s.user_id, u.role_id, u.status, s.last_seen_at
    `
    const row = rows[0]
    if (!row || row.status !== 'Active') return null

    if (Date.now() - new Date(row.last_seen_at).getTime() >= LAST_SEEN_REFRESH_THRESHOLD_MS) {
      await this.db.sql`
        UPDATE sessions SET last_seen_at = now(), expires_at = now() + interval '30 days' WHERE id = ${sessionId}
      `
    }

    return {
      userId: row.user_id,
      role: row.role_id,
      permissions: row.permissions.filter((p): p is string => p !== null) as PermissionKey[],
      sessionId,
    }
  }
}

/** Reads `SESSION_COOKIE_NAME` out of the `Cookie` header. No signature check here — `verifySessionCookieValue` owns that. */
export function readSessionCookie(req: Request): string | null {
  const header = req.headers.get('cookie')
  if (!header) return null
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    const name = part.slice(0, eq).trim()
    if (name === SESSION_COOKIE_NAME) return decodeURIComponent(part.slice(eq + 1).trim())
  }
  return null
}

/** `SESSION_SECRET` (env). Throws only when a handler actually needs to sign a cookie — see `requireSessionSecret`. */
export function readSessionSecret(): string | undefined {
  return process.env.SESSION_SECRET
}

/** For handlers that mint a session (sign-in): a misconfigured deployment should fail loudly, not sign with `undefined`. */
export function requireSessionSecret(): string {
  const secret = readSessionSecret()
  if (!secret) {
    throw new HttpError(500, 'internal_error', 'SESSION_SECRET is not set', [], { kind: 'server', retryable: true })
  }
  return secret
}

/** `<sessionId>.<hmac>` — an HMAC so a guessed or enumerated session id cannot be replayed without also forging the signature. */
export function signSessionId(sessionId: string, secret: string): string {
  const mac = createHmac('sha256', secret).update(sessionId).digest('hex')
  return `${sessionId}.${mac}`
}

/** The inverse of `signSessionId`, constant-time. Returns `null` on any malformed or mis-signed value. */
export function verifySessionCookieValue(value: string, secret: string): string | null {
  const dot = value.lastIndexOf('.')
  if (dot === -1) return null
  const sessionId = value.slice(0, dot)
  const mac = value.slice(dot + 1)
  const expected = createHmac('sha256', secret).update(sessionId).digest('hex')
  const macBuffer = Buffer.from(mac, 'hex')
  const expectedBuffer = Buffer.from(expected, 'hex')
  if (macBuffer.length === 0 || macBuffer.length !== expectedBuffer.length) return null
  return timingSafeEqual(macBuffer, expectedBuffer) ? sessionId : null
}

export function sessionCookieHeader(signedValue: string, maxAgeSeconds: number = SESSION_TTL_SECONDS): string {
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(signedValue)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}`
}

/** Set on `sign-out` — AC-1274's "revoking a session invalidates its cookie" holds even if a client keeps sending the old value, but this clears it from a well-behaved one immediately. */
export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
}

/** Reads `DEVICE_COOKIE_NAME` out of the `Cookie` header. Same shape as `readSessionCookie`, kept separate so a device id is never mistaken for a session id. */
export function readDeviceCookie(req: Request): string | null {
  const header = req.headers.get('cookie')
  if (!header) return null
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    const name = part.slice(0, eq).trim()
    if (name === DEVICE_COOKIE_NAME) return decodeURIComponent(part.slice(eq + 1).trim())
  }
  return null
}

/** Set on `verifyCode` when `rememberDevice` is `true` and the code was correct — never on `signIn`, which has not proved the second factor yet. */
export function deviceCookieHeader(signedValue: string, maxAgeSeconds: number = DEVICE_TRUST_SECONDS): string {
  return `${DEVICE_COOKIE_NAME}=${encodeURIComponent(signedValue)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}`
}

/**
 * An unset `SESSION_SECRET` resolves to "nobody is signed in" rather than
 * throwing (05-backend.md §2 Q1), so routes needing no operator (`/health`)
 * keep working unconfigured; a route that needs one fails via the ordinary
 * 401, and `requireSessionSecret` makes misconfiguration loud where it mints one. */
export async function authenticate(
  req: Request,
  store: SessionStore,
  secret: string | undefined,
): Promise<AuthenticatedOperator | null> {
  if (!secret) return null
  const cookieValue = readSessionCookie(req)
  if (!cookieValue) return null
  const sessionId = verifySessionCookieValue(cookieValue, secret)
  if (!sessionId) return null
  return store.readSession(sessionId)
}

/** 401 when nobody is signed in; 403 naming the permission when they lack it (`CONTRACT.md` §11). */
export function requirePermission(ctx: RequestContext, permission: PermissionKey): AuthenticatedOperator {
  if (!ctx.operator) throw unauthorizedError()
  if (!ctx.operator.permissions.includes(permission)) throw forbiddenError(permission)
  return ctx.operator
}
