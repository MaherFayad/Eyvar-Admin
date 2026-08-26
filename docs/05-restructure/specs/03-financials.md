# 03 — Financials: the ledger model, and all seven sub-tabs

> **Phase 1, wave 3.** Owner: product-owner. Consumers: product-designer (design spec),
> mock-data-engineer (types + fixtures), utilities-engineer (money helpers, the debit/credit
> splitter), frontend-engineer (7 sub-tabs), qa + visual-qa.
>
> Inherits `specs/00-foundation.md` in full. Where this document is silent, the foundation
> spec governs. Where it disagrees, the foundation spec wins until amended there.
>
> **Acceptance criteria are numbered from AC-300** so they cannot collide with the
> foundation spec (AC-01–79), table controls (AC-80–116) or wave 2 (AC-2xx).
>
> **Line citations** are `eyvar_ops_panel_v40_fixed.html:<line>` unless another file is named.
>
> **§3 and §4 lead deliberately.** They are what unblock the data layer and the utilities
> layer; the seven screens are downstream of them.

---

## 1. Problem

An Eyvar operator cannot answer *"where did this money go, and can I trust the number?"*
There are four surfaces that show money — `finance`, `wallets`, `rwallets` and the `ledger`
settings pane — and they disagree with each other and with the data. The Finance page's seven
KPI tiles are **static HTML strings** (`:931`–`:939`): it claims `Eyvar net 9,246 / 19.2%`
while the table five rows below it claims `8,752 / 18.1%`, claims `501.98` held in escrow
while `renderEscrow()` computes `138.40` from the same array, and claims `65.00` in deductions
while the pending sum is `45.00` (`12a` R12). None of the four is a ledger: not one of them
renders the running balance that is already computed and persisted on every wallet posting
(`:3937`, `:3947`) and rendered nowhere in the product. The chart of accounts declares
`liability.escrow` and `liability.driver` and **never posts to either** (`12a` R11), so the
entire captain-money side is missing from the trial balance while the trial balance says
`✓ books balance`.

Corrections are worse than absent — they are destructive. `releaseEscrow` splices the hold out
of the array (`:7064`); `payDriver` hard-assigns `pending = 0` (`:7030`); `commitCashRepayment`
hard-assigns the debt to `0` with no amount input and no partial repayment (`:12207`). After
any of the three, the operator cannot see what the balance was, who changed it, or how to put
it back. Meanwhile a cancellation refund posts **twice** — once through `recordRefund` and
again through `creditRiderWallet` with the same amount (`:5562`–`:5563`, `12a` R1) — and the
contribution-margin card then subtracts it twice. And a live page carries two buttons labelled
`Post fares from trip history` and `Simulate a double-click refund` (`:20124`–`:20125`), the
second of which moves 50.00 SAR of real money through a rider chosen by `Object.keys()[0]`.

Underneath all of it sits an unanswered question that nobody could build past: **there is no
sign convention.** No wallet or posting type exists in `src/data/types`, so a utilities-engineer
declined to build the debit/credit splitter rather than guess — correctly, because the guess is
invisible until money renders backwards on screen.

---

## 2. Scope

### 2.1 In

1. **The ledger model** — the posting shape, the sign convention, the chart of accounts, and
   what a reversal, a refund, a chargeback and an adjustment each look like under it (§3).
   This is the deliverable that unblocks the other six items.
2. **The correction flow.** A ledger is append-only, so the spec must say what an operator
   actually does when a posting is wrong (§3.6).
3. **Money arithmetic** — rounding point, rounding direction, and every place a fractional
   halala can arise (§3.7).
4. **Financials › Overview** — `/financials/overview`.
5. **Financials › Revenue & Refunds** — `/financials/revenue`.
6. **Financials › Payouts & Escrow** — `/financials/payouts`.
7. **Financials › Cash & Captain Debt** — `/financials/cash`.
8. **Financials › Rider Wallets** — `/financials/rider-wallets`.
9. **Financials › Pricing & Plans** — `/financials/pricing` + editor
   `/financials/pricing/plans/:planId/edit`. Absorbs settings panes `pricing` and
   `cancelpolicy` (**D1**).
10. **Financials › Ledger & Payment Controls** — `/financials/ledger`. Absorbs settings panes
    `ledger` and `gateways` plus VAT / invoice config (**D1**).
11. **The plan editor's derived values**, specified once as the single source that both the
    formula panel and the computation read (§8).
12. **The permission change the D1 relocation causes**, and the regression it creates while
    **D4** is open (§11).

### 2.2 Out — each with its reason

| Out | Reason |
|---|---|
| **Deciding which pricing model is real (Q7)** | Foundation §12.2 assigns it to the Finance lead with the business owner. §4 sets out the evidence and a recommendation; it does not decide. An invented pricing rule is the single worst thing this wave could ship. |
| **Editing any rate, commission or discount** | Downstream of Q7. Specified as **Stage B** (§4.5) and every Stage B criterion is marked BLOCKED. Stage A ships without it. |
| **Layout, spacing, colour, component structure** | product-designer. This spec names the `DESIGN.md` §6.4 pattern row; the designer specifies it. The visual language is being re-derived under **D7** right now, so appearance claims here would be stale on arrival. |
| **The trip fare engine** | `platformCutHalalas` is server-returned specifically so four screens cannot show four different numbers (foundation §8.2 constraint, `src/data/types/trip.ts:81`). No Financials screen computes a fare. |
| **Subscription lifecycle actions** — freeze, change driver, cancel | Operations › Subscriptions (M4, wave 1). Financials shows the *money consequence* of a cancellation; it does not cancel. |
| **The trip that produced a posting** | Operations › Trips (M5, wave 1). A ledger row links to its source document; it does not embed it. |
| **Promo budgets, referral bonuses, captain incentives as *managed* objects** | Management › Growth (wave 4). They appear here only as contribution-margin cost lines, read-only. |
| **ZATCA Phase-2 e-invoicing** | Cryptographic stamping and Fatoora reporting need a certificate and a server. The legacy file says so honestly (`:15919`) and so does this. Phase-1 documents (invoice, credit note, VAT breakdown, QR fields) are in. |
| **The corporate-account invoice run** | Operations › Corporate Accounts (wave 1) owns billing config; Financials shows the postings it produces. |
| **Real payment-gateway integration** | Gateways here is a *report with two switches*, not an integration console. Transaction counts are computed from payment records (`:7457`). |
| **`backfillFareLedger()` and `demoDoubleRefund()`** | Developer tools rendered into the operator UI (`:20124`–`:20125`). `demoDoubleRefund` is an ungated, production-reachable money mover (`12a` R15). They are deleted, not ported. |
| **Retroactive repricing** | The rate card's own rule: a trip keeps the version it was priced under (`:21417`, `:21600`). Nothing in Financials reprices a completed trip. |
| **A general-purpose journal-entry composer** | An operator does not write journal entries. Postings are produced by acts (a payout, a refund, an adjustment); the journal is the record of those acts. Giving the console a free-form Dr/Cr form would make the app the accounting system, which the legacy module explicitly refuses to be (`:19861`). |

---

## 3. The ledger model — **Q13, answered**

### 3.1 The decision

> **D-F1 — A posting carries a positive integer `amountHalalas` and a `direction` of
> `'debit' | 'credit'`. There is no negative amount on a posting. A *balance* is signed and
> may be negative. Postings are unsigned with a direction; balances are signed.**

This is a decision, not a discovery, but every part of it is already the shape the legacy app
uses in the two places it models money properly:

| Evidence | Shape |
|---|---|
| The double-entry journal, `postLedger()` (`:19918`–`:19935`) | `{account, debit: <positive>}` / `{account, credit: <positive>}` — never a signed field |
| The rider wallet, `creditRiderWallet` / `debitRiderWallet` (`:3937`, `:3947`) and the seeds (`:2595`, `:2600`) | `{type: 'credit' \| 'debit', amount: <positive>, balanceAfter}` |
| Already shipped in this codebase | `WalletTransaction` in `src/data/types/rider.ts:36` — `type: 'credit' \| 'debit'` + `amountHalalas` |
| `DESIGN.md` §8.3.3 | *"Debit and credit are two columns, both holding positive numbers. The sign lives in the column choice."* |

And two reasons the alternative fails:

1. **A signed amount cannot pick a column.** §8.3.3 mandates two columns. With a signed
   `amount`, the renderer must re-derive the column from the sign — and `0` has no sign, so a
   zero-value posting (a fee waived to zero, a reversal of a reversal, a migrated opening row)
   would land in neither column or both. `direction` is total; `Math.sign` is not.
2. **Two nullable fields (`debitHalalas` / `creditHalalas`) can express two invalid states** —
   both set, or neither. `direction` plus one amount can express neither. Prefer the type that
   cannot represent a lie.

`DESIGN.md` §8.3.2's U+2212 rule is **not** in tension with this. It governs *values* — a
balance, a delta, a KPI. Postings are not values in that sense; they are entries in a column.

### 3.2 What `direction` means — the rule that stops money rendering backwards

`debit` and `credit` are **account-relative**, and every ledger surface in Financials declares
its subject account exactly once, in its card header. `direction` is always relative to that
subject.

| Subject account | Normal side | `credit` means | `debit` means | Positive balance means |
|---|---|---|---|---|
| Rider wallet — `liability.wallet`, scoped to one rider | credit | rider's balance goes **up** | rider's balance goes **down** | Eyvar owes the rider |
| Captain payable — `liability.driver`, scoped to one captain | credit | we owe the captain **more** (earnings accrued, escrow released) | we owe the captain **less** (payout made, deduction applied) | Eyvar owes the captain |
| Captain cash receivable — `ar.driver`, scoped to one captain | debit | captain **repaid** | captain **owes more** (commission on a cash fare, a wallet top-up they collected) | The captain owes Eyvar |
| Refunds — `contra.refunds` | debit | a refund was reversed | a refund was issued | Refunds issued to date |
| Escrow — `liability.escrow`, scoped to one subscription | credit | funds **held** | funds **released or refunded** | Held against undelivered trips |
| A GL account on Ledger & Payment Controls | its own (`:19947`) | per `ACCOUNTS[k].type` | per `ACCOUNTS[k].type` | per `accountBalance()` (`:19938`) |

This table is the whole answer to "does money render backwards". It matches
`DESIGN.md` §8.3.3's wireframe exactly: *Referral bonus* → **Credit** 20.00, balance 20.00;
*Trip fare* → **Debit** 6.40, balance 13.60. It also matches the consumer convention on a bank
statement, which is what a rider or a captain reads.

**`ar.driver` is new.** The chart of accounts today has `ar.rider` (declared at `:19867`,
**never posted to** — `12a` G8) and no captain receivable at all; captain cash debt lives in
`DB.driverCashDebt`, a bare signed map outside the books (`:12081`). Adding `ar.driver` is
recorded here as a **model change**, not a discovery, and it is what makes the Cash & Captain
Debt sub-tab a ledger instead of a scoreboard.

### 3.3 The posting type

Two related shapes. `mock-data-engineer` owns the files; this is the contract.

```
LedgerPosting              — one row on a subject ledger (a rider wallet, a captain
                             account, the refunds ledger, an escrow account)
  id                       string          e.g. WTX-0004, REF-0003, ESC-1041-R1
  subjectAccount           AccountKey      which ledger this row belongs to
  subjectId                string | null   rider id / captain id / subscription id;
                                           null for a platform-level account
  postedAt                 IsoDateTime     server clock, never a display string
  direction                'debit' | 'credit'
  amountHalalas            Halalas         POSITIVE INTEGER, always
  description              i18n key + params (§12) — never a concatenated sentence
  reference                string | null   the human-readable document number
  sourceType               'trip' | 'payment' | 'payout' | 'escrow' | 'deduction'
                           | 'refund' | 'credit-note' | 'cash-report' | 'adjustment'
                           | 'chargeback' | 'reversal' | 'opening'
  sourceId                 string | null   the id of that document; the row's ONE link
  kind                     'primary' | 'reversal' | 'refund' | 'chargeback' | 'adjustment'
  reversesPostingId        string | null   set only when kind === 'reversal'
  reversedByPostingId      string | null   back-link; see §3.5 for the one mutation rule
  settlement               'settled' | 'held' | 'authorised' | 'pending'
                           | 'reconciling' | 'released' | 'reversed' | 'voided'
                           | 'failed' | 'escalated'
  balanceAfterHalalas      Halalas | null  PERSISTED, signed; null for non-settled rows
  journalEntryId           string | null   the GL entry this posting belongs to
  actorId                  string | null   the operator, for operator-initiated postings
  reasonCode               string | null   required when kind === 'adjustment'

JournalEntry               — the balanced GL entry, shown only on Ledger & Payment Controls
  id                       string          JE-00001 (`:19931`)
  postedAt                 IsoDateTime
  type                     string          fare_capture | refund | wallet_credit | …
  reference                string          the idempotency key (`:19931`)
  lines                    AccountLine[]
  totalHalalas             Halalas         == sum of debit lines == sum of credit lines
  meta                     Record<string, string>

AccountLine
  account                  AccountKey
  direction                'debit' | 'credit'
  amountHalalas            Halalas         POSITIVE INTEGER
```

**Invariants the data layer must enforce, not the screen:**

- `amountHalalas` is a non-negative integer. A fixture with a negative posting amount is a
  fixture bug.
- `sum(lines where debit) === sum(lines where credit)` on every `JournalEntry`. An unbalanced
  entry is **refused**, not written — legacy already does this and keeps the refusal visible in
  `DB.moneyRejects` (`:19926`). Keep both behaviours.
- `balanceAfterHalalas` is persisted, never recomputed at render (`DESIGN.md` §8.3, foundation
  §7.2). It is signed.
- `reversesPostingId` is set **iff** `kind === 'reversal'`.

### 3.4 The four correction shapes, under this convention

The most important distinction in this document: **only one of these four is a correction.**
The other three are new economic events that happen to move money the other way. Conflating
them is how a ledger stops being evidence.

#### (a) Reversal — *"the posting was wrong"*

A posting that should never have existed, or existed with the wrong amount, party or account.

