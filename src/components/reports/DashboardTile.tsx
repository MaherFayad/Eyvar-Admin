/**
 * One dashboard tile — **a pointer to a saved report, resolved here and
 * nowhere else.**
 *
 * ```
 *  ┌───────────────────────────────────────────────────────┐
 *  │ ⠿ New subs by plan            Trend · 📈 New subs     │
 *  │   Last 30 days                ⤢  ▲  ▼  [Position 1▾] ⋯│
 *  │  ▁▂▃▅▇▅▃                                              │
 *  └───────────────────────────────────────────────────────┘
 * ```
 *
 * ## Each tile loads independently, and that is the whole design
 *
 * `dashboards.get` returns the tiles in order and **does not resolve them**.
 * That is deliberate: a dashboard that resolved its tiles server-side would
 * fail as a unit, and §11.4 requires one tile to be able to load, one to fail
 * with its own retry, one to be blocked and one to be missing — all at once,
 * with the rest rendered (**AC-872**). So each tile owns its own `reports.get`
 * and `reports.run`.
 *
 * ## A reference, never a copy
 *
 * The tile stores `reportId`. The consequence, stated plainly: **editing a
 * report changes every dashboard that pins it** (AC-867), and that is correct —
 * a report is a definition and a dashboard shows the current definition. The
 * rejected alternative copies the query into the tile, which sounds safer and
 * is worse: two editable definitions share one name, and the day they diverge
 * is the day the board silently stops matching the report it is named after.
 *
 * `pinnedName` is a **display fallback only**. It renders when, and only when,
 * `reportId` no longer resolves — so a missing tile can say what it used to be
 * (**AC-869**). It is never read for a resolvable tile, because then it would
 * be a second, stale source of truth for the title.
 *
 * **The period sub-line and the corner meta are held to that same rule.** Both
 * are read off the query that just ran, and both are absent on a tile that did
 * not resolve. A window printed from anything but the run that produced the
 * numbers underneath it is a caption that can lie.
 *
 * ## §C4 — the board has a say, and it is allowed to be refused
 *
 * A board carries its own range and its own filters, and a tile asks its saved
 * question **under them**. `applyBoardScope` is where that happens — pure, in
 * `clients/dashboards.ts`, beside the record that stores the scope — and it
 * refuses rather than distorts:
 *
 *   - a board filter on a field this report cannot legally take **is not sent**,
 *     because sending it comes back `no-shared-filter-field` and turns a healthy
 *     tile into §8.3 state 12, which is a lie about the report;
 *   - a board range that would introduce a violation this report did not
 *     already have **is not applied**, because a cohort whose horizon no longer
 *     fits is not four columns quietly becoming one.
 *
 * Both refusals come back as data, and **the tile says them out loud**: an
 * `Own range` marker on the caption plus one sentence under the header, and one
 * line per filter field it dropped. A tile that silently ignored a control the
 * operator can read two inches above it is the worst outcome available here —
 * the numbers would be right for a question nobody asked, and nothing on screen
 * would say which question that was.
 *
 * The scope also joins `useAsync`'s `deps`: the board's range decides the query
 * that runs, so a range that changed under a cache key that did not would serve
 * the previous window's numbers under the new window's label.
 *
 * ## Amplitude §C5, and the double frame it exposed
 *
 * Amplitude's board tile is: a drag handle at the top inline-start, the title,
 * a `Last 30 days` period sub-line directly beneath it, quiet meta at the top
 * inline-end naming the scope and the measure, and an expand affordance in the
 * same corner. Four of the five are new here; the fifth (the reorder controls)
 * was already present and stays present, because §11.2 rejected a drag grid on
 * keyboard-operability grounds and that ruling has not moved.
 *
 * **The grip is chrome and nothing else.** It is `aria-hidden`, it is not
 * focusable, and it carries no drag behaviour: it marks the tile as movable and
 * the buttons beside it are what move it. A handle that were the *only* way to
 * reorder would be the defect §11.2 refused.
 *
 * **`framed={false}` is the fidelity fix.** This component renders a `Card`,
 * and inside it `ResultCanvas` renders `PanelCard`, which renders another
 * `Card` — so every tile drew **two hairlines, two radii and two shadows**, one
 * nested 12px inside the other. That double frame is the single biggest reason
 * this board read looser than Amplitude's, where a tile is one surface.
 *
 * It was first neutralised from the OUTSIDE, by `TILE_FLUSH_NESTED_CARD` — a
 * structural selector on this root, four rules stripping the border, the
 * radius, the shadow and the block padding off every card nested beneath it,
 * because `PanelCard` offered no way to ask. That rule reached into another
 * component's internals and would have gone quiet the day its markup moved — a
 * flush tile is not something a test can see failing. `ResultCanvas` now takes
 * `framed` and forwards it to every surface it draws, so the tile *asks* for
 * one frame instead of overriding three, and the constant is gone.
 *
 * ## The tile draws what the REPORT draws, and it used to draw two of five
 *
 * A saved report has a mode, and the builder routes on it: `isSeriesMode`
 * picks `ResultCanvas` for a trend and a data table, and `ReportModeCanvas`
 * for the funnel cascade, the retention matrix and the journey tree. This tile
 * called `ResultCanvas` unconditionally.
 *
 * The consequence was not a missing feature; it was **the same saved report
 * telling two different stories.** `RPT-7` — *Rider retention by joining
 * month, M0 to M3* — is a cohort matrix in the builder and was, pinned to
 * `DSH-3`, a flat series table whose four rows all carried the same label.
 * Nothing on the board said the picture had been changed, and this file's own
 * AC-873 note asserted the opposite.
 *
 * The predicate is now **imported from the builder** rather than restated
 * here. A copy would agree today and drift the first time a sixth mode lands,
 * which is exactly how the first divergence happened.
 *
 * A tile is narrower than a builder canvas, and all three mode shapes survive
 * it: a cascade is a list of rungs, a matrix is five short columns, a journey
 * is an indented list. None needs the plot width R4-1 puts a floor under, so
 * there is nothing here to refuse — and a refusal is what this would owe if
 * there were, stated on the tile rather than answered with a different picture
 * of the same numbers.
 *
 * ## Four outcomes, and the defect was collapsing them into one
 *
 * `load` used to `.catch(() => null)` every `reports.get` failure and map an
 * `invalid-query` run to the same `null`. So a network blip, a 403 on a private
 * report and a query invalidated by a catalogue change all rendered *"The
 * report this tile pointed at no longer exists"* — whose only action is
 * `Remove tile`, **inviting the operator to destroy a healthy tile**. The
 * `error` branch below was unreachable.
 *
 * It now returns a discriminated `TileState` and a genuine transport error
 * **rejects**, so `useAsync`'s error branch fires with the retry it already
 * renders. The catch is narrowed to `not-found`, which is the fix
 * `ReportsScreen.tsx` names for the identical hazard on the builder.
 *
 *   **missing** — *this is gone.* 404 and only 404. The frame stays,
 *                 `pinnedName` names it, `Remove tile` beside the sentence.
 *   **invalid** — *this cannot run.* §8.3 state 12 / AC-825: the report
 *                 resolved, the query no longer validates, and the violations
 *                 say what changed. Removing the tile would not fix it.
 *   **blocked** — *you may not see this.* `PanelCard` renders it, per series,
 *                 naming the permission required.
 *   **failed**  — *this did not load.* Its own retry, and the dashboard is fine.
 *
 * The violations are rendered in `ResultCanvas`'s own `InvalidQuery` shape —
 * `role="alert"`, one line per violation, from `violation.reasonKey` — but not
 * by calling it: its sentence is *"This report can't run yet. The panel says
 * why"*, and a dashboard tile has no panel to point at. Same objects, same
 * markup, a sentence that is true where it is read.
 *
 * Rules applied
 *   §C5         the tile chrome above: handle, title, period, corner meta,
 *               expand, and the tile's own width — a two-state toggle in the
 *               overflow, because §11.2's objection to a drag reorder applies
 *               word for word to a drag resize.
 *   §C4         the board's range and filters, applied here, refused here, and
 *               named here when refused.
 *   AC-873      the same composer as a metric board: same panels, same
 *               no-data sentence, same legend rules — and, since this change,
 *               the same COMPOSER CHOICE.
 *
 *               This line used to read *"`ResultCanvas` is literally the same
 *               component the builder renders, which is what makes that claim
 *               checkable rather than aspirational"*. It was true for two of
 *               the five modes and false for three, and it is the reason the
 *               divergence above went unnoticed: a reader who checked the
 *               claim read this sentence instead of the branch. The tile now
 *               imports `isSeriesMode` from the builder, so the claim is
 *               checkable because there is ONE predicate — not because two
 *               files happen to agree.
 *   AC-871      `Move up` / `Move down` are real buttons with accessible names,
 *               and `Move to position` is a `Select` beside them — §11.2's
 *               rejection of a drag grid was about keyboard operability, so the
 *               coarse move is a form control rather than a gesture.
 *   §7.3        every one of the tile's controls is present, never hover-only —
 *               including `Remove tile`, which used to reach the UI only from
 *               the missing branch, so a healthy tile could not be removed at
 *               all. The grip and the expand are no exception.
 *   §1.5        one icon set (lucide), 16px, `currentColor`, every glyph
 *               `aria-hidden` with the label carrying the name. The overflow
 *               trigger's text `⋯` is replaced by `MoreIcon` for the
 *               same reason `ChartToolbar` gives: a text ellipsis picks up the
 *               emoji presentation on some platforms and stops being an icon.
 *   §9.1        `ms-`/`me-` only; the arrows point along an ordered LIST, which
 *               runs block-wise in both languages (§9.5), so they do not mirror.
 *               The grip sits at the header's inline-start and the expand at
 *               its inline-end **by flow**, not by a side.
 */

