# 01 — Build: Operations › People

> **Phase 1, first screen.** Owner: frontend-engineer. Consumers: qa-engineer, visual-qa-engineer,
> product-designer (four open questions, §6), mock-data-engineer (six findings, §6), the
> `src/components/` owner (four requests, §6).
>
> **Design spec:** `docs/05-restructure/design/00-shell.md` §8 (page header), §9.1 (index table),
> §9.3 (work queue), §9.4 (the union problem — People by name), §11 (the four states), §12
> (components)
> **Feature spec:** `docs/05-restructure/specs/00-foundation.md` §3.6 **M7**, §5.1, §7.1, §7.3
> **Rulings applied:** R3 R4 R5 R5a R6 R7 R8 R9 R10 R13 R15 R17 R18 · D-2 · V4
> **Route:** `/operations/people` — sub-tab `operations-people`, four `?view=` views
> **Directory:** `src/screens/operations/people/` (14 files, owned entirely by this screen)

---

## 1. What was built

Operations › People is **M7**, the widest of the seven merges: `drivers` + `all-pending` +
`applicant-detail` + `compliance` + `riders`, five legacy pages on one route. §5.1 governs it —
*"a merged sub-tab carries the union of its patterns, not one of them"* — and §9.4 turns that into
one mechanical rule that this build is shaped around:

> `DataTable` takes a `mode` — `index | ledger | queue` — and **the mode, not the route, decides
> which furniture renders. A route may mount more than one mode over its lifetime. It may never
> mount two at once.**

So the screen is a page header, a tab row, and **exactly one mounted view**:

| View | Mode | Rows | Furniture |
|---|---|---:|---|
| **Captains** (default) | `index` | 57 | checkbox column · kebab · sort popover · filter chips · bulk bar |
| **Applications** | `queue` | 8 | **no** checkbox · owner chip · SLA countdown · dispositions · R5a ×3 · breached-first |
| **Compliance** | `index` | 8 | checkbox column · kebab · sort popover · filter chips · bulk bar |
| **Riders** | `index` | 13 | checkbox column · kebab · sort popover · filter chips (no bulk bar — see **G4**) |

The mode is `table.mode` off `useIndexTable`'s discriminated union, never a prop. In the queue
branch there is no `selectedIds` **on the type**, so a checkbox column does not compile — §9.3's
*"a queue gets a checkbox only where every bulk action offered is a claim or assign action"* is
enforced by `tsc`, not by a runtime `if`.

Each view is its own component. Switching views unmounts the previous table, which is **AC-25**
("selection resets on any view change") by construction rather than by an effect.

### Files

```
src/screens/operations/people/
  PeopleScreen.tsx      route entry — page header, tab row, one mounted view
  PeopleTable.tsx       the card: toolbar + chip row + DataTable, column visibility
  IndexToolbar.tsx      D-02 — view tabs ⇄ search in place, sort / filter / columns popovers
  FilterChipRow.tsx     D-03 — one chip per field, `Add filter +`, `Clear all`, queue scope chip
  CaptainsView.tsx      index mode over `listDrivers`
  ApplicationsView.tsx  queue mode over `listApplicants` + claim/approve/reject
  ComplianceView.tsx    index mode over `listDriverCompliance`
  RidersView.tsx        index mode over `listRiders`
  queue.tsx             V-04 SlaCountdown · V-06 OwnerChip · V-07 DecisionBadge
  cells.tsx             Cell / MutedCell / NumCell / DateCell / Absent / Identity
  ConfirmDialog.tsx     the destructive confirmation (verb + count + reason)
  domain.ts             enum → tone + copy key, one table per enum
  copy.ts               every string this screen can render, as keys
  views.ts              the four view ids and what a view is handed
  useRowOverrides.ts    screen-local: hold the record a mutation returned
  useNowIso.ts          screen-local: the fixed clock in mock mode, the host clock in http
  index.ts              exports `PeopleScreen`
```

