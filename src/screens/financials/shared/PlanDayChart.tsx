/**
 * *Gross and contribution by day* — bars for gross, a line for contribution.
 *
 * Both series are SAR, so one axis states both and §3.7's pair-refusal is
 * satisfied. Axis baseline only and no gridlines: Financials is outside the
 * Amplitude override (F-7). §9.2 pins the plot LTR; R18 keeps it still.
 */

import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart'
import { directionFor, formatCount, formatDate, type Language, type Translate } from '@/lib'
import type { PlanRevenuePoint } from '@/data/types'
import { Money } from '@/components/Money'

/** One hue, two roles: the bars take the pale fill, the line the series stroke. */
const CHART_CONFIG = {
  gross: { label: 'gross', color: 'var(--chart-fill)' },
  contribution: { label: 'contribution', color: 'var(--chart-series)' },
} satisfies ChartConfig

const HALALAS_PER_MAJOR = 100

interface Row {
  label: string
  gross: number
  contribution: number
}

export interface PlanDayChartProps {
  daily: readonly PlanRevenuePoint[]
  /** Names the plot for anyone who cannot see it (§7.5). Already translated. */
  description: string
  t: Translate
  language: Language
}

export function PlanDayChart({ daily, description, t, language }: PlanDayChartProps) {
  const rows: Row[] = daily.map((point) => ({
    label: formatDate(`${point.date}T00:00:00+03:00`, { style: 'day-month', language }),
    gross: point.grossHalalas,
    contribution: point.contributionHalalas,
  }))

  /* First, middle and last — three labels a 600px panel carries without them
     touching, and every one of them is a real day in the window. */
  const ticks =
    rows.length > 2
      ? [rows[0]?.label, rows[Math.floor((rows.length - 1) / 2)]?.label, rows[rows.length - 1]?.label]
      : rows.map((row) => row.label)

  return (
    <div dir="ltr" role="img" aria-label={description} className="flex min-h-0 flex-1 flex-col">
      <ChartContainer config={CHART_CONFIG} className="aspect-auto h-72 w-full">
        <ComposedChart accessibilityLayer data={rows} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
          {/* The axis baseline, and nothing else. `vertical={false}` and
              `horizontal={false}` leave the `<XAxis>` line as the only rule. */}
          <CartesianGrid vertical={false} horizontal={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: 'var(--chart-grid)' }}
            tickMargin={8}
            ticks={ticks.filter((label): label is string => label !== undefined)}
            interval={0}
            tickFormatter={(label: string) => label.toUpperCase()}
            tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
          />
          {/* Riyals on the scale, halalas in the data: an axis label is a scale
              mark and `.00` on every one of them carries nothing (§3.7). */}
          <YAxis
            width={44}
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
            tickFormatter={(value: number) =>
              formatCount(Math.round(value / HALALAS_PER_MAJOR), language)
            }
          />
          <ChartTooltip
            cursor={{ fill: 'var(--chart-grid)' }}
            content={<PlanDayTooltip t={t} language={language} />}
          />
          <Bar dataKey="gross" fill="var(--color-gross)" isAnimationActive={false} radius={2} />
          <Line
            dataKey="contribution"
            type="monotone"
            stroke="var(--color-contribution)"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, fill: 'var(--color-contribution)', stroke: 'var(--card)' }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ChartContainer>
    </div>
  )
}

export interface PlanDayTooltipProps {
  /** Recharts injects these two by cloning the element. */
  active?: boolean
  payload?: ReadonlyArray<{ dataKey?: string | number; payload?: Row }>
  t: Translate
  language: Language
}

/**
 * The one part of a plot that MIRRORS (§9.2): a tooltip is chrome, and Recharts
 * renders it inside the container that is pinned LTR, so the direction is
 * restored here and on nothing else. `TrendTooltip` records the same reasoning.
 */
export function PlanDayTooltip({ active, payload, t, language }: PlanDayTooltipProps) {
  if (active !== true || payload === undefined || payload.length === 0) return null
  const row = payload[0]?.payload
  if (row === undefined) return null

  return (
    <div
      dir={directionFor(language)}
      className="grid min-w-32 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-2"
    >
      <p className="font-medium text-foreground">
        <bdi>{row.label}</bdi>
      </p>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-muted-foreground">{t('fin.revenue.plan.chart.gross')}</span>
        <span className="font-medium tabular-nums text-foreground">
          <Money amount={row.gross} unit="none" />
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-muted-foreground">{t('fin.revenue.plan.chart.contribution')}</span>
        <span className="font-medium tabular-nums text-foreground">
          <Money amount={row.contribution} unit="none" />
        </span>
      </div>
    </div>
  )
}
