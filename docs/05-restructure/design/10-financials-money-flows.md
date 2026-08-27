# 10 — Financials: the two money flows, and the rules that govern money confirmations

> **Owner:** product-designer. **Consumers:** frontend-engineer (the two flows, the four
> rulings), utilities-engineer (the resolver and the two helpers §7 names), mock-data-engineer
> (the reason-code resource, three seam gaps), product-owner (six things this document refuses
> to decide).
>
> **Scope.** `specs/03-financials.md` **AC-326–335** (reversal), **AC-336–338**, **AC-358–359**
> (refund), the governing rule for `ConfirmMoneyDialog`, and rulings on the four findings the
> wave-3 build returned. Everything else in §14's *For product-designer* list is **still owed** —
> see §11.
>
> **Precedence.** Rulings > §6.2's sanctioned deviations > §7–§9 > everything else. No pixel
> figure from §1–§5 is cited here; **R13** voids them.

---

## 0. What this document decides, in one screen

| # | Decision | Where |
|---|---|---|
| **MC-1…MC-9** | The governing rule for every money confirmation in Financials — anatomy, prohibitions, primary tone, the money model in copy | §1 |
| **RV-1…RV-8** | The reversal flow: three entry points, the resolve-then-confirm dialog, six refusals, every state drawn | §2 |
| **RF-1…RF-7** | The refund-issue flow: one entry point, compose → confirm, the duplicate path, the destination with no default | §3 |
| **RC-1…RC-4** | **AC-387 ruled.** A reason is two fields; `reasonCode` is chosen, never typed; who owns each catalogue | §4 |
| **LR-1…LR-4** | **Finding 1 ruled.** AC-427 stands; §9.2's absolute narrows; `hasHistory` is a lifetime fact, not a query result; three ledger empties, drawn | §5 |
| **VW-1…VW-3** | **Finding 2 ruled.** *All postings* is struck on both sub-tabs. Final view lists | §6 |
| **TL-1…TL-2** | **Finding 3 confirmed.** A position tile states no period, and the guard is the client call, not the caption | §7 |
| **D8-b** | **Finding 4 ruled.** The kebab begins at **three**. `DataTable`'s branch yields; R4-6 §6.4 clause 2 stands | §8 |
| — | Nine defects in the built code | §9 |
| — | Six things this document refuses to decide, each with an owner | §10 |

**Two constraints held throughout, and neither is negotiable.** **AC-453** — nothing in this
document renders a countdown, a due time, an overdue pill, a breach banner, a breach control or a
breach facet on a cash report, and no copy here implies one exists. **R5-15** — no aggregate is
introduced here, so nothing here needs a `sourceResource`; a later reader adding one must declare
it or the tile does not render.

---

## 1. The money confirmation — one rule, nine clauses

`ConfirmMoneyDialog` exists and every money act on the seven sub-tabs raises it. It had no
governing rule, so eight callers each invented a sentence. This is the rule.

**Pattern.** §5.3 modal, small. `Dialog size="sm"`, vertically centred, header (title + ✕) /
body / right-aligned footer with secondary before primary. §5.0's decision table puts every one of
these acts in a modal: *destructive / irreversible → modal, primary restated as the verb* and
*short focused form (≤6 fields) → modal*.

### 1.1 Anatomy — the slots, in order, and what each one FORBIDS

A slot defined by what it currently holds drifts. Each slot below is defined by its prohibitions.

```
┌─ Reverse PAY-0031 of 640.00 SAR?                                   ✕ ─┐
│                                                                       │
│  A reversing posting is written to Nora Al-Harbi’s payable ledger.    │  ① consequence
│  PAY-0031 keeps its amount and its place, and the 640.00 SAR          │
│  already sent to the bank is not recalled by this.                    │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐  │  ② resolved
│  │ 19 Jul 11:47 · PAY-0031 · Payout                                │  │     subject
│  │ Debit 640.00 SAR · Balance after 1,240.00 SAR                   │  │     (Path 2 only)
│  │                                             Not this posting    │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  Balance now                                            1,240.00 SAR  │  ③ money lines
│  Balance after this reversal                            1,880.00 SAR  │     (after = bold)
│                                                                       │
│  Above 200.00 SAR a second approver is needed. The posting is         │  ④ standing note
│  created pending and waits.                                           │
│                                                                       │
│  ┌ ⚠ A matching refund already exists.                             ┐  │  ⑤ caution block
│  └ …                                                               ┘  │
│                                                                       │
│  Reason code                                                          │  ⑥ reason code
│  [ Choose a reason                                              ⌄ ]   │
│  Why the money moved. It goes on the posting.                         │
│                                                                       │
│  Note                                                                 │  ⑦ note
│  [                                                               ]    │
│  One line. It goes on the new posting with your name.                 │
│                                                                       │
│  ┌ ⚠ That did not go through. Try again.                           ┐  │  ⑧ commit error
│  └                                                                 ┘  │     (page-raised acts)
├───────────────────────────────────────────────────────────────────────┤
│                                       [ Cancel ]  [ Reverse posting ] │  ⑨ footer
└───────────────────────────────────────────────────────────────────────┘
```

| Slot | Prohibitions |
|---|---|
| ① **consequence** | Never mechanics (*"a request is sent"*). Never reassurance with no content. Never more than two sentences. Never a promise about a system Eyvar does not own unless the sentence names whose it is. Never a fragment — these are full sentences and take a period (**R6**). |
| ② **resolved subject** | Renders **only** where the operator named a target by typing it. Never renders for a row-raised act — the row is already on screen behind the dialog. Never editable. Never carries an action other than the way back. |
| ③ **money lines** | Never coloured. Never a percentage. Never a line for a number the act does not change. Never a number the operator cannot also find on the surface behind the dialog. Exactly one line carries `emphasis`, and it is the amount the act commits. |
| ④ **standing note** | Never an error. Never a substitute for disabling the primary — a note states a consequence that still permits the act. Never more than one. |
| ⑤ **caution block** | A **pale tinted card**, warning tone (**R1**, **R16**). Never critical tone, never a saturated strip, never two. Precedent for a banner inside a modal is in the reference: `11-apps-and-channels/app-uninstall-confirm-modal.webp`. It is not a page-level banner, so **R10**'s one-banner clause is untouched. |
| ⑥ **reason code** | Never a free-text field (**RC-1**). Never pre-selected. Never the whole support taxonomy. |
| ⑦ **note** | Never optional where the act is discretionary. Never the field whose value is written into `reasonCode`. |
| ⑧ **commit error** | Renders **only** for an act raised from a page-level control, because such an act has no row to fail on. Never becomes a toast; never becomes a page banner; the dialog stays open and every entered value survives. |
| ⑨ **footer** | Secondary before primary. Never `OK`, `Yes`, `Confirm`, `Submit`. Never a primary that omits the verb. |

**Slots absent by rule.** No icon in the header (§5.3). No progress bar. No amount in the header
that is not also in the body. No link out of the dialog except the ones ⑤ and the refusals in §2.3
declare. No checkbox acknowledgement — §5.3 reserves that for *"actions that destroy data belonging
to third parties"*, and Financials destroys nothing (§1.4).

### 1.2 MC-1 — the title

A question. **Verb + the object's own reference + the amount**, in that order, sentence case, `؟`
in Arabic (§9.6).

- `Reverse PAY-0031 of 640.00 SAR?`
- `Refund 40.00 SAR to Nora Al-Harbi?`
- `Pay Faisal Al-Otaibi 1,180.00 SAR?`

**Prohibitions.** Never `Are you sure?`. Never a bare verb (`Reverse?`). Never a count when the
count is one — there is no bulk money act anywhere in Financials (**AC-335**). Never an amount
without `SAR` (**AC-323**). Never a party in the title that the body does not name.

### 1.3 MC-2 — the body is two clauses, in one order

**What the commit writes**, then **what it leaves alone.** §5.3's own rule, and copy rule 9.

> *A reversing posting is written to Nora Al-Harbi's payable ledger. PAY-0031 keeps its amount and
> its place, and the 640.00 SAR already sent to the bank is not recalled by this.*

The second clause is not politeness. In an append-only ledger the operator's real question is
always *"what survives?"*, and the answer is *"everything"* — which is the one fact that makes the
correction safe to make.

### 1.4 MC-3 — the primary's tone. **Financials has no red primary.**

