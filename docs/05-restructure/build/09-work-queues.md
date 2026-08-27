# 09 — The five wave-2 work queues

> Owner: frontend-engineer. Built from `specs/02-work-queues.md` (AC-200 – AC-344),
> `build/05-work-queues-and-metrics.md`, `design/04-index-screen-redesign.md`,
> `design/07-rulings-r4.md` **R4-10**, `DECISIONS.md` **D8 · D11 · D12**.
>
> Consumers: **qa-engineer** (§6 is the AC ledger and §7 the reproduction paths),
> **visual-qa-engineer** (§5 has the captures and §8 the one blocking visual defect),
> **mock-data-engineer** (§9), **product-designer** (§10), **utilities-engineer** (§11),
> **product-owner** (§12).

---

## 0. Status

```
$ npx tsc -b --noEmit          clean
$ npx vitest run               48 files, 1316 passed, 0 failed
$ npx vite build               clean
$ /token-audit  (my files)     clean — 0 palette classes, 0 arbitrary values,
                               0 raw colours, 0 physical directions, 0 div-onClick,
                               0 hover-only reveals, 0 killed outlines
$ rg dist/assets/*.css         0 palette rules, 0 physical-direction rules
```

**Against the stated 1028 / 0 baseline: 0 failures, and the count moved for reasons that
are not mine.** The baseline I measured at the start of this task was **1028 passed / 42
files**; it is now **1316 / 48**. I wrote no tests. The delta is other agents landing work
in the same tree concurrently — `src/screens/metrics/*`, `src/data/fixtures/riders.ts`,
`src/lib/i18n/translate.ts`, `src/components/ui/{field,input}.tsx` and two new build docs
all changed under me while I worked. **What matters is the failure count, and it is
zero.**

The width contract is verified empirically rather than asserted, because
`table/columnBudget.test.ts` covers People's four factories and nobody else's (§9.4):

```
                                        EN               AR
/operations/requests                    910/910          870/870
/operations/assurance  (×3 views)       910/910          870/870
/operations/my-work                     910/910          870/870
/support/safety                         910/910          870/870
/support/fairness      (×3 views)       910/910          870/870
```

`scrollWidth === clientWidth` on every view in both directions. No table overflows.

---

## 1. What landed

| Sub-tab | Route | Screen | Views |
|---|---|---|---|
| Operations › **Requests** | `/operations/requests` | `screens/operations/requests/` | all · instant · subscription · **pending (default)** · assigned · expired |
| Operations › **Trip Assurance** | `/operations/assurance` | `screens/operations/assurance/` | **departing-24h (default)** · no-backup-captain · awaiting-confirmation · absences |
| Operations › **My Work** | `/operations/my-work` | `screens/operations/my-work/` | mine · unassigned · everything — **default resolved per session (Q-61)** |
| Support › **Safety & Incidents** | `/support/safety` | `screens/support/safety/` | **open (default)** · critical-sos · closed |
| Support › **Captain Fairness** | `/support/fairness` | `screens/support/fairness/` | **suspension-appeals (default)** · rating-disputes · rider-reports · captain-economics |

**Plus one shared directory, `src/screens/queues/`** — §4's contract as code. Five
sub-tabs inherit one ownership model, one clock rule, one breach rule, one disposition
grammar and three empties; five copies of that is five chances for one queue to disagree
with the contract. `PHASE-PLAN.md` gives a sub-tab one directory each, and it does: the
five screen directories are per-sub-tab as the plan requires, and this sixth one is the
contract they consume.

```
src/screens/queues/
  queue.tsx        queueClock · SlaCell · SlaCountdown · OwnerChip · DecisionBadge · SeverityBadge
  cells.tsx        Cell · MutedCell · NumCell · DateCell · Absent · Identity · SubjectIdentity
  QueuePage.tsx    useQueueViews · QueuePage · BreachBanner · QueueTable · useQueueMeta
  ConfirmDialog.tsx  one dialog, nine confirmed acts
  hooks.ts         useNowIso · useRowOverrides · useRowActions
  copy.ts          QUEUE_SHARED_EN — §4's own strings
```

Registered in `routes.tsx` (mine for this task) and merged into `src/i18n/dictionaries.ts`
as **six imports and six spreads** — one per screen plus the shared contract, which is the
People precedent applied five more times.

---

## 2. F-3, closed — `DataTable` can express a cleared queue

**It had not landed.** `DataTable` still derived the empty kind from `table.isFiltered`
alone, so an unfiltered empty queue rendered the illustrated first-run state — *"telling
an operator who has just cleared their queue that they have never had one"*. **AC-234
could not pass.** It was the first job and it is done.

**Three changes, all in `src/components/`:**

