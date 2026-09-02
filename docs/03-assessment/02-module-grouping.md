# Module grouping assessment

**Question asked (owner, verbatim):** *"are all connected modules grouped in the right way
did we seperate quickrides, and subscriptions as discused or are they still combined"*

**Author:** product-owner · **Date:** 2026-09-02 · **Method:** read-only. No production
code changed. All 35 sub-tabs walked in the running app at `localhost:5303` (Playwright,
1440×900, mock data source); the permission matrix computed from `ROLE_PERMISSIONS`
against `routeTable.ts`; `npx vitest run --maxWorkers=4` executed in full.

---

## 0. The short answer

**Quick rides and subscriptions are separated at the level that matters and combined at the
level the owner is probably looking at — and being combined there is what was agreed, in
writing, twice.** Nothing was reversed and nothing was forgotten. If the owner now wants
them apart, that is a **new** decision, not a missed one.

Precisely:

| Pair | State today | Matches agreement? |
|---|---|---|
| **Subscription** (the standing commitment) vs **Trip** (the event) | **Separated.** Two sub-tabs, two types, two clients, two action sets. | Yes |
| **Quick ride** vs **subscription leg** (both are trip *records*) | **Combined.** One sub-tab, one table, one column set, two view tabs plus a filterable `kind` column. | Yes — this is the agreement |
| **Quick-ride pricing** vs **subscription-plan pricing** | **Combined on one sub-tab, split into two views.** | Yes |
| **Instant request** vs **subscription request** | **Combined.** One type with a `channel` discriminant, two of six views. | Yes |

There is a **third** thing the question can mean, and it is the only one where the answer is
"no": **neither business line has a single home an owner can open.** That is a real gap, it
is not a navigation gap, and §4.6 says where it belongs.

Beyond quick rides, **six mis-groupings** are found. Two are serious. They are in §5.

---

## Part one — the factual half

### 1.1 What the data model says

`src/data/types/trip.ts:19`

```ts
/** Legacy `kind` (`:2676`). The Trips index splits its views on this. */
export type TripKind = 'Subscription' | 'Quick ride'
```

One type. One collection. `Trip.subscriptionId` is `string | null` and the type's own
comment at `:56` records that legacy already modelled this correctly:
*"`null` for a quick ride."*

Fixtures: `src/data/fixtures/trips.ts` holds **17 trips — 10 quick rides, 7 subscription
legs**. Every field on the interface is populated for both kinds. There is no field that
exists only on one kind, in either direction.

### 1.2 What the screen does

**One sub-tab, one table, six view tabs.** `routeTable.ts:457`–`:479`:

```
subTabId: 'operations-trips'   path: '/operations/trips'
views: all · quick-rides · subscription-legs · flagged · low-rating · route-history
legacyPageIds: ['trips', 'quickrides', 'live']
```

The views are predicates over the one list, not separate resources —
`src/data/clients/trips.ts:108`–`:113`:

```ts
'quick-rides':        (t) => t.kind === 'Quick ride',
'subscription-legs':  (t) => t.kind === 'Subscription',
flagged:              (t) => t.flagged,
'low-rating':         (t) => t.driverRatingGiven !== null && t.driverRatingGiven <= LOW_RATING_THRESHOLD,
'route-history':      (t) => t.endedAt !== null && t.distanceKm !== null,
```

`kind` is **also** a column with a `select` filter (`TripsScreen.tsx:373`–`:390`), so the
same cut is available from the toolbar without changing view. So the answer to *"one table
with a filter, two views of one sub-tab, or two sub-tabs?"* is: **two views of one sub-tab,
and additionally a filter — never two sub-tabs.**

Confirmed live. Walking `/operations/trips` renders:

```
Trips | All / Quick rides / Subscription legs / Flagged / Low rating / Route history
```

Subscriptions is a **separate sub-tab** — `routeTable.ts:414`, `/operations/subscriptions`,
views `All · Active · Expiring ≤ 7 days · At risk · Frozen`, absorbing the legacy `renewal`
page.

Quick rides and subscriptions also meet, deliberately, on two other sub-tabs:

- `operations-requests` — views `All · Instant · Subscription · Pending · Assigned · Expired`
  (`routeTable.ts:396`)
- `financials-pricing` — views `Subscription plans · Quick rides · Rate card · Cancellation fees`
  (`routeTable.ts:631`)

### 1.3 The agreement, quoted

There is **no** agreement anywhere in `docs/` to separate quick rides from subscriptions.
Every recorded decision runs the other way — to **merge**. Three quotations.

**(a) `docs/05-restructure/PROPOSED-STRUCTURE.md:204`** — the source document D1 adopts:

> | **Trips** | `trips` + `quickrides` + `live` (history mode) | All · Quick rides ·
> Subscription legs · Flagged · Low rating · Route history | Quick Rides is `DB.trips`
> filtered to `kind==='Quick ride'` — **the same table with a different filter**. Its four
> KPI tiles are **entirely hardcoded** (`06b` §17 item 1) and its "today" claim is false (no
> date filter is applied, `L3443`). Route history is a replay control over the same trip
> records; it belongs with trips, not with live dispatch. |

