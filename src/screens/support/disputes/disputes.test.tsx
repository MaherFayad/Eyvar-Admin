/**
 * Support › Disputes & Lost and Found — one criterion per test.
 *
 * The screen these cover shipped with **no tests at all**, a module literal for
 * data, and a resolve modal that discarded the refund amount. Three of the
 * assertions below could not have been written against the old code because the
 * thing they assert had nowhere to live: there was no client to inject a failure
 * into, no refund to look for afterwards, and no facet to be empty.
 *
 * **Nothing here imports a fixture.** Every expectation is read back through
 * `@/data/clients`, which is what makes the seam assertion real: a direct
 * fixture import is unreachable by failure injection, so an error-state test
 * over a fixture-backed screen passes vacuously.
 */

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import {
  advanceLostFoundItem,
  auditLogSize,
  disableMockLatency,
  getDispute,
  getDisputeFacets,
  listDisputes,
  listLostFound,
  listRefunds,
  mockFailures,
  resolveDispute,
} from '@/data/clients'
import {
  DISPUTE_KINDS,
  DISPUTE_OUTCOMES,
  DISPUTE_STATUSES,
  LOST_FOUND_STATUSES,
  isApiError,
} from '@/data/types'
import { EN } from '@/i18n/dictionaries'
import { ShellProvider } from '@/shell/ShellContext'
import { AppRoutes } from '@/routes'

const en = (key: string) => EN[key] as string
const fill = (key: string, params: Record<string, string>) =>
  Object.entries(params).reduce((s, [k, v]) => s.replace(`{${k}}`, v), en(key))

const INDEX = '/support/disputes'
const LOST_FOUND = '/support/disputes?view=lost-and-found'

beforeEach(() => {
  disableMockLatency()
})

beforeAll(() => {
  /* jsdom implements no Pointer Capture API and Radix's `Select` calls three of
     its methods on the trigger. Stubs, not simulations — the same posture as
     `src/test/setup.ts`. */
  const proto = window.HTMLElement.prototype as unknown as Record<string, unknown>
  proto.hasPointerCapture ??= () => false
  proto.setPointerCapture ??= () => {}
  proto.releasePointerCapture ??= () => {}
  proto.scrollIntoView ??= () => {}
})

function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider>
        <AppRoutes />
      </ShellProvider>
    </MemoryRouter>,
  )
}

/* ────────────────────── the fixtures behind the screen ─────────────────── */

describe('the collections have the depth the screen needs', () => {
  it('pages at least twice at the default page size', async () => {
    const disputes = await listDisputes({ pageSize: 25 })
    const lostFound = await listLostFound({ pageSize: 25 })
    expect(disputes.totalPages).toBeGreaterThan(1)
    expect(lostFound.totalPages).toBeGreaterThan(1)
  })

  it('carries at least one row in every status the screen filters by', async () => {
    const { items } = await listDisputes({ pageSize: 500 })
    const statuses = new Set(items.map((d) => d.status))
    for (const status of DISPUTE_STATUSES) {
      expect(statuses.has(status), status).toBe(true)
    }
  })

  it('carries at least one resolved row for every outcome', async () => {
    const { items } = await listDisputes({ pageSize: 500 })
    const outcomes = new Set(items.map((d) => d.resolution?.outcome).filter(Boolean))
    for (const outcome of DISPUTE_OUTCOMES) {
      expect(outcomes.has(outcome), outcome).toBe(true)
    }
  })

  it('carries at least one row of every claim kind', async () => {
    const { items } = await listDisputes({ pageSize: 500 })
    const kinds = new Set(items.map((d) => d.kind))
    for (const kind of DISPUTE_KINDS) {
      expect(kinds.has(kind), kind).toBe(true)
    }
  })

  it('carries at least one lost-property report in every status', async () => {
    const { items } = await listLostFound({ pageSize: 500 })
    const statuses = new Set(items.map((l) => l.status))
    for (const status of LOST_FOUND_STATUSES) {
      expect(statuses.has(status), status).toBe(true)
    }
  })

  it('offers no facet value that can never match — every option has a count', async () => {
    const facets = await getDisputeFacets()
    for (const [field, values] of Object.entries(facets)) {
      expect(values.length, field).toBeGreaterThan(0)
      for (const value of values) {
        expect(value.count, `${field}=${value.value}`).toBeGreaterThan(0)
      }
    }
  })

  it('returns rows for every option the Filter control offers', async () => {
    /* The end of the invisible-hole check: the option list on the screen comes
       from the closed union, and each of those values, sent as a filter,
       actually matches something. An option that can never match is worse than
       a missing one — it reads as "we have none of those". */
    for (const status of DISPUTE_STATUSES) {
      const page = await listDisputes({
        pageSize: 500,
        filters: [{ field: 'status', op: 'eq', value: status }],
      })
      expect(page.total, status).toBeGreaterThan(0)
    }
    for (const kind of DISPUTE_KINDS) {
      const page = await listDisputes({
        pageSize: 500,
        filters: [{ field: 'kind', op: 'eq', value: kind }],
      })
      expect(page.total, kind).toBeGreaterThan(0)
    }
    for (const outcome of DISPUTE_OUTCOMES) {
      const page = await listDisputes({
        pageSize: 500,
        filters: [{ field: 'outcome', op: 'eq', value: outcome }],
      })
      expect(page.total, outcome).toBeGreaterThan(0)
    }
    for (const status of LOST_FOUND_STATUSES) {
      const page = await listLostFound({
        pageSize: 500,
        filters: [{ field: 'status', op: 'eq', value: status }],
      })
      expect(page.total, status).toBeGreaterThan(0)
    }
  })

  it('carries a claim with no clock, which is a value and not a gap', async () => {
    const dispute = await getDispute('DSP-118')
    expect(dispute.dueAt).toBeNull()
  })

  it('carries a claim filed BY a captain, which is paid through another account', async () => {
    const { items } = await listDisputes({ pageSize: 500 })
    expect(items.some((d) => d.claimantType === 'captain')).toBe(true)
  })
})