1. `EmptyState` gains a third kind. `EmptyKind` is `'first-run' | 'no-match' | 'cleared'`,
   and `ClearedProps` has **no `actions` field and no `illustration` field at all** — the
   type forbids both rather than a review catching them, because the whole defect Q-36
   names is a state that offers the operator something to create. Geometry is
   `04-index-screen-redesign.md` §10.5: 180px block, heading 13/500, one line 13/400, no
   illustration, no action.

2. `DataTable` gains `emptyKind?: 'first-run' | 'cleared'` and `cleared?: {heading, body}`.
   **The `no-match` branch is unchanged and still mechanical** — a filter is narrowing, so
   the answer is not a judgement. The *other* branch is the call site's, and it has to be:
   an unfiltered zero is `first-run` on an index and `cleared` on a queue, and **on Safety
   & Incidents it is both, on different days** (Q-37), so it is not derivable from `mode`
   either. `emptyKind` defaults to `'first-run'`, so every pre-existing caller is
   byte-identical.

3. **`card={false}` on all three empty branches inside `DataTable`.** Not asked for, and
   disclosed rather than buried: under **D-18 the table is the bordered object**, so a
   carded state inside that band drew a second border and rendered on screen as a stray
   horizontal rule under the sentence. `EmptyState`'s own doc names this as the opt-out
   case. **This changes wave 1's empty states too**, because `DataTable` is where all of
   them render. If that is unwanted, reverting is three props.

`cleared` copy is **per view**, not per queue (Q-36's *"one sentence naming the scope that
is clear"*): `Every request has a captain or an answer.` on Requests › Pending,
`No captain has missed a committed leg.` on Assurance › Absences, `Every incident has been
worked and closed.` on Safety › Open, and so on — 17 sentences across the five.

---

## 3. The three decisions §4 forced, and how each was resolved

### 3.1 `queueClock` — breach is the stamp, and one queue proves why

`types/workQueue.ts` is unambiguous: *"breach is a stamp, never `slaDueAt < now`"*. Every
queue in this wave routes both R5a's marker and the countdown through one function,
`queueClock(input, now, {terminal})`, which returns `{clock, breached,
deadlinePassedUnbroken}`.

**The third value exists because of four real rows.** `UST-1`, `UST-2`, `UST-5` and
`UST-7` are past their `slaDueAt` (21:00 the evening before) and carry
`slaBreachedAt: null`. That is not a fixture error — `UST-5` was auto-handed-off, so the
system kept the promise, and `UST-3` vs `UST-5` are documented as *"same cut-off, same
null acknowledgement, opposite breach states"*. Driving the pill from the live clock would
print `overdue 12h` on a row the data says was never breached, and then **either the marker
contradicts the pill (AC-220) or the pill contradicts the banner (AC-219)**.

So a passed-but-unbroken deadline renders **as a date, not a countdown**: `Due 24 Jun
21:00`, neutral, no track, no marker. One clock readout per row (AC-211), true, and it
agrees with everything else on screen. It is also what §6 of the data build asked for on
this queue: *"the screen can show 'due 21:00' and cannot draw a progress track"* (**Q8-b**).

I checked all four queues before choosing this. Requests, Safety and Fairness have **zero**
open rows where the stamp and the deadline disagree; Assurance has four. Script:
`scratch/breachcheck.ts`.

### 3.2 The breach scope is a **filter**, not a view

R5a (a)'s *"one control that filters the list to those items"* is implemented as
`table.setFilter({field: 'breached', op: 'eq', value: true})` on all five queues, declared
through `extraFilters` so it has a label.

Three acceptance criteria follow from that choice and none of them would hold if it were a
view: it renders as a chip in the query strip with its own ✕, so it is **clearable from
inside the queue without a reload** (AC-235, AC-325); it makes `isFiltered` true, so the
resulting zero renders the no-match sentence and **not** the cleared-queue one (AC-234);
and its label reads **`Past deadline`, not `Breached`**, because the client's `breached`
predicate is the stamp on every row including decided ones — **Q-18 requires the wider
audit set to say so in its own label**.

The banner's own count is narrower than the chip: it is `breached ∧ open`, so a case
decided after its deadline is `late-decided`, its badge says `Late`, and it is not a
backlog (AC-222).

### 3.3 One number for `Owner`, measured rather than estimated

The owner chip's widest state is not `Unclaimed` — it is **`Yours · 16m` beside
`Release`**: ~84 + 64 + a 6px gap + the cell's 24 = **178**. It was declared 140 (clipped
to `Unclaimec`), then 160 (clipped to `16n`), and is now **176 on all five queues**, so an
operator moving between them finds the same control in the same place.

Two related fixes in `OwnerChip`, both of which People's copy still has:

- `badgeVariants`' base carries **`shrink-0`** (`ui/badge.tsx:44`), so a `truncate` passed
  in through `className` can never fire — the chip refuses to shrink and **the button
  yields instead**, rendering `Yousef Al-Balawi` beside `Tak`. The chip now carries
  `shrink`; the buttons carry `shrink-0`. *The chip gives way, not the verb.*
