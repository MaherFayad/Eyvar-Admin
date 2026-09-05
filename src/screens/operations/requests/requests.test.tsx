/**
 * Operations › Requests (T8.1) — one test per acceptance criterion the screen's
 * header cites (§5 of `specs/02-work-queues.md`). Fixtures are read through the
 * client, never imported; `seam.test.ts` scans this file too.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { toast } from 'sonner'
import {
  disableMockLatency,
  getRouteTable,
  listRequests,
  mockFailures,
  resetDataLayer,
  switchMockUser,
} from '@/data/clients'
import type { RideRequest } from '@/data/types'
import { ShellProvider } from '@/shell/ShellContext'
import { AppRoutes } from '@/routes'
import { Toaster } from '@/components/ui/sonner'
import { EN } from '@/i18n/dictionaries'
import { QUEUE_SHARED_EN } from '@/screens/queues/copy'
import { REQUESTS_EN } from './copy'

const t = (key: string, params: Record<string, string> = {}) =>
  Object.entries(params).reduce(
    (s, [k, v]) => s.replace(`{${k}}`, v),
    (REQUESTS_EN[key] ?? QUEUE_SHARED_EN[key] ?? EN[key]) as string,
  )

const INSTANT = '/operations/ride-requests'
const SUBSCRIPTION = '/operations/subscription-requests'

beforeEach(async () => {
  disableMockLatency()
  resetDataLayer()
  mockFailures.clear()
  toast.dismiss()
  /* `resetDataLayer` restores the seeded operator; every test that needs a
     different one switches explicitly. */
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

function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider>
        <AppRoutes />
        <Toaster />
      </ShellProvider>
    </MemoryRouter>,
  )
}

/** The rows the default view shows, read through the client. */
async function open(channel: 'instant' | 'subscription'): Promise<RideRequest[]> {
  return (await listRequests({ view: 'needs-decision', channel, pageSize: 500 })).items
}

/* ═════════════════ §5.3 / X7 — the queue lands on open work ═════════════ */

describe('Q-32 / T3.2 — the default view is the open work, and it includes `No captain`', () => {
  it('lands on `Needs a decision` with no view in the URL', async () => {
    renderApp(INSTANT)
    expect(
      await screen.findByRole('tab', { name: EN['view.requests.needsDecision'] as string }),
    ).toHaveAttribute('aria-selected', 'true')
  })

  it('X7 — a `no-drivers` request is on the default view, not only under All', async () => {
    const rows = await open('instant')
    const stuck = rows.find((row) => row.status === 'no-drivers')
    if (!stuck) throw new Error('The fixtures must carry a `no-drivers` instant request.')

    renderApp(INSTANT)
    const table = await screen.findByRole('table')
    expect(await within(table).findByText(stuck.pickup, { exact: false })).toBeInTheDocument()
    expect(within(table).getAllByText(t('requests.status.noDrivers')).length).toBeGreaterThan(0)
  })

  it('the view row is the route table, in its declared order', async () => {
    const row = getRouteTable().subTabs.find((each) => each.subTabId === 'operations-ride-requests')!
    const declared = [...row.views].sort((a, b) => a.order - b.order).map((v) => EN[v.titleKey] as string)
    renderApp(INSTANT)
    await screen.findByRole('table')
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(declared)
  })
})

/* ══════════════════════════ §4.2 — ownership ════════════════════════════ */

describe('AC-201 — `Claim` and `Open` are two separate, separately labelled controls', () => {
  it('every open row offers an opening link and an ownership control that is not it', async () => {
    const rows = await open('instant')
    const free = rows.find((row) => row.claim === null || row.claim.state !== 'claimed')
    if (!free) throw new Error('The fixtures must carry an unclaimed instant request.')

    renderApp(INSTANT)
    await screen.findByRole('table')
    const opener = await screen.findByRole('link', {
      name: t('requests.a11y.open', { pickup: free.pickup, destination: free.destination }),
    })
    expect(opener).toHaveAttribute('href', expect.stringContaining(free.id))

    const row = opener.closest('tr')!
    const claim = within(row).getByRole('button', { name: t('queue.claim') })
    expect(claim).not.toBe(opener)
    expect(claim.tagName).toBe('BUTTON')
  })
})

