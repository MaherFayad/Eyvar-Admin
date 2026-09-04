/**
 * **R2-3** — `reserveRefusal` held two empty lines open on every row of a page
 * that contained one refused row; AC-368 wants the reason in place, never under
 * the button. jsdom does no layout, so the pitch is measured in Chromium and
 * the CAUSE is asserted here: an unrefused row's lane holds only its control.
 */

import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createTranslator } from '@/lib'
import { useIndexTable } from '@/hooks'
import { EN } from '@/i18n/dictionaries'
import { DataTable, type DataColumn, type RowAction } from '../DataTable'

const t = createTranslator({ dictionary: EN, fallback: EN })

interface Row {
  id: string
  captain: string
  state: 'due' | 'paid'
}

const ROWS: Row[] = [
  { id: 'CPT-1', captain: 'Khalid Mansour', state: 'due' },
  { id: 'CPT-2', captain: 'Omar Nasser', state: 'paid' },
  { id: 'CPT-3', captain: 'Yousef Aziz', state: 'due' },
]

const PAID_REASON = 'This payout is already paid.'

const PAY: RowAction<Row> = {
  label: 'Pay',
  onSelect: () => undefined,
  disabled: (row) => row.state === 'paid',
  reason: (row) => (row.state === 'paid' ? PAID_REASON : null),
}

function columns(declareCarrier: boolean): DataColumn<Row>[] {
  return [
    {
      id: 'captain',
      header: 'Captain',
      alwaysVisible: true,
      minWidth: 160,
      dataType: 'text',
      cell: (row) => row.captain,
      secondaryLine: (row) => row.id,
    },
    {
      id: 'state',
      header: 'State',
      width: 120,
      dataType: 'enum',
      emphasis: 'data',
      carriesRefusalReason: declareCarrier || undefined,
      cell: (row) => row.state,
    },
  ]
}

function Harness({ declareCarrier = true }: { declareCarrier?: boolean }) {
  const table = useIndexTable<Row>({ mode: 'index', getRowId: (row) => row.id, urlState: false })
  return (
    <DataTable
      table={table}
      rows={ROWS}
      columns={columns(declareCarrier)}
      getRowId={(row) => row.id}
      status="content"
      total={ROWS.length}
      rowActions={[PAY]}
      t={t}
      language="en"
      tableId="refusal-row"
      searchPlaceholder="Search payouts"
      firstRun={{ heading: 'h', body: 'b', actions: [] }}
      noMatch={{ message: 'No payouts match these filters.' }}
      error={{ message: 'e', onRetry: () => undefined }}
    />
  )
}

const rowFor = (captain: string) => {
  const row = screen.getByText(captain).closest('tr')
  if (!row) throw new Error(`No row for ${captain}`)
  return row
}

/** The lane cell that holds the row's `Pay`. */
const actionCell = (row: HTMLElement) => {
  const cell = row.querySelector<HTMLElement>('[data-row-actions="direct"]')?.closest('td')
  if (!cell) throw new Error('No action lane on this row')
  return cell
}

describe('R2-3 — a refused row states its reason, and no sibling row grows', () => {
  /**
   * The reservation, gone. Every unrefused row's lane holds its button and
   * nothing else — no empty box standing in for a refusal on another row.
   */
  it('renders nothing but the control in an unrefused row’s action lane', () => {
    render(<Harness />)

    for (const captain of ['Khalid Mansour', 'Yousef Aziz']) {
      const lane = actionCell(rowFor(captain))
      expect(within(lane).getByRole('button', { name: 'Pay' })).toBeTruthy()
      expect(lane.textContent).toBe('Pay')
      /* The `aria-hidden` spacer `reserveRefusal` used to leave behind. */
      expect(lane.querySelector('[aria-hidden="true"]')).toBeNull()
    }
  })

  it('renders the reason in the refused row, and in no other row', () => {
    render(<Harness />)

    const refused = rowFor('Omar Nasser')
    expect(within(refused).getByText(PAID_REASON)).toBeTruthy()
    /* Once — not once per action, and not once per row on the page. */
    expect(screen.getAllByText(PAID_REASON)).toHaveLength(1)
    expect(rowFor('Khalid Mansour').textContent).not.toContain(PAID_REASON)
  })

  /** The reason is a fact about the row's state, so the state cell holds it. */
  it('puts the reason in the cell the table declares as its carrier', () => {
    render(<Harness />)

    const stateCell = screen.getByText(PAID_REASON).closest('td')
    expect(stateCell?.textContent).toBe(`paid${PAID_REASON}`)
  })

  /** No declaration is a valid answer: the identity cell takes it. */
  it('falls back to the primary cell when no column declares it', () => {
    render(<Harness declareCarrier={false} />)

    const cell = screen.getByText(PAID_REASON).closest('td')
    expect(cell?.textContent).toBe(`Omar NasserCPT-2${PAID_REASON}`)
  })

  /**
   * AC-368's second clause survives the move: the control is still dead in
   * place and still says why, by description rather than by adjacency.
   */
  it('keeps the reason as the disabled control’s accessible description', () => {
    render(<Harness />)

    const refused = rowFor('Omar Nasser')
    const control = within(refused).getByRole('button', { name: 'Pay' })
    expect(control.hasAttribute('disabled')).toBe(true)

    const describedBy = control.getAttribute('aria-describedby')
    expect(describedBy).not.toBeNull()
    expect(document.getElementById(describedBy as string)?.textContent).toBe(PAID_REASON)

    /* The description did not become the name, and an enabled row describes
       nothing at all. */
    const live = within(rowFor('Khalid Mansour')).getByRole('button', { name: 'Pay' })
    expect(live.hasAttribute('disabled')).toBe(false)
    expect(live.getAttribute('aria-describedby')).toBeNull()
  })
})
