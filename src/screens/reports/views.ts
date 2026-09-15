/**
 * The sub-tab's views (§3.8 rule 3), `reports · pages · alerts · analyst` in
 * `routeTable.ts`'s own order (D46). `normaliseReportsView` still accepts the
 * pre-rename `dashboards` id (AC-1210). `analyst` renders the real
 * `AnalystView` (WP-7.4) — it was disabled-in-place until this landed.
 */

/** A view id. Not a route: `?view=` is a control, not a level (§3.8 rule 3). */
export type ReportsView = 'reports' | 'pages' | 'alerts' | 'analyst'

/** In tab order, with the default first. */
export const REPORTS_VIEWS: readonly ReportsView[] = ['reports', 'pages', 'alerts', 'analyst']

/** `dashboards` is the pre-D46 id; every other string that is not a known view falls back to the caller's own default. */
export function normaliseReportsView(raw: string | null): ReportsView | null {
  if (raw === 'dashboards') return 'pages'
  return REPORTS_VIEWS.find((v) => v === raw) ?? null
}

/**
 * The tab strip every one of the views renders, so an operator sees the same
 * tabs in the same order whichever one they are standing on.
 *
 * Takes the translator rather than returning keys, because `DataTable`'s tab
 * strip takes labels — and a caller that translated some of them would be
 * how one tab ends up showing a raw key.
 */
export function reportsViewTabs(t: (key: string) => string): Array<{ id: ReportsView; label: string }> {
  return REPORTS_VIEWS.map((id) => ({ id, label: t(`rb.view.${id}`) }))
}
