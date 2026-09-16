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
 *      search, the sort and the export, and its plots get the related strip.
 *   2. The canvas that does not (a dashboard tile) gets none of the four. One
 *      signal, `combinedTable`, decides both — so the two cannot drift into
 *      disagreeing about which caller they are inside.
 *   3. `onExport` is the caller's function, actually invoked. A button wired to
 *      nothing passes a presence check forever.
 *   4. `framed` produces exactly one frame, and the plot is asserted alongside
 *      it so *"one card"* cannot be true merely because the body stopped
 *      rendering.
 *
 * The `ReportResult` is hand-built rather than run through `runReport`, for the
 * reason `panelCard.test.tsx` gives: the point is a shape the seeded data need
 * not contain — two panels, with a measure declared as displayed on a real
 * board — and waiting for a fixture to grow one is how a seam ships untested.
 *
 * ## What moved on 2026-09-04, and why the assertions did rather than the code
 *
 * `ResultCanvas.Body` no longer maps `result.panels` to one `PanelCard` each in
 * a `@xl:grid-cols-2` grid. It filters out the series that cannot be drawn,
 * groups the rest by `(unit, currency)`, and renders **one card per group** —
 * headlines, one plot, a legend, and §A12's strip. So the counts here changed
 * from *per panel* to *per axis group*, and the retired column-count block is
 * replaced by the invariants that actually matter: what may share a y-axis, and
 * what is never folded into one. Nothing about the QUERY changed.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { createTranslator } from '@/lib'
import { EN } from '@/i18n/dictionaries'
import { findSubTabById } from '@/data/clients'
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
/** The board `management.growth.*` resolves to, read from the route table itself. */
const GROWTH_TITLE = t(findSubTabById('management-growth')?.titleKey ?? '')
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

/**
 * **Each panel carries its own group name**, so the compound plot's accessible
 * name lists distinguishable series rather than `Other, Other`. The name IS the
 * assertion now: the marks inside a plot are inert, so what a reader is told is
 * in it is the only handle on which series ended up on which axis.
 */
function panelOf(id: string, over: Partial<ReportPanel> = {}): ReportPanel {
  return {
    panelId: id,
    titleKey: 'rb.panel.measureByGroup',
    titleParams: { measure: 'rb.panel.other', group: id },
    unit: 'count',
    currency: null,
    seriesIds: [`s-${id}`],
    ...over,
  }
}

/** The title the plot, the headline and the legend all read for a panel. */
const titleOf = (id: string) =>
  (copy('rb.panel.measureByGroup') as string)
    .replace('{measure}', copy('rb.panel.other'))
    .replace('{group}', id)

function seriesOf(panelId: string, over: Partial<ReportSeries> = {}): ReportSeries {
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

/** Two panels of one unit — one axis group, and therefore one plot. */
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
    panels: ids.map((id) => panelOf(id)),
    series: ids.map((id) => seriesOf(id)),
  }
}

/**
 * **Two panels that may NOT share a y-axis** — a count and a money figure.
 *
 * `(unit, currency)` is two thirds of the triple `pairRefusal` uses to decide
 * whether two numbers may be combined at all, and it is the grouping key the
 * canvas splits on. Halalas and a count on one axis is the fabrication this
 * module exists to refuse, so this fixture is the one that proves the compound
 * plot did not buy its picture by drawing it.
 */
function twoUnitResult(): ReportResult {
  return {
    ...twoPanelResult(),
    panels: [panelOf('p1'), panelOf('p2', { unit: 'money', currency: 'SAR' })],
    series: [seriesOf('p1'), seriesOf('p2', { unit: 'money', currency: 'SAR' })],
  }
}

/** A run where one leg is redacted (§13.1) and the rest is drawable. */
function blockedResult(): ReportResult {
  return {
    ...twoPanelResult(),
    series: [seriesOf('p1'), seriesOf('p2', { blocked: 'view_finance', points: [] })],
  }
}

/** §8.3 state 10 — one leg failed, the rest live. */
function failedResult(): ReportResult {
  return {
    ...twoPanelResult(),
    series: [
      seriesOf('p1'),
      seriesOf('p2', { failed: { code: 'upstream', retryable: true }, points: [] }),
    ],
  }
}

/**
 * The plots on screen, named by what each one says is in it. §2.2 moved the
 * compound plot from `role="img"` to `role="group"` (keyboard-navigable
 * buckets), so this filters out the chart controls row's own `group`.
 */
const CONTROLS_ROW_LABEL = copy('rb.chart.controlsRow')
/* WP-8.4 §5 — `SeriesChart` (this `role="group"` plot's own element) is now
   `lazy()`-loaded from `ResultCanvas`, so it is not in the DOM on the first
   synchronous render; `waitFor` lets its `Suspense` boundary resolve first. */
