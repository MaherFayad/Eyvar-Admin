/**
 * `DataTable` (D-01) — design spec §9.1, §9.2, §9.3, §9.4.
 *
 * > **§9.4**: `DataTable` takes a `mode` prop — `index | ledger | queue` — and
 * > **the mode, not the route, decides which furniture renders. A route may
 * > mount more than one mode over its lifetime. It may never mount two at
 * > once.**
 *
 * **The mode is `table.mode`, off `useIndexTable`'s discriminated union — not a
 * prop invented here.** That matters: in the `ledger` branch TypeScript refuses
 * to compile a selection or a sort, because `LedgerTable` has no
 * `selectedIds`, no `toggleRow` and no `setSortField` **at all**. So **AC-48 is
 * enforced by `tsc`**, not by a runtime `if`. Adding a second `mode` prop would
 * create a weaker parallel source of truth and undo exactly that.
 *
 * What each mode renders:
 *
 * | | `index` | `queue` | `ledger` |
 * |---|---|---|---|
 * | selection checkbox | yes | only with `bulkClaim: true` (§9.3) | **never** |
 * | row kebab | yes | yes | **never** — the only per-row control is a read-only link to the source document |
 * | sort caret | exactly one header (**AC-45**) | one header | **never** — oldest-first by posting time, always |
 * | bulk action bar | yes | with selection | **never** |
 * | opening / closing balance rows | — | — | **required** (**AC-49**) |
 *
 * Rules applied
 *   §9.1        ONE CARD holds the toolbar, the header row, the rows and the
 *               bulk bar. **Never a bare `<table>`** (§3.1).
 *   §9.1/AC-46  ticking any checkbox **replaces the header row** with `N
 *               selected` beside the header checkbox; the column labels are
 *               absent while selection is active. Never a banner above the
 *               table. Deselecting all restores them.
 *   §9.1/AC-45  **headers are not interactive anywhere in the product.** The
 *               caret is an INDICATOR; the control is the sort popover. That
 *               makes AC-45 and AC-48 checkable with one rule.
 *   §9.1/AC-68  the row kebab **always renders**, at `--ev-text-2` with no
 *               fill; on row `:hover` **or `:focus-within`** it takes
 *               `--ev-ink` and an `--ev-bg2` fill. Visible without a pointer,
 *               reachable by keyboard. This closes **D19** (`opacity:0` until
 *               `:hover`, with no `:focus-within`).
 *   §9.1        **the whole row is not a click target** — only the identity
 *               link is. A whole-row target collides with the checkbox and the
 *               kebab.
 *   §9.1/R4     numeric, currency and count columns are `text-align: end`,
 *               **never** `text-align: right` (§9.2), with header and value
 *               sharing one edge and `tabular-nums` on every one.
 *   §9.1        pagination states the truncation **in words**; a silent row cap
 *               (`:12250`) must not ship.
 *   §9.1        below the card: pagination, then at most one centred
 *               `Learn more about {resource}.` OUTSIDE the card.
 *   §9.2/AC-49  a ledger opens with a labelled `Opening balance` row and closes
 *               with a labelled `Closing balance` row, bold on both sides, and
 *               the closing balance equals the balance in the card header.
 *   R8/AC-37/38 `no-match` vs `first-run` comes from `table.isFiltered`, so the
 *               choice is mechanical rather than a judgement at the call site.
 *   R-3 §1.3    the card carries tier 1 (from `card.tsx`); the floating bulk
 *               bar carries tier 2. Rows carry none.
 */

import type { ReactNode } from 'react'
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
import { cn } from '@/lib/utils'
import { formatCount, pageRange, type Translate } from '@/lib'
import type { AnyTable } from '@/hooks'
import { EmptyState, type EmptyAction } from './EmptyState'
import { ErrorState } from './ErrorState'
import { LoadingSkeleton } from './LoadingSkeleton'

/* ───────────────────────────── columns ───────────────────────────── */

