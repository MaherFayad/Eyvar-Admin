# Financials › Pricing and plans — the **Rate card** view

**Revision 2, 2026-09-06.** Revision 1 shipped and passes all 31 of its acceptance criteria
and every rule it cites. The owner's verdict on the built result was *"this page needs
massive redesign, in spacing, text hierarchy, and overall design."* That is not a
conformance failure and it is not fixed by citing more rules. It is fixed by spending the
type ramp and the spacing scale, both of which this view had left almost entirely unspent.

Revision 2 is written against the built screens, `scripts/harness/shots/rate-card-light-en-live.png`
and `rate-card-dark-en-live.png`, and against the token layer, which **D7** makes the visual
authority. Every constraint below cites a file and a line, or a ruling ID.

Scope: the `Rate card` view of `/financials/pricing` only. The other three views are
untouched except for one shared string (§6).

---

## 0. What revision 2 changes, and what survives

**Survives, unchanged.**

- Every acceptance criterion the *product* spec carries: **AC-404**, **AC-405** (both
  `Approve` refusals stated at render), **AC-409** (live countdown on the shared clock),
  **AC-410** (no control raises a multiplier), **AC-411** (a suspension needs a reason).
- `ConfirmMoneyDialog`, `useMoneyActions`, `SURGE_SUSPENSION_MAX_HOURS`, the suspension
  write path, `MoneyCell` for every money figure, `listRateCards` as the one read.
- The master–detail geometry: a 300px rail at the inline-start, a detail pane at the
  inline-end, in one `Card` (`--ev-detail-rail-w`, `globals.css:1705`).
- The rulings **X-RC-1 … X-RC-13** in §11.2. None is reopened. Two are narrowed and both
  are marked.
- Stage B stays BLOCKED. Nothing here builds AC-402–408.

**Changes.**

| Revision 1 | Revision 2 | Why |
|---|---|---|
| Six levels of meaning carried by two rendered sizes (12 and 14) | A **seven-rung type scale**, §3, every rung a declared step with a declared role | globals.css H5's rank, `:3125–3143` |
| Four heading treatments for one rank on one page — 12/500, 14/600, 14/600, 20/500 | **One card-title rung**, 16/600, and one field-label rung, 14/500 muted | measured, §3.0 |
| Class table rendered as a key/value grid: 12px headers, no header strip, ~32px rows | The product's **real table chrome**: a `bg-muted` strip at `--ev-row-h-head`, 14/500 headers, `--ev-row-h` rows | `ui/table.tsx:225–268`; `--ev-bg2` names "the table header row" at `globals.css:471` |
| Pane header carries three pseudo-KPI statistics at 14/600, louder than any price | Pane header is **identity only**; commission and VAT become key/value rows in a terms band | §5 |
| `Modelled impact` and `Floors` side by side with different internal rhythms | `Commission and VAT` beside `Floors`, **one instrument**; `Modelled impact` gets its own full-width band | §5 |
| An orphan sentence at the pane's foot restating the badge and the banner | **Deleted.** Both footer keys retired | R10 |
| `Approve` orphaned 400px below the `Draft` badge that explains it | `Approve` sits at the identity band's inline-end, beside its badge | §5 |
| Gaps of 2, 6, 12 and 12px with no scale behind them | A **four-value spacing scale** — 4 · 8 · 12 · 24 — and one rhythm law | §4 |
| A two-line full-width `info` banner on every visit, ~88px before the first price | **One line** on this view; its body is dropped here and kept on the other three | §6 |
| `4 RATE CARDS · 1 LIVE · 2 DRAFTS · 1 SUPERSEDED`, uppercase, on the view row | The **rail's footer**, sentence case. The view publishes no facts | §7 |
| `Surge windows` (2/3) beside `Suspend surge` (1/3), whose heading and disabled primary read as the same string twice | **One `Surge` card**: the windows table, a rule, then the district lever | **D35**, §8 |

---

## 1. Pattern

`docs/ref/patterns.md` gives Pricing & Plans one row, and it describes the `Subscription
plans` view. **F-RC-1** (still open, §11.4) asks product-owner to amend it to name all four.
This view is governed by the second half of the `contacts` row — *"two-column detail for the
pane"* (§8.4 · §2.2, §3.8) — and by nothing in §8.4's queue half: nothing is claimed, nothing
has an SLA, nothing leaves.

**Page shape: single column.** The master–detail is a block inside the content region, as
`InboxScreen.tsx:899`'s list + thread is. No fifth page shape, no new §6.4 row.

Sections that govern this screen: **§2.2, §3.8**; **§8.3.1 / §8.3.2** (money); **§7.1–§7.6**;
**§9** (Arabic); **R3, R4, R5a, R6, R7, R8, R9, R10, R13, R14, R15, R17**; **§6.3 D18**;
**D33 / D33a / D33b / D33c / D34**; **R4-5**; and the new **D35** (§8).

**A correction that unblocks the whole redesign.** Revision 1 leaned on §6.2 **D-2** for its
density. **D-2 is retired.** `docs/05-restructure/DECISIONS.md:70` — *"§6.2 D-2 (higher
density) → D7 — retired; only D-2′, the 32px page gutter, survives"* — and
`_partials/06-eyvar-mapping.md:67` strikes the row through and adds: *"Its type-ramp (§1.2)
and spacing-scale (§1.3) suspensions are **void and may not be cited again**."* The same row
records that Eyvar's rows are *rising* (32 → 40 text, 44 → 56 media) and that its spacing is
*"on a 4px grid throughout"*. So:

- **Nobody may cite density against the type scale in §3.** The body step is 14px and the
  ramp's upper rungs are available.
- **The "smaller, never off-grid" clause is gone with the row it lived in**, and D15
  (`06-eyvar-mapping.md:178`) states the surviving rule directly: *"An off-grid literal is a
  defect on its own terms, independent of any deviation."* The 4px grid stands on its own.

---

## 2. Layout

Content width at the **D2** 1280px floor is 976px (D-2′, measured), of which the block spans
912. Rail 300, divider 1, pane 611.

```
┌ page header ──────────────────────────────────────────────────────────────────┐
│ Pricing & Plans                                                     T0 24/600 │
├───────────────────────────────────────────────────────────────────────────────┤
│ [ Subscription plans │ Quick rides │(Rate card)│ Cancellation fees ]           │  no caption rung
├───────────────────────────────────────────────────────────────────────────────┤
│ ⓘ Prices are read-only until the rate card owner is decided.        one line  │  §6
│                                                                               │
│ ┌ Card ────────────────────┬───────────────────────────────────────────────┐  │
│ │ Rate cards          T2   │ RC-2026-04-01  [Live]              [Approve]  │ A │  identity
│ ├──────────────────────────┤ Effective from 1 April · no end set           │  │
│ │▌RC-2026-04-01     [Live] │───────────────────────────────────────────────│  │
│ │ From 1 Apr · no end set  │ Class    Base (SAR) Per km  Per minute  … T2  │ B │  header strip
│ │ Bill +5.2%               │ Economy       5.00    1.20        0.40    …   │  │  --ev-row-h
│ ├──────────────────────────┤ Comfort       8.00    1.75        0.55    …   │  │
│ │ RC-2026-09-01    [Draft] │───────────────────────────────────────────────│  │
│ │ From 1 Sept · no end set │ Commission and VAT       │ Floors        T2   │ C │
│ │ Not modelled             │ Commission, on demand 22%│ Target margin  12% │  │
│ ├──────────────────────────┤ Commission, on a plan 20%│ Payment fee   2.2% │  │
│ │ RC-2026-08-01    [Draft] │ Consumer prices  VAT incl│ Support per s. 9.00│  │
│ │ From 1 Aug · no end set  │                          │ Emergency res. 3.5%│  │
│ │ Bill +3.4%               │ Guardrails a card is checked against. Nothing │  │
│ ├──────────────────────────┤ enforces them yet.                            │  │
│ │ RC-2026-01-01 [Supersed.]│───────────────────────────────────────────────│  │
│ │ 1 Jan – 1 Apr            │ Modelled impact                          T2   │ D │
│ │ Bill 0%                  │ Rider bill before  Rider bill after  Change   │  │
│ │                          │ 21.80 SAR          22.94 SAR        +5.2%  T4 │  │
│ │                          │ Modelled on 4,186 trips, run 21 March.        │  │
│ │                          │ Measured against the card this one replaced.  │  │
│ ├──────────────────────────┤                                               │  │
│ │ 4 rate cards · 1 live ·  │                                               │  │
│ │ 2 drafts · 1 superseded  │                                               │  │
│ └──────────────────────────┴───────────────────────────────────────────────┘  │
│                                                    ← G3, 24px →               │
│ ┌ Card ─────────────────────────────────────────────────────────────────────┐ │
│ │ Surge                                                              T1     │ │
│ │ Windows are set by pricing. Operations may only suspend surge.     T6     │ │
│ │ Window        Days          Hours  Multiplier      State           T2     │ │
│ │ Morning rush  Sun Mon Tue …   7–9        1.3×   [Running]                 │ │
│ │ Evening rush  Sun Mon Tue …  16–19       1.4×   [Running]                 │ │
│ │ Weekend eve.  Fri Sat        19–23       1.2×   [Off]                     │ │
│ │ ───────────────────────────────────────────────────────────────────────── │ │
│ │ District                                                           T2     │ │
│ │ (Al Narjis)(Al Sahafa)(Al Yasmin)(Al Malaz)(KAFD / Olaya)(Qurtubah)       │ │
│ │ [ Suspend surge ]                                                         │ │
│ │ Choose a district.                                                 T6     │ │
│ └───────────────────────────────────────────────────────────────────────────┘ │
│                                                    ← G3, 24px →               │
│ ┌ Suspensions ──────────────────────────────────────────────────────────────┐ │
│ │ 0 in force · 12 ended                                    [ toolbar ]      │ │
│ │ District      Reason              Raised by     Started      State        │ │
│ │ Al Sahafa     Stadium event …     Yousef …      3 Sept 09:14 [Ended]      │ │
│ └───────────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────────┘
```

