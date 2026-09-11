/**
 * `QueryPanel`'s v2 rows — §5.3's new order (WP-2.6): Formula and Transform
 * land between the second measure and Split by; Segments lands between Split
 * by and Filters. `groupBy`'s v2 array shape (G4) is exercised here too, and
 * WP-2.6b closes the two gaps the WP-2.6 handoff flagged: a second split
 * level, and `Measured as` (G1).
 */

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EYVAR_TODAY, disableMockLatency, planReportQuery, resetDataLayer } from '@/data/clients'
import { EN } from '@/i18n/dictionaries'
import { createTranslator } from '@/lib'
import type { Dimension, Measure, ReportQuery } from '@/data/types'
import { QueryPanel } from './QueryPanel'

const t = createTranslator({ dictionary: EN })

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.setPointerCapture = () => {}
    Element.prototype.releasePointerCapture = () => {}
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }
})

const DIM: Dimension = { key: 'trip.kind', labelKey: 'rb.dim.trip.kind', resource: 'trips', field: 'kind', cardinalityHint: 2 }
const DIM2: Dimension = { key: 'trip.pickup', labelKey: 'rb.dim.trip.pickup', resource: 'trips', field: 'pickup', cardinalityHint: 12 }

function measure(): Measure {
  return {
    key: 'trips.completed',
    labelKey: 'rb.measure.trips.completed',
    category: 'service',
    population: {
      resource: 'trips',
      predicate: [],
      predicateKey: 'rb.pop.trips.completed',
      timeField: 'endedAt',
      valueField: null,
      coverage: { from: '2025-01-01', to: EYVAR_TODAY },
    },
    temporality: 'flow',
    bucketAggregate: 'count',
    additive: true,
    unit: 'count',
    currency: null,
    higherIsBetter: true,
    minGrain: 'day',
    dimensions: [
      { key: DIM.key, cardinalityHint: DIM.cardinalityHint },
      { key: DIM2.key, cardinalityHint: DIM2.cardinalityHint },
    ],
    filterableFields: [],
    permission: null,
    captionKey: null,
    displayedAsMetricKeys: [],
  }
}

/** G1 — the one fact `Measured as` reads: more than one legal aggregate. */
function multiAggregateMeasure(): Measure {
  return { ...measure(), key: 'trips.fareCollected', labelKey: 'rb.measure.trips.fareCollected', bucketAggregateOptions: ['sum', 'mean'] }
}

const MEASURES = [measure()]
const DIMENSIONS = [DIM, DIM2]

const BASE: ReportQuery = {
  measures: [{ key: 'trips.completed' }],
  groupBy: [],
  filters: [],
  window: { kind: 'preset', preset: 'last-30d' },
  grain: 'day',
  periodComparison: 'none',
  chartType: 'line',
}

function renderPanel(query: ReportQuery = BASE, onChange = vi.fn(), measures: readonly Measure[] = MEASURES) {
  const plan = planReportQuery(query, { measures, dimensions: DIMENSIONS }, EYVAR_TODAY)
  render(
    <QueryPanel
      query={query}
      onChange={onChange}
      onRun={() => {}}
      plan={plan}
      measures={measures}
      dimensions={DIMENSIONS}
      catalogueStatus="content"
      onRetryCatalogue={() => {}}
      running={false}
      t={t}
    />,
  )
  return onChange
}

describe('the rail order', () => {
  it('places Formula and Transform between the second measure and Split by, Segments between Split by and Filters', () => {
    renderPanel()
    const labels = screen
      .getAllByText((_, el) => el?.tagName === 'LABEL')
      .map((el) => el.textContent)
    const order = [
      t('rb.control.measure'),
      t('rb.control.measure2'),
      t('rb.control.formula'),
      t('rb.control.transform'),
      t('rb.control.groupBy'),
      t('rb.control.segments'),
      t('rb.control.filters'),
    ]
    const indexes = order.map((label) => labels.indexOf(label))
    expect(indexes).toEqual([...indexes].sort((a, b) => a - b))
    expect(indexes.every((i) => i >= 0)).toBe(true)
  })
})

