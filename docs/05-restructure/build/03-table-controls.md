# 03 — Table controls: per-column sort, filter and pin

**Owner:** frontend-engineer · **Built from:** `design/01-table-controls.md` (AC-80…AC-116),
`DESIGN.md` §8.5 and §6.2 **D-6**, `build/00-utilities.md` §2 and §9 ·
**Applied to:** Operations › People, all four views · **Consumers:** qa-engineer,
visual-qa-engineer

> *"make the sorting and pin in the table in the actual tab header"* ·
> *"for filters I want filters for everything in the table, whether it's text filters, or
> dropdowns."*

Mid-build the coordinator landed the Navattic re-skin (`design/03-navattic-language.md`) and
the match audit (`docs/02-verification/people-match.md`). Fix-list items **6, 7, 9** and **11**,
the labelled toolbar (§4.3) and three audit findings are built here too; §7 below is that
ledger, kept separate so the two reviews do not have to be untangled.

---

## 1. What was built

Nine new files under `src/components/table/`, plus a rewritten `DataTable`. The screen went
the other way: **`PeopleTable` lost 120 lines and gained nothing**, which is the test of
whether *"no need to redo for everypage"* actually happened.

| File | What it is |
|---|---|
| `src/components/table/columns.ts` | the column contract (§15) and the pure helpers: `filterFieldOf`, `sortLabel`, `columnFilterValueOf`, `summariseColumnFilter`, `filterEntries`, `filteredLabelParts`, `halalasToMajorInput` |
| `src/components/table/pinning.ts` | `pinnedStyle`, `useTableOverflow`, `scrolledInline`, the two lane ids and `LANE_WIDTH_PX` |
| `src/components/table/ColumnHeaderCell.tsx` | D-12 + D-13 — the one-button header and its menu |
| `src/components/table/ColumnFilterControl.tsx` | D-14 — all six filter kinds |
| `src/components/table/ColumnLayoutPopover.tsx` | D-15 — visibility + pin, the second entry point |
| `src/components/table/SortControl.tsx` | D-16 — the toolbar sort control, labelled when active |
| `src/components/table/FilterChipRow.tsx` | D-03 extended — the chip strip and `Add filter` |
| `src/components/table/IndexToolbar.tsx` | D-02, moved out of the screen and made generic |
| `src/components/table/tableControls.test.tsx` | 16 tests — the mechanical invariants |
| `src/components/DataTable.tsx` | rewritten: owns the toolbar, the strip, visibility, pinning |
| `src/components/ui/table.tsx` | `containerRef`, the vertical column rules, the header tint, the row-height revert |
| `src/screens/operations/people/*` | four views: `width`, `dataType`, `filter` per column; `extraFilters`; `sortFields` / `filterFields` deleted |

**Deleted:** `src/screens/operations/people/IndexToolbar.tsx` and
`src/screens/operations/people/FilterChipRow.tsx` — 560 lines of screen-owned control code.
`filterRow?: ReactNode` is gone from `DataTableProps` (**AC-103**).

### 1.1 The composition, as specified

```ts
const visibility = useColumnVisibility({ columns, tableId, view })
const pins       = useColumnPinning({ columns: pinColumns, tableId, view })
```

Both hooks take the **same `tableId` and `view`**, from one pair of props on `DataTable`, so
per-view state cannot diverge. Pinning stays out of `useIndexTable`: nothing here reaches
`params`, and the test asserting that `params` holds exactly `page`, `pageSize`, `q`, `sort`,
`filters`, `view` still passes untouched.

`toFilterSpec` is the only path from a control to the table. It returns a `FilterSpec` or
`null`, and `null` means `removeFilter` — that pairing is the whole contract, and it is why
`table.isFiltered` and the AC-37/38 empty-state choice needed no amendment at all.

---

## 2. The two decisions that were mine

### 2.1 Where the sticky axes cross

Three stacking levels, no more:

| Level | What |
|---|---|
| `z-30` | a pinned column's own header — the **corner cell**, sticky on both axes |
| `z-20` | the sticky header row |
| `z-10` | pinned **body** cells |

