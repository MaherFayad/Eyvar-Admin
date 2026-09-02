# Operator decisions — does this console carry a working day?

> Assessed 2 September 2026 against the running app (`npx vite --port 5301`), every one of
> the 34 sub-tabs walked, plus the secondary views, the row menus, the bulk bars, the
> command centre, the exports and the 360° profile. Fixture dataset is anchored at
> **25 June 2026 09:14 (`EYVAR_NOW`)**.
>
> The owner's question, verbatim: *"are these all the data and decisions needed for me to
> take everyday, follow on critical decisions, and will it save my team time as much as
> possible"*
>
> Short answer: **the data is nearly all there and the decisions are nearly all named. What
> is missing is the wiring between them.** This console is built as 34 excellent
> single-purpose screens and almost no paths between them. That is a specific, fixable
> shape of problem, and it is not the same as "needs more features".
>
> Out of scope by instruction, not re-reported: the row-click contract, the identity-column
> collapse, critical-row contrast, `defaultValue`, raw reason codes, the API contract, code
> splitting.

---

## 0. What is already good, so the criticism lands where it should

Before the findings, the things a team would actually miss if they were removed:

- **The five work queues share one contract** — deadline, owner, claim/release, a decision
  pair per row. `My Work › Unassigned` shows 20 items across Requests, Fairness,
  Applications, Safety and Assurance sorted by deadline with an owner chip on each. That is
  a real work-routing layer and most consoles do not have one.
- **Refusals are written in sentences, in place.** `Nothing is payable after cash debt.`
  `Add a bank account before paying this captain.` `Release when every plan trip is
  delivered.` `Sarah Al-Rashid already owns this ticket.` An operator is told *why* a
  control is dead, at the control. This is the single best thing in the product.
- **The accounting model is real.** Trial balance balances at 12,237.43 both ways with 12
  refused postings kept and readable; the reconciliation tab surfaces a genuine 4.40 SAR
  break between operational and ledger captain-cash-receivable. Escrow, deductions, VAT
  output and contra-revenue are all modelled, not decorated.
- **`Adjust wallet` is done properly** — a ceiling read from the operator's role
  (`Ceiling applied: Owner … 1,000.00 SAR per case`), a required reason code, and copy that
  says it is a new posting rather than a correction.
- **CSV files carry their provenance** — `query`, every `filter`, `sort`, `columns`,
  `rows`, `total_matching`. An exported number is attributable.
- **Trip Assurance's `Hand over`** is a complete decision: it names the 20-minute window,
  states that the primary keeps the leg until the backup answers, and picks a real captain.

Everything below is against that standard, not against nothing.

---

## 1. The daily loop — three roles, before lunch

### 1.1 Ops manager

| # | Decision they must take today | Where it is taken | Is the data on that screen? |
|---|---|---|---|
| 1 | Which of the 20 unclaimed work items do I take first? | `Operations › My Work` (`Unassigned`) | **Yes.** Deadline, queue, severity, owner, one-click Claim, bulk Claim. This is the best screen in the product. |
| 2 | The 4-day-overdue subscription request for Al Narjis — which captain gets it? | `Operations › Requests` → `Assign` | **No — three screens.** See below. |
| 3 | Two captains have lapsed documents. Take them off dispatch? | banner on `Operations › Overview` → `People › Compliance` | **No — the banner's button does not work.** See F-1. |
| 4 | Al Narjis is at 7.0× demand:supply. Do I steer or recruit? | `Management › Zones` | **Partly.** `Steer captains` and `Queue recruitment` exist per zone, but the zone panel does not say *which* captains are near, and the assign picker on Requests cannot use the answer. |
| 5 | Four legs depart in 24h with no backup captain. Cover them? | `Operations › Trip Assurance` | **Yes.** Reason, deadline, owner, `Hand over` with a picker. Complete. |

**Gap ①, and it is the ops manager's headline gap: assigning a captain is a
three-screen decision made on a screen with one field.**

`Operations › Requests` has six open requests. `الجوهرة بنت عبد العزيز` has been searching
for a subscription captain for **4 days 22 hours past deadline**. The `Assign` dialog
offers one control:

> Captain — *Choose a captain*. "Active captains only. The rider is told who is coming."

The options are built at `src/screens/operations/requests/RequestsScreen.tsx:320-324`:

```ts
options: (captains.data?.items ?? []).map((captain) => ({
  value: captain.id,
  label: captain.name,
  hint: captain.city,
})),
```

`label` is the name; `hint` is the city — and **every captain in the dataset is in
Riyadh**, so the hint carries zero bits. The manager is choosing from ~51 identical rows.
To choose well they need:

