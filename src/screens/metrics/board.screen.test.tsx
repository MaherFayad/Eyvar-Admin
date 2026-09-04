/**
 * The board as an operator works it: it re-reads (T1.5), its pill names both
 * windows when the chart under it covers another (T5.7), and every `Open
 * analysis` on Risk lands on a list that honours the address (T7.2, O4). The
 * one seam is `getMetricBoard`, spread over the real module, substituted only
 * where a test needs an instant the fixed clock cannot move.
 */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  disableMockLatency,
  getRouteTable,
  listDriverCompliance,
  listSubscriptions,
  resetDataLayer,
  switchMockUser,
} from '@/data/clients'
import type { MetricBoard, SubTabRoute } from '@/data/types'
import { readTableParams, tableScope } from '@/hooks/useUrlTableState'
import { ShellProvider } from '@/shell/ShellContext'
import { MetricBoardScreen } from './MetricBoardScreen'

/* Each call gets the next instant in the list, so a re-read is visible in the
   printed `asOf`. `null` leaves the real client alone. */
let asOfPerCall: string[] | null = null
let calls = 0

vi.mock('@/data/clients', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/clients')>()
  return {
    ...actual,
    getMetricBoard: async (...args: Parameters<typeof actual.getMetricBoard>) => {
      const board: MetricBoard = await actual.getMetricBoard(...args)
      if (asOfPerCall === null) return board
      const at = asOfPerCall[Math.min(calls++, asOfPerCall.length - 1)]
      return { ...board, asOf: at as string }
    },
  }
})

beforeEach(async () => {
  asOfPerCall = null
  calls = 0
  disableMockLatency()
  resetDataLayer()
  await switchMockUser('USR-1')
})

function routeRow(subTabId: string): SubTabRoute {
  const found = getRouteTable().subTabs.find((each) => each.subTabId === subTabId)
  if (!found) throw new Error(`No route-table row for ${subTabId}`)
  return found
}

function renderBoard(subTabId: string) {
  const row = routeRow(subTabId)
  return render(
    <MemoryRouter initialEntries={[row.path]}>
      <ShellProvider>
        <MetricBoardScreen row={row} />
      </ShellProvider>
    </MemoryRouter>,
  )
}

/* The BAND's freshness line. Each tile prints its own when it is staler than
   the board (`MetricTile`), so the instant is read off the band's `bdi`. */
async function freshness(): Promise<string> {
  const line = await screen.findByText(/^Computed /u, { selector: 'bdi' })
  return line.textContent ?? ''
}

describe('T1.5 — a board re-reads, and its freshness moves with it', () => {
  it('the Refresh control in the band re-reads and the printed asOf changes', async () => {
    asOfPerCall = ['2026-06-25T09:14:00+03:00', '2026-06-25T11:42:00+03:00']
    const user = userEvent.setup()
    renderBoard('management-overview')

    const before = await freshness()
    expect(before).toContain('09:14')

    await user.click(await screen.findByRole('button', { name: 'Refresh' }))
    await waitFor(async () => expect(await freshness()).not.toBe(before))
    expect(await freshness()).toContain('11:42')
  })

  it('coming back to the window re-reads without a click', async () => {
    asOfPerCall = ['2026-06-25T09:14:00+03:00', '2026-06-25T14:05:00+03:00']
    renderBoard('management-overview')

    const before = await freshness()
    fireEvent(window, new Event('focus'))
    await waitFor(async () => expect(await freshness()).not.toBe(before))
    expect(await freshness()).toContain('14:05')
  })
})

describe('T5.7 — the period pill states its scope', () => {
  it('names both windows on Risk & Signals, where the leads carry none', async () => {
    /* Every Risk lead is point-in-time, so the board filters to nothing and the
       pill reads `All time`; its one chart plots 19-25 Jun. Before this the two
       sat 100px apart with nothing saying they were different questions. */
    renderBoard('management-risk')
    const pill = await screen.findByRole('button', { name: /Change the period/u })
    expect(within(pill).getByText(/All time/u).textContent).toBe(
      'Leads: All time · chart: 19 Jun – 25 Jun',
    )
  })

  it('states one window when the chart under the band covers the leads’ own', async () => {
    /* Management Overview's leads and its hoisted chart both run 11-25 Jun, so
       there are not two scopes to name and the pill stays the range it was. */
    renderBoard('management-overview')
    const pill = await screen.findByRole('button', { name: /Change the period/u })
    expect(pill.textContent).toContain('11 Jun – 25 Jun')
    expect(pill.textContent).not.toContain('chart:')
  })
})