- **Shape:** a new posting, `kind: 'reversal'`, **opposite `direction`**, **identical
  `amountHalalas`**, `reversesPostingId` = the original.
- **Net effect on the subject balance:** exactly zero. Not approximately zero — the amount is
  copied, never recomputed, so it cannot drift by a halala.
- **The original row is not edited, hidden, greyed or struck through.** It keeps its amount,
  its balance-after, and its place in posting order. Its `settlement` becomes `reversed`
  (**neutral** tone, §8.3.4) and `reversedByPostingId` is set.
- **A wrong amount is reversed in full and re-posted**, never partially reversed. Two rows and
  a third, not one row with a delta — because "reverse 6.40, post 4.20" is auditable and
  "adjust by −2.20" is not.
- **GL:** the mirror image of the original entry's lines. Same accounts, directions flipped.
- **Reference implementation for the UI:** `DESIGN.md` §8.3.3's `WTX-0004`.
- **Reversing a reversal is legal** and produces a third row. It is not an edit and it is not
  a re-instatement of the original — the balance simply returns.

#### (b) Refund — *"the posting was right; we are giving the money back"*

The trip happened. The fare was earned. We are choosing to return it.

- **Shape:** a new posting, `kind: 'refund'`, its own reference (`REF-nnnn`, `:3181`).
  `reversesPostingId` is **null** — this is the load-bearing difference from (a). The original
  fare posting stays true because the trip is still true.
- **GL** (kept from `:19967`–`:19972`, which is correct): `contra.refunds` **Dr** net ·
  `tax.vat_output` **Dr** VAT · `cash.gateway` **Cr** total. The VAT leg is what stops the
  output tax staying declared on money we no longer hold.
- **It mints a credit note** (`:15862`), which is the tax document, and the credit note carries
  the VAT split. A refund with no credit note is not a refund; it is a hole in the VAT return.
- **The refund lands in exactly one place** — the original payment instrument (`cash.gateway`
  credit) **or** the rider wallet (`liability.wallet` credit). Never both. Legacy does both
  (`:5562` + `:5563`) and the business is charged twice for one refund (`12a` R1). Which one is
  a per-refund operator choice, defaulted per §9.2, and it is shown in the confirmation before
  it commits.
- A refund **is not** capped by the original payment today (`recordRefund` validates only
  `amount > 0`, `:3177`, `12a` R3). See **Q-F3**.

#### (c) Chargeback — *"the money left, and we did not decide it"*

The rider's bank reverses a capture. External, unilateral, and learned about after the fact.

- **Shape:** a new posting, `kind: 'chargeback'`, `reversesPostingId` **null**.
- **GL:** `ar.rider` **Dr** amount · `cash.gateway` **Cr** amount. This gives `ar.rider` its
  first consumer — it has been declared and unposted since it was written (`12a` G8).
- **A chargeback never reverses fare revenue.** The trip happened and the revenue was earned;
  we were simply not paid. Reversing `revenue.fares` on a chargeback would understate revenue
  and overstate the refund line, and the two are different management numbers.
- A gateway chargeback fee, where one exists, is a **separate posting** to `expense.*`, with
  its own reference. It is not netted into the chargeback amount.
- **Consequence on the rider:** the rider's balance may go negative. That is the `RDR-4001`
  −41.50 SAR fixture. Whether a negative balance blocks a booking is **Q9**, still open
  (foundation §12.2) — this spec renders the state and does not decide the policy.

#### (d) Adjustment — *"a deliberate, authorised change with no upstream document"*

Goodwill credit, ex-gratia captain payment, a written-off debt, a migrated opening balance.

- **Shape:** a new posting, `kind: 'adjustment'`, `reversesPostingId` **null**, `reasonCode`
  **required** (from `DB.reasonCodes`), `actorId` required.
- **GL** (kept from `:19983`–`:19987`): `expense.goodwill` or `expense.compensation` **Dr** ·
  `liability.wallet` **Cr**, for a rider credit. Captain side: `expense.*` **Dr** ·
  `liability.driver` **Cr**.
- **Authority-bounded.** It runs through `compCheck` (`:15412`) against `DB.compPolicy`
  (`:15379`) before it commits: per-case ceiling, daily ceiling, per-rider 150 SAR / 3 in 30
  days, and a second approver above 200 SAR.
- **An adjustment must never be used to fix a wrong posting.** If it is, the ledger loses the
  causal link between the error and its correction, and nobody can later prove the two were
  the same event. The UI enforces this by construction: the adjustment surface has no field in
  which to name another posting (§3.6).

**Summary table — the one an engineer will actually look at:**

| | `kind` | `direction` | amount | `reversesPostingId` | net balance effect | needs a reason code |
|---|---|---|---|---|---|---|
| Reversal | `reversal` | opposite of original | **copied** from original | set | zero | yes |
| Refund | `refund` | credit to the receiving account | independently entered | null | non-zero | yes |
| Chargeback | `chargeback` | Cr `cash.gateway`, Dr `ar.rider` | from the gateway event | null | non-zero | no — the reason is the bank's |
| Adjustment | `adjustment` | either | independently entered | null | non-zero | yes, and authority-checked |

### 3.5 The one mutation a posted row may receive

A posting is append-only, with exactly one exception, stated so nobody has to guess:

> **`reversedByPostingId` and `settlement` may be written once, by the act of reversal.**
> Nothing else on a posted row may ever change — not `amountHalalas`, not `direction`, not
> `description`, not `balanceAfterHalalas`, not `postedAt`.

`settlement` also advances along its own lifecycle for reasons that are not corrections
(`held → settled` on capture, `authorised → released`). Those are state transitions on a fact,
not edits to it, and each one is itself audited.

### 3.6 The reversal flow — what an operator does when a posting is wrong

This is product design, and it is the part the append-only rule makes non-obvious.

**§8.3 permits exactly one per-row control on a ledger: a read-only link to the source
document. So the reversal does not start on the ledger row.**

That is not a constraint being worked around — it is the correct product answer. **You do not
correct a ledger. You correct the act that wrote to it, and the ledger records the correction.**

**Path 1 — the posting has a reversible source document (the common case).**

1. The operator finds the wrong row on the ledger and follows its **source link** — the trip,
   the payout, the escrow release, the deduction, the wallet adjustment, the refund.
2. The source document carries the action: `Reverse this payout`, `Void this deduction`,
   `Re-hold this escrow`. The verb names the *act*, never "edit the ledger".
3. A confirmation modal states the verb and the amount in its title (`Reverse payout of
   640.00 SAR?`), the consequence in one sentence, the party affected, and **the resulting
   balance**, before and after. It requires a reason code and a free-text note.
4. On commit: the source document transitions, one new reversing posting appears on each
   affected ledger, one balanced reversing `JournalEntry` is written, and one audit entry is
   written naming the actor, the reason, and both posting ids.
5. The operator lands back on the ledger, at the new row, with a **toast** confirming the
   reversal — a transient confirmation, one surface (R10).

**Path 2 — the posting has no reversible source** (an opening balance, a migrated row, a
posting whose source document is itself already reversed).

1. The reversal is raised from a **page-level action** in the ledger's `PageHeader` —
   `Reverse a posting`. §8.3 forbids *row* actions and bulk selection; a page-level action is
   not either of those.
2. The modal asks for the posting **reference**, resolves it, shows the row it found in full
   (date, description, direction, amount, current balance-after) and refuses to proceed until
   the operator confirms it is the right one.
3. From there, steps 3–5 of Path 1.

**Rules that bind both paths:**

- **A posting may be reversed once.** A second attempt is refused, naming the reversing
  posting that already exists, with a link to it. Enforced with a deterministic idempotency
  key `('reverse', postingId)` through `withIdempotency` (`:19895`) — the one place the legacy
  key needs no time component, unlike the refund key which wrongly has none (`12a` R9).
- **A reversal is never bulk.** There is no "reverse 12 postings" affordance and no
  select-all. Each reversal is one decision about one fact.
- **A reversal that would take a balance somewhere impossible is still permitted** and the
  resulting balance is shown. A ledger records what happened; it does not veto arithmetic.
- **The operator who reversed it is on the row.** `actorId` renders in the description line.
- **A reversal on a `held` or `authorised` posting is a release, not a reversal.** The row
  transitions to `released` (neutral) and no new posting is written, because no money moved.
  This is the `releaseEscrow` case that legacy handles by splicing the record out of the array
  (`:7064`) and must not ship.

### 3.7 Money arithmetic — what rounds, when, and which way

Money is `Halalas`: an integer count of 1/100 SAR (`src/data/types/common.ts:24`). Nothing
stores a fraction of a halala. So a fractional halala can only exist **transiently, inside a
computation**, and the rules below are about resolving it before it becomes a posting.

**Where a fractional halala can arise — the complete list.** Every one of these is a rate
applied to an amount:

| # | Operation | Rate | Legacy site |
|---|---|---|---|
| 1 | VAT extracted from a VAT-inclusive price | ÷ 1.15 | `:4400`, `:15866`, `:19966` |
| 2 | Platform commission on a fare | × 20 % / 22 % | `:12089`, `:4463`, `:21493` |
| 3 | Plan discount | × (1 − d/100) | `:12986`, `:21489` |
| 4 | Return-leg factor | × 0.90 | `:21487` |
| 5 | Surge multiplier | × 1.2 – 2.0 | `:18661`, `:12404` |
| 6 | Pro-rata refund of an unused portion | × unusedFraction | `:5526` |
| 7 | Mid-cycle cancellation fee | × feePct/100 | `:5529` |
| 8 | Payment-fee and reserve floors on a plan quote | × 2.2 %, × 3.5 % | `:21494`–`:21496` |

15 % VAT on a VAT-inclusive amount is exact only when the amount is divisible by 23; 20 %
commission only when divisible by 5; the return-leg factor only when divisible by 10. In
practice **every real amount** hits a fraction. This is not an edge case.

**The rules.**

- **M-1 — Round once, at the point a number becomes a posting.** Intermediate arithmetic
  carries full precision. Legacy rounds at every step (`r2()` at `:19889`, plus
  `Math.round(x*100)/100` inline in at least nine further places), so a three-step chain rounds
  three times and the error compounds in one direction.
- **M-2 — Round half away from zero**, applied to the absolute value, then the `direction`
  carries the sign. Not JavaScript `Math.round`, which is half-toward-`+∞` and therefore
  asymmetric across zero: `Math.round(-0.5)` is `-0` while `Math.round(0.5)` is `1`. Balances
  in this product go negative (captain debt, overdrawn wallet), so an asymmetric rounder makes
  a percentage of a debit and the same percentage of the matching credit differ by one halala.
- **M-3 — A split never rounds both legs. Round the counterparty leg; take the platform's leg
  as the residual.** This is not invented — it is what the code already does in both places a
  split exists: `vat = amount − net` (`:19966`, `:15867`) and
  `platformCutHalalas = fare − driverEarn − stopFee` (`src/data/fixtures/trips.ts:11`). The
  consequence, stated plainly: **the platform absorbs the rounding, and the rider and the
  captain always see the round number.**
- **M-4 — A percentage is derived from two posted amounts, never the reverse.** `19.2%` on a
  KPI is `platformCut / gross`, computed from two integers already posted. A percentage is
  never a stored input to a money value on a Financials screen. (The plan editor's
  `Eyvar commission %` is an input to *pricing*, not to a posting — §8.)
- **M-5 — A displayed column total is the sum of the displayed rounded rows**, so the column
  adds up on screen. If the true total differs from the sum of the rows, the difference is a
  posting and appears as one, never as a display fudge.
- **M-6 — Formatting is not arithmetic.** Exactly one formatter (`formatMoney`, foundation
  §5.2 / utilities), `<amount> SAR`, always 2 dp, `,` thousands, tabular figures, U+2212 for a
  negative *value*. It never rounds — it receives an integer and renders it. The three legacy
  formatters (`fmtSAR()` `:4394`, the identical `fmt()` `:12985`, and raw
  `.toFixed(2)+' SAR'` `:6693`) collapse into it.

### 3.8 The chart of accounts

Kept from `:19865`–`:19877`, with three changes, each stated as a change:

| Key | Label | Type | Status |
|---|---|---|---|
| `cash.gateway` | Cash at payment gateway | asset | unchanged |
| `ar.rider` | Rider receivable | asset | **gains its first consumer** — chargebacks (§3.4c). Declared and unposted today (`12a` G8). |
| `ar.driver` | Captain cash receivable | asset | **NEW.** Replaces the off-books `DB.driverCashDebt` map (`:12081`). |
| `liability.wallet` | Rider wallet balances | liability | unchanged |
| `liability.driver` | Captain earnings payable | liability | **gains its first consumer on the payout side.** Declared, and payouts never post to it (`12a` R11). |
| `liability.escrow` | Plan escrow held | liability | **gains its first consumer.** Declared and never posted to (`12a` R11). |
| `tax.vat_output` | VAT output payable | liability | unchanged |
| `revenue.fares` | Fare revenue | revenue | unchanged |
| `contra.refunds` | Refunds (contra revenue) | contra | unchanged |
| `expense.driver_pay` | Captain earnings | expense | unchanged |
| `expense.goodwill` | Goodwill credits | expense | unchanged |
| `expense.emergency` | Emergency cover | expense | unchanged |
| `expense.compensation` | Rider compensation | expense | unchanged |

Adding the three consumers is what makes the trial balance structurally complete. Today it
prints `✓ books balance` while the entire captain-money side is missing from it, which is a
worse failure than printing `OUT OF BALANCE` would be.

---

## 4. Q7 — four pricing models, one product

**This is not decided here.** Foundation §12.2 assigns Q7 to the Finance lead with the
business owner, and this section exists to make their decision cheap rather than to make it
for them. What follows is what the evidence settles, what it does not, and how the sub-tab
ships in the meantime.

### 4.1 What the four actually are

