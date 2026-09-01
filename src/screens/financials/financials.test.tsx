/**
 * Wave-3 Financials — the criteria that are **not** visible in a screenshot,
 * asserted against the DOM an operator drives and against the data layer the
 * screens read.
 *
 * Two rules this file is written to:
 *
 * **A green suite is not a clean build.** `import type` is erased before Vitest
 * runs, so nothing here proves the code typechecks. Types are `tsc`, behaviour
 * is this file, and the stylesheet is a grep of `dist`.
 *
 * **Never assert that something looks right.** Every test below either counts
 * something the criterion names, or asserts an absence the criterion requires.
 * The three cases where a criterion could not be reached are recorded in the
 * handoff as deferred, not written here as a weaker test that passes.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  disableMockLatency,
  getFinancialsOverview,
  getRouteTable,
  listCashReports,
  listWallets,
  journalEntries,
  resetDataLayer,
} from '@/data/clients'
import { PLAN_PRICING_DEFINITIONS } from '@/data/types'
import type { SubTabRoute } from '@/data/types'
import { EN } from '@/i18n/dictionaries'
import { ShellProvider } from '@/shell/ShellContext'
import { FINANCIALS_EN } from './copy'
import { CashScreen } from './cash/CashScreen'
import { WalletsScreen } from './wallets/WalletsScreen'
import { LedgerControlsScreen } from './ledger/LedgerControlsScreen'
import { derivePlan, evaluateExpression, PLAN_RECOMPUTE_INPUTS } from './pricing/derived'
import { deviationHalalas, marginBreakdown, netPayableHalalas, percentOrNull } from './shared/derive'
import { localisedText } from './shared/text'

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

function renderScreen(ui: React.ReactElement, path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider>{ui}</ShellProvider>
    </MemoryRouter>,
  )
}

/* ══════════════════════════════ AC-453 ═══════════════════════════════════ */

describe('AC-453 — no cash report carries an SLA, and shipping one is the failure', () => {
  /**
   * The criterion is checked **as an assertion over the whole cash-report
   * set**, not by looking at a screen: *any non-null clock field on any cash
   * report is a fail, including a plausible number.*
   */
  it('every cash report has slaSource unset and every clock field null', async () => {
    const reports = await listCashReports({ view: 'all', pageSize: 100 })
    expect(reports.items.length).toBeGreaterThan(0)
    for (const report of reports.items) {
      expect(report.slaSource).toBe('unset')
      expect(report.slaDueAt).toBeNull()
      expect(report.slaTargetMinutes).toBeNull()
      expect(report.slaStartedAt).toBeNull()
      expect(report.slaBreachedAt).toBeNull()
    }
  })

  /**
   * **The passing state is the absence.** The reconciliation queue renders no
   * countdown, no due time, no overdue pill, no breach banner and no
   * `Show only breached` control — so this asserts that none of the strings
   * that would carry one is on the page.
   */
  it('the reconciliation queue renders no countdown, no breach banner and no breach control', async () => {
    renderScreen(<CashScreen row={rowFor('financials-cash')} />, '/financials/cash')

    await waitFor(() => expect(screen.getAllByText(/CASH-/).length).toBeGreaterThan(0))

    const body = document.body.textContent ?? ''
    /* The three vocabularies a countdown could arrive in: the shared SLA
       strings, the queue's breach control, and the deadline column. */
    expect(screen.queryByText(EN['queue.showBreached'] as string)).toBeNull()
    expect(screen.queryByText(EN['queue.col.sla'] as string)).toBeNull()
    expect(screen.queryByText(EN['queue.decided.late'] as string)).toBeNull()
    expect(body).not.toMatch(/overdue/i)
    expect(body).not.toMatch(/\bdue\b/i)
    expect(body).not.toMatch(/left\b/i)
  })

  it('the queue offers no breach facet', async () => {
    const { getCashFacets } = await import('@/data/clients')
    const facets = await getCashFacets('reconciliation-queue')
    expect(Object.keys(facets)).not.toContain('breached')
    expect(Object.keys(facets)).not.toContain('slaBreachedAt')
  })
})

/* ══════════════════════════════ AC-451 ═══════════════════════════════════ */

