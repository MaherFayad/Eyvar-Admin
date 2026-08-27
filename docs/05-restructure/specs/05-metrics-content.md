# 05 — Metric board content: what the eight surfaces say

> **Owner:** product-owner. **Artifact for:** product-designer (`design/05-metrics-*.md`),
> mock-data-engineer (`src/data/fixtures/metrics.ts`, `src/data/types/metrics.ts`).
> **Acceptance criteria:** **AC-600 – AC-724**. AC-500s belong to the auth spec being
> written in parallel; nothing here touches them.
>
> **This spec decides content, not layout.** No component names, no colour, no spacing, no
> grid. Where a number needs a shape the contract does not have, that is recorded in §17 as
> a finding for product-designer, not resolved here.
>
> **Every legacy claim carries a line number** into `eyvar_ops_panel_v40_fixed.html`.
> Anything I could not ground carries `[inferred]`.

---

## 1. Problem

The eight metric boards were built as a composer plus a surface id — one `MetricBoardScreen`
rendering whatever `getMetricBoard(subTabId)` hands it — and the shape shipped before anybody
decided what each surface should say. The result is thirty-six tiles and nine charts spread
across nine boards, of which twenty-two carry `comparison: { kind: 'none', reason: 'no-history' }`,
four are seeded literals nobody can reproduce, and several are cumulative counts an operator
cannot act on (`Zones tracked`, `Registered riders`, `Activity events`). Meanwhile the numbers
that decide what an operator does *this shift* are absent: how many captain applications are
waiting and how many are past their window, how many tickets are breaching right now, how many
subscriptions are predicted to churn and what money that is, how many captains a zone needs to
stop failing matches, how many on-call slots have nobody in them. The legacy app computes almost
all of these — `renderDashboard` alone puts pending approvals on screen at `:10374` — so the gap
is not data. The gap is that nobody wrote down what each board is for.

---

## 2. Scope

### 2.1 In

1. **The one question each of the eight boards answers**, in one sentence, and a
   recommendation where a board cannot justify one.
2. **The metric tiles per board**, ranked, each with a plain-language definition, a named
   source (legacy line number or `NEW DATA`), a comparison period, and what a bad value means.
3. **The charts per board**, each with what it plots, its bucket, why it is a chart rather
   than a tile, and the decision it changes.
4. **The breakdowns per board** — ranked lists, by dimension, top N, and the row's destination.
5. **What is deliberately excluded from each board**, and which screen owns it instead.
6. **The count-authority rules** between `navCounts` and metric tiles (§14).
7. **Provisional role scoping** against the five legacy roles, marked as provisional under **D4**.
8. **Findings** where the metric a board needs cannot be expressed by
   `src/data/types/metrics.ts` (§17).

### 2.2 Out

| Out | Reason |
|---|---|
| **Layout, grid, tile order on screen, colour, typography** | product-designer owns §3.7's rendering. This spec ranks tiles by importance; where they sit is not mine. |
| **`/financials/overview`** | Already fully specified by `specs/03-financials.md` §5 and **AC-346–353**. It is a `P5` board in the route table and is **not** in `METRIC_BOARD_SUB_TABS` — that mismatch is finding **F-9b**, not a licence for me to re-spec its content. |
| **The per-item rows behind every number** | The wave-2 queues (`specs/02-work-queues.md`) own claim, disposition and SLA per item. A board that re-lists rows is a second, staler copy of a queue. Stated per surface, and as **Q-106**. |
| **The plan editor's derived values** | `specs/03-financials.md` §8. |
| **Any revenue-share, commission or captain-earnings figure that requires choosing between the four pricing models** | Blocked on **Q7**. Named per tile where it bites. |
| **Retention cohorts as a heat matrix, and CSAT / NPS** | Both are hardcoded literals in legacy (`:13762`, `:13786`) with no backing store, and the matrix has no shape in the contract. Findings **F-5** and **F-6**; not specified as metrics. |
| **A date-range control on a board** | `getMetricBoard` documents `from` / `to` and `MetricBoardScreen` passes neither; `MetricBoard` carries no period. Adding one is finding **F-7** and a designer decision. Until then every board states the period **per tile**, which the type already supports. |
| **New routes, new views, new sub-tabs** | The route table has a single owner. Where a breakdown row has nowhere to go, that is finding **F-8**, not an invention. |
| **Audible or animated alerting on a board** | R18, and `specs/02-work-queues.md` §2.2 already ships silent. |
| **`support-fairness`'s captain-economics board** | A ninth board, and `specs/02-work-queues.md` §9.5 already owns it — including the upper-bound label it must carry and the **Q-80** it raises about the fleet-average calculation. |

---

## 3. The screens

All eight map to one `DESIGN.md` §6.4 row: **`exec-overview` · `dashboard` · `predictive` ·
`growth` · `coverage` · `commitment` · `fairness` · `fraud` → Metric tiles + chart cards
(§3.7)** — pattern `P5` (`docs/ref/patterns.md:12`). **No board invents a page shape.**

| # | Sub-tab id | Route | Legacy contributors | Route-table `patterns` |
|---:|---|---|---|---|
| 1 | `management-overview` | `/management/overview` | `exec-overview` (`:6901`) | `P5` |
| 2 | `management-performance` | `/management/performance` | `exec-overview`, `growth` | `P5` |
| 3 | `management-risk` | `/management/risk` | `predictive` (`:14367`), `fraud` (`:5592`) — merged by **M1** | `P5` |
| 4 | `management-growth` | `/management/growth` | `growth` (`:14386`) | `P5`, **`P1`** |
| 5 | `management-zones` | `/management/zones` | `zones` (`:14131`), `exec-overview`'s expansion list (`:6951`) | **`P1`** only |
| 6 | `operations-overview` | `/operations/overview` | `dashboard` (`:10346`), `inbox` | `P5` |
| 7 | `support-overview` | `/support/overview` | `support`, `contacts` (`:15011`), `safety` (`:13397`), `fairness` (`:15636`) | `P5` |
| 8 | `admin-overview` | `/admin/overview` | **none** — assembled from `auditLog`, `teamUsers`, `integrityScan` (`:18565`), `rotaGaps` (`:19650`), `DB.legalDocuments` (`:13867`), the erasure queue (`:15961`), `DB.dataWindow` | `P5` |

**Two route-table rows disagree with the code. Both are findings, not decisions of mine:**

- **F-9a — `management-zones` declares `patterns: ['P1']` (index table) and is served a metric
  board.** Either the row is wrong or the board is. My content answer assumes **both**: Zones is
  a board *and* a table, exactly like `management-growth`, whose row already declares `['P5','P1']`.
- **F-9b — `financials-overview` declares `patterns: ['P5']` and is absent from
  `METRIC_BOARD_SUB_TABS`**, so `getMetricBoard('financials-overview')` 404s and the screen
  renders an error where a board is specified. Owner: mock-data-engineer, against
  `specs/03-financials.md` **AC-346–353**.

---

## 4. Data

### 4.1 The rule every number obeys

**Q-100 — Every metric is either (a) computable from data that exists today, with the source
named to a line, or (b) marked `NEW DATA` with what would have to be captured. A metric with no
stated source does not ship.** The tables in §5–§12 carry a `Source` column and it is never blank.

**Q-101 — `NEW DATA` is a legitimate answer and is not a deferral.** A tile marked `NEW DATA` is
specified in full — definition, comparison, bad value — and ships with `value: null`, which
`Metric` already models as *"not computable, and it is not `0`"*. The tile renders with an
em-dash and a stated reason. It does **not** ship with a plausible literal.

**Q-102 — A seeded literal is a `NEW DATA` metric wearing a number.** Four metrics are literals
today (`totalRevenue`, `contributionMargin`, `revenueAtRisk`, `earningsPerEngagedHour`) and
`build/05` §6 **M-2** already says so. Under Q-101 they become `value: null` with a reason,
**unless** the derivation below names an existing source. Where I have named one, they stop
being literals.

**Q-103 — A number is a metric tile on exactly one of the eight boards.** Eight boards that each
restate the other seven is the failure this spec exists to prevent. Where two boards want the
same number, the board whose *role* acts on it keeps it.

### 4.2 The corrected history position — this changes twenty-two comparisons

The fixtures set `comparison: { kind: 'none', reason: 'no-history' }` on twenty-two of
thirty-six metrics, citing the legacy app's own sentence at `:6979`: *"the Data Export → Daily
Snapshots tool builds a real historical trend the longer it's used."*

**That sentence is about automatic capture. It is not true of the seeded data.**
`DB.dailySnapshots` at **`:13803`–`:13832`** holds **thirty consecutive daily rows**, each
carrying nine fields:

| Snapshot field | Type | What it is | Line |
|---|---|---|---|
| `date` | `string` (`'26 Jun 09:00'`) | capture instant | `:13803` |
| `riders` | `int` | total riders | `:7649` (`captureDailySnapshot`) |
| `drivers` | `int` | captains **excluding `pending`** | `:7649` |
| `activeSubs` | `int` | subscriptions not matching `/cancel/i` | `:7648` |
| `quickRides` | `int` | quick-ride trips | `:7648` |
| `cancelRatePct` | `int` | cancelled ÷ quick rides, rounded | `:7650` |
| `totalRevenue` | `string` SAR | paid payments | `:7650` |
| `quickRideRevenue` | `string` SAR | paid payments of type `Quick ride fare` | `:7651` |
| `subRevenue` | `string` SAR | paid payments of type `Subscription charge` | `:7651` |

`renderTrendChart` (`:6769`) already plots two of them and computes a first-to-last change
percentage at `:6776`.

**Consequences, all of them mechanical:**

1. **`reason: 'no-history'` is wrong for any metric derivable from those nine fields.** Active
   subscriptions, active captains, registered riders, quick rides, cancellation rate, total
   revenue, quick-ride revenue and subscription revenue all gain a real
   `comparison: { kind: 'previous-period', … }`.
2. **Five of the nine charts gain a real source** instead of a hand-written seven-point array.
3. **The bucket is `day` and the natural window is 30 days**, because that is what exists. A
   seven-day window (`CURRENT_PERIOD`, `fixtures/metrics.ts:48`) throws away 23 of the 30 rows.
4. **The snapshot calendar does not line up with the clock, and must be re-anchored.**
   `EYVAR_NOW` is `2026-06-25T09:14` (`src/data/mock/clock.ts:25`); the snapshots run
   **26 Jun → 25 Jul 2026** (`:13803`, `:13832`) — thirty days entirely in the *future* of the
   fixed clock. **Re-anchor them to end on the clock's day (27 May → 25 Jun).** Fixture change,
   owner mock-data-engineer, prerequisite for every `previous-period` comparison below.
   **AC-604** tests it.

**Where `no-history` remains correct:** anything with no snapshot field behind it — SLA breaches,
claim counts, contact volume, promo ROI, zone failure rates, rota gaps, integrity orphans,
erasure requests. Those are `NEW DATA` for the *trend* and computable for the *value*.

### 4.3 Field register — every field these eight boards read

Boards are read-only (`MetricBoardScreen`, §8 slot 4c: *"no page-level action"*), so **nothing in
this table is written**. `Derived` means computed by the app from a resource this data layer
already serves, per `Metric.sourceResource`.

