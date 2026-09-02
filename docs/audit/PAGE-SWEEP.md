# Page sweep — all 36 sub-tabs, measured

**Scope.** Every one of the 36 sub-tab routes enumerated from
`src/data/fixtures/routeTable.ts` (`SUB_TABS`, lines 154–968). Viewport 1440×900,
Chromium via Playwright. Every number below came out of a live
`getComputedStyle` / `getBoundingClientRect` evaluation in the browser. Nothing
here is an impression.

**When.** Live server `http://localhost:5199`, final clean sweep **2026-09-02
18:28:52 → 18:30:58**, source hashes identical before and after the run:

| file | md5 |
|---|---|
| `src/components/DataTable.tsx` | `f6ed7a3e67932932eaccb1708809ca49` |
| `src/components/PageShell.tsx` | `d8c693f466eefd325a7066dde88fcf26` |
| `src/styles/globals.css` | `cdf0ccb57e56105e287e790a084c6e4f` |

**Read the provenance note in §4 before you act on this.** The tree was being
edited by other agents throughout the sweep, two of my earlier runs were
contaminated, and three findings I was about to file turned out to be artefacts
of that. §4 lists what changed under me and what I discarded.

---

## 1. Summary

36 / 36 routes rendered. **0 console errors, 0 React warnings, 0 page errors, 0
failed requests, 0 broken images, 0 missing-translation throws** across all 36.
No route has content that is unreachable by scrolling. No route has horizontal
document overflow (`documentElement.scrollWidth === clientWidth === 1440` on all
36). RTL mirrors cleanly (§3.37).

| route | blocker | major | minor |
|---|---|---|---|
| `/operations/my-work` | 1 | 2 | 1 |
| `/management/zones` | 0 | 5 | 2 |
| `/financials/cash` | 0 | 4 | 2 |
| `/support/fairness` | 0 | 4 | 2 |
| `/admin/policy` | 0 | 4 | 1 |
| `/admin/overview` | 0 | 3 | 2 |
| `/admin/team` | 0 | 3 | 1 |
| `/admin/workspace` | 0 | 3 | 1 |
| `/support/tickets` | 0 | 3 | 0 |
| `/admin/activity` | 0 | 2 | 2 |
| `/admin/communications` | 0 | 2 | 1 |
| `/support/safety` | 0 | 2 | 1 |
| `/operations/quick-rides` | 0 | 2 | 0 |
| `/operations/subscription-trips` | 0 | 2 | 0 |
| `/operations/people` | 0 | 2 | 0 |
| `/operations/overview` | 0 | 2 | 0 |
| `/financials/pricing` | 0 | 2 | 0 |
| `/financials/ledger` | 0 | 2 | 0 |
| `/management/risk` | 0 | 1 | 2 |
| `/management/growth` | 0 | 1 | 1 |
| `/management/performance` | 0 | 1 | 3 |
| `/support/overview` | 0 | 1 | 1 |
| `/financials/revenue` | 0 | 1 | 1 |
| `/financials/rider-wallets` | 0 | 1 | 1 |
| `/operations/requests` | 0 | 1 | 0 |
| `/admin/data` | 0 | 1 | 0 |
| `/operations/assurance` | 0 | 1 | 0 |
| `/support/disputes` | 0 | 1 | 0 |
| `/support/contact-centre` | 0 | 1 | 1 |
| `/operations/subscriptions` | 0 | 0 | 1 |
| `/operations/corporate` | 0 | 0 | 1 |
| `/management/overview` | 0 | 0 | 1 |
| `/management/reports` | 0 | 0 | 1 |
| `/operations/dispatch` | 0 | 0 | 1 |
| `/financials/overview` | 0 | 0 | 1 |
| `/financials/payouts` | 0 | 0 | 1 |
| **total** | **1** | **60** | **33** |

Most of the 60 majors are instances of the **nine shell-wide defects in §2**.
Fix those nine and the count drops to roughly 20.

---

## 2. Shell-wide defects — one fix, many screens

These are the highest-value fixes in the report. Each is one file.

### S1 — A short table is stretched to the fold, leaving 166–385px of empty card. 7 screens. **major**

