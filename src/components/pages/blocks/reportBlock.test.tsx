/**
 * `ReportBlockView`'s five states — moved and renamed from
 * `dashboards.test.tsx` / `pinnedShape.test.tsx` (D39). Same two defects
 * those files proved against a dashboard tile, proven here against a
 * `report` block through `useResolvedReport`, the same client seam
 * (`reports.get`/`reports.run`), never a fixture import (AC-1186).
 */

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { disableMockLatency, getReport, listMeasures, listDimensions, localDayOf, mockFailures, resetDataLayer } from '@/data/clients'
import { listPages } from '@/data/clients/pages'
import type { Dimension, Measure } from '@/data/types'
import type { Page, ReportBlock } from '@/data/types/page'
import { PageBlocksProvider, type PageBlocksValue } from '../PageBlocksContext'
import { ReportBlockView } from './ReportBlockView'
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

async function catalogue(): Promise<{ measures: Measure[]; dimensions: Dimension[] }> {
  const [m, d] = await Promise.all([listMeasures({ pageSize: 100 }), listDimensions({ pageSize: 100 })])
  return { measures: m.items, dimensions: d.items }
}

function mountBlock(block: ReportBlock, value: Partial<PageBlocksValue> = {}) {
  return catalogue().then(({ measures, dimensions }) => {
    const full: PageBlocksValue = {
      pageId: 'PAGE-TEST',
      blocks: [block],
      measures,
      dimensions,
      scope: { range: null, filters: [] },
      today: localDayOf(new Date().toISOString()),
      noDataSentence: 'No data.',
      t: noopTranslator as PageBlocksValue['t'],
      language: 'en',
      dir: 'ltr',
      editing: false,
      actions: null,
      onOpenReport: () => {},
      ...value,
    }
    return render(
      <MemoryRouter>
        <PageBlocksProvider value={full}>
          <ReportBlockView block={block} />
        </PageBlocksProvider>
      </MemoryRouter>,
    )
  })
}

async function reportBlockOn(reportId: string): Promise<ReportBlock> {
  return { id: 'blk-1', type: 'report', reportId, view: 'chart', height: 'M', title: null }
}

async function pages(): Promise<Page[]> {
  return (await listPages({ pageSize: 50 })).items
}

describe('content — a resolvable block opens the report it points at', () => {
  it('names the report on a control that opens it', async () => {
    const all = await pages()
    const withReport = all.find((p) => p.blocks.some((b) => b.type === 'report' && !b.reportId.includes('DELETED')))!
    const block = withReport.blocks.find((b) => b.type === 'report' && !b.reportId.includes('DELETED')) as ReportBlock
    const report = (await getReport(block.reportId)).data

    await mountBlock(block)

    /* A real `<button>`, matching `DashboardTile`'s own pattern: it opens the
       report through `onOpenReport` rather than navigating by href. */
    expect(await screen.findByRole('button', { name: report.name })).toBeInTheDocument()
  })
})

describe('a report block that fails to load is not a block that was deleted', () => {
  it('renders the FAILED state with a retry, never the missing sentence', async () => {
    const block = await reportBlockOn('RPT-1')
    mockFailures.always('reports.get')

    await mountBlock(block)

    expect(await screen.findByText(copy('rb.dashboard.tile.error'))).toBeInTheDocument()
    expect(screen.queryByText(copy('rb.dashboard.tile.missing'))).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: copy('rb.dashboard.tile.retry') })).toBeInTheDocument()
  })
})

describe('a genuine 404 is MISSING', () => {
  it('shows the missing sentence and no error', async () => {
    const block = await reportBlockOn('RPT-DOES-NOT-EXIST')

    await mountBlock(block)

    expect(await screen.findByText(copy('rb.dashboard.tile.missing'))).toBeInTheDocument()
    expect(screen.queryByText(copy('rb.dashboard.tile.error'))).not.toBeInTheDocument()
  })
})

describe('loading', () => {
  it('shows a skeleton, not a blank frame, before the fetch resolves', async () => {
    const all = await pages()
    const withReport = all.find((p) => p.blocks.some((b) => b.type === 'report'))!
    const block = withReport.blocks.find((b) => b.type === 'report') as ReportBlock

    const result = await mountBlock(block)

    expect(result.container.querySelector('[data-slot="skeleton"]')).not.toBeNull()
  })
})
