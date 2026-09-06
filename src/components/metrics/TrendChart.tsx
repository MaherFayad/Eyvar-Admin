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
 *   §9.2        **the TOOLTIP is the exception, and it is chrome.** Recharts
 *               renders it inside `ChartContainer`'s div rather than in a
 *               portal, so it inherited the plot's pin and laid Arabic copy out
 *               left-to-right. The rule names the plot area and the SVG axis
 *               group; a tooltip mirrors with the page, so `TrendTooltip`
 *               restores the document direction on its own card and on nothing
 *               else.
 *   §A10        the tooltip names the bucket for **every** series, so the
 *               comparison row carries the day it was measured on rather than
 *               borrowing the current window's — see `Row.comparisonLabel`.
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

import { Area, AreaChart, ReferenceLine, XAxis, YAxis } from 'recharts'
import { cn } from '@/lib/utils'
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart'
import { ABSENT, directionFor, formatCount, formatDate, type Language, type Translate } from '@/lib'
import type { MetricUnit, TimeSeries } from '@/data/types'
import { formatSeriesValue } from './formatMetric'

/** The two roles. Both resolve to `--ev-blue`; they differ by DASH, never by hue. */
const CHART_CONFIG = {
  current: { label: 'current', color: 'var(--chart-series)' },
  comparison: { label: 'comparison', color: 'var(--chart-comparison)' },
} satisfies ChartConfig

/** Halalas to riyals. `formatMoney` states the same relation in its own file. */
const HALALAS_PER_MAJOR = 100

/**
 * The next round number at or above `peak` — 1, 2 or 5 times a power of ten.
 *
 * It is what makes the scale read `75 / 50` instead of `66 / 33`. The ladder is
 * the one every axis library uses and it is written out here rather than read
 * back off Recharts, because the marks and the domain have to agree and only
 * one of the two can be the source.
 */
function niceCeiling(peak: number): number {
  if (!Number.isFinite(peak) || peak <= 0) return 0
  const magnitude = 10 ** Math.floor(Math.log10(peak))
  /* The 2.5 and the 7.5 are what put a peak of 66 on a 75 axis rather than a
     100 one — a third of the plot spent on headroom is a third of the shape
     not drawn. They are on the ladder every charting library carries for the
     same reason. */
  for (const step of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5, 10]) {
    const candidate = step * magnitude
    if (candidate >= peak) return candidate
  }
  return 10 * magnitude
}

/**
 * One x position, and **the two dates it stands for** rather than the one.
 *
 * `label` is the CURRENT window's day and is what the axis and the tooltip's
 * heading carry. `comparisonLabel` is the day the dashed reading was taken on,
 * which is a different date by definition — see the zip below — and until it
 * was carried here the tooltip printed a value from one day under a heading
 * naming another, unmarked. That is not a polish gap; it is the tooltip
 * stating a fact that is false.
 *
 * `null` when there is no comparison window, or when it is shorter than the
 * current one and this index falls off its end.
 */
interface Row {
  label: string
  comparisonLabel: string | null
  current: number | null
  comparison: number | null
}

export interface TrendChartProps {
  series: TimeSeries
  /**
   * **Fill the box instead of declaring a height.** `h-48` is right for a chart
   * in a card, whose card sizes to it. On a board the panel shares a grid row
   * with a ranked list and the row is as tall as the list, so a declared height
   * left the chart's column ending short with page ground under it — see
   * `ChartCard`. A floor is kept so a two-row list cannot squash the plot.
   */
  fill?: boolean
  /** Names the plot for anyone who cannot see it (§7.5). Already translated. */
  description: string
  t: Translate
  language: Language
}

