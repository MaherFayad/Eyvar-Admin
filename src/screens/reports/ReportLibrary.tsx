/**
 * The saved-report library, a P1 index table over `reports.list`. T9.13 gives
 * it Amplitude's shape: the row is a kind glyph and a name, and `Type`, `Owner`
 * and `Last run` are columns an operator can filter on rather than prose under
 * the name. §11.3's delete is refused while a report is pinned and the
 * confirmation names the boards (AC-868). `Delete` is R5a use #1, in the menu.
 */

import { useState } from 'react'
import { toast } from 'sonner'
import { DataTable, type RowAction } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import {
  BarChartIcon,
  LineChartIcon,
  PieChartIcon,
  TableChartIcon,
} from '@/components/icons'
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
import { EYVAR_TODAY, deleteReport, listReports, listTeamUsers } from '@/data/clients'
import type { ChartType, SavedReport, TeamUser } from '@/data/types'
import { formatDate, isolatedRunProps, type Language, type Translator } from '@/lib'
import { AlertRuleDialog } from './AlertRuleDialog'
import { reportsViewTabs, type ReportsView } from './views'

export interface ReportLibraryProps {
  title: string
  activeView?: ReportsView
  onSelectView?: (view: ReportsView) => void
  onOpen: (report: SavedReport) => void
  onNew: () => void
  /* `views?: React.ReactNode` stood here and on `AlertsViewProps` — the sixth
     dead prop: never destructured, never read, never passed. Deleted rather
     than wired; `AlertsViewProps` carries the argument. */
  /**
   * The day `Create alert` resolves the chosen report's series against.
   *
   * Passed down, never read from an ambient clock inside the dialog —
   * `ReportsScreen` derives one ticking `today` and gives the same value to
   * this list and to `AlertsView`, so the one `AlertRuleDialog` answers the
   * same way whichever of the two opened it.
   *
   * Still optional, and the default is the fixed clock's day rather than a live
   * one: a test that mounts this list on its own must get a deterministic
   * answer, and `EYVAR_TODAY` is the day every fixture is written against. It
   * is a floor for an unmounted caller, not the value the app runs on.
   */
  today?: string
  t: Translator
  language: Language
  dir: 'ltr' | 'rtl'
}

/**
 * The row's type glyph, from the registry (X17). Derived from
 * `report.query.chartType` — the saved definition — never stored on the row, so
 * a report re-saved as a pie stops being drawn as a line when it is re-listed.
 */
const CHART_ICONS: Record<ChartType, typeof LineChartIcon> = {
  line: LineChartIcon,
  bar: BarChartIcon,
  pie: PieChartIcon,
  table: TableChartIcon,
}

/** The `Type` filter's options, over the same closed union the glyphs cover. */
const CHART_TYPES = Object.keys(CHART_ICONS) as ReadonlyArray<ChartType>

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
  const table = useIndexTable<SavedReport>({
    mode: 'index',
    getRowId: (row) => row.id,
    /* Load-bearing. Unscoped, this table's search parameter is a bare `?q=`,
       which is `REPORT_QUERY_PARAM`: one letter typed here used to render an
       empty builder over the list. `ReportsScreen`'s own guard stays. */
    urlKey: 'lib',
  })
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

  /* The owner is an id on the wire; a real API joins it and the mock does not,
     so the roster is read once and mapped here - derivable, never invented. */
  const team = useAsync<TeamUser[]>((signal) => listTeamUsers(signal), {
    deps: [],
    cacheKey: 'session.teamUsers',
  })
  const ownerName = (id: string) => team.data?.find((user) => user.id === id)?.name ?? id

  const columns: Array<DataColumn<SavedReport>> = [
    {
      id: 'name',
      header: t('rb.library.col.name'),
      alwaysVisible: true,
      minWidth: 220,
      sortField: 'name',
      dataType: 'text',
      /* T9.13 — a glyph and a name, on one line. The kind is its own column
         now, and the description reads on hover here and in full on the
         report's own header, where an operator edits it. */
      cell: (row) => {
        const Glyph = CHART_ICONS[row.query.chartType]
        return (
          <span
            className="flex min-w-0 items-center gap-1.5"
            title={row.description ?? undefined}
          >
            <Glyph
              aria-hidden="true"
              data-chart-kind={row.query.chartType}
              className="size-4 shrink-0 text-muted-foreground"
            />
            {/* User content. Never translated, and it must render right-to-left
                inside an English UI (AC-898). Layout on the box, isolation on
                the run — never the other way round. */}
            <span {...isolatedRunProps({ className: 'min-w-0 truncate' }).box}>
              <bdi {...isolatedRunProps().run}>{row.name}</bdi>
            </span>
          </span>
        )
      },
    },
    {
      id: 'type',
      emphasis: 'data',
      header: t('rb.library.col.type'),
      width: 110,
      dataType: 'enum',
      /* Derived from the saved query, and filtered on the same field, so the
         control and the client branch are one declaration. */
      filter: {
        kind: 'select',
        field: 'chartType',
        options: CHART_TYPES.map((kind) => ({
          value: kind,
          label: t(`rb.chartType.${kind}`),
        })),
      },
      csv: (row) => row.query.chartType,
      cell: (row) => <span>{t(`rb.chartType.${row.query.chartType}`)}</span>,
    },
    {
      id: 'owner',
      header: t('rb.library.col.owner'),
      width: 150,
      dataType: 'text',
      /* The roster is the option list, so the filter offers names rather than
         ids. Empty while it loads, which §11.6 renders as one grey sentence. */
      filter: {
        kind: 'select',
        field: 'ownerId',
        options: (team.data ?? []).map((user) => ({ value: user.id, label: user.name })),
      },
      csv: (row) => ownerName(row.ownerId),
      cell: (row) => (
        <span {...isolatedRunProps({ className: 'min-w-0 truncate' }).box}>
          <bdi {...isolatedRunProps().run}>{ownerName(row.ownerId)}</bdi>
        </span>
      ),
    },
    {
      id: 'lastRun',
      emphasis: 'data',
      header: t('rb.library.col.lastRun'),
      width: 140,
      sortField: 'lastRunAt',
      dataType: 'date',
      filter: { kind: 'date-range', field: 'lastRunAt' },
      /* O9 — a report nobody has run has no last run, and blank is the honest
         cell: `Never` would be a claim about a field the wire does not fill. */
      cell: (row) =>
        row.lastRunAt === null ? null : (
          <bdi>{formatDate(row.lastRunAt, { style: 'day-month-time', language })}</bdi>
        ),
    },
    {
      id: 'visibility',
      header: t('rb.library.col.visibility'),
      width: 110,
      /* H7 — a property, not a state. Six of seven rows carried the same fill,
         which is a badge nobody reads; muted text says the same thing (T9.13). */
      cell: (row) => (
        <span className="text-muted-foreground">
          {t(`rb.save.visibility.${row.visibility}`)}
        </span>
      ),
    },
    {
      id: 'updated',
      header: t('rb.library.col.updated'),
      width: 150,
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
        setPending({
          ...pending,
          dashboards: outcome.dashboards,
          failed: false,
        })
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
            actions: [
              {
                label: t('rb.library.firstRun.action'),
                onClick: onNew,
                primary: true,
              },
            ],
          }}
          noMatch={{
            message: t('rb.library.noMatch'),
            action: {
              label: t('rb.library.noMatch.action'),
              onClick: table.clearAll,
            },
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