| Store | What it holds | Governance | Who reads it |
|---|---|---|---|
| **`DB.plans`** (`:2889`) | Plan **catalogue**: `name`, `nameAr`, `duration`, `execute`, `cap`, `sortOrder`, `status`, `features[]` — **plus** `eyvarPct`, `discountPct`, `ecoMin`, `ecoKm`, `comfortMin`, `comfortKm` | none — direct edit, no version, no effective date | `commissionRateForPlan()` (`:4463`) and the dashboard cancel-cap alert (`:10366`). **That is all** (`14a` §19.1). |
| **`PLANS` + `CADENCE_META` + `CADENCE_DAYS` + `{weekly:5,biweekly:10,monthly:22}`** (`:4389`, `:4519`, `:11231`, `:21485`) | Frozen constants: flat plan totals and per-cadence discount / commission | none — they are source code | **The new-subscription modal and the renewal flow.** What a rider is actually quoted comes from here. |
| **`DB.quickRideTypes` + `DB.surgeSchedule` + `DB.surgeConfig`** (`:13908`, `:13883`, `:13861`) | Per-class `baseFare` / `perKm` / `perMin`, plus surge windows and a global cap | `manage_plans`, no version, no effective date | `quickRideFare()` (`:12401`) — the live quick-ride price |
| **`DB.rateCard`** (`:21431`) | Per-class `base` / `perKm` / `perMin` / `minFare` / `cancelFee` / `freeWaitMin` / `waitPerMin`, `commission.{onDemand,subscription}`, `returnLegFactor`, `planDiscountPct`, `surge.capByCity`, `floors` | **versioned, effective-dated, simulated against real trips, two-person approval, self-approval blocked, margin floor** (`:21556`–`:21611`) | `renderPricing()` and `planQuote()` — **the settings page only** |

They disagree on the numbers, not just the shape:

- **Commission:** cash reconciliation embeds a flat 20 % (`CASH_COMMISSION_RATE`, `:12078`);
  `CADENCE_META` says 20 / 18 / 15 by cadence; `DB.plans` says the same three but editable per
  plan; `DB.rateCard` says 22 % on-demand and 20 % subscription. Four answers.
- **Economy per-km:** `quickRideTypes` 1.10; `rateCard` 1.20; `DB.plans.ecoKm` 1.10 and it
  **never appears in the plans table** (`14a` §19.5).
- **Plan discount:** `CADENCE_META` 0/5/10; `rateCard.planDiscountPct` 12/16/20.
- **Cancellation fee:** `DB.cancellationPolicy` says 5 / 10 / 10 SAR flat regardless of class
  (`:13939`–`:13942`); `rateCard.classes` says Economy 8.00 and Comfort 12.00 (`:21440`). Only
  the policy table is enforced (`:11832`).

### 4.2 What the evidence does settle, without Finance

Three findings are mechanical, not commercial, and this spec records them as settled:

1. **The four cadence constants are four copies of the same three numbers.** `PLANS.exec`,
   `CADENCE_DAYS`, `DB.plans[*].execute`/`.duration` and the inline `{weekly:5,biweekly:10,
   monthly:22}` at `:21485` all encode "how many legs in a cadence". They are frozen source
   constants, editable by nobody and visible on no screen. **They are retired regardless of
   Q7's answer** — that is de-duplication, not a pricing decision. Whichever store wins, the
   values move into it.
2. **`DB.plans` is two things wearing one name.** Its catalogue half (EN/AR names, duration,
   execute days, cancel cap, sort order, status, feature bullets) has **no duplicate anywhere
   in the app**. Its pricing half duplicates `rateCard.commission`, `rateCard.planDiscountPct`
   and `rateCard.classes`. Q7 is a question about the second half only.
3. **Only `DB.rateCard` has the governance a price needs** — version, effective date,
   simulation, four-eyes approval, margin floor, surge cap, and the rule that a booked trip
   keeps the version it was priced under. **And that governance is inert:** `planFloorCheck()`
   has no call site anywhere in 21,857 lines (`14a` §19.22), and `renderNewSubModal` iterates
   `Object.keys(PLANS)`, never `DB.plans` and never the rate card (`:4571`). *The governed
   model is the one nobody uses; the used model has no governance at all.*

### 4.3 The recommendation — for the Finance lead to accept or reject

> **`DB.rateCard` is the price. `DB.plans` is the product catalogue. The constants are
> retired. `DB.quickRideTypes` merges into `rateCard.classes`.**

The split it implies: **a rate card owns *rates* — what a unit of service costs. A plan owns
*packaging* — what you buy, in which language, with which features, over how many days.**
Under it:

| Surface | Owns | Does not own |
|---|---|---|
| Pricing & Plans › **Rate card** view | `base`, `perKm`, `perMin`, `minFare`, `waitPerMin`, `freeWaitMin`, `commission.*`, `returnLegFactor`, `planDiscountPct`, `surge.capByCity`, `floors` | anything rider-facing |
| Pricing & Plans › **Subscription plans** view + editor | `name`, `nameAr`, `duration`, `execute`, `cap`, `sortOrder`, `status`, `features[]` | any rate, commission or discount — those are shown as **derived** from the live rate card (§8) |
| Pricing & Plans › **Quick rides** view | which classes exist and are active; surge windows | per-class rates — those are the rate card's `classes` |
| Pricing & Plans › **Cancellation fees** view | `DB.cancellationPolicy` scenarios, fees, grace, enabled | — but see the conflict below |
| **Nothing, anywhere** | `Trip.platformCutHalalas` | it is server-returned, and that constraint stands |

**One conflict this recommendation does not resolve, and Finance must:** cancellation fees exist
in `DB.cancellationPolicy` *and* in `rateCard.classes[*].cancelFee`, with different numbers and
different dimensions (scenario-based vs class-based). Only the policy table is enforced. Merging
them means picking a dimension. **Q-F1.**

### 4.4 The invariant that holds whatever Finance decides

`Trip.platformCutHalalas` is server-returned. **No Financials screen may recompute the platform
cut from a rate, a commission percentage or a plan.** Where a screen needs the cut, it reads the
field. Where it needs a percentage, it computes it from two posted amounts (M-4). This is what
stops four screens showing four numbers, and it is independent of Q7.

### 4.5 How Pricing & Plans ships while Q7 is open

**Stage A — buildable now, no Finance answer required.**

- The plan catalogue index (four views) and the plan editor, with the **catalogue** fields
  editable: `name`, `nameAr`, `duration`, `execute`, `cap`, `sortOrder`, `status`, `features[]`.
- Every **pricing** input in the editor renders in the §4.6 **disabled** treatment — the box,
  with reduced contrast — because it *will* become available once Q7 lands. That is exactly
  what §4.6 disabled means, and it is why disabled is right here and §8.2's derived treatment
  is not.
- One page-level **banner** (standing condition, so a banner not a toast — R10) naming the open
  question and who owns it. One banner, never one per field.
- The rate card renders **read-only in full**: version, status, effective date, per-class rates,
  commission, ladder, floors, surge cap, and the version history with its simulations.
- The derived values, the formula panel and the preview strip **all work** (§8), computed from
  the live rate card. They are the reason Financials is wave 3 and they are not deferred.

**Stage B — BLOCKED on Q7.** Editing any rate, commission, discount or cancellation fee;
`Propose a change`; `Approve`; the margin-floor block on publish. Every Stage B criterion below
is marked **BLOCKED**.

---

## 5. The screens

All seven from foundation §3.4, cross-referenced to their `DESIGN.md` §6.4 pattern row. **Every
one maps to an existing row.** No new page shape is invented here.

| # | Sub-tab | Route | Contributing legacy | §6.4 pattern | Page shape (foundation §3.10) |
|---:|---|---|---|---|---|
| 1 | **Overview** | `/financials/overview` | `finance` (contribution margin) + `wallets` KPIs + `rwallets` KPIs + pane `ledger` (trial balance) | Metric tiles + chart cards (§3.7) | Single column, capped |
| 2 | **Revenue & Refunds** | `/financials/revenue` | `finance` (revenue by plan, refunds ledger, credit notes, contribution-margin detail) | **Ledger (§8.3)** | Single column, full width |
| 3 | **Payouts & Escrow** | `/financials/payouts` | `wallets` (quick-ride payouts, subscription escrow, deductions) | **Ledger (§8.3)** | Single column, full width |
| 4 | **Cash & Captain Debt** | `/financials/cash` | `wallets` (cash reconciliation) | **Ledger (§8.3)** + escalations are a **Work queue (§8.4)** | Single column, full width |
| 5 | **Rider Wallets** | `/financials/rider-wallets` | `rwallets` + the goodwill ledger | **Ledger (§8.3)** | Single column, full width |
| 6 | **Pricing & Plans** | `/financials/pricing` · editor `/financials/pricing/plans/:planId/edit` | `plans` + `plan-edit` + panes `pricing`, `cancelpolicy` | Index table (§3.1–3.3) → **Sectioned form + save bar + derived values (§4.1, §2.3, §8.2)** | Single column; **the editor is the one full-bleed screen in the product** |
| 7 | **Ledger & Payment Controls** | `/financials/ledger` | panes `ledger`, `gateways` + VAT / invoice config | **Ledger (§8.3)** + Settings shell (§2.4) | Single column, full width |

**Views** (search params, never path segments — foundation §3.8.3):

| Sub-tab | Views |
|---|---|
| Revenue & Refunds | `All postings` · `Revenue` · `Refunds` · `Credit notes` · `Contribution margin` |
| Payouts & Escrow | `All postings` · `Payouts` · `Escrow` · `Deductions` |
| Cash & Captain Debt | `Reconciliation queue` (default, the work queue) · `Captain debt ledger` · `Over cap` |
| Rider Wallets | `All wallets` (index) → per-rider ledger · `Goodwill` · `Negative balances` |
| Pricing & Plans | `Subscription plans` (default) · `Quick rides` · `Rate card` · `Cancellation fees` |
| Ledger & Payment Controls | `Trial balance` (default) · `Journal` · `Reconciliation` · `Refused postings` · `Payment gateways` · `VAT & invoicing` |

**Two things this list is deliberately not.**

- **Cash & Captain Debt carries two patterns, not one.** The reconciliation queue is a §8.4
  work queue — it has a claim, a decision, and the row converts in place. The debt ledger is a
  §8.3 ledger. Foundation §3.4 already says so. They are two cards on one route with one view
  switch, not one hybrid table.
- **Rider Wallets is an index *of* ledgers.** The top level is an index table of riders (foundation
  §7.1 applies in full — selection, sort, filters); the second level, reached by the identity
  link, is that rider's ledger (§7.2 applies in full — no selection, no sort, no row actions).
  The two rule sets do not mix and the boundary is the identity link.

**Departure from the legacy `wallets` page, recorded:** the four KPI tiles and the two
side-by-side cards on `wallets` (`:987`–`:998`) become tiles on **Overview** and views on
**Payouts & Escrow**. The `finance` page's seven KPI tiles are **deleted, not migrated** —
every one is a hardcoded string and three of them contradict the live data (`12a` R12). Losing
them is the point, per `PROPOSED-STRUCTURE.md` §2.1 **P7**.

---

## 6. Data

**Derived** = computed by the app, never stored, never editable, `DESIGN.md` §8.2 treatment.
**Server** = read across the seam, integer minor units, never recomputed on the client.

### 6.1 Shared — every ledger surface

| Field | Type | Source | Derived |
|---|---|---|---|
| `postings` | `LedgerPosting[]` (§3.3) | server, oldest-first | no |
| `openingBalanceHalalas` | `Halalas` (signed) | server | no |
| `closingBalanceHalalas` | `Halalas` (signed) | server | no |
| `pendingHalalas` | `Halalas` | server — sum of `settlement ∈ {held, authorised, pending, reconciling}` | no — **server-computed**, and it is **excluded from the balance** (§8.3.4) |
| `totalPostings` / `returnedPostings` | `number` | server envelope | no |
| `truncationLabel` | string | — | **yes** — `Showing {shown} of {total} postings` |
| `runningBalance` per row | `Halalas` | `posting.balanceAfterHalalas`, **persisted** | **no — must not be recomputed** |
| `debitColumn` / `creditColumn` per row | `Halalas \| null` | `direction === 'debit' ? amount : null` | yes, trivially — this is the debit/credit splitter U-0.5 was blocked on |

### 6.2 Overview

| Field | Type | Source | Derived |
|---|---|---|---|
| `grossBookingsHalalas` | `Halalas` | server — sum of `revenue.fares` + `tax.vat_output` credits in period | no |
| `captainEarningsHalalas` | `Halalas` | server — `expense.driver_pay` debits in period | no |
| `grossMarginHalalas` | `Halalas` | — | **yes**: `gross − captainEarnings` |
| `grossMarginPercent` | `number \| null` | — | **yes**: `grossMargin / gross`; **`null` when `gross === 0`**, rendering `—`, never `0` |
| `givebackHalalas` | `Halalas` | — | **yes**: promo + referral + incentive + refunds + goodwill + emergency (`:15730`) |
| `contributionMarginHalalas` | `Halalas` | — | **yes**: `grossMargin − giveback` |
| `contributionMarginPercent` | `number \| null` | — | **yes**, same `null` rule |
| `pendingPayoutsHalalas` | `Halalas` | server — `liability.driver` credit balance | no |
| `escrowHeldHalalas` / `escrowReadyHalalas` | `Halalas` | server — `liability.escrow` split by `settlement` | no |
| `captainDebtHalalas` | `Halalas` | server — `ar.driver` debit balance | no |
| `riderWalletLiabilityHalalas` | `Halalas` | server — `liability.wallet` credit balance | no |
| `trialBalanceBalanced` | `boolean` | server — `totalDebits === totalCredits` | no |
| `refusedPostingCount` | `number` | server — `DB.moneyRejects` equivalent | no |
| `periodStart` / `periodEnd` | `IsoDate` | route search param, defaulting to the current month | no |

**Contribution margin, corrected against two known defects.** `gross` must filter to captured
payments **and** `captainEarnings` must filter to non-cancelled trips — legacy filters the
first and not the second (`:15721` vs `:15722`, `12a` R14), so cancelled trips carrying a
`driverEarn` depress margin with no matching revenue line. And a refund must be counted **once**:
legacy books it as `refunds` *and* as `goodwill` when the cancellation path double-posts
(`12a` R1).