Separation at both boundaries is a **hairline, never a shadow**. `grep -rn "box-shadow" src/components/`
returns nothing new; the only two occurrences in my files are the comments in `pinning.ts`
saying why (**AC-110**).

**Elevation sits on the card**, tier 1 from `card.tsx`, and on the floating bulk bar, tier 2.
No cell carries any.

**One thing did not survive contact and is worth recording:** the *vertical* sticky is inert
today. The scroll container is `overflow-x: auto`, which computes `overflow-y` to `auto`, and
it has no height constraint — so it never scrolls vertically and `top: 0` has nothing to stick
to. The declarations are correct and cost nothing; they will start working the day the table
body gets a bounded height. The **z-order is what is load-bearing now**, and that is live.

### 2.2 `tableId`, and where the boundary lives

`tableId` is a required prop on `DataTable`; People passes `"operations-people"` with
`view={activeTab}`. `view` defaults to `table.view` but People overrides it, because its four
tabs mount **different column sets** — sharing one key would let the Captains hidden set be
read as the Riders one.

The boundary hairline is on the **cell**, from `useColumnPinning.isLast`, never on a wrapper —
so at the inline-end edge it lands on the first-declared column and not on the wrong side of
the kebab.

It moved from a class to an inline style during item 6, and the reason is worth writing down:
`table.tsx` now draws a rule between every pair of columns via
`[&_tr>*:not(:last-child)]:border-(--ev-hairline2)`, an arbitrary-variant selector whose
specificity beats any plain utility. A `border-e border-border` class on the pinned cell would
have **lost the cascade silently and looked correct in the diff**. The value is still a token
(`var(--ev-hairline)`); nothing raw enters.

---

## 3. AC verdicts — AC-80 … AC-116

`pass` = built and verified (test, measurement or capture). `pass (read)` = built and correct
on reading, not independently verified — qa-engineer's call. Anything else is stated.

### The header control

| # | Verdict | Evidence |
|---|---|---|
| **AC-80** | **pass** | test *"renders exactly ONE interactive element per controllable header"* — `aria-haspopup="menu"`, `aria-expanded`, and `thead button[aria-haspopup=menu]` is exactly 3 on a 3-controllable-column table. A column offering nothing renders no button: test *"renders NO interactive element in a header whose column declares nothing"*. |
| **AC-81** | **pass** | test *"renders the menu caret AT REST"*; `tc-rest-1440.png` shows a `⌄` on every controllable header with no pointer in the frame. |
| **AC-82** | **pass (read)** | `hover:bg-accent hover:text-foreground`, `focus-visible:bg-accent focus-visible:text-foreground`, `aria-expanded:bg-accent aria-expanded:text-foreground`. No `opacity-0` anywhere — asserted as an absence in the AC-81 test. |
| **AC-83** | **pass** | `focus-visible:ring-inset` compiles: `dist` carries `.ring-inset{--tw-ring-inset:inset}` and `.ring-2{--tw-ring-shadow:var(--tw-ring-inset,)…}`. Visible in `tc-pinned-scrolled-1440.png` on the focused `Rating` header inside the scroll region. |
| **AC-84** | **pass** | `tc-rest-1440.png`: on `Rating`, `Trips`, `Earned (SAR)` the caret sits on the label's inline-start and the label is flush to the cell's inline-end, sharing the value's edge. |
| **AC-85** | **partial — see §6, F-1** | one tab stop and `←` `→` / `Home` / `End` are wired through `useRovingFocus({ orientation: 'horizontal', direction })`. **Not verified by test**, and the RTL half is only as correct as `useRovingFocus` (its doc comment describes its own behaviour backwards — F-15, still open). |

### Sort

