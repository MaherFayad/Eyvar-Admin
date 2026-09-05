/**
 * D12's view switcher, the one stadium. `IndexToolbar` renders it from
 * `ToolbarLeadingSlot.tabs`; a screen whose views are not all tables renders
 * it itself, so the strip cannot change shape between two views of one screen.
 * `justify-start` is load-bearing: centred content in a scroll container
 * spills past both edges and `scrollLeft` cannot go below zero.
 */

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

export interface ViewSwitcherTab {
  id: string
  label: string
}

export function ViewSwitcher({
  tabs,
  activeTab,
  onSelectTab,
  className,
}: {
  tabs: readonly ViewSwitcherTab[]
  activeTab: string
  onSelectTab: (id: string) => void
  className?: string
}) {
  return (
    <Tabs
      value={activeTab}
      onValueChange={onSelectTab}
      className={cn('min-w-0 shrink gap-0', className)}
    >
      <TabsList
        variant="segmented"
        className="max-w-full justify-start overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            /* Overrides, not additions: `data-active:bg-accent` and
               `rounded-lg` come from the base trigger and are merged AWAY by
               `cn`, because each pair shares a utility group. */
            className="rounded-full border-transparent px-3 text-sm data-active:border-border-control data-active:bg-card"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
