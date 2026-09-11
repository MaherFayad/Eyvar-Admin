/**
 * Transform controls — §1.3's three rows, each disabled in place with a
 * reason (D9 CQ-3). `plan.ts` carries no `ReportTransform` violation code yet
 * (WP-2.6 handoff), so these predicates are LOCAL and this file is what proves
 * they match the sentences 22-analytics-v2.md §1.3 states.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EN } from '@/i18n/dictionaries'
import { createTranslator } from '@/lib'
import type { Measure, ReportQuery } from '@/data/types'
import { TransformControls } from './TransformControls'

const t = createTranslator({ dictionary: EN })

function measure(additive: boolean): Measure {
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
      coverage: { from: '2025-01-01', to: '2026-09-11' },
    },
    temporality: 'flow',
    bucketAggregate: additive ? 'count' : 'mean',
    additive,
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
}

const BASE: ReportQuery = {
  measures: [{ key: 'trips.completed' }],
  groupBy: [],
  filters: [],
  window: { kind: 'preset', preset: 'last-30d' },
  grain: 'day',
  periodComparison: 'none',
  chartType: 'line',
}

function renderControls(props: Partial<React.ComponentProps<typeof TransformControls>> = {}) {
  const onChange = vi.fn()
  render(
    <TransformControls
      query={props.query ?? BASE}
      onChange={props.onChange ?? onChange}
      firstMeasure={props.firstMeasure ?? measure(true)}
      hasSplit={props.hasSplit ?? false}
      bucketCount={props.bucketCount ?? 30}
      unstarted={props.unstarted ?? false}
      t={t}
    />,
  )
  return onChange
}

describe('cumulative total', () => {
  it('is enabled for an additive measure', () => {
    renderControls({ firstMeasure: measure(true) })
    expect(screen.getByRole('checkbox', { name: t('rb.control.transform.cumulative') })).toBeEnabled()
  })

  it('is disabled in place, with the reason, for a non-additive measure', () => {
    renderControls({ firstMeasure: measure(false) })
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
    renderControls({ bucketCount: 1 })
    const box = screen.getByRole('checkbox', { name: t('rb.control.transform.rollingAverage') })
    expect(box).toBeDisabled()
    expect(screen.getByText(t('rb.control.transform.rollingAverage.disabled', { count: 1 }))).toBeInTheDocument()
  })

  it('the number field clamps to the window and stays disabled until checked', () => {
    renderControls({ bucketCount: 30 })
    const field = screen.getByRole('spinbutton', { name: t('rb.control.transform.rollingAverage') })
    expect(field).toBeDisabled()
    expect(field).toHaveAttribute('max', '30')
    expect(field).toHaveAttribute('min', '2')
  })
})

describe('percent of total', () => {
  it('is disabled with the reason when there is no split', () => {
    renderControls({ hasSplit: false })
    const box = screen.getByRole('checkbox', { name: t('rb.control.transform.percentOfTotal') })
    expect(box).toBeDisabled()
    expect(screen.getByText(t('rb.control.transform.percentOfTotal.disabled'))).toBeInTheDocument()
  })

  it('is enabled once a split is chosen', () => {
    renderControls({ hasSplit: true })
    expect(screen.getByRole('checkbox', { name: t('rb.control.transform.percentOfTotal') })).toBeEnabled()
  })
})

describe('unstarted (no measure)', () => {
  it('disables all three with the unstarted reason', () => {
    renderControls({ unstarted: true, firstMeasure: null })
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
