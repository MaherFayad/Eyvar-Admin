-- 0011_wp62c: the WP-6.2b gap list (F-V2-21) this WP closes — role CRUD,
-- the on-call rota, `/me/preferences`, and the transport rate limiter's own
-- counter table. Additive only; `0002_auth.sql`/`0004_team.sql` are applied
-- and untouched.

-- `Role.builtIn`/`basedOn`/`createdAt`/`createdBy` (`src/data/types/rbac.ts`) —
-- `0002_auth.sql` seeded the six built-in rows with none of these, because
-- role CRUD did not exist yet. `built_in` defaults `true` so every existing
-- row reads correctly with no backfill statement; the six seed rows keep
-- `based_on`/`created_at`/`created_by` at `NULL`, exactly `Role`'s own shape
-- for a built-in ("`null` on a built-in").
ALTER TABLE roles
  ADD COLUMN IF NOT EXISTS built_in   BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS based_on   TEXT REFERENCES roles(id),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by TEXT REFERENCES users(id);

-- `OnCallRota` (`src/data/types/team.ts`) is one rota for the whole account,
-- never per-operator — a single row, enforced the standard Postgres way
-- (a boolean primary key with `CHECK (id)` admits exactly one value, `true`).
CREATE TABLE IF NOT EXISTS on_call_rota (
  id                 BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  primary_user_id    TEXT REFERENCES users(id),
  secondary_user_id  TEXT REFERENCES users(id),
  updated_at         TIMESTAMPTZ,
  updated_by         TEXT REFERENCES users(id)
);
INSERT INTO on_call_rota (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

-- `UserPreferences` (`src/data/types/session.ts`): `{ subTabNavCollapsed,
-- language }`, nothing more today — a JSONB column rather than two scalar
-- columns so a third preference (§8.3 leaves the door open) is a handler
-- change, not another migration. Default matches `session.ts`'s own mock
-- default ("expanded at first run, English until Admin › Workspace changes it").
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS preferences_json JSONB NOT NULL DEFAULT '{"subTabNavCollapsed": false, "language": "en"}'::jsonb;

-- The transport rate limiter's counter (`rateLimit.ts`) — one fixed window
-- per key (`signin:<ip>`, today's only caller). Not `idempotency_keys`: that
-- table is swept by `housekeeping.ts` on a 24h TTL unrelated to this one's
-- much shorter window, and conflating the two would make either sweep wrong
-- for the other's rows.
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  key          TEXT PRIMARY KEY,
  count        INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);
