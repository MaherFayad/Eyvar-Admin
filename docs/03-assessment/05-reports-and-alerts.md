# 05 · Reports and alerts

**The owner's question, verbatim:** *"does the reports and alerts, actually powerful and smart,
and can actually solve my problems and work more like amplitude charts with that much fidility,
are the charts clear"*

**Method.** `npx vite --port 5309`, Chromium 1440×1100 and 1440×1400 via Playwright, seeded mock
data, fixed clock 2026-06-25. Every screen below was driven by constructing a `ReportQuery`,
serialising it with the module's own base64url encoding (`src/data/reporting/serialise.ts`), and
loading `/management/reports?q=…` — the same link the product tells operators to share. 14
distinct queries across all five modes, both languages, plus the library, dashboards, a dashboard
detail and the alerts view. Charts were read from screenshots and from `innerText`, and every
count below was taken from the running app or from the source, never estimated.
`npx vitest run src/data/reporting src/screens/reports src/components/reports` — **9 files, 177
tests, all green.** Every defect in §6 is therefore a defect the suite does not see.

**One caveat about method.** The Amplitude MCP was not available in this session — no
`get_amplitude_context` tool was exposed, so no live chart definitions were read. Amplitude is
cited below only from product behaviour I can state without a lookup (what its segmentation chart
puts on one axis, what its segment editor offers as operators, what its retention matrix does
with unreachable cells, what its alerts offer beyond a fixed number). Nothing below claims to
quote an Amplitude API response.

---

## Verdict, up front

**The query model is the best-engineered thing in this repository, and the module is still not a
tool the owner can answer his questions with.** Those two sentences are both true and the gap
between them is the whole finding.

What is genuinely excellent: the *refusal* surface. Eyvar disables a control in place with a
sentence — *"A count and a money cannot share a report."*, *"A pie needs the whole range as one
bucket."*, *"Hour is finer than this data goes. The finest it answers is Day."* — and it refuses
before you press Run. Amplitude will happily draw you a pie of averages. Eyvar will not. The
honesty layer — `null` is a gap not a zero, partial buckets drawn and banded, *"21 of 31 buckets
have a reading"*, *"Part of this range is outside what is recorded"*, a `Test this rule` that says
*would have fired* — is better than Amplitude's and better than almost any admin product I have
looked at. That work is real and should not be undone.

What is not there:

1. **The catalogue is 17 measures and 11 dimensions.** Four of the owner's five questions die at
   the measure picker before the builder is even involved. There is no cost measure, no deduction
   measure, no reason code, no captain churn event, and `revenue.total` has **zero** dimensions —
   it cannot be split by anything at all.
2. **A group-by does not produce a chart. It produces up to nine charts, each with its own
   y-axis.** "Fares collected by pickup district, last month" renders nine separate cards whose
   axes run 0–0.03 SAR, 0–60 SAR, 0–60 SAR… Comparing zones — the literal question — is not
   possible by eye. This is Ruling R4-1 applied where it does not belong.
3. **The eight groups that survive the fold are chosen by all-time totals, ignoring the report's
   own date range.** Confirmed by experiment (§1.1). The consequence: the top-ranked district in
   "last month" contributes **0.00 SAR**, and `Other` — which the operator cannot open — is the
   single largest bucket in every window tested. The module answers "which zones made the money"
   with the wrong eight zones.
4. **Drill-through does not exist.** Not one `onClick` on any chart element in
   `src/components/reports/`. The spec names it *"the highest-value phase-two item"* and it is
   still phase two. A chart you cannot click into is a picture.
5. **Alerts are `gt`/`gte`/`lt`/`lte` against a typed-in number, and nothing evaluates them.**
   Every seeded rule reads `Checked: Not set`. The screen says so honestly at the bottom. There is
   no anomaly detector, no percent-change comparator, no baseline; and when a rule does fire there
   is no preview chart in the editor, no firing history on screen, and `Open` opens the edit form
   rather than the number that tripped.
6. **Two arithmetic defects and one crash** are shipping green (§6). The retention matrix prints
   `0%` in cells that have not happened yet — the June 2026 cohort reads *100 / 0 / 0 / 0* on
   25 June 2026, which says "everyone churned" when the truth is "not yet observable". And any
   report carrying a query-level filter, loaded from a link, kills the sub-tab in dev and renders
   a raw translation key in production.

**Is it a demo or a tool?** It is a very well-built engine with a demo-sized catalogue bolted to
it, and four secondary modes (funnel, cohort, journey, table) that the spec explicitly declared
out of scope and which were built anyway, at lower quality than the trend mode, while the one
item the spec named as highest-value was not. The engine deserves the catalogue. The catalogue is
the work.

---

## 0. The numbers, in one place

