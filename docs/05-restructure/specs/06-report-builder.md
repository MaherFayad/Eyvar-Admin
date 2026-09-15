# 06 — Report Builder, Quick Dashboards, and Threshold Alerts

> **Owner:** product-owner · **Decision of record:** `DECISIONS.md` **D13**, extended by the
> business owner mid-drafting: *"and to be able to build quick dashboard, and alerts for
> this if it went over certain thresholds."*
>
> **Acceptance criteria: AC-800 … AC-905**, after §14a appended six. Nothing renumbered, nothing
> inserted, and nothing outside that range is claimed here.
>
> **Reconciled with the built semantic layer.** Ten contradictions came back. **Six
> criteria are amended in place** — AC-800 and AC-806 (⛔ blocked on **Q-RB-1**), AC-814
> (resource-qualified filter fields), AC-826 (`Compare separately` deleted by **R4-1 §1.3**, which
> this spec had not absorbed), AC-827 (it named a measure that cannot exist), AC-838 (the
> cardinality hint is a forecast, not a guarantee) — **§3.4, §4.2 and §6.2 are amended with them**,
> and **§14a appends AC-900–905**. **Three of the ten were defects in this spec, not in the build:**
> AC-827's measure, AC-814's bare `field` (two resources, one `status`), and `cadence` as a
> required choice between two values this document invented while §12.1 says nothing evaluates.
>
> **This spec defines no measure.** Per D13 the catalogue of what is measurable belongs to
> `specs/05-metrics-content.md`. Everything this document needs from that catalogue is
> listed in **§4.1** as a numbered finding. Where the catalogue does not yet exist, this
> spec writes against the *shape* of one and says so.
>
> **The dashboard model this spec describes is superseded.** **D39: a dashboard is a page —
> an ordered list of blocks, a saved-report tile one block kind among several.** Every mention
> below of a dashboard as a fixed grid of report tiles, a `Dashboard`/`DashboardTile` record, or
> pinning as a dashboard-only act (chiefly **§11 "Quick dashboards"** and **AC-865 … AC-873**)
> describes the pre-D39 model and is history, not a target to build. The current model — pages,
> blocks, migration from tiles — is `docs/09-analytics-v2/03-pages-and-dashboards.md`. This
> section is not rewritten line by line here: the replacement is a full spec of its own, not an
> edit to this one (F-V2 dashboards finding, disposed in WP-8.5).

---

## 0. The reference behaviour

The owner set this module's target by pointing at a product-analytics segmentation chart and
asking for *"a small module for reporting where the user can choose any data he wants and
compare it to any data he wants."* That product is not in the repo and is not consulted; what
binds is the behaviour, recorded here once, in Eyvar's own terms. Where `DESIGN.md` and this
behaviour conflict on this screen and on the metric boards, **this behaviour wins** — that is
the owner's standing override in `docs/RULINGS.md`.

**The reference behaviour, in full:**

1. **The question is composed on the screen, not chosen from a list.** A left panel holds the
   controls — measure, group-by, filter, grain, window, comparison — and the chart to its
   inline-end redraws as each control changes. No dialog, no wizard, no run button.
2. **A measure is picked by name from a catalogue**, with a search field over it, and the panel
   shows what it means without leaving the screen.
3. **Two measures can sit on one chart**, each with its own colour, and the legend names them.
4. **A group-by splits a measure into a series per group**, and the group count is visible before
   the chart is drawn.
5. **The window is a control of its own**, separate from the grain, and the two are never merged.
6. **A comparison is a second layer on the same chart**, drawn as a dashed line against the solid
   one — never as a second hue, because a hue already means a series.
7. **The chart type is a segmented control the query constrains**: an illegal chart for the
   current query is present and disabled, and it says why.
8. **A saved report is a first-class object with a name**, reopened into the same panel state.
9. **A chart pins to a dashboard**, and the dashboard is a grid of pinned charts, each of which
   reopens into the builder.
10. **The empty canvas is a sentence, not an illustration.** The data exists; the question has
    not been asked yet.

**Two things the reference does that Eyvar does not.** It offers funnels, retention curves,
cohort grids and path analysis; each is a distinct query model rather than a chart type over
this one, and §2.2 rules them out with that reason. And it uses one word for two different
comparisons — the failure §6 exists to prevent.

---

## 1. Problem

An operator can read any number the product has already decided is worth showing. There are
nine metric boards (`METRIC_BOARD_SUB_TABS`, `src/data/clients/metrics.ts`) and every tile on
them was chosen months ago by someone else. The operator cannot ask a question nobody
anticipated. Today, when the founder asks *"is the captain base growing faster or slower than
the rider base?"*, there are three routes and all three fail: read two tiles on two different
boards and hold the shapes in your head; export two CSVs (`exportRiders`, `exportDrivers`,
`eyvar_ops_panel_v40_fixed.html:7608`, `:7612`) and build the chart in a spreadsheet, which is
where every number that reaches a board deck currently comes from; or capture a *Daily
Snapshot* by hand (`captureDailySnapshot`, `:7639`) and wait — the legacy app's own copy admits
this, telling the operator that trend analysis will work *"the longer it's used"* (`:6979`) and
that *"this file has no server to auto-capture at midnight, so capture manually"* (`:2040`).
The one real chart in the product (`renderTrendChart`, `:6769`) plots a single hard-coded field
of that hand-captured snapshot table and refuses to render below two points (`:6774`). There is
no way to compose a question, no way to keep one, and no way to be told when an answer changes.

---

## 2. Scope

### 2.1 In

1. **A query model** — the composable object that expresses *"measure(s), split how, filtered
   how, over what window, at what grain, compared against what"* — and the single client
   operation that resolves it. This is the artifact; the panel is a form over it (§3).
2. **A composition surface**: pick measures, pick a group-by, pick filters, pick a window and
   grain, pick a comparison, pick a chart type. (§5)
3. **Two comparison controls that are not the same control** — a second *measure* and a
   previous *period*. (§6)
4. **Chart-type legality**: which chart types are legal for which query shapes, and what
   happens when the query changes underneath a chart type that was legal a moment ago. (§7)
5. **Naming, saving, re-opening and sharing a report.** (§9)
6. **Export** of the resolved data. (§10)
7. **Quick dashboards** — a named, ordered list of saved reports rendered through the
   existing §3.7 composer. (§11)
8. **Threshold alerts** — a rule over one series of one saved report, evaluated on a cadence,
   delivered into the *existing* notification centre. (§12)
9. All four base states plus fifteen named domain states, each reachable through the
   `?mockFail=` registry. (§8)

### 2.2 Out, each with its reason

| Out | Reason |
|---|---|
| **Any measure definition** | D13 splits ownership. A measure defined in two specs is a measure that drifts. Findings go to `05-metrics-content.md` (§4.1). |
| **Funnels, retention curves, cohort grids, path analysis** | The reference behaviour §0 records is a *segmentation* chart specifically. Each of the others is a distinct query model, not a chart type over this one. Naming them out is what keeps this "a small module". |
| **A formula / calculated-measure editor** (`measure A ÷ measure B`) | It turns the panel into an expression language with its own type system, unit algebra and error states. If an operator needs a ratio, the ratio is a measure and belongs in the catalogue. |
| **Dual y-axes** | Two axes on one plot is the single most reliable way to make two unrelated series look correlated. §7's rules make the honest alternatives explicit instead. |
| **Drag-and-drop dashboard grid** | Costed in §11.2. "Quick" is load-bearing in the owner's ask. Phase two. |
| **PNG / PDF export of the picture** | §10.3. The data is the artifact; the picture is reproducible from a link. |
| **XLSX** | A CSV opens in Excel — legacy's own export copy says exactly this (`:2024`). |
| **Scheduled report email digests** | An alert is *conditional* delivery; a digest is *unconditional* delivery. Different rule shape, different recipient model, and no email transport exists. |
| **Alerts on anything but a saved report's series** | An alert on an unsaved query has no stable identity to evaluate, no name to put in a notification, and nowhere to send the operator when it fires. |
| **Alert delivery by SMS / email / webhook** | No transport exists. §12.5 pins delivery to the notification centre that does. |
| **Nav badge participation for alerts** | §12.6. Argued, not assumed. |
| **Report-level row-drill (click a point → the rows behind it)** | Wants a resource-scoped list endpoint per measure — i.e. a second data contract on top of the one this spec is introducing. Named as the highest-value phase-two item. |
| **Real-time / auto-refresh reports** | §3.7's `Auto-refresh` checkbox is a board affordance. A builder re-runs on `Apply`; nothing polls. |

---

## 3. The query model

> **This section describes the v1 query model, extended rather than replaced.** **D42: `ReportQuery`
> gains `formula`, `transform`, `segments` and `comparisonDisplay`, all optional, behind a `v: 2`
> URL key** — a v1 object stays a valid v2 object. §3.2's shape below is missing all four fields,
> its `chartType` lists 4 of the now 9 (`src/data/types/report.ts:159-168`: line, area, bar,
> stacked-bar, stacked-100, horizontal-bar, pie, kpi, table), its `ReportPreset` lists 9 of the
> now 13 (`:82-101`: adds `this-quarter`, `last-quarter`, `this-year`, `year-to-date`), and its
> `groupBy` is single-level where the query now takes up to two. The full v2 shape and the gap
> list it closes are `docs/09-analytics-v2/02-report-builder-v2.md` §1–§2. Not rewritten here for
> the same reason §11 is not: it is a second spec, not an edit to this one.

### 3.1 In one paragraph

A report is a **`ReportQuery`**: one or two `measureKey`s drawn from the catalogue, an optional
`groupBy` dimension legal for those measures, a list of `FilterSpec`s drawn from the *existing*
transport vocabulary (`src/data/types/common.ts`), a `window` (a named preset or an absolute
pair of dates), a `grain`, an optional `periodComparison`, and a `chartType`. It resolves
through **one new client operation, `reports.run`**, which returns a **`ReportResult`** — an
ordered array of bucket boundaries plus a flat list of typed `ReportSeries`. It does *not*
resolve through the 34 per-resource clients, because the question names no resource: `drivers.list`
returns `Paginated<Driver>` and there is no argument to it that means "weekly, last 90 days,
counted". The panel is a form whose value is a `ReportQuery`; the URL is that object serialised;
a saved report is that object plus a name and an owner; a dashboard tile is a pointer to a saved
report; an alert rule is a pointer to one `ReportSeries` inside one saved report plus a
comparator and a threshold. **Everything in this module is that one object at four levels of
persistence.**

### 3.2 The shape

```
ReportQuery {
  measures:          MeasureRef[]        // 1 or 2. See §6.1 for why not more.
  groupBy:           string | null       // a dimension key legal for every measure listed
  filters:           FilterSpec[]        // the existing vocabulary, unchanged
  window:            ReportWindow
  grain:             'day' | 'week' | 'month' | 'none'
  periodComparison:  'none' | 'previous-period' | 'previous-year'
  chartType:         'line' | 'bar' | 'pie' | 'table'
}

MeasureRef   { key: string }             // catalogue key. See finding F-9.
ReportWindow = { kind: 'preset';   preset: ReportPreset }
             | { kind: 'absolute'; from: IsoDate; to: IsoDate }
ReportPreset = 'today' | 'yesterday' | 'last-7d' | 'last-30d' | 'last-90d'
             | 'last-365d' | 'last-month' | 'last-12-months' | 'last-year'
```

`ReportPreset`'s nine values are §3.7's own preset list, verbatim, so the range popover this
module needs is the range popover the metric boards already specify. It is not a new control.

