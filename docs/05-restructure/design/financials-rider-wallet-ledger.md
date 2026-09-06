# Financials › Rider Wallets — the rider's ledger (drill-in)

**Route** `/financials/rider-wallets?rider=<riderId>` · **Screen** `src/screens/financials/wallets/WalletsScreen.tsx`
(`RiderWalletLedger`, `:661`) · **Owner brief** the business owner, looking at the running app:
*"the placement of the back is wrong and the layout is not right in the top part (but try to keep
the proximity also)."*

This spec covers the **drill-in only**. The index behind it (`?rider` absent) is unchanged and is
the model the drill-in is being made to match.

---

## 0. What I looked at

The reference sets named in my brief (`docs/06-design-reference/navattic-web/`,
`docs/06-design-reference/shopify-admin-web/`) **do not exist in this repository** —
`docs/06-design-reference/` holds `_partials/` and `build-design.py` and nothing else. Finding F-0
below. The structural reference is therefore the prose capture in
`docs/06-design-reference/_partials/02-layout-navigation.md`, which is the same material read out,
plus captures I took of the running app.

Captures taken against the dev server on `:4327` at 1280×1000, `RDR-1041` (Nora Al-Harbi),
light and Arabic. Measured, not remembered:

| What | Where it is today (1280, light) |
|---|---|
| `h1` "Rider Wallets" | x 336, y 96, 187×40 |
| View row (`data-slot="view-row"`) | x 336, y 156, 912×52 — holds one thing, the back link |
| "Back to wallets" link | x 336, y 162, 103×32 |
| `LedgerHeader` subject block | x 336, y ≈ 208 |
| `Balance` numeral `20.00` | x 617, y 222, 57×28 |
| Table toolbar | y 310–342, inline-end aligned |
| First table row | y 367 |
| `overflowX` | 0 |

**271 px of chrome above a 365 px table**, spread across four different inline-start edges
(title 336, back link 336, subject 336, balance 617, toolbar 660) and three horizontal bands.

The house detail header, for comparison — `/operations/people/applications/APP-2201`, same width:

| What | Where |
|---|---|
| `←` back arrow | x 330, y 96 |
| `h1` "Saad Al-Quraishi" | x 370, y 96 |
| meta "APP-2201 · Riyadh · 24 Jun 10:15" | x 336, y 140 |
| arrow `aria-label` | `"Back"` |

**Arabic (`dir=rtl`, `lang=ar`), same route:** the ledger's subject line renders
`Rider wallet balances · Nora Al-Harbi` — **in English** — inside an otherwise fully Arabic page.
Finding F-1.

---

## 1. Pattern

`docs/ref/patterns.md` shape: **single column**, index-table family, at its second level.
Governing sections: **§8** (page header slots), **§8.3** (the ledger construction), **§2.6**
(navigation affordances), **§7.1** (the two empties), **§9** (Arabic). Rulings in play: **O11**,
**R2-2**, **R5a**, **R7**, **R8**, **R10**, **D12**, **D33/D33a/D33b/D33c**, **D34**, **LR-2**,
**LR-3**, **AC-308**, **AC-309**, **AC-312**, **AC-382**, **AC-427**, **AC-485**.

The screen fits a row. There is no gap in the document at the pattern level — the gap is that
`FinancialsPage` decides slot 1 from a *premise about routes* and the premise is false for a
quarter of the screens it frames. §2 below.

---

## 2. Ruling 1 — detail or index? **Detail.** And the discriminator is in the data.

### The owner's diagnosis, checked

Every line of it holds. Re-read and confirmed:

- `src/components/PageHeader.tsx:10-12` — "§8 slot 1 back arrow on detail / create / edit only,
  **absent on index routes**. A single `←`, never a trail (§2.6)."
- `src/components/PageHeader.tsx:122` — `onBack` is "Derived from the route's shape **by the
  caller**, never a stack depth."
- `src/screens/financials/shared/FinancialsPage.tsx:6` — "§8 slot 1 **no back arrow** — these are
  index routes (§2.2)."
- `src/screens/financials/wallets/WalletsScreen.tsx:226-236` — the drill-in puts a
  `variant="link"` Button carrying `fin.wallet.back` into `ViewRow.lead`, the slot the index fills
  with its `ViewSwitcher`.
- `docs/05-restructure/DECISIONS.md:4680` — **O11**: "The back arrow on a detail route is the page
  header's, beside the title where the eye lands. Top bar slot 1 stays empty on every route."

One correction and one addition.

**Correction.** `FinancialsPage.tsx:6` is not wrong about what it describes; it is wrong about what
it is applied to. The seven Financials **sub-tabs** are index routes and correctly carry no arrow.
But three of them can enter a state in which the index is *gone from the screen* and a single
record's ledger has replaced it. `FinancialsPage` frames both states with one header, so a true
statement about the sub-tab silently became a false statement about the drill-in.

**Addition — the root cause is that these drill-ins have no route of their own.**
`src/shell/routeState.ts:186` resolves `/financials/rider-wallets` as an exact sub-tab match and
hard-codes `showsBackArrow: false`. `?rider=` is a search param, so `resolveRoute` cannot see the
drill-in at all. Foundation §3.8 rule 3
(`docs/05-restructure/specs/00-foundation.md:462`) says *"A view is a search param, not a path
segment. Views are controls."* A rider is not a control; it is a level. The honest fix at the route
layer is `/financials/rider-wallets/:riderId`, and that is **route-table and product-owner scope**
(Q-RW-1). It is not needed for this spec: `PageHeader.onBack`'s own doc says the caller derives it,
and the caller knows — `riderId !== null`.

### The rule, stated so it does not need re-deciding per screen

> **A Financials ledger whose `Ledger.subjectId` is non-null is a party's detail view and takes the
> detail chrome. A ledger whose `subjectId` is null is a platform ledger and is a view inside its
> index route.**

