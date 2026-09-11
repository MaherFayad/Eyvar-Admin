/**
 * `/api/cron/snapshot` (`5 21 * * *` UTC, 00:05 Riyadh) — AC-1285: writes the
 * nine fields `captureDailySnapshot` captured in the legacy prototype
 * (`eyvar_ops_panel_v40_fixed.html:7638-7651`), idempotent per day via
 * `daily_snapshots`'s `day` primary key and an `ON CONFLICT ... DO UPDATE`
 * (running it twice for the same day overwrites the same row, never inserts
 * a second one).
 *
 * The legacy formula reads a `DB.payments` ledger this schema does not have
 * yet (`05-backend.md` §11 item 1: the operational tables' real names and
 * shapes are still the owner's to supply). Translated onto the fixture
 * tables `0005_runs.sql` actually seeded: `quickRideRevenueHalalas` sums
 * `fixture_trips.fareHalalas` for completed quick rides, `subRevenueHalalas`
 * sums `fixture_subscriptions.paidHalalas`, and `totalRevenueHalalas` is
 * their sum — the same three-way split the legacy `revenue`/`quickRevenue`/
 * `subRevenue` reduce over `paidPayments`, on the data this deployment
 * actually has.
 */
import { localDayOf } from '@/data/reporting/buckets'
import type { IsoDate } from '@/data/types/common'
import { createPgPoolDatabase, type Database } from '../_lib/db'
import { requireCronSecret } from '../_lib/cronAuth'
import { errorResponse } from '../_lib/errors'
import { jsonResponse } from '../_lib/envelope'

export interface SnapshotDeps {
  db: Database
  today?: () => IsoDate
}

export interface SnapshotResult {
  day: IsoDate
  riders: number
  drivers: number
  activeSubscriptions: number
  quickRides: number
  cancelRatePct: number
  totalRevenueHalalas: number
  quickRideRevenueHalalas: number
  subRevenueHalalas: number
}

/** The cron's core, `(db, today)` — unit-tested with a frozen `today` (05-backend.md §9). */
export async function captureDailySnapshot(deps: SnapshotDeps): Promise<SnapshotResult> {
  const { db } = deps
  const today = deps.today ?? (() => localDayOf(new Date().toISOString()))
  const day = today()

  const [ridersRows, driversRows, activeSubsRows, quickRidesRows, cancelledRows, quickRevenueRows, subRevenueRows] = await Promise.all([
    db.sql<{ count: string }>`SELECT count(*)::text AS count FROM fixture_riders`,
    db.sql<{ count: string }>`SELECT count(*)::text AS count FROM fixture_drivers WHERE "driver.status" <> 'pending'`,
    // Legacy `!/cancel/i.test(status)` — every non-cancelled subscription status counts as active.
    db.sql<{ count: string }>`SELECT count(*)::text AS count FROM fixture_subscriptions WHERE "subscription.status" !~* 'cancel'`,
    db.sql<{ count: string }>`SELECT count(*)::text AS count FROM fixture_trips WHERE "trip.kind" = 'Quick ride'`,
    db.sql<{ count: string }>`SELECT count(*)::text AS count FROM fixture_trips WHERE "trip.kind" = 'Quick ride' AND "trip.status" = 'cancelled'`,
    db.sql<{ total: string | null }>`SELECT COALESCE(SUM("fareHalalas"), 0)::text AS total FROM fixture_trips WHERE "trip.kind" = 'Quick ride' AND "trip.status" = 'done'`,
    db.sql<{ total: string | null }>`SELECT COALESCE(SUM("paidHalalas"), 0)::text AS total FROM fixture_subscriptions`,
  ])

  const riders = Number(ridersRows[0]?.count ?? 0)
  const drivers = Number(driversRows[0]?.count ?? 0)
  const activeSubscriptions = Number(activeSubsRows[0]?.count ?? 0)
  const quickRides = Number(quickRidesRows[0]?.count ?? 0)
  const cancelled = Number(cancelledRows[0]?.count ?? 0)
  const cancelRatePct = quickRides > 0 ? Math.round((cancelled / quickRides) * 100) : 0
  const quickRideRevenueHalalas = Number(quickRevenueRows[0]?.total ?? 0)
  const subRevenueHalalas = Number(subRevenueRows[0]?.total ?? 0)
  const totalRevenueHalalas = quickRideRevenueHalalas + subRevenueHalalas

  await db.sql`
    INSERT INTO daily_snapshots (
      day, riders, drivers, active_subscriptions, quick_rides, cancel_rate_pct,
      total_revenue_halalas, quick_ride_revenue_halalas, sub_revenue_halalas, captured_at
    ) VALUES (
      ${day}, ${riders}, ${drivers}, ${activeSubscriptions}, ${quickRides}, ${cancelRatePct},
      ${totalRevenueHalalas}, ${quickRideRevenueHalalas}, ${subRevenueHalalas}, now()
    )
    ON CONFLICT (day) DO UPDATE SET
      riders = EXCLUDED.riders, drivers = EXCLUDED.drivers, active_subscriptions = EXCLUDED.active_subscriptions,
      quick_rides = EXCLUDED.quick_rides, cancel_rate_pct = EXCLUDED.cancel_rate_pct,
      total_revenue_halalas = EXCLUDED.total_revenue_halalas, quick_ride_revenue_halalas = EXCLUDED.quick_ride_revenue_halalas,
      sub_revenue_halalas = EXCLUDED.sub_revenue_halalas, captured_at = now()
  `

  return { day, riders, drivers, activeSubscriptions, quickRides, cancelRatePct, totalRevenueHalalas, quickRideRevenueHalalas, subRevenueHalalas }
}

export default async function handler(req: Request): Promise<Response> {
  const requestId = req.headers.get('x-vercel-id') ?? crypto.randomUUID()
  try {
    requireCronSecret(req)
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) throw new Error('DATABASE_URL is not set')
    const db = createPgPoolDatabase(connectionString)
    try {
      const result = await captureDailySnapshot({ db })
      return jsonResponse(result)
    } finally {
      await db.close()
    }
  } catch (err) {
    return errorResponse(err, requestId)
  }
}
