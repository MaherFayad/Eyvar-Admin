/**
 * Financials › Cash & Captain Debt.
 *
 * **Two patterns on one route, not one hybrid.** The reconciliation queue is a
 * §8.4 work queue — it has a claim, a closed set of two dispositions, and rows
 * that convert in place. The captain debt ledger is a §8.3 ledger — no
 * selection, no sort, no row actions. Foundation §3.4 already says so, and the
 * two rule sets do not mix.
 *
 * ## The SLA, and why every clock field here is null
 *
 * §7.3 and AC-374 require an SLA countdown and a past-SLA state on this queue.
 * **No window exists.** The legacy cash module enforces none, a cash report
 * carries no reason code to look one up from (`rcTargets`, `:14730`), and
 * `types/workQueue.ts`'s own rule is that an invented window must not hide
 * among measured ones — which is why `slaSource: 'unset'` exists and why
 * `Applicant` uses it.
 *
 * So the queue ships with ownership, claims and take-over fully working and no
 * countdown, and the window is a product decision. Recorded in the handoff.
 */

import { DATA_SOURCE } from '../config'
import { EYVAR_NOW, toInstant } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import { computeFacets, runQuery, type QueryShape } from '../mock/query'
import {
  CASH_DEBT_CAP_HALALAS,
  cashReportFixtures,
  captainDebtFixtures,
  FINANCIALS_PERIOD,
} from '../fixtures/financials'
import { CURRENT_USER_ID, teamUserFixtures } from '../fixtures/teamUsers'
import { ApiError, type Facets, type Paginated, type QueryParams } from '../types/common'
import type { CaptainDebt, CashReport, FinancialsPeriod } from '../types/financials'
import type { Ledger } from '../types/ledger'
import { appendAudit } from './audit'
import {
  allLedgerPostings,
  buildLedger,
  postEntry,
  resolveSubjectName,
  subjectClosingBalance,
  subjectIdsFor,
} from './ledger'
import { nextClaim } from './requests'
import { http } from './http'

export const CASH_OPERATIONS = {
  list: 'cash.list',
  facets: 'cash.facets',
  get: 'cash.get',
  claim: 'cash.claim',
  release: 'cash.release',
  resolve: 'cash.resolve',
  escalate: 'cash.escalate',
  debts: 'cash.debts',
  ledger: 'cash.ledger',
  repayment: 'cash.repayment',
} as const

let reportState: CashReport[] = cashReportFixtures.map((r) => ({ ...r }))
let debtState: CaptainDebt[] = captainDebtFixtures.map((d) => ({ ...d }))

export function resetCash(): void {
  reportState = cashReportFixtures.map((r) => ({ ...r }))
  debtState = captainDebtFixtures.map((d) => ({ ...d }))
}

/**
 * **`balanceHalalas` is the `ar.driver` closing balance, read, not carried.**
 *
 * It was a second copy of that number, moved by hand by `recordCashRepayment`
 * and by nothing else — so a payout that netted the debt, or a deduction whose
 * excess landed on the receivable, moved the ledger and left this list stating
 * the old figure. AC-379 says *posting*; the repayment wrote none, and this
 * list was the only thing that moved.
 *
 * The row **set** is the union of the seeded positions and every captain the
 * receivable has ever been posted to, so a captain who acquires a receivable
 * mid-session — `applyDeduction`'s excess does exactly that — appears here
 * rather than being a balance the sub-tab's total cannot see. That is AC-381's
 * rule applied to the population as well as to the sign.
 */
function debtRows(): CaptainDebt[] {
  const seeded = new Map(debtState.map((d) => [d.captainId, d]))
  const captainIds = [...new Set([...seeded.keys(), ...subjectIdsFor('ar.driver')])].sort()
  return captainIds.map((captainId) => {
    const row = seeded.get(captainId)
    const balanceHalalas = subjectClosingBalance('ar.driver', captainId)
    if (row) return { ...row, balanceHalalas }
    /* A captain with a receivable and no seeded position. Cap is server policy;
       the two report figures are genuinely zero until a cash report exists. */
    return {
      captainId,
      captainName: resolveSubjectName('ar.driver', captainId) ?? captainId,
      balanceHalalas,
      capHalalas: CASH_DEBT_CAP_HALALAS,
      lastReportAt: null,
      openReportCount: 0,
    }
  })
}

