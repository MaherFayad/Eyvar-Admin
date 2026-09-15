# Analytics v2 chart surface — visual verdict (WP-2.9)

**Scope** The nine chart types (line, bar, area, stacked-bar, stacked-100, horizontal-bar,
KPI, table, the compound plot), the legend, the tooltip, the View menu, axis options,
annotations, the brush, the toolbar, PNG export, and the Reports Library.
**Built to** `docs/09-analytics-v2/02-report-builder-v2.md` §3–§9, AC-1130…AC-1166
(`07-acceptance-criteria.md`). Standing owner ruling: Amplitude fidelity outranks
`DESIGN.md` here (`RULINGS.md`).
**Probe** `scripts/harness/reports-v2.mjs` (extended this pass — see below),
`scripts/harness/reports-export-png.mjs`, `scripts/harness/reports-chrome.mjs`. Chromium via
Playwright, `HARNESS_BASE=http://localhost:4327`, `npx vite --port 4327` started fresh for
this pass.
**Runs** light/dark × en/ar for area, stacked-bar, stacked-100, horizontal-bar, kpi (RPT-14…
RPT-18); en/ar for the ≥8-group split (RPT-20) and stacked+comparison (RPT-21); 1280/1440 for
label density; the Reports Library/Dashboards/Alerts index at 1280×800, en/ar.
**Tree** `0af9a5e`, clean at the start of this pass (`git status` empty). Three files moved
under me mid-pass exactly as the brief warned (`src/components/reports/modeMemory.test.tsx`,
`src/components/table/rowActions.tsx`, `src/screens/reports/autorun.test.tsx`) — none of them
is cited below.

---

## Verdict

**One blocking finding. It should not merge with `stacked-100`'s axis reading past 100.**
Everything else in the chart surface — the nine chart types across both themes and both
languages, the legend, tooltip, annotations, brush, INERT, the eight-hue palette, token
conformance — is clean, much of it clean by a margin I initially mis-read from a screenshot
and only trusted after measuring pixels directly (see the annotation-contrast note below).
Two should-fix findings on the Reports Library table are column-width problems, not chart
defects, and may already be moving under the concurrent `DataTable.tsx` repair named in the
brief — flagged for reconciliation rather than assumed fixed.

---

## Findings

