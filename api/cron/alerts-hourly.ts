/**
 * `/api/cron/alerts-hourly` (`0 * * * *` UTC) — evaluates every `hourly`
 * rule via `evaluateDue.ts` (05-backend.md §8).
 *
 * §1a: **this schedule is refused at deploy on Vercel Hobby** ("Hobby
 * accounts are limited to daily cron jobs"). On Hobby this function is
 * simply never invoked — nothing in it papers over that. An `hourly` rule
 * left enabled there keeps its `lastEvaluatedAt` exactly where it was: it
 * does not creep forward, does not fire, and does not read `armed`-and-fine
 * by any means this file controls. State 28 (`04-alerting-v2.md` §7,
 * "Evaluation lag") is what turns that honest staleness into something an
 * operator sees, once the composer disables `hourly` there
 * (`rb.alert.cadence.hobby`) — this file's only obligation is to never
 * fabricate a `lastEvaluatedAt` it did not actually run.
 */
import { createPgPoolDatabase, type Database } from '../_lib/db'
import { requireCronSecret } from '../_lib/cronAuth'
import { errorResponse } from '../_lib/errors'
import { jsonResponse } from '../_lib/envelope'
import { evaluateDueRules, type EvaluateDueSummary } from '../_lib/evaluateDue'
import { createSlackAdapterFromEnv, type SlackAdapter } from '../_lib/alertDelivery'
import { createEmailAdapterFromEnv, type EmailAdapter } from '../_lib/email'
import { createSecretsAdapterFromEnv } from '../_lib/secrets'
import type { SecretsAdapter } from '../_lib/secrets'
import type { IsoDate, IsoDateTime } from '@/data/types/common'

export interface AlertsHourlyDeps {
  db: Database
  email: EmailAdapter
  slack: SlackAdapter
  secrets: SecretsAdapter
  now?: () => IsoDateTime
  today?: () => IsoDate
  limitMs?: number
  batchSize?: number
}

/** The core: `requireCronSecret` then `evaluateDueRules({ cadence: 'hourly' })`. Exported so a test drives it without an HTTP round trip. */
export async function runAlertsHourly(req: Request, deps: AlertsHourlyDeps, cronSecret?: string): Promise<EvaluateDueSummary> {
  requireCronSecret(req, cronSecret)
  return evaluateDueRules({ ...deps, cadence: 'hourly' })
}

export default async function handler(req: Request): Promise<Response> {
  const requestId = req.headers.get('x-vercel-id') ?? crypto.randomUUID()
  try {
    requireCronSecret(req)
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) throw new Error('DATABASE_URL is not set')
    const db = createPgPoolDatabase(connectionString)
    try {
      const summary = await evaluateDueRules({
        db,
        cadence: 'hourly',
        email: createEmailAdapterFromEnv(),
        slack: createSlackAdapterFromEnv(),
        secrets: createSecretsAdapterFromEnv(),
      })
      return jsonResponse(summary)
    } finally {
      await db.close()
    }
  } catch (err) {
    return errorResponse(err, requestId)
  }
}