| Property | Measured | Where |
|---|---|---|
| Measures in the catalogue | **17** | measure picker, live; `fixtures/measures.ts` |
| Dimensions in the catalogue | **11** | `fixtures/measures.ts:84–100` |
| Measures with **zero** dimensions | **8 of 17** — incl. `revenue.total`, `revenue.quickRide`, `revenue.subscription`, `financials.arpa`, `trips.cancellationRate`, `requests.timeToAssign` | `fixtures/measures.ts` |
| Measures with **zero** filterable fields | **8 of 17**, same set | `fixtures/measures.ts` |
| `FilterOperator` values in the transport vocabulary | **12** (`eq neq in nin gt gte lt lte contains between isNull isNotNull`) | `types/common.ts:57` |
| Filter operators the report builder can emit | **1** (`eq`) | `QueryPanel.tsx:456` — hardcoded |
| Filters per field the builder can hold | **1** (adding a second replaces the first) | `QueryPanel.tsx:455` |
| Boolean logic between filters | **AND only**, flat, no nesting, no OR | `resolveReport.ts:1305` — `.every()` |
| Measures per report | **2** (`MAX_MEASURES`) | `plan.ts:78` |
| Groups before folding into `Other` | **8** (`MAX_GROUPS`) | `plan.ts:84` |
| Panels a 20-value split produces | **9** — 8 groups + `Other`, each with its own y-axis | live, §1.1 |
| Bucket aggregates available | **5** — `count sum mean end-of-period cumulative-count`. **No median, no p90, no percentile.** | `types/measure.ts` |
| Percentile helpers that exist but the builder cannot reach | `p10 median p90 summarizeDistribution` | `reporting/distribution.ts`, imported only by `clients/metrics.ts` |
| `onClick` handlers on a chart mark, axis, legend, slice or cell | **0** | `grep onClick src/components/reports/` |
| Comparison periods offered | **2** — previous period, previous year | `types/report.ts` `PeriodComparison` |
| Saved segments / reusable cohort definitions | **0** — not modelled | `types/report.ts` |
| Chart annotations (mark the day the plan changed) | **0** — not modelled | `types/report.ts` |
| Dashboard-level date range or segment override | **0** | `DashboardDetailScreen.tsx` — no window control |
| Alert comparators | **4** — `gt gte lt lte` | `types/report.ts` `AlertComparator` |
| Seeded alert rules with a cadence set | **0 of 5** — all `Checked: Not set` | live, alerts view |
| Alert rules that evaluate on their own today | **0** | `AlertCadence` doc; alerts-view footnote |
| Firing history surfaced in any screen | **0** — `alerts.history` / `listAlertFirings` is implemented and consumed by nothing | `grep listAlertFirings src/screens src/components` |
| Arabic strings in the module | **0** — `AR: Dictionary = {}` product-wide, declared deliberate | `i18n/dictionaries.ts:925` |
| Reporting tests passing | **177 / 177** | `vitest run` |
| Seeded saved reports carrying a query-level filter | **0 of 7** — which is why §6.3 ships green | `fixtures/reports.ts` |

---

## 1. Can it answer a real question?

Five questions, built for real. **One succeeded, one succeeded but returned a misleading answer,
three could not be started.**

### 1.1 "Which zones lost us money last month?" — ✗ fails twice over

**Where it fails first: there is no cost side.** The catalogue holds `trips.fareCollected`,
`revenue.total`, `revenue.quickRide`, `revenue.subscription` and `financials.arpa`. It holds no
measure for driver payout, commission, deduction, incentive spend, refund or fuel. *Lost us money*
is a margin, margin is revenue minus cost, and cost is not in the catalogue. §2.2 of the spec also
rules out a calculated-measure editor (`A ÷ B`), so an operator cannot build the ratio either. The
question cannot be asked at all.

**Where it fails second, and this is the worse one.** Downgrade the question to what the module
*can* express — *"which zones took the most fares last month"* — and it answers with the wrong
zones in the wrong order.

`measures: ['trips.fareCollected'] · groupBy: 'trip.pickup' · window: last-month · grain: day`

Rendered: **nine cards**, in this order and with these totals:

```
حي الملقا      0.00 SAR      District 6   109.83 SAR
District 9   108.36 SAR      District 7    75.96 SAR
District 8   127.16 SAR      District 11  116.58 SAR
District 2   109.40 SAR      District 10  113.79 SAR
Other        484.13 SAR
```

Three things are wrong on that list.

- **The rank-1 group contributes nothing.** حي الملقا is first and reads 0.00 SAR for the whole
  month. Panel order is documented as *"group rank descending, `Other` last"* (`types/report.ts`,
  `ReportPanel.seriesIds`). It is not.
- **`Other` is the largest bucket, and it cannot be opened.** 484.13 SAR is more than four times
  the biggest named district. The canvas says *"The smallest 12 groups are folded into Other."* —
  they are not the smallest, and there is no way to expand, exclude or re-rank.
- **The same eight groups come back for every window.** Re-run at `last-7d`:

```
حي الملقا      0.00 SAR      District 6    18.85 SAR
District 9    42.04 SAR      District 7    20.22 SAR
District 8     0.00 SAR      District 11   71.80 SAR
District 2    13.37 SAR      District 10   43.41 SAR
Other        219.00 SAR
```

Identical membership, identical order, two districts at zero, `Other` still the biggest.

**Root cause, exactly.** `groupsFor()` in `src/data/mock/resolveReport.ts:1278` ranks the groups
by iterating `source.rows` filtered only by `measure.population.predicate` and `query.filters`. It
never reads `query.window`. So the ranking — and therefore *which eight groups survive the fold* —
is computed over all time regardless of the range the operator asked about. The series values are
windowed correctly; only the selection and ordering of *which* series exist is not.

This is not cosmetic. A district that was busy in 2025 and dead last month holds one of the eight
slots and pushes a currently-large district into an unopenable `Other`. The operator gets a
confident, well-labelled, honestly-caveated chart of the wrong eight zones.

**Amplitude, same question.** Group by a property, get **one chart, one axis, N lines**, plus a
table beneath ranked by the metric over the selected range, sortable, with per-group totals and
per-group deltas — and the group list is computed over the range you are looking at. You click a
row to isolate it, or click a point to see the users behind it. Eyvar gives nine axes, a wrong
ranking, and no click.

### 1.2 "Is captain churn worse in Riyadh than Jeddah?" — ✗ cannot be started

There is **no captain churn measure**. The catalogue has `captains.registered` (a cumulative
stock) and `captains.joined` (a flow). Nothing counts a captain leaving, deactivating, being
suspended, or going a period without a trip. `driver.status` exists as a *dimension* but the
fixture header at `fixtures/measures.ts` explains why it cannot be a churn series: a driver row
carries no status history, so *"how many were active on 3 June"* is not computable, and splitting a
stock by today's status would mark a captain suspended yesterday as suspended for all of last year.
That reasoning is correct and it is exactly why the question has no answer here. `Q-RB-11` in the
spec is this gap, open, owned by the metrics-content owner.

**What you can build instead**, and it is not the question:
`captains.joined · groupBy driver.city · last-90d · week` → two panels, Riyadh and Jeddah, both
axes 0–3, both mostly flat. That is *acquisition* by city. It says nothing about churn.

Note also: `subscriptions.cancelled` — the one churn-shaped measure in the catalogue — carries
dimensions `subscription.plan` and `subscription.vehicleClass` only. **No city.** So even
subscription churn cannot be compared between Riyadh and Jeddah.