- The badge base is also **`justify-center`**, so a clipped label loses characters from
  **both** ends: `Yousef Al-Balawi` rendered as `ef Al-B`, a name that is not a name. The
  chip now carries `justify-start`.

Both are live in `src/screens/operations/people/queue.tsx` too. Not fixed there — not my
file this pass. **Named for whoever takes People next.**

---

## 4. Per screen

### 4.1 Operations › Requests — `/operations/requests`

Two item types on one queue and **the row is not one row**: `Type` is a visible column at
the front of the table, not a filter you have to go looking for (AC-240). `Assign` confirms
with a different sentence per channel, because this is the only queue where money moves on
disposition; the subscription sentence says *"this cannot be undone from here"* rather than
offering an undo it cannot honour. A request in the `offered` state offers **no assign
action** and states that the offer is with the captain (AC-246). A decided row converts in
place naming outcome, actor and time, with a `Late` chip and **no marker** when it was
decided past its deadline.

Columns `104 + 104 + 136 + 176 + 176 = 696` + identity `minWidth: 176` = **864**.
Default view **`pending`** — Q-32, set in the screen because the route table still marks
`all` default (§9.1).

### 4.2 Operations › Trip Assurance — `/operations/assurance`

The widest queue, and M6's mitigation binds: **views, not stacked cards**. Four views, four
column sets, one table, no card ever stacked under another. The **middle column changes
with the view** — `Reason` on Departing, `Backup captain` on No-backup, `Confirmation` on
Awaiting — which is what makes seven item types fit one 870px budget.

- **Q-58 / AC-263** — the readiness ladder is a **reason column**, not a severity and not
  the clock. `On track` is the column's resting value and renders as plain text (D-21); a
  departure from rest is a `warning` badge. **No red row background anywhere** (AC-275).
- **AC-268** — three acknowledgement weights, three words, three tones. `Assumed — not
  confirmed` is `warning`, because it is the one that leaves risk on the table.
- **AC-265** — a registered-but-ineligible backup states the reason it would be skipped, by
  name.
- **Absences is a different resource and a different component**: no claim, no clock, no
  owner chip and no breach banner, because `AbsenceEvent` is a recorded fact and not a task
  (Q-60). It is **empty by default and that is the healthy state**.

### 4.3 Operations › My Work — `/operations/my-work`

**A projection, and it sets no target of its own** — there is no SLA constant anywhere in
the file. Every row states its source queue in words (AC-280). No row offers a decision;
the one row action is `Open`, routing to `item.route` — a **path**, which is the
replacement for legacy's `new Function()` over `action:"go('safety',null)"` (**F-26**).

- **Q-61** — the default view is resolved from one `view=mine, pageSize:1` probe: `Mine`
  when the operator holds a claim, `Unassigned` otherwise (AC-282, AC-283).
- **Q-62 / AC-286** — role routing is an **initial filter** on `routedToMyRole`, so it is a
  chip with its own ✕, findable without opening a menu, and reversible in place. §7.5's
  `routed-to-zero` is the no-match branch's message when routing is the only thing
  narrowing, and it offers to switch routing off (AC-287).
- **AC-288** — a claim made here is sent to the **source queue's own client**, keyed off
  `item.queue`. There is one claim and one owner everywhere because it *is* the same claim.
  Four of the nine queues have no wave-2 client (`ticket`, `dispute`, `erasure` are later
  waves; `absence` has no claim at all) and their rows render **with their data and a
  disabled control naming the queue** — §7.5's `source-queue-unavailable` shape.

### 4.4 Support › Safety & Incidents — `/support/safety`

**Two clocks, one running, and the status badge says which** (Q-11, AC-303). `activeClock`
picks the acknowledge pair (`firstResponse*`) while nobody has answered and the resolve
pair (`sla*`) afterwards; the countdown gains **no new variant**.

**R4-10 is this screen's ruling and it is visible in the capture:** a critical SOS reads
`Critical` (label) + `overdue 12m` (clock) + the 3px leading edge (marker) — three carriers
where legacy had one red badge — and a critical incident *inside* its window carries the
badge and **no marker** (AC-319).

The four protocol steps and `Close` share one cell, because §3's **F-2** asked for a
level-3 detail route and it did not land: a protocol that cannot be worked from the queue
cannot be worked at all. `document` is disabled until the other three are complete, with
its reason (Q-69, AC-315, and Q-72 cannot arise because the gate is at render). `Close` is
disabled while any step is outstanding and **its reason says how many** (AC-308).

**Q-65 / AC-307 needs no code and that is the point:** releasing a claim does not
un-acknowledge, because the status cell reads `firstResponseAt` and the owner cell reads
`claim`, and they are independent. The row goes back to `Acknowledged` with no owner and its
resolve clock still running.

