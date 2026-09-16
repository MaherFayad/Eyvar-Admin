/**
 * `agent.*` through the real router. AC-1287 (the atomic claim, acting-for
 * refused for any unclaimed job) and AC-1288 (no number without a run)
 * each get their own `describe` block.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PGlite } from '@electric-sql/pglite'
import { createTestDatabase, seedSession, seedUser } from '../_test/db'
import type { Database } from '../_lib/db'
import { createApiHandler } from './[...route]'
import { signSessionId } from '../_lib/auth'
import type { ApiErrorBody } from '../_lib/errors'
import type { AgentJob, AgentSchedule } from '@/data/types/agent'
import { enqueueDueAgentSchedules } from '../_lib/handlers/agent'
import { runAgentSchedulesCron } from '../cron/agent-schedules'

const SESSION_SECRET = 'wp-6.7-agent-secret'
const RUNNER_TOKEN = 'wp-6.7-runner-token'
const CRON_SECRET = 'wp-7.6-cron-secret'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const EXAMPLES_DIR = path.resolve(__dirname, '../../docs/09-analytics-v2/examples')

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
  const measuresSql = await readFile(path.join(EXAMPLES_DIR, 'measures.seed.sql'), 'utf8')
  await pglite.exec(measuresSql)
  handler = createApiHandler({ db })
})

afterEach(async () => {
  await pglite.close()
})

function cookieFor(sessionId: string): string {
  return `eyvar_session=${encodeURIComponent(signSessionId(sessionId, SESSION_SECRET))}`
}

async function operatorCookie(email: string, roleId: string): Promise<{ cookie: string; userId: string }> {
  const user = await seedUser(db, { email, password: 'pw-correct', roleId })
  const sessionId = await seedSession(db, { userId: user.id })
  return { cookie: cookieFor(sessionId), userId: user.id }
}

function req(method: string, path_: string, body: unknown, headers: Record<string, string> = {}): Request {
  const h: Record<string, string> = { ...headers }
  const init: RequestInit = { method, headers: h }
  if (body !== undefined) {
    h['content-type'] = 'application/json'
    init.body = JSON.stringify(body)
  }
  return new Request(`http://localhost/api/v1${path_}`, init)
}

function withCookie(headers: Record<string, string>, cookie: string): Record<string, string> {
  return { ...headers, cookie }
}

function runnerHeaders(actingFor?: string, jobId?: string): Record<string, string> {
  const headers: Record<string, string> = { authorization: `Bearer ${RUNNER_TOKEN}` }
  if (actingFor) headers['x-eyvar-acting-for'] = actingFor
  if (jobId) headers['x-eyvar-job'] = jobId
  return headers
}

async function createJob(cookie: string, overrides: Record<string, unknown> = {}): Promise<AgentJob> {
  const res = await handler(
    req(
      'POST',
      '/agent/jobs',
      { kind: 'case-study', question: 'Why did revenue drop last week?', language: 'en', contextObjects: [], ...overrides },
      withCookie({}, cookie),
    ),
  )
  expect(res.status).toBe(201)
  const body = (await res.json()) as { data: AgentJob }
  return body.data
}

async function claimNextJob(): Promise<AgentJob | null> {
  const res = await handler(req('POST', '/agent/jobs/claim', {}, { authorization: `Bearer ${RUNNER_TOKEN}` }))
  if (res.status === 204) return null
  const body = (await res.json()) as { data: AgentJob }
  return body.data
}

/* ─────────────────────────────────── AC-1287 ───────────────────────────────────────────────── */