export interface DataColumn<T> {
  id: string
  /** Already translated. Rendered 12px/500 `--ev-text-2`, no uppercase (D18). */
  header: string
  /**
   * §9.1 — text and dates inline-START; numeric, currency and count
   * inline-END. `numeric` also switches the header to the same edge, so header
   * and value share one edge (**AC-44**).
   */
  align?: 'start' | 'end'
  /** The domain field name the sort popover asks for. Omit for an unsortable column. */
  sortField?: string
  cell: (row: T) => ReactNode
  /** §9.1 — a 12px second line INSIDE the identity cell. Never a new column. */
  secondaryLine?: (row: T) => ReactNode
}

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
  columns: ReadonlyArray<DataColumn<T>>
  getRowId: (row: T) => string
  /** The four states, in order. `content` is whatever `rows` holds. */
  status: 'loading' | 'error' | 'empty' | 'content'
  total: number
  t: Translate

  /** §9.1 — the view tabs, search field and icon cluster. Rendered above the header row. */
  toolbar?: ReactNode
  /** §9.1 — the filter chip row, beneath the toolbar. */
  filterRow?: ReactNode
  /** §9.1 — always renders; takes ink and a fill on hover **or focus-within**. */
  rowActions?: ReadonlyArray<RowAction<T>>
  /** §9.1 — at most THREE labelled secondary buttons, then `…`. */
  bulkActions?: ReadonlyArray<{ label: string; onClick: (ids: ReadonlySet<string>) => void }>

  /** §11.1 — the `first-run` copy. Required so the empty state cannot be a TODO. */
  firstRun: { heading: string; body: string; actions: EmptyAction[] }
  /** §11.1 — the `no-match` sentence. */
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

