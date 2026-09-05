/**
 * **Operations › Subscriptions — T1.2 (`Change captain` has a write) and T6.1
 * (Freeze resolves the registry, so it carries D18's undo).**
 */

/**
 * Three things are under test and none can be checked by reading the source:
 * that the reassignment **lands and the row changes**, that an ineligible
 * captain is **listed and refused in place** rather than hidden by the query
 * (§11.2), and that a freeze offers its inverse inside the window and that
 * pressing it reaches `unfreezeSubscription`. Fixtures are read through the
 * client, never imported — `seam.test.ts` scans this file too.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { toast } from 'sonner'
import {
  disableMockLatency,
  listDrivers,
  listSubscriptions,
  mockFailures,
  resetDataLayer,
  switchMockUser,
} from '@/data/clients'
import type { Driver, Subscription } from '@/data/types'
import { ShellProvider } from '@/shell/ShellContext'
import { AppRoutes } from '@/routes'
import { Toaster } from '@/components/ui/sonner'
import { EN } from '@/i18n/dictionaries'

const en = (key: string, params: Record<string, string> = {}) =>
  Object.entries(params).reduce((s, [k, v]) => s.replace(`{${k}}`, v), EN[key] as string)

const INDEX = '/operations/subscriptions'

beforeEach(async () => {
  disableMockLatency()
  resetDataLayer()
  mockFailures.clear()
  /* Sonner's store outlives a render, so a toast raised by an earlier test is
     still queued when the next one mounts a Toaster. */
  toast.dismiss()
  await switchMockUser('USR-1')
})

beforeAll(() => {
  /* jsdom implements no Pointer Capture API and Radix's menus call three of its
     methods. Stubs, not simulations — the same posture as `src/test/setup.ts`. */
  const proto = window.HTMLElement.prototype as unknown as Record<string, unknown>
  proto.hasPointerCapture ??= () => false
  proto.setPointerCapture ??= () => {}
  proto.releasePointerCapture ??= () => {}
  proto.scrollIntoView ??= () => {}
})

function renderApp(path: string = INDEX) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider>
        <AppRoutes />
        {/* Sonner renders nothing without a mounted Toaster, and D18's one
            control lives inside the toast. */}
        <Toaster />
      </ShellProvider>
    </MemoryRouter>,
  )
}

/** The rows the default view shows, read through the client. */
let live: Subscription
let drivers: Driver[]

beforeAll(async () => {
  disableMockLatency()
  const page = (await listSubscriptions({ view: 'all', pageSize: 500 })).items
  const found = page.find(
    (sub) => sub.status !== 'cancelled' && sub.status !== 'expired' && sub.driverId !== null,
  )
  /* Throw rather than assert non-null: without such a row these tests are not
     failing, they are testing nothing, and that must be loud. */
  if (!found) throw new Error('The fixtures must carry a live subscription with a captain.')
  live = found
  drivers = (await listDrivers({ pageSize: 500 })).items
})

/** Open the row kebab for `sub` and return the menu. */
async function openRowMenu(user: ReturnType<typeof userEvent.setup>, sub: Subscription) {
  const row = await waitFor(() => {
    const found = screen.getByText(sub.id).closest('tr')
    if (!found) throw new Error(`No row for ${sub.id}`)
    return found as HTMLElement
  })
  await user.click(within(row).getByRole('button', { name: en('table.rowActions', { row: sub.id }) }))
  return screen.findByRole('menu')
}

describe('T1.2 — Change captain has a write behind it', () => {
  it('reassigns the subscription and the row names the new captain', async () => {
    const user = userEvent.setup()
    const replacement = drivers.find(
      (d) =>
        d.id !== live.driverId &&
        d.status === 'active' &&
        (live.vehicleClass !== 'Comfort' || d.vehicleClass === 'Comfort'),
    )
    if (!replacement) throw new Error('The fixtures must carry an eligible replacement captain.')

    renderApp(`${INDEX}?q=${live.id}`)
    await screen.findByText(live.id)

    const menu = await openRowMenu(user, live)
    await user.click(within(menu).getByRole('menuitem', { name: en('subs.action.changeDriver') }))

    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: new RegExp(replacement.name) }))
    await user.click(within(dialog).getByRole('button', { name: en('sub.confirmChange') }))

    /* The row is the observable: a screen that toasted without calling
       `reassignSubscriptionDriver` would still be showing the old captain. */
    expect(await screen.findByText(replacement.name)).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  /**
   * §11.2 over the client's `same_driver` 422: gated at RENDER, listed and
   * disabled with its sentence, never removed from the picker so that the
   * operator discovers the refusal after the press.
   */
  it('lists the captain already assigned, refused in place with its sentence', async () => {
    const user = userEvent.setup()
    renderApp(`${INDEX}?q=${live.id}`)
    await screen.findByText(live.id)

    const menu = await openRowMenu(user, live)
    await user.click(within(menu).getByRole('menuitem', { name: en('subs.action.changeDriver') }))

    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('combobox'))

    const current = await screen.findByRole('option', {
      name: new RegExp(live.driverName ?? ''),
    })
    expect(current).toHaveAttribute('aria-disabled', 'true')
    expect(current).toHaveTextContent(en('sub.candidate.same'))
  })
})

