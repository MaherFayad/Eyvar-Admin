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

import { useCallback, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  deleteDashboard,
  getDashboard,
  listDimensions,
  listMeasures,
  listReports,
  listTeamUsers,
  localDayOf,
  moveTile,
  moveTileTo,
  saveDashboard,
} from '@/data/clients'
import { REPORT_NAME_MAX, type Dashboard, type DashboardTile as Tile, type SavedReport, type TeamUser } from '@/data/types'
import { formatDate, isolatedRunProps, type Translator } from '@/lib'
import { withFallback } from '../operations/localCopy'
import { REPORTS_EN } from './copy'

export function DashboardDetailScreen() {
  const shell = useShell()
  const navigate = useNavigate()
  const { dashboardId = '' } = useParams()
  /* AC-74 — the copy lives in `./copy.ts` and travels in this screen's
     own chunk. `withFallback` resolves a key the shell dictionary does
     not carry, so nothing here needs registering there. */
  const t = useMemo(
    /* **Memoised, and it is load-bearing.** `withFallback` returns a NEW
       function on every call, and several screens carry `t` in a `deps`
       array — so an unmemoised wrapper re-ran the fetch, which re-rendered,
       which rebuilt the wrapper. Two suites hung outright. */
    () => withFallback(shell.language.t, REPORTS_EN),
    [shell.language.t],
  )
  const { dir, language } = shell.language
  const now = useNowIso()
  /* Passed down, never read from an ambient clock inside a tile. */
  const today = now ? localDayOf(now) : EYVAR_TODAY

  const dashboard = useAsync(async (signal) => (await getDashboard(dashboardId, signal)).data, {
    deps: [dashboardId],
    /* Keyed by the record id, which is all the fetcher varies on. Every tile
       mutation calls `dashboard.refetch`. */
    cacheKey: 'dashboards.get',
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
    {
      deps: [],
      /* The measure/dimension catalogue takes no parameters and is byte-identical
         to `ReportBuilder`'s read, so both deliberately share `catalogue.measures::[]`
         - opening the builder warms the dashboard editor and back. */
      cacheKey: 'catalogue.measures',
      isEmpty: (data) => data.measures.length === 0,
    },
  )

  /* The owner is an id on the wire; a real API joins it and the mock does not,
     so the roster is read once and mapped here. The same shape
     `ApplicationsView` uses to name a decision's actor. */
  const team = useAsync<TeamUser[]>((signal) => listTeamUsers(signal), {
    deps: [],
    cacheKey: 'session.teamUsers',
  })

  const [adding, setAdding] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [deleting, setDeleting] = useState<{ failed: boolean } | null>(null)
  const [saveFailed, setSaveFailed] = useState(false)

  /**
   * One optimistic write of the whole tile list.
   *
   * The reorder and the removal are both *the list, changed*, so they are one
   * call rather than two endpoints — and `saveDashboard` renormalises `order`
   * to 1..n, which is what makes `Move up` at the top a no-op instead of drift.
   */
  const writeTiles = useCallback(
    async (
      current: Dashboard,
      tiles: Tile[],
      /* **Named by the caller, not by this function.** §5.1 asks for a toast on
         every successful mutation and R9 fixes the wording as
         `<object> <past-participle>` — so "Dashboard saved" four times would
         satisfy the letter and tell an operator nothing about which of the four
         things they just did actually happened. */
      confirmation: { key: string; params?: Record<string, string | number> },
    ) => {
      setSaveFailed(false)
      try {
        const outcome = await saveDashboard({
          id: current.id,
          name: current.name,
          /* Carried through unchanged. A tile write must not blank what the
             author wrote about the board. */
          description: current.description,
          tiles,
        })
        if (outcome.status === 'invalid') {
          setSaveFailed(true)
          return
        }
        toast.success(t(confirmation.key, confirmation.params))
        dashboard.refetch()
      } catch {
        /* Stated, and nothing is lost: the refetch below restores the order the
           server actually holds rather than leaving the screen showing a move
           that did not happen. */
        setSaveFailed(true)
        dashboard.refetch()
      }
    },
    [dashboard, t],
  )

  const row = dashboard.data ?? null
  const tiles = row ? [...row.tiles].sort((a, b) => a.order - b.order) : []
  const listRoute = '/management/reports?view=dashboards'

  const confirmDelete = async () => {
    if (!row) return
    try {
      await deleteDashboard(row.id)
      setDeleting(null)
      /* R9 — the object, named, and the past participle. The board is gone, so
         there is nowhere to stand: back to the list, and the toast is what
         carries the confirmation across the navigation. */
      toast.success(t('rb.dashboards.deleted.toast', { name: row.name }))
      navigate(listRoute)
    } catch {
      /* A failed mutation never closes the surface it came from (§8.3). */
      setDeleting({ failed: true })
    }
  }

  /* §8's second row, and it is METADATA rather than a description: both halves
     are on the record and both change when the record does (`PageHeader.meta`).
     One key with two named placeholders — never a concatenation, because
     Arabic does not order the two the way English does.

     **No view count.** There is no store for one, and `0 Views` invented into
     a fixture is exactly what AC-453 forbids. */
  const owner = team.data?.find((user) => user.id === row?.ownerId)?.name ?? row?.ownerId ?? ''
  const meta =
    row === null
      ? null
      : t('rb.dashboard.meta', {
          owner,
          time: formatDate(row.updatedAt, { style: 'day-month-time', language }),
        })

  const header = (
    <PageHeader
      title={row?.name ?? t('rb.dashboards.col.name')}
      meta={meta}
      /* §8 slot 1 — `All dashboards` was a `secondaryAction`, which read as an
         action rather than as navigation and consumed one of the two secondary
         slots the overflow below now wants. */
      onBack={() => navigate(listRoute)}
      /* R3 — one primary, and it is the one thing this screen exists for. */
      primaryAction={{
        label: t('rb.dashboard.add'),
        onClick: () => setAdding(true),
        /* §11.2 — disabled IN PLACE while there is no dashboard to add to,
           never hidden. */
        disabled: row === null,
      }}
      overflowActions={[
        {
          /* DESIGN.md:2779 forbids an inline editor that collapses on blur, so
             a rename is an explicit surface with an explicit commit. */
          label: t('rb.dashboard.rename.action'),
          onClick: () => setRenaming(true),
          disabled: row === null,
        },
        {
          label: t('rb.dashboards.delete'),
          onClick: () => setDeleting({ failed: false }),
          disabled: row === null,
          /* Last and separated in the menu — and still not red there (§5.4).
             The red button lives on the confirmation, which is R5a's one legal
             use of it. */
          destructive: true,
        },
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
                position={index + 1}
                total={tiles.length}
                canMoveUp={index > 0}
                canMoveDown={index < tiles.length - 1}
                onMove={(tileId, direction) =>
                  void writeTiles(row, moveTile(tiles, tileId, direction), {
                    key: 'rb.dashboard.reordered.toast',
                  })
                }
                /* 11.2's coarse move. One save replaces five, and the pure
                   function is the same one `Move up` calls. */
                onMoveTo={(tileId, next) =>
                  void writeTiles(row, moveTileTo(tiles, tileId, next), {
                    key: 'rb.dashboard.reordered.toast',
                  })
                }
                onRemove={(tileId) =>
                  void writeTiles(
                    row,
                    tiles.filter((candidate) => candidate.tileId !== tileId),
                    {
                      key: 'rb.dashboard.tile.removed.toast',
                      /* The tile's own name, so the toast says WHICH tile went.
                         `pinnedName` is the only name this screen holds for a
                         tile whose report never resolved. */
                      params: {
                        name:
                          tiles.find((candidate) => candidate.tileId === tileId)?.pinnedName ?? '',
                      },
                    },
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
          void writeTiles(
            row,
            [
              ...tiles,
              {
                tileId: `TIL-${row.id}-${report.id}`,
                reportId: report.id,
                /* A display fallback ONLY, for a tile whose report has vanished
                   (AC-869). Never read while the reference resolves, or it
                   would be a second, stale source of truth for the title. */
                pinnedName: report.name,
                order: tiles.length + 1,
              },
            ],
            { key: 'rb.dashboard.tile.added.toast', params: { name: report.name } },
          )
        }}
        t={t}
      />

      <RenameDashboardDialog
        open={renaming && row !== null}
        onOpenChange={setRenaming}
        dashboard={row}
        onSaved={(saved) => {
          setRenaming(false)
          toast.success(t('rb.dashboard.saved.toast', { name: saved.name }))
          dashboard.refetch()
        }}
        t={t}
      />

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('rb.dashboards.delete.title', { name: row?.name ?? '' })}
            </AlertDialogTitle>
            {/* 11 - deleting a dashboard unpins its reports and deletes nothing
                else. The asymmetry with a report's delete is deliberate and the
                sentence says which one this is. */}
            <AlertDialogDescription>{t('rb.dashboards.delete.body')}</AlertDialogDescription>
          </AlertDialogHeader>

          {deleting?.failed && (
            <p role="alert" className="text-xs text-muted-foreground">
              {t('rb.dashboards.delete.failed')}
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>{t('rb.dashboards.delete.cancel')}</AlertDialogCancel>
            {/* R5a use #1 - the one place a destructive button is legal here. */}
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
 * Rename a board, and say what it is for.
 *
 * **Not an inline field.** DESIGN.md:2779 requires an explicit commit for an
 * inline editor rather than a save on blur, so a rename is a surface with a
 * cancel and a confirm - the same shape the create dialog has, which is why it
 * carries the same two fields.
 *
 * The description travels with the name because there is otherwise no way to
 * edit one: a board created before the field existed could never say what it
 * was for.
 */
function RenameDashboardDialog({
  open,
  onOpenChange,
  dashboard,
  onSaved,
  t,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  dashboard: Dashboard | null
  onSaved: (dashboard: Dashboard) => void
  t: Translator
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [reasons, setReasons] = useState<string[]>([])
  const [failed, setFailed] = useState(false)
  /* Seeded from the record each time the dialog OPENS rather than held across
     closes: a cancelled rename must not be what the next one starts from.
     Derived-during-render rather than an effect, which would paint the stale
     value for one frame. */
  const [seededFor, setSeededFor] = useState<string | null>(null)
  const seedKey = `${dashboard?.id ?? ''}:${open ? 'open' : 'shut'}`
  if (open && dashboard && seededFor !== seedKey) {
    setSeededFor(seedKey)
    setName(dashboard.name)
    setDescription(dashboard.description ?? '')
    setReasons([])
    setFailed(false)
  }

  const submit = async () => {
    if (!dashboard) return
    setFailed(false)
    try {
      const outcome = await saveDashboard({
        id: dashboard.id,
        name,
        description,
        /* The tiles are not what this dialog edits, and sending the record's
           own list back is what keeps a rename from reordering a board. */
        tiles: dashboard.tiles,
      })
      if (outcome.status === 'invalid') {
        /* A RETURNED outcome, not a throw: a failed save never closes the
           dialog it came from and the operator's input is preserved (AC-859). */
        setReasons(outcome.reasons)
        return
      }
      setReasons([])
      onSaved(outcome.dashboard)
    } catch {
      setFailed(true)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('rb.dashboard.rename')}</AlertDialogTitle>
          <AlertDialogDescription>{t('rb.dashboard.rename.body')}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rb-dashboard-rename-name">{t('rb.dashboards.new.name')}</Label>
            <Input
              id="rb-dashboard-rename-name"
              maxLength={REPORT_NAME_MAX}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rb-dashboard-rename-description">
              {t('rb.dashboards.new.description')}
            </Label>
            <Textarea
              id="rb-dashboard-rename-description"
              placeholder={t('rb.dashboards.description.placeholder')}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          {reasons.map((reason) => (
            <p key={reason} className="text-xs text-muted-foreground">
              {t(`rb.save.invalid.${reason}`, { max: REPORT_NAME_MAX })}
            </p>
          ))}
          {failed && (
            <p role="alert" className="text-xs text-muted-foreground">
              {t('rb.dashboard.rename.failed')}
            </p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>{t('rb.dashboard.rename.cancel')}</AlertDialogCancel>
          {/* 3.2 - validate by disabling the primary, and carry no error text
              while the field is merely still empty. */}
          <Button type="button" disabled={name.trim() === ''} onClick={() => void submit()}>
            {t('rb.dashboard.rename.confirm')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
    /* Stores the client's native `Paginated` envelope; `deps: [open]` keeps this
       key distinct from `ReportLibrary`'s, which is keyed by its table params. */
    deps: [open],
    cacheKey: 'reports.list',
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
