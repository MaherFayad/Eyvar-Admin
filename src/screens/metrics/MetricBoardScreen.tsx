/**
 * **The screen behind all eight metric-tile sub-tabs** — `DESIGN.md` §3.7,
 * `specs/00-foundation.md` §3.4.
 *
 * | Sub-tab | Route | Contributing legacy pages |
 * |---|---|---|
 * | Management › Overview | `/management/overview` | `exec-overview` — the KPI strip, the financial position block, subscription growth (`:6901`–`:6935`) |
 * | Management › Performance | `/management/performance` | `exec-overview` (trends, cities health, rider engagement) + `growth` (retention cohorts, CSAT/NPS) |
 * | Management › Risk & Signals | `/management/risk` | `predictive` + `fraud`, merged by **M1** |
 * | Management › Growth | `/management/growth` | `growth` — promos, referrals, incentives, bulk messaging |
 * | Management › Market & Zones | `/management/zones` | `zones` + `exec-overview`'s expansion-ready list |
 * | Operations › Overview | `/operations/overview` | `dashboard` + `inbox`'s two ownership counters |
 * | Support › Overview | `/support/overview` | assembled from `support`, `contacts`, `safety`, `fairness` |
 * | Admin › Overview | `/admin/overview` | **new** — `auditLog`, `teamUsers`, `integrity`, `rotaGaps()`, `legalDocuments`, the erasure queue, `dataWindow` |
 *
 * **One component, not eight**, and that is the point rather than an economy.
 * Wave 4's bar is *"eight screens that are individually fine but do not read as
 * one family is a failure of this wave"*; one component makes that structural.
 * The board's contents come from `getMetricBoard(subTabId)` — which tiles and
 * which charts a workspace cares about is a data question, and it is answered
 * in the data layer where the numbers are. There is nothing in a per-screen
 * file for two overviews to drift apart on, because there is no per-screen file.
 *
 * `routes.tsx` mounts this for every id in **`METRIC_BOARD_SUB_TABS`**, so
 * adding a ninth board is a data change and not a code change — the same rule
 * §11.3 applies to permissions.
 *
 * ```
 *  Overview                                            <- 22px/600
 *  Computed 25 Jun 09:14                               <- §8 meta, data-derived
 *
 *  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        <- 3 up, 4 above wide:
 *  └────────┘ └────────┘ └────────┘ └────────┘
 *
 *  ┌──────────────────────────────────────────┐       <- chart cards
 *  └──────────────────────────────────────────┘
 * ```
 *
 * Rules applied
 *   §3.7        metric tiles then chart cards, in that order. A tile is a
 *               summary of something a card explains; reading the explanation
 *               first is backwards.
 *   §7.1 / V5   ONE page width. `SingleColumnPage` has no `width` prop and the
 *               32px gutter is `--ev-page-pad`, so an operator moving between
 *               `/management/overview` and `/management/risk` finds the `<h1>`
 *               in the same place.
 *   §8 / V4     the `meta` line is **data-derived only**, and `MetricBoard.asOf`
 *               is exactly that. The route table's static `subtitleKey` is
 *               deliberately not rendered — see `SubTabScreen`'s note.
 *   §8 slot 4c  **no page-level action.** A board is a read surface: every
 *               action it could offer belongs on the screen that owns the
 *               record, and R3's one primary is better spent nowhere than on a
 *               button that has to invent a flow.
 *   `states.md` all four states, none a TODO. See `isBoardEmpty` for which kind
 *               of empty and why the choice is mechanical (AC-37 / AC-38).
 *   **AC-24**   the error is the SCREEN's; the rail, the sub-tab column and the
 *               top bar keep working and the operator can navigate away without
 *               a reload.
 *   **AC-35**   the loading state is `P5` — the metric-tile skeleton, shaped
 *               like the tiles it replaces. Never a centred spinner.
 */

import { useNavigate } from 'react-router-dom'
import { useAsync } from '@/hooks'
import { getMetricBoard } from '@/data/clients'
import type { MetricBoard, SubTabRoute } from '@/data/types'
import { formatDate } from '@/lib'
import { ChartCard, MetricTile, MetricTileItem, MetricTileRow } from '@/components/metrics'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { useShell } from '@/shell/ShellContext'

