# Pages of blocks — acceptance criteria (WP-4.8)

Each line: met or not, with the evidence that says so — a test file (re-run fresh this
session, not quoted from the build log), a live Playwright check
(`scripts/harness/pages-v2.mjs`, this work package), or a file:line code read. Fresh vitest
run this session, scoped to the owning trees:
`npx vitest run src/components/pages src/screens/pages src/lib/markdown` →
**22 test files, 237 tests, all passing** (`Test Files 22 passed (22)`, `Tests 237 passed
(237)`, 13.45s). Counted, not quoted from `docs/09-analytics-v2/BUILD-LOG.md`.

| AC | Met | Evidence |
|---|---|---|
| AC-1180 | ✅ | `src/data/reporting/pages/migrate.test.ts`, passing this run |
| AC-1181 | ✅ | `src/lib/markdown/parse.test.ts` + `render.test.tsx`, passing this run |
| AC-1182 | ✅ | same files — `javascript:` link handling asserted |
| AC-1183 | ✅ | `render.test.tsx` — `bdi` wrapper assertion |
| AC-1184 | ✅ | `parse.test.ts`/`render.test.tsx` — size-cap truncation asserted |
| AC-1185 | ✅ | `blockFrame.accessibleName.test.tsx` (F-V2-87), plus live: two fresh `Text` blocks got `"Text 1"`/`"Text 2"` (`pages-v2.mjs`, this session) |
| AC-1186 | ✅ | `blocks/reportBlock.test.tsx`, passing; live: `DSH-1`'s report block rendered its chart, loading skeleton pattern (`LoadingSkeleton pattern="P5"`) and error/invalid/missing branches read at `ReportBlockView.tsx:66-95` |
| AC-1187 | ✅ | `applyBoardScope.test.ts`, `reportBlock.test.tsx`, `PageScopeBar.test.tsx`, all passing |
| AC-1188 | ✅ | `blocks/metricBlock.test.tsx` passing; code read confirms `ABSENT` sentinel used, never `0` (`MetricBlockView.tsx:73`, `import { ABSENT } from '@/lib'`) |
| AC-1189 | ✅ | `blocks/alertStatusBlock.test.tsx` passing; `STATE_TONE` maps `firing`→`warning` per R7 (`AlertStatusBlockView.tsx:89-95`) |
| AC-1190 | ✅ | `blocks/agentInsightBlock.test.tsx` passing |
| AC-1191 | ✅ | `blocks/bookmarkBlock.test.tsx` passing |
| AC-1192 | ✅ | `blocks/toggleBlock.test.tsx` passing; code read confirms `<button aria-expanded>` + native `hidden` (`ToggleBlockView.tsx:21-24,42`), which removes closed content from the a11y tree, not just visually |
| AC-1193 | ✅ | `screens/pages/pageDetail.test.tsx` passing (page-with-no-blocks sentence); pages-index first-run illustration covered by `pagesIndex.test.tsx` |
| AC-1194 | ✅ | `PageDetailScreen.tsx:74-83` — `pages.get` failure renders the page-level `ErrorState`; a block's own failure is handled inside `ReportBlockView`/`MetricBlockView`'s own branches (AC-1186), never surfaced as a page error |
| AC-1195 | ✅ | Live: view mode shows exactly one primary (`Edit`), edit mode shows exactly one (`Done`) — screenshotted both, `pages.mjs` this session; `PageView.tsx:178-184`'s `primaryAction` is a single object gated on `canEdit` |
| AC-1196 | ✅ | Live, keyboard-only: `Tab` reached the first `Add block` affordance, `Enter` opened the picker with a search box (`pages-v2.mjs`, `[OK]` both checks) |
| AC-1197 | ⚠️ partial | `addBlockPicker.test.tsx` covers the `/`-opens-picker half; **`Escape` restoring the caret was not independently re-verified this session** (jsdom can assert the picker closes, not real caret position — see Unrun) |
| AC-1198 | ✅ | `blockMenu.test.tsx`, `blockFrame.keyboard.test.tsx` passing; live: opened the kebab on `blk-TIL-1`, read every item (`Move up` disabled with `"Already the first block."` inline, `Move to column…`/`Turn into…` real submenus since both have legal targets) — matches `BlockMenu.tsx:86-216` exactly |
| AC-1199 | ✅ | Live, keyboard-only, all four: `Alt+ArrowDown` moved the focused block one slot (DOM order before/after diffed), `Ctrl+D` duplicated (+1 block), `Delete` removed it and showed one toast with an `Undo` element present (`pages-v2.mjs`, all `[OK]`) |
| AC-1200 | ✅ | Live: `Ctrl+Z` after `Delete` restored the block count exactly (`pages-v2.mjs`, `[OK]`) |
| AC-1201 | ⚠️ partial | `pageEditorAutosave.test.tsx` passing (fake-timer proof of the 800ms coalesce + `Saving…`/`Saved · <time>` copy swap); **the literal 800ms was not independently re-timed against a real clock this session** (jsdom fake timers only) |
| AC-1202 | ⚠️ code-only | `pageEditorAutosave.test.tsx` passing; **a live 409 could not be produced this session** — `savePage`'s mock store (`src/data/clients/pages.ts`) is per-page-load module state (`DATA_SOURCE==='mock'` default), so two independent browser contexts never collide the way two operators sharing a real backend would. Verified instead by code: `usePageEditor.ts`'s `reload()` (lines 160-167) re-stamps `versionRef` from the conflict and explicitly re-sends `content` unchanged — the exact fix F-V2-70 needed (previously `reload()` touched neither of the autosave effect's dependencies, so a kept edit was never resent and was lost on navigation) |
| AC-1203 | ✅ | `textBlockEditing.test.tsx` passing; code read confirms all four marks (`bold`/`italic`/`link`/`list`) wrap the selection (`TextBlockEditor.tsx:61-85`) and preview renders on blur |
| AC-1204 | ✅ | `reportPickerPanel.test.tsx` passing; live: opened the `Report` picker inline, `New report` renders as a real `<Link to="…?pinTo=<pageId>">` (`ReportPickerPanel.tsx:96-98`) |
| AC-1205 | ✅ | `builderPinTo.test.tsx` passing |
| AC-1206 | ✅ | `turnInto.test.tsx` passing; code read confirms `retype()` (`usePageEditor.ts:267-279`) keeps `reportId` across `report ↔ metric` |
| AC-1207 | ✅ | `blockOps.test.ts` — `turnIntoColumns — AC-1207` describe block, passing; original block placed on the start-side column |
| AC-1208 | ✅ | Code read: `ColumnsWidthControl.tsx:33-38` computes `overflow = otherColumnsWidth + option.width > 12` and disables exactly those options, with the reason on a shared `aria-describedby` (`pg-columns-overflow`); live screenshot (`page-en-light-edit.png`) shows both columns' segmented controls at ½ with some options visibly disabled |
| AC-1209 H | ✅ product / ⚠️ proof gap | The two-column case at 1280 and 1344 is real (screenshots `columns-1344-wide.png`, `columns-1280-stacked.png` — both show two columns side by side, correct per O1's "`wide:` inclusive from 1280"). **The stacked case, which by the AC's own restated text is only provable at 1279, is not proven by any committed harness or test in the repo** (grepped for `1279` across `scripts/harness/*.mjs` and `src/components/pages/*.test.tsx`: zero hits). Checked this session with a one-off, uncommitted script: at 1279 the columns do stack (same `left`, stacked `top`s) — the product is correct, the proof artifact is missing, and the existing screenshot is misleadingly named `columns-1280-stacked.png` when it shows the non-stacked case. See visual report. |
| AC-1210 | ✅ | `screens/pages/pageDetail.test.tsx` passing (redirect/alias coverage) |
| AC-1211 | ✅ | `pagesIndex.test.tsx` passing (all five views + `Draft` badge) |
| AC-1212 | ⚠️ pinned `it.fails`, confirmed live | The pin (`pagesIndex.test.tsx:191-209`, F-V2-85) is exactly what the live check found: **the navigate-to-edit-mode mechanism is fixed and works** — live check this session on a real "Monday morning" template: `New page → From template → Monday morning` landed on `…/pages/PAGE-87?edit=1`, rendered with `Done` visible (`Edit` absent, i.e. genuinely in edit mode) and `Draft`/`Owned by USR-1` in the header. **What still fails is the title**: the draft is titled `"Monday morning copy"`, not `"Monday morning"` (the template's own title) — `duplicatePage` (`src/data/clients/pages.ts`) appends `" copy"` unconditionally, including for a from-template draft. This is a product/copy question (does a template copy keep the template's exact title, or get the usual "X copy" suffix like any duplicate?), not a broken mechanism. The pin should **not** be read as a pass — the test's own assertion fails for a real reason — but it should also not be read as "navigation is broken," which it is not. |
| AC-1213 | ✅ | `pagesIndex.test.tsx` passing |
| AC-1214 | ✅ | `pagesIndex.test.tsx` passing; `PageView.tsx:286-287`'s confirm dialog names only the page (`pg.index.delete.body` = "This removes the page. No report on it is deleted.") |
| AC-1215 | ✅ | `pagesIndex.test.tsx` passing |
| AC-1216 H | unrun, by design | Optional per spec ("If the phase runs late, WP-4.6 is dropped without any other change"). No drag-and-drop code found in `src/components/pages/**` (grepped for `draggable`, `onDragStart`, `dnd` — zero hits), consistent with it having been dropped rather than half-built. The keyboard path it would have supplemented (`Alt+↑`/`Alt+↓`) is unaffected and fully proven above. |
| AC-1217 H | ✅ | `scripts/harness/pages-print.mjs` (pre-existing, WP-4.7) — not re-run this session (outside this work package's new-evidence remit); build log records it green. Not independently re-verified here; treat as carried forward, not newly proven. |
| AC-1218 | ⚠️ unrun for pages specifically | Key-set parity confirmed exact: `grep -oE "'pg\.[a-zA-Z0-9_.\-]+'"` against `src/screens/pages/copy.ts` and `src/i18n/ar/pages.ts` — **150 keys each side, zero diff** (this session). The pseudo-locale mechanism itself (`src/lib/i18n/pseudo.ts`/`pseudo.test.ts`) is generic and was not found to reference `pg.*` keys specifically, so the "+35%, no clipped label on the block menu" half of this AC was not independently exercised against the Pages screens this session. |
| AC-1219 | ✅ | Live + screenshot, both halves: (1) block handle/menu mirror — RTL geometry `{"frameLeft":32,"frameRight":904,"handleLeft":883,"menuLeft":37}`, handle 21px from the right edge, kebab 5px from the left edge (`pages-v2.mjs`, both `[OK]`); (2) columns order mirrors — comparing `page-en-light-view.png` to `page-ar-light-view.png`, the first-in-DOM column ("Completed trips by pickup district") renders at the visual right under RTL and the second ("New subscriptions by plan") at the visual left, the correct mirror, achieved by CSS Grid's own RTL auto-placement with no explicit `grid-column` pin in `ColumnsBlockView.tsx` |

## Summary

- **31 of 39 criteria fully met**, evidenced by a fresh, passing test run plus live keyboard/
  browser proof for everything this role's brief asked to be walked by hand.
- **5 partial** (AC-1197, AC-1201, AC-1202, AC-1209, AC-1218) — in every case the underlying
  mechanism is real and either test-covered or code-confirmed; what's missing is a specific
  proof artifact (real caret position, real-clock timing, a live 409, a 1279px screenshot, a
  pages-scoped pseudo-locale run) rather than a known defect.
- **1 correctly pinned, confirmed rather than assumed** (AC-1212) — the mechanism works, the
  title does not match the template's own, and that is a product question (F-V2-85), not this
  audit's to resolve.
- **1 out of scope by design** (AC-1216, optional and dropped per spec).
- **1 carried forward, not re-proven** (AC-1217, pre-existing green harness, not re-run this
  session).

Nine defects surfaced by this work package that are **not** captured by the AC table above
(because the ACs don't test for them) are in the a11y and visual reports: the two blocking
focus-visibility/management findings, the callout-tone contrast/signal failure, the missing
`Shift+F10`, the report-picker's non-functional `Escape`, focus abandoned to `<body>` after
`Delete`, and the `columns-1280-stacked.png` mislabel.
