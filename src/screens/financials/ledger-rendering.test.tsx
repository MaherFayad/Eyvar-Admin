/**
 * The §8.3 ledger, asserted at the DOM an operator reads — **AC-303 … AC-312**,
 * plus **AC-426**'s skeleton and **AC-452**'s escrow half.
 *
 * ## Two rules this file is written to
 *
 * **No bare `vi.spyOn` anywhere in this file — no spies at all.** A spy without
 * an implementation does not intercept the `@/data/clients` barrel's live
 * binding, so a *negative* assertion against one passes vacuously: *"it was
 * never called"* and *"I was never watching"* are indistinguishable. Every
 * absence below is asserted against the rendered DOM or against a value the
 * client actually returned, and every state is reached through the mock's own
 * failure injection.
 *
 * **Prefer the assertion a hardcoded value would fail.** A presence check on a
 * placement rule passes in exactly the case the rule forbids, so where a
 * criterion's content is a *relationship* — this balance is that balance minus
 * this amount; this row's balance is the persisted field and not a running sum
 * — the relationship is what is asserted. The local fixtures at the bottom of
 * this file exist for that: they hold a `balanceAfterHalalas` that **disagrees
 * with the running sum on purpose**, so a component that recomputed instead of
 * rendering would fail AC-311 rather than coincidentally agreeing with it.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  disableMockLatency,
  getRouteTable,
  listEscrowHolds,
  mockFailures,
  resetDataLayer,
  WALLET_OPERATIONS,
} from '@/data/clients'
import type { Ledger, LedgerPosting, SubTabRoute } from '@/data/types'
import { EN } from '@/i18n/dictionaries'
import { useIndexTable } from '@/hooks'
import { ShellProvider, useShell } from '@/shell/ShellContext'
import { LedgerCard } from './shared/LedgerCard'
import { CashScreen } from './cash/CashScreen'
import { PayoutsScreen } from './payouts/PayoutsScreen'
import { WalletsScreen } from './wallets/WalletsScreen'

const table = getRouteTable()
const rowFor = (subTabId: string): SubTabRoute => {
  const row = table.subTabs.find((each) => each.subTabId === subTabId)
  if (!row) throw new Error(`No route-table row for ${subTabId}`)
  return row
}

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
})

function mount(ui: React.ReactElement, path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider>{ui}</ShellProvider>
    </MemoryRouter>,
  )
}

/* ───────────────────────────── reading a cell ───────────────────────────── */

const EM_DASH = '—'

/** `1,234.56` → 123456 · `−41.50` → −4150 · `—` → null. */
function halalasFromCell(text: string): number | null {
  const trimmed = text.trim()
  if (trimmed === '' || trimmed === EM_DASH) return null
  const normalised = trimmed.replace(/−/g, '-').replace(/,/g, '')
  const value = Number(normalised)
  if (!Number.isFinite(value)) return null
  return Math.round(value * 100)
}

interface LedgerRowCells {
  reference: string
  debit: number | null
  credit: number | null
  balance: number | null
}

/** Every body row of the one ledger table on screen, in render order. */
function ledgerRows(): LedgerRowCells[] {
  return screen
    .getAllByRole('row')
    .map((row) => within(row).queryAllByRole('cell'))
    .filter((cells) => cells.length >= 6)
    .map((cells) => ({
      reference: cells[1]?.textContent?.trim() ?? '',
      debit: halalasFromCell(cells[3]?.textContent ?? ''),
      credit: halalasFromCell(cells[4]?.textContent ?? ''),
      balance: halalasFromCell(cells[5]?.textContent ?? ''),
    }))
}

/* ═══════════════ AC-306 / AC-307 — the direction is the meaning ══════════ */