### 1.3 "Did the new pricing plan change trip volume?" — ~ partial, and the useful half is missing

`trips.completed · last-30d · day · compare to previous period` runs and is the best chart in the
module: one panel, one axis, solid current line, dashed comparison line, headline **68** with a
neutral **+161.5 %** chip, and a legend naming both windows with dates — *27 May – 25 Jun* solid,
*27 Apr – 26 May* dashed.

Three things stop it answering the question.

- **No annotations.** There is nowhere to mark *"new pricing plan went live 8 June"*. `ReportQuery`
  has no annotation field and none is modelled. Amplitude lets you drop a dated annotation on a
  chart, it appears as a vertical rule with a label, and it is shared with everyone who opens the
  chart. Without it, "did it change" is the operator squinting at a date they have to hold in their
  head, and the comparison period — 27 Apr – 26 May — straddles nothing useful.
- **You cannot segment trips by plan.** `trips.completed` filters on `trip.kind`, `trip.status`,
  `trip.pickup`. Plan lives on `subscriptions`. The two measures share no filterable field, and
  the panel says so correctly: *"These two measures share no filterable field."* So "trip volume
  among people on the new plan vs the old" is not expressible.
- **The comparison window is fixed to the same length as the current one.** No custom baseline, no
  "compare to a specific date range", no "compare to the 30 days before launch". Amplitude offers
  an arbitrary custom comparison range.

### 1.4 "Which reason code is growing?" — ✗ cannot be started

**No reason code exists anywhere in the catalogue** — not as a measure, not as a dimension. Not for
trip cancellations, not for ticket categories, not for dispute outcomes, not for refusals. The
nearest measure is `trips.cancellationRate`, and it carries `dimensions: []` and
`filterableFields: []`, so it is a single undifferentiated national percentage that cannot be split
or filtered by anything.

Worse for this specific question: `trips.cancellationRate` is a **percent** with
`additive: false`, so it is also barred from the pie and from stacked bars. The only rendering it
supports is a single line of one national number.

This is the question I would expect an operations console to be *best* at, and the module has no
vocabulary for it at all.

### 1.5 "Are we paying more in deductions than we recover?" — ✗ cannot be started

There is no deductions measure, no recovery measure, no ledger measure, no payout measure. The
whole Finance domain — which has its own screens, its own ledger fixtures and its own money types
— contributes **zero** measures to the report catalogue. `fixtures/measures.ts` explains the
policy honestly: nine board tiles were deliberately excluded because they are seeded literals with
no store behind them, and *"naming a resource on a value not derived from it would make the check
runnable and false — a worse failure than the one the rule closes, because it looks audited."*
That policy is right. It also means the report builder cannot see the half of the business the
owner most wants reported on.

Even if both measures existed, note that the question is a *comparison of two money series*, which
the module handles by drawing **two separate cards with two separate y-axes** (§2.1). The
crossing point — the entire question — is the one thing small multiples cannot show.

### 1.6 Scoreboard

| Question | Outcome | Fails at |
|---|---|---|
| Which zones lost us money last month? | ✗✗ | no cost measure at all; and the revenue-only downgrade returns the wrong eight zones (`resolveReport.ts:1278`) |
| Is captain churn worse in Riyadh than Jeddah? | ✗ | no churn measure (Q-RB-11); `subscriptions.cancelled` has no city dimension |
| Did the new pricing plan change trip volume? | ~ | runs, and is the module's best chart; no annotations, no plan segment, no custom baseline |
| Which reason code is growing? | ✗ | no reason code as measure or dimension; `trips.cancellationRate` has zero dimensions |
| Are we paying more in deductions than we recover? | ✗ | no Finance measures in the catalogue at all |

---

## 2. Fidelity against Amplitude

### 2.1 Segmentation and breakdowns — the biggest gap

Ruling **R4-1** says two series may share a y-axis only if they are the same measure and the same
group in two periods. Everything else becomes a small multiple. The reasoning is sound where it
was written — captains (57) and riders (55)… actually no, that pair is within 4 % of each other,
and the argument R4-1 makes is about *order-of-magnitude* differences. The rule was written for
one case and is applied to all of them.

The result, measured:

- **A group-by never produces a comparable picture.** 20 pickup districts → 9 cards, 9 axes. Two
  of those axes were 0–0.03 and 0–60 in the same result. The eye cannot rank across them.
- **Two measures never share an axis either**, even when they are the same unit at the same
  magnitude. `captains.registered` (57) and `riders.registered` (55) render as two cards. Both
  axes happened to be 0–60, so the picture is *nearly* readable — by coincidence, not by design.
  There is no operator override; `types/report.ts` mentions a possible future `D-12` shared-axis
  deviation, unbuilt.
- **`Q-RB-4` is the open question behind this** — *"mint a categorical palette, or ship
  multi-series as small multiples?"* — owned by product-designer, unanswered. The module shipped
  the second option by default rather than by decision.

Amplitude puts a group-by on one chart with a categorical palette and a ranked legend table, and
lets you switch to stacked, 100 %-stacked, or small multiples if you want them. Eyvar has one
mode and it is the one that hides the comparison.

**Cost to the operator:** the two questions a zone report exists to answer — *which is biggest*
and *which is falling* — both require reading nine independently-scaled charts. In practice
nobody does; they export the CSV. Which is a real signal about the chart.

### 2.2 Filters and saved segments

The segment editor is one field, one free-text value, one implicit `eq`, and one filter per field.

- **`op` is hardcoded to `'eq'`** (`QueryPanel.tsx:456`) although twelve operators exist in the
  transport vocabulary. No `in`, no `neq`, no `contains`, no `gt`, no `between`, no `isNull`.
- **Adding a second filter on the same field replaces the first** (`QueryPanel.tsx:455`), so
  `city in [Riyadh, Jeddah]` cannot even be faked as two equalities.