**(b) `docs/05-restructure/specs/00-foundation.md:361`–`:366`** — merge M5, the build spec:

> **M5 — Operations › Trips** ← `trips` + `quickrides` + `live` (history mode)
>
> - **Scope:** the flat ledger of every `DB.trips` record, with quick rides as a view
>   (`kind === 'Quick ride'`) and route replay as a view over the same records.
> - **Deliberately lost:** all four `quickrides` KPI tiles, which are hardcoded strings
>   including their bar widths, and whose "today" claim is false — `renderQuickRidesTable`
>   applies no date filter (`06b` §17.1–2). Losing them is the point, per
>   `PROPOSED-STRUCTURE.md` §2.1 **P7**.

**(c) `docs/05-restructure/DECISIONS.md:13`–`:16`** — the binding decision that adopts both:

> ## D1 — Information architecture: 5 workspaces, 34 sub-tabs
>
> **Decided.** The rail adopts `PROPOSED-STRUCTURE.md` as written: five workspaces —
> Management · Operations · Financials · Customer Support · Admin — with 34 sub-tabs
> beneath them.

And on the *subscription* side, the same D1 consequence list at `DECISIONS.md:24` names
`subscriptions` among the five page specs whose scope changes — it gains the renewal
pipeline as a view, it does not lose its sub-tab.

**Verdict: still combined at the trip-record level, and that is exactly what was signed.**
The legacy app is what had them separate — `p-quickrides` at `L1132` and `p-trips` at `L848`
(`GROUND-TRUTH-INVENTORY.md:39`, `:49`), two nav items at `L504`/`L505`. The restructure
merged them on purpose.

### 1.4 The evidence the merge was right

The strongest argument is legacy's own markup. The two pages rendered **one collection**
through two functions with near-identical column sets:

| `renderTripsTable` (`:3388`, 14 cols) | `renderQuickRidesTable` (`:3440`, 11 cols) |
|---|---|
| Trip ID · Date · Rider · Driver · **Type** · km · **min** · Rider pays · Driver earns · **Eyvar** · Tip · **⭐ Rating** · Status · actions | Trip ID · Time · Rider · Driver · **Route** · km · Fare · Driver earns · Tip · **Pay** · Status |

Nine of eleven quick-ride columns already existed on the trips table. The quick-rides page
contributed exactly **one** column the trips table lacked — `Pay` (Cash/Card) — and four
hardcoded KPI tiles above a live table, plus an empty-state string that claims a "today"
filter the function does not apply (`:3443`: `'No quick rides recorded yet today.'` with
no date predicate anywhere in the function). *(Current behaviour, confirmed defect — it is
the one M5 deliberately drops.)*

`src/data/clients/request.ts`'s sibling type states the general rule the project already
uses, and it decides this case. `src/data/types/request.ts:11`–`:20`:

> ## Why one type and not two
>
> Wave 1 split People into four resources because *"they share a screen, not a type"*.
> Requests is the opposite case and the difference is testable: three of the six views —
> `pending`, `assigned`, `expired` — cut **across** both collections […] **A cross-cutting
> view over two clients forces the *screen* to do the union, the sort and the pagination —
> which is the join defect the seam exists to prevent.**

Apply that test to Trips: **four of the six views cut across `kind`** — `all`, `flagged`,
`low-rating`, `route-history`. Splitting Trips into two sub-tabs would make each of those
four either a duplicated screen or a client-side union. The rule the project wrote for
Requests forbids it.

### 1.5 Why the split is nevertheless correct one level up — the operator argument

The owner's framing is the right one: *a subscription is a standing commitment an operator
manages; a quick ride is an event they investigate.* The product agrees, and the proof is
in the verbs, not the nouns.

| | Operations › Subscriptions | Operations › Trips |
|---|---|---|
| Row actions | `Open` · **`Freeze`** · **`Change captain`** · **`Cancel and settle`** (`subscriptions/copy.ts:72`–`:75`) | `Telemetry` · **`Flag`** · **`Remove flag`** (`trips/copy.ts:85`–`:88`) |
| What the action changes | **the future** — what will be delivered tomorrow | **the record** — an annotation on something already finished |
| Fields with no counterpart on the other | `planKey` · `endsOn` · `frozenUntil` · `tripsCompleted`/`tripsIncluded` · `escrowHeldHalalas` · `renewalLikelihoodPercent` · `cancellationReason` · `refundedHalalas` | `latenessMinutes` · `distanceKm` · `durationMinutes` · `driverRatingGiven` · `stateDesynced` |
| Modals shipped | `FreezeModal` · `ChangeDriverModal` · `CancelSettleModal` | `FlagTripModal` |

A subscription has a future to manage. A trip does not. **That is why Subscriptions is a
sub-tab and quick rides is not — and it is the same reason, applied consistently.** Quick
rides are not "the subscription's peer that got demoted"; they are the *event half* of a
business line whose *commitment half* has no equivalent. There is nothing to freeze.

