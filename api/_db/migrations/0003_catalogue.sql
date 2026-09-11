-- 0003_catalogue: measures, dimensions, measure_sources — WP-6.3
-- (05-backend.md §3, §6; AC-1275). WP-6.1's `fixtures-to-seed.mjs` stub
-- emitted six columns and said this migration owns the real set — this is
-- that set: every field of `Measure` (`src/data/types/measure.ts`) and
-- `Dimension`, so `catalogue.measures` can equal the fixture list field for
-- field with nothing invented and nothing dropped.
--
-- Column choices that depart from 05-backend.md §3's sketch, and why:
--   * `coverage_from`/`coverage_to` are TEXT, not DATE. `MeasureCoverage`'s
--     fields are `IsoDate` — a plain 'YYYY-MM-DD' string — and every driver
--     this project's `Database` seam runs on (`pg`, the Neon HTTP driver,
--     PGlite) parses a DATE column into a JS `Date`, not that string. A
--     `Date` round-trips to a different value depending on the reading
--     timezone, which is exactly the AC-1275 failure mode ("a field cannot
--     survive the round trip"). TEXT stores and returns the literal string.
--   * `sort_order` exists on both `measures` and `dimensions` so `ORDER BY
--     sort_order` reproduces the fixture array's own order. Neither table
--     has a natural total order (`category`, `key` alphabetical) that
--     matches `measureFixtures`, and the contract-equality test compares
--     arrays positionally.
--   * `permission_key` alone (05-backend.md §3's sketch) loses
--     `PermissionRef.level` — added `permission_level` so the pair
--     round-trips whole.
--   * `displayed_as_metric_keys_json` and `funnel_capabilities_json` are not
--     in §3's sketch at all; both are `Measure` fields, so both get a column.
--   * Nested `MeasurePopulation` fields (other than coverage, above) are
--     sibling `population_*` columns rather than one JSON blob: the compiler
--     (WP-6.4) filters on `population_resource` and `population_time_field`
--     per leg, and a column beats unpacking JSON on every row.
--   * `population_predicate_json`, `bucket_aggregate_options_json`,
--     `dimensions_json`, `filterable_fields_json`, `funnel_capabilities_json`
--     and `pii_columns_json` are JSONB. Postgres does not reorder JSONB
--     array elements; it does not guarantee object *key* order, which is
--     harmless here because the handler reconstructs each row into a JS
--     object and the contract-equality test compares objects structurally
--     (`toEqual`), never by re-serialising to a JSON string.

CREATE TABLE IF NOT EXISTS measures (
  key                            TEXT PRIMARY KEY,
  sort_order                     INTEGER NOT NULL,
  label_key                      TEXT NOT NULL,
  category                       TEXT NOT NULL,

  -- MeasurePopulation
  population_resource            TEXT NOT NULL,
  population_predicate_json      JSONB NOT NULL DEFAULT '[]'::jsonb,
  population_predicate_key       TEXT NOT NULL,
  population_time_field          TEXT NOT NULL,
  population_value_field         TEXT,
  coverage_from                  TEXT NOT NULL,
  coverage_to                    TEXT NOT NULL,

  temporality                    TEXT NOT NULL CHECK (temporality IN ('stock', 'flow')),
  bucket_aggregate               TEXT NOT NULL CHECK (bucket_aggregate IN ('count', 'sum', 'mean', 'end-of-period', 'cumulative-count')),
  bucket_aggregate_options_json  JSONB,
  additive                       BOOLEAN NOT NULL,
  unit                           TEXT NOT NULL,
  currency                       TEXT,
  higher_is_better               BOOLEAN NOT NULL,
  min_grain                      TEXT NOT NULL CHECK (min_grain IN ('hour', 'day', 'week', 'month', 'quarter')),
  dimensions_json                JSONB NOT NULL DEFAULT '[]'::jsonb,
  filterable_fields_json         JSONB NOT NULL DEFAULT '[]'::jsonb,
  permission_key                 TEXT,
  permission_level               TEXT CHECK (permission_level IN ('full', 'read')),
  caption_key                    TEXT,
  displayed_as_metric_keys_json  JSONB NOT NULL DEFAULT '[]'::jsonb,
  supports_performed             BOOLEAN,
  funnel_capabilities_json       JSONB,

  created_at                     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS measures_sort_order_idx ON measures (sort_order);
-- `MeasureQuery.category` (catalogue.ts docblock: "params: q · category · pairableWith").
CREATE INDEX IF NOT EXISTS measures_category_idx ON measures (category);
-- `reports.run`'s permission check (05-backend.md §4) filters on this per leg.
CREATE INDEX IF NOT EXISTS measures_permission_key_idx ON measures (permission_key);

CREATE TABLE IF NOT EXISTS dimensions (
  key              TEXT PRIMARY KEY,
  sort_order       INTEGER NOT NULL,
  label_key        TEXT NOT NULL,
  resource         TEXT NOT NULL,
  field            TEXT NOT NULL,
  cardinality_hint INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS dimensions_sort_order_idx ON dimensions (sort_order);
-- The compiler groups by up to two dimensions of the same resource as a measure (05-backend.md §6.4).
CREATE INDEX IF NOT EXISTS dimensions_resource_idx ON dimensions (resource);

-- The compiler's resource -> table map (05-backend.md §6, step 1). No
-- fixture backs this table: it names real operational tables, which
-- 05-backend.md §11 item 1 lists as still awaiting the owner ("where the
-- operational tables live and their names"). Left empty on purpose — a
-- deliberate deferral, not an oversight, noted in WP-6.3's report.
CREATE TABLE IF NOT EXISTS measure_sources (
  resource          TEXT PRIMARY KEY,
  table_name        TEXT NOT NULL,
  time_column       TEXT NOT NULL,
  subject_column    TEXT NOT NULL,
  pii_columns_json  JSONB NOT NULL DEFAULT '[]'::jsonb
);
