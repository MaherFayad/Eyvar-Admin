# 05 — The backend: hostable on Vercel, documented for whoever builds it

> Phase **P6**. Decisions needed: **D41**, **D45**. This file is the plan for the backend;
> the contract itself stays where `CLAUDE.md` says it lives (`docs/07-api/`, generated from
> the client docblocks by `npm run api:contract`). Every endpoint named here must also exist as
> a docblock on a client function or it does not exist to the backend (`docs/07-api/README.md`).
> Read `docs/07-api/CONTRACT.md` and `docs/07-api/OPEN-QUESTIONS.md` before this file.

## 1. Shape and hosting

| Piece | Choice | Why |
|---|---|---|
| Runtime | **Vercel Functions**, Node 22, TypeScript, files under `api/` using the Web-standard handler signature (`export function GET(request: Request)`) | Same project as the frontend; `api/` is the directory Vercel's `functions` config requires; no second deployment |
| Routing | `api/v1/[...route].ts` — one catch-all function that dispatches on method and path through a small router (`api/_lib/router.ts`) | One cold start, one place for auth, one place for the error envelope; a function per route would be 60 cold starts |
| Database | **Neon Postgres** (Vercel Marketplace), accessed with `@neondatabase/serverless` over HTTP for request handlers; `pg` + `attachDatabasePool` from `@vercel/functions` for the cron functions that run long | HTTP driver needs no pool and survives Fluid Compute; long crons want a real pool |
| Schema management | Plain SQL migrations in `api/_db/migrations/NNNN_name.sql`, applied by `node api/_db/migrate.mjs` (tracks `schema_migrations`) | No ORM to learn; the SQL is the documentation |
| Scheduling | **Vercel Cron** entries in `vercel.json`, each guarded by `CRON_SECRET` | Documented, no extra service; hourly granularity is enough for D41 |
| Files | **Vercel Blob**, private, for PNG exports kept 7 days and for CSV exports over 1 MB | Optional; CSV under 1 MB streams directly |
| Email | Provider-agnostic `api/_lib/email.ts` with one adapter (Resend) behind `EMAIL_PROVIDER` | Alerts and digests; nothing else sends mail |
| Secrets at rest | Slack webhook URLs encrypted with `SECRETS_KEY` (AES-256-GCM) before storage | A webhook is a credential |
| Shared code | `api/` imports pure modules from `src/data/reporting/**` and `src/data/types/**` through the `@` alias configured in `api/tsconfig.json` | Planner, formula, anomaly, state machine, page validator and case-study renderer run identically on both sides |

`vercel.json` changes (the exact file is in `06-execution-plan.md` WP-6.1):

- The SPA rewrite becomes `"source": "/((?!api/).*)"` so `/api/*` is never rewritten to
  `index.html`.
- `"functions": { "api/**/*.ts": { "maxDuration": 60 }, "api/cron/*.ts": { "maxDuration": 300 } }`.
- `"crons"`: `/api/cron/snapshot` `5 21 * * *` (00:05 Riyadh); `/api/cron/alerts-hourly`
  `0 * * * *`; `/api/cron/alerts-daily` `15 3 * * *`; `/api/cron/alerts-digest` `0 5 * * *`;
  `/api/cron/agent-schedules` `*/15 * * * *`; `/api/cron/housekeeping` `30 2 * * *`.

Environment variables (Vercel project settings; `vercel env pull` for local):

| Name | Used by |
|---|---|
| `DATABASE_URL` | everything |
| `SESSION_SECRET` | cookie signing |
| `CRON_SECRET` | every `/api/cron/*` (Bearer check, per Vercel docs) |
| `AGENT_RUNNER_TOKEN` | `/api/v1/agent/*` runner endpoints |
| `SECRETS_KEY` | webhook encryption |
| `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM` | email adapter |
| `BLOB_READ_WRITE_TOKEN` | exports (set by the Blob integration) |
| `VITE_DATA_SOURCE=http`, `VITE_API_BASE_URL=` (empty, same origin) | the frontend build |

Local development: `vercel dev` serves both; or `npx vite --port 4327` with a dev proxy
(`server.proxy['/api'] → http://localhost:3000` added to `vite.config.ts`, active only when
`VITE_DATA_SOURCE=http`) and `vercel dev --listen 3000`. The mock stays the default so the
harnesses keep working without a database.

