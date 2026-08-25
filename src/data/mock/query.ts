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
