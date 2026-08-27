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
 * ## Missing is not blocked, and neither is an error
 *
 * Three different sentences, and §11.3 keeps them apart on purpose:
 *
 *   **missing** — *this is gone.* The frame stays, `pinnedName` names it, and
 *                 `Remove tile` is the only action.
 *   **blocked** — *you may not see this.* `PanelCard` renders it, per series,
 *                 naming the permission required.
 *   **failed**  — *this did not load.* Its own retry, and the dashboard is fine.
 *
 * Rules applied
 *   AC-873      the same composer as a metric board: same panels, same no-data
 *               sentence, same legend rules. `ResultCanvas` is literally the
 *               same component the builder renders, which is what makes that
 *               claim checkable rather than aspirational.
 *   AC-871      `Move up` / `Move down` are real buttons with accessible names.
 *               §7 does not exempt drag-and-drop, so the core ships the
 *               keyboard-operable form and a grid stays additive.
 *   §7.3        the tile's controls are not hover-only.
 */

import { useCallback } from 'react'
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { useAsync } from '@/hooks'
import { getReport, planReportQuery, runReport } from '@/data/clients'
import type {
  DashboardTile as DashboardTileModel,
  Dimension,
  Measure,
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
  /** `null` disables the move controls at the ends of the list. */
  canMoveUp: boolean
  canMoveDown: boolean
  onMove: (tileId: string, direction: -1 | 1) => void
  onRemove: (tileId: string) => void
  onOpen: (report: SavedReport) => void
  noDataSentence: string
  t: Translator
  language: Language
}

interface Resolved {
  report: SavedReport
  result: ReportResult
}

export function DashboardTile({
  tile,
  measures,
  dimensions,
  today,
  canMoveUp,
  canMoveDown,
  onMove,
  onRemove,
  onOpen,
  noDataSentence,
  t,
  language,
}: DashboardTileProps) {
  const load = useCallback(
    async (signal: AbortSignal): Promise<Resolved | null> => {
      const report = await getReport(tile.reportId, signal).catch(() => null)
      /* A dangling reference. It cannot be created through the UI — the delete
         is refused — but a concurrent session, a restore or a direct API call
         can still produce one. `null` is the MISSING state, not an error. */
      if (!report) return null
      const outcome = await runReport(report.data.query, { today, signal })
      if (outcome.status !== 'ok') return null
      return { report: report.data, result: outcome.result }
    },
    [tile.reportId, today],
  )

  const tileData = useAsync<Resolved | null>(load, {
    deps: [tile.reportId],
    /* `null` is a real answer here — the tile is missing — so it must not be
       folded into `empty`, which would render the wrong sentence. */
    isEmpty: () => false,
  })

  const measuresByKey = Object.fromEntries(measures.map((m) => [m.key, m]))
  const resolved = tileData.data ?? null

  const title = resolved?.report.name ?? tile.pinnedName

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>
          {resolved ? (
            /* A resolvable tile opens its report. The `pinnedName` is not read
               here — the report's current name is the truth. */
            <Button
              type="button"
              variant="link"
              onClick={() => onOpen(resolved.report)}
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
            hover, and each carries the tile's name so a screen reader knows
            which tile it is moving.

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
          </div>
        </CardAction>
      </CardHeader>

      <CardContent className="min-w-0">
        {tileData.status === 'loading' ? (
          /* Skeleton in the tile's OWN frame. Other tiles render independently. */
          <LoadingSkeleton pattern="P5" label={title} />
        ) : tileData.status === 'error' ? (
          <ErrorState
            scope="card"
            card={false}
            message={t('rb.dashboard.tile.error')}
            action={{ label: t('rb.dashboard.tile.retry'), onClick: tileData.refetch }}
          />
        ) : resolved === null ? (
          /* §11.3's MISSING tile: the frame, `pinnedName`, one sentence, and
             `Remove tile`. Not an error, and it does not fail the dashboard. */
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <p className="text-sm text-muted-foreground">{t('rb.dashboard.tile.missing')}</p>
            <Button
              type="button"
              variant="ghost"
              /* The label names the action; the accessible name names the tile
                 (`copy.ts`), so six `Remove tile` buttons stay distinguishable
                 to a screen reader without six different visible labels. */
              aria-label={t('rb.dashboard.tile.removeA11y', { name: title })}
              onClick={() => onRemove(tile.tileId)}
            >
              {t('rb.dashboard.tile.remove')}
            </Button>
          </div>
        ) : (
          <ResultCanvas
            status="content"
            result={resolved.result}
            stale={false}
            violations={[]}
            measuresByKey={measuresByKey}
            coercedFrom={
              planReportQuery(resolved.report.query, { measures, dimensions }, today)
                .chartTypeCoerced
                ? resolved.report.query.chartType
                : null
            }
            effectiveChartType={
              planReportQuery(resolved.report.query, { measures, dimensions }, today)
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
