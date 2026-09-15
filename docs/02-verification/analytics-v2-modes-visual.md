# Analytics v2 — funnel, retention, data table — visual verdict (WP-3.4, Proof)

**Scope** The three non-trend modes: funnel cascade + step detail + measuredAs variants
(`ReportModeCanvas.tsx`, `ReportModePanel.tsx`), the retention/cohort matrix + curve
(`ReportModeCanvas.tsx`), and the `mode: 'table'` columns view (`ResultTable.tsx`,
`TableColumnsControl.tsx`).
**Built to** `docs/09-analytics-v2/02-report-builder-v2.md` §5–§7, AC-1167…AC-1178
(`07-acceptance-criteria.md`). Sibling audit `analytics-v2-charts-visual.md` (WP-2.9) covers
the nine chart types and is not re-derived here.
**Probe** `scripts/harness/reports-modes.mjs` (new, this pass), `reports-funnel-step-detail.mjs`
and `reports-table-columns.mjs` (both pre-existing, re-run this pass). Chromium via
Playwright, `HARNESS_BASE=http://localhost:4327`, `npx vite --port 4327` started fresh.
**Tree** `cba2c6c`, one unrelated file dirty at the start of this pass
(`scripts/harness/row-action-dialog.mjs`, another agent's — not touched, not cited).
**Accessibility** Split into `analytics-v2-modes-a11y.md` per this pass's brief; referred to
the accessibility-auditor as a standing boundary. One exception, named there and in the qa
doc: the brief explicitly asked this pass to check for a sibling of a known, already-fixed
accessible-name bug, and a sibling was found — reported because the instruction to look for
it was explicit, not as a general a11y ruling.

---

## Verdict

**One blocking finding, and it is a wrong-number defect, not a cosmetic one: V-M1, funnel
`measuredAs: 'conversion-over-time'` and `'time-to-convert'` draw through the wrong
component and produce numbers an operator could mistake for real ("418% of step 1").** This
must not merge as-is. Everything else proven this pass — the funnel cascade's ordinary
`conversion` measuredAs, the median/drop-off detail, the cohort matrix at all three grains,
the heat tokens, the curve view's fold, the columns table's totals and scroll containment, and
Arabic/RTL across all three modes — is clean.

---

## Findings

| # | Severity | Rule | Observed | Evidence | Suggested fix |
|---|---|---|---|---|---|
| **V-M1** | **Blocking** | AC-1169; `02-report-builder-v2.md` §5 ("`conversion-over-time` produces a trend… `time-to-convert` produces a distribution… drawn with `DistributionCard`") | Both `measuredAs` values are computed correctly (`resolveFunnelOverTime`, `resolveFunnelTimeToConvert`, `resolveReport.ts:1107-1257` — real per-bucket trend points for the first, real p25…p95 minutes for the second) but neither ever reaches `SeriesChart`/`DistributionCard`. `ReportBuilder.tsx:328-330`'s `isSeriesMode(mode)` and `ReportModeCanvas.tsx:234,273`'s `Body()` both branch **only on `query.mode`**, never on `funnel.measuredAs`, so every funnel — regardless of measuredAs — routes to `FunnelCascade`, a component written for `measuredAs: 'conversion'` only. Reproduced with real data (RPT-6, 2 rungs, Last 365 days, matching the proven funnel-step-detail harness's own setup): `time-to-convert` draws **five cascade rows, all mislabelled "Riders who joined"** (`FunnelCascade` reads `series.measureKey`, never `groupValue`, which is where `p25…p95` actually live — `resolveReport.ts:1230-1243`), with values "71d 0h / 138d 0h / 226d 0h / 279d 19h / 297d 0h" run through the cascade's own conversion-percentage math to read **"100% / 194% / 318% / 394% / 418% of step 1"** — a duration divided by a duration read as a conversion rate, exceeding 100% by construction. `conversion-over-time` collapses an entire multi-bucket trend to **one** cascade row reading only `points[0]` | `scripts/harness/shots/wp34-funnel-ttc-broad.png` (bars all drawn full-width regardless of the absurd percentage, since CSS clamps `inlineSize` — the picture and the number visibly disagree, breaking `FunnelCascade`'s own documented invariant at `ReportModeCanvas.tsx:322-323`, "the picture and the right-hand number are the same fact"); `reports-modes.mjs` — new checks, reproduce both manifestations on demand | Route `funnel.measuredAs !== 'conversion'` to the series/distribution path: either widen `isSeriesMode` to consider `measuredAs`, or give `ReportModeCanvas.Body()` a third branch for these two that calls `SeriesChart`/`DistributionCard` directly. The resolver output is already correctly shaped for both (`resolveFunnelOverTime` returns exactly the `{buckets, series:[{points}]}` shape `SeriesChart` expects; `resolveFunnelTimeToConvert` returns five panels of one reading each, exactly `DistributionCard`'s documented input) — this is a routing fix, not a data fix. The copy for it already exists and is unused (`rb.funnel.timeToConvert.percentile: 'P{percentile}'`, `copy.ts:547`) |

### Not filed as defects — checked and clean

- **AC-1170's median-to-next and drop-off group table** — fully proven by the pre-existing
  `reports-funnel-step-detail.mjs` (16/16 pass, re-run this pass): a rung nobody followed
  reads "No reading for the next step.", never "0 days"; a real median reads "N.Nd"; the
  ninth-and-later drop-off group folds to `Other` (`MAX_DROPOFF_GROUPS = 8` in
  `funnelSteps.ts:13`, so the ninth group is the first folded one, matching the brief's own
  statement of the rule); RTL keeps the group table's DOM order and only mirrors position
  (`Group` sits right of `People` under `dir="rtl"`, measured, not eyeballed:
  `group.x=285.75 count.x=54`).
- **F-V2-50, re-confirmed fixed**: the funnel's `Steps` region is `role="group"
  aria-labelledby`, and `Add a step` is reachable by its own visible text
  (`reports-funnel-step-detail.mjs`). The comment at `ReportModePanel.tsx:611-616`
  deliberately avoids the same shape for the `Exclude` section's `Add an exclusion` button.
  One sibling **was** found with the old shape — `rb-cohort-return-add` — filed in the a11y
  doc and referenced from the qa doc, per this pass's explicit brief to check.
- **Two independently-defined "Other" sentinels turned out to be the same string.**
  `DROPOFF_OTHER` (`funnelSteps.ts:15`, `'__other__'`) and `OTHER`
  (`reporting/resolve/core.ts:25`, `'__other__'`) are two separate constants the funnel
  drop-off table compares across (`ReportModeCanvas.tsx:477`, `group.groupValue ===
  OTHER_GROUP`). They currently agree by coincidence of literal value, not by a shared
  import — a future rename of either would silently break the "Other" label's match with no
  type error. Not a visual defect today (verified: it renders correctly), but worth a note to
  frontend-engineer since it is exactly the kind of drift `tokens.md`/this build's own
  conventions exist to prevent.
- **A stale pair of code comments, not a behaviour defect.** `plan.ts:147-148` ("See
  `CohortGrain` for why only `'month'` computes today") and `report.ts:733` ("No engine here
  buckets retention by day or week") both predate the day/week engines landing —
  `COMPUTED_COHORT_GRAINS` (`plan.ts:159`) now lists all three, `CohortGrain`'s own type
  comment (`report.ts:304-306`) already says so correctly, and `planCohortGrains()`
  (`plan.ts:957-963`) now returns every grain legal, so `cohort-grain-unavailable` is
  currently unreachable dead code, not a live refusal. Confirmed live: day and week grain
  both compute real, different matrices (below). Worth a comment fix on the two stale lines
  so the next reader is not misled about the standing state; not a visual finding.

---

## Pass 1 — token conformance

`ReportModeCanvas.tsx`, `ReportModePanel.tsx`, `ResultTable.tsx`, `TableColumnsControl.tsx`,
`funnelSteps.ts`, `cohorts.ts` (non-test):

| Check | Result |
|---|---|
| Tailwind palette classes (`bg-blue-500`, `text-gray-400`, …) | **none** |
| Arbitrary values (`[12px]`, `[#fff]`) | **none** |
| Raw hex | **none** |
| Physical direction utilities (`ml-`, `mr-`, `pl-`, `pr-`, `text-left`, `text-right`) | **none** |
| `outline-none` without a paired `focus-visible:ring-*` | **none** — both occurrences (`ReportModeCanvas.tsx:327` the funnel step header, `ResultTable.tsx:965` the sortable header) pair `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` on the same class string |
| Red carrier outside R5a's four uses | **none found** — every "red"/"critical" hit is a comment citing R5a as the reason the drop-off row is *not* red (`ReportModeCanvas.tsx:43,434`), or `AC-1176`'s tone-refusal comment about a stray `critical` string in a fixture, which is refused, not rendered |
| `div` with `onClick` where a `<button>`/`<a>` belongs | **none found** — every clickable row/toggle in these files (the funnel step header, the Matrix/Curve toggle, the sort header) is a real `<button>` |
| Heat cells on token | **Passing** — `bg-heat-1…4` only, sourced from `--color-heat-1…4` → `--ev-heat-1…4` (`globals.css:2934-2937`, `:1785-1788`), which chain to `--ev-series-1-lt`/`--ev-brand-lt`, already theme-aware via the `.dark` override at `globals.css:1961` — no second, undocumented ramp invented |

## Pass 2 — rule conformance (Ship checklist walk)

| Item | State |
|---|---|
| Four states (content/empty/loading/error) | `ReportModeCanvas`'s four `CanvasStatus` branches are shared by all three modes (`unstarted`/`loading`/`error`/`invalid` all render identically regardless of mode — code-read confirmed, `ReportModeCanvas.tsx:133-152`); content proven live for all three this pass. Empty/loading/error were not independently re-triggered live this pass (not this pass's focus; `reportModeCanvas.v2.test.tsx` covers them in jsdom, which is sufficient for state branching that draws no SVG/table layout) |
| One primary button per screen | Passing on every capture — `Save` is the one filled button on the builder in every mode; `Matrix`/`Curve` and the funnel's step buttons are `secondary`/`ghost`, never a second primary |
| Badge tones, no red pill | Passing — the columns table's conditional bands use `bandToneOf`'s closed three (`success`/`warning`/`neutral`); no band UI is reachable live this pass to screenshot one in place (noted in the qa doc, not a rule violation) |
| R5-15 — a percentage names the count it is a percentage of | Passing — the cohort matrix's `People` column sits beside every retention percentage row (`ReportModeCanvas.tsx:592-594`); the funnel cascade's conversion percentage sits beside the rung's own count |
| Tokens only, logical directions | **Passing** — Pass 1 |
| No shadows (D34) | Not independently re-measured this pass; no `box-shadow` class present in any of the six files grepped |
| Surfaces recess (D33/D33b) | Not independently re-measured this pass; the mode canvas reuses `PanelFrame`, already measured clean in the sibling chart-surface audit |
| Visible focus ring | Referred to accessibility-auditor per this role's standing boundary; Pass 1's grep found both `outline-none` uses correctly paired, and a direct focus check on the Matrix/Curve toggle this pass measured a real `box-shadow` ring on focus (`rgb(255,255,255) 0 0 0 2px, rgb(12,105,68) 0 0 0 4px`) |

## Pass 3 — density at 1280

The columns table (built via the rail, one measure column, `rows: 'time'`) stayed within
1280 with no page-level horizontal scroll in English and Arabic (`document.body.scrollWidth`
measured 1280 in both — `reports-modes.mjs`, `reports-table-columns.mjs`). The cohort
matrix's day-grain view (48 rows × 6 columns) also stayed within 1280, no overflow. The
funnel cascade never approaches 1280's width ceiling — its widest element is the drop-off
group table, itself contained (`w-full overflow-x-auto`, `ReportModeCanvas.tsx:461`).

## Pass 4 — reference comparison

No image reference set exists in this repository (old vendor frame directories were removed
and must not be cited). The structural reference is `02-report-builder-v2.md` §5–§7 itself,
read above: the funnel cascade's per-step shape, the cohort matrix's rows-down/age-across
shape, and the columns table's measure-columns/dimension-rows shape all match their own spec
sections **except** the measuredAs routing named in V-M1, which is exactly the kind of
structural divergence (a component drawing the wrong shape for its data) this pass exists to
catch — not a pixel-level nit.

## Pass 5 — Arabic / RTL

Loaded with `dir="rtl"` via the account menu's language switch, all three modes:

- **Funnel** — the step header, the drop-off group table (Group at the logical start, right
  in Arabic, DOM order unchanged) and the bar's own `inlineSize` (grows from the start edge,
  which is the right in Arabic — `ReportModeCanvas.tsx:429`'s own documented rule) all mirror
  correctly. `wp34-funnel-cascade-ar.png`.
- **Cohort** — the matrix and its controls mirror; `dir="ltr"` is deliberately forced on the
  curve SVG's own wrapper (`ReportModeCanvas.tsx:709`), correctly, per `rtl.md`'s rule that a
  chart plot does not mirror — confirmed the curve's x-axis (`M0…M3`) still reads
  left-to-right under `dir="rtl"`. No horizontal page overflow (`scrollWidth=1280`).
  `wp34-cohort-matrix-ar.png`.
- **Columns table** — row-label column (`text-start`) sits at the right, the measure column
  (`text-end`) sits at the left, matching the same logical-direction rule; digits stay
  Western/left-to-right inside the Arabic row (`٥٥` was never observed — every count read
  plain "55"). `wp34-table-columns-ar.png`. No horizontal page overflow.
- **No physical-direction leakage found** in any of the ar captures reviewed across all
  three modes.

---

## Ship checklist

| Item | State |
|---|---|
| Four states present | Content proven live for all three modes; empty/loading/error referred to `reportModeCanvas.v2.test.tsx`'s existing jsdom coverage (state branching only, no SVG/layout dependency) |
| One primary button per screen | **Passing** |
| Badge tones, no red pill | **Passing** (band UI itself not reachable live — see qa doc) |
| Banner as a pale tinted card, never two at once | Not exercised — no banner-triggering state was reached in the fixture runs used this pass |
| Tokens only, no arbitrary values | **Passing** — Pass 1 |
| Logical direction utilities | **Passing** — Pass 1, Pass 5 |
| No shadows (D34) | Not independently re-measured; no shadow class present in source |
| Surfaces recess (D33/D33b) | Not independently re-measured; shared `PanelFrame`, already measured clean elsewhere |
| Visible focus ring | Referred to accessibility-auditor; incidentally confirmed present on the one control measured |
| Reference comparison | Structural only — no image reference set exists (Pass 4) |

---

## How to reproduce

```
npx vite --port 4327
HARNESS_BASE=http://localhost:4327 node scripts/harness/reports-modes.mjs
HARNESS_BASE=http://localhost:4327 node scripts/harness/reports-funnel-step-detail.mjs
HARNESS_BASE=http://localhost:4327 node scripts/harness/reports-table-columns.mjs
```

`reports-modes.mjs` exits 0: its **V-M1** checks assert the wrong behaviour is present
(median-to-next-style honesty about a real defect, not a green light) — deliberately, so the
harness stays a true record of the mis-route until `ReportBuilder.tsx`/`ReportModeCanvas.tsx`
route `measuredAs` correctly. Do not "fix" the harness instead of the code.
