/**
 * Financials › Payouts & Escrow — **AC-362 … AC-371**, plus **AC-430** and
 * **AC-431** exercised on the surface that moves the most money.
 *
 * **No spies.** A `vi.spyOn` without an implementation does not intercept the
 * `@/data/clients` barrel's live binding, so *"the client was never called"*
 * and *"I was never watching"* look identical. Every state below is reached by
 * driving the DOM and by reading what the client actually returned, and every
 * failure is injected through `mockFailures`.
 *
 * **Four tests in this file are expected to be RED, and they are the finding.**
 * AC-362, AC-364, AC-371 and AC-363's second clause each require a *posting on
 * a subject ledger*. `payCaptain`, `releaseEscrow` and `applyDeduction` move
 * the payout **summary** and write an audit entry, and write no posting at all
 * — so after a payout the index says the captain is paid while their payable
 * ledger still shows the old balance. That is the cross-surface disagreement
 * §1 of the spec exists to end, arriving from the other direction. The tests
 * are written the way the criteria are written and left failing rather than
 * softened into a summary check that would tick the line without checking it.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  auditLogSize,
  disableMockLatency,
  getCaptainDebtLedger,
  getCaptainPayableLedger,
  listAuditEntries,
  listCaptainPayouts,
  listEscrowHolds,
  getRouteTable,
  mockFailures,
  PAYOUT_OPERATIONS,
  resetDataLayer,
} from '@/data/clients'
import type { SubTabRoute } from '@/data/types'
import { EN } from '@/i18n/dictionaries'
import { ShellProvider } from '@/shell/ShellContext'
import { PayoutsScreen } from './PayoutsScreen'

const table = getRouteTable()
const payoutsRow = (): SubTabRoute => {
  const row = table.subTabs.find((each) => each.subTabId === 'financials-payouts')
  if (!row) throw new Error('No route-table row for financials-payouts')
  return row
}

/**
 * The same row with a **read-level** permission.
 *
 * Every Financials route row carries `permission: null` today (Q-F2 / D4), so
 * no role can be refused and AC-434–436 and AC-440 cannot pass. This local row
 * exercises the gate `useWriteGate` runs on every render, so the mechanism is
 * verified now and the criteria stay honestly failing until the seven
 * permission values land.
 */
const readOnlyRow = (): SubTabRoute => ({
  ...payoutsRow(),
  permission: { key: 'view_finance', level: 'read' },
})

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
})

function mount(row: SubTabRoute, path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider>
        <PayoutsScreen row={row} />
      </ShellProvider>
    </MemoryRouter>,
  )
}

/** The `<tr>` whose identity cell holds this text. */
function rowFor(text: string): HTMLElement {
  const cell = screen.getByText(text)
  const tr = cell.closest('tr')
  if (!tr) throw new Error(`No row for ${text}`)
  return tr
}

/**
 * Open a row's action, whatever shape `DataTable` gave it.
 *
 * Two declared actions collapse to the `⋯` kebab (§7.8's count rule), one
 * renders as a labelled control. This resolves either without asserting which
 * — the shape is D8's decision, and **AC-450 asserts the keyboard path
 * separately** so a menu is not silently accepted as reachable here.
 */
async function invokeRowAction(user: ReturnType<typeof userEvent.setup>, row: HTMLElement, label: string) {
  const direct = within(row).queryByRole('button', { name: label })
  if (direct) {
    await user.click(direct)
    return
  }
  const kebab = within(row).getByRole('button', { name: /actions/i })
  await user.click(kebab)
  await user.click(await screen.findByRole('menuitem', { name: label }))
}

/** The one control a row's action is disabled through, in either shape. */
async function rowActionControl(
  user: ReturnType<typeof userEvent.setup>,
  row: HTMLElement,
  label: string,
): Promise<HTMLElement> {
  const direct = within(row).queryByRole('button', { name: label })
  if (direct) return direct
  await user.click(within(row).getByRole('button', { name: /actions/i }))
  return await screen.findByRole('menuitem', { name: label })
}

/* ═════════════════════════ AC-362 / AC-363 — a payout ════════════════════ */

