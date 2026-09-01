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
import { disableMockLatency, listCorporateAccounts, mockFailures, resetDataLayer } from '@/data/clients'
import type { CorporateAccount } from '@/data/types'
import { EN } from '@/i18n/dictionaries'
import { ShellProvider } from '@/shell/ShellContext'
import { AppRoutes } from '@/routes'

const en = (key: string) => EN[key] as string
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
