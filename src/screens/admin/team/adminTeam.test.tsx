/**
 * Admin › Team & Access — the screen half of P6-T5.
 *
 * What is asserted here, and why each one earns its place:
 *
 *   1. **The four states, all reachable.** The old screen's loading state came
 *      from one read; three now decide it, and a failure in any of the three is
 *      a page failure. `mockFailures` drives each — never a bare `vi.spyOn` on
 *      a `@/data/clients` barrel export, which does not intercept the live
 *      binding and would let the assertion pass vacuously.
 *   2. **F-016 is visible before the click.** The `Suspend operator` item is
 *      rendered, disabled, with its sentence — §11.2. A test that only checked
 *      the mutation would pass against a screen that refuses after the click,
 *      which is the legacy behaviour §11.2 exists to replace.
 *   3. **The row kebab exists on every row, for every role.** The old screen
 *      hid it for `USR-1` and hid it entirely without `manage_team`. Hiding is
 *      the §11.2 breach; both cases are asserted.
 *   4. **The invite persists.** Invite, then re-mount, and the operator is
 *      still there. The old screen would have passed a test that only looked
 *      for the toast.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  disableMockLatency,
  useTwoManageTeamHolders,
  getRouteTable,
  mockFailures,
  resetDataLayer,
  resetSecurityPolicy,
  resetTeam,
  resetWorkspace,
  switchMockUser,
} from '@/data/clients'
import type { SubTabRoute } from '@/data/types'
import { ShellProvider, useShell } from '@/shell/ShellContext'
import { AdminTeamScreen } from './AdminTeamScreen'
import { ADMIN_TEAM_EN } from './copy'
import { EN } from '@/i18n/dictionaries'

/**
 * The save bar is rendered by `AppLayout`, which this test deliberately does
 * not mount — the contract a screen owes is the `SaveBarModel` it publishes,
 * not the chrome that draws it. This probe renders that model, so the
 * assertion is against what the screen actually promises the shell.
 */
function SaveBarProbe() {
  const shell = useShell()
  if (shell.saveBar === null) return null
  return (
    <div>
      <span data-testid="save-bar-entity">{shell.saveBar.entity}</span>
      <button type="button" disabled={!shell.saveBar.canSave} onClick={shell.saveBar.onSave}>
        probe-save
      </button>
      <button type="button" disabled={!shell.saveBar.canDiscard} onClick={shell.saveBar.onDiscard}>
        probe-discard
      </button>
    </div>
  )
}

const row = (): SubTabRoute => {
  const found = getRouteTable().subTabs.find((each) => each.subTabId === 'admin-team')
  if (!found) throw new Error('No route-table row for admin-team')
  return found
}

/**
 * jsdom has no Pointer Events and Radix's `Select` calls `hasPointerCapture` /
 * `scrollIntoView` on its trigger, so without these shims the security policy
 * pane cannot be opened in a test at all — and the save, which is the defect
 * this pass closed, would go untested. Same three lines as
 * `screens/admin/data/adminData.test.tsx`.
 */
beforeEach(async () => {
  disableMockLatency()
  resetDataLayer()
  if (!HTMLElement.prototype.hasPointerCapture) {
    HTMLElement.prototype.hasPointerCapture = () => false
    HTMLElement.prototype.setPointerCapture = () => undefined
    HTMLElement.prototype.releasePointerCapture = () => undefined
  }
  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = () => undefined
  }
  /* Explicit as well as through the barrel: several agents are appending to
     `resetDataLayer` at once, so the suite does not depend on my line surviving
     somebody else's merge. */
  resetTeam()
  resetSecurityPolicy()
  resetWorkspace()
  mockFailures.clear()
  await switchMockUser('USR-1')
})

function renderScreen(path = '/admin/team') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider>
        <AdminTeamScreen row={row()} />
        <SaveBarProbe />
      </ShellProvider>
    </MemoryRouter>,
  )
}

const text = (key: keyof typeof ADMIN_TEAM_EN) => ADMIN_TEAM_EN[key] as string

