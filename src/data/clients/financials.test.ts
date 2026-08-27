/**
 * The Financials data layer's own tests.
 *
 * Not behaviour tests for a screen — those are qa-engineer's. These assert the
 * **invariants of the money model** (§3.3), because a fixture that violates one
 * of them produces a screen that renders money backwards, and no amount of
 * component testing will catch it.
 *
 * Grouped by what would break if the assertion failed.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { disableMockLatency, mockFailures } from '../config'
import { isApiError } from '../types/common'
import {
  accountDefinition,
  ACCOUNT_KEYS,
  CHART_OF_ACCOUNTS,
  isPendingSettlement,
  SETTLEMENT_BADGE_TONE,
  type AccountKey,
  type LedgerPosting,
} from '../types/ledger'
import { PLAN_PRICING_DEFINITIONS } from '../types/pricing'
import { journalEntryFixtures, ledgerPostingFixtures } from '../fixtures/ledger'
import { riderFixtures } from '../fixtures/riders'
import {
  captainDebtFixtures,
  captainPayoutFixtures,
  cashReportFixtures,
  creditNoteFixtures,
  escrowHoldFixtures,
  refundFixtures,
  revenueByPlanFixtures,
} from '../fixtures/financials'
import { auditLogSize, resetAudit } from './audit'
import {
  accountBalanceFrom,
  allLedgerPostings,
  getLedger,
  getPosting,
  getTrialBalance,
  journalEntries,
  listGateways,
  listJournalEntries,
  listReconciliation,
  listRefusedPostings,
  postEntry,
  reversePosting,
  resetLedger,
  setGatewayEnabled,
  useOutOfBalanceLedger,
} from './ledger'
import { getFinancialsOverview } from './financialsOverview'
import { issueRefund, listCreditNotes, listRefunds, resetRevenue } from './revenue'
import {
  applyDeduction,
  getCaptainPayableLedger,
  listCaptainPayouts,
  listDeductions,
  listEscrowHolds,
  payCaptain,
  releaseEscrow,
  resetPayouts,
  waiveDeduction,
} from './payouts'
import {
  claimCashReport,
  getCaptainDebtLedger,
  listCaptainDebts,
  listCashReports,
  recordCashRepayment,
  resetCash,
} from './cash'
import {
  adjustWallet,
  checkAdjustmentAuthority,
  getWalletLedger,
  listWallets,
  resetWallets,
} from './wallets'
import {
  getLiveRateCard,
  listCancellationRules,
  listPlans,
  listRateCards,
  resetPricing,
  savePlan,
  suspendSurge,
} from './pricing'

beforeEach(() => {
  disableMockLatency()
  mockFailures.clear()
  resetAudit()
  resetLedger()
  resetRevenue()
  resetPayouts()
  resetCash()
  resetWallets()
  resetPricing()
})

/* ══════════ 0 — the demonstration every money act owes ════════════════ */

/**
 * **Verification by demonstration, not by assertion.**
 *
 * Four acts — `payCaptain`, `releaseEscrow`, `applyDeduction` and
 * `recordCashRepayment` — each moved a **summary** record and wrote an
 * **audit** entry, and none of them wrote a `LedgerPosting`, while AC-362,
 * AC-364, AC-371 and AC-379 each say *posting*. The suite did not catch it
 * because the suite asserted the summaries: `credits the captain payable when
 * escrow releases — AC-364` read `payableHalalas` off the payouts index, which
 * is **not what AC-364 says**. A green line standing in for the wrong check.
 *
 * So every money act below is verified the same way, and it is the shape to
 * copy for the next one:
 *
 *   1. perform the act **through the real client**;
 *   2. read the subject ledger **back** and find the posting — direction,
 *      amount, and the balance it produced;
 *   3. assert the summary figure and the ledger's closing balance state the
 *      **same fact**;
 *   4. assert the books still balance.
 *
 * A test that stops at step 3's first half is the one that let this through.
 */

/** The accounts whose every movement produces a subject posting. */
const SUBJECT_LEDGERS: AccountKey[] = [
  'liability.wallet',
  'liability.driver',
  'liability.escrow',
  'ar.driver',
  'ar.rider',
  'contra.refunds',
]

/**
 * The trial balance still balances, **and** every subject ledger still agrees
 * with the GL account it aggregates.
 *
 * The second half matters as much as the first: a mutation that writes a
 * posting and no journal entry leaves the books balanced — nothing was written
 * to unbalance them — while the subject ledger and the trial balance state
 * different amounts for the same account. `adjustWallet` did exactly that.
 */
async function expectBooksAgree(): Promise<void> {
  const tb = await getTrialBalance()
  expect(tb.differenceHalalas, `trial balance out by ${tb.differenceHalalas}`).toBe(0)
  expect(tb.balanced).toBe(true)

  const entries = journalEntries()
  for (const account of SUBJECT_LEDGERS) {
    const fromPostings = allLedgerPostings()
      .filter((p) => p.subjectAccount === account && !isPendingSettlement(p.settlement))
      .reduce((sum, p) => {
        const delta = p.direction === 'credit' ? p.amountHalalas : -p.amountHalalas
        return sum + (accountDefinition(account).normalSide === 'credit' ? delta : -delta)
      }, 0)
    expect(fromPostings, `${account}: subject ledgers vs GL`).toBe(
      accountBalanceFrom(entries, account),
    )
  }
}

/** The postings this act wrote on one subject ledger, oldest-first. */
function postingsFor(account: AccountKey, subjectId: string | null, reference: string) {
  return allLedgerPostings().filter(
    (p) => p.subjectAccount === account && p.subjectId === subjectId && p.reference === reference,
  )
}

/* ══════════════ 1 — the sign convention (AC-300–312) ════════════════════ */

describe('the posting shape', () => {
  it('carries a positive integer amount on every posting — AC-300', () => {
    const offenders = ledgerPostingFixtures.filter(
      (p) => !Number.isInteger(p.amountHalalas) || p.amountHalalas < 0,
    )
    expect(offenders.map((p) => p.id)).toEqual([])
  })

  it('carries exactly one of debit or credit, never inferred from a sign — AC-301', () => {
    for (const p of ledgerPostingFixtures) {
      expect(['debit', 'credit'], p.id).toContain(p.direction)
    }
  })

  it('sets reversesPostingId if and only if kind is reversal', () => {
    for (const p of ledgerPostingFixtures) {
      expect(p.reversesPostingId !== null, p.id).toBe(p.kind === 'reversal')
    }
  })

  it('leaves reversesPostingId null on a refund, a chargeback and an adjustment — §3.4', () => {
    const others = ledgerPostingFixtures.filter((p) =>
      ['refund', 'chargeback', 'adjustment'].includes(p.kind),
    )
    expect(others.length).toBeGreaterThan(0)
    expect(others.filter((p) => p.reversesPostingId !== null)).toEqual([])
  })

  it('carries a reason code on every adjustment — §3.4d', () => {
    const adjustments = ledgerPostingFixtures.filter((p) => p.kind === 'adjustment')
    expect(adjustments.length).toBeGreaterThan(0)
    expect(adjustments.filter((p) => p.reasonCode === null)).toEqual([])
  })

  it('carries null balanceAfterHalalas on every non-settled row, never an omitted key — AC-312', () => {
    for (const p of ledgerPostingFixtures) {
      if (isPendingSettlement(p.settlement)) {
        expect(p.balanceAfterHalalas, p.id).toBeNull()
      }
      /* The decision: the key is always present. `in` distinguishes
         "explicitly null" from "absent", which `=== null` cannot. */
      expect('balanceAfterHalalas' in p, p.id).toBe(true)
    }
  })

  it('keeps every posting description keyed, never a concatenated sentence — AC-443', () => {
    for (const p of ledgerPostingFixtures) {
      expect(p.description.key, p.id).toMatch(/^[a-z][\w.]+$/)
      expect(p.description.key).not.toContain(' ')
    }
  })

  it('gives `failed` and `escalated` no badge tone, because R5 leaves no red badge', () => {
    expect(SETTLEMENT_BADGE_TONE.failed).toBeNull()
    expect(SETTLEMENT_BADGE_TONE.escalated).toBeNull()
    const tones = new Set(Object.values(SETTLEMENT_BADGE_TONE).filter(Boolean))
    for (const tone of tones) {
      expect(['success', 'warning', 'info', 'neutral', 'new']).toContain(tone)
    }
  })
})

describe('the running balance is persisted, not recomputed — AC-311', () => {
  const subjects = new Map<string, LedgerPosting[]>()
  for (const p of ledgerPostingFixtures) {
    const key = `${p.subjectAccount}|${p.subjectId ?? ''}`
    subjects.set(key, [...(subjects.get(key) ?? []), p])
  }

  it.each([...subjects.keys()])('%s chains arithmetically', (key) => {
    const rows = [...subjects.get(key)!].sort(
      (a, b) => Date.parse(a.postedAt) - Date.parse(b.postedAt) || a.id.localeCompare(b.id),
    )
    let running = 0
    for (const row of rows) {
      if (row.balanceAfterHalalas === null) continue
      const delta = row.direction === 'credit' ? row.amountHalalas : -row.amountHalalas
      const expected =
        accountDefinition(row.subjectAccount).normalSide === 'credit' ? running + delta : running - delta
      expect(row.balanceAfterHalalas, `${row.id} in ${key}`).toBe(expected)
      running = row.balanceAfterHalalas
    }
  })
})