| Field | Type | Source | Derived |
|---|---|---|---|
| `MetricBoard.subTabId` | `string` | route | no |
| `MetricBoard.asOf` | `IsoDateTime` | server | no |
| `Metric.key` | `string` | fixture / server | no |
| `Metric.category` | `MetricCategory` | fixture / server | no |
| `Metric.value` | `number \| null` | see §5–§12 per tile | per tile |
| `Metric.unit` | `MetricUnit` | fixture / server | no |
| `Metric.currency` | `CurrencyCode \| null` | fixture / server, set iff `unit === 'money'` | no |
| `Metric.asOf` | `IsoDateTime` | server | no |
| `Metric.periodStart` / `periodEnd` | `IsoDate \| null` | server; **both `null` on a point-in-time metric** | no |
| `Metric.comparison` | `MetricComparison` | server | no |
| `Metric.deltaPercent` | `number \| null` | **derived** in `clients/metrics.ts` from `value` and `comparison` | **yes** |
| `Metric.direction` | `MetricDirection \| null` | **derived**, same place | **yes** |
| `Metric.higherIsBetter` | `boolean` | fixture / server — cannot be derived from key, unit or sign | no |
| `Metric.sourceResource` | `string \| null` | fixture / server | no |
| `Metric.drilldownRoute` | `string \| null` | fixture / server; a route-table path plus a `?view=` param | no |
| `TimeSeries.current` / `.comparison` | `SeriesWindow` | server; `comparison` `null` where no prior window | no |
| `SeriesPoint.value` | `number \| null` | server; **`null` is a gap, never a zero** | no |
| **`Metric.caption`** | `string` key | **DOES NOT EXIST — finding F-2** | — |
| **`MetricBoard.breakdowns`** | — | **DOES NOT EXIST — finding F-1** | — |
| **`MetricBoard.banner`** | — | **DOES NOT EXIST — finding F-3** | — |
| **`TimeSeries.drilldownRoute`** | — | **DOES NOT EXIST — finding F-10** | — |

Money is **halalas**, integer, everywhere (`types/metrics.ts`). Legacy carries SAR floats and
`toFixed(0)`s them (`:14383`); the conversion happens at the fixture, once.

---

## 5. Management › Overview

> **The question:** *Is the business growing, and is it keeping the two promises it sells?*

The two promises are literal: *"same captain every trip"* and *"no waiting at pickup"* are the
first two bullets on the rider's plan card, and `:15697`–`:15700` records that until
`sameCaptainStats()` and `onTimeStats()` were written they *"were measured nowhere, so a broken
promise only surfaced later as churn."* That is why they are on the board an owner opens first.

### 5.1 Tiles, in priority order

| # | Tile | Definition | Source | Comparison | A bad value is |
|---:|---|---|---|---|---|
| 1 | **Contribution margin** | What the business keeps after captain earnings **and** promos, referral bonuses, captain incentives, refunds, goodwill credits and unrecovered emergency cover. | `contributionMargin().truePct` `:15720`–`:15740` | previous period (month) | Below the gross-margin figure by more than the giveback budget, or falling two periods running. Legacy's headline 19.2 % subtracts none of the givebacks and its own comment calls it *"structurally overstated"* (`:15714`). |
| 2 | **Gross revenue** | Sum of `DB.payments` with `status === 'Paid'`, for the period. | `:6908`; per-day `totalRevenue` `:13803`+ | previous 30 days — **now available**, §4.2 | Below the prior period while active subscriptions are flat or up — a price or mix problem, not a demand one. |
| 3 | **Active subscriptions** | Subscriptions whose status is `Active`. Derived from the same fixture the Subscriptions table serves. | `:6905`; per-day `activeSubs` `:13803`+ | previous 30 days | Falling while new subscriptions are flat — churn, not acquisition. |
| 4 | **Net subscription movement** | New subscriptions started in the period **minus** subscriptions cancelled in the period. | derivable from `DB.subscriptions[].started` and status; per-day proxy from `activeSubs` deltas `:13803`+ | previous period | Negative. Legacy states this as prose (*"Net subscription base is flat or shrinking"*, `:6970`) rather than as a number. |
| 5 | **Plans keeping the same captain** | Plans with `driverChanges === 0`, as a share of all plans. | `sameCaptainStats()` `:15702`–`:15706` | **target 95 %** (`fixtures/metrics.ts`, `setByUserId: null` — **M-1**) | Below 95 %. Each broken plan is a promise on the rider's plan card that did not hold. |
| 6 | **On-time pickups** | Non-cancelled trips not matching `Late +`, as a share of non-cancelled trips. | `onTimeStats()` `:15708`–`:15713` | **target 95 %** (same M-1 caveat) | Below 95 %, and worse if falling while trips rise — capacity, not chance. |

**Current behaviour, suspected defect, do not port (L-3):** the legacy "net subscription trend"
at `:6969`–`:6971` compares a *current-state* count of active subscriptions against a
*cumulative* count of cancelled ones. Different denominators; the comparison is not meaningful.
Tile 4 replaces it with two period-scoped counts.

### 5.2 Charts

| Chart | Plots | Bucket | Window | Why a chart rather than a tile | What the operator does differently |
|---|---|---|---|---|---|
| **Quick-ride revenue** | `dailySnapshots[].quickRideRevenue` | day | 30 days | A total tells you the size; the shape tells you whether it is compounding or a single good week. | Decides whether quick rides are a growing line of business or a smoothing layer over subscriptions. |
| **Subscription revenue** | `dailySnapshots[].subRevenue` | day | 30 days | Same, and it is the half the product exists to sell. | If subscription revenue is flat while quick-ride revenue grows, the subscription product is not landing and Growth's spend is aimed at the wrong thing. |

Both already exist as a pair in legacy — `renderExecTrendChart` renders exactly these two
(`:6765`–`:6768`). Comparison window: the 30 days before, which needs 60 snapshots; until then
`comparison: null` and one legend chip.

**Deliberately not one stacked chart.** §3.7 permits one hue plus its dashed comparison and
`globals.css:919` deletes the categorical ramp. Two single-series cards say the same thing and
are permitted; a stacked composition is finding **F-4**.

### 5.3 Breakdowns

**None.** Overview is six tiles and two charts, and that is the whole board.

### 5.4 What is deliberately not here

| Excluded | Legacy | Where it lives instead |
|---|---|---|
| The financial-position block — total revenue, captain earnings, platform net, escrow held | `:6921`–`:6928` | **Financials › Overview**, `specs/03-financials.md` AC-346–350. Two boards showing escrow held is two answers to one question. |
| Subscription growth counts — active / expiring / cancelled / avg renewal rate | `:6929`–`:6934` | Expiring and cancelled are **Operations › Subscriptions** views (`expiring-7d`, `at-risk`). Renewal rate is **Performance** §6. |
| Cities & regions health | `:6937`–`:6947` | **Market & Zones** §9. |
| Expansion-ready zones | `:6951`–`:6958` | **Market & Zones** §9. |
| Rider engagement / dormancy | `:6963`–`:6968` | **Growth** §8. |
| The retention watchlist — five named high-LTV at-risk riders with a "send offer" button | `:6980`–`:7002` | **Risk & Signals** §7, as a breakdown. It is a list of people with an action attached, which is queue-shaped, and it must not sit under an owner's revenue tiles. |
| The predictive prose paragraph | `:6969`–`:6978` | **Deleted.** It is a sentence asserting a trend, built by concatenating two counts — untranslatable by construction (L-10). Tile 4 and the two charts say the same thing in a form that has keys. |
| Registered riders | `:6902` | **Growth.** A cumulative census is an acquisition number, not a board number. |

---

## 6. Management › Performance

> **The question:** *Is the service getting worse for the people who already pay us?*

**This board nearly failed the test.** Its two most distinctive legacy pieces — the retention
cohort matrix (`:13762`–`:13784`) and the CSAT / NPS card (`:13786`–`:13795`) — are **hardcoded
literals with no backing store**: five hand-typed cohort rows, and `4.6/5 (n=212)` and
`+42 (n=131)` written into the markup. Neither can ship as a metric under Q-100.

It survives because there is a real, distinct, computable question underneath: quality decay is
not the same thing as growth, an owner reading Overview will not see it, and one number on it —
**cancellation rate** — has thirty days of real daily history at `:13803`+ and is currently on no
board at all. That is the "cancellations spiking" the business owner asked for.

### 6.1 Tiles

| # | Tile | Definition | Source | Comparison | A bad value is |
|---:|---|---|---|---|---|
| 1 | **Quick-ride cancellation rate** | Cancelled quick rides ÷ all quick rides, for the period. | `cancelRatePct` `:7650`, per-day `:13803`+ | previous 30 days | Above the trailing 30-day mean. The seeded range is 3–9 %; a day at 9 % after a week at 4 % is the spike. |
| 2 | **Average renewal rate** | Mean of subscribers' recorded renewal rate, over active subscriptions. | `:6931` | previous period | Below 60 % `[inferred]`. **Suspected defect (L-4):** this is a mean of a per-*rider* stat string parsed with `parseInt`, not a renewal outcome measured over the period, and riders with no stat are silently dropped. Ships as legacy computes it, labelled, and flagged as **Q-107**. |
| 3 | **Average captain rating** | Mean `rating` over captains that have one; `null` when none does. | derived, `clients/metrics.ts` | previous period | Below 4.5 `[inferred]`, or falling while trips rise. |
| 4 | **Trips completed** | Trips with status `done`, for the period. | derived over the trips fixture | previous 30 days (`quickRides` `:13803`+ covers the quick-ride half) | Not bad on its own. This is the denominator the other three are shares of, and it is here so those shares can be read honestly. Ranked last for that reason. |

**Contribution margin does not appear here.** It moves to Overview §5.1 tile 1, per Q-103.

### 6.2 Charts

| Chart | Plots | Bucket | Window | Why a chart rather than a tile | What the operator does differently |
|---|---|---|---|---|---|
| **On-time pickups** | share of non-late trips | day | 30 days | Overview carries the *tile*; the decay is only visible as a slope. The existing fixture deliberately carries a **gap in the middle** (`build/05` §8) — a break in the line, never a dip to the axis. | A three-day slide is a dispatch or capacity problem worth acting on today; one bad day is weather. |
| **Cancellation rate** | `cancelRatePct` `:13803`+ | day | 30 days | The rate is noisy day to day and means nothing except against its own recent spread. | A sustained rise triggers a look at zone supply (§9) before it arrives as churn in Risk (§7). |

**Q-104 — A chart may appear on a board whose tile lives elsewhere.** `ChartCard` already resolves
`reportHref` by matching the chart key against a metric on the same board and passes `null` when
there is none (`MetricBoardScreen`). On-time pickups is exactly that case, so its report link is
`null` today. **Preferred fix: give `TimeSeries` its own `drilldownRoute`** — finding **F-10**,
one nullable field.

### 6.3 Breakdowns

| # | Breakdown | Dimension | Top N | Row links to |
|---:|---|---|---|---|
| 1 | **Captains by late-trip share** | captain | 5, worst first | `/operations/people?view=captains`, resolving to that captain's profile |
| 2 | **Renewal rate by plan tier** | plan (Weekly · Bi-weekly · Monthly) | all 3 | `/operations/subscriptions?view=all` |

Breakdown 2's legacy equivalent is the "Revenue by plan" table at `:951`–`:958`, which is **seven
rows of hardcoded HTML whose own total disagrees with the tiles above it** (L-2). The dimension
is real (`DB.subscriptions[].plan`); the numbers must be derived, not ported.

### 6.4 What is deliberately not here

| Excluded | Legacy | Where it lives instead |
|---|---|---|
| Retention cohorts | `:13762` | **Nowhere yet.** Finding **F-5**: computable from `DB.subscriptions[].started` and status, but a cohort × month heat grid has no shape in the contract and arguably should not get one. Escalated, not designed around. |
| CSAT / NPS | `:13786` | **`NEW DATA`** — needs a survey store: a response per closed ticket (1–5) and per completed package (0–10). Legacy describes the mechanism in prose (`:13793`) and implements none of it. |
| Contacts per 1,000 trips, promise-kept %, uncoded share | `:15015`–`:15025` | **Support › Overview** §11. They are quality numbers, but Support is the role that acts on them (Q-103). |
| The list of late trips | `:10381` | **Operations › My Work** and **Trips**. |

