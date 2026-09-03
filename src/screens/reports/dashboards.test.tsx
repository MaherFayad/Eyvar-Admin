/**
 * Dashboards — AC-865 … AC-873, and the two defects the parity audit found
 * inside them.
 *
 * ## The two defects, as tests an operator's behaviour can be read off
 *
 * **A transient failure must not read as "this report was deleted."** `load`
 * used to `.catch(() => null)` every `reports.get` failure, so a blip, a 403 on
 * a private report and a query invalidated by a catalogue change all rendered
 * §11.3's missing sentence — whose only action is `Remove tile`. The first
 * block below rigs `reports.get` to fail with a 503 and asserts the tile
 * renders the FAILED state with its retry and **not** the missing sentence.
 * Nothing here spies: `mockFailures` is the seam, and a bare `vi.spyOn` on a
 * client namespace does not intercept the barrel's live binding — a positive
 * assertion fails loudly and a negative one passes vacuously.
 *
 * **A healthy tile could not be removed.** `onRemove` reached the UI only from
 * the missing branch, so pinning was one-way: the only ways off a board were to
 * delete the report (which §11.3 refuses) or to delete the board. The second
 * block removes a resolvable tile through the tile's own overflow and then
 * **reads the record back through the client**, because a row that disappeared
 * from the screen and not from the server is the failure worth catching.
 *
 * ## No fixture is imported
 *
 * `seam.test.ts` forbids it outside `src/data`, and a test that reads the seed
 * array is testing the seed rather than the contract. Every dashboard and every
 * report below is read through its client.
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { Toaster } from '@/components/ui/sonner'
import { ShellProvider } from '@/shell/ShellContext'
import {
  disableMockLatency,
  getDashboard,
  getReport,
  listDashboards,
  mockFailures,
  moveTileTo,
  resetDataLayer,
  saveReport,
} from '@/data/clients'
import type { Dashboard, DashboardTile } from '@/data/types'
import { DashboardDetailScreen } from './DashboardDetailScreen'
import { REPORTS_EN } from './copy'

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  /* jsdom implements neither and Radix's select and dropdown both call them on
     the trigger. Same reasoning as `reports.mode.test.tsx`; kept local. */
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
const named = (key: string, name: string) => copy(key).replace('{name}', name)

function mount(dashboardId: string) {
  return render(
    <MemoryRouter initialEntries={[`/management/reports/dashboards/${dashboardId}`]}>
      <ShellProvider>
        <Routes>
          <Route
            path="/management/reports/dashboards/:dashboardId"
            element={<DashboardDetailScreen />}
          />
          <Route path="/management/reports" element={<p>the dashboards list</p>} />
        </Routes>
        {/* Toasts are a real surface here — R9's wording is only checkable if
            something renders them. */}
        <Toaster />
      </ShellProvider>
    </MemoryRouter>,
  )
}

/** Every board, read through the client rather than out of the seed module. */
async function boards(): Promise<Dashboard[]> {
  return (await listDashboards({ pageSize: 50 })).items
}

const ordered = (tiles: readonly DashboardTile[]) => [...tiles].sort((a, b) => a.order - b.order)

/** A board whose every tile resolves — no dangling reference to confuse a count. */
async function healthyBoard(): Promise<Dashboard> {
  const all = await boards()
  const found = all.find(
    (board) => board.tiles.length > 1 && !board.tiles.some((tile) => tile.reportId.includes('DELETED')),
  )
  expect(found, 'a board with more than one resolvable tile').toBeTruthy()
  return found as Dashboard
}

/* ───── the defect: a blip is not a deletion ─────────────────────────────── */

