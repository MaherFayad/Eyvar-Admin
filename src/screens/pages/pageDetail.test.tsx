/**
 * `PageDetailScreen` — moved and renamed from `dashboards.test.tsx` (D39).
 * The report block's own five states are proven at the component level in
 * `src/components/pages/blocks/reportBlock.test.tsx`; this file proves the
 * page-level surface around it: AC-1193 (empty page), AC-1195 (Edit/Done)
 * and AC-1210 (the dashboard redirect).
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShellProvider } from '@/shell/ShellContext'
import { disableMockLatency, resetDataLayer } from '@/data/clients'
import { listPages, savePage } from '@/data/clients/pages'
import type { Page } from '@/data/types/page'
import { PageDetailScreen } from './PageDetailScreen'
import { DashboardDetailScreen } from '@/screens/reports/DashboardDetailScreen'
import { PAGES_EN } from './copy'

const copy = (key: string) => PAGES_EN[key] as string

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
    const all = await pages()
    const page = all[0]!
    mount(page.id)

    const editButton = await screen.findByRole('button', { name: copy('pg.edit.enter') })
    await userEvent.click(editButton)
    expect(await screen.findByRole('button', { name: copy('pg.edit.done') })).toBeInTheDocument()
  })
})

describe('D46 — the dashboard route redirects to the page route (AC-1210)', () => {
  it('lands on the same record under /pages/:pageId', async () => {
    const all = await pages()
    const page = all[0]!
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
