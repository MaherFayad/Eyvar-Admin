/**
 * One page — moved and renamed from `dashboards.test.tsx` /
 * `dashboard.chrome.test.tsx` (D39). Proves the same two defects against a
 * `report` block that those files proved against a dashboard tile: a
 * transient failure is FAILED, not MISSING, and one dangling block does not
 * fail the page (AC-1194). AC-1195, AC-1210 and AC-1193 ride along.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShellProvider } from '@/shell/ShellContext'
import { disableMockLatency, getReport, mockFailures, resetDataLayer } from '@/data/clients'
import { listPages, savePage } from '@/data/clients/pages'
import type { Page } from '@/data/types/page'
import { PageDetailScreen } from './PageDetailScreen'
import { DashboardDetailScreen } from '@/screens/reports/DashboardDetailScreen'
import { REPORTS_EN } from '@/screens/reports/copy'
import { PAGES_EN } from './copy'

const copy = (key: string) => (REPORTS_EN[key] ?? PAGES_EN[key]) as string

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

function mount(pageId: string) {
  return render(
    <MemoryRouter initialEntries={[`/management/reports/pages/${pageId}`]}>
      <ShellProvider>
        <Routes>
          <Route path="/management/reports/pages/:pageId" element={<PageDetailScreen />} />
          <Route path="/management/reports" element={<p>the pages list</p>} />
        </Routes>
      </ShellProvider>
    </MemoryRouter>,
  )
}

async function pages(): Promise<Page[]> {
  return (await listPages({ pageSize: 50 })).items
}

/** A migrated page holding at least one resolvable `report` block. */
async function healthyPage(): Promise<Page> {
  const all = await pages()
  const found = all.find(
    (page) =>
      page.blocks.some((b) => b.type === 'report') &&
      !page.blocks.some((b) => b.type === 'report' && b.reportId.includes('DELETED')),
  )
  expect(found, 'a page with a resolvable report block').toBeTruthy()
  return found as Page
}

describe('a report block that fails to load is not a block that was deleted', () => {
  it('renders the failed state with its retry, never the missing sentence', async () => {
    const page = await healthyPage()
    mockFailures.always('reports.get')

    mount(page.id)

    expect(await screen.findByText(copy('rb.dashboard.tile.error'))).toBeInTheDocument()
    expect(screen.queryByText(copy('rb.dashboard.tile.missing'))).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: copy('rb.dashboard.tile.retry') })).toBeInTheDocument()
  })
})

describe('a dangling report reference is MISSING, and does not fail the page', () => {
  it('shows the missing sentence for the dangling block and renders the live one beside it', async () => {
    const all = await pages()
    const mixed = all.find(
      (page) =>
        page.blocks.some((b) => b.type === 'report' && b.reportId.includes('DELETED')) &&
        page.blocks.some((b) => b.type === 'report' && !b.reportId.includes('DELETED')),
    )
    expect(mixed, 'a page with one dangling report block and one live one').toBeTruthy()
    const live = (mixed as Page).blocks.find((b) => b.type === 'report' && !b.reportId.includes('DELETED'))
    const liveReport = await getReport((live as { reportId: string }).reportId)

    mount((mixed as Page).id)

    expect(await screen.findByText(copy('rb.dashboard.tile.missing'))).toBeInTheDocument()
    expect(screen.getByRole('link', { name: liveReport.data.name })).toBeInTheDocument()
  })
})

describe('a page with no blocks — the second kind of empty (AC-1193)', () => {
  it('shows one grey sentence rather than the first-run illustration', async () => {
    const outcome = await savePage({
      id: null,
      kind: 'note',
      title: 'Empty page',
      icon: null,
      description: null,
      visibility: 'private',
      tags: [],
      scope: { range: null, filters: [] },
      blocks: [],
    })
    expect(outcome.status).toBe('saved')
    if (outcome.status !== 'saved') return

    mount(outcome.page.id)

    expect(await screen.findByText(copy('pg.page.empty'))).toBeInTheDocument()
  })
})

describe('Edit / Done — AC-1195', () => {
  it('shows Edit for the owner and swaps to Done in edit mode', async () => {
    const page = await healthyPage()
    mount(page.id)

    const editButton = await screen.findByRole('button', { name: copy('pg.edit.enter') })
    await userEvent.click(editButton)
    expect(await screen.findByRole('button', { name: copy('pg.edit.done') })).toBeInTheDocument()
  })
})

describe('D46 — the dashboard route redirects to the page route (AC-1210)', () => {
  it('lands on the same record under /pages/:pageId', async () => {
    const page = await healthyPage()
    render(
      <MemoryRouter initialEntries={[`/management/reports/dashboards/${page.id}`]}>
        <ShellProvider>
          <Routes>
            <Route path="/management/reports/dashboards/:dashboardId" element={<DashboardDetailScreen />} />
            <Route path="/management/reports/pages/:pageId" element={<PageDetailScreen />} />
          </Routes>
        </ShellProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('button', { name: copy('pg.edit.enter') })).toBeInTheDocument()
  })
})
