/**
 * `/api/cron/alerts-digest` — §6: one summarising notification per opted-in
 * operator, only when they had a firing in the last 24 hours.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { createTestDatabase, seedUser } from '../_test/db'
import type { Database } from '../_lib/db'
import { runAlertsDigest } from './alerts-digest'

let pglite: PGlite
let db: Database
const NOW = '2026-06-25T08:00:00.000Z'

beforeEach(async () => {
  const setup = await createTestDatabase()
  pglite = setup.pglite
  db = setup.db
})

afterEach(async () => {
  await pglite.close()
})

async function seedRuleWithFiring(ownerId: string, firedAt: string): Promise<void> {
  const rows = await db.sql<{ id: string }>`
    INSERT INTO alert_rules (
      name, report_id, series_id, condition_json, comparator, threshold, threshold_unit,
      evaluation_grain, owner_id, updated_by
    ) VALUES (
      'Digest rule', 'rpt_x', 'measure#_#current', '{"kind":"static","comparator":"gt","threshold":0}'::jsonb, 'gt', 0, 'money',
      'day', ${ownerId}, ${ownerId}
    ) RETURNING id
  `
  await db.sql`INSERT INTO alert_firings (rule_id, fired_at, bucket_start, value, severity) VALUES (${rows[0]!.id}, ${firedAt}, '2026-06-24', 100, 'high')`
}

describe('alerts-digest', () => {
  it('notifies only an opted-in operator with a firing in the last 24 hours', async () => {
    const optedIn = await seedUser(db, { email: 'digest-optedin@eyvar.test', password: 'pw-correct', roleId: 'Finance' })
    const optedInNoFiring = await seedUser(db, { email: 'digest-optedin-none@eyvar.test', password: 'pw-correct', roleId: 'Finance' })
    const notOptedIn = await seedUser(db, { email: 'digest-not-optedin@eyvar.test', password: 'pw-correct', roleId: 'Finance' })

    await db.sql`UPDATE users SET alerts_digest_opt_in = true WHERE id = ${optedIn.id}`
    await db.sql`UPDATE users SET alerts_digest_opt_in = true WHERE id = ${optedInNoFiring.id}`
    // notOptedIn stays false — the off-by-default case.

    await seedRuleWithFiring(optedIn.id, '2026-06-25T02:00:00.000Z') // 6h ago — inside the window
    await seedRuleWithFiring(notOptedIn.id, '2026-06-25T02:00:00.000Z')
    // A firing outside the 24h window does not count.
    await seedRuleWithFiring(optedInNoFiring.id, '2026-06-20T02:00:00.000Z')

    const summary = await runAlertsDigest({ db, now: () => NOW })
    expect(summary.usersNotified).toBe(1)

    const notifs = await db.sql<{ user_id: string; title: string }>`SELECT user_id, title FROM notifications`
    expect(notifs).toHaveLength(1)
    expect(notifs[0]!.user_id).toBe(optedIn.id)
    expect(notifs[0]!.title).toContain('24 hours')
  })

  it('sends nothing when nobody is opted in', async () => {
    const user = await seedUser(db, { email: 'digest-noopt@eyvar.test', password: 'pw-correct', roleId: 'Finance' })
    await seedRuleWithFiring(user.id, '2026-06-25T02:00:00.000Z')

    const summary = await runAlertsDigest({ db, now: () => NOW })
    expect(summary.usersNotified).toBe(0)
    const notifs = await db.sql`SELECT id FROM notifications`
    expect(notifs).toHaveLength(0)
  })
})
