-- 0006_pages: saved reports (tags, stars, version history), segments,
-- annotations, pages and their reverse index — WP-6.5 (05-backend.md §3, §7;
-- AC-1279, AC-1280, AC-1281).
--
-- ## JSONB columns store the TS shape verbatim, camelCase keys included
--
-- Same rule `0003_catalogue.sql` states for `dimensions_json` etc: every
-- `*_json` column here holds a JS value serialised as-is (`query_json` is a
-- `ReportQuery`, `blocks_json` is `Block[]`, `scope_json` is `Page['scope']`)
-- so the handler never re-keys between a wire shape and a storage shape —
-- one write, one read, no translation layer to drift.
--
-- ## `page_reports` is a real reverse index, not a cache of `blocks_json`
--
-- AC-1280: the server answers "which pages embed this report" from this
-- table, never by scanning `pages.blocks_json`. `handlers/pages.ts` deletes
-- and re-inserts a page's rows on every save (create, update, duplicate), so
-- the table always reflects the page's current blocks, not its history.
-- `report_id` carries no foreign key: a page's `report` block can 404 (§2 —
-- "a report block whose report 404s renders the `missing` state"), and the
-- index has to keep naming a deleted or otherwise-missing report as still
-- embedded until the page itself is edited to drop it.

CREATE TABLE IF NOT EXISTS saved_reports (
  id          TEXT PRIMARY KEY DEFAULT ('rpt_' || replace(gen_random_uuid()::text, '-', '')),
  name        TEXT NOT NULL,
  description TEXT,
  query_json  JSONB NOT NULL,
  owner_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visibility  TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'team')),
  tags_json   JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Set only by `manage_analytics` per `02-report-builder-v2.md` §? — that key
  -- is not yet minted in `PermissionKey` (D17; `annotation.ts`'s own comment
  -- says the same). Gated behind `view_analytics` here until the navigation
  -- owner mints it; named as a gap in this WP's report.
  official    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  TEXT NOT NULL REFERENCES users(id),
  last_run_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS saved_reports_owner_idx ON saved_reports (owner_id);
CREATE INDEX IF NOT EXISTS saved_reports_tags_gin_idx ON saved_reports USING GIN (tags_json);

-- Last 20 per report (§3) — `handlers/reports.ts` prunes anything older than
-- the 20th-newest row after every insert, in the same statement style
-- `api/cron/housekeeping.ts` (a later WP) will use for its own sweeps.
CREATE TABLE IF NOT EXISTS saved_report_versions (
  report_id  TEXT NOT NULL REFERENCES saved_reports(id) ON DELETE CASCADE,
  at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  by         TEXT NOT NULL REFERENCES users(id),
  query_json JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS saved_report_versions_report_idx ON saved_report_versions (report_id, at DESC);

CREATE TABLE IF NOT EXISTS saved_report_stars (
  report_id  TEXT NOT NULL REFERENCES saved_reports(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (report_id, user_id)
);

CREATE TABLE IF NOT EXISTS segments (
  id             TEXT PRIMARY KEY DEFAULT ('seg_' || replace(gen_random_uuid()::text, '-', '')),
  name           TEXT NOT NULL,
  description    TEXT,
  filters_json   JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- `PerformedSpec | null` (`segment.ts`) — a segment need not be behavioural.
  performed_json JSONB,
  owner_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visibility     TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'team')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS segments_owner_idx ON segments (owner_id);

CREATE TABLE IF NOT EXISTS annotations (
  id         TEXT PRIMARY KEY DEFAULT ('ann_' || replace(gen_random_uuid()::text, '-', '')),
  -- `IsoDate`, not `TIMESTAMPTZ`: an annotation marks a calendar day on a
  -- trend chart (`annotation.ts`), not an instant.
  date       TEXT NOT NULL,
  label      TEXT NOT NULL,
  note       TEXT NOT NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('launch', 'price', 'incident', 'campaign', 'other')),
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS annotations_date_idx ON annotations (date);

CREATE TABLE IF NOT EXISTS pages (
  id           TEXT PRIMARY KEY DEFAULT ('pg_' || replace(gen_random_uuid()::text, '-', '')),
  kind         TEXT NOT NULL CHECK (kind IN ('dashboard', 'case-study', 'note')),
  title        TEXT NOT NULL,
  icon         TEXT,
  description  TEXT,
  owner_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visibility   TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'team')),
  tags_json    JSONB NOT NULL DEFAULT '[]'::jsonb,
  official     BOOLEAN NOT NULL DEFAULT false,
  -- Set on a page created from a template (agent output, a copied case
  -- study); `NULL` for a page an operator started from blank. Not read by
  -- any WP-6.5 handler — carried so a later template-gallery WP has
  -- somewhere to write it without another migration.
  template     TEXT,
  scope_json   JSONB NOT NULL DEFAULT '{"range": null, "filters": []}'::jsonb,
  blocks_json  JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- AC-1279: server-incremented, checked on every `PATCH`.
  version      INTEGER NOT NULL DEFAULT 1,
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by   TEXT NOT NULL REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS pages_kind_owner_idx ON pages (kind, owner_id);
CREATE INDEX IF NOT EXISTS pages_tags_gin_idx ON pages USING GIN (tags_json);

CREATE TABLE IF NOT EXISTS page_reports (
  page_id   TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  report_id TEXT NOT NULL,
  PRIMARY KEY (page_id, report_id)
);
CREATE INDEX IF NOT EXISTS page_reports_report_idx ON page_reports (report_id);

CREATE TABLE IF NOT EXISTS page_stars (
  page_id    TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (page_id, user_id)
);
