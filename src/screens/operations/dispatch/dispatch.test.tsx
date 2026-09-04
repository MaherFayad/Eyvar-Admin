/**
 * Live Dispatch — the four states, the layers, the link between the list and
 * the map, the clock (T1.3), the two intervention writes (T1.2), the keyed feed
 * (T4.2) and the frame control (T2.2).
 *
 * Everything is read through the client seam: `mockFailures` can only reach a
 * screen that goes through it, so a passing error assertion IS the seam
 * assertion. A test that imports a fixture would prove nothing.
 */

import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import {
  disableMockLatency,
  getDispatchTelemetry,
  getRouteTable,
  listInterventions,
  listRequests,
  mockFailures,
  resetDataLayer,
} from '@/data/clients'
import { ApiError, type Intervention, type RideRequest, type SubTabRoute } from '@/data/types'
import { resetClock } from '@/hooks'
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

describe('T1.1 — the three header figures come from a read, not a literal', () => {
  it('prints the telemetry the client serves, formatted', async () => {
    renderDispatch()
    const telemetry = await getDispatchTelemetry()

    /* The exact figures the client returned, not the `'42s'` / `'96.4%'`
       strings the screen used to hold. If the fixture moves, so does this. */
    expect(
      await screen.findByText(
        fill('dispatch.reading.seconds', { seconds: String(telemetry.medianMatchSeconds) }),
      ),
    ).toBeInTheDocument()
    expect(screen.getByText(`${telemetry.autoMatchPercent}%`)).toBeInTheDocument()
    expect(screen.getByText(`${telemetry.fleetUtilisationPercent}%`)).toBeInTheDocument()
  })

  it('says how old the board is, and claims nothing about a connection', async () => {
    renderDispatch()

    expect(
      await screen.findByText(fill('dispatch.meta', { seconds: '0' })),
    ).toBeInTheDocument()
    /* X4 — the sentence that was a claim. */
    expect(screen.queryByText(/live telemetry connected/i)).not.toBeInTheDocument()
  })

  it('renders no figure at all when the read fails', async () => {
    mockFailures.always('dispatch.telemetry')
    renderDispatch()
    await screen.findByRole('img', { name: /trips in flight/i })
    expect(screen.queryByText(copy('dispatch.reading.matchTime'))).not.toBeInTheDocument()
  })
})

describe('T1.3 — the board ticks on the shell clock', () => {
  afterEach(() => {
    vi.useRealTimers()
    resetClock()
  })

  it('ages the meta line a second at a time', async () => {
    /* Installed before the render: the one interval starts on the first
       subscriber, and a clock the test replaced afterwards is not that one. */
    vi.useFakeTimers()
    renderDispatch()
    await screen.findByText(fill('dispatch.meta', { seconds: '0' }))

    await act(async () => {
      vi.advanceTimersByTime(5_000)
    })

    expect(screen.getByText(fill('dispatch.meta', { seconds: '5' }))).toBeInTheDocument()
  })

  it('re-reads the feeds when the refresh bucket turns over', async () => {
    vi.useFakeTimers()
    renderDispatch()
    await screen.findByRole('img', { name: /trips in flight/i })

    /* Rigged only AFTER the first read landed, so reaching the error state can
       only mean the screen asked the client again. */
    mockFailures.always('trips.list')
    await act(async () => {
      vi.advanceTimersByTime(20_000)
    })

    expect(
      await screen.findByText(fill('state.pageError.title', { resource: copy(row().titleKey) })),
    ).toBeInTheDocument()
  })
})

describe('T1.2 — the two intervention controls are writes now', () => {
  /** Open the alert strip and hand back the first open intervention. */
  async function openInterventions(user: ReturnType<typeof userEvent.setup>) {
    const items = await listInterventions({ status: 'open' })
    const [first] = items
    if (!first) throw new Error('Fixtures carry no open intervention.')
    await user.click(
      await screen.findByRole('button', {
        name: new RegExp(fill('dispatch.interventions.strip', { count: String(items.length) })),
      }),
    )
    return first
  }

  const titleOf = (item: Intervention) =>
    fill(`dispatch.intervention.${item.kind}`, { trip: item.tripId ?? item.riderName })

  it('acknowledging one takes it off the open list', async () => {
    const user = userEvent.setup()
    renderDispatch()
    const first = await openInterventions(user)
    const title = await screen.findByText(titleOf(first))
    expect(title).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: copy('dispatch.dismissAlert') })[0]!)

    await waitFor(() => {
      expect(screen.queryByText(titleOf(first))).not.toBeInTheDocument()
    })
  })

  it('states the 409 on the row that refused, and stops offering the act', async () => {
    const user = userEvent.setup()
    renderDispatch()
    const first = await openInterventions(user)
    await screen.findByText(titleOf(first))

    mockFailures.once(
      'dispatch.acknowledgeIntervention',
      new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'already_acknowledged',
        message: 'USR-9 acknowledged it',
        retryable: false,
      }),
    )
    const acknowledge = screen.getAllByRole('button', {
      name: copy('dispatch.dismissAlert'),
    })[0]!
    await user.click(acknowledge)

    expect(
      await screen.findByText(copy('dispatch.intervention.refusal.already_acknowledged')),
    ).toBeInTheDocument()
    /* §11.2 — refused in place: the row keeps its control and the control
       refuses, rather than the row disappearing as if the act had run. */
    expect(screen.getByText(titleOf(first))).toBeInTheDocument()
    expect(acknowledge).toBeDisabled()
  })

  it('reassigning one to another captain takes it off the open list', async () => {
    const user = userEvent.setup()
    renderDispatch()
    const first = await openInterventions(user)
    await screen.findByText(titleOf(first))

    await user.click(screen.getAllByRole('button', { name: copy('dispatch.reassignCaptain') })[0]!)
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('combobox'))
    const options = await screen.findAllByRole('option')
    /* A captain who is not the one already on it — that raises `same_driver`. */
    const other = options.find((option) => !(option.textContent ?? '').includes(first.driverName ?? ' '))
    if (!other) throw new Error('The picker offers no second captain.')
    await user.click(other)
    await user.click(within(dialog).getByRole('button', { name: copy('dispatch.reassignCaptain') }))

    await waitFor(() => {
      expect(screen.queryByText(titleOf(first))).not.toBeInTheDocument()
    })
  })
})

describe('T4.2 — the feed reads its enums through keys', () => {
  it('prints the channel and the vehicle class as words, not slugs', async () => {
    renderDispatch()
    await screen.findByRole('img', { name: /trips in flight/i })

    expect(screen.getAllByText(copy('requests.channel.instant')).length).toBeGreaterThan(0)
    expect(screen.queryByText('instant')).not.toBeInTheDocument()
    expect(screen.queryByText('subscription')).not.toBeInTheDocument()
  })
})

describe('T2.2 — Fit to fleet re-frames the board', () => {
  it('moves the marks, and pressing it again gives the declared frame back', async () => {
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
    const positionOf = () => (pin.closest('li') as HTMLElement).style.insetInlineStart
    const declared = positionOf()

    const fit = screen.getByRole('button', { name: copy('dispatch.map.fit') })
    await user.click(fit)

    expect(fit).toHaveAttribute('aria-pressed', 'true')
    expect(positionOf()).not.toBe(declared)

    await user.click(fit)
    expect(positionOf()).toBe(declared)
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
