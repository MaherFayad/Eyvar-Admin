# 01 — Table controls: per-column sort, filter and pin

**Owner:** product-designer · **Builds on:** `00-shell.md` §9 (table anatomy), §12 (components),
§13 (interaction) · **Consumers:** frontend-engineer (`DataTable`, `IndexToolbar`,
`FilterChipRow`), utilities-engineer (`useColumnPinning`, `columnFilter`, column visibility), qa-engineer (AC-80…AC-116)

**The request, verbatim:**

> "in the table add pin, sorting, filter for all the items inside functionality in the component
> no need to redo for everypage"

Clarified with the business owner: **pin means column pinning (freeze), not row pinning.** Sort,
filter and pin become per-column controls **inside `DataTable`**. No screen ever hand-builds a sort
popover, a filter row or a frozen column again.

---

## Contents

- [0. What changes, in one page](#0-what-changes-in-one-page)
- [1. Pattern and governing sections](#1-pattern-and-governing-sections)
- [2. Evidence](#2-evidence)
- [3. The header cell](#3-the-header-cell)
- [4. The header menu](#4-the-header-menu)
- [5. Sort — and what happens to AC-45](#5-sort--and-what-happens-to-ac-45)
- [6. Filter — six kinds, one filter model](#6-filter--six-kinds-one-filter-model)
- [7. Pin](#7-pin)
- [8. Arabic](#8-arabic)
- [9. The three modes](#9-the-three-modes)
- [10. Layout — the wireframes](#10-layout--the-wireframes)
- [11. Every state, drawn](#11-every-state-drawn)
- [12. Components](#12-components)
- [13. Copy — final, English and keys](#13-copy--final-english-and-keys)
- [14. Interaction and keyboard](#14-interaction-and-keyboard)
- [15. The column contract](#15-the-column-contract)
- [16. Deviations](#16-deviations)
- [17. The `DESIGN.md` amendments](#17-the-designmd-amendments)
- [18. Acceptance criteria — AC-80 … AC-116](#18-acceptance-criteria--ac-80--ac-116)
- [19. Findings — raised, not decided by me](#19-findings--raised-not-decided-by-me)
- [20. Handoff](#20-handoff)

---

## 0. What changes, in one page

| Today | After this spec |
|---|---|
| The sort caret is an **indicator**; the control is a popover the **page** supplies through `toolbar` | The caret is **still** an indicator. The control exists in **two** places, both owned by `DataTable`: the column's own header menu, and the toolbar popover it now renders itself. Neither is hand-built by a page. |
| **Headers are not interactive anywhere in the product** (`00-shell.md` §9.1, `DataTable.tsx:34`) | Superseded. A header cell contains **exactly one** interactive element — a menu trigger — or **none**. See **D-6**. |
| Filtering is a `ReactNode` (`filterRow`) the page passes in | A column **declares** its filter. `DataTable` renders the header control, the popover and the chip. `filterRow` is removed; `extraFilters` covers filters bound to no visible column. |
| Column pinning is governed for **one** surface — §2.5's bulk grid, *"Bulk grids MUST be edge-to-edge with a sticky header row and a **frozen identity column**"* (`DESIGN.md:1200`) — and for no other | New **§8.5** generalises that MUST to every dense table, written with §8's evidence discipline. Shopify does it in the bulk-edit grid `[observed]`; the legacy Eyvar app already does it, with an RTL defect `[code]`. |
| A table wider than the card clips at the inline-end edge | The table scrolls horizontally. The R5a marker, the selection checkbox, the identity column and the row kebab never leave the viewport. |

**One thing does not change, and it is load-bearing:** a column filter is a `FilterSpec` in
`table.filters`, exactly like a toolbar filter. So `table.isFiltered` is already true when a column
filter is on, and **AC-37 / AC-38 need no amendment at all** — the `no-match` versus `first-run`
choice stays mechanical.

**Persistence is Q1, still unanswered.** Everything here is in memory, per mounted table, and dies
on reload — the same recorded gap the shell ships with (finding **F-7**). §7.6 says exactly what
changes when Q1 lands, and it is one shape of stored value, not thirty-four.

---

## 1. Pattern and governing sections

`docs/ref/patterns.md` has no row for "a table control", because it maps *pages*, not *components*.
This is not a screen. It is a capability added to `DataTable` (D-01), which appears in **four** of
`patterns.md`'s ten rows:

| `patterns.md` row | Mode | This spec reaches it |
|---|---|---|
| Index table + view tabs + filters + bulk action bar (10 pages) | `index` | fully |
| Work queue — claim, SLA, disposition, row-level critical (7 pages) | `queue` | fully |
| Ledger — append-only, money formatting (3 pages) | `ledger` | **filter and pin only. Never sort** |
| Index table → detail with timeline (3 pages) | `index` | fully |

**Governing sections, in precedence order.**

| Source | What it governs here |
|---|---|
| **R4** | numeric / currency / count columns align inline-end, header and value sharing one edge. Constrains where the menu caret may sit (§3.2). |
| **R7 / R5a** | the header carries no badge and no red. Filter state is carried typographically. |
| **R8** | an empty filter list is one grey sentence, never an illustration. |
| **R13** | no §1–§5 pixel figure binds. The 200 px sort-popover width below is adopted as a *relationship* (a menu is narrower than the table), not because Shopify measured 200. |
| **§6.2 D-2** | 13 px body, 32 px rows. Every value here is on the 4 px grid. |
| **§6.2 D-6** (new, §17.1) | header cells become interactive. |
| **§7.2 / §7.3 / §7.5 / §7.7** | focus, keyboard, live regions, hit targets. These beat everything in §1–§5. |
| **§8.3.3** | a ledger is not user-sortable. Enforced by `tsc`, not by a flag. |
| **§8.4** | the R5a leading-edge marker, which horizontal scroll must not be allowed to hide. |
| **§8.5** (new, §17.2) | column pinning. |
| **§9.1 / §9.2** | logical properties; what does not mirror. Pinning is the highest-risk part of this spec. |
| `00-shell.md` §1.2, §1.3, §9.1, §12, §13 | geometry, elevation, table anatomy, the component table, what opens where. |

---

## 2. Evidence

Design from what is there, not from a memory of what admin panels look like.

### 2.1 Shopify does freeze a column — measured, not recalled

`03-products/products-bulk-editor-grid.webp` and `03-products/products-bulk-editor-price-columns.webp`
are the same grid at two horizontal scroll offsets.

| | grid.webp | price-columns.webp |
|---|---|---|
| Columns visible | Product title · Tags · Status · Product category · Vendor · *Base…* (clipped) | Product title · Status · Product category · Vendor · Base price USD · Available quantity |
| Cell text in `Product title` | Custom handcrafted mug / Example Hat / Grey / Example Pants / Jeans, W32H34 | identical, at identical x |

Pixel diff of the two frames, PIL, region `x 0–210, y 30–135` (the `Product title` column) versus
`x 230–400, y 30–135` (the first scrolling column):

```
frozen region   x < 210 :  mean channel diff 0.13   max 14    ← WebP compression noise
scrolling region x 230+ :  mean channel diff 8.25   max 220
```

`[observed]` **The first column is frozen and the rest of the grid scrolls under it.** This is the
adjacent Shopify pattern §8's evidence discipline requires me to look for before claiming absence.
It is not in the *index* table — only in the full-bleed bulk editor — which is why the pattern still
needs writing for Eyvar, but the claim "Shopify has nothing like this" would have been false.

### 2.2 The frozen boundary is a hairline, and it does not change with scroll

Sampling `y = 90` (a body row) across the boundary in both frames:

```
x        204   205 … 211   212       213       214   215
grid          247,247,247   241,241   248,248   255   254
price         247,247,247   241,241   248,248   255   254
```

`[observed]` One 1 px step, `#F7F7F7 → #F1F1F1`, **identical whether the grid is scrolled or not**.
No gradient falloff over 4–8 px, so no shadow — at this capture size a `0 … 6px` blur would show as
a ramp and there is none. The frozen edge is a **constant hairline**.

### 2.2a `DESIGN.md` already requires a frozen column — for exactly one surface

`DESIGN.md:1200`, in §2.5's full-bleed editor rules:

> Bulk grids MUST be edge-to-edge with a sticky header row and a **frozen identity column**.

So pinning is **not** absent from the document. It is a MUST for the bulk grid and unwritten
everywhere else, which is the worst of both: the product has a normative frozen column with no
statement of which column, no visual treatment, no cap and **no RTL clause** — in a document whose
whole §9 exists because directional geometry is where this product breaks. §8.5 generalises that
MUST rather than inventing a rule beside it.

### 2.3 Shopify's index table clips, and §3.1 already guesses what happens next

`02-orders/orders-list-with-metrics-row.webp` — the `Tags` column is cut off at the card's
inline-end edge with no scrollbar in frame. `[observed]`

`DESIGN.md` §3.1 already concedes the rest: *"That they **scroll horizontally**, and that the
checkbox + primary cell stay pinned while they do, are both `[Polaris]` — a static frame cannot show
a scroll."* So the document has **already committed to implicit pinning of the checkbox and the
identity column**, on recall, without a rule. §8.5 turns that into one.

### 2.4 The legacy Eyvar app already pins a column — to the wrong edge

`eyvar_ops_panel_v40_fixed.html:751` (the Subscriptions index, 12 columns):

```html
<th style="position:sticky;right:0;background:var(--bg2);
           box-shadow:-4px 0 6px -4px rgba(0,0,0,.12)">Actions</th>
```

and `:3555`, the matching `<td>`. `[code]` Two occurrences, both physical, and
`.tbl-scroll{overflow-x:auto}` at `:147` is the scroll container. `[code]`

Three things follow, and all three are load-bearing:

1. **Pinning is an existing operator behaviour**, not a new idea. The thing operators already keep
   on screen is the row's **action** control.
2. **`right:0` has no `[dir="rtl"]` counterpart anywhere in the file.** The only RTL overrides are
   `.sb` at `:383–385` and `.settings-nav-col` at `:401–402`. `[code]` In Arabic the pinned Actions
   column freezes to the edge the reader's eye *leaves*, and the operator scrolls it further away.
   This is a live defect of the same family as `.sb-item.on`'s `inset 3px 0 0` (§9.1's third listed
   defect) — see finding **F-12**.
3. **The shadow has a negative x-offset.** `00-shell.md` §1.3 constraint 2 is explicit that all
   three elevation tiers are `offset-x: 0` *"deliberately, so elevation is direction-invariant and
   needs no RTL branch."* A `-4px` x-offset is precisely the thing the closed set exists to prevent.
   It is not a precedent. It is the second half of the same defect.

### 2.5 What a sort control looks like here already

`03-products/products-list-sort-popover.webp` `[observed]` — anchored under the toolbar's sort icon,
narrow, a `Sort by` label, a **radio group** of fields, a divider, then a direction pair rendered
with **arrows**: `↑ A–Z`, `↓ Z–A`, active one highlighted. The direction glyph in this product's
vocabulary is an **arrow**. The *chevron* is what a filter chip carries (`Product vendor ⌄`,
`Tagged with ⌄`, `Status ⌄` — `03-products/products-list-search-and-filters.webp` `[observed]`) and
what §1.5 reserves: *"SHOULD reserve the trailing caret exclusively for controls that open a menu or
select."* §3 below assigns the two glyphs disjointly on that basis.

### 2.6 Where filters live today

`03-products/products-list-search-and-filters.webp` and
`02-orders/orders-list-search-mode-add-filter.webp` `[observed]` — filters are **chips in a row
beneath the search field**, each with a trailing chevron, ending `Add filter +`, with `Clear all` at
the row's inline-end when anything is applied. Nothing is in the header. §6.3 keeps that row exactly
as it is and makes the header a **second entry point to the same state**, not a second state.

---

## 3. The header cell

### 3.1 The decision — one trigger, one menu, always visible

**A header cell contains exactly one interactive element: a button that opens a menu. Or it contains
none.** Never two.

Three shapes were considered:

| Shape | Rejected because |
|---|---|
| Click the label to sort, separate `⌄` button for filter/pin | Two hit targets in one 32 px cell. §7.7 requires ≥ 24 × 24 for each, and **§6.2 D-2 may not be cited against §7.7** (`00-shell.md` §9.1). Two 24 px targets plus a 12 px label is a 60 px minimum header cell in a table whose whole point is density. It also makes the header do different things depending on where inside it you click — the exact ambiguity that breaks under RTL and under a screen reader. |
| Hover reveals the affordance | §7.2 and the AC-68 precedent. Capability that is invisible without a pointer does not exist for a keyboard operator, and this is an ops console worked by keyboard all day. |
| **One button wrapping the whole cell, opening a menu** ← chosen | One target, one gesture, one accessible name, one `aria-expanded`. Keeps the mechanical reviewability AC-45 was built for: `th` contains one `button[aria-haspopup="menu"]` **or nothing**, and a ledger header contains no sort item because `LedgerTable` has no `setSortField` to call. |

**The resting affordance is a `⌄` chevron, always rendered**, at 12 px `--ev-text-2`. Not on hover.
The precedent is AC-68's row kebab, which *"always renders, at `--ev-text-2` with no fill; on row
`:hover` or `:focus-within` it takes `--ev-ink` and an `--ev-bg2` fill."* The header adopts the same
two-step exactly, so there is one rule in the product for "a control that is present but quiet."

Cost, stated honestly: 16 px of column width per header (12 px glyph + 4 px gap). On an eight-column
table that is 128 px of the 976 px content region at the 1280 floor — about 13 %. Accepted; the alternative is a hidden
feature.

### 3.2 Anatomy, and the R4 problem

Two glyph slots, and **the caret sits on the side of the label group away from the column's
alignment edge**, so header and value keep sharing one edge (**R4**, **AC-44**).

```
start-aligned column (text, dates, identity)        end-aligned column (numeric, money, count)
┌───────────────────────────────────┐               ┌───────────────────────────────────┐
│ 12px │ Captain │↑│ ⌄ │            │               │            │ ⌄ │↓│ Earned (SAR) │ 12px │
└───────────────────────────────────┘               └───────────────────────────────────┘
        └── label flush to the                                    label flush to the ──┘
            cell's inline-START                                   cell's inline-END
              ▲   ▲                                                 ▲   ▲
              │   └─ menu caret, ALWAYS                             │   └─ sort arrow, only when
              └───── sort arrow, only when this                     └────── menu caret, ALWAYS
                     column is THE sort column
```

Gaps 4 px, glyphs 12 px, on the grid. The **button is the whole cell** — full width, full 32 px
height — so the hit area is far past 24 × 24 with no negative-margin trick needed.

### 3.3 States of the header cell

| State | Fill | Label | Caret | Sort arrow |
|---|---|---|---|---|
| Rest, no control active | none | `--ev-text-2`, 12 px / 500 | `--ev-text-2` | absent |
| Hover **or** `:focus-within` | `--ev-bg2` | `--ev-ink` | `--ev-ink` | — |
| `:focus-visible` | `--ev-bg2` | `--ev-ink` | `--ev-ink` | — · **plus** the §7.2 ring, drawn **inset** so it is not clipped by the cell boundary or by the pinned region's `overflow` |
| Menu open (`aria-expanded="true"`) | `--ev-bg2`, retained while open | `--ev-ink` | `--ev-ink` | — |
| **Sorted** by this column | none | `--ev-ink`, 12 px / **600** | `--ev-text-2` | `↑` asc / `↓` desc, `--ev-ink` |
| **Filtered** on this column | none | `--ev-ink`, 12 px / **600**, text becomes `Label: value` | `--ev-text-2` | — |
| Sorted **and** filtered | none | as above | `--ev-text-2` | as above |
| **Pinned** | *no header change* — see §7.4 | | | |
| Column has no declared control | none | `--ev-text-2`, 12 px / 500 | **absent** | absent |

No colour carries any of this. Weight and literal text do (§7.5): render the header in greyscale and
you still read `City: Riyadh` in semibold with a `↓` beside `Trips`.

**Why not a dot or a badge for the filter state.** A dot is colour-only meaning (§7.5) and a badge in
a 32 px header is R7 geometry at 20 px inside a 32 px row, which does not fit and is not what badges
are for (`00-shell.md` §12.1: *"Badges are never interactive"* — the header cell is). The value
inline is shorter, truer and survives colour removal.

### 3.4 The glyph vocabulary, made disjoint

`DESIGN.md` contains a real internal collision here, and it has to be settled before a `⌄` can mean
anything:

- §3.1 `[observed]`: *"Exactly one header carries a small **chevron** indicating the active sort
  column and direction."*
- §1.5: *"SHOULD reserve the trailing **caret** exclusively for controls that open a menu or select"*
  — restated at §9.1 translation row 9 as normative for Eyvar.

Both cannot hold once every header is a menu. The precedence ladder settles it without a new ruling:
both are §1–§5, both describe Shopify, and **§6.2 beats both**. So **D-6** (§17.1) assigns them:

| Glyph | Means | Where |
|---|---|---|
| `⌄` chevron | **this opens a menu** | header menu trigger · filter chip · saved-view tab · `More actions` |
| `↑` `↓` arrows | **sort direction** | header sort indicator · sort popover direction pair (already `[observed]`) |
| `⇅` | **sort control** | toolbar sort button |

The arrows do **not** mirror in Arabic — `docs/ref/rtl.md`: *"Delta arrows ↑ ↓ — No: vertical
magnitude, not reading direction."* A sort arrow is vertical magnitude. The chevron does not mirror
either; it points block-end, and only its *position* moves (`00-shell.md` §14).

---

## 4. The header menu

`dropdown-menu`, `--ev-shadow-2`, 200 px, anchored to the header cell's alignment edge (`align:
start` for start-aligned columns, `align: end` for end-aligned ones — logical, not physical).

```
┌─ 200px ───────────────────────┐
│ ●  ↑  Sort A to Z             │  radio group, current direction checked
│ ○  ↓  Sort Z to A             │
│    Clear sort                 │  only when THIS column is the sort column
│ ───────────────────────────── │
│    Filter…                    │  opens the filter popover; menu closes first
│    Clear filter               │  only when THIS column has an active filter
│ ───────────────────────────── │
│    Pin column                 │  or `Unpin column`
│    Hide column                │  only when the column is hideable
└───────────────────────────────┘
```

Composition rules:

- **Only items the column actually offers render.** A column with `sortField` absent has no sort
  block and no separator. A menu that would be empty means the header shows **no caret and no
  button** (§3.3, last row).
- Items are grouped by `DropdownMenuSeparator` into **sort · filter · layout**, in that order,
  reading inline-start to inline-end down the page. Same grouping idiom as §3.3's bulk overflow.
- **No item is red**, ever. `Hide column` is recoverable from the columns popover, so §3.3's rule
  (*"Destructive items in the overflow MUST NOT be coloured red"*) applies a fortiori.
- **`Filter…` closes the menu and opens a popover.** It is not a submenu. Typing inside a
  `dropdown-menu` triggers Radix's typeahead and steals the keystrokes from any input placed in it —
  a real, reproducible defect, not a theoretical one. Two sequential surfaces, never nested.
  §5.0/`00-shell.md` §13.1 already puts a filter value picker in a **popover**; this reaches the same
  popover from a second trigger.
- **`Pin column` may render disabled** (§7.3), with its reason as a 12 px `--ev-text-2` second line
  *inside the item*. Not a tooltip — §5.7 rule 7 forbids constraints in tooltips, and
  `00-shell.md` §11.2 requires the reason to be *available*, gated at render, never at commit.

---

## 5. Sort — and what happens to AC-45

### 5.1 Recommendation: **single sort. Exactly one caret. Forever.**

AC-45 as written has two clauses. They are separable and they get different answers:

| AC-45 clause | Verdict |
|---|---|
| *"exactly one header shows the active caret; no other header shows any resting **sort** affordance"* | **Survives verbatim, and is strengthened.** The arrow is still an indicator. It appears on exactly one column, ever. |
| *"headers are not interactive anywhere in the product — the caret is an indicator and the control is the sort popover"* | **Superseded** by **D-6**. The caret stays an indicator; the *cell* becomes a control. |

**Why single-sort and not multi-sort**, in the order the reasons actually bind:

1. **The API says so, and the API is the contract.** `SortSpec` is `{ field, dir }` and
   `QueryParams.sort` is `SortSpec | null` (`src/data/types/common.ts`). `useIndexTable` exposes
   `setSortField` / `setSortDirection` / `clearSort` over a single `sort` value. Multi-sort changes
   the transport shape, every client, and `src/data/mock/query.ts`. That is a product decision
   nobody asked for; inventing it here is how two agents ship incompatible answers.
2. **Multi-sort needs an ordinal per column** (`1↑ 2↓`) — a fourth glyph slot in a 32 px header at
   12 px type, carrying an ordering nobody can read at a glance. Density forbids it and legibility
   forbids it.
3. **The thing multi-sort is usually reached for is a filter.** "Breached first, then oldest" is
   §8.4's fixed queue order, which is a *rule*, not an operator preference (`00-shell.md` §9.3:
   *"breached first, then by remaining time ascending, `No clock` last"*). Making that operator-
   settable would be a defect.

If multi-sort is later wanted, it is a product-owner request with a transport change attached, not a
component change. Recorded as finding **F-13**.

### 5.2 What the indicator survives means concretely

Because the sort column can now be **scrolled out of view** — a state that did not exist before this
spec — a single header caret is no longer a sufficient carrier under §7.5. So:

**When a sort is active, the toolbar sort control renders as a labelled button instead of an icon.**

```
no sort active          sort active
┌───┐                   ┌──────────────────┐
│ ⇅ │  icon-only,       │ ⇅  Trips      ↓  │  28px (--ev-control-h), ghost,
└───┘  aria-label       └──────────────────┘  label = the sorted column's header text
       "Sort"
```

It grows horizontally inside the icon cluster. **No vertical shift** — AC-47's constraint is about
search mode replacing the tab row and is untouched. This is the always-visible, scroll-independent
readout of the sort state, and it is also the second entry point (§5.3).

### 5.3 Two entry points, one state

| Entry point | Offers | Why it exists |
|---|---|---|
| **Header menu** | this column's two directions + `Clear sort` | The fast path. The field is implied by which header you opened. |
| **Toolbar `⇅` popover** — `DataTable` renders it now, not the page | `Sort by` label · radio group of **every** sortable field, including columns currently hidden or scrolled past · divider · direction pair | §3.2 has a MUST for it, and it is the only way to sort by a column you cannot see. |

Both call `table.setSortField` / `table.setSortDirection`. One `sort` value. One caret. No divergence
is possible because there is no second piece of state.

**§3.2's ban is not violated.** *"Sort MUST be a popover with field-as-radio-group plus a separate
direction pair — never a mixed 'Name A–Z / Name Z–A / Date new–old' flat list."* The banned pattern
is field **and** direction crossed into one flat list. In a header menu the field is fixed by the
anchor, so the two direction items are a direction pair with no crossing. The toolbar popover keeps
the radio-group-plus-pair shape exactly.

### 5.4 Direction labels are per data type — and the current keys are wrong

`src/i18n/dictionaries.ts` ships `table.sortAscending: 'Oldest first'` and
`table.sortDescending: 'Newest first'`. Those are **date** labels applied to every column. `Oldest
first` on a `Trips` column is nonsense. Replaced by six pairs keyed off `column.dataType`:

| `dataType` | Ascending | Descending |
|---|---|---|
| `text` | `Sort A to Z` | `Sort Z to A` |
| `enum` | `Sort A to Z` | `Sort Z to A` |
| `number` | `Sort low to high` | `Sort high to low` |
| `money` | `Sort low to high` | `Sort high to low` |
| `date` | `Sort oldest first` | `Sort newest first` |
| `boolean` | `Sort {trueLabel} first` | `Sort {falseLabel} first` |

Menu items are verbs (`copy.md` rule 2) and carry no period (rule 8). The same six pairs label the
toolbar popover's direction rows, prefixed with `↑` / `↓` as `[observed]`.

---

## 6. Filter — six kinds, one filter model

### 6.1 The kinds

Six, closed. A seventh needs a row here before it ships. **The kind names are
`src/lib/columnFilter.ts`'s**, which is already built — `ColumnFilterKind`, `ColumnFilterValue`,
`toFilterSpec` — so I adopt them rather than shipping a second vocabulary for the same six things.

| Kind | Control | Primitives | `FilterOperator` (`toFilterSpec`) | Applies |
|---|---|---|---|---|
| `text` | one `Input`, magnifier prefix, placeholder = `Search {column}` | `input`, `input-group` | `contains`; blank → `null` → `removeFilter` | on **250 ms** debounce (`DEFAULT_DEBOUNCE_MS`). No Apply. |
| `select` | radio group, `Any` first | `radio-group`, `label` | `eq`; `Any` → `null` → `removeFilter` | on change. Popover stays open. |
| `multi-select` | checkbox list; **> 8 options adds a search field** at the top | `checkbox`, `command` (> 8), `scroll-area` (> 12) | `in` — **even for one selection**, so the operator ticking a second box never changes the query's *operator* | on each toggle. Popover stays open. |
| `number-range` | two `Input`s, `From` / `To`, both optional, `text-align: end`, `tabular-nums`. `unit: 'money'` columns take the **`SAR` inline-start in-field prefix** | `input`, `input-group`, `field` | both → `between` · min only → `gte` · max only → `lte` | on 250 ms debounce |
| `date-range` | **the shell's existing date-range popover, unchanged** — preset column + 2 months, `Cancel` / `Apply` | `popover`, `calendar`, `button` | as `number-range`, with Riyadh day boundaries applied by `toFilterSpec` | presets apply on click and close. A custom range needs `Apply`. |
| `boolean` | radio group: `Any` · `{trueLabel}` · `{falseLabel}` | `radio-group` | `eq` with `true` / `false`; `null` is "not set", and **`false` is a filter** | on change |

**Bounds are integers.** Every numeric column here is a count, a duration in seconds, or money in
**halalas** — `toFilterSpec` throws on a decimal bound, because a decimal means someone passed major
units, which is the `formatMoney(12.34)` bug one layer up. A `number-range` control on a money column
therefore parses `42.50` into `4250` before it hands the value over.

Notes that are easy to get wrong:

- **`boolean` is a radio group, not a `Switch`.** A filter has three states — any, yes, no — and a
  switch has two with no unset. §4.3: *"switch only for instant-effect settings."*
- **The money range filter takes the `SAR` prefix.** §8.3's loudest trap is that §4.2's
  currency-prefix rule *"governs inputs only and MUST NOT be applied to output."* These are inputs.
  A `number-range` filter on a money column therefore renders `SAR │ 0.00` inline-start-prefixed, while the
  column it filters carries `(SAR)` in the header and bare numbers in the cells. Both are correct
  and they look different on purpose.
- **`date-range` is the one filter with `Cancel` / `Apply`**, because a half-chosen range is not a
  filter. This is `00-shell.md` §13.1's existing ruling, adopted, not re-decided.
- **Every other filter has no Apply and no Cancel**, per §3.2 / §5.4 and the sort popover's
  `[observed]` behaviour. Escape closes; the value is already applied.
- The text and range popovers hold their input value in **component-local state** and debounce
  before calling `table.setFilter`. `useIndexTable` debounces `query` but **not** `filters`, and
  `setFilter` resets the page and clears selection synchronously (AC-25) — calling it per keystroke
  would reset the page five times per word. See the handoff.

### 6.2 How an active column filter reads

Header: `Label: value`, semibold, `--ev-ink` (§3.3). One key with named placeholders — never
concatenation (**AC-75**):

| Kind | Summary | Example header |
|---|---|---|
| `text` | the query | `Captain: nora` |
| `select` | the option label | `Status: Paused` |
| `multi-select`, one value | the option label | `City: Riyadh` |
| `multi-select`, n values | `{value} +{count}` | `City: Riyadh +2` |
| `number-range`, both ends | `{from}–{to}` | `Trips: 100–500` |
| `number-range`, min only | `{from} and above` | `Trips: 100 and above` |
| `number-range`, max only | `{to} and below` | `Trips: 500 and below` |
| `date-range`, preset | the preset label | `Created: Last 30 days` |
| `date-range`, custom | `{from}–{to}` | `Created: 1 Jul–19 Jul` |
| `boolean` | `trueLabel` / `falseLabel` | `Documents: On file` |

**The header summary may truncate with `…` at the cell width. The chip may not.** The chip row is
the complete readout; the header is the glanceable one. En dash `–` U+2013 for ranges, never a
hyphen. The `{value}` substring is wrapped in `<bdi>` — see §8.4.

### 6.3 Column filters and the chip row are one state

This is the answer to the whole "how does it relate to `table.isFiltered`" question, and it is
short:

> A column filter **is** a filter. It is one `FilterSpec` in `table.filters`, keyed on
> `column.filter.field`. `useFilters.setFilter` already replaces by field, so **one column can never
> hold two chips**, and `isFiltered` is already true. **AC-37 and AC-38 are unchanged.**

Consequences, all of them free:

- Applying a column filter renders a chip in the existing chip row, labelled with the same
  `Label: value` string the header shows.
- Dismissing the chip clears the header. `Clear all` clears every header. `clearAll()` already
  exists.
- `Add filter +` opens a picker listing every filterable column **plus** every `extraFilters` entry,
  and choosing one opens **the same popover** the header opens. One popover per filter kind, two
  triggers.
- Changing a column filter resets the page to 1 and clears selection (**AC-25**), because it goes
  through `setFilter` like everything else.

**R10 is not in play.** R10 governs *event feedback surfaces* — transient versus standing, toast
versus banner. A chip and a header label are two readouts of one persistent state, like a nav count
badge and a page heading. Nobody may cite R10 against this.

`filterRow?: ReactNode` is **removed** from `DataTableProps`. `DataTable` renders the chip row from
`table.filters` + the column definitions + `extraFilters`. That is the literal content of "no need
to redo for everypage."

### 6.4 `extraFilters` — the escape hatch, bounded

Some filters belong to no visible column: a `Created` date range on a table with no `Created`
column, a `Has open ticket` boolean that is not worth a column. These declare the same
`ColumnFilterSpec` shape at table level. They appear in `Add filter +` and in the chip row, and they
have **no header**, because they have no column. Nothing else about them differs.

---

## 7. Pin

### 7.1 Three regions, and only one of them is the operator's

```
┌─ card ─────────────────────────────────────────────────────────────────────────────┐
│ [All][Active][At risk][+]                              (🔍) (▤) (▥) (⇅ Trips ↓)   │
│ [City: Riyadh ⌄][Status ⌄][Add filter +]                              Clear all    │
│ ────────────────────────────────────────────────────────────────────────────────── │
│ ┌── PINNED, inline-start ────────┐│┈┈ scrolls ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┐┌─ PINNED ─┐│
│ │ ☐ │ Captain ↑    ⌄ │ Status ⌄ │││ City ⌄ │ Trips ⌄ │ Earned (SAR) ⌄ ││    ⋯     ││
│ │───┼────────────────┼──────────┤││────────┼─────────┼────────────────││──────────││
│ │ ☐ │ Nora Al-Harbi  │ (Active) │││ Riyadh │     412 │       4,218.00 ││    ⋯     ││
│ │ ☐ │ Sara Al-Ghamdi │ (Active) │││ Jeddah │     288 │       2,904.50 ││    ⋯     ││
│ │ ☑ │ DRV-0106       │ (Paused) │││ Dammam │       0 │           0.00 ││    ⋯     ││
│ └────────────────────┬──────────┘│└────────┴─────────┴────────────────┘└──────────┘│
│   implicit │ operator-pinned ────┘ hairline boundary                    implicit    │
│                                                                                     │
│  ◄══════════════════════════════════════════════════════════►  horizontal scrollbar │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

| Region | Contents | Who decides |
|---|---|---|
| **Implicit inline-start** | the R5a marker lane (queue only) · selection checkbox (when present) · column index 0, the identity column | The component. Never the operator. Never unpinnable. |
| **Operator inline-start** | any number of columns within the width budget (§7.2), rendered in **column-declaration order** | The operator |
| **Implicit inline-end** | the row kebab column (index and queue; a ledger has none) | The component. Never the operator. |

**The pinned region renders in column-declaration order, never in click order.** Pinning is a
freeze, not a reorder: if pinning `Status` moved it in front of `Plan` merely because it was clicked
first, the operator would have performed a column reorder they never asked for, and pinning a second
column would visibly shuffle the first. Column *order* is separate per-view state (§9.1). This is
`useColumnPinning`'s ruling and it is the right one; my earlier draft said "pin order" and was wrong.

**Only the inline-start edge is operator-pinnable.** `PinEdge` in the helper is
`'start' | 'end'` because the component needs `'end'` for the kebab — **it is never wired to an
operator affordance.** No menu item and no columns-popover toggle offers an end pin. Grounds:

1. The inline-end region is already **spoken for** by the kebab. `00-shell.md` §9.1 fixes the kebab
   at the row's inline-end, and `[code]` `:751` shows what operators actually pin at that edge: the
   action control. Letting an operator insert arbitrary data columns between the scrolling area and
   the row's action control puts a moving boundary around the one control that must stay put.
2. Two operator-controlled regions doubles the state space — two caps, two guards, two boundary
   hairlines, two RTL mappings — for a need nobody has named.
3. Shopify freezes exactly one region, at the start. `[observed]` §2.1.

**The identity column is never hideable and never unpinnable.** §3.1: *"The first data cell MUST be
the record's identity and MUST be a link to the record's detail page."* You cannot hide or scroll
away the only thing that navigates.

**The R5a marker rides the pinned region.** §8.4's breached-row leading-edge marker is drawn at the
row's `inset-inline-start`. If it sat on the scrolling region it would disappear the moment an
operator scrolled — and R5a's three parts *"none substitutes for another"* (**AC-50**). Because the
implicit block always exists, the marker always has a stationary host. This is the single most
important interaction in this section and it is easy to miss.

### 7.2 One guard, measured against the floor — and therefore no resize behaviour at all

**There is one guard and no count cap:**

> The pinned region may not exceed **50 %** of the table's inline size **at the narrowest width that
> table will ever have** — `TABLE_FLOOR_INLINE_SIZE_PX = 976`, the content region at the 1280 px D2
> floor with both nav columns expanded, measured in `00-shell.md` §1.

Two consequences, and the second one deletes a whole state I had drawn:

1. **A count cap is redundant.** Three narrow columns and one wide one are not the same risk, and
   the budget already refuses whichever combination is too much. `PinRefusalReason` has exactly one
   value — `'exceeds-budget'` — and a second refusal reason would be a second sentence to write, a
   second disabled state to test, and no additional protection. My earlier draft's "cap: 3" is
   dropped.
2. **Pins never change on resize.** Because the budget is computed against the *floor*, a pin
   accepted at 1920 px is still valid at 1280 px. The demotion-and-restoration behaviour I first
   drew cannot occur, and specifying it would have produced a code path nothing can reach. The
   budget is deliberately **not** a live measurement — `useColumnPinning`'s `floorInlineSize` says
   so in its own contract.

Arithmetic at the floor:

| | px |
|---|---:|
| Content region at 1280, both nav columns expanded (`00-shell.md` §1, and `TABLE_FLOOR_INLINE_SIZE_PX`) | **976** |
| Budget — 50 % (`DEFAULT_MAX_PINNED_FRACTION`) | **488** |
| Implicit block — 40 checkbox + ~220 identity | **260** |
| Left for operator pins | **~228** — one typical column, or two narrow ones |

A full-bleed bulk grid (§2.5) has no nav columns and legitimately passes a larger `floorInlineSize`.
That is the only sanctioned override.

**When a pin would breach the budget**, `Pin column` renders **disabled in place** with the reason on
a second line — gated at render, never at commit (`00-shell.md` §11.2, §9.3's *"the systemic defect
is that the operator clicks, waits, and is told no"*). `canPin` is the dry run that drives it and
returns the same answer `pin` would. The refusal object carries `wouldBe` and `budget` in pixels;
**the operator never sees a pixel figure** — the sentence is `Not enough room to pin another
column`.

**A pinnable column must declare an inline size in px.** A column sized `auto` has no offset until
layout has run, and an offset computed after layout is a frame of visible jump on every scroll. This
is a real constraint on the column contract (§15), not an implementation note.

### 7.3 Visual treatment — tier **none**, and why

`00-shell.md` §1.3 gives `--ev-shadow-1` to *"the sticky table header once the body has scrolled
under it."* A pinned column is the inline-axis analogue of that sticky header, so the analogy is
real and the question is fair. The answer is still **no shadow, no tier**:

1. **The axis is wrong, and §1.3 closed that door on purpose.** All three tiers are `offset-x: 0`
   *"deliberately, so elevation is direction-invariant and needs no RTL branch."* Applying
   `--ev-shadow-1` (`0 1px 2px`) to an inline edge renders a shadow **below** the column, not beside
   it. Giving it an x-offset creates a fourth token that **must** mirror in Arabic — reintroducing
   exactly the class of defect §1.3 constraint 2 exists to prevent, and the exact defect the legacy
   app already has at `:751` (`-4px 0 6px -4px`, no RTL counterpart).
2. **The measurement says hairline.** §2.2: Shopify's frozen boundary is a single 1 px step and it
   is **identical scrolled and unscrolled**. No ramp, no shadow.
3. **The primary signal is not the line, it is the motion.** Content visibly moves and the pinned
   block does not. The boundary is a supporting delimiter, which under `docs/ref/a11y.md` is a
   *"decorative rule / divider"* and carries no contrast minimum.

**The rule:**

> The **last pinned column at each edge** — `useColumnPinning`'s `isLastPinned`, the one the
> scrolling body actually slides under — carries `border-inline-end: 1px solid var(--ev-hairline)`
> at the inline-start edge, or `border-inline-start` at the inline-end edge. It renders **only while
> the table is horizontally scrollable** (`scrollWidth > clientWidth`). No shadow, no fill change,
> no tier.

The boundary belongs to a **cell**, not to a wrapper element, which is why the helper exposes
`isLast` as a flag rather than making the call site take `array.at(-1)`: at the inline-end edge the
innermost pinned column is the *first*-declared one, and `at(-1)` would put the hairline on the
wrong side of the kebab.

Rendering it only under overflow matters: with no overflow, nothing is frozen in any meaningful
sense, and a permanent vertical rule on every index table in the product would be a large visual
change bought for nothing. Eyvar's table has no other vertical rules, so when this one appears it is
unambiguous.

The pinned cells take the row's own background — `--ev-surface` at rest, `--ev-bg2` on row hover —
so scrolling content cannot show through. That is not decoration; it is required for the region to
be opaque.

### 7.4 How you know a column is pinned

Four carriers, none of them colour:

1. **It does not move.** Primary.
2. **The boundary hairline** groups the pinned block (while scrollable).
3. **Its header menu says `Unpin column`** — state in words, §7.5.
4. **Its row in the columns popover shows the pin toggle pressed** (`aria-pressed="true"`).

**No fifth glyph in the header.** A pin icon would be a fourth thing in a 32 px cell, and there is
no pin glyph in the icon vocabulary `00-shell.md` §14 enumerates. Emoji are banned (`copy.md` rule 3;
**AC-76** dropped the legacy `✋` for the same reason).

### 7.5 The second entry point — the columns popover

The header menu cannot be the only way to pin, for three reasons that are all real:

- While selection is active, **AC-46 replaces the entire header row** with `N selected`. There are no
  header cells and therefore no header menus.
- A column that is scrolled out of view has no reachable header.
- A **hidden** column cannot be pinned from a header it does not have.

So the toolbar's columns control (`▥`) is the second entry point:

```
┌─ 240px ────────────────────────────┐
│  Columns                            │  label, 12px/500 --ev-text-2
│ ─────────────────────────────────── │
│  ☑  Captain            [pinned]     │  identity: checkbox DISABLED, pin DISABLED
│  ☑  Status             [ pin  ]     │
│  ☑  City               [pinned]     │
│  ☑  Trips              [ pin  ]     │
│  ☐  Earned (SAR)       [ pin  ]     │  hidden column: pin toggle disabled
│  ☑  Last active        [ pin  ]     │
│ ─────────────────────────────────── │
│  Reset columns                      │  restores declared visibility and clears all pins
└─────────────────────────────────────┘
```

`checkbox` + `toggle` per row. **No drag handle and no reordering** — no drag primitive exists in the
38, `components.json` is frozen, and reordering was not requested. Recorded as out of scope, not
forgotten.

**§9.1's ">6 columns" clause is widened**, minimally: the columns control renders when
`columns.length > 6` **or** any column is pinnable or hideable. Otherwise pinning would be
unreachable on a five-column table, which is where the 1280 operator most often is.

### 7.6 If Q1 is answered

Everything above is in memory, per mounted table. When persistence lands, the stored value is:

```
{ pins:    ColumnPin[],        // { id, edge } — already useColumnPinning's stored shape
  hidden:  string[],           // column ids
  sort:    SortSpec | null,
  filters: FilterSpec[] }      // already the transport shape
```

Three things must be true of that shape, and are:

- **A pin is `{ id, edge }` with `edge` in logical terms — `'start' | 'end'`, never `'left'`.**
  Storing a physical edge or a pixel offset makes every saved layout wrong for every Arabic operator
  on the first load (§8.2).
- **Render order is not stored**, because it comes from the column declaration (§7.1). A stored
  order would be a second, silently competing source of truth for column order.
- **It is keyed per table *and per view*.** §9.1 already says *"Visible columns and their order are
  per-view state."* Pins are the same kind of state and belong in the same key. `useColumnPinning`
  takes `tableId` today; a view suffix is the extension.

Nothing else moves: `src/lib/persistence.ts` is already the seam, `useColumnPinning` already takes a
`store`, and `createMemoryStore` is already the default.

---

## 8. Arabic

Pinning is inherently directional. This is the part most likely to ship broken.

### 8.1 The mandate, applied

Every rule above is stated in **inline-start / inline-end**. Nothing here depends on left or right.

| Property | Never | Always |
|---|---|---|
| freeze the pinned region | `left: 0` / `right: 0` | `position: sticky; inset-inline-start: 0` (and `inset-inline-end: 0` for the kebab region) |
| boundary | `border-right` | `border-inline-end` |
| menu anchor | `align="end"` meaning *right* | `align` resolved from `dir`, so a start-aligned header anchors its menu at the inline-start |
| header text | `text-align: right` | `text-align: end` — R4, and `00-shell.md` §14: *"never `text-align: right`, which in Arabic aligns on the side the eye leaves"* |
| any offset | `translateX(+n)` | not used here at all — nothing in this spec animates on the inline axis |

### 8.2 What an operator switching to Arabic actually sees

Stated as a promise, because this is the question that gets asked after it ships:

| Thing | What happens |
|---|---|
| **Which columns are pinned** | Unchanged. The set is identical. |
| **Their order within the pinned block** | Unchanged. Identity is still first *in reading order* — it moves from the physical left to the physical **right**. |
| **The pinned block's physical side** | Moves from the physical left edge to the physical **right** edge. |
| **The boundary hairline** | Moves to the block's physical **left** side. `border-inline-end` does this with no branch. |
| **The kebab region** | Moves to the physical **left** edge. |
| **Scroll direction** | Reverses. Scrolling toward the inline-end now moves content leftward. |
| **Scroll position** | **Resets to the inline-start** on `dir` change. Landing mid-table after a language switch is disorienting and the offset is meaningless across the flip. |
| **The R5a marker** | Stays on the row's leading edge — physical right in Arabic — because it rides the pinned block. |
| **Sort arrows `↑ ↓`** | Do **not** mirror. Vertical magnitude (`rtl.md`). |
| **The menu chevron `⌄`** | Does **not** mirror. Position moves; glyph does not (`00-shell.md` §14). |
| **Numbers in a `number-range` filter** | Do **not** reorder. Western digits, LTR run inside an RTL line (**AC-73**). |
| **The header's `Label: value` string** | The label translates and reads RTL; the value is `<bdi>`-isolated so a Latin city name, an id, or `100–500` does not jump sides. |

### 8.3 The two mechanical traps

**`scrollLeft` in RTL is not one number.** Under the CSS Overflow spec, a right-to-left scroll
container's `scrollLeft` is **negative** (Firefox, WebKit, current Chromium); older engines used a
positive or inverted range. Anything that keys off "has this scrolled" must normalise —
`Math.abs(el.scrollLeft) > 0` — and never compare a raw `scrollLeft` to `0` with `>`. This drives the
boundary hairline's overflow test (§7.3) and it is silently wrong in RTL if written naively.

**`position: sticky` + `inset-inline-start`.** Logical insets on sticky positioning are supported in
every evergreen engine, but the offset for the *second* and *third* pinned column must be the
accumulated inline size of the ones before it, and that accumulation is a number, not a keyword.
Compute it from measured widths and apply it to `inset-inline-start` — never to `left`. If a target
engine proves unreliable, the fallback is §9.1's `--flip` custom property (`--flip: -1` under
`[dir="rtl"]`), not a physical branch. Frontend-engineer's call; flagged in the handoff.

### 8.4 Copy that has to survive translation

- Every string is one key with **named placeholders** (**AC-75**). `table.column.filtered` is
  `{label}: {value}` — not `label + ': ' + value`, which cannot be translated and breaks under bidi.
- `Sort A to Z` is meaningless in Arabic and must translate to an Arabic collation phrase, not a
  transliteration. That is a content decision for whoever fills `AR`, flagged in §13.
- No label here depends on English word order. `Pin column`, `Unpin column`, `Hide column`,
  `Clear sort`, `Clear filter` are all verb + object, which `copy.md` §Arabic keeps verb-first.

---

## 9. The three modes

`table.mode` decides, off the discriminated union — never a new prop, never a runtime flag.

| Header control | `index` | `queue` | `ledger` |
|---|---|---|---|
| **Sort** | yes | yes | **never** |
| **Filter** | yes | yes | **yes** |
| **Pin column** | yes | yes | yes |
| **Hide column** | yes | yes | **never** |
| Header carries a `⌄` at all | yes | yes | **yes — with a two-item menu** |
| Columns popover | yes | yes | **pin only; no visibility checkboxes** |

**A ledger header may show `Filter…` and `Pin column`. It may never show a sort item.** Three
independent guarantees, in order of strength:

1. **`tsc`.** `LedgerTable` has no `sort`, no `setSortField`, no `setSortDirection`, no `clearSort` —
   *at all*. A sort item in a ledger header has nothing to call and does not compile. This is
   **AC-48**, unchanged, and it is where the ledger guarantee already lived. AC-45's "headers are not
   interactive" clause was a review-checklist convenience on top of it, not the mechanism.
2. **`canSort` is the literal type `false`** on `LedgerTable`, so the sort block is `false` at
   compile time and a reviewer can see it in the diff.
3. **The reviewable shape**: a ledger header menu has **at most two items and no separator between
   sort and filter, because there is no sort block.**

**Why `Hide column` is never offered on a ledger.** §8.3.3: *"A ledger MUST use the fixed column
order Date · Reference · Description · Debit · Credit · Balance."* Hiding `Credit` turns a
double-entry ledger into a lie. The single-signed-amount form is permitted only in a rail card
≤ 320 px, and that is a different component, not a hidden column.

**Why filtering a ledger is legal and sorting is not.** Filtering selects a subset of postings and
leaves each posting's `balanceAfter` untouched — the running balance is still the persisted value at
the moment of posting. Reordering destroys the meaning of that column entirely. §8.3.3: *"A running
balance is only meaningful in posting order."* A filtered ledger keeps the `Opening balance` and
`Closing balance` rows (**AC-49**) and the closing figure still equals the card header, because both
come from the persisted balance, not from summing what is on screen.

**Queue-specific:** the R5a marker lane is part of the implicit pinned block (§7.1). §8.4's fixed
order — breached first, then remaining time ascending, `No clock` last — is a **rule**, and the sort
control must not be able to override it. So a queue's SLA column declares **no `sortField`**: its
header carries a filter and a pin, and no sort block. Recorded as **AC-99**.

---

## 10. Layout — the wireframes

Page shape is unchanged: **single column**, the shape 32 of 34 sub-tabs use. This spec adds nothing
to the page header and nothing to the rail. Everything lives inside the table card.

### 10.1 The card, resting, nothing pinned, no overflow

```
┌─ card ──────────────────────────────────────────────────────────────────────────────┐
│ [All][Active][Expiring ≤ 7 d][At risk][Frozen][+]              (🔍) (▤) (▥) (⇅)    │ 40
│ ─────────────────────────────────────────────────────────────────────────────────── │
│ ☐ │ Captain      ⌄ │ Status ⌄ │ City   ⌄ │  Trips ⌄ │  Earned (SAR) ⌄ │        ⋯   │ 32
│ ─────────────────────────────────────────────────────────────────────────────────── │
│ ☐ │ Nora Al-Harbi  │ (Active) │ Riyadh   │      412 │        4,218.00 │        ⋯   │ 32
│ ☐ │ Sara Al-Ghamdi │ (Active) │ Jeddah   │      288 │        2,904.50 │        ⋯   │
│ ☐ │ DRV-0106       │ (Paused) │ Dammam   │        0 │            0.00 │        ⋯   │
└─────────────────────────────────────────────────────────────────────────────────────┘
   Showing 1–25 of 4 218                                        [‹ Previous][Next ›]
```

No boundary hairline: `scrollWidth === clientWidth`. No chip row: nothing is filtered. Toolbar sort
is icon-only: nothing is sorted. Every header carries its `⌄`.

### 10.2 Sorted, filtered, pinned, scrolled

```
┌─ card ──────────────────────────────────────────────────────────────────────────────┐
│ [All][Active][Expiring ≤ 7 d][At risk][Frozen][+]      (🔍) (▤) (▥) (⇅ Trips ↓)    │ 40
│ ─────────────────────────────────────────────────────────────────────────────────── │
│ [City: Riyadh +2 ⌄][Status: Paused ⌄][Add filter +]                      Clear all  │ 36
│ ─────────────────────────────────────────────────────────────────────────────────── │
│ ☐ │ Captain      ⌄ │City: Riyadh +2 ⌄│ Plan ⌄ │ Trips ↓ ⌄ │ Earned (SAR) ⌄ │   ⋯   │ 32
│ ─────────────────────────────────────────────┼──────────────────────────────┼────── │
│ ☐ │ Nora Al-Harbi  │ Riyadh          │ Weekly │       412 │       4,218.00 │   ⋯   │
│ ☐ │ Faisal Al-Otai…│ Riyadh          │ Monthly│       389 │       3,110.00 │   ⋯   │
│ ☐ │ DRV-0106       │ Riyadh          │ Weekly │         0 │           0.00 │   ⋯   │
│ └───── pinned ──────────────────────┘└── scrolled under ────┘└─ pinned ─┘           │
│  ◄════════════════════════════════════════════════════════════►                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
   Showing 1–25 of 312                                          [‹ Previous][Next ›]
```

`Captain` is implicitly pinned; `City` is operator-pinned and shows its filter inline; the toolbar
reads `⇅ Trips ↓` so the sort is legible even though `Trips` may scroll past; the chip row carries
the full, untruncated filter values; the kebab column is pinned at the inline-end.

### 10.3 The same card in Arabic

```
┌─ البطاقة ───────────────────────────────────────────────────────────────────────────┐
│    (⇅ Trips ↓) (▥) (▤) (🔍)              [+][Frozen][At risk][Expiring ≤ 7 d][All] │ 40
│ ─────────────────────────────────────────────────────────────────────────────────── │
│  Clear all                      [Add filter +][⌄ Status: Paused][⌄ City: Riyadh +2] │ 36
│ ─────────────────────────────────────────────────────────────────────────────────── │
│   ⋯   │ ⌄ Earned (SAR) │ ⌄ ↓ Trips │ ⌄ Plan │ ⌄ City: Riyadh +2 │ ⌄ Captain  │ ☐   │ 36
│ ──────┼────────────────────────────┼───────────────────────────────────────────────  │
│   ⋯   │       4,218.00 │       412 │ Weekly │           Riyadh │  Nora Al-Harbi │ ☐ │
│           └─ pinned ─┘└──── scrolled under ───┘└───────── pinned ──────────────┘     │
│                     ◄════════════════════════════════════════════════════════════►  │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

Rows are `--ev-row-h` 36 px in Arabic (`00-shell.md` §1.2). The numeral runs `4,218.00` and `412` do
**not** reorder; their cells align inline-end, which is now the physical left. The `↓` still points
down. The `⌄` still points down. The boundary hairline is now on the block's physical left.

---

## 11. Every state, drawn

Four base states plus every state this capability introduces.

### 11.1 Content — covered in §10.

### 11.2 Loading — two shapes, and the second one is new

**First load** (`status: 'loading'`, nothing rendered before): the existing `LoadingSkeleton`,
pattern P1 / P7 / P8 from the mode. The header row is part of the skeleton.

**Re-query** (`status` transitions `content → loading`, e.g. a filter was just applied): the
**header row persists**; only body rows are replaced by skeleton rows.

```
│ ☐ │ Captain      ⌄ │City: Riyadh ⌄│ Plan ⌄ │ Trips ↓ ⌄ │ Earned (SAR) ⌄ │   ⋯   │ header, LIVE
│ ─────────────────────────────────────────────────────────────────────────────── │
│ ▤ │ ▤▤▤▤▤▤▤▤▤▤▤▤▤▤ │ ▤▤▤▤▤▤▤▤▤▤▤▤ │ ▤▤▤▤▤▤ │ ▤▤▤▤▤▤▤▤▤ │ ▤▤▤▤▤▤▤▤▤▤▤▤▤▤ │   ▤   │
```

This is not polish. The operator applied that filter **from that header**, and their focus is on
that header's trigger. Replacing the header destroys focus mid-interaction, which §7.2 forbids and
§8.1's *"must not re-sort or remove rows while anything inside it has focus"* extends to. Horizontal
scroll position and pin state also survive the re-query for the same reason.

### 11.3 Error — unchanged

`ErrorState scope="card"`. The toolbar and chip row stay rendered above it (§11.2), so the operator
can change the query that failed. **The header row is not rendered in the error state**, so column
controls are unreachable — which is why the chip row above must be, and is, the escape route.

### 11.4 Empty, `first-run` — unchanged

`table.isFiltered === false`. Illustration + heading + body + action (R8). Nothing about column
controls appears, because there is no header row.

### 11.5 Empty, `no-match` — one grey sentence, and a better action

`table.isFiltered === true`. A column filter makes this true exactly like a toolbar filter, so the
branch is mechanical (**AC-37 / AC-38**, unchanged).

```
┌─ card ──────────────────────────────────────────────────────────────────────────────┐
│ [All][Active][Expiring ≤ 7 d][At risk][Frozen][+]              (🔍) (▤) (▥) (⇅)    │
│ ─────────────────────────────────────────────────────────────────────────────────── │
│ [City: Riyadh +2 ⌄][Add filter +]                                        Clear all  │
│ ─────────────────────────────────────────────────────────────────────────────────── │
│                                                                                     │
│                     No captains match these filters.                                │  --ev-text-2
│                             [Clear City filter]                                     │  plain button
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

One grey sentence. No illustration, no heading (**R8**). What changes is the **action**, which
`DataTable` now supplies rather than the page:

| Active constraints | Action label | Calls |
|---|---|---|
| Exactly one filter, no search query | `Clear {column} filter` | `removeFilter(field)` |
| More than one filter, or a query is set | `Clear all filters` | `clearAll()` |

`noMatch.action` stays on the props as an override; when omitted, the above is the default. That is
one fewer thing every page writes.

### 11.6 A column filter whose option list is empty

Inside the filter popover, not the table:

```
┌─ 240px ─────────────────┐
│  Filter by city          │
│ ──────────────────────── │
│  No options available    │   one grey sentence, --ev-text-2, R8
└──────────────────────────┘
```

### 11.7 A multi-select search that matches nothing

```
┌─ 240px ──────────────────┐
│  🔍 riy                  │
│ ───────────────────────── │
│  No options match that    │   deliberately does NOT quote the query:
│  search                   │   a Latin query inside an Arabic sentence
└───────────────────────────┘   is a bidi hazard for zero benefit
```

### 11.8 An inverted range — `From` greater than `To`

`columnFilterIssue` returns `'range-inverted'`, and **`toFilterSpec` throws if a control ignores
it**, because `between [500, 100]` silently matches nothing and reads to the operator as "no
results". So the control must never emit it. **The two kinds get different treatments, because only
one of them has a primary button to disable:**

**`date-range`** — has `Apply`. §3.2 is explicit: *"validate by disabling the primary button, not by
showing an error after submit."* So `Apply` is **disabled** while inverted, and no error text
appears. This is the treatment `columnFilter.ts` names in its own contract.

**`number-range`** — has no Apply and applies on debounce, so there is no primary to disable and
nothing to submit. Doing nothing silently would leave the operator watching a filter that never
takes. So: the filter is **not emitted**, the previous value stands, and an inline hint appears
beneath the pair — §4.4's inline error, `--ev-red` text, **not** a badge, not a banner, not a toast.

```
┌─ 240px ─────────────────┐
│  Trips                   │
│  From  [   500 ]         │
│  To    [   100 ]         │
│  Enter a To value that   │   imperative, names the fix (copy.md rule 4)
│  is higher than From     │
└──────────────────────────┘
```

This is not a violation of §3.2's "disable, don't error after submit": there is no submit. The rule
governs a control that has a primary button, and this one does not.

### 11.9 The unpinned region scrolled fully to the inline-end

Nothing special happens, deliberately. No "end of table" affordance, no fade, no arrow. What must
still be true, and is:

- the pinned block and the kebab region are in place, unchanged;
- the boundary hairlines are drawn on both;
- the sorted column may be entirely out of view — the toolbar reads `⇅ Trips ↓` (§5.2);
- filtered columns may be out of view — the chip row carries every one of them (§6.3);
- the R5a marker is still visible on every breached row (§7.1);
- the horizontal scrollbar is the position indicator, and it is the browser's, not a custom one.

### 11.10 Selection active — header controls are absent

**AC-46 is unchanged**: ticking any checkbox replaces the header row with `N selected`, column labels
absent. Therefore no header menus exist while selection is active. Column controls remain reachable
from the toolbar — `⇅` sort, `Add filter +`, `▥` columns — which is §7.5's third reason for the
columns popover existing.

```
│ ☑ │ 3 selected                                                                      │ 32
│ ─────────────────────────────────────────────────────────────────────────────────── │
```

Pinning and sorting **do not** clear selection: neither goes through `setFilter`. Filtering **does**
(**AC-25**, unchanged). Sorting resets the page to 1 while keeping the selected ids — existing
behaviour, restated so nobody reads it as a regression.

### 11.11 A pin refused by the width budget

```
│    Pin column                    │  ← disabled, aria-disabled, still focusable
│    Not enough room to pin        │     12px --ev-text-2, second line INSIDE the item
│    another column                │
```

Gated at render — `canPin` is the dry run and returns the same answer `pin` would. No toast, no
banner, no dialog, and the operator is never told no *after* clicking.

**There is no "pin demoted by a resize" state**, and that is deliberate: the budget is measured
against the fixed 976 px floor, not against the live viewport (§7.2), so a pin accepted at any width
remains valid at every width. An earlier draft of this spec drew a demotion-and-restoration
behaviour; it is deleted, because nothing can reach it.

### 11.12 A control the operator's role cannot use

Gated at render, disabled in place, reason available — never at commit (`00-shell.md` §11.2, §9.3).
This spec introduces no new permission, but a column whose data a role may not filter on declares
its filter as gated and its `Filter…` item renders disabled with the role reason on the second line.

---

## 12. Components

Every entry names its variant and its tone. All built from the 38 primitives already in
`src/components/ui/`. **No 39th is needed** — I checked each one, including that
`dropdown-menu.tsx` already exports `DropdownMenuRadioGroup`, `DropdownMenuRadioItem` and
`DropdownMenuCheckboxItem` (`:289–291`), and that `toggle.tsx` and `input-group.tsx` exist.

| Component | Built from | Variant | Tone | Governing rule |
|---|---|---|---|---|
| `ColumnHeaderButton` (D-12) | `button` | `start` \| `end` (alignment decides the caret side) | label `--ev-text-2`, `--ev-ink` when sorted or filtered | **D-6**, §3.3, R4 |
| `ColumnHeaderMenu` (D-13) | `dropdown-menu`, `separator` | 200 px, `--ev-shadow-2` | no red, ever | §5.4, §3.3 |
| `ColumnFilterPopover` (D-14) | `popover` | six kinds — `text` \| `select` \| `multi-select` \| `number-range` \| `date-range` \| `boolean`, the names in `src/lib/columnFilter.ts` | — | §6.1, §4.3, §5.4 |
| ↳ `text` | `input`, `input-group` | magnifier prefix | — | §4.2 |
| ↳ `select` | `radio-group`, `label` | `Any` first | — | §4.3 |
| ↳ `multi-select` | `checkbox`, `command` (> 8 options), `scroll-area` (> 12) | — | — | §4.3, §4.5 |
| ↳ `number-range` | `input`, `input-group`, `field` | `text-align: end`, `tabular-nums`; `unit: 'money'` takes the `SAR` inline-start prefix | inverted range: inline `--ev-red` hint, never a badge | §4.2, §8.3, R4 |
| ↳ `date-range` | the shell's existing date-range popover | preset column + 2 months, `Cancel` / `Apply` | inverted range: **`Apply` disabled**, no error text | `00-shell.md` §13.1, §3.2 |
| ↳ `boolean` | `radio-group` | `Any` · `{trueLabel}` · `{falseLabel}` | — | §4.3 |
| `ColumnLayoutPopover` (D-15) | `popover`, `checkbox`, `toggle`, `separator`, `button` | 240 px | pin toggle `aria-pressed` | §7.5, §3.1 |
| `SortControl` (D-16) | `button`, `popover`, `radio-group`, `separator` | `icon` \| `labelled` (when a sort is active) | — | §3.2, §5.2 |
| `PinnedRegion` (D-17) | — | driven by `useColumnPinning`; the boundary is on the `isLastPinned` **cell**, not a wrapper | `border-inline-*: 1px --ev-hairline`, **no elevation tier** | **§8.5**, §7.3 |
| `FilterChipRow` (D-03, extended) | `button`, `popover`, `badge` | now rendered by `DataTable`, not the page | chips neutral | §3.2, §6.3 |
| `DataTable` (D-01, extended) | as before + D-12…D-17 | `index` \| `ledger` \| `queue` | — | §9.4, §9 above |

**Restyle notes.** `toggle.tsx` arrives with Tailwind palette classes and a `size` scale that does
not include the 24 px this needs; strip both, use `--ev-bg2` for the pressed fill and `--ev-ink` for
the pressed label, and keep the §7.2 focus ring composed into a single `box-shadow` list if it
carries any elevation (`00-shell.md` §1.3, constraint 1 — dropping the white separator re-opens
**D20**). `command.tsx` ships its own empty-state string; replace it with the key in §13.

---

## 13. Copy — final, English and keys

Every string. Sentence case (`copy.md` rule 1). Buttons and menu items are verbs (rule 2). No
periods on menu items, buttons or badges; full sentences take one (rule 8, **R6**). No exclamation
marks, no emoji (rule 3). Errors are imperatives naming the fix (rule 4).

**`AR` stays empty.** It is **AC-74**'s own fixture: with an empty Arabic dictionary every key must
fall back to English and never render a raw key. Adding these keys to `EN` is this spec's
deliverable; translating them is a content decision, flagged as finding **F-14**.

### 13.1 Header and menu

| Key | English |
|---|---|
| `table.column.menu` | `Column options for {column}` |
| `table.column.filtered` | `{label}: {value}` |
| `table.column.sortedAsc` | `sorted ascending` |
| `table.column.sortedDesc` | `sorted descending` |
| `table.sort.textAsc` | `Sort A to Z` |
| `table.sort.textDesc` | `Sort Z to A` |
| `table.sort.numberAsc` | `Sort low to high` |
| `table.sort.numberDesc` | `Sort high to low` |
| `table.sort.dateAsc` | `Sort oldest first` |
| `table.sort.dateDesc` | `Sort newest first` |
| `table.sort.booleanAsc` | `Sort {trueLabel} first` |
| `table.sort.booleanDesc` | `Sort {falseLabel} first` |
| `table.sort.clear` | `Clear sort` |
| `table.sort.active` | `Sorted by {column}` |
| `table.filter.open` | `Filter…` |
| `table.filter.clear` | `Clear filter` |
| `table.pin.pin` | `Pin column` |
| `table.pin.unpin` | `Unpin column` |
| `table.pin.blocked` | `Not enough room to pin another column` |
| `table.column.hide` | `Hide column` |

There is no second refusal string. `PinRefusalReason` has exactly one value, `'exceeds-budget'`, and
the pixel figures it carries (`wouldBe`, `budget`) are never shown to an operator.

`table.sortAscending` and `table.sortDescending` — currently `'Oldest first'` / `'Newest first'`,
applied to every column regardless of type — are **removed**. See §5.4.

### 13.2 Filter popovers

| Key | English |
|---|---|
| `table.filter.title` | `Filter by {column}` |
| `table.filter.searchPlaceholder` | `Search {column}` |
| `table.filter.any` | `Any` |
| `table.filter.from` | `From` |
| `table.filter.to` | `To` |
| `table.filter.rangeError` | `Enter a To value that is higher than From` |
| `table.filter.noOptions` | `No options available` |
| `table.filter.noOptionsMatch` | `No options match that search` |
| `table.filter.optionSearch` | `Search options` |
| `table.filter.yes` | `Yes` |
| `table.filter.no` | `No` |
| `table.filter.apply` | `Apply` |
| `table.filter.cancel` | `Cancel` |

### 13.3 Filter summaries — one key each, no concatenation (**AC-75**)

| Key | English |
|---|---|
| `table.filter.summary.multi` | `{value} +{count}` |
| `table.filter.summary.range` | `{from}–{to}` |
| `table.filter.summary.rangeFrom` | `{from} and above` |
| `table.filter.summary.rangeTo` | `{to} and below` |

### 13.4 Columns popover

| Key | English |
|---|---|
| `table.columns.title` | `Columns` |
| `table.columns.toggleVisible` | `Show {column}` |
| `table.columns.togglePin` | `Pin {column}` |
| `table.columns.identityLocked` | `Always shown` |
| `table.columns.reset` | `Reset columns` |

### 13.5 Empty and error

| Key | English |
|---|---|
| `table.noMatch` | `No {resource} match these filters.` — **exists, unchanged** |
| `table.clearFilters` | `Clear all filters` — **exists, unchanged** |
| `table.clearOneFilter` | `Clear {column} filter` |

`table.noMatch` is a full sentence and keeps its period (**R6**). Both actions are buttons and take
none.

### 13.6 Announcements — `aria-live="polite"`, through `useAnnounce`

Sort, filter and pin are all colour-free and position-dependent, so §7.5 requires an announcement.
One line each, no period.

| Key | English |
|---|---|
| `table.announce.sortedAsc` | `Sorted by {column}, ascending` |
| `table.announce.sortedDesc` | `Sorted by {column}, descending` |
| `table.announce.sortCleared` | `Sort cleared` |
| `table.announce.filterApplied` | `{column} filtered` |
| `table.announce.filterRemoved` | `{column} filter removed` |
| `table.announce.allFiltersCleared` | `All filters cleared` |
| `table.announce.pinned` | `{column} pinned` |
| `table.announce.unpinned` | `{column} unpinned` |
| `table.announce.columnHidden` | `{column} hidden` |
| `table.announce.columnShown` | `{column} shown` |

**No toast fires for any of these.** R9/R10: a toast confirms a **mutation of an object**. Sorting a
view mutates nothing, and a toast per sort click would be intolerable in a console someone works all
day. The live region is the correct surface (`surfaces.md`).

### 13.7 Accessible names

| Element | Name |
|---|---|
| Header button | `table.column.menu` → `Column options for City` |
| Header button, sorted | + `aria-sort="ascending"` on the `th` — the native mechanism, not a label |
| Header button, filtered | the visible `City: Riyadh +2` is the name; the untruncated value goes in `aria-description` |
| Toolbar sort, icon-only | `table.sort` → `Sort` |
| Toolbar sort, labelled | `table.sort.active` → `Sorted by Trips` |
| Columns trigger | `table.columns.title` → `Columns` |
| Pin toggle in the columns popover | `table.columns.togglePin` + `aria-pressed` |

---

## 14. Interaction and keyboard

### 14.1 What opens where — extending `00-shell.md` §13.1

| Trigger | Result | Surface | Confirm? |
|---|---|---|---|
| Column header cell | column options | **dropdown-menu**, 200 px, `--ev-shadow-2` | no |
| `Filter…` | that column's filter | **popover** — menu closes first, never nested | no |
| Filter chip | the **same** popover | popover, stays open | no |
| `Add filter +` | filterable-column picker, then the same popover | popover | no |
| Toolbar `⇅` | field radio group + direction pair | popover, stays open, no Apply | no |
| Toolbar `▥` | visibility + pin per column | popover, 240 px | no |
| `Pin column` / `Unpin column` | re-render the pinned region | — | no |
| `Hide column` | re-render the columns | — | no |

Nothing here confirms, because nothing here mutates a record. **No modal appears anywhere in this
spec.**

> **Disambiguation.** `00-shell.md` §13.1 already has a row reading *"Popover pin — re-render the
> column, persist."* That is the **sub-tab navigation** popover's pin, an entirely different
> control. The two are unrelated and must not be merged.

### 14.2 The header row is one tab stop

Eight columns would otherwise add eight tab stops between the toolbar and the first row, every time,
on every table. **Roving tabindex**, exactly as the rail and the sub-tab column already do
(`00-shell.md` §13.2). `useRovingFocus` already exists and already takes
`orientation: 'horizontal'` and `direction`.

| Key | Where | Behaviour |
|---|---|---|
| `Tab` | into the table | one stop onto the header row, landing on the last-focused header |
| `←` `→` | header row | move between header buttons. **In `dir="rtl"`, `ArrowLeft` is the forward key** — `useRovingFocus` already implements this correctly (its doc comment describes it backwards; see **F-15**) |
| `Home` `End` | header row | first / last header |
| `Enter` `Space` `↓` | a header button | open its menu, focus the first item |
| `↑` `↓` | inside the menu | Radix's own roving; do not add a second |
| `Escape` | menu · filter popover · columns popover | close the **innermost**, restore focus to the control that opened it (**AC-66**) |
| `Escape` | filter popover opened from a header menu | returns to the **header trigger** — the menu is gone and is not reopened |
| `Tab` | inside a filter popover | moves between the popover's own controls; the popover is **not** trapped (non-scrimmed, §7.3.3) |
| `Shift+Tab` | first header | back to the toolbar |

**No new global shortcut.** The shell owns the keyboard map (`⌘K` and the rest); adding a
table-scoped chord here would collide with a namespace I do not own. Recorded as a deliberate
omission.

### 14.3 What is clickable

- The header cell — the whole cell, one button.
- Menu items, filter controls, chips, the chip `✕`, `Clear all`, the columns toggles.
- **Not** the row. `00-shell.md` §9.1 is unchanged: *"the whole row is not a click target — only the
  identity link is."*
- **Not** the boundary hairline. It is not a drag handle; column resizing is out of scope (§19,
  **F-16**).

### 14.4 Scroll

- One horizontal scroll container per table, inside the card, wrapping the `<table>`.
- The **toolbar, chip row, pagination and bulk-action bar sit outside it** — the bulk bar is
  positioned against the card, and if it were inside the scroll container it would slide off with
  the columns.
- Scrolling the table horizontally does not scroll the page, and vice versa: this is a fourth
  independent scroll context alongside the three in `00-shell.md` §1.1 (**AC-19** is unaffected —
  it names the rail, the sub-tab list and the content region, and this container is *inside* the
  content region).
- `overscroll-behavior-inline: contain` so a trackpad flick at the end of the table does not
  trigger a browser back-navigation gesture.

---

## 15. The column contract

The shape the engineer authors. Written here so the design is unambiguous, not as code to copy.

```
DataColumn<T> gains:

  dataType?   'text' | 'enum' | 'number' | 'money' | 'date' | 'boolean'
              Drives the sort labels (§5.4) and the default filter kind.
              Defaults to 'text'. `align: 'end'` implies 'number' unless stated.

  sortField?  string          — EXISTS. Presence = sortable. Absent = no sort block.
                                Never declared on a ledger column; never on a queue SLA column.

  filter?     ColumnFilterSpec — Presence = filterable. `kind` is ColumnFilterKind
              from src/lib/columnFilter.ts: text | select | multi-select |
              number-range | date-range | boolean.
              { kind, field?, options?, unit?, trueLabel?, falseLabel?, gated? }
              `field` defaults to `sortField ?? id`.

  width       number          — REQUIRED on any pinnable column, in CSS px.
                                `useColumnPinning.PinnableColumn` needs it, and a
                                column sized `auto` has no sticky offset until layout
                                has run — one frame of visible jump on every scroll.

  pinnable?   boolean         — Default true for data columns with a `width`; ignored
                                for index 0 (always pinned) and for the checkbox and
                                kebab columns. Never exposes the `'end'` edge.

  hideable?   boolean         — Default true. FORCED false for column index 0.
                                FORCED false in `ledger` mode (§8.3.3 fixes the column set).

DataTableProps<T> changes:

  filterRow      REMOVED. DataTable renders the chip row itself.
  extraFilters?  ColumnFilterSpec[] — filters bound to no visible column (§6.4).
  noMatch.action now OPTIONAL with a component-supplied default (§11.5).
```

Nothing about `AnyTable<T>` changes. No new hook member is required for sort or filter —
`setSortField`, `setSortDirection`, `clearSort`, `setFilter`, `removeFilter`, `clearAll` all exist.

**Pin state already has its home**: `src/hooks/useColumnPinning.ts`, built in parallel with this
spec, returning `pins`, `start`, `end`, `pinnedColumn`, `isPinned`, `isLastPinned`, `pin`, `unpin`,
`togglePin`, `clearPins`, `canPin`, `lastRefusal` and the four size figures. It is correctly **not**
in `useIndexTable`: pins never reach `QueryParams`, and putting them there would force the `ledger`
overload to carry them too.

**Column visibility has no home yet.** It is the one piece of §7.5's columns popover that nothing
implements. It is the same shape of state as pinning, it belongs beside it, and it must feed
`useColumnPinning`'s `columns` — which takes *"the ordered, currently **visible** columns"*, so
hiding a column has to remove it from that list, and the hook already drops the now-stale pin rather
than throwing. Named in the handoff.

**Filter value → wire is already solved**: `src/lib/columnFilter.ts` — `ColumnFilterValue`,
`columnFilterIssue`, `toFilterSpec`, `formatColumnFilterBounds`. The popovers own the
`ColumnFilterValue`; `toFilterSpec` turns it into the `FilterSpec` that goes to `setFilter`, or
`null`, which means `removeFilter`.

---

## 16. Deviations

Each names the rule it suspends. A deviation that does not name its rule is a defect.

| # | What | Rule suspended | Why |
|---:|---|---|---|
| 1 | **Header cells are interactive** — one menu trigger per cell | **New §6.2 D-6** (§17.1), suspending §3.1's *"Exactly one header MUST show the active sort indicator; the rest MUST show no resting affordance"* and the derived AC-45 clause *"headers are not interactive anywhere in the product"* | The business owner asked for per-column controls in the component. The indicator half of AC-45 survives verbatim; the inertness half is replaced by a stronger, type-level guarantee (§9). |
| 2 | **A resting `⌄` on every controllable header** | §3.1 — *"the rest MUST show no resting affordance"* | Named inside D-6. Hover-only capability does not exist for a keyboard operator (§7.2, AC-68's precedent). |
| 3 | **The sort indicator is an arrow, not a chevron** | §3.1's `[observed]` chevron | Named inside D-6. §1.5 and §9.1 row 9 reserve the trailing caret for menu-openers; the two glyphs cannot both mean sort. §3.2's direction pair already uses arrows `[observed]`. |
| 4 | **Column pinning on every dense table** | none — **new §8.5** (§17.2) **generalises an existing MUST** | §2.5 already requires *"a frozen identity column"* for bulk grids (`DESIGN.md:1200`) and says nothing about any other table. Shopify does it in the bulk editor `[observed]`; the legacy app does it with an RTL defect `[code]`. This is a §8 addition, not an exception. |
| 5 | **The pinned boundary is a hairline, not an elevation tier** | none — **§1.3's closed set of three is intact** | Tier none is a legitimate row in §1.3's own table. The set is not extended, no fourth token appears, no x-offset is introduced. §7.3. |
| 6 | **The columns control renders below 7 columns** | §9.1 — *"more than ~6 columns ⇒ a column-visibility control"* | Widened, not suspended: `> 6` **or** any column pinnable/hideable. Without it, pinning is unreachable on a five-column table. |
| 7 | **The toolbar sort control grows a label when a sort is active** | none — §3.2's popover shape is untouched | §7.5: with horizontal scroll, a header caret can leave the viewport, so it can no longer be the only carrier. |
| 8 | **The header row survives a re-query** | none — §11.3's *"one skeleton variant per pattern"* is a variant rule, not a shape rule | §7.2 and §8.1: destroying the element that has focus, mid-interaction, is a defect. |

**No new ruling is created.** Every collision above is between §1–§5 and Eyvar's needs, and the
precedence ladder already settles those with a §6.2 row. `docs/ref/rulings.md` is explicit that
improvising a twentieth ruling is the wrong move; **R1–R19 are untouched**.

---

## 17. The `DESIGN.md` amendments

Two edits, both to partials. **`DESIGN.md` is generated and is never hand-edited**; the rebuild is
`python docs/06-design-reference/build-design.py`, run as part of this step.

### 17.1 `06-eyvar-mapping.md` §6.2 — new **D-6**

Adds one row to the sanctioned-deviations table, naming the three §3.1 / §1.5 clauses it suspends
and the glyph assignment that follows. Full text is in the partial.

### 17.2 `08-eyvar-patterns.md` — new **§8.5**

*"Dense tables: per-column controls and column pinning."* Written with §8's evidence discipline —
`[observed]` for the two bulk-editor frames and the measured hairline, `[code]` for
`eyvar_ops_panel_v40_fixed.html:751` / `:3555` / `:147`, `[ruling]` for everything else — a
worked-example wireframe, and a **Rules** block in the same voice as §8.3 and §8.4.

The section-8 preamble is corrected from *"Four of its surface types"* to *"Five"*, with a row for
dense wide tables, and the *"Standing rulings this section touches"* paragraph gains a sentence
noting that §8.5 introduces **no new ruling** and works through **D-6** instead.

### 17.3 The ref files that must move in the same commit

`docs/ref/README.md` says a ref file not updated alongside `DESIGN.md` *"becomes a lie."* Two need a
line each, and **I am not the owner of either**:

- `docs/ref/components.md` — the `Sort, date range, colour → popover` row needs `column filter`
  added, and the `table` row needs a pointer to §8.5.
- `docs/ref/patterns.md` — the "Pattern-specific traps" list should gain: *"A ledger header may
  filter and pin. It may never sort (§8.3.3, AC-48)."*

Raised as finding **F-17**, in the same shape as the shell spec's **F-5**.

---

## 18. Acceptance criteria — AC-80 … AC-116

Numbered from AC-80 so they do not collide with the foundation spec's 79.

### The header control

| # | Criterion |
|---|---|
| **AC-80** | A header cell for a column declaring at least one control renders **exactly one** interactive element: a `button` with `aria-haspopup="menu"` and `aria-expanded`. A cell whose column declares none renders **no** interactive element. Never two. |
| **AC-81** | The `⌄` menu caret renders **at rest**, without hover and without focus, on every header that has a menu. |
| **AC-82** | The header button takes `--ev-bg2` and `--ev-ink` on `:hover`, on `:focus-visible`, and while its menu is open — the AC-68 two-step. It is never `opacity: 0` and never hover-only. |
| **AC-83** | The `:focus-visible` ring is drawn **inset** and is fully visible when the header sits inside a pinned region with `overflow` clipping. |
| **AC-84** | On a column with `align: 'end'`, the label is flush to the cell's inline-end and the caret sits on the label's inline-start, so header and value share one edge (**R4**, **AC-44** upheld). |
| **AC-85** | The header row is **one tab stop**. `←` / `→` move between header buttons; in `dir="rtl"` `ArrowLeft` is the forward key. `Home` / `End` reach the first and last. |

### Sort

| # | Criterion |
|---|---|
| **AC-86** | At most **one** column carries a sort arrow, at any time, in any mode. **AC-45's indicator clause upheld.** |
| **AC-87** | The sort indicator is `↑` or `↓`. **No header renders a chevron as a sort indicator**, and no control other than a menu-opener renders a `⌄`. |
| **AC-88** | Sort direction labels come from the column's `dataType`. A `number` column never renders `Oldest first`; a `date` column never renders `Sort A to Z`. |
| **AC-89** | The header menu's direction pair and the toolbar popover write the **same** `table.sort`. Setting sort from either updates the caret on the same single column. |
| **AC-90** | `Clear sort` renders only on the column that is currently sorted, and calls `table.clearSort()`. |
| **AC-91** | While `table.sort !== null`, the toolbar sort control renders as a **labelled** button carrying the sorted column's header text and its direction arrow. While `table.sort === null` it is icon-only with the accessible name `Sort`. Neither shape shifts the toolbar vertically. |
| **AC-92** | The `th` of the sorted column carries `aria-sort="ascending"` or `"descending"`; no other `th` carries `aria-sort`. |

### Filter

| # | Criterion |
|---|---|
| **AC-93** | A column filter produces **exactly one** `FilterSpec` in `table.filters`, keyed on the column's filter field. A column can never hold two chips. |
| **AC-94** | Applying a column filter sets `table.isFiltered`, resets the page to 1 and clears selection (**AC-25**), identically to a toolbar filter. **AC-37 / AC-38 keep choosing `no-match` over `first-run` with no change.** |
| **AC-95** | A column filter renders a chip in the chip row with the same `{label}: {value}` string the header shows. Dismissing the chip clears the header state; `Clear all` clears every header. |
| **AC-96** | A filtered column's header renders `{label}: {value}` at `--ev-ink` / 600. The summary **may** truncate; the chip **may not**. The value substring is `<bdi>`-isolated. |
| **AC-97** | `Filter…` **closes the menu** and opens a popover. A text input is never rendered inside a `dropdown-menu`. |
| **AC-98** | Only `date-range` has `Cancel` / `Apply`. `text`, `select`, `multi-select`, `number-range` and `boolean` apply without an Apply button and keep the popover open. |
| **AC-99** | `text` and `number-range` filters debounce at 250 ms before calling `setFilter`; a keystroke does not reset the page. |
| **AC-100** | An inverted range never reaches `toFilterSpec`. `date-range` **disables `Apply`** (§3.2) with no error text; `number-range`, which has no primary to disable, emits nothing and shows an inline hint, leaving the previous value in force. |
| **AC-101** | A `number-range` filter with `unit: 'money'` renders the `SAR` **inline-start in-field prefix** (§4.2, inputs) and converts major units to halalas before emitting, while the column header keeps `(SAR)` and the cells stay bare (§8.3, output). |
| **AC-102** | `Add filter +` and the header reach the **same** popover component for a given column. |
| **AC-103** | `filterRow` is gone from `DataTableProps`. No screen constructs a chip row. |

### Pin

| # | Criterion |
|---|---|
| **AC-104** | The R5a marker lane, the selection checkbox and column index 0 are pinned to the inline-start **implicitly and permanently**. Column index 0 is never hideable and never unpinnable. This satisfies §2.5's existing MUST (`DESIGN.md:1200`, *"a frozen identity column"*) on every dense table, not only the bulk grid. |
| **AC-104a** | The pinned region renders in **column-declaration order**, never in the order the operator pinned. Pinning a second column does not move the first. |
| **AC-105** | The row kebab column is pinned to the **inline-end** implicitly and permanently, in `index` and `queue` modes. |
| **AC-106** | On a queue, the R5a leading-edge marker is visible on every breached row **at every horizontal scroll offset**. **AC-50's three parts survive scrolling.** |
| **AC-107** | The pinned region may not exceed **50 %** of the table's inline size **at the 976 px floor** — one budget, no count cap. Operator pinning at the inline-end is never offered: no menu item and no columns-popover toggle passes `edge: 'end'`. |
| **AC-108** | When a pin would breach the budget, `Pin column` renders **disabled in place** with its reason on a second line inside the item, driven by `canPin`. The reason is never a tooltip, never appears only after a click, and never shows a pixel figure. |
| **AC-109** | Resizing the viewport, at any width, **changes no pin**. Because the budget is measured against the fixed floor and never against a live measurement, no pin is ever demoted, and no restoration path exists to test. |
| **AC-110** | The **last pinned column at each edge** (`isLastPinned`) carries `border-inline-end` — or `border-inline-start` at the inline-end edge — of 1 px `--ev-hairline`, and **no `box-shadow` of any kind**. It renders only while `scrollWidth > clientWidth`. `grep -rn "box-shadow" src/components/` returns nothing new. |
| **AC-111** | Pinned cells are opaque: they take the row's own background, including `--ev-bg2` on row hover. Scrolling content never shows through. |
| **AC-112** | The bulk-action bar, toolbar, chip row and pagination are **outside** the horizontal scroll container and do not move when the table scrolls. |

### Modes

| # | Criterion |
|---|---|
| **AC-113** | A `ledger` header menu offers `Filter…` and `Pin column` and **never** a sort item, `Clear sort` or `Hide column`. This is enforced by `LedgerTable` having no sort members at all — **AC-48 unchanged** — not by a runtime branch. |
| **AC-114** | A `queue`'s SLA column declares no `sortField`, so §8.4's fixed order (breached first, remaining time ascending, `No clock` last) cannot be overridden by an operator. |
| **AC-115** | While selection is active, no header menu renders (**AC-46** unchanged), and sort, filter and columns remain reachable from the toolbar. |
| **AC-116** | Switching `dir` to `rtl` changes **neither which columns are pinned nor their order**. The inline-start block renders against the physical right edge, the inline-end block against the physical left, the boundary hairline follows each, and the horizontal scroll offset resets to the inline-start. No `left`, `right`, `margin-left`, `margin-right` or `translateX` declaration appears in any component in this spec, and no component reads `dir` to decide a pin — the mirroring is the browser's, done once, from `inset-inline-*`. |

---

## 19. Findings — raised, not decided by me

| # | Finding | Owner | Blocks |
|---:|---|---|---|
| **F-12** | **`eyvar_ops_panel_v40_fixed.html:751` and `:3555` are a live RTL defect.** A `position:sticky;right:0` pinned Actions column with a `-4px 0 6px -4px` shadow, and **no `[dir="rtl"]` counterpart anywhere in the file**. In Arabic the column freezes to the wrong edge and the shadow points the wrong way. Same family as the three §9.1 already lists. **Recommend adding it to `docs/ref/defects.md` and §6.3.** I do not own either file | coordinator | nothing; the rebuild does not reproduce it |
| **F-13** | **Multi-sort is out of scope and needs a product decision, not a component change.** It changes `SortSpec`, `QueryParams`, every client and `src/data/mock/query.ts`. §5.1 recommends single-sort permanently; if the business owner wants multi-sort, it comes back as a spec with a transport change attached | product-owner | nothing today |
| **F-14** | **`AR` is still empty and this spec adds ~45 keys to it.** That is deliberate (**AC-74**'s fixture) but the gap grows. `Sort A to Z` in particular needs an Arabic **collation** phrase, not a transliteration | business owner | nothing; recorded |
| **F-15** | **`useRovingFocus`'s doc comment describes its RTL behaviour backwards.** The prose says *"`ArrowRight` must move toward the end of the list, and in Arabic the end is on the physical left"*; the implementation correctly makes `ArrowLeft` the forward key in RTL (`:87–88`). The **code is right**; the comment will mislead the next reader | utilities-engineer | nothing; one comment |
| **F-16** | **Column resizing was not requested and is not specified.** If it is wanted, the boundary hairline is the obvious drag target and that interacts with the 50 % pin guard in a way that needs designing, not improvising | product-owner | nothing today |
| **F-17** | **Two `docs/ref/` files will be stale the moment `DESIGN.md` is rebuilt** — `components.md` and `patterns.md`. One line each, §17.3. I am not permitted to edit them | coordinator | consistency of `docs/ref/` |
| **F-18** | **Q1 (persistence) — this spec adds `pinned` and `hidden` to the list of homeless state.** In memory today, same recorded gap as **F-7** / **AC-33**. §7.6 states the exact stored shape so answering Q1 is one file | engineering lead | **AC-33** |
| **F-19** | **`00-shell.md` §12 lists `DataTable` as built from `table` + TanStack; the shipped component is hand-rolled.** Nothing in this spec requires TanStack, and pinning is straightforward either way — but the component table and the code disagree and someone will reconcile them in the wrong direction | frontend-engineer | nothing; a doc/code mismatch |

---

## 20. Handoff

### To **frontend-engineer**

**Artifact:** this file. **Partials edited and `DESIGN.md` rebuilt** — §6.2 gains **D-6**,
§8 gains **§8.5**.

**Two helpers already exist and you should build on them, not beside them:**
`src/hooks/useColumnPinning.ts` (pins, offsets, `insetProperty`, `isLastPinned`, `canPin`, the
budget) and `src/lib/columnFilter.ts` (`ColumnFilterValue`, `columnFilterIssue`, `toFilterSpec`,
`formatColumnFilterBounds`). The spec is written to their vocabulary.

Build order that keeps the four states honest:

1. `PinnedRegion` (D-17) over `useColumnPinning` + the horizontal scroll container. Get **AC-116**
   and **AC-106** right first; they are the two that are expensive to retrofit.
2. `ColumnHeaderButton` (D-12) + `ColumnHeaderMenu` (D-13), sort only.
3. `ColumnFilterPopover` (D-14), all six kinds, over `toFilterSpec`.
4. `SortControl` (D-16) and `ColumnLayoutPopover` (D-15).
5. Delete `filterRow`; move the chip row inside `DataTable`.

**Decisions you must make, and my recommendation for each:**

- **`status: 'refreshing'` versus an internal ref** for keeping the header alive across a re-query
  (§11.2). I recommend the **internal ref** — `DataTable` remembers that it previously rendered
  content — because a new `status` value means every page changes, which is the opposite of the
  request. Your call; either satisfies the AC.
- **Do not compute sticky offsets yourself.** `useColumnPinning` returns `offset` and
  `insetProperty` per pinned column, already accumulated and already logical. Write
  `style[insetProperty] = offset`. **Never write `left`.** This is also why a pinnable column must
  declare a `width` (§15): a column sized `auto` has no offset until layout has run.
- **`Math.abs(el.scrollLeft) > 0`**, always. A raw `scrollLeft > 0` test is silently false in RTL on
  every current engine (§8.3). This drives the boundary hairline, which goes on the
  `isLastPinned` **cell**, not on a wrapper.
- The **filter popovers own their `ColumnFilterValue` and debounce locally** before calling
  `toFilterSpec` → `table.setFilter` (or `removeFilter` on `null`). `useIndexTable` debounces
  `query` but not `filters`, and `setFilter` resets page and selection synchronously.
- **Never pass `edge: 'end'` from an operator control.** `PinEdge` supports it because the kebab
  column needs it; no menu item and no columns toggle may offer it (**AC-107**).

**Do not:** run `shadcn add` — `components.json` is frozen and all 38 primitives needed are present,
including `DropdownMenuRadioGroup` / `RadioItem` / `CheckboxItem` (`dropdown-menu.tsx:289–291`),
`toggle.tsx` and `input-group.tsx`. Do not add a `box-shadow` anywhere in the pinned region
(**AC-110**). Do not put an `<input>` inside a `dropdown-menu` (**AC-97**).

### To **utilities-engineer**

**You built `useColumnPinning` and `columnFilter` in parallel with this spec, and they are better
than my first draft on three points. I changed the spec, not your files.** Adopted verbatim:

- **Declaration order, not pin order** (§7.1). Your reasoning — pinning is a freeze, not a reorder —
  is right, and my draft's "pin order" would have shuffled a pinned column when a second was pinned.
- **The budget is measured against a fixed floor, never a live measurement** (§7.2). That deletes an
  entire state I had drawn: pins can never be demoted by a resize, because they were never granted
  beyond the floor budget. **AC-109** now asserts the absence.
- **One refusal reason.** `'exceeds-budget'` is the whole set, so my "cap: 3 columns" is dropped and
  `table.pin.blockedCap` is gone. One guard, measured.

Also adopted: `ColumnFilterKind`'s six names, `isLastPinned` as the boundary carrier (the hairline
is on a **cell**, not a wrapper), integer bounds in halalas, and `in` for a single multi-select.

**Three things still open, and the first is the real gap:**

1. **Column visibility has no home.** `useColumnPinning` takes *"the ordered, currently visible
   columns"*, so something must own `hidden` and produce that list. It is the same shape of state,
   it belongs beside pinning, and hiding a pinned column must drop its pin — which your hook already
   does gracefully (stale ids dropped, not thrown). §7.5 and §15.
2. **One divergence I need you to check.** `columnFilterIssue`'s doc says a control *"disables its
   `Apply` on a non-`null` return."* That is right for `date-range`, which has an `Apply` — but
   `number-range` has none (it applies on debounce, §6.1), so there is no primary to disable. §11.8
   splits them: `date-range` disables `Apply` with no error text; `number-range` emits nothing and
   shows an inline hint. If you think `number-range` should grow an `Apply` instead, say so — that
   is a design change and I will take it, but the two must not both be true.
3. **~44 dictionary keys** in §13, plus two **removals**: `table.sortAscending` and
   `table.sortDescending` are date labels (`Oldest first` / `Newest first`) applied to every column
   and are wrong on a `Trips` column (§5.4). `AR` stays empty — **AC-74**'s fixture.

Minor: `useRovingFocus`'s doc comment contradicts its own implementation on RTL arrow keys
(**F-15**). The code is right; the comment will mislead the next reader.

### To **product-owner**

- **F-13** — multi-sort: I recommend single-sort permanently, and it is a transport change if you
  disagree.
- **F-16** — column resizing was not requested and is not specified.
- **AC-45 is amended, not deleted.** Its indicator clause survives verbatim as **AC-86**; its
  "headers are not interactive" clause is superseded by **D-6** and replaced by the stronger
  type-level guarantee in **AC-113**. **AC-48 is untouched.**

### To **the coordinator**

- `DESIGN.md` has been rebuilt from the partials as part of this step.
- **F-17** — `docs/ref/components.md` and `docs/ref/patterns.md` each need one line, in the same
  commit, or they become lies. §17.3 has the exact text.
- **F-12** — a real legacy RTL defect found while gathering evidence; it belongs in
  `docs/ref/defects.md` and §6.3, and I own neither.
