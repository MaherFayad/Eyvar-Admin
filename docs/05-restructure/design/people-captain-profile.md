# people — captain (driver) profile

**Two surfaces, one record.** The side sheet at `?entity=<id>` and the full page at
`/entity/:entityId`, where the record is a `Driver`.

| | |
|---|---|
| Owner | product-designer |
| Builders | frontend-engineer (sheet), frontend-engineer (page), mock-data-engineer (the document file), utilities-engineer (helpers) |
| Files this spec governs | `src/components/profile/driver/*`, `src/screens/entity/DriverProfilePage.tsx`, `src/screens/entity/DriverEarningsTable.tsx` |
| Files this spec **requires a change to, owned elsewhere** | `src/components/DataTable.tsx` — one new slot, §7. `src/data/types/driver.ts` — one new field, §6.7. **`src/components/profile/fields.tsx` — one new export (`AbsentLine`), finding M, with a stated fallback if refused** |
| Files this spec **explicitly does not touch** | `src/shell/routeState.ts`, `src/shell/layers/ProfileLayer.tsx`, `src/components/PageShell.tsx`, `src/components/ui/*`, `src/styles/globals.css`, `components.json`, `src/components/metrics/*` (**AC-CP-71, AC-CP-85, AC-CP-86**) |
| Reference record | `DRV-0101` |
| Parent spec | [`people-rider-profile.md`](./people-rider-profile.md) |

**This is a delta, not a replacement.** Everything in `people-rider-profile.md` §3 (the parity
contract and its four enforcement mechanisms), §3.2 (fact rank), §7.2 (`INDEX_ROUTE` and the
back affordance), §9 (the four states), §10 (Arabic) and §11.2 X-1…X-17 (the refusals) is
**inherited verbatim** and is not restated here. Where this document is silent, that one
governs. Where this document rules, it rules for the captain only and says so.

Read `§4` first — it is the answer to *"make the captain read as more distinct"* and it is the
part that changes what is already built. **`§4B` is owner amendment 2 — the page becomes tabbed,
the right rail is dropped, and `Performance` becomes figure rows. It is the largest structural
change in this document and a builder waiting on the tab list and the URL parameter should read
`§4B.2` and nothing else first.** `§5` and `§6` are the document list and its viewer; `§6.2a` is
the document's provenance block. **`§6.5a` is owner amendment 3 — the scan gets a preview, an
`Open scan` control and a `Download` control. A builder waiting on the two presentations and the
download's permission should read `§6.5a.1` and `§6.5a.5` and nothing else first.** `§12` is the
numbered acceptance criteria. **`§13` is owner amendment 4 — the explanatory sentences under the
Earnings tile are deleted and compressed to one line, and the ⓘ tooltip is refused on both
surfaces (D-CP-16). A builder waiting on it should read `§13.2` and `§13.3` and nothing else
first.**

---

## 1. Provenance and precedence

```
Rulings R1–R19  →  DESIGN.md §6.2 sanctioned deviations  →  §7–§9  →  §1–§5
```

Three things bind this document harder than usual and are stated at the top because two of
them were asserted the other way in the brief that commissioned it:

- **D-2 is retired.** `DESIGN.md` §6.2: *"D-2 is retired — `DECISIONS.md` D7, measured not
  asserted… Its type-ramp and spacing-scale suspensions are void and may not be cited
  again."* **Nothing in §4 buys distinction by making something smaller.** The surviving
  departure is D-2′ and it is the page gutter and nothing else. Anyone who reads "density is
  the brand" as a licence to shrink type or leave the 4px grid is citing a retired row.
- **No §1–§5 pixel figure binds** (R13). Every figure below is a token value, a ratio, or a
  measured figure carried by name from the rider spec's own Chromium sweep.
- **The primary is green, and that is not a defect.** `globals.css` sets
  `--primary: var(--ev-brand)` `#0c6944` with a written, reversible ruling — *"R2 is amended
  by one colour name and no behaviour… it is now green, and that is not 'Save is green', it is
  'primary is green'"*, white on it measured at 6.731 : 1. So the filled green control the
  owner photographed is the product's primary rendering correctly. §4.6 removes it because it
  should not be **filled**, not because it is the wrong colour.

Reference evidence opened for this spec, cited where used:

| File | What it settles |
|---|---|
| `01-home/home-guide-side-panel-in-progress.webp` | a ~370px drawer whose list rows **expand in place** with body prose and one control, with the state at the row's inline-**start**. No nested surface anywhere. This is §6's precedent |
| `02-orders/order-detail-timeline-comment-with-attachment.webp` | the **file tile** — a bordered block with a leading glyph, the file's name, and `kind · size` on a second line — and `View email`, a plain per-row control that opens an artifact. §6.2 |
| `04-customers/customer-detail-no-orders-yet.webp` | a person record's summary as **ink headings over their values, separated by space and not by rules**. §4.3's evidenced pair, half one |
| `02-orders/orders-list-with-metrics-row.webp` | the metric band — **muted labels above values, divided by vertical rules**. §4.3's evidenced pair, half two, and the shape the rider spec cites for its own summary |
| `10-settings/settings-billing-history.webp` | a list row carrying a title, a muted date, a state badge and a figure, and what it costs to hold them on one line |
| `10-settings/settings-billing-overview-bills-and-credits.webp` | `View all billing history` — **a plain link at the bottom-inline-start of the card it extends**. §5.3 |
| `02-orders/order-detail-paid-fulfilled-gift-card.webp` | the record rail as **ink sub-headings over blocks of unlabelled lines** — `Contact information`, `Shipping address`, `Billing address` — and, in `Paid`, the one place a `label … value` row is used: a **column of right-aligned money read down**. §4B.7's rule comes from this pair |
| `11-apps-and-channels/app-detail-shop-channel-needs-attention.webp` | the same grammar in a **grid**: `Contact information` · `Location` · `Device information` three across, each a heading over stacked values. §4B.8's `Identity` tab |
| `08-finances/finances-overview-earnings-donut-and-payouts.webp` | the metric-band grammar the captain diverges from — **muted label above the figure** — and `Payout account` as a heading, a sentence and a link rather than six rows. §4B.6, §4B.7 |
| `03-products/products-list-default.webp` | Shopify's tab strip is an **index view switcher inside the table card**. Cited for what this page's tab row is **not**: these tabs switch sections of one record, which is why they take the `line` variant and not `segmented`. §4B.8 |

---

## 2. Pattern

**`DESIGN.md` §6.4 row:** `profile` → *Two-column detail: main + right rail summary, with
timeline* — **§2.2, §3.8**. The same row as the rider.

> **AMENDED by owner amendment 2 — the SHEET still fits this row; the PAGE no longer does.**
> §4B.5 drops the right rail, so `/entity/:entityId` is a single column with four addressable
> tab panels. That is written as **D-CP-12** and it is a departure from the row above, not a
> stretch of it. §2.2 and §3.8 are §1–§5 sections that bind only where §6 adopts them, and §6.4
> adopts them here — so the departure takes a numbered deviation rather than a reading.
> **This is a gap in §6.4, stated loudly as the brief requires: the pattern table has no row for
> *"single column, tabbed record page"*, and this screen is now the first instance of one.** It
> is finding N's neighbour and belongs to whoever owns §6.4; this document does not amend
> `DESIGN.md` and does not pretend the row still fits.

Governing sections are the rider spec's §2 table, unchanged, plus:

| Subject | Governs |
|---|---|
| The document list and its expansion | `DESIGN.md` **§4.7** (accordion rows, reveal-in-place), **§5.5** (no modal in a drawer) |
| The payable ledger | **§8.3.3**, **§8.3.4**, and `clients/payouts.ts`'s AC-308 |
| Blocked controls | **§11.2** — disabled in place, with a stated reason, never hidden |
| Documents' four states | `design/00-shell.md` §11.1–§11.3; `docs/ref/states.md` |

---

## 3. The parity contract, inherited

`people-rider-profile.md` §3 applies to the captain unchanged. Two clauses are load-bearing
for everything below and are restated because §5 and §6 lean on them:

- **P1 — same facts, both surfaces, from one builder.** `useDriverReads` is already the one
  query and both surfaces call it, so parity here is *structural* rather than test-enforced.
  Keep it that way: **the document viewer's trigger goes on the row inside `DriverDocuments`,
  which both surfaces already mount.** One row implementation, therefore one viewer. That is
  AC-CP-30 and it is a criterion rather than an instruction, so QA can fail a second
  implementation instead of a reviewer having to spot one.
- **P3 — no private facts.** A surface chooses geometry; it may not choose content. §4's six
  deviations are all geometry, rhythm and order. **Not one of them adds or removes a fact.**

---

## 4. THE DISTINCTION — what carries it, with no new colour

### 4.0 The thesis, and the constraint that forces it

> **A rider profile is a dashboard: values you read. A captain profile is a docket: dates you
> act before.**

The builder already made the two structurally distinct, and the reasoning holds: Standing
leads, Documents is the first tab, the money is a payable where a credit means Eyvar owes
more, the side column leads with the payout account. The owner wants more. The token set is
closed, R5a limits red to five ruled uses, and `globals.css` is the token steward's file — so
the distinction has to come out of **composition, rhythm, order and prominence.**

**One constraint kills the most obvious answer before we start.** The captain sheet is
currently a two-column body — a `w-1/3` rail beside the tab column — and the rider sheet is
one column. That is the biggest visible difference between them today, and it **cannot
survive**, because it does not fit. §4.4 measures it. So the distinction has to be rebuilt out
of levers that work in a single 480px column, which is what the six below are.

Six deviations, numbered **D-CP-1 … D-CP-6**. Each names what it changes, why the record
justifies it, and what it costs. §4.8 names the cost of the set as a whole, because it is real
and the owner should have it in front of them.

### 4.1 D-CP-1 — the band is four lines, and the fourth is the vehicle

**A captain record is two things: a person and a vehicle. A rider record is one thing.** That
is the only structural fact available at the very top of the screen, and it is currently
thrown away — `bandMeta()` returns six items in one flat row where two of them describe a car
and four describe a human:

```
Corolla 2022 · White │ Economy │ Rated 4.9 │ Gold tier │ Riyadh │ Driving since Feb 2025
```

At 480 that wraps to three lines of mixed-rank facts and reads as a run-on.

**Ruled — the band splits into a person row and an equipment row:**

```
┌──────────────────────────────────────────────────────────────┐  bg-hero
│ CAPTAIN · DRV-0101                                      ✕    │  eyebrow  text-2xs hero-label
│                                                              │
│ أحمد سالم القحطاني                                            │  name     text-band hero-foreground
│                                                              │
│ ★★★★★ 4.6 │ Riyadh                                           │  person   text-sm  hero-muted
│ Corolla 2022 · White · Economy                               │  vehicle  text-xs  hero-label
└──────────────────────────────────────────────────────────────┘
   ▲ inline-start                                inline-end ▲
```

- **The person row is `text-sm text-hero-muted` with 1px `bg-hero-line` separators. Two items,
  one separator** — the rating and the city. **Owner amendment**: the rating became stars, and
  the tier and the joined date came off this row (§4.1.1).
- **The vehicle row is one rank lower** — `text-xs text-hero-label`, 5.89 : 1 on `--ev-hero`,
  the measured eyebrow rank. It carries **no `│` separators**; its parts are joined by
  `·` spans that are `aria-hidden`, because they are one description of one object rather than
  four independent facts. That difference in separator is deliberate and is the whole reason
  the two rows read as two kinds of thing.
- **The vehicle string is `Driver.vehicle` verbatim** — `'Corolla 2022 · White'` — and
  `types/driver.ts` is explicit that it is *"one display string in legacy, and genuinely one
  field"*. It is **not** split, and the `·` inside it is the data's, not the layer's. The
  class is appended as a separate node with its own `·` separator, so §9.6 is not breached: no
  string is built by joining two translated fragments.
- `<bdi>` on each part. The row mirrors as a block; nothing inside it is placed by a physical
  side.

**What this buys.** The rider band is three lines; the captain band is four, and the fourth is
visibly a different rank. It is the first thing on both surfaces and the difference is legible
before a word is read. **What it costs:** one more line of band height on both surfaces.

**Where `bandMeta` goes.** It becomes two builders — `bandPersonMeta(driver, t, language)` and
`bandVehicleMeta(driver, t)` — both called by `DriverBand` and by `DriverProfilePage`'s
`DriverBandBlock`, so the two surfaces still cannot disagree about a fact.

### 4.1.1 Owner amendment — the rating is stars, and two facts move rather than go

The person row was `Rated 4.6 │ Tier Gold │ Riyadh │ Driving since Nov 2024`. On the owner's
instruction it is now **two items**: the rating, as stars, and the city.

**The thing the criterion was protecting is not "six items in, six items out" — it is that no
fact leaves the RECORD.** Both removed facts are in `identityFields()`, which both surfaces
render:

- `profile.field.joined` was **already there**. It left the band and lost nothing.
- `profile.field.tier` **moved there and had to.** `DRIVER_TIER` was rendered in exactly one
  place in the product — this row — so deleting it would have dropped a captain's tier from the
  profile entirely. The builder looked for a better home before moving it and **rejected
  `Standing`**, on the grounds that `standingFlags` is a list of things that are *wrong* and a
  Gold tier sitting among them would read as a flag. **That reasoning is correct and is now the
  ruling**: `Standing` holds conditions against a captain, never attributes of one.

So AC-CP-04 is restated, not renumbered: **the band may shed facts; the record may not.**

**The stars.** Same construction as `SlotMeter`, one component over:

| Property | Ruling |
|---|---|
| Colour | **`currentColor`.** On the band the stars are the person row's own `--ev-hero-muted`; anywhere else they are whatever the text around them is. **No new colour, no new token, and R5a is not asked for anything** |
| Empty stars | the **same colour at `opacity-50`**, never a second hue. An empty star is the filled one turned down, which is what makes five glyphs read as one scale |
| Fill | to the **nearest whole star**, `Math.round(rating)` |
| The figure | **rendered beside the stars and it is the value.** Five glyphs cannot express `4.6`, so the glyphs are texture and the number is the precision — exactly the argument `SlotMeter` makes for dropping its meter past twelve segments |
| Accessibility | **the stars and the visible figure are both `aria-hidden`, and one `sr-only` sentence carries the value** — `Rated 4.6`. §7.5 gets one carrier to maintain rather than two that can disagree, a screen reader hears the number instead of five identical glyph names, and announcing both would read as `4.6 Rated 4.6` |
| `rating === null` | **words, never five empty stars.** `No rating yet`. R4-11: legacy's `0` means *not yet rated*, and an empty five-star row reads as a score somebody gave. This branch is unchanged and stands |
| Arabic | `formatDecimal(…, 1, language)` keeps Western digits (§9.2). The star run is `inline-flex` and reverses with the document; the figure sits at its inline-end in both directions |

**A note for QA, learnt the hard way on the rider.** A negative assertion about this row —
*"the tier is not in the band"* — **must be scoped to the band element**, not to the dialog or
the document. The tier and the joined date are still on screen one scroll down, in `Identity`,
**because that is the design**. A document-wide `queryByText` fails on copy that is supposed to
be there, and the failure looks like a regression in the band.

### 4.2 D-CP-2 — the summary is never a single-column stack

The rider's summary is four blocks in one column on the sheet and three cells across on the
page. **The captain's is two-up, always, at every width, on both surfaces:**

| Width | Rider | Captain |
|---|---|---|
| The sheet, 480 | 4 blocks stacked, one column | **2 × 2** |
| The page, below `--ev-bp-wide` | strip restacks to one column | **2 × 2** |
| The page, at and above `--ev-bp-wide` | 3 across | **4 across** |

So the invariant is testable in one sentence: **no captain surface ever renders the four
summary blocks in a single column.** That is AC-CP-06.

```
sheet, 480                                page, ≥ 1344
┌─────────────────┬─────────────────┐     ┌────────┬────────┬────────┬────────┐
│ Standing        │ Documents       │     │Standing│Document│Earnings│ Slots  │
│ Under review    │ Expiring        │     │        │        │        │        │
│ 1 open complaint│ Registration    │     └────────┴────────┴────────┴────────┘
│ Bank rejected   │ 19 Jul 2026     │
│                 │ 5 on file       │     page, < 1344 — the same 2 × 2 as the sheet
├─────────────────┼─────────────────┤
│ Earnings        │ Subscription    │
│ 652.60  SAR     │ slots           │
│ payable         │ 1               │
│ Cash debt 23.15 │ 1 slot open     │
│ …               │ ▮▮▮▮▭           │
│ Last paid 22 May│ 4 of 5 taken    │
└─────────────────┴─────────────────┘
```

- **Reading order is row-major and therefore unchanged**: Standing → Documents → Earnings →
  Slots, which is `DriverBlocks`' whole priority argument. It is preserved in both directions
  because a CSS grid's row-major order follows the document.
- **Dividers stay logical**: `border-inline-start` on cells 2 and 4, `border-block-start` on
  cells 3 and 4. That is the construction `DriverStrip` already ships for its `wide:` case,
  applied at every width. **A `border-l` here is a defect on arrival.**
- **Cells are top-aligned** and a short cell leaves quiet ground beneath it. That is accepted
  and named: the alternative was to pair the blocks by height, which would put Slots second
  and break the priority order for a cosmetic reason. **Order beats evenness.**
- The ground stays `bg-muted` — D-RP-2, inherited, no new token.

**What this buys.** The captain summary's silhouette is a grid; the rider's is a stack. It is
the single most visible non-colour lever available, and it halves the summary's height on the
sheet, which is what lets the tab row and the first two document rows sit above the fold at
480. **What it costs:** the holes under Standing and Slots when Earnings runs four money lines.

**And it fits.** The cell is 240px, `px-4` leaves **208px** of content. The rider's own
Chromium sweep at 480 measured `200.00 SAR` at `--text-kpi-lead` wanting **154px** — the same
glyph count as `652.60 SAR`. 154 in 208 clears by 54px. Against today's 128px rail block it
overflows by 26. §4.4.

### 4.3 D-CP-3 — the block label is a heading, not a caption

Two Shopify instruments, two different jobs, and the two profiles are one of each:

| | Instrument | Label treatment | Reference |
|---|---|---|---|
| **Rider** | a metric band | **muted**, sentence case, above the value, cells divided by rules | `02-orders/orders-list-with-metrics-row.webp` |
| **Captain** | a record dossier | **ink, medium weight**, a heading over its facts | `04-customers/customer-detail-no-orders-yet.webp` — `Contact information`, `Default address`, `Marketing`, `Tax exemptions` |

**Ruled: `SummaryBlock`'s `<h3>` moves from `text-xs text-muted-foreground` to
`text-xs font-medium text-foreground`.** One line. No new token, no size change, no spacing
change, nothing off the 4px grid, and **D-2 is not cited** — this is a weight and a rank, not
a density.

- **D18 is not touched.** D18 bans `uppercase` + `tracking-wider` on a label. Sentence case at
  medium weight is not uppercase and carries no tracking.
- The captions beneath stay `text-xs text-muted-foreground`, so the block now has **three ink
  ranks** — heading, figure, caption — where the rider's has two. That is the "label and figure
  relate" lever, resolved: on the rider the label is subordinate to the figure; on the captain
  it is superordinate to the whole block.

**What this buys.** In a 2×2 grid a muted label is not a strong enough anchor for a cell; an
ink heading is, and it is what turns the grid from four floating readouts into four named
sections. D-CP-2 and D-CP-3 are one move in two parts and should ship together.

### 4.4 D-CP-4 — the sheet body is one column, and the rail is refused on measurement

`DriverProfile.tsx` renders `flex-row` with `compact:flex-col`. **`compact` is
`@media (width < 768px)` — a viewport query.** A 480px panel inside a 1280px viewport never
matches it, so that override has never fired at any width an operator uses, and the sheet has
always been a two-column 480px drawer.

That is the arrangement the rider spec measured in Chromium at 1280 × 900 and refused:

| panel width | rail box | rail needs | overflowing |
|---|---|---|---|
| **480** | 159 | **170** | the rail, its ground, its first block, and the figure — `200.00 SAR` wants **154** in a **126** box |
| 640 | 213 | 213 | none — and 640 is the width `sheet.tsx` C12 refuses in writing |

The captain's rail is worse, not better. Its block box is **128px** (`w-1/3` of 480 = 160,
less `SummaryBlock`'s `px-4`), and it must hold `652.60 SAR` at `--text-kpi-lead` — the same
six glyphs the rider measured at **154px** — plus `MoneyLines`' `Cash debt … 23.15 SAR` on one
baseline and `Registration expires 19 Jul 2026` as a caption. The tab column is then 288px,
which is where §5's wrapped rows come from.

**Ruled: `DriverProfile`'s body is one column, unconditionally.** Band, then the 2×2 summary
(D-CP-2), then the tabs, then the footer.

- The summary's separating edge from the tab column becomes a **block-axis** rule
  (`border-b border-border`), not `border-e`. That is the entire mirroring cost of the
  restack: the inline edge that had to mirror no longer exists.
- **`compact:flex-col`, `compact:border-e-0`, `compact:border-b`, `compact:w-full` and
  `compact:max-w-none` are deleted, not retained "just in case".** A dead override that looks
  live is how the next reader concludes the layout is already responsive.
- **Do not propose widening the drawer.** It has been measured and refused three times now —
  `sheet.tsx` §1.2 / C12, the rider spec §6.1, and this section. `--ev-drawer-w`,
  `globals.css`, `ShellLayer` and `sheet.tsx` are unchanged by this screen.

**This is where the honest cost sits.** Restacking makes the captain sheet's *outer* geometry
match the rider's, which subtracts distinction — and it is why D-CP-1, 2, 3, 5 and 6 exist. A
two-column 480px drawer was never a distinction; it was an overflow.

### 4.5 D-CP-5 — every captain list is ordered by its deadline, not by its canon

`documentRows` walks `DOC_ORDER` — a fixed canonical order, licence first, operating card
last. That is right for the Compliance **view**, where the five are *columns* and positional
memory is the whole point of a table.

It is wrong for a profile, where the operator's question is *"what is about to stop this
person driving"*.

**Ruled: the profile's document list is ordered by `expiresOn` ascending — soonest first —
with `DOC_ORDER` as the tie-break.**

- An expired document has the earliest date, so it sorts first. Correct: it is the most urgent.
- The tie-break is not decoration. Two documents sharing an expiry date must produce one
  deterministic order or every screenshot test flickers.
- **The Compliance view's table keeps `DOC_ORDER`.** Different question, different instrument.
  `documentRows` gains an `order` argument or a second exported sorter; it does not silently
  change under the other screen's feet.
- **It makes the summary block and the list agree by construction.** `DocumentsBlock`'s caption
  already names `soonestDocument()`. Under this order that document is provably row 1, so the
  block is a pointer at the list rather than a second, independently-derived claim.

**What this buys.** The rider's Activity list leads with the open trip — a live record. The
captain's leads with the nearest deadline. Same list shape, opposite organising principle, and
it is the thesis in §4.0 expressed as a sort order.

### 4.6 D-CP-6 — neither captain surface carries a filled button

`Open compliance file` ships as `variant="default"` in a `flex justify-end` wrapper, which is
the stranded green button the owner photographed. Three things are wrong with it and only one
of them is the colour:

1. **It is a navigation, not the primary act of this list.** R3 caps the count at one; it does
   not require one. `DriverFooter` already records at length that this surface commits nothing
   and that all five captain operations are declared elsewhere on purpose.
2. **On the sheet it contradicts §6.2's restored *"the layer commits nothing"*.** A filled
   button in a drawer is the affordance for a commit. There is none.
3. **It is detached from the list it belongs to** — inline-end, below a gap, outside the
   `divide-y` block.

**Ruled:**

- `Open compliance file` and `Open payouts` are both **`variant="link"`**. `NavigateControl`'s
  `variant` prop keeps its type but the `'default'` value is **not used by this screen**.
- Both sit at the **inline-start**, immediately beneath the last row of the list they extend,
  inside that list's own block. `NavigateControl`'s `justify-end` / `items-end` become
  `justify-start` / `items-start`. Evidence: `View all billing history` in
  `10-settings/settings-billing-overview-bills-and-credits.webp`.
- **Zero filled buttons on either captain surface, in every state.** The rider sheet has
  exactly one (`Assign a captain`, disabled). That difference is honest: the rider record has
  an action; the captain record has two destinations.

**What this buys.** A page with no primary reads as a record you consult; a page with one reads
as a record you act on. **What it costs:** the compliance escape hatch loses prominence. It is
answered by position — directly under the five rows, in `--ev-blue-dk` with an underline (R3),
at the inline-start where a reader's eye returns after the last row — not by fill.

### 4.7 What I refused

| Refused | Why |
|---|---|
| A captain accent, tint or a sixth badge tone | R5a, R7. Not available and not asked for |
| Tighter type or off-grid spacing to "feel denser" | **D-2 is retired** (`DESIGN.md` §6.2). Its type-ramp and spacing suspensions are void and may not be cited again. D15 stands independently: an off-grid literal is a defect on its own terms |
| Reordering the summary blocks so the 2×2 has even cell heights | The order is `DriverBlocks`' argument — standing, then what will stop them, then what they are owed. Cosmetics do not outrank it |
| A container-query-responsive document row that is one line on the page and two on the sheet | Two compositions is two implementations, which is the drift `SummaryBlock`'s own header records against the rider's rail and strip. And the codebase has viewport variants only; a container query is new machinery in files this spec does not own |
| An uppercase, letter-spaced block label to make the captain "look like a docket" | **D18**, and the rider spec's X-4 refused the identical twelve labels |
| Renaming the ledger's `Debit` / `Credit` headers to `Paid out` / `Earned` | §8.3.3's MUST names the six headers literally, `ledgerColumns` is shared with screens where the convention is the opposite, and a private vocabulary hides the trap instead of removing it. §7 |

### 4.8 The cost of the set, named

The owner should have this in front of them rather than discover it in six months.

1. **Transfer is lost.** An operator who has learned the rider profile now re-learns the
   captain's summary grammar. The two screens answer the same shape of question about the same
   shape of record, and after D-CP-2 and D-CP-3 they no longer look like siblings. That is
   exactly what was asked for; it is still a cost.
2. **`SummaryBlock` (captain) and `RiderRail`'s block are now permanently two components with
   two rules.** The rider spec §6.3 asked for a shared `ProfileSummaryBlock` and split
   ownership prevented it; D-CP-3 makes that unification impossible rather than merely
   unfinished. **A third entity type — a corporate account, an applicant — will have to pick a
   side, and nothing in this document tells it which.** That is a real gap and it is raised in
   §11 rather than answered here, because answering it is a scope decision.
3. **The captain summary also diverges from the metric boards.** The rider's band borrows the
   product's established metric grammar (`MetricTile`, `BoardHero`: muted label over figure).
   The captain's no longer does. One more grammar to keep in the head.
4. **Everything in §4 is geometry.** Not one fact moves surface, value or rank — that is the
   fact-rank contract doing its job (rider spec §3.6) — so none of this can be traded back for
   information. If the owner later decides the distinction is not worth items 1–3, D-CP-2 and
   D-CP-3 revert in two files and nothing else changes.

---

## 4B. OWNER AMENDMENT 2 — the page becomes tabbed

> *"for this driver page I want you to make it into tabs so it's easier to scan and check and
> read all the data this is so hard to get anything. even the right col. you can make it better
> and more scannable and for some details make it into tabs, and make some like performance into
> cards like in the overview"*

Three requests. Three answers, each ruled below with the rule it suspends:

| # | Asked | Ruled |
|---|---|---|
| 1 | tabs on the page | **Four tabs — `Documents · Earnings · Activity · Identity` — addressed by `?view=`.** The band, the banner and the summary strip are **not** tabbed. §4B.1, §4B.2. **D-CP-9, D-CP-10** |
| 2 | a better right column | **There is no right column.** Every card in it fails the test *"must this be true on every tab"*; the four that carry facts move onto tabs, and the one that carries a gate moves into `Standing`, which is already on every tab. §4B.5, §4B.7. **D-CP-12** |
| 3 | Performance as cards like the overview | **Two figure rows, built from `SummaryBlock` — the component the summary strip already uses.** `MetricTile` is refused on a contract and on a grammar, and **D-CP-3 is not overturned; it is the reason.** §4B.6. **D-CP-13** |

**What this costs, in one line, so it is not discovered later:** the captain page stops being a
two-column detail page. That departs from the `§6.4` row this spec cites in §2, and the
departure is written as **D-CP-12** rather than assumed.

### 4B.0 What is actually wrong with the page today — measured, not felt

The owner's report is *"this is so hard to get anything"*. Counting what is on screen at once:

| Region | What it holds |
|---|---|
| main, one scroll | 4 sections: `Documents` (5 disclosure rows) · `Payable movements` (a 6-column ledger) · `Deductions` · `Activity` (a timeline) |
| rail, 5 stacked cards | `Payout account` **6** label/value rows · `Performance` **7** · `Elsewhere in the console` 9 presence rows · `Identity` **8** · `Device` **4** |

The owner counted thirteen because `Identity` and `Device` are below the fold. **The real figure
is twenty-five label/value rows in four cards**, at one rank, with no heading between any two of
them beyond the card titles. That is the defect, and it is worse than reported.

Two further measurements that decide §4B.5 and §4B.6:

- **The ledger does not fit and has not since it shipped.** `DriverProfilePage`'s own header
  records it: *"at 1440 the main column is ~696px against the ledger's 832px budget, so the table
  scrolls."* Arithmetic, from the tokens: at 1440, content region = 1440 − `--ev-rail-w` 80 −
  `--ev-subnav-w` 224 = 1136; less 2 × `--ev-page-pad-wide` 48 = 1040; less `--ev-detail-rail-w`
  320 and a 16px gutter = **704px main**. At the `--ev-bp-wide` 1344 floor it is **608px**, and
  in Arabic (`--ev-rail-w` 88, `--ev-subnav-w` 256) **568px**. Against 832.
- **Without the rail, it fits.** 1344 English = 944px; 1280 = 912px; 1280 Arabic = 872px. All
  three clear 832. **Dropping the rail closes a defect that has been open since the page shipped
  and that the rider spec §14 A recorded as a fallback's known blemish.**

*(Figures computed from `globals.css` token values, not measured in a browser. The sweep is
AC-CP-79.)*

### 4B.1 D-CP-9 — the band, the banner and the strip are never inside a tab

**Ruled: the tab row begins below the summary strip. Nothing above it is tabbed, at any width,
on either surface.**

The test is one sentence: **a tab may hide a fact; it may not hide a gate.**

- **The band** is the record's identity. A tab that could hide who this is has no meaning.
- **The banner** is §11.4's one standing condition — *this captain is suspended*. It changes what
  the console will let an operator do with everything below it. Behind a tab, an operator reads a
  suspended captain's earnings without ever learning they are suspended.
- **The strip** is the four-cell answer to *"may they work"*: `Standing`, `Documents`,
  `Earnings`, `Subscription slots`. Every one is a gate or a countdown. It is also the thing the
  tabs are an index **into** — Documents cell over Documents tab, Earnings cell over Earnings
  tab — and an index that hides itself when you use it is not an index.

**A consequence worth stating, because it is the strip's whole justification after this change:**
the strip is now the only summary on the page, where before it competed with a rail full of
readouts. D-CP-2 and D-CP-3 get *more* load-bearing, not less.

**Refused: making the strip's cells clickable so that `Documents` selects the Documents tab.**
Attractive and wrong three ways. `DriverStrip` is a **readout** and D-RP-2's whole argument for
its subdued fill is *"this is a readout of what is below, not another card of content"* — a
readout that navigates is a card of content. Two of the four cells (`Standing`, `Subscription
slots`) have no tab to point at, so two would be inert and two live, which is the worst of the
three states. And `EarningsBlock` and `CapacityBlock` contain a badge and a meter; wrapping
either in a control puts interactive content inside a link. **Recorded as a refusal, not an
omission.**

### 4B.2 D-CP-10 — the tab is a LOCATION, and the parameter is `?view=`

**Ruled:**

```
/entity/DRV-0101?view=documents      the default, and the value that is never written
/entity/DRV-0101?view=earnings
/entity/DRV-0101?view=activity
/entity/DRV-0101?view=identity
```

| Question | Ruling |
|---|---|
| **Which parameter** | **`?view=`.** Not `?tab=`. `routeState.ts` already reads it (`:128`, `query.get('view')` into `base`, which the `/entity/:entityId` branch spreads at `:135`), it has exactly one writer (`withView`), and it is defined there as *"a control, not a level — it changes neither column's highlight (**AC-10**)"*. Nothing in the shell changes |
| **Absent** | `documents`. The same default the sheet already ships (`DriverPanels.tsx:129`, `defaultValue="documents"`), and D-CP-5's argument as a landing: *what is about to stop this captain driving* |
| **Unknown** | `documents`, **and the URL is not rewritten.** Two precedents, both in force: `useScreenViews` — *"an unknown `?view=` falls back rather than rendering nothing"* — and `resolveRoute`'s **AC-12**, *"the shell stays intact, the URL is NOT rewritten"*. A silent rewrite makes a typo untraceable and eats a history entry |
| **Selecting a tab** | `navigate({ pathname, search: withView(location.search, id) })` — **a push, not a replace**, matching all seven existing consumers. The usual objection (three Backs to leave the page) does not apply here: `/entity/:entityId` sets `showsBackArrow: false` and the page renders its own `ReturnControl`, an `<a href>` to a resolved destination, so **leaving never depends on history depth** |
| **Interaction with `?entity=`** | None. `withOverlay` deletes only the four overlay params and preserves everything else *"— `?view=` in particular, because **AC-10** says a layer changes neither the view nor either nav column"*. Opening a rider's sheet from the captain page keeps the tab |
| **Interaction with the back affordance** | None. `back.ts` resolves to `location.state.from` or `INDEX_ROUTE.driver.path` = `/operations/people?view=captains` — **a different pathname**, so the index's `?view` and the page's never coexist |
| **Interaction with a table's URL state** | **Compatible by construction, and worth knowing.** `useUrlTableState` scopes its parameter names by `?view` (`:145–148`): under `?view=earnings` a table's params become `earnings.q=`, `earnings.sort=`. So a table on a tab namespaces itself to that tab automatically. **The captain's ledger stays `urlState: false`** — the ledger default — and this spec does not change it |
| **What is NOT in the URL** | The expanded document row (**AC-CP-44**, unchanged) and the sheet's tab (§4B.4). *A tab is a destination; a disclosure is a reading position.* That sentence is the whole rule and it was already written in §6.6 |

**On the claim that this is a new convention.** It is not, and the record needs correcting
because a ruling resting on a false premise gets reopened. A grep for `useSearchParams` finds one
hit (`auth/NewPasswordCard.tsx:90`) and that is a true fact about the wrong thing — **the product
does not use `useSearchParams`; it uses `useLocation` + `withView` + `navigate`.** Verified
consumers, with line numbers:

| File | Line |
|---|---|
| `screens/operations/people/PeopleScreen.tsx` | `:87` reads `route.view` with a fallback, `:99` writes `withView` into `IndexToolbar`'s `onSelectTab` |
| `screens/operations/trips/TripsScreen.tsx` | `:788`, `:814` |
| `screens/operations/subscriptions/SubscriptionsScreen.tsx` | `:626`, `:638` |
| `screens/queues/QueuePage.tsx` | `:107`, `:113` |
| `screens/admin/activity/AdminActivityScreen.tsx` | `:394` |
| `screens/admin/communications/EmailLogCard.tsx` | `:295` |
| `screens/financials/shared/views.ts` | `:71` — and through it **six** Financials screens |

So `IndexToolbar`'s view tabs **are** URL-backed, and `riderProfile.test.tsx:137` asserts
`INDEX_ROUTE.rider.path === '/operations/people?view=riders'` as a fixed string. The captain page
is the **eighth** consumer of an eight-year-old-shaped convention, not the first holder of a new
one. **This changes nothing about the ruling and everything about its standing.**

**Is the deep-link case real?** Yes, and it is not the Slack-message case. Three that exist in
this product today: `back.ts` restores `location.state.from` so an operator returns to where they
were — a page whose tab is not in the URL loses their place on that return; `docs/07-api` and the
runbooks paste `/entity/DRV-0101` into tickets, and a compliance ticket wants
`?view=documents`; and the notification bell deep-links to records, where an expiring-document
alert should land on Documents rather than on whatever tab the page felt like. The first of those
is not a nice-to-have — **it is the back affordance already shipped and already tested.**

**A note on `tabs.tsx`'s standing rule.** Its header carries *"TABS LIVE INSIDE THE TABLE CARD,
NEVER IN THE PAGE HEADER … a tab row in the page header is a second navigation level, and D-4
already spent that budget."* This tab row is **not** in the page header: the header is the band,
and the row sits in the body below the strip. The rule's stated *reason* is also satisfied
directly rather than by construction: `/entity/:entityId` resolves with `workspaceId: null` and
`subTabId: null` (`routeState.ts:135`), so it highlights nothing in either nav column, and a
`?view=` on it cannot change that. **An address is added; a level is not.**

**Reuse `useScreenViews`.** It is exactly this hook — declared views, a default, an unknown-value
fallback, and one writer — with six call sites. It lives in `screens/financials/shared/views.ts`,
which is the wrong home for a seventh consumer outside Financials. **Finding K**, for
utilities-engineer: promote it to `src/hooks/`. Until it lands the page may import it where it
is; it may **not** re-implement the fallback, because two fallbacks is how one of them stops
matching.

### 4B.3 The parity cost, named and priced — why the SAME four tabs

The coordinator's question is the right one and my answer is the unfashionable one.

**The four tabs are the sheet's four, in the sheet's order, from the sheet's four copy keys.**
`Documents` · `Earnings` · `Activity` · `Identity`. `DriverPanels.tsx:131–145`.

**The argument against converging conflates two axes, and separating them settles it.**
D-CP-1…D-CP-6 distinguish **the captain from the rider**. Not one of them says *the captain's
page differs from the captain's sheet*. Re-read them: two band meta rows, a 2×2 summary, an ink
block heading, a one-column sheet body, a deadline sort, no filled button. Every one is
captain-vs-rider and every one survives this section untouched. Making the captain's two surfaces
agree costs the captain-vs-rider distinction **nothing**, and it buys back the thing §4.8 item 1
listed as this spec's largest cost — lost transfer — inside the one record where transfer matters
most.

**And the divergence it does create is bigger than the one it removes.** After §4B.5 the captain
page is a single column with four addressable tabs; the rider page is `DetailPage`, main + rail,
no tabs. That is a silhouette difference legible from across a room and it is larger than
anything D-CP-1…6 bought.

Three more reasons, in the order they would survive review:

1. **An operator holds a position across the transition.** `Open full profile` goes sheet → page;
   `ReturnControl` goes page → the index with the sheet re-opened (**AC-RP-20**). A round trip
   whose tab set changes name, count or order mid-trip is the worst possible place to diverge.
2. **Four is what the record supports, not a number I picked.** Documents = what expires.
   Earnings = what is owed. Activity = what happened. Identity = who they are. There is no fifth
   question, and a fifth tab would be a table of contents rather than a tab set.
3. **Zero new copy.** All four labels already exist and are already translated. A second grouping
   would mint four English strings and four Arabic ones for facts that already have names.

**What §3 actually says, restated because this is where it gets misread.** P1 is *same facts,
both surfaces, from one builder*. P3 is *no private facts*. **Neither governs arrangement, and
neither governs addressability.** §4B.4 diverges the two surfaces on the second of those
deliberately; that is permitted, and it is ruled rather than discovered.

**The cost, plainly.** If the owner later asks for the rider page to be tabbed too, the two
records converge again and §4.8's item 1 returns in full. That is a real risk, it is not
avoidable by picking different tab names today, and the honest mitigation is that the captain's
tabs would still hold different sections from a rider's because the records hold different
collections. Recorded as **Finding N**.

### 4B.4 D-CP-11 — the page's tabs are locations; the sheet's stay local state

**Ruled: the sheet's tab set is component state and is not addressed. The asymmetry is
deliberate, is blessed here, and does not breach §3.**

The sheet is **always mounted over a route that already owns `?view`.** `?entity=` opens it on
top of an index and `INDEX_ROUTE.driver.path` is literally `/operations/people?view=captains`. On
`…?view=captains&entity=DRV-0101` the index's view and a sheet tab would be one parameter fought
over by two owners. So the two surfaces cannot share the mechanism, and the question is whether
the sheet gets a *second* key.

**It does not**, for four reasons in descending force:

1. **A drawer's position inside itself is a reading position, not a destination.** §6.1 already
   rules the drawer *"exists to be consulted against the page behind it"*, and §6.6 already
   applies the exact rule to the expanded document row: *"A disclosure is a reading position, not
   a destination."* A sheet tab is the same class of thing.
2. **The sheet already has an address, and a promotion path to a finer one.** `?entity=DRV-0101`
   addresses the record. An operator who wants to link to a tab uses `Open full profile`, which
   is the page, which **is** addressable. That is a designed escape hatch, not a gap.
3. **A fifth query key is a new obligation on a file this spec does not own.** `withOverlay` would
   have to delete it when the layer closes or it leaks onto the index's URL, and `routeState.ts`
   belongs to the shell.
4. **The product already refuses this exact thing once, on this exact screen** (AC-CP-44). Two
   answers to one question on one surface is the drift §3 exists to prevent.

**The cost, and it is real.** An operator on the sheet's `Earnings` tab who clicks
`Open full profile` lands on the page's `Documents` tab. Carrying the tab across would mean
lifting `DriverPanels`' state through `DriverProfile` into `ProfileLayer.tsx`, which
`profile/driver/index.ts` states in terms is *"not edited by this task"*. **Refused for now,
recorded as Finding L**, with the fix named: one prop, `initialView`, threaded to
`DriverFooter`'s href.

### 4B.5 D-CP-12 — the page drops the rail and becomes a single column

**Ruled: `DriverProfilePage` renders `SingleColumnPage body="flow"`, not `DetailPage`. There is
no `rail` array and no `SideCard`.**

I applied one test to all five rail cards: **must this be true on every tab?** §2.2 gives the
rail *"status, publishing, summary and metadata"*, and the strip already holds the summary and
the status at full width, above everything, on both surfaces.

| Rail card today | Test | Where it goes |
|---|---|---|
| `Payout account` | The **state** must be — see below. The **destination** (bank, holder, IBAN) is reference data an operator reads while reconciling a payout | the state → `Standing`; the block → the **Earnings** tab (§4B.7) |
| `Performance` | No. How a captain drives does not gate anything | dissolved into two figure rows (§4B.6) |
| `Elsewhere in the console` | No. A directory of where else to look | the **Activity** tab |
| `Identity` | No. Reference | the **Identity** tab |
| `Device` | No. Reference | the **Identity** tab |

**Nothing passes.** Keeping a 320px column to avoid writing a deviation would be keeping a column
because the pattern table has one.

**And a live defect closes with it.** §4B.0's arithmetic: the ledger needs 832px and the main
column gives it 568–704. Without the rail it gets 872–1040 and the sideways scroll — recorded in
`DriverProfilePage`'s own header and in the rider spec §14 A — **stops happening** at every width
and in both languages.

**The gate does not evaporate; it moves to where gates already live.** `standingFlags` is
documented as *"conditions against a captain"* and already admits two payout-derived ones on the
grounds that they *"stop the captain being paid"* — `bankAccountLast4 === null` and
`payout.state === 'failed'`. **`driver.bank.status !== 'Verified'` stops the captain being paid
by the same mechanism and is not there.** That is an inconsistency in a green file and it is a
defect on its own terms, before tabs are considered.

> **Ruled: `standingFlags` gains two flags.** `Bank account is pending verification` and
> `Bank account was rejected`. Neither is red, neither is a badge, both are sentences in the
> `Standing` block's flag list beside the six that already exist.

The consequence is the one that matters: **the payout gate is now stated in the strip, which is
above the tab row, on both surfaces, on every tab, in every state.** The rail was one
implementation of *always visible*; the strip is a better one and it was already there.

**The deviation, named.** §2 cites `DESIGN.md` §6.4's `profile` row — *"Two-column detail: main +
right rail summary, with timeline — §2.2, §3.8."* This page no longer has a right rail. Under the
precedence ladder §2.2 and §3.8 are §1–§5 sections that bind only where §6 adopts them, and §6.4
adopts them for this row, so departing takes a written deviation: **D-CP-12**. **AC-34 is not
breached** — it governs how a rail restacks, and there is no rail to restack. **`PageShell.tsx`
is not edited**; `SingleColumnPage` already ships every slot this needs.

**The reversal path, so this is a decision and not a one-way door.** Restoring the rail is: swap
`SingleColumnPage` back for `DetailPage`, and move the `Payout account` block and
`DriverSupportPresenceCard` out of their tabs into a two-item `rail` array. The two `standingFlags`
entries stay regardless, because they were a defect fix and not a consequence.

### 4B.6 D-CP-13 — Performance becomes figure rows, and D-CP-3 is the reason

**`MetricTile` is refused. Twice, and either reason alone is sufficient.**

**Refusal 1 — the grammar, which is mine.** D-CP-3 ruled, three hours before this amendment, that
the captain's block label is an **ink heading** because a captain profile is a *record dossier*
(`04-customers/customer-detail-no-orders-yet.webp`: `Contact information`, `Default address`,
`Marketing`) and not a *metric band* (`02-orders/orders-list-with-metrics-row.webp`: muted label
over figure). `MetricTile` **is** the metric-band grammar — `MetricTile.tsx:265`, the page
surface renders its label *beneath* the numeral in `text-muted-foreground`. Putting it on this
page would draw the dossier grammar in the strip and the metric-band grammar 400px below it, two
blocks apart. **That is precisely the thing D-CP-3 exists to prevent, so D-CP-3 is not overturned
— it is the ruling that decides this one.** One page, one figure grammar.

**Refusal 2 — the contract, which is the builder's and which I verified.** `MetricTile` takes a
`Metric` (`data/types/metrics.ts:171`), which requires `key`, `subTabId` (`:179`), `category`
(`:184`), `asOf` (`:209`) and a board `asOf` beside it. `/entity/:entityId` resolves with
`subTabId: null` and `workspaceId: null` (`routeState.ts:135`) **by design — the profile belongs
to no workspace**, and `Driver.rating` carries no `asOf`. All four would be fabricated, and
`asOf` is the field whose own header says it exists because *"there is no such field anywhere in
the legacy app"* — inventing a freshness stamp is the one thing it was added to stop. It also
leaks: `subTabId`'s doc says it lets the metrics-library sidebar group and filter without a
second table, so seven fabricated entries would surface there as metrics an operator can add to a
board. **A board metric is a population; this one is a person.**

**What the owner is actually pointing at, and it is not `MetricTile`.** The overview's figures
are **not cards**. `MetricTileRow.tsx`'s header: *"The boxes are gone. A board is now a band and
a set of chapters"*, and `Chapter.tsx:167` ships `PLAIN_FRAME` as
`rounded-none border-0 bg-transparent py-0 shadow-none`. A literal reading of *"cards like in the
overview"* produces **no card at all** — a three-across grid of frameless figures on page ground,
under a ruled section heading. That is exactly what is specified below, and it is worth telling
the owner that the thing they liked has no border.

**Ruled: a figure row is a grid of `SummaryBlock`s on page ground.** The same component the
summary strip renders, with its fill, its border and its dividers absent.

```
Rating                On time              Trips completed
4.6                   94%                  1,284
                                           Last trip 25 Jun 06:40
```

| Property | Ruling |
|---|---|
| Component | **`SummaryBlock` + `BlockFigure` / `BlockWord` / `BlockCaption`.** No new component, no new token, no `globals.css` change |
| Frame | **None.** No fill, no border, no dividers. Page ground, which is what `PLAIN_FRAME` is |
| Padding | the row passes `className="px-0 py-0"`, cancelling `SummaryBlock`'s own `px-4 py-4`, so a figure's inline-start edge is the section's inline-start edge and not 16px inside it. `0` is on any grid; **D-2 is not cited and no type size changes** |
| Grid | **`grid grid-cols-2 gap-x-6 gap-y-6`, at every width.** `gap-x-6` is `FIGURE_GUTTER`'s own 24px, reached by name in prose and by value in the class so nothing imports `metrics/` |
| Why two and not three | The narrowest box a figure row ever gets is **568px** — 1344, Arabic, before the rail was dropped, and 872 after. Three across at 568 leaves 157px of content against the **154px** the rider's Chromium sweep measured for `652.60 SAR` at `--text-kpi-lead`. **3px is not clearance.** Two across leaves 252. `ChapterFigures`' three-across is right for a board whose column is the page; this row's column is a tab panel |
| An odd row's trailing cell | page ground. **§4.2's rule applies unchanged: order beats evenness** |
| `compact` | **no override.** Two columns at every width, which is `DriverStrip`'s own construction and keeps the page to one figure grammar. **AC-CP-06 is not engaged** — it is scoped to the four *summary* blocks, and a figure row is not one |
| Absence | a block with no value renders **no figure and one grey sentence in its place** — `StandingBlock`'s shipped construction. Three different honest sentences, §4B.8 |

**Which of the seven `performanceFields` rows are figures — the line, drawn.** A figure is a
quantity with a unit. A timestamp is not, and a fact already stated in the strip is not.

| Row | Ruling |
|---|---|
| `rating` | figure → **Activity** |
| `onTimePercent` | figure → **Activity** |
| `totalTrips` | figure → **Activity** |
| `lastTripAt` | **not a figure.** A timestamp has nothing to aggregate. It becomes the **caption on `Trips completed`**, which is what a caption is for — a qualifier on the number above it, exactly `MetricTile`'s own caption contract (*"a scope limit, a denominator"*) at the rank `SummaryBlock` already has. A tile row that includes a timestamp because it was in the same card is how a metric board stops meaning anything |
| `tripsInPeriod` | figure → **Earnings**. It is the payout period's count and belongs beside the money it earned |
| `monthEarningsHalalas` | figure → **Earnings**. **Not a duplicate**: `EarningsBlock` states `payableHalalas` and four subordinate lines, and month earnings is none of them |
| `capacity` | **struck.** It renders `4 of 5 slots taken`, which **is** `CapacityBlock` — the strip's fourth cell, on both surfaces, today. Tiling it states one fact twice on one screen, which is the defect `payoutAccountFields` already refuses for the cash debt |

**`performanceFields()` is dissolved and replaced by two builders** — `drivingFigures(driver, t,
language)` and `periodFigures(driver, payout, t, language)` — **both called by both surfaces**,
which is `bandPersonMeta`'s discipline and the reason §3's parity here is structural rather than
test-enforced. **`profile.driver.card.performance` (`Performance`) loses its consumer and is
deleted**; the word survives as nothing, because each figure now names itself.