/* ─────────────────────────── the four states ───────────────────────────── */

describe('the four states', () => {
  it('renders content from the client, not from a module literal', async () => {
    renderApp(INDEX)
    expect(await screen.findByText('DSP-101')).toBeInTheDocument()
  })

  it('renders its own error state and a working retry when the read fails', async () => {
    mockFailures.always('disputes.list')
    renderApp(INDEX)
    expect(await screen.findByText(en('dispute.error.read'))).toBeInTheDocument()

    /* The proof that the screen reads the SEAM: a fixture imported directly is
       unreachable by failure injection, so this assertion could not have been
       written against the old screen at all. */
    mockFailures.clear('disputes.list')
    await userEvent.click(screen.getByRole('button', { name: en('state.pageError.action') }))
    expect(await screen.findByText('DSP-101')).toBeInTheDocument()
  })

  it('renders a first-run empty state when the query matches nothing', async () => {
    renderApp(INDEX)
    await screen.findByText('DSP-101')
    await userEvent.type(
      screen.getByPlaceholderText(en('dispute.search')),
      'a claim nobody ever filed',
    )
    expect(await screen.findByText(en('dispute.empty.noMatch'))).toBeInTheDocument()
  })

  it('renders the lost-and-found view from its own client', async () => {
    renderApp(LOST_FOUND)
    expect(await screen.findByText('LF-201')).toBeInTheDocument()
  })
})

/* ───────────────────── §11.2 — disabled in place, with a reason ────────── */

describe('§11.2 — a refused action is disabled in place and says why', () => {
  it('shows Resolve on a decided claim, disabled, with the date it was decided', async () => {
    renderApp(INDEX)
    await screen.findByText('DSP-101')
    /* `DSP-120` is resolved. The old screen rendered `null` here, so an operator
       could not see that resolving exists at all. */
    const row = (await screen.findByText('DSP-120')).closest('tr')
    expect(row).not.toBeNull()
    const resolve = within(row as HTMLElement).getByRole('button', {
      name: en('dispute.action.resolve'),
    })
    expect(resolve).toBeDisabled()
    expect(
      within(row as HTMLElement).getByText(/A verdict is not reversed here/),
    ).toBeInTheDocument()
  })

  it('names the operator holding a claim rather than hiding Take', async () => {
    renderApp(INDEX)
    await screen.findByText('DSP-101')
    const row = (await screen.findByText('DSP-116')).closest('tr')
    const take = within(row as HTMLElement).getByRole('button', {
      name: en('dispute.action.take'),
    })
    expect(take).toBeDisabled()
    expect(
      within(row as HTMLElement).getByText(
        fill('dispute.action.take.blocked.owned', { name: 'Lina Al-Otaibi' }),
      ),
    ).toBeInTheDocument()
  })

  it('refuses the captain step on a report with no captain, in place', async () => {
    renderApp(LOST_FOUND)
    await screen.findByText('LF-201')
    const row = (await screen.findByText('LF-208')).closest('tr')
    const found = within(row as HTMLElement).getByRole('button', {
      name: en('dispute.lf.action.found'),
    })
    expect(found).toBeDisabled()
    expect(
      within(row as HTMLElement).getByText(en('dispute.lf.action.found.blocked.noCaptain')),
    ).toBeInTheDocument()
  })
})

