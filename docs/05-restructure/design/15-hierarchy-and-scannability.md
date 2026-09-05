# 15 — Hierarchy and scannability: making the important things look important

**Status:** proposal. Third of three. `13-plane-refresh.md` owns the *visual language*, `14-system-wide-ux-plan.md` owns the *product surface*, this owns the **information hierarchy**.
**Brief:** *"enhance the visibility of important items, the scannability of every page and sheet, make it easy to read and grasp the more important data."*
**Method:** measured emphasis distribution across all 205 source files. Every number below is a grep count.

---

## 0. The diagnosis: all three emphasis channels are saturated

A UI has exactly three channels for saying "this matters more": **size**, **weight**, and **colour**. Eyvar Admin currently spends all three on almost everything, which means none of them signals anything. You cannot make an item stand out by adding emphasis — you make it stand out by **removing emphasis from everything around it**, and right now there is no baseline left to stand out from.

### 0.1 Size — the product runs two steps below its own declared body size

| Class | Resolves to | Uses |
|---|---|---|
| `text-2xs` | **11px** (12 in Arabic) | **151** |
| `text-xs` | **12px** (13 in Arabic) | **473** |
| `text-sm` | 14px — *the declared body size* | 244 |
| `text-base` | 16px | 24 |
| `text-lg` | 17px | 9 |
| `text-xl` | 22px | 4 |

**The dominant size in the product is 12px, not 14px.** `text-xs` outnumbers `text-sm` nearly 2:1, and there are 151 uses of an 11px step below that. DESIGN.md §14 raised the whole ramp precisely so this would not happen — and then the components reached one or two steps down anyway. The floors are doing their job; the *choices* are undoing it.

The consequence compounds: when body text is 12px, a 14px item is not "emphasis", it is merely "normal". The ramp has been consumed from the bottom, so the top has nowhere to go.

### 0.2 Colour — two-thirds of the ink on screen is grey

```
text-muted-foreground   462  ██████████████████████████████
text-foreground         238  ███████████████
```

**Muted outnumbers ink 2:1.** When most of the page is grey, grey stops meaning "secondary" and becomes the default — and the actual data no longer separates from the chrome around it.

**And it is structural, not incidental.** `DataTable.tsx:1253`:

```
/* ink belongs to the identity column; the rest of the row is quieter.
   `TableCell` defaults to `--ev-text-2` and index 0 takes it back. */
columnIndex === 0 && 'text-foreground',
```

So on the captains table, the name is ink and **status, rating, trips, earned, city and id are all `#6b7280` grey**. The operator scanning for "who has a low rating" or "who earned the most" is scanning grey numbers that look exactly like the city name they are ignoring.

**This is the single most important finding in this document**, and it needs care, because the rule is not wrong — it is *half* right. It came from D7 and the match audit, which found our tables 3× too dark against the reference and correctly quietened them. But the reference is Navattic, a marketing-analytics tool whose tables are a light supporting element. **Eyvar is an ops console where the numbers are the entire job.** The audit's insight — "not everything is ink" — is sound. Its implementation collapsed *data* and *metadata* into one quiet tier, and data is what the operator came for.

### 0.3 Weight — nearly everything carries one

```
font-medium    226        font-semibold  167
font-bold       20        font-normal     36
```

**429 weighted against 36 explicitly normal.** Weight is the cheapest emphasis channel and it has been spent almost everywhere, so it too now carries no information.

### 0.4 The one KPI number in the product is 17px

`MetricTile.tsx:192` renders the value at `text-lg` — **17px, semibold** — with a 12px label under it. On a dashboard whose entire purpose is a number, the number is five pixels larger than the caption beside it.

The header at `:54` states this was deliberate: *"value 17px/600 (`--text-lg`, **not** a display size ... value out-weighs its label)"*, derived from the reference's 3-up stat row. It is faithful to the reference. It is also the reason a metric board does not read as a metric board — Plane's analytics leads with a large numeral and a small label above it, and that inversion is most of what makes an analytics page feel confident.

