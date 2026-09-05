# 05 — Metric board content: what the eight surfaces say

> **Owner:** product-owner. **Artifact for:** product-designer (`design/05-metrics-*.md`),
> mock-data-engineer (`src/data/fixtures/metrics.ts`, `src/data/types/metrics.ts`).
> **Acceptance criteria:** **AC-600 – AC-732**. AC-500s belong to the auth spec being
> written in parallel; nothing here touches them. **The R5 passes append AC-725 – AC-732 and
> renumber nothing** — 725–799 is unclaimed (`06-report-builder.md` opens at AC-800 and says so
> in its own header), and the double-allocated 300–344 band is not touched from here.
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

### 1.1 The one gap this spec cannot close — there is no contact log, and Support › Overview is empty because of it

**Added on the R5 pass, at the top of the document rather than in the findings table, because
burying it is how it stays true.**

The business owner's complaint about these boards is that they look empty. Most of that complaint
is answered by work that is now scheduled: `design/09-rulings-r5.md` **R5-1** stops a measure with
no store from rendering as a tile at all, **R5-8** stops a lone ranked list spanning a full page,
and **R5-5** puts a second number where it can be named. **None of that makes Support › Overview
fuller, and it is honest to say so.** R5-1 §1.5 says it in one line: *"this makes a broken-looking
page an honestly-empty one; it does not make it fuller."*

**Support › Overview is empty because `DB.contacts` is `[]` (`:14718`).** Every contact in the
legacy app is written at runtime by `logContact` (`:14920`), nothing seeds it, and there is no
capture path in the rebuilt data layer at all. One absent store accounts for **all** of the
following on one board:

| What does not render | Why | Where it is specified |
|---|---|---|
| `Contacts per 1,000 trips` — the value | `cptStats()` (`:14984`) has an empty numerator | §11.1 tile 5 |
| `Uncoded contacts` — the value **and** its 3 % target comparison | a share over a zero denominator | §11.1 tile 6, AC-673 |
| `Tickets breaching now`, `Promise kept` | no ticket store in this layer either | §11.1 tiles 2–3 |
| The `Contacts per 1,000 trips` chart — every point | no daily contact count is captured (**Q-111**) | §11.2 |
| **The contact-reasons breakdown — every row** | `cptStats().rows` is empty | §11.3 |

**Second R5 pass — the card now renders and that changes what this section is for.** Under **R5-11**
the breakdown and the chart keep their titles and carry `Nothing is recorded here yet.` **That makes
the gap visible instead of invisible, and visibility is the whole point of the ruling**: a card
reading `Top 5 contact reasons, per 1,000 trips` over one grey sentence is the thing that gets the
log built; an absent card is how a gap stops being asked about. **It is still an empty board.** The
sentence names the gap; it does not close it.

That breakdown is the one this spec calls **the most valuable list in the product** (§11.3), and
The breakdowns build reaches the same conclusion independently from the rendering side: *"a contact log
is the highest-value data capture left, and no amount of layout fixes it."* `DB.reasonCodes`
(`:14690`+) is already a full registry — 26 codes, each with a category, an SLA tier, English and
Arabic labels and a **root-cause owner**. The dimension exists. The volume does not.

> **The gap, with an owner.** **Capture one row per contact, with a reason code.**
> **Owner: the business owner**, for the decision that contacts are logged at all — it is a change
> to how the support team works before it is a change to a schema. **Then the engineering lead**,
> for the capture itself and for the daily count **Q-111** asks about.
> **Blocked until they do:** three tiles, one chart and one breakdown on Support › Overview, and
> the board's own question — *"what are they calling about?"* — which nothing else on the board
> answers. Recorded as **Q-115** in §19 and in the §20 blocked table.

**Nobody should read R5-1, R5-5 or R5-8 as the answer to the owner's complaint about this board.**
They are the answer to it looking broken. This is the answer to it being empty, and it is a data
capture, not a design change.

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
The wave-2 data layer's **M-2** already says so. Under Q-101 they become `value: null` with a reason,
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
| Registered riders | `:6902` | **Growth.** A cumulative census is an acquisition number, not a board number. **See the correction below — this row is a move, and a move fixed nothing.** |

**A move is count-neutral, and this table's last row is the proof — fifth R5 pass.** The principle
above is right: *a cumulative census is an acquisition number, not a board number.* **It was applied
as a relocation**, so Overview went 8 → 7 and Growth went 6 → 7 in one edit. **One board's fix
became another board's defect**, and neither ended on a permitted count (**AC-729**). Applying the
same principle to the *captain* census — Overview's seventh tile, which §5.1 never listed and this
table never reassigned, a gap `src/data/fixtures/metrics.ts:281` records against this spec by name —
would do it a third time.

> **A relocation rule cannot resolve a count problem across a pair of boards. Only a cut can.** The
> question is therefore not *where does a census live* but **does a cumulative census render as a
> tile at all** — one principle, both boards, and it is **Q-D18**.

**And `Active captains` is doubly decided, which is worth separating from the count argument.**
**AC-603** — a number is a metric tile on exactly one of the eight boards, and the board whose role
acts on it keeps it — puts the captain census on **Operations**, whose subject is supply, regardless
of what Q-D18 answers about censuses in general. **The one thing that would be lost by deleting it
is named in the fixture and must not be lost with it:** `metrics.test.ts` asserts the tile equals
`listDrivers({ status: 'active' }).total`, which is what stops the overview and the People table
disagreeing about a number four legacy screens compute independently (`:6903`). **That cross-check
belongs to whichever board keeps the tile — it is not a reason to keep the tile on this one.**

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

**Tile 2, third R5 pass. It has a store and it has no declared population, and the second is the
finding.** R5 §18.5's refined test — *can this measure, as specified, be computed from what exists?*
— puts it outside §11.2's absence arms: `Rider.renewalRatePercent` exists
(`src/data/types/rider.ts:84`) and is populated. **What it does not have is an answer to
"over what?", and four passes over one fixture produced four answers.**

| Population | n | Mean | Standing |
|---|---:|---:|---|
| All rider records | **16** | — | Nobody proposed it, and it is the number `grep -c "id: 'RDR"` returns. Recorded because *"8 of 13"* — mine, and arithmetically right — treats **13** as the rider count when it is the count of records carrying the field |
| Carrying the field, nulls read as zero | 13 | **42.8** | **Forbidden.** `Metric.value`'s own doc names nulls-as-zero as the defect it exists to prevent, and **AC-606** is the criterion. Not a third option |
| Riders with a reading | 8 | **69.5** | Defensible, and it is what `sourceResource: 'riders'` would declare |
| `status === 'subscriber'` with a reading | 6 | **63.3** | **Nameable — see below. Two of the six are a fixture defect** |
| `subscriptionIds` non-empty, with a reading | 4 | **62.0** | Defensible, and the same four riders the row above keeps once its defect is removed |
| With an **active** subscription, with a reading | — | — | Said to need a join `riders.ts` cannot do. **It does not — `Rider.status` is that join, materialised.** Below |

**Seven points of spread across three defensible readings, on a tile that publishes one number.**

**Two corrections to R5 §22.1, and both make its own rule stronger rather than weaker.**

**First: the 6-set is nameable.** §22.1 concludes *"no predicate on that field produces it"* and
infers that the set cannot be named. The predicate is not on `subscriptionIds` — **it is
`Rider.status === 'subscriber'`** (`src/data/types/rider.ts:22`), which yields 7 riders, 6 with a
reading, and 380 ÷ 6 = 63.3. The set was nameable all along; the ruling searched the wrong field
and drew a conclusion about the set from the failure of the search.

**Second, and this is the part worth having: `Rider.status` *is* the active-subscription join, and
§22.2's "uncomputable" row is computable.** The type's own doc says the field is derived in legacy
from `subs.length` (`:6428`), and `fixtures/riders.ts:63` records the case that makes it more than
that: RDR-2087 holds `SUB-0998`, *"one subscription is cancelled, so `subs.length` is still 1 and
the rider is not a subscriber"* — and its `status` is `on-demand`. **So `status` is exactly the
active-subscriber predicate, materialised precisely because the join cannot be done from
`riders.ts`** — which is `types/rider.ts` §8.2's stated reason for modelling it as a server field:
*a derived value computed in three screens produces three answers.*

**And it has drifted from its own definition, which is L-12 and a fixture defect rather than a
population choice.** `RDR-4001` and `RDR-4003` both carry `status: 'subscriber'` with
`subscriptionIds: []` and no comment giving a reason — they are in the *"added rows"* block
(`src/data/fixtures/riders.ts:365`). Remove those two and the subscriber mean is
`(100 + 25 + 93 + 30) ÷ 4` = **62.0**, which is the `subscriptionIds` row exactly.

> **So the 62.0 / 63.3 split is not two legitimate definitions of "subscriber". It is one
> definition and a fixture defect.** The real choice in front of the owner is **two** populations,
> not four: **all riders with a reading (69.5)** or **subscribers (62.0)**. Seven points apart, both
> nameable, both declarable — which is precisely the case **AC-731** exists for.

**Nobody in this exchange has been careless, and that is the argument.** Four careful people, four
populations, because the metric declares none. **A fifth pass produces a fifth number** — this one
did, and then found that one of the four was a defect rather than a definition. **AC-731** is the
rule; **AC-730** is this tile's instance of it.

> **On whichever branch the tile ships:** its declared resource is `riders`; its label names riders
> (or subscribers) rather than nothing; its caption states the base within that population; and its
> drilldown lands on that population — not on `/operations/subscriptions`, which is where it points
> today and which **AC-607** makes wrong for a mean over riders. **The label word is the review
> obligation named under AC-731**, and this section is why: `subscriber` resolves through a field
> that has drifted from its own definition, and no test on AC-731's three mechanical clauses would
> have caught it.

**And one thing no criterion can fix, which belongs beside Q-107 rather than inside a rule.**
`renewalRatePercent` is a stored per-rider percentage whose **own numerator and denominator were
discarded at write time**. So *total renewals ÷ total opportunities* — what an operator reads
"renewal rate" to mean — **is not computable from this field at any population**, and a mean of the
stored percentages gives a rider with one opportunity the same weight as a rider with twenty.
**Three independent routes to being wrong on one percentage:** the ratio is not recoverable, the
population is not declared, and the label names neither. That is **Q-101**'s plausible literal with
three doors into it.

**Q-107 is restated in §19 as a yes/no with its layout consequence attached.** The designer's
recommendation is **No**; it is theirs, it is recorded as theirs, and **this spec does not adopt
it** — what the product claims to measure is the business owner's call. **What this section commits
to is the shape of either answer**, so no criterion waits on it: if **Yes**, AC-730 and AC-731
govern and the tile ships declared; if **No**, the tile has no store for the measure its label names
and leaves the board under §11.2, with §6.4 gaining its row under AC-726.

**Performance's count is downstream of that answer, and the cheapness is worth stating without
letting it decide anything.** Four is not a permitted count (**AC-729**, `4 mod 3` = 1, so `3 + 1`
at the 1280 minimum). **No** lands Performance on three, which is permitted at both widths at no
cost — so **Q-107 is simultaneously a measure question and the cheapest available answer to one
third of V-6**, which is a good reason to put it in the same sitting as Q-D16 and Q-D18 rather than
a reason to prefer one answer. **The order still matters: a grid rule must not decide a measurement
question from behind.** If the tile goes, three is legal as a consequence — not as a motive.

**And a note on the classification generally.** `design/09-rulings-r5.md` §15 says its own sorting
table is *"a claim about that tree"* and that mock-data-engineer should re-derive it rather than
take it on trust. **I re-derived it and I disagree with one number** — the count it leaves on
Support — which is recorded at §11.4 and in `DECISIONS.md` **Q-D16**. The mechanical test I used
is stated once, at §21.4, so the next person can run it rather than re-read this.

### 6.2 Charts

| Chart | Plots | Bucket | Window | Why a chart rather than a tile | What the operator does differently |
|---|---|---|---|---|---|
| **On-time pickups** | share of non-late trips | day | 30 days | Overview carries the *tile*; the decay is only visible as a slope. The existing fixture deliberately carries a **gap in the middle** — a break in the line, never a dip to the axis. | A three-day slide is a dispatch or capacity problem worth acting on today; one bad day is weather. |
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
| 6b | **Registered riders** | Cumulative count of rider records. | `:6902` | previous period | Not bad on its own — a census, and it is here only because §5.4 moved it off Overview as an acquisition number rather than a board number. **Ranked last, and it is the tile I would cut first on this board.** | **Added to this table on the fourth R5 pass.** §5.4 relocated it to Growth and never wrote it into §8.1, so §8.1 listed six while the board rendered seven — **AC-726**'s divergence, on a second board, created by my own relocation note. |
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

**Seventh tile — `Worst demand-to-supply ratio`. Added to this section on the fourth R5 pass.**
Al Narjis runs 14 demand against 2 captains (`:13953`) — **7.0×**. **R4-12 rules on this tile by
name**, so it is content the board carries and §9.1's list of six omitted it: the value is the bare
number, the `×` belongs to the UI, and the operands live in the label. It is also the only
`ratio`-unit tile on any board. Ranked after `Average request failure rate` and before `Cities
live`. **Recorded here because a section that lists six against a board that renders seven is
AC-726's divergence** — the same shape V-6 found on Management › Overview, on a board nobody
checked.

### 9.2 Charts

| Chart | Plots | Bucket | Window | Why a chart rather than a tile | What the operator does differently |
|---|---|---|---|---|---|
| **Unserved requests** | failed matches per day | day | 30 days | A 30-day total cannot distinguish a bad Tuesday from a structural gap, and the two have different remedies. | A spike gets a steering offer; a plateau gets a recruitment drive. Both controls are on this sub-tab's table. |

**`NEW DATA`.** `failures30d` is a rolling **total** on the zone record (`:13952`+), not a series.
The existing fixture is *all zeroes across the whole range* — deliberately, as the "every value is
a real zero" case. Until a daily failed-match count is captured it ships as a flat
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
all** — deliberately, as the no-data-sentence case — and ships that way, with
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

**Absent under R4-11 §11.2 — the store each waits on.** *(Appended on the R5 pass. These tiles do
not render, and **AC-726** requires them to be named here rather than to vanish out of AC-668's
enumeration unannounced.)*

| Tile | Why it does not render | The store it waits on | Returns when |
|---|---|---|---|
| **Tickets breaching now** (§11.1 tile 2) | there is no ticket store in this layer — `:15017` computes it in legacy and nothing in `src/data` holds tickets | a tickets resource. **Tiles name their store in prose here; only cards name it in the contract, because only a card renders a state that depends on it** | the resource exists; the tile's definition, comparison and bad value in §11.1 are unchanged and ship with it |
| **Promise kept** (§11.1 tile 3) | same missing ticket store — `:15020`–`:15021` | a tickets resource | as above. **AC-671 and AC-672 describe a tile that does not render today** and are held against the resource, not against the board |

**Cards, not tiles, and they render — R5-11.** The **contact-reasons breakdown** and the
**contacts-per-1,000-trips chart** both wait on a **contact log** — one row per contact with a
reason code, `DB.contacts` seeded `[]` at `:14718`, plus a daily count for the chart (**Q-111**).
Both keep their titles and carry `Nothing is recorded here yet.`, and both declare the store by
name in the contract — **`contact-log`**. **This table is what licenses them**: R5-11's guard is that a card renders that sentence only where a spec section names the
measure and the store it waits on, so an unnamed measure gets no card and the rule cannot be used to
pad a board.

**Still rendering as tiles, with an em-dash and a stated reason** — these are measured, and today
there is nothing: `Contacts per 1,000 trips` and `Uncoded contacts`, both on `DB.contacts` being
`[]` (§1.1). They are not in the removal table above and must not be removed with it. **The count this leaves
on the board is six, not four** — the derivation and the disagreement it settles are in
`DECISIONS.md` **Q-D16**.

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

**Absent under R4-11 §11.2 — the store each waits on.** *(Appended on the R5 pass, under
**AC-726**.)*

