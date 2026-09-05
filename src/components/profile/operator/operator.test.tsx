/**
 * TA-10: `?entity=USR-n` under `manage_team` is the colleague's arrangement;
 * for everyone else it is the identity card. T5.2: search finds a colleague.
 */

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { disableMockLatency, resetDataLayer, search, setPermissionDelta } from '@/data/clients'
import { EN } from '@/i18n/dictionaries'
import { createTranslator } from '@/lib'
import { ProfileLayer } from '@/shell/layers/ProfileLayer'

const t = createTranslator({ dictionary: EN })
const en = (key: string) => EN[key] as string

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
})

function mount(canAdministerTeam: boolean) {
  return render(
    <MemoryRouter>
      <ProfileLayer
        entityId="USR-3"
        open
        onClose={vi.fn()}
        onOpenFullProfile={vi.fn()}
        t={t}
        language="en"
        canAdministerTeam={canAdministerTeam}
      />
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
