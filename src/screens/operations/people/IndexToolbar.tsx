/**
 * `IndexToolbar` (D-02) — design spec §9.1 "Toolbar", §3.2, **AC-47**.
 *
 * ```
 * ┌ card ─────────────────────────────────────────────────────────────────┐
 * │ [Captains][Applications][Compliance][Riders]      (🔍) (▤) (▥) (⇅)   │ 40px
 * │ ~~~ search mode REPLACES the row above, IN PLACE, no vertical shift ~~~│
 * │ (🔍) nora                                     [Cancel]      (▤)(▥)(⇅) │ 40px
 * └───────────────────────────────────────────────────────────────────────┘
 * ```
 *
 * Rules applied
 *   §9.1       view tabs at inline-start, the icon cluster at inline-end.
 *   AC-47      search mode **replaces the tab row in place** — the same 40px
 *              row, so the rows beneath do not shift by one pixel. `Cancel`
 *              restores the previous view **with its filters intact**: it
 *              clears the query and nothing else.
 *   §3.2       **only the selected tab exposes a chevron** and its actions
 *              menu; unselected tabs stay plain. People's four views are
 *              resource views declared in the route table, so no tab has an
 *              actions menu and none carries a chevron — see the deviation in
 *              `docs/05-restructure/build/01-people.md`.
 *   §9.1/AC-45 **the sort control is this popover, never the header.** The
 *              caret in the header is an INDICATOR. `Sort by` label, a RADIO
 *              GROUP of fields, a divider, then a direction pair. Stays open
 *              across changes; no Apply, no Cancel.
 *   §9.1       a column-visibility control appears **only where there are more
 *              than ~6 columns**, and the identity column cannot be hidden.
 *   §7.2       every control is a `<button>` with the default focus ring. The
 *              icon-only ones carry an accessible name (§5.7).
 *   §9.1       logical utilities only; nothing here mirrors by hand because
 *              nothing here is physical.
 *   R-3 §1.3   the toolbar is FRAME, not a layer: no elevation. The popovers
 *              it opens carry tier 2, from `popover.tsx`.
 */

import { useEffect, useRef, useState } from 'react'
import { ArrowUpDown, Columns3, ListFilter, Search, X } from 'lucide-react'
import type { FilterSpec, SortDirection, SortSpec } from '@/data/types'
import type { Translate } from '@/lib'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AddFilterPopover, type FilterField } from './FilterChipRow'

export interface ToolbarTab {
  id: string
  label: string
}

export interface ToolbarColumn {
  id: string
  label: string
}

export interface SortField {
  field: string
  label: string
}

export interface IndexToolbarProps {
  t: Translate

  tabs: readonly ToolbarTab[]
  activeTab: string
  onSelectTab: (id: string) => void

  searchPlaceholder: string
  query: string
  onQueryChange: (query: string) => void

  sortFields: readonly SortField[]
  sort: SortSpec | null
  onSortField: (field: string) => void
  onSortDirection: (dir: SortDirection) => void

  columns: readonly ToolbarColumn[]
  /** Hidden ids, from `useColumnVisibility`. */
  hiddenColumns: readonly string[]
  /** the toggle renders DISABLED on the identity column and on the last visible one. */
  isHideable: (id: string) => boolean
  onToggleColumn: (id: string) => void
  /** `useColumnVisibility.needsColumnsControl` — the column-count rule, owned by the hook. */
  showColumnsControl: boolean
  onResetColumns: () => void

  /** The same fields the chip row offers, so the cluster's filter icon opens one popover. */
  filterFields: readonly FilterField[]
  onSetFilter: (spec: FilterSpec) => void
}