| Tile | Why it does not render | The store it waits on | Returns when |
|---|---|---|---|
| **Accounts whose stored totals have no records behind them** (§12.1 tile 4) | the measure as specified needs payments **keyed by entity** plus a data window, and neither exists. `fixtures/ledger.ts` now holds 115 postings and can produce *a* number under a narrower definition — which is a smaller measure wearing a quotable label, and worse than an absence (R5 §18.5) | **`payments-by-entity`** — postings keyed by account, plus a data window | the measure as specified is computable — **not** when something adjacent is. **§12.3's second breakdown does not go with it: under R5-11 the card renders, keeps its heading and says `Nothing is recorded here yet.`, and this row is what names the store it waits on** |
| **Impersonation sessions in the period** (§12.1 tile 5) | the events are logged (`:21073`, `:21084`); the **join** between start and end is not, so the measure as defined has no store | a paired impersonation record, or a session id on both events | the pairing exists. Logging both halves and never joining them is what makes this a no-store case rather than a no-value one |
| **Legal documents with unaccepted current versions** (§12.1 tile 6) | the grace period the definition depends on is a field that does not exist — `NEW DATA` | a grace-period field on `DB.legalDocuments` (`:13867`) | the field exists |

**This is three of seven, and it leaves four.** At the 4-up breakpoint that is one clean row; **at
the 1280 minimum (D2) it is 3 + 1, which is still the trailing row of one V-6 is about.** The
removal fixes this board at 1440 and does not fix it at the viewport the product guarantees.
Stated so it is not discovered — see `DECISIONS.md` **Q-D16**.

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
| **A metric with a value and no statable comparison** | 22 tiles today, fewer after §4.2 | Em-dash where the delta goes, never `0 %`, never blank, plus the reason in words: `No comparison period yet` · `No target set` · `Too little data to compare`. **Amended on the R5 pass:** the precondition *"with a value"* is new, and it is what keeps this state from claiming the same line as the one below. |
| **A metric that is measured and has no current value** | `Contacts per 1,000 trips`, `Uncoded contacts`, `Average captain rating` | Em-dash for the value, and **in the line where the delta would be**, the reason it is absent — `Not captured yet` (we do not record what this is computed from) or `Nothing to measure yet` (the inputs exist and the calculation has no answer: a rate over a zero denominator, a mean of an empty set). **No caption and no comparison reason on that tile.** AC-601, AC-725. |
| **A measure with no store at all** | `Tickets breaching now`, `Promise kept`, and three on Admin — §12.4 | **Nothing.** Not an em-dash, not a skeleton, not a "coming soon". An em-dash is a claim that the number exists somewhere. **This reverses what this spec said before the R5 pass** — *"the tile still renders, a hidden tile hides the gap"* — and it is reversed by **R4-11 §11.2**, which ruled it a round before this spec was audited and was never applied. The gap is not hidden: it is named in the board's *deliberately not here* table with the store it waits on (AC-726), which is where a reader can act on it. |
| **A metric that is genuinely zero** | Applications past their window on a good day; unacknowledged criticals on a good day | `0`, reading as a good answer. Never an em-dash. Conflating zero with not-computable is the defect `types/metrics.ts` was written to prevent. |
| **A card whose measure has no store** | Support's contact-reasons breakdown and its chart; Admin's integrity breakdown | **The card renders, keeps its title, and carries one grey sentence: `Nothing is recorded here yet.`** No illustration, no action. **A card is not a tile and the asymmetry is the ruling (R5-11): a tile's whole content is its number and a card has a body, so the card can carry the truth without throwing the heading away — and the heading is the only thing on screen naming what is missing.** Guarded: a card renders this only where a spec section names the measure and the store it waits on (§11.4, §12.4), or the rule becomes a licence to pad a board. |
| **A ranking whose trustworthiness is in doubt** | the contact-reasons breakdown, once contacts are logged and more than 3 % are uncoded | A **caveat line** under the heading and above the first row, naming the share, wrapping rather than truncating. It renders only while the condition holds. **Precedence on a card: not-recorded → caveat → rows → cut-off.** A card in the not-recorded state renders neither caveat nor cut-off, because both are claims about a ranking that did not happen. AC-674. |
| **A chart with no points** | a chart whose store exists and whose window is empty | §3.7's centred sentence, card and title retained: *"There was no data found for this date range."* |
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

The wave-2 data layer already caught one of these: 13 against 12 on My Work.
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
- **AC-601** **A metric whose measure has no store does not render as a tile. A metric that is
  measured and has no current value renders an em-dash where its value would be, followed by the
  reason the value is absent, and never renders a number.**
  *(Replacement text applied from `design/09-rulings-r5.md` §12, sourced to **R5-1** and to
  **R4-11 §11.2**, which ruled the split a round earlier. This criterion no longer says
  `NEW DATA`, because `NEW DATA` covers both classes and only one of them renders. **The first
  sentence is made checkable by AC-726**, which requires the absent tile to be named in its
  board's "deliberately not here" table — without that, "has no store" is a claim a QA engineer
  can only settle by reading source. The second sentence's reason is one of exactly two strings —
  §13.2 — and where it renders is **AC-725**.)*
- **AC-602** Changing a fixture that a derived tile aggregates changes that tile's displayed value.
  **No tile on any board renders a value written by hand at any layer — not in a component, not in a
  copy string, and not in the metric seed.** Editing the collection a tile counts changes the number
  the tile shows; if no edit to any collection can change it, the number is a literal and this
  criterion fails.
  *(Amended on the seventh R5 pass, and the amendment is the defect it failed to catch.
  **"A component or a copy string" is an enumeration of two layers, and the literals arrived through
  a third** — `src/data/fixtures/metrics.ts`. **Fourteen tiles satisfied this criterion while being
  exactly what it exists to prevent**, and twelve of them carry a number ported from legacy. **L-1**
  recorded the legacy habit — seven hardcoded KPI strings at `:931`–`:938` — and warned that
  Management › Overview *"must not inherit the habit"*, naming this criterion as the guard. **The
  habit was inherited through the layer the guard does not name.**
  The positive form is deliberate: *changing the collection changes the number* is checkable by
  doing it, while *no value is hardcoded* asks a QA engineer to prove a negative over an open set of
  places a number could be written — which is the same shape as the enumeration that failed. See
  **AC-732** for how such a tile is then sorted, and §21.4 for the sort itself.)*
- **AC-603** A number appears as a metric tile on **exactly one** of the eight boards. Opening all
  eight in sequence, no tile label appears twice.
- **AC-604** Every `previous-period` comparison on a board resolves to a window ending on or before
  the board's `asOf` date. No comparison window starts after the fixed clock's day.
- **AC-605** **A tile that shows a value and cannot state a delta shows an em-dash where the delta
  would be, never `0 %` and never a blank. Where the comparison is `none`, the em-dash is followed
  by one of exactly three reason strings. Where the comparison is a `target` the value cannot be
  expressed as a percentage of, the em-dash is followed by the target itself. In both cases the
  absence is announced to a screen reader, not only drawn.**
  *(Replacement text applied from **R5-2**, with one precondition added — see §21.2. The third
  sentence is **V-8** and is deliberately not trimmed: the `none` branch already announces itself,
  because its reason string is visible text; the `target` branch draws an em-dash with nothing
  replacing it and needs a screen-reader companion. **This criterion is an absence criterion under
  `DECISIONS.md` PRACTICE** — it fails if `0 %` or a blank appears, which is the direction that
  keeps the gap from being closed by whoever meets it next.)*
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

- **AC-612** **Management › Overview renders exactly the tiles listed in §5.1 and no others. The
  count is stated in §5.1 and is not restated here.**
  *(Replacement text applied from **R5-1 / V-6**, reshaped — see §21.2. The designer's draft read
  "the tiles enumerated below", which has no referent inside a criteria list; the enumeration is a
  section and the criterion now names it. **The count moves out of the criterion on purpose**:
  R4-11 §11.2 removes tiles as stores are found to be missing, and a hand-typed number above a
  table that can change is the exact drift `design/09-rulings-r5.md` §13.1 corrected in the
  designer's own §6.6.4. **AC-726** forbids the table changing silently.)*
  **§5.1 lists six tiles. `src/data/fixtures/metrics.ts:257` seeds a seventh,
  `management.overview.activeCaptains`, which §5.1 does not list and no amendment in `specs/`,
  `design/` or `DECISIONS.md` adds.** Which of the two is wrong is **Q-D18** in `DECISIONS.md` and is
  the business owner's; my recommendation is recorded there. *(Was Q-D17 — **retired into Q-D18 on
  the fifth R5 pass**, because the seventh tile is the captain census and a census is a question
  about a **pair** of boards, not this one. §5.4.)* Until it is answered this
  criterion is checkable and §5.1 is the thing it checks against.
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

- **AC-621** **Performance renders exactly the tiles listed in §6.1 and no others.** *(Amended on
  the R5 pass under **AC-726**. The literal "four" is withdrawn: **R4-11 §11.3** already removed
  the two literal-backed tiles. `Average renewal rate` was unsorted on the first pass and is
  **settled on the second — it is a derivation and it stays** (§6.1). A count in a criterion that a
  ruling can change is a count that goes stale silently. **§6.1 lists four and AC-729 does not
  permit four**; that is a content decision, it is named at §21.6, and this criterion does not
  settle it.)*
- **AC-622** Cancellation rate shows a delta against the previous 30 days, and its chart plots the
  same measure at a daily bucket over the same 30 days.
- **AC-623** Average captain rating renders an em-dash when no captain in the dataset has a rating,
  and is never `0`. **The em-dash is followed by `Nothing to measure yet` — a mean over an empty
  set is `not-computable`, not `not-captured`, and the drivers store this tile reads exists.**
  *(Amended on the R5 pass. **R5-1** makes an unexplained em-dash in the value slot illegal; this
  criterion required one and named no reason. Not routed by `design/09-rulings-r5.md` §12 — §21.3.)*
- **AC-624** Performance renders two charts: on-time pickups and cancellation rate, both daily,
  both 30 days.
- **AC-625** The on-time-pickups chart draws a break where a day has no reading and states the
  number of days with no reading in words. It never draws a missing day as zero.
- **AC-626** Performance renders two breakdowns: captains by late-trip share (5 rows) and renewal
  rate by plan tier (3 rows).
- **AC-627** Performance renders no CSAT figure, no NPS figure and no cohort matrix.

### 15.4 Management › Risk & Signals (AC-628 – AC-636)

- **AC-628** **Risk renders exactly the tiles listed in §7.1 and no others.** *(Amended on the R5
  pass under **AC-726**. §7.1 lists six today and none of them is sorted out by §11.2's test; the
  literal is withdrawn anyway, because the criterion must not go stale if one ever is.)*
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

- **AC-637** **Growth renders exactly the tiles listed in §8.1 and no others.** *(Amended on the
  R5 pass under **AC-726**.)*
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

- **AC-645** **Zones renders exactly the tiles listed in §9.1 and no others.** *(Amended on the R5
  pass under **AC-726**. `design/09-rulings-r5.md` §13.1 corrects R4-6b §6.6.4 from "four tiles" to
  **five** — `captainsNeeded`, `starvedZones`, `unservedRequests30d`, `avgFailureRate`,
  `worstDemandSupplyRatio` — all five derived from the zone table's own rows. §9.1's sixth,
  `cities live`, is not zone-derived and is not covered by that correction.)*
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

- **AC-655** **Operations Overview renders exactly the tiles listed in §10.1 and no others, in
  that order of prominence — the six ranked first, then compliance documents expired, then captains
  available now.** *(Amended on the R5 pass under **AC-726**, and this one is a resolution rather
  than a deferral. §10.1 offered tiles 7 and 8 conditionally — *"two more, in that order, if the
  grid takes eight"* — and left the condition for someone else to meet; the fixture took all eight
  and this criterion still said six. **The grid takes eight**: eight tiles are 4 + 4 at the 4-up
  breakpoint and 3 + 3 + 2 at 3-up, so neither arrangement ends in a row of one. That is a content
  ranking, which is mine, and it is decided here. This is **V-6's shape on a second board** and the
  visual audit found it only on Management.)*
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
- **AC-663** Operations Overview renders exactly one breakdown: backlog by queue, one row per
  wave-2 queue, linking to that queue, **and carrying no bar — the list is ordered breached-first
  and the number is the open count, which AC-728 forbids drawing as a bar. It loses nothing: the
  fixture's own description is right that this is a routing table rather than a list of records, and
  nobody compares magnitudes on a routing table; they pick the next screen.** **Each row states its
  open count as the row's one number and
  its breached count as a phrase in the sub-label that names what it counts — `3 past their SLA`.
  The unclaimed count is not stated on the row; it is stated by the `Unclaimed work` tile above.**
  *(Amended on the R5 pass. **R5-5** withdraws the secondary numeric column, so a row carries one
  number plus at most two facts in its sub-label — three counts per row are no longer
  representable. `design/09-rulings-r5.md` §11.4 already ships the sub-label this criterion needs
  (`breakdown.sub.queuePastSla` = `{past} past their SLA`) and drops the unclaimed count without
  saying which criterion required it. **This one did.** §21.3.)*
- **AC-664** Each count a row of the backlog-by-queue breakdown states equals that queue's own
  screen for the same predicate: the row's number equals the queue's open count, and its sub-label
  figure equals the queue's breached count. **The unclaimed cross-check moves to the tile** — the
  `Unclaimed work` tile equals the row count of `/operations/my-work?view=unassigned` (AC-659), and
  that is now the only place it is asserted. *(Amended on the R5 pass, consequence of AC-663.)*
- **AC-665** Operations Overview renders no individual trip, request, subscription, incident or
  applicant record. No row on this board identifies a person or a trip.
- **AC-666** Operations Overview renders no renewal pipeline, no alerts list and no intervention list.
- **AC-667** With every queue empty, Operations Overview shows six tiles reading `0` and the backlog
  breakdown with five zero rows — not the first-run empty state.

### 15.8 Support › Overview (AC-668 – AC-678)

- **AC-668** **Support Overview renders exactly the tiles listed in §11.1 and no others, with
  unacknowledged critical incidents first and appeals overturned last.** *(Amended on the R5 pass
  under **AC-726**. The literal "eight" is withdrawn because **R4-11 §11.2** removes tiles from
  this board and the exact number is **Q-D16**, the business owner's — recorded in `DECISIONS.md`
  with my recommendation and my re-derivation of the count. §11.4 gains a row per removed tile.)*
- **AC-669** Unacknowledged critical incidents counts open incidents of critical severity with no
  protocol step recorded, and links to `/support/safety?view=critical-sos`.
- **AC-670** With both seeded unacknowledged criticals acknowledged, the tile reads `0` and the
  `support-safety` nav badge loses its attention tone in the same refresh.
- **AC-671** Tickets breaching now counts open tickets with any breached clock — first response,
  resolution or update. A ticket resolved late is not counted.
- **AC-672** Promise kept is a share of **resolved** tickets: it reads `100 %` when no ticket has ever
  breached, and an em-dash when no ticket has been resolved.
- **AC-673** Uncoded contacts shows its delta against the 3 % ceiling and states that the comparison
  is a target — **whenever the tile has a value. While the value is absent the tile states only why
  the value is absent: no delta, no target phrase and no caption, because a tile carries one
  explanation and the more important one is the missing number.** *(Amended on the R5 pass.
  **R5-1 §1.3** gives the absence reason the delta line and suppresses `comparison.reason` and the
  caption with it; this criterion required the target phrase unconditionally, and on today's data
  — `DB.contacts` is `[]`, §1.1 — the value is absent, so the two directly collided. Not routed by
  `design/09-rulings-r5.md` §12 — §21.3.)*
