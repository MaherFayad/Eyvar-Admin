/**
 * **N-2 — one saved report, one shape, on both surfaces.**
 *
 * `ReportBuilder` routes on `isSeriesMode`: a trend and a data table get
 * `ResultCanvas`, and the funnel cascade, the retention matrix and the journey
 * tree get `ReportModeCanvas`. `DashboardTile` called `ResultCanvas`
 * unconditionally, so `RPT-7` — *Rider retention by joining month* — was a
 * cohort matrix at `/management/reports/RPT-7` and a flat series table with
 * four identically-labelled rows on the board that pinned it. Nothing said the
 * picture had changed, and the tile's own AC-873 note asserted the opposite.
 *
 * ## Two disciplines, both borrowed from `reports.mode.test.tsx`
 *
 * **Through a real pin, not through the component.** Rendering `<DashboardTile>`
 * with hand-made props would prove the branch and nothing else — the defect was
 * in what a BOARD does, so the board is mounted at its route and the tile is
 * found by the report's name. The pin itself is discovered through
 * `getDashboard` rather than named here, so a fixture that moves the cohort to
 * another board makes this test find it rather than fail.
 *
 * **No fixture import, no spy.** `seam.test.ts` forbids the first outside
 * `src/data`; the second passes vacuously on a negative assertion.
 */

import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShellProvider } from '@/shell/ShellContext'
import {
  disableMockLatency,
  getDashboard,
  getReport,
  listDashboards,
  reportQueryPath,
  resetDataLayer,
} from '@/data/clients'
import { reportMode, type Dashboard, type SavedReport } from '@/data/types'
import { isSeriesMode } from '@/screens/reports/ReportBuilder'
import { DashboardDetailScreen } from '@/screens/reports/DashboardDetailScreen'
import { ReportsScreen } from '@/screens/reports/ReportsScreen'
import { REPORTS_EN } from '@/screens/reports/copy'

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  /* jsdom implements neither and Radix's select, popover and dropdown all call
     them on the trigger. Kept local, exactly as every other file here. */
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.setPointerCapture = () => {}
    Element.prototype.releasePointerCapture = () => {}
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }
})

const copy = (key: string) => REPORTS_EN[key] as string

/**
 * The first tile on any board whose report is NOT a series mode, read through
 * the clients. `null` would mean the fixtures stopped pinning one, which is a
 * fact this file states rather than a pass it hides.
 */
async function firstPinnedModeReport(): Promise<{
  board: Dashboard
  report: SavedReport
} | null> {
  const boards = (await listDashboards({ pageSize: 50 })).items
  for (const listed of boards) {
    const board = (await getDashboard(listed.id)).data
    for (const tile of board.tiles) {
      const report = await getReport(tile.reportId)
        .then((r) => r.data)
        .catch(() => null)
      if (report && !isSeriesMode(reportMode(report.query))) return { board, report }
    }
  }
  return null
}

function mountBoard(dashboardId: string) {
  return render(
    <MemoryRouter initialEntries={[`/management/reports/dashboards/${dashboardId}`]}>
      <ShellProvider>
        <Routes>
          <Route
            path="/management/reports/dashboards/:dashboardId"
            element={<DashboardDetailScreen />}
          />
          <Route path="/management/reports" element={<p>the reports sub-tab</p>} />
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

/**
 * The column headers of a result table, in document order.
 *
 * **This is the shape assertion.** A cohort matrix's header row is the cohort
 * column, the cohort size and one column per elapsed interval; a series table's
 * is the series column and one column per bucket. Neither can be mistaken for
 * the other, and neither can be produced by the component that draws the other.
 */
function headerRow(scope: HTMLElement): string[] {
  const table = scope.querySelector('table')
  if (!table) return []
  return [...table.querySelectorAll('thead th')].map((cell) =>
    (cell.textContent ?? '').replace(/\s+/g, ' ').trim(),
  )
}

/**
 * Every card title in a subtree.
 *
 * The mode heading is read off these rather than matched as text: a tile's
 * corner meta names the mode too, and the builder's rail carries it as the
 * label of a button in the Question strip — a bare `getByText` passes on both.
 */
function cardTitles(scope: HTMLElement): string[] {
  return [...scope.querySelectorAll('[data-slot="card-title"]')].map((node) =>
    (node.textContent ?? '').replace(/\s+/g, ' ').trim(),
  )
}

describe('AC-873 — a pinned report draws what the report draws', () => {
  it('gives a board tile the same header row the builder gives the same report', async () => {
    const pinned = await firstPinnedModeReport()
    expect(pinned, 'the fixtures pin at least one non-series report to a board').not.toBeNull()
    const { board, report } = pinned!
    const heading = copy(`rb.${reportMode(report.query)}.heading`)

    /* ── the builder, opened on the report's own question ───────────────── */
    const builder = mountBuilder(reportQueryPath(report.query))
    await waitFor(() => expect(headerRow(builder.container).length).toBeGreaterThan(0), {
      timeout: 5000,
    })
    const inBuilder = headerRow(builder.container)
    expect(cardTitles(builder.container)).toContain(heading)
    builder.unmount()

    /* ── the same report, reached through the pin ───────────────────────── */
    const boardRender = mountBoard(board.id)
    /* Found by the report's CURRENT name, which is what a tile renders for a
       reference that resolves. `pinnedName` is the stale one, and finding by it
       would pass on a broken tile. */
    const title = await screen.findByRole('button', {
      name: copy('rb.dashboard.tile.open').replace('{name}', report.name),
    })
    const tile = title.closest('[data-slot="card"]') as HTMLElement
    expect(tile).toBeTruthy()
    await waitFor(() => expect(headerRow(tile).length).toBeGreaterThan(0), { timeout: 5000 })

    expect(headerRow(tile)).toEqual(inBuilder)
    expect(cardTitles(tile)).toContain(heading)
    boardRender.unmount()
  })

  it('draws ONE card frame on a mode tile, exactly as a series tile does', async () => {
    const pinned = await firstPinnedModeReport()
    const { board, report } = pinned!
    const boardRender = mountBoard(board.id)

    const title = await screen.findByRole('button', {
      name: copy('rb.dashboard.tile.open').replace('{name}', report.name),
    })
    const tile = title.closest('[data-slot="card"]') as HTMLElement
    await waitFor(() => expect(tile.querySelector('table')).toBeTruthy(), { timeout: 5000 })

    /* A tile is one surface (§C5). `ResultCanvas` has taken `framed` since the
       board stopped drawing two hairlines round every panel; the mode canvas
       takes it for the same reason and the same caller, and this counts the
       consequence rather than trusting the prop. Measured in Chromium on
       `DSH-3` before the prop existed: two `[data-slot="card"]` boxes with a
       1px border each, against a trend tile's one. */
    expect(tile.querySelectorAll('[data-slot="card"]').length).toBe(0)
    boardRender.unmount()
  })
})
