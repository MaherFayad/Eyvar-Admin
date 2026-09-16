/**
 * Through the real router: F-V2-22 (`audit_log` receives a row for team,
 * rbac, page, report, segment, annotation writes), F-V2-21 (role CRUD,
 * `holdersOf`, `changeRole`, compensation cap, on-call rota, rate limiter),
 * and F-V2-38 (agent result validation per kind, `ask` included). */
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { createTestDatabase, seedSession, seedUser } from '../_test/db'
import type { Database } from '../_lib/db'
import { createApiHandler } from './[...route]'
import { signSessionId } from '../_lib/auth'
import type { ApiErrorBody } from '../_lib/errors'
import type { TeamUser } from '@/data/types/session'
import type { Role } from '@/data/types/rbac'
import type { Page } from '@/data/types/page'
import type { UserPreferences } from '@/data/types/session'

const SESSION_SECRET = 'wp-6.2c-secret'
const RUNNER_TOKEN = 'wp-6.2c-runner-token'

let pglite: PGlite
let db: Database
let handler: (req: Request) => Promise<Response>

beforeAll(() => {
  process.env.SESSION_SECRET = SESSION_SECRET
  process.env.AGENT_RUNNER_TOKEN = RUNNER_TOKEN
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

async function operatorCookie(email: string, roleId = 'Owner'): Promise<{ cookie: string; userId: string }> {
  const user = await seedUser(db, { email, password: 'pw-correct', roleId })
  const sessionId = await seedSession(db, { userId: user.id })
  return { cookie: cookieFor(sessionId), userId: user.id }
}

function req(method: string, path: string, body: unknown, headers: Record<string, string> = {}): Request {
  const h: Record<string, string> = { ...headers }
  const init: RequestInit = { method, headers: h }
  if (body !== undefined) {
    h['content-type'] = 'application/json'
    init.body = JSON.stringify(body)
  }
  return new Request(`http://localhost/api/v1${path}`, init)
}

interface AuditRow {
  action: string
  entity_type: string
  entity_id: string
  user_id: string
}

async function auditRowsFor(entityId: string): Promise<AuditRow[]> {
  return db.sql<AuditRow>`SELECT action, entity_type, entity_id, user_id FROM audit_log WHERE entity_id = ${entityId} ORDER BY at`
}

/* ─────────────────────────── F-V2-22: audit-log persistence ────────────────────────── */

describe('audit-log persistence (F-V2-22)', () => {
  it('team.invite and team.suspend each write one audit_log row naming the actor', async () => {
    const { cookie, userId: actorId } = await operatorCookie('audit-team-actor@eyvar.test')
    const invite = await handler(
      req('POST', '/team/operators', { name: 'Noura', email: 'audit-target@eyvar.test', phone: null, role: 'Support', compensationCapHalalas: null }, { cookie }),
    )
    const target = (await invite.json()) as TeamUser

    const inviteRows = await auditRowsFor(target.id)
    expect(inviteRows).toEqual([{ action: 'team.invite', entity_type: 'operator', entity_id: target.id, user_id: actorId }])

    // Activate so `suspend` finds an Active operator, matching the real lifecycle.
    const tokenRows = await db.sql<{ token: string }>`SELECT token FROM invites WHERE user_id = ${target.id}`
    await handler(
      new Request('http://localhost/api/v1/auth/activate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: tokenRows[0]!.token, password: 'a-strong-passw0rd!' }),
      }),
    )
    await handler(req('POST', `/team/operators/${target.id}/suspend`, { reason: 'left the team' }, { cookie }))
    const rows = await auditRowsFor(target.id)
    const suspendRow = rows.find((r) => r.action === 'team.suspend')
    expect(suspendRow).toEqual({ action: 'team.suspend', entity_type: 'operator', entity_id: target.id, user_id: actorId })
  })

  it('role.create, role.update and role.delete each write one audit_log row', async () => {
    const { cookie, userId } = await operatorCookie('audit-role-actor@eyvar.test')
    const created = await handler(req('POST', '/rbac/roles', { name: 'Auditor', basedOn: 'Support', permissions: ['view_support'] }, { cookie }))
    expect(created.status).toBe(201)

    const updated = await handler(req('PUT', '/rbac/roles/Auditor', { permissions: ['view_support', 'view_operations'] }, { cookie }))
    expect(updated.status).toBe(200)

    const deleted = await handler(req('DELETE', '/rbac/roles/Auditor', undefined, { cookie }))
    expect(deleted.status).toBe(200)

    const rows = await auditRowsFor('Auditor')
    expect(rows.map((r) => r.action)).toEqual(['role.create', 'role.update', 'role.delete'])
    expect(rows.every((r) => r.user_id === userId && r.entity_type === 'role')).toBe(true)
  })

  it('page.create, report.create, segment.create and annotation.create each write one audit_log row', async () => {
    const { cookie, userId } = await operatorCookie('audit-analytics-actor@eyvar.test')

    const page = await handler(req('POST', '/pages', { kind: 'dashboard', title: 'Weekly ops', visibility: 'team', blocks: [] }, { cookie }))
    const pageBody = ((await page.json()) as { data: Page }).data
    expect((await auditRowsFor(pageBody.id))[0]).toEqual({ action: 'page.create', entity_type: 'page', entity_id: pageBody.id, user_id: userId })

    const query = { measures: [{ key: 'trips.completed' }], groupBy: [], filters: [], window: { kind: 'preset', preset: 'last-30-days' }, grain: 'day', periodComparison: 'none', chartType: 'line' }
    const report = await handler(req('POST', '/reports', { name: 'Weekly trips', query }, { cookie }))
    const reportBody = ((await report.json()) as { data: { id: string } }).data
    expect((await auditRowsFor(reportBody.id))[0]).toMatchObject({ action: 'report.create', entity_type: 'report' })

    const segment = await handler(req('POST', '/segments', { name: 'Frequent riders', filters: [] }, { cookie }))
    const segmentBody = ((await segment.json()) as { data: { id: string } }).data
    expect((await auditRowsFor(segmentBody.id))[0]).toMatchObject({ action: 'segment.create', entity_type: 'segment' })

    const annotation = await handler(req('POST', '/annotations', { date: '2026-06-01', label: 'Launch', note: 'v2 shipped', kind: 'launch' }, { cookie }))
    const annotationBody = ((await annotation.json()) as { data: { id: string } }).data
    expect((await auditRowsFor(annotationBody.id))[0]).toMatchObject({ action: 'annotation.create', entity_type: 'annotation' })
  })
})

/* ─────────────────────────── F-V2-21: rbac.* ────────────────────────── */

describe('rbac.* (F-V2-21)', () => {
  it('lists the six built-in roles with holders computed from the roster', async () => {
    const { cookie } = await operatorCookie('rbac-list@eyvar.test')
    await seedUser(db, { email: 'another-owner@eyvar.test', password: 'pw', roleId: 'Owner' })
    const res = await handler(req('GET', '/rbac/roles', undefined, { cookie }))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { items: Role[] }
    expect(body.items.map((r) => r.name)).toEqual(['Owner', 'Ops Manager', 'Dispatcher', 'Trust & Safety', 'Finance', 'Support'])
    expect(body.items.every((r) => r.builtIn)).toBe(true)
    const owner = body.items.find((r) => r.name === 'Owner')!
    expect(owner.holders).toBe(2) // the caller plus the seeded second owner
  })

  it('creates a custom role, updates its permissions, then deletes it once unheld', async () => {
    const { cookie } = await operatorCookie('rbac-crud@eyvar.test')
    const created = await handler(req('POST', '/rbac/roles', { name: 'Auditor', basedOn: 'Support', permissions: ['view_support'] }, { cookie }))
    expect(created.status).toBe(201)
    const role = (await created.json()) as Role
    expect(role).toMatchObject({ name: 'Auditor', builtIn: false, basedOn: 'Support', permissions: ['view_support'], holders: 0 })

    const updated = await handler(req('PUT', '/rbac/roles/Auditor', { permissions: ['view_support', 'view_operations'] }, { cookie }))
    expect((await updated.json()) as Role).toMatchObject({ permissions: expect.arrayContaining(['view_support', 'view_operations']) })

    const deleted = await handler(req('DELETE', '/rbac/roles/Auditor', undefined, { cookie }))
    expect(await deleted.json()).toEqual({ deleted: true })
  })

  it('refuses to delete a custom role that still has holders', async () => {
    const { cookie } = await operatorCookie('rbac-holders@eyvar.test')
    await handler(req('POST', '/rbac/roles', { name: 'Auditor', basedOn: 'Support', permissions: ['view_support'] }, { cookie }))
    await seedUser(db, { email: 'auditor-1@eyvar.test', password: 'pw', roleId: 'Auditor' })

    const deleted = await handler(req('DELETE', '/rbac/roles/Auditor', undefined, { cookie }))
    expect(deleted.status).toBe(409)
    expect(((await deleted.json()) as ApiErrorBody).code).toBe('role_has_holders')
  })

  it('refuses a role edit that would leave nobody roster-wide holding manage_team (F-016)', async () => {
    const { cookie, userId } = await operatorCookie('rbac-f016@eyvar.test')
    // The caller is the sole Owner (the sole manage_team holder) and also the sole holder of a fresh custom role.
    await handler(req('POST', '/rbac/roles', { name: 'SoleRole', basedOn: 'Owner', permissions: ['manage_team', 'view_analytics'] }, { cookie }))
    await db.sql`UPDATE users SET role_id = 'SoleRole' WHERE id = ${userId}`

    const stripped = await handler(req('PUT', '/rbac/roles/SoleRole', { permissions: ['view_analytics'] }, { cookie }))
    expect(stripped.status).toBe(409)
    expect(((await stripped.json()) as ApiErrorBody).code).toBe('role_has_holders')
  })

  it('holdersOf names who holds a key and whether via the role baseline or a granted override', async () => {
    const { cookie, userId } = await operatorCookie('rbac-holdersof@eyvar.test')
    const support = await seedUser(db, { email: 'support-holder@eyvar.test', password: 'pw', roleId: 'Support' })
    await handler(req('PUT', `/team/operators/${support.id}/override`, { granted: ['release_escrow'], revoked: [] }, { cookie }))

    const res = await handler(req('GET', '/rbac/holders/release_escrow', undefined, { cookie }))
    const body = (await res.json()) as { items: Array<{ user: TeamUser; via: string }> }
    const entry = body.items.find((i) => i.user.id === support.id)
    expect(entry?.via).toBe('granted')

    const viewOpsRes = await handler(req('GET', '/rbac/holders/view_analytics', undefined, { cookie }))
    const viewOpsBody = (await viewOpsRes.json()) as { items: Array<{ user: TeamUser; via: string }> }
    expect(viewOpsBody.items.find((i) => i.user.id === userId)?.via).toBe('baseline')
  })
})

/* ─────────────────────────── F-V2-21: team gap list ────────────────────────── */

describe('team gap list (F-V2-21)', () => {
  it('changeRole moves an operator and clears any standing override', async () => {
    const { cookie } = await operatorCookie('changerole-actor@eyvar.test')
    const support = await seedUser(db, { email: 'changerole-target@eyvar.test', password: 'pw', roleId: 'Support' })
    await handler(req('PUT', `/team/operators/${support.id}/override`, { granted: ['release_escrow'], revoked: [] }, { cookie }))

    const res = await handler(req('POST', `/team/operators/${support.id}/role`, { role: 'Finance', reason: 'promotion' }, { cookie }))
    expect(res.status).toBe(200)
    const user = (await res.json()) as TeamUser
    expect(user.role).toBe('Finance')
    expect(user.permissionDelta).toBeNull()
  })

  it('refuses to change the sole manage_team holder to a role without it (F-016)', async () => {
    const { cookie, userId } = await operatorCookie('changerole-f016@eyvar.test')
    const res = await handler(req('POST', `/team/operators/${userId}/role`, { role: 'Support', reason: 'x' }, { cookie }))
    expect(res.status).toBe(409)
    expect(((await res.json()) as ApiErrorBody).code).toBe('last_manage_team_holder')
  })

  it('sets and clears a compensation cap', async () => {
    const { cookie } = await operatorCookie('cap-actor@eyvar.test')
    const finance = await seedUser(db, { email: 'cap-target@eyvar.test', password: 'pw', roleId: 'Finance' })

    const set = await handler(req('PUT', `/team/operators/${finance.id}/compensation-cap`, { capHalalas: 500_00 }, { cookie }))
    expect(((await set.json()) as TeamUser).compensationCapHalalas).toBe(500_00)

    const cleared = await handler(req('PUT', `/team/operators/${finance.id}/compensation-cap`, { capHalalas: null }, { cookie }))
    expect(((await cleared.json()) as TeamUser).compensationCapHalalas).toBeNull()
  })

  it('the on-call rota reads empty, sets both seats, and refuses a non-Active operator', async () => {
    const { cookie } = await operatorCookie('rota-actor@eyvar.test')
    const active = await seedUser(db, { email: 'rota-primary@eyvar.test', password: 'pw', roleId: 'Dispatcher' })
    const suspended = await seedUser(db, { email: 'rota-suspended@eyvar.test', password: 'pw', roleId: 'Dispatcher', status: 'Suspended' })

    const empty = await handler(req('GET', '/team/on-call', undefined, { cookie }))
    expect(await empty.json()).toMatchObject({ primaryUserId: null, secondaryUserId: null })

    const refused = await handler(req('PUT', '/team/on-call', { primaryUserId: suspended.id, secondaryUserId: null }, { cookie }))
    expect(refused.status).toBe(409)

    const set = await handler(req('PUT', '/team/on-call', { primaryUserId: active.id, secondaryUserId: null }, { cookie }))
    expect(set.status).toBe(200)
    expect(await set.json()).toMatchObject({ primaryUserId: active.id, secondaryUserId: null })
  })

  it('suspend releases the operator\'s claimed holdings (releaseHoldingsOf), reflected in the audit summary', async () => {
    const { cookie } = await operatorCookie('release-actor@eyvar.test')
    const support = await seedUser(db, { email: 'release-target@eyvar.test', password: 'pw', roleId: 'Support' })
    await db.sql`INSERT INTO claims (key, entity_type, entity_id, owner_id, state) VALUES ('tkt-1', 'ticket', 'tkt-1', ${support.id}, 'claimed')`

    const suspend = await handler(req('POST', `/team/operators/${support.id}/suspend`, { reason: 'x' }, { cookie }))
    expect(suspend.status).toBe(200)

    const claimRows = await db.sql<{ state: string; release_reason: string | null }>`SELECT state, release_reason FROM claims WHERE key = 'tkt-1'`
    expect(claimRows[0]).toMatchObject({ state: 'released' })

    const auditRows = await db.sql<{ summary_json: unknown }>`SELECT summary_json FROM audit_log WHERE entity_id = ${support.id} AND action = 'team.suspend'`
    const summary = auditRows[0]!.summary_json as { released: number }
    expect(summary.released).toBe(1)
  })
})

/* ─────────────────────────── F-V2-21: /me/preferences ────────────────────────── */

describe('/me/preferences (F-V2-21)', () => {
  it('reads the default, then a PATCH merges without clobbering the other field', async () => {
    const { cookie } = await operatorCookie('prefs-actor@eyvar.test')
    const initial = await handler(req('GET', '/me/preferences', undefined, { cookie }))
    expect(await initial.json()).toEqual({ subTabNavCollapsed: false, language: 'en' })

    const patched = await handler(req('PATCH', '/me/preferences', { subTabNavCollapsed: true }, { cookie }))
    expect((await patched.json()) as UserPreferences).toEqual({ subTabNavCollapsed: true, language: 'en' })

    const reread = await handler(req('GET', '/me/preferences', undefined, { cookie }))
    expect(await reread.json()).toEqual({ subTabNavCollapsed: true, language: 'en' })
  })
})

/* ─────────────────────────── F-V2-21: the sign-in rate limiter ────────────────────────── */

describe('the transport rate limiter (F-V2-21)', () => {
  it('the 11th sign-in attempt inside the window is refused 429 with Retry-After', async () => {
    let last: Response | null = null
    for (let i = 0; i < 11; i++) {
      last = await handler(
        new Request('http://localhost/api/v1/auth/sign-in', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: `nobody-${i}@eyvar.test`, password: 'whatever' }),
        }),
      )
    }
    expect(last!.status).toBe(429)
    expect(last!.headers.get('retry-after')).toBeTruthy()
    const body = (await last!.json()) as ApiErrorBody
    expect(body.code).toBe('rate_limited')
    expect(body.retryable).toBe(true)
  })
})

