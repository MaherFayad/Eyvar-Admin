# 02 — Work queues: Requests · Trip Assurance · My Work · Safety & Incidents · Captain Fairness

> **Wave 2** of `PHASE-PLAN.md`. Five sub-tabs across two workspaces, all carrying
> `DESIGN.md` §6.4 pattern **P8 — Work queue (§8.4)**.
>
> **Reads:** `specs/00-foundation.md` §3.4, §3.6 (M3, M6), §5.1, §7.3, §8.5, §12 ·
> `DECISIONS.md` D1, D5, D6, **D7** · `DESIGN.md` §8.4 (all six sub-sections and the four rule
> blocks) · `design/00-shell.md` §9.3 · `docs/01-modules/03b`, `07b`, `07c`, `10a`, `10b`, `10c`,
> `10e`, `15k` · `eyvar_ops_panel_v40_fixed.html`.
>
> **Numbering:** acceptance criteria run from **AC-200**. AC-01–79 belong to
> `specs/00-foundation.md`; AC-80–116 belong to the table-controls pass
> (`design/01-table-controls.md`).
>
> **This spec closes foundation open question Q8** (§4.3) and takes a position on **Q13** (§11).
>
> **Behaviour only.** The visual language is being re-derived against Navattic under **D7**. Every
> state below is defined by what it *is* and what the operator can do in it, never by how it looks.
> Where this spec says "tone", it means the semantic token name, not a colour.

---

## 1. Problem

An operator running Eyvar's supply side spends the day inside eight legacy pages that each invented
their own answer to the same four questions: *who is working this, how long have we got, what are my
choices, and what happens to the row after I decide.* The legacy app answers them eight different
ways — two ownership models that disagree (`:18858` vs `:11876`), six countdown components
(`:333`, `:140`, `:19230`, `:9921`, `:9937`, `:14791`), a progress bar whose denominator is the
literal `90` regardless of the queue it is drawn on (`:11652`), and three queues that hardcode
`dueMs = -1` so their rows are permanently "overdue 0m" (`:19154`, `:19168`, `:19191`). Two of the
five surfaces have no clock at all. One — Safety & Incidents — has no way to create the records it
exists to work, no way to reopen one, and no way to undo the only irreversible thing it can do. The
consequence is not cosmetic: an Ops Manager opening the work inbox today sees **nothing**, because
the routing table sends eleven of twelve queues to a role string, `'Operations'` (`:19091`–`:19102`),
that is not in `TEAM_ROLES` (`:10501`). The operator cannot tell what is owed, cannot tell what is
late, cannot tell whether a colleague is already on it, and — on the one queue where a life may be at
stake — cannot tell that anything happened at all, because the badge is written only by the page's
own render function and is therefore `0` until someone visits it (`:13406`).

---

## 2. Scope

### 2.1 In

1. **The shared work-queue contract** (§4) — one ownership model, one clock, one disposition
   grammar, one breach signal, one ordering rule, three empties. Five surfaces inherit it; a sixth
   (Financials › Cash & Captain Debt escalations) inherits it in wave 3.
2. **Per-queue SLA targets**, stated as a number with the source of that number (§4.3). This closes
   **Q8**, and it closes it for `all-pending` (Operations › People › Applications) too, because that
   queue shipped in wave 1 against a fixture placeholder.
3. **Operations › Requests** (`/operations/requests`) — merge **M3**, `requests` +
   `requests-sub-all` + `requests-instant-all`.
4. **Operations › Trip Assurance** (`/operations/assurance`) — merge **M6**, `readiness` +
   `coverage` + `commitment`.
5. **Operations › My Work** (`/operations/my-work`) — `inbox`, re-specified as a **projection**
   over the other queues rather than a queue of its own.
6. **Support › Safety & Incidents** (`/support/safety`) — including the **`SafetyIncident` domain
   model that does not exist yet**: states, severities, the two clocks, what acknowledgement means,
   who is notified, what closes an incident, and how an incident is created at all.
7. **Support › Captain Fairness** (`/support/fairness`) — the three case views as a queue; the
   captain-economics view as a read-only surface that is explicitly *not* a queue.
8. **The corrected role-routing table** for My Work, mapped onto roles that exist.
9. **Findings** on legacy behaviour that looks wrong (§10) — recorded, not silently reproduced and
   not silently fixed.

### 2.2 Out

| Out | Reason |
|---|---|
| **Layout, spacing, colour, component structure, final copy strings** | product-designer owns §6.4→design translation. This spec names patterns and states; it does not specify surfaces. `DESIGN.md` §8.4's rule blocks already bind and are cited, not re-litigated. |
| **The Live Dispatch monitoring shell** (`/operations/dispatch`) | Wave 6, pattern P6. The instant-request tick engine (`:12526`–`:12574`) feeds both Requests and Dispatch; Requests consumes its output and does not own it. |
| **Route replay / history mode** | M5, Operations › Trips. Named here only because `live` contributes to both. |
| **The capacity grid** (`readiness`/`coverage` slot matrix) | Deliberately lost per M6: `slotOf()` strips AM/PM without converting, so "7:30 PM" becomes slot 07:30 and everything outside 06:00–08:30 collapses into 07:00 (`10c` §17.5, §17.7). Reinstating it means rebuilding it; that is not wave 2. |
| **The four `quickrides` KPI tiles** | M5's deliberate loss, restated so nobody re-adds them here. |
| **Ticket→incident escalation** (Safety source 2) | Support › Tickets is wave 5. The `SafetyIncident` type carries a `source` field with `escalated-ticket` in its enum so wave 5 does not need a migration, but no UI path exists in wave 2. |
| **Bulk disposition on any queue** | `DESIGN.md` §8.4: *"Bulk disposition MUST NOT ship."* A decision made twenty at a time is not a decision. |
| **The captain-facing app** | Nightly confirmation, backup offers and SOS all originate on a device this console does not build. In scope: what the console does with the event. Out of scope: how the event is raised. |
| **Emergency-dispatch money settlement** (`10b` §4.7) | It is ledger work — postings, multipliers, rider goodwill credits. It belongs to Financials (wave 3), and Trip Assurance links to it rather than performing it. |
| **The four pricing models** | Blocked on **Q7**. Nothing in wave 2 renders captain earnings; the captain-economics view in Fairness renders `earnings ÷ engaged hours` from trip records only, and is labelled an upper bound (§9.5). |
| **Persisting a queue's view, filters or sort across a reload** | Blocked on **Q1**. Queues ship in-memory like everything else; this is a recorded gap, not a surprise. |
| **Audible breach alerts** | `DESIGN.md` §8.4.3 requires them to be opt-in with a visible mute. No preference store exists (**Q1**), so wave 2 ships **silent** and the mute control is deferred. Recorded, not skipped: `playAlertBeep()` (`:9731`–`:9749`) is unconditional today and must not be ported. |

---

## 3. The screens

| # | Sub-tab | Route | §6.4 pattern row | Finding |
|---|---|---|---|---|
| 1 | Operations › **Requests** | `/operations/requests` | Work queue (§8.4) — `requests`, `requests-sub-all`, `requests-instant-all` all sit in `patterns.md`'s P8 row | Row is correct. |
| 2 | Operations › **Trip Assurance** | `/operations/assurance` | `readiness` is in P8. **`coverage` and `commitment` are in the P5 (Metric tiles) row.** | **F-1, below.** |
| 3 | Operations › **My Work** | `/operations/my-work` | `inbox` is in the **P10 (Activity feed)** row; foundation §3.4 records it as "Activity feed (§3.8) over Work-queue rows (§8.4)" | Row is correct as a union; §7 makes the union explicit. |
| 4 | Support › **Safety & Incidents** | `/support/safety` | `safety` is in the **P9 (Index table → detail with timeline)** row | **F-2, below.** |
| 5 | Support › **Captain Fairness** | `/support/fairness` | `fairness` is in the **P5 (Metric tiles)** row; foundation §3.4 records "cases are a Work queue (§8.4)" | Row is correct as a union; §9 makes it explicit. |

**F-1 — Trip Assurance's pattern row is a union, and two thirds of it is filed under the wrong
pattern.** `coverage` and `commitment` sit in `patterns.md`'s Metric-tiles row because both legacy
pages open with a KPI strip. But `commitment` carries claimable items with deadlines and a closed
disposition set (`Uphold` / `Reject` on an emergency claim, `:17054`–`:17055`; `Mark confirmed` /
`Hand to backup` on a leg, `:16972`), and `coverage` carries a per-subscription remediation with a
`Register` / `Replace` action (`:17550`). Those are queue rows by §8.4's own definition. **Requested
change:** the §6.4 rows for `coverage` and `commitment` become **Work queue (§8.4) + Metric tiles
(§3.7)**, a union like `fairness`. This is an edit to
`docs/06-design-reference/_partials/06-eyvar-mapping.md` followed by a `build-design.py` rebuild —
**product-designer owns that edit**, exactly as they own the `fraud` row change (foundation §3.4).
Nothing in this spec is blocked on it; the sub-tab is specified as the union either way.

**F-2 — Safety & Incidents is a work queue, and its route-table row says it is not.** `safety` is
filed under P9 and `src/data/fixtures/routeTable.ts:600` declares `patterns: ['P9']` with
`detailRoutes: []`. An incident is claimed by one person, has a deadline running against it, is
decided once and then leaves — §8.4's definition, met in full. It *also* has a record with a
timeline, which is P9. **Requested changes**, both to files owned by mock-data-engineer:
`patterns: ['P8', 'P9']`, and a level-3 detail route `/support/safety/:incidentId` added to
`detailRoutes` with `detailKind: 'entity'`. Under foundation §5.1 the sub-tab then carries the union
of both, on one route, exactly as Operations › People does.

**No wave-2 sub-tab maps to a pattern row that does not exist.** Both findings are misfilings of
existing rows, not a missing shape, so neither is an escalation.

---

## 4. The shared work-queue contract

Everything in this section applies to all five sub-tabs and to any queue built later. A per-queue
section may **narrow** a rule; it may not contradict one. Where a queue departs, the departure is
named in that queue's section with its reason.

### 4.1 What a queue row is, and the admission test

`DESIGN.md` §8.4: *"An index row is a resource… A queue row is a unit of work: it is claimed by one
person, it has a deadline running against it, it is decided once, and then it leaves."*

**The admission test.** A record belongs in a work queue only if all four hold:

1. **Someone is expected to act on it**, and the act is not "look at it".
2. **It has a decision**, drawn from a set that is closed and written down.
3. **After the decision, no further action is owed** — the row converts and stops being work.
4. **Somebody would notice if nobody ever got to it.**

A record failing any of the four is an index row, a ledger row, or a metric — not a queue row. This
is the test that moved `fraud` out of P8 (foundation §3.4) and it is the test that keeps the
captain-economics view out of the Fairness queue (§9.1).

### 4.2 Ownership — claim, release, take-over, expiry

**One model.** `Claim`, already typed in `src/data/types/common.ts:265`, keyed `entityType:entityId`
(legacy `ckey()`, `:18858`). The ad-hoc `_locking` / `claimedBy` fields written directly onto request
records (`:11876`, `:10237`) are a defect and are not an alternative implementation
(`DESIGN.md` §8.4.1).

**Q-1 — A claim is a declaration, not a lock.** It says *"I am working this"* so a colleague does not
start the same case. It does not prevent anyone else from acting; it makes acting anyway a deliberate,
recorded act. Every rule below follows from that one sentence.

**Q-2 — Who may claim.** Any operator who holds the queue's **work** permission (§4.13). An operator
holding only the queue's `view` permission sees the owner chip in its non-interactive state and can
read who holds what. Read-only visibility of ownership is not a privilege — it is how a support agent
knows who to ask.

**Q-3 — Opening does not claim.** `Open` and `Claim` are two separate controls. Legacy `inboxOpen()`
claims silently on open (`:19301`–`:19310`); the intent was sound and the mechanism was not, because
it leaves no way to *look* at a queue item. Reading a row, opening its detail, and expanding it all
leave ownership untouched.
**One exception, stated in full:** on Safety & Incidents the first claim on an incident **is** its
acknowledgement (§8.4). Opening still does not claim; claiming additionally acknowledges.

**Q-4 — What a second operator sees on a claimed item.** The row renders the owner's name and a
`Take over` control. Not a disabled row, not a hidden action, not a silent failure at commit. Taking
over opens a confirmation naming the current owner and stating that they lose the item without being
asked (`:18942`–`:18954`). On confirm, the take-over is appended to the claim's `takeovers` array and
written to the audit log with both names.

**Q-5 — Disposition without a claim.** An operator **may** dispose of an unclaimed item without
claiming it first. Requiring a claim before a decision adds a click to the common case (one operator,
one item, ten seconds) to solve a problem the claim already solves for the uncommon one.
**But:** disposing of an item claimed by *someone else* requires the same take-over confirmation as
claiming it, for the same reason — that is the moment a customer gets two answers.

**Q-6 — Release.** The owner may release at any time. The item returns to unclaimed. Release is
audited with `releaseReason: 'manual'`.

**Q-7 — Expiry.** A claim expires after **30 minutes** without interaction, measured from `touchedAt`,
not `claimedAt` (`DB.ownershipConfig.staleMin`, `:18853`). Three binding consequences:

- **The 30 minutes must be stated in the UI**, not left for the operator to discover by losing an
  item (`DESIGN.md` §8.4.1).
- **Expiry is evaluated on a timer, server-side. It is never a side effect of a render.** Legacy
  expires claims inside `whoHolds()` (`:18865`–`:18875`), so rendering the inbox mutates state and
  writes audit rows up to three times per item every 20 seconds — foundation finding **D-L12**.
- **Expiry notifies nobody.** A claim you abandoned for half an hour is not news. It writes one audit
  entry with `releaseReason: 'stale'` and the row reverts to unclaimed.

**Q-8 — What counts as interaction** (i.e. what refreshes `touchedAt`): opening the item's detail,
editing any field on it, completing a protocol step, or acting on it in any way that writes. Scrolling
past it in a list does not.

**Q-9 — Ownership survives the queue.** The same claim is visible on the domain queue, on My Work,
and on the item's detail route. One record, one owner, everywhere. The top bar's `N mine` chip
(§4.9) counts it.

### 4.3 The clock — per-queue SLA targets · **this closes Q8**

