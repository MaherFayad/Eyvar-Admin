/**
 * The one view header every Financials view renders — **R2-1**.
 *
 * Heading, an optional note and an uppercase tracked fact line at the
 * inline-start; one to three figures at the inline-end, each a label above a
 * `--text-kpi` numeral with its unit on a small line. Flat, no card (V-1).
 */

import type { ReactNode } from 'react'
import { Money } from '@/components/Money'
import type { Halalas } from '@/data/types'

/* The ISO code, split off the numeral the way `formatMetric.ts:265` splits a
   money tile: the digits are the figure and `SAR` is the unit line (V-2/V-21). */
const MONEY_UNIT = 'SAR'

export interface ViewFigure {
  /** Sits above the numeral. Sentence case, one line. */
  label: string
  /** Integer halalas. Renders `--text-kpi` with `SAR` beneath; `null` is the em dash. */
  amountHalalas?: Halalas | null
  /** A figure that is not money — already formatted by the caller. */
  value?: ReactNode
  /** The small line under a non-money numeral. A money figure supplies its own. */
  unit?: string | null
}

export interface ViewHeaderProps {
  heading: string
  /** One prose line under the heading — a state in words, never a status colour. */
  note?: string | null
  /** V-3's facts rung: 11px uppercase tracked, Inter, muted ink. */
  caption?: string | null
  /** One to three. More than three is a figure strip, which R2-1 replaced. */
  figures?: readonly ViewFigure[]
  /**
   * A block at the inline-end that is not a figure — the operator's own
   * authority envelope (**AC-384**) is a used-of-cap pair and a caps line, so
   * no single numeral states it.
   */
  detail?: ReactNode
  /**
   * The loading state: the header renders **nothing** rather than a label over
   * a placeholder numeral, because a figure an operator can misread as a
   * reading is worse than an absent one (§3.7).
   */
  loading?: boolean
}

export function ViewHeader({
  heading,
  note = null,
  caption = null,
  figures = [],
  detail = null,
  loading = false,
}: ViewHeaderProps) {
  if (loading) return null

  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pb-1">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="truncate text-sm font-semibold text-foreground">
          <bdi>{heading}</bdi>
        </h2>
        {note !== null && <p className="text-xs text-muted-foreground">{note}</p>}
        {/* V-3 / V-9.4 — size, case, tracking and muted ink in the console's own
            face: `MetricTile.tsx` records the ruling against the reference's
            monospace, and `globals.css` refuses `--ev-text-3` as a text colour. */}
        {caption !== null && (
          <span className="text-2xs font-medium uppercase tracking-wider tabular-nums text-muted-foreground">
            <bdi>{caption}</bdi>
          </span>
        )}
      </div>

      {(detail !== null || figures.length > 0) && (
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          {detail}
          {figures.map((figure) => (
            <ViewFigureBlock key={figure.label} figure={figure} />
          ))}
        </div>
      )}
    </div>
  )
}

function ViewFigureBlock({ figure }: { figure: ViewFigure }) {
  const isMoney = figure.amountHalalas !== undefined
  const unit = isMoney ? MONEY_UNIT : (figure.unit ?? null)

  return (
    <div className="flex min-w-0 flex-col items-end gap-0.5">
      <span className="text-xs text-muted-foreground">{figure.label}</span>
      {/* H4 — the numeral is the tile's, and `data-slot="metric-value"` is what
          pins its tabular figures in `@layer base` rather than a class here. */}
      <span data-slot="metric-value" className="text-kpi font-semibold text-foreground">
        {isMoney ? (
          <Money amount={figure.amountHalalas ?? null} unit="none" />
        ) : (
          <bdi>{figure.value}</bdi>
        )}
      </span>
      {unit !== null && <span className="text-2xs text-muted-foreground">{unit}</span>}
    </div>
  )
}