describe('AC-1287: claiming is concurrency-safe', () => {
  it('two runners claiming at once — exactly one wins', async () => {
    const { cookie } = await operatorCookie('claim-owner@eyvar.test', 'Trust & Safety')
    const job = await createJob(cookie)

    const [a, b] = await Promise.all([
      handler(req('POST', '/agent/jobs/claim', {}, { authorization: `Bearer ${RUNNER_TOKEN}` })),
      handler(req('POST', '/agent/jobs/claim', {}, { authorization: `Bearer ${RUNNER_TOKEN}` })),
    ])
    const statuses = [a.status, b.status].sort()
    expect(statuses).toEqual([200, 204])

    const winner = a.status === 200 ? a : b
    const winnerBody = (await winner.json()) as { data: AgentJob }
    expect(winnerBody.data.id).toBe(job.id)
    expect(winnerBody.data.state).toBe('running')

    // A third claim attempt finds nothing left to claim.
    const third = await handler(req('POST', '/agent/jobs/claim', {}, { authorization: `Bearer ${RUNNER_TOKEN}` }))
    expect(third.status).toBe(204)
  })
})

describe('AC-1287: acting-for is not a way to become someone else', () => {
  it('refuses acting-for a job that was never claimed (still queued)', async () => {
    const { cookie, userId } = await operatorCookie('unclaimed-owner@eyvar.test', 'Trust & Safety')
    const job = await createJob(cookie)
    // Never claimed — still `queued`.

    const res = await handler(req('POST', '/reports/run', trendQuery('trips.completed'), runnerHeaders(userId, job.id)))
    expect(res.status).toBe(403)
    const body = (await res.json()) as ApiErrorBody
    expect(body.details[0]?.code).toBe('job-not-claimed')
  })

  it('refuses acting-for a job claimed by a runner but requested by someone else (no union, no impersonation)', async () => {
    const { cookie } = await operatorCookie('real-requester@eyvar.test', 'Trust & Safety')
    const { userId: impersonated } = await operatorCookie('bystander@eyvar.test', 'Owner')
    const job = await createJob(cookie)
    const claimed = await claimNextJob()
    expect(claimed?.id).toBe(job.id)

    // The job was requested by `real-requester`; naming `bystander` (an Owner,
    // who *does* hold `view_finance`) must not borrow their permissions.
    const res = await handler(req('POST', '/reports/run', trendQuery('revenue.total'), runnerHeaders(impersonated, job.id)))
    expect(res.status).toBe(403)
    const body = (await res.json()) as ApiErrorBody
    expect(body.details[0]?.code).toBe('operator-mismatch')
  })

  it('refuses an unknown/invalid runner token outright, even with valid-looking acting-for headers', async () => {
    const { cookie, userId } = await operatorCookie('wrong-token-owner@eyvar.test', 'Trust & Safety')
    const job = await createJob(cookie)
    await claimNextJob()

    const res = await handler(
      req('POST', '/reports/run', trendQuery('trips.completed'), { authorization: 'Bearer not-the-real-token', 'x-eyvar-acting-for': userId, 'x-eyvar-job': job.id }),
    )
    expect(res.status).toBe(401)
  })

  it('resolves the effective permission set as the named operator, never the runner: a measure the operator cannot see stays blocked through the agent path', async () => {
    // Trust & Safety holds view_analytics but not view_finance.
    const { cookie, userId } = await operatorCookie('finance-blocked@eyvar.test', 'Trust & Safety')
    const job = await createJob(cookie)
    await claimNextJob()

    const res = await handler(
      req('POST', '/reports/run', trendQuery('revenue.total'), { ...runnerHeaders(userId, job.id), 'x-eyvar-record-run': '1' }),
    )
    expect(res.status).toBe(200)
    /* `X-Eyvar-Record-Run: 1` answers the `RecordRunOutcome` envelope (WP-6.9),
       so the report sits under `result`. The guarantee asserted is unchanged:
       a measure this operator cannot see stays blocked through the agent path. */
    const outcome = (await res.json()) as {
      status: string
      runId: string
      result: { series: Array<{ blocked: string | null; points: unknown[] }> }
    }
    expect(outcome.status).toBe('ok')
    expect(outcome.runId).toBeTruthy()
    expect(outcome.result.series[0]?.blocked).toBe('view_finance')
    expect(outcome.result.series[0]?.points).toEqual([])

    // The same query, run directly by the operator (cookie auth), is
    // blocked identically — the agent path resolves to exactly the same
    // permission outcome as the operator hitting the endpoint themselves.
    const direct = await handler(req('POST', '/reports/run', trendQuery('revenue.total'), withCookie({}, cookie)))
    const directResult = (await direct.json()) as { series: Array<{ blocked: string | null }> }
    expect(directResult.series[0]?.blocked).toBe('view_finance')
  })

  it('records the run under the job when X-Eyvar-Record-Run is set through the agent path', async () => {
    const { cookie, userId } = await operatorCookie('record-run-owner@eyvar.test', 'Trust & Safety')
    const job = await createJob(cookie)
    await claimNextJob()

    const res = await handler(
      req('POST', '/reports/run', trendQuery('trips.completed'), { ...runnerHeaders(userId, job.id), 'x-eyvar-record-run': '1' }),
    )
    expect(res.status).toBe(200)

    const rows = await db.sql<{ job_id: string | null }>`SELECT job_id FROM report_runs WHERE user_id = ${userId}`
    expect(rows).toHaveLength(1)
    expect(rows[0]?.job_id).toBe(job.id)
  })

  it('an ordinary operator call (no runner token) never records a job id', async () => {
    const { cookie, userId } = await operatorCookie('ordinary-owner@eyvar.test', 'Owner')
    const res = await handler(req('POST', '/reports/run', trendQuery('trips.completed'), withCookie({ 'x-eyvar-record-run': '1' }, cookie)))
    expect(res.status).toBe(200)
    const rows = await db.sql<{ job_id: string | null }>`SELECT job_id FROM report_runs WHERE user_id = ${userId}`
    expect(rows[0]?.job_id ?? null).toBeNull()
  })
})

