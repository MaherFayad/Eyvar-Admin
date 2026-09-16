/**
 * `evaluateDueRules`: every assertion runs the real `reports.run` compiler
 * path against seeded rows, so a firing's value is a real `evaluate()`
 * outcome, not a stub. Proves AC-1282, AC-1283, AC-1284, D43's recipient
 * drop, and the machine's full transition set on a frozen clock. */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PGlite } from '@electric-sql/pglite'
import { createTestDatabase, seedUser } from '../_test/db'
import type { Database } from './db'
import { evaluateDueRules } from './evaluateDue'
import type { EmailAdapter, EmailMessage } from './email'
import type { SlackAdapter } from './alertDelivery'
import type { SecretsAdapter } from './secrets'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const EXAMPLES_DIR = path.resolve(__dirname, '../../docs/09-analytics-v2/examples')

async function seedCatalogueAndOps(pglite: PGlite): Promise<void> {
  const files = ['measures.seed.sql', 'dimensions.seed.sql', 'drivers.seed.sql', 'riders.seed.sql', 'subscriptions.seed.sql', 'trips.seed.sql', 'dailySnapshots.seed.sql']
  for (const file of files) {
    const sql = await readFile(path.join(EXAMPLES_DIR, file), 'utf8')
    await pglite.exec(sql)
  }
}

class FakeEmailAdapter implements EmailAdapter {
  sent: EmailMessage[] = []
  async send(message: EmailMessage): Promise<void> {
    this.sent.push(message)
  }
}
class FailingEmailAdapter implements EmailAdapter {
  async send(): Promise<void> {
    throw new Error('smtp unreachable')
  }
}
class FakeSlackAdapter implements SlackAdapter {
  posts: Array<{ url: string; payload: unknown }> = []
  async post(url: string, payload: unknown): Promise<void> {
    this.posts.push({ url, payload })
  }
}
class FailingSlackAdapter implements SlackAdapter {
  async post(): Promise<void> {
    throw new Error('slack webhook unreachable')
  }
}
class FakeSecretsAdapter implements SecretsAdapter {
  encrypt(plaintext: string): string {
    return `enc:${plaintext}`
  }
  decrypt(blob: string): string {
    return blob.replace(/^enc:/, '')
  }
}

let pglite: PGlite
let db: Database

beforeEach(async () => {
  const setup = await createTestDatabase()
  pglite = setup.pglite
  db = setup.db
  await seedCatalogueAndOps(pglite)
})

afterEach(async () => {
  await pglite.close()
})

async function seedOwner(roleId: string, email: string): Promise<string> {
  const u = await seedUser(db, { email, password: 'pw-correct', roleId })
  return u.id
}

async function seedSavedReport(ownerId: string, query: unknown): Promise<string> {
  const rows = await db.sql<{ id: string }>`
    INSERT INTO saved_reports (name, description, query_json, owner_id, updated_by)
    VALUES ('Test report', NULL, ${JSON.stringify(query)}, ${ownerId}, ${ownerId})
    RETURNING id
  `
  return rows[0]!.id
}

interface SeedRuleOpts {
  reportId: string
  seriesId: string
  ownerId: string
  condition: unknown
  evaluationGrain: 'day' | 'week' | 'month'
  cadence: 'hourly' | 'daily' | null
  recipientIds?: string[]
  channels?: unknown[]
  minReArmMinutes?: number | null
  consecutiveFailuresBeforeError?: number
  state?: string
  lastFiredAt?: string | null
  lastBucketStart?: string | null
  failureCount?: number
}

async function seedRule(opts: SeedRuleOpts): Promise<string> {
  const rows = await db.sql<{ id: string }>`
    INSERT INTO alert_rules (
      name, report_id, series_id, condition_json, comparator, threshold, threshold_unit, threshold_currency,
      evaluation_grain, cadence, min_rearm_minutes, consecutive_failures_before_error, channels_json,
      recipient_ids_json, severity, labels_json, enabled, owner_id, updated_by,
      state, last_fired_at, last_bucket_start, failure_count
    ) VALUES (
      'Test rule', ${opts.reportId}, ${opts.seriesId}, ${JSON.stringify(opts.condition)}, 'gt', 0, 'money', 'SAR',
      ${opts.evaluationGrain}, ${opts.cadence}, ${opts.minReArmMinutes ?? null}, ${opts.consecutiveFailuresBeforeError ?? 5},
      ${JSON.stringify(opts.channels ?? [{ type: 'in-app' }])}, ${JSON.stringify(opts.recipientIds ?? [])}, 'high', '[]'::jsonb,
      true, ${opts.ownerId}, ${opts.ownerId},
      ${opts.state ?? 'armed'}, ${opts.lastFiredAt ?? null}, ${opts.lastBucketStart ?? null}, ${opts.failureCount ?? 0}
    ) RETURNING id
  `
  return rows[0]!.id
}

