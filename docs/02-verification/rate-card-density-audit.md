# Rate card — density audit

**Screen** Financials › Pricing & Plans › Rate card (`/financials/pricing?view=rate-card`)
**Question** The view passes all 31 acceptance criteria. The owner says it "needs massive
redesign, in spacing, text hierarchy, and overall design." This document is the measurement
of *where* and *by how much*. It proposes nothing.
**Probe** `scripts/harness/rate-card-density.mjs` — Chromium via Playwright against the dev
server at `http://localhost:4327`, clock pinned to `2026-06-25T09:14+03:00`.
**Runs** light/dark × en/ar at 1280, plus light/en at 1440 and 1920. 54 captures under
`scripts/harness/shots/rc-density-*`. Zero page errors in every run.
**Reference width** 1280 × 900 — the operator's real screen (CLAUDE.md). The app bar takes
52px, so the scrollport is **848px**.

Nothing here is a re-run of `fin-rate-card.mjs`. That harness still passes: the rail is
300px, the selected row takes the full-width `bg-selected` ground, nothing casts a shadow,
every numeric column end-aligns and the decimals land on the same x to 0.0px. The view is
rule-conformant. It also reads badly, and the two facts are compatible.

> **The density licence does not exist and is not cited anywhere below.** §6.2 **D-2**
> ("higher density — 13px base, ~30px rows") is **retired**, verified in
> `docs/05-restructure/DECISIONS.md:70` ("*D7 — retired; only D-2′, the 32px page gutter,
> survives*") and `:337` ("*The claim that Eyvar was denser than an ordinary console was
> measured against a roomier baseline. Re-measured, Eyvar matches the ordinary rhythm and in
> five places was tighter and has been loosened*"). Its §1.2 type-ramp and §1.3
> spacing-scale suspensions are void. Every judgement in this document is made against the
> ordinary ramp; nothing here is excused as "Eyvar is dense". This is load-bearing for F1
> and F9 — a two-step type ramp and a 33px optical gap have no sanctioned defence.

---

## Verdict

**Rebuild the composition. Do not patch it.** Eleven findings, of which six are structural
and would each survive a local fix. The single sentence that explains the owner's reaction:

> Sixty-five of the sixty-five text elements in the rate-card block render at 12px or 14px,
> in eight (size, weight, colour) combinations, carrying seven distinct levels of meaning —
> and the block's own title is the same rung as the numbers underneath it.

The two next-largest problems are that **50.2% of the operator's scrollport is spent before
the first price appears**, and that **the block's two largest regions are empty** (198px of
blank rail, 83px of blank column).

---

## Ranked findings

Ordered by how much each one costs an operator scanning for a price. Fix top-down.

| # | Severity | What was measured | Evidence |
|---|---|---|---|
| 1 | **Critical** | The whole block runs on two type sizes. 8 (size, weight, colour) triples, 65/65 elements at 12 or 14px. The pane's title shares its rung with six stat values. | F1 |
| 2 | **Critical** | 478px — 50.2% of the 848px scrollport — is consumed before the first price. 310px of that is chrome above the card. | F2 |
| 3 | **Critical** | The disabled primary "Suspend surge" paints as bare 14px text under an identical 14px heading. Owner question A-3, confirmed. The draft pane's "Approve" is the same defect, worse. | F3 |
| 4 | **High** | Two dead regions inside one card: 198px of empty rail (42% of the rail) and 83px of empty column under *Modelled impact*. The rail is the stretched side; the pane drives it. | F4 |
| 5 | **High** | `table-fixed` gives six equal 105.7px columns. 364px of the table's 634px — **57%** — is empty, while two of its headers wrap to two lines. | F5 |
| 6 | **High** | The table's ink sits 12px outside every other line in the pane, on both edges. Its last column's numbers stop 1px from the card border. | F6 |
| 7 | **High** | At 1280 the header stats wrap below the title. The header block goes 40px → 90px (en) / 106px (ar). It is correct only at ≥1440. | F7 |
| 8 | **Medium** | `(SAR)` costs 167px of ink — **26.3%** of the table's width at 1280, 30.4% in Arabic — to say one thing five times. | F8 |
| 9 | **Medium** | *Modelled impact* and *Floors* are two different label systems set side by side. Aligned for two rows, then they drift and three ink lines overlap. | F9 |
| 10 | **Medium** | Heading inversion: the 12-row suspensions log gets the page's largest sub-heading (20px). The rate card gets none above 14px. Row pitch 32.5px vs 57px. Only the 14px side is this screen's to fix. | F10 |
| 11 | **Low** | Arabic costs +264px of scroll (+14%) and wraps a different set of labels. Nothing mirrors incorrectly. | F11 |

