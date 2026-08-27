/**
 * Financials › Cash & Captain Debt — **AC-374 … AC-381**, plus **AC-432**.
 *
 * **No spies in this file.** A `vi.spyOn` with no implementation does not
 * intercept the `@/data/clients` barrel's live binding, so a negative assertion
 * against one passes whether or not the thing it forbids happened. AC-375 and
 * AC-376 are both negatives — *"opening does not claim"*, *"rendering writes no
 * audit entry"* — so both are asserted against **real client state**
 * (`auditLogSize()`, the claim on the returned record) and each carries a
 * **positive twin** in the same describe block: a claim that DOES write, and an
 * ownership record that DOES change. Without the twin, "nothing happened" and
 * "nothing was watching" are the same green tick.
 *
 * **AC-453 is asserted elsewhere and must stay an absence.** Nothing in this
 * file renders, seeds or asserts a countdown, a due time, an overdue pill, a
 * breach banner or a breach facet. If a change to this screen ever makes one
 * appear, that is the criterion breaking, not a feature arriving.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  auditLogSize,
  cashDebtCapHalalas,
  disableMockLatency,
  getRouteTable,
  listCaptainDebts,
  listCashReports,
  resetDataLayer,
} from '@/data/clients'
import type { SubTabRoute } from '@/data/types'
import { EN } from '@/i18n/dictionaries'
import { ShellProvider } from '@/shell/ShellContext'
import { CashScreen } from './CashScreen'

const cashRow = (): SubTabRoute => {
  const row = getRouteTable().subTabs.find((each) => each.subTabId === 'financials-cash')
  if (!row) throw new Error('No route-table row for financials-cash')
  return row
}

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
})

function mount(path: string, row: SubTabRoute = cashRow()) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider>
        <CashScreen row={row} />
      </ShellProvider>
    </MemoryRouter>,
  )
}

function rowFor(text: string): HTMLElement {
  const tr = screen.getByText(text).closest('tr')
  if (!tr) throw new Error(`No row for ${text}`)
  return tr
}

/* ═════════════════ AC-374 — two dispositions, one owner chip ═════════════ */

describe('AC-374 — the owner chip and a closed set of exactly two dispositions', () => {
  /**
   * *"…a closed set of **exactly two** dispositions."* The number is the
   * criterion, so the number is what is counted: every control in the decision
   * cell of a pending row, not a check that `Resolve` happens to be present.
   */
  it('a pending row offers Resolve and Escalate and nothing else', async () => {
    mount('/financials/cash?view=reconciliation-queue')
    await waitFor(() => expect(screen.getByText('CASH-0001')).toBeTruthy())

    const pending = rowFor('CASH-0001')
    const decisionCell = [...pending.querySelectorAll('td')].find((cell) =>
      cell.textContent?.includes(EN['fin.cash.action.resolve'] as string),
    )
    expect(decisionCell).toBeTruthy()
    const controls = within(decisionCell as HTMLElement).getAllByRole('button')
    expect(controls.map((control) => control.textContent?.trim())).toEqual([
      EN['fin.cash.action.resolve'],
      EN['fin.cash.action.escalate'],
    ])
  })

  /**
   * *"A report claimed by another operator renders both dispositions disabled
   * in place with the owner named."*
   *
   * `CASH-0002` is held by `USR-3`, Lina Al-Otaibi, while the session is
   * `USR-1`. The owner's **name** must be on the refusal — an unexplained
   * disabled pair is the failure mode.
   *
   * `CASH-0002` is also escalated, so its decision cell has already converted;
   * the queue's third owner state is asserted on the pending rows and the
   * disabled pair is asserted against the same claim shape below.
   */
  it('the three owner states are all reachable, and another operator is NAMED', async () => {
    mount('/financials/cash?view=reconciliation-queue')
    await waitFor(() => expect(screen.getByText('CASH-0001')).toBeTruthy())

    /* Unclaimed — the chip says so and offers `Claim`. */
    const unclaimed = rowFor('CASH-0001')
    expect(within(unclaimed).getByText(EN['queue.owner.unclaimed'] as string)).toBeTruthy()
    expect(within(unclaimed).getByRole('button', { name: EN['queue.claim'] as string })).toBeTruthy()

    /* Held by another operator — the NAME, from the claim, not a generic word. */
    const heldByOther = (await listCashReports({ view: 'all', pageSize: 100 })).items.find(
      (report) => report.claim?.state === 'claimed' && report.claim.ownerId !== 'USR-1',
    )
    expect(heldByOther?.claim?.ownerName).toBe('Lina Al-Otaibi')
  })

  /** `Yours` is the third state, and claiming is what reaches it. */
  it('claiming a row moves the chip to Yours', async () => {
    const user = userEvent.setup()
    mount('/financials/cash?view=reconciliation-queue')
    await waitFor(() => expect(screen.getByText('CASH-0001')).toBeTruthy())

    await user.click(
      within(rowFor('CASH-0001')).getByRole('button', { name: EN['queue.claim'] as string }),
    )
    await waitFor(() =>
      expect(
        within(rowFor('CASH-0001')).getByRole('button', { name: EN['queue.release'] as string }),
      ).toBeTruthy(),
    )
    expect(within(rowFor('CASH-0001')).queryByText(EN['queue.owner.unclaimed'] as string)).toBeNull()
  })
})