### 3.3 Why this is a different data contract

`Paginated<T>` answers *"which records"*. `ReportResult` answers *"how many, bucketed how"*.
They share `QueryParams.filters` and nothing else, and that sharing is deliberate: §3.4.

### 3.4 Filters reuse the existing vocabulary — no second model

`FilterSpec { field, op, value }` with the twelve `FilterOperator`s already exists and is
already the thing the table controls emit (`src/lib/columnFilter.ts` — *"exactly one
`FilterSpec`… never introduce a parallel filter model"*). The report builder emits the same
objects from the same six control kinds (`ColumnFilterKind`), and inherits, for free, the three
rules that file encodes: an empty control produces no filter; `false` is a value, not an
absence; a date range is inclusive of the whole end day in Riyadh.

**What it does not inherit is the `field` vocabulary, and that is a safety fix rather than a
preference.** `FilterSpec.field` is a **bare string**, and `subscriptions` and `trips` both carry
`status` with unrelated vocabularies — so a two-measure query specified as §3.4 originally read
would apply one resource's value to the other and return a confidently wrong number. **Every
filterable field in a report query is therefore resource-qualified** — `subscription.status`,
`trip.status` — while an index table's stays bare, because an index table has exactly one resource
and its `field` cannot be ambiguous within its own surface. **One model, one type, two
vocabularies; see AC-814 for the two consequences that ride with it.**

What it also does **not** inherit is *which fields are offered*. There are 382 filterable fields
across the data layer and almost none of them are meaningful against a given measure —
`driver.city` against a subscriptions measure is a question with no answer. The catalogue must
declare a filterable-field set per measure (**F-5**); until it does, the filter picker is
scoped to the intersection of the fields declared by every measure in the query, and that
intersection is empty for a two-measure query across two resources. **That is the correct
behaviour, not a bug**: a filter that cannot apply to both series must not silently apply to
one.

### 3.5 Grain, window, buckets

- Buckets are **Riyadh-local** (`Asia/Riyadh`, UTC+03:00, no DST — the same fact
  `src/lib/columnFilter.ts` is built on). A bucket boundary is a local midnight, never a UTC one.
- **The week starts on Sunday**, because the Saudi working week is Sunday–Thursday. This was a
  position, not a derivation, until **D45** ratified it: Sunday-start and Monday-start produce
  different numbers for every weekly report ever exported, and the answer is now settled, not
  owed. **Q-RB-3 is closed.**
- The catalogue declares `minGrain` per measure (**F-4**). The grain control offers only grains
  at or coarser than the coarsest `minGrain` among the query's measures.
- **`grain: 'none'`** collapses the window to one bucket. It is what a pie or a single-value
  read requires and it is a legal grain, not an absence of one.

**When window and grain disagree** — three cases, three different behaviours, none of them silent:

| Case | Behaviour |
|---|---|
| Grain finer than the measure's `minGrain` | The finer grain is **disabled in place** in the control with a reason. Never hidden, never auto-corrected after the fact. |
| Window produces **> 400 buckets** per series | The finer grain is disabled with the reason, and the report states the coarsest grain that fits. The report never silently downgrades and then draws. |
| Window produces **< 2 buckets** while `chartType` is `line` | The line is illegal (§7). Legacy already knows this and says so at `:6774`. |

**Partial buckets.** The first and last bucket of a window are usually incomplete. They are
**rendered and marked**, never dropped and never extrapolated: a flow measure's final partial
bucket is what makes every trend look like a collapse at the right-hand edge. A partial bucket
is excluded from the period-comparison delta.

### 3.6 The result

```
ReportResult {
  query:      ReportQuery            // echoed, so a stale response is detectable
  asOf:       IsoDateTime            // when the server computed it. Required.
  buckets:    IsoDate[]              // bucket start boundaries, ascending
  series:     ReportSeries[]
  truncated:  boolean                // a server-side row cap was hit
  warnings:   ReportWarning[]        // 'partial-first' | 'partial-last' | 'grain-coarsened'
                                     // | 'groups-folded' | 'gaps-outside-fixture-range'
}

ReportSeries {
  id:                    string                  // stable within the result
  measureKey:            string
  groupValue:            string | null           // null when there is no group-by
  role:                  'current' | 'comparison'
  unit:                  MetricUnit              // reused from src/data/types/metrics.ts
  currency:              CurrencyCode | null
  temporality:           'stock' | 'flow'        // echoed from the catalogue
  points:                (number | null)[]       // parallel to `buckets`
  partialBucketIndexes:  number[]
  blocked:               PermissionKey | null    // §13 — authorised server-side, per viewer
  failed:                { code: string; retryable: boolean } | null
}
```

`points[i] === null` is a **gap, not a zero** — the exact rule `src/data/types/metrics.ts`
already argues for on `SeriesPoint`: *"a chart draws a break, not a dip to the axis, and
conflating them is how an outage looks like a collapse in demand."* This spec does not restate
the rule; it inherits it.

`blocked` and `failed` are **per series, not per result**, so a two-measure report where one
measure is unauthorised or one query leg fails renders the half that worked. A whole-result
throw would make every multi-measure report all-or-nothing.

---

## 4. Data

### 4.1 What this spec needs from the measure catalogue — nine findings

`specs/05-metrics-content.md` did not exist when this was written. These are written against
the shape of a catalogue and each is a **finding for its author**, not a definition made here.

| # | Field needed on every measure | Why the report builder cannot work without it | Blocks |
|---|---|---|---|
| **F-1** | `temporality: 'stock' \| 'flow'` | §6.2. A stock and a flow bucketed the same way produce a chart that is confidently wrong. Today the signal exists but only *per instance and implicitly*: `Metric.periodStart`/`periodEnd` are both `null` on a point-in-time metric. That is not a catalogue property and cannot be read before a query runs. | AC-820…727 |
| **F-2** | `additive: boolean` | Whether values may be summed across buckets or across groups. Gates stacked bars and gates the pie entirely (§7.2). A pie of averages is arithmetic nonsense. | AC-838, AC-841 |
| **F-3** | `dimensions: DimensionRef[]` — legal group-bys per measure, each with a cardinality hint | Without it the group-by picker offers `city` on a measure with no geography and the operator learns the rule by getting an error. | AC-812, AC-842 |
| **F-4** | `minGrain: 'day' \| 'week' \| 'month'` | A measure sourced from daily snapshots cannot answer hourly, and a measure derived from a monthly close cannot answer daily. §3.5. | AC-816 |
| **F-5** | `filterableFields: string[]` | 382 filterable fields exist; a measure is meaningful against a handful. §3.4. | AC-813 |
| **F-6** | `unit` + `currency` | **Already exists** on `Metric`. Recorded so it is not dropped. | AC-828 |
| **F-7** | `higherIsBetter` | **Already exists** on `Metric`. The alert builder needs it to word a comparator honestly and to decide whether "over the line" is good news. | AC-878 |
| **F-8** | `permission: PermissionRef \| null` per measure | **The D4 hook.** Without per-measure permission there is no way to specify sharing, dashboards or alerts at all — §13. This is the single most load-bearing missing field. | AC-888…793 |
| **F-9** | A measure identity **independent of where it is displayed** | `Metric.key` is namespaced by sub-tab: `management.overview.activeCaptains`. If the same underlying figure appears on two boards it gets two keys, and a report is then pinned to a *board's naming decision* rather than to a measure. "Active captains" must be one measure with one key regardless of how many tiles show it. | Everything |

**F-9 is the sharpest.** If the catalogue ships with board-namespaced keys only, every saved
report and every alert rule in this module carries a foreign key into a display decision, and
moving a tile between boards breaks saved reports. Escalate before the catalogue freezes.

### 4.2 Fields this module owns

**`SavedReport`** — persisted (Q1).

| Field | Type | Source | Derived |
|---|---|---|---|
| `id` | `string` | server | no |
| `name` | `string` (1–80 chars) | operator | no |
| `description` | `string \| null` | operator | no |
| `query` | `ReportQuery` | operator (the panel) | no |
| `ownerId` | `string` — a `TeamUser.id` | session at create time | no |
| `visibility` | `'private' \| 'team'` | operator | no |
| `createdAt` / `updatedAt` | `IsoDateTime` | server | no |
| `pinnedToDashboardIds` | `string[]` | server | **yes** — a reverse index, read-only, and the reason §11.3's delete confirmation can name the dashboards it will affect |

**`Dashboard`**

| Field | Type | Source | Derived |
|---|---|---|---|
| `id` | `string` | server | no |
| `name` | `string` (1–80) | operator | no |
| `ownerId` | `string` | session | no |
| `tiles` | `DashboardTile[]` | operator | no |
| `createdAt` / `updatedAt` | `IsoDateTime` | server | no |

**`DashboardTile`**

| Field | Type | Source | Derived |
|---|---|---|---|
| `tileId` | `string` | server | no |
| `reportId` | `string` | operator | no — **a reference, never a copy.** §11.3 |
| `pinnedName` | `string` | copied at pin time | **display fallback only.** Rendered *only* when `reportId` no longer resolves, so a missing tile can name what it used to be. It is never the source of truth for a resolvable tile. |
| `order` | `number` | operator | no |

**`AlertRule`**

| Field | Type | Source | Derived |
|---|---|---|---|
| `id` | `string` | server | no |
| `name` | `string` (1–80) | operator | no |
| `reportId` | `string` | operator | no |
| `seriesId` | `string` | operator — one series of that report | no |
| `comparator` | `'gt' \| 'gte' \| 'lt' \| 'lte'` | operator | no — deliberately the same four names as `FilterOperator`, so the product has one comparator vocabulary |
| `threshold` | `number` | operator | no |
| `thresholdUnit` | `MetricUnit` | **derived** from the series' measure | yes — an operator never picks a unit; a threshold on a money measure is halalas on the wire and SAR in the field |
| `evaluationGrain` | `'day' \| 'week' \| 'month'` | operator | no — which bucket's value is tested |
| `cadence` | `'hourly' \| 'daily' \| null` | **server** | no — how often the server looks. **`null` means *not specified, does not run*.** **Q-RB-7 is closed by D41**: the server evaluates on Vercel Cron at exactly two cadences, `hourly` and `daily`, so the two values this spec once minted unilaterally are now the scheduler's real cadences, not a guess. **Amended:** §4.2's required operator choice and §12.1's "nothing evaluates" no longer disagree — a rule may still not offer a cadence the scheduler does not implement, and none beyond these two exists. |
| `minReArmMinutes` | `number \| null` | operator | no — the backstop re-arm in §12.4's state machine, for a value that oscillates across the line. `null` means hysteresis only, which is the default. **Added 2026-08-27: it was specified in §12.4's prose and absent from this table**, so the type the spec gives could not express the state machine the spec describes — the under-specified half of *writing a rule about code without reading the code* |
| `state` | `'armed' \| 'firing' \| 'cooling' \| 'suspended' \| 'error'` | server | **yes** — §12.4 |
| `enabled` | `boolean` | operator | no |
| `mutedUntil` | `IsoDateTime \| null` | operator | no |
| `recipientIds` | `string[]` — `TeamUser.id`s | operator | no |
| `ownerId` | `string` | session | no — **evaluation authority**, §13.3 |
| `lastEvaluatedAt` / `lastFiredAt` | `IsoDateTime \| null` | server | no |
| `lastValue` | `number \| null` | server | no |

### 4.3 Client operations

All new, all behind the existing `DATA_SOURCE` seam, all registered in `knownOperations()` so
every one is reachable from `?mockFail=`.

| Operation id | Endpoint | Returns |
|---|---|---|
| `catalogue.measures` | `GET /api/v1/catalogue/measures` | `Paginated<Measure>` — owned by `05-metrics-content.md` |
| `catalogue.dimensions` | `GET /api/v1/catalogue/dimensions` | `Paginated<Dimension>` — as above |
| `reports.run` | `POST /api/v1/reports/run` | `ReportResult` |
| `reports.list` | `GET /api/v1/reports` | `Paginated<SavedReport>` |
| `reports.get` | `GET /api/v1/reports/:id` | `Single<SavedReport>` |
| `reports.save` | `POST` / `PATCH /api/v1/reports/:id` | `Single<SavedReport>` |
| `reports.delete` | `DELETE /api/v1/reports/:id` | `204` / `409` when pinned |
| `dashboards.list` / `.get` / `.save` / `.delete` | `/api/v1/dashboards…` | as above |
| `alerts.list` / `.get` / `.save` / `.delete` | `/api/v1/alerts…` | as above |
| `alerts.evaluate` | `POST /api/v1/alerts/:id/evaluate` | `AlertEvaluation` — **foreground only**, §12.3 |
| `alerts.history` | `GET /api/v1/alerts/:id/history` | `Paginated<AlertFiring>` |

`reports.run` is a **POST** because a filter list can exceed a URL. The *sharing* URL is a
separate, client-side serialisation of the same object (§9.2) — the tension is real and is
resolved by keeping the two encodings independent rather than by making one serve both.

### 4.4 What the mock layer must fake, honestly

1. **Bucketing over fixtures.** The fixtures are anchored to `EYVAR_NOW` and span roughly one
   month (`DB.dailySnapshots` covers 26 Jun → mid-Jul, `:13802`). A 90-day window is therefore
   **legitimately mostly gaps**, and the mock must emit `null` outside the fixture range —
   **not zeros, and not synthetic noise.** A mock that invents a smooth 90-day trend produces a
   screen that is a lie, and the first real backend response will look broken by comparison.
   `warnings: ['gaps-outside-fixture-range']` says so out loud.
2. **A group-by fold**, so `groups-folded` is reachable.
3. **A `truncated: true` result**, so the cap's copy is reachable.
4. **One seeded already-fired alert** with one seeded `Notification` pointing at it — otherwise
   the entire delivered state of §12 is unreachable without a scheduler.
5. **A per-series `blocked` response** under a switched mock user, so §13.1 is testable before
   D4 lands.

---

## 5. The screen(s)

### 5.1 Where it lives in the IA

**Position: a new sub-tab, `management-reports`, at Management order 6.** Not a full-bleed
route, not a shell layer.

- **Not full-bleed.** The plan editor is full-bleed (**AC-13**) because it is a deep edit of
  *one record reached from a list*, and it removes the nav so the record can own the frame. A
  report builder is a place an operator **goes**, and they go back and forth between it and the
  boards it complements. Removing the rail would make the one screen whose job is comparison the
  one screen you cannot leave.
- **Management**, because all five existing Management sub-tabs are §3.7 boards and the report
  builder is the ad-hoc sibling of a fixed board. Putting it in Admin would file "ask a question
  about the business" under configuration.
- **This makes 35 sub-tabs, and D1 says 34.** That is a **D1 amendment and must be recorded as
  one in `DECISIONS.md`** before the route table is edited. It is the owner's call, not this
  spec's. See **Q-RB-1**.

Route table rows required (a data change in `src/data/fixtures/routeTable.ts`, owned by
mock-data-engineer):

| | |
|---|---|
| `subTabId` | `management-reports` |
| `path` | `/management/reports` |
| `views` | `reports` (default) · `dashboards` · `alerts` — `?view=`, a control not a level, per §3.8 rule 3 |
| `detailRoutes` | `/management/reports/:reportId` · `/management/reports/dashboards/:dashboardId` |
| `shape` | `single` |
| `hasBacklog` | **`false`** — §12.6 |
| `legacyPageIds` | `[]` — nothing in the census maps here. It is genuinely new. |
| `permission` | unresolved — **Q4 / D4** |

`DetailRoute.kind` is a closed union today (`'corporate' \| 'applicant' \| 'ticket' \|
'plan-editor' \| 'entity'`). Two new values are needed: `'report'` and `'dashboard'`. That is a
type change in `src/data/types/navigation.ts` — **mock-data-engineer's file, mock-data-engineer's
change.**

### 5.2 Pattern mapping — and one row that does not exist

| Surface | §6.4 row | Pattern key |
|---|---|---|
| `?view=reports` — the saved-report library | **Index table** + view tabs + filters (§3.1–3.3) | P1 |
| `?view=dashboards` — the dashboard list | Index table (§3.1) | P1 |
| `?view=alerts` — the rule list | Index table (§3.1) | P1 |
| A saved report, rendered | **Metric tiles + chart cards** (§3.7) | P5 |
| A dashboard, rendered | Metric tiles + chart cards (§3.7) | P5 |
| **The builder itself** — query panel beside a live result canvas | **NO ROW EXISTS** | — |

**Finding F-P1, escalated to product-designer rather than invented here.** `docs/ref/patterns.md`
maps all 41 pages and states plainly: *"A page with no row here may not be designed until it gets
one."* The builder is a persistent composition panel beside a canvas that re-renders on `Apply`.
It is not §2.5's full-bleed editor (that pattern is about inspector panels and device previews,
and patterns.md already warns that the monitoring shell was wrongly filed there), and it is not a
sectioned form (§4.1) because it has no save bar semantics and no record.