### 4.5 Support › Captain Fairness — `/support/fairness`

**The only queue whose target lives on the row.** `slaTargetMinutes` is
`rcTargets(reasonCode).res` — 1440 or 2880 — so two rows in one view draw different fills
at the same remaining time (AC-213, AC-330).

- **AC-337** — the disputed rating is on the row. Legacy stores it and renders it nowhere.
- **AC-334 / Q-77** — once overturned, the same cell states **which of the two things
  happened**: `2 of 5 · average recomputed` or `2 of 5 · score voided, average unchanged`.
  `averageAdjusted: false` is not a failure; it is the server refusing to un-average a mean
  it cannot.
- **Q-28 / AC-228** — `Upheld` and `Overturned` are both **neutral**. Colouring either would
  answer the question §9.1 exists to leave open.
- **AC-333** — the rationale is required on both, validated in the modal before the
  mutation, and visible on the decided row afterwards.
- **AC-340 / AC-341** — `Captain economics` mounts a **metric board, not a table**: no claim
  control, no countdown, no disposition on any row. Its four honesty statements are stated
  in a card **above** the board, because neither fairness metric carries a `caption` (§10.3).
  It reuses `TabsList variant="segmented"` — D12's primitive, not a second one.

---

## 5. Captures

All at 1280 (the D2 floor) unless stated. `scratch/shots/`.

| State | File |
|---|---|
| Requests — content, breached, banner | `w2-requests-1280.png`, `w2-requests-1440.png` |
| Trip Assurance — departing | `w2-assurance-1280.png` |
| Trip Assurance — no backup captain | `w2-assurance-backup-1280.png` |
| Trip Assurance — awaiting confirmation | `w2-assurance-await-1280.png` |
| My Work — Mine, routing chip | `w2-mywork-1280.png` |
| My Work — Everything, breached-first order | `w2-mywork-all-1280.png` |
| Safety & Incidents — two clocks, protocol | `w2-safety-1280.png` |
| Captain Fairness — suspension appeals | `w2-fairness-1280.png` |
| Captain Fairness — captain economics (P5) | `w2-fairness-econ-1280.png` |
| Captain Fairness — rating disputes | `w2-fairness-ratings-1280.png` |
| **E1 cleared queue (AC-234)** | `w2-cleared-1280.png` |
| Error, card scope, toolbar alive | `w2-error-1280.png` |
| Row error, AC-41 | `w2-flow-rowerror.png` |
| Take-over confirmation, AC-203 | `w2-flow-takeover.png` |
| Rationale required, AC-333 | `w2-flow-rationale.png` |
| Assign confirmation, AC-247 | `w2-flow-assign.png` |
| Claim → owner chip | `w2-flow-claimed.png` |
| **Arabic, all five** | `w2-ar-{requests,assurance,mywork,safety,fairness}-1280.png` |

Probes, all rerunnable: `scratch/w2-shot.mjs` · `w2-rtl.mjs` · `w2-budget.mjs` ·
`w2-bar.mjs` · `w2-flow.mjs` · `w2-a11y.mjs` · `w2-text.mjs` · `breachcheck.ts`.

---

## 6. The acceptance-criteria ledger

**Believed met** — 91 of 126.

§4.12 shared contract: **AC-200 – AC-207**, **AC-209 – AC-214**, **AC-217**, **AC-219 –
AC-223**, **AC-225 – AC-228**, **AC-230 – AC-232**, **AC-234**, **AC-235**.
Requests: **AC-240 – AC-242**, **AC-245** (weaker reading — see below), **AC-246**,
**AC-250**, **AC-251**.
Assurance: **AC-262 – AC-265**, **AC-268**, **AC-272**, **AC-274**, **AC-275**.
My Work: **AC-280 – AC-284**, **AC-286 – AC-290**, **AC-292** (partial shape).
Safety: **AC-303**, **AC-304**, **AC-306**, **AC-307**, **AC-308**, **AC-315 – AC-317**,
**AC-319**, **AC-323 – AC-325**.
Fairness: **AC-330 – AC-334**, **AC-337**, **AC-340 – AC-341**, **AC-343**, **AC-344**.

### 6.1 Met in the weaker of two readings

| AC | What is true | What is not |
|---|---|---|
| **AC-207** | The 30-minute expiry is stated on the queue, on the owner chip's `title`, in all three states. | A `title` is not reliably announced. The honest carrier is a line beside the toolbar and there is no slot for one. |
| **AC-245** | The rider's note renders — legacy stores it and shows it nowhere. | It is `defaultHidden`: §7.3's budget has no room for a 200px free-text column at 1280 and truncating a preference to eight characters is worse than one click. AC-245's *"on the row **or in the row's detail**"* is met by the column; the detail drawer (§11) is unbuilt. |
| **AC-232** | Every control is gated at render, disabled in place, with its reason in `title`. | The reason is a `title`, not visible text. Same carrier problem as AC-207. |
| **AC-292** | Rows from queues with no wave-2 client keep their data and lose their control, naming the queue. | A *runtime* failure of one source queue is not expressible: `listWorkItems` is one endpoint, so the mock cannot fail one contributing queue. |
| **AC-252** | No count on screen reports the unfiltered corpus while a filter is applied — except the nav badge, which AC-236 requires to do exactly that. | The two criteria pull opposite ways; I read AC-236 as the narrower and let the nav badge stand. |