- **No OR and no nesting.** `matchesAll` is `filters.every(...)`.
- **The value is a free-text `<Input>`**, not a picker of known values. The panel's own comment is
  honest about why — the catalogue declares `filterableFields: string[]` and no control kind per
  field, and guessing one *"would be inventing a catalogue property in a component"*. Correct
  reasoning; the consequence is that an operator must know the fixture spells it `Riyadh`. A typo
  produces an empty chart that is visually indistinguishable from a real zero.
- **The filter chip shows only the value**, not the field (`<bdi>{String(filter.value)}</bdi>`),
  so two filters on two fields render as two bare words.
- **No saved segments.** Nothing in `types/report.ts` models a reusable audience definition. Every
  report re-types its filters. Amplitude's saved cohorts are reusable across segmentation,
  funnels and retention; here a cohort is a single report's `CohortSpec` and cannot be referenced
  from anywhere else.

### 2.3 Comparison periods

Two options — previous period, previous year. Both work, both are rendered honestly, and the
comparison is excluded from partial buckets. Missing: an arbitrary custom comparison range, and
comparison inside funnel/cohort/journey modes (the control disappears entirely in those modes).

### 2.4 Aggregates

`BucketAggregate` is `count | sum | mean | end-of-period | cumulative-count`. **No median, no
percentiles.** `requests.timeToAssign` is therefore a *mean* time-to-assign — the single most
misleading latency metric there is, because one 40-minute outlier moves it and the operator has no
p50 or p90 to check it against. The percentile maths already exists in
`src/data/reporting/distribution.ts` (`p10`, `median`, `p90`, `summarizeDistribution`); it is
imported only by `clients/metrics.ts` and the report builder cannot reach it. This is one of the
cheapest wins in the module.

### 2.5 Funnels

Renders correctly and reads well: three rungs, bars in a single hue, counts on the right, *"80 %
of the previous step did not reach this one."* under each drop. Against Amplitude:

- **No time-to-convert distribution.** The median time between step 1 and step 2 is the number
  that tells you whether a drop is a leak or a lag. Not computed.
- **No segment breakdown of the funnel.** You cannot ask "this funnel, Riyadh vs Jeddah". A funnel
  has per-step filters but no `groupBy`.
- **No conversion-over-time.** You cannot ask "did step-2 conversion improve after the change".
- **No click into the drop-off.** The 16 people who joined and never rode are the actionable
  output of this chart and there is no way to reach them.
- **`funnel-counted-not-followed`** is modelled as a wire warning for a funnel that counts events
  rather than following people. It did not appear on my rider funnel, which is correct, but the
  distinction matters and the operator has no way to know which kind of funnel they are looking at
  until it appears.

### 2.6 Cohorts / retention

The matrix renders with the cohort size in its own column — which is genuinely better than most
tools and is R5-15 doing real work; a percentage with no denominator is exactly how "38 % retained"
gets quoted off a cohort of six. But the maths beneath it is not sound. See §6.1.

Also missing vs Amplitude: no retention *curve* (only the matrix), no comparison of two cohorts,
no breakdown by segment, no unbounded vs bounded retention choice, and no click into a cohort row.

### 2.7 Journeys

`journey` renders a list of next-events with counts and percentages, plus a good closing line —
*"14 (70 %) did nothing else inside this range."* Two problems:

- **The vocabulary includes non-events.** *Time to assign* appeared twice in my depth-2 path tree.
  `requests.timeToAssign` is a **duration measure with `unit: 'minutes'`**, not something a person
  does. Using it as a journey node produces a path step that means nothing.
- **No Sankey, no funnel-from-path, no click into a path.** It is a nested list.

### 2.8 Drill-through — judged separately, as asked

**There is none, anywhere, in any mode.** `grep -rn "onClick" src/components/reports/` returns
nine hits and every one of them is a button: retry, move tile, remove tile, run, add filter, open
report. **Zero on a chart mark, an axis tick, a legend entry, a pie slice, a funnel step, a cohort
cell or a table cell.** `PanelChart.tsx` passes no click handler to Recharts at all.

The spec is not hiding this. §2.2 lists it as out of scope with the reason — *"wants a
resource-scoped list endpoint per measure, i.e. a second data contract"* — and then, unusually
for an out-of-scope row, adds: ***"Named as the highest-value phase-two item."*** The spec and I
agree. I would put it harder:

Every one of the owner's five questions ends in *"…and then show me which ones."* Which zones lost
money → **which trips**. Which reason code is growing → **which cancellations**. Is churn worse in
Riyadh → **which captains**. A chart that stops at the aggregate hands the operator a number and no
next action, and the operator's next move is to leave the module, go to the index table, and try to
reconstruct the filter by hand — where the filter vocabulary is different, richer, and will not
reproduce the chart's population.

**And the module is unusually well-placed to fix it.** `Measure.population` already declares
`{ resource, predicate, timeField, coverage }` — literally *"count the rows of `resource` matching
`predicate`, bucketed by `timeField`"*. A click on a bucket already knows the resource, the
predicate, the group value and the date range. The translation from a chart point to
`drivers.list({ filters: [...predicate, groupFilter, dateRange] })` is mechanical. The hard part —
declaring what a measure counts — is already done, and done better here than in most analytics
products.

### 2.9 Dashboards

- **No date-range control on a dashboard.** Each tile runs its own saved report's window. You
  cannot flip "Monday morning" to *last 7 days*. Amplitude's global dashboard date picker and
  global segment override are the two controls that make a dashboard reusable; neither exists.
- **A tile is not a tile.** Pinning "Completed trips by pickup district" to a dashboard renders
  **nine charts inside one tile**. The "Monday morning" dashboard is two tiles and eleven charts
  in a two-column grid, one of which is a single-column stack about 2 000 px tall. It is a scroll,
  not a glance.
- What is right: tile titles are links, tiles are reference-not-copy so editing the report updates
  every dashboard, reorder is `Move up`/`Move down` buttons (keyboard-operable by construction),
  and deleting a pinned report is refused with the dashboards named.

---

## 3. Are the charts clear?

Screenshot-level, from the running app.

### 3.1 The trend panel — the module's best object

`trips.fareCollected · last-30d · day · previous period`, English:

