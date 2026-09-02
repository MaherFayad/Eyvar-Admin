# 04 · Scannability

**The owner's question, verbatim:** *"are the most important data clear at first glance and it's
scannable, and easy to grasb what's needed next, with as little mistakes as possilbe"*

**Method.** `npx vite --port 5307`, Chromium at 1440×900, deviceScaleFactor 1. 24 screens across
all five workspaces, captured and measured with Playwright: `getComputedStyle` on every
text-bearing leaf, `scrollWidth`/`clientWidth` on every cell and header, `getBoundingClientRect`
on every sticky column, and a full census of background fills, badge plates, row markers and
pre-row controls. Contrast ratios computed from relative luminance, not estimated. Nothing below
is a description; every finding carries the number.

**Verdict, up front.** The type ramp is disciplined and the three-tier ink separation is real and
measurable. But **the top of the hierarchy has collapsed on every overview screen, the amber tone
has been overloaded to the point of meaninglessness, the critical-row tint is the weakest signal
in the system at 1.056 : 1, and there is no primary call to action on 13 of the 15 work screens.**
Two screens — Disputes & Claims and Cash & Captain Debt — hide the column an operator most needs
behind a sticky overlay or off the right edge of the viewport, at rest, before any scrolling.

---

## 0. The measurements, in one place

| Property | Measured | Comment |
|---|---|---|
| Distinct type sizes per screen | **3–5** (median 4) | Genuinely good. The reclaimed ramp held. |
| KPI numeral : body text | 22px : 14px = **1.571×** | Weak for a dashboard. 2.0–2.5× is where a number reads as a headline. |
| KPI numeral : page title | 22px / 600 / `#171a21` : 22px / 600 / `#171a21` = **1.000×** | **Byte-identical.** See §2. |
| `primary` / `data` ink on white | `#171a21` → **17.22 : 1** | |
| `meta` ink on white | `#6b7280` → **4.83 : 1** | Tier separation = **3.56×**. Strong, real, working. |
| `primary` vs `data` separation | colour Δ 0, size Δ 0, **weight 400→500 only** | The weakest step in the system by a wide margin. |
| Critical row tint `#fff7f6` vs white row | **1.056 : 1** | Weaker than the plate under a "No clock" chip. |
| Badge plate `neutral` `#f6f8f9` vs white | **1.065 : 1** | |
| Badge plate `warning` `#fff4e6` vs white | **1.086 : 1** | |
| Badge plate `success` `#e7f6ec` vs white | **1.119 : 1** | |
| Badge plate `info` `#eaf0fe` vs white | **1.142 : 1** | All four plates are effectively invisible; the badge reads from its 11px/600 text alone. |
| Brand-filled primary CTA | **0** on 13 of 15 work screens | Only `Run all checks` (Admin Data) and `Invite operator` (Admin Team). |
| `emphasis: 'meta'` declared in `src/` | **0 times** | The quiet tier is never a positive decision, only a fallback. |
| `RowCriticalMarker` render sites | **18** | vs **15** `isRowCritical` declarations. Three disagree — §5. |
| Workspace rail badges that can tone | **0 of 5** | `src/shell/ModuleRail.tsx:300` — `'neutral'` unconditionally. |

---

## 1. The five-second test, per screen

For each: what the eye actually lands on first, second, third — then what the screen exists to
say. **The disagreement is the finding.**

### Management (Exec)

**`/management/overview` — Overview**
1. `8,075.70 SAR` (longest 22px glyph run, top row) · 2. `11%` (first tile, leftmost) · 3. the two
area charts (only large filled shapes on the page).
*Purpose:* is the business healthy this period, and what moved.
**Disagreement:** `11%` is Contribution margin **down 15.4 %** and `50.1%` is Subscription share
**down 19.7 %** — the two numbers a board reads. They render in the same 22px/600/`#171a21` as
`51 Active captains` (+2 %, noise) and `0.5×` (a ratio with "No comparison period yet"). **Eleven
KPI glyphs and the page title are typographically identical; nothing is first.** The direction
chips (`↓ −15.4%`, `↑ +57%`) are all the same neutral `#f6f8f9` plate at 1.065 : 1 — down and up
look the same. Eye lands on the longest string, which is a formatting accident.
**Next action:** none. 11 clickable tiles, 0 primary CTA, no ranking among them.

**`/management/risk` — Risk & Signals**
1. `1,847.00 SAR` · 2. `0` (tile 4, a large round zero) · 3. the green bars in "Top 5 riders at risk".
*Purpose:* which risks need a decision now.
**Disagreement:** `0 Rider and captain accounts sharing a number` — a tile that means *nothing to
do* — carries the same 22px/600 ink as `1,847.00 SAR Revenue at risk`. Six of eight tiles read
`— No comparison period yet`, so 6 of the 24 text lines on the tile grid are the same non-fact.
Worse: **"Top 5 riders at risk" encodes churn risk as a green bar** — the brand's success hue,
longer = worse. `Abdulaziz Al-Suwailem · High churn risk` has the longest green bar on the screen.