The reverse test also holds. An operator arrives at a trip from a complaint, a dispute, a
safety incident, a payment, or a 360° profile. **None of those entry points knows the `kind`
in advance.** They know `TRP-9102`. A `kind`-first navigation would force every one of them
to guess a door.

### 1.6 One genuine loss from the merge, and one defect

**Loss.** The `Pay` (Cash/Card) column did not survive. The rebuilt Trips index carries
`paymentId` as a link to the payment record (`TripsScreen.tsx:561`–`:580`), `defaultHidden:
true`, so payment *method* is now two clicks away. Cash is a quick-ride problem specifically
— Financials has an entire sub-tab about it (`Cash & Captain Debt`) — and the one view where
an operator wants method at a glance is `Quick rides`. **Recommend:** add a `Payment method`
column, `defaultHidden: true` globally and visible on the `quick-rides` view. Cheap; no new
resource. Owner of the change: product-designer (column spec) then frontend-engineer.

**Defect, new — not one of the 24 in `docs/ref/defects.md`.** `TripsScreen.tsx:574` labels
the **payment** link with the **subscription** key:

```tsx
label={t('trips.open.subscription', { id: trip.paymentId })}
```

`trips/copy.ts` has `trips.open.trip`, `.rider`, `.captain`, `.subscription` — and no
`.payment`. A screen reader announces *"Open the 360° profile for subscription
PAY-5510."* One missing key plus a one-line fix. Affects Arabic identically.

### 1.7 The one place the answer is "no"

**Neither business line has a home an owner can open.** To read the quick-ride business
today an operator visits five screens in three workspaces:

| Question | Where it lives |
|---|---|
| How many quick rides, and how did they go? | Operations › Trips › *Quick rides* |
| What are we charging for them? | Financials › Pricing & Plans › *Quick rides* |
| Did we collect the cash? | Financials › Cash & Captain Debt |
| What demand did we fail to serve? | Operations › Requests › *Instant* |
| What is the revenue mix? | Management › Performance |

Subscriptions has the same shape across five sub-tabs (Subscriptions, Requests ›
*Subscription*, Trip Assurance, Corporate Accounts, Pricing › *Subscription plans*).

**This is deliberate and it follows from D1's stated principle** (`DECISIONS.md:43`): the IA
*"organises the product by the job someone is paid to do rather than by how the software was
built."* Nobody is paid to run "quick rides"; people are paid to dispatch, to investigate, to
price, to collect. A product-line workspace would cut across every one of those jobs.

**But the gap is real and it already has an answer.** D1a added **Management › Reports** —
the ad-hoc semantic layer — and its plan already names `Trip.kind` as a dimension:
`docs/05-restructure/build/03-analytics-plan.md:73`

> | **Subscription : quick-ride trip mix** | Whether quick rides feed the subscription
> business or cannibalise it. | **A** — `Trip.kind`. |

**Recommend: a saved dashboard per business line, not a sub-tab per business line.** Two
dashboards — *Quick rides* and *Subscriptions* — seeded in `Management › Reports ›
Dashboards`. That is what the Report Builder was built for, it costs no navigation, and it
is the only surface where "the business line" is a legitimate first-class object.

---

## Part two — the judgement half

### 2. What was walked

All 35 sub-tabs across 5 workspaces rendered without a page error. (The brief says 34; the
count is **35** since **D1a** added Management › Reports — `DECISIONS.md:46`.) The `h1` and
the rendered view tabs, verbatim from the walk:

```
management  Overview · Performance · Risk & Signals · Growth · Market & Zones · Reports
operations  Overview · My Work · Live Dispatch · Requests · Subscriptions ·
            Corporate Accounts · Trips · Trip Assurance · People
financials  Overview · Revenue & Refunds · Payouts & Escrow · Cash & Captain Debt ·
            Rider Wallets · Pricing & Plans · Ledger & Payment Controls
support     Overview · Tickets · Disputes & Claims · Captain Fairness ·
            Safety & Incidents · Contact Centre
admin       Overview · Workspace · Team & Access · Operational Policy ·
            Communications · Data & Compliance · Activity Log
```

Test suite: **3082 pass, 1 fail** — `src/commands/commands.test.tsx:545`, a ⌘K
bulk-suspend dialog that never appears. Unrelated to grouping; recorded because the brief
stated the tree was green and it is not.

### 3. What is grouped correctly, and should not be touched

Stated first so the findings below are read as exceptions rather than as a verdict on the
whole IA.