```
┌────────────────────────────────────────────────────────┐
│ Fares collected                                        │  17px/600 near-black
│ Counts trips that finished inside the bucket, by their │  11px grey — THE POPULATION
│ end time.                                              │
│ 29 of 29 buckets have a reading.                       │  11px grey — THE BASE
│                                                        │
│ 1,500.00 ┤                                          ╱  │  axis: 4 ticks, no unit label
│ 1,000.00 ┤                                         ╱   │  11px, --chart-axis grey
│   500.00 ┤                                        ╱    │
│     0.00 ┼●●●●●●●●●●●●●●●●●●●●●●●●●●●●●───────────     │  dots r=2, solid, pale fill
│          28 May   3 Jun   9 Jun   15 Jun  21 Jun  25 Jun│
│                                                        │
│ 2,392.88 SAR  +208.6%   ── 27 May – 25 Jun             │  headline 16px/600 tabular
│                         ┄┄ 27 Apr – 26 May             │  legend names BOTH windows
└────────────────────────────────────────────────────────┘
```

**What is right, and it is a lot.**

- The **population sentence is on the card**, not in a definition somewhere. This is the single
  best decision in the module. A screenshot of this chart travels with its own meaning.
- The **base** — *"29 of 29 buckets have a reading"* — means an operator can tell a flat line from
  a dead feed.
- The **headline carries its unit** — `2,392.88 SAR`, not `2392.88`.
- The **delta chip is neutral** — `+208.6 %` in grey, never green, never red. R4-5. Correct: a
  rise in cancellations is not good news because it is a rise.
- **Gaps break the line** (`connectNulls={false}`), partial buckets draw with a grey band behind
  them, and both facts are also stated in words above the card.
- **No gridlines, no animation, one hue.** Quiet and dense. Right for this product.

**What is not clear.**

- **The y-axis carries no unit.** The ticks read `0.00 · 500.00 · 1,000.00 · 1,500.00`. The word
  SAR appears once, in the footer, 200 px away. On the count charts the axis reads `0 · 1 · 2 · 3`
  with no "trips". Amplitude labels the axis. Add `SAR` / `trips` / `min` to the axis and half the
  ambiguity goes.
- **The partial-bucket band is invisible in practice.** It is a `ReferenceArea` at
  `fill: var(--chart-grid)` spanning a single x-value — one hairline-tinted vertical stripe about
  four pixels wide at a 29-bucket density. I could not see it in a 1440-wide screenshot. The
  sentence above the card is doing all the work; the visual mark is decorative.
- **`Crossing this line is good news.`** is emitted on **every panel**, in the DOM, from
  `Headline`'s `<span className="sr-only">`. It is screen-reader-only so it does not clutter the
  visual — but it is `higherIsBetter` copy on a chart that has no line to cross. It belongs in the
  alert editor, not on every card. On the nine-panel district report it is announced nine times.

### 3.2 The comparison period — dash, never hue. Does it work?

**Yes, and better than I expected, for the line chart.** Same hue, `strokeDasharray="4 3"`,
`strokeWidth 1.5`, comparison drawn first so the current period paints over it, and — the part
that makes it work — **the legend swatch is an SVG line with the identical dash array**, not a CSS
dashed border. The legend and the plot match exactly, which is the failure mode that usually makes
dash-coding unreadable.

Two qualifications.

- **On the bar chart it is not a dash at all.** `PanelChart.tsx` renders the comparison bar as
  `fill="var(--chart-fill)"` — the pale area-fill token — against the current bar's full-strength
  hue. The code's own comment says *"a second opacity is not a second hue"*, which is true, but it
  also means the rule as written (differ by dash) is not what ships on bars. It differs by
  lightness. It reads fine; the rule and the implementation just do not say the same thing, and
  the legend still shows a *dashed line* swatch for a *pale bar*.
- **Two dashed lines would collide.** Today the maximum is one current + one comparison per panel,
  so the dash carries exactly one bit and one bit is all it needs to carry. The moment `Q-RB-4` is
  answered in favour of multi-series on one axis, dash-only will not scale and a categorical
  palette becomes mandatory. Worth stating now: **the dash rule works because the panel is capped
  at two series, not because dash is a general-purpose encoding.**

### 3.3 Empty, single-point and no-data states

All three are handled, and better than most products.

