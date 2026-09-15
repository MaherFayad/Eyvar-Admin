# Cutover — mock to server (WP-6.8)

`VITE_DATA_SOURCE=http` is **one switch** (`05-backend.md` §10). It is not staged endpoint
by endpoint — the router (`api/v1/[...route].ts`) wires the whole analytics-v2 surface at
once, in one deployment. What *is* staged is trust: the six checkpoints below are verified
**in this order, on a preview deployment, with the switch still off**, because a defect in
auth or the catalogue would corrupt everything built on top of it, and a green check on
`reports.run` is worthless if `session.current` cannot be trusted. Only after checkpoint 6
passes does anyone flip the switch, and only on a preview first.

Every checkpoint runs the same command:

```
HARNESS_BASE=<api origin> SMOKE_EMAIL=<operator> SMOKE_PASSWORD=<password> \
  SMOKE_TOTP_SECRET=<base32 secret> node scripts/api-smoke.mjs
```

`scripts/api-smoke.mjs` always runs the full operator journey (sign in → session → catalogue
→ run a report → read a page → list alerts → enqueue an agent job), not a subset per
checkpoint — there is no partial-surface mode to ask it for, for the same reason the switch
itself is not partial. "Passing checkpoint N" means: everything through step N in its output
is `[PASS]`, and nothing before it regressed. Steps after N are expected to still fail or
skip until their own checkpoint — see the per-step tables below for what "still expected
here" means.

## Preconditions — read before touching the switch

### A. Deployment

1. **Neon Postgres attached**, migrations applied: `node api/_db/migrate.mjs` against
   `DATABASE_URL` (`05-backend.md` §11 item 5).
2. **`measure_sources` points at real tables.** WP-6.4 seeded it from the frontend's own
   fixtures (`docs/09-analytics-v2/examples/*.seed.sql`) so the AC-1276 equality test could
   run; production remaps those five rows (`resource`, `table_name`, `time_column`,
   `subject_column`, …) at the columns the catalogue names, nothing else changes
   (`05-backend.md` §11 item 1, F-V2-14).
3. **Env vars set** on the Vercel project: `DATABASE_URL`, `SESSION_SECRET`, `CRON_SECRET`,
   `AGENT_RUNNER_TOKEN`, `SECRETS_KEY`, `EMAIL_PROVIDER`/`EMAIL_API_KEY`/`EMAIL_FROM`,
   `BLOB_READ_WRITE_TOKEN`. None of these belong in this document or in
   `scripts/api-smoke.mjs` — the script never reads or sends `CRON_SECRET`, by design; the
   cron surface is proved by `api/cron/*.test.ts`, not by this script.
4. **The first operator account cannot be self-service.** Every path that creates a user
   (`/auth/activate`, `/team/operators`) needs an *existing* operator with `manage_team` to
   start it. The very first row in a fresh database has to be inserted directly (a one-off
   `INSERT INTO users (...) VALUES (..., 'Owner', 'Active', 'totp', <secret>)`, mirroring
   what this WP's own verification harness did — see "What was actually run" below). This is
   not automated anywhere in this build; whoever provisions the preview database does it by
   hand once. Flag it if it still isn't by the time a second preview is spun up.
5. **The smoke account's second factor must be TOTP, not SMS.** `scripts/api-smoke.mjs`
   answers a `challenge` outcome by computing a code from `SMOKE_TOTP_SECRET`
   (RFC 6238, mirroring `api/_lib/otp.ts`'s `totpAt`) — nothing can read an SMS. Enrol the
   smoke operator with an authenticator app (or insert `second_factor_method='totp'`,
   `totp_secret=<base32>` directly, as above) before the first run.

### B. Three product-shape gaps — accepted for a preview, blocking for production

These are not deployment mistakes; they are what P6 built on purpose, and each one is cheap
to carry through a preview and expensive to carry into real trip volumes. State them to
whoever signs off the cutover — do not let a green smoke run stand in for reading this.

**B1 — the compiler aggregates in Node, capped at 50,000 rows per leg.**
`api/_lib/compile.ts` fetches matching rows and calls the *same* `resolveTrendLeg` /
`resolveFormulaLeg` the mock calls, rather than emitting `GROUP BY` SQL — see
`BUILD-LOG.md`'s "The one finding that needs a decision before production" for the full
reasoning. It is why AC-1276's equality test can exist at all (server and mock cannot drift;
there is one implementation), and it is why this **cannot** go to production at real
trip volumes: past the cap, a leg returns `truncated: true` — marked, not silent, but a
truncated answer is not an answer. **Recommendation on record: keep it for the preview
deployment; treat "push aggregation into SQL, with AC-1276 as the guard" as the first
production work package. Do not raise the row cap instead** — that trades a marked wrong
answer for an unmarked slow one.

**B2 — there is no `manage_analytics` permission key.** Every analytics write the server
accepts today — saving a report, editing a page, creating an annotation, arming an alert —
is gated on the same `view_analytics` that gates reading. `Page.official`'s own type comment
in `src/data/types/page.ts` says the same thing: "Set only by `manage_analytics` (D17 — key
not yet minted)". F-V2-28 in `BUILD-LOG.md` calls this a faithful match to the mock's
existing behaviour, not a regression — but it is a real gap between "can see the numbers"
and "can change what everyone else sees", and minting the key touches the RBAC union, every
role fixture, and the settings permission matrix. **Owner's call**, not this WP's to make.

