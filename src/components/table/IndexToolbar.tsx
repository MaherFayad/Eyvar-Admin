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

import { useRef, type ReactNode } from 'react'
import { ListFilter, Search, X } from 'lucide-react'
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
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    /* ONE ROW. The owner: *"move the search to next to filters and put the tabs
       at the same line as them."* View switcher at the inline-start, then the
       whole control cluster at the inline-end with search leading it.

       It fits at the 1280 floor only because the search field shrinks. Measured
       rather than estimated: at `min-w-40` the cluster was **11px over** the 912
       content column, so the floor is `min-w-32` (128). The field reaching its
       minimum is a `flex-shrink`, not a mode — it never disappears, nothing else
       moves, and the placeholder ellipsises rather than the row wrapping. */
    <div className="flex h-14 items-center gap-2 px-3">
      {tabs.length > 0 && (
        <Tabs value={activeTab} onValueChange={onSelectTab} className="shrink-0 gap-0">
          <TabsList variant="segmented">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                /* Overrides, not additions: `data-active:bg-accent` and
                   `rounded-lg` come from the base trigger and are merged AWAY
                   by `cn`, because each pair shares a utility group. */
                className="rounded-full border-transparent px-3 text-sm data-active:border-border-control data-active:bg-card"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      <div className="ms-auto flex min-w-0 items-center gap-1.5">
        {/* ONE control, ONE focus ring. The previous construction was a
            bordered wrapper with `focus-within:ring-2` around an `Input` that
            still carried its own `focus-visible:ring-2 ring-offset-2` — so
            focusing it drew TWO concentric blue rings with a white gap between
            them, which is what the owner saw. The icon is now positioned inside
            the field's own padding, so the field is a plain `Input` wearing
            §7.2's single ring like every other input in the product. */}
        <div className="relative min-w-32 shrink basis-60">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            ref={inputRef}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            /* The trailing inset is reserved ONLY when the clear control is
               actually there. At the 1280 floor the field is 128px; a permanent
               32px trailing reserve left 64px for text and the placeholder was
               clipped to `earch captains` in Arabic — read as an RTL defect,
               but it is the same clip in both directions and it is padding,
               not direction. */
            className={cn('ps-8', query === '' ? 'pe-2.5' : 'pe-8')}
            onKeyDown={(event) => {
              if (event.key === 'Escape') onQueryChange('')
            }}
          />
          {query !== '' && (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={t('table.clear')}
              onClick={() => {
                onQueryChange('')
                inputRef.current?.focus()
              }}
              className="absolute end-1 top-1/2 -translate-y-1/2"
            >
              <X aria-hidden="true" />
            </Button>
          )}
        </div>

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
