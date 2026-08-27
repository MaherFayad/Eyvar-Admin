/**
 * Financials › Overview — spec §5 row 1, §6.2, **AC-346–353**.
 *
 * ## The one thing this screen exists to stop
 *
 * The legacy Finance page's seven KPI tiles are **static HTML strings**
 * (`:931`–`:939`) and three of them contradict the live data five rows below
 * them (`12a` R12): `Eyvar net 9,246 / 19.2%` above a table saying
 * `8,752 / 18.1%`; `501.98` held in escrow above a function computing `138.40`
 * from the same array; `65.00` in deductions above a pending sum of `45.00`.
 *
 * **AC-346** is the criterion that stops it returning, and it is structural
 * here rather than a promise: there is not one number literal in this file.
 * Every figure comes from `getFinancialsOverview`, which computes from
 * postings, and the five derived ones come from `derive.ts`, which both this
 * screen and Revenue & Refunds read — that is **AC-347**.
 *
 * Rules applied
 *   §3.7 / R5a **no tile turns red** when the books are out of balance
 *              (**AC-351**). The condition is a page-level critical banner
 *              naming the difference in SAR, and the tiles state numbers.
 *   R10        **one banner.** Out of balance outranks refused postings; the
 *              failed payouts, unmatched credit notes and escalated reports
 *              raise their banners on the sub-tabs that can act on them
 *              (**AC-367**, **AC-356**, **AC-378**), not here.
 *   AC-342     `grossMarginPercent` is `null` when gross is zero, and `Percent`
 *              renders an em dash for it. Never `0%`.
 *   AC-353     the period is a search param and a `useAsync` dependency, so
 *              changing it re-reads every figure rather than re-filtering one
 *              already on screen.
 *   §11.3      the loading state is the shape of the content — a grid of tile
 *              skeletons — and never a centred spinner (**AC-426**).
 */

import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFinancialsOverview } from '@/data/clients'
import type { FinancialsOverview, SubTabRoute } from '@/data/types'
import { useAsync } from '@/hooks'
import { formatCount, formatMoney } from '@/lib'
import type { BannerModel } from '@/components/Banner'
import { Card } from '@/components/ui/card'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { useShell } from '@/shell/ShellContext'
import { Figure, FigureGrid, FigureItem, FigureRow, Percent } from '../shared/Figures'
import { FinancialsPage, periodLabel, usePeriod } from '../shared/FinancialsPage'
import { PeriodControl } from '../shared/PeriodControl'
import { marginBreakdown } from '../shared/derive'

