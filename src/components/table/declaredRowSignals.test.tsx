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
import { RowCriticalMarker } from '../StatusBadge'
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
  {
    id: 'id',
    header: 'Trip',
    alwaysVisible: true,
    minWidth: 160,
    dataType: 'id',
    /* The marker is drawn by the screen, inside the identity cell — exactly as
       all sixteen call sites do, because a trip row carries the marker while
       refusing the tint and one predicate cannot express both. */
    cell: (row) => (
      <>
        {row.flagged && <RowCriticalMarker />}
        {row.id}
      </>
    ),
  },
  { id: 'when', header: 'Started', width: 140, dataType: 'date', cell: () => '25 Jun 09:39' },
]

function Harness({
  isRowCritical,
  selectable = false,
}: {
  isRowCritical?: (row: Row) => boolean
  selectable?: boolean
}) {
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
      /* D25 — the select lane exists only when a bulk command does. */
      bulkActions={selectable ? [{ label: 'Suspend', onClick: () => undefined }] : undefined}
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

/**
 * **V-05 — the leading-edge marker lands on the row's edge, not a cell's.**
 *
 * The marker is absolutely positioned and every screen renders it inside the
 * identity cell. That cell is pinned, and a pinned cell is positioned, so it —
 * not the row — is the marker's containing block. The marker's own inset
 * cancels one cell's inline padding, which reaches the row's leading edge only
 * while the identity cell is the first cell in the row.
 *
 * On the six screens that have both a bulk command and a marker it is not: the
 * select lane sits ahead of it, and the marker drew a red rule down the middle
 * of the row, between the checkbox and the identity. `DataTable` publishes the
 * distance because the lane's width is a number only it holds.
 *
 * **Both halves, every time.** Asserting the offset appears with selection on
 * would pass just as well against a row that published it unconditionally —
 * which would push the marker off the leading edge on the other ten screens.
 * The paired assertion is that a table with no bulk command publishes nothing
 * and the marker keeps its own default.
 */
describe('V-05 — the marker is anchored to the row, not to the identity cell', () => {
  const markerIn = (row: HTMLElement) => row.querySelector<HTMLElement>('span[class*="bg-destructive"]')

  it('publishes the select lane as an offset when a bulk command exists', () => {
    render(<Harness isRowCritical={(row) => row.flagged} selectable />)
    const row = rowFor('TRP-8001')

    /* The positive half of the cause: the lane this offset accounts for is
       really there. Without it the assertion below could pass on a table that
       simply always publishes the offset. */
    expect(row.querySelector('input[type="checkbox"], [role="checkbox"]')).not.toBeNull()

    /* 0.75rem cancels the identity cell's own inline padding; 40px is the
       select lane. Together they reach the row's leading edge. */
    expect(row.style.getPropertyValue('--ev-row-marker-start')).toBe('calc(-0.75rem - 40px)')
    expect(markerIn(row)).not.toBeNull()
  })

  it('publishes nothing when there is no select lane, leaving the marker default', () => {
    render(<Harness isRowCritical={(row) => row.flagged} />)
    const row = rowFor('TRP-8001')

    expect(row.querySelector('input[type="checkbox"], [role="checkbox"]')).toBeNull()
    expect(row.style.getPropertyValue('--ev-row-marker-start')).toBe('')
    expect(markerIn(row)).not.toBeNull()
  })

  /**
   * The marker must actually READ the property. Without this, reverting
   * `StatusBadge` to a fixed inset leaves both tests above green while the red
   * rule returns to the middle of the row.
   */
  it('reads the offset rather than fixing its own inset', () => {
    render(<Harness isRowCritical={(row) => row.flagged} selectable />)
    const marker = markerIn(rowFor('TRP-8001'))

    expect(marker?.className).toContain('var(--ev-row-marker-start,-0.75rem)')
    /* The physical-direction rule (§9.1): the inset mirrors under dir="rtl",
       so it is an inline property and never `left`. */
    expect(marker?.className).toContain('inset-inline-start')
    expect(marker?.className).not.toMatch(/(^|[^-])left-/)
  })

  /** A row the screen did not name carries no marker at all. */
  it('draws no marker on a row the screen did not name', () => {
    render(<Harness isRowCritical={(row) => row.flagged} selectable />)
    expect(markerIn(rowFor('TRP-9003'))).toBeNull()
  })
})