describe('AC-206 — claiming and releasing move the row between the two ownership states', () => {
  it('claiming an unclaimed row converts its chip to `Yours`, with `Release` beside it', async () => {
    const user = userEvent.setup()
    const rows = await open('instant')
    const free = rows.find((row) => row.claim === null || row.claim.state !== 'claimed')!

    renderApp(INSTANT)
    await screen.findByRole('table')
    const opener = await screen.findByRole('link', {
      name: t('requests.a11y.open', { pickup: free.pickup, destination: free.destination }),
    })
    const row = opener.closest('tr')!
    await user.click(within(row).getByRole('button', { name: t('queue.claim') }))

    const converted = await waitFor(() => {
      const current = screen
        .getByRole('link', {
          name: t('requests.a11y.open', { pickup: free.pickup, destination: free.destination }),
        })
        .closest('tr')!
      if (!within(current).queryByText(/^Yours · /)) throw new Error('the chip has not converted')
      return current
    })
    expect(within(converted).getByRole('button', { name: t('queue.release') })).toBeEnabled()
  })
})

describe('AC-202 / AC-203 — take over names the owner, and cancelling leaves the claim with them', () => {
  it("AC-202 — an item held by another operator shows that operator's name and offers `Take over`", async () => {
    const rows = await open('instant')
    const held = rows.find((row) => row.claim?.state === 'claimed' && row.claim.ownerId !== 'USR-1')
    if (!held) throw new Error("The fixtures must carry a request held by another operator.")

    renderApp(INSTANT)
    await screen.findByRole('table')
    const row = (await screen.findByText(held.claim!.ownerName)).closest('tr')!
    expect(within(row).getByRole('button', { name: t('queue.takeOver') })).toBeEnabled()
  })

  it('AC-203 — the confirmation names the current owner and says they lose it unasked', async () => {
    const user = userEvent.setup()
    const rows = await open('instant')
    const held = rows.find((row) => row.claim?.state === 'claimed' && row.claim.ownerId !== 'USR-1')!
    const owner = held.claim!.ownerName

    renderApp(INSTANT)
    await screen.findByRole('table')
    const row = (await screen.findByText(owner)).closest('tr')!
    await user.click(within(row).getByRole('button', { name: t('queue.takeOver') }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(t('queue.takeOver.title', { name: owner }))).toBeInTheDocument()
    expect(within(dialog).getByText(t('queue.takeOver.body', { name: owner }))).toBeInTheDocument()
  })

  it('AC-203 — cancelling the take-over leaves the claim with the original owner', async () => {
    const user = userEvent.setup()
    const rows = await open('instant')
    const held = rows.find((row) => row.claim?.state === 'claimed' && row.claim.ownerId !== 'USR-1')!
    const owner = held.claim!.ownerName

    renderApp(INSTANT)
    await screen.findByRole('table')
    await user.click(
      within((await screen.findByText(owner)).closest('tr')!).getByRole('button', {
        name: t('queue.takeOver'),
      }),
    )
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText(owner)).toBeInTheDocument()
    const after = await listRequests({ view: 'needs-decision', channel: 'instant', pageSize: 500 })
    expect(after.items.find((r) => r.id === held.id)?.claim?.ownerName).toBe(owner)
  })
})

describe('AC-209 / AC-210 — who may dispose, and what it costs them', () => {
  it("AC-209 — disposing of an item claimed by another operator asks the same take-over question", async () => {
    const user = userEvent.setup()
    const rows = await open('instant')
    const held = rows.find(
      (row) =>
        row.claim?.state === 'claimed' &&
        row.claim.ownerId !== 'USR-1' &&
        row.status !== 'offered' &&
        row.status !== 'assigned',
    )
    if (!held) throw new Error('The fixtures must carry a decidable request held by another operator.')
    const owner = held.claim!.ownerName

    renderApp(INSTANT)
    await screen.findByRole('table')
    const row = (await screen.findByText(owner)).closest('tr')!
    await user.click(within(row).getByRole('button', { name: t('requests.action.expire') }))

    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByText(t('queue.takeOver.decide.title', { name: owner })),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByRole('button', { name: t('queue.takeOver.decide.confirm') }),
    ).toBeInTheDocument()
  })

  it('AC-210 — an unclaimed item is disposed of directly, with no claim step in between', async () => {
    const user = userEvent.setup()
    const rows = await open('instant')
    const free = rows.find((row) => row.claim === null || row.claim.state !== 'claimed')!

    renderApp(INSTANT)
    await screen.findByRole('table')
    const opener = await screen.findByRole('link', {
      name: t('requests.a11y.open', { pickup: free.pickup, destination: free.destination }),
    })
    await user.click(
      within(opener.closest('tr')!).getByRole('button', { name: t('requests.action.expire') }),
    )

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(t('requests.expire.title', { id: free.id }))).toBeInTheDocument()
    expect(within(dialog).queryByText(/Take over/)).not.toBeInTheDocument()
  })
})

