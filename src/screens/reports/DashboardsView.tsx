/**
 * The dashboards list — a P1 index table over `dashboards.list`, and the third
 * of the sub-tab's three views (§3.8 rule 3).
 *
 * ## It was declared and never built, and that is the defect this closes
 *
 * `routeTable.ts` has carried `dashboards` since D1a, `clients/dashboards.ts`
 * and `DashboardTile` were both written, and `ReportsScreen` declared two views
 * where the table declared three. `?view=dashboards` failed the screen's guard
 * and **silently fell back to the report library** — unreachable rather than
 * broken, which is why nobody noticed. `routes.test.ts:225` is the assertion
 * that was failing.
 *
 * ## Why a dashboard is worth having at all
 *
 * §11: *a dashboard is a named, ordered list of saved report ids, rendered
 * through the existing composer. Nothing more.* Pinning a saved report to one
 * is what makes a report worth naming — a question asked once is a URL, and a
 * question asked every Monday is a tile.
 *
 * Rules applied
 *   §11.1       the first-run heading names what the section is FOR, never the
 *               absence of data.
 *   `states.md` `no-match` for a search that matched nothing, `first-run` for a
 *               list that has never held a row. `DataTable` applies the rule.
 *   §9.2        a dashboard NAME is user content: never translated, and it
 *               carries its own direction inside an English UI (AC-898).
 *   R3          one primary — `New dashboard`.
 */

import { useState } from 'react'
import { DataTable, type RowAction } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { DataColumn } from '@/components/table/columns'
import { useAsync, useIndexTable } from '@/hooks'
import { deleteDashboard, listDashboards, saveDashboard } from '@/data/clients'
import { REPORT_NAME_MAX, type Dashboard } from '@/data/types'
import { formatDate, isolatedRunProps, type Language, type Translator } from '@/lib'
import { reportsViewTabs, type ReportsView } from './views'

export interface DashboardsViewProps {
  title: string
  activeView?: ReportsView
  onSelectView?: (view: ReportsView) => void
  onOpen: (dashboard: Dashboard) => void
  t: Translator
  language: Language
  dir: 'ltr' | 'rtl'
}

