/**
 * The alert composer's preview (`22-analytics-v2.md` §4.3, AC-1226): the
 * threshold line or anomaly band dashed, a filled amber dot per would-fire
 * bucket. Dumb — the composer runs `evaluate()` and hands this the drawn
 * result. `--color-warning-graphic` matches the `firing` badge's tone (R7),
 * so the preview and the eventual notification agree on what "fires" means.
 */

import type { ReactElement } from 'react'
import { Area, AreaChart, ReferenceArea, ReferenceLine, YAxis } from 'recharts'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import type { MetricUnit } from '@/data/types'
import type { Language } from '@/lib'
import { formatMetricValue } from '@/components/metrics/formatMetric'

const INERT = { pointerEvents: 'none' } as const

const CHART_CONFIG = {
  value: { label: 'value', color: 'var(--chart-series)' },
} satisfies ChartConfig

export type AlertPreviewReference =
  | { kind: 'line'; value: number }
  | { kind: 'band'; low: number; high: number }

export interface AlertPreviewChartProps {
  /** Ascending, oldest first — the series' last 60 complete buckets, or fewer. */
  buckets: readonly string[]
  /** Parallel to `buckets`. `null` is a gap and breaks the line (§3.5). */
  points: readonly (number | null)[]
  /** Parallel to `buckets` — `true` where the condition would have fired. */
  fired: readonly boolean[]
  /** The dashed reference. `null` for `relative`/`missing`, which draw no fixed line. */
  reference: AlertPreviewReference | null
  unit: MetricUnit
  language: Language
  /** Visually hidden beside the plot — names the count so the marks' meaning
   * does not require counting dots (§4.3's keyboard note). */
  description: string
}

/** A filled dot on a would-fire bucket; nothing on any other. */
function firedDot(fired: readonly boolean[]) {
  return function FiredDot(props: { cx?: number; cy?: number; index?: number }): ReactElement {
    const { cx, cy, index } = props
    if (cx === undefined || cy === undefined || index === undefined || !fired[index]) {
      return <g />
    }
    return (
      <circle
        cx={cx}
        cy={cy}
        r={3}
        fill="var(--color-warning-graphic)"
        stroke="var(--card)"
        strokeWidth={1}
        style={INERT}
      />
    )
  }
}

export function AlertPreviewChart({
  buckets,
  points,
  fired,
  reference,
  unit,
  language,
  description,
}: AlertPreviewChartProps) {
  const rows = buckets.map((bucket, index) => ({ bucket, value: points[index] ?? null }))
  const readings = points.filter((value): value is number => value !== null)
  const bandValues = reference?.kind === 'band' ? [reference.low, reference.high] : []
  const lineValue = reference?.kind === 'line' ? [reference.value] : []
  const domainValues = [...readings, ...bandValues, ...lineValue]
  const min = domainValues.length > 0 ? Math.min(...domainValues, 0) : 0
  const max = domainValues.length > 0 ? Math.max(...domainValues, 0) : 0

  return (
    <div className="relative flex flex-col gap-1">
      <span className="sr-only">{description}</span>
      {/* §9.2 — the plot area does not mirror; the axis is LTR-pinned. */}
      <div dir="ltr" aria-hidden="true" className="min-w-0">
        <ChartContainer config={CHART_CONFIG} className="aspect-auto h-32 w-full">
          <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <YAxis hide domain={[min, max === min ? min + 1 : max]} />
            {reference?.kind === 'band' && (
              <ReferenceArea
                y1={reference.low}
                y2={reference.high}
                fill="var(--chart-fill)"
                fillOpacity={0.6}
                stroke="var(--chart-axis)"
                strokeDasharray="4 3"
                style={INERT}
              />
            )}
            {reference?.kind === 'line' && (
              <ReferenceLine
                y={reference.value}
                stroke="var(--chart-axis)"
                strokeDasharray="4 3"
                style={INERT}
              />
            )}
            <Area
              dataKey="value"
              type="monotone"
              stroke="var(--color-value)"
              strokeWidth={1.5}
              fill="var(--chart-fill)"
              fillOpacity={0.4}
              dot={firedDot(fired)}
              activeDot={false}
              connectNulls={false}
              isAnimationActive={false}
              style={INERT}
            />
          </AreaChart>
        </ChartContainer>
      </div>
      {/* Screen-reader readout of the endpoints, since the plot itself carries
         no axis labels — §4.3's "the marks' meaning is available without
         visually counting dots" extended to the value scale. */}
      {readings.length > 0 && (
        <span className="sr-only">
          {formatMetricValue(Math.min(...readings), unit, language)} –{' '}
          {formatMetricValue(Math.max(...readings), unit, language)}
        </span>
      )}
    </div>
  )
}