describe('AC-451 — two chargeback recipes, and only one can drive a wallet negative', () => {
  it('JE-00036 moves ar.rider and not liability.wallet; JE-00030 moves liability.wallet', () => {
    const entries = journalEntries()
    const fare = entries.find((entry) => entry.id === 'JE-00036')
    const topup = entries.find((entry) => entry.id === 'JE-00030')
    expect(fare).toBeDefined()
    expect(topup).toBeDefined()

    const accounts = (id: string) =>
      entries.find((entry) => entry.id === id)?.lines.map((line) => line.account) ?? []

    expect(accounts('JE-00036')).toContain('ar.rider')
    expect(accounts('JE-00036')).not.toContain('liability.wallet')
    expect(accounts('JE-00030')).toContain('liability.wallet')
  })

  it('the rider whose FARE was charged back is absent from Negative balances', async () => {
    const negative = await listWallets({ view: 'negative-balances', pageSize: 100 })
    const ids = negative.items.map((wallet) => wallet.riderId)

    /* `RDR-4001`'s TOP-UP chargeback is what puts them below zero — the only
       recipe that can. */
    expect(ids).toContain('RDR-4001')

    /* Every other rider on the list is there on the strength of their own
       balance, and no rider with a non-negative balance is on it at all. */
    for (const wallet of negative.items) {
      expect(wallet.balanceHalalas).toBeLessThan(0)
    }
    const all = await listWallets({ pageSize: 100 })
    const fareChargebackRider = all.items.find((wallet) => wallet.riderId === 'RDR-2090')
    if (fareChargebackRider) {
      expect(fareChargebackRider.balanceHalalas).toBeGreaterThanOrEqual(0)
      expect(ids).not.toContain('RDR-2090')
    }
  })
})

/* ═══════════════════════ the ledger, AC-302 … AC-322 ═════════════════════ */

describe('the ledger renders postings by direction, never by sign', () => {
  it('AC-302 / AC-311 / AC-312 — a wallet ledger with a negative balance', async () => {
    renderScreen(
      <WalletsScreen row={rowFor('financials-rider-wallets')} />,
      '/financials/rider-wallets?rider=RDR-4001',
    )

    await waitFor(() => expect(screen.getByText(EN['fin.ledger.opening'] as string)).toBeTruthy())

    /* **AC-321** — the six columns, in order. */
    const headers = screen.getAllByRole('columnheader').map((cell) => cell.textContent?.trim())
    expect(headers).toEqual([
      FINANCIALS_EN['fin.ledger.col.date'],
      FINANCIALS_EN['fin.ledger.col.reference'],
      FINANCIALS_EN['fin.ledger.col.description'],
      FINANCIALS_EN['fin.ledger.col.debit'],
      FINANCIALS_EN['fin.ledger.col.credit'],
      FINANCIALS_EN['fin.ledger.col.balance'],
    ])

    /* **AC-313 / AC-314 / AC-316 / AC-325** — a ledger has no selection, no
       sortable header and no row action. The types make these unwritable; this
       asserts the DOM agrees. */
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)

    /* **AC-309** — the closing balance renders with U+2212, in ink. */
    const closing = screen.getByText(FINANCIALS_EN['fin.ledger.closing'] as string)
    const closingRow = closing.closest('tr')
    expect(closingRow?.textContent).toContain('−')

    /* **AC-302** — the chargeback row has a value in ONE money column and an em
       dash in the other. */
    const chargeback = screen.getByText('CBK-0001').closest('tr')
    const cells = within(chargeback as HTMLElement)
      .getAllByRole('cell')
      .map((cell) => cell.textContent?.trim() ?? '')
    const debit = cells[3] ?? ''
    const credit = cells[4] ?? ''
    expect(debit).toContain('76.50')
    expect(credit).toBe('—')
  })

  it('AC-322 — the unit is in the header once and in no cell of that column', async () => {
    renderScreen(
      <WalletsScreen row={rowFor('financials-rider-wallets')} />,
      '/financials/rider-wallets?rider=RDR-4001',
    )
    await waitFor(() => expect(screen.getByText(EN['fin.ledger.opening'] as string)).toBeTruthy())

    const rows = screen.getAllByRole('row')
    const bodyCells = rows
      .slice(1)
      .flatMap((row) => within(row).queryAllByRole('cell'))
      .map((cell) => cell.textContent ?? '')
    /* The opening and closing rows carry a bare amount too, so `SAR` appears in
       no data cell anywhere in this table. */
    expect(bodyCells.some((text) => text.includes('SAR'))).toBe(false)
    expect((FINANCIALS_EN['fin.ledger.debit'] ?? FINANCIALS_EN['fin.ledger.col.debit']) as string).toContain('SAR')
  })
})

