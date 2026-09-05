# DataTable

`src/components/DataTable.tsx` is the highest-leverage file in the product. Most index
screens are a thin wrapper around it, so a change here lands on forty screens at once and a
defect here is forty defects. Line numbers move; re-grep before citing one.

Source: `design/01-table-controls.md`, `design/04-index-screen-redesign.md` §7,
`design/15-hierarchy-and-scannability.md`, `design/17-reconciled-findings.md` §1.

## Four things that are settled, and stay settled

**The row-click target is declared, never inferred.** `DataTable` takes an explicit
`onRowClick` / primary action, and a screen with no safe primary gets no row click. Never key
a click target off a label string — an Arabic label matches a different regex than an English
one, and the row that resends a customer email is one no-match away.

**The identity column's width lives on the `<table>`.** `pinning.ts` puts the total width
there, because under `table-layout: fixed` a `min-width` on a cell does nothing. Measured:
**200px at 1280**, 222–238px at 1512.

**Media pitch is opt-in.** `rowMedia` defaults to false; only the four People views declare
it. Media pitch is for rows carrying an avatar or a thumbnail. `--ev-row-h` (40px) is a
floor, not a pitch — a row's height is set by its content, so a single line measures 41px and
no declaration makes it 40.

**The critical row is on token, and R19 pins its ground.** `bg-row-critical` /
`bg-row-critical-emphasis` / `text-row-critical-foreground`. What fixes `#fef0ee` is the
unchecked-checkbox boundary at 3.099 — one step darker fails at 2.995. Changing a critical
row means changing **both** the ground and the ink token; swapping the ground alone converts
a token defect into a contrast defect and calls it done.

### Row pitch, as measured

Chromium at 1280 x 900, comfortable density.

| Shape | Pitch |
|---|---|
| single line | **41px** |
| with a secondary line | **53px** |
| media (People) | **60px** |
| a REFUSED row (Payouts, Escrow, Deductions, Disputes) | **69px** |
| support queue | **93px** — see below |

**A refusal reserves nothing on rows that are not refused (R2-3).** The reason renders in the
refused row's own cell, so only that row is tall: Payouts at 1280 x 900 fits **8 rows**. The
email log is the proof the carrier declaration earns its keep — undeclared it measures
**81px**, because the reason stacks under the recipient's address *and* its second line;
declared on its state column it measures **69px**. One row there is 105px, a bounced delivery
whose state cell already carries a failure sentence and the provider's raw string and whose
resend is refused for a fourth reason. That is content, not reservation, and it is a copy
decision for whoever owns the screen.

### Where a refused action's reason renders — `carriesRefusalReason`

`DataColumn.carriesRefusalReason?: boolean` names the cell whose secondary line holds the
sentence a refused row's disabled control points `aria-describedby` at. Declare it on the
`state` / `status` column: a refusal is a fact about the row's state, and the state cell is
where an operator already looks for one.

- At most one column per table; the first declared wins.
- Undeclared — or declared on a column the operator has hidden — the reason falls to the
  `primary` column, which every table has. A refused row is never left with a dead control
  and no sentence (**AC-368**).
- Only the labelled shape (one or two declared actions) uses it. The kebab keeps §8.4.4's
  construction: the reason on a second line *inside* the menu item.
- Below the table breakpoint there is no row, so `NarrowRowCards` renders the reason under
  the button as before.

**The open one.** §9.1 says a secondary line *"never truncates; the row grows to fit"*. That
holds for a short second line — an id, a route. Under sentence-length content the support
queue runs at **93px a row**, nearly double a single-line table, and its height is set by the
*subject* column wrapping. Widening the reason column 150 to 230 measures **93px at both
widths**, so this is a hierarchy decision, not a width tweak.

## Sorting is a declaration, and the declaration is checked

**A column is sortable if and only if it declares `sortField`.** There is no second signal
and no inference from `dataType`. `sortRows` throws rather than falling back, so a
`sortField` that resolves to nothing crashes the first operator who opens that column's sort
menu — and no type-checker sees it, because the field is a string.