**AC-CP-04's principle, applied one level up: a card may shed facts; the RECORD may not.** Every
one of the seven has a stated home above. QA scopes its negative assertions to the element, not
to the document (AC-CP-04c's method, reused).

### 4B.7 The `Payout account` block, redrawn — the answer to "thirteen label/value rows"

**Evidence, opened for this section.** `04-customers/customer-detail-no-orders-yet.webp` and
`02-orders/order-detail-paid-fulfilled-gift-card.webp`. Shopify's record rail carries **no
label/value pairs at all**. `Contact information`, `Default address`, `Shipping address` and
`Billing address` are each an **ink sub-heading over a block of unlabelled lines** — a person's
name, a street, a city — because the *shape* of each line names it. The one place Shopify does
use `label … value` rows is the `Paid` card, where the values are a **column of right-aligned
money you scan down and add**. That is the whole rule, and it is the one this page was breaking:

> **A label/value row earns its place when the values form a column of one kind that is read
> down. Six rows whose values are a bank, a person, an IBAN, a badge, a date and a state word are
> six unrelated shapes wearing the same costume.**

```
┌ Payout account ──────────────────────────────────┐
│ ⟨ Pending verification ⟩                          │  StatusBadge, tone warning
│ Al Rajhi Bank                                     │  text-sm  text-foreground  <bdi>
│ Ahmed Salem Al-Qahtani                            │  text-sm  text-foreground  <bdi>
│ SA03 8000 0000 6080 1016 7519                     │  text-sm  tabular  <bdi>
│ Current payout: Scheduled                         │  text-xs  text-muted-foreground
└───────────────────────────────────────────────────┘
```

- **Six rows become one badge, three lines and one caption.** Three ranks — badge, ink block,
  muted caption — which is `SummaryBlock`'s three ranks. One grammar on the page.
- **The badge leads**, because the account's state is the only part of the card that gates
  anything, and `bankStatusBadge` moves with the block unchanged: `Verified` → success,
  `Rejected` → **neutral, never red** (R5a, and `types/driver.ts` reaches the same conclusion for
  a suspension), everything else → warning. R7's five tones, no sixth.
- **§3.5 is honoured, not dropped.** An unlabelled line cannot carry an inline `Not recorded`, so
  absence is named beneath the block by `AbsentLine` — *"Not recorded: Bank, Account holder,
  IBAN"* — from `profile.field.absentMany`, which already exists. **The threshold is one, not
  `splitAbsent`'s three**: in a labelled list one absence is a fact beside its own label, and here
  there is no label for it to sit beside. A captain with no bank renders the heading, the badge
  and one grey line, and nothing is silently missing. **Finding M**: `AbsentLine` is not exported
  from `fields.tsx`; fallback in §11.
- **`Last payout` is struck from this block.** `EarningsBlock` already renders
  `Last paid {date}` / `Never paid` in the strip, on both surfaces. Printed again three inches
  away it is a fact with two homes, which is the exact objection `payoutAccountFields` already
  writes down for the cash debt.
- **Where it goes:** the **end** of the Earnings tab, after `Deductions` and immediately above
  `Open payouts`, on both surfaces. The tab then reads *what you earned → what moved → what came
  off → where it goes → open payouts*, which is one sentence.

**Refused: folding `Elsewhere in the console`'s six `None` rows into one grey line.** Tempting
and wrong. Its nine values are `None` / `3 on record · none open` / `3 on record · 1 open` —
**one shape, scanned down**, which is exactly the case where a label/value list is the right
instrument (the `Paid` card, above). Its own header also rules that `None` and
`3 on record · none open` are *different facts*, and folding the first into a summary line would
make them one. It moves to the Activity tab unchanged. **A refusal recorded, not an oversight.**

### 4B.8 The page, drawn — every tab, every section, in order

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ←  CAPTAIN · DRV-0101                                    band, --ev-hero   │
│    أحمد سالم القحطاني                                                       │
│    ★★★★★ 4.6 │ Riyadh                                                      │
│    Corolla 2022 · White · Economy                                          │
├────────────────────────────────────────────────────────────────────────────┤
│ ⚠ This captain is suspended                              §11.4, 0 or 1     │
├────────────────────────────────────────────────────────────────────────────┤
│ Standing      │ Documents   │ Earnings      │ Subscription slots           │  the strip
│ Under review  │ Expiring    │ 652.60  SAR   │ 1                            │  2×2 below
│ 1 open compl. │ Reg. 19 Jul │ payable       │ 4 of 5 slots taken           │  --ev-bp-wide
│ Bank pending  │ 5 on file   │ Cash debt …   │ ▮▮▮▮▭                        │  4 across above
├────────────────────────────────────────────────────────────────────────────┤
│  Documents 5  │  Earnings  │  Activity 21  │  Identity      TabsList line  │
│ ═════════════                                                              │
└────────────────────────────────────────────────────────────────────────────┘
        the panel — the FULL width of the page block. There is no rail.
```

**`?view=documents` — one section, no heading.**

```
Vehicle registration (Istimara)                                            ⌄
⟨ Expiring ⟩  19 Jul 2026 · 24 days left · Date auto-filled
Licence                                                                    ⌄
⟨ Valid ⟩  12 Mar 2027 · 260 days left
…
Open compliance file
```

**`?view=earnings` — five sections.**

```
Earnings this month          Trips this period            ← figure row, 2 across
2,840.00  SAR                28

Payable movements                       2 postings · 1–30 Jun 2026
A credit is money earned. A debit is money paid out or deducted.   ← §7's caption
Date │ Reference │ Description │ Debit (SAR) │ Credit (SAR) │ Balance (SAR)
…

Deductions
…

Payout account
⟨ Pending verification ⟩
Al Rajhi Bank
Ahmed Salem Al-Qahtani
SA03 8000 0000 6080 1016 7519
Current payout: Scheduled

Open payouts
```

**`?view=activity` — three sections.**

```
Rating          On time          Trips completed          ← figure row, 2 across,
4.6             94%              1,284                       so this wraps 2 + 1
                                 Last trip 25 Jun 06:40

(the timeline — no heading; the tab is its heading)
…
Showing 6 of 21.

Elsewhere in the console
Complaints        1 on record · 1 open
Conversations     None
…
```

**`?view=identity` — two sections.**

```
Identity                                        ← SectionHeading
Status      Phone           Email               ← FieldList layout="grid" → FactGrid,
Active      +966 …          ahmed@…                auto-fit at --fact-col 11rem:
Gender      City            Address                one column in a 320px rail,
Male        Riyadh          …                      THREE in a 944px panel
Tier        Driving since
Gold        Feb 2025

Device                                          ← SectionHeading
Device          App language    Last IP         IP location
iPhone 14       Arabic          …               Riyadh
```

**The rule that decides every heading above, stated once: no section on a tab repeats the tab's
own name.** `Documents` and the timeline lose the `SectionHeading` they carry today, because the
tab already says the word. Everything that is a *second* section on its tab keeps one. A figure
row never takes a section heading — its blocks carry their own (D-CP-3), which is that ruling
paying for itself.

**Section spacing is unchanged**: `flex flex-col gap-8` inside a `TabsContent`, `gap-5` between
the tab row and the panel (`gap-5` is §1.2's *"a different kind of thing starts here"* step).
Re-tuning a value the owner did not complain about is scope this spec declines.

**The tab row.** `TabsList variant="line"` — the same variant the sheet ships, and **not**
`segmented`: `segmented` is `IndexToolbar`'s view-tab dress and these are not views over a
dataset. `w-full justify-start h-auto flex-wrap`, triggers `flex-none`. `h-auto` + `flex-wrap` is
`ZonesMapView.tsx:1249`'s precedent. Counts: `Documents` and `Activity` only — the sheet's rule
is unchanged and its reasoning holds (`Earnings` holds two overlapping collections; `Identity` is
pairs, not records). **`TabCount` and the count derivation move into `facts.tsx` as
`tabCounts(reads, t, nowIso)` and are called by both surfaces**, so the two cannot print
different numbers for one file.

### 4B.9 The four states, per tab

Each tab's sections keep the states they already own (§9.2 #14 — a failed read fails its own
section). What is new is the **tab row's** own behaviour, and it is the part a build gets wrong.

| State | The tab row | The panel |
|---|---|---|
| **Loading** | renders **in full, immediately**, from the URL. A count whose read is in flight renders `Skeleton className="h-4 w-5"` — never a `0`, which is indistinguishable from a real zero (the sheet's shipped rule) | the panel's own section skeletons. Never a spinner (§11.3) |
| **Content** | four triggers, one `data-active` | §4B.8 |
| **Error — the RECORD failed** | renders **in full and stays operable.** The band, the strip's per-block errors and the tab row are all reachable; the panel carries `ErrorState scope="card"` with `Try again`. **The tab row is never replaced by an error** — an operator whose ledger read failed must still be able to reach Documents | `ErrorState` in the panel |
| **Error — one section failed** | untouched | that section only |
| **Empty** | untouched. **A tab is never hidden because it is empty**, and a count of `0` renders as `0` | the section's own empty. R8: card- and section-scoped empties are one grey sentence, no illustration; the ledger's three empties are §9A.2 and unchanged |

**`?view=` with a value that is not one of the four**: the `documents` panel renders, the tab row
shows `Documents` active, and the URL keeps the bad value. **Not a 404, not an empty page, and
not a rewrite** — AC-12's own posture.

### 4B.10 Interaction and keyboard

| | |
|---|---|
| **Clickable, and nothing else is** | each tab trigger; each document row; `Open compliance file`; `Open payouts`; the return control; every link inside a section. **The strip's cells are not** (§4B.1). **A figure block is not** — there is no `OpenAnalysis` and no drilldown, because a captain's rating has no board to open |
| **`Tab`** | return control → (band) → strip's own controls, of which there are none → **the tab row, which is ONE tab stop** (Radix roving tabindex) → into the active panel → on. The tab row is not four stops |
| **`←` / `→`** | move between triggers and **activate**. Radix's default for a horizontal `Tabs`, and correct here: activation is a navigation and there is nothing to commit |
| **`←` / `→` under `dir="rtl"`** | reverse with the document. Radix reads `dir` off the root; the shell already sets it. **Do not hard-code a direction** |
| **`Home` / `End`** | first / last trigger |
| **`Escape`** | unchanged on the page: it collapses an expanded document row and does nothing else. **The page has no dismiss**, so `Escape` never leaves it |
| **Browser Back** | steps tab by tab, then to whatever preceded the page. The return control is the guaranteed exit and does not depend on history depth |
| **Focus after a tab change** | stays on the trigger. **The panel is not focused and is not scrolled to** — `aria-controls` plus Radix's `tabindex="0"` on the panel makes the next `Tab` reach it, which is the standard and the one a screen reader announces |
| **Reload** | lands on the same tab. That is the whole point of D-CP-10 |

### 4B.11 Arabic — the delta this amendment adds

§9 governs in full. Four clauses are new:

1. **The tab row mirrors as a row**: `Documents` is at the inline-**start** in both directions,
   and the count chip sits at each trigger's inline-end. `TabsList` is a logical flex row and
   needs no rule. **A `justify-left`, an `ml-` or a `text-left` on it is a defect on arrival.**
2. **The tab row does not overflow at 1280 in Arabic, and the arithmetic says why.** Content
   region = 1280 − `--ev-rail-w` 88 − `--ev-subnav-w` 256 = 936; less 2 × `--ev-page-pad` 32 =
   **872px** for four labels and two count chips. The sheet's overflow was 367px wanted in 287 —
   a 480px drawer, which is a different surface with a different constraint (**AC-CP-14** still
   governs it). `flex-wrap` is specified as the behaviour of last resort so that a longer future
   label wraps rather than clipping or scrolling; **AC-CP-79 asserts no descendant scrolls
   horizontally** in both languages at 1280 and 1440.
3. **A figure row's grid** is row-major and follows the document, so `Rating` is the inline-start
   cell of row 1 in both directions with no rule. **No dividers**, so there is no inline-axis
   border to get wrong.
4. **The payout block's three unlabelled lines are each `<bdi>`.** A bank name, a Latin personal
   name and an IBAN inside an Arabic paragraph all reorder otherwise — `SA03 8000 0000` is a run
   whose internal spaces are bidi-neutral, which is AC-73's own fourth example. The IBAN takes
   `tabular-nums` and does **not** flip (R4).

Digits stay Western `0–9`. Money keeps `SAR` trailing. The ledger's three money columns keep
`text-end` in both directions (R4).

### 4B.12 What I refused, and why

| Refused | Why |
|---|---|
| `MetricTile` / `MetricTileRow` / `BoardHero` for Performance | §4B.6. **Two independent refusals**: D-CP-3's grammar, and a `Metric` contract that would need `subTabId`, `category` and a fabricated `asOf` on a route whose `subTabId` is `null` by design |
| Overturning **D-CP-3** | It is the ruling that decides §4B.6 rather than the obstacle to it. Overturning it would put the metric-band grammar back on a page whose summary strip is a dossier |
| `?tab=` as a new parameter | `?view=` exists, has one writer, is read by `routeState.ts` on this exact route, and has seven consumers. A second parameter meaning the same thing is a synonym, and §9A.1 already rules that *"a synonym is worse than the thing it replaces"* |
| A URL parameter for the **sheet's** tab | §4B.4. The index owns `?view` beneath it, and a fifth key would be a new obligation on `withOverlay` |
| Making the strip's cells navigate to their tabs | §4B.1. Two of four have no destination, and `EarningsBlock` and `CapacityBlock` hold a badge and a meter |
| Keeping the rail with only `Payout account` in it | A 320px column holding one card is a column kept for the pattern table's sake, and it costs the ledger 240px it needs |
| A fifth tab for `Deductions` or for `Payout account` | A tab per section is a table of contents. Four is what the record supports |
| Different tab names from the sheet's | §4B.3. It would mint eight strings for facts that have names and break an operator's position on a documented round trip |
| Folding `Elsewhere in the console`'s `None` rows | §4B.7. One value shape scanned down a column is where a label/value list is the right instrument, and its own header rules `None` a distinct fact |
| Tighter type or spacing anywhere in this amendment | **D-2 is retired.** Every value here is on the 4px grid or is `0`. **AC-CP-56 fails an implementation that cites D-2** |
| Any new colour, token, tone or `globals.css` change | R5a, R7, and §4's constraint unchanged |

### 4B.13 The cost of this amendment, named

1. **The captain page is no longer a two-column detail page**, which is a departure from §6.4's
   `profile` row written as **D-CP-12**. A reader who knows the pattern table will not find this
   page in it. The reversal path is two lines and is written in §4B.5.
2. **Three green surfaces change.** `DriverProfilePage` is rebuilt around `SingleColumnPage`;
   `DriverPanels` loses two groups from `Identity` and gains two figure rows; `facts.tsx` loses
   `performanceFields` and gains three builders. The band, the strip and the document row —
   named in the brief as built and green — are **untouched**, except that `DriverDocuments`'
   meta line gains one conditional run (§6.2a) and `standingFlags` gains two entries.
3. **The two surfaces now differ on addressability**, which is a new axis §3 did not previously
   have to arbitrate. It is ruled in §4B.4 rather than left to be discovered, and a third entity
   type will have to be told which side it is on — the same gap §4.8 item 2 already records, now
   with a second dimension. **Finding N.**
4. **An operator's sheet tab is lost on `Open full profile`.** Named in §4B.4, fixable in one
   prop, deliberately not fixed here because the fix is in a file this spec does not own.
5. **Four tabs mean four places a fact can hide.** The mitigation is that the strip and the band
   — the gates — are outside the tabs by ruling, and that no tab is ever hidden or disabled.

---

## 5. The Documents panel at drawer width

The owner's screenshot shows two defects on the sheet's Documents tab at 480. Both are here.

### 5.1 Why it wraps — the arithmetic

At 480 the tab column is **288px** (480, less the rail's 160 under D-CP-4's old arrangement,
less `p-4`). One row must hold:

| Part | Width |
|---|---|
| `Vehicle registration (Istimara)` — `text-sm` 14px, 31 chars | ~217 |
| `StatusBadge` `Expiring` — `text-2xs` 12px + padding | ~62 |
| `19 Jul 2026` — `text-xs` 13px tabular | ~77 |
| ` · ` | ~10 |
| `24 days left` | ~78 |
| `gap-x-3` + `gap-3` | 24 |
| **total** | **~468 in 288** |

`flex-wrap` then splits it, and because the wrapper is `justify-between` the second line lands
at the **inline-end** — an orphan group aligned to the opposite edge from the label above it.
That is why it reads as two list items rather than as one. **The wrap is the symptom; the
inline-end orphan is the defect.**

D-CP-4 takes the tab column to **448px** (480 less `p-4`). 468 still exceeds it, and the
disclosure caret §6 adds ~28 more. **One line is not available at 480 and widening is refused.**
So the row is two lines by design, and the job is to make two lines read as one item.

*(Figures computed from the token values — `--text-sm` 14, `--text-xs` 13, `--text-2xs` 12 —
not measured in a browser. The sweep AC-RP-70b prescribes must be re-run on this surface;
that is AC-CP-13.)*

### 5.2 The row, drawn

```
┌─────────────────────────────────────────────────────────────────┐  the row is ONE control
│ Vehicle registration (Istimara)                              ⌄  │  line 1: label + caret
│ ⟨ Expiring ⟩  19 Jul 2026 · 24 days left                        │  line 2: state, then when
└─────────────────────────────────────────────────────────────────┘
  ▲ inline-start                                     inline-end ▲
   py-2 outer · gap-y-0.5 inner  →  8px between rows, 2px inside one
```

Four changes, each doing a distinct part of the work:

1. **The row is a single `<button>`** with `aria-expanded` and `aria-controls` (§6). Today it
   is inert markup, so nothing binds its two lines. One control gives them one hover ground,
   one focus ring and one accessible name — which is the largest single fix and costs nothing.
2. **`flex-wrap` and `justify-between` are gone.** Line 2 is an explicit sibling that starts at
   the **inline-start**, flush under the label. A subordinate line under its own heading reads
   as subordinate; a subordinate line at the opposite edge reads as a peer.
3. **The proximity ratio inverts.** Outer `py-2` (8px) against inner `gap-y-0.5` (2px) — 4 : 1.
   Today it is `py-2` against `gap-y-1`, which is 2 : 1 and far too close to read as grouping.
   Both values are on the 4px and 2px steps of the shipped scale; **nothing here is off-grid
   and D-2 is not cited.**
4. **The badge leads line 2.** It moves from a floating position determined by the countdown's
   width to the **inline-start of the meta line**, where all five badges align in a true
   column. That is better scanning than today, not a concession — and it is `home-guide-side-
   panel-in-progress.webp`'s construction, where a ~370px drawer puts each row's state at the
   row's inline-start.

**It fits.** Line 1: 217 + caret 16 + gap 12 = **245 in 448**. Line 2: 62 + 8 + 77 + 10 + 78 =
**235 in 448**. Both clear with ~200px of slack, which is the headroom Arabic needs — Naskh
sets wider and `globals.css` lifts the type floors by 4 under `:root:lang(ar)`.

**One composition, both surfaces.** At the page's ~696–912px main column the row has more air
and stays two lines. Refusing a second, wider composition is §4.7's fourth row.

**Every other rule already satisfied by the shipped row is kept**: the date and the countdown
stay two `<bdi>` runs with an `aria-hidden` `·` between them (never one joined string, §9.6);
`tabular-nums` on both; `formatDate(style: 'day-month-year')`; the tone from
`people/domain.ts`'s `DOC_STATE`, with `critical` and `expiring` sharing **one warning tone**
and differing by label only (R17).

### 5.3 The list's own link

```
│ ⟨ Valid ⟩  15 Jan 2027 · 204 days left                          │   ← last row
├─────────────────────────────────────────────────────────────────┤   ← the divide-y hairline
│ Open compliance file                                            │   ← link, inline-start
└─────────────────────────────────────────────────────────────────┘
```

- `variant="link"`, **inline-start**, inside the list block, directly under the last row —
  D-CP-6. Separated by the list's own `divide-y` hairline, not by a `gap-3` void.
- §11.2 is unchanged: refused, it is a **disabled control in place** with
  `Opening the compliance file needs the operations permission.` as real text beside it,
  `aria-describedby`-linked. Never hidden, never a tooltip. `NavigateControl`'s refused branch
  changes only its alignment (`items-start`).
- **No `↗`.** §9.5 reserves it for external links; this navigates in place. The one place `↗`
  *is* correct on this screen is §6.2's file tile, which opens a file outside the app.

### 5.4 The list's four states — unchanged, restated so nothing is dropped in the rebuild

| State | Rendering | Copy |
|---|---|---|
| **Loading** | `SectionSkeleton rows={5}` — five two-line row skeletons, shaped like the new row. Never a spinner (§11.3) | — |
| **Error** | `ErrorState scope="card" card={false}` with `Try again` | `Couldn't load documents. Try again.` |
| **Empty — no file** (`complianceState` `'no-file'`) | `EmptyState kind="no-match" card={false}`. One grey sentence, no illustration (R8) | `No documents on file` |
| **Empty — file exists, holds nothing** (`rows.length === 0`) | the same, different sentence | `No documents are on file for this captain.` |
| **Content** | §5.2 | — |

The two empties are two different facts and stay two sentences — conflating them is the V-2
defect (`states.md`). **`Open compliance file` renders in all five**, because it is how an
operator reaches the file that is missing.

---

## 6. Viewing a document

### 6.1 The ruling — expansion in place, one at a time, on both surfaces

**A document viewer cannot be a dialog.** §5.5: *"MUST NOT nest a modal inside a drawer."*
The sheet is a drawer again (rider spec §6.1), so that clause is in force — it is the same
constraint that already stopped the suspend and pay controls from shipping (`DriverFooter`).

**And the page cannot solve it differently.** A viewer that is a dialog on the page and
something else on the sheet is two mechanisms for one job, which is precisely the divergence
§3 exists to refuse. So whatever works on the sheet is what ships on both.

Three candidates, ruled:

| Candidate | Ruling |
|---|---|
| **Inline expansion on the row** | **Ruled in.** §4.7's sanctioned accordion — *"expanding one reveals rich body content and collapses the siblings"*. It is what D-RP-4 already established as this drawer's disclosure mechanism. Precedent: `01-home/home-guide-side-panel-in-progress.webp` |
| A dedicated route, `…/documents/:docType` | **Refused.** Navigating changes the route, which closes the sheet — a drawer exists to be consulted *against* the page behind it (§5.5), and a control inside it that dismisses it is a category error |
| A second drawer over the first | **Refused.** `DESIGN.md` :4114 tolerates a nested surface only with double-`Escape` handling, `ShellLayer` has no stacking model, and a 480px drawer over a 480px drawer at 1280 leaves the workspace unreadable — the one thing a drawer promises |

**One at a time.** Opening a row collapses the open one. §4.7 and §5.6 both observe this
(*"collapses the siblings"*, *"only one group is open at a time"*), and at 480 five expanded
rows bury the list they belong to.

### 6.2 What an opened row shows

```
┌─────────────────────────────────────────────────────────────────┐
│ Vehicle registration (Istimara)                              ⌃  │
│ ⟨ Expiring ⟩  19 Jul 2026 · 24 days left                        │
│  ┌───────────────────────────────────────────────────────────┐  │   ← the scan record
│  │ ▤  istimara-DRV-0101.pdf                                  │  │
│  │    PDF · 240 KB                                           │  │
│  │    Uploaded 4 Jun 2026 by Layla Al-Otaibi                 │  │
│  └───────────────────────────────────────────────────────────┘  │
│  Only the scan's details are stored, not the file itself.       │   ← §6.5, branch 2
│  Marked expiring because 30 days or fewer remain.               │   ← the derivation
└─────────────────────────────────────────────────────────────────┘
```

Two things, in this order, and **both always render** — an expansion that can be empty is a
broken affordance, and the second one guarantees it never is.

**(a) The file slot.** §6.3–§6.5.

**(b) The derivation sentence.** `ComplianceDocState` is a *derived* value: `types/driver.ts`
records the boundaries — `< 0` expired, `≤ 7` critical, `≤ 30` expiring, else valid — and puts
the bucket on the wire so three screens cannot reach three answers. **§8.2 requires a derived
value to state its derivation**, and today the boundary is invisible on every surface that
prints the word. Four sentences, one per state, four keys, none built by concatenation (§9.6):

| State | Sentence |
|---|---|
| `valid` | `Marked valid because more than 30 days remain.` |
| `expiring` | `Marked expiring because 30 days or fewer remain.` |
| `critical` | `Marked expiring soon because 7 days or fewer remain.` |
| `expired` | `Marked expired because the date has passed.` |

This is not filler, and it is no longer hypothetical. `docs/01-modules/10d-compliance.md` §11
records a third, undocumented 14-day urgency band in the legacy risk score, and **the data
agent has now measured it: 8 seeded documents sit between 8 and 14 days out — `Expiring` on
Compliance and `at-risk` in `driverRiskScore` — with no label distinguishing them. Two are on
named captains.** So the console currently buckets the same document two ways and says so
nowhere.

**Ruled for this surface: the expansion prints Compliance's boundaries — 7 and 30 — and
nothing else.** `ComplianceDocState` is the field on the wire, `types/driver.ts` fixes its
edges, and this screen renders the field it is given. It does **not** print the risk score's
band, does not reconcile the two, and does not hedge the sentence to cover both — a sentence
that covered both would be the contradiction laundered into copy.

**A second bucketing exists elsewhere, pending a product ruling** (does the risk score adopt
7/30, or does Compliance grow a fourth band?). That is finding I, for product-owner. Until it
lands, this expansion is the one place in the console where the boundary is stated out loud,
which is exactly what makes the disagreement findable rather than folklore. **If the ruling
adds a fourth band, this sentence gains a fifth variant and nothing else on the screen
changes** — which is the test of whether the copy was written at the right altitude.

**What is deliberately *not* in the expansion:** the expiry date and the state word, again.
They are on line 2, two pixels above. An expansion that restates its own trigger teaches the
operator that expanding is pointless.

### 6.2a AMENDED — the expansion leads with PROVENANCE, and `auto-default` reaches the row

**The build was right and my §6.2 was short by the most important thing on the record.**
`ComplianceDoc` carries four fields modelled for this viewer and rendered on none of it:
`dateSource`, `recordedAt`, `recordedByUserName`, `previousExpiresOn`. `types/driver.ts` says of
the first, in as many words, *"this is the field the viewer is for"*, and it is right: §6.2's own
preamble names the expansion's question as *"can I trust this date, and is there anything behind
it"*. **The file slot answers the second half. Nothing answered the first.**

The operational fact, measured by the data agent: **two seeded documents carry `auto-default` —
nobody ever read the paper, `approveDriver` filled a blank one year out — and both render green
`Valid` in the same ink as four dates read off a document.**

**Ruled: the expansion has three parts, in this order, and the derivation goes last.**

```
┌─────────────────────────────────────────────────────────────────┐
│ Vehicle registration (Istimara)                              ⌃  │
│ ⟨ Expiring ⟩  19 Jul 2026 · 24 days left                        │
│  Entered in Compliance by Layla Al-Otaibi, 4 Jun 2026.          │  ← 1 provenance
│  Replaced an expiry of 19 Jul 2025.                             │  ← 1a, conditional
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ ▤  istimara-DRV-0101.pdf                                  │  │  ← 2 the file slot
│  │    PDF · 240 KB                                           │  │
│  │    Uploaded 4 Jun 2026 by Layla Al-Otaibi                 │  │
│  └───────────────────────────────────────────────────────────┘  │
│  Only the scan's details are stored, not the file itself.       │
│  Marked expiring because 30 days or fewer remain.               │  ← 3 the derivation
└─────────────────────────────────────────────────────────────────┘
```

**Why provenance leads and the derivation trails.** The derivation is computable from the
collapsed row — an operator who knows the 7/30 boundaries can derive `Expiring` from
`24 days left` without expanding anything. Provenance is not derivable from anything on screen.
The expansion should open with the fact the row cannot state.

**1 — the provenance line. Three variants, one per `dateSource`, never concatenated (§9.6).**

| `dateSource` | Sentence | Params |
|---|---|---|
| `application-review` | `Entered on the application by {name}, {date}.` | 2 |
| `ops-entry` | `Entered in Compliance by {name}, {date}.` | 2 |
| `auto-default` | `No document was read. The system set this date at approval on {date}.` | **1** |

- **The `auto-default` branch has no `{name}` slot, and that is the type doing the design.**
  `recordedByUserName` is `null` **exactly when** `dateSource === 'auto-default'` — the invariant
  is stated on the field and is bidirectional — so a `{name}` there could only render `Unknown`,
  which §8.3.1 and `states.md` both forbid. **`Unknown`, `Anonymous` and `—` appear nowhere in
  this line.**
- `{date}` is `recordedAt` at `style: 'day-month-year'`. **The time is dropped deliberately**: the
  clock-minute of a data entry is noise, and a `day-month-time` here would sit two lines above a
  `day-month-year` expiry and read as two precisions of one fact.
- **`recordedAt` is not `expiresOn` and is not `file.uploadedAt`.** Three different instants, and
  a row can carry all three legitimately — a scan uploaded in June for a card expiring in July,
  recorded by ops in May.

**1a — the replacement line, only when `previousExpiresOn !== null`.**

> `Replaced an expiry of {date}.`

It answers *"was this date just corrected, and what did it say before"*, which the type names as
the second question an operator asks when a suspension lifts the moment somebody edits a field.
**One step back, never a log** — the full history is `clients/audit.ts`'s and duplicating it here
would put one event on two surfaces that can drift.

**2 — `auto-default` is a different RANK, not a third variant.**

> **Ruled: the `auto-default` sentence renders `text-xs text-foreground`. The other two render
> `text-xs text-muted-foreground`.**

One ink sentence in a panel of grey ones is the loudest thing in the panel and it costs no token,
no tone and no colour. This is D-CP-3's own lever — rank by ink, not by hue — applied one level
down.

**3 — and it reaches the COLLAPSED row, because a fact that requires expanding is a fact nobody
finds.**

> Line 2 gains a third run, **only when `dateSource === 'auto-default'`**:
> `⟨ Expiring ⟩  19 Jul 2026 · 24 days left · Date auto-filled`

| | |
|---|---|
| Copy | **`Date auto-filled`** — a fragment, no period (R6). Not `Date not verified`, which implies a verification workflow this console does not have and collides with the bank account's `Pending verification`. Not `No document read`, which an operator can misread as *no scan on file* — the opposite fact, and one this row also states |
| Rank | `text-xs text-foreground` beside the meta run's `text-muted-foreground`. **The word carries it; the ink is the redundancy** (§7.5) |
| Not a badge | R7 gives five tones and the row already wears one. **A second badge on this row is refused**: two badges is a contradiction the operator has to resolve (`Valid` beside a warning), and §5.1's arithmetic has no room — line 2 is 235px of 448 and a badge is ~62 more against a wrapped run |
| Not a state change | **`ComplianceDocState` is untouched.** §6.2's ruling stands: this screen renders the field it is given. An `auto-default` `Valid` still says `Valid`, and the new run is a statement about the *date's* provenance, not about the document's state |
| It renders in **all four** states | The dangerous case is exactly `auto-default` + `Valid` — a captain whose operating card "expires" 364 days after approval because nobody looked at it |
| Construction | a third `<bdi>`-free `<span>` after an `aria-hidden` `·`, inside the existing meta line. **Never a joined string** (§9.6, AC-73) |
| The row still fits | 235 + separator ~10 + `Date auto-filled` ~92 = **~337 in 448**, and the row is already permitted two lines. AC-CP-23's "exactly two lines" is amended by AC-CP-72 for this one branch |

**What this costs.** `DriverDocuments.tsx` — named in the brief as built and green — takes one
conditional run on line 2 and one new block in the panel. That is the whole change and it is in a
file this spec governs. **The alternative was leaving four modelled fields rendered nowhere,
which is how a year later somebody asks why the data has them.**

### 6.3 Is opening a document a permission-gated act?

**Two answers, because there are two acts.**

- **Expanding a row is never gated.** It reveals the state's derivation and the file's presence
  or absence — nothing an operator cannot already read in the collapsed row. Gating a
  disclosure that discloses nothing new is chrome pretending to be security.
- **Opening the scan is gated**, by **`view_operations`** — the same permission that gates the
  Compliance route, which is where the same scan lives. A scan is a photograph of a government
  identity document; "the licence expires 12 Mar 2027" is not. They are different disclosures
  and the second one gets the gate.

**No new permission is minted here.** Whether captain documents deserve a permission of their
own is a product question, and it is raised in §11 rather than answered.

**The gate attaches to the bytes, not to the metadata.** A filename, a size and an uploader are
administrative facts about a record; a scan is a photograph of a government identity document.
So the **scan record** of §6.5 branch 2 renders for every operator who can open the profile,
and `canOpenCompliance` is **not consulted in the expansion at all**.

**§11.2 governs the refusal when there is something to refuse:** the tile renders **in place,
disabled**, with its reason as real text beneath it, `aria-describedby`-linked. Never hidden —
an operator who cannot see the tile cannot tell a permission from an absent file, and those are
opposite facts.

> `Viewing a captain's documents needs the operations permission.`

Same construction and same cadence as the two shipped refusals
(`Opening the compliance file needs the operations permission.`), so an operator refused twice
on one screen is refused in one voice (CM-3).

**Do not build that branch yet.** With no `href` on the record (§6.5) there is nothing to
withhold, so the refusal is unreachable — and an unreachable state is untestable, which means
it rots. §11.2 governs a control the operator *may not* use; it does not require inventing one
so it can be disabled. **The ruling above is the standing rule for the day `href` ships**, kept
whole rather than deleted, in the same way the rider spec §12.5 keeps confirmation copy for the
first control that commits.

### 6.4 When there is no file — the honest absence

`ComplianceDoc` is `{type, expiresOn, state}` today and may stay that way. **Design for the
absence first; it is the case that certainly exists.**

> `No scan is stored for this document.`

- One grey sentence, `text-xs text-muted-foreground`, in the file slot's place. **No tile
  outline, no glyph, no placeholder image.** A fabricated scan is worse than an honest absence,
  and a greyed tile shape implies a file is loading or was refused — two different claims,
  both false.
- **No em dash.** §8.3.1 reserves `—` for not-applicable-or-unknown, and `states.md` is
  explicit that a dash is *"a claim that the number exists somewhere"*. This is a claim that it
  does not.
- **It says "stored", not "uploaded" and not "available".** "Uploaded" asserts a workflow this
  console does not describe; "available" asserts the scan exists and cannot be reached. The
  record has no scan on it. That is all we know and all we say.
- **The row is still expandable, and the derivation sentence still renders.** The expansion
  never has nothing in it.
- **If the field never ships**, this sentence is what every expanded row shows, permanently,
  and the design is complete without it. The viewer degrades to *"why does this say Expiring,
  and where is the paper"* — which is still more than the surface answers today.

### 6.5 When there is a file — and the third state, which is the one that ships

**`href` was refused, and the refusal is correct.** I specified a URL; there are no bytes
anywhere in this product, so a URL could only point at a fabricated scan — which §6.4 forbids
— or at nothing, which reads as a broken console rather than as an absent file. *"Do not seed a
stock document image"* and *"do not link to one"* are the same rule one layer apart: a link to a
fabricated image is a fabricated image with an extra click. **The field is struck.**

So there are **three** file states, not two, and the middle one is what actually ships:

```ts
export interface ComplianceDocFile {          // AS SHIPPED — the build's shape, not my sketch
  /** Display name, as uploaded. Never a path, never a URL. */
  name: string
  /** The WIRE fact. The four visible letters are `COMPLIANCE_DOC_FILE_KIND[mimeType]`. */
  mimeType: 'image/jpeg' | 'image/png' | 'application/pdf'
  /** Bytes, an integer. Formatted at the edge exactly as halalas are (§8.3). */
  sizeBytes: number
  uploadedAt: IsoDate
  uploadedByUserId: string | null
  /** Always a name — the captain's own when `uploadedByUserId` is `null`. */
  uploadedByUserName: string
}

// on ComplianceDoc:
//   file: ComplianceDocFile | null   ← null is a VALUE, not a gap
```

**Two corrections to my sketch, both the build's and both better.** `mimeType` as the wire fact
with a `Record`-keyed label map means the four letters have one spelling and a fourth media type
fails to compile — where my free-text `kind: string` would have let two screens disagree. And
`uploadedByUserName` is **not nullable**: where `uploadedByUserId` is `null` the captain sent it
from the driver app and the name is their own, which is the same actor vocabulary
`LegAcknowledgement` already uses. **There is no anonymous upload, so §8.1's second sentence for
one is struck.**

| # | Condition | What renders |
|---|---|---|
| **1** | `file === null` — no scan was ever taken | §6.4's one grey sentence. **No tile.** |
| **2** | `file !== null`, no way to open it — **today, all 68 seeded documents** | the **scan record** below, plus one line saying the file is not stored |
| **3** | `file !== null` and a file read exists | the same block, as a link. §6.6 |

**Branch 2 — the scan record.** Built from
`02-orders/order-detail-timeline-comment-with-attachment.webp`'s `products.csv` construction:

```
┌───────────────────────────────────────────────────┐   rounded-lg border border-border
│ ▤  istimara-DRV-0101.pdf                          │   text-sm, <bdi>
│    PDF · 240 KB                                   │   text-xs muted
│    Uploaded 4 Jun 2026 by Layla Al-Otaibi         │   text-xs muted
└───────────────────────────────────────────────────┘
Only the scan's details are stored, not the file itself.
```

- **It is a record, not a broken viewer, and the design says so by being informative.** *"This
  registration expires in 24 days and the last scan we hold was uploaded eight months ago by
  Layla"* is a real compliance fact an operator can act on. The block earns its border by
  carrying four facts, not by standing in for a control.
- **Nothing about it suggests it opens.** No `↗`, no chevron, no underline, no hover fill, no
  focus ring, no pointer cursor. It is not in the tab order. An inert thing that *looks*
  clickable is worse than either honest alternative.
- **The upload line is always one sentence with two named params** — `Uploaded {date} by
  {name}`. There is no anonymous branch, because there is no anonymous upload. **`Unknown`,
  `Anonymous` and `—` appear nowhere in it**: §8.3.1 reserves `—` for not-applicable, and
  `states.md` is explicit that it claims the value exists somewhere.
- **The kind and the size are two `<bdi>` nodes with an `aria-hidden` separator**, not a
  `{kind} · {size}` key. Same construction as §5.2's date-and-countdown line, and the reason
  §8.1's `fileMeta` is struck.
- **`uploadedAt` is when the SCAN arrived, and it is not `expiresOn`.** They differ on real
  rows — `DRV-0104`'s inspection is expired and its scan was uploaded for the year it covered.
  A tile that names a file without saying when it arrived invites an operator to read a lapsed
  certificate as a current one.
- **The sentence beneath is scoped to this branch and therefore cannot outlive its truth.** It
  renders only while `file !== null` and there is no way to open it; the day a file read ships,
  branch 3 renders instead and the sentence is gone. That is why it may state the fact plainly
  rather than hedging about the future.
- **No pointer to `Open compliance file`.** That route cannot show the scan either, and a
  pointer that dead-ends costs an operator more than silence does. If Compliance later gains
  the file, the pointer belongs there and this line is replaced by branch 3.
- **`Only the scan's details are stored, not the file itself.`** — one sentence, no ellipsis in
  the second clause, so it survives translation. It does not say the file cannot exist, does
  not blame, and does not send anyone anywhere.

**Branch 3, for the day it exists.** The same block becomes an `<a target="_blank"
rel="noopener">` with `↗` at the inline-end, the sentence disappears, §6.3's permission branch
becomes reachable, and the file read's four states (skeleton / scoped error with `Try again` /
§6.4's absence / the link) come with it. **The scan is still never rendered inline as an
image**: an identity document at 448px is unreadable, and an inline render leaks a government
ID to anyone glancing at the operator's screen with no deliberate act in between.

**`file: null` is the honest absence and stays a value, not a gap** — the same discipline
`worstState: null` already carries, which `types/driver.ts` calls *"the most dangerous possible
default"* when defaulted. Defaulting a missing scan to a placeholder is that mistake with a
picture on it.

### 6.5a OWNER AMENDMENT 3 — the scan is previewed, opened and downloaded

> *"for the documents I want here to see a preview of the documents, and be able to open a
> popup or download that document to inspect"*

Three asks — a preview, a popup, a download — against one prohibition: **`DESIGN.md`:3134,
*"MUST NOT nest a modal inside a drawer."*** The captain sheet is a drawer
(`ProfileLayer` is `presentation="drawer"`, `--ev-drawer-w` 480). The captain page is not.
So "open a popup" cannot mean the same thing on both surfaces — and §3's one-content-contract
does not permit dropping the capability on the sheet either.

#### 6.5a.0 The vocabulary, fixed before the ruling

Every string below obeys it, and the shipped copy does not.

> **A *document* is the compliance record** — its type, its expiry, its state, its provenance.
> **A *scan* is the uploaded file.** The nouns are never swapped.

This is not pedantry. `profile.driver.refusal.viewDocument` currently reads
*"Viewing a captain's **documents** needs the operations permission"* over a list whose
expansion §6.3 and AC-CP-40 deliberately **never** gate. It refuses the wrong object, and an
operator reading it concludes the list was withheld. §8.2a corrects it.

#### 6.5a.1 THE RULING — the inspection is a new browser tab, on both surfaces

> **`Open scan ↗` hands the bytes to the browser. It opens no overlay, on either surface, so
> §5.5's prohibition is never engaged — not deviated from, not worked around, not argued
> past.** One mechanism, one code path, one QA path, identical on the page and in the sheet.

Mechanically: the client seam fetches the bytes (a separately-permitted read keyed by the
document id — finding Q), the app makes an object URL, and the control opens it in a new tab.
The refusal and the failure are diagnosed **in the console, before the tab exists** — which is
the whole reason the fetch goes through the seam instead of pointing an anchor at a raw API
URL. A browser tab rendering a JSON `403` is not a refusal an operator can act on.

**This is not a new invention. §6.5 branch 3 already specified it** — *"an `<a target="_blank"
rel="noopener">` with `↗` at the inline-end"* — written before the owner asked. What changes
is that branch 3 is now the branch that ships, and that a preview joins it.

**The four candidates, and what each costs.** The brief asked for costs rather than a winner,
so the winner's cost is first.

| Candidate | Cost |
|---|---|
| **New browser tab, both surfaces — RULED IN** | The operator leaves the console's chrome. No Eyvar frame around the scan, no captain name beside it, no in-app way back — the browser's tab strip is the only return path. **We cannot instrument what happens to the scan once it leaves**, which matters if finding C later says opening one must be audited: the audit event fires at the *fetch*, not at the read, and those are not the same moment. And on the page, where a modal was legal and would have kept the operator in context, we decline the better-in-context option to hold parity. **That is the price and it is paid deliberately.** |
| Modal on the page, something else in the sheet | Two mechanisms for one job — precisely the divergence §3 exists to refuse. The modal path gets built, demoed and tested; the sheet path rots. And the modal must then reimplement zoom, page-through and print or ship strictly worse than a browser tab that has all three. |
| Full-bleed takeover **inside** the drawer | 448px is not enough to read a national ID, so the takeover buys a **larger unreadable image**. It costs a view stack `ShellLayer` has no model for, a third `Escape` level beyond the two §6.6 already spends, and it breaks the drawer's single promise — *the surface behind stays legible* (§5.5) — by hiding the document list the operator opened it from. |
| Hand off to the page (`?view=documents&doc=<id>`, sheet closes, page opens a modal) | Closes the drawer, which §6.1 already refused for the expansion: *"a drawer exists to be consulted against the page behind it, and a control inside it that dismisses it is a category error."* Makes the scan addressable, which §6.6 refused deliberately. And it makes the sheet the **worse** of the two surfaces at the one job the owner asked for. |
| Full-size inline render, no tab | §6.5's leak clause: a readable government ID on screen with no deliberate act between it and whoever walks past the operator. Unreadable at 448 in any case. |

**Two consequences worth stating out loud, because they are the reason this answer is cheap:**

1. **The focus contract is empty.** No scrim is added, no surface opens, nothing traps.
   `DESIGN.md`:4036-4041 is **not engaged**: the drawer's existing no-trap contract is
   untouched and the page gains no trap. Focus is never moved by either control, so when the
   operator returns from the tab, focus is exactly where they left it — on `Open scan`. There
   is nothing to restore because nothing was taken.
2. **§6.6's `Escape` ladder is unchanged.** One press collapses the expanded row, a second
   closes the sheet. Neither new control adds a level.

#### 6.5a.2 The preview — where it lives, and why nothing moves to make room

**§6.2a's order is untouched: provenance, replacement, file slot, derivation.** The preview
is not a fifth part. **It goes inside the file slot, as the file slot's leading element**, and
the provenance sentence still opens the panel exactly as §6.2a argued it must.

```
┌─────────────────────────────────────────────────────────────────┐
│ National ID                                                  ⌃  │
│ ⟨ Valid ⟩  02 Feb 2029 · 964 days left                          │
│  Entered in Compliance by Layla Al-Otaibi, 4 Jun 2026.          │  1  provenance — LEADS
│  ┌───────────────────────────────────────────────────────────┐  │  2  the file slot
│  │  ┌───────────────────────┐                                │  │
│  │  │                       │   240 × 160, fixed, both       │  │  2a THE PREVIEW
│  │  │     [ the scan ]      │   surfaces. bg-muted,          │  │
│  │  │                       │   border-border, rounded-md,   │  │
│  │  └───────────────────────┘   object-contain, centred      │  │
│  │  national-id-DRV-0101.jpg                                 │  │  2b the record row
│  │  JPG · 1.2 MB                                             │  │     (unchanged, §6.5)
│  │  Uploaded 4 Jun 2026 by Layla Al-Otaibi                   │  │
│  │  ┌─────────────┐ ┌──────────┐                             │  │  2c the two controls
│  │  │ Open scan ↗ │ │ Download │  28px, secondary, gap-2     │  │
│  │  └─────────────┘ └──────────┘                             │  │
│  └───────────────────────────────────────────────────────────┘  │
│  Marked valid because more than 30 days remain.                 │  3  derivation — TRAILS
└─────────────────────────────────────────────────────────────────┘
```

- **240 × 160, fixed, `object-fit: contain`.** Both on the 4px grid. A landscape ID fills it;
  a portrait page renders 113 × 160 centred with grey either side. Enough to answer *is this
  the right paper, is it blank, is it sideways, is it legible* — which is the question a
  preview answers. It is not enough to read a document number, which is the question
  `Open scan` answers. **Two sizes, two questions, two controls.**
- **Identical at both widths.** The page's single column is ~872px and a horizontal
  composition (frame at inline-start, record text beside it) would fit there. **Refused** —
  §5.2's *"one composition, both surfaces"* and §4.7's fourth row. It does not fit at 448
  (240 frame leaves 160 for a filename that sets at ~180), so a second composition would be a
  second component.
- **Vertical stack, everything flush to the inline-start.** Same discipline as §5.2's row.
- **The leading `▤` glyph and the preview frame are alternatives, never both.** One rule:
  *the file slot renders exactly one leading visual.* Frame when an image preview is
  available; glyph otherwise. Two pictures of one file is one too many.
- **The frame's presence is decided by `file.mimeType` — the record's field, never the
  response's content type.** So it is known before the bytes arrive, which is why nothing
  shifts position when they land.
- **R8 is not engaged.** The preview is a record, not decoration. R8 governs illustration in
  empty states, and no illustration renders anywhere in this section (AC-CP-114 holds).
- **§6.5's leak clause is amended, not overruled.** It read: *"the scan is still never
  rendered inline as an image … an inline render leaks a government ID to anyone glancing at
  the operator's screen."* **That was written against a full-size render and it still stands
  against one.** A 240 × 160 contained thumbnail, behind a deliberate expansion, discloses
  strictly **less** than the identity band four inches above it, which already carries the
  captain's full name and a 32px portrait. What the scan adds over the record — the document
  number, the printed detail — is unreadable at that size. The gate attaches to the readable
  render, and the readable render is the new tab.

#### 6.5a.3 A PDF is not a photograph, and it gets no frame

`ComplianceDocFile.mimeType` admits three values. Pretending one component serves all three is
how a viewer ships a grey box for half the corpus.

> **Ruled: `image/jpeg` and `image/png` get the frame. `application/pdf` gets no frame at all
> — not an empty one, not a placard, not a format chip in a box.**

An empty bordered box is §6.4's exact prohibition one layer up: *"a greyed tile shape implies
a file is loading or was refused — two different claims, both false."* A `PDF` chip inside a
240 × 160 frame is a grey box with a caption.

**Three constructions were considered and two refused:**

| | |
|---|---|
| `<iframe>` / `<embed>` of the object URL | **Refused, and the reason is security, not taste.** A PDF is an active document format. Embedding an operator-supplied one in the admin's own browsing context is an attack surface the console does not need; a new tab is a *different* browsing context with the browser's own sandboxed viewer. It is the same reasoning as `rel="noopener"` on the anchor. It also steals scroll, brings its own scrollbars inside a 448px panel, and renders differently in every browser. |
| pdf.js, page 1 to a canvas | **Refused.** ~300 KB of dependency and a build, for a first page the operator sees in one click. |
| **No frame, plus one sentence — RULED IN** | The record row already says `PDF · 240 KB`. One sentence says why there is no picture, so *no preview because PDF* is never mistaken for *no preview because it failed* — two diagnoses, and this whole section refuses to conflate diagnoses. |

```
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ ▤  istimara-DRV-0101.pdf                                  │  │   glyph, because no frame
│  │    PDF · 240 KB                                           │  │
│  │    Uploaded 4 Jun 2026 by Layla Al-Otaibi                 │  │
│  │  A PDF has no preview. Open the scan to read it.          │  │   text-xs muted
│  │  ┌─────────────┐ ┌──────────┐                             │  │
│  │  │ Open scan ↗ │ │ Download │                             │  │
│  │  └─────────────┘ └──────────┘                             │  │
│  └───────────────────────────────────────────────────────────┘  │
```

The sentence names the control by its exact visible label, so the pointer is followable
(copy.md rule 5, *echo the object exactly*).

#### 6.5a.4 Eager or on demand — the answer is neither, and it follows from one rule

Five document rows on a captain. Eagerly fetching five files to draw thumbnails nobody asked
for is a different product from a preview behind a control. Both are refused.

> **The bytes are fetched when they are needed to draw something.**
>
> - **On expansion**, and only when `file !== null` **and** the operator is permitted **and**
>   `file.mimeType` is an image. That fetch draws the frame.
> - **On click**, always, for `Open scan` and `Download` — reusing the preview's bytes when
>   they are already in hand.
> - **Never** on list load, never for a collapsed row, never for a row whose `file` is `null`.

**Why this is not "eager".** The preview lives in the expansion, and §6.1 already rules **one
row open at a time**. So there is no burst: the list can cost at most one in-flight read, ever.
And `file === null` is the majority case by design — `types/driver.ts` insists on it in as
many words (*"a viewer whose empty state is rare is a viewer whose empty state was never
built"*) — so most expansions fetch nothing at all.

**Why the expansion is not "on demand behind a control".** A `Show preview` button inside an
expansion the operator just opened is a second click in front of the most likely reason they
opened it. §6.3 has a name for that shape: *chrome pretending to be security*. **The
expansion is the deliberate act.**

**Why a PDF fetches nothing on expansion.** There is nothing to draw. The bytes move when the
operator asks for them.

**The costs, named.**

| | |
|---|---|
| An operator expanding a row to read the **provenance** sentence pulls an image they did not ask for | Bounded: one row, one file, aborted on collapse via the seam's `AbortSignal` (AC-CP-128). The provenance sentence renders instantly and is never blocked on the read. |
| No cache | The read lives in the expanded row's own component and dies with it, so **re-expanding refetches**. Accepted: a cache is an optimisation, not a correctness requirement, and a keyed byte cache is a helper nobody has asked for yet. If it later becomes one, it is utilities-engineer's, not this component's. |
| `Open scan` on a **PDF** has no bytes in hand at click time | The control must still work on the **first** click with no blocked popup (AC-CP-119). The standard pattern — open the tab synchronously inside the gesture, set its location when the read resolves — is the recommendation; the mechanism is frontend-engineer's, the requirement is not negotiable. For an image the bytes are already held and the question does not arise. |
| Object URLs leak if never revoked | Revoke on unmount of the expanded row, **never on click** — a tab that has already loaded the resource is safe, a tab that has not yet is broken. |

#### 6.5a.5 Download — declared, and under which permission

**Is it declared at all?** §6.7 refused *"print, download-all or export"* on the grounds that
there was no operation and that a **bulk** export of identity documents is a permission
question. **A single-document download is a different act and the owner has now asked for it.**
Once the bytes read ships there is an operation, so §6.7's *"a command with no operation is
not declared at all"* no longer applies to it. §6.7a records the amendment; **download-all,
print and export stay refused, untouched.**

**Under which permission?** Here is the fact that settles the mechanics and sharpens the
product question rather than answering it:

> **Once the bytes are in the operator's browser, the download is not a new disclosure. It is
> a new location for a disclosure that already happened.** A screenshot is a download with
> worse metadata. There is no client-side boundary between *seeing the scan* and *keeping the
> scan*, so a narrower client-side permission on `Download` alone would be theatre.

**Ruled for the build: `Open scan` and `Download` take the same permission as the bytes read
— `view_operations` today, per §6.3 — and one boolean gates both.** No new constant is
minted. A second, unused boolean would be finding F's defect exactly: *an unused variant on a
two-consumer component is how a third consumer picks the wrong one.*

**But the owner's question is real and this is its second half.** Finding C already asks
whether an identity scan deserves a permission narrower than the surrounding surface, and
whether opening one should be audited. **The download does not add a question; it makes C's
answer consequential**, because the download is the act that produces a copy outside the
console, and a copy outside the console is what an audit trail exists for. **§11's finding C
is restated and joined rather than answered twice.** The refusal copy for a separate
download permission is written in §8.1b and marked *held, not declared* — the same discipline
§6.3 used for the refusal it could not yet reach.

#### 6.5a.6 Zoom, rotate, page-through — all three out, and it is one decision

> **Ruled out of Eyvar and into the browser.**

`Open scan ↗` hands the file to the browser's own viewer, which gives **zoom, page navigation,
search, print and save-as** for a PDF at production quality, in the operator's locale, fully
keyboard-accessible, for zero build and zero maintenance. For an image it gives fit-to-window
and click-to-zoom.

**They are one decision, not three.** Building any of the three in-app means building a
viewer. Building a viewer means building the overlay §5.5 forbids on one of the two surfaces.
Building it on one surface only is the divergence §3 exists to refuse. So the three questions
collapse into one and it has one answer.

**The cost, named honestly: rotate is genuinely lost.** A sideways phone photo of a licence is
a real case — *"Photo unclear / blurry"* is one of legacy's five rejection reasons
(`:10871`), so operators do receive bad captures. The browser will not rotate an image in a
tab. **The escape hatch is `Download`**, which hands the operator the file and every tool on
their machine. That is the second reason the download exists, after the owner asking for it,
and it is why the two controls ship together rather than one at a time.

#### 6.5a.7 Accessibility — decided, not deferred

**A preview of a document is an image of text.** Two things are stated here rather than left.

**1. The preview's accessible name is nothing, deliberately.**

> The frame is `aria-hidden="true"` and `tabIndex={-1}`. Its `<img>` carries `alt=""`.

- **A descriptive `alt` would be a lie.** `alt="Scan of the national ID"` asserts what is in
  an image nobody on this team has read. §3.5's honesty rule applies to alt text exactly as it
  applies to a value: **do not narrate pixels you have not seen.**
- **A restating `alt` would be noise.** `alt="Preview of national-id-DRV-0101.jpg"` repeats
  the line directly beneath it.
- **What a screen-reader operator gets instead is the record row, and it is already on
  screen**: the document type (the row's heading), its state badge, its expiry and countdown,
  the provenance sentence, the file name, the kind, the size, the upload date and the
  uploader. **Everything the pixels could be honestly described as is already text.** The
  brief's guess was right and this is cheap.

**2. The frame is a redundant mouse target, and it adds no tab stop.**

Clicking the preview opens the scan — that gesture is instinctive and refusing it would read
as broken. But it is the **same act** as the button beneath it, so it gets no second
accessible name and no second tab stop: `aria-hidden="true"`, `tabIndex={-1}`, pointer cursor,
never focused, so §7.2's visible-focus rule is satisfied by the named button and never applies
to the frame. **The expanded row adds exactly two tab stops** (AC-CP-137).

**3. Both control names name their document.** In a list of five, `Open scan` alone is
ambiguous to anyone who cannot see which row it is in. The accessible name is
`Open scan: {document}` — one key, one named param, **never concatenated** (§9.6, AC-75) —
and it contains the visible label `Open scan` contiguously, which is what WCAG 2.5.3 (Label in
Name) requires and what an `aria-label` built as *"Open the {document} scan in a new tab"*
would have failed. `{document}` is the row's own translated document-type label, the same
string the row heading renders.

#### 6.5a.8 Every state of the file slot, drawn

The read has four outcomes and the slot has **six** states. Five of them are the ones an
operator actually hits, and no two share a sentence — conflating any two is the V-2 defect
(`states.md`).

| # | Condition | Frame | Record row | Controls | Sentence |
|---|---|---|---|---|---|
| **A** | `file === null` | none | none | none | `No scan is stored for this document.` — shipped, unchanged |
| **B** | `file !== null`, **refused** | none | renders | both **disabled in place** | `Opening a captain's scans needs the operations permission.` |
| **C** | permitted, read **in flight** | skeleton (images only) | renders | both disabled, **no reason** | none |
| **D** | permitted, **bytes** — image | the scan | renders | both enabled | none |
| **D′** | permitted, **bytes** — PDF | none | renders | both enabled | `A PDF has no preview. Open the scan to read it.` |
| **E** | permitted, read **failed** | replaced by the error | renders | both disabled | `Couldn't load this scan. Try again.` + `Try again` |
| **F** | permitted, read **404 with a record** | none | renders | both disabled | `The record lists a scan that is no longer in storage.` — **no `Try again`** |

**A versus E is the pair the brief singled out and they are not the same fact.** A says *the
record never had a scan.* E says *the record has one and we could not fetch it.* An operator
acts differently: A is a compliance gap to chase with the captain; E is a console fault to
retry and then report. They share no string and never will.

**F is the third diagnosis and it earns its own row.** The record lists a scan the store does
not have — the record and the object store have diverged. **`Try again` is absent because
retrying cannot help**, and offering it would be a lie in the shape of a remedy. No invented
remedy is attached either: the console cannot upload, so a *"re-upload it"* instruction would
name an act this surface does not have. The sentence says exactly what is wrong, which is
what lets the operator do the right thing off-screen.

**B renders without a request.** §11.2 governs: **disabled in place, reason as real text,
`aria-describedby`-linked, never hidden, never a tooltip.** Hidden controls make a permission
and an absent file indistinguishable, and those are opposite facts. One sentence serves both
controls — two identical refusals stacked is not twice as clear.

**The 403 race.** If the flag says permitted and the read returns 403 — the permission was
revoked mid-session — the slot renders **B's sentence and B's disabled controls**, in place of
the frame. Same key, same wording. It is the same fact arriving late.

**C is a skeleton, never a spinner** (§11.3), and it is the frame's exact 240 × 160 box, so
nothing shifts when the bytes land. **A PDF has no frame skeleton**, because a PDF never has a
frame — the `mimeType` branch is decided before the read resolves, which is the point of
branching on the record and not on the response.

**The bytes will be visibly sample documents, deliberately.** That is the data layer's
decision and it is right. Recorded here so visual-QA does not file *"the preview shows a fake
document"* as a defect: **the sample looking like a sample is the feature**, and it is the same
rule `types/driver.ts` states about placeholder scans one level up.

#### 6.5a.9 What the two controls are, and why they are not both links

Every other control on either captain surface **goes somewhere in the app** — `Open compliance
file`, `Open payouts`, `Open full profile` — and every one of them is correctly a link.
`Open scan` and `Download` are the first two controls on this surface that **do something**.

> **Both are `Button` at the default `secondary` variant, `size="default"` (28px), side by
> side at the inline-start of the file slot's last row, `Open scan` first, `gap-2`.**
> **`Open scan` carries a trailing `↗`.**

- **D-CP-6 is not breached and is not amended.** It refuses a **filled** button, on the stated
  ground that *"a filled control in a drawer is the affordance for a commit."* Neither of
  these commits anything, and `secondary` is white surface, hairline, ink label — the
  everyday control, not the primary. A note is added under D-CP-6 in §10 so the next reader
  does not mistake two new buttons for drift.
- **One weight, not two.** A link beside a button is two grammars on one row; two secondary
  buttons is one. The `↗` does the *leaves-the-app* work that §9.5 assigns it, and §5.3
  already reserved that glyph for exactly this control: *"the one place `↗` is correct on this
  screen is the file tile, which opens a file outside the app."*
- **`Open scan`, not `View scan`.** Four controls on this surface already begin with `Open`.
  Consistency of verb across one screen is worth more than a shade of precision, and the `↗`
  carries the difference.
- **The controls render in every state**, enabled or disabled. They are never hidden — §11.2,
  and the same reason the refusal is text rather than an absence.
- **Arithmetic at 448.** `Open scan ↗` ≈ 102, `Download` ≈ 78, `gap-2` 8 → **188 in ~400** of
  slot-inner width. Clears with ~210 of slack, which is the headroom Arabic needs.

### 6.6 Interaction and keyboard

| | |
|---|---|
| **The row** | `<button type="button">` wrapping both lines. `aria-expanded`, `aria-controls` pointing at the panel's `id`. Its accessible name is the document's label; the state, date and countdown are inside it as text and are announced with it |
| **The caret** | `⌄` / `⌃` at the inline-**end**, `aria-hidden`, 16px. It is not a separate control and is not focusable. §4.7 draws exactly this on an accordion row. *(Noted: §1.5 / §9.1 row 9 reserve the trailing caret for menu-opening controls. §4.7 explicitly sanctions it on an accordion row, and §4.7 is the more specific rule for this instrument. Recorded in §11 rather than assumed.)* |
| **The caret does not mirror** | It is a vertical disclosure mark, not a directional one. §9.5's second table: `▾` is symmetric. **A `›` that rotates would have to mirror; a `⌄` does not, which is a second reason to draw it this way** |
| `Enter` / `Space` | Toggles the row. Opening one collapses whichever was open |
| `Tab` | Moves row to row, then into the expanded panel's controls (the file tile), then on. **No roving tabindex** — these are disclosure buttons in a list, not a composite widget |
| `Escape` | **Collapses the expanded row while focus is inside the document list.** A second `Escape` closes the sheet. That is `DESIGN.md` :4114's *"Escape twice in a nested surface — innermost first"*. Outside the list, `Escape` closes the sheet as it does today. On the page, `Escape` collapses the row and does nothing else |
| **Not in the URL** | The active tab is URL state (`&tab=documents`); the expanded row is not. A disclosure is a reading position, not a destination, and putting it in the URL invites a link that opens a scan on page load, which §6.3 gates deliberately |
| **Clickable, and nothing else is** | each document row; the file tile when allowed; `Open compliance file`; `Open payouts`; the `✕`; each tab; the footer link; the back arrow. **The expanded panel is not a click target** |

### 6.6a AMENDED — interaction and keyboard for the two scan controls

**§6.6's table stands in full. This adds rows; it changes none.**

| | |
|---|---|
| **`Open scan ↗`** | `Button variant="secondary" size="default"`. Accessible name `Open scan: {document}`. Opens a new browser tab on the **first** click. **Focus is never moved** — it stays on the button, so returning from the tab needs no restore |
| **`Download`** | `Button variant="secondary" size="default"`. Accessible name `Download: {document}`. Writes a file named `file.name` **verbatim** — data, never translated, never transliterated (the field's own rule) |
| **The preview frame** | A redundant mouse target for `Open scan`. `aria-hidden="true"`, `tabIndex={-1}`, pointer cursor, **no focus ring because it is never focused**, no second accessible name, no second tab stop |
| `Tab` | Row → provenance (not focusable) → **`Open scan` → `Download`** → next row. **Exactly two new stops per expanded row.** No roving tabindex; these are ordinary buttons |
| `Enter` / `Space` | Activates whichever button has focus. Neither collapses the row |
| `Escape` | **Unchanged.** One press collapses the expanded row while focus is inside the list; a second closes the sheet (`DESIGN.md`:4114). **Neither control adds a level**, because neither opens a surface |
| **No trap, no scrim** | `DESIGN.md`:4036-4041 is **not engaged**. Nothing is added that dims the page, so nothing owns the keyboard. *The scrim decides the trap*, and there is no scrim |
| **Not in the URL** | §6.6's ruling holds and now matters more: the expanded row is not addressable, so **no link exists that opens a scan on page load.** §6.3 gates the bytes deliberately and a shareable URL would route around the gate's front door |
| **Clickable, and nothing else is** | §6.6's list, plus: `Open scan`, `Download`, the preview frame (redundantly), and `Try again` in state E. **The record row is still inert** and still carries no hover fill, no underline and no pointer cursor |

### 6.7 What the viewer does *not* do

- **No renew, upload, replace or extend.** `DRIVER_OPERATIONS` is `facets · list · get ·
  suspend · reinstate · complianceList · complianceGet` — every one a read except two that
  belong elsewhere. A command with no operation is not declared at all rather than shipped
  disabled with an invented reason. `DriverDocuments`' header already ruled this and it stands.
- **No row marker on an expired document.** `DriverDocuments`' header raised this for me and
  the answer is: **correct as shipped, do not add one.** R5a's breached-row marker is red's
  third permitted use and §8.4 scopes it to a work-queue row with an SLA. A read-only list on a
  profile is not that, and extending a red licence to a new surface needs a §6.2 row this spec
  may not write. The word `Expired` and `expired 12 days ago` carry it, which is what §7.5 asks.
- **No print, download-all or export.** Not asked for, no operation, and a bulk export of
  identity documents is a permission question, not a design one.

### 6.7a AMENDED — one clause of §6.7 is spent, and the rest is not

**`download` moves from refused to declared, for one document at a time only.** §6.7 refused
it on two grounds and exactly one of them has expired: there is now an operation (finding Q's
bytes read), so *"a command with no operation is not declared at all"* no longer reaches it.
The owner asked for it, §6.5a.5 rules its permission, §6.5a.6 gives it a second job that no
other control can do (rotate), and §8.1b writes its copy.

**Everything else in §6.7 stands, unweakened:**

- **Download-**all**, print and export stay refused.** The second ground §6.7 gave — *"a bulk
  export of identity documents is a permission question, not a design one"* — is untouched by
  a single-document download and is if anything sharpened by it. **One scan at a time, from a
  row the operator deliberately expanded, is not an export.**
- **No renew, upload, replace or extend.** `DRIVER_OPERATIONS` still has no mutation here.
- **No row marker on an expired document.** R5a is not extended.
- **And one new refusal: no in-app viewer.** No zoom control, no rotate control, no page-through,
  no lightbox, no `<iframe>`, no pdf.js. §6.5a.6 is the argument; this is the line a reviewer
  greps for when someone proposes the first of them.

---

## 7. The payable ledger's direction sentence — AC-308

**The problem.** `DriverEarningsTable` renders *"A credit is money earned. A debit is money
paid out or deducted."* above the table. `DataTable` has gained `heading`/`subheading`, the
section title moves into the toolbar row, and the sentence is stranded above its own title.

Dropping it is not available: `liability.driver` is credit-normal, so a credit means Eyvar owes
**more**. It is the only ledger in the console with an inverted convention, and an operator who
reads it as a wallet reads every row backwards.

**Refused: putting the convention in the column headers.** §8.3.3 carries a MUST that names
them literally — *"A ledger MUST use the fixed column order Date · Reference · Description ·
Debit · Credit · Balance"* — and the rider spec already tests it verbatim (AC-RP-52).
`ledgerColumns` is shared with every financials screen, where the convention is the opposite.
And a private vocabulary on one table hides the trap rather than removing it: an operator who
has learned `Debit`/`Credit` across the console would meet two new words with no visible
mapping. **This is a §8-level MUST and it outranks the ergonomics.**

**Refused: `subheading`.** `text-xs`, truncates, and the count plus the window
(`2 postings · 1–30 Jun 2026`) already occupy it — and that is §5.4's truncation statement,
which has to stay next to the rows.

**Refused: `learnMore`.** Below the table. Too late for a key the operator needs before row 1.

**Ruled: `DataTable` gains `caption?: ReactNode`.** Owned by the table's owner; routed, not
built here.

- Renders a real `<caption>` with `caption-side: block-start`, **between the toolbar row and
  the header row** — after the title, immediately above the columns it explains.
- `text-xs text-muted-foreground`, `text-start`, full table width, **wraps and never
  truncates**.
- Three reasons it is the right answer rather than a convenient one:
  1. It sits at the point of confusion, directly above the two headers it defines.
  2. `<caption>` is announced by assistive technology **on entering the table**. The current
     paragraph is announced before it and is trivially skipped, so the convention never reaches
     a screen-reader operator at all.
  3. It is reusable. `ar.driver` (cash debt) runs the same way and the cash queue will need the
     same sentence. A screen-local paragraph gets reinvented three times.

**Fallback if the slot is refused:** the sentence ships as a `text-xs text-muted-foreground`
paragraph immediately above the `DataTable`, which keeps its `heading`. The orphan lead is a
real blemish and is recorded as a known defect against the caption request rather than hidden.
**Do not invent a third option and do not drop the sentence.**

---

## 8. Copy — every string, final

Sentence case. Buttons are verbs. No exclamation marks. Full sentences take a period;
fragments, labels and buttons do not (**R6**).

### 8.1 New keys

| Key | English |
|---|---|
| `profile.driver.band.vehicle` | *(not a key — `Driver.vehicle` verbatim, §4.1)* |
| `profile.driver.documents.expand` | `Show document` |
| `profile.driver.documents.collapse` | `Hide document` |
| `profile.driver.documents.noScan` | `No scan is stored for this document.` |
| ~~`profile.driver.documents.fileMeta`~~ | ~~`{kind} · {size}`~~ — **struck, and the build was right to refuse it.** §6.5's tile renders the kind and the size as two `<bdi>` nodes with an `aria-hidden` separator between them, which is what §9.6 asks for and what §5.2's date-and-countdown line already does. My key table contradicted my own row spec |
| `profile.driver.documents.uploaded` | `Uploaded {date} by {name}` |
| ~~`profile.driver.documents.fileUploadedOnly`~~ | ~~`Uploaded {date}`~~ — **struck.** `ComplianceDocFile.uploadedByUserName` is `string`, not `string \| null`: where `uploadedByUserId` is `null` the captain sent it from the driver app and the name is their own. **The data models the case better than my design did** — there is no anonymous upload, so there is no second sentence |
| ~~`profile.driver.documents.fileSizeKb`~~ | ~~`{size} KB`~~ — **struck, and moved rather than deleted.** Three surfaces had each written a file-size formatter; the answer now lives once in `src/lib/format/fileSize.ts` behind `fileSize.kb` / `fileSize.mb`, and the viewer calls `formatFileSize`. A profile-local unit key would be a fourth byte convention in one product |
| ~~`profile.driver.documents.fileSizeMb`~~ | ~~`{size} MB`~~ — struck with the row above. Note the Arabic consequence: `src/i18n/ar/fileSize.ts` keeps `KB` / `MB` in Latin (§9.6, as `SAR` and `Eyvar` are kept), so the document row reads `240 KB` in Arabic where the struck key read `240 كيلوبايت` |
| `profile.driver.documents.fileNotStored` | `Only the scan's details are stored, not the file itself.` |
| `profile.driver.documents.why.valid` | `Marked valid because more than 30 days remain.` |
| `profile.driver.documents.why.expiring` | `Marked expiring because 30 days or fewer remain.` |
| `profile.driver.documents.why.critical` | `Marked expiring soon because 7 days or fewer remain.` |
| `profile.driver.documents.why.expired` | `Marked expired because the date has passed.` |
| `profile.driver.refusal.viewDocument` | `Viewing a captain's documents needs the operations permission.` |
| `profile.driver.documents.error` | `Couldn't load documents. Try again.` |
| `profile.driver.documents.fileError` | `Couldn't load this document. Try again.` |
| `fin.ledger.caption.payable` | `A credit is money earned. A debit is money paid out or deducted.` |

~~`profile.driver.documents.expand` / `.collapse`~~ — **STRUCK. The condition I wrote them under
has been tested and it holds.** The row's accessible name is the document label plus its meta
line, the caret is `aria-hidden` and not focusable, and there is no consumer. My own instruction
was *"if a builder finds no consumer, delete them rather than inventing one"*; the builder
looked, and this is the deletion. **`profile.driver.documents.fileMeta` was never declared and
the build was right not to declare it** — §5.2 and §8.3 both specify two isolated runs with an
`aria-hidden` separator, which is a construction and not a key. My key table contradicted my own
row spec, twice, and the row spec wins both times.

### 8.1a New keys — owner amendment 2 and §6.2a

**No new key is needed for the four tabs.** All four labels already exist and are already
translated: `profile.driver.tab.documents`, `profile.driver.tab.earnings`,
`profile.driver.tab.activity`, `profile.section.identity`. That is §4B.3's third argument
cashing out.

**The figure rows — §4B.6.** Six of the eight strings already exist and are reused verbatim:
`profile.field.rating` (`Rating`), `profile.field.onTime` (`On time`),
`profile.field.totalTrips` (`Trips completed`), `profile.field.monthEarnings`
(`Earnings this month`), `profile.driver.field.tripsInPeriod` (`Trips this period`),
`profile.driver.meta.noRating` (`Not yet rated`).

| Key | English | Note |
|---|---|---|
| `profile.driver.figure.lastTrip` | `Last trip {date}` | the caption on `Trips completed`. Fragment, **no period** (R6). `{date}` is `day-month-time` |
| `profile.driver.figure.noTrips` | `No trips yet` | `totalTrips === 0`. Renders **in place of the figure**, not beneath it |
| `profile.driver.figure.noOnTime` | `Not enough history` | `onTimePercent === null`. **Not `Not recorded`** — the value was never computable, which is a different claim from a value we lost. `facts.tsx` already states the reason in its own comment |
| `profile.driver.figure.noPeriod` | `No payout period yet` | `payout === null` on `Trips this period`. **Not `0`** — R4-11: a count for a captain the payouts run has never seen is a figure the record does not have |
| `profile.driver.payout.state` | `Current payout: {state}` | the payout block's one caption. `{state}` is `t('fin.payout.state.…')`, passed as a translated param, never concatenated (§9.6) |

**The two standing flags — §4B.5.** Same voice and same shape as the six `profile.driver.flag.*`
already shipped: a fragment naming a condition, no period, no colour.

| Key | English |
|---|---|
| `profile.driver.flag.bankPending` | `Bank account is pending verification` |
| `profile.driver.flag.bankRejected` | `Bank account was rejected` |

**Document provenance — §6.2a.**

| Key | English |
|---|---|
| `profile.driver.documents.source.applicationReview` | `Entered on the application by {name}, {date}.` |
| `profile.driver.documents.source.opsEntry` | `Entered in Compliance by {name}, {date}.` |
| `profile.driver.documents.source.autoDefault` | `No document was read. The system set this date at approval on {date}.` |
| `profile.driver.documents.previousExpiry` | `Replaced an expiry of {date}.` |
| `profile.driver.documents.autoFilled` | `Date auto-filled` |

**One key is deleted.** `profile.driver.card.performance` (`Performance`) loses its only two
consumers when `performanceFields` dissolves (§4B.6). **Delete it rather than leaving it**; an
orphan label is how a third consumer resurrects a card that was taken apart on purpose. Grep must
return no consumer and the word `Performance` must appear nowhere on either captain surface.

**Two keys keep their consumers and must not be swept up with it**:
`profile.driver.card.payout` (`Payout account`) is the block's heading in its new home, and
`profile.driver.field.bankName` / `.accountHolder` / `.iban` survive as the **labels
`AbsentLine` names when a value is missing** — even though the present lines are unlabelled.
A label that only ever renders inside an absence line is still a rendered label.

**Two keys lose their consumer on this surface but are NOT deleted**:
`profile.driver.field.lastPayout` and `profile.driver.field.capacity`. Both are declared in
`copy.ts` and both are reachable from other screens; deleting a key because one surface stopped
calling it is how the Compliance view loses a column heading. **Grep before deleting either.**

### 8.1b New keys — owner amendment 3, the scan preview, open and download (§6.5a)

**Seven declared, one held, two reused verbatim, one struck.** Every sentence obeys §6.5a.0's
vocabulary: a **document** is the compliance record, a **scan** is the file.

| Key | English | Notes |
|---|---|---|
| `profile.driver.documents.openScan` | `Open scan` | The visible button label. Verb + object, sentence case, **no period** (R6) |
| `profile.driver.documents.openScanNamed` | `Open scan: {document}` | The **accessible name**. One key, one named param, **never concatenated** (§9.6, AC-75). It contains the visible label contiguously, which WCAG 2.5.3 requires and `Open the {document} scan in a new tab` would have failed. `{document}` is the row's translated document-type label |
| `profile.driver.documents.download` | `Download` | Visible button label. A verb |
| `profile.driver.documents.downloadNamed` | `Download: {document}` | Accessible name, same construction and the same 2.5.3 test |
| `profile.driver.documents.pdfNoPreview` | `A PDF has no preview. Open the scan to read it.` | State D′. Two short sentences, both take periods (R6). The second **names the control by its exact visible label** so the pointer is followable (copy.md rule 5) |
| `profile.driver.documents.scanError` | `Couldn't load this scan. Try again.` | State E. Imperative, names the fix, no *please*, no *failed*, no blame |
| `profile.driver.documents.scanGone` | `The record lists a scan that is no longer in storage.` | State F. **States what happened and stops.** No `Try again` beside it, because retrying cannot help; no *"ask the captain to re-upload"*, because this console cannot upload and an instruction naming an act the surface does not have is a remedy in name only. An operator who reads this knows precisely what is wrong, which is what lets them act off-screen |

**Held, not declared** — the same discipline §6.3 used for a refusal it could not yet reach:

| Key | English | Why held |
|---|---|---|
| `profile.driver.documents.downloadRefused` | `Downloading a captain's scans needs the operations permission.` | Today **one boolean gates both controls** (§6.5a.5), so this string has no consumer and shipping it would be a fourth unreachable state. **Do not declare it until finding C lands.** If C mints a narrower permission the sentence names *that* permission, so the wording here is provisional and the cadence is not |

**Reused verbatim, no change:**

- `profile.driver.documents.noScan` — `No scan is stored for this document.` State **A**, already shipped (`copy.ts:182`).
- `profile.driver.documents.fileNotStored` — `Only the scan's details are stored, not the file itself.` **Retires the day the bytes read is wired**, exactly as §6.5 branch 2 scoped it. It renders only while there is no way to open the file, and §6.5a is that way. **Delete it with branch 2, not before**, and grep for the consumer first.

**Struck before it was ever declared:**

| Key | Was to be | Why |
|---|---|---|
| ~~`profile.driver.documents.fileError`~~ | ~~`Couldn't load this document. Try again.`~~ | **Never declared** — §8.1 listed it, grep finds no consumer in `copy.ts` or `i18n/ar/`, so it is free. Replaced by `.scanError` above, and the rewording is not cosmetic: after §6.5a.0 a *document* is the compliance record, which loaded fine. *"Couldn't load this document"* over a document whose expiry, state and provenance are all on screen would tell the operator the wrong thing failed |

### 8.2 Strings that change

| Key | Was | Is |
|---|---|---|
| `profile.state.error` on this section | `Couldn't load {section}. Try again.` with `{section}` = `Documents` | unchanged — keep the shared key. `profile.driver.documents.error` above is the **fallback wording** for the caption if the shared key is ever scoped out. Do not ship both |

### 8.2a AMENDED — one shipped string refuses the wrong object

| Key | Is (shipped) | Becomes |
|---|---|---|
| `profile.driver.refusal.viewDocument` | `Viewing a captain's documents needs the operations permission.` (`copy.ts:381`) | **`Opening a captain's scans needs the operations permission.`** |

**This is a correctness fix, not a polish pass.** §6.3 and AC-CP-40 rule that the row's
**expansion is never gated** — the document's type, expiry, state and provenance render for
every operator who can open the profile. The only thing ever refused is the **scan**. The
shipped sentence refuses *documents*, so an operator who hits it concludes the list itself was
withheld and goes looking for a permission that would change something it will not change.

- **Cadence is preserved on purpose.** It still matches `Opening the compliance file needs the
  operations permission.` and `Opening payouts needs the finance permission.`, so an operator
  refused twice on one screen is refused in one voice (CM-3). The verb even improves the
  match: all three now begin `Opening`.
- **The Arabic value must change with it.** `i18n/ar/driverProfile.ts:220` currently reads
  `الاطلاع على مستندات الكابتن يتطلب صلاحية العمليات.` — *documents*, the same wrong object.
  The replacement wording is the **i18n owner's**, not mine (§8.3's standing rule); what is
  ruled here is that it must say *scans* and must keep the shape of the two sentences beside
  it.
- **The key name does not change.** `viewDocument` is now slightly off from what it says, and
  renaming it would touch two dictionaries and a component for zero operator benefit. Recorded
  so it reads as a decision rather than an oversight.

### 8.3 Arabic

Every key above needs an Arabic value before merge, from `docs/08-i18n/`. Two are not
mechanical translations and are called out:

- The four `why.*` sentences: Arabic uses `،` and takes the number as Western digits inside an
  RTL line (§9.2). *"30 days or fewer"* is a threshold, not a duration — translate the
  comparison, not the phrase.
- `fileMeta` is `{kind} · {size}` with **two named params and one `aria-hidden` separator
  node**, not a joined string (§9.6).

### 8.4 Toasts

**None.** Neither captain surface mutates anything, so R9 has nothing to spend a toast on.
Expanding a row is not a mutation. Opening a file is not a mutation.

---

## 9. Arabic — the delta

The rider spec §10 governs in full. Four clauses are specific to what this document adds:

1. **The band's vehicle row** mirrors as a block with the person row above it. Its `·`
   separators are `aria-hidden` spans between `<bdi>` nodes, so `Corolla 2022 · White ·
   Economy` reads right-to-left as three isolated runs and the Latin model name does not walk
   into the class word.
2. **The 2×2 summary grid** reverses with the document: cell 1 is at the inline-start of row 1
   in both directions, because a CSS grid's row-major order follows `dir`. **Dividers are
   `border-inline-start` and `border-block-start`. A `border-l` is a defect on arrival.**
3. **The document row's two lines both start at the inline-start**; the caret is at the
   inline-end. `⌄` is symmetric (§9.5's second table) and does not swap. The date and countdown
   remain two `<bdi>` runs with an `aria-hidden` `·` — a joined string walks its pieces apart
   in an RTL paragraph (AC-73).
4. **The file tile** puts the glyph at the inline-start and `↗` at the inline-end; the file
   name is `<bdi>`, because a Latin filename inside an Arabic paragraph reorders otherwise.
   `{kind} · {size}` is two `<bdi>` runs. `↗` is the one glyph on this screen that does **not**
   mirror and does not need to — it is a fixed external-link mark (§9.5).

Digits stay Western `0–9`. Money keeps `SAR` trailing. The ledger's three money columns keep
`text-end` in both directions (R4).

---

## 9A. Two rulings the build asked for

### 9A.1 The block axis is `border-t`, and that is not a defect

The builder refused to satisfy AC-CP-08 as first written, and was right to. Verified in source:
Tailwind v4 ships `border-s` / `border-e` for the inline axis and **no block-axis utility**;
`globals.css` declares no `@utility` for one; `border-block-start` appears in `src/` only in
three prose comments; and **45 files already draw the block axis with `border-t`.**

> **Ruled: the inline axis is logical and must be. The block axis is `border-t` / `border-b`
> and needs nothing else. No new utility is requested from the token steward.**

- **In a horizontal writing mode `border-block-start` and `border-top` are the same rule.** The
  block axis does not mirror under `dir="rtl"`; only the inline axis does. That is why the token
  audit's physical-direction grep lists `border-l` and `border-r` and **does not list
  `border-t`**, and why the rider spec's AC-RP-86 does not either. The audit already encodes
  this ruling; AC-CP-08 was the outlier.
- **A `@utility border-bs` would be a synonym, and a synonym is worse than the thing it
  replaces.** Two spellings of one rule means half the codebase uses each, and the next reader
  has to work out whether the difference is meaningful. It is not. Refused.
- **The coordinator's real worry is answered by a guard that already exists.** The risk is
  someone later "fixing" `border-t` to `border-l`. `border-l` **is** in the audit grep and fails
  AC-CP-51 and AC-RP-86. The builder additionally wrote the reasoning into a test, which is
  better than a comment. Keep both.
- **Prose in this spec and in the components still says `border-inline-start` / `border-block-
  start`**, because those are the names of the *rules*. `border-s` and `border-t` are the
  utilities that express them. Where a comment implies a `border-block-start` utility exists,
  correct the comment, not the code — `DriverStrip.tsx:52` and `SummaryBlock.tsx:49`.

### 9A.2 The payable ledger has three empties, not two

The build found a live defect and correctly refused to invent copy for it. Both halves are
ruled here, and **neither AC-CP-53 nor AC-427 yields on substance** — they were disagreeing
about two different halves of R8.

**The defect, confirmed.** `DriverEarningsTable` declares `firstRun` and no `emptyKind`, so
`DataTable` defaults to `'first-run'`, and a captain with years of history and one quiet month
is told `Nothing has been posted yet`. That is LR-2's case verbatim: *"`totalPostings === 0`
means nothing happened in the window you asked for, which a subject with years of history has
every quiet month."* The copy file's comment already claims the empty is decided from
`lifetimePostings`; the code does not do it.

**The reconciliation.** **LR-3** settles it and is stronger than "an exception to R8":

> *"**No Financials empty state carries an illustration, and this spends none of R8's licence.**
> R8 permits an illustration on a whole-page zero-records-ever state; it does not require one.
> Financials declines it, because **an operator never creates a posting**… the illustration
> would sit above an action the product does not offer. The heading, the body and the action
> stay (**AC-427**)."*

So:

- **AC-427 stands, untouched.** A party-subject ledger whose subject has never had a posting
  renders `first-run` with a heading, a body and one action. LR-1 already narrowed §9.2's
  absolute to permit exactly this.
- **AC-CP-53's illustration clause stands, and LR-3 reinforces it.** No picture, anywhere,
  including here.
- **AC-CP-53's "one grey sentence" clause narrows** to card- and section-scoped empties, which
  is what R8 is about. A ledger's `first-run` is three parts and always was.

**The three empties, with final copy.** ① is LR-4's own row for this ledger, which nobody used.

| # | Condition | Kind | Copy |
|---|---|---|---|
| **①** | `lifetimePostings === 0` — this captain has **never** accrued | `first-run`, **no illustration** | heading `No earnings have reached this captain` · body `A completed trip accrues earnings here, and a payout takes them out. Neither has happened.` · action `Back to payouts` |
| **②** | history exists, the **window** is quiet, nothing is narrowing | `no-match`, **no action** | `No postings between {start} and {end}.` |
| **③** | a search or a filter narrowed it to zero | `no-match` | `No postings match these filters.` + `Clear all filters` (`DataTable`'s default) |

**How the call site decides — no new `DataTable` prop is needed.** Both facts are already in
hand:

```
emptyKind = ledger.lifetimePostings === 0 ? 'first-run' : 'no-match'
noMatch   = table.isFiltered ? { message: ③, action: clear } : { message: ② }
```

- **`lifetimePostings`, never `totalPostings`.** LR-2: the decision is the **subject's
  lifetime**, a period-independent server fact. Deriving it from the read that just returned
  zero is circular and is what shipped.
- **③ beats ②** where both a period and a filter are narrowing — LR-4's own prohibition, and
  `DataTable`'s `table.isFiltered || emptyKind === 'no-match'` branch already produces it.
- **`emptyKind="cleared"` is refused.** LR-4: *"A ledger never renders the `cleared` empty —
  that is a work queue's, and a ledger is not worked to zero."* ② is a **narrowed** empty whose
  sentence names what narrowed it, which is `no-match`'s job. No `cleared` copy is written and
  none should be.

**The one component change LR-3 needs.** `DataTable`'s empty branch renders
`<EmptyState kind="first-run">` **without** an `illustration` prop, so it draws
`<DefaultIllustration/>`. `EmptyState` already accepts `illustration={null}` to opt out — its
own comment records that the arm exists precisely so a caller can. **Ruled: `DataTable` passes
`illustration={null}` when `mode === 'ledger'`.** Derived from the mode, not from a call site,
because LR-3 is a blanket ruling over every ledger and there is no ledger it does not reach.
One line, no new prop. Route to the table's owner with §7's caption slot.

**Copy keys.** ② and ③ are **not** captain-specific and must not be scoped to it, or the rider's
wallet ledger mints an identical pair and the two drift.

| Key | English | Scope |
|---|---|---|
| `entity.driver.ledger.firstRun.heading` | `No earnings have reached this captain` | captain only |
| `entity.driver.ledger.firstRun.body` | `A completed trip accrues earnings here, and a payout takes them out. Neither has happened.` | captain only |
| `entity.driver.ledger.firstRun.action` | `Back to payouts` | captain only |
| `fin.ledger.empty.period` | `No postings between {start} and {end}.` | **shared, new** — two named params, never joined (§9.6) |
| `fin.empty.noMatch` | `No postings match these filters.` | **shared, already exists — reuse it** |

**Three keys are retired**, and retiring them is the point rather than a tidy-up:
`entity.driver.ledger.empty.heading` (`Nothing has been posted yet` — the defect's own words),
`.body`, and `entity.driver.ledger.noMatch` (`No postings match this search.` — a second
spelling of `fin.empty.noMatch`, and LR-4 says *filters*, because a search is one).

---

## 9B. Arabic — the delta owner amendment 3 adds

§9 governs in full. Six clauses are specific to the scan preview and its two controls.

1. **The preview frame sits at the inline-start of the file slot and its contents do not
   mirror.** A scan is an image; `object-fit: contain` centres it in the frame in both
   directions. **The frame's own position mirrors; the pixels inside it never do.** A
   `transform: scaleX(-1)` on a document image would be a defect of the first order — it would
   print a mirrored national ID.
2. **The two controls sit at the inline-start of the slot's last row in both directions**, in
   the same source order (`Open scan`, then `Download`), so their visual order reverses with
   `dir` and their reading order does not. This is the same rule §5.3 applies to
   `Open compliance file`.
3. **`↗` does not mirror**, restating §9 item 4: it is a fixed external-link mark (§9.5), not
   a directional glyph. It is the only glyph in this section that would be wrong to flip.
4. **The file name stays `<bdi>`-isolated** (§9 item 4, unchanged), and so does the
   `{document}` param inside both accessible-name keys — a Latin document label inside an
   Arabic accessible name reorders otherwise, and a screen reader reads the reordered string.
5. **The downloaded file keeps `file.name` verbatim.** `DRV-0201` carries two Arabic filenames,
   one with Arabic-Indic digits — the hardest bidi case on the surface, seeded deliberately.
   **Never transliterate a filename**, never normalise its digits, and never build one.
6. **`A PDF has no preview. Open the scan to read it.`** — the second sentence quotes a
   control label, so **the Arabic must quote the Arabic label**, not the English one. That is
   the one string in §8.1b that cannot be translated independently of another key, and it is
   flagged to the i18n owner rather than assumed. `PDF` stays Latin, as `KB` / `MB` and `SAR`
   already do (§8.1's `fileSize` note).

Digits stay Western `0–9`. The record row's `{kind} · {size}` stays two `<bdi>` runs with an
`aria-hidden` separator (§8.3, unchanged).

---

## 10. Deviations

| # | Deviation | Suspends | Why |
|---|---|---|---|
| **D-CP-1** | The band carries **two meta rows**, person then equipment, at two ink ranks | `00-shell.md` §8's single meta row; the rider spec §5.2's one-row band | A captain record is a person **and** a vehicle; `bandMeta` today runs both through one row at one rank and wraps to three lines at 480. No fact is added, moved or removed — only the row |
| **D-CP-2** | The four summary blocks are **never a single column** on either surface | the rider spec §6.2's stacked sheet summary and AC-34's "restack to one column" as applied to the *strip* | The strip is a projection, not a section; AC-34 governs the **rail's** cards and is untouched. 2×2 halves the sheet summary's height, and it is the largest non-colour differentiator available. §4.2 |
| **D-CP-3** | The block label is **ink at medium weight**, not muted | the rider spec §6.3's block shape (`text-xs text-muted-foreground` label) | Two evidenced Shopify instruments — the metric band and the record dossier — and the captain is the second. §4.3. **No size change, no spacing change, D-2 not cited** |
| **D-CP-4** | The sheet body is **one column**, and `compact:` overrides are deleted rather than kept | nothing — it **restores** the rider spec §6.1's measured refusal to the captain | `compact` is a viewport query and never fired in a 480px panel. The two-column body overflows by the same measured margin the rider's did. §4.4 |
| **D-CP-5** | The document list is ordered by **`expiresOn` ascending**, not by `DOC_ORDER` | `facts.tsx`'s stated *"the order the file is read in"* | A profile answers *what is about to stop this captain driving*; a Compliance table answers *which document is which*, and it keeps `DOC_ORDER`. §4.5 |
| **D-CP-6** | **No filled button on either captain surface** | nothing — R3 caps the count at one and does not require one | The surface commits nothing (`DriverFooter`), and a filled control in a drawer is the affordance for a commit. §4.6 |
| **D-CP-7** | The document row **expands in place** rather than opening a viewer surface | §5.0's *"a browse-and-pick catalogue → drawer"* reading, and any modal reading | **§5.5 forbids a modal inside a drawer** and parity forbids the page solving it differently. §4.7 sanctions the accordion explicitly. §6.1 |
| **D-CP-8** | A **trailing caret on a non-menu control** | §1.5 / §9.1 row 9's reservation of the trailing caret for menu-opening controls | §4.7 draws the accordion caret explicitly and is the more specific rule for this instrument. **Raised in §11 rather than assumed**; if the rule's owner refuses it, the disclosure mark becomes `+` / `−`, which carries no menu meaning at all |

### Owner amendment 2 — §4B

| # | Deviation | Suspends | Why |
|---|---|---|---|
| **D-CP-9** | The band, the banner and the summary strip sit **outside** the tab set and are never hidden by it | nothing — it **constrains** D-CP-10 rather than departing from anything | *A tab may hide a fact; it may not hide a gate.* All three are gates or the index into the tabs. §4B.1 |
| **D-CP-10** | The page's four sections are **addressed by `?view=`** | `tabs.tsx`'s *"tabs live inside the table card"* — **as read**, not as written: this row is in the body, not the page header, and `/entity/:entityId` has `subTabId: null` so no nav level is added | A tab an operator cannot link to, bookmark or land back on after `back.ts` restores `from` is a worse page than the scroll it replaces. `routeState.ts:128/:135` already reads `?view` on this exact route; **no shell change**. §4B.2 |
| **D-CP-11** | The **page's** tabs are locations; the **sheet's** stay component state | the symmetry a reader would infer from §3 — **not §3 itself**, which governs facts and not addresses | The sheet is always mounted over a route that owns `?view` (`INDEX_ROUTE.driver.path` is `/operations/people?view=captains`), and a drawer's position inside itself is a reading position, which §6.6 already ruled for the expanded row. §4B.4 |
| **D-CP-12** | **The page has no right rail.** `SingleColumnPage body="flow"`, not `DetailPage` | **`DESIGN.md` §6.4's `profile` row** — *"Two-column detail: main + right rail summary, with timeline — §2.2, §3.8"* — as this spec's §2 adopts it | Every one of the five rail cards fails *"must this be true on every tab"*; the one gate among them (`bank.status`) belongs in `standingFlags`, which is above the tabs already. And the rail costs the ledger the 832px it needs: 568–704 with it, 872–1040 without. **AC-34 is not breached — there is no rail to restack.** §4B.5 |
| **D-CP-13** | `Performance` is **two figure rows built from `SummaryBlock`**, not `MetricTile` | nothing — and **D-CP-3 is the ruling that decides it**, not the rule it suspends | `MetricTile` is the metric-band grammar D-CP-3 diverged from, and its `Metric` contract needs `subTabId`, `category` and `asOf` on a route whose `subTabId` is `null` by design. §4B.6 |
| **D-CP-14** | The document row's meta line carries a **third run**, `Date auto-filled`, when `dateSource === 'auto-default'` | **AC-CP-23** as written (*"exactly two lines … no third line"*) — amended, not repealed: the row is still two lines; one of them gains a run | Two seeded documents carry a date nobody read and render green `Valid` beside four dates read off paper. `types/driver.ts` calls this *"the defect a document viewer exists to end"* and hands the loudness decision to product-designer under R7. **No badge, no tone, no colour — a word and an ink rank.** §6.2a |

### Owner amendment 3 — §6.5a

| # | Deviation | Suspends | Why |
|---|---|---|---|
| **D-CP-15** | The scan is inspected in a **new browser tab** — a surface that is not one of §5.0's six | **§5.0's exhaustive clause** — *"There are exactly six feedback/overlay surfaces in this system. Adding a seventh is a design bug. Pick from the table; do not invent."* | §5.0's table governs **overlays and feedback inside the console**, and a browser tab is neither: it is the same act as an external link, which §9.5 already sanctions with `↗`. But a reader can fairly read §5.0 as exhaustive over *where content appears*, so it is declared rather than argued away. **The alternative surfaces were tried first and each fails a binding rule**: a modal fails `DESIGN.md`:3134 in the sheet; a modal on the page only fails §3's parity contract; a drawer-in-drawer fails §5.5's own reason for a drawer; a route change fails §6.1. **The browser also ships zoom, page-through, search and print at production quality for nothing** (§6.5a.6). §6.5a.1 |

**Two notes that are *not* deviations, recorded so they are not mistaken for drift:**

- **D-CP-6 is unamended.** `Open scan` and `Download` are the first two buttons on either
  captain surface, and D-CP-6 still holds: it refuses a **filled** button, because *"a filled
  control in a drawer is the affordance for a commit."* These are `secondary` — white surface,
  hairline, ink label — and neither commits anything. **A diff that makes either one
  `variant="default"` fails AC-CP-131.**
- **§6.5's inline-render clause is amended by argument, not suspended.** It refused a
  full-size inline render and it still refuses one. A 240 × 160 contained thumbnail behind a
  deliberate expansion discloses less than the identity band above it already does. §6.5a.2.

---

## 11. Findings, blockers and handoffs

**A — `DataTable` needs a `caption` slot.** Owner: **the `DataTable` owner** via the
coordinator. Spec and fallback in §7. This is the only file outside `profile/driver/` and
`screens/entity/` that this document asks to change.

**B — `ComplianceDoc` may need a `file` field.** Owner: **mock-data-engineer**. Shape in §6.5.
**Landed, and `href` was correctly refused.** The data agent struck the URL on the grounds that
it could only point at a fabricated scan or at nothing — which is my own *"do not seed a stock
document image"* rule one layer up: a link to a fabricated image is a fabricated image with an
extra click. **Refusal upheld.** The consequence is a **third file state** — metadata with no
way to open it — which I had not designed and which §6.5 branch 2 now covers in full, including
its one sentence and why that sentence cannot outlive its truth. `sizeBytes` is formatted by the
UI, never by the data layer; that needs a helper, finding J.

**I — the 14-day band is real, measured, and this screen is where it becomes visible.** Owner:
**product-owner**, with mock-data-engineer holding the measurement. 8 seeded documents sit
between 8 and 14 days out — `Expiring` on Compliance, `at-risk` in `driverRiskScore` — with no
label separating them; two are on named captains. The question is whether the risk score adopts
7/30 or Compliance grows a fourth band. **This spec does not decide it and does not hedge around
it.** §6.2 prints Compliance's boundaries, because `ComplianceDocState` is the field on the wire
and this screen renders the field it is given; a sentence written to cover both bucketings would
launder the contradiction into copy. If the ruling adds a band, the sentence gains a fifth
variant and nothing else on this screen moves.

**J — a shared byte formatter. J STANDS, and the captain barrel is not its home.** Owner:
**utilities-engineer**. The build shipped `fileSize` in `profile/driver/facts.tsx` so the viewer
was not blocked, wrote the reason in its own doc comment, and raised it. That is the right
sequence and the helper is correct. But **the three-call-site test is already met, and it was
met before this screen existed** — `fileSize`'s own comment names the other two:

| # | Where | What it renders |
|---|---|---|
| 1 | `AdminWorkspaceScreen` | a `${n} KB` template literal — **a user-visible string outside the dictionary** |
| 2 | `ConversationPane.tsx:844` | `formatCount(bytes / 1024)` into a key **carrying no unit**, so an attachment reads `report.pdf · 240` — **a live defect** |
| 3 | `profile/driver/facts.tsx` | `fileSize` — the only correct one |

So this is not "one call site that works and might get a second". It is the third copy of a
question three files have already answered three ways, one of them wrongly. **Move it to
`src/lib/format`, with `fileSize` as its first consumer and `ConversationPane` as the defect it
fixes on the way.** Withdrawing J would leave a formatter for a general-purpose value in an
entity-specific barrel, which is how the next consumer imports `profile/driver` to render an
email attachment.

**Two things are ruled now so the move does not reopen them:**

- **1024-based, `KB` / `MB`, uppercase.** The build chose this over my illustrative `240 kB` on
  the grounds that *"a third byte convention in one product costs more than a casing that
  differs from an example"*, and it is right twice over: it matches the existing consumers, and
  `kB` is strictly the SI decimal prefix, so labelling 1024-based values `kB` would have been
  wrong as well as inconsistent. **My example is corrected, not the code.**
- **The unit is a key, never a template literal**, and the number goes through `formatCount` /
  `formatDecimal` — Western digits in both languages (§9.2). `Math.max(1, …)` on the KB branch
  stays: a 300-byte file reads `1 KB`, because `0 KB` on a file that exists is a wrong fact
  rather than a rounded one.

**C — a document permission is a product question, not a design one.** Owner:
**product-owner**. §6.3 gates the scan behind `view_operations` because that is the permission
already gating the Compliance route where the same scan lives. Whether an identity scan
deserves a narrower permission of its own — and whether opening one should be audited — is a
scope decision. **I have not minted a permission and will not.**

**D — the third entity type has no summary grammar.** Owner: **product-designer** (me), on the
next wave. §4.8 item 2: after D-CP-3 the rider and captain summary blocks are permanently two
components with two rules, and nothing tells a corporate account or an applicant which to
follow. Recorded now so it is a decision later rather than a coin-flip.

**E — the accordion caret against §9.1 row 9.** Owner: whoever owns §9.1's glyph table.
D-CP-8. §4.7 sanctions the accordion caret and §9.1 reserves the trailing caret for menus.
I have read §4.7 as the more specific rule; the fallback is `+` / `−`. **Raised, not assumed.**

**F — `NavigateControl` changes alignment, and one of its props stops being used.** Owner:
**frontend-engineer**. `justify-end`/`items-end` → `justify-start`/`items-start`, and
`variant='default'` has no call site on this screen after D-CP-6. Leave the prop or remove it,
but if it stays, say what for — an unused variant on a two-consumer component is how a third
consumer picks the wrong one.

**G — the primary is green by ruling, not by accident.** Recorded for the owner:
`globals.css` sets `--primary: var(--ev-brand)` `#0c6944` with a written amendment to R2
(*"it is now green, and that is not 'Save is green', it is 'primary is green'"*, white on it
6.731 : 1) and a stated one-line reversal path. So the button in the screenshot is the
product's primary rendering correctly. §4.6 removes it for being **filled**, not for being
green, and no token changes.

**H — `compact:` variants that have never fired.** Owner: **frontend-engineer**. §4.4 deletes
five on `DriverProfile` / `DriverRail`. Worth a grep across `profile/` for the same pattern:
any `compact:` rule inside a component that only ever renders in a 480px panel is dead, and
dead responsive code reads as live responsive code to the next person.

### Owner amendment 2 — new findings

**K — `useScreenViews` needs a home outside Financials.** Owner: **utilities-engineer**. It is
exactly the hook §4B.2 needs — declared views, a default, an unknown-value fallback, one writer —
and it already has **six** call sites, so the three-call-site test was met before this screen
existed. It lives in `screens/financials/shared/views.ts`, which is the wrong home for a seventh
consumer outside Financials: the next screen that wants it will either import across a module
boundary or re-implement the fallback, and two fallbacks is how one of them stops matching.
**Move it to `src/hooks/`, unchanged.** Until it lands the captain page may import it where it
is; it may **not** write its own. Its `ScreenViews.tabs` returns `ToolbarTab[]` for `DataTable`'s
toolbar and the captain page needs `{id, label}` — the same two fields, so no signature change is
required, only the import path.

**L — the sheet's tab is lost on `Open full profile`.** Owner: **frontend-engineer**, deferred by
me. §4B.4. An operator on the sheet's `Earnings` tab lands on the page's `Documents` tab. The fix
is one prop — the sheet's active tab lifted from `DriverPanels` to `DriverProfile` and threaded
to `DriverFooter`'s href as `withView('', activeView)` — but `DriverFooter` is rendered by
`ProfileLayer.tsx`, which `profile/driver/index.ts` states in terms is *"not edited by this
task"*. **Do not build it inside this wave.** Recorded so it is a decision later rather than a
papercut nobody names.

**M — `AbsentLine` is not exported from `fields.tsx`.** Owner: **the profile surface's owner**,
via the coordinator. §4B.7's payout block needs it (`fields.tsx:267`, currently module-private)
because an unlabelled line cannot carry an inline `Not recorded`. **One export, no signature
change.** *Fallback if refused:* the captain's payout block renders the identical markup locally
from the same key, `profile.field.absentMany`, and the duplication is recorded as a known defect
against this request rather than hidden. **Do not invent a third wording and do not drop the
absence line** — a silently missing bank name is §3.5's exact prohibition.

**N — the addressability axis, and the third entity type.** Owner: **product-designer** (me), on
the next wave. §4.8 item 2 already records that after D-CP-3 the rider and captain summary blocks
are permanently two components with two rules. D-CP-11 adds a second dimension: the captain's
page addresses its sections and its sheet does not, and nothing tells a corporate account or an
applicant which side of either line it is on. **And a live risk with it**: if the owner later
asks for the rider page to be tabbed, the two records converge again and §4.8 item 1 returns in
full. That is not avoidable by choosing different tab names today; the mitigation is that the
records hold different collections, so the tabs would still hold different sections.

**O — the four provenance fields were modelled and rendered nowhere, and one of them is the
point.** Owner: **product-designer** (me) — **closed by §6.2a**, recorded because the sequence
matters. `dateSource`, `recordedAt`, `recordedByUserName` and `previousExpiresOn` shipped on
`ComplianceDoc` for a viewer whose spec did not render them; the builder built the spec as
written rather than improvising a third block, which is right, and raised it. **The gap was
mine.** The data layer's own note — *"whether `auto-default` earns a badge, a caption or nothing
is product-designer's call under R7"* — is answered in §6.2a: **no badge, an ink rank and a word,
in both the expansion and the collapsed row.** Related: **finding I** (the undocumented 14-day
band) is unchanged and still open with product-owner; §6.2a prints Compliance's 7/30 boundaries
and nothing else, exactly as ruled.

**P — `standingFlags` is missing a condition that stops a captain being paid.** Owner:
**frontend-engineer**, ruled in §4B.5 and buildable now. `standingFlags` admits
`bankAccountLast4 === null` and `payout.state === 'failed'` on the stated grounds that both
*"stop the captain being paid"*, and omits `driver.bank.status !== 'Verified'`, which stops it by
the same mechanism. **This is a defect on its own terms, independent of tabs**, and it is the
reason §4B.5 can move the payout account off the always-visible surface without losing the gate.

### Owner amendment 3 — new findings

**Q — the bytes read's contract, stated as four outcomes the design distinguishes.** Owner:
**mock-data-engineer**, already in flight. I do not name the operation id, the function or the
route — that is the seam's to choose, and `drivers.ts` has already written the shape in its own
comment (*"a streaming read of their own, keyed by `ComplianceDoc.id` and permitted
separately"*). What the design needs is that **these four are separable at the client, not
collapsed into one `catch`**:

| Outcome | What the slot renders | Retry? |
|---|---|---|
| bytes | D / D′ | — |
| `403` | B's refusal sentence, in place of the frame | no |
| `404` **on a document whose record carries a `file`** | F — `The record lists a scan that is no longer in storage.` | **no** |
| any other failure | E — `Couldn't load this scan. Try again.` | **yes**, exactly one request |

**`403` and `404` are opposite diagnoses and an operator acts differently on each**, which is
the whole reason they are not one error state. A generic `catch` that renders E for all three
would tell an operator to retry a permission they do not have and a file that does not exist.
Two further asks: the read must accept an `AbortSignal` (AC-CP-128), and `?mockFail=` must be
able to produce **each** of the three failures independently, or three of the six states are
untestable and will rot — `states.md`'s last line, exactly.

**One thing I am NOT asking for: a page count.** §6.5a.6 rules page-through out of Eyvar, so a
`pageCount` field would render nowhere. If it arrives for another reason it is welcome; **do
not add it for this screen.**

**R — the download's permission is finding C's second half, and C is now consequential.**
Owner: **product-owner**. Finding C asked whether an identity scan deserves a permission
narrower than `view_operations`, and whether opening one should be audited. **The download
does not add a question — it raises the stakes on that one**, because §6.5a.5 establishes
there is no client-side boundary between *seeing* a scan and *keeping* one: once the bytes are
in the browser, a download is a screenshot with better metadata. Two things follow that the
owner should decide together rather than one at a time:

1. **One permission or two?** The build ships one boolean gating both controls and mints no
   constant. If the answer is two, `profile.driver.documents.downloadRefused` is already
   written (§8.1b, held) and the second boolean is one prop.
2. **Where does an audit event fire?** If opening a scan must be audited, it fires at the
   **fetch**, not at the tab — and note the consequence of §6.5a.4: for an image the fetch
   happens on **expansion**, so an audit keyed to the fetch records *"looked at the row"*, not
   *"opened the scan"*. If the owner wants the narrower event, the preview must move behind a
   control and §6.5a.4's ruling is reopened. **That is the one answer that would change this
   design, and it is why the question is asked here rather than after the build.**

**I have still minted no permission and will not.**

**S — `NavigateControl` is not the component for these two, and nothing else is either.**
Owner: **frontend-engineer**, buildable now. `NavigateControl` renders a permitted-or-refused
**link to a route** and §5.3 already changed its alignment for this surface. `Open scan` and
`Download` are permitted-or-refused **buttons that are not routes**, and they share exactly one
thing with it: §11.2's refusal shape — disabled in place, reason as real text,
`aria-describedby`-linked, never hidden. **Do not widen `NavigateControl` to cover both**; that
is how a two-consumer component grows a `variant` nobody can pick correctly (finding F, one
size larger). If the §11.2 shape wants extracting, extract *that* — the disabled control plus
its linked reason — and let both call it. **Two call sites is not three; do not promote it to
`src/lib` yet.**

**T — one shipped string refuses the wrong object, and it is not a copy nit.** Owner:
**frontend-engineer** for `copy.ts`, **i18n owner** for the Arabic. §8.2a.
`profile.driver.refusal.viewDocument` says *documents* where only the *scan* is ever refused,
and the expansion it appears to be refusing is one the spec deliberately never gates. **Fix it
in the same change that declares §8.1b**, not after — an operator hitting the new refusal
should never see the old wording.

---

## 12. Acceptance criteria

Testable, numbered, QA-owned. They **add to** `people-rider-profile.md` §15 for the captain
record; nothing there is repealed.

### The band — D-CP-1

1. **AC-CP-01** Both surfaces render the band as **four rows**: eyebrow, name, person meta,
   vehicle meta — in that DOM order, from one pair of builders (`bandPersonMeta`,
   `bandVehicleMeta`) called by both.
2. **AC-CP-02** **AMENDED — owner instruction, §4.1.1.** The person row contains exactly **two**
   items — the rating and the city — with **one** `bg-hero-line` separator between them.
2a. **AC-CP-02a** The rating renders as five glyphs plus the figure. The glyphs take
   `currentColor`; empty glyphs are the same colour at reduced opacity and **no second hue and
   no new token appears**. `Math.round(rating)` glyphs are filled.
2b. **AC-CP-02b** The glyphs **and** the visible figure are `aria-hidden`, and exactly one
   `sr-only` node carries `Rated {n}`. A screen reader announces the value **once**.
2c. **AC-CP-02c** `rating === null` renders `No rating yet` in words. **Five empty glyphs never
   render.**
2d. **AC-CP-02d** Under `dir="rtl"` the star run reverses with the document and the figure sits
   at its inline-end. Digits are Western in both languages.
3. **AC-CP-03** The vehicle row renders `Driver.vehicle` verbatim followed by the vehicle
   class, at `text-xs text-hero-label`, with `aria-hidden` `·` separators and **no**
   `bg-hero-line` rule.
4. **AC-CP-04** **RESTATED, not renumbered — the band may shed facts; the RECORD may not.**
   Every fact that was in `bandMeta` before this change renders somewhere on **both** surfaces
   after it, across every driver fixture. Specifically: the tier and the joined date render in
   `identityFields()` on the sheet's `Identity` tab and in the page's `Identity` side card.
   *(This previously read "six items in, six items out", which stopped being true when the owner
   took two facts off the person row. It was always the record, not the row, that the criterion
   was protecting.)*
4a. **AC-CP-04a** `DRIVER_TIER` has at least one consumer. **A captain's tier is never absent
   from the profile** — deleting the band's copy without adding `identityFields()`' would have
   removed it from the product entirely.
4b. **AC-CP-04b** The tier does **not** render in `Standing`. `standingFlags` lists conditions
   against a captain, never attributes of one.
4c. **AC-CP-04c** *(QA method, not a product behaviour.)* Every negative assertion about the
   band is **scoped to the band element**. A document- or dialog-wide `queryByText` for the
   tier or the joined date **must fail** — they are on screen by design, one scroll down.
5. **AC-CP-05** Under `dir="rtl"` both meta rows read inline-start to inline-end, every part is
   `<bdi>`-isolated, and no element uses `border-l` / `border-r`.

### The summary — D-CP-2, D-CP-3

6. **AC-CP-06** **No captain surface renders the four summary blocks in a single column, at any
   viewport width.** The sheet is 2×2; the page is 2×2 below `--ev-bp-wide` and 4-across at and
   above it.
7. **AC-CP-07** The block order is Standing → Documents → Earnings → Slots in DOM order on both
   surfaces, and reads row-major in both `dir="ltr"` and `dir="rtl"`.
8. **AC-CP-08** **The criterion is about the inline axis only.** Grid dividers on the **inline**
   axis are `border-s` / `border-e`; a `border-l` or `border-r` on a cell fails. Dividers on the
   **block** axis are `border-t` / `border-b` and that is **correct, not a compromise** — see
   §10.1. A `border-t` on a cell **passes**.
9. **AC-CP-09** `SummaryBlock`'s heading computes to `--ev-ink` at `font-medium`, `--text-xs`.
   It is **not** `uppercase` and carries **no** `letter-spacing` (D18).
10. **AC-CP-10** No spacing value in `SummaryBlock`, `DriverRail` or `DriverStrip` is off the
    4px grid, and **no type size changes** as part of D-CP-2 or D-CP-3. A diff that shrinks a
    type token fails on sight.
11. **AC-CP-11** Every block still owns its own four states: a failed compliance read leaves
    Standing, Earnings and Slots rendering, and the sheet dismissible.

### The sheet's geometry — D-CP-4

12. **AC-CP-12** `DriverProfile` renders **one column** at every width. Grep for `compact:` in
    `src/components/profile/driver/` returns nothing.
13. **AC-CP-13** At 480px, on all four tabs, at viewport 1280 and 1440, in `dir="ltr"` and
    `dir="rtl"`, **no descendant of the sheet reports `scrollWidth > clientWidth`.** This is the
    rider spec AC-RP-70b sweep, re-run on this surface.
14. **AC-CP-14** The four-tab row (`Documents 5 · Earnings · Activity 21 · Identity`) fits on
    one line at 480 with no horizontal scroll.
15. **AC-CP-15** `--ev-drawer-w`, `globals.css`, `ShellLayer` and `sheet.tsx` are **unchanged**
    by this screen.
16. **AC-CP-16** The seam between the summary and the tab column is a **block-axis** rule. No
    inline-axis border separates them.

### The document list — D-CP-5 and §5

17. **AC-CP-17** Rows are ordered by `expiresOn` **ascending**, with `DOC_ORDER` as the
    tie-break for equal dates. Ordering is deterministic across renders.
18. **AC-CP-18** `soonestDocument()`'s document is **row 1**, on every fixture, and the
    Documents block's caption names it.
19. **AC-CP-19** The Compliance view's table still uses `DOC_ORDER`. Changing the profile's
    order does not change it.
20. **AC-CP-20** Each row renders **two lines**: line 1 the label and the caret; line 2 the
    badge, the date and the countdown, **all starting at the inline-start**.
21. **AC-CP-21** No row uses `flex-wrap` with `justify-between`. Nothing in a row lands at the
    inline-end except the caret.
22. **AC-CP-22** The row's outer block padding is **four times** its inner line gap (`py-2`
    against `gap-y-0.5`), and both values are on the shipped spacing scale.
23. **AC-CP-23** At 480 every document row occupies exactly two lines for all five document
    labels, in English and in Arabic, with no third line and no clipping.
24. **AC-CP-24** The five badges align on one inline-start edge.
25. **AC-CP-25** `critical` and `expiring` render the **same** `warning` tone and differ only
    by label (R17). No document row renders red, and no row carries a `RowCriticalMarker`.
26. **AC-CP-26** The date and the countdown are two `<bdi>` runs with an `aria-hidden`
    separator between them. No joined string.

### The list's link — D-CP-6

27. **AC-CP-27** `Open compliance file` is `variant="link"`, at the list's **inline-start**,
    directly beneath the last row, inside the list's own block. **No `variant="default"`
    button renders anywhere on either captain surface, in any state.**
28. **AC-CP-28** Refused, it is a **disabled control in place** with
    `Opening the compliance file needs the operations permission.` as visible text,
    `aria-describedby`-linked. It is never hidden and never a tooltip.
29. **AC-CP-29** The link renders in all five list states, including both empties.

### The viewer — §6

30. **AC-CP-30** **There is exactly one document-row implementation and one viewer**, in
    `DriverDocuments.tsx`, mounted by both surfaces. A second row or viewer implementation
    anywhere fails this criterion.
31. **AC-CP-31** **No `Dialog`, `AlertDialog`, `Sheet` or second `ShellLayer` mounts from the
    document list on either surface**, in any state (§5.5).
32. **AC-CP-32** The row is a single `<button>` carrying `aria-expanded` and `aria-controls`,
    and its accessible name includes the document's label.
33. **AC-CP-33** Expanding a second row collapses the first. At most one panel is open.
34. **AC-CP-34** An expanded panel is **never empty**: the derivation sentence renders in all
    four `ComplianceDocState` values, on every fixture.
35. **AC-CP-35** The derivation sentence matches the state — `expiring` → *30 days or fewer*,
    `critical` → *7 days or fewer* — and is one key per state, with **no string built by
    concatenation** (§9.6).
36. **AC-CP-36** The expansion does **not** restate the expiry date or the state word already
    on line 2.
37. **AC-CP-37** With `file === null`, the slot renders
    `No scan is stored for this document.` — **no tile outline, no glyph, no placeholder image,
    no em dash.**
38. **AC-CP-38** With `file !== null` the slot renders the **scan record**: glyph, `<bdi>` file
    name, `{kind} · {size}`, and the upload line — followed by
    `Only the scan's details are stored, not the file itself.` **The two states are visually
    distinguishable**: a bordered block with four facts versus one grey sentence.
38a. **AC-CP-38a** The scan record is **inert**. It is not a link, not a button, not in the tab
    order, carries no `↗`, no chevron, no underline, no hover fill and no pointer cursor.
38b. **AC-CP-38b** **AMENDED — the type removed the case.** `uploadedByUserName` is `string`:
    where `uploadedByUserId` is `null` the captain uploaded it from the driver app and the name
    is their own. So the upload line is one sentence with two named params, and **`Unknown`,
    `Anonymous` and `—` appear nowhere in it.** *(I specified a nullable uploader and a second
    key for it; the data models the case better, and the second key is struck.)*
38c. **AC-CP-38c** No `href`, `src`, `blob:` or asset path for a document scan exists in any
    governed file or fixture, and **no image of a document renders anywhere** (§6.5).
39. **AC-CP-39** *(Standing rule, unreachable today — do not build it until `href` ships.)*
    With a file that can be opened and **no** `view_operations`, the tile renders **disabled in
    place** with `Viewing a captain's documents needs the operations permission.` as visible
    text, distinguishable from AC-CP-37's absence.
40. **AC-CP-40** Expanding a row and reading the scan record are **never** permission-gated:
    an operator without `view_operations` sees every row's derivation and every scan record.
    `canOpenCompliance` is not read inside the expansion.
41. **AC-CP-41** The expansion adds **no read** while `file` arrives with the compliance
    response: it renders synchronously from data already in hand, with no skeleton, no
    independent error and **no spinner**.
41a. **AC-CP-41a** The derivation sentence prints Compliance's boundaries — **7 and 30** — in
    all four states, and **no surface prints a 14-day band**. See finding I.
42. **AC-CP-42** `Enter` and `Space` toggle a focused row. `Escape` with focus inside the list
    collapses the open row and does **not** close the sheet; a second `Escape` closes it.
43. **AC-CP-43** The caret is `aria-hidden`, is not focusable, and **does not mirror** under
    `dir="rtl"`.
44. **AC-CP-44** The expanded row's state is **not** written to the URL.
45. **AC-CP-45** No renew, upload, replace, extend, print or export control renders in the
    list or in any expanded panel, in any state.

### The ledger caption — §7

46. **AC-CP-46** The direction sentence renders **above the column headers and below the
    table's title** — as `DataTable`'s `caption`, or, under the §7 fallback, as a paragraph
    above the table with the defect recorded. It never renders below the table and is never
    truncated.
47. **AC-CP-47** The ledger's column headers are exactly `Date · Reference · Description ·
    Debit (SAR) · Credit (SAR) · Balance (SAR)`, from `ledgerColumns`, unrenamed (§8.3.3).
48. **AC-CP-48** The sentence is present in every state in which the table renders rows.

### The ledger's three empties — §9A.2

57. **AC-CP-57** `emptyKind` is computed from **`lifetimePostings`**, never from
    `totalPostings` and never from the row count. A captain with `lifetimePostings > 0` and a
    quiet window **never** renders `first-run`.
58. **AC-CP-58** With `lifetimePostings === 0` the table renders `first-run` with heading
    `No earnings have reached this captain`, body
    `A completed trip accrues earnings here, and a payout takes them out. Neither has
    happened.`, and one action `Back to payouts` — and **no illustration** (LR-3).
59. **AC-CP-59** With history, no filter and a quiet window, the table renders
    `No postings between {start} and {end}.` with **no action**, and the two dates match the
    window named in the subheading.
60. **AC-CP-60** With a search or filter narrowing to zero, the table renders
    `No postings match these filters.` with a clear-filters action — and it renders **instead
    of** AC-CP-59 when both a period and a filter are narrowing.
61. **AC-CP-61** The table **never** renders `emptyKind="cleared"`, and no `cleared` copy is
    declared for it (LR-4).
62. **AC-CP-62** `entity.driver.ledger.empty.heading`, `.body` and
    `entity.driver.ledger.noMatch` are **deleted**. Grep returns no consumer, and
    `Nothing has been posted yet` appears nowhere in the product.
63. **AC-CP-63** `DataTable` passes `illustration={null}` to `EmptyState` when
    `mode === 'ledger'`, so **no ledger anywhere in the product draws one** — the rider's
    wallet included.

### Tokens, states and Arabic

49. **AC-CP-49** No Tailwind palette class, no arbitrary value, no raw hex in any governed
    file. `/token-audit` passes.
50. **AC-CP-50** No new colour, no new token, no `globals.css` change originates from this
    spec. Every badge takes one of R7's five tones; **no element computes to `--ev-red`** on
    either captain surface.
51. **AC-CP-51** No physical-direction utility (`ml-` `mr-` `pl-` `pr-` `left-` `right-`
    `text-left` `text-right` `border-l` `border-r`) in any governed file.
52. **AC-CP-52** All four base states render on both surfaces and are reachable from a mock
    client that can be made to fail. Loading is a skeleton shaped like the content; **no
    `Spinner` mounts on either surface.**
53. **AC-CP-53** **No illustration renders anywhere on either captain surface, in any state** —
    including the payable ledger's `first-run`, which is heading + body + action and no picture
    (**LR-3**). Every **card- and section-scoped** empty is one grey sentence with no heading
    (R8). **The ledger's three empties are the documented exception to the "one sentence" half
    and not to the illustration half** — see §7.1 and AC-CP-57…62.
54. **AC-CP-54** Every interactive element has a visible `focus-visible` ring, including the
    document row and the file tile.
55. **AC-CP-55** Every state, condition and refusal is carried by a **word** as well as by any
    colour or glyph (§7.5).
56. **AC-CP-56** Every spacing value is on the 4px grid (D15). **`DESIGN.md` §6.2 D-2 is
    retired and is not cited anywhere in this screen's implementation** — a comment citing it
    fails this criterion.

---

### Owner amendment 2 — the page's tabs (D-CP-9, D-CP-10)

64. **AC-CP-64** The page renders **exactly four** tabs, in this DOM order:
    `Documents · Earnings · Activity · Identity`, from the four **existing** copy keys
    `profile.driver.tab.documents`, `profile.driver.tab.earnings`, `profile.driver.tab.activity`,
    `profile.section.identity`. **No tab label is minted for this screen**, in either language.
65. **AC-CP-65** The tab set on the page is the **same four ids in the same order** as
    `DriverPanels`' (`documents · earnings · activity · identity`). A diff that changes one
    surface's tab ids without the other fails.
66. **AC-CP-66** `/entity/DRV-0101?view=earnings` renders with the `Earnings` tab active **on
    first paint**, with no flash of another tab and no client-side redirect.
67. **AC-CP-67** With **no** `?view=`, the `Documents` tab is active and **the URL is not
    written to**. Landing on the page adds no history entry of its own.
68. **AC-CP-68** With `?view=nonsense`, the `Documents` tab is active, the page renders in full,
    and **the URL still reads `?view=nonsense`.** No rewrite, no 404, no empty panel (AC-12's
    posture, `useScreenViews`' fallback).
69. **AC-CP-69** Selecting a tab calls `withView` and **pushes**. Browser Back returns to the
    previously selected tab. `withView` is the **only** writer of `?view` reached from this
    screen — no `useSearchParams`, no hand-built query string, no `?tab=`.
70. **AC-CP-70** Opening a shell layer from this page (`?entity=…`) **preserves `?view=`**, and
    closing it preserves it again (AC-10, `withOverlay`).
71. **AC-CP-71** `routeState.ts`, `withOverlay`, `withView`, `globals.css`, `PageShell.tsx`,
    `sheet.tsx` and `components.json` are **unchanged** by this amendment. The captain page ships
    without a single edit to a shell- or token-owned file.
72. **AC-CP-72** The band, the `standingBanner` and `DriverStrip` render **outside** the `Tabs`
    root, above it, in that DOM order, and are visible on all four tabs. **No tab hides any of
    the three, at any width, in any state.**
73. **AC-CP-73** No cell of `DriverStrip` is a link, a button or otherwise in the tab order.
74. **AC-CP-74** The tab row is **one tab stop**. `←`/`→` move and activate; `Home`/`End` jump;
    under `dir="rtl"` the arrows reverse with the document and **no direction is hard-coded**.
75. **AC-CP-75** No `aria-controls` on a trigger dangles: every trigger with one points at a
    mounted `TabsContent` (the primitive's panel registry, P1-6).
76. **AC-CP-76** A tab whose section is empty is **still rendered and still selectable**, and a
    real count of `0` renders as `0`. **No tab is ever hidden or disabled.**
77. **AC-CP-77** Counts render on `Documents` and `Activity` only, from
    `tabCounts(reads, t, nowIso)` in `facts.tsx`, **called by both surfaces**. A count whose read
    is in flight renders a `Skeleton`, never `0`. A second derivation of either count anywhere
    fails this criterion.
78. **AC-CP-78** When the record read fails, the **tab row still renders and is still operable**,
    and the panel carries `ErrorState scope="card"` with `Try again`. Every tab remains
    reachable.
79. **AC-CP-79** At viewport 1280 and 1440, in `dir="ltr"` and `dir="rtl"`, on all four tabs,
    **no descendant of the page reports `scrollWidth > clientWidth`** — including the tab row and
    including the payable ledger, which must **no longer scroll horizontally at either width in
    either language** (§4B.0). This is AC-CP-13's sweep, run on the page.
80. **AC-CP-80** No section on a tab repeats that tab's own name. Specifically: the `Documents`
    tab renders no `SectionHeading` above `DriverDocuments`, and the `Activity` tab renders none
    above `DriverTimeline`.

### The rail is gone (D-CP-12)

81. **AC-CP-81** `DriverProfilePage` renders `SingleColumnPage`. **`DetailPage` is not imported**,
    no `rail` prop is passed anywhere, and the local `SideCard` component is deleted.
82. **AC-CP-82** All five former rail cards' facts render on the page, on a stated tab: payout
    account → `Earnings`; performance → the two figure rows; `Elsewhere in the console` →
    `Activity`; identity and device → `Identity`. **No fact leaves the record** (AC-CP-04's
    principle). Every negative assertion is scoped to the element, not the document.
83. **AC-CP-83** `standingFlags` returns `Bank account is pending verification` when
    `driver.bank.status === 'Pending verification'` and `Bank account was rejected` when it is
    `'Rejected'`, on **both** surfaces, and neither renders red or as a badge.
84. **AC-CP-84** `Identity` and `Device` render as `FieldList layout="grid"`, so eight identity
    facts occupy **three or fewer rows** in a 944px panel rather than eight.
85. **AC-CP-85** `PageShell.tsx` is unchanged (restated for emphasis — no new page shape, no new
    slot, no `below` band).

### Performance as figures (D-CP-13)

86. **AC-CP-86** **`MetricTile`, `MetricTileRow`, `BoardHero`, `Chapter`, `ChapterFigures` and
    `MetricTileItem` are not imported by any captain file.** No `Metric` object is constructed
    anywhere in `profile/driver/` or `screens/entity/`. Grep for `metrics` in either directory
    returns only `BoardBand` and `SectionHeading`, which the band and the section headings
    already use.
87. **AC-CP-87** **No `asOf`, `subTabId`, `category` or `drilldownRoute` value is fabricated for
    a captain fact.**
88. **AC-CP-88** The `Activity` figure row is `Rating · On time · Trips completed`; the
    `Earnings` figure row is `Earnings this month · Trips this period`. Both are built from
    `SummaryBlock` with `BlockFigure` / `BlockWord` / `BlockCaption`, on page ground: **no fill,
    no border, no divider, no shadow.**
89. **AC-CP-89** Both rows are `grid-cols-2` at **every** width, with `gap-x-6 gap-y-6`. There is
    no `compact:` and no `wide:` override on either. **AC-CP-06 is not engaged by this criterion**
    — it governs the four *summary* blocks, and a figure row is not one.
90. **AC-CP-90** `Last trip` renders as the **caption** on `Trips completed`
    (`Last trip {date}`), never as a figure of its own. **No timestamp renders at figure rank
    anywhere on either surface.**
91. **AC-CP-91** `Subscription slots` renders **once per surface**, in `CapacityBlock`. `4 of 5
    slots taken` appears exactly once in the rendered document.
92. **AC-CP-92** `performanceFields` is deleted and replaced by `drivingFigures` and
    `periodFigures`, **both called by both surfaces**. A second builder or a surface-specific
    variant of either fails.
93. **AC-CP-93** `profile.driver.card.performance` is deleted; grep returns no consumer, and the
    word `Performance` renders nowhere on either captain surface.
94. **AC-CP-94** Absence renders **in place of the figure**, never beneath it and never as `0` or
    `—`: `rating === null` → `Not yet rated`; `onTimePercent === null` → `Not enough history`;
    `totalTrips === 0` → `No trips yet`; `payout === null` → `No payout period yet`.
95. **AC-CP-95** No type token changes and no spacing value in a figure row is off the 4px grid
    (`px-0` and `py-0` are permitted; `0` is on every grid). **A diff that shrinks a type token
    fails on sight, and a comment citing D-2 fails AC-CP-56.**

### The payout account block (§4B.7)

96. **AC-CP-96** The block renders a `StatusBadge` first, then the bank name, the account holder
    and the IBAN as **three unlabelled lines**, then one caption. **It renders no `<dl>` and no
    `label … value` row.**
97. **AC-CP-97** Each of the three lines is `<bdi>`-isolated and the IBAN carries `tabular-nums`
    and does **not** flip under `dir="rtl"` (R4, AC-73).
98. **AC-CP-98** Any absent line among the three is named beneath the block —
    `Not recorded: Bank, Account holder, IBAN` — **at a threshold of one, not three.** A captain
    with no bank renders the heading, the badge and that one line, and nothing is silently
    missing (§3.5).
99. **AC-CP-99** `Rejected` is `neutral` and `Pending verification` is `warning`. **No element in
    the block computes to `--ev-red`** (R5a, R7).
100. **AC-CP-100** `Last payout` does **not** render in this block. `Last paid {date}` /
     `Never paid` renders once per surface, in `EarningsBlock`.
101. **AC-CP-101** The block sits at the **end** of the `Earnings` tab, after `Deductions` and
     immediately above `Open payouts`, on both surfaces.
102. **AC-CP-102** `DriverSupportPresenceCard` renders all nine rows unchanged, including every
     `None`. **No row is folded into a summary line** (§4B.7's recorded refusal).

### Document provenance (D-CP-14, §6.2a)

103. **AC-CP-103** An expanded row renders, in this DOM order: the provenance line; the
     replacement line when `previousExpiresOn !== null`; the file slot; the derivation sentence.
     **The panel is never empty in any of the twelve `dateSource` × `state` combinations.**
104. **AC-CP-104** The provenance sentence matches `dateSource` and is **one key per value with
     no string built by concatenation** (§9.6). The `auto-default` variant has **one** named
     param and no `{name}` slot.
105. **AC-CP-105** **`Unknown`, `Anonymous` and `—` appear nowhere in the provenance line**, in
     any branch, on any fixture.
106. **AC-CP-106** The `auto-default` provenance sentence computes to `--ev-ink`; the other two
     compute to `--ev-text-2`. **No new token, no badge and no tone is introduced by this
     distinction.**
107. **AC-CP-107** With `dateSource === 'auto-default'`, line 2 of the **collapsed** row carries a
     third run reading `Date auto-filled`, after an `aria-hidden` separator, at `--ev-ink`. It
     renders in **all four** `ComplianceDocState` values — `Valid` included, which is the case
     this exists for.
108. **AC-CP-108** With any other `dateSource`, that run **does not render at all** — not empty,
     not hidden, not present.
109. **AC-CP-109** The row still occupies **two lines** at 480 in both languages with the third
     run present. **AC-CP-23 is amended by this criterion and by nothing else.**
110. **AC-CP-110** `ComplianceDocState` is unchanged by provenance: an `auto-default` document
     whose expiry is more than 30 days out still renders the `Valid` badge at the `success` tone.
     **No second badge renders on any document row** (AC-CP-25 restated).
111. **AC-CP-111** `recordedAt` renders at `day-month-year`, is `<bdi>`-isolated, and is never
     the same value as `expiresOn` or `file.uploadedAt` on any fixture where the three differ.
112. **AC-CP-112** `profile.driver.documents.expand` and `.collapse` are **deleted**; grep
     returns no consumer. `profile.driver.documents.fileMeta` is **never declared**.

### Tokens, states and Arabic — restated over the new surfaces

113. **AC-CP-113** Every criterion in AC-CP-49 … AC-CP-55 holds on all four tabs and in every one
     of their states. Specifically: no palette class, no arbitrary value, no raw hex; no new
     colour or token; no physical-direction utility; all four base states per section; a visible
     `focus-visible` ring on every trigger and every link; and every state, condition and refusal
     carried by a **word** as well as by any colour or glyph.
114. **AC-CP-114** **No illustration renders on any tab, in any state** — AC-CP-53 unchanged, the
     ledger's `first-run` included.
115. **AC-CP-115** Every Arabic value in §8.1a exists before merge, and the four `source.*`
     sentences take Arabic punctuation with Western digits (§9.2). **No sentence in them is built
     by joining translated fragments.**

### The scan — preview, open and download (D-CP-15, §6.5a)

#### The two presentations

116. **AC-CP-116** `Open scan` opens a **new browser tab** on **both** surfaces. **No `Dialog`,
     `AlertDialog`, `Sheet`, `Popover` or nested `ShellLayer` is mounted by either control, on
     either surface.** A page-only modal fails this criterion even if it works.
117. **AC-CP-117** Nothing in this section adds a scrim, moves focus, or traps focus.
     `DESIGN.md`:4036-4041 is not engaged: the sheet still does not trap and the page still has
     nothing to trap. **A test that opens the scan and asserts focus is unchanged passes.**
118. **AC-CP-118** `Escape` behaviour is byte-for-byte §6.6's: one press collapses the expanded
     row, a second closes the sheet. **Neither control adds a third level.**
119. **AC-CP-119** `Open scan` works on the **first** click, in both surfaces and both
     `mimeType` branches, with no blocked popup, no second click and no interstitial. Verified
     for a PDF, where the bytes are **not** in hand at click time.

#### The preview

120. **AC-CP-120** The file slot renders **exactly one** leading visual: the preview frame when
     `file.mimeType` is `image/jpeg` or `image/png` **and** the operator is permitted; the `▤`
     glyph in every other case. **Never both, never neither.**
121. **AC-CP-121** The frame is **240 × 160**, `object-fit: contain`, `bg-muted`,
     `border-border`, and is **identical on the sheet and the page**. No horizontal composition
     renders at the page's wider column. Both figures are on the 4px grid and **D-2 is not
     cited** (AC-CP-56).
122. **AC-CP-122** **No preview frame renders for `application/pdf` in any state** — not an
     empty one, not a placard, not a format chip in a box. `A PDF has no preview. Open the scan
     to read it.` renders in its place.
123. **AC-CP-123** No `<iframe>`, `<embed>`, `<object>` or PDF-rendering dependency is added.
     Grep for `pdfjs`, `pdf.js`, `<embed` and `<iframe` returns nothing new.
124. **AC-CP-124** The preview never renders in the **collapsed** row. AC-CP-109's two-line
     geometry at 480 holds unchanged in both languages, with and without `Date auto-filled`.
125. **AC-CP-125** §6.2a's DOM order is unchanged — provenance, replacement, file slot,
     derivation. **The preview adds nothing outside the file slot**, and the provenance sentence
     is still the first thing in the panel.

#### The fetch

126. **AC-CP-126** **No request is made** on list load, on collapse, for any collapsed row, or
     on expanding a row whose `file` is `null`. A captain with five documents and no files
     costs **zero** requests, however many rows are expanded.
127. **AC-CP-127** Expanding a row with an **image** file and the permission makes **exactly
     one** request. Expanding a row with a **PDF** makes **none** until a control is clicked.
128. **AC-CP-128** Collapsing an expanded row **aborts** an in-flight read via the seam's
     `AbortSignal`. No state update lands after collapse.
129. **AC-CP-129** The image-versus-PDF branch reads **`file.mimeType`, the record's field** —
     never the response's content type. It is therefore decided before the read resolves, and
     **nothing changes position when the bytes arrive.**
130. **AC-CP-130** Object URLs are revoked when the expanded row unmounts, **never on click**.
     No leak, and no tab that fails to load because its source was revoked underneath it.

#### The two controls

131. **AC-CP-131** Both are `Button` at the **default `secondary`** variant, `size="default"`,
     at the inline-start of the slot's last row, `Open scan` first, `gap-2`. **Neither is
     filled** — a diff setting either to `variant="default"` fails on sight (D-CP-6).
132. **AC-CP-132** `Open scan` carries a trailing `↗` that **does not mirror** under
     `dir="rtl"`. It is the only glyph added by this section.
133. **AC-CP-133** `Download` writes a file named `file.name` **verbatim** — untranslated,
     untransliterated, digits unnormalised — in both languages. Verified on `DRV-0201`'s two
     Arabic filenames, one with Arabic-Indic digits.
134. **AC-CP-134** **No toast fires** for any act in this section. §8.4 is unamended: neither
     captain surface mutates anything, and the browser's own download UI is the confirmation.
135. **AC-CP-135** Both controls render in **every** state, enabled or disabled. **Neither is
     ever hidden** (§11.2).

#### Accessibility

136. **AC-CP-136** The frame is `aria-hidden="true"` and `tabIndex={-1}`; its `<img>` carries
     `alt=""`. **No descriptive alt text is generated from the file name, the document type or
     anything else.**
137. **AC-CP-137** An expanded row adds **exactly two** tab stops. The frame is a redundant
     mouse target and is never focused, so §7.2's visible-focus rule is satisfied by the two
     buttons and never applies to it.
138. **AC-CP-138** The accessible name of `Open scan` is `Open scan: {document}` and **contains
     the visible label contiguously** (WCAG 2.5.3). Same for `Download`. Both come from **one
     key with one named param**; neither is built by concatenation (§9.6, AC-73, AC-75).

#### The six states

139. **AC-CP-139** All six states of §6.5a.8 are reachable and **no two share a string**:
     `file === null`, refused, loading, bytes, failed, and gone. Conflating any two fails (V-2,
     `states.md`).
140. **AC-CP-140** **A versus E is exact.** `No scan is stored for this document.` renders only
     when `file === null`; `Couldn't load this scan. Try again.` renders only when a record
     carrying a `file` could not be fetched. **Neither string ever renders for the other's
     condition.**
141. **AC-CP-141** Refused: **no request is made**, both controls are disabled **in place**
     with `Opening a captain's scans needs the operations permission.` as **real text**,
     `aria-describedby`-linked, **never hidden and never a tooltip**. **One sentence serves both
     controls**, not two stacked copies.
142. **AC-CP-142** A `403` from the read renders **the same refusal sentence and the same
     disabled controls** as the flag-refused branch, in place of the frame.
143. **AC-CP-143** Failed: the frame is replaced by a card-scoped error with `Try again`; **the
     record row still renders**; `Try again` re-issues **exactly one** request.
144. **AC-CP-144** Gone: `The record lists a scan that is no longer in storage.` renders with
     **no `Try again`** and **no invented remedy**. A retry control here fails.
145. **AC-CP-145** Loading is a **`Skeleton` of the frame's exact 240 × 160 box, never a
     spinner** (§11.3), with both controls disabled and **no reason sentence**. **A PDF renders
     no frame skeleton**, because a PDF never has a frame.

#### Tokens, copy and Arabic

146. **AC-CP-146** Nothing added by this section computes to `--ev-red` (R5a), introduces a
     sixth badge tone (R7), or renders an illustration (R8 — the preview is a record, not art).
     No new token, no palette class, no arbitrary value, no raw hex, no physical-direction
     utility.
147. **AC-CP-147** `profile.driver.refusal.viewDocument` reads `Opening a captain's scans needs
     the operations permission.` in English **and says *scans*, not *documents*, in Arabic**
     (§8.2a). The old wording renders nowhere.
148. **AC-CP-148** `profile.driver.documents.downloadRefused` is **not declared** while one
     boolean gates both controls. Grep returns no key and no consumer.
149. **AC-CP-149** Every key in §8.1b has an Arabic value before merge. `A PDF has no preview.
     Open the scan to read it.` **quotes the Arabic control label**, not the English one.
150. **AC-CP-150** The preview frame's position mirrors under `dir="rtl"`; **its contents never
     do.** No `transform: scaleX(-1)`, no `rtl:` flip, on the frame or the `<img>`. A mirrored
     national ID fails.

---

## 13. OWNER AMENDMENT 4 — the explanatory sentences, and the ⓘ that is refused

**Date** 2026-09-04. **Instruction, verbatim:** *"I want you to read the driver and rider,
pages, and sheets and remove any un neded comments or really secondary and add them in an i
icon with a tool tip to tell that info"*. **"Comments" means the on-screen explanatory
sentences**, not code comments. Four surfaces: this page, this sheet, and the rider's two
(`people-rider-profile.md` §16, written in the same pass and ruling identically).

**A builder waiting on this needs two things and they are §13.2 and §13.3.** §13.2 is the
affordance ruling — *there is no ⓘ*. §13.3 is the delete / move / stay table. Everything
after that is the argument, the copy and the criteria.

### 13.1 The test, stated once, and applied to everything below

The owner's request contains two instructions and they are in the right order: **remove the
unneeded** first, **then** demote what is left. Almost everything falls to the first one, and
a sentence nobody needed does not become needed by being hidden.

> **The removal test.** Delete the sentence and read the figure again. If the figure still
> means exactly one thing, the sentence was **commentary** — delete it. If the figure now
> means two things, the sentence is **the answer** — it stays, visible, in ordinary text.

Four corollaries, and between them they decide every string on all four surfaces:

| | Rule | Consequence |
|---|---|---|
| **A** | **The disclosure test.** A string that renders only inside an expanded accordion row is **already demoted**. | Everything in §5, §6, §6.2a and §6.5a is out of scope. **The accordion is the ⓘ**, and it is a better one — it is a real `<button>` the product already ships, it works on touch, it is announced, and it costs one tab stop for the whole row rather than one per sentence. Nothing is demoted twice. |
| **B** | **The sole-content test.** A string that is a block's entire content stays. | `No conditions on this record.` is the `Standing` block when a captain is clean. Demote it and the block is an empty box with a heading. Same for every `*.empty`, `documents.none`, `support.none`. |
| **C** | **The conditional-fact test.** A string that renders only when an uncommon condition is true is a **fact about this record**, not chrome. | `Multi-subscription exception granted` renders on the captains who have one. `Bank account was rejected` renders on the accounts that were. These are not clutter; they are the reason to open the record. |
| **D** | **The always-on test.** A string that renders on *every* record, in *every* state, under a figure whose own label already names it — **that** is what the owner is looking at. | Exactly one family on this surface qualifies: the four notes under the Earnings tile's money lines. That is the whole of the problem, and §13.3 deletes it. |

**Evidence, because this is a judgement and the reference settles it.**
`08-finances/finances-overview-earnings-donut-and-payouts.webp` puts three money figures on
one row — `Net sales $19.00`, `Gross profit $9.00`, `Gross margin 47.37%` — and **none of the
three carries a definition.** The one second line on that row is
*"3 out of 5 items sold had product costs. Add cost per item"*, which is a **data-completeness
caveat with a link**, not an explanation of what gross margin is. Same on
`02-orders/orders-list-with-metrics-row.webp`: seven metric tiles, muted label + figure +
sparkline, **zero captions**. Same in the dossier — `04-customers/customer-detail-no-orders-yet.webp`'s
rail runs `Contact information` / `Default address` / `Marketing` / `Tax exemptions` / `Notes`,
and every second line under every heading is a **fact** (`Will receive notifications in
English`, `Email not subscribed`, `No exemptions`), never a definition. **Not one ⓘ in the
whole dossier.**

And the sharpest one: `03-products/product-edit-pricing-inventory-shipping.webp` shows the
circled `?` on `Compare-at price` and `Cost per item` — **inside the input**, on a field — while
`Profit $5.00` and `Margin 33.3%`, the two **derived, read-only** values on the same card, carry
**no ⓘ and no caption at all.** The reference's help icon is a *field* affordance. Its
read-only figures get nothing.

### 13.2 THE AFFORDANCE RULING — D-CP-16: no tooltip and no popover on either captain surface

> **D-CP-16.** Neither captain surface carries a tooltip, a popover, a hover card or a `title`
> attribute that holds an explanation. The product's one tooltip is `ReturnControl`'s, which
> names a destination in three words, and it stays the only one. Secondary prose is **deleted**
> or **compressed to one line of ordinary text**; where genuine disclosure is wanted, the
> mechanism is the **accordion row this spec already ships** (§6.1), not a new icon.

Seven reasons, each citable, worst first.

**1 — Touch has no hover, and this console runs on tablets.** A hover-only fact is a fact that
does not exist on a tablet. That is not a styling preference; it is a fact being conditional on
an input device. §5.0's table (`surfaces.md`) has **no row** for "explain a value" and exactly
one tooltip row: *"Naming an icon-only control."*

**2 — Keyboard: the summary costs zero tab stops today, and this would make it three.**
`DriverBlocks.tsx`, `SummaryBlock.tsx` and `RiderRail.tsx` contain **zero** `<button>`, `<a>`,
`<Button>` or `<Link>` — verified by grep. On the page the strip sits **above the `TabsList`**
(D-CP-9, `DriverProfilePage.tsx:330`), so three ⓘ buttons would put three help controls between
the band and the tab row **on all four tabs, permanently**. An operator moving from the record
header to `Documents` would cross them every time. A sentence costs a glance you can skip; a
button costs a keystroke you cannot. **This is a worse outcome than the sentences, and the
owner has not been told that.**

**3 — It demotes the fact for sighted operators only.** To be announced with the figure the
text must be `aria-describedby`-linked, at which point it is announced **always** and the
demotion is purely visual. Leave it unlinked and the screen-reader operator loses it entirely.
Either way the ⓘ inverts §7.5, whose whole content is that the word is the carrier.

**4 — It contradicts the one tooltip this product already ships, from ~200px away.**
`src/screens/entity/ReturnControl.tsx` renders on **this page's own band**, and its file states
the rule in force: *"§5.7 — the tooltip NAMES the control. It carries no constraint and no
explanation, and the same string is the `aria-label`, so a keyboard or screen-reader operator is
not told less."* Two tooltips on one band, one naming a control and one carrying a paragraph,
teach an operator that a tooltip means nothing in particular.

**5 — Three binding §8 rules already forbid a tooltip in the two nearest cases.** These are
§8, not §1–§5, so they bind:
- `DESIGN.md:5030` — *"The governing formula … MUST NOT be disclosed in a tooltip (§5.7), a
  modal, or helper text under a single field."*
- `DESIGN.md:5690` — *"The reason MUST NOT be a tooltip (§5.7)."*
- `DESIGN.md:6049` — *"disabled in place with its reason as real text and `aria-describedby` —
  **never a tooltip**."*

  and `design/12-refusal-and-undo-surfaces.md` §2.4: *"Neither surface may use a tooltip, ever."*
  Introducing the first prose-carrying tooltip in the product creates the precedent the next
  reviewer cites against all four.

**6 — The sheet cannot afford it, and D-CP-4 is the measurement.** The sheet's summary was cut
from a rail to a 2 × 2 grid **because it overran its box by 63px at 480** and a widening was
refused on measurement. Adding four new controls to the surface that was just rescued from
overflow is the wrong direction. **The answer does not differ between the page and the sheet,
and it must not** — §3's parity contract is one content contract, two presentations, and a fact
that exists on the page and not in the sheet is exactly what that contract forbids.

**7 — The reference does not do it.** §13.1's four screenshots. In 159 captures the ⓘ appears
only inside form fields.

**What would earn a tooltip on these surfaces.** One thing, and it is already spent:
**an icon-only control whose action or destination needs naming in ≤3 words** (§5.4,
`03-products/products-list-draft-tab-create-view-tooltip.webp` — *"Create view"*, two words,
sentence case, no period, on a `+` button). `ReturnControl` is that control. **The ⓘ names an
action. It never carries a fact.**

**If the ⓘ is ordered anyway — §13.6 gives the one permitted shape.** Read it before building
one; it is a popover, not a tooltip, and it carries a self-voiding test.

### 13.3 THE TABLE — every string on both captain surfaces

Rendered strings only. `t()` keys resolved. `⟳` = renders on every record in every state.

#### The summary — page strip and sheet rail, the same four `DriverBlocks` components

| # | String | Where | Verdict |
|---|---|---|---|
| 1 | `payable to this captain` ⟳ | `EarningsBlock`, caption under the figure | **STAYS.** Removal test: `652.60 SAR` alone is earned-this-month *or* owed-to-them *or* owed-by-them. Three meanings. This is the figure's direction and subject, not commentary. |
| 2 | `owed back on the payable account` | same, when `payableHalalas < 0` | **STAYS.** It is #1 with the sign flipped; deleting it leaves a negative figure captioned with a false sentence. Rule C. |
| 3 | `Owed to Eyvar on a separate ledger. Not taken out of the figure above.` ⟳ | under `Cash debt` | **DELETE.** Clause 1 defines the label `Cash debt`, which the label already carries. Clause 2 is a real fact, and it is the **same** fact as #4, #5 and #6 — replaced once by #7. |
| 4 | `Held against plans this captain has not finished delivering.` ⟳ | under `Held in escrow` | **DELETE.** Pure definition of *escrow*, a term the finance operator owns and the glossary already fixes (`20-arabic-glossary.md` :199). Removal test: `Held in escrow 69.20` means one thing without it. |
| 5 | `Sent and not settled. The ledger cannot hold it until the money moves.` ⟳ | under `Payout in flight` | **DELETE.** Clause 1 restates the label `in flight`. Clause 2 explains **the system**, which is the exact failure the rider spec already ruled against in `profile.rider.refusal.assign` — *"no operator knows what a layer commits"* (§12.4, finding G1). |
| 6 | `Raised and not applied. In no balance and in no movement.` ⟳ | under `Deductions pending` | **DELETE.** Both clauses restate the label `pending` and then describe the data model. |
| 7 | — *(new)* `Not included in the payable` | **one line**, under `MoneyLines`' rule, above the first labelled line | **NEW, replacing 3–6.** The one fact those four sentences share, said once. `types/driver.ts` is why it survives at all: *"collapsing any two of them is how a payout over-pays (D-F6)."* Fragment, no period (R6), matching `profile.rider.money.outsideBalance`'s shape on the sister surface. |
| 8 | `Cash debt` / `Held in escrow` / `Payout in flight` / `Deductions pending` + `Money` ⟳ | `MoneyLines` | **STAYS, untouched.** §8.3.4's MUST is *"It MUST appear as a separate labelled **line** beneath the balance"* — the **line** satisfies it. **The sentence never did.** Deleting 3–6 leaves §8.3.4 fully satisfied. |
| 9 | `Last paid 22 May 2026` / `No payout has been made yet` ⟳ | `EarningsBlock` | **STAYS.** A date is a fact. |
| 10 | `No conditions on this record.` | `StandingBlock`, when clean | **STAYS.** Rule B — it is the block's entire content. Demote it and the block is a heading over nothing (§3.5). |
| 11 | `Suspended` · `{n} open complaints` · `Flagged for declining trips` · `Flagged for review by an operator` · `Plan access frozen until {date}` · `Plan access terminated` · `Bank account is pending verification` · `Bank account was rejected` · `No bank account on file` · `Last payout returned by the bank` | `FlagList` | **STAYS, all ten.** Rule C — each renders only when true, each names a condition that changes what the console will let an operator do. These are the record. |
| 12 | `{document} expires {date}` · `{n} documents on file` · `No documents on file` | `DocumentsBlock` | **STAYS.** Facts. |
| 13 | `{used} of {total} slots taken` · `{n} slots open` · `No open slots` | `CapacityBlock` | **STAYS.** The meter is `aria-hidden`; the caption **is** the value (§7.5). |
| 14 | `Multi-subscription exception granted` | `CapacityBlock`, when `multiSubException` | **STAYS.** Rule C. It is why `maxSubscriptions` differs from the platform default — without it the number reads as a defect. Fragment, no period, already correct. |
| 15 | `No subscription capacity on this record` | `CapacityBlock` | **STAYS.** Rule B. |

**Net effect on the tile the owner is looking at: five strings become two.** At rest, on a
captain carrying all four subordinate figures, the Earnings block goes from

```
652.60  SAR                                    652.60  SAR
payable to this captain                        payable to this captain
────────────────────────────                   ────────────────────────────
Cash debt              23.15                   Not included in the payable
Owed to Eyvar on a separate            →       Cash debt              23.15
ledger. Not taken out of the                   Held in escrow         69.20
figure above.                                  Payout in flight      300.00
Held in escrow         69.20                   Last paid 22 May 2026
Held against plans this captain
has not finished delivering.
Payout in flight      300.00
Sent and not settled. The ledger
cannot hold it until the money
moves.
Last paid 22 May 2026
```

— **three always-on sentences to one always-on fragment**, on all four tabs, on both surfaces,
with no new component, no new tab stop, no touch problem and no Arabic risk.

#### The Documents tab — everything here is already behind a disclosure

| # | String | Verdict |
|---|---|---|
| 16 | `Marked valid because more than 30 days remain.` · `Marked expiring because 30 days or fewer remain.` · `Marked expiring soon because 7 days or fewer remain.` · `Marked expired because the date has passed.` | **STAYS, all four, unchanged.** Rule A — they render **only inside an expanded `AccordionContent`** (`DriverDocuments.tsx:394`). They are already behind a click affordance that is keyboard-reachable, touch-reachable and announced. **Demoting them again would be demoting them twice**, and §6.2's own ruling is that *an expansion that can be empty is a broken affordance* — these are its last child and its floor. |
| 17 | §6.2a's provenance family — `Entered in Compliance by {name}, {date}.` · `Entered on the application by {name}, {date}.` · `No document was read. The system set this date at approval on {date}.` · `Replaced an expiry of {date}.` | **STAYS, unchanged. Not spec'd for demotion and not eligible.** Rule A, plus §6.2a's ruling of 2026-09-04: provenance **leads** the expansion because it is *"the fact the row cannot state"* and is not derivable from anything on screen. Demoting it reverses a ruling made hours earlier, on the record's single most dangerous field (`auto-default` + `Valid`). **Not built yet** — grep returns no consumer — so there is nothing on screen for the owner to be objecting to here. |
| 18 | `Date auto-filled` | **STAYS.** §6.2a ruled it onto the **collapsed** row precisely because *"a fact that requires expanding is a fact nobody finds."* Fragment, no period. |
| 19 | `No scan is stored for this document.` | **STAYS.** Rule A + Rule B — inside the expansion, and it is the file slot's entire content. |
| 20 | `A PDF has no preview. Open the scan to read it.` | **STAYS, unchanged.** Rule A. Clause 2 names a control by its visible words (`copy.md` rule 5) that is 8px below it and enabled in this branch (`DriverDocuments.tsx:1034` — the refused case is an earlier, exclusive arm of the same ternary). Shaving it is a ruling from §6.5a re-opened for tidiness, and this amendment does not do that. |
| 21 | `Couldn't load this scan. Try again.` · `The record lists a scan that is no longer in storage.` | **STAYS.** Errors. §11.2 / states.md — three diagnoses, three sentences, never merged. |
| 22 | `Opening a captain's scans needs the operations permission.` | **STAYS, and may never be a tooltip.** §11.2: *"real text, `aria-describedby`-linked from BOTH controls, never hidden and never a tooltip — a hover-only explanation is unreachable by keyboard and unreachable on touch."* Already ruled; §13.2 reason 5. |
| 23 | `Uploaded {date} by {name}` · `{n} day left` · `expired {n} days ago` · `Expires today` | **STAYS.** Facts. |

#### The banners, the ledger, and the rest of the page

| # | String | Verdict |
|---|---|---|
| 24 | **`A credit is money earned. A debit is money paid out or deducted.`** | **STAYS. VISIBLE. IT IS A `<caption>` AND IT DOES NOT MOVE — see §13.4, which exists so this is not re-opened.** |
| 25 | `They take no trips and hold no subscription slots while this stands. Reason recorded: {reason}` and the three other banner bodies | **STAYS.** A banner *is* the prose surface (R10 — standing condition → banner). Its body says what the condition does to the operator's options, which is the answer. Rule C: at most one renders, and only when a condition holds. |
| 26 | `Nothing has been posted to this captain's earnings yet.` · `No documents are on file for this captain.` · `Nothing has happened on this record yet.` · `No deductions are recorded against this captain.` · `This captain has taken no trips` + body · `No earnings have reached this captain` + body | **STAYS, all.** Rule B. An empty state behind an ⓘ is a blank card, which is precisely what `copy.md` rule 10 and R8 forbid. |
| 27 | `Opening the compliance file needs the operations permission.` · `Opening payouts needs the finance permission.` | **STAYS.** §11.2, as #22. |
| 28 | `Showing {shown} of {total}.` | **STAYS.** §8.3.4's MUST — *"A truncated ledger MUST state its truncation in words below the last row. A silent row cap MUST NOT ship."* |
| 29 | `Earnings this month` / `Trips this period` figure row | **STAYS, and note it carries no caption today.** AC-CP-88's open question (two windows, two labels) is unchanged by this amendment and is still reported. **Do not answer it with an ⓘ.** |

### 13.4 The ledger caption does not move, and here is why in writing

> **`A credit is money earned. A debit is money paid out or deducted.` stays exactly where it
> is: a real `<caption>` on `DriverEarningsTable`, rendered in `content` only, at `px-3` so the
> sentence begins where the headers it defines begin.**

Four reasons. The first is the one that ends the argument.

**1 — It is the table's accessible name.** `docs/ref/table.md`: the `<caption>` *"becomes the
table's accessible name (`getByRole('table', { name })`) and is announced when a reader enters
the table. A paragraph above is announced before the table and skipped, so the convention never
reaches a screen-reader operator at all."* Behind a hover affordance it reaches them **never** —
and a screen-reader operator navigating a debit/credit table by column is the reader **most**
likely to lose the sign convention. Moving it puts the warning furthest from the person who
needs it most. Removing it outright leaves the table with **no accessible name at all**, which
is a §7 regression dressed as decluttering.

**2 — `liability.driver` is the one credit-normal ledger in the console.** A credit means Eyvar
owes **more**. An operator reading it as a wallet reads **every row backwards** — not one row,
every row — and `clients/payouts.ts` says in as many words that this *"is not guessable from the
words `Debit` and `Credit` alone, which is exactly why the rule requires it in writing"*
(AC-308, §3.2, §7 of this spec).

**3 — It is not part of what the owner is looking at.** The complaint is the strip, which
renders on **all four tabs**. The caption renders on **one** (`?view=earnings`), in one state
(`content` — not skeleton, not error, not empty), above one table. It is one line on one tab.

**4 — It is guarded.** `src/components/table/tableCaption.test.tsx` asserts the string and the
accessible name. Moving it is a red test, not a tweak.

**If someone still wants it gone, the argument they need is not "declutter".** It is a
demonstration that `ar.driver` and `liability.driver` have stopped being inverted relative to a
wallet — a data-model change, not a design one, and it would retire `docs/ref/table.md`'s
`caption` slot across the product, not just here.

### 13.5 Copy — final

**Deleted. Four keys, English and Arabic, with no replacement at their positions.**

| Key | Was |
|---|---|
| `profile.driver.earnings.debtNote` | `Owed to Eyvar on a separate ledger. Not taken out of the figure above.` |
| `profile.driver.earnings.escrowNote` | `Held against plans this captain has not finished delivering.` |
| `profile.driver.earnings.inFlightNote` | `Sent and not settled. The ledger cannot hold it until the money moves.` |
| `profile.driver.earnings.pendingDeductionsNote` | `Raised and not applied. In no balance and in no movement.` |

`src/components/profile/driver/copy.ts` **and** `src/i18n/ar/driverProfile.ts:190–193`. The
`note` field on `MoneyLines`' line objects goes with them — a per-line slot with no occupant is
how the sentences come back.

**Added. One key.**

| Key | English | Arabic |
|---|---|---|
| `profile.driver.earnings.notInPayable` | `Not included in the payable` | `غير مُدرَجة ضمن المستحقات` |

- **Fragment, no period, both languages** (R6). It labels a group; it is not prose. It matches
  `profile.rider.money.outsideBalance` — `Not counted in the wallet balance` — which is the same
  statement about the sister record, deliberately, so the two surfaces say one thing one way.
- **`the payable`** is this screen's own established word: the figure's caption is `payable to
  this captain`, the ledger's title is `Payable movements`. No new vocabulary.
- **Arabic** takes `المستحقات` for *payable* from `20-arabic-glossary.md:194`, matching the
  shipped `profile.driver.earnings.postings` = `حركات المستحقات`. Feminine agreement follows
  `profile.rider.money.outsideBalance`'s `غير محتسبة`. No period, matching the English.
- **It is true of all four lines** and this was checked one at a time: `cashDebtHalalas` sits on
  `ar.driver`; `escrowHeldHalalas`, `payoutInFlightHalalas` and `pendingDeductionsHalalas` are
  off-ledger. None is in `liability.driver`. If a fifth subordinate figure is ever added that
  **is** in the payable, this line is wrong and must be re-ruled — recorded as finding CP-P3.

**Placement.** One node, immediately after `MoneyLines`' `border-t` and **before** the first
labelled line, rendered only when `lines.length > 0`. `text-xs text-muted-foreground`, the same
rank the deleted notes had, so this is a subtraction and not a restyle. Never repeated per line.
Never in a heading. It sits **above** the lines it qualifies because a reader who has already
added two numbers together has already made the mistake.

```
────────────────────────────         ← MoneyLines' block-start rule (border-t, existing)
Not included in the payable          ← new, once, text-xs muted
Cash debt              23.15
Held in escrow         69.20
Payout in flight      300.00
```

**Unchanged, and named so a builder does not "tidy" them by mistake:**
`profile.driver.earnings.payable`, `.negative`, `.lastPaid`, `.neverPaid`, `.empty`,
**`.direction`**, `profile.driver.standing.clear`, `profile.driver.capacity.exception`,
`.none`, every `profile.driver.flag.*`, every `profile.driver.documents.*`, every
`profile.driver.banner.*`, every `profile.driver.refusal.*`.

### 13.6 If the ⓘ is ordered anyway — the one permitted shape

Recorded so that an override is built once and correctly rather than improvised. **It is a
popover, not a tooltip**, and it carries a test that voids it.

| | |
|---|---|
| Component | **`src/components/ui/popover.tsx`** (already in the repo — no `shadcn add`). **Not `ui/tooltip.tsx`.** The product's one tooltip is `ReturnControl`'s and its stated rule is that a tooltip names a control and carries no explanation; a second one carrying prose on the same band voids the first. |
| Trigger gesture | **click / tap / `Enter` / `Space`. Never hover-only.** A hover-only fact does not exist on a tablet. |
| Count | **Exactly one per card. A row of them is refused outright.** Both summaries hold **zero** focusable elements today; the page's strip sits above the `TabsList`, so every trigger is a tab stop crossed on all four tabs. |
| Trigger element | `<Button variant="ghost" size="icon-xs">` with the glyph `aria-hidden`. `focus-visible` ring per §7.2 — an `outline-none` here is a defect. |
| Accessible name | **`About these figures`** — three words, sentence case, **no period**. It names what opens, not the icon. Never `Info`, never `More information`, never `?`. |
| Placement | inline-end of `SummaryBlock`'s `<h3>`. **Never between a label and its figure** — §8.3.1 puts a figure and its unit on one baseline and a control in that row breaks it. `ms-auto`, never `ml-auto` (§9.1). |
| Content copy | **full sentences, each with a period.** `DESIGN.md:3292`'s no-period MUST names *toast, tooltip, badge, menu item* — a **popover is not on that list**, and the same rule's second clause requires helper *sentences* to take one. **This is the copy reason to pick a popover before touch and keyboard are even considered**, and it is how the owner's request resolves the trailing-period conflict: the demoted strings keep their periods because they were never going in a tooltip. |
| Dismissal | `Escape` and outside click; focus returns to the trigger. §7.2. |
| Arabic | `align="start"` — logical, mirrors with the document. Never `side="left"`. Arabic runs ~15–30% longer here, so the content is width-constrained and wraps; it is never a single line sized to English. |
| **The voiding test** | Anything placed inside it **must not be needed to read the figure correctly**. Apply §13.1's removal test to every candidate: pass it and the string should have been **deleted**; fail it and the string must stay **visible**. **There is no string that both fails the test and belongs in the popover — so the popover is always empty.** That is the argument for D-CP-16, restated as a criterion (AC-CP-167). |

### 13.7 Deviations — there are none, and that is the finding

**Nothing in this amendment suspends a rule, so nothing is recorded in §10.** Checked one at a
time, because "no deviation" is a claim and not a shrug:

| Candidate | Verdict |
|---|---|
| `DESIGN.md:3291` — *"MUST put constraints and consequences in helper text under the field, not in a tooltip"* | **Never in force here, and not suspended.** It is **§5.7 — §1–§5**, and the Precedence ladder is explicit: *"A MUST in §1–§5 is a description of Shopify, not an order to Eyvar, unless §6 adopts it."* §6 does not adopt it for captions on read-only figures. And it is written about **a field**: helper text *under the field*, constraints on an input. Nothing on either captain surface is a field. **This amendment moves in the same direction as that rule anyway** — it takes prose *out* of tooltips by never putting it in one. |
| `DESIGN.md:3278`'s do/don't row — the `(tooltip on an ⓘ icon)` **Don't** | Same status, and it is now **supporting evidence for D-CP-16**, not an obstacle to it. |
| `DESIGN.md:3107` — *"MUST give every icon-only control a tooltip naming its action in ≤3 words"* | **Not reached.** It is a rule about controls that exist. This amendment adds no icon-only control. `ReturnControl` already satisfies it. |
| `DESIGN.md:3292` — no period on a tooltip | **Not reached.** No tooltip is added. §13.6 resolves it for the override case. |
| §8.3.4 — *"MUST appear as a separate labelled line beneath the balance"* | **Satisfied, unchanged.** The **line** satisfies it. The sentence under the line never did, and deleting it changes nothing about compliance. |
| §8.2 — a derived value states its derivation | **Not reached.** §8.2's binding rules are about derived values in a **form** — inputs feeding a formula, `aria-readonly`, recompute on `input`. `documents.why.*` and `rider.churn.*` are this spec's own construction and are **unchanged**. |
| §3.5 — a block with nothing to report says so in a sentence | **Satisfied.** Rule B protects exactly these. |

### 13.8 Findings

- **CP-P1 — `DESIGN.md` has no rule for secondary explanation on a read-only record.**
  §5.7's two MUSTs and §5.0's decision table are both written about **form fields** and
  **controls**; `surfaces.md`'s 16 rows contain no row for *"explain a value already on
  screen"*. This is a **gap, not a deviation** — nothing is suspended — and D-CP-16 fills it
  locally for two surfaces. **The gap should be closed centrally**, because it will be reached
  by every dossier in the product. Proposed wording for
  `docs/06-design-reference/_partials/`, for the document's owner to accept or reject:
  > *A secondary explanation of a read-only value MUST be ordinary text adjacent to the value,
  > or it MUST be deleted. It MUST NOT be placed in a tooltip, a popover or a `title`
  > attribute. Where the explanation is genuinely optional, the disclosure MUST be a control
  > that is reachable by keyboard and by touch — an expandable row or a link — and MUST NOT be
  > hover-triggered.*

  **I do not edit `DESIGN.md`.** Raised to product-owner and to the partials owner.

- **CP-P2 — `docs/ref/copy.md` rule 7 presents a §1–§5 MUST as flat law.** It reads
  *"Constraints go in helper text under the field, never in a tooltip"* with the header
  *"Source: `DESIGN.md` §5.7. These are MUSTs"* and **no ladder caveat**. A reader who checks
  the small file — which the brief tells everyone to do first — gets a binding-sounding rule
  that is not binding. Two agents read the same line and reach opposite answers. **Suggest one
  sentence at the head of that file**: *"§5.7 is §1–§5. These MUSTs describe Shopify and bind
  Eyvar only where §6 adopts them; §7–§9 and the Rulings table beat them."* Owner of
  `docs/ref/` to decide. Not my file.

- **CP-P3 — `Not included in the payable` is true of exactly the four figures that exist
  today.** A fifth subordinate figure that **is** inside `liability.driver` would make the line
  false. Named here so the failure is loud rather than silent. Guarded by AC-CP-165.

- **CP-P4 — the page/sheet asymmetry on the held figure is intentional and is documented in
  the rider spec** (`people-rider-profile.md` §16.4), not here, because it is the rider's. It
  is not a parity defect.

- **CP-P5 — AC-CP-88's two-window question is still open** (`Earnings this month` is a calendar
  month, `Trips this period` is the payout period, and `CaptainPayout` carries no bounds to
  state). **It must not be answered with an ⓘ.** If a window needs naming it goes in the label.
  Still with product-owner.

### 13.9 Acceptance criteria — owner amendment 4

#### The affordance

151. **AC-CP-151** No `Tooltip`, `TooltipTrigger`, `TooltipContent`, `Popover`, `HoverCard` or
     `title=` attribute appears anywhere in `src/components/profile/driver/*` or
     `src/screens/entity/DriverProfilePage.tsx`. **The only tooltip on either captain surface is
     `ReturnControl`'s**, which names a destination in three words.
152. **AC-CP-152** Both captain summaries contain **zero focusable elements**, on the page and
     in the sheet, at every width. `within(summary).queryAllByRole('button')` and
     `queryAllByRole('link')` are both empty.
153. **AC-CP-153** No string on either captain surface is reachable only by hover. Every
     rendered sentence is in the accessibility tree at rest or inside an expanded
     `AccordionContent`.

#### The Earnings tile

154. **AC-CP-154** `profile.driver.earnings.debtNote`, `.escrowNote`, `.inFlightNote` and
     `.pendingDeductionsNote` are **deleted** from `copy.ts` and from
     `src/i18n/ar/driverProfile.ts`. Grep returns no key, no consumer and no `note` field on
     `MoneyLines`' line objects.
155. **AC-CP-155** `profile.driver.earnings.notInPayable` = `Not included in the payable`
     renders **exactly once** per Earnings block, after `MoneyLines`' block-start rule and
     **before** the first labelled line.
156. **AC-CP-156** It renders **only when at least one labelled line renders**. A captain with a
     clean position gets a figure, a caption and no rule, no line and no fragment.
157. **AC-CP-157** It is a **fragment with no period**, in English and in Arabic (R6).
158. **AC-CP-158** Its Arabic value is present before merge — `غير مُدرَجة ضمن المستحقات` —
     using `المستحقات` per `20-arabic-glossary.md:194` and carrying no period.
159. **AC-CP-159** The four labelled lines are **unchanged**: label + `Money` on one baseline,
     each rendering only when non-zero. §8.3.4's separate-labelled-line MUST is satisfied by the
     **line**.
160. **AC-CP-160** On a captain with all four subordinate figures the Earnings block renders
     **exactly two** muted lines that are not a label/value pair: the sign caption and
     `Not included in the payable`. It rendered five.
161. **AC-CP-161** `profile.driver.earnings.payable` and `.negative` are unchanged and still
     switch on the sign of `payableHalalas`. `DRV-0202` (−1,500) still reads `owed back on the
     payable account`.
162. **AC-CP-162** DOM order is figure → sign caption → rule → `Not included in the payable` →
     labelled lines → `Last paid`. Reading order is identical under `dir="rtl"`.

#### What must not have moved

163. **AC-CP-163** **`profile.driver.earnings.direction` renders as a real `<caption>` on
     `DriverEarningsTable`, in `content` only, and is the table's accessible name**
     (`getByRole('table', { name: /A credit is money earned/ })`). It appears in no tooltip, no
     popover, no heading and no paragraph. `src/components/table/tableCaption.test.tsx` passes
     **unchanged**.
164. **AC-CP-164** Every string inside an `AccordionContent` on the Documents tab is byte-identical
     to before this amendment: the four `documents.why.*`, `noScan`, `pdfNoPreview`, `scanError`,
     `scanGone`, and §6.2a's provenance family when it is built. **Nothing is demoted twice.**
165. **AC-CP-165** `profile.driver.standing.clear`, `profile.driver.capacity.exception`,
     `.none`, every `profile.driver.flag.*`, every `profile.driver.banner.*`, every
     `profile.driver.refusal.*` and every `*.empty` render unchanged and in ordinary text.
166. **AC-CP-166** `driver.test.tsx` asserts that `Owed to Eyvar on a separate ledger.`,
     `Held against plans`, `Sent and not settled.` and `Raised and not applied.` render
     **nowhere** on either surface, **in both languages**.

#### The override, and the ground rules

167. **AC-CP-167** *(applies only if §13.6 is invoked)* Every string placed inside the popover
     passes §13.1's removal test — that is, the figure it accompanies means exactly one thing
     without it. **A string that fails the test may not be put in the popover.**
168. **AC-CP-168** Nothing in this amendment adds a token, a Tailwind palette class, an
     arbitrary value, a raw hex, a physical-direction utility, a sixth badge tone (R7), a red
     (R5a) or an illustration (R8). `/token-audit` passes.
169. **AC-CP-169** No string added or edited by this amendment is built by concatenation or by a
     template literal joining two translated fragments (§9.6, AC-73).