### 0.5 Two more, found on the way

- **The critical-row highlight — the strongest visibility mechanism in the product — is built from off-token Tailwind rose.** `DataTable.tsx:848`, `:1215`, `:1257` carry `bg-rose-50/95`, `bg-rose-100/80`, plus `dark:bg-rose-950/*` variants that can never apply. (This corrects `14-system-wide-ux-plan.md`, which said `DataTable` was clean — that check used a palette list that omitted `rose`.)
- **Six tables carry 15–25 column definitions.** `RevenueScreen` 25, `LedgerControlsScreen` 23, `AssuranceScreen` 20, `PayoutsScreen` 18, `RidersView` and `PricingScreen` 16, `CaptainsView` and `CashScreen` 15. (Counts span several views per file, but the widest single view in each is still very wide.) A 15-column table has no hierarchy available to it at any type size.

### 0.6 What is already right — do not "fix" these

- **`align: 'end'` on 82 columns** and **`tabular-nums` in 147 places.** Number alignment is genuinely well done.
- **`secondaryLine` on 15 of 21 `DataTable` screens** — the two-line identity cell, growing to fit rather than truncating. This is exactly the right pattern and it is widely adopted.
- **`font-mono` is used for IDs and codes only**, never for money. Correct.
- **`MetricTile`'s absence handling** (`value === null` states *why*, and suppresses a delta that would be meaningless) is better than most shipping products manage.

---

## 1. The fix: three emphasis tiers, declared not improvised

One principle, applied in four places. **Every piece of text on screen belongs to exactly one of three tiers, and the tier is declared in data rather than chosen per call site.**

| Tier | Treatment | What belongs here |
|---|---|---|
| **Primary** | `--ev-ink`, `font-medium`, 14px | The identity of the thing. One per row, one per card, one per section |
| **Data** | `--ev-ink`, `font-normal`, 14px, `tabular-nums` | **The values the operator came to read.** Amounts, counts, ratings, statuses, deadlines |
| **Meta** | `--ev-text-2`, `font-normal`, 12px | Everything else: ids, cities, timestamps, provenance, helper text |

The whole change is that **Data is currently merged into Meta**, and separating them costs one enum.

### H1 · Give `Column` an emphasis tier *(the highest-leverage change in this document)*

```ts
type Column<T> = {
  …
  /** Which emphasis tier this column's value belongs to.
   *  Defaults to 'meta' — the current behaviour — so nothing changes until a
   *  screen opts in, and the migration is column-by-column and reversible. */
  emphasis?: 'primary' | 'data' | 'meta'
}
```

`DataTable.tsx:1253` stops keying emphasis off `columnIndex === 0` and reads the tier instead. Column 0 defaults to `primary`, preserving today's behaviour exactly.

Then, per screen, mark the two-to-four columns the operator actually scans as `data`. On `CaptainsView` that is **status, rating, earned** — and `city`, `id` and the timestamps stay `meta`, which is where D7's insight was right all along.

**Why this is the right shape rather than "make the table darker":** it keeps the ratio of ink to grey roughly where the match audit put it, so the table does not go back to reading heavy. It just spends the ink on the right columns. A 15-column table with 3 ink columns still reads as light — but now it has a scan path.

### H2 · Reclaim the type ramp
- **`text-sm` (14px) becomes the default for row content**, replacing `text-xs`. The 473 `text-xs` uses get triaged: values → `text-sm`, metadata → stays.
- **Cap `text-2xs` (11px) to its declared job** — badge labels and count-badge numerals, which is what `globals.css:1132` says it is for. Its other uses (notably the `font-mono text-2xs` ID lines across the five `admin/communications` cards) go to `text-xs`.
- **No new sizes.** The ramp is fine; it is being under-used at the top and over-used at the bottom.

### H3 · Spend weight deliberately
`font-medium` becomes the marker of the **Primary** tier and stops being decoration. Data and Meta are `font-normal`. This is a large find-and-replace with a small footprint per site, and it is what makes `font-medium` mean something again.

