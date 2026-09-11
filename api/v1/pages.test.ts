/**
 * `pages.*` through the real router — WP-6.5: AC-1279 (optimistic
 * concurrency), AC-1280's first half (`page_reports` rebuilt on save), and
 * AC-1281 (server-side `validatePage`).
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { createTestDatabase, seedSession, seedUser } from '../_test/db'
import type { Database } from '../_lib/db'
import { createApiHandler } from './[...route]'
import { signSessionId } from '../_lib/auth'
import type { ApiErrorBody } from '../_lib/errors'
import type { Page } from '@/data/types/page'

const SESSION_SECRET = 'wp-6.5-pages-secret'

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

function blankBlocksPage(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    kind: 'dashboard',
    title: 'Weekly ops review',
    visibility: 'team',
    blocks: [],
    ...overrides,
  }
}

describe('creating a page', () => {
  it('creates with version 1 and no report embeds', async () => {
    const cookie = await operatorCookie('page-owner@eyvar.test')
    const response = await handler(req('POST', '/pages', blankBlocksPage(), cookie))
    expect(response.status).toBe(201)
    const body = (await response.json()) as { data: Page }
    expect(body.data.version).toBe(1)
    expect(body.data.title).toBe('Weekly ops review')
  })

  it('403s a signed-in operator without view_analytics, naming the permission', async () => {
    // Every seeded role in 0002_auth.sql carries view_analytics except none is
    // omitted deliberately in fixtures — Dispatcher does not.
    const cookie = await operatorCookie('dispatcher@eyvar.test', 'Dispatcher')
    const response = await handler(req('POST', '/pages', blankBlocksPage(), cookie))
    expect(response.status).toBe(403)
    const body = (await response.json()) as ApiErrorBody
    expect(body.details).toEqual([{ field: 'view_analytics', code: 'permission', message: expect.any(String) }])
  })
})

describe('AC-1281: validatePage runs server-side on every write', () => {
  it('refuses a page whose columns block holds too many columns, with the validator code', async () => {
    const cookie = await operatorCookie('validator-1@eyvar.test')
    const tooManyColumns = blankBlocksPage({
      blocks: [
        {
          id: 'col-1',
          type: 'columns',
          columns: [
            { width: 3, blocks: [] },
            { width: 3, blocks: [] },
            { width: 3, blocks: [] },
            { width: 3, blocks: [] },
            { width: 3, blocks: [] },
          ],
        },
      ],
    })
    const response = await handler(req('POST', '/pages', tooManyColumns, cookie))
    expect(response.status).toBe(422)
    const body = (await response.json()) as ApiErrorBody
    expect(body.details.some((d) => d.code === 'columns-count')).toBe(true)
  })

  it('refuses a page with duplicate block ids, and never stores it', async () => {
    const cookie = await operatorCookie('validator-2@eyvar.test')
    const duplicateIds = blankBlocksPage({
      blocks: [
        { id: 'dup', type: 'heading', level: 1, text: 'A' },
        { id: 'dup', type: 'heading', level: 1, text: 'B' },
      ],
    })
    const response = await handler(req('POST', '/pages', duplicateIds, cookie))
    expect(response.status).toBe(422)
    const body = (await response.json()) as ApiErrorBody
    expect(body.details.some((d) => d.code === 'duplicate-block-id')).toBe(true)

    const list = await db.sql<{ count: string }>`SELECT count(*)::text AS count FROM pages`
    expect(list[0]!.count).toBe('0')
  })

  it('refuses an invalid PATCH before touching the row, leaving the version unchanged', async () => {
    const cookie = await operatorCookie('validator-3@eyvar.test')
    const created = await handler(req('POST', '/pages', blankBlocksPage(), cookie))
    const page = ((await created.json()) as { data: Page }).data

    const invalidPatch = await handler(
      req(
        'PATCH',
        `/pages/${page.id}`,
        { version: page.version, blocks: [{ id: 'a', type: 'toggle', title: 'x', open: true, blocks: [{ id: 'b', type: 'toggle', title: 'y', open: true, blocks: [] }] }] },
        cookie,
      ),
    )
    expect(invalidPatch.status).toBe(422)
    const body = (await invalidPatch.json()) as ApiErrorBody
    expect(body.details.some((d) => d.code === 'toggle-in-toggle')).toBe(true)

    const rows = await db.sql<{ version: number }>`SELECT version FROM pages WHERE id = ${page.id}`
    expect(rows[0]!.version).toBe(1)
  })
})

describe('AC-1279: PATCH with a stale version', () => {
  it('returns 409 with details[0].code = stale, and the first writer\'s edit stands', async () => {
    const cookie = await operatorCookie('writer-a@eyvar.test')
    const created = await handler(req('POST', '/pages', blankBlocksPage({ title: 'Original' }), cookie))
    const page = ((await created.json()) as { data: Page }).data

    // Two writers load the same version, then both try to save.
    const firstWrite = await handler(req('PATCH', `/pages/${page.id}`, { version: page.version, title: 'Writer A' }, cookie))
    expect(firstWrite.status).toBe(200)
    const firstBody = ((await firstWrite.json()) as { data: Page }).data
    expect(firstBody.version).toBe(2)

    // The second writer's stale version (still 1) is refused — the write never lands.
    const secondWrite = await handler(req('PATCH', `/pages/${page.id}`, { version: page.version, title: 'Writer B' }, cookie))
    expect(secondWrite.status).toBe(409)
    const errorBody = (await secondWrite.json()) as ApiErrorBody
    expect(errorBody.kind).toBe('conflict')
    expect(errorBody.details[0]).toMatchObject({ field: 'version', code: 'stale' })

    // The operator's own in-flight edit ("Writer B") was never sent as a
    // second confirmed write — the server state is exactly what the first
    // writer committed, proving the loser's write did not partially land.
    const currentRows = await db.sql<{ title: string; version: number }>`SELECT title, version FROM pages WHERE id = ${page.id}`
    expect(currentRows[0]).toEqual({ title: 'Writer A', version: 2 })
  })

  it('two concurrent writers racing on the same version: exactly one wins', async () => {
    const cookie = await operatorCookie('writer-race@eyvar.test')
    const created = await handler(req('POST', '/pages', blankBlocksPage(), cookie))
    const page = ((await created.json()) as { data: Page }).data

    const [a, b] = await Promise.all([
      handler(req('PATCH', `/pages/${page.id}`, { version: page.version, title: 'Racer A' }, cookie)),
      handler(req('PATCH', `/pages/${page.id}`, { version: page.version, title: 'Racer B' }, cookie)),
    ])
    const statuses = [a.status, b.status].sort()
    expect(statuses).toEqual([200, 409])

    const rows = await db.sql<{ version: number }>`SELECT version FROM pages WHERE id = ${page.id}`
    expect(rows[0]!.version).toBe(2)
  })
})

describe('AC-1280: page_reports is rebuilt on every save', () => {
  it('reflects exactly the reportIds embedded, and drops one removed on the next save', async () => {
    const cookie = await operatorCookie('embed-owner@eyvar.test')
    const withTwoReports = blankBlocksPage({
      blocks: [
        { id: 'r1', type: 'report', reportId: 'RPT-1', view: 'chart', height: 'M', title: null },
        {
          id: 'col',
          type: 'columns',
          columns: [
            { width: 6, blocks: [{ id: 'r2', type: 'report', reportId: 'RPT-2', view: 'table', height: 'S', title: null }] },
            { width: 6, blocks: [{ id: 'm1', type: 'metric', reportId: 'RPT-3', seriesId: null, format: 'value' }] },
          ],
        },
      ],
    })
    const created = await handler(req('POST', '/pages', withTwoReports, cookie))
    expect(created.status).toBe(201)
    const page = ((await created.json()) as { data: Page }).data

    const afterCreate = await db.sql<{ report_id: string }>`SELECT report_id FROM page_reports WHERE page_id = ${page.id} ORDER BY report_id`
    expect(afterCreate.map((r) => r.report_id)).toEqual(['RPT-1', 'RPT-2', 'RPT-3'])

    // Save again with RPT-2 dropped and a new one added — the index must
    // reflect only what is embedded now, never accumulate history.
    const patch = await handler(
      req(
        'PATCH',
        `/pages/${page.id}`,
        {
          version: page.version,
          blocks: [
            { id: 'r1', type: 'report', reportId: 'RPT-1', view: 'chart', height: 'M', title: null },
            { id: 'r4', type: 'report', reportId: 'RPT-4', view: 'chart', height: 'M', title: null },
          ],
        },
        cookie,
      ),
    )
    expect(patch.status).toBe(200)

    const afterPatch = await db.sql<{ report_id: string }>`SELECT report_id FROM page_reports WHERE page_id = ${page.id} ORDER BY report_id`
    expect(afterPatch.map((r) => r.report_id)).toEqual(['RPT-1', 'RPT-4'])
  })
})

describe('duplicate and star', () => {
  it('duplicate creates a fresh draft copy with its own version and reverse index', async () => {
    const cookie = await operatorCookie('dup-owner@eyvar.test')
    const created = await handler(
      req(
        'POST',
        '/pages',
        blankBlocksPage({ blocks: [{ id: 'r1', type: 'report', reportId: 'RPT-9', view: 'chart', height: 'M', title: null }] }),
        cookie,
      ),
    )
    const page = ((await created.json()) as { data: Page }).data

    const dup = await handler(req('POST', `/pages/${page.id}/duplicate`, undefined, cookie))
    expect(dup.status).toBe(201)
    const dupPage = ((await dup.json()) as { data: Page }).data
    expect(dupPage.id).not.toBe(page.id)
    expect(dupPage.version).toBe(1)
    expect(dupPage.official).toBe(false)
    expect(dupPage.publishedAt).toBeNull()

    const reports = await db.sql<{ report_id: string }>`SELECT report_id FROM page_reports WHERE page_id = ${dupPage.id}`
    expect(reports.map((r) => r.report_id)).toEqual(['RPT-9'])
  })

  it('star toggles on and off', async () => {
    const cookie = await operatorCookie('star-owner@eyvar.test')
    const created = await handler(req('POST', '/pages', blankBlocksPage(), cookie))
    const page = ((await created.json()) as { data: Page }).data

    const starOn = await handler(req('POST', `/pages/${page.id}/star`, undefined, cookie))
    expect(await starOn.json()).toEqual({ starred: true, starCount: 1 })

    const starOff = await handler(req('POST', `/pages/${page.id}/star`, undefined, cookie))
    expect(await starOff.json()).toEqual({ starred: false, starCount: 0 })
  })
})