export function OverviewScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const { t, dir, language } = shell.language
  const navigate = useNavigate()
  const { period, setPeriod } = usePeriod()

  const overview = useAsync<FinancialsOverview>(
    (signal) => getFinancialsOverview({ period, signal }),
    { deps: [period.start, period.end], isEmpty: () => false },
  )

  const data = overview.data
  const margin = useMemo(() => (data ? marginBreakdown(data) : null), [data])

  /* §11.4 / R10 — ONE banner, chosen by precedence rather than merged. AC-351
     requires the out-of-balance banner to state the difference in SAR, and a
     merged banner states a count instead, so the more severe condition takes
     the surface outright and the other is reachable on its own sub-tab. */
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
    return []
  }, [data, t, language, navigate])

  const scope = periodLabel(period, t, language)

  return (
    <FinancialsPage row={row} meta={scope} banners={banners} t={t} dir={dir}>
      <div className="flex flex-col gap-4">
        <PeriodControl period={period} onChange={setPeriod} t={t} language={language} />

        {overview.status === 'loading' && <LoadingSkeleton pattern="P5" />}

        {overview.status === 'error' && (
          <ErrorState
            scope="page"
            message={t('fin.error.read')}
            action={{ label: t('fin.error.retry'), onClick: overview.refetch }}
          />
        )}

        {data && margin && (
          <>
            <section className="flex flex-col gap-2" aria-labelledby="fin-overview-period">
              <h2 id="fin-overview-period" className="text-sm font-semibold text-foreground">
                {t('fin.overview.tiles.heading')}
              </h2>
              <FigureGrid>
                <FigureItem>
                  <Figure
                    label={t('fin.overview.gross')}
                    amount={data.grossBookingsHalalas}
                    caption={scope}
                  />
                </FigureItem>
                <FigureItem>
                  <Figure
                    label={t('fin.overview.captainEarnings')}
                    amount={data.captainEarningsHalalas}
                    caption={scope}
                  />
                </FigureItem>
                <FigureItem>
                  <Figure
                    label={t('fin.overview.grossMargin')}
                    amount={margin.grossMarginHalalas}
                    caption={scope}
                  />
                </FigureItem>
                <FigureItem>
                  <Figure
                    label={t('fin.overview.giveback')}
                    amount={margin.givebackHalalas}
                    caption={scope}
                  />
                </FigureItem>
                <FigureItem>
                  <Figure
                    label={t('fin.overview.contributionMargin')}
                    amount={margin.contributionMarginHalalas}
                    caption={scope}
                  />
                </FigureItem>
                <FigureItem>
                  {/* **AC-361's pair, and AC-342's em dash.** Both percentages
                      are labelled and neither is presented alone. */}
                  <Figure
                    label={t('fin.overview.contributionPercent')}
                    value={
                      <Percent value={margin.contributionMarginPercent} language={language} />
                    }
                    caption={scope}
                  />
                </FigureItem>
              </FigureGrid>
            </section>

            <section className="flex flex-col gap-2" aria-labelledby="fin-overview-positions">
              <h2 id="fin-overview-positions" className="text-sm font-semibold text-foreground">
                {t('fin.overview.positions.heading')}
              </h2>
              <FigureGrid>
                <FigureItem>
                  <Figure
                    label={t('fin.overview.pendingPayouts')}
                    amount={data.pendingPayoutsHalalas}
                    caption={t('fin.overview.asAt')}
                  />
                </FigureItem>
                <FigureItem>
                  <Figure
                    label={t('fin.overview.escrowHeld')}
                    amount={data.escrowHeldHalalas}
                    caption={t('fin.overview.asAt')}
                  />
                </FigureItem>
                <FigureItem>
                  <Figure
                    label={t('fin.overview.escrowReady')}
                    amount={data.escrowReadyHalalas}
                    caption={t('fin.overview.asAt')}
                  />
                </FigureItem>
                <FigureItem>
                  <Figure
                    label={t('fin.overview.captainDebt')}
                    amount={data.captainDebtHalalas}
                    caption={t('fin.overview.asAt')}
                  />
                </FigureItem>
                <FigureItem>
                  <Figure
                    label={t('fin.overview.riderWalletLiability')}
                    amount={data.riderWalletLiabilityHalalas}
                    caption={t('fin.overview.asAt')}
                  />
                </FigureItem>
              </FigureGrid>
            </section>

            <Card className="gap-2">
              <div className="flex flex-col px-(--card-spacing)">
                <h2 className="pb-1 text-sm font-semibold text-foreground">
                  {t('fin.overview.giveback.heading')}
                </h2>
                {/* **AC-455** — promo, referral and incentive resolve to their
                    OWN accounts. They were operational figures served beside a
                    trial balance until the chart was opened; a management
                    number is a GL number or it is not auditable. */}
                <FigureRow label={t('fin.overview.giveback.promo')} amount={data.promoHalalas} />
                <FigureRow
                  label={t('fin.overview.giveback.referral')}
                  amount={data.referralHalalas}
                />
                <FigureRow
                  label={t('fin.overview.giveback.incentive')}
                  amount={data.incentiveHalalas}
                />
                {/* **AC-352** — a refund appears in exactly ONE cost line.
                    Legacy books the cancellation path as `refunds` *and* as
                    `goodwill` and subtracts it twice. */}
                <FigureRow
                  label={t('fin.overview.giveback.refunds')}
                  amount={data.refundsHalalas}
                />
                <FigureRow
                  label={t('fin.overview.giveback.goodwill')}
                  amount={data.goodwillHalalas}
                />
                <FigureRow
                  label={t('fin.overview.giveback.emergency')}
                  amount={data.emergencyCoverHalalas}
                />
                <FigureRow
                  label={t('fin.overview.giveback')}
                  amount={margin.givebackHalalas}
                  emphasis
                />
              </div>
            </Card>

            <Card className="gap-2">
              <div className="flex flex-col px-(--card-spacing)">
                <h2 className="pb-1 text-sm font-semibold text-foreground">
                  {t('fin.overview.margin.heading')}
                </h2>
                <FigureRow label={t('fin.overview.gross')} amount={margin.grossBookingsHalalas} />
                <FigureRow
                  label={t('fin.overview.captainEarnings')}
                  amount={margin.captainEarningsHalalas}
                />
                <FigureRow
                  label={t('fin.overview.grossMargin')}
                  amount={margin.grossMarginHalalas}
                />
                <FigureRow
                  label={t('fin.overview.grossMarginPercent')}
                  value={<Percent value={margin.grossMarginPercent} language={language} />}
                />
                <FigureRow label={t('fin.overview.giveback')} amount={margin.givebackHalalas} />
                <FigureRow
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
          </>
        )}
      </div>
    </FinancialsPage>
  )
}
