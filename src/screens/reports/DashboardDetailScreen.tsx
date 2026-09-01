/**
 * One dashboard — `/management/reports/dashboards/:dashboardId`.
 *
 * ```
 *  Growth review                              [Add a report]
 *  ┌──────────────────┐ ┌──────────────────┐
 *  │ New subs by plan │ │ Promo ROI      ▲▼│
 *  │  ▁▂▃▅▇          │ │ (gone)  [Remove] │  ← §11.3's MISSING tile
 *  └──────────────────┘ └──────────────────┘
 * ```
 *
 * ## Every tile loads on its own, and that is the whole design
 *
 * `dashboards.get` returns the tiles in order and **does not resolve them**, so
 * one tile can load, one fail with its own retry, one be blocked and one be
 * missing, all at once, with the rest rendered (§11.4, **AC-872**). A dashboard
 * that resolved its tiles server-side would fail as a unit. `DashboardTile`
 * owns that per-tile lifecycle; this screen owns the list, its order, and the
 * dashboard's own four states.
 *
 * ## The screen was declared and dropped, and the route made it worse
 *
 * `routeTable.ts` has carried this detail route since D1a, and `routes.tsx`
 * dispatched **both** of the Reports row's detail routes to `SavedReportScreen`
 * — so opening a dashboard called `getReport('')`, which throws, and an
 * operator got the read-only *this report was deleted* builder for a dashboard
 * that exists. The route now dispatches on `detail.kind`; this file is the
 * other half of that fix and must keep this exported name.
 *
 * ## Order is two integers, not a grid
 *
 * §11.2 costs a drag-and-drop grid honestly — a second layout model, a
 * persisted geometry per breakpoint, and a keyboard equivalent for every drag,
 * because *§7 does not exempt drag-and-drop; a reorder with no keyboard path is
 * a defect*. `Move up` / `Move down` are real buttons on every tile
 * (**AC-871**), `moveTile` is a pure function over the list, and the reorder is
 * saved once rather than per keystroke.
 *
 * Rules applied
 *   `states.md` loading, error, empty, content — and the empty here is R8's
 *               FIRST kind: this dashboard has never held a tile, so it gets a
 *               heading, a line and an action (§11.4, AC-865).
 *   §7.3        the tile controls are always present, never hover-only.
 *   R3          one primary — `Add a report`.
 *   §9.1        the tile grid is a logical grid; nothing is placed by a side.
 */

import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
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
import { DashboardTile } from '@/components/reports'
import { useAsync } from '@/hooks'
import { useNowIso } from '@/screens/queues'
import { useShell } from '@/shell/ShellContext'
import {
  EYVAR_TODAY,
  getDashboard,
  listDimensions,
  listMeasures,
  listReports,
  localDayOf,
  moveTile,
  saveDashboard,
} from '@/data/clients'
import type { Dashboard, DashboardTile as Tile, SavedReport } from '@/data/types'
import { isolatedRunProps, type Translator } from '@/lib'

