/**
 * The dashboard list, and one dashboard rendered — §11.
 *
 * **A dashboard is a named, ordered list of saved report ids. Nothing more.**
 * "Quick" is load-bearing in the owner's ask, and the product already has a
 * composer for exactly this shape; a dashboard reuses it with a different
 * source for the list.
 *
 * ## Ordering is two integers, not a grid
 *
 * §11.2 costs a drag-and-drop grid honestly — a second layout model, a persisted
 * geometry per breakpoint, reflow when a middle tile is removed, and **a
 * keyboard equivalent for every drag, because §7 does not exempt drag-and-drop
 * and a reorder with no keyboard path is a defect rather than a nice-to-have.**
 * `Move up` / `Move down` is keyboard-operable by construction, one integer per
 * tile, no breakpoint interaction — and an ordered list is a valid input to a
 * grid, so nothing is redesigned when phase two arrives.
 *
 * `moveTile` is a **pure function** in the data layer, so the screen reorders
 * optimistically and saves once (AC-871).
 *
 * ## Two first-runs, and they are different states
 *
 * *No dashboards ever* is the library's first-run. *A dashboard with no tiles*
 * is a first-run **for that dashboard** — R8's first kind, scoped one level
 * down, and it offers `Add a report` rather than `New dashboard`. Rendering the
 * library's empty inside a dashboard would tell an operator who has just made
 * one that they have not.
 */

import { useState } from 'react'
import { DataTable, type RowAction } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { DashboardTile } from '@/components/reports/DashboardTile'
import type { DataColumn } from '@/components/table/columns'
import { useAsync, useIndexTable } from '@/hooks'
import {
  getDashboard,
  listDashboards,
  listDimensions,
  listMeasures,
  moveTile,
  saveDashboard,
} from '@/data/clients'
import type { Dashboard, DashboardTile as TileModel, SavedReport } from '@/data/types'
import { formatDate, isolatedRunProps, type Language, type Translator } from '@/lib'

/* ─────────────────────────────── the list ──────────────────────────────── */

export interface DashboardsViewProps {
  title: string
  views: React.ReactNode
  onOpen: (dashboard: Dashboard) => void
  t: Translator
  language: Language
  dir: 'ltr' | 'rtl'
}

