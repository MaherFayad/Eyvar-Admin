/**
 * The in-memory query engine the mock clients share: search, filter, sort,
 * paginate — in that order, which is the order a server does it.
 *
 * This exists so a mock client is a fixture array plus a field map, and never a
 * bespoke `.filter().slice()` that gets pagination subtly wrong in a different
 * way on every screen.
 */

import {
  DEFAULT_PAGE_SIZE,
  type Facets,
  type FilterSpec,
  type Paginated,
  type QueryParams,
  type SortSpec,
} from '../types/common'

/** A resource tells the engine what is searchable and what is sortable. Anything else is rejected loudly. */
export interface QueryShape<T> {
  /** Fields free-text `q` matches against, case-insensitively. */
  searchable: Array<(row: T) => string | null | undefined>
  /** Sortable domain field name → comparable value. */
  sortable: Record<string, (row: T) => string | number | null>
  /** Filterable domain field name → value to compare. */
  filterable: Record<string, (row: T) => unknown>
  /** Named view tabs → predicate. Views are controls, not endpoints (foundation §3.8 rule 3). */
  views?: Record<string, (row: T) => boolean>
  /**
   * Which `filterable` fields have a **closed value set**, so a `select` or
   * `multi-select` control can source its options from the data instead of a
   * hand-written list (F-6). Every name here must also exist in `filterable`;
   * `computeFacets` throws if it does not.
   */
  facetable?: string[]
}

export function runQuery<T>(rows: readonly T[], params: QueryParams, shape: QueryShape<T>): Paginated<T> {
  let out = rows.slice()

  if (params.view && shape.views) {
    const predicate = shape.views[params.view]
    if (!predicate) throw new Error(`Unknown view "${params.view}" — declared views: ${Object.keys(shape.views).join(', ')}`)
    out = out.filter(predicate)
  }

  const q = params.q?.trim().toLowerCase()
  if (q) {
    out = out.filter((row) =>
      shape.searchable.some((get) => {
        const v = get(row)
        return typeof v === 'string' && v.toLowerCase().includes(q)
      }),
    )
  }

  for (const filter of params.filters ?? []) {
    const get = shape.filterable[filter.field]
    if (!get) throw new Error(`Unknown filter field "${filter.field}"`)
    out = out.filter((row) => matches(get(row), filter))
  }

  if (params.sort) out = sortRows(out, params.sort, shape)

  return paginate(out, params)
}

/**
 * The option set for every `facetable` field, computed from the rows.
 *
 * Scoped by `view` only, deliberately **not** by the active filters: a filter
 * dropdown that loses its other options the moment you pick one is a dropdown
 * an operator cannot get back out of. Counts are therefore "how many exist in
 * this view", not "how many match what you have already narrowed to".
 *
 * A real API may instead return per-facet counts computed with that facet's own
 * filter excluded. That is a better answer and it does not change this
 * signature, so screens written against it survive the swap.
 *
 * Ordering is count-descending then value-ascending — deterministic, so a
 * dropdown does not reshuffle between renders and a snapshot can diff it.
 */
export function computeFacets<T>(
  rows: readonly T[],
  shape: QueryShape<T>,
  view?: string | null,
): Facets {
  const fields = shape.facetable ?? []
  const scoped = view && shape.views?.[view] ? rows.filter(shape.views[view]!) : rows
  const out: Facets = {}

  for (const field of fields) {
    const get = shape.filterable[field]
    if (!get) throw new Error(`Facetable field "${field}" is not filterable`)
    const counts = new Map<string, number>()
    for (const row of scoped) {
      const value = get(row)
      /* `null` is "not set", not a value an operator can pick — the select
         control already reserves null for `Any`. */
      if (value === null || value === undefined || value === '') continue
      const key = String(value)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    out[field] = [...counts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, ['ar', 'en']))
  }
  return out
}

export function paginate<T>(rows: readonly T[], params: Pick<QueryParams, 'page' | 'pageSize'>): Paginated<T> {
  const pageSize = Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE)
  const total = rows.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(Math.max(1, params.page ?? 1), totalPages)
  const start = (page - 1) * pageSize
  return { items: rows.slice(start, start + pageSize), page, pageSize, total, totalPages }
}

function sortRows<T>(rows: T[], sort: SortSpec, shape: QueryShape<T>): T[] {
  const get = shape.sortable[sort.field]
  if (!get) throw new Error(`Unknown sort field "${sort.field}"`)
  const dir = sort.dir === 'desc' ? -1 : 1
  // Stable: Array.prototype.sort is stable in every engine we target, so equal
  // keys keep fixture order and a paginated list never reshuffles between pages.
  return rows.sort((a, b) => compare(get(a), get(b)) * dir)
}

function compare(a: string | number | null, b: string | number | null): number {
  // Nulls sort last in ascending order — "no last trip" belongs at the bottom,
  // not at the top pretending to be the oldest.
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  // `ar` first so Arabic names collate correctly; `numeric` so DRV-9 < DRV-10.
  return String(a).localeCompare(String(b), ['ar', 'en'], { numeric: true, sensitivity: 'base' })
}

function matches(value: unknown, filter: FilterSpec): boolean {
  const { op, value: target } = filter
  switch (op) {
    case 'eq':
      return value === target
    case 'neq':
      return value !== target
    case 'in':
      return Array.isArray(target) && (target as Array<unknown>).includes(value as never)
    case 'nin':
      return Array.isArray(target) && !(target as Array<unknown>).includes(value as never)
    case 'gt':
      return numeric(value) > numeric(target)
    case 'gte':
      return numeric(value) >= numeric(target)
    case 'lt':
      return numeric(value) < numeric(target)
    case 'lte':
      return numeric(value) <= numeric(target)
    case 'between': {
      if (!Array.isArray(target) || target.length !== 2) return false
      const n = numeric(value)
      return n >= numeric(target[0]) && n <= numeric(target[1])
    }
    case 'contains':
      return typeof value === 'string' && typeof target === 'string'
        ? value.toLowerCase().includes(target.toLowerCase())
        : Array.isArray(value) && (value as Array<unknown>).includes(target as never)
    case 'isNull':
      return value === null || value === undefined
    case 'isNotNull':
      return value !== null && value !== undefined
    default:
      return false
  }
}

function numeric(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const parsed = Date.parse(v)
    if (!Number.isNaN(parsed)) return parsed
    const n = Number(v)
    if (!Number.isNaN(n)) return n
  }
  return Number.NaN
}