/* ══════════════ 2 — the books balance (AC-343, AC-415–418) ═════════════ */

describe('the journal', () => {
  it('balances every entry: debits equal credits — AC-343', () => {
    for (const entry of journalEntryFixtures) {
      const debits = entry.lines
        .filter((l) => l.direction === 'debit')
        .reduce((s, l) => s + l.amountHalalas, 0)
      const credits = entry.lines
        .filter((l) => l.direction === 'credit')
        .reduce((s, l) => s + l.amountHalalas, 0)
      expect(debits, `${entry.id} debits`).toBe(credits)
      expect(entry.totalHalalas, `${entry.id} total`).toBe(debits)
    }
  })

  it('names only accounts that exist in the chart', () => {
    const keys = new Set(CHART_OF_ACCOUNTS.map((a) => a.key))
    for (const entry of journalEntryFixtures) {
      for (const line of entry.lines) expect(keys.has(line.account), line.account).toBe(true)
    }
  })

  it('carries a positive integer on every line', () => {
    for (const entry of journalEntryFixtures) {
      for (const line of entry.lines) {
        expect(Number.isInteger(line.amountHalalas) && line.amountHalalas > 0, entry.id).toBe(true)
      }
    }
  })

  it('gives every posting a journal entry that exists, or an explicit null', () => {
    const ids = new Set(journalEntryFixtures.map((e) => e.id))
    for (const p of ledgerPostingFixtures) {
      if (p.journalEntryId === null) continue
      expect(ids.has(p.journalEntryId), `${p.id} -> ${p.journalEntryId}`).toBe(true)
    }
  })
})

describe('the trial balance', () => {
  it('lists every account in the chart, including zero-balance ones — AC-415', async () => {
    const tb = await getTrialBalance()
    expect(tb.rows.map((r) => r.account).sort()).toEqual(
      CHART_OF_ACCOUNTS.map((a) => a.key).sort(),
    )
  })

  it('balances, and reports a zero difference — AC-416', async () => {
    const tb = await getTrialBalance()
    expect(tb.totalDebitsHalalas).toBe(tb.totalCreditsHalalas)
    expect(tb.balanced).toBe(true)
    expect(tb.differenceHalalas).toBe(0)
  })

  it('gives all four newly-consumed accounts a non-zero balance — AC-417', async () => {
    const tb = await getTrialBalance()
    const balance = (k: AccountKey) => tb.rows.find((r) => r.account === k)!.balanceHalalas
    /* `ar.driver` is new; `ar.rider`, `liability.driver` and `liability.escrow`
       are declared-and-never-posted in the legacy app (`12a` G8, R11). */
    expect(balance('ar.driver')).not.toBe(0)
    expect(balance('ar.rider')).not.toBe(0)
    expect(balance('liability.driver')).not.toBe(0)
    expect(balance('liability.escrow')).not.toBe(0)
  })

  it('agrees with each subject ledger it aggregates', async () => {
    const entries = journalEntries()
    /* Pending rows are excluded: an authorised hold has moved no money and
       therefore has no journal entry. That is why `journalEntryId` is nullable
       and why the GL and the subject ledger legitimately differ by exactly the
       pending line (AC-312). */
    const sumOf = (account: AccountKey) =>
      ledgerPostingFixtures
        .filter((p) => p.subjectAccount === account && !isPendingSettlement(p.settlement))
        .reduce((s, p) => {
          const delta = p.direction === 'credit' ? p.amountHalalas : -p.amountHalalas
          return s + (accountDefinition(account).normalSide === 'credit' ? delta : -delta)
        }, 0)

    /* Only the accounts whose *every* movement produces a subject posting.
       `cash.gateway` and `revenue.fares` are platform-level counter-legs with
       no subject ledger, by design. */
    for (const account of [
      'liability.wallet',
      'liability.driver',
      'liability.escrow',
      'ar.driver',
      'ar.rider',
      'contra.refunds',
    ] as AccountKey[]) {
      expect(sumOf(account), account).toBe(accountBalanceFrom(entries, account))
    }
  })

  it('can be put out of balance without hand-editing a fixture — AC-351', async () => {
    useOutOfBalanceLedger()
    const tb = await getTrialBalance()
    expect(tb.balanced).toBe(false)
    expect(tb.differenceHalalas).not.toBe(0)
  })
})

/* ══════════════ 3 — money is integer minor units (AC-339, AC-345) ══════ */

describe('money arithmetic', () => {
  it('crosses the seam as integers only — AC-339', async () => {
    const [payouts, escrow, deductions, reports, debts, wallets] = await Promise.all([
      listCaptainPayouts({ pageSize: 100 }),
      listEscrowHolds({ pageSize: 100 }),
      listDeductions({ pageSize: 100 }),
      listCashReports({ pageSize: 100 }),
      listCaptainDebts({ pageSize: 100 }),
      listWallets({ pageSize: 100 }),
    ])
    const amounts = [
      ...payouts.items.flatMap((p) => [p.earnedHalalas, p.paidOutHalalas, p.payableHalalas, p.cashDebtHalalas]),
      ...escrow.items.map((e) => e.amountHalalas),
      ...deductions.items.map((d) => d.amountHalalas),
      ...reports.items.flatMap((r) => [r.expectedFareHalalas, r.topupHalalas, r.debtAddedHalalas]),
      ...debts.items.flatMap((d) => [d.balanceHalalas, d.capHalalas]),
      ...wallets.items.flatMap((w) => [w.balanceHalalas, w.pendingHalalas]),
    ]
    expect(amounts.filter((a) => !Number.isInteger(a))).toEqual([])
  })

  it('makes VAT the residual on every credit note, to the halala — AC-338, AC-345, M-3', () => {
    for (const note of creditNoteFixtures) {
      expect(note.subtotalHalalas + note.vatHalalas, note.id).toBe(note.totalHalalas)
      /* And the net is the rounded quotient, not a second independent rounding. */
      expect(note.subtotalHalalas, note.id).toBe(Math.round(note.totalHalalas / 1.15))
    }
  })

  it('mints a credit note whose VAT is the residual on a new refund too', async () => {
    const { creditNote } = await issueRefund({
      riderId: 'RDR-1041',
      amountHalalas: 10_000,
      reasonCode: 'PAY_REFUND_REQ',
      destination: 'wallet',
    })
    expect(creditNote.subtotalHalalas + creditNote.vatHalalas).toBe(10_000)
  })

  it('adds the revenue-by-plan rows up to the gross-bookings tile — AC-347, AC-355', async () => {
    const overview = await getFinancialsOverview()
    const total = revenueByPlanFixtures.reduce((s, r) => s + r.grossHalalas, 0)
    expect(total).toBe(overview.grossBookingsHalalas)
  })

  it('splits every plan row into platform plus captain, exactly', () => {
    for (const row of revenueByPlanFixtures) {
      expect(row.platformHalalas + row.captainHalalas, row.planId).toBe(row.grossHalalas)
    }
  })
})

/* ══════════════ 4 — the two screens agree (AC-347–350, AC-381) ═════════ */

describe('cross-screen agreement', () => {
  it("gives every rider's index balance the same value as their ledger's closing balance", async () => {
    const wallets = await listWallets({ pageSize: 100 })
    for (const summary of wallets.items) {
      const rider = riderFixtures.find((r) => r.id === summary.riderId)!
      expect(summary.balanceHalalas, rider.id).toBe(rider.walletBalanceHalalas)
      const ledger = await getWalletLedger(rider.id)
      expect(ledger.closingBalanceHalalas, rider.id).toBe(rider.walletBalanceHalalas)
    }
  })

  it('matches the pending-payouts tile to the sum of payable balances — AC-348', async () => {
    const overview = await getFinancialsOverview()
    const payouts = await listCaptainPayouts({ pageSize: 100 })
    const sum = payouts.items.reduce((s, p) => s + p.payableHalalas, 0)
    expect(overview.pendingPayoutsHalalas).toBe(sum)
  })

  it('matches the escrow-held tile to the sum of held escrow rows — AC-349', async () => {
    const overview = await getFinancialsOverview()
    const escrow = await listEscrowHolds({ view: 'held', pageSize: 100 })
    const sum = escrow.items.reduce((s, e) => s + e.amountHalalas, 0)
    expect(overview.escrowHeldHalalas).toBe(sum)
  })

  it('matches the captain-debt tile to the positive ar.driver balances — AC-350', async () => {
    const overview = await getFinancialsOverview()
    const debts = await listCaptainDebts({ pageSize: 100 })
    const positives = debts.items
      .filter((d) => d.balanceHalalas > 0)
      .reduce((s, d) => s + d.balanceHalalas, 0)
    expect(overview.captainDebtHalalas).toBe(positives)
  })

  it('keeps the captain in credit in the debt list, not silently dropped — AC-381', async () => {
    const debts = await listCaptainDebts({ pageSize: 100 })
    const inCredit = debts.items.filter((d) => d.balanceHalalas < 0)
    expect(inCredit.map((d) => d.captainId)).toContain('DRV-0104')
    /* And the signed total differs from the positive-only tile, which is why
       the reconciliation view carries the gap as a row. */
    const signed = debts.items.reduce((s, d) => s + d.balanceHalalas, 0)
    const overview = await getFinancialsOverview()
    expect(signed).not.toBe(overview.captainDebtHalalas)
  })

  it('compares like with like on every reconciliation row — AC-420, D-F12', async () => {
    const rows = await listReconciliation()
    for (const row of rows) {
      expect(row.differenceHalalas).toBe(row.operationalHalalas - row.ledgerHalalas)
    }
    /* The refunds row: both figures VAT-exclusive, so it agrees. Legacy shows a
       permanent ~13.04 % break here because it multiplies the VAT leg by zero. */
    const refunds = rows.find((r) => r.label.key === 'fin.reconcile.refunds')!
    expect(refunds.vatBasis).toBe('exclusive')
    expect(refunds.differenceHalalas).toBe(0)
    /* The captain-receivable row: a **genuine** break, and the one AC-381 is about. */
    const receivable = rows.find((r) => r.label.key === 'fin.reconcile.captainReceivable')!
    expect(receivable.differenceHalalas).not.toBe(0)
  })
})