- who is free — `Operations › Overview` says *"50 Captains available now"*, and
  `Live Dispatch` says *"Fleet online 51"*; neither number is on the picker;
- who is near Al Narjis District — `Management › Zones` says Al Narjis has **2** captains
  against **14** requests; the picker does not know about zones at all;
- who is not already at their subscription cap — `Subscriptions` has that, the picker does not;
- who is off dispatch for lapsed documents — `People › Compliance` has that; the picker
  filters on `status: active` only.

Four screens' worth of data, one dropdown of names. **This is the finding.**

**Gap ②: no captain has a workload figure anywhere.** `People` shows lifetime `Trips` and
`Earned`. Nowhere shows "trips today", "subscriptions held / cap", "on a trip now" or "last
active". `Operations › Overview` publishes `50 Captains available now` as a single integer
with no way to see the 50.

---

### 1.2 Finance operator

| # | Decision they must take today | Where it is taken | Is the data on that screen? |
|---|---|---|---|
| 1 | Run the payout batch — who gets paid, and how much? | `Financials › Payouts` | **No — two screens, and the second one changes the answer.** See below. |
| 2 | Release ESC-1052 (10/10 delivered, 329.60 SAR)? | `Financials › Payouts › Escrow` | **Yes.** Progress `10/10` is on the row and the button is live. Good. |
| 3 | ESC-0987 — subscription cancelled mid-plan at 2/5, 69.20 SAR held. Refund, part-release, or forfeit? | *nowhere* | **No.** See chain C-4. |
| 4 | 12 postings were refused and the banner says debits and credits disagree. Is the book closable? | `Financials › Overview` → `Ledger › Refused postings` | **Yes**, and this is the one banner CTA that works. |
| 5 | The reconciliation tab shows a 4.40 SAR break on captain cash receivable. Whose? | `Financials › Ledger › Reconciliation` | **No.** The number is stated; the captain is on a different sub-tab. See chain C-5. |
| 6 | Apply or waive DED-01 (15.00 SAR, late pickup, Khalid Mansour)? | `Financials › Payouts › Deductions` | **No.** A fairness case has already ruled on it and this screen does not know. See chain C-3. |

**Gap ③ — the payout decision, stated exactly.**

To decide whether to pay a captain on Thursday an operator needs two facts: the net payable
and whether the debt netted off it is settled or contested. **No screen shows both.**

`Financials › Payouts` (columns: `captain trips payable debt net state`) shows:

| Captain | Payable | Cash debt | Net payable | State |
|---|---:|---:|---:|---|
| Ahmed Salem | 652.60 | 23.15 | 629.45 | Due |
| Khalid Mansour | 421.00 | 84.25 | **336.75** | Due |
| Ibrahim Diarra Coulibaly | 0.00 | 316.90 | −316.90 | Due |

`Financials › Cash › Reconciliation queue` shows, for the same captains:

| Report | Captain | Expected | Reported | Deviation | Classification | Owner |
|---|---|---:|---:|---:|---|---|
| CASH-0001 | Khalid Mansour | 29.40 | 21.00 | −8.40 | Under-reported | **Unclaimed** |
| CASH-0002 | Khalid Mansour | 21.85 | Never reported | — | Never reported | — |
| CASH-0005 | Ibrahim Diarra Coulibaly | 1,284.50 | 1,000.00 | −284.50 | Under-reported | **Unclaimed** |

So Khalid's 84.25 SAR debt is **not settled** — 8.40 of it is a contested under-report that
nobody has picked up, and 21.85 of it is a fare that was never reported at all. Paying
336.75 today nets an amount that is still in dispute. The Payouts screen says nothing.

The data exists and is *modelled*: `Financials › Cash › Captain debt ledger` has an
**`openReports`** column and a **`cap`** column, and flags Ibrahim `Cash collection
suspended` (316.90 against a 300.00 cap). Neither column exists on Payouts, and neither is
offered in the Payouts column picker — the picker has exactly six entries and no more.

**And Payouts has one filter field: `State`.** Not "net payable > 0", not "has cash debt",
not "has open reports". 51 rows, 20 of them zero-value `Paid`, eyeballed.

**This is a regression against the module doc.** `docs/01-modules/12b-driver-wallets.md` §1
describes one page carrying *"four distinct financial subsystems"* — payouts, escrow,
deductions and cash reconciliation — precisely because they net against each other. The
restructure split reconciliation onto its own sub-tab and dropped the join.

**Gap ④: the captain ledger drill-down does not show the deduction.** Clicking Ahmed Salem
on Payouts opens `?captain=DRV-0101` — `Captain earnings payable · Ahmed Salem`, two
postings, closing balance 652.60. The 23.15 cash debt that produced the 629.45 net is on a
different account (`ar.driver`) and a different screen. **The number on the row cannot be
reconstructed from the ledger the row links to.**

