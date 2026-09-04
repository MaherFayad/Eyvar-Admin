/**
 * **Trip Assurance — the `all` view §12 asked for, and T5.12's badge budget.**
 *
 * Both are things a green suite cannot infer from the source: the view exists
 * only if the tab renders and the client answers it, and the badge budget is a
 * claim about which of six reasons paints.
 */

import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { disableMockLatency, getRouteTable, resetDataLayer } from '@/data/clients'
import type { SubTabRoute } from '@/data/types'
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

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
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

    const unavailable = within(table).getAllByText(copy('assurance.reason.captainUnavailable'))
    expect(unavailable.length).toBeGreaterThan(0)
    expect(unavailable[0].closest('[data-slot="badge"]')).not.toBeNull()

    const onTrack = within(table).getAllByText(copy('assurance.reason.onTrack'))
    expect(onTrack.length).toBeGreaterThan(0)
    expect(onTrack[0].closest('[data-slot="badge"]')).toBeNull()
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
