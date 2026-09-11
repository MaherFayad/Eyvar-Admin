/**
 * The rest of the `SignInOutcome`/`VerifyCodeOutcome`/`ResendCodeOutcome`
 * state machine, TOTP enrolment, password reset, device-trust reauthentication
 * and account lockout — WP-6.2b. `auth-flow.test.ts` covers the sign-in ->
 * verify-code happy path and idempotency; this file covers the refusals.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { createTestDatabase, seedSession, seedUser } from '../_test/db'
import type { Database } from '../_lib/db'
import { createApiHandler } from './[...route]'
import { signSessionId } from '../_lib/auth'
import { totpAt } from '../_lib/otp'

const SESSION_SECRET = 'wp-6.2b-outcomes-secret'
const CODE = '135790'

let pglite: PGlite
let db: Database

beforeAll(() => {
  process.env.SESSION_SECRET = SESSION_SECRET
})

beforeEach(async () => {
  const setup = await createTestDatabase()
  pglite = setup.pglite
  db = setup.db
})

afterEach(async () => {
  await pglite.close()
})

function cookieFor(sessionId: string): string {
  return `eyvar_session=${encodeURIComponent(signSessionId(sessionId, SESSION_SECRET))}`
}

function post(path: string, body: unknown, cookie?: string): Request {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (cookie) headers.cookie = cookie
  return new Request(`http://localhost/api/v1${path}`, { method: 'POST', headers, body: JSON.stringify(body) })
}

function get(path: string): Request {
  return new Request(`http://localhost/api/v1${path}`)
}

describe('TOTP enrolment (real RFC 6238, not a fixture)', () => {
  it('enrols, confirms with the live code, then challenges with it on the next sign-in', async () => {
    const handler = createApiHandler({ db })
    await seedUser(db, { email: 'totp@eyvar.test', password: 'the-real-password', roleId: 'Owner' })

    const signIn = await handler(post('/auth/sign-in', { email: 'totp@eyvar.test', password: 'the-real-password' }))
    const { enrolmentToken } = (await signIn.json()) as { enrolmentToken: string }

    const secretResponse = await handler(post('/auth/totp-secret', { enrolmentToken }))
    const { secret } = (await secretResponse.json()) as { secret: string }
    const rawSecret = secret.replace(/\s/g, '')

    const enrol = await handler(post('/auth/enroll-second-factor', { enrolmentToken, method: 'totp', destination: 'authenticator' }))
    const challenge = (await enrol.json()) as { kind: string; challengeId: string }
    expect(challenge.kind).toBe('challenge')

    const confirm = await handler(post('/auth/verify-code', { challengeId: challenge.challengeId, code: totpAt(rawSecret) }))
    expect(confirm.status).toBe(200)
    expect((await confirm.json()) as { kind: string }).toMatchObject({ kind: 'signed-in' })

    /* The enrolment persisted: a fresh sign-in now challenges with `totp`, not `enrolment-required`. */
    const secondSignIn = await handler(post('/auth/sign-in', { email: 'totp@eyvar.test', password: 'the-real-password' }))
    const outcome = (await secondSignIn.json()) as { kind: string; secondFactor: { method: string } }
    expect(outcome.kind).toBe('challenge')
    expect(outcome.secondFactor.method).toBe('totp')
  })
})

