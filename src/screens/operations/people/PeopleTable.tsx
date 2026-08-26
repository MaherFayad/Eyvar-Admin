/**
 * The card every People view renders into.
 *
 * **This is now a thin adapter, and that is the point.** The toolbar, the
 * filter chip strip, the column-visibility state, the column pinning and every
 * per-column control moved into `DataTable` when
 * `docs/05-restructure/design/01-table-controls.md` landed. A screen declares
 * its columns and its copy; it builds no control. `filterRow`, `sortFields`,
 * `filterFields`, `IndexToolbar` and this screen's own `FilterChipRow` are all
 * gone (**AC-103**).
 *
 * **The mode is `table.mode`, not a prop.** This takes whatever `useIndexTable`
 * returned and hands it straight to `DataTable`, so the discriminated union
 * survives: in a `queue` there is no `selectedIds` to bind a checkbox to, and
 * TypeScript — not a runtime `if` — is what says so (**AC-48**, **AC-113**).
 *
 * Rules applied
 *   §7.6       `tableId` and `view` go to `DataTable`, which passes the SAME
 *              pair to `useColumnVisibility` and `useColumnPinning`. Different
 *              keys would let the two diverge per view.
 *   §9.1       **visible columns and their order are per-view state.**
 *              `view: activeTab` is what keeps the Captains column set and the
 *              Riders one independent.
 *   AC-37/38   the empty KIND comes from `table.isFiltered` inside
 *              `DataTable`. Nothing here can choose it, which is the point.
 */

import { useEffect } from 'react'
import type { AnyTable } from '@/hooks'
import type { Language, Translate } from '@/lib'
import {
  DataTable,
  type DataColumn,
  type ExtraFilterSpec,
  type RowAction,
  type ToolbarTab,
} from '@/components/DataTable'
import type { EmptyAction } from '@/components/EmptyState'

/**
 * The screen's column type is `DataColumn` itself. There is no `PeopleColumn`
 * any more: `alwaysVisible`, `defaultHidden`, `width`, `filter` and `dataType`
 * are all part of the shared contract now (§15), so a second type here would be
 * a copy that drifts.
 */
export type PeopleColumn<T> = DataColumn<T>

export interface PeopleTableProps<T> {
  t: Translate
  language: Language
  table: AnyTable<T>
  rows: readonly T[]
  status: 'loading' | 'error' | 'empty' | 'content'
  total: number
  getRowId: (row: T) => string
  columns: ReadonlyArray<DataColumn<T>>

  tabs: readonly ToolbarTab[]
  activeTab: string
  onSelectTab: (id: string) => void
  /** §8's `meta` line. Reported from here so every view answers the same way. */
  onTotal: (total: number | null) => void
  searchPlaceholder: string

  /** §6.4 — filters bound to no visible column. */
  extraFilters?: readonly ExtraFilterSpec[]
  /** §6.1 — the clock a `date-range` filter's presets are measured against. */
  now?: string | null
  /** §9.4 — a queue scope chip. A view, not a filter; it carries its own ✕. */
  scope?: { label: string; clearLabel: string; onClear: () => void } | null

  rowActions?: ReadonlyArray<RowAction<T>>
  bulkActions?: ReadonlyArray<{ label: string; onClick: (ids: ReadonlySet<string>) => void }>

  firstRun: { heading: string; body: string; actions: EmptyAction[] }
  noMatch: { message: string; action?: EmptyAction }
  error: { message: string; onRetry: () => void }
  skeletonPattern?: 'P1' | 'P7' | 'P8'
}

export function PeopleTable<T>({
  t,
  language,
  table,
  rows,
  status,
  total,
  getRowId,
  columns,
  tabs,
  activeTab,
  onSelectTab,
  onTotal,
  searchPlaceholder,
  extraFilters,
  now = null,
  scope = null,
  rowActions,
  bulkActions,
  firstRun,
  noMatch,
  error,
  skeletonPattern,
}: PeopleTableProps<T>) {
  /* The page header's `meta` count. Reported after paint rather than during
     render, because it sets state on an ancestor. `null` until the read lands,
     so the line is absent rather than reading `0` for a second. */
  useEffect(() => {
    onTotal(status === 'content' ? total : null)
    return () => onTotal(null)
  }, [onTotal, status, total])

  return (
    <DataTable
      table={table}
      rows={rows}
      columns={columns}
      getRowId={getRowId}
      status={status}
      total={total}
      t={t}
      language={language}
      tableId="operations-people"
      view={activeTab}
      tabs={tabs}
      activeTab={activeTab}
      onSelectTab={onSelectTab}
      searchPlaceholder={searchPlaceholder}
      extraFilters={extraFilters}
      now={now}
      scope={scope}
      skeletonPattern={skeletonPattern}
      rowActions={rowActions}
      bulkActions={bulkActions}
      firstRun={firstRun}
      noMatch={noMatch}
      error={error}
    />
  )
}
