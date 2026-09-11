# 02 — Report builder v2: Amplitude fidelity

> Decisions needed: **D40** (overlay and two more hues), **D42** (query model v2). Phases:
> **P1** (model), **P2** (charts and controls), **P3** (funnel, retention, data table).
> Reference: Amplitude's chart definitions as exposed by its own tooling (events
> segmentation, funnels, retention, data tables, dashboards, notebooks, monitors), read on
> 2026-09-11. Eyvar has measures, not events; the gap list below translates each Amplitude
> control into the measure vocabulary rather than importing an event model that does not exist.

## 1. The gap list, with a disposition for every row

`Have` cites the file at commit `71ddfac`. `Do` names the phase and the section here.

| # | Amplitude | Have | Do |
|---|---|---|---|
| G1 | Measured as: uniques, totals, average per user, property sum / avg / min / max / median / count, percentiles, histogram | `Measure.bucketAggregate` is `count \| sum \| mean \| end-of-period \| cumulative-count` per measure; the operator never chooses | **Keep the catalogue as the authority.** Add `bucketAggregateOptions?: BucketAggregate[]` on a measure that admits more than one (a value field can be summed or averaged); the rail shows `Measured as` only when the list has more than one entry. P1 §2.1 |
| G2 | Formula (A/B, A×100/B, ROLLAVG, CUMSUM…) | none | `formula` on the query; a small grammar; unit rules; server and mock evaluate the same code. P1 §2.2 |
| G3 | Cumulative, rolling average, rolling window | none | `transform` on the query. P1 §2.3 |
| G4 | Group by up to N with a limit and `Other` | `groupBy: string \| null`, fold at 8 | `groupBy: string[]` up to **2** (Amplitude allows more; two keeps the legend readable); fold stays at 8 per level; the second level draws as stacked segments or as a table. P1 §2.4 |
| G5 | Segments (user populations, property and behavioural) compared side by side | none | `segments` on the query, ≤ 4, saved or inline; behavioural `performed` needs the server for anything not in fixtures. P1 §2.5 |
| G6 | Compare to past: previous period, parent, grandparent, quarter, fixed; display as multiple series, difference, % change | `previous-period`, `previous-year`, series only | Add `previous-quarter` and `{kind:'fixed', from, to}`; add `comparisonDisplay`. P1 §2.6 |
| G7 | Intervals: 5-minute, hour, day, week, month, quarter | day, week, month; `hour` stubbed; `none` | Add `quarter`. `hour` stays typed and refused until the backend has sub-daily history (`buckets.ts:29-37`). P1 §2.7 |
| G8 | Visualisations: line, area, bar, column, stacked bar, pie, KPI | line, bar, pie, table | Add `area`, `stacked-bar`, `stacked-100`, `horizontal-bar`, `kpi`. Legality per §3. P2 §3 |
| G9 | Chart controls: log scale, start y at zero, data labels, show table beneath, annotations, hover crosshair, legend isolate | tooltip, legend (no toggle), horizontal grid, partial scrim, table beneath (`NumbersBehind`) | Add all; the view-only ones never touch the query or the URL (`askedOf` rule). P2 §4 |
| G10 | Funnels: ordered / unordered / sequential, conversion window in units, hold property constant, exclude events, conversion over time, time to convert, group by | steps + `conversionWindowDays` | v2 funnel spec. `sequential` and `holdConstant` need event-level data: typed, refused by the mock with a reason, implemented by the server. P3 §5 |
| G11 | Retention: rolling / N-day / bracket / N-day-or-before, custom brackets, usage interval, start and return events | month cohort only | v2 cohort spec: day and week grains computed; `method`; `brackets`; multiple return measures. P3 §6 |
| G12 | Data tables: several metric columns × row dimensions (property or time), totals, sorting, conditional formatting | one query as a table | v2 `table` mode with `columns[]` and `rows[]`. P3 §7 |
| G13 | Save, save as, duplicate, copy link, move to space, official flag, favourite | save, save as, copy link, delete | Add duplicate, star, tags, `official` (owner-marked), recently viewed. P2 §8 |
| G14 | Add to dashboard / notebook from the chart | only from the board side | `Pin to page…` in the builder overflow and toolbar. P4 |
| G15 | Create an alert from the chart | only from the rules view | Bell in the toolbar: saves the report if unsaved (`Save to alert`), opens the rule composer prefilled. P5 |
| G16 | Export CSV, PNG, PDF | CSV; PNG and PDF rendered disabled | PNG from the SVG with a burned-in caption (title, window, filters, asOf) so the picture carries its provenance, answering spec 06 §10.3's objection. PDF stays out. P2 §9 |
| G17 | Annotations on the timeline | none | `annotations` resource; markers on every trend chart; the agent reads them. P2 §4.5 |
| G18 | Chart description, last edited by, version | description | `updatedBy`; a `versions[]` list of the last 20 saves with `Restore`. P2 §8 |
| G19 | Monitors on a chart (anomaly, threshold, relative) | threshold rules | [04-alerting-v2.md](04-alerting-v2.md) |
| G20 | Notebooks (text + charts) | none | [03-pages-and-dashboards.md](03-pages-and-dashboards.md) |
| G21 | Ask AI | none | [01-analyst-agent.md](01-analyst-agent.md) |

