/**
 * The §3.7 trend plot. **Two colour roles, not five, and both are written out.**
 *
 * ```
 *  ╭ current period ── solid, --chart-series, pale --chart-fill beneath
 *  ╰ comparison     ── SAME HUE, dashed. Never a second colour.
 * ```
 *
 * `TimeSeries` has exactly two windows — `current` and `comparison` — and no
 * `series[]`, so a third series is not something this component could be asked
 * to draw. That is the data layer enforcing §3.7 rather than a convention here.
 *
 * Rules applied
 *   §3.7        single-hue line, thin, very pale area fill beneath it; the
 *               comparison series is the **same hue dotted**; **no gridlines
 *               beyond the axis baseline**; axis labels carry their own
 *               formatting.
 *   §3.7        there is no `--chart-3`. `shadcn init`'s `--chart-1…5` ramp was
 *               DELETED in `globals.css` rather than remapped, because five
 *               slots invite a categorical read the product does not sanction.
 *               A design that appears to need a third series is a finding.
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
 *               around it — title, legend, report link — mirrors normally. A
 *               reversed time axis makes the axis and its numerals run in
 *               opposite directions, which is the defect the rule names.
 *   §9.2 / R4   numerals are Western in both languages and go through
 *               `formatSeriesValue`; money never through `toLocaleString()`.
 *   R18         a chart never pulses or loops. `isAnimationActive={false}` —
 *               and §7.6's `prefers-reduced-motion` guard is global anyway.
 *   §7.5        a **gap** (`value: null`) is not drawn as zero:
 *               `connectNulls={false}` breaks the line, and `ChartCard` states
 *               the gap count in words above the plot. `SeriesPoint`'s own doc
 *               names the defect — *"conflating them is how an outage looks
 *               like a collapse in demand."*
 */

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { formatDate, type Language, type Translate } from '@/lib'
import type { TimeSeries } from '@/data/types'
import { formatSeriesValue } from './formatMetric'

/** The two roles. Both resolve to `--ev-blue`; they differ by DASH, never by hue. */
const CHART_CONFIG = {
  current: { label: 'current', color: 'var(--chart-series)' },
  comparison: { label: 'comparison', color: 'var(--chart-comparison)' },
} satisfies ChartConfig

interface Row {
  label: string
  current: number | null
  comparison: number | null
}

export interface TrendChartProps {
  series: TimeSeries
  /** Names the plot for anyone who cannot see it (§7.5). Already translated. */
  description: string
  t: Translate
  language: Language
}

export function TrendChart({ series, description, t, language }: TrendChartProps) {
  /* The two windows are zipped by INDEX, not by date: a like-for-like previous
     period has different dates by definition, so joining on the date would drop
     every comparison point. The axis carries the CURRENT window's dates, which
     is what §3.7's legend then disambiguates by naming both periods. */
  const rows: Row[] = series.current.points.map((point, index) => ({
    label: formatDate(point.at, { style: 'day-month', language }),
    current: point.value,
    comparison: series.comparison?.points[index]?.value ?? null,
  }))

  const tick = (value: number) => formatSeriesValue(value, series.unit, language)

  return (
    /* §9.2 — the plot is pinned LTR. This is the only physical direction in the
       metric layer and it is the one the rule requires. */
    <div dir="ltr" role="img" aria-label={description}>
      <ChartContainer config={CHART_CONFIG} className="aspect-auto h-48 w-full">
        <AreaChart accessibilityLayer data={rows} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          {/* §3.7 said NO gridlines beyond the axis baseline. **The horizontal
              set is restored, 2026-09-02; the vertical set stays off.**

              The measurement that reopened it: every chart in the product drew
              ZERO gridlines, so reading a value meant carrying a point across
              up to 300px of empty plot to a bare axis. A trend line without a
              grid communicates SHAPE, which is the right answer on a sparkline
              and the wrong one on a board where the number is the page — three
              of these charts sit beside tiles whose whole job is a quantity.

              **Horizontal only, and that is the whole of the amendment.** The
              y-axis is the quantity and the grid is how a reader gets a value
              off it. The x-axis is time and is already labelled at every tick;
              vertical rules there would add fourteen lines that answer a
              question nobody has, which is what §3.7 was protecting against.

              `--chart-grid` is an existing token and no new value is
              introduced. It sits under the series by construction — Recharts
              paints the grid before the areas. */}
          <CartesianGrid horizontal vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: 'var(--chart-axis)' }}
            tickMargin={8}
            minTickGap={16}
            tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
          />
          <YAxis
            width={56}
            tickLine={false}
            axisLine={false}
            tickCount={4}
            /* A count axis over a 0-2 domain gets ticks at 0, 0.67, 1.33 and 2,
               and `formatCount` rounds them to `0 1 1 2` — an axis that shows
               the same label twice. `allowDecimals={false}` makes Recharts pick
               an integer domain instead. Only counts are integral; a rate, a
               rating and a money amount are not. */
            allowDecimals={series.unit !== 'count'}
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
          {series.comparison && (
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
            /* A one-point window and a window whose neighbours are gaps both
               draw nothing without a dot — a line needs two points and a break
               either side of a reading leaves it invisible. That reason is
               unchanged and is why every point still carries one.

               **The LAST point is drawn larger.** Fifteen identical dots rank
               nothing, and on a trend the reader almost always wants the
               current value — the one at the end. A larger dot with a ring in
               the card's own ground reads as "you are here" without a label, a
               second colour or an annotation layer. It is a function rather
               than an object because only the final index differs. */
            dot={(dotProps) => {
              const { key, cx, cy, index } = dotProps as {
                key?: string
                cx?: number
                cy?: number
                index?: number
              }
              if (typeof cx !== 'number' || typeof cy !== 'number') return <g key={key} />
              const last = index === rows.length - 1
              return (
                <circle
                  key={key}
                  cx={cx}
                  cy={cy}
                  r={last ? 3.5 : 2}
                  fill="var(--color-current)"
                  stroke={last ? 'var(--card)' : 'none'}
                  strokeWidth={last ? 1.5 : 0}
                />
              )
            }}
            activeDot={{ r: 3, fill: 'var(--color-current)', stroke: 'var(--card)' }}
            /* A gap BREAKS the line. Joining across it would draw a value that
               was never measured. */
            connectNulls={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  )
}
