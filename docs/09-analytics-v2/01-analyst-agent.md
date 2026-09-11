# 01 — The analyst agent

> Decision needed: **D38** (subscription, print mode, owner-operated runner), **D44** (masked
> row samples). Phase: **P7**, after the backend's job queue (P6 WP-6.8) and the query model v2
> (P1) exist. The MCP server can be developed earlier against the mock (§3.4).

## 1. What it is, in one paragraph

The analyst is a Claude Code session that runs in print mode on a machine logged into the
owner's subscription, given one job at a time from a queue the product keeps on the backend,
and given exactly one set of tools: an MCP server that speaks to the same `/api/v1` the
frontend uses, as the operator who asked. It answers questions, writes case studies, drafts
pages and triages alert firings. Every number it states comes from a tool call the backend
recorded; the runner refuses an answer whose numbers do not match those records. The frontend
never talks to a model. Vercel never holds a model credential. The agent's output is content,
stored as a page of blocks, rendered by the same renderer as any other page.

## 2. Why this shape and not another

| Option | Verdict | Reason |
|---|---|---|
| Call the Claude API from a Vercel function | **Refused** | The owner requires the subscription, not an API key. Also puts a key on Vercel |
| Claude Agent SDK on the subscription | **Refused** | The SDK requires API-key or cloud-provider auth; Anthropic's policy reserves claude.ai login for first-party products (`code.claude.com/docs/en/agent-sdk/overview`) |
| Interactive Claude Code only (the owner types `/analyst`) | **Kept as the second entry point** (§9) | Useful, but an operator in the console cannot use it, and nothing is stored |
| `claude -p` print mode with `--mcp-config`, driven by a runner | **Chosen** | Honours the subscription login (`code.claude.com/docs/en/headless`), accepts MCP tools, `--allowedTools`/`--disallowedTools`, `--json-schema`, `--max-turns`, hooks, `stream-json` output. Cannot spawn subagents or preload skills in print mode, which is acceptable: the reasoning lives in one system prompt and the tools |
| Claude Code cloud routines (`/schedule`) for scheduled reviews | **Option B, unverified** | Routines run on the subscription in a cloud session with the repo checked out. Whether a routine can reach a private MCP endpoint with a secret is unverified. The runner's own scheduler (§8) is the default; routines are revisited when verified |

## 3. Architecture

```
 operator (browser, Vercel)            backend (Vercel functions + Postgres)            runner (owner's machine or a small VM)
 ───────────────────────────            ─────────────────────────────────────            ──────────────────────────────────────
 ?view=analyst  ──POST job──────────▶   agent_jobs (queued)                              node agent/runner  (long-poll, 1 job at a time)
 job page       ◀──poll events──────    agent_events (transcript, tool calls, findings) ◀── posts events as they stream
                                        agent_runs   (every report run, with runId)    ◀── MCP tools call /api/v1/* acting-for operator
 result page    ◀──GET page──────────   pages (kind: case-study, draft/published)       ◀── final JSON, validated, stored as blocks
                                                                                            spawns:  claude -p --output-format stream-json
                                                                                                     --mcp-config agent/mcp.json
                                                                                                     --json-schema <kind>.schema.json
                                                                                                     --allowedTools "mcp__eyvar__*"
                                                                                                     --disallowedTools "Bash,Edit,Write,..."
                                                                                                     --permission-prompts none --max-turns 60
```

### 3.1 Repository layout

```
agent/
  package.json            own deps: @modelcontextprotocol/sdk, zod, undici. Not part of the Vite build.
  tsconfig.json
  mcp.json                the --mcp-config: { "mcpServers": { "eyvar": { "command": "node", "args": ["agent/dist/mcp/server.js"] } } }
  settings.json           hooks passed with --settings (PreToolUse deny-list, PostToolUse tool log)
  mcp/
    server.ts             stdio MCP server; registers every tool in §5
    tools/*.ts            one file per tool; each exports { name, description, inputSchema, handler }
    client.ts             fetch wrapper to /api/v1 with the runner token and X-Eyvar-Acting-For
    source.ts             EYVAR_MCP_SOURCE = 'http' | 'mock'  (mock imports src/data/clients through tsx for early development)
  runner/
    index.ts              the daemon: poll, claim, spawn, stream, validate, post
    spawn.ts              builds the claude argv; parses stream-json
    validate.ts           schema validation + the "no number without a run" check (§7)
    limits.ts             rate-limit detection, deferral, retry-at
    schedule.ts           the runner-side scheduler for weekly reviews (§8)
  prompts/
    analyst.md            the system prompt (appended)
    kinds/ask.md, case-study.md, build-page.md, triage-alert.md, weekly-review.md
  schemas/
    ask.schema.json, case-study.schema.json, page.schema.json, triage.schema.json, review.schema.json
  README.md               how to install, log in, run, and read the logs
.claude/skills/analyst/SKILL.md      interactive entry point (§9)
.mcp.json                            repo-level MCP config for interactive use, same server
```

