/**
 * Financials › Overview — **AC-353**, **AC-487**, and the four claims §3.6 adds
 * when the screen becomes a board.
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
import { formatSignedPercent, formatSignedPoints } from '@/components/metrics'
import { EN } from '@/i18n/dictionaries'
import { ShellProvider } from '@/shell/ShellContext'
import { marginBreakdown } from '../shared/derive'
import { OverviewScreen } from './OverviewScreen'
import { toBoard } from './toBoard'

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

const copy = (key: string) => EN[key] as string

/** The `<section>` a chapter heading names — the two chapters and nothing else. */
function chapter(title: string): HTMLElement {
  const heading = screen.getByRole('heading', { name: title })
  const section = heading.closest('section')
  if (!section) throw new Error(`No section around the chapter heading ${title}`)
  return section
}

/** The numeral of the figure labelled `label`, inside one chapter. */
function figureValue(section: HTMLElement, label: string): string {
  const labelNode = within(section).getByText(label)
  const item = labelNode.closest('li')
  if (!item) throw new Error(`No figure around the label ${label}`)
  return item.querySelector('[data-slot="metric-value"]')?.textContent?.trim() ?? ''
}

/** The band — `BoardBand`'s section, found by the page's one `<h1>`. */
function band(): HTMLElement {
  const section = screen.getByRole('heading', { level: 1 }).closest('section')
  if (!section) throw new Error('No band around the page heading')
  return section
}

async function settled(): Promise<void> {
  await waitFor(() =>
    expect(screen.getByText(copy('fin.overview.chapter.period'))).toBeTruthy(),
  )
}

describe('AC-353 — the period is a search param and it re-reads', () => {
  /**
   * The assertion a hardcoded tile cannot pass: **the figure moves when the
   * window narrows.** `12a` R12's complaint is seven KPI tiles that are static
   * HTML strings, so "it changed" is the property worth asserting.
   */
  it('narrowing the period moves every in-period figure', async () => {
    const wide = await getFinancialsOverview({ period: { start: '2026-06-01', end: '2026-06-30' } })
    const narrow = await getFinancialsOverview({
      period: { start: '2026-06-01', end: '2026-06-07' },
    })
    expect(narrow.grossBookingsHalalas).not.toBe(wide.grossBookingsHalalas)

    const first = mount(FULL_MONTH)
    await settled()
    const period = chapter(copy('fin.overview.chapter.period'))
    const wideGross = figureValue(period, copy('metric.financials.overview.grossBookings'))
    const wideEarnings = figureValue(period, copy('metric.financials.overview.captainEarnings'))
    expect(wideGross).toBeTruthy()
    first.unmount()

    mount(FIRST_WEEK)
    await settled()
    const narrowed = chapter(copy('fin.overview.chapter.period'))
    expect(figureValue(narrowed, copy('metric.financials.overview.grossBookings'))).not.toBe(
      wideGross,
    )
    expect(figureValue(narrowed, copy('metric.financials.overview.captainEarnings'))).not.toBe(
      wideEarnings,
    )
  })

  /**
   * §3.2 — **the chapter heading carries the window once and no figure repeats
   * it.** Six figures printed `Period 1 Jun to 30 Jun` and five printed
   * `Balance to date, outside the period.`: the page meta, eleven times.
   */
  it('the chapter summary carries the window and no figure repeats it', async () => {
    mount(FULL_MONTH)
    await settled()
    const period = chapter(copy('fin.overview.chapter.period'))

    const summary = within(period).getAllByText(/1 Jun/)
    expect(summary).toHaveLength(1)
    expect(summary[0]?.textContent).toContain('30 Jun')

    for (const figure of Array.from(period.querySelectorAll('li'))) {
      expect(figure.textContent ?? '').not.toContain('1 Jun')
    }
  })

  /**
   * **AC-487 — the position figures are as-at and do NOT move with the period.**
   * A balance-sheet position that changed when a reporting period narrowed
   * would be wrong, so this test and the summary test below are a pair.
   */
  it('the position figures hold still when the period narrows', async () => {
    const labels = [
      copy('metric.financials.overview.pendingPayouts'),
      copy('metric.financials.overview.riderWallets'),
      copy('metric.financials.overview.escrowHeld'),
      copy('metric.financials.overview.escrowReady'),
      copy('metric.financials.overview.captainDebt'),
      copy('metric.financials.overview.heldInTotal'),
    ]

    const first = mount(FULL_MONTH)
    await settled()
    const wideSection = chapter(copy('fin.overview.chapter.positions'))
    const wide = labels.map((label) => figureValue(wideSection, label))
    first.unmount()

    mount(FIRST_WEEK)
    await settled()
    const narrowSection = chapter(copy('fin.overview.chapter.positions'))
    const narrow = labels.map((label) => figureValue(narrowSection, label))

    for (const [index, label] of labels.entries()) {
      expect(wide[index], `${label} rendered no value to compare`).toBeTruthy()
      expect(narrow[index], `${label} moved when the period narrowed`).toBe(wide[index])
    }
  })

  it('the positions chapter states a balance date rather than the window', async () => {
    mount(FULL_MONTH)
    await settled()
    const positions = chapter(copy('fin.overview.chapter.positions'))
    expect(within(positions).getByText(/Balances as at/)).toBeTruthy()
  })
})

