/**
 * `/api/cron/housekeeping` (`30 2 * * *` UTC) — 05-backend.md §8 / AC-1286:
 * sweeps `report_runs` older than 30 days that no page references,
 * `idempotency_keys` older than 24 h (the belt beside `idempotency.ts`'s own
 * TTL check on read), and — only if the table exists yet, since the agent
 * queue is a different WP not built at the time of writing — `agent_events`
 * for jobs older than 90 days. Vercel Blob exports older than 7 days are
 * named in §8 too; no Blob store is wired to this deployment yet (05-backend.md
 * §11 lists it as owner setup, not code), so that sweep is a deliberate no-op
 * here, reported as `blobExportsDeleted: 0` rather than silently omitted.
 *
 * A `report_runs` row has no `page_reports` entry of its own — that table
 * links a *saved report*, not one run of it — so "no page references" is
 * read the way `05-backend.md` §5's agent path creates the reference: a
 * case-study page's blocks cite a `runId` as evidence. Absent a typed
 * citation shape to join on (a different WP's `Block` variant), this scans
 * `pages.blocks_json` as text for the run's own id — a citation is a
 * `runId` string appearing in the page's stored JSON, and this treats that
 * literally rather than parsing block-by-block.
 */
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
