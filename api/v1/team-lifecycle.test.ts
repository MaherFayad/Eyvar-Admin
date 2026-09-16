/**
 * The team lifecycle through the real router: invite, resend, revoke,
 * suspend, reinstate, offboard, permission overrides, and F-016's
 * last-holder guard — including two simultaneous removals of the last two
 * holders, which must not both succeed. */
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { createTestDatabase, seedSession, seedUser } from '../_test/db'
import type { Database } from '../_lib/db'
import { createApiHandler } from './[...route]'
import { signSessionId } from '../_lib/auth'
import type { ApiErrorBody } from '../_lib/errors'
import type { TeamUser } from '@/data/types/session'

const SESSION_SECRET = 'wp-6.2b-team-secret'

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

function req(method: string, path: string, body: unknown, cookie: string, idempotencyKey?: string): Request {
  const headers: Record<string, string> = { cookie }
  const init: RequestInit = { method, headers }
  if (body !== undefined) {
    headers['content-type'] = 'application/json'
    init.body = JSON.stringify(body)
  }
  if (idempotencyKey) headers['idempotency-key'] = idempotencyKey
  return new Request(`http://localhost/api/v1${path}`, init)
}

async function ownerCookie(email: string): Promise<string> {
  const owner = await seedUser(db, { email, password: 'pw-correct', roleId: 'Owner' })
  const sessionId = await seedSession(db, { userId: owner.id })
  return cookieFor(sessionId)
}

describe('team lifecycle permission gate', () => {
  it('a signed-in operator without manage_team is refused on every mutating operation, naming the permission', async () => {
    const dispatcher = await seedUser(db, { email: 'dispatcher@eyvar.test', password: 'pw', roleId: 'Dispatcher' })
    const cookie = cookieFor(await seedSession(db, { userId: dispatcher.id }))

    const invite = await handler(req('POST', '/team/operators', { name: 'X', email: 'x@eyvar.test', phone: null, role: 'Support', compensationCapHalalas: null }, cookie))
    const suspend = await handler(req('POST', `/team/operators/${dispatcher.id}/suspend`, undefined, cookie))
    const override = await handler(req('PUT', `/team/operators/${dispatcher.id}/override`, { granted: [], revoked: [] }, cookie))

    for (const response of [invite, suspend, override]) {
      expect(response.status).toBe(403)
      const body = (await response.json()) as ApiErrorBody
      expect(body.details).toEqual([{ field: 'manage_team', code: 'permission', message: expect.any(String) }])
    }
  })

  it('a suspended operator reads as signed out on the very endpoint that suspended someone else', async () => {
    const owner = await seedUser(db, { email: 'owner-a@eyvar.test', password: 'pw', roleId: 'Owner' })
    const ownerCookieValue = cookieFor(await seedSession(db, { userId: owner.id }))
    const target = await seedUser(db, { email: 'target@eyvar.test', password: 'pw', roleId: 'Support' })
    const targetSessionId = await seedSession(db, { userId: target.id })
    const targetCookie = cookieFor(targetSessionId)

    const suspend = await handler(req('POST', `/team/operators/${target.id}/suspend`, undefined, ownerCookieValue))
    expect(suspend.status).toBe(200)

    const after = await handler(req('GET', '/session', undefined, targetCookie))
    expect(after.status).toBe(401)
  })
})

