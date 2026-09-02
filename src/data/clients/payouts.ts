/**
 * Financials › Payouts & Escrow.
 *
 * Four views on one route: `All postings` (the `liability.driver` ledger),
 * `Payouts`, `Escrow`, `Deductions`.
 *
 * Three legacy behaviours this client refuses to reproduce:
 *
 *   - `payDriver` hard-assigns `pending = 0` (`:7030`). A payout here is a
 *     **debit posting**; the balance moves because the posting moved it, so
 *     reversing the payout restores the previous balance exactly (AC-363).
 *   - `releaseEscrow` splices the hold out of the array (`:7064`). Here it
 *     transitions and stays visible (AC-364).
 *   - Captain cash debt is **never actually netted off a payout** despite the
 *     page copy at `:1000` saying it is (**D-F6**). `payCaptain` commits the
 *     net and says so in three labelled lines (AC-366).
 *
 * ## And one this client itself shipped, now closed
 *
 * `payCaptain`, `releaseEscrow` and `applyDeduction` each moved a **summary**
 * figure and wrote an **audit entry**, and none of them wrote a
 * `LedgerPosting`. AC-362, AC-364 and AC-371 each say *posting*. The payouts
 * index converted to `Paid` and the payable dropped while the captain's payable
 * ledger showed nothing and its closing balance did not move — the summary and
 * the ledger stating different facts about the same money, **with the ledger as
 * the wrong one**, which is worse, because the ledger is the record. It also
 * left AC-363's second clause unreachable: there was no posting to reverse.
 *
 * All three now write through `postEntry` (`clients/ledger.ts`), and the two
 * balances on `CaptainPayout` are **read from the ledger** rather than carried
 * beside it, so agreement is structural rather than remembered.
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { EYVAR_NOW, toInstant } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import { computeFacets, runQuery, type QueryShape } from '../mock/query'
import { FINANCIALS_PERIOD } from '../serverPolicy'
import { ApiError, type Facets, type Halalas, type Paginated, type QueryParams } from '../types/common'
import type {
  CaptainPayout,
  Deduction,
  EscrowHold,
  FinancialsPeriod,
} from '../types/financials'
import type { Ledger } from '../types/ledger'
import { appendAudit } from './audit'
import {
  allLedgerPostings,
  buildLedger,
  postEntry,
  resolveSubjectName,
  subjectClosingBalance,
} from './ledger'
import { http } from './http'
import { currentMockUserId } from './session'
import { fixturesLoaded, onFixturesLoaded, type Fixtures } from '../mock/fixtures'

/* Late-bound fixture rows. `mock/fixtures.ts` says why this is not a static
   import: a static one pins seeded data into every build, including the http
   build that can never read it. Bound before any mock read, because `mock()`
   and `mockMutation()` await `loadFixtures()`. */
let captainPayoutFixtures!: Fixtures['captainPayoutFixtures']
let deductionFixtures!: Fixtures['deductionFixtures']
let escrowHoldFixtures!: Fixtures['escrowHoldFixtures']
let teamUserFixtures!: Fixtures['teamUserFixtures']
onFixturesLoaded((f) => {
  captainPayoutFixtures = f.captainPayoutFixtures
  deductionFixtures = f.deductionFixtures
  escrowHoldFixtures = f.escrowHoldFixtures
  teamUserFixtures = f.teamUserFixtures
  /* Seeded here rather than at module load: these locals are built from
     late-bound fixtures, which are undefined until the fixture chunk lands. */
  payoutState = captainPayoutFixtures.map((p) => ({ ...p }))
  escrowState = escrowHoldFixtures.map((e) => ({ ...e }))
  deductionState = deductionFixtures.map((d) => ({ ...d }))
})

export const PAYOUT_OPERATIONS = {
  list: 'payouts.list',
  facets: 'payouts.facets',
  ledger: 'payouts.ledger',
  pay: 'payouts.pay',
  escrow: 'payouts.escrow',
  releaseEscrow: 'payouts.releaseEscrow',
  deductions: 'payouts.deductions',
  applyDeduction: 'payouts.applyDeduction',
  waiveDeduction: 'payouts.waiveDeduction',
} as const

