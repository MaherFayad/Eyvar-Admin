/**
 * The top bar's availability control (SUPPORT-UX-PLAN.md §6.3, §6.4): one
 * criterion per test. Sarah (`USR-1`) is online and holds live chats.
 */

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { disableMockLatency, getRouteTable, listAgentPresence, listConversations, resetDataLayer } from '@/data/clients'
import { resetDefaultUiStores } from '@/lib'
import { EN } from '@/i18n/dictionaries'
import { AppLayout } from './AppLayout'
import { ShellProvider } from './ShellContext'
import { Toaster } from '@/components/ui/sonner'

const table = getRouteTable()
const en = (key: string) => EN[key] as string
const fill = (key: string, params: Record<string, string>) =>
  Object.entries(params).reduce((s, [k, v]) => s.replace(`{${k}}`, v), en(key))

beforeAll(() => {
  const proto = window.HTMLElement.prototype as unknown as Record<string, unknown>
  proto.hasPointerCapture ??= () => false
  proto.setPointerCapture ??= () => {}
  proto.releasePointerCapture ??= () => {}
  proto.scrollIntoView ??= () => {}
})

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  resetDefaultUiStores()
})

function renderShell(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider>
        <Routes>
          <Route element={<AppLayout />}>
            {table.subTabs.map((row) => (
              <Route key={row.path} path={row.path} element={<div>screen: {row.subTabId}</div>} />
            ))}
          </Route>
        </Routes>
        <Toaster />
      </ShellProvider>
    </MemoryRouter>,
  )
}

const control = (state: string) =>
  screen.findByRole('button', { name: fill('shell.presence.label', { state: en(`shell.presence.${state}`) }) })

describe('availability in the top bar (§6.3)', () => {
  it('shows the signed-in operator their state and lets them go away from any page', async () => {
    const user = userEvent.setup()
    renderShell('/operations/people')
    await user.click(await control('online'))
    await user.click(await screen.findByRole('menuitemradio', { name: en('shell.presence.away') }))
    expect(await control('away')).toBeInTheDocument()
    const roster = await listAgentPresence()
    expect(roster.find((a) => a.userId === 'USR-1')?.state).toBe('away')
  })
})

describe('handover on going offline (§6.4)', () => {
  it('asks who takes the held chats, hands them over, and only then goes offline', async () => {
    const user = userEvent.setup()
    const before = await listConversations({ view: 'mine', channel: 'chat', pageSize: 50 })
    expect(before.total).toBeGreaterThan(0)

    renderShell('/operations/people')
    await user.click(await control('online'))
    await user.click(await screen.findByRole('menuitemradio', { name: en('shell.presence.offline') }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText(en('shell.presence.handover.title'))).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: en('shell.presence.handover.confirm') })).toBeDisabled()

    await user.click(within(dialog).getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: /Lina Al-Otaibi/ }))
    await user.click(within(dialog).getByRole('button', { name: en('shell.presence.handover.confirm') }))

    expect(await control('offline')).toBeInTheDocument()
    const after = await listConversations({ view: 'mine', channel: 'chat', pageSize: 50 })
    expect(after.total).toBe(0)
    const roster = await listAgentPresence()
    expect(roster.find((a) => a.userId === 'USR-3')?.activeCount).toBeGreaterThanOrEqual(before.total)
  })

  it('lets the operator keep the chats and go offline anyway', async () => {
    const user = userEvent.setup()
    renderShell('/operations/people')
    await user.click(await control('online'))
    await user.click(await screen.findByRole('menuitemradio', { name: en('shell.presence.offline') }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: en('shell.presence.handover.keep') }))
    expect(await control('offline')).toBeInTheDocument()
    const mine = await listConversations({ view: 'mine', channel: 'chat', pageSize: 50 })
    expect(mine.total).toBeGreaterThan(0)
  })
})