**Recommendation, on the record.** If the business ever wants five boards instead of six,
Performance is the one to fold into Overview: its four tiles and two charts would sit under
Overview's six without crowding, and the boundary between "is the business growing" and "is
service decaying" is thinner than the other five boundaries. I am **not** recommending it today,
because cancellation rate needs somewhere to live and Overview's six tiles are already the right
six. Recorded as **Q-114** so it stays a decision rather than becoming a discovery.

---

## 7. Management › Risk & Signals

> **The question:** *What is about to fail that nobody has been told about yet?*

**M1's ruling holds and shapes the whole board:** Risk & Signals *"computes a flag and routes the
operator elsewhere; every action is a `go()`"* (`:14320`, `:14336`, `:14351`, `:14363`). It has
no work queue. **Every tile here carries a drilldown to the queue that owns the work, and no tile
has an action.**

### 7.1 Tiles

| # | Tile | Definition | Source | Comparison | A bad value is | Drilldown |
|---:|---|---|---|---|---|---|
| 1 | **Revenue at risk** | Remaining contracted value on subscriptions scoring below 50 on the health score. | `:14372`, over `subEconomics(s).remaining` `:3605` | `NEW DATA` for the trend; the value is computable today | Any amount above one period's contribution margin — the churn costs more than the business kept. | `/operations/subscriptions?view=at-risk` |
| 2 | **Subscriptions predicted to churn** | Subscriptions with `subHealthScore(sub).score < 50`. Signals: behind expected pace, no backup captain, assigned captain has an open dispute or incident, prior complaints on file, payment risk, captain suspended. | `subHealthScore` `:14219`–`:14234`; count `:14369` | `NEW DATA` | More than 10 % of the active book `[inferred]`. | `/operations/subscriptions?view=at-risk` |
| 3 | **Captains at risk of unavailability** | Captains with `driverRiskScore < 80`. Signals: expired or expiring document, compliance suspension, open disputes or incidents, primary on 2+ plans with no backup relief, cash debt over cap, repeat cash under-reporting. | `driverRiskScore` `:14281`–`:14306`; count `:14371` | `NEW DATA` | Any captain scoring below 50 — that is an expired document, i.e. a captain who is legally off dispatch and may still be dispatched. | `/operations/people?view=compliance` |
| 4 | **Identity collisions spanning a rider and a captain** | A phone number or email address shared by a rider account and a captain account. | `identityCollisions()` `:16461`; cross-role count `:16495` | none (`no-history`) | **Any.** Legacy states why: *"those are the ones that break dispatch, because an event keyed on an ambiguous identity can be published to the wrong client"* (`:16497`–`:16500`). | Admin › Data, integrity pane — **F-8**, no view id exists |
| 5 | **Captains with repeat incidents** | Captains with 2 or more incidents or disputes recorded against them — *"a pattern, not a one-off"*. | `renderPredIncidents` `:14341`–`:14355` | previous period | Any, and it must be read within the period rather than accumulated forever. | `/support/safety?view=open` |
| 6 | **Renewal payments flagged** | Riders on `DB.paymentRisk` holding a non-cancelled subscription. | `:14199`, rendered `:14325`–`:14340` | none | Any. The seeded case is one declined card retry (`RDR-1041`, `:14199`) — a renewal that will fail silently unless someone calls first. | `/operations/subscriptions?view=at-risk` |

**`Open signals` is removed as a tile.** It is `redSubs + atRiskDrivers + paymentRisk` (`:14375`)
— the sum of tiles 2, 3 and 6 — and it is **already the sub-tab's nav badge**
(`navCounts` `management-risk: 6`). A tile that equals the badge beside it is a second copy of
the badge in a bigger font. **AC-629** and **AC-720**.

### 7.2 Charts

**None, and that is the finding rather than an omission.**

The existing `chart.management.risk.openSignals` plots the aggregate this spec deletes, and no
operator acts on the shape of a signal count. The chart worth having is **revenue at risk,
daily** — money moving is what authorises retention spend — and no snapshot field carries it
(`:13803`+ holds nine fields, none of them this). It is `NEW DATA`: one added line in
`captureDailySnapshot` (`:7645`–`:7653`).

**Q-105 — A board may ship with zero charts.** An honest absence beats a decorative plot, and
`MetricBoardScreen` already renders nothing when `charts.length === 0`.

### 7.3 Breakdowns

| # | Breakdown | Dimension | Top N | Row links to |
|---:|---|---|---|---|
| 1 | **Subscriptions by health score, ascending** | subscription | 5 | `/operations/subscriptions?view=at-risk`. Row states the score and its **first** reason — the reasons array is ordered by the deduction that fired first (`:14219`+). |
| 2 | **High-value riders at risk** | rider | 5, by lifetime value descending among riders whose churn risk is not `Low` | the rider's profile (shell layer). `renderRetentionWatchlist` `:6980`–`:7002`, `riderLTV` `:4031`, `riderChurnRisk` `:4048`. |
| 3 | **Captains with an availability signal, worst score first** | captain | 5 | `/operations/people?view=compliance` — `renderPredDrivers` `:14307`–`:14324` sends every row there. |

**The "Send retention offer" button on breakdown 2 does not come across.** §8 slot 4c: a board is
a read surface. The action lives on the rider's profile and on
`/operations/subscriptions?view=at-risk`. A deliberate loss, recorded — legacy fires an email and
a toast straight from the overview (`:7003`–`:7011`) with no confirmation and no undo.

### 7.4 What is deliberately not here

| Excluded | Legacy | Where it lives instead |
|---|---|---|
| Structural zone shortages | `renderPredZones` `:14356` | **Market & Zones** §9. It is the same three zones under a second name; `:14362` calls it *"a scheduling gap, not a one-day spike"*, which is a supply decision, not a risk read. |
| The identity-collision detail list | `:16492` | **Admin › Data**, integrity pane. Risk carries the cross-role count; the merge / do-not-merge judgement (`:16482`) is an admin task with a real decision attached. |
| Every retention action — flag for call, assign backup now, send early-renewal offer | `:14260`–`:14268` | The subscription's own screen. |

---

## 8. Management › Growth

> **The question:** *Is the money we spend to acquire and keep riders producing subscriptions?*

**This sub-tab is a board *and* a table** — `patterns: ['P5','P1']`. The board is six tiles and
one chart; the promo campaigns and incentive rules are the **table**, because both carry row
actions (pause, resume, award, remove) and a board has no actions. `MetricBoardScreen` renders
only the board half today — finding **F-11**.

### 8.1 Tiles

| # | Tile | Definition | Source | Comparison | A bad value is |
|---:|---|---|---|---|---|
| 1 | **Blended promotion ROI** | Attributed subscription revenue ÷ discount spend, across all campaigns. | `promoROI(p)` `:13501`, rendered `:13511` | previous period | **Below 1.0×** — you are paying more in discount than the subscriptions are worth. Legacy colours the per-campaign figure red below 1 (`:13520`). |
| 2 | **Promotion budget consumed** | Spend ÷ budget across active campaigns, as a percentage. | `p.spent` / `p.budget` `:13510` | **target**: the cap. Ships `no-target` until someone sets one — **M-1**. | **≥ 80 %**, which is the warning legacy already draws (`:13516`: green → amber at 80, red at 100). At 100 % campaigns auto-pause (`:13548`) and acquisition stops without anyone deciding it should. |
| 3 | **Subscriptions attributed to promotions** | Sum of `p.newSubs` across campaigns, for the period. | `DB.promos` `:13509` | previous period | Falling while spend rises — tile 1's numerator going the wrong way. |
| 4 | **New riders** | Riders whose join date falls inside the period. | derived over the riders fixture | previous 30 days (`riders` `:13803`+ gives the daily base) | Flat while promotion spend rises. |
| 5 | **Dormant riders** | Riders with **no recorded trip and no subscription**, as a share of all riders. | `:6963`–`:6968` | previous period | Above 25 % — legacy's own threshold at `:6967`. **This tile must carry the caveat verbatim**: dormancy here is a proxy, because *"this dataset has no precise 'last app open' timestamp per rider"* (`:6968`). Without a caption field (**F-2**) the caveat has nowhere to go — **AC-641**. |
| 6 | **Referral and incentive spend** | `DB.referralLog` referrer + referee bonuses (`:13888`, summed `:15726`) plus `DB.driverBonusLog` amounts (`:13895`, summed `:15727`), for the period. | as cited | previous period | Growing faster than tiles 3 and 4 combined. This is the other half of the giveback Overview's contribution margin subtracts, and it is invisible until it is a tile. |

### 8.2 Charts

| Chart | Plots | Bucket | Window | Why a chart rather than a tile | What the operator does differently |
|---|---|---|---|---|---|
| **New subscriptions** | subscriptions started per day | day | 30 days | A campaign either moves this line or it does not, and a total cannot show the step. | Extend, pause or kill a campaign — and the pause control is one row away on the same sub-tab's table. |

**Not built: promotion spend against subscriptions attributed on one plot.** Two units, two hues,
and §3.7 permits one hue plus its dashed comparison. Finding **F-4**. The two tiles beside each
other carry the same information at lower resolution, which is the correct trade under the rule
as written.

### 8.3 Breakdowns

**None on the board.** The two ranked lists that matter — campaigns by ROI (`:13506`) and
incentive rules by total paid (`:13663`) — carry row actions and are the sub-tab's `P1` table.
A read-only top-five sitting above a table of the same rows is exactly the duplication this spec
exists to prevent.

### 8.4 What is deliberately not here

| Excluded | Legacy | Where it lives instead |
|---|---|---|
| Bulk messaging | `renderBulkMsg` `:13740` | **Admin › Communications**, `outbox` view. It is a send surface, not a metric. |
| Retention cohorts, CSAT / NPS | `:13762`, `:13786` | §6.4 — findings F-5, F-6. |
| Referral programme detail | `renderReferralProgram` `:3877` | Rider Wallets and the rider profile. Tile 6 carries the cost; the ledger carries the rows. |

---

## 9. Management › Market & Zones

> **The question:** *Where is demand going unserved, and where does the next captain need to be?*

### 9.1 Tiles

| # | Tile | Definition | Source | Comparison | A bad value is |
|---:|---|---|---|---|---|
| 1 | **Captains needed to reach a healthy ratio** | Summed over zones: `max(0, ceil(demand ÷ 3) − supply)`. Three active requests per available captain is legacy's stated healthy target. | `:14156` | previous period | **Any number above zero — and it is the most actionable figure on any of the eight boards**, because it turns a ratio nobody can act on into a recruitment target somebody can. It is on no board today. |
| 2 | **Supply-starved zones** | Zones where `demand ÷ supply ≥ 3`. | `:14133`, rendered `:14136` | previous period | Any, and worse if the same zone is starved on consecutive days — a rota problem, not a spike (`:14362`). |
| 3 | **Unserved requests (30 days)** | Sum of `z.failures30d` across zones — demand that found no captain. | `:14139` | previous 30 days once a daily count exists (`NEW DATA`) | Rising while captains-needed is flat: supply moved, but not to where demand is. |
| 4 | **Average request failure rate** | Mean of `failures30d ÷ demand` across zones. | `zoneFailRate` `:13974`, averaged `:6942` | previous period | Above 25 % is legacy's watch band; above 50 % its recruit-now band (`:14153`). |
| 5 | **Steering offers live** | `DB.steerOffers` with `status === 'active'`. | `:14140` | none | An offer live past half its window with zero acceptances — the incentive is too small and the budget is burning (`:14107`–`:14113`). |
| 6 | **Cities live** | `DB.cities` with `active === true`. | `:13946`–`:13951` | **target 4** — all four seeded cities | 1 of 4. Riyadh is live; Jeddah, Dammam and Makkah are not. Ranked last because it moves quarterly, not daily. |