describe('AC-362 — paying a captain writes a debit posting on their payable ledger', () => {
  /**
   * *"Paying a captain creates a debit posting on that captain's payable ledger
   * for the amount paid. The captain's payable balance after equals the balance
   * before minus the amount."*
   *
   * **Expected RED.** `payCaptain` writes no posting. The assertion is on the
   * ledger the criterion names, not on the index summary beside it, because the
   * two disagreeing is the defect.
   */
  it('the payable ledger carries a new debit for the amount paid', async () => {
    const user = userEvent.setup()
    const before = await getCaptainPayableLedger('DRV-0101')

    mount(payoutsRow(), '/financials/payouts?view=payouts')
    await waitFor(() => expect(screen.getByText('Ahmed Salem')).toBeTruthy())

    await invokeRowAction(user, rowFor('Ahmed Salem'), EN['fin.payout.action.pay'] as string)
    await user.click(
      await screen.findByRole('button', { name: EN['fin.payout.confirm.confirm'] as string }),
    )
    await waitFor(async () => {
      const payouts = await listCaptainPayouts({ pageSize: 100 })
      expect(payouts.items.find((p) => p.captainId === 'DRV-0101')?.state).toBe('paid')
    })

    const after = await getCaptainPayableLedger('DRV-0101')
    const added = after.postings.filter(
      (posting) => !before.postings.some((each) => each.id === posting.id),
    )
    expect(added, 'a payout writes exactly one posting on the payable ledger').toHaveLength(1)
    expect(added[0]?.direction).toBe('debit')
    expect(after.closingBalanceHalalas).toBe(
      before.closingBalanceHalalas - (added[0]?.amountHalalas ?? 0),
    )
  })

  /**
   * **AC-363's first clause** — *"a payout never sets a balance by
   * assignment."*
   *
   * This one is testable today and is the assertion a literal cannot fake:
   * DRV-0101's payable is 652.60 against a cash debt of 23.15, so the net paid
   * is 629.45 and **23.15 must remain payable**. An implementation that
   * assigned zero — which is exactly what `payDriver` does at `:7030` — would
   * pass a "the payout ran" check and fail this.
   */
  it('AC-363 — the payable moves by the amount paid and is never assigned to zero', async () => {
    const user = userEvent.setup()
    const before = (await listCaptainPayouts({ pageSize: 100 })).items.find(
      (each) => each.captainId === 'DRV-0101',
    )
    expect(before).toBeDefined()
    const net = (before?.payableHalalas ?? 0) - (before?.cashDebtHalalas ?? 0)

    mount(payoutsRow(), '/financials/payouts?view=payouts')
    await waitFor(() => expect(screen.getByText('Ahmed Salem')).toBeTruthy())
    await invokeRowAction(user, rowFor('Ahmed Salem'), EN['fin.payout.action.pay'] as string)
    await user.click(
      await screen.findByRole('button', { name: EN['fin.payout.confirm.confirm'] as string }),
    )

    await waitFor(async () => {
      const after = (await listCaptainPayouts({ pageSize: 100 })).items.find(
        (each) => each.captainId === 'DRV-0101',
      )
      expect(after?.state).toBe('paid')
      expect(after?.payableHalalas).toBe((before?.payableHalalas ?? 0) - net)
      /* The residual is the cash debt, and it is still owed. Zero would be the
         defect. */
      expect(after?.payableHalalas).toBe(before?.cashDebtHalalas)
      expect(after?.paidOutHalalas).toBe((before?.paidOutHalalas ?? 0) + net)
    })
  })

  /**
   * **AC-366's commit half**, and the audit entry **AC-437** requires for this
   * act: one entry, the **net** amount, the captain named as subject.
   *
   * The amount is the load-bearing part — `payDriver` reads only `p.pending`
   * (`:7026`) while the page copy has promised for two versions that cash debt
   * comes out of the next payout, so an entry carrying the *payable* rather
   * than the *net* is the legacy over-payment wearing an audit trail.
   */
  it('AC-366 / AC-437 — one audit entry, for the NET, naming the captain', async () => {
    const user = userEvent.setup()
    expect(auditLogSize()).toBe(0)

    mount(payoutsRow(), '/financials/payouts?view=payouts')
    await waitFor(() => expect(screen.getByText('Ahmed Salem')).toBeTruthy())
    await invokeRowAction(user, rowFor('Ahmed Salem'), EN['fin.payout.action.pay'] as string)

    /* The three labelled lines, before it commits. */
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(EN['fin.payout.col.payable'] as string)).toBeTruthy()
    expect(within(dialog).getByText(EN['fin.payout.col.debt'] as string)).toBeTruthy()
    expect(within(dialog).getByText(EN['fin.payout.col.net'] as string)).toBeTruthy()

    await user.click(
      within(dialog).getByRole('button', { name: EN['fin.payout.confirm.confirm'] as string }),
    )
    await waitFor(() => expect(auditLogSize()).toBe(1))

    const entries = await listAuditEntries({ pageSize: 10 })
    const entry = entries.items[0]
    expect(entry?.subjectId).toBe('DRV-0101')
    expect(entry?.amountHalalas).toBe(65_260 - 2_315)
    expect(entry?.actorName).toBeTruthy()
    expect(entry?.reasonCode).not.toBeNull()
  })
})

