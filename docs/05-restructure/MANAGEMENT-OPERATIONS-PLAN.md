# Management and Operations — audit and remediation plan, 2026-09-04

> **Companion to** [`REMEDIATION-PLAN.md`](REMEDIATION-PLAN.md) (is it correct?) and
> [`OPERATOR-EXPERIENCE-PLAN.md`](OPERATOR-EXPERIENCE-PLAN.md) (how fast can one operator
> work?). This one asks, for the 17 sub-tabs under Management and Operations only:
> *what does an operator see, what can they not do, and what should change first?*
> Findings that already live in the two companions are referenced by their task id, not
> repeated.

## 0. Scope and method

**Routes audited** — every row of `routeTable.ts` with `workspaceId` `management` or
`operations`, plus their level-3 details:

| Workspace | Sub-tab | Screen file |
|---|---|---|
| Management | Overview · Performance · Risk & Signals · Growth | `screens/metrics/MetricBoardScreen.tsx` (one component, four boards) |
| Management | Market & Zones | `screens/management/zones/ZonesScreen.tsx` + `ZonesMapView.tsx` |
| Management | Reports (3 views + 2 details) | `screens/reports/*` |
| Operations | Overview | `MetricBoardScreen.tsx` |
| Operations | My Work | `screens/operations/my-work/MyWorkScreen.tsx` |
| Operations | Live Dispatch | `screens/operations/dispatch/*` |
| Operations | Ride requests · Subscription requests | `screens/operations/requests/RequestsScreen.tsx` |
| Operations | Subscriptions | `screens/operations/subscriptions/SubscriptionsScreen.tsx` |
| Operations | Corporate accounts + detail | `screens/operations/corporate/*` |
| Operations | Quick rides · Subscription trips | `screens/operations/trips/TripsScreen.tsx` |
| Operations | Trip Assurance | `screens/operations/assurance/AssuranceScreen.tsx` |
| Operations | People (4 views) + applicant detail | `screens/operations/people/*` |