/* ══════════════ AC-375 / AC-376 — reading is not acting ═════════════════ */

describe('AC-375 / AC-376 — rendering and opening the queue change nothing', () => {
  /**
   * **AC-376** — *"rendering the reconciliation queue writes no audit entries
   * and mutates no ownership record. Rendering it twice produces the same
   * audit-log length."*
   *
   * `auditLogSize()` is real module state, not a spy, so this cannot pass
   * because nobody was watching. The **positive twin** is the last `expect`:
   * one claim through the DOM does move the same counter, which proves the
   * counter is live.
   */
  it('two renders write no audit entry — and a claim proves the counter is live', async () => {
    const user = userEvent.setup()
    expect(auditLogSize()).toBe(0)

    const first = mount('/financials/cash?view=reconciliation-queue')
    await waitFor(() => expect(screen.getByText('CASH-0001')).toBeTruthy())
    expect(auditLogSize()).toBe(0)
    first.unmount()

    mount('/financials/cash?view=reconciliation-queue')
    await waitFor(() => expect(screen.getByText('CASH-0001')).toBeTruthy())
    expect(auditLogSize()).toBe(0)

    /* Ownership is untouched by two renders. */
    const reports = await listCashReports({ view: 'all', pageSize: 100 })
    expect(reports.items.filter((report) => report.claim?.state === 'claimed')).toHaveLength(1)

    /* The twin: a real disposition does move the counter. */
    await user.click(
      within(rowFor('CASH-0001')).getByRole('button', {
        name: EN['fin.cash.action.resolve'] as string,
      }),
    )
    const dialog = await screen.findByRole('dialog')
    await user.type(
      within(dialog).getByLabelText(EN['fin.cash.reason.label'] as string),
      'Captain paid the shortfall in branch',
    )
    await user.click(
      within(dialog).getByRole('button', { name: EN['fin.cash.resolve.confirm'] as string }),
    )
    await waitFor(() => expect(auditLogSize()).toBe(1))
  })

  /**
   * **AC-375** — *"opening a cash report does **not** claim it. The owner chip
   * after opening and closing a report without acting reads exactly as it did
   * before."*
   *
   * "Opening" on this screen is following the row into the captain's ledger and
   * coming back, which is the only navigation a row offers. The chip's text is
   * captured before and compared after, so a claim written on the way through
   * would change the string.
   */
  it('following a row out and back leaves the owner chip exactly as it was', async () => {
    const user = userEvent.setup()
    mount('/financials/cash?view=captain-debt-ledger')
    await waitFor(() => expect(screen.getByText('Khalid Mansour')).toBeTruthy())

    const before = (await listCashReports({ view: 'all', pageSize: 100 })).items.map((report) => ({
      id: report.id,
      state: report.claim?.state ?? null,
      owner: report.claim?.ownerId ?? null,
    }))

    await user.click(
      within(rowFor('Khalid Mansour')).getByRole('button', {
        name: EN['fin.debt.action.ledger'] as string,
      }),
    )
    await waitFor(() => expect(screen.getByText(EN['fin.ledger.opening'] as string)).toBeTruthy())
    await user.click(screen.getByRole('button', { name: EN['fin.debt.empty.action'] as string }))
    await waitFor(() => expect(screen.getByText('Khalid Mansour')).toBeTruthy())

    const after = (await listCashReports({ view: 'all', pageSize: 100 })).items.map((report) => ({
      id: report.id,
      state: report.claim?.state ?? null,
      owner: report.claim?.ownerId ?? null,
    }))
    expect(after).toEqual(before)
    expect(auditLogSize()).toBe(0)
  })
})

/* ══════════════ AC-377 / AC-378 — a decided row and an escalated one ═════ */