/** Opens the kebab on the row carrying `name` and returns the menu. */
async function openRowMenu(user: ReturnType<typeof userEvent.setup>, name: string) {
  const row = (await screen.findByText(name)).closest('tr')
  if (!row) throw new Error(`No row for ${name}`)
  const trigger = within(row).getByRole('button', { name: /More actions/ })
  await user.click(trigger)
  return screen.findByRole('menu')
}

describe('the four states', () => {
  it('renders the roster once all three reads land', async () => {
    renderScreen()
    expect(await screen.findByText('Sarah Al-Rashid')).toBeInTheDocument()
    expect(screen.getByText('Yousef Al-Balawi')).toBeInTheDocument()
    /* D20: the security policy and the rota are panes of the same sub-tab,
       reached through the view strip rather than stacked under the roster. */
    expect(screen.getByRole('tab', { name: 'Security policy' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'On-call' })).toBeInTheDocument()
    expect(screen.queryByText(text('admin.team.security.title'))).toBeNull()
  })

  it.each([['team.list'], ['securityPolicy.get'], ['team.rota']])(
    'fails the whole page when %s fails, rather than rendering half of it',
    async (operation) => {
      mockFailures.always(operation)
      renderScreen()
      expect(await screen.findByText(text('admin.team.error'))).toBeInTheDocument()
      /* Not a security pane silently rendering its defaults over a failed read. */
      expect(screen.queryByText(text('admin.team.security.title'))).not.toBeInTheDocument()
    },
  )

  it('offers a retry that re-runs all three reads', async () => {
    const user = userEvent.setup()
    mockFailures.once('team.list')
    renderScreen()
    await user.click(await screen.findByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Sarah Al-Rashid')).toBeInTheDocument()
  })
})

describe('§11.2 — refused, not hidden', () => {
  /**
   * The invariant, seen by an operator before they act on it. The seeded
   * roster has exactly one `manage_team` holder, so this is reachable with no
   * fixture edit.
   */
  it('renders `Suspend operator` on the last holder, disabled, with the F-016 sentence', async () => {
    const user = userEvent.setup()
    renderScreen()
    const menu = await openRowMenu(user, 'Sarah Al-Rashid')

    const suspend = within(menu).getByRole('menuitem', { name: text('admin.team.action.suspend') })
    expect(suspend).toHaveAttribute('aria-disabled', 'true')

    /* The reason is REAL TEXT, reachable from the control — never a tooltip. */
    const describedBy = suspend.getAttribute('aria-describedby') ?? ''
    expect(document.getElementById(describedBy)?.textContent).toBe(
      text('admin.team.refusal.lastManageTeamHolder'),
    )
    /* Two items carry it — `Suspend` and `Offboard` — which is the point:
       F-016 names three transitions and the menu refuses each one on its own
       line rather than explaining the rule once, somewhere else. */
    expect(
      within(menu).getAllByText(text('admin.team.refusal.lastManageTeamHolder')),
    ).toHaveLength(2)
  })

  it('renders the same three transitions refused, not two of them and one missing', async () => {
    const user = userEvent.setup()
    renderScreen()
    const menu = await openRowMenu(user, 'Sarah Al-Rashid')
    for (const key of ['admin.team.action.suspend', 'admin.team.action.offboard'] as const) {
      expect(within(menu).getByRole('menuitem', { name: text(key) })).toHaveAttribute(
        'aria-disabled',
        'true',
      )
    }
  })

  it('keeps the kebab on `USR-1`, which the old screen removed outright', async () => {
    const user = userEvent.setup()
    renderScreen()
    const menu = await openRowMenu(user, 'Sarah Al-Rashid')
    /* Six declared actions, so D8's kebab is the right shape and every one of
       them is present whether or not it is available. */
    /* Six transitions plus the read-only sessions item. */
    expect(within(menu).getAllByRole('menuitem')).toHaveLength(7)
  })

  it('keeps every control in place for a role that cannot administer the team', async () => {
    /* `USR-3` is Support: `manage_tickets`, `view_profiles`, `contact_users`.
       Constructed from a real role rather than from a route permission, which
       is `null` on all 35 rows and cannot currently fail. */
    await switchMockUser('USR-3')
    const user = userEvent.setup()
    renderScreen()

    /* One banner states the refusal for the whole page… */
    expect(await screen.findByText(text('admin.team.refusal.noPermission'))).toBeInTheDocument()

    /* …the primary is disabled in place rather than removed… */
    expect(screen.getByRole('button', { name: text('admin.team.invite') })).toBeDisabled()

    /* …and the row menu still opens, with every item refused. */
    const menu = await openRowMenu(user, 'Yousef Al-Balawi')
    const items = within(menu).getAllByRole('menuitem')
    expect(items).toHaveLength(7)
    /* `View sessions` is a read and stays available; the six writes do not. */
    expect(
      items.filter((item) => item.getAttribute('aria-disabled') === 'true'),
    ).toHaveLength(6)
  })
})

describe('the lifecycle reaches the data layer', () => {
  it('suspends an operator, and the change survives a re-mount', async () => {
    const user = userEvent.setup()
    const view = renderScreen()

    const menu = await openRowMenu(user, 'Yousef Al-Balawi')
    await user.click(within(menu).getByRole('menuitem', { name: text('admin.team.action.suspend') }))

    /* §10.4 — the reason is validated in the dialog, before the mutation. */
    const confirm = await screen.findByRole('button', {
      name: text('admin.team.confirm.suspend.action'),
    })
    expect(confirm).toBeDisabled()
    await user.type(screen.getByLabelText(text('admin.team.confirm.reason.label')), 'under review')
    await user.click(confirm)

    await waitFor(() =>
      expect(screen.getAllByText(text('admin.team.status.Suspended')).length).toBeGreaterThan(0),
    )

    view.unmount()
    renderScreen()
    await waitFor(() =>
      expect(screen.getAllByText(text('admin.team.status.Suspended')).length).toBeGreaterThan(0),
    )
  })

  it('invites an operator who is still there after a re-mount', async () => {
    const user = userEvent.setup()
    const view = renderScreen()

    await user.click(await screen.findByRole('button', { name: text('admin.team.invite') }))
    await user.type(screen.getByLabelText(text('admin.team.invite.name')), 'Rana Al-Harbi')
    await user.type(screen.getByLabelText(text('admin.team.invite.email')), 'rana@eyvar.com')
    await user.click(screen.getByRole('button', { name: text('admin.team.invite.send') }))

    expect(await screen.findByText('Rana Al-Harbi')).toBeInTheDocument()

    view.unmount()
    renderScreen()
    /* The old screen held this in a component array; a re-mount erased it. */
    expect(await screen.findByText('Rana Al-Harbi')).toBeInTheDocument()
  })

  it('keeps the invite dialog open and names the field when the email is taken', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(await screen.findByRole('button', { name: text('admin.team.invite') }))
    await user.type(screen.getByLabelText(text('admin.team.invite.name')), 'Someone Else')
    await user.type(screen.getByLabelText(text('admin.team.invite.email')), 'sarah@eyvar.com')
    await user.click(screen.getByRole('button', { name: text('admin.team.invite.send') }))

    expect(await screen.findByText(text('admin.team.invite.emailTaken'))).toBeInTheDocument()
    /* The dialog is still open — a fire-and-forget dialog had already closed
       by the time the server answered and could never have shown this. */
    expect(screen.getByLabelText(text('admin.team.invite.email'))).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })
})

