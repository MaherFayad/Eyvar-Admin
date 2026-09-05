/**
 * ONBOARDING-UX-PLAN.md, one test per criterion: AC-594 auto-open once,
 * AC-612 silent auto-completion, A-3 the Support profile door, D-1 the URL
 * step, C-3 the intro after the shared three.
 */

import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import {
  claimRequest,
  completeStep,
  disableMockLatency,
  dismissOnboarding,
  getOnboarding,
  getRouteTable,
  listRequests,
  listTeamUsers,
  resetDataLayer,
  switchMockUser,
} from '@/data/clients'
import { EN } from '@/i18n/dictionaries'
import { createTranslator, resetDefaultUiStores } from '@/lib'
import { resetAnalytics } from '@/lib/analytics'
import { AppLayout } from '@/shell/AppLayout'
import { ShellProvider, useShell } from '@/shell/ShellContext'
import { OnboardingLayer } from './OnboardingLayer'

const t = createTranslator({ dictionary: EN, fallback: EN })
const en = (key: string) => EN[key] as string
const table = getRouteTable()

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  resetDefaultUiStores()
  resetAnalytics()
  vi.restoreAllMocks()
})

async function userWithRole(role: string): Promise<string> {
  const users = await listTeamUsers()
  const match = users.find((user) => user.role === role)
  if (!match) throw new Error(`No seeded operator holds the ${role} role`)
  return match.id
}

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
      </ShellProvider>
    </MemoryRouter>,
  )
}

function renderLayer(props: Partial<React.ComponentProps<typeof OnboardingLayer>> = {}) {
  return render(
    <MemoryRouter initialEntries={['/operations/overview?onboarding=1']}>
      <ShellProvider>
        <OnboardingLayer open onClose={vi.fn()} t={t} {...props} />
      </ShellProvider>
    </MemoryRouter>,
  )
}

/** Waits a macrotask so a provider read and its effects can settle. */
const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 20)))

describe('AC-594 — "the layer opens automatically exactly once, on the first session"', () => {
  it('opens on the landing route of an account that has never seen it, and stamps the sighting', async () => {
    const owner = await userWithRole('Owner')
    const session = await switchMockUser(owner)
    renderShell(session.landingRoute)

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(en('onboarding.title'))).toBeInTheDocument()
    await waitFor(async () => {
      expect((await getOnboarding(owner)).state.autoOpenedAt).not.toBeNull()
    })
  })

  it('does not open on a second sign-in', async () => {
    const owner = await userWithRole('Owner')
    const session = await switchMockUser(owner)
    const first = renderShell(session.landingRoute)
    await screen.findByRole('dialog')
    first.unmount()

    renderShell(session.landingRoute)
    await settle()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('never opens for an account that dismissed the checklist', async () => {
    const owner = await userWithRole('Owner')
    const session = await switchMockUser(owner)
    await dismissOnboarding(owner)

    renderShell(session.landingRoute)
    await settle()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('does not open on a route other than the landing route', async () => {
    const owner = await userWithRole('Owner')
    await switchMockUser(owner)
    renderShell('/operations/people')
    await settle()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('AC-612 — "a step marks done silently when its autoSignal fires"', () => {
  function Probe() {
    const shell = useShell()
    return <p>{shell.onboardingStatus}</p>
  }

  it('ticks common.mywork when the operator claims a request', async () => {
    const ops = await userWithRole('Ops Manager')
    await switchMockUser(ops)
    render(
      <MemoryRouter initialEntries={['/operations/my-work']}>
        <ShellProvider>
          <Probe />
        </ShellProvider>
      </MemoryRouter>,
    )
    await screen.findByText('content')
    expect((await getOnboarding(ops)).state.completedStepIds).not.toContain('common.mywork')

    const request = (await listRequests()).items.find((row) => row.claim === null)
    if (!request) throw new Error('no unclaimed request in the fixture')
    await act(async () => {
      await claimRequest(request.id)
    })

    await waitFor(async () => {
      expect((await getOnboarding(ops)).state.completedStepIds).toContain('common.mywork')
    })
    expect(screen.queryByRole('status')).toBeNull()
  })
})

describe('A-3 — "the Support profile step has a destination"', () => {
  it('offers Open People on the profile step', async () => {
    const support = await userWithRole('Support')
    await switchMockUser(support)
    const user = userEvent.setup()
    renderLayer()

    await user.click(
      await screen.findByRole('button', { name: en('onboarding.step.support.profile.title') }),
    )
    const people = en('subtab.operations.people')
    expect(
      screen.getByRole('button', { name: en('onboarding.step.open').replace('{subTab}', people) }),
    ).toBeInTheDocument()
  })
})

describe('D-1 — "Back returns to the step the operator left"', () => {
  it('expands the step the URL names', async () => {
    const owner = await userWithRole('Owner')
    await switchMockUser(owner)
    renderLayer({ initialStepId: 'common.audit' })

    expect(await screen.findByText(en('onboarding.step.common.audit.body'))).toBeInTheDocument()
    expect(screen.queryByText(en('onboarding.step.common.account.body'))).toBeNull()
  })

  it('reports the expanded step so the shell can write it into the URL', async () => {
    const owner = await userWithRole('Owner')
    await switchMockUser(owner)
    const onStepChange = vi.fn()
    const user = userEvent.setup()
    renderLayer({ onStepChange })

    await user.click(
      await screen.findByRole('button', { name: en('onboarding.step.common.mywork.title') }),
    )
    expect(onStepChange).toHaveBeenLastCalledWith('common.mywork')
  })
})

describe('C-3 — "the intro acknowledges the three shared steps, once, in the card"', () => {
  it('replaces the My Work line when the common three are done', async () => {
    const owner = await userWithRole('Owner')
    await switchMockUser(owner)
    for (const id of ['common.account', 'common.mywork', 'common.audit']) {
      await completeStep(id, 'manual', owner)
    }
    renderLayer()

    expect(await screen.findByText(en('onboarding.intro.commonDone'))).toBeInTheDocument()
    expect(screen.queryByRole('status')).toBeNull()
  })
})
