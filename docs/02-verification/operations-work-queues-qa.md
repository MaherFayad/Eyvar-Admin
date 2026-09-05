# Operations work queues — behavioural QA verdict (T8.1)

Base `954df5b` (`integration/mgmt-ops`). Suites run with
`npx vitest run <file> --no-file-parallelism --testTimeout=60000`.

| Suite | Result |
|---|---|
| `src/screens/queues/queueAdapter.test.tsx` | 35 passed |
| `src/screens/operations/requests/requests.test.tsx` | 28 passed, 1 skipped |
| `src/screens/operations/my-work/myWork.test.tsx` | 19 passed, 4 skipped |
| `src/screens/operations/assurance/assurance.test.tsx` | 23 passed |
| `src/screens/operations/subscriptions/subscriptions.test.tsx` | 12 passed |
| **Total** | **117 passed, 5 skipped, 0 failed** |

`npm run typecheck` clean. `npm run test:changed` green over the five files.

---

## 1. Criteria table

### 1.1 Shared adapter — `src/screens/queues/`

| Criterion | Verdict | Test |
|---|---|---|
| AC-10 view is `?view=`, from the route table | Pass | *renders one tab per declared view, in the declared order, with the declared labels* |
| AC-10 (URL wins; unknown view falls back) | Pass | *selects the view the URL names…*, *an unknown `?view=` falls back…* |
| AC-201 `Claim` and `Open` separate | Pass | *an unclaimed item reads `Unclaimed` and offers a control labelled `Claim`* |
| AC-202 held by another names them, offers `Take over` | Pass | *AC-202 — an item held by another operator…* |
| AC-205 read-only sees the holder, controls disabled | Pass | *AC-205 — the holder is still named to a read-only operator…* |
| AC-207 30-minute expiry stated on the queue | Pass (with defect D-5) | *AC-207 — the 30-minute expiry is stated on the queue itself…* |
| AC-211 one countdown per row | Pass | *AC-211 — a running row shows exactly one countdown* |
| AC-212 `No clock` is a value, never a dash | Pass | *AC-212 — a row with no deadline reads `No clock`…* |
| AC-213 no track when the window is unknown | Pass | *AC-213 — no progress track renders when the window is unknown* |
| AC-220 breached reads `overdue` in words | Pass | *AC-220 — a breached row reads `overdue` in words…* |
| AC-222 late is recorded in the decision badge | Pass | *AC-222 — an item decided after its deadline says `Late`…* |
| AC-226 decision names outcome, actor, time | Pass | *AC-226 — the badge names the outcome, the actor and the time* |
| AC-228 a refusal is neutral, never red | Pass | *AC-228 — a refusal renders in the neutral tone…* |
| AC-232 refusal before the press | Pass | *AC-232 — without the write permission…* |
| AC-234 unfiltered zero → cleared sentence | Pass | *AC-234 — an unfiltered zero shows the cleared sentence…* |
| AC-235 filtered zero → no-match sentence | Pass | *AC-235 — a filtered zero shows the no-match sentence…* |
| AC-292 unreachable source queue states the refusal | Pass | *AC-292 — a row whose source queue is unreachable…* |
| AC-43 identity is a link | Pass | *AC-43 — the identity is a link the operator can open* |
| AC-76 avatar initials never blank | Pass | *a person-led identity carries an avatar with their initials* |
| T5.3 a code carries no avatar | Pass | *T5.3 — a code-led identity renders the code and no avatar* |
| O9 absent cell blank or word | Pass | three tests under *O9 / §9.1* |
| O7 `Missed <date>` reading | Pass | *O7 — a cut-off that passed with no breach stamp…* |
| Q-18 a decided row has no clock | Pass | *Q-18 — a decided row has no clock left to run* |
| Q-57 a system disposition names the system | Pass | *Q-57 — a system disposition names the system as the actor* |
| Four states (content / loading / error / empty×2) | Pass | five tests under *§4.11 / AC-234 / AC-235* |

### 1.2 Requests