async function ruleRow(id: string) {
  const rows = await db.sql<{
    state: string
    failure_count: number
    last_bucket_start: string | null
    last_fired_at: string | null
    last_evaluated_at: string | null
  }>`SELECT state, failure_count, last_bucket_start, last_fired_at, last_evaluated_at FROM alert_rules WHERE id = ${id}`
  return rows[0]!
}

async function firingCount(ruleId: string): Promise<number> {
  const rows = await db.sql<{ count: string }>`SELECT count(*)::text AS count FROM alert_firings WHERE rule_id = ${ruleId}`
  return Number(rows[0]!.count)
}

const REVENUE_SERIES_ID = 'revenue.total#_#current'

describe('AC-1282: cadence selection', () => {
  it('the hourly cron evaluates only hourly rules, and vice versa', async () => {
    const owner = await seedOwner('Finance', 'owner-cadence@eyvar.test')
    const reportId = await seedSavedReport(owner, {
      measures: [{ key: 'revenue.total' }],
      groupBy: [],
      filters: [],
      window: { kind: 'absolute', from: '2026-06-01', to: '2026-06-25' },
      grain: 'day',
      periodComparison: 'none',
      chartType: 'line',
    })
    const condition = { kind: 'static', comparator: 'gte', threshold: 0 }
    const hourlyRule = await seedRule({ reportId, seriesId: REVENUE_SERIES_ID, ownerId: owner, condition, evaluationGrain: 'day', cadence: 'hourly' })
    const dailyRule = await seedRule({ reportId, seriesId: REVENUE_SERIES_ID, ownerId: owner, condition, evaluationGrain: 'day', cadence: 'daily' })

    const deps = { db, email: new FakeEmailAdapter(), slack: new FakeSlackAdapter(), secrets: new FakeSecretsAdapter() }
    await evaluateDueRules({ ...deps, cadence: 'hourly', now: () => '2026-06-25T09:00:00.000Z', today: () => '2026-06-25' })

    expect((await ruleRow(hourlyRule)).last_evaluated_at).not.toBeNull()
    expect((await ruleRow(dailyRule)).last_evaluated_at).toBeNull()

    await evaluateDueRules({ ...deps, cadence: 'daily', now: () => '2026-06-25T09:05:00.000Z', today: () => '2026-06-25' })
    expect((await ruleRow(dailyRule)).last_evaluated_at).not.toBeNull()
  })
})

