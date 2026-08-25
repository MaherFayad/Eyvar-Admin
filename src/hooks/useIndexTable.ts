/**
 * Table state for all three table modes. Design spec §9.1, §9.2, §9.3, §9.4.
 *
 * §9.4 is the rule the whole file is shaped around:
 *
 * > `DataTable` takes a `mode` prop — `index | ledger | queue` — and the mode,
 * > not the route, decides which furniture renders. A route may mount more than
 * > one mode over its lifetime. It may never mount two at once.
 *
 * **`ledger` is enforced by the type system, not by a flag.** §8.3.3 and **AC-48**
 * require that a ledger has no selection checkbox, no row kebab, no bulk bar and
 * no sortable header — because those exist to mutate or remove the records they
 * sit on, which is exactly what an append-only posting forbids. A `disabled`
 * boolean would be one `if` away from being wrong. So:
 *
 * - `LedgerTableOptions` types `initialSort` and `getRowId` as `never`, so
 *   *asking* for a sort or a row identity is a compile error.
 * - `LedgerTable` has no `sort`, no `setSortField`, no `selectedIds` and no
 *   `toggleRow` **at all** — reading `table.selectedIds` off a ledger does not
 *   compile, so no component can render a checkbox bound to it.
 * - `canSelect`, `canSort` and `canRowAction` are the literal type `false`, so
 *   `mode === 'ledger' && table.canSelect` is not merely false at runtime, it is
 *   `false` at compile time and a reviewer can see it.
 *
 * A queue gets a checkbox column **only** when it passes `bulkClaim: true` —
 * §9.3: *"Selection checkbox: only if every bulk action offered is a claim or
 * assign action. Otherwise no checkbox column."* Same mechanism: without the
 * literal `true`, the selection members are not on the returned type.
 *
 * What this hook does **not** do: fetch (that is `useAsync` plus a client), sort
 * or filter rows in memory (the server does it; `src/data/mock/query.ts` is the
 * mock's implementation of the same contract), or render anything.
 */

import { useCallback, useMemo, useState } from 'react'
import type { FilterSpec, QueryParams, SortDirection, SortSpec } from '@/data/types/common'
import { DEFAULT_PAGE_SIZE } from '@/data/types/common'
import { useDebouncedValue, DEFAULT_DEBOUNCE_MS } from './useDebouncedValue'
import { useFilters } from './useFilters'

export type TableMode = 'index' | 'ledger' | 'queue'

/* ─────────────────────────────── options ─────────────────────────────── */

interface BaseTableOptions {
  pageSize?: number
  initialQuery?: string
  initialView?: string | null
  initialFilters?: readonly FilterSpec[]
  /** 0 disables debouncing — for a test that does not want to advance timers. */
  searchDebounceMs?: number
}

export interface IndexTableOptions<T> extends BaseTableOptions {
  mode: 'index'
  /** Row identity for selection. §9.1: the checkbox column is present on every index table. */
  getRowId: (row: T) => string
  initialSort?: SortSpec | null
}

export interface LedgerTableOptions extends BaseTableOptions {
  mode: 'ledger'
  /**
   * §8.3.3 / **AC-48**: a ledger is not user-sortable. Oldest-first by posting
   * time, always — a running balance is meaningful only in posting order.
   * Typed `never` so passing one is a compile error, not a code-review comment.
   */
  initialSort?: never
  /** §8.3.3 / **AC-48**: no selection, so no row identity is needed or accepted. */
  getRowId?: never
}

export interface QueueTableOptions<T> extends BaseTableOptions {
  mode: 'queue'
  getRowId: (row: T) => string
  initialSort?: SortSpec | null
  /**
   * §9.3: a checkbox column exists **only** where every bulk action offered is a
   * claim or assign action. Literal `true` only — omit it and the returned table
   * has no selection API to bind a checkbox to.
   */
  bulkClaim?: true
}

/* ─────────────────────────────── result ─────────────────────────────── */

export interface TableCore {
  /** Ready to hand to a client: `client.list({ ...table.params, signal })`. */
  params: QueryParams
  page: number
  pageSize: number
  setPage: (page: number) => void
  nextPage: () => void
  previousPage: () => void