/** The live rows, for the Overview tile that used to read the fixture array. */
export function captainDebtRows(): CaptainDebt[] {
  return debtRows()
}

/** The live reports, likewise. */
export function cashReportRows(): CashReport[] {
  return reportState
}

/**
 * The next repayment document number, derived from what has been receipted
 * rather than from a module-scope counter. `REPAY-0001` is seeded.
 */
function nextRepaymentReference(): string {
  const issued = allLedgerPostings()
    .filter((p) => p.reference?.startsWith('REPAY-'))
    .map((p) => Number(p.reference!.slice(6)))
    .filter((n) => Number.isFinite(n))
  return `REPAY-${String(Math.max(0, ...issued) + 1).padStart(4, '0')}`
}

/* ──────────────── the reconciliation queue ──────────────────── */

const cashShape: QueryShape<CashReport> = {
  searchable: [(r) => r.id, (r) => r.captainName, (r) => r.riderName, (r) => r.tripId],
  sortable: {
    id: (r) => r.id,
    reportedAt: (r) => r.reportedAt,
    expectedFareHalalas: (r) => r.expectedFareHalalas,
    debtAddedHalalas: (r) => r.debtAddedHalalas,
    captainName: (r) => r.captainName,
    repeatCount: (r) => r.repeatCount,
  },
  filterable: {
    id: (r) => r.id,
    tripId: (r) => r.tripId,
    captainId: (r) => r.captainId,
    riderId: (r) => r.riderId,
    classification: (r) => r.classification,
    status: (r) => r.status,
    riderConfirmed: (r) => r.riderConfirmed,
    claimedBy: (r) => r.claim?.ownerId ?? null,
    unclaimed: (r) => r.claim === null || r.claim.state !== 'claimed',
    /** `null` reported is a state, not a zero. AC-372. */
    neverReported: (r) => r.reportedHalalas === null,
    escalated: (r) => r.status === 'escalated',
    repeat: (r) => r.repeatCount >= 2,
    expectedFareHalalas: (r) => r.expectedFareHalalas,
    debtAddedHalalas: (r) => r.debtAddedHalalas,
    reportedAt: (r) => toInstant(r.reportedAt),
    resolvedAt: (r) => toInstant(r.resolvedAt),
    slaSource: (r) => r.slaSource,
  },
  facetable: ['classification', 'status', 'captainId', 'claimedBy'],
  views: {
    /* The route table's three (§5). `reconciliation-queue` is the default. */
    'reconciliation-queue': (r) => r.status === 'pending' || r.status === 'escalated',
    all: () => true,
    pending: (r) => r.status === 'pending',
    escalated: (r) => r.status === 'escalated',
    resolved: (r) => r.status === 'resolved',
    mine: (r) => r.claim?.state === 'claimed' && r.claim.ownerId === CURRENT_USER_ID,
    unassigned: (r) => r.claim === null || r.claim.state !== 'claimed',
  },
}

/**
 * GET /api/v1/cash-reports
 *   params: q · page · pageSize · sort · filter ·
 *           view=reconciliation-queue|all|pending|escalated|resolved|mine|unassigned
 *   -> Paginated<CashReport>
 *
 * **Rendering the queue writes nothing.** No audit entry, no ownership record —
 * legacy claims on open (`:19301`), which means opening a report to look at it
 * takes it away from whoever was working it (AC-375, AC-376).
 *
 * `deviationHalalas` is **derived** — `reported − topup − expected` — and is
 * `null` when never reported, so it is not on the wire.
 */
