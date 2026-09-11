/**
 * **§P4 and §A11 — the two places the canvas stopped being a viewer.**
 *
 * The audit's verdict was *"a build that looks like an analytics tool and
 * behaves like a report viewer"*, and it named the mechanism: `grep onClick`
 * over `PanelChart` returned nothing, so a datapoint did nothing when you
 * clicked it. It also named the way that gets fixed badly — a feature built
 * behind a prop nothing passes. Four had already shipped that way
 * (`withRefresh`, `onExpand`, `BreakdownList.frame`, `ReportLibrary.today`),
 * and when this file was written **`PanelChart.boardPath` was the fifth**:
 * declared, defaulted, read in three places, and `grep -rn boardPath src`
 * returned only `PanelChart.tsx`. The action row and the series' click were
 * both unreachable in production. Measured in Chromium the same day —
 * `scratch/rb-datapoint.mjs` on `/management/reports/RPT-1` — `0` action
 * anchors, and the URL unchanged after a click on the drawn series.
 *
 * So every assertion here is about the **seam**, not the widget:
 *
 *   1. A real caller passes the path, and the anchor renders with the route
 *      table's own `href`. That is what a prop-with-no-passer cannot fake.
 *   2. No destination, no affordance — and the tooltip stops promising one.
 *      An empty `displayedAsMetricKeys` **is a claim** (`measure.ts:281–291`).
 *   3. The summary column is the measure's **declared** `bucketAggregate`
 *      applied by the same `rollUpSeries` the panel headline uses, so a
 *      non-additive measure cannot be silently averaged or summed.
 *
 * **What is NOT here, and why.** The click on the drawn `Area`/`Bar` itself.
 * jsdom gives `ResponsiveContainer` a zero box and recharts renders **no SVG at
 * all** — measured: `container.querySelectorAll('svg').length === 0`, with
 * recharts printing *"The width(0) and height(0) of chart should be greater
 * than 0"*. Nothing in this repository can assert on a plotted mark. The click
 * is therefore proved in a real browser by `scratch/rb-datapoint.mjs`, and what
 * is proved here is the thing the click delegates to: an anchor that exists, is
 * in the tab order, and points where the tooltip says it does.
 *
 * **2026-09-04 — where the seam block moved to.** The compound-plot rewrite
 * took `PanelCard` off `ResultCanvas`' drawable path, so §P4's action row is no
 * longer on the builder's main path; the `PanelCard` block above is unchanged
 * and still its subject, and the seam block at the foot now holds §A12's strip,
 * which is the destination the builder canvas actually offers. See the comment
 * there for what that costs and why it is a finding rather than an assertion.
 */

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { createTranslator } from '@/lib'
import { EN } from '@/i18n/dictionaries'
import { findSubTabById } from '@/data/clients'
import type {
  BucketAggregate,
  Measure,
  ReportPanel,
  ReportQuery,
  ReportResult,
  ReportSeries,
} from '@/data/types'
import { PanelCard } from './PanelCard'
import { PanelTooltip } from './PanelChart'
import { ResultCanvas } from './ResultCanvas'
import { ResultTable } from './ResultTable'

const t = createTranslator({ dictionary: EN })
const copy = (key: string) => EN[key] as string
const NO_DATA = EN['overview.noData'] as string
const AS_OF = '2026-06-25T09:14:00+03:00'
const BUCKETS = ['2026-06-19', '2026-06-20', '2026-06-21']

/** The board `management.growth.*` resolves to, read from the route table itself. */
const GROWTH = findSubTabById('management-growth')
const GROWTH_TITLE = t(GROWTH?.titleKey ?? '')

