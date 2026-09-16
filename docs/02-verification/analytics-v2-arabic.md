# Analytics v2 — Arabic / RTL audit (WP-8.2, audit half)

**Scope** Every analytics v2 surface under `dir="rtl"`: the report builder (`ReportBuilder.tsx`,
`ChartToolbar.tsx`) and its nine chart types, the funnel/retention/table modes
(`ReportModeCanvas.tsx`), pages and its twelve block types (`src/components/pages/blocks/*`),
alerting including the history dialog (`AlertsView.tsx`, `AlertHistoryDialog.tsx`), and the
analyst (`AnalystView.tsx`, `JobScreen.tsx`, `SchedulesPanel.tsx`) — the last of these is not in
any sibling `-visual.md`'s stated scope and got the most attention here as a result.

**Audit only.** No file under `src/` was edited for this pass. Findings are handed to the
frontend-engineer to fix; other agents are concurrently editing `DataTable.tsx`,
`ReportBuilder.tsx`, `ChartToolbar.tsx`, the page header, `src/screens/analyst/**` and
`AlertHistoryDialog.tsx` per the brief — none of those files were touched here either.

**Read first** `docs/09-analytics-v2/AGENT-BRIEF.md`, `CLAUDE.md`, `docs/ref/rtl.md`,
`docs/ref/copy.md`, and the four sibling passes: `analytics-v2-charts-visual.md` (WP-2.9),
`analytics-v2-modes-visual.md` (WP-3.4), `analytics-v2-pages-visual.md` (WP-4.8),
`analytics-v2-alerts-visual.md` (WP-5.7). Their own Arabic findings are not repeated below —
see each doc's own "Pass 5 — Arabic / RTL" or "Arabic / RTL" section.

**Probe** `scripts/harness/analytics-v2-rtl.mjs` (new, this pass). Chromium via Playwright,
`HARNESS_BASE=http://localhost:4327`, `npx vite --port 4327` started fresh for this pass.
Screenshots in `scripts/harness/shots/rtl-*.png`.

