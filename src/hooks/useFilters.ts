/**
 * Filter, search and view state for one table.
 *
 * Design spec §9.1's toolbar: view tabs (`All` first and always default), a
 * search field that **replaces the tab row in place**, a chip row ending
 * `Add filter +`, and `Clear all` that appears **only** when at least one filter
 * or query is active. That last clause is `isFiltered`, and it is also what
 * `EmptyState` reads to choose `no-match` over `first-run` (**AC-37** / **AC-38**).
 *
 * `view` is deliberately **not** part of `isFiltered`. A view is a control, not a
 * level (foundation spec §3.8 rule 3) and `All` is a real, unfiltered default —
 * showing `Clear all` merely because someone clicked a tab would train operators
 * to ignore it.
 *
 * Most screens never call this directly: `useIndexTable` composes it, and adds
 * the two behaviours that must not be forgotten — selection clears and the page
 * resets whenever any of this changes (**AC-25**).
 */

import { useCallback, useMemo, useState } from 'react'
import type { FilterSpec } from '@/data/types/common'

/* ───────────────────── the algebra, as pure functions ───────────────────── */

/**
 * **One chip per field, as §9.1 draws it.** Adding `city eq Riyadh` on top of
 * `city eq Jeddah` replaces it; it never accumulates two chips an operator has
 * to reason about.
 *
 * Pure and exported because there are now two stores for the same algebra —
 * this hook's `useState`, and the URL (`useUrlTableState`, P1-T1). The rule
 * lives here once; a second copy inside the serialiser is exactly how the two
 * would drift apart on the day someone allows two chips per field.
 */
export function withFilter(
  filters: readonly FilterSpec[],
  filter: FilterSpec,
): readonly FilterSpec[] {
  return [...filters.filter((f) => f.field !== filter.field), filter]
}

/** Removes the chip for one field. Absent field: the same list back, not a throw. */
export function withoutFilter(
  filters: readonly FilterSpec[],
  field: string,
): readonly FilterSpec[] {
  return filters.filter((f) => f.field !== field)
}

/**
 * `Clear all`'s condition, and `no-match` vs `first-run` (**AC-37** / **AC-38**).
 *
 * `view` is deliberately not an argument: a view is a control, not a filter
 * (foundation spec §3.8 rule 3). See the file header.
 */
export function hasActiveFilters(query: string, filters: readonly FilterSpec[]): boolean {
  return filters.length > 0 || query.trim() !== ''
}

export interface UseFiltersOptions {
  initialQuery?: string
  initialView?: string | null
  initialFilters?: readonly FilterSpec[]
}

export interface FiltersState {
  /** The live input value. Bind the search field to this; it updates per keystroke. */
  query: string
  view: string | null
  filters: readonly FilterSpec[]
  /** At least one filter chip or a non-blank query. Drives `Clear all` and `no-match`. */
  isFiltered: boolean
  setQuery: (query: string) => void
  setView: (view: string | null) => void
  /** Adds or replaces the chip for that field — one chip per field, as §9.1 draws it. */
  setFilter: (filter: FilterSpec) => void
  removeFilter: (field: string) => void
  /** `Clear all`: drops every chip and the query. Leaves the view alone — the view is not a filter. */
  clearAll: () => void
  /**
   * Increments on every change above. A caller keyed to this resets page number
   * and selection without an effect, and without diffing filter arrays.
   */
  revision: number
}

export function useFilters(options: UseFiltersOptions = {}): FiltersState {
  const { initialQuery = '', initialView = null, initialFilters = [] } = options

  const [query, setQueryState] = useState(initialQuery)
  const [view, setViewState] = useState<string | null>(initialView)
  const [filters, setFilters] = useState<readonly FilterSpec[]>(initialFilters)
  const [revision, setRevision] = useState(0)

  const bump = useCallback(() => setRevision((value) => value + 1), [])

  const setQuery = useCallback(
    (next: string) => {
      setQueryState(next)
      bump()
    },
    [bump],
  )

  const setView = useCallback(
    (next: string | null) => {
      setViewState(next)
      bump()
    },
    [bump],
  )

  const setFilter = useCallback(
    (filter: FilterSpec) => {
      setFilters((current) => withFilter(current, filter))
      bump()
    },
    [bump],
  )

  const removeFilter = useCallback(
    (field: string) => {
      setFilters((current) => withoutFilter(current, field))
      bump()
    },
    [bump],
  )

  const clearAll = useCallback(() => {
    setFilters([])
    setQueryState('')
    bump()
  }, [bump])

  const isFiltered = hasActiveFilters(query, filters)

  return useMemo(
    () => ({
      query,
      view,
      filters,
      isFiltered,
      setQuery,
      setView,
      setFilter,
      removeFilter,
      clearAll,
      revision,
    }),
    [query, view, filters, isFiltered, setQuery, setView, setFilter, removeFilter, clearAll, revision],
  )
}
