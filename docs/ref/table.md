# DataTable

`src/components/DataTable.tsx` — **1,620 lines, and the highest-leverage file in the
product.** Most index screens are a thin wrapper around it, so a change here lands on
forty screens at once and a defect here is forty defects. Line numbers move; re-grep before
citing one.

Source: `design/01-table-controls.md`, `design/04-index-screen-redesign.md` §7,
`design/15-hierarchy-and-scannability.md`, `design/17-reconciled-findings.md` §1.

## The four live defects

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
a double-render, not a fix. `emptyKind: 'first-run' | 'cleared'` is a discriminated union and
both arms are required. See [states.md](states.md).

## Bidi

Zero `<bdi>` in this file. Every timestamp, IBAN, plate and phone number in a cell renders
reordered under Arabic. Fix at the cell renderer, not the call sites. See [i18n.md](i18n.md) A2.

## Before you change this file

1. `table-fixed` means **the width model is column widths, full stop.** `min-width`,
   `max-width` and content size on a cell do nothing.
2. Anything keyed off a **label string** or a **column index** is a latent defect. Key off
   declared meaning.
3. A colour literal here is forty screens of off-token. Check [tokens.md](tokens.md) first.
4. Measure row count at 1280 **and** 1152 after any pitch or width change.
