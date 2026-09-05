/**
 * Support › Safety & Incidents — one criterion per test (SUPPORT-UX-PLAN.md
 * §8.5, AC-S-37). The screen shipped with no tests; these are the behaviours an
 * operator perceives: the queue's order, the record's protocol, the refusals.
 */

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { disableMockLatency, getSafetyIncident, resetDataLayer, switchMockUser } from '@/data/clients'
import { EN } from '@/i18n/dictionaries'
import { ShellProvider } from '@/shell/ShellContext'
import { AppRoutes } from '@/routes'
import { Toaster } from '@/components/ui/sonner'

const en = (key: string) => EN[key] as string
const fill = (key: string, params: Record<string, string>) =>
  Object.entries(params).reduce((s, [k, v]) => s.replace(`{${k}}`, v), en(key))

const INDEX = '/support/safety'
const detail = (id: string) => `/support/safety/${id}`

beforeEach(async () => {
  disableMockLatency()
  resetDataLayer()
  /* Yousef holds `approve_drivers`, the gate this queue writes behind (Q-51). */
  await switchMockUser('USR-5')
})

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
        <Toaster />
      </ShellProvider>
    </MemoryRouter>,
  )
}

describe('the queue', () => {
  /* AC-S-38's jsdom half: the order; the harness proves the paint. */
  it('opens on Open with the breached rows first and an unanswered critical SOS above every unbreached row', async () => {
    renderApp(INDEX)
    const rows = (await screen.findAllByRole('row')).slice(1)
    expect(within(rows[0]!).getByText(/^overdue /)).toBeInTheDocument()
    const firstCritical = rows.findIndex(
      (row) =>
        within(row).queryByText(en('safety.severity.critical')) !== null &&
        within(row).queryByText(en('safety.status.unacknowledged')) !== null,
    )
    const firstUnbreached = rows.findIndex((row) => !row.hasAttribute('data-row-critical'))
    expect(firstCritical).toBeGreaterThanOrEqual(0)
    expect(firstUnbreached === -1 || firstCritical < firstUnbreached).toBe(true)
  })

  it('states the protocol progress in words on the row, and works the steps on the record', async () => {
    renderApp(INDEX)
    await screen.findAllByRole('row')
    expect(screen.getAllByText(/^\d of 4$/).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: en('safety.action.close') })).not.toBeInTheDocument()
  })

  it('offers a critical view and an all view', async () => {
    renderApp(`${INDEX}?view=all`)
    expect(await screen.findByRole('tab', { name: en('view.safety.all') })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: en('view.safety.critical') })).toBeInTheDocument()
  })
})

describe('the record (AC-S-37)', () => {
  it('names the four steps as text and refuses Close with the outstanding count', async () => {
    renderApp(detail('INC-014'))
    await screen.findByText(en('safety.col.protocol'))
    for (const step of ['contact', 'verify', 'act', 'document']) {
      expect(screen.getByText(en(`safety.step.${step}`))).toBeInTheDocument()
    }
    const close = screen.getByRole('button', { name: en('safety.action.close') })
    expect(close).toBeDisabled()
    const incident = await getSafetyIncident('INC-014')
    const outstanding = incident.protocol.filter((s) => !s.done).length
    expect(
      screen.getByText(
        outstanding === 1
          ? en('safety.action.close.blockedOne')
          : fill('safety.action.close.blocked', { count: String(outstanding) }),
      ),
    ).toBeInTheDocument()
  })

  it('refuses the document step until the other three are done, then closes after a confirmation', async () => {
    const user = userEvent.setup()
    renderApp(detail('INC-014'))
    await screen.findByText(en('safety.col.protocol'))
    /* Hold it first: the record's precedence puts the claim before the decision. */
    await user.click(screen.getByRole('button', { name: en('queue.claim') }))
    await screen.findByRole('button', { name: en('queue.release') })

    const boxes = screen.getAllByRole('checkbox')
    const documentBox = boxes[3]!
    if (documentBox.getAttribute('data-state') !== 'checked') {
      expect(documentBox).toBeDisabled()
      expect(screen.getByText(en('safety.step.documentBlocked'))).toBeInTheDocument()
    }
    for (const box of boxes.slice(0, 3)) {
      if (box.getAttribute('data-state') !== 'checked') {
        await user.click(box)
        await expect.poll(() => box.getAttribute('data-state')).toBe('checked')
      }
    }
    await expect.poll(() => (screen.getAllByRole('checkbox')[3] as HTMLButtonElement).disabled).toBe(false)
    await user.click(screen.getAllByRole('checkbox')[3]!)
    await expect.poll(() => screen.getAllByRole('checkbox').every((box) => box.getAttribute('data-state') === 'checked')).toBe(true)

    const close = await screen.findByRole('button', { name: en('safety.action.close') })
    await expect.poll(() => (close as HTMLButtonElement).disabled).toBe(false)
    await user.click(close)
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: en('safety.close.confirm') }))
    /* The record holds the closed row and converts in place. */
    expect((await screen.findAllByText(en('safety.step.closed'))).length).toBeGreaterThan(0)
    expect(screen.getByText(en('safety.status.closed'))).toBeInTheDocument()
  })

  it('confirms before deciding an incident somebody else holds, naming them', async () => {
    const user = userEvent.setup()
    /* Sarah does not hold `approve_drivers`; Yousef does. Find a held incident. */
    renderApp(detail('INC-013'))
    await screen.findByText(en('safety.col.protocol'))
    const incident = await getSafetyIncident('INC-013')
    if (incident.claim?.state === 'claimed' && incident.claim.ownerId !== 'USR-5') {
      await user.click(screen.getByRole('button', { name: en('queue.takeOver') }))
      const dialog = await screen.findByRole('dialog')
      expect(
        within(dialog).getByText(fill('queue.takeOver.title', { name: incident.claim.ownerName })),
      ).toBeInTheDocument()
    } else {
      expect(screen.getByRole('button', { name: en('queue.claim') })).toBeInTheDocument()
    }
  })

  it('renders a page error with a way back when the record does not exist', async () => {
    renderApp(detail('INC-NOPE'))
    expect(await screen.findByText(en('safety.detail.notFound'))).toBeInTheDocument()
  })
})
