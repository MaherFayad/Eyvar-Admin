/**
 * `alerts.*` and `webhooks.*` through the real router — WP-6.6. CRUD,
 * `Test now`, `mute`, `acknowledge`, the cross-rule firings feed,
 * config-history, and the webhook-secret-never-in-a-response guarantee.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { createTestDatabase, seedSession, seedUser } from '../_test/db'
import type { Database } from '../_lib/db'
import { createApiHandler } from './[...route]'
import { signSessionId } from '../_lib/auth'
import { AesGcmSecretsAdapter } from '../_lib/secrets'
import type { ApiErrorBody } from '../_lib/errors'
import type { AlertEvaluation, AlertRule } from '@/data/types/alert'

const SESSION_SECRET = 'wp-6.6-alerts-secret'

let pglite: PGlite
let db: Database
let handler: (req: Request) => Promise<Response>

beforeAll(() => {
  process.env.SESSION_SECRET = SESSION_SECRET
})

/** `0005_runs.sql` already seeds `measure_sources` for `daily-snapshots` — only the measure itself is this test's to add. */
async function seedMeasuresSubset(): Promise<void> {
  await db.sql`
    INSERT INTO measures (key, sort_order, label_key, category, population_resource, population_predicate_json, population_predicate_key, population_time_field, population_value_field, coverage_from, coverage_to, temporality, bucket_aggregate, additive, unit, currency, higher_is_better, min_grain, permission_key, permission_level)
    VALUES ('revenue.total', 1, 'rb.measure.revenue.total', 'revenue', 'daily-snapshots', '[]'::jsonb, 'rb.pop.snapshot.daily', 'date', 'totalRevenueHalalas', '2026-05-27', '2026-06-25', 'flow', 'sum', true, 'money', 'SAR', true, 'day', 'view_finance', 'read')
  `
}

const TEST_SECRETS_KEY = 'qwhjygVFsJ7/ZHIYl1lnh4yDNiBeWYncF3UTU33eEa4='