Not adopted, with the reason:

- **Event-level exploration** (Pathfinder, user streams, session replay). Eyvar's model is
  measures over resources; there is no event stream. `journey` mode stays as it is.
- **Experiments and flags.** Out of the product's scope.
- **Five-minute and hourly intervals.** No sub-daily history exists anywhere. The type stays so
  the day it does the contract does not change.
- **Compare to parent / grandparent periods.** `previous-period`, `previous-quarter`,
  `previous-year` and `fixed` cover the operator's questions without three more menu rows.

## 2. Query model v2 (`src/data/types/report.ts`)

Every new field is **optional with a default** so that a v1 object is a valid v2 object and
`normaliseReportQuery` fills the defaults. The serialiser writes `v: 2` and only writes a key
whose value differs from its default, so v1 URLs stay short and still deserialise.

### 2.1 Measured as

```
MeasureRef { key: MeasureKey; aggregate?: BucketAggregate }   // only legal when Measure.bucketAggregateOptions includes it
```

Planner: `illegal-aggregate` violation when `aggregate` is set and not in the measure's options.
Rail: `Measured as` select beside the measure, shown only when options.length > 1. Result: the
series carries `aggregate` so the headline word (`AGGREGATE_WORD`, `ResultTable.tsx:191`) is right.

### 2.2 Formula

```
ReportFormula { expression: string; label: string }          // on ReportQuery as `formula?`
```

Grammar (`src/data/reporting/formula.ts`, a hand-written recursive-descent parser, no dependency):

```
expr    := term (('+' | '-') term)*
term    := factor (('*' | '/') factor)*
factor  := NUMBER | REF | func '(' expr (',' NUMBER)? ')' | '(' expr ')'
REF     := 'A' | 'B'                        // the measures in listed order
func    := 'ROLLAVG' | 'CUMSUM' | 'DELTA' | 'PCT'
```

Semantics, per bucket, per group:

| Form | Meaning | Unit of the result |
|---|---|---|
| `A / B` | ratio; `null` when B is `null` or 0 | `ratio` (`* 100` makes it `percent`) |
| `A - B`, `A + B` | same unit and currency required | A's unit |
| `A * n`, `A / n` | scale | A's unit |
| `A * B` | **refused** (`formula-unit`) | — |
| `ROLLAVG(A, n)` | mean of the last n buckets including this one; `null` until n buckets exist | A's unit |
| `CUMSUM(A)` | running total across the window; requires `additive` | A's unit |
| `DELTA(A)` | bucket minus previous bucket; first is `null` | A's unit |
| `PCT(A)` | A's share of the sum of A across groups in the bucket; requires a split and `additive` | `percent` |

Planner violations: `formula-parse` (position and expected token in `reasonParams`),
`formula-unknown-ref` (B without a second measure), `formula-unit`, `formula-needs-additive`,
`formula-needs-split`. A formula replaces the measure series in the plot; the rail shows a
`Show A and B too` checkbox (view-only) that adds them back as dashed context series.

The result carries one `ReportSeries` per group with `measureKey: '__formula__'`,
`formulaLabel`, and the derived `unit`. `temporality` is `'flow'` unless every ref is a stock.

### 2.3 Transforms