export async function listCashReports(
  params: QueryParams = {},
  signal?: AbortSignal,
): Promise<Paginated<CashReport>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<CashReport>>('/cash-reports', { ...params }, { signal })
  }
  return mock(CASH_OPERATIONS.list, signal, () => runQuery(reportState, params, cashShape))
}

/**
 * GET /api/v1/cash-reports/facets
 *   params: view
 *   -> Facets
 */
export async function getCashFacets(view?: string | null, signal?: AbortSignal): Promise<Facets> {
  if (DATA_SOURCE === 'http') {
    return http.get<Facets>('/cash-reports/facets', { view: view ?? undefined }, { signal })
  }
  return mock(CASH_OPERATIONS.facets, signal, () => computeFacets(reportState, cashShape, view))
}

/**
 * GET /api/v1/cash-reports/:id
 *   -> CashReport
 */
export async function getCashReport(id: string, signal?: AbortSignal): Promise<CashReport> {
  if (DATA_SOURCE === 'http') return http.get<CashReport>(`/cash-reports/${id}`, undefined, { signal })
  return mock(CASH_OPERATIONS.get, signal, () => {
    const row = reportState.find((r) => r.id === id)
    if (!row) throw notFound('cash report', id)
    return row
  })
}

/**
 * POST /api/v1/cash-reports/:id/claim
 *   body: { takeOver?: boolean }  ·  409 when another operator holds it
 *   -> CashReport
 */
export async function claimCashReport(
  id: string,
  opts: { takeOver?: boolean } = {},
  signal?: AbortSignal,
): Promise<CashReport> {
  if (DATA_SOURCE === 'http') {
    return http.post<CashReport>(`/cash-reports/${id}/claim`, opts, { signal })
  }
  return mockMutation(CASH_OPERATIONS.claim, signal, () => {
    const row = reportState.find((r) => r.id === id)
    if (!row) throw notFound('cash report', id)
    const next = { ...row, claim: nextClaim('cash', id, row.claim, opts.takeOver) }
    reportState = reportState.map((r) => (r.id === id ? next : r))
    return next
  })
}

/**
 * POST /api/v1/cash-reports/:id/release
 *   -> CashReport
 */
export async function releaseCashReport(id: string, signal?: AbortSignal): Promise<CashReport> {
  if (DATA_SOURCE === 'http') {
    return http.post<CashReport>(`/cash-reports/${id}/release`, undefined, { signal })
  }
  return mockMutation(CASH_OPERATIONS.release, signal, () => {
    const row = reportState.find((r) => r.id === id)
    if (!row) throw notFound('cash report', id)
    if (!row.claim) return row
    const next: CashReport = {
      ...row,
      claim: {
        ...row.claim,
        state: 'released',
        releasedAt: EYVAR_NOW,
        releaseReason: 'manual',
      },
    }
    reportState = reportState.map((r) => (r.id === id ? next : r))
    return next
  })
}

/**
 * POST /api/v1/cash-reports/:id/decide
 *   body: { disposition: 'resolve' | 'escalate', reasonCode }
 *   -> CashReport
 *   409 when already decided  ·  422 without a reason code
 *
 * **A closed set of two dispositions**, and the row **converts in place** — it
 * stays in the list showing its disposition, its decider and the time. It does
 * not disappear on click (AC-377).
 */