### 3.2 Identity and permission

- The runner holds one secret, `AGENT_RUNNER_TOKEN`, in its environment. It identifies the
  runner, not a person.
- Every job carries `requestedBy` (a `TeamUser.id`). The runner passes it as
  `X-Eyvar-Acting-For` on every tool call. The backend accepts the header **only** with the
  runner token, **only** for the operator who created the job the runner claimed, and resolves
  every permission as that operator (spec 06 §13.1). The agent therefore sees exactly what the
  asking operator sees: a blocked series is blocked for it too, and the case study says so.
- A job created by a scheduled review runs as the operator who created the schedule.
- Every tool call is written to `agent_events` with the acting operator, the tool, the input
  hash and the run id. `sample_rows` additionally writes an audit row (D44).

### 3.3 The spawn

```
claude -p \
  --output-format stream-json --verbose \
  --mcp-config agent/mcp.json \
  --settings agent/settings.json \
  --allowedTools "mcp__eyvar__*" \
  --disallowedTools "Bash,Edit,Write,MultiEdit,NotebookEdit,WebFetch,WebSearch,Read,Glob,Grep,Task,Agent" \
  --permission-prompts none \
  --permission-mode dontAsk \
  --max-turns 60 \
  --append-system-prompt-file agent/prompts/analyst.md \
  --json-schema "$(cat agent/schemas/<kind>.schema.json)" \
  --no-session-persistence \
  "<the job prompt, §6>"
```

Rules the runner enforces around it:

- **Working directory** is `agent/sandbox/`, an empty directory, so no project instructions,
  `CLAUDE.md`, skills or hooks from the repo load into the print session by accident. The only
  hooks are the ones in `agent/settings.json`.
- **`agent/settings.json` hooks**: a `PreToolUse` hook that exits 2 for any tool whose name does
  not start with `mcp__eyvar__` (belt and braces over the flags), and a `PostToolUse` hook that
  appends `{tool, input, output-digest, ts}` to the job's tool log. Hook stdin and stdout shapes
  are the documented ones (`code.claude.com/docs/en/hooks`).
- **Timeout**: 20 minutes wall clock per job, then SIGTERM, then the job is `failed:timeout`.
- **One job at a time** per runner. A second runner instance refuses to start if a lock file
  is held. Two runners on two machines are legal; the backend's claim is atomic (§5 of
  [05-backend.md](05-backend.md)).
- **Verify the login before the first job**: the runner runs `claude -p --max-turns 1 "reply
  with the word ready"` at start and refuses to claim jobs if that fails or the output names an
  API key as the auth source.

### 3.4 Developing before the backend exists

## Verified against real spawns (2026-09-11, WP-7.2)

Three things in this document were assumptions. A real `claude -p` run on the owner's
subscription contradicted each, and the runner is built to what was observed, not to what was
written here first.

1. **`--json-schema` does not make the final message raw JSON.** It injects a `StructuredOutput`
   tool the model must call, and it does so regardless of `--allowedTools` / `--disallowedTools`.
   The runner special-cases that tool in both `spawn.ts` and the PreToolUse hook.
2. **`--disallowedTools` does not close the tool list.** A spawn restricted exactly as §3
   specifies still exposed `CronCreate`, `Monitor`, `Workflow`, `ToolSearch` and third-party MCP
   connectors. The PreToolUse hook is therefore **load-bearing, not defence in depth** — it was
   proven live to refuse `ToolSearch` and `TodoWrite`, with the hook's own error text appearing
   in the transcript. Do not remove it on the grounds that the flags already cover it.
3. **`${CLAUDE_PROJECT_DIR}` resolves to the spawn's cwd (`agent/sandbox`), not the repo root.**
   Hook paths in `settings.json` are written relative to that.

Windows-specific defects found by running it, all fixed: `shell: true` does not quote a command
path containing a space (Node installed under "Program Files"); `SIGTERM` does not kill the
process tree when `shell: true` wraps `cmd.exe`, so a hung spawn survives its timeout — the
runner uses `taskkill /t /f` on win32.

