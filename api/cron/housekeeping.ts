/**
 * `/api/cron/housekeeping` (`30 2 * * *` UTC, AC-1286): sweeps `report_runs`
 * >30 days with no page reference, `idempotency_keys` >24h, `agent_events`
 * for jobs >90 days, and reports Blob exports as `blobExportsDeleted: 0` (no
 * store wired yet). "No page reference" text-scans `pages.blocks_json` for the run's own id — over-retains, never deletes a cited run (F-V2-37). */
import { createPgPoolDatabase, type Database } from '../_lib/db'
import { requireCronSecret } from '../_lib/cronAuth'
import { errorResponse } from '../_lib/errors'
import { jsonResponse } from '../_lib/envelope'
import type { IsoDateTime } from '@/data/types/common'

export interface HousekeepingDeps {
  db: Database
  now?: () => IsoDateTime
}

export interface HousekeepingSummary {
  reportRunsDeleted: number
  idempotencyKeysDeleted: number
  agentEventsDeleted: number
  blobExportsDeleted: number
}

async function tableExists(db: Database, name: string): Promise<boolean> {
  const rows = await db.sql<{ exists: boolean }>`
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ${name}) AS exists
  `
  return rows[0]?.exists ?? false
}

function isoMinus(fromIso: IsoDateTime, ms: number): IsoDateTime {
  return new Date(Date.parse(fromIso) - ms).toISOString()
}

const DAY_MS = 24 * 60 * 60 * 1000

/** The core: `(db, now)`, unit-tested with a frozen clock (05-backend.md §9). */
export async function runHousekeeping(deps: HousekeepingDeps): Promise<HousekeepingSummary> {
  const { db } = deps
  const now = deps.now ?? (() => new Date().toISOString())
  const nowIso = now()

  const runsCutoff = isoMinus(nowIso, 30 * DAY_MS)
  const deletedRuns = await db.sql<{ id: string }>`
    DELETE FROM report_runs rr
    WHERE rr.created_at < ${runsCutoff}
      AND NOT EXISTS (SELECT 1 FROM pages p WHERE p.blocks_json::text LIKE '%' || rr.id || '%')
    RETURNING rr.id
  `

  const idempotencyCutoff = isoMinus(nowIso, DAY_MS)
  const deletedKeys = await db.sql<{ user_id: string; key: string }>`
    DELETE FROM idempotency_keys WHERE created_at < ${idempotencyCutoff} RETURNING user_id, key
  `

  let agentEventsDeleted = 0
  if ((await tableExists(db, 'agent_jobs')) && (await tableExists(db, 'agent_events'))) {
    const agentCutoff = isoMinus(nowIso, 90 * DAY_MS)
    const deletedEvents = await db.sql<{ id: string }>`
      DELETE FROM agent_events ae
      USING agent_jobs aj
      WHERE ae.job_id = aj.id AND aj.created_at < ${agentCutoff}
      RETURNING ae.id
    `
    agentEventsDeleted = deletedEvents.length
  }

  return {
    reportRunsDeleted: deletedRuns.length,
    idempotencyKeysDeleted: deletedKeys.length,
    agentEventsDeleted,
    blobExportsDeleted: 0,
  }
}

export default async function handler(req: Request): Promise<Response> {
  const requestId = req.headers.get('x-vercel-id') ?? crypto.randomUUID()
  try {
    requireCronSecret(req)
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) throw new Error('DATABASE_URL is not set')
    const db = createPgPoolDatabase(connectionString)
    try {
      const summary = await runHousekeeping({ db })
      return jsonResponse(summary)
    } finally {
      await db.close()
    }
  } catch (err) {
    return errorResponse(err, requestId)
  }
}
