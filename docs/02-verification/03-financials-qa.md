# QA verdict — 03 Financials, the 56 implemented-but-unasserted criteria

> **Scope.** The criteria the build ledger listed as *implemented, not asserted*
> — AC-303–308, 310–312, 353, 355, 356, 360, 362–365, 367–371, 374–382, 384,
> 385, 389, 390, 394, 396, 399, 401, 410, 411, 414, 416, 418–420, 422, 423, 426,
> 430–432, 437, 448, 450, 452. **That enumeration is 56 criteria, not 79**; the
> discrepancy is in the ledger's count, not in its list, and every one of the 56
> now has a test.
>
> **Suite as run**, `npx vitest run src/screens/financials src/screens/management/zones`:
> **153 tests · 143 pass · 10 fail.** Baseline before this work was 72 passing.
> `npx tsc -b --noEmit` is clean.
>
> **Every one of the 10 failures is a finding, not a broken test.** None is
> softened, skipped or marked `it.fails`.

---

## 1. Defects — highest operator impact first

### D-1 · CRITICAL · Four money-moving acts write **no posting on the ledger they move**

**AC-362, AC-364, AC-371, AC-379.**

`payCaptain`, `releaseEscrow`, `applyDeduction` and `recordCashRepayment` each
update a **summary record** (`payoutState`, `escrowState`, `debtState`) and write
an audit entry. **None of them writes a `LedgerPosting`.** Only `adjustWallet`
and `reversePosting` do.

The four criteria all say a posting, explicitly:

| | criterion, quoted |
|---|---|
| AC-362 | *"Paying a captain **creates a debit posting on that captain's payable ledger** for the amount paid."* |
| AC-364 | *"Releasing escrow … **creates a credit posting on the captain's payable ledger**."* |
| AC-371 | *"Applying a deduction **creates a debit posting** on the captain's payable ledger … and **both postings are shown**."* |
| AC-379 | *"Recording a captain repayment … **creates a credit posting on that captain's receivable** for exactly that amount."* |

**Reproduction** (`payouts.test.tsx`, `cash.test.tsx`):

1. `/financials/payouts?view=payouts` → Pay Ahmed Salem → confirm.
2. The index row converts to `Paid`, payable 652.60 → 23.15. Correct.
3. Open the same captain's payable ledger.
4. **Expected**: one new debit of 629.45, closing balance down by 629.45.
   **Actual**: no new posting; the closing balance is unchanged.

**Why this is the top finding.** §1 of the spec exists because four legacy
surfaces show money and disagree with each other. This reintroduces exactly that
class of disagreement from the other direction: after any payout, escrow release,
deduction or repayment, **the summary and the ledger state different facts about
the same money**, and the ledger — the thing the whole wave was built to make
authoritative — is the one that is wrong. It also makes AC-363's second clause
(*"reversing the payout restores the previous balance exactly"*) unreachable:
there is no posting to reverse.

Severity is not reduced by the fixtures being internally consistent at rest.
Every operator action opens the gap.

### D-2 · HIGH · `hasHistory` is circular, so a quiet period renders as a first run

**AC-427** (listed on the ledger as *asserted*, and its existing test is green).

Four screens compute `hasHistory={(ledger.data?.totalPostings ?? 0) > 0}`.
`totalPostings` counts postings **in the selected window**, so the question
*"does this subject have history?"* is answered with *"were there rows in this
window?"* — the question being asked. `Ledger.lifetimePostings` is the
subject-lifetime fact and **no screen reads it**.

**Reproduction** (`ledger-rendering.test.tsx`):
`/financials/payouts?captain=DRV-0102&from=2026-07-01&to=2026-07-31`.
Header renders `Balance 685.96 SAR` carried in; body renders
**`No money has moved here yet`** directly beneath it. Two contradictory
statements, one card.

Call sites: `CashScreen`, `PayoutsScreen`, `RevenueScreen`, `WalletsScreen`.

**The existing AC-427 test is green because it uses a rider with genuinely no
history, where both predicates agree.** This is the case that separates them —
and it is a live example of a criterion certifying the defect it governs.

### D-3 · MEDIUM · A disabled row action never states why

**AC-368** — *"…renders its action disabled in place **with the reason
available**."*

`RowAction` (`DataTable.tsx`) has a `disabled` predicate and **no reason field**.
Both `SingleRowAction` and the kebab item render a bare disabled control: no
`title`, no `aria-describedby`, no `aria-label` carrying the reason.

Three reasons are written, translated and **unreachable**:
`fin.payout.blocked.noBank`, `fin.payout.blocked.nothing`,
`fin.payout.blocked.permission`.

