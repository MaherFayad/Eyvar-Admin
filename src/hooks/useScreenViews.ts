/**
 * The `?view=` tab row a screen owns — foundation §3.8.3.
 *
 * A view is a **control, not a level**: it rides as `?view=` and it changes
 * neither nav column's highlight. That part is settled and this file only
 * implements it.
 *
 * **This lived in `screens/financials/shared/views.ts` and was promoted here
 * on its seventh consumer**, the same way `useOnline` was promoted out of
 * `src/shell/` on its third. The captain profile page (`screens/entity/`) is
 * that seventh, and a screen module importing from another screen module is the
 * shape the promotion exists to prevent. Moved unchanged — no signature, no
 * behaviour and no name is different from the six-consumer version.
 *
 * ## The divergence, reported rather than papered over
 *
 * Financials §5 declares views for six of the seven sub-tabs. `routeTable.ts`
 * carries them for **one** — `financials-pricing`. So the other five screens
 * declare their own inline, and the route table stays the single owner of the
 * ones it holds.
 *
 * That is a gap in the route table, not a decision made here, and it has the
 * same shape as the one wave 2 reported for the work queues: *"`routeTable.ts`
 * has a single owner. Reported rather than edited."* When the rows land, a
 * screen swaps its local `VIEWS` for `row.views` and nothing else moves — which
 * is why `ScreenView` is deliberately the same two fields `SubTabView` starts
 * with.
 */

import { useCallback, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { Translate } from '@/lib'
import type { ToolbarTab } from '@/components/DataTable'
import { useRouteState, withView } from '@/shell/routeState'

export interface ScreenView {
  id: string
  titleKey: string
}

export interface ScreenViews {
  tabs: readonly ToolbarTab[]
  /** Always one of `views`. An unknown `?view=` falls back rather than rendering nothing. */
  activeTab: string
  selectTab: (id: string) => void
}

/**
 * @param views the declared views, in display order
 * @param defaultView the one an operator lands on
 *
 * **The default is the screen's, and each screen names the sentence that chose
 * it.** Cash & Captain Debt defaults to its reconciliation queue rather than to
 * its ledger, because the queue is work owed; the ledgers default to
 * `All postings`, because a ledger describes a resource. Both are §5's own
 * wording.
 */
export function useScreenViews(
  views: readonly ScreenView[],
  defaultView: string,
  t: Translate,
): ScreenViews {
  const route = useRouteState()
  const location = useLocation()
  const navigate = useNavigate()

  const tabs = useMemo<readonly ToolbarTab[]>(
    () => views.map((view) => ({ id: view.id, label: t(view.titleKey) })),
    [views, t],
  )

  const activeTab = views.some((view) => view.id === route.view)
    ? (route.view as string)
    : defaultView

  const selectTab = useCallback(
    (id: string) => {
      navigate({ pathname: location.pathname, search: withView(location.search, id) })
    },
    [navigate, location.pathname, location.search],
  )

  return { tabs, activeTab, selectTab }
}