function trendQuery(measureKey: string) {
  return {
    measures: [{ key: measureKey }],
    groupBy: [],
    filters: [],
    window: { kind: 'absolute', from: '2026-06-01', to: '2026-06-25' },
    grain: 'day',
    periodComparison: 'none',
    chartType: 'line',
  }
}

/* ─────────────────────────────────── AC-1288 ───────────────────────────────────────────────── */

async function seedRun(jobId: string | null, userId: string, seriesId: string, buckets: string[], points: (number | null)[]): Promise<string> {
  const resultJson = {
    query: trendQuery('trips.completed'),
    asOf: '2026-06-25T09:00:00.000Z',
    buckets,
    panels: [],
    series: [{ id: seriesId, measureKey: 'trips.completed', groupValue: null, role: 'current', panelId: 'p', unit: 'count', currency: null, temporality: 'flow', points, partialBucketIndexes: [], blocked: null, failed: null }],
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

function baseCaseStudy(runId: string, findingValue: number): Record<string, unknown> {
  return {
    title: 'Why revenue dropped',
    language: 'en',
    question: 'Why did revenue drop last week?',
    decision: 'Whether to run a promo',
    headline: { text: 'Trips dipped 10%', confidence: 'medium', confidenceReason: 'One week of data' },
    baseline: { measureKey: 'trips.completed', window: { kind: 'absolute', from: '2026-06-01', to: '2026-06-03' }, grain: 'day', level: 30, previousPeriodDeltaPct: null, trendSlopePerBucket: null, runId },
    findings: [
      {
        id: 'f1',
        text: 'Trips totalled 30 over the window',
        values: [{ runId, seriesId: 'trips.completed#_#current', bucket: 'total', value: findingValue, unit: 'count', currency: null }],
        evidence: [runId],
        chart: null,
      },
    ],
    contributors: [],
    alternatives: [
      { hypothesis: 'A data gap', tested: true, evidence: [runId], verdict: 'not-supported', text: 'Coverage is complete' },
      { hypothesis: 'A pricing change', tested: true, evidence: [runId], verdict: 'inconclusive', text: 'No annotation in range' },
    ],
    dataQuality: { gaps: [], partialBucketsExcluded: true, blockedSeries: [], truncated: false, coverageNote: 'Full coverage' },
    // `agent/schemas/case-study.schema.json` requires at least one recommendation
    // (§7's own field list) — an empty array passed the old hand-rolled shape
    // checker (F-V2-38's whole point) but fails the real schema this WP wires in.
    recommendations: [
      {
        text: 'Run a promo to recover the dip',
        ownerRole: 'Ops Manager',
        expectedEffect: { measureKey: 'trips.completed', direction: 'up', magnitude: null },
        verifyWith: { reportQuery: null, alertCondition: null },
        reviewBy: '2026-06-10',
      },
    ],
    followUps: [],
  }
}

describe('AC-1288: no number without a run', () => {
  it('refuses a result citing a runId from another job — nothing is stored, the job stays running', async () => {
    const { cookie, userId } = await operatorCookie('evidence-owner@eyvar.test', 'Trust & Safety')
    const job = await createJob(cookie)
    await claimNextJob() // claims `job` — it is the only queued job so far.
    const otherJob = await createJob(cookie, { question: 'A different question' }) // stays queued, never claimed.

    // A run that belongs to the OTHER job, not the one we're posting a result for.
    const foreignRunId = await seedRun(otherJob.id, userId, 'trips.completed#_#current', ['2026-06-01', '2026-06-02', '2026-06-03'], [10, 10, 10])

    const res = await handler(
      req('POST', `/agent/jobs/${job.id}/result`, baseCaseStudy(foreignRunId, 30), { authorization: `Bearer ${RUNNER_TOKEN}` }),
    )
    expect(res.status).toBe(422)
    const body = (await res.json()) as ApiErrorBody
    expect(body.details.some((d) => d.code === 'evidence' && d.message.includes('does not belong to this job'))).toBe(true)

    const jobRow = await db.sql<{ state: string; result_page_id: string | null }>`SELECT state, result_page_id FROM agent_jobs WHERE id = ${job.id}`
    expect(jobRow[0]?.state).toBe('running')
    expect(jobRow[0]?.result_page_id).toBeNull()
  })

  it('refuses a result whose numbers do not match its cited run', async () => {
    const { cookie, userId } = await operatorCookie('mismatch-owner@eyvar.test', 'Trust & Safety')
    const job = await createJob(cookie)
    await claimNextJob()

    const runId = await seedRun(job.id, userId, 'trips.completed#_#current', ['2026-06-01', '2026-06-02', '2026-06-03'], [10, 10, 10])
    // The run actually totals 30; the finding claims 999.
    const res = await handler(req('POST', `/agent/jobs/${job.id}/result`, baseCaseStudy(runId, 999), { authorization: `Bearer ${RUNNER_TOKEN}` }))
    expect(res.status).toBe(422)
    const body = (await res.json()) as ApiErrorBody
    expect(body.details.some((d) => d.code === 'evidence' && d.message.includes('claims 999'))).toBe(true)

    const jobRow = await db.sql<{ state: string }>`SELECT state FROM agent_jobs WHERE id = ${job.id}`
    expect(jobRow[0]?.state).toBe('running')
  })

  it('refuses a result citing a runId that does not exist at all', async () => {
    const { cookie } = await operatorCookie('no-such-run-owner@eyvar.test', 'Trust & Safety')
    const job = await createJob(cookie)
    await claimNextJob()

    const res = await handler(req('POST', `/agent/jobs/${job.id}/result`, baseCaseStudy('run_does_not_exist', 30), { authorization: `Bearer ${RUNNER_TOKEN}` }))
    expect(res.status).toBe(422)
  })

  it('a valid result — every number backed by a run belonging to this job — stores a draft page owned by the requester and marks the job done', async () => {
    const { cookie, userId } = await operatorCookie('valid-owner@eyvar.test', 'Trust & Safety')
    const job = await createJob(cookie)
    await claimNextJob()

    const runId = await seedRun(job.id, userId, 'trips.completed#_#current', ['2026-06-01', '2026-06-02', '2026-06-03'], [10, 10, 10])
    const res = await handler(req('POST', `/agent/jobs/${job.id}/result`, baseCaseStudy(runId, 30), { authorization: `Bearer ${RUNNER_TOKEN}` }))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: AgentJob }
    expect(body.data.state).toBe('done')
    expect(body.data.resultPageId).not.toBeNull()

    const pageRows = await db.sql<{ owner_id: string; visibility: string; kind: string; published_at: string | null }>`
      SELECT owner_id, visibility, kind, published_at FROM pages WHERE id = ${body.data.resultPageId}
    `
    expect(pageRows[0]?.owner_id).toBe(userId)
    expect(pageRows[0]?.visibility).toBe('private')
    expect(pageRows[0]?.kind).toBe('case-study')
    expect(pageRows[0]?.published_at).toBeNull()
  })

  it('refuses a case study with fewer than two alternatives (schema failure)', async () => {
    const { cookie, userId } = await operatorCookie('too-few-alts@eyvar.test', 'Trust & Safety')
    const job = await createJob(cookie)
    await claimNextJob()
    const runId = await seedRun(job.id, userId, 'trips.completed#_#current', ['2026-06-01'], [10])
    const study = baseCaseStudy(runId, 10)
    ;(study as { alternatives: unknown[] }).alternatives = [(study as { alternatives: unknown[] }).alternatives[0]]

    const res = await handler(req('POST', `/agent/jobs/${job.id}/result`, study, { authorization: `Bearer ${RUNNER_TOKEN}` }))
    expect(res.status).toBe(422)
    const body = (await res.json()) as ApiErrorBody
    expect(body.details.some((d) => d.code === 'schema')).toBe(true)
  })
})

/* ─────────────────────────────── fail / defer, and the bare-runner routes ─────────────────────── */

describe('agent job lifecycle', () => {
  it('/fail transitions a running job to failed:<reason>', async () => {
    const { cookie } = await operatorCookie('fail-owner@eyvar.test', 'Trust & Safety')
    const job = await createJob(cookie)
    await claimNextJob()

    const res = await handler(req('POST', `/agent/jobs/${job.id}/fail`, { outcome: 'failed', reason: 'timeout' }, { authorization: `Bearer ${RUNNER_TOKEN}` }))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: AgentJob }
    expect(body.data.state).toBe('failed')
    expect(body.data.failureReason).toBe('timeout')
  })

  it('/fail with outcome deferred sets retryAt and leaves failureReason null', async () => {
    const { cookie } = await operatorCookie('defer-owner@eyvar.test', 'Trust & Safety')
    const job = await createJob(cookie)
    await claimNextJob()

    const res = await handler(req('POST', `/agent/jobs/${job.id}/fail`, { outcome: 'deferred' }, { authorization: `Bearer ${RUNNER_TOKEN}` }))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: AgentJob }
    expect(body.data.state).toBe('deferred')
    expect(body.data.retryAt).not.toBeNull()
    expect(body.data.failureReason).toBeNull()
  })

  it('a deferred job re-enters the claim pool once retryAt has passed', async () => {
    const { cookie } = await operatorCookie('redefer-owner@eyvar.test', 'Trust & Safety')
    const job = await createJob(cookie)
    await claimNextJob()
    await db.sql`UPDATE agent_jobs SET state = 'deferred', retry_at = now() - interval '1 minute' WHERE id = ${job.id}`

    const claimed = await claimNextJob()
    expect(claimed?.id).toBe(job.id)
    expect(claimed?.state).toBe('running')
  })

  it('heartbeat upserts a runner row and /agent/status reflects it as online', async () => {
    const { cookie } = await operatorCookie('status-viewer@eyvar.test', 'Owner')
    const hb = await handler(req('POST', '/agent/heartbeat', { id: 'runner-1', name: 'owner-laptop' }, { authorization: `Bearer ${RUNNER_TOKEN}` }))
    expect(hb.status).toBe(200)

    const status = await handler(req('GET', '/agent/status', undefined, withCookie({}, cookie)))
    expect(status.status).toBe(200)
    const body = (await status.json()) as { online: boolean; queueDepth: number }
    expect(body.online).toBe(true)
  })

  it('bare runner routes refuse a request without the runner token', async () => {
    const res = await handler(req('POST', '/agent/jobs/claim', {}, {}))
    expect(res.status).toBe(401)
  })

  it('sample_rows (D44) refuses an operator without view on the resource, then masks PII and audit-logs once for the acting operator', async () => {
    await db.sql`CREATE TABLE test_riders_pii (id TEXT PRIMARY KEY, "riderPhone" TEXT NOT NULL, "riderName" TEXT NOT NULL, city TEXT NOT NULL)`
    await db.sql`INSERT INTO test_riders_pii (id, "riderPhone", "riderName", city) VALUES ('r1', '0555512345', 'Sara Al Otaibi', 'Riyadh')`
    await db.sql`
      INSERT INTO measure_sources (resource, table_name, time_column, subject_column, pii_columns_json)
      VALUES ('riders-pii-test', 'test_riders_pii', 'id', 'id', '["riderPhone", "riderName"]'::jsonb)
    `
    await db.sql`
      INSERT INTO measures (key, sort_order, label_key, category, population_resource, population_predicate_json, population_predicate_key, population_time_field, population_value_field, coverage_from, coverage_to, temporality, bucket_aggregate, additive, unit, currency, higher_is_better, min_grain, permission_key, permission_level)
      VALUES ('riders.piiTest', 999, 'rb.measure.riders.piiTest', 'demand', 'riders-pii-test', '[]'::jsonb, 'rb.pop.riders.piiTest', 'id', null, '2026-01-01', '2026-06-25', 'stock', 'count', false, 'count', null, true, 'day', 'view_finance', 'read')
    `

    const { cookie: blockedCookie } = await operatorCookie('sample-blocked@eyvar.test', 'Trust & Safety')
    const blocked = await handler(req('POST', '/reports/sample', { resource: 'riders-pii-test', filters: [] }, withCookie({}, blockedCookie)))
    expect(blocked.status).toBe(403)

    const { cookie: allowedCookie, userId } = await operatorCookie('sample-allowed@eyvar.test', 'Owner')
    const res = await handler(req('POST', '/reports/sample', { resource: 'riders-pii-test', filters: [] }, withCookie({}, allowedCookie)))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { rows: Array<Record<string, unknown>> }
    expect(body.rows).toHaveLength(1)
    expect(body.rows[0]?.riderPhone).toBe('••45')
    expect(body.rows[0]?.riderName).toBe('SAO')
    expect(body.rows[0]?.city).toBe('Riyadh') // not declared PII — passes through.

    const audit = await db.sql<{ user_id: string; action: string; entity_id: string }>`
      SELECT user_id, action, entity_id FROM audit_log WHERE action = 'sample_rows'
    `
    expect(audit).toHaveLength(1)
    expect(audit[0]?.user_id).toBe(userId)
    expect(audit[0]?.entity_id).toBe('riders-pii-test')
  })

  it('events and findings post while the job is running, and GET events returns them in order', async () => {
    const { cookie } = await operatorCookie('events-owner@eyvar.test', 'Trust & Safety')
    const job = await createJob(cookie)
    await claimNextJob()

    const posted = await handler(
      req(
        'POST',
        `/agent/jobs/${job.id}/events`,
        { events: [{ type: 'tool-call', tool: 'catalogue_measures', summary: 'Listed 5 measures', durationMs: 120 }] },
        { authorization: `Bearer ${RUNNER_TOKEN}` },
      ),
    )
    expect(posted.status).toBe(200)

    const found = await handler(
      req('POST', `/agent/jobs/${job.id}/findings`, { text: 'Trips fell 10%', runIds: [] }, { authorization: `Bearer ${RUNNER_TOKEN}` }),
    )
    expect(found.status).toBe(200)

    const events = await handler(req('GET', `/agent/jobs/${job.id}/events`, undefined, withCookie({}, cookie)))
    const list = (await events.json()) as Array<{ kind: string }>
    expect(list.map((e) => e.kind)).toEqual(['tool-call', 'finding'])
  })
})