**Reproduction**: `/financials/payouts?view=payouts`, open Youssef Nouri's row
actions. `Pay` is correctly disabled — he has no bank account — and the operator
is told nothing. §11.2's whole point is that a refusal states its reason at
render.

*Note*: the same criterion's **disabled-in-place** half passes, including through
a read-level permission (see §4).

### D-4 · MEDIUM · The wallet index offers no filters at all

**AC-382** — *"the wallet index is an index table — selection, sort **and
filters** all work per foundation §7.1."*

Selection works, sort works. **Not one of the six columns declares a `filter`**,
so `filterEntries` is empty and the toolbar's `Filter` control opens a popover
reading `No options available`. The control is furniture.

The ledger half of AC-382 passes in full: no selection, no sort control, no
filter control, no sortable header behind the identity link.

### D-5 · LOW · The refused count reaches no banner on the sub-tab that owns the view

**AC-419** — *"…and is **counted in a page banner**."*

`LedgerControlsScreen` raises a banner only when the trial balance is out of
balance. With the books balancing — the shipped state — the `Refused postings`
view lists two refused postings and the page says nothing. Overview *does* count
them (`fin.overview.refused.titleMany`), so both the copy and the count exist;
the sub-tab that owns the view is the one that is silent.

The rest of AC-419 passes: every refused posting is kept, its reason renders as a
keyed sentence with formatted money and no raw halala integer, and its attempted
lines are shown.

### D-6 · LOW · No character-count hint on the Arabic name field

**AC-448** — *"…and its character-count hint is localised."*

The field renders `fin.planEditor.nameAr.help` and no count.
`fin.planEditor.feature.count` (`{count} of 60`) and `feature.tooLong` are
written and translated, but **the plan editor renders no feature editor at all**
— `PlanValues.features` is round-tripped through `savePlan` with no control — so
the only counted field in the spec is absent.

AC-448's first clause passes: the Arabic field carries `dir="rtl"` in **both**
document directions, and the English field does not.

### D-7 · INFORMATIONAL · `PayoutsScreen`'s header comment contradicts the DOM

The file states *"`Pay` and `View ledger` render as labelled controls, visible at
rest"*. Two declared actions collapse to the `⋯` kebab under §7.8's count rule,
so the row renders `More actions for DRV-0101`. `DataTable` is behaving per D8 —
only *one* action gets the labelled shape. **The comment is wrong, not the code.**
Not a §7.3 hover defect: the kebab is visible at rest and is fully keyboard
operable (asserted).

---

## 2. Where the implementation is right and the criterion is wrong

### AC-353 — *"changing the period changes **every** tile"*

**The criterion cannot pass without breaking the screen, and should be split.**

Overview renders two sections:

- **six in-period flows** — gross, captain earnings, gross margin, giveback,
  contribution margin, contribution % — which move with the window. Verified:
  narrowing 1–30 Jun to 1–7 Jun moves every one, and the caption moves with it.
- **five as-at positions** — pending payouts, escrow held, escrow ready, captain
  debt, rider wallet liability. Each is a **balance**: `accountBalanceFrom` and
  the escrow holds are read at the clock with no window. They are captioned
  `As at now` rather than with a date range.

**A balance-sheet position that changed when a reporting period was narrowed
would be wrong.** Recorded as a spec defect for product-owner: keep AC-353 for
the flow tiles, add a criterion for the position tiles saying they are as-at and
must say so. A test asserting the correct behaviour is in place beside the
failing one.

### AC-304 — names a fixture that does not exist

*"A rider wallet ledger row created by a **goodwill credit of 20.00 SAR**."* The
dataset's 20.00 credit is `WTX-0002`, a **referral bonus**; its goodwill credit
is `WTX-4001-1` at 50.00. Tested by substance — a credit renders in Credit and
raises the balance by its own amount — with both rows exercised. Not a defect in
either direction; worth correcting the criterion's wording.

### AC-384 — *"names … the role that can grant it"*

`fin.authority.abovePerCase` names the role whose ceiling **applied**
(`appliedRole`), not a higher role that could grant an exception. For an Owner
there is no higher role, so the criterion is unsatisfiable at the top of the
policy. Passing as written today because a role *is* named; flagged as ambiguous.

---

## 3. Coverage gaps — what could not be tested, and precisely why

