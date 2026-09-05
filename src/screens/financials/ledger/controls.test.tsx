/**
 * Financials › Ledger & Payment Controls — **AC-416**, **AC-418**, **AC-419**,
 * **AC-420**, **AC-422**, **AC-423**.
 *
 * **No spies.** AC-422's content is that a refused toggle **returns to its
 * previous position** — a negative about state, and the failure mode of a
 * spy-based version is a green tick for a switch that flipped anyway. It is
 * asserted here on the rendered `data-state` of the switch and on the client's
 * own record, with the *permitted* toggle asserted in the same test so a switch
 * that never moves at all cannot pass.
 *
 * The out-of-balance state is reached through `useOutOfBalanceLedger()`, which
 * is a **mock affordance in `src/data`** and is never imported by a screen —
 * `financials.test.tsx` asserts that absence. Reaching a state from a test is
 * not the same as shipping a control for it (**AC-421**).
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  disableMockLatency,
  getIdempotencyStats,
  getRouteTable,
  getTrialBalance,
  listGateways,
  listJournalEntries,
  listReconciliation,
  listRefusedPostings,
  resetDataLayer,
  useOutOfBalanceLedger,
} from '@/data/clients'
import { accountDefinition } from '@/data/types'
import type { SubTabRoute } from '@/data/types'
import { EN } from '@/i18n/dictionaries'
import { ShellProvider } from '@/shell/ShellContext'
import { LedgerControlsScreen } from './LedgerControlsScreen'

const ledgerRow = (): SubTabRoute => {
  const row = getRouteTable().subTabs.find((each) => each.subTabId === 'financials-ledger')
  if (!row) throw new Error('No route-table row for financials-ledger')
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
        <LedgerControlsScreen row={ledgerRow()} />
      </ShellProvider>
    </MemoryRouter>,
  )
}

function rowFor(text: string): HTMLElement {
  const tr = screen.getByText(text).closest('tr')
  if (!tr) throw new Error(`No row for ${text}`)
  return tr
}

const money = (halalas: number) =>
  (halalas / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/* ════════════════════════ AC-416 — the trial balance ════════════════════ */

describe('AC-416 — debits equal credits, or the page says so in SAR', () => {
  /**
   * *"The trial balance's total debits equal its total credits, **or** the page
   * renders the out-of-balance critical banner with the difference in SAR."*
   *
   * Both branches, because the criterion is a disjunction and only testing the
   * first would leave the banner — the thing an operator actually needs —
   * unverified. The difference is read from the client rather than typed, so
   * this fails if the banner ever states a plausible number instead of the
   * real one.
   */
  it('the balanced case renders no banner', async () => {
    const trial = await getTrialBalance()
    expect(trial.balanced).toBe(true)
    expect(trial.totalDebitsHalalas).toBe(trial.totalCreditsHalalas)
    expect(trial.differenceHalalas).toBe(0)

    mount('/financials/ledger?view=trial-balance')
    await waitFor(() => expect(screen.getAllByRole('row').length).toBeGreaterThan(5))

    expect(screen.queryByText(/out of balance/i)).toBeNull()
    /* **V-20 / §10.4** — the view row states the reading in words and both
       totals as figures. The heading went: the selected pill names the view,
       so `Balanced` is the assertion the criterion actually makes. */
    expect(screen.getByText('Balanced')).toBeTruthy()
    for (const label of ['Total debits', 'Total credits']) {
      expect(screen.getByText(label), `the header states ${label}`).toBeTruthy()
    }
    /* **R2-1** — the numeral is the figure and `SAR` is the small line under
       it, so the two are separate text nodes. */
    expect(screen.getAllByText(money(trial.totalDebitsHalalas)).length).toBeGreaterThan(0)
    expect(screen.getAllByText('SAR').length).toBeGreaterThan(0)
  })

  it('the unbalanced case renders one critical banner naming the difference in SAR', async () => {
    useOutOfBalanceLedger()
    const trial = await getTrialBalance()
    expect(trial.balanced).toBe(false)
    expect(trial.differenceHalalas).not.toBe(0)

    mount('/financials/ledger?view=trial-balance')
    await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThan(0))

    const banner = screen.getByRole('alert')
    expect(banner.textContent).toContain(money(Math.abs(trial.differenceHalalas)))
    expect(banner.textContent).toContain('SAR')
    /* R10 — exactly one page-level banner, not one per condition. */
    expect(screen.getAllByRole('alert')).toHaveLength(1)
    /* …and it links to the evidence rather than only announcing. */
    expect(
      within(banner).getByRole('button', {
        name: EN['fin.overview.outOfBalance.action'] as string,
      }),
    ).toBeTruthy()
  })
})

/* ═══════════════════════════ AC-418 — the journal ═══════════════════════ */