---

### 1.3 Support agent

| # | Decision they must take today | Where it is taken | Is the data on that screen? |
|---|---|---|---|
| 1 | Two SOS incidents are unacknowledged and overdue. Act. | `Support › Safety` | **No — the captain is not on the screen.** See F-4 and chain C-1. |
| 2 | 28 disputes, all showing overdue. Which first? | `Support › Disputes` | **No — the clock is wrong on every row.** See F-2. |
| 3 | Take TKT-505 (payout refused on the details held). | `Support › Tickets` → 360° profile | **No — the ticket points at the wrong person.** See F-5. |
| 4 | Five conversations are past first response. Claim and reply. | `Support › Contact Centre` | **Yes.** Presence, concurrent-chat cap, per-conversation deadline, ticket link. Good screen. |
| 5 | What are riders actually contacting us about this week? | `Support › Overview` / `Tickets › By reason code` | **No — both are empty or fake.** See F-3. |
| 6 | Overturn FC-0001 (operating card expired 7 days ago). | `Support › Fairness` | **Yes to decide, no to effect.** See chain C-3. |

**Gap ⑤ — the module's own headline analytic does not exist.**

`docs/01-modules/13c-contact-drivers.md` §1 states the page's purpose in the product's own
words: *"Every contact carries a reason code — this is what riders and drivers actually
call about, and whether we kept the promise we made them"*, read *"top-down, not
left-to-right: the top row is the contact you should be trying to eliminate."*

In the running app:

- `Support › Overview` tile **Contacts per 1,000 trips** → `—` / *"Not captured yet"*
- `Support › Overview` tile **Uncoded contacts** → `—` / *"Nothing to measure yet"*
- `Support › Overview` chart **Contacts per 1,000 trips** → *"Nothing is recorded here yet."*
- `Support › Overview` breakdown **Top 5 contact reasons, per 1,000 trips** → *"Nothing is recorded here yet."*
- `Support › Tickets › By reason code` → an **ungrouped list of every ticket**, identical
  to the other tabs, because the view predicate is
  `'by-reason-code': () => true` (`src/data/clients/tickets.ts:135`).

Four surfaces promise the analysis; none delivers it. A support manager cannot answer
"what should we stop causing" anywhere in this console.

---

## 2. Five chains, and the exact step where the product lets go

### C-1 — SOS → identify the captain → suspend → cover their live trips

**Where it breaks: step 1, before any decision is possible.**

`Support › Safety` row: *"Rider pressed SOS during trip — no answer on first callback"* ·
`SOS · TRP-9012` · Critical · Unacknowledged · **overdue 12m**.

The columns are `incident · severity · status · sla · owner · protocol`, plus hidden
`id · type · opened`. **There is no captain column and none can be added.** The data is
right there — `src/data/types/safety.ts:104-105` declares `driverId` and `driverName` on
every incident — and `SafetyScreen.tsx` never declares a column for it.

So the agent's first move on a critical SOS is:

1. read `TRP-9012` off the incident,
2. go to `Operations › Trips`, filter Captain/search `TRP-9012`, read **Omar Farouk**,
3. go to `Operations › People`, find Omar Farouk, suspend.

Three screens to learn the name of the person the rider pressed the panic button on.

**And the third step is deliberately unavailable from Safety.** `precautionarilySuspend`
exists and works in `src/data/clients/safety.ts:375`; `SafetyScreen.tsx:42-51` explains
that it is withheld because the lift path is unbuilt (legacy defect F-19). That is honest
engineering and the wrong operational outcome: the module whose whole reason for existing is
a 90-second protocol cannot take the one action the protocol implies.

The protocol column itself is **four unlabelled checkboxes**. Which one is "voice contact
attempted"? The row does not say.

**Then the chain ends entirely.** After suspending Omar Farouk, `Operations › Dispatch`
still shows `TRP-9012 · Olaya → Granada Mall · Layla Al-Faraj · Omar Farouk · In trip`. The
`Reassign` button on the Interventions card is disabled with the honest sentence
*"Interventions are read-only until the live alert feed is connected."* There is no other
reassignment surface for a live trip anywhere in the console.

---

### C-2 — Captain suspended → their subscriptions need a new captain → the riders need telling

**Where it breaks: step 2, and it is a hard stop.**

Suspending a captain writes exactly one thing
(`src/data/clients/drivers.ts:195-199`): `status: 'suspended'`. No trip, no subscription,
no payout, no escrow hold is touched or flagged.

