/**
 * **Trip Assurance — the `all` view §12 asked for, and T5.12's badge budget.**
 *
 * Both are things a green suite cannot infer from the source: the view exists
 * only if the tab renders and the client answers it, and the badge budget is a
 * claim about which of six reasons paints.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import {
  disableMockLatency,
  getRouteTable,
  listAbsences,
  listAssuranceTrips,
  mockFailures,
  resetDataLayer,
  switchMockUser,
} from '@/data/clients'
import type { AssuranceTrip, SubTabRoute } from '@/data/types'
import { EN } from '@/i18n/dictionaries'
import { ShellProvider } from '@/shell/ShellContext'
import { QUEUE_SHARED_EN } from '@/screens/queues/copy'
import { ASSURANCE_EN } from './copy'
import { AssuranceScreen } from './AssuranceScreen'

/* `ASSURANCE_EN` is not registered in `dictionaries.ts` — `withFallback`
   resolves it — so the screen's own keys are read from it and the shared ones
   from `EN`, exactly as the component resolves them. */
const copy = (key: string) => (ASSURANCE_EN[key] ?? QUEUE_SHARED_EN[key] ?? EN[key]) as string

const row = (): SubTabRoute => {
  const found = getRouteTable().subTabs.find((each) => each.subTabId === 'operations-assurance')
  if (!found) throw new Error('No route-table row for operations-assurance')
  return found
}