/* ═══════════════════════════ §4.12 — the order ══════════════════════════ */

describe('AC-217 — breached first, most overdue at the top, then remaining time, then `No clock`', () => {
  it('orders the subscription queue by deadline with the most overdue leading', async () => {
    const rows = await open('subscription')
    const expected = [...rows]
      .sort((a, b) => {
        if (a.slaDueAt === null) return 1
        if (b.slaDueAt === null) return -1
        return Date.parse(a.slaDueAt) - Date.parse(b.slaDueAt)
      })
      .map((row) => t('requests.route', { pickup: row.pickup, destination: row.destination }))
    expect(expected.length).toBeGreaterThan(2)

    renderApp(SUBSCRIPTION)
    await screen.findByRole('table')
    /* The identity link is the row's subject, so reading the links in document
       order reads the rows in the order the operator sees them. */
    const onScreen = await waitFor(() => {
      const links = screen.getAllByRole('link', { name: /^Open the ride from / })
      if (links.length < expected.length) throw new Error('the rows have not all painted')
      return links.map((link) => link.textContent)
    })
    expect(onScreen).toEqual(expected)
  })

  it('the most overdue row reads `overdue` in words and the healthy one does not', async () => {
    renderApp(SUBSCRIPTION)
    const table = await screen.findByRole('table')
    const overdue = await within(table).findAllByText(/^overdue /)
    expect(overdue.length).toBeGreaterThan(0)
    expect(within(table).getAllByText(/ left$/).length).toBeGreaterThan(0)
  })
})

/* ════════════════════════ §5.5 — the dispositions ═══════════════════════ */

describe('AC-226 — a disposition converts the row in place', () => {
  it('the row stays visible and its actions are replaced by a badge naming the outcome', async () => {
    const user = userEvent.setup()
    const rows = await open('instant')
    const free = rows.find((row) => row.claim === null || row.claim.state !== 'claimed')!

    renderApp(INSTANT)
    await screen.findByRole('table')
    const opener = await screen.findByRole('link', {
      name: t('requests.a11y.open', { pickup: free.pickup, destination: free.destination }),
    })
    await user.click(
      within(opener.closest('tr')!).getByRole('button', { name: t('requests.action.expire') }),
    )
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: t('requests.expire.confirm') }))

    /* The row is still on screen, and it now carries the outcome instead of the
       two disposition buttons. */
    const converted = await waitFor(() => {
      const link = screen.getByRole('link', {
        name: t('requests.a11y.open', { pickup: free.pickup, destination: free.destination }),
      })
      const row = link.closest('tr')!
      if (within(row).queryByRole('button', { name: t('requests.action.expire') })) {
        throw new Error('the disposition controls are still on the row')
      }
      return row
    })
    expect(
      within(converted).getAllByText(t('requests.decided.expired')).length,
    ).toBeGreaterThan(0)
  })
})

describe('AC-246 — an `Offered` request offers no assign, and says the offer is with the captain', () => {
  it('names the captain the offer is with and states that ops is waiting on them', async () => {
    const rows = await open('instant')
    const offered = rows.find((row) => row.status === 'offered')
    if (!offered) throw new Error('The fixtures must carry an `offered` instant request.')

    renderApp(INSTANT)
    const table = await screen.findByRole('table')
    const row = (await within(table).findByText(offered.offeredToDriverName!)).closest('tr')!
    expect(within(row).getByText(t('requests.offered.waiting'))).toBeInTheDocument()
    expect(
      within(row).queryByRole('button', { name: t('requests.action.assign') }),
    ).not.toBeInTheDocument()
  })
})

describe('AC-247 — assigning a captain confirms first, naming the money consequence', () => {
  it('the subscription confirmation names the hold that will be captured', async () => {
    const user = userEvent.setup()
    const rows = await open('subscription')
    const free = rows.find((row) => row.claim === null || row.claim.state !== 'claimed')!

    renderApp(SUBSCRIPTION)
    await screen.findByRole('table')
    const opener = await screen.findByRole('link', {
      name: t('requests.a11y.open', { pickup: free.pickup, destination: free.destination }),
    })
    await user.click(
      within(opener.closest('tr')!).getByRole('button', { name: t('requests.action.assign') }),
    )
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(t('requests.assign.body.subscription'))).toBeInTheDocument()
    expect(
      within(dialog).getByRole('button', { name: t('requests.assign.confirm') }),
    ).toBeInTheDocument()
  })
})