**Card order, and why.** The master–detail first, because it answers *what does a trip cost*.
`Surge` next, because a multiplier is applied to the prices above it, and the one lever on
those multipliers now sits inside the same card as the windows it suspends. `Suspensions`
last and full width, because it is history, and history is never the first thing an operator
reads.

---

## 3. The type scale for this view

### 3.0 What is wrong today, measured on the built screens

Four heading treatments for one rank, on one page:

| Heading | Renders | Site |
|---|---|---|
| `Rate cards` (rail) | 12 / 500 / muted | `RateCardBlock.tsx:193` |
| `RC-2026-04-01` (pane) | 14 / 600 / ink | `RateCardBlock.tsx:306` |
| `Surge windows`, `Suspend surge` | 14 / 600 / ink | `SurgeCards.tsx:134`, `:249` |
| `Suspensions` | **20 / 500** / ink | `IndexToolbar.tsx:271` |

And the loudest ink in the pane is not a price. The three header statistics render
`text-sm font-semibold` (`RateCardBlock.tsx:388`), so **`VAT included` — a boolean — is set
heavier than `5.00`**, which is the number the page exists to show. That single inversion is
most of what the owner saw.

Meanwhile `CardTitle` already renders 16/600 (`ui/card.tsx:89`) and no card on this view uses
it, and `TableHead` already renders a 14/500 label on a `bg-muted` strip at `--ev-row-h-head`
(`ui/table.tsx:240`, `:263`) and neither table on this view uses it.

### 3.1 The scale

Every rung is a step already declared in `globals.css` with a role already written for it in
the **H5 rank** (`globals.css:3117–3126`). **No size is invented at a call site** — that is
H2's standing ruling (`globals.css:2988`) and it is not suspended here.

| Rung | Role on this view | Class | Latin | Arabic |
|---|---|---|---|---|
| **T0** page title | `Pricing & Plans`. `PageHeader`'s, untouched | `text-xl font-semibold text-foreground` | 24 / 600 / ink | 24 |
| **T1** card title | One per card: the pane's selected version, `Surge`. `Suspensions` is `IndexToolbar`'s — see F-RC-7 | `CardTitle` → `text-base font-semibold text-foreground` | 16 / 600 / ink | 16 |
| **T2** field label | A label that heads a **field**: the rail's strip, every table column header, every band label | `text-sm font-medium text-muted-foreground` | 14 / 500 / `--ev-text-2` | 14 |
| **T3** identity | The rail row's version, the `Class` cell, the `District` cell | `text-sm font-medium text-foreground` | 14 / 500 / ink | 14 |
| **T4** figure | The impact band's three values, and nothing else | `text-sm font-semibold tabular-nums text-foreground` | 14 / 600 / ink | 14 |
| **T5** data — **money** | Every price, every table numeral | `text-sm tabular-nums text-foreground` (via `MoneyCell`) | 14 / 400 / ink | 14 |
| **T6** meta | Every label paired with one value, every caption, the effective line, every refusal line, the rail footer, the banner body | `text-xs text-muted-foreground` | 12 / 400 / `--ev-text-2` | 13 |
| **T7** badge | Every `StatusBadge` | set by `badge.tsx` | 11 / 600 / tone-fg | 12 |

**Nothing on this view sets a size class outside that table.** Seven rungs, six of which the
owner named; the seventh is the badge, which H5 licenses as the ramp's one inversion.

### 3.2 The two rules that make T2 / T3 / T4 / T5 legal at one size

H5's law (`globals.css:3135`): *"size and weight move in the same direction; nothing larger is
ever lighter than the thing above it in rank"*, and (`:3161`) *"do not reuse a one-step weight
difference anywhere that position does not also separate the two tiers."*

- **T2 against T3** — same size, same weight, separated by **colour** (`--ev-text-2` against
  `--ev-ink`). Not a weight boundary at all.
- **T3 against T5** — one weight step at the same size and colour. Legal only because
  **position** separates them: the identity is always the first column of a row. H5 names this
  the product's weakest legal boundary and it is used here exactly as the table already uses it.
- **T4 against T5** — **two** weight steps (400 → 600, +44.4% stem density, measured at
  `globals.css:3155–3162`). H5 calls two steps *"the one that is visible on its own"*. T4 also
  sits in its own band, so position separates it too.

**A label that heads a field takes T2. A label paired with one value takes T6.** That is the
distinction the current build does not make, and it is why the pane reads flat: a label at
14/500 above a value at 14/400 would make the label heavier than the thing it labels.

### 3.3 The loudest thing on the page

**The per-class price matrix, as a region.** Not a numeral.

A rate card has no headline number. It is a matrix, and any single figure lifted out of it to
be the page's KPI would be a summary set louder than the thing it summarises. So loudness is
bought three ways, none of them a bigger glyph:

1. **Chrome.** The matrix is the only block inside the master–detail card that carries a
   filled header strip — `bg-muted` at `--ev-row-h-head`, which `--ev-bg2`'s own declaration
   names as its first licensed use: *"THE ONE TINT INSIDE A CONTAINER: **the table header
   row**, the filter-chip strip, a card's section-header strip"* (`globals.css:471`).
2. **Ink at body size.** After §3.1 the matrix is the **only place in the pane where a numeral
   is `--ev-ink` at 14px**. Commission, VAT and the floors drop to T6. The impact band's three
   figures are T4, in their own band, below the fold of the matrix.
3. **Row height.** `--ev-row-h` 40px against the rail's rows and the terms band's 8px rhythm.

**No `--text-kpi` (28) and no `--text-lg` (20) is spent anywhere on this view.** That is a
deliberate refusal, recorded in §11.1 so the owner can overrule it in one line if they want a
display numeral. The two steps exist for a metric board, and this is not one.

### 3.4 Money gets its own treatment, and here it is

| | |
|---|---|
| **Component** | `MoneyCell` in a table, `Money` outside one. Never a hand-formatted number |
| **Size / weight / ink** | T5 — 14 / 400 / `--ev-ink` in a table cell; T4 — 14 / 600 / `--ev-ink` in the impact band |
| **Figures** | `tabular-nums`, pinned on `table` in `@layer base` and on `data-slot="metric-value"` |
| **Alignment** | `text-end`, never `text-right` (`Money.tsx:81`). The column mirrors in Arabic; the numeral run does not (**R4**, **AC-73**) |
| **Decimal alignment** | **Free, and no mechanism may be added for it.** `formatMoney` emits exactly two decimals always (`Money.tsx:22`), so every value in a column has the same fractional width; `tabular-nums` plus `text-end` lines the decimal points up by construction. A decimal-aligned grid, a padded span or a split integer/fraction render is forbidden here |
| **Unit** | `(SAR)` once, in the column header (§8.3.1); `unit="none"` on every cell. Outside a table the value carries `SAR` trailing, one space, as a T6 muted run on the numeral's baseline (`ViewRow.tsx:169–171`) |
| **Negative** | U+2212, never a hyphen, never a colour, never inside a badge (§8.3.2) |
| **Null** | `—` (U+2014) and never `0.00`. `null` is not zero |

---

## 4. The spacing scale for this view

### 4.0 What is wrong today

`globals.css:3191–3200` measured the same failure product-wide: *"within a tile, value to
label is 6px; between tiles, 12px; between the metric board and the chart board, 16px …
**between-group to between-SECTION is 12:16, a ratio of 1.33** — a whole change of subject is
4px wider than the gap between two tiles."* On this view it is worse: the gap between two
**bands inside a card** and the gap between two **cards** are both 12px
(`Card`'s `gap-(--card-spacing)`, `ui/card.tsx:41`, and `PricingScreen.tsx:514`'s `gap-3`), so
a change of subject costs exactly what a new line costs, and eight blocks read as one field.

