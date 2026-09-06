# Rate card — visual verdict on the rebuild

**Screen** Financials › Pricing & Plans › Rate card (`/financials/pricing?view=rate-card`)
**Built to** `docs/05-restructure/design/financials-pricing-rate-card.md` (revision 2) and
`docs/05-restructure/design/rate-card-copy-sheet.md`
**Baseline** `docs/02-verification/rate-card-density-audit.md` — eleven findings, all
re-measured below.
**Probe** `scripts/harness/rate-card-density.mjs`, extended in this pass with a second
measurement function (`probe2`) for the rebuilt DOM: the D36 unit rung, the D35a hairline,
the district band's alignment, each band's rule channel, the off-scale gap sweep, the pane's
reading edges and the surface ladder. Chromium via Playwright, clock pinned to
`2026-06-25T09:14+03:00`, `HARNESS_BASE=http://localhost:4327`.
**Runs** light/dark × en/ar at 1280, plus light/en at 1440 and 1920. Zero page errors in
every run.
**Reference width** 1280 × 900; the app bar takes 52px, so the scrollport is **848px**.

> ### The tree moved while this audit ran, and every number here is from `35ebab0`
>
> The brief named `2ba89e6`. Two minutes before the first probe run, **`35ebab0`
> `ui(rate-card): the rail rows get a vertical gutter`** landed and added `py-3` to the rail
> row (`RateCardBlock.tsx:209`). Every measurement below was taken against `35ebab0` and is
> consistent across all six runs. That commit is the direct cause of new findings **N2** and
> **N4**. `src/components/PageHeader.tsx`, `src/screens/financials/shared/`,
> `src/screens/financials/wallets/` and `src/screens/financials/copy.ts` were
> uncommitted-modified by other agents during the run; nothing measured here depends on the
> first three, and the fourth only through strings that matched the copy sheet.

**The page loaded is the rebuilt one**, confirmed on all six runs before any number was
trusted: the banner reads `Prices are read-only` on **one** rendered line, the counts caption
is sentence case in the rail footer (`4 rate cards · 1 live · 2 drafts · 1 superseded`), and
`SAR` appears **once** in the table head.

---

## Verdict

**The rebuild worked. It may merge once N1 and N2 are answered.**

Six of the eleven baseline findings are gone outright, four are substantially reduced, and
one — the row-pitch spread of F10 — got worse. The single sentence that describes the
change: **the pane now has a typographic top, one reading edge, and a table with a header
strip, and the operator reaches the first price 54px sooner on a page that is 157px longer.**

The trade the brief asked about is worth it. The +157px of scroll is spent **entirely below
the first price** — `Surge` merging from two side-by-side cards into one stacked card costs
+122, the G3 card gap costs +24, the block grows +50.5 and the banner gives back −40. F2
measured what the operator reaches first, and on that measure the rebuild wins: first-price
ink **478 → 424.3**, scrollport share **50.2% → 43.9%**.

Two things it broke, and one thing it exposed:

- **N2** the skeleton and the content rail row now differ by 25px per row (32 in Arabic), so
  everything below the block jumps 215.5px when the read lands. `AC-RC-43`'s stated purpose
  is "so nothing moves when the data lands"; it now does.
- **N4** the rail row is 85–86px against 40px table rows — a **2.13× pitch spread**, wider
  than the 1.75× F10 named as the reason "density stops meaning anything", and the tallest
  object is now the list rather than the prices.
- **N1** D36 was implemented to the letter and the misreading it was written to prevent
  simply moved. The unit rung is centred to **0.0px** over the money span, and that centre
  falls inside the **Per minute** column, 10.7px directly under its header ink.

---

## The eleven baseline findings, re-measured