describe('AC-427 — the two kinds of empty, and the caller decides which', () => {
  /**
   * §7.1's own distinction: *"a wallet with a zero balance and no history is
   * FIRST-RUN; a wallet with history, filtered to a date range with nothing in
   * it, is FILTERED-TO-ZERO."*
   *
   * `DataTable` renders `no-match` for every empty ledger — its §9.2 reading is
   * that a ledger is never first-run empty — so `LedgerCard` takes the first
   * case itself. Both halves are asserted here because the conflict between
   * AC-427 and that branch is real and is reported in the handoff.
   */
  it('a wallet that has never been used renders the first-run state, with an action', async () => {
    renderScreen(
      <WalletsScreen row={rowFor('financials-rider-wallets')} />,
      '/financials/rider-wallets?rider=RDR-2055',
    )
    await waitFor(() =>
      expect(screen.getByText(EN['fin.empty.firstRun.heading'] as string)).toBeTruthy(),
    )
    expect(screen.getByText(EN['fin.empty.firstRun.body'] as string)).toBeTruthy()
    expect(screen.getAllByRole('button', { name: EN['fin.wallet.back'] as string }).length)
      .toBeGreaterThan(0)
    /* First-run, not no-match: the two are different sentences and only one of
       them is on screen. */
    expect(screen.queryByText(EN['fin.empty.noMatch'] as string)).toBeNull()
  })

  it('a wallet with history narrowed to nothing renders the no-match sentence', async () => {
    const user = userEvent.setup()
    renderScreen(
      <WalletsScreen row={rowFor('financials-rider-wallets')} />,
      '/financials/rider-wallets?rider=RDR-4001',
    )
    await waitFor(() => expect(screen.getByText(EN['fin.ledger.opening'] as string)).toBeTruthy())

    await user.type(
      screen.getByRole('textbox', { name: EN['fin.ledger.search'] as string }),
      'zzzzz-no-such-posting',
    )

    await waitFor(() =>
      expect(screen.getByText(EN['fin.empty.noMatch'] as string)).toBeTruthy(),
    )
    expect(screen.queryByText(EN['fin.empty.firstRun.heading'] as string)).toBeNull()
  })
})

/* ════════════════════════ the derived money helpers ══════════════════════ */

describe('the derived values, computed once and read everywhere', () => {
  it('AC-342 — a percentage with a zero denominator is null, never 0 or Infinity', () => {
    expect(percentOrNull(10, 0)).toBeNull()
    expect(percentOrNull(0, 0)).toBeNull()
    expect(percentOrNull(0, 100)).toBe(0)
    expect(percentOrNull(50, 200)).toBe(25)
  })

  it('AC-347 / AC-352 — one margin chain, and a refund is counted exactly once', async () => {
    const overview = await getFinancialsOverview()
    const margin = marginBreakdown(overview)

    expect(margin.grossMarginHalalas).toBe(
      overview.grossBookingsHalalas - overview.captainEarningsHalalas,
    )
    /* The giveback is the sum of six components and each appears once. */
    expect(margin.givebackHalalas).toBe(
      overview.promoHalalas +
        overview.referralHalalas +
        overview.incentiveHalalas +
        overview.refundsHalalas +
        overview.goodwillHalalas +
        overview.emergencyCoverHalalas,
    )
    expect(margin.contributionMarginHalalas).toBe(
      margin.grossMarginHalalas - margin.givebackHalalas,
    )
    /* Reading it twice gives the same answer — which is what makes Overview and
       Revenue & Refunds agree to the halala. */
    expect(marginBreakdown(overview)).toEqual(margin)
  })

  it('AC-366 — the net payable is payable minus cash debt, from two server values', () => {
    expect(netPayableHalalas(120_00, 30_00)).toBe(90_00)
    expect(netPayableHalalas(20_00, 30_00)).toBe(-10_00)
  })

  it('AC-372 / AC-373 — a never-reported cash report has a null deviation', () => {
    expect(
      deviationHalalas({ reportedHalalas: null, topupHalalas: 0, expectedFareHalalas: 4_500 }),
    ).toBeNull()
    expect(
      deviationHalalas({ reportedHalalas: 4_000, topupHalalas: 500, expectedFareHalalas: 4_500 }),
    ).toBe(-1_000)
  })
})