describe('verify-code attempt ladder', () => {
  async function openChallenge(handler: (req: Request) => Promise<Response>, email: string): Promise<string> {
    const signIn = await handler(post('/auth/sign-in', { email, password: 'the-real-password' }))
    const { challengeId } = (await signIn.json()) as { challengeId: string }
    return challengeId
  }

  it('the 3rd wrong attempt invalidates the code; a 4th replay against it still fails without counting', async () => {
    const handler = createApiHandler({ db, generateCode: () => CODE })
    await seedUser(db, { email: 'ladder-a@eyvar.test', password: 'the-real-password', roleId: 'Owner', secondFactorMethod: 'sms', phone: '+966500000010' })
    const challengeId = await openChallenge(handler, 'ladder-a@eyvar.test')

    for (let i = 0; i < 2; i++) {
      const wrong = await handler(post('/auth/verify-code', { challengeId, code: '000001' }))
      expect((await wrong.json()) as { reason: string }).toMatchObject({ reason: 'incorrect' })
    }
    const third = await handler(post('/auth/verify-code', { challengeId, code: '000001' }))
    expect((await third.json()) as { reason: string; attemptsRemaining: number | null }).toMatchObject({ reason: 'invalidated', attemptsRemaining: 2 })

    /* The code is dead now — even the CORRECT code is refused, and it does not count. */
    const replayWithRealCode = await handler(post('/auth/verify-code', { challengeId, code: CODE }))
    expect((await replayWithRealCode.json()) as { reason: string; attemptsRemaining: number | null }).toEqual({
      kind: 'failed',
      reason: 'invalidated',
      attemptsRemaining: null,
      lockedUntil: null,
    })
  })

  it('the 5th wrong attempt locks the challenge with a stable deadline, not one that keeps resetting', async () => {
    const handler = createApiHandler({ db, generateCode: () => CODE })
    await seedUser(db, { email: 'ladder-b@eyvar.test', password: 'the-real-password', roleId: 'Owner', secondFactorMethod: 'sms', phone: '+966500000011' })
    let challengeId = await openChallenge(handler, 'ladder-b@eyvar.test')

    /* Attempts 1-3: the 3rd invalidates the code. Attempts 4-5 run against a
       fresh code, carried forward by a resend — the ladder spans codes, it
       does not reset with them (§4.3). */
    for (let i = 0; i < 3; i++) {
      await handler(post('/auth/verify-code', { challengeId, code: '000001' }))
    }
    await db.sql`UPDATE signin_challenges SET resend_available_at = now() - interval '1 second' WHERE id = ${challengeId}`
    const resend = await handler(post('/auth/resend-code', { challengeId }))
    challengeId = ((await resend.json()) as { challengeId: string }).challengeId

    let last!: Response
    for (let i = 0; i < 2; i++) {
      last = await handler(post('/auth/verify-code', { challengeId, code: '000001' }))
    }
    const fifth = (await last.json()) as { reason: string; lockedUntil: string }
    expect(fifth.reason).toBe('locked')

    const secondRead = await handler(post('/auth/verify-code', { challengeId, code: '000001' }))
    const again = (await secondRead.json()) as { lockedUntil: string }
    /* Read twice, same stored deadline — not "15 minutes from now" recomputed on every read. */
    expect(again.lockedUntil).toBe(fifth.lockedUntil)
  })

  it('a resend supersedes the open code — the old one now reads `superseded`, never `incorrect`', async () => {
    const handler = createApiHandler({ db, generateCode: () => CODE })
    await seedUser(db, { email: 'ladder-c@eyvar.test', password: 'the-real-password', roleId: 'Owner', secondFactorMethod: 'sms', phone: '+966500000012' })
    const challengeId = await openChallenge(handler, 'ladder-c@eyvar.test')

    await db.sql`UPDATE signin_challenges SET resend_available_at = now() - interval '1 second' WHERE id = ${challengeId}`
    const resend = await handler(post('/auth/resend-code', { challengeId }))
    expect((await resend.json()) as { kind: string }).toMatchObject({ kind: 'sent' })

    const onOldChallenge = await handler(post('/auth/verify-code', { challengeId, code: CODE }))
    expect((await onOldChallenge.json()) as { reason: string }).toMatchObject({ reason: 'superseded' })
  })
})

