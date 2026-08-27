/**
 * One panel's plot — **one panel is one y-axis, and that is the whole of R4-1.**
 *
 * ```
 *  ╭ current     ── solid, --chart-series, pale --chart-fill beneath
 *  ╰ comparison  ── SAME HUE, dashed. Never a second colour.
 * ```
 *
 * `ReportResult` carries no `yAxis` and no `sharedScale` flag. Every series
 * names a `panelId`, and **two series share a y-axis if and only if they share
 * a panel** — the only pair that ever does is a measure and its own period
 * comparison, which is the same number at the same scale and which §3.7 already
 * rules is one hue with the comparison dashed. So this component receives one
 * panel and cannot be handed two measures to overlay; small multiples are not a
 * rendering it selects, they are what the result already is.
 *
 * R4-1 §1.2(c) is why that matters more than colour: *drivers vs passengers*
 * differ by an order of magnitude by construction, so on a shared axis the
 * captains line is a flat trace and its trend — the thing the owner asked to
 * see — is invisible. **Two hues would make it a coloured flat trace.**
 *
 * Rules applied
 *   §3.7        single-hue line, thin, very pale area fill beneath; the
 *               comparison is the SAME hue dashed; no gridlines beyond the
 *               axis baseline; axis labels carry their own formatting.
 *   §3.7        there is no `--chart-3`. shadcn's `--chart-1…5` ramp is DELETED
 *               in `globals.css`, not remapped, and this file mints nothing.
 *   **Q5**      Recharts ships ~30 colour literals as prop defaults, which pass
 *               a source audit because they live in `node_modules`. Every
 *               stroke and fill below is set explicitly on top of the defence
 *               block `globals.css` keys on the chart slot.
 *   §9.2        **the plot area does not mirror.** The plot is pinned one
 *               direction while the card around it mirrors normally; a reversed
 *               time axis makes the axis and its numerals run opposite ways.
 *   §7.5        a **gap** is not a zero. Nulls break the line, and the panel
 *               states the reading count in words. A zero inside coverage is a
 *               real zero and draws on the baseline.
 *   §3.5        a **partial** bucket is drawn and marked, never dropped and
 *               never extrapolated — the pale band behind it is that mark.
 *   R18         no animation, ever.
 */

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceArea, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { formatSeriesValue } from '@/components/metrics'
import { formatDate, type Language, type Translate } from '@/lib'
import type { ReportPanel, ReportResult, ReportSeries } from '@/data/types'

/** The two roles. Both resolve to the same hue; they differ by DASH, never by hue. */
const CHART_CONFIG = {
  current: { label: 'current', color: 'var(--chart-series)' },
  comparison: { label: 'comparison', color: 'var(--chart-comparison)' },
} satisfies ChartConfig

interface Row {
  label: string
  current: number | null
  comparison: number | null
}

export interface PanelChartProps {
  panel: ReportPanel
  result: ReportResult
  /** `line` or `bar`. A pie and a table are not one panel's shape — see `DistributionChart`. */
  kind: 'line' | 'bar'
  /** Names the plot for anyone who cannot see it (§7.5). Already translated. */
  description: string
  t: Translate
  language: Language
}

export function seriesOfPanel(result: ReportResult, panel: ReportPanel, role: ReportSeries['role']) {
  return result.series.find((s) => s.panelId === panel.panelId && s.role === role) ?? null
}

