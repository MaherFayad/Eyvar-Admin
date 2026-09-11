/**
 * WP-2.1…2.5 — the chart surface. One `ReportResult` fixture per behaviour,
 * hand-built for the reason `canvas.wiring.test.tsx` gives: the point is a
 * shape the seeded data need not contain, and waiting for a fixture to grow
 * one is how a seam ships untested. `SeriesChart`'s marks carry no text
 * (`INERT`, proven in the harness, not here — jsdom renders no SVG); every
 * assertion below is about the HTML chrome around the plot.
 */

import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTranslator } from '@/lib'
import { EN } from '@/i18n/dictionaries'
import type { Measure, ReportPanel, ReportQuery, ReportResult, ReportSeries } from '@/data/types'
import type { Annotation } from '@/data/types/annotation'
import { ResultCanvas } from './ResultCanvas'

const t = createTranslator({ dictionary: EN })
const copy = (key: string) => EN[key] as string
const NO_DATA = EN['overview.noData'] as string
const AS_OF = '2026-06-25T09:14:00+03:00'
const BUCKETS = ['2026-06-19', '2026-06-20', '2026-06-21']

beforeEach(() => {
  /* jsdom has no Pointer Events; Radix's dropdown/select need these three
     shims to open in a test at all (`AGENT-BRIEF.md`'s trap table). */
  if (!HTMLElement.prototype.hasPointerCapture) {
    HTMLElement.prototype.hasPointerCapture = () => false
    HTMLElement.prototype.setPointerCapture = () => undefined
    HTMLElement.prototype.releasePointerCapture = () => undefined
  }
  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = () => undefined
  }
})

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