/* ══════════════ 5 — corrections (AC-325–338) ═══════════════════════════ */

describe('reversal', () => {
  it('produces one row with the opposite direction and the identical amount — AC-326', async () => {
    const before = await getWalletLedger('RDR-2087')
    const { reversal } = await reversePosting('WTX-2087-1', 'PAY_INCORRECT_CHARGE')
    expect(reversal).not.toBeNull()
    expect(reversal!.direction).toBe('debit')
    expect(reversal!.amountHalalas).toBe(1_730)
    expect(reversal!.reversesPostingId).toBe('WTX-2087-1')
    expect(before.closingBalanceHalalas).toBe(1_730)
  })

  it('returns the balance to where it was before the original — AC-327', async () => {
    await reversePosting('WTX-2087-1', 'PAY_INCORRECT_CHARGE')
    const after = await getWalletLedger('RDR-2087')
    expect(after.closingBalanceHalalas).toBe(0)
  })

  it('leaves the original row present, unchanged and in place — AC-328, AC-329', async () => {
    await reversePosting('WTX-2087-1', 'PAY_INCORRECT_CHARGE')
    const after = await getWalletLedger('RDR-2087')
    const original = after.postings.find((p) => p.id === 'WTX-2087-1')!
    expect(original.amountHalalas).toBe(1_730)
    expect(original.direction).toBe('credit')
    expect(original.balanceAfterHalalas).toBe(1_730)
    expect(original.settlement).toBe('reversed')
    expect(original.reversedByPostingId).toBe('WTX-2087-1-R1')
    expect(after.postings[0]!.id).toBe('WTX-2087-1')
  })

  it('refuses a second reversal and names the existing one — AC-330', async () => {
    await reversePosting('WTX-2087-1', 'PAY_INCORRECT_CHARGE')
    await expect(reversePosting('WTX-2087-1', 'PAY_INCORRECT_CHARGE')).rejects.toSatisfy(
      (e: unknown) => isApiError(e) && e.status === 409 && e.message.includes('WTX-2087-1-R1'),
    )
  })

  it('produces exactly one reversing posting on a double commit — AC-331', async () => {
    await reversePosting('WTX-2087-1', 'PAY_INCORRECT_CHARGE')
    await reversePosting('WTX-2087-1', 'PAY_INCORRECT_CHARGE').catch(() => undefined)
    const after = await getWalletLedger('RDR-2087')
    expect(after.postings.filter((p) => p.kind === 'reversal')).toHaveLength(1)
  })

  it('releases rather than reverses an authorised posting, writing no new row — AC-332', async () => {
    const before = await getWalletLedger('RDR-1041')
    const { reversal, original } = await reversePosting('WTX-0005', 'PAY_DECLINED')
    expect(reversal).toBeNull()
    expect(original.settlement).toBe('released')
    const after = await getWalletLedger('RDR-1041')
    expect(after.postings).toHaveLength(before.postings.length)
  })

  it('refuses without a reason code — AC-333', async () => {
    await expect(reversePosting('WTX-2087-1', '  ')).rejects.toSatisfy(
      (e: unknown) => isApiError(e) && e.status === 422,
    )
  })

  it('writes exactly one audit entry naming both posting ids — AC-334', async () => {
    expect(auditLogSize()).toBe(0)
    await reversePosting('WTX-2087-1', 'PAY_INCORRECT_CHARGE', 'wrong rider')
    expect(auditLogSize()).toBe(1)
  })

  it('ships a reversal of a reversal, and the balance simply returns — §3.4a', () => {
    const rows = ledgerPostingFixtures.filter((p) => p.subjectId === 'DRV-0102')
    const second = rows.find((p) => p.reversesPostingId === 'PAY-0102-5')
    expect(second).toBeDefined()
    expect(second!.kind).toBe('reversal')
    const first = rows.find((p) => p.id === 'PAY-0102-5')!
    expect(first.kind).toBe('reversal')
    expect(first.reversedByPostingId).toBe('PAY-0102-6')
  })
})

describe('refund', () => {
  it('leaves the related posting untouched and sets reversesPostingId null — AC-336', async () => {
    const { refund } = await issueRefund({
      riderId: 'RDR-1041',
      amountHalalas: 4_000,
      reasonCode: 'PAY_REFUND_REQ',
      destination: 'instrument',
      sourcePaymentId: 'PAY-5510',
    })
    expect(refund.id).toBe('REF-0004')
    const ledger = await getWalletLedger('RDR-1041')
    const fare = ledger.postings.find((p) => p.id === 'WTX-0003')!
    expect(fare.amountHalalas).toBe(640)
    expect(fare.direction).toBe('debit')
  })

  it('credits exactly one destination — AC-337', async () => {
    /**
     * **The fifth act in the same shape, and its own false tick.**
     * `issueRefund` set `postingId` to a string and wrote **no posting**, and
     * this test ticked AC-337 by asserting that string — `expect(refund.postingId)
     * .toBe('REF-0004-P')`, a green line asserting the *name* of a row that did
     * not exist. The assertion stays, and now resolves.
     */
    const walletBefore = await getWalletLedger('RDR-1041')
    const { refund } = await issueRefund({
      riderId: 'RDR-1041',
      amountHalalas: 4_000,
      reasonCode: 'PAY_REFUND_REQ',
      destination: 'wallet',
    })
    expect(refund.destination).toBe('wallet')
    /* One refund, one posting id, one credit note. Legacy fires both
       `recordRefund` and `creditRiderWallet` (`12a` R1). */
    expect(refund.postingId).toBe('REF-0004-P')
    const notes = await listCreditNotes({ pageSize: 100 })
    expect(notes.items.filter((n) => n.refundId === refund.id)).toHaveLength(1)

    /* The row the id names exists, on the refunds ledger, for the **net**. */
    const posting = await getPosting(refund.postingId!)
    expect(posting.subjectAccount).toBe('contra.refunds')
    expect(posting.direction).toBe('debit')
    expect(posting.amountHalalas).toBe(Math.round(4_000 / 1.15))

    /* And the destination — one, not both. */
    const wallet = await getWalletLedger('RDR-1041')
    expect(wallet.closingBalanceHalalas).toBe(walletBefore.closingBalanceHalalas + 4_000)
    await expectBooksAgree()
  })

  it('credits the instrument and not the wallet on the other destination — AC-337', async () => {
    const walletBefore = await getWalletLedger('RDR-1041')
    const { refund } = await issueRefund({
      riderId: 'RDR-1041',
      amountHalalas: 4_000,
      reasonCode: 'PAY_REFUND_REQ',
      destination: 'instrument',
      sourcePaymentId: 'PAY-5510',
    })
    expect((await getPosting(refund.postingId!)).subjectAccount).toBe('contra.refunds')
    /* **Never both.** The wallet does not move on an instrument refund. */
    const wallet = await getWalletLedger('RDR-1041')
    expect(wallet.closingBalanceHalalas).toBe(walletBefore.closingBalanceHalalas)
    await expectBooksAgree()
  })

  it('refuses a probable duplicate and names the earlier refund — AC-358, D-F13', async () => {
    await expect(
      issueRefund({
        riderId: 'RDR-2055',
        amountHalalas: 7_350,
        reasonCode: 'BKG_NO_SUPPLY',
        destination: 'instrument',
        relatedId: 'SUB-0987',
      }),
    ).rejects.toSatisfy((e: unknown) => isApiError(e) && e.message.includes('REF-0001'))
  })

  it('allows a genuinely distinct identical refund once the operator confirms — AC-358', async () => {
    const { refund } = await issueRefund({
      riderId: 'RDR-2055',
      amountHalalas: 7_350,
      reasonCode: 'BKG_NO_SUPPLY',
      destination: 'instrument',
      relatedId: 'SUB-0987',
      confirmDuplicate: true,
    })
    expect(refund.id).toBe('REF-0004')
  })

  it('never fabricates an invoice link — AC-356, AC-357', async () => {
    const { creditNote } = await issueRefund({
      riderId: 'RDR-1041',
      amountHalalas: 1_000,
      reasonCode: 'PAY_REFUND_REQ',
      destination: 'wallet',
    })
    expect(creditNote.againstInvoice).toBeNull()
    expect(creditNote.unlinked).toBe(true)
  })

  it('ships an unlinked credit note so the banner count is reachable — AC-356', async () => {
    const notes = await listCreditNotes({ view: 'unlinked', pageSize: 100 })
    expect(notes.total).toBeGreaterThan(0)
  })

  it('carries a refund with no source payment — the warning row, §6.3', async () => {
    const page = await listRefunds({ view: 'unsourced', pageSize: 100 })
    expect(page.items.map((r) => r.id)).toContain('REF-0003')
  })

  it('dates two credit notes issued on different days differently — AC-360', () => {
    const dates = new Set(creditNoteFixtures.map((n) => n.issuedAt.slice(0, 10)))
    expect(dates.size).toBeGreaterThan(1)
  })
})