- **AC-674** When uncoded contacts exceeds its 3 % ceiling, the contact-reasons breakdown states
  that its ranking is incomplete, **in a caveat line directly under the heading and above the first
  row. The line names the share, wraps to as many lines as it needs, and never truncates. It renders
  only while the condition holds, and the condition is the value of a named metric on the same
  board — not a threshold restated on the breakdown.**
  **A caveat never states a status, a value, a delta, an action, a link, the cut-off, or a permanent
  property of the list — a permanent property is what the heading is for — and it never states a
  general uncertainty: a caveat that cannot name the number that raises it and the number that
  clears it is a disclaimer, and a disclaimer on a ranking is a sign the ranking should not ship.**
  **Where the gating metric has no value, no caveat renders and the card is in its not-recorded
  state (AC-677) instead.**
  *(~~Depends on F-2 or F-3.~~ **F-14 closed by R5-9**, and R5-9 **corrected** on the third R5 pass —
  the correction is the reason this criterion is worth re-reading rather than skimming. My first
  version of it carried the guard as prose: *a caveat exists only where a criterion names the
  condition and the threshold.* **A rule stated once in a document nobody opens at fixture-writing
  time is not a guard, it is a hope** — the identical mistake §4.2 made, twelve sections earlier in
  the same ruling. The corrected form does two things instead. **It lists what a caveat may not
  say**, so a fixture author can tell a legal caveat from an illegal one without finding a
  criterion. **And it points at the number rather than copying it:** the caveat names the metric on
  the same board whose value raises it, and that metric's own `value` and `comparison` are the
  condition and the threshold — a second copy of a threshold is a second thing to drift. That is
  R4-4 §4.3's own test one level down: *a notice may only exist for a condition the board already
  shows a number for.* **The position is still the ruling** — §11.1 tile 6 says the uncoded tile
  *gates* this list, and a gate after the thing it gates is not a gate. **The wrap is still the
  deliberate opposite of the caption's truncation**, because a truncated caveat still looks
  authoritative. And the last clause is now arithmetic rather than argument: with no contacts, the
  gating metric has no value, so the condition has no answer and nothing fires.)*
  **Recorded, not claimed: this caveat has never rendered on real data.** Its gating metric —
  `support.overview.uncodedContactShare` — has no value, so the arithmetic above resolves the caveat
  to nothing, and every test of the slot uses a constructed fixture. **It is a state with no worked
  instance**, on the same footing as `Nothing to rank for this period.` under AC-714. Naming it is
  what stops the next reader assuming the slot is exercised, which is the false-✓ failure
  `DECISIONS.md` *PRACTICE* records — and it is a live example of AC-731's point that a criterion
  can pass every mechanical check while the thing it governs has never been seen.
- **AC-675** Appeals overturned treats an increase as an improvement, and the board explains why — a
  rising overturn rate means the appeal route is catching bad decisions. If the explanation cannot
  render, the tile does not ship. *(Depends on F-2.)*
- **AC-676** Support Overview renders one chart: contacts per 1,000 trips, daily over 30 days.
  **While no daily contact count is captured, the chart renders with its title and the sentence
  `Nothing is recorded here yet.` — not the no-data sentence, which claims a query ran and returned
  nothing.** *(Amended on the second R5 pass under **R5-11**. **Q-111** is the capture question.
  AC-714 distinguishes the three sentences.)*
- **AC-677** Support Overview renders one breakdown: contact reasons by contacts per 1,000 trips,
  top five, each row stating its root-cause owner. **While no contact is logged, the card renders
  with its heading intact and the sentence `Nothing is recorded here yet.`, and §11.4 names the
  store it waits on.** *(Amended on the second R5 pass under **R5-11**, and this is the instance the
  rule was written for. §1.1 is why: the heading `Top 5 contact reasons, per 1,000 trips` over one
  grey sentence is what gets the contact log built; an absent card is not. **It is not AC-692's
  state** — the dimension is a full 26-code registry (`:14690`+) and the volume is zero, which is
  `Nothing is recorded here yet.`, never `Nothing to rank for this period.`)*
- **AC-678** Support Overview renders no ticket, incident or fairness-case record, and no Uphold or
  Overturn control.

### 15.9 Admin › Overview (AC-679 – AC-689)

- **AC-679** **Admin Overview renders exactly the tiles listed in §12.1 and no others, with erasure
  requests past the statutory deadline first and active operators last.** *(Amended on the R5 pass
  under **AC-726**. The literal "seven" is withdrawn for the same reason as AC-668: §11.2 removes
  three tiles from this board — §12.4 names them and the store each waits on. **Neither AC-668 nor
  AC-679 was routed by `design/09-rulings-r5.md` §12, and both count tiles the ruling deletes.**
  §21.3.)*
- **AC-680** Erasure requests past the statutory deadline counts pending requests whose 30-day window
  has elapsed, and reads `0` when the queue is empty rather than an em-dash.
- **AC-681** On-call rota gaps counts unassigned day × block × tier slots out of 42, and states how
  many of the gaps fall on a night block or a weekend.
- **AC-682** With the seeded rota, the gaps tile reads 42 of 42.
- **AC-683** Operators without two-factor **shows an em-dash where the delta would be, followed by
  the target itself — `vs 0 target` — and announces that absence to a screen reader (AC-605)**, and
  names the operator who set the target. **A non-zero value against a target of zero has no
  percentage and the tile never renders one.** *(Amended on the R5 pass. This tile is **R5-2**'s own
  worked example — `comparison: { kind: 'target', value: 0 }` with `deltaPercent === null` — and
  R5-2 rewrote AC-605 to govern it while leaving AC-683, which asserts the delta this board cannot
  compute. Not routed by `design/09-rulings-r5.md` §12 — §21.3.)*
- **AC-684** Accounts with no records behind their totals counts only accounts whose derived history is
  empty inside the data window. Accounts with older history in billing are excluded and the label
  says so.
- **AC-685** Admin Overview renders **no** `Activity events` tile.
- **AC-686** Admin Overview renders one chart: activity events, daily over 30 days.
- **AC-687** Admin Overview renders **exactly the breakdowns listed in §12.3 and no others**. Rota
  gaps rank **by day**, all seven days, high-risk count stated in the sub-label; the accounts
  failing the integrity scan **render as a card with their heading intact and one grey sentence in
  the body — `Nothing is recorded here yet.` — and §12.4 names the measure and the store it waits
  on.** The card renders **because** §12.4 names it; a measure no spec section names gets no card.
  *(Amended on the R5 pass, and it changes on two counts. **The dimension:** §12.3 asked for
  day × block × tier over five rows, and a slot-level list is not rankable — every row's value is
  the same `0`, so the ranking would be alphabetical. By day it ranks, and the seven rows of six sum
  to the 42 the tile reports, which is AC-695. **The absence, and it reverses on the second R5 pass.** The
  tile does not render under **R4-11 §11.2**, and I first wrote that a breakdown of the same rows
  could not render either. **R5-11 rules the opposite and its reasoning is better than mine: a tile
  has no body and a card does.** A tile's whole content is its number, so there is nowhere to put a
  sentence; a card has a heading that names the measure truthfully whether or not the data exists,
  and **deleting the card deletes the heading, which is the only thing on screen naming what is
  missing.** **F-15 is closed by R5-11.** The grounds for removing the *tile* also moved: R5 §18.5
  records that `fixtures/ledger.ts` now exists with 115 postings, so *"no rows exist anywhere"* is
  no longer true, and the refined test is **can the measure as specified be computed** — a narrower
  reconciliation under the same label is a smaller measure wearing a quotable name, which is worse
  than an absence because an absence is not quotable. Not routed by §12 — §21.3.)*
- **AC-688** No row on Admin Overview offers Execute, Reject, Rebuild, Impersonate, or any permission
  edit.
- **AC-689** Admin Overview is reachable and renders for an operator holding no admin permission —
  showing only the tiles that operator may see, or resolving to the no-access state if that set is
  empty. *(Blocked on D4.)*

### 15.10 Breakdowns as a shape (AC-690 – AC-697)

*~~Testable only once F-1 is resolved.~~* **F-1 is resolved and these are testable — R5 pass.**
`design/07-rulings-r4.md` §4.1 minted the breakdown's anatomy and `design/09-rulings-r5.md` §9.1
amends it. **Read AC-727 and AC-728 with this group**; they are appended at §15.15 rather than
inserted here, because 690–697 is a closed range other documents cite by number.

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
- **AC-697** **Every breakdown heading, sub-label and cut-off line is a translation key. A row
  label is either a translation key or an entity name carried as data. Switching the console to
  Arabic translates every row label drawn from a closed set — a rota day, a queue, a plan tier, a
  reason code — and leaves every entity name that has no localised field on its own record — a
  person's name — character-for-character unchanged. An entity whose record carries a localised name
  renders that name, and is still not routed through the copy dictionary. No key in the metrics
  dictionary has an English string consisting solely of a parameter.**
  *(Replacement text applied from **R5-7**, reshaped in its second half — see §21.2. The
  designer's draft said the two kinds are *"distinguishable in the type"*, which a QA engineer can
  only check by opening `src/data/types/metrics.ts`; the observable that the type exists to produce
  is the language switch, and that is what this criterion now asserts. **The localised-name clause is
  a correction from R5 §18.9, and it is a correction to me**: as first written this criterion said
  *every* entity name is unchanged, which is true of `Abdulaziz Al-Suwailem` and false of `Riyadh` —
  `DB.reasonCodes` carries an English and an Arabic label per code — so it would have failed
  correctly-built code. **A criterion that fails good code is worse than one that passes bad code,
  because it gets suppressed and then it gets ignored.** AC-713's carve-out is unchanged and was
  correctly scoped: the test is *never routed through the dictionary*, and a localised record name
  comes from the record, not from `copy.ts`. "Column heading" is dropped
  from the first sentence because **R5-5** withdraws the secondary numeric column and a breakdown
  has no column headings left to translate.)*

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

- **AC-713** Every operator-facing string on every board is a translation key, **except an entity
  name — a person, a city, a subscription — which is data, is carried as data, and is never routed
  through the dictionary in either language.** No board renders a string built by concatenation, at
  any layer.
  **Where each half of a string is produced is part of the rule, not an implementation detail. The
  fixture carries the raw value and never a formatted one. The dictionary carries the pattern with
  its named parameters. The render layer — the only one that knows the operator's language —
  substitutes and formats.** A fixture that ships `45%` or `1,240` has frozen a rendering decision
  into data; a component that joins a number to a word has taken one the dictionary owns.
  *(Amended on the R5 pass, and the layer clause added on the fifth. **The carve-out is what makes
  AC-697's replacement possible**, and nothing in `design/09-rulings-r5.md` names it: as AC-713
  stood, an entity name carried as data broke it — which is precisely why `breakdown.row.entity` was
  minted as a pass-through key whose whole English string is `{name}`. Amending AC-697 without
  amending AC-713 puts that fig leaf straight back. §21.3.
  **The layer clause replaces an earlier version of this criterion that required parameters to
  arrive already formatted, and the correction runs the other way from how it was first argued.**
  The reason first given for formatting early was Arabic-Indic digits; **that reason does not
  survive, because AC-717 already forecloses them** — numerals are Western in both languages, so the
  divergence it guarded against never arrives. **The reason that holds is structural: a fixture
  never knows the language.** A value formatted before the language is known is frozen in one
  locale, while grouping separators and percent-sign placement are decided at render time in the
  layer that holds it. **A rule that names no layer will be applied at the wrong one**, and this one
  named none.)*
- **AC-714** **Each of the three empty sentences is byte-identical wherever it renders, punctuation
  included, and no two of them stand for the same situation: `There was no data found for this date
  range.` (a query ran and returned nothing) · `Nothing to rank for this period.` (a ranking ran and
  had nothing to rank) · `Nothing is recorded here yet.` (nothing is captured, so neither a query
  nor a ranking is possible).** *(Amended on the second R5 pass. **R5-11** adds the third and says
  why the distinction is load-bearing: conflating any two is the V-2 defect arriving in a new slot —
  the reader cannot tell "we looked and found none" from "we have never looked". **Recorded, not
  claimed: `Nothing to rank for this period.` has no fixture that reaches it once AC-677 moves to
  the third sentence.** A state with no worked instance is named as one rather than assumed
  covered.)*
- **AC-715** No tile label, chart title or breakdown heading contains a number interpolated into a
  sentence fragment. A count and its label are separate. **A breakdown sub-label is deliberately
  outside this rule and is the one slot where a number is interpolated into a phrase** — `4 of 20
  trips ran late` — because a second number that is not named is worse than one inside a sentence.
  *(Amended on the R5 pass. **R5-5** makes the interpolated sub-label the standard construction on
  every ranked list in the product; AC-715's enumeration never covered sub-labels, so no rule was
  broken — but the boundary was accidental and is now load-bearing, and an accidental boundary is
  one an engineer talks themselves across. §21.3.)*
- **AC-716** Every board renders correctly in Arabic with the chart plot area and its time axis
  unmirrored, while the card, title, legend and report link around it mirror.
  **A claim of Arabic correctness states which of two things it checked: *direction* — the tree
  under `dir="rtl"`, mirroring, isolation and truncation side — or *translated text*, the rendered
  Arabic strings and what they do to length and line count. Until an `AR` dictionary exists only
  the first is checkable, and a report that says "verified in Arabic" without saying which has
  claimed the half nobody can run.**
  *(Added on the fifth R5 pass. Every RTL result in the R5 cycle — **V-4**'s head-truncated Latin
  name, **V-9**'s `<bdi>`-less sub-label, R5-7's direction split — is a **direction** finding taken
  against English strings in a mirrored tree. That is a real result and it is half the obligation.
  The other half is what a 38-character caption budget and a wrapping caveat do at 13px in Arabic,
  and **R5-4 already says the fit check is per string and not per rule.** Naming the two apart is
  what keeps the second from being counted as done when the first passes.)*
- **AC-717** Numerals are Western in both languages, and money renders through the shared money
  formatter in both.
- **AC-718** No tile label, chart title or breakdown heading uses the words `failed`, `invalid` or
  `error`. The zones chart is titled `Unserved requests`.
- **AC-719** **A caveat attached to a tile — the dormancy proxy, the overturn-rate explanation —
  is a translation key in the same dictionary as its tile, carried in the tile's caption.**
  *(Replacement text applied from **R5-4**, with one of its three named instances removed from
  scope — see §21.2. R5-4 amended R4-4 §4.2 so that a caption may state* the direction that counts
  as good, *which makes* `Of decided appeals. Higher is better.` *legal and gives the overturn
  caveat the slot it never had. The caption and the caveat are the same slot and there is no second
  one to go looking for.* **The uncoded-ranking warning is not covered and is re-routed**: AC-674
  attaches it to the **breakdown**, not to the tile, and §4.1 gives a breakdown row a heading, a
  label, a sub-label, a value, a bar and a cut-off line — no caveat slot. It is also the one caveat
  that must render **while its tile's value is absent**, which R5-1 forbids a caption from doing.
  Raised as **F-14**.)*

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

### 15.15 The absent value, the vanishing tile, the row's one number, the board's tile count, the declared population and the seeded literal (AC-725 – AC-732)

*Appended across the three R5 passes — AC-725 – AC-728 on the first, AC-729 – AC-730 on the second,
AC-731 on the third.
Each makes an obligation created by `design/09-rulings-r5.md` checkable by someone who is not
holding that document.*

- **AC-725** On a tile whose value is absent, the reason the value is absent occupies the line
  where a delta would otherwise be, and it is the only sentence on the tile: the caption does not
  render, and the reason the *comparison* is absent does not render. An operator reading the tile
  is told once why there is no number, and is not also told why there is no change to a number
  that does not exist.
- **AC-726** **A board's rendered tiles and the tiles its section enumerates are the same set, and
  a tile that stops rendering is named in that board's** *deliberately not here* **table with the
  store it waits on.** No board's tile count changes without the enumeration changing in the same
  edit. **The same table governs cards: every breakdown and every chart rendering
  `Nothing is recorded here yet.` names, in that table, the store it is waiting on — and no store a
  card can wait on exists without a table entry.** *(Added on the third R5 pass, routed by R5 §19.4.
  The card's awaited store is a **named, closed** value in the contract rather than a boolean or a
  free string, which is what turns §18.3's guard from something a reviewer must remember into
  something a card cannot be written without. A free string here would be `''` or `'TODO'` — which
  is `breakdown.row.entity`'s failure mode, and re-creating it two rulings after deleting it would
  have learnt nothing.)* *(This closes the hole **R4-11 §11.2** left open and `design/09-rulings-r5.md` §1.2
  addendum names: §11.2 said what the tile does and never said what happens to the criterion that
  counted it. A tile that vanishes silently makes a board's own criterion wrong, which is **V-6**'s
  shape arriving from a second direction. **The answer taken here is "stop counting":** eight
  criteria carried a literal tile count and now point at the section that holds the enumeration —
  AC-612, AC-621, AC-628, AC-637, AC-645, AC-655, AC-668, AC-679. **A criterion that tolerates
  removals silently is not an option**, because then nobody notices a board losing a tile it should
  have kept.)*