`EYVAR_MCP_SOURCE=mock` makes the MCP server import `src/data/clients/index.ts` through `tsx`
and run against the fixtures with `disableMockLatency()`. Every tool works end to end, `runId`s
are minted locally, and the runner writes events to a local JSONL instead of the backend. The
frontend `analyst` view reads the same JSONL through the mock client, so the whole feature is
demonstrable with `DATA_SOURCE=mock`. This is the P7 development mode; the http mode is the same
code with `source.ts` switched.

## 4. What the operator sees

Routes and copy are in [02-report-builder-v2.md](02-report-builder-v2.md) §9 and
[07-acceptance-criteria.md](07-acceptance-criteria.md) AC-1240 … AC-1269.

| Surface | What it is |
|---|---|
| `/management/reports?view=analyst` | Index table (P1) of jobs: question, kind, requested by, state, started, duration, result link. Filters: state, kind, mine/team. Toolbar primary: `Ask the analyst`. Zero-jobs-ever is R8 first-run; filtered-to-zero is one grey sentence |
| The ask composer | An inline card at the top of the view, not a dialog (owner's no-dialog ruling): a textarea for the question, a `Kind` segmented control (Answer · Case study · Draft a page · Weekly review), optional context chips (a saved report, a page, an alert firing, a date range) and one primary `Ask`. Disabled with a reason while the runner is offline or at its limit |
| `/management/reports/analyst/:jobId` | The job page. Header: question, kind, state badge (`queued` neutral · `running` info · `deferred` warning · `done` success · `failed` warning; no red). Body while running: a live timeline of steps (tool name, one-line summary, duration) and interim findings from `note_finding`; refreshed by polling every 2 s (no SSE dependency). Body when done: the result rendered as a page (blocks), with a `Provenance` panel listing every run (query, window, asOf) and a `Open in builder` link per run. Actions: `Save as page`, `Pin to page…`, `Create alert from finding`, `Re-run`, `Copy link` |
| Entry points | Builder overflow: `Ask the analyst about this report`. Page header: `Ask the analyst about this page`. Alert history row: `Explain this firing`. Notification of a firing: `Explain`. Command palette: `Ask the analyst…` |
| Runner status | A small line in the analyst view header: `Runner online · last seen 12:03` / `Runner offline` / `At usage limit until 14:00`. From `GET /api/v1/agent/status` |

The agent's prose is **content**, not copy: it is stored in the page, it is in the language the
operator asked in (`language` on the job), and it is not a key. Every chrome string around it
(`Provenance`, `Runner offline`, state names) is a key under `an.*` with an Arabic entry.

## 5. The tool catalogue

Every tool is registered by the MCP server with a Zod input schema, a one-paragraph description
written for the model, and a handler that calls the backend. Names are prefixed `eyvar_` on the
wire (`mcp__eyvar__eyvar_run_report` as Claude sees it). Read-only tools have no side effect
other than the event log. Outputs are compact JSON; series are truncated to 400 points; no tool
returns more than 64 KB.

| # | Tool | Input | Output | Side effect | Endpoint |
|---|---|---|---|---|---|
| T1 | `catalogue_measures` | `{ query?: string, category?: MetricCategory }` | measures: key, label, caption, unit, currency, temporality, additive, minGrain, coverage {from,to}, dimensions, filterableFields, blocked (bool for this operator) | none | `GET /api/v1/catalogue/measures` |
| T2 | `catalogue_dimensions` | `{ forMeasure?: MeasureKey }` | dimensions with cardinality hints | none | `GET /api/v1/catalogue/dimensions` |
| T3 | `glossary` | `{ term?: string }` | definitions of business terms, measures' captions, the Riyadh/Sunday rules, the money rule, coverage caveats | none | `GET /api/v1/catalogue/glossary` (server-side markdown, generated from `Measure.captionKey` and `docs/05-restructure/specs/05-metrics-content.md` §5–§12 excerpts) |
| T4 | `plan_query` | `{ query: ReportQuery }` | `QueryPlan`: violations with reasons, legal grains and chart types, bucket count, effective chart type | none | pure, server-side `planQuery` |
| T5 | `run_report` | `{ query: ReportQuery, label?: string }` | `{ runId, result: ReportResult (points capped), summary: per series { total, mean, min, max, first, last, changeAbs, changePct, partialExcluded: true } }` | records a run | `POST /api/v1/reports/run` with `X-Eyvar-Record-Run: 1` |
| T6 | `compare_windows` | `{ query, windowA: ReportWindow, windowB: ReportWindow }` | two runs and per-series deltas (abs, pct, with nulls where a side is a gap) | records two runs | two `reports.run` |
| T7 | `describe_series` | `{ runId, seriesId }` | descriptive stats (mean, median, p10, p90, MAD), linear trend slope per bucket with r², change points (CUSUM with a stated threshold), outliers (|z-MAD| > 3.5), weekday profile when grain is `day` | none | `POST /api/v1/reports/runs/:runId/describe` (pure code in `src/data/reporting/stats.ts`, shared by mock and server) |
| T8 | `correlate` | `{ a: {runId, seriesId}, b: {runId, seriesId}, maxLag?: number }` | Pearson and Spearman at lag 0 … maxLag, n, a warning when n < 8 or when either side has gaps | none | pure |
| T9 | `contribution` | `{ query with groupBy, windowA, windowB }` | which groups explain the change between the two windows: per group deltaAbs, share of total change, rank; `Other` folded | records runs | `POST /api/v1/reports/contribution` |
| T10 | `sample_rows` | `{ resource, filters: FilterSpec[], bucket?: IsoDate, limit?: ≤50 }` | rows with PII fields masked by the server (`name → initials`, `phone → last 2 digits`, ids intact) | audit row | `POST /api/v1/reports/sample` (D44) |
| T11 | `saved_reports_search` | `{ query?: string, mine?: boolean }` | saved reports: id, name, description, query, lastRunAt | none | `GET /api/v1/reports` |
| T12 | `get_saved_report` | `{ id }` | the report | none | `GET /api/v1/reports/:id` |
| T13 | `save_report` | `{ name, description, query, visibility: 'private' }` | the saved report, tagged `createdBy: 'analyst'`, owned by the acting operator | write | `POST /api/v1/reports` |
| T14 | `pages_search` / `get_page` | `{ query?: string }` / `{ id }` | pages (blocks capped) | none | `GET /api/v1/pages` |
| T15 | `create_page_draft` | `{ title, kind: 'case-study' \| 'dashboard', blocks: Block[] }` | the page id; `publishedAt: null` | write | `POST /api/v1/pages` |
| T16 | `alerts_list` / `alert_history` / `alert_context` | `{}` / `{ ruleId }` / `{ firingId }` | rules; firings; for one firing: the rule, the series around the firing bucket (±14 buckets), the threshold, prior firings, annotations in range | none | `GET /api/v1/alerts…`, `GET /api/v1/alerts/firings/:id/context` |
| T17 | `annotations_list` | `{ from, to }` | product annotations (launches, price changes, outages, campaigns) | none | `GET /api/v1/annotations` |
| T18 | `prior_studies_search` | `{ query: string }` | previous case-study pages: title, date, question, headline finding | none | `GET /api/v1/pages?kind=case-study&q=` |
| T19 | `note_finding` | `{ text: string, runIds: string[] }` | ok | appends an interim finding to the job, shown live | `POST /api/v1/agent/jobs/:id/findings` |
| T20 | `job_context` | `{}` | the job's kind, question, context objects already fetched (report, page, firing), operator language, today's date in Riyadh, the coverage window of the data | none | `GET /api/v1/agent/jobs/:id` |

Rules about tools:

- **T1 before anything.** The system prompt forbids guessing a measure key. A key not returned
  by T1 in this session is refused by T4/T5 with `unknown-measure`, which the planner already
  emits.
- **T4 before T5.** A query with violations is never run. The tool returns the violations;
  the model fixes the query.
- **T5 always records.** `runId` is the unit of evidence. The summary excludes partial buckets
  and says so.
- **T10 is the only row-level access**, and it is refused for an operator without `view` on the
  resource. The model is told masked fields are masked and must not try to infer identities.
- **T13 and T15 write only drafts owned by the acting operator**, visibility private, tagged.
  Nothing the agent writes is visible to the team until an operator publishes it.
- **No tool sends anything anywhere.** No email, no Slack, no notification. The agent proposes
  an alert; the operator creates it.

## 6. The job prompt

The runner assembles the prompt from the kind template in `agent/prompts/kinds/` plus job data.
Structure, identical for every kind:

```
# Job
kind: case-study
question: <operator's text, verbatim, in the operator's language>
language: ar | en          → write all prose in this language; keep measure keys and ids as they are
today: 2026-06-25 (Asia/Riyadh)
data coverage: 2026-05-27 → 2026-06-25 (daily snapshots); trips from 2026-05-01
context objects: <JSON: the saved report / page / firing the operator attached, already fetched>
budget: at most 40 tool calls; stop and answer with what you have when you reach it

# Output
Your final message must be JSON matching the provided schema and nothing else.
```

`agent/prompts/analyst.md` (appended system prompt) is the reasoning protocol, §7, written as
instructions. It is kept under 1,500 words. It is versioned; the version string is written into
every job's events so a change in the prompt is visible in the history.

## 7. The reasoning protocol

This is what makes the output a case study rather than a paragraph. The runner enforces the
parts that can be enforced; the prompt carries the rest.

**Method, in the order the model must follow it**

1. **Restate the question and the decision it informs.** If the question names no decision,
   name the most plausible one and say it is assumed.
2. **Discover, never guess.** Call T1 (and T3 for terms). Note coverage: a question about
   "last quarter" against a 30-day coverage window is answered with the window that exists and
   a stated gap, never with an extrapolation.
3. **Plan, validate, run.** Compose `ReportQuery` objects; T4 each; fix violations; T5. Prefer
   the coarsest grain that answers the question. Always request `periodComparison` when
   coverage allows a previous period.
4. **Baseline before story.** State the level, the previous-period delta and the trend slope
   (T7) before proposing any cause.
5. **Decompose.** Split by every legal dimension whose cardinality hint is ≤ 8 (T9 for the
   change between windows). Report the top contributors and the share of change they explain.
6. **Test at least two alternative explanations**, one of which must be a data explanation
   (gaps, truncation, a blocked series, a partial bucket, a coverage edge, an annotation in
   range, T17).
7. **Quantify.** Every finding carries a number in the measure's unit, money in SAR, with the
   window and grain it was measured at.
8. **Recommend.** One recommendation per finding, with the role that owns it, the expected
   effect in the measure's unit, how to verify (a report query to save, an alert condition to
   set) and when to look again.
