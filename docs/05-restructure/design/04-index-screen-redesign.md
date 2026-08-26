# 04 — The index screen, redesigned as one thing

**Status:** binding. This is a **total redesign of the index screen**, not a fix list.
It supersedes, clause by clause, the parts of `00-shell.md`, `01-table-controls.md`,
`02-visual-refinement.md` and `03-navattic-language.md` that describe this screen's
composition. §14.5 is the exhaustive supersession ledger. **No two live specs may disagree
after this document lands.**

**Subject:** Operations › People (`/operations/people`), the P1 / P8 / P9 index screen.
Every other index sub-tab inherits it — the composition is the component, not the screen.

**Reference:** `docs/06-design-reference/navattic-web/` — all 15 frames opened and read;
`223f15e5`, `82923d3f`, `cfa43315`, `d209473e`, `6a08206b`, `02b895df` and `79a31934`
measured with PIL at the pixel. Colour comes from Navattic's served stylesheet
(`98da06fdab16cbfa.css`) per the **D7 addendum**; geometry comes from sampling.

**Inputs treated as evidence, not opinion:**
`docs/02-verification/people-match.md` round 2 · `docs/02-verification/00-craft-critique.md` ·
`DECISIONS.md` **D2 D5 D6 D7 D8**.

**What still binds and is not up for negotiation:** `DESIGN.md` **§7** accessibility,
**§8** patterns, **§9** bidirectionality, under **D7**. Where the reference cannot be
matched because of one of those, **§14.4's accessibility ledger** names it and gives the
compliant alternative with its arithmetic. **`--primary` is near-black; R3 is dead; no blue primary appears anywhere
in this document.**

---

## Contents

| § | |
|---|---|
| **1** | **The annotated layout, and the band-by-band gap table** — read this first |
| 2 | What the screen is *for*, and which bands I deleted |
| 3 | Band 0 — the top bar |
| 4 | Band 1 — the page header row |
| 5 | Band 2 — the control row |
| 6 | Band 3 — the query strip |
| 7 | Band 4 — the table |
| 8 | Band 5 — the pagination row |
| 9 | Colour policy — what may be a badge |
| 10 | Every state, drawn |
| 11 | The detail drawer |
| 12 | Interaction, keyboard, Arabic |
| 13 | Copy — every string, final |
| 14 | Components · superseded ACs · deviations · proposed rulings · the accessibility ledger · supersession |
| 15 | Handoff |

---

## 1. The annotated layout, and the band-by-band gap table

### 1.1 The whole screen at 1280 × 800 — the floor, and the width every number is derived at

```
┌────────┬───────────────────┬──────────────────────────────────────────────────────────────┐
│ rail   │ sub-tab column    │  content region — <main>, x = 304, width = 976               │
│ 80     │ 224               │                                                              │
│#e9edf1 │ #f6f8f9           │  #ffffff                                                     │
│        │                   ├──────────────────────────────────────────────────────────────┤
│  ▣     │ Eyvar Admin    52 │  ⌕ Search…                     Mine 2   On call unassigned   │  BAND 0  top bar  52
│  Exec  │                   │                                                    🔔⑥  (SA) │
│ ┌────┐ │  OPERATIONS       ├──────────────────────────────────────────────────────────────┤  ← 1px --ev-hairline
│ │ ▤  │ │  Live Dispatch    │                                                              │
│ │Ops │ │ ┏━━━━━━━━━━━━━━━┓ │                    ↕ 24  page padding-block-start             │
│ └────┘ │ ┃ People     ⑫ ┃ │                                                              │
│  ▦     │ ┗━━━━━━━━━━━━━━━┛ │←32→                                                    ←32→  │
│Finance │  Requests         │  People  57                                       [ Export ] │  BAND 1  page header  32
│  ▧     │  Trips            │                                                              │
│Support │  Trip Assurance   │                          ↕ 20                                │
│        │                   │                                                              │
│        │  VEHICLES         │ ┌Captains 57│Applications 12│Compliance│Riders┐ ⌕[Search   ] │  BAND 2  control row  32
│        │  Fleet            │ └───────────┴───────────────┴──────────┴──────┘ [▤ Columns ] │
│ ┌────┐ │  Maintenance      │                          ↕ 12                                │
│ │ ⚙  │ │                   │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  BAND 3  query strip  48
│ │Admin│ │                  │ ░ [Status: Active ✕] [+ Add filter]    Sorted by Trips ↓ ✕ ░ │  #f6f8f9  r8  no border
│ └────┘ │                   │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│        │                   │                          ↕ 12                                │
│        │                   │ ┌────────────────────────────────────────────────────────────┐ BAND 4  table
│        │                   │ │░☐░│░Captain░░░░░░│░Status░│░Rating│░Trips│░Earned░│░City░│ │ header 36, sticky
│        │                   │ ├───┼──────────────┼────────┼───────┼──────┼────────┼──────┤ │ ← rows scroll under it
│        │                   │ │ ☐ │⬤ Nora Al-…   │ Active │   4.9 │  412 │ 4,218  │Riyadh│ │ row 60
│        │                   │ │   │  +966 5x…    │        │       │      │        │      │ │
│        │                   │ ├───┼──────────────┼────────┼───────┼──────┼────────┼──────┤ │
│        │                   │ │ ☐ │⬤ Sara Al-…   │Suspend.│   4.2 │  288 │ 2,904  │Jeddah│ │
│        │                   │ │   │  +966 5x…    │        │       │      │        │      │ │
│        │                   │ ├───┼──────────────┼────────┼───────┼──────┼────────┼──────┤ │
│        │                   │ │        …7 rows visible, the 8th deliberately half-cut…     │ │
│        │                   │ └────────────────────────────────────────────────────────────┘
│        │                   │                          ↕ 12                                │
│        │                   │ [25 ▾] rows per page              1–25 of 57  ‹ Prev  Next › │  BAND 5  pagination  40
│        │                   │                          ↕ 24  page padding-block-end         │
└────────┴───────────────────┴──────────────────────────────────────────────────────────────┘
```

**Everything in the content region shares one inline-start edge: `x = 336`** (304 nav +
32 gutter). H1, tab strip, query strip, table border, pagination — one rail, one edge. The
registers *inside* the table (checkbox at 348, `Captain` header text at 388) are cell
padding, which is what a table is allowed to have. That closes craft-critique **F9**'s four
left edges to one.

### 1.2 The band-by-band gap table — **this is the contract**

Block positions are measured from the top of the content region. Every value is on the 4 px
grid. Every gap is expressed as `margin-block-start` on the band **below** it, so a band
that does not render takes its gap with it — with one exception: **band 3 always renders**
(§6.1), which is what removes the 60 px layout jump the current build has when a filter is
added.

| # | Band | Block-start @1280×800 | Height | **Gap below** | Ground | Border |
|---:|---|---:|---:|---:|---|---|
| **0** | **Top bar** | 0 | **52** | 0 | `--ev-bg` `#ffffff` | 1 px `--ev-hairline` block-end |
| — | *page padding-block-start* | 52 | **24** | — | white | — |
| **1** | **Page header row** | 76 | **32** | **20** | white | none |
| **2** | **Control row** | 128 | **32** | **12** | white | none |
| **3** | **Query strip** | 172 | **48** | **12** | `--ev-bg2` `#f6f8f9` | **none**, radius 8 |
| **4** | **Table** | 232 | **flex, min 216** | **12** | `--ev-surface` `#ffffff` | 1 px `--ev-hairline`, radius 8 |
| 4a | · header row | — | **36** | 0 | `--ev-bg2` `#f6f8f9` | 1 px `--ev-hairline` block-end |
| 4b | · body row | — | **60** | 0 | white | 1 px `--ev-hairline` between rows |
| **5** | **Pagination row** | auto | **40** | — | white | none |
| — | *page padding-block-end* | | **24** | — | — | — |

**Inline gutter** — `--ev-page-pad`, **32 px** both sides at every width below
`--ev-bp-wide`; **48 px** at and above it, through the **existing** `wide:` variant. No new
breakpoint, no token redefined inside a media query. This closes finding 2 of
`03-navattic-language.md` §11 and amends **D-2′** (§14.3).

**Derivation of the table's height, and why the page itself does not scroll.**

```
1280 × 800:  table height = 800 − 232 (bands above) − 12 (gap) − 40 (pager) − 24 (pad)
                          = 492   → body 456 → 7 rows at 60, the 8th half-visible
1440 × 900:  table height = 900 − 232 − 12 − 40 − 24
                          = 592   → body 556 → 9 rows, the 10th part-visible
```

Reference check: `223f15e5` shows **6 rows** in its visible area. Seven at the floor and
nine at 1440 is the same reading density, not a denser one.

### 1.3 The four gap values, and why there are only four

`24 · 20 · 12 · 0`. Nothing else appears anywhere in this composition.

| Gap | What it means | Where |
|---:|---|---|
| **24** | the page's own edge | above band 1, below band 5 |
| **20** | *"a different kind of thing starts here"* — identity ends, controls begin | band 1 → band 2 |
| **12** | *"these belong together"* — controls, state, data, pager | 2→3, 3→4, 4→5 |
| **0** | *"this is one object"* | inside the table; inside the query strip |

The owner's *"add margin between the table and the tabs, this looks really bad"* is answered
structurally, not by adding a number: **the tabs and the table are no longer adjacent.** Two
things sit between them — the control row's own block-end and the query strip — and each
interval is a declared 12.

The reference measures **12 / 14** in exactly these two places (`223f15e5`: toolbar
block-end at destination y 99.5 → strip top 106 = 6.5 dest = 12.2 CSS; strip block-end 130 →
table top 137.5 = 7.5 dest = 14.1 CSS). Twelve is the grid value inside both.

---

## 2. What the screen is *for*, and which bands I deleted

### 2.1 The screen is a **finder** and a **queue**. It is not a dashboard and not a report.

Ninety per cent of arrivals at People are *"find this one person"* — an operator has a name,
a phone or a `DRV-` id from a call, a message or another screen. The other ten per cent is
*"work Applications down to zero"*. Nothing else happens here.

Everything below follows from that sentence.

- **The search field is the most important control on the screen**, so it is persistent,
  240 px wide, and in the same row as the thing it filters. That is what the owner asked
  for — *"the search should appear in the same place as the action"* — and it is why
  **AC-47 is void** (§14.2).
- **The tab counts are the queue's backlog**, so `Applications 12` is a number an ops lead
  reads from across the room. It is the only number in the chrome.
- **The default columns disambiguate a person**; they do not describe one. The full record
  is the drawer, one click away (§11).
- **The screen has no primary action, and that is correct.** Craft-critique **F8** is right
  that the header band was 93 % empty and that the eye had nowhere to land. It is wrong
  about the cure. An index's focal point is the list; the fix is to **stop competing with
  it**. Twenty-five identical green `Active` pills go (§9), and the identity column —
  near-black names at 14 / 500 against `#6b7280` everywhere else — becomes the loudest thing
  on the page by default. `Export` occupies the header's inline-end so the band is not
  empty. **I decline to manufacture a primary button for a screen that has no create
  action**, and I decline to promote the breached-SLA count into the header, because
  **AC-50** already owns that signal and **R10** forbids a second surface for one event.

### 2.2 Four bands of chrome, deleted down to two

The composition kept failing because four things were competing to be the top of the screen.
Here is what each was, and what happened to it.

| Was | Now | What the operator loses |
|---|---|---|
| **Page header** — H1 + `57 captains` subtitle + an empty actions slot | **Kept, and made to earn its row.** The subtitle is deleted; the count becomes a numeral beside the H1. `Export` fills the inline-end. | The subtitle line. It carried one derived number in a full-width line box and it was the cause of a 28 px jump on every load and every error (craft-critique **F3**, **F10**). Nothing is lost that was not costing more than it paid. |
| **Tab strip** — a full-width row inside the card | **Deleted as a band.** The four views become a **segmented control** at the inline-start of the control row. | Nothing. Four views, still one click each, now at the same height as the controls that operate on them. |
| **Toolbar** — `Search` `Filter` `Columns` `Sort`, four secondary buttons of equal weight | **Merged with the tab strip into one control row, and cut to two controls.** `Filter` moves down into the query strip, where its results already live. `Sort` moves into the column-header menu (**D-6**, already built) and surfaces as a chip in the query strip when active. | One redundant entry point to sort and one to filter. Each capability now has exactly one control and one readout. This also closes craft-critique **F15**: the `Filter` glyph that read as a sort glyph is gone, because the button is gone. |
| **Table header** | **Kept.** It is not chrome; it is the table. | — |

**Two bands of chrome (32 + 32), one band of state (48), and the table's own header (36).**
The strip is not chrome: it is the only thing in the composition that changes because of
something the operator did.

### 2.3 The dropdown argument, recorded and overruled

The reference does **not** use a tab strip. `223f15e5`, `cfa43315`, `d209473e`, `9eb629ea`
and `1ef8248f` all switch list segments with an **`All visitors ⌄` dropdown in the top bar**,
beside the breadcrumb. That is genuinely better for a segment set that is **open-ended**: it
costs one fixed-width control regardless of how many segments exist, it survives
translation, and it never wraps.

**It is refused here, and the owner's instruction is not the only reason.** Eyvar's four
People views are not open-ended: they are `M7`'s four merged legacy pages
(`specs/00-foundation.md` §3.6), fixed at four, and the point of the merge is that an
operator sees the other three exist without opening anything. A dropdown hides the
Applications backlog behind a click. For a queue worked to zero every day, that is the
difference between a console and a filing cabinet.

**Recorded so it is not re-litigated:** if a future sub-tab needs more than five views, or
if Arabic labels push the strip past the control row's budget at 1280 (§5.4 gives the
measured margin), the dropdown is the sanctioned escape and this paragraph is its
authorisation.

---

## 3. Band 0 — the top bar

Height **52** (`--ev-topbar-h`), ground `--ev-bg` `#ffffff`, 1 px `--ev-hairline` `#f0f2f4`
on the block-end. It spans the content region only, not the viewport — the nav columns own
their own ground, and the seam between them is their border (`03-navattic-language.md`
§4.1, restored by **D7** over **D6** bullet 2).

