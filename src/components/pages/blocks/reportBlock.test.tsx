/**
 * `ReportBlockView`'s five states (D39), proven the same way
 * `dashboards.test.tsx`/`pinnedShape.test.tsx` proved them against a
 * `DashboardTile`: through `useResolvedReport` (AC-1186), never a fixture.
 */

import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { disableMockLatency, getReport, listMeasures, listDimensions, localDayOf, mockFailures, reportQueryPath, resetDataLayer, saveReport } from '@/data/clients'
import { listPages } from '@/data/clients/pages'
import { reportMode, type Dimension, type Measure } from '@/data/types'
import type { Page, ReportBlock } from '@/data/types/page'
import { ReportsScreen } from '@/screens/reports/ReportsScreen'
import { ShellProvider } from '@/shell/ShellContext'
import { PageBlocksProvider, type PageBlocksValue } from '../PageBlocksContext'
import { ReportBlockView } from './ReportBlockView'
import { MetricBlockView } from './MetricBlockView'
import { REPORTS_EN } from '@/screens/reports/copy'
import { PAGES_EN } from '@/screens/pages/copy'
import { PageDetailScreen } from '@/screens/pages/PageDetailScreen'

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

/* Ported from dashboard.chrome.test.tsx / pinnedShape.test.tsx — the frame
   and shape guarantees survive the block rename (D39); only the tile-span
   chrome (§C5) is genuinely gone, replaced by `report.height`. */

function mountPage(pageId: string) {
  return render(
    <MemoryRouter initialEntries={[`/management/reports/pages/${pageId}`]}>
      <ShellProvider>
        <Routes>
          <Route path="/management/reports/pages/:pageId" element={<PageDetailScreen />} />
        </Routes>
      </ShellProvider>
    </MemoryRouter>,
  )
}

function mountBuilder(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider>
        <ReportsScreen />
      </ShellProvider>
    </MemoryRouter>,
  )
}

function headerRow(scope: HTMLElement): string[] {
  const table = scope.querySelector('table')
  if (!table) return []
  return [...table.querySelectorAll('thead th')].map((cell) => (cell.textContent ?? '').replace(/\s+/g, ' ').trim())
}

/* The mode heading, read off `[data-slot="card-title"]` only — the builder's
   own mode toggle carries the same word as a button label. */
function cardTitles(scope: HTMLElement): string[] {
  return [...scope.querySelectorAll('[data-slot="card-title"]')].map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim())
}

describe('a resolvable block shows the report’s current name, not its stored title', () => {
  it('re-titles itself when the report is renamed after it was pinned', async () => {
    const before = (await getReport('RPT-4')).data
    const outcome = await saveReport({
      id: before.id,
      name: 'Renamed after it was pinned',
      description: before.description,
      query: before.query,
      visibility: before.visibility,
    })
    expect(outcome.status).toBe('saved')

    mountPage('DSH-3')

    /* `block.title` (the `pinnedName` successor, migrate.ts) is a fallback for
       the unresolved states only — a resolvable block reads the reference. */
    expect(await screen.findByRole('button', { name: 'Renamed after it was pinned' })).toBeInTheDocument()
    expect(screen.queryByText('New subscriptions by plan')).not.toBeInTheDocument()
  })
})

describe('AC-873 (ported) — a report block draws what the report draws', () => {
  it('gives the block the same header row the builder gives the same report', async () => {
    const report = (await getReport('RPT-7')).data
    const heading = copy(`rb.${reportMode(report.query)}.heading`)

    const builder = mountBuilder(reportQueryPath(report.query))
    await waitFor(() => expect(headerRow(builder.container).length).toBeGreaterThan(0), { timeout: 5000 })
    const inBuilder = headerRow(builder.container)
    expect(cardTitles(builder.container)).toContain(heading)
    builder.unmount()

    const boardRender = mountPage('DSH-3')
    const title = await screen.findByRole('button', { name: report.name })
    const block = title.closest('[data-slot="card"]') as HTMLElement
    await waitFor(() => expect(headerRow(block).length).toBeGreaterThan(0), { timeout: 5000 })

    expect(headerRow(block)).toEqual(inBuilder)
    expect(cardTitles(block)).toContain(heading)
    boardRender.unmount()
  })

  it('draws ONE card frame on a mode-canvas block, exactly as a trend block does', async () => {
    const report = (await getReport('RPT-7')).data
    mountPage('DSH-3')

    const title = await screen.findByRole('button', { name: report.name })
    const block = title.closest('[data-slot="card"]') as HTMLElement
    await waitFor(() => expect(block.querySelector('table')).toBeTruthy(), { timeout: 5000 })

    /* `ReportModeCanvas` takes `framed={false}` for the same reason
       `ResultCanvas` does (`ReportBlockView`'s own comment) — no NESTED card. */
    expect(block.querySelectorAll('[data-slot="card"]').length).toBe(0)
  })
})

describe('AC-1187 — page scope reaches report and metric blocks, and a refused range says so', () => {
  const refusingScope = { range: { kind: 'preset' as const, preset: 'last-7d' as const }, filters: [] }

  it('AC-1187 — a report block under a refused range shows the Own range badge', async () => {
    const block = await reportBlockOn('RPT-7')
    await mountBlock(block, { scope: refusingScope })

    /* A readiness gate only — RPT-7's chart mode also renders a "View"
       button group once content lands, so more than one button is expected. */
    await screen.findAllByRole('button')
    expect(await screen.findByText(copy('rb.dashboard.tile.ownRange'))).toBeInTheDocument()
  })

  it('AC-1187 — a metric block under a refused range shows the Own range badge', async () => {
    const { measures, dimensions } = await catalogue()
    const block = { id: 'blk-m1', type: 'metric' as const, reportId: 'RPT-7', seriesId: null, format: 'value' as const }
    render(
      <MemoryRouter>
        <PageBlocksProvider
          value={{
            pageId: 'PAGE-TEST',
            blocks: [block],
            measures,
            dimensions,
            scope: refusingScope,
            today: localDayOf(new Date().toISOString()),
            noDataSentence: 'No data.',
            t: noopTranslator,
            language: 'en',
            dir: 'ltr',
            editing: false,
            actions: null,
            onOpenReport: () => {},
          }}
        >
          <MetricBlockView block={block} />
        </PageBlocksProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByText(copy('rb.dashboard.tile.ownRange'))).toBeInTheDocument()
  })
})