/* ─────────────────────────── F-V2-38: agent result validation per kind ────────────────────────── */

async function seedAskRun(jobId: string, userId: string): Promise<string> {
  const resultJson = {
    query: { measures: [{ key: 'trips.completed' }], groupBy: [], filters: [], window: { kind: 'preset', preset: 'last-30-days' }, grain: 'day', periodComparison: 'none', chartType: 'line' },
    asOf: '2026-06-25T09:00:00.000Z',
    buckets: ['2026-06-01', '2026-06-02', '2026-06-03'],
    panels: [],
    series: [{ id: 'trips.completed#_#current', measureKey: 'trips.completed', groupValue: null, role: 'current', panelId: 'p', unit: 'count', currency: null, temporality: 'flow', points: [10, 10, 10], partialBucketIndexes: [], blocked: null, failed: null }],
    truncated: false,
    truncatedAtRows: null,
    warnings: [],
    foldedGroupCount: null,
  }
  const rows = await db.sql<{ id: string }>`
    INSERT INTO report_runs (user_id, query_json, result_json, as_of, job_id)
    VALUES (${userId}, ${JSON.stringify(resultJson)}::jsonb, ${JSON.stringify(resultJson)}::jsonb, ${resultJson.asOf}, ${jobId})
    RETURNING id
  `
  return rows[0]!.id
}