**`/management/zones` — Market & Zones**
1. the map (largest object, six overlapping green diamonds with colliding labels) · 2. `7.0×` ·
3. `45%`.
*Purpose:* which zones are starved and need captains.
**Disagreement:** *"6 zones · 2 starved"* is the whole point and it is 14px grey subtitle text.
`2 Supply-starved zones` is tile 2, unranked. **The KPI numerals here are 17px, not 22px**
(`ZonesScreen.tsx:601,638` uses `text-lg`) — the product has two KPI sizes. The zone list encodes
demand-to-supply as a **green** progress bar where 7.0× (worst) is longest and full-width, next to
a red dot meaning starved: **the bar and the dot disagree about which hue means bad.**

### Operations

**`/operations/overview` — Overview**
1. the pink banner *"2 captains have lapsed documents"* · 2. `50` (largest numeral) · 3. `13`.
*Purpose:* what is behind and who is not covered.
**Disagreement:** the eye's #2 is `50 Captains available now` — a *good* number. `13 Work items
past their SLA` and `20 Unclaimed work` are the two facts that require action and they are tile 3
and tile 4 in identical typography. **18 interactive elements before any content, 0 primary CTA.**
Nine of twelve tiles carry `— No comparison period yet`.

**`/operations/my-work` — My Work**
1. the pink banner *"13 items you can see are past their deadline"* · 2. the `Mine / Unassigned /
Everything` segmented control · 3. the amber `High` chip.
*Purpose:* the work you personally owe, ordered by what breaches first.
**Disagreement, and it is the sharpest in the product: the banner says 13 past deadline; the
subtitle says "2 items"; the left nav says "My Work 22"; and _neither_ of the two rows on screen
is breached (`data-row-critical` count = 0).** Three counts, none equal, and the 13 urgent items
are behind a default filter chip (`Queue routing: Your role`) plus the `Mine` tab. An operator
arriving here sees an alarm about work they cannot see. Row 2 is a **harassment report** whose
title is clipped to **48 % of its text** (285px of 600px) and whose Deadline cell reads `No clock`.

**`/operations/dispatch` — Live Dispatch**
1. `17.65 SAR` (right-aligned, largest per-card glyph) · 2. `24.50 SAR` · 3. the `Subscription` /
`Quick ride` blue chips.
*Purpose:* which live trips are going wrong right now.
**Disagreement:** the fare is the most prominent fact on every trip card and the least actionable
one on a live dispatch screen. `0.00 SAR` renders at the same weight on trips that have not
started — a fare of zero shown as loudly as a real fare. `LIVE INTERVENTIONS · 2 Active`,
including an **Emergency Signal**, is in a 340px right rail at 14px, and `Emergency Signal` is not
visually distinguished from `Delayed Arrival`. The rail's own copy says acknowledging *"would save
nothing"* while rendering `Acknowledge` and `Reassign` buttons that look live.

**`/operations/requests` — Requests**
1. the pink banner · 2. the two red leading-edge markers · 3. the column of five identical blue
`Searching` chips.
*Purpose:* riders waiting for a captain, worst first.
**Disagreement:** the Status column is `Searching` on **5 of 6 rows** — a constant. A badge on a
constant spends the whole colour budget and adds no information, and it is the third thing the eye
finds. `overdue 4d 22h` and `31m left` are the **same amber plate** — a four-day breach and a
healthy countdown are one colour. Row 1's Arabic rider name renders at **51 % of its width**.
**Three actions per row (`Claim`, `Assign`, `Close`), none default.**

**`/operations/trips` — Trips**
1. the two red leading-edge markers · 2. the wall of 60 badge chips (2.4 per row over 25 rows) ·
3. `1,284.50 SAR`.
*Purpose:* find a trip, see what happened to it.
**Disagreement:** the red markers on `TRP-8001` and `TRP-7742` mean **flagged for investigation**,
not breached — and the screen carries **no `data-row-critical` attribute and no tint**
(`TripsScreen.tsx:358` renders the marker off `trip.flagged`; the screen deliberately declares no
`isRowCritical`). The same 3.5px `#b42318` bar means *"act now, SLA blown"* on Safety, Requests,
Assurance and My Work. **One carrier, two meanings.** Worse, the word that would say it — the
`Flagged` column — is **not in the default visible set**, so on the screen as shipped the red bar
is the only carrier and AC-50 (state survives colour removal) does not hold. `Fare` reads
`0.00 SAR` on 5 of 11 visible rows at full ink. Rider and Captain are both `meta` grey, so a trips
screen renders the two people you look for at the lowest tier, and `No captain` is indistinguishable
from a name. One row contains the string *"This trip was cancelled before a captain accepted the
ride"* rendered at **1px of 344px — 0 % visible.**

**`/operations/people` — People**
1. `12,400.50` · 2. the amber `Under review` chip · 3. the column of green `Active` chips.
*Purpose:* find a captain; see who is not fit to drive.
**This is the best-ranked table in the product** — one primary, three data, four meta, exactly one
badge per row. The disagreement is what is *absent*: the Ops overview says 2 captains have lapsed
documents, and **nothing on this screen marks them.** No `isRowCritical`, no marker. A 2.1 rating
would render identically to `4.9`.