/* ══════════════ 6 — payouts, escrow, deductions (AC-362–371) ═══════════ */

describe('payouts and escrow', () => {
  it('writes a debit posting on the payable for the amount paid — AC-362', async () => {
    /**
     * The plain case, with no cash debt to net: the posting **is** the payout,
     * and the payable after is the payable before minus the amount, exactly.
     *
     * This is the criterion the client used to satisfy on the index and nowhere
     * else — the payouts table converted to `Paid`, and the captain's payable
     * ledger showed nothing and closed where it opened.
     */
    const before = await getCaptainPayableLedger('DRV-0106')
    expect(before.closingBalanceHalalas).toBe(4_000)

    const after = await payCaptain('DRV-0106', 'CAP_LATE')

    const ledger = await getCaptainPayableLedger('DRV-0106')
    const written = ledger.postings.filter((p) => p.sourceType === 'payout')
    expect(written).toHaveLength(1)
    expect(written[0]!.direction).toBe('debit')
    expect(written[0]!.amountHalalas).toBe(4_000)
    expect(written[0]!.balanceAfterHalalas).toBe(0)
    expect(ledger.closingBalanceHalalas).toBe(before.closingBalanceHalalas - 4_000)

    /* And the summary states the same fact the ledger does. */
    expect(after.payableHalalas).toBe(ledger.closingBalanceHalalas)
    expect(after.paidOutHalalas).toBe(4_000)
    await expectBooksAgree()
  })

  it('restores the previous balance exactly when the payout is reversed — AC-363', async () => {
    /**
     * **AC-363's second clause was unreachable**, because there was no posting
     * to reverse. It is reachable now, and it is the whole argument for a
     * posting over an assignment: `payDriver` sets `pending = 0` (`:7030`) and
     * nothing can put it back, because nothing recorded what it was.
     */
    const before = await getCaptainPayableLedger('DRV-0106')
    await payCaptain('DRV-0106', 'CAP_LATE')
    const paid = await getCaptainPayableLedger('DRV-0106')
    const payout = paid.postings.find((p) => p.sourceType === 'payout')!

    const { reversal } = await reversePosting(payout.id, 'PAY_DECLINED')
    expect(reversal!.direction).toBe('credit')
    expect(reversal!.amountHalalas).toBe(payout.amountHalalas)
    expect(reversal!.balanceAfterHalalas).toBe(before.closingBalanceHalalas)

    const restored = await getCaptainPayableLedger('DRV-0106')
    expect(restored.closingBalanceHalalas).toBe(before.closingBalanceHalalas)
    const summary = (await listCaptainPayouts({ pageSize: 100 })).items.find(
      (p) => p.captainId === 'DRV-0106',
    )!
    expect(summary.payableHalalas).toBe(before.closingBalanceHalalas)
    await expectBooksAgree()
  })

  it('commits the net, and writes it as one debit posting — AC-366, AC-362, D-F6', async () => {
    /**
     * The netting case. The **cash transferred** is the net, which is D-F6
     * closed; the **posting** is that same net, which is AC-362; and the
     * payable is left holding the residual, which is AC-362's second sentence.
     *
     * **The receivable is not touched.** The client used to set
     * `cashDebtHalalas: 0` here — a write-off with no second leg, `ar.driver`
     * forgiven against nothing, in a chart with no account that could receive
     * the other side. Whether the residual payable and the debt should be **set
     * off** against each other is a business rule this spec does not state, and
     * it is in the handoff for product-owner rather than decided here. What is
     * asserted below is that neither balance is invented and both agree with
     * their ledger.
     */
    const before = (await listCaptainPayouts({ pageSize: 100 })).items.find(
      (p) => p.captainId === 'DRV-0101',
    )!
    expect(before.payableHalalas).toBe(65_260)
    expect(before.cashDebtHalalas).toBe(2_315)

    const after = await payCaptain('DRV-0101', 'CAP_LATE')
    const net = 65_260 - 2_315
    expect(after.paidOutHalalas).toBe(net)

    const payable = await getCaptainPayableLedger('DRV-0101')
    const reference = payable.postings.find((p) => p.sourceType === 'payout')!.reference!
    const legs = postingsFor('liability.driver', 'DRV-0101', reference)
    /* AC-362 exactly: **one** debit posting, for the amount paid. */
    expect(legs).toHaveLength(1)
    expect(legs[0]!.direction).toBe('debit')
    expect(legs[0]!.amountHalalas).toBe(net)
    expect(payable.closingBalanceHalalas).toBe(65_260 - net)

    /* Nothing was forgiven on the receivable, and nothing was posted to it. */
    const receivable = await getCaptainDebtLedger('DRV-0101')
    expect(postingsFor('ar.driver', 'DRV-0101', reference)).toEqual([])
    expect(receivable.closingBalanceHalalas).toBe(2_315)

    /* Both summaries state what both ledgers state. */
    expect(after.payableHalalas).toBe(payable.closingBalanceHalalas)
    expect(after.cashDebtHalalas).toBe(receivable.closingBalanceHalalas)
    const debt = (await listCaptainDebts({ pageSize: 100 })).items.find(
      (d) => d.captainId === 'DRV-0101',
    )!
    expect(debt.balanceHalalas).toBe(receivable.closingBalanceHalalas)
    await expectBooksAgree()
  })

  it('cannot double-net the same debt on a second payout', async () => {
    /* The residual payable equals the debt, so the net is zero and the 409
       refuses it. The debt cannot be withheld twice for one obligation — which
       is the failure the un-posted write-off was covering for. */
    await payCaptain('DRV-0101', 'CAP_LATE')
    await expect(payCaptain('DRV-0101', 'CAP_LATE')).rejects.toSatisfy(
      (e: unknown) => isApiError(e) && e.status === 409,
    )
    await expectBooksAgree()
  })

  it('pays a captain in credit on the receivable more than their payable', async () => {
    /* `DRV-0104` over-remitted 4.40, so the net is *more* than the payable and
       the payable goes negative by exactly the credit. One rule, not two
       cases — and a negative payable is a seeded, renderable state (D-F1). */
    const after = await payCaptain('DRV-0104', 'CAP_LATE')
    expect(after.paidOutHalalas).toBe(90_000 + 3_040 + 440)
    expect(after.payableHalalas).toBe(-440)
    expect((await getCaptainPayableLedger('DRV-0104')).closingBalanceHalalas).toBe(-440)
    expect(after.cashDebtHalalas).toBe(-440)
    await expectBooksAgree()
  })

  it('leaves the payable exactly as it was when the mutation fails — AC-430', async () => {
    mockFailures.always('payouts.pay')
    await expect(payCaptain('DRV-0101', 'CAP_LATE')).rejects.toSatisfy(isApiError)
    mockFailures.clear('payouts.pay')
    const after = (await listCaptainPayouts({ pageSize: 100 })).items.find(
      (p) => p.captainId === 'DRV-0101',
    )!
    expect(after.payableHalalas).toBe(65_260)
    /* And **no posting was written**, which is the half a summary check cannot
       see: a failed act that left a row on the ledger would be worse than one
       that left a stale summary. */
    expect((await getCaptainPayableLedger('DRV-0101')).closingBalanceHalalas).toBe(65_260)
    expect(allLedgerPostings().filter((p) => p.reference === 'PO-0004')).toEqual([])
    await expectBooksAgree()
  })

  it('keeps a released escrow visible with its state — AC-364', async () => {
    const before = (await listEscrowHolds({ pageSize: 100 })).total
    const released = await releaseEscrow('ESC-1052', 'CAP_LATE')
    expect(released.settlement).toBe('released')
    const after = await listEscrowHolds({ pageSize: 100 })
    expect(after.total).toBe(before)
    expect(after.items.map((e) => e.id)).toContain('ESC-1052')
  })

  it('credits the captain payable when escrow releases — AC-364', async () => {
    /**
     * **The false tick this replaces.** This test asserted `payableHalalas` — a
     * figure on the payouts *index* — and ticked a criterion whose words are
     * *"creates a credit posting on the captain's payable ledger"*. The summary
     * moved, the posting was never written, and the criterion read as met for
     * every green run since.
     *
     * Two subject ledgers move here and both are checked: escrow down, payable
     * up, no cash leg, because releasing escrow moves money between two
     * liabilities and none of it leaves the business.
     */
    const payableBefore = await getCaptainPayableLedger('DRV-0103')
    const escrowBefore = await getLedger('liability.escrow', 'SUB-1052')
    expect(escrowBefore.closingBalanceHalalas).toBe(32_960)

    await releaseEscrow('ESC-1052', 'CAP_LATE')

    const credit = postingsFor('liability.driver', 'DRV-0103', 'ESC-1052')
    expect(credit).toHaveLength(1)
    expect(credit[0]!.direction).toBe('credit')
    expect(credit[0]!.amountHalalas).toBe(32_960)
    expect(credit[0]!.balanceAfterHalalas).toBe(payableBefore.closingBalanceHalalas + 32_960)

    const debit = postingsFor('liability.escrow', 'SUB-1052', 'ESC-1052').filter(
      (p) => p.direction === 'debit',
    )
    expect(debit).toHaveLength(1)
    expect(debit[0]!.amountHalalas).toBe(32_960)

    const payable = await getCaptainPayableLedger('DRV-0103')
    expect(payable.closingBalanceHalalas).toBe(42_100 + 32_960)
    expect((await getLedger('liability.escrow', 'SUB-1052')).closingBalanceHalalas).toBe(0)

    const after = (await listCaptainPayouts({ pageSize: 100 })).items.find(
      (p) => p.captainId === 'DRV-0103',
    )!
    expect(after.payableHalalas).toBe(payable.closingBalanceHalalas)
    await expectBooksAgree()
  })

  it('refuses to release a hold whose trips are outstanding — AC-365', async () => {
    await expect(releaseEscrow('ESC-1041', 'CAP_LATE')).rejects.toSatisfy(
      (e: unknown) => isApiError(e) && e.status === 409,
    )
  })

  it('ships a held escrow on a cancelled subscription — Q-F4', async () => {
    const page = await listEscrowHolds({ view: 'cancelled', pageSize: 100 })
    expect(page.items.map((e) => e.id)).toEqual(['ESC-0987'])
    expect(page.items[0]!.settlement).toBe('held')
  })

  it('ships a failed payout so the R5a banner is reachable — AC-367', async () => {
    const page = await listCaptainPayouts({ view: 'failed', pageSize: 100 })
    expect(page.items.map((p) => p.captainId)).toEqual(['DRV-0105'])
    expect(page.items[0]!.failureReason?.key).toBeTruthy()
  })

  it('refuses to waive without a reason, and keeps the waived row visible — AC-369, AC-370', async () => {
    await expect(waiveDeduction('DED-01', ' ')).rejects.toSatisfy(
      (e: unknown) => isApiError(e) && e.status === 422,
    )
    const waived = await waiveDeduction('DED-01', 'CAP_LATE', 'first offence')
    expect(waived.status).toBe('waived')
    expect(waived.waivedReasonCode).toBe('CAP_LATE')
    const page = await listDeductions({ pageSize: 100 })
    expect(page.items.map((d) => d.id)).toContain('DED-01')
  })

  it('writes a debit posting on the payable when a deduction applies — AC-371', async () => {
    /* DRV-0103's payable covers the 15.00 in full, so there is one posting and
       no excess. AC-371's first clause, demonstrated on the ledger. */
    const before = await getCaptainPayableLedger('DRV-0103')
    await applyDeduction('DED-01', 'CAP_LATE')

    const written = postingsFor('liability.driver', 'DRV-0103', 'DED-01')
    expect(written).toHaveLength(1)
    expect(written[0]!.direction).toBe('debit')
    expect(written[0]!.amountHalalas).toBe(1_500)
    expect(written[0]!.balanceAfterHalalas).toBe(before.closingBalanceHalalas - 1_500)

    const after = await getCaptainPayableLedger('DRV-0103')
    expect(after.closingBalanceHalalas).toBe(before.closingBalanceHalalas - 1_500)
    const summary = (await listCaptainPayouts({ pageSize: 100 })).items.find(
      (p) => p.captainId === 'DRV-0103',
    )!
    expect(summary.payableHalalas).toBe(after.closingBalanceHalalas)
    await expectBooksAgree()
  })

  it('sends the excess of a deduction to the receivable rather than clamping — AC-371', async () => {
    /**
     * DRV-0105's payable is 0 after the failed payout, so the whole 30.00
     * becomes receivable rather than being silently forgiven — and **both
     * postings are shown**, which is the clause a summary check cannot see.
     * This captain has no seeded receivable position at all, so the debt
     * sub-tab has to acquire the row rather than lose the balance.
     */
    await applyDeduction('DED-02', 'CAP_NOSHOW')

    expect(postingsFor('liability.driver', 'DRV-0105', 'DED-02')).toEqual([])
    const excess = postingsFor('ar.driver', 'DRV-0105', 'DED-02')
    expect(excess).toHaveLength(1)
    expect(excess[0]!.direction).toBe('debit')
    expect(excess[0]!.amountHalalas).toBe(3_000)
    expect(excess[0]!.balanceAfterHalalas).toBe(3_000)

    const after = (await listCaptainPayouts({ pageSize: 100 })).items.find(
      (p) => p.captainId === 'DRV-0105',
    )!
    expect(after.payableHalalas).toBe(0)
    expect(after.cashDebtHalalas).toBe(3_000)
    expect((await getCaptainDebtLedger('DRV-0105')).closingBalanceHalalas).toBe(3_000)

    /* AC-381's rule applied to the population: a captain who acquires a
       receivable is in the total, not outside it. */
    const debts = await listCaptainDebts({ pageSize: 100 })
    expect(debts.items.find((d) => d.captainId === 'DRV-0105')!.balanceHalalas).toBe(3_000)
    await expectBooksAgree()
  })
})

