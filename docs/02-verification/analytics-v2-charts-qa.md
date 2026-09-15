# Analytics v2 chart surface — acceptance criteria (WP-2.9)

One line per criterion in the charts-and-controls range (AC-1130…AC-1166), plus the two
cross-cutting criteria this pass could speak to directly. `H` criteria were proven live in
Chromium this pass (`reports-v2.mjs`, `reports-export-png.mjs`, `reports-chrome.mjs`,
`HARNESS_BASE=http://localhost:4327`, tree `0af9a5e`). Non-`H` criteria this role is not the
primary owner of (qa-engineer is) are marked **corroborated** where an existing vitest file
was re-run as a sanity check this pass, or **not re-verified** where it was not — neither is a
substitute for qa-engineer's own pass.

| AC | Met? | Evidence |
|---|---|---|
| AC-1130 H | **Met** | All four of `area`/`stacked-bar`/`stacked-100`/`horizontal-bar` render on the fixture reports in both themes and both languages with zero console errors, plus `kpi` (named separately in the gap list but tested identically here). 40 checks, all pass |
| AC-1131 H | **Met** | Every mark on RPT-14 (`area`) computes `pointer-events: none`; a plot click after the brush mounts does not throw (`AC-1151`'s own proof doubles as this one's second half) |
| AC-1132 H | **Met** | RPT-21's stacked comparison draws `fill: none` with a `stroke-dasharray`, behind the stack |
| AC-1133 | **Not met — V1 in the visual doc.** The percent scale renders (`0%, 30%, 60%, 90%, 120%`) and the hovered bucket's parts sum to ~100 (100.1), but **the axis is not clamped to 0–100** as the criterion and the spec both require; it reads to 120. New harness check added this pass, fails honestly |
| AC-1134 H | **Met** | Descending sort and `Other`-last both confirmed in English and Arabic, by measured bar widths and axis label order, not by eye |
| AC-1135 | **Met** | KPI shows a rolled-up value (`15`) and a sparkline (`.recharts-area` present) on RPT-18 |
| AC-1136 | **Met** | RPT-20 draws nine series groups (eight distinct hues, `Other` = computed `--muted-foreground`) — see the visual doc's "Resolved" section for the full colour list. Answers F-V2-67 |
| AC-1137 H | **Met** | No `[data-slot="card"]` on RPT-1 carries a `box-shadow`; the light card's D33b recess measured at 1.036:1, matching the documented token value |
| AC-1138 | **Met** | Legend entries are real `button[aria-pressed]`; clicking sets `aria-pressed="false"` and strikes the entry through, keeping it in the legend |
| AC-1139 | **Not independently re-verified this pass** | Not exercised by `reports-v2.mjs`; covered by `chartSurfaceV2.test.tsx` (22/22 passing, re-run this session) |
| AC-1140 | **Not independently re-verified this pass** | Same file, `chartSurfaceV2.test.tsx` — a dedicated `describe('AC-1140 — the comparison entry toggles as one unit')` block exists and passes |
| AC-1141 | **Met** | Hiding a legend entry drops it from the tooltip's rendered rows (`AC-1141` check, RPT-1) |
| AC-1142 | **Met** | The v2 tooltip (`[data-slot="series-tooltip"]`) renders on hover over the plot |
| AC-1143 H | **Met** | Arrow-key navigation with the chart region focused moves the active bucket and updates its `aria-describedby` text live |
| AC-1144 | **Met (for the one fixture checked)** | RPT-1 is all-positive, so log scale is offered, not disabled — confirms the enabled branch; the disabled-with-reason branch (a series with a 0 or all-gaps) was not separately reached this pass |
| AC-1145 | **Met (for the one fixture checked)** | RPT-15 (a bar family) defaults `Start at zero` to checked; persistence-across-reload was not re-exercised here |
| AC-1146 H | **Met** | Label gaps measured 103.95px (1280) and 91.94px (1440), both above the 64px floor; never rotated at either width |
| AC-1147 | **Not re-verified this pass** | No fixture in this run crossed the 60-mark data-label disable threshold |
| AC-1148 H | **Met** | `ANN-6` (inside RPT-1's window) draws a reachable marker button |
| AC-1149 | **Met (the two behaviours checked)** | Keyboard focus on the marker opens the note tooltip; the add-annotation control is enabled for the fixture operator (`USR-1`, holds `manage_analytics`). The disabled-for-an-unpermitted-operator branch was not separately reached |
| AC-1150 | **Not re-verified this pass** | Requires a save round-trip not exercised by this harness run |
| AC-1151 H | **Met** | Dragging the brush traveller narrows the domain, shows `Zoomed · reset`, and a plot click still fires afterward with no throw |
| AC-1152 | **Met** | `[` steps the brush edge with the region focused; the URL is unchanged after |
| AC-1153 | **Corroborated** | `builder.chrome.test.tsx` (23/23 passing, re-run this session) covers violation-sentence placement and `Refresh` disabling |
| AC-1154 | **Not re-verified this pass** | No `too-many-series` state was constructed in this run |
| AC-1155 | **Corroborated** | `formulaField.test.tsx` (9/9 passing, re-run this session) |
| AC-1156 | **Corroborated** | `segmentPicker.test.tsx` re-run passing this session (file present, part of the same 60/60 batch) |
| AC-1157 | **Corroborated** | `windowControl.comparison.test.tsx` re-run passing this session |
| AC-1158 | **Not re-verified this pass** | Not part of the files re-run |
| AC-1159 H | **Met** | A real PNG downloaded from RPT-1: signature valid, `1164×884`, caption band adds real height beyond the bare plot, `tEXt` chunk carries the query (194 chars), zero console errors during export |
| AC-1160 | **Not re-verified this pass** | Audit-log call assertion is a unit-test concern, not exercised by the PNG harness's own checks |
| AC-1161 | **Corroborated by code reading, not test-run** | `ChartToolbar.tsx:291-306` — the bell is `aria-label`'d, `disabled` when illegal, paired with `aria-describedby` pointing at a visible reason paragraph |
| AC-1162 | **Not re-verified this pass** | Version history not exercised in this run |
| AC-1163 | **Not re-verified this pass** | Library view filters not exercised in this run; `library.v2.test.tsx` exists and was part of the 60/60 batch re-run |
| AC-1164 | **Not re-verified this pass** | Star toggle not exercised in this run |
| AC-1165 | **Met (visually)** | `Official` renders as a neutral badge in the Reports Library capture (`reports-library-en.png`, row 1); the code comment at `ReportLibrary.tsx:220` cites AC-1165/R5a explicitly. `manage_analytics`-only toggle gating not independently re-verified |
| AC-1166 | **Not re-verified this pass** | Duplicate flow not exercised in this run |

## Cross-cutting, in scope for this pass

| AC | Met? | Evidence |
|---|---|---|
| AC-1294 H (RTL, no horizontal overflow) | **Met for the reports screens captured** | `dir="rtl"` captures of the library/dashboards/alerts index and every chart-type fixture showed `overflowX: 0` where measured (`reports-chrome.mjs`); no horizontal scroll observed in any Arabic chart capture reviewed |
| AC-1295 H (D33/no shadow, both themes) | **Met** | AC-1137 above covers light; dark captures (`v2-*-dark-*.png`) show the same card treatment with no shadow in every review pass |

## Summary of blocking findings

**One.** AC-1133 is not met: `stacked-100`'s y-axis renders past 100% (measured 120%) instead
of being domain-clamped to `[0, 100]`. Full detail, root cause and suggested fix are in
`analytics-v2-charts-visual.md` (**V1**). The regression is now pinned in
`scripts/harness/reports-v2.mjs`, which exits non-zero until it is fixed.

Everything else checked directly in this pass — 8 of 9 chart types' AC-1130 render proof, the
INERT proof, the legend/tooltip/annotation/brush behaviours, the PNG export, and the token/
RTL/reduced-motion sweeps in the sibling documents — met its criterion with live-browser
evidence. Criteria marked "not re-verified this pass" are not failures; they are outside what
`reports-v2.mjs`'s current fixture set reaches, and are qa-engineer's criteria to close.
