-- 0013_wrong_number_fixes: two measures returning a wrong number under a
-- correct label (analyst study 2026-09-16, F5/H4).
--
-- ## `financials.arpa`
--
-- Was reading `sub_revenue_halalas` unchanged — byte-identical to
-- `revenue.subscription`, never divided by anything. ARPA is subscription
-- revenue ÷ active subscribers, but `subscriptions.active` (the row-level
-- stock) is an order of magnitude apart from the snapshot's own count
-- (`src/data/fixtures/measures.ts`'s file header: "no measure … is sourced
-- from both"), so the divisor has to be the snapshot's own
-- `active_subscriptions`, not the row-level stock. A `GENERATED ALWAYS …
-- STORED` column reads both from the one row the cron already writes
-- (AC-1285's nine fields, untouched) — the cron never has to know this
-- column exists. `NULLIF` turns a zero-subscriber day into a real `NULL`,
-- never `0` or `Infinity`.
ALTER TABLE daily_snapshots
  ADD COLUMN IF NOT EXISTS arpa_halalas INTEGER GENERATED ALWAYS AS (
    ROUND(sub_revenue_halalas::numeric / NULLIF(active_subscriptions, 0))
  ) STORED;

UPDATE measure_sources
SET field_columns_json = field_columns_json || '{"arpaHalalas": "arpa_halalas"}'::jsonb
WHERE resource = 'daily-snapshots';

-- ## `requests.timeToAssign`
--
-- Was declared on `trips` with `valueField: null`: every row contributed
-- `1`, so `mean` returned a constant 1 minute for 45 days. The real
-- duration lives on the dispatch queue (`requestedAt` → `assignedAt`), the
-- same rows `clients/metrics.ts`'s `operations.overview.medianTimeToAssign`
-- already reads. `timeToAssignMinutes` is precomputed at seed time
-- (`scripts/fixtures-to-seed.mjs`), the same arithmetic
-- `resolveReport.ts`'s `requestSource.valueOf` runs, so the two sides
-- cannot drift on the formula even though `compile.ts` can only read a
-- plain column, never derive one.
CREATE TABLE IF NOT EXISTS fixture_requests (
  id                     TEXT PRIMARY KEY,
  "riderId"              TEXT NOT NULL,
  "requestedAt"          TEXT NOT NULL,
  "request.assignedAt"   TEXT,
  "timeToAssignMinutes"  DOUBLE PRECISION
);

INSERT INTO measure_sources (resource, table_name, time_column, subject_column, supports_stock, field_columns_json, pii_columns_json)
VALUES (
  'requests', 'fixture_requests', 'requestedAt', 'riderId', false,
  '{"requestedAt": {"column": "requestedAt", "localDay": true}}'::jsonb,
  '[]'::jsonb
)
ON CONFLICT (resource) DO UPDATE SET
  table_name = EXCLUDED.table_name,
  time_column = EXCLUDED.time_column,
  subject_column = EXCLUDED.subject_column,
  supports_stock = EXCLUDED.supports_stock,
  field_columns_json = EXCLUDED.field_columns_json;