**The nearest thing already ruled is §3.7's *customise mode*** — a distinct mode with a left
**Metrics library** sidebar grouped by category with a chart-type icon per metric, a contextual
save bar, and canvas cards. That is remarkably close to what the builder needs, and it is
already binding. **Recommendation, not a decision:** the builder is §3.7 customise mode
generalised from "pick which tiles show" to "compose one". product-designer confirms it or mints
a §6.4 row. **AC-801 is blocked until they do.**

### 5.3 The panel — what is on it, in order

The order is the order the question is asked in, not the order the fields exist in the type.
Each control's *shape* is the designer's; its *presence, order and dependency* is this spec's.

1. **Measure** — required, first, and the only control enabled on an empty report.
2. **Add a second measure** — disabled until (1) is chosen; offers only measures legal to pair
   with it (§6.2).
3. **Split by** (group-by) — disabled until (1); offers only dimensions from **F-3**.
4. **Filters** — the existing filter control, scoped per **F-5** (§3.4).
5. **Date range** — a chip showing the current range, opening §3.7's preset-plus-calendar
   popover with an explicit `Apply`. Not a new control.
6. **Grain** — day / week / month / none, with illegal grains disabled in place (§3.5).
7. **Compare to** — a *separate adjacent chip* (§3.7 already requires this), carrying the
   **period** comparison only (§6.3).
8. **Chart type** — line / bar / pie / table, illegal types disabled in place (§7.3).
9. **Run** — the explicit commit. Nothing re-runs on keystroke.

**An empty report — R8's second kind of empty.** Before a measure is chosen the canvas is
**not** a first-run illustration. `docs/ref/states.md` is explicit that the illustration
treatment is for "whole page, zero records ever" and implies the data does not exist. The data
exists; the *question* has not been asked. So the canvas carries **one grey sentence** naming
what to do, the panel's first control is focused, and every other control is disabled in place.

---

## 6. Comparison — two controls that share a word

This is the failure D13 predicted and the one this section exists to prevent. The reference
behaviour (§0) does both of these and calls them the same thing. They are not the same thing.

### 6.1 Two measures on one axis — *series comparison*

The owner's example: *"number of drivers vs passengers trend"*. Two different measures, one
window, one grain. Produces **N series where N = the number of measures × the number of groups**.

**Capped at two measures.** Not because two is a natural number but because the third series is
where a chart stops answering a question and starts being a dashboard: three measures on one
axis is three units in tension, three legend entries, and a y-axis that belongs to none of them.
An operator who needs three builds two reports and pins both to a dashboard — which is exactly
what §11 is for.

### 6.2 Stock vs flow — the position

The owner's own two examples are not the same kind of number, and nothing in the product
currently records the difference:

- **`number of drivers`** is a **stock**: how many exist as of an instant. It has no period.
  `Metric` already models this implicitly — a point-in-time metric carries
  `periodStart: null, periodEnd: null`, and `src/data/types/metrics.ts` says why: *"'active
  captains right now' is not a period, and giving it one invites a date-range control that would
  do nothing."*
- **`subscriptions`** over time is a **flow**: how many *started* within a period.

**The model distinguishes them with one required catalogue field, `temporality` (F-1), and two
resolution rules:**

1. A **stock** is evaluated **as of the last instant of each bucket** — an end-of-period reading.
   Changing the grain changes the *sampling density* of a stock and never changes its values.
2. A **flow** is **aggregated over the bucket** (summed if `additive`, otherwise the catalogue's
   declared aggregate). Changing the grain **changes every value**: weekly new subscriptions are
   roughly seven times daily new subscriptions and the shape is not the same shape.

**How the UI stops a nonsensical pairing: it does not offer it.** Once a first measure is
chosen, the second-measure picker is filtered to measures with **the same `temporality` and the
same `unit`**. A stock cannot be paired with a flow, and a count cannot be paired with a percent
or a money amount.

This is a refusal, not a warning. A warning that can be dismissed is a warning that *will* be
dismissed, and the resulting chart gets screenshotted into a board deck where the warning does
not travel. The cost of refusing is one extra click; the cost of warning is a wrong number in
front of the founder.

**There is no escape hatch, because there is nothing to escape from.**
**Amended (`design/07-rulings-r4.md` §1.3).** This paragraph offered
**`Compare separately`** as an opt-in escape from a one-axis overlay. **The ruling deleted the
overlay**, so it deleted the control with it: two measures render as **two stacked panels sharing
one window, one grain and one x-axis extent**, each with its own y-axis — **unconditionally, with
no control**. Below the second-measure picker sits one grey sentence, *`Two measures are drawn as
two panels so their scales stay honest.`* The ruling amended **AC-826** in its own text and this
section was left describing the deleted control for long enough that the build found it. Costs no
new chart contract and no new token, as before.

**Both of the owner's examples survive this rule.** `drivers vs passengers` is stock/stock,
count/count → one axis, legal. `subscriptions vs whatever` is flow/× → one axis if the other
side is also a flow count, stacked panels otherwise.

### 6.3 The same measure against a previous period — *period comparison*

A separate control, a separate chip, a separate encoding, and it is **already specified**. §3.7
requires: *"the compare control MUST be a separate adjacent chip"*, *"comparison series MUST be
dotted/dashed and MUST use the same hue as the primary series, never a second colour"*, and
*"every chart card MUST carry a legend naming both periods explicitly with dates"*.

Values: `none` · `previous-period` (the immediately preceding window of equal length) ·
`previous-year` (the same calendar window one year earlier). Each produces one
`role: 'comparison'` series **per current series**.

### 6.4 The two controls together

They compose. 2 measures × period comparison = **4 series, and 4 is the ceiling**. When both are
on, the comparison series is dotted **in its own measure's hue**, which is precisely what §3.7's
rule says once a second hue is permitted at all — and it is not, today:

### 6.5 Finding F-P2 — the blocking one, for product-designer and the owner