**Q8 stated the gap:** the pattern requires a clock, several of these queues have none, and the
fixtures use 48 h as a placeholder. `slaClock()` (`src/lib/sla.ts`) already models both shapes — a
`startedAt`, or the row's own `targetMinutes` — and correctly refuses to invent a denominator. What
was missing was the numbers. Here they are.

**Q-10 — Every target below is a product commitment with a stated source.** No number here is
"the same as the others" by default. Where two queues share a number, they share it because the same
policy produced it.

| Queue | Item type | `startedAt` | `dueAt` | Window | Warning band opens | Source of the number |
|---|---|---|---|---|---|---|
| **Requests** | Instant ride request | `requestedAt` | `+3 min` | 3 min | 90 s | Legacy breach threshold `secs >= 180` (`:12544`). The 50 % band reproduces the legacy 90 s warning (`:9925`) **by derivation**, so the second literal is deleted rather than ported. |
| **Requests** | Subscription request | `requestedAt` | `+90 min` | 90 min | 45 min | `SUBREQ_SEARCH_HOURS = 2 h` (`:9577`) **less the 30-minute intervention margin** (Q-12). The legacy 1-hour reminder (`SUBREQ_REMINDER_HOURS`, `:9578`, whose own comment calls it *"half the window"*) is **retired**: the warning band at 45 minutes is the same signal, derived, and one clock producing one visible change is better than a clock plus a toast. |
| **Trip Assurance** | Departing leg | `departure − 210 min` | `departure − 30 min` | 180 min | 90 min before departure | The readiness ladder's outermost watch band is 180 min (`:8702`–`:8709`); its innermost actionable band is 30 min. |
| **Trip Assurance** | Nightly confirmation | `17:00` the evening before the leg | `20:30` the same evening | 240 min | 19:00 | `commitPolicy.confirmDeadline = '21:00'` (`:16544`) less the 30-minute margin. |
| **Trip Assurance** | Backup offer awaiting reply | `offeredAt` | `+20 min` | 20 min | 10 min | `commitPolicy.offerWindowMin = 20` (`:18125`). **No margin** — see Q-12's exception. |
| **Trip Assurance** | Uncovered plan | `exposureDetectedAt` | `+48 h`, **or** the plan's next leg `departure − 30 min`, whichever is sooner | 2880 min or derived | half the resolved window | 48 h = `DB.slaPolicy` tier **T3** `resolveMin: 2880` (`:14654`). Registering a backup is a supply task, not a two-minute one; but an exposure that bites tomorrow morning is not a two-day problem, hence the tightening clause. |
| **Trip Assurance** | Departure risk | `scheduledPickup − 20 min` | `scheduledPickup` | 20 min | 10 min | `departureRisk().filter(r => r.minsToPickup <= 20)` (`:16926`). |
| **Trip Assurance** | Absence event, no claim filed | — | **none** | — | — | **`No clock`.** Nothing is owed until the captain appeals. §8.4's `No clock` is a value, and this is what it is for. |
| **Trip Assurance** | Emergency claim | `filedAt` | `+24 h` | 1440 min | 12 h | `commitPolicy.appealResponseHours = 24` (`:16553`). |
| **My Work** | *(all)* | inherited | inherited | inherited | inherited | **My Work sets no target of its own** (§7.2). |
| **Safety** | Unacknowledged, `critical` | `reportedAt` | `+5 min` | 5 min | 2 min 30 s | T1 `firstResponseMin: 0` (`:14652`). **Zero cannot be displayed or met**, so it is raised to the smallest window a human can act inside. Recorded as a change to the tier, not as a queue-local literal. |
| **Safety** | Unacknowledged, `high` | `reportedAt` | `+15 min` | 15 min | 7 min 30 s | T2 `firstResponseMin: 15` (`:14653`). |
| **Safety** | Unacknowledged, `standard` | `reportedAt` | `+60 min` | 60 min | 30 min | T3 `firstResponseMin: 60` (`:14654`). |
| **Safety** | Acknowledged, `critical` | `reportedAt` | `+4 h` | 240 min | 2 h | T1 `resolveMin: 240`. |
| **Safety** | Acknowledged, `high` | `reportedAt` | `+24 h` | 1440 min | 12 h | T2 `resolveMin: 1440`. |
| **Safety** | Acknowledged, `standard` | `reportedAt` | `+48 h` | 2880 min | 24 h | T3 `resolveMin: 2880`. |
| **Captain Fairness** | Any case | `openedAt` | `+ rcTargets(reasonCode).res` | **per row** | half | `DB.reasonCodes` (`:14705`–`:14711`) over `DB.slaPolicy.tiers`. This is the queue whose target genuinely lives on the row, which is why the data layer models `targetMinutes` per item. |
| **People › Applications** *(wave 1, Q8's stated blocker)* | Applicant | `appliedAt` | `+48 h` | 2880 min | 24 h | T3 `resolveMin: 2880` — the product's existing **Medium** tier. **The fixture's 48 h placeholder is hereby ratified as the product commitment.** No fixture changes; only its status changes, from guess to decision. |

**Q-11 — Two clocks are permitted on one item only where they measure two different promises, and
only one runs at a time.** Safety is the only queue with two (acknowledge, then resolve). The row
shows the running one; the **status badge**, not the countdown pill, says which promise it is
(§8.5). The countdown pill's format is fixed by §8.4.2 and gains no new variant.

**Q-12 — The intervention margin.** *Where the system takes an automatic action at a deadline, the
operator's SLA target is set **earlier** than that action by the queue's stated intervention margin.*
**The default margin is 30 minutes.** Reason: a deadline that fires at the same instant the item is
removed from the queue can never be worked, and its breach can never be seen. Under this rule the
legacy subscription request's 2-hour search window becomes a 90-minute operator target with a
30-minute window in which an operator can still find a driver, and the 21:00 auto-handoff becomes a
20:30 target with 30 minutes to chase a captain.

> **The one exception, stated in full: the backup offer.** Its deadline and its automatic action
> coincide, deliberately. When a backup does not reply inside 20 minutes the offer expires and
> escalates to the nearest-captain search — and that escalation *is* the remedy. No operator action
> is owed after it, so there is nothing for a margin to protect. The item leaves the queue at breach
> with the system disposition `Escalated`.

**Q-13 — Sub-minute windows.** Where a window is **under 10 minutes**, the countdown renders in
seconds — `45s left`, `overdue 20s` — because `2m left` … `1m left` … `0m left` is not a countdown a
person can act on. This affects the instant-request view (3 min) and the critical acknowledgement
clock (5 min) only. **This is a change request to `formatDuration` in `src/lib/format/duration.ts`,
owned by utilities-engineer.** It is a new tier below the existing `Nm` tier; the three existing tiers
and the `Nd Hh` / `Nh Mm` / `Nm` formats are unchanged.

**Q-14 — A target change never breaches an item retroactively.** An item in flight keeps the target
it was created with. A new target applies only to items created after the change. Editing a reason
code's `res` minutes in Admin › Operational Policy must not turn a hundred healthy rows red.

**Q-15 — The track's denominator is the item's own window, always.** The hardcoded `90` at `:11652`
must not ship, in any queue, for any reason. Where the window is genuinely unknown the countdown
renders in words and **no track renders at all** (`slaTrackPercent` returns `null`, which is not
zero).

**Q-16 — Three synthetic deadlines must not ship.** `dueMs = -1` at `:19154`, `:19168` and `:19191`
makes three item types permanently "overdue 0m", permanently inflating both the KPI and the sidebar
badge. Each is replaced by its real value from the table above, or by `No clock`.

### 4.4 Breached, late, and old — three different things

**Q-17 — `breached`** means: the item's own `dueAt` is in the past **and** the item is still awaiting
a decision. Only a breached row carries R5a's three parts.

**Q-18 — `late-decided`** means: the item was decided, but after its `dueAt`. The decision badge
records it. **No row marker** — the R5a leading edge is reserved for work still owed, and a decided
row is not owed. This is the distinction the wave-1 People build raised as **G9** (its `breached`
view counted approved and rejected applications); the answer is that a stopped clock is not a
backlog. **The banner counts only breached items; the `Show only breached` view may show the wider
audit set, and if it does, the view's own label must say so.**

**Q-19 — `old`** means: a long time since `startedAt`, but not past `dueAt` — or no clock at all.
**Never marked, ever.** Age is not breach. A queue that marks its oldest row teaches operators to
ignore the marker.

**Q-20 — An item with `No clock` can never be breached**, is never counted in the banner, never
carries the marker, and sorts last (`:19222`–`:19224`).

**Q-21 — R5a's three parts, all required, none substituting for another** (`DESIGN.md` §8.4.6):
(a) exactly one page-level critical banner stating the count, with one secondary control that filters
the list to the breached items; (b) a 3 px leading-edge marker on each breached row; (c) the
countdown pill reading `overdue 14m` **in words**. The queue rendered in greyscale must still
identify which rows are breached.

**Q-22 — The marker is reserved for breach and nothing else.** Four legacy row tints must not ship as
row-level critical signals: the `--red-lt` background on `no_drivers` instant requests (`:9962`), on
`critical` readiness rows (`:13034`), on uncovered plans (`:17532`), and on critical open incidents
(`:13431`). A `critical`-severity incident that is inside its acknowledgement window is **not**
breached and gets no marker; its severity is carried by its badge. Severity and lateness are two
facts and the row must not collapse them into one.

**Q-23 — At most one red carrier per row**, and a breached row must never pulse, blink or loop
(R18). `reqPulse` (`:145`) is not a critical signal.

### 4.5 Disposition, and the row after the decision

**Q-24 — Every queue declares a closed set of dispositions**, written into its section below.
Rendered as buttons in the row's action cell, each labelled with a verb, at most one filled as a
primary. A destructive disposition confirms (§5.3). Bulk disposition does not ship.

**Q-25 — Gate at render, not at commit.** A disposition the operator's role cannot use renders
disabled in place, with its reason available. The systemic legacy defect (`:10237`, `:11876`) is that
the operator clicks, waits, and is told no.

**Q-26 — The decided row converts in place.** It does not vanish. Its actions are replaced by a
decision badge naming **outcome, actor and reason**, with the timestamp beneath (`:10905`–`:10909`,
`:10925`). A row that disappears on click gives no confirmation and no route to undo.

**Q-27 — A decided row is not disabled.** `opacity: .7` (`:10929`) is §4.6's disabled treatment and
it promises the row will come back. A decided row drops to muted text and loses its interactive
affordances instead.

**Q-28 — A rejection is neutral, not red** (`b-red` at `:10907` must not ship). It is a terminal
factual outcome with no action left — §3.4's neutral-plus-solid-dot case, like `Refunded`.

**Q-29 — A background refresh must not remove a decided row.** It stays until the operator navigates
away or changes view.

**Q-30 — The nav count badge decrements immediately on decision, while the decided row is still on
screen.** The number and the row disagreeing for a moment is correct: the count describes work owed,
the row describes what just happened.

**Q-31 — Re-opening.** Where a queue permits re-opening a decided item, three rules bind:
(a) the **original** `startedAt` is preserved and displayed — `reopenSubReq()` rewriting
`requestedAt` to now (`:10305`) destroys the record of when the customer actually asked;
(b) the re-opened item gets a **new** clock with a new `startedAt`, and the row shows both instants;
(c) the re-open is a separate audited event, not an edit of the original decision.

### 4.6 Default view and default sort

**Q-32 — A work queue's default view is its open work, not `All`.** This is a deliberate departure
from foundation §7.1's rule that *"`All` is always first and always default"*, which is index-table
doctrine: an index describes a resource, so `All` is the honest default. A queue describes work owed,
and a default that includes decided rows buries it. Each queue's default is named in its section.
`All` remains available as a view and remains first in the tab row.

**Q-33 — Default sort, on every queue: breached first (most overdue first), then remaining time
ascending, then `No clock` last.** Already implemented by `compareBySla` (`src/lib/sla.ts`). This
replaces four incompatible legacy orders: urgency score with a 100 000 s offset (`:10057`–`:10064`),
`unshift` insertion order (`:15515`), `Object.keys` order (`:16576`), and open-before-closed with no
secondary key (`:13415`).

**Q-34 — The list must not re-sort or remove rows while the pointer is inside it or anything inside
it has focus** (§8.1's guard). The clock ticks; the order waits.

**Q-35 — Sort is user-changeable** through the standard sort popover (§3.2), and the queue order
above is the *default*, not a lock. A queue is not a ledger.

### 4.7 The three empties — and why a cleared queue is not a first-run

R8 gives two kinds of empty. **A work queue needs a third, and getting this wrong is a defect that
ships as a feature.**

| # | State | Trigger | What it means | Treatment |
|---|---|---|---|---|
| **E1** | **Queue clear** | The default view, no filters, no search, zero rows | *There is no work owed right now.* This is the best possible outcome and the most common empty state these five screens will ever show. | **One sentence naming the scope that is clear.** **Not** the R8 first-run illustration, and **not** an action. |
| **E2** | **Filtered to zero** | A filter, a search or a non-default view returns zero rows | *Work may exist; this question has no answer.* | The standard no-match sentence plus a clear-filters control (**AC-37**). |
| **E3** | **First run** | The resource has never had a record | *Nothing has ever arrived here.* | The R8 first-run treatment (**AC-38**). |

**Q-36 — E1 must never render the first-run illustration.** The first-run treatment implies *"create
the first one"*, and nobody creates a queue item. An operator who has just cleared the Requests queue
must not be shown an illustration telling them no requests exist.

**Q-37 — E3 is reachable on exactly one of these five queues: Safety & Incidents**, and only before
the first incident is ever reported. On the other four, work arrives from the system continuously, so
E3 is unreachable in production and must not be built as a distinct screen; those four collapse E3
into E1.

**F-3 — the current implementation cannot express E1.** The wave-1 build records that
*"the kind comes from `table.isFiltered` inside `DataTable`; no call site can choose it"*
(AC-37). A queue that is genuinely clear therefore renders **first-run** —
the exact wrong answer. **Request to the shell / `src/components/` owner:** `DataTable` must accept
an explicit empty *kind* from its call site, or grow a third `queue-clear` kind, so that
`isFiltered === false` on a `mode: 'queue'` table does not imply first-run. Not worked around here;
named.

**Q-38 — A fourth empty exists on My Work only: routed to zero** (§7.5). It is not E1 and not E2, and
it names the filter that caused it.

### 4.8 One item, one queue

**Q-39 — Every queue item belongs to exactly one domain queue.** A row appears in one queue's views
and nowhere else.

**Q-40 — My Work is the single exception, and it is a projection, not a queue.** It re-presents items
owned by other queues and must label each row with the queue it came from. An item is never "in" My
Work; it is *shown* there.

**Q-41 — Two signals about the same subject are two items, not one.** A subscription may
simultaneously have a leg departing in three hours (Trip Assurance › Departing next 24 h) and no
eligible backup captain (Trip Assurance › No backup captain). Those are two units of work with two
deadlines and two claims. Legacy already keys them separately — `leg:SUB-1041` and `coverage:SUB-1041`
are distinct ownership keys (`03b` §9) — and the mistake it makes is leaving them unlinked.

**Q-42 — Where two items share a subject, each row must carry a link to the other.** Legacy calls
this a *case* (`caseChip`, `:18997`–`:19005`; `newCase` / `linkToCase`, `:18965`, `:18972`) and
already builds it. The rule: an operator working one must be able to see the other without searching
for it, and closing a case marks every linked item done (`closeCase`, `:18984`).

### 4.9 Escalation, notification, and the counts

**Q-43 — A breach fires its escalation exactly once, at the crossing** — one audit entry, one
notification (`:12544`–`:12553`). Never again on subsequent ticks.

**Q-44 — Multiple crossings inside one tick batch into one notification carrying a count**
(`:9674`–`:9678`). N toasts must not ship.

**Q-45 — Escalation never reassigns, re-queues, or releases ownership automatically.** It tells
someone. It does not take the work away from the person holding it.

**Q-46 — Every queue owns a nav count** (`nav.subTabCount[subTabId]`, foundation §8.4). The count is
**work owed**: items not in a terminal state, in the queue's whole scope, regardless of the view or
filters on screen. It is never the filtered row count.

**Q-47 — Nav tone.** Per foundation Q12/V6 as closed by `design/02-visual-refinement.md`: tone lives
only on the sub-tab row, and only for a **breach**. A backlog is a quantity; a breach is a status.
A queue with 40 healthy rows is `neutral`.

**Q-48 — The count refreshes centrally, not as a side effect of the page's own render.** Five legacy
badges are stale until their page is first visited — `sbb-safety` (`:13406`), `sbb-coverage`
(`:13159`), `sbb-compliance`, `sbb-zones`, `sbb-predictive` — and on Safety that means an open SOS
reads `0` next to the word "Safety" until somebody happens to click it.

**Q-49 — The top bar's `N mine` chip counts the operator's live claims across every queue and
navigates to My Work.** It navigates to Support Center today (`:566`, foundation finding **D-L1**).

### 4.10 Data — the shared queue-item shape

Every queue's own record type is specified in its section. This is what all five have in common; it
is a **projection**, not a base class — a queue's client returns its own domain record and the queue
row derives these from it.

| Field | Type | Source | Derived | Notes |
|---|---|---|---|---|
| `id` | string | Domain record | — | The record's own id. The identity cell and its link target. |
| `queueId` | one of 5 sub-tab ids | Route table | ● | Rendered as a label on My Work only (Q-40). |
| `entityKey` | string | `` `${entityType}:${id}` `` | ● | The claim key (`:18858`). |
| `startedAt` | `IsoDateTime` \| null | Domain record | — | The clock's origin (§4.3). Never rewritten (Q-31a). |
| `dueAt` | `IsoDateTime` \| null | Domain record | — | `null` is **`No clock`**, a value. Never `—`, never synthetic. |
| `targetMinutes` | number \| null | Domain record or queue policy | — | Used only when `startedAt` is absent. Per-row on Fairness and Safety. |
| `slaClock` | `SlaClock` | `slaClock({startedAt, dueAt, targetMinutes}, now)` | ● | `src/lib/sla.ts`. The only source of band, label, track and sort key. |
| `isBreached` | boolean | `slaClock.kind === 'breached' && !isTerminal` | ● | Q-17. Drives R5a's three parts. |
| `isTerminal` | boolean | Per-queue disposition set | ● | A decided item. Q-18. |
| `claim` | `Claim` \| null | Ownership client | — | `src/data/types/common.ts:265`. |
| `claimAffordance` | `ClaimAffordance` | Ownership + session | ● | `{heldByMe, canClaim, canRelease, canTakeOver}`. Derived once, server-side; never re-derived in a component. |
| `disposition` | queue-specific enum \| null | Domain record | — | `null` while open. |
| `decidedAt` / `decidedBy` | `IsoDateTime` \| null · `{id, name}` \| null | Domain record | — | An id with no name beside it forces a client-side join — wave-1 finding **G11**; the shape here is the fix. |
| `decisionReason` | string \| null | Domain record | — | Rendered in the decision badge (Q-26). Required on some queues, named per queue. |
| `caseId` | string \| null | Case client | — | Q-42. |
| `severity` | queue-specific \| null | Domain record | — | Only Safety and My Work carry one. **Never conflated with SLA band** (Q-22). |

**Derived** = computed, never stored, never editable (foundation §8, `DESIGN.md` §8.2).

### 4.11 States

The four base states, at queue scope, plus the domain states every queue has. Per-queue domain states
are added in each section. Every one needs fixture data.

| State | Trigger | What the operator sees |
|---|---|---|
| **Content** | Rows returned | The queue. |
| **Empty** | Zero rows | **E1 / E2 / E3** per §4.7 — the kind is load-bearing. |
| **Loading** | First read in flight | A skeleton with the queue's own column structure (**AC-35**). Never a spinner. |
| **Error** | The read failed | Card-scoped error inside the card, **with the toolbar still rendered** so the operator can change the query that failed. |
| `row-action-failed` | One row's mutation failed | Row-scoped error. Every other row stays interactive. Not a page banner, not a toast alone (**AC-41**). |
| `claimed-by-me` | `claimAffordance.heldByMe` | Owner chip in its "yours" state, with elapsed hold time and a release control. |
| `claimed-by-other` | A live claim owned by someone else | The owner's name and a `Take over` control. Never a disabled row. |
| `claim-expiring` | Under 5 minutes of the 30 remain | The chip states the remaining hold time. No modal, no toast — this is information, not an event. |
| `claim-expired` | 30 minutes idle | The row is unclaimed again. One audit entry, no notification (Q-7). |
| `takeover-pending` | The confirmation is open | The dialog names the current owner. |
| `breached` | Q-17 | R5a's three parts (Q-21). |
| `late-decided` | Q-18 | The decision badge records it. **No marker.** |
| `no-clock` | `dueAt === null` | `No clock`, neutral, sorted last, **no track**. |
| `deciding` | A disposition is in flight | The action is not re-triggerable; the row is not removed and does not re-sort. |
| `decided` | Terminal | Converted in place (Q-26 – Q-28). |
| `permission-denied-in-place` | The role lacks the queue's work permission | The action renders disabled with its reason available. Never enabled-then-refused. |
| `stale-list` | The clock has ticked but the list is frozen by the pointer/focus guard | The list holds its order (Q-34). Nothing flashes. |

### 4.12 Acceptance criteria — the shared contract

Every criterion is checkable by an operator or a QA engineer against the running screen, without
reading source. **Each applies to all five sub-tabs** unless a per-queue section narrows it.

**Ownership**

- **AC-200** Opening a queue item — clicking its identity link, opening its detail route, or
  expanding its row — leaves the owner chip unchanged. After opening an unclaimed item and returning
  to the list, the item is still unclaimed.
- **AC-201** `Claim` and `Open` are two separate, separately labelled controls on every queue row.
- **AC-202** An item claimed by another operator shows that operator's name and offers `Take over`.
  It does not render disabled, hidden, or without an owner.
- **AC-203** `Take over` opens a confirmation naming the current owner by name and stating that they
  lose the item without being asked. Cancelling it leaves the claim with the original owner.
- **AC-204** A completed take-over is visible on the item afterwards: the item shows the new owner,
  and the item's history shows both names and the time.
- **AC-205** An operator holding only the queue's view permission sees who holds each item and cannot
  claim, release or take over. Those controls render disabled with their reason available, never
  hidden and never enabled-then-refused.
- **AC-206** Releasing an item returns it to unclaimed and it appears in the `Unassigned` scope
  immediately, without a reload.
- **AC-207** The 30-minute claim-expiry period is stated somewhere the operator can read it on the
  queue, without opening a settings page.
- **AC-208** An item whose claim was left untouched for 30 minutes is unclaimed. Re-rendering the
  list, switching views, or opening the queue does not by itself expire any claim: with the browser
  left on the queue for 60 seconds, no claim's state changes and no `claim_expired` entry is written
  more than once per claim.
- **AC-209** Disposing of an item claimed by another operator requires the same take-over
  confirmation as claiming it.
- **AC-210** An operator may dispose of an **unclaimed** item without claiming it first.

**The clock**

- **AC-211** Every queue row shows exactly one countdown. No row shows two clocks at once.
- **AC-212** A row with no deadline reads `No clock`, renders no progress track, and sorts below
  every row that has one.
- **AC-213** A row's progress track, where it renders, is full at that row's own `dueAt` and empty at
  its own `startedAt`. Two rows in the same queue with different windows show different fills at the
  same remaining time.
- **AC-214** With half or more of its window remaining a row's countdown is neutral; with less than
  half it is warning; past `dueAt` it reads `overdue <duration>`.
- **AC-215** A window shorter than 10 minutes counts down in seconds. A 3-minute instant request 45
  seconds from breach reads `45s left`, not `0m left`.
- **AC-216** Changing an SLA target in Admin › Operational Policy does not change the countdown on
  any item that already existed when the change was saved.
- **AC-217** The default order is: breached rows first, most overdue at the top; then rows by
  remaining time ascending; then `No clock` rows.
- **AC-218** With the pointer inside the list, or with focus inside any row, the list does not
  re-order and no row is added or removed, for at least 10 seconds of clock ticks.

**Breach**

- **AC-219** A queue containing one or more breached items shows **exactly one** page-level critical
  banner stating the count, with one control that filters the list to those items. Nine breached
  items produce one banner, not nine.
- **AC-220** Every breached row carries a leading-edge marker **and** the word `overdue` in its
  countdown. With colour removed from the screen, the breached rows are still identifiable.
- **AC-221** No queue row anywhere carries a red badge or a red row background. The only red on a row
  is the breach marker.
- **AC-222** An item decided after its deadline shows that it was late in its decision badge and does
  **not** carry the breach marker, and is not counted in the banner.
- **AC-223** An item that is the highest severity its queue offers but is inside its deadline carries
  no breach marker.
- **AC-224** No queue row pulses, blinks or animates on a loop for any reason.

**Disposition**

- **AC-225** Each queue offers only the dispositions listed in its section of this spec. No queue
  offers a free-text status.
- **AC-226** Selecting a disposition converts the row in place: the row stays visible, its action
  controls are replaced by a badge naming the outcome, who decided and when, and it does not
  disappear.
- **AC-227** A decided row is not dimmed with opacity and does not look like a disabled control.
- **AC-228** A rejection, dismissal or refusal renders in the neutral tone. No disposition renders in
  red.
- **AC-229** After a decision, the sub-tab's nav count decreases by one while the decided row is
  still on screen.
- **AC-230** A decided row is still on screen 30 seconds later, with the list left open and its data
  refreshing.
- **AC-231** No queue offers a way to apply a disposition to more than one row at once.
- **AC-232** A control the operator's role cannot use renders visibly disabled with its reason
  available before it is clicked. No queue action produces a permission refusal *after* being
  clicked.
- **AC-233** Re-opening a decided item, where the queue permits it, shows both the original request
  time and the re-open time, and starts a new countdown from the re-open.

**Empties, counts and notifications**

- **AC-234** A queue whose default view is genuinely clear — no filters, no search, no query — shows
  a sentence saying so, with no illustration and no create action.
- **AC-235** A filtered or searched view returning zero rows shows the no-match sentence and a
  control to clear the filters, and never the first-run treatment.
- **AC-236** The sub-tab's nav count equals the number of items in the queue awaiting a decision,
  regardless of which view or filter is on screen. Applying a filter that hides half the rows does
  not change it.
- **AC-237** The sub-tab's nav badge is toned for attention only when at least one item in the queue
  is breached. A queue with 40 healthy rows and no breach is neutral.
- **AC-238** The nav count is correct before the sub-tab has ever been opened in the session:
  loading the app and reading the rail shows the same number the queue shows when opened.
- **AC-239** Five items breaching within the same clock tick produce **one** notification stating the
  count, not five. A breached item that stays breached produces no further notification on later
  ticks.

### 4.13 Permissions

Cross-reference: `docs/01-modules/00c-identity-permissions-and-audit.md`, foundation §11.

**Q-50 — Every queue declares two permission levels: `view` and `work`.** `view` renders the queue
read-only, including ownership. `work` enables claim, release, take-over and disposition. Some queues
declare additional named actions above `work`; those are listed per queue.

**F-4 — three of the five wave-2 sub-tabs have no page-permission entry at all today**, and the
fourth declares one it never enforces:

| Sub-tab | Legacy page | `PAGE_PERMISSIONS` entry (`:10564`–`:10651`) |
|---|---|---|
| Requests | `requests` | Present: `view` · `assign` · `cancel`, legacy key `live_ops`. |
| Trip Assurance | `readiness` | Present: `view` · `resolve`, legacy key `manage_subscriptions`. |
| Trip Assurance | `coverage` | Present: `view` · `assign_backup` · `promote_backup`. |
| Trip Assurance | `commitment` | **Absent.** The absence ladder, forfeiture and plan termination are ungated at page level. |
| My Work | `inbox` | **Absent.** `requirePerm()` appears **zero times** in `:18828`–`:19321` — claim, release, take-over and case-close are entirely ungated. |
| Safety & Incidents | `safety` | Present: `view` · `update_steps` · `suspend` · `close` — but **`safety.view` is never enforced anywhere** (`10e` §16.13). |
| Captain Fairness | `fairness` | **Absent.** Only `decideFairness` is gated, on the broad `approve_drivers` key. Filing a case has no check at all. |

Per foundation §11.3 the **rule** is settled — all 34 sub-tabs get an entry — and the 34 **values**
are **Q4**, open, owned by the business owner. This spec therefore states each queue's *required
permission shape* and leaves the key names to Q4. Until Q4 resolves, these queues ship with
`permission: null` in the route table and every action visible to every role, which is a recorded gap
and is worse on these five than anywhere else in the product, because four of them can suspend a
captain, forfeit their earnings, or close a safety incident.

**Q-51 — Support cannot currently make a suspension decision.** Foundation §11.3 item 3 and
`PROPOSED-STRUCTURE.md` §13.1 R5: with three permissions, the Support role is not equipped for it, so
**Safety & Incidents write actions stay Ops-Manager-gated and Support sees them read-only** until
**Q3** decides whether `Trust & Safety` exists. This is a live constraint on §8, not a footnote.

### 4.14 Copy and Arabic

**Q-52 — Every operator-facing string in these five queues needs a key.** Today the five carry
**five** `data-i18n` attributes between them — one per sidebar label (`nav.requests` `:508`,
`nav.inbox` `:496`, `nav.safety` `:518`, `nav.fairness` `:514`, `nav.coverage` `:516`) — and nothing
else. Every status badge, every countdown, every disposition label, every empty state, every
confirmation and every toast is an English literal in markup or JS.

**Q-53 — No concatenation, no interpolated fragments.** Three legacy strings cannot be translated
cleanly and must become single keys with named placeholders:
`'🔒 ' + claimedBy` (`:9958`, `:10009`) · `'⚠ past ' + Math.round(tg.res/60) + 'h SLA'` (`:15654`) ·
`'Nothing open in the queues routed to ' + me.role` (`:19290`). The SLA one is the worst: it builds a
number, a unit and a noun in English word order.

**Q-54 — No emoji in operator-facing copy** (§5.7, defect D7). These five queues are the densest
emoji users in the product: `✋` on every owner chip (`:18930`–`:18940`), `🆘 CRITICAL` (`:13429`),
`⚠`, `⏳`, `📤`, `🔒`, `🔁`, `⚖️`, `🚨`, `↪`, `🔗`. All go. **AC-76** already binds this and the wave-1
build met it — three states, three words.

**Q-55 — Counts, durations, ids, times and money do not reorder in Arabic.** A countdown pill, a
`SUB-1052`, a `07:30` and a `48.50 SAR` need bidi isolation. The wave-1 build found this the hard way:
`4 / 5` rendered as `5 / 4` and `25 Jun` as `Jun 25` until the cells isolated.

**Q-56 — Two strings must be checked at their longest in Arabic before the design is signed off**,
because both sit in a fixed-width cell beside a control: the owner chip's "someone else" state
(a full Arabic name plus `Take over`), and the decision badge (outcome + actor + reason on one line).

---

## 5. Operations › Requests

**Route** `/operations/requests` · **Merge M3** — `requests` + `requests-sub-all` +
`requests-instant-all` · **Pattern** P8.

### 5.1 What differs

**Two item types on one queue, and they are not variants of each other.** An instant ride request is
matched automatically by the tick engine and ops intervenes only on breach; a subscription request is
matched manually by ops against a payment authorisation hold. They have different clocks (3 minutes
vs 90 minutes), different dispositions, different money consequences, and different definitions of
"resolved". The merge is right — the operator is answering one question, *who is waiting for
service* — but the row is not one row.

**This is the only queue where money moves on disposition.** Assigning a driver to a subscription
request captures the rider's authorisation hold and creates a real subscription (`:9605`–`:9619`,
`:9620`–`:9638`). Letting it expire releases the hold. That makes the disposition irreversible in a
way no other wave-2 queue's is.

**This is the only queue whose items can resolve themselves.** An instant request the tick engine
matches leaves without an operator touching it.

### 5.2 Scope

**In:** both request types as one queue with six views; manual assignment via the shared nearby-driver
picker; cancellation; re-opening an expired subscription request; the corporate approval hold; the
payment hold's three states.

**Out:** the tick engine's offer/accept simulation (it models the captain's own device, not an ops
decision — `:12556`–`:12559`); the JSON snapshot export (`:9766`–`:9776`: no permission gate, no
audit entry, no import counterpart, and it exports the full rider-linked corpus — it is a data-leak
surface, not a feature); manual ride creation (`:2449`–`:2495`, which belongs to Live Dispatch).

