/**
 * The one view row every Financials screen renders — **§10.4**.
 *
 * The stadium (or, on a drill-in, the way back) at the inline-start; the view's
 * figures at the inline-end. **No heading**: the selected pill already names the
 * view, and a heading cost every view a row of its own. Words that are not a
 * figure ride the caption line under the figures.
 */

import { Fragment, useEffect, type ReactNode } from 'react'
import { Money } from '@/components/Money'
import type { Halalas } from '@/data/types'
import { cn } from '@/lib/utils'

/* The ISO code, split off the numeral the way `formatMetric.ts` splits a money
   tile: the digits are the figure and `SAR` is the unit run (V-2 / V-21). */
const MONEY_UNIT = 'SAR'

export interface ViewFigure {
  /** Sits above the numeral. Sentence case, one line. */
  label: string
  /** Integer halalas. Renders `--text-kpi` with `SAR` beside it; `null` is the em dash. */
  amountHalalas?: Halalas | null
  /** A figure that is not money — already formatted by the caller. */
  value?: ReactNode
  /** The run beside a non-money numeral. A money figure supplies its own. */
  unit?: string | null
}

/**
 * What a view says about itself on the row above it. A view publishes this and
 * the screen renders it, so the figures sit on the stadium's row rather than on
 * a second row of their own.
 */
export interface ViewFacts {
  /** One to four. Beyond that it is a figure strip, which R2-1 replaced. */
  figures?: readonly ViewFigure[]
  /**
   * V-3's facts rung, directly under the figures it belongs to and sharing
   * their inline-start: 11px uppercase tracked muted, **one line**. Each entry
   * is its own translated sentence; the separator between them is drawn, never
   * written into a string (AC-443).
   */
  caption?: readonly string[]
}

const NO_FACTS: ViewFacts = {}

/**
 * A view publishes its facts to the screen that owns the row. The cleanup is
 * what keeps a view's figures off its sibling: the read that produced them
 * unmounts with it.
 *
 * `facts` must be memoised on primitives — an array rebuilt every render would
 * publish every render.
 */
export function usePublishFacts(
  publish: (facts: ViewFacts | null) => void,
  facts: ViewFacts | null,
): void {
  useEffect(() => {
    publish(facts)
    return () => publish(null)
  }, [publish, facts])
}

export interface ViewRowProps {
  /** The stadium, or on a drill-in the way back. */
  lead: ReactNode
  /**
   * Names the figure list for a screen reader. The active view's own label, so
   * the group is named by the pill that selected it.
   */
  label?: string
  /** The view's figures and caption, published by the view below. */
  facts?: ViewFacts | null
  /** A control that belongs to one view — Revenue's `Charts | Table` and its export. */
  control?: ReactNode
  className?: string
}

export function ViewRow({ lead, label, facts, control, className }: ViewRowProps) {
  const { figures = [], caption = [] } = facts ?? NO_FACTS

  return (
    /* `min-h-11` is the figure block's own height, so the row is the same
       height and the table below starts at the same place on a view that has
       figures and on one that has none. `flex-wrap` puts a wide screen's
       figures under its stadium rather than past the page's edge. */
    <div
      className={cn(
        'flex min-h-11 min-w-0 flex-wrap items-center justify-between gap-x-6 gap-y-1',
        className,
      )}
    >
      {lead}
      {(control || figures.length > 0 || caption.length > 0) && (
        /* `ms-auto` and not `justify-between` alone: when the figures wrap to a
           line of their own under a wide stadium, a lone flex item sits at the
           line's START. The auto inline-start margin puts it at the end on
           both the shared line and the wrapped one. */
        <div className="flex ms-auto min-w-0 flex-wrap items-start justify-end gap-x-6 gap-y-1">
          {control}
          {(figures.length > 0 || caption.length > 0) && (
            /* One cluster: the figures, and the caption directly beneath them
               sharing their inline-start. A caption never sits across the row
               from the numeral it describes. */
            <div className="flex min-w-0 flex-col items-start gap-0.5 text-start">
              {figures.length > 0 && (
                <ul
                  data-numeric
                  role="list"
                  aria-label={label}
                  className="flex list-none flex-wrap items-start justify-end gap-x-6 gap-y-1"
                >
                  {figures.map((figure) => (
                    <li key={figure.label}>
                      <ViewFigureBlock figure={figure} />
                    </li>
                  ))}
                </ul>
              )}
              {caption.length > 0 && (
                /* V-9.4 — size, case, tracking and muted ink in the console's
                   own face; `globals.css` refuses `--ev-text-3` as text ink. */
                <span className="max-w-full truncate text-2xs leading-none font-medium uppercase tracking-wider tabular-nums text-muted-foreground">
                  {caption.map((line, index) => (
                    <Fragment key={line}>
                      {index > 0 && <span aria-hidden="true"> · </span>}
                      <bdi>{line}</bdi>
                    </Fragment>
                  ))}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * One figure, one cluster: the label directly above its numeral on the same
 * inline-start, the unit inline after it. `lg` is the ledger header's size,
 * where the numeral sits over a table column rather than over a view.
 */
export function ViewFigureBlock({
  figure,
  size = 'kpi',
}: {
  figure: ViewFigure
  size?: 'kpi' | 'lg'
}) {
  const isMoney = figure.amountHalalas !== undefined
  const unit = isMoney ? MONEY_UNIT : (figure.unit ?? null)

  return (
    /* **Two lines, not three.** The unit sits on the numeral's baseline rather
       than under it: a third line cost every view 16px before its first row. */
    <div className="flex min-w-0 flex-col items-start gap-0.5 text-start">
      <span className="text-xs leading-none text-muted-foreground">{figure.label}</span>
      <span className="flex items-baseline gap-1.5">
        {/* H4 — `data-slot="metric-value"` is what pins the tabular figures in
            `@layer base`, rather than a class here. */}
        <span
          data-slot="metric-value"
          className={cn(
            'leading-none font-semibold text-foreground',
            size === 'lg' ? 'text-lg' : 'text-kpi',
          )}
        >
          {isMoney ? (
            <Money amount={figure.amountHalalas ?? null} unit="none" />
          ) : (
            <bdi>{figure.value}</bdi>
          )}
        </span>
        {unit !== null && (
          <span className="text-xs leading-none text-muted-foreground">{unit}</span>
        )}
      </span>
    </div>
  )
}
