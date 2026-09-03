/**
 * The saved-report library — a P1 index table over `reports.list`.
 *
 * ## Two empties, and choosing wrongly is a defect
 *
 * `states.md` makes the choice mechanical rather than a matter of taste, and
 * `DataTable` already applies it: a table filtered to zero is `no-match` — one
 * grey sentence and a way back — and a table that has never held a row is
 * `first-run`. The illustration on a filtered-to-zero library would claim the
 * reports do not exist, which is a lie the operator would act on by rebuilding
 * one they already have.
 *
 * ## Deleting a pinned report names the dashboards
 *
 * §11.3: `reports.delete` **refuses by default** when the report is pinned, and
 * it returns the dashboards as data — `{ status: 'pinned', dashboards: [{ id,
 * name }] }` — precisely so the confirmation can name them. A generic refusal
 * would throw away a list the client is already holding, and *"Remove from
 * those dashboards and delete"* has to be an explicit second step because a
 * dangling reference must not be creatable through the UI.
 *
 * Rules applied
 *   §9.1        view tabs inside the table card; the search field is the
 *               toolbar's, not a second one.
 *   §11.1       the first-run heading names what the section is FOR — *Ask the
 *               business a question* — never the absence of data.
 *   §7.3        row actions are not hover-only: `DataTable` renders the action
 *               lane always and reveals ink on hover **or** focus-within.
 *   R5a         `Delete` is destructive and is the one place in this module a
 *               destructive button is legal. It is in the row menu, not on the
 *               page header.
 *   §9.2        a report NAME is user content: never translated, and it carries
 *               its own direction inside an English UI (AC-898).
 *
 * ## An alert is an action on a report, not only a destination
 *
 * `Create alert` opens the rule form **with this row's report already chosen**
 * (`AlertRuleDialog`'s `presetReportId`). Without it the only route in is the
 * Alerts sub-tab, `New alert`, and then re-picking by name — from a list of up
 * to 100 — the report the operator had just been standing on.
 *
 * It is not the row-click target and never could be: `Open` is (§11.2 allows
 * one), and this one opens a form that writes.
 */

import { useState } from 'react'
import { toast } from 'sonner'
import { DataTable, type RowAction } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { DataColumn } from '@/components/table/columns'
import { useAsync, useIndexTable } from '@/hooks'
import { EYVAR_TODAY, deleteReport, listReports } from '@/data/clients'
import type { SavedReport } from '@/data/types'
import { formatDate, isolatedRunProps, type Language, type Translator } from '@/lib'
import { AlertRuleDialog } from './AlertRuleDialog'
import { reportsViewTabs, type ReportsView } from './views'

export interface ReportLibraryProps {
  title: string
  activeView?: ReportsView
  onSelectView?: (view: ReportsView) => void
  onOpen: (report: SavedReport) => void
  onNew: () => void
  views?: React.ReactNode
  /**
   * The day `Create alert` resolves the chosen report's series against.
   *
   * Optional, and defaulted to the mock clock's today rather than read from an
   * ambient one inside the dialog — `ReportsScreen` derives a ticking `today`
   * for `AlertsView` and can thread the same value here in one line. Recorded
   * as a follow-up rather than taken, because that screen has another owner
   * right now.
   */
  today?: string
  t: Translator
  language: Language
  dir: 'ltr' | 'rtl'
}

interface PendingDelete {
  report: SavedReport
  /** Non-empty when the delete was refused because the report is pinned (§11.3). */
  dashboards: ReadonlyArray<{ id: string; name: string }>
  failed: boolean
}

