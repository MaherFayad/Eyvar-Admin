/**
 * Cookie session read and the request-context type every handler receives.
 * The store is an interface — `StubSessionStore` always reads as signed out —
 * so this file compiles and the router can be exercised end to end before
 * WP-6.2 lands `sessions`/`users`/`role_permissions` behind it.
 */

import { forbiddenError, unauthorizedError } from './errors'
import type { PermissionKey } from '@/data/types/navigation'

/** `05-backend.md` §2 Q1: `POST /api/v1/auth/sign-in` sets an HttpOnly, Secure, SameSite=Lax cookie. */
export const SESSION_COOKIE_NAME = 'eyvar_session'

export interface AuthenticatedOperator {
  userId: string
  role: string
  permissions: PermissionKey[]
}

/** What every handler receives after the router's auth step. */
export interface RequestContext {
  operator: AuthenticatedOperator | null
  requestId: string
}

/** Behind this interface so WP-6.2 can swap in the `sessions` table read without touching callers. */
export interface SessionStore {
  /** Resolves a session cookie value to the operator it authenticates, or `null` if absent, expired, or revoked. */
  readSession(sessionId: string): Promise<AuthenticatedOperator | null>
}

/** Always signed out. WP-6.2 implements the real store over `sessions`, `users`, `role_permissions`. */
export class StubSessionStore implements SessionStore {
  async readSession(_sessionId: string): Promise<AuthenticatedOperator | null> {
    return null
  }
}

/** Reads `SESSION_COOKIE_NAME` out of the `Cookie` header. No signature check here — the store owns that. */
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

export async function authenticate(req: Request, store: SessionStore): Promise<AuthenticatedOperator | null> {
  const sessionId = readSessionCookie(req)
  if (!sessionId) return null
  return store.readSession(sessionId)
}

/** 401 when nobody is signed in; 403 naming the permission when they lack it (`CONTRACT.md` §11). */
export function requirePermission(ctx: RequestContext, permission: PermissionKey): AuthenticatedOperator {
  if (!ctx.operator) throw unauthorizedError()
  if (!ctx.operator.permissions.includes(permission)) throw forbiddenError(permission)
  return ctx.operator
}