Two further observations that are **not defects** are recorded at the end, so nobody spends
a fix on them.

---

## F1 — Seven levels of meaning, two type sizes  *(Critical)*

Every leaf text run inside the rate-card block, with its computed pixel size, weight and
colour. Counted in the browser, not from class names.

| px | weight | colour | n | example |
|---|---|---|---|---|
| 14 | 600 | `#171a21` | **7** | `RC-2026-04-01`, `22%`, `21.80 SAR` |
| 14 | 400 | `#171a21` | 12 | `Economy`, `5.00`, `1.20` |
| 12 | 600 | `#1d723c` | 2 | `Live` |
| 12 | 600 | `#1b51c4` | 2 | `Draft` |
| 12 | 600 | `#5c636e` | 1 | `Superseded` |
| 12 | 500 | `#5c636e` | **9** | `Rate cards`, `Class`, `Base (SAR)`, `Modelled impact`, `Floors` |
| 12 | 400 | `#171a21` | 8 | `RC-2026-04-01` (rail) |
| 12 | 400 | `#5c636e` | **24** | `From 1 Apr · no end set`, `Bill +5.2%`, `Measured against…` |

**Distinct sizes in the block: two — 12px and 14px. 65 of 65 elements (100%).**

The two rows that do the damage:

- **Row 6 (n=9)** is a single triple carrying three unrelated jobs: a *rail heading*
  (`Rate cards`), *column headers* (`Class`, `Base (SAR)`), and *section headings*
  (`Modelled impact`, `Floors`). A section heading and a column header are
  typographically identical. There is nothing to tell an operator that
  `Modelled impact` opens a new region and `Base (SAR)` labels a column.
- **Row 1 (n=7)** is the pane's *title* (`RC-2026-04-01`) sharing a rung with six stat
  values (`22%`, `20%`, `21.80 SAR`, `22.94 SAR`, `+5.2%`). **The detail pane has no
  typographic top.**

Heading census for the whole view, all four heading levels:

| element | tag | px | weight | colour |
|---|---|---|---|---|
| `Pricing & Plans` | H1 | 30 | 500 | ink |
| `Suspensions` | H2 | **20** | **500** | ink |
| `Surge windows` | H2 | **14** | **600** | ink |
| `Suspend surge` | H2 | **14** | **600** | ink |
| `RC-2026-04-01` | H3 | 14 | 600 (on the inner `bdi`) | ink |
| `Rate cards` | H3 | 12 | 500 | grey |
| `Modelled impact` | H4 | 12 | 500 | grey |
| `Floors` | H4 | 12 | 500 | grey |

Three H2s on one page at 14/600, 14/600 and 20/500. Size and weight **disagree** about which
matters: the 20px one is the *lighter* of the two.

**There is no density defence for this.** With D-2 retired, a 12px secondary line and a
14px body are not "the compact end of the scale" — they are the ordinary scale, spent down
to two steps. The ramp declares seven and this view renders two.

Not a new rule violation — the token layer already says so about itself.
`src/styles/globals.css:3002` records `--text-xs 12px, 577 uses — OVER-SPENT` and
`:3011` "*Four sizes render on any of them: 22, 16, 14, 12. The declared seven-step ramp is a four-step ramp on screen*". This view is that
ruling's worst single instance: a four-step ramp reduced to two.