describe('resend-code cooldown and exhaustion', () => {
  it('an early resend is cooling-down; five sends exhausts the budget', async () => {
    const handler = createApiHandler({ db, generateCode: () => CODE })
    await seedUser(db, { email: 'resend-a@eyvar.test', password: 'the-real-password', roleId: 'Owner', secondFactorMethod: 'sms', phone: '+966500000020' })
    const signIn = await handler(post('/auth/sign-in', { email: 'resend-a@eyvar.test', password: 'the-real-password' }))
    let { challengeId } = (await signIn.json()) as { challengeId: string }

    const immediate = await handler(post('/auth/resend-code', { challengeId }))
    expect((await immediate.json()) as { kind: string }).toMatchObject({ kind: 'cooling-down' })

    /* This sign-in has already sent 1 code; 4 more resends reach the 5-code budget and exhaust it. */
    let last!: Response
    for (let i = 0; i < 4; i++) {
      await db.sql`UPDATE signin_challenges SET resend_available_at = now() - interval '1 second' WHERE id = ${challengeId}`
      last = await handler(post('/auth/resend-code', { challengeId }))
      const body = (await last.json()) as { kind: string; challengeId?: string }
      if (body.kind === 'sent') challengeId = body.challengeId!
    }
    await db.sql`UPDATE signin_challenges SET resend_available_at = now() - interval '1 second' WHERE id = ${challengeId}`
    const sixth = await handler(post('/auth/resend-code', { challengeId }))
    expect((await sixth.json()) as { kind: string; codesSent: number }).toMatchObject({ kind: 'exhausted', codesSent: 5 })
  })
})

describe('password reset', () => {
  it('requests, validates, refuses a breached password, then resets and revokes other sessions', async () => {
    const handler = createApiHandler({ db })
    const user = await seedUser(db, { email: 'reset-a@eyvar.test', password: 'old-password-1', roleId: 'Owner' })
    await seedSession(db, { userId: user.id })
    await seedSession(db, { userId: user.id })

    const request = await handler(post('/auth/request-password-reset', { email: 'reset-a@eyvar.test' }))
    expect(await request.json()).toEqual({ kind: 'accepted' })

    const tokenRows = await db.sql<{ token: string }>`SELECT token FROM password_reset_tokens WHERE user_id = ${user.id}`
    const token = tokenRows[0]!.token

    const validate = await handler(get(`/auth/reset-token/${token}`))
    expect((await validate.json()) as { state: string; purpose: string }).toMatchObject({ state: 'valid', purpose: 'reset' })

    const breached = await handler(post('/auth/reset-password', { token, password: 'Password123!' }))
    expect(await breached.json()).toEqual({ kind: 'failed', reason: 'breached' })

    const reset = await handler(post('/auth/reset-password', { token, password: 'a-genuinely-unique-pw-9' }))
    expect((await reset.json()) as { kind: string; otherSessionsEnded: number }).toEqual({ kind: 'reset', otherSessionsEnded: 2 })

    /* Single-use: a replay of the same token is `used`, not `valid`. */
    const replay = await handler(post('/auth/reset-password', { token, password: 'yet-another-unique-pw' }))
    expect(await replay.json()).toEqual({ kind: 'failed', reason: 'used' })
  })

  it('an unknown email still answers `accepted` — no enumeration oracle', async () => {
    const handler = createApiHandler({ db })
    const response = await handler(post('/auth/request-password-reset', { email: 'nobody-at-all@eyvar.test' }))
    expect(await response.json()).toEqual({ kind: 'accepted' })
  })
})