- **No data in range** (`subscriptions.started`, Jan 2024, outside the store's coverage): the card
  keeps its title and population sentence, states *"0 of 31 buckets have a reading."*, and puts
  **"There was no data found for this date range."** where the plot would be. The headline is an
  em dash, not `0`. Above the card: *"Part of this range is outside what is recorded, so the chart
  breaks rather than reading zero."* This is exactly right — a gap and a zero are different claims
  and the screen makes the difference legible.
- **Single point** (`trips.completed`, yesterday): the planner **coerces line → bar** and says so
  inline on the card — *"Showing a Bar: a Line is no longer legal here."* — with the reason on the
  chart-type control — *"A line needs at least two points and this range has 1."* One bar, one tick,
  headline `2`. Amplitude draws a single dot on an empty line chart. This is better.
- **Illegal query** (`trips.completed` + `revenue.total`): Run is disabled, the canvas says *"This
  report can't run yet. The panel says why."*, and four separate reasons appear next to the four
  controls they belong to. Best-in-class.

### 3.4 The pie

Three plan slices in a one-hue opacity ramp (`RAMP = [1, 0.82, 0.64, …]`), legend below with
swatch, label and **count**.

- **No percentages.** `weekly 26 · biweekly 22 · monthly 22`. A pie's whole job is part-of-whole
  and the part-of-whole number is not printed. The reader has to sum 70 and divide.
- **Two 22s in adjacent opacity steps** are not distinguishable by eye. The list beside it is
  carrying the chart entirely — which the component's own doc anticipates (*"colour is never the
  sole carrier"*), and which is also an admission that the pie is decoration.
- The pie is **visually off-centre** in its card, sitting right of centre with the legend
  left-aligned below.

### 3.5 The cohort matrix

12 rows × 4 columns, percentage in `tabular-nums` with a small filled bar beneath encoding the
value. No heat map — R5a forbids red and the five-tone palette has no diverging ramp, so a
retention matrix's classic colour gradient is not available. The bar is a reasonable substitute for
*one* cell, but a 48-cell matrix is read as a **pattern**, and 12 rows of identical full-width bars
carry no pattern. The block of `100 %` in §6.1 is the proof: a real retention matrix would show a
decaying diagonal and this one shows a rectangle.

Also on this screen: the help text *"Retention is measured a month at a time, because each person
carries one last-seen date and nothing finer…"* is **rendered twice, consecutively**, under
`Cohorts grouped by`. Visible in both languages.

### 3.6 Arabic

`dir="rtl"`, `lang="ar"`, the shell mirrors correctly, the rail moves to the right, the query panel
to the right and the canvas to the left, and — correctly — **the plot area does not mirror**
(`<div dir="ltr">` in `PanelChart`). Dates localise properly: `27 مايو – 25 يونيو`. Money renders
`SAR 2,392.88` with Latin digits, consistently.

But the honest answer to *"is a chart readable in Arabic"* is **no, not yet, and there are two
separate reasons.**

**Reason one, known and declared.** `AR: Dictionary = {}` (`i18n/dictionaries.ts:925`) — the Arabic
dictionary is empty product-wide, on purpose, with a written rationale. So every string in the
module renders in English inside an RTL frame: *Compare to*, *Chart type*, *A pie needs a split, so
it has parts to show*, *Counts trips that finished inside the bucket, by their end time*,
*No checking schedule has been set for this product*. Not this module's defect.

**Reason two, this module's, and it survives translation.** Interpolated runs are not isolated,
and bidi reorders them:

- *"29 of 29 buckets have a reading."* renders as **"of 29 buckets have a reading 29."** — the
  leading numeral has jumped to the end of the line. `Base` in `PanelCard.tsx` renders
  `t('rb.panel.readings', {readings, total})` in a bare `<span>`. Any Arabic sentence that begins
  with an interpolated number will do the same.
- The delta chip renders **"208.6%+"** — the sign has moved to the trailing side.
  `formatSignedPercent` output goes into a bare `<span>` in `Headline`, unisolated.
- Sentence-final full stops land at the **start** of the line for every English caption — a
  symptom of the same missing isolation, and it will recur for any Latin measure name, plan key
  or district name embedded in a translated Arabic sentence.

The module already knows how to do this — group values go through `isolatedRunProps` + `<bdi>`, and
the legend's date range is wrapped in `<bdi>`. The numeric headline, the delta and the readings
sentence were missed. Three `<bdi>` wraps.

---

## 4. Alerts

### 4.1 They are thresholds, and they do not run

An `AlertRule` is: a saved report + one `seriesId` + one of four comparators (`gt gte lt lte`) + a
number + an evaluation grain. That is the entire expressive range.

**The owner's exact ask — *"tell me when this is unusual"* — is not expressible.** There is no
anomaly detection, no standard-deviation band, no seasonal baseline, no *"fell more than 20 %
week over week"*. The spec names percent-change comparators as out of the core with a clear reason
— *"they need a comparison baseline inside the rule, which is a second query"* — and calls them
*"the first phase-two alert feature"*. That is the right first step and it is not built.

**And nothing evaluates.** All five seeded rules read `Checked: Not set`. `cadence` is `null` on
every one, and a `null` cadence does not evaluate. The screen states it plainly at the bottom of
the list: *"No checking schedule has been set for this product, and nothing checks these rules
while the tab is closed. Until that is decided, a rule keeps its settings and does not run."*
`Q-RB-7` — *is there a backend commitment for a scheduler?* — is open, addressed to the business
owner, and the whole layer waits on it.

I want to be fair about this, because it is easy to read as a failure and it is partly the
opposite. The alternative was to invent a cadence, seed it, and ship a screen where `Hourly` and
`Daily` sit in a dropdown backed by nothing. The module refused, said so on screen, and modelled
the field for the day a scheduler exists. That is the right call. **But the owner asked whether
alerts are powerful, and the answer today is that they are a well-designed form for a feature
that does not fire.**

### 4.2 What the alert list gets right

This is the best-written list in the product.

```
Cancellation rate over 6%          Firing        Not set   7%          25 Jun 07:14
  Cancellation rate goes above 6%, read on the last complete day.
  Crossing this line is bad news.

Gross revenue below SAR 400 a day  Armed         Not set   647.37 SAR  25 Jun 03:14
                                   Muted until 26 Jun 05:14

Subscription revenue drop          Suspended     Not set   —           21 Jun 09:14
                                   It stopped because its owner can no longer see the
                                   measure. Only its owner or an admin can resolve it.

Completed trips below 3 a day      Not working   Not set   —           25 Jun 00:14
                                   It stopped after the report could not be read on five
                                   checks in a row. Its owner was told once.
```

Five states, each with the reason on the row in plain words. `Firing` is an amber `warning` badge,
not red — R5a. `Test this rule` is disabled in place on the suspended rule, with the reason two
cells away rather than repeated. And **`Test this rule` says *would have fired*, never *fired***,
emits no notification, and `AlertEvaluation.stateChanged` is the literal `false` so no caller can
misread it. That is a genuinely thoughtful affordance most alerting products do not have.

### 4.3 From a firing alert to the thing that caused it — the path is broken in three places

1. **`Open` opens the edit form.** `AlertsView.tsx:252` sets the editing rule and opens
   `AlertRuleDialog` — a form with name, report, series, comparator, threshold, grain, cadence,
   enabled, muted-until and recipients. It does **not** open the report. So the row-click on a
   firing alert takes the operator away from the number.
2. **There is no chart in the alert editor.** No preview of the series with the threshold drawn on
   it. An operator setting `40` on a measure they have not looked at recently has no way to see
   whether 40 is above or below every reading of the last month. `Test this rule` partly covers
   this — it reports the last complete bucket's value — but one number is not a shape.
3. **There is no firing history on screen.** `alerts.history` / `listAlertFirings` is fully
   implemented in `src/data/clients/alerts.ts:303` — `Paginated<AlertFiring>`, newest first, with
   the bucket, the value, the threshold and the `notificationId` — and **no screen consumes it**.
   `grep -rn "listAlertFirings" src/screens src/components` returns nothing. So *"has this fired
   before? how often? at what values?"* has an answer in the data layer and no surface.

**What does work:** the notification for the one seeded firing (`N11`) carries
`route: ALR_1_ROUTE`, a serialised `?q=` link to the report that fired. So the notification-centre
path lands the operator on the picture. It is the *alerts screen* that does not.

**Amplitude comparison.** An Amplitude alert opens on a chart with the anomaly window shaded, the
threshold or confidence band drawn, and the segment that moved named. Eyvar gives a row, a scalar,
and a form.

---

## 5. What would make it genuinely powerful, ranked by value per unit of effort

Effort is my estimate of build cost given what already exists. The ordering is value ÷ effort, not
value.

| # | Change | Effort | Why it is worth it |
|---|---|---|---|
| **1** | **Window the group ranking.** Pass `query.window` into `groupsFor()` and rank on in-window totals. | **Hours.** One function, `resolveReport.ts:1278`, plus a test. | It is a correctness bug, not a feature. Today every split report shows the wrong eight groups in the wrong order and calls the residual `Other`. Nothing else on this list matters if the chart is wrong. |
| **2** | **Blank the unreachable cohort cells.** Give `buildCohortMatrix` a `today`, return `null` where `cohortStart + N months > today`, render `—`. | **Hours.** One file, `reporting/cohorts.ts`. | It currently prints `0 %` for months that have not happened. Three of twelve rows in the seeded data are wrong on screen. §6.1. |
| **3** | **Fix the filter-chip crash and the three missing `<bdi>` wraps.** | **Hours.** Four small edits. | §6.3 kills the sub-tab from any shared link carrying a filter, which is the module's headline feature. The `<bdi>`s are the difference between a readable and an unreadable Arabic number. |
| **4** | **Widen the filter control**: an operator picker (`is`, `is not`, `is one of`, `contains`, `>`, `<`, `is set`), multiple filters per field, and a value picker fed by the dimension's distinct values. | **Days.** The `FilterOperator` vocabulary and `matchesFilter` already exist; this is UI plus a `dimensions.values` catalogue field. | Turns the segment editor from one equality into a real one. Every question in §1 that survives the catalogue needs at least `is one of`. |
| **5** | **Drill-through from a mark to the rows.** Click a bucket, a bar, a slice or a funnel step → the resource index, pre-filtered by the measure's `population.predicate` + the group value + the bucket's date range. | **Days, not weeks** — `Measure.population` already declares resource, predicate and `timeField`, and the index clients already take `FilterSpec[]`. | The spec's own *"highest-value phase-two item"*. It converts every chart from a number into an action, and it is the single change that most closes the gap to Amplitude. |
| **6** | **An axis-unit label and a per-panel "compare to" of groups.** Add the unit to the y-axis; add an explicit operator opt-in to draw a split on **one** axis with a categorical palette when the groups are within one order of magnitude. | **Days**, but blocked on `Q-RB-4` (product-designer + business owner). | Removes the biggest daily friction: nine axes for one question. Note the decision is a design ruling, not an implementation — do not build it before `Q-RB-4` is answered. |
| **7** | **Percentile aggregates.** Add `median` / `p90` to `BucketAggregate`; wire to `reporting/distribution.ts`, which already has them. | **Days.** The maths exists and is tested. | Makes `requests.timeToAssign` honest. A mean latency is the metric that hides every bad experience. |
| **8** | **Grow the catalogue where the questions are.** In priority order: a **cost / deduction / payout** money measure; a **cancellation-reason** dimension on `trips.*`; a **city / zone** dimension on `revenue.*` and `subscriptions.cancelled`; a **captain-status-change** flow measure (needs `Q-RB-11`'s store). | **Weeks**, and it is mostly *data* work, not UI. | Four of five owner questions die here. This is the largest single lever on "can it solve my problems" and it is the one the builder cannot do for itself. |
| **9** | **Chart annotations.** A dated, named marker on the x-axis, saved with the report. | **Days.** One new type, one `ReferenceLine`. | "Did X change Y" is the shape of most executive questions, and without annotations the operator supplies the date from memory. |
| **10** | **Dashboard date range + segment override.** One window control on the dashboard that overrides every tile's; one filter row likewise. | **Days.** Tiles already resolve a `ReportQuery` at render. | Turns a dashboard from a fixed poster into a reusable surface. Also fix a split report pinning as nine charts in one tile — pin the *distribution*, not the small multiples. |
| **11** | **Alerts: a preview chart in the editor, and a firing history panel.** Draw the series with the threshold as a `ReferenceLine`; render `listAlertFirings` in the rule's detail. | **Days.** The history client is already written and unused. | Closes the alert→cause path without waiting on a scheduler. An operator can at least see whether the threshold is in the right place. |
| **12** | **Percent-change comparators on alerts** (`fell more than 20 % week over week`), then a rolling-baseline "unusual" comparator. | **Weeks**, and gated on `Q-RB-7`. | This is the literal answer to *"tell me when this is unusual"*. It is last only because a smarter comparator on a rule that never evaluates buys nothing. **Answer `Q-RB-7` first** — if there is no scheduler commitment, items 11 and 12 are both premature and the effort belongs in item 8. |

**One strategic note.** §2.2 of `06-report-builder.md` explicitly rules **funnels, retention
curves, cohort grids and path analysis** out of scope — *"Naming them out is what keeps this a
small module"* — and all four were built anyway in P7-T1…T3. They are the four thinnest surfaces
in the module (§6.1's arithmetic bug is in one of them; §2.7's non-event vocabulary is in
another), and the item the same section named as highest-value was not built. The breadth was
spent in the wrong direction. Item 5 above is the correction.

---

## 6. Defects found, with reproductions

All three are green in `vitest`.

### 6.1 The retention matrix prints `0 %` for months that have not happened

**Reproduce.** `/management/reports?q=` with `mode: cohort`, anchor `riders.joined`, grain month,
horizon 3, window `last-365d`. Clock is 25 June 2026.

```
Joined         People   M0     M1     M2     M3
1 Mar 2026     9        100%   100%   100%   77.8%
1 Apr 2026     9        100%   100%   77.8%    0%     ← M3 = July 2026. Has not happened.
1 May 2026     8        100%   87.5%    0%     0%     ← M2, M3 have not happened.
1 Jun 2026     3        100%     0%     0%     0%     ← M1, M2, M3 have not happened.
```

**Cause.** `buildCohortMatrix` in `src/data/reporting/cohorts.ts` takes no notion of *now*. Its
`retentionByMonth[interval]` is `null` only when `cohort.size === 0` — which cannot happen, because
cohorts are created from entities. Every other cell resolves to `active / size`, and `active` is
`0` for an interval nobody could have reached yet.

**Impact.** An operator reads the three newest cohorts as a total collapse in retention. Amplitude
greys unreachable cells; so does every retention product, because the alternative is this. Given
how carefully the rest of this module distinguishes *a gap* from *a zero* — `ReportSeries.points`
has a whole paragraph on it — this is the same defect the module was built to prevent, in the one
file that did not get the treatment.

**Second, related.** The block of `100 %` across the eight oldest cohorts is not retention. The
engine derives survival from a single `lastActiveAt` and marks a subject active *for every month up
to that date* — so retention is monotone by construction and nobody can lapse and return. The
docs know this: `CohortGrain` argues that day and week resolution would be *"a survival curve
wearing a retention matrix"* and disables them. **The identical argument applies to the month
grain**, and it was not applied. Either caveat the matrix on screen or say the word *survival*
instead of *retention*.

### 6.2 Group ranking ignores the report's window

Covered in full at §1.1. `src/data/mock/resolveReport.ts:1278`, `groupsFor()` — no `window` in
scope. Reproduced by running one query at `last-month` and `last-7d` and getting byte-identical
group membership and order, with the rank-1 group at `0.00 SAR` in both.

### 6.3 A report carrying a filter, opened from a link, kills the sub-tab

**Reproduce.** Any `?q=` whose query has a non-empty `filters` array on a trend/table report. e.g.
`measures: ['captains.joined'], filters: [{ field: 'driver.city', op: 'eq', value: 'Riyadh' }]`.

**Result in dev:** the ErrorBoundary catches
`TypeError: Missing translation key "driver.city". Every operator-facing string needs a key in the
English dictionary (AC-74).` and the screen renders **"Couldn't display Reports"**. Reproduced with
a correct value and with a typo; the value is irrelevant.

**Cause.** `src/components/reports/QueryPanel.tsx:448`

```ts
const labelFor = (key: string) => t(dimensions.find((d) => d.key === key)?.labelKey ?? key, undefined)
```

`dimensions` is `catalogue.data?.dimensions ?? []` (`ReportBuilder.tsx:188`) and the catalogue is an
async fetch. On the **first render** — before it resolves — the array is empty, the `?? key`
fallback fires, and `t('driver.city')` throws, because `t` throws on a missing key in dev and test.
The measure picker is correctly gated on `catalogueStatus === 'loading'`; the `Filters` block is
not, and it renders the existing filter chips immediately.

**In production** `t` returns the key instead of throwing, so the operator sees a filter chip
labelled `driver.city` rather than an error page. Both are wrong.

**Why it is green.** All seven seeded saved reports carry `filters: []`
(`fixtures/reports.ts:70, 80, 90, 102, 114, 150, 183…`). The only seeded filter in the module is a
*funnel step* filter on `trip.kind`, which reaches the same latent bug at
`ReportModePanel.tsx:423` by a path that happens not to render before the catalogue resolves. So
nothing in 177 tests exercises the failing line — and the failure is precisely on the module's
headline feature, §9.2's *"the URL is the storage adapter… sharing works with no share feature"*.

**Fix.** Gate the chips on `catalogueStatus`, or make `labelFor` fall back to the raw key without
translating it (`dimensions.find(...)?.labelKey` → `t(labelKey)`, else render `key` directly).

### 6.4 Smaller

- **Duplicate help text.** The cohort-grain explanation renders twice, consecutively, under
  `Cohorts grouped by`. Both languages. `ReportModePanel.tsx`.
- **`Crossing this line is good news.`** is emitted `sr-only` on every panel including panels with
  no threshold — nine times on a nine-panel report. `PanelCard.tsx`, `Headline`.
- **Panel order does not match its documented contract.** `ReportPanel.seriesIds` says *"Chosen-
  measure order, then group rank descending, `Other` last"*. `Other` is last; the rank is not
  descending (§1.1). Same root cause as 6.2.
- **The bar chart's comparison differs by lightness, not by dash**, while the legend shows a dashed
  line swatch for it. `PanelChart.tsx`, the `<Bar dataKey="comparison">` branch.
- **The pie prints counts, not percentages**, and sits right of centre in its card.
- **`Time to assign` appears as a journey node.** It is a `minutes` measure, not an event.
- **The partial-bucket band is a single-x-value `ReferenceArea`** and is not visible at typical
  bucket density.

---

## 7. What I would tell the owner in one paragraph

The engine is real and it is unusually honest — it will tell you when a number has no data behind
it, refuse to draw a chart that would lie, and name the population of every figure on the card
itself. Almost nothing else in this class of product does that, and it should not be traded away.
But you cannot ask it four of your five questions, because the catalogue has seventeen measures and
none of them is a cost, a deduction, a reason code or a captain leaving; the one question you *can*
ask it comes back ranked by the wrong period; a split answer arrives as nine charts you cannot
compare; you cannot click any of them to see who or what is behind the number; and the alerts are
a fixed threshold on a rule that nothing currently runs. The distance from here to Amplitude is
**not** more chart types — four extra chart types were already built, off-spec, and they are the
weakest part of the module. It is: window the group ranking, click a chart into its rows, widen the
filter to more than `equals`, and put the money side of the business into the catalogue. Those four,
in that order.
