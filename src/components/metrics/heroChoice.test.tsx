/**
 * **§E4 — the KPI row that drives one chart**, and §E7's card chrome.
 *
 * The reference's best single idea is a row of lead figures where selecting one
 * redraws the plot beneath it. Every part of it already existed in this product
 * and none of them were joined: `BoardHeroRow` drew the leads, `getMetricBoard`
 * returned a `charts` array keyed by `Metric.key`, and `MetricBoardScreen`
 * already ran `charts.find(c => c.key === metric.key)` twenty lines further down
 * to give each card its headline. This suite is about the join.
 *
 * ## Why two of these tests build their own board
 *
 * The join is exact: a lead is selectable when the board charts a series under
 * **the same key**. Measured against the shipping fixtures, no board seeds two
 * such leads — `management-performance` has exactly one and the other seven have
 * none — so the multi-option behaviour cannot be reached from real data today.
 *
 * That is a **fixture gap, and it is reported rather than designed around**: the
 * alternative was to loosen the join so that some other chart is drawn for a
 * figure, which would put a plot under a numeral it is not the history of. So
 * the two tests that need a real choice construct a board with two charted
 * leads, and are labelled as constructed; everything that can be reached from
 * real data is reached from real data, including the single-lead case, which is
 * what every board renders right now.
 *
 * ## What is asserted
 *
 *   1. selecting a KPI tile changes which chart renders beneath the band
 *   2. a lead with no chart of its key is not a radio and renders as before
 *   3. the drilldown is a named action, reachable from every figure that has one
 *   4. arrows move within the group; `Enter` and `Space` select
 *   5. the card's period sub-line names the RESOLVED window, not a preset
 *   6. the `Open analysis` arrow mirrors in Arabic; the delta caret does not
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { disableMockLatency, getRouteTable, resetDataLayer, switchMockUser } from '@/data/clients'
import type { Metric, MetricBoard, SubTabRoute, TimeSeries } from '@/data/types'
import { createTranslator } from '@/lib'
import { AR } from '@/i18n/dictionaries'
import { MetricTile } from './MetricTile'
import { ShellProvider } from '@/shell/ShellContext'
import { MetricBoardScreen } from '@/screens/metrics/MetricBoardScreen'

/* The one seam this suite reaches through. `importOriginal` and spread, so
   `ShellProvider`'s own reads — the session, the route table — keep working and
   only the board is substituted. `vi.mock` is hoisted, so the override is a
   mutable module-scope variable the tests set rather than a factory argument. */
let boardOverride: MetricBoard | null = null
vi.mock('@/data/clients', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/clients')>()
  return {
    ...actual,
    getMetricBoard: (...args: Parameters<typeof actual.getMetricBoard>) =>
      boardOverride === null ? actual.getMetricBoard(...args) : Promise.resolve(boardOverride),
  }
})

const AS_OF = '2026-06-25T09:14:00+03:00'