import { useCallback, useMemo } from 'react'
import {
  BarChartIcon,
  DragHandleIcon,
  ExpandIcon,
  LineChartIcon,
  MoreIcon,
  MoveDownIcon,
  MoveUpIcon,
  PieChartIcon,
  TableChartIcon,
} from '@/components/icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { useAsync } from '@/hooks'
import { getReport, planReportQuery, resolveWindow, runReport } from '@/data/clients'
/* Deep import, and deliberately: `applyBoardScope` is the DEFINITION of what a
   board-level control means, it lives beside the record that stores it, and
   `clients/index.ts` belongs to another owner. `WindowControl` reaches into
   `clients/reports` for `REPORT_PRESETS` on the same reasoning. */
import { applyBoardScope, type BoardScope, type ScopedTileQuery } from '@/data/clients/dashboards'
import { isApiError, reportMode } from '@/data/types'
import type {
  ChartType,
  DashboardTile as DashboardTileModel,
  Dimension,
  Measure,
  QueryViolation,
  ReportQuery,
  ReportResult,
  SavedReport,
} from '@/data/types'
import { tileSpan, type DashboardTileSpan } from '@/data/types/report'
import { formatDate, isolatedRunProps, type Language, type Translator } from '@/lib'
import { cn } from '@/lib/utils'
/* Deep imports into the screen that owns the routing, and deliberately so.
   `isSeriesMode` is the builder's decision about which canvas draws which
   mode; restating it here is what produced the divergence the header
   describes. `ReportModeCanvas` sits beside it because the three non-series
   shapes were written for that screen — it renders a `ReportResult` and
   nothing else, exactly as `ResultCanvas` does, so a tile can hand it the same
   objects. Both belong one layer down, beside `reportMode` in the data layer
   and in `components/reports` respectively; both moves are another owner's and
   are named in the handoff. */
