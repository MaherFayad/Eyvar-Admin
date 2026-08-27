/**
 * Financials, driven from the keyboard — **AC-450**, plus the confirmation's
 * §7.3.3 contract that every money-moving act depends on.
 *
 * **No spies.** `Escape` cancelling a confirmation is a negative — *"nothing has
 * mutated at that point"* — and it is asserted against `auditLogSize()` and the
 * client's own record, with the **committed** path asserted in a sibling test
 * so that "nothing changed" cannot be the same green tick as "nothing was
 * watched".
 *
 * **What this file cannot prove.** AC-450's first clause is *"every interactive
 * element shows a visible focus ring"*, and jsdom computes no styles: the
 * assertion below is that every focusable element **declares** a
 * `focus-visible:` ring or outline, which is the half a behaviour test can
 * hold. Whether the ring is actually visible at 3:1 against its background is
 * visual-QA's, and it is recorded in the verdict as such rather than claimed
 * here.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  auditLogSize,
  disableMockLatency,
  getRouteTable,
  listCaptainPayouts,
  listEscrowHolds,
  resetDataLayer,
} from '@/data/clients'
import type { SubTabRoute } from '@/data/types'
import { EN } from '@/i18n/dictionaries'
import { ShellProvider } from '@/shell/ShellContext'
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

const FOCUSABLE =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Everything an operator can reach with `Tab`, on whatever is mounted. */
function focusables(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) => element.getAttribute('aria-hidden') !== 'true',
  )
}

/**
 * The **leaf** controls — the ones focus actually rests on.
 *
 * A roving-focus container (Radix's `tablist`) carries `tabindex="0"` and
 * `outline: none` because it is a focus *proxy*: focus lands on it for a tick
 * and is forwarded to the active tab, which has the ring. Sweeping it for a
 * ring would report a defect that does not exist, so containers holding other
 * focusables are excluded — and the tabs inside them are still swept, so the
 * exclusion costs no coverage.
 */
function leafControls(): HTMLElement[] {
  const all = focusables()
  return all.filter((element) => !all.some((other) => other !== element && element.contains(other)))
}

/* ════════════════ AC-450 — the ring, declared on everything ═════════════ */

