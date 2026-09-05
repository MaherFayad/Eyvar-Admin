/**
 * The view row for a screen whose views are panes, not tables.
 *
 * `DataTable` draws this same stadium control in its toolbar (D12); a screen
 * that mounts cards under `?view=` needs the same control in the same place,
 * so the operator has one way to move between views everywhere. Drives the
 * URL through `useScreenViews`, never local state (§3.8 rule 3).
 */

import type { ToolbarTab } from '@/components/table/IndexToolbar'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export interface ViewTabsProps {
  tabs: readonly ToolbarTab[]
  activeTab: string
  onSelectTab: (id: string) => void
  /** Names the strip for assistive tech; the tabs themselves are the labels. */
  label: string
}

export function ViewTabs({ tabs, activeTab, onSelectTab, label }: ViewTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onSelectTab} className="min-w-0 shrink gap-0">
      <TabsList
        variant="segmented"
        aria-label={label}
        className="max-w-full justify-start overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            className="rounded-full border-transparent px-3 text-sm data-active:border-border-control data-active:bg-card"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