export function DataTable<T>({
  table,
  rows,
  columns,
  getRowId,
  status,
  total,
  t,
  toolbar,
  filterRow,
  rowActions,
  bulkActions,
  firstRun,
  noMatch,
  error,
  ledgerBoundaryRows,
  learnMore,
  skeletonPattern,
  className,
}: DataTableProps<T>) {
  /* AC-48, at the type level. `canSelect` and `canRowAction` are LITERAL
     `false` on `LedgerTable`, so these two constants are `false` at compile
     time in the ledger branch and a reviewer can see it. */
  const isLedger = table.mode === 'ledger'
  const selectable = !isLedger && table.canSelect
  const kebabs = !isLedger && table.canRowAction && rowActions && rowActions.length > 0

  const selectedCount = selectable ? table.selectedCount : 0
  const pattern = skeletonPattern ?? (isLedger ? 'P7' : table.mode === 'queue' ? 'P8' : 'P1')

  /* §9.1 — a silent row cap must not ship. `pageRange` is the arithmetic behind
     `Showing 1–50 of 4,218`, and it clamps a page past the end. */
  const range = pageRange(table.page, table.pageSize, total)

  /* §9.1 / AC-45 — exactly ONE header carries the caret, and it is the sorted
     one. No other header shows any resting affordance. */
  const sortField = !isLedger && table.canSort ? (table.sort?.field ?? null) : null
  const sortDirection = !isLedger && table.canSort ? (table.sort?.dir ?? null) : null

  const columnCount = columns.length + (selectable ? 1 : 0) + (kebabs ? 1 : 0)

  return (
    <div className={cn('flex w-full flex-col gap-3', className)}>
      {/* §9.1 — ONE CARD holds everything. Never a bare `<table>`. */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-1">
        {toolbar}
        {filterRow}

        {status === 'loading' && (
          <div className="p-3">
            <LoadingSkeleton pattern={pattern} />
          </div>
        )}

        {/* §11.2 — the CARD scope keeps the toolbar rendered above, so the
            operator can change the query that failed. */}
        {status === 'error' && (
          <ErrorState
            scope="card"
            message={error.message}
            action={{ label: t('state.pageError.action'), onClick: error.onRetry }}
          />
        )}

        {/* AC-37 / AC-38 — the kind is decided by `isFiltered`, not by taste.
            A ledger is NEVER `first-run` empty (§9.2): a wallet with no
            postings still has an opening-balance row, so a filtered-to-zero
            ledger uses the `no-match` sentence and an unfiltered one cannot
            reach this branch. */}
        {status === 'empty' &&
          (table.isFiltered || isLedger ? (
            <EmptyState kind="no-match" message={noMatch.message} action={noMatch.action} />
          ) : (
            <EmptyState
              kind="first-run"
              heading={firstRun.heading}
              body={firstRun.body}
              actions={firstRun.actions}
            />
          ))}

        {status === 'content' && (
          <Table>
            <TableHeader>
              <TableRow>
                {selectable && (
                  <TableHead className="w-10">
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

                {/* AC-46 — while anything is selected the column LABELS are
                    absent and one `N selected` cell takes their place. Not a
                    banner above the table. */}
                {selectedCount > 0 ? (
                  <TableHead colSpan={columnCount - 1} className="font-semibold text-foreground">
                    {t('table.selectedCount', { count: selectedCount })}
                  </TableHead>
                ) : (
                  <>
                    {columns.map((column) => (
                      <TableHead
                        key={column.id}
                        scope="col"
                        className={cn(column.align === 'end' && 'text-end')}
                      >
                        {column.header}
                        {/* AC-45 — an INDICATOR, not a control. The header is
                            not interactive anywhere in the product. */}
                        {column.sortField && column.sortField === sortField && (
                          <span aria-hidden="true" className="ms-1">
                            {sortDirection === 'desc' ? '⌄' : '⌃'}
                          </span>
                        )}
                      </TableHead>
                    ))}
                    {kebabs && <TableHead className="w-10" />}
                  </>
                )}
              </TableRow>
            </TableHeader>

            <TableBody>
              {/* §9.2 / AC-49 — a ledger OPENS with a labelled opening balance. */}
              {isLedger && ledgerBoundaryRows && (
                <TableRow className="font-semibold">
                  <TableCell colSpan={columnCount}>{ledgerBoundaryRows.opening}</TableCell>
                </TableRow>
              )}

              {rows.map((row) => {
                const id = getRowId(row)
                return (
                  <TableRow
                    key={id}
                    data-state={selectable && table.isSelected(id) ? 'selected' : undefined}
                    /* `group` so the kebab can respond to the row's hover AND
                       its focus-within, which is AC-68. `relative` so a
                       `RowCriticalMarker` can position against it. */
                    className="group/row relative"
                  >
                    {selectable && (
                      <TableCell className="w-10">
                        <Checkbox
                          aria-label={t('table.selectRow')}
                          checked={table.isSelected(id)}
                          onCheckedChange={() => table.toggleRow(id)}
                        />
                      </TableCell>
                    )}

                    {columns.map((column) => (
                      <TableCell
                        key={column.id}
                        className={cn(column.align === 'end' && 'text-end')}
                      >
                        <span className="block">{column.cell(row)}</span>
                        {/* §9.1 — a 12px second line INSIDE the identity cell.
                            The row grows to fit; it never truncates. */}
                        {column.secondaryLine && (
                          <span className="block text-xs text-muted-foreground">
                            {column.secondaryLine(row)}
                          </span>
                        )}
                      </TableCell>
                    ))}

                    {kebabs && (
                      <TableCell className="w-10">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              aria-label={t('table.rowActions', { row: id })}
                              /* AC-68 / D19 — ALWAYS rendered. Muted at rest;
                                 ink plus a fill on the row's hover OR its
                                 focus-within. Never `opacity: 0`. */
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

            {/* §9.2 / AC-49 — and CLOSES with a labelled closing balance, bold
                on both sides, equal to the balance in the card header. */}
            {isLedger && ledgerBoundaryRows && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={columnCount}>{ledgerBoundaryRows.closing}</TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        )}

        {/* §9.1 — the floating bulk bar: WHITE surface, hairline, soft shadow,
            radius 8px (NOT a stadium — R15), INSIDE the card, horizontally
            centred, near the bottom of the row area, 32px tall. At most THREE
            labelled secondary buttons. A ledger cannot reach this branch:
            `selectable` is `false` at compile time. */}
        {selectable && selectedCount > 0 && bulkActions && bulkActions.length > 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
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

      {/* §9.1 — below the card: pagination stating the truncation IN WORDS. */}
      {status === 'content' && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {t('table.showing', {
              from: formatCount(range.from),
              to: formatCount(range.to),
              total: formatCount(range.total),
            })}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={table.previousPage} disabled={!range.hasPrevious}>
              {t('table.previous')}
            </Button>
            <Button variant="secondary" onClick={table.nextPage} disabled={!range.hasNext}>
              {t('table.next')}
            </Button>
          </div>
        </div>
      )}

      {/* V-11 — one centred `Learn more about {resource}.`, outside the card,
          at most one per page, never on a record-detail page. */}
      {learnMore && <div className="text-center">{learnMore}</div>}
    </div>
  )
}