**Data comes through `@/data/clients` only.** No fixture is imported anywhere in the directory; the
seam test's rule holds. Shared hooks (`useAsync`, `useIndexTable`, `useColumnVisibility`, `useNow`)
and shared helpers (`formatMoney`, `formatDate`, `formatCount`, `slaClock`, `pageRange`) are
consumed, never re-implemented. Money is integer halalas through `Money`; every date goes through
`formatDate`, which pins `calendar: 'gregory'` and `numberingSystem: 'latn'` explicitly.

### Changes outside my directory — both minimal, both named

1. **`src/routes.tsx`** (shell owner). Three lines: one import, one `screenFor(row)` helper, and the
   route element changed from `<SubTabScreen row={row} />` to `screenFor(row)`. The helper is a
   one-line registry keyed on `subTabId`; every other sub-tab still resolves to `SubTabScreen`. The
   route, its path, its shape and its permission all still come from the route table.

   ```tsx
   function screenFor(row: SubTabRoute) {
     if (row.subTabId === 'operations-people') return <PeopleScreen row={row} />
     return <SubTabScreen row={row} />
   }
   ```

2. **`src/i18n/dictionaries.ts`**. One import and one spread. The strings live in
   `src/screens/operations/people/copy.ts` and this file only assembles them, so screen 2 through
   34 add one line each and never edit each other's copy. **Imported from `./copy`, not from the
   screen's barrel** — the barrel also exports the screen, which reaches `ShellContext`, which
   imports the dictionary: a cycle. `copy.ts` imports one type and nothing else.

---

## 2. The columns, and why

### Captains — `index`

Legacy `renderDriversTable` (`eyvar_ops_panel_v40_fixed.html:6344`–`:6400`) shows nine columns:
captain (rating badge inline, `id · vehicle` beneath), vehicle class, tier, `activeSubs` as the
string `'4/5'`, capacity, on-time, month earnings, status, and a `View 360°` button.

| # | Column | Align | Sort | Why |
|---:|---|---|---|---|
| 1 | **Captain** | start | `name` | the identity, a link to the 360° profile layer (`?entity=`). Never truncates; wraps inside `min-w-32 max-w-56`. Second line **only when suspended**, carrying the reason — a suspension with no stated reason is not appealable |
| 2 | ID | start | — | `DRV-0101`. **Its own column, not a second line under the name.** §9.1 allows a second line "when a value only qualifies the primary one"; an id does not qualify a name, it is what operators search by — and a second line on every row costs a third of the screen's density |
| 3 | Status | start | — | one `StatusBadge`, four values, **no red** (a suspension is `neutral` — `types/driver.ts` says so, and R5a says there is no red badge) |
| 4 | Rating | end | `rating` | `0`/`null` is **no rating yet** (`RDR-2090`, `:2607`) and renders the word `New`, not a zero |
| 5 | City | start | — | the one geographic fact on the roster |
| 6 | Subs | end | `activeSubscriptions` | `4 / 5` from **two integers**. Legacy stored the string `'4/5'`, which cannot be sorted or compared |
| 7 | Trips | end | `totalTrips` | |
| 8 | On time | end | `onTimePercent` | `null` → `—` (no history to compute from), never `0%` |
| 9 | Earned (SAR) | end | `monthEarningsHalalas` | `Money`, `unit="none"` — §8.3.1: the unit appears once, in the header |
| 10 | Last trip | start | `lastTripAt` | **added.** `null` is a real fixture state (`DRV-0203`, a captain who has never driven) that the legacy roster never showed |
| — | Tier · Class · Vehicle · Phone · Joined | | | behind the column control — real, but secondary |

**Dropped:** `capacity` (`'1 open' | 'Full'`), because it is `maxSubscriptions − activeSubscriptions`
and showing both a value and its own arithmetic is the derived-value duplication §8.2 warns about.

### Applications — `queue`

Applicant (link to the level-3 detail route) · ID · Status · Applied · **SLA** · Owner · **Decision**,
with Documents, Plate, Vehicle and City behind the column control. Ordering is `slaDueAt` ascending,
which is §9.3's order exactly — breached first, then remaining time ascending, `No clock` last,
because `compare` sorts nulls last. **The server orders it; the view never re-sorts rows it was
given.**

### Compliance — `index`

Captain · ID · Documents (worst state) · **five document columns in the legacy order** · Dispatch.
The identity's second line carries the suspension reason, or `No documents on file`. `DRV-0203`
carries `worstState: null` and five `—` cells: **the captain exists, the file does not**, which is
the gap M7 exists to close (`08a` §17.9).

