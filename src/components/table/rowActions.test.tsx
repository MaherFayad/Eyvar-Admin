/**
 * `RowAction.reason` — §11.2's second clause, **AC-368**.
 *
 * ## Written against the failure mode, not the feature
 *
 * The defect this covers was *"a disabled control exists and says nothing"*, so
 * a presence check — *"a description is rendered"* — passes for a component
 * that hard-codes one sentence for every refused row, which is the same defect
 * wearing a description. Every assertion below is therefore a **relationship**:
 *
 * - the reason a row renders is **that row's** reason, and two rows refused for
 *   different causes render different sentences;
 * - an **enabled** row renders no reason at all, so the sentence is a reading of
 *   the predicate and not decoration;
 * - the control's accessible **name** is still exactly its label, so the
 *   description did not leak into the name.
 *
 * No spies: `reason` is called by the component under test and the strings are
 * read back off the rendered DOM.
 */

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { RowActionMenuItem, SingleRowAction, type RowAction } from './rowActions'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

interface Row {
  id: string
  bank: boolean
  net: number
}

const ROWS: Row[] = [
  { id: 'no-bank', bank: false, net: 500 },
  { id: 'nothing-net', bank: true, net: 0 },
  { id: 'payable', bank: true, net: 500 },
]

/** The shape a screen declares: one function decides the refusal AND names it. */
const PAY: RowAction<Row> = {
  label: 'Pay',
  onSelect: () => undefined,
  disabled: (row) => withheld(row) !== null,
  reason: (row) => withheld(row),
}

function withheld(row: Row): string | null {
  if (!row.bank) return 'Add a bank account before paying this captain.'
  if (row.net <= 0) return 'Nothing is payable after cash debt.'
  return null
}

/** The description a control points at, resolved to its text. */
function describedText(control: HTMLElement): string {
  const id = control.getAttribute('aria-describedby')
  if (id === null) return ''
  return (document.getElementById(id)?.textContent ?? '').trim()
}

describe('the labelled shape', () => {
  it('renders each refused row its OWN reason, and a payable row none', () => {
    render(
      <ul>
        {ROWS.map((row) => (
          <li key={row.id} data-testid={row.id}>
            <SingleRowAction action={PAY} row={row} />
          </li>
        ))}
      </ul>,
    )

    const controlIn = (id: string) =>
      within(screen.getByTestId(id)).getByRole('button', { name: 'Pay' })

    const noBank = describedText(controlIn('no-bank'))
    const nothingNet = describedText(controlIn('nothing-net'))

    /* Each is its row's own sentence — and the two DIFFER, which a single
       hard-coded reason could not do. */
    expect(noBank).toBe(withheld(ROWS[0] as Row))
    expect(nothingNet).toBe(withheld(ROWS[1] as Row))
    expect(noBank).not.toBe(nothingNet)

    /* Both are on screen as text, not only in an attribute: §5.7 keeps a
       constraint from being carried by a tooltip ALONE. R2-3 adds `title` as
       reinforcement beside the control, so the rendered text is what this
       asserts and the tooltip only has to agree with it. */
    expect(screen.getByText(noBank)).toBeTruthy()
    expect(controlIn('no-bank').getAttribute('title')).toBe(noBank)

    /* The payable row is enabled and describes nothing — so the sentences above
       are a reading of the predicate rather than furniture on every row. */
    const live = controlIn('payable')
    expect(live.getAttribute('disabled')).toBeNull()
    expect(describedText(live)).toBe('')
  })

  it('leaves the accessible name as the bare label', () => {
    render(<SingleRowAction action={PAY} row={ROWS[0] as Row} />)
    /* Found by the exact label, with the reason on screen at the same time. */
    expect(screen.getByRole('button', { name: 'Pay' })).toBeTruthy()
  })
})

describe('the menu shape', () => {
  it('puts the reason inside the item without folding it into the item’s name', async () => {
    const user = userEvent.setup()
    render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button>Row actions</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <RowActionMenuItem action={PAY} row={ROWS[0] as Row} />
        </DropdownMenuContent>
      </DropdownMenu>,
    )

    await user.click(screen.getByRole('button', { name: 'Row actions' }))

    /* The name is still the label — a caller that finds an action by its label
       keeps finding it after the reason lands inside the item. */
    const item = await screen.findByRole('menuitem', { name: 'Pay' })
    expect(item.getAttribute('aria-disabled')).toBe('true')

    /* And the reason is inside that item, as §8.4.4's second line. */
    expect(describedText(item)).toBe(withheld(ROWS[0] as Row))
    expect(item.textContent).toContain(withheld(ROWS[0] as Row))
  })
})
