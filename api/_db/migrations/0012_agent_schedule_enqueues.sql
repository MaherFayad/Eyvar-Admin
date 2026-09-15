-- 0012_agent_schedule_enqueues: WP-7.6 (01-analyst-agent.md §8; AC-1266).
--
-- ## The unique constraint is the arbitration, not a `last_enqueued_at` check
--
-- Two writers can race to enqueue the same due schedule: the Vercel cron
-- (`/api/cron/agent-schedules`, every 15 min where the plan allows it) and
-- the runner's own fallback check (`agent/runner/schedule.ts`, since Hobby
-- refuses cron finer than daily — `05-backend.md` §1a). A compare-then-set
-- on `agent_schedules.last_enqueued_at` is exactly the read-then-write race
-- AC-1266 forbids (`idempotency_keys`' own `UNIQUE (user_id, key)` is the
-- precedent this copies). Instead: one row per (schedule, period) is the
-- claim. `enqueueDueAgentSchedules` (`api/_lib/handlers/agent.ts`) inserts
-- with `ON CONFLICT (schedule_id, period_start) DO NOTHING RETURNING …` —
-- the writer that gets a row back won the period and creates the job; the
-- writer that gets nothing back lost the race and does nothing, so a
-- schedule enqueues exactly once per period no matter how many callers
-- check it, and a runner that was offline for the whole period does not
-- leave a pile of duplicate jobs once it reconnects and checks late.
--
-- `period_start` is an `IsoDate` (Riyadh calendar day, D45's Sunday week
-- start for a weekly cadence) rather than a timestamp: the ledger's job is
-- "which period", not "at what instant".
CREATE TABLE IF NOT EXISTS agent_schedule_enqueues (
  schedule_id   TEXT NOT NULL REFERENCES agent_schedules(id) ON DELETE CASCADE,
  period_start  TEXT NOT NULL,
  job_id        TEXT REFERENCES agent_jobs(id) ON DELETE SET NULL,
  enqueued_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (schedule_id, period_start)
);
