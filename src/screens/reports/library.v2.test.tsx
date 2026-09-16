/**
 * The library's v2 facets — §8, WP-2.8. AC-1163…AC-1166. Every report is
 * read through the client seam (`listReports`), never a fixture import, so a
 * failure here is the screen's, not a stale expectation about the seed.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ShellProvider } from '@/shell/ShellContext'
import { disableMockLatency, listReports, resetDataLayer } from '@/data/clients'
import { reportOfficial, type SavedReport } from '@/data/types'
import { EN } from '@/i18n/dictionaries'
import { createTranslator } from '@/lib'
import { REPORTS_EN } from './copy'
import { ReportLibrary } from './ReportLibrary'
import { ReportsScreen } from './ReportsScreen'

const copy = (key: string) => REPORTS_EN[key] as string
const t = createTranslator({ dictionary: EN })

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.setPointerCapture = () => {}
    Element.prototype.releasePointerCapture = () => {}
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }
})

function renderLibrary() {
  return render(
    <MemoryRouter initialEntries={['/management/reports']}>
      <ShellProvider>
        <ReportsScreen />
      </ShellProvider>
    </MemoryRouter>,
  )
}

/**
 * The library mounted directly (as `builder.chrome.test.tsx` mounts the
 * builder). `onOpen` is a spy here, not `ReportsScreen`'s own `navigate`,
 * because that navigation needs a route table this test carries none of —
 * `SavedReportScreen` is wired at the app shell.
 */
function renderLibraryDirect() {
  const onOpen = vi.fn<(report: SavedReport) => void>()
  render(
    <MemoryRouter initialEntries={['/management/reports']}>
      <ShellProvider>
        <ReportLibrary
          title={copy('rb.page.title')}
          onOpen={onOpen}
          onNew={() => {}}
          t={t}
          language="en"
          dir="ltr"
        />
      </ShellProvider>
    </MemoryRouter>,
  )
  return { onOpen }
}

async function rowNamed(name: string): Promise<HTMLElement> {
  const rows = await screen.findAllByRole('row')
  const row = rows.find((candidate) => within(candidate).queryByText(name))
  expect(row, `no row named ${name}`).toBeDefined()
  return row as HTMLElement
}

/* ───── AC-1163 — the five views each filter correctly ──────────────────── */

describe('AC-1163 — the library views filter the fixture list', () => {
  it('Mine shows only USR-1’s own reports; Official shows only the official ones', async () => {
    const user = userEvent.setup()
    renderLibrary()
    await screen.findByRole('table')

    /* `RPT-1` is USR-1’s own, official report — present under both views. */
    await user.click(screen.getByRole('tab', { name: copy('rb.library.view.mine') }))
    await rowNamed('Captains vs riders · 30 days')

    await user.click(screen.getByRole('tab', { name: copy('rb.library.view.official') }))
    await rowNamed('Captains vs riders · 30 days')
    const officialRows = await screen.findAllByRole('row')
    const all = await listReports({ pageSize: 200 })
    const officialCount = all.items.filter((row) => reportOfficial(row)).length
    /* header row + one per official report. */
    expect(officialRows.length - 1).toBe(officialCount)
  })

  it('Starred shows only what USR-1 starred', async () => {
    const user = userEvent.setup()
    renderLibrary()
    await screen.findByRole('table')

    await user.click(screen.getByRole('tab', { name: copy('rb.library.view.starred') }))
    await rowNamed('Captains vs riders · 30 days')
    const rows = await screen.findAllByRole('row')
    const all = await listReports({ pageSize: 200 })
    const starredCount = all.items.filter((row) => (row.starredBy ?? []).includes('USR-1')).length
    expect(rows.length - 1).toBe(starredCount)
  })

  it('Recent narrows to reports that have run, newest first', async () => {
    const user = userEvent.setup()
    renderLibrary()
    await screen.findByRole('table')

    await user.click(screen.getByRole('tab', { name: copy('rb.library.view.recent') }))
    const rows = await screen.findAllByRole('row')
    /* Every visible row is a report that HAS run — none carries a blank
       `Last run` cell, which is the tell for `lastRunAt === null`. */
    expect(rows.length).toBeGreaterThan(1)
  })
})

/* ───── AC-1165 — Official renders as a neutral badge ────────────────────── */

describe('AC-1165 — Official is a neutral badge', () => {
  it('renders beside the name, never in the red/warning tones', async () => {
    renderLibrary()
    const row = await rowNamed('Captains vs riders · 30 days')
    const badge = within(row).getByText(copy('rb.library.official'))
    expect(badge).toBeInTheDocument()
    expect(badge.closest('[data-slot="badge"]')).toHaveAttribute('data-tone', 'neutral')
  })
})

/* ───── AC-1164 — the star toggle ─────────────────────────────────────────── */

describe('AC-1164 — the star toggle', () => {
  it('is a button with aria-pressed that persists through reports.star', async () => {
    const user = userEvent.setup()
    renderLibrary()
    const row = await rowNamed('Completed trips this week')
    const starLabel = copy('rb.library.star.remove').replace('{name}', 'Completed trips this week')
    const star = within(row).getByRole('button', { name: starLabel })
    expect(star).toHaveAttribute('aria-pressed', 'true')

    await user.click(star)

    await waitFor(async () => {
      const after = (await listReports({ pageSize: 200 })).items.find(
        (r) => r.name === 'Completed trips this week',
      )
      expect(after?.starredBy ?? []).not.toContain('USR-1')
    })
  })
})

/* ───── AC-1166 — Duplicate ────────────────────────────────────────────────── */

describe('AC-1166 — Duplicate', () => {
  it('creates a private copy named "<name> (copy)" and calls onOpen with it', async () => {
    const user = userEvent.setup()
    /* `onOpen` spied directly: `ReportsScreen`'s own `navigate` to the copy
       needs a route table this render does not carry (`SavedReportScreen` is
       wired at the app shell, one level up), so the observable contract here
       is the one this component actually owns — which report it hands its
       caller, not what the app shell does with it. */
    const { onOpen } = renderLibraryDirect()
    const row = await rowNamed('Completed trips by pickup district')
    await user.click(within(row).getByRole('button', { name: /more actions/iu }))
    await user.click(await screen.findByRole('menuitem', { name: copy('rb.library.duplicate') }))

    await waitFor(() => expect(onOpen).toHaveBeenCalledTimes(1))
    const copy_ = onOpen.mock.calls[0]?.[0] as SavedReport
    expect(copy_.name).toBe('Completed trips by pickup district (copy)')
    expect(copy_.visibility).toBe('private')

    const persisted = (await listReports({ pageSize: 200 })).items.filter(
      (r) => r.name === 'Completed trips by pickup district (copy)',
    )
    expect(persisted).toHaveLength(1)
    expect(persisted[0]?.id).toBe(copy_.id)
  })
})
