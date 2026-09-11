-- 0004_team: the auth/team surface WP-6.2 stopped at — WP-6.2b. Columns and
-- tables the full SignInOutcome union, the team lifecycle (F-016) and
-- session.current's derived fields need. Does not touch 0002_auth.sql, which
-- is applied; every column here is additive.

-- `users` columns `team.ts`'s `toTeamUser` returned as `null`, plus the
-- account-side state the fuller `signIn` needs.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  -- `null` = enrolment pending (`SecondFactor | null` on `TeamUser`, §4.2 —
  -- not "opted out"). `totp_secret` is written at `beginTotpEnrolment` and
  -- stays unconfirmed (this column still `null`) until `verifyCode` completes
  -- the enrolment challenge.
  ADD COLUMN IF NOT EXISTS second_factor_method TEXT CHECK (second_factor_method IN ('sms', 'totp')),
  ADD COLUMN IF NOT EXISTS totp_secret TEXT,
  -- `PermissionDelta` without its `role` field, which is always `users.role_id`
  -- for the row it lives on (D17: a delta signed against a different role is
  -- stale and `effectivePermissions` ignores it — here that case cannot arise,
  -- since a role change clears both arrays in the same statement).
  ADD COLUMN IF NOT EXISTS permission_granted TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS permission_revoked TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS compensation_cap_halalas INTEGER,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  -- A real anti-bruteforce lock `05-backend.md`'s fixtures only ever show as a
  -- static state (`AuthIdentityOutcome: 'locked'`); the mock never produces
  -- one from repeated attempts because its identities are read-only fixtures.
  -- The backend needs an actual trigger, so five wrong passwords in a row
  -- lock the account for `PASSWORD_LOCKOUT_MINUTES` (`handlers/auth.ts`).
  ADD COLUMN IF NOT EXISTS failed_password_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS password_locked_until TIMESTAMPTZ;

-- `Session.landingRoute`/`landingWorkspaceId` (§8.2, §3.3, AC-07): the only
-- table role -> landing exists in today is `fixtures/teamUsers.ts`'s
-- `ROLE_LANDING`; seeded here verbatim so the server can derive rather than
-- return a constant.
ALTER TABLE roles
  ADD COLUMN IF NOT EXISTS landing_path TEXT,
  ADD COLUMN IF NOT EXISTS landing_workspace_id TEXT;

UPDATE roles SET landing_path = '/management/overview', landing_workspace_id = 'management' WHERE id = 'Owner';
UPDATE roles SET landing_path = '/operations/overview', landing_workspace_id = 'operations' WHERE id = 'Ops Manager';
UPDATE roles SET landing_path = '/financials/overview', landing_workspace_id = 'financials' WHERE id = 'Finance';
UPDATE roles SET landing_path = '/support/overview', landing_workspace_id = 'support' WHERE id = 'Support';
UPDATE roles SET landing_path = '/operations/dispatch', landing_workspace_id = 'operations' WHERE id = 'Dispatcher';
UPDATE roles SET landing_path = '/support/safety', landing_workspace_id = 'support' WHERE id = 'Trust & Safety';

-- `team.inviteOperator`/`resendInvite`/`revokeInvite` and `auth.validateResetToken`'s
-- `purpose: 'invite'` arm. One outstanding invitation per operator record —
-- `user_id` is the primary key, matching `TeamInvite`'s shape. Deleted on
-- `revokeInvite` and on `activateInvite`, which is what makes the token
-- single-use: once the row is gone, `validateResetToken`/`resetPassword` see
-- nothing and fall through to `password_reset_tokens`, which does not know it
-- either.
CREATE TABLE IF NOT EXISTS invites (
  user_id      TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  token        TEXT NOT NULL UNIQUE,
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL,
  resend_count INTEGER NOT NULL DEFAULT 0
);

-- `auth.requestPasswordReset`/`validateResetToken`/`resetPassword`'s
-- `purpose: 'reset'` arm. Single-use via `used_at`: a token with it set reads
-- as `'used'`, the same as `authTokenFixtures`' seeded `used` row.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token      TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- `auth.signIn`'s second-factor challenge and `verifyCode`'s attempt ladder —
-- one row per code, chained by supersession the way `clients/auth.ts`'s mock
-- `Challenge` is (§4.3, §5.3): a resend opens a new row and marks the old one
-- `superseded`; the 3rd wrong attempt marks the current row `invalidated`;
-- the 5th marks it `locked`. `enrol_method`/`enrol_destination` are set only
-- when this challenge originated from `enrollSecondFactor`, so completing it
-- also confirms the enrolment (`handlers/auth.ts`'s `verifyCode`) — the mock
-- has no equivalent because its identities are static fixtures that cannot be
-- enrolled into; the real backend has to actually persist it.
CREATE TABLE IF NOT EXISTS signin_challenges (
  id                  TEXT PRIMARY KEY DEFAULT ('chl_' || replace(gen_random_uuid()::text, '-', '')),
  user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  method              TEXT NOT NULL CHECK (method IN ('sms', 'totp')),
  -- `NULL` for `totp`: a TOTP code is verified live against `users.totp_secret`
  -- (RFC 6238, `api/_lib/otp.ts`), never stored. Set for `sms`, HMAC'd.
  code_hash           TEXT,
  expires_at          TIMESTAMPTZ NOT NULL,
  resend_available_at TIMESTAMPTZ NOT NULL,
  attempts_used       INTEGER NOT NULL DEFAULT 0,
  codes_sent          INTEGER NOT NULL DEFAULT 1,
  state               TEXT NOT NULL DEFAULT 'open'
                       CHECK (state IN ('open', 'invalidated', 'superseded', 'locked', 'completed')),
  -- Stamped once, when `attempts_used` reaches the 5th wrong attempt, and
  -- read back as-is rather than recomputed as "15 minutes from now" on every
  -- later read — an eternally-refreshing lockout would never actually expire.
  locked_until        TIMESTAMPTZ,
  enrol_method        TEXT CHECK (enrol_method IN ('sms', 'totp')),
  enrol_destination   TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS signin_challenges_user_state_idx ON signin_challenges (user_id, state);

-- `verifyCode`'s `rememberDevice` (§7.1) and `reauthenticate`'s AC-573 device
-- check: a signed, opaque id in its own cookie (`eyvar_device`, `handlers/auth.ts`),
-- live rows here decide whether re-authentication after an idle expiry asks
-- for a password only or a password and a fresh code.
CREATE TABLE IF NOT EXISTS trusted_devices (
  id            TEXT PRIMARY KEY DEFAULT ('dev_' || replace(gen_random_uuid()::text, '-', '')),
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trusted_until TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trusted_devices_user_idx ON trusted_devices (user_id);

-- `Session.claimedCount` (§8.2): a real `count(*)`, not a constant. Starts
-- empty for everyone — no WP has built a claim-writing endpoint yet (the
-- work-queue "take" affordance `CONTRACT.md` §10 describes), so `0` here is
-- honest rather than invented, and is named as a gap in WP-6.2b's report.
CREATE TABLE IF NOT EXISTS claims (
  key            TEXT PRIMARY KEY,
  entity_type    TEXT NOT NULL,
  entity_id      TEXT NOT NULL,
  owner_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  state          TEXT NOT NULL DEFAULT 'claimed' CHECK (state IN ('claimed', 'released')),
  claimed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  touched_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at    TIMESTAMPTZ,
  release_reason TEXT
);
CREATE INDEX IF NOT EXISTS claims_owner_state_idx ON claims (owner_id, state);