`subjectId` is declared at `src/data/types/ledger.ts:389` and maps exactly onto
`AccountDefinition.scope !== 'platform'` (`:120`). This is a data fact, not a per-screen judgement,
so two screens cannot answer it differently.

### The five Financials screens I checked against it

| Screen | Param | Does the index leave the screen? | Ruling |
|---|---|---|---|
| **Rider Wallets** `WalletsScreen.tsx:172` | `?rider=` | yes — `WalletIndex` unmounts | **Detail.** This spec. |
| **Payouts & Escrow** `PayoutsScreen.tsx:229` | `?captain=` | yes | **Detail.** Same shape, §9. |
| **Cash & Captain Debt** `CashScreen.tsx:172` | `?captain=` | yes | **Detail.** Same shape, §9. |
| **Revenue & Refunds** `RevenueScreen.tsx:652` | `?plan=` | **no** — `MasterDetailPage`, the plan list stays beside it (`:747`) | **Not a detail.** No arrow. Unchanged. |
| **Pricing & Plans** `RateCardBlock.tsx:85` | `?card=` | **no** — master-detail block | **Not a detail.** No arrow. Unchanged. |

The discriminator that separates the two halves of that table is not the param; it is whether the
parent list is still on screen. A selection that keeps its list needs no way back — the list *is*
the way back. `Ledger.subjectId` gives the same answer for the three ledger screens without asking
anyone to eyeball it.

**R2-2 is not overturned; it is completed.** R2-2 (commit `74da52b`) moved the way back off a chip
row and into the header band, and that was right. It stopped one step short: it left the way back
as a *text link in the breadcrumb slot*, which is the shape §2.6 forbids —
`docs/06-design-reference/_partials/02-layout-navigation.md:603`: *"The app MUST NOT use
breadcrumbs. Hierarchy MUST be expressed by a single back arrow left of the page title."* The same
partial, `:545`, records the observed form: `← Shiv Roy` — the arrow, then the **record's** name.
This is not a §1–§5 pixel figure, so **R13 does not void it**, and §8 and O11 adopt it verbatim.

---

## 3. Ruling 2 — the back affordance

**It becomes the page header's back arrow, §8 slot 1.**

| Question | Answer |
|---|---|
| Where | `PageHeader` slot 1, inline-start of the title, a `ghost` `size="icon"` Button with `backIcon(dir)` at `size-4`. Exactly what `ApplicantDetailScreen` renders. |
| The `ViewRow` lead slot on this view | **The `ViewRow` is not rendered at all.** With the switcher gone (no views on a drill-in, D12) and the way back gone (slot 1), the row has nothing in it. `WalletsScreen` passes `viewRow={undefined}` when `riderId !== null`. Today it renders a 912×52 band containing one 103 px link. |
| Does `fin.wallet.back` survive | **Yes, as one string with two uses and no visible link.** It becomes the arrow's `aria-label` *and* the label of the first-run empty state's action button (`WalletsScreen.tsx:708`), which is already what it does there. |
| Its text | Rewritten from `Back to wallets` to **`Back to rider wallets`** — it names the sub-tab exactly as level 2 spells it. |
| Why not `fin.drill.back` (`Back to {view}`) | Because `{view}` interpolates a tab label — `All wallets`, `Goodwill`, `Negative balances` — producing *"Back to All wallets"*, a capital inside a sentence. `fin.drill.back` **stays** for Payouts and Cash where it is already correct, and is not extended here. |
| Why the arrow needs a label at all | `PageHeader.tsx:197` hard-codes `aria-label={t('shell.topbar.back')}` = **`Back`** (`src/i18n/dictionaries.ts:592`). Measured on the applicant detail: the accessible name is the bare word `Back`. §8's arrow is the only wayfinding on a detail route and a screen reader is told nothing about where it goes. `EntityPageScreen` felt this and computed `entity.rider.backTo` = `Back to {name}` (`src/screens/entity/copy.ts:73`) — then could not hand it to `PageHeader`, which takes no such prop. **Shared-file change 1, §10.** |
| Destination | `openRider(null)` — deletes `?rider=`, preserves the rest of the search including `?view=` (`WalletsScreen.tsx:174-181`; `useScreenViews` reads `route.view`, `src/hooks/useScreenViews.ts:72`). A destination, never `navigate(-1)` — the reason is written out at `src/screens/EntityPageScreen.tsx:40-47` and it applies here unchanged. |

**No departure from O11 is claimed or needed.** The current text link *is* the departure; this
ends it.

---

## 4. Ruling 3 — the title

**The title is the rider. The section is carried by level 2 and by the arrow's label.**

Every other detail route in this product already does this, and I read all of them:

| Route | `title=` |
|---|---|
| `EntityPageScreen.tsx:143` | `profile.data?.title ?? entityId` — the record |
| `ApplicantDetailScreen.tsx:272` | the applicant |
| `CorporateDetailScreen.tsx:275` | the account |
| `DisputeDetailScreen.tsx:214` | the dispute |
| `CaseDetailScreen.tsx:203` | the case |
| `DashboardDetailScreen.tsx:333` | the dashboard |
| **the three Financials drill-ins** | **the sub-tab** |

Financials is the outlier, and the outlier is what the owner is looking at.

**What carries the section.** Two things, both permanent and both already on screen:

1. **The level-2 sub-tab list**, which highlights `Rider Wallets` on every capture I took, at
   x 96, and which `docs/05-restructure/specs/00-foundation.md:481` (D5) makes non-collapsible —
   *"The level-2 column is always visible."* A page title that repeats the selected nav row is the
   product's most expensive redundancy: it costs 40 px of the band on every detail route.
2. **The arrow's accessible name**, `Back to rider wallets` (§3).

