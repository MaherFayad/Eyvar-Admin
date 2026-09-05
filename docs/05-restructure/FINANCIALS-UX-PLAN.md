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

### 9.5 Order of visual payoff (round 1)

1. V-1, V-4, V-6 together: drop the figure boxes, add section rules, put the lists two-up. This is most of the difference between the capture and the frame and touches only Overview.
2. V-2, V-3: the unit line and the mono caption level. One component change in the adapter's use of `MetricTile`.
3. V-11, V-12: the Revenue total row and the column preset. Half a day, and the by-plan table stops looking broken at 1280 even before the master-detail lands.
4. V-16, V-18: row pitch and chrome height on the working pages.

---

## 10. Round 2 — the five table sub-tabs and their secondary pages, measured after round 1

Captured 2026-09-05 on the merged branch at 1280 × 900, every view and every drill-in (23 screens).
The numbers below are from the DOM, not from reading the code.

### 10.1 What the captures say

| Screen | First row at | Row pitch | What is wrong |
|---|---|---|---|
| Payouts | 490px | 77px | banner, then four **bordered** figure tiles with `SAR` at full size, then the view stadium, then the toolbar. Less than half the viewport is rows; six of them fit. The action lane is a wide empty column with one `Pay` button floating in it. |
| Escrow, Deductions | 326 / 294px | 77px | no figures at all, so the two views a Finance lead settles a period against say nothing before the rows. |
| Payouts drill-in (captain ledger) | 416px | 40px | a `Back to payouts` chip on its own row, then the period control on its own row, then the ledger header. Three rows of chrome that could be one. |
| Cash queue | 400px | 69px | the captain cell wraps to three lines (*Rider has not confirmed*); otherwise sound. |
| Cash debt ledger, Over cap | 404px | 53px | three bordered figure tiles; `tableOverflowX` 2px (a rounding overflow that draws a scrollbar). |
| Cash drill-in (captain receivable) | 388px | 40px | one row holds `Read the reconciliation queue`, a `Cap (SAR) 300.00` figure and the period stepper, jumbled at three different heights. |
| Wallets | 450px | 53px | the view header (round 1) is right; two inline actions where `View ledger` is the row's open path. |
| Wallets drill-in | 356px | 40px | `Back to wallets` chip on its own row; the ledger card keeps a min-height and leaves ~80px of empty card under the closing balance. |
| Pricing | 456px | 53px | period control on its own row (being moved to the title row in `fin/revenue-views`); two inline actions, `Open revenue` and `Edit`. |
| Rate card, Quick rides, Cancellation fees, Plan editor | — | — | sound. No change beyond the shared items below. |
| Ledger: Trial balance | 494px | 53px | the round-1 header is right; the six-view stadium plus toolbar plus header make the tallest chrome stack in Financials. |
| Ledger: Journal | 416px | 59px | **raw machine identifiers reach the operator**: the `Recipe` column prints `gateway_fee`, `captain_incentive`, `cash_repayment`; the `Lines` column prints `Dr expense.gateway_fees 32.20 SAR`. Rule 7 in `CLAUDE.md` and the i18n layer both forbid this; the labels already exist (`fin.posting.*`, the trial balance's account names). |
| Ledger: VAT & invoicing | — | — | two full-width cards whose values end at ~60% of the card; the same stranded key-value defect V-6 fixed on Overview. |

### 10.2 The decisions

| # | Decision |
|---|---|
| **R2-1 · One view header for every Financials view.** | The shape `LedgerCard` and the round-1 Wallets and Trial balance headers already use: heading and an uppercase tracked caption at the inline-start, one to three figures at the inline-end at `--text-kpi` with the unit as a small line. **Flat, no bordered tiles.** It replaces Payouts' four-tile strip and Cash's three-tile strip, and it is added to Escrow, Deductions, the Cash queue, Journal, Refused postings and Gateways. It lives once, in `src/screens/financials/shared/ViewHeader.tsx`; the local `WalletsHeader` and `TrialBalanceHeader` fold into it. |
| **R2-2 · A drill-in is one header, not three rows.** | On `?captain=` and `?rider=` pages the page meta becomes the parent view's name with the record (`Payouts · Khalid Mansour`), a `Back` link sits at the header's inline-start where a breadcrumb would, the period control sits at the inline-end of the title row (`FinancialsPage.periodControl`, landing in `fin/revenue-views`), and the ledger header follows directly. The Cash drill-in's cap becomes a second figure in that ledger header, beside the balance. |
| **R2-3 · The refused-action line leaves the row.** | `DataTable.tsx:1787` reserves a second line on **every** row of a page whenever any row has a refused action, which is why Payouts, Escrow and Deductions sit at 77px. AC-368 requires the reason *in place*; it does not require it under the button. The reason moves into the row's state cell as its secondary line on the refused row only, the button stays disabled with the same reason as its accessible description, and `reserveRefusal` goes. Target pitch 52px. This is a table-layer change and is done once, for all forty tables. |
| **R2-4 · One inline action per row; `View ledger` is the row.** | Wallets and Pricing follow Payouts: the open path is the row click and its keyboard equivalent, the lane holds the one mutating action (`Adjust`, `Edit`). |
| **R2-5 · No raw identifier on the Journal.** | `Recipe` renders the keyed label with the id as the secondary line; `Lines` renders `Dr Cash at payment gateway · 32.20` using the account's display name, the account key on hover only. |
| **R2-6 · Key-value cards are two-up.** | VAT registration beside Invoice numbering, each half-width, `FigureRow` rows full to their edge. |
| **R2-7 · Cell text does not wrap to three lines.** | Cash's captain cell: *Rider has not confirmed* becomes *Unconfirmed* as a secondary line, and a filter facet where an operator wants only those. |
| **R2-8 · The empty ledger card does not reserve height.** | `LedgerCard` drops its min-height once the closing balance row has rendered; the card ends where the ledger ends. |

### 10.3 Lanes, and the order they can run in

`fin/revenue-views` is still running and owns `FinancialsPage`, `PageHeader`, `RevenueScreen`, `PeriodControl`, and the `PeriodControl` call sites in Payouts, Cash and Pricing. Nothing below touches those until it lands.

| Lane | Scope | Can start |
|---|---|---|
| **A · table layer** | R2-3 in `DataTable.tsx` / `components/table/rowActions.tsx`, with the density table in `density.ts` updated and a test that a page with one refused row keeps every other row at the base pitch | now |
| **B · Wallets + Ledger** | R2-1 (`ViewHeader` created here; Wallets, Trial balance, Journal, Refused, Gateways adopt it), R2-4 on Wallets, R2-5, R2-6, R2-8 | now |
| **C · Payouts + Cash + Pricing** | R2-1 on Payouts, Escrow, Deductions, Cash queue, Cash debt; R2-2 on both drill-ins; R2-4 on Pricing; R2-7; the 2px overflow | after `fin/revenue-views` merges |
| **D · consolidation** | the Refunds and Credit notes headers from `fin/revenue-views` move onto `ViewHeader` | after B and `fin/revenue-views` |

Verification per lane as §6: typecheck, `test:changed`, the finance harnesses, and for lane A the full suite. Lane C re-runs the round-1 scan script and must show every first row above 400px at 1280 × 900 and every table row at 52px unless a cell genuinely carries two lines.

### 10.4 Measured after lanes A and B (2026-09-05)

- **R2-3 landed.** The base pitch of a table whose identity cell has no secondary line is **41px**, not the 52px §10.2 guessed; 52px is the pitch of a two-line identity cell. Payouts: 77px on every row before, 41px unrefused and 69px on a refused row after; eight rows in a 900px viewport instead of five. A refused row genuinely carries two lines because AC-368's reason is visible text; a screen declares `DataColumn.carriesRefusalReason` to choose which cell carries it, and Payouts should declare its state column (lane C).
- **R2-8 landed** in `DataTable.tsx`, not `LedgerCard`: the `min-h-54` floor on the scroll container now applies only while refreshing or empty. The one-row wallet ledger card went from 218px to 176px.
- **R2-1's header costs 42px** where a view had none (12px label, 28px numeral, one gap). Journal 416px → 466px first row; Wallets unchanged at 450px after the two-line figure. **Reaching the §10.3 target of a first row under 400px needs the figures to share the view row** — the stadium at the inline-start, the figures at the inline-end, the heading dropped because the selected pill already names the view. That is one change in `FinancialsPage.viewRow` for all seven screens and is lane D's, not a per-screen change.

### 10.5 Round 2 as landed on `fin/merge-r2` (2026-09-05, 1280 × 900)

| Screen (default view) | First row before | After | Row pitch before | After |
|---|---|---|---|---|
| Payouts | 490 | 422 (banner) | 77 | 41, 69 on a refused row |
| Escrow / Deductions | 326 / 294 | 316 / 316 | 77 | 70 / 53 |
| Payouts drill-in | 416 | 392 | 40 | 40 |
| Cash queue | 400 | 422 (banner) | 69 | 53 |
| Cash debt / Over cap | 404 | 329 | 53 | 53 |
| Cash drill-in | 388 | 392 | 40 | 40 |
| Wallets | 450 | 422 (banner) | 53 | 53 |
| Wallets drill-in | 356 | 368 | 40 | 40 |
| Pricing | 456 | 396 (banner) | 53 | 53 |
| Ledger trial balance | 494 | 475 (banner) | 53 | 53 |
| Ledger journal | 416 | 435 (banner, and a figure it did not have) | 59 | 59 |

Every screen: one `ViewRow` at one top across its views, figures clustered label-over-numeral with the
unit inline and the caption beneath, period control on the title row, zero page or table overflow,
light and dark identical. Verified: typecheck clean; `npm test` 177 of 179 files, the two failures
(`commands.test.tsx` CM-3, `auth.test.ts` AC-617/AC-630) reproduce on the feature branch's own
commit 9169323; `fin-overview.mjs` and `fin-revenue.mjs` pass.

**Not landed on `feat/remediation-and-ux-phase1` yet:** its working tree held another session's
uncommitted admin-workspace work at the time. Landing is `git merge fin/merge-r2` on that branch
once the tree is clean.

---

## 11. The plan editor, rebuilt — two columns, two views, and a rider preview

The editor at `/financials/pricing/plans/:planId/edit` was one long form with a calculator rail
beside it, and the rail printed the evaluator's own identifiers at a Finance lead:
`exampleMinutes × perMinuteHalalas + exampleKm × perKmHalalas`, in a code face, above the
substituted line. The owner's judgement on it was that it is impossible to read, and the whole of
§11 follows from that.

### 11.1 What the two columns are

| Column | Width at 1280 / 1440 | Holds |
|---|---|---|
| **Data** (inline-start) | 816 / 976 | the record, in two views, chosen by a D12 stadium at the top of the column |
| **Preview** (inline-end) | 416, fixed | the plan as a rider sees it in the app, with its own language |

The shell is unchanged: `FullBleedEditorShell` (`aside`), so back, title, status badge and the one
primary `Save` are where they were, the preview inherits the sticky `wide:` aside, and below
`--ev-bp-wide` it restacks under the data column at full width. `--ev-bp-wide` is **1280** (O1
moved it there from 1344; `PageShell.tsx`'s prose still says 1344 and is stale), so D2's floor is
the first width at which the two columns stand side by side, which is where an operator works.

### 11.2 The two views of the data column

**Details** is the form, unchanged: the catalogue fields, the feature lines with their counts, and
the pricing half in §4.6's disabled treatment. Same fields, same validation, same Q7 disabling, and
**AC-392**'s distinction intact — a disabled input keeps its box and its place in the tab order; a
derived value has neither, and no `tabIndex` at all.

**Calculations** is the worked example, rewritten as **result and working**:

```
      Gross per trip                              30.00 SAR
        20 min × 0.95 + 10 km × 1.10
  =   Plan total                                 150.00 SAR
        30.00 × 5 trips
  −   Captain earns                              120.00 SAR
        150.00 × (1 − 20/100)
  =   Eyvar keeps                                 30.00 SAR
        150.00 − 120.00
```

The shape is §H5's `FigureRow` with `operator`: a gutter reserved on every row so the labels align,
and a sign only where one is true. No identifier, no code face, and the assumptions the example runs
under (`10 km · 20 min × 5 trips`, the commission and discount rates, the surge exclusion) open the
view rather than trailing it.

The choice lives in **`?tab=`**, and the default view carries no parameter — the same rule `?view=`
follows on the index screens (AC-389), so the editor's own address stays the plain one.

### 11.3 AC-397, and why it is not weakened

AC-397 reads: *the formula panel's line count equals the number of computed-field definitions, and
each line's expression matches its definition character for character … there is no second copy
anywhere, in code or in markup.*

- **The count holds.** One row per definition, per class: six definitions, two classes, twelve rows,
  measured in the browser (`calcLines: 12`).
- **The working IS the expression.** `substituteParts` walks `definition.expression` — the same
  string `evaluateExpression` reduces to the result printed beside it — and replaces each identifier
  with the value the scope held at that step, in the units the operator prices in. The operators,
  the literals and the parentheses pass through untouched, so the line keeps the formula's shape.
- **What was dropped is the second rendering, not the source.** The old panel printed the raw
  expression *and* its substitution: two lines for one definition, of which one was written for the
  evaluator. Removing the untranslated one removes a copy; it does not add one.
- **AC-393 is unaffected.** `substituted` and `substitutedParts` are `null` exactly when `value` is,
  by one condition, so a blank input renders the label and an em dash with no half-written equation
  under it.

A `SubstitutionRenderer` supplied by the screen decides how one already-formatted operand is
written — `20` becomes `20 min` because the expression it came from reads `exampleMinutes`. It
cannot change which names are substituted or in what order, so it cannot make the printed line
disagree with the evaluated one.

### 11.4 The preview's data contract

Everything on the frame comes from form state and the same `derivePlan` evaluation the Calculations
view reads, so an unsaved edit shows there on the `input` event (**AC-396**).

| On the frame | From |
|---|---|
| plan name | `values.nameEn` / `values.nameAr`, by the preview's language |
| plan total | `derived[quoted].planTotal` |
| per trip | `derived[quoted].discountedPerTrip` |
| duration, trips | `values.durationDays`, `values.executeDays` |
| feature list | `values.features`, the `en` or `ar` half, blanks dropped |
| class chips | `values.economyActive`, `values.comfortActive` |
| `Subscribe` | disabled always — the editor subscribes nobody, so it competes with `Save` for nothing |

The quoted class is Economy where the plan offers it and Comfort for a Comfort-only plan: that is the
price the app leads with.

**The language toggle is the preview's alone.** The frame carries its own `dir` and `lang`, and its
labels resolve through `LanguageState.translatorFor(language)` — the translator the shell already
exposes for a language that is not the active one — so nothing is hardcoded and nothing moves the
console. An operator reading the console in English can check the Arabic card, and vice versa.

**The caption states what the frame is, and the VAT half is the rate card's claim.** `getLiveRateCard`
is read separately from the plan; the sentence prints *Prices include VAT* only where the live card
says `vatIncluded`, and the frame says nothing about VAT where the card could not be read. A rate
card that fails costs the sentence, never the editor.

### 11.5 Arabic, and the one thing that had to be built for it

A working that carries unit words is bidirectional text: `20 دقيقة × 0.95 + 10 كم × 1.10` is Arabic
runs inside a formula that reads in operator order in either language. A single string cannot express
that — `<bdi>` resolves its direction from the first strong character and reverses the line, and the
project forbids U+2068/U+2069 inside a string (`format/money.ts` U-4). So the working is rendered as
its **parts**: each substituted operand is its own `<bdi>` inside an LTR paragraph, and the operators
between them are plain runs. Measured in Arabic at 1280: the seven runs of `grossPerTrip`'s working
are in strictly increasing x order.

### 11.6 States

Content, loading and error. Loading is shaped like the two columns — the tab row and two field cards
in the data column, the toggle and the phone in the preview column — not `P3`, which is a
three-across form pattern this screen no longer is. **Empty does not apply**: the editor is reached
with a record.

### 11.7 Verified (2026-09-05, `fin/plan-editor`)

`npm run typecheck` clean. `npx vitest run src/screens/financials` — 17 files, 321 tests, all pass;
the plan editor's own file is 19 tests, including AC-390–401 amended for the new structure and five
new ones for the tabs, the identifier sweep, the preview and the language toggle.

Chromium at 1280 and 1440, light and dark, console `en` and `ar`, on both tabs and with the preview
in Arabic — 16 captures:

| Fact | Result |
|---|---|
| data column / preview column | 816 / 416 at 1280 · 976 / 416 at 1440, side by side in every capture |
| phone frame | 256 × 578 |
| `overflowX` | 0 everywhere |
| text nodes in the Calculations view matching `/[a-z][A-Z]\|Halalas/` | 0 |
| working runs out of left-to-right order (Arabic) | 0 |
| rows in the Calculations view | 12, being six definitions × two classes |
| enabled `bg-primary` buttons | 0 while the form is clean — `Save` and the preview's `Subscribe` are both disabled |