describe('a tile that fails to load is not a tile that was deleted', () => {
  it('renders the failed state with its retry, and never the missing sentence', async () => {
    const board = await healthyBoard()
    /* A 503 — retryable, and emphatically not a 404. This is the shape a
       network blip has, and it used to render "The report this tile pointed at
       no longer exists" with `Remove tile` as the only way out. */
    mockFailures.always('reports.get')

    mount(board.id)

    const failures = await screen.findAllByText(copy('rb.dashboard.tile.error'))
    expect(failures.length).toBe(board.tiles.length)
    expect(screen.queryByText(copy('rb.dashboard.tile.missing'))).not.toBeInTheDocument()
    /* The error branch was unreachable before the catch was narrowed, so the
       retry it renders had never been offered for a transport failure. */
    expect(
      screen.getAllByRole('button', { name: copy('rb.dashboard.tile.retry') }).length,
    ).toBe(board.tiles.length)
  })

  it('still calls a 404 missing, and offers Remove tile beside the sentence', async () => {
    const all = await boards()
    const withMissing = all.find((board) =>
      board.tiles.some((tile) => tile.reportId.includes('DELETED')),
    )
    expect(withMissing, 'a board with a dangling tile').toBeTruthy()

    mount((withMissing as Dashboard).id)

    /* Narrowing the catch must not lose the state it was hiding: a genuine
       dangling reference is still MISSING, and `pinnedName` is read in exactly
       this one case (AC-869). */
    expect(await screen.findByText(copy('rb.dashboard.tile.missing'))).toBeInTheDocument()
    const gone = (withMissing as Dashboard).tiles.find((tile) =>
      tile.reportId.includes('DELETED'),
    ) as DashboardTile
    expect(screen.getByText(gone.pinnedName)).toBeInTheDocument()
    expect(screen.queryByText(copy('rb.dashboard.tile.error'))).not.toBeInTheDocument()
  })

  it('leaves the rest of the dashboard rendered — AC-872', async () => {
    const all = await boards()
    const mixed = all.find(
      (board) =>
        board.tiles.some((tile) => tile.reportId.includes('DELETED')) &&
        board.tiles.some((tile) => !tile.reportId.includes('DELETED')),
    )
    expect(mixed, 'a board with one dangling tile and one live one').toBeTruthy()
    const live = (mixed as Dashboard).tiles.find(
      (tile) => !tile.reportId.includes('DELETED'),
    ) as DashboardTile
    const liveReport = (await getReport(live.reportId)).data

    mount((mixed as Dashboard).id)

    expect(await screen.findByText(copy('rb.dashboard.tile.missing'))).toBeInTheDocument()
    /* One tile failing does not fail the dashboard: each owns its own
       `reports.get` and `reports.run`, which is why `dashboards.get` refuses to
       resolve them server-side. */
    expect(
      screen.getByRole('button', { name: named('rb.dashboard.tile.open', liveReport.name) }),
    ).toBeInTheDocument()
  })
})

/* ───── the defect: a healthy tile could not be removed ──────────────────── */

describe('a tile an operator can see is a tile they can remove', () => {
  it('removes it from the record, not merely from the screen', async () => {
    const user = userEvent.setup()
    const board = await healthyBoard()
    const first = ordered(board.tiles)[0] as DashboardTile
    const report = (await getReport(first.reportId)).data

    mount(board.id)

    /* §7.3 — the control is PRESENT, in the tile's own overflow, not revealed
       on hover. The trigger names the tile so six of them stay apart. */
    const trigger = await screen.findByRole('button', {
      name: named('rb.dashboard.tile.actions', report.name),
    })
    await user.click(trigger)

    /* `rb.dashboard.tile.removeA11y` — the visible label names the ACTION and
       the accessible name names the tile. */
    await user.click(
      await screen.findByRole('menuitem', {
        name: named('rb.dashboard.tile.removeA11y', report.name),
      }),
    )

    await waitFor(async () => {
      const after = (await getDashboard(board.id)).data
      expect(after.tiles.map((tile) => tile.tileId)).not.toContain(first.tileId)
      expect(after.tiles.length).toBe(board.tiles.length - 1)
    })
    /* R9 — the object, named, and the past participle. Never "Dashboard saved"
       for all four of this screen's mutations. */
    expect(
      await screen.findByText(named('rb.dashboard.tile.removed.toast', first.pinnedName)),
    ).toBeInTheDocument()
  })
})

/* ───── the reference is the truth, `pinnedName` is a fallback ───────────── */

describe('a resolvable tile shows the report’s current name', () => {
  it('re-titles itself when the report is renamed — AC-867 / AC-869', async () => {
    const board = await healthyBoard()
    const first = ordered(board.tiles)[0] as DashboardTile
    const before = (await getReport(first.reportId)).data
    const renamed = 'Renamed after it was pinned'

    const outcome = await saveReport({
      id: before.id,
      name: renamed,
      description: before.description,
      query: before.query,
      visibility: before.visibility,
    })
    expect(outcome.status).toBe('saved')

    mount(board.id)

    /* The tile stores `reportId`, never a copy — so editing the report changes
       every dashboard that pins it, and `pinnedName` stays unread while the
       reference resolves. A tile that showed `pinnedName` here would be a
       second, stale source of truth for the title. */
    expect(
      await screen.findByRole('button', { name: named('rb.dashboard.tile.open', renamed) }),
    ).toBeInTheDocument()
    expect(screen.queryByText(first.pinnedName)).not.toBeInTheDocument()
  })
})

/* ───── reorder: two integers, and a keyboard path for both forms ────────── */