The same file states the fix and forbids the wrong one: *"the section gap wants the next real
step up rather than a new `--ev-*` name … adding a spacing token here would be the drift, not
the fix."*

### 4.1 The scale — four values, and every gap on the view comes from this list

| Rung | Role | Class | px | Ratio to the rung below |
|---|---|---|---|---|
| **G0** | A label to its value inside one cluster; two lines of one rail row | `gap-1` | 4 | — |
| **G1** | Between rows inside a band; between a band label and its content | `gap-2` | 8 | 2.00 |
| **G2** | Between bands inside a card; the card's inset on all four sides | `gap-(--card-spacing)` / `p-(--card-spacing)` | 12 | 1.50 |
| **G3** | Between cards; and the channel a band rule sits in | `gap-6` | 24 | 2.00 |

Fixed heights, all tokens: `--ev-row-h-head` **36** (a table header strip, and the rail's
strip), `--ev-row-h` **40** (a table body row), `--ev-row-h-media` **60** (a rail row, as a
**minimum** — see §9).

### 4.2 The rhythm law

> **A change of subject always costs 24px, whether it is drawn as a rule inside a card or as
> the space between two cards.**

A divided band inside a card is `border-t border-border-soft` with `pt-3` under the rule and
the card's own `gap-(--card-spacing)` above it: 12 + rule + 12 = **24**, the rule centred in
the channel. Two cards are `gap-6` = **24**. So the eye reads one interval for one meaning,
and the hairline is the only thing that says "same card". That is the single sentence this
view was missing.

### 4.3 Forbidden here

**2px (`gap-0.5`), 6px (`py-1.5`), 16px and 32px do not appear inside this view.** 2 and 6 are
off the 4px grid (D15, `06-eyvar-mapping.md:178`); 16 and 32 are on it but are not on this
view's scale, and a fifth value is how a scale stops being one. The current build uses
`gap-0.5` at `RateCardBlock.tsx:215`, `:386`, `:532` and `py-1.5` at `:193`, `:422–:437` and
throughout `SurgeCards.tsx`; all of them move onto G0/G1 or onto a row-height token.

---

## 5. The detail pane — four bands, regrouped, and the void

### 5.1 Why four blocks became four *bands*

Revision 1's pane was four blocks in a stack with nothing saying which belonged together. The
regrouping is by the operator's question, in the order they ask it:

| Band | The question it answers | Contents |
|---|---|---|
| **A · Identity** | *Which card is this, is it in force, and can I do anything about it?* | version (T1, mono) · `StatusBadge` · `Approve` at the inline-end (draft only) · effective line (T6) · refusal line (T6) |
| **B · Prices** | *What does a trip cost on it?* — **this is the page** | the six-column class matrix, full-bleed, header strip + `--ev-row-h` rows |
| **C · Terms** | *What does the business take, and what is this card checked against?* | `Commission and VAT` (3 rows) beside `Floors` (4 rows), then one caption |
| **D · Impact** | *If this replaced the live card, what happens to bills?* | three T4 figures in a row, then one caption |

**A, B and C are what the card IS. D is what it would DO.** Facts before consequence, and
that is also why D is last rather than second: on a live or superseded card D is history, and
history never outranks the prices in force.

**The header stat row is gone.** Commission and VAT are properties of the card, not
performance indicators, and rendering them as pseudo-KPIs at 14/600 in the pane header is
what made a boolean louder than a fare. They join `Floors` in band C, where the instrument is
a key/value row and the label/value relationship is honest.

**Band C's two columns are unequal in length and that is fine.** The rule this view enforces:
*two columns inside one band must use the same instrument; unequal length is permitted,
unequal rhythm is not.* Both halves are key/value rows at G1. Revision 1's failure was a
label-over-figure cluster beside a key/value grid — two languages, side by side, in one band.

**Band C's caption spans both columns**, at the band's foot: `Guardrails a card is checked
against. Nothing enforces them yet.` (**D-F11**, X-RC-10). At full width it is one line; in
revision 1 it was inside the 1/3 column and wrapped to three, which is most of the visible
imbalance in the shipped screenshot.

**Band D's caption spans the band**, one line, and absorbs what were two separate meta lines
above and below the figures.

### 5.2 The void, named and answered

The block is `<Card className="flex-row …">` (`RateCardBlock.tsx:143`). `flex-row` stretches
both children to the tallest, so **the taller column dictates the shorter one's height**.
There are two voids in the shipped screenshot and both are that mechanism:

1. **In the rail**, below the fourth row — the pane is taller than 4 × 60 + 36.
2. **Inside band C's inline-start half** — `grid-cols-3` with `Modelled impact` at
   `col-span-2` and `Floors` at `col-span-1` (`RateCardBlock.tsx:347`), and the 1/3 column is
   the taller of the two.

Nothing is stretched to fill either. The answer is three moves, in this order:

1. **Void 2 stops existing.** The `col-span-2` / `col-span-1` pairing is replaced by band C
   (two equal-instrument halves, `grid-cols-2`) and band D (full width). A grid whose two
   cells hold different instruments cannot have equal heights; two cells holding the same
   instrument have heights that differ by a row, not by a paragraph.
2. **The pane loses roughly 64px of height**, which shrinks void 1 by the same amount: the
   orphan footer sentence is deleted (§6), and `Approve` and its refusal move up into band A
   instead of forming a fifth block at the pane's foot.
3. **Void 1's remainder is terminated, not filled.** The rail gains a footer pinned with
   `mt-auto` carrying the counts (§7), above a `border-t border-border-soft`. The space above
   that footer is the list's **runway** — it is where the fifth rate card goes — and a runway
   with a bottom edge reads as a list, while a runway without one reads as a hole.

**No filler is permitted.** No illustration, no watermark, no stretched-to-fit table, no
vertical centring of the rail's rows, and no `justify-between` in the pane. If the rail is
short, it is short.

---

## 6. The banner

**Ruling: the banner stays, at one line, and it stops being said twice.**

`fin.pricing.stageA` is a genuine standing condition and **R10** sends a standing condition to
a banner. It is true on all four views of the page, so it is page-level, and deleting it would
leave three views with disabled controls and no stated reason. It earns its place by being the
**single** carrier for a condition that would otherwise be repeated on every disabled control.

It does **not** earn two lines here. Two findings:

- **Its body is about a different view.** `fin.pricing.stageA.body` reads *"…A plan's
  catalogue is editable; its rates, commission and discount are shown as they stand."* On the
  Rate card view nothing is editable and there is no catalogue. The sentence is true of
  `Subscription plans` and misleading here.
- **Its title is stated twice on this view.** `fin.pricing.rateCard.footer.live` reads *"This
  card prices every trip today. Editing waits on the pricing owner decision."* The second
  clause is the banner's title in other words. **R10**: one condition, one surface.

So:

1. `PricingScreen.tsx`'s `banners` memo supplies `body` **only when `activeTab !== 'rate-card'`**.
   The tone stays `info`, the title is unchanged, there is no dismiss (§11.4 — an operator may
   not dismiss a standing condition), and the count of banners on the page stays exactly one.
