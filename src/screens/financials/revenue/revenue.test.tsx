/**
 * Financials › Revenue & Refunds — **AC-355**, **AC-356**, **AC-360**, and
 * the four master-detail criteria of FINANCIALS-UX-PLAN §4.7.
 *
 * **No spies.** AC-356's second half is a negative — *"it never displays an
 * invoice number it did not match"* — and a bare `vi.spyOn` would let that pass
 * without ever watching. It is asserted instead against the rendered cell and
 * against the set of invoice numbers that exist, so a fabricated link would
 * have to be one of them and would be caught.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  disableMockLatency,
  getPlanRevenueDetail,
  getRouteTable,
  listCreditNotes,
  listRevenueByPlan,
  resetDataLayer,
} from '@/data/clients'
import type { RevenueByPlanRow, SubTabRoute } from '@/data/types'
import { EN } from '@/i18n/dictionaries'
import { ShellProvider } from '@/shell/ShellContext'
import { RevenueScreen } from './RevenueScreen'

const revenueRow = (): SubTabRoute => {
  const row = getRouteTable().subTabs.find((each) => each.subTabId === 'financials-revenue')
  if (!row) throw new Error('No route-table row for financials-revenue')
  return row
}

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
})

/**
 * The H6 preset (V-12) drops three columns from the default set; `Columns` is
 * how an operator puts one back, and this is that path.
 */
async function showColumn(user: ReturnType<typeof userEvent.setup>, header: string) {
  await user.click(screen.getByRole('button', { name: EN['table.columns'] as string }))
  await user.click(
    await screen.findByRole('checkbox', {
      name: (EN['table.columns.toggleVisible'] as string).replace('{column}', header),
    }),
  )
  await user.keyboard('{Escape}')
}

/** The search string the screen is actually on, so `?plan=` can be asserted. */
let currentSearch = ''
const search = () => currentSearch

function LocationProbe() {
  currentSearch = useLocation().search
  return null
}

function mount(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider>
        <LocationProbe />
        <RevenueScreen row={revenueRow()} />
      </ShellProvider>
    </MemoryRouter>,
  )
}

function rowFor(text: string): HTMLElement {
  const tr = screen.getByText(text).closest('tr')
  if (!tr) throw new Error(`No row for ${text}`)
  return tr
}

