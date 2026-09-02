import { createElement, type ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { toSearchParams } from '@/data/clients/http'
import type { FilterSpec, SortSpec } from '@/data/types/common'
import { useIndexTable, type IndexTableOptions, type LedgerTableOptions } from './useIndexTable'
import {
  parseFilterParam,
  parseSortParam,
  readTableParams,
  tableScope,
  writeTableParams,
  type TableDefaults,
} from './useUrlTableState'

interface Row {
  id: string
  name: string
}

const rows: Row[] = [
  { id: 'DRV-0101', name: 'Nora Al-Harbi' },
  { id: 'DRV-0102', name: 'Sara Al-Ghamdi' },
  { id: 'DRV-0106', name: 'Faisal Al-Otaibi' },
]

/**
 * P1-T1's backwards-compatibility contract, expressed as a test rather than as
 * a promise: **the whole suite below runs twice** — once with no `<Router>`, so
 * the hook uses the `useState` store it had before the URL existed, and once
 * inside a `MemoryRouter`, where the address bar is the store. Both passes
 * assert the same behaviour through the same public API, which is what lets
 * twenty screens inherit the fix without one of them changing a line.
 */
const routerWrapper = ({ children }: { children: ReactNode }) =>
  createElement(MemoryRouter, { initialEntries: ['/operations/people'] }, children)

const STORES = [
  { name: 'local state (rendered with no router)', wrapper: undefined },
  { name: 'URL state', wrapper: routerWrapper },
] as const

describe.each(STORES)('useIndexTable — $name', ({ wrapper }) => {
  const indexTable = () =>
    renderHook(
      () => useIndexTable<Row>({ mode: 'index', getRowId: (row) => row.id, searchDebounceMs: 0 }),
      { wrapper },
    )

  const ledgerTable = () =>
    renderHook(() => useIndexTable({ mode: 'ledger', searchDebounceMs: 0 }), { wrapper })

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

    /**
     * `Sort high to low` is **one** menu item and **two** calls, in one
     * handler, before any re-render. Both stores have to compose them; the URL
     * one has to compose them without re-reading a search string React has not
     * re-rendered with yet (**AC-92**).
     */
    it('composes a field and a direction set in the same handler', () => {
      const { result } = indexTable()
      act(() => {
        result.current.setSortField('trips')
        result.current.setSortDirection('desc')
      })
      expect(result.current.sort).toEqual({ field: 'trips', dir: 'desc' })
    })

    it('composes two chips committed in the same handler', () => {
      const { result } = indexTable()
      act(() => {
        result.current.setFilter({ field: 'city', op: 'eq', value: 'Riyadh' })
        result.current.setFilter({ field: 'status', op: 'eq', value: 'active' })
      })
      expect(result.current.filters).toEqual([
        { field: 'city', op: 'eq', value: 'Riyadh' },
        { field: 'status', op: 'eq', value: 'active' },
      ])
    })

    it('composes two page steps taken in the same handler', () => {
      const { result } = indexTable()
      act(() => {
        result.current.nextPage()
        result.current.nextPage()
      })
      expect(result.current.page).toBe(3)
    })
  })

  describe('queue mode — §9.3', () => {
    it('has no selection unless every bulk action is a claim or assign', () => {
      const { result } = renderHook(
        () => useIndexTable<Row>({ mode: 'queue', getRowId: (row) => row.id, searchDebounceMs: 0 }),
        { wrapper },
      )
      expect(result.current.canSelect).toBe(false)
      expect('selectedIds' in result.current).toBe(false)
      // ...but it does sort and it does have row actions, unlike a ledger.
      expect(result.current.canSort).toBe(true)
      expect(result.current.canRowAction).toBe(true)
    })

    it('gains selection when the queue declares bulk claim', () => {
      const { result } = renderHook(
        () =>
          useIndexTable<Row>({
            mode: 'queue',
            getRowId: (row) => row.id,
            bulkClaim: true,
            searchDebounceMs: 0,
          }),
        { wrapper },
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
      const { result } = renderHook(
        () =>
          useIndexTable<Row>({
            mode: 'index',
            getRowId: (row) => row.id,
            pageSize: 10,
            searchDebounceMs: 0,
          }),
        { wrapper },
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
})

/* ═══════════════════════ P1-T1 — the question is the address ═══════════════ */

/**
 * Renders a table inside a `MemoryRouter` and hands back the table, the live
 * `location`, and `go` for stepping through history — everything a test needs
 * to assert what the operator would see in the address bar and what Back does.
 */
const routerAt = (initialEntries: string[]) =>
  ({ children }: { children: ReactNode }) =>
    createElement(MemoryRouter, { initialEntries }, children)

function renderAt(options: IndexTableOptions<Row>, initialEntries = ['/operations/people']) {
  return renderHook(
    () => ({
      table: useIndexTable<Row>(options),
      location: useLocation(),
      go: useNavigate(),
    }),
    { wrapper: routerAt(initialEntries) },
  )
}

function renderLedgerAt(options: LedgerTableOptions, initialEntries = ['/financials/wallets']) {
  return renderHook(
    () => ({
      table: useIndexTable(options),
      location: useLocation(),
      go: useNavigate(),
    }),
    { wrapper: routerAt(initialEntries) },
  )
}

const INDEX: IndexTableOptions<Row> = {
  mode: 'index',
  getRowId: (row) => row.id,
  searchDebounceMs: 0,
}

describe('P1-T1 — an index table´s question round-trips through the URL', () => {
  it('writes q, sort, page and filter, and reads every one of them back', () => {
    const { result } = renderAt(INDEX)

    act(() => result.current.table.setQuery('nora'))
    act(() => result.current.table.setSortField('trips'))
    act(() => result.current.table.setSortDirection('desc'))
    act(() => result.current.table.setFilter({ field: 'city', op: 'eq', value: 'Riyadh' }))
    act(() => result.current.table.setPage(3))

    const search = result.current.location.search
    const written = new URLSearchParams(search)
    expect(written.get('q')).toBe('nora')
    expect(written.get('sort')).toBe('trips:desc')
    expect(written.get('page')).toBe('3')
    expect(written.getAll('filter')).toEqual(['city:eq:Riyadh'])

    /* The reload: a second table mounted at that address is the first one. */
    const reopened = renderAt(INDEX, [`/operations/people${search}`])
    expect(reopened.result.current.table.params).toMatchObject({
      page: 3,
      q: 'nora',
      sort: { field: 'trips', dir: 'desc' },
      filters: [{ field: 'city', op: 'eq', value: 'Riyadh' }],
    })
    expect(reopened.result.current.table.query).toBe('nora')
    expect(reopened.result.current.table.isUrlBacked).toBe(true)
  })

  it('is the same query string the http transport would send', () => {
    const { result } = renderAt(INDEX)
    act(() => result.current.table.setQuery('nora'))
    act(() => result.current.table.setSortField('trips'))
    act(() => result.current.table.setFilter({ field: 'status', op: 'in', value: ['active', 'frozen'] }))
    act(() => result.current.table.setPage(2))

    /* `pageSize` and `view` are not the table´s to write, so they are dropped
       from the comparison — everything else must be byte-identical. */
    const wire = toSearchParams({ ...result.current.table.params, pageSize: undefined, view: null })
    const address = new URLSearchParams(result.current.location.search)
    expect(address.get('q')).toBe(wire.get('q'))
    expect(address.get('page')).toBe(wire.get('page'))
    expect(address.get('sort')).toBe(wire.get('sort'))
    expect(address.getAll('filter')).toEqual(wire.getAll('filter'))
  })

  it('leaves the address clean while nothing but a default is set', () => {
    const { result } = renderAt({ ...INDEX, initialSort: { field: 'name', dir: 'asc' } })

    expect(result.current.location.search).toBe('')
    expect(result.current.table.sort).toEqual({ field: 'name', dir: 'asc' })

    /* Page 1, the declared sort and an empty query are all defaults — asking
       for them again must not put any of them in the address. */
    act(() => result.current.table.setPage(1))
    act(() => result.current.table.setSortField('name'))
    act(() => result.current.table.setQuery(''))
    expect(result.current.location.search).toBe('')
  })

  it('does not disturb the params it does not own', () => {
    const { result } = renderAt(INDEX, ['/operations/people?view=captains&entity=DRV-0101'])
    act(() => result.current.table.setPage(2))
    const search = new URLSearchParams(result.current.location.search)
    expect(search.get('view')).toBe('captains')
    expect(search.get('entity')).toBe('DRV-0101')
  })
})

describe('P1-T1 — Back', () => {
  it('restores the previous query, because a typed query is pushed', () => {
    const { result } = renderAt(INDEX)

    act(() => result.current.table.setQuery('nora'))
    expect(result.current.table.params.q).toBe('nora')

    act(() => result.current.table.setQuery('sara'))
    expect(result.current.table.params.q).toBe('sara')

    act(() => result.current.go(-1))
    expect(result.current.table.params.q).toBe('nora')
    /* The search field follows the address; the box and the URL never disagree. */
    expect(result.current.table.query).toBe('nora')

    act(() => result.current.go(-1))
    expect(result.current.table.params.q).toBeUndefined()
    expect(result.current.table.query).toBe('')
  })

  it('leaves the list rather than stepping through every filter tweak', () => {
    const { result } = renderAt(INDEX, ['/operations/dashboard', '/operations/people'])

    act(() => result.current.table.setFilter({ field: 'city', op: 'eq', value: 'Riyadh' }))
    act(() => result.current.table.setFilter({ field: 'city', op: 'eq', value: 'Jeddah' }))
    act(() => result.current.table.setSortField('trips'))
    act(() => result.current.table.setPage(4))

    /* Four refinements, one history entry: Back leaves the list in one press
       instead of walking the operator backwards through their own chip edits. */
    act(() => result.current.go(-1))
    expect(result.current.location.pathname).toBe('/operations/dashboard')
  })

  it('undoes Clear all, so an accidental one is recoverable', () => {
    const { result } = renderAt(INDEX)
    act(() => result.current.table.setQuery('nora'))
    act(() => result.current.table.setFilter({ field: 'city', op: 'eq', value: 'Riyadh' }))

    act(() => result.current.table.clearAll())
    expect(result.current.table.isFiltered).toBe(false)

    act(() => result.current.go(-1))
    expect(result.current.table.query).toBe('nora')
    expect(result.current.table.filters).toEqual([{ field: 'city', op: 'eq', value: 'Riyadh' }])
  })

  it('clears a selection made against the result set the operator just left (AC-25)', () => {
    const { result } = renderAt(INDEX)
    act(() => result.current.table.setQuery('nora'))
    act(() => result.current.table.toggleRow('DRV-0101'))
    expect(result.current.table.selectedCount).toBe(1)

    act(() => result.current.go(-1))
    expect(result.current.table.selectedCount).toBe(0)
  })
})

describe('P1-T1 — a cleared default is not the same as an unset one', () => {
  it('writes an empty sort so a cleared initialSort does not come back', () => {
    const options = { ...INDEX, initialSort: { field: 'name', dir: 'asc' } as SortSpec }
    const { result } = renderAt(options)

    act(() => result.current.table.clearSort())
    expect(result.current.table.sort).toBeNull()
    expect(new URLSearchParams(result.current.location.search).get('sort')).toBe('')

    const reopened = renderAt(options, [`/operations/people${result.current.location.search}`])
    expect(reopened.result.current.table.sort).toBeNull()
    expect(reopened.result.current.table.params.sort).toBeNull()
  })

  it('writes an empty filter so Clear all does not restore initialFilters', () => {
    const routed: FilterSpec = { field: 'routedToMyRole', op: 'eq', value: true }
    const options = { ...INDEX, initialFilters: [routed] }
    const { result } = renderAt(options)

    expect(result.current.table.filters).toEqual([routed])
    expect(result.current.location.search).toBe('')

    act(() => result.current.table.clearAll())
    expect(result.current.table.filters).toEqual([])
    expect(new URLSearchParams(result.current.location.search).getAll('filter')).toEqual([''])

    const reopened = renderAt(options, [`/operations/people${result.current.location.search}`])
    expect(reopened.result.current.table.filters).toEqual([])
  })

  it('keeps a boolean a boolean when an initialFilter is written out beside another', () => {
    const routed: FilterSpec = { field: 'routedToMyRole', op: 'eq', value: true }
    const { result } = renderAt({ ...INDEX, initialFilters: [routed] })

    act(() => result.current.table.setFilter({ field: 'city', op: 'eq', value: 'Riyadh' }))
    expect(result.current.table.filters).toEqual([routed, { field: 'city', op: 'eq', value: 'Riyadh' }])
  })
})

describe('P1-T1 — a ledger', () => {
  const LEDGER: LedgerTableOptions = { mode: 'ledger', searchDebounceMs: 0 }

  it('never emits a sort param, because it has no sort to emit (AC-48)', () => {
    const { result } = renderLedgerAt({ ...LEDGER, urlState: true })
    act(() => result.current.table.setQuery('WTX-0004'))
    act(() => result.current.table.setPage(2))
    const search = new URLSearchParams(result.current.location.search)
    expect(search.has('sort')).toBe(false)
    expect(result.current.table.params.sort).toBeNull()
  })

  it('ignores a sort someone hand-typed into the address', () => {
    const { result } = renderLedgerAt({ ...LEDGER, urlState: true }, [
      '/financials/wallets?sort=amount:desc',
    ])
    expect(result.current.table.params.sort).toBeNull()
    expect('sort' in result.current.table).toBe(false)
  })

  it('stays out of the address by default, so it cannot inherit the index behind it', () => {
    /* §8.3.3: a ledger is a card inside another surface. The wallet index that
       opened it owns `?q=` and `?page=`; the ledger must not read them. */
    const { result } = renderLedgerAt(LEDGER, ['/financials/wallets?q=nora&page=3'])
    expect(result.current.table.isUrlBacked).toBe(false)
    expect(result.current.table.params.page).toBe(1)
    expect(result.current.table.params.q).toBeUndefined()

    act(() => result.current.table.setPage(2))
    expect(result.current.location.search).toBe('?q=nora&page=3')
  })
})

describe('P1-T1 — scope', () => {
  it('names the params after the view they were asked under', () => {
    const { result } = renderAt(INDEX, ['/financials/cash?view=debts'])
    act(() => result.current.table.setSortField('age'))
    act(() => result.current.table.setQuery('DRV-0101'))

    const search = new URLSearchParams(result.current.location.search)
    expect(search.get('debts.sort')).toBe('age:asc')
    expect(search.get('debts.q')).toBe('DRV-0101')
    expect(search.has('sort')).toBe(false)
  })

  it('does not hand one view´s sort to the pane on the next tab', () => {
    /* The defect this scoping exists to prevent: `withView` preserves the rest
       of the query string, so a bare `?sort=` would reach a pane whose columns
       do not include that field and `runQuery` would throw. */
    const { result } = renderAt(INDEX, ['/financials/cash?view=reconciliation-queue&debts.sort=age:asc'])
    expect(result.current.table.sort).toBeNull()
  })

  it('separates two tables mounted on one address when the screen names a key', () => {
    const { result } = renderAt({ ...INDEX, urlKey: 'lf' }, ['/support/disputes?view=disputes'])
    act(() => result.current.table.setQuery('LF-1001'))
    expect(new URLSearchParams(result.current.location.search).get('disputes.lf.q')).toBe('LF-1001')
  })

  it('uses bare names on a screen with no view, which is the wire format exactly', () => {
    expect(tableScope('', '')).toBe('')
    expect(tableScope('?view=debts', '')).toBe('debts')
    expect(tableScope('?view=debts', 'lf')).toBe('debts.lf')
    expect(tableScope('', 'lf')).toBe('lf')
  })
})

/* ─────────────────── the grammar, as pure functions ─────────────────── */

const NO_DEFAULTS: TableDefaults = { q: '', sort: null, filters: [] }

describe('the URL grammar is `toSearchParams` read backwards', () => {
  const sorts: SortSpec[] = [
    { field: 'name', dir: 'asc' },
    { field: 'slaDueAt', dir: 'desc' },
  ]

  it.each(sorts)('round-trips the sort $field:$dir', (sort) => {
    const rendered = toSearchParams({ sort }).get('sort') as string
    expect(parseSortParam(rendered)).toEqual(sort)
  })

  /* Every shape `lib/columnFilter.ts` can emit, plus the two null operators. */
  const filters: FilterSpec[] = [
    { field: 'name', op: 'contains', value: 'nora' },
    { field: 'city', op: 'eq', value: 'Riyadh' },
    { field: 'status', op: 'in', value: ['active', 'frozen'] },
    { field: 'status', op: 'nin', value: ['suspended'] },
    { field: 'routedToMyRole', op: 'eq', value: true },
    { field: 'verified', op: 'eq', value: false },
    { field: 'lastTripAt', op: 'isNull', value: null },
    { field: 'lastTripAt', op: 'isNotNull', value: null },
  ]

  it.each(filters)('round-trips $field $op', (filter) => {
    const rendered = toSearchParams({ filters: [filter] }).getAll('filter')[0] as string
    expect(parseFilterParam(rendered)).toEqual(filter)
  })

  it('keeps a value that contains colons intact — a date filter is the common case', () => {
    const filter: FilterSpec = { field: 'slaDueAt', op: 'gte', value: '2026-06-25T09:14:00+03:00' }
    const rendered = toSearchParams({ filters: [filter] }).getAll('filter')[0] as string
    expect(parseFilterParam(rendered)).toEqual(filter)
  })

  it('renders numeric range values as strings the mock engine already coerces', () => {
    const filter: FilterSpec = { field: 'trips', op: 'between', value: [10, 20] }
    const rendered = toSearchParams({ filters: [filter] }).getAll('filter')[0] as string
    expect(rendered).toBe('trips:between:10,20')
    expect(parseFilterParam(rendered)).toEqual({ field: 'trips', op: 'between', value: ['10', '20'] })
  })

  it('survives Arabic, which is what the operators actually type', () => {
    const written = writeTableParams('', '', { q: 'نورة الحربي', page: 1, sort: null, filters: [] }, NO_DEFAULTS)
    expect(readTableParams(written, '', NO_DEFAULTS).q).toBe('نورة الحربي')
  })
})

describe('reading a URL nobody generated', () => {
  it('treats an absent parameter as the declared default', () => {
    const defaults: TableDefaults = {
      q: '',
      sort: { field: 'slaDueAt', dir: 'asc' },
      filters: [{ field: 'routedToMyRole', op: 'eq', value: true }],
    }
    expect(readTableParams('?page=2', '', defaults)).toEqual({
      q: '',
      page: 2,
      sort: defaults.sort,
      filters: defaults.filters,
    })
  })

  it('treats an empty parameter as an explicit none', () => {
    const defaults: TableDefaults = { q: '', sort: { field: 'name', dir: 'asc' }, filters: [] }
    const read = readTableParams('?sort=&filter=', '', defaults)
    expect(read.sort).toBeNull()
    expect(read.filters).toEqual([])
  })

  it.each([
    ['?sort=name', 'a direction that is missing'],
    ['?sort=name:sideways', 'a direction that is not a direction'],
    ['?sort=:asc', 'a field that is missing'],
  ])('reads %s as unsorted rather than throwing — %s', (search) => {
    expect(readTableParams(search, '', NO_DEFAULTS).sort).toBeNull()
  })

  it.each([
    ['?filter=city', 'no operator'],
    ['?filter=city:Riyadh', 'no value segment'],
    ['?filter=city:wat:Riyadh', 'an operator that does not exist'],
    ['?filter=:eq:Riyadh', 'no field'],
  ])('drops the malformed chip in %s — %s', (search) => {
    expect(readTableParams(search, '', NO_DEFAULTS).filters).toEqual([])
  })

  it.each([
    ['?page=0', 1],
    ['?page=-4', 1],
    ['?page=2.7', 2],
    ['?page=banana', 1],
    ['?page=9007199254740993', 9007199254740992],
  ])('clamps %s to page %i rather than requesting it', (search, expected) => {
    expect(readTableParams(search, '', NO_DEFAULTS).page).toBe(expected)
  })

  it('reads the scoped names and ignores the bare ones, and vice versa', () => {
    const search = '?q=bare&debts.q=scoped'
    expect(readTableParams(search, '', NO_DEFAULTS).q).toBe('bare')
    expect(readTableParams(search, 'debts', NO_DEFAULTS).q).toBe('scoped')
  })
})

describe('writing a URL', () => {
  it('deletes a parameter whose value is the default rather than restating it', () => {
    const defaults: TableDefaults = { q: '', sort: { field: 'name', dir: 'asc' }, filters: [] }
    const written = writeTableParams('?q=nora&sort=trips:desc&page=4', '', { ...defaults, page: 1 }, defaults)
    expect(written).toBe('')
  })

  it('keeps every parameter that is not the table´s', () => {
    const written = writeTableParams(
      '?view=captains&onboarding=1',
      'captains',
      { q: 'nora', page: 1, sort: null, filters: [] },
      NO_DEFAULTS,
    )
    const sp = new URLSearchParams(written)
    expect(sp.get('view')).toBe('captains')
    expect(sp.get('onboarding')).toBe('1')
    expect(sp.get('captains.q')).toBe('nora')
  })

  it('replaces the whole chip list rather than appending to it', () => {
    const first = writeTableParams(
      '',
      '',
      { q: '', page: 1, sort: null, filters: [{ field: 'city', op: 'eq', value: 'Riyadh' }] },
      NO_DEFAULTS,
    )
    const second = writeTableParams(
      first,
      '',
      { q: '', page: 1, sort: null, filters: [{ field: 'status', op: 'eq', value: 'active' }] },
      NO_DEFAULTS,
    )
    expect(new URLSearchParams(second).getAll('filter')).toEqual(['status:eq:active'])
  })
})