describe('AC-1283 / AC-1284: firing, delivery and a recorded Slack failure', () => {
  it('writes the firing row, one notification per in-app recipient, and one delivery row per channel — a Slack failure is recorded, not thrown', async () => {
    const owner = await seedOwner('Finance', 'owner-fire@eyvar.test')
    const recipient = await seedOwner('Finance', 'recipient-fire@eyvar.test')
    const reportId = await seedSavedReport(owner, {
      measures: [{ key: 'revenue.total' }],
      groupBy: [],
      filters: [],
      window: { kind: 'absolute', from: '2026-06-01', to: '2026-06-25' },
      grain: 'day',
      periodComparison: 'none',
      chartType: 'line',
    })
    const webhookRows = await db.sql<{ id: string }>`
      INSERT INTO webhooks (name, url_encrypted, created_by) VALUES ('Ops Slack', ${'enc:https://hooks.slack.test/x'}, ${owner}) RETURNING id
    `
    const webhookId = webhookRows[0]!.id

    const ruleId = await seedRule({
      reportId,
      seriesId: REVENUE_SERIES_ID,
      ownerId: owner,
      condition: { kind: 'static', comparator: 'gte', threshold: 0 },
      evaluationGrain: 'day',
      cadence: 'daily',
      recipientIds: [recipient],
      channels: [{ type: 'in-app' }, { type: 'email', userIds: [recipient] }, { type: 'slack', webhookId }],
    })

    const email = new FakeEmailAdapter()
    const slack = new FailingSlackAdapter()
    const summary = await evaluateDueRules({
      db,
      cadence: 'daily',
      email,
      slack,
      secrets: new FakeSecretsAdapter(),
      now: () => '2026-06-25T09:00:00.000Z',
      today: () => '2026-06-25',
    })

    expect(summary.fired).toBe(1)
    expect(await firingCount(ruleId)).toBe(1)

    const firingRows = await db.sql<{ id: string }>`SELECT id FROM alert_firings WHERE rule_id = ${ruleId}`
    const firingId = firingRows[0]!.id

    const deliveries = await db.sql<{ channel_type: string; status: string; error: string | null; target: string | null }>`
      SELECT channel_type, status, error, target FROM alert_deliveries WHERE firing_id = ${firingId} ORDER BY channel_type
    `
    expect(deliveries).toHaveLength(3)
    const byChannel = Object.fromEntries(deliveries.map((d) => [d.channel_type, d]))
    expect(byChannel['in-app']!.status).toBe('sent')
    expect(byChannel.email!.status).toBe('sent')
    expect(byChannel.slack!.status).toBe('failed')
    expect(byChannel.slack!.error).toContain('slack webhook unreachable')

    // AC-1284: the failed Slack post did not fail the cron — evaluation and delivery completed.
    expect(email.sent).toHaveLength(1)

    const notifRows = await db.sql<{ route: string | null; type: string }>`SELECT route, type FROM notifications WHERE user_id = ${recipient}`
    expect(notifRows).toHaveLength(1)
    expect(notifRows[0]!.type).toBe('alert')
    expect(notifRows[0]!.route).toContain('/management/reports')
  })
})

describe("D43: a recipient who lost the measure's permission is dropped, and the owner is told once", () => {
  it('drops the recipient, delivers to nobody for them, and tells the owner exactly once', async () => {
    const owner = await seedOwner('Finance', 'owner-drop@eyvar.test')
    const unauthorised = await seedOwner('Dispatcher', 'dispatcher-drop@eyvar.test') // Dispatcher holds neither view_analytics nor view_finance
    const reportId = await seedSavedReport(owner, {
      measures: [{ key: 'revenue.total' }],
      groupBy: [],
      filters: [],
      window: { kind: 'absolute', from: '2026-06-01', to: '2026-06-25' },
      grain: 'day',
      periodComparison: 'none',
      chartType: 'line',
    })
    const ruleId = await seedRule({
      reportId,
      seriesId: REVENUE_SERIES_ID,
      ownerId: owner,
      condition: { kind: 'static', comparator: 'gte', threshold: 0 },
      evaluationGrain: 'day',
      cadence: 'daily',
      recipientIds: [unauthorised],
      channels: [{ type: 'in-app' }],
    })

    await evaluateDueRules({
      db,
      cadence: 'daily',
      email: new FakeEmailAdapter(),
      slack: new FakeSlackAdapter(),
      secrets: new FakeSecretsAdapter(),
      now: () => '2026-06-25T09:00:00.000Z',
      today: () => '2026-06-25',
    })

    expect(await firingCount(ruleId)).toBe(1) // the firing itself is unaffected
    const recipientNotifs = await db.sql<{ id: string }>`SELECT id FROM notifications WHERE user_id = ${unauthorised}`
    expect(recipientNotifs).toHaveLength(0) // dropped — never notified

    const ownerNotifs = await db.sql<{ body: string | null }>`SELECT body FROM notifications WHERE user_id = ${owner}`
    expect(ownerNotifs).toHaveLength(1) // told once
    expect(ownerNotifs[0]!.body).toContain(unauthorised)
  })
})