import { isSeriesMode } from '@/screens/reports/ReportBuilder'
import { ReportModeCanvas } from '@/screens/reports/ReportModeCanvas'
import { ResultCanvas } from './ResultCanvas'

/** §C5's `📈 Uniques`, in this product's four shapes. Decorative throughout. */
const CHART_ICONS: Record<ChartType, typeof LineChartIcon> = {
  line: LineChartIcon,
  bar: BarChartIcon,
  pie: PieChartIcon,
  table: TableChartIcon,
}

export interface DashboardTileProps {
  tile: DashboardTileModel
  measures: readonly Measure[]
  dimensions: readonly Dimension[]
  today: string
  /**
   * **§C4 — what the BOARD imposes on this tile's question.**
   *
   * The tile applies it through `applyBoardScope`, which refuses rather than
   * distorts and hands back what it refused, so the two sentences below this
   * tile's title can name it. `OPEN_BOARD_SCOPE` is a board that imposes
   * nothing, which is the commonest state and the default.
   */
  scope: BoardScope
  /** 1-based, and the value the position `Select` shows. */
  position: number
  /** How many tiles the board holds — the last position `Move to` can offer. */
  total: number
  /** `false` disables the move controls at the ends of the list, in place. */
  canMoveUp: boolean
  canMoveDown: boolean
  onMove: (tileId: string, direction: -1 | 1) => void
  onMoveTo: (tileId: string, position: number) => void
  onRemove: (tileId: string) => void
  /** §C5's tile size, toggled from the tile's own overflow. */
  onSetSpan: (tileId: string, span: DashboardTileSpan) => void
  onOpen: (report: SavedReport) => void
  noDataSentence: string
  t: Translator
  language: Language
}

