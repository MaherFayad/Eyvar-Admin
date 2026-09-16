/**
 * The segment picker — §1.2, AC-1156 (saved+inline, `performed` disabled in
 * place on an unsupported measure) and AC-1154 (series-ceiling names the
 * last-added segment). Loading/error come from the real `segments.list`
 * seam (`mockFailures`), never a hand-rolled stub.
 */

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { disableMockLatency, mockFailures, resetDataLayer } from '@/data/clients'
import { EN } from '@/i18n/dictionaries'
import { createTranslator } from '@/lib'
import type { Measure, QueryViolation, ReportQuery } from '@/data/types'
import { SegmentPicker } from './SegmentPicker'

const t = createTranslator({ dictionary: EN })

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  mockFailures.clear()
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.setPointerCapture = () => {}
    Element.prototype.releasePointerCapture = () => {}
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }
})

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
      coverage: { from: '2025-01-01', to: '2026-09-11' },
    },
    temporality: 'flow',
    bucketAggregate: 'count',
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
    ...overrides,
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

function renderPicker(props: Partial<React.ComponentProps<typeof SegmentPicker>> = {}) {
  return render(
    <SegmentPicker
      query={props.query ?? BASE}
      onChange={props.onChange ?? (() => {})}
      legalFilterFields={props.legalFilterFields ?? []}
      dimensions={props.dimensions ?? []}
      measures={props.measures ?? [measure()]}
      violations={props.violations ?? []}
      unstarted={props.unstarted ?? false}
      t={t}
    />,
  )
}

describe('content and the ceiling', () => {
  it('lists the four saved segments as chips, and Add is enabled below the cap', async () => {
    const segments: ReportQuery['segments'] = [
      { kind: 'inline', label: 'Riyadh riders', filters: [] },
      { kind: 'inline', label: 'New this month', filters: [] },
    ]
    renderPicker({ query: { ...BASE, segments } })
    expect(screen.getByRole('button', { name: /Riyadh riders/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /New this month/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: t('rb.control.segments.add') })).toBeEnabled()
  })

  it('disables `Add segment` at the cap of four, with the reason', () => {
    const segments: ReportQuery['segments'] = Array.from({ length: 4 }, (_, i) => ({
      kind: 'inline' as const,
      label: `Segment ${i + 1}`,
      filters: [],
    }))
    renderPicker({ query: { ...BASE, segments } })
    const add = screen.getByRole('button', { name: t('rb.control.segments.add') })
    expect(add).toBeDisabled()
    expect(screen.getByText(t('rb.control.segments.max'))).toBeInTheDocument()
  })

  it('AC-1154 — the last-added chip is named when the series ceiling is breached', async () => {
    const user = userEvent.setup()
    const segments: ReportQuery['segments'] = [
      { kind: 'inline', label: 'First', filters: [] },
      { kind: 'inline', label: 'Second', filters: [] },
    ]
    const violations: QueryViolation[] = [
      { code: 'too-many-series', field: 'segments', reasonKey: 'rb.violation.tooManySeries', reasonParams: { count: 16, max: 12 } },
    ]
    renderPicker({ query: { ...BASE, segments }, violations })

    const chips = screen.getAllByRole('button', { name: /First|Second/ })
    expect(within(chips[0]!).queryByText(t('rb.control.segments.overCeiling'))).toBeNull()
    expect(chips[1]).toHaveAccessibleName(new RegExp(t('rb.control.segments.overCeiling')))

    /* The ceiling sentence lives in the label's `InfoHint`, same carrier every other rail control uses. */
    await user.hover(screen.getByRole('button', { name: t('shell.hint.show') }))
    const tip = await screen.findByRole('tooltip')
    expect(tip).toHaveTextContent(t('rb.violation.tooManySeries', { count: 16, max: 12 }))
  })
})

describe('the popover', () => {
  it('shows saved segments once loaded, and adds one on pick', async () => {
    const user = userEvent.setup()
    const picks: ReportQuery['segments'][] = []
    renderPicker({
      onChange: (q: ReportQuery) => picks.push(q.segments),
    })

    await user.click(screen.getByRole('button', { name: t('rb.control.segments.add') }))
    const item = await screen.findByRole('option', { name: 'Quick ride trips' })
    await user.click(item)

    expect(picks.at(-1)).toEqual([{ kind: 'saved', id: 'SEG-1' }])
  })

  it('the popover reports a load error and never blocks the rest of the rail', async () => {
    mockFailures.always('segments.list')
    const user = userEvent.setup()
    renderPicker()

    const trigger = screen.getByRole('button', { name: t('rb.control.segments.add') })
    await user.click(trigger)
    expect(await screen.findByText(t('rb.catalogue.segments.error'))).toBeInTheDocument()
    /* The trigger itself stayed reachable — the error is scoped to the popover. */
    expect(trigger).toBeEnabled()
  })

  it('AC-1156 — `performed` is disabled in place with a reason when no measure supports it', async () => {
    const user = userEvent.setup()
    renderPicker({ measures: [measure({ supportsPerformed: false })] })

    await user.click(screen.getByRole('button', { name: t('rb.control.segments.add') }))
    await screen.findByLabelText(t('rb.control.segments.new.name'))

    expect(screen.getByRole('checkbox', { name: t('rb.control.segments.performed.label') })).toBeDisabled()
    expect(screen.getByText(t('rb.control.segments.performed.unsupported'))).toBeInTheDocument()
  })

  it('adds an inline segment by name, with no filters required', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderPicker({ onChange })

    await user.click(screen.getByRole('button', { name: t('rb.control.segments.add') }))
    await user.type(await screen.findByLabelText(t('rb.control.segments.new.name')), 'Quick riders')
    /* The popover's own submit shares its accessible name with the trigger
       that opened it (design's own copy table gives both `rb.control.segments.add`
       and `.new.add` the string "Add segment") — scoped here, flagged in the
       WP-2.6 handoff as a same-name-two-controls defect for content-designer. */
    const popover = screen.getByRole('dialog')
    await user.click(within(popover).getByRole('button', { name: t('rb.control.segments.new.add') }))

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        segments: [{ kind: 'inline', label: 'Quick riders', filters: [], performed: undefined }],
      }),
    )
  })
})
