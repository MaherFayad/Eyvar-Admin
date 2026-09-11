-- 0002_auth: users, roles, sessions, idempotency keys — WP-6.2
-- (05-backend.md §2 Q1/Q3/Q4, §3 schema). `pgcrypto` is already loaded by
-- 0001_analytics.sql. Columns narrower or added versus §3's list, and why:
--   * users.password_hash — §3 does not list it, but Q1 names argon2id as the
--     auth mechanism and a password has to live somewhere; see
--     `api/_lib/password.ts` for why the hash format is scrypt, not argon2id.
--   * roles.id equals the role's display name ('Owner', 'Ops Manager', …)
--     rather than a separate slug: `RoleId` (`src/data/types/session.ts`) is
--     an opaque string the frontend already renders as-is, so a slug would
--     need a translation table nothing reads.
--   * sessions.expires_at is an absolute, sliding expiry column rather than a
--     policy constant applied at read time, so "is this session live" is one
--     comparison in every query that needs it.
--   * idempotency_keys.status distinguishes 'in_progress' from 'completed' —
--     without it a second concurrent request cannot be told apart from a
--     first one that already finished, which is what AC-1273 and the
--     concurrency test need.

CREATE TABLE IF NOT EXISTS roles (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id        TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,
  PRIMARY KEY (role_id, permission_key)
);

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY DEFAULT ('usr_' || replace(gen_random_uuid()::text, '-', '')),
  email         TEXT NOT NULL UNIQUE,
  name_en       TEXT NOT NULL,
  name_ar       TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role_id       TEXT NOT NULL REFERENCES roles(id),
  status        TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Invited', 'Suspended')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id           TEXT PRIMARY KEY DEFAULT ('ses_' || replace(gen_random_uuid()::text, '-', '')),
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device       TEXT,
  ip           TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  revoked_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);
-- `readSession` filters every call on `id` + `revoked_at` + `expires_at`; the
-- primary key already covers `id`, this covers the rest so the filter can be
-- satisfied without a heap fetch.
CREATE INDEX IF NOT EXISTS sessions_liveness_idx ON sessions (id, revoked_at, expires_at);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  user_id         TEXT NOT NULL,
  key             TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  response_status INTEGER,
  response_json   JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);

-- `api/cron/housekeeping.ts`'s 24h sweep (05-backend.md §8) scans by age.
CREATE INDEX IF NOT EXISTS idempotency_keys_created_at_idx ON idempotency_keys (created_at);

-- Seed: the six built-in roles and D17's baseline table
-- (`src/data/types/session.ts` `ROLE_PERMISSIONS`), verbatim (05-backend.md §2 Q4).
INSERT INTO roles (id, name) VALUES
  ('Owner', 'Owner'),
  ('Ops Manager', 'Ops Manager'),
  ('Dispatcher', 'Dispatcher'),
  ('Trust & Safety', 'Trust & Safety'),
  ('Finance', 'Finance'),
  ('Support', 'Support')
ON CONFLICT (id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_key) VALUES
  ('Owner', 'view_analytics'), ('Owner', 'view_operations'), ('Owner', 'view_finance'),
  ('Owner', 'view_support'), ('Owner', 'view_admin'), ('Owner', 'view_profiles'),
  ('Owner', 'approve_drivers'), ('Owner', 'manage_subscriptions'), ('Owner', 'live_ops'),
  ('Owner', 'manage_plans'), ('Owner', 'process_payouts'), ('Owner', 'release_escrow'),
  ('Owner', 'apply_deductions'), ('Owner', 'manage_tickets'), ('Owner', 'contact_users'),
  ('Owner', 'manage_team'), ('Owner', 'manage_ops_policy'), ('Owner', 'manage_workspace'),
  ('Owner', 'manage_data_governance'), ('Owner', 'manage_security_policy'),

  ('Ops Manager', 'view_analytics'), ('Ops Manager', 'view_operations'), ('Ops Manager', 'view_finance'),
  ('Ops Manager', 'view_support'), ('Ops Manager', 'view_admin'), ('Ops Manager', 'view_profiles'),
  ('Ops Manager', 'approve_drivers'), ('Ops Manager', 'manage_subscriptions'), ('Ops Manager', 'live_ops'),
  ('Ops Manager', 'manage_plans'), ('Ops Manager', 'manage_tickets'), ('Ops Manager', 'contact_users'),
  ('Ops Manager', 'manage_ops_policy'),

  ('Dispatcher', 'view_operations'), ('Dispatcher', 'view_profiles'), ('Dispatcher', 'live_ops'),
  ('Dispatcher', 'contact_users'),

  ('Trust & Safety', 'view_analytics'), ('Trust & Safety', 'view_operations'), ('Trust & Safety', 'view_support'),
  ('Trust & Safety', 'view_profiles'), ('Trust & Safety', 'approve_drivers'), ('Trust & Safety', 'manage_tickets'),
  ('Trust & Safety', 'contact_users'),

  ('Finance', 'view_analytics'), ('Finance', 'view_finance'), ('Finance', 'view_profiles'),
  ('Finance', 'process_payouts'), ('Finance', 'release_escrow'), ('Finance', 'apply_deductions'),
  ('Finance', 'manage_plans'),

  ('Support', 'view_operations'), ('Support', 'view_support'), ('Support', 'view_profiles'),
  ('Support', 'manage_tickets'), ('Support', 'contact_users')
ON CONFLICT DO NOTHING;
