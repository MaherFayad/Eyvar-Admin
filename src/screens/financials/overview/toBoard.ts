/**
 * The Financials Overview response, typed for the board components that draw
 * it (§3.1). Every `Metric` is one field of `FinancialsOverview` and its match
 * on `.comparison`; every `TimeSeries` is `daily`. Nothing is minted, which is
 * what **D-F32** rests on. Pure — no React, no `t`, and no number literal.
 */

import type {
  FinancialsComparison,
  FinancialsOverview,
  FinancialsPeriod,
  Halalas,
  Metric,
  MetricBreakdown,
  MetricBreakdownRow,
  MetricComparison,
  MetricDirection,
  MetricUnit,
  TimeSeries,
} from '@/data/types'
import { formatPercent, type Language } from '@/lib'
import { marginBreakdown, percentOrNull } from '../shared/derive'

const SUB_TAB_ID = 'financials-overview'

/**
 * Which figure owns each plot. The headline above a chart is that metric, so
 * the two cannot disagree — one number and its history, not two reads.
 */
export const CHART_HEADLINE: Record<string, string> = {
  'financials.overview.grossByDay': 'financials.overview.grossBookings',
  'financials.overview.contributionPercentByDay': 'financials.overview.contributionPercent',
}

/** One row of *What needs a decision* — a count, and the view that can act. */
export interface DecisionRow {
  id: string
  /** The condition, in words. */
  labelKey: string
  /** The sub-tab the row opens, named with the shell's own key. */
  whereKey: string
  count: number
  route: string
}

export interface OverviewBoard {
  asOf: string
  period: FinancialsPeriod
  comparisonPeriod: FinancialsPeriod | null
  /** The band's three. */
  leads: Metric[]
  /** *The period* — six flows. */
  flows: Metric[]
  /** *Where the money is held* — five balances and their sum. */
  positions: Metric[]
  series: TimeSeries[]
  breakdowns: MetricBreakdown[]
  decisions: DecisionRow[]
}

/**
 * §3.7's rounding, applied once. `null` when there is no prior value or the
 * prior value is zero — `seriesWindowDelta`'s own rule, so a tile and the chart
 * headline above the same measure state the same number.
 */