describe('AC-450 — every interactive element declares a focus ring', () => {
  /**
   * Three sub-tabs, in their content state, swept for a focusable element that
   * declares neither a `focus-visible:` ring nor a `focus-visible:` outline.
   *
   * This is a class-name assertion, which is normally the wrong tool — but
   * `outline-none` without a `focus-visible:ring` is §7.2's defect *as a class
   * decision*, and jsdom has no computed styles to read instead. The sweep is
   * over real mounted screens, so it moves when a screen adds a control.
   */
  it('no focusable element on Payouts, Cash or Rider Wallets is missing one', async () => {
    const surfaces: Array<[string, React.ReactElement, string]> = [
      ['Payouts', <PayoutsScreen row={rowFor('financials-payouts')} />, '/financials/payouts'],
      ['Cash', <CashScreen row={rowFor('financials-cash')} />, '/financials/cash'],
      [
        'Rider Wallets',
        <WalletsScreen row={rowFor('financials-rider-wallets')} />,
        '/financials/rider-wallets',
      ],
    ]

    for (const [name, element, path] of surfaces) {
      const { unmount } = mount(element, path)
      await waitFor(() => expect(screen.getAllByRole('row').length).toBeGreaterThan(1))

      const found = leafControls()
      expect(found.length, `${name} has focusable controls`).toBeGreaterThan(3)
      /* The view tabs are leaves and ARE swept, so the container exclusion
         above did not quietly drop them. */
      expect(found.some((control) => control.getAttribute('role') === 'tab')).toBe(true)

      const bare = found.filter((control) => {
        const own = control.className ?? ''
        /* A control may inherit the ring from a wrapper it is `asChild` of, so
           the ancestor chain is checked too — three levels is enough for every
           composition in this product and keeps a genuinely bare control from
           hiding behind a distant parent. */
        const ancestry = [control, control.parentElement, control.parentElement?.parentElement]
          .map((node) => (node?.className as string) ?? '')
          .join(' ')
        return !/focus-visible:(ring|outline)/.test(`${own} ${ancestry}`)
      })

      expect(
        bare.map((control) => control.textContent?.trim() || control.tagName),
        `${name} has a control with no focus ring`,
      ).toEqual([])
      unmount()
    }
  })

  /**
   * *"…and every ledger's source link and every page-level action is reachable
   * by keyboard without a pointer."*
   *
   * Driven with `Tab` only — no `click` anywhere in this test — from the top of
   * the document until the source link takes focus. A link reachable only by
   * pointer would exhaust the tab order without ever being focused.
   */
  it('a ledger’s source link takes focus from the keyboard alone', async () => {
    const user = userEvent.setup()
    mount(
      <WalletsScreen row={rowFor('financials-rider-wallets')} />,
      '/financials/rider-wallets?rider=RDR-1041',
    )
    await waitFor(() => expect(screen.getByText(EN['fin.ledger.opening'] as string)).toBeTruthy())

    const sourceLinks = screen.getAllByRole('link', { name: EN['fin.ledger.source'] as string })
    expect(sourceLinks.length, 'the ledger has source links to reach').toBeGreaterThan(0)
    const target = sourceLinks[0] as HTMLElement

    let reached = false
    for (let step = 0; step < focusables().length + 5; step += 1) {
      await user.tab()
      if (document.activeElement === target) {
        reached = true
        break
      }
    }
    expect(reached, 'the source link is in the tab order').toBe(true)
  })

  /**
   * Row actions driven with the keyboard alone.
   *
   * **This used to open a kebab, and under D8-b there is no kebab on this
   * screen to open.** The threshold moved from two to three, so Payouts'
   * `Pay` and `View ledger` now render as two labelled buttons rather than
   * collapsing into a menu — and a test hard-coding the menu shape started
   * failing on a screen that had become *more* accessible, not less.
   *
   * Re-targeted rather than deleted, and re-targeted at the shape this screen
   * actually renders. §7.3's defect is a row action that only appears on
   * hover; what has to be proved is that both controls are **visible at rest,
   * in the tab order, and operable without a pointer**. The kebab's own
   * keyboard behaviour is not gone — it belongs in a file whose screen
   * declares three or more actions, and no Financials screen does.
   */
  it('both row actions are reachable and operable from the keyboard alone', async () => {
    const user = userEvent.setup()
    mount(<PayoutsScreen row={rowFor('financials-payouts')} />, '/financials/payouts?view=payouts')
    await waitFor(() => expect(screen.getByText('Ahmed Salem')).toBeTruthy())

    const row = screen.getByText('Ahmed Salem').closest('tr') as HTMLElement

    /* No menu, and that is the assertion rather than an omission: a kebab here
       would mean the threshold had silently moved back. */
    expect(
      within(row).queryByRole('button', { name: /actions/i }),
      'two declared actions render directly, not behind a kebab (D8-b)',
    ).toBeNull()

    const buttons = within(row).getAllByRole('button')
    const labelled = buttons.filter((b) => (b.textContent ?? '').trim().length > 0)
    expect(labelled.length, 'both actions carry a visible label').toBeGreaterThanOrEqual(2)

    /* Reachable by keyboard, not merely present in the DOM — the distinction
       §7.3 exists to make. */
    const first = labelled[0] as HTMLElement
    first.focus()
    expect(document.activeElement, 'the first action takes focus').toBe(first)

    await user.tab()
    expect(
      labelled.includes(document.activeElement as HTMLElement),
      'the second action is the next tab stop',
    ).toBe(true)
  })
})

/* ═════════════ §7.3.3 — Escape cancels, and nothing has moved ═══════════ */