/* ─────────────────────────── scheduled reviews — AC-1266 / AC-1267 ─────────────────────────── */

/** Always due: `hour:minute = 00:00` on a daily cadence, so `isScheduleDue` is true at whatever wall-clock time the suite runs (no frozen clock needed for the HTTP-level races). */
const ALWAYS_DUE_CRON = '0 0 * * *'

async function createSchedule(cookie: string, overrides: Record<string, unknown> = {}): Promise<AgentSchedule> {
  const res = await handler(req('POST', '/agent/schedules', { cron: ALWAYS_DUE_CRON, reportIds: [], pageId: null, ...overrides }, withCookie({}, cookie)))
  expect(res.status).toBe(201)
  const body = (await res.json()) as { data: AgentSchedule }
  return body.data
}

async function queuedJobsFor(ownerId: string): Promise<{ id: string }[]> {
  return db.sql<{ id: string }>`SELECT id FROM agent_jobs WHERE requested_by = ${ownerId} AND kind = 'weekly-review'`
}

describe('AC-1266: a due schedule enqueues exactly once', () => {
  it('two concurrent callers of the shared enqueue function — the same one the cron and the runner-side fallback both call — enqueue exactly one job, not two', async () => {
    const { cookie, userId } = await operatorCookie('sched-race@eyvar.test', 'Owner')
    await createSchedule(cookie)
    const fixedNow = () => '2026-09-13T03:30:00.000Z' // 06:30 Riyadh, past 00:00 — due.

    const [a, b] = await Promise.all([enqueueDueAgentSchedules(db, fixedNow), enqueueDueAgentSchedules(db, fixedNow)])
    const enqueuedCounts = [a.enqueued, b.enqueued].sort()
    expect(enqueuedCounts).toEqual([0, 1]) // one writer wins the period, the other claims nothing

    const jobs = await queuedJobsFor(userId)
    expect(jobs).toHaveLength(1)

    // A third check for the same period, after the fact, still finds nothing to do.
    const c = await enqueueDueAgentSchedules(db, fixedNow)
    expect(c.enqueued).toBe(0)
    expect(await queuedJobsFor(userId)).toHaveLength(1)
  })

  it('a runner and a cron racing through their real entry points enqueue exactly one job between them', async () => {
    const { cookie, userId } = await operatorCookie('sched-race-http@eyvar.test', 'Owner')
    await createSchedule(cookie)

    const runnerCall = handler(req('POST', '/agent/schedules/enqueue-due', {}, { authorization: `Bearer ${RUNNER_TOKEN}` }))
    const cronCall = runAgentSchedulesCron(new Request('http://localhost/api/cron/agent-schedules', { headers: { authorization: `Bearer ${CRON_SECRET}` } }), { db }, CRON_SECRET)

    const [runnerRes] = await Promise.all([runnerCall, cronCall])
    expect(runnerRes.status).toBe(200)

    const jobs = await queuedJobsFor(userId)
    expect(jobs).toHaveLength(1)
  })

  it('a disabled schedule enqueues nothing, even when its cron is due', async () => {
    const { cookie, userId } = await operatorCookie('sched-disabled@eyvar.test', 'Owner')
    const schedule = await createSchedule(cookie)
    const patched = await handler(req('PATCH', `/agent/schedules/${schedule.id}`, { enabled: false }, withCookie({}, cookie)))
    expect(patched.status).toBe(200)
    expect(((await patched.json()) as { data: AgentSchedule }).data.enabled).toBe(false)

    const summary = await enqueueDueAgentSchedules(db, () => '2026-09-13T03:30:00.000Z')
    expect(summary.enqueued).toBe(0)
    expect(await queuedJobsFor(userId)).toHaveLength(0)
  })

  it('a weekly schedule enqueues once for the week, then again the following week — not permanently exhausted, not duplicated within the same week', async () => {
    const { cookie, userId } = await operatorCookie('sched-week-rollover@eyvar.test', 'Owner')
    // Sunday 06:00 Riyadh (dow 0, matching WEEK_START_DOW) — a real weekly cadence, not the always-due daily cron the other tests use.
    await createSchedule(cookie, { cron: '0 6 * * 0' })

    const sunday = () => '2026-09-13T03:30:00.000Z' // 2026-09-13 is a Sunday; 06:30 Riyadh, past the 06:00 trigger.
    const laterSameSunday = () => '2026-09-13T10:00:00.000Z' // 13:00 Riyadh, same Sunday, same period — a re-check, not a new one.
    const nextSunday = () => '2026-09-20T03:30:00.000Z' // the following Sunday — a new period.

    await enqueueDueAgentSchedules(db, sunday)
    await enqueueDueAgentSchedules(db, laterSameSunday)
    expect(await queuedJobsFor(userId)).toHaveLength(1) // still just the one job for the week

    await enqueueDueAgentSchedules(db, nextSunday)
    expect(await queuedJobsFor(userId)).toHaveLength(2) // a new period, a new job
  })

  it('a cron restricted finer than daily (day-of-month or month not "*") is refused at creation', async () => {
    const { cookie } = await operatorCookie('sched-bad-cron@eyvar.test', 'Owner')
    const res = await handler(req('POST', '/agent/schedules', { cron: '*/15 * * * *', reportIds: [], pageId: null }, withCookie({}, cookie)))
    expect(res.status).toBe(422)
  })
})