**`Zones tracked` is removed as a tile.** Six is a constant of the seed data (`:13952`–`:13959`).
A count that changes only when someone adds a zone is a setting, not a metric — and it is already
the sub-tab's nav count, which currently reads `0` for a different reason (**AC-724**).

### 9.2 Charts

| Chart | Plots | Bucket | Window | Why a chart rather than a tile | What the operator does differently |
|---|---|---|---|---|---|
| **Unserved requests** | failed matches per day | day | 30 days | A 30-day total cannot distinguish a bad Tuesday from a structural gap, and the two have different remedies. | A spike gets a steering offer; a plateau gets a recruitment drive. Both controls are on this sub-tab's table. |

**`NEW DATA`.** `failures30d` is a rolling **total** on the zone record (`:13952`+), not a series.
The existing fixture is *all zeroes across the whole range* — deliberately, as the "every value is
a real zero" case (`build/05` §8). Until a daily failed-match count is captured it ships as a flat
line with the all-zero sentence, and never as a shape somebody drew.

**Zone demand by hour is not buildable.** `showZoneHourly(z.name)` exists in legacy;
`SeriesPoint.at` is an `IsoDate` and the type cannot hold an hour. Finding **F-12**. This matters:
supply shortage is a *time-of-day* problem and a daily bucket averages it away.

### 9.3 Breakdowns

| # | Breakdown | Dimension | Top N | Row links to |
|---:|---|---|---|---|
| 1 | **Zones by failure rate, worst first** | zone | all 6 | **Nothing today — F-8.** The row needs `/operations/requests` filtered to a zone, and neither a zone filter nor a zone detail route exists. Row states demand : supply, failure rate, recruitment priority, captains needed. Legacy's worst-first sort is `:14132`. |
| 2 | **Zones by subscription-demand momentum** | zone | 5, growth % descending | same gap as 1. `zoneSubMomentum()` `:14041`–`:14056` counts subscription *requests* by pickup zone, today against the trailing average — *"a recruitment signal even before match failures appear — each of these is a recurring contract, worth far more than a single ride"* (`:14036`–`:14040`). |
| 3 | **Cities & regions health** | city | all 4 | `/management/zones` (itself) for Riyadh; nothing for the three unlaunched. Columns from `:6937`–`:6947`: live, zones, captains, riders, average failure rate. |

**Suspected defect (L-5):** breakdown 2's `priorAvg = m.prior / 2` divides by a hardcoded `2`,
commented *"seeded data spans ~2 prior days"* (`:14051`). The denominator must be the actual
number of prior days in the window, or the growth percentage is wrong the moment the window
changes. Same class of bug as the `/90` at `:11652` that `specs/02-work-queues.md` Q-15 forbids.

**Suspected defect (L-6):** `:6940`–`:6942` computes the per-city average failure rate **only for
Riyadh, by string equality on the city name**. Every other city renders an em-dash forever.

### 9.4 What is deliberately not here

| Excluded | Legacy | Where it lives instead |
|---|---|---|
| Steering-offer creation and the recruitment queue | `:14075`–`:14100` | The sub-tab's `P1` table. Both are actions with a modal and a budget cap. |
| Expansion-ready zones | `:6951` | **Folded into breakdown 1.** It is the same list at a lower threshold (`demand/supply ≥ 2` instead of `≥ 3`) under a more optimistic name. Two lists over one dimension with two thresholds is one list with a threshold column. |
| Capacity grid — captain × morning slot double-booking | `renderCapacityGrid` `:13238` | **Operations › Trip Assurance.** A scheduling conflict per leg is a queue item. |

---

## 10. Operations › Overview

> **The question:** *What must this shift deal with before it ends?*

This is the surface the business owner's example belongs to. `Pending approvals` is on the legacy
dashboard at **`:10374`**, computed at `:10356` as
`DB.pendingDrivers.filter(a => (a.status||'pending') === 'pending').length`, and the current board
does carry it (`operations.overview.pendingApplications`). What it does **not** carry is the half
that decides anything: **how many are past their window.** Two are today — `APP-2204` (due
2026-06-24 13:05, twenty hours ago) and `APP-2205` (due 2026-06-23 16:30) — and the 48-hour
window is now a decision, not a placeholder: `specs/02-work-queues.md` §4.3 ratifies it against
T3 `resolveMin: 2880` (`:14654`) and **closes Q8**.

### 10.1 Tiles

| # | Tile | Definition | Source | Comparison | A bad value is | Drilldown |
|---:|---|---|---|---|---|---|
| 1 | **Applications past their 48-hour window** | Applicants awaiting a decision whose breach stamp is set. | `Applicant.slaBreachedAt`; window ratified in `02-work-queues` §4.3 | none | **Any.** A captain who applied two days ago and has heard nothing applied somewhere else yesterday. | `/operations/people?view=applications`, breached filter — **F-8** |
| 2 | **Applications waiting** | Applicants with status `pending` or `in-review`. | `:10356`, `DB.pendingDrivers` | previous period | Rising through a shift with tile 1 rising behind it. Legacy's tile carries the caption *"Awaiting review"* (`:10374`) — **F-2**. | `/operations/people?view=applications` |
| 3 | **Work items past their SLA** | Breached items across every wave-2 queue: applications, requests, assurance, safety, fairness. | derived, `clients/metrics.ts`; predicate asserted equal to `listWorkItems` in `metrics.test.ts` | none | Any. The one tile that answers *"is anything on fire"* without naming a queue. | `/operations/my-work?view=breached` — **currently `?view=everything`, which is wrong** (AC-658) |
| 4 | **Unclaimed work** | Items routed to a role and in no operator's name. | `clients/myWork.ts`, `unassigned` view | none | Rising across a shift. It says the rota is short before the SLA does. **Missing today** — legacy's `inbox` carries two ownership counters and neither survived. | `/operations/my-work?view=unassigned` |
| 5 | **Legs departing in 24 h with no backup captain** | Assurance trips where the backup is ineligible **or** absent. *Registered but ineligible counts as exposed, because that is what happens in practice* (`:13149`). | `:13150`, `renderCoveragePage`; derived in `clients/metrics.ts` | none | Any. `:13157` prices it: exposed value is remaining contracted value with no protection. | `/operations/assurance?view=no-backup-captain` |
| 6 | **Open requests** | Requests in `searching`, `offered` or `no-drivers`. | derived over the requests fixture | none | Any request past its window — 3 min instant, 90 min subscription (`02-work-queues` §4.3). | `/operations/requests?view=pending` |

**Two more, in that order, if the grid takes eight:**

| # | Tile | Definition | Source | A bad value is | Drilldown |
|---:|---|---|---|---|---|
| 7 | **Compliance documents expired** | Captains whose worst document has already lapsed — off dispatch. | `complianceScan()` `:13296`, `worst === 0` `:13322` | Any, and worse if the captain is still being dispatched. `DRV-0104` is a gold captain with 524 trips on an inspection certificate that expired 2026-06-20. | `/operations/people?view=compliance` |
| 8 | **Captains available now** | Captains not currently on a trip. | `driverLiveState` `:7283`, counted `:10358` | **Below the open-request count.** That comparison — tile 8 against tile 6 — is the supply question, and neither number means much alone. | `/operations/people?view=captains` |

### 10.2 Charts

| Chart | Plots | Bucket | Window | Why a chart rather than a tile | What the operator does differently |
|---|---|---|---|---|---|
| **Trips completed** | completed trips per day | day | 30 days | Volume context for the six backlog tiles above it: eleven breaches on a record day and eleven on a quiet one are different problems. | Staffs the next shift. Weak, and it is the only chart on this board for that reason. |

**The chart that should be here and cannot be: open requests by hour of day.** Shift staffing is
an hourly question and `SeriesPoint.at` is a date. Same finding as §9.2 — **F-12**.

### 10.3 Breakdowns

| # | Breakdown | Dimension | Top N | Row links to |
|---:|---|---|---|---|
| 1 | **Backlog by queue** | queue (Requests · Assurance · Applications · Safety · Fairness) | all 5 | that queue's route. Row states open, breached and unclaimed counts. |

**That is the only breakdown, and it is a routing table rather than a list of records.** It tells
an operator *which screen to open*, which is what an overview owes a shift and what re-listing
rows does not.

### 10.4 What is deliberately not here — the longest exclusion list in this spec, on purpose

| Excluded | Legacy | Where it lives instead |
|---|---|---|
| **Open alerts** — late trips, repeated-lateness deductions, expiring subscriptions, riders at their cancellation cap | `:10360`–`:10369` | **My Work** and the owning queues. Every one now has a claim, a decision and an SLA; a second copy on an overview is stale the moment somebody claims one. |
| **Needs intervention now** | `buildInterventionItems()` `:9450`, rendered `:10442` | **My Work.** This *is* My Work under its old name. |
| **Renewal pipeline — the four nearest expiries with a Renew button** | `:10421`–`:10440` | **Operations › Subscriptions**, `expiring-7d` view. |
| **Today's subscription trips and today's quick-ride exceptions, as tables** | `:10381`–`:10406` | **Operations › Trips**, views `subscription-legs` and `flagged`. |
| **Refunds today** | `:10446` | **Financials › Revenue & Refunds.** |
| Subscription trips today / quick rides today, as tiles | `:10372`–`:10373` | Deleted. Volume, not decisions; the completed-trips chart covers volume. |

**Q-106 — An overview never re-lists queue rows.** A board may state a *count* of a queue and link
to it. It may not render the rows, because the rows carry claim state, and claim state on a
read-only surface is a lie the moment somebody else claims one.

---

## 11. Support › Overview

> **The question:** *Are we answering people inside the time we promised, and what are they
> calling about?*

### 11.1 Tiles

| # | Tile | Definition | Source | Comparison | A bad value is | Drilldown |
|---:|---|---|---|---|---|---|
| 1 | **Unacknowledged critical incidents** | Open incidents of severity `critical` with no protocol step ticked. | `DB.incidents` `:13401`; `INC-014` and `INC-015` today | none | **Any.** `DB.slaPolicy.tiers.T1.firstResponseMin` is `0` (`:14652`) and `02-work-queues` §4.3 raises it to a 5-minute window because zero cannot be displayed or met. This is the one number in the product whose bad value is `1`. | `/support/safety?view=critical-sos` |
| 2 | **Tickets breaching now** | Open tickets where `slaState` reports a breached first-response, resolution or update clock. | `:15017` | none | Any. | `/support/tickets`, breached filter — **F-8** |
| 3 | **Promise kept** | Resolved tickets with no recorded SLA breach, as a share of resolved tickets. | `:15020`–`:15021` | previous period | Below 90 % `[inferred]`. The only tile on this board that measures an *outcome* rather than a backlog, and the one a support lead is judged on. | `/support/tickets` |
| 4 | **Open safety incidents** | Incidents with status `open`. | `:13398` | none | Any older than its severity's resolve window: 4 h critical, 24 h high, 48 h standard (`02-work-queues` §4.3). | `/support/safety?view=open` |
| 5 | **Contacts per 1,000 trips** | Coded contacts ÷ trips × 1,000. | `cptStats()` `:14984`, rendered `:15015` | previous period | Rising. `:15046` frames it exactly: *"Support volume is a product signal, not a staffing input."* | `/support/contact-centre` |
| 6 | **Uncoded contacts** | Contacts with no reason code, as a share of all contacts. | `st.uncodedPct` `:15024` | **target: `DB.slaPolicy.uncodedCeilingPct = 3` (`:14659`)** — a real target with a real source, and one of very few on any board | **Above 3 %.** It gates the breakdown below it: if a tenth of contacts are uncoded, the reason-code ranking is not trustworthy and no product fix should be prioritised from it. | `/support/contact-centre` |
| 7 | **Open fairness cases** | Appeals, rating disputes and rider reports with status `open`. | `:15639` | none | Any past its reason code's target (`rcTargets(code).res`, `:14730`). `FC-0004` is four and a half days past a 24-hour window **with no first response at all**. | `/support/fairness` |
| 8 | **Appeals overturned** | Overturned ÷ decided, as a share. | `:15691` | previous period | **Neither high nor low is straightforwardly bad, and the tile must say so.** `:15709`: *"A high overturn rate on this page is not a failure — it means the appeal route is doing its job and catching bad calls before they cost you a captain."* `higherIsBetter: true` is already set and is correct; the reasoning has nowhere to render (**F-2**). | `/support/fairness?view=suspension-appeals` |