- **AC-727** A breakdown row shows **one** number. A second numeric fact appears inside the row's
  sub-label as a phrase that names what it counts — `63 trips`, `3 past their SLA`, `4 of 20 trips
  ran late` — and never as a second unnamed column. **The number reaches the sub-label as a raw value in a named
  parameter and is formatted where the language is known (AC-713), never in the fixture.** A row with no reading for its second fact
  states no second fact, and where the absence has a reason the sub-label gives it — `Not
  launched`, not an em-dash. *(**R5-5**. The nullable case is the one the column form cannot state:
  a city with no failure-rate reading and a city with a reading of zero are different facts, and
  only the phrase can render the difference.)*
- **AC-728** A breakdown draws bars only where the rows differ **and where the rows are ordered by
  the measure the bar draws**. Where every row shown carries the same value, no bars render and the
  numbers carry the ranking alone. **Where a list is ordered by anything else — urgency, severity,
  alphabetical, a workflow's own priority — it carries no bar, and re-sorting the list so the bars
  behave is not an available fix.** Where bars do render, the longest belongs to the top row and
  every bar sits beside its own number in text. *(**R5-6**, plus the third condition from **R5-12**
  on the second R5 pass. `admin.rotaGapsByDay` is the first worked case: seven rows all valued 6,
  seven identical bars, twenty pixels a row for a mark that distinguishes nothing — and **the
  finding those seven equal numbers encode survives and is the point of the list**, nobody being on
  call at any hour of any day. `operations.backlogByQueue` is the second: it sorts breached-first
  and bars the open count, so the bars read down, down, up, flat. **A bar is a redundant encoding of
  the number beside it, and two encodings of two different measures in one row is not redundancy but
  a contradiction**, with no way for a reader to know which to believe. Re-sorting that list by
  value would throw away the ordering the queue exists to provide in order to rescue a decoration.)*
- **AC-729** **A board renders a number of tiles that leaves no trailing row of one at either
  sanctioned width.** Counting the tiles a board renders, **`n mod 3` is not 1** — permitted counts
  are **2, 3, 5, 6, 8, 9, 11, 12**, and the forbidden ones are **1, 4, 7 and 10**.
  **The permitted counts constrain which tiles are cut. They never decide whether a measure earns a
  tile.** A board one over a permitted count drops the tile ranked last in its section, by AC-603
  where a second board already owns the number; a board one under adds a measure it already owns
  and has ranked, or drops to the next permitted count. **No board invents a measure to reach a
  count, and no measure loses its tile because the grid is short of one.**
  *(**R5-10**, second R5 pass, **corrected on the sixth**. I raised on the fifth pass that the rule
  as written — `n mod 4 ≠ 1` **and** `n mod 3 ≠ 1`, giving {2, 3, 6, 8} — was narrower than the
  built grid requires. The designer re-derived it by enumerating every `n` from 2 to 13 through the
  component's own branch rather than reading the arithmetic back, and **the `mod 4` clause never
  binds**: `MetricTileRow.tsx:70` takes four columns only when four divides the count, so a count
  that would render `4 + 1` never reaches four columns in the first place. Clean at both widths
  **iff** `n mod 3 ≠ 1`.
  **The guard in the second paragraph is unchanged and matters more now, not less.** Five of eight
  boards are off a permitted count, which is enough pressure to start cutting whichever tile makes
  the arithmetic work — and **a grid rule deciding a measurement question from behind is how a board
  ends up with the tiles that fit rather than the tiles that answer its question**, which is §1's
  failure arriving from the layout side.)*
  > ⛔ **THE TABLE BELOW IS FROZEN AND MUST NOT BE ACTED ON. F-17 · D15.** §11.2's sort ran on the
  > wrong predicate; re-running it correctly removes **eight further tiles** and takes **Growth to
  > three** and **Admin to two**. Every row below is computed from a tile list known to be wrong.
  > **The rule above is not frozen and neither are the permitted values** — what is frozen is which
  > boards are off them, by how much, and which tile leaves.
  >
  > **Two of these boards may not be boards.** Growth at three and Admin at two are `07-rulings-r4.md`
  > §11.3's shape, which is **D15**'s argument — and **deciding a tile count for a sub-tab before
  > deciding whether it is a sub-tab is deciding the furniture before the room.** Sequence: D15,
  > then the per-tile disposition, then this table, recomputed.

  **Five boards do not satisfy this on today's tree — and they resolve into three decisions, not
  five, because two pairs share a cause:**

  | Board | Tiles | Renders | Ragged at | Nearest permitted | Decided by |
  |---|---:|---|---|---|---|
  | Management › Overview | 7 | `3 + 3 + 1` | **both widths** | 6, cut one · or 8, add one | **Q-D18** — its seventh is the captain census |
  | Management › Growth | 7 | `3 + 3 + 1` | **both widths** | 6, cut one · or 8, add one | **Q-D18** — its seventh is the rider census |
  | Management › Performance | 4 | `4` / `3 + 1` | 1280 only | 3, cut one · **or 5, add one** | **Q-107** — the *No* branch lands it on three |
  | Management › Market & Zones | 7 | `3 + 3 + 1` | **both widths** | 6, cut one · or 8, add one | a per-board call. Its seventh is neither census: `Cities live` is a state count with a legal denominator caption |
  | Admin › Overview | 4 after §11.2 | `4` / `3 + 1` | 1280 only | 3, cut one · **or 5, add one** | a per-board call — Q-D16's remaining half |

  **The correction changes the two fours and nothing else, and that is the change worth having.**
  Under the old set a four had to become **six**, which meant finding **two** measures with stores —
  and Admin had just lost three tiles to §11.2, so *"find two more"* was close to asking for the
  tiles that had been removed. **Five is reachable with one.** That is the difference between a
  decision and a bind. **The three sevens are unaffected**: 6 and 8 were their neighbours under both
  sets.

  **Two pairs and two singles. Overview and Growth are one question** — §5.4 applied *a cumulative
  census is not a board number* as a **move**, which is count-neutral, so Overview went 8 → 7 and
  Growth 6 → 7 in one edit and neither landed on a permitted count. **A relocation rule cannot
  resolve a count problem across a pair of boards; only a cut can.** Performance is not an
  independent choice either. **Only Zones and Admin are genuinely per-board.**
- **AC-732** **A tile's value is computed from a collection the data layer holds. A number written
  into the metric seed is a `NEW DATA` metric wearing a number, and is sorted by the same test as a
  tile with no number at all: does the measure have a store?** The candidate set for that sort is
  every seed with no declared source — **not** every seed with no value. A tile carrying a literal
  and no declared source does not pass the sort by carrying the literal.
  **A literal is the aggravated case, not the lenient one.** Where a measure with no store renders
  nothing at all (AC-601) and a measure with no current value renders an em-dash and a reason, a
  measure with no store **and a hand-written number** makes the strongest claim of the three —
  R4-11 §11.2's own words: *"an em dash is a claim that the number exists somewhere, and a tile
  backed by a hardcoded literal is a stronger claim than that: it is a wrong number presented as a
  right one."* **It is therefore the first case §11.2 should have caught and the only one it never
  looked at.**
  *(Appended on the sixth R5 pass, and it is the mechanically checkable form of a rule §4.1 **Q-102**
  has carried since this spec was written: *"a seeded literal is a `NEW DATA` metric wearing a
  number."* **The rule was in prose and the sort that ran keyed on `value: null`, which is the
  opposite filter** — it required a tile to be both unsourced and empty, so every literal-backed
  tile survived a pass designed to remove exactly them. **AC-602** did not close it either: it forbade
  a value hardcoded *in a component or a copy string*, and a seed literal is in neither — that hole
  is closed in AC-602 on the seventh pass. §21.4 has the correction and the fourteen seeds it now
  catches. **The predicate has now been implemented twice and keyed on a seed property both times**,
  which is what makes the declared field the rule rather than the sort — **R5-15**.)*
- **AC-730** **The average-renewal tile's label names the population it averages over, and its
  caption names the base count within that population.** The label is not `Average renewal rate`,
  which names no population; it names riders. The caption states how many of that population carry
  a reading and how many the population holds. Riders with no reading are excluded from the mean
  rather than counted as zero (AC-606). **The tile's drilldown lands on that same population.**
  *(Rewritten on the third R5 pass under **R5-13**. My first version put the denominator in the
  caption alone and that is one layer short: **a caption is read second and a label is read first,
  so a mean whose population appears only in its caption is quotable without it** — which is the
  failure R4-4 §4.2's caption exists to prevent, arriving one line higher. It is **AC-715**'s own
  division — *a count and its label are separate* — applied to a mean. And the drilldown moves with
  the population by **AC-607**: a tile that averages riders and drills into subscriptions is the
  same population error expressed as a route.)*