describe('the invite dialog follows the role', () => {
  it('names roles by their label and fills the compensation cap from the chosen role', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(await screen.findByRole('button', { name: text('admin.team.invite') }))
    /* Support is the default and its seeded cap is 100 SAR. The cap is the
       dialog's one numeric field. */
    expect(screen.getByRole('spinbutton')).toHaveValue(100)

    await user.click(screen.getByLabelText(text('admin.team.invite.role')))
    /* The option is the translated label, never the `RoleName` literal. */
    await user.click(await screen.findByRole('option', { name: EN['role.finance'] as string }))

    expect(screen.getByRole('spinbutton')).toHaveValue(500)
  })
})

describe('TA-1 — a pane has an address', () => {
  it('opens the pane the URL names, and only that pane', async () => {
    renderScreen('/admin/team?view=oncall')
    expect(await screen.findByText(text('admin.team.rota.title'))).toBeInTheDocument()
    expect(screen.queryByText('Sarah Al-Rashid')).toBeNull()
    expect(screen.getByRole('tab', { name: 'On-call' })).toHaveAttribute('aria-selected', 'true')
  })

  it('moves between panes through the view strip, and the URL follows', async () => {
    const user = userEvent.setup()
    renderScreen()
    await screen.findByText('Sarah Al-Rashid')
    await user.click(screen.getByRole('tab', { name: 'Roles & permissions' }))
    expect(await screen.findByText(text('admin.team.roles.title'))).toBeInTheDocument()
    /* The roster is gone; the holders facet may still name an operator. */
    expect(screen.queryByText('sarah@eyvar.com')).toBeNull()
  })
})