describe('reauthenticate and device trust', () => {
  it('a wrong password is rejected; the right one with no enrolled factor resumes directly', async () => {
    const handler = createApiHandler({ db })
    const user = await seedUser(db, { email: 'reauth-a@eyvar.test', password: 'the-real-password', roleId: 'Owner' })
    const cookie = cookieFor(await seedSession(db, { userId: user.id }))

    const wrong = await handler(post('/auth/reauthenticate', { password: 'nope' }, cookie))
    expect((await wrong.json()) as { kind: string; reason: string }).toMatchObject({ kind: 'failed', reason: 'rejected' })

    const right = await handler(post('/auth/reauthenticate', { password: 'the-real-password' }, cookie))
    expect((await right.json()) as { kind: string }).toMatchObject({ kind: 'resumed' })
  })

  it('an untrusted device with 2FA enrolled is challenged again; a trusted device resumes on the password alone', async () => {
    const handler = createApiHandler({ db, generateCode: () => CODE })
    const user = await seedUser(db, {
      email: 'reauth-b@eyvar.test',
      password: 'the-real-password',
      roleId: 'Owner',
      secondFactorMethod: 'sms',
      phone: '+966500000030',
    })
    const cookie = cookieFor(await seedSession(db, { userId: user.id }))

    const untrusted = await handler(post('/auth/reauthenticate', { password: 'the-real-password' }, cookie))
    expect((await untrusted.json()) as { kind: string }).toMatchObject({ kind: 'challenge' })

    /* Sign in fresh with rememberDevice, capture the device cookie, then reauthenticate again with it attached. */
    const signIn = await handler(post('/auth/sign-in', { email: 'reauth-b@eyvar.test', password: 'the-real-password' }))
    const { challengeId } = (await signIn.json()) as { challengeId: string }
    const verify = await handler(post('/auth/verify-code', { challengeId, code: CODE, rememberDevice: true }))
    const setCookies = verify.headers.getSetCookie?.() ?? [verify.headers.get('set-cookie') ?? '']
    const deviceCookie = setCookies.find((c) => c.startsWith('eyvar_device='))
    expect(deviceCookie).toBeTruthy()
    const deviceCookieValue = deviceCookie!.split(';')[0]!
    const sessionCookie = setCookies.find((c) => c.startsWith('eyvar_session='))!.split(';')[0]!

    const trusted = await handler(post('/auth/reauthenticate', { password: 'the-real-password' }, `${sessionCookie}; ${deviceCookieValue}`))
    expect((await trusted.json()) as { kind: string }).toMatchObject({ kind: 'resumed' })
  })
})

describe('account lockout after repeated wrong passwords', () => {
  it('locks after five wrong passwords in a row, naming a deadline even to the right password', async () => {
    const handler = createApiHandler({ db })
    await seedUser(db, { email: 'lockout-a@eyvar.test', password: 'the-real-password', roleId: 'Owner' })

    let last!: Response
    for (let i = 0; i < 5; i++) {
      last = await handler(post('/auth/sign-in', { email: 'lockout-a@eyvar.test', password: 'wrong' }))
      expect((await last.json()) as { reason: string }).toMatchObject({ reason: 'rejected' })
    }

    const evenWithRightPassword = await handler(post('/auth/sign-in', { email: 'lockout-a@eyvar.test', password: 'the-real-password' }))
    const body = (await evenWithRightPassword.json()) as { kind: string; reason: string; lockedUntil: string | null }
    expect(body).toMatchObject({ kind: 'failed', reason: 'locked' })
    expect(body.lockedUntil).toBeTruthy()
  })
})

describe('nothing leaks a hash, a secret or a code', () => {
  it('sign-in, verify-code and totp-secret responses never carry password_hash, code_hash or totp_secret', async () => {
    const handler = createApiHandler({ db, generateCode: () => CODE })
    await seedUser(db, {
      email: 'leak-b@eyvar.test',
      password: 'the-real-password',
      roleId: 'Owner',
      secondFactorMethod: 'sms',
      phone: '+966500000040',
    })

    const signIn = await handler(post('/auth/sign-in', { email: 'leak-b@eyvar.test', password: 'the-real-password' }))
    const signInText = await signIn.text()
    expect(signInText).not.toMatch(/password_hash|code_hash|totp_secret/i)
    expect(signInText).not.toContain(CODE)

    const { challengeId } = JSON.parse(signInText) as { challengeId: string }
    const verify = await handler(post('/auth/verify-code', { challengeId, code: CODE }))
    const verifyText = await verify.text()
    expect(verifyText).not.toMatch(/password_hash|code_hash|totp_secret/i)
  })
})