describe('the invite lifecycle', () => {
  it('invites, activates once, and the token is single-use', async () => {
    const cookie = await ownerCookie('owner-b@eyvar.test')

    const invite = await handler(
      req('POST', '/team/operators', { name: 'Noura', email: 'noura@eyvar.test', phone: null, role: 'Support', compensationCapHalalas: null }, cookie),
    )
    expect(invite.status).toBe(201)
    const created = (await invite.json()) as TeamUser
    expect(created.status).toBe('Invited')
    expect(created.secondFactor).toBeNull()

    const tokenRows = await db.sql<{ token: string }>`SELECT token FROM invites WHERE user_id = ${created.id}`
    const token = tokenRows[0]!.token

    const activate = await handler(new Request('http://localhost/api/v1/auth/activate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, password: 'a-strong-passw0rd!' }),
    }))
    expect(activate.status).toBe(200)
    expect(await activate.json()).toEqual({ kind: 'reset', otherSessionsEnded: 0 })

    const statusRows = await db.sql<{ status: string }>`SELECT status FROM users WHERE id = ${created.id}`
    expect(statusRows[0]!.status).toBe('Active')

    /* Single-use: the row is gone, so a replay resolves `unknown`, not `used`. */
    const replay = await handler(new Request('http://localhost/api/v1/auth/activate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, password: 'another-strong-1!' }),
    }))
    expect(await replay.json()).toEqual({ kind: 'failed', reason: 'unknown' })
  })

  it('an expired invite is refused, not silently activated', async () => {
    const cookie = await ownerCookie('owner-c@eyvar.test')
    const invite = await handler(
      req('POST', '/team/operators', { name: 'Late', email: 'late@eyvar.test', phone: null, role: 'Support', compensationCapHalalas: null }, cookie),
    )
    const created = (await invite.json()) as TeamUser
    await db.sql`UPDATE invites SET expires_at = now() - interval '1 hour' WHERE user_id = ${created.id}`
    const tokenRows = await db.sql<{ token: string }>`SELECT token FROM invites WHERE user_id = ${created.id}`

    const activate = await handler(new Request('http://localhost/api/v1/auth/activate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: tokenRows[0]!.token, password: 'a-strong-passw0rd!' }),
    }))
    expect(await activate.json()).toEqual({ kind: 'failed', reason: 'expired' })

    const validate = await handler(new Request(`http://localhost/api/v1/auth/reset-token/${tokenRows[0]!.token}`))
    expect((await validate.json()) as { state: string }).toMatchObject({ state: 'expired' })
  })

  it('resend keeps the operator Invited and revoke removes the record entirely', async () => {
    const cookie = await ownerCookie('owner-d@eyvar.test')
    const invite = await handler(
      req('POST', '/team/operators', { name: 'Sami', email: 'sami@eyvar.test', phone: null, role: 'Support', compensationCapHalalas: null }, cookie),
    )
    const created = (await invite.json()) as TeamUser

    const resend = await handler(req('POST', `/team/invites/${created.id}/resend`, undefined, cookie))
    expect(resend.status).toBe(200)
    expect((await resend.json()) as { resendCount: number }).toMatchObject({ resendCount: 1 })

    const revoke = await handler(req('DELETE', `/team/invites/${created.id}`, undefined, cookie))
    expect(revoke.status).toBe(200)
    expect(await revoke.json()).toEqual({ revoked: true })

    const gone = await db.sql<{ id: string }>`SELECT id FROM users WHERE id = ${created.id}`
    expect(gone).toHaveLength(0)
  })

  it('resending or revoking an already-active operator is refused, not a silent no-op', async () => {
    const cookie = await ownerCookie('owner-e@eyvar.test')
    const active = await seedUser(db, { email: 'already-active@eyvar.test', password: 'pw', roleId: 'Support' })

    const resend = await handler(req('POST', `/team/invites/${active.id}/resend`, undefined, cookie))
    expect(resend.status).toBe(409)
    expect(((await resend.json()) as ApiErrorBody).code).toBe('not_invited')
  })
})

describe('suspend, reinstate, offboard', () => {
  it('suspend then reinstate round-trips the status', async () => {
    const cookie = await ownerCookie('owner-f@eyvar.test')
    const support = await seedUser(db, { email: 'support-a@eyvar.test', password: 'pw', roleId: 'Support' })

    const suspend = await handler(req('POST', `/team/operators/${support.id}/suspend`, undefined, cookie))
    expect((await suspend.json()) as TeamUser).toMatchObject({ status: 'Suspended' })

    const reinstate = await handler(req('POST', `/team/operators/${support.id}/reinstate`, undefined, cookie))
    expect((await reinstate.json()) as TeamUser).toMatchObject({ status: 'Active' })
  })

  it('offboarding removes the record; reinstating a never-suspended operator is refused', async () => {
    const cookie = await ownerCookie('owner-g@eyvar.test')
    const support = await seedUser(db, { email: 'support-b@eyvar.test', password: 'pw', roleId: 'Support' })

    const badReinstate = await handler(req('POST', `/team/operators/${support.id}/reinstate`, undefined, cookie))
    expect(badReinstate.status).toBe(409)
    expect(((await badReinstate.json()) as ApiErrorBody).code).toBe('not_suspended')

    const offboard = await handler(req('DELETE', `/team/operators/${support.id}`, undefined, cookie))
    expect(await offboard.json()).toEqual({ offboarded: true })
    const gone = await db.sql<{ id: string }>`SELECT id FROM users WHERE id = ${support.id}`
    expect(gone).toHaveLength(0)
  })
})