Confirmed by measurement, unchanged: the top-bar rule sits at destination y 32.5 in
`223f15e5`, giving (32.5 − 5) × 1.875 = **51.6**, a declared 52.

| Slot | Content | Geometry |
|---|---|---|
| inline-start | **Global search** — `input`, 400 px, 32 px tall, white, 1 px `--ev-hairline-control` `#dde0e4`, radius 8, leading 16 px `⌕` in `--ev-text-2` | 400 × 32, inline-start at the content gutter |
| — | *flex spacer* | |
| inline-end | **`Mine 2`** — a filter, therefore a **chip**: `button`, 28 px, `--ev-bg2` fill, 1 px `--ev-hairline-control`, radius 8, label 13 / 400 `--ev-ink`, count 13 / 500 `--ev-text-2` | 28 tall |
| inline-end | **`On call unassigned`** — **plain text**, 13 / 400 `--ev-text-2`. **Not a chip.** | — |
| inline-end | **Notification bell** — 32 × 32 icon `button`, count as a **corner chip**: `--ev-nav-chip` `#e5e7eb` fill, `--ev-ink` digits at 11 / 600, radius 4, with a 2 px `--ev-surface` ring so it never touches the glyph | 32 × 32; chip offset −4 / −4 |
| inline-end | **Account avatar** — 28 px circle, `--ev-bg2`, 1 px `--ev-hairline` ring, initials 11 / 600 `--ev-text-2` | 28 |
| gap between inline-end items | **12** | |

### 3.1 Three corrections to the built top bar

These amend `00-shell.md` §4 and close three craft-critique findings.

1. **`On call: unassigned` loses its chip and its colour** (**F20.4**). It rendered in the
   warning brown `#7a3e12`, the same ink as `overdue 1d 16h` and the owner chip — three
   unrelated meanings, one colour, one screen. It is a **readout, not a control**, so it
   takes the shape of a readout: plain `--ev-text-2` text. **Shape now tells the operator
   what is clickable**: `Mine 2` is a chip because it filters; `On call unassigned` is text
   because it does not.
2. **The bell's count becomes a chip** (**F16**). It was a naked numeral floating at the
   glyph's corner while the nav and the rail both use pills. Ruling **R21** (§14.3) settles
   which is which: *a count on a navigation target is a chip; a count inside a control is
   plain text.* The bell is a navigation target. The rail badge additionally gains its 2 px
   surface ring so it stops touching the icon.
3. **The suggestion panel matches its anchor exactly** (**F18**). It was 480 px under a
   400 px field and overhung on the trailing side only, covering the page title. Set
   `width: var(--radix-popover-trigger-width)`.

**Not changed:** the route trail stays deleted (`02-visual-refinement.md` **V4** survives —
wayfinding, not colour, and D7 did not touch it). The nav column and the H1 both name the
page; a third naming in the top bar was the duplication V4 removed.

---

## 4. Band 1 — the page header row

Height **32**, ground white, no border, no shadow. Items are centred on the row's
cross-axis.

```
←32→                                                                            ←32→
 People  57                                                             [  Export  ]
 ↑ 22/600 --ev-ink   ↑ 17/400 --ev-text-2                               ↑ 32, outline
 └── 8 ──┘
```

| Element | Spec |
|---|---|
| **H1** | The sub-tab's name. `--text-xl` **22 px / 600 / 28**, `--ev-ink` `#171a21`. Latin only — the Arabic floor is `--text-xl: 24 / 32` (§12.3). It is the page's only `<h1>`. |
| **Record count** | The numeral alone, `--text-lg` **17 px / 400**, `--ev-text-2` `#6b7280`, 8 px after the H1, baseline-aligned with it. **Not a chip** (R21 — it is inside a heading, not on a navigation target). `57` · `12` · `1,204` — grouped with `Intl.NumberFormat`, Western digits in both languages (§9.2). |
| **Subtitle** | **Deleted.** There is no second line in this band, in any state. |
| inline-end | **`Export`** — `button variant="outline"`, 32 px, white fill, 1 px `--ev-hairline-control`, radius 8, label 13 / 500 `--ev-ink`, leading 16 px download glyph. It is the page's only header action. |

**The count is the subtitle's replacement and it must never move the layout.** During
loading it renders as a `skeleton` of exactly three digit-widths (`text-lg`, 26 px wide,
17 px tall); in the error state it renders as `—`. The band's height is `32` in every state,
so nothing below it ever shifts. That closes **F3**'s 28 px pop and **F10**'s card jump in
one construction, without reserving an empty line box.

**Why the count moved out of a subtitle line.** `57 captains` restated the noun that the H1
and the active tab already carry, in a line box 976 px wide holding 78 px of ink, and it
changed height between states. The numeral says the same thing in the space it needs.

---

## 5. Band 2 — the control row

Height **32**, ground white, no border. One row, one control height, three items.

```
←32→                                                                            ←32→
┌──────────┬────────────────┬────────────┬────────┐            ⌕┌──────────┐ ┌──────────┐
│Captains 57│Applications 12│ Compliance │ Riders │◄─ flex ─►   │ Search…  │ │▤ Columns │
└──────────┴────────────────┴────────────┴────────┘            └──────────┘ └──────────┘
 ↑ segmented control, 32 tall, track #f6f8f9, r8              ↑ 240 (min 160)  ↑ auto
```

### 5.1 The view tabs — a segmented control

The owner rejected the tab strip's *treatment*, not its existence. This is the treatment,
and it is the reference's own answer for this exact job — switching what the list below
shows. Measured off `02b895df`'s `Build | Submissions` control in the top bar (the same
construction appears in `04592c4f` as `Top | Recent` and as `Build | Manage | Analyze`).

| | Value | Evidence |
|---|---|---|
| Component | `tabs` — `TabsList` restyled, `variant="segmented"` | `components.json` is frozen; this is a restyle, not an add |
| **Track height** | **32** = `--ev-control-h` | M — `02b895df` x = 420: track edge y 10 → 27 = 17 dest px = **31.9** |
| Track fill | `--ev-bg2` `#f6f8f9` | M — x 411–418 reads `(244,246,248)` |
| Track border | 1 px `--ev-hairline-control` `#dde0e4` | D — control weight, R23 |
| Track radius | **8** | `--ev-radius-control` |
| Track padding | **2** all round | M — at S = 1.875 a 2 px inset is 1 dest px, which is why the segments read as abutting |
| **Segment height** | **28** | 32 − 2 − 2 |
| Segment inline padding | **12** | |
| Segment radius | **6** | the inner radius of an 8 px container with 2 px padding |
| Segment gap | **0** — the segments abut | M — the tint runs continuously to x 444 and white begins at 445 |
| **Active segment** | `--ev-surface` `#ffffff` fill, 1 px `--ev-hairline-control`, label 13 / **500** / `--ev-ink` | M — `02b895df` x = 470 reads `(255,255,255)` from y 12 |
| Resting segment | transparent (the track shows through), label 13 / **400** / `--ev-text-2` | M |
| Hover, resting segment | `--ev-nav-hover` `#f0f2f4` fill, label `--ev-ink` | D — the only fill between the track and the active white |
| **Count** | the numeral alone, 13 / 400, `--ev-text-2` on a resting segment, `--ev-text-2` on the active one, **6 px** after the label | **R21** — a count inside a control is plain text. A chip inside a pill inside a track is three nested containers, which is craft-critique **F16** one level up. |
| Focus | `focus-visible:ring-2 ring-ring ring-offset-2` — §7.2, unmodified | The 2 px track padding gives the ring room; it does not clip. |

**Semantics.** `role="tablist"` with `aria-controls` pointing at the table region, arrow-key
traversal, `Home` / `End`. The active tab is the routed view (`?view=`), so browser
back/forward move between views.

**No `+` and no view menu.** `specs/00-foundation.md` §7.1's `Saved views` row describes
operator-created views with a trailing `+` and a per-view chevron. **That is out of scope
here and the affordances must not render**: M7's four views are fixed product structure, not
saved queries. §14.2 records the supersession.

### 5.2 The search field — persistent, never a mode

| | Value |
|---|---|
| Component | `input`, `type="search"` |
| Width | **240**, `flex-shrink: 1`, `min-width: 160` |
| Height | **32** = `--ev-control-h` |
| Fill / border / radius | white · 1 px `--ev-hairline-control` `#dde0e4` · 8 |
| Leading glyph | 16 px `⌕`, `--ev-text-2`, 10 px from the inline-start edge |
| Text / placeholder | 13 / 400 `--ev-ink` / `--ev-text-2` |
| Trailing `✕` | appears only when the field is non-empty; 24 × 24 hit area (§7.7), 12 px glyph, `--ev-text-2` |
| Debounce | 250 ms, then the request; the field never blocks typing |
| Focus | `ring-2 ring-ring ring-offset-2` |

**AC-47 is void.** The field is a permanent sibling of the tab strip. It never replaces it,
never hides it, never displaces it, and there is no `Cancel`. Typing changes the rows and
nothing else: **no band above the table changes height while the operator types.**

Craft-critique **F20.3** sided with the old rule and said losing view navigation mid-search
is nonetheless a poor trade on a 1440 px desktop. The critic's instinct and the owner's
instruction agree; the rule was the outlier. **The owner's instruction wins and the critic's
reasoning is why.**

### 5.3 The `Columns` control

`button variant="outline"`, 32 px, white, 1 px `--ev-hairline-control`, radius 8, leading
16 px columns glyph, label `Columns`, trailing `⌄`. Opens `ColumnLayoutPopover` (**D-15**,
already built): visibility checkboxes plus pin, per view, persisted per `tableId + view`.

**It is the operator's answer to the width budget**, and §7.3's contract makes it the *only*
way a table can be made to overflow. It is disabled — visible and disabled, per §3.6 — only
in the error state (§10.4).

### 5.4 The control row's width budget, measured

At 1280 the content column is **912** (`1280 − 304 nav − 2 × 32 gutter`).

| Item | English | Arabic (+25 % on labels) |
|---|---|---:|
| `Captains 57` segment | 12 + 58 + 6 + 16 + 12 = 104 | 122 |
| `Applications 12` | 12 + 88 + 6 + 16 + 12 = 134 | 156 |
| `Compliance` | 12 + 73 + 12 = 97 | 115 |
| `Riders` | 12 + 44 + 12 = 68 | 82 |
| track padding + border | 6 | 6 |
| **tab strip total** | **409** | **481** |
| `Search` field | 240 (min 160) | 240 (min 160) |
| gap | 8 | 8 |
| `Columns` | 12 + 16 + 6 + 55 + 6 + 10 + 12 = 117 | 134 |
| **control cluster** | **365** | **382** |
| **Σ** | **774** in 912 → **138 slack** | **863** in 912 → **49 slack** |

Arabic fits with 49 px to spare **without** the search field reaching its minimum. If a
future label pushes it past 912, the search field shrinks to 160 first — that is a
`flex-shrink`, not a mode, and the field never disappears. Below that, §2.3's dropdown
escape is authorised.

At 1440 the content column is **1040** (48 px gutter above `--ev-bp-wide`) and the slack is
266 English / 177 Arabic.

---

## 6. Band 3 — the query strip

The second element with no Shopify equivalent, and the band that carries the whole query.

```
←32→                                                                            ←32→
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
░ 8                                                                             8 ░
░  ┌────────────────────┐ ┌──────────────────┐ ┌─────────────┐                    ░
░8 │ Status: Active   ✕ │ │ City: Riyadh +2 ⌄│ │ + Add filter│  ◄flex►  Sorted by ░ 48
░  └────────────────────┘ └──────────────────┘ └─────────────┘        Trips ↓ ✕   ░
░ 8                                                                    ✕ Clear all░
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
 ↑ #f6f8f9, radius 8, NO border, full content width
```

### 6.1 It always renders. That is the point.