**`/operations/assurance` — Trip Assurance**
1. the pink banner · 2. two red markers · 3. the amber column.
**Disagreement:** on one screen the amber plate `#fff4e6` carries **six different meanings** —
`Rider not confirmed`, `Captain unavailable`, `Captain not en route`, `Awaiting confirmation`,
`overdue 12h 14m`, and an **owner's name** (`Yousef Al-Ba…`, itself truncated inside the chip).
An owner is not a status. `Confirm` / `Hand over` render on all ten rows including the three
`On track` ones, with no default.

### Financials

**`/financials/overview` — Overview**
1. the **amber** banner *"12 postings were refused"* · 2. `4,432.52 SAR` · 3. `2,477.13 SAR`.
*Purpose:* does the money add up, and where is it.
**Disagreement:** *"Total debits and total credits disagree"* is the single most serious sentence
in the product and it is rendered in the **warning** tone, while *"One report is with Trust &
Safety"* on Cash gets the **critical** pink. The severities are inverted between screens. Eleven
money tiles at identical 22px/600; `65.80 SAR Rider wallet balances` is as loud as `4,432.52 SAR
Gross bookings`. Six tiles repeat `Period 1 Jun to 30 Jun` and five repeat `Balance to date,
outside the period.` — eleven lines of identical text.

**`/financials/payouts` — Payouts & Escrow**
1. the pink banner · 2. the column of **17 green `Paid` chips** · 3. the numbers.
*Purpose:* who still needs paying, and what is blocked.
**Disagreement: green is the most common colour on the screen (17 of 24 chips) and it marks the
rows that need nothing.** The 7 amber `Due` rows — the work — are outnumbered by the "done" rows
2.4 : 1. See §3 for the money hazards; this screen carries four of them.

**`/financials/cash` — Cash & Captain Debt**
1. the pink banner · 2. `1,284.50` · 3. the amber `Under-reported` / `Never reported` chips.
*Purpose:* which cash reports do not reconcile, and act on them.
**Disagreement:** the table is **1280px wide inside a 1038px wrap — 242px of overflow with no
pinned end column, so the `Decision` column (Claim / Resolve / Escalate) is entirely off the right
edge of a 1440px viewport at rest.** The screen's only actions are invisible until you scroll
horizontally. The escalated row (`CASH-0002`, tinted and marked) is the **only row with an empty
Owner cell and no `Claim` link** — the one row that matters is the one you cannot pick up.

**`/financials/rider-wallets` — Rider Wallets**
1. the **amber** banner *"One rider wallet is below zero"* · 2. `120.00` · 3. the 22 `Adjust` /
`View ledger` buttons.
**Disagreement:** the banner is amber; the row it describes (`−41.50`) is tinted **critical red**
and marked — the same fact at two severities. And that row is **not on screen**: nothing sorts it
up, so the operator must find the `Negative balances` tab. Six of nine visible rows read
`0.00 / 0.00 / 0`. The eye's #2 is `120.00` in `Pending`, the least consequential column.
`Adjust` — a money-mutating action — renders at the same weight as `View ledger` on all 55 rows.

**`/financials/ledger` — Ledger & Payment Controls**
1. `3,850.76` · 2. `3,571.15` · 3. the account names.
The account tree is clean: 1 primary, 1 data, 1 meta. But the refused-postings card renders
`RowCriticalMarker` **unconditionally** (`LedgerControlsScreen.tsx:597`) — **every row is red-barred.**
A red carrier on 100 % of rows is not a signal. The closing balance renders at `text-lg` 17px
(`LedgerCard.tsx:267`), the third KPI size in the product.

### Customer Support

**`/support/overview` — Overview**
1. the pink banner *"2 SOS incidents are unacknowledged"* (correct) · 2. two `—` em-dashes at
22px/600 · 3. the two large empty cards.
**Disagreement:** an em-dash rendered at KPI rank twice, plus two half-page cards reading
`Nothing is recorded here yet.` — roughly half the screen is at headline weight saying nothing.

**`/support/tickets` — Tickets** — *the worst emphasis inversion in the product.*
1. the nine amber chips (all `#fff4e6`) · 2. `TKT-503` in bold ink · 3. the `Claim` / `Resolve`
buttons.
*Purpose:* which ticket to work next.
**Disagreement, measured:**
- The `Ticket` id column is `primary` — **14px / w500 / `#171a21`, 17.22 : 1**. `TKT-503` is the
  boldest thing in the row and it is meaningless to a human.
- The `Subject` — *"Captain did not arrive for scheduled morning departure"*, the only text that
  tells you what the ticket is — is **`meta`: 14px / w400 / `#6b7280`, 4.83 : 1**, and clipped to
  **68 %** of its width. **The thing you read to decide is the most de-emphasised text in the row.**
- `Priority: Critical`, `Priority: High`, `Status: Open` and `Reply due: Breached` all render the
  **same amber plate `#fff4e6`**. Critical and High are indistinguishable without reading.
- **3.0 tone-filled badges per row, on every row** — the stated ceiling is 2 and the normal is 1.
- **The `Breached` ticket (`TKT-505`) has no row tint and no marker.** `TicketsScreen` declares no
  `isRowCritical`. It is sorted `Opened ↓` so the breached one is *last*.