> **MC-3.** A confirmation takes the destructive primary **only** where the commit moves money
> outside Eyvar's control and no act inside this product returns it. **No Financials act meets
> that test, so no Financials confirmation carries a red primary** — including the reversal and
> including the refund.

Why, stated so it is not re-litigated:

1. §5.3 rules that **colour encodes reversibility**. The ledger is append-only *by design* — every
   posting has an antidote that is itself a posting (§3.4a), and reversing a reversal is legal
   (§3.6). Under that model the enumerated red use never arises, and declining a licence is not a
   deviation.
2. A payout and an instrument refund put money into a bank Eyvar does not own. Both are still
   **recorded, audited, reversible in the ledger and appealable**, and both are ordinary acts an
   operator performs daily. Red on a daily act is red that stops meaning anything, which is what
   **R5a**'s enumeration exists to prevent.
3. The severity is carried where it can actually be read: the consequence sentence and the
   balance-after line.

**Prohibitions.** No Financials confirmation may take a red primary on the grounds that the amount
is large, that the operator should think twice, or that the act is unusual. Red does not appear on
a dialog title, a money line, a border or an amount. **A Financials act that one day deletes a
record rather than posting one is a §6.2 entry, not a repaint.**

**R5a is unchanged.** Its four uses stand; Financials spends #3 (the row leading-edge marker, on
`failed` and `escalated` rows) and none of the others.

### 1.5 MC-4 — the money model in copy

The model is unusual. The copy must not fight it.

| Rule | Layer | Prohibition |
|---|---|---|
| **MC-4a** Every amount in a confirmation comes from the one formatter, fed an integer `Halalas`. | The component. The dictionary carries `{amount}` placeholders and **never a formatted literal** — the fixture never knows the language, and grouping separators and the code's placement vary at render. | No `toFixed` in a screen. No amount concatenated into a key's value. |
| **MC-4b** A **posting** is never described with a sign. Its words are `Debit` / `Credit`, or the plain-language effect. | The copy. | Never `−640.00 SAR will be posted`. Never U+2212 on a posting amount. |
| **MC-4c** A **balance** is signed, renders with U+2212 in ordinary ink, and may be negative. | The `Money` component. | Never in a badge or pill of any tone (**R5**, §8.3.2). Never red. Never accounting parentheses. |
| **MC-4d** Name the **party**, never the account. `Nora's balance`; `what Eyvar owes Faisal`; `what Faisal owes Eyvar`. | The copy. | No account key (`liability.wallet`) and no accounting noun (*liability*, *contra*, *receivable*) appears in any confirmation. They belong on the ledger card header (**AC-308**) and on Ledger & Payment Controls, where an operator is reading the books rather than moving money. |
| **MC-4e** A rider's balance **is** the wallet liability balance. One number, one name. | The data. | A confirmation never states a rider balance that a second surface computes differently. Where the confirmation shows *balance after*, it shows the value the commit returns, not one the screen derived. |
| **MC-4f** `SAR` trails an amount that is **output** and prefixes a field that is **input** (§8.3.1 vs §4.2). | The component. | The two are never reconciled into one convention; they are two rules for two things. |

### 1.6 MC-5 — a reason is two fields

See §4. `reasonCode` is chosen from a closed set. `note` is free text. They are never one control
and the note is never written into `reasonCode`.

### 1.7 MC-6 — the primary label

Verb, or verb + object, repeating the title's verb: `Reverse posting`, `Refund 40.00 SAR`,
`Credit 40.00 SAR`, `Re-hold`, `Release hold`, `Pay`.

It carries the **amount** where the same dialog can commit two different things — the refund's two
destinations are the only such case today. Disabled until every required field is valid
(**AC-333**, **AC-387**); not re-triggerable while a commit is in flight.

### 1.8 MC-7 — after the commit: one surface, and nothing moves

- **Success → a toast, and nothing else** (**R10**). One line, ≤60 characters, naming the object
  **exactly**: the document reference where one exists, otherwise the party. Truncate the object,
  never the verb (**R9**). No period, no emoji, no action link.
- **Failure → the row error** where the act came from a row (`useMoneyActions` already does this,
  **AC-431**); **slot ⑧** where it came from a page-level control.
- **Nothing navigates.** The surface the operator is on refetches; the operator is not moved. An
  act raised from a page-level control was raised while they were doing something else.
- A ledger that gained a row refetches and its scroll container goes to the end — a ledger is
  oldest-first, so the new row is last. **No highlight, no flash, no scroll animation** (§7.6,
  **R18**): a new row is a state, not an event.

### 1.9 MC-8 — keyboard and focus

- The dialog traps focus (§7.3.3). `Escape` **cancels the whole dialog from any state**, and at
  that moment nothing has mutated. Escape never "ascends" a step — two meanings for one key costs
  more than the typed value it saves, and the way back is a control in the body (§2.2, §3.3).
- `Enter` in a field submits **that step's** primary when it is enabled.
- **The confirm step contains no input.** So no keystroke that typed an amount can also commit it —
  that is a reason for the two-step shape, not an accident of it.
- Every refusal link in §2.3 is reachable by keyboard and carries a visible focus ring (§7.2).

### 1.10 MC-9 — Arabic

- The dialog mirrors; the money strings inside it do not reorder (**R4**, **AC-445**).
- Every `{reference}`, `{document}`, IBAN and plate renders inside `<bdi>` (**AC-447**).
- The money **input**'s `SAR` prefix sits at inline-start in both directions — its position
  mirrors, its glyph order does not.
- ③'s lines are label at inline-start, amount at inline-end; the pair mirrors, the amount does not.
- Every string here is a key with named placeholders. Nothing is concatenated (**AC-443**).

---

## 2. The reversal flow — AC-326–335

### 2.1 RV-1 — where a reversal starts, and where it may never start

§8.3 permits exactly one per-row control on a ledger — a read-only link to the source document —
and spec §3.6 ratifies that as the product answer: *you do not correct a ledger, you correct the
act that wrote to it.* Three entry points, and no fourth.

| # | Entry | Surface | Confirmation |
|---|---|---|---|
| **1** | The source document's **row action** on an index view | Payouts & Escrow (`Payouts`, `Escrow`, `Deductions`) | The **D8 dialog** |
| **2** | The **page-level** `Reverse a posting` in the PageHeader of a view that is showing a ledger | Revenue & Refunds, Payouts & Escrow, Cash & Captain Debt, Rider Wallets | The same dialog, with a **target step** in front of it |
| **3** | ⌘K → `Reverse a posting` → target → confirm | The palette | **In the palette** (**D9**) — lands with C-3, not now |

**This is not a third shape, and the arithmetic matters.** **D9** rules two confirmation shapes:
row → dialog, palette → in-palette. Entry 2 is a pointer surface, so it gets the dialog. What is
new is a **target step**, and the palette already has one. So the count of confirmation shapes is
still two.

> **RV-2 — the binding that keeps it at two.** The dialog's target step and the palette's target
> step **resolve through one resolver**, and both confirmations read **the same copy keys**. A
> second resolver, or a second set of strings, is the four-way-declaration defect **D9** was
> written to kill.

**Prohibitions.**

- The reversal is **never** a ledger row action, at any permission level (**AC-325**, §8.3).
- The reversal is **never** bulk. No select-all, no multi-select, no *"reverse 12 postings"*
  (**AC-335**). The index tables that gain a `Reverse` row action **do not gain selection**; they
  have none today and must not acquire one as a side effect.
- The page-level control renders **only** on a view that is currently showing a ledger. Not on
  Overview. Not on Pricing & Plans. Not on the Rider Wallets **index** — only on the per-rider
  ledger it would write to.
- **Ledger & Payment Controls carries no reversal control at all.** It is the general ledger, and a
  journal entry is the *consequence* of an act, never its origin. §2.2 already refuses the product
  a journal-entry composer; a reversal raised from the trial balance is that composer with one
  button.

### 2.2 RV-3 — the ledger row's source link, which is what makes entry 1 reachable

The build restricted links to `sourceType === 'trip'`, because *"a payout, a deduction, an escrow
hold and a cash report have no route in this product"*. That was the right refusal — a link that
404s is a guess about the route table. **The destination is not a route. It is a view plus a
query on a route that already exists.**