/* Registered at module load, not on first call. `config.ts` says *"each client
   registers its ids here at module load"*, and `mock()` only registers when it
   runs — so an operation nobody has invoked yet is missing from a QA panel's
   list and from any validation of `?mockFail=`. Every id in this module is
   listed the moment the module is imported. */
registerOperations(...Object.values(PAYOUT_OPERATIONS))

let payoutState!: CaptainPayout[]
let escrowState!: EscrowHold[]
let deductionState!: Deduction[]

export function resetPayouts(): void {
  /* Nothing seeded yet: the fixture chunk has not landed, so there is no
     state to reset and the rows this would read are still undefined. The
     binder in this module seeds fresh state when it does land. */
  if (!fixturesLoaded()) return
  payoutState = captainPayoutFixtures.map((p) => ({ ...p }))
  escrowState = escrowHoldFixtures.map((e) => ({ ...e }))
  deductionState = deductionFixtures.map((d) => ({ ...d }))
}

/* ───────────────────────── payouts ──────────────────────────── */

/**
 * **The two balances are read from the ledger, never carried beside it.**
 *
 * `types/financials.ts` already says what these fields are — *"the
 * `liability.driver` balance for this captain"* and *"the `ar.driver`
 * balance"* — and until this pass they were a second copy of those numbers,
 * moved by hand on every act. A second copy is a second answer, and the four
 * acts that moved the copy without moving the ledger are exactly what a second
 * answer buys you.
 *
 * Derived, the agreement is **structural**: the payouts index, the captain's
 * payable ledger, the captain debt sub-tab and the Overview tiles are four
 * views of one number and cannot drift, because there is only one number. The
 * ten seeded captains read identically to the fixture values they replaced —
 * `financials.test.ts` asserts it — so nothing about the initial state changed.
 *
 * `earnedHalalas`, `paidOutHalalas` and `tripsInPeriod` stay on the record:
 * they are **period counters**, not balances, and no ledger holds them.
 */
function payoutRows(): CaptainPayout[] {
  return payoutState.map((p) => ({
    ...p,
    payableHalalas: subjectClosingBalance('liability.driver', p.captainId),
    cashDebtHalalas: subjectClosingBalance('ar.driver', p.captainId),
  }))
}

/** The live escrow rows, for the Overview tile that used to read the fixture array. */
export function escrowHoldRows(): EscrowHold[] {
  return escrowState
}

/** The live payout rows, for the Overview banner count that used to read the fixture array. */
export function captainPayoutRows(): CaptainPayout[] {
  return payoutRows()
}

/**
 * The next payout document number, derived from what has already been issued
 * rather than from a module-scope counter — so it survives `resetPayouts()`
 * and is identical on every run. `PO-0001` – `PO-0003` are seeded.
 */
function nextPayoutReference(): string {
  const issued = allLedgerPostings()
    .filter((p) => p.sourceType === 'payout' && p.reference?.startsWith('PO-'))
    .map((p) => Number(p.reference!.slice(3)))
    .filter((n) => Number.isFinite(n))
  return `PO-${String(Math.max(0, ...issued) + 1).padStart(4, '0')}`
}

/** `DRV-0101` -> `PAY-0101`, the id stem this captain's payable postings already use. */
const payablePrefix = (captainId: string): string => `PAY-${captainId.replace(/^DRV-/, '')}`
/** `DRV-0103` -> `ARD-0103`, likewise on the receivable. */
const receivablePrefix = (captainId: string): string => `ARD-${captainId.replace(/^DRV-/, '')}`

const payoutShape: QueryShape<CaptainPayout> = {
  searchable: [(p) => p.captainId, (p) => p.captainName],
  sortable: {
    captainName: (p) => p.captainName,
    payableHalalas: (p) => p.payableHalalas,
    cashDebtHalalas: (p) => p.cashDebtHalalas,
    earnedHalalas: (p) => p.earnedHalalas,
    tripsInPeriod: (p) => p.tripsInPeriod,
    lastPayoutAt: (p) => p.lastPayoutAt,
  },
  filterable: {
    captainId: (p) => p.captainId,
    captainName: (p) => p.captainName,
    tier: (p) => p.tier,
    state: (p) => p.state,
    payableHalalas: (p) => p.payableHalalas,
    cashDebtHalalas: (p) => p.cashDebtHalalas,
    hasBankAccount: (p) => p.bankAccountLast4 !== null,
    /** The population the R5a banner counts (AC-367). */
    failed: (p) => p.state === 'failed',
    negativePayable: (p) => p.payableHalalas < 0,
    lastPayoutAt: (p) => toInstant(p.lastPayoutAt),
  },
  facetable: ['tier', 'state'],
  views: {
    all: () => true,
    due: (p) => p.state === 'due' && p.payableHalalas > 0,
    failed: (p) => p.state === 'failed',
    'in-debt': (p) => p.cashDebtHalalas > 0,
  },
}

