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
  /**
   * P3-12 — `Export`, built by `DataTable` because only `DataTable` knows the
   * visible column set, the live filters and the rows currently on screen.
   * Last in the cluster: it acts on whatever the three controls before it have
   * narrowed the view to, and reading the row left to right is the order the
   * operator performs it in.
   */
  exportControl?: ReactNode
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
       minimum is a flex shrink, not a mode — it never disappears, nothing else
       moves, and the placeholder ellipsises rather than the row wrapping.

       **THE ROW DOES NOT SHRINK VERTICALLY, AND IT HAS TO SAY SO.** Its
       declared height is 56 and its tallest control is 32, so its automatic
       minimum size is 32 and a parent short of room is entitled to squeeze it
       there. Nothing did until `DataTable`'s band 4 started reporting its true
       height (the S1 fix): the deficit went negative for the first time and was
       shared out. Measured on `/financials/ledger` at 1440 x 900 in between:
       this row 56 -> 32, and the table's scroll box 492 -> 516. Band 4 is the
       one box in that column that may lose height.

       **BELOW THE COMPACT BREAKPOINT IT IS NOT ONE ROW, AND IT CANNOT BE.**
       The desktop shape survives by shrinking the search field to a 128px
       floor; a 390px viewport is past every floor at once, and measured before
       this override the `Columns` control ran off the inline-end edge — an
       UNREACHABLE control, which is the exact failure the tab-track note below
       degrades to avoid. So the row wraps and its height becomes a floor
       instead of a fixed 56. Desktop-first: the unprefixed classes are still
       the desktop answer and nothing above 768 reads these overrides. */
    <div className="flex min-h-14 shrink-0 flex-wrap items-center gap-2 px-3 py-2">
      {tabs.length > 0 && (
        /* THE TAB TRACK YIELDS; THE CONTROLS NEVER DO. This was `shrink-0`,
           measured against People's four short labels (375px of track). Wave 2's
           labels run 565–582 — `Departing next 24 h`, `Awaiting confirmation` —
           and Arabic takes another 40px of content column, so at the 1280 floor
           `Sort` left the viewport entirely: +1381 and +1364 in English on Trip
           Assurance and Captain Fairness, and −141 / −124 / −37 in Arabic on
           those two plus Requests. D12 predicted it in writing.

           A control off the viewport is UNREACHABLE; a tab behind a scroll is
           one gesture away. So the track shrank and scrolled, and the cluster
           kept its width.

           **THAT DEGRADE IS NO LONGER TAKEN FIRST, BECAUSE THE ROW WRAPS.**
           The degrade traded one bad outcome for a less bad one on the
           assumption that the row could only ever be one row. It cannot: the
           audit measured `/financials/ledger` hiding **151px of a 587px strip**
           at 1440, with the scrollbar hidden by design so nothing signalled the
           tabs existed — and on `/support/fairness` and `/financials/cash` the
           FIRST tab was cut at its LEADING edge, which no drag gesture is
           discoverable from because there is nothing to grab at the start.

           Wrapping only happens when it must: the line breaks BEFORE the
           shrink, so a screen whose track and cluster both fit is untouched
           (People's four short labels, 375px + cluster, still one row of 56)
           and a screen whose do not gets a second line instead of a clipped
           one. Nothing is unreachable in either case, which was the whole
           objection to letting the cluster move.

           The root cause is still that these labels are sentences where a
           segmented control wants nouns, and shortening them is a copy
           decision this file cannot take. */
        <Tabs value={activeTab} onValueChange={onSelectTab} className="min-w-0 shrink gap-0">
          <TabsList
            variant="segmented"
            /* **Aligning to the inline-start is the whole of the compact
               tab-strip defect.** `TabsList`'s base centres its children, right
               for a control that always fits and catastrophic for one that can
               overflow: centred content in a scroll container spills past BOTH
               edges, and `scrollLeft` cannot go below zero, so the start-side
               half is unreachable by any gesture. Measured at 390 with
               `scrollLeft: 0` — `/support/tickets` put its FIRST tab at
               x = -34 against a strip starting at x = 28, and
               `/financials/ledger` put `Trial balance` at x = -172. Note
               `scrollWidth` under-reports this: it counts only the END-side
               overflow (65px on tickets), so the strip looked 65px over when it
               was really 124, half of it unreachable.

               Overriding here rather than in the primitive: the base is shared
               with every other tab strip in the product, and centring is only
               wrong where the container can scroll. This call site is the one
               that declares the scroll, three utilities along. At 1440 the
               change is a no-op — the box hugs its content there (measured 461
               against 461 on tickets, 738 against 738 on ledger), so there is
               no free space for either value to distribute. */
            className="max-w-full justify-start overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
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

      {/* NO SHRINK CLASS HERE, AND THAT IS THE DECISION RATHER THAN AN OMISSION.
          Shrink order is a priority and flexbox has only ratios, so with both
          children at the default the track and the cluster give up space
          proportionally. A large shrink factor on the cluster makes it absorb
          nearly all of it and bottom out at its own min-content, which buys the
          track ~33px more — enough that People's four tabs stop scrolling.

          Measured, all three, at the 1280 floor in both languages:

            cluster shrink        People track   Assurance track
            large factor              375              437
            default (this)            342              437
            shrink-0                  289              330

          The large factor wins by 33px on ONE screen, and costs an arbitrary
          value that the token audit flags and that another owner reported as a
          finding in a directory it does not belong to. Thirty-three pixels of
          scrollable track on one view is not worth a permanent audit exception,
          and `shrink-0` is worse than both. The search field still shrinks to
          its 128px floor before the tabs give anything up.

          What is NOT negotiable is that `min-w-0` stays off this element: it
          disables the min-content floor, which is what let a shrink factor
          crush the cluster to 298px while its children spilled 190px outside
          it — `Sort` off the viewport, which is the defect all of this fixes. */}
      {/* The cluster keeps its inline-end alignment on the desktop; wrapped, an
          auto inline-start margin would push it to the far edge of its own row
          and split the controls across the width for no reason. */}
      <div className="ms-auto flex items-center gap-1.5 compact:ms-0 compact:flex-wrap">
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
        {props.exportControl}
      </div>
    </div>
  )
}