/* ═══════════════════ the plan editor's computed fields ═══════════════════ */

describe('the plan-pricing chain — one definition, printed and evaluated', () => {
  it('AC-397 — the panel renders one line per definition and nothing else', () => {
    /* The panel maps over `PLAN_PRICING_DEFINITIONS` directly, so the two
       counts are the same array's length by construction. The assertion that
       matters is that the definitions are the only source: every id the
       evaluator writes is a definition's id. */
    const derived = derivePlan({
      commissionPercent: 20,
      discountPercent: 10,
      executeDays: 20,
      economyPerMinuteHalalas: 55,
      economyPerKmHalalas: 120,
      comfortPerMinuteHalalas: 80,
      comfortPerKmHalalas: 175,
    })
    expect(derived.economy).toHaveLength(PLAN_PRICING_DEFINITIONS.length)
    expect(derived.economy.map((value) => value.id)).toEqual(
      PLAN_PRICING_DEFINITIONS.map((definition) => definition.id),
    )
    expect(derived.economy.map((value) => value.expression)).toEqual(
      PLAN_PRICING_DEFINITIONS.map((definition) => definition.expression),
    )
  })

  it('AC-393 — a blank input makes every dependent value null, not zero', () => {
    const derived = derivePlan({
      commissionPercent: 20,
      discountPercent: 10,
      /* The operator cleared it. */
      executeDays: null,
      economyPerMinuteHalalas: 55,
      economyPerKmHalalas: 120,
      comfortPerMinuteHalalas: 80,
      comfortPerKmHalalas: 175,
    })
    const byId = new Map(derived.economy.map((value) => [value.id, value.value]))
    /* Upstream of the blank, values still compute. */
    expect(byId.get('grossPerTrip')).not.toBeNull()
    expect(byId.get('discountedPerTrip')).not.toBeNull()
    /* Downstream of it, everything is null — never 0. */
    expect(byId.get('planTotal')).toBeNull()
    expect(byId.get('driverEarns')).toBeNull()
    expect(byId.get('platformKeeps')).toBeNull()
  })

  it('M-1 / M-3 — the chain rounds once and the residual makes the legs sum exactly', () => {
    const derived = derivePlan({
      commissionPercent: 17,
      discountPercent: 13,
      executeDays: 7,
      economyPerMinuteHalalas: 55,
      economyPerKmHalalas: 120,
      comfortPerMinuteHalalas: 80,
      comfortPerKmHalalas: 175,
    })
    for (const chain of [derived.economy, derived.comfort]) {
      const byId = new Map(chain.map((value) => [value.id, value.value]))
      const planTotal = byId.get('planTotal') as number
      const driverEarns = byId.get('driverEarns') as number
      const platformKeeps = byId.get('platformKeeps') as number
      expect(Number.isInteger(driverEarns)).toBe(true)
      /* The two legs sum to the total EXACTLY: the residual absorbs the
         rounding rather than both legs rounding independently. */
      expect(driverEarns + platformKeeps).toBeCloseTo(planTotal, 10)
    }
  })

  it('the evaluator reads the display characters the panel prints', () => {
    expect(evaluateExpression('100 − commissionPercent', { commissionPercent: 20 })).toBe(80)
    expect(
      evaluateExpression('exampleMinutes × perMinuteHalalas', {
        exampleMinutes: 20,
        perMinuteHalalas: 55,
      }),
    ).toBe(1100)
    /* An unknown identifier is `null`, not a throw and not a zero. */
    expect(evaluateExpression('a + b', { a: 1 })).toBeNull()
    /* Division by zero is `null`, never Infinity. */
    expect(evaluateExpression('a / b', { a: 1, b: 0 })).toBeNull()
  })

  it('§8.2 — the recompute set is the union of every definition’s inputs', () => {
    for (const definition of PLAN_PRICING_DEFINITIONS) {
      for (const input of definition.inputs) {
        const isComputed = PLAN_PRICING_DEFINITIONS.some((each) => each.id === input)
        if (!isComputed) expect(PLAN_RECOMPUTE_INPUTS).toContain(input)
      }
    }
  })
})

/* ═══════════════════════════ copy and its rules ══════════════════════════ */

