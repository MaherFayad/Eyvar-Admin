/**
 * `FactGrid` — a set of independent labelled facts, laid out so the label and
 * its value stay next to each other at every width.
 *
 * ## The defect this exists to close
 *
 * The product had ~60 hand-built `flex … justify-between` rows standing in for
 * a definition list. That row is correct at 300px and wrong at 1000px, and
 * nothing in it knows the difference — it pins the label to one edge and the
 * value to the other and lets the container decide how far apart they end up.
 * Measured in the running app at 1440:
 *
 * ```
 *   /financials/overview     14 pairs over 200px apart, worst 879px in a 1014px row
 *   /admin/communications    23 pairs
 *   /admin/workspace          5 pairs, worst 527px
 * ```
 *
 * 879px between the word `Refunds` and the number `158.86 SAR` is 87% of the
 * row spent on nothing, with no leader, no zebra and no alignment column to
 * carry the eye across. The owner's report of it was exact: *"titles at the far
 * left, but the value is at the far right of the screen."*
 *
 * ## The rule, and why it is a grid rather than a narrower row
 *
 * **A label and its value are never more than `--fact-col` apart**, and past
 * that width the layout wraps into another column instead of stretching. That
 * is the whole component. `repeat(auto-fit, minmax(…, 1fr))` is what makes one
 * markup serve every container the product has: the same `FactGrid` renders one
 * column in the 320px detail rail, two in the 480px drawer, and four across a
 * 1040px card, with no breakpoint, no prop and no caller deciding.
 *
 * Stacked — label ABOVE value — rather than a narrower side-by-side row,
 * because the pair is then legible at any column width without a second
 * decision about how to split it, and because it lets the VALUE carry the
 * weight. `fields.tsx` already found the ranking this needs (H1/H3: *"12px grey
 * label, 14px ink value … size and colour move in the same direction"*) and it
 * is kept here, one step up, since a fact in a grid has the room a rail row
 * did not.
 *
 * ## What this is NOT for
 *
 * **A breakdown that sums to a total.** `Figures.tsx`'s `FigureRow` is the
 * right shape there — a ledger reads `label … amount` down a column with the
 * total ruled off beneath it, and stacking would destroy the alignment that
 * makes the column addable. That form's problem is width, not shape, and it is
 * fixed where it lives by capping the measure. Do not replace one with the
 * other; they answer different questions.
 *
 * **A table.** Three or more facts about each of several records is a table.
 *
 * ## Accessibility
 *
 * A real `<dl>` with `<dt>`/`<dd>` pairs, so the association is announced
 * rather than implied by adjacency. Each pair is wrapped in a `<div>`, which is
 * the one permitted grouping element inside `dl` and is what lets the grid
 * place a pair as a unit. `--fact-col` is a CSS variable so a caller can widen
 * the minimum for long values without reaching into the class list.
 */

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface Fact {
  /** Already translated. This component never calls `t`. */
  label: string
  /**
   * Already formatted and already bidi-isolated by whoever formatted it.
   * A `ReactNode` so a caller can pass a `<Money>`, a `<StatusBadge>` or a
   * link, which is most of why this is not a `string`.
   */
  value: ReactNode
}

export interface FactGridProps {
  facts: readonly Fact[]
  /**
   * Minimum column width. The default suits a name, a phone number, a date or
   * a money amount; raise it for a column of addresses rather than letting one
   * long value force a scrollbar.
   */
  minColumn?: string
  className?: string
}

export function FactGrid({ facts, minColumn = '11rem', className }: FactGridProps) {
  if (facts.length === 0) return null

  return (
    <dl
      /* `data-numeric` — `globals.css`'s hook for *"a number outside a table"*.
         A fact grid is where amounts, counts and dates land off a table, so the
         tabular-figure guarantee belongs on the container rather than on each
         value's class list. Same reasoning as `FigureGrid` and `FieldList`. */
      data-numeric
      style={{ '--fact-col': minColumn } as React.CSSProperties}
      className={cn(
        'grid gap-x-6 gap-y-3',
        /* THE RULE, in one declaration. `auto-fit` collapses empty tracks so a
           two-fact grid in a wide card does not leave two ghost columns, and
           `minmax(…, 1fr)` is what stops a single fact stretching to the
           container's full width — which is the defect this file exists for. */
        'grid-cols-[repeat(auto-fit,minmax(var(--fact-col),1fr))]',
        className,
      )}
    >
      {facts.map((fact) => (
        /* `<div>` is the only grouping element `dl` permits, and it has to be
           here rather than around the whole list: the grid places its CHILDREN,
           so a pair has to be one child or the label and value land in
           different tracks. */
        <div key={fact.label} className="flex min-w-0 flex-col gap-0.5">
          <dt className="truncate text-xs text-muted-foreground">{fact.label}</dt>
          {/* H1/H3 — the value outranks its label on BOTH channels at once,
              size and colour. It is the thing being scanned for; the label is
              how you found it. */}
          {/* `break-words` is load-bearing, and it is a defect fix rather than a
              precaution. A value with no space in it — an email, a URL, an IBAN
              typed without gaps — has no wrap opportunity, and `overflow-wrap:
              normal` then paints the glyphs straight out of the track. Measured
              at 1440 on the captain's Identity tab: the cell is 191px and
              `a.alqahtani.aldosari.riyadh.operations@example-domain-that-is-long.com`
              needs 330, so 139px of ink landed on top of the Gender column's
              value. The BOX never overflowed — `min-w-0` was already doing its
              job — which is why this was invisible to every layout assertion.

              `break-word` and not `anywhere`: it breaks only a word that cannot
              fit on a line of its own, so ordinary values wrap exactly as they
              did. And not `truncate`, which is right for the LABEL above (you
              found the row by it) and wrong for the value: half an email
              address is not a shorter fact, it is a wrong one. */}
          <dd className="min-w-0 break-words text-sm font-medium text-foreground">{fact.value}</dd>
        </div>
      ))}
    </dl>
  )
}