- **AC-731** **A tile whose value is an aggregate declares the population it aggregates over in the
  contract, not only in its words, and four expressions of that one population agree: the declared
  resource, the label, the caption's base count, and the drilldown's destination.** A tile that
  averages, shares, rates or counts over a set and declares no source has an **undeclared
  denominator**, and does not ship.
  **The declared resource is REQUIRED on an aggregate, and its absence is not a gap to be filled
  later — it is the tile not rendering.** A tile that aggregates over records and declares no
  resource does not render, is named in its board's *deliberately not here* table with the store it
  waits on, and the criterion enumerating that board's tiles is amended in the same edit (AC-726).
  **After that, an aggregate that renders and declares nothing is impossible rather than
  discouraged.**
  **Three of the four expressions are then checkable without reading the tile: the drilldown resolves
  to the declared resource, the caption's base count is a count of that resource, and the resource is
  declared at all.**
  **A metric that is not an aggregate over records is outside this criterion** — `Contribution
  margin` is a margin out of the pricing formula, not a count or a mean over rows, so it declares no
  resource and that is correct. **It is the one place a null must be defended in a comment rather
  than by the rule**, and it is named here so the next reader does not close it as an oversight. *(New on the third R5 pass, from **R5-14**. `Metric.sourceResource`
  is required for exactly this — **R5-15**, which
  makes R5-14 §11.2's *missing half* rather than a separate rule — and its own doc says so — *"this is what stops the overview and
  the index table disagreeing about the number of active captains"* — and it is empty on the one
  tile that needed it. **The evidence is the strongest argument on this project for a rule over
  care: four people computed one tile carefully and produced four populations, because the metric
  declares none.** Care does not fix that, review does not fix it, and a fifth pass produces a fifth
  number. §6.1 has the table and the spread.)*
  > **The fourth expression is a review obligation and is named as one, not implied.** *Do the
  > label's words name the same population the resource declares?* is not mechanically checkable —
  > nothing can compare `Average rider renewal rate` against `riders` and know whether the word
  > means what the field holds. **Everything above this note is enforceable. This note is not.**
  > It is a fixture-and-copy review obligation, and the reason it must be stated rather than left
  > inside the criterion is the false-✓ failure `DECISIONS.md` *PRACTICE* records: an unenforced
  > clause that reads like an enforced one is the line a reviewer trusts **instead of** checking.
  > §6.1 is the worked case — the label word `subscriber` resolves through a field that has drifted
  > from its own definition, and no test on this criterion would have caught it.

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
| **F-1** | **CLOSED — `07-rulings-r4.md` §4.1, amended by `09-rulings-r5.md` §9.1.** The row now carries one numeric column, a `BreakdownLabel` union that tells a translated label from an entity name, and `subLabelParams`. Original text: **`MetricBoard` has no breakdown shape.** It carries `metrics[]` and `charts[]` only. Six of the eight boards need a ranked list, and the two most valuable lists in the product — contact reasons with their root-cause owner (`:15026`) and zones with their captains-needed figure (`:14132`) — have nowhere to go. **The largest gap in this spec.** AC-690–697 all depend on it. | Risk, Zones, Performance, Ops, Support, Admin | product-designer, then mock-data-engineer |
| **F-2** | **CLOSED — `07-rulings-r4.md` §4.2, widened by `09-rulings-r5.md` §4 (R5-4) to carry a direction-that-counts-as-good, at a measured 38-character budget.** Two of the three tiles are served. **The third is not, and it is not a caption case at all — see F-14.** Original text: **`Metric` has no caption.** Legacy carries a sub-line on every tile — *"excludes pending applicants"* (`:10374`), *"5 of 12 total"* (`:6916`), *"ceiling 3 %"* (`:15025`) — and three tiles here **cannot ship without one**: the dormancy proxy caveat (AC-641), the overturn-rate explanation (AC-675) and the uncoded-ranking warning (AC-674). | Growth, Support, Ops | product-designer |
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
| **F-14** | **CLOSED — `09-rulings-r5.md` §18.1 (R5-9).** A breakdown gains a caveat line under the heading and above the rows, wrapping rather than truncating, conditional, with the guard that a caveat exists only where a criterion names the condition and the threshold. **AC-674** carries it. Original text: **A breakdown has no slot for a caveat about its own trustworthiness.** **R5-4** closed AC-719 for the two caveats that sit on a *tile* — the dormancy proxy and the overturn explanation — by widening the caption to carry a valence. It did not close AC-674's, and AC-674's is not a tile caveat: *"when uncoded contacts exceeds its ceiling, the contact-reasons breakdown states that its ranking is incomplete."* §4.1 gives a breakdown a heading, a label, a sub-label, a value, a bar and a cut-off line, and none of those is the slot. Two constraints narrow it: the caption cannot be borrowed, because **R5-1** suppresses a caption exactly when its tile's value is absent and this one must render **then most of all**; and R10 says a standing condition is a banner, which a board now has (R4-4 §4.3) but which is capped at one per board and already spoken for on Support. **Raised on the R5 pass; not resolved here, because a slot is a shape and a shape is the designer's.** | Support | product-designer |
| **F-17** | **§11.2's sort has not been run on its own test.** The test asks whether a measure has a store; the sort that ran keyed on `value: null`, so **fourteen seeds with no declared source — twelve of them carrying a literal ported from legacy — were never sorted** (§21.4, **AC-732**). Nine are reported to have no store for their population at all: promotions, referrals, steer offers, erasure requests, a rota, engaged hours. **The engineer set `sourceResource` on none of them deliberately, and the reasoning is right and worth keeping: naming a resource would make R5-14's cross-check runnable and false, which looks audited and is worse than silent.** **Re-running the sort correctly removes eight further tiles**, reported from the `fixtures/metrics.ts` header and consistent with the seed: **Growth 7 → 3**, Zones 7 → 6, **Admin 4 → 2**, Support › Fairness 3 → 2, and Risk 6 → 4 *if* its two sort as no-store. **Risk is the only one of the five that lands off a permitted count**, so those two sort first. **Growth at three and Admin at two are not boards short of a tile — they are `07-rulings-r4.md` §11.3's shape, in §11.3's words**, and that turns this finding into **D15**'s evidence: §11.3 argued the merge from one board's literals and it can now be argued from four. **Sequence: D15, then the per-tile disposition, then the counts.** **Q-D16, Q-D18 and every per-board count are HELD** on it — `DECISIONS.md`. | Overview, Risk, Growth, Zones, Admin, and the fairness board | **product-designer** — §11.2 is theirs, and this is a ruling question, not a fixture one |
| **F-16** | **Tile width varies between boards at one viewport, because the column count depends on the tile count.** `MetricTileRow.tsx:70` takes four columns only when four divides the count and three otherwise, so at 1440 against the measured 1040px column **three columns give 339px tiles and four give 251px** — Operations (8 tiles) and Support (6) are one navigation apart and **88px different**. A board *gaining* tiles to reach a permitted count makes every remaining tile on it **wider**, which nobody predicts. **Raised by product-designer on the sixth R5 pass and deliberately not ruled**, and the reason is recorded rather than paraphrased: fixing it means one fixed column count per width, **which would invalidate a measured, built, working grid on an argument constructed the same afternoon** — the over-specification error again, in the other direction. **If the counts land every board on 5, 6 or 9 it disappears on its own**, so it is looked at *after* the counts settle. Named here so the owner reads it while choosing, and so nobody "fixes" the grid first. | all eight | product-designer, **after Q-D18, Q-107 and Q-D16** |
| **F-15** | **CLOSED — `09-rulings-r5.md` §18.3 (R5-11), and answered the opposite way from how AC-687 first answered it.** A breakdown or chart with no store **renders, keeps its title, and says `Nothing is recorded here yet.`** — because a tile has no body and a card does, and deleting the card deletes the heading. Guarded to measures a spec section names. **AC-676**, **AC-677**, **AC-687** carry it. Original text: **R4-11 §11.2 rules on tiles and is silent on charts and breakdowns backed by the same absent store.** The bar says a measure with no store does not render as a **tile**. `admin.integrityAccounts` is a breakdown of exactly the rows the tile could not count, and the fixture has already withheld it by analogy (`src/data/fixtures/metrics.ts:2349`) — correctly, but on nobody's ruling. **The distinction that needs stating is between an empty store and no store**, because they render differently and the difference is already load-bearing on one board: Support's contact-reasons breakdown has a real dimension and no volume, so it renders `Nothing to rank for this period.` (R8's second kind, AC-692) and should keep doing so; Admin's integrity breakdown has no dimension to rank at all. **AC-687 states the answer for the one instance it governs. The rule is not mine to write.** | Admin, Support | product-designer |

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
| **L-12** | **`Rider.status` has drifted from its own definition on two rows.** `RDR-4001` and `RDR-4003` carry `status: 'subscriber'` with `subscriptionIds: []` and no stated reason, in the *"added rows"* block. | `src/data/fixtures/riders.ts:365`+; definition at `src/data/types/rider.ts:7`–`:22` | The type's own doc says the field is derived from `subs.length` (`:6428`), and `fixtures/riders.ts:63` shows it applied correctly in the harder direction — RDR-2087 holds a **cancelled** subscription and is `on-demand`. So `status` **is** the active-subscription join, materialised for exactly the reason §8.2 gives, and two rows contradict it. **Fixture defect, not a population choice** — it is the whole of the 62.0 / 63.3 gap in §6.1. **What catches it is neither AC-731 nor a review: a fixture invariant** — `status === 'subscriber'` if and only if `subscriptionIds` is non-empty — **a third check in a third place.** AC-731 declares a metric's *resource* and says nothing about a predicate within it or a record's internal consistency, **so it would not have caught this**, and saying otherwise would retire a gap that is still open. Owner: mock-data-engineer. |
| **L-13** | **Two populations are live in the tree at once.** `fixtures/dailySnapshots.ts` states it in its own header: the last snapshot row reads **7 captains / 10 riders / 6 subscriptions**, while the working fixtures hold **52 / 13 / 47**. | `src/data/fixtures/dailySnapshots.ts` (header + last row) vs the captain, rider and subscription fixtures | **Two correctly-computed answers to one question — the exact failure `R5-15` exists to prevent, already present in the tree.** Neither number is arithmetically wrong; they count different populations, and nothing on a board says which. **Two mitigations hold today and neither closes it:** the catalogue never sources one measure from both, and a snapshot-sourced measure carries a caption naming its base. **What is not safe is a second reader** — the Report Builder can put a snapshot-sourced series and a fixture-sourced series in two panels on one screen, where the captions are the only thing keeping them apart. Raised from `specs/06-report-builder.md`'s build; **owner: mock-data-engineer, and the decision of which population is real is mine with the business owner.** Recorded before a report builder multiplies it, not after. |
| **L-11** | Five nav badges are stale until their page is first visited. | `:13406`, `:13159`, and three more (`02-work-queues` Q-48) | On Safety that means an open SOS reads `0` beside the word "Safety" until someone happens to click it. Closed by Q-48; restated because §14 depends on the badges being live. |

---

## 19. Open questions

| # | Question | Who answers | What is blocked until they do |
|---|---|---|---|
| **Q-107** | **Is "average renewal rate" a rate of renewal, or a mean of a stored rider statistic?** Legacy is the latter (`:6931`). The two are different numbers and only one is a metric. **Restated on the third R5 pass as a yes/no, so it is answerable in one sitting with Q-D16 and Q-D18. Yes** — the stored per-rider stat is the measure: the tile ships with a declared population, a label naming it, a caption stating the base and a drilldown landing on it (**AC-730**, **AC-731**), and Performance is four tiles, which **AC-729** does not permit. **No** — the tile has no store for the measure its label names, leaves the board under §11.2, and Performance is three, which is permitted at both widths. **The designer recommends No. That recommendation is theirs and this spec does not adopt it** — what the product claims to measure is the owner's. | Business owner, with product-owner | **Nothing, and that is deliberate: copy and criteria are final for both branches** (§6.1). What the answer changes is which branch ships, and Performance's tile count with it. |
| **Q-110** | **What is the healthy threshold for each of the five `[inferred]` bad values?** 10 % of the book predicted to churn, 4.5 average rating, 90 % promise kept, 60 % renewal rate, and the confirmation of legacy's own 25 % dormancy (`:6967`). | Business owner | Nothing hard-blocks — a tile renders without a threshold. But **no tile can say "this is bad"** until each has one, and that is most of what an overview is for. |
| **Q-111** | **Does the business capture, or want to capture, a daily operational snapshot beyond the nine fields?** Four charts here are `NEW DATA` and all four are one added line each in `captureDailySnapshot` (`:7645`): revenue at risk, failed matches, contact count, breached-ticket count. | Engineering lead, with the business owner | Risk's only chart, Zones' chart data, Support's chart. All three ship with their honest empty states until then. |
| **Q-112** | **Is there a survey mechanism at all?** CSAT and NPS are described in prose at `:13793` and implemented nowhere. | Business owner | Performance's quality half. Recorded as F-6. |
| **Q-113** | **What does the `admin-overview` nav count of 2 count?** I could not ground it. An overview has no backlog of its own; if it is the sum of what the board points at, it should be 43-plus today given 42 rota gaps. | mock-data-engineer | **AC-724**'s neighbour. Either it is a sum, or it should be `null`. |
| **Q-115** | **Are contacts logged at all, one row per contact with a reason code?** `DB.contacts` is `[]` (`:14718`) and every contact is written at runtime by `logContact` (`:14920`); the rebuilt layer has no capture path. **This is a change to how the support team works before it is a change to a schema**, which is why it is not an engineering question first. §1.1. | Business owner, then the engineering lead for the capture and for **Q-111**'s daily count | **Three tiles, one chart and the breakdown this spec calls the most valuable list in the product** — and Support › Overview's own question, *"what are they calling about?"*, which nothing else on the board answers. **Nothing in R5 shortens this list.** |
| **Q-D16** | **Does Support › Overview ship as the board §11.2 leaves, without the tiles whose measure has no store?** Drafted yes/no in `design/09-rulings-r5.md` §14 and recorded in `DECISIONS.md` with my recommendation and my re-derivation of the count. | Business owner | Nothing hard-blocks. **AC-668**'s enumeration and §11.4's absent-tile table both settle when it does. |
| ~~**Q-D17**~~ | ~~Does Management › Overview render six tiles or seven?~~ **RETIRED on the fifth R5 pass, absorbed by Q-D18.** It was one board's instance of a principle governing a **pair**: §5.4 applied *a census is not a board number* as a **move**, so fixing Overview created Growth's seventh. | — | — |
| **Q-D18** | **Does a cumulative census render as a metric tile anywhere?** Settles Management › Overview and Growth in one answer. Recorded in `DECISIONS.md` with my recommendation and the designer's, which agree. | Business owner | Nothing hard-blocks. **AC-612**, **AC-637** and **AC-729**. **AC-603** decides `Active captains` a second time regardless — a captain census is Operations' subject. |
| **Q-114 → D15** | **Which of the five Management surfaces would survive a cut to three?** ~~I am **not** recommending it today.~~ **That sentence is withdrawn on the seventh R5 pass — not because I changed my mind, but because the evidence arrived.** `07-rulings-r4.md` §11.3 recommended the merge from **one** board's literals; a corrected §11.2 sort (**F-17**) takes **Growth to three** and **Admin to two**, which is §11.3's shape on **four** boards. **The option stopped being a discovery and became a blocker.** | Business owner — it is a **D1 amendment**, recorded as **D15** in `DECISIONS.md` with the evidence table | **Q-D16, Q-D18 and every per-board tile count.** A tile count for a sub-tab cannot be settled before it is settled that the sub-tab exists. |
| **D4** | **The role model.** §16 is provisional against five legacy operator records. | Business owner | **AC-689, AC-703, AC-712.** Every board ships with visibility computed from today's 13 broad keys, and Admin › Overview is Owner-only in the meantime. |
| **Q7** | **Which of the four pricing models is real.** | Finance lead, with the business owner | **Overview's gross-revenue and contribution-margin tiles**, and Growth's ROI tile, in that all three depend on what "revenue" means. `contributionMargin()` (`:15720`) is internally consistent and is what this spec specifies against; if Finance names a different model, those three tiles change and nothing else on the eight boards does. |
| **Q8** | **SLA targets.** | **Closed** by `specs/02-work-queues.md` §4.3. | Nothing. The 48-hour application window is now a decision and **AC-657** rests on it. |
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

**~~Added on the R5 pass — three things are yours~~ — all three ruled on the second pass, and the
outcomes are carried in this spec's criteria rather than left as findings.** **F-14** closed by
**R5-9** (the breakdown gains a caveat line — AC-674). **F-15** closed by **R5-11**, and the opposite
way from how AC-687 first answered it: a card renders, keeps its title and says
`Nothing is recorded here yet.`, because a tile has no body and a card does (AC-676, AC-677, AC-687).
**The 1280 consequence** answered by **R5-10** — the count bends to the grid, not the grid to the
count (AC-729).

**Seventh pass — I concur with the sequencing ruling without reservation, and the register reflects
it.** Q-D16, Q-D18 and every per-board count are **HELD**; **AC-729**'s board table is frozen with
the reason on it; **D15 is in the register as the decision that unblocks them**, with the four-board
evidence table and R4-11 §11.3's own words. **Q-114's *"I am not recommending it today"* is
withdrawn** — the evidence I was waiting for arrived, and it arrived from running an existing rule
properly rather than from anyone assembling a case. Two criterion holes closed in the freeze:
**AC-602** enumerated two layers and the literals came through a third, and **AC-732** now carries
§11.2's own aggravated-case clause, which the sort never looked at.

**Sixth pass — R5-10's correction is applied (AC-729: `n mod 3 ≠ 1`, permitted 2, 3, 5, 6, 8, 9, 11,
12), the narrower-set caveat I raised is closed, and **F-16** — tile width varying between boards —
is recorded in the spec and in front of the owner inside Q-D18, with your reason for declining to
rule it quoted rather than paraphrased. **One is now yours and it gates the counts: F-17.** §11.2's
sort keyed on `value: null` instead of on *has a store*, so **fourteen seeds with no declared source,
twelve of them literals, were never tested** — the predicate was mine and is corrected at §21.4.
Which of them have a computable store is §11.2's test case by case, and §11.2 is yours. **Both
register entries now say the principles are answerable and the landing counts are not.**

**Fifth pass — three things are yours.** (a) **R5-10's permitted set is narrower than the built
grid requires**: the rule reads `n mod 4 ≠ 1` and `n mod 3 ≠ 1`, giving {2, 3, 6, 8}, while
`MetricTileRow.tsx:70` takes four columns **only when four divides the count**, so what renders
ragged is exactly `n mod 3 = 1` — **5 and 9 are clean too**. Complying is always safe; the owner
simply has fewer landing points than the grid allows, which matters on a board choosing between
cutting a tile and adding one. Recorded, not overruled. (b) **The five boards resolve into three
decisions**, and the reframing came from this spec's own §5.4: the census principle was applied as a
**move**, which is count-neutral, so Overview's fix created Growth's defect. **Q-D18** asks the
census question once for the pair; **Q-D17 is retired into it.** (c) **AC-716 now requires an Arabic
claim to say whether it checked direction or translated text** — every RTL result in this cycle is
the first kind, taken against English strings, and the caption and caveat budgets are the second.

**Third pass — R5-13, R5-14, R5-9 corrected and R5-11a are all applied; see §21.7 and §6.1.** Two
corrections go back to you and both strengthen R5-14 rather than qualifying it. **§22.1's 6-set is
nameable** — the predicate is `Rider.status === 'subscriber'`, not anything on `subscriptionIds`.
**And `Rider.status` is the active-subscription join**, materialised for §8.2's reason and shown
working in the harder direction at `fixtures/riders.ts:63`, so §22.2's *"needs a join `riders.ts`
cannot do"* row is computable. **The consequence is that 62.0 and 63.3 are not two definitions:
they are one definition and a fixture defect** — `RDR-4001` and `RDR-4003` carry
`status: 'subscriber'` with `subscriptionIds: []`. Recorded as **L-12**. **The real choice is two
populations, seven points apart, both nameable** — which is a cleaner case for AC-731 than four
were, and it is the worked example for why the fourth expression had to be a named review
obligation: with `sourceResource: 'riders'` set, all three mechanical clauses pass and the word
`subscriber` is still wrong.

**What remains yours from the second pass is one thing and it is a consequence of your own rule.**
**Applying R5-10 to all eight boards, three fail it, and §18.2 names two.** Management › Overview at
seven and Admin › Overview at four are both cited; **Management › Performance at four is not**
(§6.1, `4 mod 3` is 1, so it renders `3 + 1` at the D2 minimum exactly as Admin does). All three are
content decisions and all three are in front of the owner — but the rule is yours and a third
instance is worth knowing about before the sitting. §21.6.

### To mock-data-engineer

**Added on the R5 pass, and read §21.4 first — it states the mechanical test rather than a table to
trust.** `design/09-rulings-r5.md` §15 asks you to re-derive its classification; I did, and the two
differ in one place: **Support keeps six tiles, not four.** `uncodedContactShare` is a share over a
zero denominator — the store exists and is empty — so it stays with an em-dash and
`Nothing to measure yet`, and `contactsPerThousandTrips` stays with `Not captured yet`. Only
`ticketsBreaching` and `promiseKept` leave Support. Three leave Admin. **Second pass: R5 §18 adopts
this derivation** — Support 8 → 6, Admin 7 → 4 — **and `avgRenewalRate` is settled: it is a
derivation, not an absence, and it stays** (§6.1). It needs `Rider.renewalRatePercent` and a stated
denominator — **6 of 7 subscriber riders carry a reading, 8 of 13 riders overall, and the two means
differ by six points**, so which set it is taken over is a published number, not an implementation
detail. **AC-730.**

Every tile you remove needs its row in §11.4 or §12.4 naming the store it waits on — that is
**AC-726**, and on the second pass those tables do a second job: **R5-11's guard is that a card may
render `Nothing is recorded here yet.` only where a spec section names the measure and the store**,
so the same table is what licenses the contact-reasons card, the contacts chart and the integrity
breakdown to render at all. Also from the second pass: **`operations.backlogByQueue` carries no bar**
(AC-728 / R5-12 — it sorts breached-first and bars the open count).

**Third pass.** `MetricBreakdown`'s caveat is **one object with a `gatedBy` pointer**, not the
`caveatKey` / `caveatParams` pair the second pass named — the three fields exist only together, so
a caveat cannot be written without naming the metric behind it (AC-674). The awaited store is a
**closed union** on `MetricBreakdown` and `TimeSeries`, set to `contact-log` on Support's list and
series and `payments-by-entity` on Admin's integrity list, and **every member needs an entry in
§11.4 or §12.4** — AC-726. And on `avgRenewalRate`, whichever branch **Q-107** takes:
**`sourceResource` is the population and it is not optional** (AC-731), the drilldown moves to the
population it declares, and **L-12 is fixed either way** — two riders carry
`status: 'subscriber'` with an empty `subscriptionIds`, which is the whole of the 62.0 / 63.3 gap.

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

**Seventh pass — nothing to change yet, and that is the instruction.** The per-tile disposition is
**F-17**, it is product-designer's ruling, and it is sequenced **after D15**, because two of the
boards it re-counts may not be sub-tabs. **Do not remove tiles, set `sourceResource`, or recompute a
board's count against the numbers in the hold note** — they are reported, they are consistent with
the seed, and they are still an input to a decision rather than an outcome of one.

