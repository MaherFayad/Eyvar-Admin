# The analyst screen — acceptance criteria (WP-7.7 Proof)

Each line: met or not, with the evidence that says so — a fresh test run this session, a live
Playwright check against `npx vite --port 4329` (a dev server isolated to this session; the
default port 4327 was already serving another agent's session on this shared tree, so every
live check below used the isolated instance to avoid attributing someone else's state to this
screen), or a file:line code read. Counted, not quoted from a document.

**Tree note — this audit ran against a moving target, by design (AGENT-BRIEF's expected
concurrency).** `git status` was dirty in `src/screens/analyst/**` and neighbouring files
(`ReportBuilder.tsx`, `AlertHistoryDialog.tsx`, `ReportsScreen.tsx`, `SchedulesPanel.tsx`)
for essentially this whole session, from other agents actively landing work while this audit
read the same files. Two of this document's own findings changed state mid-session as a
direct result — see "Entry points" (AC-1262) and AC-1260's `Pin to page…` row below, both
re-tested live after the change rather than reported stale. A `typecheck` run and one test
run each transiently failed once, on files this document does not own
(`src/screens/reports/ReportsScreen.tsx`, unrelated to the analyst screen), and were clean on
the very next run seconds later — almost certainly another agent's file mid-save, not a real
regression; not chased further, since holding this deliverable for every ripple in a shared,
actively-written tree has no natural stopping point. **The numbers quoted below are the last
clean reading of each command, each timestamped by its own position in this document**, not
a single frozen snapshot.

**Fresh vitest, last clean run this session:** `npx vitest run src/screens/analyst/analystView.test.tsx
src/screens/analyst/jobScreen.test.tsx src/screens/analyst/jobTimeline.test.tsx` →
**3 test files, 30 tests, all passing** (8.21s — `jobScreen.test.tsx` grew from 8 to 11 tests
between two runs in this session, from the same concurrent `Pin to page…` fix noted under
AC-1260). `npx vitest run --config api/vitest.config.ts agent.test.ts` → **27 tests, all
passing** (47.86s), covering the backend half of AC-1266/1267. `npm run typecheck` → clean, on
the reading taken alongside the test run above. `npm run i18n:check` → clean, 7,538 keys, 0
`defaultValue` at ceiling 0, on the reading taken **before** the concurrent AC-1262 work
landed — see "Entry points" for a mid-session `stale` reading that is that other agent's own
work-in-progress, not a defect.

**Harness this session:** `scripts/harness/analyst.mjs`, extended this work package (dark
theme, all seven seeded job states, a computed-colour red scan, and two new checks —
Provenance completeness and entry-point prefill). Full log below each finding; screenshots in
`scripts/harness/shots/analyst-*.png`.

