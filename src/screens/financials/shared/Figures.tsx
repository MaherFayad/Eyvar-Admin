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
 *   §3.7 / D7 §4.9
 *              the anatomy is the tile's: value above label, 17px/600 value,
 *              12px label, hairline card, no shadow, no icon. A figure that
 *              looks like a tile and is not one would be worse than either.
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
  className?: string
}

export function Figure({ label, amount, value, caption = null, className }: FigureProps) {
  return (
    <Card className={cn('h-full gap-1.5', className)}>
      <div className="flex flex-col gap-1 px-(--card-spacing)">
        <span className="text-lg font-semibold tabular-nums text-foreground">
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
  return <ul role="list" className="grid list-none grid-cols-3 gap-3">{children}</ul>
}

export function FigureItem({ children }: { children: ReactNode }) {
  return <li className="min-w-0">{children}</li>
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
export function FigureRow({
  label,
  amount,
  value,
  emphasis = false,
}: {
  label: string
  amount?: Halalas | null
  value?: ReactNode
  emphasis?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-3 py-1',
        emphasis && 'border-t border-border pt-2 font-semibold',
      )}
    >
      <span className={cn('text-sm', emphasis ? 'text-foreground' : 'text-muted-foreground')}>
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