| `sourceType` | Destination |
|---|---|
| `trip` | `/entity/{sourceId}` |
| `payout` | `/financials/payouts?view=payouts&q={reference}` |
| `escrow` | `/financials/payouts?view=escrow&q={reference}` |
| `deduction` | `/financials/payouts?view=deductions&q={reference}` |
| `refund` | `/financials/revenue?view=refunds&q={reference}` |
| `credit-note` | `/financials/revenue?view=credit-notes&q={reference}` |
| `cash-report` | `/financials/cash?view=reconciliation-queue&q={reference}` |
| `reversal` | the ledger row it reverses — already rendered as `Reverses {reference}` |
| `payment` · `chargeback` · `adjustment` · `opening` | **no surface. Renders as text, never as a link.** |

**Prohibitions.** The link never opens a dialog, never mutates, and never resolves to a route that
does not exist. Where a source has no surface, the reference renders as plain text — the same rule
§6.3 applies to a credit note's invoice: *never guessed*.

### 2.3 RV-4 — entry 1, drawn: the row action

Row anatomy on the three index views, under **D8-b** (§8):

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ Captain          Trips  Payable   Cash debt   Net payable  State   Actions     │
├───────────────────────────────────────────────────────────────────────────────┤
│ Nora Al-Harbi      42  1,880.00      640.00     1,240.00   Paid   [Pay] [Rev…] │
│ DRV-0204                                                                       │
└───────────────────────────────────────────────────────────────────────────────┘
                                                              ▲       ▲
                                      one lane, two labelled controls, both
                                      visible at rest, both keyboard-operable
                                      (AC-68), each disabled IN PLACE with its
                                      reason when its state forbids it (§11.2)
```

`Reverse` is enabled on exactly one state per document, and every other state gives its reason on
the control:

| Document | Enabled when | Disabled reason, verbatim |
|---|---|---|
| Payout | `state === 'paid'` | `due` → `Nothing has been paid yet.` · `processing` → `Wait for the bank to settle this.` · `failed` → `The money did not leave. There is nothing to reverse.` · `reversed` → `Already reversed.` |
| Escrow (`Re-hold`) | `settlement === 'released'` | `held` → `This hold has not been released.` · `reversed` → `Already reversed.` |
| Deduction | `status === 'applied'` | `pending` → `This deduction has not been applied.` · `waived` → `A waived deduction posted nothing.` |
| Any, wrong role | — | `Your role cannot move money.` |

**A refund carries no reverse action, and that is a finding, not an omission.** See §10, **Q-D1**.

### 2.4 RV-5 — entry 2, drawn: target step → confirm step

**State A — target.**

```
┌─ Reverse a posting                                                 ✕ ─┐
│                                                                       │
│  Enter the reference of the posting to reverse. A posting that came   │
│  from a payout, a refund or a deduction is reversed on that document, │
│  not here.                                                            │
│                                                                       │
│  Posting reference                                                    │
│  [ WTX-0004                                                       ]   │
│  As it appears in the Reference column.                               │
│                                                                       │
├───────────────────────────────────────────────────────────────────────┤
│                                          [ Cancel ]  [ Find posting ] │
└───────────────────────────────────────────────────────────────────────┘
```

The field is **scoped to the ledger that is open**. A reference that resolves to another subject is
refused by name (§2.5, refusal 5) rather than silently acted on.

**State B — confirm.** Slots ①②③⑥⑦⑨ of §1.1, with ② carrying the resolved row in full — date,
reference, description, direction and amount, balance after — and `Not this posting` returning to
State A with the field's value intact.

### 2.5 RV-6 — the six refusals of the target step, each with final copy

Every one of these renders **in the dialog**, below the field, as a warning-tone caution block
(slot ⑤), with the primary disabled. None of them is a toast and none is a page banner.

| # | Condition | Copy | Action offered |
|---|---|---|---|
| 1 | No such reference | `No posting carries the reference {reference}. Check the Reference column.` | — |
| 2 | Already reversed (**AC-330**) | `{reference} was reversed by {reversal} on {date}.` | `Open {reversal}` — navigates the open ledger to that row |
| 3 | Has a reversible document | `{reference} came from {document}. Reverse the document instead.` | `Open {document}` — the §2.2 destination table |
| 4 | It is a refund | `{reference} is a refund. Its credit note is a tax document and it cannot be cancelled from this console.` | — |
| 5 | Another subject's posting | `{reference} is on another ledger — {subject}.` | `Open that ledger` |
| 6 | Role may not act on this subject | `Your role cannot move money.` | — |

**Refusal 3 is the discipline, and without it entry 2 dissolves entry 1.** If the target step
accepted any reference, an operator could bypass the source document every time, and the ledger
would stop recording *which act* was corrected. It refuses, names the document, and links to it.

**Refusal 6 refuses, it does not hide.** A posting the role may not act on **resolves and shows**,
with the primary disabled and the reason on it (§11.2). Pretending it does not exist is a lie the
operator can disprove by reading the ledger behind the dialog.

### 2.6 RV-7 — the one case that is not a reversal at all (AC-332)

A posting whose settlement is `held` or `authorised` has moved no money, so reversing it writes
nothing. The dialog **changes its own verb** rather than committing something the operator did not
ask for:

```
┌─ Release the hold on WTX-0005?                                     ✕ ─┐
│                                                                       │
│  No money has moved, so nothing is posted. WTX-0005 shows Released    │
│  and its 120.00 SAR leaves the Pending line.                          │
│                                                                       │
│  Nora’s balance now                                       20.00 SAR   │
│  Pending now                                             120.00 SAR   │
│  Pending after this release                                0.00 SAR   │
│  …reason code · note…                                                 │
├───────────────────────────────────────────────────────────────────────┤
│                                           [ Cancel ]  [ Release hold ]│
└───────────────────────────────────────────────────────────────────────┘
```

`Released` is **neutral** tone (§8.3.4, §7.2) — terminal, no action left. Never success, because
nothing succeeded; never warning, because nothing is waiting.

### 2.7 RV-8 — every state of the reversal flow

| State | What renders |
|---|---|
| **Row action, resting** | Two labelled controls in the actions lane, both visible without hover (**AC-68**) |
| **Row action, forbidden by state or role** | The control disabled **in place**, reason from the §2.3 table, available on focus and on hover |
| **Target step, idle** | The field, empty, primary disabled |
| **Target step, resolving** | The primary shows its busy state; the field stays editable; **no spinner overlay** and no skeleton — one field is not a page |
| **Target step, refused** | One of the six blocks in §2.5; primary disabled; the typed value survives |
| **Confirm, idle** | Slots ①②③⑥⑦; primary disabled until a reason and a note are present |
| **Confirm, in flight** | Primary busy and not re-triggerable; Cancel disabled; **no value is written optimistically** |
| **Confirm, failed** | Slot ⑧ inside the dialog for a page-raised act, or the row error for a row-raised one. The record is unchanged (**AC-430**) |
| **Confirm, raced** | `{reference} was reversed by {reversal} while this was open. Nothing was posted twice.` — primary becomes `Close`. This is **AC-331**'s second tab, and it is the only place a Financials dialog ends with a single `Close` (§5.3's read-only footer), because at that point nothing remains to commit |
| **Committed** | Toast `{reference} reversed by {reversal}`; the ledger refetches and scrolls to its end; the original row now reads `Reversed` in **neutral** tone and links to the new row (**AC-328**, **AC-329**); a row-raised act converts its row in place |

**What the design supplies against the criteria, and what it does not.** AC-326–332 and AC-335 are
served by the shapes above; AC-333's *chosen* reason code is served only once §4's catalogue lands,
and until then the flow ships one field short with the shortfall named (§4.3). AC-334's audit entry
is the client's to write — this document's share is collecting the reason and the note.

---

## 3. The refund-issue flow — AC-336–338, AC-358–359

### 3.1 RF-1 — one entry point, and why it is the page header

A refund is not a correction of a posting; it is a **new economic event** against a payment
(§3.4b). The product has **no payments resource across the seam**, so there is no row of payments
to hang the act on. It is therefore a page-level action, `Issue a refund`, in the PageHeader of
**Revenue & Refunds**, present on every view of that sub-tab.

**Prohibitions.**

- The refund is **not** offered on Rider Wallets. A wallet credit with no credit note is an
  **adjustment**, and the two must never be reachable from one control — that confusion is exactly
  what §3.4d forbids by construction.
- **When a payments resource crosses the seam, the refund becomes a row action on that index and
  this page-level control is deleted, not kept beside it.** Two entry points to one money act is
  how the same predicate ends up declared twice and disagreeing (**D9**'s own reason).
- Nothing here cancels a subscription. Operations owns that; Financials shows the money it
  produces (§2.2).

### 3.2 RF-2 — compose → confirm, drawn

**State A — compose.** Six fields is the ceiling (§5.0). It is at six only when there is no
document; do not add a seventh.

```
┌─ Issue a refund                                                    ✕ ─┐
│                                                                       │
│  Name the trip or subscription this is against. Without one, the      │
│  credit note names no invoice.                                        │
│                                                                       │
│  Trip or subscription                                                 │
│  [ TRP-4182                                                       ]   │
│  A trip like TRP-4182, or a subscription like SUB-2210.               │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │ TRP-4182 · 19 Jul · Nora Al-Harbi                               │  │
│  │ Paid                                                 86.50 SAR  │  │
│  │ Already refunded                                     40.00 SAR  │  │
│  │ Refundable now                                       46.50 SAR  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  Amount                                                               │
│  SAR [ 40.00                                                      ]   │
│  Up to 46.50 SAR, what is left on TRP-4182.                           │
│                                                                       │
│  Where it goes                                                        │
│  ( ) Payment method used    Returned to the card that paid.           │
│  ( ) Rider wallet           Credited to the rider’s balance, at once. │
│                                                                       │
│  Reason code            [ Choose a reason                        ⌄ ]  │
│  Note                   [                                         ]   │
│                                                                       │
├───────────────────────────────────────────────────────────────────────┤
│                                          [ Cancel ]  [ Review refund ]│
└───────────────────────────────────────────────────────────────────────┘
```

**State B — confirm.** No input at all. Title, consequence, lines, the reason and note **restated
as read-only text**, `Change these details` as a body link back to State A, and the primary.

```
┌─ Refund 40.00 SAR to Nora Al-Harbi?                                ✕ ─┐
│                                                                       │
│  40.00 SAR returns to the payment method used for TRP-4182 and a      │
│  credit note is issued for it. The original posting is unchanged —    │
│  this is a new event, not a correction.                               │
│                                                                       │
│  Refund                                                  40.00 SAR    │
│  of which VAT                                             5.22 SAR    │
│                                                                       │
│  Reason  Rider requests a refund · “Cancelled after the captain       │
│          arrived at the wrong pickup.”          Change these details  │
│                                                                       │
├───────────────────────────────────────────────────────────────────────┤
│                                        [ Cancel ]  [ Refund 40.00 SAR]│
└───────────────────────────────────────────────────────────────────────┘
```

Destination = wallet adds two lines and changes three strings:

```
│  Refund                                                  40.00 SAR    │
│  of which VAT                                             5.22 SAR    │
│  Balance now                                             20.00 SAR    │
│  Balance after this refund                               60.00 SAR    │   ← emphasis
                                        [ Cancel ]  [ Credit 40.00 SAR ]
