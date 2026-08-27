/**
 * Financials › Overview — **AC-353**, and the reason it cannot pass as written.
 *
 * **No spies.** The period behaviour is driven by mounting at two different
 * `?from=`/`?to=` values and comparing what is on screen, so nothing here can
 * pass because an observer was never attached.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  disableMockLatency,
  getFinancialsOverview,
  getRouteTable,
  resetDataLayer,
} from '@/data/clients'
import type { SubTabRoute } from '@/data/types'
import { EN } from '@/i18n/dictionaries'
import { ShellProvider } from '@/shell/ShellContext'
import { OverviewScreen } from './OverviewScreen'

const overviewRow = (): SubTabRoute => {
  const row = getRouteTable().subTabs.find((each) => each.subTabId === 'financials-overview')
  if (!row) throw new Error('No route-table row for financials-overview')
  return row
}

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
})

function mount(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider>
        <OverviewScreen row={overviewRow()} />
      </ShellProvider>
    </MemoryRouter>,
  )
}

const FULL_MONTH = '/financials/overview?from=2026-06-01&to=2026-06-30'
const FIRST_WEEK = '/financials/overview?from=2026-06-01&to=2026-06-07'

/**
 * The value rendered beneath a tile's label, scoped to the tile grid.
 *
 * `Gross bookings` is also a row label on the margin card below — the same
 * measure named the same way in both places, which is right — so the lookup is
 * scoped to the section rather than made unique by rewording either.
 */
function tileValue(label: string, section: 'period' | 'positions' = 'period'): string {
  const region = document.getElementById(`fin-overview-${section}`)?.parentElement as HTMLElement
  const heading = within(region).getByText(label)
  const tile = heading.parentElement as HTMLElement
  return (tile.textContent ?? '').replace(label, '').trim()
}

describe('AC-353 — the period is a search param and it re-reads', () => {
  /**
   * The half that is right, and the assertion a hardcoded tile cannot pass:
   * **the figure moves when the window narrows.** `12a` R12's whole complaint
   * is seven KPI tiles that are static HTML strings, so "it changed" is the
   * property worth asserting rather than "it says 4,432.52".
   */
  it('narrowing the period moves every in-period figure', async () => {
    const wide = await getFinancialsOverview({ period: { start: '2026-06-01', end: '2026-06-30' } })
    const narrow = await getFinancialsOverview({ period: { start: '2026-06-01', end: '2026-06-07' } })

    /* The client really does read a different window. */
    expect(narrow.grossBookingsHalalas).not.toBe(wide.grossBookingsHalalas)

    const first = mount(FULL_MONTH)
    await waitFor(() =>
      expect(screen.getByText(EN['fin.overview.tiles.heading'] as string)).toBeTruthy(),
    )
    const wideGross = tileValue(EN['fin.overview.gross'] as string)
    const wideEarnings = tileValue(EN['fin.overview.captainEarnings'] as string)
    first.unmount()

    mount(FIRST_WEEK)
    await waitFor(() =>
      expect(screen.getByText(EN['fin.overview.tiles.heading'] as string)).toBeTruthy(),
    )
    expect(tileValue(EN['fin.overview.gross'] as string)).not.toBe(wideGross)
    expect(tileValue(EN['fin.overview.captainEarnings'] as string)).not.toBe(wideEarnings)
  })

  /**
   * *"…and every tile states the period it covers."*
   *
   * The in-period tiles carry the window in their caption, and the caption
   * **moves with the window** — a caption that could not change would be the
   * same defect as a value that could not.
   */
  it('every in-period tile carries the window, and the caption moves with it', async () => {
    const first = mount(FULL_MONTH)
    await waitFor(() =>
      expect(screen.getByText(EN['fin.overview.tiles.heading'] as string)).toBeTruthy(),
    )
    const wideCaptions = screen.getAllByText(/1 Jun/)
    expect(wideCaptions.length).toBeGreaterThan(4)
    expect(wideCaptions[0]?.textContent).toContain('30 Jun')
    first.unmount()

    mount(FIRST_WEEK)
    await waitFor(() =>
      expect(screen.getByText(EN['fin.overview.tiles.heading'] as string)).toBeTruthy(),
    )
    const narrowCaptions = screen.getAllByText(/1 Jun/)
    expect(narrowCaptions[0]?.textContent).toContain('7 Jun')
    expect(narrowCaptions[0]?.textContent).not.toContain('30 Jun')
  })

  /**
   * **AC-487 — the five position tiles are as-at and do NOT move with the
   * period.** This test was a deliberate RED against AC-353 as originally
   * written (*"changing the period changes EVERY tile"*), and it is now the
   * assertion the amended criteria actually want.
   *
   * The criterion was what was wrong, not the screen. Overview renders two
   * sections: six **in-period flows**, which move with the window and are
   * covered by the caption test above, and five **as-at positions** — pending
   * payouts, escrow held, escrow ready, captain debt, rider wallet liability.
   * Each of those is a *balance*, not a flow: `accountBalanceFrom` and the
   * escrow holds are read at the clock, with no window at all.
   *
   * **A balance-sheet position that changed when a reporting period was
   * narrowed would be wrong**, so satisfying the original wording would have
   * meant breaking the screen. Product-owner split it: AC-353 became *"every
   * tile states its window, and a tile with no window states that it has
   * none"*, and AC-487 carries these five. The pairing is what makes the
   * assertion meaningful — a tile that never moves and never says why is just
   * as broken as one that moves when it should not, so this test and the
   * `as-at` caption test below are a pair and neither stands alone.
   */
  it('the position tiles hold still when the period narrows', async () => {
    const first = mount(FULL_MONTH)
    await waitFor(() =>
      expect(screen.getByText(EN['fin.overview.positions.heading'] as string)).toBeTruthy(),
    )
    const positionLabels = [
      EN['fin.overview.pendingPayouts'],
      EN['fin.overview.escrowHeld'],
      EN['fin.overview.escrowReady'],
      EN['fin.overview.captainDebt'],
      EN['fin.overview.riderWalletLiability'],
    ] as string[]
    const wide = positionLabels.map((label) => tileValue(label, 'positions'))
    first.unmount()

    mount(FIRST_WEEK)
    await waitFor(() =>
      expect(screen.getByText(EN['fin.overview.positions.heading'] as string)).toBeTruthy(),
    )
    const narrow = positionLabels.map((label) => tileValue(label, 'positions'))

    /* Guard against the vacuous pass: five identical empty strings would
       satisfy the loop below without proving anything. */
    for (const [index, label] of positionLabels.entries()) {
      expect(wide[index], `${label} rendered no value to compare`).toBeTruthy()
      expect(narrow[index], `${label} moved when the period narrowed`).toBe(wide[index])
    }
  })

  /**
   * The behaviour that **is** correct, recorded so the verdict has something to
   * point at when AC-353 is split: the position tiles state that they are
   * as-at, rather than borrowing the period's caption and implying they were
   * measured over it.
   */
  it('the position tiles state that they are as-at rather than in-period', async () => {
    mount(FULL_MONTH)
    await waitFor(() =>
      expect(screen.getByText(EN['fin.overview.positions.heading'] as string)).toBeTruthy(),
    )
    expect(screen.getAllByText(EN['fin.overview.asAt'] as string)).toHaveLength(5)
  })
})