/* ════════════════════════════ AC-364 — escrow ═══════════════════════════ */

describe('AC-364 — releasing escrow', () => {
  /**
   * The half the criterion shares with `12b`'s worst legacy behaviour:
   * `releaseEscrow` splices the hold out of the array (`:7064`), so the
   * operator cannot see what was released or by whom. **The row stays.**
   */
  it('the hold transitions to Released and stays on the list', async () => {
    const user = userEvent.setup()
    const before = await listEscrowHolds({ pageSize: 100 })

    mount(payoutsRow(), '/financials/payouts?view=escrow')
    await waitFor(() => expect(screen.getByText('ESC-1052')).toBeTruthy())

    await invokeRowAction(user, rowFor('ESC-1052'), EN['fin.escrow.action.release'] as string)
    await user.click(
      await screen.findByRole('button', { name: EN['fin.escrow.confirm.confirm'] as string }),
    )

    await waitFor(() =>
      expect(
        within(rowFor('ESC-1052')).getByText(EN['fin.settlement.released'] as string),
      ).toBeTruthy(),
    )

    /* Nothing left the list — the count is unchanged and the row is still there. */
    const after = await listEscrowHolds({ pageSize: 100 })
    expect(after.items).toHaveLength(before.items.length)
    expect(after.items.find((hold) => hold.id === 'ESC-1052')?.settlement).toBe('released')
    expect(after.items.find((hold) => hold.id === 'ESC-1052')?.releasedAt).not.toBeNull()
  })

  /**
   * *"…and creates a credit posting on the captain's payable ledger."*
   *
   * **Expected RED.** `releaseEscrow` raises `payableHalalas` on the payout
   * summary and writes no posting, so the money appears on the index and never
   * on the ledger that is supposed to be its record.
   */
  it('a credit posting appears on the captain’s payable ledger', async () => {
    const user = userEvent.setup()
    const before = await getCaptainPayableLedger('DRV-0103')

    mount(payoutsRow(), '/financials/payouts?view=escrow')
    await waitFor(() => expect(screen.getByText('ESC-1052')).toBeTruthy())
    await invokeRowAction(user, rowFor('ESC-1052'), EN['fin.escrow.action.release'] as string)
    await user.click(
      await screen.findByRole('button', { name: EN['fin.escrow.confirm.confirm'] as string }),
    )
    await waitFor(async () => {
      const holds = await listEscrowHolds({ pageSize: 100 })
      expect(holds.items.find((hold) => hold.id === 'ESC-1052')?.settlement).toBe('released')
    })

    const after = await getCaptainPayableLedger('DRV-0103')
    const added = after.postings.filter(
      (posting) => !before.postings.some((each) => each.id === posting.id),
    )
    expect(added, 'the release writes one credit on the payable ledger').toHaveLength(1)
    expect(added[0]?.direction).toBe('credit')
    expect(added[0]?.amountHalalas).toBe(32_960)
  })

  /**
   * **AC-365** — *"an escrow hold with `tripsCompleted < tripsRequired` renders
   * its `Release` action disabled in place, with the reason visible, and the
   * progress stated as `4/5 trips delivered`."*
   *
   * Three clauses, three assertions. The control is **present** and disabled —
   * hidden would fail — the progress is in words on the row, and the row that
   * *is* releasable has the same control enabled, which is what makes the
   * disabled state a reading rather than a screen-wide default.
   */
  it('AC-365 — an unfinished hold disables Release in place and states the progress', async () => {
    const user = userEvent.setup()
    mount(payoutsRow(), '/financials/payouts?view=escrow')
    await waitFor(() => expect(screen.getByText('ESC-1041')).toBeTruthy())

    /* 4 of 5 — the progress, in words, on the row. */
    expect(within(rowFor('ESC-1041')).getByText('4/5 trips delivered')).toBeTruthy()

    const blocked = await rowActionControl(
      user,
      rowFor('ESC-1041'),
      EN['fin.escrow.action.release'] as string,
    )
    expect(blocked).toBeTruthy()
    expect(
      blocked.getAttribute('disabled') !== null || blocked.getAttribute('aria-disabled') === 'true',
    ).toBe(true)

    /* And the 10-of-10 hold's is live, so the disabling is the row's reading. */
    const live = await rowActionControl(
      user,
      rowFor('ESC-1052'),
      EN['fin.escrow.action.release'] as string,
    )
    expect(
      live.getAttribute('disabled') !== null || live.getAttribute('aria-disabled') === 'true',
    ).toBe(false)
  })
})