| # | Verdict | Evidence |
|---|---|---|
| **AC-86** | **pass** | test *"puts `aria-sort` on exactly one `th`"* — one sort value, one arrow, and it is the same `table.sort` from both entry points. |
| **AC-87** | **pass** | the indicator is `↑` / `↓`; `ChevronDown` appears only on menu-openers. |
| **AC-88** | **pass** | test *"labels the direction pair from the column dataType"* — `Trips` offers `Sort low to high`, and `Oldest first` is not in the dictionary any more. |
| **AC-89** | **pass (read)** | both triggers call `sorting.setSortField` / `setSortDirection` on one object. |
| **AC-90** | **pass** | `Clear sort` renders only when `isSorted`. |
| **AC-91** | **pass** | `tc-rest-1440.png` (`⇅ Sort ⌄`) versus `tc-sorted-1440.png` (`⇅ Trips ↓ ⌄`); both 32px, same row, no vertical shift. |
| **AC-92** | **pass** | same test as AC-86: `descending` on one `th`, nothing on the rest. |

### Filter

| # | Verdict | Evidence |
|---|---|---|
| **AC-93** | **pass** | one `FilterSpec` keyed on `filterFieldOf(column)`; `useFilters.setFilter` replaces by field. |
| **AC-94** | **pass (read)** | every commit goes through `table.setFilter`, so AC-25's page reset and selection clear are the hook's, unchanged. |
| **AC-95** | **pass** | test *"writes one chip and one header summary, from the same string"*. Both call `summariseColumnFilter`; there is no second formatter to drift. |
| **AC-96** | **pass** | header: `truncate` + `font-semibold text-foreground`; chip: `whitespace-normal`. Value wrapped in `<bdi>`, asserted in the same test. |
| **AC-97** | **pass** | test *"never renders a text input inside a menu"*. **This one bit:** opening the popover from `onSelect` produced a menu item that visibly did nothing — a modal `dropdown-menu` dismisses a popover mounted in the same tick, on its way out. It now opens in the menu's `onCloseAutoFocus`. |
| **AC-98** | **pass (read)** | only `DateRangeFilter` renders `Cancel` / `Apply`. |
| **AC-99** | **pass (read)** | `useDebouncedCommit` at `DEFAULT_DEBOUNCE_MS`, with a flush on unmount so Escape does not discard the last 250 ms. |
| **AC-100** | **pass (read)** | `date-range` disables `Apply` and shows no error text; `number-range` emits nothing and renders an inline `text-destructive` hint. `tc-filter-range-inverted-1280.png`. |
| **AC-101** | **pass** | `tc-filter-money-1280.png` — the `Wallet (SAR)` filter renders the `SAR` in-field inline-start prefix and converts through `parseMoneyInput`, while the column header keeps `(SAR)` and the cells stay bare. |
| **AC-102** | **pass** | `ColumnFilterControl` is one component; the header, the chip and `Add filter` are three shells around it. |
| **AC-103** | **pass** | `filterRow` is gone; `grep -rn filterRow src` returns nothing. |

### Pin

| # | Verdict | Evidence |
|---|---|---|
| **AC-104** | **pass, with a precondition now explicit** | test *"pins it, at the checkbox lane width"* — `insetInlineStart: 40px`, `left: ''`. Column index 0 is locked **only when it declares a width** — see §7.1, the crash. |
| **AC-104a** | **pass** | offsets come from `useColumnPinning` in declaration order; nothing reorders the DOM. Measured live: checkbox x=321 w=40, captain x=361 w=176, status x=537 w=128 — each abutting the last. |
| **AC-105** | **pass** | `KEBAB_COLUMN_ID` carries `lockedEdge: 'end'`; `tc-rtl-scrolled-1280.png` shows it at the physical left in Arabic. |
| **AC-106** | **pass (read)** | the R5a marker is drawn inside the identity cell, which is locked, so it cannot scroll away. `tc-queue-scrolled-1440.png`. Not asserted by a test. |
| **AC-107** | **pass** | `tc-pin-refused-1440.png` — two pins accepted (128 + 120 over a 216 locked block), the third refused against the 488 budget. No operator control passes `edge: 'end'`: `togglePin` and `canPinColumn` both hard-code `'start'`. |
| **AC-108** | **pass** | same capture: `Pin column` disabled in place with `Not enough room to pin another column` as a second line inside the item. No tooltip, no pixel figure. |
| **AC-109** | **pass (structural)** | the budget is `useColumnPinning`'s floor; `useTableOverflow` measures only whether a 1px border renders. No code path demotes a pin, so there is none to test. |
| **AC-110** | **pass** | `border-inline-*`, 1px, `var(--ev-hairline)`, only while overflowing. No `box-shadow`. |
| **AC-111** | **pass** | pinned cells carry `bg-card group-hover/row:bg-accent group-focus-within/row:bg-accent group-data-[state=selected]/row:bg-accent`. **One 1–2px RTL artefact — see §6, F-2.** |
| **AC-112** | **pass, with the footer moved** | the toolbar, the chip strip and the bulk bar are outside the scroll container. The pagination footer **moved inside the card** and is still outside the scroller — see §7.4. |