### Riders — `index`

Rider (second line: the corporate account that bills them) · ID · Status · Churn risk · Trips ·
**Wallet (SAR)** · Lifetime (SAR) · Renewal · Last trip.

**`Wallet (SAR)` is added deliberately.** `walletBalanceHalalas` may be negative, no spec says what
happens below zero, and the fixtures carry an overdrawn wallet precisely so the screen has to show
it. `RDR-4001` renders `−41.50` with **U+2212**, no colour, no parentheses, no badge.

**Dropped:** the legacy "health" pill (`riderHealth`, `:6402`) — `complaints.length` and `rating < 4`
recomputed at render, which is §8.2's three-screens-three-answers defect, and `churnRisk` is the
server-derived field that already answers it. Also plan and vehicle type, both read off `subs[0]`'s
plan **string** by `split(' ')[0]`: a subscription's fact, not a rider's.

---

## 3. Density — the number the owner rejected the shell over

D-2: *13 px base, ~30 px rows, denser than Shopify.* Measured, at 1280 × 900:

| | Shopify products list | Eyvar People, as first built | **Eyvar People, shipped** |
|---|---:|---:|---:|
| Row pitch | ~44 px (media rows) | 41 px | **33 px** (32 + 1 px hairline) |
| Rows above the fold | 6 | 16 | **21** |

Two things got it there, and one of them is a bridge I want removed.

**1. `Cell` — 16 px line box, and never wraps.** `table.tsx` gives `<td>` `h-row px-3 py-2`, and
`DataTable` wraps every cell in a `display:block` span. At 13 px the inherited line box is 20 px, so
20 + 8 + 8 = 36. A block child collapses the parent's strut, so a `leading-4` block gives exactly
32 — `--ev-row-h`, on the grid, no arbitrary value. `whitespace-nowrap` is the other half: `table.tsx`
correctly removed it from `<td>` so a second identity line can grow the row, but that also let
`DRV-0201` and `25 Jun` wrap to two lines the moment the table narrowed. Data cells never wrap; only
the identity does.

**2. `[&_td]:py-1` — a bridge, and a request.** Three rules make 32 px unreachable from inside
`DataTable`: `<td>` carries 8 px block padding, the row kebab is `size="icon-xs"` (a **24 px
rendered box**), and §7.7 requires a ≥ 24 × 24 hit target. 24 + 8 + 8 = 40, plus the hairline = 41 —
Shopify's row height, not tighter than it. §7.7 actually asks for the hit area to come from
*"padding plus a compensating negative margin, **without changing the rendered box**"*, so the 24 px
box is the deviation, not the padding. Until that is fixed where it belongs, `PeopleTable` sets the
block padding to 4 px through `DataTable`'s own `className` — one place, a scale value, and it lands
every row on exactly `--ev-row-h`.

> **Request to the `src/components/` owner, which retires that line entirely:** `py-2` → `py-1` on
> `TableCell` in `table.tsx`, and the row kebab rendered at 20 px with a padded 24 px hit area per
> §7.7. Recorded as **G1**.

Every view fits its card at 1280 px with no horizontal clipping (measured: `scrollWidth ===
clientWidth` on all four), and at 1440 px with room to spare. That took `min-w-32` on the identity
link and moving `Documents`, `City` and `Rating` behind the column control.

---

## 4. Acceptance criteria

