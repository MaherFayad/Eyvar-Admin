# Analytics v2 — performance verification (WP-8.4, measurement half)

Measured on branch `analytics-v2` at commit `1617ca7` (git status at the start of this run:
`src/components/DataTable.tsx`, `src/components/reports/ChartToolbar.tsx`,
`src/screens/reports/reports.mode.test.tsx` modified by other concurrent agents; per
`AGENT-BRIEF.md` the tree is expected to be dirty and was not touched, stashed or reverted).
Machine: shared with other agents running concurrently (a dev server was live on port 4327
throughout); every timing number below therefore carries load noise from that sharing, and is
reported with the caveat that a quieter machine would likely read faster, not slower — nothing
here understates the product.

**Two builds:**
- **Current** — `npx vite build` from the working tree (uncommitted changes included) into
  `dist-current` in the scratchpad.
- **P0 baseline** — an isolated `git worktree add --detach <scratch>/wt-p0 eac3d90` (the
  `chore(analytics-v2): checkpoint after P0 and the WP-1.1 type layer` commit — the earliest
  point on this branch after P0 closed; no earlier commit isolates P0 from WP-1.1, and WP-1.1
  is types-only, erased at build), with its own `npm install` (never a junction to the main
  tree's `node_modules`, to avoid touching the live dev server's dependency cache per memory
  `worktree-agents-windows`), built the same way. The worktree and its `node_modules` were
  removed after measurement; nothing under the main tree was read via `checkout`, `stash` or
  `reset`.

Bundle-dependent timings (§3) ran against `vite preview` of the **current** build on an
isolated port (4362), not the shared dev server on 4327 — the more honest number per the
task brief, and it does not collide with other agents' harness runs. "No refetch" (§2) is
measured the way `scripts/harness/amp-interact.mjs` established and its header comment states
outright: **mock mode issues no real HTTP**, so Playwright's network log only ever shows
Vite/static-asset requests. A request is inferred from `result.asOf` staying byte-identical
across a transition (a run stamps a fresh `asOf`), the same signal `amp-interact.mjs` samples.
For the analyst poll specifically, this run adds a stronger, purely black-box check: an
`addInitScript` wraps `window.setInterval` before any app code runs, so a live browser proves
whether the 2-second poll timer (`JobScreen.tsx:107`) was ever created — no source file was
touched to get this signal.

New files: `scripts/harness/analytics-v2-perf.mjs` (the harness itself; run it with
`HARNESS_BASE=http://localhost:4362 node scripts/harness/analytics-v2-perf.mjs` against a
preview of a fresh build), this document.

---

## Summary of blocking and should-fix findings