describe('T7.2 — every Open analysis on Risk & Signals lands pre-filtered (O4)', () => {
  /** The `Open analysis` destination of the tile whose label is `label`. */
  async function analysisHref(label: string): Promise<string> {
    const link = await screen.findByRole('link', { name: `Open analysis for ${label}` })
    return link.getAttribute('href') ?? ''
  }

  /** The question the target list reads out of that address, its own way. */
  function question(href: string) {
    const search = href.slice(href.indexOf('?'))
    const view = new URLSearchParams(search).get('view')
    return {
      view,
      ...readTableParams(search, tableScope(search, ''), { q: '', sort: null, filters: [] }),
    }
  }

  /* The five tiles whose population IS the at-risk subscriptions: three
     counts and the two rates derived from the same rows. One `it` each, so a
     failure names the tile rather than the loop. */
  for (const label of [
    'Revenue at risk',
    'Subscriptions predicted to churn',
    'Renewal payments flagged',
    'Revenue at risk as share of MRR',
    'Median days to renewal on at-risk rows',
  ]) {
    it(`${label} lands on the at-risk subscriptions`, async () => {
      renderBoard('management-risk')
      expect(question(await analysisHref(label)).view, label).toBe('at-risk')
    })
  }

  it('the at-risk subscriptions list honours that view', async () => {
    const filtered = await listSubscriptions({ view: 'at-risk', pageSize: 500 })
    const all = await listSubscriptions({ pageSize: 500 })
    expect(filtered.total).toBeGreaterThan(0)
    expect(filtered.total).toBeLessThan(all.total)
    expect(filtered.items.every((s) => s.status === 'at-risk')).toBe(true)
  })

  it('captains at risk land on the compliance rows that are not clean', async () => {
    renderBoard('management-risk')
    const asked = question(await analysisHref('Captains at risk of unavailability'))
    expect(asked.view).toBe('compliance')
    expect(asked.filters).toEqual([{ field: 'worstState', op: 'neq', value: 'valid' }])
  })

  it('the compliance list honours that filter', async () => {
    const filtered = await listDriverCompliance({
      filters: [{ field: 'worstState', op: 'neq', value: 'valid' }],
      pageSize: 500,
    })
    const all = await listDriverCompliance({ pageSize: 500 })
    expect(filtered.total).toBeGreaterThan(0)
    expect(filtered.total).toBeLessThan(all.total)
    expect(filtered.items.every((row) => row.worstState !== 'valid')).toBe(true)
  })

  it('repeat incidents land on the open safety queue', async () => {
    renderBoard('management-risk')
    expect(question(await analysisHref('Captains with repeat incidents')).view).toBe('open')
  })

  it('every link the board draws is pre-filtered, none lands on an unscoped list', async () => {
    /* The per-tile tests above name the destinations one at a time; this one
       fails when a NEW risk tile arrives carrying a bare route (O4). */
    renderBoard('management-risk')
    const links = await screen.findAllByRole('link', { name: /Open analysis for/u })
    expect(links).toHaveLength(7)
    for (const link of links) {
      const href = link.getAttribute('href') ?? ''
      const asked = question(href)
      expect(
        asked.view !== null || asked.filters.length > 0,
        `${link.textContent} -> ${href}`,
      ).toBe(true)
    }
  })

  it('the one tile with no list offers no link rather than a plausible one', async () => {
    /* F-8 — Admin Data's integrity pane has no view id, and O4 creates no
       surface. A link to a list that cannot show the population is worse than
       a figure that stops at itself. */
    renderBoard('management-risk')
    await screen.findAllByRole('link', { name: /Open analysis for/u })
    expect(
      screen.queryByRole('link', { name: /Open analysis for Rider and captain accounts/u }),
    ).not.toBeInTheDocument()
  })
})