Evidence `scripts/harness/shots/rc-density-light-en-1280-block.png`,
`…-dark-en-1280-block.png`.

---

## F2 — Half the screen is spent before the first price  *(Critical)*

Document y at 1280 × 900, light, English, scrollTop 0. The first price is `5.00` in the
Base column; its ink top is y = 478.

| band | y | px | share of the 478 |
|---|---|---|---|
| app top bar | 0 – 52 | 52 | 10.9% |
| page padding above the title | 52 – 96 | 44 | 9.2% |
| H1 `Pricing & Plans` | 96 – 136 | 40 | 8.4% |
| gap | 136 – 162 | 26 | 5.4% |
| view tab strip | 162 – 194 | 32 | 6.7% |
| gap | 194 – 208 | 14 | 2.9% |
| **banner** | 208 – 298 | **90** | **18.8%** |
| gap | 298 – 310 | 12 | 2.5% |
| card top → table header top | 310 – 425 | 115 | 24.1% |
| table header row | 425 – 470.5 | 45.5 | 9.5% |
| first row leading | 470.5 – 478 | 7.5 | 1.6% |
| **first price ink** | **478** | | |

- **310px (64.9%) is page chrome** above the card — bar, title, tabs, banner and the gaps
  between them.
- Against the 848px scrollport: **50.2%** is spent before the first datum.
- Against the 900px physical screen: **53.1%**.

Whole-view budget (`main` is the scroller — `main.min-h-0 flex-1 overflow-y-auto`):

| width / lang | scrollHeight | screens to read | first price at | % of scrollport |
|---|---|---|---|---|
| 1280 en | **1867px** | **2.20** | y 478 | **50.2%** |
| 1280 ar | **2131px** | **2.51** | y 496 | **52.4%** |
| 1440 en | 1628px | 1.92 | y 392 | 40.1% |
| 1920 en | 1566px | 1.85 | y 392 | 40.1% |

The operator's own width is the worst of the four on every measure.

### The banner's share

| | 1280 | 1440 |
|---|---|---|
| height | **90px** | 70px |
| body lines | 2 | 1 |
| % of the 848px scrollport | **10.6%** | 8.3% |
| % of the 478px spent before the first price | **18.8%** | — |

Ground `#eaf0fe`, ink `#1b51c4` at 14/600 — measured contrast **6.09:1**, which passes. It
is also, by weight and by saturation, the loudest object on the first screen, and it says
nothing about a price. R10 permits exactly one banner and there is exactly one; this is a
weight observation, not a rule violation.

Evidence `scripts/harness/shots/rc-density-light-en-1280-firstscreen.png`.

---

## F3 — The disabled primary reads as a second heading  *(Critical)* — owner question A-3

Confirmed in the browser. `src/components/ui/button.tsx:49`:

```
disabled:pointer-events-none disabled:border-transparent disabled:bg-transparent
disabled:text-muted-foreground disabled:shadow-none
```

A disabled button of **any** variant drops its fill *and* its border. Computed styles from
the live page, Suspend surge card, ground `#fafbfc`:

| | H2 `Suspend surge` | disabled Button `Suspend surge` |
|---|---|---|
| font-size | 14px | **14px** (Δ **0px**) |
| weight | 600 | 500 (Δ **100**) |
| colour | `#171a21` | `#5c636e` |
| background | — | `rgba(0, 0, 0, 0)` — **no paint** |
| border | — | 1px solid, colour `rgba(0, 0, 0, 0)` — **no paint** |
| contrast vs card | 16.80:1 | 5.85:1 |
| step between the two inks | — | **2.87:1** |
| vertical distance | — | 88px below the H2 |

The card renders, top to bottom:

```
Suspend surge                      14/600 ink      ← H2
Choose a district, then confirm.   12/400 grey     ← subtitle
[ six district chips ]
  Suspend surge                    14/500 grey     ← the disabled primary
Choose a district.                 12/400 grey     ← the refusal
```