export async function decideCashReport(
  id: string,
  disposition: 'resolve' | 'escalate',
  reasonCode: string,
  signal?: AbortSignal,
): Promise<CashReport> {
  if (DATA_SOURCE === 'http') {
    return http.post<CashReport>(`/cash-reports/${id}/decide`, { disposition, reasonCode }, { signal })
  }
  const operation = disposition === 'resolve' ? CASH_OPERATIONS.resolve : CASH_OPERATIONS.escalate
  return mockMutation(operation, signal, () => {
    const row = reportState.find((r) => r.id === id)
    if (!row) throw notFound('cash report', id)
    if (!reasonCode.trim()) {
      throw new ApiError({
        status: 422,
        kind: 'validation',
        code: 'reason_code_required',
        message: 'A decision needs a reason',
        details: [{ field: 'reasonCode', code: 'required', message: 'Choose a reason' }],
        retryable: false,
      })
    }
    if (row.status === 'resolved') {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'already_decided',
        message: `${id} is already resolved`,
        retryable: false,
      })
    }
    const me = teamUserFixtures.find((u) => u.id === CURRENT_USER_ID)!
    const next: CashReport = {
      ...row,
      status: disposition === 'resolve' ? 'resolved' : 'escalated',
      resolvedAt: EYVAR_NOW,
      resolvedByUserId: me.id,
      resolvedByUserName: me.name,
      resolutionReasonCode: reasonCode,
    }
    reportState = reportState.map((r) => (r.id === id ? next : r))
    appendAudit({
      action: disposition === 'resolve' ? 'cash.resolve' : 'cash.escalate',
      subjectType: 'captain',
      subjectId: row.captainId,
      amountHalalas: row.debtAddedHalalas,
      reasonCode,
      note: null,
      detail: { key: `fin.audit.cash.${disposition}`, params: { reference: id } },
    })
    return next
  })
}

/* ─────────────────── the captain debt ledger ────────────────── */

const debtShape: QueryShape<CaptainDebt> = {
  searchable: [(d) => d.captainId, (d) => d.captainName],
  sortable: {
    captainName: (d) => d.captainName,
    balanceHalalas: (d) => d.balanceHalalas,
    lastReportAt: (d) => d.lastReportAt,
    openReportCount: (d) => d.openReportCount,
  },
  filterable: {
    captainId: (d) => d.captainId,
    captainName: (d) => d.captainName,
    balanceHalalas: (d) => d.balanceHalalas,
    /** Derived server-side: `balance >= cap`. Cash collection is suspended past it. */
    overCap: (d) => d.balanceHalalas >= d.capHalalas,
    inCredit: (d) => d.balanceHalalas < 0,
    openReportCount: (d) => d.openReportCount,
    lastReportAt: (d) => toInstant(d.lastReportAt),
  },
  facetable: ['captainId'],
  views: {
    'captain-debt-ledger': () => true,
    all: () => true,
    'over-cap': (d) => d.balanceHalalas >= d.capHalalas,
    'in-credit': (d) => d.balanceHalalas < 0,
  },
}

/**
 * GET /api/v1/captain-debts
 *   params: q · page · pageSize · sort · filter · view=all|over-cap|in-credit
 *   -> Paginated<CaptainDebt>
 *
 * **Every captain with a non-zero receivable, in both directions** (AC-381).
 * The debt *total* is the signed sum; the Overview tile is the positive-only
 * sum; the reconciliation view carries the gap between them as a row rather
 * than hiding it.
 */
export async function listCaptainDebts(
  params: QueryParams = {},
  signal?: AbortSignal,
): Promise<Paginated<CaptainDebt>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<CaptainDebt>>('/captain-debts', { ...params }, { signal })
  }
  return mock(CASH_OPERATIONS.debts, signal, () => runQuery(debtRows(), params, debtShape))
}

/**
 * GET /api/v1/ledgers/ar.driver/:captainId
 *   params: from · to · page · pageSize
 *   -> Ledger
 *
 * `debit` means the captain owes more (commission on a cash fare, a wallet
 * top-up they collected); `credit` means they repaid (§3.2). Positive balance
 * means the captain owes Eyvar — **the opposite sign to `DB.driverCashDebt`**,
 * which stores debt negative and makes every reader negate it (`:12082`).
 */
export async function getCaptainDebtLedger(
  captainId: string,
  period: FinancialsPeriod = FINANCIALS_PERIOD,
  signal?: AbortSignal,
): Promise<Ledger> {
  if (DATA_SOURCE === 'http') {
    return http.get<Ledger>(
      `/ledgers/ar.driver/${captainId}`,
      { from: period.start, to: period.end },
      { signal },
    )
  }
  return mock(CASH_OPERATIONS.ledger, signal, () =>
    buildLedger('ar.driver', captainId, resolveSubjectName('ar.driver', captainId), {
      from: period.start,
      to: period.end,
    }),
  )
}

