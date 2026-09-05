/**
 * Support › Overview › the desk (SUPPORT-UX-PLAN.md §6.2, §6.5): one criterion per test.
 */

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { disableMockLatency, getTicket, listTickets, resetDataLayer, switchMockUser } from '@/data/clients'
import { EN } from '@/i18n/dictionaries'
import { ShellProvider } from '@/shell/ShellContext'
import { AppRoutes } from '@/routes'
import { Toaster } from '@/components/ui/sonner'

const en = (key: string) => EN[key] as string

beforeEach(async () => {
  disableMockLatency()
  resetDataLayer()
  await switchMockUser('USR-1')
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

describe('the desk above the board', () => {
  it('names who is on call, what is waiting, and who is on shift', async () => {
    renderApp('/support/overview')
    const desk = (await screen.findByText(en('desk.title'))).closest('[data-slot="card"]') ?? document.body
    expect(await within(desk as HTMLElement).findByText(en('desk.queue.unassignedTickets'))).toBeInTheDocument()
    expect(within(desk as HTMLElement).getByText(en('desk.onCall'))).toBeInTheDocument()
    expect(within(desk as HTMLElement).getByText('Lina Al-Otaibi')).toBeInTheDocument()
  })

  it('Take next claims the most urgent unheld ticket for me and opens it', async () => {
    const user = userEvent.setup()
    const waiting = await listTickets({ view: 'unassigned', sort: { field: 'urgency', dir: 'asc' }, pageSize: 1 })
    const expected = waiting.items[0]!
    renderApp('/support/overview')
    await user.click(await screen.findByRole('button', { name: en('desk.takeNext') }))
    expect(await screen.findByText(en('desk.takeNext.done').replace('{id}', expected.id))).toBeInTheDocument()
    expect((await getTicket(expected.id)).ownerId).toBe('USR-1')
    expect(await screen.findByText(en('ticket.sla.heading'), {}, { timeout: 8000 })).toBeInTheDocument()
  })
})
