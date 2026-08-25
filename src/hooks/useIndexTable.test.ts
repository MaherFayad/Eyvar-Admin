import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useIndexTable } from './useIndexTable'

interface Row {
  id: string
  name: string
}

const rows: Row[] = [
  { id: 'DRV-0101', name: 'Nora Al-Harbi' },
  { id: 'DRV-0102', name: 'Sara Al-Ghamdi' },
  { id: 'DRV-0106', name: 'Faisal Al-Otaibi' },
]

const indexTable = () =>
  renderHook(() =>
    useIndexTable<Row>({ mode: 'index', getRowId: (row) => row.id, searchDebounceMs: 0 }),
  )

const ledgerTable = () => renderHook(() => useIndexTable({ mode: 'ledger', searchDebounceMs: 0 }))

describe('ledger mode — AC-48, enforced by the type system', () => {
  it('reports it cannot select, sort, or offer a row action', () => {
    const { result } = ledgerTable()
    expect(result.current.mode).toBe('ledger')
    expect(result.current.canSelect).toBe(false)
    expect(result.current.canSort).toBe(false)
    expect(result.current.canRowAction).toBe(false)
  })

  it('has no selection or sort API at all — reading one is a compile error', () => {
    const { result } = ledgerTable()
    const table: Record<string, unknown> = result.current as unknown as Record<string, unknown>
    for (const member of [
      'selectedIds',
      'selectedCount',
      'toggleRow',
      'toggleAllOnPage',
      'clearSelection',
      'sort',
      'setSortField',
      'setSortDirection',
    ]) {
      expect(member in table).toBe(false)
    }
  })

  it('never puts a sort on the request, so posting order cannot be overridden', () => {
    const { result } = ledgerTable()
    expect(result.current.params.sort).toBeNull()
    act(() => result.current.setQuery('WTX'))
    expect(result.current.params.sort).toBeNull()
  })

  it('still paginates and still filters, because a ledger does both', () => {
    // §8.3.3: `Showing 150 of 412 postings.` — truncation stated in words.
    const { result } = ledgerTable()
    act(() => result.current.nextPage())
    expect(result.current.params.page).toBe(2)
    act(() => result.current.setQuery('WTX-0004'))
    expect(result.current.params.q).toBe('WTX-0004')
    expect(result.current.isFiltered).toBe(true)
  })
})

describe('index mode', () => {
  it('carries selection, sorting and row actions', () => {
    const { result } = indexTable()
    expect(result.current.canSelect).toBe(true)
    expect(result.current.canSort).toBe(true)
    expect(result.current.canRowAction).toBe(true)
  })

  it('selects and deselects a row', () => {
    const { result } = indexTable()
    act(() => result.current.toggleRow('DRV-0101'))
    expect(result.current.selectedCount).toBe(1)
    expect(result.current.isSelected('DRV-0101')).toBe(true)
    act(() => result.current.toggleRow('DRV-0101'))
    expect(result.current.selectedCount).toBe(0)
  })

  it('reports the header checkbox´s three states', () => {
    const { result } = indexTable()
    expect(result.current.pageSelectionState(rows)).toBe('none')
    act(() => result.current.toggleRow('DRV-0101'))
    expect(result.current.pageSelectionState(rows)).toBe('some')
    act(() => result.current.toggleAllOnPage(rows))
    expect(result.current.pageSelectionState(rows)).toBe('all')
    expect(result.current.selectedCount).toBe(3)
  })

  it('deselects the whole page when every row on it is already selected', () => {
    const { result } = indexTable()
    act(() => result.current.toggleAllOnPage(rows))
    act(() => result.current.toggleAllOnPage(rows))
    expect(result.current.selectedCount).toBe(0)
  })

  it('handles an empty page and a single-row page', () => {
    const { result } = indexTable()
    act(() => result.current.toggleAllOnPage([]))
    expect(result.current.selectedCount).toBe(0)
    expect(result.current.pageSelectionState([])).toBe('none')
    act(() => result.current.toggleAllOnPage([rows[0]!]))
    expect(result.current.selectedCount).toBe(1)
  })

  it('keeps a selection made on page 1 when the operator pages forward', () => {
    const { result } = indexTable()
    act(() => result.current.toggleRow('DRV-0101'))
    act(() => result.current.nextPage())
    expect(result.current.selectedCount).toBe(1)
  })

  /* ── AC-25 ── */

  it('clears the selection on a view change', () => {
    const { result } = indexTable()
    act(() => result.current.toggleRow('DRV-0101'))
    act(() => result.current.setView('active'))
    expect(result.current.selectedCount).toBe(0)
  })

  it('clears the selection on a filter change and on a search', () => {
    const { result } = indexTable()
    act(() => result.current.toggleRow('DRV-0101'))
    act(() => result.current.setFilter({ field: 'city', op: 'eq', value: 'Riyadh' }))
    expect(result.current.selectedCount).toBe(0)

    act(() => result.current.toggleRow('DRV-0102'))
    act(() => result.current.setQuery('nora'))
    expect(result.current.selectedCount).toBe(0)
  })

  it('returns to page 1 whenever the result set changes underneath', () => {
    const { result } = indexTable()
    act(() => result.current.setPage(4))
    act(() => result.current.setFilter({ field: 'city', op: 'eq', value: 'Riyadh' }))
    expect(result.current.page).toBe(1)
  })

  /* ── sorting, AC-45 ── */

  it('keeps exactly one sort field, replacing rather than accumulating', () => {
    const { result } = indexTable()
    act(() => result.current.setSortField('name'))
    expect(result.current.sort).toEqual({ field: 'name', dir: 'asc' })
    act(() => result.current.setSortField('trips'))
    expect(result.current.sort).toEqual({ field: 'trips', dir: 'asc' })
  })

  it('changes direction without losing the field, as the sort popover does', () => {
    const { result } = indexTable()
    act(() => result.current.setSortField('name'))
    act(() => result.current.setSortDirection('desc'))
    expect(result.current.sort).toEqual({ field: 'name', dir: 'desc' })
  })

  it('ignores a direction change while nothing is sorted', () => {
    const { result } = indexTable()
    act(() => result.current.setSortDirection('desc'))
    expect(result.current.sort).toBeNull()
  })

  it('clears the sort back to the resting state', () => {
    const { result } = indexTable()
    act(() => result.current.setSortField('name'))
    act(() => result.current.clearSort())
    expect(result.current.sort).toBeNull()
  })
})

