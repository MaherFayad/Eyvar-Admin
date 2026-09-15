# Alerting v2 — acceptance criteria (WP-5.7 Proof)

Each line: met or not, with the evidence that says so — a test file (re-run fresh this
session), a live Playwright check (`scripts/harness/alerts-v2.mjs`, existing;
`scripts/harness/alerts-v2-proof.mjs`, new this work package), or a file:line code read.

**Fresh vitest run this session**, the six alert-owning files:
`npx vitest run src/screens/reports/alerts-v2.test.tsx src/screens/reports/alerts.chrome.test.tsx
src/screens/reports/alerts.corrections.test.tsx src/data/reporting/alerts/evaluate.test.ts
src/data/reporting/alerts/machine.test.ts src/components/pages/blocks/alertStatusBlock.test.tsx`
→ **6 test files, 85 tests, all passing** (`Test Files 6 passed (6)`, `Tests 85 passed (85)`,
15.12s). Counted, not quoted from a build log.

**Both harnesses run this session** against `npx vite --port 4327`:
`node scripts/harness/alerts-v2.mjs` (existing — AC-1226/1233's drawn proof, 4 theme/language
combinations) and `node scripts/harness/alerts-v2-proof.mjs` (new — cross-checks the preview
against ground truth read from a different render path, and drives the three G15 entry
points end to end in a real browser). Full log: `scripts/harness/shots/proof-run.log`.

| AC | Met | Evidence |
|---|---|---|
| AC-1220 | ✅ | `src/data/reporting/alerts/machine.test.ts`, passing — every §12.4 transition plus `error` after 5 failures, `suspended` on lost permission, `mutedUntil` suppressing delivery not transitions, `minReArmMinutes` elapsing |
| AC-1221 | ✅ | `evaluate.test.ts`, passing — `lastCompleteIndex` tested-bucket selection and `isNewBucket` (`evaluate.ts:60-67,273-276`) gating the once-per-bucket transition |
| AC-1222 | ✅ | `evaluate.test.ts`, passing — `reference()` refuses `same-bucket-previous-week` outside `day` with `outcome: 'invalid-condition'` (`evaluate.ts:121`) |
| AC-1223 | ✅ | `evaluate.test.ts`, passing — `evaluateMissing` requires every one of the last n complete buckets `=== null`; a real `0` among them does not fire (`evaluate.ts:235-249`) |
| AC-1224 | ✅ | `machine.test.ts`, passing (recipient-dropped transition, owner notified once) |
| AC-1225 | ✅ | `alerts.chrome.test.tsx` + `alerts-v2.test.tsx`, both passing — no dialog role, exactly the four kinds as a segmented control; live-confirmed on all three G15 entry points this session (Checks 2a/2b/2c, `proof-run.log`) |
| AC-1226 H | ✅, exact match | **Independently verified, not just wired.** `alerts-v2-proof.mjs` Check 1 read RPT-3's own data table (a different render path from the alert evaluator: `ChartToolbar`'s "Show table" beneath the chart, not `evaluate()`) for the last 60 **complete** `revenue.total#_#current` buckets, and hand-counted (in the harness script, independent arithmetic, `value < 400`) how many are below ALR-2's SAR 400 threshold: **13**. The composer's own sr-only summary (`rb.alert.preview.summary`) read **"13 of the last 60 buckets would have fired"**, and the number of drawn amber `circle[fill="var(--color-warning-graphic)"]` marks was **13**. All three numbers agree, in all four theme/language combinations (`alerts-v2.mjs`: `markCount: 13` for light-en, dark-en, light-ar, dark-ar). No disagreement found anywhere. |
| AC-1227 | ✅ | `alerts-v2.test.tsx`, passing — `Hourly`/`Daily`/`Not scheduled`, saving `Not scheduled` stores `null` |
| AC-1228 | ✅ | `alerts-v2.test.tsx`, passing — email picker filtered to `view_finance` holders (Finance/Owner/Ops Manager, never Support); Slack picker lists the webhook by name, never its URL |
| AC-1229 | ✅ | `alerts-v2.test.tsx`, passing — `Critical` tab disabled with the Q-RB-9 reason; live-confirmed the same reason string reads `'rb.alert.severity.critical.blocked'` = "Critical severity needs a recipient rule that is not decided yet." (`copy.ts:1442`) |
| AC-1230 | ✅ | `evaluate.test.ts` (unit) + `alerts-v2.test.tsx` (wiring), both passing. **Also live this session**: opened ALR-9 ("New subscriptions outside their usual band", seeded at 6 usable points against the 8-point floor) — the composer showed, in place, "Needs 8 complete buckets to estimate a range. This series has 6." with **zero** marks drawn, never a crash or a silent chart (Check 3, `proof-no-baseline.png`) |
| AC-1231 | ✅ | `alerts-v2.test.tsx`, passing — prefills 400 for a 40,000-halala threshold, 500 saves as 50,000 |
| AC-1232 | ✅ | `alerts.chrome.test.tsx`, passing — condition summary sentences from `rb.alert.sentence.<kind>` |
| AC-1233 H | ✅ | `alerts-v2.mjs`'s sparkline facts this session: `strokes: ["none","var(--color-value)","var(--chart-axis)"]` across all four theme/language runs — never a red stroke |
| AC-1234 | ✅ | `alerts-v2.test.tsx`, passing — the five durations, row then reads `Muted until …` |
| AC-1235 | ✅ | `alerts.chrome.test.tsx` + `alerts-v2.test.tsx`, both passing |
| AC-1236 | ✅ | `alerts-v2.test.tsx`, passing — no selection checkbox, no sort control |
| AC-1237 | ✅ | `alerts-v2.test.tsx`, passing |
| AC-1238 | ✅ | `alerts-v2.test.tsx`, passing |
| AC-1239 | ✅ | `alerts-v2.test.tsx`, passing — `field: old → new` with keyed labels |