### 6.2 Deferred, with the blocker named

**Not built because the data layer has no path.** Each of these needs a client change, not
a screen change; none was faked.

| AC | Blocker |
|---|---|
| **AC-215** | `formatDuration` has no seconds tier. **Q-13 → utilities-engineer** (§11). A 3-minute instant request 45 s from breach reads `1m left`, not `45s left`. |
| **AC-216** | No Admin › Operational Policy screen exists to change a target from. |
| **AC-218** | The pointer/focus re-sort guard is `useIndexTable`'s, not mine; the mock does not tick, so it cannot be exercised. |
| **AC-224** | Nothing in my files animates (grep is clean). Unverifiable as a *queue-wide* claim without the tick engine. |
| **AC-229**, **AC-236 – AC-239** | Nav counts are `fixtures/navCounts.ts`, static. A decision does not decrement them, no notification fires, and no tick batches. |
| **AC-233** | No re-open endpoint on any queue. |
| **AC-243**, **AC-244**, **AC-247** (amount), **AC-248**, **AC-249** | `RideRequest` has no `hold`, no `estimatedValue`, no `corporateApproval`, no `originallyRequestedAt`, no `searchWindowEndsAt`, no re-open, and no `declined` status. §5.4's field list is much wider than what landed. The confirmation names the money **consequence**; it cannot name the **amount**. |
| **AC-260**, **AC-261** | `departing-24h` filters correctly (F-7 closed by the client), but `AssuranceTrip` has no terminal status, so **F-8's `Departed` conversion has no field behind it**. A departed leg does not leave the view. |
| **AC-266**, **AC-269 – AC-271**, **AC-273** | `Accept exposure`, `Record absence`, the emergency-claim pair and `minutesToPickup`'s provenance are not in the client. Five of §6.4's seven item types are not modelled. |
| **AC-291** | `WorkItem` has no `caseId`. Q-42's sibling link cannot be drawn. |
| **AC-293** | The top bar's `N mine` chip is `src/shell` — not mine. |
| **AC-300 – AC-302** | No create-incident endpoint. §8.3's `type`/`severity`/`source`/`typeLabel` intake does not exist. |
| **AC-305** | **The headline Safety behaviour, and it is one line away.** `claimSafetyIncident` does **not** stamp `firstResponseAt`, so claiming does not acknowledge. Only `setSafetyProtocolStep` stamps it. See §9.1. |
| **AC-309**, **AC-310**, **AC-312** | `closeSafetyIncident(id)` takes no outcome and no closure note; there is no reopen. §8.5's six-outcome set and `closureNote` are not modelled. **I did not add an outcome picker that would be discarded.** |
| **AC-311**, **AC-314**, **AC-326** | See §8.1 — the precautionary suspension is **deliberately withheld**, not merely unbuilt. |
| **AC-313** | `setSafetyProtocolStep` takes no reason, and `SafetyProtocolStep` has no `stepHistory`. Un-completing destroys the original attribution — **F-18 survives**. |
| **AC-318** | **Q-3 / Q-85.** All 34 route rows carry `permission: null`, so no role is denied anything. |
| **AC-320 – AC-322** | Notifications and nav tone are the fixture's. |
| **AC-335**, **AC-336**, **AC-338**, **AC-339** | Q-76's rider-report reversal, Q-78's uphold effect, the second-appeal guard and the incident↔appeal link all need client paths that do not exist. |
| **AC-342** | The overturn rate lives on `support-overview`, not on the fairness board. Out of this route's scope. |