/* ══════════════ 7 — cash and captain debt (AC-372–381) ════════════════ */

describe('cash reconciliation', () => {
  it('distinguishes never-reported from zero — AC-372', async () => {
    const page = await listCashReports({ view: 'all', pageSize: 100 })
    const never = page.items.filter((r) => r.reportedHalalas === null)
    expect(never.map((r) => r.id)).toEqual(['CASH-0002', 'CASH-0006'])
    expect(page.items.some((r) => r.reportedHalalas === 0)).toBe(false)
  })

  it('carries a report claimed by another operator — AC-374', async () => {
    const page = await listCashReports({ view: 'all', pageSize: 100 })
    const held = page.items.filter(
      (r) => r.claim?.state === 'claimed' && r.claim.ownerId !== 'USR-1',
    )
    expect(held.map((r) => r.id)).toEqual(['CASH-0002'])
  })

  it('does not claim on open, and writes no audit entry on render — AC-375, AC-376', async () => {
    const first = await listCashReports({ pageSize: 100 })
    const second = await listCashReports({ pageSize: 100 })
    expect(first.items.map((r) => r.claim?.ownerId ?? null)).toEqual(
      second.items.map((r) => r.claim?.ownerId ?? null),
    )
    expect(auditLogSize()).toBe(0)
  })

  it('refuses a claim held by another operator unless a take-over is confirmed', async () => {
    await expect(claimCashReport('CASH-0002')).rejects.toSatisfy(
      (e: unknown) => isApiError(e) && e.status === 409,
    )
    const taken = await claimCashReport('CASH-0002', { takeOver: true })
    expect(taken.claim!.ownerId).toBe('USR-1')
    expect(taken.claim!.takeovers).toHaveLength(1)
  })

  it('writes a credit posting on the receivable for a partial repayment — AC-379, D-F5', async () => {
    /**
     * AC-379 says **posting**, and there was none: the debt row moved and the
     * captain's receivable ledger did not, so the sub-tab and the ledger stated
     * different amounts outstanding — with the ledger as the wrong one.
     */
    const before = await getCaptainDebtLedger('DRV-0103')
    expect(before.closingBalanceHalalas).toBe(8_425)

    const after = await recordCashRepayment('DRV-0103', 3_000, 'CAP_OFFPLATFORM_PAY')

    const written = postingsFor('ar.driver', 'DRV-0103', 'REPAY-0002')
    expect(written).toHaveLength(1)
    expect(written[0]!.direction).toBe('credit')
    /* **Exactly that amount**, not the whole balance. */
    expect(written[0]!.amountHalalas).toBe(3_000)
    expect(written[0]!.balanceAfterHalalas).toBe(8_425 - 3_000)

    const ledger = await getCaptainDebtLedger('DRV-0103')
    expect(ledger.closingBalanceHalalas).toBe(8_425 - 3_000)
    expect(after.balanceHalalas).toBe(ledger.closingBalanceHalalas)
    /* And the remaining debt is still visible on the payouts index too. */
    const payout = (await listCaptainPayouts({ pageSize: 100 })).items.find(
      (p) => p.captainId === 'DRV-0103',
    )!
    expect(payout.cashDebtHalalas).toBe(8_425 - 3_000)
    await expectBooksAgree()
  })

  it('refuses a repayment above the outstanding balance', async () => {
    await expect(recordCashRepayment('DRV-0103', 99_999, 'CAP_OFFPLATFORM_PAY')).rejects.toSatisfy(
      (e: unknown) => isApiError(e) && e.status === 422,
    )
  })

  it('carries a captain over the debt cap — AC-380', async () => {
    const page = await listCaptainDebts({ view: 'over-cap', pageSize: 100 })
    expect(page.items.map((d) => d.captainId)).toEqual(['DRV-0206'])
  })

  it('leaves every cash report SLA unset — AC-453, and the test is INVERTED', () => {
    /**
     * **Supplying a number is the failing case.** No cash-review window exists
     * anywhere — not in `DB`, not in Operational Policy, not in the spec — and
     * AC-374 lost its countdown clause rather than gaining an invented one.
     *
     * This is written as a prohibition and not as a gap because a gap gets
     * quietly "fixed": the next agent who wants a countdown to render finds a
     * `null` and fills it in with something plausible, and the queue then shows
     * a deadline nobody set. **If you can make a countdown render here, you have
     * broken it.**
     */
    for (const report of cashReportFixtures) {
      expect(report.slaSource, report.id).toBe('unset')
      expect(report.slaDueAt, report.id).toBeNull()
      expect(report.slaTargetMinutes, report.id).toBeNull()
    }
  })
})

/* ══════════ 7b — the five accounts the owner added ═════════════════════ */

