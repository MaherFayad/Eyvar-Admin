# Performance handoff — WP-8.4 fix-up

Acting on `docs/02-verification/analytics-v2-performance.md`. Scope: `src/screens/reports/ReportsScreen.tsx`,
the i18n **loader** (`src/i18n/dictionaries.ts`, `src/lib/i18n/**`), `vite.config.ts` (chunking only),
`scripts/harness/analytics-v2-perf.mjs`. Every number below is from a real `npx vite build` into a
scratch `outDir` (never the repo's `dist/`) and, where marked "Chromium", a Playwright run against
`vite preview` of that build.

## 1 · `AlertsView` no longer pulls recharts into every reports visit — fixed, with one disclosed exception

**What changed**

- `src/screens/reports/ReportsScreen.tsx` — `AlertsView` is now `lazy()`-loaded and wrapped in
  `<Suspense fallback={<LoadingSkeleton pattern="P1" />}>` where it renders (the `alerts` view branch).
  The fallback is the same skeleton family `routes.tsx`'s route-level `Chunk` already uses — a real
  loading shape, not a blank pane, per R3.
- `src/screens/reports/index.ts:18` — changed from a **value** re-export to a **type-only** one:
  `export type { AlertsViewProps } from './AlertsView'`. This is the one line outside my named file set
  I edited, and I disclose it here rather than hide it (see "The one boundary exception" below).
- `vite.config.ts` — added `build.rollupOptions.output.manualChunks`, with exactly one rule: force
  `src/components/metrics/formatMetric.ts` into its own chunk (`metric-format`). Nothing else about
  chunking changed; every other chunk still follows Rollup's default automatic splitting.

**Why the barrel line had to move too**

`AlertsView.tsx` was reachable from the `@/screens/reports` entry two ways at once: dynamically
(my new `lazy()` in `ReportsScreen.tsx`) and statically (`index.ts:18`, the barrel's own
`export { AlertsView, ... } from './AlertsView'`). Rollup's own warning, verbatim from the build log:

```
(!) AlertsView.tsx is dynamically imported by ReportsScreen.tsx but also statically imported by
    screens/reports/index.ts, dynamic import will not move module into another chunk.
```

A module reachable both ways from the same entry stays in that entry's synchronous chunk — `lazy()`
alone does nothing. I grepped every file outside `src/screens/reports/` for `AlertsView` and
`AlertsViewProps`; the only two hits (`AlertStatusBlockView.tsx`, `PanelCard.tsx`) are **comments**
naming the file, not imports of the binding. Nothing loses the export. Confirmed with a module-graph
diagnostic (a scratch Rollup `generateBundle` plugin, not a grep) before and after:

| | Before (barrel unedited) | After |
|---|---|---|
| Facade chunk (`ReportsScreen`+`ReportLibrary`+`AlertHistoryDialog`+`DashboardDetailScreen`) | fused with `AlertsView`, imports `chart-*.js` | 16,470 B / 5.57 KB gzip, **no** import of `chart-*.js` |
| `AlertsView` (+`AlertFeedView`) | — | its own chunk, 17,610 B / 5.94 KB gzip, imports `chart-*.js` |

**Why `metric-format` needed splitting too**

Even with the barrel fixed, the facade chunk still opened with `import{f as D}from"./chart-*.js"`.
`D` is `formatMetricValue` (`src/components/metrics/formatMetric.ts`) — `AlertHistoryDialog.tsx`
deep-imports it specifically to avoid recharts (see the comment three lines above that import), but
Rollup's default splitting had fused `formatMetric.ts`'s compiled output into the recharts chunk
anyway, because most of its *other* callers are chart-heavy. The deep import protected the **module
graph**; it did nothing about the **chunking heuristic**. `manualChunks` forces the one module that
matters into its own 23,370 B / 9.38 KB gzip chunk. Confirmed: the facade chunk now imports
`metric-format-*.js`, never `chart-*.js`.

**The one boundary exception, disclosed**

`src/screens/reports/index.ts` is not in this work package's file set. I edited one line in it anyway,
because without that line the fix does not work at all — `ReportsScreen.tsx`'s own `lazy()` is
provably inert while the barrel keeps a static value re-export. Before touching it I checked
`git status --short src/screens/reports/index.ts` (clean, no concurrent edits) and grepped for every
consumer of the exported value (none outside the file itself). If this was the wrong call, the fix is
a one-line revert of that file plus removing the `lazy()`/`Suspense` wrapper's usefulness — everything
else in this handoff is unaffected.

**Chromium result — reports a second, independent, pre-existing cause I did NOT fix**

`scripts/harness/analytics-v2-perf.mjs` §5 (new) drives a `vite preview` of the final build and checks
real network requests for `/assets/chart-*.js`:

```
"rechartsOnPlainLibraryVisit": { "chartChunkRequests": 1, "verdict": "FAIL recharts fetched on a plain visit" },
"rechartsOnAlertsVisit":       { "chartChunkRequests": 1, "verdict": "PASS recharts fetched when Alerts opens" }
```

The Alerts half passes. The plain-visit half still fails, and it is **not** the AlertsView path —
the module-graph check above proves that path is clean. Root cause, found the same way as the
`AlertsView`/barrel issue: `ReportsScreen.tsx` statically imports `ReportBuilder` (mine to import,
not mine to edit — `ReportBuilder.tsx` is explicitly another agent's file), whose own dependency
`ResultCanvas.tsx` **statically** renders `<SeriesChart>` and `<DistributionCard>` (`ResultCanvas.tsx:88,100-104,1054`).
`ReportModeCanvas.tsx` already has `LazySeriesChart`/`LazyDistributionCard` (lines 90-95) for its own
funnel surfaces, but that lazy boundary is defeated the identical way AlertsView's was: `SeriesChart.tsx`
and `DistributionCard.tsx` are *also* statically re-exported from `src/components/reports/index.ts`,
and statically imported by `ResultCanvas.tsx` and `SeriesHeadlines.tsx`. Rollup's own warning names all
three:

```
(!) DistributionCard.tsx is dynamically imported by ReportModeCanvas.tsx but also statically imported by
    ResultCanvas.tsx, components/reports/index.ts, dynamic import will not move module into another chunk.
(!) SeriesChart.tsx is dynamically imported by ReportModeCanvas.tsx but also statically imported by
    ResultCanvas.tsx, SeriesHeadlines.tsx, components/reports/index.ts, dynamic import will not move
    module into another chunk.
```

This is the exact same mechanism, one layer deeper, in a file family (`ResultCanvas.tsx`,
`SeriesHeadlines.tsx`, `components/reports/index.ts`, `ReportBuilder.tsx`) that belongs to the
ResultTable/ChartToolbar/ReportBuilder owners named in the work package, not to me. Unlike
`AlertsView`, `ResultCanvas` is the **primary** chart surface of the whole screen — recharts is
genuinely, unconditionally needed whenever a composed report with a chart is open, which is most of
what `/management/reports` is for. Deferring it would mean lazy-loading `ReportBuilder` itself from
`ReportsScreen.tsx`, a materially bigger change (Suspense around the screen's main experience, not an
optional sub-view) that I did not make unilaterally. Named here rather than fixed; the fix pattern is
identical to what I already applied twice above, so it is at least a known quantity for whoever owns
those files.

**Numbers**

| Chunk | Before (audit baseline) | After |
|---|---|---|
| Entry (`index-*.js`) | 2,803,076 B / 756.93 KB gzip | 2,783,428 B / 749.11 KB gzip |
| `chart-*.js` (recharts) | 248,030 B / 79.76 KB gzip | 246,500 B / 79.21 KB gzip |
| Reports facade | fused into a larger chunk | 16,470 B / 5.57 KB gzip |
| `AlertsView` (own chunk) | n/a (fused) | 17,610 B / 5.94 KB gzip |
| `metric-format` (new) | n/a | 23,370 B / 9.38 KB gzip |

## 2 · AC-1298 — the reports chunk

**The audit's own baseline number is wrong, and here is the proof.** §1.2 of
`docs/02-verification/analytics-v2-performance.md` names `index-BQpQBRud.js` (414,597 B) as "the
reports chunk" — identified by grepping every chunk for the highest count of `rb\.[a-zA-Z0-9.]*`
substrings. I rebuilt with a scratch Rollup `generateBundle` plugin that reads each chunk's real
`modules` map (the module-to-chunk ground truth, not a string grep) and that exact byte count
(414,597 / 414,633 across my rebuilds — deterministic) belongs to a **completely different chunk**:

```
=== assets/index-DGK8zJLT.js (410,727 bytes, 42 modules) ===
   /src/data/types/request.ts
   /src/data/types/fairness.ts
   /src/data/types/payment.ts
   /src/data/fixtures/reports.ts
   /src/data/fixtures/agent.ts
   /src/data/fixtures/alerts.ts
   ... +36 more (all src/data/types/* and src/data/fixtures/*)
```

This is the shared `src/data/fixtures` + `src/data/types` barrel — mock domain data and types for
the whole app, not reports UI. It false-matched the grep because fixture files and type names are
full of literal strings and identifiers that begin `rb.` at high enough density to look like a
translation-key chunk. The same chunk exists at P0 (`index-Cel5ajNQ.js`, 385,905 B — verified the
same way, same module family) and grew from 385.9 KB → 410.7 KB (**1.06×**) as the whole app added
domain fixtures across the v2 build — unrelated to reports specifically.

**The genuine P0 reports chunk**, found the same ground-truth way, building P0 (`eac3d90`) in an
isolated `git worktree` per the audit's own method: `index-mBWdYsy3.js`, **163,685 B / 41.61 KB
gzip** (matches the audit's own cited P0 number, so P0's half of the ratio was right — only the P8
comparator was wrong). Its modules are *every* reports screen and component file that existed at P0,
plus eight specific recharts modules — one undifferentiated chunk, because no code-splitting existed
inside reports at all yet.

**The corrected P8 comparison.** After analytics-v2, that undifferentiated P0 chunk's equivalent is
split three ways — the facade and `AlertsView` chunks from §1 above, plus `blockOps` (`ReportBuilder`,
`ResultCanvas`, `SeriesChart`, and everything else on the compose/view/edit path — **also now shared
with Pages' block editor**, a deliberate new integration point: a report block embedded in a
dashboard page reuses these same components). recharts itself is now a clean, separately-loaded
chunk in every one of these paths (confirmed above), so it is excluded from both sides of this
comparison rather than double-counted.

| View | Raw | Gzip | Ratio vs P0 (163,685 B / 41.61 KB) |
|---|---|---|---|
| **Narrow** — facade + `AlertsView` only (genuinely reports-exclusive) | 34,080 B | 11.51 KB | **0.21× raw / 0.28× gzip** |
| **Broad** — narrow + `blockOps` (includes what Pages now shares) | 259,870 B | 71.14 KB | **1.59× raw / 1.71× gzip** |

**Verdict: passes by stated reason, not by size.** The broad figure — the more conservative reading,
since it charges the reports feature for code Pages also now benefits from — is over the 1.5×
ceiling. I did not trim anything to force it under; the criterion's own escape hatch is a named
reason, and there is a real one, backed by the actual per-module weight inside `blockOps` (measured
via the same `generateBundle` diagnostic, pre-minification source bytes — the honest way to attribute
weight *before* Rollup/Terser's cross-module scope hoisting stops it being separable):

| Contributor | Source bytes | What it is |
|---|---|---|
| `AlertRuleDialog.tsx` | 48,983 | The v2 alert composer — four condition kinds, cadence, severity gating, the money/threshold form (AC-1225…1239). No P0 equivalent at this size. |
| `ReportBuilder.tsx` + `ReportModePanel.tsx` + `ReportModeCanvas.tsx` | 40,700 + 32,492 + 27,988 = 101,180 | The three-mode rail (table / trend / funnel) v2 added |
| `ResultTable.tsx` + `ResultCanvas.tsx` + `SeriesChart.tsx` | 31,273 + 26,882 + 23,579 = 81,734 | Nine chart types, fixed comparisons, the primary chart surface |
| `QueryPanel.tsx` + `SegmentPicker.tsx` | 19,377 + 15,264 = 34,641 | Segments and two-level splits |
| `WindowControl.tsx` | 17,357 | The window/comparison presets |
| `PanelCard.tsx` + `PanelChart.tsx` + `ChartToolbar.tsx` + `DistributionCard.tsx` | 19,366 + 10,991 + 10,507 + 10,450 = 51,314 | Per-panel chrome across the nine chart types |
| `chartPng.ts` | 5,863 | PNG export |
| recharts `Brush`/`Pie`/`ReferenceArea`/`PolarChart` pulled directly into this chunk | ~62,880 | Chart-type-specific recharts pieces not shared with the separate `chart-*.js` |

These sum to more than the chunk's own minified size because minification and scope-hoisting compress
overlapping code the source-byte count can't show — they're presented as **relative** weight, the same
caveat the original audit's own grep-based method carried.

**A further reduction exists and is out of scope for me.** `ReportModeCanvas.tsx` already lazy-loads
`SeriesChart`/`DistributionCard` for its own funnel surfaces (`LazySeriesChart`/`LazyDistributionCard`,
lines 90-95) — the identical pattern I used for `AlertsView`. That boundary is defeated the same way
`AlertsView`'s was, by static re-exports in `components/reports/index.ts` or `ResultCanvas.tsx`
(§1's Chromium finding). Applying the same barrel fix there is the next lever, and it is real: it
would let `ResultCanvas`'s *own* rendering stay eager (it has to — it's the primary chart surface)
while letting things like `SegmentPicker`, `TransformControls`, `AnnotationForm` and the brush
(`WindowControl`) defer until an operator actually reaches them. I did not do this because
`ResultCanvas.tsx`, `SeriesHeadlines.tsx` and `components/reports/index.ts` are outside my file set
(owned by the ResultTable/ChartToolbar/ReportBuilder agents).

## 3 · The i18n dictionary — stopping, with measurements

**What I measured.** The entry chunk carries ~1.15 MB of pre-minification i18n source
(`/src/i18n/ar/**`: 462,902 B across 49 files; every screen's English `copy.ts`/`Copy.ts`: 625,696 B
across 40 files; `dictionaries.ts`'s own inline dictionaries plus `translate.ts`/`plural.ts`/etc.:
58,826 B) against an entry total of 4,824,888 B pre-minification source — **about 24% of the entry's
source weight is translation copy, both languages, every namespace.** The Arabic half alone
(`/src/i18n/ar/**`) is 462,902 of that 1,147,424 B, **about 40% of the i18n weight / 9-10% of the
entry chunk's total weight** — real, but not the dominant cost (the English-side screen dictionaries
are actually larger, because every screen currently has to ship its own English strings into the
entry regardless of language, for reasons below).

**Why I am not attempting a lazy-load split, and where the blocker actually is.** `dictionaries.ts`'s
own header (lines 1119-1150) already documents a **prior, closely-related attempt that was tried and
reverted**: splitting per-*namespace* (removing a screen's dictionary from the eager `EN` spread) kept
surfacing another synchronous shell-level consumer — ⌘K resolves every domain's command labels while
a different workspace is open, the report builder's shareable `?q=` link resolves report copy before
`ReportsScreen` has mounted, `AC-14` reaches Dispatch copy from a shell assertion — and iterating to
green meant discovering that list by breakage. Splitting per-*language* (this task) is a different
axis, but hits a structurally identical wall one layer down, and it's a wall inside files this work
package does not name:

- `useLanguageState` (`src/hooks/useLanguage.ts:65-68,92-99`) takes `dictionaries:
  Readonly<Record<Language, Dictionary>>` as a **plain, already-resolved synchronous object** — not a
  promise, not a loader function. `translatorFor` (line 117-130) reads `dictionaries[which]`
  directly inside a `useCallback`.
- `ShellContext.tsx:350` calls `useLanguageState({ dictionaries: DICTIONARIES })` exactly once, at
  mount, with both languages already resolved.

Making only the *inactive* language lazy (load `en` synchronously, `import('./ar')` only on first
switch to Arabic, or before first paint when the stored preference is already `'ar'`) is the right
shape, but it cannot be expressed inside `src/i18n/dictionaries.ts` alone: whatever loads `AR`
asynchronously has to make `useLanguageState`/`ShellContext` **wait** for it (when `ar` is the active
language) and **re-render with a real translator** once it resolves (when the operator switches to
it) — both `src/hooks/` and `src/shell/` are outside this work package's file set, and `src/i18n/dictionaries.ts`
is explicitly a **shared, append-only file** per `AGENT-BRIEF.md` that another agent is adding keys to
right now — restructuring its `AR`/`DICTIONARIES` export shape is the opposite of a small, anchored
edit.

There is also a real first-paint risk the task explicitly warns against: naively wrapping the app's
root in `Suspense` for a dictionary fetch would deploy correctly for the common case (English) but
put a *visible* loading state in front of every Arabic-preferring operator's every cold load, on a
shared layer every screen depends on — exactly the kind of regression that is hard to catch in a
component-level review and easy to catch only in a live RTL smoke test, which is visual-qa territory,
not mine to sign off alone.

**Stopping here**, per the task's own explicit allowance. Measurements above are what a future attempt
needs: the win is real but modest (~9-10% of entry weight, not the ~24% the full i18n system costs),
the bigger win (per-namespace splitting) is already-attempted-and-reverted for a documented reason,
and the mechanical blocker is two files outside this work package that would need to move together
with `dictionaries.ts` for the change to be safe.

## Commands run

```
npx vite build --outDir <scratch>/dist-final      # final build this handoff's numbers come from
npx vite preview --outDir <scratch>/dist-final --port 4362 --strictPort
HARNESS_BASE=http://localhost:4362 node scripts/harness/analytics-v2-perf.mjs
npm run typecheck
npm run i18n:check
npm test
npx vitest run src/screens/reports src/i18n     # targeted re-run for this work package's files
```

## Files

- Created: `docs/09-analytics-v2/handoffs/performance.md` (this file)
- Modified: `src/screens/reports/ReportsScreen.tsx`, `src/screens/reports/index.ts` (one line,
  disclosed above), `vite.config.ts`, `scripts/harness/analytics-v2-perf.mjs` (new §5, appended
  after another agent's concurrent §... additions — did not touch their content)
- Not modified, named as the next owner's lever: `src/components/reports/index.ts`,
  `src/components/reports/ResultCanvas.tsx`, `src/components/reports/SeriesHeadlines.tsx`,
  `src/screens/reports/ReportBuilder.tsx` (§1's second recharts path, §2's further-reduction lever)
- Not modified, named as the i18n blocker: `src/hooks/useLanguage.ts`, `src/shell/ShellContext.tsx`
