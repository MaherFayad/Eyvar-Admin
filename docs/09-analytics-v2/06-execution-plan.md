# 06 — Execution plan: phases, work packages, gates

> This is the file an implementing agent is pointed at. It assumes `CLAUDE.md` is loaded and
> that the agent has read the one plan file its work package names. Nothing here is optional
> unless marked so.

## 1. The rules for every work package

**Before you start**

1. Read `CLAUDE.md`, this file's §1 and §4, your WP's row in §3, and only the plan files your
   WP names under `Reads`. Do not read `DESIGN.md` whole.
2. Run `git status`. If the tree is dirty with files you did not touch, stop and report it.
   One writer per tree. If you are in a worktree, confirm `git worktree list` shows it and
   that `node_modules` is a junction (`docs`: memory `worktree-agents-windows`).
3. Run `npm run typecheck` and `npm run test:changed` on the clean tree. If either fails before
   you change anything, stop and report the failure with its output; do not fix it inside your
   WP.
4. Create the branch named in your WP. One WP, one branch.

**While you work**

5. Touch only the paths your WP's `Creates` and `Modifies` list. `node scripts/wp-gate.mjs
   WP-nn` (§4.1) fails on anything else. If you need another file, stop and say which and why;
   the orchestrator amends the manifest or hands the change to the file's owner agent.
6. Every new client function has the endpoint docblock (`docs/ref/api.md` §"Annotating"),
   every new operation id is in `registerOperations`, every new string is a key in the owning
   `copy.ts` with the Arabic entry in the same commit, every new colour or size is a token.
7. Build the four states in code order: content, empty, loading, error. A screen or block that
   lacks one is not done.
8. Tests are named after the AC they prove and assert by role, label and text. A defect you
   cannot fix in your WP gets an `it.fails` named `DEFECT …` and a line in the handoff.
9. Fix every edit-gate finding before the next edit. The gate reports; it does not block; that
   is not permission to move on.
10. No `TODO`. A deferral is one sentence in the handoff naming the owner.

**Before you report done**

11. `npm run typecheck` · `npm run test:changed` · `npm run i18n:check` · `npm run api:check` ·
    `node scripts/wp-gate.mjs WP-nn`. All exit 0. Paste the tail of each into the handoff.
12. If the WP touched `DataTable`, `src/lib`, `src/hooks` or `src/data/clients`: `npm test`
    (full). Paste the summary line.
13. If anything is drawn: start `npx vite --port 4327` (or the preview on 4362 when another
    server is up), run the harness named in the WP, and name the screenshot files in the
    handoff. A green suite is not evidence for a chart.
14. Write the handoff to the path in the WP (`docs/09-analytics-v2/handoffs/WP-nn.md`): what
    changed (files), what was verified (commands and outputs, screenshots), what was deferred
    and to whom, and the ACs proven with the test names. Then `SendMessage` the next role the WP
    names. Never message `main` with status.
15. Commit with the message prefix in the WP. Do not push unless the WP says so.

## 2. Phases, order and parallelism

```
P0 foundation ───► P1 query model v2 ───► P2 charts & controls ───► P3 funnel/retention/table ─┐
                              │                                                                  ├─► P8 hardening
                              ├─────────► P4 pages (worktree, after P1 WP-1.1/1.7/1.8)           │
                              ├─────────► P5 alerting client (worktree, after P1 WP-1.6/1.7/1.8) │
                              └─────────► P6 backend (worktree, after P1 freezes types) ─► P7 analyst
