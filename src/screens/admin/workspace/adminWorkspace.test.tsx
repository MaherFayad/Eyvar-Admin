/**
 * Admin › Workspace — the pane that was 231 lines of `useState`.
 *
 * The four assertions that matter, and why each is not satisfied by the screen
 * it replaces:
 *
 *   1. **It reads a client.** The old screen seeded every field from a string
 *      literal, so a `?mockFail=` could not reach it and neither could a real
 *      API. `mockFailures.always('workspace.get')` now produces the error
 *      state, which is the cheapest proof that the read is real.
 *   2. **The save is real.** Change a field, save, re-mount, and the change is
 *      there. The `setTimeout(…, 300)` would have passed a test that only
 *      looked for the toast.
 *   3. **The logo button does something.** It had no `onClick` at all. The
 *      assertion is that the store changes, because a button that opens a file
 *      picker and drops the result is the same defect wearing a dialog.
 *   4. **Re-consent states a number.** It was an inline `toast.success`
 *      claiming an act that never happened; it now reports what was queued, and
 *      is refused in place when there is nobody to queue.
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  disableMockLatency,
  getRouteTable,
  getWorkspaceSettings,
  listAuditEntries,
  mockFailures,
  resetDataLayer,
  resetWorkspace,
  switchMockUser,
} from '@/data/clients'
import type { SubTabRoute } from '@/data/types'
import { ShellProvider, useShell } from '@/shell/ShellContext'
import { AdminWorkspaceScreen } from './AdminWorkspaceScreen'
import { ADMIN_WORKSPACE_EN } from './copy'

const row = (): SubTabRoute => {
  const found = getRouteTable().subTabs.find((each) => each.subTabId === 'admin-workspace')
  if (!found) throw new Error('No route-table row for admin-workspace')
  return found
}

/** See `adminTeam.test.tsx` — the bar is `AppLayout`'s chrome; the model is the contract. */
function SaveBarProbe() {
  const shell = useShell()
  if (shell.saveBar === null) return null
  return (
    <button type="button" disabled={!shell.saveBar.canSave} onClick={shell.saveBar.onSave}>
      probe-save
    </button>
  )
}

beforeEach(async () => {
  disableMockLatency()
  resetDataLayer()
  resetWorkspace()
  mockFailures.clear()
  await switchMockUser('USR-1')
})

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/admin/workspace']}>
      <ShellProvider>
        <AdminWorkspaceScreen row={row()} />
        <SaveBarProbe />
      </ShellProvider>
    </MemoryRouter>,
  )
}

const text = (key: keyof typeof ADMIN_WORKSPACE_EN) => ADMIN_WORKSPACE_EN[key] as string

describe('the four states', () => {
  it('renders the settings the CLIENT returns, not a literal', async () => {
    renderScreen()
    /* The legacy values, not the invented ones the old screen shipped:
       `support@eyvar.app` (`:2570`), not `support@eyvar.com`. */
    expect(await screen.findByDisplayValue('support@eyvar.app')).toBeInTheDocument()
    expect(screen.getByDisplayValue('+966 11 000 0000')).toBeInTheDocument()
  })

  it('reaches the error state, which a screen of literals could not', async () => {
    mockFailures.always('workspace.get')
    renderScreen()
    expect(await screen.findByText(text('admin.workspace.error'))).toBeInTheDocument()
  })

  it('offers a retry that re-runs the read', async () => {
    const user = userEvent.setup()
    mockFailures.once('workspace.get')
    renderScreen()
    await user.click(await screen.findByRole('button', { name: 'Try again' }))
    expect(await screen.findByDisplayValue('support@eyvar.app')).toBeInTheDocument()
  })
})

describe('the save is real', () => {
  it('persists a changed support email across a re-mount, and audits it', async () => {
    const user = userEvent.setup()
    const view = renderScreen()

    const field = await screen.findByLabelText(text('admin.workspace.supportEmail'))
    await user.clear(field)
    await user.type(field, 'help@eyvar.app')
    await user.click(await screen.findByRole('button', { name: 'probe-save' }))

    await waitFor(async () =>
      expect((await getWorkspaceSettings()).supportEmail).toBe('help@eyvar.app'),
    )
    /* AC-950 — one audit entry naming the pane and the field. */
    const entries = (await listAuditEntries({ action: 'workspace.update' })).items
    expect(entries).toHaveLength(1)
    expect(entries[0]?.detail.params?.['fields']).toContain('supportEmail')

    view.unmount()
    renderScreen()
    expect(await screen.findByDisplayValue('help@eyvar.app')).toBeInTheDocument()
  })

  it('puts a 422 under the field the server named, and does not save', async () => {
    const user = userEvent.setup()
    renderScreen()

    const field = await screen.findByLabelText(text('admin.workspace.supportEmail'))
    await user.clear(field)
    await user.type(field, 'not-an-email')
    await user.click(await screen.findByRole('button', { name: 'probe-save' }))

    expect(
      await screen.findByText('Enter an email address riders can reply to.'),
    ).toBeInTheDocument()
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect((await getWorkspaceSettings()).supportEmail).toBe('support@eyvar.app')
  })
})