**B3 — provenance is derived, not recorded, and this WP's smoke run demonstrates the
concrete mechanism.** `BUILD-LOG.md`'s F-V2-90 names the product-level problem:
`AgentToolCallEvent` carries no run record, so `ProvenancePanel` reconstructs which runs
produced a finding by reading the blocks a result page happens to have saved. Reading
`api/_lib/handlers/reportsRun.ts` end to end and then *running* `scripts/api-smoke.mjs`
against a live instance shows exactly where that gap sits:

- The client docblock for `recordRun` (`src/data/clients/runs.ts`) documents
  `POST /api/v1/reports/run` with header `X-Eyvar-Record-Run: 1` as answering
  `{ runId, result, summary }` — a run id, on the wire, in the same response.
- `createRunReportHandler` used to read that header only to decide which `job_id` to stamp on
  the `report_runs` row it inserts, and **always** returned the bare `ReportResult` with no
  `runId` on it, regardless of the header. `api/v1/reports-run.test.ts` never exercised the
  header, so 207 passing api tests did not catch it; this WP's smoke run, against a real
  seeded instance, is what found it.

**Closed in WP-6.9.** The handler now answers the `RecordRunOutcome` envelope —
`{ status, runId, result, summary }` — and its test asserts behaviour rather than shape: the
returned `runId` names a row that really exists in `report_runs`, and a second call mints a
different one, because T5 always records. `runId` lives on the envelope and **not** on
`ReportResult`, so AC-1276 still compares the same shape on both sides; `summariseRunSeries`
moved into `src/data/types/report.ts` so the mock and the server compute a summary with one
shared function rather than two that can drift.

**What remains open is the wider half of F-V2-90**, and it is the half that matters most: a
run id still is not recorded on `AgentToolCallEvent` at the moment a tool runs, so the
analyst's citation chain is still reconstructed from whatever blocks a result page happens to
have saved. The wire now carries a run id; the agent's own event stream still does not.

## Ours to fix, versus the owner's to decide

| | Item | Owner |
|---|---|---|
| ~~Ours~~ | ~~B3's concrete mechanism: `reportsRun.ts` should return `runId` and `summary` under `X-Eyvar-Record-Run: 1`~~ — **done in WP-6.9**, with a test that checks the id names a real row rather than merely being present | closed |
| Owner's | B1: do not raise the cap; approve "SQL aggregation" as the first production WP | Owner |
| Owner's | B2: mint `manage_analytics` or accept the current `view_analytics`-for-everything model | Owner |
| Owner's | F-V2-90's wider shape: put a run id on `AgentToolCallEvent` itself, in `src/data/types/agent.ts` and on the wire, so provenance is recorded at the moment a tool runs rather than reconstructed afterward | Owner + agent/ owner |

## The six checkpoints

### 1 — `session.current` and `auth`

**Proves:** sign-in, TOTP verification, cookie issuance and the permission list on
`GET /session` all work against real Postgres rows, not PGlite fixtures.

**Run:** the command above. Expect:

```
[PASS] sign in — signed in as <email>
[PASS] session.current — <email>, role <role>, N permission(s)
```

Everything after this is allowed to fail — the catalogue, reports and pages tables are
still likely empty on a brand-new database.

**Rollback:** none needed — the backend can sit deployed and unused indefinitely; the
frontend never talks to it until `VITE_DATA_SOURCE=http` is set. If sign-in itself is
broken, nothing downstream can be checked, so there is nothing to roll back *from*.

### 2 — `catalogue.*`

**Proves:** `measures`/`dimensions`/`glossary` are seeded and readable.

**Run:** same command. Expect step 1 to stay green and add:

```
[PASS] read the catalogue — N measure(s), M dimension(s), glossary K chars
```

A `[FAIL] read the catalogue` with **zero measures** most likely means precondition A.2
(`measure_sources`, and the `measures`/`dimensions` tables it depends on) was not seeded —
those two tables have no migration-time data; WP-6.4's `docs/09-analytics-v2/examples/*.seed.sql`
files are the reference seed, and production needs its own equivalent generated the same way
(`scripts/fixtures-to-seed.mjs`, or the real catalogue hand-entered to the same shape).

**Rollback:** none — read-only.

### 3 — `reports.run`

**Proves:** the compiler runs a real query against real rows and returns a `ReportResult`
shaped the way the mock's does.

**Run:** same command. Expect steps 1–2 green, and:

```
[FAIL] run a saved report (or ad-hoc) — ... did not return a runId ...
```

