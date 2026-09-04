/**
 * **Corporate Accounts — the four states, verified against a rigged failure.**
 *
 * Written for `REMEDIATION-PLAN.md` §2.1 and §4.3. Two things are under test
 * and neither can be checked by reading the source:
 *
 *   1. **AC-24 / AC-36** — with the read forced to fail, the screen renders its
 *      own error state, names a retry, and the retry actually re-runs the
 *      request. `mockFailures.once` proves the recovery, which a rendered
 *      `ErrorState` alone would not.
 *   2. **§2.1** — the two screens that used to `import { riderFixtures }` now
 *      read riders through the client seam. The proof is that
 *      `mockFailures.always('riders.list')` reaches them at all: a direct
 *      fixture import is unreachable by failure injection, so a passing error
 *      assertion here IS the seam assertion.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import {
  disableMockLatency,
  getCorporateAccount,
  listCorporateAccounts,
  mockFailures,
  resetDataLayer,
} from '@/data/clients'
import type { CorporateAccount } from '@/data/types'
import { EN } from '@/i18n/dictionaries'
import { Toaster } from '@/components/ui/sonner'
import { ShellProvider } from '@/shell/ShellContext'
import { AppRoutes } from '@/routes'
import { CORPORATE_EN } from './copy'

const en = (key: string) => EN[key] as string
/* Corporate is not registered in `dictionaries.ts`, so its own copy is the
   source these assertions read (`../localCopy`). */
const corp = (key: string) => CORPORATE_EN[key] as string
const corpFill = (key: string, params: Record<string, string>) =>
  Object.entries(params).reduce((s, [k, v]) => s.replace(`{${k}}`, v), corp(key))
const fill = (key: string, params: Record<string, string>) =>
  Object.entries(params).reduce((s, [k, v]) => s.replace(`{${k}}`, v), en(key))

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
})

/**
 * jsdom implements no Pointer Capture API and Radix's `Select` calls three of
 * its methods on the trigger. Without these stubs, opening the rider picker
 * throws from inside `node_modules` — a failure that says nothing about the
 * component. Stubs, not simulations; the same posture as `src/test/setup.ts`.
 */
beforeAll(() => {
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
        {/* R9 - the outcome toast is part of what each write must produce, so
            the surface that renders it is mounted here. */}
        <Toaster />
      </ShellProvider>
    </MemoryRouter>,
  )
}

const INDEX = '/operations/corporate'

/**
 * The expectations are read through the CLIENT, never from
 * `data/fixtures/*` — a test that imports a fixture is the same seam breach
 * the screens just had, and `seam.test.ts` scans this file too.
 */
let firstAccount: CorporateAccount
/** The seeded account with the most linked riders, so `content` is reachable. */
let withEmployees: CorporateAccount
let firstEmployeeId: string

beforeAll(async () => {
  const accounts = (await listCorporateAccounts({ pageSize: 100 })).items
  const [first] = accounts
  const [busiest] = [...accounts].sort((a, b) => b.riderIds.length - a.riderIds.length)
  const employeeId = busiest?.riderIds[0]
  /* Throw rather than assert non-null: if the fixtures stop carrying a
     corporate account with linked riders, these tests are not failing — they
     are testing nothing, and that must be loud. */
  if (!first || !busiest || !employeeId) {
    throw new Error('Fixtures carry no corporate account with linked riders.')
  }
  firstAccount = first
  withEmployees = busiest
  firstEmployeeId = employeeId
})

describe('CorporateScreen — AC-24: a failed list read renders the page error state', () => {
  it('names what failed, names the fix, and offers a retry', async () => {
    mockFailures.always('corporate.list')
    renderApp(INDEX)

    expect(
      await screen.findByText(
        fill('state.pageError.title', { resource: en('subtab.operations.corporate') }),
      ),
    ).toBeInTheDocument()
    expect(screen.getByText(en('state.pageError.body'))).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: en('state.pageError.action') }),
    ).toBeInTheDocument()
  })

  it('keeps the shell interactive, so the operator can navigate away without a reload', async () => {
    mockFailures.always('corporate.list')
    renderApp(INDEX)

    await screen.findByRole('button', { name: en('state.pageError.action') })
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: en('shell.nav.workspaces') })).toBeInTheDocument()
  })

  it('recovers when the retry re-runs the request — the retry is bound to refetch', async () => {
    const user = userEvent.setup()
    mockFailures.once('corporate.list')
    renderApp(INDEX)

    await user.click(await screen.findByRole('button', { name: en('state.pageError.action') }))

    expect(await screen.findByText(firstAccount.companyName)).toBeInTheDocument()
  })

  it('renders the table on a healthy read — the content branch is unchanged', async () => {
    renderApp(INDEX)
    expect(await screen.findByText(firstAccount.companyName)).toBeInTheDocument()
  })
})