- **Financials is the best-organised workspace in the console.** Seven sub-tabs, seven
  distinct money nouns, no overlap: what came in (Revenue & Refunds), what goes out to
  captains (Payouts & Escrow), what a captain physically holds and owes back (Cash &
  Captain Debt), what riders hold (Rider Wallets), what we charge (Pricing & Plans), and
  the double-entry books (Ledger). On the owner's named pair — **cash vs payouts vs
  ledger** — all three earn their place. Cash is a **claim/dispose work queue** and Payouts
  is a **batch run**; the screen header says so and refuses to blend them
  (`CashScreen.tsx:4`–`:10`: *"the two rule sets do not mix — they are two views on one
  route, never one table with two moods"*). Ledger is the books the other two post into.
  **No change.**
- **Trip Assurance** (`readiness` + `coverage` + `commitment`) is the strongest merge in the
  restructure and it holds up: three legacy pages answering one question at three horizons,
  now four views on one route.
- **People** (`drivers` + `all-pending` + `applicant-detail` + `compliance` + `riders`) is
  correctly a shared screen over four separate resources, and the route table says why
  (`routeTable.ts:503`): *"Four separate resources with four separate clients — they share a
  screen, not a type."*
- **Corporate Accounts** in Operations, not Financials, decided on permission evidence
  rather than intuition (`PROPOSED-STRUCTURE.md:203`): 5 of 6 write actions need
  `manage_subscriptions`. Correct.
- **Tickets vs Disputes** — genuinely two. A ticket is a conversation with an SLA and a
  reason code; a dispute is a money claim with evidence and a settlement ceiling
  (`types/dispute.ts:186`, carrying `amountHalalas` as *"a settlement ceiling"*). Keep
  apart. See F-6 for the one thing missing between them.
- **Safety vs Fairness** — two respondents, two jobs. Safety adjudicates an incident
  *against a person*; Fairness adjudicates the captain's contest *against Eyvar*. Keep
  apart. But see **F-2**: one of Fairness's four views does not belong to it.
- **Zones vs Dispatch** are correctly two screens — a map of live vehicles and a table of
  zone health are different instruments. The problem is not that they are split; it is
  which workspace one of them is in. See **F-1**.

### 4. Findings

Ordered by cost to the operator.

---

#### F-1 — **Market & Zones is in the wrong workspace, and the Dispatcher cannot see it**

**Severity: high.** This is the clearest mis-grouping in the console.

`Management › Market & Zones` (`routeTable.ts:230`) is filed as an executive board. What it
actually renders is **an operational table with two live levers**
(`ZonesScreen.tsx:185`, `:227`; copy at `zones/copy.ts:48`–`:65`):

| Action | What it does |
|---|---|
| **Steer captains** | Sends a live per-trip bonus offer into a starved zone, up to a cap. *"Bonus per completed trip in the zone… Paid on top of the fare, per trip, inside this zone."* Toast: `Offer live`. |
| **Queue recruitment** | Queues a recruitment drive for the zone. |

Its nav badge counts **starved zones** (`navCounts.ts:71`–`:88`; fixture value `2`). A
starved zone is a live supply emergency, badged in the workspace an executive opens once a
week. The screen even imports its confirm/undo machinery from Financials
(`ZonesScreen.tsx:100`: `import { useMoneyActions } from '@/screens/financials/shared/actions'`)
— one screen straddling three workspaces.

**The cost, computed from `ROLE_PERMISSIONS` against the route table:**

| Role | Sub-tabs visible | Market & Zones |
|---|---|---|
| Owner | 35 | ● |
| Ops Manager | 34 | ● |
| Trust & Safety | 22 | ◐ read-only |
| Support | 16 | ○ hidden |
| Finance | 14 | ◐ read-only |
| **Dispatcher** | **10** | **○ hidden** |

**The Dispatcher — the role created to sit on `/operations/dispatch` and move supply in real
time — cannot see the starved-zone list or the incentive lever.** They hold
`view_operations`, `view_profiles`, `live_ops`, `contact_users` (`types/session.ts:137`).
Market & Zones needs `view_analytics` to see and `manage_ops_policy` to act. They hold
neither.

**This is the workspace choice causing the permission failure, not a separate bug.** The row
was filed under Management because its *content* looks analytical, and Management is gated
on `view_analytics`. The gate followed the filing.

**Recommendation.** Move the **table** to **Operations**, adjacent to Live Dispatch, with
`viewPermission: 'view_operations'` and `writePermission: 'manage_ops_policy'`; add
`manage_ops_policy` to the Dispatcher, or split a narrower `steer_supply` key. Keep the
**analysis** — expansion-ready markets, demand/supply trend — in Management, either on
Performance or as a saved dashboard. The screen already separates the two halves: a §3.7
metric strip over a §3.1 index table.

**This interacts with an open decision and must be answered with it.** **D15**
(`DECISIONS.md:1035`) proposes collapsing Management to *"Overview · Risk & Signals · Market
& Zones"*. If Zones moves to Operations, D15's residual is **two** sub-tabs, not three.
`DECISIONS.md:69` already records what happens when paired decisions are answered singly —
*"the risk is not the row; it is the second signature."* **F-1 and D15 go to the owner in
one sitting.**

---

#### F-2 — **Complaints is an orphan concept: a full work queue with no screen, and it duplicates a Fairness view**

**Severity: high.** Two problems with one fix.

**(a) The orphan.** `Complaint` is fully modelled and completely unreachable as a queue:

- `src/data/types/complaint.ts:347` — `export interface Complaint extends SlaTracked`,
  with severity, reason code, a separate `ComplaintResolution`, and `tripId` /
  `subscriptionId` / `ticketId` cross-links.
- `src/data/clients/complaints.ts:49`–`:55` — a client with `list`, `get`,
  `countForDriver`, **`claim`, `release`, `resolve`**. Those three verbs *are* a work queue.
- `src/data/fixtures/complaints.ts` — seeded rows.
- **No sub-tab renders it.** Grep across `src/screens` and `src/shell` returns zero call
  sites for `listComplaints`.
- **`WorkQueueId` has nine members and `complaint` is not one of them**
  (`types/workQueue.ts:159`–`:177`), so it cannot reach My Work either.

The only surfaces are a **count** on People's Captains and Riders views, and
`?entity=CMP-330` on the 360° profile (`clients/profile.ts:412`). So `Driver.openComplaints`
is a sortable number an operator cannot open into a list, and no complaint in the product can
be claimed, worked or resolved. The type's own header already named this failure mode for the
*previous* iteration (`types/complaint.ts:16`–`:20`): *"`Driver.openComplaints` is a count
with nothing behind it, the Risk & Fraud column sorts on a number no operator can open."*
The record was restored; the screen was not.

**(b) The duplicate.** `Support › Captain Fairness` has four views, and the third is
**`rider-reports`** — `FairnessCase.kind === 'rider-report'`
(`types/fairness.ts:39`, `clients/fairness.ts:127`). A rider reporting a captain. That is
the same real-world event as a `Complaint`, modelled twice:

| | `FairnessCase` (`rider-report`) | `Complaint` |
|---|---|---|
| Base | `extends SlaTracked` | `extends SlaTracked` |
| Captain | `driverId` / `driverName` | `driverId` / `driverName` |
| Rider | `subjectId` / `subjectName` | `riderId` / `riderName` |
| Resolution | `status` + `rationale` | separate `ComplaintResolution` |
| Screen | Support › Captain Fairness, view 3 | **none** |

`types/complaint.ts:22`–`:24` notices the resemblance and builds a fourth type anyway:
*"`FairnessCase` and `SafetyIncident` already established the house vocabulary and this file
deliberately adds no fourth one."* It added a fourth record for the same event instead.

**(c) And `rider-report` does not belong in Fairness on its own merits.** Fairness's other
three views are the **captain contesting Eyvar** — a suspension appeal, a rating dispute, an
economics grievance; the respondent is the platform, and on a suspension appeal
`subjectId` is explicitly `null` *"where the counterparty is Eyvar itself"*
(`types/fairness.ts:69`). A rider report is a **rider accusing the captain**. Same queue,
opposite direction. The sub-tab currently means two contradictory things.

**Recommendation.**

1. **Support › Captain Fairness** narrows to what its name says — the captain contests the
   platform: `Suspension appeals · Rating disputes · Captain economics`. Three views.
2. **Support › Disputes & Claims** takes the conduct work:
   `Disputes · Complaints · Rider reports · Lost & found`. All four are *"a customer says
   something went wrong and someone must adjudicate"*; the mechanics are identical
   (claim / release / resolve with an SLA) and the only thing that varies is whether money
   moves — which is a **field**, not a screen. The sub-tab's name already says *Claims*.
3. `WorkQueueId` gains `complaint`; `WORK_SOURCES` gains it (see **F-4**).

Sub-tab count is unchanged. Type count is unchanged — `Complaint` and `FairnessCase` stay
separate types sharing a screen, which is the People precedent verbatim.

**Escalation for the boundary between `Complaint` and `FairnessCase.rider-report`:** whether
these should also merge as *types* is a data decision, not mine. Raised to
mock-data-engineer. My position: keep two types, one screen, and add a discriminant if they
converge further.

---

#### F-3 — **Trip write authority is a dispatch key, so Trust & Safety cannot flag a trip and a Dispatcher can**

**Severity: medium-high.**

`routeTable.ts:477` — `operations-trips.writePermission = 'live_ops'`.

The only two write actions on Trips are **`Flag`** and **`Remove flag`**
(`TripsScreen.tsx:649`, `:655`). Flagging a completed trip is a fraud-and-safety
annotation: `Trip.flagged` feeds the Risk & Signals board and the captain risk score.
`live_ops` is the *live board* key.

Consequence, from the computed matrix:

- **Trust & Safety** — the role D17 created specifically to hold `approve_drivers` and clear
  the Safety queue — is **read-only on Trips**. They can see a flagged trip; they cannot flag
  one.
- **Dispatcher** holds `live_ops`. They **can** flag, and adjudicating fraud is not their job.

D17 already made exactly this correction one row over, and recorded the reasoning
(`routeTable.ts:762`–`:766`):

> **The important D17 narrowing.** §10.3 gave Support `●`; its own R5 says the Support role
> "is not equipped for a suspension decision". Trust & Safety now exists and holds
> `approve_drivers`, so Support is `◐` here.

**Recommendation.** `operations-trips.writePermission: 'approve_drivers'`. This is a
**consequence of the grouping**, not an independent bug: Trips sits in Operations, so it
inherited an Operations key. Owner: business owner (a D17 amendment), one row.

---

#### F-4 — **My Work routes over 5 of 9 declared queues, so a Support agent's inbox contains no tickets**

**Severity: medium-high.** My Work is the sub-tab that *justifies* the workspace split — the
cross-cutting inbox that lets an operator work without knowing which workspace a thing lives
in. It currently cross-cuts less than half the product.

`clients/myWork.ts:451`–`:457`:

```ts
export const WORK_SOURCES: readonly WorkQueueId[] = [
  'application', 'request', 'assurance', 'incident', 'fairness',
]
```

`WorkQueueId` declares nine (`types/workQueue.ts:159`–`:177`). **Missing: `ticket`,
`dispute`, `erasure`, `absence`** — plus `complaint`, which is not in the union at all
(F-2). The badge reads **22**.

The file's own header explains the omission (`myWork.ts:15`–`:22`):

> ## Two queues are missing and it is not an oversight
>
> Legacy's inbox covers twelve collections. Four of them — tickets, disputes, lost & found,
> PDPL erasure — are **wave 3** […] As each lands, one entry is added to `SOURCES` below and
> nothing else changes.

**Wave 3 has landed.** `Support › Tickets`, `Support › Disputes & Claims` and
`Admin › Data & Compliance` all render, all badge (3, 0 and 1 respectively), and all have
clients. The comment describes a pending state that is now overdue.

The operator cost: a Support agent opening My Work sees applications, requests, assurance,
incidents and fairness cases — **and none of their own tickets.** The sub-tab whose whole
purpose is "one place to see what is owed" omits the two largest queues in Support.

**Recommendation.** Add `ticket`, `dispute`, `absence`, `erasure` and `complaint` to
`WORK_SOURCES`. This is a data-layer change with a screen consequence; owner:
mock-data-engineer, with the SLA source per queue confirmed first (Cash's precedent at
`CashScreen.tsx:12`–`:22` is that *rendering an SLA a queue does not have is itself the
failure* — so `dispute` and `erasure` need their windows named or `slaSource: 'unset'`
asserted before they are added).

---

#### F-5 — **The 360° profile is the cross-workspace bridge, and it is ungated**

**Severity: medium.** Relevant here because it is what makes the workspace split *safe*.

The workspace split is deliberately hard: **Finance sees 14 of 35 sub-tabs and zero
Operations rows.** They cannot open a subscription, a trip, or a corporate account from the
nav. That is D17 working as designed, and it is defensible **because** the 360° profile
crosses every boundary — `PROFILE_ENTITY_TYPES` covers `trip`, `subscription`, `payment`,
`complaint` and seven more (`clients/profile.ts:235`–`:238`), and Financials links into it
from every entity cell (`financials/shared/entityLinks.tsx:1`–`:9`). So a finance operator
reconciling a payout reaches the trip behind it in one click without holding
`view_operations`. **On the owner's test — "a finance operator should not need Operations to
do their job" — the design passes.**

But the bridge has no gate:

- `routes.tsx:341`–`:349` mounts `/entity/:entityId` with **no `RouteGuard`**, unlike every
  sub-tab row and every other detail route.
- `AppLayout.tsx:613` renders the `?entity=` overlay with no `view_profiles` check.

So `view_profiles` — held by all six roles today, which is why nothing has surfaced — gates
nothing. The moment a role exists that should not read personal records, the boundary that
justifies the whole split is not enforced. **Recommendation:** gate both on `view_profiles`,
rendering `ForbiddenScreen` per §11.2. Owner: shell owner.

---

#### F-6 — **A ticket that becomes a dispute cannot be traced forward**

**Severity: low-medium.** The owner's *tickets vs disputes* pair, resolved.

The same real-world event enters through two doors. `types/dispute.ts` cites a **ticket** as
the evidence for one of its dispute kinds: *"`fare-dispute` | `fixtures/tickets.ts`
`TKT-501`, reason code `fare_dispute`."* A fare argument is a ticket if the rider called and
a dispute if they filed a claim.

The link is modelled **one way only**:

- `Dispute.ticketId: string | null` (`types/dispute.ts:212`) ✓
- `Complaint.ticketId: string | null` (`types/complaint.ts:379`) ✓
- `Ticket` — **no `disputeId`, no `complaintId`** (`types/ticket.ts:67`)

So from a dispute you can reach its ticket; from the ticket you cannot see that it became a
dispute. A support agent re-answers a question that is already being adjudicated elsewhere,
and the two queues can reach opposite conclusions.

**Recommendation.** Not a merge — the records are genuinely different. Add the back-reference
and an explicit **`Escalate to dispute`** action on the ticket detail that creates the
dispute with `ticketId` set. Owner: product-owner to spec (`support-escalation` feature
spec), mock-data-engineer for the field.

---

#### F-7 — **The route table is not the whole navigation: 29 view tabs live in screen code**

**Severity: low, but it makes every nav audit incomplete by construction.**

Seven sub-tabs declare `views: []` in `routeTable.ts` and render view tabs from screen-local
constants. Observed live:

| Sub-tab | `routeTable.views` | Rendered |
|---|---|---|
| `operations-dispatch` | 0 | 3 (`Active trips` · `Pending dispatch` · `Fleet online`) |
| `financials-revenue` | 0 | 5 |
| `financials-payouts` | 0 | 3 |
| `financials-cash` | 0 | 3 |
| `financials-rider-wallets` | 0 | 3 |
| `financials-ledger` | 0 | 6 |
| `support-contact-centre` | 0 | 6 |

Already reported at source (`financials/shared/views.ts:8`–`:21`): *"Spec §5 declares views
for six of the seven sub-tabs. `routeTable.ts` carries them for one […] That is a gap in the
route table, not a decision made here."* Restated because it is now **seven** rows, not five,
and because of the consequences for this assessment: a view that is not in the route table
cannot be permission-gated, cannot be resolved by global search — the trick §4.3.4 uses so
*"Cancellation Policy"* lands on `financials-pricing?view=cancellation-fees` — and cannot be
counted. `routes.test.ts` asserts the Reports screen's local list matches its row precisely
so it cannot drift; the other seven have no such guard.

**Recommendation.** Backfill the 29 view rows into `routeTable.ts`. Single-owner file; the
screens swap `SCREEN_VIEWS` for `row.views` with no behaviour change, which
`views.ts:17`–`:19` already anticipates.

---

#### F-8 — Two small semantic drifts, recorded not escalated

- **`hasBacklog` on a board with no backlog.** `management-risk` carries `hasBacklog: true`
  and badges `6`, while `navCounts.ts:145`–`:147` states *"Risk & Signals computes a flag and
  routes the operator elsewhere — §3.4's M1 ruling is explicit that it 'has no work queue'.
  Six standing signals, nothing breached, nothing to action here."* The field is defined as
  *"whether this sub-tab owns a backlog"* (`types/navigation.ts:281`). It is being used as
  "may carry a badge". Two meanings, one boolean. Cosmetic today; it will mislead whoever
  next writes a rule over `hasBacklog`.
- **`Financials › Ledger & Payment Controls` bundles two configuration panes** — *Payment
  gateways* and *VAT & invoicing* — behind a sub-tab whose default view is a trial balance.
  D1 was right to move them out of Admin into a money workspace; whether setup belongs on the
  accounting sub-tab is a design question, and the title is at least honest about it. **No
  change recommended**; recorded so it is not rediscovered as a finding.

---

### 5. Recommended navigation shape

**The current shape is right in outline. Five workspaces stay; the count stays at 35.** Four
row-level moves, and none of them is a redesign.

```
MANAGEMENT   Overview · Performance · Risk & Signals · Growth · Reports        (6 → 5)
                └ Market & Zones LEAVES                                           [F-1]

OPERATIONS   Overview · My Work · Live Dispatch · Market & Zones · Requests ·
             Subscriptions · Corporate Accounts · Trips · Trip Assurance ·
             People                                                             (9 → 10)
                └ Market & Zones ARRIVES, next to Live Dispatch                   [F-1]
                └ My Work sources 5 → 10 queues                                   [F-4]
                └ Trips write key live_ops → approve_drivers                      [F-3]
                └ Trips gains a Payment method column                             [§1.6]

FINANCIALS   unchanged                                                              (7)

SUPPORT      Overview · Tickets · Disputes & Claims · Captain Fairness ·
             Safety & Incidents · Contact Centre                                    (6)
                └ Disputes & Claims: Disputes · Complaints · Rider reports ·
                  Lost & found                                                    [F-2]
                └ Captain Fairness: Suspension appeals · Rating disputes ·
                  Captain economics                                               [F-2]
                └ Tickets gain an "Escalate to dispute" path                       [F-6]

ADMIN        unchanged                                                              (7)

SHELL        360° profile · notifications · my account — gated on view_profiles    [F-5]

REPORTS      + two seeded dashboards: "Quick rides" and "Subscriptions"          [§1.7]
```

Net: **5 workspaces, 35 sub-tabs.** One row moves workspace. One view moves sub-tab. Two
permission keys change. No new sub-tab, no new page shape, and every recommendation maps to
an existing §6.4 pattern row.

**What is explicitly NOT recommended, and why:**

| Not doing | Reason |
|---|---|
| Splitting Trips into `Quick rides` and `Subscription legs` sub-tabs | Four of six views cut across `kind`; the split forces a UI-side union — the exact defect `types/request.ts:17` says the seam exists to prevent. And investigators arrive knowing `TRP-9102`, not its kind. |
| A `Quick rides` or `Subscriptions` **workspace** | Cuts across every job in D1's principle. The Report Builder is the right surface for a business-line view. |
| Merging Tickets into Disputes | Different records, different resolutions, different SLAs. The gap is a link, not a merge (F-6). |
| Merging Safety into Fairness | Different respondents. Safety adjudicates against a person; Fairness adjudicates against Eyvar. |
| Merging Cash into Payouts | A claim/dispose queue and a batch run. `CashScreen.tsx:4` refuses the blend for the right reason. |
| Moving Corporate Accounts to Financials | Decided on permission evidence in `PROPOSED-STRUCTURE.md:203` and the evidence still holds. |

---

### 6. Open questions — each with its blocker

| # | Question | Who answers | Blocked until then |
|---|---|---|---|
| **G-1** | **Does Market & Zones move to Operations?** F-1. Must be answered **together with D15**, which assumes it stays in Management. | Business owner | The Dispatcher role is shipped unable to do the job it was created for. `management-zones` row, D15's residual count, `session.ts` Dispatcher keys. |
| **G-2** | **Does `Flag trip` become `approve_drivers`?** F-3. A D17 amendment. | Business owner | Trust & Safety ships read-only on the flag their own board consumes. |
| **G-3** | **Where do complaints live — Disputes & Claims, or a new Conduct sub-tab?** F-2. My recommendation is the former; the sub-tab count is the owner's. | Business owner | A modelled work queue with claim/release/resolve has no UI at all. Blocks the complaints feature spec. |
| **G-4** | **Do `Complaint` and `FairnessCase.rider-report` stay two types?** F-2(b). My position: two types, one screen. | mock-data-engineer, with product-owner | The complaints spec cannot name its resource. |
| **G-5** | **What is the SLA window for `dispute` and `erasure`?** Needed before F-4 adds them to My Work — a queue with a fabricated countdown is worse than an absent one (`CashScreen.tsx:12`). | Support lead / business owner | `WORK_SOURCES` cannot be completed; My Work stays at 5 of 10. |
| **G-6** | **Is `financials-pricing`'s commission figure settled?** Standing **Q7** (`specs/00-foundation.md:1575`) — four pricing models disagree, and `Trip.platformCutHalalas` is computed from one of them. Quoted here because it is the one open item that touches *both* business lines' economics. | Finance lead, with business owner | Any quick-ride or subscription P&L dashboard (§1.7) would publish a number nobody has ratified. |

Not blocking, no decision needed: **F-5** (gate the profile — shell owner), **F-7**
(backfill 29 view rows — route-table owner), **§1.6** (`trips.open.payment` key —
frontend-engineer, one line), and the failing `commands.test.tsx:545`.

---

### 7. Permissions summary

Cross-referenced to `docs/01-modules/00c-identity-permissions-and-audit.md` and **D17**
(`DECISIONS.md:2123`). Computed from `ROLE_PERMISSIONS` (`types/session.ts:93`) against all
35 rows.

| Role | Sees | Read-only on | Hidden |
|---|---|---|---|
| Owner | 35 | — | — |
| Ops Manager | 34 | 8 (5 money, 3 admin) | `admin-team` |
| Trust & Safety | 22 | 8 — **including `operations-trips`** [F-3] | 13 (all Financials, all Admin bar Activity) |
| Support | 16 | 8 — including `support-safety` (D17, correct) | 19 |
| Finance | 14 | 2 (`management-risk`, `management-zones`) | 21 — **all 9 Operations rows** |
| Dispatcher | 10 | 3 | 25 — **including `management-zones`** [F-1] |

Two of the six rows in that table are findings. The other four are D17 working as designed.

---

### 8. Arabic

No grouping change proposed here creates an untranslatable string. Two i18n notes:

- **`trips.open.subscription` is used for a payment link** (`TripsScreen.tsx:574`). Wrong in
  both languages; needs a `trips.open.payment` key. §1.6.
- **Every recommended view rename is a key, not a string.** `view.fairness.riderReports`
  moves sub-tab; its key travels with it. Three new keys are needed —
  `view.disputes.complaints`, `view.disputes.riderReports`, and a `Payment method` column
  header — all with named placeholders, no concatenation.

---

### 9. Method and limits

- 35/35 sub-tabs loaded at `localhost:5303`, headless Chromium 1440×900, **zero page
  errors**. `h1` and view tabs captured per route; sample in §2.
- Permission matrix **computed**, not read from a doc — the role switcher is mock-only
  (`clients/session.ts:152`) with no URL affordance, so per-role rendering was not walked in
  the browser. The matrix is deterministic data and is stated as such.
- Detail routes (`/operations/corporate/:id`, `/support/tickets/:id`,
  `/support/contact-centre/:id`, `/operations/people/applications/:id`,
  `/management/reports/:id`, `/management/reports/dashboards/:id`,
  `/financials/pricing/plans/:id/edit`) and the shell layers were **not** walked. Findings
  here are about sub-tab grouping.
- `npx vitest run --maxWorkers=4`: 3082 pass / 1 fail (`commands.test.tsx:545`). Unrelated.
- Read-only. No production file was modified.