### 5.3 Views

`All` · **`Needs a decision` (default)** · `Instant` · `Subscription` · `Assigned` · `Expired`

**Change requested to the route table:** the declared views are
`all · instant · subscription · pending · assigned · expired`
(`src/data/fixtures/routeTable.ts:280`). Two changes: `pending` is renamed **`needs-decision`** and
becomes the default (Q-32) — "pending" is a status name, and the view is a scope; and `all` is
retained but is no longer the default. `Instant` and `Subscription` are **type** views, not status
views, and must not be confused with the four status views in the tab row's ordering.

**F-5 — a `declined` subscription request matches none of the status views today.** `reqStatusMatch`
(`:10047`–`:10055`) handles `pending|searching|offered`, `assigned` and `expired|no_drivers` only, so
a request declined by a corporate manager (`:9995`) is reachable only under `All`. The view
predicates below close it.

### 5.4 Data

**Instant ride request** — from `DB.rideRequests` (`:2786`).

| Field | Type | Source | Derived | Notes |
|---|---|---|---|---|
| `id` | string `REQ-nnn` | Record | — | |
| `riderId` | string | Record | — | Identity cell resolves the name; the rating badge and the `Existing subscriber` tag come from the rider record (`:9904`–`:9919`). |
| `pickup` / `destination` | string | Record | — | |
| `vehicleClass` | `Economy` \| `Comfort` | Record | — | |
| `isVip` | boolean | Record | — | Skips the queue: offers at 1 s instead of 6 s and searches at maximum radius immediately (`:12535`, `:12503`). |
| `requestedAt` | `IsoDateTime` | Record | — | **`startedAt`.** Legacy stores `'25 Jun 08:36'`, a display string parsed by regex with the year hardcoded to 2026 (`:9562`). |
| `dueAt` | `IsoDateTime` | `requestedAt + 3 min` | ● | §4.3. |
| `status` | `searching` \| `offered` \| `no-drivers` \| `assigned` \| `cancelled` \| `expired` | Record | — | |
| `offeredToDriverId` | string \| null | Record | — | Non-actionable: the offer is with the captain's device. |
| `offerSecondsLeft` | number \| null | Record | ● | 12-second window (`:11988`). |
| `waitingSeconds` | number | `now − requestedAt` | ● | Legacy stores it as a `'m:ss'` string and increments it per tick (`:12528`). It is a derived value and must not be stored. |
| `claim` | `Claim` \| null | Ownership client | — | Replaces `_locking` / `claimedBy` / `claimedAt` (`:11876`). |