  /** Live search input value — repaints per keystroke. `params.q` trails it. */
  query: string
  setQuery: (query: string) => void
  view: string | null
  setView: (view: string | null) => void
  filters: readonly FilterSpec[]
  setFilter: (filter: FilterSpec) => void
  removeFilter: (field: string) => void
  /** `Clear all`. §9.1: the control appears only when `isFiltered`. */
  clearAll: () => void
  /** Drives `Clear all`, and `no-match` vs `first-run` empty (**AC-37** / **AC-38**). */
  isFiltered: boolean
}

export interface TableSorting {
  /** §9.1 / **AC-45**: exactly one column carries the caret. This is that column. */
  sort: SortSpec | null
  setSortField: (field: string) => void
  setSortDirection: (dir: SortDirection) => void
  clearSort: () => void
}

/** The header checkbox is tri-state; §9.1 replaces the header row entirely while it is on. */
export type PageSelectionState = 'none' | 'some' | 'all'

export interface TableSelection<T> {
  selectedIds: ReadonlySet<string>
  selectedCount: number
  isSelected: (id: string) => boolean
  toggleRow: (id: string) => void
  setRowSelected: (id: string, selected: boolean) => void
  /** The header checkbox. Operates on the rows currently rendered, not on all 4,218. */
  toggleAllOnPage: (rows: readonly T[]) => void
  pageSelectionState: (rows: readonly T[]) => PageSelectionState
  clearSelection: () => void
}

export interface IndexTable<T> extends TableCore, TableSorting, TableSelection<T> {
  mode: 'index'
  canSelect: true
  canSort: true
  canRowAction: true
}

export interface LedgerTable extends TableCore {
  mode: 'ledger'
  /** **AC-48**, at compile time. Not a runtime flag anyone can flip. */
  canSelect: false
  canSort: false
  canRowAction: false
}

export interface QueueTable extends TableCore, TableSorting {
  mode: 'queue'
  canSelect: false
  canSort: true
  canRowAction: true
}

export interface QueueTableWithSelection<T> extends TableCore, TableSorting, TableSelection<T> {
  mode: 'queue'
  canSelect: true
  canSort: true
  canRowAction: true
}

export type AnyTable<T> = IndexTable<T> | LedgerTable | QueueTable | QueueTableWithSelection<T>

/* ────────────────────────────── the hook ────────────────────────────── */

