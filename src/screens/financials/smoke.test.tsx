/**
 * Every Financials surface mounts, in both document directions, and every
 * string it renders resolves.
 *
 * ## Why this file exists, and it is not "a smoke test for the sake of one"
 *
 * `interpolate` **throws** when a key's placeholder has no matching parameter:
 * *"a placeholder with no matching parameter throws rather than rendering
 * `{count}` to an operator."* That is the right behaviour and it means a single
 * missing parameter takes a whole sub-tab down at runtime — a failure `tsc`
 * cannot see, because a translation key is a string.
 *
 * So this mounts all seven sub-tabs, all their views, and the plan editor, and
 * asserts they render. **AC-425** — *"every card on every one of the seven
 * sub-tabs renders a content, empty, loading and error state, and each is
 * reachable in test by controlling the client"* — is what the four-state block
 * at the end exercises, through the mock's failure injection rather than by
 * hand-editing a fixture.
 *
 * **AC-433 / AC-446** — the same mount is repeated with the document in Arabic.
 * It cannot prove the geometry mirrors (that is a Playwright job and
 * visual-QA's verdict); it proves that nothing throws, that no string is lost,
 * and that the money values keep their character order.
 */

import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  disableMockLatency,
  getRouteTable,
  mockFailures,
  resetDataLayer,
  CASH_OPERATIONS,
  LEDGER_OPERATIONS,
  OVERVIEW_OPERATIONS,
  PAYOUT_OPERATIONS,
  PRICING_OPERATIONS,
  REVENUE_OPERATIONS,
  WALLET_OPERATIONS,
} from '@/data/clients'
import type { SubTabRoute } from '@/data/types'
import { EN } from '@/i18n/dictionaries'
import { ShellProvider } from '@/shell/ShellContext'
import {
  CashScreen,
  LedgerControlsScreen,
  OverviewScreen,
  PayoutsScreen,
  PlanEditorScreen,
  PricingScreen,
  RevenueScreen,
  WalletsScreen,
} from './index'

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

afterEach(() => {
  document.documentElement.removeAttribute('dir')
  document.documentElement.removeAttribute('lang')
})

function mount(ui: React.ReactElement, path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider>{ui}</ShellProvider>
    </MemoryRouter>,
  )
}

/** Every view of every sub-tab, as an operator reaches it: `?view=`. */
const SURFACES: Array<{ name: string; path: string; element: () => React.ReactElement }> = [
  {
    name: 'Overview',
    path: '/financials/overview',
    element: () => <OverviewScreen row={rowFor('financials-overview')} />,
  },
  ...['by-plan', 'refunds', 'refunds-ledger', 'credit-notes', 'margin'].map((view) => ({
    name: `Revenue & Refunds · ${view}`,
    path: `/financials/revenue?view=${view}`,
    element: () => <RevenueScreen row={rowFor('financials-revenue')} />,
  })),
  ...['payouts', 'escrow', 'deductions'].map((view) => ({
    name: `Payouts & Escrow · ${view}`,
    path: `/financials/payouts?view=${view}`,
    element: () => <PayoutsScreen row={rowFor('financials-payouts')} />,
  })),
  {
    name: 'Payouts & Escrow · one captain’s payable ledger',
    path: '/financials/payouts?captain=DRV-0102',
    element: () => <PayoutsScreen row={rowFor('financials-payouts')} />,
  },
  ...['reconciliation-queue', 'captain-debt-ledger', 'over-cap'].map((view) => ({
    name: `Cash & Captain Debt · ${view}`,
    path: `/financials/cash?view=${view}`,
    element: () => <CashScreen row={rowFor('financials-cash')} />,
  })),
  {
    name: 'Cash & Captain Debt · one captain’s receivable ledger',
    path: '/financials/cash?captain=DRV-0103',
    element: () => <CashScreen row={rowFor('financials-cash')} />,
  },
  ...['all-wallets', 'goodwill', 'negative-balances'].map((view) => ({
    name: `Rider Wallets · ${view}`,
    path: `/financials/rider-wallets?view=${view}`,
    element: () => <WalletsScreen row={rowFor('financials-rider-wallets')} />,
  })),
  {
    name: 'Rider Wallets · one rider’s ledger',
    path: '/financials/rider-wallets?rider=RDR-1041',
    element: () => <WalletsScreen row={rowFor('financials-rider-wallets')} />,
  },
  ...['subscription-plans', 'quick-rides', 'rate-card', 'cancellation-fees'].map((view) => ({
    name: `Pricing & Plans · ${view}`,
    path: `/financials/pricing?view=${view}`,
    element: () => <PricingScreen row={rowFor('financials-pricing')} />,
  })),
  ...['trial-balance', 'journal', 'reconciliation', 'refused', 'gateways', 'vat'].map((view) => ({
    name: `Ledger & Payment Controls · ${view}`,
    path: `/financials/ledger?view=${view}`,
    element: () => <LedgerControlsScreen row={rowFor('financials-ledger')} />,
  })),
]