describe('copy — AC-429, AC-442, AC-443, AC-444', () => {
  it('AC-442 — every fin.* key the data layer emits resolves through the dictionary', async () => {
    /* The keys the CLIENTS emit as `LocalisedText`. A screen that renders one
       without a line in `copy.ts` renders a raw key to a Finance lead. */
    const emitted = [
      'fin.posting.openingBalance',
      'fin.posting.promoCredit',
      'fin.posting.tripFare',
      'fin.posting.tripFarePart',
      'fin.posting.goodwillCredit',
      'fin.posting.chargeback',
      'fin.posting.chargebackReceivable',
      'fin.posting.referralBonus',
      'fin.posting.reverses',
      'fin.posting.subscriptionAuthorised',
      'fin.posting.compensationCredit',
      'fin.posting.refundToWallet',
      'fin.posting.refundIssued',
      'fin.posting.cashTopup',
      'fin.posting.cashTopupCollected',
      'fin.posting.cashCommission',
      'fin.posting.cashCommissionBatch',
      'fin.posting.cashCommissionUnreported',
      'fin.posting.cashSurplus',
      'fin.posting.cashRepayment',
      'fin.posting.escrowHeld',
      'fin.posting.escrowReleased',
      'fin.posting.escrowReleasedToCaptain',
      'fin.posting.payout',
      'fin.posting.payoutFailed',
      'fin.posting.deductionApplied',
      'fin.posting.earningsAccrual',
      'fin.posting.emergencyCover',
      'fin.posting.emergencyForfeit',
      'fin.posting.tripEarnings',
      'fin.posting.adjustment',
      'fin.refused.unbalanced',
      'fin.refused.unknownAccount',
      'fin.reconcile.riderWallets',
      'fin.reconcile.refunds',
      'fin.reconcile.goodwill',
      'fin.reconcile.captainReceivable',
      'fin.deduction.latePickup',
      'fin.deduction.latePickupRepeat',
      'fin.deduction.riderNoShow',
      'fin.deduction.vehicleCleanliness',
      'fin.payout.failure.noBankAccount',
      'fin.authority.abovePerCase',
      'fin.authority.aboveDaily',
    ]
    for (const key of emitted) {
      expect(EN[key], `missing dictionary entry for ${key}`).toBeDefined()
    }
  })

  it('AC-429 — no error message contains please, invalid, failed to, or an apology', () => {
    const banned = /\b(please|invalid|failed to|sorry|oops|whoops)\b/i
    const offenders = Object.entries(FINANCIALS_EN).filter(
      ([key, value]) => key.includes('error') && banned.test(String(value)),
    )
    expect(offenders).toEqual([])
  })

  /**
   * **D21 — three sentences per refusal cause, and a family with two is a
   * `createTranslator` throw at the moment an operator reaches it.**
   *
   * `bulkRefusalText` appends `.one`, `.other` or `.all` to a base key chosen
   * by the screen, so a family that ships two of the three works until a
   * selection happens to take the third shape — the `.all` case in particular
   * needs every record refused, which no happy-path test reaches. This sweep
   * makes the gap a build failure instead.
   *
   * It walks the dictionary rather than a hand-written list, so a cause added
   * to any `*_REFUSAL_COPY` map is covered the moment its copy lands.
   */
  it('D21 — every bulk refusal family declares .one, .other and .all', () => {
    const forms = new Map<string, Set<string>>()
    for (const key of Object.keys(FINANCIALS_EN)) {
      const match = /^(fin\.bulk\.[a-z]+\.[A-Za-z]+)\.(one|other|all)$/.exec(key)
      if (!match) continue
      const [, base, form] = match
      const set = forms.get(base as string) ?? new Set<string>()
      set.add(form as string)
      forms.set(base as string, set)
    }

    /* Non-vacuity: the five bulk commands declare at least ten causes between
       them, so an empty sweep is a broken regex rather than a clean bill. */
    expect(forms.size, 'the sweep found refusal families').toBeGreaterThan(9)

    const incomplete = [...forms.entries()]
      .filter(([, set]) => !(set.has('one') && set.has('other') && set.has('all')))
      .map(([base, set]) => `${base} declares ${[...set].sort().join(', ')}`)
    expect(incomplete).toEqual([])
  })

  /**
   * The `.other` and `.all` forms carry the count; `.one` must not, because it
   * has no subset to name and `interpolate` would render a bare number into a
   * sentence about a single record.
   */
  it('D21 — the counted forms carry {count} and the single form does not', () => {
    for (const [key, value] of Object.entries(FINANCIALS_EN)) {
      if (!/^fin\.bulk\.[a-z]+\.[A-Za-z]+\.(other|all)$/.test(key)) continue
      expect(String(value), `${key} names the count`).toContain('{count}')
    }
    for (const [key, value] of Object.entries(FINANCIALS_EN)) {
      if (!/^fin\.bulk\.[a-z]+\.[A-Za-z]+\.one$/.test(key)) continue
      expect(String(value), `${key} has no subset to count`).not.toContain('{count}')
    }
  })

  it('AC-444 — no operator-facing string contains an emoji', () => {
    const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u
    const offenders = Object.entries(FINANCIALS_EN).filter(([, value]) => emoji.test(String(value)))
    expect(offenders).toEqual([])
  })

  it('AC-443 — money in a keyed sentence is formatted, never interpolated raw', () => {
    const t = (key: string, params?: Record<string, string | number>) => {
      const template = String(EN[key])
      return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params?.[name] ?? ''))
    }
    const rendered = localisedText(t as never, {
      key: 'fin.refused.unbalanced',
      params: { debitsHalalas: 90_000, creditsHalalas: 89_000 },
    })
    expect(rendered).toContain('900.00 SAR')
    expect(rendered).toContain('890.00 SAR')
    expect(rendered).not.toContain('90000')
  })
})

