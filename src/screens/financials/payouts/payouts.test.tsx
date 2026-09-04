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
import { VOCABULARY_EN } from '@/i18n/vocabulary/copy'
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
  /* **D17.** `writePermission: null` is the new shape's own definition of a row
     that declares no write actions, and `canWriteSubTab` returns `false` for
     it — which is exactly the read-only sub-tab §11.2 describes: it renders,
     with its write actions disabled in place and the reason named.
     This replaces `permission: { level: 'read' }`, which stopped type-checking
     when `SubTabRoute` gained `viewPermission` / `writePermission`. */
  writePermission: null,
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
    /* Rule 7 — the reason reads in words. The registry's id is not the text. */
    expect(waived.textContent).toContain(VOCABULARY_EN['reason.TRP_ROUTE_DEVIATION'])
    expect(waived.textContent).not.toContain('TRP_ROUTE_DEVIATION')

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


/* ══════════ P4-T1 / D21 — the bulk bar, and the set semantics ═════════════ */

/**
 * **What these tests are for, and what they deliberately do not use.**
 *
 * The refusals below are constructed from **domain state I control** — a
 * captain with no bank account, a captain whose net payable is not positive —
 * and never from `gate.canWrite`. Every route-table row carries
 * `permission: null` today, so `canWrite` is `true` for every operator and a
 * test that refused through it would be asserting against a gate that cannot
 * currently fail. The one permission test below uses `readOnlyRow()`, which
 * constructs the permission explicitly, and says so.
 *
 * Each assertion also states its **non-vacuity** first, read from the client:
 * that the fixtures really do contain an eligible captain and a refused one. A
 * bulk bar over a set that happens to be uniform proves nothing about a rule
 * whose whole content is what happens when it is not.
 */

/** A row's own selection checkbox, whatever primitive `DataTable` rendered. */
async function selectRow(user: ReturnType<typeof userEvent.setup>, name: string) {
  const box = rowFor(name).querySelector('input[type="checkbox"], [role="checkbox"]')
  if (!box) throw new Error(`No selection checkbox on the row for ${name}`)
  await user.click(box)
}

/** The inverted bulk bar. Its accessible name is the count it will act on. */
function bulkBar(): HTMLElement {
  return screen.getByRole('group', { name: /selected/i })
}

const PAY = EN['fin.payout.action.pay'] as string

/** Read the live rows, so the test never assumes a fixture the ledger overrode. */
async function payoutState() {
  const { items } = await listCaptainPayouts({ pageSize: 100 })
  const eligible = items.filter(
    (each) => each.bankAccountLast4 !== null && each.payableHalalas - each.cashDebtHalalas > 0,
  )
  const noBank = items.filter((each) => each.bankAccountLast4 === null)
  const nothing = items.filter(
    (each) => each.bankAccountLast4 !== null && each.payableHalalas - each.cashDebtHalalas <= 0,
  )
  return { items, eligible, noBank, nothing }
}

describe('P4-T1 — Payouts gains selection and a bulk bar', () => {
  it('the payouts index carries a checkbox column, and selecting raises the bar', async () => {
    const user = userEvent.setup()
    mount(payoutsRow(), '/financials/payouts?view=payouts')
    await waitFor(() => expect(screen.getByText('Ahmed Salem')).toBeTruthy())

    expect(
      screen.getByRole('checkbox', { name: EN['table.selectAll'] as string }),
      'the index carries a select-all',
    ).toBeTruthy()

    await selectRow(user, 'Ahmed Salem')
    expect(within(bulkBar()).getByRole('button', { name: PAY })).toBeTruthy()
    /* D10b — the bar carries its own exit. */
    expect(within(bulkBar()).getByRole('button', { name: EN['table.clear'] as string })).toBeTruthy()
  })

  /**
   * **AC-335 stays intact and this is where it is guarded.** The spec forbids a
   * bulk-reverse affordance anywhere in Financials. Selection arriving on this
   * screen is exactly the change that could smuggle one in, so the bar's whole
   * command list is enumerated rather than checked for an absence.
   */
  it('AC-335 — the bar offers Pay and nothing else; no reversal is bulk', async () => {
    const user = userEvent.setup()
    mount(payoutsRow(), '/financials/payouts?view=payouts')
    await waitFor(() => expect(screen.getByText('Ahmed Salem')).toBeTruthy())
    await selectRow(user, 'Ahmed Salem')

    const commands = within(bulkBar())
      .getAllByRole('button')
      .map((control) => control.textContent?.trim())
    expect(commands).toEqual([PAY, EN['table.clear']])
  })
})

