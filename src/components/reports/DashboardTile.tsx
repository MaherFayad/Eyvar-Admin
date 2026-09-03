/**
 * One dashboard tile — **a pointer to a saved report, resolved here and
 * nowhere else.**
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
 *   AC-873      the same composer as a metric board: same panels, same no-data
 *               sentence, same legend rules. `ResultCanvas` is literally the
 *               same component the builder renders, which is what makes that
 *               claim checkable rather than aspirational.
 *   AC-871      `Move up` / `Move down` are real buttons with accessible names,
 *               and `Move to position` is a `Select` beside them — §11.2's
 *               rejection of a drag grid was about keyboard operability, so the
 *               coarse move is a form control rather than a gesture.
 *   §7.3        every one of the tile's controls is present, never hover-only —
 *               including `Remove tile`, which used to reach the UI only from
 *               the missing branch, so a healthy tile could not be removed at
 *               all.
 *   §9.1        `ms-`/`me-` only; the arrows point along an ordered LIST, which
 *               runs block-wise in both languages (§9.5), so they do not mirror.
 */

import { useCallback } from 'react'
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react'
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
import { getReport, planReportQuery, runReport } from '@/data/clients'
import { isApiError } from '@/data/types'
import type {
  DashboardTile as DashboardTileModel,
  Dimension,
  Measure,
  QueryViolation,
  ReportResult,
  SavedReport,
} from '@/data/types'
import { isolatedRunProps, type Language, type Translator } from '@/lib'
import { ResultCanvas } from './ResultCanvas'

export interface DashboardTileProps {
  tile: DashboardTileModel
  measures: readonly Measure[]
  dimensions: readonly Dimension[]
  today: string
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
  onOpen: (report: SavedReport) => void
  noDataSentence: string
  t: Translator
  language: Language
}

/**
 * The tile's three *resolved* answers. A transport failure is not one of them —
 * it rejects, and `useAsync` turns it into the error state with a retry.
 */
type TileState =
  | { kind: 'ok'; report: SavedReport; result: ReportResult }
  | { kind: 'invalid'; report: SavedReport; violations: QueryViolation[] }
  | { kind: 'missing' }

export function DashboardTile({
  tile,
  measures,
  dimensions,
  today,
  position,
  total,
  canMoveUp,
  canMoveDown,
  onMove,
  onMoveTo,
  onRemove,
  onOpen,
  noDataSentence,
  t,
  language,
}: DashboardTileProps) {
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
      const outcome = await runReport(report.query, { today, signal })
      /* §8.3 state 12 — the report exists and its question no longer validates.
         A returned union, not a throw, and it is not a missing tile. */
      if (outcome.status === 'invalid-query') {
        return { kind: 'invalid', report, violations: outcome.violations }
      }
      return { kind: 'ok', report, result: outcome.result }
    },
    [tile.reportId, today],
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
     * With both inputs present the key is complete. `reports.run` is the
     * operation whose output is stored — `reports.get` runs first, to turn the
     * tile's `reportId` into the definition to run.
     */
    deps: [tile.reportId, today],
    cacheKey: 'reports.run',
    /* `missing` and `invalid` are real answers, so neither may be folded into
       `empty`, which would render the wrong sentence. */
    isEmpty: () => false,
  })

  const measuresByKey = Object.fromEntries(measures.map((m) => [m.key, m]))
  const state = tileData.data
  /* The report's CURRENT name wherever the reference resolved — `pinnedName` is
     read in exactly one case, and this is it. */
  const title = state && state.kind !== 'missing' ? state.report.name : tile.pinnedName

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>
          {state?.kind === 'ok' || state?.kind === 'invalid' ? (
            /* A resolvable tile opens its report — including one whose query no
               longer validates, because the builder is where it gets fixed. */
            <Button
              type="button"
              variant="link"
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

        {/* AC-871 — keyboard-operable by construction. Present always, not on
            hover, and each control carries the tile's name so a screen reader
            knows which tile it is acting on.

            `CardAction`, not a bare div: the slot is what switches the header
            to a two-column grid and puts the controls BESIDE the title rather
            than under it. Lucide marks rather than arrow characters — a text
            arrow picks up the emoji presentation on some platforms and stops
            being an icon at all. **These two do not mirror**: they point along
            an ordered LIST, which runs block-wise in both languages (§9.5). */}
        <CardAction>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              disabled={!canMoveUp}
              aria-label={t('rb.dashboard.tile.moveUp', { name: title })}
              onClick={() => onMove(tile.tileId, -1)}
            >
              <ArrowUpIcon aria-hidden="true" className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              disabled={!canMoveDown}
              aria-label={t('rb.dashboard.tile.moveDown', { name: title })}
              onClick={() => onMove(tile.tileId, 1)}
            >
              <ArrowDownIcon aria-hidden="true" className="size-4" />
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
                  <span aria-hidden="true">⋯</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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
        </CardAction>
      </CardHeader>

      <CardContent className="min-w-0">
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
        ) : (
          <ResultCanvas
            status="content"
            result={state.result}
            stale={false}
            violations={[]}
            measuresByKey={measuresByKey}
            coercedFrom={
              planReportQuery(state.report.query, { measures, dimensions }, today).chartTypeCoerced
                ? state.report.query.chartType
                : null
            }
            effectiveChartType={
              planReportQuery(state.report.query, { measures, dimensions }, today)
                .effectiveChartType
            }
            onRetry={tileData.refetch}
            onRetrySeries={() => tileData.refetch()}
            noDataSentence={noDataSentence}
            t={t}
            language={language}
          />
        )}
      </CardContent>
    </Card>
  )
}