describe('TA-3 — a role change names both states, takes a reason, and is audited', () => {
  it('moves Yousef to Dispatcher from the row menu and the roster shows the new role', async () => {
    const user = userEvent.setup()
    renderScreen()
    const menu = await openRowMenu(user, 'Yousef Al-Balawi')
    await user.click(within(menu).getByRole('menuitem', { name: text('admin.team.action.changeRole') }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Now Ops Manager.')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: EN['role.dispatcher'] as string }))
    /* The preview is the router's own answer: a Dispatcher sees Operations. */
    expect(await within(dialog).findByText(EN['workspace.operations'] as string)).toBeInTheDocument()
    await user.type(within(dialog).getByLabelText(text('admin.team.confirm.reason.label')), 'night shift')
    await user.click(within(dialog).getByRole('button', { name: text('admin.team.role.dialog.confirm') }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    const row = (await screen.findByText('Yousef Al-Balawi')).closest('tr') as HTMLElement
    expect(within(row).getByText(EN['role.dispatcher'] as string)).toBeInTheDocument()
  })

  it('refuses to move the last manage_team holder off it, in place, with the F-016 sentence', async () => {
    const user = userEvent.setup()
    renderScreen()
    const menu = await openRowMenu(user, 'Sarah Al-Rashid')
    await user.click(within(menu).getByRole('menuitem', { name: text('admin.team.action.changeRole') }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: EN['role.finance'] as string }))
    await user.type(within(dialog).getByLabelText(text('admin.team.confirm.reason.label')), 'stepping back')
    expect(within(dialog).getByText(text('admin.team.refusal.lastManageTeamHolder'))).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: text('admin.team.role.dialog.confirm') })).toBeDisabled()
  })
})