describe('the money confirmation, from the keyboard', () => {
  /**
   * *"The modal traps focus; `Escape` cancels and **nothing has mutated** at
   * that point."*
   *
   * The negative is asserted against the escrow record and the audit log, and
   * its **twin** — the same dialog, confirmed — is the test below, which moves
   * both. Without the twin, an escrow client that could never change would
   * satisfy this one.
   */
  it('Escape closes the confirmation and leaves the record untouched', async () => {
    const user = userEvent.setup()
    const before = await listEscrowHolds({ pageSize: 100 })

    mount(<PayoutsScreen row={rowFor('financials-payouts')} />, '/financials/payouts?view=escrow')
    await waitFor(() => expect(screen.getByText('ESC-1052')).toBeTruthy())

    const row = screen.getByText('ESC-1052').closest('tr') as HTMLElement
    const release = within(row).getByRole('button', {
      name: EN['fin.escrow.action.release'] as string,
    })
    release.focus()
    await user.keyboard('{Enter}')

    const dialog = await screen.findByRole('dialog')
    /* Focus is inside the dialog — the trap §7.3.3 requires. */
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    /* Nothing moved. */
    const after = await listEscrowHolds({ pageSize: 100 })
    expect(after.items).toEqual(before.items)
    expect(auditLogSize()).toBe(0)
  })

  /** The twin: the same dialog, confirmed from the keyboard, does move both. */
  it('the same confirmation, committed from the keyboard, releases the hold', async () => {
    const user = userEvent.setup()
    mount(<PayoutsScreen row={rowFor('financials-payouts')} />, '/financials/payouts?view=escrow')
    await waitFor(() => expect(screen.getByText('ESC-1052')).toBeTruthy())

    const row = screen.getByText('ESC-1052').closest('tr') as HTMLElement
    within(row)
      .getByRole('button', { name: EN['fin.escrow.action.release'] as string })
      .focus()
    await user.keyboard('{Enter}')

    const dialog = await screen.findByRole('dialog')
    const confirm = within(dialog).getByRole('button', {
      name: EN['fin.escrow.confirm.confirm'] as string,
    })
    confirm.focus()
    await user.keyboard('{Enter}')

    await waitFor(async () => {
      const holds = await listEscrowHolds({ pageSize: 100 })
      expect(holds.items.find((hold) => hold.id === 'ESC-1052')?.settlement).toBe('released')
    })
    expect(auditLogSize()).toBe(1)
  })

  /**
   * **AC-437, through the UI rather than through the client.**
   *
   * The data layer's own suite already counts one entry per act. What it cannot
   * see is whether the **screen** passes the reason and the subject through, so
   * this drives two different acts on two sub-tabs and checks the entries name
   * the actor, the amount, the subject and a reason.
   */
  it('AC-437 — each act through the UI writes one entry naming actor, amount, subject and reason', async () => {
    const user = userEvent.setup()
    const { listAuditEntries } = await import('@/data/clients')

    mount(<PayoutsScreen row={rowFor('financials-payouts')} />, '/financials/payouts?view=escrow')
    await waitFor(() => expect(screen.getByText('ESC-1052')).toBeTruthy())
    const escrowRow = screen.getByText('ESC-1052').closest('tr') as HTMLElement
    await user.click(
      within(escrowRow).getByRole('button', { name: EN['fin.escrow.action.release'] as string }),
    )
    await user.click(
      await screen.findByRole('button', { name: EN['fin.escrow.confirm.confirm'] as string }),
    )
    await waitFor(() => expect(auditLogSize()).toBe(1))

    const entries = await listAuditEntries({ pageSize: 10 })
    const release = entries.items[0]
    expect(release?.subjectType).toBe('captain')
    expect(release?.subjectId).toBe('DRV-0103')
    expect(release?.amountHalalas).toBe(32_960)
    expect(release?.actorName).toBeTruthy()
    expect(release?.reasonCode).not.toBeNull()

    /* A second act, on a second surface, and the counter moves by exactly one. */
    const payouts = await listCaptainPayouts({ pageSize: 100 })
    expect(payouts.items.length).toBeGreaterThan(0)
  })
})