describe('F-016 — the last manage_team holder', () => {
  it('refuses to suspend the sole holder, naming the rule', async () => {
    const sole = await seedUser(db, { email: 'sole-owner@eyvar.test', password: 'pw', roleId: 'Owner' })
    const cookie = cookieFor(await seedSession(db, { userId: sole.id }))

    const suspend = await handler(req('POST', `/team/operators/${sole.id}/suspend`, undefined, cookie))
    expect(suspend.status).toBe(409)
    const body = (await suspend.json()) as ApiErrorBody
    expect(body.code).toBe('last_manage_team_holder')
    expect(body.message).toMatch(/manage_team/)
  })

  it('refuses to offboard the sole holder', async () => {
    const sole = await seedUser(db, { email: 'sole-owner-2@eyvar.test', password: 'pw', roleId: 'Owner' })
    const cookie = cookieFor(await seedSession(db, { userId: sole.id }))

    const offboard = await handler(req('DELETE', `/team/operators/${sole.id}`, undefined, cookie))
    expect(offboard.status).toBe(409)
    expect(((await offboard.json()) as ApiErrorBody).code).toBe('last_manage_team_holder')
  })

  it('refuses an override that would revoke manage_team from the sole holder', async () => {
    const sole = await seedUser(db, { email: 'sole-owner-3@eyvar.test', password: 'pw', roleId: 'Owner' })
    const cookie = cookieFor(await seedSession(db, { userId: sole.id }))

    const override = await handler(req('PUT', `/team/operators/${sole.id}/override`, { granted: [], revoked: ['manage_team'] }, cookie))
    expect(override.status).toBe(409)
    expect(((await override.json()) as ApiErrorBody).code).toBe('last_manage_team_holder')
  })

  it('allows suspending one of two holders, leaving exactly one', async () => {
    const first = await seedUser(db, { email: 'holder-1@eyvar.test', password: 'pw', roleId: 'Owner' })
    await seedUser(db, { email: 'holder-2@eyvar.test', password: 'pw', roleId: 'Owner' })
    const cookie = cookieFor(await seedSession(db, { userId: first.id }))

    const suspend = await handler(req('POST', `/team/operators/${first.id}/suspend`, undefined, cookie))
    expect(suspend.status).toBe(200)
  })

  /**
   * Two simultaneous removals of the last two holders must not both succeed.
   * `holder-1`/`holder-2` are the whole roster's `manage_team` holders (two
   * `Owner`s, nobody else); suspending both must leave exactly one, and the
   * loser sees the guard's refusal, not a generic error. */
  it('two concurrent suspends of the last two holders: exactly one succeeds, the database arbitrates', async () => {
    const first = await seedUser(db, { email: 'race-holder-1@eyvar.test', password: 'pw', roleId: 'Owner' })
    const second = await seedUser(db, { email: 'race-holder-2@eyvar.test', password: 'pw', roleId: 'Owner' })
    const cookieA = cookieFor(await seedSession(db, { userId: first.id }))
    const cookieB = cookieFor(await seedSession(db, { userId: second.id }))

    const results = await Promise.allSettled([
      handler(req('POST', `/team/operators/${first.id}/suspend`, undefined, cookieA)),
      handler(req('POST', `/team/operators/${second.id}/suspend`, undefined, cookieB)),
    ])
    const statuses = results
      .map((r) => (r.status === 'fulfilled' ? r.value.status : -1))
      .sort((a, b) => a - b)
    expect(statuses).toEqual([200, 409])

    const activeHolders = await db.sql<{ count: string | number }>`
      SELECT count(*) FROM users WHERE role_id = 'Owner' AND status = 'Active'
        AND id IN (${first.id}, ${second.id})
    `
    expect(Number(activeHolders[0]!.count)).toBe(1)
  })

  it('two concurrent offboards of the last two holders: exactly one succeeds', async () => {
    const first = await seedUser(db, { email: 'race-off-1@eyvar.test', password: 'pw', roleId: 'Owner' })
    const second = await seedUser(db, { email: 'race-off-2@eyvar.test', password: 'pw', roleId: 'Owner' })
    const cookieA = cookieFor(await seedSession(db, { userId: first.id }))
    const cookieB = cookieFor(await seedSession(db, { userId: second.id }))

    const results = await Promise.allSettled([
      handler(req('DELETE', `/team/operators/${first.id}`, undefined, cookieA)),
      handler(req('DELETE', `/team/operators/${second.id}`, undefined, cookieB)),
    ])
    const statuses = results
      .map((r) => (r.status === 'fulfilled' ? r.value.status : -1))
      .sort((a, b) => a - b)
    expect(statuses).toEqual([200, 409])

    const remaining = await db.sql<{ id: string }>`SELECT id FROM users WHERE id IN (${first.id}, ${second.id})`
    expect(remaining).toHaveLength(1)
  })
})

describe('permission overrides (RBAC)', () => {
  it('grants and revokes, dropping anything that merely restates the baseline', async () => {
    const cookie = await ownerCookie('owner-h@eyvar.test')
    const support = await seedUser(db, { email: 'support-c@eyvar.test', password: 'pw', roleId: 'Support' })

    const override = await handler(
      req('PUT', `/team/operators/${support.id}/override`, { granted: ['release_escrow', 'view_support'], revoked: [] }, cookie),
    )
    expect(override.status).toBe(200)
    const updated = (await override.json()) as TeamUser
    /* `view_support` is already in Support's baseline, so it is dropped from the stored delta. */
    expect(updated.permissionDelta).toEqual({ role: 'Support', granted: ['release_escrow'], revoked: [] })
    expect(updated.permissions).toContain('release_escrow')
  })
})

describe('nothing leaks a hash or a token', () => {
  it('the invite response and the roster never carry password_hash or a raw token field', async () => {
    const cookie = await ownerCookie('owner-i@eyvar.test')
    const invite = await handler(
      req('POST', '/team/operators', { name: 'Leak Check', email: 'leakcheck@eyvar.test', phone: null, role: 'Support', compensationCapHalalas: null }, cookie),
    )
    const text = await invite.text()
    expect(text).not.toMatch(/password_hash/i)
    expect(text).not.toMatch(/scrypt\$/)

    const roster = await handler(req('GET', '/team-users', undefined, cookie))
    const rosterText = await roster.text()
    expect(rosterText).not.toMatch(/password_hash/i)
    expect(rosterText).not.toMatch(/scrypt\$/)
  })
})