const money = (halalas: number) =>
  (halalas / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/* ═════════════════════ AC-355 — the total row adds up ═══════════════════ */

describe('AC-355 — `Revenue by plan` is computed, and its total is its rows', () => {
  /**
   * *"…its total row equals the sum of its data rows **for every column**."*
   *
   * The failure this exists to catch is `12a` R12: a header claiming
   * `Eyvar net 9,246 / 19.2%` above a table saying `8,752 / 18.1%`. So the sums
   * are taken from the **client's own rows** and compared with what is on
   * screen, column by column — a total served independently of the rows could
   * agree on one column and drift on another, and five separate assertions
   * catch that where one aggregate would not.
   */
  it('every column of the total equals the sum of the rows above it', async () => {
    mount('/financials/revenue?view=by-plan&mode=table')
    await waitFor(() =>
      expect(screen.getByText(EN['fin.revenue.byPlan.total'] as string)).toBeTruthy(),
    )

    const rows = await listRevenueByPlan({ start: '2026-06-01', end: '2026-06-30' })
    expect(rows.length).toBeGreaterThan(1)

    /* One expected string per column that HAS a total, keyed by the header the
       operator reads. Driven off the header row rather than off a fixed index,
       so hiding a column (H6) moves the assertion with it instead of breaking
       it — and so "for every column" means every column on screen. */
    const sum = (read: (plan: (typeof rows)[number]) => number) =>
      rows.reduce((running, plan) => running + read(plan), 0)
    const expected: Record<string, string> = {
      [EN['fin.revenue.byPlan.subs'] as string]: sum((plan) => plan.activeSubs).toLocaleString(
        'en-US',
      ),
      [EN['fin.revenue.byPlan.trips'] as string]: sum((plan) => plan.trips).toLocaleString('en-US'),
      [EN['fin.revenue.byPlan.gross'] as string]: money(sum((plan) => plan.grossHalalas)),
      [EN['fin.revenue.byPlan.platform'] as string]: money(sum((plan) => plan.platformHalalas)),
      [EN['fin.revenue.byPlan.givebacks'] as string]: money(
        sum((plan) => plan.givebacksHalalas ?? 0),
      ),
      [EN['fin.revenue.byPlan.contribution'] as string]: money(
        sum((plan) => plan.platformHalalas - (plan.givebacksHalalas ?? 0)),
      ),
    }

    /* V-11 — the total is a FOOTER ROW of the table now, not a card 320px
       below the last row. It is read off the `<tr>` it lives in. */
    const totalRow = screen
      .getByText(EN['fin.revenue.byPlan.total'] as string)
      .closest('tr') as HTMLElement
    expect(totalRow).toBeTruthy()

    const headers = screen.getAllByRole('columnheader').map((cell) => cell.textContent?.trim() ?? '')
    const cells = within(totalRow).getAllByRole('cell')
    let asserted = 0
    headers.forEach((header, index) => {
      const want = expected[header]
      if (want === undefined) return
      expect(cells[index]?.textContent?.trim()).toBe(want)
      asserted += 1
    })
    /* Every column that carries a total was found and checked, not zero of them. */
    expect(asserted).toBe(Object.keys(expected).length)

    /* And the rows really are on screen, so the totals describe what is above
       them rather than a population the operator cannot see. */
    for (const plan of rows) {
      expect(within(rowFor(plan.planName)).getByText(money(plan.grossHalalas))).toBeTruthy()
    }

    /* The split holds per row: platform + captain is the gross, to the halala.
       A total that agreed while a row did not would still be wrong. */
    for (const plan of rows) {
      expect(plan.platformHalalas + plan.captainHalalas).toBe(plan.grossHalalas)
    }
  })
})

/* ═══════════════════ AC-356 — the unmatched credit note ═════════════════ */

describe('AC-356 — a credit note with no matched invoice', () => {
  /**
   * Four clauses, four assertions: it renders `unlinked` in words, it carries
   * the row-level critical signal, it is counted in a page banner, and it
   * **never displays an invoice number it did not match**.
   *
   * The last one is the one legacy fails (`:15857` borrows the rider's first
   * paid payment), and it is asserted against the set of real invoice numbers
   * on screen: a fabricated link would be one of them, and the unlinked row's
   * cell holds none of them.
   */
  it('says so in words, carries the marker and the banner, and names no invoice', async () => {
    mount('/financials/revenue?view=credit-notes')
    await waitFor(() => expect(screen.getByText('EYV-CN-2026-000043')).toBeTruthy())

    const notes = await listCreditNotes({ pageSize: 100 })
    const unlinked = notes.items.filter((note) => note.unlinked)
    const linked = notes.items.filter((note) => !note.unlinked)
    expect(unlinked.length).toBeGreaterThan(0)
    expect(linked.length).toBeGreaterThan(0)

    const row = rowFor('EYV-CN-2026-000043')

    /* 1 — the words. */
    expect(within(row).getByText(EN['fin.creditNote.unlinked'] as string)).toBeTruthy()

    /* 2 — R5a's row marker, not a badge. */
    expect(row.querySelectorAll('.bg-destructive').length).toBeGreaterThan(0)
    expect(row.querySelectorAll('[data-slot="badge"]')).toHaveLength(0)

    /* 3 — one page banner, with the count. */
    expect(screen.getByText(EN['fin.creditNote.unlinked.title'] as string)).toBeTruthy()
    expect(screen.getAllByText(EN['fin.creditNote.unlinked.body'] as string)).toHaveLength(1)

    /* 4 — no invoice number it did not match. The linked rows show theirs, so
       the query is looking in the right cell. */
    for (const note of linked) {
      expect(within(rowFor(note.noteNumber)).getByText(note.againstInvoice as string)).toBeTruthy()
      expect(row.textContent).not.toContain(note.againstInvoice)
    }
  })

  /**
   * **AC-360** — *"a credit note's issue date is the date it was issued, not a
   * frozen constant. Two credit notes issued on different days carry different
   * dates."*
   *
   * The assertion is that the **rendered** dates differ, which is what a frozen
   * constant cannot do. Legacy freezes it (`12a` R18) and would render three
   * identical cells here.
   */
  it('AC-360 — two notes issued on different days render different dates', async () => {
    mount('/financials/revenue?view=credit-notes')
    await waitFor(() => expect(screen.getByText('EYV-CN-2026-000041')).toBeTruthy())

    const notes = await listCreditNotes({ pageSize: 100 })
    const distinctSource = new Set(notes.items.map((note) => note.issuedAt.slice(0, 10)))
    expect(distinctSource.size).toBeGreaterThan(1)

    /* The Issued column, read off the rows. */
    const issuedIndex = screen
      .getAllByRole('columnheader')
      .findIndex((header) => header.textContent?.trim() === EN['fin.creditNote.col.issued'])
    expect(issuedIndex).toBeGreaterThan(-1)

    const rendered = notes.items.map((note) => {
      const cells = within(rowFor(note.noteNumber)).getAllByRole('cell')
      return cells[issuedIndex]?.textContent?.trim() ?? ''
    })
    expect(new Set(rendered).size).toBe(distinctSource.size)
    for (const value of rendered) expect(value).not.toBe('')
  })
})

/* ══════════════ §4 — the plan master-detail (FINANCIALS-UX-PLAN) ═════════ */

describe('§4 — `Revenue by plan` is a master-detail driven by `?plan=`', () => {
  /**
   * *"Selecting a plan changes the URL and every detail figure."*
   *
   * Both halves matter and neither implies the other: a screen could paint the
   * new plan and leave the URL behind — and then the link an operator sends a
   * colleague opens a different plan from the one they were looking at.
   */
  it('selecting a plan writes `?plan=` and repaints the detail figures', async () => {
    const user = userEvent.setup()
    mount('/financials/revenue?view=by-plan')

    const first = await screen.findByRole('button', { name: /^Weekly/ })
    expect(first).toHaveAttribute('aria-current', 'true')

    /* The gross of `weekly`, in the detail. `Bi-weekly`'s is a different
       number, so the assertion after the click cannot pass by accident. */
    const plans = await listRevenueByPlan({ start: '2026-06-01', end: '2026-06-30' })
    const weekly = plans.find((plan) => plan.planId === 'weekly') as RevenueByPlanRow
    const biweekly = plans.find((plan) => plan.planId === 'biweekly') as RevenueByPlanRow
    expect(weekly.grossHalalas).not.toBe(biweekly.grossHalalas)

    await waitFor(() =>
      expect(
        within(screen.getByRole('region', { name: 'Weekly' })).getByText(
          money(weekly.grossHalalas),
        ),
      ).toBeTruthy(),
    )

    await user.click(screen.getByRole('button', { name: /^Bi-weekly/ }))

    await waitFor(() => expect(search()).toContain('plan=biweekly'))
    await waitFor(() => expect(screen.getByRole('region', { name: 'Bi-weekly' })).toBeTruthy())
    const detail = screen.getByRole('region', { name: 'Bi-weekly' })
    expect(within(detail).getByText(money(biweekly.grossHalalas))).toBeTruthy()
    /* The old plan's figures are GONE, not merely joined by new ones. */
    expect(within(detail).queryByText(money(weekly.grossHalalas))).toBeNull()
    expect(screen.queryByRole('region', { name: 'Weekly' })).toBeNull()
    expect(screen.getByRole('button', { name: /^Bi-weekly/ })).toHaveAttribute(
      'aria-current',
      'true',
    )
  })

  /**
   * **§2.5's fixture invariant, for every plan.**
   *
   * `Σ daily.gross === row.gross` and `Σ daily.contribution === platform −
   * givebacks`. A chart that does not sum to the tile beside it is `12a` R12
   * drawn instead of typed, and this is the assertion that stops a fixture
   * author minting a nicer-looking series.
   */
  it('the day series of every plan sums to its index row', async () => {
    const period = { start: '2026-06-01', end: '2026-06-30' }
    const plans = await listRevenueByPlan(period)
    expect(plans.length).toBeGreaterThan(1)

    for (const plan of plans) {
      const detail = await getPlanRevenueDetail({ planId: plan.planId, period })
      expect(detail.daily.length).toBeGreaterThan(0)
      const gross = detail.daily.reduce((sum, point) => sum + point.grossHalalas, 0)
      const contribution = detail.daily.reduce(
        (sum, point) => sum + point.contributionHalalas,
        0,
      )
      expect(gross).toBe(plan.grossHalalas)
      expect(contribution).toBe(plan.platformHalalas - (plan.givebacksHalalas ?? 0))
    }
  })

  /**
   * **Quick rides is not a plan and the screen never pretends otherwise.**
   *
   * It has no subscribers, so ARPA is `gross / 0` — not computable, which
   * AC-342 renders as an em dash and never as `0.00` — and the facts line
   * states trips alone rather than `0 active subs`.
   */
  it('quick rides renders an em dash for ARPA and states no subscription count', async () => {
    const user = userEvent.setup()
    mount('/financials/revenue?view=by-plan&plan=quick-ride')

    const plans = await listRevenueByPlan({ start: '2026-06-01', end: '2026-06-30' })
    const quick = plans.find((plan) => plan.planId === 'quick-ride') as RevenueByPlanRow
    expect(quick.activeSubs).toBe(0)

    /* The URL Pricing links to selects the plan on arrival — no click. */
    const row = await screen.findByRole('button', { name: /^Quick rides/ })
    expect(row).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('region', { name: 'Quick rides' })).toBeTruthy()
    /* The trips are stated and the subscription count is not — `0 active subs`
       on a thing that is not a plan is a fact about nothing. */
    expect(row.textContent).toContain(quick.trips.toLocaleString('en-US'))
    expect(row.textContent).not.toContain('active subs')

    await user.click(screen.getByRole('tab', { name: EN['fin.revenue.mode.table'] as string }))
    await waitFor(() => expect(rowFor('Quick rides')).toBeTruthy())

    /* ARPA is off the default set under H6, so an operator asks for it. */
    await showColumn(user, EN['fin.revenue.byPlan.arpa'] as string)
    const arpaIndex = screen
      .getAllByRole('columnheader')
      .findIndex((header) => header.textContent?.trim() === EN['fin.revenue.byPlan.arpa'])
    expect(arpaIndex).toBeGreaterThan(-1)
    const cells = within(rowFor('Quick rides')).getAllByRole('cell')
    expect(cells[arpaIndex]?.textContent?.trim()).toBe('—')
  })

  /**
   * **`Table` mode is the table that always shipped** — the same four rows and
   * the AC-355 total, now as a footer row. The mode rides in the URL, so a
   * reload keeps the drawing the operator chose.
   */
  it('`Table` mode renders the total row and the same four plans', async () => {
    mount('/financials/revenue?view=by-plan&mode=table')
    await waitFor(() =>
      expect(screen.getByText(EN['fin.revenue.byPlan.total'] as string)).toBeTruthy(),
    )

    const plans = await listRevenueByPlan({ start: '2026-06-01', end: '2026-06-30' })
    for (const plan of plans) {
      expect(within(rowFor(plan.planName)).getByText(money(plan.grossHalalas))).toBeTruthy()
    }
    expect(
      screen.getByText(EN['fin.revenue.byPlan.total'] as string).closest('tfoot'),
    ).toBeTruthy()
  })
})