beforeEach(async () => {
  boardOverride = null
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

/* ── the constructed board ────────────────────────────────────────────────
   Real keys throughout, so every label and title resolves through the real
   dictionary and nothing here asserts against a raw key. `quickRideRevenue`
   and `subscriptionRevenue` are the two series `management-overview` already
   charts; giving each a LEAD metric of the same key is the only thing the
   fixtures do not do, and it is exactly the gap being reported. */

function leadMetric(key: string, over: Partial<Metric> = {}): Metric {
  return {
    key,
    subTabId: 'management-performance',
    category: 'demand',
    rank: 'lead',
    value: 8.5,
    unit: 'percent',
    currency: null,
    asOf: AS_OF,
    periodStart: '2026-06-19',
    periodEnd: '2026-06-25',
    comparison: {
      kind: 'previous-period',
      value: 5.4,
      periodStart: '2026-06-12',
      periodEnd: '2026-06-18',
    },
    deltaPercent: 57,
    direction: 'up',
    higherIsBetter: true,
    caption: null,
    absenceReason: null,
    sourceResource: 'financials',
    drilldownRoute: `/management/reports?measure=${key}`,
    ...over,
  }
}

function chartFor(key: string): TimeSeries {
  const day = (n: number, value: number) => ({
    at: `2026-06-${String(n).padStart(2, '0')}`,
    value,
  })
  return {
    key,
    subTabId: 'management-performance',
    unit: 'percent',
    currency: null,
    asOf: AS_OF,
    current: {
      periodStart: '2026-06-19',
      periodEnd: '2026-06-21',
      points: [day(19, 120), day(20, 140), day(21, 90)],
    },
    comparison: {
      periodStart: '2026-06-12',
      periodEnd: '2026-06-14',
      points: [day(12, 100), day(13, 110), day(14, 80)],
    },
    higherIsBetter: true,
    awaitingStore: null,
  }
}

/**
 * Two charted leads and one that is not charted — the shape §E4 is about.
 *
 * **The fixtures now seed it, on three boards** (`management-performance`,
 * `support-overview`, `support-fairness`). This board is still constructed
 * rather than loaded, because it pins the *component's* behaviour against a
 * board whose shape cannot drift when a fixture is reseeded.
 */
const FIRST = 'management.performance.cancellationRate'
const SECOND = 'support.overview.contactsPerThousandTrips'
const UNCHARTED = 'management.performance.tripsCompleted'

/** What each of the three renders as, in the dictionary this product ships. */
const TITLE = {
  first: 'Quick-ride cancellation rate',
  second: 'Contacts per 1,000 trips',
  uncharted: 'Trips completed',
} as const

function constructedBoard(): MetricBoard {
  return {
    subTabId: 'management-performance',
    asOf: AS_OF,
    metrics: [
      leadMetric(FIRST),
      leadMetric(SECOND, { value: 4.2 }),
      /* Charted by nothing. It must stay a plain figure. */
      leadMetric(UNCHARTED, { value: 118, unit: 'count' }),
    ],
    charts: [chartFor(FIRST), chartFor(SECOND)],
    breakdowns: [],
    notices: [],
  }
}

/** The band's radios, in document order. */
const radios = () => screen.getAllByRole('radio')

/**
 * The title of the chart hoisted under the band — **the first card on the
 * page**, which is what `BoardContent` renders it as.
 *
 * By DOM order rather than by text, and deliberately: a metric's label and its
 * chart's title are the same words for every key on this board (they name one
 * measure), so a text query cannot tell the figure from the panel. Position can.
 */
function hoistedTitle(): string {
  const [first] = document.querySelectorAll('[data-slot="card-title"]')
  return first?.textContent ?? ''
}

describe('§E4 — the lead row drives the chart beneath the band', () => {
  it('redraws the hoisted chart when another lead is selected [constructed board]', async () => {
    boardOverride = constructedBoard()
    const user = userEvent.setup()
    renderBoard('management-performance')

    /* The first charted lead is checked on arrival — the board's own order,
       not a stored preference. */
    await waitFor(() => expect(radios()).toHaveLength(2))
    expect(radios()[0]).toHaveAttribute('aria-checked', 'true')
    expect(radios()[1]).toHaveAttribute('aria-checked', 'false')
    expect(hoistedTitle()).toBe(TITLE.first)

    await user.click(radios()[1] as HTMLElement)

    expect(radios()[0]).toHaveAttribute('aria-checked', 'false')
    expect(radios()[1]).toHaveAttribute('aria-checked', 'true')
    expect(hoistedTitle()).toBe(TITLE.second)
  })

  it('draws the chosen series ONCE — it is hoisted, not repeated [constructed board]', async () => {
    boardOverride = constructedBoard()
    renderBoard('management-performance')

    await waitFor(() => expect(radios()).toHaveLength(2))
    const cardTitles = [...document.querySelectorAll('[data-slot="card-title"]')].map(
      (node) => node.textContent,
    )
    /* The selected chart appears exactly once, at the top; the unselected one
       exactly once, in the detail row below. Two cards, two titles, no repeat. */
    expect(cardTitles).toEqual([TITLE.first, TITLE.second])
  })

  it('leaves a lead with no chart of its key OUT of the group, as a plain figure', async () => {
    boardOverride = constructedBoard()
    renderBoard('management-performance')

    await waitFor(() => expect(radios()).toHaveLength(2))
    /* Three leads, two radios. The third is still on the band, still named,
       still carrying its numeral — it simply is not a control. */
    const band = screen.getByRole('radiogroup')
    expect(within(band).getByText(TITLE.uncharted)).toBeVisible()
    expect(
      within(band)
        .getAllByRole('radio')
        .some((radio) => radio.textContent?.includes(TITLE.uncharted)),
    ).toBe(false)
  })

  it('is NOT a radiogroup when only one lead is charted — the real fixtures today', async () => {
    /* **`management-overview`, and it used to be `management-performance`.**

       When §E4 shipped, NO board seeded two charted leads, so this middle state
       was the only one real fixtures could reach. Seeding the four missing
       series inverted that: `management-performance` now carries two
       (`tripsCompleted` + `cancellationRate`) and is a radiogroup, which is
       what the case above asserts.

       `management-overview` is now the board with exactly one charted lead —
       `grossRevenue`, hoisted over the two cards that are its own halves. A
       group of one radio cannot be operated, so the row stays a list and the
       chart is hoisted without a control. `board.test.ts` pins both facts this
       depends on: that the board has exactly one charted lead, and that it is
       `grossRevenue`. */
    renderBoard('management-overview')

    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
    await waitFor(() =>
      expect(document.querySelectorAll('[data-slot="card-title"]').length).toBeGreaterThan(0),
    )
    expect(hoistedTitle()).toBe('Gross revenue')
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
    expect(screen.queryAllByRole('radio')).toHaveLength(0)
  })
})

describe('§E4 — the keyboard, and the roving tab stop', () => {
  it('moves focus with the arrows and selects with Enter and Space [constructed board]', async () => {
    boardOverride = constructedBoard()
    const user = userEvent.setup()
    renderBoard('management-performance')
    await waitFor(() => expect(radios()).toHaveLength(2))

    /* The checked radio is the group's ONE tab stop (§7.2's roving pattern):
       tabbing into the band lands on the chart that is on screen. */
    expect(radios()[0]).toHaveAttribute('tabindex', '0')
    expect(radios()[1]).toHaveAttribute('tabindex', '-1')
    ;(radios()[0] as HTMLElement).focus()

    /* An arrow MOVES and does not select — this row redraws a chart on every
       change, and selecting on focus would fire a read per keypress. */
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(radios()[1])
    expect(radios()[1]).toHaveAttribute('aria-checked', 'false')

    await user.keyboard('{Enter}')
    expect(radios()[1]).toHaveAttribute('aria-checked', 'true')
    expect(hoistedTitle()).toBe(TITLE.second)

    /* And back, with the other key. Wrapping at the ends is the APG's
       behaviour: `ArrowRight` from the last lands on the first. */
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(radios()[0])
    await user.keyboard(' ')
    expect(radios()[0]).toHaveAttribute('aria-checked', 'true')
    expect(hoistedTitle()).toBe(TITLE.first)
  })
})

describe('§E4 / §E7 — the drilldown is a NAMED action on every figure', () => {
  it('names the destination in the accessible name and shows the short label', async () => {
    boardOverride = constructedBoard()
    renderBoard('management-performance')
    await waitFor(() => expect(radios()).toHaveLength(2))

    /* One action per lead, and each says which analysis it opens. The visible
       words are a SUBSET of the spoken name (§7.2's label-in-name), which is
       the property an `aria-label` would have broken. */
    const band = within(screen.getByRole('radiogroup'))
    for (const label of [TITLE.first, TITLE.second, TITLE.uncharted]) {
      const link = band.getByRole('link', { name: `Open analysis for ${label}` })
      expect(link).toHaveAttribute('href', expect.stringContaining('/management/reports'))
      expect(link.textContent).toContain('Open analysis')
    }
  })

  it('gives the figure no focus stop at all when it has no destination [constructed board]', async () => {
    const board = constructedBoard()
    board.metrics = board.metrics.map((metric) => ({ ...metric, drilldownRoute: null }))
    boardOverride = board
    renderBoard('management-performance')

    await waitFor(() => expect(radios()).toHaveLength(2))
    expect(screen.queryByRole('link', { name: /^Open analysis/u })).not.toBeInTheDocument()
  })
})

describe('§E7 — the card chrome', () => {
  it('states the RESOLVED window under the title, never a preset', async () => {
    boardOverride = constructedBoard()
    renderBoard('management-performance')
    await waitFor(() => expect(radios()).toHaveLength(2))

    /* The constructed series runs 19–21 June 2026. The sub-line says exactly
       that: not `Last 30 days`, not the board's window, and not a range with no
       year on a card that states one nowhere else. */
    const subLines = screen.getAllByText('19 Jun 2026 – 21 Jun 2026')
    expect(subLines.length).toBeGreaterThan(0)
    expect(subLines[0]?.closest('[data-slot="card-description"]')).not.toBeNull()
  })

  it('keeps the frame, the title, the window and the report link on an EMPTY card', async () => {
    const board = constructedBoard()
    board.charts = board.charts.map((chart, index) =>
      index === 0
        ? { ...chart, current: { ...chart.current, points: [] }, comparison: null }
        : chart,
    )
    boardOverride = board
    renderBoard('management-performance')

    /* §3.7: one centred sentence, and the card keeps everything else. The
       report link moved to the foot of the card with §E7, which is why the
       footer now renders on a card with no legend in it. */
    expect(
      await screen.findByText('There was no data found for this date range.'),
    ).toBeInTheDocument()
    expect(hoistedTitle()).toBe(TITLE.first)
    expect(screen.getAllByText('19 Jun 2026 – 21 Jun 2026').length).toBeGreaterThan(0)
    const card = document.querySelector('[data-slot="card"]') as HTMLElement
    expect(
      within(card).getByRole('link', { name: `Open analysis for ${TITLE.first}` }),
    ).toBeInTheDocument()
    /* Never a spinner and never an empty plot. */
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

/* ════════════ §9.5 — one mark mirrors, and it is not the caret ════════════ */

describe('Arabic — the reading mark flips and the magnitude mark does not', () => {
  it('mirrors the Open analysis arrow and leaves the delta caret alone', () => {
    const tAr = createTranslator({ dictionary: AR })
    const { container } = render(
      <MemoryRouter>
        <MetricTile
          metric={leadMetric(FIRST)}
          boardAsOf={AS_OF}
          surface="band"
          t={tAr}
          language="ar"
        />
      </MemoryRouter>,
    )

    /* The action's arrow points FORWARD THROUGH READING — *and then, the
       analysis* — so it turns around in a mirrored line. */
    const action = container.querySelector('[data-slot="open-analysis"]')
    expect(action?.querySelector('svg')?.getAttribute('class')).toMatch(/rtl:rotate-180/u)

    /* Everything else on the figure — the delta's caret above all — encodes a
       magnitude on the vertical axis and has no reading order to follow. The
       assertion is over the figure with the action removed, so it names which
       mark is the exception as well as which are not. */
    action?.remove()
    expect(container.innerHTML).not.toMatch(/rtl:/u)
    expect(container.innerHTML).not.toMatch(/rotate-/u)
    expect(container.innerHTML).not.toMatch(/-?scale-x-/u)
  })
})
