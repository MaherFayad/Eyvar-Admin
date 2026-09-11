/**
 * Transform controls — §1.3's three rows, each disabled in place with a
 * reason (D9 CQ-3). `options` is `plan.transformOptions`, computed by the
 * real `planReportQuery` (`plan.ts`) — the same computation that refuses a
 * hand-edited URL carrying an illegal transform (WP-2.6b gap 1). This file
 * proves the rendering; `plan.transform.test.ts` proves the rule.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EYVAR_TODAY, planReportQuery } from '@/data/clients'
import { EN } from '@/i18n/dictionaries'
import { createTranslator } from '@/lib'
import type { Dimension, Measure, ReportQuery } from '@/data/types'
import { TransformControls } from './TransformControls'

const t = createTranslator({ dictionary: EN })

function measure(overrides: Partial<Measure> = {}): Measure {
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
    dimensions: [{ key: 'trip.kind', cardinalityHint: 2 }],
    filterableFields: [],
    permission: null,
    captionKey: null,
    displayedAsMetricKeys: [],
    ...overrides,
  }
}

const DIM: Dimension = { key: 'trip.kind', labelKey: 'rb.dim.trip.kind', resource: 'trips', field: 'kind', cardinalityHint: 2 }

const BASE: ReportQuery = {
  measures: [{ key: 'trips.completed' }],
  groupBy: [],
  filters: [],
  window: { kind: 'preset', preset: 'last-30d' },
  grain: 'day',
  periodComparison: 'none',
  chartType: 'line',
}

/** The plan for a query, over a one-measure catalogue — `options` and `bucketCount` both come from it. */
function planFor(query: ReportQuery, catalogueMeasure: Measure = measure()) {
  return planReportQuery(query, { measures: [catalogueMeasure], dimensions: [DIM] }, EYVAR_TODAY)
}

function renderControls(props: {
  query?: ReportQuery
  onChange?: (query: ReportQuery) => void
  catalogueMeasure?: Measure
  unstarted?: boolean
} = {}) {
  const onChange = vi.fn()
  const query = props.query ?? BASE
  const plan = planFor(query, props.catalogueMeasure)
  render(
    <TransformControls
      query={query}
      onChange={props.onChange ?? onChange}
      options={plan.transformOptions}
      bucketCount={plan.bucketCount}
      unstarted={props.unstarted ?? false}
      t={t}
    />,
  )
  return onChange
}

describe('cumulative total', () => {
  it('is enabled for an additive measure', () => {
    renderControls({ catalogueMeasure: measure({ additive: true }) })
    expect(screen.getByRole('checkbox', { name: t('rb.control.transform.cumulative') })).toBeEnabled()
  })

  it('is disabled in place, with the planner’s reason, for a non-additive measure', () => {
    renderControls({ catalogueMeasure: measure({ additive: false }) })
    const box = screen.getByRole('checkbox', { name: t('rb.control.transform.cumulative') })
    expect(box).toBeDisabled()
    expect(screen.getByText(t('rb.control.transform.cumulative.disabled'))).toBeInTheDocument()
  })

  it('checking it writes `transform.cumulative: true` and nothing else', async () => {
    const user = userEvent.setup()
    const onChange = renderControls()
    await user.click(screen.getByRole('checkbox', { name: t('rb.control.transform.cumulative') }))
    expect(onChange).toHaveBeenCalledWith({
      ...BASE,
      transform: { cumulative: true, rollingAverage: null, percentOfTotal: false },
    })
  })
})

describe('rolling average', () => {
  it('is disabled with the reason when the window has fewer than two buckets', () => {
    /* One calendar day at `grain: 'day'` — exactly one bucket, the real fact
       `plan.bucketCount` carries, not a prop standing in for it. */
    const query: ReportQuery = { ...BASE, window: { kind: 'absolute', from: '2026-06-01', to: '2026-06-01' } }
    renderControls({ query })
    const box = screen.getByRole('checkbox', { name: t('rb.control.transform.rollingAverage') })
    expect(box).toBeDisabled()
    expect(screen.getByText(t('rb.control.transform.rollingAverage.disabled', { count: 1 }))).toBeInTheDocument()
  })

  it('the number field clamps to the window and stays disabled until checked', () => {
    const query: ReportQuery = { ...BASE, window: { kind: 'preset', preset: 'last-30d' } }
    renderControls({ query })
    const field = screen.getByRole('spinbutton', { name: t('rb.control.transform.rollingAverage') })
    expect(field).toBeDisabled()
    expect(field).toHaveAttribute('max', '30')
    expect(field).toHaveAttribute('min', '2')
  })
})

describe('percent of total', () => {
  it('is disabled with the reason when there is no split', () => {
    renderControls({ query: { ...BASE, groupBy: [] } })
    const box = screen.getByRole('checkbox', { name: t('rb.control.transform.percentOfTotal') })
    expect(box).toBeDisabled()
    expect(screen.getByText(t('rb.control.transform.percentOfTotal.disabled'))).toBeInTheDocument()
  })

  it('is enabled once a split is chosen', () => {
    renderControls({ query: { ...BASE, groupBy: ['trip.kind'] } })
    expect(screen.getByRole('checkbox', { name: t('rb.control.transform.percentOfTotal') })).toBeEnabled()
  })
})

describe('unstarted (no measure)', () => {
  it('disables all three with the unstarted reason', () => {
    renderControls({ query: { ...BASE, measures: [] }, unstarted: true })
    for (const label of [
      'rb.control.transform.cumulative',
      'rb.control.transform.rollingAverage',
      'rb.control.transform.percentOfTotal',
    ]) {
      expect(screen.getByRole('checkbox', { name: t(label) })).toBeDisabled()
    }
    expect(screen.getAllByText(t('rb.control.disabled.unstarted')).length).toBeGreaterThan(0)
  })
})

describe('a hand-edited URL carrying an illegal transform (WP-2.6b gap 1)', () => {
  it('is refused: `Refresh`-blocking violations carry the same reason the control shows', () => {
    const query: ReportQuery = { ...BASE, transform: { cumulative: true, rollingAverage: null, percentOfTotal: false } }
    const plan = planReportQuery(query, { measures: [measure({ additive: false })], dimensions: [DIM] }, EYVAR_TODAY)
    expect(plan.violations).toContainEqual(
      expect.objectContaining({ code: 'transform-needs-additive', field: 'transform' }),
    )
  })
})
