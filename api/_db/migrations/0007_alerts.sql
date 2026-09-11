-- 0007_alerts: alert_rules, alert_rule_history, alert_firings, alert_deliveries,
-- webhooks and notifications — WP-6.6 (05-backend.md §3, §8; 04-alerting-v2.md;
-- AC-1282 … AC-1286).
--
-- `condition_json` is the v2 `AlertCondition` (04-alerting-v2.md §2) and is the
-- one thing every reader trusts, through `alertCondition()` (`src/data/types/
-- alert.ts`) on the way out to the wire. `comparator`/`threshold`/
-- `threshold_unit`/`threshold_currency` ride alongside only because the wire
-- `AlertRule` still requires those v1 fields to have *some* legal value
-- (`alert.ts`'s own comment: "absent means the v1 static shape"); this schema
-- always sets `condition_json`, so nothing here ever reads the v1 columns back
-- for evaluation — `evaluateDue.ts` and `evaluate()` go through `condition_json`
-- only.
--
-- `webhooks.url_encrypted` is a Slack URL run through `secrets.ts`'s
-- AES-256-GCM adapter before it reaches a row (05-backend.md §1: "a webhook is
-- a credential") — no query, no export and no API response ever carries the
-- plaintext; only the delivery path decrypts it, in memory, for the one POST
-- it makes.
--
-- `notifications` does not exist in an earlier migration — WP-6.6 is the first
-- WP to write one (a firing's in-app delivery), so it is created here rather
-- than assumed.

CREATE TABLE IF NOT EXISTS alert_rules (
  id                                  TEXT PRIMARY KEY DEFAULT ('alr_' || replace(gen_random_uuid()::text, '-', '')),
  name                                TEXT NOT NULL,
  report_id                           TEXT NOT NULL,
  series_id                           TEXT NOT NULL,

  condition_json                      JSONB NOT NULL,
  comparator                          TEXT NOT NULL,
  threshold                           NUMERIC NOT NULL DEFAULT 0,
  threshold_unit                      TEXT NOT NULL,
  threshold_currency                  TEXT,

  evaluation_grain                    TEXT NOT NULL CHECK (evaluation_grain IN ('day', 'week', 'month')),
  -- NULL = not scheduled (04-alerting-v2.md §2's `AlertRule.cadence`).
  cadence                             TEXT CHECK (cadence IN ('hourly', 'daily')),
  min_rearm_minutes                   INTEGER,
  consecutive_failures_before_error   INTEGER NOT NULL DEFAULT 5,

  channels_json                       JSONB NOT NULL DEFAULT '[{"type":"in-app"}]'::jsonb,
  recipient_ids_json                  JSONB NOT NULL DEFAULT '[]'::jsonb,
  severity                            TEXT NOT NULL DEFAULT 'high' CHECK (severity IN ('high', 'critical')),
  labels_json                         JSONB NOT NULL DEFAULT '[]'::jsonb,

  enabled                             BOOLEAN NOT NULL DEFAULT true,
  muted_until                         TIMESTAMPTZ,
  state                               TEXT NOT NULL DEFAULT 'armed' CHECK (state IN ('armed', 'firing', 'cooling', 'suspended', 'error')),
  state_reason_key                    TEXT,

  -- Evaluation authority (04-alerting-v2.md §1): the rule runs as its owner,
  -- never on wider rights.
  owner_id                            TEXT NOT NULL REFERENCES users(id),

  last_evaluated_at                   TIMESTAMPTZ,
  last_fired_at                       TIMESTAMPTZ,
  last_value                          NUMERIC,
  last_band_json                      JSONB,
  -- `IsoDate` text, matching every other bucket-boundary column in this
  -- schema (`daily_snapshots.day`) — never a DATE column (0003_catalogue.sql's
  -- own reasoning: a driver round-trips it through a JS `Date` otherwise).
  last_bucket_start                   TEXT,
  failure_count                       INTEGER NOT NULL DEFAULT 0,
  -- Per-firing acknowledgement, mirrored here for the rule list (§2's
  -- `AlertRule.acknowledgedAt/By`) — the most recent firing's, kept in sync by
  -- `alerts.acknowledge`.
  last_ack_at                         TIMESTAMPTZ,
  last_ack_by                         TEXT,

  created_at                          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by                          TEXT NOT NULL REFERENCES users(id)
);

-- `05-backend.md` §3's named index: the cron's own `WHERE enabled AND cadence
-- = $1 AND state <> 'suspended' ORDER BY last_evaluated_at NULLS FIRST`.
CREATE INDEX IF NOT EXISTS alert_rules_cadence_enabled_state_idx ON alert_rules (cadence, enabled, state, last_evaluated_at);
CREATE INDEX IF NOT EXISTS alert_rules_owner_idx ON alert_rules (owner_id);

-- Every save of a rule (04-alerting-v2.md §5's config history / Amplitude's
-- monitor history), never pruned by housekeeping — it is the audit trail.
CREATE TABLE IF NOT EXISTS alert_rule_history (
  id        TEXT PRIMARY KEY DEFAULT ('arh_' || replace(gen_random_uuid()::text, '-', '')),
  rule_id   TEXT NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
  at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  by        TEXT NOT NULL REFERENCES users(id),
  diff_json JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS alert_rule_history_rule_idx ON alert_rule_history (rule_id, at DESC);

CREATE TABLE IF NOT EXISTS alert_firings (
  id                     TEXT PRIMARY KEY DEFAULT ('afr_' || replace(gen_random_uuid()::text, '-', '')),
  rule_id                TEXT NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
  fired_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  bucket_start           TEXT NOT NULL,
  value                  NUMERIC,
  -- `{ threshold: number } | { band: { low, high } }`, condition-shaped — a
  -- static/relative firing carries the number it crossed, an anomaly firing
  -- carries the band it fell outside (§5, `AlertFiring.band`).
  threshold_or_band_json JSONB,
  severity               TEXT NOT NULL CHECK (severity IN ('high', 'critical')),
  notification_id        TEXT,
  acknowledged_at         TIMESTAMPTZ,
  acknowledged_by         TEXT
);
CREATE INDEX IF NOT EXISTS alert_firings_rule_fired_idx ON alert_firings (rule_id, fired_at DESC);
CREATE INDEX IF NOT EXISTS alert_firings_fired_idx ON alert_firings (fired_at DESC);

-- One row per recipient per channel attempt (AC-1283, AC-1284) — a failed
-- Slack post is a recorded failure here, never a retry and never a reason the
-- firing itself does not exist.
CREATE TABLE IF NOT EXISTS alert_deliveries (
  id           TEXT PRIMARY KEY DEFAULT ('adl_' || replace(gen_random_uuid()::text, '-', '')),
  firing_id    TEXT NOT NULL REFERENCES alert_firings(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('in-app', 'email', 'slack')),
  -- A user id (in-app/email) or a webhook id (slack). NULL for none of those
  -- (there is always one, but kept nullable rather than widened later).
  target       TEXT,
  -- `'muted'` is this schema's own addition beside the wire `AlertDelivery`'s
  -- `'sent' | 'failed'` (`src/data/types/alert.ts`) — state 26
  -- (04-alerting-v2.md §7) requires a muted delivery to read as suppressed,
  -- not as sent; `handlers/alerts.ts` maps it to `'failed'` with a
  -- `rb.alert.mute.*`-keyed reason on the wire so the client-side type is
  -- never widened for a server-only distinction.
  status       TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'muted')),
  error        TEXT,
  at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS alert_deliveries_firing_idx ON alert_deliveries (firing_id);

-- Created by `manage_team` under Admin › Integrations (04-alerting-v2.md §2) —
-- referenced by id from a rule's `slack` channel, never a URL typed into the
-- rule itself.
CREATE TABLE IF NOT EXISTS webhooks (
  id            TEXT PRIMARY KEY DEFAULT ('whk_' || replace(gen_random_uuid()::text, '-', '')),
  name          TEXT NOT NULL,
  url_encrypted TEXT NOT NULL,
  created_by    TEXT NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY DEFAULT ('ntf_' || replace(gen_random_uuid()::text, '-', '')),
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  priority    TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  title       TEXT NOT NULL,
  body        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  read        BOOLEAN NOT NULL DEFAULT false,
  route       TEXT,
  entity_id   TEXT,
  entity_type TEXT
);
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_read_idx ON notifications (user_id, read);
