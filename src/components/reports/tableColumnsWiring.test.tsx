/**
 * WP-3.5, F-V2-47 — `ResultCanvas` draws `ResultTableColumns` for a
 * `mode: 'table'` query, slicing columns from the SAME `ReportResult`
 * (`deriveColumnResults`) rather than a second query. `TableColumnsControl`
 * builds that `table` spec.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { createTranslator } from '@/lib'
import { EN } from '@/i18n/dictionaries'
import type { Measure, ReportPanel, ReportQuery, ReportResult, ReportSeries } from '@/data/types'
import { deriveColumnResults } from './ResultTable'
import { ResultCanvas } from './ResultCanvas'
import { TableColumnsControl } from './TableColumnsControl'

const t = createTranslator({ dictionary: EN })
const copy = (key: string) => EN[key] as string
const BUCKETS = ['2026-06-19', '2026-06-20', '2026-06-21']

const COMPLETED: Measure = {
  key: 'trips.completed',
  labelKey: 'rb.panel.other',
  category: 'demand',
  population: {
    resource: 'trips',
    predicate: [],
    predicateKey: 'rb.panel.other',
    timeField: 'completedAt',
    valueField: null,
    coverage: { from: '2026-01-01', to: '2026-06-25' },
  },
  temporality: 'flow',
  bucketAggregate: 'count',
  additive: true,
  unit: 'count',
  currency: null,
  higherIsBetter: true,
  minGrain: 'day',
  dimensions: [],
  filterableFields: [],
  permission: null,
  captionKey: null,
  displayedAsMetricKeys: [],
}

function seriesOf(measureKey: string, points: (number | null)[], over: Partial<ReportSeries> = {}): ReportSeries {
  return {
    id: `${measureKey}#_#current`,
    measureKey,
    groupValue: null,
    role: 'current',
    panelId: 'p1',
    unit: 'count',
    currency: null,
    temporality: 'flow',
    points,
    partialBucketIndexes: [],
    blocked: null,
    failed: null,
    ...over,
  }
}

const QUERY: ReportQuery = {
  measures: [{ key: COMPLETED.key }],
  groupBy: [],
  filters: [],
  window: { kind: 'absolute', from: BUCKETS[0] as string, to: BUCKETS[2] as string },
  grain: 'day',
  periodComparison: 'none',
  chartType: 'table',
  mode: 'table',
  table: { columns: [{ kind: 'measure', ref: { key: COMPLETED.key } }], rows: ['time'], totals: false, format: [] },
}

function resultOf(query: ReportQuery, series: ReportSeries[]): ReportResult {
  const panel: ReportPanel = {
    panelId: 'p1',
    titleKey: 'rb.panel.measure',
    titleParams: { measure: COMPLETED.labelKey },
    unit: 'count',
    currency: null,
    seriesIds: series.map((s) => s.id),
  }
  return {
    query,
    asOf: '2026-06-25T09:14:00+03:00',
    buckets: BUCKETS,
    panels: [panel],
    series,
    truncated: false,
    truncatedAtRows: null,
    warnings: [],
    foldedGroupCount: null,
  }
}

describe('deriveColumnResults', () => {
  it('slices one ReportResult per column from the series a single run already produced', () => {
    const result = resultOf(QUERY, [seriesOf(COMPLETED.key, [10, 20, 30])])
    const sliced = deriveColumnResults(result, QUERY.table!.columns)
    expect(sliced).not.toBeNull()
    expect(sliced).toHaveLength(1)
    expect(sliced![0]!.series[0]!.points).toEqual([10, 20, 30])
    /* The same run, not a second one: `asOf` travels unchanged. */
    expect(sliced![0]!.asOf).toBe(result.asOf)
  })

  it('returns null for a column naming a measure this run never resolved, rather than guessing', () => {
    const result = resultOf(QUERY, [seriesOf(COMPLETED.key, [10, 20, 30])])
    const sliced = deriveColumnResults(result, [{ kind: 'measure', ref: { key: 'requests.timeToAssign' } }])
    expect(sliced).toBeNull()
  })
})

describe('ResultCanvas — table mode renders ResultTableColumns from the same run', () => {
  it('draws the columns table when the query carries a resolvable `table` spec', () => {
    const result = resultOf(QUERY, [seriesOf(COMPLETED.key, [10, 20, 30])])
    render(
      <ResultCanvas
        status="content"
        result={result}
        stale={false}
        violations={[]}
        measuresByKey={{ [COMPLETED.key]: COMPLETED }}
        coercedFrom={null}
        effectiveChartType="table"
        onRetry={() => {}}
        onRetrySeries={() => {}}
        noDataSentence={copy('overview.noData')}
        t={t}
        language="en"
      />,
    )
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
    expect(screen.getByText('30')).toBeInTheDocument()
  })

  it('falls through to the ordinary table when the spec names an unresolved column', () => {
    const badQuery: ReportQuery = {
      ...QUERY,
      table: { columns: [{ kind: 'measure', ref: { key: 'requests.timeToAssign' } }], rows: ['time'], totals: false, format: [] },
    }
    const result = resultOf(badQuery, [seriesOf(COMPLETED.key, [10, 20, 30])])
    render(
      <ResultCanvas
        status="content"
        result={result}
        stale={false}
        violations={[]}
        measuresByKey={{ [COMPLETED.key]: COMPLETED }}
        coercedFrom={null}
        effectiveChartType="table"
        onRetry={() => {}}
        onRetrySeries={() => {}}
        noDataSentence={copy('overview.noData')}
        t={t}
        language="en"
      />,
    )
    /* Still a real table with the run's own numbers — never a blank canvas
       and never a column of guesses. */
    expect(screen.getByText('10')).toBeInTheDocument()
  })
})

describe('TableColumnsControl — the rail editor', () => {
  it('offers only the measures and formula already asked for, and toggling one writes `query.table`', async () => {
    const user = userEvent.setup()
    let query: ReportQuery = { ...QUERY, table: undefined }
    render(
      <TableColumnsControl
        query={query}
        onChange={(next) => {
          query = next
        }}
        firstMeasure={COMPLETED}
        secondMeasure={null}
        dimensions={[]}
        unstarted={false}
        t={t}
      />,
    )
    const checkbox = screen.getByRole('checkbox', { name: t(COMPLETED.labelKey) })
    await user.click(checkbox)
    expect(query.table?.columns).toEqual([{ kind: 'measure', ref: { key: COMPLETED.key } }])
  })

  it('unstarted: states the reason rather than drawing an empty column list', () => {
    render(
      <TableColumnsControl
        query={{ ...QUERY, measures: [], table: undefined }}
        onChange={() => {}}
        firstMeasure={null}
        secondMeasure={null}
        dimensions={[]}
        unstarted
        t={t}
      />,
    )
    expect(screen.getByText(copy('rb.control.disabled.unstarted'))).toBeInTheDocument()
  })
})
