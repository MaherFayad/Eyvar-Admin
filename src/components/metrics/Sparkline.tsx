/**
 * A row-sized plot: shape only, no axes, no dots, no scale.
 *
 * F-7 — one hue on every row; the categorical ramp is licensed only inside the
 * Amplitude override. §9.2 pins the plot LTR, §7.5 breaks the line on a gap and
 * hides the SVG: a 28px shape carries no readable value, so the sentence beside
 * it is the accessible content rather than a `role="img"` label. R18 — no motion.
 */

import { Area, AreaChart, YAxis } from 'recharts'
import { cn } from '@/lib/utils'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'

const CHART_CONFIG = {
  value: { label: 'value', color: 'var(--chart-series)' },
} satisfies ChartConfig

export interface SparklineProps {
  /** One reading per bucket, in order. `null` is a gap and breaks the line. */
  values: readonly (number | null)[]
  /**
   * What the shape is, in words, already translated — *"gross by day, 1 to 30
   * June"*. Rendered visually hidden beside the plot.
   */
  description: string
  className?: string
}

export function Sparkline({ values, description, className }: SparklineProps) {
  const rows = values.map((value, index) => ({ index, value }))
  const readings = values.filter((value): value is number => value !== null)
  /* Pinned from the data so a flat series does not fill the box, and so two
     rows of the same list are read against their own peaks rather than a
     shared one — the list ranks by the gross printed beside it, not by ink. */
  const peak = readings.length > 0 ? Math.max(...readings, 0) : 0

  return (
    <div className={cn('flex', className)}>
      <span className="sr-only">{description}</span>
      {/* §9.2 — the plot area does not mirror. */}
      <div dir="ltr" aria-hidden="true" className="min-w-0 flex-1">
        <ChartContainer config={CHART_CONFIG} className="aspect-auto h-7 w-full">
          <AreaChart data={rows} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
            <YAxis hide domain={[0, peak === 0 ? 'auto' : peak]} />
            <Area
              dataKey="value"
              type="monotone"
              stroke="var(--color-value)"
              strokeWidth={1.5}
              fill="var(--chart-fill)"
              fillOpacity={1}
              dot={false}
              activeDot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ChartContainer>
      </div>
    </div>
  )
}
