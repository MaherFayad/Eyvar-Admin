/**
 * `/api/cron/alerts-digest` (`0 5 * * *` UTC, 08:00 Riyadh, §6): one in-app
 * notification per opted-in operator (`alerts_digest_opt_in`, off by
 * default), summarising fired rules from the last 24 hours. Zero firings or
 * no opt-in gets nothing — never an empty digest. */
import { createPgPoolDatabase, type Database } from '../_lib/db'
import { requireCronSecret } from '../_lib/cronAuth'
import { errorResponse } from '../_lib/errors'
import { jsonResponse } from '../_lib/envelope'
import type { IsoDateTime } from '@/data/types/common'

export interface AlertsDigestDeps {
  db: Database
  now?: () => IsoDateTime
}

export interface AlertsDigestSummary {
  usersNotified: number
}

interface RuleFiringCount {
  rule_id: string
  rule_name: string
  count: number
}

async function digestFor(db: Database, userId: string, since: IsoDateTime): Promise<RuleFiringCount[]> {
  const rows = await db.sql<{ rule_id: string; rule_name: string; count: string }>`
    SELECT ar.id AS rule_id, ar.name AS rule_name, count(af.id)::text AS count
    FROM alert_rules ar
    JOIN alert_firings af ON af.rule_id = ar.id AND af.fired_at >= ${since}
    WHERE ar.owner_id = ${userId} OR ar.recipient_ids_json ? ${userId}
    GROUP BY ar.id, ar.name
    HAVING count(af.id) > 0
    ORDER BY count(af.id) DESC
  `
  return rows.map((r) => ({ rule_id: r.rule_id, rule_name: r.rule_name, count: Number(r.count) }))
}

function bodyFor(rows: RuleFiringCount[]): string {
  const total = rows.reduce((sum, r) => sum + r.count, 0)
  const lines = rows.map((r) => `${r.rule_name}: ${r.count}`).join(', ')
  return `${total} firing${total === 1 ? '' : 's'} in the last 24 hours — ${lines}`
}

/** The core: unit-tested with a frozen clock and a seeded set of opted-in users and firings. */
export async function runAlertsDigest(deps: AlertsDigestDeps): Promise<AlertsDigestSummary> {
  const { db } = deps
  const now = deps.now ?? (() => new Date().toISOString())
  const nowIso = now()
  const since = new Date(Date.parse(nowIso) - 24 * 60 * 60 * 1000).toISOString()

  const optedIn = await db.sql<{ id: string }>`SELECT id FROM users WHERE alerts_digest_opt_in = true AND status = 'Active'`
  let usersNotified = 0

  for (const user of optedIn) {
    const rows = await digestFor(db, user.id, since)
    if (rows.length === 0) continue
    await db.sql`
      INSERT INTO notifications (user_id, type, priority, title, body, created_at, route, entity_id, entity_type)
      VALUES (${user.id}, 'info', 'medium', 'Your alerts, last 24 hours', ${bodyFor(rows)}, ${nowIso}, ${'/management/reports?view=alerts'}, NULL, 'alert_digest')
    `
    usersNotified += 1
  }

  return { usersNotified }
}

export default async function handler(req: Request): Promise<Response> {
  const requestId = req.headers.get('x-vercel-id') ?? crypto.randomUUID()
  try {
    requireCronSecret(req)
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) throw new Error('DATABASE_URL is not set')
    const db = createPgPoolDatabase(connectionString)
    try {
      const summary = await runAlertsDigest({ db })
      return jsonResponse(summary)
    } finally {
      await db.close()
    }
  } catch (err) {
    return errorResponse(err, requestId)
  }
}