## 1a. Vercel Hobby versus Pro (checked 2026-09-11 against vercel.com/docs)

The plan as written needs **Pro**. What Hobby cannot do, and the fallback where one exists:

| Need | Hobby | Pro | Fallback on Hobby |
|---|---|---|---|
| Commercial use | **Not allowed.** "Hobby teams are restricted to non-commercial personal use only" (`/docs/limits/fair-use-guidelines`). An operations console for a business is commercial use | Allowed | None. This alone decides it for production |
| Cron more often than daily (`alerts-hourly` every hour, `agent-schedules` every 15 min) | **Refused at deploy**: "Hobby accounts are limited to daily cron jobs"; timing is ±59 min (`/docs/cron-jobs/usage-and-pricing`) | Per minute, precise | `hourly` cadence disabled in the composer with a reason (`rb.alert.cadence.hobby`); the runner enqueues scheduled reviews itself (§8 of 01) instead of a cron |
| Cron once a day (`snapshot`, `alerts-daily`, `alerts-digest`, `housekeeping`) | Allowed, but may run any time in the hour | Precise | Accept the hour of slack; the snapshot cron is scheduled at 21:05 UTC so it lands before the daily alert cron at 03:15 UTC |
| Function duration | 300 s default and maximum | up to 800 s | The plan already caps crons at 300 s and resumes on the next run |
| Included usage per month | 1M invocations, 4 active CPU-hours, 360 GB-hours memory, 100 GB transfer, Blob 5 GB | usage-based | Fine for a few operators. The analyst job page polls every 2 s only while a job runs; a long study is about 600 invocations |
| Neon Free | 0.5 GB per project, 100 CU-hours/month, suspends after 5 min idle (cold start on the first request after idle) | Neon Launch or above | Fine for the analytics tables; **not** for operational tables with a trip history, which will exceed 0.5 GB |

Hobby is acceptable for a **preview or evaluation** deployment with mock-sized data, daily
alerting only, and no commercial traffic. Production goes on Pro.

## 2. Answers to `docs/07-api/OPEN-QUESTIONS.md` that this plan takes as assumptions

These are assumptions until the owner confirms them; each is cheap to change now and dear
later.

| Q | Assumption |
|---|---|
| Q1 auth | Cookie session: `POST /api/v1/auth/sign-in` (email + password, argon2id) sets an HttpOnly, Secure, SameSite=Lax cookie holding a signed session id; `sessions` table with device, last seen, revoked; `session.current` reads it; sign-out-everywhere revokes by user. 401 is not retryable and routes to sign-in; **403 carries `details[0].code = 'permission'` and `details[0].field = <PermissionKey>`** so the refusal copy can name it |
| Q2 pagination | Offset, as the UI assumes. No resource in this plan exceeds tens of thousands of rows |
| Q3 idempotency | Every non-GET accepts `Idempotency-Key`; the server stores `(user, key) → response` for 24 h in `idempotency_keys` and replays. The frontend's `http.ts` adds the header from `crypto.randomUUID()` per mutation (a P6 change to one file) |
| Q4 permissions | Returned with the session (`PermissionKey[]`), and enforced per request. Roles and their keys are seeded from the UI's existing `PERMISSION_LABELS`. The UI shows and refuses (disabled in place) rather than hiding |
| Q5 envelopes | `Single<T>` everywhere; the four bare-`T` endpoints named in `ENDPOINTS.md` are normalised in the same phase (a find-and-replace in `src/data/clients/`) |

## 3. Schema (Postgres)

Operational tables are the business's own data. **This plan assumes they exist in the same
database in the shapes `src/data/types/*.ts` describe** (riders, drivers, trips, subscriptions,
payments, wallets, tickets…), loaded by whatever pipeline the business runs. If they live
elsewhere, `measure_sources` (below) points the compiler at a view. Nothing in the analytics
schema depends on their internals beyond the columns the catalogue names.

Analytics tables (migration `0001_analytics.sql` … `0006_agent.sql`):

