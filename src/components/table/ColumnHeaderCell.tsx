/**
 * `ColumnHeaderButton` (D-12) + `ColumnHeaderMenu` (D-13) —
 * `01-table-controls.md` §3, §4, `DESIGN.md` §6.2 **D-6** and §8.5.2.
 *
 * **A header cell contains exactly one interactive element — a button that
 * opens a menu — or none. Never two** (**AC-80**). One target, one gesture, one
 * accessible name, one `aria-expanded`. The rejected alternative was "click the
 * label to sort, separate caret for the rest": two 24px targets plus a label is
 * a 60px minimum header cell, and **§6.2 D-2's density licence may not be cited
 * against §7.7** — so the density argument cuts the other way, toward one
 * target that fills the cell.
 *
 * This supersedes AC-45's *"headers are not interactive anywhere in the
 * product"* clause and **nothing else**: the sort indicator clause survives
 * verbatim as **AC-86** — one arrow, one column, ever.
 *
 * Rules applied
 *   D-6/AC-81   the `⌄` renders **at rest**, on every controllable header, at
 *               `--ev-text-2`. Not on hover. Same two-step as the row kebab
 *               (**AC-68**): ink plus an `--ev-bg2` fill on `:hover`, on
 *               `:focus-visible` and while the menu is open (**AC-82**).
 *               Hover-only capability is legacy defect **D19** and does not
 *               exist for a keyboard operator.
 *   §3.4/AC-87  the glyphs are disjoint. `⌄` means **a menu opens here**; `↑` /
 *               `↓` mean **sort direction**. No header renders a chevron as a
 *               sort indicator. Neither mirrors in Arabic — arrows are vertical
 *               magnitude, and the chevron points block-end.
 *   §3.2/AC-84  the caret sits on the side of the label group **away from the
 *               column's alignment edge**, so header and value keep sharing one
 *               edge (R4, **AC-44**).
 *   §3.3/§7.5   sorted and filtered are carried by WEIGHT and by LITERAL TEXT,
 *               never by colour. Render the header in greyscale and you still
 *               read `City: Riyadh` in semibold with a `↓` beside `Trips`.
 *   §3.3/AC-83  the focus ring is drawn **inset**, so it is not clipped by the
 *               cell boundary or by a pinned region's overflow.
 *   §4/AC-97    **`Filter…` closes the menu and opens a popover.** It is not a
 *               submenu and never a nested surface: typing inside a
 *               `dropdown-menu` triggers Radix's typeahead and steals the
 *               keystrokes from any input placed in it. A real defect, not a
 *               theoretical one.
 *   §4          no item is red, ever. `Hide column` is recoverable from the
 *               columns popover, so §3.3's rule applies a fortiori.
 *   §7.2/§11.2  `Pin column` renders **disabled in place** with its reason on a
 *               second line INSIDE the item — gated at render, never at commit,
 *               and never a tooltip (§5.7 keeps constraints out of tooltips).
 *   §9/AC-113   a **ledger** header offers `Filter…` and `Pin column` and never
 *               a sort item. That is not a runtime branch: `sorting` is `null`
 *               because `LedgerTable` has no `setSortField` to pass, so a sort
 *               item in a ledger header has nothing to call.
 *   §8.4/AC-96  the `{label}: {value}` summary is ONE key with named
 *               placeholders and the value is `<bdi>`-isolated — a Latin city
 *               name inside an Arabic label jumps sides without it.
 */

import { useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { TableHead } from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import type { FilterSpec } from '@/data/types'
import type { PinRefusal, PinnedColumn, RovingItemProps, TableSorting } from '@/hooks'
import type { ColumnFilterValue, Language, Translate } from '@/lib'
import { cn } from '@/lib/utils'
import { ColumnFilterControl } from './ColumnFilterControl'
import {
  columnFilterValueOf,
  emptyColumnFilterValue,
  filteredLabelParts,
  hasMenu,
  sortLabel,
  summariseColumnFilter,
  type DataColumn,
} from './columns'
import { pinnedStyle } from './pinning'

export interface HeaderPinControl {
  isPinned: boolean
  /** §7.2 — `canPin`'s dry run. Non-null means the item renders disabled with its reason. */
  refusal: PinRefusal | null
  onToggle: () => void
}

export interface ColumnHeaderCellProps<T> {
  t: Translate
  language: Language
  column: DataColumn<T>
  /** **`null` on a ledger.** Not a flag — there is nothing to pass (**AC-113**). */
  sorting: TableSorting | null
  activeFilter: FilterSpec | undefined
  onCommitFilter: (value: ColumnFilterValue) => void
  onClearFilter: () => void
  /** `null` when the column may not be pinned by the operator at all. */
  pin: HeaderPinControl | null
  /** `null` when the column may not be hidden — the identity, the last one left, a ledger. */
  onHide: (() => void) | null
  pinned: PinnedColumn | null
  overflowing: boolean
  today?: string | null
  rovingProps: RovingItemProps
  width?: number
  onResize?: (width: number) => void
  onResetWidth?: () => void
}

export function ColumnHeaderCell<T>(props: ColumnHeaderCellProps<T>) {
  const {
    t,
    language,
    column,
    sorting,
    activeFilter,
    onCommitFilter,
    onClearFilter,
    pin,
    onHide,
    pinned,
    overflowing,
    today,
    rovingProps,
    width,
    onResize,
    onResetWidth,
  } = props

  const [menuOpen, setMenuOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const headRef = useRef<HTMLTableCellElement>(null)

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const startX = e.clientX
    const currentW = width ?? column.width ?? headRef.current?.getBoundingClientRect().width ?? 120
    setIsResizing(true)

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = language === 'ar' ? startX - moveEvent.clientX : moveEvent.clientX - startX
      const minW = column.minWidth ?? 60
      const nextWidth = Math.max(minW, Math.min(800, Math.round(currentW + deltaX)))
      onResize?.(nextWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const handleResizeDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onResetWidth?.()
  }
  /**
   * AC-97 — **two sequential surfaces, never nested.** `Filter…` records the
   * intent and lets the menu close normally; the popover opens in the menu's
   * `onCloseAutoFocus`, which fires as the menu unmounts.
   *
   * Opening it straight from `onSelect` does not work, and the reason is worth
   * writing down: a `dropdown-menu` is modal, so while it closes it still owns
   * the dismissal layer, and a popover mounted in the same tick is dismissed by
   * the menu's own outside-interaction handler on the way out. The symptom is a
   * menu item that visibly does nothing.
   */
  const openFilterOnClose = useRef(false)

  const end = column.align === 'end'
  const sortable = sorting !== null && column.sortField !== undefined
  const isSorted = sortable && sorting.sort?.field === column.sortField
  const direction = isSorted ? (sorting.sort?.dir ?? null) : null

  const filterValue = column.filter
    ? columnFilterValueOf(column.filter, activeFilter)
    : null
  const summary =
    column.filter && filterValue
      ? summariseColumnFilter(t, column.filter, filterValue, language)
      : null

  const offers = { sort: sortable, hide: onHide !== null, pin: pin !== null }
  const controllable = hasMenu(column, offers)

  /* §3.3 — the label. Weight and literal text carry sorted and filtered; no
     colour carries either. `{label}: {value}` is one key, and the value is
     bidi-isolated by splitting the interpolated string on a sentinel rather
     than by concatenating two halves (**AC-75**). */
  const parts = summary === null ? null : filteredLabelParts(t, column.header, summary)

  const labelNode = (
    <span
      className={cn(
        /* Clipping WITHOUT the ellipsis and without the line-break ban that
           the shorthand here used to bundle: the name wraps inside its column
           instead of being cut. The zero minimum width still lets this flex
           item be narrower than its content, so the sort arrow and the caret
           keep their place, and the clip stays as the last line of defence for
           a single unbreakable word. */
        'min-w-0 overflow-hidden',
        (isSorted || summary !== null) && 'font-semibold text-foreground',
      )}
    >
      {parts === null ? (
        column.header
      ) : (
        <>
          {parts.before}
          <bdi>{parts.value}</bdi>
          {parts.after}
        </>
      )}
    </span>
  )

  /* §3.4 — an ARROW, never a chevron, and only on the one sorted column. */
  const arrow = direction === null ? null : (
    <span aria-hidden="true" className="shrink-0 text-foreground">
      {direction === 'desc' ? '↓' : '↑'}
    </span>
  )

  const caret = <ChevronDown aria-hidden="true" className="size-3 shrink-0" />

  const cellWidth = width ?? column.width

  const cellClass = cn(
    /* The corner cell: sticky on BOTH axes and above everything. Three
       stacking levels, no more — sticky header (20) < pinned header (30), and
       pinned body cells sit at 10 under both. Separation at either boundary is
       a HAIRLINE, never a shadow: all three elevation tokens are `offset-x: 0`,
       and an inline-edge shadow needs an x-offset (§7.3, **AC-110**).

       `bg-muted` is the header row's own ground (§4.5) and it must be OPAQUE:
       a pinned header cell has both the body and the scrolling header sliding
       under it. */
    'sticky top-0 bg-muted p-0 relative group/head',
    pinned ? 'z-30' : 'z-20',
  )

  const resizeHandle = onResize ? (
    <div
      role="separator"
      aria-orientation="vertical"
      onMouseDown={handleResizeMouseDown}
      onDoubleClick={handleResizeDoubleClick}
      title={t('table.resizeColumn')}
      className={cn(
        'absolute inset-y-0 end-0 w-3 cursor-col-resize select-none touch-none z-30 flex items-center justify-center group/resizer',
        isResizing && 'bg-primary/20',
      )}
    >
      <div
        className={cn(
          'h-3.5 w-[2px] rounded-full bg-border transition-colors group-hover/resizer:bg-primary group-hover/resizer:h-full',
          isResizing && 'bg-primary h-full',
        )}
      />
    </div>
  ) : null

  if (!controllable) {
    return (
      <TableHead
        ref={headRef}
        scope="col"
        style={pinnedStyle(pinned, cellWidth, overflowing, column.minWidth)}
        className={cn(cellClass, 'px-3', end && 'text-end')}
      >
        {column.header}
        {resizeHandle}
      </TableHead>
    )
  }

  return (
    <TableHead
      ref={headRef}
      scope="col"
      /* §13.7 — the NATIVE mechanism, on the `th`, not a label. */
      aria-sort={
        direction === null ? undefined : direction === 'asc' ? 'ascending' : 'descending'
      }
      style={pinnedStyle(pinned, cellWidth, overflowing, column.minWidth)}
      className={cellClass}
    >
      <Popover
        open={filterOpen}
        onOpenChange={(open) => {
          setFilterOpen(open)
          /* AC-66 — Escape returns focus to the HEADER TRIGGER. The menu is
             gone by now and is not reopened. */
          if (!open) triggerRef.current?.focus()
        }}
      >
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverAnchor asChild>
            <DropdownMenuTrigger asChild>
              <button
                {...rovingProps}
                ref={triggerRef}
                type="button"
                aria-label={t('table.column.menu', { column: column.header })}
                className={cn(
                  /* `--ev-row-h-head`, NOT `--ev-row-h`. The two parted
                     company when the data row rose to 40 and the header stayed
                     at 32 (`03-navattic-language.md` §1.4); a header button
                     still sized `h-row` silently makes every header row 40px
                     and the tint band with it. */
                  'flex h-(--ev-row-h-head) w-full items-center gap-1 px-3 text-xs font-medium',
                  'text-muted-foreground transition-colors',
                  end ? 'justify-end' : 'justify-start',
                  /* AC-82 — the AC-68 two-step. Never `opacity: 0`. */
                  'hover:bg-accent hover:text-foreground',
                  'aria-expanded:bg-accent aria-expanded:text-foreground',
                  /* AC-83 — INSET, so a pinned region's overflow cannot clip it. */
                  'outline-hidden focus-visible:bg-accent focus-visible:text-foreground',
                  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                )}
              >
                {end ? (
                  <>
                    {caret}
                    {arrow}
                    {labelNode}
                  </>
                ) : (
                  <>
                    {labelNode}
                    {arrow}
                    {caret}
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
          </PopoverAnchor>

          <DropdownMenuContent
            align={end ? 'end' : 'start'}
            className="w-50"
            onCloseAutoFocus={(event) => {
              if (!openFilterOnClose.current) return
              /* Keep the menu from restoring focus to the trigger: the popover
                 is about to take it, and two focus moves in one frame is what
                 makes a screen reader announce the header twice. */
              event.preventDefault()
              openFilterOnClose.current = false
              setFilterOpen(true)
            }}
          >
            {sortable && sorting !== null && column.sortField !== undefined && (
              <DropdownMenuRadioGroup
                value={direction ?? ''}
                onValueChange={(next) => {
                  /* Two calls, in this order and deliberately: `setSortField`
                     keeps the current direction and makes `sort` non-null, so
                     the `setSortDirection` that follows has something to write
                     to. Both are functional updates in one batch. */
                  const field = column.sortField
                  if (field === undefined) return
                  sorting.setSortField(field)
                  sorting.setSortDirection(next === 'desc' ? 'desc' : 'asc')
                }}
              >
                <DropdownMenuRadioItem value="asc">
                  <span aria-hidden="true">↑</span>
                  {sortLabel(t, column, 'asc')}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="desc">
                  <span aria-hidden="true">↓</span>
                  {sortLabel(t, column, 'desc')}
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            )}

            {/* AC-90 — only on the column that is currently sorted. */}
            {isSorted && sorting !== null && (
              <DropdownMenuItem onSelect={() => sorting.clearSort()}>
                {t('table.sort.clear')}
              </DropdownMenuItem>
            )}

            {sortable && column.filter && <DropdownMenuSeparator />}

            {column.filter && (
              <DropdownMenuItem
                disabled={column.filter.gatedReason !== undefined}
                onSelect={() => {
                  /* AC-97 — the menu CLOSES and then a popover opens. See
                     `openFilterOnClose` for why it cannot be one tick. */
                  openFilterOnClose.current = true
                }}
              >
                <span className="flex flex-col items-start">
                  {t('table.filter.open')}
                  {column.filter.gatedReason !== undefined && (
                    <span className="text-2xs text-muted-foreground">
                      {column.filter.gatedReason}
                    </span>
                  )}
                </span>
              </DropdownMenuItem>
            )}

            {column.filter && summary !== null && (
              <DropdownMenuItem onSelect={onClearFilter}>
                {t('table.filter.clear')}
              </DropdownMenuItem>
            )}

            {(sortable || column.filter) && (pin || onHide) && <DropdownMenuSeparator />}

            {pin && (
              <DropdownMenuItem
                /* §7.2 / §11.11 — gated at RENDER. `canPin` is the dry run and
                   returns the same answer `pin` would; the operator is never
                   told no after clicking, and never shown a pixel figure. */
                disabled={!pin.isPinned && pin.refusal !== null}
                onSelect={pin.onToggle}
              >
                <span className="flex flex-col items-start">
                  {t(pin.isPinned ? 'table.pin.unpin' : 'table.pin.pin')}
                  {!pin.isPinned && pin.refusal !== null && (
                    <span className="text-2xs text-muted-foreground">
                      {t('table.pin.blocked')}
                    </span>
                  )}
                </span>
              </DropdownMenuItem>
            )}

            {onHide && (
              <DropdownMenuItem onSelect={onHide}>{t('table.column.hide')}</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {column.filter && (
          <PopoverContent align={end ? 'end' : 'start'} className="w-60">
            <ColumnFilterControl
              t={t}
              language={language}
              filter={column.filter}
              label={column.header}
              value={filterValue ?? emptyColumnFilterValue(column.filter)}
              onCommit={onCommitFilter}
              onClose={() => setFilterOpen(false)}
              today={today}
            />
          </PopoverContent>
        )}
      </Popover>
      {resizeHandle}
    </TableHead>
  )
}