**This FAIL is expected and does not block promotion to checkpoint 4** — it is precondition
B3, tracked above as ours to fix, not a regression this checkpoint introduces. What *would*
block: a non-2xx status, an empty body, a missing `buckets`/`series` array, or (if the
deployment carries real trip volumes already) a `truncated: true` nobody has acknowledged —
see B1.

**Rollback:** each run writes one `report_runs` row. Harmless to leave; `housekeeping`
(checkpoint 5) prunes anything untouched after 30 days.

### 4 — `reports.*` and `pages.*`

**Proves:** saved reports and pages round-trip, and permission-gated reads redact instead of
erroring (AC-888, §13.1).

**Run:** same command. Expect:

```
[PASS] read a page — "<title>" (<id>), N block(s)
```

or, on a database with no pages seeded yet, `[SKIP] read a page — no pages on this
deployment yet` — a skip does not fail the run; it means there is nothing to read yet, which
is expected before an operator has saved anything real. Seed or save at least one page and
one report before calling this checkpoint done, so the read path is actually exercised once.

**Rollback:** `DELETE FROM pages WHERE id = '<id>'` / same for `saved_reports` if a smoke
run's own writes need cleaning up before a real operator sees them — the smoke script does
not create pages or reports itself, only reads them, so there is nothing of its own to
clean here.

### 5 — `alerts.*` and crons

**Proves:** alert rules are readable and shaped correctly; separately (not by this script —
`CRON_SECRET` never appears here), each `api/cron/*.ts` handler is proven by its own
`*.test.ts` against a frozen clock.

**Run:** same command. Expect:

```
[PASS] list alerts — N rule(s); "<name>" is <state>
```

or the same "no data yet" skip as checkpoint 4 on a fresh database.

**Before promoting past this checkpoint**, confirm the Vercel plan matches the cron cadence
the rules need: Hobby cannot deploy an hourly cron (`05-backend.md` §1a) — if any alert rule
needs `cadence: 'hourly'`, the project must be on Pro, or that cadence is disabled in the
composer with `rb.alert.cadence.hobby` per the documented fallback.

**Rollback:** disable the affected `crons` entries in `vercel.json` (not this WP's file) and
redeploy; no data is lost, evaluation lag simply grows and is visible (F-V2-36).

### 6 — `agent.*`

**Proves:** an operator can enqueue a job and read it back. The runner itself
(`agent/runner/`) is a separate process with its own `AGENT_RUNNER_TOKEN` — this checkpoint
proves the queue accepts and returns work, not that a runner is currently claiming it.

**Run:** same command. Expect:

```
[PASS] enqueue and read an agent job — job <id> (queued), 0 event(s) — left queued; no runner claimed it
```

**Rollback:** the smoke run leaves one `queued` job per execution — harmless, and visible to
an operator as "Smoke check — api-smoke.mjs, safe to ignore or cancel." in the analyst
index. `DELETE FROM agent_jobs WHERE question LIKE 'Smoke check%'` before a demo if it would
be confusing; not necessary otherwise. A queued job with no runner online simply sits, which
is itself worth noticing — if `GET /agent/status` (not part of this script's journey; add it
here if a runner is expected to be live) reports `online: false`, the runner process needs
starting before this checkpoint means anything end to end.

## After all six pass on a preview

1. Run the Playwright harnesses against the same preview:
   `HARNESS_BASE=<preview-url> node scripts/harness/analyst.mjs` and the other
   analytics-adjacent harnesses (`alerts-v2.mjs`, `pages.mjs`, `amp-builder.mjs`, …) — a green
   smoke run proves the wire shapes; it does not prove a chart draws, jsdom renders no SVG
   and a green suite does not verify a chart (see the harness rule in `05-backend.md` §9 and
   `CLAUDE.md`'s own instruction to run a harness for anything drawn).
2. Set `VITE_DATA_SOURCE=http` on the **preview** build only, re-run this script and the
   harnesses once more against it with the switch actually flipped (a proxy or same-origin
   build, per `05-backend.md` §1's local-dev note, applies to a preview deployment too).
3. Only then set it on production, and only after B1/B2 have an owner decision on record —
   this document's job is to make sure nobody flips the production switch having merely
   skimmed the fact that it happened, not read it.

## What was actually run for this handoff

`vercel dev` was not available (no Neon database attached to this session, no Vercel project
link). What was verified instead: `scripts/api-smoke.mjs` was run against a **local instance
of the real router** (`api/v1/[...route].ts`, unmodified) — PGlite in place of Neon,
migrated with the real `api/_db/migrate.mjs` and seeded from the real
`docs/09-analytics-v2/examples/*.seed.sql` fixtures WP-6.4 generated, with one operator
account inserted directly (precondition A.4, above) — wrapped in a throwaway
`node:http` server built for this verification only, outside this WP's file set, and
discarded afterward. The full output is in the WP's final report. This proves the script
runs, its assertions fire correctly (including the one real defect it caught, B3), and its
TOTP sign-in path works end to end — it does not prove anything about Neon, Vercel Cron, or
a real preview deployment's network path, which the next person to run this checklist
against an actual preview still needs to do.