const plots = () =>
  waitFor(() => {
    const found = screen
      .queryAllByRole('group')
      .filter((el) => el.getAttribute('aria-label') !== CONTROLS_ROW_LABEL)
    if (found.length === 0) throw new Error('the plot has not resolved yet')
    return found.map((p) => p.getAttribute('aria-label'))
  })

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
  /* **One strip per PLOT, deduplicated across the series in it** — was one per
     panel. The strip hung off each `PanelCard` when a split by district drew
     six cards, which printed the same board six times. The compound plot is one
     card, so the statement *"this measure also appears on …"* is made once
     about everything on that axis. */
  it('closes each plot in the builder with the boards its measures appear on, once', () => {
    asBuilder()
    /* Two panels, one unit, one plot — and one strip, not one per series, even
       though both series resolve to the same board. */
    expect(screen.getAllByText(copy('rb.related.heading'))).toHaveLength(1)
    expect(
      screen.getByRole('link', { name: GROWTH_TITLE }),
      'the board is named once, not once per series on the axis',
    ).toBeInTheDocument()
  })

  /* **New with the compound plot**: the dedup must not collapse across axes.
     Two plots are two readings and each owes its own way out. */
  it('gives each axis group its own strip, because they are two separate plots', () => {
    asBuilder({ result: twoUnitResult() })
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
  /* **One card per axis group**, was one card per panel. The small-multiples
     grid is gone: two panels of one unit are two series on one plot, so the
     canvas draws ONE card. `twoUnitResult` below is the half that keeps this
     from being an assertion that the canvas stopped rendering. */
  it('cards each plot by default, which is what a nested frame would double', () => {
    const { container } = renderCanvas()
    const cards = container.querySelectorAll('[data-slot="card"]')
    expect(cards, 'two series, one unit, one axis — one card').toHaveLength(1)
    expect(container.querySelectorAll('[data-slot="panel-frame"]')).toHaveLength(0)
  })

  it('draws no card at all when the caller has one, and still draws the plot', async () => {
    const { container } = asTile()
    expect(container.querySelectorAll('[data-slot="card"]')).toHaveLength(0)
    /* **The half that stops this being vacuous.** Zero cards is trivially true
       of a canvas that rendered nothing; the plot has to still be there, and it
       has to still say both series are in it. */
    expect(container.querySelectorAll('[data-slot="panel-frame"]')).toHaveLength(1)
    expect(await plots()).toEqual([`${titleOf('p1')}, ${titleOf('p2')}`])
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

/* ═══════════════ one plot per (unit, currency), and no more ══════════════ */

/**
 * **What replaced R4-1's column count.**
 *
 * The old two tests here asserted `grid-cols-1 @xl:grid-cols-2` on the panel
 * grid. That grid was retired deliberately — the owner's *"compound charts that
 * compare those data to each other not every one in it's own chart"* — and with
 * it the defect it caused: six districts drew six charts, each auto-scaled to
 * its own maximum, so 40 rides and 4,000 rides produced the same shaped line at
 * the same height and the comparison the split exists to make was the one thing
 * the picture could not show.
 *
 * A column count is not the invariant worth guarding anyway. **What may share a
 * y-axis is**, and these are the assertions that catch a regression which would
 * be a lie rather than a layout: one plot per `(unit, currency)`, a series that
 * cannot be drawn left out of the compound plot rather than flattened into it.
 */
describe('the compound plot groups by what may honestly share one axis', () => {
  it('draws one plot for series of one unit, naming every series in it', async () => {
    renderCanvas()
    expect(await plots()).toEqual([`${titleOf('p1')}, ${titleOf('p2')}`])
  })

  it('draws one plot however many groups a split produces', async () => {
    /* Eight panels, one unit — a split by district, which is the case the
       compound chart was built for. Still one axis, still one plot. */
    renderCanvas({ result: wideResult() })
    const found = await plots()
    expect(found).toHaveLength(1)
    expect(found[0]).toContain(titleOf('p8'))
  })

  it('refuses to put a count and a money figure on one axis, and draws two', async () => {
    const { container } = renderCanvas({ result: twoUnitResult() })
    /* Two plots, and two cards — a second unit is a second reading, not a
       second line. Halalas over a count on one axis is the fabrication
       `pairRefusal` exists to refuse; drawing it prettily does not make it
       true. */
    expect(await plots()).toEqual([titleOf('p1'), titleOf('p2')])
    expect(container.querySelectorAll('[data-slot="card"]')).toHaveLength(2)
  })

  it('keeps a blocked series out of the compound plot, with its own card', async () => {
    renderCanvas({ result: blockedResult() })
    /* Not folded in: a redacted series has no points, and drawing it as a flat
       line at zero is §13.1's silent redaction wearing a nicer picture. */
    expect(await plots()).toEqual([titleOf('p1')])
    /* `LazyPanelCard`'s own `Suspense`, separate from the plot's above. */
    expect(
      await screen.findByText(copy('rb.panel.blocked').replace('{permission}', 'view_finance')),
      'the viewer is told the series exists and which permission would show it',
    ).toBeInTheDocument()
  })

  it('keeps a failed series out of the compound plot, with its own retry', async () => {
    renderCanvas({ result: failedResult() })
    expect(await plots()).toEqual([titleOf('p1')])
    /* §8.3 state 10 — the leg that failed carries the way to try it again, and
       the leg that worked is still drawn. `LazyPanelCard`'s own `Suspense`. */
    expect(await screen.findByText(copy('rb.panel.failed'))).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: copy('rb.panel.failed.retry') }),
    ).toBeInTheDocument()
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
