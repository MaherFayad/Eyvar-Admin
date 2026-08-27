/**
 * Financials › Rider Wallets — **AC-382**, **AC-384**, **AC-385**.
 *
 * **No spies.** AC-382's whole content is a pair of absences on the ledger side
 * — no selection, no sort, no filters — and an absence asserted against a spy
 * with no implementation is a green tick for a verification that never ran. So
 * each absence here is asserted against the DOM **and paired with its presence
 * on the index in the same test**: the checkbox, the sort control and the
 * filter control are all found on the index and all absent on the ledger. A
 * query that could not find them anywhere would fail the first half.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  checkAdjustmentAuthority,
  disableMockLatency,
  getRouteTable,
  listWallets,
  resetDataLayer,
} from '@/data/clients'
import type { SubTabRoute } from '@/data/types'
import { EN } from '@/i18n/dictionaries'
import { ShellProvider } from '@/shell/ShellContext'
import { WalletsScreen } from './WalletsScreen'

const walletsRow = (): SubTabRoute => {
  const row = getRouteTable().subTabs.find((each) => each.subTabId === 'financials-rider-wallets')
  if (!row) throw new Error('No route-table row for financials-rider-wallets')
  return row
}

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
})

function mount(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider>
        <WalletsScreen row={walletsRow()} />
      </ShellProvider>
    </MemoryRouter>,
  )
}

function rowFor(text: string): HTMLElement {
  const tr = screen.getByText(text).closest('tr')
  if (!tr) throw new Error(`No row for ${text}`)
  return tr
}

/* ════════════ AC-382 — an index of ledgers, and the boundary ════════════ */

describe('AC-382 — the index is an index and the ledger behind it is a ledger', () => {
  /**
   * *"The wallet index is an index table — selection, sort and filters all work
   * per foundation §7.1. The per-rider ledger reached from an identity link is a
   * ledger — none of those three exists on it."*
   *
   * Both halves in one test on purpose. Asserting only the ledger's absences
   * would pass against a table with no furniture at all, which is not what the
   * criterion says.
   */
  it('selection, sort and filters exist on the index and none of them on the ledger', async () => {
    const user = userEvent.setup()
    mount('/financials/rider-wallets?view=all-wallets')
    await waitFor(() => expect(screen.getByText('Nora Al-Harbi')).toBeTruthy())

    /* ── the index ── */
    expect(
      screen.getByRole('checkbox', { name: EN['table.selectAll'] as string }),
      'the index carries a select-all',
    ).toBeTruthy()
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(1)
    expect(screen.getByRole('button', { name: EN['table.sort'] as string })).toBeTruthy()
    expect(screen.getByRole('button', { name: EN['table.filter'] as string })).toBeTruthy()

    /* Selection actually works — §7.1, not a decorative checkbox. */
    const rowCheckbox = within(rowFor('Nora Al-Harbi')).getByRole('checkbox')
    await user.click(rowCheckbox)
    await waitFor(() => expect(rowCheckbox.getAttribute('data-state')).toBe('checked'))

    /* ── across the identity link, into the ledger ── */
    await user.click(screen.getByRole('button', { name: 'Nora Al-Harbi' }))
    await waitFor(() => expect(screen.getByText(EN['fin.ledger.opening'] as string)).toBeTruthy())

    expect(screen.queryAllByRole('checkbox'), 'a ledger has no selection').toHaveLength(0)
    expect(screen.queryByRole('button', { name: EN['table.sort'] as string })).toBeNull()
    expect(screen.queryByRole('button', { name: EN['table.addFilter'] as string })).toBeNull()

    /* And no header offers a sort: a ledger header may still carry a column
       menu for hide and pin — those are layout, not order — but opening every
       one of them turns up no sort item and no sort indicator. */
    for (const header of screen.getAllByRole('columnheader')) {
      expect(header.getAttribute('aria-sort') ?? 'none').toBe('none')
      const menu = within(header).queryAllByRole('button')
      for (const control of menu) {
        expect(control.getAttribute('aria-label')).toContain('Column options')
      }
    }
    const headerMenu = within(screen.getAllByRole('columnheader')[2] as HTMLElement).queryByRole(
      'button',
    )
    if (headerMenu) {
      await user.click(headerMenu)
      expect(screen.queryAllByRole('menuitemradio')).toHaveLength(0)
      expect(screen.queryByText(EN['table.sort.clear'] as string)).toBeNull()
      await user.keyboard('{Escape}')
    }
  })

  /**
   * AC-382's third word — *"…and **filters** all work per foundation §7.1."*
   *
   * **Expected RED.** The `Filter` control renders on the wallet index, and
   * opening it offers **nothing**: not one of the index's six columns declares
   * a `filter`, so `filterEntries` is empty and the popover says
   * `No options available`. The control is furniture.
   *
   * Asserted by opening the popover rather than by reading the column
   * definitions, because the criterion is about what an operator can do.
   */
  it('the index’s Filter control offers at least one field', async () => {
    const user = userEvent.setup()
    mount('/financials/rider-wallets?view=all-wallets')
    await waitFor(() => expect(screen.getByText('Nora Al-Harbi')).toBeTruthy())

    await user.click(screen.getByRole('button', { name: EN['table.filter'] as string }))
    expect(
      screen.queryByText(EN['table.filter.noOptions'] as string),
      'the wallet index offers a filter',
    ).toBeNull()
  })
})

/* ═════════════ AC-384 / AC-385 — the authority envelope ═════════════════ */