/**
 * GET /api/v1/payouts
 *   params: q · page · pageSize · sort · filter · view=all|due|failed|in-debt
 *   -> Paginated<CaptainPayout>
 *
 * `netPayableHalalas` is **derived** — `payable − cashDebt` — and is not on the
 * wire. It is what the payout action commits (AC-366), which is exactly why it
 * must be computed once from two independently-true server values rather than
 * sent as a third value that can disagree with them.
 */
export async function listCaptainPayouts(
  params: QueryParams = {},
  signal?: AbortSignal,
): Promise<Paginated<CaptainPayout>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<CaptainPayout>>('/payouts', { ...params }, { signal })
  }
  return mock(PAYOUT_OPERATIONS.list, signal, () => runQuery(payoutRows(), params, payoutShape))
}

/**
 * GET /api/v1/payouts/facets
 *   params: view
 *   -> Facets
 */
export async function getPayoutFacets(view?: string | null, signal?: AbortSignal): Promise<Facets> {
  if (DATA_SOURCE === 'http') {
    return http.get<Facets>('/payouts/facets', { view: view ?? undefined }, { signal })
  }
  return mock(PAYOUT_OPERATIONS.facets, signal, () => computeFacets(payoutRows(), payoutShape, view))
}

/**
 * GET /api/v1/ledgers/liability.driver/:captainId
 *   params: from · to · page · pageSize
 *   -> Ledger
 *
 * The captain payable ledger. `credit` means Eyvar owes them more (earnings
 * accrued, escrow released); `debit` means less (a payout, a deduction). The
 * header states that, once, and every row's `direction` is relative to it
 * (§3.2, AC-308).
 */
export async function getCaptainPayableLedger(
  captainId: string,
  period: FinancialsPeriod = FINANCIALS_PERIOD,
  signal?: AbortSignal,
): Promise<Ledger> {
  if (DATA_SOURCE === 'http') {
    return http.get<Ledger>(
      `/ledgers/liability.driver/${captainId}`,
      { from: period.start, to: period.end },
      { signal },
    )
  }
  return mock(PAYOUT_OPERATIONS.ledger, signal, () =>
    buildLedger('liability.driver', captainId, resolveSubjectName('liability.driver', captainId), {
      from: period.start,
      to: period.end,
    }),
  )
}