**`node scripts/sortfield-check.mjs` is the gate.** It walks every non-test `.ts`/`.tsx`
under `src/`, collects each `sortField` and proves it resolves to an accessor on one of the
row types that file names. It belongs in CI beside the typecheck: a column with a typo'd
field must fail the build, not the operator.

**A multi-value field is left undeclared rather than sorted by an invented rule.** A
permission set, a checklist, a list of zones: a set has no order, so any `sortField` on one
encodes a rule somebody made up — count, first alphabetically, most recently added — and the
operator has no way to learn which. Ship the column unsortable. If sorting it is genuinely
wanted, the answer is a derived scalar column (`Permissions granted`, a count) whose header
says what it orders by.

**A dead column comes out.** Measure the visible rows: a column holding **one distinct value
across all of them**, or empty on most of them, spends width and a header on nothing. Remove
it, or move the fact to the detail view where it is read once. Action columns are exempt — an
identical action on every row is the column working correctly, not a dead column.

## Emphasis

`:1253` — `columnIndex === 0 && 'text-foreground'`. Emphasis is keyed off *position*, so
reordering or hiding a column moves the emphasis to whatever lands first. Emphasis is a
property of what a column **means**, not where it sits: it belongs on the column
declaration.

## Modes

`table.mode === 'ledger'` (`:385`) changes six behaviours, not one: row height (`:713`),
selection (`:413`), row actions (`:449`), column hideability (`:674`), the skeleton pattern
(`:792`, P7 vs P8 vs P1), the empty-state branch (`:1115`) and boundary rows (`:1152`).
**Before changing anything, check whether ledger already exempts itself** — half of the
"missing" behaviours are deliberate ledger carve-outs.

## The four states

The table owns them; the screen forwards `status`. Do not add a second loading branch inside
a screen — every financials screen already forwards correctly, and a screen-level spinner is
a double-render, not a fix. `emptyKind: 'first-run' | 'cleared' | 'no-match'` is a
discriminated union and each arm carries its own required copy. See [states.md](states.md).

**R2-8 — the 216px floor on the scroll container (`min-h-54`) holds a SKELETON open, not a
rendered table.** It is inert above 216px; below it, all it does is leave empty card under a
short ledger. Measured on `/financials/rider-wallets?rider=RDR-1090` at 1280 x 900: card
218 to 176, scroller 216 to 174, table 174 either way.

**The screen declares the empty arm; the component never infers it.** Inferring `no-match`
from `table.isFiltered || isLedger` makes `first-run` unreachable for every ledger — a rider
whose wallet has never moved is told *"No movements match this search."* having searched for
nothing. §9.2's *"a ledger is NEVER first-run empty"* is narrowed by
`design/10-financials-money-flows.md` **LR-1**: *a platform-subject ledger is never first-run
empty; a party-subject ledger can be*, with **AC-427** requiring it and **LR-2** putting the
decision on the subject's lifetime — a captain with years of history and one quiet month is
`cleared`, not `first-run`.

The trap in the naive fix: dropping `|| isLedger` alone flips the Financials ledgers'
quiet-period empty to `first-run` (**D-F29**), which is why `LedgerCard` and
`AlertHistoryDialog` declare `no-match` explicitly. Guarded by
`table/ledgerEmptyState.test.tsx`.

## Two slots a section-level table wants

Both are optional and both are additive: a table passing neither renders identically to one
that never had them, proven by capture-and-diff rather than asserted.

**`heading` / `subheading`** put the section's title inside the toolbar row, so the title and
the control cluster (search, filter, columns, export) share one line and the count reads as a
subtitle beneath the title rather than beside it. **A table has view tabs or a heading, never
both** — that is a union in `table/IndexToolbar.types.tsx`, so it does not compile, and the
error names the one offending property rather than dumping the union. The heading level is
fixed at `h2`, matching `SectionHeading`: a `level` prop is a judgement made forty times
against a document outline nothing checks. A long heading **wraps before it truncates**,
because a flex line breaks on base sizes before anything on it shrinks — a clipped tab is an
unreachable control, a clipped heading is only a lost sentence, and this product has no
tooltip convention to recover either.