**`/support/disputes` — Disputes & Claims** — *the worst scannability defect found.*
1. the ten `Take claim` / `Resolve claim` button pairs · 2. the wall of 30 identical amber chips ·
3. `220.00`.
**Disagreement, measured:** the table is 1112px in a 1038px wrap, and the sticky action column
starts at **x = 1167** with `z-index: 30` while `Verdict due` spans **1117 → 1241**. **74px of the
124px SLA column — 60 % — is permanently covered by the action column at rest, before any
scrolling. Every one of the 25 rows displays the SLA as the five characters `overd`.** The real
value is `overdue 67d 4h`. Meanwhile:
- **28 claims, all open, all 67 days overdue, and `data-row-critical` count = 0.** No tint, no
  marker, no banner. Nothing on this screen says anything is wrong.
- `What is claimed` — the description you scan — is `meta` grey and clipped to **46–60 %** of its
  text on every row.
- The verdict money (`Refunded in full · 25.00 SAR`) renders at **11px / w600 / green**, while the
  claimed money renders at 14px ink. The outcome is smaller than the claim.

**`/support/safety` — Safety & Incidents**
1. the pink banner · 2. three red markers · 3. the amber column.
**Disagreement:** on one screen the amber plate carries **eight meanings** — `High`, `Critical`,
`overdue 13h 34m`, `overdue 12m`, `overdue 6m`, `17m left`, `11h 1m left`, and the owner
`Lina Al-Otaibi`. **`Critical` and `High` are the same colour, and the `Critical` SOS rows look
_quieter_ than the `High` rows** because they carry two chips where the High rows carry three
(2.8 badges/row average, max 4). The `Protocol` column renders four unlabelled square checkboxes;
on both unacknowledged SOS rows all four are empty, which is the most urgent fact on the screen
rendered as four small grey squares with no legend. **Seven interactive controls in row 1.**

### Admin & Settings

**`/admin/overview` — Overview** — 7 tiles, 22px/600 identical, including `4.8×` and `1.4×` ratios
with no comparison. `1` (Overview badge count 2) — no ranking, no CTA.

**`/admin/team` — Team & Access** — *the screen the machinery never reached.*
1. the green `Invite operator` button · 2. the green `Active` chips · 3. a uniform grey field.
**Disagreement, measured:** `AdminTeamScreen.tsx:518` and `:650` are **hand-rolled
`<table className="w-full text-start text-xs">` outside `DataTable`**. Consequences:
- Every cell is **12px**, not 14px. **217 elements at 12px on this screen.**
- `emphasisOf` never runs. The roster's ink is: `Operator` = w400, `Compensation cap` = **w500**.
  **The identity is not primary; the money cap is.**
- The capability matrix is **6 of 6 columns at ink w400, 0 primary, 0 meta, 21 rows × 6 = 126
  identical cells.** `Withheld` — the exception you scan for — reads exactly like `Granted`.
  This is "everything emphasised" in its purest form.
- No `isRowCritical` support at all; an operator with `Enrolment pending` second factor (2 of 5
  rows) is unmarked.

**`/admin/data` — Data & Compliance**
1. the green `Run all checks` button (correct — the only saturated fill on the page) · 2. the
column of amber `Critical` chips · 3. the grey prose.
**Disagreement:** **all 19 checks read `Not run yet / Not run yet`, and 13 of them carry an amber
`Critical` chip.** `Critical` here is the check's *class*, not a finding — 13 alarm-coloured chips
reporting nothing that has happened. Each row is ~67px of 12px grey prose (78 elements at 12px),
so the two scannable facts (`Last run`, `Findings`) are four grey words in a field of description.

**`/admin/activity` — Activity Log** — empty state. The illustration is a blue-and-grey bar
skeleton that reads as a *loading* placeholder, not an empty one. Six controls rendered above zero
rows.

---

## 2. Where emphasis failed to rank

The `Column.emphasis` machinery works where it runs: **17.22 : 1 ink against 4.83 : 1 meta is a
3.56× separation and it is doing real work.** Most tables land at 1 primary / 2–3 data / 3–6 meta,
which is a correct spend. These are the places it did not rank.

| # | Screen / table | Measured | The failure |
|---|---|---|---|
| E1 | **`/admin/team` roster** | `Operator` w400, `Compensation cap` **w500**, all cells 12px | Bespoke `<table>`, outside `DataTable`. Identity is not primary; the money cap is. |
| E2 | **`/admin/team` capability matrix** | **6 of 6 columns ink w400**, 0 primary, 0 meta, 126 cells | Everything emphasised. `Withheld` reads as `Granted`. |
| E3 | **`/support/tickets`** | `Ticket` id = primary 17.22:1; `Subject` = meta 4.83:1, clipped to 68 % | Inverted. The id is loud, the meaning is quiet. |
| E4 | **`/management/zones` cities table** | **3 of 3 columns `data`** | Nothing ranks. |
| E5 | **Every overview screen** | KPI numeral **22px/600/`#171a21`** = page title **22px/600/`#171a21`** | See below. |
| E6 | **`/operations/trips`** | `Rider` and `Captain` both `meta` | On a trips screen, both people you look for are at the lowest tier. |
| E7 | **`primary` vs `data`, everywhere** | colour Δ **0**, size Δ **0**, weight 400→500 | Two of three tiers separate strongly; the top step is nearly invisible. A row's identity does not lead its values. |