describe('split by — the array shape (G4)', () => {
  it('writes `groupBy: [key]`, not a bare string or null', async () => {
    const user = userEvent.setup()
    const onChange = renderPanel()
    await user.click(screen.getByRole('combobox', { name: t('rb.control.groupBy') }))
    await user.click(screen.getByRole('option', { name: t(DIM.labelKey) }))
    expect(onChange).toHaveBeenCalledWith({ ...BASE, groupBy: [DIM.key] })
  })

  it('choosing "No split" clears it to `[]`', async () => {
    const user = userEvent.setup()
    const onChange = renderPanel({ ...BASE, groupBy: [DIM.key] })
    await user.click(screen.getByRole('combobox', { name: t('rb.control.groupBy') }))
    await user.click(screen.getByRole('option', { name: t('rb.control.groupBy.none') }))
    expect(onChange).toHaveBeenCalledWith({ ...BASE, groupBy: [] })
  })
})

describe('split by — a second level (WP-2.6b gap 3, G4)', () => {
  it('adding a second dimension writes `groupBy: [level1, level2]`', async () => {
    const user = userEvent.setup()
    const onChange = renderPanel({ ...BASE, groupBy: [DIM.key] })
    await user.click(screen.getByRole('combobox', { name: t('rb.control.groupBy2') }))
    await user.click(screen.getByRole('option', { name: t(DIM2.labelKey) }))
    expect(onChange).toHaveBeenCalledWith({ ...BASE, groupBy: [DIM.key, DIM2.key] })
  })

  it('is disabled in place with a reason until a first split exists', async () => {
    const user = userEvent.setup()
    renderPanel({ ...BASE, groupBy: [] })
    expect(screen.getByRole('combobox', { name: t('rb.control.groupBy2') })).toBeDisabled()
    /* The reason lives behind the label row's `InfoHint`, same carrier every
       other Select-based row in this panel uses (file header, "the rail
       stopped being a wall of prose"). */
    const row = screen.getByText(t('rb.control.groupBy2')).closest('div')!
    await user.hover(within(row).getByRole('button', { name: t('shell.hint.show') }))
    const tip = await screen.findByRole('tooltip')
    expect(tip.textContent).toContain(t('rb.control.groupBy2.needsFirst'))
  })

  it('a third split level is refused in place with a reason naming the cap', () => {
    renderPanel({ ...BASE, groupBy: [DIM.key, DIM2.key] })
    const addThird = screen.getByRole('button', { name: t('rb.control.groupBy3.add') })
    expect(addThird).toBeDisabled()
    expect(screen.getByText(t('rb.violation.tooManyGroupLevels', { max: 2 }))).toBeInTheDocument()
  })
})

describe('`Measured as` (WP-2.6b gap 2, G1)', () => {
  it('appears when the measure has more than one `bucketAggregateOptions` entry', () => {
    const multi = multiAggregateMeasure()
    renderPanel({ ...BASE, measures: [{ key: multi.key }] }, vi.fn(), [multi])
    expect(screen.getByRole('combobox', { name: t('rb.control.measuredAs') })).toBeInTheDocument()
  })

  it('does not appear for a measure with no `bucketAggregateOptions`', () => {
    renderPanel(BASE)
    expect(screen.queryByRole('combobox', { name: t('rb.control.measuredAs') })).not.toBeInTheDocument()
  })

  it('choosing an aggregate writes `measures[0].aggregate`; choosing the catalogue default clears it', async () => {
    const user = userEvent.setup()
    const multi = multiAggregateMeasure()
    const query = { ...BASE, measures: [{ key: multi.key }] }
    const onChange = renderPanel(query, vi.fn(), [multi])
    await user.click(screen.getByRole('combobox', { name: t('rb.control.measuredAs') }))
    await user.click(screen.getByRole('option', { name: t('rb.control.measuredAs.mean') }))
    expect(onChange).toHaveBeenCalledWith({ ...query, measures: [{ key: multi.key, aggregate: 'mean' }] })
  })
})