### 6.3 Revenue & Refunds

| Field | Type | Source | Derived |
|---|---|---|---|
| `posting.*` | see §6.1 | server | — |
| `refund.id` | string | server (`REF-nnnn`) | no |
| `refund.riderId` / `riderName` | string | server | no |
| `refund.amountHalalas` | `Halalas` | server | no |
| `refund.reasonCode` | string | server | no |
| `refund.destination` | `'instrument' \| 'wallet'` | server | no — **new field**; legacy has no equivalent because it does both (`12a` R1) |
| `refund.sourcePaymentId` | `string \| null` | server | no — `null` is legitimate and renders as a warning row, not a fabricated link |
| `refund.processedBy` | string | server | no |
| `creditNote.noteNumber` | string | server, gapless sequence (`:15872`) | no |
| `creditNote.subtotalHalalas` / `vatHalalas` / `totalHalalas` | `Halalas` | server | no — VAT is the **residual** (M-3) |
| `creditNote.againstInvoice` | `string \| null` | server | no |
| `creditNote.unlinked` | `boolean` | server | no |
| `revenueByPlan[]` | `{planId, planName, activeSubs, trips, grossHalalas, platformHalalas, captainHalalas}` | **server** | no — every one of the seven values is a hardcoded string today (`:951`–`:957`) |
| `revenueByPlan[].platformPercent` | `number` | — | **yes**, from `platform / gross` (M-4) |

**`againstInvoice` must never be guessed.** Legacy falls back to *the first paid payment for
that rider* when it cannot match (`:15857`, `12a` R7) and marks the note `unlinked: false` —
a credit note against an unrelated invoice, silently "correct". Under this spec an unmatched
credit note is `unlinked: true`, full stop, and it appears in the `Credit notes` view with a
row-level critical signal (§8.4.6, not a badge — R5) and a page banner with a count.

### 6.4 Payouts & Escrow

| Field | Type | Source | Derived |
|---|---|---|---|
| `captain.id` / `name` / `tier` | string | server | no |
| `captain.tripsInPeriod` | `number` | server | no |
| `captain.earnedHalalas` / `paidOutHalalas` | `Halalas` | server | no |
| `captain.payableHalalas` | `Halalas` | server — the `liability.driver` balance for that captain | **no — server, not `earned − paidOut`** |
| `captain.cashDebtHalalas` | `Halalas` | server — `ar.driver` balance | no |
| `captain.netPayableHalalas` | `Halalas` | — | **yes**: `payable − cashDebt`, and it is what the payout action commits (§10, **AC-366**) |
| `escrow.id` / `subscriptionId` / `captainId` / `riderId` | string | server | no |
| `escrow.amountHalalas` | `Halalas` | server | no |
| `escrow.tripsRequired` / `tripsCompleted` | `number` | server | no |
| `escrow.progressPercent` | `number` | — | **yes**: `completed / required` |
| `escrow.settlement` | `'held' \| 'released' \| 'reversed'` | server | no — replaces the legacy `held`/`ready` string pair, where `ready` was a computed state stored as data |
| `escrow.isReleasable` | `boolean` | — | **yes**: `tripsCompleted >= tripsRequired && settlement === 'held'` |
| `deduction.id` / `captainId` / `type` / `tripId` | string | server | no |
| `deduction.amountHalalas` | `Halalas` | server | no |
| `deduction.status` | `'pending' \| 'applied' \| 'waived'` | server | no |
| `deduction.waivedBy` / `waivedReason` / `waivedAt` | `string \| null` | server | no — **new**; `waiveDeduction` today has no permission check, no confirmation, no reason and no audit entry (`12b` R1) |

### 6.5 Cash & Captain Debt

| Field | Type | Source | Derived |
|---|---|---|---|
| `report.id` / `tripId` / `captainId` / `riderId` | string | server | no |
| `report.expectedFareHalalas` | `Halalas` | server — from the trip, GPS + pricing | no |
| `report.reportedHalalas` | `Halalas \| null` | server — **`null` means never reported**, which is a distinct state from zero | no |
| `report.topupHalalas` | `Halalas` | server | no |
| `report.deviationHalalas` | `Halalas \| null` (signed) | — | **yes**: `reported − topup − expected`; `null` when never reported |
| `report.classification` | `'match' \| 'over_report' \| 'under_report' \| 'no_report'` | server | no — the tolerance band that produces it is server policy, not a client constant (`CASH_TOLERANCE = 2.00`, `:12079`) |
| `report.riderConfirmed` | `boolean` | server | no |
| `report.captainNote` | `string \| null` | server | no |
| `report.debtAddedHalalas` | `Halalas` | server | no — `commission + topup` (`:12089`) |
| `report.status` | `'pending' \| 'resolved' \| 'escalated'` | server | no |
| `report.claimedBy` / `claimedAt` / `slaDueAt` | see foundation §7.3 | server | no — this is a **work queue**; the ownership model is `DB.ownership`, not `_locking` |
| `report.repeatCount` | `number` | server | no — legacy computes it client-side by filtering the whole ledger per row (`:12098`) |
| `captainDebt.captainId` | string | server | no |
| `captainDebt.balanceHalalas` | `Halalas` (signed) | server — `ar.driver` balance | no |
| `captainDebt.isOverCap` | `boolean` | — | **yes**: `balance >= capHalalas` |
| `capHalalas` | `Halalas` | **server policy**, per Admin › Operational Policy | no — `CASH_DEBT_CAP = -300` is a client constant today (`:12080`) |

### 6.6 Rider Wallets

Index level: rider identity, `walletBalanceHalalas` (signed), `pendingHalalas`,
transaction count, `lastActivityAt`, `isNegative` (**derived**: `balance < 0`).
Detail level: `LedgerPosting[]` per §6.1, plus:

| Field | Type | Source | Derived |
|---|---|---|---|
| `goodwill.reasonCode` | string | server | no |
| `goodwill.authorityCheck` | `{allowed, perCaseCapHalalas, dailyCapHalalas, dailyUsedHalalas, per30dUsedHalalas, per30dCount, needsSecondApproval, blockedReason}` | **server** | no — `compCheck` (`:15412`) is authority, and authority is not a client computation |
| `compensationCapHalalas` | `Halalas \| null` | session (`src/data/types/session.ts:54`) | no |

### 6.7 Pricing & Plans

| Field | Type | Source | Derived |
|---|---|---|---|
| `plan.id` / `nameEn` / `nameAr` | string | server | no — **both names required on save** (`:6125`) |
| `plan.durationDays` / `executeDays` / `cancelCap` / `sortOrder` | `number` | server | no |
| `plan.status` | `'draft' \| 'active' \| 'archived'` | server | no |
| `plan.features[]` | `{en, ar}[]` | server | no — both required, ≤ 60 chars each (`:6050`) |
| `plan.commissionPercent` / `discountPercent` | `number` | **rate card** under §4.3, `DB.plans` today | Stage A: **disabled input**, not derived (§4.5) |
| `plan.perMinuteHalalas` / `perKmHalalas` per class | `Halalas` | **rate card** under §4.3 | Stage A: **disabled input** |
| `plan.driverSharePercent` | `number` | — | **yes**: `100 − commissionPercent` |
| `plan.exampleGrossHalalas` / `exampleTotalHalalas` / `exampleDriverHalalas` per class | `Halalas` | — | **yes** — §8 |
| `rateCard.version` / `status` / `effectiveFrom` / `effectiveTo` | string | server | no |
| `rateCard.classes[*]` | `{label, baseHalalas, perKmHalalas, perMinHalalas, minFareHalalas, cancelFeeHalalas, freeWaitMin, waitPerMinHalalas}` | server | no |
| `rateCard.commission` | `{onDemandPercent, subscriptionPercent}` | server | no |
| `rateCard.returnLegFactor` / `planDiscountPercent` / `floors` / `surge` | see `:21449`–`:21461` | server | no |
| `rateCard.simulation` | `{trips, riderBeforeHalalas, riderAfterHalalas, deltaPercent}` | server | no — a simulation is run against real trips, not on the client |
| `rateCard.proposedBy` / `approvedBy` | `string \| null` | server | no |
| `cancellationRule.id` / `appliesTo` / `scenario` | string | server | no |
| `cancellationRule.feeHalalas` \| `feePercent` | `Halalas` \| `number` | server | no — **which one depends on `appliesTo`**, and that is a discriminated union, not two nullable fields |
| `cancellationRule.graceMinutes` | `number \| null` | server | no |
| `cancellationRule.enabled` / `locked` | `boolean` | server | no |
| `cancellationRule.hasEnforcement` | `boolean` | server | no — **new**; see §13 D-F7 |
| `surgeWindow.*` | `{id, label, startHour, endHour, days[], multiplier, enabled}` | server | no |
| `surgeSuspension.*` | `{zoneId, reason, setBy, startedAt, expiresAt}` | server | no |
| `surgeSuspension.expiresIn` | string | — | **yes**, and it is a **live** derived value: it counts down |

### 6.8 Ledger & Payment Controls

| Field | Type | Source | Derived |
|---|---|---|---|
| `trialBalance.rows[]` | `{account, label, type, balanceHalalas}` | server | no |
| `trialBalance.totalDebitsHalalas` / `totalCreditsHalalas` | `Halalas` | server | no |
| `trialBalance.balanced` | `boolean` | server | no |
| `trialBalance.entryCount` | `number` | server | no |
| `journal[]` | `JournalEntry[]` (§3.3) | server, newest-first — this is the one exception to oldest-first, because the journal has no running balance | no |
| `refusedPostings[]` | `{reference, type, reason, attemptedAt, lines[]}` | server | no |
| `reconciliation[]` | `{label, operationalHalalas, ledgerHalalas}` | server | no |
| `reconciliation[].differenceHalalas` | `Halalas` (signed) | — | **yes**: `operational − ledger` |
| `idempotency.operations` / `duplicated` / `suppressed` | `number` | server | no |
| `gateway.id` / `name` / `type` | string | server | no |
| `gateway.enabled` / `isDefault` / `isCustom` | `boolean` | server | no |
| `gateway.transactionCount` / `volumeHalalas` | `number` / `Halalas` | **server**, per period | no — computed live today by prefix-matching a payment's `method` string (`:7457`), which is string matching standing in for a foreign key |
| `vatConfig.registrationNumber` / `companyLegalName` / `companyAddress` / `ratePercent` | string / number | server | no |
| `invoiceSequence.next` / `lastIssued` | number / string | server | no — gapless numbering is a legal requirement, so the sequence is server-owned |

---

## 7. States

The four base states exist on **every** card, view and async read across all seven sub-tabs
(`docs/ref/states.md`). Below is what is *additional* — the domain states, which is where the
defects live.

### 7.1 The four, at Financials scope

| State | Where it is not obvious |
|---|---|
| **Loading** | A ledger's skeleton has the ledger's own six columns and its opening/closing rows — not a generic table skeleton, and never a spinner. A KPI tile's skeleton is a tile, not a blank. |
| **Empty** | Two kinds, and Financials gets both wrong easily. *First-run* (`No postings yet`, illustration, action) vs *filtered-to-zero* (`No postings match these filters`, one grey sentence, clear-filters). A **wallet with a zero balance and no history** is first-run. A **wallet with history, filtered to a date range with nothing in it** is filtered-to-zero. |
| **Error** | Card-scoped, with the toolbar still rendered so the operator can change the query that failed (foundation §7.1). Copy names the fix as an imperative, never "please", "invalid" or "failed". |
| **Content** | A ledger with content still renders its opening and closing rows. A one-posting ledger has three rows. |

### 7.2 Domain states — money

| State | Where | Tone (§3.4) | What the operator sees |
|---|---|---|---|
| `settled` / `captured` / `paid` | fare capture, completed payout | **success** | Included in the balance and the running-balance column |
| `held` | escrow against undelivered trips | **warning** | A separate labelled `Pending` line beneath the balance. **Excluded from the balance and from the running-balance column** — the balance column shows `—` on that row |
| `authorised` | a subscription payment hold before capture | **warning** | Same as `held`; the description says what it is waiting for |
| `pending` | a cash report awaiting review | **warning** | Same |
| `reconciling` | a cash report classified but not decided | **warning** | Same |
| `released` | a hold that expired or was lifted with no charge | **neutral** | Terminal. No action left. No new posting — no money moved |
| `reversed` | a posting cancelled by a reversal | **neutral** | The row keeps its amount and its place; a link points to the reversing row |
| `voided` | a document cancelled before it posted | **neutral** | Terminal |
| `failed` | a payout the bank rejected | **not a badge — R5** | Row-level critical signal (§8.4.6): 3 px `--red` leading edge, the words in the description, and a page banner with a count and `Show only failed` |
| `escalated` | a cash report sent to Trust & Safety | **not a badge — R5** | Same three-part R5a treatment |

### 7.3 Domain states — the operator's own position

| State | What the operator sees |
|---|---|
| **A cash report claimed by another operator** | The owner chip shows the other operator's name; both dispositions render **disabled in place** with the reason (foundation §7.3, gate at render). A confirmed takeover is available and writes an audit entry. Never "claim silently on open" (`:19301`). |
| **A cash report the operator holds** | Owner chip reads `You`; dispositions enabled; the SLA countdown runs |
| **A cash report past its SLA** | All three parts of R5a — page banner with a count and `Show only breached`, 3 px leading edge on the row, and the countdown pill reading `overdue 14m` **in words** |
| **A posting already reversed** | The source document's reverse action renders disabled, naming the reversing posting and linking to it |
| **A refund above the operator's authority** | The amount field accepts it; the confirmation refuses it and names the ceiling and who can grant it. It does **not** silently truncate the amount |
| **An adjustment needing a second approver** (> 200 SAR, `:15388`) | The confirmation says so before commit; the posting is created in `pending` and appears in the second approver's queue |
| **A role that may view but not act** (`◐`) | Every write control renders **disabled in place** with its reason available. Never hidden, never enabled-then-refused |

### 7.4 Domain states — the surfaces

