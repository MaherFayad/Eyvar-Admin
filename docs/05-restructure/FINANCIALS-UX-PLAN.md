# Financials UX plan — the board idiom on Overview and Revenue, and the other five sub-tabs

> **Owner:** product-designer + frontend-engineer. **Consumers:** mock-data-engineer (three seam
> changes), api-contract-steward (`docs/07-api/`), i18n-arabic-engineer (about 60 keys),
> qa-engineer and visual-qa-engineer (two new harnesses).
>
> **Inputs.** Two target frames supplied by the owner on 2026-09-04: a Financials Overview drawn
> in the metric-board idiom (deep-green band, chapters with deltas, two day-charts, two ranked
> lists) and a Revenue master-detail (a plan list with sparklines, a plan detail with four tiles,
> a bars-plus-line day chart, a composition bar and a refunds list). Every finding below cites a
> file and line that was read, or a Chromium capture at 1280px taken from the dev server.
>
> **Precedence.** `docs/RULINGS.md` governs. The Amplitude override applies to the report builder
> and the `getMetricBoard` boards only; Financials is neither, and this plan does not assume it.

---

## 0. What this plan decides, in one screen

| # | Decision | Where |
|---|---|---|
| **F-1** | Financials Overview is rebuilt from the metric-board component set already in `src/components/metrics/`. Nothing new is drawn for it except one `DecisionList`. | §3 |
| **F-2** | `FinancialsOverview` grows a **comparison window** and **two daily series**. Every delta and every plot on the new Overview comes from that one read, so AC-346, AC-347 and AC-353 hold by construction. | §2, §3.1 |
| **F-3** | The opening rule in `Figures.tsx` ("a Financials figure is not a `Metric`") is **amended, not broken**: its premise was that a figure had no series and no comparison. Once the response carries both, a `Metric` derived from it is not the hand-written literal AC-346 forbids. Recorded in `DECISIONS.md`. | §3.2 |
| **F-4** | R10 holds: the refused-postings condition stays a **banner** with its action. The band's lede states the period and the comparison basis only. The target frame's lede sentence about refused postings is not reproduced. | §3.3 |
| **F-5** | The lede never says **"closed period"** until Q-F8 is answered. | §2.4 |
| **F-6** | Revenue & Refunds finally adopts the **VW-3 view list** (`Revenue by plan` default). The `Revenue by plan` view becomes a master-detail with a `Charts | Table` segmented control; the existing `DataTable` with its AC-355 total row is the `Table` mode. | §4 |
| **F-7** | Per-plan **categorical colour is not used** in Financials. Sparklines and the composition bar are single-hue. The owner may extend the Amplitude override; until then this is the rule. | §4.3 |
| **F-8** | Four defects found while capturing the screens are fixed **first**, in one small change, before any of the above. | §1 |
| **F-9** | The other five sub-tabs get a **figure strip** above their tables where a lead figure exists in the data already, a **column preset** where a column collapses at 1280, and a banner tone correction where a condition is "waiting on them". | §5 |
| — | Six things this plan refuses to decide, each with an owner | §7 |

---

## 1. Phase 0 — four defects, one change, before anything else

All four are visible in the 1280px captures and each is one to five lines.

