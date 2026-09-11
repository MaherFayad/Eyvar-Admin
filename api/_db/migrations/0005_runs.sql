-- 0005_runs: report_runs, daily_snapshots, and the compiler's operational
-- population — WP-6.4 (05-backend.md §5, §6; AC-1276, AC-1277, AC-1278).
--
-- ## measure_sources gets three columns 0003_catalogue.sql did not sketch
--
-- `05-backend.md` §3's sketch is `(resource, table_name, time_column,
-- subject_column, pii_columns_json)`. The compiler needs three more facts a
-- single time/subject pair cannot carry, each added here with the reason:
--
--   * `field_columns_json` — a per-resource map from a catalogue field name
--     (`population.timeField`, `population.valueField`, a `Dimension.field`,
--     e.g. `'trip.status'`, `'totalRevenueHalalas'`) to the real column, only
--     where it differs from the field name itself. Every fixture-seeded table
--     below names its columns **exactly** as the catalogue field strings
--     (quoted identifiers, dots included — legal in Postgres), so this map is
--     empty for four of five resources and the compiler never needs a
--     per-resource field switch statement. `daily_snapshots` is the exception:
--     it is a *real* operational table (the snapshot cron, AC-1285, writes to
--     it under its own snake_case names), so its map translates
--     `'totalRevenueHalalas'` to `'total_revenue_halalas'` and so on.
--   * `live_to_column` — the upper bound, inclusive, of a stock row's
--     liveness window; `NULL` is open-ended. Pairs with `time_column` as the
--     lower bound so `compile.ts` can answer "live as at day X" for
--     `end-of-period`/`cumulative-count` measures without a resource-specific
--     formula. **Known gap:** `subscriptions`' true liveness also depends on
--     `cancelledAt` (live only until cancelled, if cancelled before `endsOn`)
--     — a third bound this two-column scheme cannot express. `endsOn` alone
--     over-counts a cancelled-early subscription as still live. Not exercised
--     by any seeded saved report (WP-6.4's report names the two measures this
--     affects — `subscriptions.active`, `subscriptions.cancelled` — as not
--     verified), and left for the WP that needs them rather than widened
--     speculatively here.
--   * `supports_stock` — resource-level, matching `RowSource.liveAt !== null`
--     in `src/data/mock/resolveReport.ts`: whether *any* stock read is
--     answerable for this resource at all, independent of which measure asks.
--
-- ## Why the four non-snapshot tables are `fixture_*`, not real names
--
-- WP-6.4's brief is explicit that the real operational table names are still
-- the owner's to supply (`05-backend.md` §11 item 1). Naming these
-- `fixture_drivers` rather than `drivers` means a `SELECT * FROM drivers`
-- written against a future real table cannot silently hit this one by
-- accident, and remapping is the one-row `UPDATE measure_sources SET
-- table_name = …` `05-backend.md` §6 promises — no compiler change, no
-- migration.
--
-- `daily_snapshots` is not prefixed: it is genuinely the operational table
-- (`05-backend.md` §3, §8; AC-1285's snapshot cron writes it), so this
-- migration creates it in its real, final shape and only *also* seeds rows
-- into it for the equality test.

ALTER TABLE measure_sources
  ADD COLUMN IF NOT EXISTS live_to_column     TEXT,
  ADD COLUMN IF NOT EXISTS supports_stock     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS field_columns_json JSONB NOT NULL DEFAULT '{}'::jsonb;

-- `subject_column` was declared NOT NULL by 0003; a snapshot row names nobody
-- (`snapshotSource.subject: null` in the mock) so the column must accept it.
ALTER TABLE measure_sources ALTER COLUMN subject_column DROP NOT NULL;

CREATE TABLE IF NOT EXISTS report_runs (
  id          TEXT PRIMARY KEY DEFAULT ('run_' || replace(gen_random_uuid()::text, '-', '')),
  user_id     TEXT NOT NULL,
  query_json  JSONB NOT NULL,
  result_json JSONB NOT NULL,
  as_of       TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- The agent path's provenance (05-backend.md §5): `X-Eyvar-Record-Run: 1`
  -- on a run made through `X-Eyvar-Acting-For` writes this. `NULL` for an
  -- ordinary operator run.
  job_id      TEXT
);

CREATE INDEX IF NOT EXISTS report_runs_user_created_idx ON report_runs (user_id, created_at);

-- The nine fields the legacy prototype captured (`eyvar_ops_panel_v40_fixed.html:7648-7651`,
-- `05-backend.md` §8, AC-1285), snake_case per §3's own sketch — the snapshot
-- cron (a different WP) writes this table under those exact names, so this
-- migration does not rename them the way it renames the fixture tables.
CREATE TABLE IF NOT EXISTS daily_snapshots (
  day                        TEXT PRIMARY KEY,
  riders                     INTEGER NOT NULL,
  drivers                    INTEGER NOT NULL,
  active_subscriptions       INTEGER NOT NULL,
  quick_rides                INTEGER NOT NULL,
  cancel_rate_pct            NUMERIC NOT NULL,
  total_revenue_halalas      INTEGER NOT NULL,
  quick_ride_revenue_halalas INTEGER NOT NULL,
  sub_revenue_halalas        INTEGER NOT NULL,
  captured_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- `captains.registered` / `riders.registered` — cumulative-count stock,
-- `joinedAt` monotone (`driverSource`/`riderSource` in resolveReport.ts).
CREATE TABLE IF NOT EXISTS fixture_drivers (
  id                        TEXT PRIMARY KEY,
  "joinedAt"                TEXT NOT NULL,
  "driver.city"             TEXT NOT NULL,
  "driver.vehicleClass"     TEXT NOT NULL,
  "driver.status"           TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fixture_riders (
  id                        TEXT PRIMARY KEY,
  "joinedAt"                TEXT NOT NULL,
  "rider.city"              TEXT NOT NULL,
  "rider.status"            TEXT NOT NULL
);

-- `subscriptions.started` (flow, count) is the only subscriptions measure a
-- seeded saved report uses; `startedOn`/`endsOn` are plain IsoDate columns
-- (no timezone conversion), `cancelledAt` is a full IsoDateTime and carries
-- `localDay: true` in `field_columns_json` for the one measure that reads it.
CREATE TABLE IF NOT EXISTS fixture_subscriptions (
  id                          TEXT PRIMARY KEY,
  "riderId"                   TEXT NOT NULL,
  "startedOn"                 TEXT NOT NULL,
  "endsOn"                    TEXT NOT NULL,
  "cancelledAt"                TEXT,
  "subscription.plan"         TEXT NOT NULL,
  "subscription.vehicleClass" TEXT NOT NULL,
  "subscription.status"       TEXT NOT NULL,
  "paidHalalas"                INTEGER NOT NULL
);

-- `trips.completed` — flow, count, filtered on `"trip.status" = 'done'`
-- (the measure's own population predicate). `endedAt` is a full IsoDateTime
-- with an explicit Riyadh offset; `dateOf` buckets on its **local day**
-- (`localDayOf`, never the raw UTC date), so `field_columns_json` marks it
-- `localDay: true`.
CREATE TABLE IF NOT EXISTS fixture_trips (
  id                TEXT PRIMARY KEY,
  "riderId"         TEXT NOT NULL,
  "endedAt"         TEXT,
  "trip.kind"       TEXT NOT NULL,
  "trip.status"     TEXT NOT NULL,
  "trip.pickup"     TEXT,
  "fareHalalas"     INTEGER NOT NULL
);

INSERT INTO measure_sources (resource, table_name, time_column, subject_column, live_to_column, supports_stock, field_columns_json, pii_columns_json)
VALUES
  ('drivers', 'fixture_drivers', 'joinedAt', 'id', NULL, true, '{}'::jsonb, '[]'::jsonb),
  ('riders', 'fixture_riders', 'joinedAt', 'id', NULL, true, '{}'::jsonb, '[]'::jsonb),
  ('subscriptions', 'fixture_subscriptions', 'startedOn', 'riderId', 'endsOn', true,
    '{"cancelledAt": {"column": "cancelledAt", "localDay": true}}'::jsonb, '[]'::jsonb),
  ('trips', 'fixture_trips', 'endedAt', 'riderId', NULL, false,
    '{"endedAt": {"column": "endedAt", "localDay": true}}'::jsonb, '[]'::jsonb),
  ('daily-snapshots', 'daily_snapshots', 'day', NULL, NULL, false,
    '{"date": "day", "riders": "riders", "drivers": "drivers", "activeSubs": "active_subscriptions", "quickRides": "quick_rides", "cancelRatePct": "cancel_rate_pct", "totalRevenueHalalas": "total_revenue_halalas", "quickRideRevenueHalalas": "quick_ride_revenue_halalas", "subRevenueHalalas": "sub_revenue_halalas"}'::jsonb,
    '[]'::jsonb)
ON CONFLICT (resource) DO UPDATE SET
  table_name = EXCLUDED.table_name,
  time_column = EXCLUDED.time_column,
  subject_column = EXCLUDED.subject_column,
  live_to_column = EXCLUDED.live_to_column,
  supports_stock = EXCLUDED.supports_stock,
  field_columns_json = EXCLUDED.field_columns_json;
