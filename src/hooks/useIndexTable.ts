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
 * ## The question lives in the URL (P1-T1)
 *
 * `q`, `sort`, `page` and `filter` are **read out of `location.search`**, not
 * held in `useState`. `useUrlTableState` owns that, its header carries the
 * grammar and the push-vs-replace rule, and every screen inherits the fix
 * without a line changing: opening a record from a filtered, sorted, page-3
 * list and pressing Back returns to that list, a refresh keeps it, and the
 * address can be pasted into a runbook.
 *
 * Three things stay out of the address on purpose:
 *
 * - **Selection.** A selected set is ephemeral working state, not an address.
 *   It stays in `useState`; restoring it across a back-navigation is P1-T2.
 * - **`view`.** `?view=` has exactly one writer, `routeState.withView`. This
 *   hook reads it as a scope and never sets it.
 * - **A ledger's `q` and `page`,** unless the screen asks. §8.3.3 makes a ledger
 *   a card *inside* another surface (`LedgerCard`) rather than the surface
 *   itself, and the ledger a rider's wallet opens shares its address with the
 *   wallet index behind it — so an unasked-for sync would hand the index's
 *   `?page=3` to the ledger. `urlKey` opts a ledger in with a namespace of its
 *   own.
 *
 * What this hook does **not** do: fetch (that is `useAsync` plus a client), sort
 * or filter rows in memory (the server does it; `src/data/mock/query.ts` is the
 * mock's implementation of the same contract), or render anything.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FilterSpec, QueryParams, SortDirection, SortSpec } from '@/data/types/common'
import { DEFAULT_PAGE_SIZE } from '@/data/types/common'
import { DEFAULT_DEBOUNCE_MS } from './useDebouncedValue'
import { useUrlTableState } from './useUrlTableState'

export type TableMode = 'index' | 'ledger' | 'queue'

/* ─────────────────────────────── options ─────────────────────────────── */

interface BaseTableOptions {
  pageSize?: number
  initialQuery?: string
  initialView?: string | null
  initialFilters?: readonly FilterSpec[]
  /** 0 disables debouncing — for a test that does not want to advance timers. */
  searchDebounceMs?: number
  /**
   * **P1-T1.** Whether the table's question lives in the URL. Defaults to `true`
   * for `index` and `queue` and to `false` for `ledger` (see the file header).
   *
   * It also falls back to `false` with no `<Router>` above, so a component test
   * that renders a table bare keeps the pre-P1-T1 behaviour instead of throwing.
   */
  urlState?: boolean
  /**
   * A namespace, for the rare screen that mounts two tables on one address at
   * the same time. `urlKey: 'lf'` under `?view=disputes` gives `?disputes.lf.q=`.
   * Omitted, the parameters are scoped by `?view=` alone — which is already
   * enough for the common case of one table per view tab.
   */
  urlKey?: string
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
  /**
   * **P1-T1.** True when this table's question is in the address bar, so a
   * screen can offer `Copy link to this view` honestly. False means no
   * `<Router>` above, `urlState: false`, or a ledger that did not opt in.
   */
  isUrlBacked: boolean
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
  /**
   * **D21's escape hatch — narrow the selection to a named set.**
   *
   * A bulk command is refused when *any* selected record would be refused, and
   * the way out is `Select only the N eligible`: the operator's selection
   * changes, **visibly and by their own act**, and only then does the command
   * become available. That is what makes it not a partial apply — the bulk
   * bar's count updates before the command runs, so the outcome toast can never
   * name a different number from the bar (AC-961).
   *
   * Intersects rather than assigns. The caller passes the command's eligible
   * set, which may include rows the operator never selected; selecting those
   * would be the same silent surprise the all-or-nothing rule exists to
   * prevent.
   */
  selectOnly: (ids: Iterable<string>) => void
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
    initialFilters,
    searchDebounceMs = DEFAULT_DEBOUNCE_MS,
    urlKey,
  } = options

  const getRowId = mode === 'ledger' ? undefined : options.getRowId
  const sortable = mode !== 'ledger'
  const selectable = mode === 'index' || (mode === 'queue' && options.bulkClaim === true)

  /* A ledger is a card inside another surface and shares that surface's
     address, so it stays out of the URL unless the screen names a namespace. */
  const urlState = options.urlState ?? mode !== 'ledger'

  const state = useUrlTableState({
    urlState,
    urlKey,
    initialQuery,
    initialView,
    initialFilters,
    /* §8.3.3: a ledger has no sort to carry, in the URL or anywhere else. */
    initialSort: mode === 'ledger' ? null : (options.initialSort ?? null),
    searchDebounceMs,
  })

  /* Destructured rather than used through `state`, so a callback's identity
     tracks the one function it wraps instead of a fresh object per render. */
  const {
    page,
    sort,
    filters,
    view,
    query,
    committedQuery,
    isFiltered,
    isUrlBacked,
    setPage,
    nextPage,
    previousPage,
    setSort,
    setQuery: pushQuery,
    setView: pushView,
    setFilter: pushFilter,
    removeFilter: dropFilter,
    clearAll: clearAllState,
  } = state

  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set())

  const clearSelection = useCallback(() => {
    setSelectedIds((current) => (current.size === 0 ? current : new Set<string>()))
  }, [])

  /* Intersection, not assignment — see `TableSelection.selectOnly`. Returns the
     identical set when nothing would change, so a no-op cannot re-render. */
  const selectOnly = useCallback((ids: Iterable<string>) => {
    const keep = ids instanceof Set ? (ids as ReadonlySet<string>) : new Set(ids)
    setSelectedIds((current) => {
      const next = new Set<string>()
      for (const id of current) if (keep.has(id)) next.add(id)
      return next.size === current.size ? current : next
    })
  }, [])

  /**
   * **AC-25**, and §9.1's *"Selection resets on any route change and on any view
   * or filter change"*. Done synchronously inside the setters rather than in an
   * effect keyed to `revision`, so no render ever shows `3 selected` over rows
   * that are already gone. Route change is covered by the hook unmounting.
   */
  const setQuery = useCallback(
    (next: string) => {
      pushQuery(next)
      clearSelection()
    },
    [pushQuery, clearSelection],
  )

  const setView = useCallback(
    (next: string | null) => {
      pushView(next)
      clearSelection()
    },
    [pushView, clearSelection],
  )

  const setFilter = useCallback(
    (filter: FilterSpec) => {
      pushFilter(filter)
      clearSelection()
    },
    [pushFilter, clearSelection],
  )

  const removeFilter = useCallback(
    (field: string) => {
      dropFilter(field)
      clearSelection()
    },
    [dropFilter, clearSelection],
  )

  const clearAll = useCallback(() => {
    clearAllState()
    clearSelection()
  }, [clearAllState, clearSelection])

  /**
   * The other half of **AC-25**, now that the query can change without anyone
   * calling a setter: Back, Forward and a pasted link all move the result set
   * underneath a selection made against the old one. Keyed to the *committed*
   * question — page is excluded, because §9.1 keeps a selection while paging.
   */
  const resultSetKey = useMemo(
    () => JSON.stringify([committedQuery.trim(), view, filters]),
    [committedQuery, view, filters],
  )
  useEffect(() => {
    clearSelection()
  }, [resultSetKey, clearSelection])

  /**
   * All three take the updater form, because `DataTable`'s sort menu calls
   * `setSortField` and then `setSortDirection` **in one handler** (`Sort high to
   * low` is one menu item and two calls). Reading `sort` out of the render
   * closure would give the second call the value from before the first.
   */
  const setSortField = useCallback(
    (field: string) => setSort((current) => ({ field, dir: current?.dir ?? 'asc' })),
    [setSort],
  )

  const setSortDirection = useCallback(
    (dir: SortDirection) =>
      /* §9.1: direction is a property of the sorted column. With nothing
         sorted there is no column to give it to, so this is a no-op. */
      setSort((current) => (current === null ? null : { ...current, dir })),
    [setSort],
  )

  const clearSort = useCallback(() => setSort(() => null), [setSort])

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
    const trimmed = committedQuery.trim()
    return {
      page,
      pageSize,
      q: trimmed === '' ? undefined : trimmed,
      // §8.3.3: a ledger's order is posting order and is never a request parameter.
      sort: sortable ? sort : null,
      filters: [...filters],
      view,
    }
  }, [committedQuery, page, pageSize, sortable, sort, filters, view])

  const core: TableCore = {
    params,
    page,
    pageSize,
    setPage,
    nextPage,
    previousPage,
    query,
    setQuery,
    view,
    setView,
    filters,
    setFilter,
    removeFilter,
    clearAll,
    isFiltered,
    isUrlBacked,
  }

  if (mode === 'ledger') {
    return {
      ...core,
      mode: 'ledger',
      canSelect: false,
      canSort: false,
      canRowAction: false,
    }
  }

  const sorting: TableSorting = {
    sort,
    setSortField,
    setSortDirection,
    clearSort,
  }

  if (!selectable) {
    return {
      ...core,
      ...sorting,
      mode: 'queue',
      canSelect: false,
      canSort: true,
      canRowAction: true,
    }
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
    selectOnly,
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