The same string twice, each followed by a grey 12px line beginning "Choose a district". The
second pair is **one weight step and 2.87:1 of ink** away from the first, and is indented
**10px** further (the button's own `px-2.5`), which reads as a sub-heading rather than as
padding. `duplicateStrings` on the card returns exactly `["Suspend surge"]`.

Holds in dark (ink step **1.88:1** — *worse*) and in Arabic (120px apart).

**The same defect, worse, on the detail pane.** The draft pane's `Approve` is the only
control the rate-card block ever renders (`RateCardBlock.tsx:364`, `variant="secondary" size="xs" disabled`):

| | disabled `Approve` | the refusal line under it |
|---|---|---|
| font-size | 12px | 12px (Δ **0**) |
| weight | 500 | 400 (Δ 100) |
| colour | `#5c636e` | `#5c636e` — **identical token** |
| contrast | 5.85:1 | 5.85:1 |
| background | none | — |

Same size, same colour, same contrast. **Weight is the only carrier of the distinction
between the pane's one control and its caption.** It is indented 8px from the pane's reading
edge by the `xs` button's `px-2`, and it sits at the bottom of a 500px card, below the
Floors caption. In dark, both are `#a9aeb4` at 8.87:1 — still identical.

Evidence `scripts/harness/shots/rc-density-light-en-1280-suspend.png` (the clearest single
capture in this audit), `…-light-en-1280-draft-block.png`, `…-dark-en-1280-suspend.png`.

---

## F4 — Two large empty regions inside one card  *(High)*

The owner named the Comfort → *Modelled impact* gap. It is real but it is the smallest of
the three.

**The empty rail.** The rail column is 470px tall. Its heading is 29px and its four rows are
60–61px each with a 0px gap and a 1px hairline between them — content ends at y 583.

*Named cause, with the direction corrected.* `RateCardBlock.tsx:143` is
`<Card className="flex-row gap-0 py-0 compact:flex-col">`. A flex row defaults to
`align-items: stretch`, so the shorter column is padded to the taller one. **The taller
column is the pane, in every case measured — so it is the rail that is stretched, not the
detail side.** The rail's intrinsic content height is a constant that does not vary with
viewport width, because it is always one heading plus four fixed-height rows:

| | rail *intrinsic* | pane (the driver) | rail stretched by |
|---|---|---|---|
| 1280 en | **272px** | 470px | **+198px** |
| 1440 en | **272px** | 372px | +100px |
| 1920 en | **272px** | 356px | +84px |
| 1280 ar | **292px** | 526px | +234px |

The rail never changes; the pane's height is what varies, and every pixel the pane grows is
a pixel of blank rail. This matters for sequencing: the void is a *symptom* of F5 and F7
(the pane is tall because its table header wraps and its stats wrap), so fixing those
shrinks the void without anyone touching the rail. Fixing the rail alone fixes nothing.

| width / lang | rail height | empty below the last row | share of the rail |
|---|---|---|---|
| **1280 en** | 470px | **198px** | **42.1%** |
| 1280 ar | 528px | **234px** | 44.3% |
| 1440 en | 374px | 100px | 26.7% |
| 1920 en | 358px | 84px | 23.5% |

198px × 300px of blank ground, bottom-left of the card, at the operator's own width. It is
the largest single object on the first screen after the table.

**The empty column.** The band is `grid-cols-3`; *Modelled impact* takes `col-span-2`
(386.7px), *Floors* takes one track (187.3px). The grid stretches both to the taller one:

| | last ink bottom | section bottom | **empty tail** |
|---|---|---|---|
| *Modelled impact* (386.7px wide) | y 658 | y 741 | **83px** |
| *Floors* (187.3px wide) | y 740 | y 741 | 1px |

The wide column has 83px of blank under it because the narrow column needs 180px to state
four numbers. The 2:1 split is on the wrong side.

**The Comfort → Modelled impact gap**, decomposed:

| component | px |
|---|---|
| Comfort row's trailing leading (`py-1.5` + line box) | 8 |
| pane `gap-3` | 12 |
| band `border-t` | 1 |
| band `pt-3` | 12 |
| **total clear space, ink to ink** | **33** |

Against 16px between the Economy and Comfort rows: **2.06×**. Every component is on the 4px
grid; the sum is not what a 12px gap looks like.

**The Suspend surge card**: 97px empty below its last ink (36% of its 269px height), forced
by the taller Surge windows card beside it in the same `grid-cols-3` row.

Evidence `…-light-en-1280-block.png`, `…-light-en-1280-firstscreen.png`.

---

## F5 — Six equal columns for one text column and five two-digit numbers  *(High)*

`table-layout: fixed`, no width declarations. Six columns of **105.7px** each (16.7%).

| column | width | header ink | value ink | **slack** | header lines |
|---|---|---|---|---|---|
| Class | 105.7 | 31.6 | 61.4 | 44.3 | 1 |
| Base (SAR) | 105.7 | 64.8 | 31.0 | **74.7** | 1 |
| Per km (SAR) | 105.7 | 76.5 | 31.0 | **74.7** | 1 |
| Per minute (SAR) | 105.7 | 61.7 | 31.0 | **74.7** | **2** |
| Minimum (SAR) | 105.7 | 89.3 | 40.1 | 65.6 | 1 |
| Cancellation (SAR) | 105.7 | 71.3 | 31.0 | **74.7** | **2** |

- **Total slack across the five money columns: 364.4px of 634px — 57.5% of the table is
  empty**, while two of its headers wrap.
- The header row is **45px** tall; a body row is **32.5px**. *The header is 38% taller than
  the data.* At 1440 no header wraps and the row is 29px — so 1280 pays a 16px penalty that
  1440 does not.
- Because `th` is vertically centred, the two wrapped headers sit **8px higher** than the
  four single-line ones. **The header row has two baselines.** Visible in every capture:
  `Per minute` and `Cancellation` float above `Class`, `Base`, `Per km`, `Minimum`.
- **No measure cap.** At 1920 the block is **1376px** wide (`--ev-page-max` is 1120px and is
  not in force here); each money column becomes **183px** to hold a 31px number — **83%
  slack**.

Arabic at 1280: columns 99px, header row **53px** vs a 36.5px body row, two headers wrapped
(a *different* two — `لكل دقيقة (SAR)` and `الحد الأدنى (SAR)`).

R4 is satisfied and should not be touched: every money column end-aligns and the decimal
points land on the identical x in every row (Base 806.4/806.4, Per km 912.0/912.0, Per minute
1017.7/1017.7, Minimum 1123.4/1123.4, Cancellation 1225.1/1225.1 — **0.0px deviation**).

---

## F6 — The table hangs 12px outside every other line in the pane  *(High)*

`KeyValueTable` wraps itself in `-mx-(--card-spacing)` (`KeyValueGrid.tsx:65`) so its outer
cell padding can bleed to a padded card's edge. `RateCardPane` is **`py-3` with no inline
padding** (`RateCardBlock.tsx:294`) and applies `px-3` per child instead. The negative
margin therefore has nothing to cancel, and is applied twice over.

Measured start edges of every ink run in the pane:

| x | runs | what |
|---|---|---|
| **649** | 11 | the title, the stats, `Modelled impact`, the footer — everything else |
| **637** | 3 | `Class` / `Economy` / `Comfort` — the whole table |

**12px of misalignment on the pane's primary reading edge.** Visible in the capture: the
class column hangs left of `RC-2026-04-01` and `Modelled impact`.

On the end edge:

| | ink right |
|---|---|
| Floors values (`12%`, `2.2%`, `9.00 SAR`) | 1235 |
| the table's last money (`8.00`, `12.00`) | **1247** |
| the card's content edge | 1247 |

The card is `overflow-x: hidden`, so the table's 12px end overhang is clipped and the last
column loses its `pe-(--card-spacing)` entirely: **the cancellation figures stop 1px from
the card border**, while every other end-aligned value on the pane stops at 12px. Two end
edges 12px apart, in the same card, both carrying money.

Mirrors exactly in Arabic: `firstCellInkToRailDivider` = 0px, so `Economy` and `Comfort`
touch the rail divider. Same in English (0px). Nothing else in the pane touches anything.

Evidence `…-light-en-1280-block.png`, `…-light-ar-1280-block.png`,
`…-light-en-1280-block-hover.png` (the hover ground running to the clipped edge).

---

## F7 — The header stats break at the operator's width  *(High)*

`RateCardBlock.tsx:303` is `flex flex-wrap items-start justify-between`, with the three-stat
`dl` as the second child. At ≥1440 it works: the stats sit top-right, the header block is
40px. At 1280 the flex wraps.

| | 1440 en | 1280 en | 1280 ar |
|---|---|---|---|
| stats wrapped below the title | no | **yes** | **yes** |
| header block height | **40px** | **90px** | **106px** |
| position | top-right | left-aligned, own row | right-aligned, own row |
| inline gap title → stats | — | **−181px** (overlap → wrap) | — |

At the operator's width the header block is **2.25× taller** (en) / **2.65×** (ar) than
designed, and the stats lose the top-right position that distinguishes them from body
content. No individual label wraps in any pass — it is the whole `dl` that moves.

Consequence for F2: 50px of the 478px spent before the first price exists only at 1280.

---

## F8 — `(SAR)` five times  *(Medium)*

`(SAR)` appears in **5 of 6** headers (`copy.ts:777–781`). Measured ink width of the
`(SAR)` substring alone, per header, via a DOM Range:

| | per header | × 5 | table width | **share** |
|---|---|---|---|---|
| en 1280 | 33.4px | **167.0px** | 634px | **26.3%** |
| ar 1280 | 36.1px | **180.5px** | 594px | **30.4%** |
| en 1440 | 33.4px | 167.0px | 794px | 21.0% |

A quarter of the table's horizontal budget states one fact five times. It is also the direct
cause of the two-line headers in F5: dropping it takes `Cancellation (SAR)` from 71.3px of
ink to ~38px, inside the 105.7px track. §8.3.1 requires the unit in the header and never in
a cell, which is satisfied; it does not require it in *every* header.

---

## F9 — Two label systems, side by side  *(Medium)*

The band sets *Modelled impact* and *Floors* on the same row with two different constructions:

| | *Modelled impact* (left) | *Floors* (right) |
|---|---|---|
| `dl` display | `flex` (`RateCardBlock.tsx:479`) | `grid` (`:532`) |
| shape | label **over** value, stacked | label **beside** value, inline |
| label | 12/400 grey | 12/400 grey |
| value | **14/600 ink** | **12/400 ink** |
| width | 386.7px | 187.3px |
| label track | intrinsic (89.3 / 78.4px) | fixed **87.7px** |

Their headings are baseline-aligned to **0.0px** and both sections start at y 561 — good.
Then they diverge. Ink-line tops, in order:

| left | right |
|---|---|
| 561 heading | 561 heading |
| 581 `Modelled on 4,186 trips · Run 21 Mar` | 581 `Target margin 12%` |
| 601 `Rider bill before` / `after` | 601 `Payment fee 2.2%` |
| 626 `21.80 SAR` `22.94 SAR` `+5.2%` | 621 `Support per subscriber 9.00 SAR` (2 lines) |
| 643 `Measured against the card…` | 657 `Emergency reserve 3.5%` (2 lines) |
| — | 693 `Guardrails a card is checked…` (3 lines) |

Rows 1–3 line up. From row 4 they do not, and **three ink bands overlap vertically**
(measured ink-to-ink gaps of **−23, −9, −1px**), so an eye crossing the divider lands
mid-line. The same rung of information is set at 14/600 on the left and 12/400 on the
right — a 2px, 200-weight difference for values of equal standing.

The 87.7px label track is too narrow for its own copy: **2 of 4 labels wrap** at 1280 en
(`Support per subscriber`, `Emergency reserve`), 2 of 4 in ar (a different two), 1 of 4 at
1440.

### The rhythm question, answered honestly

The owner asked whether the gaps are a scale (8/12/16/24) or random. Both answers are true
and the distinction matters:

- **Declared spacing is on the grid.** Every value in the pane is a 4px multiple: `gap-3`
  (12px) between all four pane children, `pt-3` (12px), `py-1.5` (6px) cells, `gap-1` (4px)
  inside a Figure. **R13's 4px grid is satisfied.** This is not a rule violation.
- **Rendered rhythm is not.** Ink bottom → next ink top, every consecutive line in the pane
  in reading order: **6, 13, 4, 21, 23, 16, 33, 5, 5, 2, 5, 13** (plus the three negatives
  above). Nine distinct values; only 5 and 13 repeat. **2 of 12 land on a 4px multiple
  (17%); 1 of 12 on an 8px multiple.** Baseline pitch is worse — 22, 28, 19, 38, 38, 33, 50,
  20, 20, 17, 25, 14, 36, 60: fifteen lines, twelve distinct pitches, **no baseline grid at
  all**.

Uniform 12px box gaps interacting with three line-heights (16px on 12px text, 20px on 14px
text, 20px on 12px Arabic text) produce optical gaps that land wherever they land. That is
the mechanism behind "the rhythm is arbitrary", and it is why the screen can pass every rule
and still read the way it reads.

---

## F10 — The log outranks the subject  *(Medium)*

Measured on one page:

| | heading | row pitch |
|---|---|---|
| **Rate card** — prices every trip today | none above 14px (H3 `RC-2026-04-01`) | **32.5px** |
| Surge windows — read-only reference | H2 **14px**/600 | 52.5–57px |
| **Suspensions** — 12 rows, 11 of them `Ended` | H2 **20px**/500 + search, Filter, Columns, Sort, Export CSV | **57px** |

The subordinate log carries the largest sub-heading on the page (6px above the two card H2s)
and a full toolbar; it fills the entire second screen on its own. The rate card carries no
heading at all and the tightest rows. **Three row pitches in one view — 32.5 / 52.5 / 57px,
a 1.75× spread** — so density itself stops meaning anything.

**Ownership split — do not fix the 20px here.** The `Suspensions` heading is not this
screen's declaration. `src/components/table/IndexToolbar.tsx:271` renders *every* DataTable
heading in the product as `<h2 className="truncate text-lg font-medium text-foreground">` —
20/500. That is a known residual on a shared file, carried by ~40 index screens; changing it
from this branch is a forty-screen change and is out of scope. Verified by reading the line.

What *is* this screen's to answer is the other half of the inversion: the rate-card block
declares no heading above 14px for the page's primary subject, while its two sibling cards
declare H2 at 14/600 (`SurgeCards.tsx:250` and the Surge windows card). The finding is the
**gap between 20 and 14**, and the side of it this screen owns is the 14.

Evidence `…-light-en-1280-scrolled-bottom.png`.

---

## F11 — Arabic  *(Low — no mirroring defect)*

Everything that must mirror, mirrors; everything that must not, does not (§9.2). Digits stay
Western, `SAR` stays Latin, the money columns still end-align and their decimals still share
an x. The rail is at the inline start, the table's Class column is at the inline end, the
onboarding beacon moves from x 1208 to x 24 (`end-6` resolves correctly). No physical-
direction leakage found in the block.

The cost is vertical and horizontal:

| | en 1280 | ar 1280 | delta |
|---|---|---|---|
| view scroll height | 1867px | **2131px** | **+264px (+14.1%)** |
| screens to read | 2.20 | **2.51** | +0.31 |
| block height | 472px | **528px** | +56px |
| header block | 90px | **106px** | +16px |
| table header row | 45px | **53px** | +8px |
| body row | 32.5px | 36.5px | +4px |
| empty rail | 198px | **234px** | +36px |
| `(SAR)` share of the table | 26.3% | **30.4%** | +4.1pt |

**One Arabic-only wrap.** `Target margin` is one line in English and `الهامش المستهدف` is
**two** in Arabic, in the 87.7px Floors track. The reverse also holds — `Support per
subscriber` wraps in English while `الدعم لكل مشترك` does not. So the Floors column wraps
2 of 4 labels in each language, but not the same two, and no single track width fixes both.

Arabic renders `text-xs` at **13px** where English renders **12px**
(`globals.css:2058`), so the block's two-size ramp is 13/14 in Arabic — **1px apart**. The
hierarchy collapse of F1 is worse in Arabic than in English.

Evidence `…-light-ar-1280-firstscreen.png`, `…-light-ar-1280-block.png`,
`…-dark-ar-1280-block.png`.

---

## Two things that are not defects

Recorded so no one spends a fix on them.

1. **The onboarding beacon overlaps the Suspend surge card.** The `fixed bottom-6 end-6
   z-40` 48×48 disc (`src/screens/onboarding/OnboardingBeacon.tsx:71`) sits at (1208, 828)
   over that card's ground, **7px** from the nearest district chip. `elementsFromPoint`
   confirms it occludes **no** interactive element at any scroll position tested. It is a
   shell-level element, not this screen's, and it clears its neighbours. Noted only because
   it appears in every capture.
2. **Contrast.** Every ratio in the block passes. Ink on card 16.80:1; muted on card 5.85:1;
   the banner's blue 6.09:1; the badge inks 5.75 (live) and 6.71 (draft). The tightest is
   **`--muted-foreground` on the selected rail row's `bg-selected` ground — 4.60:1**, which
   clears 4.5 by 0.10 and carries two of that row's three lines. It passes; it has no margin.
   Keyboard, focus order and screen-reader semantics are the accessibility-auditor's call,
   not this document's.

---

## Ship checklist

| Item | State |
|---|---|
| Four states present | **Passing, not re-tested here.** `fin-rate-card.mjs` covers content, loading (`RateCardSkeleton`), error (`mockFail=pricing.rateCards`) and empty. |
| One primary button, in blue | **Passing** — one `variant="default"` on the view, in the Suspend surge card. It is disabled, which is F3's subject, but the count is 1. |
| Badge tones from the five-tone palette, no red pill | **Passing** — `success` / `info` / `neutral` / `warning`. No `critical`. |
| Banner as a pale tinted card, never two at once | **Passing** — exactly one, `info`, ground `#eaf0fe`. Its *size* is F2. |
| Toast naming its object in one line | **Not exercised** — no write is reachable in Stage A. |
| Tokens only, no arbitrary values | **Not re-run.** This audit is composition, not token conformance. `/token-audit` is the check and it is not part of this pass. |
| Logical direction utilities | **Passing by measurement** — F11 found no physical-direction leakage in the block. |
| Numeric columns end-align, decimals line up | **Passing** — 0.0px deviation in all five money columns. |
| 4px grid (R13) | **Passing on declared values.** Rendered ink rhythm is off-grid on 10 of 12 gaps — mechanism, not violation. See F9. |
| Visible focus ring | **Not this document's call** — referred to accessibility-auditor. |
| Reference comparison (Navattic / Shopify) | **Not run.** This audit measures the built screen against itself; the reference pass is a separate deliverable. |

---

## How to reproduce

```
npx vite --port 4327
HARNESS_BASE=http://localhost:4327 node scripts/harness/rate-card-density.mjs light en 1280
HARNESS_BASE=http://localhost:4327 node scripts/harness/rate-card-density.mjs light ar 1280
HARNESS_BASE=http://localhost:4327 node scripts/harness/rate-card-density.mjs dark  en 1280
HARNESS_BASE=http://localhost:4327 node scripts/harness/rate-card-density.mjs light en 1440
HARNESS_BASE=http://localhost:4327 node scripts/harness/rate-card-density.mjs light en 1920
```

The probe asserts nothing and always exits 0 — it is a measuring instrument, not a gate.
It prints one JSON block and writes nine captures per run to `scripts/harness/shots/`.