| State | What the operator sees |
|---|---|
| **Trial balance out of balance** | A page-level **critical banner** naming the difference in SAR and linking to the refused-postings view. It replaces the `⛔ OUT OF BALANCE` inline string (`:20081`), which is a status wearing a colour |
| **A refused posting exists** | Banner with a count; the `Refused postings` view carries the reason per row. Refusals are kept visible, never dropped — legacy gets this right (`:19926`) and it stays |
| **A credit note with no invoice** | Row-level critical signal + a page banner with a count. Never a fabricated link (§6.3) |
| **A captain over the debt cap** | The row carries the R5a leading edge; the `Record repayment` action is available; a `Cash collection suspended` state renders on the captain's row and on their 360° profile |
| **A rider wallet below zero** | The balance renders with U+2212 in `--ink` (§8.3.2). **Whether it blocks a booking is Q9, unanswered** — until it is, the screen states the balance and takes no position |
| **Escrow ready to release** | The `Release` action enables; the progress reads `10/10 trips delivered` |
| **Escrow on a cancelled subscription** | Neither held nor releasable — a distinct state, and legacy has none. **Q-F4** |
| **A rate card draft awaiting approval** | Rendered in the version list with its simulation delta; `Approve` is **disabled for the proposer** with the reason on it, not enabled-then-refused (`:21586` refuses at commit today) |
| **A rate card draft with no simulation** | `Approve` disabled, reason: a price nobody modelled cannot be approved (`:21590`) |
| **A surge suspension running** | Listed with a live countdown to expiry; it cannot be extended, only re-raised (max 12 h, `:21527`) |
| **A gateway disabled** | Its switch is off; the **default** gateway's switch is disabled with the reason `Set a different default first` (`:7480`, correct behaviour, kept) |
| **A plan whose Arabic name is missing** | Save is blocked with the error on both name fields (`:6125`, correct, kept) |

---

## 8. Derived values — the plan editor, specified once

`DESIGN.md` §8.2 governs the treatment. This section supplies the thing §8.2 says must exist
and does not: **one definition per computed field, which both the formula panel and the
computation read.**

### 8.1 The two legacy defects this closes

1. **`gv()` and `numval()` disagree about a blank input.** `gv(id)` (`:12984`) returns
   `parseFloat(value) || 0` — a blank field is **0**. `numval(id, fallback)` (`:6150`) returns
   `isNaN(v) ? fallback : v` — a blank field is **the previously stored value**. The preview
   strip reads `gv`; `savePlan()` reads `numval` (`:6131`–`:6140`). The operator clears
   `Discount %`, watches the preview recompute at 0 %, presses Save, and stores 10 %.
2. **The formula panel and the compute function are two artefacts.** `:1125` is hand-written
   HTML; `cr()` (`:12986`) is the code. Nothing links them. They agree today, which is worse
   than disagreeing, because it means the drift will be silent when it comes.

### 8.2 The single source

> **D-F2 — Each computed field is defined once, as a named entry in one plan-pricing
> definition. The formula panel renders from those definitions. The computation evaluates
> them. There is no second copy of any formula anywhere, in code or in markup.**

Each definition carries: an id, an i18n label key, the ordered list of input field ids it
reads, the expression, and the unit. Two consequences fall straight out and are testable:

- The formula panel's line count equals the definition count. A definition with no rendered
  line, or a rendered line with no definition, fails the build.
- The recompute listener set equals the union of every definition's inputs. Legacy binds 7
  listeners (`:13000`) while the formula and save read 11 — `fp3-duration`, `fp3-cap`,
  `fp3-sort` and the status select are unbound (`DESIGN.md` §8.2.3), so the strip shows a
  stale number with no indication.

### 8.3 The blank-input rule