**E5 deserves its own paragraph, because `globals.css` predicted it.** The file's own H4 comment
reads:

> *"`--text-xl` is **THE PAGE TITLE, one per screen**. A 4-up metric row sharing it would put four
> glyphs at page-title rank on one screen — which is the H1 failure (nothing is first) wearing
> H4's clothes."*

`--text-kpi` and `--text-xl` were given separate names for exactly that reason **and then set to
the same 22px**, with the same `font-weight: 600` and the same `#171a21`. On
`/management/overview` there are **twelve** glyphs at page-title rank. On `/financials/overview`,
twelve. On `/operations/overview`, fourteen. The separation exists in the token namespace and not
on the screen. Two screens make it worse by rendering their KPI at `text-lg` 17px
(`ZonesScreen.tsx:601,638`, `LedgerCard.tsx:267`) — a third KPI size, the exact drift
`Figures.tsx:59` warns against.

### The badge budget is obeyed and the tone system still failed

The R7 five-tone rule holds — there is no sixth tone and no red badge. But the **`warning` tone is
carrying almost every meaning in the product**. `warning` is the most-used tone in source (70
sites vs neutral 75, success 42, info 42, critical 10), and rendered it collapses like this:

| Screen | Distinct meanings on the **same** `#fff4e6` plate |
|---|---|
| `/support/safety` | **8** — `High`, `Critical`, `overdue 13h 34m`, `overdue 12m`, `overdue 6m`, `17m left`, `11h 1m left`, owner `Lina Al-Otaibi` |
| `/operations/assurance` | **6** — 4 reason codes, `overdue 12h 14m`, owner `Yousef Al-Ba…` |
| `/support/tickets` | **4** — priority `Critical`, priority `High`, status `Open`, SLA `Breached` |
| `/support/disputes` | **2** across 30 chips — status `Open`, `overdue 67d` |
| `/financials/payouts` | payment state `Due` |
| `/management/zones` | `Recruit now`, `Watch` |

**A warning countdown that is still inside its window (`17m left`) and a four-day breach
(`overdue 4d 22h`) are the same colour.** So are a severity, a status, a reason code, a payment
state and a person's name. Colour has a fixed capacity and this one is spent.

Badges per resting row, measured: **Tickets 3.0** · Safety 2.8 (max 4) · My Work 2.5 (max 3) ·
Trips 2.4 · Disputes 2.0 · Requests 1.8 · Admin Team 1.8 · People 1.0 · Payouts 0.9 · Wallets 0.0.
Seven screens are over the stated ceiling of 2 on their average row.

And the plates themselves barely exist: **1.065–1.142 : 1 against the card.** A `neutral` chip is
optically identical to plain text. All the work is done by 11px/600 coloured type.

---

## 3. Every misreadable money figure

| # | Where | Measured | Hazard |
|---|---|---|---|
| M1 | **`/financials/payouts`** headers | `Cash debt (SAR)` renders **88px of 95px**; `Net payable (SAR)` **92px of 105px** → `Cash debt (S…`, `Net payable (…` | **The currency unit is inside the clipped tail**, and the body cells carry no currency at all — `652.60`, `23.15`, `629.45`. Three money columns, unit invisible. |
| M2 | **`/financials/cash`** headers | `Expected (SAR)` and `Deviation (SAR)` clipped identically | Same. |
| M3 | **`/support/disputes`** header | `Claimed (SAR)` clipped to 92 % | Same. |
| M4 | **Negative amounts, product-wide** | `−4.40`, `−15.00`, `−316.90`, `−284.50`, `−41.50`, `−8.40` all render **14px / w400 / `#171a21` / tabular-nums / right-aligned** — identical to positives | The sign is a single U+2212 glyph in the same ink as everything else, and right-alignment puts it at the **far end from where the eye lands**. No colour, no parentheses, no `−` emphasis. |
| M5 | **`/financials/payouts`, row 4** | `Payable 30.40` · `Cash debt **−4.40**` · `Net payable 34.80` | A *negative debt* silently *increases* the net. Nothing on the row explains the arithmetic; three ink-weight numbers that do not obviously add up. |
| M6 | **`/financials/payouts`, last row** | `Majed Al-Shamrani` · Payable **−15.00** · Net payable **−15.00** · State `Due` | A negative payable in state "Due". *(The `Pay` button is correctly disabled with "Nothing is payable…" — the guard is right; the display is not.)* |
| M7 | **`/financials/payouts`** | `316.90` and `−316.90` in the same table | Reversal pairs distinguishable only by one glyph. |
| M8 | **`/financials/cash`, `Deviation`** | `−284.50` and `−8.40` render at identical weight and colour | A 284 SAR shortfall and an 8 SAR one have no magnitude signal. |
| M9 | **`/financials/cash`, `Never reported` rows** | Expected `21.85`, Reported blank, Deviation **`—`** | **The money that is missing is displayed as an em-dash.** The largest loss on the screen shows as no number. |
| M10 | **`/operations/trips`, `Fare`** | `0.00 SAR` on **5 of 11 visible rows** at full 14px ink | Requested / Assigned / Cancelled trips show a fare of zero as loudly as a real fare. |
| M11 | **`/operations/dispatch`** | `0.00 SAR` on in-progress trip cards, at the largest per-card size, right-aligned | Same, at headline rank. |
| M12 | **`/support/disputes`** | Claimed `220.00` at 14px ink; verdict `Refunded in full · 25.00 SAR` at **11px / w600 / green**, and **clipped** | The amount actually paid out is smaller and greener than the amount asked for. |
| M13 | **`/admin/team`** | `Compensation cap` = `500.00 SAR` / `100.00 SAR` / `No cap` at **12px** | The only money on the screen is at the smallest size in the product — and is the only w500 cell, so it is simultaneously the boldest and the smallest thing in the row. |
| M14 | **`/financials/overview`** | 11 tiles, `4,432.52 SAR` … `65.80 SAR`, all 22px/600 | Currency is present and correct here (good), but a 68× magnitude range gets identical typography. |