describe('§3 — the board', () => {
  /**
   * **Every delta on the band is the same field's change in the response.** A
   * delta computed in the component from numbers it happened to have is the
   * hand-written literal AC-346 forbids, one field over.
   */
  it('every delta on the band equals the change in the response', async () => {
    const data = await getFinancialsOverview({
      period: { start: '2026-06-01', end: '2026-06-30' },
    })
    const before = data.comparison
    expect(before, 'the fixtures must carry a comparison window').not.toBeNull()
    const now = marginBreakdown(data)
    const then = marginBreakdown(before!)

    const change = (a: number, b: number) => Math.round(((a - b) / Math.abs(b)) * 1000) / 10
    const grossDelta = formatSignedPercent(
      change(data.grossBookingsHalalas, before!.grossBookingsHalalas),
      'en',
    )
    const contributionDelta = formatSignedPercent(
      change(now.contributionMarginHalalas, then.contributionMarginHalalas),
      'en',
    )
    /* §4.3 — a RATE moved by points, not by a percent of a percent. */
    const pointsDelta =
      formatSignedPoints(
        Math.round(
          ((now.contributionMarginPercent ?? 0) - (then.contributionMarginPercent ?? 0)) * 10,
        ) / 10,
        'en',
      ) + copy('metric.delta.points')

    mount(FULL_MONTH)
    await settled()
    const text = band().textContent ?? ''
    expect(text).toContain(grossDelta)
    expect(text).toContain(contributionDelta)
    expect(text).toContain(pointsDelta)
  })

  /**
   * **AC-342 in the plot: a zero-gross day is a GAP, not a `0%` point.** A
   * chart that dips to the axis on a quiet day reads as a collapse in margin.
   */
  it('a zero-gross day plots as a gap, not a zero', async () => {
    const data = await getFinancialsOverview({
      period: { start: '2026-06-01', end: '2026-06-30' },
    })
    const quiet = data.daily.filter((each) => each.grossBookingsHalalas === 0)
    expect(quiet.length, 'the fixtures must contain a day with no gross').toBeGreaterThan(0)

    const board = toBoard(data, 'en')
    const contribution = board.series.find((series) =>
      series.key.endsWith('contributionPercentByDay'),
    )
    expect(contribution).toBeTruthy()
    expect(contribution!.current.points).toHaveLength(data.daily.length)
    for (const day of quiet) {
      const point = contribution!.current.points.find((each) => each.at === day.date)
      expect(point?.value, `${day.date} plotted a number over zero gross`).toBeNull()
    }
  })

  /**
   * **The two absences are different facts.** `no-history` is *there is no
   * earlier window*; a window that exists and carries nothing to divide by is
   * `insufficient-data`. Emitting the first for both put *No comparison period
   * yet* on one figure beside *vs 1 May – 31 May* on the next.
   */
  it('a prior window with nothing to divide by reads as too little data, not no history', async () => {
    const data = await getFinancialsOverview({
      period: { start: '2026-06-01', end: '2026-06-30' },
    })
    expect(data.comparison, 'the fixtures must carry a comparison window').not.toBeNull()
    expect(
      data.comparison!.captainEarningsHalalas,
      'this figure is the worked case only while its prior value is zero',
    ).toBe(0)

    const board = toBoard(data, 'en')
    const earnings = board.flows.find((each) => each.key.endsWith('captainEarnings'))
    expect(earnings?.comparison).toEqual({ kind: 'none', reason: 'insufficient-data' })
    expect(earnings?.deltaPercent).toBeNull()

    mount(FULL_MONTH)
    await settled()
    const period = chapter(copy('fin.overview.chapter.period'))
    expect(within(period).getAllByText(copy('overview.noCompare.insufficient-data')).length)
      .toBeGreaterThan(0)
    expect(within(period).queryByText(copy('overview.noCompare.no-history'))).toBeNull()
  })

  /**
   * §3.7's dotted line. A legend reading *No comparison period yet* under a
   * headline reading *up 5,024.3% against 1 May – 31 May* is one card making
   * two claims about one window.
   */
  it('each chart carries the prior window as its comparison series', async () => {
    const data = await getFinancialsOverview({
      period: { start: '2026-06-01', end: '2026-06-30' },
    })
    expect(data.dailyComparison).not.toBeNull()
    expect(data.dailyComparison).toHaveLength(31)

    const board = toBoard(data, 'en')
    for (const series of board.series) {
      expect(series.comparison, `${series.key} draws no dotted line`).not.toBeNull()
      expect(series.comparison!.periodStart).toBe(data.comparison!.period.start)
      expect(series.comparison!.points).toHaveLength(data.dailyComparison!.length)
    }
  })

  /** §3.0 — each decision row opens the view that can act on it. */
  it('the decision list links to the view that can act', async () => {
    mount(FULL_MONTH)
    await settled()
    const link = screen.getByRole('link', { name: new RegExp(copy('fin.overview.decision.cash')) })
    expect(link.getAttribute('href')).toBe('/financials/cash?view=reconciliation-queue')
  })

  /**
   * **P0-1.** The refused banner reused `fin.overview.outOfBalance.body` —
   * *"Total debits and total credits disagree."* — on a page whose books
   * balance. The banner contradicted the page.
   */
  it('the refused banner does not say debits and credits disagree when the books balance', async () => {
    const data = await getFinancialsOverview({
      period: { start: '2026-06-01', end: '2026-06-30' },
    })
    expect(data.trialBalanceBalanced).toBe(true)
    expect(data.refusedPostingCount).toBeGreaterThan(0)

    mount(FULL_MONTH)
    await settled()
    expect(screen.getByText(copy('fin.overview.refused.body'))).toBeTruthy()
    expect(screen.queryByText(copy('fin.overview.outOfBalance.body'))).toBeNull()
  })
})