```
users(id, email, name_en, name_ar, role_id, status, created_at)
roles(id, name), role_permissions(role_id, permission_key)
sessions(id, user_id, device, ip, created_at, last_seen_at, revoked_at)
idempotency_keys(user_id, key, response_json, created_at)               -- 24 h TTL by housekeeping

measures(key PK, label_key, category, population_json, temporality, bucket_aggregate, bucket_aggregate_options_json,
         additive, unit, currency, higher_is_better, min_grain, dimensions_json, filterable_fields_json,
         permission_key, caption_key, supports_performed, funnel_capabilities_json, coverage_from, coverage_to)
dimensions(key PK, label_key, resource, field, cardinality_hint)
measure_sources(resource PK, table_name, time_column, subject_column, pii_columns_json)   -- the compiler's map

daily_snapshots(day PK, riders, drivers, active_subscriptions, quick_rides, cancel_rate_pct,
                total_revenue_halalas, quick_ride_revenue_halalas, sub_revenue_halalas, captured_at)  -- stock measures

report_runs(id PK, user_id, query_json, result_json, as_of, created_at, job_id NULL)     -- provenance for the agent; 30-day TTL
saved_reports(id, name, description, query_json, owner_id, visibility, tags_json, official, created_at, updated_at, updated_by, last_run_at)
saved_report_versions(report_id, at, by, query_json)                                     -- last 20
saved_report_stars(report_id, user_id)
segments(id, name, description, filters_json, performed_json, owner_id, visibility, created_at, updated_at)
annotations(id, date, label, note, kind, created_by, created_at)

pages(id, kind, title, icon, description, owner_id, visibility, tags_json, official, template, scope_json,
      blocks_json, version, published_at, created_at, updated_at, updated_by)
page_reports(page_id, report_id)                                                         -- reverse index; rebuilt on save
page_stars(page_id, user_id)

alert_rules(id, name, report_id, series_id, condition_json, evaluation_grain, cadence, min_rearm_minutes,
            consecutive_failures_before_error, channels_json, recipient_ids_json, severity, enabled, muted_until,
            state, state_reason_key, owner_id, last_evaluated_at, last_fired_at, last_value, last_band_json,
            last_bucket_start, failure_count, labels_json, created_at, updated_at, updated_by)
alert_rule_history(rule_id, at, by, diff_json)
alert_firings(id, rule_id, fired_at, bucket_start, value, threshold_or_band_json, severity, notification_id, acknowledged_at, acknowledged_by)
alert_deliveries(firing_id, channel_type, target, status, error, at)
webhooks(id, name, url_encrypted, created_by, created_at)
notifications(...)                                                                        -- the existing model

agent_jobs(id, kind, question, language, context_json, requested_by, state, retry_at, claimed_by, claimed_at,
           started_at, finished_at, failure_reason, result_page_id, prompt_version, turns, tool_calls, created_at)
agent_events(id, job_id, seq, at, type, payload_json)                                    -- transcript, tool calls, findings
agent_schedules(id, kind, template_json, cron, owner_id, enabled, last_enqueued_at)
agent_runners(id, name, last_heartbeat_at, state, limit_until)
audit_log(id, at, user_id, acting_via, action, entity_type, entity_id, summary_json)      -- exports, sample_rows, config changes
```

Indexes: `report_runs(user_id, created_at)`, `alert_rules(cadence, enabled, state)`,
`alert_firings(rule_id, fired_at desc)`, `agent_jobs(state, created_at)`, `pages(kind, owner_id)`,
GIN on `pages.tags_json`, `saved_reports.tags_json`.

## 4. Errors, envelopes, permissions

Exactly as `CONTRACT.md`: `ApiError { status, kind, code, details[], requestId, retryable }`;
`Paginated<T>`, `Single<T>`, `CountResult`; `requestId` on every response (the Vercel request
id); server text as `LocalisedText { key, params }`. The router wraps every handler: auth →
permission → idempotency → handler → envelope. A thrown `HttpError(status, code, details)` is
the only way to fail.

Permission resolution for reports: `reports.run` loops the series, checks
`measures.permission_key` against the session's keys, and returns `blocked` per series with
no points (spec 06 §13.1). The same function is used by the agent path with the acting
operator's keys.

## 5. The analyst job queue

