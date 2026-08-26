/**
 * `DataTable` (D-01) — `DESIGN.md` §9.1–§9.4 and **§8.5**, built to
 * `docs/05-restructure/design/01-table-controls.md`.
 *
 * > **§9.4**: `DataTable` takes a `mode` prop — `index | ledger | queue` — and
 * > **the mode, not the route, decides which furniture renders. A route may
 * > mount more than one mode over its lifetime. It may never mount two at
 * > once.**
 *
 * **The mode is `table.mode`, off `useIndexTable`'s discriminated union — not a
 * prop invented here.** In the `ledger` branch TypeScript refuses to compile a
 * selection or a sort, because `LedgerTable` has no `selectedIds`, no
 * `toggleRow` and no `setSortField` **at all**. So **AC-48 is enforced by
 * `tsc`**, not by a runtime `if` — and **AC-113** rides the same mechanism: the
 * header menu's `sorting` prop is `null` on a ledger because there is nothing to
 * pass it.
 *
 * ## What this component now owns, and no screen does
 *
 * | | before | after |
 * |---|---|---|
 * | sort | a popover the page passed in through `toolbar` | this component's, reachable from the toolbar **and** from every sortable header |
 * | filter | `filterRow?: ReactNode` the page built | a column **declares** its filter; this renders the control, the chip strip and the picker. `filterRow` is **removed** (**AC-103**) |
 * | columns | the page held `useColumnVisibility` | held here, beside `useColumnPinning`, keyed on the same `tableId` + `view` |
 * | pinning | did not exist | §8.5's three regions, over `useColumnPinning` |
 *
 * ## The two decisions this file makes
 *
 * **Where the sticky axes cross.** Three stacking levels and no more: the
 * sticky header row (20) sits above pinned **body** cells (10); a pinned
 * column's own header — the corner cell — is sticky on both axes and above
 * everything (30). Separation at both boundaries is a **hairline, never a
 * shadow**: all three elevation tokens are `offset-x: 0` so nothing mirrors,
 * and an inline-edge shadow would need an x-offset — which is the second half
 * of the legacy defect at `:751` (**AC-110**).
 *
 * **`tableId` and where elevation sits.** `tableId` is required and is passed
 * verbatim to *both* hooks along with `table.view`; pass different keys and the
 * per-view column state diverges. Elevation stays on the **card** (tier 1, from
 * `card.tsx`) and on the floating bulk bar (tier 2). No cell carries any.
 *
 * Rules applied
 *   §9.1        ONE CARD holds the toolbar, the chip strip, the header row, the
 *               rows and the bulk bar. **Never a bare `<table>`** (§3.1).
 *   §14.4/AC-112
 *               the toolbar, the chip strip, the pagination and the bulk bar sit
 *               **outside** the horizontal scroll container. The bulk bar is
 *               positioned against the card; inside the scroller it would slide
 *               off with the columns.
 *   §9.1/AC-46  ticking any checkbox **replaces the header row** with `N
 *               selected`; the column labels are absent while selection is
 *               active, so no header menu exists then (**AC-115**) and the
 *               toolbar is the reachable entry point.
 *   D-6/AC-80   a header cell contains **exactly one** interactive element — a
 *               menu trigger — or none. Never two. This supersedes AC-45's
 *               "headers are not interactive" clause and nothing else.
 *   §11.2       a **re-query keeps the header row alive** and replaces only the
 *               body rows. The operator applied that filter from that header
 *               and their focus is on its trigger; destroying it mid-interaction
 *               is what §7.2 forbids. An internal ref, not a new `status`
 *               value — a new status would change every page, which is the
 *               opposite of the request.
 *   §11.5       `no-match` supplies its own action when the page does not:
 *               `Clear {column} filter` for a single filter, `Clear all
 *               filters` otherwise. One fewer thing every page writes.
 *   §13.6       sort, filter and pin are announced through `useAnnounce`
 *               (`aria-live="polite"`). **No toast fires for any of them**:
 *               R9/R10 spend a toast on a mutation of an object, and sorting a
 *               view mutates nothing.
 *   §9.1/AC-68  the row kebab **always renders**, muted, taking ink and a fill
 *               on the row's hover **or focus-within**. Closes **D19**.
 *   §9.1        **the whole row is not a click target** — only the identity
 *               link is.
 *   §9.1/R4     numeric, currency and count columns are `text-end`, never
 *               `text-align: right`, header and value sharing one edge.
 *   §9.2/AC-49  a ledger opens and closes with labelled balance rows.
 *   R8/AC-37/38 `no-match` vs `first-run` comes from `table.isFiltered`, so the
 *               choice is mechanical rather than a judgement at the call site.
 *               A column filter sets it exactly like a toolbar filter, so
 *               neither criterion needed amending.
 */