/* ───────────── the 0.00 SAR partial refund the old modal would take ────── */

describe('the resolve modal refuses a settlement that moves nothing', () => {
  async function openModalOn(id: string) {
    renderApp(INDEX)
    await screen.findByText('DSP-101')
    const row = (await screen.findByText(id)).closest('tr')
    await userEvent.click(
      within(row as HTMLElement).getByRole('button', { name: en('dispute.action.resolve') }),
    )
    return await screen.findByRole('dialog')
  }

  it('disables the primary with a reason when a partial refund has no amount', async () => {
    const dialog = await openModalOn('DSP-101')

    await userEvent.click(within(dialog).getByRole('combobox'))
    await userEvent.click(
      await screen.findByRole('option', { name: en('dispute.outcome.partial-refund') }),
    )

    const confirm = within(dialog).getByRole('button', { name: en('dispute.resolve.confirm') })
    expect(confirm).toBeDisabled()
    expect(
      within(dialog).getByText(en('dispute.resolve.blocked.amountRequired')),
    ).toBeInTheDocument()
  })

  it('disables the primary when the settlement is above the amount claimed', async () => {
    const dialog = await openModalOn('DSP-101')
    await userEvent.click(within(dialog).getByRole('combobox'))
    await userEvent.click(
      await screen.findByRole('option', { name: en('dispute.outcome.partial-refund') }),
    )
    /* `DSP-101` claims 25.00 SAR. */
    await userEvent.type(within(dialog).getByLabelText(en('dispute.resolve.amount')), '90')

    expect(
      within(dialog).getByRole('button', { name: en('dispute.resolve.confirm') }),
    ).toBeDisabled()
    expect(
      within(dialog).getByText(
        fill('dispute.resolve.blocked.amountAboveClaim', { max: '25.00 SAR' }),
      ),
    ).toBeInTheDocument()
  })

  it('states what the verdict will move before the operator commits', async () => {
    const dialog = await openModalOn('DSP-101')
    expect(
      within(dialog).getByText(
        fill('dispute.resolve.willMove.rider', {
          amount: '25.00 SAR',
          name: 'Nora Al-Harbi',
        }),
      ),
    ).toBeInTheDocument()
  })
})

/* ───────────────── the money movement the old screen never made ────────── */

describe('a resolution that is supposed to move money moves it', () => {
  it('issues a real refund for the amount, and links it to the claim', async () => {
    const before = await listRefunds({ pageSize: 500 })
    const audits = auditLogSize()

    const { dispute, refund } = await resolveDispute({
      disputeId: 'DSP-101',
      outcome: 'full-refund',
      refundHalalas: 2_500,
      note: 'Duplicate gantry line confirmed.',
    })

    expect(refund).not.toBeNull()
    expect(refund?.amountHalalas).toBe(2_500)
    expect(refund?.riderId).toBe('RDR-1041')
    expect(dispute.resolution?.refundId).toBe(refund?.id)
    expect(dispute.resolution?.refundHalalas).toBe(2_500)
    expect(dispute.status).toBe('resolved')

    const after = await listRefunds({ pageSize: 500 })
    expect(after.total).toBe(before.total + 1)
    /* AC-437 — a money movement writes an audit entry. It comes from
       `issueRefund` rather than from a second copy in this client. */
    expect(auditLogSize()).toBeGreaterThan(audits)
  })

  it('moves nothing on a declined claim, and records that it moved nothing', async () => {
    const before = await listRefunds({ pageSize: 500 })
    const { dispute, refund } = await resolveDispute({
      disputeId: 'DSP-102',
      outcome: 'declined',
      refundHalalas: 0,
      note: 'The captain had arrived.',
    })
    expect(refund).toBeNull()
    expect(dispute.resolution?.refundHalalas).toBe(0)
    expect(dispute.resolution?.refundId).toBeNull()
    expect((await listRefunds({ pageSize: 500 })).total).toBe(before.total)
  })

  it('settles a captain claim through the captain ledger, not through issueRefund', async () => {
    const before = await listRefunds({ pageSize: 500 })
    /* `DSP-103` is filed BY a captain. `issueRefund` looks its subject up in the
       rider collection and would 404; the settlement is a balanced entry on
       `liability.driver` instead. */
    const { dispute, refund } = await resolveDispute({
      disputeId: 'DSP-103',
      outcome: 'partial-refund',
      refundHalalas: 8_000,
      note: 'Settled at the cleaning quote.',
    })
    expect(refund).toBeNull()
    expect(dispute.resolution?.refundHalalas).toBe(8_000)
    expect((await listRefunds({ pageSize: 500 })).total).toBe(before.total)
  })

  it('refuses a zero settlement at the seam, not only in the modal', async () => {
    await expect(
      resolveDispute({ disputeId: 'DSP-104', outcome: 'partial-refund', refundHalalas: 0 }),
    ).rejects.toSatisfy((e: unknown) => isApiError(e) && e.status === 422)
    /* Nothing moved and the claim is still open, which is the point of
       validating before the money rather than after it. */
    expect((await getDispute('DSP-104')).status).toBe('open')
  })

  it('refuses a settlement above the amount claimed', async () => {
    await expect(
      resolveDispute({ disputeId: 'DSP-104', outcome: 'partial-refund', refundHalalas: 999_999 }),
    ).rejects.toSatisfy((e: unknown) => isApiError(e) && e.code === 'amount_above_claim')
  })

  it('refuses to decide the same claim twice', async () => {
    await expect(
      resolveDispute({ disputeId: 'DSP-120', outcome: 'declined', refundHalalas: 0 }),
    ).rejects.toSatisfy((e: unknown) => isApiError(e) && e.status === 409)
  })

  it('leaves the claim open when the money movement fails', async () => {
    mockFailures.always('revenue.issueRefund')
    await expect(
      resolveDispute({ disputeId: 'DSP-104', outcome: 'full-refund', refundHalalas: 4_200 }),
    ).rejects.toSatisfy(isApiError)
    expect((await getDispute('DSP-104')).status).toBe('open')
    expect((await getDispute('DSP-104')).resolution).toBeNull()
  })
})

