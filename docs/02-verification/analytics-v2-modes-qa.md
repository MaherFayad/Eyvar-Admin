# Analytics v2 — funnel, retention, data table — acceptance criteria (WP-3.4, Proof)

One line per criterion in AC-1167…AC-1178, `07-acceptance-criteria.md`. `H` marks a criterion
proven live in Chromium this pass (`reports-modes.mjs`, `reports-funnel-step-detail.mjs`,
`reports-table-columns.mjs`; `HARNESS_BASE=http://localhost:4327`, dev server `npx vite
--port 4327`). Non-`H` items corroborated by re-running the owning vitest files
(`cohorts.test.ts`, `plan.mode.test.ts`, `resolveReport.mode.test.ts`,
`resultTableColumns.test.tsx`, `reportModeCanvas.v2.test.tsx`, `reportModePanel.v2.test.tsx`
— 176/176 passing, re-run this session) are marked **corroborated**; that is qa-engineer's
pass, not a substitute for it.

**Lead finding, so it is not buried: AC-1169 is not met, and the failure produces a wrong
number an operator would read as real** — see the row below and the visual doc's V-M1.

| AC | Met? | Evidence |
|---|---|---|
| AC-1167 | **Met (corroborated)** | `reportModePanel.v2.test.tsx:180` renders a query with `conversionWindow: { value: 7, unit: 'day' }` (the migrated v2 shape) and asserts the window control shows "7 days"; `normaliseReportQuery` (`report.ts:457-467`) is the migration itself, a pure data transform jsdom proves correctly |
| AC-1168 H | **Met** | Live: `sequential`, `Hold constant` and `Exclude` all render on-screen, disabled, each with its own visible reason sentence ("This needs a history of individual events, which this server does not have yet. It will run once the server supports it.") — `wp34-funnel-cascade-dark.png`. No fixture measure declares `funnelCapabilities`, so the legal branch is unreached this pass (matches the mock's documented state, not a gap) |
| AC-1169 H | **NOT MET** | `conversion-over-time` and `time-to-convert` are computed correctly by the resolver (`resolveFunnelOverTime`, `resolveFunnelTimeToConvert`, `resolveReport.ts:1107-1257`) but drawn by `FunnelCascade`, which was written only for `measuredAs: 'conversion'`. `time-to-convert` renders five cascade rows all mislabelled "Riders who joined" (ignores `groupValue`, which is where `p25…p95` live) with "194%/318%/394%/418% of step 1" — a duration read through a conversion-percentage formula. `conversion-over-time` collapses an entire trend to one cascade row reading only `points[0]`. See visual doc **V-M1** for the full reproduction and screenshots |
| AC-1170 H | **Met** | Full proof in `reports-funnel-step-detail.mjs` (this session's re-run, 16/16 pass): median-to-next reads "No reading for the next step." when nobody converted and a real "N.Nd" figure when they did — never "0 days"; the drop-off group table renders from `funnelStepDetail`, never a second query; RTL column order confirmed (Group at the logical start, right in Arabic) |
| AC-1171 H | **Met** | Live grain switch on RPT-7: month → 12 cohort rows, day → 48, week → 31 — three different computations, not a relabelled one (`reports-modes.mjs`). A cell beyond the cohort's elapsed intervals reads the literal sentence "No reading", never "0%", confirmed both live and in `reportModeCanvas.v2.test.tsx:270-297` and `cohorts.test.ts:125-144` |
| AC-1172 H | **Met** | `reportModePanel.v2.test.tsx:213-230` (re-run, passing): two touching `[0,7)[7,14)` brackets are legal; a third overlapping one disables `Add` with `rb.cohort.brackets.overlap`. Read at source (`ReportModePanel.tsx:937-941`): the refusal reads the **planner's own violation first** (`plan.ts:869-877`, `cohort-brackets-overlap`) and only synthesises the identical code/key locally for a candidate not yet submitted — never a second, disagreeing sentence |
| AC-1173 H | **Met** | Live on RPT-7 (12 monthly cohorts): every filled matrix cell carries exactly one `bg-heat-N` class, no inline opacity anywhere (`reports-modes.mjs`, DOM read). The curve view states "The 4 oldest cohorts are left out of the curve, but still count toward the average." — 12 cohorts, fold at 8, 4 folded, matches exactly. Only `bg-heat-4` is reachable on RPT-7's own values (mostly 100%); `heatClassOf`'s other three thresholds are unit-tested in `reportModeCanvas.v2.test.tsx` but not independently re-observed live this pass for lack of a fixture with a lower reading |
| AC-1174 H | **Met** | `resultTableColumns.test.tsx:114-138` (re-run, passing): a blocked column redacts only its own cells (the em dash plus an `sr-only` permission sentence) while the other column's real numbers render beside it. Live: `deriveColumnResults` (`ResultTable.tsx:717-728`) returns `null` for the WHOLE table (not a per-column skip) when a column names a measure **absent from `result.series` entirely** — a different case from "blocked" — and `ResultCanvas.tsx:531-544` falls through to the plain series table rather than drawing a guess, matching the brief's "must fall back visibly" |
| AC-1175 H | **Met** | Live: ticking "Totals row" on a built columns table renders a `<tfoot>` row reading the real summed value with its aggregate word beneath it ("Total · 57 · latest reading" for a non-additive measure) — `reports-modes.mjs`, `wp34-table-columns-totals.png`. `resultTableColumns.test.tsx:139-160` corroborates the additive-vs-named-aggregate branch |
| AC-1176 | **Met (corroborated), UI gap noted** | `resultTableColumns.test.tsx:161-187`: `bandToneOf` refuses any tone outside `success`/`warning`/`neutral`, falling back to `neutral` for a stray `critical`. Not independently reachable live this pass — **there is no rail control anywhere that writes `TableSpec.format`** (grepped `TableColumnsControl.tsx`, `ReportBuilder.tsx`); a band is only reachable via a hand-built query or a future editor. Noted for product-designer/frontend-engineer, not a criterion failure — the criterion is about rendering, which is proven |
| AC-1177 H | **Met** | Live, twice: the built columns table (`reports-table-columns.mjs`, re-run; `reports-modes.mjs`) renders inside `[data-slot="table-container"].overflow-x-auto` and `document.body.scrollWidth` stays at 1280 at the 1280 viewport in both English and Arabic |
| AC-1178 | **Met (corroborated)** | `resultTableColumns.test.tsx:188-` (re-run, passing): sorting by any column, including a formula column, sinks `null` to the bottom in both ascending and descending order |

## Sibling accessible-name defect, per the brief's own instruction to check for one

Not an AC failure by number, but the brief named this exact check: "a sibling control has
the same shape" as the fixed `Add a step` bug. It does. See the a11y doc for the full
reproduction — summarised here because it is a real, confirmed defect against the general
a11y contract (R7/§7.1) this pass was asked to verify:

**`rb-cohort-return-add`** (the cohort's "add a return measure" `Select`) is still wired the
old way: `<Label htmlFor="rb-cohort-return-add">{t('rb.cohort.return')}</Label>` —
`rb.cohort.return` = **"Still here means"**, the section heading, not the control's own
action. Chromium's own accessibility tree confirms it: `getByRole('combobox', { name: "Still
here means" })` resolves (count 1); `getByRole('combobox', { name: /add/i })` resolves to
nothing (count 0). A screen-reader user reaches this control announced only as "Still here
means" — indistinguishable from the section label above it, and unreachable by any name
resembling "add a measure".

## Not exercised this pass

- **AC-1168's legal branch** (a `funnelCapabilities`-enabled measure) — no fixture declares
  the flag; the mock's documented state, not a gap this pass could reach.
- **AC-1176's live band rendering** — no rail control writes `TableSpec.format` yet (above).
- **Cohort `method: 'nday'`** was not separately screenshotted live this pass; its numeric
  correctness is `resolveReport.mode.test.ts:550-555`'s territory and passes there.

## How to reproduce

```
npx vite --port 4327
HARNESS_BASE=http://localhost:4327 node scripts/harness/reports-modes.mjs
HARNESS_BASE=http://localhost:4327 node scripts/harness/reports-funnel-step-detail.mjs
HARNESS_BASE=http://localhost:4327 node scripts/harness/reports-table-columns.mjs
```

`reports-modes.mjs` exits 0 by design: its AC-1169 checks assert that the WRONG behaviour is
present (proving the defect), not the right one — inverting that would hide a real defect
behind a green harness the day someone "fixes" the assertion instead of the code.