export function DashboardDetailScreen() {
  const shell = useShell()
  const navigate = useNavigate()
  const { dashboardId = '' } = useParams()
  const { t, dir, language } = shell.language
  const now = useNowIso()
  /* Passed down, never read from an ambient clock inside a tile. */
  const today = now ? localDayOf(now) : EYVAR_TODAY

  const dashboard = useAsync(async (signal) => (await getDashboard(dashboardId, signal)).data, {
    deps: [dashboardId],
    /* A dashboard with no tiles is a real answer and a valid record (AC-865).
       It is the FIRST-RUN empty for that dashboard, not an empty list of
       dashboards, so it must not be folded into `useAsync`'s `empty`. */
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
    { deps: [], isEmpty: (data) => data.measures.length === 0 },
  )

  const [adding, setAdding] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)

  /**
   * One optimistic write of the whole tile list.
   *
   * The reorder and the removal are both *the list, changed*, so they are one
   * call rather than two endpoints — and `saveDashboard` renormalises `order`
   * to 1..n, which is what makes `Move up` at the top a no-op instead of drift.
   */
  const writeTiles = useCallback(
    async (current: Dashboard, tiles: Tile[]) => {
      setSaveFailed(false)
      try {
        const outcome = await saveDashboard({ id: current.id, name: current.name, tiles })
        if (outcome.status === 'invalid') {
          setSaveFailed(true)
          return
        }
        dashboard.refetch()
      } catch {
        /* Stated, and nothing is lost: the refetch below restores the order the
           server actually holds rather than leaving the screen showing a move
           that did not happen. */
        setSaveFailed(true)
        dashboard.refetch()
      }
    },
    [dashboard],
  )

  const row = dashboard.data ?? null
  const tiles = row ? [...row.tiles].sort((a, b) => a.order - b.order) : []

  const header = (
    <PageHeader
      title={row?.name ?? t('rb.dashboards.col.name')}
      meta={null}
      /* R3 — one primary, and it is the one thing this screen exists for. */
      primaryAction={{
        label: t('rb.dashboard.add'),
        onClick: () => setAdding(true),
        /* §11.2 — disabled IN PLACE while there is no dashboard to add to,
           never hidden. */
        disabled: row === null,
      }}
      secondaryActions={[
        { label: t('rb.dashboard.back'), onClick: () => navigate('/management/reports?view=dashboards') },
      ]}
      t={t}
      dir={dir}
    />
  )

  return (
    <SingleColumnPage header={header}>
      {saveFailed && (
        /* A standing condition of this record, beside it — not a toast, which
           R10 reserves for a transient confirmation. */
        <p role="alert" className="pb-3 text-sm text-muted-foreground">
          {t('rb.dashboard.save.failed')}
        </p>
      )}

      {dashboard.status === 'loading' ? (
        <LoadingSkeleton pattern="P5" label={t('rb.dashboard.loading')} />
      ) : dashboard.status === 'error' || row === null ? (
        <ErrorState
          scope="page"
          message={t('rb.dashboard.error')}
          action={{ label: t('rb.dashboard.retry'), onClick: dashboard.refetch }}
        />
      ) : tiles.length === 0 ? (
        /* R8's FIRST kind, for THIS dashboard: it has never held a tile, the
           heading names what a dashboard is for, and there is an action
           (§11.4, AC-865). Different from the library's empty, which is about
           there being no dashboards at all. */
        <EmptyState
          kind="first-run"
          heading={t('rb.dashboard.empty.heading')}
          body={t('rb.dashboard.empty.body')}
          actions={[{ label: t('rb.dashboard.empty.action'), onClick: () => setAdding(true), primary: true }]}
        />
      ) : (
        /* Two across, the same grid the builder's small multiples use, so a
           tile and a panel are the same size wherever they are read. Static
           class strings: a computed column count is a class Tailwind's scanner
           never sees and therefore never emits. */
        <ul role="list" className="grid list-none grid-cols-1 gap-3 wide:grid-cols-2">
          {tiles.map((tile, index) => (
            <li key={tile.tileId} className="min-w-0">
              <DashboardTile
                tile={tile}
                measures={catalogue.data?.measures ?? []}
                dimensions={catalogue.data?.dimensions ?? []}
                today={today}
                canMoveUp={index > 0}
                canMoveDown={index < tiles.length - 1}
                onMove={(tileId, direction) => void writeTiles(row, moveTile(tiles, tileId, direction))}
                onRemove={(tileId) =>
                  void writeTiles(
                    row,
                    tiles.filter((candidate) => candidate.tileId !== tileId),
                  )
                }
                onOpen={(report) => navigate(`/management/reports/${report.id}`)}
                noDataSentence={t('overview.noData')}
                t={t}
                language={language}
              />
            </li>
          ))}
        </ul>
      )}

      <AddReportDialog
        open={adding}
        onOpenChange={setAdding}
        pinned={tiles.map((tile) => tile.reportId)}
        onPin={(report) => {
          if (!row) return
          setAdding(false)
          void writeTiles(row, [
            ...tiles,
            {
              tileId: `TIL-${row.id}-${report.id}`,
              reportId: report.id,
              /* A display fallback ONLY, for a tile whose report has vanished
                 (AC-869). Never read while the reference resolves, or it would
                 be a second, stale source of truth for the title. */
              pinnedName: report.name,
              order: tiles.length + 1,
            },
          ])
        }}
        t={t}
      />
    </SingleColumnPage>
  )
}

/**
 * Pick a saved report to pin.
 *
 * **The tile stores a reference, never a copy of the query** — so editing the
 * report changes every dashboard that pins it (AC-867), which is correct: a
 * report is a definition and a dashboard shows the current definition.
 *
 * A report already on this dashboard is offered **disabled with the reason**
 * rather than filtered out (§11.2): an operator looking for a report they
 * pinned last week needs to see that it is already here, not to conclude it was
 * deleted.
 */
function AddReportDialog({
  open,
  onOpenChange,
  pinned,
  onPin,
  t,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  pinned: readonly string[]
  onPin: (report: SavedReport) => void
  t: Translator
}) {
  const reports = useAsync((signal) => listReports({ pageSize: 100 }, signal), {
    deps: [open],
    isEmpty: (page) => page.items.length === 0,
  })

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('rb.dashboard.add.title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('rb.dashboard.add.body')}</AlertDialogDescription>
        </AlertDialogHeader>

        {/* The picker's own four states. A trigger that stays enabled over an
            empty list is a picker that silently offers nothing. */}
        {reports.status === 'loading' ? (
          <LoadingSkeleton pattern="P1" rows={3} label={t('rb.dashboard.add.loading')} />
        ) : reports.status === 'error' ? (
          <ErrorState
            scope="card"
            card={false}
            message={t('rb.dashboard.add.error')}
            action={{ label: t('rb.library.error.retry'), onClick: reports.refetch }}
          />
        ) : reports.status === 'empty' ? (
          <p className="text-sm text-muted-foreground">{t('rb.dashboard.add.empty')}</p>
        ) : (
          <ul className="flex max-h-80 list-none flex-col gap-1 overflow-y-auto">
            {(reports.data?.items ?? []).map((report) => {
              const already = pinned.includes(report.id)
              return (
                <li key={report.id} className="flex flex-col gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-start"
                    disabled={already}
                    onClick={() => onPin(report)}
                  >
                    <span {...isolatedRunProps({ className: 'min-w-0 truncate' }).box}>
                      <bdi {...isolatedRunProps().run}>{report.name}</bdi>
                    </span>
                  </Button>
                  {already && (
                    <p className="text-xs text-muted-foreground">{t('rb.dashboard.add.already')}</p>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>{t('rb.dashboard.add.cancel')}</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