> **D-F3 — A blank numeric input is `null`, not `0` and not the previous value. Exactly one
> coercion function serves both preview and save. A derived value with a `null` input renders
> `—` (§8.2's rule), and Save is blocked with the error on the blank input.**

`0` and "unset" are different facts, and `Discount %` is exactly where the difference costs
money. Neither legacy answer is right: `gv`'s `0` silently prices a plan at full rate, and
`numval`'s fallback silently keeps a value the operator believes they deleted.

### 8.4 The definitions

Inputs, per class *c* ∈ {Economy, Comfort}: `perMinuteHalalas[c]`, `perKmHalalas[c]`,
`commissionPercent`, `discountPercent`, `executeDays`. Example constants: 20 min, 10 km,
declared in the column header literally (`:1119`).

| id | Label key | Reads | Expression | Unit |
|---|---|---|---|---|
| `driverSharePercent` | `pricing.derived.driverShare` | `commissionPercent` | `100 − commissionPercent` | % |
| `grossPerTrip[c]` | `pricing.derived.gross` | `perMinuteHalalas[c]`, `perKmHalalas[c]` | `exampleMinutes × perMinute + exampleKm × perKm` | halalas |
| `discountedPerTrip[c]` | `pricing.derived.discounted` | `grossPerTrip[c]`, `discountPercent` | `grossPerTrip × (1 − discountPercent/100)` | halalas |
| `planTotal[c]` | `pricing.derived.planTotal` | `discountedPerTrip[c]`, `executeDays` | `discountedPerTrip × executeDays` | halalas |
| `driverEarns[c]` | `pricing.derived.driverEarns` | `planTotal[c]`, `commissionPercent` | `planTotal × (1 − commissionPercent/100)` | halalas |
| `platformKeeps[c]` | `pricing.derived.platformKeeps` | `planTotal[c]`, `driverEarns[c]` | `planTotal − driverEarns` | halalas — **the residual (M-3)** |

The chain matches `cr()` (`:12986`) and the printed formula (`:1125`), which is why adopting it
is not a behaviour change — it is the same arithmetic with one owner. `platformKeeps` is new
and is the residual, so the three legs always sum exactly.

**Rounding inside the chain:** M-1. `grossPerTrip`, `discountedPerTrip` and `planTotal` carry
full precision; the first rounding is at `driverEarns`, and `platformKeeps` takes the residual.

### 8.5 The worked example

`DESIGN.md` §8.2.4 requires the worked example to be computed by the **same code path** as the
production value. Today the plan example applies no surge while the production fare path does
(`:12345` vs `:12401`–`:12405`), so the example understates during a surge window.

> **D-F4 — The plan editor's worked example is computed from the same definitions as the
> preview strip, and it is explicitly labelled as excluding surge — because surge is
> structurally excluded from plan legs** (`rateCard.surge.appliesToPlanLegs: false`, `:21459`,
> and `fareFor(..., {isPlanLeg:true})` forces the multiplier to 1, `:21474`).
>
> **The Quick-rides view's example is a different case and is a real defect: it must include
> surge, because the quick-ride fare does.**

Two example columns, two rules, and each one states its own assumption in its `.formula-note`.

### 8.6 Validation

- `commissionPercent` and `discountPercent`: `0 ≤ x ≤ 100`, **enforced in code**, not in an
  HTML attribute. `fp3-comm` carries `max="100"` with no JS clamp and `fp3-disc` carries no
  maximum at all (`:1102`), so a discount above 100 % produces a negative plan total that
  renders in the preview and saves cleanly.
- The error goes on the **input**, plus one page-level critical banner naming the input to
  fix. **Never on the derived value** — a derived value has no input of its own and cannot be
  invalid.
- **A recompute does not arm the save bar.** Dirty means an editable field differs from its
  persisted value.
- **Every editable control is read by the save handler.** The status select at `:1105` is read
  by nothing in `savePlan()`, so an operator can change it, see it change, save, and lose it.
  Either wire it or remove it — this spec wires it.

---

## 9. Acceptance criteria

Numbered from **AC-300**. Each is independently checkable by a QA engineer without asking what
was meant.

### 9.1 The sign convention and posting rendering (AC-300–312)

- **AC-300** Every posting returned by every Financials client has an `amountHalalas` that is
  a non-negative integer. A fixture or response containing a negative posting amount fails.
- **AC-301** Every posting has `direction` set to exactly one of `'debit'` or `'credit'`.
  Neither is inferred from the sign of any field.
- **AC-302** In a ledger table, a posting with `direction: 'debit'` renders its amount in the
  **Debit** column and an em-dash `—` in the **Credit** column, and vice versa. No row has a
  value in both money columns.
- **AC-303** A posting with `amountHalalas: 0` still renders in the column named by its
  `direction`, as `0.00`, and not as `—`.
- **AC-304** A rider wallet ledger row created by a goodwill credit of 20.00 SAR renders in
  the **Credit** column and increases the running balance by 20.00.
- **AC-305** A rider wallet ledger row created by a trip fare of 6.40 SAR renders in the
  **Debit** column and decreases the running balance by 6.40.
- **AC-306** A captain payable ledger row created by a completed payout renders in the
  **Debit** column and decreases the amount Eyvar owes that captain.
- **AC-307** A captain cash-receivable row created by commission owed on a cash fare renders
  in the **Debit** column and increases the amount that captain owes Eyvar.
- **AC-308** Every ledger card header names its subject account in words, and the sub-line
  states which direction increases the balance. A ledger rendering postings without a named
  subject fails.
- **AC-309** A negative *balance* renders with U+2212 (`−`) immediately before the digits, no
  space, in the default ink colour. It is never placed in a badge, pill or coloured chip, and
  never rendered with accounting parentheses.
- **AC-310** Removing all colour from a Financials screen (forced monochrome) leaves every
  debit, credit, negative balance and failed state still distinguishable. Colour is never the
  only signal for any of them.
- **AC-311** The running-balance column renders `posting.balanceAfterHalalas` exactly.
  Mutating an earlier posting's amount in a fixture and re-rendering does **not** change any
  later row's balance column.
- **AC-312** A posting with `settlement ∈ {held, authorised, pending, reconciling}` renders
  `—` in the running-balance column and its amount is excluded from the card-header balance.
  Its amount appears in a separate labelled `Pending` line beneath the balance.

### 9.2 Ledger structure (AC-313–324)

- **AC-313** No ledger renders a selection checkbox in its header row or in any body row.
- **AC-314** No ledger renders a floating bulk-action bar, at any selection state.
- **AC-315** No ledger row renders a `…` kebab or any row action other than a link to its
  source document.
- **AC-316** No ledger column header is clickable to sort, and no ledger header shows a sort
  indicator.
- **AC-317** A ledger renders its rows oldest-first, with a labelled opening-balance row first
  and a labelled closing-balance row last, both emboldened on both sides.
- **AC-318** A ledger's closing-balance figure equals the balance in its card header, to the
  halala.
- **AC-319** A ledger's Debit column total equals the sum of its rendered debit rows, and the
  Credit column total equals the sum of its rendered credit rows.
- **AC-320** A ledger returning fewer postings than exist states so in words below the last
  row: `Showing 150 of 412 postings`. No ledger caps rows silently.
- **AC-321** The ledger column order is Date · Reference · Description · Debit · Credit ·
  Balance, in every Financials ledger, with Debit, Credit and Balance right-aligned and each
  sharing a right edge with its header.
- **AC-322** The unit `(SAR)` appears once per money column, in the column header, and in no
  cell of that column.
- **AC-323** A money value outside a table — a KPI tile, a key-value row, a banner, a toast, a
  modal summary — carries the `SAR` code.
- **AC-324** The "recent activity" rail-card variant renders at most six rows, newest-first,
  omits the Balance column entirely, and ends with a link to the full ledger.

### 9.3 Corrections (AC-325–338)

- **AC-325** No ledger row exposes an edit or delete control, at any permission level.
- **AC-326** Reversing a posting produces exactly one new row, with the opposite `direction`,
  an `amountHalalas` identical to the original's, and a description naming the reversed
  posting's reference.
- **AC-327** After a reversal, the subject's closing balance equals its value immediately
  before the original posting was applied, to the halala.
- **AC-328** After a reversal, the original row is still present, still shows its original
  amount in its original column, still shows its original balance-after, and is in its
  original position.
- **AC-329** After a reversal, the original row's settlement reads `Reversed` in the neutral
  tone and links to the reversing row.
- **AC-330** Attempting to reverse an already-reversed posting is refused, and the refusal
  names the existing reversing posting and links to it. No second reversing row is created.
- **AC-331** Committing the identical reversal twice (double-click, retry, second tab)
  produces exactly one reversing posting.
- **AC-332** Reversing a posting whose settlement is `held` or `authorised` transitions it to
  `Released` and creates **no** new posting.
- **AC-333** A reversal cannot be initiated without a reason code; the confirmation's primary
  action is disabled until one is chosen.
- **AC-334** A reversal writes one audit entry naming the actor, the reason code, the original
  posting id and the reversing posting id.
- **AC-335** No Financials surface offers a bulk-reverse affordance, a select-all, or a
  reverse action operating on more than one posting.
- **AC-336** A refund creates a posting with `reversesPostingId: null`, and the fare posting it
  relates to is unchanged — same amount, same column, same settlement.
- **AC-337** A refund credits exactly one destination — the payment instrument or the rider
  wallet — and the confirmation names which one before it commits. The subject's total credited
  after one 40.00 SAR refund is 40.00 SAR, not 80.00.
- **AC-338** A refund produces exactly one credit note, whose subtotal and VAT sum to the
  refund total to the halala, and whose VAT is the residual.

### 9.4 Money arithmetic (AC-339–345)

- **AC-339** No money value crossing the client seam is a float, a formatted string, or a
  number with a fractional part. Every one is an integer count of halalas.
- **AC-340** Every money string on every Financials screen renders with exactly two decimal
  places, a `,` thousands separator above 999, tabular figures, and the `SAR` code positioned
  per AC-322/AC-323. Grepping the seven sub-tabs' source for `toFixed` returns zero hits
  outside the shared formatter.
- **AC-341** A zero money value renders `0.00 SAR`, never `—`. An unknown or not-applicable
  value renders `—`, never `0.00 SAR`.
- **AC-342** A percentage whose denominator is zero renders `—`, never `0%`, never `NaN`,
  never `Infinity`.
- **AC-343** For any journal entry, the sum of its debit lines equals the sum of its credit
  lines exactly. An entry failing this is refused, not written, and appears in the
  `Refused postings` view with its reason.
- **AC-344** For a fare of 100.00 SAR with a captain earning of 80.00 SAR, the platform cut
  renders as exactly 20.00 SAR and equals `Trip.platformCutHalalas`. No Financials screen
  computes it from a commission percentage.
- **AC-345** Applying 15 % VAT extraction to 100.00 SAR produces a net and a VAT that sum to
  exactly 100.00 SAR. The same holds for every VAT-inclusive amount in the fixtures.

### 9.5 Overview (AC-346–353)

- **AC-346** No metric tile on Overview renders a value from a hardcoded string. Changing any
  underlying fixture changes the tile.
- **AC-347** Overview's gross-margin figure and the Revenue & Refunds contribution-margin
  card show the same gross-margin value, to the halala, for the same period.
- **AC-348** Overview's pending-payouts tile equals the sum of the payable balances on
  Payouts & Escrow for the same period, to the halala.
- **AC-349** Overview's escrow-held tile equals the sum of `held` escrow rows on Payouts &
  Escrow, to the halala.
- **AC-350** Overview's captain-debt tile equals the sum of positive `ar.driver` balances on
  Cash & Captain Debt, to the halala.
- **AC-351** When the trial balance does not balance, Overview renders one critical banner
  stating the difference in SAR and linking to the refused-postings view. No tile turns red.
- **AC-352** Contribution margin excludes cancelled trips' captain earnings, and a refund
  appears in exactly one cost line.
- **AC-353** Changing the period search param changes every tile on Overview, and every tile
  states the period it covers.

### 9.6 Revenue & Refunds (AC-354–361)

- **AC-354** Every row in the `Revenue` view is a posting with a source link that resolves to
  a real trip, payment or subscription.
- **AC-355** The `Revenue by plan` table is computed from postings; its total row equals the
  sum of its data rows for every column.
- **AC-356** A credit note with no matched invoice renders `unlinked`, carries the row-level
  critical signal, and appears in a page banner count. It never displays an invoice number it
  did not match.
- **AC-357** A credit note is never issued against a payment that does not relate to its
  refund. Given a rider with two paid payments and a refund related to the second, the credit
  note names the second.
- **AC-358** Issuing the same refund twice from the UI — same rider, same amount, same reason,
  same related id, within one session — produces two refunds when the operator genuinely
  intends two, and the duplicate-suppression path names the earlier refund when it does not.
  *(The distinguishing input is the operator's confirmation, not elapsed time. See Q-F3.)*
- **AC-359** A refund's amount field accepts an amount above the operator's authority; the
  confirmation refuses it, names the ceiling in SAR and names the role that can grant it. The
  amount is never silently reduced.
- **AC-360** A credit note's issue date is the date it was issued, not a frozen constant. Two
  credit notes issued on different days carry different dates.
- **AC-361** The `Contribution margin` view renders both the gross-margin percentage and the
  contribution percentage, each labelled, and never presents the gross figure alone.

### 9.7 Payouts & Escrow (AC-362–371)

- **AC-362** Paying a captain creates a debit posting on that captain's payable ledger for the
  amount paid. The captain's payable balance after equals the balance before minus the amount.
- **AC-363** A payout never sets a balance by assignment. Reversing the payout restores the
  previous balance exactly.
- **AC-364** Releasing escrow transitions the hold to `released` and creates a credit posting
  on the captain's payable ledger. The escrow row remains visible with its `Released` state.
  No escrow record is removed from the list.
- **AC-365** An escrow hold with `tripsCompleted < tripsRequired` renders its `Release` action
  disabled in place, with the reason visible, and the progress stated as `4/5 trips delivered`.
- **AC-366** A payout confirmation states the payable amount, the captain's outstanding cash
  debt, and the net amount to be transferred, as three labelled lines. The transferred amount
  is the net.
- **AC-367** A payout that fails renders the row with the R5a critical signal, states `failed`
  in words in the description, and appears in a page banner with a count. It is not a red badge.
- **AC-368** A payout that the operator's role may not perform renders its action disabled in
  place with the reason available. No spinner, no "submitting to bank network", and no success
  screen appears for an unauthorised payout.
- **AC-369** Waiving a deduction requires a reason, raises a confirmation naming the amount and
  the captain, and writes an audit entry naming the actor and the reason.
- **AC-370** A waived deduction remains visible in the `Deductions` view with its `Waived`
  state, the actor and the reason. It is not removed from the list.
- **AC-371** Applying a deduction creates a debit posting on the captain's payable ledger; the
  balance never goes below zero by clamping — if the deduction exceeds the payable, the excess
  becomes a debit on the captain's receivable and both postings are shown.

### 9.8 Cash & Captain Debt (AC-372–381)

- **AC-372** A cash report with `reportedHalalas: null` renders `Never reported` in words, not
  `0.00 SAR`, and its deviation renders `—`.
- **AC-373** A cash report's deviation equals `reported − topup − expected` and renders with
  an explicit sign.
- **AC-374** The reconciliation queue carries an owner chip with three states, an SLA
  countdown, and a closed set of two dispositions. A report claimed by another operator renders
  both dispositions disabled in place with the owner named.
- **AC-375** Opening a cash report does **not** claim it. The owner chip after opening and
  closing a report without acting reads exactly as it did before.
- **AC-376** Rendering the reconciliation queue writes no audit entries and mutates no
  ownership record. Rendering it twice produces the same audit-log length.
- **AC-377** A decided cash report converts **in place** — the row remains, showing its
  disposition, its decider and the time. It does not disappear on click.
- **AC-378** An escalated report renders the R5a critical signal and appears in a page banner
  count. It is not a red badge.
- **AC-379** Recording a captain repayment accepts a **partial** amount, creates a credit
  posting on that captain's receivable for exactly that amount, and leaves the remaining debt
  visible. It never sets the debt to zero by assignment.
- **AC-380** A captain whose receivable balance crosses the cap renders as `Cash collection
  suspended` on this sub-tab and on their 360° profile, from the same source value.
- **AC-381** The debt total on this sub-tab includes every captain with a non-zero receivable
  balance, in both directions. A captain in credit is not silently dropped from the total.

### 9.9 Rider Wallets (AC-382–388)

- **AC-382** The wallet index is an index table — selection, sort and filters all work per
  foundation §7.1. The per-rider ledger reached from an identity link is a ledger — none of
  those three exists on it.
- **AC-383** A rider with a negative balance renders it with U+2212 in ink, and appears in the
  `Negative balances` view.
- **AC-384** Issuing a goodwill credit above the operator's per-case cap is refused before it
  commits, and the refusal names the cap in SAR and the role that can grant it.
- **AC-385** The authority check applies regardless of the reason chosen. Selecting a reason
  such as `Manual top-up` does not bypass the per-case, daily, or per-rider-per-30-day limits.
- **AC-386** An adjustment above the second-approval threshold states so in the confirmation
  before it commits, and the resulting posting renders in the `Pending` state until approved.
- **AC-387** An adjustment cannot be committed without a reason code; the confirmation's
  primary action is disabled until one is chosen.
- **AC-388** The adjustment surface has no field in which to reference another posting. An
  operator cannot use an adjustment to correct a specific wrong posting.

### 9.10 Pricing & Plans — Stage A (AC-389–401)

- **AC-389** The plan index renders four views — Subscription plans, Quick rides, Rate card,
  Cancellation fees — as view tabs on one route, with `Subscription plans` default. None is a
  navigation level and none appears in the path.
- **AC-390** Entering the plan editor unmounts the rail, the sub-tab column and the app top
  bar. Exiting returns to `/financials/pricing` with both columns restored and `Pricing & Plans`
  selected.
- **AC-391** Every derived value in the editor renders with **no border and no fill**, is not
  focusable, is absent from the tab order, and carries `aria-readonly="true"`.
- **AC-392** No derived value in the editor uses the disabled treatment (reduced-contrast box
  with a hairline). Comparing a derived value and a disabled input side by side, they are
  visually distinct.
- **AC-393** Clearing a numeric input the formula reads makes every derived value that depends
  on it render `—`, not `0.00 SAR` and not a stale number.
- **AC-394** With a numeric input cleared, `Save` is blocked and the error renders on the
  cleared input, not on any derived value.
- **AC-395** Clearing `Discount %`, observing the preview, and saving stores the same value the
  preview showed. The preview and the saved record never disagree about a blank field.
- **AC-396** Typing in any input the formula reads updates every dependent derived value on the
  `input` event, without a flash, a colour transition or a count-up.
- **AC-397** The formula panel's line count equals the number of computed-field definitions,
  and each line's expression matches its definition character for character. Editing a
  definition changes the rendered line.
- **AC-398** Every input named in the formula panel updates the preview strip when changed. A
  test that types into each of them in turn observes a preview change for each.
- **AC-399** The worked example is computed from the same definitions as the preview strip, and
  its column header states its literal inputs (`10 km · 20 min × exec days`). Its note states
  that surge is excluded.
- **AC-400** Entering a discount above 100 raises an error on the discount input and one
  page-level critical banner naming that input. It does not produce a negative plan total and
  does not save.
- **AC-401** Every editable control in the editor is read by the save handler. Changing any
  control, saving, and reloading the record shows the changed value.

### 9.11 Pricing & Plans — Stage B (AC-402–408) — **BLOCKED on Q7**

- **AC-402** **BLOCKED.** Every rate, commission and discount input in the editor is editable.
- **AC-403** **BLOCKED.** A rate-card change is proposed as a draft; the live card is unchanged
  until approval.
- **AC-404** **BLOCKED.** A draft with no attached simulation renders `Approve` disabled with
  the reason on it.
- **AC-405** **BLOCKED.** A draft renders `Approve` disabled for the operator who proposed it,
  with the reason on it, before it is clicked.
- **AC-406** **BLOCKED.** Approving a draft supersedes the live card, retains the previous card
  in history with an `effectiveTo` date, and reprices no completed trip.
- **AC-407** **BLOCKED.** A plan priced below the computed floor cannot be published, and the
  block names the shortfall in SAR.
- **AC-408** **BLOCKED.** Every cancellation-fee value has exactly one source, and the value
  shown here is the value enforced at cancellation.

### 9.12 Pricing & Plans — surge and cancellation (AC-409–414)

- **AC-409** A surge suspension states the zone, the reason, the operator and a live countdown
  to expiry. It cannot be created for more than 12 hours.
- **AC-410** No control on any Financials surface raises a surge multiplier. Operations may
  only suspend.
- **AC-411** Suspending surge requires a reason; the confirmation's primary action is disabled
  until one is entered.
- **AC-412** A surge window whose end hour is not after its start hour is refused at entry,
  with the error on the end-hour field.
- **AC-413** A surge multiplier above the configured cap is refused at entry, with the error on
  the multiplier field and the cap named.
- **AC-414** A cancellation rule with no enforcement path renders a visible `Not enforced`
  state naming that it is stored but not applied. It never renders as though it were live.

### 9.13 Ledger & Payment Controls (AC-415–424)

- **AC-415** The trial balance lists every account in the chart of accounts, including those
  with a zero balance, with its type and its balance.
- **AC-416** The trial balance's total debits equal its total credits, or the page renders the
  out-of-balance critical banner with the difference in SAR.
- **AC-417** `liability.driver`, `liability.escrow`, `ar.rider` and `ar.driver` each show a
  non-zero balance when the corresponding fixture activity exists. An account that can never be
  posted to fails.
- **AC-418** The journal renders each entry's lines as `Dr <account> <amount>` and
  `Cr <account> <amount>`, and each entry's debit total equals its credit total.
- **AC-419** A refused posting appears in the `Refused postings` view with its reason stated in
  words, and is counted in a page banner. Refused postings are never dropped.
- **AC-420** The reconciliation view compares like with like: each row's operational figure and
  ledger figure are on the same VAT basis, and a row that agrees shows a difference of
  `0.00 SAR`.
- **AC-421** No developer or simulation control appears on any Financials surface. Grepping the
  seven sub-tabs for `demo`, `simulate` and `backfill` returns no operator-facing action.
- **AC-422** Disabling the default payment gateway is refused, with the reason naming that a
  different default must be set first. The switch returns to its previous position.
- **AC-423** A gateway's transaction count and volume change when the underlying payment
  fixtures change. Neither is a hardcoded value.
- **AC-424** The invoice sequence is gapless: issuing three invoices produces three consecutive
  numbers with no gaps and no reuse.

### 9.14 The four states, everywhere (AC-425–433)

- **AC-425** Every card on every one of the seven sub-tabs renders a content, empty, loading
  and error state, and each is reachable in test by controlling the client.
- **AC-426** A ledger's loading state is a skeleton with the ledger's own six columns and a
  plausible row count. No Financials surface renders a centred spinner.
- **AC-427** A ledger with no postings ever renders the first-run empty state — heading,
  one-to-two-sentence body and at least one action. A ledger filtered to zero renders one grey
  sentence and a clear-filters action, with no illustration and no heading.
- **AC-428** A failed read renders the error state inside the card that failed, with the
  toolbar still rendered so the query can be changed. Sibling cards continue to render.
- **AC-429** Every error message names the fix as an imperative and contains none of "please",
  "invalid", "failed to" or an apology.
- **AC-430** Every mutation on every Financials sub-tab has a failure path that renders and
  leaves the underlying record unchanged. Inducing a failure on a payout leaves the payable
  balance exactly as it was.
- **AC-431** A row-level action failure renders on that row without replacing the whole card
  with an error state.
- **AC-432** No Financials surface renders a `0` badge. A count of zero renders no badge.
- **AC-433** Each screen renders correctly at 1280 px and at 1440 px with no horizontal
  overflow of the page; a ledger wider than its container scrolls horizontally rather than
  shrinking a money column below legibility.

### 9.15 Permissions (AC-434–441)

- **AC-434** Every write control on all seven sub-tabs that the current role may not use
  renders **disabled in place** with its reason available. No such control is hidden, and none
  is enabled and then refused on click.
- **AC-435** A role without the Financials view permission resolving `/financials/*` sees the
  forbidden state, naming the permission and who can grant it. There is no redirect.
- **AC-436** A role with read-only Financials sees every ledger, every balance and every
  posting, and no write control enabled.
- **AC-437** Every money-moving action — payout, escrow release, deduction apply, deduction
  waive, refund, adjustment, reversal, cash-debt repayment — writes an audit entry naming the
  actor, the amount, the subject and the reason. A test that performs each in turn observes one
  new audit entry per action.
- **AC-438** No money-moving action commits without its permission check. Calling the commit
  path directly with an unauthorised session performs no mutation.
- **AC-439** The compensation authority ceiling applied to an operator matches their role. An
  operator whose role has no explicit policy entry falls to the documented default, and the
  applied ceiling is stated in the confirmation.
- **AC-440** A permission denial writes an audit entry and raises exactly one surface — a
  toast, never a toast and a banner together.
- **AC-441** A ledger read that the role may perform but whose subject they may not view (a
  rider's PII behind `view_profiles`) renders the posting with the subject redacted, not the
  whole ledger hidden.

### 9.16 Copy, Arabic and bidirectionality (AC-442–450)

- **AC-442** Every operator-facing string on all seven sub-tabs resolves through a translation
  key. Grepping the seven sub-tabs for a bare quoted sentence in JSX returns no operator-facing
  copy.
- **AC-443** No operator-facing string is built by concatenation or contains an interpolated
  sentence fragment. Every dynamic value sits in a named placeholder within one key.
- **AC-444** No operator-facing string contains an emoji.
- **AC-445** With the document in Arabic, every money value renders with its digits in the same
  order as in English, its U+2212 on the same side of the digits, and its `SAR` code not
  reversed.
- **AC-446** With the document in Arabic, ledger columns mirror — Date leads, Balance trails —
  while the money strings inside them do not reverse.
- **AC-447** With the document in Arabic, a reference such as `WTX-0004`, an IBAN, a plate and
  a percentage all render unreversed, with bidi isolation applied.
- **AC-448** The plan editor's Arabic name field renders right-to-left in both document
  directions, and its character-count hint is localised.
- **AC-449** No Financials surface uses a physical direction utility. A token audit over the
  seven sub-tabs returns zero physical-direction classes.
- **AC-450** Every interactive element on all seven sub-tabs shows a visible focus ring, and
  every ledger's source link and every page-level action is reachable by keyboard without a
  pointer.

---

## 10. Permissions

Cross-reference: `docs/01-modules/00c-identity-permissions-and-audit.md`; foundation §11.

### 10.1 What exists today, on these surfaces

| Surface | Gate today | Evidence |
|---|---|---|
| `finance` page | **none.** `view_finance` is declared in `PAGE_PERMISSIONS` (`:10629`) and never passed to `requirePerm` anywhere in 21,857 lines | `12a` R17 |
| `rwallets` page | **none.** Every operator sees every rider's balance and the platform's total wallet liability | `12c` R16 |
| Payout / escrow / deduction | `process_payouts` · `release_escrow` · `apply_deductions` (`:7024`, `:7059`, `:7073`) | — |
| Waive a deduction | **none** — no permission, no confirmation, no reason, no audit entry | `12b` R1 |
| Cash review / repayment | double-gated: `process_payouts` **and** `requirePagePerm('wallets', …)` (`:12147`, `:12188`) — the only two page-permission checks in the module | `12b` R9 |
| Rider wallet credit / debit | `contact_users` (`:3978`) — **a messaging permission gating a money movement** | `12c` A5 |
| Quick-ride rates, surge windows, surge cap | `manage_plans` (`:12336`, `:12361`, `:12369`, `:12377`) | — |
| Rate card propose / approve / surge suspension | **none.** No `requirePerm` in `proposeRateCard`, `approveRateCard`, `commitRateCardChange` or `suspendSurge` | verified by function-body grep |
| Cancellation policy | `manage_settings` (`:7371`) | — |
| Payment gateways (all four writers) | `manage_settings` (`:7476`, `:7487`, `:7496`, `:7508`) | — |

**Four price surfaces, three different gates, one of them absent.**

### 10.2 The regression D1's relocation creates, stated concretely

`manage_settings` is held by exactly one seeded operator, `USR-1` (Owner, `:2831`). The
`Finance` role (`USR-2`, `:2833`) holds `process_payouts`, `release_escrow`,
`apply_deductions`, `view_finance` and `view_profiles` — **and neither `manage_plans` nor
`manage_settings`.**

So the moment `gateways` and `cancelpolicy` become Financials sub-tab content:

- The **Finance** role lands in a Financials workspace where **Pricing & Plans is entirely
  read-only to them** and **Ledger & Payment Controls' gateway switches are entirely read-only
  to them**, because both gates live outside the money permission set.
- The **Ops Manager** role (`USR-5`, `:2840`) holds `manage_plans` and can therefore edit ride
  types and surge — a pricing action — while holding no finance write permission at all.

That is a regression the relocation causes, not one it inherits, and it is exactly the shape
**D4** exists to fix. It is recorded as **Q-F2**.

### 10.3 Who may see and do this — the model the spec is written against

Written so that changing a permission is a data change in the route table, not a code change in
a screen (foundation §11.3).

| Surface | View | Write |
|---|---|---|
| All seven sub-tabs — the workspace tile | `view_finance` | — |
| Overview | `view_finance` | none — read-only surface |
| Revenue & Refunds | `view_finance` | refunds: `issue_refunds`, authority-bounded (**new key**); reversal: same |
| Payouts & Escrow | `view_finance` | payout: `process_payouts` · escrow: `release_escrow` · deduction apply **and waive**: `apply_deductions` |
| Cash & Captain Debt | `view_finance` | review / escalate: `process_payouts` + page permission `cash_review` · repayment: `process_payouts` + `cash_repayment` |
| Rider Wallets | `view_finance` **and** `view_profiles` for the rider's identity | credit / debit: **not `contact_users`** — a money key, bounded by `compPolicy` |
| Pricing & Plans — catalogue | `view_finance` | `manage_plans` |
| Pricing & Plans — rate card propose | `view_finance` | **needs a key; today has none** — Q-F2 |
| Pricing & Plans — rate card approve | `view_finance` | **must be a different holder from the proposer.** Four-eyes is not expressible as one key unless two people hold it — so approval needs its own key even under today's four roles |
| Pricing & Plans — surge suspension | `view_finance` or `live_ops` | `live_ops` — it is a safety lever an ops manager must reach at 02:00, and it must **not** share a key with the rate card |
| Pricing & Plans — cancellation fees | `view_finance` | same key as the rate card — a cancellation fee is a price |
| Ledger & Payment Controls — trial balance, journal, reconciliation | `view_finance` | read-only by construction |
| Ledger & Payment Controls — gateways | `view_finance` | **not `manage_settings`** — a money key, per §10.2 |
| Ledger & Payment Controls — VAT / invoice config | `view_finance` | the workspace-configuration key, wherever D4 puts it — a VAT registration number is a company fact, not a price |

**Three rules that bind regardless of D4:**

1. **Gate at render, not at commit.** Every control the role may not use renders disabled in
   place with its reason. `executePayout` today renders a spinner, then a full success screen,
   then a driver notification claiming the money is on its way — **for a payout that
   `requirePerm` refused** (`12b` R10). That must not ship.
2. **Every money movement is audited, with its reason.** `recordRefund` writes no audit entry
   of its own (`12a` R16); `waiveDeduction` writes none at all (`12b` R1). Both are closed here.
3. **Approval authority is not the same as write authority.** The one place the legacy app gets
   governance right — you cannot approve a card you proposed (`:21586`) — is preserved and made
   a *render-time* state rather than a commit-time refusal.

---

## 11. Copy and Arabic

Arabic is not a phase two (foundation §7.5). Financials is where the rule bites hardest,
because money strings are the ones most often assembled.

**Namespaces:** `fin.*` · `fin.ledger.*` · `fin.posting.*` · `fin.reversal.*` ·
`fin.refund.*` · `fin.payout.*` · `fin.escrow.*` · `fin.cash.*` · `fin.wallet.*` ·
`pricing.*` · `pricing.derived.*` · `gateway.*` · `vat.*`.

**Copy that cannot be translated cleanly and must be re-authored as keyed strings with named
placeholders:**

| Legacy | Why it breaks | Line |
|---|---|---|
| `'⛔ Already done — this exact ' + operation + ' was completed ' + fmtAge(…) + ' ago. Nothing was charged again.'` | Three concatenated fragments, one of them a computed duration. Arabic will not put the noun where English does. | `:19902` |
| `'Duplicate ' + operation + ' suppressed — this exact operation was already completed at ' + …` | Same, plus a locale-formatted time inside a sentence | `:19899` |
| `'✅ Paid ' + amt.toFixed(2) + ' SAR to ' + dn` | Money formatting inline in a sentence; the amount must be a placeholder the formatter fills | `:7035` |
| `'Released ' + e.amount.toFixed(2) + ' SAR escrow to ' + dn + ' (' + id + ')'` | Two placeholders and a parenthetical id | `:7068` |
| `'⛔ Ledger rejected the posting — ' + why` | `why` is itself an assembled English sentence (`'unbalanced: debits X vs credits Y'`, `:19924`) — a sentence inside a sentence | `:19928` |
| `nm2(driverId) + ' under-reported cash for ' + t.id + ' by ' + fmtSAR(…)` | Four fragments | `:12124` |
| `'Eyvar ' + c.toFixed(1) + '%  ·  Discount ' + d.toFixed(1) + '%'` | A composed status pill | `:12991` |
| Every emoji in a title, toast, badge or nav label across all four legacy pages | Emoji do not translate and do not read on a screen reader (§5.7, defect D7) | throughout |

**Bidirectional rules for this wave specifically:**

- A money amount, a percentage, a reference (`JE-00005`, `WTX-0004`, `REF-0003`,
  `EYV-CN-2026-000012`), a VAT registration number, an IBAN, a plate and a date **do not
  reverse** in Arabic. The *cell* aligns to the inline start; the string does not reorder.
  Every numeric run needs bidi isolation.
- The U+2212 sign stays immediately before the digits in both directions. A leading `−` is
  exactly the case that jumps sides without isolation.
- A ledger's columns mirror; its Debit and Credit columns swap places with the rest of the row
  and keep their meaning, because the meaning is in the header, not the position.

---

## 12. Findings — current behaviour, suspected defects

Recorded so nobody specs them as correct and nobody "fixes" them by accident. Numbered `D-F*`
to avoid colliding with `docs/ref/defects.md` D1–D24 and foundation's D-L1–D-L12. Findings
already recorded in the module docs are cited, not restated.

| # | Current behaviour | Why it looks wrong | Evidence |
|---|---|---|---|
| **D-F5** | `commitCashRepayment` sets `DB.driverCashDebt[driverId] = 0` by assignment. There is no amount field and no partial repayment. | A captain who repays 100 of 300 SAR has their whole debt cleared. The modal copy states this as a feature — *"Recording this clears the full outstanding balance to zero"* (`:12197`) — which makes it a product decision nobody made. | `:12207`, `:12197` |
| **D-F6** | Captain cash debt is **never deducted from a payout**, despite the page copy at `:1000` and `:1013` stating that it is *"deducted automatically from their next payout"*. `payDriver` reads only `p.pending` (`:7026`). | The page tells the operator a netting happens that no code performs. Every payout over-pays by the outstanding debt. | `:7024`–`:7036` vs `:1000` |
| **D-F7** | Five of the eight cancellation-policy rules have **no consumer**. Only `sub_mid_cycle` (`:5527`), `qr_after_grace` and `qr_rider_noshow` (`:11831`) are read. `qr_before_assigned`, `qr_grace_period`, `qr_after_arrival`, `qr_driver_fault` and `sub_before_first_trip` are edited, saved and audited, and never applied. | An operator sets `qr_after_arrival` to 10 SAR and no rider is ever charged it. The screen presents stored configuration as live policy. | grep `getCancellationRule` → `:5533`, `:11832` only |
| **D-F8** | `graceMin` on `qr_grace_period` is rendered as an input (`:7357`), read back and saved (`:7380`), and **never read by any enforcement path**. | The grace period is the one cancellation setting an operator would most expect to matter, and it is inert. | grep `graceMin` → 3 hits, all in render/save |
| **D-F9** | Cancellation fees exist twice with different numbers and different dimensions: `DB.cancellationPolicy` (5 / 10 / 10 SAR, by scenario) and `rateCard.classes[*].cancelFee` (8.00 Economy / 12.00 Comfort, by class). Only the first is enforced. | A fifth pricing model, inside the four already known. The rate card's own display shows a cancellation fee an operator would reasonably believe is charged. | `:13939`–`:13942` vs `:21440`–`:21443` |
| **D-F10** | `proposeRateCard`, `approveRateCard`, `commitRateCardChange` and `suspendSurge` carry **no permission check**. The only governance is the self-approval refusal at `:21586`. | The most consequential money control in the product — the live price of every trip — is reachable by any authenticated operator. | function-body grep, all four |
| **D-F11** | `planFloorCheck()` — commented as *"the check that blocks a publish"* (`:21511`) — has **no call site** in the file. | The margin floor, the emergency-cover reserve and the target margin are computed, displayed as guardrails in prose (`:21690`), and enforced nowhere. | `14a` §19.22 |
| **D-F12** | `ledgerReconcile()`'s refund row adds `accountBalance('tax.vat_output') * 0`. | Multiplied by zero. `ops` is VAT-inclusive and `ledger` is VAT-exclusive, so the row shows a permanent difference of ~13.04 % of the refund total, presented as a reconciliation break. The surrounding comment says showing the difference *"is the point"* — which is true of real breaks and not of this one. | `:20065`, `12a` R10 |
| **D-F13** | The refund idempotency key has **no time component**: `idemKey('refund', riderId, r2(amount), relatedId \|\| reason \|\| '')`. Wallet credit and debit both append a second-resolution timestamp. | Two legitimately distinct refunds of the same amount to the same rider for the same reason collapse to one key, and the second is silently suppressed with a warn toast. | `:19963` vs `:19980`, `:19994`; `12a` R9 |
| **D-F14** | `renderLedger` renders the whole trial balance and the newest 14 journal entries as one `innerHTML` string on every call, and the reconciliation recomputes `accountBalance()` — a full scan of `DB.ledger` — once per account, twelve times. | Not a correctness defect; recorded because the rebuild's ledger reads are server-paginated and an engineer porting `accountBalance` client-side would reproduce an O(accounts × postings) scan on every render. | `:20069`–`:20119`, `:19938` |
| **D-F15** | `demoDoubleRefund()` and `backfillFareLedger()` are rendered as operator-facing buttons on a live settings pane. `demoDoubleRefund` issues two genuine 25.00 SAR refunds against `Object.keys(DB.riders)[0]`. | A developer tool that moves real money, in the operator UI, with no permission check on the function itself. | `:20124`–`:20125`, `:20131`; `12a` R15 |
| **D-F16** | `gatewayStats()` attributes a payment to a gateway by `p.method.indexOf(gw.matchPrefix) === 0`. | String prefix matching standing in for a foreign key. A gateway renamed, or a method string whose wording changes, silently reattributes volume. Adding a custom gateway sets `matchPrefix` to its display name (`:7500`). | `:7457`, `:7500` |
| **D-F17** | `DB.payments` has **no runtime writer**. Every money figure derived from it is derived from ten seed rows, and `p.amount` is a **string** (`'86.50 SAR'`) parsed with `parseFloat` at every read. | `parseFloat('1,640.00 SAR')` returns `1`, with no error — and comma-grouped amount strings do exist elsewhere in the seed data (`:2620`). | `12a` G6, R13 |
| **D-F18** | A refund never marks its source payment refunded. No code path writes `status = 'Refunded'`. | A fully refunded payment keeps counting toward gross revenue and rider lifetime value, indefinitely. | `12a` R2 |
| **D-F19** | `escrow.status` stores `'ready'` — a *computed* state (`tripsCompleted >= tripsRequired`) — as data (`:2803`). | A stored derived value. It can disagree with the trip counts beside it, and nothing recomputes it. | `:2802`–`:2805` |
| **D-F20** | `DB.compPolicy.roles` is keyed `Owner / Operations / Support / Finance / default`, while seeded `teamUsers[].role` values are `Owner / Finance / Support / Support / Ops Manager`. | `Ops Manager` falls through to `default` — 50 SAR per case, 300 daily — and the `Operations` tier (200 / 2000) is dead configuration nobody can reach. | `:15380`–`:15386` vs `:2831`–`:2840`; `12c` R11 |
| **D-F21** | `compCheck` is bypassed unless the reason label contains the literal string `'Goodwill'` (`reason.indexOf('Goodwill') >= 0`). | Choosing `Manual top-up` or `Promo code redemption` moves any amount with no per-case ceiling, no daily ceiling, no per-rider pattern check and no goodwill-ledger entry. | `:3985`; `12c` R10 |
| **D-F22** | `renderCashReconciliation` renders `.slice(0, 150)` with no statement of truncation. | A silent row cap on a money surface — exactly what `DESIGN.md` §8.3 forbids. | `:12250` |

**Carried from the module docs, not restated here but binding on this spec:** `12a` R1
(double-posted cancellation refund), R3 (unbounded refund amount), R5 (non-gapless refund ids
from `array.length + 1`), R7 (credit note against an arbitrary invoice), R11 (escrow and
payouts never reach the books), R12 (seven contradictory KPI tiles), R14 (contribution margin
counts cancelled trips' captain earnings), R18 (credit note issued on a frozen date); `12b` R1
(ungoverned `waiveDeduction`), R9 (four of six page permissions unenforced), R10 (success screen
after a refused payout); `12c` R16 (no page permission on rider wallets); `14a` §19.1–19.22.

---

## 13. Open questions

Each names an owner and what it blocks. **Q13 and Q7 from the foundation register are answered
and re-scoped below; the rest are new to this wave.**

| # | Question | Owner | Blocked until answered |
|---|---|---|---|
| ~~**Q13**~~ | **ANSWERED — §3.1, D-F1.** Positive `amountHalalas` plus `direction: 'debit' \| 'credit'` on a posting; signed balances. `direction` is account-relative and every ledger declares its subject account (§3.2). Reversal, refund, chargeback and adjustment are specified in §3.4. | — | Closed. mock-data-engineer may write the posting types; utilities-engineer may write the debit/credit splitter (§6.1). |
| **Q7** | **NOT answered — evidence and a recommendation are in §4; the decision is not mine.** Which pricing store is authoritative for rates, commission and discount. | **Finance lead, with the business owner** | **Stage B only** (AC-402–408). §4.2 settles three mechanical parts without them; §4.5 lets Stage A ship. Every day this stays open, Stage A ships a Pricing & Plans sub-tab whose pricing half is disabled with a banner. |
| **Q-F1** | **Cancellation fees exist twice, on two different dimensions.** `DB.cancellationPolicy` is scenario-based and enforced (5 / 10 / 10 SAR); `rateCard.classes[*].cancelFee` is class-based and not (8.00 / 12.00). Merging them means choosing a dimension — is a cancellation fee a property of *what happened* or of *what class the trip was*? Both, if the answer is a matrix, and then there are 12 cells to fill. | Finance lead | **AC-408** and the `Cancellation fees` view's edit path. The view ships read-only, showing both sources side by side with the `Not enforced` state on the five inert rules (D-F7). |
| **Q-F2** | **Which permission gates each Financials write action**, now that four settings panes have moved into a money workspace. Today: `manage_settings` (one holder) for gateways and cancellation policy, `manage_plans` for quick-ride rates, and **nothing at all** for the rate card. §10.2 states the concrete regression: the Finance role cannot edit two of its own sub-tabs. | **Business owner**, under **D4** | The `permission` field on 7 route-table rows and every write control's gate. Until answered, each control ships gated on its **nearest money key** (`view_finance` for read; the acting key for write) with the unresolved ones recorded as `null` and rendered disabled with the reason — never enabled by default. |
| **Q-F3** | **What is the refund authority model, and what distinguishes a duplicate from two legitimate identical refunds?** `recordRefund` validates only `amount > 0` — no ceiling, no comparison against the original payment, no role check (`12a` R3) — while goodwill credits are ceiling-bounded by `compPolicy`. And the idempotency key has no time component, so two genuinely distinct identical refunds collapse into one (D-F13). Both need one answer: an authority ceiling *and* a rule for what makes two refunds the same act. | product-owner **with Finance** | **AC-358** and **AC-359**. Until answered, a refund is capped at the related payment's amount and requires an explicit operator confirmation naming the earlier refund when one matches — which is conservative in both directions and states its conservatism on screen. |
| **Q-F4** | **What happens to escrow when a subscription is cancelled mid-plan?** The captain has delivered some trips; the rider is owed a pro-rata refund; the hold covers the whole plan. Legacy has no such state — `escrow.status` is only `held` or `ready` and cancellation touches neither. | Finance lead, with the business owner | The escrow domain state in §7.4 and the `Escrow` view's cancelled rows. Fixtures ship a cancelled subscription with a live hold so the gap is visible rather than absent. |
| **Q-F5** | **Where does a refund land by default — the payment instrument or the rider wallet?** Both exist; legacy does both at once and double-counts (`12a` R1). Instrument is what a rider expects; wallet is what the product wants. A default is a commercial choice. | Finance lead | **AC-337**'s default. The mechanism ships either way — the operator chooses per refund and the confirmation names it — so this blocks a default, not a build. |
| **Q-F6** | **Is a rider with a negative wallet balance blocked from booking?** Foundation's **Q9**, unchanged and still open. `RDR-4001` sits at −41.50 SAR after a chargeback and nothing says whether that blocks, warns or does nothing. | product-owner, with Finance | The rider wallet card's state and its tone. This spec renders the balance and takes no position; the `Negative balances` view exists so the population is at least visible. |
| **Q-F7** | **Who is the second approver, and where do they see the queue?** `compPolicy.secondApprovalAboveSAR: 200` exists (`:15388`) and there is no second-approver surface anywhere in the product. The same shape is required for rate-card approval (`:21586`). Two features need one queue. | Business owner, with whoever owns identity | **AC-386** and **AC-405**'s approver path. Until answered, an adjustment above the threshold is created in `pending` and is visible on Rider Wallets in a `Pending approval` state — it exists and waits, rather than committing unapproved. |
| **Q-F8** | **What is the reporting period, and does it close?** Every Financials figure is "June 2026" today, from a frozen demo clock (`:929`, `:3182`). A real finance console needs to know whether a period can be closed and whether a posting can be backdated into a closed one. | Finance lead | The period selector's semantics on Overview and Revenue & Refunds. Ships as an open date range with no close concept, which is honest and incomplete rather than wrong. |

**Not blocked on any of the above:** the ledger model (§3), the correction flow (§3.6), the
money rules (§3.7), the derived-value definitions (§8), all five ledger sub-tabs, and
Pricing & Plans Stage A. That is six of the seven sub-tabs buildable today.

---

## 14. Handoff

**Artifact:** this file.

### For mock-data-engineer

The unblocking items, in order:

1. **`LedgerPosting`, `JournalEntry`, `AccountLine`, `AccountKey`** per §3.3, in
   `src/data/types/`. `amountHalalas` non-negative integer, `direction` a two-value union.
   `WalletTransaction` in `src/data/types/rider.ts:36` is already this shape and should be
   subsumed by `LedgerPosting` rather than kept beside it.
2. **The chart of accounts** per §3.8, including the three new consumers — `ar.driver` (new),
   `ar.rider` (first posting), `liability.escrow` and `liability.driver` (first postings).
3. **Fixtures that exercise every state in §7.2 and §7.3**, and specifically these, because a
   screen that has never rendered them will not have them: a reversed posting and its reversal;
   a reversal of a reversal; a chargeback that leaves a rider negative (`RDR-4001`); a held
   escrow on a cancelled subscription (Q-F4); a captain whose receivable exceeds the cap; a
   payout that failed; a credit note with no invoice; a refused journal entry; a trial balance
   that does not balance; a cash report with `reportedHalalas: null`; a partial cash repayment.
4. **Failure injection on every Financials read and every mutation** (AC-430).
5. **A period envelope** on Overview and Revenue & Refunds, even though Q-F8 is open — the
   shape is needed, the close semantics are not.

**One decision you must make and record:** whether `balanceAfterHalalas` is `null` or omitted
on a non-settled posting. §3.3 says `Halalas | null`; AC-312 requires it to render `—`. Either
representation satisfies the criterion — pick one and say which, because the splitter reads it.

### For product-designer

**Decisions you must make and record:**

1. **The ledger's row anatomy** at 1280 and 1440: six columns, two of them money, one of them a
   description carrying a source link and, on a reversal, a reference to the row it reverses.
   The description cell is the one that can wrap; the money cells cannot.
2. **The opening and closing balance rows** — §8.3 says bold on both sides; how they sit
   against the header balance is yours.
3. **The `Pending` line beneath the balance** (AC-312) — one line, one label, and it must not
   read as part of the balance.
4. **The R5a treatment on a ledger row**, which has no kebab and no checkbox, so the 3 px
   leading edge is the only structural affordance available.
5. **The reversal confirmation** — the title states the verb and the amount; the body states
   the consequence and the resulting balance. Copy is final in your spec, not written at build
   time.
6. **Empty, error, forbidden and not-found copy** for all seven sub-tabs and every card in
   them, both kinds of empty distinguished (§7.1).
7. **The Stage-A banner** on Pricing & Plans (§4.5) — one standing condition, one banner, and
   it must not be mistakable for an error.
8. **The derived-value treatment in the plan editor** versus the disabled treatment used on
   Stage-A pricing inputs. These two sit **in the same form, adjacent**, and §8.2 exists
   because they were confusable. AC-392 tests exactly this and it is the hardest thing in this
   wave to get right visually.
9. **The formula panel and preview strip** as §8.2.2 and §8.2.3 specify, driven by the
   definitions in §8.4.
10. **The work queue inside Cash & Captain Debt**, beside a ledger on the same route — the two
    have opposite rules and must not look like one table with two moods.

### For utilities-engineer

- **The debit/credit splitter** is unblocked: `direction === 'debit' ? amount : null` per column
  (§6.1). It was correctly declined; the type it needed now exists.
- **`formatMoney`** per M-6: integer in, `<amount> SAR` out, 2 dp, `,` separator, tabular
  figures, U+2212 for a negative value. It never rounds.
- **`roundHalalas`** per M-2: half away from zero, on the absolute value.
- **A residual helper** per M-3, so no caller ever rounds both legs of a split.
- **The computed-field evaluator** per §8.4, and the one numeric coercion function per D-F3 —
  blank is `null`, and it serves both preview and save.

### For frontend-engineer

Six of seven sub-tabs are unblocked. Pricing & Plans ships as Stage A. Do not build a Stage B
criterion; do not invent a pricing rule to unblock yourself. If Stage A is ambiguous, that is a
question for me, not a decision for the screen.

### What is blocked, and on whom

| Blocked | On | Who |
|---|---|---|
| Pricing & Plans **Stage B** (AC-402–408) | **Q7** — which pricing model is real | Finance lead, with the business owner |
| The `Cancellation fees` edit path (AC-408) | **Q-F1** — scenario or class | Finance lead |
| The `permission` field on 7 route-table rows | **Q-F2** / **D4** — and the Finance-role regression in §10.2 is live until it lands | Business owner |
| The refund ceiling and the duplicate rule (AC-358, AC-359) | **Q-F3** | product-owner with Finance |
| The cancelled-subscription escrow state | **Q-F4** | Finance lead |
| The refund destination default (AC-337) | **Q-F5** | Finance lead |
| The negative-wallet policy | **Q-F6** (foundation **Q9**) | product-owner with Finance |
| The second-approver queue (AC-386, AC-405) | **Q-F7** | Business owner |
| Period close semantics | **Q-F8** | Finance lead |

**I am handing off, not building.** This spec is the artifact; the design spec, the fixtures,
the helpers and the seven screens are four other people's work, in that order.
