/**
 * `ComparisonControl`/`ComparisonDisplayToggle` — §1.4/§1.5. AC-1109 (presets
 * flow through `REPORT_PRESETS`), AC-1112/AC-1157 (fixed comparison states
 * its length before `Apply`), AC-1158 (offers previous-quarter/year, fixed,
 * and the display choice).
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EN } from '@/i18n/dictionaries'
import { createTranslator } from '@/lib'
import { REPORT_PRESETS } from '@/data/clients/reports'
import type { ReportQuery } from '@/data/types'
import { ComparisonControl, ComparisonDisplayToggle, WindowControl } from './WindowControl'

const t = createTranslator({ dictionary: EN })
const TODAY = '2026-09-11'

beforeEach(() => {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.setPointerCapture = () => {}
    Element.prototype.releasePointerCapture = () => {}
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }
})

const BASE: ReportQuery = {
  measures: [{ key: 'trips.completed' }],
  groupBy: [],
  filters: [],
  window: { kind: 'absolute', from: '2026-08-01', to: '2026-08-31' },
  grain: 'day',
  periodComparison: 'none',
  chartType: 'line',
}

describe('the window popover — §2.7 presets', () => {
  it('AC-1109 / AC-1158 — lists all thirteen presets, including the four new ones', async () => {
    const user = userEvent.setup()
    render(<WindowControl query={BASE} onChange={() => {}} today={TODAY} t={t} language="en" />)
    /* The trigger's accessible name is the associated `<Label for>`, `rb.control.window` —
       its own two-line content is what a sighted operator reads, not what AT announces. */
    await user.click(screen.getByRole('button', { name: t('rb.control.window') }))
    for (const preset of REPORT_PRESETS) {
      expect(screen.getByRole('button', { name: t(`rb.preset.${preset}`) })).toBeInTheDocument()
    }
    for (const key of ['this-quarter', 'last-quarter', 'this-year', 'year-to-date']) {
      expect(screen.getByRole('button', { name: t(`rb.preset.${key}`) })).toBeInTheDocument()
    }
  })
})

describe('ComparisonControl', () => {
  it('AC-1158 — offers previous period, previous quarter, previous year and a fixed row', async () => {
    const user = userEvent.setup()
    render(<ComparisonControl query={BASE} onChange={() => {}} today={TODAY} t={t} language="en" />)
    await user.click(screen.getByRole('combobox', { name: t('rb.control.compare') }))
    const listbox = await screen.findByRole('listbox')
    for (const key of ['previous-period', 'previous-quarter', 'previous-year']) {
      expect(screen.getByRole('option', { name: t(`rb.compare.${key}`) })).toBeInTheDocument()
    }
    expect(listbox).toBeInTheDocument()
  })

  it('picking a plain comparison writes the query immediately', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ComparisonControl query={BASE} onChange={onChange} today={TODAY} t={t} language="en" />)
    await user.click(screen.getByRole('combobox', { name: t('rb.control.compare') }))
    await user.click(screen.getByRole('option', { name: t('rb.compare.previous-quarter') }))
    expect(onChange).toHaveBeenCalledWith({ ...BASE, periodComparison: 'previous-quarter' })
  })

  it('AC-1112 / AC-1157 — `Fixed range…` opens a popover instead of committing, and Apply is off on an illegal range', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ComparisonControl query={BASE} onChange={onChange} today={TODAY} t={t} language="en" />)
    await user.click(screen.getByRole('combobox', { name: t('rb.control.compare') }))
    await user.click(screen.getByRole('option', { name: /Fixed range/ }))
    await screen.findByText(t('rb.control.window.fixedCompare.heading'))

    /* Non-committing: the query has not changed. */
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: t('rb.control.window.apply') })).toBeDisabled()
  })

  it('AC-1112 / AC-1157 — a wrong-length fixed range states the required bucket count before Apply', async () => {
    const user = userEvent.setup()
    render(<ComparisonControl query={BASE} onChange={() => {}} today={TODAY} t={t} language="en" />)
    await user.click(screen.getByRole('combobox', { name: t('rb.control.compare') }))
    await user.click(screen.getByRole('option', { name: /Fixed range/ }))
    await screen.findByText(t('rb.control.window.fixedCompare.heading'))

    /* The primary window is 31 days (1–31 Aug); a 5-day fixed range mismatches. */
    await user.type(screen.getByLabelText(t('rb.control.window.from')), '2026-07-01')
    await user.type(screen.getByLabelText(t('rb.control.window.to')), '2026-07-05')

    expect(screen.getByText(t('rb.control.window.fixedCompare.length', { count: 31 }))).toBeInTheDocument()
    /* Legal (from <= to) but wrong length: `Apply` is enabled per §1.4's own state table — the
       mismatch is visible BEFORE commit, not blocked. */
    expect(screen.getByRole('button', { name: t('rb.control.window.apply') })).toBeEnabled()
  })

  it('Applying a fixed range writes `{ kind: "fixed", from, to }`', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ComparisonControl query={BASE} onChange={onChange} today={TODAY} t={t} language="en" />)
    await user.click(screen.getByRole('combobox', { name: t('rb.control.compare') }))
    await user.click(screen.getByRole('option', { name: /Fixed range/ }))
    await screen.findByText(t('rb.control.window.fixedCompare.heading'))

    await user.type(screen.getByLabelText(t('rb.control.window.from')), '2026-07-01')
    await user.type(screen.getByLabelText(t('rb.control.window.to')), '2026-07-31')
    await user.click(screen.getByRole('button', { name: t('rb.control.window.apply') }))

    expect(onChange).toHaveBeenCalledWith({
      ...BASE,
      periodComparison: { kind: 'fixed', from: '2026-07-01', to: '2026-07-31' },
    })
  })

  it('Cancel abandons the draft without writing the query', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ComparisonControl query={BASE} onChange={onChange} today={TODAY} t={t} language="en" />)
    await user.click(screen.getByRole('combobox', { name: t('rb.control.compare') }))
    await user.click(screen.getByRole('option', { name: /Fixed range/ }))
    await screen.findByText(t('rb.control.window.fixedCompare.heading'))
    await user.type(screen.getByLabelText(t('rb.control.window.from')), '2026-07-01')
    await user.click(screen.getByRole('button', { name: t('rb.control.window.cancel') }))

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.queryByText(t('rb.control.window.fixedCompare.heading'))).toBeNull()
  })
})

describe('ComparisonDisplayToggle', () => {
  it('offers Series, Difference and % change', async () => {
    const user = userEvent.setup()
    render(<ComparisonDisplayToggle query={BASE} onChange={() => {}} t={t} />)
    await user.click(screen.getByRole('combobox', { name: t('rb.control.comparisonDisplay') }))
    expect(screen.getByRole('option', { name: t('rb.comparisonDisplay.series') })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: t('rb.comparisonDisplay.difference') })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: t('rb.comparisonDisplay.percentChange') })).toBeInTheDocument()
  })

  it('writes `comparisonDisplay` on the query, and only that', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ComparisonDisplayToggle query={BASE} onChange={onChange} t={t} />)
    await user.click(screen.getByRole('combobox', { name: t('rb.control.comparisonDisplay') }))
    await user.click(screen.getByRole('option', { name: t('rb.comparisonDisplay.difference') }))
    expect(onChange).toHaveBeenCalledWith({ ...BASE, comparisonDisplay: 'difference' })
  })
})