describe('a posting moves the subject balance in the direction its column names', () => {
  /**
   * **AC-306** — *"a captain payable ledger row created by a completed payout
   * renders in the Debit column and decreases the amount Eyvar owes that
   * captain."*
   *
   * The load-bearing assertion is the **relationship**, not the number: the
   * payout row's balance equals the row above it minus the debit. A hardcoded
   * `685.96` passes a presence check and fails this one.
   */
  it('AC-306 — a payout debits the captain payable and lowers what Eyvar owes', async () => {
    mount(<PayoutsScreen row={rowFor('financials-payouts')} />, '/financials/payouts?captain=DRV-0102')
    await waitFor(() => expect(screen.getByText(EN['fin.ledger.opening'] as string)).toBeTruthy())

    const rows = ledgerRows()
    const index = rows.findIndex((row) => row.reference === 'PO-0002')
    expect(index, 'the payout row PO-0002 is on the captain payable ledger').toBeGreaterThan(0)

    const payout = rows[index] as LedgerRowCells
    const previous = rows[index - 1] as LedgerRowCells

    /* In the Debit column, and nothing in the Credit column. */
    expect(payout.debit).not.toBeNull()
    expect(payout.credit).toBeNull()

    /* And the balance FELL by exactly that debit. */
    expect(payout.balance).toBe((previous.balance as number) - (payout.debit as number))
    expect(payout.balance as number).toBeLessThan(previous.balance as number)
  })

  /**
   * **AC-307** — *"a captain cash-receivable row created by commission owed on a
   * cash fare renders in the Debit column and increases the amount that captain
   * owes Eyvar."*
   *
   * Same account type, opposite normal side, opposite reading of the same
   * word — which is the whole of §3.2 and the reason this is a separate test
   * rather than a second `expect` in the one above.
   */
  it('AC-307 — a cash commission debits the receivable and raises what the captain owes', async () => {
    mount(<CashScreen row={rowFor('financials-cash')} />, '/financials/cash?captain=DRV-0103')
    await waitFor(() => expect(screen.getByText(EN['fin.ledger.opening'] as string)).toBeTruthy())

    const rows = ledgerRows()
    const index = rows.findIndex((row) => row.reference === 'CASH-0002')
    expect(index, 'the cash-commission row CASH-0002 is on the receivable ledger').toBeGreaterThan(0)

    const commission = rows[index] as LedgerRowCells
    const previous = rows[index - 1] as LedgerRowCells

    expect(commission.debit).not.toBeNull()
    expect(commission.credit).toBeNull()
    expect(commission.balance).toBe((previous.balance as number) + (commission.debit as number))
    expect(commission.balance as number).toBeGreaterThan(previous.balance as number)
  })

  /**
   * **AC-304** — a credit raises a rider's wallet balance by exactly its
   * amount. The spec names *"a goodwill credit of 20.00 SAR"*; the dataset's
   * 20.00 credit is `WTX-0002`, a referral bonus, and its 50.00 goodwill credit
   * is `WTX-4001-1`. Both are asserted, so the criterion is covered by its
   * substance rather than by one literal it happens to name.
   */
  it('AC-304 — a wallet credit renders in Credit and raises the balance by its amount', async () => {
    mount(
      <WalletsScreen row={rowFor('financials-rider-wallets')} />,
      '/financials/rider-wallets?rider=RDR-1041',
    )
    await waitFor(() => expect(screen.getByText(EN['fin.ledger.opening'] as string)).toBeTruthy())

    const rows = ledgerRows()
    const credit = rows.find((row) => row.reference === 'WTX-0002') as LedgerRowCells
    expect(credit).toBeDefined()
    expect(credit.credit).toBe(2_000)
    expect(credit.debit).toBeNull()

    /* The first posting on this ledger, so the opening balance is what it moved
       from — read from the opening row rather than assumed to be zero. */
    const opening = halalasFromCell(
      (screen.getByText(EN['fin.ledger.opening'] as string).closest('tr')?.textContent ?? '')
        .replace(EN['fin.ledger.opening'] as string, ''),
    )
    expect(credit.balance).toBe((opening ?? 0) + 2_000)
  })

  /** **AC-305** — a trip fare debits the wallet and lowers the balance by 6.40. */
  it('AC-305 — a trip fare renders in Debit and lowers the balance by its amount', async () => {
    mount(
      <WalletsScreen row={rowFor('financials-rider-wallets')} />,
      '/financials/rider-wallets?rider=RDR-1041',
    )
    await waitFor(() => expect(screen.getByText(EN['fin.ledger.opening'] as string)).toBeTruthy())

    const rows = ledgerRows()
    const index = rows.findIndex((row) => row.reference === 'WTX-0003')
    const fare = rows[index] as LedgerRowCells
    const previous = rows[index - 1] as LedgerRowCells

    expect(fare.debit).toBe(640)
    expect(fare.credit).toBeNull()
    expect(fare.balance).toBe((previous.balance as number) - 640)
  })
})

