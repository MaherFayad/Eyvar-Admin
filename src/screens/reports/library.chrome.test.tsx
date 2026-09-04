/**
 * The saved-report library's chrome, against T9.13. Every assertion is about a
 * pair: a column exists AND narrows, `Visibility` reads AND carries no fill,
 * the row is a name AND its kind is somewhere an operator can filter on. Read
 * through the client seam, never out of a fixture module (`seam.test.ts`).
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShellProvider } from '@/shell/ShellContext'
import {
  disableMockLatency,
  listReports,
  listTeamUsers,
  resetDataLayer,
} from '@/data/clients'
import type { SavedReport } from '@/data/types'
import { REPORTS_EN } from './copy'
import { ReportsScreen } from './ReportsScreen'

const EN = (key: string) => REPORTS_EN[key] as string

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  /* jsdom implements neither, and Radix's select, menu and dialog all call
     them on the trigger. The same stubs the sibling reports suites carry. */
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

async function savedReports(): Promise<readonly SavedReport[]> {
  return (await listReports({ pageSize: 100 })).items
}

async function rowNamed(name: string): Promise<HTMLElement> {
  const rows = await screen.findAllByRole('row')
  const row = rows.find((candidate) => within(candidate).queryByText(name))
  expect(row, `no row named ${name}`).toBeDefined()
  return row as HTMLElement
}

/** The index of the column with this header, so a cell is read by column. */
async function columnIndex(header: string): Promise<number> {
  const table = await screen.findByRole('table')
  const headers = within(table).getAllByRole('columnheader')
  const index = headers.findIndex((cell) => cell.textContent?.includes(header))
  expect(index, `no column headed ${header}`).toBeGreaterThan(-1)
  return index
}

describe('T9.13 — the library reads as Amplitude’s, not as prose', () => {
  it('draws Type, Owner and Last run as their own columns', async () => {
    renderLibrary()
    await screen.findByRole('table')

    for (const key of [
      'rb.library.col.type',
      'rb.library.col.owner',
      'rb.library.col.lastRun',
    ]) {
      expect(
        await screen.findByRole('columnheader', { name: new RegExp(EN(key)) }),
      ).toBeInTheDocument()
    }
  })

  it('names the report’s owner rather than printing the id', async () => {
    const reports = await savedReports()
    const team = await listTeamUsers()
    const report = reports.find((row) => team.some((user) => user.id === row.ownerId))
    expect(report, 'no seeded report with a known owner').toBeDefined()
    const owner = team.find((user) => user.id === report!.ownerId)!

    renderLibrary()
    const index = await columnIndex(EN('rb.library.col.owner'))
    const row = await rowNamed(report!.name)
    await waitFor(() =>
      expect(within(row).getAllByRole('cell')[index]!.textContent).toBe(owner.name),
    )
  })

  it('O9 — leaves Last run blank on a report nobody has run', async () => {
    const reports = await savedReports()
    const never = reports.filter((row) => row.lastRunAt === null)
    expect(never.length).toBeGreaterThan(0)

    renderLibrary()
    const index = await columnIndex(EN('rb.library.col.lastRun'))
    for (const report of never) {
      const row = await rowNamed(report.name)
      expect(within(row).getAllByRole('cell')[index]!.textContent).toBe('')
    }
  })

  it('H7 — Visibility is muted text on every row, and carries no badge fill', async () => {
    const reports = await savedReports()
    expect(reports.length).toBeGreaterThan(0)

    renderLibrary()
    const index = await columnIndex(EN('rb.library.col.visibility'))
    const row = await rowNamed(reports[0]!.name)
    const cell = within(row).getAllByRole('cell')[index] as HTMLElement
    expect(cell.textContent).toBe(EN(`rb.save.visibility.${reports[0]!.visibility}`))
    /* A property, not a state: six of seven rows carried the same fill, which
       is a badge nobody reads. */
    expect(cell.querySelector('[data-slot="badge"]')).toBeNull()
    expect(cell.querySelector('.bg-info')).toBeNull()
  })

  it('narrows the list through the Type filter, not through the row glyph alone', async () => {
    const user = userEvent.setup()
    const reports = await savedReports()
    const kinds = [...new Set(reports.map((row) => row.query.chartType))]
    expect(kinds.length).toBeGreaterThan(1)
    const kind = kinds[0]!
    const wanted = reports.filter((row) => row.query.chartType === kind)

    renderLibrary()
    const table = await screen.findByRole('table')
    const header = within(table)
      .getAllByRole('columnheader')
      .find((cell) => cell.textContent?.includes(EN('rb.library.col.type')))!

    await user.click(within(header).getByRole('button'))
    await user.click(await screen.findByRole('menuitem', { name: EN(`rb.chartType.${kind}`) }))

    await waitFor(() =>
      expect(screen.getAllByRole('row').length - 1).toBe(wanted.length),
    )
    for (const report of wanted) expect(await rowNamed(report.name)).toBeTruthy()
  })
})
