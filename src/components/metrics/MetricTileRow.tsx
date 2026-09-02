/**
 * The metric-tile grid — `design/03-navattic-language.md` §4.9, and the one
 * sanctioned use of the `wide:` variant outside the shell (`globals.css`:
 * *"its three uses are fixed: the sub-tab list's first-run default, the detail
 * rail drop on the inline-end side, and the metric-tile grid"*).
 *
 * **The wording above is deliberate and must not be "corrected" back.** The
 * sentence it quotes used to join the physical side-word to the rail noun with
 * a hyphen — and that alone is a valid Tailwind candidate, which resolved
 * against the theme and emitted a rule setting a **physical** inset from
 * `--ev-rail-w` into the built stylesheet, in a product where every inset is
 * logical. `globals.css:80`-`:88` records the first occurrence; it came from
 * `src/lib/breakpoint.ts:5` and was closed by excluding `src/lib` from the
 * scan. This file lives in `src/components`, which IS scanned, so the same
 * sentence minted the same rule again from a new home.
 *
 * **This comment was itself the third occurrence.** A first draft spelled the
 * offending token out in order to warn about it, and the build put the rule
 * straight back - the same way `MetricTile.tsx` once shipped an arbitrary value
 * by writing that it did not use one. Naming the parts, never the token, is the
 * only form of this warning that does not perform the defect.
 *
 * The lesson generalises: a class name in prose is a class name. It needs no
 * brackets, no arbitrary value, no syntax resembling code - just two ordinary
 * words and an ordinary hyphen. **Verify in `dist`, never in `src`.**
 *
 * **Three across below `--ev-bp-wide`. Above it, four — but only when four
 * divides the row.** The reference shows both and shows why: `02b895df` is four
 * across, and `5b908c10` is **six in two rows of three**, not four-then-two.
 * A trailing row of two under a row of four reads as a layout that ran out,
 * and the eye stops at the ragged edge instead of at the last number.
 *
 * So the column count is chosen from the tile count rather than fixed:
 *
 * ```
 *  4 tiles   ->  4 across          (one clean row)
 *  6 tiles   ->  3 across          (two rows of three — the reference's own)
 *  5 tiles   ->  3 across          (3 + 2 beats 4 + 1)
 * ```
 *
 * **The choice only exists above the breakpoint.** Below it the content region
 * is 912px and D7's 268px tile floor allows three columns and no more, so a
 * four-tile board renders 3 + 1 at 1280 — which is exactly what
 * `auto-fill minmax(268px, 1fr)` does, and shrinking to 219px tiles to avoid a
 * ragged edge would wrap every label instead.
 *
 * The gap is 12px (`gap-3`), measured at 7 destination px between tiles. It is
 * deliberately tighter than the 16px between page-level cards: a tile row is
 * one object read across, not four cards read in turn.
 *
 * **It is a list, and it says so.** Six tiles are six items; without a list
 * role a screen reader gets a run of links with no count. `role="list"` keeps
 * the semantics that `display: grid` strips in WebKit.
 *
 * §7.1's measure note: the PAGE width is fixed and the measure moves down to
 * here. D7 formulates this as `auto-fill minmax(268px, 1fr)`; at the two widths
 * this product has, that yields 3 and 4 — the same two outcomes, without a
 * container query the rest of the tree does not use, and without `auto-fill`'s
 * four-then-two problem.
 */

import type { ReactNode } from 'react'

/**
 * Four across on the desktop console; **one across below 768px**.
 *
 * Four columns of a 390px phone is a 80.5px tile, and 8 of the 11 KPIs on the
 * Management overview clip inside it. That is not a consequence of the KPI
 * numeral moving to 28px — forced back to 22px it still clips 4 of 11, and at
 * the old 17px still 3 of 11. No size in the ramp fits `1,281.86 SAR` into
 * 80.5px, so this is a column count, not a type problem.
 *
 * One-up rather than two-up because the numbers were measured: the compact
 * column is 358px and the widest tile value renders 188px, so one-up clears it
 * by 170px while two-up gives 173px and falls 15px short of the same value.
 * Two-up would fit most tiles and clip the one that matters.
 */
/**
 * **§H4 — the two ranks, and why the grid carries most of the difference.**
 *
 * ## The defect
 *
 * Measured on `/operations/overview` at 2400px before this: **twelve tiles,
 * every one 491px wide, every numeral 28px.** Thirteen numbers with no opinion
 * about which of them the board is for. The owner's words were that these pages
 * are *"so hard to read and get any info from"* and that important metrics
 * should be **bigger than others**; a grid that renders every metric identically
 * cannot express that whatever the type ramp does.
 *
 * ## Three carriers, and size is only one
 *
 * A rank that is only a font size is a weak rank — 28 against 36 in two
 * separate rows is a difference an operator has to look for. What makes the
 * lead row read as the lead row is all three of these at once:
 *
 *   1. **First.** Leads are the first thing under the banner, before anything
 *      else on the board. `MetricBoardScreen` partitions; the order is not this
 *      component's to choose.
 *   2. **Three across, not four.** A lead cell is a third of the content region
 *      against a quarter — 338px vs 251px at 1280 — so the tile is wider before
 *      its numeral is larger.
 *   3. **`--text-kpi-lead`.** 36px against 28px, 1.284 : 1 in cap height. See
 *      the token for why 36 and not 40.
 *
 * ## Three across is a fixed count here, and `auto-fill` would be wrong
 *
 * The supporting grid below runs a fixed four because D7's tile floor and the
 * two widths this product has make `auto-fill minmax(268px, 1fr)` resolve to
 * the same answer with more machinery. The lead row runs a fixed **three** for
 * a stronger reason: `BOARD_LEADS` declares exactly three per board and
 * `board.test.ts` holds it there, so the count is a contract rather than a
 * measurement. A row that reflowed to two-then-one because a board shipped four
 * leads would hide the editorial defect instead of showing it.
 *
 * **Below 768px both grids are one across**, unchanged and for the reason
 * already recorded: four columns of a 390px phone is an 80.5px tile and no size
 * in the ramp fits `1,281.86 SAR` into it. A lead at 36px in a full-width
 * compact cell has 358px and clears every value the product carries.
 */