**What is right and worth keeping:** every money figure resolves `font-variant-numeric:
tabular-nums`, every money column is `text-align: end`, and every figure carries two decimal
places. Column alignment and figure shape are not the problem — the **unit** and the **sign** are.

---

## 4. Every urgent row that does not stand out

| # | Where | Measured | Why it does not stand out |
|---|---|---|---|
| U1 | **`/support/disputes`** — 28 claims, all `overdue 67d+` | `data-row-critical` count = **0**, marker count = **0**, no banner | Nothing on the screen says anything is late. The only carrier, the `Verdict due` chip, is **60 % occluded** by the sticky action column and reads `overd` on all 25 rows. |
| U2 | **`/support/tickets`** — `TKT-505`, SLA `Breached` | `data-row-critical` = **0**, marker = **0** | `TicketsScreen` declares no `isRowCritical`. The `Breached` badge is the same amber as `Open` and `High` on the same row. Sorted `Opened ↓`, so it is the **last** row. |
| U3 | **`/support/tickets`** — `TKT-503`, priority `Critical` | Same amber plate as `High` | Priority Critical and priority High are one colour. |
| U4 | **`/support/safety`** — 2 unacknowledged SOS | Tint `#fff7f6` vs white = **1.056 : 1** | The tint is weaker than a `neutral` badge plate (1.065). The rows read as urgent only because of the 3.5px marker. Both SOS rows carry **fewer** badges (2) than the routine `High` rows (3), so they look calmer. |
| U5 | **`/operations/my-work`** — 13 breached items | **0 breached rows rendered**; 3 disagreeing counts (2 / 13 / 22) | The urgent rows are behind a default filter chip and a default tab. |
| U6 | **`/operations/people`** — 2 captains with lapsed documents | No `isRowCritical`, no marker, no badge | Announced on Ops Overview; invisible on the screen that lists captains. |
| U7 | **`/financials/rider-wallets`** — 1 wallet at `−41.50` | Banner is **amber**; the row is **critical red**; the row is **not sorted up** and is off-screen | The same fact at two severities, and the row is not where the banner sends you. |
| U8 | **`/financials/cash`** — `CASH-0002`, escalated | Tinted + marked correctly, but the row is the **only one with an empty Owner cell and no `Claim` link**, and the `Decision` column is **242px off the right edge** | The one row that matters is the one you cannot act on without horizontal scrolling. |
| U9 | **`/operations/dispatch`** — `Emergency Signal — TRP-1004` | Same card, same type size and same two buttons as `Delayed Arrival` | An emergency and an 8-minute delay are rendered identically, in a side rail. |
| U10 | **`/admin/team`** — 2 operators with `Enrolment pending` second factor | Cell is 12px ink w400, identical to `Authenticator app` | Bespoke table; no critical support. |
| U11 | **`/admin/data`** — the 1 breached statutory check | Amber `Critical` chip, identical to the 12 checks that have never run | The real finding is camouflaged by 12 decorative ones. |
| U12 | **`/management/overview`** — `Contribution margin −15.4 %` | Neutral `#f6f8f9` chip at 1.065 : 1, same plate as `+57 %` | Down and up are the same colour. |

### The two carriers *can* disagree, and on three screens they do

The design intends the tint and the R5a leading edge to take one expression. Measured, **there are
18 `RowCriticalMarker` render sites and 15 `isRowCritical` declarations**, and the extra three are
markers with no tint:

- **`TripsScreen.tsx:358`** — marker on `trip.flagged`, no `isRowCritical`. Red means *flagged*
  here and *breached* everywhere else, and the word is in a hidden column.
- **`LedgerControlsScreen.tsx:597`** — marker rendered **unconditionally**. Every row on the
  refused-postings table is red-barred; a carrier at 100 % density is not a carrier.
- **`IntegrityPane.tsx:598`** — bespoke pane, marker without tint.

Also measured: the marker is **3.5 × 52px** on Trips, Safety, Requests and Assurance, but **3.5 ×
20px** on the Payouts critical row (whose two-line cell makes the row 79px tall) — the bar does not
reach full row height, so the one red mark on that screen is 26 % of the row it marks. And on
tables with a select column the marker sits at `x ≈ 382–394`, ~30–40px inside the row's leading
edge, rather than on it.

---

## 5. "What is next?" — decisions before acting

Controls rendered **above the first content row**, and brand-filled primary CTAs, measured:

| Screen | Pre-row controls | Primary CTA | Actions in row 1 |
|---|---|---|---|
| `/management/zones` | **24** | none | 2 |
| `/operations/overview` | **18** | none | — |
| `/operations/my-work` | 13 | none | 4 |
| `/operations/requests` | 12 | none | 5 |
| `/management/overview` | 11 (all KPI tiles) | none | — |
| `/operations/trips` | 11 | none | 5 |
| `/support/tickets` | 10 | none | 4 |
| `/support/safety` | 9 | none | **7** |
| `/operations/people` | 9 | none | 3 |
| `/financials/payouts` | 8 | none | 4 |
| `/financials/cash` | 8 | none | 5 (off-screen) |
| `/support/disputes` | 7 | none | 2 |
| `/financials/overview` | 3 | none | — |
| `/admin/team` | 1 | **`Invite operator`** | 1 |
| `/admin/data` | 1 | **`Run all checks`** | — |

**There is exactly one brand-filled primary button in the entire operational product, and it is on
an Admin settings screen.** Every action on every work queue — `Claim`, `Assign`, `Close`,
`Confirm`, `Hand over`, `Resolve`, `Escalate`, `Take claim`, `Pay`, `Adjust` — is an outline button
of identical weight. The operator must read every label to find the next step, on every row, every
time. On Safety row 1 that is seven controls with no default; on Requests and Cash, five.

**And the top of the navigation never tones.** `src/shell/ModuleRail.tsx:300` sets
`badge.tone = 'neutral'` unconditionally, so the five workspace badges — `Exec 8`, `Ops 49`,
`Finance 2`, `Support 18`, `Admin 4` — are all `#e5e7eb` grey. Support currently holds a genuine
`attention` queue (Safety & Incidents, amber at the sub-tab level) and the `Support 18` rail badge
is grey. **The amber only appears once the operator has already chosen the right workspace.** Of
34 sub-tabs, exactly 2 render amber today (`support-safety` 6, `admin-data` 1); `financials-cash`
is toned `attention` with `count: 0`, so it renders **no badge at all** while its screen shows a
pink escalation banner.

**And the counts do not agree with each other.** Nav badge vs the screen's own subtitle vs its
banner: Trip Assurance **4 / 10 legs / 2 past deadline**; My Work **22 / 2 items / 13 past
deadline**; Requests **7 / 6 requests / 3 past deadline**; Disputes **4 / 28 claims / no banner**;
People **7 / 57 captains**. Nothing on screen says what the badge counts.

---

## 6. Where every rule was obeyed and the screen still has no focal point

This is the owner's real question, and there are four clear cases.

1. **All six Overview screens.** Ramp: 4 sizes, correct. Tokens: clean. Badge budget: not spent
   (Management Overview has 0 tone-filled chips). Every rule obeyed — and 11–14 numerals at
   page-title rank means the eye has nowhere to go, so it lands on the longest string. `0` and
   `1,847.00 SAR` compete as equals on Risk & Signals; `50 Captains available` beats `13 Work
   items past their SLA` on Ops Overview purely on glyph count.
2. **`/support/disputes`.** 1 primary, 3 data, 3 meta — a textbook tier spend. Badge budget within
   reason at 2.0. And the SLA column is 60 % occluded, the descriptions are 46 % visible, and not
   one of 28 claims 67 days overdue is marked. The rules were followed inside a layout that
   destroys the result.
3. **`/admin/team`.** Two hand-rolled `<table>` elements at `text-xs`. The machinery never ran, so
   there was no rule to break — and the screen has 217 elements at 12px, an inverted roster and a
   126-cell matrix in which the exceptions are invisible.
4. **`/admin/data`.** Correct primary CTA, correct ramp, one badge per row — and 13 amber
   `Critical` chips on checks that have never run, which is the badge budget spent on a constant.

---

## 7. The ten changes that would most improve scannability, ranked

Ranked by how much of the eye's first two seconds they recover, not by effort.

1. **Un-occlude the two tables that hide the operator's job.** `/support/disputes`: the pinned
   action column starts at x=1167 over a `Verdict due` column that ends at 1241 — 74px of 124px
   covered, `overd` on all 25 rows. `/financials/cash`: 242px of overflow with no pinned end
   column, so `Decision` (Claim / Resolve / Escalate) is entirely off a 1440px viewport. Fix the
   width budgets so the SLA column and the action column can both exist. **This is the single
   highest-value change in the document** — it is currently impossible to work Disputes at a
   glance.
2. **Split `--text-kpi` from `--text-xl` in value, not just in name.** Move the KPI numeral to
   28–32px (a 2.0–2.3× ratio to 14px body) and drop the page title to 20px, or de-emphasise it.
   Then rank the tiles: one lead metric at full size, the rest at 20px. This turns 11 equals into
   one headline and a supporting row, on six screens at once, and it is the change
   `globals.css`'s own H4 comment already argues for. While there: bring
   `ZonesScreen.tsx:601,638` and `LedgerCard.tsx:267` off `text-lg` onto the same token.