function askResult(runId: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: 'Why did revenue drop?',
    language: 'en',
    question: 'Why did revenue drop last week?',
    answer: { text: 'Trips fell 10% week over week.', confidence: 'medium', confidenceReason: 'One week of data' },
    findings: [
      {
        id: 'f1',
        text: 'Trips totalled 30 over the window',
        values: [{ runId, seriesId: 'trips.completed#_#current', bucket: 'total', value: 30, unit: 'count', currency: null }],
        evidence: [runId],
        chart: null,
      },
    ],
    dataQuality: { gaps: [], partialBucketsExcluded: true, blockedSeries: [], truncated: false, coverageNote: 'Full coverage' },
    followUps: [],
    ...overrides,
  }
}

describe('agent result validation against agent/schemas (F-V2-38)', () => {
  async function createAndClaimJob(cookie: string, kind: string): Promise<string> {
    const created = await handler(req('POST', '/agent/jobs', { kind, question: 'Why did revenue drop?', language: 'en', contextObjects: [] }, { cookie }))
    expect(created.status).toBe(201)
    const job = (await created.json()) as { data: { id: string } }
    const claimed = await handler(req('POST', '/agent/jobs/claim', {}, { authorization: `Bearer ${RUNNER_TOKEN}` }))
    expect(claimed.status).toBe(200)
    return job.data.id
  }
  const createAndClaimAskJob = (cookie: string) => createAndClaimJob(cookie, 'ask')

  it('a build-page result is gated by page.schema.json before validatePage — an unknown block type is refused', async () => {
    const { cookie } = await operatorCookie('build-page-schema@eyvar.test')
    const jobId = await createAndClaimJob(cookie, 'build-page')

    const badKind = await handler(
      req('POST', `/agent/jobs/${jobId}/result`, { blocks: [{ id: 'b1', type: 'not-a-real-block' }] }, { authorization: `Bearer ${RUNNER_TOKEN}` }),
    )
    expect(badKind.status).toBe(422)

    const good = await handler(
      req(
        'POST',
        `/agent/jobs/${jobId}/result`,
        { blocks: [{ id: 'b1', type: 'heading', level: 1, text: 'Weekly summary' }] },
        { authorization: `Bearer ${RUNNER_TOKEN}` },
      ),
    )
    expect(good.status).toBe(200)
    const body = (await good.json()) as { data: { state: string; resultPageId: string } }
    expect(body.data.state).toBe('done')
    const pageRows = await db.sql<{ kind: string }>`SELECT kind FROM pages WHERE id = ${body.data.resultPageId}`
    expect(pageRows[0]?.kind).toBe('dashboard')
  })

  it('an ask result matching ask.schema.json stores a note page and marks the job done', async () => {
    const { cookie, userId } = await operatorCookie('ask-valid@eyvar.test')
    const jobId = await createAndClaimAskJob(cookie)
    const runId = await seedAskRun(jobId, userId)

    const res = await handler(req('POST', `/agent/jobs/${jobId}/result`, askResult(runId), { authorization: `Bearer ${RUNNER_TOKEN}` }))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { state: string; resultPageId: string } }
    expect(body.data.state).toBe('done')

    const pageRows = await db.sql<{ kind: string }>`SELECT kind FROM pages WHERE id = ${body.data.resultPageId}`
    expect(pageRows[0]?.kind).toBe('note')
  })

  it('an ask result shaped like a case study (missing `answer`) is refused as a schema violation, not forced through the case-study shape', async () => {
    const { cookie } = await operatorCookie('ask-wrong-shape@eyvar.test')
    const jobId = await createAndClaimAskJob(cookie)

    const caseStudyShaped = {
      title: 'Why did revenue drop?',
      language: 'en',
      question: 'Why did revenue drop last week?',
      decision: 'Whether to run a promo',
      // No `answer` — this is what a genuinely correct `ask` result looked like
      // before F-V2-38: the old code demanded `decision`/`headline`/`baseline`/
      // `contributors`/`alternatives`, which a real `ask` result never has.
    }
    const res = await handler(req('POST', `/agent/jobs/${jobId}/result`, caseStudyShaped, { authorization: `Bearer ${RUNNER_TOKEN}` }))
    expect(res.status).toBe(422)
    const body = (await res.json()) as ApiErrorBody
    expect(body.details.some((d) => d.field.includes('answer') || d.field.includes('findings'))).toBe(true)

    const jobRow = await db.sql<{ state: string }>`SELECT state FROM agent_jobs WHERE id = ${jobId}`
    expect(jobRow[0]?.state).toBe('running')
  })
})