## The non-negotiables, checked directly

- **A partial bucket is excluded from every evaluation.** Confirmed twice: (1) `evaluate.ts`'s
  `lastCompleteIndex`/`lastNCompleteIndexes` (lines 60-78) walk back skipping partial indexes
  by construction, unit-tested; (2) live, RPT-3's own table marks `25 Jun` "Incomplete" and it
  is absent from the ground-truth 60-bucket set my harness built independently — the preview's
  13 marks land only inside the complete set. Both agree.
- **A gap is `null`, never `0`.** `evaluate.ts:235-249`'s `evaluateMissing` counts `=== null`
  exactly, and `evaluate.test.ts` asserts a real `0` does not fire. `AlertPreviewChart.tsx`'s
  `Area` uses `connectNulls={false}`, so a gap breaks the drawn line rather than reading as
  zero.
- **`no-baseline` and `invalid-condition` are refusals shown in place, not silence.** Live
  (AC-1230 row above) and by code: `evaluate.ts` returns `outcome: 'no-baseline'` /
  `'invalid-condition'` as first-class outcomes, never throws, never returns a fake
  would-not-fire.
- **No red badge.** `AlertsView.tsx:71-77`'s `STATE_TONE` type is `'success' | 'warning' |
  'info' | 'neutral'` — TypeScript cannot admit a fifth `'destructive'` value; `firing` maps to
  `warning`. `AlertFeedView.tsx:172` uses `tone="neutral"` for every severity badge. Live
  computed-colour scan (Check 4) found zero saturated-red elements on either the Rules tab
  (including the seeded `firing` row, ALR-1) or the Firings tab.
- **The preview chart marks where the rule would have fired, and it is exactly right, not
  approximately.** See AC-1226 above — this was the check the brief called out as the one
  most likely to be "approximately true," and it came back an exact three-way match (13/13/
  13) rather than approximate.
- **The email picker is filtered by permission.** AC-1228, passing test, confirmed the
  measure's `view_finance` gate excludes Support.
- **Money is integer halalas on the wire, SAR at the edge.** AC-1231, passing test:
  400 SAR round-trips to 40,000 halalas and back without drift. `AlertRuleDialog.tsx:282,285`
  routes every money-unit field through the shared `parseMoneyInput`, not a local parser.
- **Riyadh time, Sunday week start (D45).** Confirmed by code read, not independently run:
  `api/cron/alerts-daily.ts:2` schedules `15 3 * * *` UTC with the comment "06:15 Riyadh —
  after `snapshot` at 00:05 Riyadh", matching `04-alerting-v2.md` §3 exactly. The cron itself
  was not executed this session (out of this WP's file set and effort budget — that is
  `AC-1282`'s backend-test territory, marked `B` in `07-acceptance-criteria.md`).

## The unsaved-report entry-point loop — the part flagged as least-proven

Driven end to end, in a real browser, three times over (Checks 2a/2b/2c):

1. **Saved report** (`/management/reports/RPT-3`): the bell opens the composer directly,
   no name prompt. ✅
2. **Unsaved report** (`/management/reports` → `New report` → pick "Gross revenue" as the
   measure): the bell was disabled until a measure was chosen (AC-1161), then enabled.
   Clicking it opened the inline name prompt (`role="dialog"` count: **0**, confirming the
   no-dialog ruling holds even for this secondary panel). Typing a name and confirming saved
   the report, navigated to `/management/reports/RPT-2322`, and the composer opened
   automatically, pre-filled with **Report: "WP-5.7 proof alert report"** and, once its own
   round trip settled (~2.5s), **Series: "Gross revenue"** (`proof-entry-unsaved-after-save.png`).
   A page reload afterwards showed the URL no longer carries `openAlert=`, confirming the
   one-shot param strip (`ReportBuilder.tsx:1119-1128`) does what its comment says. Zero
   console/page errors across the whole loop. **This loop works.**
3. **Page block menu** (`PAGE-TPL-2`'s report block, `Create alert…`): opens the composer, but
   **the series does not prefill** — see Defects, below. This is the one part of the three
   entry points that does not match spec.

## Summary

- **20 of 20 alerting criteria met**, by a fresh passing test run plus live browser proof for
  the two ACs marked `H` and for everything the brief named as the highest-risk claims.
- **1 defect found live**, not visible from the test suite alone (Defects, below): the page
  block's `Create alert…` entry point does not prefill the series, contrary to
  `04-alerting-v2.md` §4's "does the same" wording. Should-fix, not blocking — the composer
  still opens and functions; the operator must pick the series manually from a dropdown that
  is otherwise correctly populated and filtered.
- **No blocking finding on AC-1226.** The preview's marks agreed with independently-derived
  ground truth exactly, in every theme/language combination tested.

## Defects

| # | AC | Severity | Repro | Expected | Actual |
|---|---|---|---|---|---|
| D1 | AC-1225/§4 "From a chart" | Should-fix | Edit `PAGE-TPL-2` → block menu on the "Gross revenue · 90 days vs previous" report block → `Create alert…`. Wait for the round trip to settle (screenshot at +4s, `proof-entry-page-block-menu.png`). | Composer opens with the report **and its first current, unblocked series** prefilled — 04-alerting-v2.md §4: "the block menu's `Create alert…` does the same with the block's report" (same as the builder bell, which does prefill the series). | Report prefills correctly; the Series field stays on its unselected placeholder text, literally "Series". Root cause: `BlockMenu.tsx:222-228` constructs `<AlertRuleDialog presetReportId={reportId} .../>` with no `presetSeriesId` prop at all, unlike `ReportBuilder.tsx`'s `openCreateAlert` (line 1070-1081), which resolves `result?.series.find(s => s.role === 'current' && !s.blocked)?.id` and passes it through. `AlertRuleDialog.tsx:121` defaults `seriesId` to `''` when `presetSeriesId` is `undefined`. |

## Coverage gaps

- **AC-1282–1289 (backend cron behaviour)** were not exercised this session — confirmed by
  code read only (see the Riyadh-time line above). These are `B`-marked in
  `07-acceptance-criteria.md`, backend-test territory, and outside this WP's file set
  (`docs/02-verification/analytics-v2-alerts-{qa,visual,a11y}.md` and the harness script
  only). If nobody owns them, say so back to the build's coordinator — they are not covered
  by this document or by `analytics-v2-charts-qa.md`/`analytics-v2-pages-qa.md` either, on a
  grep of those two files for `AC-128`.
- **AC-1226's exact-match proof is for one condition kind** (`static`, ALR-2's `lt` threshold).
  The `relative`, `anomaly` and `missing` kinds are proven correct by `evaluate.test.ts`'s
  unit tests (pure-function, hand-computed fixtures) and by the fact that the preview literally
  calls the same `evaluate()` in a loop (`AlertRuleDialog.tsx:311-384` — code read, traced
  line by line: the sliding-window slicing is index-correct for every kind, including
  `anomaly`'s baseline exclusion of the evaluated bucket itself via `anomaly.ts:82`'s
  `points.slice(0, evaluatedIndex)`), but a ground-truth cross-check of the kind I did for
  `static` was not repeated for the other three kinds this session — the report/series
  fixtures needed to hand-verify a `relative` or `anomaly` band from an independent render
  path (e.g. a data table showing a comparison column) were not readily available within the
  time budget. If a future session wants to close this gap, `ALR-11`'s Slack-delivery-failure
  fixture and `RPT-13`'s subscription series are the closest existing candidates.
- **Delivery (AC-1283/1284, Slack failure recorded, cron does not fail)** not independently
  re-run; `alerts.corrections.test.tsx` passing is the only evidence, not re-read line by line
  this session.