9. **State confidence** as one of `high | medium | low` with the reason, and list what data
   would raise it.
10. **Write in the operator's language.** Short sentences. No hedging paragraphs. Numbers in
    tables, not prose.

**What the runner enforces (`agent/runner/validate.ts`)**

- The final message parses against the kind's schema (`--json-schema` already forces this;
  the runner re-validates).
- Every `finding.evidence[]` entry names a `runId` that exists in this job's tool log.
- Every `finding.values[]` entry `{ runId, seriesId, bucket | 'total', value }` matches the
  stored run within rounding (the runner recomputes `total`, `mean`, `last`, `changePct` from
  the stored result). A mismatch fails the job with `failed:evidence`, and the runner retries
  **once** with the mismatch appended to the prompt. A second failure is final and the job page
  shows the reason.
- A case study with fewer than two `alternatives[]` or without a `dataQuality` section fails
  schema validation.
- Any string that looks like an unmasked phone or email in the output fails the job.

**Output schema, case study (abridged; the full JSON Schema lives in `agent/schemas/`)**

```
CaseStudy {
  title, language, question, decision,
  headline: { text, confidence: 'high'|'medium'|'low', confidenceReason }
  baseline: { measureKey, window, grain, level, previousPeriodDeltaPct|null, trendSlopePerBucket|null, runId }
  findings: [{ id, text, values: [{ runId, seriesId, bucket|'total', value, unit, currency|null }], evidence: runId[], chart: ReportQuery|null }]
  contributors: [{ dimension, group, deltaAbs, shareOfChangePct, runId }]
  alternatives: [{ hypothesis, tested: true, evidence: runId[], verdict: 'supported'|'not-supported'|'inconclusive', text }]
  dataQuality: { gaps: string[], partialBucketsExcluded: true, blockedSeries: string[], truncated: boolean, coverageNote }
  recommendations: [{ text, ownerRole, expectedEffect: { measureKey, direction, magnitude|null }, verifyWith: { reportQuery: ReportQuery|null, alertCondition: AlertCondition|null }, reviewBy: IsoDate }]
  followUps: string[]
}
```

