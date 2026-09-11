-- 0008_live_window: measure_sources gets a real live-window upper bound —
-- WP-6.4b Gap 1. `0005_runs.sql`'s `live_to_column` is a single column, so it
-- can say "live until X" but not "live until X, or earlier if cancelled
-- before X" — exactly `subscriptions`' true rule (`startedOn`, `endsOn`,
-- **and** `cancelledAt`; see `src/data/mock/resolveReport.ts`'s
-- `subscriptionSource.liveAt`).
--
-- `live_to_bounds_json` replaces it with an ordered array of upper bounds,
-- each `{field, exclusive?}`. `field` resolves through the same
-- `field_columns_json` map every other catalogue field already goes through
-- (`compile.ts`'s `resolveColumn`), so `cancelledAt`'s Riyadh-local-day
-- conversion needs no special case. `exclusive: true` shifts that bound back
-- one calendar day — the SQL form of the mock's `localDayOf(cancelledAt) >
-- day` (strictly after, not on-or-after). `compile.ts` combines every
-- resolved bound with `LEAST(...)`, which ignores a NULL argument rather
-- than propagating it, so a never-cancelled subscription's `cancelledAt`
-- bound simply drops out and `endsOn` alone decides. An empty array is
-- open-ended, same as the old scheme's `live_to_column IS NULL` (`drivers`,
-- `riders`).
--
-- `field_columns_json` also gets the namespaced predicate field
-- `subscriptions.cancelled` reads (`subscription.cancelledAt`) mapped onto
-- the same real `cancelledAt` column the unnamespaced `cancelledAt` key
-- already names — that predicate had no column to resolve to before this.

ALTER TABLE measure_sources
  ADD COLUMN IF NOT EXISTS live_to_bounds_json JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE measure_sources
SET live_to_bounds_json = jsonb_build_array(jsonb_build_object('field', live_to_column))
WHERE live_to_column IS NOT NULL;

UPDATE measure_sources
SET live_to_bounds_json = '[{"field": "endsOn"}, {"field": "cancelledAt", "exclusive": true}]'::jsonb,
    field_columns_json = field_columns_json || '{"subscription.cancelledAt": {"column": "cancelledAt", "localDay": true}}'::jsonb
WHERE resource = 'subscriptions';

-- Superseded by `live_to_bounds_json`; nothing reads it after this migration.
ALTER TABLE measure_sources DROP COLUMN IF EXISTS live_to_column;