| Criterion | Verdict | Test |
|---|---|---|
| Q-32 / T3.2 default view `needs-decision` | Pass | *lands on `Needs a decision` with no view in the URL* |
| X7 `no-drivers` on the default view | Pass | *X7 — a `no-drivers` request is on the default view…* |
| Route-table view row | Pass | *the view row is the route table, in its declared order* |
| AC-201 | Pass | *every open row offers an opening link and an ownership control that is not it* |
| AC-202 | Pass | *AC-202 — an item held by another operator…* |
| AC-203 (names the owner; cancelling leaves the claim) | Pass | two tests |
| AC-206 claim → `Yours` + `Release` | Pass | *claiming an unclaimed row converts its chip to `Yours`…* |
| AC-209 deciding someone else's item confirms first | Pass | *AC-209 — disposing of an item claimed by another operator…* |
| AC-210 an unclaimed item is decided directly | Pass | *AC-210 — an unclaimed item is disposed of directly…* |
| AC-217 order | Pass | *orders the subscription queue by deadline with the most overdue leading* |
| AC-226 conversion in place | Pass | *the row stays visible and its actions are replaced by a badge…* |
| AC-232 render-time refusal | Pass | two tests (Support refused, Owner enabled) |
| AC-235 no-match | Pass | *AC-235 — empty: a search matching nothing states so…* |
| AC-240 type legible without opening | **Spec defect S-1** | *the sub-tab names the channel and no `Type` column repeats it on every row* |
| AC-245 rider note before choosing a captain | Pass | *the row opens a sheet carrying the note the rider left* |
| AC-246 `Offered` offers no assign | Pass | *names the captain the offer is with…* |
| AC-247 assign confirms, naming the money | Pass | *the subscription confirmation names the hold that will be captured* |
| D21 bulk semantics (claims only, refusal, narrowing) | Pass | three tests under *§9.3 / D21* |
| Four states | Pass | four tests under *§4.11*, cleared covered at the adapter (see gap G-1) |
| Keyboard: Enter opens, Escape closes | Pass | *Enter on a row control opens its confirmation, and Escape closes it* |
| Keyboard: row actions reachable by Tab, no hover | Pass | *the row actions are reachable by Tab without a hover* |
| Keyboard: focus returns after Escape | **Fail — D-1** | skipped: *Escape closes the disposition confirmation and returns focus…* |

### 1.3 My Work

| Criterion | Verdict | Test |
|---|---|---|
| AC-280 the queue, in words, never a badge | Pass | *names the owning queue on every row, and never as a badge* |
| AC-281 no decision on any row | Pass | *the row's only action is `Open`…* |
| AC-281 the item opens its OWNING queue | **Fail — D-2** | skipped: *a subscription request opens the queue that holds it* |
| AC-282 no claims → lands on `Unassigned` | **Untestable — G-2** | skipped, with the fixture it needs |
| AC-283 holding a claim → lands on `Mine`, all rows held | Pass | *AC-283 — an operator holding at least one claim…* |
| AC-284 Ops Manager sees rows | Pass | *AC-284 — with role routing on, an Ops Manager sees rows* |
| AC-285 a tab never overstates its view | Pass (vacuous, see note) | *the tab row carries labels and no counts…* |
| AC-286 routing is one control; clearing raises the count | Pass | two tests |
| AC-287 routed-to-zero empty state | **Untestable — G-3** | skipped, with the reason |
| AC-288 the claim is the same claim in the owning queue | **Fail — D-3** | skipped: *claiming a request from the projection…* |
| AC-289 / AC-217 one order across every source queue | Pass | *orders breached first, then by remaining time, then `No clock` last* |
| AC-290 no `overdue 0m` at rest | Pass | *AC-290 — no row reads `overdue 0m` at rest* |
| AC-292 an unreadable source queue | Pass (vacuous here, real at the adapter) | *every queue represented in the projection has a claim client…* |
| The claim control reaches the source client | Pass | *the claim control on a projection row reaches the source queue and reports its failure* |
| §9.3 bulk bar claims only | Pass | *offers `Claim` alone when rows are selected* |
| Four states | Pass | four tests under *§4.11* |
| X3 / O8 count line = rail badge (pre-existing) | Pass | two tests |
| X15 the count explains itself (pre-existing) | Pass | one test |

*AC-285 note.* The tab row renders labels only, so no tab can read a number
larger than the rows beneath it. The criterion is satisfied by the absence of
the counts it constrains, not by counts that agree; the test says so.

### 1.4 Trip Assurance

| Criterion | Verdict | Test |
|---|---|---|
| AC-260 the 24-hour window really filters | Pass | *a leg departing in more than 24 hours is absent from the window and present in All* |
| AC-260 (every listed leg is inside it) | Pass | *every leg the window lists departs inside it* |
| AC-263 an unavailable captain is a reason, not a breach | Pass | two tests (unbreached carries no `overdue`; breached does) |
| AC-268 assumed ≠ confirmed in app | Pass | two tests |
| AC-217 / O7 `Missed` sorts with breached | Pass | *every past-cut-off row precedes every running one on the `all` view* |
| AC-274 every view reachable, each with its own cleared sentence | Pass | *each leg view mounts and names its own scope in the tab row* |
| AC-274 absences cleared sentence (empty ledger) | Pass | *the absences view is reachable and, with an empty ledger, names that scope* |
| Q-60 absences has no claim and no selection | Pass | *Q-60 — the absences view offers no claim and no selection…* |
| AC-232 render-time refusal | Pass | two tests |
| AC-235 no-match | Pass | *AC-235 — empty: a search matching nothing…* |
| Four states (both resources) | Pass | five tests under *§4.11* |
| Keyboard: Enter opens `Confirm`, Escape closes | Pass | *Enter on `Confirm` opens the confirmation, and Escape closes it* |
| §12 `all` view (pre-existing) | Pass | three tests |
| T5.12 reason badge budget (pre-existing) | Pass | two tests |