The `answer`, `page`, `triage` and `review` schemas are subsets or arrangements of the same
parts; `page` outputs `Block[]` directly (see [03-pages-and-dashboards.md](03-pages-and-dashboards.md) §2).

**Rendering.** The backend converts a validated `CaseStudy` into a page: heading (title),
callout (headline, tone by confidence: `success` high, `info` medium, `warning` low), text
(decision), `report` blocks for `baseline` and each finding's `chart` (saved as private analyst
reports through T13's path), a `table` block for contributors, toggles for alternatives, a text
block per recommendation with an `alert-proposal` sub-block, and a `provenance` footer listing
runs. The conversion is a pure function, `caseStudyToBlocks()`, in `src/data/reporting/agent/`,
shared with the mock, so the frontend and the server render the same page.

## 8. Scheduled reviews

- A **review schedule** is a row (`agent_schedules`): kind `weekly-review`, a template
  (`agent/prompts/kinds/weekly-review.md` plus a list of saved report ids or a page id), a cron
  expression restricted to weekly/daily, the operator who created it, `enabled`.
- Vercel Cron `/api/cron/agent-schedules` (`*/15 * * * *`) enqueues a job for every due
  schedule. The runner picks it up like any job. If the runner is offline the job waits and
  the job page says so; nothing is silently skipped.