export function useIndexTable(options: LedgerTableOptions): LedgerTable
export function useIndexTable<T>(
  options: QueueTableOptions<T> & { bulkClaim: true },
): QueueTableWithSelection<T>
export function useIndexTable<T>(options: QueueTableOptions<T>): QueueTable
export function useIndexTable<T>(options: IndexTableOptions<T>): IndexTable<T>
export function useIndexTable<T>(
  options: IndexTableOptions<T> | LedgerTableOptions | QueueTableOptions<T>,
): AnyTable<T> {
  const {
    mode,
    pageSize = DEFAULT_PAGE_SIZE,
    initialQuery = '',
    initialView = null,
    initialFilters = [],
    searchDebounceMs = DEFAULT_DEBOUNCE_MS,
  } = options

  const getRowId = mode === 'ledger' ? undefined : options.getRowId
  const sortable = mode !== 'ledger'
  const selectable = mode === 'index' || (mode === 'queue' && options.bulkClaim === true)

  const filterState = useFilters({ initialQuery, initialView, initialFilters })
  const [page, setPageState] = useState(1)
  const [sort, setSort] = useState<SortSpec | null>(
    mode === 'ledger' ? null : (options.initialSort ?? null),
  )
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set())

  const debouncedQuery = useDebouncedValue(filterState.query, searchDebounceMs)

  const clearSelection = useCallback(() => {
    setSelectedIds((current) => (current.size === 0 ? current : new Set<string>()))
  }, [])

  /**
   * **AC-25**, and §9.1's *"Selection resets on any route change and on any view
   * or filter change"*. Done synchronously inside the setters rather than in an
   * effect keyed to `revision`, so no render ever shows `3 selected` over rows
   * that are already gone. Route change is covered by the hook unmounting.
   */
  const resetOnQueryChange = useCallback(() => {
    setPageState(1)
    clearSelection()
  }, [clearSelection])

  const setQuery = useCallback(
    (next: string) => {
      filterState.setQuery(next)
      resetOnQueryChange()
    },
    [filterState, resetOnQueryChange],
  )

  const setView = useCallback(
    (next: string | null) => {
      filterState.setView(next)
      resetOnQueryChange()
    },
    [filterState, resetOnQueryChange],
  )

  const setFilter = useCallback(
    (filter: FilterSpec) => {
      filterState.setFilter(filter)
      resetOnQueryChange()
    },
    [filterState, resetOnQueryChange],
  )

  const removeFilter = useCallback(
    (field: string) => {
      filterState.removeFilter(field)
      resetOnQueryChange()
    },
    [filterState, resetOnQueryChange],
  )

  const clearAll = useCallback(() => {
    filterState.clearAll()
    resetOnQueryChange()
  }, [filterState, resetOnQueryChange])

  const setPage = useCallback((next: number) => {
    setPageState(Math.max(1, Math.trunc(next)))
  }, [])

  const nextPage = useCallback(() => setPageState((current) => current + 1), [])
  const previousPage = useCallback(() => setPageState((current) => Math.max(1, current - 1)), [])

  const setSortField = useCallback((field: string) => {
    setSort((current) => ({ field, dir: current?.dir ?? 'asc' }))
    setPageState(1)
  }, [])

  const setSortDirection = useCallback((dir: SortDirection) => {
    setSort((current) => (current === null ? null : { ...current, dir }))
    setPageState(1)
  }, [])

  const clearSort = useCallback(() => {
    setSort(null)
    setPageState(1)
  }, [])

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds])

  const setRowSelected = useCallback((id: string, selected: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (selected) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  const toggleRow = useCallback((id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const pageSelectionState = useCallback(
    (rows: readonly T[]): PageSelectionState => {
      if (!getRowId || rows.length === 0) return 'none'
      const ids = rows.map(getRowId)
      const selected = ids.filter((id) => selectedIds.has(id)).length
      if (selected === 0) return 'none'
      return selected === ids.length ? 'all' : 'some'
    },
    [getRowId, selectedIds],
  )

  const toggleAllOnPage = useCallback(
    (rows: readonly T[]) => {
      if (!getRowId) return
      const ids = rows.map(getRowId)
      setSelectedIds((current) => {
        const everySelected = ids.length > 0 && ids.every((id) => current.has(id))
        const next = new Set(current)
        for (const id of ids) {
          if (everySelected) next.delete(id)
          else next.add(id)
        }
        return next
      })
    },
    [getRowId],
  )

  const params = useMemo<QueryParams>(() => {
    const trimmed = debouncedQuery.trim()
    return {
      page,
      pageSize,
      q: trimmed === '' ? undefined : trimmed,
      // §8.3.3: a ledger's order is posting order and is never a request parameter.
      sort: sortable ? sort : null,
      filters: [...filterState.filters],
      view: filterState.view,
    }
  }, [debouncedQuery, page, pageSize, sortable, sort, filterState.filters, filterState.view])

  const core: TableCore = {
    params,
    page,
    pageSize,
    setPage,
    nextPage,
    previousPage,
    query: filterState.query,
    setQuery,
    view: filterState.view,
    setView,
    filters: filterState.filters,
    setFilter,
    removeFilter,
    clearAll,
    isFiltered: filterState.isFiltered,
  }

  if (mode === 'ledger') {
    return { ...core, mode: 'ledger', canSelect: false, canSort: false, canRowAction: false }
  }

  const sorting: TableSorting = { sort, setSortField, setSortDirection, clearSort }

  if (!selectable) {
    return { ...core, ...sorting, mode: 'queue', canSelect: false, canSort: true, canRowAction: true }
  }

  const selection: TableSelection<T> = {
    selectedIds,
    selectedCount: selectedIds.size,
    isSelected,
    toggleRow,
    setRowSelected,
    toggleAllOnPage,
    pageSelectionState,
    clearSelection,
  }

  if (mode === 'queue') {
    return {
      ...core,
      ...sorting,
      ...selection,
      mode: 'queue',
      canSelect: true,
      canSort: true,
      canRowAction: true,
    }
  }

  return {
    ...core,
    ...sorting,
    ...selection,
    mode: 'index',
    canSelect: true,
    canSort: true,
    canRowAction: true,
  }
}