The table sizes to its rows; the scroll box it sits in takes the page residual
(`containerClassName="min-h-54 flex-1 overflow-y-auto"`,
`src/components/DataTable.tsx:1502`, inside `PAGE_BLOCK_FILL`,
`src/components/PageShell.tsx:165`/`:213`). Rows stop; the white box does not.
This is the single largest source of the "nothing has changed" impression —
five screens are mostly empty white.

Measured live 18:27, all at 1440×900:

| route | rows | table height | scroll box height | **empty white below the last row** |
|---|---|---|---|---|
| `/support/tickets` | 3 | 221px | 606px | **385px** |
| `/financials/pricing` | 3 | 195px | 548px | **353px** |
| `/operations/my-work` | 2 | 142px | 460px | **318px** |
| `/financials/cash` | 4 | 248px | 524px | **276px** |
| `/financials/revenue` | 4 | 288px | 512px | **225px** |
| `/support/safety` | 6 | 354px | 520px | **166px** |
| `/operations/requests` | 6 | 354px | 520px | **166px** |

Fix: the box should take `max-height: residual`, not `height: residual`.

### S2 — Column headers scroll off the top on the 5 Admin stacked pages. **major**

On a `flow`-shaped page nothing bounds the table, so the sticky header's
containing block scrolls with the document. Measured: viewport `y` of `<thead>`
after scrolling `main` to its limit.

| route | `th` position | thead `y` at max scroll | scrolled | table |
|---|---|---|---|---|
| `/admin/policy` | **`static`** | **−7459px** | 8092px | 32-row reason codes |
| `/admin/communications` | `sticky top:0` | **−3516px** | 3737px | 25-row delivery log |
| `/admin/data` | **`static`** | **−1685px** | 1943px | 19-row integrity table |
| `/admin/team` | **`static`** | **−1551px** | 1785px | 21-row permission matrix |
| `/admin/workspace` | `sticky top:0` | **−1154px** | 2940px | 5- and 7-row tables |

`/admin/communications` also puts its pagination row at `y = −1480` at max
scroll — you scroll past "Showing 1–25 of 32" and can no longer see it.

`src/components/DataTable.tsx:1073` and `:1108` declare the sticky; three of the
five screens do not even get `position: sticky` applied. Origin:
`src/components/PageShell.tsx:213` (`body === 'flow'`).

Note: the *index* pages (`/financials/payouts`, `/operations/people`,
`/support/disputes`, `/financials/ledger`, `/support/fairness`) are correct as of
18:27 — thead pinned at `y=303`/`y=221`, pagination on screen at `y=850`. This
defect is confined to the five stacked Admin pages.

### S3 — 6 tables clip horizontally at 1440, hiding the action column. **major**

`DESIGN.md` D-2′ requires `scrollWidth === clientWidth` on index tables and names
the remedy ("if a view clips, the identity column's `min-w` drops first"). It was
verified at the 1280 floor. It fails at **1440**, a wider viewport:

| route | container clientW | scrollW | **hidden** | last column |
|---|---|---|---|---|
| `/financials/cash` | 1038 | 1280 | **242px** | **`Decision`** |
| `/admin/policy` | 1022 | 1226 | **204px** | — |
| `/management/zones` | 1038 | 1182 | **144px** | **`Actions`** |
| `/support/tickets` | 1038 | 1178 | **140px** | — |
| `/admin/workspace` | 860 | 946 | **86px** | — |
| `/admin/communications` | 1022 | 1098 | **76px** | — |

On `/financials/cash` the `Claim` buttons are visibly sliced by the right edge in
`docs/audit/shots/financials-cash-top.png`. Files: `src/components/ui/table.tsx:102`,
`src/components/DataTable.tsx:1502` (`tableMinInlineSize`).

### S4 — The view-tab strip is clipped on 4 screens, at 1440. **major**

`src/components/table/IndexToolbar.tsx:117–121`. The comment at `:100–116`
documents this as a deliberate degrade measured at the 1280 floor. At 1440 the
content region is 1136px and the toolbar row is 1038px, and it still cannot fit:

| route | strip clientW | scrollW | **hidden** | tabs |
|---|---|---|---|---|
| `/financials/ledger` | 436 | 587 | **151px** | 6: Trial balance … VAT & invoicing |
| `/support/fairness` | 436 | 500 | **64px** | 4: Suspension appeals … Captain economics |
| `/support/tickets` | 393 | 427 | **34px** | 5: Open … By reason code |
| `/financials/cash` | 383 | 400 | **17px** | 3: Reconciliation queue … Over cap |

The scrollbar is hidden by design, so there is **no visual cue that tabs exist
off-strip**. On `/support/fairness` and `/financials/cash` the *first* tab's
label is cut at its leading edge — see `docs/audit/shots/support-fairness-top.png` ("…sion
appeals") and `docs/audit/shots/financials-cash-top.png` ("Reconciliation queue" clipped left).
The toolbar is putting 6 sentence-length tabs and 5 controls on one row.

### S5 — On 6 of the 8 metric boards, most tiles' comparison slot is an em dash. **major**

Every tile reserves two lines for a delta. When there is no comparison the slot
renders `—` over `No comparison period yet` — a 20px line plus a 16px caption
inside a 128–150px tile.

| board | tiles | tiles whose delta is `—` |
|---|---|---|
| `/operations/overview` | 12 | **12 (100%)** |
| `/management/risk` | 8 | **8 (100%)** |
| `/management/growth` | 11 | **9** |
| `/support/overview` | 8 | **5**, and 2 whose *value* is `—` |
| `/admin/overview` | 6 | **5** |
| `/management/performance` | 6 | **4** |
| `/management/overview` | 11 | 1 |
| `/financials/overview` | 11 | 0 (uses a period caption instead) |

On `/operations/overview` that is 12 × ~36px ≈ **432px of tile area** on a 973px
page saying "no data". Two tiles on `/support/overview` have `—` as the
**headline value at 28px/600** — the most prominent thing on the page is nothing
(`Contacts per 1,000 trips`, `Uncoded contacts`).

### S6 — The comparison line is misaligned between tiles in the same grid row. **minor**

`/operations/overview`, row 1, four tiles all 251×150px at `y=190`. The `—` line
sits at **+117px** inside three of them and **+95px** inside the fourth
(`Unclaimed work`, which has no sub-label) — a **22px** step between adjacent
tiles. `/support/overview` row 1 has three offsets: +117, +95, +34.

Trailing empty space inside the tile follows the same split: 14px on eight tiles,
**36px** on four.

### S7 — Form fields run the whole card width. **major**

`DESIGN.md` §7.1 sets a **640px** measure for a form field column.

| route | fields over 640px | width | example |
|---|---|---|---|
| `/admin/policy` | 6 | **998px** | `Initial search radius, metres` = `5000` |
| `/admin/workspace` | 6 | **870px** | `Portal name` = `Eyvar` |

A 4-digit number in a 998px box. `src/screens/admin/policy/`,
`src/screens/admin/workspace/AdminWorkspaceScreen.tsx`.

### S8 — A dead column costs 112–176px of table width, on 6 tables. **major**

Columns measured to hold one distinct value across every visible row, or to be
empty on most of them. Action columns are excluded — an identical action per row
is correct.

| route | column | width | distinct values | note |
|---|---|---|---|---|
| `/operations/quick-rides` | `Kind` | 112px | **1 / 25** — "Quick ride" | the sub-tab *is* quick rides (D1b) |
| `/operations/subscription-trips` | `Kind` | 112px | **1 / 25** — "Subscription" | same |
| `/operations/people` | `City` | 128px | **1 / 25** — "Riyadh" | `src/data/fixtures/drivers.ts` is 13 Riyadh / 1 Jeddah |
| `/support/fairness` | `Deadline` | 160px | **2 / 17**, 16 rows `—` | |
| `/support/fairness` | `Owner` | 176px | **2 / 17**, 16 rows `—` | |
| `/financials/rider-wallets` | `Last activity` | 152px | 17 / 25 rows empty | |
| `/management/zones` | `Captains needed` | 148px | **5 / 6 rows blank** | |
| `/financials/revenue` | `Credit (SAR)` | — | **4 / 4 rows `—`** | a money column that is entirely em dash |

On `/support/fairness` the two dead columns are **336px of a 1038px table — 32%
of the width carrying one value between them.**

### S9 — Colour carries no meaning on two screens. **major**

Measured `getComputedStyle` on the rendered chips:

- `/support/safety`: **`Acknowledged`** = `rgb(27,81,196)` on `rgb(234,240,254)`
  (solid blue chip). **`Unacknowledged`** = `rgb(27,81,196)`, transparent
  background, border `rgb(12,105,68)` — **the same blue text, framed in the
  success green.** The state that needs attention is the calmer of the two.
- `/admin/team`: in the 21×7 permission matrix, **`Granted` and `Withheld` are
  byte-identical** — `12px`, weight `400`, `rgb(23,26,33)`, no background, no
  border, across **126 cells**. The entire meaning of the screen is unscannable.

For contrast, `/operations/subscriptions` gets this right: green `rgb(29,114,60)`
Active, amber `rgb(122,62,18)` Expiring/At risk, grey Expired/Cancelled, blue
Frozen.

---

## 3. Per-route findings, worst first

### 3.1 `/operations/my-work` — 1 blocker, 2 major, 1 minor

`docs/audit/shots/operations-my-work-top.png`

| # | sev | finding | evidence |
|---|---|---|---|
| 1 | **blocker** | **Three different counts for the same screen, all on screen at once.** The nav rail badge reads **22**, the page header reads **2 items**, the banner reads **13 items … past their deadline**, and the two rows shown have deadlines `1d 1h left` and `No clock` — neither is past. | badge: `src/data/fixtures/navCounts.ts:214` (`count: 22` = `myWorkBacklogSize()`, i.e. the *Unassigned* view); header count = the `Mine` view; banner = `listWorkItems({view:'breached'})`, `src/screens/operations/my-work/MyWorkScreen.tsx:229–234`, rendered at `:390`. The comment at `:220–227` claims *"every count on this screen respects every active filter"* — the banner does not respect the active view tab. |
| 2 | major | S1: 2 rows, 142px of table in a 460px box → **318px of empty white**. | measured 18:27 |
| 3 | major | The badge that opens the screen counts a view the screen does not land on (22 unassigned vs 2 mine). | `navCounts.ts:203–214` |
| 4 | minor | The screen loads with a filter chip already applied (`Queue routing: Your role`, `Filter 1`), which is what makes 22 become 2, but nothing on screen says so. | screenshot |

### 3.2 `/management/zones` — 5 major, 2 minor

`docs/audit/shots/management-zones-top.png`, `…-bottom.png`

| # | sev | finding | evidence |
|---|---|---|---|
| 1 | major | **The same six zones and the same ratio are rendered three times on one page** — as map pins, as the right-rail "Zones" list, and as the table. The rail and the table even carry the identical secondary string (`14 requests · 2 captains`). | page text, `main.innerText`; page height 1404px |
| 2 | major | **Two search inputs with the same placeholder** — `Search zones` at 294px (rail) and 235px (toolbar). | `input[placeholder]` census |
| 3 | major | `Captains needed` column, 148px: **5 of 6 cells blank**, one holds "3". The metric tile above already says "3 Captains needed". | column census |
| 4 | major | `Subscription momentum` column: values are only `100%`, `−100%` or `—` across all 6 rows. A percentage that is only ever ±100 is not a measurement. | column census |
| 5 | major | S3: table clips **144px**; the `Actions` column is off-screen. | clientW 1038 / scrollW 1182 |
| 6 | minor | Metric tile value is **20px/600** here but **28px/600** on every P5 board — same `group/card` component, same grid role, two sizes. | tile probe |
| 7 | minor | Subtitle says "1 of 4 cities live" while `src/data/fixtures/zones.ts` seeds all 6 zones `city: 'Riyadh'`. **Already partly fixed** — the redundant "Cities" table the owner reported was present at 17:47 and is gone by 18:02. |

### 3.3 `/financials/cash` — 4 major, 2 minor

`docs/audit/shots/financials-cash-top.png`

| # | sev | finding | evidence |
|---|---|---|---|
| 1 | major | S3: **242px clipped horizontally — the widest clip in the app.** The `Decision` column is off-screen and the `Claim` buttons are sliced by the viewport edge. | clientW 1038 / scrollW 1280 |
| 2 | major | S4: tab strip clipped 17px; **"Reconciliation queue" is cut at its leading edge** and "Over cap" at its trailing edge. | clientW 383 / scrollW 400 |
| 3 | major | S1: 4 rows, 248px of table in a 524px box → **276px of empty white**. | measured |
| 4 | major | Money column headers truncated: `Expected (S…`, `Deviation (S…` — the currency unit is cut out of a money column header. | screenshot |
| 5 | minor | `Deviation (SAR)` empty on 2 of 4 rows (`—` where the report was never filed). | column census |
| 6 | minor | 9 columns for 4 rows. | table probe |

### 3.4 `/support/fairness` — 4 major, 2 minor

`docs/audit/shots/support-fairness-top.png`

| # | sev | finding | evidence |
|---|---|---|---|
| 1 | major | S8: `Deadline` (160px) empty on **16 of 17** rows and `Owner` (176px) empty on **16 of 17** — **336px, 32% of the table width, carrying one value**. 32 of 85 body cells (37.6%) are em dashes. | column census |
| 2 | major | The banner says **"2 cases are past their deadline"** while the `Deadline` column reads `—` on 16 of 17 rows. The two cannot both be read. | `src/screens/support/fairness/copy.ts:126`, screenshot |
| 3 | major | S4: tab strip clipped **64px**; the first tab renders as "…sion appeals". | clientW 436 / scrollW 500 |
| 4 | major | `Suspension reason` — 4 distinct values over 17 rows, and all are truncated at the same point (`Rating below the 3.5…`), so the column reads as identical on every row. | column census |
| 5 | minor | `Decision` column truncated: `Yousef Al-Balawi · 18 M…`. | screenshot |
| 6 | minor | 5 columns for 17 rows, table 953px. | table probe |

### 3.5 `/admin/policy` — 4 major, 1 minor

`docs/audit/shots/admin-policy-top.png`

| # | sev | finding | evidence |
|---|---|---|---|
| 1 | major | **8940px page — 10.5 viewports, 12 tables, no in-page navigation, no section index.** | `main.scrollHeight = 8940` |
| 2 | major | S7: 6 number inputs at **998px** for values `5000`, `45`, `250`, `600`, `5`, `3`. §7.1 sets 640px. | field census |
| 3 | major | S2: `th` is `position: static`; the 32-row reason-code table's header reaches **y = −7459** at max scroll. | sticky probe |
| 4 | major | S3: 204px clipped horizontally. | clientW 1022 / scrollW 1226 |
| 5 | minor | Row height ranges **43 → 127px** across the 12 tables on this one page. | table probe |

### 3.6 `/admin/overview` — 3 major, 2 minor

| # | sev | finding | evidence |
|---|---|---|---|
| 1 | major | **This screen and `/admin/activity` contradict each other.** It renders an "Activity events" chart with a y-axis of 0–210 over 19–25 Jun. `/admin/activity`, the screen that lists those events, is empty by construction — `src/data/clients/audit.ts:41` (`let entries: AuditEntry[] = []`). | page text + `audit.ts:41` |
| 2 | major | "All 7 days, by on-call slots unassigned" lists **7 rows, every one of them `6`** (Friday 6 … Thursday 6 = the 42 in the tile). A ranked list whose every value is identical. | page text |
| 3 | major | S5: 5 of 6 tiles show `—` / "No comparison period yet". | tile probe |
| 4 | minor | One tile stacks two sub-labels — `— No percentage change to state` **and** `vs 0 target`. | page text |
| 5 | minor | The list values render at **12px weight 700** while the day names beside them are 14px weight 500 — the number is smaller than its label. | rank census |

### 3.7 `/admin/team` — 3 major, 1 minor

| # | sev | finding | evidence |
|---|---|---|---|
| 1 | major | S9: `Granted` and `Withheld` are visually identical across **126 cells** — 12px/400/`rgb(23,26,33)`, no chip, no colour. | tone probe |
| 2 | major | S2: `th` is `position: static`; the 21-row permission matrix header reaches **y = −1551** at max scroll, so you read "Granted / Withheld" with no column names. | sticky probe |
| 3 | major | 2633px page carrying four unrelated sections (operators, permission matrix, session policy, on-call rota) with no in-page nav. | `main.scrollHeight` |
| 4 | minor | Table header is 12px **weight 700** grey while body text is 12px weight 400 dark — the header out-weights the data. | rank census |

### 3.8 `/admin/workspace` — 3 major, 1 minor

| # | sev | finding | evidence |
|---|---|---|---|
| 1 | major | S7: 6 inputs at **870px** — `Portal name` = "Eyvar" (5 characters) in an 870px field. | field census |
| 2 | major | S2: thead reaches **y = −1154**; pagination reaches **y = −716** at max scroll. | sticky probe |
| 3 | major | 3788px page, 5 stacked sections, no in-page nav. | `main.scrollHeight` |
| 4 | minor | Three cards carry **28px of trailing empty space** each (`Logo`, `Terms of service`, `Privacy notice`). | dead-space probe |

### 3.9 `/support/tickets` — 3 major

| # | sev | finding | evidence |
|---|---|---|---|
| 1 | major | S1: 3 rows, 221px of table in a 606px box → **385px of empty white — the worst in the app.** | measured |
| 2 | major | S3: 140px clipped horizontally. | clientW 1038 / scrollW 1178 |
| 3 | major | S4: tab strip clipped 34px of 5 tabs. | clientW 393 / scrollW 427 |

Row height here is **77px** against 53px on most index tables.

### 3.10 `/admin/activity` — 2 major, 2 minor

`docs/audit/shots/admin-activity-top.png`

| # | sev | finding | evidence |
|---|---|---|---|
| 1 | major | **The screen is permanently empty.** `src/data/clients/audit.ts:41` seeds `entries = []` and the comment at `:37–40` says so deliberately. One of the 36 sub-tabs shows nothing, every time, on a cold load. Total page text: **275 characters** — the least of any route. | `main.innerText.length = 275` |
| 2 | major | It contradicts `/admin/overview`'s "Activity events" chart (see 3.6). | |
| 3 | minor | The empty-state card is 656px tall with **320px of trailing dead space** below its last element. | dead-space probe |
| 4 | minor | Three view tabs, a search field, `Filter` and `Columns` render above zero rows — six controls for no data. | screenshot |

### 3.11 `/admin/communications` — 2 major, 1 minor

| # | sev | finding | evidence |
|---|---|---|---|
| 1 | major | S2: thead reaches **y = −3516** and the pagination row reaches **y = −1480** at max scroll on a 4585px page. | sticky probe |
| 2 | major | S3: 76px clipped horizontally. | clientW 1022 / scrollW 1098 |
| 3 | minor | **21 distinct type ranks** in `main` — the most of any route (`size|weight|colour` triples over visible text). | rank census |

### 3.12 `/support/safety` — 2 major, 1 minor

`docs/audit/shots/support-safety-top.png`

| # | sev | finding | evidence |
|---|---|---|---|
| 1 | major | S9: `Acknowledged` is a solid blue chip; `Unacknowledged` is the **same blue text in a green-bordered outline**. Two unacknowledged Critical SOS rows are the calmest thing in the column. | tone probe |
| 2 | major | S1: 6 rows, 354px of table in a 520px box → **166px of empty white**. | measured |
| 3 | minor | `Severity` mixes treatments: `High` and `Critical` are amber chips, `Normal` is plain text. | screenshot |

### 3.13 `/operations/quick-rides` and 3.14 `/operations/subscription-trips` — 2 major each

| # | sev | finding | evidence |
|---|---|---|---|
| 1 | major | S8: the `Kind` column (112px) holds **one value across all 25 rows** — "Quick ride" / "Subscription". D1b split these into two `kind`-scoped sub-tabs, so the column now restates the page title on every row. | column census; `src/screens/operations/trips/TripsScreen.tsx:405` |
| 2 | major | 9 columns; `/operations/quick-rides` clips 10px horizontally. | table probe |

### 3.15 `/operations/people` — 2 major

| # | sev | finding | evidence |
|---|---|---|---|
| 1 | major | S8: `City` column (128px) is **"Riyadh" on all 25 rows**. | column census; `src/data/fixtures/drivers.ts` = 13 Riyadh / 1 Jeddah |
| 2 | major | Row height **60px** vs 53px on sibling index tables. | table probe |

### 3.16 `/operations/overview` — 2 major

| # | sev | finding | evidence |
|---|---|---|---|
| 1 | major | S5: **12 of 12 tiles** show `—` / "No comparison period yet" — ~432px of a 973px page. | tile probe |
| 2 | major | S6: comparison line at +117px in three tiles and +95px in the fourth, same grid row. | tile probe |

### 3.17 `/financials/pricing` — 2 major

S1: 3 rows, 195px in a 548px box → **353px of empty white**. S4: tab strip clipped
34px. Also: the page's only banner is a blue "Prices are read-only until the rate
card owner is decided" — an unresolved design decision shipped as UI.

### 3.18 `/financials/ledger` — 2 major

S4: **151px of tab strip hidden — the worst in the app**, 6 tabs in a 436px
track. S1-adjacent: 18 rows, 990px table, page 1241px.

### 3.19 `/management/risk` — 1 major, 2 minor

S5: **8 of 8 tiles** show `—`. Three cards carry **38px of trailing empty space**
each (`Revenue at risk`, `Subscriptions predicted to churn`, `Captains at risk of
unavailability` — 166px tall each). Chart plot band uses 64% of its 192px svg,
the lowest measured.

### 3.20 `/management/growth` — 1 major, 1 minor

S5: 9 of 11 tiles show `—`. One tile reads `0 New riders` with `−100% down, which
is worse` — a −100% delta on a zero value.

### 3.21 `/management/performance` — 1 major, 3 minor

S5: 4 of 6 tiles show `—`. The 4-column grid holds 6 tiles, so **row 2 has two
empty cells — 502×128px of nothing**. "Top 5 captains by late-trip share" footers
with "Showing the top 5 of 6 captains" — a top-5 over a population of 6. The rank
values render at **12px/700** while the captain names beside them are **14px/500**
— the number that orders the list is smaller than the label. The on-time-pickups
y-axis runs to **105%** on a metric bounded at 100.

### 3.22 `/support/overview` — 1 major, 1 minor

S5: 5 of 8 tiles show `—`, and **2 tiles have `—` as their headline value at
28px/600** (`Contacts per 1,000 trips`, `Uncoded contacts`) — the most prominent
element on the page is an em dash. Both charts read "Nothing is recorded here
yet."

### 3.23 `/financials/revenue` — 1 major, 1 minor

S1: 4 rows, 288px in a 512px box → **225px empty**. `Credit (SAR)` is `—` on all
4 rows.

### 3.24 `/financials/rider-wallets` — 1 major, 1 minor

S8: `Last activity` (152px) empty on **17 of 25** rows. 25 rows × 6 columns is the
thinnest index table in the product.

### 3.25 `/operations/requests` — 1 major

S1: 6 rows, 354px in a 520px box → **166px empty**. `Owner` column is
"Unclaimed / Claim" on all 6 rows.

### 3.26 `/operations/assurance` — 1 major

S4: tab strip clipped 72px. 10 rows, 566px table filling its box exactly.

### 3.27 `/support/disputes` — 1 major

Densest page in the product: **6631 characters of text, 17 type ranks, 25 rows ×
7 columns, 1854px**. `What is claimed` cells carry a full sentence of body copy at
12px grey (76 instances) — the table is doing the job of a detail view.

### 3.28 `/support/contact-centre` — 1 major, 1 minor

`Owner` column is "Unclaimed / Claim" on all 7 rows (176px). **19 type ranks**. 6
of 49 body cells are em dashes.

### 3.29 `/admin/data` — 1 major

S2: `th` is `position: static`; the 19-row integrity table's header reaches
**y = −1685** at max scroll on a 2791px page.

### 3.30–3.36 The remainder — 1 minor each

| route | finding |
|---|---|
| `/operations/subscriptions` | 8 columns, 25 rows; tab strip clipped 17px. Badge tones are **correct** here — green/amber/grey/blue — and are the model the rest of the product should copy. |
| `/operations/corporate` | 1683px, 25 rows × 7. Clean. |
| `/management/overview` | S5 affects only 1 of 11 tiles. The best board in the product. |
| `/management/reports` | 7 rows, 383px, fills its box. Clean. |
| `/operations/dispatch` | 16 type ranks on a 925px page; the monitor shell reads as busy but nothing measured is wrong. |
| `/financials/overview` | 11 tiles, **zero** dead deltas — it uses a period caption instead. The model for S5's fix. |
| `/financials/payouts` | 2068px of table content, correctly bounded, header pinned, pagination on screen. The model for S1/S2's fix. |

### 3.37 Arabic / RTL — no defects found

Loaded 4 routes with `dir="rtl"` and re-measured:

| route | LTR h1 inset (start / end) | RTL h1 inset (start / end) | doc scrollW | page height |
|---|---|---|---|---|
| `/management/zones` | 48 / 906 | 906 / 48 | 1440 = 1440 | 1404 both |
| `/operations/people` | 48 / 1008 | 1008 / 48 | 1440 = 1440 | 1779 both |
| `/financials/cash` | 48 / 850 | 850 / 48 | 1440 = 1440 | 848 both |
| `/admin/policy` | 48 / 877 | 877 / 48 | 1440 = 1440 | 8940 both |

The gutter mirrors exactly (48px start in both directions), no horizontal
overflow appears, page heights are identical. The only elements outside `main`'s
box in RTL are the same ones as in LTR — the horizontally clipped table cells of
S3.

---

## 4. Provenance — read this before acting

Other agents were editing this tree throughout the sweep. That is not a
complaint; it changes how you should read the numbers.

**What changed under me, with timestamps:**

- **17:55** — `PageShell.tsx` `PAGE_BLOCK` changed from `flex h-full min-h-0 …`
  to `flex min-h-full …`. This fixed the clipping class the owner reported. I had
  measured it live before the change: `/management/zones` `main.scrollHeight` 890
  against content extending to 1291 — **401px unreachable**, and the
  `docs/audit/shots/management-zones-bottom-PRE-FIX-1747.png` capture from that run shows the zones table still
  off-screen after scrolling `main` to its limit. **That defect is real, it is
  fixed, and I re-verified the fix** (zones now scrolls 1404px and the table is
  on screen — `docs/audit/shots/management-zones-bottom.png`).
- **18:00–18:26** — `globals.css` was rewritten roughly every 30 seconds.
- **18:20** — a `body?: 'fill' | 'flow'` prop landed on `SingleColumnPage`,
  restoring the bounded table scroller on index pages.
- **18:23** — `DataTable.tsx` returned HTTP 500 from Vite for ~60 seconds
  (mid-save syntax error); 11 routes fell to the route-level ErrorBoundary and
  `/operations/subscriptions` rendered no `<main>` at all. **This was transient
  and is not a product defect.** It did demonstrate that the error boundary works
  and names the screen ("Couldn't display People", with `Try again` / `Go to
  overview`).

**Three findings I discarded because they were measurement artefacts** — listed
so nobody re-files them:

1. *"`h1` is 22px on Management/Operations and 24px on Support/Admin."* False.
   The split fell at exactly route 20 of 36 because `globals.css` changed
   mid-run. On a frozen snapshot the `h1` is **24px / weight 600 /
   `rgb(23,26,33)` on all 36 routes.**
2. *"Two of the five zones tiles have no card border."* False — the border is
   painted by a descendant my first probe did not walk to. All tiles are
   `1px rgb(240,242,244)` on `rgb(255,255,255)`, radius 8px.
3. *"The on-time-pickups chart wastes 90% of its plot area."* False. Measured
   plot-band utilisation is **64–82%** across all five charted boards, which is
   normal.

**How to reproduce.** Frozen snapshot of the tree at 18:02:14 with a separate
Vite instance on port 5477 (port 5199 untouched); measurement scripts and the full set of 72 screenshots in the session scratchpad; the 11 cited here are committed under `docs/audit/shots/`. Two independent full sweeps
(18:0x frozen, 18:28 live) agree on every number in §2 and §3.

**No source file was modified by this audit.** This document is the only file
written.