**Evidence.** Every screen file above was read in full. Every route was rendered in
Chromium against the dev server at **1280 × 800** (D2's minimum) and the boards, the
two maps and a detail page again at **1280 × 2000** and **1440 × 900**; six screens were
captured in Arabic. `npm run typecheck` is clean and the eight test files under these
directories pass (109 tests). The capture script is
`scratch`-grade and is proposed for `scripts/harness/` in §5 (task T8.2).

Line numbers cite the working tree on branch `feat/remediation-and-ux-phase1` at
commit `f9916cc`.

## 1. What is already right — do not re-fix

The remediation waves landed. Nothing below should be re-litigated:

- **All four states** are wired on every screen audited; page-scoped error on a failed
  whole-read, card-scoped inside a card, row-scoped on a failed action.
- **§11.2 refusals** are disabled-in-place with a sentence on every table, every kebab,
  every bulk bar and both maps. The subscriptions row menu is the reference example
  (`SubscriptionsScreen.tsx:513-533`).
- **D21 bulk semantics** (refuse the set, three sentences, `Select only the N eligible`)
  on Trips, Subscriptions, Requests, Assurance, My Work, Captains, Compliance.
- **URL-as-state** for `q`, `sort`, `page`, `filter`, `view` (`useIndexTable.ts` header).
  P1-T1 is done.
- **P8-T1 reach**: every cell that names an entity is an `EntityLink` that resolves
  through `useEntityLinks` and degrades to text with a reason.
- **Tokens**: a grep for Tailwind palette classes across the four directories returns
  nothing; the three raw hex values found are all inside comments. Three arbitrary values
  remain (`ApplicantDetailScreen.tsx:535`, `DocumentScan.tsx:218`).
- **Arabic** is real: 45 dictionary files, 6,971 lines, and `dir="rtl"` renders on every
  route with no Latin leak in headings, tabs, headers or buttons. The leaks that remain
  come from the **data layer**, not the screens (§2, X2).
- **Maps** share one projection and one basemap; both are keyboard-operable; the
  choropleth and the dispatch marks differ by shape before colour.

## 2. Cross-cutting findings

Each is one defect appearing on several screens. Fixing it once is the plan.

### X1 · The `wide` breakpoint is above the product's minimum viewport

`@custom-variant wide (@media (min-width: 1344px))` (`globals.css:237`) and D2 sets the
minimum viewport at 1280. Everything that says `wide:` therefore **never applies at the
size the product promises to work at**. Measured at 1280 × 800:

| Screen | What happens below `wide` | Measured |
|---|---|---|
| Market & Zones | the inspector + zone list stack **under** a 4:3 map (`ZonesMapView.tsx:637`) | panel top at **1105px**; both actions off-screen. At 1440 the panel floats at 323px |
| Live Dispatch | feed panel and layer rail stack under the map (`DispatchMap` grid, `PageShell.tsx:377`) | first viewport is header + map only; the pending list and `Assign captain` are below the fold |
| Corporate detail (and every `DetailPage`) | the rail restacks beneath main (`PageShell.tsx:349`) | lifetime spend and the invoice card are below the fold |
| Zones strip | 5 readings become 3 + 2 (`ZonesScreen.tsx:545`) | second row of readings |

The operator's own screen is 1280. §0.1 says there is one breakpoint; that ruling and D2
cannot both stand for map and detail layouts. **Owner decision O1** (§4).

### X2 · English is assembled in the data layer and reaches Arabic screens

`t()` covers the screens; the rows do not.

- `clients/myWork.ts:98-99, 130, 176, 205-206, 238` build `title` and `subtitle` by
  template: `` `Captain application — ${a.name}` ``, `` `${i.type} — ${i.summary}` ``,
  `` `${c.kind} — ${c.driverName}` ``, `documents outstanding`, `departs …`. In Arabic the
  My Work table reads `…pension-appeal — Reem Al-Otaibi` and `Economy · 0 documents
  outstanding` (capture `ar-mywork-1440`). Two of them print an **enum slug** as the title.
- `FeedPanel.tsx:225, 226, 312, 315` render `request.channel`, `request.vehicleClass`,
  `trip.kind` and `driver.vehicleClass` raw. In Arabic the dispatch feed shows `instant`,
  `subscription`, `Economy`, `Comfort` (capture `ar-dispatch-1440`).
- `CorporateScreen.tsx:243, 266, 278` render `billingType`, `status` and `` `Day ${n}` ``
  raw; the status filter labels are the values (`:254`). `CorporateDetailScreen.tsx:278`
  joins `id · billingType · status`; `:384, :426, :454` carry English placeholders;
  `:628` prints `Day {n} of month`. Capture `ar-corporate-1440` shows `Monthly invoice`,
  `Pending`, `Day 1` untranslated.
- `ApplicantDetailScreen.tsx:252` and `ApplicationSheet.tsx:222` join the meta line with
  `' · '` in code, which AC-75 forbids.

### X3 · Nav badges are seeded literals that never refresh and do not say what they count

`fixtures/navCounts.ts:220-283` seeds `my-work: 25`, `ride-requests: 4`,
`subscriptions: 8`, `people: 7`; only `management-zones` is computed
(`navCounts.ts:72-92`). The shell reads them once (`ShellContext.tsx:272`, `deps: []`).
On screen: **Ride requests badge 4 beside a queue of 3**, **My Work 25 beside "5 items"**,
**Subscriptions 8 with nothing on the page that is 8**. The badge has no accessible
description of what it counts (`PageNav.tsx:356` renders the number only). Operators
learn to ignore a number they cannot reconcile. (Companion: P8-T2.)

### X4 · Nothing on Operations is live, and two screens say it is

`DispatchScreen.tsx` imports no `useTick` and has no poll; the meta reads *"4 in transit ·
live telemetry connected"* (`:294`) and the header prints `42s · 96.4% · 78.2%` from the
`TELEMETRY` literal (`:107-111`). The green connection dot is static by design (R18) but
the sentence beside it is a claim. Zones' steer offer is the only ticking value in the
workspace (`clients/zones.ts:467`). (Companion: P8-T3.)

### X5 · Six controls render disabled because the write does not exist

| Control | Where | Missing operation |
|---|---|---|
| Change captain | `SubscriptionsScreen.tsx:520-526` | `reassignSubscriptionDriver` |
| Unlink employee | `CorporateDetailScreen.tsx:206, 553-561` | `removeCorporateEmployee` |
| Send invoice | `CorporateDetailScreen.tsx:207, 643-655` | `sendCorporateInvoice` |
| Acknowledge / Reassign intervention | `InterventionsCard.tsx:110-128` | an `Intervention` type, fixture and `clients/dispatch.ts` — nothing under `src/data` mentions one |
| Match time / auto-match / utilisation | `DispatchScreen.tsx:107` | a telemetry read |

`clients/subscriptions.ts` exports `freezeSubscription` and `cancelSubscription` only;
`corporateAccounts.ts` has no remove or invoice. Truthful dead controls are the right
interim; they are still six things an operator cannot do.

### X6 · Declared content with no surface, and rendered surfaces with no content

- **Growth tables (F-11)** — promos, referrals, incentives, bulk messaging. No client under
  `src/data/clients` matches `promo|referral|incentive|campaign|broadcast`. Growth is a
  board and nothing else.
- **Risk & Signals actions** — the legacy page suspended and navigated; the board has
  `Open analysis` links only.
- **Market & Zones board content is orphaned.** `fixtures/metrics.ts` carries 13 rows for
  `management-zones` (`steerOffersLive`, `liveCities`, `unservedDemandCities`,
  `applicantPipelinePerCity`, `steerOfferAcceptanceRate`, the `citiesHealth` breakdown…)
  and `ZonesScreen.tsx` never calls `getMetricBoard` — it renders five readings from
  `getZoneHealth` and the map. The screen also lost the table on the owner's instruction
  (`ZonesScreen.tsx:427-440`): sort, column picker, filter and CSV export are gone and the
  file says so. `useIndexTable` still runs (`:229`) and drives a `listZones` read whose
  search, filters and **page size of 25** now have no control — a seventh-plus city's
  zones would silently truncate.

### X7 · The queues do not land on open work

- **People › Applications** opens on **all 51 applications, decided rows first**: the
  view has no lifecycle scope (`ApplicationsView.tsx:108-111` reads `table.params` only)
  and `slaDueAt asc` with nulls last puts the 25 visible rows at `Rejected · —· —`
  (capture `ops-people-applications`: 50 em dashes on one screen). Q-32 says a queue's
  default is its open work; this is the one queue that ignores it.
- **Requests › Pending** excludes `no-drivers` — the breach state — by inheriting the
  legacy predicate (`RequestsScreen.tsx:125-129`). The banner counts it; the tab hides it.
- **Trip Assurance** prints `Due 24 Jun 21:00` on rows whose leg departs 25 Jun while the
  fixture clock is 25 Jun 09:14 (capture `ops-assurance`). The clock refuses `overdue`
  because `slaBreachedAt` is null (`AssuranceScreen.tsx:797-803`, Q8-b). A deadline in the
  past that reads as upcoming is worse than no clock.
- **My Work** projects 5 of 9 queue ids (`clients/myWork.ts:96-236`) and the screen's
  claim map covers the same 5 (`MyWorkScreen.tsx:535-561`). `claimTicket`
  (`clients/tickets.ts:187`) and `claimDispute` (`clients/disputes.ts:275`) now exist, so
  the "source queue unavailable" refusal is stale on two queues.

### X8 · Density and hierarchy defects that repeat

- **Identity columns truncate the thing the row is about.** Requests: `Al Wurud District
  →…` at 168px min; My Work: `Ride request — Al W…`, `suspension-appeal …`; Compliance
  `Next expiry`: `18 Jun · expir…` at 128px; Risk breakdown: `Abdulaziz Al-Suwail…`.
  Widths were budgeted for Arabic at 870px (§7.3) and the English content does not fit.
- **Corporate rows wrap to two and three lines** (`Anwar Food Services 3`, `Hail Transport
  Company 5`, `Monthly invoice`) because `Company` is fixed at 200 and `Billing` at 140
  (`CorporateScreen.tsx:136, 238`); row pitch is broken on the one index that has no
  budget comment.
- **Avatar circles on non-person rows.** Subscriptions and Trips draw an `S` / `T`
  initial in a 32px circle on every row (`queues/cells.tsx:137-141` via `Identity code`).
  D7 makes a person a circle and an entity a rounded square; a letter for a record type
  is furniture — the same argument `RequestsScreen.tsx:672-690` used to drop its avatar.
- **`0.00 SAR` on trips that have not ended** (`TripsScreen.tsx:498-502`; capture
  `ops-quick-rides` rows `Requested`, `En route`, `Cancelled`). `FeedPanel.tsx:296-306`
  already ruled this an R4-12 lie and removed it from the board; the table still prints it.
- **`Type` column repeats the sub-tab's name on every row** of both request tabs
  (`RequestsScreen.tsx:711-765`): `Instant × 3` under *Ride requests*. Trips removed the
  identical column with the identical reasoning when the kind became the sub-tab
  (`TripsScreen.tsx:381-394`).
- **Badge budget (H7)** on Assurance: reason badge + owner chip + deadline pill = three
  fills on five of six rows.

### X9 · Undo and the command registry stop at captains

`toastOutcome` and the D18 undo handle are wired for captain commands only. Trip and
subscription commands are declared **twice** — `components/actions/trip.ts` and
`commands/trips.ts`, `components/actions/subscription.ts` and `commands/subscriptions.ts`
— and the screen-side pair carries no undo (grep for `undo|toastOutcome` under
`components/actions` returns nothing). That is D9's four-way duplication, back in two
files per domain.

### X10 · One keyboard shortcut, no page size

`keydown` is listened for once in the shell (`GlobalSearch.tsx:151`). `DataTable` renders
`Scroll for more` and a `nextPage` control (`DataTable.tsx:2517-2524`) with no page-size
choice; density exists (`DataTable.tsx:1237`). Companion P8-T4 and P1-T5 are open.

### X11 · The basemap is OpenStreetMap's public tile server

`components/map/Basemap.tsx:213` fetches `tile.openstreetmap.org`. Both maps depend on it.
The OSM tile usage policy does not permit a production console to use it as its tile
source; a licensed provider (or self-hosted tiles) is a launch blocker for two screens.
**Owner decision O2.**

### X12 · Test coverage is uneven

| Directory | Test files |
|---|---|
| `operations/my-work` · `operations/requests` · `operations/subscriptions` · `operations/assurance` · `queues/` (shared adapter) | **0** |
| `operations/dispatch` · `operations/corporate` · `operations/trips` · `operations/people` | 1 each |
| `management/zones` · `metrics` | 2 each |
| `reports` | 12 |

Four queues and the adapter they share have no behavioural test. Every D21 claim on
those screens is unverified.

### X13 · Comments that mislead the next agent

`localCopy.ts:38-41` says the Arabic dictionary is empty (it is not);
`ZonesMapView.tsx:1-30` says there is no basemap (there is); `RequestsScreen.tsx:1021-1024`
says the detail drawer is not built (`?entity=REQ-…` resolves through
`components/profile/request`). Under the comment rule in `CLAUDE.md` these are to be
shortened when touched, not extended.

> **X14 to X19, O9 to O11 and Phase 9 were added on the owner's instruction (2026-09-04):**
> no em dashes anywhere an operator reads; explanatory small text behind an info icon that
> opens a tooltip; simpler screen and panel layouts; owned iconography; a real back icon;
> Reports and Alerts reworked; fewer words in every slot.

### X14 · Em dashes reach the operator from three layers

- **Cells.** `people/cells.tsx:100` and `queues/cells.tsx:102` define the `—` empty cell
  ("only for not-applicable or unknown, §8.3.1"). The Applications capture renders it in
  `SLA` and `Owner` on every decided row: 50 on one page. Also `CorporateDetailScreen.tsx:327`
  (phone), `ChangeDriverModal.tsx:182, 228`, `ManualDispatchModal.tsx:218`,
  `TripParties.tsx:200, 209`. T5.5 as first written would have added more.
- **Strings.** 15 English values in scope carry one: requests 3 (`requests.offered.withCaptain`
  *"Offered to {name} — waiting for their reply"*), assurance 3 (`assurance.ack.assumed`
  *"Assumed — not confirmed"*, `assurance.backup.ineligible` *"{name} — {reason}"*),
  subscriptions 2 (`subs.toast.cancelled`), people 2, reports 2 (`rb.panel.measureByGroup`),
  vocabulary 2, metrics 1 (`overview.hero.group` *"Lead metrics — pick one to chart"*).
  114 Arabic values under `src/i18n/ar/` carry one.
- **Fixtures.** 15 fixture names and titles (`fixtures/reports.ts`, `notifications.ts`,
  `integrations.ts`). *"Captains vs riders — 30 days"* and four more make five of the seven
  rows in the Reports library capture.
- **No guard.** `scripts/edit-gate.mjs` does not check for it, and a grep cannot: 7,143 lines
  under `src/**/*.ts` and 7,741 under `*.tsx` contain one, nearly all in comments.

**Rule.** No em dash in any operator-facing string, fixture value or rendered fallback.
A qualifier uses the product's existing separator `·` (`PageHeader` meta, *"Line · …"*).
Two clauses become two sentences. Numeric ranges keep the en dash already in *"Showing 1–7
of 7"*. An empty cell renders per O9.

### X15 · Explanatory small text sits inline and thickens every layout

- 48 `text-xs text-muted-foreground` sites across operations, management, the metrics
  components and queues; 69 more in reports.
- **Corporate detail** (capture): every card carries a subtitle restating its title
  (`corp.card.companyDetailsDesc`, `usagePolicyDesc`, `linkedEmployeesDesc`), the policy card
  nests a bordered box *"Work-hours restriction"* with its own sentence
  (`CorporateDetailScreen.tsx:439`), and the spend card prints a note under its figure (`:604`).
- **Alerts** (capture): the banner is three lines. The `State` cell stacks a glyph, a badge and
  up to four 12px lines (`AlertsView.tsx:340-425`): *"Not checked on any schedule."* on every
  row while the banner says it once (R10), and a 20-word suspension explanation inside a cell,
  so one row is about 180px tall. `Threshold` repeats *"In per cent"* / *"In Saudi riyals"*
  under a value that already carries its unit (`:465-475`).
- **Dispatch:** `dispatch.legend.note` (80 chars), `dispatch.interventions.unavailable` (121),
  `dispatch.empty.board.body` (120), `ManualDispatchModal.tsx:197`.
- **Applicant:** `applicant.screeningDesc` (119 chars), `ApplicantDetailScreen.tsx:353, 441`,
  `ApplicationSheet.tsx:306`.
- **Boards:** `ChartCard.tsx:589-662`, `Chapter.tsx:208` and `BreakdownList.tsx:556-662` print
  notes under charts.
- **The tool exists.** `components/reports/InfoHint.tsx` is a lucide `InfoIcon` button that
  opens a tooltip on hover, focus and click, with `<bdi>` isolation. It is used at 11 sites in
  three report files only. `docs/RULINGS.md:48` already lets it override §5.7 for rail
  descriptions.

**Rule.** A sentence that *explains* goes behind `InfoHint`, beside the thing it explains.
A sentence that *changes what the operator does next* (a refusal, a field error, the one
line of an empty state) stays inline. Nothing an operator must read to act may live only in
a tooltip.

### X16 · The back arrow is a font glyph, and detail pages draw two

- `PageHeader.tsx:150-161` renders `←` through `mirrorGlyph` at `text-base` inside a 28px
  ghost button. `TopBar.tsx:168-180` renders the same glyph in slot 1 whenever
  `route.showsBackArrow`, which `routeState.ts:210` sets for every `detail` and `bleed`
  route. The corporate-detail capture shows both: one at the top bar's start edge, one beside
  the title. Both are named *Back*; both call `navigate(-1)`.
- A font arrow draws at the text weight, so at 16px it is a hairline beside a 30px title, and
  it depends on the loaded font's coverage, which differs in Arabic.
- The same convention elsewhere: pager `‹ ›` (`PageHeader.tsx:253, 262`), sort `↑ ↓`
  (`ColumnHeaderCell.tsx:232`, `SortControl.tsx:85, 126`), the row menu `⋯`
  (`DataTable.tsx:1804, 2635`), feed collapse `‹ ›` (`FeedPanel.tsx:184`, `MapRail.tsx:134`),
  `✓` (`ApplicantDetailScreen.tsx:541`). 21 such sites app-wide, while 62 non-test files
  already import lucide.
- Two mirroring conventions coexist: §9.5 says string-construction time only, but
  `calendar.tsx:189` and `pagination.tsx:97` mirror an SVG chevron with `rtl:rotate-180`.

### X17 · Iconography has no owner

- Nine files in scope import lucide and each picks its own: `Clock`, `CalendarIcon`,
  `ShieldAlert`, `Car`, `Building2`, `Users`, `CreditCard`, `Navigation`, `RefreshCw`.
  `src/shell/icons.tsx` exports only `WorkspaceGlyph`; there is no registry.
- Where icons appear is decided per screen. Corporate detail puts building, shield and users
  icons on card titles. The Reports library leads each row with a chart-type icon and then
  says the type in words on line two. Dashboards draws a tile grid whose filled squares vary
  by row (2, 0, 4): a count encoded at 16px, beside a `Reports` column that prints it.
  Alerts puts a state glyph beside a state badge that already names the state.
- `01-foundations.md:347-371` (§1.5) records the reference: 16px in cards, 20px in the top
  bar, filled solid-weight monoline, on menu items, banners and nav, never on field labels.
  Lucide's default is a 2px outline stroke.

### X18 · Too many words in the slots operators scan

- Strings of 60+ characters in scope: reports 24, dispatch 8, corporate 4, people 3, zones 2,
  my-work 2. Of 100+: dispatch 3, people 1.
- Empty states and banners are two sentences where one verb does
  (`dispatch.empty.board.body`: *"Live Dispatch tracks trips in progress, requests waiting for
  a captain, and who is on shift. It fills as the day starts."*). Every corporate card has a
  subtitle. The Reports library prints fixture prose under every name (*"The owner's standing
  question. Two panels, two scales, one x-axis."*). Dashboards' `Range` says *"Each report's
  own range"* in a 120px column and wraps. Alerts' banner is a title, a two-sentence body and
  a third line.
- No length budget exists: `scripts/i18n-budget.json` tracks the `defaultValue` ceiling only.

**Budget, in words.** Page title ≤ 4. Button ≤ 3. Badge ≤ 2. Meta line ≤ 6. Cell second
line ≤ 5. Empty state: title ≤ 5, body ≤ 12 in one sentence. Banner ≤ 20 with one action.
Toast ≤ 8. Tooltip ≤ 25. Anything longer moves to `InfoHint` or the record's detail surface.

### X19 · Reports and Alerts, as captured

- **Library.** `Report` takes about 560 of 900px for icon, name, type word and description.
  `Visibility` prints the badge *"The team"* on six of seven rows: a property, not a state
  (H7). No `Type`, `Owner` or `Last run` column, which is the Amplitude library's shape, and
  Amplitude outranks here. Five of seven names carry an em dash.
- **Dashboards.** The tile glyph (X17); mid-word truncation (T5.10); `Range` wrapping;
  *"Reports 0"* beside a description that ends *"Nothing pinned"*.
- **Alerts.** Banner three lines. `State` stacks up to five lines. `Checked` repeats *"Not
  set"* with an icon on every row under a banner that says it once (R10). `Threshold` repeats
  the unit. `Last reading` prints `—` for the suspended rule. The row menu is a text `⋯`.
  The `Alert` cell truncates its sentence after two lines. The single primary *New alert*
  is right.

## 3. Per-screen findings

Axes: **F** functionality · **C** clarity · **B** business value · **H** hierarchy ·
**L** layout · **V** visual. Each row names the fix's task id from §5.

### 3.1 Management › Overview, Performance, Risk & Signals, Growth (one board component)

Strong: band + hoisted chart + chapters is the best-reading surface in the product; the
`Open analysis` link on every figure is the right drilldown; the period picker resets per
board; empty and error are real.

| Axis | Finding | Task |
|---|---|---|
| L | Chapters are a three-column grid; Overview's four chapters hold two tiles each, so a third of every chapter row is page ground on the busiest board (capture `tall-mgmt-overview`) | T5.6 |
| B | Growth has no promo, referral, incentive or bulk-message table (F-11). The board says `2 of 4 campaigns are active` and offers no way to see them | T7.1, O3 |
| B | Risk & Signals has no action: `Captains at risk of unavailability 3` and `Renewal payments flagged 1` link to filtered lists but the legacy suspend/contact acts have no home | T7.2, O4 |
| C | Risk's period pill reads `All time` beside a hoisted chart of 19–25 Jun; the reasoning in `boardPeriod` is right, the operator still sees two windows | T5.7 |
| H | Risk breakdown names truncate at half width (`Abdulaziz Al-Suwail…`) | T5.1 |
| F | Nothing on any board refreshes after mount; `Computed 25 Jun 09:14` is the only freshness signal and there is no refresh control | T1.5 |

### 3.2 Management › Market & Zones

Strong at 1440: the floating inspector, worst-zone default selection, measure tabs, red
only on the map marker and the starved readings.

| Axis | Finding | Task |
|---|---|---|
| L | At 1280 the panel sits at 1105px under a 730px map; both actions are off-screen (X1) | T2.1 |
| L | The strip breaks 3 + 2 at 1280 (`ZonesScreen.tsx:545`) | T2.3 |
| F | Sort, filter, column picker and CSV are gone with the table; `useIndexTable` still drives a paged read nobody can page (X6) | T7.3, O5 |
| B | 13 seeded zone metrics and the city breakdown never render (X6) | T7.3 |
| F | The list shows three rows before it scrolls inside the floating panel at 900px tall | T2.1 |
| V | Marker chips and polygons work; the legend under the map is 10px grey on a gradient — hard to read on the light basemap | T5.8 |
| F | Basemap licence (X11) | O2 |

### 3.3 Management › Reports

Under the Amplitude-fidelity ruling; findings are limited to what breaks reading.

| Axis | Finding | Task |
|---|---|---|
| H | Alerts: the `State` cell carries two-sentence paragraphs (`It stopped because its owner can no longer see the measure…`), making rows up to 180px tall, and `Not checked on any schedule` repeats on every row under a banner that says the same thing (R10) | T5.9 |
| C | Dashboards: descriptions truncate mid-word with no title (`Nothing pinr`) | T5.10 |
| F | Library and Dashboards have no owner column on reports (the file says why: no users client); alerts have no evaluator (server work, recorded) | — |

### 3.4 Operations › Overview

Strong: the one critical banner, five chapters, the `All 5 queues` breakdown. Same board
component, so 3.1's rows apply. One addition: the `Risk` chapter holds one tile in a
three-column grid.

### 3.5 Operations › My Work

| Axis | Finding | Task |
|---|---|---|
| C | Titles are slugs and English templates from the projection (X2) | T4.1 |
| H | The `Item` column at 176px truncates every title and subtitle on screen | T5.1 |
| F | Tickets and disputes are neither projected nor claimable although their clients exist (X7) | T1.6 |
| F | Nav badge `25` against `5 items` (X3) | T1.4 |
| F | No test file | T8.1 |

### 3.6 Operations › Live Dispatch

| Axis | Finding | Task |
|---|---|---|
| L | At 1280 the feed and the rail are below the map (X1) | T2.2 |
| C | `live telemetry connected` and three literal figures (X4, X5) | T1.1, T1.3 |
| F | No tick; the board is a snapshot until the operator navigates away and back | T1.3 |
| F | Interventions are two literals with no model; both controls refuse (X5) | T1.2 |
| C | `instant` / `subscription` / `Economy` / `Comfort` raw in the feed (X2) | T4.2 |
| H | Every pending row carries a warning-filled channel badge (H7) — three warning fills in six rows | T4.2 |
| B | `25 rows are outside this map` — half the fleet is off-frame by the declared bounds (`geo.ts:34-37`); nothing lets an operator widen the frame short of the zoom control | T2.2 |
| C | The legend correctly says captain marks are registered districts, not positions; the API owes a position field (`geo.ts` header) | O6 |

### 3.7 Operations › Ride requests, Subscription requests

| Axis | Finding | Task |
|---|---|---|
| H | `Type` repeats the tab name (X8) and costs 128px the identity needs | T5.2 |
| H | `Ride` truncates the route at the minimum width; the destination is what an operator matches a captain against | T5.1 |
| F | `Pending` excludes `no-drivers` (X7) | T3.2 |
| C | `Offered` decision cell truncates to `Reem A… — waiting for…` at 176px | T5.1 |
| F | No test file | T8.1 |

### 3.8 Operations › Subscriptions

| Axis | Finding | Task |
|---|---|---|
| F | `Change captain` has no write (X5) | T1.2 |
| V | `S` avatar on every row (X8) | T5.3 |
| H | `Rider` and `Captain` at 152px truncate two of nine visible names | T5.1 |
| V | The record sheet's fare tile header is clipped to `PA` by the expand button (capture `en-sub-overlay-1440`) | T5.11 |
| F | Undo missing on Freeze (X9) | T6.1 |
| F | No test file | T8.1 |

### 3.9 Operations › Corporate accounts and detail

| Axis | Finding | Task |
|---|---|---|
| L | Rows wrap to three lines; `Billing` wraps to two (X8) | T5.4 |
| C | Status, billing type, `Day 1`, `Invoice overdue` placement, placeholders, `Day n of month` — English from data and code (X2) | T4.3 |
| F | Unlink and Send invoice have no write (X5) | T1.2 |
| L | Detail rail below the fold at 1280 (X1) | T2.4 |
| H | The policy form's `Monthly spend cap` shows `200` with no unit while every other money figure carries `SAR` | T4.3 |
| F | Selection is now suppressed (0 checkboxes) — resolved since the file header was written; shorten the header | T4.3 |

### 3.10 Operations › Quick rides, Subscription trips

| Axis | Finding | Task |
|---|---|---|
| C | `0.00 SAR` on unfinished trips (X8) | T5.5 |
| V | `T` avatar on every row (X8) | T5.3 |
| H | Rider and captain names truncate at 152px | T5.1 |
| F | Undo missing on Flag / Remove flag (X9) | T6.1 |

### 3.11 Operations › Trip Assurance

| Axis | Finding | Task |
|---|---|---|
| C | `Due 24 Jun 21:00` in the past reads as upcoming (X7) | T3.3, O7 |
| H | Three tone fills on most rows (X8) | T5.12 |
| F | `Absences` renders empty by default — correct, but the toolbar keeps Filter / Columns / Sort over nothing | T5.13 |
| F | No test file | T8.1 |

### 3.12 Operations › People (Captains, Applications, Compliance, Riders) and applicant detail

| Axis | Finding | Task |
|---|---|---|
| F | Applications lands on 51 rows, decided first (X7) | T3.1 |
| C | 50 em dashes on the first screen of Applications; `—` in `SLA` and `Owner` on every decided row is not-applicable stated 50 times | T3.1 |
| H | Compliance `Next expiry` truncates `expired` (X8) | T5.1 |
| L | Applicant detail's rail restacks at 1280 (X1) — the checklist that explains why `Approve` is disabled is below the fold | T2.4 |
| C | Applicant meta line joined with `' · '` (X2) | T4.4 |
| F | Two detail paradigms for one record: the review sheet and the full page (`ApplicationsView.tsx:311-326` and the route). Deliberate and argued; recorded here because the companion's C3 lists it | — |

## 4. Decisions needed from the owner

Nothing in §5 phases 1, 3, 4, 5, 6 or 8 waits on these. Phases 2 and 7 do. In Phase 9
only T9.3 waits on O9 and T9.10 on O10 and O11.

| # | Question | Recommendation |
|---|---|---|
| **O1** | `wide` is 1344 and D2's floor is 1280. Lower `wide` to 1280, or add a second variant for the two maps and `DetailPage`? | Lower `wide` to **1280**. Every `wide:` layout was designed for the operator's screen; the 64px gap is an accident of §0.1's arithmetic, not a decision. Re-measure the six `wide:` widths in `globals.css` after |
| **O2** | Tile provider and licence for the two maps | Pick a licensed provider before launch; `Basemap` already isolates the URL |
| **O3** | F-11 Growth tables: in scope? | Yes, as four P1 tables behind `?view=` on the Growth sub-tab, with the board above them (R4-6b's shape) |
| **O4** | Risk & Signals actions: does the board grow a row-level act, or does every figure stay a drilldown? | Stay a drilldown, and make each `Open analysis` land on a **pre-filtered** list that carries the act (suspend, contact) — no new surface |
| **O5** | Market & Zones: bring the table back as a second view, or accept the loss of sort/filter/CSV? | Second view (`?view=table`), because a city with 30 zones is a list you query |
| **O6** | Captain position on the wire (`Driver.position`) — is it coming? | Needed before the dispatch map can claim anything about where a captain is |
| **O7** | Q8-b: the confirmation window's start, so Assurance can draw a track and print `overdue` | Decide the start; until then print `Missed 24 Jun 21:00` for a past cut-off, never `Due` |
| **O8** | Nav badge semantics: what does each backlog count? | Count what the sub-tab's default view shows, computed by the same client, and say so in the badge's accessible name |
| **O9** | What replaces `—` in an empty cell? | **Blank** for not-applicable (a decided application has no SLA). A muted word only when the absence is a fact the operator acts on: `No owner`, `Not settled`, `Not set`. Never a fill, never an icon |
| **O10** | SVG mirroring: choose the icon by `dir` in code (§9.5) or `rtl:rotate-180` (`calendar.tsx`, `pagination.tsx`)? | **By `dir` in code**, through one helper `directionalIcon(dir, Start, End)`; retire the two CSS sites |
| **O11** | Which back arrow survives on detail routes: top bar slot 1 (§4) or page header slot 1 (§8)? | **The page header's**, beside the title where the eye lands and where the structural reference puts it. Top bar slot 1 stays empty on every route; its two shell tests move to `PageHeader` |

## 5. The plan

Task ids are `T<phase>.<n>`. **Role** is the agent definition under `.claude/agents/`.
**Evidence** is what the task must produce before it is reported done, per `CLAUDE.md`.

### Phase 1 — Truth: the data behind the screens (mock-data-engineer, api-contract-steward)

| Task | Work | Files | Evidence | ∥ |
|---|---|---|---|---|
| **T1.1** | A telemetry read: `getDispatchTelemetry()` returning match time, auto-match rate, utilisation with `asOf`. Delete `TELEMETRY`. Meta line becomes *"4 in transit · as of 09:14"* — no liveness claim until T1.3 | `clients/dispatch.ts` (new), `DispatchScreen.tsx:107, 294` | contract doc regenerated (`npm run api:contract`); `dispatch.test.tsx` asserts the figures come from the read | A |
| **T1.2** | The five missing writes: `reassignSubscriptionDriver`, `removeCorporateEmployee`, `sendCorporateInvoice`, `acknowledgeIntervention`, `reassignIntervention`, plus the `Intervention` type and fixture. Each with its 409/422 named. Then enable the six controls | `clients/subscriptions.ts`, `clients/corporateAccounts.ts`, `clients/dispatch.ts`, `types/`, `fixtures/` | one behavioural test per control: the write lands and the row changes | A |
| **T1.3** | Dispatch ticks. A `subscribe`-shaped seam is P5-T2's; until it lands, `useTick` re-reads the three feeds on the shell's one clock and the meta says *"updated 12s ago"* | `DispatchScreen.tsx` | harness: two captures 30s apart differ in `asOf` | A |
| **T1.4** | Nav counts computed from the queues' own clients (the zones row already is), revalidated on every route change and on a slow poll; badge gains `aria-label` *"N open ride requests"* (O8) | `clients/navCounts.ts`, `ShellContext.tsx:272`, `PageNav.tsx:356` | a test that claims a request and reads the badge move | A |
| **T1.5** | Boards re-read on focus and on a `Refresh` control in the band; `asOf` moves | `MetricBoardScreen.tsx`, `BoardHero` | `board.test.tsx` | A |
| **T1.6** | My Work projects tickets and disputes and claims through their clients | `clients/myWork.ts:451`, `MyWorkScreen.tsx:535-561` | a test that claims a ticket from My Work and finds it claimed on Tickets | A |

### Phase 2 — Layout at the minimum viewport (frontend-engineer, design-token-steward) — **waits on O1**

| Task | Work | Files | Evidence | ∥ |
|---|---|---|---|---|
| **T2.1** | Zones: the inspector floats at ≥1280; the map takes the residual height instead of 4:3; the list shows ≥5 rows at 800px tall | `ZonesMapView.tsx:602-668, 750-760` | harness at 1280 × 800: `aside.top < 800`, both action buttons in the viewport | B |
| **T2.2** | Dispatch: feed and rail float at ≥1280; `MAP_BOUNDS` gains a `Fit to fleet` control so the 25 off-frame captains are reachable | `DispatchMap.tsx`, `geo.ts:34`, `MapRail.tsx` | harness: feed visible at 1280; off-frame count 0 after the control | B |
| **T2.3** | Zones strip stays 5-up from 1280 | `ZonesScreen.tsx:545` | capture | B |
| **T2.4** | `DetailPage` keeps its rail beside main from 1280 (`grid-cols-detail` at a narrower rail) | `PageShell.tsx:349` | Corporate detail and Applicant detail captures at 1280 show the rail | B |

### Phase 3 — Queues land on open work (frontend-engineer + mock-data-engineer)

| Task | Work | Files | Evidence | ∥ |
|---|---|---|---|---|
| **T3.1** | Applications: default scope `open` (pending + in-review), a `Decided` scope chip to widen, decided rows below open ones. `SLA` and `Owner` cells on decided rows collapse into the decision badge instead of two `—` | `ApplicationsView.tsx:99-111, 528-583`, `clients/applicants.ts` | test: first row on load is undecided; em-dash count per screen ≤ 2 | C |
| **T3.2** | Requests: `pending` includes `no-drivers`; the spec's `needs-decision` rename lands in the route table | `clients/requests.ts`, `routeTable.ts:414-455` | test AC-234 style: a `no-drivers` row is on the default tab | C |
| **T3.3** | Assurance: a past cut-off with no breach stamp prints `Missed {time}` (O7) and sorts with breached rows; never `Due` in the past | `lib/sla.ts:296`, `queues/queue.tsx:119` | test with the fixture clock | C |

### Phase 4 — Copy out of the data layer (i18n-arabic-engineer, content-designer)

| Task | Work | Files | Evidence | ∥ |
|---|---|---|---|---|
| **T4.1** | `WorkItem` carries `titleKey` + `params` (and `subtitleKey`), never a sentence; the screen resolves it. Slugs (`suspension-appeal`, `rider-report`) map to the labels the Fairness and Safety screens already own | `types/work.ts`, `clients/myWork.ts:96-240`, `MyWorkScreen.tsx:648-654`, `i18n/ar/myWork.ts` | `inventory.test.ts` widened to scan `src/data/clients` for English templates; Arabic capture with no Latin in `Item` | D |
| **T4.2** | Dispatch feed: channel, vehicle class and kind through keys; channel becomes DATA-tier text, not a warning badge (H7) | `FeedPanel.tsx:225-227, 312-315, 340` | Arabic capture | D |
| **T4.3** | Corporate: status and billing enums keyed; `Day n` and `Day n of month` become one key with a placeholder; placeholders keyed; money inputs carry the `SAR` prefix `Field` already offers; shorten the two file headers | `CorporateScreen.tsx:70-75, 243-278`, `CorporateDetailScreen.tsx:278, 384-454, 628`, `i18n/ar/corporate.ts` | `npm run i18n:keys`; Arabic capture | D |
| **T4.4** | Meta lines built with `' · '` become one key each | `ApplicantDetailScreen.tsx:252`, `ApplicationSheet.tsx:222` | AC-75 scan | D |
| **T4.5** | Delete the three misleading comments (X13) | `localCopy.ts`, `ZonesMapView.tsx`, `RequestsScreen.tsx` | diff | D |

### Phase 5 — Hierarchy and density (table-density-engineer, product-designer, frontend-engineer)

| Task | Work | Files | Evidence | ∥ |
|---|---|---|---|---|
| **T5.1** | A truncation budget per table: measure the widest English and Arabic value of every visible column on the fixtures, and set `minWidth` so the identity never truncates at 1280. Targets: Requests `Ride` and `Decision`, My Work `Item`, Compliance `Next expiry`, Subscriptions/Trips `Rider`/`Captain`, Risk breakdown names | one commit per table | harness prints `scrollWidth > clientWidth` per identity cell = 0 at 1280 in both languages | E |
| **T5.2** | Drop `Type` from both request tabs; give the 128px to `Ride` | `RequestsScreen.tsx:711-765` | capture | E |
| **T5.3** | `Identity code` renders no avatar; non-person records lead with the id in mono | `queues/cells.tsx:137-141` | captures of Subscriptions and Trips | E |
| **T5.4** | Corporate columns: `Company` flexible with `minWidth`, `Billing` 152, email on line two only when the column is wide enough — no row above two lines | `CorporateScreen.tsx:128-312` | capture: uniform row pitch | E |
| **T5.5** | Trips fare: `—` with `Not settled` for `requested`, `assigned`, `en-route`, `in-trip`; `—` for `cancelled` / `no-show` | `TripsScreen.tsx:498-502` | test | E |
| **T5.6** | Chapters size their grid to their tile count (two tiles → two halves) | `components/metrics` `ChapterFigures` | capture at 1280 | E |
| **T5.7** | Board period pill states its scope (*"Leads: all time · chart: 19–25 Jun"*) when the hoisted chart's window differs | `MetricBoardScreen.tsx:923` | test | E |
| **T5.8** | Map legend and attribution at 12px on a solid card, not 10px on a gradient | `ZonesMapView.tsx:905` | capture | E |
| **T5.9** | Alerts `State` cell: badge + one short qualifier; the explanation moves to the row's `title` and the alert's detail; the per-row `rowNote` goes when the banner is present (R10) | `AlertsView.tsx` | capture: row height ≤ 64px | E |
| **T5.10** | Dashboard description truncates on a word boundary with a `title` | `DashboardsView.tsx` | capture | E |
| **T5.11** | Subscription sheet: the fare tile header clears the expand button | `components/profile/subscription` | capture | E |
| **T5.12** | Assurance `Reason` column: warning badge only for `Captain unavailable` and `No backup`; the rest DATA-tier text (H7) | `AssuranceScreen.tsx:963-1000` | capture: ≤ 2 fills per row | E |
| **T5.13** | Toolbar controls that act on nothing (Absences empty) render disabled with the empty sentence | `DataTable.tsx` | test | E |

### Phase 6 — Reach, reversibility, keyboard (utilities-engineer, frontend-engineer)

| Task | Work | Files | Evidence | ∥ |
|---|---|---|---|---|
| **T6.1** | Retire `components/actions/trip.ts` and `subscription.ts`; Trips, Subscriptions and their sheets resolve `commands/trips.ts` and `commands/subscriptions.ts` the way Captains does, so Flag, Unflag and Freeze carry D18's undo | `components/actions/*`, `TripsScreen.tsx:80-87`, `SubscriptionsScreen.tsx:90-100` | test: a flag is undone from the toast within 10s | F |
| **T6.2** | `j` / `k` row focus, `.` opens the focused row's actions, `g` then a letter jumps sub-tabs — all resolved through the registry (P8-T4) | `commands/`, `DataTable.tsx` | `commands.test.tsx` | F |
| **T6.3** | ~~Page-size control in the toolbar~~ Reversed by the owner: tables scroll, they do not page, so no rows-per-page control sits beside `Scroll for more`. `ui.pageSize` stays as the fetch chunk only | `DataTable.tsx`, `table/pageSize.ts` | shell suite | F |

### Phase 7 — Declared content (product-owner → product-designer → frontend-engineer) — **waits on O3, O4, O5**

| Task | Work | Evidence |
|---|---|---|
| **T7.1** | Growth tables: promos, referrals, incentives, bulk messages as four `?view=` index tables under the Growth board. Spec via `/spec-feature`, design via `/design-screen`, then build. New clients via `/mock-resource` | specs + design doc + tests |
| **T7.2** | Risk drilldowns land pre-filtered on the list that carries the act (O4) | test per tile link |
| **T7.3** | Zones: `?view=table` restores the P1 table (sort, filter, columns, CSV, paging) beside the map view; the 13 orphaned `management-zones` metrics and the `citiesHealth` breakdown render as the board half R4-6b describes | `zones.test.tsx` |

### Phase 8 — Tests and harnesses (qa-engineer, visual-qa-engineer)

| Task | Work | Evidence |
|---|---|---|
| **T8.1** | Behavioural suites for My Work, Requests, Subscriptions, Assurance and `screens/queues` — one test per acceptance criterion each screen's header cites (AC-201, 203, 209, 210, 217, 226, 232, 234, 240, 245, 260, 263, 268, 280–292) | `test:changed` green; criteria named in test titles |
| **T8.2** | Commit the route-capture harness as `scripts/harness/ops-routes.mjs`: every Management and Operations route at 1280 × 800 and 1440 × 900, English and Arabic, printing `h1`, banner count, overflow, identity truncation and, for the two maps and every `DetailPage`, that the panel or rail is inside the first viewport | README row added |

### Phase 9: Words, glyphs and chrome (content-designer, i18n-arabic-engineer, frontend-engineer, table-density-engineer, utilities-engineer)

The owner's instruction of 2026-09-04 (X14 to X19). T9.4 and T9.5 go first: the gate stops
new em dashes arriving while the rest is in flight, and every later task uses the shared
`InfoHint`.

| Task | Work | Files | Evidence | ∥ |
|---|---|---|---|---|
| **T9.1** | Em dashes out of the 15 English and 114 Arabic operator strings: `·` for a qualifier, two sentences for two clauses. Run `i18n:keys` | the seven `copy.ts` in scope, `i18n/vocabulary/copy.ts`, `src/i18n/ar/` | grep of string values = 0 in both languages; keys regenerated | G |
| **T9.2** | Em dashes out of the 15 fixture names and titles | `fixtures/reports.ts`, `notifications.ts`, `integrations.ts` | grep of fixture values = 0; Reports library capture | G |
| **T9.3** | Empty cells per O9. Rewrite T5.5: fare is blank, or `Not settled` while a trip is under way | `people/cells.tsx:100`, `queues/cells.tsx:102`, `CorporateDetailScreen.tsx:327`, `ChangeDriverModal.tsx:182, 228`, `ManualDispatchModal.tsx:218`, `TripParties.tsx:200, 209`, `TripsScreen.tsx:498-502` | T9.16 prints em dashes = 0 on all 24 routes | G |
| **T9.4** | The edit gate reports an em dash inside a string literal or JSX text under `src/` (comments exempt); the i18n generator refuses one in a value | `scripts/edit-gate.mjs`, the i18n generator | hook output on a seeded edit; generator exit code | G |
| **T9.5** | `InfoHint` moves to `src/components/InfoHint.tsx`; `rb.hint.show` becomes `shell.hint.show`; the X15 rule goes into `docs/ref/copy.md` | `components/reports/InfoHint.tsx`, its 11 call sites, `docs/ref/copy.md` | typecheck; the reports test files green | G |
| **T9.6** | Corporate detail: the three card subtitles, the work-hours sentence and the spend note become `InfoHint` on their card titles; the nested bordered box flattens into the field grid; card-title icons go (X17) | `CorporateDetailScreen.tsx:420-620`, `corporate/copy.ts` | capture at 1280: no 12px paragraph inside a card; each card at least 48px shorter | G |
| **T9.7** | Applicant detail and sheet: `screeningDesc` and the explanations at `:353`, `:441` and sheet `:306` become `InfoHint`; the refusal at `:299` stays inline | `ApplicantDetailScreen.tsx`, `ApplicationSheet.tsx`, `people/copy.ts` | capture | G |
| **T9.8** | Dispatch: the legend note becomes `InfoHint` on the legend title; `interventions.unavailable` shrinks to ≤ 12 words with the rest in `InfoHint`; `ManualDispatchModal.tsx:197` likewise | `MapRail.tsx`, `InterventionsCard.tsx`, `ManualDispatchModal.tsx`, `dispatch/copy.ts` | capture | G |
| **T9.9** | Boards: a note under a chart becomes `InfoHint` beside the chart title unless it states a data fact (`overview.allZero` stays) | `ChartCard.tsx:589-662`, `Chapter.tsx:208`, `BreakdownList.tsx:556-662` | four board captures at 1280 | G |
| **T9.10** | Every font glyph used as an icon becomes a lucide icon at `size-4`: the back arrow (`ArrowLeft` / `ArrowRight` by `dir`, O10) in the one slot O11 keeps; pager and feed chevrons; sort arrows; the row menu `Ellipsis`; `Check` | `PageHeader.tsx:150-161, 245-268`, `TopBar.tsx:168-180`, `ColumnHeaderCell.tsx:232`, `SortControl.tsx:85, 126`, `DataTable.tsx:1804, 2635`, `FeedPanel.tsx:184`, `MapRail.tsx:134`, `ApplicantDetailScreen.tsx:541`, `qa.shell.test.tsx:281-290`, `qa.keyboard.test.tsx:255` | grep for `mirrorGlyph` and the nine glyph literals outside tests = 0; a detail page captured in both languages with exactly one *Back* button | G |
| **T9.11** | An icon registry `src/components/icons.ts`: one lucide icon per entity kind, state and action, `strokeWidth` 1.75, sizes 16 and 20; screens import from it. The placement rule goes into `docs/ref/components.md`: menu items, state badges, empty states, nav, top bar; never card titles or field labels (§1.5) | new file, the nine screen files, `docs/ref/components.md` | grep for `from 'lucide-react'` in scope outside the registry and `components/ui/` = 0 | G |
| **T9.12** | The X18 word budget goes into `docs/ref/copy.md`; content-designer rewrites the 43 strings of 60+ characters in scope and every empty-state and banner body to it; i18n-arabic-engineer mirrors; the generator gains a per-class length budget in `scripts/i18n-budget.json` | `copy.ts` in scope, `src/i18n/ar/`, the generator | generator reports 0 over budget | G |
| **T9.13** | Reports library: `Report` is icon and name; type, owner and last run become columns with filters; the description moves to the row `title` and the report's own header; `Visibility` is muted text, no badge | `ReportLibrary.tsx:183-260`, `reports/copy.ts` | capture: single-line rows; a `builder.chrome`-style test | G |
| **T9.14** | Dashboards: one `LayoutDashboard` icon per row; `Range` reads *Per report* or *7 days* with the explanation in the column header's `InfoHint` | `DashboardsView.tsx:110-210` | capture: single-line rows | G |
| **T9.15** | Alerts, superseding T5.9: banner is one sentence and a *Test a rule* link; `State` is one badge, with muted and disabled as lucide glyphs named by tooltip and the suspension reason in `InfoHint`; `Checked` blank under the banner (R10); the `Threshold` unit line deleted; `Last reading` per O9; menu per T9.10 | `AlertsView.tsx:340-480, 575-625`, `reports/copy.ts` | capture: every row ≤ 56px; T9.16 em dashes 0 | G |
| **T9.16** | Harness `scripts/harness/chrome.mjs` prints per route: em dashes in `innerText`, visible `text-xs.text-muted-foreground` nodes, buttons whose only content is a text glyph, and the tallest table row | new file | the four numbers for all 24 routes, before and after | G |

### Sequencing and lanes

| Lane | Tasks | Why it is safe |
|---|---|---|
| **A — data** | T1.1 … T1.6 | six client files; the screens change one import each |
| **B — layout** | T2.1 … T2.4 | after O1; touches `globals.css` once (design-token-steward) then four screens |
| **C — queues** | T3.1 … T3.3 | three screens, three clients |
| **D — copy** | T4.1 … T4.5 | data types + dictionaries; run `npm run i18n:keys` per task |
| **E — density** | T5.1 … T5.13 | one screen per task; T5.3 and T5.13 touch shared cells and `DataTable` and go to table-density-engineer first |
| **F — reach** | T6.1 … T6.3 | registry + `DataTable`; T6.1 removes files, do it before T5.x lands on Trips or Subscriptions |
| **G — words and chrome** | T9.1 … T9.16 | T9.4 and T9.5 first. T9.10 edits `DataTable.tsx` and `table/` and goes to table-density-engineer before lane E lands there. T9.1 shares the dictionaries with lane D: same owner |

**Collisions.** T5.1 and T5.2 both edit `RequestsScreen.tsx` — one owner. T4.3 and T5.4
both edit `CorporateScreen.tsx` — one owner. T6.1 must land before any T5 task on Trips
or Subscriptions, or the density work is re-done on a file that is then deleted. T9.15
replaces T5.9 and T9.3 rewrites T5.5: do not start either T5 task. T9.6 and any T4 task on
`CorporateDetailScreen.tsx` share one owner. T9.10, T5.3 and T5.13 all touch the table
layer: table-density-engineer, in that order.

**Order.**
1. **Week 1** — O1, O2, O7, O8, O9, O10, O11 to the owner. Lanes A and D start (different
   trees). T6.1. T9.4 and T9.5.
2. **Week 2** — Lane C. Lane E on the screens T6.1 has already touched. T8.2 so the
   1280 assertion exists before lane B lands. T9.1, T9.2, T9.16, and T9.10 once O10 and
   O11 are signed.
3. **Week 3** — Lane B once O1 is signed. T8.1 across the four queues. T9.3, T9.6 to T9.9,
   T9.13 to T9.15.
4. **Week 4+** — Phase 7 once O3–O5 are signed; T6.2, T6.3. T9.11, T9.12.

**If cut from the bottom**, six tasks pay for themselves regardless: **T2.1/T2.2** (the
two most expensive screens are unusable at the size the product promises), **T4.1** (the
one table an operator lives in reads as slugs in Arabic), **T3.1** (the applications
queue hides its own work), **T1.4** (a badge nobody can reconcile is a badge nobody
reads), **T9.10** (a back button an operator cannot see is not a back button), and
**T9.3 with T9.1** (an em dash on every second cell is the first thing the owner sees).

## 6. Status, 2026-09-05

Implemented in three waves of parallel agents on branch `integration/mgmt-ops`, cut from the
feature branch at 9169323. Full suite on 02484ae: 4397 passed, 2 skipped, 2 failed. Both
failures are `src/data/clients/auth.test.ts` cases stale since the onboarding commit 9169323
on the feature branch, outside this plan. `npm run typecheck`, `npm run i18n:keys` and
`npm run api:contract` are clean; the em-dash ceilings are 92 English and 95 Arabic
(from 112 and 115), the word-budget ceiling is 147 (from 192).

**Landed.** Phases 1, 3, 4, 6, 8 and 9 in full; Phase 2 under O1 (`wide` is 1280); Phase 5
except the parts below; Phase 7 in full (T7.1 Growth tables with spec, design, four clients
and 48 tests; T7.2; T7.3). Beyond the plan: claims persist across reads in every queue
client, subscription requests route to their own tab, Arabic plural families for thirteen
count strings, `ConfirmDialog` restores focus, `EmptyState` and column headers carry an
`InfoHint` slot, boards no longer scroll the window, the language toast speaks the language
chosen, and 117 behavioural tests cover the four queues and the shared adapter.

**Decisions taken by the orchestrator, reversible.** O1 with `--ev-page-pad-wide` 32 and
`--ev-detail-rail-w` 300; O9 blank cells; O10 icons chosen by `dir` in code; O11 the page
header keeps the back arrow; Subscriptions `Paid` hidden by default; Corporate `Billing` 132;
the held-by owner chip is plain text on every queue; roster sub-tabs carry no nav badge.

**Open, with an owner.**
- Identity truncation on Subscriptions, Trips, Captains and Compliance at 1280 in both
  languages: the widest fixture names (40 to 51 characters) exceed any column budget. Product
  decision: fewer default columns, or shorter fixture names. `ops-identity-widths.mjs` has
  the arithmetic.
- The applicant detail rail is 1130px tall; the checklist is now first, the rail still
  overflows the first viewport (`ops-routes.mjs` fails on it). product-designer.
- My Work's third fill is the `Yours` success chip; Alerts rows are 65px in Arabic against a
  56px budget. product-designer.
- One em dash remains on `/management/overview`: `src/screens/onboarding/copy.ts:60`
  (outside this plan's screens). content-designer.
- `nav.count.*`, `table.pageSize.option` and the shared queue `one`/`other` helpers still
  lack plural families (documented in `docs/ref/i18n.md`). i18n-arabic-engineer.
- The three `management-zones` lead series render only under `?view=table`. product-designer.
- Two interactive elements now sit in a header cell carrying a hint, against AC-80's letter.
  Ruling needed.
- Four spec contradictions recorded in `docs/02-verification/operations-work-queues-qa.md`
  (AC-240, AC-285, AC-292, AC-207). product-owner.
- Non-persisting decision writes (`approveApplicant`, `assignRequest` and siblings) share the
  shape the claim fix corrected. mock-data-engineer.