/* ══════════════════════════ AC-367 / AC-368 ═════════════════════════════ */

describe('a returned payout, and one the role may not perform', () => {
  /**
   * **AC-367** — the row marker, the word `failed` in the row, and ONE page
   * banner with a count. *"It is not a red badge."*
   *
   * The absence is asserted structurally: the state cell holds no
   * `data-slot="badge"` at all on a failed row, while a `due` row does. A test
   * that only looked for the words would pass with a red badge beside them.
   */
  it('AC-367 — a returned payout takes the marker, the words and a banner, never a badge', async () => {
    mount(payoutsRow(), '/financials/payouts?view=payouts')
    await waitFor(() => expect(screen.getByText('Youssef Nouri')).toBeTruthy())

    const failed = rowFor('Youssef Nouri')

    /* The words, in the row. */
    expect(within(failed).getByText(EN['fin.payout.state.failed'] as string)).toBeTruthy()
    expect(within(failed).getByText(EN['fin.payout.failure.noBankAccount'] as string)).toBeTruthy()

    /* R5a use #3 — the leading-edge marker, not a badge. */
    expect(failed.querySelectorAll('.bg-destructive').length).toBeGreaterThan(0)

    /* No badge anywhere on the failed row… */
    const failedBadges = [...failed.querySelectorAll('[data-slot="badge"]')]
    expect(failedBadges).toHaveLength(0)
    /* …while a healthy row has one, so the absence above is a decision. */
    expect(rowFor('Ahmed Salem').querySelectorAll('[data-slot="badge"]').length).toBeGreaterThan(0)

    /* One page banner, carrying the count. */
    const banner = screen.getByText(EN['fin.payout.failed.title'] as string)
    expect(banner).toBeTruthy()
    expect(screen.getByText(EN['fin.payout.failed.body'] as string)).toBeTruthy()
    expect(screen.getAllByText(EN['fin.payout.failed.title'] as string)).toHaveLength(1)
  })

  /**
   * **AC-368** — *"a payout that the operator's role may not perform renders its
   * action disabled in place with the reason available. No spinner, no
   * 'submitting to bank network', and no success screen appears for an
   * unauthorised payout."*
   *
   * Driven through the local read-level row, because the real route rows carry
   * `permission: null`. The negative half is not vacuous: the same three
   * strings are asserted **present** in the authorised path elsewhere in this
   * file, so their absence here is a state and not a missing observer.
   */
  it('AC-368 — a read-only role sees Pay disabled in place, and no commit path at all', async () => {
    const user = userEvent.setup()
    mount(readOnlyRow(), '/financials/payouts?view=payouts')
    await waitFor(() => expect(screen.getByText('Ahmed Salem')).toBeTruthy())

    const control = await rowActionControl(
      user,
      rowFor('Ahmed Salem'),
      EN['fin.payout.action.pay'] as string,
    )
    /* Disabled IN PLACE — present in the DOM, not hidden. */
    expect(control).toBeTruthy()
    expect(
      control.getAttribute('disabled') !== null || control.getAttribute('aria-disabled') === 'true',
    ).toBe(true)

    /* No confirmation opened, nothing committed, no audit entry. */
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(auditLogSize()).toBe(0)
  })

  /** The row-level refusals AC-368's siblings name: no bank account, nothing net payable. */
  it('AC-368 — a captain with no bank account and one with nothing net payable are both disabled', async () => {
    const user = userEvent.setup()
    mount(payoutsRow(), '/financials/payouts?view=payouts')
    await waitFor(() => expect(screen.getByText('Youssef Nouri')).toBeTruthy())

    for (const captain of ['Youssef Nouri', 'Ibrahim Diarra Coulibaly']) {
      const control = await rowActionControl(
        user,
        rowFor(captain),
        EN['fin.payout.action.pay'] as string,
      )
      expect(
        control.getAttribute('disabled') !== null ||
          control.getAttribute('aria-disabled') === 'true',
        `${captain}'s Pay is disabled in place`,
      ).toBe(true)
      await user.keyboard('{Escape}')
    }
  })

  /**
   * **AC-368's second clause, split out so the verdict can be precise** —
   * *"…with the reason available."*
   *
   * **Expected RED.** `RowAction` has a `disabled` predicate and **no reason
   * field at all**, so `SingleRowAction` and the kebab item both render a bare
   * disabled control. `fin.payout.blocked.noBank`, `fin.payout.blocked.nothing`
   * and `fin.payout.blocked.permission` are all written, translated and
   * unreachable: the operator sees a dead control and is told nothing.
   *
   * The three copy keys are asserted to exist first, so this reads as *"the
   * reason was written and is not rendered"* rather than *"there is no reason"*.
   */
  it('AC-368 — the disabled Pay states why', async () => {
    const user = userEvent.setup()
    for (const key of [
      'fin.payout.blocked.noBank',
      'fin.payout.blocked.nothing',
      'fin.payout.blocked.permission',
    ]) {
      expect(EN[key], `${key} is written`).toBeTruthy()
    }

    mount(payoutsRow(), '/financials/payouts?view=payouts')
    await waitFor(() => expect(screen.getByText('Youssef Nouri')).toBeTruthy())

    const control = await rowActionControl(
      user,
      rowFor('Youssef Nouri'),
      EN['fin.payout.action.pay'] as string,
    )
    const reason =
      control.getAttribute('title') ??
      control.getAttribute('aria-describedby') ??
      control.getAttribute('aria-label')
    expect(reason, 'the disabled Pay carries its reason').toBeTruthy()
  })
})

