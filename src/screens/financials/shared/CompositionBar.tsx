/**
 * *Where the gross went* — one 100% stadium in three segments, over a legend.
 *
 * F-7 — three strengths of ONE hue, never a second. The bar is `aria-hidden`
 * and the legend is the accessible content: a segment carries a share nobody can
 * read off it, and the line beneath states the amount and the share in words.
 */

import { cn } from '@/lib/utils'
import { ABSENT, formatPercent, type Language } from '@/lib'
import { Money } from '@/components/Money'
import type { Halalas } from '@/data/types'
import { percentOrNull } from './derive'

/**
 * The three strengths, in the order they are drawn. One hue at 100 / 60 / 25 %,
 * which is what F-7 licenses; a categorical ramp is not.
 */
const SEGMENT_TONE = ['bg-chart-series', 'bg-chart-series/60', 'bg-chart-series/25'] as const

export interface CompositionSegment {
  id: string
  /** Already translated. */
  label: string
  amountHalalas: Halalas
}

export interface CompositionBarProps {
  segments: readonly CompositionSegment[]
  /** The denominator every share is taken over — the plan's gross. */
  totalHalalas: Halalas
  language: Language
}

export function CompositionBar({ segments, totalHalalas, language }: CompositionBarProps) {
  const shares = segments.map((segment) => percentOrNull(segment.amountHalalas, totalHalalas))

  return (
    <div className="flex flex-col gap-3">
      {/* The bar is a MARK. Everything it encodes is in the legend below it,
          so it is hidden rather than labelled with a sentence it cannot carry. */}
      <div aria-hidden="true" className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
        {segments.map((segment, index) => (
          <span
            key={segment.id}
            className={cn('h-full', SEGMENT_TONE[index % SEGMENT_TONE.length])}
            style={{ inlineSize: `${shares[index] ?? 0}%` }}
          />
        ))}
      </div>

      <ul className="flex flex-col gap-1">
        {segments.map((segment, index) => (
          <li key={segment.id} className="flex items-baseline gap-2">
            <span
              aria-hidden="true"
              className={cn(
                'size-2 shrink-0 translate-y-px rounded-full',
                SEGMENT_TONE[index % SEGMENT_TONE.length],
              )}
            />
            <span className="flex-1 text-sm text-muted-foreground">{segment.label}</span>
            <span className="text-sm tabular-nums text-foreground">
              <bdi>
                <Money amount={segment.amountHalalas} unit="none" />
              </bdi>
            </span>
            {/* AC-342 — an em dash on a zero denominator, never `0%`. */}
            <span className="w-12 text-end text-sm tabular-nums text-muted-foreground">
              {shares[index] === null || shares[index] === undefined
                ? ABSENT
                : formatPercent(shares[index], language)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
