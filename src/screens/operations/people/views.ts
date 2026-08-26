/**
 * What every People view is handed, and the four view ids.
 *
 * **The four views come from the route table, not from here** — spec §3.8 rule
 * 3: *a view is a `?view=` search param and a control, never a path segment*,
 * and `fixtures/routeTable.ts` declares People's four with their title keys and
 * their order. `PeopleScreen` reads them off the row; these ids exist only so
 * a view can name a sibling (the `Captains` first-run action points at
 * `Applications`, which is the one useful thing to do with an empty roster).
 *
 * §9.4 is why each view is a **separate component**: switching views "replaces
 * the whole card body, including the header row", the mode changes with it
 * (`index` for three of them, `queue` for Applications), and a route "may
 * mount more than one mode over its lifetime — it may never mount two at
 * once". Four components, one mounted, is that rule as a file layout. It also
 * gives **AC-25** for free: selection cannot survive a view change, because
 * the hook holding it unmounts.
 */

import type { Language, Translate } from '@/lib'
import type { ToolbarTab } from '@/components/DataTable'

export const VIEW_CAPTAINS = 'captains'
export const VIEW_APPLICATIONS = 'applications'
export const VIEW_COMPLIANCE = 'compliance'
export const VIEW_RIDERS = 'riders'

/** The toolbar state every view shares, so the tab row is identical across all four. */
export interface ViewChromeProps {
  tabs: readonly ToolbarTab[]
  activeTab: string
  onSelectTab: (id: string) => void
  /**
   * §8's metadata line, **V4**: *"it carries only content DERIVED FROM THE DATA
   * ON SCREEN — counts, a record's identifiers, a timestamp […] if it cannot
   * change when the data changes, it does not belong here"*, and §7.1's own
   * wireframe shows `4 218 captains · 611 riders`.
   *
   * The count belongs to the mounted view's own read, and the header belongs to
   * the screen, so the view reports it upwards. `null` while loading or in
   * error: a count that is not known yet is not a count, and **the line renders
   * nothing rather than a zero** (the same rule as **AC-26**).
   */
  onTotal: (total: number | null) => void
}

export interface ViewChrome {
  chrome: ViewChromeProps
  t: Translate
  language: Language
  /**
   * §11.2 — `approve_drivers`. Gate at RENDER: a control the role cannot use
   * renders disabled in place with its reason, never hidden, and never checked
   * only at commit.
   */
  canWrite: boolean
  /** The acting operator, for the queue's owner chip. Never a constant. */
  currentUserId: string
}