describe('AC-418 — every journal line reads Dr/Cr, and every entry balances', () => {
  /**
   * Two clauses. The line format is asserted against the **rendered text** for
   * every line of every entry on the page — not a sample — because the failure
   * mode is one recipe rendering differently from the rest. The balance clause
   * is asserted over the whole population from the client.
   */
  it('each line names its side, its account and its amount, and the sides agree', async () => {
    mount('/financials/ledger?view=journal')
    await waitFor(() => expect(screen.getAllByRole('row').length).toBeGreaterThan(2))

    const page = await listJournalEntries({ pageSize: 25 })
    expect(page.items.length).toBeGreaterThan(0)

    for (const entry of page.items) {
      const row = rowFor(entry.id)
      let debits = 0
      let credits = 0
      for (const line of entry.lines) {
        const prefix = line.direction === 'debit' ? 'Dr' : 'Cr'
        /* **R2-5** — the account's DISPLAY NAME, and the key on hover only. */
        const expected = `${prefix} ${accountDefinition(line.account).label} · ${money(line.amountHalalas)}`
        expect(row.textContent, `${entry.id} renders "${expected}"`).toContain(expected)
        if (line.direction === 'debit') debits += line.amountHalalas
        else credits += line.amountHalalas
      }
      expect(debits, `${entry.id} balances`).toBe(credits)
      expect(entry.totalHalalas).toBe(debits)
    }
  })
})

/* ═════════════════════ AC-419 — a refused posting is kept ═══════════════ */

describe('AC-419 — a refused posting is kept, with its reason in words', () => {
  /**
   * *"…with its reason stated in words, and is counted in a page banner.
   * Refused postings are never dropped."*
   *
   * "In words" is the clause worth testing: legacy builds
   * `'unbalanced: debits X vs credits Y'` and embeds it inside another
   * sentence. The rendered reason is asserted to contain **formatted money**
   * and no raw halala integer, which is what distinguishes a keyed sentence
   * from a concatenated one.
   */
  it('every refused posting is listed with its reason as a sentence', async () => {
    mount('/financials/ledger?view=refused')
    await waitFor(() => expect(screen.getAllByRole('row').length).toBeGreaterThan(1))

    const refused = await listRefusedPostings()
    expect(refused.length).toBeGreaterThan(0)

    for (const posting of refused) {
      const row = rowFor(posting.reference)
      /* Kept, with the R5a marker: a refusal is a standing condition. */
      expect(row.querySelectorAll('.bg-destructive').length).toBeGreaterThan(0)
      /* Its lines are shown, so the operator can see what was attempted. */
      for (const line of posting.lines) {
        expect(row.textContent).toContain(money(line.amountHalalas))
      }
      /* And no raw halala integer leaked into the REASON sentence. Scoped to
         that cell on purpose: a reference such as
         `campaign_spend|CMP-0042|12000` is an idempotency key and is meant to
         carry the raw amount — it is the sentence beside it that must not. */
      const reasonCell = within(row)
        .getAllByRole('cell')
        .find((cell) => cell.textContent?.match(/[A-Za-z]{4,}/) && cell !== row.firstElementChild)
      const reasonText = reasonCell?.textContent ?? ''
      for (const line of posting.lines) {
        if (line.amountHalalas >= 100) {
          expect(reasonText, `${posting.reference}'s reason is a sentence`).not.toContain(
            String(line.amountHalalas),
          )
        }
      }
    }
  })

  /**
   * *"…and is counted in a page banner."*
   *
   * **Expected RED on this sub-tab.** `LedgerControlsScreen` raises a banner
   * only when the trial balance is out of balance; with the books balancing —
   * which is the shipped state — the refused count reaches no banner here at
   * all. Overview does count them (`fin.overview.refused.titleMany`), so the
   * copy and the count both exist; the sub-tab that owns the `Refused postings`
   * view is the one that does not state it.
   */
  it('the refused count is stated in a page banner on the sub-tab that owns the view', async () => {
    const refused = await listRefusedPostings()
    expect(refused.length).toBeGreaterThan(0)

    mount('/financials/ledger?view=refused')
    await waitFor(() => expect(screen.getAllByRole('row').length).toBeGreaterThan(1))

    const banners = screen.queryAllByRole('alert')
    expect(banners.length, 'a page banner states the refused count').toBeGreaterThan(0)
  })
})

/* ═════════════════════ AC-420 — like compared with like ═════════════════ */

