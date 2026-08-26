/**
 * The mechanical invariants of the per-column controls — the ones a reviewer
 * cannot check by reading, and the one that already fired in production.
 *
 * This is **not** the AC verdict for AC-80…AC-116; that is qa-engineer's, from
 * `docs/05-restructure/design/01-table-controls.md`. These are the assertions
 * the implementation itself needs to keep standing while it is refactored:
 * the shapes that are cheap to break and expensive to notice.
 */

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { createTranslator } from '@/lib'
import { useIndexTable } from '@/hooks'
import { EN } from '@/i18n/dictionaries'
import { DataTable, type DataColumn } from '../DataTable'
import { scrolledInline } from './pinning'
import { columnFilterValueOf, filteredLabelParts, summariseColumnFilter } from './columns'

const t = createTranslator({ dictionary: EN, fallback: EN })

interface Row {
  id: string
  name: string
  city: string
  trips: number
}

const ROWS: Row[] = [
  { id: 'DRV-1', name: 'Nora Al-Harbi', city: 'Riyadh', trips: 412 },
  { id: 'DRV-2', name: 'Sara Al-Ghamdi', city: 'Jeddah', trips: 288 },
]

const CITY_FILTER = {
  kind: 'multi-select' as const,
  field: 'city',
  options: [
    { value: 'Riyadh', label: 'Riyadh' },
    { value: 'Jeddah', label: 'Jeddah' },
  ],
}

function columns(overrides: Partial<DataColumn<Row>> = {}): DataColumn<Row>[] {
  return [
    {
      id: 'name',
      header: 'Captain',
      alwaysVisible: true,
      width: 176,
      sortField: 'name',
      cell: (row) => row.name,
      ...overrides,
    },
    { id: 'city', header: 'City', width: 120, filter: CITY_FILTER, cell: (row) => row.city },
    {
      id: 'trips',
      header: 'Trips',
      align: 'end',
      width: 96,
      dataType: 'number',
      sortField: 'trips',
      cell: (row) => row.trips,
    },
    /* A column that offers NOTHING: no sort field, no filter, not pinnable and
       not hideable. Its header must contain no interactive element and no
       caret at all (§3.3's last row). Note that being merely *hideable* is
       itself a control, so `alwaysVisible` is what makes this cell inert. */
    {
      id: 'inert',
      header: 'Inert',
      width: 80,
      alwaysVisible: true,
      pinnable: false,
      cell: () => '—',
    },
  ]
}

function Harness({ cols }: { cols: DataColumn<Row>[] }) {
  const table = useIndexTable<Row>({ mode: 'index', getRowId: (row) => row.id })
  return (
    <DataTable
      table={table}
      rows={ROWS}
      columns={cols}
      getRowId={(row) => row.id}
      status="content"
      total={ROWS.length}
      t={t}
      language="en"
      tableId="test"
      searchPlaceholder="Search captains"
      firstRun={{ heading: 'h', body: 'b', actions: [] }}
      noMatch={{ message: 'No captains match these filters.' }}
      error={{ message: 'e', onRetry: () => undefined }}
    />
  )
}

function LedgerHarness() {
  const table = useIndexTable({ mode: 'ledger' })
  return (
    <DataTable
      table={table}
      rows={[{ id: 'P-1', name: 'Top-up', city: '', trips: 0 }]}
      columns={[
        { id: 'date', header: 'Date', alwaysVisible: true, width: 120, cell: () => '25 Jun' },
        { id: 'reference', header: 'Reference', width: 140, filter: CITY_FILTER, cell: () => 'TRX-1' },
      ]}
      getRowId={(row) => row.id}
      status="content"
      total={1}
      t={t}
      language="en"
      tableId="ledger"
      searchPlaceholder="Search postings"
      firstRun={{ heading: 'h', body: 'b', actions: [] }}
      noMatch={{ message: 'No postings match these filters.' }}
      error={{ message: 'e', onRetry: () => undefined }}
    />
  )
}

/* ═══════════════ the crash that shipped, and its ordering ═══════════════ */

