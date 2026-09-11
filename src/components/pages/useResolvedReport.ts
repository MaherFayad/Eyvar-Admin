/**
 * Resolves one `reportId` under a page's scope — the same four/five states
 * `DashboardTile.tsx` proved (AC-1186), extracted so `ReportBlock` and
 * `MetricBlock` share one fetch-and-scope path instead of two. Each block
 * owns its own call: a page with nine blocks never fails as a unit
 * (`03-pages-and-dashboards.md` §1, "the `missing` tile state … unchanged").
 */

import { useCallback, useMemo } from 'react'
import { useAsync, type AsyncResult } from '@/hooks'
import { getReport, planReportQuery, runReport } from '@/data/clients'
import { applyBoardScope, type BoardScope, type ScopedTileQuery } from '@/data/clients/dashboards'
import { isApiError } from '@/data/types'
import type { Dimension, Measure, QueryViolation, ReportResult, SavedReport } from '@/data/types'

export type ResolvedReportState =
  | { kind: 'ok'; report: SavedReport; scoped: ScopedTileQuery; result: ReportResult }
  | { kind: 'invalid'; report: SavedReport; scoped: ScopedTileQuery; violations: QueryViolation[] }
  /** 404, and only 404 — a transport failure rejects and becomes `useAsync`'s own error state instead. */
  | { kind: 'missing' }

export interface UseResolvedReportOptions {
  reportId: string
  scope: BoardScope
  measures: readonly Measure[]
  dimensions: readonly Dimension[]
  today: string
}

export function useResolvedReport({
  reportId,
  scope,
  measures,
  dimensions,
  today,
}: UseResolvedReportOptions): AsyncResult<ResolvedReportState> {
  /* Structural, not referential: a parent that rebuilds `scope` on every
     render of a page that just refetched must not look like a new scope. */
  const scopeKey = useMemo(() => JSON.stringify({ range: scope.range, filters: scope.filters }), [scope])

  const load = useCallback(
    async (signal: AbortSignal): Promise<ResolvedReportState> => {
      let report: SavedReport
      try {
        report = (await getReport(reportId, signal)).data
      } catch (thrown) {
        if (isApiError(thrown) && thrown.kind === 'not-found') return { kind: 'missing' }
        throw thrown
      }
      const scoped = applyBoardScope(report.query, scope, { measures, dimensions }, today)
      const outcome = await runReport(scoped.query, { today, signal })
      if (outcome.status === 'invalid-query') {
        return { kind: 'invalid', report, scoped, violations: outcome.violations }
      }
      return { kind: 'ok', report, scoped, result: outcome.result }
    },
    [reportId, today, scope, measures, dimensions],
  )

  return useAsync<ResolvedReportState>(load, {
    /* `measures.length` marks the catalogue's arrival: `applyBoardScope`
       reads `legalFilterFields`, empty until it lands, so a block that
       resolved before it did must re-run once, not never. */
    deps: [reportId, today, scopeKey, measures.length],
    cacheKey: 'reports.run',
    isEmpty: () => false,
  })
}

/** Planned against the query that RAN (the board's scope may differ from the saved one) — used for chart-type coercion captions. */
export function planScopedQuery(
  scoped: ScopedTileQuery,
  measures: readonly Measure[],
  dimensions: readonly Dimension[],
  today: string,
) {
  return planReportQuery(scoped.query, { measures, dimensions }, today)
}