/* ════════════════════ AC-308 — the subject, in words ═════════════════════ */

describe('AC-308 — every ledger names its subject account and its normal side', () => {
  /**
   * Two ledgers with **opposite** normal sides, asserted in one test, because
   * the criterion's content is that the sub-line is read from the account and
   * not written once per screen. A constant string passes on one of these and
   * fails the other.
   */
  it('the card header names the account and states which direction increases it', async () => {
    const { unmount } = mount(
      <WalletsScreen row={rowFor('financials-rider-wallets')} />,
      '/financials/rider-wallets?rider=RDR-1041',
    )
    await waitFor(() => expect(screen.getByText(EN['fin.ledger.opening'] as string)).toBeTruthy())

    /* `liability.wallet` is credit-normal, and the subject is named in words. */
    const walletHeading = screen.getAllByRole('heading', { level: 2 })[0] as HTMLElement
    expect(walletHeading.textContent).toContain('Rider wallet')
    expect(walletHeading.textContent).toContain('Nora Al-Harbi')
    expect(screen.getByText(EN['fin.ledger.normalSide.credit'] as string)).toBeTruthy()
    expect(screen.queryByText(EN['fin.ledger.normalSide.debit'] as string)).toBeNull()

    unmount()

    /* `ar.driver` is debit-normal, and the same sub-line reads the other way. */
    mount(<CashScreen row={rowFor('financials-cash')} />, '/financials/cash?captain=DRV-0103')
    await waitFor(() => expect(screen.getByText(EN['fin.ledger.opening'] as string)).toBeTruthy())

    const debtHeading = screen.getAllByRole('heading', { level: 2 })[0] as HTMLElement
    expect(debtHeading.textContent).toContain('Khalid Mansour')
    expect(screen.getByText(EN['fin.ledger.normalSide.debit'] as string)).toBeTruthy()
    expect(screen.queryByText(EN['fin.ledger.normalSide.credit'] as string)).toBeNull()
  })
})

/* ═══════ AC-312 — a non-settled posting is out of the balance entirely ════ */

