/**
 * WP-3.1/3.2 — the funnel cascade's drop-off button and the retention
 * matrix's heat tokens and curve view.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { createTranslator } from '@/lib'
import { EN } from '@/i18n/dictionaries'
import type { Measure, ReportQuery, ReportResult, ReportSeries } from '@/data/types'
import { ReportModeCanvas } from './ReportModeCanvas'

const t = createTranslator({ dictionary: EN })
const copy = (key: string) => EN[key] as string

const baseFunnelQuery: ReportQuery = {
  measures: [],
  groupBy: [],
  filters: [],
  window: { kind: 'preset', preset: 'last-90d' },
  grain: 'none',
  periodComparison: 'none',
  chartType: 'bar',
  mode: 'funnel',
  funnel: {
    steps: [
      { measureKey: 'riders.joined', filters: [] },
      { measureKey: 'trips.completed', filters: [] },
    ],
    conversionWindow: null,
    mode: 'ordered',
    holdConstant: null,
    exclude: [],
    measuredAs: 'conversion',
    groupBy: 'trip.pickup',
  },
}

function funnelSeries(): ReportSeries[] {
  return [
    {
      id: 'riders.joined#1#current',
      measureKey: 'riders.joined',
      groupValue: '1',
      role: 'current',
      panelId: 'p:funnel',
      unit: 'count',
      currency: null,
      temporality: 'flow',
      points: [100],
      partialBucketIndexes: [],
      blocked: null,
      failed: null,
    },
    {
      id: 'trips.completed#2#current',
      measureKey: 'trips.completed',
      groupValue: '2',
      role: 'current',
      panelId: 'p:funnel',
      unit: 'count',
      currency: null,
      temporality: 'flow',
      points: [40],
      partialBucketIndexes: [],
      blocked: null,
      failed: null,
    },
  ]
}

function funnelResult(query: ReportQuery): ReportResult {
  return {
    query,
    asOf: '2026-06-25T09:14:00+03:00',
    buckets: ['2026-06-01'],
    panels: [{ panelId: 'p:funnel', titleKey: 'rb.panel.funnel', titleParams: { measure: 'rb.measure.riders.joined' }, unit: 'count', currency: null, seriesIds: ['riders.joined#1#current', 'trips.completed#2#current'] }],
    series: funnelSeries(),
    truncated: false,
    truncatedAtRows: null,
    warnings: [],
    foldedGroupCount: null,
  }
}

const measuresByKey: Record<string, Measure> = {}

function renderCanvas(result: ReportResult) {
  return render(
    <ReportModeCanvas
      status="content"
      result={result}
      stale={false}
      violations={[]}
      measuresByKey={measuresByKey}
      onRetry={() => {}}
      withMeta={false}
      noDataSentence="no data"
      t={t}
      language="en"
    />,
  )
}

describe('AC-1170 — a funnel step opens the drop-off region only when a split is set', () => {
  it('is a real button, aria-expanded, and opens a region on click when groupBy is set', async () => {
    const user = userEvent.setup()
    renderCanvas(funnelResult(baseFunnelQuery))
    const step = screen.getByRole('button', { name: /Step 1/ })
    expect(step).toHaveAttribute('aria-expanded', 'false')
    await user.click(step)
    expect(step).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('region', { name: copy('rb.funnel.dropoff.region') })).toBeInTheDocument()
  })

  it('is not a button at all when no split is set — nothing to open', () => {
    const noSplit: ReportQuery = { ...baseFunnelQuery, funnel: { ...baseFunnelQuery.funnel!, groupBy: null } }
    renderCanvas(funnelResult(noSplit))
    expect(screen.queryByRole('button', { name: /Step 1/ })).not.toBeInTheDocument()
    expect(screen.getByText(/Step 1/)).toBeInTheDocument()
  })
})

const cohortQuery: ReportQuery = {
  measures: [],
  groupBy: [],
  filters: [],
  window: { kind: 'preset', preset: 'last-365d' },
  grain: 'none',
  periodComparison: 'none',
  chartType: 'table',
  mode: 'cohort',
  cohort: {
    anchorMeasureKey: 'riders.joined',
    returnMeasureKeys: [],
    cohortGrain: 'month',
    method: 'rolling',
    brackets: null,
    horizon: 3,
  },
}

function cohortSeriesAt(interval: string, points: (number | null)[]): ReportSeries {
  return {
    id: `riders.joined#${interval}#current`,
    measureKey: 'riders.joined',
    groupValue: interval,
    role: 'current',
    panelId: 'p:cohort',
    unit: 'percent',
    currency: null,
    temporality: 'flow',
    points,
    partialBucketIndexes: [],
    blocked: null,
    failed: null,
  }
}

function cohortResult(cohortCount: number): ReportResult {
  const buckets = Array.from({ length: cohortCount }, (_, i) => `2026-${String((i % 12) + 1).padStart(2, '0')}-01`)
  const m0 = cohortSeriesAt('M0', buckets.map(() => 100))
  const m1 = cohortSeriesAt('M1', buckets.map((_b, i) => (i % 4) * 20 + 10))
  return {
    query: cohortQuery,
    asOf: '2026-06-25T09:14:00+03:00',
    buckets,
    panels: [{ panelId: 'p:cohort', titleKey: 'rb.panel.cohort', titleParams: { measure: 'rb.measure.riders.joined' }, unit: 'percent', currency: null, seriesIds: [m0.id, m1.id] }],
    series: [m0, m1],
    truncated: false,
    truncatedAtRows: null,
    warnings: [],
    foldedGroupCount: null,
    cohortSizes: buckets.map(() => 50),
  }
}

describe('AC-1173 — the retention matrix uses the four heat tokens only', () => {
  it('every non-empty cell carries a bg-heat-1…4 class and no inline opacity', () => {
    const { container } = renderCanvas(cohortResult(3))
    const cells = container.querySelectorAll('td span[class*="bg-heat-"]')
    expect(cells.length).toBeGreaterThan(0)
    for (const cell of cells) {
      expect(cell.getAttribute('style') ?? '').not.toMatch(/opacity/)
      expect(cell.className).toMatch(/bg-heat-\d/)
    }
  })

  it('the curve view folds at 8 cohorts and states the fold', async () => {
    const user = userEvent.setup()
    renderCanvas(cohortResult(10))
    await user.click(screen.getByRole('button', { name: copy('rb.cohort.view.curve') }))
    expect(
      screen.getByText(copy('rb.cohort.curve.folded').replace('{count}', '2')),
    ).toBeInTheDocument()
  })

  it('the curve view names no fold under 8 cohorts', async () => {
    const user = userEvent.setup()
    renderCanvas(cohortResult(4))
    await user.click(screen.getByRole('button', { name: copy('rb.cohort.view.curve') }))
    expect(screen.queryByText(/oldest cohorts/)).not.toBeInTheDocument()
  })

  it('the survival sentence names the grain instead of a hard-coded "month"', () => {
    const weekQuery: ReportQuery = { ...cohortQuery, cohort: { ...cohortQuery.cohort!, cohortGrain: 'week' } }
    const result = { ...cohortResult(3), query: weekQuery }
    renderCanvas(result)
    expect(screen.getByText(new RegExp(copy('rb.grainNoun.week')))).toBeInTheDocument()
  })
})
