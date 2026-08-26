/**
 * The §3.7 trend plot. **Two colour roles, not five, and every one of them is
 * written out.**
 *
 * ```
 *  ╭ current period ── solid, --chart-series, pale --chart-fill beneath
 *  ╰ comparison     ── SAME HUE, dashed. Never a second colour.
 * ```
 *
 * Rules applied
 *   §3.7        single-hue line, thin, very pale area fill beneath it; the
 *               comparison series is the **same hue dotted**; **no gridlines
 *               beyond the axis baseline**; axis labels carry their own
 *               formatting.
 *   §3.7        there is no `--chart-3`. `shadcn init`'s `--chart-1…5` ramp was
 *               DELETED rather than remapped, because five slots invite a
 *               categorical read the product does not sanction. A design that
 *               appears to need a third series is a finding, not a licence.
 *   **Q5**      Recharts 3.8.0 ships ~30 colour literals as PROP DEFAULTS — a
 *               `<Line dataKey="x" />` with no stroke paints `#3182bd`, and it
 *               passes every source audit because the value lives in
 *               `node_modules`. All 30 are suppressed by the defence block in
 *               `globals.css` keyed on `[data-slot="chart"]`. **That block is
 *               load-bearing and every stroke and fill below is set explicitly
 *               anyway** — belt and braces, because the defence is a selector
 *               list and a future Recharts version can add a thirty-first.
 *   §9.2        **the plot area does not mirror.** `DESIGN.md` §9.2 is
 *               explicit: *MUST NOT apply `dir="rtl"` … to any chart plot area
 *               or SVG axis group*, and *MUST NOT reverse a time-series axis in
 *               Arabic mode*. So the plot is pinned `dir="ltr"` while the card
 *               around it — title, legend, report link — mirrors normally.
 *               A reversed time axis makes the axis and its numerals run in
 *               opposite directions, which is the defect the rule names.
 *   §9.2 / R4   numerals are Western in both languages and go through
 *               `formatSeriesValue`; money never through `toLocaleString()`.
 *   R18         a chart never pulses or loops. `isAnimationActive={false}` —
 *               and §7.6's `prefers-reduced-motion` guard is global anyway.
 *   §7.5        a **gap** (`value: null`) is not drawn as zero:
 *               `connectNulls={false}` breaks the line, and `ChartCard` states
 *               the gap count in words above the plot. Colour is never the
 *               only carrier and neither is an absence of ink.
 */

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { formatDate, type DateStyle, type Language, type Translate } from '@/lib'
import type { BucketSize, ChartBody } from '@/screens/metrics/contract'
import { formatSeriesValue } from './formatMetric'

/** The two roles. Both resolve to `--ev-blue`; they differ by DASH, never by hue. */
const CHART_CONFIG = {
  current: { label: 'current', color: 'var(--chart-series)' },
  comparison: { label: 'comparison', color: 'var(--chart-comparison)' },
} satisfies ChartConfig

type TrendBody = Extract<ChartBody, { kind: 'trend' }>

/**
 * The axis tick, derived from the bucket size **here** rather than baked by the
 * data layer — so a tick reads `25 Jun` in English and `٢٥ يونيو`'s Latin-digit
 * equivalent in Arabic, from one series.
 */
const TICK_STYLE: Record<BucketSize, DateStyle> = {
  hour: 'time',
  day: 'day-month',
  week: 'day-month',
  month: 'day-month-year',
}

interface Row {
  label: string
  current: number | null
  comparison: number | null
}

export interface TrendChartProps {
  body: TrendBody
  /** Names the plot for anyone who cannot see it (§7.5). Already translated. */
  description: string
  t: Translate
  language: Language
}

export function TrendChart({ body, description, t, language }: TrendChartProps) {
  /* The two series are zipped by INDEX, not by date: a like-for-like previous
     period has different dates by definition, and joining on the date would
     silently drop every comparison point. */
  const rows: Row[] = body.points.map((point, index) => ({
    label: formatDate(point.at, { style: TICK_STYLE[body.bucket], language }),
    current: point.value,
    comparison: body.comparison?.points[index]?.value ?? null,
  }))

  const tick = (value: number) => formatSeriesValue(value, body.unit, language)

  return (
    /* §9.2 — the plot is pinned LTR. This is the only physical direction in the
       metric layer and it is the one the rule requires. */
    <div dir="ltr" role="img" aria-label={description}>
      <ChartContainer config={CHART_CONFIG} className="aspect-auto h-40 w-full">
        <AreaChart accessibilityLayer data={rows} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          {/* §3.7 — NO gridlines beyond the axis baseline. Both are off; the
              element stays so the intent is visible rather than inferred from
              an omission. */}
          <CartesianGrid horizontal={false} vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: 'var(--chart-axis)' }}
            tickMargin={8}
            minTickGap={24}
            tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
          />
          <YAxis
            width={44}
            tickLine={false}
            axisLine={false}
            tickCount={4}
            tickFormatter={tick}
            tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
          />
          <ChartTooltip
            cursor={{ stroke: 'var(--chart-grid)' }}
            content={
              <ChartTooltipContent
                labelKey="label"
                formatter={(value, name) => (
                  <span className="flex w-full justify-between gap-2">
                    <span className="text-muted-foreground">
                      {name === 'comparison'
                        ? t('overview.legend.comparison')
                        : t('overview.legend.current')}
                    </span>
                    <span className="font-medium tabular-nums text-foreground">
                      {typeof value === 'number' ? tick(value) : String(value)}
                    </span>
                  </span>
                )}
              />
            }
          />

          {/* Comparison FIRST, so the current period paints over it. Same hue,
              dashed, no fill — §3.7's "never a second colour". */}
          {body.comparison && (
            <Area
              dataKey="comparison"
              type="monotone"
              stroke="var(--color-comparison)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              fill="none"
              fillOpacity={0}
              dot={false}
              activeDot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          )}

          <Area
            dataKey="current"
            type="monotone"
            stroke="var(--color-current)"
            strokeWidth={1.5}
            fill="var(--chart-fill)"
            fillOpacity={1}
            dot={false}
            activeDot={{ r: 3, fill: 'var(--color-current)', stroke: 'var(--card)' }}
            /* Fact 3, row 2 — a gap BREAKS the line. Joining across it would
               draw a value that was never measured. */
            connectNulls={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  )
}
