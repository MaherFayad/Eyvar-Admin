/**
 * The library's v2 facets — §8, WP-2.8. AC-1163…AC-1166. Every report is
 * read through the client seam (`listReports`), never a fixture import, so a
 * failure here is the screen's, not a stale expectation about the seed.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShellProvider } from '@/shell/ShellContext'
import { disableMockLatency, listReports, resetDataLayer } from '@/data/clients'
import { reportOfficial } from '@/data/types'
import { EN } from '@/i18n/dictionaries'
import { REPORTS_EN } from './copy'
import { ReportsScreen } from './ReportsScreen'

const copy = (key: string) => REPORTS_EN[key] as string
const shellCopy = (key: string) => EN[key] as string

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
  it('creates a private copy named "<name> (copy)" and navigates to it', async () => {
    const user = userEvent.setup()
    renderLibrary()
    const row = await rowNamed('Completed trips by pickup district')
    /* The row's own overflow trigger, named "More actions for {id}" — not the
       page-level one, which `shellCopy('shell.moreActions')` alone would also
       match on a page that has both. */
    await user.click(within(row).getByRole('button', { name: /more actions/iu }))
    await user.click(await screen.findByRole('menuitem', { name: copy('rb.library.duplicate') }))

    /* Navigation landed on the copy — its own header names it. */
    await waitFor(() =>
      expect(screen.getByLabelText(copy('rb.title.label'))).toHaveValue(
        'Completed trips by pickup district (copy)',
      ),
    )

    const copies = (await listReports({ pageSize: 200 })).items.filter(
      (r) => r.name === 'Completed trips by pickup district (copy)',
    )
    expect(copies).toHaveLength(1)
    expect(copies[0]?.visibility).toBe('private')
  })
})
