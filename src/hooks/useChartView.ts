/**
 * §2.8: view-only chart prefs, kept OUT of `ReportQuery` so flipping one costs
 * no request. Persisted through `persistence.ts`'s D16 class-3 cache, keyed on
 * the report id or the query hash for a draft. Not in `UI_STATE_KEYS` (the
 * shell's own schema); namespaced `ui.chartView.*` so sign-out still sweeps it.
 */

import { useEffect, useMemo, useState } from 'react'
import { createCachedStore, type UiStateStore } from '@/lib/persistence'
import type { ChartType } from '@/data/types'

export interface ChartView {
  yScale: 'linear' | 'log'
  /** Defaults `true` for a bar family, `false` for line/area — stated, never "auto" (§2.3). */
  yStartAtZero: boolean
  dataLabels: boolean
  showTable: boolean
  /** Series ids hidden by the legend (§2.1). A comparison series toggles as one unit with its current. */
  hidden: string[]
}

const BAR_FAMILY: ReadonlySet<ChartType> = new Set([
  'bar',
  'stacked-bar',
  'stacked-100',
  'horizontal-bar',
])

/** §4.4 — the stated default, per chart type. Never "auto". */
export function defaultChartView(chartType: ChartType): ChartView {
  return {
    yScale: 'linear',
    yStartAtZero: BAR_FAMILY.has(chartType),
    dataLabels: false,
    showTable: false,
    hidden: [],
  }
}

function isChartView(value: unknown): value is ChartView {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    (v['yScale'] === 'linear' || v['yScale'] === 'log') &&
    typeof v['yStartAtZero'] === 'boolean' &&
    typeof v['dataLabels'] === 'boolean' &&
    typeof v['showTable'] === 'boolean' &&
    Array.isArray(v['hidden']) &&
    v['hidden'].every((id) => typeof id === 'string')
  )
}

export interface UseChartViewResult {
  view: ChartView
  setYScale: (yScale: ChartView['yScale']) => void
  setYStartAtZero: (yStartAtZero: boolean) => void
  setDataLabels: (dataLabels: boolean) => void
  setShowTable: (showTable: boolean) => void
  /** Toggles one series' membership in `hidden`. A comparison id toggles with it (caller passes both). */
  toggleHidden: (...seriesIds: string[]) => void
  /** Hides every OTHER series currently drawn. A second isolate of the same set restores all (AC-1139). */
  isolate: (seriesIds: readonly string[], everyDrawnId: readonly string[]) => void
  showAll: () => void
}

/**
 * `key` is the report id, or `serialiseReportQuery(query)` for an unsaved
 * draft (the caller's choice — this hook does not compute the hash itself, so
 * it never has to know the query shape). `chartType` seeds the stated default
 * the first time this key is ever seen.
 */
export function useChartView(key: string, chartType: ChartType): UseChartViewResult {
  const storeKey = `ui.chartView.${key}`
  const store: UiStateStore<ChartView> = useMemo(
    () => createCachedStore<ChartView>(storeKey, isChartView),
    [storeKey],
  )

  const [view, setView] = useState<ChartView>(() => store.read() ?? defaultChartView(chartType))

  /* The key changes when the operator switches report or edits the query
     enough to change its hash. Re-seed from that key's own cache (or its own
     stated default) rather than carrying the previous report's view forward. */
  useEffect(() => {
    setView(store.read() ?? defaultChartView(chartType))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-seed on key change only
  }, [storeKey])

  const commit = (next: ChartView) => {
    setView(next)
    store.write(next)
  }

  return {
    view,
    setYScale: (yScale) => commit({ ...view, yScale }),
    setYStartAtZero: (yStartAtZero) => commit({ ...view, yStartAtZero }),
    setDataLabels: (dataLabels) => commit({ ...view, dataLabels }),
    setShowTable: (showTable) => commit({ ...view, showTable }),
    toggleHidden: (...seriesIds) => {
      const hiding = seriesIds.some((id) => !view.hidden.includes(id))
      const hidden = hiding
        ? [...new Set([...view.hidden, ...seriesIds])]
        : view.hidden.filter((id) => !seriesIds.includes(id))
      commit({ ...view, hidden })
    },
    isolate: (seriesIds, everyDrawnId) => {
      const already =
        view.hidden.length === everyDrawnId.length - seriesIds.length &&
        everyDrawnId.every((id) => seriesIds.includes(id) || view.hidden.includes(id))
      commit({ ...view, hidden: already ? [] : everyDrawnId.filter((id) => !seriesIds.includes(id)) })
    },
    showAll: () => commit({ ...view, hidden: [] }),
  }
}