Ahmed Salem is the assigned captain on **SUB-1041, SUB-1075, SUB-3101, SUB-3131,
SUB-3137, SUB-2000, SUB-2003, SUB-2006, SUB-2009** and more. Suspend him and every one of
those subscriptions still names him, on the Subscriptions index, with no warning.

`Operations › Subscriptions` has a `Change captain` action and a `ChangeDriverModal`. It is
**disabled in place**, and the file says why
(`src/screens/operations/subscriptions/ChangeDriverModal.tsx:36-44`):

> `clients/subscriptions.ts` has no reassign operation. It has `listSubscriptions`,
> `getSubscription`, `freezeSubscription` and `cancelSubscription` and nothing else.

**You cannot reassign a subscription's captain anywhere in this product.** That is the
single largest hole in the operational model of a subscription ride-hailing business.

**Step 3 — telling the riders — has no product at all.** Search the whole tree: there is no
"message this rider", "notify these riders", "contact this captain" from any record. What
exists is:

- `Admin › Communications › Send push broadcast` — audience-segment only (`PushComposerModal`
  takes an `audienceId` from a fixed list, never a recipient list);
- `Admin › Communications` inbox/outbox — a delivery **log**, with `Resend` enabled only on
  failures, disabled everywhere else with *"This message did not fail, so there is nothing
  to send again."*;
- `Support › Contact Centre` — **inbound only**. Every conversation is one someone else
  started; there is no compose. `clients/conversations.ts` has `reply`, `claim`, `transfer`,
  `close`, `reopen` — and no `createConversation`.

So the answer to *"the riders need telling"* is: an operator opens WhatsApp on their phone.

---

### C-3 — Captain disputes a deduction → Support overturns it → the money must move

**Where it breaks: at the handover between Support and Finance, and money is on the line.**

`Support › Fairness › Suspension appeals` carries ten cases of kind *"Disputing a
deduction"*. One of them (`src/data/fixtures/fairness.ts:403,410`) reads:

> *"DED-01 charges me for a late pickup on TRP-7742. The rider changed the destination
> twice while I was waiting and the app never re-timed the leg."*
>
> Resolution note: *"…the lateness is not attributable to the captain; **DED-01 is to be
> waived** and the on-time percentage recomputed for the period."*

Meanwhile `Financials › Payouts › Deductions` shows:

> `DED-01` · Late pickup · Khalid Mansour · TRP-7742 · **15.00 SAR** · **Pending** ·
> `Apply` `Waive`

Two things are wrong here at once:

1. **`decideFairnessCase` does not touch the deduction.**
   `src/data/clients/fairness.ts:274-291`: overturning sets `reinstatedAt` for a
   suspension-appeal and `averageAdjusted` for a rating-dispute. For a **deduction dispute
   it sets neither** — it records the outcome and stops. The client's own docstring quotes
   the legacy note *"A decision has to actually DO something, or an appeals process is
   theatre"*, and for this one kind it is theatre.
2. **The link is a string inside a paragraph.** `FairnessCase` has no `deductionId` field.
   `DED-01` appears only in free-text evidence. Nothing on the Deductions row says a
   fairness case has ruled on it; nothing on the fairness case links to the money.

So the finance operator opens Deductions, sees DED-01 `Pending`, and applies it — charging a
captain 15.00 SAR that Support decided he does not owe. Neither operator can see the other's
conclusion, and the Activity Log that would have caught it is empty (F-6).

---

### C-4 — Subscription cancelled mid-plan → escrow held against undelivered trips → settle it

**Where it breaks: the only control is refused by a rule that can never be satisfied.**

`Financials › Payouts › Escrow`:

> `ESC-0987` · **Subscription cancelled mid-plan** · Youssef Nouri · Bandar Al-Harbi ·
> **69.20 SAR** · **2/5 trips delivered** · Held ·
> `Release` — *"Release when every plan trip is delivered."*

The subscription is cancelled. Trips 3, 4 and 5 will never be delivered. The refusal
sentence describes a condition that cannot occur, so the hold is permanent. There is no
`Partial release`, no `Refund to rider`, no `Forfeit`, no escalation. `clients/payouts.ts`
offers release and nothing else.

`SUB-0987` on `Operations › Subscriptions` shows `Weekly Comfort · 2 of 5 · Cancelled ·
122.50 SAR` and does not mention the 69.20 sitting in escrow. `Financials › Overview` counts
it in `Escrow held 537.20 SAR` and `Escrow ready to release 329.60 SAR` — so 207.60 SAR is
held-and-not-releasable, and no screen says which holds those are or why.