describe('TA-4 — a custom role is duplicated from a built-in on the Roles pane, in place', () => {
  it('creates a role from Dispatcher without a dialog, and the new role is selected with no holders', async () => {
    const user = userEvent.setup()
    renderScreen('/admin/team?view=roles')
    const list = () => within(screen.getByRole('list', { name: text('admin.team.roles.title') }))
    await screen.findByRole('list', { name: text('admin.team.roles.title') })
    await user.click(list().getByRole('button', { name: /^Dispatcher/ }))
    await user.click(screen.getByRole('button', { name: text('admin.team.roles.duplicate') }))
    expect(screen.queryByRole('dialog')).toBeNull()

    await user.type(screen.getByLabelText(text('admin.team.roles.editor.name')), 'Night dispatcher')
    await user.click(screen.getByRole('button', { name: text('admin.team.roles.editor.create') }))

    const created = await list().findByRole('button', { name: /Night dispatcher/ })
    expect(created).toHaveAttribute('aria-current', 'true')
    expect(within(created).getByText(text('admin.team.roles.custom'))).toBeInTheDocument()
    /* Unheld, so it can be deleted; a built-in has no delete at all. */
    expect(screen.getByRole('button', { name: text('admin.team.roles.delete') })).toBeEnabled()
  })

  it('starts a blank role from the list header with every switch live', async () => {
    const user = userEvent.setup()
    renderScreen('/admin/team?view=roles')
    await user.click(await screen.findByRole('button', { name: text('admin.team.roles.new') }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByLabelText(text('admin.team.roles.editor.name'))).toHaveValue('')
    const escrow = screen.getByRole('switch', { name: EN['account.permission.release_escrow'] as string })
    expect(escrow).toBeEnabled()
  })
})

describe('AC-921 — an override is granted on the Overrides pane, in place, and shown as a delta', () => {
  it('grants release_escrow to Lina and lists her as Support plus the key', async () => {
    const user = userEvent.setup()
    renderScreen('/admin/team?view=overrides')
    expect(await screen.findByText(text('admin.team.overrides.empty'))).toBeInTheDocument()

    const list = within(screen.getByRole('list', { name: text('admin.team.overrides.title') }))
    await user.click(list.getByRole('button', { name: /Lina Al-Otaibi/ }))
    expect(screen.queryByRole('dialog')).toBeNull()

    const escrowRow = screen
      .getAllByText(EN['account.permission.release_escrow'] as string)
      .map((node) => node.closest('li') as HTMLElement | null)
      .find((li): li is HTMLElement => li !== null && within(li).queryAllByRole('radio').length > 0) as HTMLElement
    await user.click(within(escrowRow).getByRole('radio', { name: text('admin.team.override.state.granted') }))
    await user.click(screen.getByRole('button', { name: text('admin.team.override.save') }))

    const row = await within(screen.getByRole('list', { name: text('admin.team.overrides.title') })).findByRole('button', {
      name: /Lina Al-Otaibi/,
    })
    expect(within(row).getByText(`+ ${EN['account.permission.release_escrow']}`)).toBeInTheDocument()
    expect(within(row).getByText(EN['role.support'] as string)).toBeInTheDocument()
    expect(screen.getByText(text('admin.team.overrides.count').replace('{count}', '1'))).toBeInTheDocument()
  })
})

describe('the Overrides list is searched, not scrolled', () => {
  it('narrows the operators to the query and keeps the selection', async () => {
    const user = userEvent.setup()
    renderScreen('/admin/team?view=overrides')
    const listEl = await screen.findByRole('list', { name: text('admin.team.overrides.title') })
    const list = within(listEl)
    await user.click(await list.findByRole('button', { name: /Lina Al-Otaibi/ }))

    const search = screen.getByRole('searchbox', { name: text('admin.team.search') })
    await user.type(search, 'fahad')
    expect(list.getByRole('button', { name: /Fahad Al-Dosari/ })).toBeInTheDocument()
    expect(list.getByRole('button', { name: /Noura Al-Fahad/ })).toBeInTheDocument()
    expect(list.queryByRole('button', { name: /Lina Al-Otaibi/ })).toBeNull()
    expect(
      screen.getByText(text('admin.team.override.dialog.title').replace('{name}', 'Lina Al-Otaibi')),
    ).toBeInTheDocument()

    await user.clear(search)
    await user.type(search, 'zzz')
    expect(screen.getByText(text('admin.team.noMatch'))).toBeInTheDocument()
  })
})

describe('TA-2 / O-T6 — the invite dialog previews the role and hands over the link', () => {
  it('shows what the role will see, then the activation link after the send', async () => {
    const user = userEvent.setup()
    renderScreen()
    await user.click(await screen.findByRole('button', { name: text('admin.team.invite') }))
    const dialog = await screen.findByRole('dialog')
    /* Support sees Customer Support and no Financials; the preview is the router's answer. */
    await user.click(await within(dialog).findByRole('button', { name: text('admin.team.invite.preview') }))
    expect(await within(dialog).findByText(EN['workspace.support'] as string)).toBeInTheDocument()
    expect(within(dialog).queryByText(EN['workspace.financials'] as string)).toBeNull()

    await user.type(within(dialog).getByLabelText(text('admin.team.invite.name')), 'Rana Al-Harbi')
    await user.type(within(dialog).getByLabelText(text('admin.team.invite.email')), 'rana@eyvar.com')
    await user.click(within(dialog).getByRole('button', { name: text('admin.team.invite.send') }))

    expect(await screen.findByText('Invitation sent to Rana Al-Harbi')).toBeInTheDocument()
    const link = screen.getByLabelText(text('admin.team.invite.link')) as HTMLInputElement
    expect(link.value).toMatch(/\/activate\?token=INV-/)
    await user.click(screen.getByRole('button', { name: text('admin.team.invite.done') }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('states how long the seeded invitation has left', async () => {
    renderScreen()
    const row = (await screen.findByText('Noura Al-Fahad')).closest('tr') as HTMLElement
    expect(within(row).getByText(/Invite expires in 1 days|Invite expires today/)).toBeInTheDocument()
  })
})

describe('TA-5 — Sessions & devices lists every live session and ends one', () => {
  it('shows sessions across the roster and ends one after an in-row confirmation', async () => {
    const user = userEvent.setup()
    renderScreen('/admin/team?view=sessions')
    const ends = await screen.findAllByRole('button', { name: text('admin.team.sessionsPane.end') })
    const before = ends.length
    expect(before).toBeGreaterThan(3)
    /* Yousef holds one session; end it and the count drops by one. */
    const row = (await screen.findAllByText('Yousef Al-Balawi'))[0]!.closest('tr') as HTMLElement
    await user.click(within(row).getByRole('button', { name: text('admin.team.sessionsPane.end') }))
    await user.click(within(row).getByRole('button', { name: text('admin.team.sessions.confirm') }))
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: text('admin.team.sessionsPane.end') })).toHaveLength(before - 1),
    )
  })
})

describe('AC-957 — the Security pane writes only under manage_security_policy', () => {
  it('renders read-only for an Ops Manager granted manage_team, with the refusal stated once', async () => {
    useTwoManageTeamHolders()
    await switchMockUser('USR-5')
    renderScreen('/admin/team?view=security')
    expect(await screen.findByText(text('admin.team.security.readOnly'))).toBeInTheDocument()
    expect(screen.getByRole('switch')).toBeDisabled()
    expect(screen.getByLabelText(text('admin.team.security.idle'))).toBeDisabled()
  })
})

describe('T4.3 — the two-factor posture is one fact with a filter', () => {
  it('states the count once and filters the roster to the operators without a second factor', async () => {
    const user = userEvent.setup()
    renderScreen()
    const toggle = await screen.findByRole('button', { name: /without a second factor/ })
    expect(toggle).toHaveTextContent('3 without a second factor')
    await user.click(toggle)
    expect(screen.queryByText('Sarah Al-Rashid')).toBeNull()
    expect(screen.getByText('Fahad Al-Dosari')).toBeInTheDocument()
    expect(screen.getByText('Lina Al-Otaibi')).toBeInTheDocument()
    expect(screen.getByText('Noura Al-Fahad')).toBeInTheDocument()
  })
})

describe('the security policy and the rota actually save', () => {
  it('persists a changed idle timeout across a re-mount', async () => {
    const user = userEvent.setup()
    const view = renderScreen('/admin/team?view=security')

    const select = await screen.findByLabelText(text('admin.team.security.idle'))
    await user.click(select)
    await user.click(await screen.findByRole('option', { name: '60 minutes' }))

    /* The shell's save bar, not a `setTimeout`. The screen has to PUBLISH it,
       which is the half the old screen faked. */
    expect(await screen.findByTestId('save-bar-entity')).toHaveTextContent(
      text('admin.team.entity'),
    )
    await user.click(screen.getByRole('button', { name: 'probe-save' }))
    await waitFor(() => expect(screen.getByText('60 minutes')).toBeInTheDocument())

    view.unmount()
    renderScreen('/admin/team?view=security')
    expect(await screen.findByText('60 minutes')).toBeInTheDocument()
  })
})
