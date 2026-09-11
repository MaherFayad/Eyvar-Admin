/**
 * `QueryPanel`'s v2 rows — §5.3's new order (WP-2.6): Formula and Transform
 * land between the second measure and Split by; Segments lands between Split
 * by and Filters. `groupBy`'s v2 array shape (G4) is exercised here too —
 * `QueryPanel` still offers one level, array-compatible, per the WP-2.6
 * handoff (two levels is unclaimed scope, flagged there).
 */

import { render, screen } from '@testing-library/react'
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
    dimensions: [{ key: DIM.key, cardinalityHint: DIM.cardinalityHint }],
    filterableFields: [],
    permission: null,
    captionKey: null,
    displayedAsMetricKeys: [],
  }
}

const MEASURES = [measure()]
const DIMENSIONS = [DIM]

const BASE: ReportQuery = {
  measures: [{ key: 'trips.completed' }],
  groupBy: [],
  filters: [],
  window: { kind: 'preset', preset: 'last-30d' },
  grain: 'day',
  periodComparison: 'none',
  chartType: 'line',
}

function renderPanel(query: ReportQuery = BASE, onChange = vi.fn()) {
  const plan = planReportQuery(query, { measures: MEASURES, dimensions: DIMENSIONS }, EYVAR_TODAY)
  render(
    <QueryPanel
      query={query}
      onChange={onChange}
      onRun={() => {}}
      plan={plan}
      measures={MEASURES}
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