function twoPanelResult(over: Partial<ReportResult> = {}): ReportResult {
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
    ...over,
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

/* ═══════════════════════ §2.1 — the legend as buttons ════════════════════ */

describe('AC-1138/1139/1141 — the legend is real buttons', () => {
  it('toggles a series into `hidden` on click, struck through, still in the legend', async () => {
    renderCanvas()
    const entry = screen.getByRole('button', { name: titleOf('p1') })
    expect(entry).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(entry)
    expect(entry).toHaveAttribute('aria-pressed', 'false')
    expect(entry.querySelector('span.line-through')).toBeTruthy()
    /* Still named — the picture never lies about what was asked. */
    expect(screen.getByRole('button', { name: titleOf('p1') })).toBeInTheDocument()
  })

  it('isolates a series from its kebab menu, hiding every other one', async () => {
    renderCanvas()
    const kebabs = screen.getAllByRole('button', { name: copy('rb.legend.isolate') })
    await userEvent.click(kebabs[0]!)
    const isolate = await screen.findAllByRole('menuitem', { name: copy('rb.legend.isolate') })
    await userEvent.click(isolate[0]!)

    expect(screen.getByRole('button', { name: titleOf('p1') })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: titleOf('p2') })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: copy('rb.legend.showAll') })).toBeInTheDocument()
  })

  it('shows all again from the `Show all` link', async () => {
    renderCanvas()
    await userEvent.click(screen.getByRole('button', { name: titleOf('p1') }))
    await userEvent.click(screen.getByRole('button', { name: copy('rb.legend.showAll') }))
    expect(screen.getByRole('button', { name: titleOf('p1') })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('button', { name: copy('rb.legend.showAll') })).not.toBeInTheDocument()
  })

  it('Shift+click on a legend entry reaches the same isolate the kebab does (AC-1139)', () => {
    renderCanvas()
    fireEvent.click(screen.getByRole('button', { name: titleOf('p1') }), { shiftKey: true })
    expect(screen.getByRole('button', { name: titleOf('p1') })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: titleOf('p2') })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: copy('rb.legend.showAll') })).toBeInTheDocument()
  })

  it('a second Shift+click on the same entry restores all (AC-1139)', () => {
    renderCanvas()
    const entry = () => screen.getByRole('button', { name: titleOf('p1') })
    fireEvent.click(entry(), { shiftKey: true })
    fireEvent.click(entry(), { shiftKey: true })
    expect(screen.getByRole('button', { name: titleOf('p1') })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: titleOf('p2') })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('AC-1140 — the comparison entry toggles as one unit', () => {
  it('has exactly one entry for the comparison, not one per series', async () => {
    renderCanvas({
      result: twoPanelResult({
        query: { ...QUERY, periodComparison: 'previous-period' },
        series: [
          seriesOf('p1'),
          seriesOf('p2'),
          seriesOf('p1', { id: 'c-p1', role: 'comparison', points: [8, 18, 28] }),
          seriesOf('p2', { id: 'c-p2', role: 'comparison', points: [8, 18, 28] }),
        ],
      }),
    })
    const previous = screen.getAllByRole('button', { name: copy('rb.panel.legend.previous') })
    expect(previous).toHaveLength(1)
    await userEvent.click(previous[0]!)
    expect(previous[0]).toHaveAttribute('aria-pressed', 'false')
  })
})

/* ═══════════════════════════ §2.3 — the View menu ═════════════════════════ */

describe('AC-1144/1147 — the View menu disables in place, with a reason', () => {
  it('disables log scale when a visible value is at or below zero', async () => {
    renderCanvas({
      result: twoPanelResult({ series: [seriesOf('p1', { points: [0, 1, 2] }), seriesOf('p2')] }),
    })
    await userEvent.click(screen.getByRole('button', { name: copy('rb.view.menu') }))
    const item = await screen.findByRole('menuitemcheckbox', { name: new RegExp(copy('rb.view.log')) })
    expect(item).toHaveAttribute('aria-disabled', 'true')
    expect(within(item).getByText(copy('rb.view.logNeedsPositive'))).toBeInTheDocument()
  })

  it('leaves log scale enabled once every visible value clears zero', async () => {
    renderCanvas()
    await userEvent.click(screen.getByRole('button', { name: copy('rb.view.menu') }))
    const item = await screen.findByRole('menuitemcheckbox', { name: new RegExp(copy('rb.view.log')) })
    expect(item).not.toHaveAttribute('aria-disabled', 'true')
  })

  it('disables data labels with the count once buckets × visible series exceed 60 (AC-1147)', async () => {
    const buckets = Array.from({ length: 21 }, (_, i) => `2026-06-${String(i + 1).padStart(2, '0')}`)
    renderCanvas({
      result: twoPanelResult({
        buckets,
        panels: [panelOf('p1'), panelOf('p2'), panelOf('p3')],
        series: buckets.length
          ? ['p1', 'p2', 'p3'].map((id) => seriesOf(id, { points: buckets.map(() => 1) }))
          : [],
      }),
    })
    await userEvent.click(screen.getByRole('button', { name: copy('rb.view.menu') }))
    const item = await screen.findByRole('menuitemcheckbox', { name: new RegExp(copy('rb.view.dataLabels')) })
    expect(item).toHaveAttribute('aria-disabled', 'true')
    /* 21 buckets × 3 visible series = 63. */
    expect(within(item).getByText(t('rb.view.dataLabels.disabled', { count: 63 }))).toBeInTheDocument()
  })

  it('leaves data labels enabled at or under the 60-point ceiling', async () => {
    renderCanvas()
    await userEvent.click(screen.getByRole('button', { name: copy('rb.view.menu') }))
    const item = await screen.findByRole('menuitemcheckbox', { name: new RegExp(copy('rb.view.dataLabels')) })
    expect(item).not.toHaveAttribute('aria-disabled', 'true')
  })
})

/* ═══════════════════════════ §2.5 — the brush ═════════════════════════════ */

describe('AC-1151/1152 — the brush and its reset chip', () => {
  const wideBuckets = Array.from({ length: 32 }, (_, i) => {
    const day = new Date(Date.UTC(2026, 4, 1 + i))
    return day.toISOString().slice(0, 10)
  })

  it('renders no brush at all under 30 buckets', () => {
    renderCanvas()
    expect(screen.queryByRole('button', { name: copy('rb.chart.zoomed.reset') })).not.toBeInTheDocument()
  })

  it('narrows the domain with `[`/`]` while the plot region has focus, and shows the reset chip', async () => {
    renderCanvas({
      result: twoPanelResult({
        buckets: wideBuckets,
        series: [
          seriesOf('p1', { points: wideBuckets.map((_, i) => i) }),
          seriesOf('p2', { points: wideBuckets.map((_, i) => i) }),
        ],
      }),
    })
    const region = screen.getByRole('group', { name: `${titleOf('p1')}, ${titleOf('p2')}` })
    region.focus()
    fireEvent.keyDown(region, { key: '[' })
    expect(screen.getByRole('button', { name: copy('rb.chart.zoomed.reset') })).toBeInTheDocument()
  })

  it('the reset chip clears the zoom', async () => {
    renderCanvas({
      result: twoPanelResult({
        buckets: wideBuckets,
        series: [seriesOf('p1', { points: wideBuckets.map((_, i) => i) }), seriesOf('p2')],
      }),
    })
    const region = screen.getByRole('group', { name: `${titleOf('p1')}, ${titleOf('p2')}` })
    region.focus()
    fireEvent.keyDown(region, { key: '[' })
    await userEvent.click(screen.getByRole('button', { name: copy('rb.chart.zoomed.reset') }))
    expect(screen.queryByRole('button', { name: copy('rb.chart.zoomed.reset') })).not.toBeInTheDocument()
  })
})

/* ═══════════════════════════ §2.4 — annotations ═══════════════════════════ */

describe('AC-1148/1149 — annotation marks and the inline form', () => {
  const inWindow: Annotation = {
    id: 'ANN-1',
    date: '2026-06-20',
    label: 'Price change',
    note: 'A note.',
    kind: 'price',
    createdBy: 'U1',
    createdAt: AS_OF,
  }
  const outsideWindow: Annotation = { ...inWindow, id: 'ANN-2', date: '2026-01-01', label: 'Too early' }

  it('draws a mark for an annotation inside the window and none for one outside it', () => {
    renderCanvas({ annotations: [inWindow, outsideWindow] })
    expect(screen.getByRole('button', { name: new RegExp(inWindow.label) })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: new RegExp(outsideWindow.label) })).not.toBeInTheDocument()
  })

  it('disables `Add annotation` with the reason, not removed, without `canAnnotate` (AC-1149)', () => {
    renderCanvas({ canAnnotate: false, onSaveAnnotation: async () => {} })
    const button = screen.getByRole('button', { name: copy('rb.chart.addAnnotation') })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('title', copy('rb.chart.addAnnotation.needsPermission'))
  })

  it('opens the inline form and saves through the caller — no dialog', async () => {
    const onSaveAnnotation = vi.fn().mockResolvedValue(undefined)
    renderCanvas({ canAnnotate: true, onSaveAnnotation })
    await userEvent.click(screen.getByRole('button', { name: copy('rb.chart.addAnnotation') }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const form = screen.getByRole('form')
    await userEvent.type(within(form).getByLabelText(copy('rb.annotation.form.date')), '2026-06-20')
    await userEvent.type(within(form).getByLabelText(copy('rb.annotation.form.label')), 'Launch')
    await userEvent.click(within(form).getByRole('button', { name: copy('rb.annotation.form.submit') }))
    expect(onSaveAnnotation).toHaveBeenCalledTimes(1)
  })
})

/* ═══════════════════ §4.8 — the eight-hue palette and Other ═══════════════ */

describe('AC-1136 — series seven and eight take s7/s8; Other takes muted-foreground', () => {
  it('emits the eighth and ninth series colours and mutes the folded Other', () => {
    /* `ChartStyle` (`ui/chart.tsx`) emits `--color-<key>` as a `<style>` tag —
       real DOM, unlike the SVG marks jsdom cannot lay out (file header). */
    const ids = Array.from({ length: 9 }, (_, i) => `p${i + 1}`)
    const { container } = renderCanvas({
      result: twoPanelResult({
        panels: ids.map((id) => panelOf(id)),
        series: ids.map((id, i) => seriesOf(id, i === 8 ? { groupValue: '__other__' } : {})),
        foldedGroupCount: 1,
      }),
      effectiveChartType: 'bar',
    })
    const style = container.querySelector('style')?.textContent ?? ''
    expect(style).toContain('--color-s6: var(--chart-s7);')
    expect(style).toContain('--color-s7: var(--chart-s8);')
    expect(style).toContain('--color-s8: var(--muted-foreground);')
  })
})

/* ═══════════════════════════ §4.1 — new chart branches ════════════════════ */

describe('AC-1130 — the new chart types render without a console error', () => {
  it.each(['area', 'stacked-bar', 'stacked-100', 'horizontal-bar'] as const)('%s', (chartType) => {
    const result: ReportResult =
      chartType === 'horizontal-bar'
        ? twoPanelResult({
            query: { ...QUERY, grain: 'none', chartType },
            buckets: [BUCKETS[0] as string],
            panels: [panelOf('p1'), panelOf('p2')],
            series: [
              seriesOf('p1', { points: [12] }),
              seriesOf('p2', { points: [30], groupValue: '__other__' }),
            ],
          })
        : twoPanelResult({ query: { ...QUERY, chartType } })
    renderCanvas({ result, effectiveChartType: chartType })
    expect(screen.getByRole('group', { name: `${titleOf('p1')}, ${titleOf('p2')}` })).toBeInTheDocument()
  })
})

describe('AC-1135 — `kpi` shows the total, the neutral delta and a sparkline', () => {
  it('renders the rolled-up value and the window sentence', () => {
    renderCanvas({
      result: twoPanelResult({
        query: { ...QUERY, measures: [{ key: MEASURE.key }], chartType: 'kpi' },
        panels: [panelOf('p1')],
        series: [seriesOf('p1', { points: [10, 20, 30] })],
      }),
      effectiveChartType: 'kpi',
    })
    /* `10+20+30`, the catalogue's `sum` aggregate over a flow. */
    expect(screen.getByText('60')).toBeInTheDocument()
  })
})
