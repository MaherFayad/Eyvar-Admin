/**
 * `/api/cron/snapshot` — AC-1285: idempotent per day, the nine legacy
 * fields, and the `CRON_SECRET` guard every cron handler carries.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { createTestDatabase } from '../_test/db'
import type { Database } from '../_lib/db'
import { captureDailySnapshot } from './snapshot'
import { requireCronSecret } from '../_lib/cronAuth'

let pglite: PGlite
let db: Database

beforeEach(async () => {
  const setup = await createTestDatabase()
  pglite = setup.pglite
  db = setup.db
  await db.sql`
    INSERT INTO fixture_riders (id, "joinedAt", "rider.city", "rider.status") VALUES
      ('R1', '2026-01-01', 'Riyadh', 'active'), ('R2', '2026-01-02', 'Jeddah', 'active')
  `
  await db.sql`
    INSERT INTO fixture_drivers (id, "joinedAt", "driver.city", "driver.vehicleClass", "driver.status") VALUES
      ('D1', '2026-01-01', 'Riyadh', 'sedan', 'active'),
      ('D2', '2026-01-01', 'Riyadh', 'sedan', 'pending')
  `
  await db.sql`
    INSERT INTO fixture_subscriptions (id, "riderId", "startedOn", "endsOn", "subscription.plan", "subscription.vehicleClass", "subscription.status", "paidHalalas") VALUES
      ('S1', 'R1', '2026-01-01', '2026-12-31', 'plus', 'sedan', 'active', 10000),
      ('S2', 'R2', '2026-01-01', '2026-12-31', 'plus', 'sedan', 'cancelled', 8000)
  `
  await db.sql`
    INSERT INTO fixture_trips (id, "riderId", "endedAt", "trip.kind", "trip.status", "fareHalalas") VALUES
      ('T1', 'R1', '2026-06-25T08:00:00+03:00', 'Quick ride', 'done', 3000),
      ('T2', 'R2', '2026-06-25T09:00:00+03:00', 'Quick ride', 'cancelled', 0),
      ('T3', 'R1', '2026-06-25T10:00:00+03:00', 'Subscription', 'done', 0)
  `
})

afterEach(async () => {
  await pglite.close()
})

describe('AC-1285: captureDailySnapshot', () => {
  it('writes the nine fields from the operational rows', async () => {
    const result = await captureDailySnapshot({ db, today: () => '2026-06-25' })
    expect(result).toEqual({
      day: '2026-06-25',
      riders: 2,
      drivers: 1, // D2 is 'pending', excluded
      activeSubscriptions: 1, // S2 is 'cancelled', excluded
      quickRides: 2, // T1, T2
      cancelRatePct: 50, // 1 of 2 quick rides cancelled
      totalRevenueHalalas: 21000,
      quickRideRevenueHalalas: 3000, // T1 only — T2 is cancelled, not 'done'
      subRevenueHalalas: 18000, // S1 (10000) + S2 (8000) — every subscription's paidHalalas, cancelled or not, the legacy ledger-sum reading
    })
  })

  it('is idempotent per day — running it twice for the same day updates the one row rather than inserting a second', async () => {
    await captureDailySnapshot({ db, today: () => '2026-06-25' })
    await db.sql`INSERT INTO fixture_trips (id, "riderId", "endedAt", "trip.kind", "trip.status", "fareHalalas") VALUES ('T4', 'R1', '2026-06-25T11:00:00+03:00', 'Quick ride', 'done', 5000)`
    await captureDailySnapshot({ db, today: () => '2026-06-25' })

    const rows = await db.sql<{ day: string; quick_rides: number; total_revenue_halalas: number }>`SELECT day, quick_rides, total_revenue_halalas FROM daily_snapshots WHERE day = '2026-06-25'`
    expect(rows).toHaveLength(1)
    expect(rows[0]!.quick_rides).toBe(3)
    expect(rows[0]!.total_revenue_halalas).toBe(26000) // the second run's own read, not a sum of the two runs
  })
})

describe('every cron is guarded by CRON_SECRET', () => {
  it('refuses a request with no bearer token, and with the wrong one', () => {
    const req1 = new Request('http://internal/api/cron/snapshot')
    expect(() => requireCronSecret(req1, 'the-real-secret')).toThrow()

    const req2 = new Request('http://internal/api/cron/snapshot', { headers: { authorization: 'Bearer wrong' } })
    expect(() => requireCronSecret(req2, 'the-real-secret')).toThrow()

    const req3 = new Request('http://internal/api/cron/snapshot', { headers: { authorization: 'Bearer the-real-secret' } })
    expect(() => requireCronSecret(req3, 'the-real-secret')).not.toThrow()
  })

  it('the default export 401s an unauthenticated request without touching the database', async () => {
    delete process.env.CRON_SECRET
    delete process.env.DATABASE_URL
    const handler = (await import('./snapshot')).default
    const res = await handler(new Request('http://internal/api/cron/snapshot'))
    expect(res.status).toBe(401)
  })
})
