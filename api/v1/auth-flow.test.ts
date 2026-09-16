/**
 * End-to-end proof through the real router: `createApiHandler` wired to a
 * PGlite database, exercised with actual `Request`/`Response` objects — WP-6.2,
 * AC-1272 … AC-1274.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { createTestDatabase, seedSession, seedUser } from '../_test/db'
import type { Database } from '../_lib/db'
import { createApiHandler } from './[...route]'
import { signSessionId } from '../_lib/auth'
import type { ApiErrorBody } from '../_lib/errors'
import type { Session } from '@/data/types/session'

const SESSION_SECRET = 'wp-6.2-test-secret'

let pglite: PGlite
let db: Database
let handler: (req: Request) => Promise<Response>

beforeAll(() => {
  process.env.SESSION_SECRET = SESSION_SECRET
})

beforeEach(async () => {
  const setup = await createTestDatabase()
  pglite = setup.pglite
  db = setup.db
  handler = createApiHandler({ db })
})

afterEach(async () => {
  await pglite.close()
})

function cookieFor(sessionId: string): string {
  return `eyvar_session=${encodeURIComponent(signSessionId(sessionId, SESSION_SECRET))}`
}

function get(path: string, cookie?: string): Request {
  const headers: Record<string, string> = {}
  if (cookie) headers.cookie = cookie
  return new Request(`http://localhost/api/v1${path}`, { headers })
}

function post(path: string, body: unknown, opts: { cookie?: string; idempotencyKey?: string } = {}): Request {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (opts.cookie) headers.cookie = opts.cookie
  if (opts.idempotencyKey) headers['idempotency-key'] = opts.idempotencyKey
  return new Request(`http://localhost/api/v1${path}`, { method: 'POST', headers, body: JSON.stringify(body) })
}

describe('auth guard shapes (AC-1272)', () => {
  it('401 for a request with no session cookie, and it is not retryable', async () => {
    const response = await handler(get('/team-users'))
    expect(response.status).toBe(401)
    const body = (await response.json()) as ApiErrorBody
    expect(body.kind).toBe('unauthorized')
    expect(body.retryable).toBe(false)
    expect(body.requestId).toBeTruthy()
  })

  it('403 names the missing permission for a signed-in operator who lacks it', async () => {
    const user = await seedUser(db, { email: 'dispatcher@eyvar.test', password: 'pw-correct', roleId: 'Dispatcher' })
    const sessionId = await seedSession(db, { userId: user.id })

    const response = await handler(get('/team-users', cookieFor(sessionId)))

    expect(response.status).toBe(403)
    const body = (await response.json()) as ApiErrorBody
    expect(body.kind).toBe('forbidden')
    expect(body.retryable).toBe(false)
    expect(body.details).toEqual([{ field: 'manage_team', code: 'permission', message: expect.any(String) }])
  })

  it('200 for a signed-in operator who holds the permission', async () => {
    const user = await seedUser(db, { email: 'owner2@eyvar.test', password: 'pw-correct', roleId: 'Owner' })
    const sessionId = await seedSession(db, { userId: user.id })

    const response = await handler(get('/team-users', cookieFor(sessionId)))

    expect(response.status).toBe(200)
    const body = (await response.json()) as { items: unknown[] }
    expect(Array.isArray(body.items)).toBe(true)
  })

  it('an expired session reads as signed out (401), not as a server error', async () => {
    const user = await seedUser(db, { email: 'expired@eyvar.test', password: 'pw-correct', roleId: 'Owner' })
    const sessionId = await seedSession(db, { userId: user.id, expiresAt: new Date(Date.now() - 1000) })

    const response = await handler(get('/session', cookieFor(sessionId)))

    expect(response.status).toBe(401)
  })
})

describe('session.current (AC-1274)', () => {
  it("returns the operator's resolved PermissionKey[]", async () => {
    const user = await seedUser(db, { email: 'finance@eyvar.test', password: 'pw-correct', roleId: 'Finance' })
    const sessionId = await seedSession(db, { userId: user.id })

    const response = await handler(get('/session', cookieFor(sessionId)))

    expect(response.status).toBe(200)
    const session = (await response.json()) as Session
    expect(session.permissions).toEqual(
      expect.arrayContaining(['view_analytics', 'view_finance', 'process_payouts', 'release_escrow']),
    )
    expect(session.permissions).not.toContain('manage_team')
  })

  it('revoking a session (sign-out) invalidates its cookie for later requests', async () => {
    const user = await seedUser(db, { email: 'revoke2@eyvar.test', password: 'pw-correct', roleId: 'Support' })
    const sessionId = await seedSession(db, { userId: user.id })
    const cookie = cookieFor(sessionId)

    const signOutResponse = await handler(post('/auth/sign-out', undefined, { cookie }))
    expect(signOutResponse.status).toBe(200)
    expect(await signOutResponse.json()).toEqual({ signedOut: true })

    const after = await handler(get('/session', cookie))
    expect(after.status).toBe(401)
  })

  it('sign-out-everywhere ends every other session and leaves the caller signed in', async () => {
    const user = await seedUser(db, { email: 'multi@eyvar.test', password: 'pw-correct', roleId: 'Support' })
    const currentSessionId = await seedSession(db, { userId: user.id })
    await seedSession(db, { userId: user.id })
    await seedSession(db, { userId: user.id })
    const cookie = cookieFor(currentSessionId)

    const response = await handler(post('/auth/sign-out-everywhere', undefined, { cookie }))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ sessionsEnded: 2 })

    const stillSignedIn = await handler(get('/session', cookie))
    expect(stillSignedIn.status).toBe(200)
  })
})

/**
 * `signIn` never mints a session itself — it always returns a
 * `SignInOutcome` (200, even on rejection); the session is minted by
 * `verifyCode` once the second factor clears.
 */