describe('D21 — a bulk payout is refused if any selected captain would be', () => {
  /**
   * **AC-958's shape, on money.** A mixed selection: the bar refuses, the
   * sentence is real text above it rather than a tooltip, and the disabled
   * control points at that sentence with `aria-describedby`.
   */
  it('a mixed selection disables Pay and names how many are blocked', async () => {
    const { eligible, noBank } = await payoutState()
    /* Non-vacuity: the fixtures must actually hold both kinds. */
    expect(eligible.length, 'some captain is payable').toBeGreaterThan(1)
    expect(noBank.length, 'some captain has no bank account').toBe(1)

    const user = userEvent.setup()
    mount(payoutsRow(), '/financials/payouts?view=payouts')
    await waitFor(() => expect(screen.getByText('Ahmed Salem')).toBeTruthy())

    await selectRow(user, eligible[0]!.captainName)
    await selectRow(user, eligible[1]!.captainName)
    await selectRow(user, noBank[0]!.captainName)

    const pay = within(bulkBar()).getByRole('button', { name: PAY })
    expect(pay).toBeDisabled()

    /* The `.other` sentence, with the blocked count in it. */
    const sentence = (EN['fin.bulk.pay.noBank.other'] as string).replace('{count}', '1')
    expect(screen.getByText(sentence)).toBeTruthy()

    /* §11.2 / §8.4.4 — reachable from the control, not merely near it. */
    const describedBy = pay.getAttribute('aria-describedby') ?? ''
    expect(document.getElementById(describedBy)?.textContent).toContain('bank account')
  })

  /**
   * **AC-960.** Every selected captain refused: the sentence changes to `.all`
   * and there is no escape hatch, because there is nothing to narrow to.
   */
  it('AC-960 — a wholly refused selection takes the `.all` sentence and offers no narrowing', async () => {
    const { noBank, nothing } = await payoutState()
    expect(noBank.length + nothing.length, 'more than one refused captain exists').toBeGreaterThan(1)

    const user = userEvent.setup()
    mount(payoutsRow(), '/financials/payouts?view=payouts')
    await waitFor(() => expect(screen.getByText('Ahmed Salem')).toBeTruthy())

    await selectRow(user, noBank[0]!.captainName)
    await selectRow(user, nothing[0]!.captainName)

    expect(within(bulkBar()).getByRole('button', { name: PAY })).toBeDisabled()
    /* The count is the WHOLE blocked subset (D21 rendering rule 4), which over
       a two-cause selection is both of them — so the sentence and the absent
       hatch agree about the size of the problem. */
    const sentence = (EN['fin.bulk.pay.noBank.all'] as string).replace('{count}', '2')
    expect(screen.getByText(sentence)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Select only/ })).toBeNull()
  })

  /** **D21's `.one` form** — one record selected and refused has no subset to name. */
  it('a single refused captain takes the `.one` sentence', async () => {
    const { noBank } = await payoutState()
    const user = userEvent.setup()
    mount(payoutsRow(), '/financials/payouts?view=payouts')
    await waitFor(() => expect(screen.getByText('Ahmed Salem')).toBeTruthy())

    await selectRow(user, noBank[0]!.captainName)
    expect(screen.getByText(EN['fin.bulk.pay.noBank.one'] as string)).toBeTruthy()
  })

  /**
   * **AC-959 and AC-961 together, which is the pair that matters on money.**
   * Narrowing is not a partial apply: the selection changes, the bar's count
   * changes with it, **nothing has been paid at that point**, and what the
   * command then acts on is exactly what the bar said.
   */
  it('AC-959 / AC-961 — `Select only the N eligible` narrows, runs nothing, and the payout matches the bar', async () => {
    const { eligible, noBank } = await payoutState()
    const user = userEvent.setup()
    mount(payoutsRow(), '/financials/payouts?view=payouts')
    await waitFor(() => expect(screen.getByText('Ahmed Salem')).toBeTruthy())

    await selectRow(user, eligible[0]!.captainName)
    await selectRow(user, eligible[1]!.captainName)
    await selectRow(user, noBank[0]!.captainName)
    expect(bulkBar().getAttribute('aria-label')).toContain('3')

    await user.click(screen.getByRole('button', { name: 'Select only the 2 eligible' }))

    expect(bulkBar().getAttribute('aria-label')).toContain('2')
    expect(within(bulkBar()).getByRole('button', { name: PAY })).toBeEnabled()
    /* Narrowing is a selection change and nothing else. */
    expect(auditLogSize(), 'narrowing must not pay anybody').toBe(0)

    await user.click(within(bulkBar()).getByRole('button', { name: PAY }))
    const dialog = await screen.findByRole('dialog')
    await user.click(
      within(dialog).getByRole('button', { name: EN['fin.bulk.pay.confirm.confirm'] as string }),
    )

    /* **AC-961** — two on the bar, two paid, and one audit entry each. */
    await waitFor(() => expect(auditLogSize()).toBe(2))
  })

  /**
   * **AC-962** — the permission sentence outranks the domain one. Built from
   * `readOnlyRow()`, which declares the permission explicitly, because the
   * shipped route rows carry `permission: null` and nothing can fail the gate.
   */
  it('AC-962 — a read-only role is refused with the role sentence, not the domain one', async () => {
    const { eligible, noBank } = await payoutState()
    const user = userEvent.setup()
    mount(readOnlyRow(), '/financials/payouts?view=payouts')
    await waitFor(() => expect(screen.getByText('Ahmed Salem')).toBeTruthy())

    await selectRow(user, eligible[0]!.captainName)
    await selectRow(user, noBank[0]!.captainName)

    expect(within(bulkBar()).getByRole('button', { name: PAY })).toBeDisabled()
    const sentence = (EN['fin.bulk.pay.permission.all'] as string).replace('{count}', '2')
    expect(screen.getByText(sentence)).toBeTruthy()
    /* And the domain sentence is NOT what it says, even though one row is also
       refused on domain grounds. */
    expect(screen.queryByText(/bank account is on file/)).toBeNull()
  })
})

