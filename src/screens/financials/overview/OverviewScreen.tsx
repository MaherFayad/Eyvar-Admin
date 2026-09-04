/**
 * Financials › Overview — spec §5 row 1, §6.2, **AC-346–353**, rebuilt on the
 * metric-board set (FINANCIALS-UX-PLAN §3). Every figure reaches the screen
 * through `toBoard`; the derived five come from `derive.ts`, which Revenue &
 * Refunds reads too (AC-347). R10 keeps one banner and `DecisionList` carries
 * the three conditions it did not take. V-1, V-4, V-6 and V-7 are the layout.
 */

import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFinancialsOverview } from '@/data/clients'
import type { FinancialsOverview, SubTabRoute } from '@/data/types'
import { useAsync } from '@/hooks'
import { formatCount, formatDate, formatMoney, type Language } from '@/lib'
import { Banner, mergeBanners, type BannerModel } from '@/components/Banner'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { SingleColumnPage } from '@/components/PageShell'
import {
  BoardHero,
  BoardHeroItem,
  BoardHeroRow,
  BreakdownList,
  Chapter,
  ChapterFigures,
  ChartCard,
  MetricTile,
  MetricTileItem,
  SectionHeading,
} from '@/components/metrics'
import { useShell } from '@/shell/ShellContext'
import { FigureRow, Percent } from '../shared/Figures'
import { usePeriod } from '../shared/FinancialsPage'
import { DecisionList } from '../shared/DecisionList'
import { PeriodControl } from '../shared/PeriodControl'
import { marginBreakdown } from '../shared/derive'
import { CHART_HEADLINE, toBoard } from './toBoard'

/** A day string as the page words it. The client sends days; the band prints them. */
function day(at: string, language: Language): string {
  return formatDate(`${at}T00:00:00+03:00`, { style: 'day-month', language })
}

/**
 * **Nothing was posted in this window**, which is not the same fact as an
 * empty console — `lifetimePostings` decides which of R8's two kinds renders
 * (LR-3, §3.5).
 */
function noPostingsInWindow(data: FinancialsOverview): boolean {
  return data.daily.every(
    (each) =>
      each.grossBookingsHalalas === 0 &&
      each.captainEarningsHalalas === 0 &&
      each.givebackHalalas === 0,
  )
}

/** The two panel rows and the calculation card share one grid: halves, never thirds (V-6). */
const HALVES = 'grid grid-cols-2 gap-5 compact:grid-cols-1'
const SECTION = 'flex flex-col gap-4 border-t border-border pt-8'