beforeEach(async () => {
  const setup = await createTestDatabase()
  pglite = setup.pglite
  db = setup.db
  await seedMeasuresSubset()
  handler = createApiHandler({
    db,
    secrets: new AesGcmSecretsAdapter(TEST_SECRETS_KEY),
    reportsClock: { today: () => '2026-06-25', now: () => '2026-06-25T09:14:00.000Z' },
  })
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

function req(method: string, path: string, body: unknown, cookie: string): Request {
  const headers: Record<string, string> = { cookie }
  const init: RequestInit = { method, headers }
  if (body !== undefined) {
    headers['content-type'] = 'application/json'
    init.body = JSON.stringify(body)
  }
  return new Request(`http://localhost/api/v1${path}`, init)
}

async function seedSavedReport(ownerId: string): Promise<string> {
  const query = {
    measures: [{ key: 'revenue.total' }],
    groupBy: [],
    filters: [],
    window: { kind: 'absolute', from: '2026-06-01', to: '2026-06-25' },
    grain: 'day',
    periodComparison: 'none',
    chartType: 'line',
  }
  const rows = await db.sql<{ id: string }>`
    INSERT INTO saved_reports (name, description, query_json, owner_id, updated_by) VALUES ('Revenue', NULL, ${JSON.stringify(query)}, ${ownerId}, ${ownerId}) RETURNING id
  `
  return rows[0]!.id
}

function saveAlertInput(reportId: string, overrides: Record<string, unknown> = {}) {
  return {
    id: null,
    name: 'Revenue over 40 SAR',
    reportId,
    seriesId: 'revenue.total#_#current',
    comparator: 'gt',
    threshold: 4000,
    evaluationGrain: 'day',
    cadence: 'daily',
    recipientIds: [],
    enabled: true,
    mutedUntil: null,
    ...overrides,
  }
}

describe('creating and reading an alert rule', () => {
  it('creates with the derived unit/currency and a static condition', async () => {
    const { cookie, userId } = await operatorCookie('alerts-owner@eyvar.test')
    const reportId = await seedSavedReport(userId)
    const res = await handler(req('POST', '/alerts', saveAlertInput(reportId), cookie))
    expect(res.status).toBe(201)
    const body = (await res.json()) as { data: AlertRule }
    expect(body.data.thresholdUnit).toBe('money')
    expect(body.data.thresholdCurrency).toBe('SAR')
    expect(body.data.state).toBe('armed')
    expect(body.data.cadence).toBe('daily')

    const got = await handler(req('GET', `/alerts/${body.data.id}`, undefined, cookie))
    expect(got.status).toBe(200)

    const list = await handler(req('GET', '/alerts', undefined, cookie))
    const listBody = (await list.json()) as { items: AlertRule[] }
    expect(listBody.items.map((r) => r.id)).toContain(body.data.id)

    // No config-history row for the create itself.
    const history = await handler(req('GET', `/alerts/${body.data.id}/config-history`, undefined, cookie))
    const historyBody = (await history.json()) as { items: unknown[] }
    expect(historyBody.items).toHaveLength(0)
  })

  it('422s a save with no name, naming the reason', async () => {
    const { cookie, userId } = await operatorCookie('alerts-invalid@eyvar.test')
    const reportId = await seedSavedReport(userId)
    const res = await handler(req('POST', '/alerts', saveAlertInput(reportId, { name: '' }), cookie))
    expect(res.status).toBe(422)
    const body = (await res.json()) as ApiErrorBody
    expect(body.details.some((d) => d.code === 'name-required')).toBe(true)
  })

  it('422s a save naming an unknown series', async () => {
    const { cookie, userId } = await operatorCookie('alerts-unknown-series@eyvar.test')
    const reportId = await seedSavedReport(userId)
    const res = await handler(req('POST', '/alerts', saveAlertInput(reportId, { seriesId: 'nope.measure#_#current' }), cookie))
    expect(res.status).toBe(422)
    const body = (await res.json()) as ApiErrorBody
    expect(body.details.some((d) => d.code === 'series-unknown')).toBe(true)
  })
})

describe('updating a rule writes config history for the changed fields only', () => {
  it('records name and cadence in the diff, not untouched fields', async () => {
    const { cookie, userId } = await operatorCookie('alerts-update@eyvar.test')
    const reportId = await seedSavedReport(userId)
    const created = await handler(req('POST', '/alerts', saveAlertInput(reportId), cookie))
    const rule = ((await created.json()) as { data: AlertRule }).data

    const patched = await handler(
      req('PATCH', `/alerts/${rule.id}`, saveAlertInput(reportId, { id: rule.id, name: 'Revenue over 50 SAR', cadence: 'hourly' }), cookie),
    )
    expect(patched.status).toBe(200)

    const history = await handler(req('GET', `/alerts/${rule.id}/config-history`, undefined, cookie))
    const historyBody = (await history.json()) as { items: Array<{ diff: Array<{ field: string }> }> }
    expect(historyBody.items).toHaveLength(1)
    const fields = historyBody.items[0]!.diff.map((d) => d.field).sort()
    expect(fields).toEqual(['cadence', 'name'])
  })
})

describe('mute', () => {
  it('sets mutedUntil and nothing else', async () => {
    const { cookie, userId } = await operatorCookie('alerts-mute@eyvar.test')
    const reportId = await seedSavedReport(userId)
    const created = await handler(req('POST', '/alerts', saveAlertInput(reportId), cookie))
    const rule = ((await created.json()) as { data: AlertRule }).data

    const res = await handler(req('POST', `/alerts/${rule.id}/mute`, { until: '2026-06-26T00:00:00.000Z' }, cookie))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: AlertRule }
    expect(body.data.mutedUntil).toBe('2026-06-26T00:00:00.000Z')
    expect(body.data.state).toBe('armed') // AC: evaluation keeps running while muted — this is not a state change
  })
})

describe('Test now (AC-877)', () => {
  it('evaluates in the foreground without changing state or writing a firing', async () => {
    await db.sql`
      INSERT INTO daily_snapshots (day, riders, drivers, active_subscriptions, quick_rides, cancel_rate_pct, total_revenue_halalas, quick_ride_revenue_halalas, sub_revenue_halalas)
      VALUES ('2026-06-24', 1, 1, 1, 1, 0, 5000, 5000, 0)
    `
    const { cookie, userId } = await operatorCookie('alerts-test-now@eyvar.test')
    const reportId = await seedSavedReport(userId)
    const created = await handler(req('POST', '/alerts', saveAlertInput(reportId, { threshold: 4000 }), cookie))
    const rule = ((await created.json()) as { data: AlertRule }).data

    const res = await handler(req('POST', `/alerts/${rule.id}/evaluate`, undefined, cookie))
    expect(res.status).toBe(200)
    const evaluation = (await res.json()) as AlertEvaluation
    expect(evaluation.stateChanged).toBe(false)
    expect(evaluation.outcome).toBe('would-fire')
    expect(evaluation.wouldFire).toBe(true)
    expect(evaluation.bucketStart).toBe('2026-06-24')

    const stillArmed = await handler(req('GET', `/alerts/${rule.id}`, undefined, cookie))
    const stillArmedBody = (await stillArmed.json()) as { data: AlertRule }
    expect(stillArmedBody.data.state).toBe('armed')

    const firings = await db.sql<{ count: string }>`SELECT count(*)::text AS count FROM alert_firings WHERE rule_id = ${rule.id}`
    expect(firings[0]!.count).toBe('0')
  })
})

describe('delete', () => {
  it('deletes with 204 and the rule stops resolving', async () => {
    const { cookie, userId } = await operatorCookie('alerts-delete@eyvar.test')
    const reportId = await seedSavedReport(userId)
    const created = await handler(req('POST', '/alerts', saveAlertInput(reportId), cookie))
    const rule = ((await created.json()) as { data: AlertRule }).data

    const del = await handler(req('DELETE', `/alerts/${rule.id}`, undefined, cookie))
    expect(del.status).toBe(204)

    const got = await handler(req('GET', `/alerts/${rule.id}`, undefined, cookie))
    expect(got.status).toBe(404)
  })
})

describe('firings feed and acknowledge', () => {
  it('lists cross-rule firings and mirrors an acknowledgement onto the rule', async () => {
    const { cookie, userId } = await operatorCookie('alerts-firings@eyvar.test')
    const reportId = await seedSavedReport(userId)
    const created = await handler(req('POST', '/alerts', saveAlertInput(reportId), cookie))
    const rule = ((await created.json()) as { data: AlertRule }).data

    const firingRows = await db.sql<{ id: string }>`
      INSERT INTO alert_firings (rule_id, bucket_start, value, threshold_or_band_json, severity) VALUES (${rule.id}, '2026-06-24', 5000, '{"threshold":4000}'::jsonb, 'high') RETURNING id
    `
    const firingId = firingRows[0]!.id

    const list = await handler(req('GET', '/alerts/firings', undefined, cookie))
    expect(list.status).toBe(200)
    const listBody = (await list.json()) as { items: Array<{ id: string; ruleId: string }> }
    expect(listBody.items.map((f) => f.id)).toContain(firingId)

    const ack = await handler(req('POST', `/alerts/firings/${firingId}/acknowledge`, undefined, cookie))
    expect(ack.status).toBe(200)
    const ackBody = (await ack.json()) as { acknowledgedBy: string }
    expect(ackBody.acknowledgedBy).toBe(userId)

    const ruleRow = await db.sql<{ last_ack_by: string | null }>`SELECT last_ack_by FROM alert_rules WHERE id = ${rule.id}`
    expect(ruleRow[0]!.last_ack_by).toBe(userId)
  })
})

describe('webhooks: a URL is a credential', () => {
  it('never returns the URL, and the stored row is not the plaintext', async () => {
    const { cookie } = await operatorCookie('webhooks-owner@eyvar.test')
    const created = await handler(req('POST', '/webhooks', { name: 'Ops Slack', url: 'https://hooks.slack.test/services/ABC' }, cookie))
    expect(created.status).toBe(201)
    const body = (await created.json()) as { data: { id: string; name: string } }
    expect(JSON.stringify(body)).not.toContain('hooks.slack.test')

    const row = await db.sql<{ url_encrypted: string }>`SELECT url_encrypted FROM webhooks WHERE id = ${body.data.id}`
    expect(row[0]!.url_encrypted).not.toContain('hooks.slack.test')
    // AES-256-GCM base64: 12-byte IV + 16-byte tag + ciphertext (`secrets.ts`) — round-trips back to the original URL.
    expect(new AesGcmSecretsAdapter(TEST_SECRETS_KEY).decrypt(row[0]!.url_encrypted)).toBe('https://hooks.slack.test/services/ABC')

    const list = await handler(req('GET', '/webhooks', undefined, cookie))
    const listBody = (await list.json()) as { items: Array<{ id: string; name: string }> }
    expect(listBody.items.map((w) => w.id)).toContain(body.data.id)
    expect(JSON.stringify(listBody)).not.toContain('hooks.slack.test')
  })

  it('422s a non-https URL', async () => {
    const { cookie } = await operatorCookie('webhooks-invalid@eyvar.test')
    const res = await handler(req('POST', '/webhooks', { name: 'Bad', url: 'http://insecure.example.com' }, cookie))
    expect(res.status).toBe(422)
  })
})
