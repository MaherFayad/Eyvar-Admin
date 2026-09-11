/**
 * **The chrome §A9–§A12 asks for, and the four claims it must not make.**
 *
 * Amplitude's chart surface is four things this product did not have: a tooltip
 * that is a card rather than a `title` attribute, a legend centred under the
 * plot, a table that ships with its own header row, and a strip of related
 * charts closing the card. Three of the four are pure presentation and a
 * screenshot would settle them. The fourth is not, and neither are the refusals
 * that came with the other three:
 *
 *   **The related strip must name a destination that exists.** It is driven by
 *   `Measure.displayedAsMetricKeys`, and a "related charts" strip built on
 *   anything else would be a similarity model nobody wrote. So the whole
 *   shipped catalogue is run through the resolver: every key it declares
 *   resolves to a real row in the route table, or this fails and names it.
 *
 *   **An empty array renders nothing.** `measure.ts:281–291` is explicit that
 *   an empty `displayedAsMetricKeys` **is a claim** — no tile shows this
 *   measure over this population — so a fallback strip would contradict the
 *   data rather than fill a gap.
 *
 *   **The tooltip's footer is a destination or it is absent.** Amplitude ends
 *   the card `Click for Actions`; a Recharts tooltip is not a pointer-events
 *   target, so that line would be an instruction the surface cannot keep.
 *
 *   **No anomaly, and no row checkboxes.** Neither exists behind the UI. The
 *   first would be a fabricated claim; the second would let the table hide a
 *   series the question produced, and the picture and the question would
 *   disagree with nothing on screen saying so.
 *
 * The opt-in props are tested as opt-INs: the assertion that a dashboard tile
 * inherits nothing is an assertion about the DEFAULT, and it is the one that
 * regresses when somebody flips a default to make a screenshot look right.
 */

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { createTranslator } from '@/lib'
import { EN } from '@/i18n/dictionaries'
import { disableMockLatency, findSubTabById, listMeasures } from '@/data/clients'
import type {
  Measure,
  PeriodComparison,
  ReportPanel,
  ReportQuery,
  ReportResult,
  ReportSeries,
} from '@/data/types'
import { PanelCard, relatedBoards } from './PanelCard'
import { PanelTooltip } from './PanelChart'
import { ResultTable } from './ResultTable'

const t = createTranslator({ dictionary: EN })
const copy = (key: string) => EN[key] as string

/**
 * **The catalogue comes through the seam, not off the fixture array.**
 * `seam.test.ts:192` asserts that nothing outside `src/data` imports a fixture
 * module and a test is not exempt: one that read the array directly would be
 * testing the seed rather than the contract, and would keep passing after the
 * seam was swapped for an API that returned something else.
 */
let catalogue: readonly Measure[] = []
beforeAll(async () => {
  disableMockLatency()
  catalogue = (await listMeasures({ pageSize: 100 })).items
})
const AS_OF = '2026-06-25T09:14:00+03:00'
const NO_DATA = EN['overview.noData'] as string
const BUCKETS = ['2026-06-19', '2026-06-20', '2026-06-21']

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
  displayedAsMetricKeys: [],
}

/** The same measure, declared as displayed on two real boards. */
const ON_TWO_BOARDS: Measure = {
  ...MEASURE,
  displayedAsMetricKeys: ['management.growth.registeredRiders', 'operations.overview.completedTrips'],
}

const PANEL: ReportPanel = {
  panelId: 'p1',
  titleKey: 'rb.panel.measure',
  titleParams: { measure: 'rb.panel.other' },
  unit: 'count',
  currency: null,
  seriesIds: ['s-current', 's-comparison'],
}

/** `rb.panel.other` is `Other`; it is the title this panel renders. */
const TITLE = 'Other'

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

function query(periodComparison: PeriodComparison): ReportQuery {
  return {
    measures: [{ key: MEASURE.key }],
    groupBy: [],
    filters: [],
    window: { kind: 'absolute', from: BUCKETS[0] as string, to: BUCKETS[2] as string },
    grain: 'day',
    periodComparison,
    chartType: 'line',
  }
}