The one product decision that resolves this — *what happens to escrow when a plan is
cancelled at trip 2 of 5* — is a **question the console does not ask anyone**.

---

### C-5 — Ledger reconciliation break → find the captain → decide

**Where it breaks: step 2, by three sub-tabs.**

`Financials › Ledger › Reconciliation`:

| Comparison | Operational | Ledger | Difference |
|---|---:|---:|---:|
| Captain cash receivable | 427.30 | 422.90 | **4.40** |

A real break, correctly surfaced. Now find it. Nothing on this row is clickable, there is no
drill-through and no "show the postings". The operator goes to
`Financials › Cash › Captain debt ledger` and reads down five rows until they find:

> Hassan Al-Ghamdi · **In credit** · **−4.40** · cap 300.00 · 0 open reports

That is the whole break, and it took a human scan to locate. The Payouts row for Hassan
(`30.40 payable, −4.40 debt, 34.80 net, Paid`) is a third place the same 4.40 appears, and
none of the three names the other two.

---

## 3. The top ten time sinks, ranked by how often an operator hits them

Ranked by hits-per-day for a four-person team, not by severity.

### 1. Every filter you build is destroyed the moment you leave the screen
**Hit: dozens of times a day, by everyone.**
Filters live only in the URL. `ui.lastView` persists the *tab*; `UI_STATE_KEYS`
(`src/lib/persistence.ts:381-403`) persists language, column pins, column visibility,
density, page size, palette recents and last view — **not filters**.

Verified: `/operations/trips?status=late` → click `People` in the nav → click `Trips` →
`/operations/trips`, unfiltered. A finance operator investigating five captains rebuilds
the filter five times. **There are no saved views** anywhere in the product — the tab strips
are product-defined and fixed.

### 2. Three money columns export as empty cells
**Hit: every time anyone exports.**
Measured, with the file's own header block as evidence:

| Export | Header line |
|---|---|
| `Operations › Trips` | `"omitted_column","fareHalalas (money column declares no csv accessor)"` |
| `Operations › People` | `"omitted_column","earned (money column declares no csv accessor)"` |
| `Operations › Subscriptions` | `"omitted_column","paidHalalas (money column declares no csv accessor)"` |
| `Operations › Requests` | `"empty_column","sla …"` and `"empty_column","owner …"` |
| `Financials › Cash` | `"empty_column","owner …"` |

The Trips CSV — the file a finance person pulls to reconcile a month's fares — **has no
fares in it.** The header is honest about it, which is why this is a fifteen-minute fix and
not a redesign; it is ranked #2 because the operator does not read CSV headers, they read
column F.

### 3. Export gives you the page, not the query
**Hit: every export of a list longer than 25.**
`DataTable` uses infinite scroll and `tableCsvText` writes `view.rows` — what is loaded.
Measured on Trips with no scrolling: `"rows","25"` against `"total_matching","137"`. Payouts
25/51, Wallets 25/55, People 25/57, Subscriptions 25/70. Two operators exporting the same
list on the same day get different files depending on how far they scrolled.

### 4. Nothing in a 360° profile is clickable
**Hit: every deep review, several times per review.**
The profile drawer/page is nine sections — Identity, Trips, Compliance, Commitment, Wallet,
Payments, Fairness, Movement, Device — and it is the console's cross-referencing tool. Every
related record in it renders as a plain `<li>`: `src/components/profile/fields.tsx:165-177`
has no `href`, no `onClick`, no navigation of any kind. Ahmed Salem's profile lists
`TRP-8001`, `TRP-9005`, `TRP-7741` and *"Showing 6 of 19"* — with no way to open one and no
way to see the other 13. The operator copies the id and goes hunting.

The whole profile is also **read-only**: no Suspend, no Adjust wallet, no Contact, no
anything. `EntityPageScreen.tsx` declares exactly one action in the file — the error state's
`Try again`.

### 5. ⌘K cannot find half the record types
**Hit: several times a day, and always at the worst moment — someone forwarded you an id.**
Measured in the running palette:

| Typed | Result |
|---|---|
| `TRP-9102` | resolves |
| `DSP-113` | **"No matches for DSP-113."** |
| `CASH-0001` | **"No matches for CASH-0001."** |
| `DED-01` | **"No matches for DED-01."** |

`ProfileEntityType` (`src/data/types/profile.ts:19-31`) has eleven members. Not among them:
dispute, cash report, deduction, escrow hold, safety incident, fairness case, ride request,
assurance leg, work item, zone, conversation. An operator holding `DSP-113` from an email
goes to Support › Disputes and reads 28 rows.