/**
 * POST /api/v1/payouts/:captainId
 *   body: { reasonCode }
 *
 * **The amount is NOT in the body and must not be.** It is derived server-side
 * as payable minus outstanding cash debt (`netHalalas`, below). This block used
 * to document `amountHalalas`, which `payCaptain` has never had a parameter for
 * -- so a backend built to the old annotation would have 422'd every real payout
 * on the money path, and one that trusted a client-sent amount would be worse.
 *   -> CaptainPayout
 *   409 when there is nothing payable
 *   422 when the amount exceeds the net payable
 *
 * **The amount transferred is the net** — payable minus outstanding cash debt.
 * The page copy at `:1000` and `:1013` has claimed for two versions that the
 * debt is *"deducted automatically from their next payout"* while `payDriver`
 * reads only `p.pending` (`:7026`), so every payout over-pays by the
 * outstanding debt (**D-F6**).
 *
 * ## What it posts (AC-362)
 *
 * | Leg | Ledger | Direction | Amount |
 * |---|---|---|---|
 * | 1 | `liability.driver` | debit | **the net** — the amount actually paid |
 * | GL | `cash.gateway` | credit | the same |
 *
 * AC-362 word for word: *a debit posting on that captain's payable ledger for
 * the amount paid*, and *the payable balance after equals the balance before
 * minus the amount*. One posting, and the balance moves because the posting
 * moved it — never by assignment, which is what `payDriver` does at `:7030`
 * and what makes AC-363 unsatisfiable there.
 *
 * ## The cash debt is NOT written off here, and that is a change
 *
 * This client used to set `cashDebtHalalas: 0` while relieving the payable by
 * only the net. That is a **write-off with no second leg**: the captain ends up
 * owed the residual *and* no longer owing it, `ar.driver` forgiven against
 * nothing. There is no account in the closed chart (§3.8) that could receive
 * the other side, and there should not be — nothing was forgiven.
 *
 * So the receivable is left alone. After paying `DRV-0101`, the payable holds
 * the 23.15 residual and the receivable still holds the 23.15 debt: two
 * offsetting balances, both true, neither invented. The captain was paid the
 * net, and a second payout cannot double-net because the net is then zero and
 * the 409 above refuses it.
 *
 * > **Open, and product-owner's to decide (see the handoff).** Whether the two
 * > should be **set off** against each other — `Dr liability.driver` /
 * > `Cr ar.driver` for the residual, closing both at zero — is a business rule
 * > this spec does not state. AC-362 mandates the payable after is
 * > `before − amount paid`, which is what is implemented; a set-off would make
 * > it `0` and needs AC-362's second sentence amended rather than reinterpreted
 * > by whoever builds it. It is additive when it comes: two more postings on
 * > the same entry, no change to anything here.
 *
 * The mutation **fails cleanly**: an injected failure leaves both the payable
 * and the receivable exactly as they were (AC-430), because `mockMutation`
 * throws before `produce()` runs and nothing is written.
 */
export async function payCaptain(
  captainId: string,
  reasonCode: string,
  signal?: AbortSignal,
): Promise<CaptainPayout> {
  if (DATA_SOURCE === 'http') {
    return http.post<CaptainPayout>(`/payouts/${captainId}`, { reasonCode }, { signal })
  }
  return mockMutation(PAYOUT_OPERATIONS.pay, signal, () => {
    const row = payoutRows().find((p) => p.captainId === captainId)
    if (!row) throw notFound('captain payout', captainId)
    const payableHalalas: Halalas = row.payableHalalas
    const cashDebtHalalas: Halalas = row.cashDebtHalalas
    const netHalalas = payableHalalas - cashDebtHalalas
    if (netHalalas <= 0) {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'nothing_payable',
        message: `${row.captainName} has nothing payable after cash debt`,
        retryable: false,
      })
    }

    const me = teamUserFixtures.find((u) => u.id === currentMockUserId())!
    const reference = nextPayoutReference()

    postEntry({
      type: 'payout',
      reference: `payout|${reference}`,
      meta: { payoutId: reference, captainId, actorId: me.id },
      postings: [
        {
          idPrefix: payablePrefix(captainId),
          subjectAccount: 'liability.driver',
          subjectId: captainId,
          direction: 'debit',
          amountHalalas: netHalalas,
          description: { key: 'fin.posting.payout', params: { reference } },
          reference,
          sourceType: 'payout',
          sourceId: reference,
          actorId: me.id,
          reasonCode,
        },
      ],
      counterLines: [{ account: 'cash.gateway', direction: 'credit', amountHalalas: netHalalas }],
    })

    const record = payoutState.find((p) => p.captainId === captainId)!
    const next: CaptainPayout = {
      ...record,
      paidOutHalalas: record.paidOutHalalas + netHalalas,
      lastPayoutAt: EYVAR_NOW,
      state: 'paid',
      failureReason: null,
    }
    payoutState = payoutState.map((p) => (p.captainId === captainId ? next : p))

    appendAudit({
      action: 'payout.pay',
      subjectType: 'captain',
      subjectId: captainId,
      amountHalalas: netHalalas,
      reasonCode,
      note: null,
      detail: {
        key: 'fin.audit.payoutPaid',
        params: { payableHalalas, cashDebtHalalas, netHalalas },
      },
    })
    /* Read back through the same derivation every screen reads, so the row
       returned to the caller is the row the next list call will show. */
    return payoutRows().find((p) => p.captainId === captainId)!
  })
}

/* ───────────────────────── escrow ───────────────────────────── */