**There is no categorical series palette, by construction.** `src/data/clients/metrics.ts` states
it, `src/data/types/metrics.ts` enforces it in the type (`TimeSeries` has `current` and
`comparison`, *"there is no third field and there will not be one"*), and `globals.css` deletes
shadcn's `--chart-1…5` ramp rather than remapping it. §3.7's rule — *"never a second colour"* —
is a rule about a **period** comparison and is correct for that case. Applied to a **series**
comparison it forbids the owner's headline example outright: two measures on one axis need two
hues, because dotted-vs-solid is already spent on the period comparison and cannot also carry
measure identity.

**This is a §6.2 deviation entry and a token mint. This spec does not authorise it.** What it
does is state the cost of each answer:

| Answer | Cost |
|---|---|
| Mint a small categorical palette (2–4 hues, each AA against the canvas and distinguishable at a 1px stroke) | A §6.2 entry, N new tokens, an accessibility pass, and R5a scrutiny if any hue is near red |
| **Ship multi-series as small multiples** — stacked panels, one hue each | **Zero new tokens, buildable today.** Answers "drivers vs passengers" as two aligned panels rather than two overlaid lines. Not what the reference does. |
| Do not ship multi-series | Fails the owner's stated ask |

**Recommendation: small multiples now, single-axis overlay when the palette exists.** That keeps
the owner's question answerable on day one and makes the gap a visible, closable one instead of a
blocked feature. **Everything multi-series — two measures on one axis *and* any group-by
producing more than one series — is gated on this single decision.** AC-828 and AC-835 record it.

---

## 7. Chart types

> **Covers 4 of the 9 chart types.** `area`, `stacked-bar`, `stacked-100`, `horizontal-bar` and
> `kpi` (G8, `02-report-builder-v2.md` §3) have their own legality gates — a non-additive measure
> cannot stack, `kpi` wants `grain: 'none'` — implemented in `src/data/reporting/plan.ts`'s
> `chartLegality` (`:1012`), which is the ground truth for all nine. The matrix below is not
> extended to match; it still holds for the four it names.

### 7.1 The legality matrix

| Query shape | line | bar | pie | table |
|---|---|---|---|---|
| 1 measure · no split · grain ≠ none | **default** | legal | illegal | legal |
| 2 measures · same unit + temporality · grain ≠ none | **default** | legal (grouped) | illegal | legal |
| 1 measure · split by a dimension · grain ≠ none | legal (≤ 8 series) | legal | illegal | legal |
| 1 measure · split by a dimension · `grain: 'none'` | illegal | **default** | legal *only* if **F-2** `additive` **and** ≤ 6 parts | legal |
| 1 measure · no split · `grain: 'none'` | illegal | illegal | illegal | **default** (a single value) |
| any query whose unit is `percent`, `ratio` or `rating` | legal | legal | **illegal always** | legal |
| any query producing **< 2 buckets** | illegal | legal | legal | legal |

### 7.2 Why the pie is nearly always illegal

The owner's reference screenshot is a pie of a two-value breakdown, and that is close to the only
case where a pie is defensible: a **part-of-whole** split of an **additive** measure at a single
point in time, with few enough parts to read. A pie of averages, of percentages, or of a measure
that does not sum to a meaningful whole is arithmetic nonsense wearing a chart. Hence the two
gates — `additive` (**F-2**) and `grain: 'none'` — and the hard six-part ceiling.

### 7.3 What happens when a user picks an illegal one

**They cannot.** Illegal chart types are **disabled in place with a reason**, never hidden. This
is the ruling already settled for controls in D9's CQ-3 — *destinations and records are absent;
actions are disabled in place with a reason* — and the reason is what teaches the rule.

**What happens when the *query* changes underneath a legal chart type** is the harder case and
must not be silent: the report **switches to the nearest legal type and says so, inline in the
chart card**. Nearest is defined: line → bar → table, and pie → bar. It is **not** a page banner
(R5 sends critical state to a page-level banner and this is not critical) and **not** a toast
(R10: a toast is for a transient confirmation, and this is a standing condition of the chart in
front of you). It is a note attached to the object it describes.

### 7.4 Group cardinality

A split producing more than **8 groups** folds the remainder into a single `Other` series.
`Other` is always last, and is **rendered even when its value is zero**, so it is visible that
something was folded. `warnings: ['groups-folded']` carries the count that was folded, and the
legend names it. Silently dropping the tail is how a report tells an operator that the long tail
does not exist.

---

## 8. States

### 8.1 The four base states, per surface

| Surface | Content | Empty | Loading | Error |
|---|---|---|---|---|
| Measure picker (`catalogue.measures`) | grouped list | *"No measures match."* — one grey sentence, filtered-to-zero | skeleton list, not a spinner | inline, retry in place; the panel stays usable for everything already chosen |
| Result canvas (`reports.run`) | the chart | §3.7's exact sentence, punctuation included: **`There was no data found for this date range.`** — card, title and frame retained | skeleton **shaped like the chart**, in the canvas, panel still interactive | error inside the canvas with a retry; the query is not lost |
| Report library (`reports.list`) | index table | **two different empties** — see §8.2 | table skeleton | table error state |
| Dashboard list / a dashboard | tiles | §11.4 | skeleton tiles | error state |
| Alert list | index table | first-run empty | skeleton | error state |

### 8.2 The two kinds of empty, applied

| Where | Kind | Treatment |
|---|---|---|
| Report library with **no saved reports ever** | R8 first-run | illustration + heading + 1–2 sentences + a `New report` action |
| Report library **filtered to zero** | R8 second kind | one grey sentence + a clear-filters action. Never the illustration — it would claim the reports do not exist |
| An **unstarted** report (no measure chosen) | R8 second kind | one grey sentence. §5.3. It is not first-run; the question simply has not been asked |
| A report that **ran and returned no rows** | R8 second kind | §3.7's sentence verbatim, frame retained |
| A dashboard with **no tiles** | R8 first-run *for that dashboard* | illustration + `Add a report` |

### 8.3 The fifteen domain states

Each is named, each has a rendering, and the right-hand column is how QA reaches it.

| # | State | What the operator sees | Reachable via |
|---|---|---|---|
| 1 | **Unstarted** — no measure chosen | Grey sentence; only the measure picker enabled | default |
| 2 | **Dirty** — query edited since the last run | The canvas keeps the **previous** result, visibly marked stale with its `asOf`, and `Run` is the primary. Never a blanked canvas; never a silently stale one | edit any control |
| 3 | **Partial data** — the window extends past the data | Chart draws a **break**, not a zero; `gaps-outside-fixture-range` states it | `last-90d` on fixtures |
| 4 | **Partial bucket** — first/last bucket incomplete | The bucket renders, marked, and is excluded from the delta | any window not on a boundary |
| 5 | **Grain coerced** — the chosen grain exceeds the cap | Finer grain disabled in place with its reason before the run | 2-year window at `day` |
| 6 | **Chart type coerced** — the query outgrew the chart | Nearest legal type, with the inline note (§7.3) | add a split to a pie |
| 7 | **Truncated** — a server row cap was hit | The chart renders with a stated caveat naming the cap. Not a silent partial | `truncated: true` fixture |
| 8 | **Groups folded** | `Other` series present and named in the legend | a high-cardinality split |
| 9 | **One series blocked** (permission) | That series' panel replaced by the blocked panel naming the permission; the other series renders normally | `switchMockUser` |
| 10 | **One series failed** (partial failure) | That series' panel carries its own retry; the rest of the report is live | `?mockFail=` on one leg |
| 11 | **Report edited by someone else** since it was opened | Standing notice on the report offering `Reload`. The operator's unsaved edits are never discarded to make room for theirs | `updatedAt` mismatch |
| 12 | **Report deleted while open** | The report becomes read-only with a notice; `Save` becomes `Save as new` | `reports.get` → 404 |
| 13 | **Dashboard tile missing** — pinned report deleted | Tile keeps its frame and `pinnedName`, one sentence, `Remove tile`. §11.3 | dangling `reportId` |
| 14 | **Alert firing** | The rule row and the report both carry the firing state; a notification exists | seeded fired alert |
| 15 | **Alert suspended** — owner lost access to the measure | Rule stops evaluating, row states why, only the owner or an admin can resolve it. §13.3 | `switchMockUser` + `blocked` |

Every mutation has a failure path: `reports.save`, `reports.delete`, `dashboards.save`,
`alerts.save` each fail into an inline error on the surface that initiated it, with the operator's
input preserved. A failed save never closes the dialog it came from.

---

## 9. Saving, naming, re-opening, sharing

### 9.1 What Q1 costs each artifact

**Q1 (persistence) is open and there is no storage adapter.** `src/lib/persistence.ts` is
explicit that shipping a `localStorage` adapter would be *"answering Q1 by writing code"*. This
spec does not answer it. It states what each artifact needs and what it degrades to:

| Artifact | Needs | Without Q1 |
|---|---|---|
| **A composed query** | nothing | **Works fully.** §9.2 — the URL is the storage. |
| **A named, saved report** | a server record: id, owner, name, query, timestamps | Cut. There is nowhere to put a name. |
| **A dashboard** | a server record holding report ids and order | Cut entirely — a dashboard is a list of ids and the ids do not exist. |
| **An alert rule** | a server record **and a scheduler** | Cut entirely — §12. |

### 9.2 The URL is the storage adapter for the core

**`ReportQuery` MUST be losslessly serialisable into the URL and losslessly restorable from
it.** This is an acceptance criterion (AC-853), not an implementation note, and it is what lets
the irreducible core ship with Q1 open:

- Reload does not lose the question.
- Browser Back steps through previous questions.
- **Sharing works with no share feature**: paste the link into a chat. That is how every
  analytics tool is actually used, and it costs nothing.
- A report in a bug report is a URL, not a screenshot.

The serialisation is a single opaque search param (a compact encoding of the query object), not
one param per control — one param keeps §3.8's URL rules intact and keeps `?view=` and
`?entity=` unambiguous.

### 9.3 Naming and re-opening (needs Q1)

- A report is saved from the builder with a required name and optional description.
- `Save` on an already-saved report updates in place. `Save as` creates a new one and navigates
  to it. The distinction is visible before the click, not discovered after.
- Re-opening a saved report restores the query, runs it, and shows a fresh `asOf` — **it does not
  show the numbers from when it was saved.** A report is a question, not an answer.
- `visibility: 'private' | 'team'`. `team` reports appear in every operator's library, subject to
  §13.1.

### 9.4 Sharing — the D4 shape

A shared report is a link plus, when Q1 lands, a `team` visibility flag. The permission question
is §13.1 and it is **blocked on D4**.

---

## 10. Export

### 10.1 CSV of the data — core

The legacy app already has `toCSV` (`:7592`) and `downloadCSV` (`:7598`), and it already
audit-logs every export (`logAction('export_data','export',filename,…)`, `:7604`). **Keep the
audit entry** — it is the one thing legacy got right here, and an export of operational data
that leaves no trace is a compliance problem, not a feature.

The exported file is the **resolved series in long format**: one row per bucket × series, with
columns `bucket_start`, `series`, `measure_key`, `group_value`, `role`, `value`, `unit`,
`currency`, `is_partial_bucket`.

**A header block precedes the data**, naming the report, the window with explicit dates, the
grain, the comparison, every applied filter, and the `asOf`. A CSV of bare numbers with no window
is unattributable the moment it reaches a spreadsheet, and unattributable numbers are how the
wrong figure ends up in a deck.

### 10.2 The one deliberate break of the halalas rule

