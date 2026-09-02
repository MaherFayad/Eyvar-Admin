/**
 * The money figure, the figure grid, and the period control — the three shapes
 * Overview and the four summary cards are built from.
 *
 * **These are not `MetricTile`.** `src/components/metrics/` renders a `Metric`
 * — a keyed measure with a comparison, a caption and an `asOf` — and nothing on
 * a Financials card is one: a contribution margin is arithmetic over the
 * period's postings, computed by `derive.ts` at render, with no series behind
 * it and no delta to state. Passing one through a component built for the other
 * would mean minting a fake `Metric` per figure, which is exactly the
 * hand-written literal **AC-346** exists to prevent.
 *
 * Rules applied
 *   §3.7 / D7 §4.9 / H4
 *              the anatomy is the tile's: value above label, **22px/600 value
 *              (`--text-kpi`)**, 12px label, hairline card, no shadow, no icon.
 *              A figure that looks like a tile and is not one would be worse
 *              than either — which is why the H4 numeral lands here in the same
 *              change as `MetricTile` rather than a change later.
 *   §8.3.1 / AC-323
 *              a money value **outside a table** carries the `SAR` code. These
 *              are outside a table, so `Money` keeps its default.
 *   AC-341     a zero renders `0.00 SAR`; an unknown renders an em dash. The
 *              caller passes `null` for the second and never a zero for it.
 *   AC-342     a percentage with a zero denominator renders an em dash. The
 *              type is `number | null` for exactly that, and there is no branch
 *              here that can turn a `null` into `0%`.
 *   §7.5       every figure carries a word. No figure is colour-coded, and
 *              there is no tone on this component at all.
 */

import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { Money } from '@/components/Money'
import { ABSENT, formatPercent, type Language } from '@/lib'
import { cn } from '@/lib/utils'
import type { Halalas } from '@/data/types'

/* ────────────────────────────── one figure ──────────────────────────────── */

export interface FigureProps {
  label: string
  /** Integer halalas. `null` renders the em dash — unknown, never zero. */
  amount?: Halalas | null
  /** For a figure that is not money. Already formatted. */
  value?: ReactNode
  /** One line beneath the label. A denominator, a scope limit, never a status. */
  caption?: string | null
  /**
   * §H4 — `lead` renders `--text-kpi-lead`, and a lead belongs in
   * `FigureLeadRow` so it is three across rather than four.
   *
   * **The same two ranks `Metric.rank` has, and deliberately the same word.**
   * This file's opening rule is that a Financials figure is NOT a `Metric` and
   * must not borrow its component — a contribution margin has no series, no
   * comparison and no `asOf`, so passing one through `MetricTile` would mean
   * minting a fake `Metric` per figure. That argument is about the DATA. Rank
   * is a rendering decision about which numbers a page is for, and a Finance
   * lead moving from `/management/overview` to `/financials/overview` should
   * find the same two weights meaning the same thing. Sharing the vocabulary
   * costs nothing the rule was protecting.
   */
  rank?: 'lead' | 'supporting'
  className?: string
}

export function Figure({
  label,
  amount,
  value,
  caption = null,
  rank = 'supporting',
  className,
}: FigureProps) {
  return (
    <Card className={cn('h-full gap-1.5', className)}>
      <div className="flex flex-col gap-1 px-(--card-spacing)">
        {/* **H4 — the same numeral as `MetricTile`, and it has to be.** This
            file's own rule two paragraphs up is *"the anatomy is the tile's ...
            a figure that looks like a tile and is not one would be worse than
            either"*. Leaving this at `--text-lg` while the tile moved to
            `--text-kpi` would put a 17px figure beside a 22px one on Financials
            Overview, which is that rule failing in the one place it was written
            to hold. Both halves travel together: the size step and the slot
            that pins the tabular figures — see `MetricTile` for why the class
            alone is not the guarantee. */}
        <span
          data-slot="metric-value"
          className={cn(
            'font-semibold text-foreground',
            rank === 'lead' ? 'text-kpi-lead' : 'text-kpi',
          )}
        >
          {value !== undefined ? <bdi>{value}</bdi> : <Money amount={amount ?? null} />}
        </span>
        <span className="text-xs text-muted-foreground">{label}</span>
        {caption !== null && (
          <span className="truncate text-xs text-muted-foreground">
            <bdi>{caption}</bdi>
          </span>
        )}
      </div>
    </Card>
  )
}