### Modes

| # | Verdict | Evidence |
|---|---|---|
| **AC-113** | **pass** | test *"offers Filter… and Pin column, and never a sort item"*. `sorting` is `null` on a ledger because `LedgerTable` has no `setSortField` to put in the object — a compile error, not a runtime branch. `useIndexTable.types.ts` still passes. |
| **AC-114** | **pass** | the queue's `sla` column declares no `sortField`, so it has no sort block and no entry in the toolbar popover. Both read one declaration. |
| **AC-115** | **pass (read)** | selection replaces the header row, so no header menu exists; sort, filter and columns stay in the toolbar. |
| **AC-116** | **pass, measured** | at `dir="rtl"`, `scrollLeft = -320` and the pinned cells resolve to `right: 0px / 40px / 216px` with `left: auto` on every one — **the browser mirrored it; no component wrote a physical property.** Which columns are pinned and their order are identical. The offset resets to the inline-start on a direction change. |

**AC-45 is amended, not deleted**, exactly as §5.1 says: the indicator clause survives as
AC-86; the "headers are not interactive" clause is superseded by D-6 and replaced by AC-113's
type-level guarantee. **AC-48 is untouched.**

---

## 4. Filters — what the owner asked for, and the gap

> *"I want filters for everything in the table."*

**All six kinds are built.** The column declares the kind; `ColumnFilterControl` renders it.
No screen builds a filter again.

**But a filter can only be declared on a field the client declares `filterable`, and
`runQuery` throws on any other** (`src/data/mock/query.ts`: `Unknown filter field "x"`). That
throw reaches the screen as the error state. `src/data` is read-only to me, so this is where
the request stops:

| View | Filters shipped | Kinds |
|---|---|---|
| Captains | `status`, `rating`, `city`, `tier`, `vehicleClass` + extras `suspended`, `openComplaints` | multi-select · number-range · select · boolean |
| Applications | `status`, `vehicleClass`, `city`, `unclaimed` | multi-select · select · boolean |
| Compliance | `driverId`, `worstState` + extra `suspended` | **text** · select · boolean |
| Riders | `status`, `churnRisk`, `tier`, `city`, `walletBalanceHalalas` + extra `corporateAccountId` | select · multi-select · **money range** · text |

**Five of six kinds are reachable on real data. `date-range` is not**, because no client
declares a date field filterable. The control is built and typed and it will work the moment
one is.

### 4.1 What mock-data-engineer needs to add — the exact list

One line each, in `filterable`. Every column below is already sortable or rendered, so the
accessor exists.

```ts
// src/data/clients/drivers.ts — driverShape.filterable
name:                 (d) => d.name,                    // text
id:                   (d) => d.id,                      // text
totalTrips:           (d) => d.totalTrips,              // number-range
monthEarningsHalalas: (d) => d.monthEarningsHalalas,    // money range
onTimePercent:        (d) => d.onTimePercent,           // number-range
activeSubscriptions:  (d) => d.activeSubscriptions,     // number-range
lastTripAt:           (d) => d.lastTripAt,              // DATE RANGE — the missing kind
joinedAt:             (d) => d.joinedAt,                // date range

// complianceShape.filterable
driverName:  (c) => c.driverName,                              // text
soonestExpiry: (c) => c.docs.map((d) => d.expiresOn).sort()[0] ?? null,  // date range

// src/data/clients/riders.ts — riderShape.filterable
name:                 (r) => r.name,
id:                   (r) => r.id,
totalTrips:           (r) => r.totalTrips,
lifetimeValueHalalas: (r) => r.lifetimeValueHalalas,
renewalRatePercent:   (r) => r.renewalRatePercent,
lastTripAt:           (r) => r.lastTripAt,
joinedAt:             (r) => r.joinedAt,

// src/data/clients/applicants.ts — applicantShape.filterable
name:      (a) => a.name,
id:        (a) => a.id,
appliedAt: (a) => a.appliedAt,
slaDueAt:  (a) => a.slaDueAt,
```