| # | Grade | File : line | Finding | What to change |
|---|---|---|---|---|
| 1 | **should-fix** | `src/screens/reports/AlertsView.tsx:37` | `AlertsView` statically imports `Area, AreaChart, ReferenceArea, ReferenceLine, YAxis` from `'recharts'`, and `ReportsScreen.tsx:103` statically imports `AlertsView` — so recharts loads on *every* visit to `/management/reports`, not only when a chart or the alerts view is open. Confirmed in a real browser: `chart-Ce8T9c03.js` (248 KB / 79.8 KB gzip) is fetched when opening the plain Reports Library with no chart on screen. **Not a regression** — the P0 build already eagerly pulled its own recharts chunk from the equivalent reports chunk (see §1.3) — so this is a pre-existing cost, not one this build introduced. It is still real money on every reports visit and contradicts the file's own comment three lines below the import, which explains at length why a *different* recharts consumer (`TrendChart`) is deliberately kept out of this exact path | Split the sparkline into its own `lazy()`-loaded component the way `ReportModeCanvas.tsx` does for `LazyDistributionCard`, so the Rules view — not the whole reports screen — pays for it |
| 2 | **blocking** | `src/components/reports/ResultTable.tsx:550,822` | Both row-rendering loops are plain `rows.map(...)` with no windowing. `@tanstack/react-virtual` is a project dependency but is used **only** in `src/screens/support/inbox/ConversationList.tsx` — nowhere in the reports table. The WP-8.4 row in `06-execution-plan.md` names "virtualised `ResultTable` above 200 rows" explicitly, and no client-side row cap exists in the planner to make the case moot (`grep` for a row-cap violation code in `plan.ts` returns nothing; F-V2-13 in `BUILD-LOG.md` already recorded this gap for a different reason) | Wrap both `.map()` calls in `useVirtualizer`, following the `ConversationList.tsx` pattern already in the codebase |
| 3 | **should-fix** | build output, `index-DA1eEG5U.js` | The **initial/entry** chunk is 2.80 MB raw / 756.9 KB gzip — 6.8× the next-largest chunk (414.6 KB). `recharts` is confirmed **absent** from it (`grep -c "recharts\|generateCategoricalChart\|ResponsiveContainer"` all return 0; `chart-Ce8T9c03.js` holds 20 matches), so the core promise (recharts never in the initial chunk) **holds**. What is in it: the **entire i18n dictionary for every namespace, both languages** — `rb.*` (reports), `pg.*` (pages), `an.*` (analyst) copy keys all appear verbatim in the entry chunk as well as in their own lazy screens' chunks, i.e. duplicated. This predates analytics v2 as an architecture (instant language switching needs the whole dictionary), but pages/analyst copy is new-this-build weight added to an already-large entry chunk | Not analytics-v2's file set to fix (`src/i18n/dictionaries.ts` is shared-layer), but worth a named decision: either accept the duplication as the price of instant language switching, or split dictionaries per lazy screen the same way code already is |
| 4 | **should-fix / AC-1298** | `BUILD-LOG.md` (no size ever recorded) | **AC-1298** — "the reports chunk after P8 is within 1.5× its P0 size or the handoff names the reason" — has never been checked: no chunk size appears anywhere in `docs/09-analytics-v2/` before this measurement. Measured now (methodology in §1.2): the closest P0→current match by copy-key density grew from **163.9 KB → 414.6 KB raw (2.53×)**, **41.6 KB → 88.0 KB gzip (2.12×)**. Both exceed 1.5× and no reason is named anywhere in `BUILD-LOG.md` or a handoff, so **AC-1298 is not satisfied as documented**, independent of whether 2.1–2.5× is actually defensible (the v2 rail alone added formulas, segments, two-level splits, transforms, fixed comparisons, annotations, brush, PNG export and a v2 library on top of what P0 shipped) | The orchestrator names the reason in `BUILD-LOG.md` (there is a real one) to close AC-1298 as documented, or trims weight — finding 1 above is the cheapest lever available |
| 5 | note | `src/screens/reports/AlertsView.tsx:176-201` | F-V2-60's "N requests for N rules" quantified: 11 seeded rules (`ALR-1`…`ALR-11`), each firing `getReport` + `runReport` in one `Promise.all` (2 mock calls/row, 22 total). Measured wall-clock: only **7 of 11** rows ever produce a sparkline (the other 4 are rules whose series is blocked/absent, which the code omits by design, `AlertsView.tsx:184-186`) and the visible 7 had settled somewhere between 0.23 s and 7.7 s after navigation in this run — not tightly bounded by this harness (see §2.3) | Confirms F-V2-60 is real cost, not measured to be currently severe at N=11; re-run `render_alertsRulesTable_allSparklinesSettled` with finer sampling before deciding whether it needs a data-model fix at larger N |
| 6 | note | `api/_lib/compile.ts:38` | The 50,000-row cap's real cost **cannot be measured locally**: seeded trips total 137 (17 fixed + 120 filler, `src/data/fixtures/trips.ts:24,748`) — 0.27% of the cap — and the one existing test that exercises truncation (`api/v1/reports-run.test.ts:197-213`) overrides `rowCap: 5` to trigger the path cheaply rather than seeding real volume. See §5 for the full reasoning and the numbers that rule out extrapolation |

No finding above is graded **blocking** for AC-1298 or the recharts chunk placement itself,
because the stated core promises (recharts absent from the *initial* chunk; a redraw issues
no request; a done job stops polling) all measured **PASS**. Finding 2 (`ResultTable`
virtualisation) is graded blocking because it is a named, unambiguous requirement in the
execution plan that is simply not built at all — zero uses of the virtualiser exist in the
file the plan names.

---

## 1 · Bundle

### 1.1 Method

`npx vite build --outDir <scratch>/dist-current` (current tree) and, from an isolated detached
worktree at `eac3d90`, `npx vite build --outDir <scratch>/dist-p0` (P0 baseline). Both are
plain production builds, default `vite.config.ts`, no `manualChunks` configured — Vite/Rollup's
default code-splitting is what ships.