/* ─────────────────── the lost-and-found ladder, as data ────────────────── */

describe('the lost-and-found ladder comes from LOST_FOUND_FLOW', () => {
  it('advances searching to with-captain and with-captain to returned', async () => {
    const first = await advanceLostFoundItem({ id: 'LF-202' })
    expect(first.status).toBe('with-captain')
    const second = await advanceLostFoundItem({ id: 'LF-202' })
    expect(second.status).toBe('returned')
  })

  it('refuses to advance an item that is already back with its owner', async () => {
    await expect(advanceLostFoundItem({ id: 'LF-203' })).rejects.toSatisfy(
      (e: unknown) => isApiError(e) && e.status === 409,
    )
  })

  it('refuses the captain step when the report names no captain', async () => {
    await expect(advanceLostFoundItem({ id: 'LF-208' })).rejects.toSatisfy(
      (e: unknown) => isApiError(e) && e.code === 'no_captain_on_report',
    )
  })

  it('records when the transition happened', async () => {
    const before = (await listLostFound({ pageSize: 500 })).items.find((l) => l.id === 'LF-205')!
    const after = await advanceLostFoundItem({ id: 'LF-205' })
    expect(after.updatedAt).not.toBe(before.updatedAt)
  })
})

/* ─────────────────────────────── i18n ──────────────────────────────────── */

describe('AC-74 — every string resolves through a key', () => {
  it('defines every key the two screens ask for', async () => {
    /* A spot check with teeth: these are the families the old screen invented
       through `defaultValue`, so a missing one here is the hatch coming back. */
    for (const kind of DISPUTE_KINDS) expect(EN[`dispute.kind.${kind}`]).toBeDefined()
    for (const status of DISPUTE_STATUSES) expect(EN[`dispute.status.${status}`]).toBeDefined()
    for (const outcome of DISPUTE_OUTCOMES) expect(EN[`dispute.outcome.${outcome}`]).toBeDefined()
    for (const status of LOST_FOUND_STATUSES) {
      expect(EN[`dispute.lf.status.${status}`]).toBeDefined()
    }
    /* Minted by the DATA layer for the captain settlement's posting. */
    expect(EN['dispute.posting.settlement']).toBeDefined()
  })

  it('leaves no `defaultValue` call behind in either screen file', async () => {
    const { readFileSync } = await import('node:fs')
    /* Comments are stripped first. Both files DOCUMENT the hatch they no longer
       use, and a check that fails on its own rationale is useless — the same
       posture `seam.test.ts` takes with `Date.now`. */
    const stripComments = (source: string) =>
      source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
    for (const file of [
      'src/screens/support/disputes/DisputesScreen.tsx',
      'src/screens/support/disputes/ResolveDisputeModal.tsx',
    ]) {
      const source = stripComments(readFileSync(file, 'utf8'))
      expect(source.includes('defaultValue'), file).toBe(false)
    }
  })
})