export function OverviewScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const { t, language } = shell.language
  const navigate = useNavigate()
  const { period, setPeriod } = usePeriod()

  const overview = useAsync<FinancialsOverview>(
    (signal) => getFinancialsOverview({ period, signal }),
    /* AC-353: changing the period changes every figure, so both ends of the
       window are dependencies and the key carries them. */
    {
      deps: [period.start, period.end],
      cacheKey: 'financials.overview',
      isEmpty: noPostingsInWindow,
    },
  )

  const data = overview.status === 'content' ? overview.data : null
  const board = useMemo(() => (data ? toBoard(data, language) : null), [data, language])
  const margin = useMemo(() => (data ? marginBreakdown(data) : null), [data])

  /* §11.4 / R10 — ONE banner, chosen by precedence rather than merged. AC-351
     requires the out-of-balance banner to state the difference in SAR, and a
     merged banner states a count instead. */
  const banners = useMemo<BannerModel[]>(() => {
    if (!data) return []
    if (!data.trialBalanceBalanced) {
      return [
        {
          id: 'fin.overview.outOfBalance',
          tone: 'critical',
          title: t('fin.overview.outOfBalance.title', {
            amount: formatMoney(Math.abs(data.trialBalanceDifferenceHalalas)),
          }),
          body: t('fin.overview.outOfBalance.body'),
          actions: [
            {
              label: t('fin.overview.outOfBalance.action'),
              onClick: () => navigate('/financials/ledger?view=refused'),
            },
          ],
        },
      ]
    }
    if (data.refusedPostingCount > 0) {
      return [
        {
          id: 'fin.overview.refused',
          tone: 'warning',
          title:
            data.refusedPostingCount === 1
              ? t('fin.overview.refused.title')
              : t('fin.overview.refused.titleMany', {
                  count: formatCount(data.refusedPostingCount, language),
                }),
          /* P0-1 — the refused condition's own sentence. It used to borrow the
             out-of-balance one, which claims debits and credits disagree under
             a footer showing them equal. */
          body: t('fin.overview.refused.body'),
          actions: [
            {
              label: t('fin.overview.outOfBalance.action'),
              onClick: () => navigate('/financials/ledger?view=refused'),
            },
          ],
        },
      ]
    }
    return []
  }, [data, t, language, navigate])

  const merged = useMemo(
    () => mergeBanners([...banners], (count) => t('state.merged.message', { count: String(count) })),
    [banners, t],
  )

  /* The lede states the window and what it is measured against, and nothing
     else. F-4: the refused-postings sentence is the banner's, printed once.
     F-5: it never says "closed" while Q-F8 is open. */
  const compare = board?.comparisonPeriod ?? null
  const lede = compare
    ? t('fin.overview.board.lede', {
        from: day(period.start, language),
        to: day(period.end, language),
        compareFrom: day(compare.start, language),
        compareTo: day(compare.end, language),
      })
    : t('fin.overview.board.lede.alone', {
        from: day(period.start, language),
        to: day(period.end, language),
      })

  const title = t(row.titleKey)

  return (
    <SingleColumnPage
      body="flow"
      banner={merged ? <Banner banner={merged} className="mb-3" /> : undefined}
      bleed={
        <BoardHero
          title={title}
          lede={lede}
          asOf={data ? data.asOf : null}
          period={data ? period : null}
          /* V-7 — Financials' own control, in the band. Its presets are
             calendar months and `BoardPeriodControl`'s are rolling windows; two
             sets of presets for one window is the affordance §3.2 refuses. */
          periodSlot={
            <PeriodControl
              period={period}
              onChange={setPeriod}
              t={t}
              language={language}
              surface="band"
            />
          }
          t={t}
          language={language}
        >
          {board && data && (
            <BoardHeroRow>
              {board.leads.map((metric) => (
                <BoardHeroItem key={metric.key}>
                  <MetricTile
                    metric={metric}
                    boardAsOf={data.asOf}
                    surface="band"
                    deltaUnit={metric.unit === 'percent' ? 'points' : 'percent'}
                    t={t}
                    language={language}
                  />
                </BoardHeroItem>
              ))}
            </BoardHeroRow>
          )}
        </BoardHero>
      }
    >
      {overview.status === 'loading' ? (
        /* §11.3 / AC-426 — the shape of the content, never a centred spinner. */
        <LoadingSkeleton pattern="P5" label={t('overview.loading', { resource: title })} />
      ) : overview.status === 'error' ? (
        <ErrorState
          scope="page"
          message={t('fin.error.read')}
          action={{ label: t('fin.error.retry'), onClick: overview.refetch }}
        />
      ) : overview.status === 'empty' ? (
        overview.data && overview.data.lifetimePostings === 0 ? (
          /* R8's first kind / LR-1 — the console has never had a posting. */
          <EmptyState
            kind="first-run"
            heading={t('fin.overview.firstRun.heading')}
            body={t('fin.overview.firstRun.body')}
            actions={[
              {
                label: t('fin.overview.firstRun.action'),
                onClick: () => navigate('/financials/ledger'),
              },
            ]}
          />
        ) : (
          /* R8's second kind — the books have postings, this window has none.
             One sentence, no illustration. */
          <p className="py-6 text-sm text-muted-foreground">
            <bdi>
              {t('fin.overview.empty.body', {
                postings: formatCount(overview.data?.lifetimePostings ?? 0, language),
                from: day(period.start, language),
                to: day(period.end, language),
              })}
            </bdi>
          </p>
        )
      ) : board && data && margin ? (
        <div className="flex flex-col gap-8">
          <Chapter
            category={null}
            title={t('fin.overview.chapter.period')}
            /* §3.2 — the window is stated ONCE, here, instead of on six tiles. */
            summary={t('fin.overview.chapter.period.note', {
              from: day(period.start, language),
              to: day(period.end, language),
            })}
            t={t}
          >
            <ChapterFigures>
              {board.flows.map((metric) => (
                <MetricTileItem key={metric.key}>
                  <MetricTile
                    metric={metric}
                    boardAsOf={data.asOf}
                    deltaUnit={metric.unit === 'percent' ? 'points' : 'percent'}
                    t={t}
                    language={language}
                  />
                </MetricTileItem>
              ))}
            </ChapterFigures>
          </Chapter>

          <Chapter
            category={null}
            title={t('fin.overview.chapter.positions')}
            summary={t('fin.overview.chapter.positions.note', { at: day(period.end, language) })}
            t={t}
          >
            <ChapterFigures>
              {board.positions.map((metric) => (
                <MetricTileItem key={metric.key}>
                  <MetricTile metric={metric} boardAsOf={data.asOf} t={t} language={language} />
                </MetricTileItem>
              ))}
            </ChapterFigures>
          </Chapter>

          <section className={SECTION}>
            <SectionHeading title={t('fin.overview.charts.heading')} />
            <div className={HALVES}>
              {board.series.map((series) => (
                <ChartCard
                  key={series.key}
                  series={series}
                  headline={
                    board.leads.find((lead) => lead.key === CHART_HEADLINE[series.key]) ?? null
                  }
                  deltaUnit={series.unit === 'percent' ? 'points' : 'percent'}
                  reportHref={null}
                  t={t}
                  language={language}
                />
              ))}
            </div>
          </section>

          <section className={SECTION}>
            <SectionHeading title={t('fin.overview.lists.heading')} />
            <div className={HALVES}>
              {board.breakdowns.map((breakdown) => (
                <BreakdownList
                  key={breakdown.key}
                  breakdown={breakdown}
                  scope={{ subTabId: row.subTabId, period }}
                  t={t}
                  language={language}
                />
              ))}
              <DecisionList rows={board.decisions} t={t} language={language} />
            </div>
          </section>

          {/* §3.4 — the H5 calculation card, kept and moved to the END. A
              Finance lead auditing a contribution figure needs the operands in
              a column with the operators drawn; a reader who wants the shape of
              the month is no longer stopped by it. */}
          <section className={SECTION}>
            <div className={HALVES}>
              <Card className="gap-2">
                <div className="flex flex-col px-(--card-spacing)">
                  <h2 className="pb-1 text-sm font-semibold text-foreground">
                    {t('fin.overview.margin.heading')}
                  </h2>
                  {/* The two percentages take NO operator and no gutter: they
                      are ratios of the lines above them, not operands in the
                      sum. That is why the field distinguishes `null` from
                      omitted. */}
                  <FigureRow
                    operator={null}
                    label={t('fin.overview.gross')}
                    amount={margin.grossBookingsHalalas}
                  />
                  <FigureRow
                    operator="subtract"
                    label={t('fin.overview.captainEarnings')}
                    amount={margin.captainEarningsHalalas}
                  />
                  <FigureRow
                    operator="equals"
                    label={t('fin.overview.grossMargin')}
                    amount={margin.grossMarginHalalas}
                  />
                  <FigureRow
                    label={t('fin.overview.grossMarginPercent')}
                    value={<Percent value={margin.grossMarginPercent} language={language} />}
                  />
                  <FigureRow
                    operator="subtract"
                    label={t('fin.overview.giveback')}
                    amount={margin.givebackHalalas}
                  />
                  <FigureRow
                    operator="equals"
                    label={t('fin.overview.contributionMargin')}
                    amount={margin.contributionMarginHalalas}
                    emphasis
                  />
                  <FigureRow
                    label={t('fin.overview.contributionPercent')}
                    value={
                      <Percent value={margin.contributionMarginPercent} language={language} />
                    }
                  />
                </div>
              </Card>
            </div>
          </section>
        </div>
      ) : null}
    </SingleColumnPage>
  )
}