**What happens to the body line that carries the identity today.**
`fin.ledger.subject.party` = `{account} · {name}` (`copy.ts:56`) renders
`Rider wallet balances · Nora Al-Harbi` as an `<h2 class="text-sm">` inside `LedgerHeader`
(`LedgerCard.tsx:297`). It is **retired on a party ledger**: the name is now the `<h1>`, and the
account name is dropped for the reason in F-1 — it is an untranslated English literal
(`src/data/types/ledger.ts:111`, *"English label, kept verbatim"*) and the sub-tab already names
the book. `LedgerHeader` keeps the heading on **platform** ledgers, where the page title is the
sub-tab and the account name is the only thing identifying the book (Revenue's refunds ledger,
`RevenueScreen.tsx:330`).

**The meta line** becomes `RDR-1041` — the record's own identifier, which is exactly what §8's
second row is for (`PageHeader.tsx:88-95`: *"counts, a record's identifiers, a timestamp"*) and
exactly the shape `EntityPageScreen` uses (`RDR-1041 · Rider since Mar 2024`). It renders **only
once the title is the name**; while the read is in flight the title is `RDR-1041` and the meta is
`null`, so the id never appears twice.

**R2-2's `fin.drill.meta` (`{view} · {record}`) is retired on this screen and superseded on the
other two.** It was a correct construction *while the title was the section*; with the record in
the title it prints the record twice and prints a parent view that the arrow already names.

---

## 5. Ruling 4 — the top block's grouping. "Keep the proximity."

### Where the balance does **not** go

**Not `aside`.** `PageHeader.tsx:104-113` is right that `aside` is a READINGS slot and a balance is
a reading — but it is documented in the same breath as living "at the header's **inline-end**".
At 1280 the content region is 912 px wide; `aside` would put `20.00` roughly 700 px from the name
it belongs to. That is precisely the defect `LedgerCard.tsx:293-294` records having already fixed
once: *"The subject and its balance sat ~900px apart at 1280 … a balance is a fact about the
account named beside it."* Live Dispatch uses `aside` because a full-bleed map has nowhere else to
hang a figure. This page has a card directly beneath the header. **Refused, R-RW-1.**

Not `control` (that slot takes a page-level control and this is not one — `PageHeader.tsx:114-119`).
Not `badges` (a money figure is not a status; §8.3.2 and AC-309 forbid tone anywhere near a
balance). Not `meta` (a numeral is not a metadata sentence, and it would be `text-sm` muted).

### Where it goes

**It stays in `LedgerHeader`, one row under the meta, at the same inline-start as everything above
it.** Three reasons, in order of weight:

1. **Proximity.** The name, the id, the balance and the pending amount become one column of four
   things sharing x = 336. Nothing in the block is more than one line from what it describes.
2. **It self-hides.** `LedgerHeader` renders only when `ledger !== null` (`LedgerCard.tsx:436`).
   Moving the figures to the `ViewRow` — which was the tempting answer, because the index's figures
   live there and the y-position would match — would put an empty 52 px band on the loading and
   error states, which is the same defect in a new place.
3. **It caps to the table.** `maxInlineSize={ceiling}` already ties the block's width to
   `tableCeiling(columns)`, so the header can never run wider than the ledger it heads.

### The wireframe (single column; RTL mirrors wholesale — every edge below is inline-start)

**Content state, the owner's rider:**

```
┌─ content region ─ 32px gutter (D-2') ────────────────────────────────────────────┐
│                                                                                  │
│  ←   Nora Al-Harbi                                                               │ §8 slot 1 + slot 2
│      RDR-1041                                                                    │ §8 meta — record id
│                                                                                  │
│  Balance          Pending                                                        │ LedgerHeader
│  20.00 SAR        120.00 SAR                                                     │ two peer figures, 32px apart
│  A credit increases this balance. Pending amounts are not in the balance          │ one muted line
│  until they settle.                                                              │
│                                                                                  │
│                    [Search postings] [Filter] [Columns ⌄] [Export CSV]           │ DataTable toolbar
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │ Date    Reference   Description          Debit(SAR) Credit(SAR) Balance(SAR)│  │
│  ├────────────────────────────────────────────────────────────────────────────┤  │
│  │ Opening balance                                                        0.00 │  │ AC-317
│  │ 18 Jun  WTX-0002   Referral reward…            —       20.00          20.00 │  │
│  │                    [Settled]                                                │  │
│  │ 19 Jun  WTX-0003   Fare for trip TRP-7741    6.40          —          13.60 │  │
│  │                    Reversed · Reversed by WTX-0004 · View source            │  │
│  │ 19 Jun  WTX-0004   Reverses WTX-0003           —        6.40          20.00 │  │
│  │                    [Settled]                                                │  │
│  │ 20 Jun  AUTH-6120  Subscription payment…       —      120.00              — │  │ AC-312 — em dash
│  │                    [Authorised]                                             │  │
│  ├────────────────────────────────────────────────────────────────────────────┤  │
│  │ Closing balance  Debits 6.40 · Credits 146.40                         20.00 │  │ AC-318
│  └────────────────────────────────────────────────────────────────────────────┘  │
│  Showing 1–4 of 4                                                                │ AC-320
└──────────────────────────────────────────────────────────────────────────────────┘
```