/**
 * The tile's three *resolved* answers. A transport failure is not one of them —
 * it rejects, and `useAsync` turns it into the error state with a retry.
 *
 * **`scoped` travels with the answer, not beside it.** It is what the tile
 * actually asked — the board's window if the report could take it, the board's
 * filters where they were legal — plus the list of overrides that were backed
 * out. Re-deriving it at render time from a query and a scope that may both
 * have moved since the run is how a caption ends up describing a different
 * question from the numbers under it.
 */
type TileState =
  | { kind: 'ok'; report: SavedReport; scoped: ScopedTileQuery; result: ReportResult }
  | { kind: 'invalid'; report: SavedReport; scoped: ScopedTileQuery; violations: QueryViolation[] }
  | { kind: 'missing' }

export function DashboardTile({
  tile,
  measures,
  dimensions,
  today,
  scope,
  position,
  total,
  canMoveUp,
  canMoveDown,
  onMove,
  onMoveTo,
  onRemove,
  onSetSpan,
  onOpen,
  noDataSentence,
  t,
  language,
}: DashboardTileProps) {
  /* A dependency array is compared shallowly, and `scope` is rebuilt by the
     parent on every render of a board whose record just refetched. A structural
     key is what makes "the board range changed" a re-run and "React rendered
     again" not one. */
  const scopeKey = useMemo(
    () => JSON.stringify({ range: scope.range, filters: scope.filters }),
    [scope],
  )

  const load = useCallback(
    async (signal: AbortSignal): Promise<TileState> => {
      let report: SavedReport
      try {
        report = (await getReport(tile.reportId, signal)).data
      } catch (thrown) {
        /* **Only a 404 is MISSING.** A dangling reference cannot be created
           through the UI — the delete is refused — but a concurrent session, a
           restore or a direct API call can still produce one. Everything else
           — a blip, a 503, a 403 on a `private` report — rethrows, because
           telling an operator a healthy report was deleted is how a healthy
           tile gets destroyed. */
        if (isApiError(thrown) && thrown.kind === 'not-found') return { kind: 'missing' }
        throw thrown
      }
      /* **§C4 applied here and nowhere else.** The board holds a range and a
         set of filters; this is where one tile's saved question is asked under
         them. A filter the report cannot legally take is not sent, a range that
         would invalidate the report is not applied, and both refusals come back
         so the tile can say so. */
      const scoped = applyBoardScope(report.query, scope, { measures, dimensions }, today)
      const outcome = await runReport(scoped.query, { today, signal })
      /* §8.3 state 12 — the report exists and its question no longer validates.
         A returned union, not a throw, and it is not a missing tile. */
      if (outcome.status === 'invalid-query') {
        return { kind: 'invalid', report, scoped, violations: outcome.violations }
      }
      return { kind: 'ok', report, scoped, result: outcome.result }
    },
    [tile.reportId, today, scope, measures, dimensions],
  )

  const tileData = useAsync<TileState>(load, {
    /**
     * **P3-13 fix: `today` was missing.**
     *
     * `load` closes over it and threads it into `runReport`, and `useCallback`
     * already listed it — but `useAsync`'s `deps` did not, so a tile that was
     * on screen across a midnight rollover kept resolving `Today` against
     * yesterday's date. The parent derives `today` from `useNowIso`, so the
     * value really does change under a long-lived board. This is a bug
     * independent of caching; it would only have become worse with one.
     *
     * `scopeKey` is the second thing the fetcher varies on: the board's range
     * and filters now decide the query that runs, so a board range that changed
     * and a cache key that did not would serve the previous window's numbers
     * under the new window's label.
     *
     * **`measures.length` is the third, and it is the catalogue's arrival.**
     * `applyBoardScope` decides which board filters are legal from
     * `QueryPlan.legalFilterFields`, which is empty while the catalogue is
     * still in flight — so a tile that ran during that window ran without the
     * board's filters and, without this, would never re-run once it landed.
     * The catalogue is fetched once and cached, so this changes at most once
     * per session; a length is enough because the catalogue only ever goes from
     * nothing to everything.
     */
    deps: [tile.reportId, today, scopeKey, measures.length],
    cacheKey: 'reports.run',
    /* `missing` and `invalid` are real answers, so neither may be folded into
       `empty`, which would render the wrong sentence. */
    isEmpty: () => false,
  })

  const measuresByKey = Object.fromEntries(measures.map((m) => [m.key, m]))
  const state = tileData.data
  /* The report's CURRENT name wherever the reference resolved — `pinnedName` is
     read in exactly one case, and this is it. */
  const resolved = state && state.kind !== 'missing' ? state.report : null
  const scoped = state && state.kind !== 'missing' ? state.scoped : null
  const span = tileSpan(tile)
  const title = resolved ? resolved.name : tile.pinnedName
  /* **The two Amplitude sub-lines, and both come off the query that RAN.**
     Not off the saved query: when the board imposes a window, the window the
     caption prints has to be the one the numbers cover, or the caption is the
     one thing on the tile that can lie. `null` on a tile that did not resolve —
     there is no window and no measure to name, and `pinnedName` is a NAME, not
     a caption for numbers that never arrived. */
  const period = scoped ? windowLabel(scoped.query, today, t, language) : null
  const Glyph = resolved ? CHART_ICONS[resolved.query.chartType] : null
  /* §C4's per-tile indication. Present only when the board asked for something
     this tile could not do — a board that imposes nothing says so once, above
     the grid, and does not repeat itself on every tile. */
  const refusals = scoped
    ? {
        range: scope.range !== null && scoped.rangeRefused,
        filterFields: scoped.refusedFilterFields,
      }
    : { range: false, filterFields: [] as string[] }
  const hasRefusal = refusals.range || refusals.filterFields.length > 0
  /* **Which canvas, decided by the builder's predicate on the query that RAN.**
     The board can change the window and the filters; it cannot change the mode,
     so `scoped.query` and the saved query agree here — reading the one that ran
     is the same discipline the caption and the coercion plan below already
     follow, and it stays correct if a board control ever does reach the mode. */
  const seriesShape = state?.kind === 'ok' ? isSeriesMode(reportMode(state.scoped.query)) : false

  return (
    /* `size="sm"` — §C5's tiles are tighter than this board's were. It moves
       `--card-spacing` from 12px to 8px for the header, the content and the
       gap between them, and it does **not** narrow the plot: the panel inside
       declares its own spacing, and `CardContent` goes flush below, so the
       arithmetic runs the other way. Measured at 1440 (English, `wide:` two
       across, off the shipped tokens): a one-panel tile gives its panel
       **514px** against **488px** before, and **466px** at the 1344 breakpoint
       where the two-across grid starts — all clear of R4-1's 268px floor.
       `dashboard.chrome.test.tsx` runs that arithmetic rather than trusting
       this comment.

       **A tile holding TWO panels used to be a different figure and below the
       floor** — 251px at 1440 and 227px at 1344, because `ResultCanvas` split a
       multi-panel run two across inside whatever width it was given. It no
       longer does: the split is a container query against the canvas's own
       width, so a tile-width canvas runs its panels in ONE column and a
       two-panel tile measures the same 514 / 466 as a one-panel tile.
       `scratch/tile-density.mjs` is the measurement. */
    <Card size="sm" className="min-w-0">
      <CardHeader>
        <CardTitle className="flex min-w-0 items-center gap-1.5">
          {/* §C5's `⠿`, at the header's inline-start **by flow**. Chrome, and
              declared as chrome: `aria-hidden`, not focusable, no drag
              behaviour. §11.2 rejected a drag grid because a reorder with no
              keyboard path is a defect, so the handle marks the tile as
              movable and the three controls in the corner are what move it. */}
          <DragHandleIcon
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground"
          />
          {state?.kind === 'ok' || state?.kind === 'invalid' ? (
            /* A resolvable tile opens its report — including one whose query no
               longer validates, because the builder is where it gets fixed. */
            <Button
              type="button"
              variant="link"
              className="min-w-0 px-0"
              onClick={() => onOpen(state.report)}
              aria-label={t('rb.dashboard.tile.open', { name: title })}
            >
              <span {...isolatedRunProps({ className: 'min-w-0 truncate' }).box}>
                <bdi {...isolatedRunProps().run}>{title}</bdi>
              </span>
            </Button>
          ) : (
            <span {...isolatedRunProps({ className: 'min-w-0 truncate' }).box}>
              <bdi {...isolatedRunProps().run}>{title}</bdi>
            </span>
          )}
        </CardTitle>

        {/* §C5's `Last 30 Days`, directly beneath the title. A `CardDescription`
            would be the obvious slot and is the wrong one: `CardHeader` turns
            on `grid-rows-[auto_auto]` for it, which would put the corner block
            beside two rows instead of spanning them. This is one grey line, at
            the description's own size, in the title's own row band.

            `<bdi>` and `tabular-nums`: `13 Aug – 11 Sep` opens with a digit,
            which the UBA throws to the far end of an Arabic line without an
            isolate. A preset name (`Last 30 days`) is a translated UI string
            and travels through the same run harmlessly. */}
        {period && (
          <span className="flex min-w-0 flex-wrap items-center gap-1.5">
            <bdi className="text-2xs tabular-nums text-muted-foreground">{period}</bdi>
            {/* §C4's per-tile indication, and it sits on the caption it
                qualifies rather than at the foot of the tile. A board that
                imposes a window it could not impose HERE must say which window
                these numbers are really over — the marker names the state and
                the sentence beneath the header says why. `neutral`, because
                this is a fact about the tile and not a warning about it (R7). */}
            {refusals.range && (
              <Badge tone="neutral">{t('rb.dashboard.tile.ownRange')}</Badge>
            )}
          </span>
        )}

        {/* AC-871 — keyboard-operable by construction. Present always, not on
            hover, and each control carries the tile's name so a screen reader
            knows which tile it is acting on.

            `CardAction`, not a bare div: the slot is what switches the header
            to a two-column grid and puts the controls BESIDE the title rather
            than under it. `justify-self-end` is logical, so the whole block
            lands in the correct corner under `dir="rtl"` with no second rule. */}
        <CardAction>
          <div className="flex flex-col items-end gap-1">
            {/* §C5's quiet corner meta. Amplitude names the project and the
                measure; this product has no project, and inventing one would be
                a fixture nobody wrote. What is real and derivable is **which
                question this is** (`reportMode`) and **what it counts** (the
                catalogue entry behind each `MeasureRef`), so those are the two
                labels. Nothing here is stored on the tile. */}
            {resolved && (
              <p className="flex min-w-0 items-center gap-1.5 text-2xs text-muted-foreground">
                <span className="truncate">{t(`rb.mode.${reportMode(resolved.query)}`)}</span>
                {Glyph && <Glyph aria-hidden="true" className="size-4 shrink-0" />}
                <span className="truncate">
                  {resolved.query.measures
                    .map((ref) => {
                      const measure = measuresByKey[ref.key]
                      return measure ? t(measure.labelKey) : ref.key
                    })
                    .join(' · ')}
                </span>
              </p>
            )}

            <div className="flex items-center gap-0.5">
              {/* §C5's `⊞`. Same destination as the title link and a different
                  accessible name, because two buttons in one tile answering to
                  `Open {name}` is an ambiguity a screen-reader user cannot
                  resolve and a test cannot address. Absent — not disabled —
                  where nothing resolved: there is no report to open. */}
              {resolved && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={t('rb.dashboard.tile.expand', { name: title })}
                  onClick={() => onOpen(resolved)}
                >
                  <ExpandIcon aria-hidden="true" className="size-4" />
                </Button>
              )}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled={!canMoveUp}
                aria-label={t('rb.dashboard.tile.moveUp', { name: title })}
                onClick={() => onMove(tile.tileId, -1)}
              >
                <MoveUpIcon aria-hidden="true" className="size-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled={!canMoveDown}
                aria-label={t('rb.dashboard.tile.moveDown', { name: title })}
                onClick={() => onMove(tile.tileId, 1)}
              >
                <MoveDownIcon aria-hidden="true" className="size-4" />
              </Button>

              {/* §11.2's coarse reorder, and the reason it is a `Select` rather
                  than a drag handle: the objection that rejected the grid was
                  keyboard operability, and a form control has that for free. One
                  save replaces five. Disabled in place on a one-tile board — a
                  control that vanishes teaches nothing about the list. */}
              <Select
                value={String(position)}
                disabled={total < 2}
                onValueChange={(next) => onMoveTo(tile.tileId, Number(next))}
              >
                <SelectTrigger
                  size="sm"
                  aria-label={t('rb.dashboard.tile.moveTo', { name: title })}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: total }, (_, index) => index + 1).map((slot) => (
                    <SelectItem key={slot} value={String(slot)}>
                      {t('rb.dashboard.tile.position', { position: slot, total })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* **The defect this closes: a healthy tile could not be removed.**
                  `onRemove` reached the UI only from the missing branch, so
                  pinning was one-way — the only way off a board was to delete the
                  report, which §11.3 refuses. No confirmation: the write is
                  recoverable, `writeTiles` states its own failure, and the report
                  itself is untouched. */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={t('rb.dashboard.tile.actions', { name: title })}
                  >
                    <MoreIcon aria-hidden="true" className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {/* **§C5's tile size, and the reason it is a menu item.**
                      Amplitude resizes a tile by dragging its corner. §11.2
                      rejected drag for the reorder on keyboard-operability
                      grounds and the same objection applies here word for word,
                      so the size is a two-state toggle in the control the tile
                      already has. The label names the state it MOVES TO, not
                      the state it is in — `Make full width` on a half tile —
                      because a menu item is an action. */}
                  <DropdownMenuItem
                    aria-label={
                      span === 'full'
                        ? t('rb.dashboard.tile.span.halfA11y', { name: title })
                        : t('rb.dashboard.tile.span.fullA11y', { name: title })
                    }
                    onSelect={() => onSetSpan(tile.tileId, span === 'full' ? 'half' : 'full')}
                  >
                    {span === 'full'
                      ? t('rb.dashboard.tile.span.half')
                      : t('rb.dashboard.tile.span.full')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    /* The label names the action; the accessible name names the
                       tile, so six `Remove tile` items stay distinguishable to a
                       screen reader without six different visible labels. */
                    aria-label={t('rb.dashboard.tile.removeA11y', { name: title })}
                    onSelect={() => onRemove(tile.tileId)}
                  >
                    {t('rb.dashboard.tile.remove')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardAction>
      </CardHeader>

      {/* **§C4 — what the board asked for and this tile could not do.**
          One line per refusal, naming the field or the control, immediately
          under the header and above the numbers it qualifies. Not a toast (R10
          reserves those for transient confirmations), not an `alert` (§7.5.2
          reserves assertive for blocking validation) — a standing condition of
          this tile, stated beside it. `status`/polite, so nine tiles do not
          interrupt each other.

          It renders only when there is something to say: a board that imposes
          nothing produces no line, which is why the default costs a board no
          vertical space at all. */}
      {hasRefusal && (
        <div role="status" className="flex flex-col gap-0.5 px-(--card-spacing)">
          {refusals.range && (
            <p className="text-xs text-muted-foreground">{t('rb.dashboard.tile.ownRange.why')}</p>
          )}
          {refusals.filterFields.map((field) => (
            <p key={field} className="text-xs text-muted-foreground">
              {/* One key, one named parameter, one line per field — never a
                  joined list, which Arabic does not punctuate as English does
                  (AC-894). */}
              {t('rb.dashboard.tile.filterRefused', { field: fieldLabel(field, dimensions, t) })}
            </p>
          ))}
        </div>
      )}

      {/* **Flush on content, padded on prose.** A resolved tile hands its whole
          width to the composer, whose own card supplies the 12px inset — two
          nested paddings is the same defect as two nested hairlines. It holds
          for BOTH composers: `ResultCanvas` takes `framed={false}` and leaves
          the inset to its panels, and `ReportModeCanvas` draws one card round
          the cascade, the matrix or the tree and insets there. The four
          sentence states keep the tile's padding, because there is nothing
          beneath them that brings its own. */}
      <CardContent className={cn('min-w-0', state?.kind === 'ok' && 'px-0')}>
        {tileData.status === 'loading' ? (
          /* Skeleton in the tile's OWN frame. Other tiles render independently. */
          <LoadingSkeleton pattern="P5" label={title} />
        ) : tileData.status === 'error' || state === null ? (
          /* Reachable at last. A transport failure is a failure to LOAD, with
             its own retry — never "this report was deleted". */
          <ErrorState
            scope="card"
            card={false}
            message={t('rb.dashboard.tile.error')}
            action={{ label: t('rb.dashboard.tile.retry'), onClick: tileData.refetch }}
          />
        ) : state.kind === 'missing' ? (
          /* §11.3's MISSING tile: the frame, `pinnedName`, one sentence, and
             `Remove tile`. Not an error, and it does not fail the dashboard. */
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <p className="text-sm text-muted-foreground">{t('rb.dashboard.tile.missing')}</p>
            <Button
              type="button"
              variant="ghost"
              aria-label={t('rb.dashboard.tile.removeA11y', { name: title })}
              onClick={() => onRemove(tile.tileId)}
            >
              {t('rb.dashboard.tile.remove')}
            </Button>
          </div>
        ) : state.kind === 'invalid' ? (
          /* AC-825 — the violations are the same objects the builder disables a
             control with, from the same pure function, so the sentence here and
             the sentence beside the greyed-out option are one string. */
          <div role="alert" className="flex flex-col items-center gap-2 py-8 text-center">
            <p className="text-sm text-muted-foreground">{t('rb.dashboard.tile.invalid')}</p>
            <ul className="flex list-none flex-col gap-0.5">
              {state.violations.map((violation) => (
                <li
                  key={`${violation.code}-${violation.field}`}
                  className="text-xs text-muted-foreground"
                >
                  {t(violation.reasonKey, violation.reasonParams)}
                </li>
              ))}
            </ul>
          </div>
        ) : !seriesShape ? (
          /* **The three shapes that are not a set of axes**, drawn by the same
             component the builder gives them. Same `ReportResult`, same four
             states, same no-data sentence — a cohort pinned to a board is the
             matrix it is in the builder, not a series table that sums four
             retention percentages into a row.

             `withMeta` is left at its default for the same reason
             `ResultCanvas` is: a tile has no `ChartToolbar` above it, so the
             freshness sentence and its refresh belong to the canvas here. */
          <ReportModeCanvas
            status="content"
            result={state.result}
            stale={false}
            violations={[]}
            measuresByKey={measuresByKey}
            onRetry={tileData.refetch}
            /* **The tile is the frame**, and it is the frame for both
               composers. Measured on `DSH-3` before this prop existed: the
               cohort tile drew two `[data-slot="card"]` boxes with a 1px
               border each, against the trend tile's one — the exact double
               frame this file's header says a tile must not have. */
            framed={false}
            noDataSentence={noDataSentence}
            t={t}
            language={language}
          />
        ) : (
          <ResultCanvas
            status="content"
            result={state.result}
            stale={false}
            violations={[]}
            measuresByKey={measuresByKey}
            /* **Planned against the query that RAN, not the one that was
                saved.** The board can change the window, and the window is one
                of the inputs to §7.3's chart-type coercion — planning the saved
                query here would caption a coerced chart as uncoerced, or the
                reverse, on exactly the tiles the board is acting on. One call,
                because the two props are two fields of one plan. */
            coercedFrom={
              planReportQuery(state.scoped.query, { measures, dimensions }, today).chartTypeCoerced
                ? state.scoped.query.chartType
                : null
            }
            effectiveChartType={
              planReportQuery(state.scoped.query, { measures, dimensions }, today)
                .effectiveChartType
            }
            onRetry={tileData.refetch}
            onRetrySeries={() => tileData.refetch()}
            /* **The tile is the frame.** One hairline, one radius, one shadow
               per tile; the panels inside render flush. See the file header. */
            framed={false}
            noDataSentence={noDataSentence}
            t={t}
            language={language}
          />
        )}
      </CardContent>
    </Card>
  )
}

/**
 * §C5's period sub-line — *"the window this tile's numbers cover"*.
 *
 * **Two facts, one line, and the same pair `WindowControl` states**: a preset
 * name says which window was *asked for*, and a date range says which days that
 * *is*. A preset here reads as the preset, because that is the sentence an
 * operator recognises at a glance on a board (`Last 30 days`); a pinned range
 * has no name, so it reads as its days.
 *
 * `resolveWindow` is the same pure function `reports.run` used to produce the
 * numbers above this caption, given the same `today`, so the two cannot drift.
 */
function windowLabel(
  query: ReportQuery,
  today: string,
  t: Translator,
  language: Language,
): string {
  if (query.window.kind === 'preset') return t(`rb.preset.${query.window.preset}`)
  const resolved = resolveWindow(query.window, today)
  return t('rb.control.window.range', {
    from: formatDate(resolved.from, { style: 'day-month', language }),
    to: formatDate(resolved.to, { style: 'day-month', language }),
  })
}

/**
 * A filter field's operator-facing name.
 *
 * **The dimension catalogue is the only place a field has one**, and the key
 * falls back to itself so a field the catalogue stopped naming reads as
 * `trip.kind` rather than as an empty sentence — the same fallback the corner
 * meta makes for a measure, for the same reason.
 */
function fieldLabel(field: string, dimensions: readonly Dimension[], t: Translator): string {
  const dimension = dimensions.find((candidate) => candidate.key === field)
  return dimension ? t(dimension.labelKey) : field
}
