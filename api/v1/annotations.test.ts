/**
 * `annotations.*` through the real router — WP-6.5.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { createTestDatabase, seedSession, seedUser } from '../_test/db'
import type { Database } from '../_lib/db'
import { createApiHandler } from './[...route]'
import { signSessionId } from '../_lib/auth'
import type { ApiErrorBody } from '../_lib/errors'
import type { Annotation } from '@/data/types/annotation'

const SESSION_SECRET = 'wp-6.5-annotations-secret'

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

describe('annotations', () => {
  it('creates, lists (filtered by date range) and deletes', async () => {
    const cookie = await operatorCookie('annotation-owner@eyvar.test')

    const created = await handler(
      req('POST', '/annotations', { date: '2026-06-01', label: 'Price change', note: 'Raised fares 5%', kind: 'price' }, cookie),
    )
    expect(created.status).toBe(201)
    const annotation = ((await created.json()) as { data: Annotation }).data
    expect(annotation.kind).toBe('price')
    expect(annotation.createdBy).toBeTruthy()

    await handler(req('POST', '/annotations', { date: '2026-08-01', label: 'Outage', note: 'Dispatch down 1h', kind: 'incident' }, cookie))

    const filtered = await handler(req('GET', '/annotations?from=2026-07-01&to=2026-09-01', undefined, cookie))
    const filteredBody = (await filtered.json()) as { items: Annotation[] }
    expect(filteredBody.items.map((a) => a.label)).toEqual(['Outage'])

    const deleted = await handler(req('DELETE', `/annotations/${annotation.id}`, undefined, cookie))
    expect(await deleted.json()).toEqual({ deleted: true })

    const afterDelete = await handler(req('GET', '/annotations', undefined, cookie))
    const afterDeleteBody = (await afterDelete.json()) as { items: Annotation[] }
    expect(afterDeleteBody.items.map((a) => a.id)).not.toContain(annotation.id)
  })

  it('refuses an unknown kind', async () => {
    const cookie = await operatorCookie('annotation-badkind@eyvar.test')
    const response = await handler(
      req('POST', '/annotations', { date: '2026-06-01', label: 'X', note: '', kind: 'not-a-kind' }, cookie),
    )
    expect(response.status).toBe(422)
    const body = (await response.json()) as ApiErrorBody
    expect(body.details.some((d) => d.field === 'kind')).toBe(true)
  })

  it('403s without view_analytics, naming the permission', async () => {
    const cookie = await operatorCookie('annotation-dispatcher@eyvar.test', 'Dispatcher')
    const response = await handler(
      req('POST', '/annotations', { date: '2026-06-01', label: 'X', note: '', kind: 'other' }, cookie),
    )
    expect(response.status).toBe(403)
    const body = (await response.json()) as ApiErrorBody
    expect(body.details).toEqual([{ field: 'view_analytics', code: 'permission', message: expect.any(String) }])
  })
})