describe('CorporateDetailScreen — the linked-employee card reads riders through the seam', () => {
  const detail = () => `${INDEX}/${withEmployees.id}`

  it('renders the linked riders from the client, not from a fixture import', async () => {
    renderApp(detail())
    /* Rider ids are the account's `riderIds`; the names come back from
       `listRiders`, which is the read a fixture import bypassed. */
    expect(await screen.findByText(firstEmployeeId, { exact: false })).toBeInTheDocument()
  })

  it('AC-24 — a failed rider read renders a card error with a working retry', async () => {
    const user = userEvent.setup()
    mockFailures.once('riders.list')
    renderApp(detail())

    const message = fill('state.cardError.message', { resource: en('view.people.riders') })
    const alert = await screen.findByText(message)
    expect(alert).toBeInTheDocument()

    /* The rest of the page is untouched — card scope, not page scope. */
    expect(screen.getByRole('heading', { level: 1, name: withEmployees.companyName })).toBeInTheDocument()

    const region = alert.closest('[role="alert"]') as HTMLElement
    await user.click(within(region).getByRole('button', { name: en('state.pageError.action') }))

    await waitFor(() => expect(screen.queryByText(message)).not.toBeInTheDocument())
    expect(await screen.findByText(firstEmployeeId, { exact: false })).toBeInTheDocument()
  })
})

/**
 * The modal's labels are still `t(key, { defaultValue })` strings and resolve
 * only through the hatch at `translate.ts:98`, so there is no `EN` entry to
 * look them up by. They are matched literally here and this test will need one
 * edit when `REMEDIATION-PLAN.md` §4.2 extracts them into a `copy.ts` — which
 * is the point: today nothing else would notice.
 */
/**
 * The card's control and the dialog's primary share this label, which is why
 * one constant serves both queries below.
 *
 * **Sentence case, and the case changed in P4-T1.** `copy.md` 2 puts a verb on
 * a button in sentence case; `Link Employee` was title case, and it was one of
 * five labels on this screen that were. The constant follows the copy rather
 * than the copy following the constant.
 */
const LINK_EMPLOYEE = 'Link employee'

describe('AddEmployeeModal — the rider picker reads through the seam', () => {
  const detail = () => `${INDEX}/${withEmployees.id}`

  const openPicker = async (user: ReturnType<typeof userEvent.setup>) => {
    await screen.findByRole('heading', { level: 1, name: withEmployees.companyName })
    await user.click(screen.getByRole('button', { name: LINK_EMPLOYEE }))
    return screen.findByRole('dialog')
  }

  it('excludes the riders already on the account — the `nin` filter runs in the query', async () => {
    const user = userEvent.setup()
    renderApp(detail())
    await openPicker(user)

    await user.click(await screen.findByRole('combobox'))
    const options = await screen.findAllByRole('option')

    expect(options.length).toBeGreaterThan(0)
    const labels = options.map((o) => o.textContent ?? '')
    for (const id of withEmployees.riderIds) {
      expect(labels.some((label) => label.includes(id))).toBe(false)
    }
  })

  it('AC-24 — a failed picker read renders the card error inside the dialog, with a retry', async () => {
    const user = userEvent.setup()
    mockFailures.always('riders.list')
    renderApp(detail())

    const dialog = await openPicker(user)
    const message = fill('state.cardError.message', { resource: en('view.people.riders') })

    expect(within(dialog).getByText(message)).toBeInTheDocument()
    expect(
      within(dialog).getByRole('button', { name: en('state.pageError.action') }),
    ).toBeInTheDocument()
    /* No picker to submit, so the confirm is not offering a dead action. */
    expect(within(dialog).getByRole('button', { name: LINK_EMPLOYEE })).toBeDisabled()
  })

  it('recovers on retry, so the retry is bound to the picker read and not decorative', async () => {
    const user = userEvent.setup()
    /* `always`, not `once`: the card's own rider read fires first and would
       consume a `once` entry before the dialog ever opens. Lifting the failure
       between the render and the click is what makes the retry observable. */
    mockFailures.always('riders.list')
    renderApp(detail())

    const dialog = await openPicker(user)
    const message = fill('state.cardError.message', { resource: en('view.people.riders') })
    expect(within(dialog).getByText(message)).toBeInTheDocument()

    mockFailures.clear('riders.list')
    await user.click(within(dialog).getByRole('button', { name: en('state.pageError.action') }))

    await waitFor(() => expect(within(dialog).queryByText(message)).not.toBeInTheDocument())
    expect(within(dialog).getByRole('combobox')).toBeInTheDocument()
  })
})