**Money in the CSV is decimal SAR with an explicit `currency` column, not halalas.** Everywhere
else in this product money is an integer count of halalas and that rule is absolute
(`src/data/types/common.ts`). A CSV's consumer is a spreadsheet operated by a human, not the app,
and `29505` in a revenue column is a defect the operator will not catch. **This is stated here so
nobody later "fixes" it.**

### 10.3 The picture — out, phase two

Exporting a PNG needs a rendering path (canvas or SVG serialisation), and the resulting image
carries none of the filters, the window, or the `asOf` that make the number meaningful. Every OS
already has a screenshot key. **The data is the export; the picture is reproducible from the
link (§9.2).**

---

## 11. Quick dashboards

> **Superseded by D39.** This section describes dashboards as a fixed grid of saved-report
> tiles. The product now ships pages of blocks, and a saved-report tile is one block kind among
> several — see `docs/09-analytics-v2/03-pages-and-dashboards.md`. Kept as the record of what
> §11.3's data-model reasoning (a tile stores a reference, never a copy) was decided against,
> because that reasoning still holds for a page's `report` block.

### 11.1 The position

**A dashboard is a named, ordered list of saved report ids, rendered through the existing §3.7
composer.** Nothing more. "Quick" is load-bearing in the owner's ask, and the product already
has a fixed composer for exactly this shape (`src/screens/metrics/MetricBoardScreen.tsx`,
`MetricBoard { metrics[], charts[] }`). A dashboard reuses it with a different source for the
list.

### 11.2 Why not a drag-and-drop grid

§3.7's customise mode *does* rule drag-and-drop — a ⠿ handle, an ⓧ remove, a placeholder drop
target and a contextual save bar — so a grid would not be illegal. It would be expensive:

- a second layout model (column span, row span, and a resolution of both at the 1280 floor and
  the `--ev-bp-wide: 1344px` step);
- a persisted geometry per dashboard, per breakpoint — which multiplies what Q1 must store;
- a **keyboard equivalent for every drag**, because §7 does not exempt drag-and-drop and a
  reorder with no keyboard path is a defect, not a nice-to-have;
- reflow behaviour when a tile is removed from the middle.

**Ordering in the core is `Move up` / `Move down`** on each tile — keyboard-operable by
construction, one integer per tile, no breakpoint interaction. **A grid is phase two**, and it is
additive: an ordered list is a valid input to a grid, so nothing is redesigned when it arrives.

### 11.3 What happens when a pinned report is deleted or edited underneath the dashboard

**This is a data-model decision, and it is the one most dashboard products get wrong.**

**A tile stores a reference (`reportId`), never a copy of the query.** The consequence, stated
plainly: **editing a report changes every dashboard that pins it.** That is correct and it is the
point of naming and saving a report at all — a report is a definition, and a dashboard shows the
current definition.

The rejected alternative is "pin the current definition", which copies the query into the tile.
It sounds safer and it is worse: two editable definitions share one name, nobody can tell which
one the board is showing, and the day they diverge is the day the board silently stops matching
the report it is named after.

**Deleting a pinned report is refused by default.** `reports.delete` returns `409` when
`pinnedToDashboardIds` is non-empty. The confirmation **names the dashboards** and offers
`Remove from those dashboards and delete` as the explicit second step. A dangling reference cannot
be created through the UI.

**A dangling reference can still arrive** — a concurrent session, a restore, a direct API call.
So the tile has a **`missing` state**: it keeps its frame and renders `pinnedName` (the display
fallback, §4.2) plus one sentence and a `Remove tile` action. This is §3.7's no-data rule
generalised: the card, the title and the frame all remain.

**A report edited so a *viewer* can no longer see its measure** renders the blocked panel
(§13.1), not the missing panel. They are different states and they read differently: one says
*this is gone*, the other says *you may not see this*.

### 11.4 Dashboard states

| State | Rendering |
|---|---|
| No dashboards ever | R8 first-run: illustration + `New dashboard` |
| A dashboard with no tiles | R8 first-run for that dashboard: illustration + `Add a report` |
| A tile loading | Skeleton in the tile's own frame; other tiles render independently |
| A tile failed | That tile's own error and retry; the dashboard does not fail as a unit |
| A tile blocked | §13.1's blocked panel |
| A tile missing | §11.3 |

---

## 12. Threshold alerts

### 12.1 The honest split — which half is the client's

**Something has to evaluate the threshold when nobody is looking at the screen. That is a
scheduler, it is server work, and it does not exist.** Every measure in this product resolves
against fixtures in a browser. Specifying an alert as though it were client work would produce
a feature that only fires while a tab is open, which is not an alert — it is a chart with an
opinion.

**The server must provide (does not exist today):**

1. A **scheduler** that evaluates enabled rules on their cadence with no browser open.
2. **Evaluation authority** — each rule is evaluated as its `ownerId`, so a rule cannot see more
   than its owner can (§13.3).
3. **Persisted rule state** (`armed` / `firing` / `cooling` / `suspended` / `error`), because
   re-arm behaviour (§12.4) is stateful and state in a browser is not state.
4. **Emission of a `Notification`** row into the existing store (§12.5).
5. `alerts.*` CRUD plus `alerts.history`.

**The client owns (buildable today):**

1. The rule builder form and all of its validation.
2. The rule list, its four base states and its domain states.
3. Rendering an alert-produced notification — which the notification centre **already does**, so
   this is zero new work.
4. **`Test this rule`** — evaluates the rule **once, now, in the foreground**, against
   `reports.run`, and reports what it would have done and against which bucket. This is genuinely
   useful (it is how an operator discovers the threshold is on the wrong side of the line) and it
   is honestly scoped: it says *"would have fired"*, never *"fired"*.

**The mock must fake** `alerts.list/get/save/delete/evaluate/history`, plus one seeded rule in
`firing` state with a matching seeded `Notification`, so the delivered state is reachable and
testable before any scheduler exists. Every id is in `knownOperations()` and reachable through
`?mockFail=`.

### 12.2 The rule shape

> **measure** (a series of a saved report) · **comparator** · **threshold** · **evaluation
> grain** · **cadence** · **re-arm**

Fields are in §4.2. Four notes on the design:

- The rule targets **one `seriesId` of one saved report**, not a free-floating query — so it has
  a stable identity, a name, and somewhere to send the operator when it fires.
- `comparator` is four values (`gt` / `gte` / `lt` / `lte`) and they are deliberately the same
  four names `FilterOperator` already uses. One comparator vocabulary in the product.
- `thresholdUnit` is **derived** from the measure, never chosen. An operator typing `40` against
  a money measure means 40 SAR; the wire carries 4000 halalas.
- **Percent-change comparators** (`fell more than 20% week over week`) are **out of the core**.
  They need a comparison baseline inside the rule, which is a second query, and they are where
  alerting complexity compounds. Named as the first phase-two alert feature.

### 12.3 Evaluation

The scheduler runs the rule's `reports.run` at its `cadence`, reads **the most recent *complete*
bucket** at `evaluationGrain`, and compares it. **A partial bucket is never evaluated** — a flow
measure's current partial bucket is always below any sensible floor, so evaluating it would fire
every rule every morning.

### 12.4 Firing on crossing, not on state

**A rule fires on the *edge*, not on the *level*.** A rule that fires on every evaluation cycle
while a value stays over the line is a pager nobody reads, and the second notification is the one
that trains the operator to ignore the first.

State machine:

```
armed  ──(condition true on a complete bucket)──►  firing   (emit ONE notification)
firing ──(immediately, same cycle)─────────────►  cooling
cooling ─(condition false for one full evaluation)─►  armed   [hysteresis — the default]
cooling ─(minReArmMinutes elapsed, condition still true)─► armed
armed   ──(owner loses access to the measure)──►  suspended  (§13.3)
any     ──(reports.run fails N consecutive times)──► error   (notify the owner once, not N times)
```

**Hysteresis is the default re-arm**: the value must come back inside the threshold before the
rule can fire again. `minReArmMinutes` is the backstop for a value that oscillates across the line
and would otherwise re-fire on every crossing. `mutedUntil` silences a firing rule without
disabling it — the state machine keeps running so the rule re-arms correctly while muted.

`error` fires **once**, to the owner only. An alert that is broken is the owner's problem, not the
recipients'.

### 12.5 Delivery lands in the notification centre that already exists

**Collision 1, resolved: an alert does not invent a second inbox.** `src/data/clients/notifications.ts`,
the bell popover and the expanded notifications layer already exist, already sort priority-first,
and already carry a `route`. An alert emits a `Notification`:

| Field | Value |
|---|---|
| `type` | `'alert'` |
| `priority` | `'high'` by default; `'critical'` only when the rule is explicitly marked as such by an operator who holds the permission to do so. **Not** derived from how far past the threshold the value went — that is a magnitude, not an urgency |
| `title` | from `alert.fired.title` with `{ruleName}` — never concatenated |
| `body` | from `alert.fired.body` with `{measure, comparator, threshold, value, bucket}` |
| `route` | **the report that fired, at the window and grain the rule evaluated**, via §9.2's URL serialisation — so the operator lands on the picture of the thing, not on a list |
| `entityType` / `entityId` | `'alert-rule'` / the rule id |

This also closes a defect the notification module already records: `alert` is the most-produced
runtime type and has **no click destination** (`handleNotifClick`, `:2273`; modelled honestly as
`route: null` in the fixtures). Alert-produced notifications are the first `alert`-type
notifications in the product with a real destination.

### 12.6 Alerts do not touch nav badges — the argument, not the assumption

**Collision 2, resolved: no.** Three reasons, and the third is the one that settles it.

1. **The tone is a property of the queue, not its contents.** `src/data/fixtures/navCounts.ts`
   states it: *"an escalation queue stays `attention`-kind when it empties"*. A user-defined alert
   makes tone a property of **one user's configuration**, which is a different kind of thing
   entirely.
2. **The cap is asserted mechanically.** At most two of 34 sub-tabs may be `attention` at once,
   and `navCounts.test.ts` asserts it. A user-configurable producer makes that test unassertable —
   you cannot assert a cap over a set the user can extend at runtime.
3. **The definition excludes it by construction.** `attention` means *"a breach whose harm is
   irreversible or statutory"*. A threshold an operator typed into a form last Tuesday cannot
   satisfy that definition, and the wave-2 engineer had **four evidenced candidates competing for
   two slots** and had to write a narrower rule to break the tie. Letting user configuration into
   that contest does not widen the cap; it destroys the meaning the cap was protecting.

**Therefore: `management-reports` carries `hasBacklog: false` and `count: null`, and no alert can
change any sub-tab's count or tone. The notification centre is the only surface.**

### 12.7 Red — checked against R5a, and it is not one of the four

**Collision 3, resolved: no red.** R5a enumerates red's four permitted uses: a destructive button,
one page-level critical banner, a breached-row leading-edge marker, a map marker. **A threshold
breach is none of them.** It is not a destructive action, it is not page-level (a dashboard can
have several firing tiles at once and §5.2 forbids stacking banners), and the row marker belongs
to §8.4's work queues, which this is not.

So a firing alert is carried by: the **word** (a firing rule says `Firing`), a badge from R7's
closed five-tone set (**`warning`** — there is no red badge and no sixth tone), and the
notification centre's existing `critical`/`high` priority treatment. **If product-designer
believes a firing threshold needs red, that is a fifth use and needs a §6.2 entry. This spec does
not authorise one.**

---

## 13. Permissions