import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  directionFor,
  formatCount,
  pageRange,
  toFilterSpec,
  type ColumnFilterValue,
  type Language,
  type Translate,
} from '@/lib'
import type { PinRefusal, PinnableColumn, TableSorting } from '@/hooks'
import { useAnnounce, useColumnPinning, useColumnVisibility, useRovingFocus } from '@/hooks'
import type { AnyTable } from '@/hooks'
import { EmptyState, type EmptyAction } from './EmptyState'
import { ErrorState } from './ErrorState'
import { LoadingSkeleton } from './LoadingSkeleton'
import { ColumnHeaderCell } from './table/ColumnHeaderCell'
import { ColumnLayoutPopover } from './table/ColumnLayoutPopover'
import { AddFilterPopover, FilterChipRow } from './table/FilterChipRow'
import { IndexToolbar, type ToolbarTab } from './table/IndexToolbar'
import { SortControl } from './table/SortControl'
import {
  filterEntries,
  filterFieldOf,
  type DataColumn,
  type ExtraFilterSpec,
} from './table/columns'
import {
  KEBAB_COLUMN_ID,
  LANE_WIDTH_PX,
  SELECT_COLUMN_ID,
  pinnedStyle,
  useTableOverflow,
} from './table/pinning'

export type {
  ColumnDataType,
  ColumnFilterOption,
  ColumnFilterSpec,
  DataColumn,
  ExtraFilterSpec,
} from './table/columns'
export type { ToolbarTab } from './table/IndexToolbar'

export interface RowAction<T> {
  label: string
  onSelect: (row: T) => void
  /** §11.2 — gate at RENDER, not at commit. Disabled in place, never hidden. */
  disabled?: (row: T) => boolean
}

/* ──────────────────────────── the props ──────────────────────────── */

export interface DataTableProps<T> {
  /** From `useIndexTable`. **The mode is `table.mode`** — see the header. */
  table: AnyTable<T>
  rows: readonly T[]
  /** Every declared column, in declaration order. Hidden ones included. */
  columns: ReadonlyArray<DataColumn<T>>
  getRowId: (row: T) => string
  /** The four states, in order. `content` is whatever `rows` holds. */
  status: 'loading' | 'error' | 'empty' | 'content'
  total: number
  t: Translate
  language: Language

  /**
   * §7.6 — the key both column hooks share. Per table **and** per view: pass
   * different keys to the two hooks and their per-view state diverges.
   */
  tableId: string
  /**
   * §7.6 — the second half of the key. Defaults to `table.view`, which is right
   * whenever the saved-view tabs ARE the table's views. A screen whose tabs
   * mount different column sets (Operations › People) passes the tab instead,
   * so one tab's hidden set can never be read as another's.
   */
  view?: string | null

  /** §9.1 — the view tabs, rendered by the toolbar this component owns. */
  tabs?: readonly ToolbarTab[]
  activeTab?: string
  onSelectTab?: (id: string) => void
  searchPlaceholder: string
  /** §9.4 — a queue scope chip. A view, not a filter; it carries its own ✕. */
  scope?: { label: string; clearLabel: string; onClear: () => void } | null
  /** §6.4 — filters bound to no visible column. */
  extraFilters?: readonly ExtraFilterSpec[]
  /** §6.1 — the clock a `date-range` filter's presets are computed against. */
  now?: string | null