describe('auth.signIn and idempotent replay (AC-1273, extended WP-6.2b)', () => {
  it('rejects an unknown email and a wrong password identically, as a 200 `failed` outcome', async () => {
    await seedUser(db, { email: 'known@eyvar.test', password: 'the-real-password', roleId: 'Owner' })

    const unknown = await handler(post('/auth/sign-in', { email: 'nobody@eyvar.test', password: 'x' }))
    const wrongPassword = await handler(post('/auth/sign-in', { email: 'known@eyvar.test', password: 'wrong' }))

    expect(unknown.status).toBe(200)
    expect(wrongPassword.status).toBe(200)
    expect(await unknown.json()).toMatchObject({ kind: 'failed', reason: 'rejected' })
    expect(await wrongPassword.json()).toMatchObject({ kind: 'failed', reason: 'rejected' })
  })

  it('an account with no second factor gets `enrolment-required`, not a session', async () => {
    await seedUser(db, { email: 'noenrol@eyvar.test', password: 'the-real-password', roleId: 'Owner' })

    const response = await handler(post('/auth/sign-in', { email: 'noenrol@eyvar.test', password: 'the-real-password' }))

    expect(response.status).toBe(200)
    const body = (await response.json()) as { kind: string; enrolmentToken: string }
    expect(body.kind).toBe('enrolment-required')
    expect(body.enrolmentToken).toBe('ENR-noenrol@eyvar.test')
  })

  it('signs in through the challenge and reaches a session with a Set-Cookie', async () => {
    await seedUser(db, {
      email: 'signin@eyvar.test',
      password: 'the-real-password',
      roleId: 'Owner',
      secondFactorMethod: 'sms',
      phone: '+966500000001',
    })
    const twoFactorHandler = createApiHandler({ db, generateCode: () => '424242' })

    const signIn = await twoFactorHandler(post('/auth/sign-in', { email: 'signin@eyvar.test', password: 'the-real-password' }))
    expect(signIn.status).toBe(200)
    const challenge = (await signIn.json()) as { kind: string; challengeId: string }
    expect(challenge.kind).toBe('challenge')

    const verify = await twoFactorHandler(post('/auth/verify-code', { challengeId: challenge.challengeId, code: '424242' }))
    expect(verify.status).toBe(200)
    expect(verify.headers.get('set-cookie')).toContain('eyvar_session=')
    const outcome = (await verify.json()) as { kind: string; session: Session }
    expect(outcome.kind).toBe('signed-in')
    expect(outcome.session.email).toBe('signin@eyvar.test')
  })

  it('a repeated Idempotency-Key on verify-code replays the identical body and creates only one session row', async () => {
    const user = await seedUser(db, {
      email: 'idem@eyvar.test',
      password: 'the-real-password',
      roleId: 'Owner',
      secondFactorMethod: 'sms',
      phone: '+966500000002',
    })
    const twoFactorHandler = createApiHandler({ db, generateCode: () => '424242' })
    const signIn = await twoFactorHandler(post('/auth/sign-in', { email: 'idem@eyvar.test', password: 'the-real-password' }))
    const { challengeId } = (await signIn.json()) as { challengeId: string }

    const first = await twoFactorHandler(
      post('/auth/verify-code', { challengeId, code: '424242' }, { idempotencyKey: 'verify-1' }),
    )
    const second = await twoFactorHandler(
      post('/auth/verify-code', { challengeId, code: '424242' }, { idempotencyKey: 'verify-1' }),
    )

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(await first.json()).toEqual(await second.json())

    const sessions = await db.sql<{ count: string | number }>`SELECT count(*) FROM sessions WHERE user_id = ${user.id}`
    expect(Number(sessions[0]!.count)).toBe(1)
  })

  it('two concurrent verify-code calls with the same Idempotency-Key create exactly one session', async () => {
    const user = await seedUser(db, {
      email: 'race@eyvar.test',
      password: 'the-real-password',
      roleId: 'Owner',
      secondFactorMethod: 'sms',
      phone: '+966500000003',
    })
    const twoFactorHandler = createApiHandler({ db, generateCode: () => '424242' })
    const signIn = await twoFactorHandler(post('/auth/sign-in', { email: 'race@eyvar.test', password: 'the-real-password' }))
    const { challengeId } = (await signIn.json()) as { challengeId: string }

    const results = await Promise.allSettled([
      twoFactorHandler(post('/auth/verify-code', { challengeId, code: '424242' }, { idempotencyKey: 'race-key' })),
      twoFactorHandler(post('/auth/verify-code', { challengeId, code: '424242' }, { idempotencyKey: 'race-key' })),
    ])

    const statuses = results.map((r) => (r.status === 'fulfilled' ? r.value.status : 'rejected')).sort()
    expect(statuses).toEqual([200, 409])

    const sessions = await db.sql<{ count: string | number }>`SELECT count(*) FROM sessions WHERE user_id = ${user.id}`
    expect(Number(sessions[0]!.count)).toBe(1)
  })
})