**Subscription request** — from `DB.subscriptionRequests` (`:2794`).

| Field | Type | Source | Derived | Notes |
|---|---|---|---|---|
| `id` | string `SREQ-nnn` | Record | — | |
| `riderId` | string | Record | — | |
| `plan` | `weekly` \| `biweekly` \| `monthly` | Record | — | |
| `vehicleClass` | `Economy` \| `Comfort` | Record | — | |
| `pickup` / `destination` | string | Record | — | |
| `preferredTime` | time string | Record | — | The timezone goes in the column header, not beside the value (§4.5). |
| `riderNote` | string \| null | Record | — | **Legacy stores this and renders it nowhere** (`:2795`–`:2799`; `07c` §17.1). The seeds include *"wants female driver if available"* and *"wants the same driver daily if possible"* — the rider's stated preference is invisible to the operator choosing their captain. **In scope: it renders.** |
| `requestedAt` | `IsoDateTime` | Record | — | **`startedAt`.** |
| `originallyRequestedAt` | `IsoDateTime` | Record | — | Set on re-open; equals `requestedAt` otherwise (Q-31a). |
| `dueAt` | `IsoDateTime` | `requestedAt + 90 min` | ● | §4.3. |
| `searchWindowEndsAt` | `IsoDateTime` | `requestedAt + 120 min` | ● | The system's auto-expiry. 30 minutes after `dueAt` (Q-12). |
| `status` | `pending` \| `awaiting-corporate-approval` \| `assigned` \| `expired` \| `declined` | Record | — | |
| `estimatedValue` | money | `PLANS[plan][vehicleClass]` | ● | Also the hold amount (`:9595`). A **derived value**, not an editable field (§8.2). |
| `hold` | `{ amount, status: 'held'\|'captured'\|'released', authRef, heldAt, capturedAt, releasedAt }` | Record | — | `:9593`–`:9619`. |
| `corporateApproval` | `{ corpId, driverId, amount, approverEmail } \| null` | Record | — | Set when the package value exceeds the corporate policy threshold (`:10272`). |
| `assignedSubscriptionId` | string \| null | Record | — | **F-6:** two seeded rows point at `SUB-1052b`, which does not exist (`:2796`, `:2799`), so `View sub` opens a broken profile. |
| `claim` | `Claim` \| null | Ownership client | — | |

### 5.5 Dispositions

| Item type | Disposition | Effect | Confirm | Terminal |
|---|---|---|---|---|
| Instant | **Assign captain** | Opens the nearby-driver picker; on commit the request becomes a live trip. | No | Yes |
| Instant | **Cancel request** | The rider is told no captain is coming; cancellation policy decides whether anything is charged (`GATE_SWEEP.cancelRequest`, `:20871`). | **Yes**, destructive | Yes |
| Instant | *(system)* **Matched** | The tick engine matched it. No operator acted. | — | Yes |
| Subscription | **Assign captain** | Captures the hold, creates the subscription, generates its upcoming legs. | **Yes** — money moves | Yes |
| Subscription | **Approve** / **Decline** *(corporate hold only)* | Records the manager's decision; approval proceeds to assignment, decline cancels with nothing charged. | Decline: **yes** | Decline: yes |
| Subscription | **Cancel request** | Releases the hold, nothing charged. | **Yes** | Yes |
| Subscription | *(system)* **Expired — no captain found** | At `searchWindowEndsAt`. Releases the hold. | — | Yes, re-openable |
| Subscription | **Re-open** *(from expired only)* | New hold, new clock, original request time preserved (`GATE_SWEEP.reopenSubReq`, `:20873`). | **Yes** | No |

**Q-57 — A system disposition is still a disposition.** `Matched` and `Expired` convert the row in
place and name the system as the actor. Legacy **splices the record out of the array** on both paths
(`:11895`, `:12482`), which is why the `Assigned` chip only ever matches fabricated seed rows
(`07c` §17.10) — the state exists in the UI and is unreachable in the data.

### 5.6 Domain states

Beyond §4.11: `offer-outstanding` (the offer is with the captain's device; the assign cell is
informational and not actionable — `:9954`) · `hold-held` / `hold-captured` / `hold-released`, the
three states of the rider's authorisation, each of which must be legible on the row without opening
anything · `awaiting-corporate-approval` (assignment is blocked on a manager outside this console;
the row shows who was emailed and when) · `vip` · `existing-subscriber` (a "new" request from an
existing subscriber is a renewal conversation — `:9755`–`:9761`) · `commit-in-flight` (the assign is
submitted and unresolved; the control is not re-triggerable) · `commit-failed` (the row unlocks, the
error is scoped to the row, and the retry is one click — legacy simulates an 8 % failure rate
deliberately to prove this, `:10260`–`:10264`).

### 5.7 Acceptance criteria

- **AC-240** The queue shows instant and subscription requests in one list, with each row's type
  legible without opening it.
- **AC-241** An instant request 100 seconds old shows a warning-tone countdown; the same request at
  190 seconds shows `overdue` and carries the breach marker.
- **AC-242** A subscription request breaches at 90 minutes and is still visible, still claimable and
  still assignable for the following 30 minutes.
- **AC-243** A subscription request reaching 120 minutes without an assignment converts in place to
  `Expired — no captain found`, its hold reads `Released`, and it stays on screen.
- **AC-244** Re-opening an expired subscription request shows the original request time and the
  re-open time as two separate values, and the countdown restarts from the re-open.
- **AC-245** A subscription request whose rider left a note shows that note on the row or in the row's
  detail, before the operator chooses a captain.
- **AC-246** A request in the `offered` state offers no assign action and states that the offer is
  with the captain, not with ops.
- **AC-247** Assigning a captain to a subscription request confirms first, naming the amount that will
  be captured from the rider.
- **AC-248** A request whose value exceeds its corporate account's approval threshold is not assigned;
  the row states that approval is pending and names who was asked.
- **AC-249** A subscription request declined by a corporate approver is visible in the `Subscription`
  view and in the `All` view, and its status is legible.
- **AC-250** Cancelling a request asks for confirmation once — not twice — and the confirmation states
  what the rider is told.
- **AC-251** An assignment that fails leaves the row in the list, un-claims nothing the operator
  claimed, shows the failure on that row only, and offers a retry. Every other row stays interactive.
- **AC-252** The `All` view's row count and the queue's nav count agree with the number of rows the
  operator can see; no count on the screen reports the unfiltered corpus while a filter is applied.
- **AC-253** The queue's nav count counts instant requests awaiting a decision and subscription
  requests awaiting a decision, on the same definition. An expired instant request and an expired
  subscription request either both count or both do not.

### 5.8 Carried defects this spec resolves

`:2796`/`:2799` dangling `SUB-1052b` (**F-6**) · `:11895` splice-on-assign so `Assigned` is
unreachable (Q-57) · `:10047` `declined` matches no view (**F-5**) · `:10305` re-open destroys the
original request time (Q-31a) · `:10081` the `All` chip always shows the unfiltered total
(**AC-252**) · `:10143`/`:10190` the status filter does not apply to the overflow pages — which the
merge deletes outright · `:9886` a single shared page-size variable across two pagers ·
`:10154`/`:10200` the pager vanishes on an empty result · `:12544`/`:9925` SLA thresholds as inline
literals · `:9766` an ungated, unaudited export of the full rider-linked corpus.

---

## 6. Operations › Trip Assurance

**Route** `/operations/assurance` · **Merge M6** — `readiness` + `coverage` + `commitment` ·
**Pattern** P8 (+ P5, pending **F-1**).

### 6.1 What differs