/**
 * **Which kind of empty, decided mechanically** (AC-37 / AC-38).
 *
 * `states.md`: the empty *kind* comes from whether a filter is active, not from
 * taste. A board has no filter — there is no query to relax and no `Clear
 * filters` to offer — so a board with nothing on it can only be `first-run`,
 * the illustrated whole-page state (R8). `no-match` is not representable here.
 *
 * A board is empty when it has **no computable number and no drawable chart**.
 * One `value: null` tile is not emptiness: a board carrying four real counts
 * beside two that cannot be computed is a content page with honest holes in it,
 * which reads differently and must not be replaced by an illustration.
 *
 * Note the client 404s for a sub-tab with no board at all, so that case arrives
 * as an ERROR rather than as emptiness — deliberately, per `getMetricBoard`:
 * *"a table screen calling this is a bug, and a silently empty board would hide
 * it."*
 */
function isBoardEmpty(board: MetricBoard): boolean {
  const hasNumber = board.metrics.some((metric) => metric.value !== null)
  const hasChart = board.charts.some((chart) => chart.current.points.length > 0)
  return !hasNumber && !hasChart
}

export function MetricBoardScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const navigate = useNavigate()
  const { t, dir, language } = shell.language

  const board = useAsync<MetricBoard>((signal) => getMetricBoard(row.subTabId, signal), {
    deps: [row.subTabId],
    isEmpty: isBoardEmpty,
  })

  const title = t(row.titleKey)
  const data = board.status === 'content' ? board.data : null

  const header = (
    <PageHeader
      title={title}
      /* §8's metadata line — the board's computation instant, and `null` in
         every state but `content`, because a page that has not loaded cannot
         honestly claim a freshness. */
      meta={
        data
          ? t('overview.asOf', {
              time: formatDate(data.asOf, { style: 'day-month-time', language }),
            })
          : null
      }
      /* §8 slot 1 — no back arrow. A board is an index route (§2.2). */
      t={t}
      dir={dir}
    />
  )

  return (
    <SingleColumnPage header={header}>
      {board.status === 'loading' ? (
        /* AC-35 — the tile-shaped skeleton, not a spinner. */
        <LoadingSkeleton pattern="P5" label={t('overview.loading', { resource: title })} />
      ) : board.status === 'error' ? (
        /* AC-24 — the SCREEN fails, the shell does not. `Try again` re-runs the
           same request; it is the one primary on a page showing nothing else. */
        <ErrorState
          scope="page"
          heading={t('state.pageError.title', { resource: title })}
          message={t('state.pageError.body')}
          action={{ label: t('state.pageError.action'), onClick: board.refetch }}
        />
      ) : board.status === 'empty' || !data ? (
        /* R8 / AC-38 — whole page, zero records ever: the illustrated state,
           with a heading naming what the section is FOR rather than what is
           missing from it. */
        <EmptyState
          kind="first-run"
          heading={t('overview.empty.heading')}
          body={t('overview.empty.body')}
          actions={[
            { label: t('overview.empty.action'), onClick: () => navigate('/operations/trips') },
          ]}
        />
      ) : (
        <BoardContent board={data} />
      )}
    </SingleColumnPage>
  )

  function BoardContent({ board: loaded }: { board: MetricBoard }) {
    return (
      <div className="flex flex-col gap-4">
        {loaded.metrics.length > 0 && (
          <MetricTileRow>
            {loaded.metrics.map((metric) => (
              <MetricTileItem key={metric.key}>
                <MetricTile
                  metric={metric}
                  boardAsOf={loaded.asOf}
                  t={t}
                  language={language}
                />
              </MetricTileItem>
            ))}
          </MetricTileRow>
        )}

        {/* One chart per board today, so one across; two or more pair up. A
            chart card holding a plot gains nothing from being a quarter of the
            page, which is why the tile row is the thing that changes at
            `wide:` and this is not. */}
        {loaded.charts.length > 0 && (
          <div className={loaded.charts.length === 1 ? 'grid grid-cols-1' : 'grid grid-cols-2 gap-4'}>
            {loaded.charts.map((chart) => (
              <ChartCard
                key={chart.key}
                series={chart}
                /* §3.7's report icon. `TimeSeries` carries no route, so it
                   borrows the one from the metric with the same key — which is
                   the surface that owns the number, by definition. `null` when
                   the series has no tile beside it. */
                reportHref={
                  loaded.metrics.find((metric) => metric.key === chart.key)?.drilldownRoute ?? null
                }
                t={t}
                language={language}
              />
            ))}
          </div>
        )}
      </div>
    )
  }
}