### 11.2 Charts

| Chart | Plots | Bucket | Window | Why a chart rather than a tile | What the operator does differently |
|---|---|---|---|---|---|
| **Contacts per 1,000 trips** | rate per day | day | 30 days | The rate is the product-quality signal; the level means nothing without the slope, because trip volume moves underneath it. | A step change dates the regression, which is what makes the reason-code breakdown actionable. |

**`NEW DATA` for the series.** `cptStats()` computes the rate over the whole contact log at a
point in time (`:14984`); no daily count is captured. The existing fixture has **no points at
all** — deliberately, as the no-data-sentence case (`build/05` §8) — and ships that way, with
§3.7's sentence verbatim.

### 11.3 Breakdowns

| # | Breakdown | Dimension | Top N | Row links to |
|---:|---|---|---|---|
| 1 | **Contact reasons, by contacts per 1,000 trips** | reason code | 5 | `/support/contact-centre` filtered to the reason code — **F-8**, the sub-tab has no views. Row states reason code and label, category, tier, contacts, per-1,000, share, breach rate, **root-cause owner**. |

**This is the most valuable list in the product and it is currently on no rebuilt screen.**
`:15044`–`:15046` says why: *"Read this top-down, not left-to-right: the top row is the contact
you should be trying to eliminate, and the owner column says whose backlog that fix belongs in."*
The `Root-cause owner` column is what makes it act on something — it routes a support symptom to
the team that caused it.

### 11.4 What is deliberately not here

| Excluded | Legacy | Where it lives instead |
|---|---|---|
| **Live SLA exposure** — the breaching and at-risk tickets, listed | `:15048`–`:15060` | **Support › Tickets.** Tile 2 carries the count; the rows carry claims. Q-106. |
| The incident protocol checklists | `:13415`–`:13424` | **Support › Safety**, per incident. |
| Open fairness cases listed with Uphold / Overturn on each row | `:15645`–`:15668` | **Support › Fairness.** A one-click irreversible decision does not belong on an overview (**D8**). |
| Suspended captains and the appeal route | `:15700`–`:15708` | **Support › Fairness**, `suspension-appeals` view. |
| Ratings voided | `:15694` | **Support › Fairness.** A count of a past action with no decision attached. |
| Precautionary suspensions pending investigation | `:13404` | **Operations › People**, compliance view. |

---

## 12. Admin › Overview

> **The question:** *Is the console itself safe, staffed, and inside its statutory obligations?*

**No legacy page contributes wholesale** — the route-table row's `legacyPageIds` is empty and says
so. Every number below is assembled from a function that exists.

### 12.1 Tiles

| # | Tile | Definition | Source | Comparison | A bad value is | Drilldown |
|---:|---|---|---|---|---|---|
| 1 | **Erasure requests past the statutory deadline** | Pending PDPL erasure requests whose due instant has passed. | `:16057`; window `ERASURE_SLA_DAYS = 30` `:15962` | none | **Any.** A statutory clock is the one deadline that is not ours to move, and `fixtures/navCounts.ts` already records that it takes the nav's single `attention` slot the moment it runs out. | `/admin/data` |
| 2 | **On-call rota gaps** | Day × block × tier slots with nobody assigned. 7 days × 3 blocks × 2 tiers = **42 slots**. | `rotaGaps()` `:19650`–`:19662`, `rotaStats()` `:19663`–`:19669` | none | **Any high-risk gap** — night blocks and weekends, which `:19655` already classifies. `DB.onCallSchedule.assign` is seeded `{}` (`:19604`), so **all 42 are gaps today** and nobody is on call at any hour. That is the number this board exists to surface. | `/admin/team`, rota pane |
| 3 | **Operators without two-factor** | Team users with two-factor off. | derived; `:10454` renders the per-row badge | **target 0**, `setByUserId: 'USR-1'` — the only target on any board with an owner | **Any**, and materially worse when the operator holds `process_payouts`. `USR-2` (Finance, 5 permissions, moves money) has it off. | `/admin/team` |
| 4 | **Accounts whose stored totals have no records behind them** | Rider or captain accounts whose billing lifetime totals reconcile to nothing inside the data window. | `integrityScan().orphans` `:18565`–`:18575` | none | **Any.** `:18585`: such an account *"cannot be investigated, refunded accurately, or defended in a dispute — and it is also the signature of a duplicate profile."* | `/admin/data`, integrity pane |
| 5 | **Impersonation sessions in the period** | Audit entries with action `impersonation_started`, less those with a matching `impersonation_ended`. | `:21073`, `:21084` | previous period | Any session with no end. One operator acting as another with no recorded end is the audit trail's blind spot. **`NEW DATA` for the pairing** — legacy logs both events and never joins them. | `/admin/activity` |
| 6 | **Legal documents with unaccepted current versions** | `DB.legalDocuments` entries whose current version a counted set of users has not accepted. | `:13867`; `hasAcceptedCurrent` `:3799` | none | Any, once a version has been published for longer than its grace period. **`NEW DATA` for the grace period** — no such field exists. | `/admin/workspace`, legal pane |
| 7 | **Active operators** | Team users with status `Active`. | derived | none | Not bad; it is a census. Ranked seventh for that reason, and it is the tile I would cut first. | `/admin/team` |

**`Activity events` (1,247) is removed as a headline tile.** A count of log rows measures how busy
the log was, and there is no value of it that changes what anybody does. **What should replace it
is `Destructive actions in the period`** — audit entries whose action key is in a destructive set
(`cancel_subscription`, `reject_driver`, `process_all_payouts`, `history_rebuilt`,
`impersonation_started`). **`NEW DATA`:** `ACTION_LABELS` (`:2898`, 26 entries) carries no severity
classification and one would have to be added. Until it exists, tile 5 is the closest computable
proxy, which is why it ranks above the census.

### 12.2 Charts

| Chart | Plots | Bucket | Window | Why a chart rather than a tile | What the operator does differently |
|---|---|---|---|---|---|
| **Activity events** | audit entries per day | day | 30 days | The count is not a metric (above) but its **shape** is: an off-hours spike is either a busy night or a script, and only the shape distinguishes them. | Compares the spike against the rota (tile 2). If nobody was on call at 02:00 and 300 events landed, that is an incident. |

Kept, with its purpose restated: **this chart is an anomaly detector, not a volume report.**

### 12.3 Breakdowns

| # | Breakdown | Dimension | Top N | Row links to |
|---:|---|---|---|---|
| 1 | **Rota gaps, high-risk first** | day × block × tier | 5 | `/admin/team`, rota pane. Row states day, block label, tier, and whether it is night or weekend. |
| 2 | **Accounts failing the integrity scan** | account | 5, orphans before window-gaps | the account's profile (shell layer). Row states stored versus derived per field, as `:18601` already formats it. |

### 12.4 What is deliberately not here

| Excluded | Legacy | Where it lives instead |
|---|---|---|
| The erasure queue itself, with Execute / Reject per row | `:16045`–`:16072` | **Admin › Data.** A statutory irreversible action does not belong on an overview. |
| The team table with permissions, impersonate and edit | `:10451`+ | **Admin › Team.** |
| The identity-collision list | `:16492` | **Admin › Data**; the cross-role *count* is on Risk (§7.1 tile 4). |
| `Rebuild all history` | `:18596` | **Admin › Data**, behind its existing confirm gate. `:18594` is explicit that it must be *"deliberately manual, not automatic."* |
| The full audit log | `:9322` | **Admin › Activity** (`P1` table). |
| Data-window configuration | `:20403`, `:20500` | **Admin › Data.** |

---

## 13. States

`MetricBoardScreen` already builds the four base states; this section names what each one **says**
on a board, and every domain state the eight boards can be in.

### 13.1 The four

| State | Trigger | What the operator sees |
|---|---|---|
| **Content** | `getMetricBoard` resolved with at least one computable value or one drawable chart | Tiles, then charts, then breakdowns, in that order (§3.7: a tile summarises what a card explains). The `asOf` line states when the board was computed. |
| **Empty** | Every tile `value: null` **and** every chart with zero points | R8 whole-page first-run. A board has no filter, so `no-match` is not representable — `isBoardEmpty` already makes this mechanical. |
| **Loading** | request in flight | `P5` tile-shaped skeleton. Never a spinner (**AC-35**). |
| **Error** | request rejected, or the sub-tab has no board (404) | The **screen** fails; rail, sub-tab column and top bar keep working (**AC-24**). One `Try again`. |

**A board with four real numbers and two `null`s is CONTENT, not empty.** It is a content page
with honest holes in it and must read as one. This is `isBoardEmpty`'s existing rule and it is
load-bearing here, because §4.1 Q-101 deliberately ships `null` tiles.

### 13.2 Domain states

| State | Where it occurs | What the operator sees |
|---|---|---|
| **A metric with no comparison** | 22 tiles today, fewer after §4.2 | Em-dash, never `0 %`, never blank, plus the reason in words: `No comparison period yet` · `No target set` · `Too little data to compare`. |
| **A metric that is not computable** | every `NEW DATA` tile | Em-dash for the value **and** a stated reason. The tile still renders — a hidden tile hides the gap. |
| **A metric that is genuinely zero** | Applications past their window on a good day; unacknowledged criticals on a good day | `0`, reading as a good answer. Never an em-dash. Conflating zero with not-computable is the defect `types/metrics.ts` was written to prevent. |
| **A chart with no points** | Contacts per 1,000 trips today | §3.7's centred sentence, card and title retained: *"There was no data found for this date range."* |
| **A chart whose every value is zero** | Unserved requests today | A flat line on the axis and *"Every value in this range is zero."* **Not** the no-data sentence. |
| **A chart with a gap** | On-time pickups | The line **breaks**; the gap count is stated in words above the plot. A gap drawn as zero is how an outage looks like a collapse in demand. |
| **A stale board** | `asOf` older than the poll interval | The `asOf` line is the only carrier today. **F-13**: no staleness threshold is defined, and a board silently showing yesterday's numbers during an incident is the failure `types/metrics.ts` names. |
| **A target with no owner** | 3 of 4 target comparisons (`setByUserId: null`) | Renders as declared. **M-1** — a target nobody owns drifts, and the tile cannot say who set it. |
| **A tile the role may not see** | every money tile for a Support operator | **Absent**, not disabled. Foundation **AC-60**: destinations and records are absent; §11.2 actions are disabled in place with a reason. A metric is a read, so it is absent. |
| **A board where the role may see no tile** | Admin › Overview for a Support operator | The sub-tab is not in that role's nav at all (§11.2 / D1) and the route resolves to the no-access state. **Blocked on D4.** |
| **A breakdown row whose destination does not exist** | zones, contact reasons, breached filters | **F-8.** Until the routes exist the row is **not a link**. It must not link to an unfiltered list, which is worse than no link because it looks like it worked. |
| **A count that disagrees with its nav badge** | §14 | Both render. The tile's **label states its scope**. AC-720–724. |

---