describe('AC-245 — a rider note is readable before the operator chooses a captain', () => {
  it('the row opens a sheet carrying the note the rider left', async () => {
    const all = await listRequests({ view: 'all', channel: 'subscription', pageSize: 500 })
    const noted = all.items.find((row) => row.notes !== null && row.notes !== '')
    if (!noted) throw new Error('The fixtures must carry a subscription request with a rider note.')

    renderApp(`${SUBSCRIPTION}?entity=${noted.id}`)
    expect(await screen.findByText(noted.notes!)).toBeInTheDocument()
  })
})

/* ═══════════════ §11.2 / AC-232 — refusals before the press ═════════════ */

describe('AC-232 — a control the role cannot use is disabled with its reason, before it is clicked', () => {
  it('a Support operator sees the queue and every write refused in place', async () => {
    await switchMockUser('USR-3')
    renderApp(INSTANT)
    const table = await screen.findByRole('table')

    const assign = within(table).getAllByRole('button', { name: t('requests.action.assign') })
    expect(assign.length).toBeGreaterThan(0)
    for (const button of assign) {
      expect(button).toBeDisabled()
      expect(button).toHaveAttribute('title', t('queue.action.noPermission'))
    }
    for (const button of within(table).getAllByRole('button', { name: t('queue.claim') })) {
      expect(button).toBeDisabled()
    }
  })

  it('the same controls are enabled for an operator who holds the permission', async () => {
    renderApp(INSTANT)
    const table = await screen.findByRole('table')
    expect(
      within(table).getAllByRole('button', { name: t('requests.action.assign') })[0],
    ).toBeEnabled()
  })
})

/* ═══════════════════════ §9.3 / D21 — the bulk bar ══════════════════════ */

describe('§9.3 / D21 — the bulk bar holds claims only, and refuses a mixed set in words', () => {
  /** The bulk bar, which announces itself as `N selected`. */
  const bar = () => screen.getByRole('group', { name: /selected/i })

  it('§9.3 — the bar offers `Claim` and no disposition', async () => {
    const user = userEvent.setup()
    const rows = await open('instant')
    const free = rows.find((row) => row.claim === null || row.claim.state !== 'claimed')!

    renderApp(INSTANT)
    await screen.findByRole('table')
    const opener = await screen.findByRole('link', {
      name: t('requests.a11y.open', { pickup: free.pickup, destination: free.destination }),
    })
    await user.click(opener.closest('tr')!.querySelector('input[type="checkbox"], [role="checkbox"]')!)

    const actions = within(await waitFor(bar))
    expect(actions.getByRole('button', { name: t('requests.bulk.claim') })).toBeEnabled()
    expect(actions.queryByRole('button', { name: t('requests.action.assign') })).toBeNull()
    expect(actions.queryByRole('button', { name: t('requests.action.expire') })).toBeNull()
  })

  it('D21 — a set holding a claimed row refuses the command and names the count', async () => {
    const user = userEvent.setup()
    renderApp(INSTANT)
    await screen.findByRole('table')
    /* The header checkbox — select all. Three of the four default rows are held
       by somebody, so the set is mixed and D21's `.other` sentence applies. */
    await user.click(screen.getAllByRole('checkbox')[0]!)

    const actions = within(await waitFor(bar))
    expect(actions.getByRole('button', { name: t('requests.bulk.claim') })).toBeDisabled()
    expect(screen.getByText(/already claimed/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Select only the \d+ eligible$/ })).toBeInTheDocument()
  })

  it('D21 — narrowing the selection changes the bar and runs nothing', async () => {
    const user = userEvent.setup()
    renderApp(INSTANT)
    await screen.findByRole('table')
    await user.click(screen.getAllByRole('checkbox')[0]!)

    const before = (await waitFor(bar)).getAttribute('aria-label')
    await user.click(screen.getByRole('button', { name: /^Select only the \d+ eligible$/ }))
    await waitFor(() => expect(bar().getAttribute('aria-label')).not.toBe(before))
    expect(within(bar()).getByRole('button', { name: t('requests.bulk.claim') })).toBeEnabled()
  })
})

/* ═════════════════════════ §4.11 — the four states ══════════════════════ */