/**
 * **T1.2 - the two writes, and the two refusals they make unnecessary.**
 *
 * Each write is asserted twice: the surface changes, and a fresh read through
 * the client agrees. Each refusal is asserted where §11.2 puts it - on the
 * disabled control, as a sentence the operator can read.
 */
describe('T1.2 - Unlink employee', () => {
  /** Riders linked, and no unsent invoice, so the 409 cannot fire. */
  let unlinkable: CorporateAccount
  /** Riders linked AND an unsent invoice: the 409 the refusal states. */
  let unlinkBlocked: CorporateAccount

  beforeAll(async () => {
    const accounts = (await listCorporateAccounts({ pageSize: 100 })).items
    const open = accounts.find((c) => c.riderIds.length > 0 && !c.invoiceOverdue)
    const blocked = accounts.find((c) => c.riderIds.length > 0 && c.invoiceOverdue)
    if (!open || !blocked) {
      throw new Error('Fixtures carry no corporate account for each unlink branch.')
    }
    unlinkable = open
    unlinkBlocked = blocked
  })

  it('the write lands: the row goes and the next read agrees', async () => {
    const user = userEvent.setup()
    const riderId = unlinkable.riderIds[0] as string
    renderApp(`${INDEX}/${unlinkable.id}`)

    const row = (await screen.findByText(riderId, { exact: false })).closest('div')
      ?.parentElement as HTMLElement
    const name = within(row).getByRole('link').textContent as string

    await user.click(
      within(row).getByRole('button', { name: corpFill('corp.unlinkEmployee', { name }) }),
    )
    /* §5.3 - nothing is written until the modal's primary repeats the verb. */
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(corpFill('corp.unlink.confirm.title', { name }))).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: corp('corp.unlink.confirm.action') }))

    expect(await screen.findByText(corpFill('corp.toast.employeeRemoved', { name }))).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.queryByText(riderId, { exact: false })).not.toBeInTheDocument(),
    )
    expect((await getCorporateAccount(unlinkable.id)).riderIds).not.toContain(riderId)
  })

  it('§11.2 - an unsent invoice refuses the unlink in place, with the sentence', async () => {
    renderApp(`${INDEX}/${unlinkBlocked.id}`)
    await screen.findByRole('heading', { level: 1, name: unlinkBlocked.companyName })

    const sentence = await screen.findByText(corp('corp.unlink.blocked.unbilled'))
    const buttons = await screen.findAllByRole('button', { name: /^Unlink / })
    expect(buttons.length).toBeGreaterThan(0)
    for (const button of buttons) {
      expect(button).toBeDisabled()
      expect(button).toHaveAttribute('aria-describedby', sentence.id)
    }
  })
})

describe('T1.2 - Generate invoice', () => {
  /** Active, invoiced monthly, with spend: every 409 and 422 is off. */
  let invoiceable: CorporateAccount
  /** Active and prepaid: the 422 `prepaid_account` the refusal states. */
  let prepaid: CorporateAccount

  beforeAll(async () => {
    const accounts = (await listCorporateAccounts({ pageSize: 100 })).items
    const ready = accounts.find(
      (c) =>
        c.status === 'Active' && c.billingType === 'Monthly invoice' && c.totalSpendHalalas > 0,
    )
    const never = accounts.find((c) => c.status === 'Active' && c.billingType === 'Prepaid balance')
    if (!ready || !never) {
      throw new Error('Fixtures carry no corporate account for each invoice branch.')
    }
    invoiceable = ready
    prepaid = never
  })

  it('the write lands: the toast names the account and the next read is invoiced', async () => {
    const user = userEvent.setup()
    renderApp(`${INDEX}/${invoiceable.id}`)
    await screen.findByRole('heading', { level: 1, name: invoiceable.companyName })

    await user.click(screen.getByRole('button', { name: corp('corp.sendInvoice') }))

    expect(
      await screen.findByText(corpFill('corp.toast.invoiceSent', { name: invoiceable.companyName })),
    ).toBeInTheDocument()
    expect((await getCorporateAccount(invoiceable.id)).lastInvoiceGeneratedAt).not.toBeNull()
  })

  it('§11.2 - a prepaid account refuses the invoice in place, with the sentence', async () => {
    renderApp(`${INDEX}/${prepaid.id}`)
    await screen.findByRole('heading', { level: 1, name: prepaid.companyName })

    const sentence = await screen.findByText(corp('corp.invoice.blocked.prepaid'))
    const button = screen.getByRole('button', { name: corp('corp.sendInvoice') })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-describedby', sentence.id)
  })
})