```
ReportTransform { cumulative: boolean; rollingAverage: number | null; percentOfTotal: boolean }
// default { false, null, false }
```

Applied by the resolver after aggregation and before comparison, in that order. `cumulative`
requires `additive`; `percentOfTotal` requires a split; `rollingAverage` is 2 … 30 buckets and is
disabled when the window has fewer buckets than the number. A transform changes values, so it
is part of the query and the URL (unlike the view options in §4).

### 2.4 Two-level split

```
groupBy: DimensionKey[]     // was string | null; [] is the default; max 2
```

Serialiser writes `g` as an array; the deserialiser accepts a string (v1) and wraps it. The
planner folds each level at 8 (`groups-folded` carries the level). Series ids become
`<measureKey>#<g1>|<g2>#<role>`; `groupValue` becomes `groupValues: string[]`, and `groupValue`
stays as the joined display value so nothing that reads it breaks. With two levels the legal
chart types are `stacked-bar`, `stacked-100`, `table`; line and bar are disabled with
`rb.chart.twoLevelsNeedStack`.

### 2.5 Segments

```
SegmentRef = { kind: 'saved'; id: string }
           | { kind: 'inline'; label: string; filters: FilterSpec[]; performed?: PerformedSpec }
PerformedSpec { measureKey: MeasureKey; op: 'gte' | 'lte' | 'eq'; count: number; window: 'each-bucket' | { rollingDays: number } }
segments?: SegmentRef[]    // default [] meaning "everyone"; max 4
```

A segment is a population filter applied to the measure's population before bucketing. Series
multiply: measures × segments × groups. The **series ceiling** is 12 current series (24 with a
comparison); the planner emits `too-many-series` with the count. Saved segments are a new
resource (`segments.list/get/save/delete`, `Segment { id, name, description, filters,
performed, ownerId, visibility }`). `performed` is refused by the mock for any measure whose
population is not a subject resource (`subjects.ts`) and by the planner with
`segment-performed-unsupported` until the server declares support in the catalogue
(`Measure.supportsPerformed: boolean`).

Legend and tooltip name a series `Measure · Segment · Group` with the parts that vary.

### 2.6 Comparison

```
PeriodComparison = 'none' | 'previous-period' | 'previous-quarter' | 'previous-year'
                 | { kind: 'fixed'; from: IsoDate; to: IsoDate }
comparisonDisplay?: 'series' | 'difference' | 'percent-change'   // default 'series'
```

`fixed` must have the same number of buckets as the current window; the planner emits
`comparison-length` otherwise and the date popover states the required length. `difference`
draws one series per current series holding `current − comparison` in the measure's unit;
`percent-change` draws `percent`; both are computed by the resolver so the CSV carries them.
R7 stands for `series`: same hue, dashed. For `difference` and `percent-change` there is one
series per current series, solid, with a zero reference line.

### 2.7 Grain

`ReportGrain` adds `'quarter'`. `buckets.ts` gains `bucketStartOf('quarter')` (calendar
quarters, Riyadh), `countBuckets`, and `partialBucketIndexes` support. `GRAIN_RANK` gains
`quarter: 4`. Presets gain `this-quarter`, `last-quarter`, `this-year`, `year-to-date` so the
range popover matches Amplitude's list without a custom range.

### 2.8 Chart type and view options

```
ChartType = 'line' | 'area' | 'bar' | 'stacked-bar' | 'stacked-100' | 'horizontal-bar' | 'pie' | 'kpi' | 'table'
ChartView { yScale: 'linear' | 'log'; yStartAtZero: boolean; dataLabels: boolean; showTable: boolean; hidden: string[] }
```

`chartType` is in the query and the URL (it already is). `ChartView` is **not**: it is a
per-report UI preference persisted through `src/lib/persistence.ts` under the report id (or
the query hash for an unsaved one), so it survives reload, never changes what was asked, and
never costs a request (`askedOf`). `hidden` is the legend-isolate state.

### 2.9 The full v2 shape