/**
 * The grid. Three across, four when four divides the row — the same rule
 * `MetricTileRow` states, applied here for the same reason: a trailing row of
 * two under a row of four reads as a layout that ran out.
 *
 * A list, and it says so: `display: grid` strips list semantics in WebKit, so
 * a screen reader would otherwise get a run of figures with no count.
 */
export function FigureGrid({ children }: { children: ReactNode }) {
  /* `data-numeric` — `globals.css`'s own numeric defence, which had **zero**
     consumers in `src/` and says so: *"the correct hook for a number outside a
     table"*. A figure grid is a column of money read down, so the guarantee
     belongs on the grid rather than on each figure's class list. */
  return (
    <ul data-numeric role="list" className="grid list-none grid-cols-3 gap-3">
      {children}
    </ul>
  )
}

export function FigureItem({ children }: { children: ReactNode }) {
  return <li className="min-w-0">{children}</li>
}

/**
 * §H4's lead row for Financials — three across, `--text-kpi-lead`, first.
 *
 * `MetricTileRow` carries the reasoning in full; the short version is that a
 * rank expressed only as a font size is a rank an operator has to look for, so
 * it is carried by THREE things at once: position (first), width (a third of
 * the region rather than a quarter) and size.
 *
 * The defect on this page specifically: `/financials/overview` rendered
 * **eleven figures at one size**, six of them a P&L that runs
 * `gross - earnings - giveback = contribution` and five of them balance-sheet
 * positions that are not part of that sum at all. Nothing in the layout said
 * which was which, or which of the eleven a Finance lead opens the page for.
 */
export function FigureLeadRow({ children }: { children: ReactNode }) {
  return (
    <ul data-numeric role="list" className="grid list-none grid-cols-3 gap-3 compact:grid-cols-1">
      {children}
    </ul>
  )
}

/* ───────────────────────────── a key-value row ──────────────────────────── */

/**
 * One labelled money line inside a card — the giveback breakdown, the payout
 * confirmation's three lines, the trial-balance totals.
 *
 * `emphasis` is for the line a card is *about*: the contribution margin under
 * its components, the net under the payable and the debt. It is weight, never
 * colour (§7.5, R5a).
 */
/**
 * §H5 — **the operator that says what this line DOES to the running total.**
 *
 * ## The defect
 *
 * The margin card rendered six labelled amounts and a bolded seventh, in the
 * order of a calculation, with nothing stating that it WAS one:
 *
 * ```
 *   Gross bookings          4,432.52        <- the operand
 *   Captain earnings        3,591.15        <- subtracted. Nothing said so.
 *   Gross margin              841.37        <- a subtotal. Nothing said so.
 *   Gross margin %              19.0%       <- not in the sum at all
 *   Giveback                  462.86        <- subtracted
 *   Contribution margin       378.51        <- bold, and the only clue
 * ```
 *
 * A reader who already knows the formula can follow it. A reader who does not
 * cannot tell `Giveback` from `Gross margin %` — one is an operand and the
 * other is a ratio derived from two lines above it — and there is no reading
 * of the card that distinguishes them. The owner asked for *"the calculations
 * to be more clear"*.
 *
 * ## Why an operator column and not a formula line
 *
 * The alternative is a sentence — `Contribution margin = gross - earnings -
 * giveback`. It is worse for three reasons: it duplicates the rows rather than
 * explaining them, it cannot be translated without re-ordering the operands
 * against the rows, and it goes stale silently the day a line is added. A
 * glyph in the leading gutter of each row is the same information positioned so
 * it cannot disagree with the row it is on.
 *
 * `'='` also gets `emphasis` for free at the call site — the line a card is
 * about is the line the sum lands on — so the two are not two decisions.
 *
 * **The operator is `aria-hidden` and the row keeps a word.** A screen reader
 * hearing "minus captain earnings three thousand" would be hearing arithmetic
 * it cannot see the layout of; the rows are read as a list of labelled amounts,
 * which is what they are, and §7.5 is satisfied because the glyph adds emphasis
 * to an order that the reading sequence already carries.
 */
