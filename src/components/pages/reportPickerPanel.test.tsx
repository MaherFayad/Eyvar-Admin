/**
 * `ReportPickerPanel` — AC-1204. Search, already-placed reports disabled
 * with a reason, `New report` opens the builder with `?pinTo=`.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { disableMockLatency, getReport, resetDataLayer } from '@/data/clients'
import type { ReportBlock } from '@/data/types/page'
import { PageBlocksProvider, type PageBlocksValue } from './PageBlocksContext'
import { ReportPickerPanel } from './ReportPickerPanel'
import { REPORTS_EN } from '@/screens/reports/copy'
import { PAGES_EN } from '@/screens/pages/copy'

const copy = (key: string) => (REPORTS_EN[key] ?? PAGES_EN[key]) as string

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
})

function noopTranslator(key: string, params?: Record<string, string | number>): string {
  const template = REPORTS_EN[key] ?? PAGES_EN[key] ?? key
  return Object.entries(params ?? {}).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), template)
}
noopTranslator.plural = (key: string, params: Record<string, string | number>) => noopTranslator(key, params)

function mount(placedReportId: string, onCancel: () => void = () => {}) {
  const placed: ReportBlock = { id: 'blk-placed', type: 'report', reportId: placedReportId, view: 'chart', height: 'M', title: null }
  const value: PageBlocksValue = {
    pageId: 'PAGE-TEST',
    blocks: [placed],
    measures: [],
    dimensions: [],
    scope: { range: null, filters: [] },
    today: '2026-06-25',
    noDataSentence: 'No data.',
    t: noopTranslator as PageBlocksValue['t'],
    language: 'en',
    dir: 'ltr',
    editing: true,
    actions: null,
    onOpenReport: () => {},
  }
  return render(
    <MemoryRouter>
      <PageBlocksProvider value={value}>
        <ReportPickerPanel kind="report" onPick={() => {}} onCancel={onCancel} />
      </PageBlocksProvider>
    </MemoryRouter>,
  )
}

describe('AC-1204 — a report already on the page is disabled, with a reason', () => {
  it('disables the placed report’s row and names why', async () => {
    const placed = (await getReport('RPT-4')).data
    mount('RPT-4')

    const row = await screen.findByRole('button', { name: placed.name })
    expect(row).toBeDisabled()
    expect(row).toHaveAccessibleDescription(copy('rb.dashboard.add.already'))
  })

  it('leaves an unplaced report enabled', async () => {
    const other = (await getReport('RPT-2')).data
    mount('RPT-4')

    const row = await screen.findByRole('button', { name: other.name })
    expect(row).toBeEnabled()
  })
})

describe('AC-1204 — New report opens the builder with ?pinTo=', () => {
  it('links New report to the builder carrying this page’s id', () => {
    mount('RPT-4')

    const link = screen.getByRole('link', { name: copy('rb.dashboard.addContent.new') })
    expect(link).toHaveAttribute('href', '/management/reports?q=&pinTo=PAGE-TEST')
  })
})

describe('S1 — the panel closes on Escape, not just via its own Cancel button', () => {
  it('calls onCancel when Escape is pressed anywhere on the page', async () => {
    const onCancel = vi.fn()
    mount('RPT-4', onCancel)
    await screen.findByPlaceholderText(copy('rb.dashboards.search'))

    await userEvent.keyboard('{Escape}')

    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