`runQuery`'s `matches` already implements `contains`, `between`, `gte` and `lte`, and its
`numeric()` parses ISO instants through `Date.parse` — so date ranges work with no engine
change. **The only work is the accessor list.** When it lands, adding each control is one
`filter:` block per column in the view.

### 4.2 One capability lost, deliberately and reported

Compliance's old hand-built filter offered **`No file`** — `worstState === null`, a captain
with no documents. It is not expressible now: `ColumnFilterValue`'s `select` reserves `null`
for `Any`, so *"the field IS null"* has no encoding. `FilterOperator` has `isNull` and
`runQuery` implements it; `toFilterSpec` has no path to it. **Raised for utilities-engineer**
(F-5). Four options ship; the fifth is recorded in a comment at the call site.

---

## 5. Dates

Every date the table renders or formats goes through `formatDate`, which pins
`calendar: 'gregory'`, `numberingSystem: 'latn'` and `timeZone: 'Asia/Riyadh'` — a bare
`'ar-SA'` silently switches to Hijri and Arabic-Indic digits, and this is the one formatter in
the product that cannot.

The `date-range` control's presets are computed on the **calendar-day string** with
`Date.UTC` + `toISOString`, which has no zone and cannot drift; `toFilterSpec` converts the
bounds to Riyadh instants and turns the upper bound into `23:59:59.999+03:00`, so **the
closing day is not dropped**. Nothing in my code re-does that conversion.

The presets need a clock, so `DataTable` takes `now` and Applications passes `useNowIso()` —
the mock clock, not `Date.now()`. Without it the presets are absent and the calendar still
works.

---

## 6. What I could not resolve

| # | Finding | Owner |
|---:|---|---|
| **F-1** | **AC-85 is not verified.** The roving header row is wired but untested, and its RTL half depends on `useRovingFocus`, whose doc comment still describes its own behaviour backwards (F-15 from the design spec, still open). A keyboard test belongs in qa-engineer's cut. | qa-engineer / utilities-engineer |
| **F-2** | **A 1–2px RTL seam.** At `dir="rtl"`, `deviceScaleFactor: 3`, scrolled, a sliver of the scrolling content shows at the seam between two adjacent pinned cells (`tc-rtl-seam-zoom.png`). LTR at the same scale is clean (`tc-ltr-seam-zoom.png`). Measured widths abut exactly (40 / 176 / 128, offsets 0 / 40 / 216), so this is device-pixel rounding in a right-to-left scrollport, not a layout error. **Every clean fix is a `box-shadow`, which AC-110 forbids**, so I have not applied one. | visual-qa-engineer |
| **F-3** | **All four People views overflow at 1280 — by design, and item 9's lever is exhausted.** After `--ev-page-pad: 32px` the content region is **942px**. Declared widths: captains 1232, riders 1200, compliance 1192, applications 1136. The identity column already went 200 → 176 (item 9's `min-w-32 → min-w-28`), which recovered 24px and does not close a ~250px gap. The widths are not decoration — §7.2 **requires** a declared inline size on a pinnable column. §3.1 and §8.5 both say a wide table scrolls rather than shrinking a column below legibility, and pinning is what makes that usable. **The remaining lever is a design decision I will not make alone: which columns become `defaultHidden` at the 1280 floor.** | product-designer |
| **F-4** | **Row pitch: the two numbers disagree and neither is mine.** `--ev-row-h` is 40 (`03-navattic-language.md` §1.4, derived from downscaled frames); the match audit measured **62** live. Ours renders at **41** (40 + the 1px rule). The token is `globals.css`, which I do not own. If 62 is right, `--ev-row-h-media` (56) is also low, and the 24 + 8 + 8 = 40 arithmetic that closed **G1** would need restating at the larger figure. | re-skin engineer / product-designer |
| **F-5** | **`toFilterSpec` cannot express "this field is null"** (§4.2 above). `null` is `Any` in `select` and `multi-select`, and there is no path to `isNull`, which `FilterOperator` has and `runQuery` implements. Compliance loses its `No file` option until this is decided. | utilities-engineer |
| **F-6** | **Filter option lists are hard-coded in the views.** `city` ships `Riyadh` / `Jeddah` because that is what the fixtures hold. A real API returns them as facets. Not a defect today; it is a defect the first time a third city is seeded. | mock-data-engineer |
| **F-7** | **Arabic is unreachable from the UI.** `grep -rn setLanguage src --include=*.tsx` finds one call site and it is in a test. The `tc-rtl-*` captures set `dir`/`lang` on the document directly, so they exercise every logical property and **not** the dictionary. AC-71 and AC-74 cannot be checked by hand until a language control exists. | shell owner |
| **F-8** | **`useIndexTable` has no `setPageSize`**, so §4.6's `25 ▾ rows per page` half of the pagination footer is not built. The rest of item 17 is. | utilities-engineer |
| **F-9** | **The in-card tab strip needs a treatment.** The match audit is right that `Captains / Applications / Compliance / Riders` has no Navattic counterpart, and right that it must stay — it is merge M7. I have not invented a treatment for it; that is a design decision. | product-designer |
| **F-10** | **`Sort · Last Seen ⌄`.** §4.3 measured the word `Sort` in front of the sorted column. Ours reads `⇅ Trips ↓ ⌄` — AC-91's requirement exactly, with the glyph carrying "sort". Adding the word costs ~40px of toolbar. Flagged rather than decided. | product-designer |