**AC-208** (claim expiry, and *"re-rendering the list does not by itself expire any
claim"*) — the second half is **true and provable**: nothing in these five screens mutates
during a render, which is D-L12's whole point. The first half needs a server timer.

---

## 7. Reproduction paths for QA

```bash
# the cleared queue (AC-234) — the state F-3 blocked
/operations/assurance?view=absences

# first-run vs cleared on one route (AC-324) — the only queue where both are reachable
import { useQuietSafetyQueue } from '@/data/clients'   # → every incident closed → CLEARED
                                                       # (E3 needs an empty corpus; no switch)

# the strike ledger, populated
import { useAbsenceHistory } from '@/data/clients'

# row-scoped failure (AC-41) — every other row stays interactive
/support/fairness?mockFail=fairness.claim
/operations/requests?mockFail=requests.assign
/support/safety?mockFail=safety.step

# card-scoped failure with the toolbar alive
/operations/requests?mockFail=requests.list

# take-over (AC-203/AC-204) — REQ-503 and UST-3 are held by another operator
/operations/assurance      → Take over
/operations/requests       → the row held by Yousef Al-Balawi

# two clocks (AC-303) — INC-014/INC-015 unacknowledged, INC-011/INC-019 no clock
/support/safety

# per-row SLA windows (AC-330) — 1440 vs 2880 in one queue
/support/fairness?view=rating-disputes
```

---

## 8. Findings — mine to report, not to fix

### 8.1 The precautionary suspension is **deliberately withheld**

`precautionarilySuspend` exists in the client and works. **Nothing lifts it.** Q-73 is
explicit — *"it must be liftable"* — and **F-19** is the legacy defect it names: a reason
string beginning `"Precautionary"` against a deletion path that requires `"Expired"`
(`:13312`), so a precautionary suspension is permanent for the life of the session and
closing the incident does not lift it.

**Shipping the apply half alone recreates F-19 in the new app**: the one irreversible
action in the module would be irreversible by accident rather than by design. It is
withheld until `POST /incidents/:id/precautionary-suspension/lift` exists. AC-311, AC-314
and AC-326 go with it. **This is a decision, and it is reversible in about twenty lines the
day the endpoint lands.**

### 8.2 **BLOCKING VISUAL** — the `Sort` control is off the 1280 viewport on three queues

Measured, both directions, at the D2 floor (`scratch/w2-bar.mjs`):

| Route | Tab track | `Sort` right edge, EN | `Sort` edge, AR |
|---|---:|---|---|
| Requests | 478 | 1277 — ok, 3px of margin | **−37 → OFF-SCREEN** |
| Trip Assurance | 582 | **1381 → OFF-SCREEN** | **−141 → OFF-SCREEN** |
| My Work | 269 | ok | ok |
| Safety & Incidents | 247 | ok | ok |
| Captain Fairness | 565 | **1364 → OFF-SCREEN** | **−124 → OFF-SCREEN** |
| People (wave 1) | 375 | ok | ok |

**Cause.** `IndexToolbar`'s view-switcher group is `shrink-0`; the search field shrinks to
`min-w-32` and then the whole row overflows. Its own build note measured the fit against
People's four short labels (375px of track). Wave 2's labels — `Departing next 24 h`,
`Awaiting confirmation`, `Suspension appeals`, `Captain economics` — run 565–582, and
Arabic takes another 40px of content column.

**D12 predicted this in writing:** *"the switcher plus five controls does not fit in 912px
… moving the tabs before the controls move would trade a treatment complaint for a
truncation."* It has now arrived.

**Not fixed, because `src/components/table/IndexToolbar.tsx` is the shell/components
owner's file and this is not the F-3 mandate.** Two candidate fixes, neither mine to pick:

- the structural one D12 names — relocate `Filter` and `Sort` into the query strip;
- the one-line degrade — `shrink-0` → `min-w-0 shrink` on the `Tabs` wrapper plus
  `overflow-x-auto` on the `TabsList`, so the tabs scroll and no control ever leaves the
  viewport.

The view labels themselves are the route table's and the shell dictionary's, so shortening
them is also not mine.

### 8.3 The order defect in the obvious sort key

Every wave-2 client offers `urgency` and documents it as this criterion — *"breached, then
by deadline, undated last"*. On `myWork`, `fairness` and `safety` it computes
`breached ? -1 : dueAt ?? MAX`, so **every breached row ties at `-1`** and the comparator
falls back to array order. Measured on My Work before the fix: `overdue 20h 9m` above
`overdue 1d 16h` above `overdue 2m`. AC-217 asks for *"most overdue at the top"*, and
`urgency` cannot deliver it.

All five queues sort on **`slaDueAt` / `dueAt` ascending** instead, which delivers both
halves and puts `No clock` last with no second pass. **`urgency` is the field a QA test
would reach for first** — see §9.2.

### 8.4 Observations, not defects

- **Banner copy in `dir="rtl"` with the empty `AR` dictionary.** `3 incidents are past
  their deadline.` renders as `.incidents are past their deadline 3` — the trailing period
  is bidi-neutral and moves. This is an artefact of rendering **English** in an RTL
  paragraph and it disappears when `AR` is filled; it affects every banner in the product,
  not these five. `Banner` is not my file.
- **The pager's arrow glyphs** (`'‹ Previous'` / `'Next ›'`) are baked into the string and
  read oddly mirrored. Shell dictionary, pre-existing.
- **Two `<span tabindex="0">` focus guards** appear mid-tab-walk on Fairness. Not in the
  DOM at rest and not authored by me — Radix's portal guards. Recorded so visual-QA does
  not chase it as mine.
- **A `WorkItem`'s title starts lowercase** on Safety-sourced rows (`harassment — Rider
  reports…`) because `clients/myWork.ts` uses the raw type slug. Cosmetic; data layer.

---

## 9. To mock-data-engineer

### 9.1 `claimSafetyIncident` does not acknowledge, and **AC-305 is the queue's headline**

§8.4 Q-64: *"the first claim on an incident **is** its acknowledgement"*, and it is the one
stated exception to Q-3. The client stamps `firstResponseAt` only in
`setSafetyProtocolStep` (`respondingNow = done && row.firstResponseAt === null`). Claiming
leaves it `null`, so the row stays `Unacknowledged` with its acknowledgement clock still
running after somebody has taken it.

I derive the status from `firstResponseAt` rather than from the claim, because deriving it
from the claim would make the screen and the record disagree. **The fix is in
`claimSafetyIncident`**, and it is the same shape as the one already in `setSafetyProtocolStep`.

### 9.2 `urgency` ties every breached row — §8.3 above. Three clients.

### 9.3 Route-table changes from §12 that did not land

None of these were edited — `routeTable.ts` has a single owner. Each is a screen behaviour
I had to compensate for in a screen constant:

- `support-safety` → `patterns: ['P8','P9']`, a `/support/safety/:incidentId` detail route,
  views renamed `open · critical · closed · all`. **The missing detail route is why the
  protocol is worked from the row** (§4.4), and `critical-sos` still names a *type* for a
  *severity* filter.
- `notifications.ts:108` — N7's route still points at `?view=critical-sos`.
- `operations-requests` → `pending` → `needs-decision`, and `all` no longer default.
  **Q-32's default is set in `RequestsScreen`** instead, which puts the same rule in two
  places.
- `operations-assurance` and `support-fairness` → add an `all` view. Without it, `kind` and
  `status` are columns nobody can see across, and §4.4's *"the `Show only breached` view may
  show the wider audit set"* has no home.

### 9.4 The column budget is not asserted for these five

`table/columnBudget.test.ts` imports People's four factories. I have **exported all six
wave-2 factories** — `requestColumns`, `legColumns`, `absenceColumns`, `workColumns`,
`incidentColumns`, `caseColumns` — and their `*Deps` interfaces, so adding them is imports
plus `describe` blocks. `legColumns` and `caseColumns` take the **view id** as their first
argument, because their middle column changes with it.

### 9.5 Two smaller ones

- `Metric.caption` is `null` on both fairness metrics. §9.5's upper-bound caveat belongs on
  `support.fairness.earningsPerEngagedHour`; it is currently a card I render above the
  board.
- `AbsenceEvent.forfeitedHalalas` renders through `Money` with `unit="none"` under a
  `Forfeited (SAR)` header. **F-10 stands**: the confirmation says the earnings are *not
  returned from here*, because `recordAbsence` posts to no wallet.

---

## 10. To product-designer

1. **§10.5's cleared state renders without the header row above it.** The drawing keeps the
   column headers and puts the 180px block beneath them. `DataTable` replaces the whole
   table body — header included — for all three empties, and changing that for one kind
   would make `cleared` structurally unlike `no-match` and `first-run`. Confirm or rule.
2. **The SLA track is a live conflict.** §9.4 of `04-index-screen-redesign.md` **deletes the
   SLA gauge** — *"a fourth, illegible carrier is noise"*. `specs/02-work-queues.md` **Q-15
   and AC-213 test it** (*"full at that row's own `dueAt`"*). I kept it, because the brief
   is *"the People screen is the worked example; match it, do not re-derive it"* and People
   ships it. **One of the two documents has to yield.**
3. **Two carriers are `title`-only and should not be** — the 30-minute claim expiry (AC-207)
   and every disabled control's reason (AC-232). Neither is announced reliably. There is no
   slot in the current page shape for a queue-level help line.
4. **Q-56 checked at its longest.** The owner chip clips the NAME and keeps the verb, with
   the full name in `title`. Confirm that is the right way round in Arabic; `SREQ-006`'s
   44-character rider name and `FC-0004`'s Arabic subject are the fixtures.
5. **D-21 applied to three new columns.** `On track` (Assurance › Reason), `Normal`
   (Severity, on two queues) and the whole `Queue` column (My Work) render as **plain text**
   rather than badges, because each is its column's resting value. Confirm.
6. **The decision triad is still unbuilt.** §7.8's `✓ ✗ View` at 116px is the D8-conformant
   shape for a decision pair and all five queues have one. They ship as two labelled
   `secondary` buttons in a `Decision` column, which is People's precedent and build item 11
   still open. It costs 176px per queue where 116 would do — and that 60px is exactly what
   Safety is short of (§4.4).
7. **F-1 and F-2** are still open §6.4 row edits in
   `_partials/06-eyvar-mapping.md`. `safety` still declares `patterns: ['P9']`.

---

## 11. To utilities-engineer

- **Q-13 / AC-215** — `formatDuration` needs a **seconds tier below `Nm`**, used when the
  total window is under 10 minutes. It affects two rows in the product today: a 3-minute
  instant request and a 5-minute critical acknowledgement. `2m left … 1m left … 0m left` is
  not a countdown a person can act on. The three existing tiers are unchanged.
- **A decimal formatter.** `formatCount` refuses a non-integer by design (*"a count is a
  count"*) and there is nothing else. A rider's `4.8` rating renders through `toFixed(1)` in
  `RequestsScreen`, which is a local answer to a shared question.
- **`assertColumnBudget(columns, innerWidth)`** — `columnBudget.test.ts` says in its own
  header that its `budget()` is a placeholder for this, and there are now **ten** views
  wanting it rather than four.
- **Q-7 / D-L12** — claim expiry still needs a timer that is not a render. Nothing in these
  five screens mutates during a render; the other half is yours.

---

## 12. To product-owner

Nothing below was invented. Each is a number or a rule the screen needed and did not have.

| # | What is blocked | Where |
|---|---|---|
| **Q-84 (= Q4)** | **The most consequential open question in wave 2.** All five queues carry `permission: null`, so every write action is visible to every role — including closing a safety incident and waiving a forfeiture. I gate on the nearest existing key (`live_ops`, `manage_subscriptions`, `approve_drivers`); three of those are guesses. |
| **Q-85 (= Q3)** | AC-318. Safety ships Ops-Manager-gated and Support read-only per Q-51, on a key that is not the real one. |
| **Q8-b** | The confirmation window's *start*. Every `AssuranceTrip` has `slaTargetMinutes: null`, so **no progress track renders on that queue at all**, and four rows read `Due 24 Jun 21:00` instead of a countdown. |
| **Q8-c** | T1's `firstResponseMin: 0`. An unacknowledged SOS is breached the instant it opens. That is what the capture shows, and it is either the promise or a placeholder. |
| **Q8-d** | Safety windows for `harassment` and `other`. `INC-011` and `INC-019` render `No clock`. |
| **Q8-e** | The subscription request window. **The spec says 90 minutes (§4.3, with a 30-minute intervention margin); the data layer ships 120** (`REQUEST_SLA_MINUTES.subscription`, the legacy `SUBREQ_SEARCH_HOURS`). The screen renders what the fixture stamps, so **AC-242's "breaches at 90 minutes" does not hold** — it breaches at 120. Q-12's margin is not modelled anywhere. |
| **D-1** | Whether a fairness rationale is *required*. The mock requires it and so does the modal. One line to relax. |
| **Q-79** | Three confirmations would like to say the captain is notified. **None of them does**, per §11.2's own instruction to remove the promise rather than ship a lie. |
| **Q-82** | The `All` view's scope. Requests' `all` already carries 100+ filler rows. |

---

## 13. Files touched outside my five directories

Disclosed in full, because parallel work makes this the thing that bites.

| File | Change | Why |
|---|---|---|
| `src/components/EmptyState.tsx` | third `kind`, `cleared` | **F-3**, the assigned first job |
| `src/components/DataTable.tsx` | `emptyKind` + `cleared` props; `card={false}` on all three empty branches | F-3; and D-18's double border (§2, item 3) — **this one changes wave 1's appearance** |
| `src/routes.tsx` | five imports, five registry lines | mine for this task |
| `src/i18n/dictionaries.ts` | six imports, six spreads | the People precedent, five more times |

**No test file was edited.** No fixture, no client, no hook, no `src/lib`, no
`src/components/ui/`, no `routeTable.ts`, no `globals.css`, and **no new token**: every
value in these five screens resolves through an existing semantic slot.

---

## 14. Handoff status

**`qa-engineer` and `visual-qa-engineer` were not reachable from this session.** Both
messages are recorded here instead, and `main` has been asked to relay:

- **qa-engineer** wants **§6** (the AC ledger), **§7** (reproduction paths), **§8.3** (do
  not assert order on `urgency` — it ties every breached row), **§9.1** (AC-305 fails
  against the client, not the screen) and **§8.1** (the precautionary suspension is a
  deliberate withholding, so AC-311 / AC-314 / AC-326 are not oversights). No test file was
  edited.
- **visual-qa-engineer** wants **§8.2** (the one blocking visual defect, measured in both
  directions), **§5** (every capture), **§10** items 1 and 2 (the SLA-track conflict and the
  cleared state's header row — both need a designer ruling before these screens can be
  called clean), and **§8.4** (two artefacts that are not mine: the RTL banner period and
  Radix's focus guards).

Both also need **§13** — the four files touched outside my five directories, one of which
changes wave 1's appearance.