describe('AC-1221/AC-1286: a weekly rule on a daily cadence fires once per week, not once per day', () => {
  it('evaluates the same complete week five days running and fires exactly once', async () => {
    const owner = await seedOwner('Finance', 'owner-weekly@eyvar.test')
    const reportId = await seedSavedReport(owner, {
      measures: [{ key: 'revenue.total' }],
      groupBy: [],
      filters: [],
      window: { kind: 'absolute', from: '2026-05-01', to: '2026-06-25' },
      grain: 'week',
      periodComparison: 'none',
      chartType: 'line',
    })
    // Week of 2026-06-07..06-13 sums to 298832 halalas — comfortably above 250000.
    const ruleId = await seedRule({
      reportId,
      seriesId: REVENUE_SERIES_ID,
      ownerId: owner,
      condition: { kind: 'static', comparator: 'gt', threshold: 250_000 },
      evaluationGrain: 'week',
      cadence: 'daily',
    })

    const deps = { db, email: new FakeEmailAdapter(), slack: new FakeSlackAdapter(), secrets: new FakeSecretsAdapter() }
    // 2026-06-14 is a Sunday (WEEK_START_DOW = 0): every one of these five
    // days falls inside the week that starts 2026-06-14, so the *previous*
    // complete week (starting 2026-06-07) is the tested bucket every time —
    // the same bucket, five cadence ticks running.
    const days = ['2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19', '2026-06-20']
    for (const day of days) {
      await evaluateDueRules({ ...deps, cadence: 'daily', now: () => `${day}T09:00:00.000Z`, today: () => day })
    }

    expect(await firingCount(ruleId)).toBe(1)
    const row = await ruleRow(ruleId)
    expect(row.last_bucket_start).toBe('2026-06-07')
    expect(row.state).toBe('cooling')
  })
})

