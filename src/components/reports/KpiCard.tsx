/**
 * §4.1 — `kpi` is not Recharts: a `MetricTile`-shaped card with the rolled-up
 * total or end value, R4-5's neutral delta chip, and a `Sparkline` when
 * `grain !== 'none'`. Legality (`plan.ts`) guarantees one panel here.
 */

import { lazy, Suspense } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { MetricDelta } from '@/components/metrics/MetricTile'
import { comparisonWindow } from '@/data/clients'
import type { CurrencyCode, Measure, MetricUnit, ReportPanel, ReportResult } from '@/data/types'
import { formatDate, type Language, type Translator } from '@/lib'
import { PanelNumeral } from './PanelCard'
import { declaredAggregate, periodDelta, rollUpSeries } from './rollup'

/* WP-8.4 finding 1 — the number, the delta and the title need no recharts;
   only the shape below does, so this card statically imports the rest and
   waits on nothing but the sparkline itself. */
const LazySparkline = lazy(() =>
  import('@/components/metrics/Sparkline').then((m) => ({ default: m.Sparkline })),
)

export interface KpiCardProps {
  panel: ReportPanel
  result: ReportResult
  measure: Measure | null
  title: string
  unit: MetricUnit
  currency: CurrencyCode | null
  framed?: boolean
  t: Translator
  language: Language
}

export function KpiCard({
  panel,
  result,
  measure,
  title,
  unit,
  currency,
  framed = true,
  t,
  language,
}: KpiCardProps) {
  const current = result.series.find((s) => s.panelId === panel.panelId && s.role === 'current') ?? null
  const comparison =
    result.series.find((s) => s.panelId === panel.panelId && s.role === 'comparison') ?? null

  const aggregate = current ? declaredAggregate(current, measure ?? undefined) : null
  const now = current && aggregate !== null ? rollUpSeries(current, aggregate, result.buckets.length) : null
  const priorAggregate = comparison ? declaredAggregate(comparison, measure ?? undefined) : null
  const before =
    comparison && priorAggregate !== null
      ? rollUpSeries(comparison, priorAggregate, result.buckets.length)
      : null

  const from = result.buckets[0]
  const to = result.buckets[result.buckets.length - 1]
  const kind = result.query.periodComparison
  const hasComparison = kind !== 'none' && from !== undefined && to !== undefined
  const baseline = hasComparison ? comparisonWindow({ from: from!, to: to! }, kind) : null

  const range =
    from !== undefined && to !== undefined
      ? t('rb.control.window.range', {
          from: formatDate(from, { style: 'day-month', language }),
          to: formatDate(to, { style: 'day-month', language }),
        })
      : null

  const grain = result.query.grain

  const Frame = framed ? Card : 'div'

  if (current?.blocked) {
    return (
      <Frame className={framed ? 'w-full' : undefined}>
        <CardContent className="flex flex-col gap-2 px-3 py-4">
          <p role="status" className="text-sm text-muted-foreground">
            {t('rb.panel.blocked', { permission: current.blocked })}
          </p>
        </CardContent>
      </Frame>
    )
  }

  return (
    <Frame className={framed ? 'w-full' : undefined}>
      <CardContent className="flex flex-col gap-2 px-3 py-4">
        <p className="min-w-0 truncate text-xs text-muted-foreground">
          <bdi>{title}</bdi>
        </p>
        <PanelNumeral value={now?.value ?? null} unit={unit} currency={currency} framed language={language}>
          {hasComparison && (
            <MetricDelta
              deltaPercent={
                periodDelta(now?.value ?? null, before?.value ?? null) === null
                  ? null
                  : periodDelta(now?.value ?? null, before?.value ?? null)! * 100
              }
              higherIsBetter={measure?.higherIsBetter ?? true}
              t={t}
              language={language}
            />
          )}
        </PanelNumeral>
        {range !== null && (
          <p className="text-xs text-muted-foreground">
            <bdi>{t('rb.headline.window', { range })}</bdi>
          </p>
        )}
        {baseline !== null && (
          <p className="text-xs text-muted-foreground">
            <bdi>
              {t('rb.headline.from', {
                date: formatDate(baseline.from, { style: 'day-month', language }),
              })}
            </bdi>
          </p>
        )}
        {grain !== 'none' && current && (
          /* `h-7` — `Sparkline`'s own fixed height (`Sparkline.tsx`), so the
             chunk arriving does not move the delta chip above it. */
          <Suspense fallback={<Skeleton className="mt-1 h-7 w-full" />}>
            <LazySparkline
              values={current.points}
              description={t('rb.chart.kpi.sparkline', { title })}
              className="mt-1"
            />
          </Suspense>
        )}
      </CardContent>
    </Frame>
  )
}