The built strip renders only when something is filtered, which means adding one filter
inserts 60 px and moves the table down. **The strip is permanent.** At rest it holds
`+ Add filter` and nothing else. The reference's own frame (`223f15e5`) shows a populated
strip at rest, and the match audit (R2.0 #5) correctly refused to conclude anything about
their default from one frame — so this is decided on Eyvar's own grounds: **a band that
appears and disappears is a band that moves the table, and the operator noticed.**

### 6.2 Geometry

| | Value | Evidence |
|---|---|---|
| Height | **48** | M — `223f15e5` tint spans destination y 106 → 130 = 24 dest = **45**; 48 is the grid value, and it is what the built strip already measures |
| Fill | `--ev-bg2` `#f6f8f9` | M — `(246,248,249)`, n = 2 640 flat |
| Border | **none**, all four sides | M |
| Radius | **8** | |
| Padding | **8** all round | M — chip leading edge 183 vs strip edge 178 = 5 dest = 9.4 |
| Width | the content column, exactly — same inline-start and inline-end as the table below it | M — reference strip 178 → 731, table 179 → 731 |
| Chip height | **32** | matches the control row, so the two bands share one beat |
| Chip gap | **8** | |

### 6.3 The four things the strip can hold, and their grammar

| Element | Shape | Why that shape |
|---|---|---|
| **A filter chip** — `Status: Active ✕` | `--ev-surface` **white** fill, 1 px `--ev-hairline-control` `#dde0e4`, radius 8, 32 px, label 13 / 400 `--ev-ink`, key in `--ev-text-2`, trailing `✕` with a 24 × 24 hit area | It is **state**. White on the tint so it reads as an object sitting on the strip. The chip is a `button` — clicking the body reopens the value picker, clicking `✕` removes it. |
| **A multi-value chip** — `City: Riyadh +2 ⌄` | same, with a trailing `⌄` instead of `✕`; the menu carries `Clear this filter` | §1.5 reserves the trailing caret for menu openers, so a chip that opens a menu must not also show `✕` |
| **`+ Add filter`** | chip-shaped `button variant="outline"`, 32 px, **transparent fill**, 1 px `--ev-hairline-control`, leading `+` | A control **shaped like** state. Transparent, not white, so it is not mistaken for an applied filter. |
| **The sort chip** — `Sorted by Trips ↓ ✕` | white chip, identical to a filter chip, at the **inline-end** of the strip | Sort applies to the whole set; filters narrow it. Putting it at the far end separates the two readings without a divider. `✕` returns to the view's default sort. |
| **`Clear all`** | **bare text button, no chip**, leading 12 px `✕`, 13 / 400 `--ev-text-2` | M — the frame shows no fill and no border. The strip's grammar: chips are state, `Add filter` is a control shaped like state, `Clear all` is an action **on** the set. Do not give it a chip. |

`Clear all` renders **only** when at least one of search query, filter or non-default sort is
active, and it clears **all three**, including the search field.

### 6.4 Why the search query has no chip

The field displays its own value. A chip would be a second readout of state that is already
visible, 44 px away. **Rule: state with a visible control lives in the control; state with
no visible control gets a chip.** That is what puts filters and sort in the strip and keeps
the query in the field, and it is the same rule that gives `Sorted by Trips ↓` a chip once
sort moved out of the toolbar.

### 6.5 What the strip replaces

`03-navattic-language.md` §4.4 put the strip above the card. `build/03-table-controls.md`
put it inside the card at a 0 px block-end gap. **Both are superseded**: with the card gone
(§7.1) there is no inside, and the strip is a first-class band with a declared 12 px on both
sides. Owner: `src/components/table/FilterChipRow.tsx`.

---

## 7. Band 4 — the table

### 7.1 There is no card

**The table is the bordered object.** The control row, the query strip and the pagination
row sit on the white content ground outside it. This was ordered by
`03-navattic-language.md` fix-list item 8 and never done, and it is what the reference does
in every table frame.

It closes three things at once:

- **Craft-critique F17** — *"the card that holds everything is invisible"*. It was invisible
  because a 1.122 : 1 border around 976 px of white containing more white has nothing to
  separate. The table's border has something to separate: a dense field of rules from an
  empty white page. **The border value does not change** (`--ev-hairline` `#f0f2f4`, matched
  exactly to the reference, match-audit C3/G25 closed); what changes is what it encloses.
- **Craft-critique F9** — four left edges collapse to one, because there is no card inset.
- The owner's *"margin between the table and the tabs"* — a real 12 px of white, twice, in
  place of a border-to-border adjacency.

**This supersedes `specs/00-foundation.md` §7.1's `Container` row and `DESIGN.md` §3.1's
one-card rule.** Both are §1–§5 Shopify observations that **D7** replaced. The bulk-action
bar's home moves with them (§12.2).

### 7.2 The table scrolls; the page does not

The content region is a flex column filling the viewport below the top bar. Bands 1, 2, 3
and 5 are `flex: 0 0 auto`. **Band 4 is `flex: 1 1 auto; min-height: 0`** and owns
`overflow: auto` on both axes.

Consequences, all of them wanted:

1. **The pagination row is always in the viewport.** It currently sits at y = 1278 in an
   820 px viewport at *both* widths — the owner has literally never seen it (match audit
   S16′, N2).
2. **The horizontal scrollbar, when it exists, is always in the viewport.** Craft-critique
   **F1** part 3: the scrollbar that would recover a clipped money value sat ~430 px below
   the fold. It now sits at the block-end of a 492 px box.
3. **`<thead>` sticky finally works.** `build/03-table-controls.md` §2.1 recorded that the
   vertical sticky was inert because the scroller had no height constraint. It has one now.
   The declarations were already correct; they start working with no code change.
4. **Every control stays fixed while the data moves.** That is the difference between a
   console and a document, and the console is what an operator keeps open all day.

**Floor guard.** `min-block-size: calc(36px + 3 * 60px)` = **216** on the scroller. Below
that the page itself scrolls, which is the documented fallback and not a second breakpoint.

**Cost, stated honestly:** 7 visible rows at 1280 × 800 against 25 per page. The reference
shows 6. This is not a loss of density; it is where the density now lives.

### 7.3 The width contract — how F1 is made *impossible*, not unlikely

Craft-critique **F1** is a correctness bug: the pinned action column paints on top of
`Earned (SAR)`, rendering `12,40` where the truth is `12,400.50`. Under forced RTL it eats
the **leading** digits: `1,284` renders as `284`. Every view overflows at 1440 —
162 / 130 / 122 / 66 px — while 1280 is correct. **The fix is a budget, not a paint order.**

```
1280:  content column 912  →  table inner width  910  (minus 2 px of outer border)
1440:  content column 1040 →  table inner width 1038
```

**The contract, and it is a build-time assertion, not a review item:**

1. `table-layout: fixed; inline-size: 100%`.
2. Every column declares a width in px. **Exactly one column is flexible: the identity
   column, declared `width: auto`.**
3. **Σ(all declared px widths) + the identity column's `min-inline-size` MUST be ≤ 910.**
   A unit test asserts it per view. It cannot regress silently.
4. The identity column absorbs 100 % of the residual. Its **inner content box** is clamped
   at `max-inline-size: 320`; residual beyond that becomes trailing air inside the cell,
   which is invisible.
5. **A column whose `dataType` is `money` or `id` MUST NOT be the last visible data
   column.** Enforced in the same test.
6. Un-hiding a column through `Columns` may push Σ over the inner width. **At that point,
   and only then, the table scrolls horizontally** — which §3.1 sanctions, and which is now
   an operator-initiated state rather than the default one.

**Rule 6 is why §3.1's horizontal-scroll sanction survives intact.** The critique sided with
the rule; so do I. What was wrong was never the scrolling — it was that the default state
required it and the recovery was unreachable.

### 7.4 The default column sets, all four views

Row height **60** (`--ev-row-h-media`) in all four. Selection column **40**. Widths in px.

**Captains** — `Σ fixed 632 + min 200 = 832 ≤ 910` ✓ · identity gets **278** @1280, **406**
(content clamped to 320) @1440 · trailing data column is `City`, text ✓

| Column | Width | Align | Type | Cell |
|---|---:|---|---|---|
| *selection* | 40 | centre | — | `checkbox` |
| **Captain** | auto, **min 200** | start | identity | two-line: name / phone. Pinned implicitly (**AC-104**), never hideable |
| Status | 112 | start | enum | §9 — plain text at rest, badge only when not `Active` |
| Rating | 80 | **end** | number | tabular figures, 1 decimal |
| Trips | 88 | **end** | number | tabular figures, grouped |
| Earned (SAR) | 128 | **end** | money | `--ev-ink`, tabular, 2 decimals |
| City | 128 | start | text | truncates with an ellipsis |
| *actions* | 56 | end | — | `⋯` kebab (n ≥ 3) |

Default-hidden, available in `Columns`: `ID` · `Subs` · `On time` · `Last trip` · `Tier` ·
`Class` · `Vehicle` · `Phone` · `Joined`.

**Applications** — `Σ fixed 644 + min 200 = 844 ≤ 910` ✓ · identity **266** @1280

| Column | Width | Align | Type | Cell |
|---|---:|---|---|---|
| *selection* | 40 | centre | — | |
| **Applicant** | auto, min 200 | start | identity | two-line: name / `Applied 24 Jun` |
| ID | 112 | start | id | `APP-2204`, 13 / 500 |
| Status | 112 | start | enum | §9 |
| SLA | 120 | start | duration | countdown **in words**: `2h 14m` · `overdue 1d 16h`. **No gauge** — §9.4 |
| Owner | 144 | start | enum | owner chip (§8.4.1) or plain `Unclaimed` |
| *actions* | **116** | end | — | **decision triad** `✓ ✗ View` — D8, §7.8 |

Default-hidden: `Decision` (176) · `Applied` · `City` · `Class`.

**Compliance** — `Σ fixed 608 + min 200 = 808 ≤ 910` ✓ · identity **302** @1280

| Column | Width | Align | Type | Cell |
|---|---:|---|---|---|
| *selection* | 40 | centre | — | |
| **Captain** | auto, min 200 | start | identity | two-line: name / `DRV-0104` |
| Documents | 160 | start | derived | `4 of 5 valid` — plain text; `1 expired` in `--ev-red` text |
| Next expiry | 128 | start | date | `12 Aug · 45d` — plain text; inside the alert window, `--ev-red` text |
| Status | 112 | start | enum | §9 |
| Dispatch | 112 | start | enum | `Allowed` plain · `Blocked` warning badge |
| *actions* | 56 | end | — | `⋯` kebab |

Default-hidden: the five per-document columns `Licence` · `Registration` · `Inspection` ·
`Insurance` · `Operating card`, each **plain text** (`Valid · 405d` / `Expires in 5d` /
`Expired`).

**This is the single largest visual change in the document.** Compliance renders **51
badges** today, 33 of them computed day counts. Collapsing five per-document badge columns
into one `Documents` cell and demoting the counts to text takes the screen from 51 coloured
elements to **about 4** — and the two records that matter, `DRV-0202` and `DRV-0104` with
expired documents, become the loudest things on the page. Craft-critique **F4**.

**Riders** — `Σ fixed 672 + min 200 = 872 ≤ 910` ✓ · identity **238** @1280

| Column | Width | Align | Type | Cell |
|---|---:|---|---|---|
| *selection* | 40 | centre | — | |
| **Rider** | auto, min 200 | start | identity | two-line: name / phone |
| Status | 112 | start | enum | §9 |
| City | 128 | start | text | |
| Subs | 88 | **end** | number | |
| Wallet (SAR) | 128 | **end** | money | negative values in `--ev-red` **text** — §9.3, F20.5 |
| Churn risk | 120 | start | ordinal | **three-tick meter + word** — §9.2, never a badge |
| *actions* | 56 | end | — | `⋯` kebab |

Default-hidden: `Lifetime (SAR)` · `Renewal` · `Quick rides` · `Joined`.

### 7.5 The header row

| | Value | Evidence / reason |
|---|---|---|
| Height | **36** — `--ev-row-h-head`, **raised from 32** | 13 / 500 label in a 20 px line box + 8 / 8 padding |
| Ground | `--ev-bg2` `#f6f8f9` | M — match audit G28 closed |
| Label | **13 px / 500**, sentence case, `--ev-text-2` `#6b7280` | **raised from 12** — the reference measures ≈ 14 (audit G30′). 13 is Eyvar's body step and one step below the reference; it is not a density deviation because **D-2 is retired** |
| **Vertical column rules** | **NONE in `<thead>`** | M — the reference's header deficit profile is flat at 8.15–8.35 across x 206–264, no spikes. Match audit **N1**, `High`. The rule selector must be `tbody`-scoped. |
| Block-end rule | 1 px `--ev-hairline` `#f0f2f4`, full width | |
| Radius | 8 on the two block-start corners only | |
| Sticky | `position: sticky; inset-block-start: 0; z-index: 20` | works now — §7.2 |
| Cell | one `button` per column that declares a control (**D-6**), resting `⌄`, 12 px inline padding | already built |
| Sort indicator | exactly one column, ever, an **arrow** `↑` / `↓` — never a chevron | **AC-45** upheld verbatim |
| Sorted header weight | **500, `--ev-text-2`** — unchanged from its neighbours | craft-critique **F20.2**: the arrow already carries the signal; bolding one word made it look like a mistake |

**A pinned pair, and it is the tightest ratio in the product.** `--ev-text-2` `#6b7280` on
`--ev-bg2` `#f6f8f9` measures **4.538 : 1** — it clears AA by 0.038. It is the header label,
the resting tab label and the chip key. **Neither token may move without re-deriving this
pair.** Recorded as proposed ruling **R22** (§14.3). The alternative — the reference's
`#4b5563` at 7.094 : 1 — would introduce a sixth grey with no other consumer; the alternative
of a white header ground would delete a match the audit has already closed. The pair is kept
and pinned.

### 7.6 The body row

| | Value | Evidence |
|---|---|---|
| **Height** | **60** — `--ev-row-h-media`, **changed from the declared 64** | Reference **61.9** (separators at destination y 187/220/253/286/319/352, pitch 33 × 1.875). 60 is the nearest 4 px grid value, **−3.2 %**, and it is exactly the content box: 32 px avatar or 38 px of two line boxes, plus 11 / 11. The declared 64 implies S = 1.939 and a 1489 px frame, which is wrong (audit R2.0 #1). |
| **Uniform** | **Every row in a table is the same height. No exceptions.** | Proposed ruling **R20** — §14.3 |
| Fill | `--ev-surface` `#ffffff`, no zebra | M |
| Separator | 1 px `--ev-hairline` `#f0f2f4` | M — exact |
| **Vertical column rules** | 1 px `--ev-hairline` `#f0f2f4`, between every pair of body cells, **body only** | M — §7.5 |
| Hover | `--ev-bg2` `#f6f8f9` | X — not evidenced; taken from the strip tint so no new value enters |
| Cell padding-inline | **12** | M — six independent readings, mean 6.9 dest = 12.9 |
| Cell padding-block | **11 / 11** for the identity cell; other cells `vertical-align: middle` | 60 − 38 = 22 |
| Ordinary cell ink | `--ev-text-2` `#6b7280` | M — their `text-subtle`, exact |
| Identity ink | `--ev-ink` `#171a21` | see below |
| Numeric cells | inline-end, `font-variant-numeric: tabular-nums`, **do not flip in Arabic** | R4 / §9.2 |
| Breached row | 3 px `--ev-marker` `--ev-red` leading edge, **spanning the row's border-bottom** | R5a; craft-critique **F19** — put the marker on the `<td>`, not `inset-y-0` on an inner box, or it leaves a 1 px white nick |

**R20, stated, because `DESIGN.md` §3.1 contradicts itself and the build followed the wrong
half.** §3.1's prose says a two-line primary cell *"grows to fit rather than truncating"*;
§3.1's **Rules** block says row height *"MUST be uniform within a table"*. Measured today:
Applications runs **117, 44, 44, 69, 44, 44, 44, 41**; Compliance **81, 41 × 5, 65, 49**.
A data table's rules are a repeating beat, and five interval changes in eight rows reads as
damage. **The MUST wins; the prose clause is void.** The reference is uniform at 61.9 across
rows that do and do not carry a second identity line. Consequence: **the two-line identity
cell applies to every row in the table or to none** — a value with no second line renders the
name vertically centred and leaves the second line box empty. Partial application is what
makes the table look ragged, and it is worse than either extreme.

### 7.7 The identity cell — one construction, applied to every row

```
←12→ ⬤ 32px circle ←8→ Nora Al-Harbi              13 / 500 / --ev-ink,  truncate
                       +966 5x xxx xxxx           12 / 400 / --ev-text-2, truncate
```

| | Value |
|---|---|
| Avatar | **32 px circle**, `--ev-bg2` fill, 1 px `--ev-hairline` ring, initials or a 16 px person glyph in `--ev-text-2` | 
| Avatar → text gap | **8** |
| Line 1 | 13 / **500** / `--ev-ink` `#171a21`. A link to the record's detail (**AC-43**). Never wraps; truncates with an ellipsis. |
| Line 2 | 12 / 400 / **`--ev-text-2` `#6b7280`** — **not** `--ev-text-3` |
| Line boxes | 20 + 18 = 38; padding 11 / 11 = 60 |
| Second line content | a value that **qualifies** the primary one: a phone, a city, an id, an applied date. `01-people.md`'s ruling that a driver id gets its own column stands for Captains; Compliance uses the id as the second line because there the id *is* the qualifier. |

**Why line 2 is `--ev-text-2` and not the reference's colour.** The reference's second line
samples `#a7a9ab` = **2.358 : 1**, and `--ev-text-3` `#9ca3b0` = **2.536 : 1**. Both fail
§7.1.1, which has no large-text tier at 12 px. `#6b7280` on white is **4.834 : 1**. This is
match-audit **W1**, it was dormant because the cell had not landed, and it goes live the
moment this spec is built. **`--ev-text-3` has zero consumers and must keep zero.**

**Identity ink.** The reference's identity line is `#384252` (`text-default`, 10.148 : 1);
ours is `--ev-ink` `#171a21` at 17.411 : 1 — 1.7× their contrast (audit G38′). **Kept as
`--ev-ink`.** Introducing a third ink for one cell buys 7 points of contrast nobody asked to
lose, and the two-level ladder `--ev-ink` / `--ev-text-2` is what makes the identity column
the focal point in §2.1. Recorded as a named divergence, not an oversight.

### 7.8 The actions cell — implementing D8

**D8** (owner): *"if only 1 action put the action not 3 dots"* · *"if it's approve/reject put
them check and cross and view not three dots also."*

| Row actions | Renders | Column width |
|---|---|---:|
| **1** | that action as a **labelled** `button variant="outline"`, 28 px | 12 + label + 12, declared per view, **88** default |
| **A decision pair** | **three 28 × 28 icon buttons** — `✓` `✗` `View` — 4 px apart | 12 + 3×28 + 2×4 + 12 = **116** |
| **3 or more, no decision pair** | `⋯` kebab, 28 × 28 | 12 + 28 + 12 = 52 → **56** |

**Geometry, against §7.7.** Controls are 28 × 28, ≥ 24 ✓. Centres are 32 px apart, so the
24 px circles required by SC 2.5.8's spacing exception do not intersect ✓. In a 60 px row
the padding-block is 16 / 16 ✓. **A 41 px row could not have held this; a 60 px row does.**
That is why the actions column, the row height and the target size are one decision and not
three — exactly as the orchestrator framed it.

**Rendering.**

| | Spec |
|---|---|
| Resting | **fully visible, at rest, no hover required** (**AC-68**; legacy defect **D19** is hover-only row actions). 1 px `--ev-hairline-control` `#dde0e4`, white fill, glyph 16 px `--ev-text-2`, radius 8 |
| Hover / focus | glyph → `--ev-ink`, fill → `--ev-bg2` |
| Focus ring | `ring-2 ring-ring ring-offset-2` |
| **`✓` Approve** | glyph `--ev-text-2` at rest, `--ev-green` on hover. Accessible name **`Approve application APP-2204`** |
| **`✗` Reject** | glyph **`--ev-red` `#b42318`** at rest. Accessible name **`Reject application APP-2204`** |
| **`View`** | eye glyph, `--ev-text-2`. Accessible name **`View application APP-2204`** |
| Tooltip | each carries a `tooltip` naming it (§5.7 — tooltips name icon-only controls and do nothing else) |

**Red, and why this is not a fifth use.** R5a enumerates four permitted uses; use #1 is *a
destructive button*. An icon-only destructive button is a destructive button. It is rendered
as a **red glyph on a white control** rather than a red fill, because a red fill on every row
of a queue re-creates precisely the "colour spent forty times" defect this document exists to
remove. **It is never colour-alone**: the glyph is a distinct shape, the accessible name says
`Reject`, and the tooltip says `Reject`.

**Confirmation, which D8 requires an answer to.**

| Action | What happens | Why |
|---|---|---|
| **Reject** | **Immediate.** The row converts in place: `Status` → `Rejected`, the actions cell becomes `Undo` for 10 s, then `View`. Toast: **`Rejected APP-2204.`** with an `Undo` action, 10 s. | Reject is reversible — the application returns to `Pending`. A confirm dialog on every row of a queue somebody works all day is two clicks per decision, and the operator learns to dismiss it unread within a day. An undo that is *actually there* is a better safeguard than a dialog that is *actually ignored*. |
| **Approve** | **`alert-dialog`, 440 px.** Title `Approve APP-2204?` · body `Yousef Al-Balawi becomes an active captain and can be dispatched.` · primary `Approve` (near-black, **not** red — this is not unrecoverable in the destructive sense) · secondary `Cancel`. Then toast **`Approved APP-2204.`**, no undo. | Approval writes a captain record downstream and issues dispatch eligibility. It is not reversible by removing a row. |

The row **converts in place and does not vanish** (§7.3 of the foundation spec). Legacy
`alert()` at `:5233` is defect **D10** and is not inherited.

**Raised for product-owner, not decided here:** if `approveDriver()` can be made to defer its
downstream write for the 10 s of the toast, **both** dispositions become undo-only and the
dialog is deleted. That is a data-layer question, and `specs/02-work-queues.md` owns the
disposition set. The **rendering** rule above is mine and does not change either way.

### 7.9 The pinned column boundary

Match audit **N4**: `--ev-hairline2` now holds the same `#f0f2f4` as `--ev-hairline`, so the
frozen-column edge is **zero steps darker** than every ordinary rule and the pinning signal
is gone.

**The pinned cell takes:**

- `background: var(--card)` — **opaque**. This is craft-critique **F1** part 2: without a
  fill the pin paints digits away instead of occluding them.
- 1 px **`--ev-hairline-control` `#dde0e4`** on its scroll-facing edge (`inline-end` for a
  start-pinned column, `inline-start` for an end-pinned one).
- **No shadow.** `build/03-table-controls.md` §2.1 ruled that separation at both sticky
  boundaries is a hairline, never a shadow, and the whole reference language is 1 px border
  with no shadow. That ruling stands; what was missing was a *visible* hairline.

**`--ev-hairline2` is retired as a distinct value and aliased to `--ev-hairline`.** Two
hairline weights in the product and only two — proposed ruling **R23** (§14.3). It has zero
call sites today, so the alias breaks nothing, and its comment block must be rewritten or the
next engineer will use it as a section rule.

---

## 8. Band 5 — the pagination row

Height **40**, ground white, **no border above it** — the table's own outer border already
terminates the data. 12 px above, 24 px below.

```
←32→                                                                            ←32→
 [25 ▾]  rows per page                              1–25 of 57   ‹ Previous   Next ›
 ↑ select 32           ↑ 13/400 --ev-text-2         ↑ 13/400 --ev-text-2   ↑ text buttons
```

| Slot | Spec |
|---|---|
| inline-start | `select`, **32 px**, white, 1 px `--ev-hairline-control`, radius 8, options `25 · 50 · 100`, trailing `⌄`. Accessible name `Rows per page`. Then the words `rows per page`, 13 / 400 `--ev-text-2`, 8 px after. |
| inline-end | The range `1–25 of 57`, 13 / 400 `--ev-text-2`, tabular figures. Then 12 px, then `‹ Previous` and `Next ›` as `button variant="ghost"`, 32 px, 13 / 500 `--ev-ink`; **disabled** state is `--ev-text-2` with `aria-disabled`, visible, never removed. |
| Gap | 12 between the two end clusters' members |

**It is outside the table.** Match audit **N2** flipped this from match to mismatch when the
pager moved *into* the card; the reference's sits ~22 px below the card's bottom edge
(destination y 352 → 364). Twelve is the grid value and it is the same 12 the rest of the
composition uses.

**The rows-per-page select is new** (audit **G42** — absent today).

**Truncation is stated in words, never silently** (`:12250`). Where the result set is capped:
`Showing 1–25 of 412` and, on the last page of a capped set, `Showing 400 of 412 — refine the
search to see the rest.`

---

## 9. Colour policy — what may be a badge

Craft-critique Blocker 3: colour is spent about forty times per screen. Compliance renders
**51 badges**, 33 of them computed day counts, which is a direct **§3.4 MUST** violation
(*"Derived, computed, or descriptive values MUST be plain text — never a badge"*). `Approved`
is green in `Status` and grey in `Decision` **in the same row**. `High` and `Medium` churn
risk are **byte-identical**.

### 9.1 The rule

> **A value may be a badge only if it is a lifecycle state the operator can act on or change,
> **and** only when it is not that column's resting value.**

The second clause is new and it is proposed ruling **D-21** (§14.3). A column in which 25 of
25 values are identical is not communicating a lifecycle; it is drawing 25 rectangles.

| Column value | Renders as |
|---|---|
| The column's **resting** value — `Active`, `Allowed`, `Valid` | **plain text**, 13 / 400 `--ev-text-2` |
| Any **departure** from rest — `Suspended`, `Blocked`, `Pending`, `In review`, `Approved`, `Rejected`, `Expired` | a `badge`, one tone from the five (R7) |

The cell is never blank. `Active` still reads `Active`; it just stops shouting.

**Effect, measured against the current build:** Captains loses 25 badges. Compliance goes
from 51 to about 4. Riders loses its churn column's 13. Applications keeps its `Status` badge
on the rows that are not `Pending`.

### 9.2 The three columns that stop being badges outright

| Column | Was | Becomes | Rule |
|---|---|---|---|
| **Compliance day counts** (33 of them) | green / amber badges | **plain text**, inline-end, `--ev-text-2`. Inside the alert window: the same text in **`--ev-red`** | §3.4 — derived values MUST be plain text; §3.4 also prescribes the critical *text* tone for a numeric value carrying a risk reading |
| **`Decision`** (Applications) | a `badge` reading `Approved`, grey, beside a green `Approved` in `Status` | **plain text, one line, `nowrap`, truncating**: `Approved · Yousef Al-Balawi · 24 Jun 11:20`. **Default-hidden.** | §3.4 — *"the same label MUST NOT change tone between screens"*, broken inside one row. It is a record of what happened, not a status. Craft-critique **F5**, **F11** |
| **`Churn risk`** (Riders) | `Low` / `Medium` / `High` badges, two of them byte-identical | **a three-tick meter plus the word.** Three 8 × 3 px ticks, 2 px apart, filled `--ev-text-2` / empty `--ev-hairline-control`, then the word at 13 / 400 `--ev-ink`. Colourless, ordinal, sortable by eye down the column. | §3.4 names this exact scale as *not a badge*. R7 and R17 are **not** widened — the identical colour was the symptom of forcing an ordinal scale into a closed status palette. Craft-critique **F6** |

### 9.3 The critical **text** tone — the one colour that is added

`--ev-red` `#b42318` as a **text** colour, `6.574 : 1` on white, on exactly three values:

1. a document **inside its expiry alert window** or already expired (Compliance);
2. a **negative wallet balance** (Riders) — craft-critique **F20.5**; today `-41.50` renders
   identically to `0.00`, and it is the one number on that screen an ops person must spot;
3. the SLA countdown once it reads `overdue …` (Applications).

**This is not a fifth use of red under R5a.** R5a enumerates uses of red as a *surface* — a
destructive button, a banner, a row edge marker, a map marker. A number rendered in the
critical text tone is what **§3.4 already prescribes** (*"a low stock count SHOULD take the
critical text tone"*). It is never the only carrier: every one of the three also reads in
words (`Expired`, a leading `−`, `overdue`).

### 9.4 Two things deleted

- **The SLA gauge.** A 3 px bar under each SLA badge with an **invisible** track (`#f6f8f9`,
  1.03 : 1) and a fill in a maroon that matches nothing else on the screen. Craft-critique
  **F12** proposes raising the track to `--input`. **I delete it instead.** R5a already
  requires *three* carriers of breach — a page banner, a row edge marker, and the word
  `overdue` — and explicitly says none substitutes for another. A fourth, illegible carrier
  is noise. §8.4 requires *one SLA countdown*, which is a countdown, not a gauge.
- **The `new` badge's near-black outline.** Craft-critique **F7**: the non-interactive
  `Pending` badge carried a 1 px **`--ev-ink`** outline while the `Approve` button beside it
  carried `--ev-hairline` at 1.122 : 1 — the affordance exactly inverted. **The `new` outline
  tone is ratified and stays** (it is what lets R7's five tones survive without a sixth
  fill). Two fixes, neither touching R7: its border becomes **`--tone-info-foreground`**
  (matching its own label, not the button ramp), and its height drops to **18** so it can
  never be mistaken for a 28 px control. The row controls' border rises to
  `--ev-hairline-control`, so the interactive element is at least as defined as the static
  one.

### 9.5 Badge geometry — unchanged, and do not touch it

Radius 4 (`--radius-sm`), 20 px tall (18 for the `new` outline), 11 / 600, sentence case,
never a stadium. The craft critique found this **executed to spec** and said so. **The
problem was always where badges were used, never how they were drawn.**

---

## 10. Every state, drawn

Four base states plus the domain states this screen introduces. **Every one holds the band
geometry of §1.2 exactly** — no state moves a band.

### 10.1 Content — §1.1.

### 10.2 Loading

```
 People  ▒▒▒                                                        [ Export ]     ← count is a 26×17 skeleton
 ┌Captains ▒▒│Applications ▒▒│Compliance│Riders┐         ⌕[Search  ] [▤ Columns]   ← counts skeletonised
 ░ [+ Add filter]                                                              ░   ← strip renders, live
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │░☐░│░Captain░░░░░│░Status░│░Rating│░Trips│░Earned░│░City░│░░░░░░░░░░░░░░░░░░░░│  ← REAL header, real labels
 ├───┼─────────────┼────────┼───────┼──────┼────────┼──────┼────────────────────┤
 │ ▒ │⬤ ▒▒▒▒▒▒▒▒▒  │ ▒▒▒▒▒  │  ▒▒▒  │ ▒▒▒  │  ▒▒▒▒  │ ▒▒▒▒ │                    │  60
 │   │  ▒▒▒▒▒▒      │        │       │      │        │      │                    │
 ├───┼─────────────┼────────┼───────┼──────┼────────┼──────┼────────────────────┤
 │              … 7 rows, the same count the content state shows …               │
 └──────────────────────────────────────────────────────────────────────────────┘
 [25 ▾] rows per page                                    ▒▒▒▒▒▒▒▒   ‹ Prev  Next ›
```

**The skeleton is derived from the same column definition the table uses.** Not "matched" —
derived, so they cannot diverge.

| | Value |
|---|---|
| Row pitch | `--ev-row-h-media` **60** — the table's own token |
| Row count | `min(pageSize, floor(scrollerHeight / 60))` → **7** at 1280 × 800 |
| Column count | the **visible** column count for the active view |
| **Header row** | **real** — the labels do not depend on data. Only the body cells are skeletons. |
| Skeleton bar | `--ev-bg2` fill, radius 4, height 12 (line 1) / 10 (line 2), width 60 % of the cell's content box; the avatar is a 32 px `--ev-bg2` circle |
| Motion | the existing `skeleton` shimmer, suppressed under `prefers-reduced-motion` |
| Controls | tabs, search, `Columns`, `Add filter` all **enabled** — changing the query while loading is legitimate |

Craft-critique **F3**: the built skeleton runs at 64 px against real 41 px rows and renders
3 header bars against 10 real columns, producing **~575 px of cumulative layout shift** on
every load. Deriving both from the column definition makes that class of bug unrepresentable.
The count chip and the top bar's `Mine` chip reserve their boxes, so nothing slides
horizontally either.

### 10.3 Empty — `no-match` (filtered or searched to zero)

**Inside the table's border**, occupying the space of three rows so the table does not
collapse. **No illustration, no heading** (R8).

```
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │░☐░│░Captain░░░░░│░Status░│░Rating│░Trips│░Earned░│░City░│░░░░░░░░░░░░░░░░░░░░│
 ├───┴─────────────┴────────┴───────┴──────┴────────┴──────┴────────────────────┤
 │                                                                              │
 │                     No captains match "sam".                                 │  13/400 --ev-text-2
 │                        [ Clear search ]                                       │  outline button, 32
 │                                                                              │  180 total
 └──────────────────────────────────────────────────────────────────────────────┘
```

**The header row stays.** The operator must be able to see and change the columns and the
sort that produced nothing.

**The copy names the right noun** — craft-critique **F10** found `No captains match these
filters` shown after the user typed in a **search** box.

| What is narrowing | Line | Action |
|---|---|---|
| query only | `No captains match "sam".` | `Clear search` |
| filters only | `No captains match these filters.` | `Clear filters` |
| both | `No captains match this search and these filters.` | `Clear all` |

The action is a real `button variant="outline"`, **32 px, `--ev-hairline-control` border** —
the same control the toolbar uses, so it is recognisable as a control. It was bold black text
with no border, no fill and no icon, which read as the second sentence of the message.

### 10.4 Empty — `first-run` (zero records ever)

Whole-page. Illustration, heading, body under ~380 px, one action. R8's kind 1, and it
applies to a **page**, never to a card.

```
                              ┌─────────┐
                              │  illus  │   160 × 120, --ev-bg2 line art
                              └─────────┘
                        No captains yet                     17/600 --ev-ink
        Captains appear here once an application is         13/400 --ev-text-2
        approved. Start with the applications queue.        max-inline-size 380, centred
                     [ Go to applications ]                 button, near-black primary
```

Bands 1, 2 and 3 still render, with `Columns` and `Add filter` **disabled and visible**
(§3.6). The table's border does not render — there is no table.

**Craft-critique F14 applies to the placeholder screens and is adopted:**
`/management/performance` and `/management/zones` render a **1072 × 49 full-width bordered
stripe** containing one grey developer status message. That is the *empty card* pattern
applied to a *whole page*. They take this state instead, and their copy names what the
feature will do, not its build status.

### 10.5 Empty — `cleared` (a work queue worked to zero)

**A third kind, and R8 does not have it.** A queue at zero is neither first-run (records have
existed) nor no-match (nothing is narrowing). It is a **success**, and rendering an
illustrated first-run state over it tells an operator who just cleared their queue that they
have never had one.

```
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │░☐░│░Applicant░░░│░ID░░░░░│░Status│░SLA░░│░Owner░░│░░░░░░░░░░░░░░░░░░░░░░░░░░░│
 ├───┴─────────────┴────────┴───────┴──────┴────────┴───────────────────────────┤
 │                        Nothing waiting                      13/500 --ev-ink   │
 │        Applications appear here when a captain applies.     13/400 --ev-text-2│  180
 └──────────────────────────────────────────────────────────────────────────────┘
```

No illustration, no action, one heading, one line. **Raised as a proposed amendment to R8 and
to `docs/ref/states.md`** (§14.3, **R24**) — I am specifying it because the screen needs it,
and flagging it because extending R8 is not mine to do alone.

### 10.6 Error — card scope

**Inside the table's border.** The table's own border is what marks the failure's extent.

```
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │░☐░│░Captain░░░░░│░Status░│░Rating│░Trips│░Earned░│░City░│░░░░░░░░░░░░░░░░░░░░│
 ├───┴─────────────┴────────┴───────┴──────┴────────┴──────┴────────────────────┤
 │                                                                              │
 │              ⊘  Couldn't load captains.                    16px --ev-red glyph│
 │                 The connection timed out. Request 8f2c41d. 13/400 --ev-text-2 │
 │                 [ Try again ]                              outline button, 32 │
 │                                                                              │  180
 └──────────────────────────────────────────────────────────────────────────────┘
```

| | Spec |
|---|---|
| Glyph | 16 px alert circle, **`--ev-red`**, aligned to the **first line**, 8 px before it. This is the one thing that makes error visually distinct from empty at a glance — craft-critique **F10** found the two rendered identically. |
| Line 1 | `Couldn't load captains.` — 13 / **500** / `--ev-ink` |
| Line 2 | the reason, then the request id — 13 / 400 / `--ev-text-2` |
| Action | `Try again`, `button variant="outline"`, **32 px, `--ev-hairline-control` border** |
| Height | **180**, identical to `no-match`, so switching between them moves nothing |
| Page header | the count renders `—`; the band stays 32 |
| Controls | tabs, search and `Add filter` stay **enabled** — each re-issues the request, which is a retry with a different query, and disabling them would trap the operator. **`Columns` is disabled** and visible: it configures a table that is not there. |

`02-visual-refinement.md` **V9** (no icon on the error state) is **superseded**: it was
written when error and empty were distinguished by copy alone, and the craft critique
measured the cost of that. §3.6 requires disabled page actions to remain visible, and §7.5
requires that a state is never signalled by colour alone — the glyph plus the word
`Couldn't` satisfies both.

### 10.7 Error — row scope (AC-41)

The failing row's **actions cell** is replaced in place:

```
 │ ☐ │⬤ Yousef Al-…│Pending │ 2h 14m│Unclaim.│ ⊘ Couldn't approve.  [Try again] │
```

Ground `--ev-red-lt` `#fef0ee` on the actions cell only, 12 px glyph, 12 / 400 message,
`Try again` as a 24 px text button. **No page banner, no toast.** Every other row stays
interactive.

### 10.8 Domain state — a breached work queue (R5a, AC-50)

All three parts, and none substitutes for another:

1. **One page-level banner**, directly below band 1 and above band 2, pushing bands 2–5 down
   by its height + 12. Tone `critical`, fill `--ev-red-lt`, 1 px
   `color-mix(in srgb, var(--tone-critical-foreground) 12%, transparent)`, radius 8, padding
   12, 16 px glyph aligned to the first line. Copy: **`3 applications are overdue.`** with a
   trailing `Show only breached` text button. **Never more than one banner** (R10).
2. **A 3 px `--ev-marker` leading edge** on each breached row, on the `<td>`, spanning the
   row's border-bottom (craft-critique **F19**).
3. **The countdown reads `overdue 1d 16h` in words**, in `--ev-red` text.

Rendered in greyscale, the marker and the word still say which rows are breached.

### 10.9 Domain state — selection active (AC-46)

Selecting any row **replaces the column-header row** with `3 selected` at 13 / 500
`--ev-ink`, plus a `Clear` text button — it does not overlay a banner above the table. All
per-column header controls are absent while selection is active
(`01-table-controls.md` §11.10, unchanged).

The **bulk-action bar** is a white rounded bar with `--ev-shadow-2`, radius 8, centred on the
table's inline axis, **anchored 16 px above the table's block-end edge, inside the table's
bounding box**, overlaying the last rows. At most three labelled actions, then `…`.
Destructive overflow items are **not** red — the confirmation carries the weight.

This supersedes **AC-46**'s phrase *"inside the table card"* to *"inside the table's bounding
box"*, a consequence of §7.1 (§14.2).

### 10.10 Domain state — a decided queue row

`Status` → `Approved` (success badge) or `Rejected` (neutral badge — **never a red badge**,
R5). The actions cell shows `Undo` for 10 s, then `View`. The row stays in place; it does not
vanish.

### 10.11 The state matrix

| | Page header | Control row | Query strip | Table | Pager |
|---|---|---|---|---|---|
| content | H1 + count | live | live | rows | live |
| loading | H1 + skeleton count | live, counts skeletonised | live | header real, 7 skeleton rows | range skeletonised |
| no-match | H1 + `0` | live | live | header + 180 px message | `0 of 0`, both nav disabled |
| first-run | H1 + `0` | live, `Columns` disabled | live, `Add filter` disabled | **absent** | absent |
| cleared | H1 + `0` | live | live | header + 180 px message | `0 of 0` |
| error, card | H1 + `—` | live, `Columns` disabled | live | header + 180 px message | `—`, both nav disabled |
| error, row | unchanged | unchanged | unchanged | one cell replaced | unchanged |
| breached | + one banner | pushed down | pushed down | markers + words | unchanged |
| selection | unchanged | unchanged | unchanged | header replaced, bulk bar | unchanged |

**Forbidden combinations:** a banner and a toast for one event (R10) · two banners (R10,
AC-40 collapses them into one with a count) · an illustration inside the table's border (R8)
· a red badge (R5) · an error state that removes the control row.

---

## 11. The detail drawer

The owner rejected this too — *"also the side sheet that opens looks bad."* The reference has
a good one and it is measured here: `79a31934` (Details tab), `9eb629ea` (Activity tab),
`1ef8248f` (the properties/search variant).

**It stays non-modal with no scrim, and focus enters without trapping** — §5.5, §7.3.3,
**AC-67** as amended. The reference agrees: the table behind the drawer is fully lit
`#ffffff` at every sampled row. **Do not spec a scrim.**

### 11.1 Anatomy, measured

```
                                    ┌──────────────────────────────────────┐ 480
                                    │                                      │
                                    │  Captain                          ✕  │ 72   header, white
                                    ├──────────────────────────────────────┤ ← 1px --ev-hairline
                                    │░ ⬤  Nora Al-Harbi                   ░│ 68   identity
                                    ├──────────────────────────────────────┤
   the page behind stays LIT        │░ +966 5x xxx xxxx              ⧉    ░│ 52   copyable
   — no scrim, at any width         ├──────────────────────────────────────┤
                                    │░ City          Joined              ⌄░│ 72   key/value pair
                                    │░ Riyadh        12 Feb 2025          ░│      + disclosure
                                    ├──────────────────────────────────────┤
                                    │░  Activity      Details             ░│ 36   underline tabs
                                    ├══════════════════════════════════════┤ ← 2px --ev-ink under active
                                    │                            ↕16       │
                                    │ ┌──────────────────────────────────┐ │
                                    │ │▒ Documents                      ▒│ │ 36   tinted section head
                                    │ ├──────────────────────────────────┤ │
                                    │ │  4 of 5 valid   1 expired        │ │ 72   3-up stat row
                                    │ │  Valid          Expired          │ │
                                    │ └──────────────────────────────────┘ │
                                    │                            ↕12       │
                                    │ ┌──────────────────────────────────┐ │
                                    │ │▒ Recent trips                   ▒│ │
```

| | Value | Evidence |
|---|---|---|
| **Width** | **480** — `--ev-drawer-w`, unchanged | M — leading edge at destination x 505.5, frame ends 768 → 262.5 dest × 1.875 = **492**. 480 is the nearest 16 px value and leaves 976 − 480 = 496 px of page visible at the floor. R13's named-figure carve-out is spent here. |
| **Leading edge** | 1 px `--ev-hairline` **plus `--ev-shadow-2`** | M — the ground falls from 255 at x 499 to 242 at x 505 over 5 dest px ≈ 9.4 CSS, peak ≈ 5 % of black |
| **Header** | **72** — new token `--ev-drawerhead-h` | M — the drawer's block-end rule sits at destination y 43 against an app top of y 5: (43 − 5) × 1.875 = **71.3**. Cross-check: the main top bar's rule is at y 32.5, so the drawer header is 10.5 dest = 20 CSS taller than the 52 px top bar. Two independent readings agree. |
| Header title | **16 / 600** `--ev-ink` (`--text-base`), the **entity type**, not the record name | M |
| Header close | `✕`, 28 × 28 icon `button`, inline-end, 16 px glyph `--ev-text-2` | M |
| **Identity row** | **68**, tinted `--ev-bg2` | M — y 44 → 80 = 36 dest = 67.5 |
| Identity avatar | **32 px circle**, `--ev-bg2`, 1 px `--ev-hairline` ring | measured ≈ 38 (ring at dest x 514 → 534); **32 is taken deliberately** so the same entity has the same avatar in the table and the drawer, and R15's amended clause reads *32 px circle*. The 6 px is a named divergence, not an oversight. |
| Identity name | 16 / 600 `--ev-ink`, 12 px after the avatar | M |
| **Copyable row** | **52**, tinted, value 13 / 400 `--ev-text-2`, trailing 24 × 24 copy control | M — y 81 → 109 = 28 dest = 52.5 |
| **Key/value pair row** | **72**, tinted; keys 12 / 400 `--ev-text-2` above values 13 / 400 `--ev-ink`; trailing `⌄` disclosure | M — y 110 → 148 = 38 dest = 71.3 |
| **Tab row** | **36**, tinted, underline tabs | M — y 149 → 168 = 19 dest = 35.6 |
| Tab, active | label 13 / **500** `--ev-ink`, **2 px `--ev-ink`** underline flush to the row's block-end | M — dest y 167 reads `(101,103,104)` under the active label and `(241,243,244)` under the inactive one |
| Tab, resting | 13 / 400 `--ev-text-2` | M |
| Strip block-end rule | 1 px `--ev-hairline`, full width, under both | M |
| **Body ground** | **`#ffffff`** | M — x 507–513 reads `(255,255,255)` at every y below the tab row |
| Body inline padding | **16** | M — content edge at dest x 507, section card at 514 = 7 dest = 13.1 |
| First section, gap below tabs | **16** | M — tab rule y 168 → banner/section top 176 = 8 dest = 15 |
| **Section card** | white, 1 px `--ev-hairline`, radius 8, no shadow | M |
| Section card header strip | **36**, `--ev-bg2`, label 13 / 500 `--ev-ink`, 12 px inline padding | M — y 224 → 244 = 20 dest = 37.5 |
| Section card body padding | **12** | |
| Gap between section cards | **12** | M — y 281 → 288 = 7 dest = 13.1 |
| **Scrollbar** | the drawer body scrolls; the header, identity block and tab row do not | M — a persistent thumb at dest x 759–763 in every drawer frame |

### 11.2 The blocks the drawer can hold

Composed from the primitives already present. All four appear in the reference.

| Block | Spec | Frame |
|---|---|---|
| **Stat row** | 2 or 3 cells inside one section card, separated by 1 px `--ev-hairline` vertical rules, 72 px tall. Value **17 / 600 `--ev-ink`** (`--text-lg`), label **12 / 400 `--ev-text-2`** below it, both centred. | `79a31934` `20m 10s / 13 / 4` |
| **Event list** | one row per event, 48 px: a 16 px tone glyph, then a 13 / 500 `--ev-ink` title over a 12 / 400 `--ev-text-2` subtitle, with a relative timestamp inline-end in 12 / 400 `--ev-text-2`. Rows separated by 1 px `--ev-hairline`. | `79a31934` `Marked as engaged` |
| **Key/value list** | 36 px rows: key 13 / 400 `--ev-text-2` inline-start, value 13 / 400 `--ev-ink` inline-**end**, then a 24 × 24 `⋯` row menu. Rows separated by 1 px `--ev-hairline`. | `79a31934` `Email / Full Name / First Name` |
| **Notice** | a banner, exactly as §4.8: tone fill, `color-mix` border at 12 %, radius 8, padding 12, 16 px glyph aligned to the **first** line, heading 13 / 500 + body 13 / 400 in the tone's foreground. **At most one per drawer** (R10). | `79a31934` `Deprecation notice`, fill `#fff4e6` sampled exactly |

**Nested tabs inside a section** (`79a31934`'s `Identified | Device` inside `Properties`) are
permitted, take the same underline treatment, and are the **only** second level allowed. A
third is a page, not a drawer.

### 11.3 Why the drawer's tabs are underlines and the page's are segments

One primitive (`tabs`), two restyles, and the split is deliberate: **the segmented control
switches which records you are looking at; the underline switches which facet of one record
you are looking at.** They never appear at the same level, so they never compete, and an
operator can tell at a glance which level a tab strip belongs to. Both treatments are the
reference's own — `02b895df` for the segments, `79a31934` for the underlines.

### 11.4 What the drawer is *for*, and what the index no longer has to carry

Everything the width contract (§7.3) pushed out of the table lands here: `ID`, `Vehicle`,
`Class`, `Tier`, `Joined`, `Last trip`, `Lifetime`, `Renewal`, the five per-document rows,
the `Decision` record with its actor and timestamp. **That is the trade the column budget
buys, and it is a good one**: the index answers *"which one"*, the drawer answers
*"tell me about this one"*.

---

## 12. Interaction, keyboard, Arabic

### 12.1 What is clickable, and what opens where

| Target | Opens | Surface, and why (§5.0) |
|---|---|---|
| Identity cell, line 1 | the record's **detail drawer** | Reversible, read-mostly, and the operator keeps their place in the list — §5.0's drawer row exactly. **AC-43** |
| A row anywhere else | nothing | A whole-row click competes with the checkbox, the links and the action controls |
| Checkbox | selection | §10.9 |
| Column header | that column's menu (sort · filter · pin) | `popover`, **D-6**, already built |
| `Add filter` | the filter picker | `popover` — it stays open while the operator adjusts (§5.4) |
| A filter chip's body | that filter's value picker | `popover` |
| `Columns` | `ColumnLayoutPopover` | `popover`, **D-15** |
| `Export` | the export options | `popover` if ≤ 4 options, otherwise a `dialog` at 440 |
| Row `✓` | `alert-dialog` at 440 | §7.8 |
| Row `✗` | nothing — immediate, with an undo toast | §7.8 |
| Row `⋯` | `dropdown-menu` | §5.4 |
| A bulk destructive action | `alert-dialog`, title stating the **verb and the count** (`Suspend 3 captains?`), primary repeating the verb | §3.3 |

**Nothing on this screen opens a full page.** The one level-3 route People owns is the KYC
review screen, reached from the Applications drawer, not from a row.

### 12.2 Keyboard

Tab order: rail tiles → pinned `Admin` → sub-tab list → top bar → **page header `Export`** →
**tab strip (one stop; arrows traverse)** → **search** → **`Columns`** → **query strip
chips, in visual order, then `Add filter`, then the sort chip, then `Clear all`** → **table**
→ **pagination**.

| Key | Where | Does |
|---|---|---|
| `←` `→` | tab strip | previous / next view. **Logical**: `←` is *previous* in LTR and *next* in RTL, via `DirectionProvider` |
| `Home` `End` | tab strip | first / last view |
| `/` | anywhere not in a field | focuses the search field |
| `Esc` | search field | clears it and keeps focus |
| `Esc` | drawer | closes it and returns focus to the identity link that opened it |
| `Tab` from the last drawer control | **leaves the drawer into the page** — it is non-modal and does not trap | §7.3.3, AC-67 |
| `↑` `↓` | table body | moves the row focus; the focused row shows the `--ev-bg2` hover fill |
| `Space` | a focused row | toggles its checkbox |
| `Enter` | a focused row | opens its drawer |
| `Esc` | with a selection active | clears the selection |

**Every interactive element carries `focus-visible:ring-2 ring-ring ring-offset-2`.** The one
documented exception remains the nav's `ring-inset`, because its rows sit at gap 0. Nothing
on this screen sits at gap 0 except the segmented control's segments, which are inside a
2 px-padded track that gives the offset ring room.

### 12.3 Arabic (§9), checked as I went

**Nothing in this composition depends on something being on the left.** Every position above
is stated inline-start / inline-end.

| | Behaviour |
|---|---|
| Bands 1–5 | mirror wholesale. The H1 and count move to the inline-end; `Export` to the inline-start |
| Tab strip | mirrors; the segment order reverses; `Captains` is still first, now on the right |
| Search field | mirrors; the `⌕` glyph leads at the inline-start; the `✕` trails |
| Query strip | mirrors; chips reflow from the inline-start; `Clear all` stays at the far inline-end |
| **Numeric columns** | stay inline-end and **do not flip** (R4, §9.2). `4,218.00` and `412` keep Western digits and do not reorder internally |
| Identity cell | two **blocks**, not an inline pair, so the avatar sits inline-start of the text in both directions with no special case |
| `Previous` / `Next` | logical — inline-start is *previous* in both directions; the glyphs mirror at string-construction time via `mirrorGlyph` |
| Pagination range | `1–25 of 57` keeps Western digits and does not reverse internally |
| Vertical column rules | between columns, so they mirror with the columns. Free |
| Drawer | opens from the **inline-end**, which is the physical left in Arabic |
| Row action triad | mirrors as a group; `✓ ✗ View` keeps its internal order (it is a fixed vocabulary, not a sequence) |
| `--ev-marker` breach edge | `inset-inline-start`, mirrors |
| Shadows | all `offset-x: 0`, so **nothing mirrors** and none belongs under `:root:lang(ar)` |

**Arabic dimension overrides** (`:root:lang(ar)`), amended by this document:

| | Latin | Arabic |
|---|---|---|
| `--ev-row-h-media` | **60** | **64** |
| `--ev-row-h-head` | **36** | **40** |
| `--ev-control-h` | 32 | 36 |
| `--ev-navrow-h` | 32 | 36 |
| `--ev-row-h` | 40 | 44 |
| `--ev-control-h-lg` | 40 | 44 |
| `--ev-rail-w` | 80 | 88 |
| `--ev-subnav-w` | 224 | 256 |
| `--ev-drawerhead-h` | **72** | **76** |
| `--ev-page-pad` | 32 / 48 | **unchanged** — a gutter is not a line box |

The Arabic control row at 36 px raises the segmented track to 36 and the segments to 32; the
inner radius becomes 6 still (36 − 2 − 2 = 32, radius 8 − 2 = 6).

**The Arabic row at 64 absorbs a two-line wrap.** Match-audit **W6** recorded that at the
shipped 41 px, Arabic row 1 measures **65 px against 41** — a visible stagger. At a uniform
64 there is no stagger, because there is no variation. **R20 is what fixes W6**, not the row
height on its own.

> ### ⚠ Every Arabic claim above is **unverified**, and that is a process defect, not a
> hedge.
> `setLanguage` has **zero production call sites** (craft-critique F13, "Checks NOT run"), so
> no reviewer has ever seen this product's real RTL rendering. Everything the critique
> assessed was reached by setting `dir` / `lang` from the console, which leaves Radix's
> `DirectionProvider` in LTR — so **popover side, menu alignment and arrow-key traversal in
> RTL are unassessed**, including the column-header menu, the filter picker, the `Columns`
> popover and the tab strip's arrow keys. Every RTL statement in this section is a
> *specification*, not an observation. It must be re-shot once language selection is wired.
> **Treat any RTL claim in the older specs the same way.**

---

## 13. Copy — every string, final

Sentence case throughout. Buttons are verbs. No exclamation marks. No "please", "invalid" or
"failed", and nothing assigns blame to the operator (**AC-39**).

### 13.1 Chrome

| Key | English |
|---|---|
| `people.title` | `People` |
| `people.tab.captains` | `Captains` |
| `people.tab.applications` | `Applications` |
| `people.tab.compliance` | `Compliance` |
| `people.tab.riders` | `Riders` |
| `people.action.export` | `Export` |
| `table.search.placeholder` | `Search…` |
| `table.search.clear` | `Clear search` |
| `table.columns` | `Columns` |
| `table.filter.add` | `Add filter` |
| `table.filter.clearAll` | `Clear all` |
| `table.sort.chip` | `Sorted by {field} {direction}` |
| `table.sort.clear` | `Clear sort` |
| `table.rowsPerPage` | `rows per page` |
| `table.range` | `{from}–{to} of {total}` |
| `table.prev` | `Previous` |
| `table.next` | `Next` |
| `table.truncated` | `Showing {shown} of {total} — refine the search to see the rest.` |
| `table.selected` | `{n} selected` |
| `table.selection.clear` | `Clear` |

### 13.2 Columns — headers as they render

`Captain` · `Applicant` · `Rider` · `Status` · `Rating` · `Trips` · `Earned (SAR)` · `City` ·
`ID` · `SLA` · `Owner` · `Documents` · `Next expiry` · `Dispatch` · `Subs` ·
`Wallet (SAR)` · `Churn risk` · `Decision`

### 13.3 Cell values

| Key | English |
|---|---|
| `people.status.active` | `Active` |
| `people.status.suspended` | `Suspended` |
| `people.status.pending` | `Pending` |
| `people.status.inReview` | `In review` |
| `people.status.approved` | `Approved` |
| `people.status.rejected` | `Rejected` |
| `people.dispatch.allowed` | `Allowed` |
| `people.dispatch.blocked` | `Blocked` |
| `people.owner.unclaimed` | `Unclaimed` |
| `people.owner.mine` | `You` |
| `people.docs.summary` | `{valid} of {total} valid` |
| `people.docs.expired` | `{n} expired` |
| `people.docs.expiring` | `Expires in {days}d` |
| `people.docs.valid` | `Valid · {days}d` |
| `people.expiry.cell` | `{date} · {days}d` |
| `people.applied` | `Applied {date}` |
| `people.sla.remaining` | `{duration}` |
| `people.sla.overdue` | `overdue {duration}` |
| `people.churn.low` / `.medium` / `.high` | `Low` / `Medium` / `High` |
| `people.decision.line` | `{verdict} · {actor} · {date}` |

### 13.4 Row actions and their accessible names

| Key | English |
|---|---|
| `people.action.approve` | `Approve` |
| `people.action.reject` | `Reject` |
| `people.action.view` | `View` |
| `people.action.undo` | `Undo` |
| `a11y.people.approve` | `Approve application {id}` |
| `a11y.people.reject` | `Reject application {id}` |
| `a11y.people.view` | `View application {id}` |
| `a11y.table.rowActions` | `Actions for {name}` |
| `a11y.table.selectRow` | `Select {name}` |
| `a11y.table.selectAll` | `Select all rows on this page` |
| `a11y.table.rowsPerPage` | `Rows per page` |

### 13.5 Confirmations, toasts, banners

| Key | English | Chars |
|---|---|---:|
| `people.confirm.approve.title` | `Approve {id}?` | — |
| `people.confirm.approve.body` | `{name} becomes an active captain and can be dispatched.` | — |
| `people.confirm.approve.primary` | `Approve` | — |
| `dialog.cancel` | `Cancel` | — |
| `toast.people.approved` | `Approved {id}.` | 18 ✓ |
| `toast.people.rejected` | `Rejected {id}.` | 18 ✓ |
| `toast.people.undone` | `Restored {id}.` | 18 ✓ |
| `toast.people.exported` | `Exported 57 captains.` | 22 ✓ |
| `banner.queue.breached` | `{n} applications are overdue.` | 30 ✓ |
| `banner.queue.breached.action` | `Show only breached` | — |

All toasts are one line and under R9's 60-character ceiling with the longest realistic
substitutions.

### 13.6 States

| Key | English |
|---|---|
| `state.noMatch.query` | `No {plural} match "{query}".` |
| `state.noMatch.filters` | `No {plural} match these filters.` |
| `state.noMatch.both` | `No {plural} match this search and these filters.` |
| `state.noMatch.action.query` | `Clear search` |
| `state.noMatch.action.filters` | `Clear filters` |
| `state.noMatch.action.both` | `Clear all` |
| `state.firstRun.captains.title` | `No captains yet` |
| `state.firstRun.captains.body` | `Captains appear here once an application is approved. Start with the applications queue.` |
| `state.firstRun.captains.action` | `Go to applications` |
| `state.cleared.applications.title` | `Nothing waiting` |
| `state.cleared.applications.body` | `Applications appear here when a captain applies.` |
| `state.error.card.title` | `Couldn't load {plural}.` |
| `state.error.card.body` | `{reason}. Request {requestId}.` |
| `state.error.action` | `Try again` |
| `state.error.row` | `Couldn't {verb} {id}.` |
| `state.error.reason.timeout` | `The connection timed out` |
| `state.error.reason.server` | `The server returned an error` |
| `state.error.reason.offline` | `You're offline` |

**Placeholder copy is banned.** The two placeholder screens the craft critique found
(`Performance is being built.`) take §10.4's state with real copy:
`state.firstRun.performance.title` = `See how the fleet is performing`,
`.body` = `Trip volume, acceptance and earnings by zone, updated hourly.`,
`.action` = `Go to trips`.

---

## 14. Components · superseded ACs · deviations · rulings · accessibility · supersession

### 14.1 Components — every one, with variant and tone

`components.json` is **frozen**. Everything below is one of the 38 primitives already in
`src/components/ui/`, restyled. **No `shadcn add`.**

| Element | Primitive | Variant | Tone / notes |
|---|---|---|---|
| View tabs | `tabs` | `TabsList variant="segmented"` | track `--ev-bg2`, active white, border `--ev-hairline-control` |
| Drawer tabs | `tabs` | `TabsList variant="underline"` | active 2 px `--ev-ink` |
| Search | `input` | `type="search"`, `size="sm"` (32) | border `--ev-hairline-control` |
| `Columns`, `Export`, `Try again`, `Clear search` | `button` | `variant="outline"`, `size="sm"` (32) | border `--ev-hairline-control` — **the token exists, is measured, and has zero consumers**; wiring it is match-audit **N3** |
| `Add filter` | `button` | `variant="outline"`, `size="sm"` | transparent fill |
| Filter chip | `button` | `variant="secondary"`, `size="sm"` | white fill on the tint |
| `Clear all`, `Previous`, `Next`, `Undo` | `button` | `variant="ghost"`, `size="sm"` | no border |
| Row `✓` `✗` `View` `⋯` | `button` | `variant="outline"`, `size="icon-sm"` (28) | `✗` glyph `--ev-red` |
| Bulk-bar primary | `button` | `variant="default"` | **near-black** `--primary` |
| Status badge | `badge` | `tone="success" \| "warning" \| "info" \| "neutral"` | five tones, **never red**, radius 4, 20 px |
| `new` badge | `badge` | `tone="new"` (outline) | border `--tone-info-foreground`, **18 px** |
| Owner chip | `badge` | `tone="neutral"` | three states per §8.4.1 |
| Churn meter | — | composed | three 8 × 3 ticks + word; no primitive |
| Rows-per-page | `select` | `size="sm"` (32) | |
| Column header menu | `popover` | — | `--ev-shadow-2`, radius 8 |
| Filter picker, `Columns` | `popover` | — | width = `--radix-popover-trigger-width` where anchored to a field |
| Row `⋯` menu | `dropdown-menu` | — | `--ev-shadow-2` |
| Approve confirm | `alert-dialog` | 440 px | primary near-black, **not red** |
| Bulk destructive confirm | `alert-dialog` | 440 px | primary `--destructive` only when unrecoverable |
| Detail drawer | `sheet` | `side="inline-end"`, 480 | **no scrim**, `--ev-shadow-2` |
| Toasts | `sonner` | — | one line, `Undo` action where §7.8 says so |
| Breach banner | `alert` | `tone="critical"` | R10 — never more than one |
| Loading | `skeleton` | — | derived from the column definition |
| Icon-only control names | `tooltip` | — | naming only; never help text, never constraints |
| Avatar | `avatar` | 32 px circle | R15 as amended |

### 14.2 Superseded acceptance criteria, clause by clause

| AC | Clause | Status |
|---|---|---|
| **AC-47** | *"Activating search on an index table replaces the view-tab row in place… `Cancel` restores the previous view"* | **VOID in full.** Replaced by **AC-47′**: *the search field is a persistent, always-visible control in the control row. It never replaces, hides or displaces the view tabs, and there is no `Cancel`. Typing changes no band's height. Clearing is a `✕` inside the field, and the query is cleared by `Clear all` in the query strip.* Owner instruction; craft-critique F20.3's reasoning agrees. |
| **AC-46** | *"…shows the bulk action bar inside the table card"* | **AMENDED** to *"inside the table's bounding box"*. Consequence of §7.1 — there is no card. Every other clause of AC-46 stands. |
| **AC-45** | both clauses | **UPHELD verbatim.** Exactly one column carries a sort arrow. **D-6**'s resting `⌄` is a menu opener, not a sort affordance, and this document does not widen it. |
| **AC-43** | first data cell is a link to the detail | **UPHELD**, and it now opens the drawer (§12.1). |
| **AC-44** | numeric columns right-aligned, header sharing the value's edge | **UPHELD**, and §7.3 rule 5 adds that money may not be the trailing column. |
| **AC-37 / AC-38** | the two empty kinds | **UPHELD.** §10.5 adds a **third**, `cleared`, and raises it rather than folding it into either. |
| **AC-50** | the three parts of R5a | **UPHELD in full.** The SLA gauge, which was a fourth carrier, is deleted (§9.4). |
| **AC-68** | row actions keyboard-operable and visible without hover | **UPHELD and load-bearing** — it is what forces §7.8's controls to render at rest. |
| **AC-67** | drawer focus behaviour | **UPHELD as amended** — non-modal, no scrim, focus enters without trapping. |
| **AC-51** | *"the content below does not move by even one pixel"* | **Unaffected**, and now easier: bands 1–3 are fixed-height in every state. |
| `specs/00-foundation.md` §7.1 `Container` | *"One card holds the view tabs, the filter row, the header row, the rows, and the bulk action bar"* | **SUPERSEDED** by §7.1. The table is the bordered object. |
| `specs/00-foundation.md` §7.1 `Search mode` | *"Activating search replaces the tab row in place"* | **VOID** — AC-47′. |
| `specs/00-foundation.md` §7.1 `Saved views` | the trailing `+`, the per-view chevron, `Save as`, the create-view modal | **OUT OF SCOPE for M7 and must not render.** The four views are fixed product structure, not saved queries. Saved views remain available to a sub-tab that genuinely has them. |
| `specs/00-foundation.md` §7.1 `Density` | *"~13 px base text and ~30 px rows"* | **VOID** — **D-2 was retired by D7**. Body is 14 / 400 / 20; rows are 60. |
| `specs/00-foundation.md` §7.1 `Pagination` | *"Below the card"* | **UPHELD** — §8, and it is now also *in the viewport*. |
| `specs/00-foundation.md` §7.1 `Row actions` | *"A `…` kebab at the row's end"* | **AMENDED by D8** — §7.8. The keyboard and no-hover clauses stand unchanged. |
| `DESIGN.md` §3.1 prose | *"Rows with a two-line identity cell grow to fit rather than truncating"* | **VOID** — §3.1's own **Rules** block says row height MUST be uniform, and a MUST beats prose in the same section. Proposed ruling **R20**. |

### 14.3 Deviations and proposed rulings

Every one names the rule it suspends. **A deviation that cannot name its rule is an error,
not a deviation.**

| # | Deviation | Suspends | Why |
|---|---|---|---|
| **D-18** | **The index page has no card.** The table carries its own 1 px border and 8 px radius; the control row, query strip and pagination sit on the white content ground. | `specs/00-foundation.md` §7.1 `Container`; `DESIGN.md` §3.1's one-card rule — both §1–§5 Shopify observations replaced by **D7** | It is what the reference does in all six table frames; it collapses four inner left edges to one (F9); and it gives the border something to separate (F17). Already ordered by `03-navattic-language.md` fix-list item 8. |
| **D-19** | **The table body is a bounded scroller; the page does not scroll.** | Nothing named. Recorded so it is not mistaken for drift. | It is the only construction that puts the pagination row, the horizontal scrollbar and the sticky header inside the viewport at once — and each of those is a live defect (N2, S16′, F1 part 3, `build/03` §2.1). |
| **D-20** | **View tabs are a segmented control in the control row**, not a tab strip inside the card. | `DESIGN.md` §3.2's tab-strip placement; **AC-47** | Owner instruction, plus §2.2 — it deletes a band. The dropdown argument is recorded and overruled in §2.3. |
| **D-2′ (amended)** | **The page gutter is 32 below `--ev-bp-wide` and 48 at and above it**, against a reference measuring 68. | Nothing in §1–§5 (D7 replaced their visual content). A departure from the **reference**. | 32 is what the 1280 column budget can afford (§7.3); 48 buys back air at 1440 through the **existing** `wide:` variant, so no token is redefined inside a media query and the one-breakpoint check still passes. This closes finding 2 of `03-navattic-language.md` §11. |
| **D-21** | **The resting value of a lifecycle column is plain text; only departures from rest take a tone.** | Narrows §3.4's *permission* to badge a lifecycle state; suspends nothing | 25 of 25 identical badges communicate nothing and make the two rows that matter invisible. Craft-critique F4, F8. |

**Proposed rulings.** Binding for this screen; **raised, not applied**, for `DESIGN.md` —
amendment goes through `docs/06-design-reference/_partials/` and `build-design.py`, which is
not mine to run.

| # | Ruling |
|---|---|
| **R20** | **Row height is uniform per table, set by the table, not by the row.** §3.1's *"grow to fit"* prose is void; its *"MUST be uniform"* Rule stands. Consequence: a two-line identity cell applies to **every** row in a table or to none, and a record with no second line renders its name vertically centred with the second line box empty. |
| **R21** | **A count on a navigation target is a chip; a count inside a control is plain text.** Nav rows and the notification bell get chips; segmented-control segments and page headings get text. Two treatments, one rule. Closes craft-critique F16. |
| **R22** | **`--ev-text-2` on `--ev-bg2` (4.538 : 1) is the tightest pair in the product and is pinned.** It is the table header label, the resting tab label and the chip key. Neither token moves without re-deriving it, and the derivation goes in the commit message. |
| **R23** | **Two hairline weights, and only two.** `--ev-hairline` `#f0f2f4` is structure: card and table borders, row rules, column rules, nav seams. `--ev-hairline-control` `#dde0e4` is anything the operator can click, **plus the pinned-column boundary**. `--ev-hairline2` is retired as a distinct value and aliased to `--ev-hairline`; its comment block must be rewritten. |
| **R24** | **A work queue at zero is a `cleared` state**, distinct from R8's two: no illustration, one heading, one line, no action. Rendering a first-run illustration over a queue somebody just emptied tells them they have never had one. |

### 14.4 The accessibility ledger — every pair this screen actually renders

Recomputed for this document, not inherited. **§7 outranks D7, D8 and the reference.**

| Pair | Where | Ratio | Verdict |
|---|---|---:|---|
| `--ev-ink` `#171a21` on white | H1, identity line 1, money cells | **17.411** | AAA |
| `--ev-text-2` `#6b7280` on white | ordinary cell ink, identity line 2, pager, `On call` | **4.834** | AA ✓ |
| `--ev-text-2` on `--ev-bg2` `#f6f8f9` | **table header label, resting tab label, chip key** | **4.538** | AA ✓ — **the tightest pair in the product. R22 pins it.** |
| `--ev-red` `#b42318` on white | overdue text, expired text, negative wallet, the `✗` glyph | **6.574** | AA ✓ text; ≫ 3 : 1 non-text (§7.5) |
| `--ev-green` `#15653c` on `--ev-green-lt` | `Approved` badge | **6.351** | AA ✓ |
| `--ev-amber-dk` `#7a3e12` on `--ev-amber-lt` | warning badge, breach banner heading | **7.656** | AAA |
| `--ev-blue` `#2b6ef0` on white | the focus ring | **4.574** | ≫ 3 : 1 non-text ✓ |
| `--ev-hairline-control` `#dde0e4` on white | every control boundary | **1.324** | Not a §7 requirement — the boundary is never the sole indicator; the label is. R19's 3 : 1 clause is scoped to an **unchecked checkbox or radio**, which uses `--ev-hairline-strong` `#828b99` (3.441 on white) and is unchanged. |
| `--ev-hairline` `#f0f2f4` on white | table border, row rules, column rules | **1.122** | Same — decorative structure, not an indicator |
| `--ev-text-2-rail` `#626974` on `--ev-bg-rail` `#e9edf1` | rail labels | **4.707** | AA ✓ — taken as given from the orchestrator's rail step |
| `--ev-nav-chip-rail` `#d8dde5` on `--ev-bg-rail` | rail count chip | **1.159** | reads as a plate; digits are `--ev-ink` |
| `--ev-bg-rail` on `--ev-bg-nav` `#f6f8f9` | the rail's own step | **1.104** | a distinct region |

**`--ev-text-3` `#9ca3b0` is 2.536 : 1 and has zero consumers in `src/`. It must keep
zero.** Match-audit **W1** goes live the moment the two-line identity cell lands, which is
build item 2 — so §7.7's *"line 2 is `--ev-text-2`, not `--ev-text-3`"* is the single line in
this document most likely to be got wrong, and it is the one to check first.

**Nothing here proposes dropping a rule.** The three places the reference cannot be matched
are named and given their compliant alternative: identity line 2 (`#a7a9ab` → `#6b7280`),
the placeholder class (`gray-400` → `--ev-text-2`), and the nav section headings (≈ 2.4 : 1
→ `#6b7280` at 4.538, W3, still unbuilt).

### 14.5 Supersession ledger — nothing is left live and disagreeing

| Document | Section | Status |
|---|---|---|
| `00-shell.md` | §4 top bar | **AMENDED** by §3.1 — `On call` loses its chip and its warning ink; the bell count becomes a chip; the suggestion panel matches its anchor. Height, ground and rule unchanged. |
| | §7 page shells | **AMENDED** — `PAGE_BLOCK` gains the `wide:` gutter and the flex-column height model (D-19). |
| | §9.1 index-table anatomy | **SUPERSEDED** by §7 in full. Column *semantics* untouched. |
| | §11.4 banner | **UNCHANGED** — §10.8 uses it as written. |
| | §6.1 drawer, no scrim | **CONFIRMED and extended** by §11. Width 480 unchanged; header 52 → **72**; the internal blocks are new. |
| `01-table-controls.md` | §10.1 / §10.2 / §10.3 wireframes | **SUPERSEDED** by §1.1 and §7 — they draw the card, the tab strip inside it and 32/36 px rows. |
| | §3–§7 header cell, menu, sort, filter, pin (**D-12**…**D-17**) | **SURVIVE unchanged.** This document changes where the controls live, not how they work. |
| | §5.3 *"two entry points, one state"* for sort | **SUPERSEDED** — one entry point (the header menu) and one readout (the query-strip chip). §6.3. |
| | §7.3 pinned boundary is tier `none` | **CONFIRMED** (hairline, never shadow) and **corrected**: the hairline takes `--ev-hairline-control`, because at `--ev-hairline` it is zero steps darker than every ordinary rule (**N4**). |
| | §11.5 `no-match` copy | **AMENDED** by §10.3 — three variants, correct noun, real button. |
| `02-visual-refinement.md` | **V4** route trail | **SURVIVES.** |
| | **V5** one page width | **SURVIVES**, with `--ev-page-pad` and its `wide:` step. |
| | **V6 / V6d** counts are neutral | **SURVIVES**, and **R21** says which shape carries them. |
| | **V8** the three unstyled-state defects | **SURVIVES**, and §10 completes it. |
| | **V9** *no icon on the error state* | **SUPERSEDED** by §10.6 — error and empty rendered identically and the operator could only tell them apart by reading (F10). A 16 px critical glyph is the distinguisher, and §7.5 is satisfied because the word `Couldn't` carries it too. |
| `03-navattic-language.md` | §1 the token set | **SURVIVES**, with the four values the match audit corrected, plus §15.1's five changes. |
| | §4.2 the page frame | **SUPERSEDED** by §1.2 — gaps become 24 / 20 / 12 / 0. |
| | §4.3 the toolbar | **SUPERSEDED** by §5 — four controls become two, and the tabs join them. |
| | §4.4 the filter strip *above the card* | **SUPERSEDED** by §6 — it is a band with a 12 px gap on both sides, and it always renders. |
| | §4.5 the table | **AMENDED** by §7 — vertical rules leave `<thead>` (**N1**), header rises 32 → 36, label 12 → 13, rows 64 → 60, width contract added. |
| | §4.6 pagination | **AMENDED** by §8 — outside the table, 40 px, rows-per-page select added. |
| | §4.7 the drawer | **SUPERSEDED** by §11 — header 52 → 72, and the internal blocks are specified for the first time. |
| | §4.8 banners | **CONFIRMED**, unchanged. |
| | §11 finding 2 (`--ev-page-pad` at 1440) | **CLOSED** by D-2′ amended. |
| | §11 finding 1 (the drawer scrim) | **CLOSED** — non-modal, no scrim, focus enters without trapping (AC-67 as amended). |
| `build/03-table-controls.md` | §2.1 *"the vertical sticky is inert"* | **CLOSED** by D-19 — the scroller now has a height constraint and the existing declarations start working. |
| | §7.5 the strip inside the card | **SUPERSEDED** by §6. |
| `DECISIONS.md` **D8** | the rendering rule | **IMPLEMENTED** in §7.8, with the five §7 constraints specified rather than left to the engineer. |

---

## 15. Handoff

### 15.1 To **frontend-engineer** — token changes, in `src/styles/globals.css`

Five values and one new token. **All five are design decisions with their derivation above;
none is taste.**

| Token | From | **To** | Where derived |
|---|---|---|---|
| `--ev-row-h-media` | `64px` | **`60px`** (ar `64px`) | §7.6 — reference 61.9, and 60 is the content box |
| `--ev-row-h-head` | `32px` | **`36px`** (ar `40px`) | §7.5 — 13/500 in a 20 px line box + 8/8 |
| `--ev-hairline2` | `#f0f2f4` | **`var(--ev-hairline)`**, comment rewritten | **R23** |
| `--ev-drawerhead-h` | *new* | **`72px`** (ar `76px`) | §11.1 — measured 71.3, two independent readings |
| `--ev-page-pad` | `32px` | **`32px`**, unchanged — the `wide:48` step lives on the page shell, **not** in a media query redefining the token | **D-2′** amended |

### 15.2 To **frontend-engineer** — the build order

Work straight down. Items 1–4 are the ones a person notices from across the room.

| # | Do | File |
|---|---|---|
| **1** | **The width contract.** Set the four default column sets from §7.4, add the `defaultHidden` flags, and add the unit test asserting `Σ widths + identity min ≤ 910` and *no money or id column is last*. | `src/screens/operations/people/*View.tsx`, `src/components/table/columns.ts` |
| **2** | **Row 60, uniform, everywhere.** Apply `h-row-media` to every `<tr>` in all four views. Land the two-line identity cell on **every** row (avatar 32 circle, line 1 13/500 `--ev-ink`, line 2 12/400 `--ev-text-2`). Clamp both lines to one line with an ellipsis. | `src/components/DataTable.tsx`, `.../cells.tsx` |
| **3** | **Take the vertical rules out of `<thead>`.** Scope the selector to `tbody`. One line. **N1.** | `src/components/ui/table.tsx` |
| **4** | **Wire `border-border-control`** to `button.tsx`'s outline/secondary variants, to `FilterChipRow`'s chips, and to the pinned-column boundary in `pinning.ts`. **N3 + N4.** Three lines, and the token already carries the right number. | `button.tsx`, `FilterChipRow.tsx`, `pinning.ts` |
| **5** | **Delete the card from the index page.** The table takes `border border-border rounded-xl`. **D-18.** | `PeopleScreen.tsx`, `DataTable.tsx` |
| **6** | **The flex-column page and the bounded scroller.** Bands 1/2/3/5 `flex-none`; band 4 `flex-1 min-h-0 overflow-auto`, `min-block-size: 216px`. **D-19.** | `PageShell.tsx`, `DataTable.tsx` |
| **7** | **The control row.** Move the tab strip into it as a segmented `TabsList`; make the search persistent; delete the `Filter` and `Sort` toolbar buttons. **AC-47′, D-20.** | `IndexToolbar.tsx`, `PeopleScreen.tsx` |
| **8** | **The query strip always renders**, on the canvas, 12 px above and below, carrying the sort chip. **§6.** | `FilterChipRow.tsx`, `DataTable.tsx` |
| **9** | **The pagination row moves outside the table**, gains the rows-per-page `select`. **N2, G42.** | `DataTable.tsx`, `ui/pagination.tsx` |
| **10** | **Colour policy.** Day counts, `Decision` and `Churn risk` become plain text / a meter; resting lifecycle values become plain text; delete the SLA gauge; `new` badge border → `--tone-info-foreground`, height → 18. **§9.** | `.../cells.tsx`, `StatusBadge.tsx`, `badge.tsx` |
| **11** | **The actions cell.** D8's three shapes, 28 px controls, visible at rest, accessible names from §13.4, approve dialog + reject undo toast. **§7.8.** | `.../queue.tsx`, `DataTable.tsx` |
| **12** | **Page header:** delete the subtitle, add the count numeral with its reserved skeleton, add `Export`. **§4.** | `PageHeader.tsx` |
| **13** | **The skeleton derives from the column definition** — 60 px pitch, real header, visible-column count, `min(pageSize, floor(h/60))` rows. **F3.** | `DataTable.tsx` |
| **14** | **The four states**, per §10, including the new `cleared` and the two placeholder screens. Error gets its glyph, its reason line and a real button. | `ErrorState.tsx`, `EmptyState.tsx` |
| **15** | **Top bar:** `On call` to plain text, bell count to a chip with a ring, suggestion panel width = anchor. **§3.1.** | `TopBar.tsx` |
| **16** | **The drawer**, per §11: 72 px header, tinted identity block, underline tabs, section cards with 36 px tinted heads, the four block types. | `ShellLayer.tsx`, `ui/sheet.tsx`, `ui/tabs.tsx` |
| **17** | Re-run `/token-audit`, then re-measure `scrollWidth === clientWidth` at **1280 and 1440** on all four views. **1440 is the one that is currently broken.** | — |

### 15.3 To **utilities-engineer** — helpers this design implies

1. **`useBoundedTableHeight()`** — resolves band 4's available height from the viewport and
   the fixed bands, so §10.2's skeleton row count and the scroller's `min-height` guard come
   from one place. Three call sites: `DataTable`, the skeleton, the visual test.
2. **`assertColumnBudget(columns, innerWidth)`** — pure, used by the §15.2 item 1 test and by
   a dev-mode `console.error`. It encodes §7.3 rules 3 and 5, so a new column cannot
   reintroduce F1 silently.
3. **`formatCountdown(iso, now)`** → `{ text, breached }` — the one SLA formatter, producing
   `2h 14m` and `overdue 1d 16h`. It is the *only* carrier of the word `overdue`, so R5a's
   third part cannot drift.
4. **`Inter Fallback` metric-matched face** — `@font-face { font-family: "Inter Fallback";
   src: local("Segoe UI"), local("Helvetica Neue"); size-adjust: 108.8% }`, appended to
   `--font-sans` **after** `Inter Variable`. Inter sets 291.36 px where Segoe UI sets 267.88
   at 14 / 400 — an **8.8 % reflow of every label** on a cold cache. `font-display: swap`
   stays; §7 has no rule licensing invisible text, so `block` is refused. This needs **no
   waiver** and it is what Navattic's own site does. Match audit **N6**.
5. **`mirrorGlyph` coverage** for `‹` `›` in the pagination row, if not already covered.

### 15.4 To **product-owner** — three things I could not resolve

1. **Can `approveDriver()` defer its downstream write for 10 seconds?** If yes, both queue
   dispositions become undo-only and §7.8's confirm dialog is deleted — a strictly better
   design and one fewer modal. If no, the asymmetry (reject undoes, approve confirms) stands
   and is justified in §7.8. `specs/02-work-queues.md` owns the disposition set; the
   rendering rule is mine either way.
2. **R8 needs a third empty kind.** §10.5's `cleared` state is specified because the screen
   needs it, but extending R8 and `docs/ref/states.md` is a deliberate act through the
   partials build, not a design spec's decision. **R24.**
3. **`Export` needs a scope.** Current page, current query, or everything? The control is
   specified; the options are product. Until answered it opens a `popover` with
   `This page (25)` and `All results (57)`.

### 15.5 What I could not verify, said plainly

- **Every RTL claim in §12.3 is unverified.** `setLanguage` has zero production call sites,
  so nobody has seen this product's real RTL rendering, and Radix's `DirectionProvider`
  stayed LTR in every capture taken so far. Popover side, menu alignment and arrow-key
  traversal in RTL are **unassessed**.
- **`--ev-shadow-3` is still unevidenced** — no modal appears in the 15 frames. §7.8's
  approve dialog is the first surface built against it and needs a human eye.
- **The drawer's identity avatar** measures ≈ 38 px in the reference and is specified at 32
  for consistency with the table. A named divergence, not an oversight.
- **The reference is internally inconsistent about vertical cell padding** — 14 px on the
  Visitors table, ≈ 4 px on the Members table, in the same product. §7.6 sets one value.
  Recorded so nobody "fixes" it back toward a frame.
- **Seven visible rows at 1280 × 800** is the cost of D-19. It matches the reference's six
  and I believe it is right, but it is the one number in this document an operator might
  argue with, and it is the one to watch in the first review.