describe('the machine, through a frozen clock, over real day-grain data', () => {
  it('walks armed -> cooling (fired) -> cooling (stays) -> armed (re-arm) -> cooling (fired again)', async () => {
    const owner = await seedOwner('Finance', 'owner-cycle@eyvar.test')
    const reportId = await seedSavedReport(owner, {
      measures: [{ key: 'revenue.total' }],
      groupBy: [],
      filters: [],
      window: { kind: 'absolute', from: '2026-06-01', to: '2026-06-25' },
      grain: 'day',
      periodComparison: 'none',
      chartType: 'line',
    })
    // last-complete-bucket values by simulated "today", from the seeded
    // daily_snapshots: 06-20->55147, 06-21->57510, 06-22->57268,
    // 06-23->56768, 06-24->59426, 06-25->59171 — threshold 57000 crosses on
    // 06-21 (fire), holds on 06-22 (stays cooling), drops on 06-23 (re-arm),
    // crosses again on 06-24 (fire again), holds on 06-25 (stays cooling).
    const ruleId = await seedRule({
      reportId,
      seriesId: REVENUE_SERIES_ID,
      ownerId: owner,
      condition: { kind: 'static', comparator: 'gt', threshold: 57_000 },
      evaluationGrain: 'day',
      cadence: 'daily',
    })
    const deps = { db, email: new FakeEmailAdapter(), slack: new FakeSlackAdapter(), secrets: new FakeSecretsAdapter() }

    await evaluateDueRules({ ...deps, cadence: 'daily', now: () => '2026-06-20T09:00:00.000Z', today: () => '2026-06-20' })
    expect((await ruleRow(ruleId)).state).toBe('armed')

    await evaluateDueRules({ ...deps, cadence: 'daily', now: () => '2026-06-21T09:00:00.000Z', today: () => '2026-06-21' })
    expect((await ruleRow(ruleId)).state).toBe('cooling')
    expect(await firingCount(ruleId)).toBe(1)

    await evaluateDueRules({ ...deps, cadence: 'daily', now: () => '2026-06-22T09:00:00.000Z', today: () => '2026-06-22' })
    expect((await ruleRow(ruleId)).state).toBe('cooling')
    expect(await firingCount(ruleId)).toBe(1)

    await evaluateDueRules({ ...deps, cadence: 'daily', now: () => '2026-06-23T09:00:00.000Z', today: () => '2026-06-23' })
    expect((await ruleRow(ruleId)).state).toBe('armed')
    expect(await firingCount(ruleId)).toBe(1)

    await evaluateDueRules({ ...deps, cadence: 'daily', now: () => '2026-06-24T09:00:00.000Z', today: () => '2026-06-24' })
    expect((await ruleRow(ruleId)).state).toBe('cooling')
    expect(await firingCount(ruleId)).toBe(2)

    await evaluateDueRules({ ...deps, cadence: 'daily', now: () => '2026-06-25T09:00:00.000Z', today: () => '2026-06-25' })
    expect((await ruleRow(ruleId)).state).toBe('cooling')
    expect(await firingCount(ruleId)).toBe(2)
  })

  it('the minReArmMinutes backstop re-arms a still-true rule once enough real time has passed, without firing', async () => {
    const owner = await seedOwner('Finance', 'owner-backstop@eyvar.test')
    // `revenue.total`'s seeded coverage ends 2026-06-25 — core.ts nulls any
    // bucket outside a measure's declared coverage regardless of what the
    // table actually holds ("Outside the store's declared coverage the
    // answer is unknown, and unknown is null"), so this test's synthetic
    // July days need the coverage widened to be read at all.
    await db.sql`UPDATE measures SET coverage_to = '2026-07-10' WHERE key = 'revenue.total'`
    // Synthetic days, all comfortably above the threshold, so hysteresis
    // alone would keep this rule `cooling` forever.
    for (const [day, revenue] of [
      ['2026-06-30', 100_000],
      ['2026-07-01', 100_000],
      ['2026-07-02', 100_000],
    ] as const) {
      await db.sql`
        INSERT INTO daily_snapshots (day, riders, drivers, active_subscriptions, quick_rides, cancel_rate_pct, total_revenue_halalas, quick_ride_revenue_halalas, sub_revenue_halalas)
        VALUES (${day}, 1, 1, 1, 1, 0, ${revenue}, ${revenue}, 0)
      `
    }
    const reportId = await seedSavedReport(owner, {
      measures: [{ key: 'revenue.total' }],
      groupBy: [],
      filters: [],
      window: { kind: 'absolute', from: '2026-06-25', to: '2026-07-10' },
      grain: 'day',
      periodComparison: 'none',
      chartType: 'line',
    })
    const ruleId = await seedRule({
      reportId,
      seriesId: REVENUE_SERIES_ID,
      ownerId: owner,
      condition: { kind: 'static', comparator: 'gt', threshold: 50_000 },
      evaluationGrain: 'day',
      cadence: 'daily',
      minReArmMinutes: 30,
    })
    const deps = { db, email: new FakeEmailAdapter(), slack: new FakeSlackAdapter(), secrets: new FakeSecretsAdapter() }

    await evaluateDueRules({ ...deps, cadence: 'daily', now: () => '2026-07-01T00:00:00.000Z', today: () => '2026-07-01' })
    expect((await ruleRow(ruleId)).state).toBe('cooling')
    expect(await firingCount(ruleId)).toBe(1)

    // A full day later (1440 min >= the 30-minute backstop) — the value is
    // still above threshold, so hysteresis alone would stay `cooling`
    // forever; the backstop re-arms it instead, and this cycle does not fire.
    await evaluateDueRules({ ...deps, cadence: 'daily', now: () => '2026-07-02T00:00:00.000Z', today: () => '2026-07-02' })
    expect((await ruleRow(ruleId)).state).toBe('armed')
    expect(await firingCount(ruleId)).toBe(1)

    await evaluateDueRules({ ...deps, cadence: 'daily', now: () => '2026-07-03T00:00:00.000Z', today: () => '2026-07-03' })
    expect((await ruleRow(ruleId)).state).toBe('cooling')
    expect(await firingCount(ruleId)).toBe(2)
  })

  it('suspends the rule the moment the owner loses the permission its measure needs, and tells the owner once', async () => {
    const owner = await seedOwner('Finance', 'owner-suspend@eyvar.test')
    const reportId = await seedSavedReport(owner, {
      measures: [{ key: 'revenue.total' }],
      groupBy: [],
      filters: [],
      window: { kind: 'absolute', from: '2026-06-01', to: '2026-06-25' },
      grain: 'day',
      periodComparison: 'none',
      chartType: 'line',
    })
    const ruleId = await seedRule({
      reportId,
      seriesId: REVENUE_SERIES_ID,
      ownerId: owner,
      condition: { kind: 'static', comparator: 'gte', threshold: 0 },
      evaluationGrain: 'day',
      cadence: 'daily',
    })
    const deps = { db, email: new FakeEmailAdapter(), slack: new FakeSlackAdapter(), secrets: new FakeSecretsAdapter() }

    // `gte 0` always holds, so the first cycle fires (armed -> cooling) —
    // this test is about what happens to *that* state once permission is lost.
    await evaluateDueRules({ ...deps, cadence: 'daily', now: () => '2026-06-24T09:00:00.000Z', today: () => '2026-06-24' })
    expect((await ruleRow(ruleId)).state).toBe('cooling')

    // Dispatcher holds neither view_analytics nor view_finance.
    await db.sql`UPDATE users SET role_id = 'Dispatcher' WHERE id = ${owner}`

    await evaluateDueRules({ ...deps, cadence: 'daily', now: () => '2026-06-25T09:00:00.000Z', today: () => '2026-06-25' })
    const row = await ruleRow(ruleId)
    expect(row.state).toBe('suspended')

    const ownerNotifs = await db.sql<{ title: string }>`SELECT title FROM notifications WHERE user_id = ${owner}`
    expect(ownerNotifs).toHaveLength(1)
    expect(ownerNotifs[0]!.title).toContain('suspended')

    // A second cycle while still suspended must not send a second notification.
    await evaluateDueRules({ ...deps, cadence: 'daily', now: () => '2026-06-25T10:00:00.000Z', today: () => '2026-06-25' })
    const ownerNotifsAgain = await db.sql<{ id: string }>`SELECT id FROM notifications WHERE user_id = ${owner}`
    expect(ownerNotifsAgain).toHaveLength(1)
  })

  it('moves to error after consecutiveFailuresBeforeError run failures, and tells the owner once', async () => {
    const owner = await seedOwner('Finance', 'owner-error@eyvar.test')
    const ruleId = await seedRule({
      reportId: 'rpt_does_not_exist',
      seriesId: REVENUE_SERIES_ID,
      ownerId: owner,
      condition: { kind: 'static', comparator: 'gte', threshold: 0 },
      evaluationGrain: 'day',
      cadence: 'daily',
      consecutiveFailuresBeforeError: 3,
    })
    const deps = { db, email: new FakeEmailAdapter(), slack: new FakeSlackAdapter(), secrets: new FakeSecretsAdapter() }

    await evaluateDueRules({ ...deps, cadence: 'daily', now: () => '2026-06-25T09:00:00.000Z', today: () => '2026-06-25' })
    expect((await ruleRow(ruleId)).state).toBe('armed')
    expect((await ruleRow(ruleId)).failure_count).toBe(1)

    await evaluateDueRules({ ...deps, cadence: 'daily', now: () => '2026-06-25T10:00:00.000Z', today: () => '2026-06-25' })
    expect((await ruleRow(ruleId)).state).toBe('armed')
    expect((await ruleRow(ruleId)).failure_count).toBe(2)

    await evaluateDueRules({ ...deps, cadence: 'daily', now: () => '2026-06-25T11:00:00.000Z', today: () => '2026-06-25' })
    expect((await ruleRow(ruleId)).state).toBe('error')

    const ownerNotifs = await db.sql<{ title: string }>`SELECT title FROM notifications WHERE user_id = ${owner}`
    expect(ownerNotifs).toHaveLength(1)
    expect(ownerNotifs[0]!.title).toContain('needs attention')
  })
})