  /** §9.1 — always renders; takes ink and a fill on hover **or focus-within**. */
  rowActions?: ReadonlyArray<RowAction<T>>
  /** §9.1 — at most THREE labelled secondary buttons, then `…`. */
  bulkActions?: ReadonlyArray<{ label: string; onClick: (ids: ReadonlySet<string>) => void }>

  /** §11.1 — the `first-run` copy. Required so the empty state cannot be a TODO. */
  firstRun: { heading: string; body: string; actions: EmptyAction[] }
  /** §11.5 — the `no-match` sentence. The ACTION is optional; this supplies a default. */
  noMatch: { message: string; action?: EmptyAction }
  /** §11.2 — card-scoped error copy. */
  error: { message: string; onRetry: () => void }

  /** §9.2 — ledger only. `Opening balance` / `Closing balance`, bold both sides. */
  ledgerBoundaryRows?: { opening: ReactNode; closing: ReactNode }
  /** V-11 — one centred line, outside the card. */
  learnMore?: ReactNode
  /** §11.3 — which skeleton shape. Defaults from the mode. */
  skeletonPattern?: 'P1' | 'P7' | 'P8'
  className?: string
}

export function DataTable<T>(props: DataTableProps<T>) {
  const {
    table,
    rows,
    columns,
    getRowId,
    status,
    total,
    t,
    language,
    tableId,
    view: viewKey,
    tabs = [],
    activeTab = '',
    onSelectTab,
    searchPlaceholder,
    scope = null,
    extraFilters = [],
    now = null,
    rowActions,
    bulkActions,
    firstRun,
    noMatch,
    error,
    ledgerBoundaryRows,
    learnMore,
    skeletonPattern,
    className,
  } = props

  const announce = useAnnounce()
  const direction = directionFor(language)

  /* AC-48, at the type level. `canSelect` and `canRowAction` are LITERAL
     `false` on `LedgerTable`, so these two constants are `false` at compile
     time in the ledger branch and a reviewer can see it. */
  const isLedger = table.mode === 'ledger'
  const selectable = !isLedger && table.canSelect
  const kebabs = Boolean(!isLedger && table.canRowAction && rowActions && rowActions.length > 0)

  /* AC-113 — `null` on a ledger, and not as a flag: `LedgerTable` has no
     `setSortField`, so there is nothing to put in this object. A sort item in a
     ledger header would be a compile error, not a convention. */
  const rawSorting: TableSorting | null = table.mode === 'ledger' ? null : table
  const view = viewKey === undefined ? table.view : viewKey

  /* §9.1 / §7.6 — per table AND per view, both hooks on the same key. */
  const visibility = useColumnVisibility({ columns, tableId, view })
  const visible = visibility.visible

  /* §7.1's three regions. The R5a marker lane rides the identity column, which
     is why there is no fourth entry here: §8.4 draws the marker at the row's
     inset-inline-start, inside the first cell, and the first cell is locked. */
  const pinColumns = useMemo<PinnableColumn[]>(() => {
    const list: PinnableColumn[] = []
    if (selectable) list.push({ id: SELECT_COLUMN_ID, width: LANE_WIDTH_PX, lockedEdge: 'start' })
    visible.forEach((column, index) => {
      /* **AC-104 with its precondition made explicit.** Column index 0 is the
         identity and is pinned implicitly and permanently — *provided it
         declares an inline size*. §7.2 makes that a requirement of the column
         contract, and `useColumnPinning` enforces it by THROWING
         (`Column "captain" cannot be pinned without a positive width`).
         The hook is right to throw; the caller is wrong to ask, so this asks
         only when the answer can be yes. A screen that forgets `width` gets a
         table with no frozen identity column — degraded, legible, and not a
         crash on first paint. */
      const sizeable = typeof column.width === 'number' && Number.isFinite(column.width) && column.width > 0
      list.push({
        id: column.id,
        width: sizeable ? (column.width as number) : 0,
        ...(index === 0 && sizeable ? { lockedEdge: 'start' as const } : {}),
      })
    })
    /* AC-105 — the kebab column is pinned to the inline-END implicitly and
       permanently. `PinEdge` supports `'end'` for exactly this; **no operator
       control ever passes it** (AC-107). */
    if (kebabs) list.push({ id: KEBAB_COLUMN_ID, width: LANE_WIDTH_PX, lockedEdge: 'end' })
    return list
  }, [selectable, kebabs, visible])

  const pins = useColumnPinning({ columns: pinColumns, tableId, view })
  const { scrollRef, overflowing } = useTableOverflow(direction)

  /* ── announcements (§13.6). Never a toast: sorting mutates nothing. ── */

  const headerOf = useCallback(
    (field: string): string =>
      columns.find((column) => column.sortField === field)?.header ?? field,
    [columns],
  )

  const labelOf = useCallback(
    (field: string): string => {
      const column = columns.find((each) => filterFieldOf(each) === field)
      if (column) return column.header
      return extraFilters.find((each) => each.field === field)?.label ?? field
    },
    [columns, extraFilters],
  )

  const sorting = useMemo<TableSorting | null>(() => {
    if (rawSorting === null) return null
    return {
      sort: rawSorting.sort,
      setSortField: (field) => {
        rawSorting.setSortField(field)
        const dir = rawSorting.sort?.dir ?? 'asc'
        announce(
          t(dir === 'desc' ? 'table.announce.sortedDesc' : 'table.announce.sortedAsc', {
            column: headerOf(field),
          }),
        )
      },
      setSortDirection: (dir) => {
        rawSorting.setSortDirection(dir)
        const field = rawSorting.sort?.field
        if (field === undefined) return
        announce(
          t(dir === 'desc' ? 'table.announce.sortedDesc' : 'table.announce.sortedAsc', {
            column: headerOf(field),
          }),
        )
      },
      clearSort: () => {
        rawSorting.clearSort()
        announce(t('table.announce.sortCleared'))
      },
    }
  }, [rawSorting, announce, t, headerOf])

  /**
   * §6.3 — one commit path for every trigger. `toFilterSpec` returns the
   * `FilterSpec` or `null`, and `null` means `removeFilter`: that pairing is the
   * whole contract, and it is why a column filter sets `isFiltered` exactly like
   * a toolbar filter (**AC-93**, **AC-94**).
   */
  const commitFilter = useCallback(
    (field: string, value: ColumnFilterValue) => {
      const spec = toFilterSpec(field, value)
      if (spec === null) {
        table.removeFilter(field)
        announce(t('table.announce.filterRemoved', { column: labelOf(field) }))
        return
      }
      table.setFilter(spec)
      announce(t('table.announce.filterApplied', { column: labelOf(field) }))
    },
    [table, announce, t, labelOf],
  )

  const removeFilter = useCallback(
    (field: string) => {
      table.removeFilter(field)
      announce(t('table.announce.filterRemoved', { column: labelOf(field) }))
    },
    [table, announce, t, labelOf],
  )

  const clearAll = useCallback(() => {
    table.clearAll()
    announce(t('table.announce.allFiltersCleared'))
  }, [table, announce, t])

  /* ── pin + visibility controls, gated at render (§7.2, §11.2) ── */

  const pinnableIds = useMemo(() => {
    const ids = new Set<string>()
    visible.forEach((column, index) => {
      if (index === 0) return
      if (column.width === undefined || column.pinnable === false) return
      ids.add(column.id)
    })
    return ids
  }, [visible])

  const canPinColumn = useCallback(
    (id: string): PinRefusal | null | undefined =>
      pinnableIds.has(id) ? pins.canPin(id, 'start') : undefined,
    [pinnableIds, pins],
  )

  const togglePin = useCallback(
    (id: string) => {
      const wasPinned = pins.isPinned(id)
      const refusal = pins.togglePin(id, 'start')
      if (refusal !== null) return
      announce(
        t(wasPinned ? 'table.announce.unpinned' : 'table.announce.pinned', {
          column: columns.find((column) => column.id === id)?.header ?? id,
        }),
      )
    },
    [pins, announce, t, columns],
  )

  const toggleVisible = useCallback(
    (id: string) => {
      const wasVisible = visibility.isVisible(id)
      visibility.toggle(id)
      announce(
        t(wasVisible ? 'table.announce.columnHidden' : 'table.announce.columnShown', {
          column: columns.find((column) => column.id === id)?.header ?? id,
        }),
      )
    },
    [visibility, announce, t, columns],
  )

  const resetColumns = useCallback(() => {
    visibility.reset()
    pins.clearPins()
  }, [visibility, pins])

  /* ── the header row is ONE tab stop (§14.2, AC-85) ── */

  const headerCells = useMemo(
    () =>
      visible.map((column, index) => ({
        column,
        /* §7.1 — the identity column is never hideable and never unpinnable. */
        hideable: !isLedger && index > 0 && visibility.isHideable(column.id),
        pinnable: pinnableIds.has(column.id),
      })),
    [visible, isLedger, visibility, pinnableIds],
  )

  const rovingCount = headerCells.length
  const roving = useRovingFocus({
    itemCount: rovingCount,
    orientation: 'horizontal',
    direction,
    loop: false,
  })

  /* §11.2 — once this table has shown content, a re-query keeps the header row
     and replaces only the body. An internal ref rather than a new `status`
     value: a new status would change every page. */
  const hasShownContent = useRef(false)
  useEffect(() => {
    if (status === 'content') hasShownContent.current = true
  }, [status])
  const refreshing = status === 'loading' && hasShownContent.current

  const selectedCount = selectable ? table.selectedCount : 0
  const pattern = skeletonPattern ?? (isLedger ? 'P7' : table.mode === 'queue' ? 'P8' : 'P1')
  const range = pageRange(table.page, table.pageSize, total)
  const columnCount = visible.length + (selectable ? 1 : 0) + (kebabs ? 1 : 0)

  const entries = useMemo(
    () => filterEntries(columns, extraFilters),
    [columns, extraFilters],
  )

  const chipProps = {
    t,
    language,
    entries,
    active: table.filters,
    onCommit: commitFilter,
    onRemove: removeFilter,
    onClearAll: clearAll,
    isFiltered: table.isFiltered,
    scope,
    today: now === null ? null : now.slice(0, 10),
  }

  /* §11.5 — the component's own `no-match` action, when the page gives none. */
  const noMatchAction = useMemo<EmptyAction | undefined>(() => {
    if (noMatch.action) return noMatch.action
    const only = table.filters.length === 1 ? table.filters[0] : undefined
    if (only && table.query.trim() === '') {
      return {
        label: t('table.clearOneFilter', { column: labelOf(only.field) }),
        onClick: () => removeFilter(only.field),
      }
    }
    if (!table.isFiltered) return undefined
    return { label: t('table.clearFilters'), onClick: clearAll }
  }, [noMatch.action, table.filters, table.query, table.isFiltered, t, labelOf, removeFilter, clearAll])

  /* AC-111 — a pinned cell is OPAQUE and takes the ROW's own background,
     hover included, or the scrolling content shows through it. */
  const laneStyle = (id: string) => pinnedStyle(pins.pinnedColumn(id), LANE_WIDTH_PX, overflowing)
  const laneClass = (id: string) =>
    cn(
      pins.isPinned(id) &&
        'z-10 bg-card group-hover/row:bg-accent group-focus-within/row:bg-accent group-data-[state=selected]/row:bg-accent',
    )
  const headLaneClass = (id: string) =>
    cn('sticky top-0 w-10 bg-muted', pins.isPinned(id) ? 'z-30' : 'z-20')

  const headerRow = (
    <TableHeader>
      <TableRow ref={roving.containerRef}>
        {selectable && (
          <TableHead
            scope="col"
            style={laneStyle(SELECT_COLUMN_ID)}
            className={headLaneClass(SELECT_COLUMN_ID)}
          >
            <Checkbox
              aria-label={t('table.selectAll')}
              checked={
                table.pageSelectionState(rows) === 'all'
                  ? true
                  : table.pageSelectionState(rows) === 'some'
                    ? 'indeterminate'
                    : false
              }
              onCheckedChange={() => table.toggleAllOnPage(rows)}
            />
          </TableHead>
        )}

        {/* AC-46 / AC-115 — while anything is selected the column LABELS are
            absent and one `N selected` cell takes their place, so no header
            menu exists. Sort, filter and columns stay reachable from the
            toolbar. Not a banner above the table. */}
        {selectedCount > 0 ? (
          <TableHead
            colSpan={columnCount - 1}
            className="sticky top-0 z-20 bg-muted font-semibold text-foreground"
          >
            {t('table.selectedCount', { count: selectedCount })}
          </TableHead>
        ) : (
          <>
            {headerCells.map((cell, index) => (
              <ColumnHeaderCell
                key={cell.column.id}
                t={t}
                language={language}
                column={cell.column}
                sorting={sorting}
                activeFilter={table.filters.find(
                  (spec) => spec.field === filterFieldOf(cell.column),
                )}
                onCommitFilter={(value) => {
                  const field = filterFieldOf(cell.column)
                  if (field !== null) commitFilter(field, value)
                }}
                onClearFilter={() => {
                  const field = filterFieldOf(cell.column)
                  if (field !== null) removeFilter(field)
                }}
                pin={
                  cell.pinnable
                    ? {
                        isPinned: pins.isPinned(cell.column.id),
                        refusal: pins.canPin(cell.column.id, 'start'),
                        onToggle: () => togglePin(cell.column.id),
                      }
                    : null
                }
                onHide={cell.hideable ? () => toggleVisible(cell.column.id) : null}
                pinned={pins.pinnedColumn(cell.column.id)}
                overflowing={overflowing}
                today={chipProps.today}
                rovingProps={roving.itemProps(index)}
              />
            ))}
            {kebabs && (
              <TableHead
                style={laneStyle(KEBAB_COLUMN_ID)}
                className={headLaneClass(KEBAB_COLUMN_ID)}
              />
            )}
          </>
        )}
      </TableRow>
    </TableHeader>
  )

  return (
    <div className={cn('flex w-full flex-col gap-3', className)}>
      {/* §9.1 — ONE CARD holds everything. Never a bare `<table>`. */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-1">
        {/* AC-112 — the toolbar and the chip strip are OUTSIDE the horizontal
            scroll container, so they do not move when the table scrolls. */}
        <IndexToolbar
          t={t}
          tabs={tabs}
          activeTab={activeTab}
          onSelectTab={onSelectTab ?? (() => undefined)}
          searchPlaceholder={searchPlaceholder}
          query={table.query}
          onQueryChange={table.setQuery}
          filterTrigger={(trigger) => <AddFilterPopover {...chipProps} trigger={trigger} />}
          filterCount={table.filters.length}
          columnsControl={
            visibility.needsColumnsControl ? (
              <ColumnLayoutPopover
                t={t}
                columns={columns}
                isVisible={visibility.isVisible}
                isHideable={visibility.isHideable}
                onToggleVisible={toggleVisible}
                isPinned={pins.isPinned}
                canPin={canPinColumn}
                onTogglePin={togglePin}
                onReset={resetColumns}
                /* §9 — a ledger's column set is fixed by §8.3.3; it gets pin
                   toggles and no visibility checkboxes. */
                showVisibility={!isLedger}
              />
            ) : null
          }
          sortControl={
            sorting === null ? null : <SortControl t={t} sorting={sorting} columns={columns} />
          }
        />

        {/* §10.1 — at rest there is NO chip strip: the resting card is toolbar,
            header row, rows. It appears the moment anything is filtered, or a
            queue scope is on. `Add filter` is reachable at rest from the
            toolbar's own filter control, which is the second trigger §6.3
            already requires. */}
        {(table.isFiltered || scope !== null) && <FilterChipRow {...chipProps} />}

        {status === 'loading' && !refreshing && (
          <div className="p-3">
            <LoadingSkeleton pattern={pattern} />
          </div>
        )}

        {/* §11.2 — the CARD scope keeps the toolbar and the chip strip rendered
            above, so the operator can change the query that failed. §11.3: the
            header row is NOT rendered in the error state, which is exactly why
            the strip above it is the escape route. */}
        {status === 'error' && (
          <ErrorState
            scope="card"
            message={error.message}
            action={{ label: t('state.pageError.action'), onClick: error.onRetry }}
          />
        )}

        {/* AC-37 / AC-38 — the kind is decided by `isFiltered`, not by taste.
            A ledger is NEVER `first-run` empty (§9.2). */}
        {status === 'empty' &&
          (table.isFiltered || isLedger ? (
            <EmptyState kind="no-match" message={noMatch.message} action={noMatchAction} />
          ) : (
            <EmptyState
              kind="first-run"
              heading={firstRun.heading}
              body={firstRun.body}
              actions={firstRun.actions}
            />
          ))}

        {(status === 'content' || refreshing) && (
          /* §14.4 — ONE horizontal scroll container per table, inside the card,
             wrapping the `<table>`. `overscroll-behavior-inline: contain` so a
             trackpad flick at the end of the table does not trigger the
             browser's back-navigation gesture. */
          <Table containerRef={scrollRef}>
              {headerRow}

              <TableBody>
                {/* §9.2 / AC-49 — a ledger OPENS with a labelled opening balance. */}
                {isLedger && ledgerBoundaryRows && (
                  <TableRow className="font-semibold">
                    <TableCell colSpan={columnCount}>{ledgerBoundaryRows.opening}</TableCell>
                  </TableRow>
                )}

                {refreshing
                  ? Array.from({ length: Math.max(rows.length, 5) }, (_, index) => (
                      <TableRow key={`skeleton-${index}`} className="group/row relative">
                        {selectable && (
                          <TableCell style={laneStyle(SELECT_COLUMN_ID)} className={laneClass(SELECT_COLUMN_ID)}>
                            <Skeleton className="size-4" />
                          </TableCell>
                        )}
                        {visible.map((column) => (
                          <TableCell
                            key={column.id}
                            style={pinnedStyle(pins.pinnedColumn(column.id), column.width, overflowing)}
                            className={laneClass(column.id)}
                          >
                            <Skeleton className="h-3 w-full" />
                          </TableCell>
                        ))}
                        {kebabs && (
                          <TableCell style={laneStyle(KEBAB_COLUMN_ID)} className={laneClass(KEBAB_COLUMN_ID)}>
                            <Skeleton className="size-4" />
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  : rows.map((row) => {
                      const id = getRowId(row)
                      return (
                        <TableRow
                          key={id}
                          data-state={selectable && table.isSelected(id) ? 'selected' : undefined}
                          /* `group` so the kebab and the pinned cells can respond
                             to the row's hover AND its focus-within (AC-68).
                             `relative` so a `RowCriticalMarker` can position
                             against it — and because the marker rides the
                             implicitly pinned first cell, it stays visible at
                             every horizontal scroll offset (**AC-106**). */
                          className="group/row relative"
                        >
                          {selectable && (
                            <TableCell
                              style={laneStyle(SELECT_COLUMN_ID)}
                              className={cn('w-10', laneClass(SELECT_COLUMN_ID))}
                            >
                              <Checkbox
                                aria-label={t('table.selectRow')}
                                checked={table.isSelected(id)}
                                onCheckedChange={() => table.toggleRow(id)}
                              />
                            </TableCell>
                          )}

                          {visible.map((column, columnIndex) => {
                            const pinned = pins.pinnedColumn(column.id)
                            return (
                              <TableCell
                                key={column.id}
                                style={pinnedStyle(pinned, column.width, overflowing)}
                                className={cn(
                                  column.align === 'end' && 'text-end',
                                  /* `03-navattic-language.md` §4.5, and the
                                     match audit's largest single delta: **ink
                                     belongs to the identity column; the rest of
                                     the row is quieter.** Measured `#6b7280`
                                     against our `#24242f` — about 3× too dark,
                                     and a large part of why the table read
                                     heavy. `TableCell` defaults to
                                     `--ev-text-2` and index 0 takes it back. */
                                  columnIndex === 0 && 'text-foreground',
                                  laneClass(column.id),
                                )}
                              >
                                <span className="block">{column.cell(row)}</span>
                                {/* §9.1 — a 12px second line INSIDE the identity
                                    cell. The row grows to fit; never truncates. */}
                                {column.secondaryLine && (
                                  <span className="block text-xs text-muted-foreground">
                                    {column.secondaryLine(row)}
                                  </span>
                                )}
                              </TableCell>
                            )
                          })}

                          {kebabs && (
                            <TableCell
                              style={laneStyle(KEBAB_COLUMN_ID)}
                              className={cn('w-10', laneClass(KEBAB_COLUMN_ID))}
                            >
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    aria-label={t('table.rowActions', { row: id })}
                                    /* AC-68 / D19 — ALWAYS rendered. Muted at
                                       rest; ink plus a fill on the row's hover
                                       OR its focus-within. Never `opacity: 0`. */
                                    className="text-muted-foreground group-hover/row:bg-accent group-hover/row:text-foreground group-focus-within/row:bg-accent group-focus-within/row:text-foreground"
                                  >
                                    <span aria-hidden="true">⋯</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {rowActions?.map((action) => (
                                    <DropdownMenuItem
                                      key={action.label}
                                      onSelect={() => action.onSelect(row)}
                                      disabled={action.disabled?.(row) ?? false}
                                    >
                                      {action.label}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          )}
                        </TableRow>
                      )
                    })}
              </TableBody>

              {/* §9.2 / AC-49 — and CLOSES with a labelled closing balance. */}
              {isLedger && ledgerBoundaryRows && (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={columnCount}>{ledgerBoundaryRows.closing}</TableCell>
                  </TableRow>
                </TableFooter>
              )}
          </Table>
        )}

        {/* `03-navattic-language.md` §4.6 — **the pagination footer sits INSIDE
            the card**, and the match audit is why it moved: outside it, on a
            57-row page, it rendered at y = 1080 in an 820px viewport, so the
            owner had never seen it. Inside the card it is adjacent to the last
            row and reachable at any page length. It is still OUTSIDE the
            horizontal scroll container (**AC-112**), so it does not slide away
            when the table scrolls. */}
        {status === 'content' && (
          <div className="flex h-12 items-center justify-between gap-3 border-t border-border px-3">
            <span className="text-sm text-muted-foreground">
              {t('table.showing', {
                from: formatCount(range.from),
                to: formatCount(range.to),
                total: formatCount(range.total),
              })}
            </span>
            <div className="flex items-center gap-2">
              {/* §4.6 — bare text buttons, `--ev-text-2` when disabled. The
                  labels are LOGICAL: inline-start is `Previous` in both
                  directions, so nothing here reads `dir`. */}
              <Button
                variant="ghost"
                size="xs"
                onClick={table.previousPage}
                disabled={!range.hasPrevious}
              >
                {t('table.previous')}
              </Button>
              <Button variant="ghost" size="xs" onClick={table.nextPage} disabled={!range.hasNext}>
                {t('table.next')}
              </Button>
            </div>
          </div>
        )}

        {/* §9.1 / AC-112 — the floating bulk bar is positioned against the CARD,
            outside the scroll container: inside it, it would slide off with the
            columns. WHITE surface, hairline, tier 2, radius 8px (NOT a stadium
            — R15), 32px tall, at most THREE labelled secondary buttons. A
            ledger cannot reach this branch: `selectable` is `false` at compile
            time. */}
        {selectable && selectedCount > 0 && bulkActions && bulkActions.length > 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-15 flex justify-center">
            <div className="pointer-events-auto flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-1 shadow-2">
              {bulkActions.slice(0, 3).map((action) => (
                <Button
                  key={action.label}
                  variant="ghost"
                  size="xs"
                  onClick={() => action.onClick(table.selectedIds)}
                >
                  {action.label}
                </Button>
              ))}
              {bulkActions.length > 3 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-xs" aria-label={t('shell.moreActions')}>
                      <span aria-hidden="true">⋯</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {bulkActions.slice(3).map((action) => (
                      <DropdownMenuItem
                        key={action.label}
                        onSelect={() => action.onClick(table.selectedIds)}
                      >
                        {action.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        )}
      </div>

      {/* V-11 — one centred `Learn more about {resource}.`, outside the card. */}
      {learnMore && <div className="text-center">{learnMore}</div>}
    </div>
  )
}