describe('the identity column and `useColumnPinning`s width guard', () => {
  /**
   * The live defect: `Column "captain" cannot be pinned without a positive
   * width`, thrown on an ordinary page load with no interaction.
   *
   * `useColumnPinning` throws on a pin whose column declares no inline size,
   * and it is right to: §7.2 makes the width a requirement of the column
   * contract, because an offset computed after layout is a frame of visible
   * jump on every scroll. **The hook is not the bug — the caller was, for
   * asking.** `DataTable` now locks column index 0 only when it can actually be
   * pinned, so a screen that forgets `width` gets a table with no frozen
   * identity column rather than a crash on first paint.
   */
  it('renders without throwing when the identity column declares no width', () => {
    const cols = columns()
    delete cols[0]?.width
    expect(() => render(<Harness cols={cols} />)).not.toThrow()
    expect(screen.getByText('Nora Al-Harbi')).toBeInTheDocument()
  })

  it('leaves that identity cell unpinned rather than pinning it at offset zero', () => {
    const cols = columns()
    delete cols[0]?.width
    const { container } = render(<Harness cols={cols} />)
    const cell = container.querySelector('tbody tr td:nth-child(2)') as HTMLElement
    expect(cell.style.position).toBe('')
  })

  it('pins it, at the checkbox lane width, as soon as a width is declared', () => {
    const { container } = render(<Harness cols={columns()} />)
    const cell = container.querySelector('tbody tr td:nth-child(2)') as HTMLElement
    expect(cell.style.position).toBe('sticky')
    /* 40px — the selection lane, which is locked ahead of it. Never `left`. */
    expect(cell.style.insetInlineStart).toBe('40px')
    expect(cell.style.left).toBe('')
  })
})

/* ══════════════════════════ the header cell ══════════════════════════ */

describe('the header cell — one control, or none', () => {
  it('renders exactly ONE interactive element per controllable header (AC-80)', () => {
    const { container } = render(<Harness cols={columns()} />)
    for (const id of ['Captain', 'City', 'Trips']) {
      const header = screen.getByRole('button', { name: `Column options for ${id}` })
      const cell = header.closest('th') as HTMLElement
      expect(within(cell).getAllByRole('button')).toHaveLength(1)
      expect(header).toHaveAttribute('aria-haspopup', 'menu')
      expect(header).toHaveAttribute('aria-expanded', 'false')
    }
    /* Three menu triggers and nothing else. The fourth `button` in the head
       is the select-all checkbox, which Radix renders as `role="checkbox"`. */
    expect(container.querySelectorAll('thead button[aria-haspopup=menu]')).toHaveLength(3)
  })

  it('renders NO interactive element in a header whose column declares nothing', () => {
    render(<Harness cols={columns()} />)
    const inert = screen.getByText('Inert').closest('th') as HTMLElement
    expect(within(inert).queryByRole('button')).toBeNull()
  })

  it('renders the menu caret AT REST — no hover, no focus (AC-81)', () => {
    render(<Harness cols={columns()} />)
    const header = screen.getByRole('button', { name: 'Column options for City' })
    expect(header.querySelector('svg')).not.toBeNull()
    /* D19's shape, asserted as an absence: never revealed by opacity. */
    expect(header.className).not.toMatch(/opacity-0/)
  })

  it('puts `aria-sort` on exactly one `th`, and only once sorted (AC-92, AC-86)', async () => {
    const user = userEvent.setup()
    const { container } = render(<Harness cols={columns()} />)
    expect(container.querySelectorAll('th[aria-sort]')).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: 'Column options for Trips' }))
    await user.click(await screen.findByRole('menuitemradio', { name: /Sort high to low/ }))

    const sorted = container.querySelectorAll('th[aria-sort]')
    expect(sorted).toHaveLength(1)
    expect(sorted[0]?.getAttribute('aria-sort')).toBe('descending')
  })

  it('labels the direction pair from the column dataType, never with date words (AC-88)', async () => {
    const user = userEvent.setup()
    render(<Harness cols={columns()} />)
    await user.click(screen.getByRole('button', { name: 'Column options for Trips' }))
    expect(await screen.findByRole('menuitemradio', { name: /Sort low to high/ })).toBeInTheDocument()
    expect(screen.queryByRole('menuitemradio', { name: /Oldest first/ })).toBeNull()
  })
})