| Endpoint | Auth | Does |
|---|---|---|
| `POST /api/v1/agent/jobs` | operator with `view_analytics` | creates `queued`; validates kind and context ids the operator can see |
| `GET /api/v1/agent/jobs`, `GET /api/v1/agent/jobs/:id`, `GET /api/v1/agent/jobs/:id/events?after=seq` | operator | list; one; events since `seq` (the frontend polls every 2 s while running) |
| `POST /api/v1/agent/jobs/:id/cancel` | requester or `manage_team` | `cancelled`; the runner is told on its next event post |
| `GET /api/v1/agent/status` | operator | runner state, `limitUntil`, queue depth |
| `POST /api/v1/agent/heartbeat` | runner token | upserts `agent_runners`; every 30 s |
| `POST /api/v1/agent/jobs/claim` | runner token | atomic `UPDATE … WHERE state='queued' AND (retry_at IS NULL OR retry_at < now()) ORDER BY created_at LIMIT 1 … RETURNING`; returns the job with its context objects fetched as the requester |
| `POST /api/v1/agent/jobs/:id/events` | runner token, claimed job only | appends events (batched, ≤ 50 per post) |
| `POST /api/v1/agent/jobs/:id/findings` | runner token (via T19) | appends a finding event |
| `POST /api/v1/agent/jobs/:id/result` | runner token | validates the JSON against the kind's schema **again** on the server, checks every cited `runId` belongs to this job, renders the page with `caseStudyToBlocks()`, stores it as a draft owned by the requester, marks `done` |
| `POST /api/v1/agent/jobs/:id/fail` | runner token | `failed:<reason>` or `deferred` with `retry_at` |

The acting-for rule: any `/api/v1/*` request carrying the runner token **must** carry
`X-Eyvar-Acting-For` and `X-Eyvar-Job`, and the job must be claimed by that runner and
requested by that operator; otherwise 403. All permission checks then use the operator's keys.
`X-Eyvar-Record-Run: 1` on `reports.run` writes `report_runs` with the `job_id`.

## 6. The measure compiler (`api/_lib/compile.ts`)

The catalogue is data; the compiler is generic. For one leg (one measure × one segment):

1. Resolve the population: `measures.population_json` gives `resource`, `predicate`
   (`FilterSpec[]`), `timeField`, `valueField`. `measure_sources` gives the table and the
   subject column. Segment filters and query filters (resource-qualified, spec 06 §3.4) are
   appended to the predicate. A `performed` segment becomes a semi-join on the subject column
   against the performed measure's population within the window.
2. Buckets: `date_trunc` in `Asia/Riyadh` for `day` / `month` / `quarter`; for `week`, Sunday
   start (D45) via `date_trunc('week', ts + interval '1 day') - interval '1 day'`; `none` is
   one bucket. Buckets are generated with `generate_series` so a bucket with no rows appears as
   `null`, not as an absent row.
3. Aggregate per `bucket_aggregate`: `count`, `sum(valueField)`, `avg(valueField)`,
   `end-of-period` (the latest `daily_snapshots` row ≤ bucket end for snapshot measures, or
   the latest row per subject for stock measures with a status history), `cumulative-count`
   (window sum). A stock measure at `none` grain is the value at the window's end.
4. Group by: up to two dimensions, folded at 8 per level in SQL with a ranked CTE and an
   `__other__` row.
5. Comparison: the same query over the comparison window, aligned bucket by bucket.
6. Post-processing in shared TS: transforms (cumulative, rolling, percent of total),
   formula, comparison display, partial-bucket marking, warnings. Identical to the mock's
   `resolveReport`, which is refactored in P1 so the resolver core is pure and the fixture
   layer only supplies rows.

Row cap 50,000 per leg → `truncated: true` and `truncatedAtRows`. Query timeout 20 s per leg.
A leg that fails is reported per series (`failed`), never as a whole-result error.

Worked example the backend engineer can execute: `docs/09-analytics-v2/examples/compile-quick-rides-by-city.sql`
(WP-6.4 writes it from a real fixture measure and checks it against the mock's output on the
same rows loaded into a test database).

## 7. Pages and reports endpoints

Every one below is a docblock on a client function in P4/P2; listed here so the backend can
plan. Envelope `Single<T>` unless stated.