export function DashboardsView({
  title,
  activeView = 'dashboards',
  onSelectView,
  onOpen,
  t,
  language,
  dir,
}: DashboardsViewProps) {
  const table = useIndexTable<Dashboard>({ mode: 'index', getRowId: (row) => row.id })
  const [creating, setCreating] = useState(false)
  const [pending, setPending] = useState<{ dashboard: Dashboard; failed: boolean } | null>(null)

  const dashboards = useAsync((signal) => listDashboards(table.params, signal), {
    deps: [JSON.stringify(table.params)],
  })

  const rows = dashboards.data?.items ?? []

  const columns: Array<DataColumn<Dashboard>> = [
    {
      id: 'name',
      header: t('rb.dashboards.col.name'),
      alwaysVisible: true,
      minWidth: 260,
      sortField: 'name',
      dataType: 'text',
      cell: (row) => (
        /* User content. Layout on the box, isolation on the run (AC-898). */
        <span {...isolatedRunProps({ className: 'min-w-0 truncate' }).box}>
          <bdi {...isolatedRunProps().run}>{row.name}</bdi>
        </span>
      ),
    },
    {
      id: 'tiles',
      header: t('rb.dashboards.col.tiles'),
      width: 120,
      dataType: 'number',
      /* A dashboard with no tiles is valid (AC-865) and reads as `0`, not as a
         blank: zero reports is a fact, and a blank cell is a missing reading. */
      cell: (row) => <span className="tabular-nums">{row.tiles.length}</span>,
    },
    {
      id: 'updated',
      header: t('rb.dashboards.col.updated'),
      width: 160,
      sortField: 'updatedAt',
      dataType: 'date',
      cell: (row) => <bdi>{formatDate(row.updatedAt, { style: 'day-month-time', language })}</bdi>,
    },
  ]

  const rowActions: Array<RowAction<Dashboard>> = [
    { label: t('rb.dashboards.open'), onSelect: onOpen },
    {
      label: t('rb.dashboards.delete'),
      onSelect: (row) => setPending({ dashboard: row, failed: false }),
    },
  ]

  const confirmDelete = async () => {
    if (!pending) return
    try {
      await deleteDashboard(pending.dashboard.id)
      setPending(null)
      dashboards.refetch()
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
          primaryAction={{ label: t('rb.dashboards.new'), onClick: () => setCreating(true) }}
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
          status={dashboards.status}
          total={dashboards.data?.total ?? 0}
          t={t}
          language={language}
          tableId="management-reports-dashboards"
          view={activeView}
          tabs={reportsViewTabs(t)}
          activeTab={activeView}
          onSelectTab={(id) => onSelectView?.(id as ReportsView)}
          searchPlaceholder={t('rb.dashboards.search')}
          rowActions={rowActions}
          skeletonPattern="P1"
          firstRun={{
            heading: t('rb.dashboards.firstRun.heading'),
            body: t('rb.dashboards.firstRun.body'),
            actions: [
              { label: t('rb.dashboards.firstRun.action'), onClick: () => setCreating(true), primary: true },
            ],
          }}
          noMatch={{
            message: t('rb.dashboards.noMatch'),
            action: { label: t('rb.dashboards.noMatch.action'), onClick: table.clearAll },
          }}
          error={{ message: t('rb.dashboards.error'), onRetry: dashboards.refetch }}
        />
      </div>

      <NewDashboardDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={(dashboard) => {
          setCreating(false)
          onOpen(dashboard)
        }}
        t={t}
      />

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('rb.dashboards.delete.title', { name: pending?.dashboard.name ?? '' })}
            </AlertDialogTitle>
            {/* §11: deleting a dashboard unpins its reports and deletes nothing
                else. The asymmetry with a report's delete is deliberate and the
                sentence says which one this is. */}
            <AlertDialogDescription>{t('rb.dashboards.delete.body')}</AlertDialogDescription>
          </AlertDialogHeader>

          {pending?.failed && (
            <p role="alert" className="text-xs text-muted-foreground">
              {t('rb.dashboards.delete.failed')}
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>{t('rb.dashboards.delete.cancel')}</AlertDialogCancel>
            {/* R5a use #1 — the one place a destructive button is legal here. */}
            <Button type="button" variant="destructive" onClick={() => void confirmDelete()}>
              {t('rb.dashboards.delete.confirm')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SingleColumnPage>
  )
}

/**
 * A name and nothing else.
 *
 * **A dashboard with zero tiles is valid** — AC-865 requires creating one with
 * a name and no tiles, and rendering the first-run empty state *for that
 * dashboard*. Requiring a tile up front would make that state unreachable and
 * would ask an operator to choose reports before they have decided what the
 * board is for.
 */
function NewDashboardDialog({
  open,
  onOpenChange,
  onCreated,
  t,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (dashboard: Dashboard) => void
  t: Translator
}) {
  const [name, setName] = useState('')
  const [reasons, setReasons] = useState<string[]>([])
  const [failed, setFailed] = useState(false)

  const submit = async () => {
    setFailed(false)
    try {
      const outcome = await saveDashboard({ id: null, name, tiles: [] })
      if (outcome.status === 'invalid') {
        /* A RETURNED outcome, not a throw: a failed save never closes the
           dialog it came from and the operator's input is preserved (AC-859). */
        setReasons(outcome.reasons)
        return
      }
      setReasons([])
      setName('')
      onCreated(outcome.dashboard)
    } catch {
      setFailed(true)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('rb.dashboards.new.title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('rb.dashboards.new.body')}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rb-dashboard-name">{t('rb.dashboards.new.name')}</Label>
          <Input
            id="rb-dashboard-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          {reasons.map((reason) => (
            <p key={reason} className="text-xs text-muted-foreground">
              {t(`rb.save.invalid.${reason}`, { max: REPORT_NAME_MAX })}
            </p>
          ))}
          {failed && (
            <p role="alert" className="text-xs text-muted-foreground">
              {t('rb.dashboards.new.failed')}
            </p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>{t('rb.dashboards.new.cancel')}</AlertDialogCancel>
          {/* §3.2 — validate by disabling the primary, and carry no error text
              while the field is merely still empty. */}
          <Button type="button" disabled={name.trim() === ''} onClick={() => void submit()}>
            {t('rb.dashboards.new.confirm')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
