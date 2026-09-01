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

    /* ── the index ──
       **AC-382 amended by D25.** This test's subject is the index/ledger
       BOUNDARY, and that half is untouched: an index sorts and filters, a
       ledger does neither. What moved is the affordance enumeration. AC-382
       used to also require a select-all here, and D25 derives selection from
       whether a screen declares bulk work — the wallet index declares none, so
       it has no checkbox column.

       That is not a capability lost. Before D25 the checkboxes were rendered
       and inert: ticking one replaced the column header row with an
       `N selected` cell and no bulk bar arrived, so the operator destroyed
       their own column labels and got nothing back. The reason there is no set
       command is recorded in the sibling describe below, and it is a real
       argument about wallet adjustments rather than an omission. */
    expect(
      screen.queryByRole('checkbox', { name: EN['table.selectAll'] as string }),
      'D25 — no bulk command declared, so no select-all',
    ).toBeNull()
    expect(screen.getByRole('button', { name: EN['table.sort'] as string })).toBeTruthy()
    expect(screen.getByRole('button', { name: EN['table.filter'] as string })).toBeTruthy()

    /* ── across the identity link, into the ledger ──
       **AC-43 / P8-T1.** The identity is a real `<a href>`, not a `<button>`:
       the ledger is a view of this route (`?rider=`), so it has an address, and
       an identity with an address must be openable in a new tab and copyable.
       Its accessible name is one key with the rider interpolated (AC-75). */
    const identity = screen.getByRole('link', {
      name: (EN['fin.a11y.openWallet'] as string).replace('{name}', 'Nora Al-Harbi'),
    })
    expect(identity.getAttribute('href')).toContain('rider=RDR-')
    await user.click(identity)
    await waitFor(() => expect(screen.getByText(EN['fin.ledger.opening'] as string)).toBeTruthy())

    /* Still true and still worth asserting — but note it no longer CONTRASTS
       with the index, which has no checkboxes either since D25. The live
       contrast in this test is sort and filter, asserted present above and
       absent below. A ledger's inability to select is compile-time enforced in
       `useIndexTable.types.ts`; this is the runtime twin. */
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


/* ═══ P8-T1 — two names for one rider, and they go to two places ═══ */

/**
 * **The one place in Financials where the identity link is NOT the profile.**
 *
 * Spec §5: *"Rider Wallets is an index **of** ledgers … the second level,
 * reached by the identity link, is that rider's ledger … **the boundary is the
 * identity link**"*, and **AC-382** tests it. P8-T1 nevertheless requires that
 * a cell naming a rider opens that rider. Both hold because the cell carries
 * **two** names for the same entity: the rider's name is the ledger, and the
 * rider's **id** on the second line is the 360° profile.
 *
 * Every other Financials table sends the name to the profile and keeps its
 * money view on a labelled control; this one is the criterion-bound exception
 * and the divergence is asserted rather than left to a comment.
 */
describe('P8-T1 — the wallet row names its rider twice, deliberately', () => {
  it('the name opens the ledger and the id opens the profile', async () => {
    mount('/financials/rider-wallets?view=all-wallets')
    await waitFor(() => expect(screen.getByText('Nora Al-Harbi')).toBeTruthy())
    const row = rowFor('Nora Al-Harbi')

    /* AC-382's boundary: the identity goes to this rider's wallet ledger. */
    const identity = within(row).getByRole('link', {
      name: (EN['fin.a11y.openWallet'] as string).replace('{name}', 'Nora Al-Harbi'),
    })
    expect(identity.getAttribute('href')).toContain('rider=RDR-')
    expect(identity.getAttribute('href')).not.toContain('entity=')

    /* P8-T1's reach: the id goes to the 360° profile, over this route. */
    const profile = await within(row).findByRole('link', {
      name: (EN['fin.a11y.openProfile'] as string).replace(
        '{name}',
        identity.getAttribute('href')?.match(/rider=(RDR-\d+)/)?.[1] ?? '',
      ),
    })
    expect(profile.getAttribute('href')).toContain('entity=RDR-')
  })

  /**
   * **AC-43** — an identity with an address is a link, not a button. The
   * `<button>` this replaces could not be middle-clicked, copied or opened in a
   * new tab, and it carried `focus-visible:outline-none` plus its own restored
   * ring; the link inherits `globals.css`'s default and suppresses nothing.
   */
  it('the identity is an anchor with an href, not a button', async () => {
    mount('/financials/rider-wallets?view=all-wallets')
    await waitFor(() => expect(screen.getByText('Nora Al-Harbi')).toBeTruthy())

    const identity = screen.getByText('Nora Al-Harbi').closest('a')
    expect(identity, 'the identity is an anchor').toBeTruthy()
    expect(identity?.getAttribute('href')).toBeTruthy()
    expect(screen.getByText('Nora Al-Harbi').closest('button')).toBeNull()
    expect(identity?.className ?? '').not.toContain('outline-none')
  })
})

/* ═════ P4-T1 — why this sub-tab has no bulk bar, recorded as a test ═════ */

/**
 * **This is a decision, and it is asserted so that adding one is a deliberate
 * act rather than a drift.** The only command on this index is `Adjust`, and
 * three things about it are per-rider: **AC-387**'s reason code, the daily
 * authority ceiling consumed as a set is applied, and **AC-386**'s
 * second-approval flag computed from that rider's own 30-day history. A set
 * cannot be refused honestly before it runs, and a half-applied set of money
 * movements is what D21 exists to prevent.
 *
 * The checkbox column stays because **AC-382** puts it there. That leaves it
 * doing nothing, which is raised with product-owner in the handoff — the two
 * ways out are a genuinely set-shaped command or an amendment to AC-382, and
 * neither is an engineer's call.
 */
describe('P4-T1 — the wallet index offers no bulk command', () => {
  /**
   * **D25 strengthened this from "no bulk bar" to "no checkbox at all", and the
   * reason the index declares no bulk command is worth keeping written down.**
   *
   * Three per-rider facts defeat the set rule, and each would have to be
   * evaluated per record before a set command could honestly say yes: AC-387's
   * reason code (nine riders sharing one reason is the blanket justification
   * the field exists to prevent); the daily authority ceiling, which is
   * **consumed as the set is applied** — `checkAdjustmentAuthority` measures
   * `dailyUsed + amount`, so a uniform set of nine can be permitted for six and
   * refused for three, and D21's *"refused if any would be refused"* cannot be
   * answered before the run because there is no reservation; and AC-386's
   * second-approval flag, computed from that rider's own 30-day history.
   */
  it('offers no selection, because there is no set command behind it', async () => {
    mount('/financials/rider-wallets?view=all-wallets')
    await waitFor(() => expect(screen.getByText('Nora Al-Harbi')).toBeTruthy())

    expect(within(rowFor('Nora Al-Harbi')).queryAllByRole('checkbox')).toHaveLength(0)
    expect(
      screen.queryByRole('group', { name: /selected/i }),
      'an adjustment is a per-rider act; there is no set command to offer',
    ).toBeNull()

    /* Non-vacuity: the table really is rendered and really is an index — it
       sorts. Without this the two assertions above would pass on a blank page. */
    expect(screen.getByRole('button', { name: EN['table.sort'] as string })).toBeTruthy()
  })
})
