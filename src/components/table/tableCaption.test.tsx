/**
 * **The `caption` slot — the sign convention that has to reach the operator.**
 *
 * `liability.driver` is credit-normal, so on the captain earnings ledger a
 * CREDIT means Eyvar owes MORE — the inverse of every wallet in the console.
 * `ar.driver` inverts the same way. An operator who reads either as a wallet
 * reads every row backwards, so the sentence that defines the two columns is
 * load-bearing rather than decorative.
 *
 * The assertions here are the three properties that made a real `<caption>` the
 * answer instead of a paragraph the screen renders above the table, and each
 * one is a property a well-meaning refactor would take away:
 *
 *   1. it is a `<caption>` ELEMENT, so it is part of the table;
 *   2. it is the table's FIRST child, which is what puts it above the header
 *      row and what makes assistive technology announce it on entry;
 *   3. it becomes the table's ACCESSIBLE NAME — the property a `<div>` styled
 *      to look identical does not have, and the whole reason a paragraph above
 *      the table was refused.
 *
 * Where it must NOT appear is asserted too. A table that passes no caption has
 * no `<caption>` node at all, which is what keeps this additive for the forty
 * screens that do not want one.
 *
 * `caption-side` is asserted as the declared class rather than as a computed
 * value: jsdom does no layout. It was measured in Chromium instead —
 * `caption-side: top` on the caption against `bottom` on the table, the caption
 * box above `<thead>` at both 1280 and 1152 in English and Arabic.
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createTranslator } from '@/lib'
import { useIndexTable } from '@/hooks'
import { EN } from '@/i18n/dictionaries'
import { DataTable, type DataColumn } from '../DataTable'

const t = createTranslator({ dictionary: EN, fallback: EN })

interface Posting {
  id: string
}

const ROWS: Posting[] = [{ id: 'EAR-5001' }, { id: 'EAR-5002' }]

const COLUMNS: DataColumn<Posting>[] = [
  {
    id: 'reference',
    header: 'Reference',
    alwaysVisible: true,
    minWidth: 160,
    dataType: 'id',
    cell: (row) => row.id,
  },
  { id: 'credit', header: 'Credit', width: 120, dataType: 'money', cell: () => '120.00' },
  { id: 'debit', header: 'Debit', width: 120, dataType: 'money', cell: () => '—' },
]

const SENTENCE = 'A credit is money earned. A debit is money paid out or deducted.'

function Ledger({ caption }: { caption?: React.ReactNode }) {
  const table = useIndexTable({ mode: 'ledger', urlState: false })
  return (
    <DataTable
      table={table}
      rows={ROWS}
      columns={COLUMNS}
      getRowId={(row: Posting) => row.id}
      status="content"
      total={ROWS.length}
      t={t}
      language="en"
      tableId="table-caption"
      searchPlaceholder="Search postings"
      caption={caption}
      firstRun={{ heading: 'h', body: 'b', actions: [] }}
      noMatch={{ message: 'n' }}
      error={{ message: 'e', onRetry: () => undefined }}
    />
  )
}

const tableEl = () => {
  const el = document.querySelector('table')
  if (!el) throw new Error('no table')
  return el
}

describe('the caption slot — a column convention that reaches the operator', () => {
  it('renders a real <caption>, not a styled div', () => {
    render(<Ledger caption={SENTENCE} />)

    const caption = tableEl().querySelector('caption')
    expect(caption, 'a div here loses every property the slot exists for').toBeTruthy()
    expect(caption!.textContent).toBe(SENTENCE)
  })

  it('is the table\u2019s FIRST child, which is what puts it above the header row', () => {
    render(<Ledger caption={SENTENCE} />)

    /* HTML's content model is `caption?, colgroup*, thead?, tbody*` — a caption
       anywhere else is invalid, and a caption after `<thead>` is what a
       refactor that "tidied" the render order would produce. */
    expect(tableEl().firstElementChild?.tagName).toBe('CAPTION')
    expect(tableEl().querySelector('thead')).toBeTruthy()
  })

  it('carries caption-top, against the caption-bottom the shared primitive sets', () => {
    render(<Ledger caption={SENTENCE} />)

    const caption = tableEl().querySelector('caption')!
    /* `ui/table.tsx` puts `caption-bottom` on every table in the product and
       `caption-side` is inherited, so this declaration is the only thing
       standing between the sentence and the bottom of the table. Measured in
       Chromium: computed `top` on the caption, `bottom` on the table. */
    expect(caption.className).toContain('caption-top')
    expect(tableEl().className).toContain('caption-bottom')
  })

  it('becomes the accessible name of the table \u2014 the reason a paragraph was refused', () => {
    render(<Ledger caption={SENTENCE} />)

    /* This is the property a paragraph before the table does not have. A screen
       reader announces it on ENTERING the table, where the operator is about to
       read the two columns it defines, rather than before it where anyone
       navigating by table or by heading skips it. */
    expect(screen.getByRole('table', { name: SENTENCE })).toBeTruthy()
  })

  it('renders NO caption node when the prop is absent \u2014 the forty other screens', () => {
    render(<Ledger />)

    expect(tableEl().querySelector('caption')).toBeNull()
    expect(tableEl().firstElementChild?.tagName).toBe('THEAD')
  })

  it('renders no caption for an empty string, rather than an empty one', () => {
    render(<Ledger caption="" />)

    /* A screen building its sentence from a record still in flight hands over
       `''`. An empty `<caption>` is a table claiming a description it has not
       got, and it would take the accessible name with it. */
    expect(tableEl().querySelector('caption')).toBeNull()
  })

  it('takes a node, so a screen can emphasise the two words it is defining', () => {
    render(
      <Ledger
        caption={
          <>
            A <strong>credit</strong> is money earned.
          </>
        }
      />,
    )

    const caption = tableEl().querySelector('caption')!
    expect(caption.querySelector('strong')?.textContent).toBe('credit')
  })
})
