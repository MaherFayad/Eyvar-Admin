/**
 * `reports.*` CRUD library through the real router — WP-6.5: tags, star,
 * duplicate, version history, and AC-1280's second half (`DELETE
 * /reports/:id` refused and naming the pages that pin it, read from
 * `page_reports`, never by scanning `pages.blocks_json`).
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { createTestDatabase, seedSession, seedUser } from '../_test/db'
import type { Database } from '../_lib/db'
import { createApiHandler } from './[...route]'
import { signSessionId } from '../_lib/auth'
import type { ApiErrorBody } from '../_lib/errors'
import type { Page } from '@/data/types/page'
import type { SavedReportWire } from '../_lib/handlers/reports'

const SESSION_SECRET = 'wp-6.5-reports-secret'

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

async function operatorCookie(email: string): Promise<string> {
  const user = await seedUser(db, { email, password: 'pw-correct', roleId: 'Ops Manager' })
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

const SAMPLE_QUERY = {
  measures: [{ key: 'trips.completed' }],
  groupBy: [],
  filters: [],
  window: { kind: 'preset', preset: 'last-30-days' },
  grain: 'day',
  periodComparison: 'none',
  chartType: 'line',
}

describe('the report CRUD lifecycle', () => {
  it('creates, lists, gets, updates and deletes', async () => {
    const cookie = await operatorCookie('report-owner@eyvar.test')

    const created = await handler(
      req('POST', '/reports', { name: 'Weekly trips', query: SAMPLE_QUERY, visibility: 'team', tags: ['ops'] }, cookie),
    )
    expect(created.status).toBe(201)
    const report = ((await created.json()) as { data: SavedReportWire }).data
    expect(report.tags).toEqual(['ops'])
    expect(report.starred).toBe(false)
    expect(report.pinnedPageIds).toEqual([])

    const listed = await handler(req('GET', '/reports', undefined, cookie))
    const list = (await listed.json()) as { items: SavedReportWire[] }
    expect(list.items.map((r) => r.id)).toContain(report.id)

    const got = await handler(req('GET', `/reports/${report.id}`, undefined, cookie))
    expect(got.status).toBe(200)

    const patched = await handler(req('PATCH', `/reports/${report.id}`, { name: 'Weekly trips v2' }, cookie))
    const patchedReport = ((await patched.json()) as { data: SavedReportWire }).data
    expect(patchedReport.name).toBe('Weekly trips v2')

    const deleted = await handler(req('DELETE', `/reports/${report.id}`, undefined, cookie))
    expect(deleted.status).toBe(200)
    expect(await deleted.json()).toEqual({ deleted: true })

    const afterDelete = await handler(req('GET', `/reports/${report.id}`, undefined, cookie))
    expect(afterDelete.status).toBe(404)
  })

  it('refuses a name over 80 characters', async () => {
    const cookie = await operatorCookie('report-name@eyvar.test')
    const response = await handler(req('POST', '/reports', { name: 'x'.repeat(81), query: SAMPLE_QUERY }, cookie))
    expect(response.status).toBe(422)
  })
})

describe('star and duplicate', () => {
  it('star toggles and star count is visible to another operator', async () => {
    const ownerCookie = await operatorCookie('star-report-owner@eyvar.test')
    const viewerCookie = await operatorCookie('star-report-viewer@eyvar.test')

    const created = await handler(req('POST', '/reports', { name: 'Starred', query: SAMPLE_QUERY, visibility: 'team' }, ownerCookie))
    const report = ((await created.json()) as { data: SavedReportWire }).data

    const star = await handler(req('POST', `/reports/${report.id}/star`, undefined, ownerCookie))
    expect(await star.json()).toEqual({ starred: true, starCount: 1 })

    const viewerGet = await handler(req('GET', `/reports/${report.id}`, undefined, viewerCookie))
    const viewerReport = ((await viewerGet.json()) as { data: SavedReportWire }).data
    expect(viewerReport.starCount).toBe(1)
    expect(viewerReport.starred).toBe(false)
  })

  it('duplicate copies the query and starts unofficial, unstarred, with its own name', async () => {
    const cookie = await operatorCookie('dup-report@eyvar.test')
    const created = await handler(req('POST', '/reports', { name: 'Original report', query: SAMPLE_QUERY }, cookie))
    const report = ((await created.json()) as { data: SavedReportWire }).data

    const dup = await handler(req('POST', `/reports/${report.id}/duplicate`, undefined, cookie))
    expect(dup.status).toBe(201)
    const dupReport = ((await dup.json()) as { data: SavedReportWire }).data
    expect(dupReport.id).not.toBe(report.id)
    expect(dupReport.name).toBe('Original report (copy)')
    expect(dupReport.query).toEqual(SAMPLE_QUERY)
    expect(dupReport.official).toBe(false)
  })
})

describe('version history', () => {
  it('records a version on every query change, newest first', async () => {
    const cookie = await operatorCookie('versions@eyvar.test')
    const created = await handler(req('POST', '/reports', { name: 'V', query: SAMPLE_QUERY }, cookie))
    const report = ((await created.json()) as { data: SavedReportWire }).data

    const secondQuery = { ...SAMPLE_QUERY, grain: 'week' }
    await handler(req('PATCH', `/reports/${report.id}`, { query: secondQuery }, cookie))

    const versions = await handler(req('GET', `/reports/${report.id}/versions`, undefined, cookie))
    const body = (await versions.json()) as { items: Array<{ query: unknown }> }
    expect(body.items).toHaveLength(2)
    expect(body.items[0]!.query).toEqual(secondQuery)
    expect(body.items[1]!.query).toEqual(SAMPLE_QUERY)
  })
})

describe('AC-1280: deleting a report pages embed is refused, naming the pages', () => {
  it('409s and names the pinning pages; deleting after the block is removed succeeds', async () => {
    const cookie = await operatorCookie('pinned-report@eyvar.test')

    const createdReport = await handler(req('POST', '/reports', { name: 'Pinned report', query: SAMPLE_QUERY }, cookie))
    const report = ((await createdReport.json()) as { data: SavedReportWire }).data

    const createdPage = await handler(
      req(
        'POST',
        '/pages',
        {
          kind: 'dashboard',
          title: 'Ops dashboard',
          visibility: 'team',
          blocks: [{ id: 'r1', type: 'report', reportId: report.id, view: 'chart', height: 'M', title: null }],
        },
        cookie,
      ),
    )
    const page = ((await createdPage.json()) as { data: Page }).data

    const refused = await handler(req('DELETE', `/reports/${report.id}`, undefined, cookie))
    expect(refused.status).toBe(409)
    const errorBody = (await refused.json()) as ApiErrorBody
    expect(errorBody.details).toHaveLength(1)
    expect(errorBody.details[0]!.code).toBe('pinned')
    expect(errorBody.details[0]!.message).toContain(page.title)
    expect(errorBody.details[0]!.message).toContain(page.id)

    // The report survives the refused delete.
    const stillThere = await handler(req('GET', `/reports/${report.id}`, undefined, cookie))
    expect(stillThere.status).toBe(200)

    // Editing the page to drop the block clears the reverse index, and the
    // delete that was refused a moment ago now succeeds.
    const unpin = await handler(req('PATCH', `/pages/${page.id}`, { version: page.version, blocks: [] }, cookie))
    expect(unpin.status).toBe(200)

    const nowDeletable = await handler(req('DELETE', `/reports/${report.id}`, undefined, cookie))
    expect(nowDeletable.status).toBe(200)
  })

  it('names every pinning page when more than one page embeds the report', async () => {
    const cookie = await operatorCookie('multi-pinned@eyvar.test')
    const createdReport = await handler(req('POST', '/reports', { name: 'Multi-pinned', query: SAMPLE_QUERY }, cookie))
    const report = ((await createdReport.json()) as { data: SavedReportWire }).data

    const pageBody = (title: string) => ({
      kind: 'dashboard',
      title,
      visibility: 'team',
      blocks: [{ id: 'r1', type: 'report', reportId: report.id, view: 'chart', height: 'M', title: null }],
    })
    const pageA = ((await (await handler(req('POST', '/pages', pageBody('Board A'), cookie))).json()) as { data: Page }).data
    const pageB = ((await (await handler(req('POST', '/pages', pageBody('Board B'), cookie))).json()) as { data: Page }).data

    const refused = await handler(req('DELETE', `/reports/${report.id}`, undefined, cookie))
    expect(refused.status).toBe(409)
    const errorBody = (await refused.json()) as ApiErrorBody
    expect(errorBody.details).toHaveLength(2)
    const names = errorBody.details.map((d) => d.message)
    expect(names.some((m) => m.includes(pageA.title))).toBe(true)
    expect(names.some((m) => m.includes(pageB.title))).toBe(true)
  })
})