### H4 · Let the KPI number be a number
`MetricTile` value: `text-lg` (17px) → **`text-xl` (22px)**, and invert the order so the label sits **above** the value at `text-2xs` uppercase-tracked, per Plane's analytics tiles. The tile keeps its glyph, caption and delta chip exactly as they are.

This is a deliberate, documented amendment to `03-visual-language.md` §4.9, on the grounds that Eyvar's metric boards answer a different question than the reference's stat strip. It should be recorded in `DECISIONS.md`, not slipped in.

### H5 · Put the critical row back on-token — **and re-derive the ink on it**

> **AMENDED after an independent audit ran axe against the built app.** The swap alone is not enough, and proposing it alone was a mistake.

The critical-row tint is currently `bg-rose-50/95` (`#fff1f2`). An axe run measured **`--ev-text-2` on that ground at 4.40:1 — a real AA failure**, hit on `/operations/trips` (breached and cancelled rows) and `/financials/payouts` ("No bank account on file"). **The rows that matter most are the only rows in the product whose text fails contrast.**

And the obvious fix does not work. Computed directly:

| ground | `--ev-text-2` `#6b7280` | AA 4.5 |
|---|---|---|
| white `#ffffff` | 4.83 | pass |
| `bg-rose-50/95` `#fff1f2` — today | **4.40** | **fail** |
| `--ev-red-lt` `#fef0ee` — my proposed fix | **4.35** | **fail, worse** |

So H5 is now two changes, not one:
1. Replace the three rose sites with a token, and delete the `dark:` branches.
2. **Give the critical row its own ink token**, derived against its ground, exactly as `--ev-text-2-rail` was derived when `--ev-bg-rail` darkened. `globals.css` already states the law this violates: *"Darkening a surface without re-deriving the ink on it is how a re-skin quietly drops below AA."* The critical row is that sentence happening.

**This makes H5 the highest-priority item in this document**, ahead of H1 — it is an accessibility failure on the rows the product most needs an operator to read.

### H6 · Column presets for the six wide tables
The column popover already exists (`ColumnLayoutPopover`). What the wide tables need is **named presets** — a 20-column table should open on a curated 7-column default with `All columns` one click away, and the preset should persist per operator per view (D16).

`AssuranceScreen` already does the right version of this (four views, four column sets, "no card ever stacked under another"). **Generalise its approach to Revenue, Ledger, Payouts, Riders, Pricing and Cash.**

### H7 · A badge budget
`StatusBadge` runs up to 7 declarations in one file (`queues/queue.tsx`). Rule: **at most one badge per row in the identity column, plus at most one status column.** A row carrying four coloured chips has no focal point, and R7's five-tone palette gets diluted into decoration.

---

## 2. Per-surface application

Only surfaces where the change is more than "apply H1–H3" are listed.

### 2.1 Index tables (19 screens)
H1 is the whole job. Suggested `data` columns, chosen as "what would you scan this table *for*":

| Screen | `data` tier |
|---|---|
| `CaptainsView` | status · rating · earned |
| `RidersView` | status · trips · wallet balance |
| `ApplicationsView` | stage · age-in-stage |
| `TripsScreen` | status · fare · duration |
| `SubscriptionsScreen` | status · renewal date · MRR |
| `RequestsScreen` | **type** · clock · status — the two clocks are the point of this queue |
| `AssuranceScreen` | readiness · coverage · commitment |
| `PayoutsScreen` | payable · **net** · status |
| `CashScreen` | outstanding debt · age |
| `RevenueScreen` | amount · delta |
| `PricingScreen` | price · active subscribers |
| `LedgerControlsScreen` | debit · credit · balance |
| `TicketsScreen` / `DisputesScreen` / `FairnessScreen` / `SafetyScreen` | SLA clock · status |
| `AlertsView` | state · last fired |
| `AdminActivityScreen` | actor · action |
| `EmailLogCard` | delivery state |
| `ZonesScreen` | demand · supply gap |