| AC | Verdict | Evidence |
|---|---|---|
| **AC-10** — a view changes neither nav column's highlight | met | `?view=` via `withView`; the rail and sub-tab row are route-derived |
| **AC-25** — selection resets on route, view or filter change | met | `useIndexTable` clears synchronously; a view change unmounts the table |
| **AC-35** — a skeleton per pattern, never a spinner | met | P1 for the three index views, P8 for the queue — `shots/people-loading-1280.png` |
| **AC-36** — an induced failure renders an error naming a retry | met | `shots/people-error-1280.png`. **Induced without editing source**, but not through `?mockFail=` — see **G8** |
| **AC-37** — filtered-to-zero shows `no-match`, no illustration, no heading | met | `shots/people-nomatch-1280.png`. The kind comes from `table.isFiltered` inside `DataTable`; no call site can choose it |
| **AC-38** — zero records ever shows `first-run` with an illustration and ≥1 action | **built, not reachable** | every view returns rows unfiltered, so the branch cannot be exercised with these fixtures. Code path present in all four views |
| **AC-39** — no "please", "invalid", "failed", no blame | met | `copy.ts`; every error is an imperative naming the fix |
| **AC-41** — a failed row action is scoped to that row | met | `shots/people-rowerror-1440.png` — `Approve` on `APP-2205` (3 of 5 documents verified → 422). Every other row stays interactive; no page banner |
| **AC-43** — the first data cell is a link to the record | met | captains/riders/compliance → the profile layer; applications → the level-3 detail route |
| **AC-44** — numeric columns inline-end, header sharing the edge | met | `align: 'end'` drives both halves |
| **AC-45** — exactly one header carries the caret, headers are not interactive | met | the caret is `DataTable`'s indicator; the control is the sort popover — `shots/people-sort-1280.png` |
| **AC-46** — selection replaces the header row and shows the bulk bar | met with a defect | `shots/people-selection-1280.png` shows `3 selected`. The bar renders **at the bottom of the card**, which is below the fold at 25 rows — **G7** |
| **AC-47** — search replaces the tab row in place, `Cancel` restores filters | met | same 40 px row; `Cancel` clears the query and nothing else |
| **AC-48** — a queue has no checkbox column unless it offers bulk claim | met at compile time | `useIndexTable({ mode: 'queue' })` without `bulkClaim` has no selection API |
| **AC-50** — R5a's three parts on a breached queue | met | banner with the count + `Show only breached`; a 3 px `--ev-red` leading edge per breached row; `overdue 1d 16h` **in words**. Greyscale still identifies them — `shots/people-apps-1280.png` |
| **AC-68** — the kebab renders at rest and responds to focus-within | met | `DataTable`'s behaviour, unchanged |
| **AC-73** — money, dates, ids and numerals do not reorder in Arabic | met, after a real defect | first RTL capture showed `4 / 5` → `5 / 4` and `25 Jun` → `Jun 25`. `NumCell` and `DateCell` now isolate with `<bdi>` — `shots/people-rtl-1280.png` |
| **AC-74 / AC-75** — every string is a key, every interpolation is a named placeholder in one key | met | `copy.ts`. Counts get two keys (`.one` / `.other`) chosen by the caller — no plural engine |
| **AC-76** — no emoji on the owner chip | met | three states, three words |

Behaviour QA should test that is **not** on that list: view switching clears selection; the sort
popover stays open across changes; `Clear all` appears only when `isFiltered`; the take-over
confirmation names the current owner; `Open application` does not claim it (§9.3, `:19301`).

---

## 5. Deviations — deliberate, and each with a reason

| # | Deviation | Why |
|---|---|---|
| **D1** | `PeopleTable` sets `[&_td]:py-1` on `DataTable`'s root | §3 above. A bridge with a named upstream fix (**G1**), not a preference |
| **D2** | No `Learn more about captains.` below the card (§9.1, V-11) | There is no help destination in the product. A link that 404s is worse than a named gap. **Blocked on product-owner for the URL** |
| **D3** | No `+` tab and no `Save as` in search mode (§3.2) | Creating a saved view needs a saved-view resource, and there is none behind the seam. Building one that dies on reload would be a lie about persistence (Q1 is open anyway) |
| **D4** | No page-level action cluster (§8 slot 4) | Every action People offers acts on rows. A header primary would have to invent a create flow with no client behind it; R3's one primary is better spent nowhere than on a button that cannot work |
| **D5** | Compliance's expired documents get **no** red row marker | R5a use #3 is scoped by §8.4 to a **work queue**. Compliance is an index table, so `Expired` is a neutral badge carrying the word. `types/driver.ts` suggests the marker; §8.4 does not grant it — **Q1 for product-designer** |
| **D6** | Row dispositions (`Approve`, `Reject`) are both **secondary**, not one filled primary | §9.3 permits *at most* one filled primary per row; zero satisfies that and R3's one-primary-per-screen. A blue `Approve` repeated down twenty rows is what R3 exists to prevent |
| **D7** | `Show only breached` sets the client's `breached` **view**, and the banner counts only items still running | The view is `slaDueAt < now` regardless of status. A stopped clock is not a backlog, so the banner counts pending + in-review; the filter deliberately shows the wider set, because "everything that went past its SLA" is the right thing to audit. See **G9** |
| **D8** | The queue's scope renders as a dismissible chip in the filter row, not as a filter chip | It is a view, so it does not set `isFiltered` and must not be mistaken for one. It carries a `✕`; filter chips carry a chevron |
| **D9** | The page header's `meta` line is the mounted view's **record count**, not the route table's `subtitleKey` | V4: the line carries only content derived from the data on screen. The route subtitle is a description and cannot change when the data changes — and the top bar already carries it |

