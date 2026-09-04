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
import { toast } from 'sonner'
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
import { Textarea } from '@/components/ui/textarea'
import type { DataColumn } from '@/components/table/columns'
import { useAsync, useIndexTable } from '@/hooks'
import {
  EYVAR_TODAY,
  deleteDashboard,
  listDashboards,
  listTeamUsers,
  localDayOf,
  resolveWindow,
  saveDashboard,
} from '@/data/clients'
import { useNowIso } from '@/screens/queues'
import { REPORT_NAME_MAX, type Dashboard, type DashboardTile, type TeamUser } from '@/data/types'
import { tileSpan } from '@/data/types/report'
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
    /* `table.params` is the fetcher's only input; create and delete both call
       `dashboards.refetch`. */
    deps: [JSON.stringify(table.params)],
    cacheKey: 'dashboards.list',
  })

  /* The owner is an id on the wire; a real API joins it and the mock does not,
     so the roster is read once and mapped here - derivable, never invented. */
  const team = useAsync<TeamUser[]>((signal) => listTeamUsers(signal), {
    deps: [],
    cacheKey: 'session.teamUsers',
  })

  const rows = dashboards.data?.items ?? []
  const now = useNowIso()
  /* Passed to `resolveWindow`, never read from an ambient clock: the `Range`
     column prints the days a preset means, and a preset resolved against the
     host clock in one place and the fixed clock in another is two answers. */
  const today = now ? localDayOf(now) : EYVAR_TODAY

  const columns: Array<DataColumn<Dashboard>> = [
    {
      id: 'name',
      header: t('rb.dashboards.col.name'),
      alwaysVisible: true,
      minWidth: 300,
      sortField: 'name',
      dataType: 'text',
      cell: (row) => (
        /* §E6/§E7 — Amplitude's content list leads with a thumbnail, and this
           is that slot, filled with the one preview this product can produce
           honestly. See `LayoutPreview`. Layout on the box, isolation on the
           run (AC-898); the preview sits OUTSIDE the isolated run, because a
           `<bdi>` resolves its direction from its first strong character and a
           graphic inside one can push the name to the wrong edge. */
        <span className="flex min-w-0 items-center gap-2">
          <LayoutPreview tiles={row.tiles} />
          <span {...isolatedRunProps({ className: 'min-w-0 truncate' }).box}>
            <bdi {...isolatedRunProps().run}>{row.name}</bdi>
          </span>
        </span>
      ),
      /* What the board is FOR, on the second line - the same treatment the
         report library gives a saved report's description. `null` renders
         nothing rather than a blank line, so an unwritten description costs the
         row no height. */
      secondaryLine: (row) =>
        row.description === null ? null : (
          <span {...isolatedRunProps({ className: 'min-w-0 truncate' }).box}>
            <bdi {...isolatedRunProps().run}>{row.description}</bdi>
          </span>
        ),
    },
    {
      id: 'owner',
      header: t('rb.dashboards.col.owner'),
      width: 160,
      dataType: 'text',
      /* On a shared install "whose board is this?" was unanswerable from the
         list. The id is the fallback while the roster is still loading - a
         truthful identifier beats a blank cell, which reads as no owner. */
      cell: (row) => (
        <span {...isolatedRunProps({ className: 'min-w-0 truncate' }).box}>
          <bdi {...isolatedRunProps().run}>
            {team.data?.find((user) => user.id === row.ownerId)?.name ?? row.ownerId}
          </bdi>
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
      /* **§C4's board range, in the list.** A board that imposes a window and
         a board that lets every report keep its own answer two different
         questions, and until now the list could not tell them apart — which is
         the same reading failure the tile's period sub-line closed one level
         down. Both states are on the record; neither is invented. */
      id: 'range',
      header: t('rb.dashboards.col.range'),
      width: 170,
      dataType: 'text',
      cell: (row) => {
        if (row.range === null) {
          /* R8/rule 10 — an absence is stated in words, never left blank. */
          return <span className="text-muted-foreground">{t('rb.dashboard.range.own')}</span>
        }
        if (row.range.kind === 'preset') return <span>{t(`rb.preset.${row.range.preset}`)}</span>
        const resolved = resolveWindow(row.range, today)
        /* `<bdi>` and `tabular-nums`: `13 Aug – 11 Sep` opens with a digit,
           which the UBA throws to the far end of an Arabic line. */
        return (
          <bdi className="tabular-nums">
            {t('rb.control.window.range', {
              from: formatDate(resolved.from, { style: 'day-month', language }),
              to: formatDate(resolved.to, { style: 'day-month', language }),
            })}
          </bdi>
        )
      },
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

  /**
   * §B4's `Copy`, and it needs no endpoint that does not exist.
   *
   * A board is a name, a description, an ordered list of report ids and a
   * scope — so a duplicate is one `saveDashboard` with `id: null` and the same
   * four fields. **The reports are not copied**, which is the whole point of a
   * tile being a reference: the copy shows the same current definitions, and
   * editing one report still updates every board that holds it (AC-867).
   *
   * Tile ids are regenerated rather than carried. They are unique within a
   * board and every operation over them is scoped to one, so carrying them
   * would work — and two boards sharing `TIL-1` is the kind of thing that reads
   * as a bug to the next person to look at it.
   */
  const duplicate = async (row: Dashboard) => {
    try {
      const outcome = await saveDashboard({
        id: null,
        name: t('rb.dashboards.duplicate.name', { name: row.name }),
        description: row.description,
        tiles: row.tiles.map((tile, index) => ({
          ...tile,
          tileId: `TIL-copy-${index + 1}-${tile.reportId}`,
        })),
        range: row.range,
        filters: row.filters,
      })
      if (outcome.status === 'invalid') {
        /* The one reason a copy can be refused: §4.2 caps a name at 80 and
           `{name} (copy)` is six characters longer than what it copies. Stated
           where the action was taken rather than swallowed. */
        toast.error(t('rb.dashboards.duplicate.failed', { name: row.name }))
        return
      }
      toast.success(t('rb.dashboards.created.toast', { name: outcome.dashboard.name }))
      dashboards.refetch()
    } catch {
      toast.error(t('rb.dashboards.duplicate.failed', { name: row.name }))
    }
  }

  const rowActions: Array<RowAction<Dashboard>> = [
    /* **P0-2 — the declared row-click target.** `Delete` is the other
       action on this table and must stay unreachable from a row click. */
    { label: t('rb.dashboards.open'), onSelect: onOpen, rowClick: true },
    { label: t('rb.dashboards.duplicate'), onSelect: (row) => void duplicate(row) },
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
      /* R9 - <object> <past-participle>, echoing the name the operator read in
         the confirmation. The row is gone from the table by the time this is
         read, which is exactly what a toast is for (R10). */
      toast.success(t('rb.dashboards.deleted.toast', { name: pending.dashboard.name }))
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
          toast.success(t('rb.dashboards.created.toast', { name: dashboard.name }))
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
 * **§E6/§E7's thumbnail — the board's LAYOUT, never its numbers.**
 *
 * Amplitude's content list leads every row with a preview of the dashboard, and
 * a list of names with a count beside them is the thinnest surface in this
 * module. The obvious port is a miniature of the charts, and it is the one
 * thing this cannot be: painting it means running every report on every row of
 * every page — nine `reports.run` calls to draw one 40px graphic — and a
 * *stale* or *sampled* miniature is a picture of numbers that are not the
 * numbers, which is the defect this module refuses everywhere else.
 *
 * What is real, on the record, and free is **the arrangement**: how many tiles
 * the board holds and how wide each one is. That is what this draws — the same
 * hero-over-grid shape the board itself lays out, at 1/20 scale — so two boards
 * are told apart at a glance by their shape and by their size, and nothing on
 * screen claims to be data.
 *
 * `aria-hidden`, because the count it depicts is already the `Reports` column
 * and a second reading of one number is a second thing that can disagree with
 * the first. Every fill is a token. It does not mirror (§9.5): it is an object,
 * and there is no reading direction in a grid of rectangles.
 */
function LayoutPreview({ tiles }: { tiles: readonly DashboardTile[] }) {
  const CELL = 9
  const GAP = 2
  const COLUMNS = 2
  /* Nine is what fits at this size; past it the shapes stop being
     distinguishable and start being texture. The board's own order is the
     order drawn, so the hero is where the hero is. */
  const CAP = 9
  const ordered = [...tiles].sort((a, b) => a.order - b.order).slice(0, CAP)

  const boxes: Array<{ x: number; y: number; w: number }> = []
  let column = 0
  let rowIndex = 0
  for (const tile of ordered) {
    const full = tileSpan(tile) === 'full'
    /* A full tile takes a whole row, so a half tile left dangling beside it
       moves down — the same reflow CSS grid does with `col-span-2`. */
    if (full && column === 1) {
      column = 0
      rowIndex += 1
    }
    boxes.push({
      x: column * (CELL + GAP),
      y: rowIndex * (CELL + GAP),
      w: full ? COLUMNS * CELL + GAP : CELL,
    })
    if (full) {
      column = 0
      rowIndex += 1
    } else if (column === COLUMNS - 1) {
      column = 0
      rowIndex += 1
    } else {
      column += 1
    }
  }

  const width = COLUMNS * CELL + GAP
  const rows = Math.max(1, column === 0 ? rowIndex : rowIndex + 1)
  const height = rows * CELL + (rows - 1) * GAP

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 ${width} ${Math.max(height, CELL)}`}
      className="size-7 shrink-0"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* A board with no tiles is a valid record (AC-865) and it gets the frame
          it will fill, not a blank cell: the empty outline says *a board,
          empty* where nothing at all says *a bug*. */}
      {boxes.length === 0 ? (
        <rect
          x="0.5"
          y="0.5"
          width={width - 1}
          height={CELL - 1}
          rx="1.5"
          fill="none"
          className="stroke-border"
        />
      ) : (
        boxes.map((box, index) => (
          <rect
            key={index}
            x={box.x}
            y={box.y}
            width={box.w}
            height={CELL}
            rx="1.5"
            className="fill-muted-foreground"
          />
        ))
      )}
    </svg>
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
  const [description, setDescription] = useState('')
  const [reasons, setReasons] = useState<string[]>([])
  const [failed, setFailed] = useState(false)

  const submit = async () => {
    setFailed(false)
    try {
      const outcome = await saveDashboard({ id: null, name, description, tiles: [] })
      if (outcome.status === 'invalid') {
        /* A RETURNED outcome, not a throw: a failed save never closes the
           dialog it came from and the operator's input is preserved (AC-859). */
        setReasons(outcome.reasons)
        return
      }
      setReasons([])
      setName('')
      setDescription('')
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

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rb-dashboard-name">{t('rb.dashboards.new.name')}</Label>
            <Input
              id="rb-dashboard-name"
              maxLength={REPORT_NAME_MAX}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          {/* The same field a saved report carries. Optional, and the
              placeholder says who the answer is for rather than restating the
              label. */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rb-dashboard-description">
              {t('rb.dashboards.new.description')}
            </Label>
            <Textarea
              id="rb-dashboard-description"
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