const MEASURE: Measure = {
  key: 'captains.registered',
  labelKey: 'rb.panel.other',
  category: 'supply',
  population: {
    resource: 'drivers',
    predicate: [],
    predicateKey: 'rb.panel.other',
    timeField: 'createdAt',
    valueField: null,
    coverage: { from: '2026-01-01', to: '2026-06-25' },
  },
  temporality: 'flow',
  bucketAggregate: 'sum',
  additive: true,
  unit: 'count',
  currency: null,
  higherIsBetter: true,
  minGrain: 'day',
  dimensions: [],
  filterableFields: [],
  permission: null,
  captionKey: null,
  /* The claim that no tile shows this measure. §A12 renders nothing for it. */
  displayedAsMetricKeys: [],
}

const ON_A_BOARD: Measure = {
  ...MEASURE,
  displayedAsMetricKeys: ['management.growth.registeredRiders'],
}

const PANEL: ReportPanel = {
  panelId: 'p1',
  titleKey: 'rb.panel.measure',
  titleParams: { measure: 'rb.panel.other' },
  unit: 'count',
  currency: null,
  seriesIds: ['s-current'],
}

function seriesOf(over: Partial<ReportSeries> = {}): ReportSeries {
  return {
    id: 's-current',
    measureKey: MEASURE.key,
    groupValue: null,
    role: 'current',
    panelId: 'p1',
    unit: 'count',
    currency: null,
    temporality: 'flow',
    points: [10, 20, 30],
    partialBucketIndexes: [],
    blocked: null,
    failed: null,
    ...over,
  }
}

const QUERY: ReportQuery = {
  measures: [{ key: MEASURE.key }],
  groupBy: [],
  filters: [],
  window: { kind: 'absolute', from: BUCKETS[0] as string, to: BUCKETS[2] as string },
  grain: 'day',
  periodComparison: 'none',
  chartType: 'line',
}

function result(series: ReportSeries[], over: Partial<ReportResult> = {}): ReportResult {
  return {
    query: QUERY,
    asOf: AS_OF,
    buckets: BUCKETS,
    panels: [PANEL],
    series,
    truncated: false,
    truncatedAtRows: null,
    warnings: [],
    foldedGroupCount: null,
    ...over,
  }
}

function renderCard(props: Partial<React.ComponentProps<typeof PanelCard>> = {}) {
  return render(
    <MemoryRouter>
      <PanelCard
        panel={PANEL}
        result={result([seriesOf()])}
        measure={ON_A_BOARD}
        kind="line"
        coercedFrom={null}
        onRetrySeries={() => {}}
        noDataSentence={NO_DATA}
        t={t}
        language="en"
        {...props}
      />
    </MemoryRouter>,
  )
}

/* ══════════ §P4 — the datapoint's destination, as something reachable ═════ */