/* ═══════════════════════ AC-369 / AC-370 — deductions ═══════════════════ */

describe('waiving a deduction', () => {
  /**
   * **AC-369** — *"waiving a deduction requires a reason, raises a confirmation
   * naming the amount and the captain, and writes an audit entry naming the
   * actor and the reason."*
   *
   * The reason gate is asserted **both ways** in one test: the primary is
   * disabled with the field empty and enabled once it is filled. Only the pair
   * proves the disabling is the reason's doing.
   */
  it('AC-369 — the confirmation names the amount and the captain and refuses without a reason', async () => {
    const user = userEvent.setup()
    mount(payoutsRow(), '/financials/payouts?view=deductions')
    await waitFor(() => expect(screen.getByText('DED-01')).toBeTruthy())

    await invokeRowAction(user, rowFor('DED-01'), EN['fin.deduction.action.waive'] as string)
    const dialog = await screen.findByRole('dialog')

    /* The amount and the captain, in the title. */
    expect(within(dialog).getByRole('heading').textContent).toContain('15.00')
    expect(within(dialog).getByRole('heading').textContent).toContain('Khalid Mansour')

    const confirm = within(dialog).getByRole('button', {
      name: EN['fin.deduction.waive.confirm'] as string,
    })
    expect(confirm).toBeDisabled()

    await user.type(
      within(dialog).getByLabelText(EN['fin.deduction.waive.reason.label'] as string),
      'Rider withdrew the complaint',
    )
    expect(confirm).toBeEnabled()

    await user.click(confirm)
    await waitFor(() => expect(auditLogSize()).toBe(1))

    const entries = await listAuditEntries({ pageSize: 5 })
    expect(entries.items[0]?.actorName).toBeTruthy()
    expect(entries.items[0]?.reasonCode).toBe('Rider withdrew the complaint')
    expect(entries.items[0]?.subjectId).toBe('DRV-0103')
  })

  /**
   * **AC-370** — *"a waived deduction remains visible in the `Deductions` view
   * with its `Waived` state, the actor and the reason. It is not removed from
   * the list."*
   *
   * Asserted on the seeded waiver rather than on one this test creates, so the
   * criterion holds across a reload and not only inside one session's overlay.
   */
  it('AC-370 — a waived deduction stays on the list with its actor and reason', async () => {
    mount(payoutsRow(), '/financials/payouts?view=deductions')
    await waitFor(() => expect(screen.getByText('DED-04')).toBeTruthy())

    const waived = rowFor('DED-04')
    expect(within(waived).getByText(EN['fin.deduction.status.waived'] as string)).toBeTruthy()
    expect(waived.textContent).toContain('Sarah Al-Rashid')
    expect(waived.textContent).toContain('TRP_ROUTE_DEVIATION')

    /* And it is not a red badge — a waiver is a neutral terminal outcome (R5). */
    const badge = waived.querySelector('[data-slot="badge"]')
    expect(badge?.getAttribute('data-tone')).toBe('neutral')
  })

  /**
   * **AC-371** — *"applying a deduction creates a debit posting on the captain's
   * payable ledger; the balance never goes below zero by clamping — if the
   * deduction exceeds the payable, the excess becomes a debit on the captain's
   * receivable and **both postings are shown**."*
   *
   * DED-02 is 30.00 against DRV-0105, whose payable is **zero**, so the whole
   * amount is excess. The summary half is asserted first and passes; the
   * posting half is **expected RED** for the same reason AC-362 is.
   */
  it('AC-371 — the excess goes to the receivable rather than clamping', async () => {
    const user = userEvent.setup()
    mount(payoutsRow(), '/financials/payouts?view=deductions')
    await waitFor(() => expect(screen.getByText('DED-02')).toBeTruthy())

    await invokeRowAction(user, rowFor('DED-02'), EN['fin.deduction.action.apply'] as string)
    await user.click(
      await screen.findByRole('button', { name: EN['fin.deduction.apply.confirm'] as string }),
    )

    await waitFor(async () => {
      const payouts = await listCaptainPayouts({ pageSize: 100 })
      const captain = payouts.items.find((each) => each.captainId === 'DRV-0105')
      /* Not clamped to a negative payable, and not forgiven either. */
      expect(captain?.payableHalalas).toBe(0)
      expect(captain?.cashDebtHalalas).toBe(3_000)
    })
  })

  /**
   * Both ledgers, and it takes **two fixtures** to see them.
   *
   * This asserted a payable posting for `DED-02` — whose captain's payable is
   * **zero**, so the whole deduction lands on the receivable and no payable
   * posting exists to find. The only way to satisfy the old assertion would
   * have been a zero-amount posting, which AC-300 forbids. The test named two
   * ledgers and exercised one.
   *
   * `DED-01` has a payable to relieve; `DED-02` is the excess case that spills
   * to `ar.driver`. One each.
   */
  it('AC-371 — and both postings are shown on the two ledgers', async () => {
    const user = userEvent.setup()
    const payableBefore = await getCaptainPayableLedger('DRV-0103')
    const debtBefore = await getCaptainDebtLedger('DRV-0105')
    /* DRV-0105 has prior payable history; what matters is that the deduction
       adds NOTHING to it, not that the ledger is empty. */
    const excessPayableBefore = await getCaptainPayableLedger('DRV-0105')

    mount(payoutsRow(), '/financials/payouts?view=deductions')

    /* Within the payable → relieves the payable. */
    await waitFor(() => expect(screen.getByText('DED-01')).toBeTruthy())
    await invokeRowAction(user, rowFor('DED-01'), EN['fin.deduction.action.apply'] as string)
    await user.click(
      await screen.findByRole('button', { name: EN['fin.deduction.apply.confirm'] as string }),
    )
    await waitFor(async () => {
      const after = await getCaptainPayableLedger('DRV-0103')
      expect(
        after.postings.length,
        'a deduction within the payable writes a posting on the payable ledger',
      ).toBeGreaterThan(payableBefore.postings.length)
    })

    /* Exceeds it — the captain's payable is zero, so it lands on the
       receivable instead. Asserting the payable here is what the old test did
       and it can never pass: there is nothing to relieve. */
    await waitFor(() => expect(screen.getByText('DED-02')).toBeTruthy())
    await invokeRowAction(user, rowFor('DED-02'), EN['fin.deduction.action.apply'] as string)
    await user.click(
      await screen.findByRole('button', { name: EN['fin.deduction.apply.confirm'] as string }),
    )
    await waitFor(async () => {
      const after = await getCaptainDebtLedger('DRV-0105')
      expect(
        after.postings.length,
        'an excess deduction writes a posting on the receivable ledger',
      ).toBeGreaterThan(debtBefore.postings.length)
    })

    const excessPayableAfter = await getCaptainPayableLedger('DRV-0105')
    expect(
      excessPayableAfter.postings.length,
      'and NOT on a payable with nothing to relieve — a zero-amount posting is forbidden (AC-300)',
    ).toBe(excessPayableBefore.postings.length)
  })

})