/* ═══════════════════════════ the ledger ═══════════════════════════════ */

describe('a ledger header (AC-113)', () => {
  it('offers Filter… and Pin column, and never a sort item', async () => {
    const user = userEvent.setup()
    render(<LedgerHarness />)
    await user.click(screen.getByRole('button', { name: 'Column options for Reference' }))

    expect(await screen.findByRole('menuitem', { name: 'Filter…' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Pin column' })).toBeInTheDocument()
    expect(screen.queryAllByRole('menuitemradio')).toHaveLength(0)
    expect(screen.queryByRole('menuitem', { name: 'Clear sort' })).toBeNull()
    /* §8.3.3 — hiding `Credit` turns a double-entry ledger into a lie. */
    expect(screen.queryByRole('menuitem', { name: 'Hide column' })).toBeNull()
  })
})

/* ═════════════════════ filter → header → chip, one state ══════════════ */

describe('a column filter is one filter (AC-93, AC-95, AC-96)', () => {
  it('writes one chip and one header summary, from the same string', async () => {
    const user = userEvent.setup()
    render(<Harness cols={columns()} />)

    await user.click(screen.getByRole('button', { name: 'Column options for City' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Filter…' }))
    await user.click(await screen.findByRole('checkbox', { name: 'Riyadh' }))

    /* The header summary and the chip are two readouts of ONE state. */
    expect(await screen.findByRole('button', { name: /City: Riyadh/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove the City filter' })).toBeInTheDocument()
    /* A `<bdi>` around the value half, from ONE key — never concatenation. */
    expect(document.querySelectorAll('bdi').length).toBeGreaterThan(0)
  })

  it('never renders a text input inside a menu (AC-97)', async () => {
    const user = userEvent.setup()
    render(<Harness cols={columns()} />)
    await user.click(screen.getByRole('button', { name: 'Column options for City' }))
    const menu = await screen.findByRole('menu')
    expect(menu.querySelector('input')).toBeNull()
  })
})

/* ═══════════════════════ the two RTL mechanics ════════════════════════ */

describe('§8.3 — the mechanics that are silently wrong in Arabic', () => {
  it('normalises the sign of `scrollLeft`, because an RTL container scrolls NEGATIVE', () => {
    expect(scrolledInline({ scrollLeft: 0 })).toBe(false)
    expect(scrolledInline({ scrollLeft: 320 })).toBe(true)
    /* The one that a raw `> 0` gets wrong, forever, without looking broken. */
    expect(scrolledInline({ scrollLeft: -320 })).toBe(true)
  })

  it('writes the sticky offset to a LOGICAL inset and never to `left`', () => {
    const { container } = render(<Harness cols={columns()} />)
    for (const cell of container.querySelectorAll<HTMLElement>('[style*="sticky"]')) {
      expect(cell.style.left).toBe('')
      expect(cell.style.right).toBe('')
    }
  })
})

/* ═════════════════════════ the pure helpers ═══════════════════════════ */

describe('the summary, which the header and the chip both read', () => {
  it('counts the remainder rather than listing it', () => {
    const value = columnFilterValueOf(CITY_FILTER, {
      field: 'city',
      op: 'in',
      value: ['Riyadh', 'Jeddah'],
    })
    expect(summariseColumnFilter(t, CITY_FILTER, value, 'en')).toBe('Riyadh +1')
  })

  it('returns null for an empty value, which is what removes the chip', () => {
    const value = columnFilterValueOf(CITY_FILTER, undefined)
    expect(summariseColumnFilter(t, CITY_FILTER, value, 'en')).toBeNull()
  })

  it('splits ONE key rather than concatenating a label and a value (AC-75)', () => {
    const parts = filteredLabelParts(t, 'City', 'Riyadh')
    expect(parts.value).toBe('Riyadh')
    expect(`${parts.before}${parts.value}${parts.after}`).toBe('City: Riyadh')
  })
})
