/**
 * TA-10: `?entity=USR-n` under `manage_team` is the colleague's arrangement;
 * for everyone else it is the identity card. T5.2: search finds a colleague.
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { disableMockLatency, getUiState, resetDataLayer, search, setPermissionDelta } from '@/data/clients'
import { EN } from '@/i18n/dictionaries'
import { createTranslator } from '@/lib'
import { ProfileLayer } from '@/shell/layers/ProfileLayer'
import { ShellProvider } from '@/shell/ShellContext'

const t = createTranslator({ dictionary: EN })
const en = (key: string) => EN[key] as string

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
})

/* WP-5.6's own card reads `useShell()` for "is this my own card" — a
   `ShellProvider` inside the router, same nesting `blockMenu.test.tsx` uses. */
function mount(canAdministerTeam: boolean, entityId = 'USR-3') {
  return render(
    <MemoryRouter>
      <ShellProvider>
        <ProfileLayer
          entityId={entityId}
          open
          onClose={vi.fn()}
          onOpenFullProfile={vi.fn()}
          t={t}
          language="en"
          canAdministerTeam={canAdministerTeam}
        />
      </ShellProvider>
    </MemoryRouter>,
  )
}

describe('TA-10 — the operator layer', () => {
  it('shows access, holdings, activity, sessions, onboarding and on-call to an administrator', async () => {
    await setPermissionDelta('USR-3', { granted: ['release_escrow'], revoked: [] })
    mount(true)
    expect(await screen.findByText('Lina Al-Otaibi')).toBeInTheDocument()
    for (const key of [
      'profile.operator.section.access',
      'profile.operator.section.holding',
      'profile.operator.section.today',
      'profile.operator.section.sessions',
      'profile.operator.section.onboarding',
      'profile.operator.section.onCall',
    ]) {
      expect(await screen.findByText(en(key))).toBeInTheDocument()
    }
    /* The override is shown as a delta against the role, never flattened (AC-921). */
    expect(screen.getByText(`+ ${en('account.permission.release_escrow')}`)).toBeInTheDocument()
    expect(screen.getByText(en('access.preview.title'))).toBeInTheDocument()
  })

  it('shows the identity card and nothing more to an operator without manage_team', async () => {
    mount(false)
    expect(await screen.findByText('Lina Al-Otaibi')).toBeInTheDocument()
    expect(await screen.findByText(en('profile.section.identity'))).toBeInTheDocument()
    expect(screen.queryByText(en('profile.operator.section.holding'))).toBeNull()
    expect(screen.queryByText(en('access.preview.title'))).toBeNull()
  })
})

describe('WP-5.6 — the digest preference', () => {
  it('lets the signed-in operator toggle their own digest, off by default', async () => {
    const user = userEvent.setup()
    /* USR-1 is `CURRENT_USER_ID` (`teamUsers.ts`) — the signed-in operator's own card. */
    mount(true, 'USR-1')
    /* `defaultOpen={false}` — the same disclosure every collapsed card here needs. */
    await user.click(
      await screen.findByRole('button', { name: en('profile.operator.section.notifications') }),
    )
    const toggle = await screen.findByRole('switch', {
      name: en('profile.operator.notifications.digest'),
    })
    expect(toggle).toBeEnabled()
    expect(toggle).toHaveAttribute('aria-checked', 'false')

    await user.click(toggle)

    /* `onCheckedChange` fires the PATCH and refetches; both are async, so the
       attribute settles a tick after `click` resolves. */
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'))
    expect((await getUiState()).state.alertDigest).toBe(true)
  })

  it("disables a colleague's switch in place, with the reason", async () => {
    const user = userEvent.setup()
    mount(true)
    await user.click(
      await screen.findByRole('button', { name: en('profile.operator.section.notifications') }),
    )
    const toggle = await screen.findByRole('switch', {
      name: en('profile.operator.notifications.digest'),
    })
    expect(toggle).toBeDisabled()
    expect(screen.getByText(en('profile.operator.notifications.selfOnly'))).toBeInTheDocument()
  })
})

describe('T5.2 — a colleague is searchable', () => {
  it('resolves a name and an id to the operator kind', async () => {
    const byName = await search('Lina')
    expect(
      byName.results.some((r) => r.kind === 'entity' && 'entityType' in r.target && r.target.entityType === 'operator'),
    ).toBe(true)
    const byId = await search('USR-3')
    expect(byId.results[0]?.target).toMatchObject({ entityId: 'USR-3', entityType: 'operator' })
  })
})