| Criterion | Why |
|---|---|
| **AC-423** (second half) | *"…change when the underlying payment fixtures change."* **There is no payment resource** — no `payments` client, no payment fixture, nothing to vary. `transactionCount` and `volumeHalalas` are stored fields on `paymentGatewayFixtures`, i.e. literals correctly served across the seam and derived from nothing. The half the screen owns **is** asserted: every rendered figure is the client's value, and the values differ per gateway so a component-level constant could not render them all. **Untestable until a payment resource exists.** |
| **AC-363** (second clause) | *"Reversing the payout restores the previous balance exactly."* Blocked by **D-1**: the payout writes no posting, so there is nothing to reverse. First clause — never assigned to zero — passes. |
| **AC-450** (first clause) | *"Shows a visible focus ring."* jsdom computes no styles. Asserted as *declares* a `focus-visible:` ring or outline, swept over every leaf control on three mounted sub-tabs. **Whether the ring is visible at 3:1 against its background is visual-qa-engineer's**, not certified here. |
| **AC-310** | Same shape: forced monochrome is a rendering question. Asserted as the **structural** claim underneath — debit and credit are distinguished by column, a negative balance by U+2212, a failed row by the settlement in words with no badge tone at all. The monochrome screenshot is visual-QA's. |
| **AC-433** | Not in scope for this pass, and untestable in jsdom: 1280/1440 overflow is Playwright's. |

---

## 4. What the permission gate does and does not prove

All seven Financials route rows carry `permission: null` (**Q-F2 / D4**), so
**AC-434–436 and AC-440 cannot pass and are left failing and named.** No test in
this pass claims them.

The gate itself is verified: a locally-constructed row with
`permission: { key: 'view_finance', level: 'read' }` renders `Pay` **disabled in
place**, opens no dialog, and writes no audit entry. The mechanism works; the
data does not carry the values. The day the seven permission values land, the
disabled treatment appears with no screen change.

---

## 5. AC-453 — checked, and still an absence

Not re-asserted here; the three existing assertions stand and **nothing in this
pass renders, seeds or asserts a countdown, a due time, an overdue pill, a breach
banner or a breach facet.** No path was found that could make one appear.
`cash.test.tsx` carries the prohibition at the top of the file so the next reader
meets the reason before the tests.

---

## 6. Test-integrity note — no spies, anywhere

`vi.spyOn` on a client namespace does **not** intercept the `@/data/clients`
barrel's live binding unless given an implementation, and a *negative* assertion
against such a spy passes vacuously: *"it was never called"* and *"I was never
watching"* are indistinguishable.

**No file in this pass uses a spy.** Every absence is asserted against the
rendered DOM or against real client state (`auditLogSize()`, the returned
record), every failure is injected through `mockFailures`, and **every negative
carries a positive twin in the same describe block**:

| negative | its twin |
|---|---|
| AC-376 — rendering writes no audit entry | a claim through the DOM *does* move `auditLogSize()` |
| §7.3.3 — `Escape` mutates nothing | the same dialog, confirmed, releases the hold |
| AC-410 — no control raises a multiplier | the per-zone suspend controls are live |
| AC-422 — the default switch does not move | a non-default switch does |
| AC-432 — no `0` badge | the zero counts are on screen as plain numbers |
| AC-382 — no sort on the ledger | sort, selection and filter are all found on the index |

---

## 7. Criteria table

Pass = tested and green. Fail = tested and red, with the defect above.