describe('reordering is a control, never a gesture', () => {
  it('persists Move down and renormalises order to 1..n — AC-871', async () => {
    const user = userEvent.setup()
    const board = await healthyBoard()
    const before = ordered(board.tiles)
    const first = before[0] as DashboardTile
    const second = before[1] as DashboardTile
    const report = (await getReport(first.reportId)).data

    mount(board.id)

    const down = await screen.findByRole('button', {
      name: named('rb.dashboard.tile.moveDown', report.name),
    })
    expect(down).toBeEnabled()
    /* `Move up` on the FIRST tile is disabled in place, not missing: a control
       that disappears at the end of a list teaches nothing about the list. */
    expect(
      screen.getByRole('button', { name: named('rb.dashboard.tile.moveUp', report.name) }),
    ).toBeDisabled()

    await user.click(down)

    await waitFor(async () => {
      const after = ordered((await getDashboard(board.id)).data.tiles)
      expect(after[0]?.tileId).toBe(second.tileId)
      expect(after[1]?.tileId).toBe(first.tileId)
      /* Renormalised on save, which is what makes an end-of-list move a no-op
         rather than drift. */
      expect(after.map((tile) => tile.order)).toEqual(after.map((_, index) => index + 1))
    })
    expect(await screen.findByText(copy('rb.dashboard.reordered.toast'))).toBeInTheDocument()
  })

  it('offers Move to position as a labelled Select, and saves once', async () => {
    const user = userEvent.setup()
    const board = await healthyBoard()
    const before = ordered(board.tiles)
    const last = before[before.length - 1] as DashboardTile
    const report = (await getReport(last.reportId)).data

    mount(board.id)

    /* §11.2 rejected a drag grid on keyboard-operability grounds, not on
       directness grounds. A `Select` is directness with the keyboard story
       free, and it carries the tile's name like every other tile control. */
    const select = await screen.findByRole('combobox', {
      name: named('rb.dashboard.tile.moveTo', report.name),
    })
    await user.click(select)
    await user.click(
      await screen.findByRole('option', {
        name: copy('rb.dashboard.tile.position')
          .replace('{position}', '1')
          .replace('{total}', String(before.length)),
      }),
    )

    await waitFor(async () => {
      const after = ordered((await getDashboard(board.id)).data.tiles)
      expect(after[0]?.tileId).toBe(last.tileId)
      expect(after.map((tile) => tile.order)).toEqual(after.map((_, index) => index + 1))
    })
  })

  it('moveTileTo re-inserts rather than swapping, and refuses a position off the end', async () => {
    const board = await healthyBoard()
    const tiles = ordered(board.tiles)
    const last = tiles[tiles.length - 1] as DashboardTile

    /* A swap would send tile 1 to the bottom, which is not what an operator who
       dragged the last tile to the top would have got. Every other tile keeps
       its relative order. */
    const moved = moveTileTo(tiles, last.tileId, 1)
    expect(moved.map((tile) => tile.tileId)).toEqual([
      last.tileId,
      ...tiles.slice(0, -1).map((tile) => tile.tileId),
    ])
    expect(moved.map((tile) => tile.order)).toEqual(moved.map((_, index) => index + 1))

    /* Out of range is a no-op, not an error — the same contract `Move up` on
       the first tile relies on. */
    expect(moveTileTo(tiles, last.tileId, tiles.length + 1).map((t) => t.tileId)).toEqual(
      tiles.map((t) => t.tileId),
    )
    expect(moveTileTo(tiles, 'TIL-nothing', 1).map((t) => t.tileId)).toEqual(
      tiles.map((t) => t.tileId),
    )
  })
})

/* ───── identity: owner, updated, description ────────────────────────────── */

describe('a dashboard says whose it is and what it is for', () => {
  it('puts owner and last-updated in the header meta, and no invented view count', async () => {
    const board = await healthyBoard()

    mount(board.id)

    /* Both halves are on the record and both change when it does, which is what
       `PageHeader.meta` is for. One key with two named placeholders — never a
       concatenation, because Arabic does not order the two as English does. */
    await screen.findByRole('heading', { name: board.name })
    const owner = await screen.findByText(/Owned by/)
    expect(owner).toHaveTextContent(/Updated/)
    /* **No view count.** There is no store for one, and `0 Views` invented into
       a fixture is exactly what AC-453 forbids. */
    expect(screen.queryByText(/Views/)).not.toBeInTheDocument()
  })

  it('renames through an explicit commit, and keeps the tiles it did not edit', async () => {
    const user = userEvent.setup()
    const board = await healthyBoard()

    mount(board.id)

    await screen.findByRole('heading', { name: board.name })
    await user.click(screen.getByRole('button', { name: /more/i }))
    await user.click(
      await screen.findByRole('menuitem', { name: copy('rb.dashboard.rename.action') }),
    )

    const field = await screen.findByLabelText(copy('rb.dashboards.new.name'))
    await user.clear(field)
    await user.type(field, 'Renamed board')
    await user.click(screen.getByRole('button', { name: copy('rb.dashboard.rename.confirm') }))

    await waitFor(async () => {
      const after = (await getDashboard(board.id)).data
      expect(after.name).toBe('Renamed board')
      /* A rename is not a reorder: the record's own tile list goes back
         unchanged. */
      expect(after.tiles.length).toBe(board.tiles.length)
    })
  })
})