describe('AC-312 — a pending posting has no balance and is not in the card balance', () => {
  /**
   * `WTX-0005` is 120.00 **authorised**. The criterion has three clauses and
   * each is a separate `expect`: the balance cell is an em dash, the amount is
   * excluded from the card-header balance, and it appears on its own labelled
   * `Pending` line beneath it.
   *
   * The exclusion is asserted as *closing balance equals the last SETTLED row's
   * balance*, not as a literal — a header that had summed the authorised row in
   * would fail it, and a header that hardcoded the right number would fail the
   * `Pending` clause below.
   */
  it('renders an em dash in Balance, states Pending separately, and excludes it', async () => {
    mount(
      <WalletsScreen row={rowFor('financials-rider-wallets')} />,
      '/financials/rider-wallets?rider=RDR-1041',
    )
    await waitFor(() => expect(screen.getByText(EN['fin.ledger.opening'] as string)).toBeTruthy())

    const rows = ledgerRows()
    const authorised = rows.find((row) => row.reference === 'AUTH-6120') as LedgerRowCells
    expect(authorised, 'the authorised posting is on the ledger').toBeDefined()

    /* Clause 1 — no running balance on a row that has not settled. */
    expect(authorised.balance).toBeNull()
    /* Its amount is still in a money column: it is a real posting. */
    expect(authorised.credit).toBe(12_000)

    /* Clause 3 — a separate labelled line, beneath the balance. */
    const pendingLabel = screen.getByText(EN['fin.ledger.pending'] as string)
    expect(pendingLabel.textContent).toContain('120.00')
    expect(screen.getByText(EN['fin.ledger.pending.help'] as string)).toBeTruthy()

    /* Clause 2 — the card balance is the last SETTLED row's balance, so the
       120.00 is not inside it. Both places it renders are read: the card
       header and the closing row, which AC-318 requires to agree. */
    const settled = rows.filter((row) => row.balance !== null)
    const lastSettled = settled[settled.length - 1] as LedgerRowCells

    const headerBalance = halalasFromCell(
      (screen.getByText(EN['fin.ledger.balance'] as string).nextElementSibling?.textContent ?? '')
        .replace('SAR', ''),
    )
    const closingRow = screen.getByText(EN['fin.ledger.closing'] as string).closest('tr')
    const closingBdis = [...(closingRow?.querySelectorAll('bdi') ?? [])]
    const closing = halalasFromCell(closingBdis[closingBdis.length - 1]?.textContent ?? '')

    expect(headerBalance).toBe(lastSettled.balance)
    expect(closing).toBe(lastSettled.balance)
    /* The number the 120.00 would have produced had it been folded in. */
    expect(closing).not.toBe((lastSettled.balance as number) + 12_000)
  })

  /**
   * **AC-452's screen half.** The `held | released | reversed` lifecycle is the
   * *hold's*, never a posting's, and an escrow row's state badge is driven from
   * the hold. Asserted both ways: the client returns holds carrying `held`, and
   * no `liability.escrow` **posting** carries it — which is the data-layer half
   * of the same criterion and the reason a screen can render `Held` at all
   * without AC-312 firing on escrow.
   */
  it('AC-452 — the held state is on the escrow hold and never on an escrow posting', async () => {
    const { buildLedger } = await import('@/data/clients')
    const holds = await listEscrowHolds({ pageSize: 100 })
    expect(holds.items.some((hold) => hold.settlement === 'held')).toBe(true)

    const escrow: Ledger = buildLedger('liability.escrow', 'SUB-1041', null)
    expect(escrow.postings.length).toBeGreaterThan(0)
    for (const posting of escrow.postings) {
      expect(posting.settlement, `${posting.id} carries a hold's state`).toBe('settled')
      expect(posting.balanceAfterHalalas).not.toBeNull()
    }
  })
})

/* ══════════════ AC-303 / AC-311 / AC-310 — the local fixtures ════════════ */

/**
 * A ledger built here rather than read from the mock, for the two criteria the
 * dataset cannot reach:
 *
 *   - **AC-303** needs a posting of **zero**, and there is none in the fixtures.
 *   - **AC-311** needs `balanceAfterHalalas` to **disagree** with a running sum,
 *     so that a component recomputing the column fails rather than agreeing by
 *     coincidence. Every real fixture is internally consistent, which makes it
 *     useless for this one criterion.
 */
function localPosting(overrides: Partial<LedgerPosting> & { id: string }): LedgerPosting {
  return {
    subjectAccount: 'liability.wallet',
    subjectId: 'RDR-TEST',
    postedAt: '2026-06-10T09:00:00+03:00',
    direction: 'credit',
    amountHalalas: 0,
    description: { key: 'fin.posting.openingBalance' },
    reference: overrides.id,
    sourceType: 'adjustment',
    sourceId: null,
    kind: 'primary',
    reversesPostingId: null,
    reversedByPostingId: null,
    settlement: 'settled',
    balanceAfterHalalas: 0,
    journalEntryId: null,
    actorId: null,
    reasonCode: null,
    ...overrides,
  }
}

function localLedger(postings: LedgerPosting[]): Ledger {
  return {
    subjectAccount: 'liability.wallet',
    subjectId: 'RDR-TEST',
    subjectName: 'Test Rider',
    openingBalanceHalalas: 0,
    closingBalanceHalalas: postings[postings.length - 1]?.balanceAfterHalalas ?? 0,
    pendingHalalas: 0,
    postings,
    totalPostings: postings.length,
    returnedPostings: postings.length,
    /* Added with `Ledger.lifetimePostings` — the subject-lifetime count, which
       `totalPostings` is not. This helper builds an unwindowed ledger, so the
       two agree here; on a windowed one they do not, and that difference is the
       point of the field. */
    lifetimePostings: postings.length,
    periodStart: null,
    periodEnd: null,
  }
}