2. `fin.pricing.rateCard.footer.live` is **retired**. Its first clause (*"This card prices
   every trip today"*) is what the `Live` badge and `Effective from 1 April · no end set`
   already say; its second is the banner's.
3. `fin.pricing.rateCard.footer.superseded` is **retired** for the same reason: *"This card
   priced trips until 1 April"* is `Effective 1 January to 1 April` plus a `Superseded` badge,
   and *"It is kept for the trips it priced"* is a rationale for the record's existence, not a
   state of it.

That is the owner's "orphan sentence at the bottom", removed by rule rather than by taste, and
roughly 44px of banner recovered on every visit.

---

## 7. The counts caption

**Ruling: it comes off the view row. The Rate card view publishes `facts = null`.**

Three reasons, in descending weight:

1. **The rung has no parent here.** `ViewRow.tsx:37–41` documents the caption as *"V-3's facts
   rung, **directly under the figures it belongs to** and sharing their inline-start."* This
   view publishes no figures (`RateCardBlock.tsx:78–98` returns `caption` only), so the rung
   renders as a free-floating run beside the stadium, vertically centred against the tabs. It
   is a caption under nothing.
2. **It is the loudest treatment on the page carrying the least important content.** Uppercase
   plus `tracking-wider` is the strongest attention signal in the whole product, spent on a
   count of a four-item list, at 11px — the one step `globals.css:3206` says *"is not a size
   for prose"*.
3. **A count of a list belongs to the list.** The rail is the list.

**X-RC-1a is narrowed, not revoked.** The view-row caption rung stays licensed (V-9.4, V-3,
AC-443) for views that publish figures; `ViewRow.tsx` is **not** changed and no other Financials
view is affected. What changes is what this view publishes.

**The rail footer.** Pinned with `mt-auto`, above `border-t border-border-soft`, `px-3 py-2`,
T6, sentence case, one line, truncating: `4 rate cards · 1 live · 2 drafts · 1 superseded`.
Separators are drawn as `aria-hidden` spans between `<bdi>` fragments, never written into a
string (AC-443's construction). Where no card is live the first entry is `No card is live`.
With zero cards the footer is not rendered at all — the empty sentence above it already says
the count.

The existing plural keys (`…count.cards`, `…count.live`, `…count.drafts`,
`…count.superseded`, `…noLive`) are reused verbatim. Only their carrier moves.

---

## 8. **D35** — the ruling on open owner question A-3

### 8.1 The defect, confirmed

`SurgeCards.tsx:249` renders `<h2 class="text-sm font-semibold">Suspend surge</h2>`.
`SurgeCards.tsx:291` renders a `variant="default"` `Button`, disabled, whose label is
`fin.pricing.surge.suspend.confirm` = **`Suspend surge`** (`copy.ts:913`). And
`ui/button.tsx:49` sets `disabled:border-transparent disabled:bg-transparent
disabled:text-muted-foreground`, so a disabled primary has **no fill, no border and no ink** —
it is a line of 14/500 muted text. The panel therefore paints:

```
Suspend surge                     14/600 ink      ← heading
Choose a district, then confirm.  12/400 muted    ← subtitle
( chips )
Suspend surge                     14/500 muted    ← the disabled primary, reading as a heading
Choose a district.                12/400 muted    ← the refusal, echoing the subtitle
```

Two headings, two subtitles, one card. This is both a component defect and a copy defect, so
the ruling has two clauses and the answer to the owner's "either/or" is **both**.

### 8.2 The ruling

> ### D35 — a disabled control keeps its shape, and a panel never says the same words twice
>
> **D35a — a disabled control drops its fill, not its box.** §8.6.3's *"a disabled primary
> drops its fill"* stands: a disabled control must never paint `--ev-brand`, because the one
> live primary has to be the only full-weight control on a screen (`ui/button.tsx:45–48`). It
> keeps everything else — its height, its radius, its inline padding, and a **1px
> `border-border` hairline**. A hairline is not weight. A control whose only remaining carrier
> is muted text is not a control, and where it sits under a heading of similar size it is read
> as a second heading. Applies to every disabled `Button` in the product, in every variant.
>
> **D35b — within one card, the title and a control never carry the same string.** If the act
> names the card, the card takes the object's name and the control keeps the verb. A card
> title is a noun phrase for the object; a button is a verb phrase for the act. Where obeying
> this would leave the card with no title worth writing, the control has no title above it at
> all — the field label above the input does that job.

**Why a hairline and not something louder.** `--ev-hairline-strong` is not available:
**R19** licenses it *"only for the resting boundary of an unchecked control"*. `border-border`
is the ordinary hairline and it is what `secondary` already carries, so a disabled primary and
a disabled secondary converge on one shape — which is correct, because a disabled control's
variant is information the operator cannot act on.

**Belongs in `docs/RULINGS.md`.** Append to `05-restructure/DECISIONS.md` as **D35** with
today's date and add one row to the rulings index. **I have not edited either file.**

### 8.3 What D35 does to this view

`Surge windows` and `Suspend surge` **merge into one card, `Surge`.**

```
Surge                                                             T1 16/600
Windows are set by pricing. Operations may only suspend surge.    T6
─ band 1 ─ the windows table (5 columns, header strip, --ev-row-h rows)
──────────────────────────────────────────── rule, G3 channel ────────────
─ band 2 ─ District                                               T2 14/500
           ( Al Narjis )( Al Sahafa )( Al Yasmin )( Al Malaz ) …
           [ Suspend surge ]
           Choose a district.                                     T6
```

- **D35b is satisfied by construction**: the card is `Surge`, the button is `Suspend surge`,
  and the district band has no heading — the `ToggleGroup`'s visible `District` label is the
  field label and does the whole job. `fin.pricing.surge.suspend.heading` and
  `fin.pricing.surge.suspend.subtitle` are **retired**; the card's one description line
  already says who may do what.
- **D35a is satisfied by the component**, once `ui/button.tsx:49` keeps `border-border` on
  `:disabled`. That is a one-line change in a shared file and it is **frontend-engineer's
  call to sequence**, not something this screen forks.
- One concern per card (§10.1) holds: the concern is surge — what runs, and the one lever on
  it. Revision 1's split put a table beside a chip field, two instruments at two widths with
  two internal rhythms, which is the third rhythm the owner named.
- `Suspensions` stays its own full-width card, because it is a different record set with its
  own toolbar, sort and filters.

**Above eight districts the `ToggleGroup` becomes a `Select`.** Six ship today
(`fixtures/zones.ts:59–64`), and a wrapping chip field stops being scannable past eight. Stated
now so the threshold is not discovered as a defect later.

### 8.4 R3 — which primary wins

**`Suspend surge` wins. It is the view's one `variant="default"`.**

- `Approve` is `variant="secondary"` (`RateCardBlock.tsx:364`) and is **permanently** disabled
  in Stage A — every branch of `approveBlockedReason` (`:285–:291`) is non-null for a draft. It
  never claimed the primary and does not now. Under **D35a** it gains a hairline, which is
  what makes its `RefusalLine` legible as an explanation of a control rather than as prose.
- The view row publishes **no control** on this view (`PricingScreen.tsx:153–169` renders the
  `Add plan` primary only on `subscription-plans` and `quick-rides`).
- The banner carries no actions.

So the rebuilt view renders exactly one filled button, and it is the only write an operator
has here.

---

## 9. Surfaces — both themes, and the Arabic row height

**D33** — the block is **one** `Card`. Not two cards side by side and not a card in a card.

- **Light.** Page `#ffffff`, pinned. The card is `--ev-surface`, measured **1.036 : 1** under
  the page (`globals.css:477`, which names the figure while explaining the tint that stacks on
  it). This design does not move it and takes no position on the 0.006 between that and D33b's
  stated 1.03 ceiling; the token is the token. The rail is **not** a second ground — it is the
  same card, divided by `border-e border-border`.
- **Dark.** Page `--ev-bg` `#14181e`, pinned. `--ev-surface` `#080a0d`, 1.113 : 1 under the
  page (`globals.css:1816`). The hairline draws the edge because **D34** deleted the inset
  highlight that used to.
- **The header strips** — the class matrix's, the surge table's, and the rail's — are
  `bg-muted` = `--ev-bg2`. In light that is 1.019 : 1 **under** the card, the smallest step in
  the product and its declared ceiling (`globals.css:477`). In dark it is 1.066 **over** the
  card, and **D33c rules that inversion deliberate and forbids "fixing" it**. `--ev-text-2` on
  `--ev-bg2` is **4.538 : 1**, the tightest pair in the product, **pinned by R22**
  (`ui/table.tsx:236`) — so T2's ink and the strip's ground are both frozen and neither moves
  without re-deriving the pair.
- **Three strips on the view is not a D33b violation, and visual QA should not file it as one.**
  D33b's objection is to *stacking* — *"a grey header on a grey card on a white page is three
  tones"*. Every strip here is a **direct child of its card**, so the deepest stack anywhere on
  the view is page → card → strip, which is D33b's own two-step example and is why the token
  carries a 1.019 ceiling. No strip sits inside another strip, and no card sits inside a card.
- **The selected rail row** is `bg-selected` (`--ev-selected`): light `#dce1e6`, 1.270 under
  the card; dark `#252d38`, 1.426 over it (`globals.css:447–469`). Plus the `w-marker
  bg-foreground` inline-start marker and `aria-current="page"` (X-RC-3). `--ev-text-2` on it is
  4.605 light / 6.221 dark, so the row's second and third lines still pass AA.
- **Hover** is `bg-row-hover`, deliberately a smaller step than `bg-selected` in both themes,
  *"so the mouse never outranks the choice"*.
- **D34 — nothing casts a shadow.** No card, no strip, no chip, no disabled button's new
  hairline. Separation is the value step plus the hairline, and nothing else. The focus ring
  survives; a ring is not a shadow.
- **D33a does not apply.** Nothing on this view covers the page. `ConfirmMoneyDialog` is
  already governed and stays white in light.

**The rail row height is `min-h-row-media`, not `h-row-media`, and Arabic is why.** Three lines
at T3 + T6 + T6 measure 20 + 16 + 16 = **52px** in Latin, which fits `--ev-row-h-media` 60 with
4px of block padding either side. In Arabic the same three lines measure 24 + 20 + 20 = **64px**
(`globals.css:2065–2066`, `:2058–:2059`) against `--ev-row-h-media` 64 (`:2015`) — zero padding,
and the current `h-row-media` (`RateCardBlock.tsx:215`) would clip rather than grow. A minimum
grows; a fixed height lies.

---

## 10. The four states, drawn

The block's states are driven by `listRateCards` alone (one read, AC-RC-06). `Surge` and
`Suspensions` keep their own reads and their own states; one read failing never blanks another
card.

### 10.1 Content

As drawn in §2. **Rail order is fixed and is never sorted by the operator:** `live`, then
`draft` newest first by `effectiveFrom`, then `superseded` newest first.

### 10.2 Loading

```
┌ Card ────────────────────┬───────────────────────────────────────────────┐
│ ▭▭▭▭▭▭  (strip, 36px)    │ ▭▭▭▭▭▭▭▭▭▭▭  ▭▭▭▭            (band A)         │
├──────────────────────────┤ ▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭                               │
│ ▭▭▭▭▭▭▭▭▭        ▭▭▭▭    │───────────────────────────────────────────────│
│ ▭▭▭▭▭▭▭▭▭▭▭▭             │ ▭▭▭▭ ▭▭▭ ▭▭▭ ▭▭▭ ▭▭▭ ▭▭▭   (strip, 36px)     │
│ ▭▭▭▭▭▭                   │ ▭▭▭▭ ▭▭▭ ▭▭▭ ▭▭▭ ▭▭▭ ▭▭▭   (row, 40px)       │
├──────────────────────────┤ ▭▭▭▭ ▭▭▭ ▭▭▭ ▭▭▭ ▭▭▭ ▭▭▭   (row, 40px)       │
│  … four rows in total …  │───────────────────────────────────────────────│
├──────────────────────────┤ ▭▭▭▭▭▭  ▭▭▭   │ ▭▭▭▭▭▭  ▭▭▭  (band C)        │
│ ▭▭▭▭▭▭▭▭▭▭▭▭  (footer)   │ ▭▭▭▭▭▭  ▭▭▭   │ ▭▭▭▭▭▭  ▭▭▭                  │
└──────────────────────────┴───────────────────────────────────────────────┘
```

- The **whole block** carries `aria-busy="true"`. Rail and pane skeleton render together. The
  pane never shows *"select a card"* while the rail loads: there is nothing to select yet, and
  a prompt that cannot be obeyed is a lie.
- **Four** rail rows at `min-h-row-media`, three bars each, plus the strip and the footer, so
  nothing moves when the data lands.
- The pane's skeleton draws **band A, band B and band C** and stops. Band D is omitted
  deliberately: its height depends on `simulation`, and a skeleton that promises a band the
  data may not fill is a layout shift with extra steps.
- **The block draws its own skeleton inline; no `LoadingSkeleton` pattern is minted.**
  `SkeletonPattern` is typed as *"the ten §6.4 patterns"* (`LoadingSkeleton.tsx:37`), so
  minting `P11` means minting a §6.4 row, which is product-owner's.
- **No spinner.**

### 10.3 Error

The read failed. The whole block collapses to one `ErrorState scope="card"` spanning both
columns — not an error in the rail with a live pane beside it, because a pane whose subject
cannot be listed has no subject.

> Couldn't load rate cards. Try again.  ` [ Try again ] `

Keys: `fin.error.read`, `fin.error.retry` — existing, unchanged.

### 10.4 Empty — three kinds

| Kind | What renders | Copy |
|---|---|---|
| **Zero rate cards, ever** | The block keeps its rail **strip** and shows one grey sentence where the rows would be. No pane, **no rail footer**, and the block collapses to one column | `No rate card exists, so nothing can price a trip.` |
| **Exactly one rate card** | The rail renders **normally**: one row, selected, marker and all. It does not collapse and there is no "1 of 1" chrome | — |
| **No card is live** | Everything renders. The rail footer's **first** entry is this | `No card is live` |

**R8, applied.** None of these gets an illustration. This is an empty **block** inside a page
that still renders a view row, a `Surge` card and a suspensions table — not a whole-page,
zero-records-ever state. One grey sentence, and the block keeps its strip label so the operator
can tell *what* is missing (`states.md`; R5-11).

**No second banner.** *"No card is live"* is a standing condition, and R10 sends a standing
condition to a banner — but this screen's one banner is already spent on Q7, and R10's other
half is *never two banners*.

### 10.5 Domain states, per selected card

| State | Band A | Band B | Band C | Band D |
|---|---|---|---|---|
| **Live** | `[Live]` success · `Effective from 1 April · no end set` · **no control** | 6 columns | as drawn | figures + `Change`, caption **past tense** |
| **Draft, modelled** | `[Draft]` info · `Effective from 1 August · no end set` · `Approve` disabled + `RefusalLine` | 6 columns | as drawn | figures + `Change`, caption **conditional** |
| **Draft, not modelled** | `[Draft]` info · `Approve` disabled + `RefusalLine` (AC-404) | 6 columns | as drawn | **band label kept**, one grey T6 sentence |
| **Superseded** | `[Superseded]` neutral · `Effective 1 January to 1 April` · **no control** | 6 columns | as drawn | figures + `Change`, caption **past tense** |

**What a draft's pane offers that a live one does not:** exactly one thing — `Approve` and its
refusal line. Nothing else differs by status except tense and the effective line. A draft is
not editable (Stage B, BLOCKED on Q7), cannot be deleted, and has no "make live" path.

**What `Not modelled` means:** `simulation === null`. Copy, unchanged:

> Not modelled against any trip. A card nobody modelled cannot be approved.

Not an em dash, not `0%`, not blank. An em dash would claim the number exists somewhere
(`states.md`; R5-1).

### 10.6 `Surge` and `Suspensions`

| Card | Loading | Error | Empty |
|---|---|---|---|
| `Surge`, windows band | three `Skeleton` bars at `--ev-row-h` | `ErrorState scope="card" card={false}` with `Try again`; the district band still renders | `No surge window is configured.` (T6). The district band still renders — a window read failing does not stop a suspension |
| `Surge`, district band | one `Skeleton` at `h-control`, full width | `ErrorState scope="card" card={false}`; the primary is not rendered | `No zone is tracked.` and the primary is not rendered |
| `Suspensions` | `DataTable` `P1` | `DataTable` error slot, `fin.error.read` | first run: `No surge suspension has ever been raised.`, **no illustration** (R8). Filtered to nothing: `fin.empty.noMatch` |

---

## 11. Components

| Element | Component | Variant / tone | Note |
|---|---|---|---|
| The block | `Card` | default | One card. `overflow-hidden` already on it, so the rail's hairline and the matrix's full-bleed strip meet the radius cleanly |
| Rail strip | `<h2>` styled **T2**, `h-(--ev-row-h-head) bg-muted px-3` | — | Visually the same instrument as a table header strip, because that is what it is: a label over a column of records. **Size is not heading level** — it is an `<h2>` at T2 and that is deliberate |
| Rail list | `<ol>` → `<li>` → `<a>` | — | `aria-labelledby` the strip |
| Rail row | `min-h-row-media`, three lines at G0 | T3 / T6 / T6 | §9 for the Arabic arithmetic |
| Selected marker | `<span aria-hidden className="pointer-events-none absolute inset-y-0 start-0 w-marker bg-foreground" />` | — | `ConversationListItem.tsx:64` |
| Rail footer | `<p>` at **T6**, `mt-auto border-t border-border-soft px-3 py-2` | — | §7 |
| Pane title | `CardTitle` at **T1**, `font-mono` on the version | — | X-RC-2a: `font-mono` is for the machine identifier alone. The card's subject is the selected card, so the card's one title is its version |
| Status badge | `StatusBadge` | `Live` → **success** · `Draft` → **info** · `Superseded` → **neutral** | Unchanged |
| `Approve` | `Button` | `secondary`, `size="xs"`, `disabled` | Band A's inline-end. Gains a hairline under **D35a** |
| Refusal line | `RefusalLine` | — | T6, at band A's inline-**start**, under the effective line. Never `title` |
| Class matrix | `Table` / `TableHeader` / `TableHead` / `TableRow` / `TableCell` (`ui/table.tsx`) | — | **Changed from `KeyValueTable`.** A six-column matrix of records is a table, not a key/value list. Headers wrap and never truncate (`ui/table.tsx:241–262`), so `Cancellation (SAR)` takes a second header line and the strip grows uniformly — that is the product's measured answer and not a defect |
| Money | `MoneyCell` | `unit="none"` | Header carries `(SAR)` |
| Band label (`Commission and VAT`, `Floors`, `Modelled impact`, `District`) | `<h3>` / `<span>` at **T2** | — | A label that heads a field |
| Key/value rows in band C | `KeyValueRow` | `numeric` on the four `Floors` values and the two commission values | One instrument, both halves |
| Band D figures | label at **T6** over value at **T4**, `flex flex-wrap gap-6` | — | `Rider bill before` · `Rider bill after` · `Change` |
| The delta | the third **labelled figure**, not a bare span | neutral ink, T4 | R4-5 — neutral. `MetricTile.tsx:21` — a badge is *"never a status, never the delta"*. Giving it a label also removes an unlabelled number from the layout and makes it mirror cleanly |
| `Surge` card | `Card` + `CardHeader` + `CardTitle` + `CardDescription` | — | T1 / T6. Replaces the hand-rolled `h2 text-sm font-semibold` at `SurgeCards.tsx:134` and `:249` |
| Surge windows table | same `ui/table.tsx` set as the class matrix | — | Three immutable rows. A `DataTable` here is a toolbar with nothing to do |
| Window state badge | `StatusBadge` | `Running` → **success** · `Off` → **neutral** | Existing keys |
| District chips | `ToggleGroup type="single" variant="outline"` + `ToggleGroupItem` | the component's own on-state, untouched | `toggle.tsx:8` — *"R3 — THE ON STATE IS NOT `bg-primary`."* Above eight districts this becomes a `Select` (§8.3) |
| `Suspend surge` | `Button` | **`variant="default"`** | The view's one primary (R3, §8.4). Disabled without a district or without the gate, with a `RefusalLine`, never a `title` (§11.2) |
| Suspensions table | `DataTable` + `useIndexTable({ mode: 'queue', getRowId, urlKey: 'sus' })` | no `bulkClaim`, no `rowActions` | Queue, not ledger: a ledger is money and is unsortable by rule (AC-48); this is a non-money record list an operator wants sorted by `Started` |
| Suspension state badge | `StatusBadge` | `In force` → **warning** · `Ended` → **neutral** | **R14**: the same label always takes the same tone, so `In force` does not reuse `Running`. **R17**: one warning tone, and an active suppression someone must end is what it is for |
| Confirm | `ConfirmMoneyDialog` | unchanged | AC-411 |

**No red anywhere on this view.** No red badge (R7), no destructive button, no row marker.
R5a's four uses are all unclaimed here.

---

## 12. Interaction, keyboard, screen reader

Unchanged from revision 1 except where the structure moved. Restated in full so nothing has to
be looked up in two places.

### 12.1 The rail

**ARIA.** An `<ol>` of `<li>`, each holding one `<a href>`. **Not** `role="listbox"` /
`role="option"`: selection changes the URL and is deep-linkable. Mirrors
`ConversationList.tsx:~92` and `ConversationListItem.tsx:66–71`.

- The `<ol>` is named by the rail strip via `aria-labelledby`.
- The selected row's `<a>` carries `aria-current="page"`.
- Its accessible name is `Show rate card RC-2026-04-01` — its visible content is three
  fragments and a badge, none of which is a sentence.
- `href` is `?view=rate-card&card=RC-2026-08-01`. `card` is owned by this view.

**Keyboard.** `useRovingFocus({ itemCount, orientation: 'vertical', initialIndex: selectedIndex })`.

| Key | Does |
|---|---|
| `Tab` into the rail | Lands on the **selected** row, not the first |
| `ArrowDown` / `ArrowUp` | Move **focus** within the rail. **They do not select** — the pane does real work, and selection-follows-focus would render four panes to reach the fourth card |
| `Home` / `End` | First / last row |
| `Enter` | Selects. The pane updates. **Focus stays on the row** |
| `Tab` out of the rail | Into the pane. On a live or superseded card the pane holds nothing focusable, so the next stop is the `Surge` card's first chip |

`ArrowDown` is down in every language, so a vertical list needs no RTL case
(`useRovingFocus.ts:20–22`).

**Announcement.** Focus does not move, so nothing announces by itself. The pane carries one
permanently mounted polite region whose text is swapped:

```html
<p className="sr-only" role="status">Showing rate card RC-2026-08-01, draft.</p>
```

Mounted at all times — a live region added to the DOM in the same frame as its text is not
announced. Exactly one live region in the block.

### 12.2 Everything else

| Element | Opens / does |
|---|---|
| Rail row | Selects, in place. **No modal, no drawer, no route change.** §5.0's table sends a modal to an irreversible act and a drawer to a peek beside a list; this is neither — it is the view's primary content |
| A matrix row | Nothing. Not clickable, no hover ground beyond the table's own |
| A district chip | Toggles within the group. Choosing a second deselects the first |
| `Suspend surge` | Opens `ConfirmMoneyDialog` naming the chosen district. An irreversible act confirms (§5.3) |
| A suspensions row | Nothing. No row actions, no kebab (**D8**: the kebab begins at three) |
| `Escape` | Nothing on the view; closes the dialog when it is open |

**Focus.** Every interactive element takes the global `:focus-visible` ring — 2px `--ring` at
2px offset. Nothing here sets `outline-none` without one. The rail rows use
`focus-visible:ring-inset` so the ring is not clipped by the card's `overflow-hidden`.

---

## 13. Arabic (§9)

| Thing | Mirrors? |
|---|---|
| The block: rail at the inline-**start**, pane at the inline-**end** | **Yes** — in Arabic the rail renders on the physical right |
| The rail's selection marker | **Yes** — `start-0`, never `left-0` |
| The rail column's divider | **Yes** — `border-e`, never `border-r` |
| The badge in a rail row; `Approve` in band A | **Yes** — `ms-auto` pushes each to its row's inline-end |
| Table **columns** | **Yes.** `Class`, `Window`, `District` are `text-start`; every numeric column is `text-end` |
| The **numeral runs** inside them | **No.** `1,234.00` keeps its character order (**AC-73**) — `Money` wraps every value in `<bdi>` and `globals.css` pins `tabular-nums` on `table` in `@layer base`. **R4**: the *rule* does not flip; the column itself does move to the other side |
| Band D's three figures | **Yes, as a group.** `Rider bill before` sits at the inline-start in both languages; the numerals inside each do not reorder |
| `1.3×` | **No.** U+00D7, bidi class ON, `Bidi_Mirrored=No`. Rendered `{value}×` inside `<bdi>` |
| `7–9`, `12%` | **No** — one numeric run each, in `<bdi>` |
| `1 Jan – 1 Apr` | **The pair mirrors; each date does not.** Two `<bdi>` spans with the en dash as a separate `aria-hidden` element, so the "from" date sits at the inline-start in both languages |
| The rail footer's `·` separators | **Same construction** — drawn, `aria-hidden`, never inside a string (AC-443) |
| `RC-2026-04-01` in `font-mono` | **No, and the face is safe.** An ASCII token in `<bdi>`; `--font-mono` is never applied to a translated string |
| Row height | **Grows.** `min-h-row-media` — §9 has the arithmetic |
| Column-header wrapping | **Grows.** `h-(--ev-row-h-head)` is a minimum on a table cell (CSS 2.1 §17.5.3); the median Arabic header is 0.857× the English one (`ui/table.tsx:250`), so Arabic wraps less, not more |
| Delta sign | `+5.2%` / `−3.4%` (U+2212, §8.3.2), inside `<bdi>` |

**One live i18n defect (F-RC-3, still open).** `SurgeWindow.days` holds `Sun`…`Sat` as raw
English from legacy; the `Days` column maps each value through `fin.pricing.surge.day.<sun…sat>`
(`SurgeCards.tsx:30–38`, already built). The data layer does not change.

**Prose check.** Nothing in this document says "left" or "right" about a layout. Every label
was written to survive Arabic word order: `Commission, on demand` is a noun with a qualifier,
not an English-order phrase.

---

## 14. Copy — every string, final

Sentence case. Buttons are verbs. No exclamation marks. Full sentences take a period;
fragments, labels and buttons do not (**R6**). No em dash (`copy.md` 12). **No uppercase and
no letter-spacing anywhere on this view** (§6.3 D18). **No monospace figures** — `font-mono`
is the version identifier only (X-RC-2a).

**No toast changes**: this view raises one, `fin.pricing.surge.toast.suspended` = `Surge
suspended`, 15 characters, which passes **R9**.

> A copy sheet is being written in parallel at
> `docs/05-restructure/design/rate-card-copy-sheet.md`. **The keys and the English below are
> what this design requires**; where the two documents differ on a string, the copy sheet's
> wording wins provided the key set and the sentence count are the same. Where the copy sheet
> would restore a retired key or add a line to a band, this document wins, because that is
> layout and not wording.

### 14.1 New keys

Every key needs an Arabic entry in `src/i18n/ar/financials.ts` in the same commit. Run
`npm run i18n:keys` afterwards.

| Key | English |
|---|---|
| `fin.pricing.rateCard.terms.heading` | `Commission and VAT` |
| `fin.pricing.rateCard.impact.change` | `Change` |
| `fin.pricing.rateCard.impact.caption.past` | `Modelled on {trips} trips, run {date}. Measured against the card this one replaced.` |
| `fin.pricing.rateCard.impact.caption.future` | `Modelled on {trips} trips, run {date}. Measured against the card this one would replace.` |

### 14.2 Changed keys

| Key | Was | Is | Why |
|---|---|---|---|
| `fin.pricing.surge.heading` | `Surge windows` | `Surge` | The card now holds the windows and the lever on them (§8.3) |
| `fin.pricing.rateCard.floors.support` | `Support per subscriber` | `Support per subscriber` — unchanged, but it now sits in a key/value row and no longer wraps to two lines | — |

### 14.3 Retired — delete from `copy.ts` **and** `src/i18n/ar/financials.ts`

| Key | Why |
|---|---|
| `fin.pricing.rateCard.footer.live` | R10 — its second clause is the banner's title; its first is the `Live` badge plus the effective line (§6) |
| `fin.pricing.rateCard.footer.superseded` | Same, for `Superseded` (§6) |
| `fin.pricing.surge.suspend.heading` | **D35b** — it was the button's label (§8) |
| `fin.pricing.surge.suspend.subtitle` | The card description says it, and the refusal line says the rest (§8.3) |
| `fin.pricing.rateCard.impact.trips` | Folded into `…impact.caption.past` / `.future` |
| `fin.pricing.rateCard.impact.ranAt` | Folded into the same |

`fin.pricing.stageA.body` is **kept and still used** — on the other three views only (§6).
`fin.pricing.rateCard.col.wait` and `…rateCard.wait` are kept and still unused (F-RC-2).

### 14.4 Unchanged and still correct

`…rateCard.heading` · `…status.live|draft|superseded` · `…effective.noEnd` · `…effectiveUntil` ·
`…col.class|base|perKm|perMin|minFare|cancelFee` · `…table.caption` · `…rail.heading|select|from|range|delta|notModelled` ·
`…announce` · `…stat.onDemand|subscription|consumerPrices` · `…vat.included|excluded` ·
`…impact.heading|before|after|none` · `…floors.heading|caption|margin|fee|support|reserve` ·
`…approve` · `…approve.blocked.proposer|simulation|stage` · `…noLive` ·
`…count.cards|live|drafts|superseded` · `…empty.body` ·
`…surge.readOnly|col.*|hours|multiplier|enabled|disabled|empty|day.*` ·
`…surge.suspend.group.label|chosen|prompt|title|body|confirm|reason.*|zone.empty` ·
`…surge.suspensions.*` · `…surge.state.inForce|ended` · `…surge.toast.suspended` ·
`fin.error.read|retry|row` · `fin.empty.noMatch`.

**Note on `…stat.onDemand` / `…stat.subscription` / `…stat.consumerPrices`.** The strings are
right and are kept; only their carrier changes, from a pseudo-KPI cluster to a key/value row
in band C.

---

## 15. Acceptance criteria

`AC-RC-01` … `AC-RC-31` are revision 1's. The table below says which stand, which are
superseded and by what. **qa-engineer writes one test per live criterion.**

| Revision 1 | Status |
|---|---|
| AC-RC-01, 02, 03, 04, 05, 06 | **Stand**, with AC-RC-03's row height read as a minimum (AC-RC-44) |
| AC-RC-07 | **Superseded by AC-RC-33 and AC-RC-36** — the header no longer carries statistics |
| AC-RC-08 | **Superseded by AC-RC-34** — the matrix moves to `ui/table.tsx` chrome |
| AC-RC-09 | **Superseded by AC-RC-40** — the last uppercase run goes too |
| AC-RC-10, 11, 12 | **Stand**, amended by AC-RC-37 (the delta is a labelled figure) |
| AC-RC-13 | **Superseded by AC-RC-36** — `Floors` is half of band C |
| AC-RC-14 | **Superseded by AC-RC-35** — `Approve` moves into band A |
| AC-RC-15 | **Stands** |
| AC-RC-16 | **Superseded by AC-RC-43** — the skeleton follows the new bands |
| AC-RC-17, 18, 19 | **Stand** |
| AC-RC-20 | **Superseded by AC-RC-39** — `No card is live` moves to the rail footer |
| AC-RC-21, 22, 23, 24 | **Stand** |
| AC-RC-25 | **Stands** |
| AC-RC-26 | **Superseded by AC-RC-46 and AC-RC-47** — the panel merges into the `Surge` card |
| AC-RC-27, 28, 29, 30, 31 | **Stand** |

### New criteria

**Type**

32. **AC-RC-32** Every text node on the view renders at one of exactly **seven** computed sizes
    — 24, 16, 14, 14, 14, 12, 11 — and each maps to a rung in §3.1. Measured in Chromium at
    1280 in both languages. No text node on the view computes to 20px, 28px, or any size not in
    the ramp.
33. **AC-RC-33** No numeral on the view outside the class matrix, the surge table and the
    suspensions table renders heavier than 400 **except** the three figures in band D, which
    render 14/600. `VAT included` renders at 12/400 muted.
34. **AC-RC-34** The class matrix renders `ui/table.tsx`'s chrome: a `bg-muted` header strip at
    a computed height of at least `--ev-row-h-head`, column headers at 14/500 in
    `--ev-text-2`, body rows at `--ev-row-h`. `Class` is `text-start`; the other five are
    `text-end` with tabular figures, in both languages. Every money cell is a `MoneyCell` with
    `unit="none"` and `(SAR)` appears only in column headers.

**Structure**

35. **AC-RC-35** The pane renders exactly **four** bands in the order identity, prices, terms,
    impact, separated by three hairlines. `Approve` and its `RefusalLine` render inside band A
    for a draft, and nothing renders below band D.
36. **AC-RC-36** Band C renders two columns of the same instrument: `Commission and VAT` with
    three key/value rows and `Floors` with four, and one caption spanning both — `Guardrails a
    card is checked against. Nothing enforces them yet.` Neither column uses a
    label-over-figure cluster.
37. **AC-RC-37** Band D renders three labelled figures — `Rider bill before`, `Rider bill
    after`, `Change` — and one caption on one line. The `Change` figure is neutral ink in a
    plain span, not a badge and not a pill; a negative uses U+2212. **No `→` character appears
    anywhere in the rendered output.**
38. **AC-RC-38** No text node on the view repeats the sentence *"Editing waits on the pricing
    owner decision"* or *"This card prices every trip today"*. The read-only condition appears
    exactly once on the page, in the banner.

**Banner, counts, primary**

39. **AC-RC-39** The `Rate card` view publishes no view-row facts: the view row renders the
    stadium and nothing else. The counts render in the rail's footer, sentence case, as
    `4 rate cards · 1 live · 2 drafts · 1 superseded`, with the separators as `aria-hidden`
    elements. With no live card the first entry is `No card is live`. With zero cards no footer
    renders.
40. **AC-RC-40** **No element on the view computes `text-transform: uppercase` or a non-zero
    `letter-spacing`.**
41. **AC-RC-41** On the `Rate card` view the page banner renders its title and **no body**, and
    the page renders exactly one banner. On the other three views the banner renders both.
42. **AC-RC-42** The view renders exactly one element with the `variant="default"` fill, and it
    is `Suspend surge`. `Approve` renders `secondary` and disabled.

**States**

43. **AC-RC-43** While the read is in flight the block renders `aria-busy="true"` with the rail
    strip, four rail-row skeletons, a rail-footer bar, and a pane skeleton drawing bands A, B
    and C only. **No spinner** is rendered, and no skeleton is drawn for band D.
44. **AC-RC-44** A rail row's height is a **minimum**: with `lang="ar"` and three lines of
    content the row's computed height is at least 64px and no line is clipped.

**Spacing**

45. **AC-RC-45** Every computed gap and padding inside the view is 4, 8, 12 or 24px, or a row
    height token. No computed 2px or 6px gap exists anywhere on the view. The gap between the
    three cards is 24px, and the channel around each band rule inside a card is 24px.

**Surge**

46. **AC-RC-46** `Surge windows` and `Suspend surge` render as **one** card titled `Surge`, with
    the windows table above a rule and the district field below it. No heading on the view
    carries the string `Suspend surge`, and the string appears exactly once — on the button.
47. **AC-RC-47** The disabled `Suspend surge` button renders a visible 1px `border-border`
    hairline and its full box (**D35a**); it is distinguishable from a paragraph of muted text
    by more than its ink.
48. **AC-RC-48** The `Surge` card's district band renders no heading. The `ToggleGroup` is
    labelled `District` by a visible T2 label, and choosing a chip does not fill it with the
    brand colour.
49. **AC-RC-49** A failed windows read renders an `ErrorState` inside the `Surge` card and the
    district band still renders; a failed zones read renders an `ErrorState` and the windows
    table still renders. Neither blanks the other.

---

## 16. Tokens this needs

**None.** Every value in §3 and §4 is a declared token or a Tailwind step already in the build:
`--text-xl`, `--text-base`, `--text-sm`, `--text-xs`, `--text-2xs`, `--ev-row-h-head`,
`--ev-row-h`, `--ev-row-h-media`, `--ev-detail-rail-w`, `--ev-marker`, `--ev-radius-card`,
`--card-spacing`, `--ev-surface`, `--ev-bg2`, `--ev-selected`, `--ev-row-hover`,
`--ev-text-2`, `--ev-ink`, `border-border`, `border-border-soft`, and the spacing steps
`gap-1`, `gap-2`, `gap-3`, `gap-6`.

**One token was considered and refused: a named "section gap".** `globals.css:3200` rules on it
directly — *"Tailwind's scale IS the spacing token set … the section gap wants the next real
step up rather than a new `--ev-*` name … adding a spacing token here would be the drift, not
the fix."* G3 is `gap-6`.

If a design-token-steward disagrees with the refusal, that is a ruling, not a screen decision.

---

## 17. Refusals, deviations, findings, open questions

### 17.1 Refusals — where the brief or the reference conflicts with a rule

| # | Asked / drawn | Refused, and what happened instead | Rule |
|---|---|---|---|
| **X-RC-14** | *"Density is the brand — do not fix it toward roomier spacing"* (redesign brief) | **Partly refused.** The type scale raises card titles 14 → 16, column headers 12 → 14, and table rows ~32 → 40. The brief's premise — that Eyvar's density is a sanctioned deviation — is **stale**: **D-2 is retired** and its type-ramp and spacing-scale suspensions are *"void and may not be cited again"* (`06-eyvar-mapping.md:67`). What survives is D-2′, the page gutter, which this view does not touch. Everything raised here is raised **to** a declared step, not past one, and every value stays on the 4px grid | D-2 retired; D15 |
| **X-RC-15** | Give the page a headline numeral so the eye has somewhere to land | **Refused.** No `--text-kpi` and no `--text-lg` is spent on this view. A rate card is a matrix; any single figure lifted out of it would be a summary set louder than what it summarises. The landing point is bought with region chrome, ink and contrast instead (§3.3). **The owner can overrule this in one line** — the sentence to change is §3.3's last paragraph, and band D's three figures are where a display step would go | H2 (`globals.css:2988`), H5's rank |
| **X-RC-1** | Uppercase, letter-spaced labels | **Refused, now everywhere.** Revision 1 kept one instance on the view-row caption rung; revision 2 removes it (§7). Zero uppercase runs on the view | §6.3 D18 |
| **X-RC-1a** | — | **Narrowed to nothing on this view.** The rung stays licensed product-wide; `ViewRow.tsx` is unchanged | V-9.4, AC-443 |
| **X-RC-2** | Monospace figures | **Refused.** Money through `Money` / `MoneyCell` in Inter with `tabular-nums`. `font-mono` is the version identifier alone (X-RC-2a) | standing owner ruling, `MetricTile.tsx:~306` |
| **X-RC-16** | Shorten `Cancellation (SAR)` so the header strip does not wrap | **Refused.** `ui/table.tsx:241–262` is a measured ruling: *"a header wraps; it does not truncate"*, and header height is the budget that gets spent. The strip grows uniformly and stays one band | `ui/table.tsx:241` |
| **X-RC-17** | Drop `(SAR)` from four of the five money headers so it is said once | **Refused.** §8.3.1 puts the unit in **the column header**, per column, and `Money.tsx:24–25` is the built enforcement. Five money columns means five suffixes | §8.3.1 |
| **X-RC-3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13** | — | **Unchanged from revision 1.** Ink marker on `bg-selected`, no `Live card` button, no filled chip, no `→`, no delta pill, no em dash, no restated unit, `Floors` not "held by every card", no per-card segmented filter, single select, both themes specified | as recorded in revision 1 |

### 17.2 Deviations from `DESIGN.md`

**One, and it is new.** **D35a** (§8.2) qualifies §8.6.3's disabled treatment as built at
`ui/button.tsx:49`: a disabled control keeps a `border-border` hairline. It suspends nothing —
§8.6.3's rule is that a disabled primary drops its **fill**, and that stands. It is written as
a ruling rather than a screen deviation because it applies to every disabled button in the
product, and it needs an owner's signature before it lands in a shared file.

Everything else resolves to an existing rule, an existing ruling, or an existing shipped
component.

### 17.3 Findings raised, not fixed

- **F-RC-1** — `docs/ref/patterns.md`'s Pricing & Plans row describes one of four views. Open.
- **F-RC-2** — several rate-card fields render nowhere: `freeWaitMin`, `waitPerMinHalalas`,
  `returnLegFactor`, `planDiscountPercent`, `surge.capByCity` / `minMultiplier` /
  `appliesToPlanLegs`. Spec `03-financials.md:664` requires the card read-only *"in full"*.
  **Not designed here** — it is scope the owner has not asked for. Recommended: one `Waiting and
  other rates` band inside the pane, between B and C, in a follow-up.
- **F-RC-3** — `SurgeWindow.days` ships raw English from legacy. Mapped at the render site;
  the data layer still stores English.
- **F-RC-4** — `docs/ref/tokens.md`'s *"Elevation — the closed set of three"* survived **D34**,
  which deleted all three tiers. It will be cited against a correct shadow-free component.
- **F-RC-6** — `DataTable.tsx:~2420` and `ui/button.tsx:25` both assert *"Eyvar ships one
  theme"* / *"there is no dark palette"*. Both are stale: `globals.css:1816` carries a full dark
  ladder and `src/hooks/useTheme.ts` applies it. Both matter here, because §9 specifies dark.
- **F-RC-7 — new, and the last heading mismatch on this page.** `IndexToolbar.tsx:271` renders
  every `DataTable` heading `text-lg font-medium` = **20/500**. There is no 20/500 rung in H5's
  rank: 20 is the sub-display **figure** step, whose live consumers are all numbers
  (`globals.css:3087`), and every TITLE rank in the ramp is 600, not 500
  (`globals.css:3163`). So the `Suspensions` card's heading will still differ from the other
  two cards' `CardTitle` after this rebuild. **The one-line fix is `text-lg font-medium` →
  `text-base font-semibold` at `IndexToolbar.tsx:271`, and it moves every index screen in the
  product** — it is the table owner's change, not this branch's. Recorded here so QA logs it
  as a known residual and not as a new defect.

### 17.4 Open questions — product-owner

- **A-3 — answered here as D35** (§8). It needs the owner's signature before `ui/button.tsx`
  changes.
- **Q-RC-1** Should a draft's class matrix mark which figures differ from the live card? The
  data supports it (`classes[]` on both). It is the first thing a pricing owner would look for.
  **Not designed here.**
- **Q-RC-2** `surge.capByCity` is keyed by city code (`RUH`, `JED`) and the product has no
  city-code catalogue, so anything that renders it shows a raw code. Related to F-RC-2.
- **Q-RC-3 — new.** §3.3 refuses a display numeral. If the owner wants one, band D's three
  figures are the place and `--text-lg` (20/600) is the step. One sentence changes.

---

## 18. Handoff

- **frontend-engineer** — build §2 through §12 and §15. Three decisions are yours to sequence,
  not to make: (1) **D35a touches `ui/button.tsx`, a shared file** — land it separately and say
  so, and do not fork a local disabled style for this screen; (2) `PricingScreen.tsx`'s banner
  memo gains one conditional (§6) and its `facts` wiring for this view goes away (§7); (3) the
  class matrix and the surge table move from `KeyValueTable` to `ui/table.tsx` — restyle
  nothing on arrival, they are already the product's chrome. **F-RC-7 is not yours in this
  branch.**
- **utilities-engineer** — three small helpers this design implies: (1) confirm
  `formatSignedPercent` emits **U+2212** for a negative, not a hyphen (X-RC-7 / AC-RC-37);
  (2) a `joinWithDot(fragments)` helper that renders `<bdi>` fragments with drawn `aria-hidden`
  separators, since the rail footer, the effective range and band D's caption all now need the
  same construction and AC-443 forbids writing the separator into a string; (3) nothing for the
  type or spacing scale — both are classes, and a helper that returned them would be a second
  token set.
- **design-token-steward** — **no tokens needed** (§16). One refusal is recorded there in case
  it is challenged.
- **product-owner** — **D35** needs a number and a home in `docs/RULINGS.md` and
  `DECISIONS.md`; F-RC-7 needs a decision because it moves every index screen; Q-RC-3 is a
  one-sentence overrule if the page wants a display numeral.
