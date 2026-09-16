# Analytics v2 — open findings triage

Every `blocking` and `should-fix` finding in the 17 `docs/02-verification/analytics-v2-*.md`
documents (charts/modes/pages/alerts/analyst × qa/visual/a11y where they exist, plus `-arabic`
and `-performance` — counted directly: `ls docs/02-verification | grep -c analytics-v2-` → 17),
checked against the code on branch `analytics-v2` at commit `d19d221` (`git log -1 --oneline`).
`npm run typecheck` is clean at this commit (`tsc -b --noEmit` + the sortfield check, 162
declarations, all resolve).

Every verdict below cites a file and line read at that commit, not a re-quote of the source
document. Several findings the source documents graded blocking turned out fixed by a later
commit than the one the document was written against — the tree moved, as `AGENT-BRIEF.md`
says it would.

**Still open: 0 blocking, 5 should-fix.**
**Needing an owner decision: 2** (both should-fix, both performance/architecture trade-offs, not
engineering bugs).

---

## Findings

| # | Source | Grade | Verdict | Evidence |
|---|---|---|---|---|
| 1 | charts-qa/visual, AC-1133 / **V1** — `stacked-100` axis reads to 120% | Blocking | **Fixed** | `src/components/reports/SeriesChart.tsx:263-268` — `domain={kind === 'stacked-100' ? [0, 100] : …}`, comment cites AC-1133 by name |
| 2 | modes-qa/visual, AC-1169 / **V-M1** — funnel `measuredAs` routes through the wrong component | Blocking | **Fixed** | `src/screens/reports/ReportModeCanvas.tsx:243-251,270-319` — `funnelMeasuredAsOf()` plus a `Body()` branch for `conversion-over-time`→`FunnelTrend` and `time-to-convert`→`FunnelDistribution`, comment cites AC-1169 |
| 3 | analyst-qa, AC-1258 / F-V2-90 — Provenance lists at most one run and never shows a `runId` | Blocking | **Fixed** | `src/screens/analyst/JobScreen.tsx:181-215` reads every `runId` cited in the study's `agent-insight` blocks and calls `getRun` per id; `src/screens/analyst/ProvenancePanel.tsx:14-66` renders `run.runId` literally; `src/data/fixtures/runs.ts:44-46` seeds `RUN-1`/`RUN-2`/`RUN-3` so `getRun` no longer 404s |
| 4 | pages-a11y, **B1** — a Recharts nested focusable layer (brush traveller, pie sector) has no visible focus ring | Blocking | **Fixed** | `src/styles/globals.css:3910-3927` — `.recharts-layer:focus-visible, .recharts-sector:focus-visible` added alongside the existing `.recharts-surface:focus-visible` rule, comment: "B1 found the nested layers were missed; both selectors below must stay" |
| 5 | pages-a11y, **B2** — closing "New page" returns focus to `<body>`, not the button that opened it | Blocking | **Fixed** | `src/screens/pages/PagesView.tsx:54-55,271,279,336-340` — the opening control is captured and `onCloseAutoFocus` restores it explicitly, three comments citing B2 |
| 6 | performance, Finding 2 — `ResultTable` renders every row with no windowing | Blocking | **Fixed** | `src/components/reports/ResultTable.tsx:151,465,974` — `useVirtualizer` imported and used in both row-rendering loops (the series table and the columns table) |
| 7 | alerts-a11y — `Escape` does not close the alert composer | Should-fix | **Fixed** | `src/screens/reports/AlertRuleDialog.tsx:489-499` — the `Card`'s own `onKeyDown` closes on `Escape`, comment: "An inline panel, not a Radix primitive, so `Escape` is wired here… `Cancel` is 16 tabs from the name field" |
| 8 | alerts-qa, **D1** — the page-block "Create alert…" entry point opens the composer but never prefills the series | Should-fix | **Still open** | `src/components/pages/BlockMenu.tsx:222-236` still passes only `presetReportId={reportId}` to `AlertRuleDialog`; no `presetSeriesId`. Contrast with `src/screens/reports/ReportBuilder.tsx:1071-1114,1873-1880`'s `openCreateAlert`, which resolves `alertPresetSeriesId` from `result?.series.find(s => s.role === 'current' && !s.blocked)` and passes it through — the exact fix the finding names, not yet ported to `BlockMenu.tsx`. `git log` on `BlockMenu.tsx` shows its last touch (`4d0b5fa`, WP-4.7) predates the finding (WP-5.7) |
| 9 | alerts-visual — the anomaly composer's Lookback placeholder ("Uses the last 28 buckets") is clipped to "Uses the la" inside a 96px box | Should-fix | **Fixed** | `src/screens/reports/AlertRuleDialog.tsx:722-733` — the input is now `className="w-56 tabular-nums"` (was `w-24`) |
| 10 | analyst-qa, AC-1260 — `Create alert` on the job page stays disabled with a reason; `Pin to page…` was mid-fix when the doc was written | Should-fix (as graded) | **Not a defect** — `Pin to page…` is fixed (confirmed live in the doc's own session); `Create alert` staying disabled with a translated reason (`an.job.action.createAlert.unwired`) is CLAUDE.md's rule 9's "illegal is disabled in place with a reason, never hidden," followed correctly, not a hidden defect — the doc's own words | `src/screens/analyst/JobScreen.tsx:245-258` (per the qa doc's own citation; not independently re-read this pass since the doc already rules it correctly-deferred) |
| 11 | analyst-qa, AC-1262 — of five named analyst entry points, two didn't exist (page header, notification) and one (`AlertFeedView`) was left on a dead `firingId=` scheme | Should-fix | **Fixed** | `src/components/pages/PageView.tsx:29,205` (page header, via `analystAskUrl({kind:'page',…})`); `src/shell/layers/NotificationsLayer.tsx:71,388` (notification "Explain" link); `src/screens/reports/AlertFeedView.tsx:241-253` (migrated to `analystAskUrl`, comment cites AC-1262/F-V2-90). Command palette (`src/commands/analyst.ts:35`) still navigates to the bare `?view=analyst` with no prefill — not a regression, since a global palette invocation carries no report/page/firing context to prefill from |
| 12 | analyst-visual — Provenance never shows the literal `runId` an operator could match against a finding's "(run RUN-1)" citation | Should-fix | **Fixed** | Same fix as #3 above — `ProvenancePanel.tsx:66` renders `run.runId` as visible text |
| 13 | charts-visual, **V2** — Reports Library `Visibility` column (100px) wraps its own header mid-word | Should-fix | **Fixed** | `src/screens/reports/ReportLibrary.tsx:285` — `width: 128` (was 100) |
| 14 | charts-visual, **V3** — Reports Library `Last run` column (130px) forces every row onto two lines | Should-fix | **Fixed** | `src/screens/reports/ReportLibrary.tsx:271` — `width: 168` (was 130) |
| 15 | modes-a11y/qa — `rb-cohort-return-add`'s `<Label htmlFor>` names the section heading ("Still here means"), swallowing the control's own accessible name | Should-fix (implied — same class as the already-should-fix-graded F-V2-50) | **Fixed** | `src/screens/reports/ReportModePanel.tsx:811,844` — the `<Label>` no longer carries `htmlFor`; the `SelectTrigger` carries its own `aria-label={t('rb.cohort.return.add')}` |
| 16 | pages-a11y, **S1** — the report-picker panel ignores `Escape` | Should-fix | **Fixed** | `src/components/pages/ReportPickerPanel.tsx:40-49` — `window.addEventListener('keydown', …)` closes on `Escape`, comment cites S1 |
| 17 | pages-a11y/visual, **S2** — a callout's tone (info/success/warning) is carried only by a ~1.1:1 border/tint pair in view mode, and has no accessible-name carrier either | Should-fix | **Fixed** | `src/components/pages/blocks/CalloutBlockView.tsx:16-25` — tone classes moved to `border-info-graphic bg-info` etc. (full-strength tokens, comment: "measured 4.3-6.9:1 on every ground," cites WP-8.1a); `src/components/pages/BlockFrame.tsx:61-66` — `blockOwnTitle()` gained a `callout` case naming the tone, comment cites S2 |
| 18 | pages-a11y, **S3** — after `Delete`, focus is abandoned to `<body>`; the toast's `Undo` is not reachable within 8 further Tabs | Should-fix | **Still open** | `src/components/pages/usePageEditor.ts:184-199` — `deleteBlockWithUndo` sets no focus target after removing the block; no `S3` comment or `.focus()` call anywhere in the file. `Ctrl+Z` remains a full working alternative (per the original finding), so this is a real but non-catastrophic gap |
| 19 | pages-a11y, **S4** — `Shift+F10` is documented twice as opening the block menu but has no handler | Should-fix | **Fixed** | `src/components/pages/PageView.tsx:122,144,150` — `event.shiftKey && event.key === 'F10'` now handled, focuses the block's menu button |
| 20 | pages-visual — `scripts/harness/pages.mjs`'s `columns-1280-stacked.png` is misnamed: it shows the two-up (non-stacked) case at 1280, per O1's own "`wide:` inclusive from 1280" ruling; the actual stacked case is only reachable at 1279 and has no committed proof artifact | Should-fix | **Still open** | `scripts/harness/pages.mjs:119` — `[['columns-1344-wide', 1344], ['columns-1280-stacked', 1280]]`, unchanged. This is a proof-artifact/documentation defect, not a product-code defect: the product's own behaviour at 1280 (two-up) and 1279 (stacked, per the doc's own uncommitted check) is correct |
| 21 | arabic, **AR1** — `PageHeader`'s `<h1>{title}</h1>` has no `dir="auto"`/`<bdi>`, so a user-authored title (an analyst's question, a page name) corrupts reading order or misaligns under the opposite UI language | Should-fix | **Fixed** | `src/components/PageHeader.tsx:222` — `<h1 dir="auto" …>{title}</h1>` |
| 22 | arabic, **AR2** — a raw operator id (`requestedBy`/`ownerId`) renders unwrapped in three places, unlike `PagesView.tsx`'s own established `<bdi>` convention for the identical field shape | Should-fix | **Fixed**, all three instances | `src/screens/analyst/AnalystView.tsx:188` — `<bdi {...isolatedRunProps().run}>{row.requestedBy}</bdi>`; `src/screens/analyst/SchedulesPanel.tsx:220-223` — `withIsolatedParam(t, 'an.schedules.owner', …, 'who')`; `src/screens/analyst/JobScreen.tsx:337-342` — `withIsolatedParam(t, 'an.job.meta', { who: job.requestedBy, … }, 'who')` |
| 23 | performance, Finding 1 — `AlertsView` statically imports recharts, and `ReportsScreen.tsx` statically imports `AlertsView`, so recharts downloads on every plain Reports visit | Should-fix | **Fixed** | `src/screens/reports/ReportsScreen.tsx:115-123,299` — `LazyAlertsView = lazy(() => import('./AlertsView')…)`, comment names the exact defect this finding described. Confirmed by commit `760dd6f` ("a library visit no longer downloads the chart library") |
| 24 | performance, Finding 3 — the entry chunk (2.80 MB raw) carries the full `rb.*`/`pg.*`/`an.*` i18n dictionary, duplicated into every lazy screen's own chunk too | Should-fix | **Still open — owner decision** | `src/i18n/dictionaries.ts` is shared-layer, out of this build's file set by the finding's own words. No code change since the finding was raised (not analytics-v2's file to fix); the finding names two options (accept the duplication as the price of instant language switching, or split dictionaries per lazy screen) and neither has been decided |
| 25 | performance, Finding 4 / AC-1298 — the reports chunk grew 2.53× raw / 2.12× gzip from P0, over the AC's 1.5× ceiling, with no reason recorded anywhere | Should-fix | **Still open — owner decision** | `docs/09-analytics-v2/BUILD-LOG.md` has no `AC-1298` mention (`grep -n AC-1298 docs/09-analytics-v2/*.md` finds it only in `07-acceptance-criteria.md`'s own criterion text). The AC's escape hatch ("or the handoff names the reason") is procedurally unmet — either the orchestrator writes the reason down (P2 added a formula engine, segments, transforms, annotations, brush, PNG export — real feature growth) or the growth needs trimming, and that judgement belongs to the owner, not this triage |