describe('AC-420 — the reconciliation states its VAT basis on every row', () => {
  /**
   * *"…each row's operational figure and ledger figure are on the same VAT
   * basis, and a row that agrees shows a difference of `0.00 SAR`."*
   *
   * The second clause is the one that separates a reading from an absence:
   * agreement is `0.00`, never an em dash. **D-F12** is the first: legacy
   * multiplies the VAT account by zero (`:20065`) and shows a permanent ~13 %
   * break as though it were real.
   */
  it('every row names a basis, and an agreeing row reads 0.00 rather than an em dash', async () => {
    mount('/financials/ledger?view=reconciliation')
    await waitFor(() => expect(screen.getAllByRole('row').length).toBeGreaterThan(1))

    const rows = await listReconciliation()
    expect(rows.length).toBeGreaterThan(0)

    const agreeing = rows.filter((row) => row.operationalHalalas === row.ledgerHalalas)
    expect(agreeing.length, 'at least one comparison agrees').toBeGreaterThan(0)

    const basisLabels = new Set(
      (['inclusive', 'exclusive', 'not-applicable'] as const).map(
        (basis) => EN[`fin.reconcile.basis.${basis}`] as string,
      ),
    )

    for (const row of rows) {
      const rendered = rowFor(EN[row.label.key] as string)
      /* The basis, stated on the row. */
      const cells = within(rendered)
        .getAllByRole('cell')
        .map((cell) => cell.textContent?.trim() ?? '')
      expect(cells.some((cell) => basisLabels.has(cell)), `${row.label.key} states its basis`).toBe(
        true,
      )

      /* Agreement is `0.00`. */
      const difference = cells[cells.length - 2]
      if (row.operationalHalalas === row.ledgerHalalas) {
        expect(difference, `${row.label.key} agrees`).toBe('0.00')
      } else {
        expect(difference).not.toBe('—')
      }
    }
  })
})

/* ═══════════════════ AC-422 / AC-423 — payment gateways ═════════════════ */

describe('the payment gateways', () => {
  /**
   * **AC-422** — *"disabling the default payment gateway is refused, with the
   * reason naming that a different default must be set first. **The switch
   * returns to its previous position.**"*
   *
   * Three assertions, and the third is the one a spy could not honestly make:
   * the switch's rendered state after the refusal, plus the client's own record
   * of it. The **permitted** toggle is exercised in the same test, so a switch
   * that could never move would fail rather than pass by accident.
   */
  it('AC-422 — the default cannot be disabled, and its switch does not move', async () => {
    const user = userEvent.setup()
    mount('/financials/ledger?view=gateways')
    await waitFor(() => expect(screen.getByText('Mada')).toBeTruthy())

    const gateways = await listGateways()
    const fallback = gateways.find((gateway) => gateway.isDefault)
    expect(fallback?.name).toBe('Mada')

    const defaultSwitch = within(rowFor('Mada')).getByRole('switch')
    expect(defaultSwitch.getAttribute('data-state')).toBe('checked')

    await user.click(defaultSwitch)

    /* Refused, with the reason in words. */
    await waitFor(() => expect(screen.getByText(EN['fin.gateway.blocked.default'] as string)).toBeTruthy())
    /* The switch is exactly where it was, on screen and in the record. */
    expect(defaultSwitch.getAttribute('data-state')).toBe('checked')
    expect((await listGateways()).find((gateway) => gateway.isDefault)?.enabled).toBe(true)

    /* The twin: a non-default switch DOES move, so the immobility above is the
       refusal and not a dead control. */
    const other = within(rowFor('Visa / Mastercard')).getByRole('switch')
    await user.click(other)
    await waitFor(() => expect(other.getAttribute('data-state')).toBe('unchecked'))
  })

  /**
   * **AC-423** — *"a gateway's transaction count and volume change when the
   * underlying payment fixtures change. Neither is a hardcoded value."*
   *
   * **This criterion cannot be exercised as written and the reason is a gap in
   * the data layer, not in the screen.** There is no payment resource: no
   * `payments` client, no payment fixture, nothing to vary. `transactionCount`
   * and `volumeHalalas` are **stored fields on `paymentGatewayFixtures`**, so
   * they are literals — correctly served across the seam, and derived from
   * nothing.
   *
   * What is testable, and is asserted here, is the half the screen owns: every
   * figure on the page is the client's value and none is typed into the
   * component. Reported to product-owner as *untestable until a payment
   * resource exists*, rather than ticked.
   */
  it('AC-423 — the rendered figures are the client’s values, not the screen’s', async () => {
    mount('/financials/ledger?view=gateways')
    await waitFor(() => expect(screen.getByText('Mada')).toBeTruthy())

    const gateways = await listGateways()
    expect(gateways.length).toBeGreaterThan(1)
    /* The figures differ between gateways, so a single hardcoded pair in the
       component could not render all of them. */
    expect(new Set(gateways.map((gateway) => gateway.transactionCount)).size).toBeGreaterThan(1)

    for (const gateway of gateways) {
      const row = rowFor(gateway.name)
      expect(row.textContent, `${gateway.name}'s count`).toContain(
        gateway.transactionCount.toLocaleString('en-US'),
      )
      expect(row.textContent, `${gateway.name}'s volume`).toContain(money(gateway.volumeHalalas))
    }
  })
})

