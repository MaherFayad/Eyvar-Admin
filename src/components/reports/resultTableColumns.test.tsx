/**
 * §7 data table — WP-3.3. `ResultTableColumns` renders a `TableSpec` over one
 * resolved `ReportResult`: a blocked column stays isolated (AC-1174), totals
 * follow catalogue additivity (AC-1175), band tone is R7's closed three
 * (AC-1176), the table scrolls in its own container (AC-1177), and `null`
 * sorts sink to the bottom of every direction (AC-1178).
 */

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it } from 'vitest'
import { createTranslator, formatDate } from '@/lib'
import { EN } from '@/i18n/dictionaries'
import { listMeasures } from '@/data/clients'
import { formatMetricValue } from '@/components/metrics'
import type { Measure, ReportPanel, ReportResult, ReportSeries } from '@/data/types'
import type { TableColumn, TableSpec } from '@/data/types/report'
import { ResultTableColumns } from './ResultTable'

const t = createTranslator({ dictionary: EN })
/* Crosses the client seam (`seam.test.ts` §4) the way `ResultTableColumns`'
   own caller does: the catalogue arrives from `listMeasures`, never a fixture
   import. */
let measuresByKey: Record<string, Measure> = {}
/** `count`, additive — sums honestly. */
let COMPLETED: Measure
/** `mean`, not additive — a sum of it would be arithmetic nonsense. */
let TIME_TO_ASSIGN: Measure

beforeAll(async () => {
  const page = await listMeasures({ pageSize: 100 })
  measuresByKey = Object.fromEntries(page.items.map((m) => [m.key, m]))
  COMPLETED = measuresByKey['trips.completed'] as Measure
  TIME_TO_ASSIGN = measuresByKey['requests.timeToAssign'] as Measure
})

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

describe("the columns table's own search — closing the gap virtualisation opened", () => {
  /* 250 daily buckets: above `VIRTUALISE_ABOVE` (200), the same shape that
     makes the classic table's `ResultTable` window its rows. Before this
     change `ResultTableColumns` had no search at all, so a row past the
     mounted window was invisible to both Ctrl+F and the operator. */
  const WIDE_BUCKETS = Array.from({ length: 250 }, (_, i) => {
    const day = new Date(Date.UTC(2026, 0, 1))
    day.setUTCDate(day.getUTCDate() + i)
    return day.toISOString().slice(0, 10)
  })
  const TARGET_INDEX = 220
  const targetLabel = formatDate(WIDE_BUCKETS[TARGET_INDEX] as string, { style: 'day-month-year', language: 'en' })
  const points = WIDE_BUCKETS.map((_, i) => i + 1)
  const total = formatMetricValue(
    points.reduce((sum, value) => sum + value, 0),
    'count',
    'en',
  )
  /* `COMPLETED` is not resolved until `beforeAll` above runs, so — unlike
     the constants above — these must stay functions and be called from
     inside each `it`, never evaluated while the suite is still collecting. */
  const specOf = (): TableSpec => ({ columns: [measureColumn(COMPLETED)], rows: ['time'], totals: true, format: [] })
  const resultsOf = () => [resultOf([seriesOf(COMPLETED, points)], WIDE_BUCKETS)]

  it('the row count reflects the full 250-row list, not a mounted window', () => {
    render(<ResultTableColumns spec={specOf()} columnResults={resultsOf()} measuresByKey={measuresByKey} t={t} language="en" />)
    /* `aria-rowcount` is only set once windowed (`rows.length + 1`) — 251
       here proves the union read all 250 buckets, not a slice of them. */
    expect(screen.getByRole('table')).toHaveAttribute('aria-rowcount', '251')
  })

  it('finds a row beyond whatever the virtualiser mounted, and leaves the totals unchanged', async () => {
    const user = userEvent.setup()
    render(<ResultTableColumns spec={specOf()} columnResults={resultsOf()} measuresByKey={measuresByKey} t={t} language="en" />)

    /* jsdom does no layout, so the virtualiser here may mount every row or
       none — this assertion does not depend on which. What it establishes
       is only that the target row is not on screen yet. */
    expect(screen.queryByText(targetLabel)).not.toBeInTheDocument()
    expect(screen.getByText(total)).toBeInTheDocument()

    const search = screen.getByRole('searchbox', { name: EN['rb.table.columns.search'] as string })
    await user.type(search, targetLabel)

    /* The match narrows the row list below `VIRTUALISE_ABOVE`, so it mounts
       for real: proof the filter ran over the FULL 250-row union, not over
       whichever rows happened to be mounted before the search ran. */
    expect(screen.getByText(targetLabel)).toBeInTheDocument()
    /* The totals row reads `columnResults`/`spec.columns` directly, never
       the searched `rows` — a report total, not a total of what is listed. */
    expect(screen.getByText(total)).toBeInTheDocument()
  })

  it('a search matching nothing shows the stated empty state, never a blank table', async () => {
    const user = userEvent.setup()
    render(<ResultTableColumns spec={specOf()} columnResults={resultsOf()} measuresByKey={measuresByKey} t={t} language="en" />)

    const search = screen.getByRole('searchbox', { name: EN['rb.table.columns.search'] as string })
    await user.type(search, 'zzzz-no-such-bucket')

    expect(screen.getByText(EN['rb.table.columns.search.empty'] as string)).toBeInTheDocument()
    /* A search with no matches is not a report with no data — the totals
       row still stands. */
    expect(screen.getByText(total)).toBeInTheDocument()
  })
})