const escrowShape: QueryShape<EscrowHold> = {
  searchable: [(e) => e.id, (e) => e.subscriptionId, (e) => e.captainName, (e) => e.riderName],
  sortable: {
    id: (e) => e.id,
    amountHalalas: (e) => e.amountHalalas,
    heldSince: (e) => e.heldSince,
    tripsCompleted: (e) => e.tripsCompleted,
  },
  filterable: {
    id: (e) => e.id,
    subscriptionId: (e) => e.subscriptionId,
    captainId: (e) => e.captainId,
    riderId: (e) => e.riderId,
    settlement: (e) => e.settlement,
    subscriptionCancelled: (e) => e.subscriptionCancelled,
    /** Derived server-side so a screen never re-derives it: D-F19's whole point. */
    releasable: (e) => e.settlement === 'held' && e.tripsCompleted >= e.tripsRequired,
    amountHalalas: (e) => e.amountHalalas,
    heldSince: (e) => toInstant(e.heldSince),
    releasedAt: (e) => toInstant(e.releasedAt),
  },
  facetable: ['settlement', 'captainId'],
  views: {
    all: () => true,
    held: (e) => e.settlement === 'held',
    releasable: (e) => e.settlement === 'held' && e.tripsCompleted >= e.tripsRequired,
    released: (e) => e.settlement === 'released',
    /** **Q-F4**: a live hold on a cancelled subscription, with no rule for it. */
    cancelled: (e) => e.subscriptionCancelled,
  },
}

/**
 * GET /api/v1/escrow
 *   params: q · page · pageSize · sort · filter · view=all|held|releasable|released|cancelled
 *   -> Paginated<EscrowHold>
 */
export async function listEscrowHolds(
  params: QueryParams = {},
  signal?: AbortSignal,
): Promise<Paginated<EscrowHold>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<EscrowHold>>('/escrow', { ...params }, { signal })
  }
  return mock(PAYOUT_OPERATIONS.escrow, signal, () => runQuery(escrowState, params, escrowShape))
}

/**
 * POST /api/v1/escrow/:id/release
 *   body: { reasonCode }
 *   -> EscrowHold
 *   409 when the trips are not delivered, or the hold is not `held`
 *
 * The hold **transitions and stays visible**; nothing is removed from the list
 * (AC-364). The captain's payable receives a credit posting, which is
 * `liability.driver`'s first-ever consumer on this path (`12a` R11).
 *
 * | Leg | Ledger | Direction | Amount |
 * |---|---|---|---|
 * | 1 | `liability.escrow` (the subscription) | debit | the hold |
 * | 2 | `liability.driver` (the captain) | credit | the hold |
 *
 * Two subject ledgers, one entry, **no cash leg** — releasing escrow moves
 * money between two liabilities and none of it leaves the business. That is
 * the recipe `JE-00026` already uses for the seeded release, and it is the one
 * this mutation used to skip entirely while moving the payable summary.
 */
export async function releaseEscrow(
  id: string,
  reasonCode: string,
  signal?: AbortSignal,
): Promise<EscrowHold> {
  if (DATA_SOURCE === 'http') {
    return http.post<EscrowHold>(`/escrow/${id}/release`, { reasonCode }, { signal })
  }
  return mockMutation(PAYOUT_OPERATIONS.releaseEscrow, signal, () => {
    const hold = escrowState.find((e) => e.id === id)
    if (!hold) throw notFound('escrow hold', id)
    if (hold.settlement !== 'held') {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'not_held',
        message: `${id} is ${hold.settlement}`,
        retryable: false,
      })
    }
    if (hold.tripsCompleted < hold.tripsRequired) {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'trips_outstanding',
        message: `${hold.tripsCompleted} of ${hold.tripsRequired} trips delivered`,
        retryable: false,
      })
    }
    const next: EscrowHold = { ...hold, settlement: 'released', releasedAt: EYVAR_NOW }
    escrowState = escrowState.map((e) => (e.id === id ? next : e))

    const me = teamUserFixtures.find((u) => u.id === currentMockUserId())!
    postEntry({
      type: 'escrow_release',
      reference: `escrow_release|${id}`,
      meta: { escrowId: id, captainId: hold.captainId, actorId: me.id },
      postings: [
        {
          /* The escrow account's own ledger, one per subscription. */
          idPrefix: id,
          subjectAccount: 'liability.escrow',
          subjectId: hold.subscriptionId,
          direction: 'debit',
          amountHalalas: hold.amountHalalas,
          description: {
            key: 'fin.posting.escrowReleasedToCaptain',
            params: { captainName: hold.captainName },
          },
          reference: id,
          sourceType: 'escrow',
          sourceId: id,
          actorId: me.id,
          reasonCode,
        },
        {
          /* AC-364's credit posting, and `liability.driver`'s consumer on this
             path (`12a` R11). Held money becomes owed money; no cash moves,
             which is why there is no `cash.gateway` leg. */
          idPrefix: payablePrefix(hold.captainId),
          subjectAccount: 'liability.driver',
          subjectId: hold.captainId,
          direction: 'credit',
          amountHalalas: hold.amountHalalas,
          description: { key: 'fin.posting.escrowReleased', params: { escrowId: id } },
          reference: id,
          sourceType: 'escrow',
          sourceId: id,
          actorId: me.id,
          reasonCode,
        },
      ],
    })

    appendAudit({
      action: 'escrow.release',
      subjectType: 'captain',
      subjectId: hold.captainId,
      amountHalalas: hold.amountHalalas,
      reasonCode,
      note: null,
      detail: { key: 'fin.audit.escrowReleased', params: { escrowId: id } },
    })
    return next
  })
}

