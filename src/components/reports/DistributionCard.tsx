/**
 * A part-of-whole read — **the one shape that is a distribution rather than a
 * set of small multiples.**
 *
 * ## Why this exists beside `PanelCard` instead of inside it
 *
 * A panel is a y-axis. Over time, one measure split three ways is three
 * independent series at three scales, so it is three panels and three axes —
 * R4-1, and `PanelCard` renders each. At `grain: 'none'` the window collapses
 * to **one bucket** and those three panels hold three numbers that sum to a
 * whole. There is no axis to share and no scale to distort, so the honest
 * rendering is one figure, not three cards with one number each.
 *
 * That is not a loophole in R4-1. R4-1's finding is about **scale** —
 * *"drivers vs passengers differ by an order of magnitude, so on a shared axis
 * the captains line is a flat trace"* — and a part-of-whole has no shared axis
 * to flatten anything against. The planner already guarantees the case: a pie
 * needs one measure, a split, `grain: 'none'`, an **additive** measure and six
 * or fewer parts, and every one of those five gates is checked in
 * `planReportQuery` before this component is chosen.
 *
 * ## No categorical palette, and none is minted here
 *
 * `globals.css` **deletes** shadcn's five-colour ramp rather than remapping it,
 * and §3.7 forbids a second hue. So the slices are **one hue at descending
 * opacity** — an ordered ramp over a ranked part-of-whole, which is what the
 * data already is, not a categorical scheme. Zero new tokens.
 *
 * Colour is never the sole carrier (§7.5): every part is named and valued in
 * the list beside the figure, which is also what makes it readable at all when
 * the sixth slice is 2 %.
 *
 * Rules applied
 *   §7.2/§7.4  `Other` is last and **renders even at zero**, so it is visible
 *              that something was folded.
 *   §9.2       the plot does not mirror; the card and the list do.
 *   R18        no animation.
 */

import { Cell, Pie, PieChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatMetricValue, formatSeriesValue } from '@/components/metrics'
import type { Measure, ReportPanel, ReportResult } from '@/data/types'
import { isolatedRunProps, type Language, type Translator } from '@/lib'
import { panelTitle } from './PanelCard'
import { seriesOfPanel } from './PanelChart'

const CHART_CONFIG = {
  value: { label: 'value', color: 'var(--chart-series)' },
} satisfies ChartConfig

/** One hue, descending. An ordered ramp over a ranked whole, not a categorical scheme. */
const RAMP = [1, 0.82, 0.64, 0.46, 0.3, 0.16]

export interface DistributionCardProps {
  panels: readonly ReportPanel[]
  result: ReportResult
  measure: Measure | null
  kind: 'pie' | 'bar'
  title: string
  t: Translator
  language: Language
}

export function DistributionCard({
  panels,
  result,
  measure,
  kind,
  title,
  t,
  language,
}: DistributionCardProps) {
  const parts = panels.map((panel, index) => {
    const series = seriesOfPanel(result, panel, 'current')
    return {
      key: panel.panelId,
      label: panelTitle(panel, t).groupValue ?? panelTitle(panel, t).text,
      /* A gap is not a zero, and a zero is not a gap. `null` keeps the part in
         the list — it is a named group with no reading — and out of the chart. */
      value: series?.points[0] ?? null,
      opacity: RAMP[Math.min(index, RAMP.length - 1)] ?? 0.16,
    }
  })

  const drawable = parts.filter((part): part is typeof part & { value: number } => part.value !== null)
  const unit = panels[0]?.unit ?? 'count'

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription className="flex flex-col gap-0.5">
          {measure && <span>{t(measure.population.predicateKey)}</span>}
          {measure?.captionKey && <span>{t(measure.captionKey)}</span>}
          {/* The base: how many named parts carry a reading, out of how many
              the split produced. A share with no denominator is a share of
              nothing in particular. */}
          <span>{t('rb.panel.parts', { readings: drawable.length, total: parts.length })}</span>
        </CardDescription>
      </CardHeader>

      <CardContent className="flex min-w-0 flex-col gap-3">
        <div dir="ltr" role="img" aria-label={title}>
          <ChartContainer config={CHART_CONFIG} className="aspect-auto h-52 w-full">
            {kind === 'pie' ? (
              <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      nameKey="label"
                      formatter={(value) =>
                        typeof value === 'number' ? formatSeriesValue(value, unit, language) : String(value)
                      }
                    />
                  }
                />
                <Pie
                  data={drawable}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={0}
                  isAnimationActive={false}
                  stroke="var(--card)"
                  strokeWidth={1}
                >
                  {drawable.map((part) => (
                    <Cell key={part.key} fill="var(--chart-series)" fillOpacity={part.opacity} />
                  ))}
                </Pie>
              </PieChart>
            ) : (
              <BarChart data={drawable} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <CartesianGrid horizontal={false} vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={{ stroke: 'var(--chart-axis)' }}
                  tickMargin={8}
                  tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
                />
                <YAxis
                  width={56}
                  tickLine={false}
                  axisLine={false}
                  tickCount={4}
                  allowDecimals={unit !== 'count'}
                  tickFormatter={(value: number) => formatSeriesValue(value, unit, language)}
                  tick={{ fill: 'var(--chart-axis)', fontSize: 11 }}
                />
                <ChartTooltip
                  cursor={{ fill: 'var(--chart-grid)' }}
                  content={
                    <ChartTooltipContent
                      nameKey="label"
                      formatter={(value) =>
                        typeof value === 'number' ? formatSeriesValue(value, unit, language) : String(value)
                      }
                    />
                  }
                />
                <Bar dataKey="value" fill="var(--chart-series)" isAnimationActive={false} />
              </BarChart>
            )}
          </ChartContainer>
        </div>

        {/* §7.5 — colour is never the sole carrier, and a 2 % slice is not
            readable from the figure alone. `Other` is last and present even at
            zero, because the fold has to be visible. */}
        <ul className="flex list-none flex-col gap-1">
          {parts.map((part) => (
            <li key={part.key} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex min-w-0 items-center gap-2">
                <svg aria-hidden="true" focusable="false" width="10" height="10" className="shrink-0">
                  <rect
                    width="10"
                    height="10"
                    rx="2"
                    fill="var(--chart-series)"
                    fillOpacity={part.opacity}
                  />
                </svg>
                <span {...isolatedRunProps({ className: 'min-w-0 truncate' }).box}>
                  <bdi {...isolatedRunProps().run}>{part.label}</bdi>
                </span>
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatMetricValue(part.value, unit, language)}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