export function ReportLibrary({
  title,
  activeView = 'reports',
  onSelectView,
  onOpen,
  onNew,
  today = EYVAR_TODAY,
  t,
  language,
  dir,
}: ReportLibraryProps) {
  const table = useIndexTable<SavedReport>({ mode: 'index', getRowId: (row) => row.id })
  const [pending, setPending] = useState<PendingDelete | null>(null)
  /* The report `Create alert` was pressed on. Held rather than passed straight
     into the dialog so the dialog's own reset effect is the single place the
     preset is consumed. */
  const [alertFor, setAlertFor] = useState<SavedReport | null>(null)

  const reports = useAsync((signal) => listReports({ ...table.params, view: table.view }, signal), {
    /* Both of the fetcher's inputs are here; delete calls `reports.refetch`. */
    deps: [JSON.stringify(table.params), table.view],
    cacheKey: 'reports.list',
  })

  const rows = reports.data?.items ?? []

  const columns: Array<DataColumn<SavedReport>> = [
    {
      id: 'name',
      header: t('rb.library.col.name'),
      alwaysVisible: true,
      minWidth: 260,
      sortField: 'name',
      dataType: 'text',
      cell: (row) => (
        /* User content. Never translated, and it must render right-to-left
           inside an English UI (AC-898). Layout on the box, isolation on the
           run — never the other way round. */
        <span {...isolatedRunProps({ className: 'min-w-0 truncate' }).box}>
          <bdi {...isolatedRunProps().run}>{row.name}</bdi>
        </span>
      ),
      secondaryLine: (row) =>
        row.description === null ? null : (
          <span {...isolatedRunProps({ className: 'min-w-0 truncate' }).box}>
            <bdi {...isolatedRunProps().run}>{row.description}</bdi>
          </span>
        ),
    },
    {
      id: 'visibility',
      header: t('rb.library.col.visibility'),
      width: 120,
      cell: (row) => (
        /* R7's closed five-tone set. `team` is not a success and `private` is
           not a warning; both are factual, so both are neutral. */
        <StatusBadge tone={row.visibility === 'team' ? 'info' : 'neutral'}>
          {t(`rb.save.visibility.${row.visibility}`)}
        </StatusBadge>
      ),
    },
    {
      id: 'updated',
      header: t('rb.library.col.updated'),
      width: 160,
      sortField: 'updatedAt',
      dataType: 'date',
      cell: (row) => <bdi>{formatDate(row.updatedAt, { style: 'day-month-time', language })}</bdi>,
    },
  ]

  const rowActions: Array<RowAction<SavedReport>> = [
    /* **P0-2 — the declared row-click target.** `Delete` is the other
       action on this table and must stay unreachable from a row click. */
    { label: t('rb.library.open'), onSelect: onOpen, rowClick: true },
    {
      /* Opens the rule form on THIS report. See the file header. */
      label: t('rb.library.createAlert'),
      onSelect: (row) => setAlertFor(row),
    },
    {
      label: t('rb.library.delete'),
      onSelect: (row) => setPending({ report: row, dashboards: [], failed: false }),
    },
  ]

  const confirmDelete = async (force: boolean) => {
    if (!pending) return
    try {
      const outcome = await deleteReport(pending.report.id, { force })
      if (outcome.status === 'pinned') {
        /* Refused, WITH the names. §11.3, AC-868. */
        setPending({ ...pending, dashboards: outcome.dashboards, failed: false })
        return
      }
      setPending(null)
      reports.refetch()
    } catch {
      /* A failed mutation never closes the surface it came from (§8.3). */
      setPending({ ...pending, failed: true })
    }
  }

  return (
    <SingleColumnPage
      header={
        <PageHeader
          title={title}
          meta={null}
          /* R3 — one primary on the screen, and on a library it is the one
             thing an operator came here to do that nothing else offers. */
          primaryAction={{ label: t('rb.library.new'), onClick: onNew }}
          t={t}
          dir={dir}
        />
      }
    >
      <div className="flex flex-col gap-3">
        <DataTable
          table={table}
          rows={rows}
          columns={columns}
          getRowId={(row) => row.id}
          status={reports.status}
          total={reports.data?.total ?? 0}
          t={t}
          language={language}
          tableId="management-reports-library"
          view={activeView}
          /* All three, from one declaration. Two of the three tab strips
             used to list two views each, and the third view was unreachable
             because nothing rendered a tab for it (`views.ts`). */
          tabs={reportsViewTabs(t)}
          activeTab={activeView}
          onSelectTab={(id) => onSelectView?.(id as ReportsView)}
          searchPlaceholder={t('rb.library.search')}
          rowActions={rowActions}
          skeletonPattern="P1"
          firstRun={{
            heading: t('rb.library.firstRun.heading'),
            body: t('rb.library.firstRun.body'),
            actions: [{ label: t('rb.library.firstRun.action'), onClick: onNew, primary: true }],
          }}
          noMatch={{
            message: t('rb.library.noMatch'),
            action: { label: t('rb.library.noMatch.action'), onClick: table.clearAll },
          }}
          error={{ message: t('rb.library.error'), onRetry: reports.refetch }}
        />
      </div>

      {/* Mounted only while a report is chosen, so the dialog's reset effect
          runs against a preset that exists rather than against `undefined` and
          then again against a value. */}
      {alertFor !== null && (
        <AlertRuleDialog
          open
          onOpenChange={(open) => !open && setAlertFor(null)}
          /* A CREATE. The preset is read only because this is `null` — see
             `presetReportId`. */
          rule={null}
          presetReportId={alertFor.id}
          today={today}
          onSaved={(saved) => {
            setAlertFor(null)
            /* R9 / §5.1 — a toast for a mutation made inside a modal, naming
               the object that was written. The library's own rows do not move,
               so nothing else on this screen would confirm it. */
            toast.success(t('rb.alert.toast.saved', { name: saved.name }))
          }}
          t={t}
          language={language}
        />
      )}

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending && pending.dashboards.length > 0
                ? t('rb.delete.pinned.title')
                : t('rb.delete.title', { name: pending?.report.name ?? '' })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending && pending.dashboards.length > 0
                ? t('rb.delete.pinned.body', { name: pending.report.name })
                : t('rb.delete.body')}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* The dashboards, BY NAME. The client returned them for this. */}
          {pending && pending.dashboards.length > 0 && (
            <ul className="flex list-none flex-col gap-0.5">
              {pending.dashboards.map((dashboard) => (
                <li key={dashboard.id} className="text-sm text-foreground">
                  <bdi>{dashboard.name}</bdi>
                </li>
              ))}
            </ul>
          )}

          {pending?.failed && (
            <p role="alert" className="text-xs text-muted-foreground">
              {t('rb.delete.failed')}
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>{t('rb.delete.cancel')}</AlertDialogCancel>
            {/* R5a use #1 — a destructive button. The explicit second step
                carries its own label so nobody confirms the wrong scope. */}
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmDelete((pending?.dashboards.length ?? 0) > 0)}
            >
              {pending && pending.dashboards.length > 0
                ? t('rb.delete.pinned.confirm')
                : t('rb.delete.confirm')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SingleColumnPage>
  )
}