/* ──────────────────────── deductions ────────────────────────── */

const deductionShape: QueryShape<Deduction> = {
  searchable: [(d) => d.id, (d) => d.captainName, (d) => d.tripId],
  sortable: {
    id: (d) => d.id,
    raisedAt: (d) => d.raisedAt,
    amountHalalas: (d) => d.amountHalalas,
    captainName: (d) => d.captainName,
  },
  filterable: {
    id: (d) => d.id,
    captainId: (d) => d.captainId,
    tripId: (d) => d.tripId,
    status: (d) => d.status,
    waivedByUserId: (d) => d.waivedByUserId,
    amountHalalas: (d) => d.amountHalalas,
    raisedAt: (d) => toInstant(d.raisedAt),
    appliedAt: (d) => toInstant(d.appliedAt),
    waivedAt: (d) => toInstant(d.waivedAt),
  },
  facetable: ['status', 'captainId'],
  views: {
    all: () => true,
    pending: (d) => d.status === 'pending',
    applied: (d) => d.status === 'applied',
    waived: (d) => d.status === 'waived',
  },
}

/**
 * GET /api/v1/deductions
 *   params: q · page · pageSize · sort · filter · view=all|pending|applied|waived
 *   -> Paginated<Deduction>
 */
export async function listDeductions(
  params: QueryParams = {},
  signal?: AbortSignal,
): Promise<Paginated<Deduction>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<Deduction>>('/deductions', { ...params }, { signal })
  }
  return mock(PAYOUT_OPERATIONS.deductions, signal, () =>
    runQuery(deductionState, params, deductionShape),
  )
}

/**
 * POST /api/v1/deductions/:id/apply
 *   body: { reasonCode }
 *   -> Deduction
 *
 * **The balance is never clamped at zero.** If the deduction exceeds the
 * payable, the excess becomes a debit on the captain's receivable and both
 * postings are shown (AC-371) — a clamp would silently forgive the difference
 * and leave the books short by it.
 *
 * | Leg | Ledger | Direction | Amount |
 * |---|---|---|---|
 * | 1 | `liability.driver` | debit | as much of the deduction as the payable covers |
 * | 2 | `ar.driver` | debit | the excess, if any |
 * | GL | `expense.driver_pay` | credit | the whole deduction |
 *
 * The counter-leg is `expense.driver_pay`, which is the recipe `JE-00054`
 * already uses for the seeded deduction: a deduction is captain pay we are not
 * incurring, so the expense comes back rather than a new one being created.
 * **Both legs are postings**, which is the half of AC-371 the client used to
 * assert on a summary and never write.
 */