### 1.5 Subscriptions

| Criterion | Verdict | Test |
|---|---|---|
| T1.2 `Change captain` writes (pre-existing) | Pass | *reassigns the subscription and the row names the new captain* |
| §11.2 the 422 candidate refusal is listed, not hidden (pre-existing) | Pass | *lists the captain already assigned, refused in place with its sentence* |
| T6.1 / D18 freeze carries undo (pre-existing) | Pass | *offers Undo inside the window…* |
| Freeze asks a closed duration list (pre-existing) | Pass | *asks how long, as a closed list…* |
| D18 cancel confirms and needs a reason | Pass | *confirms first, names what will not change…* |
| D18 cancel has **no** undo | Pass | *cancels through the client and the toast carries no undo* |
| §11.2 cancel refused on a terminal subscription | Pass | *a subscription already cancelled refuses the command in place…* |
| Four states | Pass | four tests under *§4.11* |
| Keyboard: row menu opens and Escape restores focus | Pass | *the row menu opens from the keyboard and Escape closes it* |

---

## 2. Defects

### D-1 · A confirmation dialog drops focus to `<body>` when it closes — **high**

`src/components/ConfirmDialog.tsx:146`. `ConfirmDialog` renders `<Dialog open>`
and is *unmounted* when `request` goes `null`, so Radix never runs its close-time
focus restore.

Reproduce, on `/operations/ride-requests`: focus a row's `Close` button, press
Enter, press Escape. The dialog closes; `document.activeElement` is `<body>`.
The trigger is still mounted and is the same node (`isConnected === true`).

Expected: focus returns to the control that opened the dialog (§7.2).
Actual: `expect(close).toHaveFocus()` → *Received element with focus: `<body>`*.

The same is **not** true of the row kebab, whose Radix menu restores focus
correctly — so this is `ConfirmDialog`'s unmount, not a jsdom artefact. It
affects every screen that mounts `ConfirmDialog`: Requests, Assurance, My Work,
People, Admin › Team.

Reproduction kept, skipped, at
`src/screens/operations/requests/requests.test.tsx` → *Escape closes the
disposition confirmation and returns focus to the control that opened it*.

### D-2 · A subscription request opened from My Work lands on the wrong queue — **high**

`src/data/types/work.ts:161` — `WORK_QUEUE_ROUTE.request` is
`/operations/ride-requests` for both channels, and `clients/myWork.ts:252` uses
it for every request work item.

Reproduce: `/operations/my-work?view=everything`, open the row for `SREQ-003`.
It navigates to Ride requests, which pins `channel: 'instant'`
(`RequestsScreen.tsx:199-201`), so the row the operator came from is not on the
page they land on.

Expected (AC-281): the primary action opens the item **in its owning queue**.
Actual: `expect(sub.route).toBe('/operations/subscription-requests')` fails —
received `'/operations/ride-requests'`.

Reproduction kept, skipped, in `myWork.test.tsx`.

### D-3 · No claim written from any queue survives the read that follows — **high**

`src/data/clients/requests.ts:237-241` returns `{ ...row, claim: nextClaim(...) }`
and never writes it back to `allRequestFixtures`. The same shape is in
`applicants.ts:238-278` and `assurance.ts:250-254`.

Reproduce, at the client alone:

```
await claimRequest('REQ-501', { takeOver: false })   // → claim: { ownerId: 'USR-1', … }
await listRequests({ view: 'all', channel: 'instant' })
// REQ-501.claim === null
```

Reproduce, on screen: `/operations/my-work?view=unassigned`, press `Claim` on a
Requests row. My Work re-reads after a write (`MyWorkScreen.tsx:332`), so the row
paints `Unclaimed` again and the operator sees the press do nothing.

Requests **appears** to work only because `useRowActions` overlays the returned
row locally; opening the same item anywhere else shows it unclaimed. This is what
makes AC-288 fail: the claim is not the same claim, because there is no claim.

Expected (AC-288, AC-206): a claim is visible on the item afterwards, everywhere.
Actual: `expect(claimed).toHaveLength(1)` → received `[]`.

Reproduction kept, skipped, in `myWork.test.tsx`.

### D-4 · `subs.error.list` is unreachable copy — **low**