```

### 3.3 RF-3 — the amount's bound, and the bound that does not exist

**Q-F3 is open and the spec already set the interim rule**: *a refund is capped at the related
payment's amount*. That is buildable today without a payments resource, because both halves cross
the seam already — `Trip.fareHalalas` / `Trip.paymentId` via `getTrip`, and
`Subscription.paidHalalas` / `refundedHalalas` via `getSubscription`.

> **RF-4 — `Refundable now` = the document's paid amount, less every refund already issued
> against it.** It is the amount field's maximum, it is stated in the summary block before the
> operator types, and it is stated again in the field's message when exceeded:
> `Enter an amount up to {refundable}.`

**And where there is no document there is no bound, and the dialog says so rather than inventing
one.** Helper text: `Nothing bounds this amount — there is no document to check it against.`

> **RF-5 — the prohibition, and it is the AC-453 discipline applied to a ceiling.** **No
> Financials surface may display a refund authority ceiling that an authority check did not
> return across the seam.** A plausible number typed into a component is the failing case, exactly
> as it is for the cash-review SLA: once a ceiling is in the UI it is indistinguishable from a
> policy, forever. **AC-359**'s slot is designed and empty (§10, **Q-F3**).

The slot itself is slot ⑤ and it already has a working sibling in the shipped wallet adjustment —
`fin.authority.abovePerCase` — so when Q-F3 lands, the copy has a shape to land in.

### 3.4 RF-6 — the destination has no default, on purpose

**Q-F5 is open.** A default is a commercial choice, and pre-selecting one *is* making it.

> **RF-6.** The destination control ships with **no option selected**, and the primary stays
> disabled until the operator chooses. Each option carries a one-line consequence. Where
> `sourcePaymentId` is `null`, `Payment method used` renders **disabled in place** with the reason
> `No traceable payment to return it to.`

**Prohibitions.** Never both destinations — legacy does both and the business pays twice
(`12a` R1, **AC-337**). Never a remembered preference. Never a destination inferred from the reason
code. The chosen destination is named in the title, in the body, in the lines and in the primary's
label, so it is impossible to commit without having read it four times.

### 3.5 RF-7 — the duplicate path (AC-358)

The client raises `409 possible_duplicate` naming the earlier refund. The distinguishing input is
**the operator's confirmation, not elapsed time** — which is the whole correction to D-F13, whose
idempotency key has no time component and silently suppresses the second of two legitimate refunds.

On 409 the dialog **stays in the confirm state** and gains slot ⑤:

```
│  ┌ ⚠ A matching refund already exists.                             ┐  │
│  │   REF-0003 refunded 40.00 SAR to Nora Al-Harbi on 12 Jun for    │  │
│  │   the same reason. Issue this one only if it is a second,       │  │
│  │   separate refund.                                              │  │
│  │                                                  Open REF-0003  │  │
│  └                                                                 ┘  │
├───────────────────────────────────────────────────────────────────────┤
│                            [ Cancel ]  [ Issue a second refund ]      │
```

The primary's label **changes to name what will exist**, and pressing it sends
`confirmDuplicate: true`. **Prohibitions:** never a toast, never a page banner, never an automatic
suppression, never a re-press of the identical label — a label that does not change cannot record
a second decision.

### 3.6 Every state of the refund flow

| State | What renders |
|---|---|
| **Compose, idle** | Six fields, primary disabled |
| **Document resolving** | The field stays editable; the summary block is a **three-line skeleton in its own shape**, never a spinner (§7.1) |
| **Document not found** | `No trip or subscription carries the reference {reference}.` under the field; the rest of the form stays usable, because a documentless refund is legitimate |
| **No document given** | `No document. The credit note will name no invoice.` under the field, and the confirm body names the downstream consequence |
| **Amount above refundable** | Field message; primary disabled; **the amount is never silently reduced** (**AC-359**) |
| **Instrument unavailable** | That radio disabled in place with its reason |
| **Confirm, idle / in flight / failed** | As §2.7 |
| **Confirm, duplicate** | §3.5 |
| **Committed** | Toast `Refund {reference} issued`; the current view refetches; **the operator is not navigated** |
| **Role may not refund** | `Issue a refund` disabled **in place** in the PageHeader with its reason. Never hidden, never enabled-then-refused (**AC-434**) |

**AC-336's** *"the fare posting it relates to is unchanged"* is served by there being no control
anywhere in this flow that can touch it — the flow writes and never edits. **AC-338's** credit
note is the client's; this document's share is showing the VAT split before the commit so the
residual rule (M-3) is visible rather than asserted.

---

## 4. RC — the reason, ruled. **AC-387, and AC-333 with it**

### 4.1 RC-1 — a reason is two fields, and only one of them may be typed

> **RC-1.** `reasonCode` is **always chosen from a closed, server-supplied set** and is never
> typed. `note` is free text and is required wherever the act is discretionary. A control that
> writes a typed string into a `reasonCode` field is a defect regardless of whether the string is
> validated.

Three reasons, in order of weight:

1. **The code is an input to the authority check, not a label on it.** `compCheck` reads
   `rc.comp` — the per-scenario ceiling carried on the reason code itself — and refuses outright
   where a scenario permits no goodwill (`:15412`, `:14669`–`:14715`). A typed string has nothing
   to look up, so that branch cannot be reached at all. **This says nothing about AC-385's
   per-case and daily ceilings, which the build enforces correctly today and which a typed reason
   does not weaken** — the loss is the per-scenario ceiling specifically, and only that.
2. **A free string with no validator can be a placeholder and pass.** `DECISIONS.md` states the
   deciding question: *where a check exists, use it; where none does, close the set.* A reason code
   has referential integrity — something can verify it points at a real code. Use it.
3. **D-F21 is the free-string-authority defect in its purest form** — `reason.indexOf('Goodwill')
   >= 0` routes an authority check on a substring. A typed reason is the substrate that defect
   grows in.

### 4.2 RC-2 — the control

A grouped `Select`, not a combobox and not a radio list.

- Grouped by the code's **category**, in a fixed order; codes ordered within a group.
- Placeholder `Choose a reason`; **nothing pre-selected**.
- The list is **filtered to the codes valid for this act**. **Prohibition: a money surface never
  offers the whole support taxonomy** — thirty contact reasons in a payout confirmation is a list
  nobody reads, and a code chosen because it was nearest is worse evidence than no code.
- **Prohibition:** no `Other` code may carry a non-zero ceiling, and where an uncoded catch-all
  exists at all, the note is mandatory beside it.
- Empty catalogue → the control does not render and the act does not ship (§4.3). Never an empty
  select. Never a text input as a fallback.

### 4.3 RC-3 — two catalogues, and neither is mine

| Catalogue | Answers | Exists? | Owner |
|---|---|---|---|
| **Money reasons** — why money moved | a refund, an adjustment, a waiver, a repayment, an escalation | **Yes**, as `DB.reasonCodes` (`:14660`–`:14715`), already used by the fixtures (`PAY_REFUND_REQ`, `BKG_NO_SUPPLY`, `CAP_LATE`). It does **not** cross the seam | **Membership for money acts: product-owner with Finance.** The resource and its type: **mock-data-engineer** |
| **Correction reasons** — why a posting was *wrong* | a reversal | **No. It exists nowhere**, and it is a different question: not *why did money move* but *what was wrong with the record* | **product-owner with Finance.** §10, **Q-D2** |

The correction catalogue must cover the dimensions of *wrong*: **wrong amount · wrong party ·
wrong account · duplicate posting · authorised in error**. Naming its members is product scope and
this document does not name them.

> **RC-4 — what ships in the meantime, and what does not.** An act whose catalogue exists ships
> the code field. An act whose catalogue does not exist **ships no code field at all**, writes
> `reasonCode: null`, and requires the note. It does **not** ship a textarea labelled *Reason code*.
>
> **The consequence, stated plainly: AC-333's *chosen* reason code is not satisfiable for the
> reversal until Q-D2 is answered.** The flow ships one field short and the shortfall is named
> here rather than dressed as a code. `fin.wallet.adjust.reason.label` — *Reason code* over a free
> textarea — is the shipped instance of exactly that dressing (§9, defect 6).

---

## 5. Finding 1 ruled — AC-427 versus `DataTable`'s ledger branch

**The conflict.** `DataTable` renders `no-match` for every empty ledger on the reading that *a
ledger is NEVER first-run empty* (§9.2). **AC-427** requires a ledger with no postings ever to
render a first-run state with heading, body and an action. The build reconciled it with a
`hasHistory` prop from the caller and asked for a ruling. Here it is.

> **LR-1 — AC-427 stands, and §9.2's absolute narrows to a prohibition.** A **subject** ledger is
> first-run empty when its subject has never had a posting: a rider who has never held a balance, a
> captain who has never accrued. §9.2's absolute is true of a **platform** ledger — `contra.refunds`
> has history from the first refund and keeps it forever — and it was generalised from that case.
> The narrowed rule: **a platform-subject ledger is never first-run empty; a party-subject ledger
> can be.**

> **LR-2 — which empty a ledger shows is decided by the SUBJECT'S LIFETIME, not by the query's
> result.** First-run **iff** the subject has never had a posting at any time. Everything else —
> a period with nothing in it, a search with no hit, a view with no rows — is a narrowed empty, and
> its sentence names **what narrowed it**.
>
> **`hasHistory` is a server fact about the subject, period-independent.** Deriving it from the
> read that just returned zero is circular: it makes every quiet period claim that money has never
> moved. (§9, defect 1 — that is what shipped.)

> **LR-3 — no Financials empty state carries an illustration, and this spends none of R8's
> licence.** **R8** permits an illustration on a whole-page zero-records-ever state; it does not
> require one. Financials declines it, because **an operator never creates a posting**. Postings
> arrive from acts elsewhere, and §2.2 refuses the product a journal-entry composer, so the
> illustration would sit above an action the product does not offer. The heading, the body and the
> action stay (**AC-427**); the action is **the way back to where the money comes from**, never a
> create.

**LR-4 — the three ledger empties, drawn, with final copy.**

```
① The subject has never had a posting            ② The period is quiet
   (no illustration)                                (one grey sentence, no action)