- Output is a `case-study` page titled with the period, published to the schedule's owner as a
  draft, with a notification `Weekly review ready`.

## 9. The interactive entry point

`.claude/skills/analyst/SKILL.md` lets the owner run `/analyst <question>` in a terminal
session. It preloads the same protocol text and uses the repo-level `.mcp.json` pointing at the
same MCP server (`EYVAR_MCP_SOURCE` from the environment). In an interactive session subagents
and skills are available, so the skill may delegate a long study to a `analyst` subagent
(`.claude/agents/analyst.md`, `tools:` only the MCP tools, `model: inherit`). Output is written
to `docs/09-analytics-v2/studies/<date>-<slug>.md` and, optionally, posted as a page through
T15. This path is for the owner; the product path is §4.

## 10. Limits, failures and what the operator is told

| Event | Runner does | Operator sees |
|---|---|---|
| Rate limit reached (stream-json result names the limit) | Marks the job `deferred` with `retryAt` parsed from the message or +60 min; stops claiming until then | `At usage limit until 14:00`; the job stays in the list with that state |
| Runner offline | Backend marks the runner offline after 90 s without a heartbeat (`POST /api/v1/agent/heartbeat` every 30 s) | `Runner offline` and the composer disabled with the reason; queued jobs wait |
| Job timeout | `failed:timeout`, partial findings kept | The job page shows the findings noted so far and the failure |
| Evidence mismatch twice | `failed:evidence` | The page says the analyst could not substantiate its numbers, with the mismatch listed |
| Tool error (a `blocked` series, a 403) | Not a failure. The tool returns the refusal; the model is told to report it | The case study's `dataQuality.blockedSeries` names it |
| Schema failure after the retry | `failed:schema` | Plain statement, `Re-run` offered |

Usage is shared with the owner's interactive use. The runner logs turns and tool calls per job
so the owner can see what a study costs in turns. There is no dollar figure because there is
no metered bill.

## 11. Tests and proof

- **MCP server**: one unit test per tool against `EYVAR_MCP_SOURCE=mock` asserting input
  validation, the shape of the output, the size cap, and (for T10) masking. `agent/mcp/*.test.ts`,
  run with `npm --prefix agent test`.
- **Runner**: tests for `validate.ts` with a fixture job log and outputs that pass, mismatch,
  and leak PII; tests for `limits.ts` parsing three real limit messages captured from the CLI;
  a spawn test that runs `claude -p --max-turns 1` only when `AGENT_E2E=1`.
- **Frontend**: AC-1240 … AC-1269 in [07-acceptance-criteria.md](07-acceptance-criteria.md);
  the job page has all four states plus `deferred`; the composer's disabled reasons are keys.
- **End to end**: `scripts/harness/analyst.mjs` runs a seeded mock job and screenshots the
  running timeline and the finished page in both languages.
- **A recorded study**: before P7 closes, one real study on the fixtures is run through the
  full path and committed under `docs/09-analytics-v2/studies/` as the reference output, with
  its tool log. The owner reads it and rules whether the protocol is producing decisions.

## 12. What is deliberately not in the agent

- No memory across jobs beyond T18 (search of prior studies). No vector store.
- No writes to operational data. No refunds, no dispatch, no messages. The tool list is the
  permission list.
- No browsing. No web search. No file system.
- No "chat with your data" free-form loop in the product. A job has a question and an end.
  A follow-up is a new job with the previous page attached as context.