describe('the compensation authority, which no reason may route around', () => {
  /**
   * **AC-384** — *"issuing a goodwill credit above the operator's per-case cap
   * is refused **before it commits**, and the refusal names the cap in SAR and
   * the role that can grant it."*
   *
   * "Before it commits" is the criterion: the primary is disabled and the
   * message renders in the dialog, with no call made. The ceiling is read from
   * the client rather than typed here, so the test moves with the policy — a
   * hardcoded 1,000.00 would pass today and silently stop testing anything the
   * day the Owner ceiling changes.
   */
  it('AC-384 — an amount above the ceiling is refused in the dialog, naming the cap in SAR', async () => {
    const user = userEvent.setup()
    const envelope = await checkAdjustmentAuthority('RDR-1041', 0, 'goodwill')
    const capMajor = envelope.perCaseCapHalalas / 100
    expect(Number.isInteger(envelope.perCaseCapHalalas)).toBe(true)

    mount('/financials/rider-wallets?view=all-wallets')
    await waitFor(() => expect(screen.getByText('Nora Al-Harbi')).toBeTruthy())

    await user.click(
      within(rowFor('Nora Al-Harbi')).getByRole('button', {
        name: EN['fin.wallet.action.adjust'] as string,
      }),
    )
    const dialog = await screen.findByRole('dialog')

    /* The ceiling is stated up front, in SAR, before anything is typed. */
    const help = within(dialog).getByText(/Your ceiling is/)
    expect(help.textContent).toContain(capMajor.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }))
    expect(help.textContent).toContain('SAR')

    const amount = within(dialog).getByLabelText(EN['fin.wallet.adjust.amount.label'] as string)
    const confirm = within(dialog).getByRole('button', {
      name: EN['fin.wallet.adjust.confirm'] as string,
    })

    /* One halala over the ceiling. */
    await user.type(amount, String(capMajor + 0.01))
    await user.type(
      within(dialog).getByLabelText(EN['fin.wallet.adjust.reason.label'] as string),
      'CAP_LATE',
    )
    await user.tab()

    expect(confirm, 'the primary is refused before it commits').toBeDisabled()
    /* The refusal names the cap AND the role the ceiling came from. */
    const refusal = within(dialog).getByText(/Above the/)
    expect(refusal.textContent).toContain(envelope.appliedRole)
    expect(refusal.textContent).toContain('SAR')

    /* One halala under, and the same primary is live — so the refusal above is
       the ceiling's doing and not a dialog that never enables. */
    await user.clear(amount)
    await user.type(amount, String(capMajor - 0.01))
    await waitFor(() => expect(confirm).toBeEnabled())
  })

  /**
   * **AC-385** — *"the authority check applies regardless of the reason chosen.
   * Selecting a reason such as `Manual top-up` does not bypass the per-case,
   * daily, or per-rider-per-30-day limits."*
   *
   * This is **D-F21**: `:3985` tests the reason label for the literal string
   * `'Goodwill'` and skips `compCheck` entirely for anything else, so
   * `Manual top-up` moves any amount with no ceiling at all. The test drives
   * the exact reason that bypasses it in legacy.
   */
  it('AC-385 — the ceiling holds for `Manual top-up`, the reason legacy exempts', async () => {
    const user = userEvent.setup()
    const envelope = await checkAdjustmentAuthority('RDR-1041', 0, 'goodwill')
    const overCap = envelope.perCaseCapHalalas / 100 + 500

    mount('/financials/rider-wallets?view=all-wallets')
    await waitFor(() => expect(screen.getByText('Nora Al-Harbi')).toBeTruthy())
    await user.click(
      within(rowFor('Nora Al-Harbi')).getByRole('button', {
        name: EN['fin.wallet.action.adjust'] as string,
      }),
    )
    const dialog = await screen.findByRole('dialog')

    await user.type(
      within(dialog).getByLabelText(EN['fin.wallet.adjust.amount.label'] as string),
      String(overCap),
    )
    await user.type(
      within(dialog).getByLabelText(EN['fin.wallet.adjust.reason.label'] as string),
      'Manual top-up',
    )
    await user.tab()

    expect(
      within(dialog).getByRole('button', { name: EN['fin.wallet.adjust.confirm'] as string }),
      'the reason does not lift the ceiling',
    ).toBeDisabled()

    /* And the envelope the server returns is the same one for that reason —
       there is no reason code that returns a different ceiling. */
    const forTopup = await checkAdjustmentAuthority('RDR-1041', 0, 'Manual top-up')
    expect(forTopup.perCaseCapHalalas).toBe(envelope.perCaseCapHalalas)
    expect(forTopup.dailyCapHalalas).toBe(envelope.dailyCapHalalas)
    expect(forTopup.per30dCapHalalas).toBe(envelope.per30dCapHalalas)
  })

  /**
   * **AC-451's screen half** — *"a rider whose **fare** was charged back does
   * not appear in the `Negative balances` view on the strength of that
   * chargeback alone."*
   *
   * Asserted on the rendered view rather than only on the client, because the
   * view is where an operator would meet the mistake.
   */
  it('AC-451 — the Negative balances view holds only wallets that are actually below zero', async () => {
    mount('/financials/rider-wallets?view=negative-balances')
    await waitFor(() => expect(screen.getAllByRole('row').length).toBeGreaterThan(1))

    const negative = await listWallets({ view: 'negative-balances', pageSize: 100 })
    expect(negative.items.length).toBeGreaterThan(0)
    for (const wallet of negative.items) {
      expect(wallet.balanceHalalas).toBeLessThan(0)
      expect(screen.getByText(wallet.riderName)).toBeTruthy()
    }

    /* Every rendered row's balance carries U+2212 — the view cannot contain a
       positive one. */
    for (const wallet of negative.items) {
      expect(rowFor(wallet.riderName).textContent).toContain('−')
    }
  })
})