export function TrendChart({ series, description, fill = false, t, language }: TrendChartProps) {
  /* The two windows are zipped by INDEX, not by date: a like-for-like previous
     period has different dates by definition, so joining on the date would drop
     every comparison point. The axis carries the CURRENT window's dates, which
     is what §3.7's legend then disambiguates by naming both periods. */
  const rows: Row[] = series.current.points.map((point, index) => {
    const against = series.comparison?.points[index]
    return {
      label: formatDate(point.at, { style: 'day-month', language }),
      /* The zip is by index; the LABEL is by date. Both facts are true and the
         tooltip has to carry both, or the reader is told the dashed line's
         value belongs to a day it does not. */
      comparisonLabel:
        against === undefined ? null : formatDate(against.at, { style: 'day-month', language }),
      current: point.value,
      comparison: against?.value ?? null,
    }
  })

  const tick = (value: number) => formatSeriesValue(value, series.unit, language)

  /**
   * **The scale, as two labelled rules inside the plot rather than a column of
   * ticks beside it.**
   *
   * The y-axis was a 44px gutter carrying four labels, so on a 236px panel a
   * fifth of the width was spent on the scale and the plot started an indent in
   * from the title above it. The reference puts the scale ON the plot: two
   * hairlines, each with its value set small above its own left end, and the
   * area running to the panel's edge. What a reader takes off an axis is the
   * order of magnitude, and two marks give that as well as four — while giving
   * back the width the shape is drawn in.
   *
   * **Two, and they are the top and the half.** `niceMax` rounds the highest
   * reading up to a round number so the labels are `75 / 50` rather than
   * `66 / 33`; the zero line is the foot of the plot and is not drawn, because
   * the area's own base already is it.
   *
   * The domain is pinned to `[0, niceMax]` for the same reason the marks are
   * computed rather than read back: Recharts would otherwise choose its own
   * maximum and the two would disagree about where the top line goes.
   */
  const readings = rows.flatMap((row) =>
    [row.current, row.comparison].filter((value): value is number => value !== null),
  )
  const peak = readings.length > 0 ? Math.max(...readings) : 0
  const niceMax = niceCeiling(peak)
  /* **The second mark is two thirds of the top when two thirds is itself a
     round number, and half otherwise.** Straight halving put a 75 axis's lower
     line at `38`, which is not a number anybody reads off a scale; two thirds
     of 75 is 50, which is the reference's own pair and the one a reader of a
     0–75 axis expects. A 0–100 axis fails the test at 66.7 and falls back to
     50, which is right there for the same reason. */
  const half = niceMax / 2
  const twoThirds = (niceMax * 2) / 3
  const marks =
    niceMax > 0 ? [niceMax, niceCeiling(twoThirds) === twoThirds ? twoThirds : half] : []

  /* First, middle and last, which is what the reference labels and what a
     seven-to-fifteen point window can carry without the labels touching. Read
     off the rows so a window of any length names its own ends. */
  const xTicks =
    rows.length > 2
      ? [rows[0]?.label, rows[Math.floor((rows.length - 1) / 2)]?.label, rows[rows.length - 1]?.label]
      : rows.map((row) => row.label)

  /* **The y-axis drops the cents, and the tooltip keeps them.**
     `formatSeriesValue` is the value formatter and it is right everywhere a
     reading is quoted: a tooltip saying `312.40` is the number that was
     measured. On the AXIS it produced `300.00  200.00  100.00  0.00` — four
     labels whose last three characters are identical and carry no information,
     stacked down the left of a 236px plot. An axis label is a SCALE MARK, not
     a reading; what a reader takes off it is the order of magnitude.
     `formatMoney`'s own rounding is not used because it would round the
     amount — this rounds the LABEL, at the axis, and only there. */
  const axisTick = (value: number) =>
    series.unit === 'money'
      ? formatCount(Math.round(value / HALALAS_PER_MAJOR), language)
      : tick(value)

  return (
    /* §9.2 — the plot is pinned LTR. This is the only physical direction in the
       metric layer and it is the one the rule requires. */
    <div
      dir="ltr"
      role="img"
      aria-label={description}
      className={cn(fill && 'flex min-h-0 flex-1 flex-col')}
    >
      <ChartContainer
        config={CHART_CONFIG}
        className={cn('aspect-auto w-full', fill ? 'min-h-48 flex-1' : 'h-48')}
      >
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
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            ticks={xTicks.filter((label): label is string => label !== undefined)}
            /* **`0`, or Recharts culls the ones it thinks will collide.** With
               the default it dropped the FIRST of the three — the window's own
               start date — leaving an axis that named its middle and its end.
               Three labels across a 480px panel cannot collide; the ticks are
               chosen here precisely so that is true. */
            interval={0}
            /* Uppercase, which is the reference's treatment for every scale
               mark on the board and is a no-op in Arabic, a script with no
               case. The size and the colour are what carry it there. */
            tickFormatter={(label: string) => label.toUpperCase()}
            tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
          />
          {/* Present for the SCALE and drawn for nothing: the marks below are
              the visible axis. `width={0}` is what removes the gutter, and the
              domain is pinned so the top mark lands on the top of the plot. */}
          <YAxis
            width={0}
            domain={[0, niceMax === 0 ? 'auto' : niceMax]}
            tick={false}
            tickLine={false}
            axisLine={false}
          />
          {marks.map((value) => (
            <ReferenceLine
              key={value}
              y={value}
              stroke="var(--chart-grid)"
              label={{
                value: axisTick(value),
                position: 'insideTopLeft',
                fill: 'var(--chart-axis)',
                fontSize: 11,
                /* Above its own line, not on it — the reference's placement,
                   and the reason the label never sits inside the area fill. */
                dy: -4,
                dx: 0,
              }}
            />
          ))}
          <ChartTooltip
            cursor={{ stroke: 'var(--chart-grid)' }}
            content={<TrendTooltip unit={series.unit} t={t} language={language} />}
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

/**
 * **The tooltip — §A10, and the one place in this file that MIRRORS.**
 *
 * ```
 *  ┌────────────────────────────┐
 *  │ 21 JUN                     │  the CURRENT window's day
 *  │ This period          312   │
 *  │ Previous period      287   │
 *  │   on 14 Jun                │  ← the day the dashed reading was taken
 *  └────────────────────────────┘
 * ```
 *
 * Two defects closed, and neither is cosmetic.
 *
 * **1 — the comparison row names its own day.** The windows are zipped by
 * index (see `rows` above, and the reason there), so the heading's date is the
 * current window's and the dashed value beneath it was measured on a different
 * one. Before `Row.comparisonLabel` the tooltip printed the two under one date
 * with nothing to say they differed, which is a false statement rather than a
 * missing one. It is a second line rather than a suffix on the series name:
 * `Previous period` + ` on 14 Jun` assembled inline would be a sentence built
 * by concatenation, which AC-713 forbids and which no translation survives.
 *
 * **2 — §9.2, and this is the RTL defect the plot's own pin created.** Recharts
 * renders the tooltip INSIDE `ChartContainer`'s div rather than in a portal, so
 * it inherited the `dir="ltr"` correctly pinned on the plot: Arabic copy laid
 * out left-to-right, and `justify-between` pinned the label to the PHYSICAL
 * left in both languages. §9.2's prohibition names *the plot area and the SVG
 * axis group*; **a tooltip is chrome and mirrors with the page**, exactly as
 * the map's legend and stats bar do in the same table. So the document
 * direction is restored here, on this card, and nowhere else — the plot and
 * the axis stay pinned.
 *
 * **Why this is not `ChartTooltipContent`.** That component destructures
 * `className` and spreads nothing, so there is no way to hand it a `dir` — and
 * a direction is not a class, so no wrapper class can supply one either. It is
 * also unrenderable outside a `ChartContainer` (it reads chart context), which
 * puts the two assertions above out of reach of a test. This carries the same
 * container tokens and the same anatomy, minus the colour indicator the
 * `formatter` branch already suppressed: §3.7's two roles differ by DASH, so a
 * pair of identical dots would rank nothing.
 *
 * Exported because the two facts above are testable only by rendering it.
 */
export interface TrendTooltipProps {
  /** Recharts injects these three by cloning the element. */
  active?: boolean
  payload?: ReadonlyArray<{ dataKey?: string | number; value?: number | null; payload?: Row }>
  unit: MetricUnit
  t: Translate
  language: Language
}

export function TrendTooltip({ active, payload, unit, t, language }: TrendTooltipProps) {
  if (active !== true || payload === undefined || payload.length === 0) return null
  const row = payload[0]?.payload
  if (row === undefined) return null

  return (
    /* The card's own direction, restored from the language. Never on the SVG,
       never on the axis group — see the note above. */
    <div
      dir={directionFor(language)}
      /* D33 — it recesses. A tooltip is anchored to what it describes and
         reads against the card it floats over, so it takes the popover's
         ground and edge rather than the page's. */
      className="grid min-w-32 items-start gap-1.5 rounded-lg border border-popover-border bg-popover px-2.5 py-1.5 text-xs"
    >
      {/* The bucket, once, at the top. A day-month run in a card that may be
          Arabic — isolated for the reason `ChartCard`'s legend gives. */}
      <p className="font-medium text-foreground">
        <bdi>{row.label}</bdi>
      </p>
      <div className="grid gap-1.5">
        {payload.map((entry) => {
          const comparison = entry.dataKey === 'comparison'
          const on = comparison ? row.comparisonLabel : null
          return (
            <div
              key={String(entry.dataKey)}
              className="flex w-full items-start justify-between gap-2"
            >
              <span className="flex min-w-0 flex-col text-muted-foreground">
                <span>
                  {comparison ? t('overview.legend.comparison') : t('overview.legend.current')}
                </span>
                {on !== null && (
                  <span className="text-xs">
                    <bdi>{t('overview.tooltip.on', { date: on })}</bdi>
                  </span>
                )}
              </span>
              {/* A gap reads as an em dash, never as a zero — the rule
                  `connectNulls={false}` enforces in the plot, said in text. */}
              <span className="font-medium tabular-nums text-foreground">
                <bdi>
                  {typeof entry.value === 'number'
                    ? formatSeriesValue(entry.value, unit, language)
                    : ABSENT}
                </bdi>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
