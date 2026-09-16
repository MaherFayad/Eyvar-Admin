/**
 * `PageDetailScreen` (D39). The report block's five states are proven in
 * `blocks/reportBlock.test.tsx`; this file proves the page-level surface:
 * AC-1193 (empty page), AC-1195 (Edit/Done), AC-1210 (dashboard redirect).
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShellProvider } from '@/shell/ShellContext'
import { disableMockLatency, resetDataLayer } from '@/data/clients'
import { listPages, savePage } from '@/data/clients/pages'
import type { Page } from '@/data/types/page'
import { PageDetailScreen } from './PageDetailScreen'
import { DashboardDetailScreen } from '@/screens/reports/DashboardDetailScreen'
import { PAGES_EN } from './copy'
import { REPORTS_EN } from '@/screens/reports/copy'

const copy = (key: string) => PAGES_EN[key] as string
const reportsCopy = (key: string) => REPORTS_EN[key] as string

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

function LocationProbe() {
  const location = useLocation()
  return <span data-testid="location">{`${location.pathname}${location.search}`}</span>
}

function mountWithLocationProbe(pageId: string) {
  return render(
    <MemoryRouter initialEntries={[`/management/reports/pages/${pageId}`]}>
      <ShellProvider>
        <Routes>
          <Route path="/management/reports/pages/:pageId" element={<PageDetailScreen />} />
          <Route path="/management/reports" element={<p>the pages list</p>} />
        </Routes>
        <LocationProbe />
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

describe('AC-1262 — Ask the analyst about this page, prefilled', () => {
  it('hands this page over as context', async () => {
    const user = userEvent.setup()
    const all = await pages()
    const page = all[0]!
    mountWithLocationProbe(page.id)

    await screen.findByRole('button', { name: copy('pg.edit.enter') })
    /* A `secondaryActions` entry, inline — never pushes `Duplicate`/`Delete`
       into the disclosure menu (D8-b, `PageHeader.tsx`). */
    await user.click(screen.getByRole('button', { name: reportsCopy('rb.overflow.ask') }))

    const location = await screen.findByTestId('location')
    const search = new URLSearchParams(location.textContent!.split('?')[1])
    expect(search.get('view')).toBe('analyst')
    expect(search.get('askKind')).toBe('page')
    expect(search.get('askId')).toBe(page.id)
    expect(search.get('askLabel')).toBe(page.title)
  })
})
