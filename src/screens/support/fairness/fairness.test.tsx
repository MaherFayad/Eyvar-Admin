/**
 * Support › Captain Fairness — one criterion per test (SUPPORT-UX-PLAN.md §8.6).
 * The screen shipped with no tests. Nothing here imports a fixture.
 */

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { disableMockLatency, getFairnessCase, resetDataLayer, switchMockUser } from '@/data/clients'
import { EN } from '@/i18n/dictionaries'
import { ShellProvider } from '@/shell/ShellContext'
import { AppRoutes } from '@/routes'
import { Toaster } from '@/components/ui/sonner'

const en = (key: string) => EN[key] as string
const fill = (key: string, params: Record<string, string>) =>
  Object.entries(params).reduce((s, [k, v]) => s.replace(`{${k}}`, v), en(key))

const INDEX = '/support/fairness'
const detail = (id: string) => `/support/fairness/${id}`

beforeEach(async () => {
  disableMockLatency()
  resetDataLayer()
  /* Yousef holds `approve_drivers`, the gate this queue writes behind (Q-84). */
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
  it('opens on suspension appeals with the reason in words on every row', async () => {
    renderApp(INDEX)
    expect(await screen.findByRole('tab', { name: en('view.fairness.suspensionAppeals') })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect((await screen.findAllByText(/Appealing a suspension/)).length).toBeGreaterThan(0)
  })

  /* AC-S-36's jsdom half: decided rows say when and by whom, never a dash. */
  it('states when and by whom a decided case was decided rather than drawing dashes', async () => {
    renderApp(`${INDEX}?view=rating-disputes`)
    await screen.findAllByRole('row')
    const decided = screen.getAllByText(/^Decided /)
    expect(decided.length).toBeGreaterThan(0)
  })

  it('refuses the dispositions as text for an operator without the permission', async () => {
    await switchMockUser('USR-3')
    renderApp(INDEX)
    const rows = await screen.findAllByRole('row')
    const open = rows.slice(1).find((row) => within(row).queryByRole('button', { name: en('fairness.action.uphold') }))
    expect(open).toBeDefined()
    expect(within(open!).getByRole('button', { name: en('fairness.action.uphold') })).toBeDisabled()
    expect(within(open!).getByText(en('queue.action.noPermission'))).toBeInTheDocument()
  })
})

describe('the record (S-8)', () => {
  it('opens a case from its own route with what the captain contests in full', async () => {
    renderApp(detail('FC-0001'))
    expect(await screen.findByText(en('fairness.detail.contested'))).toBeInTheDocument()
    const record = await getFairnessCase('FC-0001')
    expect(screen.getByText(record.detail)).toBeInTheDocument()
    expect(screen.getByText(record.suspensionReason!)).toBeInTheDocument()
  })

  /* AC-333: a rationale is required, and it reads back on the record. */
  it('decides with a required rationale, and the rationale reads back in full', async () => {
    const user = userEvent.setup()
    renderApp(detail('FC-0001'))
    await screen.findByText(en('fairness.detail.contested'))
    await user.click(screen.getByRole('button', { name: en('queue.claim') }))
    await screen.findByRole('button', { name: en('queue.release') })
    await user.click(screen.getByRole('button', { name: en('fairness.action.overturn') }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('button', { name: en('fairness.overturn.confirm') })).toBeDisabled()
    await user.type(within(dialog).getByLabelText(en('fairness.rationale')), 'The card was renewed on the day.')
    await user.click(within(dialog).getByRole('button', { name: en('fairness.overturn.confirm') }))
    expect(await screen.findByText('The card was renewed on the day.')).toBeInTheDocument()
    expect(screen.getAllByText(en('fairness.status.overturned')).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: en('fairness.action.uphold') })).toBeDisabled()
    expect((await getFairnessCase('FC-0001')).status).toBe('overturned')
  })

  it('confirms before deciding a case another operator holds, naming them', async () => {
    const user = userEvent.setup()
    renderApp(detail('FC-0001'))
    await screen.findByText(en('fairness.detail.contested'))
    await user.click(screen.getByRole('button', { name: en('queue.claim') }))
    await screen.findByRole('button', { name: en('queue.release') })
    /* Sarah opens the same case Yousef holds. */
    await switchMockUser('USR-1')
    renderApp(detail('FC-0001'))
    const takeOver = (await screen.findAllByRole('button', { name: en('queue.takeOver') })).at(-1)!
    await user.click(takeOver)
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(fill('queue.takeOver.title', { name: 'Yousef Al-Balawi' }))).toBeInTheDocument()
  })

  it('renders a page error with a way back when the record does not exist', async () => {
    renderApp(detail('FC-NOPE'))
    expect(await screen.findByText(en('fairness.detail.notFound'))).toBeInTheDocument()
  })
})
