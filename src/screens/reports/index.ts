/**
 * The Report Builder — `specs/06-report-builder.md`, D13.
 *
 * Four surfaces over one object at four levels of persistence: a composed
 * `ReportQuery` (the URL is its storage), a saved report, a dashboard tile that
 * points at one, and an alert rule that points at one of its series.
 *
 * **Nothing here is routed yet.** `management-reports` would be a 35th sub-tab
 * and D1 says 34; **Q-RB-1 is the business owner's and is unanswered**. The
 * mount point in `routes.tsx` is keyed on `REPORTS_SUB_TAB_ID` and stays inert
 * until the row exists.
 */

export { AlertRuleDialog, type AlertRuleDialogProps } from './AlertRuleDialog'
export { AlertsView, type AlertsViewProps } from './AlertsView'
export { DashboardScreen, DashboardsView } from './DashboardsView'
export { EMPTY_QUERY, ReportBuilder, type ReportBuilderProps } from './ReportBuilder'
export { ReportLibrary, type ReportLibraryProps } from './ReportLibrary'
export {
  DashboardDetailScreen,
  REPORTS_SUB_TAB_ID,
  ReportsScreen,
  SavedReportScreen,
  type ReportsScreenProps,
} from './ReportsScreen'
export { SaveReportDialog } from './SaveReportDialog'
export { downloadCsv, reportCsvToText } from './csv'
