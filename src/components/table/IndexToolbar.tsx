/**
 * `IndexToolbar` (D-02) — `01-table-controls.md` §10.1, `03-navattic-language.md`
 * **§4.3**, `DESIGN.md` §3.2, §9.1 "Toolbar", **AC-47**.
 *
 * ```
 * ┌ card ────────────────────────────────────────────────────────────────────┐
 * │ [Captains][Applications][Compliance][Riders]  🔍 Search  ▤ Filter 2  ▥ Columns ⌄  ⇅ Sort · Trips ⌄ │ 40px
 * │ ~~~ search mode REPLACES the row above, IN PLACE, no vertical shift ~~~~~ │
 * │ 🔍 nora                                       [Cancel]   ▤ ▥ ⇅          │ 40px
 * └──────────────────────────────────────────────────────────────────────────┘
 * ```
 *
 * **`DataTable` renders this now, not the page** (§5.3): the sort popover, the
 * columns popover and the filter picker are the component's, so no screen wires
 * a control to `setSortField` again. The screen still supplies its own view tabs
 * and its own search placeholder, because those are the screen's content.
 *
 * **The controls carry LABELS, not bare icons** (§4.3). Navattic's toolbar reads
 * `Filter 1`, `Sort · Last Seen ⌄` — every control is an outline button with a
 * word in it, and the icon is a leading glyph rather than the whole target. Four
 * unlabelled icons in a row is a legend an operator has to learn; a labelled
 * button is not. The count on `Filter` is the one number in the toolbar and it
 * is the same state the chip strip beneath spells out.
 *
 * Rules applied
 *   §4.3        one 32px row of controls, all the same height, on white. Search
 *               at the inline-start of the cluster, then the menu-openers.
 *   §9.1        view tabs at inline-start, the control cluster at inline-end.
 *   AC-47       search mode **replaces the tab row in place** — the same 40px
 *               row, so the rows beneath do not shift by one pixel. `Cancel`
 *               restores the previous view **with its filters intact**: it
 *               clears the query and nothing else.
 *   §1.5        the trailing `⌄` is reserved for controls that open a menu, so
 *               `Columns` and `Sort` carry one and `Search` does not.
 *   §5.2/AC-91  the sort control names the sorted column once a sort is active.
 *               It grows horizontally; nothing shifts vertically.
 *   R3 (dead)   **no blue primary here.** `--primary` is near-black now
 *               (`03-navattic-language.md` §1.3); the toolbar carries no primary
 *               at all, because People has no page-level create action.
 *   §7.2        every control is a `<button>` with the default focus ring; the
 *               icon-only ones (search mode) carry an accessible name (§5.7).
 *   R-3 §1.3    the toolbar is FRAME, not a layer: no elevation. The popovers
 *               it opens carry tier 2, from `popover.tsx`.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ListFilter, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Translate } from '@/lib'
import { cn } from '@/lib/utils'

export interface ToolbarTab {
  id: string
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
  /** §4.3 — the filter control, labelled, with its count. Built by `DataTable`. */
  filterTrigger: (trigger: ReactNode) => ReactNode
  /** How many filters are on. Rendered as the `Filter 2` count chip. */
  filterCount: number
  columnsControl: ReactNode
  sortControl: ReactNode
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
      ) : tabs.length > 0 ? (
        <Tabs value={activeTab} onValueChange={onSelectTab} className="min-w-0 flex-1">
          <TabsList variant="line" className="h-7 p-0">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="px-2">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      ) : (
        <span className="min-w-0 flex-1" />
      )}

      <div className={cn('flex items-center gap-1', searching && 'ms-auto')}>
        {!searching && (
          <Button variant="secondary" onClick={() => setSearching(true)}>
            <Search aria-hidden="true" />
            {t('table.search')}
          </Button>
        )}

        {props.filterTrigger(
          <Button variant="secondary">
            <ListFilter aria-hidden="true" />
            {t('table.filter')}
            {/* §4.3's measured `Filter 1`. A COUNT, not a tone: R7 keeps the
                badge vocabulary for status, and this is neither status nor red. */}
            {props.filterCount > 0 && (
              <span className="rounded-sm bg-muted px-1 tabular-nums text-muted-foreground">
                {props.filterCount}
              </span>
            )}
          </Button>,
        )}

        {props.columnsControl}
        {props.sortControl}
      </div>
    </div>
  )
}