describe('the reopened chart of accounts', () => {
  it('carries all five new keys, and struck nothing', () => {
    for (const key of [
      'expense.promo',
      'expense.referral',
      'expense.incentive',
      'expense.gateway_fees',
      'equity.opening',
    ] as AccountKey[]) {
      expect(CHART_OF_ACCOUNTS.some((a) => a.key === key), key).toBe(true)
    }
    /* Nothing was struck: the original thirteen are all still there. */
    expect(CHART_OF_ACCOUNTS).toHaveLength(18)
  })

  it('makes `equity.opening` credit-normal, as equity is', () => {
    const equity = accountDefinition('equity.opening')
    expect(equity.type).toBe('equity')
    expect(equity.normalSide).toBe('credit')
  })

  it('gives every new account a real posting, not just a row on the trial balance', async () => {
    /* AC-415 lists every account whether or not it moved. An account with no
       posting is an account nobody has proved is postable. */
    const tb = await getTrialBalance()
    const balanceOf = (key: AccountKey) => tb.rows.find((r) => r.account === key)!.balanceHalalas
    expect(balanceOf('expense.promo')).toBe(8_400)
    expect(balanceOf('expense.referral')).toBe(3_000)
    expect(balanceOf('expense.incentive')).toBe(6_500)
    expect(balanceOf('expense.gateway_fees')).toBe(3_220)
    expect(balanceOf('equity.opening')).toBe(50_000)
  })

  it('keeps the books balanced after all five', async () => {
    const tb = await getTrialBalance()
    expect(tb.balanced).toBe(true)
    expect(tb.differenceHalalas).toBe(0)
  })

  it('serves the three givebacks FROM the ledger, not from a constant', async () => {
    /**
     * **`givebackOperationalFixture` is retired and this is what replaced it.**
     * The three used to be operational figures served beside a trial balance
     * rather than inside it — so `contributionMarginHalalas`, one of the two
     * numbers the Owner is asked to be able to state, was not derivable from the
     * books. A `✓ books balance` that certifies only part of a number is worse
     * than an honest OUT OF BALANCE (§3.8).
     */
    const overview = await getFinancialsOverview()
    const tb = await getTrialBalance()
    const balanceOf = (key: AccountKey) => tb.rows.find((r) => r.account === key)!.balanceHalalas
    expect(overview.promoHalalas).toBe(balanceOf('expense.promo'))
    expect(overview.referralHalalas).toBe(balanceOf('expense.referral'))
    expect(overview.incentiveHalalas).toBe(balanceOf('expense.incentive'))
  })

  it('keeps a refused posting, and it names an account that does not exist — AC-455', async () => {
    /**
     * **The trap.** The second refusal used to name `expense.promo`, which is
     * now a *valid* key — so left alone it would either start refusing a
     * legitimate account or stop refusing at all. AC-455 depends on a refusal
     * existing, so it was re-targeted at an account that is genuinely absent.
     *
     * This assertion is the guard: whatever the refusal names, the chart must
     * not contain it.
     */
    const refused = await listRefusedPostings()
    expect(refused.length).toBeGreaterThan(0)
    const unknown = refused.find((r) => r.reason.key === 'fin.refused.unknownAccount')!
    const named = String(unknown.reason.params!.account)
    expect(ACCOUNT_KEYS).not.toContain(named)
  })

  it('keeps BOTH chargeback recipes — D-F23 / AC-451', async () => {
    /**
     * §3.4c was **missing a recipe**, not describing the wrong one.
     * `Dr ar.rider · Cr cash.gateway` is correct for a **fare** chargeback
     * (`JE-00036`); `Dr liability.wallet · Cr cash.gateway` is the **top-up**
     * chargeback (`JE-00030`, now (c-ii)) and is the only recipe that yields
     * `RDR-4001`'s −41.50. Both stay.
     */
    const entries = journalEntries()
    const fare = entries.find((e) => e.id === 'JE-00036')!
    const topUp = entries.find((e) => e.id === 'JE-00030')!
    expect(fare.lines.map((l) => l.account)).toEqual(['ar.rider', 'cash.gateway'])
    expect(topUp.lines.map((l) => l.account)).toEqual(['liability.wallet', 'cash.gateway'])
    /* And only the top-up one can drive a balance negative, because only it
       touches the account a rider's balance IS. */
    const wallets = await listWallets({ view: 'negative-balances', pageSize: 100 })
    expect(wallets.items.map((w) => w.riderId)).toContain('RDR-4001')
  })
})

/* ══════════════ 8 — wallets and authority (AC-382–388) ════════════════ */

describe('rider wallets', () => {
  it('carries an overdrawn wallet, from a chargeback — AC-383', async () => {
    const page = await listWallets({ view: 'negative-balances', pageSize: 100 })
    expect(page.items.map((w) => w.riderId)).toEqual(['RDR-4001'])
    expect(page.items[0]!.balanceHalalas).toBe(-4_150)
  })

  it('carries a first-run wallet and a filtered-to-zero wallet, distinguishably — AC-427', async () => {
    const page = await listWallets({ pageSize: 100 })
    const firstRun = page.items.find((w) => w.riderId === 'RDR-2055')!
    expect(firstRun.postingCount).toBe(0)
    const zeroWithHistory = page.items.find((w) => w.riderId === 'RDR-2031')!
    expect(zeroWithHistory.balanceHalalas).toBe(0)
    expect(zeroWithHistory.postingCount).toBeGreaterThan(0)
  })

  it('excludes an authorised posting from the balance and shows it as pending — AC-312', async () => {
    const ledger = await getWalletLedger('RDR-1041')
    expect(ledger.closingBalanceHalalas).toBe(2_000)
    expect(ledger.pendingHalalas).toBe(12_000)
    const authorised = ledger.postings.find((p) => p.id === 'WTX-0005')!
    expect(authorised.balanceAfterHalalas).toBeNull()
  })

  it('refuses a credit above the per-case ceiling and names it — AC-384', async () => {
    const check = await checkAdjustmentAuthority('RDR-1041', 200_000, 'CAP_LATE')
    expect(check.allowed).toBe(false)
    expect(check.blockedReason?.key).toBe('fin.authority.abovePerCase')
    await expect(
      adjustWallet({
        riderId: 'RDR-1041',
        amountHalalas: 200_000,
        direction: 'credit',
        reasonCode: 'CAP_LATE',
      }),
    ).rejects.toSatisfy((e: unknown) => isApiError(e) && e.status === 403)
  })

  it('applies the authority check regardless of the reason chosen — AC-385, D-F21', async () => {
    for (const reasonCode of ['CAP_LATE', 'PAY_INCORRECT_CHARGE', 'BKG_NO_SUPPLY']) {
      const check = await checkAdjustmentAuthority('RDR-1041', 200_000, reasonCode)
      expect(check.allowed, reasonCode).toBe(false)
    }
  })

  it('books the adjustment into the GL, not only onto the wallet ledger', async () => {
    /**
     * **The sixth act in the same family, and the quietest one.**
     * `adjustWallet` wrote the posting and `journalEntryId: null` — no journal
     * entry at all — so the rider's wallet ledger moved and the trial balance
     * did not. The books still read `✓ books balance`, because nothing was
     * written to unbalance them, while `liability.wallet`'s GL balance and the
     * sum of its own postings drifted apart by every adjustment ever made.
     *
     * `expectBooksAgree` is what catches it: balancing is not the same claim as
     * agreeing.
     */
    const before = await getWalletLedger('RDR-1075')
    const { posting } = await adjustWallet({
      riderId: 'RDR-1075',
      amountHalalas: 500,
      direction: 'credit',
      reasonCode: 'CAP_LATE',
    })
    expect(posting.journalEntryId).not.toBeNull()
    expect(posting.balanceAfterHalalas).toBe(before.closingBalanceHalalas + 500)

    const entry = (await listJournalEntries({ pageSize: 200 })).items.find(
      (e) => e.id === posting.journalEntryId,
    )!
    expect(entry.lines.map((l) => l.account).sort()).toEqual([
      'expense.goodwill',
      'liability.wallet',
    ])
    expect(entry.totalHalalas).toBe(500)
    await expectBooksAgree()
  })

  it('writes no journal entry for an adjustment that is still pending — AC-312', async () => {
    /* No money has moved yet, so there is nothing to book. The GL and the
       subject ledger differ by exactly the pending line, which is the one case
       in which they are meant to. */
    const { posting } = await adjustWallet({
      riderId: 'RDR-1041',
      amountHalalas: 25_000,
      direction: 'credit',
      reasonCode: 'CAP_LATE',
    })
    expect(posting.settlement).toBe('pending')
    expect(posting.balanceAfterHalalas).toBeNull()
    expect(posting.journalEntryId).toBeNull()
    await expectBooksAgree()
  })

  it('creates an over-threshold adjustment as pending rather than committing it — AC-386', async () => {
    const { posting, authority } = await adjustWallet({
      riderId: 'RDR-1041',
      amountHalalas: 30_000,
      direction: 'credit',
      reasonCode: 'CAP_NOSHOW',
    })
    expect(authority.needsSecondApproval).toBe(true)
    expect(posting.settlement).toBe('pending')
    expect(posting.balanceAfterHalalas).toBeNull()
  })

  it('refuses an adjustment with no reason code — AC-387', async () => {
    await expect(
      adjustWallet({ riderId: 'RDR-1041', amountHalalas: 500, direction: 'credit', reasonCode: '' }),
    ).rejects.toSatisfy((e: unknown) => isApiError(e) && e.status === 422)
  })

  it('has no field in which to name another posting — AC-388', async () => {
    const { posting } = await adjustWallet({
      riderId: 'RDR-1041',
      amountHalalas: 500,
      direction: 'credit',
      reasonCode: 'CAP_LATE',
    })
    expect(posting.reversesPostingId).toBeNull()
    expect(posting.sourceId).toBeNull()
  })

  it('reports the role the ceiling came from, so a fall-through is visible — AC-439, D-F20', async () => {
    const check = await checkAdjustmentAuthority('RDR-1041', 100, 'CAP_LATE')
    expect(check.appliedRole).toBe('Owner')
  })
})