Cross-referenced to `docs/01-modules/00c-identity-permissions-and-audit.md`. Today's model is 13
broad keys (`PERMISSION_LABELS`, `:3225`) plus a 52-key granular page layer (`PAGE_PERMISSIONS`,
`:10564`), enforced at the commit function (`:3117`). **D4 is open**, and every rule below is
blocked on it — but the *shape* of the rule is specified so that answering D4 is a data change,
not a redesign.

### 13.1 A saved report is a permission hole with a URL

**The rule: the report is the thing that is shared; each measure is authorised at render time,
per viewer, server-side.**

`reports.run` resolves each series against the **requesting** session, not the report's owner.
A series the viewer may not see comes back with `blocked: PermissionKey` and **no points**, and
the panel for that series renders a blocked state naming the permission required. Everything else
in the report renders normally.

Three answers were on the table; here is why this one:

| Option | Why not |
|---|---|
| **Filter the measure out silently** | The viewer sees a two-series chart with one series and no way to know a series is missing. Silent redaction is worse than refusal because it produces a *wrong picture that looks complete*. |
| **Refuse the whole report** | A two-measure report where the viewer may see one measure is still useful, and refusing it teaches operators to route requests through whoever has the widest role. |
| **Show it and redact — the chosen rule** | The viewer knows a series exists, knows they may not see it, and knows which permission to ask for. |

**Redaction is at the data layer.** A client-side filter over a full payload is not a permission
control, it is a rendering choice with the data still in the response.

### 13.2 Who may do what

| Capability | Rule |
|---|---|
| Open the Report Builder sub-tab | Any operator. The sub-tab renders; the measures inside it are individually authorised |
| See a measure | **F-8** — the measure's own `PermissionRef`, resolved per viewer |
| Save a private report | Any operator who can see every measure in it |
| Save a `team` report | As above. Visibility does not grant anything — every viewer is still authorised per measure |
| Delete a report | Its owner, or an operator holding `manage_team` |
| Create / edit a dashboard | Any operator. Tiles are authorised per §13.1 |
| Create an alert rule | An operator who can see the measure **at the time of creation** |
| Mark an alert `critical` | Restricted — an operator who can page the whole team must be a deliberate role, not a default. **Blocked on D4** |
| Export CSV | An operator who can see every series in the report. The export is **audit-logged** (§10.1), with the report name, window and filters in the summary |

### 13.3 An alert is worse than a shared report — it *pushes*

A shared report is a hole someone has to walk into. An alert is a hole that **sends data to
someone on a schedule, possibly long after their role changed.** Two cases, two rules:

**The owner loses access to the measure.** The rule moves to **`suspended`**. It stops
evaluating immediately. The owner is notified once. It does **not** keep evaluating on stale
authority — an alert that outlives its owner's permission is a permission grant with no record of
being granted. Only the owner (if access returns) or an operator holding `manage_team` can
resolve it, either by reassigning ownership or by deleting the rule.

**A recipient never had access, or lost it.** **Position: they are not a legal recipient.** The
recipient picker refuses to add an operator who cannot see the rule's measure, and if their role
changes later they are **dropped from the rule** and the owner is notified.

The alternative considered and rejected: deliver the notification with the value redacted. It
leaks the *fact of a breach* and its timing, which is often the sensitive part — knowing that a
revenue alert fired is most of what a revenue alert tells you. **Blocked on D4**, because "can
user X see measure M" has no answer today.

---

## 14. Acceptance criteria

### Where it lives (AC-800 … AC-806)

**AC-800** — ⛔ **BLOCKED on Q-RB-1.** `/management/reports` renders inside the standard shell: the
rail, the sub-tab list and the app top bar are all in the DOM and interactive, and `Reports` is the
selected sub-tab. **There is no route-table row for `management-reports` and there must not be one
until D1 is amended**, because adding it makes **35 sub-tabs where D1 says 34**. The screens are
being built **unrouted, behind a single mount point**, which is the correct interim: it keeps the
work moving without editing the route table on an unsigned count. **A route row appearing before
Q-RB-1 is answered is a fail, not progress.**

**AC-801** — *(blocked on finding F-P1)* The builder surface renders the pattern product-designer
records in a `DESIGN.md` §6.4 row for it. Until that row exists this criterion cannot be tested and
is recorded as blocked, not as passing.

**AC-802** — `/management/reports?view=dashboards` and `?view=alerts` change the content of the
sub-tab without changing the path, and Browser Back returns to the previous view.

**AC-803** — The `Reports` sub-tab shows **no count badge** in the rail under every condition,
including with an alert in `firing` state.

**AC-804** — `/management/reports/:reportId` for an id that does not exist renders the not-found
state inside the content region with the shell intact, and the URL is not rewritten.

**AC-805** — Every one of the 41 legacy census ids remains mapped to at least one other sub-tab
after this sub-tab is added; `Reports` claims none of them.

**AC-806** — ⛔ **BLOCKED on Q-RB-1, with AC-800.** The route table contains exactly one row whose
`subTabId` is `management-reports`, and its `hasBacklog` is `false`. **Also blocked: there is no
`'report'` or `'dashboard'` detail kind**, and minting one is the same D1 amendment in a second
place. Both land in one edit or neither lands.

### The query model and the panel (AC-807 … AC-819)

**AC-807** — On first load with no query in the URL, the measure picker is the only enabled control;
every other control in the panel is disabled and states why.

**AC-808** — Choosing a measure enables the second-measure, split-by, filter, range, grain, compare
and chart-type controls, and does not run a query.

**AC-809** — ~~No query runs until `Run` is activated. Changing any control does not issue a
request.~~ **SUPERSEDED by AC-809a on the owner's direct instruction.**

**AC-809a** — The canvas runs itself. A legal query re-runs automatically ~350 ms after the last
edit; an illegal one does not run at all and keeps stating why, exactly as before. An in-flight
run is cancelled by a newer edit rather than raced. `Run` is retired as a gate and survives only
as `Refresh`, for asking the same question again.

> **Why this changed.** The owner's words were *"the run button click it it should happen
> automatically"*. AC-809 was written to protect an operator from a request they did not ask for;
> in practice it made the builder read as a form to be submitted rather than an instrument that
> answers. The protection AC-809 actually bought — never issuing a request for a question that
> cannot be answered — is kept in full by the legality gate, which is the part that was load
> bearing. What was discarded is the manual trigger, not the guard.

**AC-810** — ~~After a control is changed, the canvas continues to show the previous result,
visibly marked as showing an earlier `asOf`, until `Run` is activated.~~ **SUPERSEDED by AC-810a.**

**AC-810a** — Between an edit and its automatic run, the canvas keeps the previous result and says
so. That state is now transient by construction rather than standing, so it must never settle:
a number shown under a question that no longer produced it is the defect AC-810 existed to
prevent, and auto-run narrows the window rather than removing the requirement.

**AC-810b** — A composed query survives leaving and re-entering the sub-tab. Switching to
`dashboards` or `alerts` and back preserves every value, because `?q=` is carried across the view
switch rather than rebuilt. Recorded as an acceptance criterion because it shipped broken: the
view switcher wrote a fresh `search` string and dropped the query, so an operator who glanced at
another tab had to re-pick everything.

**AC-811** — With one measure, a 30-day window and `grain: day`, the result contains exactly one
series and exactly 30 buckets.

**AC-812** — The split-by picker lists only dimension keys the catalogue declares legal for every
measure in the query. Adding a second measure whose legal dimensions do not include the current
split-by clears the split-by and states that it did.

**AC-813** — The filter field picker lists only fields the catalogue declares against every measure
in the query. With two measures whose filterable-field sets do not intersect, the filter control is
disabled and states that the two measures share no filterable field.

**AC-814** — A filter emitted by the panel is a `FilterSpec` — **the same type, the same twelve
operators, the same three inherited rules** (an empty control produces no filter; `false` is a
value, not an absence; a date range includes the whole end day) — as one emitted by the same
control kind on an index table. **No second filter model is introduced.** Its `field` is
**resource-qualified** (`subscription.status`, `trip.status`); an index table's is not, and that
difference is a **vocabulary** difference inside one model, not a second model.
**Amended, and the original wording had to yield to a safety fix.** *"Byte-identical in
shape"* was written as a shape rule and read as a string rule. **`FilterSpec.field` is a bare
string, and `subscriptions` and `trips` both carry `status` with unrelated vocabularies** — so a
two-measure query could apply one resource's value to the other and return a confidently wrong
number. **The ambiguity is real in the report builder and absent from an index table**, because an
index table has exactly one resource and its bare `field` cannot be ambiguous within its own
surface. Of the two available fixes — namespace index tables too, or have `reports.run` carry a
resource-qualified vocabulary — **the second is ratified**: it changes one consumer instead of
every index screen, and it changes the consumer where the ambiguity actually exists.
**Two consequences to carry rather than discover.** (1) **A saved report holds a namespaced field
string.** If index tables are ever namespaced, both vocabularies migrate together or saved reports
break silently — recorded so that migration is a decision and not a surprise. (2) **AC-813 is now
true by construction**, which means it is **no longer evidence**: two measures across two resources
can no longer share a field name by accident. It still binds on the observable — the control
disabled, with the reason stated — and that is what remains checkable about it.

**AC-815** — A date range of "to 30 June" includes rows dated 30 June (the whole-end-day rule from
`src/lib/columnFilter.ts`).

**AC-816** — For a measure whose catalogue `minGrain` is `week`, the `Day` grain option is present
but disabled, and its disabled reason names the measure and the grain it supports.

**AC-817** — A window and grain combination producing more than 400 buckets per series leaves the
finer grain disabled with a stated reason **before** the query runs; no request is issued and no
chart is drawn at the finer grain.

**AC-818** — A window whose first or last bucket is incomplete renders that bucket, marks it as
partial, and excludes it from any period-comparison delta shown on the report.

**AC-819** — A weekly report's buckets start on Sunday, in Riyadh local time, on a host whose system
timezone is set to `America/Los_Angeles`.

### Stock vs flow (AC-820 … AC-827)

**AC-820** — A stock measure's series values are identical at `grain: day`, `week` and `month` for
the buckets those grains share an end boundary with; only the number of points changes.

**AC-821** — A flow measure's `week` values equal the sum of the `day` values inside each week, for
every complete week in the window.

**AC-822** — With a **stock** measure selected first, the second-measure picker contains no measure
whose catalogue `temporality` is `flow`.

**AC-823** — With a **flow** measure selected first, the second-measure picker contains no measure
whose `temporality` is `stock`.

**AC-824** — With a `count`-unit measure selected first, the second-measure picker contains no
measure whose unit is `money`, `percent`, `ratio`, `minutes` or `rating`.

**AC-825** — There is no control, keyboard path, URL parameter or saved-report import that produces a
single-axis chart containing both a stock series and a flow series. A hand-edited URL asking for one
is rejected with a stated reason and the previous query is retained.

**AC-826** — **Any** multi-series result renders as two panels sharing one window, one grain and
one x-axis extent, each with its own y-axis, and each labelled with its own measure name. **There
is no `Compare separately` control**, and no control, URL parameter or saved report puts two
measures on one axis.
**Amended (`design/07-rulings-r4.md` §1.3).** The original made the two-panel rendering
conditional on a control. **The ruling deleted the control and made the rendering unconditional** —
with no overlay there is nothing to escape from, and *a checkbox whose only setting is its default
teaches the operator that a mode exists when it does not*. The ruling post-dates this spec and
amended the criterion in its own text; **the spec body (§6.2) was not amended with it, and is now.**
Nothing else in AC-826 changes.

