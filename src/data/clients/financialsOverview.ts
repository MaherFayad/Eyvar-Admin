/**
 * Financials › Overview.
 *
 * **Every tile is computed from postings.** The legacy Finance page's seven KPI
 * tiles are static HTML strings (`:931`–`:939`) and three of them contradict
 * the live data five rows below them (`12a` R12): the header claims
 * `Eyvar net 9,246 / 19.2%` above a table saying `8,752 / 18.1%`, `501.98` held
 * in escrow above a `renderEscrow()` that computes `138.40` from the same
 * array, and `65.00` in deductions above a pending sum of `45.00`.
 *
 * AC-346 is the criterion that stops that returning, and the only way to make
 * it structurally true is for the client to compute rather than to look up.
 * Nothing on `FinancialsOverview` is a literal.
 *
 * The **derived** fields of §6.2 — gross margin, contribution margin and their
 * two percentages — are deliberately absent from the response. They are one
 * subtraction and one division each, they must be computed identically on
 * Overview and on Revenue & Refunds (AC-347), and the `null`-when-gross-is-zero
 * rule that makes AC-342 render `—` belongs with the formatter, not with six
 * copies of `a / b`.
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { EYVAR_NOW } from '../mock/clock'
import { mock } from '../mock/delay'
import { FINANCIALS_PERIOD } from '../serverPolicy'
import type {
  FinancialsComparison,
  FinancialsDailyPoint,
  FinancialsOverview,
  FinancialsPeriod,
} from '../types/financials'
import type { JournalEntry } from '../types/ledger'
import { http } from './http'
import { accountBalanceFrom, accountFlowFrom, journalEntries } from './ledger'
import { captainPayoutRows, escrowHoldRows } from './payouts'
import { captainDebtRows, cashReportRows } from './cash'
import { allCreditNotes } from './revenue'
import { onFixturesLoaded, type Fixtures } from '../mock/fixtures'

/* Late-bound fixture rows. `mock/fixtures.ts` says why this is not a static
   import: a static one pins seeded data into every build, including the http
   build that can never read it. Bound before any mock read, because `mock()`
   and `mockMutation()` await `loadFixtures()`. */
let refusedPostingFixtures!: Fixtures['refusedPostingFixtures']
onFixturesLoaded((f) => {
  refusedPostingFixtures = f.refusedPostingFixtures
})

export const OVERVIEW_OPERATIONS = { get: 'financials.overview' } as const
/* Registered at module load, not on first call. `config.ts` says *"each client
   registers its ids here at module load"*, and `mock()` only registers when it
   runs — so an operation nobody has invoked yet is missing from a QA panel's
   list and from any validation of `?mockFail=`. Every id in this module is
   listed the moment the module is imported. */
registerOperations(...Object.values(OVERVIEW_OPERATIONS))

const MS_PER_DAY = 86_400_000

const pad = (n: number) => String(n).padStart(2, '0')

/** `2026-06-01` as a UTC day number, so day arithmetic never touches a timezone. */
function dayNumber(day: string): number {
  const [year = 2026, month = 1, date = 1] = day.split('-').map(Number)
  return Date.UTC(year, month - 1, date) / MS_PER_DAY
}

function dayString(dayNo: number): string {
  const at = new Date(dayNo * MS_PER_DAY)
  return `${at.getUTCFullYear()}-${pad(at.getUTCMonth() + 1)}-${pad(at.getUTCDate())}`
}

/** The last day of the calendar month `day` falls in — day 0 of the next one. */
function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/**
 * §2.1's comparison window. A whole calendar month compares against the
 * previous calendar month, which is what a close process recognises; any other
 * range compares against the equal-length window ending the day before it, so a
 * seven-day read is never measured against a month.
 */
export function previousPeriod(period: FinancialsPeriod): FinancialsPeriod {
  const [year = 2026, month = 1, first = 1] = period.start.split('-').map(Number)
  const [, , last = 1] = period.end.split('-').map(Number)
  if (first === 1 && last === lastDayOfMonth(year, month)) {
    const anchor = new Date(Date.UTC(year, month - 2, 1))
    const y = anchor.getUTCFullYear()
    const m = anchor.getUTCMonth() + 1
    return { start: `${y}-${pad(m)}-01`, end: `${y}-${pad(m)}-${pad(lastDayOfMonth(y, m))}` }
  }
  const days = dayNumber(period.end) - dayNumber(period.start) + 1
  const end = dayNumber(period.start) - 1
  return { start: dayString(end - days + 1), end: dayString(end) }
}