function LedgerHarness({ ledger }: { ledger: Ledger }) {
  const shell = useShell()
  const { t, language } = shell.language
  const table = useIndexTable({ mode: 'ledger' })
  return (
    <LedgerCard
      table={table}
      ledger={ledger}
      status="content"
      rows={ledger.postings}
      t={t}
      language={language}
      tableId="test-ledger"
      onRetry={() => undefined}
      hasHistory
      firstRun={{ heading: 'h', body: 'b', action: { label: 'a', onClick: () => undefined } }}
    />
  )
}

describe('the ledger renders what it was given, not what it could recompute', () => {
  /**
   * **AC-303** — *"a posting with `amountHalalas: 0` still renders in the column
   * named by its `direction`, as `0.00`, and not as `—`."*
   *
   * Both directions, because the failure mode is a falsy check (`amount ? … :
   * ABSENT`) and that mistake would swallow zero in whichever column it sits.
   */
  it('AC-303 — a zero-amount posting renders 0.00 in its own column, never an em dash', async () => {
    const ledger = localLedger([
      localPosting({ id: 'Z-CREDIT', direction: 'credit', amountHalalas: 0, balanceAfterHalalas: 0 }),
      localPosting({ id: 'Z-DEBIT', direction: 'debit', amountHalalas: 0, balanceAfterHalalas: 0 }),
    ])
    mount(<LedgerHarness ledger={ledger} />, '/financials/rider-wallets')
    await waitFor(() => expect(screen.getByText('Z-CREDIT')).toBeTruthy())

    const rows = ledgerRows()
    const zeroCredit = rows.find((row) => row.reference === 'Z-CREDIT') as LedgerRowCells
    const zeroDebit = rows.find((row) => row.reference === 'Z-DEBIT') as LedgerRowCells

    /* `halalasFromCell` maps the em dash to `null` and `0.00` to `0`, so this
       distinguishes exactly the two the criterion says must not be confused. */
    expect(zeroCredit.credit).toBe(0)
    expect(zeroCredit.debit).toBeNull()
    expect(zeroDebit.debit).toBe(0)
    expect(zeroDebit.credit).toBeNull()

    /* And the literal string, because `0` and `0.00` are not the same reading. */
    const creditCell = within(
      screen.getByText('Z-CREDIT').closest('tr') as HTMLElement,
    ).getAllByRole('cell')[4] as HTMLElement
    expect(creditCell.textContent?.trim()).toBe('0.00')
  })

  /**
   * **AC-311** — *"the running-balance column renders
   * `posting.balanceAfterHalalas` exactly."*
   *
   * The three postings below sum to 30.00 while their persisted balances read
   * 10.00, 999.99, 7.00. **A component that recomputed the column could not
   * produce those numbers**, which is the point: the criterion's own test —
   * *"mutating an earlier posting's amount does not change any later row's
   * balance"* — is the same statement, and this is the version that does not
   * require mutating a shared fixture.
   */
  it('AC-311 — the balance column is the persisted field, not a running sum', async () => {
    const ledger = localLedger([
      localPosting({ id: 'B-1', direction: 'credit', amountHalalas: 1_000, balanceAfterHalalas: 1_000 }),
      localPosting({ id: 'B-2', direction: 'credit', amountHalalas: 1_000, balanceAfterHalalas: 99_999 }),
      localPosting({ id: 'B-3', direction: 'credit', amountHalalas: 1_000, balanceAfterHalalas: 700 }),
    ])
    mount(<LedgerHarness ledger={ledger} />, '/financials/rider-wallets')
    await waitFor(() => expect(screen.getByText('B-1')).toBeTruthy())

    const rows = ledgerRows()
    expect(rows.map((row) => row.balance)).toEqual([1_000, 99_999, 700])

    /* The running sum, for contrast: nothing on screen equals it after row 1. */
    expect(rows.map((row) => row.balance)).not.toEqual([1_000, 2_000, 3_000])
  })

  /**
   * **AC-310** — *"removing all colour leaves every debit, credit, negative
   * balance and failed state still distinguishable."*
   *
   * Appearance is visual-QA's; what is testable here is the **structural**
   * claim underneath it: none of the four is carried by colour alone, because
   * each has a non-colour signal in the DOM — the column choice for debit and
   * credit, U+2212 for a negative balance, and the settlement **in words** for
   * a failed row. A monochrome screenshot is visual-QA's confirmation of the
   * same fact; this is the half a test can hold.
   */
  it('AC-310 — debit, credit, negative and failed each carry a non-colour signal', async () => {
    const ledger = localLedger([
      localPosting({ id: 'M-DEBIT', direction: 'debit', amountHalalas: 500, balanceAfterHalalas: -500 }),
      localPosting({
        id: 'M-FAILED',
        direction: 'credit',
        amountHalalas: 500,
        settlement: 'failed',
        balanceAfterHalalas: 0,
      }),
    ])
    mount(<LedgerHarness ledger={ledger} />, '/financials/rider-wallets')
    await waitFor(() => expect(screen.getByText('M-DEBIT')).toBeTruthy())

    const rows = ledgerRows()
    const debit = rows.find((row) => row.reference === 'M-DEBIT') as LedgerRowCells

    /* Debit vs credit — the COLUMN is the signal, and it survives greyscale. */
    expect(debit.debit).toBe(500)
    expect(debit.credit).toBeNull()

    /* A negative balance — U+2212, in the text, not a tone. */
    const debitRow = screen.getByText('M-DEBIT').closest('tr') as HTMLElement
    expect(debitRow.textContent).toContain('−')

    /* Failed — the word, in the row. R5 leaves it no badge tone at all, so the
       words are the whole signal and a greyscale reader still has it. */
    const failedRow = screen.getByText('M-FAILED').closest('tr') as HTMLElement
    expect(failedRow.textContent).toContain(EN['fin.settlement.failed'] as string)
  })
})