3. **Split the `warning` tone by meaning, and take the SLA clock off the badge system entirely.**
   `overdue 4d 22h` and `17m left` must not share a plate, and a severity, a status, a reason code
   and an owner's name must not share it with either. Concretely: SLA gets its own carrier (the
   countdown track already exists — use it as the only clock rendering, breached vs healthy),
   `overdue` takes `critical` foreground text, reason codes and owner names demote to plain text
   per the budget's own clause 3. Target: **≤ 1 tone-filled badge on a resting row** on Tickets
   (3.0 today), Safety (2.8), My Work (2.5), Trips (2.4), Disputes (2.0).
4. **Give every work queue one brand-filled primary action, and only one.** 13 of 15 work screens
   have zero. The default on a claimed row is `Resolve` / `Confirm` / `Pay`; `Close`, `Escalate`,
   `Hand over`, `View ledger` stay outline. This is the whole of "what is needed next" and it
   currently has no visual answer anywhere outside Admin.
5. **Fix the money unit and the money sign.** (a) Never clip a header that carries the currency —
   `Cash debt (SAR)`, `Net payable (SAR)`, `Expected (SAR)`, `Deviation (SAR)`, `Claimed (SAR)`
   are all clipped today; either widen or move `SAR` into a 12px meta sub-label that cannot
   truncate. (b) A negative amount must not be one glyph in the same ink as a positive — give it
   `critical` foreground, and put the sign where the eye is (right-aligned figures need the sign
   adjacent to the digits, not stranded at the left). This closes M1–M8 at once.
6. **Declare `isRowCritical` on Disputes and Tickets, and reconcile the three disagreeing
   markers.** Disputes has 28 rows 67 days overdue and no critical treatment at all; Tickets has a
   `Breached` row with none. Then make `RowCriticalMarker` a `DataTable` responsibility driven by
   `isRowCritical`, so `TripsScreen.tsx:358` (marker without tint, meaning *flagged* not
   *breached*) and `LedgerControlsScreen.tsx:597` (unconditional marker on every row) cannot
   happen. Also raise the tint above **1.056 : 1** — at that value it is weaker than the plate
   under a `No clock` chip and the marker is doing all the work alone.
7. **Fix the emphasis inversions.** `/support/tickets`: `Subject` → `primary`, `Ticket` id →
   `meta` (it is currently 17.22 : 1 bold while the subject is 4.83 : 1 grey and clipped to 68 %).
   `/operations/trips`: `Rider` and `Captain` → `data`, so the two people you look for are not at
   the lowest tier. `/management/zones` cities: give it one primary. And put a colour or size delta
   between `primary` and `data`, which today differ by `font-weight` alone.
8. **Bring `/admin/team` inside `DataTable`.** Two raw `<table className="text-xs">` at
   `AdminTeamScreen.tsx:518` and `:650` produce 217 elements at 12px, an inverted roster (identity
   w400, compensation cap w500) and a 126-cell permission matrix where `Withheld` is
   indistinguishable from `Granted`. Give `Withheld` the `critical` foreground and the matrix
   becomes scannable in one pass.
9. **Make the counts agree, and let the workspace rail tone.** `ModuleRail.tsx:300` hard-codes
   `'neutral'` — a workspace holding a breached queue looks identical to one that does not, so the
   first thing an operator reads carries no severity. And reconcile Trip Assurance's `4 / 10 legs /
   2 past deadline`, My Work's `22 / 2 items / 13 past deadline` — including making the My Work
   banner reachable: it currently alarms about 13 rows that the default filter hides.
10. **Stop rendering non-facts at headline rank.** `— No comparison period yet` appears on 6 of 8
    Risk tiles and 9 of 12 Ops Overview tiles; `—` renders at 22px/600 twice on Support Overview;
    `0.00 SAR` renders at full ink on 5 of 11 Trips rows and on unstarted Dispatch cards;
    `Not run yet` fills both data columns of all 19 Admin Data checks, 13 of which also wear an
    amber `Critical` chip. Suppress the empty comparison line, render a null KPI as a 14px meta
    phrase rather than a 22px em-dash, and render an inapplicable fare as `—` in meta rather than
    as a zero in ink.

---

## 8. What is already working, and should not be touched

Said plainly, because four of these are unusual to get right:

- **The type ramp.** 3–5 distinct sizes per screen, median 4, across 24 screens. That is
  discipline, and it is why the remaining problems are legible as problems.
- **The three-tier ink separation.** 17.22 : 1 against 4.83 : 1 is a 3.56× step; where `data`
  columns are correctly chosen (`/operations/people`, `/financials/ledger`,
  `/financials/rider-wallets`) the scan path is genuinely there.
- **Every money figure resolves `tabular-nums` and `text-align: end`,** on every screen, with two
  decimal places. Column alignment is not a defect anywhere.
- **`/operations/people`** is the reference table: 1 primary, 3 data, 4 meta, exactly one badge per
  row, identity with a second line, no clipping in the identity column.
- **`emphasisOf` anchoring to the declared array rather than the visible one** is correct and does
  what it claims — no measurement here found emphasis moving when a column was hidden.
- **The `attention` nav tone, where it fires** (`support-safety`, `admin-data`) is the right idea
  correctly restrained. The problem is that it cannot reach the rail, not that it is over-used.
- **`/admin/data`'s single brand-filled `Run all checks`** is the only screen in the product whose
  next action is visually unambiguous. It is the pattern the other fourteen need.