describe('a partial bucket is never evaluated', () => {
  it("does not test today's own (partial) bucket even though it alone would cross the threshold", async () => {
    const owner = await seedOwner('Finance', 'owner-partial@eyvar.test')
    const reportId = await seedSavedReport(owner, {
      measures: [{ key: 'revenue.total' }],
      groupBy: [],
      filters: [],
      window: { kind: 'absolute', from: '2026-06-01', to: '2026-06-25' },
      grain: 'day',
      periodComparison: 'none',
      chartType: 'line',
    })
    // 2026-06-24 (the last complete day) = 59171; 2026-06-25 ("today", partial) = 64737.
    const ruleId = await seedRule({
      reportId,
      seriesId: REVENUE_SERIES_ID,
      ownerId: owner,
      condition: { kind: 'static', comparator: 'gt', threshold: 60_000 },
      evaluationGrain: 'day',
      cadence: 'daily',
    })
    await evaluateDueRules({
      db,
      cadence: 'daily',
      email: new FakeEmailAdapter(),
      slack: new FakeSlackAdapter(),
      secrets: new FakeSecretsAdapter(),
      now: () => '2026-06-25T09:00:00.000Z',
      today: () => '2026-06-25',
    })

    const row = await ruleRow(ruleId)
    expect(row.last_bucket_start).toBe('2026-06-24') // never 2026-06-25
    expect(row.state).toBe('armed') // 59171 does not cross 60000 — had the partial bucket been used, this would have fired
    expect(await firingCount(ruleId)).toBe(0)
  })
})