### 6. Only 6 of 34 sub-tabs have a shareable link to a record
Detail routes exist for: corporate account, applicant, ticket, conversation, saved report,
plan editor. **Nothing else.** No trip page, no subscription page, no dispute page, no
safety-incident page, no fairness-case page, no payout page, no zone page. You cannot paste
a colleague a link to the SOS incident or to DSP-113. `docs/01-modules/13b` records this as
a legacy limitation; it has been carried forward rather than fixed.

### 7. The Customer Support workspace has zero bulk actions
**Hit: every triage session.**
Measured across every index screen:

| Has a bulk bar | Bulk actions offered |
|---|---|
| `Operations › My Work` | Claim |
| `Operations › Requests` | Claim |
| `Operations › Trip Assurance` | Claim |
| `Operations › People` | Suspend, Reinstate |
| `Operations › Trips` | Flag, Remove flag |
| `Financials › Payouts` | Pay |
| `Financials › Cash` | Claim |

| No bulk bar at all |
|---|
| `Support › Tickets`, `Support › Disputes`, `Support › Safety`, `Support › Fairness`, `Support › Contact Centre`, `Operations › Subscriptions`, `Operations › Corporate`, `Financials › Rider Wallets`, `Management › Zones` |

Confirmed in source: `grep bulkActions src/screens/support/` returns **nothing**. Twenty-eight
disputes, all showing overdue, claimed one row at a time. Meanwhile the structurally
identical Operations queues have bulk Claim. There is no reason for the asymmetry other than
that nobody wired it.

### 8. Every counted number on a metric board is a dead end for its detail
The tiles *are* anchors and do drill through — credit where due. But the numbers that matter
most do not: `Operations › Overview` publishes `50 Captains available now`,
`20 Unclaimed work`, `13 Work items past their SLA`, `4 Legs without a backup captain` and
`5d 0h Oldest item waiting`. The manager who wants the 5d 0h item cannot click the number
that names it; they go to My Work and re-sort. And **three of the four banner CTAs on those
boards do not work at all** (F-1).