describe('a bulk payout reaches the data layer once per captain', () => {
  /**
   * The whole point of a bulk command: it is N real acts, each with its own
   * posting and its own audit entry (**AC-362**, **AC-437**). Asserted against
   * the audit log and the payable ledgers rather than against a toast.
   */
  it('pays every selected captain, writes one entry each, and moves each payable', async () => {
    const { eligible } = await payoutState()
    const targets = eligible.slice(0, 2)
    expect(targets.length).toBe(2)

    const before = await Promise.all(
      targets.map((each) => getCaptainPayableLedger(each.captainId)),
    )

    const user = userEvent.setup()
    mount(payoutsRow(), '/financials/payouts?view=payouts')
    await waitFor(() => expect(screen.getByText('Ahmed Salem')).toBeTruthy())
    for (const target of targets) await selectRow(user, target.captainName)

    await user.click(within(bulkBar()).getByRole('button', { name: PAY }))
    const dialog = await screen.findByRole('dialog')
    /* §9.1 — the confirmation states the verb and the amount, and the primary
       repeats the verb. The three labelled lines are the SET's totals. */
    expect(within(dialog).getByText(EN['fin.payout.col.net'] as string)).toBeTruthy()
    await user.click(
      within(dialog).getByRole('button', { name: EN['fin.bulk.pay.confirm.confirm'] as string }),
    )

    await waitFor(() => expect(auditLogSize()).toBe(2))
    const entries = await listAuditEntries({ pageSize: 10 })
    const subjects = entries.items.slice(0, 2).map((entry) => entry.subjectId).sort()
    expect(subjects).toEqual(targets.map((each) => each.captainId).sort())

    /* Each payable moved by its own net, so a posting really landed on each. */
    const after = await Promise.all(
      targets.map((each) => getCaptainPayableLedger(each.captainId)),
    )
    for (const [index, ledger] of after.entries()) {
      expect(
        ledger.postings.length,
        `${targets[index]!.captainId} gained a posting`,
      ).toBeGreaterThan(before[index]!.postings.length)
    }
  })
})

