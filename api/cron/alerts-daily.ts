/**
 * `/api/cron/alerts-daily` (`15 3 * * *` UTC, 06:15 Riyadh — after
 * `snapshot` at 00:05 Riyadh): evaluates every `daily` rule. A `week`/
 * `month`-grain rule on this cadence is stopped from firing more than once
 * per new bucket by `evaluateDue.ts`'s `isNewBucket` gate (AC-1221/AC-1286). */
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

export interface AlertsDailyDeps {
  db: Database
  email: EmailAdapter
  slack: SlackAdapter
  secrets: SecretsAdapter
  now?: () => IsoDateTime
  today?: () => IsoDate
  limitMs?: number
  batchSize?: number
}

export async function runAlertsDaily(req: Request, deps: AlertsDailyDeps, cronSecret?: string): Promise<EvaluateDueSummary> {
  requireCronSecret(req, cronSecret)
  return evaluateDueRules({ ...deps, cadence: 'daily' })
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
        cadence: 'daily',
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