`SubscriptionsScreen.tsx:641-653` returns a page-scoped `ErrorState` before the
`DataTable` branch, so the `error={{ message: t('subs.error.list') }}` passed at
`:688` can never render. Either the page-scoped sentence is the right one and the
key should go, or the key is the right one and it is in the wrong branch.
Recorded, not fixed.

### D-5 · The claim-expiry period is mouse-only — **medium, already self-declared**

`queue.tsx:85-98` carries AC-207's 30-minute sentence on the owner chip's `title`
and its own comment says a `title` is not announced reliably. The test asserts the
`title` because that is what ships; a keyboard-only or screen-reader operator
cannot read it. Left as the file already records it, and repeated here so it is
on a QA list rather than only in a comment.

### D-6 · Pre-existing suite failure outside this task's files — **medium**

`src/data/clients/seam.test.ts` → *4 — no component imports a fixture* fails on
`954df5b`, before any change in this branch:

```
src\screens\management\zones\zones.test.tsx: from '@/data/fixtures/metrics'
```

Not mine, not touched; flagged for whoever owns the zones merge.

---

## 3. Coverage gaps

**G-1 · Requests cannot reach the cleared empty state.** All six declared views
hold rows on the shipped fixtures (`needs-decision` 4 / 3, `assigned` 15 / 15,
`expired` 9 / 8, `all` 28 / 26), so `requests.empty.cleared.*` never renders from
the screen. AC-234 is asserted on the shared adapter instead, where the empty is
driven directly. Closing it needs a view whose fixture set can be emptied, or a
seeded channel with no open work.

**G-2 · AC-282 needs a seeded operator holding zero claims.** Measured `mine`
totals: USR-1 12, USR-2 3, USR-3 3, USR-5 8. `defaultView` is therefore `mine`
for every seeded operator and the `Unassigned` landing branch is unreachable from
the outside.

**G-3 · AC-287 needs an operator who both routes to zero and can open the
screen.** The only seeded operator whose `mine ∩ routedToMyRole` is zero is USR-2
(Finance), and Finance holds no `view_operations`, so `operations-my-work` does
not render for them.

**G-4 · AC-292's refusal is unreachable through the projection.** No work item
comes from `erasure` or `absence` (`queues` census: application 5, request 7,
assurance 5, incident 6, fairness 14, ticket 4, dispute 19). The refusal is
asserted on `OwnerChip` directly instead.

**G-5 · Not covered here, deliberately.** AC-204 (the take-over history on the
item), AC-208 (the 30-minute expiry sweep), AC-218 (no re-order under the
pointer), AC-229 / AC-230 (the nav count after a decision, and the decided row 30
seconds later), AC-233 (re-open), AC-241–AC-244 (the instant/subscription clock
boundaries), AC-248 / AC-249 (the corporate approval path), AC-264 / AC-266 /
AC-267 / AC-269–AC-273 (the absence and backup-offer lifecycles). Each needs
either a clock the suite can advance or a fixture that does not exist; none is
assertable today without inventing state the mock does not model.

**G-6 · Nothing here is a visual claim.** Row height, badge count per row,
colour, truncation and Arabic mirroring are `visual-qa-engineer`'s; jsdom
measures none of them.

---

## 4. Spec defects — for product-owner

**S-1 · AC-240 is contradicted by the shipped structure.** It reads: *"The queue
shows instant and subscription requests in one list, with each row's type legible
without opening it."* Two things now disagree with it. Merge M3 was split into
two sub-tabs by channel (`routeTable.ts:412-460`), so there is no one list; and
T5.2 removed the `Type` column, so the type is on the page title and not on the
row. The intent — an operator can tell what kind of request they are looking at —
is met, but the criterion as written cannot pass. It needs restating as *the
mounted sub-tab names the channel, and no row repeats it*.

**S-2 · AC-285 constrains a number that does not exist.** *"The count on each view
tab equals the number of rows that view renders"* — the tab row carries labels
only (`QueuePage.tsx:74-76`). Either the counts are wanted, in which case they are
missing, or they are not, in which case the criterion should say so.

**S-3 · AC-292's second clause has no reachable subject.** *"the affected rows
state which queue is unreachable and their actions are disabled"* is implemented
(`MyWorkScreen.tsx:847-851`) and no row can reach it, because the projection
carries nothing from `erasure` or `absence`. Either the two queues should project
their rows, or the criterion should be marked as covering a state the product
holds in reserve.

**S-4 · AC-207's carrier is not stated.** The criterion says the 30-minute expiry
is *"stated somewhere the operator can read it on the queue"*. It is a `title`
attribute, which a mouse can read and a keyboard cannot. If a `title` satisfies
the criterion, say so; if it does not, the queue needs a visible carrier.
