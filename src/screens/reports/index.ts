/**
 * The Report Builder — `specs/06-report-builder.md`, D13.
 *
 * Four surfaces over one object at four levels of persistence: a composed
 * `ReportQuery` (the URL is its storage), a saved report, a dashboard tile that
 * points at one, and an alert rule that points at one of its series.
 *
 * **Routed at `/management/reports` as of D1a.** It was inert for a wave:
 * `management-reports` is a 35th sub-tab where D1 said 34, and Q-RB-1 was the
 * business owner's to answer. It is answered — Management, order 6 — the
 * amendment is recorded in `DECISIONS.md`, and `routeTable.ts` carries the row.
 * The mount point in `routes.tsx` is still keyed on `REPORTS_SUB_TAB_ID` and did
 * not change when the row landed.
 */

export { AlertHistoryDialog, type AlertHistoryDialogProps } from './AlertHistoryDialog'
export { AlertRuleDialog, type AlertRuleDialogProps } from './AlertRuleDialog'
/* Type-only: a VALUE re-export here defeats `ReportsScreen.tsx`'s own
   `lazy(() => import('./AlertsView'))` — Rollup keeps a module that is both
   statically and dynamically reachable from the same entry in that entry's
   synchronous chunk, so recharts loaded on every `/management/reports` visit
   regardless (performance audit finding 1). Nothing outside `screens/reports`
   imports the value through this barrel (grepped), so nothing loses it. */
export type { AlertsViewProps } from './AlertsView'
export { EMPTY_QUERY, ReportBuilder, type ReportBuilderProps } from './ReportBuilder'
export { ReportLibrary, type ReportLibraryProps } from './ReportLibrary'
export {
  REPORTS_SUB_TAB_ID,
  REPORTS_VIEWS,
  ReportsScreen,
  SavedReportScreen,
  type ReportsScreenProps,
} from './ReportsScreen'

/* `routes.tsx` imports this name from the barrel and dispatches to it on
   `detail.kind === 'dashboard'`; it is now a redirect to `/pages/:pageId`
   (D46). `DashboardsView` is gone — `@/screens/pages` carries `PagesView`. */
export { DashboardDetailScreen } from './DashboardDetailScreen'
export { ModeField, ReportModePanel, type ReportModePanelProps } from './ReportModePanel'
export { ReportModeCanvas, type ReportModeCanvasProps } from './ReportModeCanvas'
export { REPORTS_VIEWS as REPORTS_VIEW_IDS, normaliseReportsView, reportsViewTabs, type ReportsView } from './views'
export { SaveReportDialog } from './SaveReportDialog'
export { downloadCsv, reportCsvToText } from './csv'