---

## 6. Findings and requests — named, not worked around

### For **mock-data-engineer**

| # | Finding |
|---|---|
| **G4** | **Riders has no mutating client operation at all**, so §9.4's mandated checkbox column has no bulk action to offer and the bulk bar never appears — **AC-46 is unmet on that view**, and selecting rows there does nothing. Either the view needs a bulk-capable operation or §9.4 needs a clause; I will not ship a fake one. (Compliance avoids this because a compliance row is keyed by `driverId`, so `suspendDriver` / `reinstateDriver` apply to it — which is also what the legacy page's auto-suspension does) |
| **G8** | **`?mockFail=` does nothing at runtime.** `seedMockFailuresFromLocation` is exported and tested but has **no caller anywhere in `src/`**, so the documented way to induce a failure without editing source is not wired. I induced AC-36's error through the dev server's module registry instead (`scratch/error-state.mjs`). One call at boot fixes it — but boot is `App.tsx`/`main.tsx`, which is not mine |
| **G9** | The applicants client's **`breached` view counts decided applications** (`slaDueAt < now` regardless of status). An SLA on an approved or rejected item has stopped running. Suggest the view exclude terminal statuses |
| **G10** | **Mock mutations do not persist.** `suspendDriver` returns `{ ...row, status: 'suspended' }` and does not write back, so a refetch returns the original. Without an overlay the operator suspends a captain, sees a toast, and watches the table say `Active`. `useRowOverrides` holds **the response body** for the life of the view; it stops mattering the moment the mock persists |
| **G11** | `Applicant.decidedByUserId` is an id with no name beside it. The queue reads `listTeamUsers()` once and maps it client-side, which a real API would join. Suggest `decidedBy: { id, name }` on the record |
| **G12** | There is no distinct-values / facets endpoint, so **`City` cannot be offered as a filter** on any view — the values would have to be hard-coded, which is inventing data. Captains, Applications and Riders all filter on `city` server-side today and no UI can reach it |

### For **product-designer**

| # | Question |
|---|---|
| **Q1** | **D5** — may an index table carry the R5a row-critical marker? `types/driver.ts` says an expired document is "`neutral` plus the §8.4 row marker", but §8.4 scopes that marker to work queues and R5a's four uses do not include an index row. Shipped without the marker |
| **Q2** | §1.2 sets `--ev-row-h` at **32 px**, §9.1 sets cell padding at **8 px block**, §12.1 sets the badge at **20 px tall**, and §7.7 requires a **24 px** hit target. 24 + 8 + 8 = 40. **Three of those four cannot all hold.** Shipped at 4 px block padding; the alternative is a 40 px row |
| **Q3** | The shell dictionary's `table.sortAscending` / `table.sortDescending` read `Oldest first` / `Newest first` — date-specific copy on a control that sorts names, ratings and money. This screen uses its own `people.sort.ascending` / `.descending` (`Ascending` / `Descending`). One of the two should go |
| **Q4** | `Learn more about {resource}.` (**D2**) needs a destination before it can ship |

### For the **shell / `src/components/` owner**