| AC | Verdict | Test |
|---|---|---|
| 303 | Pass | `ledger-rendering` › *a zero-amount posting renders 0.00 in its own column* |
| 304 | Pass | `ledger-rendering` › *a wallet credit renders in Credit and raises the balance* |
| 305 | Pass | `ledger-rendering` › *a trip fare renders in Debit and lowers the balance* |
| 306 | Pass | `ledger-rendering` › *a payout debits the captain payable* |
| 307 | Pass | `ledger-rendering` › *a cash commission debits the receivable* |
| 308 | Pass | `ledger-rendering` › *names the account and states which direction increases it* |
| 310 | Pass (partial — see gaps) | `ledger-rendering` › *each carry a non-colour signal* |
| 311 | Pass | `ledger-rendering` › *the balance column is the persisted field* |
| 312 | Pass | `ledger-rendering` › *renders an em dash, states Pending separately, excludes it* |
| 353 | **Fail — spec defect** | `overview` › *every tile — positions included — moves with the period* |
| 355 | Pass | `revenue` › *every column of the total equals the sum of the rows* |
| 356 | Pass | `revenue` › *says so in words, carries the marker and the banner* |
| 360 | Pass | `revenue` › *two notes issued on different days render different dates* |
| 362 | **Fail — D-1** | `payouts` › *the payable ledger carries a new debit* |
| 363 | Pass (clause 2 blocked) | `payouts` › *the payable moves by the amount paid* |
| 364 | Pass / **Fail — D-1** | `payouts` › *stays on the list* / *a credit posting appears* |
| 365 | Pass | `payouts` › *disables Release in place and states the progress* |
| 367 | Pass | `payouts` › *marker, words and banner, never a badge* |
| 368 | Pass / **Fail — D-3** | `payouts` › *disabled in place* / *states why* |
| 369 | Pass | `payouts` › *names the amount and the captain and refuses without a reason* |
| 370 | Pass | `payouts` › *stays on the list with its actor and reason* |
| 371 | Pass / **Fail — D-1** | `payouts` › *excess to the receivable* / *both postings shown* |
| 374 | Pass | `cash` › *Resolve and Escalate and nothing else*; *the three owner states* |
| 375 | Pass | `cash` › *following a row out and back leaves the owner chip as it was* |
| 376 | Pass | `cash` › *two renders write no audit entry* |
| 377 | Pass | `cash` › *deciding converts the row in place* |
| 378 | Pass | `cash` › *marker and banner, never a red badge* |
| 379 | Pass / **Fail — D-1** | `cash` › *a partial repayment* / *a credit on the receivable ledger* |
| 380 | Pass | `cash` › *over the cap says so, from the cap the client serves* |
| 381 | Pass | `cash` › *the total is the signed sum* |
| 382 | Pass / **Fail — D-4** | `wallets` › *index vs ledger* / *the Filter control offers a field* |
| 384 | Pass | `wallets` › *refused in the dialog, naming the cap in SAR* |
| 385 | Pass | `wallets` › *the ceiling holds for `Manual top-up`* |
| 389 | Pass | `pricing` › *four views, default, and the path never moves* |
| 390 | Pass | `pricing` › *rail and sub-tab column gone in the editor and back on exit* |
| 394 | Pass | `pricing` › *a cleared number blocks Save and puts the error on the input* |
| 396 | Pass | `pricing` › *a dependent derived value moves on the input event* |
| 399 | Pass | `pricing` › *states its literal inputs and excludes surge* |
| 401 | Pass | `pricing` › *every editable control survives a save and a reload* |
| 410 | Pass | `pricing` › *multipliers are read-only text, the only write is a suspension* |
| 411 | Pass | `pricing` › *the primary is disabled until a reason is entered* |
| 414 | Pass | `pricing` › *every unenforced rule says so, and no enforced rule does* |
| 416 | Pass | `controls` › *balanced renders no banner* / *unbalanced names the difference* |
| 418 | Pass | `controls` › *each line names its side, account and amount; the sides agree* |
| 419 | Pass / **Fail — D-5** | `controls` › *reason as a sentence* / *counted in a page banner* |
| 420 | Pass | `controls` › *every row names a basis; agreement reads 0.00* |
| 422 | Pass | `controls` › *the default cannot be disabled, and its switch does not move* |
| 423 | Pass (half untestable) | `controls` › *the rendered figures are the client's values* |
| 426 | Pass | `ledger-rendering` › *the P7 ledger skeleton*; *no source imports a spinner* |
| 430 | Pass | `payouts` › *the payable is untouched, the row carries the error* |
| 431 | Pass | `payouts` › *the row's retry re-runs the same call* |
| 432 | Pass | `cash` › *a zero count renders no badge, on either view* |
| 437 | Pass | `payouts` › *one audit entry, for the NET*; `keyboard` › *each act through the UI* |
| 448 | Pass / **Fail — D-6** | `pricing` › *right-to-left in both directions* / *character-count hint* |
| 450 | Pass (clause 1 partial) | `keyboard` › three tests |
| 452 | Pass | `ledger-rendering` › *held is on the hold and never on an escrow posting* |

Additionally reported outside the 56: **AC-427** fails on the quiet-period case
(**D-2**) while its existing test remains green.

---

## 8. Files

- `src/screens/financials/ledger-rendering.test.tsx` — 14 tests
- `src/screens/financials/payouts/payouts.test.tsx` — 16 tests
- `src/screens/financials/cash/cash.test.tsx` — 14 tests
- `src/screens/financials/wallets/wallets.test.tsx` — 5 tests
- `src/screens/financials/revenue/revenue.test.tsx` — 3 tests
- `src/screens/financials/overview/overview.test.tsx` — 4 tests
- `src/screens/financials/pricing/pricing.test.tsx` — 11 tests
- `src/screens/financials/ledger/controls.test.tsx` — 8 tests
- `src/screens/financials/keyboard.test.tsx` — 6 tests

No production code, fixture or spec was changed.