export function IndexToolbar(props: IndexToolbarProps) {
  const { t, tabs, activeTab, onSelectTab, searchPlaceholder, query, onQueryChange } = props
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  /* AC-47 — activating search focuses the field it just swapped in. Nothing
     moves; only the row's contents change. */
  useEffect(() => {
    if (searching) inputRef.current?.focus()
  }, [searching])

  function cancelSearch() {
    /* "Cancel restores the previous view with its filters intact" — so the
       query goes and the filters, the view and the sort all stay. */
    onQueryChange('')
    setSearching(false)
  }

  return (
    <div className="flex h-10 items-center gap-2 border-b border-border px-3">
      {searching ? (
        <>
          <Search aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-6 flex-1 border-transparent bg-transparent px-0"
            onKeyDown={(event) => {
              if (event.key === 'Escape') cancelSearch()
            }}
          />
          <Button variant="ghost" size="xs" onClick={cancelSearch}>
            {t('table.cancel')}
          </Button>
        </>
      ) : (
        <Tabs value={activeTab} onValueChange={onSelectTab} className="min-w-0 flex-1">
          <TabsList variant="line" className="h-7 p-0">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="px-2">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      <div className={cn('flex items-center gap-0.5', searching && 'ms-auto')}>
        {!searching && (
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={t('people.toolbar.openSearch')}
            onClick={() => setSearching(true)}
          >
            <Search aria-hidden="true" />
          </Button>
        )}

        <AddFilterPopover
          t={t}
          fields={props.filterFields}
          onSetFilter={props.onSetFilter}
          trigger={
            <Button variant="ghost" size="icon-xs" aria-label={t('people.toolbar.filter')}>
              <ListFilter aria-hidden="true" />
            </Button>
          }
        />

        {props.showColumnsControl && (
          <ColumnsPopover
            t={t}
            columns={props.columns}
            hidden={props.hiddenColumns}
            isHideable={props.isHideable}
            onToggle={props.onToggleColumn}
            onReset={props.onResetColumns}
          />
        )}

        <SortPopover
          t={t}
          fields={props.sortFields}
          sort={props.sort}
          onField={props.onSortField}
          onDirection={props.onSortDirection}
        />
      </div>
    </div>
  )
}

/* ───────────────────────────── sort (§3.2) ───────────────────────────── */

function SortPopover({
  t,
  fields,
  sort,
  onField,
  onDirection,
}: {
  t: Translate
  fields: readonly SortField[]
  sort: SortSpec | null
  onField: (field: string) => void
  onDirection: (dir: SortDirection) => void
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label={t('people.toolbar.sort')}>
          <ArrowUpDown aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      {/* §3.2 / §5.4 — no Apply, no Cancel: the popover stays open and each
          change applies immediately. 200px is a RELATIONSHIP (a menu is
          narrower than the table), not a measured figure — R13. */}
      <PopoverContent align="end" className="w-50 gap-2">
        <p className="text-xs font-medium text-muted-foreground">{t('table.sortBy')}</p>
        <RadioGroup
          value={sort?.field ?? ''}
          onValueChange={onField}
          className="gap-1"
          aria-label={t('table.sortBy')}
        >
          {fields.map((field) => (
            <label
              key={field.field}
              className="flex items-center gap-2 rounded-lg px-1 py-0.5 text-sm hover:bg-accent"
            >
              <RadioGroupItem value={field.field} />
              {field.label}
            </label>
          ))}
        </RadioGroup>
        <Separator />
        <div
          role="group"
          aria-label={t('people.sort.direction')}
          className="flex flex-col gap-1"
        >
          {(['asc', 'desc'] as const).map((direction) => (
            <Button
              key={direction}
              variant="ghost"
              size="xs"
              /* §7.5 — the state is carried by `aria-pressed` AND by a fill,
                 never by colour alone. */
              aria-pressed={sort?.dir === direction}
              onClick={() => onDirection(direction)}
              className={cn(
                'justify-start text-sm',
                sort?.dir === direction && 'bg-accent font-semibold',
              )}
              disabled={sort === null}
            >
              {t(direction === 'asc' ? 'people.sort.ascending' : 'people.sort.descending')}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/* ─────────────────────── column visibility (§9.1) ─────────────────────── */

function ColumnsPopover({
  t,
  columns,
  hidden,
  isHideable,
  onToggle,
  onReset,
}: {
  t: Translate
  columns: readonly ToolbarColumn[]
  hidden: readonly string[]
  isHideable: (id: string) => boolean
  onToggle: (id: string) => void
  onReset: () => void
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label={t('people.toolbar.columns')}>
          <Columns3 aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">{t('people.columns.title')}</p>
        <div className="flex flex-col gap-1">
          {columns.map((column) => {
            const shown = !hidden.includes(column.id)
            /* A shown column that may not be hidden (the identity, or the last
               one left) renders its toggle DISABLED IN PLACE, never missing.
               Gate at render, not at click (§11.2). */
            const locked = shown && !isHideable(column.id)
            return (
              <label
                key={column.id}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-1 py-0.5 text-sm hover:bg-accent',
                  locked && 'text-muted-foreground',
                )}
              >
                <Checkbox
                  checked={shown}
                  disabled={locked}
                  onCheckedChange={() => onToggle(column.id)}
                  aria-label={column.label}
                />
                {column.label}
              </label>
            )
          })}
        </div>
        <Button variant="ghost" size="xs" className="justify-start" onClick={onReset}>
          {t('people.columns.reset')}
        </Button>
        <p className="text-xs text-muted-foreground">{t('people.columns.locked')}</p>
      </PopoverContent>
    </Popover>
  )
}

/** The `✕` a scope chip uses. Exported so the chip row and the queue agree. */
export function ChipDismissIcon() {
  return <X aria-hidden="true" className="size-3" />
}
