/**
 * `DbSessionStore` (load + expiry + bounded refresh) and `requirePermission`
 * (401/403 shape) — WP-6.2. AC-1272, AC-1274.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { createTestDatabase, seedSession, seedUser } from '../_test/db'
import type { Database } from './db'
import { DbSessionStore, requirePermission, type RequestContext } from './auth'
import { errorResponse, type ApiErrorBody } from './errors'

let pglite: PGlite
let db: Database

beforeEach(async () => {
  const setup = await createTestDatabase()
  pglite = setup.pglite
  db = setup.db
})

afterEach(async () => {
  await pglite.close()
})

describe('DbSessionStore.readSession', () => {
  it('resolves an active session to the operator and their resolved permission set', async () => {
    const user = await seedUser(db, { email: 'owner@eyvar.test', password: 'correct horse', roleId: 'Owner' })
    const sessionId = await seedSession(db, { userId: user.id })

    const operator = await new DbSessionStore(db).readSession(sessionId)

    expect(operator?.userId).toBe(user.id)
    expect(operator?.role).toBe('Owner')
    expect(operator?.permissions).toContain('manage_team')
    expect(operator?.permissions).toContain('view_analytics')
    expect(operator?.sessionId).toBe(sessionId)
  })

  it('reads an expired session as signed out, not as an error (AC-1274)', async () => {
    const user = await seedUser(db, { email: 'support@eyvar.test', password: 'correct horse', roleId: 'Support' })
    const sessionId = await seedSession(db, {
      userId: user.id,
      expiresAt: new Date(Date.now() - 60_000),
    })

    await expect(new DbSessionStore(db).readSession(sessionId)).resolves.toBeNull()
  })

  it('reads a revoked session as signed out — the cookie a sign-out leaves behind stops authenticating (AC-1274)', async () => {
    const user = await seedUser(db, { email: 'revoked@eyvar.test', password: 'correct horse', roleId: 'Support' })
    const sessionId = await seedSession(db, { userId: user.id, revoked: true })

    await expect(new DbSessionStore(db).readSession(sessionId)).resolves.toBeNull()
  })

  it('reads a suspended operator as signed out even with a live session row', async () => {
    const user = await seedUser(db, {
      email: 'suspended@eyvar.test',
      password: 'correct horse',
      roleId: 'Support',
      status: 'Suspended',
    })
    const sessionId = await seedSession(db, { userId: user.id })

    await expect(new DbSessionStore(db).readSession(sessionId)).resolves.toBeNull()
  })

  it('reads an unknown session id as signed out', async () => {
    await expect(new DbSessionStore(db).readSession('ses_does_not_exist')).resolves.toBeNull()
  })

  it('leaves a recently-touched session\'s last_seen_at alone — the bounded refresh', async () => {
    const user = await seedUser(db, { email: 'fresh@eyvar.test', password: 'correct horse', roleId: 'Support' })
    const sessionId = await seedSession(db, { userId: user.id, lastSeenAt: new Date() })
    const before = await db.sql<{ last_seen_at: string }>`SELECT last_seen_at FROM sessions WHERE id = ${sessionId}`

    await new DbSessionStore(db).readSession(sessionId)

    const after = await db.sql<{ last_seen_at: string }>`SELECT last_seen_at FROM sessions WHERE id = ${sessionId}`
    // PGlite returns `timestamptz` as a `Date`, not a string — compare by
    // instant, since two distinct `Date` objects for the same moment are
    // never `Object.is`-equal.
    expect(new Date(after[0]!.last_seen_at).getTime()).toBe(new Date(before[0]!.last_seen_at).getTime())
  })

  it('refreshes last_seen_at and expires_at once a session has gone stale past the 5-minute threshold', async () => {
    const user = await seedUser(db, { email: 'stale@eyvar.test', password: 'correct horse', roleId: 'Support' })
    const sessionId = await seedSession(db, { userId: user.id, lastSeenAt: new Date(Date.now() - 10 * 60_000) })

    await new DbSessionStore(db).readSession(sessionId)

    const after = await db.sql<{ last_seen_at: string }>`SELECT last_seen_at FROM sessions WHERE id = ${sessionId}`
    expect(Date.now() - new Date(after[0]!.last_seen_at).getTime()).toBeLessThan(5_000)
  })
})

describe('requirePermission', () => {
  it('throws the 401 shape CONTRACT.md declares when nobody is signed in', () => {
    const ctx: RequestContext = { operator: null, requestId: 'req_1' }
    let caught: unknown
    try {
      requirePermission(ctx, 'manage_team')
    } catch (err) {
      caught = err
    }
    const response = errorResponse(caught, 'req_1')
    expect(response.status).toBe(401)
  })

  it('response body for a 401 matches CONTRACT.md exactly: kind, retryable, requestId', async () => {
    const ctx: RequestContext = { operator: null, requestId: 'req_2' }
    let caught: unknown
    try {
      requirePermission(ctx, 'manage_team')
    } catch (err) {
      caught = err
    }
    const response = errorResponse(caught, 'req_2')
    const body = (await response.json()) as ApiErrorBody
    expect(body).toMatchObject({
      status: 401,
      kind: 'unauthorized',
      retryable: false,
      requestId: 'req_2',
    })
    expect(body.details).toEqual([])
  })

  it('a 403 names the missing permission (AC-1272)', async () => {
    const ctx: RequestContext = { operator: { userId: 'u1', role: 'Support', permissions: ['view_support'], sessionId: 's1' }, requestId: 'req_3' }
    let caught: unknown
    try {
      requirePermission(ctx, 'manage_team')
    } catch (err) {
      caught = err
    }
    const response = errorResponse(caught, 'req_3')
    expect(response.status).toBe(403)
    const body = (await response.json()) as ApiErrorBody
    expect(body.kind).toBe('forbidden')
    expect(body.retryable).toBe(false)
    expect(body.details).toEqual([{ field: 'manage_team', code: 'permission', message: expect.any(String) }])
  })

  it('passes and returns the operator when the permission is held', () => {
    const ctx: RequestContext = {
      operator: { userId: 'u1', role: 'Owner', permissions: ['manage_team'], sessionId: 's1' },
      requestId: 'req_4',
    }
    expect(requirePermission(ctx, 'manage_team').userId).toBe('u1')
  })
})
