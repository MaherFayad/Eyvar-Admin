/**
 * WP-3.1/3.2 — the funnel cascade's drop-off button and the retention
 * matrix's heat tokens and curve view.
 */

import { render, screen, within } from '@testing-library/react'
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

function funnelResult(query: ReportQuery, funnelStepDetail?: ReportResult['funnelStepDetail']): ReportResult {
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
    funnelStepDetail,
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

describe('AC-1170 — median time to next step, beside the drop-off line', () => {
  it('reads the median off `funnelStepDetail`, next to the drop-off it already draws', () => {
    renderCanvas(
      funnelResult(baseFunnelQuery, [
        { seriesId: 'riders.joined#1#current', medianDaysToNext: 2.5, dropoffGroups: null },
        { seriesId: 'trips.completed#2#current', medianDaysToNext: null, dropoffGroups: null },
      ]),
    )
    expect(screen.getByText(copy('rb.funnel.step.median').replace('{days}', '2.5'))).toBeInTheDocument()
  })

  it('is a stated "no reading", never a zero, with nobody to measure', () => {
    renderCanvas(
      funnelResult(baseFunnelQuery, [
        { seriesId: 'riders.joined#1#current', medianDaysToNext: null, dropoffGroups: null },
        { seriesId: 'trips.completed#2#current', medianDaysToNext: null, dropoffGroups: null },
      ]),
    )
    expect(screen.getByText(copy('rb.funnel.step.median.none'))).toBeInTheDocument()
    expect(screen.queryByText(/0 days/)).not.toBeInTheDocument()
  })

  it('shows no median row at all for the last rung — there is no next step to measure', () => {
    renderCanvas(
      funnelResult(baseFunnelQuery, [
        { seriesId: 'riders.joined#1#current', medianDaysToNext: 1, dropoffGroups: null },
        { seriesId: 'trips.completed#2#current', medianDaysToNext: null, dropoffGroups: null },
      ]),
    )
    /* One "no reading" only — for rung 1, since rung 2 has no slot for it. */
    expect(screen.queryAllByText(copy('rb.funnel.step.median.none'))).toHaveLength(0)
  })
})

describe('AC-1170 — the drop-off group table renders the planner-free rows the mock resolved', () => {
  it('renders a real `<table>` of the resolved groups, ranked as the mock returned them', async () => {
    const user = userEvent.setup()
    renderCanvas(
      funnelResult(baseFunnelQuery, [
        { seriesId: 'riders.joined#1#current', medianDaysToNext: 3, dropoffGroups: null },
        {
          seriesId: 'trips.completed#2#current',
          medianDaysToNext: null,
          dropoffGroups: [
            { groupValue: 'Riyadh', count: 40 },
            { groupValue: 'Jeddah', count: 20 },
          ],
        },
      ]),
    )
    await user.click(screen.getByRole('button', { name: /Step 2/ }))
    const region = screen.getByRole('region', { name: copy('rb.funnel.dropoff.region') })
    const table = within(region).getByRole('table')
    expect(within(table).getByText('Riyadh')).toBeInTheDocument()
    expect(within(table).getByText('Jeddah')).toBeInTheDocument()
    expect(within(table).getByText('40')).toBeInTheDocument()
  })

  it('folds the sentinel group into the localised "Other", not the raw key', async () => {
    const user = userEvent.setup()
    renderCanvas(
      funnelResult(baseFunnelQuery, [
        { seriesId: 'riders.joined#1#current', medianDaysToNext: null, dropoffGroups: null },
        {
          seriesId: 'trips.completed#2#current',
          medianDaysToNext: null,
          dropoffGroups: [{ groupValue: '__other__', count: 5 }],
        },
      ]),
    )
    await user.click(screen.getByRole('button', { name: /Step 2/ }))
    expect(screen.getByText(copy('rb.panel.other'))).toBeInTheDocument()
    expect(screen.queryByText('__other__')).not.toBeInTheDocument()
  })

  it('states the empty case in words rather than an empty table — the first step has no previous rung to drop from', async () => {
    const user = userEvent.setup()
    renderCanvas(
      funnelResult(baseFunnelQuery, [
        { seriesId: 'riders.joined#1#current', medianDaysToNext: 2, dropoffGroups: null },
        { seriesId: 'trips.completed#2#current', medianDaysToNext: null, dropoffGroups: null },
      ]),
    )
    await user.click(screen.getByRole('button', { name: /Step 1/ }))
    const region = screen.getByRole('region', { name: copy('rb.funnel.dropoff.region') })
    expect(within(region).getByText(copy('rb.funnel.dropoff.empty'))).toBeInTheDocument()
    expect(within(region).queryByRole('table')).not.toBeInTheDocument()
  })
})

describe('AC-1169 — funnel `measuredAs` routes to the shape §5 requires, never always the cascade', () => {
  function trendResult(): ReportResult {
    const query: ReportQuery = {
      ...baseFunnelQuery,
      grain: 'day',
      funnel: { ...baseFunnelQuery.funnel!, measuredAs: 'conversion-over-time' },
    }
    return {
      query,
      asOf: '2026-06-25T09:14:00+03:00',
      buckets: ['2026-06-01', '2026-06-02', '2026-06-03'],
      panels: [
        {
          panelId: 'p:funnel-trend',
          titleKey: 'rb.panel.funnel',
          titleParams: { measure: 'rb.measure.riders.joined' },
          unit: 'percent',
          currency: null,
          seriesIds: ['trips.completed#_#current'],
        },
      ],
      series: [
        {
          id: 'trips.completed#_#current',
          measureKey: 'trips.completed',
          groupValue: null,
          role: 'current',
          panelId: 'p:funnel-trend',
          unit: 'percent',
          currency: null,
          temporality: 'flow',
          points: [40, null, 55],
          partialBucketIndexes: [],
          blocked: null,
          failed: null,
        },
      ],
      truncated: false,
      truncatedAtRows: null,
      warnings: [],
      foldedGroupCount: null,
    }
  }

  it('conversion-over-time draws through SeriesChart\'s own accessible region, and no cascade `<ol>` renders', async () => {
    const { container } = renderCanvas(trendResult())
    expect(await screen.findByRole('group', { name: copy('rb.panel.funnel') })).toBeInTheDocument()
    expect(container.querySelector('ol')).toBeNull()
    expect(screen.getAllByText(copy('rb.funnel.measuredAs.conversion-over-time')).length).toBeGreaterThan(0)
  })

  function timeToConvertResult(): ReportResult {
    const query: ReportQuery = {
      ...baseFunnelQuery,
      grain: 'none',
      funnel: { ...baseFunnelQuery.funnel!, measuredAs: 'time-to-convert' },
    }
    const percentiles = [25, 50, 75, 90, 95]
    return {
      query,
      asOf: '2026-06-25T09:14:00+03:00',
      buckets: ['2026-06-01'],
      panels: percentiles.map((p) => ({
        panelId: `p:funnel-ttc-p${p}`,
        titleKey: 'rb.funnel.timeToConvert.percentile',
        titleParams: { percentile: p },
        unit: 'minutes',
        currency: null,
        seriesIds: [`riders.joined#p${p}#current`],
      })),
      series: percentiles.map((p) => ({
        id: `riders.joined#p${p}#current`,
        measureKey: 'riders.joined',
        groupValue: `p${p}`,
        role: 'current',
        panelId: `p:funnel-ttc-p${p}`,
        unit: 'minutes',
        currency: null,
        temporality: 'flow',
        points: [p * 60],
        partialBucketIndexes: [],
        blocked: null,
        failed: null,
      })),
      truncated: false,
      truncatedAtRows: null,
      warnings: [],
      foldedGroupCount: null,
    }
  }

  it('time-to-convert draws through DistributionCard, labelled P25…P95 off `groupValue` — never the first rung\'s measure name or a "% of step 1" sentence', async () => {
    const { container } = renderCanvas(timeToConvertResult())
    expect(await screen.findByRole('img', { name: copy('rb.funnel.measuredAs.time-to-convert') })).toBeInTheDocument()
    expect(container.querySelector('ol')).toBeNull()
    for (const label of ['P25', 'P50', 'P75', 'P90', 'P95']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    expect(screen.queryByText(/Riders who joined/)).not.toBeInTheDocument()
    expect(screen.queryByText(/% of step 1/)).not.toBeInTheDocument()
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

describe('AC-1171 — a cell beyond the cohort\'s elapsed time is null, and is DRAWN as null, never 0', () => {
  it('renders "No reading", never "0%", for a null cell — and a real 0% elsewhere is still drawn as 0%', () => {
    /* One cohort that has not had time to reach M1 (null) beside one that
       genuinely returned nobody at M1 (a real, measured 0 %) — the two must
       read differently, or the matrix cannot tell "unknown" from "empty". */
    const notElapsed = cohortSeriesAt('M0', [100, 100])
    const m1 = cohortSeriesAt('M1', [0, null])
    const result: ReportResult = {
      query: cohortQuery,
      asOf: '2026-06-25T09:14:00+03:00',
      buckets: ['2026-01-01', '2026-06-01'],
      panels: [{ panelId: 'p:cohort', titleKey: 'rb.panel.cohort', titleParams: {}, unit: 'percent', currency: null, seriesIds: [notElapsed.id, m1.id] }],
      series: [notElapsed, m1],
      truncated: false,
      truncatedAtRows: null,
      warnings: [],
      foldedGroupCount: null,
      cohortSizes: [10, 10],
    }
    renderCanvas(result)

    /* The real zero is drawn as a real zero. */
    expect(screen.getByText('0%')).toBeInTheDocument()
    /* The unelapsed cell is drawn in words, never as a number at all. */
    expect(screen.getByText(copy('rb.cohort.cell.none'))).toBeInTheDocument()
    /* And it is never rendered as the digit `0` disguised as the word. */
    expect(screen.queryAllByText('0%')).toHaveLength(1)
  })
})

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
