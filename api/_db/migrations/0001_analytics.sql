-- 0001_analytics: foundational objects only. Domain tables (measures,
-- reports, pages, alerts, agent) belong to WP-6.2 … WP-6.7's own migrations
-- (05-backend.md §3). `schema_migrations` itself is created by
-- `api/_db/migrate.mjs` before any file runs, not here.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- `audit_log` — exports, sample_rows, config changes (05-backend.md §3). No
-- enum here: `action`, `acting_via` and `entity_type` are open vocabularies
-- across every WP that writes an entry, so a closed type would need
-- revisiting on each one. A later migration may tighten it once every writer
-- is known.
CREATE TABLE IF NOT EXISTS audit_log (
  id           TEXT PRIMARY KEY DEFAULT ('al_' || replace(gen_random_uuid()::text, '-', '')),
  at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id      TEXT NOT NULL,
  acting_via   TEXT NOT NULL DEFAULT 'operator',
  action       TEXT NOT NULL,
  entity_type  TEXT NOT NULL,
  entity_id    TEXT NOT NULL,
  summary_json JSONB NOT NULL DEFAULT '{}'::jsonb
);