### 9. There is no "recently viewed record" and no way back to what you were just doing
The palette's `resume` block holds **sub-tab ids only** — the last three *destinations*
(`src/commands/recents.ts:76,95-105`). Not records. So "the captain I was looking at ten
minutes ago" is a re-search every time, and returning to a sub-tab returns you to it
unfiltered (#1).

### 10. Two different numbers for the same thing, in view simultaneously
The nav rail reads `My Work 22`; the top bar chip reads `Mine 2`; the page banner reads
`13 items you can see are past their deadline`; the `Mine` tab shows `2 items`, neither
overdue. Four numbers, one queue, one screen. An operator has to learn which is which rather
than read it. (And clicking the banner's button on the `Mine` tab empties the table — F-7.)

---

## 4. Defects found while walking, with reproductions

### F-1 — The critical banner's only action cannot be clicked. Three landing screens.
**Severity: high. This is the first thing three of five roles see each morning.**

Reproduction (6/6 failures across three routes, two attempts each):

1. Open `/operations/overview`. Banner: *"2 captains have lapsed documents and cannot be
   dispatched."* Button: `Open compliance`.
2. Hover it. Click it. **Nothing happens. The URL does not change.**

Same on `/support/overview` (`Open Safety & Incidents`) and `/admin/overview` (`Open Data`).
`/financials/overview` is fine because it is a different screen component.

Instrumented: `mousedown` fires, `mouseup` fires, **`click` is never dispatched anywhere in
the document.** At `mouseup` the button node captured before the interaction reports
`isConnected === false` — the node under the pointer is destroyed between press and release,
so the browser has no common target to fire `click` on. A programmatic `element.click()`
navigates correctly, which proves the handler and the route are right.

Cause, with high confidence: `BoardContent` is declared **inside** `MetricBoardScreen`
(`src/screens/metrics/MetricBoardScreen.tsx:301`). React treats a component declared in a
render body as a new component type on every render and remounts its entire subtree. The
tiles survive because they are `<a href>` anchors; the one `<button>` on the page does not.

`src/screens/metrics/board.test.ts` unit-tests `selectNotice` only. **No test clicks the
banner.**

### F-2 — Support › Disputes runs on a different clock from the rest of the product
**Severity: high — it makes 28 rows unreadable and the column untriageable.**

Every dispute reads `overdue 67d`–`68d`. The fixtures put the verdict deadlines within 48
hours of the dataset instant: `dueAt: offsetFromNow({ hours: DISPUTE_SLA_HOURS - 4 })` with
`DISPUTE_SLA_HOURS = 48` (`src/data/fixtures/disputes.ts:73,92`), i.e. 27 June 2026.

The rest of the product pins to the fixture clock via `useNowIso()`
(`src/screens/queues/hooks.ts:36-39`):

```ts
const live = useNow(60, DATA_SOURCE !== 'mock')
return DATA_SOURCE === 'mock' ? EYVAR_NOW : live
```

**`DisputesScreen.tsx:94` calls `useNow(15)` directly** — the wall clock. Same for
`TicketsScreen.tsx:49` and `TicketDetailScreen.tsx:95`.

Consequence on screen right now: `Support › Safety` says `overdue 12m`, `Operations ›
Assurance` says `overdue 12h 14m`, and `Support › Disputes` says `overdue 67d 4h` — for a
dataset whose own "now" is 25 June 09:14. Every dispute is equally, absurdly late, so the
sort that matters most has no signal in it. A support lead cannot triage 28 claims.

### F-3 — `Tickets › By reason code` is a no-op alias for "all"
`src/data/clients/tickets.ts:135`: `'by-reason-code': () => true`. The tab renders the same
ungrouped table as every other tab, sorted by `Opened`. It promises the module's headline
analysis and delivers a list. See §1.3 Gap ⑤.

### F-4 — The Safety queue hides the captain it holds
`SafetyIncident` carries `driverId` and `driverName` (`src/data/types/safety.ts:104-105`).
`SafetyScreen.tsx` declares columns `incident, severity, status, sla, owner, protocol` and
hidden `id, type, opened`. **No captain column, and none addable via the column picker.**
Critical SOS triage therefore starts with a lookup on another screen. See chain C-1.

### F-5 — TKT-505's record link points at the wrong person
`src/data/fixtures/tickets.ts:234-238`:

```
id: 'TKT-505',
subject: 'Payout run refused the captain bank details on file',
entityId: 'RDR-2031', entityName: 'Tariq Al-Saud', entityType: 'rider',
```

The ticket is about **a captain's** refused payout. The only refused payout in the dataset is
`Youssef Nouri` (`Returned by the bank` / *"No bank account on file"*) on
`Financials › Payouts`. The agent who claims TKT-505 and opens the linked profile lands on a
rider who has nothing to do with it, and the captain who does is unreachable from the ticket.

### F-6 — The Activity Log is empty, so no cross-role handover is auditable
`Admin › Activity`: *"The log is append-only and starts empty. The first payout, suspension
or settings change writes the first line."* Nothing in the session writes to it.

Read against C-3 this is not a fixture nicety: when Finance applies a deduction that Support
overturned, the log is where you would find out. `docs/01-modules/16k-audit-log.md` §1
specifies actor, human summary, **before/after diff and a link to the affected record**.
None of that is reachable today.

### F-7 — The past-deadline banner counts one scope and filters another
`Operations › My Work`, default `Mine` tab, `2 items`, neither overdue. Banner reads
*"13 items you can see are past their deadline"* with one button, `Show only past deadline`.
Clicking it produces
`?filter=routedToMyRole:eq:true&filter=breached:eq:true` and the table renders
**"No item matches this search."**

The count is taken at "everything you can see"; the button applies the breach filter on top
of the current tab's routing filter. The one call to action on the screen leads to an empty
table. Same pattern is present on Requests, Assurance, Safety, Fairness and Contact Centre —
those happen to have overdue items in the default view, so it does not bite there yet.

### F-8 — The overview boards mix comparison windows without saying so
`Management › Overview` reads, in one grid:

- `11% Contribution margin · −15.4% down · **vs 1 May – 25 May**`
- `8,075.70 SAR Gross revenue · +57% up · **vs 27 May – 10 Jun**`
- `91% On-time pickups · −4.2% down · **vs 95% target**`

Three different comparison bases in one row of tiles, distinguished only by small caption
text. Alongside them: `Revenue per active captain +1,171.2%` and `Revenue per active
subscription +435.9%` — deltas that cannot be true of a real business and carry no
explanation. An owner reading this board left-to-right is comparing incomparable things.

### F-9 — Corporate invoicing is visible and inert
`Operations › Corporate` flags `Invoice overdue` on multiple accounts (CORP-001 due 1 Jul,
CORP-128 due 2 Jul, CORP-142 due 16 Jul). The detail page's control says
*"Generate invoice — Invoice generation is not connected yet. Nothing would be sent."*
`clients/corporateAccounts.ts` has `create`, `updateUsagePolicy`, `addEmployee` and no
billing operation at all. CORP-001's `Monthly spend cap` and `Approval required above` are
blank. The corporate operator can see an overdue receivable and do nothing about it.

### F-10 — The Report Builder cannot answer a finance or support question
Seventeen measures exist (`src/data/fixtures/measures.ts`):

```
captains.registered  riders.registered  subscriptions.active  captains.joined
riders.joined  subscriptions.started  subscriptions.cancelled  trips.completed
trips.quickRides  trips.fareCollected  revenue.total  revenue.quickRide
revenue.subscription  requests.timeToAssign  riders.activated  financials.arpa
trips.cancellationRate
```

**None** covers payouts, cash debt, escrow, deductions, refunds, VAT, disputes, tickets, SLA
attainment, safety incidents, fairness outcomes, corporate spend or compliance. The console's
answer to "the screen does not have my number" therefore works for growth and revenue and
does not exist for the two teams that need it most.

### F-11 — Minor: the zone priority badge contradicts the column beside it
`Management › Zones` lists `Al Malaz · 1.3× · Watch` above `KAFD / Olaya · 1.8× · Healthy`.
Faithful to the legacy rule (`src/data/clients/zones.ts:121-128` — the failure-rate arm
promotes a low-ratio zone at ≥25%), and the failure-rate column does carry the reason (25%
vs 18%). But the map is shaded by demand:supply and the badge is driven by failure rate, so
the two carriers disagree at a glance. Worth a caption naming which number set the badge.

---

## 5. Verdict

**Would this console save a team time?** For four kinds of work, decisively yes. For the
rest, it will cost them time, and the cost is concentrated in exactly the places the owner
asked about — the follow-on.

**What it does better than what it replaces.** The work-queue layer is real: one deadline
contract across five queues, claim and release with an owner chip, bulk claim, a `My Work`
that routes by role without hiding anything. The refusal copy is the best-executed idea in
the product — an operator is never left guessing why a button is dead. The double-entry
model is genuinely modelled, refused postings are kept, and the reconciliation tab surfaces
a real 4.40 SAR break rather than papering it. Wallet adjustment has a role-derived ceiling
and a mandatory reason code. Exports carry their own provenance. Four of the five
Trip Assurance decisions and all of the Contact Centre are complete work.

**Where it will cost them.** The product is 34 screens and almost no edges. Concretely:

- **A suspension does nothing downstream.** Not to the captain's live trips (no reassignment
  surface exists), not to their subscriptions (**no reassign operation exists at all**), not
  to their payout, not to their riders (**there is no way to message one named person
  anywhere in this console**). Chain C-2 is not degraded — it is absent.
- **The two money decisions taken every week need two screens each, and the second screen
  changes the answer.** Payout vs cash reconciliation; deduction vs fairness ruling. In the
  deduction case the two screens can produce contradictory outcomes and the audit log that
  would catch it is empty.
- **A critical SOS starts with a three-screen lookup** because the queue hides the captain's
  name it already holds, and ends without the one action the protocol implies.
- **The support workspace has no bulk actions, no detail routes, no working SLA clock and no
  reason-code analysis.** Four of the six things a support lead does before lunch are
  hand-work.
- **Three of five roles land on a screen whose only call to action does not respond to a
  mouse.**

**The shape of the fix, and why it is smaller than the list looks.** Almost every gap above
is a *join that was never made between two things that both already exist*:

| Missing join | Both halves already exist |
|---|---|
| Captain on the Safety row | `SafetyIncident.driverName` is populated |
| Open-reports / cap on the Payouts row | Both are columns on `Cash › Captain debt ledger` |
| Deduction ↔ fairness case | Fairness names `DED-01` — in prose, not a field |
| Reconciliation break → the captain | `−4.40` is one row away on another sub-tab |
| Clickable ids in the 360° profile | The ids are rendered; they are `<li>`, not links |
| ⌘K for disputes/cash/deductions | The query shapes are already `searchable` on `id` |
| Bulk claim in Support | Five Operations queues share the contract already |
| Money in the CSV | One `csv:` accessor per money column |
| A working banner CTA | Move one nested component out of a render body |

Two things are genuinely absent rather than unjoined and need a product decision before they
need engineering:

1. **`reassignSubscriptionDriver`** — the signature is already written down in
   `ChangeDriverModal.tsx:44-48` waiting for someone to say yes.
2. **What happens to escrow when a plan is cancelled mid-delivery** (C-4). Today 69.20 SAR
   sits behind a refusal sentence describing a condition that can never occur, and nobody in
   the console can decide it.

**Plain answer to the owner's question.** No, this is not yet all the data and decisions you
need for a day. The daily loop is about 70% covered and the follow-on chains are about 20%
covered. But the shortfall is not missing product — it is **eleven joins, one component
move, one clock, one client method and one escrow policy.** A team that closed those would
have a console that saves them real time. A team that ships this as it stands will keep a
spreadsheet open next to it, and the spreadsheet is where the errors will come from.
