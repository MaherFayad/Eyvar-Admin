-- 0009_agent: the analyst agent's job queue — WP-6.7 (05-backend.md §3, §5;
-- 01-analyst-agent.md §3.2, §5, §8, §10; AC-1287, AC-1288).
--
-- ## `agent_jobs.state` has no `'cancelled'` member
--
-- `src/data/types/agent.ts`'s `AgentJobState` is `'queued' | 'running' |
-- 'deferred' | 'done' | 'failed'` — the client (`src/data/clients/agent.ts`)
-- already flags this as a gap ("`AgentJobState` has no `'cancelled'` member
-- yet, so `cancelAgentJob` is not implemented here"). This migration does not
-- widen the CHECK constraint to invent a state the wire type cannot carry;
-- `POST /agent/jobs/:id/cancel` is deferred the same way, for the same
-- reason, until the type gains the member (`src/` is out of this WP's scope).
--
-- ## `agent_events.seq` is a global sequence, not per-job
--
-- `GET /agent/jobs/:id/events?after=<eventId>` (05-backend.md §5) resolves
-- `after` to that event's `seq` and returns every later row for the same
-- job — a single global `BIGSERIAL` makes that comparison one index lookup
-- plus a range scan on `(job_id, seq)`, and total ordering across jobs is
-- never needed.
--
-- ## `report_runs.job_id` already exists
--
-- `0005_runs.sql` added it ahead of this migration, with the exact comment
-- this WP fulfils: "`X-Eyvar-Record-Run: 1` on a run made through
-- `X-Eyvar-Acting-For` writes this." No column to add here; `agentAuth.ts`
-- and the small anchored edit to `reportsRun.ts` are what populate it.

CREATE TABLE IF NOT EXISTS agent_jobs (
  id              TEXT PRIMARY KEY DEFAULT ('agtjob_' || replace(gen_random_uuid()::text, '-', '')),
  kind            TEXT NOT NULL CHECK (kind IN ('ask', 'case-study', 'build-page', 'triage-alert', 'weekly-review')),
  question        TEXT NOT NULL,
  language        TEXT NOT NULL CHECK (language IN ('ar', 'en')),
  -- `AgentJobContext[]` verbatim (§3.2's "already-fetched by the backend
  -- before the runner sees it" is `job_context`'s job, not this column's).
  context_json    JSONB NOT NULL DEFAULT '[]'::jsonb,
  requested_by    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  state           TEXT NOT NULL DEFAULT 'queued' CHECK (state IN ('queued', 'running', 'deferred', 'done', 'failed')),
  -- `deferred`'s retry deadline (§10, a rate limit) — the same column a
  -- `queued`→claim query filters on (`retry_at IS NULL OR retry_at < now()`),
  -- so a deferred job re-enters the claim pool without a separate requeue step.
  retry_at        TIMESTAMPTZ,
  claimed_by      TEXT,
  claimed_at      TIMESTAMPTZ,
  started_at      TIMESTAMPTZ,
  finished_at     TIMESTAMPTZ,
  failure_reason  TEXT CHECK (failure_reason IN ('timeout', 'evidence', 'schema')),
  result_page_id  TEXT REFERENCES pages(id),
  prompt_version  TEXT,
  turns           INTEGER,
  tool_calls      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_jobs_state_created_idx ON agent_jobs (state, created_at);
CREATE INDEX IF NOT EXISTS agent_jobs_requested_by_idx ON agent_jobs (requested_by);

CREATE TABLE IF NOT EXISTS agent_events (
  id           TEXT PRIMARY KEY DEFAULT ('agtevt_' || replace(gen_random_uuid()::text, '-', '')),
  job_id       TEXT NOT NULL REFERENCES agent_jobs(id) ON DELETE CASCADE,
  seq          BIGSERIAL NOT NULL,
  at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  type         TEXT NOT NULL CHECK (type IN ('tool-call', 'finding')),
  -- Tool-call: `{ tool, summary, durationMs }`. Finding: `{ text, runIds }`
  -- (`AgentToolCallEvent`/`AgentFindingEvent`, `src/data/types/agent.ts`).
  payload_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS agent_events_job_seq_idx ON agent_events (job_id, seq);

CREATE TABLE IF NOT EXISTS agent_schedules (
  id                TEXT PRIMARY KEY DEFAULT ('agtsch_' || replace(gen_random_uuid()::text, '-', '')),
  kind              TEXT NOT NULL DEFAULT 'weekly-review' CHECK (kind = 'weekly-review'),
  -- `{ reportIds: string[], pageId: string | null }` — §8's template.
  template_json     JSONB NOT NULL DEFAULT '{"reportIds": [], "pageId": null}'::jsonb,
  cron              TEXT NOT NULL,
  owner_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enabled           BOOLEAN NOT NULL DEFAULT true,
  last_enqueued_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per runner **process**, not per secret — `AGENT_RUNNER_TOKEN` is
-- shared by every runner instance (§3.2: "identifies the runner, not a
-- person"), so `id` is the name the runner names itself in its heartbeat
-- body, not derived from the token. `GET /agent/status` aggregates across
-- every row that has heartbeat recently rather than assuming exactly one.
CREATE TABLE IF NOT EXISTS agent_runners (
  id                 TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  last_heartbeat_at  TIMESTAMPTZ,
  state              TEXT NOT NULL DEFAULT 'online' CHECK (state IN ('online', 'offline', 'limited')),
  limit_until        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