/* ══════════════ P8-T1 — 360° reach from every name on the row ════════════ */

describe('P8-T1 — a cell that names an entity opens that entity', () => {
  /**
   * **The link is a real link.** `getByRole('link')` plus an `href` is the
   * assertion, because that is the difference the criterion is about: a
   * `<span onClick>` has the same text and none of the behaviour.
   */
  it('the captain name on a payout row links to the 360° profile', async () => {
    mount(payoutsRow(), '/financials/payouts?view=payouts')
    await waitFor(() => expect(screen.getByText('Ahmed Salem')).toBeTruthy())

    const link = await screen.findByRole('link', {
      name: (EN['fin.a11y.openProfile'] as string).replace('{name}', 'Ahmed Salem'),
    })
    expect(link.getAttribute('href')).toContain('entity=DRV-0101')
    /* The MONEY view is a separate, separately-labelled control — the name
       never silently means "open the payable ledger". */
    expect(link.getAttribute('href')).not.toContain('captain=')
  })

  it('an escrow row links its captain, its rider and its subscription', async () => {
    const { items } = await listEscrowHolds({ pageSize: 100 })
    const hold = items.find((each) => each.id === 'ESC-1052')
    expect(hold).toBeTruthy()

    mount(payoutsRow(), '/financials/payouts?view=escrow')
    await waitFor(() => expect(screen.getByText('ESC-1052')).toBeTruthy())

    const row = rowFor('ESC-1052')
    await waitFor(() =>
      expect(within(row).getAllByRole('link').length, 'three names, three links').toBe(3),
    )
    const hrefs = within(row)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href') ?? '')
    expect(hrefs.some((href) => href.includes(`entity=${hold!.captainId}`))).toBe(true)
    expect(hrefs.some((href) => href.includes(`entity=${hold!.riderId}`))).toBe(true)
    expect(hrefs.some((href) => href.includes(`entity=${hold!.subscriptionId}`))).toBe(true)

    /* And the hold's own id is NOT a link: an escrow hold has no profile, and a
       link that resolves to nothing is a guess about the route table (AC-474). */
    expect(within(row).getByText('ESC-1052').closest('a')).toBeNull()
  })

  /**
   * A deduction names a captain and the trip it was raised against, and both
   * open.
   *
   * **The negative — a reference that resolves to nothing rendering as text —
   * is asserted in `shared/entityLinks.test.tsx` and not here, on purpose.**
   * Every entity reference on every Financials fixture currently resolves, so
   * a DOM test of the unresolvable branch would be vacuous: it would pass just
   * as well against a component that linked everything. The unit test drives
   * the resolver with an id that is not on any record, which is the only way to
   * exercise it until a fixture carries one. Raised with mock-data-engineer.
   */
  it('a deduction row links its captain and its trip', async () => {
    mount(payoutsRow(), '/financials/payouts?view=deductions')
    await waitFor(() => expect(screen.getByText('DED-01')).toBeTruthy())

    const row = rowFor('DED-01')
    await waitFor(() =>
      expect(within(row).getAllByRole('link').length, 'the captain and the trip').toBe(2),
    )
    const hrefs = within(row)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href') ?? '')
    expect(hrefs.some((href) => href.includes('entity=TRP-7742'))).toBe(true)
    expect(hrefs.some((href) => href.includes('entity=DRV-'))).toBe(true)

    /* The deduction id itself is a document, not an entity, and is not a link. */
    expect(within(row).getByText('DED-01').closest('a')).toBeNull()
  })
})

/* ════════════ FINANCIALS-UX-PLAN §1 P0-2, §5.1, §5.6 (Q-F13) ════════════ */