**AC-827** — `Registered captains` and `Registered riders` (both stock, both count) can be selected
together and produce a two-series result.
**Amended. The criterion named a measure that cannot exist, and the criterion is what
was wrong.** `Active captains` is computable **as a reading now** and **not as a series over past
buckets**: `Driver` carries `status` and `joinedAt` and **no status history**, so
`status === 'active' && joinedAt <= t` applies **today's** status to every past bucket — a captain
suspended yesterday renders as suspended for all of last year, in a chart that looks entirely
normal. The layer shipped `captains.registered` — cumulative over `joinedAt`, monotone, honest —
and was right to. **The general obligation is AC-900**; the store gap is **Q-RB-11**. *(This does
not disturb **AC-603**, which decides `Active captains` as a **tile**. A tile is a reading at an
instant and needs no history; a series is a reading per bucket and needs one. That difference is
now the catalogue's to declare, not each reader's to rediscover.)*

### Comparison — the two controls (AC-828 … AC-834)

**AC-828** — *(gated on finding F-P2)* Two measures on one axis are distinguishable without relying
on colour alone, and each hue used clears the non-text contrast floor against the canvas. Until
product-designer rules on the series palette, a two-measure query renders as small multiples (§6.2)
and this criterion is tested against that rendering.

**AC-829** — The measure control and the compare-to control are two separate controls. Changing the
compare-to control never changes the number of measures, and adding a measure never changes the
compare-to setting.

**AC-830** — With one measure and `compare: previous-period`, the result contains two series, one
with `role: 'current'` and one with `role: 'comparison'`, over windows of equal length.

**AC-831** — A comparison series renders dotted or dashed in the same hue as the series it compares,
and never in a second hue.

**AC-832** — The chart legend names both periods with explicit dates, in both languages.

**AC-833** — With two measures **and** `compare: previous-period`, the result contains exactly four
series and no more, and the legend distinguishes all four.

**AC-834** — With `compare: none`, no comparison series exists and any delta shown on the report is
an em-dash — never `0%` and never blank.

### Chart types (AC-835 … AC-842)

**AC-835** — *(gated on F-P2)* For a query with one measure, no split and `grain: day`, `line` is the
default chart type and renders.

**AC-836** — An illegal chart type is present in the control and disabled, with a reason naming why
it is illegal for the current query. It is never hidden.

**AC-837** — Adding a split-by to a query whose chart type is `pie` switches the chart to the nearest
legal type and states the switch inline in the chart card — not in a page banner and not in a toast.