describe('AC-1267: an offline runner leaves a scheduled job queued, with the reason visible', () => {
  it('a schedule enqueues a job independent of the runner — the job sits queued rather than being silently skipped', async () => {
    const { cookie, userId } = await operatorCookie('sched-offline@eyvar.test', 'Owner')
    await createSchedule(cookie)
    // No heartbeat at all in this test — the runner has never been online — yet the cron still enqueues.
    const summary = await enqueueDueAgentSchedules(db, () => '2026-09-13T03:30:00.000Z')
    expect(summary.enqueued).toBe(1)

    const jobs = await queuedJobsFor(userId)
    expect(jobs).toHaveLength(1)
    const jobRow = await handler(req('GET', `/agent/jobs/${jobs[0]!.id}`, undefined, withCookie({}, cookie)))
    const body = (await jobRow.json()) as { data: AgentJob }
    // Queued, not failed and not claimed — nothing marked it failed and nothing silently dropped it.
    expect(body.data.state).toBe('queued')
    expect(body.data.failureReason).toBeNull()

    const status = await handler(req('GET', '/agent/status', undefined, withCookie({}, cookie)))
    const statusBody = (await status.json()) as { online: boolean }
    expect(statusBody.online).toBe(false) // no heartbeat was ever posted
  })
})