export function DashboardsView({ title, views, onOpen, t, language, dir }: DashboardsViewProps) {
  const table = useIndexTable<Dashboard>({ mode: 'index', getRowId: (row) => row.id })
  const dashboards = useAsync((signal) => listDashboards(table.params, signal), {
    deps: [JSON.stringify(table.params)],
  })

  const columns: Array<DataColumn<Dashboard>> = [
    {
      id: 'name',
      header: t('rb.dashboards.col.name'),
      alwaysVisible: true,
      minWidth: 260,
      sortField: 'name',
      dataType: 'text',
      cell: (row) => (
        <span {...isolatedRunProps({ className: 'min-w-0 truncate' }).box}>
          <bdi {...isolatedRunProps().run}>{row.name}</bdi>
        </span>
      ),
    },
    {
      id: 'tiles',
      header: t('rb.dashboards.col.tiles'),
      width: 120,
      align: 'end',
      dataType: 'number',
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
  ]

  return (
    <SingleColumnPage header={<PageHeader title={title} meta={null} t={t} dir={dir} />}>
      <div className="flex flex-col gap-3">
        {views}
        <DataTable
          table={table}
          rows={dashboards.data?.items ?? []}
          columns={columns}
          getRowId={(row) => row.id}
          status={dashboards.status}
          total={dashboards.data?.total ?? 0}
          t={t}
          language={language}
          tableId="management-reports-dashboards"
          searchPlaceholder={t('rb.dashboards.search')}
          rowActions={rowActions}
          skeletonPattern="P1"
          firstRun={{
            heading: t('rb.dashboards.firstRun.heading'),
            body: t('rb.dashboards.firstRun.body'),
            actions: [{ label: t('rb.dashboards.firstRun.action'), onClick: () => undefined }],
          }}
          noMatch={{
            message: t('rb.dashboards.noMatch'),
            action: { label: t('rb.dashboards.noMatch.action'), onClick: table.clearAll },
          }}
          error={{ message: t('rb.dashboards.error'), onRetry: dashboards.refetch }}
        />
      </div>
    </SingleColumnPage>
  )
}

/* ────────────────────────────── one dashboard ──────────────────────────── */

export interface DashboardScreenProps {
  dashboardId: string
  today: string
  onOpenReport: (report: SavedReport) => void
  onAddReport: () => void
  noDataSentence: string
  t: Translator
  language: Language
  dir: 'ltr' | 'rtl'
}

export function DashboardScreen({
  dashboardId,
  today,
  onOpenReport,
  onAddReport,
  noDataSentence,
  t,
  language,
  dir,
}: DashboardScreenProps) {
  const dashboard = useAsync((signal) => getDashboard(dashboardId, signal), {
    deps: [dashboardId],
    isEmpty: () => false,
  })
  const catalogue = useAsync(
    async (signal) => {
      const [measures, dimensions] = await Promise.all([
        listMeasures({ pageSize: 100 }, signal),
        listDimensions({ pageSize: 100 }, signal),
      ])
      return { measures: measures.items, dimensions: dimensions.items }
    },
    { deps: [], isEmpty: () => false },
  )

  /* The optimistic order. `moveTile` is pure, so the reorder repaints at once
     and the save follows; a failed save leaves the list where the operator put
     it and says so rather than snapping it back under their cursor. */
  const [order, setOrder] = useState<readonly TileModel[] | null>(null)
  const tiles = order ?? dashboard.data?.data.tiles ?? []

  const move = (tileId: string, direction: -1 | 1) => {
    const next = moveTile(tiles, tileId, direction)
    setOrder(next)
    if (dashboard.data) {
      void saveDashboard({ id: dashboard.data.data.id, name: dashboard.data.data.name, tiles: next })
    }
  }

  const remove = (tileId: string) => {
    const next = tiles.filter((tile) => tile.tileId !== tileId).map((tile, i) => ({ ...tile, order: i + 1 }))
    setOrder(next)
    if (dashboard.data) {
      void saveDashboard({ id: dashboard.data.data.id, name: dashboard.data.data.name, tiles: next })
    }
  }

  const title = dashboard.data?.data.name ?? ''

  return (
    <SingleColumnPage header={<PageHeader title={title} meta={null} t={t} dir={dir} />}>
      {dashboard.status === 'loading' ? (
        <LoadingSkeleton pattern="P5" label={title} />
      ) : dashboard.status === 'error' ? (
        <ErrorState
          scope="page"
          heading={t('state.pageError.title', { resource: t('rb.view.dashboards') })}
          message={t('state.pageError.body')}
          action={{ label: t('state.pageError.action'), onClick: dashboard.refetch }}
        />
      ) : tiles.length === 0 ? (
        /* R8's first kind, scoped to THIS dashboard. It offers `Add a report`,
           not `New dashboard`: the operator already has one. */
        <EmptyState
          kind="first-run"
          heading={t('rb.dashboard.empty.heading')}
          body={t('rb.dashboard.empty.body')}
          actions={[{ label: t('rb.dashboard.empty.action'), onClick: onAddReport, primary: true }]}
        />
      ) : (
        <ul role="list" className="grid list-none grid-cols-1 gap-4 wide:grid-cols-2">
          {tiles.map((tile, index) => (
            <li key={tile.tileId} className="min-w-0">
              <DashboardTile
                tile={tile}
                measures={catalogue.data?.measures ?? []}
                dimensions={catalogue.data?.dimensions ?? []}
                today={today}
                canMoveUp={index > 0}
                canMoveDown={index < tiles.length - 1}
                onMove={move}
                onRemove={remove}
                onOpen={onOpenReport}
                noDataSentence={noDataSentence}
                t={t}
                language={language}
              />
            </li>
          ))}
        </ul>
      )}
    </SingleColumnPage>
  )
}