/**
 * POST /api/v1/captain-debts/:captainId/repayment
 *   body: { amountHalalas, reasonCode }
 *   -> CaptainDebt
 *   422 on a non-positive amount or an amount above the balance
 *
 * **Partial repayment is the point** (AC-379). `commitCashRepayment` sets the
 * debt to `0` by assignment, with no amount field at all, and the modal copy
 * states this as a feature — *"Recording this clears the full outstanding
 * balance to zero"* (`:12197`) — which makes a captain who repays 100 of 300
 * SAR fully paid up (**D-F5**).
 *
 * | Leg | Ledger | Direction | Amount |
 * |---|---|---|---|
 * | 1 | `ar.driver` (the captain) | credit | exactly the amount tendered |
 * | GL | `cash.gateway` | debit | the same |
 *
 * **AC-379 says *posting*, and until this pass there was none.** The debt row
 * moved and the receivable ledger did not, so the sub-tab and the captain's own
 * ledger stated different amounts outstanding — and the ledger was the wrong
 * one. The recipe is `JE-00055`'s, which the seeded repayment already uses.
 */
export async function recordCashRepayment(
  captainId: string,
  amountHalalas: number,
  reasonCode: string,
  signal?: AbortSignal,
): Promise<CaptainDebt> {
  if (DATA_SOURCE === 'http') {
    return http.post<CaptainDebt>(
      `/captain-debts/${captainId}/repayment`,
      { amountHalalas, reasonCode },
      { signal },
    )
  }
  return mockMutation(CASH_OPERATIONS.repayment, signal, () => {
    const row = debtRows().find((d) => d.captainId === captainId)
    if (!row) throw notFound('captain debt', captainId)
    if (!Number.isInteger(amountHalalas) || amountHalalas <= 0) {
      throw new ApiError({
        status: 422,
        kind: 'validation',
        code: 'amount_invalid',
        message: 'Enter an amount above zero, in whole halalas',
        details: [{ field: 'amountHalalas', code: 'positive', message: 'Enter an amount' }],
        retryable: false,
      })
    }
    if (amountHalalas > row.balanceHalalas) {
      throw new ApiError({
        status: 422,
        kind: 'validation',
        code: 'amount_above_balance',
        message: `${row.captainName} owes ${row.balanceHalalas} halalas`,
        details: [{ field: 'amountHalalas', code: 'max', message: String(row.balanceHalalas) }],
        retryable: false,
      })
    }
    const me = teamUserFixtures.find((u) => u.id === CURRENT_USER_ID)!
    const reference = nextRepaymentReference()

    /* **The balance moves because the posting moved it.** Never assigned. */
    postEntry({
      type: 'cash_repayment',
      reference: `cash_repayment|${reference}`,
      meta: { captainId, repaymentId: reference, actorId: me.id },
      postings: [
        {
          idPrefix: `ARD-${captainId.replace(/^DRV-/, '')}`,
          subjectAccount: 'ar.driver',
          subjectId: captainId,
          direction: 'credit',
          amountHalalas,
          description: { key: 'fin.posting.cashRepayment' },
          reference,
          sourceType: 'cash-report',
          sourceId: reference,
          actorId: me.id,
          reasonCode,
        },
      ],
      counterLines: [{ account: 'cash.gateway', direction: 'debit', amountHalalas }],
    })

    const next = debtRows().find((d) => d.captainId === captainId)!
    appendAudit({
      action: 'cash.repayment',
      subjectType: 'captain',
      subjectId: captainId,
      amountHalalas,
      reasonCode,
      note: null,
      detail: {
        key: 'fin.audit.cashRepayment',
        params: { remainingHalalas: next.balanceHalalas },
      },
    })
    return next
  })
}

/** Server policy, exposed so a screen states the cap it is comparing against. */
export function cashDebtCapHalalas(): number {
  return CASH_DEBT_CAP_HALALAS
}