**Tree** Branch `analytics-v2`. `git status` showed only `src/components/DataTable.tsx`
modified at the start of this pass (another agent's, per the brief) — not touched, not cited
below except by file/line reference to its current content.

---

## Verdict

**One should-fix finding that is systemic rather than local, and one related should-fix that
is its low-visual-impact sibling. Everything else probed this pass — the report builder with
an Arabic-named report, five of the twelve page block types inserted live, the analyst index
table's layout, and the alert history dialog — is clean.**

`PageHeader.tsx`'s `title` prop renders real user-authored content (an analyst's typed
question, a page's own title) with no bidi isolation, unlike the isolation this codebase
already built for the *identical* class of problem one screen over (`ReportBuilder.tsx`'s own
title input uses `dir="auto"` specifically so "an Arabic name types and renders right-to-left
inside an English UI, and an English one does not flip inside an Arabic one" — its own comment,
`ReportBuilder.tsx:1168-1171`, citing **AC-898**). `JobScreen.tsx` and `PageView.tsx` pass
literal user content into `PageHeader.title` and get neither protection. Reproduced live, not
inferred: an English question wraps to two lines under an Arabic UI and its own trailing `?`
jumps to lead the second line rather than trail the first (`Why did the cancellation / rate
cross 6% on 24 / ?June`) — a reading-order defect, not merely a misalignment. The reverse case
(an Arabic question under the English UI) does not corrupt word order — Arabic is one strong-RTL
run — but renders flush left instead of right, exactly the alignment defect `dir="auto"` exists
to prevent.

---

## Findings

| # | Severity | Rule | Observed | Evidence | Suggested fix |
|---|---|---|---|---|---|
| **AR1** | **Should-fix** | AC-898 (user content isolates regardless of UI language); established precedent `ReportBuilder.tsx:1168-1171` | `PageHeader.tsx:218`'s `<h1 className="text-band font-medium text-foreground">{title}</h1>` carries no `dir="auto"` and no `<bdi>`. Two analytics-v2 call sites feed it real user content rather than a translated route title: `JobScreen.tsx:230` (`title={job.question}`, an analyst's typed question, English or Arabic per job) and `PageView.tsx:172` (`title={editor.content.title \|\| t('pg.page.untitled')}`, an operator-typed page name). `ReportBuilder.tsx` visibly knows this class of bug exists and built around it by **not** routing its own title through `PageHeader` at all — its title is a raw `<input dir="auto">` with a comment citing AC-898 by name (`ReportBuilder.tsx:1168-1171`). `JobScreen.tsx` and `PageView.tsx` were not given the same treatment | **Reproduced live, two directions.** (1) `AGT-4` (English question `"How many riders churned last quarter, and why?"`) opened under the Arabic UI: `scripts/harness/shots/rtl-jobtitle-agt1-ar-ui-full.png` and `rtl-pages-case-study-ar.png` (same defect on `AGT-1`'s longer question) show the h1 wrapping to a second line with the sentence-final `?` **leading** the wrapped line instead of trailing the first — `"Why did the cancellation / rate cross 6% on 24 / ?June"`. DOM read: `{"text":"How many riders churned last quarter, and why?","dir":null,"textAlign":"start","hasBdi":false}` (`analytics-v2-rtl.mjs`, AGT-4 section). (2) `AGT-2` (Arabic question `"لماذا انخفض عدد الاشتراكات الجديدة هذا الأسبوع؟"`) opened under the **English** UI: `scripts/harness/shots/rtl-analyst-job-agt2-en-ui.png` shows the Arabic sentence flush against the page's **left** margin under the "Reports" breadcrumb instead of the right, because the `<h1>` has no explicit direction and inherits the page's `dir="ltr"`. DOM read: `{"dir":null,"inheritedDir":"ltr","textAlign":"start","hasBdi":false}` | Add `dir="auto"` to `PageHeader.tsx`'s `<h1>` (title element only — `meta`, `badges` and actions are unaffected). Safe for the existing static-route-title call sites too: a translated title's own first strong character already matches the active language, so `dir="auto"` there is a no-op. This is the one-line version of the fix `ReportBuilder.tsx` already applied by hand; `PageHeader` is the shared component and should carry it once rather than have every future user-content title rediscover the bug |
| **AR2** | **Should-fix** | Same rule (AC-898), the low-impact sibling of AR1 | A raw operator id (`AgentJob.requestedBy`, e.g. `USR-7`) renders unwrapped in three places, inconsistent with the *identical* "owner" pattern one screen over: `PagesView.tsx:109` wraps the same shape of value — `row.ownerId === currentUserId ? t(...) : row.ownerId` — in `<bdi {...isolatedRunProps().run}>`. `AnalystView.tsx:163` (`row.requestedBy === currentUserId ? t('an.index.owner.you') : row.requestedBy`) and `SchedulesPanel.tsx:217` (`schedule.ownerId === currentUserId ? t('an.index.owner.you') : schedule.ownerId`) do not. `JobScreen.tsx:231-234` interpolates the same raw id into `an.job.meta` (`'طلبها {who} · {time}'`, `src/i18n/ar/analyst.ts:69`) via `translate.ts`'s plain `{placeholder}` substitution, which performs no isolation at all. Today's fixture ids (`USR-1`, `USR-7`) start with a strong-Latin character so the visible defect is small — misalignment risk rather than reversal — but the inconsistency with `PagesView.tsx`'s own established convention for the same field is real, and a future id format that starts with a digit or leading punctuation would reproduce `isolate.ts`'s own documented "jumps sides" case (its `phone`/`ip` examples) | `scripts/harness/analytics-v2-rtl.mjs`, "requestedBy raw-id cell" check — DOM read of the Arabic analyst index table: `{"text":"USR-7","hasBdi":false}` (cell isolated by exact match, not "a bdi exists somewhere in the row" — the row's question and date cells legitimately have one, confirmed separately) | Wrap `row.requestedBy`/`schedule.ownerId` in `isolatedRunProps().run` inside a `<bdi>`, matching `PagesView.tsx:109` exactly. For `an.job.meta`, either isolate `who` at the call site (`<bdi>{who}</bdi>` around the meta `ReactNode`, since `PageHeader.meta` already accepts `ReactNode`) or accept it as a known gap in `translate.ts`'s plain-substitution model, worth a one-line note there for the next reader |

### Checked and clean this pass

- **The report builder with a real chart, Arabic UI (`RPT-1`).** `scripts/harness/shots/rtl-builder-rpt1-ar.png` — no overflow at 1280 (`overflowX=0`), every label translated, the report's own name (`Captains vs riders · 30 days`) stays LTR as user content correctly (this screen's own `dir="auto"` input, confirmed at `ReportBuilder.tsx:1172`), the formula field (`A / B × 100`) stays LTR as code/query content per `rtl.md`'s explicit carve-out, the two variable badges (`A · الكابتن المسجلون`, `B · الركاب المسجلون`) read correctly. No new finding beyond the sibling `charts-visual.md`'s own (already-filed) V1.
- **Five of the twelve page block types, inserted live in Arabic edit mode.** `divider`, `columns`, `table`, `bookmark` inserted via the add-block picker on `DSH-1` under `dir="rtl"`: the empty table's `+ إضافة صف` / `+ إضافة عمود` controls, the columns block's width segmented control, and the bookmark's `ألصق معرّفًا` placeholder + type selector all render correctly mirrored with no overflow at 1280 (`scripts/harness/shots/rtl-pages-block-{columns,table,bookmark}-ar.png`). `alert-status` was not reached this pass — the add-block search box lost focus after the fourth insertion in the same script run (harness artifact, not reproduced by hand); flagged as a gap, not a finding.
- **The case-study result page's other six block types** (`heading`, `text`, `agent-insight`, `report`, `toggle`, `callout`), reached the real way — through `AGT-1`'s job screen, not a direct page route (`PAGE-CS-1` is a private, unpublished draft per `pages.ts:110` and has no independent route in this build). `scripts/harness/shots/rtl-pages-case-study-ar.png`: the source card, the callout-toned recommendation, the chart panel with its comparison line and legend all render correctly mirrored, no horizontal overflow at 1280 (`overflowX=0`). The page's own **title** (the job's English question, rendered a second time as this page's `h1`) reproduces **AR1** here too — same root cause, not a second finding.
- **The alert history dialog, Arabic (`AlertsView.tsx` → `AlertHistoryDialog.tsx`).** Reached via a rule's row kebab → "سجل الإطلاق". `scripts/harness/shots/rtl-alert-history-dialog-ar.png`: the dialog itself carries `dir="rtl"` correctly, the rule name renders isolated (`«Cancellation rate over 6%»` stays LTR inside the Arabic dialog title, per the file's own AC-898 comment at `AlertHistoryDialog.tsx:263-264`), and the two tabs (`الإطلاقات`, `التغييرات`) are both translated. **Checked and ruled out as a false lead:** the firing table's own wrapper measured `scrollWidth 1184` vs `clientWidth 798` (386px of internal overflow) inside the dialog — this looked like a should-fix at first read, but a side-by-side probe against the **English** dialog measured the identical `1184`/`798` split. The wrapper is `overflow-x: auto` by design in both languages (a wide table scrolling inside a fixed-size dialog, not the dialog itself overflowing the viewport) — not an Arabic-specific defect, and not filed, per `verify.md`'s warning against reporting a documented/by-design shape as an oversight.
- **The analyst index table, Arabic.** `scripts/harness/shots/rtl-analyst-index-ar.png` — no horizontal overflow at 1280, the `Question` column's user content is correctly isolated (`AnalystView.tsx:126-131`, `isolatedRunProps` + `<bdi>`), the `Started` date column is correctly isolated (`AnalystView.tsx:171`, bare `<bdi>`), state badges translate (`قيد الانتظار`, `قيد التنفيذ`, `مؤجَّل`, `مكتمل`, `فشل` — no red anywhere, matching R7), and no raw translation key or English string reached the Arabic render anywhere in the six rows read. The one gap is **AR2** above.
- **Numerals and money.** Every count/percent value read across this pass's captures (`55`, `57`, `6%`, `5.8%`, `70`) stayed Western-digit and left-to-right inside Arabic sentences and cells, matching `rtl.md`'s explicit rule that a numeral run does not reorder — consistent with the sibling `charts-visual.md`/`modes-visual.md` passes' own findings. No SAR-denominated measure was reachable in the fixtures this pass touched (the report builder and analyst fixtures used here are all count/percent measures), so this pass adds no new evidence either way on money specifically beyond what the sibling docs already established.
- **Dates.** Every date read this pass (`25 يونيو 09:14`, `24 يونيو 08:14`, `23 يونيو 09:14`) renders as day-month-time in the Gregorian calendar with Western digits, consistent with the `ar-SA-u-ca-gregory-nu-latn` pin this build already relies on. This pass did not exercise a week-grain chart or a cohort matrix with visible weekday labels (that is `modes-visual.md`'s territory and was already passed there); no new evidence on D45's Sunday-start specifically.

---

## How to reproduce

```
npx vite --port 4327
HARNESS_BASE=http://localhost:4327 node scripts/harness/analytics-v2-rtl.mjs
```

The three `FAIL` lines in the harness's own output are deliberate — they assert the isolation
that **AR1**/**AR2** are missing, the same way `reports-v2.mjs`'s V1 check and
`reports-modes.mjs`'s V-M1 checks stay red until their own defects are fixed. Do not loosen
them to make the run green; fix `PageHeader.tsx`, `AnalystView.tsx` and `SchedulesPanel.tsx`
instead.

---

## Summary of blocking/should-fix findings by file

- **`src/components/PageHeader.tsx:218`** — **AR1, should-fix.** The `<h1>{title}</h1>` needs
  `dir="auto"` (or a `<bdi>` wrap) so user-authored titles isolate the way `ReportBuilder.tsx`'s
  own title input already does. Reproduce: open `/management/reports/analyst/AGT-4` under
  `dir="rtl"` at 1280 and watch the title wrap — the trailing `?` leads the second line.
- **`src/screens/analyst/AnalystView.tsx:163`** — **AR2, should-fix.** Wrap `row.requestedBy`
  in `<bdi {...isolatedRunProps().run}>`, matching `PagesView.tsx:109`. Reproduce: open
  `/management/reports?view=analyst` under `dir="rtl"`, read the "Requested by" cell for any
  row not owned by the current user.
- **`src/screens/analyst/SchedulesPanel.tsx:217`** — **AR2, should-fix.** Same fix, same file
  pattern (`schedule.ownerId`), not independently re-screenshotted this pass but read at
  source and structurally identical to the `AnalystView.tsx` instance.
- **`src/screens/pages/PageView.tsx:172`** — feeds `PageHeader.title` with `editor.content.title`
  (an operator-typed page name); fixed for free once **AR1** lands in `PageHeader.tsx`, no
  separate change needed here.
- **`src/screens/analyst/JobScreen.tsx:230-234`** — feeds `PageHeader.title` with `job.question`
  (**AR1**, fixed for free once `PageHeader.tsx` is fixed) and interpolates `job.requestedBy`
  into `an.job.meta` unisolated (**AR2**'s third instance, lower priority — a param
  substitution inside `translate.ts`, not a per-call-site fix).