describe('queue mode — §9.3', () => {
  it('has no selection unless every bulk action is a claim or assign', () => {
    const { result } = renderHook(() =>
      useIndexTable<Row>({ mode: 'queue', getRowId: (row) => row.id, searchDebounceMs: 0 }),
    )
    expect(result.current.canSelect).toBe(false)
    expect('selectedIds' in result.current).toBe(false)
    // ...but it does sort and it does have row actions, unlike a ledger.
    expect(result.current.canSort).toBe(true)
    expect(result.current.canRowAction).toBe(true)
  })

  it('gains selection when the queue declares bulk claim', () => {
    const { result } = renderHook(() =>
      useIndexTable<Row>({
        mode: 'queue',
        getRowId: (row) => row.id,
        bulkClaim: true,
        searchDebounceMs: 0,
      }),
    )
    expect(result.current.canSelect).toBe(true)
    act(() => result.current.toggleRow('DRV-0101'))
    expect(result.current.selectedCount).toBe(1)
  })
})

describe('params — the request the client receives', () => {
  it('omits a blank or whitespace-only query rather than sending q=""', () => {
    const { result } = indexTable()
    expect(result.current.params.q).toBeUndefined()
    act(() => result.current.setQuery('   '))
    expect(result.current.params.q).toBeUndefined()
  })

  it('trims the query it does send', () => {
    const { result } = indexTable()
    act(() => result.current.setQuery('  nora  '))
    expect(result.current.params.q).toBe('nora')
  })

  it('carries filters, view, page and page size', () => {
    const { result } = renderHook(() =>
      useIndexTable<Row>({
        mode: 'index',
        getRowId: (row) => row.id,
        pageSize: 10,
        searchDebounceMs: 0,
      }),
    )
    act(() => result.current.setView('expiring-7d'))
    act(() => result.current.setFilter({ field: 'city', op: 'eq', value: 'Riyadh' }))
    act(() => result.current.nextPage())
    expect(result.current.params).toMatchObject({
      page: 2,
      pageSize: 10,
      view: 'expiring-7d',
      filters: [{ field: 'city', op: 'eq', value: 'Riyadh' }],
    })
  })

  it('replaces rather than duplicates a chip for the same field', () => {
    const { result } = indexTable()
    act(() => result.current.setFilter({ field: 'city', op: 'eq', value: 'Riyadh' }))
    act(() => result.current.setFilter({ field: 'city', op: 'eq', value: 'Jeddah' }))
    expect(result.current.filters).toEqual([{ field: 'city', op: 'eq', value: 'Jeddah' }])
  })

  it('never pages below 1', () => {
    const { result } = indexTable()
    act(() => result.current.previousPage())
    expect(result.current.page).toBe(1)
    act(() => result.current.setPage(-5))
    expect(result.current.page).toBe(1)
  })
})

describe('isFiltered — AC-37 vs AC-38, and §9.1´s `Clear all`', () => {
  it('is false at rest, so an empty table is `first-run`, not `no-match`', () => {
    expect(indexTable().result.current.isFiltered).toBe(false)
  })

  it('is true with a query or a chip', () => {
    const { result } = indexTable()
    act(() => result.current.setQuery('nora'))
    expect(result.current.isFiltered).toBe(true)
    act(() => result.current.clearAll())
    expect(result.current.isFiltered).toBe(false)

    act(() => result.current.setFilter({ field: 'city', op: 'eq', value: 'Riyadh' }))
    expect(result.current.isFiltered).toBe(true)
  })

  it('is NOT true merely because a view tab was clicked — a view is not a filter', () => {
    const { result } = indexTable()
    act(() => result.current.setView('active'))
    expect(result.current.isFiltered).toBe(false)
  })

  it('leaves the view alone when Clear all runs', () => {
    const { result } = indexTable()
    act(() => result.current.setView('active'))
    act(() => result.current.setQuery('nora'))
    act(() => result.current.clearAll())
    expect(result.current.view).toBe('active')
    expect(result.current.query).toBe('')
    expect(result.current.filters).toEqual([])
  })
})
