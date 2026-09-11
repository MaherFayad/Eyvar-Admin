/**
 * `/api/cron/housekeeping` — AC-1286: deletes `report_runs` older than 30
 * days that no page references, keeps referenced ones, and sweeps expired
 * `idempotency_keys`.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { createTestDatabase, seedUser } from '../_test/db'
import type { Database } from '../_lib/db'
import { runHousekeeping } from './housekeeping'

let pglite: PGlite
let db: Database
const NOW = '2026-06-25T09:00:00.000Z'

beforeEach(async () => {
  const setup = await createTestDatabase()
  pglite = setup.pglite
  db = setup.db
})

afterEach(async () => {
  await pglite.close()
})

async function insertRun(id: string, createdAt: string): Promise<void> {
  await db.sql`
    INSERT INTO report_runs (id, user_id, query_json, result_json, as_of, created_at)
    VALUES (${id}, 'usr_x', '{}'::jsonb, '{}'::jsonb, ${createdAt}, ${createdAt})
  `
}

describe('AC-1286: report_runs sweep', () => {
  it('deletes an old, unreferenced run and keeps an old run a page still cites', async () => {
    const user = await seedUser(db, { email: 'hk-owner@eyvar.test', password: 'pw-correct', roleId: 'Ops Manager' })
    await insertRun('run_old_unreferenced', '2026-01-01T00:00:00.000Z')
    await insertRun('run_old_referenced', '2026-01-01T00:00:00.000Z')
    await insertRun('run_recent', '2026-06-24T00:00:00.000Z')

    await db.sql`
      INSERT INTO pages (kind, title, owner_id, visibility, blocks_json, updated_by)
      VALUES ('case-study', 'Cited case study', ${user.id}, 'private', ${JSON.stringify([{ type: 'note', citedRun: 'run_old_referenced' }])}, ${user.id})
    `

    const summary = await runHousekeeping({ db, now: () => NOW })
    expect(summary.reportRunsDeleted).toBe(1)

    const remaining = await db.sql<{ id: string }>`SELECT id FROM report_runs ORDER BY id`
    expect(remaining.map((r) => r.id).sort()).toEqual(['run_old_referenced', 'run_recent'])
  })
})

describe('idempotency_keys sweep', () => {
  it('deletes keys older than 24 hours and keeps a recent one', async () => {
    await db.sql`INSERT INTO idempotency_keys (user_id, key, status, created_at) VALUES ('usr_a', 'k-old', 'completed', '2026-06-20T00:00:00.000Z')`
    await db.sql`INSERT INTO idempotency_keys (user_id, key, status, created_at) VALUES ('usr_a', 'k-fresh', 'completed', ${NOW})`

    const summary = await runHousekeeping({ db, now: () => NOW })
    expect(summary.idempotencyKeysDeleted).toBe(1)

    const remaining = await db.sql<{ key: string }>`SELECT key FROM idempotency_keys`
    expect(remaining.map((r) => r.key)).toEqual(['k-fresh'])
  })
})

describe('agent_events sweep', () => {
  it('is a no-op when the agent tables do not exist yet, and reports zero rather than throwing', async () => {
    const summary = await runHousekeeping({ db, now: () => NOW })
    expect(summary.agentEventsDeleted).toBe(0)
  })
})