function result(
  periodComparison: PeriodComparison,
  series: ReportSeries[],
  over: Partial<ReportResult> = {},
): ReportResult {
  return {
    query: query(periodComparison),
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

function upResult(): ReportResult {
  return result('previous-period', [
    seriesOf(),
    seriesOf({ id: 's-comparison', role: 'comparison', points: [5, 10, 15] }),
  ])
}

function renderCard(
  res: ReportResult,
  props: Partial<React.ComponentProps<typeof PanelCard>> = {},
) {
  return render(
    <MemoryRouter>
      <PanelCard
        panel={PANEL}
        result={res}
        measure={MEASURE}
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

/* ═════════════════ §A10 — the tooltip is a card, not an attribute ═════════ */

describe('§A10 — the hover tooltip', () => {
  const payload = [
    { dataKey: 'current', value: 30, payload: { label: '21 Jun', comparisonLabel: '14 Jun', current: 30, comparison: 15 } },
    { dataKey: 'comparison', value: 15, payload: { label: '21 Jun', comparisonLabel: '14 Jun', current: 30, comparison: 15 } },
  ]

  it('names the series, the bucket and both values — the anatomy §A10 draws', () => {
    render(
      <PanelTooltip
        active
        payload={payload}
        title="Registered captains"
        unit="count"
        boardLabel={null}
        t={t}
        language="en"
      />,
    )
    expect(screen.getByText('Registered captains')).toBeInTheDocument()
    expect(screen.getByText('21 Jun')).toBeInTheDocument()
    expect(screen.getByText(copy('rb.table.role.current'))).toBeInTheDocument()
    expect(screen.getByText('30')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
  })

  it('gives the comparison row the day it was actually measured on', () => {
    render(
      <PanelTooltip
        active
        payload={payload}
        title="Registered captains"
        unit="count"
        boardLabel={null}
        t={t}
        language="en"
      />,
    )
    /* The two windows are zipped by INDEX. Without this line the dashed value
       sits under a heading naming a different day, unmarked — a statement that
       is false rather than one that is missing. */
    expect(screen.getByText('on 14 Jun')).toBeInTheDocument()
  })

  it('carries a footer naming a REAL board, and none when there is none', () => {
    const { unmount } = render(
      <PanelTooltip
        active
        payload={payload}
        title="Registered captains"
        unit="count"
        boardLabel="Growth"
        t={t}
        language="en"
      />,
    )
    expect(screen.getByText('Also on the Growth board')).toBeInTheDocument()
    unmount()

    render(
      <PanelTooltip
        active
        payload={payload}
        title="Registered captains"
        unit="count"
        boardLabel={null}
        t={t}
        language="en"
      />,
    )
    /* §A12's rule, applied to the footer: an absent destination is an absent
       line, never a dead one. */
    expect(screen.queryByText(/Also on the/)).not.toBeInTheDocument()
  })

  it('invents no anomaly line — there is no anomaly model to draw one from', () => {
    const { container } = render(
      <PanelTooltip
        active
        payload={payload}
        title="Registered captains"
        unit="count"
        boardLabel="Growth"
        t={t}
        language="en"
      />,
    )
    expect(container.textContent).not.toMatch(/anomal/i)
    expect(container.textContent).not.toMatch(/forecast/i)
    /* And no `Click for Actions`: a Recharts tooltip is not a pointer-events
       target, so it would be an instruction the surface cannot keep. */
    expect(container.querySelector('a')).toBeNull()
  })

  it('renders a gap as an em dash, never as a zero', () => {
    render(
      <PanelTooltip
        active
        payload={[
          { dataKey: 'current', value: null, payload: { label: '21 Jun', comparisonLabel: null, current: null, comparison: null } },
        ]}
        title="Registered captains"
        unit="count"
        boardLabel={null}
        t={t}
        language="en"
      />,
    )
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('§9.2 — MIRRORS, because a tooltip is chrome and the plot around it is not', () => {
    const { container } = render(
      <PanelTooltip
        active
        payload={payload}
        title="Registered captains"
        unit="count"
        boardLabel={null}
        t={t}
        language="ar"
      />,
    )
    /* Recharts renders the tooltip INSIDE the container div, which the plot
       pins `dir="ltr"`. The card restores the document direction on itself and
       on nothing else — the SVG and the axis group stay pinned. */
    const card = container.querySelector('[data-slot="panel-tooltip"]')
    expect(card?.getAttribute('dir')).toBe('rtl')
  })
})

/* ═════════════════════ §A9 — the legend under the plot ═══════════════════ */

describe('§A9 — the legend', () => {
  it('is centred beneath the plot, not pinned to an edge', () => {
    const { container } = renderCard(upResult())
    const footer = container.querySelector('[data-slot="card-footer"]')
    expect(footer?.className).toContain('justify-center')
  })

  it('marks the comparison entry [Previous], in front of its dated chip', () => {
    renderCard(upResult())
    expect(screen.getByText('[Previous]')).toBeInTheDocument()
    /* AC-832 survives the marker: both periods are still named with dates, and
       that is strictly more than Amplitude's `[Previous] All Users` says. */
    expect(screen.getByText('19 Jun – 21 Jun')).toBeInTheDocument()
    expect(screen.getByText('16 Jun – 18 Jun')).toBeInTheDocument()
  })

  it('drops the marker when there is no previous period for it to point at', () => {
    renderCard(result('none', [seriesOf()]))
    expect(screen.queryByText('[Previous]')).not.toBeInTheDocument()
    /* The chip itself stays and says so. A missing chip reads as a chart that
       forgot; this reads as a chart that knows. */
    expect(screen.getByText(copy('rb.legend.noCompare'))).toBeInTheDocument()
  })

  it('opens with a Top {n} pill ONLY where the split was actually capped', () => {
    const grouped: ReportPanel[] = [
      { ...PANEL, panelId: 'p1', titleKey: 'rb.panel.measureByGroup', titleParams: { measure: 'rb.panel.other', group: 'Riyadh' } },
      { ...PANEL, panelId: 'p2', titleKey: 'rb.panel.measureByGroup', titleParams: { measure: 'rb.panel.other', group: 'Jeddah' } },
      { ...PANEL, panelId: 'p3', titleKey: 'rb.panel.measureByGroup', titleParams: { measure: 'rb.panel.other', group: '__other__' } },
    ]

    const { unmount } = renderCard(
      result('none', [seriesOf()], { panels: grouped, foldedGroupCount: 5 }),
    )
    /* Two named groups survived; `Other` is the fold, not one of them. */
    expect(screen.getByText('Top 2')).toBeInTheDocument()
    unmount()

    renderCard(result('none', [seriesOf()], { panels: grouped, foldedGroupCount: null }))
    /* Nothing was folded, so every group is on screen and "Top 2" would be a
       cap nobody applied. */
    expect(screen.queryByText('Top 2')).not.toBeInTheDocument()
  })
})

/* ══════════════ §A12 — the back-reference, and what it refuses ═══════════ */

describe('§A12 — related boards', () => {
  it('resolves every key the shipped catalogue declares to a real route', () => {
    const declared = catalogue.flatMap((m) => m.displayedAsMetricKeys)
    expect(declared.length, 'the catalogue declares no back-references at all').toBeGreaterThan(0)
    const unresolved = declared.filter((metricKey) => {
      const [workspace, board] = metricKey.split('.')
      return findSubTabById(`${workspace}-${board}`) === null
    })
    expect(
      unresolved,
      'displayedAsMetricKeys names a board with no row in the route table',
    ).toEqual([])
  })

  it('renders nothing for an empty array, because an empty array is a claim', () => {
    expect(relatedBoards(MEASURE)).toEqual([])
    renderCard(upResult(), { related: true })
    expect(screen.queryByText(copy('rb.related.heading'))).not.toBeInTheDocument()
  })

  it('deduplicates two tiles on one board down to one card', () => {
    const twice: Measure = {
      ...MEASURE,
      displayedAsMetricKeys: ['management.growth.registeredRiders', 'management.growth.newRiders'],
    }
    expect(relatedBoards(twice).map((b) => b.subTabId)).toEqual(['management-growth'])
  })

  it('drops a key that names no route rather than linking to a dead path', () => {
    const bogus: Measure = { ...MEASURE, displayedAsMetricKeys: ['nowhere.nothing.atAll'] }
    expect(relatedBoards(bogus)).toEqual([])
  })

  it('links to the route table’s own paths, as real anchors', () => {
    renderCard(upResult(), { measure: ON_TWO_BOARDS, related: true })
    const strip = screen.getByText(copy('rb.related.heading')).parentElement as HTMLElement
    const links = within(strip).getAllByRole('link')
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      findSubTabById('management-growth')?.path,
      findSubTabById('operations-overview')?.path,
    ])
  })

  it('is OFF by default, so a dashboard tile inherits no strip', () => {
    renderCard(upResult(), { measure: ON_TWO_BOARDS })
    expect(screen.queryByText(copy('rb.related.heading'))).not.toBeInTheDocument()
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })
})

/* ═══════════════════ §1.5 / §C5 — the panel card's chrome ════════════════ */

describe('§1.5 — the card corner', () => {
  it('states the shape it is drawn in, in words as well as a glyph', () => {
    const { container } = renderCard(upResult())
    expect(screen.getByText('Shown as a Line chart')).toBeInTheDocument()
    /* §7.5 — the glyph is decorative, the sr-only name is the carrier. */
    const glyph = container.querySelector('svg.lucide-line-chart, svg.lucide-chart-line')
    expect(glyph?.getAttribute('aria-hidden')).toBe('true')
  })

  it('offers an overflow whose every item does something that already existed', async () => {
    const user = userEvent.setup()
    const onRetrySeries = vi.fn()
    renderCard(upResult(), { onRetrySeries })

    await user.click(screen.getByRole('button', { name: copy('rb.panel.actions') }))
    await user.click(await screen.findByRole('menuitem', { name: copy('rb.panel.reload') }))
    expect(onRetrySeries).toHaveBeenCalledWith(MEASURE.key)
  })

  /**
   * **The overflow holds exactly one item, and the count is the assertion.**
   *
   * There were two. `Expand this panel` was gated on an `onExpand` prop that
   * `ResultCanvas` — this component's only caller — neither accepted nor
   * forwarded, so the item could not render outside a test that passed the prop
   * by hand. Two tests covered it and both were green; neither could see that
   * nothing reached them. The prop, the item and those tests are gone, and this
   * counts what is left so a second unreachable item cannot be added quietly.
   */
  it('holds exactly one item — nothing in it is gated on a prop no caller passes', async () => {
    const user = userEvent.setup()
    renderCard(upResult())
    await user.click(screen.getByRole('button', { name: copy('rb.panel.actions') }))
    expect(await screen.findByRole('menuitem', { name: copy('rb.panel.reload') })).toBeInTheDocument()
    expect(screen.getAllByRole('menuitem')).toHaveLength(1)
  })
})

/* ═════════════════════ §A11 — the table's header row ═════════════════════ */

describe('§A11 — table chrome', () => {
  /** Ten series, so the search threshold is met and a sort has something to do. */
  function wideResult(): ReportResult {
    const series = Array.from({ length: 10 }, (_, index) =>
      seriesOf({
        id: `s-${index}`,
        panelId: `p-${index}`,
        points: [index, index * 2, index * 3],
      }),
    )
    const panels = series.map((_series, index) => ({
      ...PANEL,
      panelId: `p-${index}`,
      titleKey: 'rb.panel.measureByGroup',
      titleParams: { measure: 'rb.panel.other', group: `Zone ${index}` },
    }))
    return result('none', series, { panels })
  }

  function renderTable(props: Partial<React.ComponentProps<typeof ResultTable>> = {}) {
    return render(<ResultTable result={wideResult()} t={t} language="en" {...props} />)
  }

  it('is OFF by default, so a table tile on a dashboard inherits none of it', () => {
    renderTable()
    expect(screen.queryByLabelText(copy('rb.table.search'))).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: copy('rb.table.export') })).not.toBeInTheDocument()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('puts Export CSV beside the numbers it exports, with a download glyph', async () => {
    const user = userEvent.setup()
    const onExport = vi.fn()
    const { container } = renderTable({ chrome: true, onExport })
    const button = screen.getByRole('button', { name: copy('rb.table.export') })
    expect(container.querySelector('svg.lucide-download')).not.toBeNull()
    await user.click(button)
    expect(onExport).toHaveBeenCalledTimes(1)
  })

  it('offers no export when no caller can write one', () => {
    renderTable({ chrome: true })
    expect(screen.queryByRole('button', { name: copy('rb.table.export') })).not.toBeInTheDocument()
  })

  it('filters the rows by name, and says so when none match', async () => {
    const user = userEvent.setup()
    renderTable({ chrome: true })
    const search = screen.getByLabelText(copy('rb.table.search'))
    await user.type(search, 'Zone 3')
    expect(screen.getAllByRole('row')).toHaveLength(2) // header + one match
    await user.clear(search)
    await user.type(search, 'Riyadh')
    /* The SECOND kind of empty: the rows exist, this search matched none. */
    expect(screen.getByText(copy('rb.table.search.empty'))).toBeInTheDocument()
  })

  it('withholds the search where there are too few rows to warrant one', () => {
    render(<ResultTable result={result('none', [seriesOf()])} chrome t={t} language="en" />)
    expect(screen.queryByLabelText(copy('rb.table.search'))).not.toBeInTheDocument()
  })

  it('sorts a bucket column, and announces which way through aria-sort', async () => {
    const user = userEvent.setup()
    renderTable({ chrome: true })
    const header = screen.getByRole('button', { name: 'Sort by 19 Jun' })
    const cell = header.closest('th') as HTMLElement

    expect(cell.getAttribute('aria-sort')).toBe('none')
    await user.click(header)
    expect(cell.getAttribute('aria-sort')).toBe('ascending')
    /* Ascending puts `Zone 0`'s row — value 0 — first. */
    expect(screen.getAllByRole('row')[1]?.textContent).toContain('Zone 0')

    await user.click(screen.getByRole('button', { name: 'Sort by 19 Jun' }))
    expect(cell.getAttribute('aria-sort')).toBe('descending')
    expect(screen.getAllByRole('row')[1]?.textContent).toContain('Zone 9')

    /* A third click returns the planner's own order, which is meaningful. */
    await user.click(screen.getByRole('button', { name: 'Sort by 19 Jun' }))
    expect(cell.getAttribute('aria-sort')).toBe('none')
  })

  it('sinks a gap to the bottom either way — a gap is not a small number', async () => {
    const user = userEvent.setup()
    const series = [
      seriesOf({ id: 'a', panelId: 'pa', points: [null, null, null] }),
      seriesOf({ id: 'b', panelId: 'pb', points: [5, 5, 5] }),
    ]
    const panels = ['pa', 'pb'].map((panelId, index) => ({
      ...PANEL,
      panelId,
      titleKey: 'rb.panel.measureByGroup',
      titleParams: { measure: 'rb.panel.other', group: index === 0 ? 'Gapped' : 'Read' },
    }))
    render(
      <ResultTable result={result('none', series, { panels })} chrome t={t} language="en" />,
    )
    await user.click(screen.getByRole('button', { name: 'Sort by 19 Jun' }))
    const rows = screen.getAllByRole('row')
    expect(rows[1]?.textContent).toContain('Read')
    expect(rows[2]?.textContent).toContain('Gapped')
  })

  it('never grows a row checkbox, chrome or not', () => {
    const { rerender } = renderTable({ chrome: true, onExport: () => {} })
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    rerender(<ResultTable result={wideResult()} t={t} language="en" />)
    /* Series membership is decided by `panelId` on the wire. A checkbox that
       hid one would make the picture disagree with the question that produced
       it, and the disagreement would survive a screenshot. */
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })
})

/* ══════════════════════════ §9.2 / §9.5 — Arabic ═════════════════════════ */

describe('the marks that must not mirror keep not mirroring', () => {
  it('leaves the sort caret unmirrored — up and down are magnitude', async () => {
    const user = userEvent.setup()
    document.documentElement.setAttribute('dir', 'rtl')
    const series = Array.from({ length: 10 }, (_, index) =>
      seriesOf({ id: `s-${index}`, panelId: `p-${index}`, points: [index, index, index] }),
    )
    const panels = series.map((_, index) => ({ ...PANEL, panelId: `p-${index}` }))
    /* `language="en"` under `dir="rtl"` — the same pairing `panelCard.test.tsx`
       uses. What is under test is the CLASS on the caret, and an Arabic month
       name would only change which string the header is looked up by. */
    const { container } = render(
      <ResultTable result={result('none', series, { panels })} chrome t={t} language="en" />,
    )
    await user.click(screen.getByRole('button', { name: 'Sort by 19 Jun' }))
    const caret = container.querySelector('svg.lucide-arrow-up')
    expect(caret).not.toBeNull()
    /* §9.5's closed set. No `rtl:` variant and no CSS rotation may reach it;
       the same assertion `panelCard.test.tsx` makes about the delta's caret. */
    const className = caret?.getAttribute('class') ?? ''
    expect(className).not.toMatch(/rtl:/)
    expect(className).not.toMatch(/scale-x/)
    expect(className).not.toMatch(/rotate/)
    document.documentElement.removeAttribute('dir')
  })

  it('keeps the related strip on logical utilities only', () => {
    document.documentElement.setAttribute('dir', 'rtl')
    const { container } = renderCard(upResult(), { measure: ON_TWO_BOARDS, related: true })
    const strip = screen.getByText(copy('rb.related.heading')).parentElement as HTMLElement
    const classes = Array.from(strip.querySelectorAll('*'))
      .map((node) => node.getAttribute('class') ?? '')
      .join(' ')
    expect(classes).not.toMatch(/\b(ml-|mr-|pl-|pr-|left-|right-|text-left|text-right)/)
    expect(container).toBeTruthy()
    document.documentElement.removeAttribute('dir')
  })
})

/* ═══════ the card's original anatomy is unchanged by any of the above ════ */

describe('the chrome did not move the anatomy', () => {
  it('still puts the headline before the plot and the legend after it', () => {
    renderCard(upResult())
    const headline = screen.getByText('60')
    const plot = screen.getByRole('img')
    const legend = screen.getByText('19 Jun – 21 Jun')
    expect(headline.compareDocumentPosition(plot) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(plot.compareDocumentPosition(legend) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('still names the same baseline window in the sentence and in the legend', () => {
    renderCard(upResult())
    expect(screen.getByText(`${TITLE} is up 100% against 16 Jun – 18 Jun.`)).toBeInTheDocument()
  })
})