---

## 7. The Navattic fix list and the match audit

### 7.1 The crash — `Column "captain" cannot be pinned without a positive width`

**Fixed. The hook was right; the caller was wrong to ask.**

`useColumnPinning` throws when a pinned or locked column declares no inline size, and it
should: §7.2 makes the width part of the column contract because an offset computed after
layout is a frame of visible jump on every scroll. `DataTable` was locking column index 0
unconditionally, so a screen that had not yet declared `width` — which was every screen for
part of this build — crashed on first paint with no interaction.

`DataTable` now locks index 0 **only when the width is a finite positive number**. A screen
that forgets it gets a table with no frozen identity column: degraded, legible, and not a
crash. Two tests reproduce the ordering: *"renders without throwing when the identity column
declares no width"* and *"leaves that identity cell unpinned rather than pinning it at offset
zero"*.

### 7.2 Item 6 — vertical column hairlines

`border-e` + `border-(--ev-hairline2)` on every cell but the last, header and body alike,
declared **once** on `<table>` as `[&_tr>*:not(:last-child)]:…` rather than per cell: a rule
between columns is a property of the grid. `border-e` is logical, so Arabic needs no branch —
visible in `tc-rtl-scrolled-1280.png`. Row separators and the ledger footer rule moved to the
same token.

**On the audit's colour delta:** it measured ours at `#e5e8ed` against theirs at `#f0f2f4`.
That reading predates item 6 — it was measuring `--ev-hairline`, the *outer* border, because
there were no internal rules to measure. The rules now render `--ev-hairline2`, which the
re-skin sets to `#eceef2`: **4/255 from the reference**, inside the measurement floor. Verified
in `dist`: `.[&_tr>*:not(:last-child)]:border-(--ev-hairline2) tr>:not(:last-child){border-color:var(--ev-hairline2)}`.

### 7.3 Item 7 — the `[&_td]:py-1` bridge is deleted

`01-people.md`'s density override existed only because §7.7's 24px hit target, 8px of block
padding and a 32px row could not all be true — gap **G1**, question **Q2**. At 40px the
arithmetic closes: 24 + 8 + 8 = 40. Measured after the revert: **41px** per row (40 + the 1px
rule), header **32.5px** on `--ev-row-h-head`. **G1 closes and Q2 is answered** — subject to
F-4, which is about whether 40 is the right number at all.

