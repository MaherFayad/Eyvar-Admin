/**
 * `segments.*` through the real router — WP-6.5.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { createTestDatabase, seedSession, seedUser } from '../_test/db'
import type { Database } from '../_lib/db'
import { createApiHandler } from './[...route]'
import { signSessionId } from '../_lib/auth'
import type { ApiErrorBody } from '../_lib/errors'
import type { Segment } from '@/data/types/segment'

const SESSION_SECRET = 'wp-6.5-segments-secret'

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

async function operatorCookie(email: string, roleId = 'Ops Manager'): Promise<string> {
  const user = await seedUser(db, { email, password: 'pw-correct', roleId })
  const sessionId = await seedSession(db, { userId: user.id })
  return cookieFor(sessionId)
}

function req(method: string, path: string, body: unknown, cookie: string): Request {
  const headers: Record<string, string> = { cookie }
  const init: RequestInit = { method, headers }
  if (body !== undefined) {
    headers['content-type'] = 'application/json'
    init.body = JSON.stringify(body)
  }
  return new Request(`http://localhost/api/v1${path}`, init)
}

describe('segments CRUD', () => {
  it('creates, lists, gets, updates and deletes', async () => {
    const cookie = await operatorCookie('segment-owner@eyvar.test')

    const created = await handler(
      req(
        'POST',
        '/segments',
        { name: 'Riyadh riders', filters: [{ field: 'rider.city', op: 'eq', value: 'Riyadh' }], visibility: 'team' },
        cookie,
      ),
    )
    expect(created.status).toBe(201)
    const segment = ((await created.json()) as { data: Segment }).data
    expect(segment.filters).toEqual([{ field: 'rider.city', op: 'eq', value: 'Riyadh' }])
    expect(segment.performed).toBeNull()

    const listed = await handler(req('GET', '/segments', undefined, cookie))
    const list = (await listed.json()) as { items: Segment[] }
    expect(list.items.map((s) => s.id)).toContain(segment.id)

    const got = await handler(req('GET', `/segments/${segment.id}`, undefined, cookie))
    expect(got.status).toBe(200)

    const patched = await handler(req('PATCH', `/segments/${segment.id}`, { name: 'Riyadh riders v2' }, cookie))
    const patchedSegment = ((await patched.json()) as { data: Segment }).data
    expect(patchedSegment.name).toBe('Riyadh riders v2')

    const deleted = await handler(req('DELETE', `/segments/${segment.id}`, undefined, cookie))
    expect(await deleted.json()).toEqual({ deleted: true })

    const afterDelete = await handler(req('GET', `/segments/${segment.id}`, undefined, cookie))
    expect(afterDelete.status).toBe(404)
  })

  it('stores a performed spec and round-trips it', async () => {
    const cookie = await operatorCookie('segment-performed@eyvar.test')
    const performed = { measureKey: 'trips.completed', op: 'gte', count: 3, window: 'each-bucket' }
    const created = await handler(req('POST', '/segments', { name: 'Frequent riders', filters: [], performed }, cookie))
    const segment = ((await created.json()) as { data: Segment }).data
    expect(segment.performed).toEqual(performed)
  })

  it('403s without view_analytics, naming the permission', async () => {
    const cookie = await operatorCookie('segment-dispatcher@eyvar.test', 'Dispatcher')
    const response = await handler(req('POST', '/segments', { name: 'X', filters: [] }, cookie))
    expect(response.status).toBe(403)
    const body = (await response.json()) as ApiErrorBody
    expect(body.details).toEqual([{ field: 'view_analytics', code: 'permission', message: expect.any(String) }])
  })

  it('refuses a segment with no name', async () => {
    const cookie = await operatorCookie('segment-noname@eyvar.test')
    const response = await handler(req('POST', '/segments', { name: '', filters: [] }, cookie))
    expect(response.status).toBe(422)
  })
})