┌───────────────────────────────────────┐        ┌───────────────────────────────────────┐
│  No money has moved through this      │        │                                       │
│  wallet                               │        │   No postings between 1 Jun and       │
│                                       │        │   30 Jun 2026.                        │
│  A top-up, a refund to the wallet or  │        │                                       │
│  a goodwill credit opens it. Nothing  │        └───────────────────────────────────────┘
│  has yet.                             │
│                                       │        ③ Filters or a search narrowed it
│  [ Back to wallets ]                  │        ┌───────────────────────────────────────┐
│                                       │        │   No postings match these filters.    │
└───────────────────────────────────────┘        │                       [Clear filters] │
                                                 └───────────────────────────────────────┘
```

| Ledger | ① heading | ① body | ① action |
|---|---|---|---|
| Rider wallet | `No money has moved through this wallet` | `A top-up, a refund to the wallet or a goodwill credit opens it. Nothing has yet.` | `Back to wallets` |
| Captain payable | `No earnings have reached this captain` | `A completed trip accrues earnings here, and a payout takes them out. Neither has happened.` | `Back to payouts` |
| Captain receivable | `This captain has never owed cash` | `A cash fare adds commission here. None has been collected from this captain.` | `Back to captains` |
| `contra.refunds`, trial balance, journal | **unreachable — a platform ledger is never first-run** | — | — |

**Prohibitions.** A ledger never renders the `cleared` empty — that is a work queue's, and a
ledger is not worked to zero. A ledger never renders ② and ③ together; where both a period and a
filter are narrowing, **③ wins**, because the filter is the thing the operator most recently
changed and the one the action can clear.

---

## 6. Finding 2 ruled — the view lists for Revenue and Payouts

**Confirmed, with a rule that generalises and two renames the build did not make.**

> **VW-1.** A ledger has **exactly one** subject account (§3.2), and **AC-308** requires the card
> header to name it. **A view that would union two subjects is not a ledger — it is an index of
> subjects**, and it renders as one, with the identity link as the boundary to each subject's
> ledger (§5's own construction for Rider Wallets). *All postings* is therefore struck on Revenue &
> Refunds and on Payouts & Escrow. It is not renamed, not deferred, not shipped narrower.

> **VW-2.** `revenue.fares` has no postings — only journal lines — so it has **no subject ledger**
> and cannot be a view. Fare revenue is read where journal entries are read: Ledger & Payment
> Controls. `Revenue by plan` is the correct shape for *"where did revenue come from"* and it is an
> aggregate table, not a ledger.

> **VW-3 — the labels must name what the view shows.** A view label names its subject account or
> its document type. **Prohibition: no Financials view is labelled with a promise of a union.**

**Final view lists.**

| Sub-tab | Views, in order | Default | Shape of each |
|---|---|---|---|
| **Revenue & Refunds** | `Revenue by plan` · `Refunds` · `Refunds ledger` · `Credit notes` · `Contribution margin` | `Revenue by plan` | aggregate · index · **ledger (`contra.refunds`)** · index · summary card |
| **Payouts & Escrow** | `Payouts` · `Escrow` · `Deductions` | `Payouts` | index-of-ledgers · index · index |

`Refunds` and `Refunds ledger` are two shapes of one population and both earn their place: the
index answers *who, why and where it went*; the ledger answers *what the balance did*. §8.3 forbids
merging them, and the labels distinguish them without a gloss.

**What this changes in the built screen:** `fin.revenue.view.all` currently labels a
`contra.refunds` ledger `All postings`, and `fin.revenue.view.revenue` labels `Revenue by plan`
`Revenue`. Both tabs currently say something the card beneath them contradicts (§9, defect 4).

---

## 7. Finding 3 confirmed — AC-353 and the five position tiles

**Confirmed. A balance-sheet position has no period; it has a date.**

> **TL-1.** A tile whose value is a **position** — owed to captains, escrow held, escrow ready,
> captain cash debt, rider wallet balances — states that it covers no period. The shipped caption
> `Balance to date, outside the period.` is correct, is a legal **scope limit** under R4-4 §4.2 as
> amended by **R5-4**, and is 36 of the 38 characters that rule allows. **It stays.**

> **TL-2 — the guard is the client call, not the caption, and naming the layer is the point.** The
> five position tiles must be served by a read that **takes no period**. A caption cannot repair a
> tile whose client accepted a period and ignored it — that tile would be wrong in a way no string
> can fix. The caption states a fact about a number that is already period-free.

**Prohibitions.** A position tile never accepts the period parameter. It never renders a delta
against a previous period. It never sits in the same group as a flow tile — the shipped separation
into `The period` and `Where the money is held` is what makes the caption legible, and it stays.

**One thing product-owner must edit.** **AC-353**'s second clause — *"every tile states the period
it covers"* — cannot hold for a tile that covers no period, and the passing behaviour is the one
shipped. The criterion needs *"every tile states its window, and a tile with no window states that
it has none."* **That edit is product-owner's; this document does not make it and does not tick
it.**

---

## 8. Finding 4 ruled — D8-b. The kebab begins at **three**

**The conflict.** `DataTable` collapses two declared row actions into a kebab. **R4-6 §6.4 clause
2** rules that *"two actions is not a kebab"*. One must yield.

**Neither is D8 verbatim, and that is the actual finding.** The owner's words cover **one** action
(*"if only 1 action put the action not 3 dots"*, *"still kebab with 1 item"*) and a **decision
pair** (*"if it's approve/reject put them check and cross and view"*). D8's table then wrote *"3 or
more, no decision pair"* for the kebab and left **two undefined**. `DataTable` chose the kebab as
the safe reading and said so; R4-6 chose the opposite. This is a **gap in D8**, not a collision
between two equal rulings, and filling it is the job.

> **D8-b.** The actions lane's shape comes from the count of **declared** actions — never enabled
> ones, so the lane cannot jitter down a table:
>
> | declared | renders |
> |---|---|
> | 0 | nothing, and no lane |
> | 1 | that action, labelled |
> | **2** | **both actions, labelled, in declared order, in one lane** |
> | 3 or more | the `⋯` kebab |
> | a **decision pair**, any count | direct controls plus `View` — D8's own row, unchanged |
>
> **R4-6 §6.4 clause 2 stands. `DataTable`'s threshold moves from 2 to 3.**

**Why two is not a kebab:**

1. **D8's own reason.** *"The `⋯` menu is a disclosure for a list. Where there is no list, it hides
   a single control behind a click and a read."* Two is not a list. The cost D8 objects to — a
   click and a read, on every row of a queue worked all day — is identical at two and at one.
2. **D8's decision-pair row already renders three controls directly at n=2 dispositions.** A rule
   that shows three at two and hides two at two is incoherent on its own terms.
3. **Every overflow menu I opened in the reference is a genuine list, and the one row control I
   found is a labelled button.** `04-customers/customer-segments-row-actions-menu.webp` — five
   items, `Delete` separated last. `02-orders/order-detail-more-actions-menu.webp` — six.
   `03-products/product-edit-variants-bulk-actions-menu.webp` — five, one of them disabled in
   place. And in that last capture **every variant row carries a single labelled `Edit` button
   rather than a kebab**, which is D8's n=1 rule already in the source material. I did not read
   all 159 captures, so this is evidence for D8's premise — *the kebab is a list container* — not
   a census.
4. **The build shipped both shapes in one wave** — Rider Wallets and captain debt with two direct
   controls in a hand-declared column, Payouts, Escrow and Deductions through `rowActions` and
   therefore behind a kebab. That is precisely the drift a ruling exists to stop, and it is now
   inside a single sub-tab.

**Two constraints that come with the ruling, and do not move:**

- **§7.7 hit target.** Two labelled controls in one cell must each be a legal target. If they
  cannot be, the row is too short — that is a row-height finding, not a licence to shrink a target.
- **§7.5 / AC-68.** Both controls are visible at rest, keyboard-operable, and carry accessible
  names. **An icon-only disposition is permitted only for approve/reject**; every other pair —
  `Apply` / `Waive` on a deduction, for one — carries its verb. `✓` and `✗` are not
  self-explanatory to a screen reader, and *waive* is not *reject*.

> **D8-c — the width discipline, stated as a prohibition.** A table that cannot afford a
> two-control lane at 1280 in Arabic does **not** fall back to a kebab. It **drops the control
> that only navigates**, because every index row already carries an identity link and a second
> control to the same destination is a duplicate of it.

Applied, and this is the part that removes the pressure the kebab was relieving:

| Table | Today | Under D8-b + D8-c |
|---|---|---|
| Rider wallets | `Adjust` + `View ledger`, **and the rider name already links to that same ledger** | **`Adjust`** — one action. The duplicate goes |
| Captain debt | `Record repayment` + `View ledger` | **`Record repayment`** — one action; the captain name becomes the link |
| Payouts | `Pay` + `View ledger` | **`Pay` + `Reverse`** — two, both labelled; the captain name becomes the link |
| Escrow | `Release` | **`Release` + `Re-hold`** — two, both labelled |
| Deductions | `Apply` + `Waive` | unchanged — a **decision pair**, two labelled verbs |
| Zones (`/management/zones`) | not built | **`Steer drivers` + `Queue recruitment`**, both labelled — R4-6 §6.4 clause 2, unchanged |

**What yields, precisely, and who does it.** One threshold in `DataTable`, a Phase-0 file:
`declaredActions.length === 1 ? 'single' : 'menu'` becomes a three-way with a two-control lane, and
`rowActionsWidth` becomes that lane's declared width. **That is a request to the shell owner. No
screen implements it locally, and the two hand-declared action columns in Financials are deleted
once it lands** — a screen working around a primitive is how two shapes ship for one situation.

---

## 9. What is wrong in the built code

Nine, each checked in the file rather than inferred from a report.

| # | Where | What | Why it matters |
|---|---|---|---|
| **1** | `RevenueScreen`, `PayoutsScreen`, `CashScreen`, `WalletsScreen` — `hasHistory={(ledger.data?.totalPostings ?? 0) > 0}` | **Circular.** `totalPostings` is the **query** envelope's total. When a query returns nothing it is `0`, so `hasHistory` is `false`, so **every** unfiltered empty ledger takes the first-run branch. The period is **not** part of `isFiltered` (`useFilters.ts:98` — `filters.length > 0 \|\| query !== ''`), so a quiet month on the platform refunds ledger renders *"No money has moved here yet"* about a ledger with years of history. **`LedgerCard` renders `LedgerHeader` above that state**, and `buildLedger` folds everything before the window into `openingBalanceHalalas` — so the card can show a real balance and *"No money has moved here yet"* at the same time, on the same screen | **LR-2.** It needs a subject-lifetime fact from the server, not the count of what the last read returned |
| **2** | `LedgerCard.tsx:344` | `<EmptyState kind="first-run">` inside a card renders `DefaultIllustration` — an illustration on a card state, which **R8** forbids | **LR-3.** And the prop cannot express *none*: `illustration ?? <DefaultIllustration/>` treats `null` as absent, so no caller can opt out. **A request to the primitives owner**, not a workaround in a screen |
| **3** | `copy.ts` — six toasts | `Payout sent` · `Escrow released` · `Deduction applied` · `Repayment recorded` · `Adjustment posted` · `Report resolved` / `Report escalated`. **None names its object.** **R9** requires the object exactly | Rewrites in §12. An operator running five payouts gets five identical toasts and cannot tell which one landed |
| **4** | `RevenueScreen.tsx:76–85` | The view tab `All postings` renders a `contra.refunds` **ledger**; the tab `Revenue` renders **Revenue by plan**. Both tabs contradict the card beneath them, and the ledger's own header correctly names `Refunds (contra revenue)` per **AC-308** | **VW-3.** The header is right and the tab is wrong, which is the worse way round — the tab is what the operator clicked |
| **5** | `PayoutsScreen.tsx:30` | The header comment states *"two declared row actions is not a kebab"* while the file passes two actions to `DataTable`, which renders a **kebab** (`DataTable.tsx:366`). The comment and the code disagree | Under **D8-b** the code moves and the comment becomes true. Today it is a false statement in a source file, and a false statement in a comment is how a wrong belief propagates to the next reader |
| **6** | `WalletsScreen.tsx:233`, `copy.ts` | `fin.wallet.adjust.reason.label` reads **`Reason code`** over a free `Textarea` — the request passes no `options` | **RC-1/RC-4.** A label promising a code over a field that accepts anything is the exact dressing RC-4 forbids. Either the catalogue crosses the seam, or the label is `Note` |
| **7** | `ConfirmMoneyDialog.tsx` | One `reason` field — select **or** textarea, never both. §3.6 requires a reason code **and** a free-text note | **MC-5.** The component needs a second field, not a caller convention |
| **8** | `ConfirmMoneyDialog.tsx` | **No in-dialog error slot.** `useMoneyActions` renders a failure on a **row**, and a page-raised act has no row, so a failed reversal or refund from the PageHeader has nowhere to render | **MC-7 / slot ⑧** |
| **9** | `ConfirmMoneyDialog.tsx:130` | The reset `useEffect` keys on `request?.title` — a **string of display copy** decides state identity. Two acts sharing a title do not reset; a translation change silently alters reset behaviour | Identity is an `id`, not a label. It has not bitten because today's titles embed amounts and names — which is luck, not design |

**One thing that is right and should not be "fixed":** `majorUnits` renders a negative prefill with
an ASCII hyphen rather than U+2212. That is correct — it is an **input** value that must parse back
(**MC-4f**), and U+2212 there would be a bug.

---

## 10. What this document refuses to decide

| # | Question | Blocks | Owner |
|---|---|---|---|
| **Q-D1** | **Can a refund be reversed, and what happens to its credit note?** §3.2 says a `contra.refunds` credit means *"a refund was reversed"*, and §3.4b mints a credit note as the tax document. Nothing anywhere says how a credit note is cancelled — and a gapless legal sequence is not something a console may quietly void. **Until this is answered the refunds index carries no reverse action and §2.5's refusal 4 names the boundary.** The spec did not notice this case | The refund's reverse action | **product-owner with Finance** |
| **Q-D2** | **The correction-reason catalogue.** What makes a posting *wrong*: amount, party, account, duplicate, authorised in error. It exists nowhere. **AC-333's chosen code is unsatisfiable until it lands** | AC-333's code field | **product-owner with Finance** |
| **Q-F3** | The refund authority ceiling. **RF-5** forbids displaying one that no check returned, so the slot is designed and empty | **AC-359** | product-owner with Finance |
| **Q-F5** | The refund destination default. **RF-6** ships no default, which is the honest rendering of an unanswered commercial question | AC-337's default | Finance lead |
| **Q-F2 / D4** | Which permission gates each write control. Every control here gates at **render**, disabled in place, on the nearest money key until this lands | The gate keys | Business owner |
| **Q-F7** | The second approver's queue. **AC-386**'s note (slot ④) is designed; the queue it points at does not exist | AC-386's destination | Business owner |

**Three seam gaps, all small, all mock-data-engineer's:**

1. A **reason-code resource** — `{ code, labelKey, category, permitsMoneyMovement, perCaseCapHalalas }` — with membership per act from Q-D2 / product-owner. Nothing in the UI can be built against a taxonomy that does not cross the seam.
2. `relatedId` is **searchable but not filterable** on `refundShape`, so *"refunds already issued
   against this document"* (**RF-4**) can only be reached by free-text `q`. One line.
3. `hasHistory` as a **subject-lifetime field on the ledger envelope**, period-independent
   (**LR-2**).

---

## 11. What is still owed, and it is not small

§14's *For product-designer* list has ten items. **This document covers item 5 in full, item 6 for
the ledger's three empties only, and adds the two flows §14 did not list.** The remaining seven —
the ledger's row anatomy at 1280 and 1440, the opening and closing rows against the header balance,
the `Pending` line, the R5a treatment on a ledger row, the empty/error/forbidden/not-found copy for
all seven sub-tabs, the Stage-A banner, the derived-versus-disabled treatment in the plan editor
(**AC-392**, the hardest visual thing in the wave), the formula panel and preview strip, and the
work queue beside a ledger on one route — **have no design document.** They were built from the
spec directly. That gap is stated here so it is not assumed closed by the existence of this file.

---

## 12. Copy — final, every string

Sentence case. Buttons are verbs. No exclamation marks, no emoji, no *successfully*. Full sentences
take a period; fragments, labels and buttons do not (**R6**). Every string is a key with named
placeholders; nothing is concatenated (**AC-443**).

### 12.1 Reversal — `fin.reversal.*`

| Key | English |
|---|---|
| `action.page` | `Reverse a posting` |
| `action.payout` | `Reverse` |
| `action.escrow` | `Re-hold` |
| `action.deduction` | `Reverse` |
| `blocked.notPaid` | `Nothing has been paid yet.` |
| `blocked.processing` | `Wait for the bank to settle this.` |
| `blocked.payoutFailed` | `The money did not leave. There is nothing to reverse.` |
| `blocked.alreadyReversed` | `Already reversed.` |
| `blocked.notReleased` | `This hold has not been released.` |
| `blocked.notApplied` | `This deduction has not been applied.` |
| `blocked.waived` | `A waived deduction posted nothing.` |
| `find.title` | `Reverse a posting` |
| `find.body` | `Enter the reference of the posting to reverse. A posting that came from a payout, a refund or a deduction is reversed on that document, not here.` |
| `find.label` | `Posting reference` |
| `find.help` | `As it appears in the Reference column.` |
| `find.confirm` | `Find posting` |
| `find.notFound` | `No posting carries the reference {reference}. Check the Reference column.` |
| `find.reversed` | `{reference} was reversed by {reversal} on {date}.` |
| `find.reversedAction` | `Open {reversal}` |
| `find.hasDocument` | `{reference} came from {document}. Reverse the document instead.` |
| `find.documentAction` | `Open {document}` |
| `find.isRefund` | `{reference} is a refund. Its credit note is a tax document and it cannot be cancelled from this console.` |
| `find.otherSubject` | `{reference} is on another ledger — {subject}.` |
| `find.otherSubjectAction` | `Open that ledger` |
| `found.direction.debit` | `Debit` |
| `found.direction.credit` | `Credit` |
| `found.balanceAfter` | `Balance after` |
| `found.notThis` | `Not this posting` |
| `confirm.title` | `Reverse {reference} of {amount}?` |
| `confirm.body` | `A reversing posting is written to {subject}. {reference} keeps its amount, its column and its place, and links to the new row.` |
| `confirm.body.payout` | `A reversing posting is written to {subject}. {reference} keeps its place, and the {amount} already sent to the bank is not recalled by this.` |
| `confirm.balanceNow` | `Balance now` |
| `confirm.balanceAfter` | `Balance after this reversal` |
| `confirm.confirm` | `Reverse posting` |
| `rehold.title` | `Re-hold {amount} against {subscription}?` |
| `rehold.body` | `The release is reversed on {captain}’s payable ledger and the hold returns to Held. The trips already delivered are unchanged.` |
| `rehold.confirm` | `Re-hold` |
| `release.title` | `Release the hold on {reference}?` |
| `release.body` | `No money has moved, so nothing is posted. {reference} shows Released and its {amount} leaves the Pending line.` |
| `release.pendingNow` | `Pending now` |
| `release.pendingAfter` | `Pending after this release` |
| `release.confirm` | `Release hold` |
| `note.label` | `Note` |
| `note.help` | `One line. It goes on the new posting with your name.` |
| `note.message` | `Enter a note naming what was wrong.` |
| `raced` | `{reference} was reversed by {reversal} while this was open. Nothing was posted twice.` |
| `raced.close` | `Close` |
| `toast` | `{reference} reversed by {reversal}` |
| `toast.released` | `{reference} released` |
| `toast.reheld` | `{reference} back on hold` |

### 12.2 Refund — `fin.refund.issue.*` and `fin.refund.confirm.*`

| Key | English |
|---|---|
| `issue.action` | `Issue a refund` |
| `issue.title` | `Issue a refund` |
| `issue.body` | `Name the trip or subscription this is against. Without one, the credit note names no invoice.` |
| `issue.document.label` | `Trip or subscription` |
| `issue.document.help` | `A trip like TRP-4182, or a subscription like SUB-2210.` |
| `issue.document.notFound` | `No trip or subscription carries the reference {reference}.` |
| `issue.document.none` | `No document. The credit note will name no invoice.` |
| `issue.paid` | `Paid` |
| `issue.alreadyRefunded` | `Already refunded` |
| `issue.refundable` | `Refundable now` |
| `issue.rider.label` | `Rider` |
| `issue.rider.help` | `Who receives the money.` |
| `issue.rider.message` | `Name the rider.` |
| `issue.amount.label` | `Amount` |
| `issue.amount.help` | `Up to {refundable}, what is left on {document}.` |
| `issue.amount.helpUnbounded` | `Nothing bounds this amount — there is no document to check it against.` |
| `issue.amount.message` | `Enter an amount up to {refundable}.` |
| `issue.destination.label` | `Where it goes` |
| `issue.destination.instrument` | `Payment method used` |
| `issue.destination.instrumentHelp` | `Returned to the card that paid.` |
| `issue.destination.instrumentBlocked` | `No traceable payment to return it to.` |
| `issue.destination.wallet` | `Rider wallet` |
| `issue.destination.walletHelp` | `Credited to the rider’s balance, available at once.` |
| `issue.destination.message` | `Choose where the money goes.` |
| `issue.reason.label` | `Reason code` |
| `issue.reason.help` | `Why the money is going back.` |
| `issue.reason.message` | `Choose a reason.` |
| `issue.note.label` | `Note` |
| `issue.note.help` | `One line. It goes on the refund with your name.` |
| `issue.note.message` | `Enter a note naming what happened.` |
| `issue.continue` | `Review refund` |
| `confirm.title.instrument` | `Refund {amount} to {rider}?` |
| `confirm.title.wallet` | `Credit {amount} to {rider}’s wallet?` |
| `confirm.body.instrument` | `{amount} returns to the payment method used for {document} and a credit note is issued for it. The original posting is unchanged — this is a new event, not a correction.` |
| `confirm.body.wallet` | `{amount} is credited to {rider}’s balance and a credit note is issued for it. The original posting is unchanged — this is a new event, not a correction.` |
| `confirm.body.noDocument` | `{amount} is refunded with no document behind it, so the credit note will name no invoice. It joins the unmatched credit-note count.` |
| `confirm.line.refund` | `Refund` |
| `confirm.line.vat` | `of which VAT` |
| `confirm.line.balanceNow` | `Balance now` |
| `confirm.line.balanceAfter` | `Balance after this refund` |
| `confirm.reason` | `Reason` |
| `confirm.change` | `Change these details` |
| `confirm.instrument` | `Refund {amount}` |
| `confirm.wallet` | `Credit {amount}` |
| `duplicate.title` | `A matching refund already exists.` |
| `duplicate.body` | `{reference} refunded {amount} to {rider} on {date} for the same reason. Issue this one only if it is a second, separate refund.` |
| `duplicate.action` | `Open {reference}` |
| `duplicate.confirm` | `Issue a second refund` |
| `toast` | `Refund {reference} issued` |

### 12.3 Shared — `fin.reason.*`, `fin.confirm.*`

| Key | English |
|---|---|
| `fin.reason.placeholder` | `Choose a reason` |
| `fin.reason.label` | `Reason code` |
| `fin.reason.help` | `Why the money moved. It goes on the posting.` |
| `fin.reason.message` | `Choose a reason.` |
| `fin.confirm.error` | `That did not go through. Try again.` |
| `fin.confirm.cancel` | `Cancel` |

### 12.4 Ledger empties — replacing `fin.empty.firstRun.*`

| Key | English |
|---|---|
| `fin.ledger.empty.period` | `No postings between {from} and {to}.` |
| `fin.ledger.empty.wallet.heading` | `No money has moved through this wallet` |
| `fin.ledger.empty.wallet.body` | `A top-up, a refund to the wallet or a goodwill credit opens it. Nothing has yet.` |
| `fin.ledger.empty.wallet.action` | `Back to wallets` |
| `fin.ledger.empty.payable.heading` | `No earnings have reached this captain` |
| `fin.ledger.empty.payable.body` | `A completed trip accrues earnings here, and a payout takes them out. Neither has happened.` |
| `fin.ledger.empty.payable.action` | `Back to payouts` |
| `fin.ledger.empty.receivable.heading` | `This captain has never owed cash` |
| `fin.ledger.empty.receivable.body` | `A cash fare adds commission here. None has been collected from this captain.` |
| `fin.ledger.empty.receivable.action` | `Back to captains` |

`fin.empty.noMatch` and `fin.empty.clear` are unchanged. **`fin.empty.firstRun.*` is deleted, not
retargeted** — *"No money has moved here yet"* over *"Read the chart of accounts"* is a heading
that lies on a quiet period and an action that answers a question nobody asked.

### 12.5 Toast rewrites — R9, six of them

| Key | Was | **Is** |
|---|---|---|
| `fin.payout.toast.paid` | `Payout sent` | `Payout sent to {captain}` |
| `fin.escrow.toast.released` | `Escrow released` | `Escrow {reference} released` |
| `fin.deduction.toast.applied` | `Deduction applied` | `Deduction {reference} applied` |
| `fin.deduction.toast.waived` | `Deduction waived` | `Deduction {reference} waived` |
| `fin.debt.toast.repaid` | `Repayment recorded` | `Repayment recorded for {captain}` |
| `fin.wallet.toast.adjusted` | `Adjustment posted` | `Adjustment posted to {rider}’s wallet` |
| `fin.cash.toast.resolved` | `Report resolved` | `Report {reference} resolved` |
| `fin.cash.toast.escalated` | `Report escalated` | `Report {reference} escalated` |

**Each is ≤60 characters with a typical name and truncates the `{captain}` / `{rider}` placeholder
with an ellipsis at 60, never the verb** (**R9**).

---

## 13. Deviations

| Departure | Rule it suspends | Why |
|---|---|---|
| **None.** | — | Everything above sits inside an existing licence, and the three that look like deviations are not: a **row action on Payouts, Escrow and Deductions** is on an **index** table, and §8.3's prohibition is on **ledger** rows; a **page-level action on a ledger** is neither a row action nor bulk selection, and spec §3.6 Path 2 already rules it in; **no illustration on any Financials empty** declines **R8**'s permission rather than exceeding it. |
| **D8-b** amends **D8** | It fills D8's undefined n=2 row and moves `DataTable`'s threshold. It suspends nothing in `DESIGN.md` — §3.1's kebab is Shopify's and **R13** voids its figures | D8's own reason, its own decision-pair row, and 159 screenshots with no two-item overflow menu |
| **§9.2**'s *"a ledger is NEVER first-run empty"* narrows | **LR-1** | It is true of a platform ledger and was generalised from one. **AC-427** describes a party ledger, and both are real |

---

## 14. Handoff

**Artifact:** this file, `docs/05-restructure/design/10-financials-money-flows.md`.

| Role | What is theirs |
|---|---|
| **frontend-engineer** | §2 and §3 in full. §5's three empties. §6's two renames. §8's two deleted hand-declared action columns **after** the shell owner moves the threshold — not before, and never a local workaround. §9's defects 1, 3, 4, 5, 6. **Do not build a ceiling, a default destination, a refund reverse action or a correction reason code** — §10 names each owner |
| **shell owner** (`src/components/`) | `DataTable`'s action threshold (**D8-b**); `EmptyState`'s inability to render `first-run` without an illustration (defect 2); `ConfirmMoneyDialog`'s second reason field (defect 7), its error slot (defect 8) and its identity key (defect 9) |
| **utilities-engineer** | The **one posting/document resolver** the dialog's target step and the palette's target step both call (**RV-2**); the `refundable = paid − alreadyRefunded` helper (**RF-4**) so no caller subtracts it twice |
| **mock-data-engineer** | The reason-code resource; `relatedId` filterable on `refundShape`; `hasHistory` as a subject-lifetime field on the ledger envelope |
| **product-owner** | **Q-D1** and **Q-D2** (both new, both blocking a shipped criterion), **AC-353**'s wording, and the money-reason membership Finance must ratify |