The header button had to move with it: it was `h-row`, which silently became 40 when the data
row rose. It is `h-(--ev-row-h-head)` now.

### 7.4 The audit's other three findings

| Finding | What I did |
|---|---|
| **Ordinary cell ink `#24242f`, ~3× too dark** | `TableCell` defaults to `text-muted-foreground`; `DataTable` gives **column index 0** `text-foreground` back. Ink is the identity column's; the rest of the row is quiet. Visible in `tc-footer-1440.png`. |
| **The pagination footer renders at y = 1080 in an 820px viewport** | Moved **inside the card**, 48px, bordered above, bare-text `Previous` / `Next` per §4.6. Measured at 1440 × 900 on Compliance: `y = 629, h = 48, inViewport: true`. The bulk bar floats above it now (`bottom-15`). |
| **Table rules 1.7× too dark** | §7.2 above. |

### 7.5 Item 11 and §4.3 — the strip and the labelled toolbar

The chip strip is a 48px `bg-muted` band at r8 with 8px padding, **white** chips with a
`--ev-hairline` border, `Add filter` as a chip-shaped outline button, and **`Clear` as bare
text with a leading `✕` and no chip** — chips are state, `Add filter` is a control shaped like
state, `Clear` is an action on the set.

**The strip renders only when something is filtered or a queue scope is on** (§10.1's resting
card has no chip row). `Add filter` at rest is the toolbar's own labelled `Filter` control,
which is the second trigger §6.3 already requires.

The toolbar's four unlabelled icons became four labelled 32px outline buttons: `Search`,
`Filter n`, `Columns ⌄`, `Sort ⌄` / `Trips ↓ ⌄`. The trailing caret is on the menu-openers
only (§1.5). **No blue primary anywhere** — R3 is dead and the toolbar carries no primary at
all, because People has no page-level create action.

**One divergence from §4.3, deliberate:** §4.3 puts a persistent 180px search input at the
toolbar's inline-start. **AC-47** requires search to *replace the tab row in place*, and the
tab row is where that input would go. The `Search` control is a labelled button that performs
the AC-47 swap. Raised with F-9, since both belong to the same conversation about what the tab
strip becomes.

### 7.6 Item 9 — the measurement

At 1280, content region **942px**:

| View | `scrollWidth` | `clientWidth` | clips |
|---|---:|---:|---|
| Captains | 1232 | 942 | yes |
| Riders | 1200 | 942 | yes |
| Compliance | 1192 | 942 | yes |
| Applications | 1136 | 942 | yes |

Identity column taken 200 → 176 in all four, **before** touching the gutter — `--ev-page-pad`
was not touched, and D-2′ stands at 32px. It also bought 24px of pin budget: the locked block
is 216 of the 488 the floor allows, so two operator pins fit where one and a half did.

The residual is F-3, and it is a design decision, not a width tweak.

---

## 8. Verification, run and reported

```
npx tsc -b --noEmit      clean, exit 0
npx vite build           ✓ built in 5.39s
npx vitest run           765 tests · 741 pass · 24 fail
```

**All 24 failures are in `src/shell/*` and none is mine.** The same suite at `HEAD`, with my
work stashed, fails **25** — so the change removes one and adds none:

| File | at `HEAD` | with this work |
|---|---:|---:|
| `src/shell/nav.test.tsx` | 2 | 2 |
| `src/shell/qa.copy.test.tsx` | 4 | 3 |
| `src/shell/qa.keyboard.test.tsx` | 11 | 11 |
| `src/shell/qa.shell.test.tsx` | 8 | 8 |
| **anything I own** | — | **0** |