| # | Baseline | Now | Delta |
|---|---|---|---|
| **F1** type hierarchy | 2 distinct sizes in the block, 8 triples, 65/65 elements at 12 or 14 | **3 sizes (12/14/16)**, 10 triples, 71 elements. Pane title alone at 16/600; the stat row is deleted; `VAT included` is 12/400, not 14/600 | **Substantially fixed.** Residual: a 12/400-ink rung §3.1 does not declare, and the h1 renders 30/500 not the 24/600 §3.1 claims — see N5 and the referral below |
| **F2** chrome before the price | first price ink **y 478**, 50.2% of the scrollport, 310px of chrome above the card | first price ink **y 424.3**, **43.9%**, block top 270. Banner **90 → 50px**, one line, 6.09:1 | **Fixed −53.7px / −6.3pt.** Scroll height 1867 → **2024** (+157, +8.4%); 2.20 → **2.39** screens |
| **F3** disabled primary reads as a heading | disabled primary painted as bare 14/500 text, no fill and no border; `duplicateStrings` = `["Suspend surge"]`; `Approve` orphaned 400px below its badge | **D35b landed**: no heading carries the string, `Suspend surge` appears **once**. **D35a landed**: 1px box, 8px radius, 10px inline padding, 32px tall. `Approve` sits in band A at the pane's inline-end (box right **1235** = the pane's end edge), 24px tall | **Fixed**, with a new weight defect — the box is drawn at **1.20:1** while the six chips beside it are **1.40:1** (N3) |
| **F4** two dead regions | 198px of blank rail (42.1%), 83px of blank column, 33px optical gap at Comfort → Modelled impact, 97px under Suspend surge | rail runway **108.5px** terminated by a **33px** footer; band C's short half **24px**; every band rule channel **12 + 1 + 12 = 25px**; the Suspend surge card no longer exists | **Fixed.** The runway now reads as a list with a bottom edge |
| **F5** six equal columns | 105.7px × 6, 57.5% slack, **two headers wrapped**, header row 45px vs body 32.5px, **two baselines in the header row** | 170 / 72 / 72 / 96 / 88 / 112. **No header wraps** in en or ar at 1280 or 1440. One baseline. Header **36px**, body **40px** | **Fixed.** Money slack 275.9/610 = 45.2%. New residual at 1920 — N9 |
| **F6** the table hangs 12px out | 11 runs at x 649, 3 at x 637; last money stopped 1px from the card border | **one start edge: x 649, n = 14**, including `Class`, `Economy`, `RC-2026-04-01`, `Commission and VAT`, `Modelled impact`. **One end edge: x 1235, n = 7**, including `Cancellation`, `8.00`, `12.00` and the Floors values — 12px from the content edge at 1247 | **Fixed outright.** The cleanest single repair in the rebuild |
| **F7** header stats wrap at 1280 | header block 40 → **90px** (en) / **106px** (ar) | the stat row is deleted; band A is identity only, **44px**, nothing wraps | **Fixed by removal** |
| **F8** `(SAR)` five times | 5 runs, **167px**, 26.3% of the table (30.4% ar) | **1 run**, `colSpan=5`, `aria-hidden="true"`, `<bdi>`, `text-align: center`, ink centre 1026.95 vs span centre 1027.0 → **0.0px off-centre**; `<caption>` states `All figures in SAR.` | **Fixed as ruled, and it bought a new problem.** The thead grew 45.5 → **61.5px**, and the rung is misreadable — N1 |
| **F9** two label systems | three ink bands overlapping at −23, −9, −1px; 14/600 on the left against 12/400 on the right | both halves are one `TermRow` instrument; three shared rows at ink gaps 9, 9, 9, then the right half runs one row longer | **Fixed.** Rendered ink rhythm is still 12 distinct values in 15 gaps, but with real repetition (9×3, 10×3) where the baseline had 9 in 12 |
| **F10** heading inversion / pitch | headings 12/500 · 14/600 · 14/600 · **20/500**; pitch 32.5 / 52.5 / 57 = **1.75×** | headings 16/600 · 16/600 · **20/500** (IndexToolbar's, out of scope); pitch **rail 85–86 / class 40 / surge 40 / suspensions 57 = 2.13×** | **Half fixed, half worse.** The two card titles now agree; the pitch spread widened and the tallest object is the list — N4 |
| **F11** Arabic | +264px (+14.1%); two Arabic-only header wraps; nothing mirrors incorrectly | +**205px** (+9.6%): 2131 → **2336**. **Zero header wraps** in Arabic. First price ink **450.3**, 47.0%. Rail row 96–97, footer 37px, runway 120.5. Mirroring correct throughout | **Improved.** But F11's claim that "the money columns still end-align and their decimals still share an x" was **wrong**, in its own data — see N1b |

---

## New findings, ranked by operator cost

| # | Severity | Rule | Observed | Evidence | Suggested fix |
|---|---|---|---|---|---|
| **N1** | **High** | **D36** (`RULINGS.md:97`) | The unit rung is centred to **0.0px** over the money span (ink mid 1026.95, span mid 1027.0) — and that centre lands inside the **Per minute** column (951–1047). `Per minute`'s header ink is 963–1035, `SAR`'s is 1015.1–1038.8: they **overlap by 20px** horizontally and `SAR` sits **10.7px** directly below it. Arabic mirrors the fault exactly — centre 253, inside `لكل دقيقة` (233–329), 14.7px below its ink. The body carries vertical column rules and the head does not (`ui/table.tsx:139`, `tbody` only), so nothing draws the span the rung is meant to label | `scripts/harness/shots/rc-density-light-en-1280-block.png`, `…-light-ar-1280-block.png`; probe `rebuild.unitRung.landsInColumn` / `.headerInkOverlapping` | Not a screen fix. D36's placement clause needs re-deriving: centred solved the "reads as the last column's unit" misread by moving it to the middle column. The rung needs a span device — a hairline under the five money headers, or the rung set on the strip's own ground across the span — or the ruling reverts to §8.3.1 |
| **N1b** | **High** | **R4 / AC-73**; design spec §3.4 | **In Arabic a money column's decimals do not line up when its values have different digit counts.** Cancellation: `8.00` decimal at **x 54.1**, `12.00` at **x 63.2** — **9.1px apart**, one tabular digit. Every other column aligns to 0.0px only because both its values are the same width. English is 0.0px everywhere. Mechanism: `MoneyCell` is `block text-end` (`Money.tsx:89`); in RTL `text-end` resolves to physical **left**, which is the LTR numeral's **leading** edge, so the runs stack on their most-significant digit. The design spec asserts the opposite in §3.4 — *"`tabular-nums` plus `text-end` lines the decimal points up by construction"* — and that is true only in LTR | probe `live.table.decimals`, `v2-light-ar-1280.json`; cell measurement in `dec.mjs`; `scripts/harness/shots/rc-density-light-ar-1280-block.png` | **Pre-existing, not a regression** — the same 9.1px is in the pre-rebuild capture (42.1 / 51.2). It is filed here because the baseline's F11 asserted it was clean and it is not. The fix is in `Money.tsx`, a shared file: an RTL money cell needs the numeral run flushed to its own trailing edge, not to the cell's inline end |
| **N2** | **High** | **AC-RC-43**; §10.2 | `RateCardBlock.tsx:209` carries `py-3`; the skeleton row at `:622` does not. Measured: skeleton rail row **60px**, content **85–86px** (+25); Arabic **64 → 96–97** (+32). Block height **307 → 522.5px** (en), **327 → 586.5** (ar). Every element below the block — the `Surge` card and the whole suspensions log — moves **215.5px** when the read lands. AC-RC-43's stated purpose is *"so nothing moves when the data lands"* | `skel2.mjs` output, en and ar; `RateCardBlock.tsx:209` vs `:622` | Add `py-3` to the skeleton row at `:622`. One line. Regression from `35ebab0` |
| **N3** | **Medium** | **D35a** (`RULINGS.md:119`) vs **R23** (`button.tsx:~52`) | The one control on the view is the **faintest box on its panel**. Disabled `Suspend surge` and disabled `Approve` both draw `--ev-hairline` `#e3e7ea` = **1.20:1** against the card; the six district chips above them draw `--ev-hairline-control` `#d0d7dd` = **1.40:1**. `button.tsx`'s own comment records that structural hairline weight on a control was a *measured* defect (craft-critique F7) and pins controls to `border-border-control`; D35a's text names `border-border`, and the render took the weaker one. **The hairline does survive dark** — `#1b232e` on `#080a0d` = **1.25:1**, slightly stronger than light — so the "vanishes on the dark card" risk did not materialise | `zoom-light-en-1280-district.png`, `zoom-dark-en-1280-district.png`; probe `rebuild.disabled[].borderVsGround`; `pad.mjs` chip/button comparison | A ruling call, not a screen fix: D35a and R23 disagree about which hairline a control keeps. Whoever resolves it should note that at 1.20:1 the disabled primary is outranked by six non-primary chips |
| **N4** | **Medium** | **F10**'s own metric; §3.3; §9 | The rail row renders **85–86px** (en) / **96–97px** (ar) against **40px** table rows — a **2.13× pitch spread** across the view (40 / 40 / 57 / 85). F10 named 1.75× as the reason "density itself stops meaning anything". Decomposed: 61px of content + **24px of `py-3`**. §9's own arithmetic says three lines measure 52px against `min-h-row-media` 60; what renders is **42% over** that. §3.3 buys the matrix's loudness partly with *"row height — `--ev-row-h` 40px against the rail's rows"*, an argument that now runs backwards: the list of four cards is set at more than twice the pitch of the prices it points at | `zoom-light-en-1280-railrow.png`; probe `rebuild.rail.rowHeights`, `rebuild.rowPitch` | `py-3` is on the four-value scale and it did fix real crowding, but 24px is G3 — a change of subject — spent inside one row. `gap-2` around the three lines, or `py-2`, would give the row air without making the rail the tallest rhythm on the page. Designer's call |
| **N5** | **Medium** | §3.1, §3.4 | **Three money treatments on one screen.** §3.4 enumerates two — T5 14/400 in a table cell, T4 14/600 in band D. Band C renders `9.00 SAR` through `<Money>` inside a `TermRow` whose `dd` is `text-xs`: **12/400 ink**. That triple (12 / 400 / `--ev-ink`) is also a rung §3.1's seven-rung table does not declare, and 7 elements carry it (`22%`, `20%`, `VAT included`, the four floors) | probe `live.typeInBlock` row 10; `zoom-light-en-1280-bandC.png` | Either declare the pair in §3.1 (T6-label / T6-ink-value is a legitimate instrument and it reads well) or raise band C's values to T5. Do not leave §3.4 claiming two treatments while three render |
| **N6** | **Low** | §4.3, **AC-RC-45** | `gap-0.5` (**2px**) survives at `SurgeCards.tsx:457`, stacking the `In force` badge over its `Ends in 4h 0m` countdown. §4.3 says 2px does not appear inside this view; AC-RC-45 says every gap is 4, 8, 12 or 24 | `scripts/harness/shots/rc-density-light-en-1280-scrolled-bottom.png` | `gap-1` |
| **N7** | **Low** | **AC-RC-45**, as written | The off-scale sweep over the block and the `Surge` card returns **6px** (`StatusBadge` inline padding, ×16), **10px** (`ToggleGroupItem` inline padding ×12, `Button` inline padding ×2) and **6px** (`Button` gap). All three are shared primitives; the screen's own declared spacing is entirely 4 / 8 / 12 / 24 | probe `rebuild.offScale` | Not this screen's to fix. AC-RC-45 should be narrowed to the screen's own declarations, or it is a criterion no screen in the product can pass |
| **N8** | **Low** | §3.3; **D33b** | §3.3 buys the matrix's loudness three ways, the first being *"the only block inside the master–detail card that carries a filled header strip"*. Measured, that strip is **1.019:1** under the card in light — D33b's declared ceiling and the smallest step in the product. In the light capture it is at the threshold of visibility; the region's loudness in practice comes from the 40px rows and the ink. In dark it reads clearly (1.07 **over** the card, D33c, deliberate) | `zoom-light-en-1280-tablehead.png` vs `rc-density-dark-en-1280-block.png`; probe `rebuild.surfaces` | Not a violation — the token is at its ceiling by design. Recorded so nobody counts the strip as a third of the mechanism in light |
| **N9** | **Low** | §3.3; no rule | At **1920** the money columns are pinned (72 / 72 / 96 / 88 / 112) and the `Class` column absorbs every extra pixel: **634px wide for a 36.8px label — 571.9px of slack**, so `Economy` and its first price sit 570px apart. At 1280 that slack is 107.9px. There is still no measure cap on the block (1376px at 1920) | probe `live.table.columns`, `v2-light-en-1920.json` | Cap `Class` (`max-w-*` on the column, or a `max-w` on the block) so the identity column stops swallowing the surplus. Not the operator's width; low priority |

### Referred, not filed against this screen

- **The h1 renders 30/500, not the 24/600 §3.1 declares as T0.** `AC-RC-32` says no text node
  on the view computes to a size outside the ramp, and 30 is outside it. 30/500 also sits
  above 16/600 while being *lighter*, which is the inversion H5's law names
  (`globals.css:3135`). `src/components/PageHeader.tsx` is another owner's file **and is
  uncommitted-modified in this tree right now**, so this is referred to that owner rather
  than measured as settled.
- **`IndexToolbar.tsx:271` renders `Suspensions` at 20/500.** Known residual on a shared file
  across ~40 screens (F-RC-7). Accounted for, not re-filed.

### Recorded so nobody spends a fix on them

1. **The onboarding beacon** still overlaps a card — now the `Surge` card's top-right rather
   than the retired Suspend surge card. Shell-level, `fixed`, occludes nothing interactive.
2. **The card is 1.04:1 under the page**, which rounds above D33b's stated 1.03 ceiling.
   `--ev-surface` is a product token and the design spec §9 explicitly declines to move it.
3. **D33c's dark inversion is deliberate** — the strip measures 1.07 **over** the card in
   dark. It must not be "fixed".
4. **No shadow paints anywhere on the view** (D34). The only computed `box-shadow` is a
   transparent `shadow-none` on a button.
5. **The floors caption reads `Nothing enforces these yet.`**, not the design spec's longer
   sentence. That is the copy sheet winning on wording, which §14 licenses.

---

## Pass 1 — token conformance

`RateCardBlock.tsx` and `SurgeCards.tsx`, grepped for the six mechanical classes:

| Check | Result |
|---|---|
| Tailwind palette classes (`bg-blue-500`, `text-gray-400`, …) | **none** |
| Arbitrary values (`[12px]`, `[#fff]`) | **none** |
| Raw hex | **none** |
| Physical direction utilities (`ml-`, `pr-`, `border-l-`, `text-left`, …) | **none** |
| `outline-none` without a `focus-visible:ring` | **none** — the one occurrence, `RateCardBlock.tsx:210`, pairs `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset` on the same line |
| `defaultValue` literals | **none** |
| §4.3's forbidden steps | one: `gap-0.5` at `SurgeCards.tsx:457` — **N6** |

Column widths `w-18 / w-18 / w-24 / w-22 / w-28` resolve to 72 / 72 / 96 / 88 / 112px, all 4px
multiples, all declared Tailwind steps. No `components/ui/` file was touched by this screen.

## Pass 2 — rule conformance

| Rule | Result |
|---|---|
| **R3** one primary | **Passing.** Exactly one element declares `variant="default"` — `Suspend surge`. It is disabled, so **zero filled buttons paint** on the view (`rebuild.filled` = `[]`). `Approve` is `secondary` |
| **R7 / R14 / R17** badge tones | **Passing.** `success` (Live, Running), `info` (Draft), `neutral` (Superseded, Off, Ended), `warning` (In force). **No red, no `critical`, no red pill** |
| **R10** one banner, pale tinted | **Passing.** Exactly one, `info`, ground `#eaf0fe`, ink 6.09:1, **one rendered line**, title only — no body on this view |
| **D18 / AC-RC-40** no uppercase, no tracking | **Passing.** `rebuild.uppercase` = `[]` across all four theme × language runs |
| **D33 / D33b / D33c** | **Passing.** Light: card 1.04 under the page, strips 1.02 under the card; the deepest stack is page → card → strip. Dark: card 1.11 under the page, strips 1.07 over it (D33c, deliberate) |
| **D34** no shadows | **Passing.** One transparent `shadow-none` and nothing else |
| **D35a** disabled keeps its box | **Passing in kind, failing in weight** — see N3 |
| **D35b** title and control never share a string | **Passing.** `Suspend surge` appears exactly once on the view, on the button |
| **D36** unit stated once, centred | **Passing to the letter, failing in the render** — see N1 |
| **R13** 4px grid | **Passing on the screen's own declarations.** Band rule channels 12 + 1 + 12 = 25 on all four; card gaps 24 / 24; district band chips → button **24**, button → refusal **4** |
| **§8.3.2** money | `MoneyCell` everywhere, `unit="none"`, U+2212 for negatives, `<bdi>` isolation. Decimal alignment fails in Arabic — **N1b** |

## Pass 3 — reference comparison

**Not run, and it cannot be.** The vendor frame directories this repo once cited were removed
and must not be cited; `docs/05-restructure/design/financials-pricing-rate-card.md` names no
external reference set for this screen. What it names instead is the token layer and the
built screens, and this document measures against both. D-2 is retired
(`docs/05-restructure/DECISIONS.md:70`, `:337`) and is not cited anywhere above.

## Pass 4 — accessibility (contrast only)

Computed, not eyeballed. Keyboard, focus order and screen-reader semantics are the
accessibility-auditor's verdict, not this one's.

| Pair | Ratio | Verdict |
|---|---|---|
| ink on card (`#171a21` / `#fafbfc`) | 16.80 | pass |
| `--ev-text-2` on card | 5.85 | pass |
| `--ev-text-2` on the table strip | 5.74 | pass |
| banner ink on `#eaf0fe` | 6.09 | pass |
| **`--ev-text-2` on `bg-selected`** (light) | **4.60** | **passes by 0.10** — the tightest pair on the view, carrying two of the selected rail row's three lines. Unchanged from the baseline |
| `--ev-text-2` on `bg-selected` (dark) | 6.22 | pass |
| badge inks | 5.75 / 6.71 | pass |
| disabled control ink on card | 5.85 light / 8.87 dark | pass |
| **disabled control hairline vs card** | **1.20 light / 1.25 dark** | not a text ratio, but it is the only carrier of the control's box — **N3** |

`--ghost` is not used for text anywhere on this view.

## Pass 5 — Arabic

Loaded with `dir="rtl"`, light and dark, captured and measured. Everything that must mirror
does; everything that must not, does not (§9.2).

- The rail sits at the inline-start (x 603–903), the divider is `border-e`, the marker is
  `start-0`, the `Class` column is at the inline-end (473–603), the money columns descend to
  the physical left, `Approve` and the rail badges land at their rows' inline-end.
- Numeral runs do **not** reorder: `9.00 SAR`, `+5.2%`, `12%`, `1.3×`, `RC-2026-04-01` in
  `font-mono` all keep their character order inside `<bdi>`.
- **The D36 rung's `<bdi>` isolation holds** — `SAR` renders left-to-right, 25.7px of ink,
  centred to 0.0px over the mirrored span. It is misread in Arabic for exactly the reason it
  is misread in English (N1).
- **Zero header wraps in Arabic**, against two in the baseline. **No label wraps in Arabic
  that does not wrap in English** anywhere in the block or the `Surge` card; the only wrapped
  runs on the view are the Suspensions `Reason` column, and it wraps in both languages.
- Arabic costs **+205px** (+9.6%) against +264px (+14.1%) before. Rail rows 96–97 against
  85–86; the block 586.5 against 522.5. `text-xs` still renders 13px in Arabic against 12 in
  English, so the block's ramp is 13 / 14 / 16 there.
- **One physical-direction fault found**, and it is not a utility class: the money cell's
  `text-end` resolves correctly to the physical left and still stacks the numerals on the
  wrong edge — **N1b**.

---

## Ship checklist

| Item | State |
|---|---|
| Four states present | **Content and loading verified in the browser** (skeleton captured; see N2). Error and empty **not re-exercised here** — `fin-rate-card.mjs` covers them and is another agent's file this pass may not touch |
| One primary button, in blue | **Passing.** One `variant="default"`; zero filled buttons paint because it is disabled (D35a) |
| Badge tones from the five-tone palette, no red pill | **Passing.** success / info / neutral / warning. No `critical` |
| Banner as a pale tinted card, never two at once | **Passing.** One, `info`, 50px, one line |
| Toast naming its object in one line | **Not exercised** — no write is reachable in Stage A |
| Tokens only, no arbitrary values | **Passing** on both screen files. One off-scale gap remains (N6) |
| Logical direction utilities | **Passing** by grep and by measurement, with N1b as the one alignment fault |
| Numeric columns end-align, decimals line up | **Passing in English (0.0px, all five columns). Failing in Arabic** on the one mixed-width column — N1b |
| 4px grid (R13) | **Passing on the screen's declarations.** Shared primitives contribute 6px and 10px (N7) |
| Visible focus ring | **Not this document's call** — referred to accessibility-auditor. The one `outline-none` is correctly paired |
| Reference comparison | **Not run** — no reference set exists in this repository (Pass 3) |
| No shadows (D34) | **Passing** |
| Surfaces recess (D33 / D33b / D33c) | **Passing** in both themes |

---

## How to reproduce

```
npx vite --port 4327
HARNESS_BASE=http://localhost:4327 node scripts/harness/rate-card-density.mjs light en 1280
HARNESS_BASE=http://localhost:4327 node scripts/harness/rate-card-density.mjs light ar 1280
HARNESS_BASE=http://localhost:4327 node scripts/harness/rate-card-density.mjs dark  en 1280
HARNESS_BASE=http://localhost:4327 node scripts/harness/rate-card-density.mjs dark  ar 1280
HARNESS_BASE=http://localhost:4327 node scripts/harness/rate-card-density.mjs light en 1440
```

`HARNESS_BASE` is not optional. The probe defaults to 4327 but a sibling harness defaults to
**4381**, and a stale server there has already caused one agent to measure a pre-rebuild page.
Before trusting a number, confirm `rebuild.banner.runs[0].renderedLines === 1`,
`rebuild.rail.footerTransform === "none"` and `rebuild.unitRung.sarRunsInHead === 1`.

The probe asserts nothing and exits 0 — it is a measuring instrument, not a gate. It prints
one JSON block with two measurement sets: `live` / `draft` (the baseline probe, unchanged
except for one null guard at the retired `Suspend surge` heading) and `rebuild` /
`draftRebuild` (revision 2's DOM).