**`caption`** renders a real `<caption>` between the toolbar and the header row, for a
standing convention that must be read **before** the first number — the case is
`liability.driver`, the one credit-normal ledger in the console, where a credit means Eyvar
owes *more* and an operator reading it as a wallet reads every row backwards.

Three properties are the reason it is a `<caption>` and not a paragraph the screen renders
above the table:

- It becomes the table's **accessible name** (`getByRole('table', { name })`) and is announced
  when a reader enters the table. A paragraph above is announced *before* the table and
  skipped, so the convention never reaches a screen-reader operator at all.
- It sits at the point of confusion, `px-3` so the sentence begins exactly where the headers
  it defines begin — measured identical in both directions.
- It is reusable: `ar.driver` is inverted the same way, so a screen-local paragraph would be
  reinvented per screen.

`ui/table.tsx` is **untouched** and still `caption-bottom` product-wide: `caption-side` is
inherited, so a declaration on the `<caption>` itself wins outright without touching a
primitive forty screens share, and a bottom caption stays available to whoever wants one.
Below the breakpoint there is no `<table>`, so the same node renders as a paragraph above the
cards — it loses only the announcement, which no markup can give it without a table. It
renders in `content` only: a skeleton has no headers to define, `error` drops the header row,
and a sign convention over an empty is noise. Guarded by `table/tableCaption.test.tsx`.

## Bidi — where isolation happens

`DataTable` isolates at **the cell renderer, once**: `isolatesValue(column)` decides, the
cell wraps the value in a content-sized `<bdi>`, and a column declares `isolate: true` for
what its `dataType` cannot see (a plate, a phone). `date`, `money` and `number` isolate;
`text`, `enum`, `boolean` and **`id`** do not — see `table/columns.ts`.

**Two things measured in Chromium at 1280, both easy to get backwards.**

1. `09:39 يونيو 25` is the CORRECT rendering of `25 يونيو 09:39` on an Arabic line.
   Read right to left it is the logical string. Reading an RTL line left to right is what
   makes it look reversed. Swept 22 index routes under `dir="rtl"`: **zero cells reorder.**
2. **Pinning `dir="ltr"` is what breaks it.** Measured: `25 09:39 يونيو`, the day and the
   time adjacent and the month orphaned — wrong in either reading direction. UBA rule W2 turns
   digits following an Arabic letter into Arabic Numbers, two levels up, and they jump the
   month. `lib/i18n/isolate.ts` lists `date` among the runs to pin; for a *translated* date
   that advice is wrong. Recorded for its owner.

So the isolation is `<bdi>` with no `dir`, and it is a **contract**, not a repair: measured
layout-neutral at 1280 and 1152, in English and Arabic — identical row heights, identical row
counts, zero text-position deltas. What it buys is that a cell renderer written tomorrow
without `NumCell` or `DateCell` cannot regress. The real, reproducible bidi defect in this
product is the opposite one: **Arabic DATA in an LTR page**, `حي الملقا (3)` rendering
`(3) الملقا حي`, which needs the `<bdi>` around the sub-run inside the cell and is a
call-site fix.

`id` is off the list deliberately: an identifier starts with a strong Latin character and
never reorders, and `id` is the identity column, whose cell is a composite. Isolating it moved
the Trips avatar from x=816 to x=709 under `dir="rtl"` — off the inline-start edge.

## Before you change this file

1. `table-fixed` means **the width model is column widths, full stop.** `min-width`,
   `max-width` and content size on a cell do nothing.
2. Anything keyed off a **label string** or a **column index** is a latent defect. Key off
   declared meaning.
3. A colour literal here is forty screens of off-token. Check [tokens.md](tokens.md) first.
4. Measure row count at 1280 **and** 1152 after any pitch or width change.
5. Run `node scripts/sortfield-check.mjs` after adding, renaming or removing a column.