## 14. Count authority — the `navCounts` cross-check

The wave-2 data layer already caught one of these (13 against 12 on My Work, `build/05` §7.5).
These are the rules, and the collisions that exist today.

**Q-108 — `navCounts` is authoritative for the nav badge. A metric tile is authoritative for the
tile. They are allowed to differ, and where they do the tile's label must state its scope.** A
badge is *work owed in the whole sub-tab* (`02-work-queues` Q-46); a tile is whatever its
definition says. Forcing them equal would break one or the other.

**Q-109 — Where a tile and a badge claim the same predicate, they must derive from the same client
call, and a test must assert it.** `metrics.test.ts` and `navCounts.test.ts` already do this for
five counts; extend it.

| Nav badge | Metric tile | Same? | Ruling |
|---|---|---|---|
| `operations-people` = **7** (5 applications + 2 lapsed documents) | `Applications waiting` = **5** | No, legitimately | Different scopes. The tile is labelled `Applications waiting`, never `People`, and §10.1 tile 7 carries the other 2 separately. **AC-721.** |
| `operations-requests` = **7** | `Open requests` = **7** | Yes | Must share a predicate. Asserted. |
| `support-safety` = **6** | `Open safety incidents` = **6** | Yes | Must share a predicate. Asserted. |
| `support-fairness` = **4** | `Open fairness cases` = **4** | Yes | Must share a predicate. Asserted. |
| `operations-assurance` = **4** | `Legs with no backup captain` = **4** | Yes | Must share a predicate. Asserted. |
| `operations-my-work` = **22** (backlog) | `Work items past their SLA` = **12** (breached) | No, legitimately | Two predicates on one queue. Neither label may say "work items" without a qualifier. **AC-723.** |
| `management-risk` = **6** | `Open signals` = **6** | **Collision** | The tile is **deleted** (§7.1). The badge is authoritative. **AC-720.** |
| `admin-activity` = **1,247** | `Activity events` = **1,247** | **Both wrong** | A log has no backlog: per Q-46 a count is *work owed*, and the Activity Log owes nothing. `admin-activity` should be `count: null`. The tile is also deleted (§12.1). **AC-722.** |
| `management-zones` = **0** | `Zones tracked` = **6** | **Collision of meaning** | The badge is a watchlist of zero; the tile is a census of six. The tile is deleted (§9.1), and the badge should carry **supply-starved zones** (2 today) so it means the same thing as the board's first tile. **AC-724.** |
| `admin-overview` = **2** | — | — | An overview has no backlog of its own; its badge should be the sum of what it points at. **`[inferred]` — I cannot ground what the 2 counts.** Open question **Q-113**. |

---

## 15. Acceptance criteria

### 15.1 Cross-board rules (AC-600 – AC-611)

- **AC-600** Every metric tile rendered on any of the eight boards traces to a named source: a
  legacy line number, a data-layer client, or the marker `NEW DATA`. A tile with a blank source
  register entry does not render.
- **AC-601** A metric marked `NEW DATA` renders an em-dash where its value would be and a visible
  reason, and never renders a number.
- **AC-602** Changing a fixture that a derived tile aggregates changes that tile's displayed value.
  No tile on any board renders a value hardcoded in a component or a copy string.
- **AC-603** A number appears as a metric tile on **exactly one** of the eight boards. Opening all
  eight in sequence, no tile label appears twice.
- **AC-604** Every `previous-period` comparison on a board resolves to a window ending on or before
  the board's `asOf` date. No comparison window starts after the fixed clock's day.
- **AC-605** A tile whose comparison is `none` shows an em-dash and one of exactly three reason
  strings. It never shows `0 %` and never shows a blank where a delta would be.
- **AC-606** A tile whose value is a genuine measured zero shows `0`, not an em-dash, and its delta
  renders normally against its comparison.
- **AC-607** Every tile that names a work backlog carries a drilldown, and following it lands on a
  screen already filtered to the rows the tile counted — the destination's own count matches the
  tile's.
- **AC-608** No board renders a control that mutates a record. Following a drilldown is the only
  interaction a tile offers.
- **AC-609** Every board states, above the tiles, when it was computed, in the operator's language
  and calendar.
- **AC-610** Every chart on every board plots at most two windows — one current, one comparison —
  and the comparison, where present, is distinguished without a second colour.
- **AC-611** A chart whose current window has zero points shows the no-data sentence with card and
  title retained; a chart whose every value is zero shows a flat line and the all-zero sentence.
  The two are never the same string.

### 15.2 Management › Overview (AC-612 – AC-620)

- **AC-612** Overview renders six tiles: contribution margin, gross revenue, active subscriptions,
  net subscription movement, plans keeping the same captain, on-time pickups.
- **AC-613** Contribution margin is lower than gross margin whenever any of promo spend, referral
  bonuses, captain incentives, refunds, goodwill or unrecovered emergency cover is non-zero for the
  period.
- **AC-614** Overview's contribution-margin figure and Financials › Revenue's contribution-margin
  card show the same percentage, to one decimal, for the same period.
- **AC-615** Active subscriptions on Overview equals the row count of
  `/operations/subscriptions?view=active`.
- **AC-616** Net subscription movement is computed from subscriptions started and cancelled **within
  the stated period**. It is not the difference between a current-state active count and a
  cumulative cancelled count.
- **AC-617** Plans keeping the same captain and on-time pickups each show a delta against a 95 %
  target, and each states that the comparison is a target rather than a period.
- **AC-618** Overview renders exactly two charts — quick-ride revenue and subscription revenue —
  each daily over 30 days.
- **AC-619** Overview renders no ranked list and no table.
- **AC-620** Overview renders no escrow figure, no captain-earnings figure and no platform-net
  figure. Each appears on Financials › Overview only.

### 15.3 Management › Performance (AC-621 – AC-627)

- **AC-621** Performance renders four tiles: quick-ride cancellation rate, average renewal rate,
  average captain rating, trips completed.
- **AC-622** Cancellation rate shows a delta against the previous 30 days, and its chart plots the
  same measure at a daily bucket over the same 30 days.
- **AC-623** Average captain rating renders an em-dash when no captain in the dataset has a rating,
  and is never `0`.
- **AC-624** Performance renders two charts: on-time pickups and cancellation rate, both daily,
  both 30 days.
- **AC-625** The on-time-pickups chart draws a break where a day has no reading and states the
  number of days with no reading in words. It never draws a missing day as zero.
- **AC-626** Performance renders two breakdowns: captains by late-trip share (5 rows) and renewal
  rate by plan tier (3 rows).
- **AC-627** Performance renders no CSAT figure, no NPS figure and no cohort matrix.

### 15.4 Management › Risk & Signals (AC-628 – AC-636)

- **AC-628** Risk renders six tiles: revenue at risk, subscriptions predicted to churn, captains at
  risk of unavailability, cross-role identity collisions, captains with repeat incidents, renewal
  payments flagged.
- **AC-629** Risk renders **no** `Open signals` tile. The sub-tab's nav badge is the only place that
  number appears.
- **AC-630** Every tile on Risk carries a drilldown to a queue or an index. No tile on Risk has a
  null drilldown.
- **AC-631** Subscriptions predicted to churn counts only subscriptions with a health score strictly
  below 50, and revenue at risk sums the remaining contracted value of exactly that set.
- **AC-632** The cross-role identity-collision tile counts only collisions where one account is a
  rider and one is a captain. Same-role duplicates are excluded and the label says so.
- **AC-633** Risk renders zero charts, and the board does not render an empty chart region.
- **AC-634** Risk renders three breakdowns: subscriptions by health score ascending (5), high-value
  riders at risk by lifetime value descending (5), captains by risk score ascending (5).
- **AC-635** No row in any Risk breakdown carries an action control. A row's only interaction is its
  link.
- **AC-636** Risk renders no zone-shortage list.

### 15.5 Management › Growth (AC-637 – AC-644)

- **AC-637** Growth renders six tiles: blended promotion ROI, promotion budget consumed,
  subscriptions attributed to promotions, new riders, dormant riders, referral and incentive spend.
- **AC-638** Blended promotion ROI renders as a multiple with one decimal, its bad direction is
  down, and a value below 1.0 is distinguishable from a value above it without reading the number.
- **AC-639** Promotion budget consumed reaching 100 % coincides with every affected campaign showing
  a paused or exhausted status on the sub-tab's table.
- **AC-640** New riders counts riders whose join date falls inside the stated period, and the tile
  states that period.
- **AC-641** The dormant-riders tile is accompanied by its proxy caveat — that dormancy here means
  no recorded trip and no subscription, and is not a measure of app activity. If the tile cannot
  carry the caveat, the tile does not ship. *(Depends on F-2.)*
- **AC-642** Referral and incentive spend equals the sum of the referral-bonus and captain-bonus
  lines that Overview's contribution margin subtracts, for the same period.
- **AC-643** Growth renders one chart: new subscriptions, daily, 30 days.
- **AC-644** Growth renders no ranked list on the board. Campaigns and incentive rules appear only in
  the sub-tab's table, where their row actions live.

### 15.6 Management › Market & Zones (AC-645 – AC-654)

- **AC-645** Zones renders six tiles: captains needed, supply-starved zones, unserved requests,
  average request failure rate, steering offers live, cities live.
- **AC-646** Captains needed equals the sum over zones of `max(0, ceil(demand ÷ 3) − supply)`, and
  equals the sum of the per-zone figures shown in the failure-rate breakdown.
- **AC-647** Supply-starved zones counts zones where demand is at least three times supply, and the
  same zones appear at the top of the failure-rate breakdown.
- **AC-648** A zone with zero supply is counted as starved and its ratio renders as `∞` — not as a
  division error and not as a blank.
- **AC-649** Cities live shows `1` against a target of `4` and states that the comparison is a target.
- **AC-650** Zones renders **no** `Zones tracked` tile.
- **AC-651** Zones renders one chart, unserved requests, daily over 30 days, which currently shows a
  flat zero line and the all-zero sentence rather than the no-data sentence.
- **AC-652** Zones renders three breakdowns: zones by failure rate (all zones, worst first), zones by
  subscription-demand momentum (5), cities & regions health (all cities).
- **AC-653** A breakdown row whose destination route does not exist renders as plain text — not as a
  link, and not as a link to an unfiltered list.
- **AC-654** The subscription-demand momentum figure divides by the actual number of prior days in the
  window. It does not divide by a constant.

### 15.7 Operations › Overview (AC-655 – AC-667)

- **AC-655** Operations Overview renders six tiles in this order of prominence: applications past
  their 48-hour window, applications waiting, work items past their SLA, unclaimed work, legs
  departing in 24 hours with no backup captain, open requests.
- **AC-656** Applications waiting counts applicants whose status is pending or in review, and equals
  the row count of `/operations/people?view=applications`.
- **AC-657** Applications past their window counts only applicants carrying a breach stamp. An
  applicant whose deadline has passed but who was decided inside the window is not counted.
- **AC-658** The work-items-past-their-SLA tile links to `/operations/my-work?view=breached`, and the
  destination's row count equals the tile's value.
- **AC-659** Unclaimed work counts items in no operator's name across every queue, and equals the row
  count of `/operations/my-work?view=unassigned`.
- **AC-660** Legs with no backup captain counts legs whose registered backup is ineligible as well as
  legs with no backup registered, and the label does not say "no backup registered".
- **AC-661** Open requests equals the `operations-requests` nav count.
- **AC-662** Operations Overview renders one chart: trips completed, daily over 30 days.
- **AC-663** Operations Overview renders exactly one breakdown: backlog by queue, one row per wave-2
  queue, each stating open, breached and unclaimed counts and linking to that queue.
- **AC-664** Each row of the backlog-by-queue breakdown states counts equal to that queue's own screen
  for the same predicates.
