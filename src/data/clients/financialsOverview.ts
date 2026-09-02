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
import { mock } from '../mock/delay'
import { FINANCIALS_PERIOD } from '../serverPolicy'
import type { FinancialsOverview, FinancialsPeriod } from '../types/financials'
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

    /* Gross is captured payments only — the fare-revenue and output-VAT credits
       in the window. Legacy filters this correctly and then fails to filter the
       other side (`:15721` vs `:15722`, `12a` R14). */
    const grossBookingsHalalas =
      accountFlowFrom(entries, 'revenue.fares', 'credit', window) +
      accountFlowFrom(entries, 'tax.vat_output', 'credit', window)

    /* Cancelled trips carry no `driver_accrual` entry in this dataset, so they
       cannot depress the margin here the way they do in legacy — the filter is
       structural rather than a condition somebody has to remember. */
    const captainEarningsHalalas = accountFlowFrom(entries, 'expense.driver_pay', 'debit', window)

    /* Emergency cover nets the absentee's forfeiture against the replacement's
       pay: two movements, one cost line (`:20015`). */
    const emergencyCoverHalalas =
      accountFlowFrom(entries, 'expense.emergency', 'debit', window) -
      accountFlowFrom(entries, 'expense.emergency', 'credit', window)

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

    return {
      period,
      grossBookingsHalalas,
      captainEarningsHalalas,

      /* **The three lines that used to come from outside the books.** They were
         `givebackOperationalFixture` — operational figures served beside a trial
         balance rather than inside it — because the closed chart had no account
         for any of them. The owner opened it, so all three are now ordinary GL
         flows read exactly like every other line on this card.

         This is what makes `contributionMarginHalalas` derivable from the trial
         balance, and the contribution margin is one of the two numbers the Owner
         is asked to be able to state (`owner.position`). */
      promoHalalas: accountFlowFrom(entries, 'expense.promo', 'debit', window),
      referralHalalas: accountFlowFrom(entries, 'expense.referral', 'debit', window),
      incentiveHalalas: accountFlowFrom(entries, 'expense.incentive', 'debit', window),

      /* A refund is counted **once**, here and nowhere else. Legacy books the
         cancellation path as `refunds` *and* as `goodwill` (`12a` R1) and the
         contribution card subtracts it twice (AC-352). */
      refundsHalalas: accountFlowFrom(entries, 'contra.refunds', 'debit', window),
      goodwillHalalas: accountFlowFrom(entries, 'expense.goodwill', 'debit', window),
      emergencyCoverHalalas,

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