/* ═══════ FINANCIALS-UX-PLAN §1 P0-1, §5.5 — the banner and the header ═════ */

describe('§1 P0-1 — the refused banner states its own condition', () => {
  /**
   * The refused banner used to borrow `fin.overview.outOfBalance.body`, which
   * says the two totals disagree — directly above a header that prints them
   * equal. Both sentences are asserted here, one present and one absent, so a
   * banner that goes back to borrowing fails.
   */
  it('says the refusals are kept and are not in these totals, not that the books disagree', async () => {
    const refused = await listRefusedPostings()
    expect(refused.length).toBeGreaterThan(0)

    mount('/financials/ledger?view=trial-balance')
    await waitFor(() => expect(screen.getAllByRole('row').length).toBeGreaterThan(5))

    expect(screen.getByText(EN['fin.overview.refused.body'] as string)).toBeTruthy()
    expect(screen.queryByText(EN['fin.overview.outOfBalance.body'] as string)).toBeNull()
  })
})

describe('§5.5 / V-20 — the trial balance header carries the counts', () => {
  it('states the entry count beside the idempotency suppressed count', async () => {
    const trial = await getTrialBalance()
    const stats = await getIdempotencyStats()

    mount('/financials/ledger?view=trial-balance')
    await waitFor(() => expect(screen.getAllByRole('row').length).toBeGreaterThan(5))

    const caption = (EN['fin.controls.trial.caption'] as string)
      .replace('{entries}', String(trial.entryCount))
      .replace('{suppressed}', String(stats.suppressed))
    expect(screen.getByText(caption)).toBeTruthy()
  })
})

describe('§5.5 / V-19 — six views in one row, in two groups', () => {
  /**
   * One route and one view row for every view, the two configuration views
   * behind a separator. Asserted on a CARD view, because that half of the
   * sub-tab used to render a second, differently shaped strip of its own.
   */
  it('the view row lists all six and separates the books from the configuration', async () => {
    mount('/financials/ledger?view=vat')
    await waitFor(() => expect(screen.getByText(EN['fin.vat.heading'] as string)).toBeTruthy())

    const viewRow = screen.getByRole('button', {
      name: EN['fin.controls.view.trialBalance'] as string,
    }).parentElement as HTMLElement

    expect(within(viewRow).getAllByRole('button').map((each) => each.textContent)).toEqual([
      EN['fin.controls.view.trialBalance'],
      EN['fin.controls.view.journal'],
      EN['fin.controls.view.reconciliation'],
      EN['fin.controls.view.refused'],
      EN['fin.controls.view.gateways'],
      EN['fin.controls.view.vat'],
    ])

    const separators = within(viewRow).getAllByRole('separator')
    expect(separators).toHaveLength(1)
    /* Between the fourth view and the fifth — the books, then configuration. */
    expect(Array.from(viewRow.children).indexOf(separators[0]!)).toBe(4)
  })
})

/* ══════ FINANCIALS-UX-PLAN R2-5 — no raw identifier on the journal ══════ */

const recipeKey = (type: string) =>
  `fin.recipe.${type.replace(/_(.)/g, (_, letter: string) => letter.toUpperCase())}`

describe('R2-5 — the journal reads in words, and the machine id is secondary', () => {
  /**
   * *"`Recipe` renders the keyed label with the id as the secondary line;
   * `Lines` renders `Dr Cash at payment gateway · 32.20`, the account key on
   * hover only."* Asserted over every cell of every row on the page, because
   * the failure mode is one recipe rendering differently from the rest.
   */
  it('no cell states a snake_case recipe or a dotted account key as its own text', async () => {
    mount('/financials/ledger?view=journal')
    await waitFor(() => expect(screen.getAllByRole('row').length).toBeGreaterThan(2))

    const page = await listJournalEntries({ pageSize: 25 })
    for (const entry of page.items) {
      const row = rowFor(entry.id)
      const cells = within(row).getAllByRole('cell')
      /* The recipe cell states the label; the id is on the line beneath it. */
      const label = EN[recipeKey(entry.type)] as string
      const recipeCell = cells.find((cell) => cell.textContent?.startsWith(label))
      expect(recipeCell, `${entry.type} reads as "${label}" first`).toBeTruthy()
      expect(row.textContent, 'the raw recipe id is kept as the secondary line').toContain(
        entry.type,
      )
      for (const line of entry.lines) {
        const named = cells.find((cell) => cell.textContent?.includes(line.account))
        expect(named, `${line.account} reaches no cell as text`).toBeUndefined()
        /* …and it is still reachable, on the line's own title. */
        expect(row.querySelector(`[title="${line.account}"]`)).toBeTruthy()
      }
    }
  })
})