- **AC-665** Operations Overview renders no individual trip, request, subscription, incident or
  applicant record. No row on this board identifies a person or a trip.
- **AC-666** Operations Overview renders no renewal pipeline, no alerts list and no intervention list.
- **AC-667** With every queue empty, Operations Overview shows six tiles reading `0` and the backlog
  breakdown with five zero rows — not the first-run empty state.

### 15.8 Support › Overview (AC-668 – AC-678)

- **AC-668** Support Overview renders eight tiles, with unacknowledged critical incidents first and
  appeals overturned last.
- **AC-669** Unacknowledged critical incidents counts open incidents of critical severity with no
  protocol step recorded, and links to `/support/safety?view=critical-sos`.
- **AC-670** With both seeded unacknowledged criticals acknowledged, the tile reads `0` and the
  `support-safety` nav badge loses its attention tone in the same refresh.
- **AC-671** Tickets breaching now counts open tickets with any breached clock — first response,
  resolution or update. A ticket resolved late is not counted.
- **AC-672** Promise kept is a share of **resolved** tickets: it reads `100 %` when no ticket has ever
  breached, and an em-dash when no ticket has been resolved.
- **AC-673** Uncoded contacts shows its delta against the 3 % ceiling and states that the comparison is
  a target.
- **AC-674** When uncoded contacts exceeds its ceiling, the contact-reasons breakdown states that its
  ranking is incomplete. *(Depends on F-2 or F-3.)*
- **AC-675** Appeals overturned treats an increase as an improvement, and the board explains why — a
  rising overturn rate means the appeal route is catching bad decisions. If the explanation cannot
  render, the tile does not ship. *(Depends on F-2.)*
- **AC-676** Support Overview renders one chart: contacts per 1,000 trips, daily over 30 days, which
  currently shows the no-data sentence.
- **AC-677** Support Overview renders one breakdown: contact reasons by contacts per 1,000 trips, top
  five, each row stating its root-cause owner.
- **AC-678** Support Overview renders no ticket, incident or fairness-case record, and no Uphold or
  Overturn control.

### 15.9 Admin › Overview (AC-679 – AC-689)

- **AC-679** Admin Overview renders seven tiles, with erasure requests past the statutory deadline
  first and active operators last.
- **AC-680** Erasure requests past the statutory deadline counts pending requests whose 30-day window
  has elapsed, and reads `0` when the queue is empty rather than an em-dash.
- **AC-681** On-call rota gaps counts unassigned day × block × tier slots out of 42, and states how
  many of the gaps fall on a night block or a weekend.
- **AC-682** With the seeded rota, the gaps tile reads 42 of 42.
- **AC-683** Operators without two-factor shows a delta against a target of zero and names the
  operator who set the target.
- **AC-684** Accounts with no records behind their totals counts only accounts whose derived history is
  empty inside the data window. Accounts with older history in billing are excluded and the label
  says so.
- **AC-685** Admin Overview renders **no** `Activity events` tile.
- **AC-686** Admin Overview renders one chart: activity events, daily over 30 days.
- **AC-687** Admin Overview renders two breakdowns: rota gaps high-risk first (5 rows) and accounts
  failing the integrity scan (5 rows, orphans before window gaps).
- **AC-688** No row on Admin Overview offers Execute, Reject, Rebuild, Impersonate, or any permission
  edit.
- **AC-689** Admin Overview is reachable and renders for an operator holding no admin permission —
  showing only the tiles that operator may see, or resolving to the no-access state if that set is
  empty. *(Blocked on D4.)*

### 15.10 Breakdowns as a shape (AC-690 – AC-697)

*Testable only once F-1 is resolved. Stated now so the resolution has a target.*

- **AC-690** A breakdown states its dimension, its ranking and its cut-off in words above the rows — an
  operator can tell "top five zones by failure rate" from "all zones" without counting.
- **AC-691** A breakdown with fewer rows than its cut-off renders all of them, with no padding rows and
  no "and 0 more".
- **AC-692** A breakdown with zero rows renders one grey sentence, not the first-run illustration — it
  is an empty section, not an empty page.
- **AC-693** A breakdown's rows each link to a destination already filtered to that row, or are not
  links at all.
- **AC-694** A breakdown never carries a mutating control on a row.
- **AC-695** A breakdown states the same total as the tile above it when the two measure the same set —
  the sum of the per-zone captains-needed figures equals the captains-needed tile.
- **AC-696** A breakdown truncated at its cut-off says how many rows exist beyond it.
- **AC-697** Every breakdown label and every column heading in a breakdown is a translation key.

### 15.11 States (AC-698 – AC-704)

- **AC-698** A board where some tiles are computable and some are not renders as content, with the
  uncomputable tiles showing em-dashes. It does not render the empty state.
- **AC-699** A board where no tile is computable and no chart has points renders the whole-page
  first-run state.
- **AC-700** A board whose request fails renders the screen-level error with a retry, and the rail,
  sub-tab column and top bar remain operable — the operator can navigate away without reloading.
- **AC-701** The loading state is a tile-shaped skeleton. No board shows a centred spinner.
- **AC-702** Retrying from the error state re-issues the same request and, on success, replaces the
  error with content without a full page reload.
- **AC-703** A tile the current role may not see is absent from the board. It is not rendered greyed,
  blurred or with a lock. *(Blocked on D4.)*
- **AC-704** A board's freshness line renders only in the content state. A board that has not loaded
  makes no freshness claim.

### 15.12 Permissions (AC-705 – AC-712)

- **AC-705** A money-valued tile renders only for an operator holding `view_finance` — gross revenue,
  contribution margin, revenue at risk, promotion spend, referral and incentive spend, exposed value.
- **AC-706** An applications or compliance tile renders only for an operator holding `approve_drivers`.
- **AC-707** A ticket, incident or fairness tile renders only for an operator holding `manage_tickets`.
- **AC-708** A team, rota, two-factor, impersonation or integrity tile renders only for an operator
  holding `manage_team` or `manage_settings`.
- **AC-709** A zones or requests tile renders only for an operator holding `live_ops`.
- **AC-710** Following a drilldown lands an operator on a screen they may see. A tile whose drilldown
  the operator could not open does not render.
- **AC-711** Every board renders identically for two operators holding the same permission set,
  regardless of role name.
- **AC-712** An operator with no permission on a board's whole subject does not have that sub-tab in
  their nav. *(Blocked on D4.)*

### 15.13 Copy and Arabic (AC-713 – AC-719)

- **AC-713** Every operator-facing string on every board is a translation key. No board renders a
  string built by concatenation.
- **AC-714** The no-data sentence is byte-identical on all eight boards, punctuation included.
- **AC-715** No tile label, chart title or breakdown heading contains a number interpolated into a
  sentence fragment. A count and its label are separate.
- **AC-716** Every board renders correctly in Arabic with the chart plot area and its time axis
  unmirrored, while the card, title, legend and report link around it mirror.
- **AC-717** Numerals are Western in both languages, and money renders through the shared money
  formatter in both.
- **AC-718** No tile label, chart title or breakdown heading uses the words `failed`, `invalid` or
  `error`. The zones chart is titled `Unserved requests`.
- **AC-719** A caveat attached to a tile — the dormancy proxy, the overturn-rate explanation, the
  uncoded-ranking warning — is a translation key in the same dictionary as its tile.

### 15.14 Count authority (AC-720 – AC-724)

- **AC-720** `/management/risk` renders no tile whose value equals the `management-risk` nav badge.
- **AC-721** Operations Overview's applications tile and the `operations-people` nav badge may differ,
  and the tile's label names applications specifically rather than people.
- **AC-722** The `admin-activity` nav count is `null`, and no board renders a count of audit-log rows
  as a metric.
- **AC-723** Operations Overview's SLA tile and the `operations-my-work` nav badge may differ, and each
  label states its predicate — breached against backlog.
- **AC-724** The `management-zones` nav count and the first tile on Market & Zones measure the same
  thing, and a test asserts they are equal.

---

## 16. Permissions

Cross-referenced to `docs/01-modules/00c-identity-permissions-and-audit.md` §3.1–§3.4.

**D4 is open and this section is provisional.** It is written against the **five legacy operator
records** that exist today — Owner (13 permissions), Finance (5), Support (3, two users), Ops
Manager (8) — and against the **13 broad permission keys** at `:3225`–`:3239`. It does **not**
assume `Trust & Safety` or `Dispatcher`, and it does **not** assume `manage_settings` has been
split.

### 16.1 Board visibility, provisional

| Board | Owner | Finance | Support | Ops Manager |
|---|---|---|---|---|
| Management › Overview | full | money tiles only (4 of 6) | **no board** | promise tiles only (2 of 6) |
| Management › Performance | full | **no board** | **no board** | full |
| Management › Risk & Signals | full | revenue at risk only | **no board** | all but revenue at risk |
| Management › Growth | full | full | **no board** | **no board** |
| Management › Market & Zones | full | **no board** | **no board** | full |
| Operations › Overview | full | **no board** | **no board** | full |
| Support › Overview | full | **no board** | full | contact tiles only (2 of 8) |
| Admin › Overview | full | **no board** | **no board** | rota gaps only (1 of 7) |

### 16.2 The gate per tile family

| Tile family | Broad key | Legacy gate it inherits (`00c` §3.4) |
|---|---|---|
| Any money value | `view_finance` | `finance` page gate |
| Applications, compliance, captain risk | `approve_drivers` | `drivers`, `compliance`, `safety` page gates |
| Tickets, incidents, fairness, contacts | `manage_tickets` | `support` page gate |
| Subscriptions, churn, renewal, coverage | `manage_subscriptions` | `subscriptions`, `coverage`, `predictive` page gates |
| Zones, requests, live supply | `live_ops` | `zones`, `requests`, `live` page gates |
| Promos, incentives, plans | `manage_plans` | `growth`, `plans` page gates |
| Team, rota, 2FA, impersonation, integrity, erasure | `manage_team` **or** `manage_settings` | `settings` page gate |

### 16.3 Two consequences worth stating plainly

- **A Support operator holds 3 permissions and can see one board.** That is correct — Support
  Overview is the board that answers their question — but four of five workspaces then show them
  nothing, which is a nav decision, not a board decision.
- **Admin › Overview is unreachable for everyone but the Owner** under today's role set, because
  `manage_settings` and `manage_team` are both Owner-only. **The rota-gap tile is the
  counter-example that argues for D4 option 3** (split the settings key): an Ops Manager needs to
  see that nobody is on call tonight, and today cannot.

---

## 17. Findings — what the contract cannot express

Each is a **design decision for product-designer** or a **type change for mock-data-engineer**.
None is resolved here.

