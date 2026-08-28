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

export { AlertRuleDialog, type AlertRuleDialogProps } from './AlertRuleDialog'
export { AlertsView, type AlertsViewProps } from './AlertsView'
export { EMPTY_QUERY, ReportBuilder, type ReportBuilderProps } from './ReportBuilder'
export { ReportLibrary, type ReportLibraryProps } from './ReportLibrary'
export {
  DashboardDetailScreen,
  REPORTS_SUB_TAB_ID,
  REPORTS_VIEWS,
  ReportsScreen,
  SavedReportScreen,
  type ReportsScreenProps,
} from './ReportsScreen'
export { SaveReportDialog } from './SaveReportDialog'
export { downloadCsv, reportCsvToText } from './csv'