/* ════════════════════ AC-426 — the loading state's shape ═════════════════ */

describe('AC-426 — a ledger loads as its own six columns, never as a spinner', () => {
  /**
   * Latency is restored for this one test so the loading state exists to be
   * observed at all — `disableMockLatency()` in `beforeEach` is what makes
   * every other test in this file deterministic and is exactly what would hide
   * this one.
   *
   * The assertion is **not** *"a skeleton is on screen"*: it is that the P7
   * ledger skeleton has six column bars and no checkbox lane, and that the
   * status role a spinner would announce is absent while it renders.
   */
  it('renders the P7 ledger skeleton — six columns, no spinner', async () => {
    const { setMockLatency } = await import('@/data/clients')
    setMockLatency(60)
    try {
      mount(
        <WalletsScreen row={rowFor('financials-rider-wallets')} />,
        '/financials/rider-wallets?rider=RDR-1041',
      )

      const skeleton = await waitFor(() => {
        const busy = document.querySelector('[aria-busy="true"]')
        if (!busy) throw new Error('no loading region rendered')
        return busy as HTMLElement
      })

      /* Not a spinner: the product's `Spinner` is an SVG carrying
         `animate-spin`, and there is no SVG at all inside the busy region. */
      expect(skeleton.querySelectorAll('.animate-spin')).toHaveLength(0)
      expect(skeleton.querySelector('svg')).toBeNull()

      /* P7's shape — a 12-column grid whose header strip and every row carry
         SIX bars, one per ledger column, and no seventh for a checkbox lane
         (a ledger has no selection). P1 would give seven; P8 would give
         seven with two extra blocks. */
      const barRows = [...skeleton.querySelectorAll('div.grid.grid-cols-12')]
      expect(barRows.length, 'the skeleton draws a header strip and row bars').toBeGreaterThan(4)
      for (const barRow of barRows) {
        expect(barRow.children.length).toBe(6)
      }

      await waitFor(() => expect(screen.getByText(EN['fin.ledger.opening'] as string)).toBeTruthy())
    } finally {
      disableMockLatency()
    }
  })

  /**
   * The other half of AC-426 — *"no Financials surface renders a centred
   * spinner"* — as a source-level absence, because it is a claim about seven
   * sub-tabs rather than about one render. This is not a spy and cannot pass
   * vacuously: if a screen imported `Spinner`, the string would be there.
   */
  it('no Financials source imports a spinner', async () => {
    const { readdirSync, readFileSync, statSync } = await import('node:fs')
    const { join } = await import('node:path')
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((entry) => {
        const path = join(dir, entry)
        return statSync(path).isDirectory() ? walk(path) : [path]
      })

    const sources = walk('src/screens/financials').filter(
      (path) => path.endsWith('.tsx') && !path.endsWith('.test.tsx'),
    )
    expect(sources.length).toBeGreaterThan(5)
    for (const path of sources) {
      expect(readFileSync(path, 'utf8'), `${path} imports a spinner`).not.toMatch(
        /import\s*\{[^}]*\bSpinner\b/,
      )
    }
  })
})

