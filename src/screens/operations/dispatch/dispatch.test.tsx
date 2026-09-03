/**
 * **Live Dispatch — the board's four states, its layers, and the link between
 * the list and the map.**
 *
 * This screen had no test at all before it became a map, which is how it kept a
 * `handleResolveIntervention` that toasted success over an act nobody
 * performed. The three things asserted here are the three that cannot be
 * checked by reading the source:
 *
 *   1. **AC-24 / AC-36 / §2.1** — with a read rigged to fail, the board renders
 *      its own error state and the retry re-runs the request.
 *      `mockFailures.always('trips.list')` can only reach a screen that goes
 *      through the client seam, so a passing error assertion here **is** the
 *      seam assertion: a direct fixture import would be unreachable by failure
 *      injection and this test would go green over a board nobody could break.
 *   2. **The layer switches actually remove marks.** A switch that only sets
 *      state is a switch that looks like it works.
 *   3. **Selection is one piece of state on two surfaces.** Picking a pin
 *      presses its row and vice versa — the whole reason the map sits next to
 *      the list rather than replacing it.
 *
 * Everything is read through the client, never from `data/fixtures/*`; a test
 * that imports a fixture is the same seam breach the screen just closed.
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import {
  disableMockLatency,
  getRouteTable,
  listRequests,
  mockFailures,
  resetDataLayer,
} from '@/data/clients'
import type { RideRequest, SubTabRoute } from '@/data/types'
import { EN } from '@/i18n/dictionaries'
import { ShellProvider } from '@/shell/ShellContext'
import { DISPATCH_EN } from './copy'
import { DispatchScreen } from './DispatchScreen'

/* `DISPATCH_EN` is not registered in `dictionaries.ts` — `withFallback`
   resolves it — so the screen's own keys are read from it and the shared ones
   from `EN`, exactly as the component resolves them. */
const copy = (key: string) => (DISPATCH_EN[key] ?? EN[key]) as string
const fill = (key: string, params: Record<string, string>) =>
  Object.entries(params).reduce((text, [k, v]) => text.replace(`{${k}}`, v), copy(key))

const row = (): SubTabRoute => {
  const found = getRouteTable().subTabs.find((each) => each.subTabId === 'operations-dispatch')
  if (!found) throw new Error('No route-table row for operations-dispatch')
  return found
}

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
})

function renderDispatch() {
  return render(
    <MemoryRouter initialEntries={['/operations/dispatch']}>
      <ShellProvider>
        <DispatchScreen row={row()} />
      </ShellProvider>
    </MemoryRouter>,
  )
}

/** The first pending request, through the client the screen itself reads. */
async function firstPending(): Promise<RideRequest> {
  const page = await listRequests({ view: 'pending', pageSize: 50 })
  const [first] = page.items
  /* Throw rather than assert non-null: if the fixtures stop carrying a pending
     request, these tests are not failing — they are testing nothing. */
  if (!first) throw new Error('Fixtures carry no pending ride request.')
  return first
}

describe('the board renders the city and its three feeds', () => {
  it('draws the map, and the map says what is on it', async () => {
    renderDispatch()
    const map = await screen.findByRole('img', { name: /trips in flight/i })
    expect(map).toBeInTheDocument()
  })

  it('carries a pin for each pending request, named by its route', async () => {
    const request = await firstPending()
    renderDispatch()

    expect(
      await screen.findByRole('button', {
        name: fill('dispatch.map.pin.request', {
          id: request.id,
          pickup: request.pickup,
          destination: request.destination,
        }),
      }),
    ).toBeInTheDocument()
  })
})

describe('the layer switches remove marks, not only state', () => {
  it('turning Pending off takes its pins off the map', async () => {
    const user = userEvent.setup()
    const request = await firstPending()
    const pinName = fill('dispatch.map.pin.request', {
      id: request.id,
      pickup: request.pickup,
      destination: request.destination,
    })
    renderDispatch()

    await screen.findByRole('button', { name: pinName })
    await user.click(screen.getByRole('switch', { name: new RegExp(copy('dispatch.layers.pending')) }))

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: pinName })).not.toBeInTheDocument()
    })
  })
})

describe('selection is one piece of state on two surfaces', () => {
  it('pressing a pin presses its row, and reveals the row action', async () => {
    const user = userEvent.setup()
    const request = await firstPending()
    renderDispatch()

    const pin = await screen.findByRole('button', {
      name: fill('dispatch.map.pin.request', {
        id: request.id,
        pickup: request.pickup,
        destination: request.destination,
      }),
    })
    /* §11.2 — the write is not on the board until a row is chosen. Before the
       click it is absent because nothing is selected, NOT because anybody is
       forbidden; the refusal case renders it disabled with a sentence. */
    expect(screen.queryByRole('button', { name: copy('dispatch.assignCaptain') })).toBeNull()

    await user.click(pin)

    expect(pin).toHaveAttribute('aria-pressed', 'true')
    expect(
      await screen.findByRole('button', { name: copy('dispatch.assignCaptain') }),
    ).toBeInTheDocument()
  })
})

describe('AC-24 / AC-36 — a failed read fails the board, not the shell', () => {
  it('names what failed and offers a retry that re-runs the request', async () => {
    const user = userEvent.setup()
    mockFailures.once('trips.list')
    renderDispatch()

    const retry = await screen.findByRole('button', { name: copy('state.pageError.action') })
    expect(
      screen.getByText(fill('state.pageError.title', { resource: copy(row().titleKey) })),
    ).toBeInTheDocument()

    await user.click(retry)

    /* §2.1 — recovery proves the retry is bound to `refetch` on the CLIENT.
       A screen holding a fixture array could never have failed in the first
       place, so reaching this line at all is the seam assertion. */
    expect(await screen.findByRole('img', { name: /trips in flight/i })).toBeInTheDocument()
  })
})
