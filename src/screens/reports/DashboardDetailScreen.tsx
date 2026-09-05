/**
 * One dashboard — `/management/reports/dashboards/:dashboardId`.
 *
 * ```
 *  ← Growth review                              ⋯ More   [Add content]
 *    Owned by Sam · Updated 25 Jun 09:14
 *    What the ops leads read on Monday morning        ← §C4's description
 *  ┌────────────────────┐ ┌────────────────────┐
 *  │ ⠿ New subs by plan │ │ ⠿ Promo ROI     ⤢▲▼│
 *  │   Last 30 days     │ │   (gone)  [Remove] │  ← §11.3's MISSING tile
 *  │  ▁▂▃▅▇             │ │                    │
 *  └────────────────────┘ └────────────────────┘
 * ```
 *
 * ## §C4, and the four Amplitude controls that are not here
 *
 * Amplitude's saved-dashboard header is a breadcrumb, a title, a description
 * placeholder, then `☆` · `More ⌄` · `Subscribe` · `⊕ Add Content ⌄` · `Share`,
 * with `Owned by … • 0 Views` beneath. What is real here is the back link, the
 * title, the meta, the **description**, the overflow and `Add content`.
 *
 *   `Subscribe`  there is no scheduler. §D1's modal composes a delivery
 *                schedule as a sentence of dropdowns, and every one of those
 *                dropdowns writes to a job runner this product does not have.
 *   `Share`      there is no ACL model. `Dashboard` has an `ownerId` and no
 *                grants, so a share dialog could collect names and grant
 *                nothing.
 *   `0 Views`    there is no telemetry store. Inventing a count into a fixture
 *                is exactly what AC-453 forbids, and `dashboards.test.tsx`
 *                asserts the string never appears.
 *   `☆ Favourite` there is no per-user pin store either. It is the cheapest of
 *                the four to add and the one this file would take first.
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
 *   R3          one primary — `Add content`, and it is the only one on the
 *               page. §C4's row has two blue controls; this one has one.
 *   §C1         the empty board is an illustration, one sentence and one
 *               primary. **No template gallery** — see the `EmptyState` call.
 *   §9.1        the tile grid is a logical grid; nothing is placed by a side.
 */

import { Suspense, lazy, useCallback, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  FilterIcon,
  LibraryIcon,
  NewReportIcon,
  forwardIcon,
} from '@/components/icons'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
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
  REPORT_QUERY_PARAM,
  deleteDashboard,
  getDashboard,
  listDimensions,
  listMeasures,
  listReports,
  listTeamUsers,
  localDayOf,
  moveTile,
  moveTileTo,
  resolveWindow,
  saveDashboard,
} from '@/data/clients'
/* Deep imports, for the reason `DashboardTile` states: these are the definition
   of what §C4's board controls mean, they live beside the record that stores
   them, and `clients/index.ts` belongs to another owner. */
import { boardFilterFields, type BoardScope } from '@/data/clients/dashboards'
import { REPORT_PRESETS } from '@/data/clients/reports'
import {
  REPORT_NAME_MAX,
  type Dashboard,
  type DashboardTile as Tile,
  type Dimension,
  type FilterSpec,
  type ReportWindow,
  type SavedReport,
  type TeamUser,
} from '@/data/types'
import { tileSpan } from '@/data/types/report'
import { directionFor, formatDate, isolatedRunProps, type Language, type Translator } from '@/lib'
import { cn } from '@/lib/utils'
import { withFallback } from '../operations/localCopy'
import { REPORTS_EN } from './copy'

/* `react-day-picker` + `date-fns` is 20.5 KB gzip and a board that never opens
   the range popover never downloads a calendar — the same boundary
   `WindowControl` and `BoardPeriodControl` both draw, for the same reason. */
