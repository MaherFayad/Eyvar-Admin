/**
 * **Two shipped features that nothing reached, and one frame that was drawn
 * twice.**
 *
 * `ResultTable` grew §A11's header row behind `chrome` and an `Export CSV`
 * behind `onExport`; `PanelCard` grew §A12's related strip behind `related`.
 * All three defaulted off — correctly, because each component has two callers
 * and a dashboard tile must inherit nothing it did not ask for — and then
 * **nobody passed them**, because their author did not own `ResultCanvas`. A
 * prop with no call site is not a feature, and neither `tsc` nor a rendering of
 * the component in isolation can tell the difference.
 *
 * So the assertions here are all about the **seam**, not about the widgets:
 *
 *   1. The canvas that asks for the table (`withTable` — the builder) gets the
 *      search, the sort and the export, and its panels get the related strip.
 *   2. The canvas that does not (a dashboard tile) gets none of the four. One
 *      signal, `combinedTable`, decides both — so the two cannot drift into
 *      disagreeing about which caller they are inside.
 *   3. `onExport` is the caller's function, actually invoked. A button wired to
 *      nothing passes a presence check forever.
 *   4. `framed` produces exactly one frame, and `PanelFrame` is asserted in
 *      both states so *"one card"* cannot be true merely because the panels
 *      stopped rendering.
 *
 * The `ReportResult` is hand-built rather than run through `runReport`, for the
 * reason `panelCard.test.tsx` gives: the point is a shape the seeded data need
 * not contain — two panels, with a measure declared as displayed on a real
 * board — and waiting for a fixture to grow one is how a seam ships untested.
 */

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { createTranslator } from '@/lib'
import { EN } from '@/i18n/dictionaries'
import type {
  Measure,
  ReportPanel,
  ReportQuery,
  ReportResult,
  ReportSeries,
} from '@/data/types'
import { PanelFrame } from './PanelCard'
import { ResultCanvas } from './ResultCanvas'

const t = createTranslator({ dictionary: EN })
const copy = (key: string) => EN[key] as string
const NO_DATA = EN['overview.noData'] as string
const AS_OF = '2026-06-25T09:14:00+03:00'
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
  /* One real sub-tab, so the strip resolves rather than being dropped. The
     resolution itself is `panel.chrome.test.tsx`'s subject; here it only has
     to produce something visible. */
  displayedAsMetricKeys: ['management.growth.registeredRiders'],
}

function panelOf(id: string): ReportPanel {
  return {
    panelId: id,
    titleKey: 'rb.panel.measure',
    titleParams: { measure: 'rb.panel.other' },
    unit: 'count',
    currency: null,
    seriesIds: [`s-${id}`],
  }
}

function seriesOf(panelId: string): ReportSeries {
  return {
    id: `s-${panelId}`,
    measureKey: MEASURE.key,
    groupValue: null,
    role: 'current',
    panelId,
    unit: 'count',
    currency: null,
    temporality: 'flow',
    points: [10, 20, 30],
    partialBucketIndexes: [],
    blocked: null,
    failed: null,
  }
}

const QUERY: ReportQuery = {
  measures: [{ key: MEASURE.key }],
  groupBy: null,
  filters: [],
  window: { kind: 'absolute', from: BUCKETS[0] as string, to: BUCKETS[2] as string },
  grain: 'day',
  periodComparison: 'none',
  chartType: 'line',
}

/** Two panels — the small-multiples branch, which is the one both callers hit. */
function twoPanelResult(): ReportResult {
  return {
    query: QUERY,
    asOf: AS_OF,
    buckets: BUCKETS,
    panels: [panelOf('p1'), panelOf('p2')],
    series: [seriesOf('p1'), seriesOf('p2')],
    truncated: false,
    truncatedAtRows: null,
    warnings: [],
    foldedGroupCount: null,
  }
}

/** Eight series — the width at which `ResultTable`'s own search becomes legal. */
function wideResult(): ReportResult {
  const ids = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']
  return {
    ...twoPanelResult(),
    panels: ids.map(panelOf),
    series: ids.map(seriesOf),
  }
}

