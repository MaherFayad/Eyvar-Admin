/**
 * `ColumnLayoutPopover` (D-15) — `01-table-controls.md` §7.5, `DESIGN.md` §8.5.3.
 *
 * **The header menu cannot be the only way to pin**, for three reasons that are
 * all real and none of them theoretical:
 *
 *   1. while selection is active, **AC-46** replaces the entire header row with
 *      `N selected`. There are no header cells and therefore no header menus;
 *   2. a column scrolled out of view has no reachable header;
 *   3. a **hidden** column cannot be pinned from a header it does not have.
 *
 * So the toolbar's columns control is the second entry point to one state
 * (**AC-115**).
 *
 * Rules applied
 *   §7.5        `checkbox` + `toggle` per row. **No drag handle and no
 *               reordering** — no drag primitive exists in the 38,
 *               `components.json` is frozen, and reordering was not requested.
 *               Out of scope, not forgotten (F-16's neighbour).
 *   §7.5        §9.1's ">6 columns" clause is widened, minimally: the control
 *               renders when there are more than six columns **or** any column
 *               is pinnable or hideable. Without that, pinning is unreachable
 *               on a five-column table, which is where the 1280 operator most
 *               often is. `useColumnVisibility.needsColumnsControl` owns it.
 *   §7.4        a pressed pin toggle is `aria-pressed`, plus a fill and weight
 *               from `toggle.tsx`. **Never colour alone** (§7.5).
 *   §11.2/§7.2  every refusal is gated at RENDER: the identity column's
 *               checkbox, a hidden column's pin toggle and a pin that would
 *               breach the width budget all render **disabled in place**, never
 *               missing and never checked at commit.
 *   §9/AC-113   a **ledger** shows pin toggles and **no visibility
 *               checkboxes**: §8.3.3 fixes the ledger's column set, and hiding
 *               `Credit` turns a double-entry ledger into a lie.
 *   R8          nothing here is red, and nothing here is a badge.
 */

import { ChevronDown, Columns3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { Toggle } from '@/components/ui/toggle'
import type { PinRefusal } from '@/hooks'
import type { Translate } from '@/lib'
import { cn } from '@/lib/utils'
import type { DataColumn } from './columns'

export interface ColumnLayoutPopoverProps<T> {
  t: Translate
  /** Every declared column, in declaration order — including the hidden ones. */
  columns: ReadonlyArray<DataColumn<T>>
  isVisible: (id: string) => boolean
  /** `false` for the identity column and for the last visible one. */
  isHideable: (id: string) => boolean
  onToggleVisible: (id: string) => void
  isPinned: (id: string) => boolean
  /** `null` means the operator may not pin this column at all — no width, or `pinnable: false`. */
  canPin: (id: string) => PinRefusal | null | undefined
  onTogglePin: (id: string) => void
  onReset: () => void
  /** §9 — a ledger renders pin toggles only. */
  showVisibility: boolean
}

export function ColumnLayoutPopover<T>(props: ColumnLayoutPopoverProps<T>) {
  const {
    t,
    columns,
    isVisible,
    isHideable,
    onToggleVisible,
    isPinned,
    canPin,
    onTogglePin,
    onReset,
    showVisibility,
  } = props

  return (
    <Popover>
      <PopoverTrigger asChild>
        {/* §4.3 — labelled, with §1.5's trailing menu-opener caret. */}
        <Button variant="secondary">
          <Columns3 aria-hidden="true" />
          {t('table.columns.title')}
          <ChevronDown aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">{t('table.columns.title')}</p>

        <div className="flex flex-col gap-0.5">
          {columns.map((column) => {
            const shown = isVisible(column.id)
            const lockedVisible = shown && !isHideable(column.id)
            const pinned = isPinned(column.id)
            const refusal = canPin(column.id)
            /* `undefined` from `canPin` means "not a pinnable column at all" —
               no declared width, or `pinnable: false`. A refusal object means
               pinnable but over the budget. Both render disabled in place. */
            const pinnable = refusal !== undefined
            const pinDisabled = !pinnable || !shown || (!pinned && refusal !== null)

            return (
              <div key={column.id} className="flex items-center gap-2 rounded-lg px-1 py-0.5">
                {showVisibility ? (
                  <label
                    className={cn(
                      'flex min-w-0 flex-1 items-center gap-2 text-sm',
                      lockedVisible && 'text-muted-foreground',
                    )}
                  >
                    <Checkbox
                      checked={shown}
                      disabled={lockedVisible}
                      onCheckedChange={() => onToggleVisible(column.id)}
                      aria-label={t('table.columns.toggleVisible', { column: column.header })}
                    />
                    <span className="truncate">{column.header}</span>
                  </label>
                ) : (
                  <span className="min-w-0 flex-1 truncate text-sm">{column.header}</span>
                )}

                <Toggle
                  size="sm"
                  pressed={pinned}
                  disabled={pinDisabled}
                  onPressedChange={() => onTogglePin(column.id)}
                  aria-label={t('table.columns.togglePin', { column: column.header })}
                  className="shrink-0 text-xs"
                >
                  {t(pinned ? 'table.pin.unpin' : 'table.pin.pin')}
                </Toggle>
              </div>
            )
          })}
        </div>

        <Separator />
        {/* §7.5 — restores declared visibility AND clears every operator pin. */}
        <Button variant="ghost" size="xs" className="justify-start" onClick={onReset}>
          {t('table.columns.reset')}
        </Button>
        <p className="text-2xs text-muted-foreground">{t('table.columns.identityLocked')}</p>
      </PopoverContent>
    </Popover>
  )
}