### 2.2 Queues — the clock is the most important thing on the row
Five queue screens (`Requests`, `Assurance`, `Safety`, `Fairness`, `My Work`) are organised around a deadline. **The SLA clock should be the one `data`-tier item that also carries weight**, and per §4.4's two-carrier rule it must render as **text plus tone**, never tone alone — which also means a breached row survives the reduced-motion and colour-blind cases without losing its meaning.

`FairnessScreen` is the special case worth getting right: its target lives per-row (48h for a rating dispute, 24h for a suspension appeal), so the row must show **elapsed against its own target**, not a bare duration. A bare `18h` means opposite things on two adjacent rows.

### 2.3 Detail surfaces and sheets
The properties rail (`13-plane-refresh.md` §3.2) is a label/value list, and it is the clearest place to apply the tiers: **labels are Meta at 12px in a fixed column, values are Data at 14px ink.** Currently `profile/fields.tsx` and `sections.tsx` render both at similar emphasis, so a 20-row rail has no scan path.

Same rule for the three drawers and the four full-page details.

### 2.4 Card-stack and settings screens
`AdminWorkspaceScreen`, `AdminPolicyScreen`, `SlaPolicyCards`, `OperationalCards`, `CorporateDetailScreen`, `PlanEditorScreen`. The G7 two-column settings row from `14-system-wide-ux-plan.md` *is* the hierarchy fix here — label and helper text Meta on the leading side, control on the trailing side. Nothing further needed.

### 2.5 Metric boards
H4, plus one structural note: `MetricTileRow` is a 3-up or 4-up grid, and **the first tile should be the one the page is named after.** Several boards currently order tiles by data availability rather than importance. That is a fixture ordering change, not a code change.

### 2.6 The two off-system screens
`ZonesMapView` and `DispatchScreen`/`InterventionsCard` get their hierarchy for free once `14`'s G11 lands — they currently have no tier discipline at all because they have no token discipline at all.

---

## 3. Sequencing

Slots into `14-system-wide-ux-plan.md` Part C. Small and mostly mechanical.

| # | Work | Days | Notes |
|---|---|---|---|
| 1 | **H5** critical row on-token | 0.25 | 3 sites, also deletes dead `dark:` branches |
| 2 | **H1** `Column.emphasis` + `DataTable` reads it | 0.5 | Defaults to today's behaviour; nothing changes until opted in |
| 3 | **H1** applied to all 19 tables | 1.5 | Table above; per-screen and reversible |
| 4 | **H4** KPI numeral | 0.25 | Plus a `DECISIONS.md` entry amending §4.9 |
| 5 | **H2 + H3** ramp and weight reclaim | 2 | The largest, most mechanical piece |
| 6 | **H7** badge budget | 0.5 | Mostly deletion |
| 7 | **H6** column presets for 6 wide tables | 1.5 | Generalises `AssuranceScreen`'s existing approach |
| 8 | **§2.3** properties rail tiers | 0.5 | Rides along with peek |

**≈7 days.** Best done **after** `14`'s items 1–6 (brand, motion, density, confirm/modal/toast unification) — density changes row height, and re-tiering emphasis on top of the old 40px row means doing the visual judgement twice.

### The single highest-value item
**H1, steps 2–3: two days.** It is the difference between a table where the operator reads every cell to find the one that matters, and a table where the three columns that matter are the only ones that catch the eye. Everything else in this document is refinement around it.

### The one ruling this needs
**H4 and H1 both amend `03-visual-language.md`** — §4.9 for the metric value, §4.5 for row ink distribution. Both amendments rest on the same argument, and it should be accepted or rejected once, as a whole:

> The reference is a marketing-analytics product whose tables and stat strips are supporting elements. Eyvar is an operations console where the numbers *are* the work. D7's derivation is sound; its conclusion was calibrated for a page with a different job. **The fix is not more ink overall — it is the same ink, spent on the columns the operator actually reads.**