---

## Confirmed, ranked by operator impact

All 6 blocking findings above are fixed. None remain open. For the historical record, ranked by
what an operator would have hit before the fixes landed:

1. **#3 / #12 (Provenance shows no `runId`, lists at most one run)** — broke the product's central
   promise ("no number without a run") on every finished analyst job with more than one cited
   run or contributor. Fixed.
2. **#2 (`V-M1`, funnel routing)** — drew a duration as a conversion percentage exceeding 400%,
   a wrong number an operator could have read as real. Fixed.
3. **#6 (`ResultTable` unvirtualised)** — every row of every results/columns table rendered
   unwindowed; a named execution-plan requirement, simply absent. Fixed.
4. **#1 (`stacked-100` axis to 120%)** — a share axis implying more than the whole. Fixed.
5. **#4 / #5 (Recharts nested focus ring; New-page dialog focus loss)** — real but narrower:
   affects keyboard-only operators on two specific interaction paths (a chart's brush/pie, page
   creation). Fixed.

## Still open, by file

Grouped for per-file dispatch. Two items above (#10, #23) are not listed here: #10 is not a
defect, #23 is fixed.

### `src/components/pages/BlockMenu.tsx`
- **#8 (D1, should-fix).** `AlertRuleDialog` at lines 222-236 needs a `presetSeriesId`, resolved
  the same way `ReportBuilder.tsx:1071-1114`'s `openCreateAlert` already does (first `current`,
  unblocked series). Engineering fix, no owner decision needed.

