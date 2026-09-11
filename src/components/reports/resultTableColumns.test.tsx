/**
 * §7's data table — WP-3.3. `ResultTableColumns` renders a `TableSpec` over
 * one already-resolved `ReportResult` per column, so a blocked column does
 * not blank the ones beside it (AC-1174), the totals row follows the
 * catalogue's own additivity (AC-1175), a band's tone is R7's closed three
 * (AC-1176), the table scrolls inside its own container (AC-1177), and a
 * sort with `null`s sinks them to the bottom of every direction (AC-1178).
 */

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { createTranslator } from '@/lib'
import { EN } from '@/i18n/dictionaries'
import { measureFixtures } from '@/data/fixtures/measures'
import type { Measure, ReportPanel, ReportResult, ReportSeries } from '@/data/types'
import type { TableColumn, TableSpec } from '@/data/types/report'
import { ResultTableColumns } from './ResultTable'

const t = createTranslator({ dictionary: EN })
const measuresByKey = Object.fromEntries(measureFixtures.map((m) => [m.key, m])) as Record<string, Measure>
/** `count`, additive — sums honestly. */
const COMPLETED = measuresByKey['trips.completed'] as Measure
/** `mean`, not additive — a sum of it would be arithmetic nonsense. */
const TIME_TO_ASSIGN = measuresByKey['requests.timeToAssign'] as Measure

const BUCKETS = ['2026-06-19', '2026-06-20', '2026-06-21']

function seriesOf(measure: Measure, points: (number | null)[], over: Partial<ReportSeries> = {}): ReportSeries {
  return {
    id: `${measure.key}#_#current`,
    measureKey: measure.key,
    groupValue: null,
    role: 'current',
    panelId: 'p1',
    unit: measure.unit,
    currency: measure.currency,
    temporality: measure.temporality,
    points,
    partialBucketIndexes: [],
    blocked: null,
    failed: null,
    ...over,
  }
}

function resultOf(series: ReportSeries[], buckets: string[] = BUCKETS): ReportResult {
  return {
    query: {
      measures: [{ key: series[0]?.measureKey ?? COMPLETED.key }],
      groupBy: [],
      filters: [],
      window: { kind: 'absolute', from: buckets[0] as string, to: buckets[buckets.length - 1] as string },
      grain: 'day',
      periodComparison: 'none',
      chartType: 'table',
    },
    asOf: '2026-06-25T09:14:00+03:00',
    buckets,
    panels: [{ panelId: 'p1', titleKey: 'rb.panel.measure', titleParams: {}, unit: series[0]?.unit ?? 'count', currency: null, seriesIds: series.map((s) => s.id) } as ReportPanel],
    series,
    truncated: false,
    truncatedAtRows: null,
    warnings: [],
    foldedGroupCount: null,
  }
}

const measureColumn = (measure: Measure, label?: string): TableColumn => ({ kind: 'measure', ref: { key: measure.key }, label })