```
ReportQuery {
  measures: MeasureRef[]                 // 1 or 2
  formula?: ReportFormula
  transform?: ReportTransform
  groupBy: DimensionKey[]                // ≤ 2
  segments?: SegmentRef[]                // ≤ 4
  filters: FilterSpec[]
  window: ReportWindow
  grain: ReportGrain                     // + 'quarter'
  periodComparison: PeriodComparison     // + 'previous-quarter' | fixed
  comparisonDisplay?: 'series' | 'difference' | 'percent-change'
  chartType: ChartType                   // + area, stacked-bar, stacked-100, horizontal-bar, kpi
  mode?: ReportMode
  funnel?: FunnelSpec                    // v2 in §5
  cohort?: CohortSpec                    // v2 in §6
  table?: TableSpec                      // new in §7
  journey?: JourneySpec
}
```

Serialiser keys added, in order after the v1 keys: `fo` (formula), `tr` (transform), `sg`
(segments), `cd` (comparisonDisplay), `tb` (table), and `v: 2` first. Round-trip tests extend
`serialise.test.ts` with one case per new key and one v1 URL fixture per existing test.

## 3. Chart legality v2 (`plan.ts` → `chartLegality`)

| Chart | Legal when | Reason key when not |
|---|---|---|
| `line` | grain ≠ none, ≥ 2 buckets, ≤ 1 split level | `rb.chart.lineNeedsGrain`, `lineNeedsTwoPoints`, `twoLevelsNeedStack` |
| `area` | as line, and one measure (two areas hide each other) | `rb.chart.areaOneMeasure` |
| `bar` | grain ≠ none or a split; ≤ 1 level | as v1 + `twoLevelsNeedStack` |
| `stacked-bar` | additive; a split or two same-unit measures; no `percent`/`ratio`/`rating` unit | `rb.chart.stackNeedsAdditive`, `stackNeedsParts`, `stackUnit` |
| `stacked-100` | as stacked-bar, and ≥ 2 parts | `rb.chart.stack100NeedsParts` |
| `horizontal-bar` | grain = none, a split, one measure | `rb.chart.hbarNeedsSplit`, `hbarSinglePeriod` |
| `pie` | v1's five gates | v1 keys |
| `kpi` | one measure, no split, no segments; any grain (shows the total or the end value with the comparison delta) | `rb.chart.kpiOneSeries` |
| `table` | always | — |

`NEAREST` fallbacks: `area → line → bar → table`, `stacked-bar → bar → table`,
`stacked-100 → stacked-bar → table`, `horizontal-bar → bar → table`, `kpi → table`.

## 4. The chart, drawn (`SeriesChart.tsx` and friends)

All of §4 is **view-only**: no request, no URL change. `INERT` stays on every mark, including
the new ones. Every item below has a harness capture in `scripts/harness/reports-v2.mjs`.

### 4.1 New branches in `SeriesChart`

- `area`: `AreaChart` with the pale fill, one series (legality guarantees it), comparison as a
  dashed `Line` on the same axes.
- `stacked-bar`: `BarChart` with `stackId="s"` per current series; comparison as an outline
  bar behind (`fill: none`, dashed stroke, same hue), never stacked with the current.
- `stacked-100`: the resolver normalises per bucket to `percent`; the y-axis reads `0–100 %`.
- `horizontal-bar`: `BarChart layout="vertical"`; category axis on the inline-start side;
  bars sorted descending, `Other` last; values labelled at the bar end.
- `kpi`: not Recharts. A `MetricTile`-shaped card (reuse `src/components/metrics/MetricTile`
  through a thin adapter) showing the value, the comparison delta chip (R4-5: neutral tone),
  the window and a `Sparkline` of the buckets when grain ≠ none.

### 4.2 Legend