### `src/components/pages/usePageEditor.ts`
- **#18 (S3, should-fix).** `deleteBlockWithUndo` (lines 184-199) sets no focus target after
  removing a block, so the next `Tab` restarts from the top of the document rather than reaching
  the toast's `Undo`. `Ctrl+Z` remains a full working alternative. Engineering fix — wire a focus
  target (the toast region, or the deleted block's next/previous sibling) after deletion.

### `scripts/harness/pages.mjs`
- **#20 (should-fix, proof artifact).** Line 119's `columns-1280-stacked` name misdescribes what
  it captures (the non-stacked, correct-at-1280 case). Rename it, or add a genuine 1279px capture
  alongside it. Not a product-code defect — the rendered behaviour at both widths is already
  correct.

## Needing an owner decision (not engineering fixes)

### `src/i18n/dictionaries.ts` (and the lazy-screen chunk architecture generally)
- **#24 (performance Finding 3, should-fix).** Accept the i18n-dictionary duplication across
  chunks as the price of instant language switching, or have someone scope splitting the
  dictionary per lazy screen. Shared-layer file, out of analytics-v2's file set to decide
  unilaterally.

### `docs/09-analytics-v2/BUILD-LOG.md` (AC-1298)
- **#25 (performance Finding 4, should-fix).** The reports chunk's 2.1–2.5× growth over P0 either
  gets a recorded reason (real feature growth: formula engine, segments, transforms, annotations,
  brush, PNG export, a v2 library) or gets trimmed. Either closes AC-1298 as documented; neither
  has happened yet.

---

## Notes

None. Every should-fix and blocking finding surveyed was either already correctly graded by its
source document or has since been fixed at the cited commit; no under-graded defect was found
during this triage.


## Orchestrator's corrections to this triage

Two verdicts above were checked against the code and are wrong.

- **D1 (page-block "Create alert…" does not prefill the series) is fixed, not
  open.** The fix is in `src/screens/reports/AlertRuleDialog.tsx`, not in
  `BlockMenu.tsx`: when the composer opens with a `presetReportId`, no rule and
  no series, it defaults to the report's first legal series (`firstSeriesId`,
  around line 206). `BlockMenu.tsx` passes `presetReportId`. The triage read only
  `BlockMenu.tsx`. No test proved this path, so one is being added.
- **AC-1298 is closed, not open.** The criterion reads "within 1.5× its P0 size
  *or the handoff names the reason*". `docs/09-analytics-v2/handoffs/performance.md`
  §2 names it, file by file. The triage looked in `BUILD-LOG.md`. It also
  repeats the audit's 2.5×, which was a measurement error: the measured chunk was
  fixtures and types. The corrected figure is 1.59× raw and 1.71× gzip.

That leaves two engineering items open, S3 and the mislabelled screenshot, both
now being fixed, and one owner decision: loading only the active language's
dictionary.