| # | Severity | Rule | Observed | Evidence | Suggested fix |
|---|---|---|---|---|---|
| **V1** | **Blocking** | AC-1133; `02-report-builder-v2.md` §4.1 ("the y-axis reads `0–100 %`") | `stacked-100`'s y-axis is not domain-clamped. On RPT-16 the axis draws ticks `0%, 30%, 60%, 90%, 120%` — Recharts' default "nice" padding extends 20% past the data's own 100 maximum, so a 100%-stacked chart visually implies a bar could exceed its own whole. Root cause read at source: `SeriesChart.tsx:181` forces `startAtZero` for `kind === 'stacked-100'`, and `SeriesChart.tsx:300` sets `domain={... startAtZero ? [0, 'auto'] : ...}` — `'auto'` on the max, never `100`, for every bar family including `stacked-100` | `scripts/harness/shots/v2-stacked-100.png`, `v2-stacked-100-dark-en.png`; `reports-v2.mjs` — new check, **FAILS**: `AC-1133 the y-axis domain is clamped to 0–100, not padded past it — highest tick: 120%`. Only reachable in a real browser: `chartSurfaceV2.test.tsx` has no AC-1133 test at all, because jsdom draws no axis ticks to assert on | `SeriesChart.tsx`'s `domain` prop needs a `kind === 'stacked-100' ? [0, 100] : …` branch, distinct from the shared `startAtZero` bar-family case |
| **V2** | Should-fix | Table header legibility (no numbered rule; a column header is unreadable) | Reports Library's `Visibility` column header (`ReportLibrary.tsx:283-285`, `width: 100`, label from `copy.ts:961`) renders 84px wide at 1280 and wraps mid-word: `Visibilit` / `y`, with the `y` spilling below the header row's own boundary. Confirmed by cropping the exact region, not by eye on the full-page capture | `scripts/harness/shots/reports-library-en.png` (top-right of the header row); DOM measurement: `th` width 84px, inner `<span class="min-w-0 overflow-hidden">Visibility</span>` with no `white-space: nowrap`, so it wraps rather than truncates | Widen the column, or give the header cell `whitespace-nowrap` + truncation like the identity column already has, or shorten the label. Route through whoever owns `DataTable.tsx`'s header-cell CSS if that repair already covers it — the brief named two agents fixing that file concurrently |
| **V3** | Should-fix | Row-pitch consistency (`table.md`'s documented 41px single-line baseline) | Reports Library's `Last run` column (`ReportLibrary.tsx:268-278`, `width: 130`) is too narrow for `formatDate(..., 'day-month-time')` on one line, so **every** visible row wraps its date and time onto two lines — measured **19/19 rows** over the one-line threshold in both languages (57px en / 65px ar against the 56px one-line ceiling; `table.md`'s own baseline for a single-line row is 41px). This is an unintentional width-driven wrap, not the declared secondary-line pattern `carriesRefusalReason` describes | `scripts/harness/shots/reports-library-en.png`, `reports-library-ar.png`; `reports-chrome.mjs` output: `library/en {"rows":19,"heights":[57×19],"overOneLine":19,...}`, `library/ar {"rows":19,"heights":[65×19],"overOneLine":19,...}` | Widen `Last run` past 130px, or use a shorter date format for the column, matching whatever width the format needs on one line |

### Resolved, not filed as defects

- **F-V2-67 answered: `--chart-s7` and `--chart-s8` are reached and drawn.** RPT-20 (an
  eight-group split) renders nine distinct fill colours — eight named hues plus `Other` —
  measured via computed `fill` on every `g.recharts-bar`: `rgb(12,105,68)`, `rgb(109,56,153)`,
  `rgb(181,125,28)`, `rgb(116,47,101)`, `rgb(43,77,212)`, `rgb(17,147,176)`, `rgb(43,102,26)`,
  `rgb(243,27,106)` (eight distinct), then `rgb(92,99,110)` which equals the computed
  `--muted-foreground` on the same page. `scripts/harness/shots/v2-eight-hues-and-other.png`.
  Not "may still never have been drawn" — it is drawn, in the fixture set, reachably.
- **Annotation marker contrast — measured, not eyeballed.** A screenshot thumbnail of
  `v2-area-light-en.png` made the annotation hairline (`AnnotationMarks.tsx:81`,
  `background: var(--chart-axis)`) look faint against the pale area fill compared to the same
  mark in dark. Sampled actual rendered pixels at the mark (decoded the PNG bytes directly,
  not CSS `background-color`, since the fill is SVG-painted): light **5.216:1**, dark
  **5.867:1**, both against the fill immediately either side of the line. Both clear WCAG
  1.4.11's 3:1 floor for a non-text graphical object with margin to spare. Not a finding — an
  impression corrected by measurement, per `verify.md`'s own warning against trusting resting
  pixels.
- **D33b's light-theme card ceiling** — a chart card's computed background on RPT-1
  (`rgb(250,251,252)`) against the page (`rgb(255,255,255)`) measures **1.036:1**. That is
  the documented, intentional `--ev-surface` value (`globals.css:319, 337`: "a card is at most
  **1.03-ish under the page** (`#fafbfc`, 1.036)"), not a violation of D33b's ceiling — reporting
  it as a defect would have been exactly the "documented decision read as an oversight" trap
  `verify.md` names.
- **`horizontal-bar`'s value label sits at a fixed physical `right`** (`SeriesChart.tsx:662,
  686`, `margin.right: 48`, `LabelList position="right"`), unchanged between English and
  Arabic. This is correct, not a leaked physical direction: `rtl.md` states plainly that chart
  plot areas and axes do not mirror. AC-1134's "inline-end side in Arabic" describes this same
  fixed position, which happens to coincide with English's inline-end because neither language
  mirrors the plot.

---

## Pass 1 — token conformance

`src/components/reports/`, `src/screens/reports/`, `src/lib/chartPng.ts`, non-test files:

| Check | Result |
|---|---|
| Tailwind palette classes (`bg-blue-500`, `text-gray-400`, …) | **none** |
| Arbitrary values (`[12px]`, `[#fff]`) | **none** |
| Raw hex | **none** |
| Physical direction utilities (`ml-`, `pr-`, `border-l-`, `text-left`, …) | **none** |
| `outline-none` without a paired `focus-visible:ring-*` | **none** — all 16 occurrences pair `focus-visible:ring-2 focus-visible:ring-ring` on the same class string (`AnnotationMarks.tsx:69`, `PanelCard.tsx:693,814`, `ResultCanvas.tsx:1147,1186`, `ResultTable.tsx:965`, `SeriesChart.tsx:421`, `AlertFeedView.tsx:245`, `AlertRuleDialog.tsx:882,1020`, `AlertsView.tsx:617`, `ReportBuilder.tsx:1177,1191`, `ReportModeCanvas.tsx:327`) |
| Red carrier outside R5a's four uses | **none found.** Every `red`/`critical` hit in these files is either a comment citing R5a/R7 as the reason something is *not* red, or a disabled `Critical` severity tab (`AlertRuleDialog.tsx:863`) — matches Q-RB-9 |
| `div` with `onClick` where a `<button>`/`<a>` belongs | **none found** |

## Pass 2 — the nine chart types, both themes, both languages

All from `reports-v2.mjs`, this run:

| Chart | light/en | light/ar | dark/en | dark/ar | Notes |
|---|---|---|---|---|---|
| `area` | pass | pass | pass | pass | Gap-break and partial-bucket scrim render (`v2-area-*.png`) |
| `stacked-bar` | pass | pass | pass | pass | Comparison draws as unfilled dashed outline behind the stack, never inside it (AC-1132) |
| `stacked-100` | pass* | pass* | pass* | pass* | Renders with no console error in all four, but **V1** — axis exceeds 100 in every one |
| `horizontal-bar` | pass | pass | pass | pass | Descending sort, `Other` last, both languages (AC-1134) |
| `kpi` | pass | pass | pass | pass | Rolled-up value, neutral delta, sparkline (AC-1135) |
| `line` (RPT-1) | pass | — | — | — | Brush, legend, tooltip, keyboard bucket movement all exercised here |
| `table` mode | not captured this pass | — | — | — | Owned by `resultTableColumns.test.tsx`/`tableLegibility.test.tsx`, not re-shot here; no visual regression suspected, not independently confirmed |
| compound plot (`PanelChart`) | not harnessed this pass | — | — | — | Verified by code reading only: every mark in `PanelChart.tsx` carries `isAnimationActive={false}` (`:345,363,399,406`), and AC-1131's restated no-click-through ruling for the compound plot is unchanged in `ResultCanvas.tsx`'s own comments. **Gap**: no Chromium capture of `PanelCard`/`PanelChart` in this pass — recommend a follow-up harness addition if a Pages block renders it somewhere not yet captured |

\* No console error and the chart draws; the axis-domain defect (**V1**) is a rendering
correctness issue within an otherwise-passing draw, not a crash.

## Pass 3 — density at 1280 and 1440

X-axis label density (AC-1146), area chart, both widths:

| Width | Min label gap | Label count | Rotated? |
|---|---|---|---|
| 1280 | 103.95px | 5 | no |
| 1440 | 91.94px | 7 | no |

Both comfortably clear the 64px floor; neither rotates. No horizontal page overflow observed
at either width in any of the captures reviewed.

## Pass 4 — reference comparison

No image reference set exists in this repository (old vendor frame directories were removed
and must not be cited, per this role's brief). The structural reference is
`02-report-builder-v2.md` §3–§4 itself, read above, plus the fixture reports it names. No
structural divergence found: every legality gate's fallback (`area → line → bar → table`,
etc.) was not separately re-derived this pass — that is `plan.mode.test.tsx`'s territory and
outside a visual pass.

## Pass 5 — Arabic / RTL

Loaded with `dir="rtl"` via the account menu's language switch, per screen:

- **Chrome mirrors**: nav rail, toolbar, account menu, star/kebab columns in the Reports
  Library all sit correctly at their logical edges (`reports-library-ar.png`).
- **Chart plots do not mirror**, correctly: the horizontal-bar's value labels stay at the same
  physical position in both languages (see "Resolved, not filed" above) and the trend charts'
  x-axis keeps its left-to-right date order in Arabic, matching `rtl.md`'s explicit carve-out.
- **Numeral runs do not reorder.** `8`, `7`, `21` in the horizontal-bar tooltip and axis stay
  Western digits, left-to-right, inside the Arabic line.
- **No physical-direction leakage found**: no icon on the wrong side, no collapsed margin, no
  reordered number in any of the ar captures reviewed (area, stacked-bar, stacked-100,
  horizontal-bar, kpi, the eight-hue split, the library index).
- **V2 and V3 reproduce in Arabic too**, and slightly worse: the library's Arabic header
  wraps two words at a natural boundary (`آخر` / `تشغيل`) — a legitimate word-break, not the
  mid-word defect V2 describes for English — but the row-height inflation from V3 is worse in
  Arabic (65px vs 57px per row, `text-xs` computing one point larger in Arabic as it does
  product-wide).

---

## Ship checklist

| Item | State |
|---|---|
| Four states present | Not independently re-exercised this pass (content and a formula-error state were incidentally visible; empty/loading/error for the chart surface are `chartSurfaceV2.test.tsx`'s and `panel.hierarchy.test.tsx`'s territory) |
| One primary button per screen | Passing on every capture reviewed — `Save`/`Save and pin` reads as the one filled button on the builder; the toolbar's bell/pin/ask are ghost icon buttons |
| Badge tones from the five-tone palette, no red pill | Passing — `Official` renders neutral (`ReportLibrary.tsx:220` comment cites AC-1165/R5a explicitly); no red found anywhere in the grep sweep |
| Banner as a pale tinted card, never two at once | Not exercised this pass (no banner-triggering state reached in the fixture runs used) |
| Tokens only, no arbitrary values | **Passing** — Pass 1 above |
| Logical direction utilities | **Passing** — zero physical-direction classes; zero mirrored-chart-plot leaks |
| No shadows (D34) | **Passing** — `AC-1137` harness check: no `[data-slot="card"]` on RPT-1 carries a `box-shadow` |
| Surfaces recess (D33/D33b) | **Passing** — light chart card measured 1.036:1 under the page, matching the documented token value |
| Visible focus ring | Referred to accessibility-auditor for the full verdict; Pass 1's grep found every `outline-none` correctly paired |
| Reference comparison | Not run — no reference set exists in this repository |

---

## How to reproduce

```
npx vite --port 4327
HARNESS_BASE=http://localhost:4327 node scripts/harness/reports-v2.mjs
HARNESS_BASE=http://localhost:4327 node scripts/harness/reports-export-png.mjs
BASE=http://localhost:4327 node scripts/harness/reports-chrome.mjs
```

`reports-v2.mjs` now exits non-zero (**V1**) until `stacked-100`'s domain is clamped — that is
deliberate: a red harness is the tracked state of a real defect, not something to loosen to
green.