export type FigureOperator = 'add' | 'subtract' | 'equals'

const OPERATOR_GLYPH: Record<FigureOperator, string> = {
  /* U+2212 MINUS, not a hyphen: `Money` already renders the minus sign this way
     for a negative amount (§8.3.2), and two different dashes for the same idea
     on one card is exactly the kind of drift the token layer exists to stop. */
  subtract: '−',
  add: '+',
  equals: '=',
}

export function FigureRow({
  label,
  amount,
  value,
  emphasis = false,
  operator,
}: {
  label: string
  amount?: Halalas | null
  value?: ReactNode
  emphasis?: boolean
  /**
   * §H5 — what this line does to the running total.
   *
   * Three states, and the distinction between the last two matters:
   *   - an operator  — this line is added, subtracted, or is the result
   *   - `null`       — this line is IN the calculation and takes no sign,
   *                    i.e. the first operand. It still reserves the gutter.
   *   - omitted      — this card is not a calculation. No gutter is drawn.
   */
  operator?: FigureOperator | null
}) {
  return (
    <div
      className={cn(
        /* **`max-w-md` IS THE FIX, and the row shape is deliberately kept.**
           A breakdown that sums to a total is a ledger: `label … amount` read
           down a column with the total ruled off beneath it, and stacking the
           pairs would destroy the decimal alignment that makes the column
           addable. So the shape is right and the WIDTH was wrong.

           Measured before this line existed, on `/financials/overview` at 1440:
           the label `Refunds` ended at x=68 and its value began at x=947 —
           **879px of empty row inside a 1014px card**, 87% of the row, with no
           leader and no alignment column to carry the eye across. Fourteen
           pairs on that page were over 200px apart. `max-w-md` caps the pair at
           448px, which is the width the ledger idiom actually reads at.

           It is on the ROW rather than on a list wrapper on purpose: every
           caller renders these into its own container and there is no shared
           parent to hang it on, so putting it here is what makes the rule true
           at all five call sites instead of at the ones that remembered. The
           `emphasis` rule above it then still aligns, because every row in the
           stack is capped to the same measure. */
        'flex max-w-md items-baseline gap-3 py-1',
        emphasis && 'border-t border-border pt-2 font-semibold',
      )}
    >
      {/* **The gutter is present on every row of a card that uses operators at
          all**, drawn or not — an operand with no sign (the first line of any
          sum) must still line its label up with the signed ones beneath it, and
          a gutter that appeared only when a glyph did would step every such
          label 12px to the inline-start. `null` is therefore a real value here
          and means *"this row is in the sum and takes no sign"*; `undefined`
          means *"this card is not a calculation"* and renders no gutter at all,
          which is what leaves the payout confirmation's three plain lines
          exactly as they were. */}
      {operator !== undefined && (
        <span
          aria-hidden="true"
          className="w-3 shrink-0 text-end text-sm tabular-nums text-muted-foreground"
        >
          {operator === null ? '' : OPERATOR_GLYPH[operator]}
        </span>
      )}
      <span
        className={cn(
          'flex-1 text-sm',
          emphasis ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {label}
      </span>
      <span className="text-sm tabular-nums text-foreground">
        {value !== undefined ? <bdi>{value}</bdi> : <Money amount={amount ?? null} />}
      </span>
    </div>
  )
}

/* ─────────────────────────────── percentages ────────────────────────────── */

/**
 * **AC-342 as a component.** `null` in, em dash out — there is no path through
 * this function that renders `0%`, `NaN%` or `Infinity%`, and a caller that
 * wants a zero has to pass a zero.
 */
export function Percent({ value, language }: { value: number | null; language: Language }) {
  if (value === null || !Number.isFinite(value)) {
    return (
      <span className="tabular-nums text-foreground" aria-label={ABSENT}>
        {ABSENT}
      </span>
    )
  }
  return <bdi className="tabular-nums text-foreground">{formatPercent(value, language)}</bdi>
}
