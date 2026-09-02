/**
 * **The two signals a table used to INFER and now has DECLARED to it.**
 *
 * Both defects were the same shape as P0-2's row-click regex: behaviour read
 * off the shape of a value instead of off a declaration.
 *
 *   A2   bidi isolation, chosen by `dataType` / `isolate` rather than by a
 *        regex over the rendered string.
 *   R5a  the critical row, chosen by the screen's `isRowCritical` rather than
 *        by duck-typing `r.flagged`, `r.starved`, `r.balanceHalalas < 0` …
 *
 * The assertions here are the two rulings most likely to be undone by someone
 * reading `i18n.md`'s list and adding `id` back, or by someone restoring a
 * "sensible default" for the critical row.
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createTranslator, stretchesInlineSize } from '@/lib'
import { useIndexTable } from '@/hooks'
import { EN } from '@/i18n/dictionaries'
import { DataTable, type DataColumn } from '../DataTable'
import { isolatesValue } from './columns'

const t = createTranslator({ dictionary: EN, fallback: EN })

interface Row {
  id: string
  flagged: boolean
}

const ROWS: Row[] = [
  { id: 'TRP-8001', flagged: true },
  { id: 'TRP-9003', flagged: false },
]

/* The two ids audit C read off `/operations/quick-rides`: both `Cancelled`, one
   tinted and one not, with nothing in either row to explain the difference. */
const COLUMNS: DataColumn<Row>[] = [
  { id: 'id', header: 'Trip', alwaysVisible: true, minWidth: 160, dataType: 'id', cell: (row) => row.id },
  { id: 'when', header: 'Started', width: 140, dataType: 'date', cell: () => '25 Jun 09:39' },
]

function Harness({ isRowCritical }: { isRowCritical?: (row: Row) => boolean }) {
  const table = useIndexTable<Row>({ mode: 'index', getRowId: (row) => row.id, urlState: false })
  return (
    <DataTable
      table={table}
      rows={ROWS}
      columns={COLUMNS}
      getRowId={(row) => row.id}
      status="content"
      total={ROWS.length}
      isRowCritical={isRowCritical}
      t={t}
      language="en"
      tableId="declared-row-signals"
      searchPlaceholder="Search trips"
      firstRun={{ heading: 'h', body: 'b', actions: [] }}
      noMatch={{ message: 'No trips match these filters.' }}
      error={{ message: 'e', onRetry: () => undefined }}
    />
  )
}

const rowFor = (id: string) => {
  const row = screen.getByText(id).closest('tr')
  if (!row) throw new Error(`No row for ${id}`)
  return row
}

describe('A2 — bidi isolation is declared, never sniffed', () => {
  it('isolates the numeral runs and nothing else', () => {
    const of = (column: Partial<DataColumn<Row>>) =>
      isolatesValue({ id: 'x', header: 'x', cell: () => null, ...column })

    expect(of({ dataType: 'date' })).toBe(true)
    expect(of({ dataType: 'money' })).toBe(true)
    expect(of({ dataType: 'number' })).toBe(true)

    expect(of({ dataType: 'text' })).toBe(false)
    expect(of({ dataType: 'enum' })).toBe(false)
    expect(of({ dataType: 'boolean' })).toBe(false)
  })

  /**
   * **`id` stays off the list.** A record identifier begins with a strong Latin
   * character, so the bidi algorithm already keeps it contiguous inside an
   * Arabic line — and `id` is overwhelmingly the identity column, whose cell is
   * an avatar plus a link plus a prose second line. Isolating that composite
   * resolves the whole cell's direction from its first strong character and
   * moved the Trips avatar off the inline-start edge under `dir="rtl"`,
   * measured at 1280.
   */
  it('does NOT isolate an id column, and a column may still declare it', () => {
    const column: DataColumn<Row> = { id: 'x', header: 'x', dataType: 'id', cell: () => null }
    expect(isolatesValue(column)).toBe(false)
    expect(isolatesValue({ ...column, isolate: true })).toBe(true)
    /* A plate or a phone: `text` for sorting, a single machine token to read. */
    expect(isolatesValue({ ...column, dataType: 'text', isolate: true })).toBe(true)
  })

  /** `align: 'end'` already implies `number`, so the numeric lane is covered. */
  it('follows the align default', () => {
    expect(isolatesValue({ id: 'x', header: 'x', align: 'end', cell: () => null })).toBe(true)
  })

  /**
   * **`isolate.ts` §5.4 — the `<bdi>` goes inside the box, never as the box.**
   * The wrapper's classes must not be able to stretch it; a stretched `<bdi>`
   * aligns its own text to *its* start and flushes the value to the wrong edge
   * under `dir="rtl"`.
   */
  it('renders a content-sized <bdi> on the isolated column only', () => {
    render(<Harness />)
    const date = screen.getAllByText('25 Jun 09:39')[0]?.closest('td')
    const bdi = date?.querySelector('bdi')
    expect(bdi).not.toBeNull()
    expect(stretchesInlineSize(bdi?.className)).toBe(false)
    /* Pinning `ltr` is what breaks a translated date: `25 يونيو 09:39` renders
       `25 09:39 يونيو`, the month orphaned. The isolation stays `auto`. */
    expect(bdi?.getAttribute('dir')).toBeNull()

    expect(rowFor('TRP-8001').querySelector('td bdi')).not.toBeNull()
    const identity = screen.getByText('TRP-8001').closest('td')
    expect(identity?.querySelector('bdi')).toBeNull()
  })
})

describe('R5a — the critical row is declared by the screen', () => {
  /**
   * **A table whose screen declares nothing has no critical rows.** That is the
   * correct answer, not a regression: `TRP-8001` carries `flagged` and
   * `TRP-9003` does not, and the duck-type tinted the first one for a reason no
   * column on the row stated.
   */
  it('tints nothing when no predicate is passed, whatever the row looks like', () => {
    render(<Harness />)
    expect(rowFor('TRP-8001').className).not.toMatch(/bg-row-critical/)
    expect(rowFor('TRP-9003').className).not.toMatch(/bg-row-critical/)
  })

  it('tints exactly the rows the declared predicate names', () => {
    render(<Harness isRowCritical={(row) => row.flagged} />)
    expect(rowFor('TRP-8001').className).toMatch(/bg-row-critical/)
    expect(rowFor('TRP-9003').className).not.toMatch(/bg-row-critical/)
  })
})