The hand-rolled SVG legend (`ResultCanvas.tsx:822`) becomes a list of `<button>`s
(`aria-pressed`) so it is keyboard-operable: click toggles a series in `ChartView.hidden`;
Shift+click (and the `Only` action in the legend entry's menu) isolates it. A hidden series
stays in the legend, struck through, so the picture never lies about what was asked. The
comparison entry toggles every comparison series at once. Hidden series are excluded from the
y-axis domain so the remaining ones fill the plot. The tooltip omits hidden series.

### 4.3 Tooltip

Adds, per series: the comparison value on the same row, the delta (abs and %) with the
comparison bucket's date, and the group share when `percentOfTotal` is on. The bucket header
states `partial` when the bucket is partial. Keyboard: arrow keys move the active bucket when
the chart region has focus (a `role="group"` with `tabIndex=0` and an `aria-describedby` that
reads the active bucket's values).

### 4.4 Axes and scale

- `yScale: 'log'` is offered only when every visible value is > 0; otherwise the control is
  disabled with `rb.view.logNeedsPositive`.
- `yStartAtZero` defaults `true` for `bar`, `false` for `line`/`area` (Amplitude's default is
  auto; Eyvar states it). The y-axis formatter is `formatMetric` by unit; money in SAR with the
  unit stated once in the axis label (D36's spirit: state the unit once).
- x-axis label density: at most one label per 64 px, chosen at bucket boundaries that are
  month starts, then week starts, then days; never rotated text (RTL rotates wrong).

### 4.5 Annotations

`Annotation { id, date: IsoDate, label, note, kind: 'launch' | 'price' | 'incident' | 'campaign' | 'other', createdBy, createdAt }`,
resource `annotations.list/save/delete`, permission `manage_analytics` to write. Drawn as a
vertical hairline with a small marker at the top on every trend chart whose window contains
the date; hover or focus shows label and note; the toolbar has `Add annotation` (a small
inline form under the chart, no dialog). Annotations are not in the query; they are context.

### 4.6 Brush

A `Brush` under trend charts with ≥ 30 buckets. Dragging narrows the **view**, not the query
(the x domain), and shows a `Zoomed · reset` chip. The brush handles must be interactive, so
they are the one exception to `INERT`, and the harness asserts a drag changes the domain and
that a click on a mark still fires. Keyboard: `[` and `]` step the brush edges.

### 4.7 Data labels and the table beneath

`dataLabels` draws the value on each mark when the bucket count × series ≤ 60; otherwise the
toggle is disabled with a reason. `showTable` opens `NumbersBehind` and persists.

### 4.8 Palette

`--chart-s7` and `--chart-s8` plus fills, minted by design-token-steward with the AA check
against both page values (D33) and a 1 px stroke distinguishability check against s1–s6.
`Other` is `--muted-foreground` in every chart and never takes a hue.

## 5. Funnel v2

```
FunnelSpec {
  steps: FunnelStep[]                       // 2 … 6, unchanged
  conversionWindow: { value: number; unit: 'hour' | 'day' | 'week' } | null
  mode: 'ordered' | 'unordered' | 'sequential'      // default 'ordered'
  holdConstant: DimensionKey | null
  exclude: MeasureKey[]                     // populations that disqualify a subject anywhere in the funnel
  measuredAs: 'conversion' | 'conversion-over-time' | 'time-to-convert'
  groupBy: DimensionKey | null
}
```

- `conversionWindowDays` is migrated to `{ value, unit: 'day' }` by `normaliseReportQuery`.
- The mock computes `ordered` and `unordered` over subject fixtures; `sequential`, `holdConstant`
  and `exclude` are refused by the planner with `funnel-needs-server` until the catalogue's
  `funnelCapabilities` says the server supports them.
- `conversion-over-time` produces a trend (grain applies again; `MODE_FIXES_GRAIN_TO_NONE`
  becomes a function of `measuredAs`). `time-to-convert` produces a distribution (p25, p50,
  p75, p90, p95 in the window's unit) drawn with `DistributionCard`.
- The cascade shows per step: count, % of first, % of previous, drop-off, median time to
  next step; clicking a step (a `<button>`) opens the drop-off group table when `groupBy` is set.

## 6. Retention v2 (`cohort`)

```
CohortSpec {
  anchorMeasureKey, returnMeasureKeys: MeasureKey[]    // OR-combined; migrated from returnMeasureKey
  cohortGrain: 'day' | 'week' | 'month'                // all computed in v2
  method: 'rolling' | 'nday' | 'bracket'               // default 'rolling'
  brackets: [number, number][] | null                  // in cohortGrain units, e.g. [[0,7],[7,14]]
  horizon: number                                      // 1 … 12 (month), 1 … 12 (week), 1 … 30 (day)
}
```

`buildCohortMatrix` generalises `monthDiff` to a grain difference. The matrix renders as it
does now, and gains a `curve` view: one line per cohort (up to 8, then fold) of retention by
interval, with the average curve bold. Strength in the matrix uses `--chart-fill-s1` at four
opacity steps from tokens (`--ev-heat-1…4`, minted), replacing the bar-length encoding
recorded at `ReportModeCanvas.tsx:31-39`.

## 7. Data table v2 (`table` mode)

```
TableSpec {
  columns: TableColumn[]                     // 1 … 8
  rows: ('time' | DimensionKey)[]            // 0 … 2; 'time' uses the query grain
  totals: boolean
  format: { column: number; bands: { lte: number; tone: 'success' | 'warning' | 'neutral' }[] }[]
}
TableColumn = { kind: 'measure'; ref: MeasureRef; filters?: FilterSpec[]; label?: string }
            | { kind: 'formula'; expression: string; label: string }
```

Each measure column is resolved as its own leg (its own `ReportSeries` set) so one blocked
column does not blank the table (§13.1 per series). Rows are the cross product of the row
dimensions (folded at 8 each) and time. Sorting by any column, totals row when every column is
additive (otherwise the total cell reads the aggregate word), conditional bands drawn with
R7's tones only (no red). The `ResultTable` component grows a `columns` mode; the existing
series table is the degenerate case `rows: ['time']`.

## 8. Library and organisation

- `SavedReport` gains `tags: string[]`, `official: boolean` (set only by `manage_analytics`),
  `updatedBy`, `versions: { at, by, query }[]` (last 20, server-kept), `starredBy: string[]`
  (server) rendered as a star toggle per viewer.
- Library views: `mine · team · starred · official · recent`. Filters: chart type, owner, tag,
  last run. A `Duplicate` row action.
- Builder overflow gains `Duplicate`, `Pin to page…`, `Create alert…`, `Ask the analyst`,
  `Version history` (a list under the header, restore = load query into the draft, not save).

## 9. Export

- CSV unchanged (long format, header block, SAR decimals).
- **PNG**: serialise the chart's SVG, draw it on a canvas at 2× with a caption band
  (title, window with dates, grain, comparison, filters, `asOf`, the page URL), download.
  Audit-logged like CSV (spec 06 §10.1). Fonts: the canvas uses the loaded Inter/Noto; the
  harness compares the PNG's dimensions and that the caption text is present via OCR-free
  check (the caption is also written to the PNG's `tEXt` chunk).
- PDF stays out.

## 10. States, added to spec 06 §8.3

| # | State | Sees | Reachable |
|---|---|---|---|
| 16 | Formula invalid | The formula field shows the parse error at the position; `Refresh` disabled | type `A /` |
| 17 | Too many series | Rail states the count and the ceiling; the last-added segment or split is marked as the one to remove | 2 measures × 4 segments × a split |
| 18 | Comparison length mismatch | Date popover states the required bucket count | fixed comparison of a different length |
| 19 | Series hidden | Legend entry struck through, chart re-scaled, tooltip omits it; URL unchanged | click a legend entry |
| 20 | Zoomed | `Zoomed · reset` chip; URL unchanged | drag the brush |
| 21 | Log scale unavailable | Control disabled with reason | a series with a 0 or a null-only series |
| 22 | Server-only funnel option | Option disabled with `rb.funnel.needsServer` in mock | choose `sequential` |

## 11. Copy

All new keys under `rb.*` (rail: `rb.control.formula`, `rb.control.transform.*`,
`rb.control.segments.*`; toolbar: `rb.viz.area` … `rb.viz.kpi`, `rb.view.*`; violations:
`rb.violation.formula*`, `rb.violation.tooManySeries`, `rb.violation.comparisonLength`;
annotations: `rb.annotation.*`; funnel: `rb.funnel.mode.*`, `rb.funnel.measuredAs.*`; retention:
`rb.cohort.method.*`; table: `rb.table.columns.*`). Arabic entries land in
`src/i18n/ar/reports.ts` in the same change. content-designer writes the reason sentences; every
reason is one sentence that names what to change.

## 12. What the backend receives

Unchanged endpoint, richer body: `POST /api/v1/reports/run` with a v2 `ReportQuery`. The
response is `ReportResult` v2 (`series[].groupValues`, `formulaLabel`, `segmentLabel`,
`comparisonDisplay` echoed, `annotations` in range). The server runs the same `planQuery` (it
imports `src/data/reporting/plan.ts`) and refuses the same violations with a 422 whose
`details[]` carry the violation codes, so the client and the server never disagree about
legality. See [05-backend.md](05-backend.md) §6.