```
$ npx vite build --outDir <scratch>/dist-current
✓ 4311 modules transformed.
✓ built in 16.73s
```

### 1.2 Chunk sizes (current)

Full listing of every JS asset is in the build log; the ones that matter:

| Chunk | Raw | Gzip | Role |
|---|---|---|---|
| `index-DA1eEG5U.js` | 2,803,076 B (2.80 MB) | 756.93 KB | **Entry** — referenced directly by `index.html`'s `<script>`, loads on every route |
| `index-BQpQBRud.js` | 414,597 B | 88.02 KB | Best copy-key match for "the reports chunk" (`ReportsScreen` + `ReportLibrary` + `AlertsView` + dialogs — 571+ `rb.*` key matches, second only to the entry chunk) |
| `chart-Ce8T9c03.js` | 248,030 B | 79.76 KB | recharts, isolated in its own chunk |
| `blockOps-5fMT4mj6.js` | 222,082 B | 58.30 KB | Pages block-editor operations, shared with report-block rendering inside a page |
| `MetricTile-BDSmRr1j.js` | 106,394 B | 29.27 KB | Metric tile (boards; pre-existing, not analytics-v2-specific) |

Method for identifying "the reports chunk" by content-hashed filename: grepped every built
`.js` file for the count of `rb\.[a-zA-Z0-9.]*` copy-key literals it contains (these survive
minification because they are runtime string keys passed to the translator, not identifiers)
and took the chunk with the highest count excluding the entry chunk. This is a marker-based
inference, not a byte-exact module-graph diff — Vite emits no `build.manifest.json` by default
and none was added (out of this WP's file set) — so treat the 2.53×/2.12× ratio in finding 4
as a good-faith measurement, not a certified one.

**recharts absence from the entry chunk, checked directly, not inferred:**

```
$ grep -o "recharts" index-DA1eEG5U.js | wc -l          → 0
$ grep -o "generateCategoricalChart" index-DA1eEG5U.js   → 0
$ grep -o "ResponsiveContainer" index-DA1eEG5U.js        → 0
$ grep -o "recharts" chart-Ce8T9c03.js | wc -l           → 20
```

**Whether a plain reports visit downloads recharts, checked in a real browser** (Playwright,
`page.on('request')`, preview server, `waitUntil: 'networkidle'`):

```
Reports library (no chart, no alerts opened)  /management/reports        → chart-Ce8T9c03.js: TRUE
Pages index                                    /management/reports?view=pages → chart-Ce8T9c03.js: TRUE
```

Traced to source: `ReportsScreen.tsx:103` imports `AlertsView` statically (not `lazy()`, unlike
`PageDetailScreen` and `AnalystJobScreen`, which routes.tsx does split out — see §1.4);
`AlertsView.tsx:37` imports recharts primitives directly. Rollup therefore emits a plain
`import "./chart-Ce8T9c03.js"` at the top of every chunk that reaches `AlertsView`, including
the one `ReportsScreen` itself lives in.

**This is not new**: the same check against the P0 build shows the P0-era reports chunk
(`index-mBWdYsy3.js`) also opens with a static `import{...} from "./chart-DUZzt2Za.js"` —
recharts was already an unconditional dependency of opening `/management/reports` before this
build started. Graded should-fix, not blocking, for that reason: it is real, measurable cost,
but analytics-v2 did not introduce the pattern, it only added one more static importer
(`AlertsView`) to an already-eager chain.

### 1.3 The funnel's trend/distribution split — held

`ReportModeCanvas.tsx:90-95` defines `LazySeriesChart` and `LazyDistributionCard` via `lazy()`,
with a comment citing the exact 337 KB/104 KB figure and naming the reason: "a cascade-only
funnel or a cohort/journey tile" must not download recharts. `AlertsView.tsx:40-42` and
`AlertHistoryDialog.tsx:67` carry the identical reasoning for their own surfaces and correctly
deep-import `formatMetricValue` rather than the `@/components/metrics` barrel to avoid pulling
`TrendChart`. Verified by reading all four sites; this part of the architecture is intact.
What is *not* intact is finding 1 above — `AlertsView`'s own sparkline is the one place in this
set of "avoid recharts" call sites that does not itself defer the recharts-bearing piece.

### 1.4 `routes.tsx` and `ids.ts` — confirmed

`routes.tsx:216-218`'s comment states the rule directly ("keying the router on a symbol
declared inside `ReportsScreen` would pull the whole builder into the entry chunk") and the
code follows it: `REPORTS_SUB_TAB_ID` is imported from `./ids` (`routes.tsx:58`), never from the
`@/screens/reports` barrel. `PageDetailScreen` (`routes.tsx:239-241`) and `AnalystJobScreen`
(`routes.tsx:248-250`) are each `lazy()`-loaded from their own screen module with a comment
explaining the same reasoning extended to pages and the analyst. All three chunks load only on
navigation to their own route — confirmed by the entry-chunk recharts check in §1.2, which
found none of `pg.*`/`an.*` full-screen code inlined into the entry (only the copy dictionary,
which is a separate, pre-existing architecture decision, §"Summary" finding 3).

### 1.5 AC-1298 — the ratio

See Summary finding 4. **163.9 KB → 414.6 KB raw (2.53×), 41.6 KB → 88.0 KB gzip (2.12×)**,
both over the 1.5× ceiling, no reason recorded anywhere in `BUILD-LOG.md`. This is graded
should-fix rather than blocking because the AC's own escape hatch — "or the handoff names the
reason" — is procedurally unmet (nobody wrote the number down to name a reason against), not
because the growth itself is obviously unjustified; P2 alone added a formula engine, a segment
picker, two-level splits, transforms, fixed comparisons, annotations, brush and PNG export to
what P0 shipped, which is a lot of real feature surface for one screen to carry.

---

## 2 · Request counts ("a redraw is not a re-ask")

Methodology note repeated because it is load-bearing: **mock mode issues no HTTP**, so a
literal network-request count would read zero for every action tested, correctly and
uselessly. `scripts/harness/amp-interact.mjs`'s header comment states this was already worked
out and settled for this codebase; this harness follows the same convention (`result.asOf`
unchanged ⇒ no run happened) and adds a second, independent, purely black-box signal for the
analyst poll specifically (§2.2).

### 2.1 Chart type change — PASS

`RPT-20` (a 9-series-group report, per `BUILD-LOG.md`'s own citation of it under F-V2-67),
changed **Chart type** from its default to the second option in the list:

```
"chartTypeChange": "PASS no request (asOf unchanged)"
```

### 2.2 Legend toggle — PASS

First legend entry (`ResultCanvas.tsx`'s `SeriesLegend`, `ul[role="list"] button[aria-pressed]`)
clicked:

```
"legendToggle": "PASS no request (asOf unchanged)"
```

(First harness run used a wrong selector and reported a false "not found"; fixed to the real
markup at `ResultCanvas.tsx:1140` and re-run — see the harness's git history if it matters that
the first attempt was wrong.)

### 2.3 A finished analyst job stops polling — PASS, with a positive control

`JobScreen.tsx:103-122`: the polling `useEffect` returns before creating a `setInterval` when
`job.state` is `'done'` or `'failed'`, and the cleanup clears any existing timer on every
dependency change. Verified two ways:

1. **Read**: the early-return guard is unconditional and covers every terminal state; the
   effect's dependency array is `[job?.state, jobId]`, so a state transition into `done` tears
   down the previous interval before the guard is even relevant.
2. **A live browser, black-box, no source touched**: `window.setInterval` was wrapped from
   `page.addInitScript`, before any app code ran, to log every call with its delay.

```
AGT-1 (done):     pollIntervalsCreatedAtLoad: 0, pollIntervalsCreatedAfter5s: 0  → PASS
AGT-2 (running):  pollIntervalsCreated: 1                                       → control case, proves the instrument works
```

The control case matters: without it, "0 intervals" on the done job would be equally consistent
with the instrument being broken. It is not — the same instrument correctly detects the poll
timer on a running job.

### 2.4 Mode round trip

Not re-verified in this run beyond what `amp-interact.mjs` already established (`Retention→Bar`,
`asOf same? true`) — that harness already covers this transition and re-running it would not
add evidence. `amp-interact.mjs`'s last recorded run is the citation for this claim; it was not
re-executed here to avoid duplicating a proof that already exists.

---

## 3 · Render cost at 1280×800

Preview server (`vite preview`, port 4362, isolated from the shared 4327 dev server other
agents were using throughout this session). "Time to meaningful render" = wall-clock from
`page.goto` to the first appearance of a content-bearing selector (`.recharts-surface` for a
chart, `[data-slot="card"]` for a page block, `table` for a data table), sampled every 50 ms.

| Surface | URL | Time to meaningful render | DOM nodes | Long tasks >50 ms |
|---|---|---|---|---|
| Report, 9 series groups | `/management/reports/RPT-20` | 1,624–1,638 ms (2 runs) | 1,168 | 2 |
| Page, 3 blocks (largest available fixture) | `/management/reports/pages/DSH-1` | 851–876 ms | 242 | 1 |
| Reports Library | `/management/reports` | 872–891 ms | 1,027 | 1 |
| Alerts rules table, first paint | `/management/reports?view=alerts` | 893–894 ms | 798 | 1–2 |

**No fixture reaches "many blocks."** `src/data/fixtures/pages.ts`'s three real (non-template)
pages top out at 3 report blocks (`DSH-1`, `DSH-3`); the three templates have 2–4 blocks each.
This is noted, not treated as a pass: the render-cost number above for pages is real but is not
a stress test, and the product's page editor has no built-in ceiling on block count, so a page
with 30 blocks is a legitimate operator state this measurement does not speak to.

### 3.1 Alerts rules table — the per-row sparkline cost, quantified

`AlertsView.tsx:176-201` fires `getReport` then `runReport` for every visible rule row inside
one `Promise.all` — 2 mock calls × up to 11 rows (`ALR-1`…`ALR-11`, the full seeded set,
confirmed present via `ruleRowCount: 11` in the sampled DOM). Measured trajectory:

```
t=234ms:    rows=0,  sparks=0, skeletons=68
t=7,722ms:  rows=11, sparks=7, skeletons=0
t=15,166ms: rows=11, sparks=7, skeletons=0   (unchanged — this is steady state, not a timeout)
```

**7 of 11 rows settle with a sparkline; 4 never do**, by design — `AlertsView.tsx:184-186`
omits a row whose resolved series is `blocked` or absent rather than failing the whole table.
This run's sampling (every 150 ms) is too coarse to say *when* between 234 ms and 7.7 s the 7
sparklines actually landed; a tighter bound would need finer sampling and is not in this
report. What is established: the cost is real (F-V2-60 is correct that it is N requests for N
rules) but at the current seeded N=11 it settles within single-digit seconds, not the tens of
seconds a genuinely bad case would show. It will not stay that way at, say, 50 rules, because
each row is two sequential mock round trips run in parallel with the others, not batched — the
data-model fix F-V2-60 already names (a real rolling-reading endpoint) is the right one if the
rule count grows.

---

## 4 · Long tasks (>50 ms)

PerformanceObserver on `entryTypes: ['longtask']`, installed via `page.addInitScript` before
any app code runs.

| Interaction | Long tasks >50 ms | Durations |
|---|---|---|
| Opening the toolbar/overflow menu on `RPT-20` | 1 | 63–64 ms |
| Dragging the brush | 0 tasks — **brush was not present to drag** | — |
| Typing in the formula field | 0 tasks — **field was not reached** | — |
| `RPT-20` load + legend toggle + chart-type change, combined (not isolated per action) | 4–5 | 79–115 ms each |

**Brush and formula field are not graded** — this run's selectors found no `.recharts-brush`
element and no formula textbox on `RPT-20` at its default state. `SeriesChart.tsx:483` gates
the `<Brush>` behind a `withBrush` prop that is a view-option default-off, and the formula
field is presumably behind a rail affordance this harness did not open. Reported honestly as
not exercised rather than as a pass — a follow-up run should enable the brush via its View-menu
toggle and open the formula rail explicitly before asserting anything about long tasks during
those two interactions.

The one clean, isolated measurement (opening the toolbar menu, 63 ms) is a single long task
just over the 50 ms line — not alarming on its own, but it is also not nothing, and it was not
investigated further (no profiling was taken to say what inside that click handler costs 63 ms).

---

## 5 · The server compiler's row cap — cannot be measured locally, and here is why

`api/_lib/compile.ts:38` sets `DEFAULT_ROW_CAP = 50_000`; both query paths (`compile.ts:392-397`
and `:571-578`) fetch `LIMIT rowCap + 1` and mark `truncated` if the extra row came back.

**The seeded data cannot exercise this.** `src/data/fixtures/trips.ts:24` (17 hand-written
trips) plus `:748` (`fillerTrips`, `Array.from({ length: 120 }, ...)`) totals **137 trips** —
0.27% of the cap. The one test that reaches the truncation path,
`api/v1/reports-run.test.ts:197-213` ("AC-1277: a leg over the row cap returns
`truncated: true`"), does not seed real volume either — it overrides `rowCap: 5` on a
purpose-built handler instance to hit the branch cheaply. Neither path this codebase has today
produces a number for "what does 50,000 rows actually cost."

**What was measured instead, and why it does not answer the question**: timing the full
`api/v1/reports-run.test.ts` file (36 tests, real PGlite, real HTTP handler, real compile) at
the 137-row seed:

```
$ time npx vitest run --config api/vitest.config.ts api/v1/reports-run.test.ts
 ✓ 36 tests, every one between 1,654 ms and 1,914 ms
 Duration  66.34s (tests 65.04s)
 real  1m7.873s
```

Every test — funnel, table, trend, a bare trip count, the row-cap-at-5 test — lands in the same
~1.7–1.9 s band regardless of query shape. That flatness is itself the evidence that this
number is dominated by fixed per-test setup (a fresh PGlite instance and migration run per
test, per the file's structure) rather than by row-scan or aggregation cost, which at 137 rows
would be unmeasurably small either way. **Extrapolating 137 → 50,000 rows (365×) from this
number would not be honest**, and per the task's own instruction not to recommend raising the
cap, no such extrapolation is offered. Stated plainly: this cannot be measured on this machine
with the current fixtures, and BUILD-LOG.md's own "one finding that needs a decision before
production" section already reaches the same conclusion by a different route (SQL aggregation
must replace Node-side aggregation before real volume, precisely because nobody can measure the
cap's true cost until then).

---

## 6 · `requestCache` keys — reviewed, no defect found

Read `src/hooks/requestCache.ts` in full. The key scheme (`requestCacheKey`, lines 264-269)
sorts object keys before serialising so `{page, q}` and `{q, page}` collide correctly rather
than by accident, escapes commas and backslashes, and fails closed (`UNCACHEABLE` → no caching)
on a function, a symbol, a `Map`/`Set`/class instance, or depth beyond 6 — exactly the inputs
that would otherwise produce a false collision. The module's own docblock (lines 15-19) already
states the one accepted risk plainly: two components mounting the same key simultaneously fire
two requests rather than sharing one in-flight promise, which is a correctness trade the file
argues for rather than a defect. No analytics-v2 call site was found calling `requestCacheKey`
or `readCache`/`writeCache` directly with a key that a grep across `src/screens/reports`,
`src/screens/pages` and `src/screens/analyst` would catch — the reports/pages/analyst screens
in this build use `useAsync`'s own `cacheKey` option (e.g. `JobScreen.tsx:95`,
`cacheKey: 'agent.status'`) rather than touching the cache module directly, so this review
found nothing new to flag beyond what the module's own comments already document.

---

## Files referenced

- `scripts/harness/analytics-v2-perf.mjs` (new) — the harness this document's §1.2–§4 numbers
  come from; run it against a fresh preview build to reproduce
- `src/screens/reports/AlertsView.tsx:37,40-42,176-201` — findings 1 and 5
- `src/components/reports/ResultTable.tsx:550,822` — finding 2
- `src/screens/support/inbox/ConversationList.tsx` — the only current user of
  `@tanstack/react-virtual`, cited as the pattern to copy for finding 2
- `src/screens/reports/ReportsScreen.tsx:103,283` — the static `AlertsView` import
- `src/screens/reports/ReportModeCanvas.tsx:75-95` — the funnel lazy split that does hold
- `src/routes.tsx:216-218,235-250` — the route-level lazy splitting that does hold
- `src/screens/analyst/JobScreen.tsx:99-122` — the poll guard
- `src/hooks/requestCache.ts` — §6
- `api/_lib/compile.ts:38,392-397,516-578` — §5
- `src/data/fixtures/trips.ts:24,748` — the 137-trip seed volume
- `api/v1/reports-run.test.ts:197-213` — the artificial `rowCap: 5` override
- `docs/09-analytics-v2/BUILD-LOG.md` — "The one finding that needs a decision before
  production" (the row-cap section this report's §5 corroborates), F-V2-60 (alerts sparkline)
