/**
 * `metric` — one number from a saved report: value, value-with-delta, or a
 * sparkline (AC-1188). `seriesId: null` reads the report's first series. A
 * gap renders `ABSENT`, never a zero.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { MetricDelta } from '@/components/metrics/MetricTile'
import { Sparkline } from '@/components/metrics/Sparkline'
import { formatSeriesValue } from '@/components/metrics/formatMetric'
import { ABSENT, isolatedRunProps } from '@/lib'
import { useResolvedReport } from '../useResolvedReport'
import { usePageBlocks } from '../PageBlocksContext'
import type { MetricBlock as MetricBlockData } from '@/data/types/page'

export function MetricBlockView({ block }: { block: MetricBlockData }) {
  const { measures, dimensions, scope, today, t, language } = usePageBlocks()
  const resolved = useResolvedReport({ reportId: block.reportId, scope, measures, dimensions, today })
  const state = resolved.data
  const title = state && state.kind !== 'missing' ? state.report.name : t('pg.block.metric.name')

  const series =
    state?.kind === 'ok'
      ? (block.seriesId ? state.result.series.find((s) => s.id === block.seriesId) : state.result.series[0]) ?? null
      : null
  const points = series?.points ?? []
  const latest = [...points].reverse().find((v): v is number => v !== null) ?? null
  const latestIndex = latest === null ? -1 : points.lastIndexOf(latest)
  const previous = latestIndex > 0 ? points[latestIndex - 1] : null
  const deltaPercent = latest !== null && previous !== null && previous !== 0 ? ((latest - previous) / Math.abs(previous)) * 100 : null
  const measure = series ? measures.find((m) => m.key === series.measureKey) : null

  return (
    <Card size="sm" className="min-w-0">
      <CardHeader>
        <CardTitle className="min-w-0">
          <span {...isolatedRunProps({ className: 'min-w-0 truncate' }).box}>
            <bdi {...isolatedRunProps().run}>{title}</bdi>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="min-w-0">
        {resolved.status === 'loading' ? (
          <LoadingSkeleton pattern="P5" rows={1} label={title} />
        ) : resolved.status === 'error' || state === null ? (
          <ErrorState
            scope="card"
            card={false}
            message={t('rb.dashboard.tile.error')}
            action={{ label: t('rb.dashboard.tile.retry'), onClick: resolved.refetch }}
          />
        ) : state.kind === 'missing' ? (
          <p className="text-sm text-muted-foreground">{t('rb.dashboard.tile.missing')}</p>
        ) : state.kind === 'invalid' ? (
          <p role="alert" className="text-sm text-muted-foreground">
            {t('rb.dashboard.tile.invalid')}
          </p>
        ) : series === null ? (
          <p className="text-sm text-muted-foreground">{t('pg.block.metric.noSeries')}</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            <span className="text-2xl font-semibold tabular-nums">
              {latest === null ? ABSENT : formatSeriesValue(latest, series.unit, language)}
            </span>
            {block.format === 'value-delta' && (
              <MetricDelta
                deltaPercent={deltaPercent}
                higherIsBetter={measure?.higherIsBetter ?? true}
                t={t}
                language={language}
              />
            )}
            {block.format === 'sparkline' && (
              <Sparkline
                values={points}
                description={t('pg.block.metric.sparklineDescription', { name: title })}
                className="h-8"
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