describe('the returned-payouts banner acts, and the run states its figures', () => {
  /**
   * **P0-2 / AC-367** — the banner names the control that narrows the list, and
   * stands down once the list is already showing only those rows.
   */
  it('P0-2 — Show only returned narrows the index to the returned payouts', async () => {
    const user = userEvent.setup()
    mount(payoutsRow(), '/financials/payouts?view=payouts')
    await waitFor(() => expect(screen.getByText('Ahmed Salem')).toBeTruthy())

    await user.click(
      screen.getByRole('button', { name: EN['fin.payout.failed.action'] as string }),
    )

    await waitFor(() => expect(screen.queryByText('Ahmed Salem')).toBeNull())
    expect(screen.getByText('Youssef Nouri')).toBeTruthy()
    expect(screen.queryByText(EN['fin.payout.failed.title'] as string)).toBeNull()
  })

  /** §10.4 — the four figures a period is settled against, on the view row. */
  it('§5.1 — the strip states what is owed, what is net, and the two counts', async () => {
    mount(payoutsRow(), '/financials/payouts?view=payouts')
    const strip = await screen.findByRole('list', {
      name: EN['fin.payouts.view.payouts'] as string,
    })

    expect(within(strip).getByText(EN['fin.overview.pendingPayouts'] as string)).toBeTruthy()
    expect(within(strip).getByText(EN['fin.payout.figure.net'] as string)).toBeTruthy()
    expect(within(strip).getByText(EN['fin.payout.state.due'] as string)).toBeTruthy()
    expect(within(strip).getByText(EN['fin.payout.state.failed'] as string)).toBeTruthy()
  })

  /**
   * **TL-2 / Q-F13** — `listCaptainPayouts` takes no window, so the index
   * offers no period control; `getCaptainPayableLedger` takes one, so the
   * ledger carries it on its title row.
   */
  it('Q-F13 — only the ledger offers the period control, on the title row', async () => {
    const { unmount } = mount(payoutsRow(), '/financials/payouts?view=payouts')
    await waitFor(() => expect(screen.getByText('Ahmed Salem')).toBeTruthy())
    expect(
      screen.queryByRole('button', { name: EN['fin.overview.period.previous'] as string }),
    ).toBeNull()
    unmount()

    mount(payoutsRow(), '/financials/payouts?view=payouts&captain=DRV-0101')
    await waitFor(() => expect(screen.getByText(EN['fin.ledger.opening'] as string)).toBeTruthy())
    expect(
      screen.getByRole('button', { name: EN['fin.overview.period.previous'] as string }),
    ).toBeTruthy()
  })

  /**
   * **R2-2** — the drill-in is one header: the meta names the parent view and
   * the captain, and the way back is a link in the header rather than a chip on
   * a row of its own.
   */
  it('R2-2 — the ledger page states the parent view and the captain, and offers the way back', async () => {
    mount(payoutsRow(), '/financials/payouts?view=payouts&captain=DRV-0101')
    await waitFor(() => expect(screen.getByText(EN['fin.ledger.opening'] as string)).toBeTruthy())

    expect(screen.getByText(/^Payouts · /)).toBeTruthy()
    expect(
      screen.getByRole('button', {
        name: `Back to ${EN['fin.payouts.view.payouts'] as string}`,
      }),
    ).toBeTruthy()
  })

  /** Q-F4 — the cancelled holds are counted in the Escrow view's header. */
  it('§5.1 — the Escrow view states how many holds sit on a cancelled subscription', async () => {
    mount(payoutsRow(), '/financials/payouts?view=escrow')
    await waitFor(() => expect(screen.getByText('ESC-1052')).toBeTruthy())
    const header = screen.getByRole('list', {
      name: EN['fin.payouts.view.escrow'] as string,
    })
    expect(within(header).getByText(EN['fin.escrow.figure.cancelled'] as string)).toBeTruthy()
    expect(within(header).getByText(EN['fin.escrow.figure.held'] as string)).toBeTruthy()
    expect(within(header).getByText(EN['fin.escrow.figure.ready'] as string)).toBeTruthy()
  })
})