| AC | Met | Evidence |
|---|---|---|
| AC-1254 | ✅ | `analystView.test.tsx` — lists all 7 seeded states with their badges; filters to Mine (drops AGT-1, keeps AGT-2) and by the State column filter. Live: `analyst-en-index.png`, 7 rows, `overflowX: 0`. |
| AC-1255 | ✅ | `analystView.test.tsx` — Ask disabled empty, enabled once typed, disabled with the offline reason (`useOfflineRunner()`) and the limited reason. `AskComposer.tsx:60-75`. |
| AC-1256 H | ✅ | `jobScreen.test.tsx`, seam-instrumented at the client-module boundary (`vi.mock('@/data/clients', …)` wrapping the real `listAgentJobEvents`, not a spy on an object) — `eventsCalls` increases while `AGT-2` (running) is mounted and a 2.1s fake-timer tick passes, and **does not increase at all** over a 10s tick once `AGT-1` (done) is mounted. `JobScreen.tsx:103-122`'s effect clears its interval on every state change and never re-arms for `done`/`failed`. |
| AC-1257 | ✅ | `jobTimeline.test.tsx` — a finding absent on first render appears after a re-render with it appended to `events`. Live: AGT-2's timeline shows two completed steps plus one in-flight (`…`, `durationMs === 0`) — `_debug` check this session, `hasLog: true, steps: 3`. |
| AC-1258 | ❌ **BLOCKING — F-V2-90 still open** | See "F-V2-90" below. The Provenance panel is not "every run"; it is every `report` block a finding's chart happened to get wired to, and it never displays the `runId` string it does have. |
| AC-1259 | ✅ | `jobScreen.test.tsx` — clicking `Open in builder` navigates to a route rendering `the report builder`. Code: `ProvenancePanel.tsx:63`, `REPORT_QUERY_PARAM` = `'q'` (`src/data/reporting/serialise.ts:41`), exactly `/management/reports?q=`. Live: `openInBuilder count 1` against the isolated server (see the flaky first run below). |
| AC-1260 | ⚠️ should-fix (was two deferrals, now one) | `Save as page`, `Copy link`, `Re-run` — buttons, accessible names, all pass. **`Pin to page…` was wired live during this session** (another agent's concurrent edit to `JobScreen.tsx`): it now opens an inline `Command` picker (never a dialog), lists dashboard pages, and appends a `bookmark` block on the chosen page — re-tested, `jobScreen.test.tsx`'s new case "Pin to page opens an inline picker, never a dialog, and pins a bookmark onto the chosen page" passes. `Create alert` remains **openly disabled with a translated reason** (`an.job.action.createAlert.unwired`) — the code comment now explains why precisely: `AlertRuleDialog.tsx` takes no prop for a prefilled `AlertCondition` and `Block` has no `alert-proposal` variant, both outside this work package's file set. CLAUDE.md's "illegal is disabled in place with a reason, never hidden" is followed correctly; the AC's "prefills the composer with the finding's proposed condition" clause is a stated, explained deferral, not a hidden defect. |
| AC-1261 | ✅ | `jobTimeline.test.tsx` — `deferred` shows the retry time, `failed:timeout` keeps prior findings, `failed:evidence` lists the mismatched finding, `failed:schema` offers a working `Re-run`. Live, all 5 non-done/running states, computed-colour scan: **zero red hits** in every one (`state AGT-7 queued … redHits 0`, `AGT-3 deferred … 0`, `AGT-4 failed-evidence … 0`, `AGT-5 failed-timeout … 0`, `AGT-6 failed-schema … 0`). Screenshots confirm the exact sentences: "Paused. The runner is at its usage limit until 10:00.", "The analyst couldn't substantiate its own numbers, so this job did not finish." |
| AC-1262 | ⚠️ **in flight — see the live note below** | See "Entry points" below. When this session started, every entry point navigated to a blank composer. **While this audit was running, another agent landed `src/screens/analyst/entryContext.ts` and wired two of the five entry points to it, live, mid-session** — confirmed working by a fresh check (not stale). Two entry points remain absent from the codebase, and one existing link was left on the old, still-broken scheme. Not graded ✅ or ❌ flat — see the breakdown. |
| AC-1263 | ✅ | `analyst`'s Arabic dictionary (`src/i18n/ar/analyst.ts`, 139 `an.*` keys) is in the global `i18n:check` pass (0 `defaultValue`, clean). Live: AGT-2's question, asked in Arabic, renders verbatim in Arabic (`لماذا انخفض عدد الاشتراكات الجديدة هذا الأسبوع؟`) while every chrome string around it ("Running", "Re-run", "Asked by") stays keyed English/Arabic per the shell's language, confirmed in both `analyst-en-running.png`/`analyst-ar-running.png`. |
| AC-1264 | ✅ | `analystView.test.tsx` — "Runner online · last seen …" and "Runner offline", both inside a `role="status"` element. `limitedUntil` (`AskComposer.tsx:66-74`, `JobTimeline.tsx`) is coded identically to the other two branches but has no dedicated live test this session — same pattern, not independently re-verified (see Coverage gaps). |
| AC-1265 | ✅, directly proven | This session's own real spawn: `claude -p --output-format stream-json --verbose --forward-subagent-text --permission-mode bypassPermissions --max-turns 60 --no-session-persistence "/analyst <question>"` from the repo root produced `docs/09-analytics-v2/studies/2026-09-16-did-completed-trips-grow-from-may-into-june-2026-and-is.md` with a paired tool log (`…-is.tool-log.jsonl`, 37 real `mcp__eyvar__*` calls). See the study report for the full citation check. |
| AC-1266 | ✅ | `api/v1/agent.test.ts`, fresh run this session, 5 tests under "AC-1266: a due schedule enqueues exactly once" — concurrent cron/runner callers enqueue exactly one job, a disabled schedule enqueues nothing, a weekly schedule re-fires the following week without duplicating within the same week, a finer-than-daily cron is refused at creation. Backend-only; not re-derived from first principles this session, the passing test is the evidence. |
| AC-1267 | ✅ | Frontend: `jobTimeline.test.tsx` + `jobScreen.test.tsx`'s `useOfflineRunner()` cases — a queued job states "The runner is offline. This will stay queued until it reconnects." instead of the ordinary waiting sentence, and never reads as `Failed`. Backend: `api/v1/agent.test.ts`'s "AC-1267" case, passing — a schedule enqueues independent of runner state; the job sits `queued`, never silently dropped. |
| AC-1268 H | ✅ | `scripts/harness/analyst.mjs`, this session, full run against the isolated dev server: 6 original checks (index/running/done × en/ar) plus 7 new state screenshots plus 2 completeness checks, **zero `ERRORS` lines logged**, `overflowX: 0` throughout. See "A flaky first run" below — the harness is correct; the first attempt hit a stray pre-existing dev server on the harness's default port. |
| AC-1269 | ✅ | This session's own citation check — see the study report. Every `RUN-n` cited in the study was independently looked up in the raw tool log and the quoted figure matches exactly (a representative superset of all 16 runs plus both `correlate` calls checked by hand, not sampled). `scripts/study-check.mjs` (the script AC-1269 names) does not exist — out of this work package's file set (not listed under "Your file set" for WP-7.7) — so this check was done by hand and is not yet automated. Flagged as a note, not a blocking gap, since the manual check is exhaustive for this one study. |

## F-V2-90 — still open, and now precisely located

The brief asked to check this by name. It is real, live, and traced to exact lines.

**What "Provenance" actually shows.** `JobScreen.tsx:142-170` builds the rail's `runs` list by
calling `collectReportIds(pageQuery.data.blocks)` — i.e. it walks the page's `report` blocks
(pinned charts) and, for each `reportId` found, fetches that **saved report**'s own `query`
and `lastRunAt` and displays those as if they were the run. `ProvenancePanel.tsx` then renders
`run.name`, a window string and an `asOf` — **it never renders a `runId` anywhere** (grepped
`ProvenancePanel.tsx` for `runId`/`RUN-`: zero occurrences).

**Why this misses almost everything the study cited.** `caseStudyToBlocks()`
(`src/data/reporting/agent/caseStudyToBlocks.ts:120-139`) only creates a `report` block for a
finding when an **externally supplied** `chartReportIds` map has an entry for that finding's
id (line 129-130) — and the seeded fixture (`src/data/fixtures/pages.ts:114`) supplies exactly
one: `caseStudyToBlocks(DONE_JOB_CASE_STUDY, DONE_JOB_ID, { F1: 'RPT-5' })`. The seeded case
study (`src/data/fixtures/agent.ts:34-115`) cites **three** runIds — `RUN-1` (baseline and F1),
`RUN-2` (F2's evidence and both contributors), `RUN-3` (an alternative's evidence) — and
Provenance shows **one** entry.

**Confirmed live**, `checkProvenanceCompleteness()` in `analyst.mjs` (AGT-1, against the
isolated server):
```
provenance-completeness {"citedRunIds":["RUN-1","RUN-2"],"provenanceEntries":1,"runIdsShownInProvenance":[]}
```
(`RUN-3` sits inside a closed `Toggle` block — `alternativeToggle()`'s `open: false` — so it
never reaches the page's visible text at all; the regex scan under-counts, the real gap is
worse than the 3-vs-1 the log line shows.) `provenanceEntries: 1` — RUN-2's contributors and
RUN-3's alternative are simply absent from the rail. `runIdsShownInProvenance: []` — **even the
one entry Provenance does show never displays "RUN-1" anywhere**, so an operator reading a
finding's evidence text ("… (run RUN-1)") has no way to visually confirm the Provenance
entry titled "الرياض · …" *is* that run.

**The fix already exists in the data layer and is simply not wired to this screen.**
`src/data/clients/runs.ts` defines a real recorded-run store: `ReportRun { id, query, result,
asOf, createdAt, jobId }` and `getRun(runId)`, whose own doc comment
(`runs.ts:84-90`) says it is "Read by `describeSeries` … **and by the job page's `Open in
builder` link per run**" — i.e. this was designed to be the Provenance source. `ReportRun`
even carries `jobId`, built for exactly this back-reference. `JobScreen.tsx` never imports or
calls `getRun`. (A second-order gap, not this screen's: the seeded fixture's `RUN-1`/`RUN-2`/
`RUN-3` are never written into `runs.ts`'s in-memory store either — `getRun('RUN-1')` would
404 today even if the screen called it — but that is a fixture-seeding gap, not a reason not
to wire the client function.)

**Backend integrity is not the gap.** `api/v1/agent.test.ts`'s "AC-1288: no number without a
run" suite (4 passing tests, this session) proves the *server* refuses a result citing an
unknown or mismatched `runId` and records every run under its job correctly. The break is
entirely in the frontend's Provenance panel choosing to derive from `report` blocks instead of
reading the study's own recorded runs.

**Severity: blocking.** AC-1258's own words are "listing every run" — the panel lists at most
one of however many a study actually cites, and even that one is not identifiable as the run
it stands for.

**Reproduce:** `npx vite --port 4329`, `HARNESS_BASE=http://localhost:4329 node
scripts/harness/analyst.mjs`, read the `provenance-completeness` log line; or open
`/management/reports/analyst/AGT-1` and compare the "Provenance" rail (one entry) against
`src/data/fixtures/agent.ts`'s `DONE_JOB_CASE_STUDY` (three distinct runIds cited across
`baseline`, `findings[1]`, `contributors`, `alternatives[0]`).

## Entry points — AC-1262, a live view of a moving target

`01-analyst-agent.md` §4 names five: builder overflow, page header, alert history row,
notification action, command palette. **This finding changed shape while this audit was
running** — see the timeline below; the table reflects the state at the end of this session,
each row saying which check it is from.

| Entry point | Exists | Prefills | As of |
|---|---|---|---|
| Builder overflow (`ReportBuilder.tsx`) | ✅ | ✅ — now calls `analystAskUrl({ kind: 'report', id: report.id, label: report.name })`; disabled with a stated reason (`rb.overflow.ask.needsSaved`, "Save the report first.") when there is no saved report yet, instead of silently navigating blank. | Re-checked after the live change (below). |
| Alert history "Explain" (`AlertHistoryDialog.tsx`, a new dedicated column) | ✅ | ✅ — same `analystAskUrl()` contract, confirmed live (below). | Re-checked after the live change. |
| Command palette (`src/commands/analyst.ts`) | ✅ | ❌ — unchanged; `run(ctx)` still only calls `ctx.host.navigate?.(ANALYST_VIEW_PATH)`, a bare `?view=analyst`. | Original check, still current (file untouched this session). |
| Alert feed row / old `firingId` link (`AlertFeedView.tsx:244`) | ✅ | ❌ — **left behind, not migrated.** Still builds `?view=analyst&firingId=${firing.id}` — a param name `entryContext.ts` never reads. `AlertHistoryDialog.tsx` appears to be the surface that got fixed; whether `AlertFeedView`'s own row is a second, still-broken instance of the same affordance, or dead code superseded by the dialog, was not established this session — flagging rather than guessing. | Original check, still current. |
| Page header ("Ask the analyst about this page") | ❌ | — | Original check, still current — `grep -rn "view=analyst" src/screens/pages src/components/pages` still empty. |
| Notification action ("Explain") | ❌ | — | Original check, still current — no notification-center affordance found. |

**The live change, in order:**

1. Early in this session, `git status` showed only `DataTable.tsx`/`ChartToolbar.tsx` dirty.
   The entry-point check at that point (`checkEntryPointPrefill()` in `analyst.mjs`, against
   `?view=analyst&firingId=AFR-1`) found **zero** chips and an empty question — recorded as a
   blocking finding.
2. Partway through writing this document, `git status` showed
   `src/screens/analyst/entryContext.ts` (new), plus `AnalystView.tsx`, `AskComposer.tsx`,
   `ReportBuilder.tsx`, `AlertHistoryDialog.tsx` modified — another agent's work package,
   per AGENT-BRIEF's expected concurrency on `src/screens/analyst/`.
3. Read the diffs rather than guessing: `entryContext.ts` defines a one-shot `askKind`/`askId`/
   `askLabel` URL contract; `AnalystView.tsx` now reads it once (a `useRef` guard against a
   second read after the strip), passes it to `AskComposer` as `initialAttachment`, and strips
   the params from the URL via a replace-navigate; `ReportBuilder.tsx` and
   `AlertHistoryDialog.tsx` now write it.
4. **Re-tested live**, the new contract, against the isolated `:4329` server (which picked up
   the change via Vite's own HMR — same server, not restarted):
   ```
   new-contract prefill check: {"chips":1,"chipText":"24 Jun 09:14","urlNow":"http://localhost:4329/management/reports?view=analyst"}
   ```
   One chip, the correct label, and the URL stripped back to `?view=analyst` — the one-shot
   contract works exactly as designed, for the two entry points now wired to it.
5. At the moment of this check, `npm run i18n:check` reported the generated inventory
   **stale** (`docs/08-i18n/KEYS.md`/`keys.json` need `npm run i18n:keys`) — expected, since
   `AlertHistoryDialog.tsx` now references `t('rb.alert.history.col.explain')`, a key not yet
   present in `copy.ts`/`ar/reports.ts` at the moment this was checked. This is the other
   agent's own work package mid-flight, not a defect in `entryContext.ts` or in anything WP-7.7
   owns — noted here only so nobody reading this document mistakes a stale `i18n:check` for a
   new problem; re-run it once that agent reports done.

**Severity, current state:** should-fix, down from blocking. Two of five named entry points
are wired and demonstrably work; one existing link (`AlertFeedView.tsx`) was left on the dead
scheme and should either be migrated to `entryContext.ts` or removed; two named entry points
(page header, notification) still do not exist at all. None of this is hidden from the
operator in a misleading way (the builder overflow item is now honestly disabled with a
reason when there is nothing to attach), which is the main thing that changed since the
original blocking read.

**Reproduce:** `HARNESS_BASE=http://localhost:4329 node scripts/harness/analyst.mjs` still
exercises the old `firingId=` link (documents the leftover); manually visit
`/management/reports?view=analyst&askKind=firing&askId=AFR-1&askLabel=Test` to see the working
new contract, or the report-builder overflow menu on a saved report to see it end to end.

## A flaky first run, and what it means

The first attempt at the extended harness (against `HARNESS_BASE` defaulting to `:4327`)
produced nonsense: `hasLog: false` on a job known to have events, `openInBuilder count: 0` on
a job known to have one, an empty `citedRunIds` list. `curl` showed **something already
answering on 4327** — a dev server this session did not start (another agent's, most likely,
per AGENT-BRIEF's expected concurrency), and my own `npx vite --port 4327` silently moved to
`4329` because the port was taken (`vite.log`: "Port 4327 is in use, trying another one …",
landed on 4329). Every result quoted above was re-taken against the isolated `:4329` instance,
which reproduced cleanly on request (`_debug-wp77.mjs`, a scratch script, deleted after use —
not part of this deliverable). **Lesson for the next session on this tree:** do not assume
`npx vite --port 4327` is *your* 4327; check what's actually listening before trusting a
harness run's numbers.

## Coverage gaps

- **`limitedUntil` (the third runner-status branch)** is coded identically to `online`/
  `offline` (`AskComposer.tsx:66-74`, `JobTimeline.tsx`, `RunnerStatusLine`) but has no
  dedicated test or live screenshot this session — only read, not independently exercised.
- **AC-1266's exactly-once arbitration** was proven by the backend suite only; the Schedules
  tab's own UI (`SchedulesPanel.tsx`) was read and typechecked but not driven live this
  session (its four states — content/empty/loading/error — were not screenshotted; see the
  visual doc).
- **The `Save as page` / `Re-run` actions' downstream effect** (does the saved page actually
  publish, does a re-run actually create a new job with the same inputs) was checked by
  passing unit tests (mocked client) only, not against a live dev-server round trip.