/** Every day in the window, inclusive, ascending — never only the days that posted. */
function daysOf(period: FinancialsPeriod): string[] {
  const out: string[] = []
  for (let at = dayNumber(period.start); at <= dayNumber(period.end); at += 1) {
    out.push(dayString(at))
  }
  return out
}

/** The six giveback lines over one window, netting emergency cover (`:20015`). */
function givebackOver(
  entries: readonly JournalEntry[],
  window: { from: string; to: string },
): {
  promoHalalas: number
  referralHalalas: number
  incentiveHalalas: number
  refundsHalalas: number
  goodwillHalalas: number
  emergencyCoverHalalas: number
} {
  return {
    promoHalalas: accountFlowFrom(entries, 'expense.promo', 'debit', window),
    referralHalalas: accountFlowFrom(entries, 'expense.referral', 'debit', window),
    incentiveHalalas: accountFlowFrom(entries, 'expense.incentive', 'debit', window),
    refundsHalalas: accountFlowFrom(entries, 'contra.refunds', 'debit', window),
    goodwillHalalas: accountFlowFrom(entries, 'expense.goodwill', 'debit', window),
    emergencyCoverHalalas:
      accountFlowFrom(entries, 'expense.emergency', 'debit', window) -
      accountFlowFrom(entries, 'expense.emergency', 'credit', window),
  }
}

/** Gross is captured payments only — fare revenue plus output VAT (`12a` R14). */
function grossOver(
  entries: readonly JournalEntry[],
  window: { from: string; to: string },
): number {
  return (
    accountFlowFrom(entries, 'revenue.fares', 'credit', window) +
    accountFlowFrom(entries, 'tax.vat_output', 'credit', window)
  )
}

export interface OverviewQuery {
  /** Defaults to `FINANCIALS_PERIOD` — the month containing `EYVAR_NOW`. */
  period?: FinancialsPeriod
  signal?: AbortSignal
}

/**
 * GET /api/v1/financials/overview
 *   params: from · to
 *   -> FinancialsOverview
 *
 * Changing the period changes every figure (AC-353), which is why the window is
 * threaded into each flow rather than applied once at the end.
 */