**One question at three horizons: *will tomorrow's subscription trip actually happen?*** Readiness
watches the next hours, Coverage watches structural exposure, Commitment watches the captain's
nightly confirmation and the rolling absence counter. That is the merge, and `PROPOSED-STRUCTURE.md`
§13.1 R4 names its risk — three pages into one screen is dense — with a mitigation that **binds:
views, not stacked cards**.

**This is the widest queue in the product: seven item types.** No other wave-2 queue has more than
two. Each has its own clock (§4.3) and its own dispositions, and the view a row appears in is
determined by its type, not by its status.

**It is the only queue where the deadline is somebody else's event.** A departing leg's clock is
anchored to a departure time the console does not control. Nothing here is "we have N hours to
respond"; it is "this trip leaves at 07:30 and it is 06:55".

**And it is the only queue where a breach cannot be undone.** A support ticket answered late is
answered. A subscription leg that departed without a captain did not depart.

### 6.2 Scope

**In:** the seven item types below; per-row remediation (call rider, call/nudge captain, find a
replacement, notify the rider of a change, postpone, raise a ticket, register/replace a backup,
promote a backup, hand a leg to backup, record an absence, decide an emergency claim); the rolling
absence counter as a **read-only column**, not a queue.

**Out:** the capacity grid (§2.2); the emergency-dispatch money settlement (§2.2); the rehabilitation
list (`rehabCandidates()`, `:19465`) — a captain 90 clean days from reinstatement is not a unit of
work with a deadline and fails the §4.1 admission test; it belongs on the captain's record;
`sameCaptainStats()` and `onTimeStats()` (`:15697`, `:15703`), which are defined next to Fairness and
called by nothing.

### 6.3 Views

**`Departing next 24 h` (default)** · `No backup captain` · `Awaiting confirmation` · `Absences` ·
`All`

Matching the route table (`routeTable.ts:365`) with `All` added. The default is the ops manager's
opening question (foundation §3.6 M6).

**F-7 — the 24-hour view must actually filter.** Legacy's page copy promises "next 24 hours" and no
time filter is ever applied (`:13008` sorts and never filters; `07b` §7). Two seeded legs at 1290 and
1340 minutes out are in the list, and a leg 40 hours out would be too.

**F-8 — trips never leave the board on departure** (`07b` §16.9). A leg whose departure time has
passed stays in the list forever. Rule: at departure, a leg converts in place to `Departed` (a system
disposition) and leaves the default view; it remains in `All` for the rest of the day.

### 6.4 The seven item types