```
GET    /api/v1/catalogue/measures           GET /api/v1/catalogue/dimensions        GET /api/v1/catalogue/glossary
POST   /api/v1/reports/run                  POST /api/v1/reports/export             POST /api/v1/reports/sample (D44)
POST   /api/v1/reports/contribution         POST /api/v1/reports/runs/:runId/describe
GET    /api/v1/reports · POST · GET/PATCH/DELETE /:id · POST /:id/duplicate · POST /:id/star · GET /:id/versions
GET    /api/v1/segments · POST · GET/PATCH/DELETE /:id
GET    /api/v1/annotations · POST · DELETE /:id
GET    /api/v1/pages · POST · GET/PATCH/DELETE /:id · POST /:id/publish · POST /:id/duplicate · POST /:id/star
GET    /api/v1/alerts · POST · GET/PATCH/DELETE /:id · POST /:id/evaluate · GET /:id/history · GET /:id/config-history
POST   /api/v1/alerts/:id/mute · POST /api/v1/alerts/firings/:id/acknowledge · GET /api/v1/alerts/firings · GET /api/v1/alerts/firings/:id/context
GET    /api/v1/webhooks · POST · DELETE /:id
```

`PATCH /api/v1/pages/:id` takes `{ blocks?, title?, …, version }` and returns 409 with
`{ kind: 'conflict', details: [{ field: 'version', code: 'stale' }] }` when `version` is behind.
The server validates blocks with the shared `validatePage()` and rebuilds `page_reports`.

## 8. Alert crons

`api/cron/alerts-hourly.ts` and `alerts-daily.ts` share `api/_lib/evaluateDue.ts`:

1. Verify `CRON_SECRET`.
2. Select rules `WHERE enabled AND cadence = $1 AND state <> 'suspended' ORDER BY last_evaluated_at NULLS FIRST LIMIT 200`.
3. For each: load the report; run it as the owner (permission as owner; if a series is
   blocked → `suspended`, owner notified once); `evaluate()`; `machine.transition()`; persist;
   on firing write `alert_firings`, notifications, deliveries; on failure increment
   `failure_count`, `error` at 5 with one owner notification.
4. Stop at 250 s elapsed; the next invocation continues from the oldest `last_evaluated_at`.
   Lag is visible per rule (state 28).

`api/cron/snapshot.ts` writes today's `daily_snapshots` row from the operational tables using
the same predicates the legacy prototype used (`captureDailySnapshot`, `eyvar_ops_panel_v40_fixed.html:7648-7651`),
so stock measures have an end-of-day reading. It is idempotent per day.

`api/cron/housekeeping.ts` deletes `report_runs` older than 30 days that no page references,
`idempotency_keys` older than 24 h, `agent_events` for jobs older than 90 days, and Blob
exports older than 7 days.

## 9. Testing the backend

- Unit: `api/**/*.test.ts` with `vitest` under a second config `api/vitest.config.ts`
  (`environment: 'node'`), run by `npm run test:api`. SQL is tested against **PGlite**
  (`@electric-sql/pglite`, in-process Postgres) with the migrations applied and a small seed
  loaded from the frontend's fixtures (`src/data/fixtures/*` exported as JSON by
  `scripts/fixtures-to-seed.mjs`), so the compiler's output can be compared with the mock's
  `resolveReport` on identical rows. That comparison is the contract test for `reports.run`:
  **for every seeded saved report, server result equals mock result** bucket for bucket.
- Contract smoke: `scripts/api-smoke.mjs` reads `docs/07-api/endpoints.json` and calls every
  GET with a seeded session against `vercel dev`, asserting the envelope shape and a 2xx/4xx
  the docblock declares. Run before each cutover step.
- Cron: each cron handler is a function that takes `(db, now)` and is unit-tested with a
  frozen clock; the HTTP wrapper only checks the secret.
- Agent queue: claim atomicity is tested with two concurrent claims on PGlite.

## 10. Cutover

`VITE_DATA_SOURCE=http` is one switch, so cutover is staged by **deploying the backend first
against production data with the frontend still on mock**, then flipping the switch on a
preview deployment, running `scripts/api-smoke.mjs` and the harnesses against it, and only
then promoting. Order of endpoints to bring up: `session.current` and `auth` → `catalogue.*` →
`reports.run` → `reports.*` and `pages.*` → `alerts.*` and crons → `agent.*`. Each step is a
WP in [06-execution-plan.md](06-execution-plan.md) with its own smoke assertion.

## 11. What the backend engineer needs from the owner before starting

1. Where the operational tables live and their names (`measure_sources`).
2. D45 (week start).
3. The auth answer (Q1) if not the cookie assumption in §2.
4. An email provider account and, if Slack delivery is wanted, permission to create incoming
   webhooks.
5. A Neon database and a Blob store attached to the Vercel project.