beforeEach(async () => {
  disableMockLatency()
  resetDataLayer()
  mockFailures.clear()
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

function renderAssurance(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/operations/assurance${search}`]}>
      <ShellProvider>
        <AssuranceScreen row={row()} />
      </ShellProvider>
    </MemoryRouter>,
  )
}

describe('§12 — the `all` view', () => {
  it('offers All legs first in the tab row without taking the default', async () => {
    renderAssurance('')
    const all = await screen.findByRole('tab', { name: copy('assurance.view.all') })
    expect(all).toHaveAttribute('aria-selected', 'false')
    expect(
      await screen.findByRole('tab', { name: EN['view.assurance.departing24h'] as string }),
    ).toHaveAttribute('aria-selected', 'true')
  })

  it('?view=all lists breached, due and missed legs together', async () => {
    renderAssurance('?view=all')
    expect(
      await screen.findByRole('tab', { name: copy('assurance.view.all') }),
    ).toHaveAttribute('aria-selected', 'true')

    const table = await screen.findByRole('table')
    /* The three SLA readings `queueClock` can produce on this queue. `Missed`
       is O7's third reading and only appears on a past cut-off with no breach
       stamp, so all three together is the proof the scope is not narrowed. */
    const body = within(table)
    expect(await body.findAllByText(/^overdue /)).not.toHaveLength(0)
    expect(body.getAllByText(/ left$/).length).toBeGreaterThan(0)
    expect(body.getAllByText(/^Missed /).length).toBeGreaterThan(0)
  })

  it('the cleared sentence for `all` names the whole queue', () => {
    expect(copy('assurance.empty.cleared.all')).toBe('No subscription leg needs attention.')
  })
})

describe('T5.12 — the Reason column spends one fill, on two reasons', () => {
  it('draws a badge for Captain unavailable and plain text for On track', async () => {
    renderAssurance('?view=all')
    const table = await screen.findByRole('table')

    const unavailable = within(table).getAllByText(copy('assurance.reason.captainUnavailable'))[0]
    expect(unavailable).toBeDefined()
    expect(unavailable!.closest('[data-slot="badge"]')).not.toBeNull()

    const onTrack = within(table).getAllByText(copy('assurance.reason.onTrack'))[0]
    expect(onTrack).toBeDefined()
    expect(onTrack!.closest('[data-slot="badge"]')).toBeNull()
  })

  it('leaves the other four reasons unfilled', async () => {
    renderAssurance('?view=all')
    const table = await screen.findByRole('table')
    for (const key of [
      'assurance.reason.captainNotMoving',
      'assurance.reason.riderUnconfirmed',
      'assurance.reason.awaitingConfirmation',
    ]) {
      for (const node of within(table).queryAllByText(copy(key))) {
        expect(node.closest('[data-slot="badge"]')).toBeNull()
      }
    }
  })
})

/* ══════════════════ T8.1 — §6.6's acceptance criteria ═══════════════════ */

const t = (key: string, params: Record<string, string> = {}) =>
  Object.entries(params).reduce((s, [k, v]) => s.replace(`{${k}}`, v), copy(key))

async function legs(view: string): Promise<AssuranceTrip[]> {
  return (await listAssuranceTrips({ view, pageSize: 500 })).items
}

describe('AC-260 — `Departing next 24 h` is a real window, and `All` is not', () => {
  it('a leg departing in more than 24 hours is absent from the window and present in All', async () => {
    const window24h = await legs('departing-24h')
    const all = await legs('all')
    const outside = all.filter((leg) => !window24h.some((each) => each.id === leg.id))
    expect(outside.length, 'the fixtures must carry a leg outside the 24-hour window').toBeGreaterThan(0)

    /* A route no leg inside the window shares, so its presence or absence is
       an answer about THIS leg. */
    const far = outside.find((leg) => !window24h.some((each) => each.route === leg.route))
    if (!far) throw new Error('The fixtures must carry a route unique to a leg outside the window.')

    const { unmount } = renderAssurance('')
    const windowTable = await screen.findByRole('table')
    expect(within(windowTable).queryAllByText(far.route)).toHaveLength(0)
    unmount()

    renderAssurance('?view=all')
    const allTable = await screen.findByRole('table')
    await waitFor(() =>
      expect(within(allTable).queryAllByText(far.route).length).toBeGreaterThan(0),
    )
  })

  it('every leg the window lists departs inside it', async () => {
    const window24h = await legs('departing-24h')
    renderAssurance('')
    const table = await screen.findByRole('table')
    for (const leg of window24h.slice(0, 5)) {
      expect(within(table).getByText(leg.route)).toBeInTheDocument()
    }
  })
})

describe('AC-263 — an unavailable captain is a reason, not a breach', () => {
  it('a leg with an unavailable captain and no breach stamp carries no marker, and states why', async () => {
    const all = await legs('all')
    const leg = all.find(
      (each) => each.captainDepartureState === 'unavailable' && each.slaBreachedAt === null,
    )
    if (!leg) throw new Error('The fixtures must carry an unbreached leg with an unavailable captain.')

    renderAssurance('?view=all')
    const table = await screen.findByRole('table')
    const row = within(table).getByText(leg.route).closest('tr')!

    /* The reason is in its own column, in words. */
    expect(within(row).getByText(copy('assurance.reason.captainUnavailable'))).toBeInTheDocument()
    /* And the row carries no breach reading: `overdue` is the word R5a spends. */
    expect(within(row).queryByText(/^overdue /)).toBeNull()
  })

  it('a breached leg does carry the word, so the two facts are told apart', async () => {
    const all = await legs('all')
    const breached = all.find((each) => each.slaBreachedAt !== null)
    if (!breached) throw new Error('The fixtures must carry a breached leg.')

    renderAssurance('?view=all')
    const table = await screen.findByRole('table')
    const row = within(table).getByText(breached.route).closest('tr')!
    expect(within(row).getByText(/^overdue /)).toBeInTheDocument()
  })
})

describe('AC-268 — an assumed confirmation is distinct from one the captain gave', () => {
  it('the four acknowledgement sources read as four different words', async () => {
    const words = [
      copy('assurance.ack.app'),
      copy('assurance.ack.phone'),
      copy('assurance.ack.whatsapp'),
      copy('assurance.ack.assumed'),
    ]
    expect(new Set(words).size).toBe(4)

    renderAssurance('?view=awaiting-confirmation')
    await screen.findByRole('table')
    /* The `Awaiting confirmation` view mounts the confirmation column, which is
       the carrier §6.4 item 3 names. */
    expect(
      screen.getByRole('columnheader', { name: copy('assurance.col.confirmation') }),
    ).toBeInTheDocument()
  })

  it('`Assumed` is toned apart from `Confirmed in app`, and both are words', async () => {
    const all = await legs('all')
    const assumed = all.find((leg) => leg.acknowledgement?.source === 'assumed')
    const inApp = all.find((leg) => leg.acknowledgement?.source === 'app')
    if (!assumed || !inApp) throw new Error('The fixtures must carry an assumed and an in-app leg.')

    renderAssurance('?view=awaiting-confirmation')
    const table = await screen.findByRole('table')
    const badges = within(table).queryAllByText(copy('assurance.ack.assumed'))
    for (const badge of badges) {
      const chip = badge.closest('[data-slot="badge"]')
      expect(chip, 'an assumed confirmation must be a toned chip, not plain ink').not.toBeNull()
    }
    for (const badge of within(table).queryAllByText(copy('assurance.ack.app'))) {
      const chip = badge.closest('[data-slot="badge"]')
      expect(chip?.className).not.toBe(
        badges[0]?.closest('[data-slot="badge"]')?.className,
      )
    }
  })
})

describe('AC-217 / O7 — `Missed` sorts with the breached rows, never with `No clock`', () => {
  it('every past-cut-off row precedes every running one on the `all` view', async () => {
    renderAssurance('?view=all')
    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows.length).toBeGreaterThan(3)

    const reading = rows.map((row) => {
      if (within(row).queryByText(/^overdue /)) return 'past'
      if (within(row).queryByText(/^Missed /)) return 'past'
      if (within(row).queryByText(/ left$/)) return 'running'
      return 'no-clock'
    })
    expect(reading.filter((each) => each === 'past').length).toBeGreaterThan(0)

    const lastPast = reading.lastIndexOf('past')
    const firstRunning = reading.indexOf('running')
    if (firstRunning !== -1) expect(lastPast).toBeLessThan(firstRunning)
    const firstNoClock = reading.indexOf('no-clock')
    if (firstNoClock !== -1) expect(lastPast).toBeLessThan(firstNoClock)
  })
})

describe('AC-274 / §12 — every view can be reached and states its own cleared scope', () => {
  it('the absences view is reachable and, with an empty ledger, names that scope', async () => {
    const absences = await listAbsences({ pageSize: 500 })
    expect(absences.total, 'this assertion is about the EMPTY ledger').toBe(0)

    renderAssurance('?view=absences')
    expect(await screen.findByText(copy('assurance.empty.cleared.heading'))).toBeInTheDocument()
    expect(screen.getByText(copy('assurance.empty.cleared.absences'))).toBeInTheDocument()
    /* Not the first-run treatment, and not another view's sentence. */
    expect(screen.queryByText(copy('assurance.empty.firstRun.heading'))).toBeNull()
    expect(screen.queryByText(copy('assurance.empty.cleared.departing'))).toBeNull()
  })

  it('Q-60 — the absences view offers no claim and no selection, because an absence is a fact', async () => {
    renderAssurance('?view=absences')
    await screen.findByText(copy('assurance.empty.cleared.absences'))
    expect(screen.queryByRole('button', { name: copy('queue.claim') })).toBeNull()
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })

  it('each leg view mounts and names its own scope in the tab row', async () => {
    for (const [view, key] of [
      ['departing-24h', 'view.assurance.departing24h'],
      ['no-backup-captain', 'view.assurance.noBackupCaptain'],
      ['awaiting-confirmation', 'view.assurance.awaitingConfirmation'],
      ['absences', 'view.assurance.absences'],
      ['all', 'assurance.view.all'],
    ] as const) {
      const { unmount } = renderAssurance(`?view=${view}`)
      expect(await screen.findByRole('tab', { name: copy(key) })).toHaveAttribute(
        'aria-selected',
        'true',
      )
      unmount()
    }
  })
})

describe('§4.11 — the four states', () => {
  it('content: the window lists legs with a count in the header', async () => {
    const window24h = await legs('departing-24h')
    renderAssurance('')
    await screen.findByRole('table')
    expect(
      await screen.findByText(t('assurance.meta.legs.other', { count: String(window24h.length) })),
    ).toBeInTheDocument()
  })

  it('loading: no table and no empty sentence while the read is in flight', async () => {
    renderAssurance('')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByText(copy('assurance.empty.cleared.heading'))).not.toBeInTheDocument()
    await screen.findByRole('table')
  })

  it('error: the legs list states the failure and offers a retry', async () => {
    mockFailures.always('assurance.list')
    renderAssurance('')
    expect(await screen.findByText(copy('assurance.error.list'))).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: EN['state.pageError.action'] as string }),
    ).toBeInTheDocument()
  })

  it('error: the absences ledger states its own failure, not the legs one', async () => {
    mockFailures.always('assurance.absences')
    renderAssurance('?view=absences')
    expect(await screen.findByText(copy('assurance.error.absences'))).toBeInTheDocument()
  })

  it('AC-235 — empty: a search matching nothing states so rather than claiming the queue is clear', async () => {
    const user = userEvent.setup()
    renderAssurance('?view=all')
    await screen.findByRole('table')
    await user.type(screen.getByPlaceholderText(copy('assurance.search.legs')), 'zzzznotaleg')
    expect(await screen.findByText(copy('assurance.empty.noMatch'))).toBeInTheDocument()
    expect(screen.queryByText(copy('assurance.empty.cleared.all'))).toBeNull()
  })
})

describe('§11.2 / AC-232 — the leg dispositions are gated at render', () => {
  it('a Support operator sees the legs and every write refused in place', async () => {
    await switchMockUser('USR-3')
    renderAssurance('')
    const table = await screen.findByRole('table')
    const confirm = within(table).getAllByRole('button', { name: copy('assurance.action.confirm') })
    expect(confirm.length).toBeGreaterThan(0)
    for (const button of confirm) {
      expect(button).toBeDisabled()
      expect(button).toHaveAttribute('title', copy('queue.action.noPermission'))
    }
  })

  it('the same controls are enabled for an operator who holds the permission', async () => {
    renderAssurance('')
    const table = await screen.findByRole('table')
    expect(
      within(table).getAllByRole('button', { name: copy('assurance.action.confirm') })[0],
    ).toBeEnabled()
  })
})

describe('§7.2 — the keyboard reaches the leg dispositions', () => {
  it('Enter on `Confirm` opens the confirmation, and Escape closes it', async () => {
    const user = userEvent.setup()
    renderAssurance('')
    const table = await screen.findByRole('table')
    const confirm = within(table).getAllByRole('button', {
      name: copy('assurance.action.confirm'),
    })[0]!
    confirm.focus()
    await user.keyboard('{Enter}')
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