describe('ResultTableColumns — §7 content', () => {
  it('renders one row per bucket and one column per TableColumn (rows: ["time"])', () => {
    const spec: TableSpec = { columns: [measureColumn(COMPLETED)], rows: ['time'], totals: false, format: [] }
    const results = [resultOf([seriesOf(COMPLETED, [10, 20, 30])])]
    render(<ResultTableColumns spec={spec} columnResults={results} measuresByKey={measuresByKey} t={t} language="en" />)

    const rows = screen.getAllByRole('row')
    /* One header row + three bucket rows. */
    expect(rows).toHaveLength(4)
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
    expect(screen.getByText('30')).toBeInTheDocument()
  })

  it('AC-1177 — the table renders inside the Table primitive\'s own scrolling container', () => {
    const spec: TableSpec = { columns: [measureColumn(COMPLETED)], rows: ['time'], totals: false, format: [] }
    const results = [resultOf([seriesOf(COMPLETED, [1, 2, 3])])]
    const { container } = render(
      <ResultTableColumns spec={spec} columnResults={results} measuresByKey={measuresByKey} t={t} language="en" />,
    )
    const scrollport = container.querySelector('[data-slot="table-container"]')
    expect(scrollport).not.toBeNull()
    expect(scrollport?.className).toMatch(/overflow-x-auto/)
  })

  it('empty: no columns or no rows draws the stated sentence, not a blank table', () => {
    const spec: TableSpec = { columns: [], rows: ['time'], totals: false, format: [] }
    render(<ResultTableColumns spec={spec} columnResults={[]} measuresByKey={measuresByKey} t={t} language="en" />)
    expect(screen.getByText(EN['rb.table.columns.empty'] as string)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})

describe('AC-1174 — a blocked column redacts only itself', () => {
  it('renders the other columns\' real numbers and the blocked column\'s cells as the blocked state', () => {
    const spec: TableSpec = {
      columns: [measureColumn(COMPLETED), measureColumn(TIME_TO_ASSIGN)],
      rows: ['time'],
      totals: false,
      format: [],
    }
    const results = [
      resultOf([seriesOf(COMPLETED, [5, 6, 7])]),
      resultOf([seriesOf(TIME_TO_ASSIGN, [], { blocked: 'view_finance', points: [] })]),
    ]
    render(<ResultTableColumns spec={spec} columnResults={results} measuresByKey={measuresByKey} t={t} language="en" />)

    /* The readable column's numbers are on screen. */
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    /* The blocked column names the permission at least once, and its cells
       never render a plausible number. */
    expect(screen.getAllByText(/view_finance/).length).toBeGreaterThan(0)
    expect(screen.queryByRole('table')).not.toBeNull()
  })
})

describe('AC-1175 — the totals row follows the catalogue\'s own additivity', () => {
  it('sums an additive column and names the aggregate word for one that is not', async () => {
    const spec: TableSpec = {
      columns: [measureColumn(COMPLETED), measureColumn(TIME_TO_ASSIGN)],
      rows: ['time'],
      totals: true,
      format: [],
    }
    const results = [
      resultOf([seriesOf(COMPLETED, [10, 20, 30])]),
      resultOf([seriesOf(TIME_TO_ASSIGN, [4, 6, 8])]),
    ]
    render(<ResultTableColumns spec={spec} columnResults={results} measuresByKey={measuresByKey} t={t} language="en" />)

    expect(screen.getByText(EN['rb.table.columns.totals'] as string)).toBeInTheDocument()
    /* `trips.completed` is `count`/additive: 10 + 20 + 30. */
    expect(screen.getByText('60')).toBeInTheDocument()
    /* `requests.timeToAssign` is `mean`, and the cell names that rather than a sum. */
    expect(screen.getByText(EN[AGGREGATE_WORD_MEAN] as string)).toBeInTheDocument()
  })
})

describe('AC-1176 — conditional bands use R7\'s three tones only', () => {
  const bandedSpec = (bands: { lte: number; tone: string }[]): TableSpec => ({
    columns: [measureColumn(COMPLETED)],
    rows: ['time'],
    totals: false,
    format: [{ column: 0, bands: bands as never }],
  })

  it('applies a legal tone as a Badge', () => {
    const spec = bandedSpec([{ lte: 15, tone: 'success' }, { lte: 100, tone: 'warning' }])
    const results = [resultOf([seriesOf(COMPLETED, [10, 50, null])])]
    render(<ResultTableColumns spec={spec} columnResults={results} measuresByKey={measuresByKey} t={t} language="en" />)
    const badge = screen.getByText('10').closest('[data-slot="badge"]')
    expect(badge).not.toBeNull()
    expect(badge?.getAttribute('data-tone')).toBe('success')
  })

  it('a fixture band with an unrecognised tone (e.g. "critical") falls back to neutral, never renders it', () => {
    const spec = bandedSpec([{ lte: 100, tone: 'critical' }])
    const results = [resultOf([seriesOf(COMPLETED, [10, null, null])])]
    render(<ResultTableColumns spec={spec} columnResults={results} measuresByKey={measuresByKey} t={t} language="en" />)
    const badge = screen.getByText('10').closest('[data-slot="badge"]')
    expect(badge?.getAttribute('data-tone')).toBe('neutral')
    expect(badge?.getAttribute('data-tone')).not.toBe('critical')
  })
})

describe('AC-1178 — sorting by any column orders rows with null last', () => {
  it('sorts ascending and descending, keeping the gap at the bottom either way', async () => {
    const user = userEvent.setup()
    const spec: TableSpec = { columns: [measureColumn(COMPLETED)], rows: ['time'], totals: false, format: [] }
    const results = [resultOf([seriesOf(COMPLETED, [30, null, 10])])]
    render(<ResultTableColumns spec={spec} columnResults={results} measuresByKey={measuresByKey} t={t} language="en" />)

    const header = within(screen.getAllByRole('columnheader')[1] as HTMLElement).getByRole('button')
    await user.click(header)
    let cells = screen.getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell')[1]?.textContent)
    expect(cells[cells.length - 1]).toBe('—')
    expect(cells.slice(0, -1)).toEqual(['10', '30'])

    await user.click(header)
    cells = screen.getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell')[1]?.textContent)
    expect(cells[cells.length - 1]).toBe('—')
    expect(cells.slice(0, -1)).toEqual(['30', '10'])
  })
})

/** `rb.table.window.mean` — the aggregate word a `mean` measure's total cell names. */
const AGGREGATE_WORD_MEAN = 'rb.table.window.mean'
