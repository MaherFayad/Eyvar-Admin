/**
 * The card every People view renders into — toolbar, chip row, `DataTable`.
 *
 * One card holds the view tabs, the filter row, the header row, the rows and
 * the bulk action bar (§9.1, §3.1). **Never a bare `<table>`** — `DataTable`
 * owns that; this owns the two rows above it and the column-visibility state
 * that §9.1 makes per-view.
 *
 * **The mode is `table.mode`, not a prop.** This component takes whatever
 * `useIndexTable` returned and hands it straight to `DataTable`, so the
 * discriminated union survives: in a `queue` there is no `selectedIds` to bind
 * a checkbox to, and TypeScript — not a runtime `if` — is what says so
 * (**AC-48**).
 *
 * Rules applied
 *   §9.1       toolbar 40px, chip row 36px, both inside the card, above the
 *              header row.
 *   §9.1       **visible columns and their order are per-view state.** The
 *              hidden set is seeded from each column's `defaultHidden` and
 *              lives for as long as the view is mounted — which is exactly
 *              §4.4's "per-table state persists within the session, resets on
 *              reload, never shared between two tables".
 *   AC-37/38   the empty KIND comes from `table.isFiltered` inside
 *              `DataTable`. Nothing here can choose it, which is the point.
 *   §11.2      the card-scoped error keeps the toolbar rendered above it, so
 *              the operator can change the query that failed.
 */

import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { AnyTable } from '@/hooks'
import { useColumnVisibility } from '@/hooks'
import type { FilterSpec } from '@/data/types'
import type { Translate } from '@/lib'
import { DataTable, type DataColumn, type RowAction } from '@/components/DataTable'
import type { EmptyAction } from '@/components/EmptyState'
import { FilterChipRow, type FilterField } from './FilterChipRow'
import { IndexToolbar, type SortField, type ToolbarTab } from './IndexToolbar'

/**
 * A `DataTable` column plus what `useColumnVisibility` needs. The hook is
 * generic over `VisibilityColumn`, so the column objects go in and come back
 * out — there is no second column type to keep in sync.
 */
export interface PeopleColumn<T> extends DataColumn<T> {
  /** §3.1 / §7.1 — the identity column. Refused, not merely discouraged. */
  alwaysVisible?: boolean
  /** Off on first render; the operator can turn it on. `Reset columns` restores this. */
  defaultHidden?: boolean
}

export interface PeopleTableProps<T> {
  t: Translate
  table: AnyTable<T>
  rows: readonly T[]
  status: 'loading' | 'error' | 'empty' | 'content'
  total: number
  getRowId: (row: T) => string
  columns: ReadonlyArray<PeopleColumn<T>>

  tabs: readonly ToolbarTab[]
  activeTab: string
  onSelectTab: (id: string) => void
  /** §8's `meta` line. Reported from here so every view answers the same way. */
  onTotal: (total: number | null) => void
  searchPlaceholder: string

  sortFields: readonly SortField[]
  filterFields: readonly FilterField[]
  /** §9.4 — a queue scope chip. A view, not a filter; it carries its own ✕. */
  scope?: { label: string; clearLabel: string; onClear: () => void } | null

  rowActions?: ReadonlyArray<RowAction<T>>
  bulkActions?: ReadonlyArray<{ label: string; onClick: (ids: ReadonlySet<string>) => void }>

  firstRun: { heading: string; body: string; actions: EmptyAction[] }
  noMatch: { message: string; action?: EmptyAction }
  error: { message: string; onRetry: () => void }
  skeletonPattern?: 'P1' | 'P7' | 'P8'
}