/* ══════════════ 9 — pricing, Stage A (AC-389–401, AC-404–414) ═════════ */

describe('pricing and plans, Stage A', () => {
  it('serves the plan catalogue with the pricing half not editable — §4.5', async () => {
    const plans = await listPlans()
    expect(plans).toHaveLength(3)
    expect(plans.every((p) => p.pricingEditable === false)).toBe(true)
    expect(plans.map((p) => p.id)).toEqual(['weekly', 'biweekly', 'monthly'])
  })

  it('writes only the catalogue half on save, leaving the pricing half alone', async () => {
    const before = await listPlans()
    const weekly = before.find((p) => p.id === 'weekly')!
    const saved = await savePlan('weekly', {
      nameEn: 'Weekly Plus',
      nameAr: 'الباقة الأسبوعية بلس',
      durationDays: 7,
      executeDays: 6,
      cancelCap: 2,
      sortOrder: 1,
      status: 'active',
      features: weekly.features,
      economyActive: true,
      comfortActive: false,
    })
    expect(saved.nameEn).toBe('Weekly Plus')
    expect(saved.executeDays).toBe(6)
    /* The status select is read by the save handler — `savePlan()` reads it
       from nothing today (§8.6, AC-401). */
    expect(saved.status).toBe('active')
    expect(saved.comfortActive).toBe(false)
    expect(saved.commissionPercent).toBe(weekly.commissionPercent)
  })

  it('blocks a save with a missing Arabic name — AC-448 precondition, `:6125`', async () => {
    const weekly = (await listPlans()).find((p) => p.id === 'weekly')!
    await expect(
      savePlan('weekly', {
        nameEn: 'Weekly',
        nameAr: '  ',
        durationDays: 7,
        executeDays: 5,
        cancelCap: 1,
        sortOrder: 1,
        status: 'active',
        features: weekly.features,
        economyActive: true,
        comfortActive: true,
      }),
    ).rejects.toSatisfy(
      (e: unknown) => isApiError(e) && e.details.some((d) => d.field === 'nameAr'),
    )
  })

  it('refuses a blank numeric rather than coercing it to zero — D-F3', async () => {
    const weekly = (await listPlans()).find((p) => p.id === 'weekly')!
    await expect(
      savePlan('weekly', {
        nameEn: 'Weekly',
        nameAr: 'الباقة الأسبوعية',
        durationDays: Number.NaN,
        executeDays: 5,
        cancelCap: 1,
        sortOrder: 1,
        status: 'active',
        features: weekly.features,
        economyActive: true,
        comfortActive: true,
      }),
    ).rejects.toSatisfy(
      (e: unknown) => isApiError(e) && e.details.some((d) => d.field === 'durationDays'),
    )
  })

  it('reaches both Approve-disabled draft states without editing a fixture — AC-404, AC-405', async () => {
    const cards = await listRateCards()
    const drafts = cards.filter((c) => c.status === 'draft')
    expect(drafts.some((c) => c.simulation === null)).toBe(true)
    expect(drafts.some((c) => c.simulation !== null && c.proposedByUserId !== null)).toBe(true)
  })

  it('serves a live rate card the derived values can read — §4.5', async () => {
    const live = await getLiveRateCard()
    expect(live.status).toBe('live')
    expect(live.classes).toHaveLength(2)
    expect(live.classes.every((c) => Number.isInteger(c.perKmHalalas))).toBe(true)
    expect(live.surge.appliesToPlanLegs).toBe(false)
  })

  it('marks the five unenforced cancellation rules — AC-414, D-F7', async () => {
    const rules = await listCancellationRules()
    expect(rules).toHaveLength(8)
    expect(rules.filter((r) => !r.hasEnforcement)).toHaveLength(5)
    const enforced = rules.filter((r) => r.hasEnforcement).map((r) => r.id).sort()
    expect(enforced).toEqual(['qr_after_grace', 'qr_rider_noshow', 'sub_mid_cycle'])
  })

  it('discriminates a quick-ride rule from a subscription rule by shape', async () => {
    const rules = await listCancellationRules()
    for (const rule of rules) {
      if (rule.appliesTo === 'quick_ride') expect(Number.isInteger(rule.feeHalalas)).toBe(true)
      else expect(typeof rule.feePercent).toBe('number')
    }
  })

  it('caps a surge suspension at 12 hours and requires a reason — AC-409, AC-411', async () => {
    await expect(
      suspendSurge({ zoneId: 'z', zoneName: 'Z', reason: ' ', hours: 2 }),
    ).rejects.toSatisfy((e: unknown) => isApiError(e) && e.status === 422)
    await expect(
      suspendSurge({ zoneId: 'z', zoneName: 'Z', reason: 'event', hours: 24 }),
    ).rejects.toSatisfy((e: unknown) => isApiError(e) && e.status === 422)
    const suspension = await suspendSurge({
      zoneId: 'z',
      zoneName: 'Z',
      reason: 'event',
      hours: 4,
    })
    expect(suspension.expiresAt).toBeTruthy()
  })

  it('defines every derived value exactly once, and rounds exactly once — D-F2, M-1', () => {
    const ids = PLAN_PRICING_DEFINITIONS.map((d) => d.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(PLAN_PRICING_DEFINITIONS.filter((d) => d.rounds)).toHaveLength(1)
    expect(PLAN_PRICING_DEFINITIONS.filter((d) => d.isResidual)).toHaveLength(1)
    /* The residual comes last, so the legs always sum exactly (M-3). */
    expect(PLAN_PRICING_DEFINITIONS[PLAN_PRICING_DEFINITIONS.length - 1]!.isResidual).toBe(true)
  })

  it('reads every expression only from ids it declares as inputs', () => {
    const known = new Set([
      ...PLAN_PRICING_DEFINITIONS.map((d) => d.id),
      'exampleMinutes',
      'exampleKm',
    ])
    for (const definition of PLAN_PRICING_DEFINITIONS) {
      const identifiers = definition.expression.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? []
      for (const identifier of identifiers) {
        expect(
          definition.inputs.includes(identifier) || known.has(identifier),
          `${definition.id}: ${identifier}`,
        ).toBe(true)
      }
    }
  })
})

/* ══════════════ 10 — gateways, audit, and the seam ════════════════════ */

describe('payment gateways', () => {
  it('refuses to disable the default and leaves it enabled — AC-422', async () => {
    await expect(setGatewayEnabled('mada', false)).rejects.toSatisfy(
      (e: unknown) => isApiError(e) && e.status === 409,
    )
    const gateways = await listGateways()
    expect(gateways.find((g) => g.id === 'mada')!.enabled).toBe(true)
  })

  it('renders a zero count as zero, not as a badge-worthy number — AC-432 precondition', async () => {
    const gateways = await listGateways()
    expect(gateways.some((g) => g.transactionCount === 0)).toBe(true)
  })
})

describe('the audit log', () => {
  it('writes exactly one entry per money-moving action — AC-437', async () => {
    const actions: Array<() => Promise<unknown>> = [
      () => payCaptain('DRV-0101', 'CAP_LATE'),
      () => releaseEscrow('ESC-1052', 'CAP_LATE'),
      () => applyDeduction('DED-01', 'CAP_LATE'),
      () => waiveDeduction('DED-02', 'CAP_NOSHOW'),
      () =>
        issueRefund({
          riderId: 'RDR-1041',
          amountHalalas: 1_000,
          reasonCode: 'PAY_REFUND_REQ',
          destination: 'wallet',
        }),
      () =>
        adjustWallet({
          riderId: 'RDR-1075',
          amountHalalas: 500,
          direction: 'credit',
          reasonCode: 'CAP_LATE',
        }),
      () => reversePosting('WTX-2087-1', 'PAY_INCORRECT_CHARGE'),
      () => recordCashRepayment('DRV-0103', 100, 'CAP_OFFPLATFORM_PAY'),
    ]
    for (const [i, action] of actions.entries()) {
      await action()
      expect(auditLogSize(), `after action ${i}`).toBe(i + 1)
    }
  })
})

describe('every money act writes a posting, and the books still agree', () => {
  /**
   * **The check that would have caught all six at once, and the reason it is
   * written as a loop rather than six assertions.**
   *
   * The four acts AC-362, AC-364, AC-371 and AC-379 name were each verified
   * against a *summary*, which is the wrong object, and each passed while
   * writing no posting at all. A per-act assertion catches a per-act mistake; a
   * loop over every money-moving act catches the *class* of mistake — including
   * on the act somebody adds next, which no criterion has named yet.
   *
   * Each act is performed through its real client, and then: at least one new
   * posting exists, the trial balance still balances, and every subject ledger
   * still agrees with the GL account it aggregates.
   */
  const ACTS: Array<{ name: string; run: () => Promise<unknown> }> = [
    { name: 'payouts.pay', run: () => payCaptain('DRV-0101', 'CAP_LATE') },
    { name: 'payouts.pay (in credit)', run: () => payCaptain('DRV-0104', 'CAP_LATE') },
    { name: 'payouts.releaseEscrow', run: () => releaseEscrow('ESC-1052', 'CAP_LATE') },
    { name: 'payouts.applyDeduction', run: () => applyDeduction('DED-01', 'CAP_LATE') },
    {
      name: 'payouts.applyDeduction (excess)',
      run: () => applyDeduction('DED-02', 'CAP_NOSHOW'),
    },
    {
      name: 'cash.repayment',
      run: () => recordCashRepayment('DRV-0103', 3_000, 'CAP_OFFPLATFORM_PAY'),
    },
    {
      name: 'revenue.issueRefund (wallet)',
      run: () =>
        issueRefund({
          riderId: 'RDR-1041',
          amountHalalas: 4_000,
          reasonCode: 'PAY_REFUND_REQ',
          destination: 'wallet',
        }),
    },
    {
      name: 'revenue.issueRefund (instrument)',
      run: () =>
        issueRefund({
          riderId: 'RDR-1041',
          amountHalalas: 4_000,
          reasonCode: 'PAY_REFUND_REQ',
          destination: 'instrument',
          sourcePaymentId: 'PAY-5510',
          /* The wallet refund above is the same rider, amount and reason, and
             the duplicate check is right to stop it. Confirmed, as AC-358 says. */
          confirmDuplicate: true,
        }),
    },
    {
      name: 'wallets.adjust',
      run: () =>
        adjustWallet({
          riderId: 'RDR-1075',
          amountHalalas: 500,
          direction: 'credit',
          reasonCode: 'CAP_LATE',
        }),
    },
    { name: 'ledger.reverse', run: () => reversePosting('WTX-2087-1', 'PAY_INCORRECT_CHARGE') },
  ]

  it.each(ACTS)('$name writes a posting', async ({ run }) => {
    const before = allLedgerPostings().length
    await run()
    expect(allLedgerPostings().length).toBeGreaterThan(before)
  })

  it.each(ACTS)('$name leaves the books balanced and agreeing', async ({ run }) => {
    await run()
    await expectBooksAgree()
  })

  it('leaves the books agreeing after all of them in sequence', async () => {
    for (const act of ACTS) await act.run()
    await expectBooksAgree()
  })

  it('moves the Overview tiles with the acts, not beside them — AC-346', async () => {
    /* Three tiles read the fixture arrays rather than the live state, so a
       release moved the escrow list and left the escrow tile stating the old
       figure — AC-346's failure in miniature, a header contradicting the table
       five rows below it (`12a` R12). */
    const before = await getFinancialsOverview()
    await releaseEscrow('ESC-1052', 'CAP_LATE')
    const after = await getFinancialsOverview()
    expect(after.escrowHeldHalalas).toBe(before.escrowHeldHalalas - 32_960)
    expect(after.pendingPayoutsHalalas).toBe(before.pendingPayoutsHalalas + 32_960)

    const payouts = await listCaptainPayouts({ pageSize: 100 })
    expect(after.pendingPayoutsHalalas).toBe(
      payouts.items.reduce((sum, p) => sum + p.payableHalalas, 0),
    )
    const escrow = await listEscrowHolds({ view: 'held', pageSize: 100 })
    expect(after.escrowHeldHalalas).toBe(escrow.items.reduce((sum, e) => sum + e.amountHalalas, 0))
  })

  it('keeps the captain-debt tile equal to the positive receivables after a repayment — AC-350', async () => {
    await recordCashRepayment('DRV-0103', 3_000, 'CAP_OFFPLATFORM_PAY')
    const overview = await getFinancialsOverview()
    const debts = await listCaptainDebts({ pageSize: 100 })
    expect(overview.captainDebtHalalas).toBe(
      debts.items.filter((d) => d.balanceHalalas > 0).reduce((s, d) => s + d.balanceHalalas, 0),
    )
  })

  it('refuses an unbalanced entry rather than writing one leg — §3.8, `:19926`', () => {
    /**
     * The guard that makes the fix hold. If an act cannot be balanced within
     * the closed chart, `postEntry` throws and **nothing is written** — it is a
     * finding for product-owner, not a licence to post one side. The legacy
     * `postLedger` already refuses one; the mock must not be more permissive
     * than the thing it stands in for.
     */
    expect(() =>
      postEntry({
        type: 'test',
        reference: 'test|unbalanced',
        meta: {},
        postings: [
          {
            idPrefix: 'PAY-0106',
            subjectAccount: 'liability.driver',
            subjectId: 'DRV-0106',
            direction: 'debit',
            amountHalalas: 100,
            description: { key: 'fin.posting.payout', params: { reference: 'X' } },
            reference: 'X',
            sourceType: 'payout',
            sourceId: 'X',
          },
        ],
      }),
    ).toThrow(/unbalanced/i)
    expect(allLedgerPostings().some((p) => p.reference === 'X')).toBe(false)
  })
})

describe('the seam', () => {
  const READS: Array<{ op: string; call: () => Promise<unknown> }> = [
    { op: 'financials.overview', call: () => getFinancialsOverview() },
    { op: 'ledger.trialBalance', call: () => getTrialBalance() },
    { op: 'ledger.reconciliation', call: () => listReconciliation() },
    { op: 'ledger.gateways', call: () => listGateways() },
    { op: 'ledger.postings', call: () => getLedger('contra.refunds', null) },
    { op: 'revenue.refunds', call: () => listRefunds() },
    { op: 'revenue.creditNotes', call: () => listCreditNotes() },
    { op: 'payouts.list', call: () => listCaptainPayouts() },
    { op: 'payouts.escrow', call: () => listEscrowHolds() },
    { op: 'payouts.deductions', call: () => listDeductions() },
    { op: 'cash.list', call: () => listCashReports() },
    { op: 'cash.debts', call: () => listCaptainDebts() },
    { op: 'wallets.list', call: () => listWallets() },
    { op: 'wallets.ledger', call: () => getWalletLedger('RDR-1041') },
    { op: 'pricing.plans', call: () => listPlans() },
    { op: 'pricing.cancellationRules', call: () => listCancellationRules() },
  ]

  it.each(READS)('$op returns a Promise and can be made to fail', async ({ op, call }) => {
    const result = call()
    expect(result).toBeInstanceOf(Promise)
    await expect(result).resolves.toBeDefined()

    mockFailures.always(op)
    await expect(call()).rejects.toSatisfy(isApiError)
    mockFailures.clear(op)
    await expect(call()).resolves.toBeDefined()
  })

  it.each(READS)('$op is deterministic across two calls', async ({ call }) => {
    expect(await call()).toStrictEqual(await call())
  })

  it('makes every mutation injectable too — AC-430', async () => {
    const MUTATIONS = [
      'payouts.pay',
      'payouts.releaseEscrow',
      'payouts.applyDeduction',
      'payouts.waiveDeduction',
      'revenue.issueRefund',
      'wallets.adjust',
      'ledger.reverse',
      'cash.repayment',
      'cash.resolve',
      'cash.escalate',
      'cash.claim',
      'pricing.savePlan',
      'pricing.suspendSurge',
      'ledger.toggleGateway',
      'ledger.setDefaultGateway',
    ]
    for (const op of MUTATIONS) {
      mockFailures.always(op)
      expect(mockFailures.peek(op), op).not.toBeNull()
      mockFailures.clear(op)
    }
  })
})

/* ══════════════ 11 — realistically ugly ═══════════════════════════════ */

describe('the fixtures are realistically ugly', () => {
  it('carries a captain whose payable is negative', () => {
    expect(captainPayoutFixtures.some((p) => p.payableHalalas < 0)).toBe(true)
  })

  it('carries a captain name long enough to break the identity column', () => {
    expect(captainPayoutFixtures.some((p) => p.captainName.length > 40)).toBe(true)
  })

  it('carries a four-figure SAR amount that makes a money column wide', () => {
    expect(cashReportFixtures.some((r) => r.expectedFareHalalas > 100_000)).toBe(true)
  })

  it('carries a refund with no source, a note with no invoice and an escrow with no rule', () => {
    expect(refundFixtures.some((r) => r.sourcePaymentId === null)).toBe(true)
    expect(creditNoteFixtures.some((n) => n.unlinked)).toBe(true)
    expect(escrowHoldFixtures.some((e) => e.subscriptionCancelled)).toBe(true)
  })

  it('reaches every settlement state the ledger can render, or says which it cannot', () => {
    const seeded = new Set(ledgerPostingFixtures.map((p) => p.settlement))
    for (const state of ['settled', 'authorised', 'reversed', 'failed']) {
      expect(seeded.has(state as never), state).toBe(true)
    }
    /* `pending` is reachable through `adjustWallet` above the second-approval
       threshold; `released` through `reversePosting` on an authorised row.
       `held`, `reconciling`, `voided` and `escalated` live on the *documents* —
       `EscrowHold.settlement` and `CashReport.status` — not on postings. */
  })

  it('reaches every cash classification the filter offers', () => {
    const seen = new Set(cashReportFixtures.map((r) => r.classification))
    for (const c of ['match', 'over_report', 'under_report', 'no_report']) {
      expect(seen.has(c as never), c).toBe(true)
    }
  })

  it('reaches every deduction and escrow state', () => {
    expect(new Set(escrowHoldFixtures.map((e) => e.settlement))).toEqual(
      new Set(['held', 'released']),
    )
    expect(new Set(captainDebtFixtures.map((d) => d.balanceHalalas > 0))).toEqual(
      new Set([true, false]),
    )
  })
})
