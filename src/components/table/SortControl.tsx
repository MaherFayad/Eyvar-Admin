/**
 * `SortControl` (D-16) — `01-table-controls.md` §5.2, §5.3, `DESIGN.md` §3.2.
 *
 * Two entry points, **one** state. The header menu is the fast path — the field
 * is implied by which header you opened. This popover is the only way to sort by
 * a column you cannot see, which now includes a column that is merely scrolled
 * past. Both call `setSortField` / `setSortDirection`, so there is one `sort`
 * value, one caret, and no divergence is possible because there is no second
 * piece of state (**AC-89**).
 *
 * Rules applied
 *   §5.2/AC-91  **when a sort is active the trigger is a LABELLED button** —
 *               `⇅ Trips ↓` — carrying the sorted column's header text and its
 *               direction arrow. Because the sorted column can now be scrolled
 *               out of view, a single header caret is no longer a sufficient
 *               carrier under §7.5. It grows horizontally inside the icon
 *               cluster; **no vertical shift**, so AC-47 is untouched.
 *   §3.2        `Sort by` label, a RADIO GROUP of fields, a divider, then a
 *               separate direction pair. Never a mixed flat list crossing field
 *               and direction. In the header menu the field is fixed by the
 *               anchor, so its two items are a direction pair with no crossing —
 *               the banned shape is not reachable from either trigger.
 *   §5.4/AC-88  the direction labels come from the sorted column's `dataType`.
 *               `Oldest first` on a `Trips` column is nonsense, and
 *               `table.sortAscending` / `table.sortDescending` are retired.
 *   §3.4        `⇅` is the toolbar sort control; `↑` / `↓` are direction. The
 *               chevron is reserved for menu-openers and appears nowhere here.
 *   §5.4        no Apply and no Cancel: the popover stays open and each change
 *               applies immediately.
 *   §7.5        the active direction carries `aria-pressed` AND a fill AND
 *               weight — never colour alone.
 */

import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import type { TableSorting } from '@/hooks'
import type { Translate } from '@/lib'
import { cn } from '@/lib/utils'
import { sortLabel, type DataColumn } from './columns'

export interface SortControlProps<T> {
  t: Translate
  sorting: TableSorting
  /**
   * Every column, hidden ones included — §5.3: this popover is the only way to
   * sort by a column you cannot see.
   */
  columns: ReadonlyArray<DataColumn<T>>
  /** §11.2 / T5.13 — there are no rows to sort. Disabled in place, never gone. */
  disabled?: boolean
  /** The id of the sentence that says why. Real text on screen, not a `title`. */
  describedBy?: string | undefined
}

export function SortControl<T>({
  t,
  sorting,
  columns,
  disabled = false,
  describedBy,
}: SortControlProps<T>) {
  const sortable = columns.filter((column) => column.sortField !== undefined)
  if (sortable.length === 0) return null

  const active = sorting.sort
  const activeColumn = active
    ? (sortable.find((column) => column.sortField === active.field) ?? null)
    : null

  return (
    <Popover>
      <PopoverTrigger asChild>
        {activeColumn === null || active === null ? (
          /* §4.3 — a LABELLED outline button, not a bare glyph. The trailing
             `⌄` is §1.5's menu-opener mark. */
          <Button variant="secondary" disabled={disabled} aria-describedby={describedBy}>
            <ArrowUpDown aria-hidden="true" />
            {t('table.sort')}
            <ChevronDown aria-hidden="true" />
          </Button>
        ) : (
          /* AC-91 — while a sort is active the control names the sorted column
             and its direction, because the column itself can now be scrolled out
             of view and a header caret is no longer a sufficient carrier
             (§7.5). It grows horizontally; nothing shifts vertically. */
          <Button
            variant="secondary"
            disabled={disabled}
            aria-describedby={describedBy}
            aria-label={t('table.sort.active', { column: activeColumn.header })}
          >
            <ArrowUpDown aria-hidden="true" />
            <span className="max-w-24 truncate">{activeColumn.header}</span>
            {/* T9.10 — drawn, not a font glyph: a glyph takes the text weight
                and depends on the loaded font, which differs in Arabic. */}
            {active.dir === 'desc' ? (
              <ArrowDown aria-hidden="true" className="size-4" />
            ) : (
              <ArrowUp aria-hidden="true" className="size-4" />
            )}
            <ChevronDown aria-hidden="true" />
          </Button>
        )}
      </PopoverTrigger>

      <PopoverContent align="end" className="w-50 gap-2">
        <p className="text-xs font-medium text-muted-foreground">{t('table.sortBy')}</p>
        <RadioGroup
          className="gap-1"
          aria-label={t('table.sortBy')}
          value={active?.field ?? ''}
          onValueChange={sorting.setSortField}
        >
          {sortable.map((column) => (
            <label
              key={column.id}
              className="flex items-center gap-2 rounded-lg px-1 py-0.5 text-sm hover:bg-accent"
            >
              <RadioGroupItem value={column.sortField ?? column.id} />
              {column.header}
            </label>
          ))}
        </RadioGroup>

        <Separator />

        <div role="group" aria-label={t('table.sortBy')} className="flex flex-col gap-1">
          {(['asc', 'desc'] as const).map((direction) => (
            <Button
              key={direction}
              variant="ghost"
              size="xs"
              aria-pressed={active?.dir === direction}
              disabled={active === null}
              onClick={() => sorting.setSortDirection(direction)}
              className={cn(
                'justify-start font-normal',
                active?.dir === direction && 'bg-accent font-semibold',
              )}
            >
              {direction === 'asc' ? (
                <ArrowUp aria-hidden="true" className="size-4" />
              ) : (
                <ArrowDown aria-hidden="true" className="size-4" />
              )}
              {activeColumn === null
                ? t(direction === 'asc' ? 'table.sort.textAsc' : 'table.sort.textDesc')
                : sortLabel(t, activeColumn, direction)}
            </Button>
          ))}
        </div>

        {active !== null && (
          <>
            <Separator />
            <Button variant="ghost" size="xs" className="justify-start" onClick={sorting.clearSort}>
              {t('table.sort.clear')}
            </Button>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