| # | Where | Defect | Fix |
|---|---|---|---|
| **P0-1** | [OverviewScreen.tsx:109](../../src/screens/financials/overview/OverviewScreen.tsx#L109), [LedgerControlsScreen.tsx:167](../../src/screens/financials/ledger/LedgerControlsScreen.tsx#L167) | The **refused-postings** banner reuses `fin.overview.outOfBalance.body`, which says *"Total debits and total credits disagree."* On the Ledger capture the footer beneath it reads *Debits 15,754.93 · Credits 15,754.93*. The banner contradicts the page. | New key `fin.overview.refused.body`: *"Every refused posting is kept and can be read. None of them is in these totals."* Arabic entry. |
| **P0-2** | [PayoutsScreen.tsx:243-256](../../src/screens/financials/payouts/PayoutsScreen.tsx#L243-L256), [CashScreen.tsx:170-185](../../src/screens/financials/cash/CashScreen.tsx#L170-L185) | Both critical banners render **no action**, while `fin.payout.failed.action` (*Show only returned*) and `fin.cash.escalated.action` (*Show only escalated*) exist in `copy.ts:347` and `:620` and are read by nothing. AC-367 and AC-378 name the control. | Wire `actions: [{ label, onClick: () => table.setFacet(...) }]` on each. |
| **P0-3** | [CashScreen.tsx:175](../../src/screens/financials/cash/CashScreen.tsx#L175) | *"One report is with Trust & Safety"* is `tone: 'critical'`. It is a report **someone else owns**. R17: separate "waiting on them" from "waiting on you" by label, and R5a licenses one red banner for a condition the operator must act on. | `tone: 'info'`. |
| **P0-4** | [RevenueScreen.tsx](../../src/screens/financials/revenue/RevenueScreen.tsx) `VIEWS`, `DEFAULT_VIEW = 'all'` | The default tab is labelled **All postings** and renders the `contra.refunds` ledger; the tab labelled **Revenue** renders *Revenue by plan*. `design/10 §9` row 4 already records this and VW-3 rules it. The capture confirms it is still shipped. | Views become `Revenue by plan · Refunds · Refunds ledger · Credit notes · Contribution margin`, default `by-plan`. Keys `fin.revenue.view.byPlan`, `.refundsLedger`; `fin.revenue.view.all` and `.revenue` deleted; Arabic updated; `npm run i18n:keys`. |

Also in Phase 0, because it is the same file and the same idiom: the `Contribution margin` view's sum card ([RevenueScreen.tsx](../../src/screens/financials/revenue/RevenueScreen.tsx), `ContributionMarginView`) renders five `FigureRow`s **without operators** while Overview's identical card carries `−`, `=`. AC-347 says the two are the same number; they should be the same card. Add the operators.

---

## 2. What the data layer cannot say today, and what it must

The target frames state six things `FinancialsOverview` ([types/financials.ts:53-99](../../src/data/types/financials.ts#L53-L99)) and `RevenueByPlanRow` cannot.

### 2.1 A comparison window

Every delta in both frames (*+6.2%*, *−0.4 pts*, *+7.1% vs prior*) is a comparison with the **previous window of equal length**. The response has no prior values.

**Add to `FinancialsOverview`:**

```ts
comparison: {
  period: FinancialsPeriod          // the previous window, server-chosen
  grossBookingsHalalas: Halalas
  captainEarningsHalalas: Halalas
  promoHalalas … emergencyCoverHalalas   // the six giveback lines
  pendingPayoutsHalalas … riderWalletLiabilityHalalas  // the five balances AS AT comparison.period.end
} | null
```

`null` when the server has no prior window (first month of trading). The mock computes it by running the same `accountFlowFrom` flows over `shiftPeriodMonths(period, −1)` and `accountBalanceFrom` over entries posted up to the prior end. **Derived margins are not on the comparison either** — `marginBreakdown()` runs on both halves, so AC-347 still has one implementation.

Positions compare as **balances as at two dates**, and the caption says so: *vs 31 May* (TL-1: a position tile states no period).

### 2.2 Two daily series

The Overview frame draws *Gross bookings by day* and *Contribution % by day*. Journal entries carry `postedAt` ([types/ledger.ts:347](../../src/data/types/ledger.ts#L347)), so the mock buckets per day with the same window filter `accountFlowFrom` uses.

**Add to `FinancialsOverview`:**

```ts
daily: Array<{
  date: IsoDate
  grossBookingsHalalas: Halalas
  captainEarningsHalalas: Halalas
  givebackHalalas: Halalas
}>
```

Contribution % per day is **derived** in the adapter (`percentOrNull(gross − earnings − giveback, gross)`), `null` on a zero-gross day, so AC-342's em dash rule survives into the plot as a gap rather than a `0%` point.

**One honest consequence.** The June fixtures are lumpy: 33 entries on 25 Jun, 21 on 24 Jun, 12 on each of 15 and 19 Jun, and eleven days with none (`grep -o "postedAt: '2026-06-.."` over `fixtures/ledger.ts`). The daily plot will show that. The target frame's smooth curve is a drawing; the chart shows the books. Do **not** smooth or seed a daily series to make the picture nicer — that is the D-F19 stored-derivation defect in a new coat.

### 2.3 A target for contribution %

The frame prints *under the 12.0% target on all 30 days*. `MetricComparison` already has a `target` arm ([types/metrics.ts:108-125](../../src/data/types/metrics.ts#L108-L125)) with an owner and an effective date. **Nobody has set a Finance target.** The adapter emits `previous-period` for every lead; the `target` arm is wired the day Admin › Operational Policy carries one. Open question, §7.

### 2.4 "Closed period"

**Q-F8 is open** ([types/financials.ts:24-32](../../src/data/types/financials.ts#L24-L32)): nobody has said whether a period closes. The lede reads *"1 to 30 June, measured against 1 to 31 May"* and nothing about closure. When `closedAt` lands on the type, the lede gains the word.

### 2.5 Per-plan detail

The Revenue frame needs, per plan: a daily gross and contribution series, a prior-window row, and the refunds that landed on that plan. `RevenueByPlanRow` is a server aggregate whose values are literals in `fixtures/financials.ts:172-214`; `Refund.relatedId` is a subscription or trip id, not a plan.

**Add a read rather than fattening the index row:**

```
GET /api/v1/financials/revenue/by-plan/:planId   params: from · to
  -> PlanRevenueDetail {
       row: RevenueByPlanRow
       comparison: RevenueByPlanRow | null      // same plan, previous window
       daily: Array<{ date, grossHalalas, contributionHalalas }>
       refunds: Array<Pick<Refund, 'id' | 'reasonCode' | 'amountHalalas' | 'issuedAt'>>
     }
```

**Fixture invariant, tested:** `Σ daily.grossHalalas === row.grossHalalas` and `Σ daily.contributionHalalas === row.platformHalalas − row.givebacksHalalas` for every plan. That is AC-355's argument applied to the plot: a chart that does not sum to the tile beside it is `12a` R12 again.

The mock joins refunds to plans through `relatedId → subscription.planKey`; a refund on a trip with no subscription lands under `quick-ride`.

### 2.6 Sparkline data for the plan list

Each list row draws the plan's daily gross. Rather than a second read per row, `listRevenueByPlan` gains an optional `include: 'daily'` that attaches the same `daily` array to each row. Four rows, thirty points each; nothing heavy.

Run `npm run api:contract` after each of 2.1, 2.2, 2.5, 2.6.

---

## 3. Overview — the board idiom, and what it is built from

### 3.0 Mapping the frame to what exists

| Region of the frame | Component | Status |
|---|---|---|
| Deep-green band: title, lede, period pill, three lead numerals with deltas | `BoardHero`, `BoardHeroRow`, `BoardHeroItem`, `MetricTile surface="band"` | exists |
| *The period* — six figures with deltas and mono captions | `Chapter` + `ChapterFigures` + `MetricTile` | exists |
| *Where the money is held* — six figures | same | exists |
| *How the month ran* — two day-charts with headline and peak/low facts | `ChartCard` with `headline` | exists; the peak/low facts are `TrendRead` from `formatMetric.ts` |
| *What was given back* — ranked list with share bars and two-part sub-labels | `BreakdownList` | exists; sub-label key `{shareOfGiveback}% of giveback · {shareOfMargin}% of gross margin` |
| *What needs a decision* — three rows, each a link to a sub-tab view | **new** `DecisionList` in `financials/shared/` | small |
| The H5 calculation card (gross − earnings = margin − giveback = contribution) | `FigureRow` with operators | exists; **kept**, see 3.4 |

### 3.1 The adapter, and why it is the whole design

`src/screens/financials/overview/toBoard.ts`:

```ts
export function toBoard(data: FinancialsOverview, language): {
  leads: Metric[]           // gross bookings · contribution margin · contribution %
  period: Metric[]          // gross · captain earnings · gross margin · giveback · contribution · refunds
  positions: Metric[]       // owed to captains · rider wallets · escrow held · escrow ready · captain debt · held in total
  series: TimeSeries[]      // financials.overview.grossByDay · financials.overview.contributionPercentByDay
  breakdowns: MetricBreakdown[]  // financials.overview.giveback
  decisions: DecisionRow[]
}
```

Every `Metric` is built from a field of the response and a field of `comparison`; `deltaPercent` is computed here, once, with `seriesWindowDelta`'s rounding rule so the tile and the chart headline agree. `sourceResource` is `'postings'` for flows and the account key for balances — R5-15 says an aggregate without one does not render, and these are all aggregates. `asOf` is the response's own `asOf` (add it: the read has no computation instant today, and `BoardHero` prints one).

**This is what makes F-3 honest.** The rule at [Figures.tsx:5-13](../../src/screens/financials/shared/Figures.tsx#L5-L13) was written against "minting a fake `Metric` per figure". A `Metric` whose value, comparison and series all come from one server response is not minted; it is the response, typed for the component that draws it. The comment is rewritten to say so and the decision goes in `DECISIONS.md` as **D-F32**.

### 3.2 The screen

```
BoardHero  title=Overview
           lede="1 to 30 June, measured against 1 to 31 May."      ← periodLabel + comparison
           period pill → usePeriod().setPeriod                     ← AC-353 unchanged
           3 leads: Gross bookings · Contribution margin · Contribution %
Banner     (R10: one) — out of balance > refused postings, unchanged precedence
Chapter    "The period"           6 tiles, 3-up; captions are the WORKING, not the period
Chapter    "Where the money is held"   6 tiles, 3-up; captions "Balance to date"
Section    2 ChartCards, 2-up    (border-t, the board's 20px grid)
Section    BreakdownList "What was given back" · DecisionList "What needs a decision"
Card       The H5 calculation, unchanged, last
```

**Captions.** Today six tiles repeat *Period 1 Jun to 30 Jun* and five repeat *Balance to date, outside the period.* — the page meta, eleven times. The chapter heading carries it once (`Chapter.summary`). Tile captions become the reading the frame shows: *81.0% of gross*, *19.0% of gross*, *55.0% of gross margin*, *3 refunds · contra revenue*, *next run 2 Jul*, *2 runs in hold*, *cleared the hold window*, *across five accounts*. Each is a key with parameters, ≤38 characters, never a status (R4-4 §4.2).

**Period control.** `BoardHero`'s pill is `BoardPeriodControl`, whose presets are rolling windows. Financials' `PeriodControl` carries month presets and a month stepper (`periodPresets.ts`). Give `BoardHero` a `periodSlot?: ReactNode` and pass Financials' own control into it, restyled to sit on `--ev-hero-2`. One control, one set of presets, no second calendar.

**Held in total.** The frame adds a sixth position, the sum of the five. It is derived in the adapter and carries the caption *across five accounts*. It is not a GL account and is not presented as one.

### 3.3 What the frame shows that this plan does not reproduce

- The lede's *"Twelve postings are still refused and are excluded from these totals."* That is the banner's sentence (P0-1 gives it the right words). Printing it twice is the defect R10 names.
- The **target** on contribution % (§2.3).
- The word **closed** (§2.4).
- **Trend colour** on the contribution plot: the frame tints it green. `TrendChart` already tints by `metricValence`; contribution % is `higherIsBetter: true` and gets whatever the shared rule gives it. No Financials-specific colour.

### 3.4 The calculation card stays

The frame drops the H5 sum card. It was an explicit owner request (*"the calculations to be more clear"*, recorded in [Figures.tsx](../../src/screens/financials/shared/Figures.tsx) at `FigureRow`), and a Finance lead auditing a contribution figure needs the operands in a column with the operators drawn. It moves to the **end** of the page, under the lists, where a reader who wants the working finds it and a reader who wants the shape is not stopped by it.

### 3.5 States

| State | Band | Body |
|---|---|---|
| loading | title + lede, no figures | `LoadingSkeleton pattern="P5"` |
| error | title + lede | `ErrorState scope="page"` with retry |
| empty (no postings in window, `lifetimePostings > 0`) | title + lede + three leads reading `0.00 SAR` / em dash | one sentence, no illustration (R8) |
| first run (`lifetimePostings === 0`) | title + lede | `EmptyState` with illustration, LR-1 |
| content | as §3.2 | as §3.2 |

`FinancialsOverview` gains `lifetimePostings: number` so the empty split is a lifetime fact, not a query result (LR-3).

### 3.6 Tests and proof

- `overview.test.tsx` keeps its four AC-353 tests; the "every in-period tile carries the window" test becomes "the chapter summary carries the window and no tile repeats it".
- New: *every delta on the band equals the same field's change in the response*; *a zero-gross day plots as a gap, not a zero*; *the decision list links to the view that can act*; *the refused banner never says debits and credits disagree when `trialBalanceBalanced`*.
- `scripts/harness/fin-overview.mjs`: at 1280 and 1440, en and ar, light and dark — two `.recharts-surface`, ≥15 `[data-slot="metric-value"]`, band present, `overflowX === 0`, plot width ≥ 268. Add it to the harness README table.

---

## 4. Revenue & Refunds — the plan master-detail

### 4.0 What the frame is

A **list of plans** on the start side (name, gross, sparkline, subs · trips, contribution %) driving a **detail** on the end side: a header with a mono facts line, four tiles with deltas, *Gross and contribution by day* (bars + line), *Where the gross went* (one 100% bar in three segments with a legend that states amount and share), and *Refunds on this plan* with a refund-rate footer. A `Charts | Table` control and `Export CSV` sit in the header.

### 4.1 Layout at 1280

The frame is 1440 wide. At 1280 the content column is about 912px (1280 − 304 nav − 2 × 32 page padding). A 280px list plus a 20px gutter leaves ~612px of detail:

- tiles are **2 × 2** below `wide:` and 4-up at `wide:`;
- the two lower panels stack below `wide:` and sit 2-up at `wide:`;
- the list is a fixed 280px column, `min-w-0` on the detail, and the day chart keeps R4-1's 268px floor.

There is no master-detail primitive: `DetailPage` is main + 320px rail, the wrong way round. Add `MasterDetailPage` to `PageShell.tsx` (`grid-cols-[280px_minmax(0,1fr)]`, one breakpoint, the list stays a list below it rather than becoming tabs), and say so in the handoff.

### 4.2 Selection and the URL

The selected plan is `?plan=weekly` beside `?view=by-plan&from&to` (foundation §3.8.3: a control over one resource is a search param). Rows are `<button aria-current="true">`; the list is `role="list"`. Arrow keys move selection; `Home`/`End` jump. No plan in the URL selects the first row.

### 4.3 The three drawings, and the colour rule

| Panel | Build | Colour |
|---|---|---|
| Sparkline in the list row | new `Sparkline` in `src/components/metrics/`: recharts `LineChart`, no axes, no dots, `aria-hidden`, a visually-hidden sentence *"gross by day, 1 to 30 June"* | `--chart-series` on every row. **F-7.** The frame gives each plan a hue; the categorical palette is licensed only inside the Amplitude override, and a list whose rows are already labelled does not need colour to tell them apart. |
| Gross and contribution by day | new `PlanDayChart` in `financials/revenue/`: recharts `ComposedChart`, bars gross, line contribution. Both are SAR, so `pairRefusal`'s rule for one axis is satisfied. Axis baseline only, no gridlines — Financials is not under the Amplitude override. | bars `--chart-fill`, line `--chart-series` |
| Where the gross went | new `CompositionBar` in `financials/shared/`: one `role="img"` bar, three segments, and a legend of three `FigureRow`s reading *amount · share*. The legend is the accessible content; the bar is `aria-hidden`. | three opacities of one hue: `--chart-fill`, `--chart-fill-s1` at 60%, `--chart-series`. No second hue. |

`Contribution %` on the tile is `−0.6 pts`, not a percent of a percent. `formatSignedPercent` has no points mode; add `unit: 'points'` handling to `MetricDelta` rather than formatting by hand in the screen.

### 4.4 Refunds on this plan

Rows are `REF-0001 · reasonLabel · amount`; the id is text, not a link (a refund has no profile, AC-474). Footer: *Refund rate {rate} of this plan's gross*, a `percentOrNull` over the plan's gross (em dash on zero). Nothing here duplicates the `Refunds` index view: this list answers *which refunds hit this plan*, the index answers *who, why and where it went*.

### 4.5 Charts | Table

A D12 stadium segmented control in the header. `Table` renders the existing `RevenueByPlanView` `DataTable` and its AC-355 total row, untouched. `Export CSV` is the table's own export in both modes: the CSV is the by-plan table, which is the thing a Finance lead pastes into a workbook. The choice is remembered in the URL (`?mode=table`), not in storage.

### 4.6 The other four views

Unchanged in shape. `Contribution margin` gains the H5 operators (Phase 0). `Refunds ledger` keeps `LedgerCard`. `Credit notes` keeps AC-356's three-part signal.

### 4.7 Tests and proof

- `revenue.test.tsx` keeps AC-355, AC-356, AC-360.
- New: *selecting a plan changes the URL and every detail figure*; *the fixture invariant of §2.5 holds for every plan*; *quick rides renders an em dash for ARPA and no subscription count in the facts line*; *`Table` mode renders the total row and the same four rows*.
- `scripts/harness/fin-revenue.mjs`: 1280 and 1440, en and ar; four sparklines, one composed plot, one composition bar; `overflowX === 0`; the list column is 280px; detail plot ≥ 268px.

---

## 5. The other five sub-tabs

Each entry is what the 1280px capture shows, then the visual fix, the hierarchy fix, and the business fix. Everything cited was in the capture or in a file read.

### 5.1 Payouts & Escrow

- **Seen.** The `Status` column is truncated to *Du* / *Pa* / *Re* and its header to *Sta*; the action lane holds `Pay` and `View ledger` at full width. A critical banner with no action. No period control, although the meta line says *Period 1 Jun to 30 Jun*.
- **Visual.** A column preset (H6): `state` gets `minWidth: 120` and the words render; `View ledger` leaves the lane and becomes the row's open action (D-A / D-B give every row a keyboard path to its record), so the lane holds `Pay` alone. The kebab threshold (D8-b) is unaffected.
- **Hierarchy.** A four-figure strip above the index, from the read the page already makes plus `getFinancialsOverview`: *Owed to captains* · *Net payable this run* · *Due* (count) · *Returned by the bank* (count). Supporting rank, no band. The strip is what the operator settles a period against.
- **Business.** P0-2 wires *Show only returned*. The `Escrow` view surfaces `subscriptionCancelled` holds as a count above the table so Q-F4's gap is visible at the top rather than on row 41. *(Corrected 2026-09-05.)* `listCaptainPayouts`, `listEscrowHolds` and `listDeductions` take `QueryParams` with no window (`payouts.ts:228`), so the index views print **no** period; only the per-captain ledger drill-in (`getCaptainPayableLedger`, `:262`) is windowed and draws the control (TL-2).

### 5.2 Cash & Captain Debt

- **Seen.** Nine columns at 1280: captain names truncate to *Khalid…*, the `Classification` header wraps to three lines, `Decision` is clipped. The escalated banner is red. No period control; meta says *Period*.
- **Visual.** Column preset: hide `Expected` below `wide:` (the deviation carries the meaning and its header says *(SAR)*), give `Captain` `minWidth: 140`, render classification as the existing badge with a `width` that fits its longest label. Decision becomes the action lane.
- **Hierarchy.** Above the debt ledger view: *Outstanding captain debt* (signed total, AC-381) · *Over cap* (count) · *Cap* (server policy, `capHalalas`) as a three-figure strip. The cap is the fact an operator compares every row against; *(corrected 2026-09-05)* it was printed only in the per-captain drill-in header, never on the index.
- **Business.** P0-2 and P0-3. AC-453 stays an absence: no countdown, no due, no breach control. The `repeatCount` sub-line (*2 earlier under-reports*) is the right second fact and stays.

### 5.3 Rider Wallets

- **Seen.** Good density; two inline actions; a warning banner with its action. A checkbox column with no bulk command.
- **Visual.** Nothing to change in the table.
- **Hierarchy.** A view-header figure like `LedgerCard`'s *Balance*: *Rider wallet balances 3,583.30 SAR · 55 wallets · 1 below zero*, from `riderWalletLiabilityHalalas`. The `Goodwill` view adds the operator's own authority envelope (*Daily 120.00 of 300.00 used · 30-day 2 of 10*) from `AuthorityCheck`, so the ceiling is known before the dialog opens rather than discovered inside it (AC-384).
- **Business.** *(Corrected 2026-09-05.)* The selection column is already gone under **D25**; `wallets.test.tsx` asserts its absence. The header comment at [WalletsScreen.tsx:22-40](../../src/screens/financials/wallets/WalletsScreen.tsx#L22-L40) that still argues about it is stale and should be shortened when next touched. Q-F12 in §7 is therefore closed as already decided.

### 5.4 Pricing & Plans

- **Seen.** Three rows under an info banner, most of the viewport empty. Correct tone, correct read-only treatment.
- **Visual.** Nothing.
- **Hierarchy.** Each plan row gains *Gross this period* from `listRevenueByPlan`, and the row's open action goes to `/financials/revenue?view=by-plan&plan=<id>` — the master-detail of §4 is the plan's money page. Pricing stays the catalogue.
- **Business.** Q7 blocks the pricing half and that stays. The `Cancellation fees` view's *Stored, never applied* rows are the honest state (AC-414) and stay.

### 5.5 Ledger & Payment Controls

- **Seen.** A good trial balance. The most important fact on the page — *Debits 15,754.93 · Credits 15,754.93 · 93 entries*, the books balance — is the smallest text on it, in a footer. The refused banner above it says the totals disagree (P0-1). Six views in one row, two of which are configuration.
- **Visual.** Promote the footer to a view header in `LedgerCard`'s shape: *Trial balance · Balanced* in words, the two totals as figures, the entry count as the caption. Out of balance is still the critical banner (AC-416), never a word in this header wearing a colour.
- **Hierarchy.** Group the views: `Trial balance · Journal · Reconciliation · Refused postings` then a divider then `Payment gateways · VAT & invoicing`. One route, one `useScreenViews`; the divider is a `role="separator"` in the tab row.
- **Business.** `getIdempotencyStats` is read at [LedgerControlsScreen.tsx:470](../../src/screens/financials/ledger/LedgerControlsScreen.tsx#L470) and reaches a card on one view; the duplicate-suppressed count belongs beside the entry count in the header, because a suppressed duplicate is a posting that did not double the books.

### 5.6 Cross-cutting

- **The period control is inconsistent.** Overview and Revenue draw it; Payouts and Cash print *Period 1 Jun to 30 Jun* in the meta and offer no control; Wallets and Ledger pass no meta at all *(corrected 2026-09-05: the first draft listed all four as printing a period)*. Either the read honours a window and the page draws the control, or it does not and the meta says nothing about a period (TL-2). Decide per read in the `docs/07-api/` table, then make the screens match.
- **Captions that repeat the page meta** (Overview today, eleven times) are removed everywhere a chapter heading carries the same words once.
- **Every new string** is a key in `financials/copy.ts` with an Arabic entry; `npm run i18n:keys` after each phase. The board components read `metric.*`, `chart.*` and `breakdown.*` prefixes, so Financials' keys are `metric.financials.overview.grossBookings` and so on, kept in the Financials dictionary, not the metrics one.

---

## 6. Sequencing

| Phase | Scope | Depends on | Size |
|---|---|---|---|
| **0** | §1, four defects + the margin operators | — | ½ day |
| **1a** | §2.1, 2.2, `asOf`, `lifetimePostings` on `FinancialsOverview`; mock; `api:contract` | 0 | 1 day |
| **1b** | §3 Overview: adapter, `DecisionList`, screen, states, tests, harness | 1a | 2 days |
| **2a** | §2.5, 2.6: `PlanRevenueDetail`, `include: 'daily'`; fixtures; invariant test; `api:contract` | 0 | 1 day |
| **2b** | §4 Revenue: `MasterDetailPage`, `Sparkline`, `PlanDayChart`, `CompositionBar`, view, `Charts | Table`, tests, harness | 2a, 1b (shares `MetricDelta` points mode) | 3 days |
| **3** | §5, one sub-tab per change, five changes | 0 | 3 days |

Phases 1 and 2 touch different files after Phase 0 and can run in **two worktrees**. Phase 3 is five independent small changes and follows the "small change, one agent" rule in `CLAUDE.md`.

**Before each phase is reported done:** `npm run typecheck`, `npm run test:changed`, the phase's harness against `npx vite --port 4327`, and for 1a and 2a `npm run api:contract`. Phase 1b and 2b also run the full suite once, because `PageShell.tsx` and `src/components/metrics/` are shared layers.

---

## 7. Six things this plan refuses to decide

| # | Question | Owner | Ships meanwhile |
|---|---|---|---|
| **Q-F8** | Does a period close, and may a posting be backdated into a closed one? | product-owner | the lede says *period*, never *closed* |
| **Q-F10** | Is there a contribution % target, who sets it, from when? | Finance lead | `previous-period` comparison only |
| **Q-F11** | May Financials use the categorical chart palette outside the Amplitude override? | owner | single hue everywhere in Financials (F-7) |
| **Q-F12** | ~~AC-382: does the wallet index keep selection with no bulk command, or lose selection?~~ **Closed 2026-09-05:** already decided by D25; the selection column is gone and tested absent. | — | — |
| **Q-F13** | Which Financials reads honour a period window? Each read is either windowed and draws the control, or not and prints no period. | api-contract-steward | screens unchanged until the table exists |
| **Q-F14** | D-F32: amend the `Figures.tsx` rule. A `Metric` derived from a server response with a real comparison and series is not a minted literal. | product-designer to record in `DECISIONS.md` | Phase 1b proceeds on the reading in §3.1; the comment is rewritten in the same change |

---

## 8. Files

| Path | Change |
|---|---|
| `src/data/types/financials.ts` | `FinancialsOverview.comparison`, `.daily`, `.asOf`, `.lifetimePostings`; `PlanRevenueDetail` |
| `src/data/clients/financialsOverview.ts`, `revenue.ts` | comparison window, daily buckets, `getPlanRevenueDetail`, `include: 'daily'` |
| `src/data/fixtures/financials.ts` | per-plan `daily` and refund→plan joins; invariant test beside it |
| `src/screens/financials/overview/OverviewScreen.tsx`, `toBoard.ts` | rebuilt on the board set |
| `src/screens/financials/shared/DecisionList.tsx`, `CompositionBar.tsx` | new |
| `src/screens/financials/shared/Figures.tsx` | the opening rule rewritten per D-F32 |
| `src/screens/financials/revenue/RevenueScreen.tsx`, `PlanRevenueView.tsx`, `PlanDayChart.tsx` | VW-3 views; master-detail |
| `src/components/metrics/Sparkline.tsx`, `BoardHero.tsx` (`periodSlot`), `MetricTile.tsx` (`points` delta) | shared additions, restyled on arrival |
| `src/components/PageShell.tsx` | `MasterDetailPage` |
| `src/screens/financials/copy.ts`, `src/i18n/ar/financials.ts` | about 60 keys |
| `scripts/harness/fin-overview.mjs`, `fin-revenue.mjs`, `README.md` | two harnesses |
| `docs/05-restructure/DECISIONS.md` | D-F32 |
| `docs/07-api/`, `docs/08-i18n/` | regenerated |

---

## 9. Layout and visual treatment — what the captures show, and the moves that close the gap

Everything here was measured on the 1280px captures or read from the target frames. Each item
names the current state, the frame's answer, and the token or component that delivers it.

### 9.1 Overview

| # | Now | Frame | Move |
|---|---|---|---|
| **V-1** | **Thirteen boxes.** Every figure is a white hairline card on the off-white canvas; the two calculation cards are boxes too. The page reads as a grid of containers, not as numbers. | **No box around any figure.** The band is the one strong field; below it the figures sit on the page ground under a section rule. Only the two charts and the two lists are framed. | `Chapter` + `ChapterFigures` with `PLAIN_FRAME`, as the management boards already do. Frames are spent on panels, never on figures. |
| **V-2** | **The unit is as big as the number.** `4,432.52 SAR` renders at 28px/600 throughout, on eleven tiles. | Number 28px; `SAR` and the delta as 12px mono beneath or beside it. The unit is stated once per figure, small, and once per chapter in words. | `MetricTile` already draws value, unit line and delta separately. Pass `unit: 'money'` and let the tile format. |
| **V-3** | **Three type levels:** 32px title, 28px numeral, 14/12px grey prose. Captions and labels are the same grey sentence-case, so a caption reads as prose. | A fourth level: **11px uppercase, tracked** for facts (`SAR · 8,578 TRIPS`, `1 JUN`, `PEAK 28 JUN`). Facts read as data, prose reads as prose. | `text-2xs font-medium uppercase tracking-wider` (the band eyebrow's own classes, `MetricTile.tsx:298`) in `text-muted-foreground`. **In Inter, not a monospace face:** `MetricTile.tsx:291-297` records the owner's ruling that the console keeps its own font; tabular digits already come from `tabular-nums`. **Not `--ev-text-3`:** `globals.css:644` says it is 2.536:1 and never a text colour. **Not blue.** The frame colours captions blue; blue is R3's link colour and a caption is not a link. *(Corrected 2026-09-05 from the first draft, which named the mono face and `--ev-text-3`.)* |
| **V-4** | **Uniform 16px rhythm.** Heading, tiles, heading, tiles, card, card, all `gap-4`. Nothing says where one thought ends. | **A rule per section.** Heading and its note on one line, a hairline to the end edge, 12px inside the section, ~40px between sections. | `SectionHeading title note` + `border-t border-border pt-8` between sections, the board's own 20px panel grid inside. |
| **V-5** | **A hole.** Five position figures in a three-column grid leave the last cell empty. | Six figures, two full rows. | *Held in total* (§3.2). |
| **V-6** | **Half-empty cards.** The two calculation cards cap their rows at 448px (`FigureRow max-w-md`) and leave ~60% of each card as air on the end side. | Lists are **two-up**: *What was given back* beside *What needs a decision*, each half the width, each full to its edges. | Two-column grid for the lists; the H5 calculation card, kept at the end, sits half-width beside the giveback breakdown so neither is mostly air. |
| **V-7** | **The period control floats** on its own row under the banner, a small stepper and a calendar button. | The period is a pill **in the band, top-end**, on the title line. | `BoardHero periodSlot` (§3.2). One row of chrome fewer before the first number. |
| **V-8** | Charts absent. | Two day-charts, two-up, each with a mono peak/low fact under the headline, axis baseline only, mono tick labels. | `ChartCard` with `headline`; `TrendRead` supplies *peak 28 Jun · 204.79 SAR* and *low 6.8% on 7 Jun*. No gridlines: Financials is outside the Amplitude override. |
| **V-9** | The band followed by an orange warning banner will be the two loudest things on the page, adjacent. | — | Accepted. R10 puts the standing condition in one banner and R5a licenses it. Do not soften the banner to fit the band. |

### 9.2 Revenue & Refunds

| # | Now | Frame | Move |
|---|---|---|---|
| **V-10** | **Three rows of chrome** before the first number: view pills, then search + Filter + Columns + Sort + Export, then the table header. | **One header row:** plan name, a mono facts line beneath it, `Charts / Table` and `Export CSV` at the end. | The by-plan view's header is its own; the `DataTable` toolbar appears only in `Table` mode. |
| **V-11** | **Four rows, then 300px of nothing, then a `Total` card** pinned to the bottom of the viewport, 320px below the last row. | Totals live with the rows. | The AC-355 total becomes a **footer row** of the table, the way `LedgerCard` draws its closing balance. The card goes. |
| **V-12** | **Headers wrap** at 1280: *Activ e subs*, *Contri b %*, *Captain (SAR)* clipped. Eleven columns do not fit. | The list carries six facts per plan and the detail carries the rest. | `Table` mode gets an H6 preset: `Captain`, `Take rate %`, `ARPA` hidden below `wide:`. A wrapping header is the tell that a column budget is broken. |
| **V-13** | Rows are `plan name · numbers`. | **A selected row** has a 3px start-edge bar and a tinted ground, the plan name bold, gross at the end on the first line, a sparkline, and a mono facts line with contribution % at the end. | Same treatment as the shell's selected sub-tab (`bg-accent` plus the existing selected-row start-edge marker from `DataTable`; no new arbitrary value). Sparkline `--chart-series`, 28px tall, full row width. |
| **V-14** | — | **Detail tiles are cards**; the Overview's figures are not. | The rule: on a **board** figures are flat under a rule; on a **working page** beside a list and a table they are cards, because the card is what separates them from the table chrome. Both frames follow it. |
| **V-15** | — | The composition bar is one 8px stadium, three segments, legend beneath as `swatch · label · amount · share`. | `CompositionBar` (§4.3). The legend is the accessible content; three opacities of one hue. |

### 9.3 The five table sub-tabs

| # | Where | Now | Move |
|---|---|---|---|
| **V-16** | Payouts | Rows are **~77px tall**: a two-line captain cell plus two inline buttons. Six rows fit under the chrome. Density is the product's stated feature. | One inline action (`Pay`); `View ledger` becomes the row's open action. The tier (*Gold*) is not decision information on this row and leaves the secondary line; *No bank account on file* stays because it is. Target 52px pitch, nine rows. *(Measured 2026-09-05: the lane and the secondary line changed but the pitch stayed at 77px, because `DataTable.tsx:1787` `reserveRefusal` reserves a second line on every row whenever any row on the page has a refused action, and every page has a `paid` row. Reaching 52px is a `rowActions.tsx` change in the shared table layer, owned by table-density-engineer, not a screen change.)* |
| **V-17** | Cash | Headers wrap to three lines; names truncate at eight characters. | H6 preset (§5.2). A table whose headers wrap has too many columns for the width, and hiding a column below `wide:` is the honest fix. |
| **V-18** | Payouts, Cash, Wallets, Ledger | **~330px of chrome** before the first row: 32px title, meta, banner, view pills, toolbar. | The period control and the view pills share one row where both exist; the meta line moves onto the `PageHeader`'s title line at 1280. Saves one row on every finance page. |
| **V-19** | Ledger | Six pills in one stadium at 1280 is crowded and mixes books with configuration. | Two groups with a `role="separator"` (§5.5). |
| **V-20** | Ledger | The balanced-books line is the smallest text on the page. | A `LedgerCard`-style header: *Trial balance · Balanced*, two figures, entry count as the mono caption (§5.5). |
| **V-21** | All five | Every money figure that is not in a table prints `SAR` at full size. | `Money unit="code"` stays for a lone figure in prose; in a figure strip the unit is the 12px mono line. Same rule as V-2. |

### 9.4 The three constants across all seven

- **Colour carries nothing** (§7.5). The band is the only field; deltas tint by `metricValence` under the owner's existing ruling; nothing else is coloured. No blue captions, no per-plan hues, no red badge, and no `--ev-text-3` on text.
- **One face.** The console keeps Inter everywhere; the facts rung is size, case, tracking and muted ink, never a monospace font.
- **Numerals are `tabular-nums` and end-aligned** wherever two of them stack (R4). The mono facts line is the one place a numeral sits inline in text, and it is `<bdi>`-wrapped.
- **Arabic and dark are free** if the tokens are used: `--ev-hero-*` has a dark set; `uppercase` and `tracking-wider` are no-ops in Arabic by design (`MetricTile.tsx:284-292`); the composition bar and sparkline mirror with the document because they are flex and SVG with no hand-mirroring.

### 9.5 Order of visual payoff

1. V-1, V-4, V-6 together: drop the figure boxes, add section rules, put the lists two-up. This is most of the difference between the capture and the frame and touches only Overview.
2. V-2, V-3: the unit line and the mono caption level. One component change in the adapter's use of `MetricTile`.
3. V-11, V-12: the Revenue total row and the column preset. Half a day, and the by-plan table stops looking broken at 1280 even before the master-detail lands.
4. V-16, V-18: row pitch and chrome height on the working pages.