| # | Finding | Bites on | Owner |
|---|---|---|---|
| **F-1** | **`MetricBoard` has no breakdown shape.** It carries `metrics[]` and `charts[]` only. Six of the eight boards need a ranked list, and the two most valuable lists in the product — contact reasons with their root-cause owner (`:15026`) and zones with their captains-needed figure (`:14132`) — have nowhere to go. **The largest gap in this spec.** AC-690–697 all depend on it. | Risk, Zones, Performance, Ops, Support, Admin | product-designer, then mock-data-engineer |
| **F-2** | **`Metric` has no caption.** Legacy carries a sub-line on every tile — *"excludes pending applicants"* (`:10374`), *"5 of 12 total"* (`:6916`), *"ceiling 3 %"* (`:15025`) — and three tiles here **cannot ship without one**: the dormancy proxy caveat (AC-641), the overturn-rate explanation (AC-675) and the uncoded-ranking warning (AC-674). | Growth, Support, Ops | product-designer |
| **F-3** | **A board has no banner slot.** `specs/03-financials.md` **AC-351** already requires one ("the trial balance does not balance"); Support needs one for an unacknowledged SOS; Admin for a statutory overdue. R10 says a standing condition is a banner, and a board cannot render one. | Financials, Support, Admin | product-designer |
| **F-4** | **No categorical or composition chart.** §3.7 permits one hue plus its dashed comparison and `globals.css:919` deletes the ramp deliberately. Revenue by plan, promo spend against attributed subscriptions, and contacts by category therefore become breakdowns rather than charts — which is probably correct, and loops back to F-1. | Overview, Growth, Support | product-designer — **confirm the rule rather than change it** |
| **F-5** | **No cohort matrix shape.** Retention cohorts are computable from subscription start dates and status; a cohort × month heat grid has no shape and arguably should not get one. | Performance | product-designer |
| **F-6** | **No survey store.** CSAT and NPS are literals at `:13786`–`:13791` with no backing data. `NEW DATA`. | Performance | mock-data-engineer, after a product decision on whether surveys exist |
| **F-7** | **No board-level period.** `getMetricBoard` documents `from` / `to`; the screen passes neither; `MetricBoard` carries no period. `specs/03-financials.md` **AC-353** requires changing the period to change every tile. Today every tile states its own period and they are not all the same. | all eight | product-designer, with mock-data-engineer |
| **F-8** | **Destinations that do not exist.** Five drilldowns here have no route or no view: a zone-filtered request list, a reason-code-filtered contact list, a breached-applications filter, a breached-tickets filter, an identity-collision view. AC-653 makes the honest fallback explicit — plain text, never a link to an unfiltered list. | Zones, Support, Ops, Risk | route-table owner |
| **F-9** | **Two route-table rows disagree with the code:** `management-zones` is `P1` and serves a board; `financials-overview` is `P5` and 404s. | Zones, Financials | mock-data-engineer |
| **F-10** | **`TimeSeries` has no `drilldownRoute`.** `ChartCard` borrows one from a same-key tile and renders none when the tile is on another board — which Q-104 makes a normal case. One nullable field. | Performance | mock-data-engineer |
| **F-11** | **`management-growth` declares `['P5','P1']` and only the board half is built.** The promo and incentive tables have nowhere to render, which is why §8.3 has no breakdowns. | Growth | frontend-engineer |
| **F-12** | **No sub-daily bucket.** `SeriesPoint.at` is an `IsoDate`. Zone demand by hour (`showZoneHourly`) and requests by hour of day are both time-of-day problems that a daily bucket averages away. | Zones, Ops | product-designer, then mock-data-engineer |
| **F-13** | **No staleness threshold.** `asOf` exists; nothing says when a board is too old to trust. `types/metrics.ts` names the failure — *"is this number from before or after the incident?"* | all eight | product-designer, with engineering |

---

## 18. Findings — current behaviour, suspected defects

Recorded, not silently ported and not silently fixed.

| # | Behaviour | Line | Why it is suspect |
|---|---|---|---|
| **L-1** | The Finance page's seven KPI tiles are **hardcoded strings** — `48,230` gross, `9,246` net, `38,984` payouts, `6,420` pending, `501.98` escrow held, `362.58` ready to release, `65.00` deductions. | `:931`–`:938` | None reacts to the data. `specs/03-financials.md` §5 already deletes rather than migrates them; recorded here because Management › Overview must not inherit the habit (**AC-602**). |
| **L-2** | "Revenue by plan" is four rows of hardcoded HTML whose total contradicts the tiles above it: the tiles say `9,246` Eyvar net, the table says `8,752`. | `:951`–`:958` vs `:932` | Two numbers for one thing on one screen. |
| **L-3** | The net-subscription-trend sentence compares a current-state active count against a cumulative cancelled count. | `:6969`–`:6971` | Different denominators; the comparison is not meaningful. Replaced by §5.1 tile 4. |
| **L-4** | Average renewal rate is a mean of a per-rider stat string parsed with `parseInt`, over active subscriptions, silently dropping riders with no stat. | `:6931` | It is not a renewal outcome measured over a period. Ships labelled; **Q-107**. |
| **L-5** | Zone subscription momentum divides the prior-period count by a hardcoded `2`, commented *"seeded data spans ~2 prior days"*. | `:14051` | Same class as the `/90` at `:11652` that Q-15 forbids. **AC-654**. |
| **L-6** | Cities health computes an average failure rate **only for Riyadh**, by name equality, commented *"this dataset's zones are all within the seed city"*. | `:6940`–`:6942` | Every other city renders an em-dash forever. |
| **L-7** | Dormancy is defined as "no trips and no subscriptions", and the legacy app says so honestly in the UI. | `:6963`–`:6968` | Not a defect — an honest proxy — but the caveat is load-bearing and F-2 means it currently cannot render. |
| **L-8** | `DB.erasureRequests` is seeded **empty**, while the metric fixture and the `admin-data` nav count both carry `1`. | `:15961` | Fixture invention, not a legacy defect. Flagged so it stays a deliberate fixture choice rather than drift. |
| **L-9** | `DB.onCallSchedule.assign` is seeded `{}`. | `:19604` | All 42 rota slots are gaps; nobody is on call at any hour. The seed being honest about an unconfigured console, and **AC-682** locks it in as the expected reading. |
| **L-10** | The exec overview's "predictive" block is a paragraph of prose asserting a business direction, built by concatenation. | `:6969`–`:6978` | Untranslatable by construction, which is why §5.4 deletes it rather than rewording it. |
| **L-11** | Five nav badges are stale until their page is first visited. | `:13406`, `:13159`, and three more (`02-work-queues` Q-48) | On Safety that means an open SOS reads `0` beside the word "Safety" until someone happens to click it. Closed by Q-48; restated because §14 depends on the badges being live. |

---

## 19. Open questions

| # | Question | Who answers | What is blocked until they do |
|---|---|---|---|
| **Q-107** | **Is "average renewal rate" a rate of renewal, or a mean of a stored rider statistic?** Legacy is the latter (`:6931`). The two are different numbers and only one is a metric. | Business owner, with product-owner | Nothing hard-blocks; the tile ships as legacy computes it, labelled. The **label** changes when this is answered. |
| **Q-110** | **What is the healthy threshold for each of the five `[inferred]` bad values?** 10 % of the book predicted to churn, 4.5 average rating, 90 % promise kept, 60 % renewal rate, and the confirmation of legacy's own 25 % dormancy (`:6967`). | Business owner | Nothing hard-blocks — a tile renders without a threshold. But **no tile can say "this is bad"** until each has one, and that is most of what an overview is for. |
| **Q-111** | **Does the business capture, or want to capture, a daily operational snapshot beyond the nine fields?** Four charts here are `NEW DATA` and all four are one added line each in `captureDailySnapshot` (`:7645`): revenue at risk, failed matches, contact count, breached-ticket count. | Engineering lead, with the business owner | Risk's only chart, Zones' chart data, Support's chart. All three ship with their honest empty states until then. |
| **Q-112** | **Is there a survey mechanism at all?** CSAT and NPS are described in prose at `:13793` and implemented nowhere. | Business owner | Performance's quality half. Recorded as F-6. |
| **Q-113** | **What does the `admin-overview` nav count of 2 count?** I could not ground it. An overview has no backlog of its own; if it is the sum of what the board points at, it should be 43-plus today given 42 rota gaps. | mock-data-engineer | **AC-724**'s neighbour. Either it is a sum, or it should be `null`. |
| **Q-114** | **Which of the five Management surfaces would survive a cut to three?** My recommendation is in §6.4: Performance folds into Overview first. I am **not** recommending it today. | Business owner | Nothing. Recorded so the option stays a decision rather than becoming a discovery. |
| **D4** | **The role model.** §16 is provisional against five legacy operator records. | Business owner | **AC-689, AC-703, AC-712.** Every board ships with visibility computed from today's 13 broad keys, and Admin › Overview is Owner-only in the meantime. |
| **Q7** | **Which of the four pricing models is real.** | Finance lead, with the business owner | **Overview's gross-revenue and contribution-margin tiles**, and Growth's ROI tile, in that all three depend on what "revenue" means. `contributionMargin()` (`:15720`) is internally consistent and is what this spec specifies against; if Finance names a different model, those three tiles change and nothing else on the eight boards does. |
| **Q8** | **SLA targets.** | **Closed** by `specs/02-work-queues.md` §4.3. | Nothing. The 48-hour application window is now a decision and **AC-657** rests on it. Note `build/05` §6 still lists Q8-a…e as open; that document predates the closure. |
| **Q1** | **Persistence.** | Engineering lead | Nothing on these eight boards. A board has no view, no filter and no sort to persist — the one place Q1 does not bite. |

---

## 20. Handoff

### To product-designer

Thirteen findings in §17. **F-1 gates the most** — six of the eight boards specify a ranked list
and the contract has no shape for one, and two of those lists (contact reasons with their
root-cause owner, zones with their captains-needed figure) are the most actionable content in this
spec. **F-2** is second: three tiles cannot ship without a caption. **F-3** overlaps a criterion
`specs/03-financials.md` has already written (AC-351).

Decisions that are yours, not mine: whether a breakdown is a card, a list or a small table;
whether a caption is a line, a tooltip or a popover; whether a board gets a banner slot at all, or
whether a standing condition on a board is simply not a thing — which is defensible, and if it is
the answer, AC-674 and AC-351 both need rewriting rather than building.

### To mock-data-engineer

In the order it unblocks things:

1. **Re-anchor `DB.dailySnapshots` to end on `EYVAR_NOW`** (§4.2 item 4). Everything else in §4.2
   depends on it and **AC-604** tests it.
2. **Replace `reason: 'no-history'` with real `previous-period` comparisons** on every metric
   derivable from the nine snapshot fields. Eight of the nine are already in the seed at
   `:13803`–`:13832`; the blanket `no-history` position is now wrong.
3. **Add the missing tiles** named in §5–§12. The largest additions are Operations Overview
   (applications past window, unclaimed work, compliance expired, captains available), Market &
   Zones (captains needed, supply-starved zones, unserved-requests total, steering offers live),
   Support (unacknowledged criticals, tickets breaching, promise kept, uncoded share) and Admin
   (rota gaps, integrity orphans, erasure overdue, impersonations).
4. **Delete four tiles**: `management.risk.openSignals`, `management.zones.trackedZones`,
   `admin.overview.activityEvents`, and move `management.overview.registeredRiders` to Growth.
   Each has an AC (AC-629, AC-650, AC-685, AC-603).
5. **Fix three counts**: `admin-activity` → `null`; `management-zones` → supply-starved zones;
   Operations Overview's SLA drilldown → `?view=breached`.
6. **Two type additions if product-designer accepts them**: `MetricBoard.breakdowns` (F-1) and
   `Metric.caption` (F-2). Plus one field either way: `TimeSeries.drilldownRoute` (F-10).
7. **`financials-overview` needs a board** (F-9b), against `specs/03-financials.md` AC-346–353.

**Every copy key added must land in `src/screens/metrics/copy.ts` in the same change as its seed** —
`createTranslator` throws on a missing key in dev, which is the intended failure mode.

### Blocked, and on whom

| Blocked | On | Owner |
|---|---|---|
| AC-689, AC-703, AC-712 — role-scoped visibility | **D4** | business owner |
| AC-690–697 — every breakdown criterion | **F-1** | product-designer |
| AC-641, AC-674, AC-675 — three tiles that cannot ship without a caption | **F-2** | product-designer |
| Risk's chart, Zones' chart data, Support's chart | **Q-111** — is a daily snapshot captured | engineering lead |
| Performance's quality half | **Q-112** — does a survey mechanism exist | business owner |
| "This value is bad" on five tiles | **Q-110** — the thresholds | business owner |
| Gross revenue, contribution margin, promo ROI | **Q7** | Finance lead |