/* ══════════════════════ AC-430 / AC-431 — the failure path ══════════════ */

describe('AC-430 / AC-431 — a mutation that fails changes nothing and says so on its row', () => {
  /**
   * *"Inducing a failure on a payout leaves the payable balance exactly as it
   * was"* — and the message lands **on the row**, not by replacing the card.
   *
   * The failure is injected at the seam, so this is not a spy and cannot pass
   * without the mutation actually having been attempted: the row error only
   * renders because the call was made and threw.
   */
  it('the payable is untouched, the row carries the error, and the table stays usable', async () => {
    const user = userEvent.setup()
    const before = (await listCaptainPayouts({ pageSize: 100 })).items.find(
      (each) => each.captainId === 'DRV-0101',
    )

    mockFailures.always(PAYOUT_OPERATIONS.pay)
    mount(payoutsRow(), '/financials/payouts?view=payouts')
    await waitFor(() => expect(screen.getByText('Ahmed Salem')).toBeTruthy())

    await invokeRowAction(user, rowFor('Ahmed Salem'), EN['fin.payout.action.pay'] as string)
    await user.click(
      await screen.findByRole('button', { name: EN['fin.payout.confirm.confirm'] as string }),
    )

    /* **AC-431** — the failure is on that row. */
    await waitFor(() =>
      expect(within(rowFor('Ahmed Salem')).getByText(EN['fin.error.row'] as string)).toBeTruthy(),
    )

    /* …and not instead of the card: every other row is still rendered. */
    expect(screen.getByText('Omar Farouk')).toBeTruthy()
    expect(screen.getByText('Khalid Mansour')).toBeTruthy()
    expect(screen.getByRole('textbox', { name: EN['fin.payout.search'] as string })).toBeTruthy()

    /* **AC-430** — the record is exactly as it was, and nothing was audited. */
    const after = (await listCaptainPayouts({ pageSize: 100 })).items.find(
      (each) => each.captainId === 'DRV-0101',
    )
    expect(after).toEqual(before)
    expect(auditLogSize()).toBe(0)
  })

  /** The retry on the row re-runs the identical call, and succeeds once the failure clears. */
  it('AC-431 — the row’s retry re-runs the same call', async () => {
    const user = userEvent.setup()
    mockFailures.once(PAYOUT_OPERATIONS.pay)
    mount(payoutsRow(), '/financials/payouts?view=payouts')
    await waitFor(() => expect(screen.getByText('Ahmed Salem')).toBeTruthy())

    await invokeRowAction(user, rowFor('Ahmed Salem'), EN['fin.payout.action.pay'] as string)
    await user.click(
      await screen.findByRole('button', { name: EN['fin.payout.confirm.confirm'] as string }),
    )
    const row = await waitFor(() => {
      const found = rowFor('Ahmed Salem')
      within(found).getByText(EN['fin.error.row'] as string)
      return found
    })

    await user.click(within(row).getByRole('button', { name: EN['fin.error.retry'] as string }))
    await waitFor(async () => {
      const after = (await listCaptainPayouts({ pageSize: 100 })).items.find(
        (each) => each.captainId === 'DRV-0101',
      )
      expect(after?.state).toBe('paid')
    })
  })
})