**Sixth pass — do not set `sourceResource` on the fourteen unsourced seeds to satisfy AC-731.**
Your refusal is right and this spec now records why as a principle: naming a resource on a measure
that has none makes **R5-14**'s cross-check **runnable and false**, and a check that executes and
passes on a lie **looks audited and is worse than silent** — the same class as the false ✓
`DECISIONS.md` *PRACTICE* exists for. **They are sorted by §11.2's test first (F-17, product-designer)
and declared afterwards, in that order.** **AC-732** states the rule they are sorted by, and it is
the mechanical form of a rule §4.1 Q-102 already carried.

**Fifth pass, and it reverses an instruction this spec gave earlier.** **Params are raw values, not
formatted ones** — the fixture carries the number, the dictionary carries the pattern, and the layer
that knows the language does the formatting (**AC-713**). The reason is not Arabic-Indic digits;
**AC-717** forecloses those. It is that **a fixture never knows the language**, so anything formatted
in one is frozen there while separators and percent placement are decided at render time.

**Every copy key added must land in `src/screens/metrics/copy.ts` in the same change as its seed** —
`createTranslator` throws on a missing key in dev, which is the intended failure mode.

### Blocked, and on whom

| Blocked | On | Owner |
|---|---|---|
| AC-689, AC-703, AC-712 — role-scoped visibility | **D4** | business owner |
| ~~AC-690–697 — every breakdown criterion~~ **CLOSED — F-1 is minted.** `07-rulings-r4.md` §4.1 gives the breakdown its anatomy and `09-rulings-r5.md` §9.1 amends it (one numeric column, the label union, the bar). AC-690–697 are testable | — | — |
| ~~AC-641, AC-675 — tiles that cannot ship without a caption~~ **CLOSED — F-2 is minted.** `07-rulings-r4.md` §4.2 gives the caption its slot and **R5-4** widens it to carry a valence, which is what AC-675 needed | — | — |
| ~~**AC-674 alone remains**~~ **CLOSED — R5-9** gives a breakdown its own caveat line. AC-674 carries the position, the wrap, the condition and the guard | — | — |
| Risk's chart, Zones' chart data, Support's chart | **Q-111** — is a daily snapshot captured | engineering lead |
| Performance's quality half | **Q-112** — does a survey mechanism exist | business owner |
| "This value is bad" on five tiles | **Q-110** — the thresholds | business owner |
| Gross revenue, contribution margin, promo ROI | **Q7** | Finance lead |
| **Three Support tiles, its only chart and its only breakdown** — the whole of §1.1 | **Q-115** — are contacts logged at all | business owner, then engineering lead |
| ~~AC-674's uncoded-ranking warning~~ | **CLOSED — R5-9** | — |
| ~~Whether a chart or a breakdown with no store renders~~ | **CLOSED — R5-11**, and the opposite way from AC-687's first answer | — |
| **Every board's tile count, the list of tiles §11.2 removes, and Q-D16 / Q-D18 — all HELD** | **D15 first**, then **F-17**'s per-tile disposition, then the counts | business owner (D15) · product-designer (F-17) |
| **Five boards are not on a permitted tile count under AC-729** — Management › Overview, Growth, Zones, Performance, and Admin, **on today's tree and provisional on F-17**. They resolve into **three** decisions, not five | **Q-D18** (Overview + Growth, one answer) · **Q-107** (Performance) · **Q-D16** (Admin) and one per-board call on Zones | business owner |
| Which of two populations `Average rider renewal rate` averages over — 69.5 over riders with a reading, or 62.0 over subscribers | **Q-107**, and **L-12** must be fixed either way | business owner; L-12 is mock-data-engineer's |
| AC-668's enumeration and §11.4's count | **Q-D16** | business owner |
| AC-612's and AC-637's enumerations — both boards' seventh tile is a cumulative census | **Q-D18** | business owner |
| Sorting `Average renewal rate` against §11.2's test | **Q-107** first, then the sort | business owner, then mock-data-engineer |

---

## 21. Reconciliation with `design/09-rulings-r5.md` — the five, and what they cost

§12 of that document drafts replacement text for five of my criteria and edits none of them, which
is the right division and I have kept it. **I checked each against my own text before applying it**,
because a spec that absorbs every replacement has stopped being a spec — and because two of the
five turned out to need reshaping, one of them to avoid contradicting another of the five.

**This section states what the spec now provides. It asserts no criterion passes.**

### 21.1 Disposition of the five

| # | AC | Disposition | Where it now lives |
|---:|---|---|---|
| **1** | **AC-601** — a measure with no store does not render; a measure with no value renders an em-dash and a reason | **Applied as written, with two criteria of mine attached.** The draft is right, and right in the way the brief warned about: it does **not** say *a tile must explain its em dash*, which would license exactly the tiles §11.2 deletes. What it cannot do alone is be checked — *"has no store"* is invisible to a QA engineer — so **AC-726** makes the enumeration the artifact and **AC-725** says where the reason renders | **AC-601**, **AC-725**, **AC-726**, §13.2, §11.4, §12.4 |
| **2** | **AC-605** — subject widened from `kind === 'none'` to *a tile that cannot state a delta* | **Applied in substance, with one precondition added — §21.2.** The widening is right, AC-617 genuinely cannot absorb it (board-scoped, wrong board), and the third sentence stays: **V-8 named as an obligation is the whole value of the rewrite** | **AC-605**, **AC-683**, §13.2 |
| **3** | **AC-612** — *"Overview renders the tiles enumerated below, and no others"* | **Applied in substance, reshaped in form — §21.2.** *"Below"* has no referent inside a criteria list, and the enumeration is a section | **AC-612**, and the same shape applied to seven more counting criteria under **AC-726** |
| **4** | **AC-697** — the row label is a key or an entity name, distinguishable in the type | **Applied in substance, reshaped in its second half — §21.2**, and it is defeated without a change to **AC-713** that §12 does not mention | **AC-697**, **AC-713** |
| **5** | **AC-719** — the caveat and the caption are the same slot | **Applied, with one of its three named instances removed from scope and re-routed — §21.2.** My own enumeration was wrong: two of the three caveats sit on a tile and one sits on a breakdown | **AC-719**, **F-14** |

**Refused: none outright. Reshaped: three** (AC-605's precondition, AC-612's referent, AC-697's
observable). **Narrowed: one** (AC-719). **§11.1 tile 8 needs no change** and I agree — R5-4 resolved
B-3 in the ruling's favour rather than the spec's, so the sentence that was illegal is now legal and
only the string changed.

### 21.2 The four that need more than a table row

**AC-605 — the precondition, and it is a collision between two of the five.**

R5-2's replacement opens *"A tile that cannot state a delta shows an em-dash where the delta would
be…"* and its `none` branch requires *"one of exactly three reason strings."* **R5-1 §1.3 gives that
same line to a different sentence** whenever the value is absent: *"when the value is absent the
delta is entailed to be absent… the tile has exactly one line on which to say one thing."*

**There are tiles in both sets right now.** `support.overview.contactsPerThousandTrips` carries
`comparison: { kind: 'none', reason: 'no-history' }` **and** `value: null`
(`src/data/fixtures/metrics.ts:1293`). Under AC-605 as drafted it must render `No comparison period
yet`; under AC-601 as drafted it must render `Not captured yet`; one line, two obligations, and a
builder satisfying either fails the other.

**The ruling's own drawing settles it and the criterion text simply does not carry it.** §10 draws
states B and C with a value on them (`3`) and state D with no value and no comparison reason. So
AC-605's real subject is **a tile that has a value and cannot state a delta**, and that clause is now
in the criterion. **Nothing in the ruling changes; a precondition that was drawn is now written.**

**AC-612 — why the count leaves the criterion rather than being corrected.**

The draft defers the enumeration to the owner, correctly. But *"enumerated below"* points at nothing
a QA engineer can open, so the criterion names §5.1. **The larger move is that the number goes
away.** `design/09-rulings-r5.md` §13.1 corrects the designer's own §6.6.4 from *"four tiles"* to
five and says why it is worth correcting loudly: *"§6.6.4 exists to stop a hand-seeded literal
sitting above a table that disagrees with it."* **Eight of my criteria are that same literal**, and
§11.2 is now actively removing tiles from three of the boards they count. Correcting eight numbers
buys one round of agreement; deleting them buys the property. §21.3 lists the seven the ruling did
not route.

**AC-697 — an observable instead of a type assertion.**

*"…and the two are distinguishable in the type"* can only be checked by opening
`src/data/types/metrics.ts`, and my own rule says a criterion verifiable only by reading source must
be rewritten. The union's purpose is a **rendering difference**, and that difference is visible:
switch the console to Arabic and a rota day, a queue and a plan tier change; a person's name and a
city's name do not. That is what the criterion asserts now. The fig-leaf clause survives in a form
checkable against the copy dictionary, which is an artifact rather than an implementation.

**And it does not work without AC-713.** AC-713 said *"every operator-facing string on every board is
a translation key"*, full stop. An entity name carried as `{ kind: 'text' }` is operator-facing and
is not a key, so **AC-697's replacement and AC-713 cannot both hold** — and AC-713 is demonstrably
the criterion that produced the thing R5-7 is deleting: the fixture's own comment says
`breakdown.row.entity` *"satisfies the type and AC-713"*. Amending one without the other puts the fig
leaf back within a sprint. The carve-out is now in AC-713 and names entity data explicitly.

**AC-719 — applied, and narrowed, because my enumeration was wrong.**

R5-4 is right that the caveat and the caption are the same slot, right that `Higher is better.`
breaks none of §4.2's four prohibitions, and right that the two-item list in front of them was a list
of instances mistaken for a definition. I have applied it. **What it does not close is the third
caveat AC-719 named**, and the reason is in my text rather than in the ruling: AC-674 attaches the
uncoded-ranking warning to the **breakdown** — *"the contact-reasons breakdown states that its
ranking is incomplete"* — while AC-719 filed it under *"a caveat attached to a tile"*. Two different
strings on two different objects, and I wrote them as one.

Two constraints keep it from being solved by borrowing the caption. **R5-1 suppresses the caption
exactly when the tile's value is absent**, and `Uncoded contacts` has no value today (§1.1) — so the
one caveat that must render while a value is missing sits on the one slot that switches off then.
And the caption is 38 characters. **F-15** is the neighbouring gap: §11.2 rules on tiles and says
nothing about a breakdown backed by the same absent store, which the fixture has already had to
decide by analogy.

### 21.3 What quietly disagrees — contradictions §12 did not name

*Found by reading R5 against my own criteria rather than against the list of criteria it routed.
Seven, and one of them is between two rulings inside the same document.*

| # | Contradiction | Where |
|---:|---|---|
| **C-1** | **AC-605 and AC-601 claim the same line on the same tile.** Between two of the five replacement texts, not between a ruling and a spec. Settled by a precondition the ruling draws in §10 and does not write | §21.2, **AC-605** |
| **C-2** | **AC-697's replacement is void without a carve-out in AC-713**, which §12 does not touch — and AC-713 is the criterion that forced the `{name}` fig leaf in the first place | §21.2, **AC-713** |
| **C-3** | **AC-668 counts eight Support tiles and AC-679 counts seven Admin tiles; §11.2 deletes two and three of them.** §12 routed AC-612 for exactly this shape and left the two boards where the deletions actually land | **AC-668**, **AC-679**, §11.4, §12.4 |
| **C-4** | **AC-683 asserts the delta R5-2 exists to say cannot be computed.** `operators without two-factor` is R5-2's own worked example, and the ruling rewrote AC-605 around it while leaving AC-683 saying *"shows a delta against a target of zero"* | **AC-683** |
| **C-5** | **AC-673 requires the 3 % target phrase unconditionally; R5-1 §1.3 suppresses it whenever the value is absent** — which, on today's data, is always | **AC-673** |
| **C-6** | **AC-663 requires three counts on one breakdown row and R5-5 leaves room for two.** §11.4 of the ruling already ships the two-count sub-label and drops the unclaimed count without naming the criterion that required it | **AC-663**, **AC-664** |
| **C-7** | **AC-623 requires an em-dash with no reason** — the construction R5-1 §1.1 rules ambiguous *"by construction, not by taste"* | **AC-623** |

**Three more that are not contradictions but boundaries whose load changed**, each now stated rather
than left to be inferred:

- **AC-715** excluded sub-labels from its no-interpolated-numbers rule **by enumeration, not by
  intent**. R5-5 makes the interpolated sub-label the standard construction on every ranked list in
  the product. The rule was never broken; the exemption was accidental, and an accidental exemption
  is one an engineer talks themselves across.