function renderCanvas(props: Partial<React.ComponentProps<typeof ResultCanvas>> = {}) {
  return render(
    <MemoryRouter>
      <ResultCanvas
        status="content"
        result={twoPanelResult()}
        stale={false}
        violations={[]}
        measuresByKey={{ [MEASURE.key]: MEASURE }}
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

/** How the builder mounts it: the workspace, with the numbers beneath. */
const asBuilder = (over: Partial<React.ComponentProps<typeof ResultCanvas>> = {}) =>
  renderCanvas({ withTable: true, withMeta: false, ...over })

/** How `DashboardTile` mounts it: a reading, inside a frame it already drew. */
const asTile = (over: Partial<React.ComponentProps<typeof ResultCanvas>> = {}) =>
  renderCanvas({ framed: false, ...over })

/* ═══════════════ §A11 — the table's own header row reaches the UI ═════════ */

describe('§A11 — the table under the picture ships with its chrome', () => {
  it('gives the builder a sortable table — the header is a real, reachable button', () => {
    asBuilder()
    const numbers = screen.getByRole('region', { name: copy('rb.canvas.table.heading') })
    /* A sortable header is a real `<button>` inside its `<th>`, not a click
       handler on the cell, and it exists only under `chrome`. Its presence is
       therefore the whole proof that the prop arrived. */
    expect(
      within(numbers).getByRole('button', {
        name: copy('rb.table.sort').replace('{column}', copy('rb.table.series')),
      }),
    ).toBeInTheDocument()
  })

  it('gives it the search too, once the series list is long enough to need one', () => {
    /* `ResultTable` withholds the search below eight series on its own
       reasoning — a search box over four rows costs a tab stop and saves
       nothing. That threshold is its subject, not this one's; the point here is
       only that `chrome` reached it, so the run has to be wide enough for the
       control to be legal at all. */
    asBuilder({ result: wideResult() })
    const numbers = screen.getByRole('region', { name: copy('rb.canvas.table.heading') })
    expect(within(numbers).getByLabelText(copy('rb.table.search'))).toBeInTheDocument()
  })

  it('renders no table at all inside a tile, so its chrome cannot leak onto a board', () => {
    asTile()
    expect(
      screen.queryByRole('region', { name: copy('rb.canvas.table.heading') }),
      'a per-bucket table is thirty columns wide inside a 500px tile',
    ).not.toBeInTheDocument()
    expect(screen.queryByLabelText(copy('rb.table.search'))).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: copy('rb.table.export') }),
    ).not.toBeInTheDocument()
  })

  it('draws Export CSV only when a caller supplies the exporter', () => {
    asBuilder()
    expect(
      screen.queryByRole('button', { name: copy('rb.table.export') }),
      'an export button with nothing behind it is a dead affordance',
    ).not.toBeInTheDocument()
  })

  it('calls the caller’s exporter — the button is wired, not merely present', async () => {
    const onExport = vi.fn()
    asBuilder({ onExport })

    const button = screen.getByRole('button', { name: copy('rb.table.export') })
    await userEvent.click(button)
    expect(onExport).toHaveBeenCalledTimes(1)
  })
})

/* ═══════════════ §A12 — the related strip follows the same signal ═════════ */

describe('§A12 — the related-boards strip is the builder’s, not the board’s', () => {
  it('closes every panel in the builder with the boards the measure appears on', () => {
    asBuilder()
    /* One per panel: the strip belongs to the panel, and the run has two. */
    expect(screen.getAllByText(copy('rb.related.heading'))).toHaveLength(2)
  })

  it('leaves a dashboard tile without it — eighteen links nobody asked for', () => {
    asTile()
    expect(screen.queryByText(copy('rb.related.heading'))).not.toBeInTheDocument()
  })

  it('rides on the SAME signal as the table, so the two cannot disagree', () => {
    /* `withTable` is the builder-versus-tile signal. Turning it off must take
       the strip with it even though nothing else changed. */
    asTile({ withTable: false })
    expect(screen.queryByText(copy('rb.related.heading'))).not.toBeInTheDocument()
  })
})

/* ═══════════════════════ one frame, and only one ═════════════════════════ */