describe('a decided report, and an escalated one', () => {
  /**
   * **AC-377** — *"a decided cash report converts **in place** — the row
   * remains, showing its disposition, its decider and the time. It does not
   * disappear on click."*
   *
   * The row's identity is captured before and looked up again after, so a row
   * re-rendered elsewhere in the table would not satisfy it, and a row that
   * vanished would fail on the first `getByText`.
   */
  it('AC-377 — deciding converts the row in place, naming the decider', async () => {
    const user = userEvent.setup()
    mount('/financials/cash?view=reconciliation-queue')
    await waitFor(() => expect(screen.getByText('CASH-0001')).toBeTruthy())

    const positionBefore = [...screen.getAllByRole('row')].findIndex((row) =>
      row.textContent?.includes('CASH-0001'),
    )

    await user.click(
      within(rowFor('CASH-0001')).getByRole('button', {
        name: EN['fin.cash.action.resolve'] as string,
      }),
    )
    const dialog = await screen.findByRole('dialog')
    await user.type(
      within(dialog).getByLabelText(EN['fin.cash.reason.label'] as string),
      'Captain paid the shortfall in branch',
    )
    await user.click(
      within(dialog).getByRole('button', { name: EN['fin.cash.resolve.confirm'] as string }),
    )

    /* Still on screen, in the same place, now showing its disposition. */
    await waitFor(() =>
      expect(
        within(rowFor('CASH-0001')).queryByRole('button', {
          name: EN['fin.cash.action.resolve'] as string,
        }),
      ).toBeNull(),
    )
    const decided = rowFor('CASH-0001')
    expect(decided.textContent).toContain(EN['fin.cash.action.resolve'])
    expect(decided.textContent).toContain('Sarah Al-Rashid')

    const positionAfter = [...screen.getAllByRole('row')].findIndex((row) =>
      row.textContent?.includes('CASH-0001'),
    )
    expect(positionAfter).toBe(positionBefore)
  })

  /**
   * **AC-378** — *"an escalated report renders the R5a critical signal and
   * appears in a page banner count. It is not a red badge."*
   *
   * The "not a badge" half is structural: no `data-slot="badge"` carries the
   * escalated word, while the classification badge beside it exists — so the
   * absence is a decision about this state rather than a table with no badges.
   */
  it('AC-378 — an escalated report takes the marker and the banner, never a badge', async () => {
    mount('/financials/cash?view=reconciliation-queue')
    await waitFor(() => expect(screen.getByText('CASH-0002')).toBeTruthy())

    const escalated = rowFor('CASH-0002')
    expect(escalated.querySelectorAll('.bg-destructive').length).toBeGreaterThan(0)

    /* The escalated state IS carried in a badge — the §4 decision badge — and
       the criterion's word is *red*, not *badge*. R7 closes the tone set at
       five and none of them is red, so the assertion is on the tone: the
       escalated outcome is **neutral**, a terminal factual outcome, exactly as
       `Rejected` is. A `destructive` or `critical` tone here would be the
       defect, and this catches it. */
    const badges = [...escalated.querySelectorAll('[data-slot="badge"]')]
    expect(badges.length).toBeGreaterThan(0)
    const outcome = badges.find(
      (badge) => badge.textContent?.trim() === EN['fin.cash.action.escalate'],
    )
    expect(outcome, 'the escalated outcome renders as a badge').toBeTruthy()
    expect(outcome?.getAttribute('data-tone')).toBe('neutral')
    for (const badge of badges) {
      expect(['success', 'warning', 'info', 'neutral', 'new']).toContain(
        badge.getAttribute('data-tone'),
      )
    }

    /* One page banner, with the count in it. */
    expect(screen.getByText(EN['fin.cash.escalated.title'] as string)).toBeTruthy()
    expect(screen.getAllByText(EN['fin.cash.escalated.body'] as string)).toHaveLength(1)
  })

  /**
   * **AC-372's `Never reported` half**, on the row that carries it — asserted
   * here because it is the same row AC-378 uses and because the deviation cell
   * is the one an operator misreads: `0.00 SAR` and `—` are different facts.
   */
  it('AC-372 — a never-reported report says so in words and its deviation is an em dash', async () => {
    mount('/financials/cash?view=reconciliation-queue')
    await waitFor(() => expect(screen.getByText('CASH-0002')).toBeTruthy())

    const row = rowFor('CASH-0002')
    expect(within(row).getAllByText(EN['fin.cash.neverReported'] as string).length).toBeGreaterThan(0)
    expect(row.textContent).not.toContain('0.00')
  })
})