- **AC-695**'s cross-check had two instances and R5-5 withdraws the carrier for one. Zones survives
  (`captains needed` is the row's one number). Operations does not: the breakdowns build's fixture note records
  that *"the breached column sums to the breached tile and the unclaimed column sums to the unclaimed
  tile"*, and both columns are now withdrawn. AC-664 rehomes what can be rehomed; AC-659 keeps the
  rest.
- **AC-687** shipped against a different dimension than it specifies (seven rows by day, not five by
  slot) and alongside a breakdown that does not ship at all. Both are recorded in the fixture and
  neither was in any criterion. **R5-6 rules on `admin.rotaGapsByDay` by name**, ratifying the
  seven-row shape without noticing that AC-687 asks for five.

**And one claim in R5 I re-derived and disagree with.** §14's Q-D16 says applying §11.2 removes *"up
to four of eight"* Support tiles. **The ruling's own §1.2 table names two** — `ticketsBreaching` and
`promiseKept` — and classifies `contactsPerThousandTrips` as the *other* kind, the one that stays
with an em-dash and a reason. The fourth candidate, `uncodedContactShare`, is a share over a zero
denominator: the store exists and is empty, which is `not-computable`, which stays. **So the answer
to Q-D16's headline question — "does Support ship as a four-tile board?" — is no; it ships as a
six-tile board, two of them em-dashed.** The recommendation is unchanged and the count is not. §15 of
that ruling asks for exactly this re-derivation and says it should not be taken on trust; this is it.

### 21.4 The test I used, stated once so it can be re-run

`design/09-rulings-r5.md` §15 is right that a classification is *"a claim about a tree"*. Mine is a
claim about `HEAD = 8a65130` plus the working tree of 2026-08-27, and it is mechanical:

> ⚠ **THE PREDICATE BELOW IS WRONG AND THE CONCLUSION IT REACHED IS INCOMPLETE. Corrected under it.
> Left standing because the error is the finding.**
>
> ~~A tile is **derived** — and therefore has a store — when its fixture entry sets `sourceResource`;
> `clients/metrics.ts:330` computes those at request time, and the seeded `value: null` on them is a
> placeholder, not an absence. A tile with **`sourceResource: null` and `value: null`** is the
> candidate set, and only that set. **Eight tiles are in it, which is exactly the eight V-2
> reported** — so the audit's count was right and its classification was the missing half.~~

**What §11.2 asks is whether the measure has a store. What I keyed on was `value: null`.** A tile
with a **hand-written number and no store** passes the second test and fails the first, so **every
one of them survived a sort designed to remove exactly them.** The conjunction was the error: I
required a tile to be both unsourced *and* empty, when unsourced is the whole test and empty is a
different question with its own two answers (§13.2).

> **The corrected candidate set is `sourceResource: null`, and only that.** **Fourteen seeds are in
> it**, re-derived at this tree:
>
> ```
> $ awk "/key: '/{k=$0} /^ *sourceResource: null,/{print k}" src/data/fixtures/metrics.ts
> ```
>
> **Twelve of the fourteen carry a literal.** `contributionMargin` 13 · `churnPredictedSubscriptions`
> 2 · `paymentRiskRenewals` 1 · `promoROI` 1.3 · `promoBudgetConsumed` 42 ·
> `subscriptionsFromPromos` 219 · `referralAndIncentiveSpend` 9,500 · `steerOffersLive` 0 ·
> `liveCities` 1 · `erasureOverdue` 1 · `rotaGaps` 42 · `earningsPerEngagedHour` 4,620. The other
> two are the null residue this section already sorted.

**This spec already carried the rule and my test contradicted it.** §4.1 **Q-102**: *"A seeded
literal is a `NEW DATA` metric wearing a number."* **A number in the seed is not evidence of a
store; it is the thing Q-102 says to be suspicious of** — and I built a filter that treated it as
proof of the opposite. **AC-602** does not catch them either: it forbids a value hardcoded *in a
component or a copy string*, and a literal in the metric seed is in neither. The rule was in prose,
the filter was in the other direction, and no criterion sat between them. **AC-732** now does.

**I am not publishing the split.** Which of the fourteen have a computable store is **§11.2's test
applied case by case, and §11.2 is product-designer's** — it has gone to them as a ruling question,
and the working is in the `fixtures/metrics.ts` header. Re-deriving a number here to be first with
one is how this cycle produced three different tile counts. **What is mine is the predicate, and it
is corrected above.** **F-17** carries the rest.

**The consequence is an ordering, not a delay, and it is stated as one:** a corrected sort moves
**four boards' tile counts**, and those are the counts **Q-D16**, **Q-D18** and **AC-729**'s table
are about. **The sort settles before any count does.** That is AC-729's own guard running the other
way: the guard says a count may not decide what a measure is — and the converse is that **a count
may not be ratified before the content that determines it.** Both register entries now say so.

Sorted by §11.2's test: **five have no store** — `support.overview.ticketsBreaching`,
`support.overview.promiseKept`, `admin.overview.integrityOrphans`,
`admin.overview.impersonationSessions`, `admin.overview.legalDocsUnaccepted`. **Two are measured with
no current value** — `support.overview.contactsPerThousandTrips` (`not-captured`) and
`support.overview.uncodedContactShare` (`not-computable`, a share over a zero denominator). **One is
unsorted** — `management.performance.avgRenewalRate`, §6.1, and it needs **Q-107** answered before
the sort means anything.

A ninth tile sits outside the candidate set and belongs to the same ruling:
`management.performance.avgCaptainRating` derives from `drivers`, has a store, and computes to
nothing because no captain in the dataset has a rating — a mean of an empty set, `not-computable`,
**AC-623**.

**Boards after the removals**, and the shape at both breakpoints, because the shape is why V-6
exists:

> **CORRECTED on the fourth R5 pass, and the error was mine.** The table below originally read the
> grid as *four-up wherever the width allows*. It is not: `MetricTileRow` takes four columns **only
> when four divides the tile count** and three otherwise
> (`src/components/metrics/MetricTileRow.tsx:70`), for the reason its own comment gives from the
> reference — six tiles are two rows of three, and *"a trailing row of two under a row of four reads
> as a layout that ran out."* **So seven renders `3 + 3 + 1` at 1440 as well as at 1280**, where I
> had it as `4 + 3` and clean. Corrected in place; the retraction stays visible.

| Board | Tiles | 1440 (`--ev-bp-wide`) | 1280 (the D2 minimum) |
|---|---:|---|---|
| Support › Overview | **6** | 3 + 3 | 3 + 3 |
| Admin › Overview | **4** | 4 | **3 + 1** |
| Management › Overview | 6 or 7 — **Q-D18** | 3 + 3 · or **3 + 3 + 1** | 3 + 3 · or **3 + 3 + 1** |
| Management › Growth | **7** | **3 + 3 + 1** | **3 + 3 + 1** |
| Management › Market & Zones | **7** | **3 + 3 + 1** | **3 + 3 + 1** |
| Management › Performance | **4** | 4 | **3 + 1** |
| Management › Risk & Signals | **6** | 3 + 3 | 3 + 3 |
| Operations › Overview | **8** — AC-655, decided here | 4 + 4 | 3 + 3 + 2 |

**Permitted counts are 2, 3, 5, 6, 8, 9, 11, 12 — `n mod 3 ≠ 1`, AC-729 as corrected on the sixth
pass.** Support, Risk and Operations are already clean.

**Five of eight, not three, and the sevens are the worse half.** §1.2 claimed the §11.2 removals
take away *"a chunk of V-6's trailing-row-of-one shape for free"*; they take away none of it, and
Admin's four goes from `3 + 3 + 1` to `3 + 1` at the floor — a shorter board with the same defect.
**Three boards are ragged at both widths and every pass before the fourth, mine included, counted
either two or three.** The count is one `grep` over `subTabId` in the metric seed and the shape is
one read of the grid component; **both are re-derivable in a minute, and the number changed on every
pass that relayed it instead.** **AC-729** carries the table; **Q-D18** carries the decision.

### 21.6 The second R5 pass — §18's four criteria, and what applying the count rule to every board found

`design/09-rulings-r5.md` **§18** accepts all seven of §21.3's contradictions, records that **five of
the seven were defects in its own replacement texts**, and routes four criteria back here. It also
corrects §1.2's *"four to six"* and §14's *"up to four of eight"* in place, adopts §21.4's mechanical
test over its own, and lands **Support 8 → 6, Admin 7 → 4**. That is my derivation, adopted; nothing
in it needs restating.

**The four, and one correction to me.**

| Ruling | What changed here |
|---|---|
| **§18.9** — AC-697's observable | **Corrected, and the correction is right.** *"Leaves every entity name character-for-character unchanged"* is true of a person and **false of a city**: `Riyadh` has an Arabic name and `DB.reasonCodes` already carries both labels per code, so the criterion **would have failed correctly-built code**. The reasoning is the part to keep — *a criterion that fails good code gets suppressed, and then it gets ignored*, which is a worse failure than one that passes bad code, because the second is caught by the next reader and the first trains people to skip the check. AC-713's carve-out was correctly scoped and is untouched: the test is *never routed through the dictionary*, and a localised record name comes from the **record** |
| **R5-11** — a card with no store | **AC-676**, **AC-677**, **AC-687**'s second clause. The card renders, keeps its title, says `Nothing is recorded here yet.` **AC-687 reverses:** I wrote that a breakdown of rows a tile could not count cannot render either, and the asymmetry the ruling names is better than my symmetry — *a tile has no body and a card does*. **The guard is carried, not just the sentence:** §11.4 and §12.4 now name the measure and the store for every card in this state, and AC-676/AC-677/AC-687 each say the table is what licenses the card. Without that clause the rule is a licence to pad a board with placeholder cards, which is the opposite of everything §11.2 does |
| **R5-9** — the caveat line | **AC-674**, and **F-14 closed.** The criterion carries the position (under the heading, above the first row — *a gate that appears after the thing it gates is not a gate*), the wrap (*a truncated caveat still looks authoritative*), the condition, and §18.6's precedence: a card in the not-recorded state renders no caveat, because *we cannot tell you this ranking is untrustworthy when we cannot tell you anything* |
| **R5-10** — the tile count | **AC-729**, new. `n mod 4 ≠ 1` **and** `n mod 3 ≠ 1`. The rule lands on product-owner because §18.10 routes the permitted count as a **content** obligation |
| **R5-12** — the bar's third condition | **AC-728** amended, **AC-663** gains the consequence: `operations.backlogByQueue` sorts breached-first and bars the open count, so it carries no bar. Re-sorting to make the bars behave was correctly refused by the build |

**Applying AC-729 to all eight boards found a third violation the ruling does not name.**
§18.2 cites Management › Overview at seven and Admin › Overview at four. **Performance is four**
(§6.1) and `4 mod 3` is 1, so it renders `3 + 1` at the D2 minimum exactly as Admin does. Six boards
satisfy the rule — Support 6, Operations 8, Risk 6, Growth 6, Zones 6, and Management › Overview at
six if **Q-D18** answers *no*. **Three do not**, and all three are content decisions:

| Board | Tiles | Permitted? | The decision |
|---|---:|---|---|
| Management › Overview | 7 | **no** | **Q-D18** (was Q-D17): its seventh is the captain census |
| Admin › Overview | 4 | **no** | regains two tiles with stores, or drops to three. Belongs with **Q-D16** |
| **Management › Performance** | 4 | **no** | **not named in §18.2.** Drops to three or regains two, and it interacts with **Q-107** — §6.1 |

> **SUPERSEDED on the fourth and fifth passes — it is five boards, not three, and they resolve into
> three decisions rather than five.** Growth and Zones each render seven and neither was counted
> here. The corrected table is at **AC-729**; the resolution is §21.8. **Left standing with this
> note rather than rewritten**, because the sequence — two, then three, then five — is the finding,
> and a table quietly corrected to the right answer hides that every pass which relayed the number
> instead of re-deriving it got a different one.

**`avgRenewalRate` is settled and it is a derivation, not an absence.** Full working at §6.1. Short
form: §18.5's refined test asks whether the measure **as specified** is computable, `Rider.renewalRatePercent` exists and is populated, and it is. What it lacks is a stated denominator — **6 of 7
subscriber riders carry a reading, 8 of 13 riders overall, and the two means differ by six points**
— which is **L-4**'s silent drop, and which **AC-730** now requires the tile to disclose. **The
reported figure of "3 of 13" does not reproduce at this tree**; the pairing is printed in §6.1 and
takes one pass over `src/data/fixtures/riders.ts`.

**One order-of-reasoning note, because it would be easy to get backwards.** Performance being an
illegal count is *not* a reason to delete `avgRenewalRate`. A grid rule deciding a measurement
question from behind is how a board ends up with the tiles that happened to fit rather than the
tiles that answer its question — which is the failure §1 of this spec was written about. If Q-107
retires the tile, three is legal as a **consequence**; that is not the same as three being the goal.

**And one thing R5-11 does not do, said as plainly as §1.5 said its own version.** The contact-
reasons card now renders its heading over one grey sentence instead of vanishing. **That makes the
gap visible. It does not make the board fuller, and it does not answer the owner's complaint** —
§1.1 does, and only a contact log closes it. The ruling's own argument is that the visible card *is
what gets the log built*; that argument is only true if somebody then builds it. **Q-115.**

### 21.7 The third R5 pass — R5-13, R5-14, and a correction that strengthens the rule it corrects

Four rulings land here: **R5-13** (the label names the population), **R5-14** (the population is
declared in the contract), **R5-9 corrected** (the caveat's guard, rewritten the way §4.2 was), and
**R5-11a** (the awaited store is a named value, not a boolean). Two criteria are rewritten, one is
new, and one is extended.

| Ruling | Where it lands |
|---|---|
| **R5-13** — label names the population, caption names the base | **AC-730**, rewritten. My version put the denominator in the caption alone, which is one layer short: a caption is read second, so a mean whose population is only in its caption is quotable without it. It is **AC-715**'s own division applied to a mean. The drilldown moves with the population by **AC-607** |
| **R5-14** — an aggregate declares its population | **AC-731**, new. Three clauses mechanically checkable; **the fourth is a review obligation and is written as a note that says so**, per §20.3's discipline and `DECISIONS.md` *PRACTICE* — an unenforced clause that reads like an enforced one is the line a reviewer trusts instead of checking |
| **R5-9, corrected** | **AC-674**, rewritten: prohibitions first, then a pointer to the gating metric instead of a copied threshold. The guard is no longer prose in a document nobody opens at fixture-writing time |
| **R5-11a** | **AC-726**, extended: the *deliberately not here* table also governs cards, and the store a card waits on is a named value with a table entry — a free string there would be `''` or `'TODO'`, which is the failure R5-7 deleted |

**Two corrections to R5 §22.1, and both make R5-14 stronger rather than weaker.** Full working at
§6.1.

**The 6-set is nameable.** §22.1 searched `subscriptionIds`, found no predicate, and concluded the
set could not be named. The predicate is `Rider.status === 'subscriber'` — 7 riders, 6 with a
reading, 63.3. **A conclusion about a set drawn from the failure of a search over one field** is the
same shape as the thing being ruled on, which is worth saying because this document has now produced
that shape four times in four different roles.

**And `Rider.status` is the active-subscription join, so §22.2's "uncomputable" row is computable.**
`types/rider.ts:7`–`:22` says the field is derived from `subs.length`, and `fixtures/riders.ts:63`
shows it applied in the harder direction: RDR-2087 holds a **cancelled** subscription and is
`on-demand`. It was materialised for the reason §8.2 gives — *a derived value computed in three
screens produces three answers*.

**So the 62.0 / 63.3 gap is one definition and a fixture defect, not two definitions.** `RDR-4001`
and `RDR-4003` carry `status: 'subscriber'` with `subscriptionIds: []` and no stated reason.
Remove those two and the subscriber mean is 62.0 — the `subscriptionIds` figure exactly. Recorded as
**L-12**, owner mock-data-engineer. **The real choice is two populations, not four: all riders with
a reading (69.5) or subscribers (62.0), seven points apart, both nameable, both declarable.**

**And it is the worked case for AC-731's review obligation.** With `sourceResource: 'riders'`
declared, all three mechanical clauses pass — and the label word `subscriber` still resolves through
a field that disagrees with its own definition on two rows. **No test on this criterion would have
caught it**, which is exactly why the fourth expression is written as a note that says it is not
enforced rather than as a clause that looks like it is.

**What this pass did not do.** It did not answer **Q-107** and did not adopt the designer's
recommendation of *No*, which is theirs and is recorded as theirs. **Copy and criteria are final for
both branches**, so nothing waits on it. It also did not use Performance's tile count as an argument
about the measure: **Q-107 answering *No* lands Performance on three and closes one third of V-6 at
no cost**, which is a reason to put it in the same sitting as Q-D16 and Q-D18 — and not a reason to
prefer an answer. A grid rule deciding a measurement question from behind is how a board ends up
with the tiles that fit instead of the tiles that answer its question.

### 21.8 The fourth R5 pass — five boards, not three, and the count nobody re-derived

**AC-729 is violated by five of eight boards.** Successive passes said two (R5 §18.2), then three
(mine, §21.6), then five. **The three that were never counted are the worse half**: Management ›
Growth and Market & Zones each render seven alongside Management › Overview, and the built grid
takes four columns **only when four divides the tile count** — `MetricTileRow.tsx:70` — so seven is
three-across at **1440 as well as 1280**, while four is clean at 1440 and ragged only at the floor.

**§21.4's table said Management › Overview renders `4 + 3` at 1440. It renders `3 + 3 + 1`.**
Corrected in place with the retraction visible. **My error was reading the grid from R5-8's diagram
— *4-up ≥1344, 3-up below* — instead of from the component**, which chooses its column count from
the tile count for a reason its own comment gives from the reference: *a trailing row of two under a
row of four reads as a layout that ran out.*

> **The transferable part is not "count carefully".** Four passes counted this and produced three
> different answers, and each pass relayed the previous number for the boards it was not looking at.
> **The count is one `grep` over `subTabId` in the metric seed and the shape is one read of one
> component**, and every pass that re-derived got it right for the boards it re-derived. **A number
> inherited across a document boundary is a claim, not a measurement** — which is the same finding
> as `3 of 13` in §6.1 and the same class as `DECISIONS.md` *PRACTICE*'s stale-claim propagation,
> arriving now for the third time in this ruling cycle on three different quantities.

**Two enumeration divergences found by the same count, and both are mine.**

- **§8.1 listed six Growth tiles and the board renders seven.** §5.4 relocated `Registered riders`
  to Growth as *"a cumulative census is an acquisition number"* and **never wrote it into §8.1's
  table.** A relocation note is not an enumeration. Added, ranked last.
- **§9.1 listed six Zones tiles and the board renders seven.** `Worst demand-to-supply ratio` is
  named by **R4-12** by name and is the only `ratio`-unit tile in the product. Added.

**That is V-6's shape on two more boards, and the visual audit found it on one.** **AC-726** was
written for exactly this and now has three instances rather than one.

**What went to the owner, and why it is one question rather than five.** **Q-D18** asks the owner to
ratify one rule and one ordered consequence, with the cut named for each of the five boards — and
**every cut is a tile this spec had already ranked last or already called the one to cut first**,
before R5-10 existed. Q-D17 is subsumed — **and retired outright on the fifth pass, §21.9**; Q-D16
keeps its removal subject and hands its Admin-count half over. **Performance is not an independent choice**: it is downstream of **Q-107**, and the
*No* branch lands it on three at no further cost — which is a reason to answer Q-107 in the same
sitting and **not** a reason to prefer that branch.

**And the guard went into the criterion, not just into the question.** **AC-729** now says in its own
text that *the permitted counts constrain which tiles are cut and never decide whether a measure
earns a tile.* Five boards out of conformance is enough pressure to start cutting whichever tile
makes the arithmetic work, and that is how a board ends up with the tiles that fit rather than the
tiles that answer its question — §1's failure, arriving from the layout side.

**One thing raised for product-designer rather than resolved.** **R5-10's permitted set is narrower
than the built grid requires.** `n mod 4 ≠ 1` **and** `n mod 3 ≠ 1` gives {2, 3, 6, 8}; the grid
renders ragged exactly when `n mod 3 = 1`, so **5 and 9 are clean too** (`3 + 2`, and three rows of
three). Complying with R5-10 always renders clean, so nothing shipped is unsafe — the owner simply
has fewer landing points than the grid allows, which matters on a board choosing between dropping a
tile and adding one. **R5-10 is a ruling and this is a spec: recorded, not overruled.**

**Recorded, not claimed: AC-674's caveat has never rendered on real data.** Its gating metric has no
value, so the arithmetic resolves the caveat to nothing and all four of its tests use a constructed
fixture. Named as a state with no worked instance, on the same footing as
`Nothing to rank for this period.` under AC-714 — and it is a live example of **AC-731**'s point
that a criterion can pass every mechanical check while the thing it governs has never been seen.

### 21.9 The fifth R5 pass — the pair, the layer, and two things that may not be claimed

**Four changes, and the first is a better answer than the one I wrote.**

**1. Five boards resolve into three decisions, and the reframing came from §5.4's own text.** My
fourth-pass framing asked the owner to ratify one rule and then listed five board-level cuts — which
is five questions wearing one number. **The principle was already in this spec** (§5.4: *a
cumulative census is an acquisition number, not a board number*) **and this spec applied it as a
move.** Overview 8 → 7, Growth 6 → 7, one edit.

> **A move is count-neutral. One board's fix became another board's defect.** Applying the same
> principle to the captain census would have done it a third time — and *"relocate the census"* is
> exactly what a fourth pass would have proposed. **A relocation rule cannot resolve a count problem
> across a pair of boards. Only a cut can.**

So the question is not *where does a census live* but **does a cumulative census render as a tile at
all** — **Q-D18**, one answer, both boards. **Q-D17 is retired into it**, not left standing:
its subject was one board's instance of a principle governing a pair, and **a superseded question in
a signature register is the stale-status defect this project has now corrected three times**, sitting
in front of the business owner. Every stale `Q-D17` reference in this spec is redirected in the same
edit. **Zones and Admin stay per-board calls; Performance is Q-107's.**

`Active captains` is also decided a second time, independently of any count: **AC-603** puts a
captain census on **Operations**, whose subject is supply. And the cross-check that rides on it —
`metrics.test.ts` asserting the tile equals `listDrivers({ status: 'active' }).total`, which is what
stops four legacy screens disagreeing about one number (`:6903`) — **belongs to whichever board keeps
the tile. It is a reason to carry the assertion across, not a reason to keep the tile.**

**2. AC-713 names its layer, and the reason it gives for the params rule is not the reason first
argued.** The criterion said *what* must happen and never *where*, and **a rule that names no layer
will be applied at the wrong one.** It now says: the fixture carries the raw value, the dictionary
carries the pattern, the render layer — the only one that knows the language — substitutes and
formats. **The Arabic-Indic-digits argument is withdrawn: AC-717 already forecloses them**, so that
divergence never arrives and a criterion resting on it would not survive contact with its own
neighbour. **The reason that holds is structural — a fixture never knows the language**, so a value
formatted before the language is known is frozen in one locale while grouping separators and
percent-sign placement are decided at render time. AC-727 carried the old wording and is corrected
with it.

**3. Two things that may not be claimed, both recorded as states with no worked instance.**

- **AC-674's caveat has never rendered on real data.** Its gating metric has no value, the arithmetic
  resolves the caveat to nothing, and all four tests use a constructed fixture. Same footing as
  `Nothing to rank for this period.` under AC-714 — and a live example of **AC-731**'s point that a
  criterion can pass every mechanical check while the thing it governs has never been seen.
- **Every RTL result in this cycle is a claim about *direction*, not about translated text.**
  **AC-716** now requires a claim of Arabic correctness to say which of the two it checked. V-4's
  head-truncated Latin name, V-9's `<bdi>`-less sub-label and R5-7's direction split are all
  direction findings taken against **English** strings in a mirrored tree. That is real and it is
  half the obligation; the other half — what a 38-character caption and a wrapping caveat do at 13px
  in Arabic — **is not checkable until an `AR` dictionary exists**, and R5-4 already says the fit
  check is per string rather than per rule. Naming the two apart stops the second being counted as
  done when the first passes.

**4. Two enumeration divergences of my own, closed.** §8.1 listed six Growth tiles against seven
rendered — §5.4's relocation note was never written into §8.1's table, and **a relocation note is not
an enumeration**. §9.1 listed six Zones tiles against seven — `Worst demand-to-supply ratio`, which
**R4-12** rules on by name. Both added and ranked. **AC-726** now has three instances of the
divergence it was written for, and the visual audit found one.

### 21.10 The sixth R5 pass — a corrected rule, and a sort that never ran on its own test

**Two things arrived and only one of them is small.**

**1. R5-10 corrected, and the correction lands where it matters.** The permitted set is
**`n mod 3 ≠ 1` — 2, 3, 5, 6, 8, 9, 11, 12** — and the `mod 4` clause never binds, because a count
that would render `4 + 1` never reaches four columns in the first place. I raised the discrepancy on
the fifth pass from the arithmetic; **the designer settled it by enumerating every `n` from 2 to 13
through the component's actual branch**, which is the right way round and the reason the answer is
trustworthy rather than merely agreed.

**The consequence is Admin, and it is the difference between a decision and a bind.** Under the old
set a four had to become **six** — two more measures with stores, on a board that had just lost
three to §11.2, so *"find two more"* was close to asking for the tiles that had been removed.
**Five is one tile away.** Performance's four gets the same relief on Q-107's *Yes* branch. The
three sevens are unaffected: 6 and 8 were their neighbours under both sets. **Q-D18 was never
count-constrained** — cutting one census from each of Overview and Growth lands both on **six**,
clean under both sets — so the census question could always be answered on its merits, which is what
the framing was for.

**2. §11.2's sort was never run on §11.2's test, and the predicate it did run was mine.**

> **The test asks whether a measure has a store. §21.4 keyed on `value: null`.** A tile with a
> hand-written number and no store passes the second and fails the first, **so every literal-backed
> tile survived a sort designed to remove exactly them.**

The conjunction was the error — I required *unsourced* **and** *empty*, when unsourced is the whole
test and empty is a different question with its own two answers. **The corrected candidate set is
`sourceResource: null`: fourteen seeds, twelve of them carrying a literal**, re-derived at this tree
and listed in §21.4.

**This spec already carried the rule that the filter contradicted.** §4.1 **Q-102**: *"a seeded
literal is a `NEW DATA` metric wearing a number."* **A number in the seed is exactly what Q-102 says
to be suspicious of, and I built a filter that read it as proof of a store.** **AC-602** does not
close the gap either — it forbids a value hardcoded in a component or a copy string, and a seed
literal is in neither. **The rule was in prose, the filter pointed the other way, and no criterion
sat between them. AC-732 now does**, and it is stated as the mechanical form of Q-102 rather than as
a new idea.

**I did not publish the split, and that is deliberate.** Which of the fourteen have a computable
store is §11.2's test applied case by case, **§11.2 is product-designer's**, and it has gone to them
as a ruling question with the working in the `fixtures/metrics.ts` header. **Re-deriving a number
here to be first with one is how this cycle produced three different tile counts.** What was mine is
the predicate; it is corrected in place with the wrong version left visible. **F-17** carries the
rest.

**And the engineer's refusal to set `sourceResource` on those fourteen is right and worth recording
as a principle, not a note.** Naming a resource on a measure that has none would make **R5-14**'s own
cross-check **runnable and false** — a check that executes and passes on a lie. **That looks audited
and is worse than silent**, and it is the same class as the false ✓ `DECISIONS.md` *PRACTICE* was
written about: the danger is not the missing check, it is the check a reviewer trusts instead of
looking.

**3. The ordering, stated once so it is not negotiated per board.** A corrected sort moves four
boards' tile counts, and those are the counts **Q-D16**, **Q-D18** and **AC-729**'s table are about.
**Their subjects are untouched** — both censuses derive from declared resources, and *do no-store
tiles leave* is the same question with a longer list — **so the principles are answerable now and
the landings are not.** Both register entries carry that banner.

> **AC-729's guard says a count may not decide what a measure is. The converse is the same rule:
> a count may not be ratified before the content that determines it.** One is a rule about
> arithmetic pressure on content; the other is a rule about sequence. Writing only the first and
> then ratifying a count list early would have broken the second while quoting the first.

**4. AC-533, in the auth spec, counted a different noun from its own copy.** *"After 5 resends"*
against *"Five codes were sent for this sign-in."* — **five resends is six codes.** The shipped
`MAX_CODES_PER_CHALLENGE = 5` happens to satisfy both literal readings, which is why nothing failed
and why it would have been re-litigated by whoever read one and not the other. **The noun is
`codes`**: an operator can count the codes that arrived on their phone, and nobody can count
*resends* without first deciding whether the opening code was one — which is the ambiguity that
produced the off-by-one. Criterion, state row and string now name the same quantity as the constant.

**Both fifth-pass closures were confirmed rather than re-opened**, and neither needs restating here:
retiring Q-D17 outright rather than marking it absorbed, and giving AC-713 a three-layer statement
with the mock-data handoff corrected at the same time rather than at the point the error was
noticed.

### 21.11 The seventh R5 pass — the questions are held, and D15's evidence arrives

**The hold is the substance of this pass and it reverses my own sixth-pass framing.** I wrote that
Q-D16's and Q-D18's *subjects* were answerable and only their *landings* were provisional. **That was
true of Q-D18 and not true enough of Q-D16**, whose entire subject is which tiles leave — asked
against a tile list the corrected sort is about to change.

> **A count question asked against a tile list known to be wrong is worse than no question, because
> the answer arrives with the owner's authority and outlives the list.** *"Which tile leaves
> Growth?"* asked of a seven-tile Growth about to become a three-tile Growth is answering a question
> that will not exist.

Both are **HELD** in `DECISIONS.md` with the reason and the dependency named, and marked in the
register table rather than deleted — a question that disappears is a question that gets asked again.
**AC-729**'s board table is frozen with the same note.

**The predicate defect is larger than the four counts I scoped it to.** Eight further tiles go:
**Growth 7 → 3**, Zones 7 → 6, **Admin 4 → 2**, Support › Fairness 3 → 2, and Risk 6 → 4 if its two
sort as no-store. **Risk is the only one of the five that lands off a permitted count**, which is
the reason to sort those two first rather than a reason to worry about the others.

**And the finding underneath is not a count at all.**

> **Growth at three and Admin at two are not boards short of a tile. They are `07-rulings-r4.md`
> §11.3's shape, in §11.3's words, for §11.3's cause** — *"a sub-tab whose entire rendered content
> is one tile is a page an operator opens once."*

**§11.3 argued the merge from one board's literals and recommended D15, which has sat unanswered
since R4. It can now be argued from four, and nobody constructed that argument — a corrected sort
produced it.** That is the strongest form the argument could have taken, and it is worth naming why:
**a recommendation assembled to support a position is worth less than one that falls out of running
an existing rule properly.** D15 is now in the register as the decision that unblocks the counts,
with the evidence table, and **Q-114 — my own *"I am not recommending it today"* — is withdrawn**,
not because I changed my mind but because the thing I was waiting for arrived.

**The sequence, and it is the whole ruling:** **D15, then the per-tile disposition report, then the
counts.** Deciding tile counts for Growth and Zones before deciding whether Growth and Zones are
sub-tabs is deciding the furniture before the room.

**One thing I put in the D15 entry that is not in the ruling, because it is the failure mode a merge
invites.** A merge is an **IA** decision and **it does not retire a measure.** A tile that survives
the sort survives the merge and lands on whichever board keeps its question. **AC-729**'s guard and
its converse both bind here — a layout decision may not decide what a measure is, and a count may
not be ratified before the content that determines it. **Q-107 and Q-115 stay open on their own
merits regardless of how D15 lands.**

**Two criterion holes closed, and both are the sort's defect wearing a different hat.**

**AC-602 enumerated two layers and the literals came through a third.** *"Hardcoded in a component
or a copy string"* — and `src/data/fixtures/metrics.ts` is neither, so **fourteen tiles satisfied the
criterion while being exactly what it exists to prevent.** **L-1** recorded the legacy habit (seven
hardcoded KPI strings at `:931`–`:938`) and named this criterion as the guard against inheriting it;
**it was inherited through the layer the guard does not name.** The criterion is rewritten in the
positive — *changing the collection changes the number* — because that is checkable by doing it,
where *no value is hardcoded* asks a QA engineer to prove a negative over an open set of places a
number could be written. **An enumeration of layers is the same shape of mistake as the conjunction
in the sort predicate: both listed the cases in front of them and called it a definition**, which is
R5-4's own diagnosis of §4.2, arriving for the third time in this cycle.

**And R4-11 §11.2 already contained the answer.** *"An em dash is a claim that the number exists
somewhere, and a tile backed by a hardcoded literal is a stronger claim than that: it is a wrong
number presented as a right one."* **The literal is the case the ruling singles out as aggravated,
and the sort never looked at it.** That clause is now in **AC-732**, so the ordering of the three
absences is stated where a builder reads it: nothing rendered for no store, an em-dash and a reason
for no current value, and **a literal making the strongest claim of the three.**

**R5-15 arrived while this pass was being written, and it changes two of my criteria rather than
adding a third.** *"A rule about whether a measure **exists** cannot be implemented as a test on
what the fixture happens to **contain**"* — `value: null` and `value: 7` are both seed states. **The
predicate has now been implemented twice and keyed on a seed property both times**, which is what
makes the declared field the rule: **R5-14 is §11.2's missing half, not a separate obligation.**
**AC-731** now says the resource is *required* on an aggregate and that its absence **is** the tile
not rendering — not a gap to fill later — with the one exemption named where a reader will look for
it: `Contribution margin` is a margin out of the pricing formula rather than an aggregate over
records, so it declares nothing and that is correct. **AC-732** carries the seed-state line and the
mechanical disposition. **I did not restate the magnitude table in either document** — it is the
ruling's and `DECISIONS.md`'s, and two copies of a count in one project is how this cycle's count
changed three times.

**And one correction to my own §6.1, from the practice note the designer wrote in the same file.**
I recorded **L-12** and said AC-731's fourth expression — the review obligation — was what covers
it. **It is not.** AC-731 declares a metric's *resource*; it says nothing about a predicate within
that resource or about a record's internal consistency, **so it would not have caught two riders
whose `status: 'subscriber'` contradicts their empty `subscriptionIds`.** What catches that is a
**fixture invariant** — `status === 'subscriber'` if and only if `subscriptionIds` is non-empty — a
third check in a third place, and a corollary of nothing. **L-12 now says so.** A rule credited with
a defect it would have missed retires a gap that is still open, which is the false-tick failure
applied to causation.

**AC-533 was closed on the sixth pass** — the noun is `codes`, and the criterion, the state row and
the string now name the same quantity as `MAX_CODES_PER_CHALLENGE`.

### 21.5 What I deliberately did not touch

- **No AC was renumbered and none was inserted.** AC-725 – AC-731 are appended at §15.15, in a range
  nothing claims. The double-allocated 300–344 band between waves 2 and 3 is not this spec's to
  touch and was not touched.
- **No criterion is ticked.** `DECISIONS.md` *PRACTICE* forbids it and the failure rate that produced
  that rule was two of three. Where this pass changed a criterion, it says what the criterion now
  requires and stops.
- **Layout stays the designer's.** R5-8's section grid, R5-6's 4px bar on `--chart-series`, R5-5's
  middot join and the `<bdi>` on the sub-label (V-9) are all applied *to* this spec and none is
  re-decided in it. §13.1's *"tiles, then charts, then breakdowns"* still reads correctly under the
  new grid, which is why it is unchanged.
- **The `severity` tie-break (R5-3) touches no criterion here.** Notice selection is R4-4 §4.3 and
  this spec never wrote a criterion about it. Recorded so the absence is deliberate rather than an
  oversight — and **nothing downstream may record that clause as verified.**
