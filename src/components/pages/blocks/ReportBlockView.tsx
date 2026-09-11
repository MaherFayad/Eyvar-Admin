/**
 * `report` — a chart or table from a saved report, resolved through
 * `useResolvedReport` (`DashboardTile`'s own five states, AC-1186). The
 * block IS the frame: `framed={false}` on both composers, one hairline per
 * block, matching the fidelity fix `DashboardTile.tsx` made for a tile.
 */

import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { reportMode } from '@/data/types'
import type { ReportBlock as ReportBlockData } from '@/data/types/page'
import { isolatedRunProps } from '@/lib'
import { isSeriesMode } from '@/screens/reports/ReportBuilder'
import { ReportModeCanvas } from '@/screens/reports/ReportModeCanvas'
import { ResultCanvas } from '@/components/reports/ResultCanvas'
import { planScopedQuery, useResolvedReport } from '../useResolvedReport'
import { usePageBlocks } from '../PageBlocksContext'

const HEIGHT_CLASS: Record<ReportBlockData['height'], string> = {
  S: 'h-block-h-s',
  M: 'h-block-h-m',
  L: 'h-block-h-l',
  XL: 'h-block-h-xl',
}

export function ReportBlockView({ block }: { block: ReportBlockData }) {
  const { measures, dimensions, scope, today, noDataSentence, t, language, onOpenReport } = usePageBlocks()
  const resolved = useResolvedReport({ reportId: block.reportId, scope, measures, dimensions, today })
  const measuresByKey = Object.fromEntries(measures.map((m) => [m.key, m]))
  const state = resolved.data
  const report = state && state.kind !== 'missing' ? state.report : null
  const title = report ? report.name : (block.title ?? t('pg.block.report.name'))
  const seriesShape = state?.kind === 'ok' ? isSeriesMode(reportMode(state.scoped.query)) : false

  return (
    <Card size="sm" className={`min-w-0 ${HEIGHT_CLASS[block.height]}`}>
      <CardHeader>
        <CardTitle className="min-w-0">
          {report ? (
            <Button type="button" variant="link" className="min-w-0 px-0" onClick={() => onOpenReport(report)}>
              <span {...isolatedRunProps({ className: 'min-w-0 truncate' }).box}>
                <bdi {...isolatedRunProps().run}>{title}</bdi>
              </span>
            </Button>
          ) : (
            <span {...isolatedRunProps({ className: 'min-w-0 truncate' }).box}>
              <bdi {...isolatedRunProps().run}>{title}</bdi>
            </span>
          )}
        </CardTitle>
        {report && (
          <CardAction>
            <p className="text-xs text-muted-foreground">{t(`rb.mode.${reportMode(report.query)}`)}</p>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className={`min-w-0 h-full overflow-auto ${state?.kind === 'ok' ? 'px-0' : ''}`}>
        {resolved.status === 'loading' ? (
          <LoadingSkeleton pattern="P5" label={title} />
        ) : resolved.status === 'error' || state === null ? (
          <ErrorState
            scope="card"
            card={false}
            message={t('rb.dashboard.tile.error')}
            action={{ label: t('rb.dashboard.tile.retry'), onClick: resolved.refetch }}
          />
        ) : state.kind === 'missing' ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <p className="text-sm text-muted-foreground">{t('rb.dashboard.tile.missing')}</p>
          </div>
        ) : state.kind === 'invalid' ? (
          <div role="alert" className="flex flex-col items-center gap-2 py-8 text-center">
            <p className="text-sm text-muted-foreground">{t('rb.dashboard.tile.invalid')}</p>
            <ul className="flex list-none flex-col gap-0.5">
              {state.violations.map((violation) => (
                <li key={`${violation.code}-${violation.field}`} className="text-xs text-muted-foreground">
                  {t(violation.reasonKey, violation.reasonParams)}
                </li>
              ))}
            </ul>
          </div>
        ) : !seriesShape ? (
          <ReportModeCanvas
            status="content"
            result={state.result}
            stale={false}
            violations={[]}
            measuresByKey={measuresByKey}
            onRetry={resolved.refetch}
            framed={false}
            noDataSentence={noDataSentence}
            t={t}
            language={language}
          />
        ) : (
          <ResultCanvas
            status="content"
            result={state.result}
            stale={false}
            violations={[]}
            measuresByKey={measuresByKey}
            coercedFrom={
              planScopedQuery(state.scoped, measures, dimensions, today).chartTypeCoerced
                ? state.scoped.query.chartType
                : null
            }
            effectiveChartType={planScopedQuery(state.scoped, measures, dimensions, today).effectiveChartType}
            onRetry={resolved.refetch}
            onRetrySeries={() => resolved.refetch()}
            framed={false}
            noDataSentence={noDataSentence}
            t={t}
            language={language}
          />
        )}
      </CardContent>
    </Card>
  )
}
