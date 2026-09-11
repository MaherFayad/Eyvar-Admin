/**
 * **Not the dashboard resource.** §11's CRUD is deleted; D39 makes a
 * dashboard one `kind` of `Page`, and `pages.ts` is that resource now. What
 * is left is the pure board-scope arithmetic three files outside this WP's
 * allow-list still call by this path; ported to `Page.scope` by WP-4.x.
 */

import type { FilterSpec, IsoDate } from '../types/common'
import type { Dimension, Measure } from '../types/measure'
import { tileSpan, type DashboardTile, type ReportQuery, type ReportWindow } from '../types/report'
import { planReportQuery } from './catalogue'

/* ─────────────── §C4 — the board scope, resolved per tile ──────────────── */

/** What the board imposes. The two fields `Dashboard` persists, and nothing else. */
export interface BoardScope {
  range: ReportWindow | null
  filters: readonly FilterSpec[]
}

/** The board scope that imposes nothing — every tile answers with its own window. */
export const OPEN_BOARD_SCOPE: BoardScope = { range: null, filters: [] }

/**
 * One tile's question, after the board has had its say.
 *
 * **The refusals are returned, not swallowed.** A tile that quietly ignored the
 * filter an operator can read two inches above it is the worst outcome
 * available here: the numbers are right for a question nobody asked and nothing
 * on screen says which question that was.
 */
export interface ScopedTileQuery {
  /** What to run. Never illegal — every override that would make it so was backed out. */
  query: ReportQuery
  /** True when the board range was refused and the report's own window stands. */
  rangeRefused: boolean
  /** Board filter fields this report cannot take, in board order. */
  refusedFilterFields: string[]
  /** Board filter fields that really did narrow this tile. */
  appliedFilterFields: string[]
}

/**
 * **Apply a dashboard's range and filters to one tile's saved query.**
 *
 * Three rules, in this order: (1) a board filter applies only where the
 * report's `legalFilterFields` admit it; (2) a board filter on a field
 * REPLACES the report's own filter on that field, not joined with it; (3) the
 * range is applied only if it introduces no NEW violation, compared against
 * the report's own plan rather than against zero.
 */
export function applyBoardScope(
  query: ReportQuery,
  scope: BoardScope,
  catalogue: { measures: readonly Measure[]; dimensions: readonly Dimension[] },
  today: string,
): ScopedTileQuery {
  const own = planReportQuery(query, catalogue, today)

  const applied: FilterSpec[] = []
  const refusedFilterFields: string[] = []
  for (const filter of scope.filters) {
    if (own.legalFilterFields.includes(filter.field)) applied.push(filter)
    else refusedFilterFields.push(filter.field)
  }

  const filters =
    applied.length === 0
      ? query.filters
      : [
          ...query.filters.filter(
            (existing) => !applied.some((board) => board.field === existing.field),
          ),
          ...applied,
        ]

  let window = query.window
  let rangeRefused = false
  if (scope.range !== null) {
    const candidate: ReportQuery = { ...query, filters, window: scope.range }
    const introduced = planReportQuery(candidate, catalogue, today).violations.filter(
      (violation) =>
        !own.violations.some(
          (existing) => existing.code === violation.code && existing.field === violation.field,
        ),
    )
    if (introduced.length > 0) rangeRefused = true
    else window = scope.range
  }

  return {
    query: { ...query, filters, window },
    rangeRefused,
    refusedFilterFields,
    appliedFilterFields: applied.map((filter) => filter.field),
  }
}

/**
 * Every field some measure in the catalogue can be filtered by — the board
 * filter control's vocabulary. Derived from the catalogue, never hand-kept.
 */
export function boardFilterFields(measures: readonly Measure[], dimensions: readonly Dimension[]): string[] {
  const named = new Set(dimensions.map((dimension) => dimension.key))
  const fields = new Set<string>()
  for (const measure of measures) {
    for (const field of measure.filterableFields) if (named.has(field)) fields.add(field)
  }
  return [...fields].sort()
}

/* ─────────────────── tile ordering — pure, keyboard-first ──────────────── */

/**
 * Move a tile to a **1-based position**, keyboard-operable by construction.
 * A move is a removal and a re-insertion, not a swap, so moving tile 6 to
 * position 1 keeps every other tile's relative order. Out-of-range positions
 * return the list unchanged rather than throwing.
 */
export function moveTileTo(
  tiles: readonly DashboardTile[],
  tileId: string,
  position: number,
): DashboardTile[] {
  const ordered = [...tiles].sort((a, b) => a.order - b.order)
  const index = ordered.findIndex((t) => t.tileId === tileId)
  const target = position - 1
  if (index === -1 || target < 0 || target >= ordered.length) return ordered
  const moved = ordered[index]
  if (!moved) return ordered
  const rest = ordered.filter((_, i) => i !== index)
  const next = [...rest.slice(0, target), moved, ...rest.slice(target)]
  return next.map((t, i) => ({ ...t, order: i + 1 }))
}

/** `Move up` / `Move down` — the fast path for ±1, keyboard-operable by construction (AC-871). */
export function moveTile(tiles: readonly DashboardTile[], tileId: string, direction: -1 | 1): DashboardTile[] {
  const ordered = [...tiles].sort((a, b) => a.order - b.order)
  const index = ordered.findIndex((t) => t.tileId === tileId)
  if (index === -1) return ordered
  return moveTileTo(ordered, tileId, index + 1 + direction)
}

/* Re-exported so a caller of the old path still gets a working `tileSpan` and `IsoDate`. */
export { tileSpan }
export type { IsoDate }