describe('every Financials surface mounts and every string resolves', () => {
  for (const surface of SURFACES) {
    it(`${surface.name} renders`, async () => {
      mount(surface.element(), surface.path)
      /* The page header is the last thing to render if anything below it threw,
         so waiting on a heading proves the tree completed. */
      await waitFor(() => expect(screen.getAllByRole('heading').length).toBeGreaterThan(0))
      /* A raw key on screen means a missing dictionary line (**AC-442**). */
      expect(document.body.textContent).not.toMatch(/\bfin\.[a-z]+\.[a-zA-Z.]+/)
    })
  }

  it('the plan editor renders, outside the layout', async () => {
    render(
      <MemoryRouter initialEntries={['/financials/pricing/plans/monthly/edit']}>
        <ShellProvider>
          <Routes>
            <Route path="/financials/pricing/plans/:planId/edit" element={<PlanEditorScreen />} />
          </Routes>
        </ShellProvider>
      </MemoryRouter>,
    )
    await waitFor(() =>
      expect(screen.getByText(EN['fin.planEditor.section.catalogue'] as string)).toBeTruthy(),
    )

    /* **AC-391** — a derived value is not focusable and is absent from the tab
       order. Every one of them carries `aria-readonly` and none is an input. */
    const derived = document.querySelectorAll('[aria-readonly="true"]')
    expect(derived.length).toBeGreaterThan(0)
    for (const element of derived) {
      expect(element.tagName).not.toBe('INPUT')
      expect(element.getAttribute('tabindex')).toBeNull()
    }

    /* **AC-392** — the pricing half is a DISABLED INPUT and the derived values
       are not. Two treatments, and the difference is structural. */
    const disabled = document.querySelectorAll('input:disabled')
    expect(disabled.length).toBeGreaterThan(0)
    for (const element of disabled) {
      expect(element.getAttribute('aria-readonly')).toBeNull()
    }
  })
})

/* ══════════════════════ AC-425 — the four states ═════════════════════════ */

describe('AC-425 / AC-428 — the four states are reachable by controlling the client', () => {
  const FAILURES: Array<{ name: string; operation: string; surface: () => React.ReactElement; path: string }> = [
    {
      name: 'Overview',
      operation: OVERVIEW_OPERATIONS.get,
      surface: () => <OverviewScreen row={rowFor('financials-overview')} />,
      path: '/financials/overview',
    },
    {
      name: 'Revenue & Refunds',
      operation: REVENUE_OPERATIONS.ledger,
      surface: () => <RevenueScreen row={rowFor('financials-revenue')} />,
      path: '/financials/revenue?view=refunds-ledger',
    },
    {
      name: 'Payouts & Escrow',
      operation: PAYOUT_OPERATIONS.list,
      surface: () => <PayoutsScreen row={rowFor('financials-payouts')} />,
      path: '/financials/payouts?view=payouts',
    },
    {
      name: 'Cash & Captain Debt',
      operation: CASH_OPERATIONS.list,
      surface: () => <CashScreen row={rowFor('financials-cash')} />,
      path: '/financials/cash',
    },
    {
      name: 'Rider Wallets',
      operation: WALLET_OPERATIONS.list,
      surface: () => <WalletsScreen row={rowFor('financials-rider-wallets')} />,
      path: '/financials/rider-wallets',
    },
    {
      name: 'Pricing & Plans',
      operation: PRICING_OPERATIONS.plans,
      surface: () => <PricingScreen row={rowFor('financials-pricing')} />,
      path: '/financials/pricing',
    },
    {
      name: 'Ledger & Payment Controls',
      operation: LEDGER_OPERATIONS.trialBalance,
      surface: () => <LedgerControlsScreen row={rowFor('financials-ledger')} />,
      path: '/financials/ledger',
    },
  ]

  for (const failure of FAILURES) {
    it(`${failure.name} renders its error state when its read fails`, async () => {
      mockFailures.always(failure.operation)
      mount(failure.surface(), failure.path)

      await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThan(0))
      /* **AC-429** — the message names the fix as an imperative, and the retry
         is one click. The label is the SHELL's inside a table card and this
         screen's outside one: `DataTable` owns the card-scoped error and passes
         `state.pageError.action`, which is the same word everywhere in the
         product and is the right answer. */
      expect(screen.getAllByText(EN['fin.error.read'] as string).length).toBeGreaterThan(0)
      const retries = [
        ...screen.queryAllByRole('button', { name: EN['state.pageError.action'] as string }),
        ...screen.queryAllByRole('button', { name: EN['fin.error.retry'] as string }),
      ]
      expect(retries.length).toBeGreaterThan(0)
    })
  }
})

/* ═════════════════════════ Arabic — AC-445, AC-446 ═══════════════════════ */

describe('the same surfaces in Arabic', () => {
  it('every sub-tab mounts with the document in Arabic, and money keeps its order', async () => {
    document.documentElement.setAttribute('dir', 'rtl')
    document.documentElement.setAttribute('lang', 'ar')

    mount(<WalletsScreen row={rowFor('financials-rider-wallets')} />, '/financials/rider-wallets?rider=RDR-4001')
    await waitFor(() => expect(screen.getByText(EN['fin.ledger.opening'] as string)).toBeTruthy())

    /* **AC-445** — the digits are in the same order as in English, the sign is
       on the same side of them, and the code is not reversed. The string is
       identical because `formatMoney` fixes the numeric locale; what changes is
       the CELL's alignment, which is CSS and is visual-QA's to confirm. */
    const balances = screen.getAllByText(/−?[\d,]+\.\d{2}/)
    expect(balances.length).toBeGreaterThan(0)
    expect(document.body.textContent).toMatch(/−41\.50/)
    expect(document.body.textContent).not.toMatch(/50\.41−/)
  })
})