export async function getFinancialsOverview(
  query: OverviewQuery = {},
): Promise<FinancialsOverview> {
  const period = query.period ?? FINANCIALS_PERIOD
  if (DATA_SOURCE === 'http') {
    return http.get<FinancialsOverview>(
      '/financials/overview',
      { from: period.start, to: period.end },
      { signal: query.signal },
    )
  }
  return mock(OVERVIEW_OPERATIONS.get, query.signal, () => {
    const entries = journalEntries()
    const window = { from: period.start, to: period.end }

    const grossBookingsHalalas = grossOver(entries, window)

    /* Cancelled trips carry no `driver_accrual` entry in this dataset, so they
       cannot depress the margin here the way they do in legacy — the filter is
       structural rather than a condition somebody has to remember. */
    const captainEarningsHalalas = accountFlowFrom(entries, 'expense.driver_pay', 'debit', window)

    const giveback = givebackOver(entries, window)

    let totalDebitsHalalas = 0
    let totalCreditsHalalas = 0
    for (const entry of entries) {
      for (const line of entry.lines) {
        if (line.direction === 'debit') totalDebitsHalalas += line.amountHalalas
        else totalCreditsHalalas += line.amountHalalas
      }
    }

    /* **Live rows, not the fixture arrays.** Every one of these counts moved
       when a mutation moved it and the tile did not, which is AC-346's failure
       in miniature: a header figure contradicting the table five rows below it
       (`12a` R12). Reading the same state the sub-tab reads is the only version
       of "computed, not looked up" that survives a mutation. */
    const held = escrowHoldRows().filter((e) => e.settlement === 'held')

    /* §2.2 — one bucket per DAY in the window, including the eleven June days
       with no posting at all. A day the books were quiet is a measured zero;
       the plot's gap comes from `percentOrNull` over it, never from a hole in
       this array. */
    const bucketsOver = (window: FinancialsPeriod): FinancialsDailyPoint[] =>
      daysOf(window).map((date) => {
        const day = { from: date, to: date }
        const lines = givebackOver(entries, day)
        return {
          date,
          grossBookingsHalalas: grossOver(entries, day),
          captainEarningsHalalas: accountFlowFrom(entries, 'expense.driver_pay', 'debit', day),
          givebackHalalas:
            lines.promoHalalas +
            lines.referralHalalas +
            lines.incentiveHalalas +
            lines.refundsHalalas +
            lines.goodwillHalalas +
            lines.emergencyCoverHalalas,
        }
      })

    const daily: FinancialsDailyPoint[] = bucketsOver(period)

    /* §2.1 — the same flows over the previous window, and the balances as at
       its end. `null` on the first window of trading, so a delta is never
       computed against a period that does not exist. */
    const before = previousPeriod(period)
    const beforeWindow = { from: before.start, to: before.end }
    const postedBefore = entries.filter(
      (entry) => Date.parse(entry.postedAt) <= Date.parse(`${before.end}T23:59:59.999+03:00`),
    )
    const heldBefore = escrowHoldRows().filter(
      (e) =>
        Date.parse(e.heldSince) <= Date.parse(`${before.end}T23:59:59.999+03:00`) &&
        (e.releasedAt === null ||
          Date.parse(e.releasedAt) > Date.parse(`${before.end}T23:59:59.999+03:00`)),
    )
    const comparison: FinancialsComparison | null =
      postedBefore.length === 0
        ? null
        : {
            period: before,
            grossBookingsHalalas: grossOver(entries, beforeWindow),
            captainEarningsHalalas: accountFlowFrom(
              entries,
              'expense.driver_pay',
              'debit',
              beforeWindow,
            ),
            ...givebackOver(entries, beforeWindow),
            pendingPayoutsHalalas: accountBalanceFrom(postedBefore, 'liability.driver'),
            escrowHeldHalalas: heldBefore.reduce((s, e) => s + e.amountHalalas, 0),
            /* Escrow readiness and captain debt carry no history — see
               `FinancialsComparison`. `null`, not a number nobody has. */
            escrowReadyHalalas: null,
            captainDebtHalalas: null,
            riderWalletLiabilityHalalas: accountBalanceFrom(postedBefore, 'liability.wallet'),
          }

    return {
      period,
      asOf: EYVAR_NOW,
      lifetimePostings: entries.length,
      comparison,
      daily,
      /* `null` iff `comparison` is `null` — the dotted line and the delta are
         the same claim about the same window. */
      dailyComparison: comparison === null ? null : bucketsOver(comparison.period),
      grossBookingsHalalas,
      captainEarningsHalalas,

      /* Promo, referral and incentive are ordinary GL flows, which is what makes
         contribution derivable from the trial balance (AC-455). A refund is
         counted once, in `refundsHalalas` and nowhere else (AC-352). Read by the
         same helper as the comparison window, so the two cannot drift. */
      ...giveback,

      pendingPayoutsHalalas: accountBalanceFrom(entries, 'liability.driver'),
      escrowHeldHalalas: held.reduce((s, e) => s + e.amountHalalas, 0),
      /* "Ready" is `tripsCompleted >= tripsRequired`, computed — never stored,
         which is D-F19. */
      escrowReadyHalalas: held
        .filter((e) => e.tripsCompleted >= e.tripsRequired)
        .reduce((s, e) => s + e.amountHalalas, 0),
      /* Positive balances only: a captain in credit does not offset another
         captain's debt (AC-350). The full signed total lives on the Cash
         sub-tab, where AC-381 requires it. */
      captainDebtHalalas: captainDebtRows()
        .filter((c) => c.balanceHalalas > 0)
        .reduce((s, c) => s + c.balanceHalalas, 0),
      riderWalletLiabilityHalalas: accountBalanceFrom(entries, 'liability.wallet'),

      trialBalanceBalanced: totalDebitsHalalas === totalCreditsHalalas,
      trialBalanceDifferenceHalalas: totalDebitsHalalas - totalCreditsHalalas,
      refusedPostingCount: refusedPostingFixtures.length,
      failedPayoutCount: captainPayoutRows().filter((p) => p.state === 'failed').length,
      unlinkedCreditNoteCount: allCreditNotes().filter((n) => n.unlinked).length,
      escalatedCashReportCount: cashReportRows().filter((r) => r.status === 'escalated').length,
    }
  })
}