/**
 * **D-2's row height, bridged from the outside — and a request to move it.**
 *
 * `--ev-row-h` is **32px** (§1.2) and D-2 says Eyvar is denser than Shopify:
 * ~13px base, ~30px rows. Three rules currently make that unreachable inside
 * `DataTable`:
 *
 *   `table.tsx`  `<td>` carries `h-row px-3 py-2` — 8px block padding
 *   `DataTable`  the row kebab is `size="icon-xs"`, a **24px rendered box**
 *   §7.7         a hit target must be ≥ 24 × 24 — which is right
 *
 * 24 + 8 + 8 = **40px**, plus the hairline: measured at 41px, which is
 * Shopify's own row height, not tighter than it. §7.7 actually asks for the
 * ≥24px area to come from *"padding plus a compensating negative margin,
 * **without changing the rendered box**"* — so the 24px box is the deviation,
 * not the padding.
 *
 * Until that is fixed where it belongs, this screen sets the block padding to
 * 4px through `DataTable`'s own `className`, which lands every row on exactly
 * `--ev-row-h`: 24 + 4 + 4 = 32. It is a scale value, not an arbitrary one,
 * and it is applied in ONE place rather than per cell.
 *
 * **The fix I am asking the `src/components/` owner for**, which retires this
 * line entirely: `py-2` → `py-1` on `TableCell` in `table.tsx`, and the kebab
 * rendered at 20px with a padded 24px hit area per §7.7.
 */
const DENSITY = '[&_td]:py-1'

export function PeopleTable<T>({
  t,
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
  sortFields,
  filterFields,
  scope = null,
  rowActions,
  bulkActions,
  firstRun,
  noMatch,
  error,
  skeletonPattern,
}: PeopleTableProps<T>) {
  /* §3.1's "visible columns are per-view state", and §7.1's "the identity
     column is never hideable", both owned by the shared hook rather than
     re-implemented per screen. `view: activeTab` is what keeps the Captains
     column set and the Riders one independent. */
  const visibility = useColumnVisibility({ columns, tableId: 'operations-people', view: activeTab })

  /* The page header's `meta` count. Reported after paint rather than during
     render, because it sets state on an ancestor. `null` until the read lands,
     so the line is absent rather than reading `0` for a second. */
  useEffect(() => {
    onTotal(status === 'content' ? total : null)
    return () => onTotal(null)
  }, [onTotal, status, total])

  /* AC-45 — the caret is an indicator and only a sortable mode has one.
     `'sort' in table` narrows the union; a ledger has no `sort` at all. */
  const sort = 'sort' in table ? table.sort : null

  function setFilter(spec: FilterSpec) {
    table.setFilter(spec)
  }

  return (
    <DataTable
      className={cn(DENSITY)}
      table={table}
      rows={rows}
      columns={visibility.visible}
      getRowId={getRowId}
      status={status}
      total={total}
      t={t}
      skeletonPattern={skeletonPattern}
      rowActions={rowActions}
      bulkActions={bulkActions}
      firstRun={firstRun}
      noMatch={noMatch}
      error={error}
      toolbar={
        <IndexToolbar
          t={t}
          tabs={tabs}
          activeTab={activeTab}
          onSelectTab={onSelectTab}
          searchPlaceholder={searchPlaceholder}
          query={table.query}
          onQueryChange={table.setQuery}
          sortFields={sortFields}
          sort={sort}
          onSortField={(field) => {
            if ('setSortField' in table) table.setSortField(field)
          }}
          onSortDirection={(direction) => {
            if ('setSortDirection' in table) table.setSortDirection(direction)
          }}
          columns={columns.map((c) => ({ id: c.id, label: c.header }))}
          hiddenColumns={visibility.hidden}
          isHideable={visibility.isHideable}
          onToggleColumn={visibility.toggle}
          showColumnsControl={visibility.needsColumnsControl}
          onResetColumns={visibility.reset}
          filterFields={filterFields}
          onSetFilter={setFilter}
        />
      }
      filterRow={
        <FilterChipRow
          t={t}
          fields={filterFields}
          active={table.filters}
          onSetFilter={setFilter}
          onRemoveFilter={table.removeFilter}
          onClearAll={table.clearAll}
          isFiltered={table.isFiltered}
          scope={scope}
        />
      }
    />
  )
}