| # | Item | View | Clock (§4.3) | Dispositions | Notes |
|---:|---|---|---|---|---|
| 1 | **Departing leg** | Departing next 24 h | departure − 30 min, 180 min window | `Confirm rider` · `Reassign captain` · `Postpone` · `Raise ticket` · *(system)* `Departed` | The readiness ladder (`:8702`–`:8709`) becomes a **reason column**, not a severity. `Driver unavailable`, `Driver not moving`, `Rider not confirmed`, `Driver not en route yet`, `Awaiting confirmation`, `On track` are six *reasons*; the clock is the urgency. |
| 2 | **Uncovered plan** | No backup captain | 48 h from detection, or next leg − 30 min | `Register backup` · `Promote backup to primary` · `Accept exposure` (with a reason) | `Accept exposure` is new and is the missing disposition: today an uncovered plan can only be fixed, never dispositioned, so the queue can never be cleared. |
| 3 | **Nightly confirmation** | Awaiting confirmation | 20:30 the evening before, 240 min window | `Record confirmation` · `Hand to backup` · *(system)* `Auto-handed to backup` at 21:00 | The confirmation source is load-bearing and must be recorded: `app` (the captain confirmed), `phone`/`whatsapp` (an operator attested), `assumed` (**not a confirmation** — risk accepted by ops). Legacy already models this as ack *weight* (`:18147`); it must survive. |
| 4 | **Backup offer** | Awaiting confirmation | `offeredAt + 20 min`, no margin | `Record acceptance` · `Record decline` · *(system)* `Escalated` at expiry | The only queue item whose deadline and system action coincide, by design (Q-12's exception). |
| 5 | **Departure risk** | Departing next 24 h | pickup, 20 min window | `Call captain` · `Record absence` · `Stand down` | `Record absence` is the most consequential action in the workspace: it forfeits the captain's remaining plan earnings, freezes or terminates their plan access, and opens an emergency dispatch. It is destructive and irreversible and confirms as one (`:17911`–`:17930`). |
| 6 | **Absence event** | Absences | **`No clock`** until a claim is filed | `Waive` · `Uphold` · `Await appeal` | Nothing is owed until the captain appeals — §4.3, and the honest use of `No clock`. |
| 7 | **Emergency claim** | Absences | `filedAt + 24 h` | `Uphold — waive the strike` · `Reject — the penalty stands` | Upholding restores the forfeiture, lifts the freeze or termination and clears the strike (`:16808`–`:16821`). Both are irreversible and confirm. |

**Q-58 — The readiness ladder is a reason, not a severity, and it is not the clock.** Legacy renders
a `critical` leg with a red row background regardless of how far away departure is (`:8703` has **no
time condition**). Under Q-22 that background does not ship: a leg whose captain is unavailable but
which departs in nine hours is a serious reason and is not late. The reason goes in a column; the
lateness goes in the countdown.

**Q-59 — A leg outside its clock window reads `No clock` and sorts last.** A leg departing at 07:00
tomorrow has no clock at 19:00 tonight, and that is correct: it is not urgent yet. This is what makes
the `Departing next 24 h` view honest at 40 rows.

**Q-60 — The absence counter is a column, not a queue.** `Strikes` · `Next tier` · `Exposure now` ·
`Regulator count` render on the captain's rows and on their record. They are derived values (§8.2)
and no operator disposes of them.

### 6.5 Data

The shared shape (§4.10) plus, per item type: `subscriptionId`, `riderId`, `captainId`,
`scheduledDeparture` (`IsoDateTime`), `route`, `readinessReason` (the six-value enum),
`riderConfirmedAt` (`IsoDateTime` \| null), `captainMovement` (`moving` \| `not-started` \|
`unavailable`), `unavailableReason` (string \| null), `registeredBackupCaptainId` (string \| null),
`backupEligibility` (`{ ok: boolean, why: string }` — derived, and the load-bearing one: a registered
backup who fails eligibility at the moment of need is **not** coverage, `:17472`–`:17479`),
`nearbyEligibleCount` (number, derived), `confirmationSource` (`app` \| `phone` \| `whatsapp` \|
`assumed` \| null), `offerState` (`offered` \| `accepted` \| `declined` \| `expired` \| null),
`absenceTier` (1 \| 2 \| 3, derived from the 30-day rolling counter), `forfeitedAmount` (money),
`freezeUntil` (`IsoDateTime` \| null), `planAccess` (`eligible` \| `frozen` \| `terminated`),
`claimEvidenceUrl` (string \| null).

**F-9 — `minsToPickup` is fabricated.** `departureRisk()` computes it as
`20 − (digits of tripId % 18)` (`:16612`) — a deterministic pseudo-value dressed as an ETA, driving
a `critical` severity and a `-1` due sentinel. It must be the trip's real pickup time or the item does
not exist.

**F-10 — forfeiture is logged and never posted.** `recordAbsence()` forfeits the captain's remaining
plan earnings and writes no wallet, escrow or payout record (`10b` §17.7). The queue must not present
a completed money action that did not happen; until Financials (wave 3) provides the posting, the
disposition's confirmation must state that the forfeiture is recorded and not yet settled.

**F-11 — the 21:00 deadline exists only in display strings** (`10b` §17.1). Nothing enforces it. Item
type 3's system disposition is what enforces it.

### 6.6 Domain states

Beyond §4.11: `rider-unconfirmed` · `captain-unavailable` · `captain-not-moving` ·
`registered-but-ineligible` (the state the whole Coverage view exists to expose — a plan that reads
as covered and is not) · `no-eligible-backup-and-nobody-nearby` (the only genuinely uncovered case) ·
`confirmed-as-assumed` (recorded, explicitly not a confirmation, and it must never render the same as
`confirmed-in-app`) · `offer-outstanding` · `offer-expired` · `handed-to-backup` ·
`captain-frozen` / `captain-terminated` · `strike-waived` / `strike-decayed` ·
`regulator-near-limit` (4 of 5 post-acceptance cancels in 30 days; the fifth triggers a statutory
30-day suspension) · `departed` (system-dispositioned, F-8).

### 6.7 Acceptance criteria

- **AC-260** The `Departing next 24 h` view contains only legs departing within 24 hours. A leg
  departing in 30 hours is absent from it and present in `All`.
- **AC-261** A leg whose departure time has passed is no longer in the `Departing next 24 h` view and
  shows a `Departed` outcome in `All`.
- **AC-262** A leg departing in more than 3.5 hours reads `No clock` and sorts below every leg that
  has one.
- **AC-263** A leg whose captain is unavailable but which departs in nine hours carries no breach
  marker; its reason is stated in a column.
- **AC-264** A leg 20 minutes from departure shows `overdue` and carries the breach marker, because
  its deadline was 30 minutes before departure.
- **AC-265** A plan whose registered backup captain fails eligibility appears in `No backup captain`
  and states the reason the backup would be skipped, by name.
- **AC-266** An uncovered plan can be dispositioned without registering a backup, by accepting the
  exposure with a reason, and the row then converts in place.
- **AC-267** A leg unconfirmed at 20:30 is breached; at 21:00 it converts in place to
  `Auto-handed to backup` and stays visible.
- **AC-268** A leg recorded as confirmed by an operator "assumed" is visually and textually distinct
  from a leg the captain confirmed in the app, in the list and in the record.
- **AC-269** A backup offer unanswered for 20 minutes converts in place to `Escalated` and states
  that the nearest-captain search has opened.
- **AC-270** `Record absence` confirms before acting, and the confirmation states, in order: the
  amount forfeited, the freeze or termination that follows, and which strike this is out of three.
- **AC-271** Upholding an emergency claim removes the strike from the captain's 30-day counter, and
  the counter on that captain's row decreases immediately.
- **AC-272** An absence event with no emergency claim filed reads `No clock` and sorts last. Filing a
  claim gives it a 24-hour countdown.
- **AC-273** No departure-risk row shows a minutes-to-pickup value that is not derived from the trip's
  scheduled pickup time.
- **AC-274** Each of the four views can be reached, dispositioned to zero, and shows the
  cleared-queue sentence naming that view's scope — not a first-run illustration.
- **AC-275** No row in this queue carries a red background. The only red on a row is the breach
  marker.

---

## 7. Operations › My Work

**Route** `/operations/my-work` · `inbox` · **Pattern** P10 + P8.

### 7.1 What differs

**It is not a queue. It is a projection over every queue in the product.** The legacy design contract
says so in three sentences (`:19061`–`:19083`) and they still bind:
*"The queues stay"* — it routes an operator into the domain page and never duplicates the domain
actions. *"Sort by DEADLINE, not by age or severity label."* *"Route by role, but never hide"* — role
routing is a checkbox the operator can switch off, not an access control.

**Everything that makes a queue a queue is inherited here, and nothing is defined here.** No clock of
its own (§4.3), no dispositions of its own, no counts of its own. What it adds is one thing the domain
queues cannot give: *what is owed by me, right now, across twelve queues*.

**It is the only surface that may show an item owned by another queue** (Q-40), and therefore the only
one that must label each row with its queue.

### 7.2 Scope

**In:** the projection over every queue that declares itself projectable; the three scopes; role
routing as an operator-controlled filter; the case chip linking sibling items (Q-42); the owner chip;
the inherited countdown; navigation into the owning queue.

**Out:** **any disposition.** My Work never decides anything — it claims, releases, and routes.
`Decide`, `Approve`, `Advance` and `Cover it` as *actions* (`:19138`–`:19211`) become `Open`, and the
decision happens where the context is. This is the contract's first rule and it is the reason the
screen is safe to build over twelve domains at once. Also out: the four KPI tiles (`:19254`–`:19259`),
which describe the whole system while the list describes a filtered subset — three of the four contradict
what is on screen the moment any filter is applied.

### 7.3 Views

**`Mine`** · **`Unassigned`** · `Everything`

**Q-61 — The default view depends on the operator's live claims.** Opening `/operations/my-work`
with no `?view=` resolves to **`Mine`** when the operator holds at least one live claim, and to
**`Unassigned`** otherwise. Legacy defaults to `Mine` unconditionally (`:19085`) while seeding
`DB.ownership` empty (`:18851`), so a fresh session opens on an empty page — the screen's first
impression is that there is no work. Once the operator picks a view the URL carries it and the
default does not apply again.

### 7.4 Role routing — the corrected table

**F-12 — `'Operations'` is not a role, and this is the most consequential defect in the module.**
`WORK_ROUTING` (`:19091`–`:19102`) routes eleven of twelve queues to it; `TEAM_ROLES` is
`['Owner','Ops Manager','Finance','Support']` (`:10501`). **An Ops Manager sees an empty inbox** with
the message *"Nothing open in the queues routed to Ops Manager."* Corrected:

| Source queue | Roles accountable |
|---|---|
| Requests | Ops Manager · Owner |
| Trip Assurance — legs, coverage, confirmations, offers, departure risk | Ops Manager · Owner |
| Trip Assurance — absences, emergency claims | Ops Manager · Owner |
| Safety & Incidents | Ops Manager · Owner · Support *(read-only until **Q3**, Q-51)* |
| Captain Fairness | Ops Manager · Owner |
| Tickets *(wave 5)* | Support · Ops Manager · Owner |
| Disputes *(wave 5)* | Support · Finance · Owner |
| Lost & found *(wave 5)* | Support · Ops Manager · Owner |
| People › Applications *(wave 1)* | Ops Manager · Owner |
| PDPL erasure *(wave 7)* | Owner · Ops Manager |
| Cash escalations *(wave 3)* | Finance · Owner |

If **Q3** adopts `Trust & Safety` and `Dispatcher`, three rows change: Safety moves to
`Trust & Safety · Owner`, Fairness gains `Trust & Safety`, and the Requests / departure-risk rows
gain `Dispatcher`. **Nothing else in this spec depends on Q3.**

**Q-62 — Role routing is a filter, never an access control.** It reduces what is shown; it never
hides work the operator has permission to see. Switching it off is one control, always available, and
its state is visible without opening a menu.

**Q-63 — Every count on this screen respects every active filter.** Legacy computes tab counts and
KPI tiles from the unfiltered set (`:19242`–`:19245`) while rendering rows from the filtered one, so a
tab can read `Everything · 9` above zero rows.

### 7.5 States

Beyond §4.11: `routed-to-zero` — the role filter has removed every row. **This is not E1 and not E2.**
It names the filter, names the role, and offers to switch routing off in place. Legacy shows this
message even when routing is off, where it is simply false (`:19290`). Also: `mine-empty` (holding
nothing — the message should point at `Unassigned`, which is where work is picked up, and legacy's
does) · `case-linked` (this item is one of N records from one event) · `source-queue-unavailable`
(a projected queue's read failed; **the row is shown with its data and its action disabled**, naming
which queue is unreachable, rather than the whole projection failing).

### 7.6 Acceptance criteria

- **AC-280** Every row states which queue it came from, in words.
- **AC-281** No row on this screen offers a decision. Every row's primary action opens the item in its
  owning queue or its detail route.
- **AC-282** An operator with no live claims opening `/operations/my-work` with no view in the URL
  lands on `Unassigned`, and sees rows.
- **AC-283** An operator holding at least one claim opening the same URL lands on `Mine`, and every
  row shown is held by them.
- **AC-284** With role routing on, an **Ops Manager** sees rows. The empty state is not reachable by
  role alone.
- **AC-285** The count on each view tab equals the number of rows that view renders with the current
  filters applied. A tab never reads a number larger than the rows beneath it.
- **AC-286** Switching role routing off increases or maintains the row count and is a single control
  the operator can find without opening a menu.
- **AC-287** With role routing on and zero rows, the empty state names the role that is filtering and
  offers to switch routing off; it does not show the first-run treatment.
- **AC-288** Claiming an item here and opening the owning queue shows the same claim, held by the same
  operator.
- **AC-289** Rows are ordered breached first, then by remaining time, then `No clock` last, across all
  source queues — a breached ticket sorts above a healthy safety incident.
- **AC-290** No row shows `overdue 0m` at rest. Every overdue value corresponds to a real elapsed
  duration past a real deadline.
- **AC-291** Two items about the same subscription — an uncovered plan and an unconfirmed leg — each
  show a link to the other.
- **AC-292** If one source queue's data cannot be read, the rest of the list renders; the affected
  rows state which queue is unreachable and their actions are disabled.
- **AC-293** The top bar's `N mine` chip matches the row count of the `Mine` view, and clicking it
  opens this sub-tab.

---

## 8. Support › Safety & Incidents

**Route** `/support/safety` · `safety` · **Pattern** P8 + P9 (**F-2**).

> **This section specifies a domain that does not exist in the codebase.** There is no
> `SafetyIncident` type, which is why `src/data/fixtures/navCounts.ts:139` carries
> `support-safety` at `count: 0` while notification **N7** is an unacknowledged critical SOS on
> `TRP-7742`, six minutes old, unread. The fixture's own comment flags the inconsistency and defers
> it to this spec. It is resolved below.

### 8.1 What differs

**It is the only queue where the cost of being late is not money.** Every other deadline here protects
revenue or a promise. This one protects a person who pressed a button in a moving car.

**It is the only queue with two clocks** (Q-11): acknowledge, then resolve. A four-hour resolution
target is meaningless if nobody looked at it for three of them, and an acknowledgement target alone
lets an incident sit open for a week once someone has claimed it.

**It is the only queue where claiming *is* acknowledging** (Q-3's single exception, §8.4).

**It is the only queue that cannot be built from the legacy app**, because the legacy app has no way
to create an incident, no way to reopen one, no way to reverse the one irreversible thing it does,
and no SLA of any kind (`10e` §4.5, §4.6, §16.2, §16.3, §16.4).

**It is the only queue whose empty state E3 is genuinely reachable** (Q-37).

### 8.2 Scope

**In:** the `SafetyIncident` domain model; the four-step protocol, retained and now partially ordered;
the incident queue with its four views; the level-3 incident record with a timeline (P9); manual
incident logging; precautionary suspension **and its lifting**; reopening a closed incident;
severity change with a reason; the two clocks and their notifications.

**Out:** SOS ingestion from the rider/captain apps (the console consumes the event; the device
raises it — but the `source` field and the state machine are built to receive it) ·
ticket→incident escalation (wave 5) · the appeal route for a precautionary suspension (that is
Captain Fairness, §9, and the two must link — Q-42) · any automated severity derivation from type
(**F-13**).

### 8.3 The `SafetyIncident` model

| Field | Type | Source | Derived | Notes |
|---|---|---|---|---|
| `id` | string `INC-nnn` | System | — | |
| `type` | `sos` \| `accident` \| `harassment` \| `assault` \| `unsafe-driving` \| `vehicle-condition` \| `medical` \| `other` | Intake | — | **A closed set.** Legacy `inc.type` is free text rendered verbatim (`:13432`), which cannot be filtered, counted or translated. `other` requires `typeLabel`. |
| `typeLabel` | string \| null | Intake | — | Required when `type === 'other'`. |
| `severity` | `critical` \| `high` \| `standard` | Intake, operator-changeable | — | Three levels. Legacy's third is a fall-through with no producer (`:13429`, `10e` §16.16). |
| `severityChangedBy` / `severityChangeReason` | `{id,name}` \| null · string \| null | Operator | — | A severity change is audited and requires a reason. |
| `status` | `unacknowledged` \| `acknowledged` \| `closed` \| `reopened` | System + operator | — | §8.4. |
| `source` | `sos-device` \| `operator-logged` \| `escalated-ticket` | Intake | — | `escalated-ticket` is in the enum and unreachable in wave 2 (§2.2). |
| `reportedAt` | `IsoDateTime` | Intake | — | **`startedAt` for both clocks.** Legacy stores free text — `'09:02'`, `'Yesterday 18:40'`, `'22 Jun'` — never parsed, so nothing can age (`:13390`–`:13392`). |
| `acknowledgeDueAt` | `IsoDateTime` | `reportedAt + f(severity)` | ● | 5 / 15 / 60 min (§4.3). |
| `acknowledgedAt` | `IsoDateTime` \| null | First claim | ● | Stops clock one. |
| `resolveDueAt` | `IsoDateTime` | `reportedAt + f(severity)` | ● | 240 / 1440 / 2880 min (§4.3). |
| `activeClock` | `acknowledge` \| `resolve` \| `none` | `status` | ● | Q-11. Feeds `dueAt` on the shared shape. |
| `tripId` | string \| null | Intake | — | **F-14:** two of three seeded ids are not in `DB.trips` (`10e` §16.15), so one of the two reachable `Open trip` buttons is broken. |
| `reporterId` | string | Intake | — | A rider id or a captain id. |
| `againstId` | string \| null | Intake | — | The accused party. `null` for a self-reported accident. |
| `summary` | string | Intake | — | |
| `steps` | `IncidentStep[]` | Protocol | — | Four, keyed `contact` · `verify` · `act` · `document`. |
| `stepHistory` | `IncidentStepEvent[]` | Append-only | — | **Every** completion and un-completion, with actor, timestamp and reason. §8.6. |
| `precautionarySuspension` | `{ captainId, reason, appliedBy, appliedAt, liftedBy, liftedAt } \| null` | Operator | — | §8.7. |
| `disposition` | see §8.8 | Operator | — | `null` until closed. |
| `closedAt` / `closedBy` / `closureNote` | `IsoDateTime` \| null · `{id,name}` \| null · string | Operator | — | The note is required. |
| `reopenedAt` / `reopenedBy` / `reopenReason` | `IsoDateTime` \| null · `{id,name}` \| null · string \| null | Operator | — | §8.5. |
| `linkedIncidentId` | string \| null | Operator | — | Set by the `Duplicate` disposition. |
| `claim` | `Claim` \| null | Ownership client | — | The first claim acknowledges. |
| `caseId` | string \| null | Case client | — | Q-42 — links to the fairness appeal a suspension produces. |

**F-13 — severity is not derived from type, and must not be.** The seed data is consistent with
`SOS ⇒ critical`, and no code implements it (`10e` §16, UNVERIFIED). The rule instead:
**an `sos` incident is `critical` at intake and cannot be downgraded until the `contact` protocol step
is complete.** You do not get to decide the panic button was nothing before you have spoken to the
person who pressed it. Every other type defaults to `standard` at intake and is set by the operator.

### 8.4 States, and what acknowledgement means

| Status | Entered when | Clock running | What the operator sees |
|---|---|---|---|
| `unacknowledged` | Created | **Acknowledge** | Unclaimed, with an acknowledgement countdown. **This is the state notification N7 refers to.** |
| `acknowledged` | First claim | **Resolve** | Held by a named operator; the protocol is workable. |
| `closed` | All four steps complete **and** a disposition chosen | None | Terminal. Converted in place with the decision badge. |
| `reopened` | An operator reopens a closed incident with a reason | **Resolve**, restarted | Back in the queue. The original closure is preserved and visible. |

**Q-64 — Acknowledgement means a named operator has taken responsibility and the incident is being
worked.** It is not "someone read the notification". It requires a claim, and it is the one place
where claiming does more than declare intent.

**Q-65 — Releasing a claim does not un-acknowledge.** `acknowledgedAt` is written once and never
cleared. The incident returns to unclaimed and its **resolve** clock keeps running — because the
promise the acknowledgement made was to the person in the car, not to the queue. The row shows
`Acknowledged` and no owner, which is a state that needs a design.

**Q-66 — The acknowledgement clock cannot be restarted.** Reopening restarts the **resolve** clock
only. An incident acknowledged in 4 minutes and reopened three days later was still acknowledged in
4 minutes.

### 8.5 Dispositions

**Q-67 — Closing requires all four protocol steps and one outcome.** The row's action cell carries
`Open incident` and `Close incident`; `Close incident` is disabled until the protocol is complete,
with the reason stated, and its confirmation is where the outcome is chosen. This keeps the row to two
controls while satisfying §8.4.4's closed-set requirement.

| Outcome | Requires |
|---|---|
| `Resolved — no fault found` | If a precautionary suspension is in force, the operator must either lift it or record why it stands (Q-70). |
| `Resolved — action taken against the captain` | The action, named. |
| `Resolved — action taken against the rider` | The action, named. |
| `Resolved — compensation issued` | The amount and the ledger reference. |
| `Referred to authorities` | The reference, or an explicit statement that none was issued. |
| `Duplicate` | The id of the incident this duplicates. Sets `linkedIncidentId`. |

Every outcome requires `closureNote`. Every outcome is neutral-toned (Q-28) — none of these is a
success and none is a failure.

**Q-68 — Reopening exists.** Legacy's own confirmation text promises it — *"reopen it manually if new
information comes in later"* (`:13480`) — and no handler exists (`10e` §16.3). Reopening requires a
reason, is audited, restarts the resolve clock, preserves the original closure in the timeline, and is
gated on the same permission as closing.

### 8.6 The four-step protocol

`contact` → `verify` → `act` → `document`, from `INC_STEPS` (`:13394`). Retained in full, with four
changes:

**Q-69 — Order is enforced for `document` only.** `document` requires the other three complete.
`contact`, `verify` and `act` may be completed in any order — because in a real incident you may
suspend a captain before you have verified anything, and legacy's own precautionary-suspension path
force-completes `act` for exactly that reason (`:13470`). What you cannot do is document an outcome
that has not happened.

**Q-70 — A completed step may be un-completed, with a reason, and the original attribution survives.**
Legacy writes `{done:false}` over the whole object (`:13459`), destroying who originally did it and
when — which defeats the accountability trail its own source comment claims (`:13444`–`:13446`).
Steps carry an append-only `stepHistory`.

**Q-71 — A step completed as a side effect of another action is recorded as such.**
`precautionSuspend` force-completes `act` and writes **no** step audit entry (`:13470`, `:13472`), so
the activity log shows a step count changing with no step event.

**Q-72 — A denied step toggle must not leave the checkbox flipped.** Legacy's gate returns before the
re-render, so the UI shows the step ticked while the record says otherwise (`10e` §16.9). Under Q-25
the control is disabled at render and this cannot arise; the criterion below tests it anyway.

### 8.7 Precautionary suspension

**Q-73 — It must be liftable.** Legacy writes a reason string beginning `"Precautionary"`, and the
only deletion path in the file requires the string to begin `"Expired"` (`:13312`) — so **a
precautionary suspension is permanent for the life of the session** and closing the incident does not
lift it (`10e` §16.4). Lifting is an explicit action on the incident, gated on the same permission
that applied it, audited, and it notifies the captain.

**Q-74 — A suspended captain's appeal route is Captain Fairness.** The suspension and the appeal are
two items in two queues about one event, and Q-42 binds: each links to the other. Legacy has reason
code `DRV_SUSPENSION_APPEAL` (`:14711`) and **no code path back to the incident that caused the
suspension** (`10e` §13).

### 8.8 Who is notified

| Event | Audience | Surface |
|---|---|---|
| `critical` incident created | Every operator holding the safety work permission | One notification, `priority: 'critical'`. This is what N7 is. |
| `high` incident created | The roles routed to safety (§7.4) | One notification, `priority: 'high'`. |
| `standard` incident created | Nobody | The queue and the nav count only. |
| Acknowledgement breached, `critical` | Same audience as creation | One further notification, fired **once at the crossing** (Q-43), stating that it is still unacknowledged. |
| Acknowledgement breached, `high` / `standard` | The claimant, if any; otherwise the routed roles | One notification, batched (Q-44). |
| Resolution breached | The claimant | One notification, batched. |
| Severity raised to `critical` | As for a `critical` creation | One notification. |
| Closure | Nobody | It is not news to anyone but the person who closed it. |

**Q-75 — The nav count and its tone.** `nav.subTabCount['support-safety']` = incidents that are
`unacknowledged`, `acknowledged` or `reopened`. Tone is `attention` when at least one is breached on
its running clock, `neutral` otherwise. **With the current fixture — N7, unacknowledged, critical,
6 minutes old against a 5-minute acknowledgement target — this sub-tab is breached and the count is
at least 1.** That closes the inconsistency `navCounts.ts:130`–`:139` records against itself.
`navCounts.test.ts` fails the build if a third `attention` row appears; the fixture's own comment
already anticipates this one and names the consequence — **mock-data-engineer decides which of the
two existing `attention` rows yields**, and the note there says `financials-cash` (count 0, gated) is
the weaker claim.

### 8.9 Views

**`Open` (default: `unacknowledged` + `acknowledged` + `reopened`)** · `Critical` · `Closed` · `All`

**Change requested to the route table:** `routeTable.ts:588` declares
`open · critical-sos · closed`. Rename `critical-sos` to **`critical`** — severity is not type, and a
critical incident may be an accident or a medical emergency, not an SOS — and add `all`.
**Note for mock-data-engineer:** notification N7's route is
`/support/safety?view=critical-sos` (`notifications.ts:108`) and must change with it.

**F-15 — the legacy filter cannot be cleared.** `_safetyFilter` defaults to `all`, there is no `all`
tile, and once any of the three filter tiles is clicked the only way back is a page reload — and the
filter survives navigating away and back (`10e` §16.5).

### 8.10 Domain states

Beyond §4.11: `unacknowledged` · `acknowledged-unowned` (Q-65) · `protocol-incomplete` (with the
count of steps remaining and `Close` disabled, naming why) · `protocol-complete-undecided` ·
`suspension-in-force` · `suspension-lifted` · `severity-changed` (the row carries what it was and who
changed it) · `reopened` · `duplicate-of` · `trip-reference-unresolvable` (**F-14**: the linked trip
id does not resolve — the row must say so rather than opening an error).

### 8.11 Acceptance criteria

- **AC-300** An incident can be created from within the console, by an operator, with a type, a
  severity, a summary and at least one party.
- **AC-301** An `sos` incident is created at `critical` severity and cannot be lowered until its
  `contact` step is complete. Attempting to lower it before then states why.
- **AC-302** An incident's type is chosen from a fixed list. No incident can be created with a free-text
  type unless `Other` is chosen, which requires a label.
- **AC-303** An unacknowledged incident shows an acknowledgement countdown. Once claimed, it shows a
  resolution countdown. Never both at once, and the row states which promise is running.
- **AC-304** A `critical` incident unacknowledged for more than 5 minutes carries the breach marker and
  is counted in the page banner.
- **AC-305** Claiming an incident acknowledges it: the status changes from `Unacknowledged` to
  `Acknowledged` and the acknowledgement countdown stops.
- **AC-306** Opening an incident's record without claiming it leaves it `Unacknowledged` and its
  acknowledgement clock running.
- **AC-307** Releasing a claim on an acknowledged incident leaves it `Acknowledged` with no owner. Its
  acknowledgement countdown does not restart.
- **AC-308** `Close incident` is disabled while any of the four protocol steps is incomplete, and states
  how many remain.
- **AC-309** Closing an incident requires choosing one outcome from the fixed list and writing a closure
  note. Neither can be skipped.
- **AC-310** Closing with `No fault found` while a precautionary suspension is in force requires the
  operator either to lift the suspension or to record why it stands.
- **AC-311** A precautionary suspension can be lifted from the incident, and lifting it removes the
  captain's suspension in Compliance.
- **AC-312** A closed incident can be reopened with a reason. The reopened incident shows the original
  closure, its outcome and who made it, and its resolution countdown restarts from the reopen.
- **AC-313** Un-completing a protocol step requires a reason, and the record still shows who originally
  completed it and when.
- **AC-314** Applying a precautionary suspension marks the `act` step complete and records that step
  event with the same actor and time as the suspension.
- **AC-315** The `document` step cannot be completed while any of the other three is incomplete.
  `contact`, `verify` and `act` can be completed in any order.
- **AC-316** An operator whose role cannot close incidents sees `Close incident` disabled with its
  reason, and every protocol checkbox non-interactive. Clicking anything produces no state change and
  no denial message after the fact.
- **AC-317** A closed incident's protocol is read-only and its outcome, actor and time are legible on
  the row without opening it.
- **AC-318** The `Support` role sees the incident queue and cannot suspend a captain, close an incident,
  or change a severity. *(Constraint from **Q3**/Q-51; revisit if a `Trust & Safety` role is created.)*
- **AC-319** A `critical` incident inside its acknowledgement window carries no breach marker and no red
  row background; its severity is carried by its badge.
- **AC-320** The sub-tab's nav count is non-zero and toned for attention while an unacknowledged
  critical incident is past its acknowledgement deadline — before the sub-tab has been opened.
- **AC-321** Creating a `critical` incident produces exactly one notification. It remaining
  unacknowledged past its deadline produces exactly one more. Neither repeats on later clock ticks.
- **AC-322** Closing an incident produces no notification.
- **AC-323** An incident referencing a trip that cannot be resolved states so on the row and offers no
  broken link.
- **AC-324** With no incidents ever recorded, the queue shows the first-run treatment. With every
  incident closed, it shows the cleared-queue sentence — and the two are different screens.
- **AC-325** A filter or view applied on this queue can be cleared from within the queue, without a
  reload, and does not survive navigating away and back.
- **AC-326** A precautionary suspension and the captain's appeal against it each link to the other.

---

## 9. Support › Captain Fairness

**Route** `/support/fairness` · `fairness` · **Pattern** P5 + P8.

### 9.1 What differs

**It is the only queue whose SLA target lives on the row, not on the queue.** Every case carries a
reason code, and the reason code carries the target (`rcTargets()`, `:14730`–`:14742`). A rating
dispute has 48 hours; a suspension appeal has 24. Two rows in the same view can have windows twice
each other's length — which is precisely why `slaClock` takes `targetMinutes` per item and why a
shared queue-level constant would be wrong here.

**It is the only queue that exists to be *lost*.** Its own empty state says so:
*"A high overturn rate on this page is not a failure — it means the appeal route is doing its job and
catching bad calls before they cost you a captain"* (`:15677`). Every metric on it must be read that
way, and the overturn rate must never be presented as a defect rate.

**It is the only queue where the person waiting is not a customer.** A suspended captain earns nothing
while their appeal runs, which is why one rule below overrides the shipped policy.

**Its fourth view is not a queue at all.** Captain economics — earnings per engaged hour — is a
read-only metric surface that fails §4.1's admission test on every clause: nobody is expected to act
on a row, there is no decision, nothing converts, and nobody would notice if no one looked. It is P5,
it lives on this route, and it must not grow claim, SLA or disposition furniture.

### 9.2 Scope

**In:** the three case kinds as one queue with three views; the two dispositions with a mandatory
rationale; the suspended-captains list as the appeal *route*; the corrective effects of an overturn;
captain economics as a read-only view.

**Out:** filing a case (the three modals at `:15522`, `:15543`, `:15568` are entered from Trips, from
the commitment row menu and from a captain's record — they are *entry points on other screens* and
stay there); the captain-notification channel (**Q-79**); `sameCaptainStats()` / `onTimeStats()`
(defined here, called by nothing — `:15697`, `:15703`).

### 9.3 Views

**`Suspension appeals` (default)** · `Rating disputes` · `Rider reports` · `Captain economics` ·
`All cases`

Matching the route table (`routeTable.ts:583`) with `All cases` added. **The default is
`Suspension appeals`** because a suspended captain is earning nothing while it runs — it is the only
view where the clock costs someone their income, and the only one whose subject cannot work while
waiting.

### 9.4 Data

| Field | Type | Source | Derived | Notes |
|---|---|---|---|---|
| `id` | string `FC-nnnn` | System | — | |
| `kind` | `suspension-appeal` \| `rating-dispute` \| `rider-report` | Intake | — | |
| `captainId` | string | Intake | — | The captain, always — this queue is the supply side's route back. |
| `subjectId` | string \| null | Intake | — | The rider, on disputes and reports. `null` on an appeal. |
| `reasonCode` | one of six `DRV_*` codes | Intake | — | `:14705`–`:14711`. **Determines the SLA target.** |
| `detail` | string | Intake | — | The captain's own words. |
| `openedAt` | `IsoDateTime` | Intake | — | **`startedAt`.** |
| `targetMinutes` | number | `rcTargets(reasonCode).res` | ● | Per row. 1440 or 2880. |
| `dueAt` | `IsoDateTime` | `openedAt + targetMinutes` | ● | |
| `status` | `open` \| `upheld` \| `overturned` | Record | — | |
| `decision` / `decidedBy` / `decidedAt` | — | Record | — | Shared shape (§4.10). |
| `rationale` | string | Operator | — | **Required on both dispositions.** Legacy initialises it to `null` (`:15513`) and **never writes it** (`10a` §16.3), while the confirmation copy argues that appeal legitimacy depends on a recorded reason. |
| `tripId` | string \| null | Intake | — | On disputes and reports. |
| `disputedRating` | number \| null | Intake | — | **Stored and never rendered** (`10a` §16.6). The number the captain is contesting must be on the row. |
| `averageAdjusted` | boolean \| null | Overturn | ● | Whether the captain's historical average could be recomputed. §9.6. |
| `claim` | `Claim` \| null | Ownership client | — | |
| `caseId` | string \| null | Case client | — | Links a suspension appeal to the safety incident that caused the suspension (Q-74). |

### 9.5 Captain economics — the read-only view

`earnings ÷ engaged hours`, per captain, descending. Three rules bind, all of them about honesty:

- **It is an upper bound and must be labelled as one.** "Engaged hour" is time on trip. True online
  hours including waiting need captain-app telemetry this console does not receive
  (`:16274`–`:16279`).
- **The fleet average is a mean of per-captain rates, not total earnings over total hours**
  (`:16294`), so a captain with one 5-minute trip weighs as much as one with 400. Either the
  calculation changes or the label says which it is. **This spec requires the label to say which**,
  and flags the calculation as **Q-80**.
- **Earnings include tips** (`:16284`) and the caveat text does not say so (`10a` §16.12).
- **The under-earner threshold is a hardcoded `0.7`** (`:16307`) with no action attached and no
  configuration. It stays a highlight, not a signal, until someone decides what an operator is
  supposed to *do* about it.

### 9.6 Dispositions

| Disposition | Effect | Required |
|---|---|---|
| **Uphold** | The original decision stands. | `rationale` |
| **Overturn** | The effect is reversed. | `rationale` |

Both are irreversible and confirm (`:17950`–`:17968`).

**Q-76 — Overturning must reverse something, on every kind.** Today two of three do:
*Rating dispute* voids the score, and recomputes the captain's average when a denominator exists;
*Suspension appeal* reinstates the captain. *Rider report* has **no code path at all** (`:15597`,
`:15622`; `10a` §16.5) — it is silently marked `Overturned` and nothing changes. **Required effect:**
overturning a rider report dismisses it and removes its contribution to the rider's no-show counter,
which `riderNoShowCount()` (`:19525`–`:19533`) reads from this very table and surfaces on the rider's
record.

**Q-77 — An overturned rating is always voided; the average is recomputed only when it can be.** The
in-code rationale is right and must survive: *"a seeded average with no denominator cannot be
un-averaged — inventing one produces impossible results (removing a 2★ from 4.5 over an assumed n=2
yields 7★)"* (`:15598`–`:15606`). The row must state which of the two happened, in words. This is the
model for every derived-value honesty problem in the product.

**Q-78 — Upholding must do something.** Today an upheld case changes a status string and nothing else:
no note on the captain's record, no strike, no notification — while the confirmation copy tells the
operator *"the captain is notified of the outcome"* (`:17961`). Required: upholding writes the
decision and its rationale to the captain's record where the captain's next appeal will see it. The
notification is **Q-79**.

**Q-81 — A suspension appeal's clock does not pause.** `DB.slaPolicy` tier T2 sets
`pauseOnCustomer: true` (`:14653`), which pauses the clock whenever we are waiting on the other party.
For `DRV_SUSPENSION_APPEAL` that is overridden to **false**, because the cost of the pause falls on the
suspended captain, who is earning nothing, and not on us.

### 9.7 Domain states

Beyond §4.11: `appeal-open-for-suspended-captain` (the suspension is in force *while* the appeal runs
— the state the whole queue exists for) · `appeal-already-open` (a captain may not have two open
appeals against one suspension; legacy hides the button in the UI and puts no guard on the commit —
`10a` §16.13) · `rating-voided-average-recomputed` vs `rating-voided-average-not-recomputable`
(Q-77) · `captain-reinstated` · `case-linked-to-incident` (Q-74).

### 9.8 Acceptance criteria

- **AC-330** Two open cases with different reason codes show different total windows: a rating dispute
  and a suspension appeal opened at the same moment show different countdowns.
- **AC-331** A suspension appeal's countdown continues while the case is waiting on the captain. It
  does not pause.
- **AC-332** The default view on opening `/support/fairness` with no view in the URL is
  `Suspension appeals`.
- **AC-333** Upholding or overturning a case requires a written rationale. Neither can be submitted
  without one, and the rationale is visible on the decided row.
- **AC-334** Overturning a rating dispute states, on the row, whether the captain's historical average
  was recomputed or only the disputed score voided.
- **AC-335** Overturning a rider report removes that report from the rider's no-show count, and the
  count on the rider's record decreases.
- **AC-336** Upholding a case leaves a record of the decision and its rationale on the captain's
  record.
- **AC-337** A case row shows the disputed rating value when the case is a rating dispute.
- **AC-338** A captain with an open suspension appeal cannot have a second one filed against the same
  suspension; the attempt states why.
- **AC-339** A suspension appeal arising from a safety incident links to that incident, and the
  incident links back.
- **AC-340** The captain-economics view offers no claim control, no countdown and no disposition on any
  row.
- **AC-341** The captain-economics view states that engaged hours exclude waiting time, that the figure
  is an upper bound, that tips are included, and how the fleet average is calculated.
- **AC-342** The overturn rate is presented without a target, a threshold or a tone that implies a high
  value is bad.
- **AC-343** The three case views can each be dispositioned to zero and each show the cleared-queue
  sentence naming that view's scope.
- **AC-344** Every action on this queue is permission-gated at render. An operator whose role cannot
  decide cases sees `Uphold` and `Overturn` disabled with their reason.

---

## 10. Findings — current behaviour, suspected defects

Recorded so nobody specs them as correct and nobody "fixes" them by accident. Numbered `F-*` to avoid
colliding with `docs/ref/defects.md` D1–D25 and foundation `D-L1`–`D-L12`.

| # | Current behaviour | Why it looks wrong | Evidence |
|---|---|---|---|
| **F-1** | `coverage` and `commitment` are filed under Metric tiles (§6.4) | Both carry claimable items with deadlines and closed disposition sets — §8.4's own definition of a queue | `patterns.md`; `:16972`, `:17054`, `:17550` |
| **F-2** | `safety` is filed under P9 with no detail route | An incident is claimed, clocked, decided once and leaves. It is a queue that also has a record | `patterns.md`; `routeTable.ts:600` |
| **F-3** | `DataTable` derives the empty *kind* from `isFiltered`, so a cleared queue renders first-run | The illustration says "create the first one" about a queue nobody creates items in | the People build |
| **F-4** | `commitment`, `inbox` and `fairness` have **no** `PAGE_PERMISSIONS` entry; `safety.view` is declared and never enforced | These four surfaces can suspend a captain, forfeit earnings, terminate plan access and close a safety incident | `:10564`–`:10651`; `10e` §16.13 |
| **F-5** | A `declined` subscription request matches no status view | `reqStatusMatch` handles three status groups and `declined` is in none | `:10047`–`:10055` |
| **F-6** | Two seeded subscription requests point at `SUB-1052b`, which does not exist | `View sub` opens a broken profile | `:2796`, `:2799` |
| **F-7** | Trip Readiness promises "next 24 hours" and applies no time filter | Legs 21+ hours out are in the list; a leg 40 hours out would be too | `:13008`; `07b` §7 |
| **F-8** | A leg never leaves the board on departure | The queue accumulates trips that already happened | `07b` §16.9 |
| **F-9** | `departureRisk()` computes minutes-to-pickup as `20 − (tripId digits % 18)` | A deterministic pseudo-value dressed as an ETA, driving a `critical` severity and a `-1` due sentinel | `:16612` |
| **F-10** | Absence forfeiture is logged and never posted to any wallet, escrow or payout | The console reports money moved that did not move | `10b` §17.7 |
| **F-11** | The 21:00 confirmation deadline exists only in display strings | The rule the whole prevention layer rests on is never enforced | `10b` §17.1 |
| **F-12** | `WORK_ROUTING` routes 11 of 12 queues to `'Operations'`, which is not a role | **An Ops Manager sees an empty work inbox** | `:19091`–`:19102` vs `:10501` |
| **F-13** | Severity is hand-authored per record with no producer for the third level and no derivation from type | The scale has an unreachable value and an SOS can be logged as `standard` | `:13429`; `10e` §16.16 |
| **F-14** | Two of three seeded incidents reference trip ids that are not in `DB.trips` | One of the two reachable `Open trip` buttons produces an error toast instead of a record | `10e` §16.15 |
| **F-15** | The safety filter cannot be cleared from the UI and survives navigation | Once a filter tile is clicked, only a reload restores the full list | `10e` §16.5 |
| **F-16** | The safety sidebar badge is written only by the page's own render, and there is no tick hook | An open SOS reads `0` next to the word "Safety" until somebody happens to click it | `:13406`; `10e` §12 |
| **F-17** | `#sbb-inbox` uses `count(breached) \|\| count(unclaimed)` | The moment one item breaches, the badge stops reporting unclaimed work entirely — the number changes meaning without changing appearance | `:19315`–`:19316` |
| **F-18** | Un-ticking a safety protocol step replaces the whole object, destroying `by` and `at` | Defeats the accountability trail the module's own comment claims | `:13459`; `10e` §16.10 |
| **F-19** | A precautionary suspension cannot be lifted, and closing the incident does not lift it | The one irreversible action in the module is irreversible by accident, not by design | `:13468` vs `:13312` |
| **F-20** | `c.rationale` is initialised on every fairness case and never written | The appeal route records decisions with no reasons | `:15513`; `10a` §16.3 |
| **F-21** | Overturning a rider report has no code path | The case is marked `Overturned` and nothing is reversed | `:15597`, `:15622`; `10a` §16.5 |
| **F-22** | An upheld fairness case has no downstream effect, while the confirmation says the captain is notified | Copy promising an action nobody implemented | `:17961`; `10a` §16.4 |
| **F-23** | The fairness fleet average is a mean of per-captain rates, presented as a fleet rate | A captain with one 5-minute trip weighs as much as one with 400 | `:16294` |
| **F-24** | Requests' `Export snapshot` has no permission gate and writes no audit entry | It exports the full rider-linked request corpus, including names, phones, IPs and devices | `:9766`–`:9776` |
| **F-25** | `playAlertBeep()` fires unconditionally with no mute | An audible alert nobody can turn off, on a console that is open all day | `:9731`–`:9749` |
| **F-26** | `inboxOpen` evaluates the item's action string through `new Function()` | All inputs are internal ids today; a record id containing a quote breaks out of the generated literal | `:19308` |

---

## 11. Open questions

Format per foundation §12. Each names its owner and what is blocked.

### 11.1 Closed by this spec

| Was | Answer |
|---|---|
| **Q8** — what is `all-pending`'s SLA target, and what are the other queues'? | **Closed, §4.3.** Sixteen targets, each with the policy that produced it. `all-pending` (People › Applications) = **48 h**, T3 `resolveMin`, ratifying the fixture placeholder. Requests instant = 3 min; Requests subscription = 90 min; the seven Trip Assurance types individually; Safety on two clocks by severity; Fairness per reason code. My Work sets none by design. |
| Who may claim, what a second operator sees, does a claim expire | **Closed, §4.2**, Q-1 – Q-9. |
| What makes a row breached rather than merely old | **Closed, §4.4**, Q-17 – Q-20. |
| The complete disposition set per queue | **Closed** — §5.5, §6.4, §7.2 (none), §8.5, §9.6. |
| Default view and default sort per queue | **Closed** — Q-32, Q-33, and each section's Views heading. |
| What a zero-item queue means | **Closed, §4.7** — E1 is a third empty and is not first-run. |
| Can an item appear in two queues at once | **Closed, §4.8** — no, except My Work, which is a projection and labels each row. |

### 11.2 Still open

| # | Question | Owner | Blocked until answered |
|---|---|---|---|
| **Q-79** | **Is there a captain-facing notification channel?** Three wave-2 dispositions tell the operator that the captain will be told: a fairness decision (`:17961`), a lifted suspension (§8.7), and an auto-handoff to backup. No code sends any of them, and no channel exists in this console. Either the channel exists elsewhere and this console calls it, or the confirmation copy must stop promising it. | Business owner, with engineering lead | The confirmation copy on three dispositions. Ships in wave 2 with the promise **removed** from the copy rather than left as a lie — recorded as a deliberate omission, not a gap. |
| **Q-80** | **Is the fleet average a mean of per-captain rates, or total earnings over total hours?** They are different numbers and only one is "the fleet's earnings per hour" (**F-23**). | Finance lead | The label on one metric in Captain Fairness › Captain economics. Ships labelled as a mean of per-captain rates, which is what it computes. |
| **Q-82** | **What is the retention window on a decided queue item?** A decided row stays until the operator navigates away (Q-29). How long does it stay in the `All` view — the shift, the day, forever? Every queue's `All` view grows without bound otherwise, and Safety's especially: a closed incident is a legal record. | Business owner, with whoever owns data retention (Admin › Data & Compliance) | The `All` view's scope on all five queues, and the `Closed` view on Safety. Ships showing everything, which is correct for a demo corpus and wrong at 50 000 rows. |
| **Q-83** | **May an operator change an item's SLA target on a single row** — extend a deadline with a reason? Real ops work has legitimate cases (a rider who asked us to wait). Nothing in the legacy app offers it, and adding it makes every breach count arguable. | Business owner | Nothing in wave 2. Ships **without** it; the question is recorded so it is a decision rather than an omission. |
| **Q-84** | **Which permission gates each of these five sub-tabs, and what is the split between `view` and `work`?** This is **Q4** narrowed to wave 2 (§4.13, **F-4**). Three of the five have no entry to inherit from. | Business owner, with whoever owns identity | `permission: null` on five route-table rows, and every write action on four queues visible to every role — including precautionary suspension, plan termination and earnings forfeiture. **This is the most consequential open question in wave 2.** |
| **Q-85** | **Does `Trust & Safety` exist?** This is **Q3** as it bites here: with three permissions, the Support role cannot make a suspension decision, so Safety & Incidents ships Ops-Manager-gated and Support-read-only (Q-51). If the role is created, three rows of §7.4's routing table and **AC-318** change. | Business owner | **AC-318** and three routing rows. Everything else in §8 is independent of it. |

### 11.3 Q13 — a position, not a decision

**Q13 (ledger sign convention) is not a work-queue question and its owner is mock-data-engineer**, per
foundation §12. It reaches wave 2 through exactly one seam: Financials › Cash & Captain Debt is a
ledger *whose escalations are a work queue* (foundation §3.4), so in wave 3 a queue row will render a
money amount that a ledger posted. The position this spec takes, for that seam only:

> **A posting carries a positive `amount` and a `direction: 'debit' | 'credit'`.** Not a signed
> amount. The reason is already law and is not mine to re-decide: `DESIGN.md` §8.3 and foundation §7.2
> require *"two columns holding positive numbers — the sign lives in the column choice"*, and a signed
> `amount` forces every renderer to re-derive direction from a sign, which is the class of derivation
> that ends up wrong in exactly one place. A queue row escalating a cash discrepancy then shows the
> amount and its direction as two facts, and never a minus sign.

**mock-data-engineer ratifies or overrides this when the wallet types land.** Nothing in wave 2 is
blocked on it, and nothing in this spec depends on the outcome.

---

## 12. Handoff

**Artifact:** this file. Five sub-tabs, one shared contract, AC-200 – AC-344.

### To product-designer

1. **§4.7's three empties.** E1 (queue clear) is a third kind and its copy must be final in the design
   spec, per queue and per view — never written by the engineer at build time. **F-3** says the
   current component cannot express it.
2. **The owner chip's three states in Arabic** (Q-56) — a full Arabic name plus `Take over` in a fixed
   cell, and the decision badge's outcome-plus-actor-plus-reason on one line. Both need checking at
   their longest before sign-off.
3. **Q-11's two clocks on Safety.** The row shows one countdown; the **status badge** says which
   promise is running. The countdown component gains no new variant — confirm that reads correctly, or
   propose an alternative that does not add one.
4. **Q-13's sub-minute countdown.** A 3-minute window rendered in seconds. This is a change to
   `formatDuration` (utilities-engineer) and a legibility question at 13 px (yours).
5. **§6.4's seven item types on one screen.** M6's named risk is density, and its mitigation binds:
   **views, not stacked cards.** Seven types across four views, with different columns per view, on one
   card.
6. **F-1 and F-2** are `DESIGN.md` §6.4 row changes in
   `docs/06-design-reference/_partials/06-eyvar-mapping.md`, followed by a `build-design.py` rebuild.
   The `fraud` row change from wave 0 is the precedent. Yours to make.
7. **Q-22 removes four red row backgrounds** the legacy app uses to mean "serious". Severity needs a
   non-red carrier on Safety and on Trip Assurance's readiness reasons.

### To mock-data-engineer

1. **`SafetyIncident` is §8.3, in full** — every field, with the state machine in §8.4 and the two
   clocks in §4.3. Fixtures must reach: `unacknowledged`, `acknowledged`, `acknowledged-unowned`
   (Q-65), `closed`, `reopened`, breached-on-acknowledge, breached-on-resolve, a suspension in force,
   a suspension lifted, a duplicate, and **F-14**'s unresolvable trip reference.
2. **The N7 inconsistency closes in your fixture, not in mine.** `navCounts.ts:139` becomes non-zero
   and `attention` (Q-75). `navCounts.test.ts` allows two `attention` rows; your own comment at
   `:130` names this one as the strongest claim and `financials-cash` as the weakest. Your call which
   yields — but safety is breached on the fixed clock and the others are not.
3. **Route table changes**, all in `routeTable.ts`: `support-safety` → `patterns: ['P8','P9']`, a
   detail route `/support/safety/:incidentId`, views renamed to `open · critical · closed · all`;
   `operations-requests` → `pending` renamed `needs-decision` and `all` no longer default;
   `operations-assurance` and `support-fairness` → add an `all` view. **And**
   `notifications.ts:108`'s N7 route must move from `?view=critical-sos` to `?view=critical`.
4. **`targetMinutes` per row is required on two queues** — Fairness (from the reason code) and Safety
   (from severity, and it changes when severity changes). Everywhere else `startedAt` + `dueAt` is
   enough.
5. **`No clock` needs fixtures, not just a code path.** Three item types legitimately have no
   deadline: an absence event with no claim filed, a leg outside its window, and a departing leg more
   than 3.5 hours out. Each needs a row.
6. **`ClaimAffordance` is derived server-side** (§4.10) and must arrive on the row. A component
   re-deriving `canTakeOver` from `session.userId` is the shape of a bug that only appears when two
   people are logged in.
7. **`decidedBy` should be `{id, name}`**, not an id — wave-1 finding **G11**, restated because four
   more queues now need the join.
8. **Q13** — §11.3 takes a position on the sign convention for the wave-3 cash-escalation seam. Yours
   to ratify or override.

### To utilities-engineer

- **Q-13:** `formatDuration` needs a seconds tier below the existing `Nm` tier, used when the total
  window is under 10 minutes. The three existing tiers are unchanged.
- **Q-7:** claim expiry must be evaluated on a timer, never inside a read (**D-L12**). Whether that
  lives in a hook or behind the seam is yours; the rule is that rendering must not mutate.

### To the shell / `src/components/` owner

- **F-3:** `DataTable` must let a `mode: 'queue'` call site express **queue clear** as distinct from
  first-run, or derive it from the mode. Today an unfiltered empty queue renders an illustration
  telling the operator no records exist.

### To main

Two lines are in the final response.

### Blocked, and on whom

| Blocked | On | Who |
|---|---|---|
| Permission gating on all five queues, including precautionary suspension and plan termination | **Q-84** (= Q4) | Business owner |
| **AC-318** and three routing rows in §7.4 | **Q-85** (= Q3) | Business owner |
| The confirmation copy on three dispositions that promise the captain is notified | **Q-79** | Business owner |
| The `All` view's scope on five queues, and `Closed` on Safety | **Q-82** | Business owner + data retention |
| Nothing else. §4 – §9 can be designed and built today. | | |
