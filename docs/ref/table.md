# DataTable

`src/components/DataTable.tsx` — **1,620 lines, and the highest-leverage file in the
product.** Most index screens are a thin wrapper around it, so a change here lands on
forty screens at once and a defect here is forty defects. Line numbers move; re-grep before
citing one.

Source: `design/01-table-controls.md`, `design/04-index-screen-redesign.md` §7,
`design/15-hierarchy-and-scannability.md`, `design/17-reconciled-findings.md` §1.

## Status, 2026-09-02 — three of the four are closed

**T1 row-click regex — FIXED.** The label regex and the `?? declaredActions[0]` fallback
are gone; `DataTable` takes an explicit `onRowClick` / primary action. A screen with no safe
primary gets no row click.

**T2 identity column — FIXED.** `pinning.ts` now states the `table-layout: fixed` truth
correctly and puts the total width on the `<table>`. Measured: **200px at 1280** and
222–238px at 1512, against the audit's 38px and 0px.

**T4 critical row — FIXED.** `bg-row-critical` / `bg-row-critical-emphasis` /
`text-row-critical-foreground`, all on token, all AA. What pinned the ground was **R19**,
not the text: an unchecked checkbox boundary must clear 3:1, which `#fef0ee` does at 3.099
and one step darker fails at 2.995.

**T3 density — PARTLY FIXED, and the target was wrong.** Media pitch is now opt-in
(`rowMedia`, default false); only the four People views declare it. But **"60 → 40" was
never achievable**: `--ev-row-h` is 40px and a row's height is set by its content, so
`h-row` is only a floor. Measured single-line pitch is **49px**. Docs 13 and 15 both assumed
40 and are wrong.

### Row pitch, as measured

| Shape | Pitch |
|---|---|
| single line | **49px** |
| with a secondary line | **53px** |
| media (People) | **60px** |
| support queue | **93px** — see below |

**The open one.** §9.1 says a secondary line *"never truncates; the row grows to fit"*. That
was written for a short second line — an id, a route. Under sentence-length content the
support queue runs at **93px a row**, nearly double a single-line table, and its height is
set by the *subject* column wrapping. Widening the reason column 150 → 230 measured **93px
at both widths** and was reverted. This is a hierarchy decision, not a width tweak.

## The original four defects, as recorded

**T1 — the row-click target is chosen by regex on the translated label.** `:962` and `:996`:

```ts
/view|open|detail|inspect|claim|show|عرض|تفاصيل|فتح/i.test(a.label) ?? declaredActions[0]
```

No match falls through to `declaredActions[0]` — **whatever it happens to be.** Clicking an
email-log row resends a customer email. This is a P0 and it gets worse, not better, when
Arabic labels arrive. The fix is a declared intent on the action, never a better regex.

**T2 — the identity column collapses.** `src/components/table/pinning.ts` emits `minWidth`,
and a comment there asserts that is what keeps the residual off zero. **Under
`table-layout: fixed` — `src/components/ui/table.tsx:117`, `table-fixed` — `min-width` on a
cell is ignored by the spec.** Measured: 38px at 1280, 0px at 1152. Fix the width model,
not the number.

**T3 — every non-ledger table is 60px rows.** `:713`:

```ts
const rowHeightClass = isLedger ? 'h-row' : 'h-row-media'
```

`--ev-row-h: 40px` vs `--ev-row-h-media: 60px`. Media pitch is for rows that carry an avatar
or a thumbnail; it is currently the default for everything, which is why ~10.7 rows fit a
viewport. This was invisible to every static pass and only turned up when someone ran the app.

**T4 — the critical row is off-token and fails AA.** `:848`, `:1215`, `:1257` use raw
`bg-rose-50/95` … `dark:bg-rose-950/70`. Muted ink `#6b7280` measures **4.83 on white ✓,
4.40 on rose-50 ✗**. The obvious fix is worse: on `--ev-red-lt` `#fef0ee` it is **4.35 ✗**.
**A correct fix changes both the ground and the ink token** — swapping the ground alone
converts a token defect into a contrast defect and calls it done.

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

**`no-match` is the third arm, and it exists because the branch used to infer it.** The empty
state read `table.isFiltered || isLedger`, so **no ledger-mode table could ever render
`first-run`** — a rider whose wallet had never moved was told *"No movements match this
search."* having searched for nothing, and the declared first-run copy was unreachable code.

The comment on that line cited §9.2's *"a ledger is NEVER first-run empty"*, which had since
been **narrowed**: `design/10-financials-money-flows.md` **LR-1** rules that *a
platform-subject ledger is never first-run empty; a party-subject ledger can be*, with
**AC-427** requiring it and **LR-2** putting the decision on the subject's lifetime — a
captain with years of history and one quiet month is `cleared`, not `first-run`. The code went
on encoding the un-narrowed sentence.

So the screen now declares the arm rather than the component inferring it. Note the trap that
made the naive fix wrong: removing `|| isLedger` alone flips the Financials ledgers'
quiet-period empty to `first-run` (**D-F29** returning), which is why `LedgerCard` and
`AlertHistoryDialog` declare `no-match` explicitly. Guarded by
`table/ledgerEmptyState.test.tsx`.

## Two slots a section-level table wants

Both are optional and both are additive — a table passing neither renders byte-identically to
before, proven by capture-and-diff rather than asserted.

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

## Bidi — A2, CLOSED 2026-09-02, and the symptom did not reproduce

`DataTable` now isolates at **the cell renderer, once**: `isolatesValue(column)` decides, the
cell wraps the value in a content-sized `<bdi>`, and a column declares `isolate: true` for
what its `dataType` cannot see (a plate, a phone). `date`, `money` and `number` isolate;
`text`, `enum`, `boolean` and **`id`** do not — see `table/columns.ts`.

**Two things measured in Chromium at 1280 that the finding got wrong.**

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