describe('the time budget', () => {
  it('stops early when the budget is spent, and the next call resumes with the untouched rule first', async () => {
    const owner = await seedOwner('Finance', 'owner-budget@eyvar.test')
    const reportId = await seedSavedReport(owner, {
      measures: [{ key: 'revenue.total' }],
      groupBy: [],
      filters: [],
      window: { kind: 'absolute', from: '2026-06-01', to: '2026-06-25' },
      grain: 'day',
      periodComparison: 'none',
      chartType: 'line',
    })
    const condition = { kind: 'static', comparator: 'gte', threshold: 0 }
    const ruleA = await seedRule({ reportId, seriesId: REVENUE_SERIES_ID, ownerId: owner, condition, evaluationGrain: 'day', cadence: 'daily' })
    const ruleB = await seedRule({ reportId, seriesId: REVENUE_SERIES_ID, ownerId: owner, condition, evaluationGrain: 'day', cadence: 'daily' })

    const deps = { db, email: new FakeEmailAdapter(), slack: new FakeSlackAdapter(), secrets: new FakeSecretsAdapter() }
    const summary = await evaluateDueRules({ ...deps, cadence: 'daily', now: () => '2026-06-25T09:00:00.000Z', today: () => '2026-06-25', limitMs: 0 })
    expect(summary.stoppedEarly).toBe(true)
    expect(summary.processed).toBe(0)

    expect((await ruleRow(ruleA)).last_evaluated_at).toBeNull()
    expect((await ruleRow(ruleB)).last_evaluated_at).toBeNull()

    const finished = await evaluateDueRules({ ...deps, cadence: 'daily', now: () => '2026-06-25T09:05:00.000Z', today: () => '2026-06-25' })
    expect(finished.stoppedEarly).toBe(false)
    expect(finished.processed).toBe(2)
  })
})

describe('email delivery failure is recorded, not thrown', () => {
  it('records a failed email delivery and still completes the cycle', async () => {
    const owner = await seedOwner('Finance', 'owner-email-fail@eyvar.test')
    const recipient = await seedOwner('Finance', 'recipient-email-fail@eyvar.test')
    const reportId = await seedSavedReport(owner, {
      measures: [{ key: 'revenue.total' }],
      groupBy: [],
      filters: [],
      window: { kind: 'absolute', from: '2026-06-01', to: '2026-06-25' },
      grain: 'day',
      periodComparison: 'none',
      chartType: 'line',
    })
    const ruleId = await seedRule({
      reportId,
      seriesId: REVENUE_SERIES_ID,
      ownerId: owner,
      condition: { kind: 'static', comparator: 'gte', threshold: 0 },
      evaluationGrain: 'day',
      cadence: 'daily',
      recipientIds: [recipient],
      channels: [{ type: 'email', userIds: [recipient] }],
    })

    const summary = await evaluateDueRules({
      db,
      cadence: 'daily',
      email: new FailingEmailAdapter(),
      slack: new FakeSlackAdapter(),
      secrets: new FakeSecretsAdapter(),
      now: () => '2026-06-25T09:00:00.000Z',
      today: () => '2026-06-25',
    })
    expect(summary.fired).toBe(1)

    const firingRows = await db.sql<{ id: string }>`SELECT id FROM alert_firings WHERE rule_id = ${ruleId}`
    const deliveries = await db.sql<{ status: string; error: string | null }>`
      SELECT status, error FROM alert_deliveries WHERE firing_id = ${firingRows[0]!.id}
    `
    expect(deliveries).toHaveLength(1)
    expect(deliveries[0]!.status).toBe('failed')
    expect(deliveries[0]!.error).toContain('smtp unreachable')
  })
})
