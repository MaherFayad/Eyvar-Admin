/**
 * **The sub-tab's three views, declared once.**
 *
 * §3.8 rule 3: a view changes the content of the sub-tab without changing the
 * path, and Browser Back returns to the previous one (AC-802). They are
 * `reports · dashboards · alerts`, in that order, and `routeTable.ts:254` says
 * the same three in the same order.
 *
 * ## Why this is its own module
 *
 * It shipped as two. `ReportsScreen` declared `'reports' | 'alerts'`, the route
 * table declared three, and the mismatch was **silent**: `?view=dashboards`
 * failed the `VIEWS.find` guard and fell back to `reports`, so the tab was
 * unreachable rather than broken and nothing on screen said so. Three files —
 * the screen, the library's tab strip and the alerts' tab strip — each carried
 * their own copy of the list, and one of them being right was not enough.
 *
 * `routes.test.ts` holds this array to the route table's `views`, so the two
 * cannot drift again in either direction.
 */

/** A view id. Not a route: `?view=` is a control, not a level (§3.8 rule 3). */
export type ReportsView = 'reports' | 'dashboards' | 'alerts'

/** In tab order, with the default first. */
export const REPORTS_VIEWS: readonly ReportsView[] = ['reports', 'dashboards', 'alerts']

/**
 * The tab strip every one of the three views renders, so an operator sees the
 * same three tabs in the same order whichever one they are standing on.
 *
 * Takes the translator rather than returning keys, because `DataTable`'s tab
 * strip takes labels — and a caller that translated two of the three would be
 * how one tab ends up showing a raw key.
 */
export function reportsViewTabs(t: (key: string) => string): Array<{ id: ReportsView; label: string }> {
  return REPORTS_VIEWS.map((id) => ({ id, label: t(`rb.view.${id}`) }))
}