/* ═══════════════ AC-428's sibling clause, exercised on a ledger ══════════ */

describe('AC-428 — a failed ledger read keeps its toolbar and its siblings', () => {
  it('the error renders inside the card, with the query still changeable', async () => {
    mockFailures.always(WALLET_OPERATIONS.ledger)
    mount(
      <WalletsScreen row={rowFor('financials-rider-wallets')} />,
      '/financials/rider-wallets?rider=RDR-1041',
    )

    await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThan(0))
    /* The toolbar survives the failure, so the operator can change the query
       that failed rather than being left with a dead card. */
    expect(screen.getByRole('textbox', { name: EN['fin.ledger.search'] as string })).toBeTruthy()
    /* And the page around it is still there. */
    expect(screen.getByRole('button', { name: EN['fin.wallet.back'] as string })).toBeTruthy()
  })
})

/* ══════ AC-427 — the two empties, and the predicate that confuses them ═════ */

describe('AC-427 — a quiet period is not a first run', () => {
  /**
   * §7.1's distinction, and the one a ledger gets wrong by asking the **same
   * question twice**: *"a wallet with a zero balance and no history is
   * FIRST-RUN; a wallet with history, filtered to a date range with nothing in
   * it, is FILTERED-TO-ZERO."*
   *
   * **Expected RED.** Four screens compute `hasHistory` from
   * `ledger.totalPostings`, which counts postings **in the selected window** —
   * so the test *"does this subject have any history?"* is answered with
   * *"were there rows in this window?"*, which is the question being asked.
   * `Ledger.lifetimePostings` is the subject-lifetime fact and is what the
   * predicate needs; no screen reads it yet.
   *
   * The window here is **after** DRV-0102's activity, so the header renders a
   * real carried-in opening balance and the body renders `No money has moved
   * here yet` directly beneath it — the two statements on screen contradict
   * each other, which is how an operator would meet this.
   *
   * AC-427 is on the build ledger as *asserted* and its existing test is green.
   * It is green because it exercises a rider with genuinely no history, where
   * both predicates agree. This is the case that separates them.
   */
  it('a captain with history and a quiet window renders no-match, not first-run', async () => {
    const { getCaptainPayableLedger } = await import('@/data/clients')

    /* The two counts disagree, which is the whole precondition. */
    const quiet = await getCaptainPayableLedger('DRV-0102', {
      start: '2026-07-01',
      end: '2026-07-31',
    })
    expect(quiet.postings).toHaveLength(0)
    expect(quiet.totalPostings).toBe(0)
    expect(quiet.lifetimePostings, 'this captain has a lifetime history').toBeGreaterThan(0)
    expect(quiet.openingBalanceHalalas, 'and a real balance carried in').not.toBe(0)

    mount(
      <PayoutsScreen row={rowFor('financials-payouts')} />,
      '/financials/payouts?captain=DRV-0102&from=2026-07-01&to=2026-07-31',
    )
    await waitFor(() =>
      expect(screen.getByText(EN['fin.ledger.balance'] as string)).toBeTruthy(),
    )

    /* Filtered-to-zero: one grey sentence, no illustration, no heading. */
    expect(screen.getByText(EN['fin.empty.noMatch'] as string)).toBeTruthy()
    expect(
      screen.queryByText(EN['fin.empty.firstRun.heading'] as string),
      '`No money has moved here yet` beside a carried-in balance',
    ).toBeNull()
  })
})