/**
 * **Three across or four, chosen so the last row is not ragged** — the rule
 * this file's header has always described and the code did not implement.
 *
 * The header states it outright: *"a trailing row of two under a row of four
 * reads as a layout that ran out, and the eye stops at the ragged edge instead
 * of at the last number"*, with a worked table giving 4 tiles a row of four, 6
 * tiles two rows of three and 5 tiles `3 + 2`. The grid was nevertheless a
 * hardcoded `grid-cols-4`, so Operations Overview's nine supporting tiles
 * rendered **4 + 4 + 1** — a single tile alone on the last row beside three
 * empty cells, which is the exact figure the paragraph warns against.
 *
 * **The ceiling is FIVE, on the owner's instruction** — *"make this 5 metrics
 * in the small row"*, said of Risk & Signals, whose five supporting tiles were
 * rendering `3 + 2`. Five is also what makes the two ranks read as two ranks
 * rather than as one grid with a bigger first row: a lead cell is a third of
 * the region and a supporting cell is now a fifth, so the widths are 1.67 : 1
 * where three-against-three was 1 : 1 and only the numeral carried the rank.
 *
 * The rule, in order:
 *   1. Whichever of 5, 4, 3 divides the count exactly — largest first, so a
 *      board of five gets one row of five rather than 3 + 2.
 *   2. Otherwise whichever leaves the FULLEST last row, which is the
 *      generalisation of the header's own `3 + 2 beats 4 + 1`.
 *   3. Ties go to the WIDER count, because the tie means both leave the same
 *      remainder and the wider one leaves fewer rows to read.
 *
 * ```
 *    n   5-up        4-up      3-up      picked
 *    3   3           3         3         3   (one row either way)
 *    4   4           4         3+1       4
 *    5   5           4+1       3+2       5   (Risk & Signals — the ask)
 *    6   5+1         4+2       3+3       3
 *    7   5+2         4+3       3+3+1     4
 *    8   5+3         4+4       3+3+2     4
 *    9   5+4         4+4+1     3+3+3     3   (Operations Overview)
 *   10   5+5         4+4+2     3+3+3+1   5
 * ```
 *
 * **The lead row is NOT subject to this** and stays a fixed three: `BOARD_LEADS`
 * declares exactly three per board and `board.test.ts` holds it there, so its
 * count is a contract rather than a measurement.
 */
export function supportingColumns(count: number): 3 | 4 | 5 {
  if (count <= 0) return 5
  for (const n of [5, 4, 3] as const) if (count % n === 0) return n
  /* No exact fit. Rank by the remainder — a bigger remainder is a fuller last
     row — and break ties toward the wider grid. */
  let best: 3 | 4 | 5 = 5
  for (const n of [5, 4, 3] as const) if (count % n > count % best) best = n
  return best
}

/**
 * The three grid classes, spelled out in full.
 *
 * **Not interpolated, and this is not style.** Tailwind v4 resolves class names
 * by scanning source text; a template literal joining a prefix to a number
 * produces a class the build never sees, emits no rule, and the grid silently
 * falls back to one column — a defect that appears only in `dist`. Every
 * literal that can be rendered is therefore written here as a whole word.
 */
const SUPPORTING_GRID: Record<3 | 4 | 5, string> = {
  3: 'grid list-none grid-cols-3 gap-3 compact:grid-cols-1',
  4: 'grid list-none grid-cols-4 gap-3 compact:grid-cols-1',
  5: 'grid list-none grid-cols-5 gap-3 compact:grid-cols-1',
}

export function MetricTileRow({ children, count }: { children: ReactNode; count: number }) {
  return (
    /* `data-numeric` — the second half of H4's figure guarantee, on the hook
       `globals.css` already declares for *"a number outside a table"* and which
       had no consumers at all. A tile's own numeral gets it from
       `[data-slot="metric-value"]`; this covers everything ELSE in the row that
       is a number — the delta chip, a caption's denominator — so a 4-up row
       scans down its digits rather than shimmering between renders.

       The class comes from `SUPPORTING_GRID`, which spells all three strings
       out — see its note for why an interpolated one would silently fail. */
    <ul
      data-numeric
      role="list"
      className={SUPPORTING_GRID[supportingColumns(count)]}
    >
      {children}
    </ul>
  )
}

/**
 * The lead row — three across, `--text-kpi-lead`, first on the board.
 *
 * A separate component rather than a prop on `MetricTileRow` because the two
 * rows are two `<ul>`s and have to be: a screen reader announcing *"list, 12
 * items"* over a set that is really three headlines and nine supporting figures
 * describes the flat board this change exists to replace. Two lists announce
 * the structure the sighted operator is being shown.
 */
export function MetricLeadRow({ children }: { children: ReactNode }) {
  return (
    <ul data-numeric role="list" className="grid list-none grid-cols-3 gap-3 compact:grid-cols-1">
      {children}
    </ul>
  )
}

export function MetricTileItem({ children }: { children: ReactNode }) {
  return <li className="min-w-0">{children}</li>
}