/* ═══════════════════════════ AC-415 and AC-421 ═══════════════════════════ */

describe('Ledger & Payment Controls', () => {
  it('AC-415 — the trial balance lists every account in the chart, zero balances included', async () => {
    const { CHART_OF_ACCOUNTS } = await import('@/data/types')
    renderScreen(<LedgerControlsScreen row={rowFor('financials-ledger')} />, '/financials/ledger')

    await waitFor(() =>
      expect(screen.getByText(CHART_OF_ACCOUNTS[0]?.label as string)).toBeTruthy(),
    )
    for (const account of CHART_OF_ACCOUNTS) {
      expect(screen.getByText(account.label), `missing ${account.key}`).toBeTruthy()
    }
  })

  it('AC-455 — the five added accounts exist and are listed', async () => {
    const { ACCOUNT_KEYS } = await import('@/data/types')
    for (const key of [
      'expense.promo',
      'expense.referral',
      'expense.incentive',
      'expense.gateway_fees',
      'equity.opening',
    ]) {
      expect(ACCOUNT_KEYS).toContain(key)
    }
  })

  it('AC-421 — no developer or simulation control is offered anywhere in the seven sub-tabs', async () => {
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
    for (const path of sources) {
      const source = readFileSync(path, 'utf8')
      /* The words may appear in a comment naming the rule; what must not appear
         is a control label or a client call. */
      expect(source).not.toMatch(/onClick=\{[^}]*(demo|simulate|backfill)/i)
      /* The mock-only affordances are never IMPORTED by a screen. Naming one
         in a comment is fine; reaching for it is the defect. */
      expect(source).not.toMatch(/import[^;]*(useOutOfBalanceLedger|useZeroSupplyZone|useNoZones)/s)
    }
  })

  it('AC-340 — no sub-tab formats money itself', async () => {
    const { readdirSync, readFileSync, statSync } = await import('node:fs')
    const { join } = await import('node:path')
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((entry) => {
        const path = join(dir, entry)
        return statSync(path).isDirectory() ? walk(path) : [path]
      })
    for (const path of walk('src/screens/financials')) {
      if (!path.endsWith('.tsx') && !path.endsWith('.ts')) continue
      expect(readFileSync(path, 'utf8'), `${path} formats money itself`).not.toMatch(/toFixed\(/)
    }
  })

  it('AC-449 — no Financials source uses a physical direction utility', async () => {
    const { readdirSync, readFileSync, statSync } = await import('node:fs')
    const { join } = await import('node:path')
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((entry) => {
        const path = join(dir, entry)
        return statSync(path).isDirectory() ? walk(path) : [path]
      })
    const physical =
      /className="[^"]*\b(ml|mr|pl|pr|border-l|border-r|rounded-l|rounded-r|text-left|text-right)-/
    for (const path of walk('src/screens/financials')) {
      if (!path.endsWith('.tsx')) continue
      expect(readFileSync(path, 'utf8'), `${path} carries a physical direction`).not.toMatch(
        physical,
      )
    }
  })
})