describe('agent.schedules CRUD', () => {
  it('lists, creates and updates a schedule', async () => {
    const { cookie } = await operatorCookie('sched-crud@eyvar.test', 'Owner')
    const created = await createSchedule(cookie, { reportIds: ['RPT-1', 'RPT-2'], pageId: 'DSH-1' })
    expect(created.kind).toBe('weekly-review')
    expect(created.enabled).toBe(true)
    expect(created.reportIds).toEqual(['RPT-1', 'RPT-2'])

    const list = await handler(req('GET', '/agent/schedules', undefined, withCookie({}, cookie)))
    const listBody = (await list.json()) as AgentSchedule[]
    expect(listBody.map((s) => s.id)).toContain(created.id)

    const patched = await handler(req('PATCH', `/agent/schedules/${created.id}`, { cron: '0 5 * * 1' }, withCookie({}, cookie)))
    expect(patched.status).toBe(200)
    const patchedBody = (await patched.json()) as { data: AgentSchedule }
    expect(patchedBody.data.cron).toBe('0 5 * * 1')
  })

  it('the runner-token enqueue-due route refuses a request without the runner token', async () => {
    const res = await handler(req('POST', '/agent/schedules/enqueue-due', {}, {}))
    expect(res.status).toBe(401)
  })
})
