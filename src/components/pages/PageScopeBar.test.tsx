/**
 * `PageScopeBar` — AC-1187, ported from `dashboard.depth.test.tsx` §2/§4. The
 * range and filter controls are `BoardRangeControl`/`BoardFilterControl`
 * unchanged, so the same contract is proven directly against the component.
 */

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { disableMockLatency, listDimensions, listMeasures, resetDataLayer } from '@/data/clients'
import type { Dimension, Measure } from '@/data/types'
import type { Page } from '@/data/types/page'
import { PageScopeBar } from './PageScopeBar'
import { REPORTS_EN } from '@/screens/reports/copy'

const copy = (key: string) => REPORTS_EN[key] as string

function noopTranslator(key: string, params?: Record<string, string | number>): string {
  const template = REPORTS_EN[key] ?? key
  return Object.entries(params ?? {}).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), template)
}
noopTranslator.plural = (key: string, params: Record<string, string | number>) => noopTranslator(key, params)

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.setPointerCapture = () => {}
    Element.prototype.releasePointerCapture = () => {}
  }
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {}
})

async function catalogue(): Promise<{ measures: Measure[]; dimensions: Dimension[] }> {
  const [m, d] = await Promise.all([listMeasures({ pageSize: 100 }), listDimensions({ pageSize: 100 })])
  return { measures: m.items, dimensions: d.items }
}

function mount(scope: Page['scope'], onChange: (scope: Page['scope']) => void, catalogueData: { measures: Measure[]; dimensions: Dimension[] }) {
  return render(
    <PageScopeBar
      scope={scope}
      onChange={onChange}
      measures={catalogueData.measures}
      dimensions={catalogueData.dimensions}
      editable
      today="2026-06-25"
      t={noopTranslator}
      language="en"
    />,
  )
}

describe('AC-1187 — the range control names the open state, and persists a preset', () => {
  it('shows "Own range" when the page scope carries none, and reports a preset choice', async () => {
    const user = userEvent.setup()
    const cat = await catalogue()
    const onChange = vi.fn()
    mount({ range: null, filters: [] }, onChange, cat)

    const trigger = screen.getByRole('button', { name: copy('rb.dashboard.range') })
    expect(within(trigger).getByText(copy('rb.dashboard.range.own'))).toBeInTheDocument()

    await user.click(trigger)
    await user.click(await screen.findByRole('button', { name: copy('rb.preset.last-7d') }))

    expect(onChange).toHaveBeenCalledWith({ range: { kind: 'preset', preset: 'last-7d' }, filters: [] })
  })

  it('hands the range back to "Own range" on request', async () => {
    const user = userEvent.setup()
    const cat = await catalogue()
    const onChange = vi.fn()
    mount({ range: { kind: 'preset', preset: 'last-7d' }, filters: [] }, onChange, cat)

    await user.click(screen.getByRole('button', { name: copy('rb.dashboard.range') }))
    await user.click(await screen.findByRole('button', { name: copy('rb.dashboard.range.own'), pressed: false }))

    expect(onChange).toHaveBeenCalledWith({ range: null, filters: [] })
  })
})

describe('AC-1187 — Add Filter, in the FilterSpec vocabulary', () => {
  it('adds a chosen field/value as a FilterSpec, and offers the chip a name that opens with the visible text', async () => {
    const user = userEvent.setup()
    const cat = await catalogue()
    const tripKind = cat.dimensions.find((d) => d.key === 'trip.kind')!
    const label = copy(tripKind.labelKey)
    const onChange = vi.fn()
    mount({ range: null, filters: [] }, onChange, cat)

    await user.click(screen.getByRole('button', { name: copy('rb.dashboard.filters.add') }))
    await user.click(screen.getByRole('combobox', { name: copy('rb.dashboard.filters.field') }))
    await user.click(await screen.findByRole('option', { name: label }))
    await user.type(screen.getByLabelText(copy('rb.dashboard.filters.value')), 'quick')
    await user.click(screen.getByRole('button', { name: copy('rb.dashboard.filters.apply') }))

    expect(onChange).toHaveBeenCalledWith({ range: null, filters: [{ field: 'trip.kind', op: 'eq', value: 'quick' }] })
  })

  it('renders a seeded filter as a removable chip, and removing it clears the record', async () => {
    const user = userEvent.setup()
    const cat = await catalogue()
    const tripKind = cat.dimensions.find((d) => d.key === 'trip.kind')!
    const label = copy(tripKind.labelKey)
    const onChange = vi.fn()
    const seeded: Page['scope'] = { range: null, filters: [{ field: 'trip.kind', op: 'eq', value: 'quick' }] }
    mount(seeded, onChange, cat)

    const visible = copy('rb.dashboard.filters.chip').replace('{field}', label).replace('{value}', 'quick')
    const chip = screen.getByRole('button', { name: new RegExp(`^${visible.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) })
    /* SC 2.5.3 Label in Name — the visible text opens the accessible name. */
    expect(chip).toHaveTextContent(visible)

    await user.click(chip)
    expect(onChange).toHaveBeenCalledWith({ range: null, filters: [] })
  })
})