export async function applyDeduction(
  id: string,
  reasonCode: string,
  signal?: AbortSignal,
): Promise<Deduction> {
  if (DATA_SOURCE === 'http') {
    return http.post<Deduction>(`/deductions/${id}/apply`, { reasonCode }, { signal })
  }
  return mockMutation(PAYOUT_OPERATIONS.applyDeduction, signal, () => {
    const row = deductionState.find((d) => d.id === id)
    if (!row) throw notFound('deduction', id)
    if (row.status !== 'pending') {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'already_decided',
        message: `${id} is already ${row.status}`,
        retryable: false,
      })
    }
    const next: Deduction = { ...row, status: 'applied', appliedAt: EYVAR_NOW }
    deductionState = deductionState.map((d) => (d.id === id ? next : d))

    const me = teamUserFixtures.find((u) => u.id === currentMockUserId())!
    const payableHalalas = subjectClosingBalance('liability.driver', row.captainId)
    const fromPayable = Math.min(Math.max(payableHalalas, 0), row.amountHalalas)
    /* The excess becomes receivable, not a clamp. */
    const excessHalalas = row.amountHalalas - fromPayable

    postEntry({
      type: 'deduction',
      reference: `deduction|${id}`,
      meta: { deductionId: id, captainId: row.captainId, actorId: me.id },
      postings: [
        {
          idPrefix: payablePrefix(row.captainId),
          subjectAccount: 'liability.driver',
          subjectId: row.captainId,
          direction: 'debit',
          amountHalalas: fromPayable,
          description: { key: 'fin.posting.deductionApplied', params: { reference: id } },
          reference: id,
          sourceType: 'deduction',
          sourceId: id,
          actorId: me.id,
          reasonCode,
        },
        {
          idPrefix: receivablePrefix(row.captainId),
          subjectAccount: 'ar.driver',
          subjectId: row.captainId,
          direction: 'debit',
          amountHalalas: excessHalalas,
          description: { key: 'fin.posting.deductionReceivable', params: { reference: id } },
          reference: id,
          sourceType: 'deduction',
          sourceId: id,
          actorId: me.id,
          reasonCode,
        },
      ],
      counterLines: [
        { account: 'expense.driver_pay', direction: 'credit', amountHalalas: row.amountHalalas },
      ],
    })

    appendAudit({
      action: 'deduction.apply',
      subjectType: 'captain',
      subjectId: row.captainId,
      amountHalalas: row.amountHalalas,
      reasonCode,
      note: null,
      detail: { key: 'fin.audit.deductionApplied', params: { reference: id } },
    })
    return next
  })
}

/**
 * POST /api/v1/deductions/:id/waive
 *   body: { reasonCode, note }
 *   -> Deduction
 *   422 without a reason code
 *
 * **The whole of `12b` R1, closed.** `waiveDeduction` today has no permission
 * check, no confirmation, no reason and no audit entry. The waived row stays in
 * the list with its state, its actor and its reason (AC-369, AC-370).
 */
export async function waiveDeduction(
  id: string,
  reasonCode: string,
  note = '',
  signal?: AbortSignal,
): Promise<Deduction> {
  if (DATA_SOURCE === 'http') {
    return http.post<Deduction>(`/deductions/${id}/waive`, { reasonCode, note }, { signal })
  }
  return mockMutation(PAYOUT_OPERATIONS.waiveDeduction, signal, () => {
    const row = deductionState.find((d) => d.id === id)
    if (!row) throw notFound('deduction', id)
    if (!reasonCode.trim()) {
      throw new ApiError({
        status: 422,
        kind: 'validation',
        code: 'reason_code_required',
        message: 'A waiver needs a reason the captain can read',
        details: [{ field: 'reasonCode', code: 'required', message: 'Choose a reason' }],
        retryable: false,
      })
    }
    if (row.status !== 'pending') {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'already_decided',
        message: `${id} is already ${row.status}`,
        retryable: false,
      })
    }
    const me = teamUserFixtures.find((u) => u.id === currentMockUserId())!
    const next: Deduction = {
      ...row,
      status: 'waived',
      waivedAt: EYVAR_NOW,
      waivedByUserId: me.id,
      waivedByUserName: me.name,
      waivedReasonCode: reasonCode,
    }
    deductionState = deductionState.map((d) => (d.id === id ? next : d))
    appendAudit({
      action: 'deduction.waive',
      subjectType: 'captain',
      subjectId: row.captainId,
      amountHalalas: row.amountHalalas,
      reasonCode,
      note: note || null,
      detail: { key: 'fin.audit.deductionWaived', params: { reference: id } },
    })
    return next
  })
}