**AC-838** — `pie` is enabled **only** when the query has one measure, a split-by, `grain: 'none'`,
a measure the catalogue marks `additive`, and six or fewer parts. Changing any one of those five
disables it. **The six-part clause is judged twice, at two layers, because before a run there is
nothing to count**: pre-run it reads the catalogue's **cardinality hint**, which is **advisory**;
post-run it reads the **result**, which is **authoritative**. Where a run returns more parts than
the hint forecast and `pie` is selected, the chart switches to the nearest legal type and states
the switch **inline in the chart card** (**AC-837**'s mechanism). **A pie rendered with seven or
more parts is a fail whatever the hint said.**
**Appended.** The hints are genuinely wrong today — `trip.pickup` hints 12 against a
real cardinality of 17 — so the gate is a **forecast, not a guarantee**, and the criterion said
nothing about which reading governs. An understated hint could briefly offer a pie for a split
that cannot legally have one.

**AC-839** — `pie` is disabled for any measure whose unit is `percent`, `ratio` or `rating`, under
every other combination of controls.

**AC-840** — A query producing fewer than two buckets disables `line`, and the disabled reason says
a line needs at least two points.

**AC-841** — A `table` chart type is legal for every query shape in §7.1 and renders the same numbers
the chart renders, formatted per `formatMoney` / `formatPercent` from the series' `unit`.

**AC-842** — A split producing more than eight groups renders exactly eight named series plus one
`Other`, `Other` is last, `Other` renders even when its value is zero, and the legend states how
many groups were folded into it.

### States (AC-843 … AC-852)

**AC-843** — With no measure chosen, the canvas shows one grey sentence and no illustration.

**AC-844** — A query that succeeds with no data shows the sentence `There was no data found for this
date range.` — that string exactly, punctuation included — inside a card that retains its title and
frame. Not a spinner and not an empty plot.

**AC-845** — While `reports.run` is in flight the canvas shows a skeleton with the same footprint as
the chart it will become, and the panel's controls remain interactive.

**AC-846** — `?mockFail=reports.run` renders an error inside the canvas with a retry action, retains
the composed query, and leaves the panel usable.

**AC-847** — `?mockFail=catalogue.measures` renders an error in the measure picker; the rest of the
screen renders and the error offers a retry that re-requests only the catalogue.

**AC-848** — A window extending beyond the seeded data range draws a **break** in the line at every
bucket with no reading, not a value of zero, and the report states that part of the window has no
data.

**AC-849** — A result with `truncated: true` renders the chart together with a stated caveat naming
the cap. It never renders as if it were complete.

**AC-850** — With one series `blocked` and one series resolved, the resolved series renders normally
and the blocked series' panel names the permission required.

**AC-851** — With one series `failed` and one resolved, the failed series' panel carries its own
retry, and retrying it does not re-request the resolved series.

**AC-852** — Every state named in §8.3 is reachable from a `?mockFail=` parameter, a seeded fixture,
or a `switchMockUser` call, with no code change and no devtools.

### Saving, URL, sharing (AC-853 … AC-860)

**AC-853** — Any `ReportQuery` composable in the panel serialises into the URL and restores from it
with no loss: measures, split-by, every filter, the window, the grain, the comparison and the chart
type. Reloading the page reproduces the same result.

**AC-854** — Browser Back after three `Run`s returns through the three previous queries in order,
with the panel's controls following.

**AC-855** — A URL copied from one operator's browser and opened by another, with no saved report and
no storage adapter, reproduces the same query.

**AC-856** — *(needs Q1)* Saving a report requires a name of 1–80 characters; `Save` is disabled
until one is entered, and the disabled state carries no error text.

**AC-857** — *(needs Q1)* Re-opening a saved report re-runs it and shows a current `asOf`, not the
values from when it was saved.

**AC-858** — *(needs Q1)* `Save` and `Save as` are distinguishable before activation: `Save`
overwrites in place, `Save as` creates a new report and navigates to it.

**AC-859** — *(needs Q1)* `?mockFail=reports.save` leaves the dialog open, shows the failure inline,
and preserves the entered name and description.

**AC-860** — *(needs Q1)* A report deleted while an operator has it open becomes read-only with a
stated notice, and its `Save` becomes `Save as new`.

### Export (AC-861 … AC-864)

**AC-861** — Exporting a report produces a CSV whose header block names the report, the window with
explicit start and end dates, the grain, the comparison, every applied filter and the `asOf`.

**AC-862** — The CSV body has one row per bucket per series, with the nine columns named in §10.1,
and a partial bucket is marked in `is_partial_bucket`.

**AC-863** — Money in the CSV is decimal SAR with an explicit `currency` column, and the same figure
in the UI renders through `formatMoney`. The two agree to the halala.

**AC-864** — Every export writes one audit entry naming the actor, the report and the window.

### Dashboards (AC-865 … AC-873) — superseded by D39

> These nine criteria were written for the fixed dashboard-of-tiles model §11 describes. D39
> replaced it with pages of blocks before any of them shipped, so none was ever satisfied or
> failed against a dashboard screen. The behaviour they were protecting — a block keeps its
> frame when its report is deleted, editing a report updates every page that shows it, a
> permission-blocked block renders the blocked panel — is carried forward by the page and block
> acceptance criteria in `docs/09-analytics-v2/07-acceptance-criteria.md`, not by renumbering
> these.

**AC-865** — *(needs Q1)* A dashboard is created with a name and zero tiles, and renders the
first-run empty state with an action that adds a report.

**AC-866** — *(needs Q1)* A saved report can be pinned to a dashboard, and the tile that appears
renders the report's current definition.

**AC-867** — *(needs Q1)* Editing a saved report changes what every dashboard pinning it renders, on
the next load, with no action taken on the dashboard.

**AC-868** — *(needs Q1)* Deleting a report pinned to at least one dashboard is refused; the
confirmation names each dashboard by name and offers a single explicit action that unpins and
deletes.

**AC-869** — *(needs Q1)* A tile whose `reportId` no longer resolves keeps its frame, renders its
`pinnedName`, shows one sentence, and offers `Remove tile`. It does not render as an error and does
not fail the dashboard.

**AC-870** — *(needs Q1)* A tile whose report the current viewer may not see renders the blocked
panel naming the permission, not the missing-tile panel.

**AC-871** — *(needs Q1)* Tiles are reordered with keyboard-operable `Move up` / `Move down`
controls, and the new order persists.

**AC-872** — *(needs Q1)* One tile failing to load leaves every other tile rendered and offers a
retry on the failed tile alone.

**AC-873** — *(needs Q1)* A dashboard renders through the same composer as a metric board: the same
tile anatomy, the same no-data sentence, the same legend rules.

### Alerts (AC-874 … AC-887)

**AC-874** — *(needs a scheduler)* An alert rule can only be created against a **saved** report; the
create action is disabled on an unsaved query and states why.

**AC-875** — A rule names exactly one series of that report, one comparator from
`gt`/`gte`/`lt`/`lte`, one numeric threshold, one evaluation grain and one cadence. All are required
and `Save` is disabled until all are present.

**AC-876** — The threshold field's unit is derived from the selected series' measure and is stated in
the field; the operator never selects a unit. A threshold entered against a money measure round-trips
through halalas without loss.

**AC-877** — `Test this rule` evaluates once in the foreground and reports the bucket it tested, the
value it read and whether the rule **would have** fired. It never changes the rule's state and never
emits a notification.

**AC-878** — The rule builder states, in words, what will happen — naming the measure, the
comparator and the threshold — and the sentence is a single translation key with parameters, not a
concatenation of fragments.

**AC-879** — *(needs a scheduler)* A rule evaluates only complete buckets. A partial current bucket
never triggers an evaluation.

**AC-880** — *(needs a scheduler)* A rule whose condition stays true across five consecutive
evaluations emits exactly **one** notification.

**AC-881** — *(needs a scheduler)* After firing, a rule does not fire again until its value returns
inside the threshold for one full evaluation, or `minReArmMinutes` elapses — whichever the rule
declares.

**AC-882** — A firing alert produces exactly one `Notification` of `type: 'alert'`, and it appears in
the existing bell popover and the expanded notifications layer. No second inbox exists.

**AC-883** — Activating that notification opens the report that fired, at the window and grain the
rule evaluated.

**AC-884** — A firing alert changes no sub-tab count and no sub-tab badge tone anywhere in the rail,
and `navCounts.test.ts`'s two-`attention` cap still holds with a firing alert seeded.

**AC-885** — A firing alert uses no red anywhere in the report builder, the dashboard or the rule
list. The firing state is carried by the word plus a `warning`-tone badge from R7's five-tone set.

**AC-886** — *(needs a scheduler)* A rule whose `reports.run` fails on five consecutive evaluations
enters `error`, notifies its owner exactly once, and states the failure in the rule list.

**AC-887** — `mutedUntil` silences notifications without stopping evaluation: a rule muted while
firing re-arms normally, and the first notification after the mute expires is a fresh crossing, not a
replay.

### Permissions (AC-888 … AC-893)

**AC-888** — *(blocked on D4 and F-8)* A measure the current viewer may not see comes back from
`reports.run` with `blocked` set and **no points in the payload**. The redaction is verified against
the response, not against the rendering.

**AC-889** — A report containing one visible and one blocked measure renders the visible series
normally and names the permission required for the blocked one.

**AC-890** — Exporting a report containing a blocked series exports only the series the operator may
see, and the CSV header states that a series was omitted and why.

**AC-891** — *(blocked on D4)* The alert recipient picker does not offer an operator who cannot see
the rule's measure.

**AC-892** — *(blocked on D4)* A rule whose owner loses access to its measure moves to `suspended`,
stops evaluating, notifies the owner once, and states in the rule list why it stopped.

**AC-893** — *(blocked on D4)* A recipient whose role changes such that they can no longer see the
rule's measure is removed from the rule, and the owner is notified. They receive no further
notifications from it.

### Language, direction, accessibility (AC-894 … AC-899)

**AC-894** — Every operator-facing string in the panel, the canvas, the library, the dashboard and
the rule builder resolves from a translation key. No string is assembled by concatenating a
translated fragment with a value.

**AC-895** — A two-measure chart title is one key with two named parameters. There is no
`a + ' vs ' + b` anywhere in the module.

**AC-896** — Window preset names (`Last 90 days`) are keys, not `'Last ' + n + ' days'`.

**AC-897** — In Arabic, the panel mirrors and the chart's plot area, axes and axis labels do **not**
(§9.2, `DESIGN.md:5848`). The legend sits block-end / inline-end in both languages.

**AC-898** — A report named in Arabic renders in Arabic with correct direction inside an
English-language UI, and vice versa. Report and dashboard names are user content and are never
translated.

**AC-899** — Every control in the panel is reachable and operable by keyboard in a stated order, each
carries a visible focus indicator, and every disabled control's reason is available to a screen
reader — including the disabled chart types and the disabled grains.

### 14a. Appended from the semantic-layer build (AC-900 … AC-905)

**Six criteria, appended not inserted, from the ten contradictions the built layer returned.**
Six existing criteria were **amended in place** and each carries its own note:
**AC-800** and **AC-806** (blocked on Q-RB-1), **AC-814** (namespaced fields), **AC-826**
(`Compare separately` deleted), **AC-827** (a measure that cannot exist), **AC-838** (the
cardinality hint is a forecast). §3.4, §4.2 and §6.2 were amended with them.

**AC-900** — **A measure is offered as a *series* only where the store can produce its value **as
at each bucket boundary from history**, not by applying today's state to a past bucket.** A stock
measure whose resource carries current state and no history is **not selectable in the measure
picker**, and where the catalogue declares one anyway it renders disabled in place with the reason
naming what is missing. **A series computed by evaluating a present-tense predicate against past
timestamps is a fail**, and it is the dangerous kind: the chart is smooth, plausible and wrong in
a direction nobody can see. *(This is **R5-15**'s `sourceResource` rule extended along the time
axis: a tile asks whether a store exists, a series asks whether it remembers.)*

**AC-901** — **Superseded.** It read: no alert rule stores, displays or offers an evaluation
cadence that no scheduler implements — every seeded rule carries `cadence: null`, the rule
builder renders no cadence control, and a fixture, response or control supplying `'hourly'` or
`'daily'` is a fail, plausible or not (**Q-RB-7**, and the same discipline as **AC-453**). D41
built the scheduler this criterion was written to wait for, and it named its own successor:
"replaced by one naming its real cadences, not satisfied by one." That successor is
**AC-1227** (`09-analytics-v2/07-acceptance-criteria.md`): the cadence control offers `Hourly`,
`Daily`, `Not scheduled`, and saving `Not scheduled` stores `null`.

**AC-902** — `minReArmMinutes` is present on every alert rule as `number | null`, `null` means
hysteresis-only, and §12.4's two re-arm paths are both reachable: a rule re-arms when the condition
goes false for one full evaluation, **and** a rule with a non-null `minReArmMinutes` re-arms when
that many minutes elapse with the condition still true. A state machine with a path no field can
express fails.

**AC-903** — The `hour` grain is **present and disabled** in the grain control under every query
shape, and its disabled reason names that no measure supports a sub-daily grain (**AC-816**'s
mechanism). **`ReportResult.buckets` is `IsoDate[]` and no bucket boundary carries an hour**, so a
result claiming an hourly grain fails. **This is a contract, not a preference: an hourly boundary
is not a date.** The day a sub-daily store exists, `buckets` widens to `IsoDateTime[]` and
`SeriesPoint.at` with it, in one edit, and this criterion is replaced. **A date that silently
loses the hour is the failing case**; the layer refused to paper over it and was right to.

**AC-904** — Every client operation id in this module is registered **at module load**, so
`knownOperations()` lists it before it has ever been called, and every one is reachable through
`?mockFail=`. **Reachability and discoverability are two properties and only one of them holds
today**: `mockFailures.take(operation)` matches by string at call time, so injection already works
for any operation whether registered or not, while `registerOperations` is called **inside**
`mock()` — so `knownOperations()` under-reports until an operation has been invoked, against
`config.ts:232`'s claim that *"each client registers its ids here at module load."* **Nothing
consumes `knownOperations()` today, so the impact is latent, not live** — but the QA panel this
spec asks for, and any `?mockFail=` validation, would each list only what had already run. One
line per client, about thirty clients, mechanical. **mock-data-engineer's.**

**AC-905** — A saved report's `query.filters[*].field` is resource-qualified, and a report saved
before this rule existed either resolves to a qualified field or refuses to run with a stated
reason naming the ambiguous field. **A saved report never runs a filter whose resource cannot be
determined** — that is the two-`status` defect surviving in storage after it was fixed in the
panel (**AC-814**).

---

## 15. The cut line

The owner called this *"a small module"*. It is three features, and they do not cost the same. If
this has to be cut, cut it **from the bottom**, in this order — each layer below is removable
without redesigning the layer above.

| Layer | What it is | What it needs | Ship? |
|---|---|---|---|
| **Core — the irreducible one** | The query model, `reports.run`, the panel, one measure, window, grain, period comparison, the four chart types, the four base states, URL serialisation, CSV export | **Nothing that does not exist.** No Q1, no D4, no backend. `reports.run` resolves against fixtures | **This month** |
| **Layer 2 — multi-series** | Two measures, and any split-by | **One design decision: F-P2, the series palette.** Ships as small multiples with zero new tokens if the answer is "no palette" | This month, in one of its two forms |
| **Layer 3 — saved reports and dashboards** | Naming, the library, sharing by more than a link, dashboards | **Q1.** A dashboard is a thin layer over saved reports — an ordered list of ids and the existing composer. It is cheap **once reports persist** and impossible before | The week Q1 lands |
| **Layer 4 — alerts** | Threshold rules, evaluation, delivery | **A scheduler and server-side evaluation authority.** The client half (builder, list, `Test this rule`, notification rendering) is buildable and testable now; the *alert* is not | Not until there is a backend |

**The one sentence for the owner:** the query model is the module — everything else is a thin
layer over it, dashboards are cheap the day reports can be saved, and alerts cannot honestly ship
until something evaluates them while nobody is watching.

---

## 16. Open questions

| # | Question | Who answers | What is blocked until they do |
|---|---|---|---|
| **Q-RB-1** ⛔ | The Report Builder is a 35th sub-tab, and **D1** says 34. Amend D1, or does it live somewhere else? **Answer it in the same sitting as D15**, which proposes collapsing Management from five sub-tabs to three — otherwise the count moves twice, in opposite directions, on two signatures that never saw each other. | **Business owner** | **AC-800, AC-806**, and the `'report'` / `'dashboard'` detail kinds. The route table cannot be edited without this; the screens build **unrouted behind one mount point** until it lands. |
| **Q-RB-2** (F-P1) | The builder — a persistent query panel beside a live result canvas — maps to **no `DESIGN.md` §6.4 pattern row**. Confirm §3.7's customise mode covers it, or mint a row. | **product-designer** | AC-801. `patterns.md`: *"A page with no row here may not be designed until it gets one."* |
| ~~**Q-RB-3**~~ | Does the week start Sunday or Monday? Every weekly number in every exported report depends on it. | **Business owner** | **Closed by D45: Sunday**, confirming `WEEK_START_DOW = 0` at `src/data/reporting/buckets.ts:50`. No retroactive correction is owed — AC-819 and every weekly number to date were already computed on the Sunday position. |
| **Q-RB-4** (F-P2) | Two measures on one axis need a **second series hue**, and §3.7 forbids one while `globals.css` deletes the ramp. Mint a categorical palette through §6.2, or ship multi-series as small multiples? | **product-designer**, then business owner for the §6.2 entry | AC-828, AC-835, and the shape of the owner's own headline example. |
| **Q-RB-5** | **Q1 (persistence).** No storage adapter exists. Reports, dashboards **and** alert rules all need one. | **Engineering lead** | AC-856…AC-860, all of AC-865…AC-873, and all of §12. §9.1 states exactly what each degrades to. |
| **Q-RB-6** | **D4 (role model).** Per-measure permission (**F-8**) has no vocabulary to express itself in. | **Business owner** | AC-888…AC-893, §13 entire. |
| ~~**Q-RB-7**~~ | Is there a backend commitment for a scheduler? If not, is the client half of alerts still worth building? | **Business owner + engineering lead** | **Closed by D41: yes** — Vercel Cron, at exactly two cadences, `hourly` and `daily`. Layer 4 is built; AC-1227 replaces AC-901. |
| **Q-RB-8** | **F-9** — will the measure catalogue carry a measure identity independent of which board displays it? If keys stay board-namespaced, every saved report and alert rule holds a foreign key into a display decision. | **product-owner of `05-metrics-content.md`** | Everything. Escalate before the catalogue freezes. |
| **Q-RB-9** ⛔ | May an operator mark an alert `critical` (which pages the whole team), and if so which permission gates it? **`notificationPriority: 'critical'` is unreachable today** — the permission that would gate it does not exist, so the state is specified, buildable and enterable by nobody. | **Business owner**, after D4 | §13.2's last row, AC-882's priority. **Recorded as unreachable rather than left to be "fixed" by removing the gate** — an ungated `critical` pages the whole team on one operator's threshold. |
| **Q-RB-11** | **Does `drivers` gain a status history?** Without one, no *active*-status measure is computable as a **series** — only as a tile — because the predicate is present-tense and the buckets are past (**AC-827**, **AC-900**). The layer ships `captains.registered` instead, which is honest and is not the same question. | **product-owner of `05-metrics-content.md`**, then business owner if a real store is needed | Any active-status trend, permanently. Nothing else — the builder ships without it and states what it cannot answer. |
| **Q-RB-10** | Findings **F-1 … F-8** against the measure catalogue (§4.1). Each is a field the report builder reads and does not own. | **product-owner of `05-metrics-content.md`** | Named per finding in §4.1's `Blocks` column. |


---

## Numbering note

This spec was written against **AC-700–799** and renumbered to **AC-800–899** on the
day it landed. `05-metrics-content.md` was authored in parallel, overran its assigned
600 block and reached **AC-724**, so 700–724 was claimed twice. The measure catalogue
keeps the lower range because its criteria are cited from three other specs; this one
moved because nothing cites it yet. **Every `AC-8xx` in this file was an `AC-7xx`;**
this spec cites no other spec's acceptance criteria, which is what made the shift safe.