```

- P0 and P1 run on `main`'s working tree, sequentially: they change shared types and the seam.
- P2, P4, P5 and P6 run in **four worktrees** under `.claude/worktrees/` once P1 is merged.
  Recipe: memory `worktree-agents-windows` (junction `node_modules`, never force-remove with the
  junction present, run vitest with `--root` from the main tree, do not start a dev server from
  a worktree; build and preview instead).
- Merge order into `main`: P2 → P5 → P4 → P3 → P6 → P7 → P8. The orchestrator merges; an agent
  never merges its own branch. Conflicts in `src/data/clients/index.ts`, `src/i18n/dictionaries.ts`,
  `src/i18n/ar/index.ts`, `src/routes.tsx` and `src/data/fixtures/routeTable.ts` are expected and
  are resolved by keeping both sides in declaration order.
- P7 depends on P6 WP-6.7 for http mode but starts against the mock (WP-7.1) as soon as P1 is
  merged.

Each phase closes with the phase gate in §5. A phase that has not closed does not start its
dependants.

## 3. Work packages

Template per row: **Owner** (agent type) · **Branch** · **Reads** · **Creates** · **Modifies** ·
**Must not touch** · **Steps** · **Proof** (tests, harness, ACs) · **Handoff to**. Commit
prefix is `feat(analytics-v2/WP-nn):`, `fix(...)`, `docs(...)`, `test(...)`.

### P0 — Foundation

| WP | What |
|---|---|
| **WP-0.1** Decisions | **Owner** product-owner with the business owner. **Reads** 00-README §"Decisions". **Modifies** `docs/05-restructure/DECISIONS.md` (append D38 … D46 with dates as signed), `docs/RULINGS.md` (one row each; D40 extends the "Standing owner overrides" list with `--chart-s7/s8`). **Steps** present each decision with its cost; record the owner's answer verbatim; where an answer changes this plan, edit the plan file in the same commit and note the change at the top of `00-README`. **Proof** the rows exist and `grep -c "D4[0-6]" docs/RULINGS.md` is 7. **Handoff** orchestrator |
| **WP-0.2** WP gate | **Owner** utilities-engineer. **Creates** `scripts/wp-gate.mjs`, `docs/09-analytics-v2/wp/WP-*.json` (one manifest per WP below: `{ "id", "branch", "allow": [globs], "deny": [globs] }`), `docs/09-analytics-v2/handoffs/.gitkeep`. **Steps** the script reads the manifest, lists `git diff --name-only HEAD` ∪ untracked, fails (exit 1, names the files) on any path outside `allow` or inside `deny`; always allows `docs/09-analytics-v2/handoffs/**` and the WP's own test files. Add `"wp:gate": "node scripts/wp-gate.mjs"` to `package.json`. **Proof** a unit test with a fixture manifest and a fake file list (`scripts/wp-gate.test.mjs`, run by `node --test`). **Handoff** orchestrator |
| **WP-0.3** Tokens | **Owner** design-token-steward. **Modifies** `src/styles/globals.css`, `docs/ref/tokens.md`. **Creates** nothing. **Steps** mint `--chart-s7`, `--chart-s8`, `--chart-fill-s7`, `--chart-fill-s8` (light and dark; AA against both pinned page values; distinguishable from s1–s6 at 1 px); `--ev-block-h-s/m/l/xl` = 375/500/625/750 px; `--ev-heat-1…4` (four opacity steps of `--chart-fill-s1`); expose each as a Tailwind utility per the file's existing pattern. Record the D40 extension comment at the palette's site. **Proof** `scripts/harness/dark-contrast.mjs` extended with the new pairs, exit 0; `npm run typecheck`. **Handoff** frontend-engineer (P2), product-designer |
| **WP-0.4** Copy skeletons | **Owner** i18n-arabic-engineer. **Creates** `src/screens/pages/copy.ts` (`PAGES_EN`), `src/i18n/ar/pages.ts` (`PAGES_AR`), `src/screens/analyst/copy.ts` (`ANALYST_EN`), `src/i18n/ar/analyst.ts` (`ANALYST_AR`), each with the namespace's first keys (`pg.page.title`, `an.view.title`, the state names). **Modifies** `src/i18n/dictionaries.ts`, `src/i18n/ar/index.ts` (spread in order, after `reports`). **Steps** follow `src/screens/reports/copy.ts` and `src/i18n/ar/reports.ts` conventions verbatim; run `npm run i18n:keys`. **Proof** `npm run i18n:check` exit 0; `docs/08-i18n/KEYS.md` lists both. **Handoff** frontend-engineer |
| **WP-0.5** Design notes | **Owner** product-designer. **Creates** `docs/05-restructure/design/22-analytics-v2.md`: the shape of every new control named in 02 §2–§4, 03 §5, 04 §4 (rail fields, legend buttons, block frame, add-block picker, columns width control, rule composer, analyst composer and job page), each mapped to a `docs/ref/patterns.md` row or a minted one, with copy for every reason sentence written with content-designer. **Reads** 02, 03, 04, 01 §4. **Proof** every control in the plan has a section; every sentence is under the X18 budget. **Handoff** frontend-engineer, i18n-arabic-engineer |

### P1 — Query model v2 (data layer; main tree; sequential)

| WP | What |
|---|---|
| **WP-1.1** Types | **Owner** mock-data-engineer. **Reads** 02 §2, 03 §2, 04 §2. **Modifies** `src/data/types/report.ts` (v2 fields with defaults; `groupBy: DimensionKey[]`; `PeriodComparison` union; `ChartType` union; `normaliseReportQuery` fills defaults and migrates `groupBy` string, `conversionWindowDays`, `returnMeasureKey`), `src/data/types/measure.ts` (`bucketAggregateOptions`, `supportsPerformed`, `funnelCapabilities`), `src/data/types/navigation.ts` (`DetailRoute.kind` gains `'page'`, `'analyst-job'`). **Creates** `src/data/types/alert.ts` (moved from `report.ts`, re-exported from it for one phase), `src/data/types/page.ts`, `src/data/types/segment.ts`, `src/data/types/annotation.ts`, `src/data/types/agent.ts`. **Must not touch** `src/components/**`, `src/screens/**`. **Proof** `npm run typecheck`; `report.ts` equivalence tests extended (AC-1100). **Handoff** WP-1.2 |
| **WP-1.2** Formula | **Owner** utilities-engineer. **Creates** `src/data/reporting/formula.ts` (+ `.test.ts`): `parseFormula`, `evaluateFormula(series, expr)`, `formulaUnit`. **Steps** grammar and unit rules from 02 §2.2 exactly; error positions; 60 test cases including every refusal. **Proof** tests; AC-1104 … AC-1107. **Handoff** WP-1.4 |
| **WP-1.3** Buckets and transforms | **Owner** utilities-engineer. **Modifies** `src/data/reporting/buckets.ts` (`quarter`; presets `this-quarter`, `last-quarter`, `this-year`, `year-to-date`; `comparisonWindow` for `previous-quarter` and `fixed`). **Creates** `src/data/reporting/transforms.ts` (+ test): cumulative, rolling average, percent of total, comparison display (`difference`, `percent-change`). **Proof** tests incl. Riyadh boundaries and partial-bucket exclusion; AC-1108 … AC-1112. **Handoff** WP-1.4 |
| **WP-1.4** Planner | **Owner** mock-data-engineer. **Modifies** `src/data/reporting/plan.ts` (+ tests): new violation codes (02 §2), series ceiling, chart legality v2 (02 §3), `NEAREST` v2, funnel/cohort/table v2 legality, `illegal-aggregate`, `segment-performed-unsupported`, `comparison-length`. **Proof** one test per violation code and per legality row; AC-1113 … AC-1120. **Handoff** WP-1.5 |
| **WP-1.5** Serialiser | **Owner** mock-data-engineer. **Modifies** `src/data/reporting/serialise.ts` (+ tests): `v: 2`, new keys, defaults omitted, v1 decoding. **Creates** `src/data/reporting/serialise.v1.fixtures.ts` (20 real v1 URLs captured from the current fixtures' saved reports). **Proof** round-trip for every v2 field; every v1 fixture decodes to the same query the v1 code produced (AC-1101, AC-1102). **Handoff** WP-1.6 |
| **WP-1.6** Resolver, stats, anomaly, machine | **Owner** mock-data-engineer with utilities-engineer for `stats.ts`. **Modifies** `src/data/mock/resolveReport.ts` → split into `src/data/reporting/resolve/core.ts` (pure: rows → result, all v2 features) and `src/data/mock/resolveReport.ts` (fixture rows adapter). **Creates** `src/data/reporting/stats.ts` (describe, correlate, contribution), `src/data/reporting/anomaly.ts`, `src/data/reporting/alerts/evaluate.ts`, `src/data/reporting/alerts/machine.ts` (moved from `clients/alerts.ts`), `src/data/reporting/pages/validate.ts`, `src/data/reporting/pages/migrate.ts`, `src/data/reporting/agent/caseStudyToBlocks.ts`, each with tests. **Must not touch** `src/components/**`. **Proof** every existing `reports.test.ts` and `plan.mode.test.ts` case still passes unchanged; new tests per module; AC-1121 … AC-1129, AC-1220 … AC-1224 (machine), AC-1180 (migration). **Handoff** WP-1.7 |
| **WP-1.7** Clients | **Owner** mock-data-engineer, docblocks reviewed by api-contract-steward. **Creates** `src/data/clients/segments.ts`, `annotations.ts`, `pages.ts`, `agent.ts`, `runs.ts`. **Modifies** `reports.ts` (tags, star, duplicate, versions, `sample`, `contribution`, `describe`), `alerts.ts` (v2 rule shape, `firings`, `acknowledge`, `mute`, `configHistory`), `dashboards.ts` (deleted; `pages.ts` replaces; `resetDataLayer` updated), `src/data/clients/index.ts`, `http.ts` (`Idempotency-Key` header on non-GET). **Steps** every function: docblock, operation id, `mock()` branch, http branch; `npm run api:contract`. **Proof** `npm run api:check` exit 0 with zero problems; `seam.test.ts` green; full `npm test`. **Handoff** WP-1.8 |
| **WP-1.8** Fixtures | **Owner** mock-data-engineer. **Creates/modifies** `src/data/fixtures/reports.ts` (v2 saved reports incl. a formula, a segmented, a two-level split, a fixed comparison), `segments.ts`, `annotations.ts` (six across the coverage window), `pages.ts` (the three dashboards migrated by `dashboardToPage` at load, plus three templates, plus one draft case-study page), `alerts.ts` (one rule per condition kind; one `no-baseline`; one with a failed Slack delivery; one muted; one acknowledged firing), `agent.ts` (one `done` job with events and a result page, one `running`, one `deferred`, one `failed:evidence`; a runner row), `routeTable.ts` (view `analyst`, view alias `dashboards → pages`, detail routes `page`, `analyst-job`). **Proof** `resetDataLayer()` resets all; every state in 02 §10, 03 §8, 04 §7, 01 §10 is reachable by a named fixture or `?mockFail=`; tests list them (AC-1290). **Handoff** P2, P4, P5 leads; api-contract-steward regenerates `docs/07-api/` |

**P1 gate**: `npm test` full green; `api:check` and `i18n:check` exit 0; `docs/07-api/ENDPOINTS.md`
regenerated and committed; a handoff per WP.

### P2 — Charts and controls (worktree `analytics-v2/charts`)

| WP | What |
|---|---|
| **WP-2.1** Chart branches | **Owner** frontend-engineer. **Reads** 02 §3–§4.1, memory `reports-browser-verification`. **Modifies** `src/components/reports/SeriesChart.tsx`, `ResultCanvas.tsx`, `rollup.ts`. **Creates** `src/components/reports/KpiCard.tsx`. **Must not touch** `PanelChart.tsx` (`INERT` canonical site) except to import; `src/components/ui/chart.tsx` unless a prop is missing, and then say so. **Steps** add `area`, `stacked-bar`, `stacked-100`, `horizontal-bar` branches with `INERT` on every mark; comparison outline for stacks; KPI via `MetricTile` adapter. **Proof** `scripts/harness/reports-v2.mjs` (WP-2.9) captures each type in both themes and languages and asserts a click on a mark fires; component tests for legality-coerced rendering; AC-1130 … AC-1137 |
| **WP-2.2** Legend and tooltip | **Owner** frontend-engineer. **Modifies** `ResultCanvas.tsx` (legend → buttons), `SeriesChart.tsx` (tooltip v2, keyboard bucket navigation). **Creates** `src/components/reports/useChartView.ts` (the `ChartView` state through `src/lib/persistence.ts`). **Proof** tests: toggling hides, isolate, struck-through entry, tooltip omits hidden, no request issued (`mockFailures.once` instrument); harness: keyboard walk; AC-1138 … AC-1143 |
| **WP-2.3** Axis and view options | **Owner** frontend-engineer. **Modifies** `ChartToolbar.tsx` (a `View` menu), `SeriesChart.tsx` (log, start-at-zero, data labels, label density). **Proof** log disabled with reason on a series with 0; density rule measured in harness at 1280 and 1440; AC-1144 … AC-1147 |
| **WP-2.4** Annotations | **Owner** frontend-engineer. **Creates** `src/components/reports/AnnotationMarks.tsx`, `AnnotationForm.tsx`. **Modifies** `SeriesChart.tsx`, `ChartToolbar.tsx`, `src/screens/reports/copy.ts`, `src/i18n/ar/reports.ts`. **Proof** markers drawn for annotations in range only; hover and focus show note; add form inline; permission-gated; harness; AC-1148 … AC-1150 |
| **WP-2.5** Brush | **Owner** frontend-engineer. **Modifies** `SeriesChart.tsx`. **Proof** harness: drag narrows the domain, reset chip, a mark click still fires after the brush is mounted (the `INERT` exception is proven, not assumed); keyboard `[` `]`; AC-1151, AC-1152 |
| **WP-2.6** Rail v2 | **Owner** frontend-engineer, copy from WP-0.5. **Modifies** `QueryPanel.tsx`, `LegalityOptions.tsx`, `WindowControl.tsx` (presets, fixed comparison). **Creates** `src/components/reports/FormulaField.tsx`, `SegmentPicker.tsx`, `TransformControls.tsx`. **Proof** every violation renders its reason in place; series-ceiling state names the control to remove; formula errors show position; `askedOf` unchanged for view-only edits; AC-1103, AC-1153 … AC-1158 |
| **WP-2.7** Toolbar v2 and export | **Owner** frontend-engineer. **Modifies** `ChartToolbar.tsx` (viz entries, `View` menu, bell, pin, ask), `src/screens/reports/ReportBuilder.tsx` (overflow: duplicate, pin, alert, ask, versions; PNG export), `csv.ts` → `export.ts`. **Creates** `src/lib/chartPng.ts` (+ test for the caption band and tEXt chunk). **Proof** PNG dimensions and caption in harness; audit call asserted; AC-1159 … AC-1162 |
| **WP-2.8** Library v2 | **Owner** frontend-engineer. **Modifies** `ReportLibrary.tsx`, `SaveReportDialog.tsx` (tags), `copy.ts`. **Proof** views, star, official badge (neutral tone), duplicate, versions restore loads the draft without saving; AC-1163 … AC-1166 |
| **WP-2.9** Proof | **Owner** visual-qa-engineer and accessibility-auditor in parallel, qa-engineer for the ACs. **Creates** `scripts/harness/reports-v2.mjs`, `docs/02-verification/analytics-v2-charts-visual.md`, `-a11y.md`, `-qa.md`. **Proof** the three documents grade every finding blocking / should-fix / note; zero blocking before the phase gate |

### P3 — Funnel, retention, data table (after P2 merge, main tree)

| WP | What |
|---|---|
| **WP-3.1** Funnel v2 | **Owner** frontend-engineer. **Modifies** `ReportModePanel.tsx`, `ReportModeCanvas.tsx`, `src/data/mock/resolveReport.ts` (funnel `unordered`, `conversion-over-time`, `time-to-convert`). **Proof** server-only options disabled with reason in mock; step click opens the drop-off table; AC-1167 … AC-1170 |
| **WP-3.2** Retention v2 | **Owner** frontend-engineer with utilities-engineer for `cohorts.ts`. **Modifies** `src/data/reporting/cohorts.ts` (grain-generic, methods, brackets), `ReportModeCanvas.tsx` (heat tokens, curve view). **Proof** matrix cells beyond elapsed are `null`; curve folds at 8; AC-1171 … AC-1173 |
| **WP-3.3** Data table v2 | **Owner** frontend-engineer with table-density-engineer reviewing `ResultTable.tsx`. **Modifies** `ResultTable.tsx` (columns mode), `ReportModePanel.tsx` (table spec rail). **Proof** per-column blocked state, totals rule, bands in R7 tones only, horizontal scroll inside the container; harness `table-density.mjs` extended; AC-1174 … AC-1178 |
| **WP-3.4** Proof | as WP-2.9, documents suffixed `-modes` |

### P4 — Pages (worktree `analytics-v2/pages`)

| WP | What |
|---|---|
| **WP-4.1** Markdown | **Owner** utilities-engineer. **Creates** `src/lib/markdown/{parse,render,index}.ts` + tests incl. the XSS corpus and the size cap. **Must not touch** anything under `src/components`. **Proof** AC-1181 … AC-1184 |
| **WP-4.2** Renderer | **Owner** frontend-engineer. **Creates** `src/components/pages/*` (03 §3), `src/screens/pages/PageScreen.tsx`. **Modifies** `DashboardTile.tsx` → `useResolvedReport.ts` (hook extracted; the tile component deleted), `src/routes.tsx`, `src/data/fixtures/routeTable.ts` (redirect alias). **Proof** each block type has a test; five states of a report block unchanged (the existing `dashboard.*` tests are moved and renamed, not deleted); AC-1185 … AC-1194 |
| **WP-4.3** Editor | **Owner** frontend-engineer. **Creates** `src/components/pages/edit/*` (BlockFrame, AddBlock picker, block menu, text editing bar), `src/screens/pages/useAutosave.ts`. **Modifies** `src/commands/undo.ts` (register page undo), `src/components/ui/*` only if a primitive is missing (say so). **Proof** keyboard-only session in the a11y audit: add, move, duplicate, delete, undo; autosave indicator; 409 conflict keeps local edits; AC-1195 … AC-1206 |
| **WP-4.4** Columns | **Owner** frontend-engineer. **Modifies** `src/components/pages/ColumnsBlock.tsx`, edit menu. **Proof** width map has no arbitrary values (`token-audit`); stacking below `wide:` in harness; AC-1207 … AC-1209 |
| **WP-4.5** Index, templates, routes | **Owner** frontend-engineer. **Modifies** `src/screens/reports/DashboardsView.tsx` → `PagesView.tsx`, `views.ts` (`pages`, alias), `ReportsScreen.tsx`, `ReportBuilder.tsx` (`?pinTo=`, `Save and pin`). **Proof** `/management/reports/dashboards/:id` redirects; templates create drafts; `Publish` only for the owner; AC-1210 … AC-1215 |
| **WP-4.6** Drag (optional) | **Owner** frontend-engineer. **Modifies** `BlockFrame.tsx`, `AddBlock` drop target. **Proof** keyboard path tests unchanged and still the ones cited by the ACs; pointer drag in harness only; AC-1216. Dropped without consequence if P4 runs late |
| **WP-4.7** Print | **Owner** frontend-engineer. **Modifies** `src/styles/globals.css` **only through design-token-steward** (a `@media print` layer); `PageView`. **Proof** harness `page.pdf()` capture at A4 shows one column and the `asOf` lines; AC-1217 |
| **WP-4.8** Proof | as WP-2.9, documents suffixed `-pages`; harness `scripts/harness/pages.mjs` |

### P5 — Alerting client (worktree `analytics-v2/alerts`)

| WP | What |
|---|---|
| **WP-5.1** Composer and conditions | **Owner** frontend-engineer. **Modifies** `AlertRuleDialog.tsx` (inline panel; condition kinds; preview chart via `evaluate()` over a sliding window; cadence enabled with the two values; channels; labels). **Creates** `src/components/reports/AlertPreviewChart.tsx`. **Proof** preview marks where the rule would have fired on the seeded series; `critical` disabled with reason; email picker filtered by permission; AC-1225 … AC-1231 |
| **WP-5.2** Rules table v2 | **Owner** frontend-engineer. **Modifies** `AlertsView.tsx` (condition summary, sparkline with threshold or band, cadence, channels, labels, mute menu, lag state). **Proof** AC-1232 … AC-1235 |
| **WP-5.3** Firings feed | **Owner** frontend-engineer. **Creates** `src/screens/reports/AlertFeedView.tsx`. **Modifies** `AlertsView.tsx` (tabs). **Proof** ledger mode, acknowledge, deliveries with errors in `title`, `Explain` opens the composer with the firing attached; AC-1236 … AC-1238 |
| **WP-5.4** History and changes | **Owner** frontend-engineer. **Modifies** `AlertHistoryDialog.tsx` (band and deliveries; `Changes` tab). **Proof** AC-1239 |
| **WP-5.5** From a chart | **Owner** frontend-engineer. **Modifies** `ChartToolbar.tsx` (bell wiring), `ReportBuilder.tsx` (`Save to alert`), `src/components/pages/edit/blockMenu.tsx` (`Create alert…`). **Proof** an unsaved report is saved first with a required name inline; AC-1161 and the composer prefill assertion of AC-1225 |
| **WP-5.6** Digest preference | **Owner** frontend-engineer. **Modifies** the operator's own profile (`src/components/profile/operator/`, a new `Notifications` section card), `src/data/clients/preferences.ts` (a new `alertDigest: boolean`, default false, with its docblock). **Proof** off by default, persisted through `preferences.save`, tested in the preferences client's existing pattern; no numbered AC |
| **WP-5.7** Proof | as WP-2.9, suffixed `-alerts`; harness `scripts/harness/alerts-v2.mjs` |

### P6 — Backend (worktree `analytics-v2/backend`; a backend engineer, or the `general-purpose` agent with 05-backend.md)

| WP | What |
|---|---|
| **WP-6.1** Scaffold | **Creates** `api/v1/[...route].ts`, `api/_lib/{router,errors,envelope,auth,idempotency,db,email,secrets}.ts`, `api/_db/migrate.mjs`, `api/_db/migrations/0001_analytics.sql`, `api/tsconfig.json` (`@` alias to `src`), `api/vitest.config.ts`, `scripts/fixtures-to-seed.mjs`, `docs/09-analytics-v2/examples/.gitkeep`. **Modifies** `vercel.json` (rewrite exclusion, `functions`, `crons`), `package.json` (`test:api`, `db:migrate`, `api:smoke`), `vite.config.ts` (dev proxy when http). **Proof** `vercel dev` serves `/api/v1/health` and the SPA; PGlite test applies migrations; `npx vite build` still green; AC-1270, AC-1271 |
| **WP-6.2** Auth, sessions, permissions, idempotency | **Creates** `0002_auth.sql`, handlers for `auth.*`, `session.*`, `team.*` as the client docblocks describe. **Proof** 401/403 shapes per `CONTRACT.md`; 403 names the permission; idempotent replay test; AC-1272 … AC-1274 |
| **WP-6.3** Catalogue | **Creates** `0003_catalogue.sql`, seed from `src/data/fixtures/measures.ts`, `catalogue.*` handlers, glossary generator. **Proof** `catalogue.measures` equals the fixture list field for field (contract equality test); AC-1275 |
| **WP-6.4** Compiler and `reports.run` | **Creates** `api/_lib/compile.ts` + tests, `docs/09-analytics-v2/examples/compile-quick-rides-by-city.sql`. **Proof** for every seeded saved report, server result equals mock result bucket for bucket on the seed (AC-1276); truncation and per-leg failure (AC-1277); permission per series (AC-1278) |
| **WP-6.5** Reports, segments, annotations, pages | **Creates** `0004_pages.sql` (+ migration script running `dashboardToPage`), handlers. **Proof** 409 on stale version; `page_reports` reverse index; delete refusal names pages; AC-1279 … AC-1281 |
| **WP-6.6** Alerts and crons | **Creates** `0005_alerts.sql`, handlers, `api/cron/{snapshot,alerts-hourly,alerts-daily,alerts-digest,housekeeping}.ts`, email adapter, Slack delivery. **Proof** cron handlers unit-tested with a frozen clock through every machine transition; delivery failure recorded; weekly rule fires once per week on a daily cadence; AC-1282 … AC-1286 |
| **WP-6.7** Agent queue | **Creates** `0006_agent.sql`, `agent.*` handlers, acting-for enforcement, server-side result validation and `caseStudyToBlocks`. **Proof** concurrent-claim test; acting-for refused for a job not claimed; a result citing a foreign `runId` refused; AC-1287, AC-1288 |
| **WP-6.8** Cutover and smoke | **Creates** `scripts/api-smoke.mjs`, `docs/09-analytics-v2/handoffs/cutover.md` (the staged flip with the smoke output per step). **Proof** every step's smoke exit 0 on a preview deployment; harnesses green against the preview with `HARNESS_BASE`; AC-1289 |

### P7 — The analyst (after P1; http mode after WP-6.7)

| WP | What |
|---|---|
| **WP-7.1** MCP server | **Owner** general-purpose (a Node/TS engineer). **Reads** 01 §3, §5. **Creates** `agent/package.json`, `agent/tsconfig.json`, `agent/mcp/**`, `agent/mcp.json`, `agent/README.md`. **Proof** one test per tool in mock source; size caps; T10 masking; `npm --prefix agent test`; AC-1240 … AC-1244 |
| **WP-7.2** Runner | **Creates** `agent/runner/**`, `agent/settings.json` (hooks), `agent/sandbox/.gitkeep`. **Proof** `validate.ts` tests (pass, mismatch, PII); `limits.ts` tests with captured limit messages; the login check refuses an API-key session; `AGENT_E2E=1` spawn test runs one turn; AC-1245 … AC-1250 |
| **WP-7.3** Prompts and schemas | **Owner** content-designer for the protocol prose with the orchestrator; **Creates** `agent/prompts/**`, `agent/schemas/**`. **Proof** schema tests: a study without two alternatives fails; the fixture `done` job's result validates; `caseStudyToBlocks` output validates with `validatePage`; AC-1251 … AC-1253 |
| **WP-7.4** Frontend | **Owner** frontend-engineer. **Creates** `src/screens/analyst/{AnalystView,JobScreen,AskComposer,JobTimeline,ProvenancePanel}.tsx`, tests. **Modifies** `ReportsScreen.tsx`, `views.ts`, `routes.tsx`, `ChartToolbar.tsx` / `ReportBuilder.tsx` / page header / `AlertFeedView.tsx` / notification actions (entry points), `src/commands/*` (palette command). **Proof** all states incl. `deferred` and runner offline; polling stops when done; provenance links open the builder with the run's query; AC-1254 … AC-1264 |
| **WP-7.5** Interactive path | **Creates** `.claude/skills/analyst/SKILL.md`, `.claude/agents/analyst.md`, `.mcp.json`. **Proof** `/analyst "why did cancellations rise last week?"` in a terminal produces a study file under `docs/09-analytics-v2/studies/`; AC-1265 |
| **WP-7.6** Scheduled reviews | **Creates** `agent/runner/schedule.ts` (runner-side fallback), UI for schedules in the analyst view (`Schedules` tab), `agent.schedules` client. **Proof** a due schedule enqueues once; offline runner leaves it queued with the reason visible; AC-1266, AC-1267 |
| **WP-7.7** Reference study and proof | **Creates** `docs/09-analytics-v2/studies/2026-xx-xx-reference.md` with its tool log, `scripts/harness/analyst.mjs`, `docs/02-verification/analytics-v2-analyst-{qa,visual,a11y}.md`. **Proof** the owner reads the study and rules whether the protocol produces decisions; AC-1268, AC-1269 |

### P8 — Hardening

| WP | What |
|---|---|
| **WP-8.1** Accessibility | accessibility-auditor over every new surface; document `docs/02-verification/analytics-v2-a11y.md`; zero blocking |
| **WP-8.2** Arabic | i18n-arabic-engineer: pseudo-locale run (`npm run dev:pseudo`) and `dir="rtl"` harness captures of every new screen; bidi isolation of measure names inside prose; plural families complete |
| **WP-8.3** Visual | visual-qa-engineer: token audit (`/token-audit`), dark theme, D33 recess ceilings on new cards, D34 no shadows, one primary per screen |
| **WP-8.4** Performance | frontend-engineer: chunk sizes (`npx vite build` report; the reports chunk must not grow past 1.5× its P0 size without a named reason), virtualised `ResultTable` above 200 rows, `requestCache` keys reviewed |
| **WP-8.5** Docs and memory | api-contract-steward regenerates `docs/07-api/`; i18n regenerates `docs/08-i18n/`; `docs/RULINGS.md` rows for anything decided in flight; memory file `analytics-v2-status` updated; `docs/README.md` row added |
| **WP-8.6** Comments | every new file's comments at most five lines citing a ruling ID (`CLAUDE.md` "Comments"); the edit gate's `[comment]` rule at zero findings across the diff |

## 4. The gates

### 4.1 `scripts/wp-gate.mjs` (WP-0.2)

Reads `docs/09-analytics-v2/wp/<id>.json`, compares the changed-file list against `allow` and
`deny` globs, exits 1 naming offenders. Manifest example:

```json
{ "id": "WP-2.2", "branch": "analytics-v2/charts",
  "allow": ["src/components/reports/ResultCanvas.tsx", "src/components/reports/SeriesChart.tsx",
            "src/components/reports/useChartView.ts", "src/components/reports/*.test.tsx",
            "src/screens/reports/copy.ts", "src/i18n/ar/reports.ts"],
  "deny":  ["src/components/reports/PanelChart.tsx", "src/styles/globals.css", "src/components/ui/**"] }
```

### 4.2 Existing gates, and what they catch here

| Gate | Command | Catches |
|---|---|---|
| Edit gate hook | automatic on every edit under `src/` | palette classes, arbitrary values, raw colours, physical utilities, `div onClick`, `defaultValue`, em dash, killed focus, hover-only reveal, long comments |
| Typecheck | `npm run typecheck` | the v2 unions; `sortfield-check` for new sortable columns |
| Changed tests | `npm run test:changed` | the ACs of the WP |
| Full suite | `npm test` | shared-layer changes (P1, WP-4.1, WP-1.7) |
| i18n | `npm run i18n:check` | a missing Arabic entry, a `defaultValue`, an em dash in a dictionary value, an over-budget sentence |
| API contract | `npm run api:check` | a client function with no docblock, an unregistered operation, a route with no return type |
| Harness | `node scripts/harness/<name>.mjs` | anything drawn; every P2–P5 and P7 WP names one |
| Token audit | `/token-audit` skill | drift the hook missed in `dist` (Tailwind mints classes found in comments) |
| Backend | `npm run test:api`, `npm run api:smoke` | compiler equality, machine transitions, envelope shapes |
| Agent | `npm --prefix agent test` | tool schemas, evidence validation, limit parsing |

### 4.3 Phase gate (every phase)

All of §4.2 green on the merged tree; every WP handoff present; the phase's verification
documents exist with zero `blocking` findings; the orchestrator's merge commit message lists
the WPs merged and the harness screenshots reviewed.

## 5. Known traps, so nobody rediscovers them

| Trap | Where it bites | What to do |
|---|---|---|
| Recharts re-renders on `mousedown`; a mark with pointer events never receives `click` in Chromium; jsdom says it works | every new mark in WP-2.1, the brush in WP-2.5 | keep `INERT` on marks; prove clicks in the harness, never in Vitest (`SeriesChart.tsx:78-87`) |
| Two dev servers share `node_modules/.vite` and render a blank page | any parallel harness run | build and `vite preview` on 4362 with `HARNESS_BASE` |
| A worktree dev server corrupts the main tree's dep cache | P2/P4/P5/P6 worktrees | never `vite` from a worktree; build and preview |
| `withFallback` must be memoised or suites hang | every new screen using screen copy | copy the pattern from `ReportsScreen.tsx:149-156` |
| Radix `Select` needs `hasPointerCapture` / `scrollIntoView` shims in jsdom | tests with selects | copy `runGate.test.tsx:50-62` |
| `seedMockFailuresFromLocation()` must run before `createRoot` | error-state tests via `?mockFail=` | already wired in `main.tsx`; do not move it |
| The SPA rewrite swallows `/api/*` | WP-6.1 | the negative-lookahead source in 05 §1 |
| `vitest` excludes `.claude/**`; running from a worktree needs `--root` | worktree tests | memory `worktree-agents-windows` |
| `askedOf` strips `chartType`; a view option added to the query would issue a request | WP-2.2, WP-2.3 | `ChartView` lives in persistence, never in `ReportQuery` |
| Tailwind v4 mints a class it finds in a comment | any comment quoting a class | name the parts, never the token, in comments |
| Money: halalas on the wire, SAR in CSV and PNG captions only | formula, thresholds, KPI, agent values | `formatMetric`; the agent schema's `currency` field |
| Week start is a position, not a decision | buckets, compiler, weekly alerts | D45 before WP-6.4 |
| `DetailRoute.kind` is a closed union and `routeTable.ts` orders the dashboard route after `:reportId` | WP-4.5, WP-7.4 | add kinds in WP-1.1; keep the ordering comment at `routeTable.ts:367-370` |
| The reports chunk is lazy; `ids.ts` exists so `routes.tsx` does not pull it | WP-4.5, WP-7.4 | import ids only from `ids.ts` in `routes.tsx` |
| Print mode cannot spawn subagents or preload skills | WP-7.2 | one prompt, one tool server; the interactive skill is the only place subagents run |
| The Agent SDK needs an API key | WP-7.x | do not add `@anthropic-ai/claude-agent-sdk` to any `package.json` |

## 6. Definition of done for the whole plan

- Every AC in [07-acceptance-criteria.md](07-acceptance-criteria.md) has a passing test or a
  harness assertion named in a verification document.
- `npm test`, `npm run test:api`, `npm --prefix agent test`, `typecheck`, `i18n:check`,
  `api:check` all exit 0 on `main`.
- A preview deployment on Vercel with `VITE_DATA_SOURCE=http` passes `api:smoke` and every
  harness with `HARNESS_BASE` pointed at it.
- The runner, on a machine logged into the owner's subscription, completes the reference
  study end to end and the owner has read it.
- `docs/07-api/`, `docs/08-i18n/`, `docs/RULINGS.md`, `docs/README.md` and the memory index are
  current.
