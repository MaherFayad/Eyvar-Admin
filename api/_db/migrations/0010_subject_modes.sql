-- 0010_subject_modes: what the funnel, cohort and journey compiler needs
-- beyond the trend/formula path — WP-6.4c (05-backend.md §6, AC-1276's
-- RPT-6/RPT-7/RPT-8).
--
-- ## `measure_sources.row_id_column`
--
-- `resolveReport.ts`'s `SubjectEvent.rowId` (`${resource}#${fixture-array-
-- index}`) exists for exactly one observable purpose across funnel, cohort
-- and journey: `resolveJourney`'s `e.rowId !== start.rowId`, telling "the
-- same physical row reappearing under a different measure" from "a genuinely
-- different row". Every other read of `rowId` is a sort tie-break between two
-- events that already share a date (and, in `resolveJourney`'s own sort, a
-- `measureKey` too) — ties whose outcome is provably the same string either
-- way, so array-index parity with the mock is not required, only a stable
-- per-row identity. A real primary key gives that identity directly, so this
-- column names it per resource rather than each server query re-deriving
-- "the first column" by convention. Every resource seeded here already
-- names its key `id`; a future real table can override the default with the
-- one-row `UPDATE measure_sources` `05-backend.md` §6 already promises for
-- `table_name`.
ALTER TABLE measure_sources
  ADD COLUMN IF NOT EXISTS row_id_column TEXT NOT NULL DEFAULT 'id';

-- ## `fixture_riders."lastTripAt"` and `fixture_trips."driverId"`
--
-- `resolveCohort`'s `returnMeasureKeys: []` path (RPT-7) reads "still here"
-- off the subject's own record — `lastActiveOf` in the mock — not off a
-- named return measure. For a rider that is `riderFixtures[i].lastTripAt`,
-- a field `0005_runs.sql` never carried because no compiler leg needed it
-- before this WP. For a driver it is derived from `trips.driverId`, a
-- column the same migration also omitted (`fixture_trips` only ever needed
-- `riderId`, the trend/funnel/journey subject). Both are added now so the
-- cohort compiler can answer *without either* the same way the mock does —
-- reading a recorded fact, never inventing one (AC-453).
ALTER TABLE fixture_riders
  ADD COLUMN IF NOT EXISTS "lastTripAt" TEXT;

ALTER TABLE fixture_trips
  ADD COLUMN IF NOT EXISTS "driverId" TEXT;

CREATE INDEX IF NOT EXISTS fixture_trips_driver_id_idx ON fixture_trips ("driverId");