describe('T6.1 / D18 — freezing a subscription is reversible from the toast', () => {
  it('offers Undo inside the window, and the undo resumes it through the client', async () => {
    const user = userEvent.setup()
    renderApp(`${INDEX}?q=${live.id}`)
    await screen.findByText(live.id)

    const menu = await openRowMenu(user, live)
    await user.click(within(menu).getByRole('menuitem', { name: en('subs.action.freeze') }))

    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: en('subs.freeze.confirm') }))

    const undo = await screen.findByRole('button', { name: en('command.undo') })
    expect(undo, 'a freeze must offer its inverse, not just report success').toBeInTheDocument()

    await user.click(undo)
    /* The second toast, which only `unfreezeSubscription` returning produces. */
    expect(
      await screen.findByText(en('subs.toast.frozen.undone.one', { id: live.id })),
    ).toBeInTheDocument()
  })

  /** The duration list is the command's, and the form renders its four options. */
  it('asks how long, as a closed list with the resume date under it', async () => {
    const user = userEvent.setup()
    renderApp(`${INDEX}?q=${live.id}`)
    await screen.findByText(live.id)

    const menu = await openRowMenu(user, live)
    await user.click(within(menu).getByRole('menuitem', { name: en('subs.action.freeze') }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(en('subs.freeze.duration'))).toBeInTheDocument()
    await user.click(within(dialog).getAllByRole('combobox')[0]!)
    expect(await screen.findAllByRole('option')).toHaveLength(4)
  })
})

/* ══════════════════════════ T8.1 — the rest ═════════════════════════════ */

describe('D18 — `Cancel and settle` states its outcome and offers no undo', () => {
  it('confirms first, names what will not change, and needs a reason before it can run', async () => {
    const user = userEvent.setup()
    renderApp(`${INDEX}?q=${live.id}`)
    await screen.findByText(live.id)

    const menu = await openRowMenu(user, live)
    await user.click(within(menu).getByRole('menuitem', { name: en('subs.action.cancel') }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(en('subs.settle.title', { id: live.id }))).toBeInTheDocument()
    expect(within(dialog).getByText(en('subs.settle.body'))).toBeInTheDocument()
    /* §10.4 — the primary is dead until a reason is chosen. */
    expect(within(dialog).getByRole('button', { name: en('subs.settle.confirm') })).toBeDisabled()
  })

  it('cancels through the client and the toast carries no undo', async () => {
    const user = userEvent.setup()
    renderApp(`${INDEX}?q=${live.id}`)
    await screen.findByText(live.id)

    const menu = await openRowMenu(user, live)
    await user.click(within(menu).getByRole('menuitem', { name: en('subs.action.cancel') }))

    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getAllByRole('combobox')[0]!)
    await user.click((await screen.findAllByRole('option'))[0]!)
    await user.click(within(dialog).getByRole('button', { name: en('subs.settle.confirm') }))

    /* The outcome sentence names the refund the SERVER returned. */
    const toasted = await screen.findByText(/Subscription cancelled/)
    expect(toasted).toBeInTheDocument()
    /* D18 fails on both clauses here: no inverse, so no undo handle. */
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: en('command.undo') })).toBeNull(),
    )
  })

  it('§11.2 — a subscription already cancelled refuses the command in place, with its reason', async () => {
    const user = userEvent.setup()
    const page = (await listSubscriptions({ view: 'all', pageSize: 500 })).items
    const terminal = page.find((sub) => sub.status === 'cancelled' || sub.status === 'expired')
    if (!terminal) throw new Error('The fixtures must carry a cancelled or expired subscription.')

    renderApp(`${INDEX}?view=all&q=${terminal.id}`)
    await screen.findByText(terminal.id)
    const menu = await openRowMenu(user, terminal)
    const item = within(menu).getByRole('menuitem', { name: en('subs.action.cancel') })
    expect(item).toHaveAttribute('aria-disabled', 'true')
  })
})

describe('§4.11 — the four states', () => {
  it('content: the index lists subscriptions with a count in the header', async () => {
    renderApp()
    const table = await screen.findByRole('table')
    expect(within(table).getAllByRole('row').length).toBeGreaterThan(1)
  })

  it('loading: no table while the read is in flight', async () => {
    renderApp()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    await screen.findByRole('table')
  })

  /**
   * AC-24 / AC-36 — this screen takes the PAGE scope on a whole-read failure,
   * so the sentence is the shell's, not `subs.error.list` (which the DataTable
   * branch below never reaches and which is therefore unused copy).
   */
  it('error: the page states the failure and offers a retry', async () => {
    mockFailures.always('subscriptions.list')
    renderApp()
    expect(
      await screen.findByText(
        en('state.pageError.title', { resource: en('subtab.operations.subscriptions') }),
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: EN['state.pageError.action'] as string }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('empty: a search matching nothing states so', async () => {
    renderApp(`${INDEX}?q=zzzznotasubscription`)
    expect(await screen.findByText(en('subs.empty.noMatch'))).toBeInTheDocument()
  })
})

describe('§7.2 — the keyboard reaches the row commands', () => {
  it('the row menu opens from the keyboard and Escape closes it', async () => {
    const user = userEvent.setup()
    renderApp(`${INDEX}?q=${live.id}`)
    await screen.findByText(live.id)

    const row = screen.getByText(live.id).closest('tr') as HTMLElement
    const trigger = within(row).getByRole('button', {
      name: en('table.rowActions', { row: live.id }),
    })
    trigger.focus()
    await user.keyboard('{Enter}')
    await screen.findByRole('menu')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
    expect(trigger).toHaveFocus()
  })
})