| # | Request |
|---|---|
| **G1** | `table.tsx`: `py-2` → `py-1` on `TableCell`, and the row kebab rendered at 20 px with a padded 24 px hit area per §7.7. That retires **D1** |
| **G7** | `DataTable`'s bulk action bar is `absolute … bottom-3` inside the card. With 25 rows the card is taller than the viewport, so the bar is off-screen until the operator scrolls to the bottom of the table — the one moment they need it. It should be sticky to the scroll container, not absolute to the card |
| **G13** | The toast renders as a **light** surface. §11.5: dark `--ev-ink` fill, white label, radius 8 px, bottom-centre. Bottom-centre is right; the fill is not (`shots/people-claim-1440.png`) |
| **G14** | `DataTable` has no way to pass a `className` to an individual cell, so a column cannot set its own width or wrapping. Not needed by this screen after `min-w`/`max-w` on the identity, but the next one with a genuinely wide column will need it |

### For **qa-engineer**

`src/screens/operations/people/` ships with **no test file** — behaviour verification is yours, and
§4 above lists what to assert. Two things to know before you start:

- **23 tests currently fail, all in `src/shell/`** (`qa.copy`, `qa.keyboard`, `qa.shell`), and none
  of them touch this screen: those three files build their own routes with a stub element, so
  `PeopleScreen` never mounts in them. They fail because `ModuleRail` and `PageNav` were rewritten
  during this session — e.g. `getByRole('link', { name: 'Management' })` now finds nothing. 724 pass.
- The queue's failure path is reachable without any injection: `Approve` on `APP-2205` throws 422
  because 3 of its 5 documents are verified.

---

## 7. Verification, as run

```
npx tsc -b --noEmit        exit 0, no output
npx vitest run             747 tests — 724 passed, 23 failed (all src/shell/*, see above)
npx vite build             built in 3.85s
```

`dist/` grepped, not just `src/`:

```
Tailwind palette classes in dist/assets/*.css     0
arbitrary-value utilities in dist/assets/*.css    0
shadow-sm | shadow-md | shadow-lg | shadow-xl     0
physical left/right declarations                  only `.inset-0{top:0;right:0;bottom:0;left:0}`,
                                                  Tailwind's own symmetric definition
[&_td]:py-1 compiled to                           .\[\&_td\]\:py-1 td{padding-block:var(--spacing)}
```

`/token-audit` over `src/screens/operations/people/` — **clean**. Zero hits on all nine greps: no
palette classes, no arbitrary values, no raw colours, no physical directions, no killed outlines, no
inline styles, no `<div onClick>`, no hover-only reveals.

---

## 8. Screenshots

All in `scratch/shots/`, 1280 × 900 at DPR 2 unless noted.

| File | What |
|---|---|
| `people-captains-1280.png` | Captains, 21 rows above the fold, the 61-character Arabic name wrapping in place |
| `people-captains-1440.png` | the same at 1440 |
| `people-apps-1280.png` | the queue: critical banner, red leading edges, `overdue` in words, owner chips, dispositions, decided rows converted in place |
| `people-apps-1440.png` | the same at 1440 |
| `people-compliance-1280.png` | five document columns, `No file` + `No documents on file`, a suspension reason on the identity line |
| `people-riders-1280.png` | the overdrawn wallet at `−41.50`, the corporate account on the second line |
| `people-loading-1280.png` | P1 skeleton — toolbar bar, header row, eight row bars |
| `people-error-1280.png` | card-scoped error, **toolbar still rendered above it** |
| `people-nomatch-1280.png` | search mode in place + `no-match` sentence + `Clear all filters` |
| `people-selection-1280.png` | `3 selected` replacing the column headers |
| `people-confirm-1280.png` | `Suspend 3 captains?` with the reason field and its helper text |
| `people-sort-1280.png` | the sort popover — label, radio group, divider, direction pair |
| `people-columns-1280.png` | the column control — 15 columns, `Captain` disabled because the identity always shows, `Reset columns` |
| `people-filter-1280.png` | the filter popover the icon cluster and `Add filter +` share |
| `people-rowerror-1440.png` | AC-41: the failed `Approve` scoped to one row's action cell |
| `people-claim-1440.png` | a successful claim: `Yours · 0m`, `Release`, and the toast |
| `people-rtl-1280.png` | `dir="rtl"`: the layout mirrors, `4 / 5`, `25 Jun` and `12,400.50` do not |