Four bands become three; five inline-start edges become two (the block at 336, the toolbar at the
table's inline-end, which is where the index puts it too and is therefore not a new inconsistency).
Expected saving above the first table row is of the order of 60 px at 1280 — **verify with a
harness run, do not take the number from this document** (R13; and jsdom lays out no table).

---

## 6. Ruling 5 — the two explanatory sentences

The brief asks whether either earns its line. **Judgement: neither earns its own line. Together
they earn one, and the second is conditional on the data.**

| String | Today | Ruling |
|---|---|---|
| `fin.ledger.normalSide.credit` — "A credit increases this balance." (`copy.ts:58`) | its own 12 px line under the subject heading | **Survives, moves.** AC-308 requires it, it is the one genuinely non-obvious fact on the page (this is a *liability*; a credit means Eyvar owes the rider **more**), and it explains the `Debit`/`Credit` columns four rows below it. It moves from under the subject heading — which no longer exists — to under the figure row, which is the "this balance" it names. |
| `fin.ledger.pending.help` — "Not in the balance until it settles." (`copy.ts:64`) | its own 12 px line under the pending amount | **Survives as a second sentence on the same line, rendered only when `pendingHalalas !== 0`.** Rewritten from a subjectless fragment to a full sentence so it can stand beside the first: **"Pending amounts are not in the balance until they settle."** |

Both sentences sit in one `<p class="text-sm text-muted-foreground">`, as two `<span>`s with a
drawn space — **never concatenated into one string** (AC-443). They are independent sentences, so
Arabic word order is unaffected.

**Why the second one is kept rather than cut.** Three signals already say it — the label `Pending`,
the em dash in the `Balance` column of the pending row (AC-312), and the `Closing balance` row —
and I nearly cut it on that basis. I did not, because this rider is the argument against cutting:
**120.00 pending against a 20.00 balance.** An operator who reads 140 makes a refund decision on a
number that does not exist. One conditional line is cheap insurance against the one mistake this
screen makes possible.

**Why the first is not moved to a tooltip or an `InfoHint`.** §5.7 puts helper text under the thing
it helps, not in a tooltip; the report-builder rail is the only place that is overridden
(`docs/RULINGS.md`, the Amplitude ruling) and this is not it.

**The `PageHeader.meta` doc at `:86-98` is right and I am obeying it, not deviating from it.**
Neither sentence goes in `meta`. `meta` gets `RDR-1041`, which changes when the record changes.

---

## 7. Ruling 6 — the pending amount

**It is promoted to a peer figure. Same size as the balance, immediately after it, no tone.**

| Aspect | Ruling |
|---|---|
| Rank | `ViewFigureBlock size="lg"` — identical to `Balance`. Label `text-xs` muted directly over the numeral, `text-lg font-semibold` numeral, `SAR` inline after it (`ViewRow.tsx:377-406`). |
| Order | `Balance`, then `Pending`, then any caller-supplied `figures` (Cash's cap). The balance is the position; the pending amount is the qualification on it. |
| Gap | `gap-x-8` — 32 px. The same gap the index uses between `Wallets`, `Below zero` and `Balance`, measured on the index capture. |
| When zero | **Not rendered.** Unchanged from `LedgerCard.tsx:318`, and it is the same instinct as §10's *"a count of zero renders no badge"*. A permanent `Pending 0.00 SAR` on every ledger in the product is noise. |
| Tone / badge | **None.** R7's five tones are closed and R5a leaves no red one; §8.3.2 is explicit that on a ledger *"the sign is typographic, and no tone goes near it"*, and AC-309 says a negative balance is U+2212 in ordinary ink — *"never a badge, never parentheses, never colour alone."* A pending amount is a fact, not a fault. |
| Card | **No.** It is content on the page, not a surface. R-3 §1.3 — *"no elevation. The page header is content, not a surface."* — and V-1, *"no figure is a card"*. D33 recesses surfaces; there is no surface here to recess, and D34 leaves nothing to cast a shadow anyway. |

**Why size rather than colour is the right instrument.** The only tools this product allows for
"look at this" are size, position and words. Colour is spent on the five tones and is barred from
money. So the pending amount is made consequential by being the same rank as the balance, adjacent
to it, and explained on the line under both. That is the whole of the treatment, and it is enough:
at `text-lg` a 120.00 beside a 20.00 is unmissable, where at `text-xs` muted it currently reads as
a footnote to a footnote.

---

## 8. Every state, drawn

### 8.1 Loading

`ledger.status === 'loading'`; `ledger.data === null`, so no `LedgerHeader`.

```
  ←   RDR-1041                                        ← title falls back to the id
                                                        (EntityPageScreen.tsx:143 precedent).
                                                        No meta: it would repeat the title.
                    [Search postings] [Filter] [Columns ⌄] [Export CSV]
  ┌──────────────────────────────────────────────────────────────────┐
  │ ▁▁▁▁▁  ▁▁▁▁▁▁▁  ▁▁▁▁▁▁▁▁▁▁▁▁▁   ▁▁▁▁▁   ▁▁▁▁▁   ▁▁▁▁▁            │  P7, six columns
  │ ▁▁▁▁▁  ▁▁▁▁▁▁▁  ▁▁▁▁▁▁▁▁▁▁▁▁▁   ▁▁▁▁▁   ▁▁▁▁▁   ▁▁▁▁▁            │  never a spinner (AC-426)
  └──────────────────────────────────────────────────────────────────┘
```

The back arrow is present and works throughout. That is the point of moving it into the header: it
no longer depends on anything the read returns.

### 8.2 Error

`getWalletLedger` rejects. `DataTable` renders `ErrorState` in the card; the header band survives.

```
  ←   RDR-1041
                    [Search postings] [Filter] [Columns ⌄] [Export CSV]
  ┌──────────────────────────────────────────────────────────────────┐
  │                                                                  │
  │      This wallet's postings did not arrive. Read again.          │
  │                        [ Read again ]                            │
  │                                                                  │
  └──────────────────────────────────────────────────────────────────┘
```

**The error copy changes and this is a real defect, not a preference.** `fin.error.read` =
*"Change the period or the filters, then read again."* (`copy.ts:160`). This screen **has no period
control** — Q-F13, because a wallet balance is a position, not a window
(`WalletsScreen.tsx:322-323`) — so the message names a fix the operator cannot perform. The comment
two lines below the string already anticipates this case: *"A read with no period control and no
filter cannot name that fix, so the three on the Rate card view name the object that is missing
instead."* New key, same shape as those three:

- `fin.wallet.ledger.error.read` — **"This wallet's postings did not arrive. Read again."**

Retry label stays `fin.error.retry` = `Read again`.

### 8.3 Empty — first run (`lifetimePostings === 0`, R8's zero-records-ever)

`LedgerCard.tsx:405` guard. The header block renders above it — a wallet with no history still has
a real balance of `0.00`, and hiding it would be hiding a fact.

```
  ←   Nora Al-Harbi
      RDR-1041

  Balance
  0.00 SAR
  A credit increases this balance.

  ┌──────────────────────────────────────────────────────────────────┐
  │                 This account, posting by posting                 │
  │   Postings appear the moment a fare, a payout or a credit         │
  │   touches this account.                                          │
  │                  [ Back to rider wallets ]                       │
  └──────────────────────────────────────────────────────────────────┘
```

- **No illustration.** LR-3 — *"No Financials empty state carries an illustration … an operator
  never creates a posting, so the illustration would sit above an action the product does not
  offer."* Passed explicitly as `illustration={null}` at `LedgerCard.tsx:428`, not inherited.
- **No `Pending` figure** (zero) and no pending sentence.
- **The action duplicates the arrow's destination, and that is accepted.** AC-427 requires at least
  one action and there is no other honest one — an operator cannot create a posting. The two
  controls are ~250 px apart and both resolve to a real destination, so the objection
  `EntityPageScreen.tsx:52` records (two back controls 40 px apart, one of which dead-ends) does
  not apply. Same string, so they cannot disagree.

### 8.4 Empty — filtered to zero (`hasHistory && rows.length === 0`)

LR-2 / `emptyKind="no-match"`. The toolbar and column header row stay — there is something to
operate on.

```
  ←   Nora Al-Harbi
      RDR-1041

  Balance          Pending
  20.00 SAR        120.00 SAR
  A credit increases this balance. Pending amounts are not in the balance until they settle.

                    [Search postings: "xyz"] [Filter (1)] [Columns ⌄] [Export CSV]
  ┌──────────────────────────────────────────────────────────────────┐
  │ Date    Reference   Description       Debit    Credit   Balance  │
  ├──────────────────────────────────────────────────────────────────┤
  │              No postings match these filters.                    │
  └──────────────────────────────────────────────────────────────────┘
```

One grey sentence, no illustration, no heading. R8 — an illustration belongs to a whole-page
zero-records-ever state, and this is not one.

### 8.5 Domain — negative balance

```
  Balance
  −14.60 SAR
  A credit increases this balance.
```

U+2212, ordinary `text-foreground` ink. **No badge, no red, no parentheses, no colour** — AC-309,
verbatim. **No banner either:** the index's `fin.wallet.negative` warning banner is suppressed on
the drill-in (`WalletsScreen.tsx:190`) and stays suppressed. A banner about one rider, on that
rider's own page, directly above the figure that states it, is R10's duplicate surface.

### 8.6 Domain — a failed or escalated posting

```
  ⚠  One posting failed to settle.                                         ← Banner, critical
     The amount never reached this wallet. Open the source document to
     see what happened.

  ┌──────────────────────────────────────────────────────────────────┐
  │▌21 Jun  WTX-0011  Top-up from card              —   50.00     —  │  3px leading marker
  │                   Failed · View source                           │  the word, in the description
```

R5a's three-part treatment: the 3 px leading marker on the pinned first cell
(`LedgerCard.tsx:139`), the state as a **word** in the description with no badge
(`SETTLEMENT_BADGE_TONE.failed === null`, `ledger.ts:236`), and a page banner **the screen raises**.

**Finding F-2: Wallets raises no such banner today.** `LedgerCard` accepts a `banner` prop
(`:365`); Payouts and Cash pass one; `WalletsScreen.tsx:691` passes none. Copy, so nobody ships a
placeholder:

- `fin.wallet.ledger.failed.title` — **"One posting failed to settle."**
- `fin.wallet.ledger.failed.titleMany` — **"{count} postings failed to settle."**
- `fin.wallet.ledger.failed.body` — **"The amount never reached this wallet. Open the source document to see what happened."**

Tone `critical` (R5a's one red banner is for the condition the operator must act on; money that did
not move is that condition). **No action button** — there is no retry in this product and a control
that does nothing is worse than none (§11.2). R10 holds: this is the only banner the drill-in
raises, and `mergeBanners` covers the case if that ever stops being true.

---

## 9. Components, variants and tones

| Element | Component | Variant / tone | Note |
|---|---|---|---|
| Back arrow | `Button` (`@/components/ui/button`) via `PageHeader` slot 1 | `variant="ghost" size="icon"` | icon `backIcon(dir)` at `size-4`, `-ms-1.5 shrink-0`. Mirrors by `dir` in code (O10), never by CSS rotation. |
| Title | `PageHeader` `<h1>` | `text-band font-medium text-foreground` | Unchanged component; only the string differs. |
| Meta | `PageHeader` `<p>` | `text-sm text-muted-foreground` | `RDR-1041`, plain text. |
| Balance figure | `ViewFigureBlock` | `size="lg"` | label `text-xs` muted / numeral `text-lg font-semibold` / unit `text-xs` muted. `data-slot="metric-value"` pins tabular figures (H4). |
| Pending figure | `ViewFigureBlock` | `size="lg"` | Identical. Conditional on `pendingHalalas !== 0`. |
| Explanatory line | `<p>` | `text-sm text-muted-foreground` | One line, one or two sentences, drawn separator. |
| Settlement chips in rows | `StatusBadge` | `success` / `warning` / `neutral` only, from `SETTLEMENT_BADGE_TONE` | `failed` and `escalated` are `null` and render as bold words. No sixth tone; no red badge (R5a). |
| Failed-row marker | `RowCriticalMarker` | — | On the first cell, so it survives horizontal scroll. |
| Failed banner | `Banner` via `FinancialsPage.banners` | `critical` | §8.6. |
| Table | `DataTable` | `mode: 'ledger'` | No sort, no selection, no row actions — enforced by the type, AC-382 / AC-313–316 / AC-325. |
| Empty (first-run) | `EmptyState` | `kind="first-run"`, `illustration={null}` | LR-3. |
| Empty (narrowed) | `DataTable` `noMatch` | one sentence | LR-2. |
| Error | `ErrorState` | `scope="card"` | Header band survives. |
| Loading | `LoadingSkeleton` | `skeletonPattern="P7"` | Six ledger columns, never a spinner (AC-426). |

No card, no border, no shadow anywhere in the header block: D34 deletes the shadow tiers, and D33's
recess applies to surfaces, of which this block is not one.

---

## 10. Copy — every string, final

### New

| Key | English | Arabic |
|---|---|---|
| `fin.wallet.ledger.error.read` | This wallet's postings did not arrive. Read again. | لم تصل قيود هذه المحفظة. أعد القراءة. |
| `fin.wallet.ledger.failed.title` | One posting failed to settle. | فشلت تسوية قيد واحد. |
| `fin.wallet.ledger.failed.titleMany` | {count} postings failed to settle. | فشلت تسوية {count} قيود. |
| `fin.wallet.ledger.failed.body` | The amount never reached this wallet. Open the source document to see what happened. | لم يصل المبلغ إلى هذه المحفظة. افتح المستند المصدر لمعرفة السبب. |

### Rewritten

| Key | Was | Becomes | Arabic |
|---|---|---|---|
| `fin.wallet.back` (`copy.ts:702`) | Back to wallets | **Back to rider wallets** | العودة إلى محافظ الركاب |
| `fin.ledger.pending.help` (`copy.ts:64`) | Not in the balance until it settles. | **Pending amounts are not in the balance until they settle.** | المبالغ قيد الانتظار لا تدخل في الرصيد حتى تتم تسويتها. |

`العودة إلى محافظ الركاب` uses the sub-tab's own Arabic name as it renders at level 2 — verified in
the Arabic capture, where the highlighted row reads **محافظ الركاب**.

### Unchanged and still correct

`fin.ledger.balance` (`Balance`), `fin.ledger.pending` (`Pending`),
`fin.ledger.normalSide.credit` (`A credit increases this balance.`), `fin.ledger.col.*`,
`fin.ledger.opening` / `.closing` / `.totals` / `.truncated`, `fin.ledger.search`,
`fin.ledger.source`, `fin.empty.noMatch`, `fin.empty.firstRun.heading` / `.body`,
`fin.error.retry`.

### Retired on this route (the keys stay for their other callers)

- `fin.ledger.subject.party` — `LedgerHeader` no longer renders a subject heading on a party
  ledger. Still rendered on platform ledgers via `fin.ledger.subject.platform`.
- `fin.drill.meta` — superseded by the record-in-the-title construction.

Checks: sentence case throughout; the one button is a verb phrase; no exclamation marks; no
uppercase letter-spaced label is added; no monospace numerals (`tabular-nums` is figure spacing,
not a typeface). No toast on this screen — nothing here mutates — so R9's 60-character rule has
nothing to bind.

---

## 11. Interaction

| Thing | Behaviour |
|---|---|
| Back arrow | Click or `Enter`/`Space`. Removes `?rider=`, keeps `?view=` and every other param. A `<button>`, focus-visible ring, first focusable element in the content region. |
| `Escape` | **Not bound.** `Escape` dismisses overlays; this is a route, and binding it would make a route behave like a modal. |
| Title, meta | Not interactive. Q-RW-2 below asks whether `RDR-1041` should open the 360° profile. |
| Balance, pending | Not interactive. Readings. |
| A posting row | The row itself is not clickable — `mode: 'ledger'` declares no row actions and no open handler (AC-315). The **one** affordance per row is `View source`, an `<a>`, and only where `sourceType === 'trip'`, because those are the only ids `/entity/:id` resolves (`LedgerCard.tsx:108`). Every other reference renders as text rather than a link that 404s. |
| Toolbar | `Search postings` narrows client-side over reference and description (`WalletsScreen.tsx:676-683`). `Filter`, `Columns`, `Export CSV` are `DataTable`'s. No `Sort` control — the ledger mode has none, and a sortable ledger is not a ledger (AC-313). |
| Nothing opens a modal or a drawer from this screen. | §5.0's table is not reached: there is no act here. |
| Focus on return | The operator lands on the index with focus at the document start. **This is a product-wide gap, not a wallets one** — no detail route in this product restores focus to the originating row. Raised as F-4; not specified per-screen, because a per-screen answer is how two screens end up with different ones. |

---

## 12. Shared-file changes this spec requires

All four are follow-ups. `FinancialsPage.tsx` is owned by another agent right now and **must not be
edited from this spec's branch**; nothing here assumes otherwise.

**1. `src/components/PageHeader.tsx` — shared, lands on every route.**

```
/** §8 slot 1 — the arrow's accessible name. Names the destination
    (`Back to rider wallets`), not the direction. Defaults to `Back`. */
backLabel?: string
```
…and `aria-label={backLabel ?? t('shell.topbar.back')}` at `:197`. Additive, defaulted, so every
existing caller is byte-identical. Amend the doc block at `:10-12` to say the caller may name the
destination. `EntityPageScreen` already computes such a label (`:130-137`) and should be handed it.

**2. `src/screens/financials/shared/FinancialsPage.tsx` — shared across all seven sub-tabs.**
Three additive props — `title?: string`, `onBack?: () => void`, `backLabel?: string` — forwarded to
`PageHeader`; `title` defaults to `t(row.titleKey)`. **Amend the comment at `:6`**, which is the
line that caused this:

> `§8 slot 1  no back arrow on the seven sub-tab INDEX routes (§2.2). The three party drill-ins are detail views (O11) and pass one; the discriminator is Ledger.subjectId, not the route.`

**3. `src/screens/financials/shared/LedgerCard.tsx` — five call sites.**
- `LedgerHeader` and `LedgerCard` take `showSubject?: boolean`, default `true`. `false` drops the
  `<h2>`; the three party drill-ins pass `false`, Revenue keeps the default.
- `Pending` becomes a peer `ViewFigureBlock size="lg"` after `Balance`, when non-zero. **Product-wide** —
  Payouts' and Cash's pending amounts are as consequential as this one.
- The explanatory line moves below the figure row and takes the conditional second sentence.
- Blast radius: Revenue's refunds ledger keeps its heading and gains the two changes above; a
  platform contra account's `pendingHalalas` is normally `0`, so its visible change is one line
  moving down by one row.

**4. `src/screens/financials/wallets/WalletsScreen.tsx` — this screen.**
Lift `subjectName` out of `RiderWalletLedger` the way `PayoutsScreen.tsx:253` and
`CashScreen.tsx:184` already do; pass `title` / `meta` / `onBack` / `backLabel` to
`FinancialsPage`; pass `viewRow={undefined}` when `riderId !== null`; pass `showSubject={false}`
and the wallet-specific read error to `LedgerCard`.

**Tokens this needs: none.** Every value above is an existing utility bound to an existing token —
`text-band`, `text-lg`, `text-xs`, `text-sm`, `text-foreground`, `text-muted-foreground`,
`gap-x-8`, `gap-y-2`, `pb-3`, `pb-5`, `-ms-1.5`. No arbitrary values. No new entry in
`globals.css`.

---

## 13. Acceptance criteria

| ID | Criterion |
|---|---|
| **AC-RW-01** | With `?rider=` present, the page header renders exactly one back control, a `<button>` in slot 1. With `?rider=` absent it renders none. |
| **AC-RW-02** | That button's accessible name is `Back to rider wallets`, not `Back`. |
| **AC-RW-03** | Activating it removes `?rider=` from the URL and leaves `?view=` and every other search param untouched. |
| **AC-RW-04** | The `<h1>` is the rider's name once the ledger read resolves, and the rider id before it resolves and in the error state. |
| **AC-RW-05** | The meta line renders the rider id when the `<h1>` is the name, and renders nothing when the `<h1>` is the id. |
| **AC-RW-06** | No element with the text `Back to wallets` renders on the drill-in, and no `data-slot="view-row"` element is in the document. |
| **AC-RW-07** | The drill-in renders no `<h2>` naming the subject account. The Revenue refunds ledger still does. |
| **AC-RW-08** | `Balance` and `Pending` render as sibling figures of the same rank, in that order, with `Pending` present only when `pendingHalalas !== 0`. |
| **AC-RW-09** | The pending amount is excluded from the balance figure, carries no badge and no tone, and its posting's `Balance` cell is an em dash (AC-312 preserved). |
| **AC-RW-10** | Exactly one explanatory line renders under the figures: the normal-side sentence always, plus the pending sentence only when `pendingHalalas !== 0`. Neither string is concatenated into the other. |
| **AC-RW-11** | A negative balance renders U+2212 in `text-foreground`, with no badge, no red, no parentheses, and no page banner. |
| **AC-RW-12** | Loading renders the P7 six-column skeleton, the back arrow, and no figure block. No spinner. |
| **AC-RW-13** | Error renders `This wallet's postings did not arrive. Read again.` with a `Read again` action, and the back arrow still navigates. |
| **AC-RW-14** | `lifetimePostings === 0` renders the first-run state with no illustration, above it the figure block showing `0.00`, and one action labelled `Back to rider wallets`. |
| **AC-RW-15** | A search that matches nothing renders `No postings match these filters.` with the toolbar and column header row still present. |
| **AC-RW-16** | A `failed` or `escalated` posting renders the leading marker, the state as a word with no badge, and exactly one `critical` page banner. |
| **AC-RW-17** | In Arabic the document is `dir="rtl"`, the back icon mirrors, and every string in the header block resolves to Arabic — including the ledger's subject identity. |
| **AC-RW-18** | At 1280 `document.documentElement.scrollWidth - clientWidth === 0`, and the header block's inline size does not exceed `tableCeiling(columns)`. |
| **AC-RW-19** | The back arrow is the first focusable element in the content region and shows a visible focus ring on `focus-visible`. |
| **AC-RW-20** | The same header construction (arrow, record title, id meta, no subject heading) renders on the Payouts and Cash drill-ins. |

AC-RW-08, -09, -18 and -20 are layout claims: jsdom does no table layout, so they are proved by a
Playwright harness against the dev server, not by the suite.

---

## 14. Refusals

| # | Refused | Why |
|---|---|---|
| R-RW-1 | Balance figures in `PageHeader.aside` | `aside` is inline-end (`PageHeader.tsx:104-113`); at 1280 it puts the figure ~700 px from the name. `LedgerCard.tsx:293` records this exact defect being fixed once already. It is the opposite of the proximity the owner asked for. |
| R-RW-2 | Balance figures on the `ViewRow` | Tempting — the index's figures live there and the y-positions would match — but `ViewRow` renders unconditionally, so loading and error would carry an empty 52 px band. That is the current defect wearing a different hat. |
| R-RW-3 | A red or amber badge on the pending amount | R7's five tones are closed, R5a leaves no red badge, and §8.3.2 / AC-309 bar tone from money outright. |
| R-RW-4 | A card, border or shadow around the header block | R-3 §1.3 (the page header is content, not a surface), V-1 (no figure is a card), D34 (no shadows). |
| R-RW-5 | Keeping `Back to wallets` as a visible text link | §2.6 / `_partials/02-layout-navigation.md:603` — no breadcrumbs; hierarchy is one arrow left of the title. O11 says the same. |
| R-RW-6 | `navigate(-1)` for the arrow | Dead-ends on a pasted URL or a fresh tab; the argument is written out at `EntityPageScreen.tsx:40-47`. `openRider(null)` is a destination. |
| R-RW-7 | Keeping the section as the `<h1>` | Level 2 already names it, permanently and non-collapsibly (D5). Six other detail routes put the record there. |
| R-RW-8 | Adding `Rider wallet balances` to the meta | The account label is an untranslated English literal (F-1). It would ship an English fragment into an Arabic page to say something the sub-tab already says. |
| R-RW-9 | A period control on this screen | Q-F13 — a wallet balance is a position, not a window (`WalletsScreen.tsx:322-323`). |
| R-RW-10 | An `Adjust balance` action in the header | Adjustment lives on the index rows today. Adding it here is product scope, not layout. Q-RW-3. |
| R-RW-11 | Moving `Export CSV` up to the title row | It is `DataTable`'s toolbar and it sits identically on the index. Moving it on one route breaks the symmetry that makes the two levels read as one screen. |
| R-RW-12 | A record pager (`‹ ›`) in slot 5 | §8 slot 5 is for record-detail pages in an **ordered list**. The wallets index is sortable and paginated, so "the next rider" is not a stable notion across a re-sort. Refused until the route exists (Q-RW-1). |
| R-RW-13 | Shrinking the type to buy the vertical space | D-2's type-ramp suspension is retired and void (`DECISIONS.md:337`). The space is bought by deleting a row of chrome and a heading, which is the sanctioned way. |
| R-RW-14 | Uppercase letter-spaced labels for `Balance` / `Pending` | House style, and `ViewFigureBlock` already renders labels in sentence case at `text-xs`. |

---

## 15. Findings raised (not fixed here)

| # | Finding |
|---|---|
| **F-0** | The reference sets my brief names — `docs/06-design-reference/navattic-web/` and `docs/06-design-reference/shopify-admin-web/` — **are not in this repository**. `docs/06-design-reference/` contains `_partials/` and `build-design.py` only. Either the images were never committed or the brief's paths are stale. Every visual-reference instruction in the design role depends on them. |
| **F-1** | **The ledger's subject line cannot translate.** `AccountDefinition.label` (`src/data/types/ledger.ts:111`) is an English literal by design — *"kept verbatim"* — and `fin.ledger.subject.party` interpolates it, so the Arabic build renders `Rider wallet balances · Nora Al-Harbi` inside an RTL Arabic page (captured). This spec removes the line from the wallet drill-in but **not** from the platform ledgers, where it is the heading. The fix is 18 keys under `fin.account.<key>` with Arabic entries, leaving `label` as the data value. Bigger than this screen; for utilities-engineer or the i18n owner. |
| **F-2** | **Wallets raises no R5a banner for a failed or escalated posting**, though Payouts and Cash do and `LedgerCard` accepts one (`:365`). Copy is written in §10 so nobody ships a placeholder. |
| **F-3** | **`fin.error.read` names a fix this screen cannot offer** — "Change the period" on a screen with no period control. `fin.wallet.ledger.error.read` fixes it here; the same string is passed by other periodless reads and should be audited. |
| **F-4** | **No detail route in this product restores focus to the row it was opened from.** Product-wide; deliberately not answered per-screen. |
| **F-5** | **`PageHeader`'s back arrow has no way to name its destination.** `EntityPageScreen` computes `Back to {name}` and then cannot pass it (`:130-137`). Shared-file change 1 fixes it for everyone. |

## 16. Open questions for product-owner

| # | Question |
|---|---|
| **Q-RW-1** | Should the three party drill-ins get real routes — `/financials/rider-wallets/:riderId` and the two captain equivalents — so `resolveRoute` can see them? Foundation §3.8 rule 3 makes a *view* a search param; a record is not a view. It would also settle whether slot 5's record pager is available (R-RW-12). Route table + three-level ceiling; not mine. |
| **Q-RW-2** | Should the meta's `RDR-1041` link to the 360° profile? On the index, P8-T1 splits the two destinations deliberately — the name opens the money view, the id opens the profile (`WalletsScreen.tsx:300-310`). One level down there is currently no route to the profile at all. Specified as plain text until answered. |
| **Q-RW-3** | Should the drill-in offer `Adjust balance`? An operator who has drilled into one rider's ledger is the operator most likely to want it, and AC-387's per-rider reason code makes it a per-record act. Deliberately not designed (R-RW-10). |

---

## 17. Answers, in one page

1. **Detail.** The rider ledger is a detail view of a record, not a view inside an index route, and
   the discriminator is `Ledger.subjectId !== null`. Payouts and Cash are the same; Revenue's
   `?plan=` and Pricing's `?card=` are master-detail selections and are **not**, because their list
   stays on screen.
2. **The back becomes the header's arrow** (§8 slot 1, O11). The `ViewRow` is not rendered on the
   drill-in. `fin.wallet.back` survives as `Back to rider wallets`, used as the arrow's
   `aria-label` and as the first-run empty state's action label. No visible link.
3. **The title is the rider.** The section is carried by the always-visible level-2 row and by the
   arrow's label. The meta is `RDR-1041`. The subject heading is retired on party ledgers and kept
   on platform ledgers.
4. **One column at the inline-start:** name, id, then `Balance` and `Pending` as peer figures 32 px
   apart, then one explanatory line. Not `aside` — `aside` is inline-end and would recreate the
   900 px separation this codebase already fixed once.
5. **One line, not two.** The normal-side sentence stays (AC-308, and it is the non-obvious fact);
   the pending caveat is rewritten to a full sentence and rides the same line, only when pending is
   non-zero.
6. **Pending is promoted to a peer figure** at the balance's rank, adjacent to it, with no tone and
   no badge.