describe('§4.11 — the four states', () => {
  it('content: the queue lists its open work with a count in the header', async () => {
    const rows = await open('instant')
    renderApp(INSTANT)
    await screen.findByRole('table')
    expect(
      await screen.findByText(t('requests.meta.other', { count: String(rows.length) })),
    ).toBeInTheDocument()
  })

  it('loading: no table and no empty sentence while the read is in flight', async () => {
    renderApp(INSTANT)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByText(t('requests.empty.cleared.heading'))).not.toBeInTheDocument()
    await screen.findByRole('table')
  })

  it('error: the list states the failure and offers a retry, with the filters unchanged', async () => {
    mockFailures.always('requests.list')
    renderApp(INSTANT)
    expect(await screen.findByText(t('requests.error.list'))).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: EN['state.pageError.action'] as string }),
    ).toBeInTheDocument()
  })

  /**
   * AC-235, and the half of AC-234 this queue can reach. Every declared view
   * holds rows on the shipped fixtures, so the CLEARED sentence is unreachable
   * from this screen and is asserted on the shared adapter instead
   * (`queues/queueAdapter.test.tsx`).
   */
  it('AC-235 — empty: a search matching nothing states so and leaves the query editable', async () => {
    const user = userEvent.setup()
    renderApp(INSTANT)
    await screen.findByRole('table')
    const search = screen.getByPlaceholderText(t('requests.search'))
    await user.type(search, 'zzzznotarequest')

    expect(await screen.findByText(t('requests.empty.noMatch'))).toBeInTheDocument()
    expect(search).toHaveValue('zzzznotarequest')
  })
})

/* ═══════════════════════════ keyboard paths ═════════════════════════════ */

describe('§7.2 — the keyboard reaches every action and Escape returns focus', () => {
  it('Enter on a row control opens its confirmation, and Escape closes it', async () => {
    const user = userEvent.setup()
    const rows = await open('instant')
    const free = rows.find((row) => row.claim === null || row.claim.state !== 'claimed')!

    renderApp(INSTANT)
    await screen.findByRole('table')
    const opener = await screen.findByRole('link', {
      name: t('requests.a11y.open', { pickup: free.pickup, destination: free.destination }),
    })
    const close = within(opener.closest('tr')!).getByRole('button', {
      name: t('requests.action.expire'),
    })
    close.focus()
    await user.keyboard('{Enter}')
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  /**
   * §7.2 — the trigger is still mounted and is the same node, so Radix restores
   * focus to it. It could not while `ConfirmDialog` unmounted itself on close.
   */
  it('Escape closes the disposition confirmation and returns focus to the control that opened it', async () => {
    const user = userEvent.setup()
    const rows = await open('instant')
    const free = rows.find((row) => row.claim === null || row.claim.state !== 'claimed')!

    renderApp(INSTANT)
    await screen.findByRole('table')
    const opener = await screen.findByRole('link', {
      name: t('requests.a11y.open', { pickup: free.pickup, destination: free.destination }),
    })
    const close = within(opener.closest('tr')!).getByRole('button', {
      name: t('requests.action.expire'),
    })
    close.focus()
    await user.keyboard('{Enter}')
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(close).toHaveFocus())
  })

  it('the row actions are reachable by Tab without a hover', async () => {
    const user = userEvent.setup()
    const rows = await open('instant')
    const free = rows.find((row) => row.claim === null || row.claim.state !== 'claimed')!

    renderApp(INSTANT)
    await screen.findByRole('table')
    const opener = await screen.findByRole('link', {
      name: t('requests.a11y.open', { pickup: free.pickup, destination: free.destination }),
    })
    opener.focus()
    const row = opener.closest('tr')!
    const claim = within(row).getByRole('button', { name: t('queue.claim') })
    for (let step = 0; step < 12 && document.activeElement !== claim; step += 1) {
      await user.tab()
    }
    expect(claim).toHaveFocus()
  })
})

/* ══════════════════ AC-240 — the type, after T5.2 ═══════════════════════ */

describe("AC-240 — each row's type is legible without opening it", () => {
  it('the sub-tab names the channel and no `Type` column repeats it on every row', async () => {
    renderApp(INSTANT)
    await screen.findByRole('table')
    expect(
      screen.getByRole('heading', { name: EN['subtab.operations.rideRequests'] as string }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('columnheader', { name: t('queue.col.type') }),
    ).not.toBeInTheDocument()
  })
})