*(The shell suite is not fully deterministic: an earlier `HEAD` run reported 22. `nav.test.tsx`
fails 2 in isolation at `HEAD` either way — `bg-card` versus `bg-nav-chip` on the active pill,
which is the re-skin's, not mine.)*

**My own count: 16 tests, all passing**, in `src/components/table/tableControls.test.tsx`.

### Token audit

Clean across `src/components/table/`, `src/components/DataTable.tsx`,
`src/components/ui/table.tsx`, `src/screens/operations/people/` and `src/i18n/dictionaries.ts`:

- no Tailwind palette class, in `src` **or** in `dist` (`grep -c` over `dist/assets/*.css` → 0)
- no arbitrary `[value]` — the only bracket forms are variant selectors (`group-data-[state=selected]/row`)
- no raw hex, `rgb()`, `hsl()` or `oklch()` outside comments
- no physical direction utility, no `outline-none` without a ring, no `<div onClick>`, no hover-only reveal
- no `box-shadow` in the pinned region
- `dist` carries `insetInlineStart` / `insetInlineEnd` and `borderInlineStart` / `borderInlineEnd`, and **no `position:"sticky",left:`**

**Two inline styles, both sanctioned and both required.** `pinnedStyle` writes the sticky
offset — the spec's own instruction, since an offset is arithmetic a class cannot carry — and
the boundary colour, for the cascade reason in §2.2. Both resolve to tokens.

### Captures — `scratch/shots/`

| File | Shows |
|---|---|
| `tc-rest-1440.png` | resting card: a `⌄` at rest on every controllable header, `⇅ Sort ⌄`, no chip strip |
| `tc-header-menu-1440.png` | the header menu: sort pair · `Filter…` · `Pin column` · `Hide column`, no red |
| `tc-sorted-1440.png` | `↓ Trips` in the header and `⇅ Trips ↓` in the toolbar — one state, two readouts |
| `tc-pin-refused-1440.png` | `Pin column` disabled in place with its reason on a second line (**AC-108**) |
| `tc-pinned-scrolled-1440.png` | three columns frozen, the kebab frozen at the inline-end, both boundary hairlines live |
| `tc-filter-multiselect-1280.png` · `tc-filter-boolean-1280.png` · `tc-filter-money-1280.png` · `tc-filter-range-inverted-1280.png` | four of the six kinds, including the `SAR` in-field prefix and the inline inverted-range hint |
| `tc-filtered-header-and-chip-1280.png` | `Status: Active` in the header **and** in the chip, from one string; `Filter 1` in the toolbar |
| `tc-add-filter-picker-1280.png` · `tc-columns-popover-1280.png` | the two second entry points |
| `tc-queue-1440.png` · `tc-queue-scrolled-1440.png` | the queue: the R5a marker riding the pinned identity at every scroll offset |
| `tc-footer-1440.png` | the pagination footer inside the card, and the ink hierarchy |
| `tc-rtl-1280.png` · `tc-rtl-scrolled-1280.png` | Arabic: the pinned block on the physical right, the kebab on the left, arrows and numerals unmirrored |
| `tc-ltr-seam-zoom.png` · `tc-rtl-seam-zoom.png` | F-2, at 3× |

Scripts: `scratch/table-controls.mjs`, `scratch/tc-rtl.mjs`, `scratch/tc-measure.mjs`,
`scratch/tc-errors.mjs`. All four views load with **no console errors**.

---

## 9. For the reviewers

**qa-engineer** — AC-80…AC-116 are §3. The three I would test first are **AC-85** (untested,
F-1), **AC-99** (the debounce, including the flush-on-unmount path) and **AC-106** (the R5a
marker at every scroll offset, which is the one that is expensive to retrofit). The harness in
`src/components/table/tableControls.test.tsx` renders `DataTable` over a real `useIndexTable`
and is meant to be extended, not duplicated.

**visual-qa-engineer** — start with **F-2** (the RTL seam; I have not applied a fix because
every clean one is a `box-shadow`) and **F-3** (all four views overflow at 1280; the question
is which columns go behind the column control, and it is a design decision). Then the two
hairline weights: the internal rule is `--ev-hairline2` and the frozen boundary is
`--ev-hairline`, one step darker, and *only while the table overflows* — if you cannot tell
them apart on your display, say so, because that difference is the whole signal.

**One decision you both need from product-designer, not from me:** F-9, what the in-card tab
strip becomes. It has no counterpart in the reference and it is not going away.