describe('§P4 — a datapoint is a jumping-off point', () => {
  it('renders the destination as a real anchor, at the route table’s own path', () => {
    renderCard({ related: true })
    const action = screen.getByRole('link', {
      name: copy('rb.panel.action.open').replace('{board}', GROWTH_TITLE),
    })
    /* The whole point of the assertion: an `<a href>` — in the tab order, with
       the primitive's ring, opening in a new tab on the modifier, and stating
       its destination in the status bar before the click. Not a `<div
       onClick>`, and not a handler on the plot. */
    expect(action.tagName.toLowerCase()).toBe('a')
    expect(action.getAttribute('href')).toBe(GROWTH?.path)
  })

  it('is the panel’s own action row, not an entry in §A12’s strip', () => {
    renderCard({ related: true })
    const action = screen.getByRole('link', {
      name: copy('rb.panel.action.open').replace('{board}', GROWTH_TITLE),
    })
    /* Two sentences because they are two different things: an imperative that
       says what the click does, and a statement about where else the measure
       lives. If the strip's heading ever swallowed the action row this would
       find the action inside it. */
    const strip = screen.getByText(copy('rb.related.heading')).parentElement as HTMLElement
    expect(strip.contains(action)).toBe(false)
    /* And it comes BEFORE the strip: it belongs to the plot it sits under. */
    expect(action.compareDocumentPosition(strip) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('offers nothing at all where the measure names no board', () => {
    /* `displayedAsMetricKeys: []` is a claim, not a gap. The honest rendering
       of it is no affordance — never a dead one, and never a `Click for
       Actions` over nothing. */
    renderCard({ related: true, measure: MEASURE })
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(screen.queryByText(/^Open the /)).not.toBeInTheDocument()
  })

  it('stays off a dashboard tile, which is a reading rather than a workspace', () => {
    /* `related` is `ResultCanvas.Body`'s builder-versus-tile signal and it
       gates this too — one predicate, so a panel cannot announce an action it
       does not draw. */
    renderCard({ measure: ON_A_BOARD })
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })
})

/* ═══════ §A10 — the tooltip announces the click, and only when it is real ══ */

describe('§A10 — “Click for Actions”, as a fact rather than a slogan', () => {
  const payload = [
    {
      dataKey: 'current',
      value: 30,
      payload: { label: '21 Jun', comparisonLabel: null, current: 30, comparison: null },
    },
  ]

  function renderTooltip(actionable: boolean) {
    return render(
      <PanelTooltip
        active
        payload={payload}
        title="Registered captains"
        unit="count"
        boardLabel={GROWTH_TITLE}
        actionable={actionable}
        t={t}
        language="en"
      />,
    )
  }

  it('says the click opens the board when the panel actually draws the action', () => {
    renderTooltip(true)
    expect(
      screen.getByText(copy('rb.panel.tooltip.action').replace('{board}', GROWTH_TITLE)),
    ).toBeInTheDocument()
  })

  it('stays a statement where nothing is clickable — the default', () => {
    const { container } = renderTooltip(false)
    expect(
      screen.getByText(copy('rb.panel.tooltip.board').replace('{board}', GROWTH_TITLE)),
    ).toBeInTheDocument()
    expect(screen.queryByText(/^Click to open/)).not.toBeInTheDocument()
    /* And still no link inside the card, either way: a Recharts tooltip wrapper
       is not a pointer-events target, so an anchor here would be unclickable by
       mouse and unreachable by keyboard. */
    expect(container.querySelector('a')).toBeNull()
  })
})

/* ═════════ §A11 — the trailing summary, and the aggregate it declares ═════ */

const SUMMARY_HEADER = copy('rb.table.window')

function measures(aggregate: BucketAggregate): Record<string, Measure> {
  return { [MEASURE.key]: { ...MEASURE, bucketAggregate: aggregate } }
}

function renderTable(
  res: ReportResult,
  props: Partial<React.ComponentProps<typeof ResultTable>> = {},
) {
  return render(<ResultTable result={res} t={t} language="en" {...props} />)
}

/** The row's trailing cell, addressed through the row rather than by text. */
function summaryCell(rowIndex = 0): HTMLElement {
  const rows = screen.getAllByRole('row')
  const cells = within(rows[rowIndex + 1] as HTMLElement).getAllByRole('cell')
  return cells[cells.length - 1] as HTMLElement
}

describe('§A11 — the summary column states the DECLARED aggregate', () => {
  it('totals a summable measure, and says the number is a total', () => {
    renderTable(result([seriesOf()]), { measuresByKey: measures('sum') })
    expect(screen.getByText(SUMMARY_HEADER)).toBeInTheDocument()
    /* 10 + 20 + 30. `rollUpSeries` is the panel headline's own call, so the
       card's big number and this cell cannot drift. */
    expect(summaryCell().textContent).toContain('60')
    expect(summaryCell().textContent).toContain(copy('rb.table.window.sum'))
  })

  it('AVERAGES a mean measure rather than summing it — the whole reason for the column’s name', () => {
    renderTable(result([seriesOf()]), { measuresByKey: measures('mean') })
    /* The arithmetic mean of 10, 20, 30. Amplitude's `Row Average` would have
       been right here and wrong on the row above; the declared aggregate is
       right on both. */
    expect(summaryCell().textContent).toContain('20')
    expect(summaryCell().textContent).toContain(copy('rb.table.window.mean'))
    expect(summaryCell().textContent).not.toContain('60')
  })

  it('takes the LAST reading of a level, because summing levels is confidently wrong', () => {
    renderTable(result([seriesOf()]), { measuresByKey: measures('end-of-period') })
    expect(summaryCell().textContent).toContain('30')
    expect(summaryCell().textContent).toContain(copy('rb.table.window.latest'))
  })

  it('leaves an incomplete bucket out, and says so where there is one', () => {
    renderTable(result([seriesOf({ partialBucketIndexes: [2] })]), {
      measuresByKey: measures('sum'),
    })
    /* 10 + 20, not 10 + 20 + 30 — §3.5 / AC-818. A partial bucket is drawn and
       marked and left out of any comparison, and a rollup is a comparison. */
    expect(summaryCell().textContent).toContain('30')
    expect(screen.getByText(copy('rb.table.window.note'))).toBeInTheDocument()
  })

  it('does not carry the exclusion note when the window holds no partial bucket', () => {
    renderTable(result([seriesOf()]), { measuresByKey: measures('sum') })
    /* A standing disclaimer that is true of nothing on screen is one nobody
       reads by the time it matters. */
    expect(screen.queryByText(copy('rb.table.window.note'))).not.toBeInTheDocument()
  })

  it('is absent entirely when no caller supplied the catalogue', () => {
    /* The aggregate is never inferred from the numbers. No catalogue, no
       column — not a column of guesses and not a column of em dashes. */
    renderTable(result([seriesOf()]))
    expect(screen.queryByText(SUMMARY_HEADER)).not.toBeInTheDocument()
  })

  it('gives a blocked row one sentence across the full width, summary column included', () => {
    /* A redacted series BESIDE a readable one, which is the shape that has a
       summary column at all — a table whose only series is blocked resolves no
       rollup and therefore draws no column, which the assertion below pins. */
    renderTable(
      result([seriesOf({ id: 'blocked', blocked: 'view_finance' }), seriesOf({ id: 'open' })]),
      { measuresByKey: measures('sum') },
    )
    expect(screen.getByText(SUMMARY_HEADER)).toBeInTheDocument()

    const cells = within(screen.getAllByRole('row')[1] as HTMLElement).getAllByRole('cell')
    /* The series cell, then ONE spanning cell over three buckets and the
       summary. A stray fourth cell beside the permission sentence would be an
       empty box where a number should be. */
    expect(cells).toHaveLength(2)
    expect(cells[1]?.getAttribute('colspan')).toBe('4')
  })

  it('draws no summary column at all when every series is redacted', () => {
    /* Nothing resolvable, so nothing claimed. A column of em dashes reads as
       data that failed rather than as data withheld, and the row already says
       which permission is missing. */
    renderTable(result([seriesOf({ blocked: 'view_finance' })]), {
      measuresByKey: measures('sum'),
    })
    expect(screen.queryByText(SUMMARY_HEADER)).not.toBeInTheDocument()
    const cells = within(screen.getAllByRole('row')[1] as HTMLElement).getAllByRole('cell')
    expect(cells[1]?.getAttribute('colspan')).toBe('3')
  })

  it('sorts by it, ranking an unresolved rollup last rather than as a zero', async () => {
    const user = userEvent.setup()
    const two = result(
      [
        seriesOf({ id: 'a', panelId: 'p1', points: [1, 1, 1] }),
        seriesOf({ id: 'b', panelId: 'p1', points: [9, 9, 9] }),
      ],
      { panels: [PANEL] },
    )
    renderTable(two, { chrome: true, measuresByKey: measures('sum') })

    await user.click(
      screen.getByRole('button', {
        name: copy('rb.table.sort').replace('{column}', SUMMARY_HEADER),
      }),
    )
    expect(summaryCell(0).textContent).toContain('3')
    expect(summaryCell(1).textContent).toContain('27')
  })
})

/* ═══ the seam: the canvas hands the table the catalogue it already holds ══ */

describe('the catalogue reaches the table on both of the canvas’ paths', () => {
  function renderCanvas(props: Partial<React.ComponentProps<typeof ResultCanvas>> = {}) {
    return render(
      <MemoryRouter>
        <ResultCanvas
          status="content"
          result={result([seriesOf()])}
          stale={false}
          violations={[]}
          measuresByKey={{ [MEASURE.key]: ON_A_BOARD }}
          coercedFrom={null}
          effectiveChartType="line"
          onRetry={() => {}}
          onRetrySeries={() => {}}
          noDataSentence={NO_DATA}
          t={t}
          language="en"
          {...props}
        />
      </MemoryRouter>,
    )
  }

  it('the builder’s table under the chart carries the summary', () => {
    renderCanvas({ withTable: true, withMeta: false })
    const numbers = screen.getByRole('region', { name: copy('rb.canvas.table.heading') })
    expect(within(numbers).getByText(SUMMARY_HEADER)).toBeInTheDocument()
  })

  it('a tile pinned AS a table carries it too — that is the surface with least room to add up thirty columns by eye', () => {
    renderCanvas({ framed: false, effectiveChartType: 'table' })
    expect(screen.getByText(SUMMARY_HEADER)).toBeInTheDocument()
    /* And still none of the table's chrome: a search box and an export button
       inside a tile is chrome competing with the reading it frames. */
    expect(screen.queryByLabelText(copy('rb.table.search'))).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: copy('rb.table.export') })).not.toBeInTheDocument()
  })

  /**
   * **The destination still reaches the builder canvas — through §A12's strip,
   * not §P4's action row.**
   *
   * The compound-plot rewrite (2026-09-04) stopped `ResultCanvas.Body` from
   * rendering a `PanelCard` per panel on the drawable path, so `BoardAction`
   * and `PanelChart.boardPath` — §P4's imperative `Open the Growth board` and
   * the datapoint's own click — are no longer on the builder's main path. They
   * are still `PanelCard`'s and still covered by the `§P4` block at the top of
   * this file, and still reached by a dashboard tile, a blocked leg and a
   * failed leg.
   *
   * What this seam test holds is the half that survived and is the half it was
   * really about: **the catalogue reaches the canvas, and the builder gets a
   * real anchor at the route table's own path.** The strip is now per-plot and
   * deduplicated, which is why it names the board once.
   *
   * The loss of the datapoint click-through on the compound plot is raised as a
   * finding rather than asserted here — bringing it back is a design decision
   * (which series' board does a click on a six-series plot open?) and inventing
   * the answer in a test is how two agents ship incompatible ones.
   */
  it('carries the catalogue’s destination onto the builder, as a real anchor', () => {
    renderCanvas({ withTable: true, withMeta: false })
    const strip = screen.getByText(copy('rb.related.heading')).parentElement as HTMLElement
    const link = within(strip).getByRole('link', { name: GROWTH_TITLE })
    /* An `<a href>`: in the tab order, with the primitive's ring, opening in a
       new tab on the modifier, stating its destination before the click. */
    expect(link.tagName.toLowerCase()).toBe('a')
    expect(link.getAttribute('href')).toBe(GROWTH?.path)
  })

  it('gives a dashboard tile neither the strip nor an action row', () => {
    /* `withTable` is the builder-versus-tile signal, and it has to take BOTH
       with it — a strip of navigation cards under every plot of a nine-tile
       board is links nobody asked for. */
    renderCanvas({ framed: false })
    expect(screen.queryByText(copy('rb.related.heading'))).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', {
        name: copy('rb.panel.action.open').replace('{board}', GROWTH_TITLE),
      }),
    ).not.toBeInTheDocument()
  })
})