function changePercent(now: number, before: number | null | undefined): number | null {
  if (before === null || before === undefined || before === 0) return null
  return round1(((now - before) / Math.abs(before)) * 100)
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function directionOf(delta: number | null): MetricDirection | null {
  if (delta === null) return null
  return delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
}

interface FigureInput {
  key: string
  value: number | null
  unit: MetricUnit
  /** The prior value, or `null` where none is statable. */
  before: number | null
  /** Given, the delta is this instead of a percentage change (a rate's points). */
  points?: number | null
  caption?: string | null
  captionParams?: Record<string, string | number> | null
  /** R5-15 — `'postings'` for a flow, the account key for a balance. */
  sourceResource: string
  rank?: 'lead' | 'supporting'
  /** Both `null` on a balance: a position is as at a date, not over a window. */
  windowed: boolean
}

/**
 * One figure, built from the response and its comparison.
 *
 * The `none` arm is taken exactly when the prior value is absent, so a tile can
 * never draw a delta against a number nobody has (R5-1, AC-605).
 */
function figureOf(
  input: FigureInput,
  data: FinancialsOverview,
  before: FinancialsComparison | null,
): Metric {
  const priorWindow = before?.period ?? null
  const hasPrior = input.before !== null && priorWindow !== null
  const comparison: MetricComparison = hasPrior
    ? {
        kind: 'previous-period',
        value: input.before as number,
        periodStart: priorWindow.start,
        periodEnd: priorWindow.end,
      }
    : { kind: 'none', reason: 'no-history' }

  const deltaPercent =
    input.value === null || !hasPrior
      ? null
      : input.points !== undefined
        ? input.points === null
          ? null
          : round1(input.points)
        : changePercent(input.value, input.before)

  return {
    key: input.key,
    subTabId: SUB_TAB_ID,
    /* The metrics-library taxonomy, not the page's sections. Every figure on
       this board is a revenue-domain measure; the chapter headings are the
       screen's own and are passed to `Chapter` as titles. */
    category: 'revenue',
    value: input.value,
    absenceReason: input.value === null ? 'not-computable' : null,
    unit: input.unit,
    currency: input.unit === 'money' ? 'SAR' : null,
    asOf: data.asOf,
    periodStart: input.windowed ? data.period.start : null,
    periodEnd: input.windowed ? data.period.end : null,
    comparison,
    deltaPercent,
    direction: directionOf(deltaPercent),
    higherIsBetter: HIGHER_IS_BETTER.has(input.key),
    caption: input.caption ?? null,
    captionParams: input.captionParams ?? null,
    sourceResource: input.sourceResource,
    drilldownRoute: null,
    rank: input.rank ?? 'supporting',
  }
}

/**
 * Which figures a rise is good news for. Captain earnings, giveback, refunds
 * and every liability rise against the business; nothing here can derive that
 * from a key or a unit, which is why `Metric.higherIsBetter` exists.
 */
const HIGHER_IS_BETTER = new Set([
  'financials.overview.grossBookings',
  'financials.overview.grossMargin',
  'financials.overview.contributionMargin',
  'financials.overview.contributionPercent',
  'financials.overview.escrowReady',
])

export function toBoard(data: FinancialsOverview, language: Language): OverviewBoard {
  const now = marginBreakdown(data)
  const before = data.comparison
  const then = before ? marginBreakdown(before) : null

  const share = (part: number, whole: number): string | null => {
    const percent = percentOrNull(part, whole)
    return percent === null ? null : formatPercent(percent, language)
  }

  /* A caption states a denominator or it is omitted; it never states a zero
     over a zero (AC-342). */
  const shareCaption = (
    part: number,
    whole: number,
    key: string,
  ): Pick<FigureInput, 'caption' | 'captionParams'> => {
    const value = share(part, whole)
    return value === null
      ? { caption: null, captionParams: null }
      : { caption: key, captionParams: { share: value } }
  }

  const flow = (
    key: string,
    value: number,
    beforeValue: number | null,
    caption: Pick<FigureInput, 'caption' | 'captionParams'> = {},
    rank: 'lead' | 'supporting' = 'supporting',
  ): Metric =>
    figureOf(
      {
        key,
        value,
        unit: 'money',
        before: beforeValue,
        sourceResource: 'postings',
        windowed: true,
        rank,
        ...caption,
      },
      data,
      before,
    )

  const contributionPercent = (rank: 'lead' | 'supporting'): Metric =>
    figureOf(
      {
        key: 'financials.overview.contributionPercent',
        value: now.contributionMarginPercent,
        unit: 'percent',
        before: then?.contributionMarginPercent ?? null,
        /* §4.3 — a rate moved by POINTS. `−0.6 pts`, never a percent of a
           percent. The tile is passed `deltaUnit="points"`. */
        points:
          now.contributionMarginPercent === null || then?.contributionMarginPercent == null
            ? null
            : now.contributionMarginPercent - then.contributionMarginPercent,
        sourceResource: 'postings',
        windowed: true,
        rank,
      },
      data,
      before,
    )

  const leads: Metric[] = [
    flow(
      'financials.overview.grossBookings',
      data.grossBookingsHalalas,
      before?.grossBookingsHalalas ?? null,
      {},
      'lead',
    ),
    flow(
      'financials.overview.contributionMargin',
      now.contributionMarginHalalas,
      then?.contributionMarginHalalas ?? null,
      {},
      'lead',
    ),
    contributionPercent('lead'),
  ]

  const flows: Metric[] = [
    flow(
      'financials.overview.grossBookings',
      data.grossBookingsHalalas,
      before?.grossBookingsHalalas ?? null,
    ),
    flow(
      'financials.overview.captainEarnings',
      data.captainEarningsHalalas,
      before?.captainEarningsHalalas ?? null,
      shareCaption(
        data.captainEarningsHalalas,
        data.grossBookingsHalalas,
        'fin.overview.caption.shareOfGross',
      ),
    ),
    flow(
      'financials.overview.grossMargin',
      now.grossMarginHalalas,
      then?.grossMarginHalalas ?? null,
      shareCaption(
        now.grossMarginHalalas,
        data.grossBookingsHalalas,
        'fin.overview.caption.shareOfGross',
      ),
    ),
    flow(
      'financials.overview.giveback',
      now.givebackHalalas,
      then?.givebackHalalas ?? null,
      shareCaption(
        now.givebackHalalas,
        now.grossMarginHalalas,
        'fin.overview.caption.shareOfMargin',
      ),
    ),
    flow(
      'financials.overview.contributionMargin',
      now.contributionMarginHalalas,
      then?.contributionMarginHalalas ?? null,
      shareCaption(
        now.contributionMarginHalalas,
        data.grossBookingsHalalas,
        'fin.overview.caption.shareOfGross',
      ),
    ),
    flow(
      'financials.overview.refunds',
      data.refundsHalalas,
      before?.refundsHalalas ?? null,
      shareCaption(
        data.refundsHalalas,
        now.givebackHalalas,
        'fin.overview.caption.shareOfGiveback',
      ),
    ),
  ]

  const balance = (
    key: string,
    value: Halalas,
    beforeValue: Halalas | null,
    account: string,
    caption?: string,
  ): Metric =>
    figureOf(
      {
        key,
        value,
        unit: 'money',
        before: beforeValue,
        sourceResource: account,
        windowed: false,
        caption: caption ?? null,
      },
      data,
      before,
    )

  /* §3.2's sixth position. Derived here, and it is not a GL account: its
     `sourceResource` is the five it sums and its caption says so. */
  const heldInTotalHalalas =
    data.pendingPayoutsHalalas +
    data.escrowHeldHalalas +
    data.escrowReadyHalalas +
    data.captainDebtHalalas +
    data.riderWalletLiabilityHalalas

  const positions: Metric[] = [
    balance(
      'financials.overview.pendingPayouts',
      data.pendingPayoutsHalalas,
      before?.pendingPayoutsHalalas ?? null,
      'liability.driver',
    ),
    balance(
      'financials.overview.riderWallets',
      data.riderWalletLiabilityHalalas,
      before?.riderWalletLiabilityHalalas ?? null,
      'liability.wallet',
    ),
    balance(
      'financials.overview.escrowHeld',
      data.escrowHeldHalalas,
      before?.escrowHeldHalalas ?? null,
      'liability.escrow',
    ),
    balance(
      'financials.overview.escrowReady',
      data.escrowReadyHalalas,
      before?.escrowReadyHalalas ?? null,
      'liability.escrow',
      'fin.overview.caption.escrowReady',
    ),
    balance(
      'financials.overview.captainDebt',
      data.captainDebtHalalas,
      before?.captainDebtHalalas ?? null,
      'ar.driver',
      'fin.overview.caption.captainDebt',
    ),
    balance(
      'financials.overview.heldInTotal',
      heldInTotalHalalas,
      null,
      'postings',
      'fin.overview.caption.heldInTotal',
    ),
  ]

  const series: TimeSeries[] = [
    {
      key: 'financials.overview.grossByDay',
      subTabId: SUB_TAB_ID,
      unit: 'money',
      currency: 'SAR',
      asOf: data.asOf,
      windowTotal: 'sum',
      current: {
        periodStart: data.period.start,
        periodEnd: data.period.end,
        points: data.daily.map((day) => ({ at: day.date, value: day.grossBookingsHalalas })),
      },
      /* The response carries no prior daily series, so there is no dotted line
         to draw. The headline above the plot is the tile's own comparison. */
      comparison: null,
      higherIsBetter: true,
      awaitingStore: null,
    },
    {
      key: 'financials.overview.contributionPercentByDay',
      subTabId: SUB_TAB_ID,
      unit: 'percent',
      currency: null,
      asOf: data.asOf,
      windowTotal: 'last',
      current: {
        periodStart: data.period.start,
        periodEnd: data.period.end,
        /* AC-342 into the plot: a zero-gross day is a GAP, not a `0%` point.
           `percentOrNull` is the same rule the tile reads. */
        points: data.daily.map((day) => ({
          at: day.date,
          value: percentOrNull(
            day.grossBookingsHalalas - day.captainEarningsHalalas - day.givebackHalalas,
            day.grossBookingsHalalas,
          ),
        })),
      },
      comparison: null,
      higherIsBetter: true,
      awaitingStore: null,
    },
  ]

  const givebackLines: Array<[string, Halalas]> = [
    ['fin.overview.giveback.promo', data.promoHalalas],
    ['fin.overview.giveback.referral', data.referralHalalas],
    ['fin.overview.giveback.incentive', data.incentiveHalalas],
    ['fin.overview.giveback.refunds', data.refundsHalalas],
    ['fin.overview.giveback.goodwill', data.goodwillHalalas],
    ['fin.overview.giveback.emergency', data.emergencyCoverHalalas],
  ]
  const ranked = [...givebackLines].sort((a, b) => b[1] - a[1])
  const largest = Math.max(...ranked.map(([, value]) => value))
  /* R5-6 §9.1 — every row is SAR over one denominator, and a bar is drawn only
     where the rows differ. A negative net (emergency cover) draws none. */
  const bar = ranked.length > 0 && largest > Math.min(...ranked.map(([, value]) => value))

  const rows: MetricBreakdownRow[] = ranked.map(([key, value]) => ({
    id: key,
    label: { kind: 'key', key, params: null },
    subLabelKey: 'fin.overview.giveback.share',
    subLabelParams: {
      shareOfGiveback: share(value, now.givebackHalalas) ?? '',
      shareOfMargin: share(value, now.grossMarginHalalas) ?? '',
    },
    value,
    unit: 'money',
    currency: 'SAR',
    barFraction: bar && largest > 0 ? Math.max(0, Math.min(1, value / largest)) : null,
    drilldownRoute: null,
  }))

  const breakdowns: MetricBreakdown[] = [
    {
      key: 'financials.overview.giveback',
      dimension: 'giveback-line',
      rowsShown: rows.length,
      rowsTotal: rows.length,
      bar,
      caveat: null,
      awaitingStore: null,
      rows,
    },
  ]

  /* R10 — the standing conditions the BANNER did not take, each linked to the
     view that can act on it (AC-367, AC-356, AC-378). A condition with a count
     of zero is not a decision and does not render. */
  const decisions: DecisionRow[] = [
    {
      id: 'payouts',
      labelKey: 'fin.overview.decision.payouts',
      whereKey: 'subtab.financials.payouts',
      count: data.failedPayoutCount,
      route: '/financials/payouts?view=payouts',
    },
    {
      id: 'credit-notes',
      labelKey: 'fin.overview.decision.creditNotes',
      whereKey: 'subtab.financials.revenue',
      count: data.unlinkedCreditNoteCount,
      route: '/financials/revenue?view=credit-notes',
    },
    {
      id: 'cash',
      labelKey: 'fin.overview.decision.cash',
      whereKey: 'subtab.financials.cash',
      count: data.escalatedCashReportCount,
      route: '/financials/cash?view=reconciliation-queue',
    },
  ].filter((row) => row.count > 0)

  return {
    asOf: data.asOf,
    period: data.period,
    comparisonPeriod: before?.period ?? null,
    leads,
    flows,
    positions,
    series,
    breakdowns,
    decisions,
  }
}