const Calendar = lazy(() =>
  import('@/components/ui/calendar').then((m) => ({ default: m.Calendar })),
)

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
      /* §C4's board scope. **Omitted means *not part of this write*** — see
         `SaveDashboardInput`, where the asymmetry with `description` is argued:
         `range: null` is the live value "every tile answers with its own
         window", so `null` cannot double as "unchanged" and `undefined` is free
         to. A reorder therefore does not have to know a board range exists. */
      scope?: Partial<BoardScope>,
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
          ...(scope && 'range' in scope ? { range: scope.range ?? null } : {}),
          ...(scope?.filters ? { filters: [...scope.filters] } : {}),
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

  /* §C4 — what this board imposes on every tile. Rebuilt each render from the
     record, which is why `DashboardTile` keys its cache on a STRUCTURAL
     serialisation of it rather than on its identity. */
  const scope: BoardScope = useMemo(
    () => ({ range: row?.range ?? null, filters: row?.filters ?? [] }),
    [row?.range, row?.filters],
  )
  /* The board filter control's vocabulary. Derived from the catalogue, because
     a board does not resolve its tiles (AC-872) and therefore cannot know which
     fields *these* reports accept without nine extra reads. `applyBoardScope`
     decides per tile and the tile says so when it cannot take one. */
  const filterFields = useMemo(
    () => boardFilterFields(catalogue.data?.measures ?? [], catalogue.data?.dimensions ?? []),
    [catalogue.data],
  )

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
      {/* **§C4's description line, and it lives here rather than in the header
          for a stated reason.** `PageHeader.meta` is documented as *"a metadata
          line, never a description"* — it carries what is DERIVED from the data
          on screen, which is why `Owned by … · Updated …` is up there and this
          is not. §8 has no description slot and `PageHeader` is not this file's
          to change, so the sentence sits at the top of the content block, which
          is where Amplitude puts it too: under the title, above the tiles.

          An unwritten description renders a **button**, not grey prose. It is
          the commonest state of a board somebody else made and the one that
          costs the next reader the most, and the rename dialog is already the
          place both fields are written (DESIGN.md:2779 refuses an inline editor
          that commits on blur, which is what Amplitude's is). */}
      {row !== null &&
        (row.description ? (
          <p className="max-w-192 pb-3 text-sm text-muted-foreground">
            {/* User content: never translated, and it carries its own direction
                inside an English UI (§9.2, AC-898). */}
            <span {...isolatedRunProps({ className: 'min-w-0' }).box}>
              <bdi {...isolatedRunProps().run}>{row.description}</bdi>
            </span>
          </p>
        ) : (
          <div className="pb-3">
            <Button
              type="button"
              variant="link"
              className="h-auto px-0 text-sm font-normal text-muted-foreground"
              onClick={() => setRenaming(true)}
            >
              {t('rb.dashboard.description.add')}
            </Button>
          </div>
        ))}

      {saveFailed && (
        /* A standing condition of this record, beside it — not a toast, which
           R10 reserves for a transient confirmation. */
        <p role="alert" className="pb-3 text-sm text-muted-foreground">
          {t('rb.dashboard.save.failed')}
        </p>
      )}

      {/* **§C4's board toolbar — the single biggest functional gap this closes.**
          Amplitude's dashboards carry their own period control and every tile
          answers to it; without one this board was nine unrelated windows, and
          two tiles side by side could be a week and a year with nothing saying
          so. `Add Filter` is the same row's second control, in the EXISTING
          `FilterSpec` vocabulary (AC-814) — there is no second filter model.

          It sits above the grid rather than in `PageHeader`, and that is the
          product's own established shape: §A7 puts the lens between the query
          and the answer, `ChartToolbar` is the builder's version of this row,
          and `PageHeader`'s four slots are back / meta / readings / actions,
          none of which is a control strip. It is also not this file's component
          to change.

          Rendered only where there is a board and at least one tile: a toolbar
          over an empty board would be four controls governing nothing, and R8's
          first-run empty is one heading, one line and one action. */}
      {row !== null && tiles.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pb-3">
          <BoardRangeControl
            range={row.range}
            today={today}
            onChange={(next) => {
              void writeTiles(
                row,
                row.tiles,
                {
                  key:
                    next === null
                      ? 'rb.dashboard.range.cleared.toast'
                      : 'rb.dashboard.range.saved.toast',
                },
                { range: next },
              )
            }}
            t={t}
            language={language}
          />

          <BoardFilterControl
            fields={filterFields}
            dimensions={catalogue.data?.dimensions ?? []}
            onAdd={(filter) =>
              void writeTiles(
                row,
                row.tiles,
                {
                  key: 'rb.dashboard.filter.added.toast',
                  params: { field: fieldLabel(filter.field, catalogue.data?.dimensions ?? [], t) },
                },
                {
                  /* Replaces any filter this board already had on the same
                     field: two `eq` filters on one field is the empty set, and
                     an operator who typed one value did not ask for both. */
                  filters: [
                    ...scope.filters.filter((existing) => existing.field !== filter.field),
                    filter,
                  ],
                },
              )
            }
            t={t}
          />

          {scope.filters.length > 0 && (
            <ul className="flex list-none flex-wrap items-center gap-1">
              {scope.filters.map((filter) => (
                <li key={filter.field}>
                  <Button
                    type="button"
                    size="xs"
                    variant="secondary"
                    onClick={() =>
                      void writeTiles(
                        row,
                        row.tiles,
                        {
                          key: 'rb.dashboard.filter.removed.toast',
                          params: {
                            field: fieldLabel(filter.field, catalogue.data?.dimensions ?? [], t),
                          },
                        },
                        {
                          filters: scope.filters.filter(
                            (candidate) => candidate.field !== filter.field,
                          ),
                        },
                      )
                    }
                  >
                    {/* **SC 2.5.3, Label in Name** — the visible text comes
                        first and whole in the accessible name, so a voice
                        operator can say what they can see. `QueryPanel`'s
                        chip carries the identical treatment for the identical
                        reason; the wording differs only in naming the board. */}
                    <bdi>
                      {t('rb.dashboard.filters.chip', {
                        field: fieldLabel(filter.field, catalogue.data?.dimensions ?? [], t),
                        value: String(filter.value),
                      })}
                    </bdi>
                    <span className="sr-only">
                      {t('rb.dashboard.filters.remove', {
                        field: fieldLabel(filter.field, catalogue.data?.dimensions ?? [], t),
                      })}
                    </span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
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
          /* §C1 / §1.5 — a LINE ILLUSTRATION, and a board-shaped one. The
             default art is a stack of records, which is right for a list and
             says nothing about what a dashboard is. **No template gallery
             beneath it**: Amplitude's four cards (`User Activity`, `Product
             KPIs`, `Funnel Analysis`, `Feature Adoption`) are business content
             nobody here has supplied, and porting the names would put four
             invented reports in front of an operator. */
          illustration={<BoardIllustration />}
          actions={[{ label: t('rb.dashboard.empty.action'), onClick: () => setAdding(true), primary: true }]}
        />
      ) : (
        /* Two across, the same grid the builder's small multiples use, so a
           tile and a panel are the same size wherever they are read. Static
           class strings: a computed column count is a class Tailwind's scanner
           never sees and therefore never emits.

           **`gap-2`, not `gap-3` (§C5).** Amplitude's board is tighter than
           this one was, and the gutter is the half of that which costs the
           panels nothing: 8px between tiles gives each tile 4px MORE at
           `wide:`, so nothing inside moves closer to R4-1's 268px floor. See
           `DashboardTile`'s own note for the measured figures. */
        <ul role="list" className="grid list-none grid-cols-1 gap-2 wide:grid-cols-2">
          {tiles.map((tile, index) => (
            <li
              key={tile.tileId}
              /* **§C5's different-sized tiles, and the whole of "a real grid
                 rather than a uniform 2-up".** A board reads as a composition
                 when the tile it is named after runs across the top and the
                 rest sit under it; a uniform 2-up reads as a contact sheet.

                 `wide:col-span-2` and nothing else: below the breakpoint the
                 grid is one column, so every tile is already full width and
                 `span` is inert rather than wrong. Both class strings are
                 static — a computed column count is a class Tailwind's scanner
                 never sees and therefore never emits. */
              className={cn('min-w-0', tileSpan(tile) === 'full' && 'wide:col-span-2')}
            >
              <DashboardTile
                tile={tile}
                measures={catalogue.data?.measures ?? []}
                dimensions={catalogue.data?.dimensions ?? []}
                today={today}
                scope={scope}
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
                /* §C5's tile size, saved with the same one-write path the
                   reorder uses. A layout is part of the record, not a
                   preference in a browser. */
                onSetSpan={(tileId, next) =>
                  void writeTiles(
                    row,
                    tiles.map((candidate) =>
                      candidate.tileId === tileId ? { ...candidate, span: next } : candidate,
                    ),
                    { key: 'rb.dashboard.tile.span.toast' },
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

      <AddContentDialog
        open={adding}
        onOpenChange={setAdding}
        pinned={tiles.map((tile) => tile.reportId)}
        /* §C2's `New chart`, in this product's vocabulary. `?q=` with nothing
           after it is what `ReportsScreen` already reads as *the builder on the
           unstarted question* — the same URL `New report` uses from the
           library, so there is one way to start a report and not two. */
        onNewReport={() => {
          setAdding(false)
          navigate(`/management/reports?${REPORT_QUERY_PARAM}=`)
        }}
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

/* ─────────────────── §C4 — the board's own two controls ─────────────────── */

/** `2026-09-03` → LOCAL midnight, which is the day the calendar paints. */
function toLocalDate(day: string): Date | undefined {
  if (day === '') return undefined
  const [year = 0, month = 1, date = 1] = day.split('-').map(Number)
  return new Date(year, month - 1, date)
}

function toIsoDay(date: Date | undefined): string | null {
  if (!date) return null
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** A filter field's operator-facing name; the key falls back to itself. */
function fieldLabel(field: string, dimensions: readonly Dimension[], t: Translator): string {
  const dimension = dimensions.find((candidate) => candidate.key === field)
  return dimension ? t(dimension.labelKey) : field
}

/**
 * **§C4's board range — the window every tile answers at.**
 *
 * ## Why this is not `WindowControl`
 *
 * `WindowControl` is the builder's range control and it is the right shape: the
 * nine presets, explicit start/end inputs, two visible months and an explicit
 * `Apply` — §3.7's four MUSTs, in one place so they can stop being true in one
 * place. This borrows all four wholesale.
 *
 * What it cannot express is the value this control exists for. A board's range
 * is `ReportWindow | null`, and **`null` is not "unset"** — it is the live,
 * commonest and default answer *"every tile answers with the window its report
 * was saved with"*. `WindowControl` takes a `ReportQuery` and always renders
 * one of its nine presets or a pinned range, so a board with no override would
 * have shown `Last 30 days` on a trigger while three tiles rendered three
 * different windows underneath it. That is the exact class of caption this
 * module refuses everywhere else.
 *
 * So the popover is the same anatomy plus one row at the top, and the trigger
 * NAMES the open state instead of faking a range for it. The alternative —
 * generalising `WindowControl` over a nullable window — would put a board
 * concept into the builder's rail, and that file is not this one's to change.
 *
 * Rules applied
 *   §3.7      presets + explicit inputs + two visible months + explicit Apply.
 *   §10.2     `Apply` governs the CUSTOM range and is disabled until it changes;
 *             a preset is already an explicit and complete choice and commits.
 *   §3.2      validate by disabling the primary — an inverted or half-typed
 *             range never becomes a board range.
 *   §5.4      `Cancel`, `Escape` and a click outside all abandon the draft.
 *   §9.1/§9.5 logical spacing; the from→to arrow is a reading-order mark and
 *             mirrors, the calendar glyph is an object and does not.
 */
function BoardRangeControl({
  range,
  today,
  onChange,
  t,
  language,
}: {
  range: ReportWindow | null
  today: string
  onChange: (range: ReportWindow | null) => void
  t: Translator
  language: Language
}) {
  const FromToArrow = forwardIcon(directionFor(language))
  const [open, setOpen] = useState(false)
  /* What the custom fields start from. With no override there is no board
     window to seed from, so the draft starts at the widest preset the nine
     offer that is not a single day — the operator is about to pin a range, and
     an empty pair of date fields is a form with nothing to `Apply`. */
  const seed = resolveWindow(range ?? { kind: 'preset', preset: 'last-30d' }, today)
  const [draft, setDraft] = useState({ from: seed.from, to: seed.to })
  const [seededFor, setSeededFor] = useState('')
  /* Re-seeded whenever the LIVE range changes, including from outside this
     popover — derived during render rather than in an effect, which would paint
     the previous range for one frame. */
  const seedKey = `${seed.from}:${seed.to}`
  if (seededFor !== seedKey) {
    setSeededFor(seedKey)
    setDraft({ from: seed.from, to: seed.to })
  }

  function abandon() {
    setDraft({ from: seed.from, to: seed.to })
    setOpen(false)
  }

  const unchanged = range?.kind === 'absolute' && draft.from === range.from && draft.to === range.to
  const illegal = draft.from === '' || draft.to === '' || draft.from > draft.to

  /* Two facts on the trigger, exactly as `WindowControl` argues for: WHICH
     window was asked for, and WHICH DAYS that is. With no override the second
     fact does not exist — there is no board window and printing one would be
     the lie this control was built to avoid — so the hint takes its place. */
  const headline =
    range === null
      ? t('rb.dashboard.range.own')
      : range.kind === 'preset'
        ? t(`rb.preset.${range.preset}`)
        : t('rb.dashboard.range.custom')

  return (
    <Popover open={open} onOpenChange={(next) => (next ? setOpen(true) : abandon())}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          aria-label={t('rb.dashboard.range')}
          className="h-auto justify-between gap-2 py-1.5"
        >
          {/* A calendar is an OBJECT, not a reading-order mark, so it does not
              mirror (§9.5). It inherits `currentColor` through the button. */}
          <CalendarIcon aria-hidden="true" className="size-4 shrink-0" />
          <span className="flex flex-col items-start gap-0.5">
            <span>{headline}</span>
            {range !== null && (
              /* `<bdi>`: `13 Aug – 11 Sep` opens with a digit, which the UBA
                 throws to the far end of an Arabic line without an isolate. */
              <bdi className="text-2xs font-normal tabular-nums text-muted-foreground">
                {t('rb.control.window.range', {
                  from: formatDate(resolveWindow(range, today).from, {
                    style: 'day-month',
                    language,
                  }),
                  to: formatDate(resolveWindow(range, today).to, {
                    style: 'day-month',
                    language,
                  }),
                })}
              </bdi>
            )}
          </span>
          <ChevronDownIcon aria-hidden="true" className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="flex w-auto flex-col gap-3 p-3">
        <div className="flex flex-wrap gap-3">
          <div className="flex min-w-48 flex-col gap-1">
            {/* **The open state, first and named.** Not a `Clear` at the
                bottom: it is one of the choices, it is the default, and R8's
                rule that an absence is stated in words rather than left blank
                applies to a control's value as much as to a cell. The
                consequence sits under it (principle 6). */}
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="w-full justify-start gap-2 font-normal"
              aria-pressed={range === null}
              onClick={() => {
                onChange(null)
                setOpen(false)
              }}
            >
              <CheckIcon
                aria-hidden="true"
                className={range === null ? 'text-muted-foreground' : 'invisible'}
              />
              {t('rb.dashboard.range.own')}
            </Button>
            <p className="ps-7 pb-1 text-2xs text-muted-foreground">
              {t('rb.dashboard.range.own.hint')}
            </p>

            <Separator />

            <ul className="flex list-none flex-col">
              {REPORT_PRESETS.map((preset) => {
                const active = range?.kind === 'preset' && range.preset === preset
                return (
                  <li key={preset}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="w-full justify-start gap-2 font-normal"
                      aria-pressed={active}
                      onClick={() => {
                        onChange({ kind: 'preset', preset })
                        setOpen(false)
                      }}
                    >
                      {/* The check keeps its slot whether or not it is drawn, so
                          choosing a window does not shift the other labels
                          sideways under the pointer. */}
                      <CheckIcon
                        aria-hidden="true"
                        className={active ? 'text-muted-foreground' : 'invisible'}
                      />
                      {t(`rb.preset.${preset}`)}
                    </Button>
                  </li>
                )
              })}
            </ul>
          </div>

          <Separator orientation="vertical" className="h-auto" />

          <div
            role="group"
            aria-label={t('rb.dashboard.range.custom')}
            className="flex flex-col gap-3"
          >
            <div className="flex items-end gap-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rb-board-range-from" className="text-xs text-muted-foreground">
                  {t('rb.dashboard.range.from')}
                </Label>
                <Input
                  id="rb-board-range-from"
                  type="date"
                  className="w-36 tabular-nums"
                  value={draft.from}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, from: event.target.value }))
                  }
                />
              </div>
              {/* A reading-order mark between two fields whose order mirrors,
                  so it is PICKED BY `dir` (§9.5, O10). */}
              <FromToArrow
                aria-hidden="true"
                className="mb-2 size-4 shrink-0 text-muted-foreground"
              />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rb-board-range-to" className="text-xs text-muted-foreground">
                  {t('rb.dashboard.range.to')}
                </Label>
                <Input
                  id="rb-board-range-to"
                  type="date"
                  className="w-36 tabular-nums"
                  value={draft.to}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, to: event.target.value }))
                  }
                />
              </div>
            </div>

            <Suspense
              fallback={
                /* The grid's own footprint, so the popover does not resize under
                   the pointer when the chunk lands. */
                <div className="h-62 w-full" aria-hidden="true" />
              }
            >
              <Calendar
                mode="range"
                numberOfMonths={2}
                defaultMonth={toLocalDate(draft.from)}
                selected={{ from: toLocalDate(draft.from), to: toLocalDate(draft.to) }}
                onSelect={(picked) =>
                  setDraft((current) => ({
                    from: toIsoDay(picked?.from) ?? current.from,
                    /* A range mid-drag has a `from` and no `to`. Collapsing to
                       the start keeps the draft a valid window at every click. */
                    to: toIsoDay(picked?.to) ?? toIsoDay(picked?.from) ?? current.to,
                  }))
                }
              />
            </Suspense>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="xs" onClick={abandon}>
            {t('rb.dashboard.range.cancel')}
          </Button>
          <Button
            type="button"
            size="xs"
            disabled={unchanged || illegal}
            onClick={() => {
              onChange({ kind: 'absolute', from: draft.from, to: draft.to })
              setOpen(false)
            }}
          >
            {t('rb.dashboard.range.apply')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

/**
 * **§C4's `Add Filter`, in the vocabulary the product already has.**
 *
 * The emitted object is a `FilterSpec { field, op, value }` — byte-identical in
 * shape to one an index table emits and one `ReportQuery.filters` carries.
 * **There is no second filter model** (AC-814), and `columnFilter.ts` is
 * explicit that there must never be one. The control is deliberately the same
 * shape `QueryPanel.Filters` renders for the same vocabulary: a field `Select`,
 * a typed value, an equality match. The catalogue still declares no control
 * KIND per field, so guessing one from a field name would be inventing a
 * catalogue property in a component — the same refusal, recorded in the same
 * words, in both places.
 *
 * The consequence is stated under the control rather than in a help doc
 * (principle 6): which tiles this narrows is decided per tile, and any tile
 * that cannot take it says so on itself.
 */
function BoardFilterControl({
  fields,
  dimensions,
  onAdd,
  t,
}: {
  fields: readonly string[]
  dimensions: readonly Dimension[]
  onAdd: (filter: FilterSpec) => void
  t: Translator
}) {
  const [open, setOpen] = useState(false)
  const [field, setField] = useState('')
  const [value, setValue] = useState('')

  const submit = () => {
    if (field === '' || value.trim() === '') return
    onAdd({ field, op: 'eq', value: value.trim() })
    setField('')
    setValue('')
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        /* A draft abandoned is a draft discarded — the next `Add filter` starts
           empty rather than in the middle of the last one (§5.4). */
        if (!next) {
          setField('')
          setValue('')
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button type="button" variant="secondary" className="gap-2">
          <FilterIcon aria-hidden="true" className="size-4 shrink-0" />
          {t('rb.dashboard.filters.add')}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="flex w-72 flex-col gap-3 p-3">
        {fields.length === 0 ? (
          /* R8's second kind and §11.6's one grey sentence: the catalogue
             declares no filterable field at all. Not a disabled trigger — an
             operator who cannot open the control cannot learn why. */
          <p className="text-sm text-muted-foreground">{t('rb.dashboard.filters.empty')}</p>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rb-board-filter-field">{t('rb.dashboard.filters.field')}</Label>
              <Select value={field} onValueChange={setField}>
                <SelectTrigger id="rb-board-filter-field" className="w-full">
                  <SelectValue placeholder={t('rb.dashboard.filters.field')} />
                </SelectTrigger>
                <SelectContent>
                  {fields.map((key) => (
                    <SelectItem key={key} value={key}>
                      {fieldLabel(key, dimensions, t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rb-board-filter-value">{t('rb.dashboard.filters.value')}</Label>
              <Input
                id="rb-board-filter-value"
                value={value}
                disabled={field === ''}
                onChange={(event) => setValue(event.target.value)}
              />
            </div>

            <p className="text-xs text-muted-foreground">{t('rb.dashboard.filters.hint')}</p>

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => {
                  setField('')
                  setValue('')
                  setOpen(false)
                }}
              >
                {t('rb.dashboard.filters.cancel')}
              </Button>
              {/* §3.2 — validate by disabling the primary, never by an error
                  after submit. */}
              <Button
                type="button"
                size="xs"
                disabled={field === '' || value.trim() === ''}
                onClick={submit}
              >
                {t('rb.dashboard.filters.apply')}
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
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
 * §C2's `Add Content ⌄`, and the two things that are actually on the other side
 * of it.
 *
 * ## A described list, in one surface, in two steps
 *
 * Amplitude's is a dropdown offering `Existing content` · `New chart` ·
 * `✨ Generate with AI` · `T Text`. Two of those four are real here:
 *
 *   `Generate with AI` — there is no model endpoint. A control that composes a
 *                        question from a sentence, wired to nothing, is a
 *                        promise the product cannot keep.
 *   `Text`             — §11 defines a dashboard as *a named ordered list of
 *                        saved report ids*. A text tile is not a report id, so
 *                        it reopens the definition, the schema and the save
 *                        endpoint. Recorded as a follow-up, not smuggled in.
 *
 * It is a **dialog rather than a dropdown menu**, and that is a constraint
 * rather than a preference: the trigger is `PageHeader.primaryAction`, which
 * takes an `onClick` and not a trigger element, and `PageHeader` belongs to
 * another owner. The shape it costs is small — §E3 shows Amplitude's own
 * `Create` menu as *a described list*, an icon with a name and a one-line
 * purpose, and that is exactly what renders here.
 *
 * ## Step two is the picker that was already here
 *
 * **The tile stores a reference, never a copy of the query** — so editing the
 * report changes every dashboard that pins it (AC-867), which is correct: a
 * report is a definition and a dashboard shows the current definition.
 *
 * A report already on this dashboard is offered **disabled with the reason**
 * rather than filtered out (§11.2): an operator looking for a report they
 * pinned last week needs to see that it is already here, not to conclude it was
 * deleted.
 *
 * `Back` returns to the chooser rather than dismissing, because the two are one
 * surface: cancelling out of step two would throw away the choice as well as
 * the step.
 */
function AddContentDialog({
  open,
  onOpenChange,
  pinned,
  onPin,
  onNewReport,
  t,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  pinned: readonly string[]
  onPin: (report: SavedReport) => void
  onNewReport: () => void
  t: Translator
}) {
  const [step, setStep] = useState<'choose' | 'existing'>('choose')
  /* Seeded on each OPEN rather than held across closes: reopening `Add content`
     after picking `Existing report` must offer the choice again, not drop the
     operator back into the list they left. */
  const [seededFor, setSeededFor] = useState(false)
  if (open !== seededFor) {
    setSeededFor(open)
    if (open) setStep('choose')
  }

  const reports = useAsync((signal) => listReports({ pageSize: 100 }, signal), {
    /* Stores the client's native `Paginated` envelope; `deps: [open]` keeps this
       key distinct from `ReportLibrary`'s, which is keyed by its table params. */
    deps: [open],
    cacheKey: 'reports.list',
    isEmpty: (page) => page.items.length === 0,
  })

  if (step === 'choose') {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('rb.dashboard.addContent.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('rb.dashboard.addContent.body')}</AlertDialogDescription>
          </AlertDialogHeader>

          {/* §E3's described list: an icon, a name, and a one-line purpose.
              Real buttons in a real list — §7.2/§7.4, nothing here is a `div`
              with an `onClick`, and each row is one tab stop carrying both
              lines as its accessible name. */}
          <ul className="flex list-none flex-col gap-1">
            <li>
              <Button
                type="button"
                variant="ghost"
                className="h-auto w-full items-start justify-start gap-2 py-2 text-start"
                onClick={() => setStep('existing')}
              >
                <LibraryIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-medium">{t('rb.dashboard.addContent.existing')}</span>
                  <span className="text-xs font-normal text-wrap text-muted-foreground">
                    {t('rb.dashboard.addContent.existing.hint')}
                  </span>
                </span>
              </Button>
            </li>
            <li>
              <Button
                type="button"
                variant="ghost"
                className="h-auto w-full items-start justify-start gap-2 py-2 text-start"
                onClick={onNewReport}
              >
                <NewReportIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-medium">{t('rb.dashboard.addContent.new')}</span>
                  <span className="text-xs font-normal text-wrap text-muted-foreground">
                    {t('rb.dashboard.addContent.new.hint')}
                  </span>
                </span>
              </Button>
            </li>
          </ul>

          <AlertDialogFooter>
            <AlertDialogCancel>{t('rb.dashboard.add.cancel')}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }

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
          {/* A step back, not a dismissal — see the header. */}
          <Button type="button" variant="ghost" onClick={() => setStep('choose')}>
            {t('rb.dashboard.addContent.back')}
          </Button>
          <AlertDialogCancel>{t('rb.dashboard.add.cancel')}</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/**
 * §C1's line illustration — **a board, not a stack of records.**
 *
 * `EmptyState`'s default art is three rows, which is right for a list and says
 * nothing about what a dashboard is. This one draws the thing the button makes:
 * a board holding one drawn tile and two resting ones. §1.5 asks an empty state
 * for an illustration rather than a scaled-up icon, and this is the difference
 * between the two — it depicts the product's own object.
 *
 * Every fill and stroke is a token, so it cannot introduce a colour. The tones
 * are `EmptyState`'s own, for the same reasons its header argues: `fill-info`
 * with `stroke-info-foreground` is the one place blue survives, as decoration
 * on its own pale ground; the resting tiles are `fill-background` with
 * `fill-muted-foreground` bars, because `--border` is 1.12 : 1 on a card and
 * would paint nothing at all.
 *
 * It does **not** mirror (§9.5): it is an object, and there is no reading
 * direction in it.
 */
function BoardIllustration() {
  return (
    <svg viewBox="0 0 144 108" className="w-full" aria-hidden="true" focusable="false">
      <rect x="0" y="0" width="144" height="108" rx="8" className="fill-muted" />
      {/* the pinned tile, drawn */}
      <rect x="10" y="12" width="60" height="42" rx="4" className="fill-info" />
      <polyline
        points="18,46 28,36 38,40 48,26 58,32 64,22"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-info-foreground"
      />
      {/* two resting tiles */}
      <rect x="76" y="12" width="58" height="42" rx="4" className="fill-background" />
      <rect x="84" y="22" width="28" height="5" rx="2.5" className="fill-muted-foreground" />
      <rect x="84" y="33" width="42" height="5" rx="2.5" className="fill-muted-foreground" />
      <rect x="10" y="60" width="124" height="38" rx="4" className="fill-background" />
      <rect x="18" y="70" width="38" height="5" rx="2.5" className="fill-muted-foreground" />
      <rect x="18" y="81" width="80" height="5" rx="2.5" className="fill-muted-foreground" />
    </svg>
  )
}