export function PanelChart({ panel, result, kind, description, t, language }: PanelChartProps) {
  const current = seriesOfPanel(result, panel, 'current')
  const comparison = seriesOfPanel(result, panel, 'comparison')

  /* The two windows are zipped by INDEX, not by date: a like-for-like previous
     period has different dates by definition, so joining on the date would drop
     every comparison point. The axis carries the CURRENT window's dates, which
     is what the legend then disambiguates by naming both periods. */
  const rows: Row[] = result.buckets.map((bucket, index) => ({
    label: formatDate(bucket, { style: 'day-month', language }),
    current: current?.points[index] ?? null,
    comparison: comparison?.points[index] ?? null,
  }))

  const tick = (value: number) => formatSeriesValue(value, panel.unit, language)
  const partials = current?.partialBucketIndexes ?? []

  return (
    /* §9.2 — the plot is pinned one direction. This is the only physical
       direction in the module and it is the one the rule requires. */
    <div dir="ltr" role="img" aria-label={description}>
      <ChartContainer config={CHART_CONFIG} className="aspect-auto h-44 w-full">
        {kind === 'line' ? (
          <AreaChart accessibilityLayer data={rows} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <CartesianGrid horizontal={false} vertical={false} />
            <PartialBands partials={partials} rows={rows} />
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
              /* A count axis over a 0–2 domain gets ticks at 0, 0.67, 1.33, 2
                 and rounds them to `0 1 1 2` — an axis showing one label twice.
                 Only counts are integral. */
              allowDecimals={panel.unit !== 'count'}
              tickFormatter={tick}
              tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
            />
            <ChartTooltip
              cursor={{ stroke: 'var(--chart-grid)' }}
              content={<ChartTooltipContent labelKey="label" formatter={formatter(tick, t)} />}
            />
            {/* Comparison FIRST, so the current period paints over it. */}
            {comparison && (
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
              /* A one-point window, and a reading with gaps either side, both
                 draw nothing without a dot. */
              dot={{ r: 2, fill: 'var(--color-current)', stroke: 'none' }}
              activeDot={{ r: 3, fill: 'var(--color-current)', stroke: 'var(--card)' }}
              /* A gap BREAKS the line. Joining across it would draw a value
                 that was never measured. */
              connectNulls={false}
              isAnimationActive={false}
            />
          </AreaChart>
        ) : (
          <BarChart accessibilityLayer data={rows} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <CartesianGrid horizontal={false} vertical={false} />
            <PartialBands partials={partials} rows={rows} />
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
              allowDecimals={panel.unit !== 'count'}
              tickFormatter={tick}
              tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
            />
            <ChartTooltip
              cursor={{ fill: 'var(--chart-grid)' }}
              content={<ChartTooltipContent labelKey="label" formatter={formatter(tick, t)} />}
            />
            {comparison && (
              /* Same hue, and the comparison bar is the paler one. A second hue
                 is what §3.7 forbids; a second opacity is not a second hue. */
              <Bar dataKey="comparison" fill="var(--chart-fill)" isAnimationActive={false} />
            )}
            <Bar dataKey="current" fill="var(--color-current)" isAnimationActive={false} />
          </BarChart>
        )}
      </ChartContainer>
    </div>
  )
}

function formatter(tick: (value: number) => string, t: Translate) {
  return (value: unknown, name: unknown) => (
    <span className="flex w-full justify-between gap-2">
      <span className="text-muted-foreground">
        {name === 'comparison' ? t('rb.table.role.comparison') : t('rb.table.role.current')}
      </span>
      <span className="font-medium tabular-nums text-foreground">
        {typeof value === 'number' ? tick(value) : String(value)}
      </span>
    </span>
  )
}

/**
 * §3.5's partial buckets, **rendered and marked**.
 *
 * *"A flow measure's final partial bucket is what makes every trend look like a
 * collapse at the right-hand edge."* Dropping it hides a real reading; leaving
 * it unmarked hands the operator a collapse that is an artefact of the clock.
 * So it draws, behind a band in the structural hairline tone — a token that
 * already exists, no mint — and the panel states the same fact in words for
 * anyone who cannot see the band.
 */
function PartialBands({ partials, rows }: { partials: readonly number[]; rows: readonly Row[] }) {
  if (partials.length === 0) return null
  return (
    <>
      {partials.map((index) => {
        const row = rows[index]
        if (!row) return null
        return (
          <ReferenceArea
            key={index}
            x1={row.label}
            x2={row.label}
            fill="var(--chart-grid)"
            fillOpacity={1}
            ifOverflow="extendDomain"
          />
        )
      })}
    </>
  )
}
