/**
 * `/api/cron/alerts-hourly` (`0 * * * *` UTC): evaluates every `hourly`
 * rule via `evaluateDue.ts`. Refused at deploy on Vercel Hobby (F-V2-36) —
 * never invoked there, and an enabled `hourly` rule's `lastEvaluatedAt`
 * stays put rather than being fabricated; state 28 makes that lag visible. */
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