describe('framed — the caller that already drew a frame says so', () => {
  it('cards every panel by default, which is what a nested frame would double', () => {
    const { container } = renderCanvas()
    const cards = container.querySelectorAll('[data-slot="card"]')
    expect(cards, 'two panels, two cards — the canvas IS the page here').toHaveLength(2)
    expect(container.querySelectorAll('[data-slot="panel-frame"]')).toHaveLength(0)
  })

  it('draws no card at all when the caller has one, and still draws the panels', () => {
    const { container } = asTile()
    expect(container.querySelectorAll('[data-slot="card"]')).toHaveLength(0)
    /* **The half that stops this being vacuous.** Zero cards is trivially true
       of a canvas that rendered nothing; the panels have to still be there, and
       each one has to still be a panel. */
    const panels = container.querySelectorAll('[data-slot="panel-frame"]')
    expect(panels).toHaveLength(2)
    expect(
      screen.getAllByRole('button', { name: copy('rb.panel.actions') }),
      'a flush panel keeps its own chrome',
    ).toHaveLength(2)
  })

  it('carries the frame decision into the empty result too', () => {
    const empty: ReportResult = { ...twoPanelResult(), panels: [], series: [] }
    const { container } = asTile({ result: empty })
    expect(container.querySelectorAll('[data-slot="card"]')).toHaveLength(0)
    expect(screen.getByText(NO_DATA)).toBeInTheDocument()
  })

  it('is one component with two renderings, and the difference is the frame', () => {
    const { container, rerender } = render(<PanelFrame framed>body</PanelFrame>)
    const framed = container.querySelector('[data-slot="card"]')
    expect(framed, 'the default is a Card — the frame is the normal case').toBeTruthy()
    expect(framed?.className).toContain('border')

    rerender(<PanelFrame framed={false}>body</PanelFrame>)
    expect(container.querySelector('[data-slot="card"]')).toBeNull()
    const plain = container.querySelector('[data-slot="panel-frame"]') as HTMLElement
    expect(plain).toBeTruthy()
    /* No frame, and no *stripped* frame either: the utilities are absent rather
       than overridden, which is the difference between asking for one frame and
       neutralising three. */
    expect(plain.className).not.toContain('border-0')
    expect(plain.className).not.toContain('shadow-none')
    expect(plain.className).not.toContain('rounded-none')
    /* The internals are unchanged: `--card-spacing` is what every CardHeader,
       CardContent and CardFooter reads its inset from. */
    expect(plain.className).toContain('--card-spacing')
    expect(plain.textContent).toBe('body')
  })
})

/* ══════════════════════ R4-1's floor, as a column count ══════════════════ */

describe('R4-1 — the panel grid asks its container, not the viewport', () => {
  it('splits two across only where a container query says there is room', () => {
    const { container } = renderCanvas()
    const grid = container.querySelector('ul[role="list"]') as HTMLElement
    expect(grid).toBeTruthy()
    /* One column unconditionally, two only above `@xl` (36rem = 576px), which
       is the nearest container size above 2 x 268 + 12. A tile-width canvas is
       under it and runs one column; the builder's is over it and runs two.
       `scratch/tile-density.mjs` measures both — jsdom has no layout, so what
       is checkable here is that the request is a CONTAINER query and that the
       one-column answer is unprefixed and therefore always in force. */
    expect(grid.className).toContain('grid-cols-1')
    expect(grid.className).toContain('@xl:grid-cols-2')
    /* Never a bare viewport variant: `--breakpoint-*` is `initial`, so
       `xl:grid-cols-2` would compile to nothing and silently leave one column
       everywhere. `breakpointVariants.test.ts` is the product-wide gate. */
    expect(grid.className).not.toMatch(/(^|\s)xl:/)
  })

  it('gives a single panel the whole width, at every container size', () => {
    const one: ReportResult = {
      ...twoPanelResult(),
      panels: [panelOf('p1')],
      series: [seriesOf('p1')],
    }
    const { container } = renderCanvas({ result: one })
    const grid = container.querySelector('ul[role="list"]') as HTMLElement
    expect(grid.className).toContain('grid-cols-1')
    expect(grid.className).not.toContain('@xl:grid-cols-2')
  })

  it('asks the canvas itself, because nothing outside it knows how wide it is', () => {
    const { container } = renderCanvas()
    const canvas = container.querySelector('section[aria-label]') as HTMLElement
    expect(canvas).toBeTruthy()
    expect(
      canvas.className,
      'without @container the query below has nothing to measure against',
    ).toContain('@container')
  })
})