describe('the logo button, which had no handler at all', () => {
  it('uploads a file into the ONE logo store, and audits it', async () => {
    const user = userEvent.setup()
    renderScreen()

    const button = await screen.findByRole('button', { name: text('admin.workspace.logo.upload') })
    expect(button).toBeEnabled()

    /* The button opens the input; in jsdom the file is put on the input
       directly, which is what `userEvent.upload` does on the real control. */
    const input = document.querySelector('input[type="file"]')
    if (!(input instanceof HTMLInputElement)) throw new Error('No file input behind the button')
    await user.upload(input, new File(['<svg/>'], 'eyvar.svg', { type: 'image/svg+xml' }))

    await waitFor(async () => expect((await getWorkspaceSettings()).logo.fileName).toBe('eyvar.svg'))
    expect((await listAuditEntries({ action: 'workspace.logo' })).items).toHaveLength(1)

    /* One store: the row now offers `Replace` and `Remove`, and there is no
       second logo field anywhere on the pane. */
    expect(
      await screen.findByRole('button', { name: text('admin.workspace.logo.replace') }),
    ).toBeInTheDocument()
  })

  it('refuses an over-sized file without writing anything', async () => {
    const user = userEvent.setup()
    renderScreen()
    await screen.findByRole('button', { name: text('admin.workspace.logo.upload') })

    const input = document.querySelector('input[type="file"]')
    if (!(input instanceof HTMLInputElement)) throw new Error('No file input behind the button')
    /* 201 KB — one kilobyte over the legacy cap at `:7964`. */
    const oversized = new File([new Uint8Array(201 * 1024)], 'big.png', { type: 'image/png' })
    await user.upload(input, oversized)

    await waitFor(async () => expect((await getWorkspaceSettings()).logo.dataUrl).toBeNull())
  })
})

describe('re-consent states a number instead of claiming one', () => {
  it('queues the pending accounts and reports how many', async () => {
    const user = userEvent.setup()
    renderScreen()

    /* Terms of service — 214 accounts on an older version. */
    const buttons = await screen.findAllByRole('button', {
      name: text('admin.workspace.legal.queue'),
    })
    expect(buttons[0]).toBeEnabled()
    await user.click(buttons[0]!)

    await waitFor(async () =>
      expect((await listAuditEntries({ action: 'legal.reconsent' })).items).toHaveLength(1),
    )
    const entry = (await listAuditEntries({ action: 'legal.reconsent' })).items[0]
    expect(entry?.detail.params?.['count']).toBe(214)
  })

  it('refuses in place, with its reason, when everybody is already current', async () => {
    renderScreen()
    /* `driverAgreement` is seeded at zero pending — a legal, reachable state
       that is not the same as "we could not send them". */
    expect(
      await screen.findByText(text('admin.workspace.legal.refusal.allCurrent')),
    ).toBeInTheDocument()
    const buttons = screen.getAllByRole('button', { name: text('admin.workspace.legal.queue') })
    expect(buttons[2]).toBeDisabled()
    expect(buttons[2]?.getAttribute('aria-describedby')).toBeTruthy()
  })
})

describe('§11.2 — a role that cannot configure the workspace', () => {
  it('states the refusal once and disables every write in place', async () => {
    /* `USR-3` is Support and holds no `manage_settings`. */
    await switchMockUser('USR-3')
    renderScreen()

    expect(await screen.findByText(text('admin.workspace.readOnly'))).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: text('admin.workspace.logo.upload') }),
    ).toBeDisabled()
    for (const button of screen.getAllByRole('button', {
      name: text('admin.workspace.legal.queue'),
    })) {
      expect(button).toBeDisabled()
    }
    /* Disabled, not removed — the fields are still on screen and readable. */
    expect(screen.getByDisplayValue('support@eyvar.app')).toBeDisabled()
  })
})