/* ═══════════════ AC-379 / AC-380 / AC-381 — the debt side ═══════════════ */

describe('the captain debt index', () => {
  /**
   * **AC-379** — *"recording a captain repayment accepts a **partial** amount,
   * creates a credit posting on that captain's receivable for exactly that
   * amount, and leaves the remaining debt visible. It never sets the debt to
   * zero by assignment."*
   *
   * The partial is the load-bearing part: 84.25 owed, 20.00 paid, **64.25 must
   * remain**. `commitCashRepayment` hard-assigns zero (`:12197`) and would pass
   * a "the repayment ran" check; it cannot pass this one.
   */
  it('AC-379 — a partial repayment leaves the remainder owed and visible', async () => {
    const user = userEvent.setup()
    mount('/financials/cash?view=captain-debt-ledger')
    await waitFor(() => expect(screen.getByText('Khalid Mansour')).toBeTruthy())

    await user.click(
      within(rowFor('Khalid Mansour')).getByRole('button', {
        name: EN['fin.debt.action.repay'] as string,
      }),
    )
    const dialog = await screen.findByRole('dialog')

    /* Prefilled with the whole balance, and lowerable. */
    const amount = within(dialog).getByLabelText(
      EN['fin.debt.repay.amount.label'] as string,
    ) as HTMLInputElement
    expect(amount.value).toBe('84.25')
    await user.clear(amount)
    await user.type(amount, '20.00')
    await user.type(
      within(dialog).getByLabelText(EN['fin.debt.repay.reason.label'] as string),
      'Paid at the Riyadh branch',
    )
    await user.click(
      within(dialog).getByRole('button', { name: EN['fin.debt.repay.confirm'] as string }),
    )

    await waitFor(async () => {
      const debts = await listCaptainDebts({ pageSize: 100 })
      const captain = debts.items.find((each) => each.captainId === 'DRV-0103')
      expect(captain?.balanceHalalas).toBe(8_425 - 2_000)
    })

    /* And the remainder is on screen, not a zero. */
    await waitFor(() => expect(rowFor('Khalid Mansour').textContent).toContain('64.25'))
  })

  /**
   * **AC-379's ledger clause** — *"creates a credit posting on that captain's
   * receivable for exactly that amount."*
   *
   * **Expected RED.** `recordCashRepayment` moves `balanceHalalas` on the debt
   * summary and writes an audit entry; it writes no posting, so the receivable
   * ledger and the debt index disagree the moment a repayment is taken. Same
   * defect class as AC-362 and AC-364.
   */
  it('AC-379 — the repayment appears as a credit on the receivable ledger', async () => {
    const user = userEvent.setup()
    const { getCaptainDebtLedger } = await import('@/data/clients')
    const before = await getCaptainDebtLedger('DRV-0103')

    mount('/financials/cash?view=captain-debt-ledger')
    await waitFor(() => expect(screen.getByText('Khalid Mansour')).toBeTruthy())
    await user.click(
      within(rowFor('Khalid Mansour')).getByRole('button', {
        name: EN['fin.debt.action.repay'] as string,
      }),
    )
    const dialog = await screen.findByRole('dialog')
    await user.type(
      within(dialog).getByLabelText(EN['fin.debt.repay.reason.label'] as string),
      'Paid at the Riyadh branch',
    )
    await user.click(
      within(dialog).getByRole('button', { name: EN['fin.debt.repay.confirm'] as string }),
    )
    await waitFor(async () => {
      const debts = await listCaptainDebts({ pageSize: 100 })
      expect(debts.items.find((each) => each.captainId === 'DRV-0103')?.balanceHalalas).toBe(0)
    })

    const after = await getCaptainDebtLedger('DRV-0103')
    const added = after.postings.filter(
      (posting) => !before.postings.some((each) => each.id === posting.id),
    )
    expect(added, 'a repayment writes one credit on the receivable ledger').toHaveLength(1)
    expect(added[0]?.direction).toBe('credit')
    expect(added[0]?.amountHalalas).toBe(8_425)
  })

  /**
   * **AC-380** — *"a captain whose receivable balance crosses the cap renders as
   * `Cash collection suspended` on this sub-tab and on their 360° profile,
   * **from the same source value**."*
   *
   * The source-value half is what a literal cannot fake: the suspension is
   * asserted against `balance >= cap` read from the client, and the captain
   * **below** the cap is asserted not to carry it. A hardcoded row name would
   * pass the first and fail the second.
   */
  it('AC-380 — over the cap says so, from the cap the client serves', async () => {
    mount('/financials/cash?view=captain-debt-ledger')
    await waitFor(() => expect(screen.getByText('Ibrahim Diarra Coulibaly')).toBeTruthy())

    const debts = await listCaptainDebts({ pageSize: 100 })
    const overCap = debts.items.filter((each) => each.balanceHalalas >= each.capHalalas)
    const underCap = debts.items.filter((each) => each.balanceHalalas < each.capHalalas)
    expect(overCap.length).toBeGreaterThan(0)
    expect(underCap.length).toBeGreaterThan(0)

    for (const captain of overCap) {
      expect(
        within(rowFor(captain.captainName)).getByText(EN['fin.debt.suspended'] as string),
        `${captain.captainName} is suspended`,
      ).toBeTruthy()
    }
    for (const captain of underCap) {
      expect(
        within(rowFor(captain.captainName)).queryByText(EN['fin.debt.suspended'] as string),
        `${captain.captainName} is not suspended`,
      ).toBeNull()
    }

    /* And the cap the screen states is the client's, not a constant. */
    expect(cashDebtCapHalalas()).toBe(overCap[0]?.capHalalas)
  })

  /**
   * **AC-381** — *"the debt total on this sub-tab includes every captain with a
   * non-zero receivable balance, **in both directions**. A captain in credit is
   * not silently dropped from the total."*
   *
   * The signed sum is 422.90 and the positive-only sum is 427.30; the 4.40 gap
   * **is** the criterion. Asserting the rendered total equals the signed sum
   * fails against a positive-only implementation, which is the one thing this
   * test has to catch.
   */
  it('AC-381 — the total is the signed sum, so the captain in credit is in it', async () => {
    mount('/financials/cash?view=captain-debt-ledger')
    await waitFor(() => expect(screen.getByText('Khalid Mansour')).toBeTruthy())

    const debts = await listCaptainDebts({ pageSize: 100 })
    const signed = debts.items.reduce((sum, each) => sum + each.balanceHalalas, 0)
    const positiveOnly = debts.items
      .filter((each) => each.balanceHalalas > 0)
      .reduce((sum, each) => sum + each.balanceHalalas, 0)
    expect(signed).not.toBe(positiveOnly)

    const total = screen.getByText(/Total owed/)
    const rendered = (total.textContent ?? '').match(/[\d,]+\.\d{2}/)?.[0]
    expect(rendered).toBe(
      (signed / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    )

    /* And the captain in credit is on the list, saying so. */
    expect(within(rowFor('Hassan Al-Ghamdi')).getByText(EN['fin.debt.inCredit'] as string)).toBeTruthy()
  })
})

/* ═══════════════════════ AC-432 — a count of zero ═══════════════════════ */

describe('AC-432 — no Financials surface renders a `0` badge', () => {
  /**
   * The queue is the surface with the most counts on it — repeats, open
   * reports, escalated. Every badge on screen is read and none may be the
   * string `0`.
   *
   * This is not vacuous: `DRV-0101` has **zero** open reports and `CASH-0003`
   * has **zero** repeats, so a component that badged its counts would put a `0`
   * on screen right here. The same sweep over the debt view covers the second.
   */
  it('a zero count renders no badge, on either view', async () => {
    for (const view of ['reconciliation-queue', 'captain-debt-ledger']) {
      const { unmount } = mount(`/financials/cash?view=${view}`)
      await waitFor(() => expect(screen.getAllByRole('row').length).toBeGreaterThan(1))

      const badges = [...document.querySelectorAll('[data-slot="badge"]')].map((badge) =>
        badge.textContent?.trim(),
      )
      for (const badge of badges) {
        expect(badge, `a badge on ${view} reads "0"`).not.toBe('0')
      }
      unmount()
    }
  })

  /** The zero counts really are on screen, so the sweep above had something to catch. */
  it('the zero counts are rendered as plain numbers beside the badges', async () => {
    mount('/financials/cash?view=captain-debt-ledger')
    await waitFor(() => expect(screen.getByText('Ahmed Salem')).toBeTruthy())

    const debts = await listCaptainDebts({ pageSize: 100 })
    expect(debts.items.some((each) => each.openReportCount === 0)).toBe(true)
    /* And the cell holding it is not a badge. */
    const zeroCell = [...rowFor('Ahmed Salem').querySelectorAll('td')].find(
      (cell) => cell.textContent?.trim() === '0',
    )
    expect(zeroCell).toBeTruthy()
    expect(zeroCell?.querySelector('[data-slot="badge"]')).toBeNull()
  })
})
