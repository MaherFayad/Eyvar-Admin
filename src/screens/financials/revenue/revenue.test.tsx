/**
 * Financials › Revenue & Refunds — **AC-355**, **AC-356**, **AC-360**.
 *
 * **No spies.** AC-356's second half is a negative — *"it never displays an
 * invoice number it did not match"* — and a bare `vi.spyOn` would let that pass
 * without ever watching. It is asserted instead against the rendered cell and
 * against the set of invoice numbers that exist, so a fabricated link would
 * have to be one of them and would be caught.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  disableMockLatency,
  getRouteTable,
  listCreditNotes,
  listRevenueByPlan,
  resetDataLayer,
} from '@/data/clients'
import type { SubTabRoute } from '@/data/types'
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

function mount(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider>
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
    mount('/financials/revenue?view=revenue')
    await waitFor(() => expect(screen.getByText(EN['fin.revenue.byPlan.total'] as string)).toBeTruthy())

    const rows = await listRevenueByPlan({ start: '2026-06-01', end: '2026-06-30' })
    expect(rows.length).toBeGreaterThan(1)

    const totals = {
      activeSubs: rows.reduce((sum, plan) => sum + plan.activeSubs, 0),
      trips: rows.reduce((sum, plan) => sum + plan.trips, 0),
      grossHalalas: rows.reduce((sum, plan) => sum + plan.grossHalalas, 0),
      platformHalalas: rows.reduce((sum, plan) => sum + plan.platformHalalas, 0),
      captainHalalas: rows.reduce((sum, plan) => sum + plan.captainHalalas, 0),
    }

    const totalCard = screen
      .getByText(EN['fin.revenue.byPlan.total'] as string)
      .parentElement as HTMLElement
    const text = totalCard.textContent ?? ''

    const count = (value: number) => value.toLocaleString('en-US')
    expect(text).toContain(count(totals.activeSubs))
    expect(text).toContain(count(totals.trips))
    expect(text).toContain(money(totals.grossHalalas))
    expect(text).toContain(money(totals.platformHalalas))
    expect(text).toContain(money(totals.captainHalalas))

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
