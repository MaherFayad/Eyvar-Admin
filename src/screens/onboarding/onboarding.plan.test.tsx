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
  markOnboardingAutoOpened,
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

describe('AC-594 — "the welcome opens automatically exactly once, on the first session"', () => {
  it('welcomes an account that has never seen it, stamps the sighting, and Start opens the layer', async () => {
    const owner = await userWithRole('Owner')
    const session = await switchMockUser(owner)
    const user = userEvent.setup()
    renderShell(session.landingRoute)

    const welcome = await screen.findByRole('dialog')
    expect(
      within(welcome).getByText(en('onboarding.welcome.title').replace('{name}', session.name.split(' ')[0]!)),
    ).toBeInTheDocument()
    /* Slide one names every workspace an Owner can open. */
    const reach = within(welcome).getByText(en('onboarding.welcome.step1.reach').slice(0, 17), {
      exact: false,
    })
    for (const workspace of ['management', 'operations', 'financials', 'support', 'admin']) {
      expect(reach).toHaveTextContent(en(`workspace.${workspace}`))
    }
    await waitFor(async () => {
      expect((await getOnboarding(owner)).state.autoOpenedAt).not.toBeNull()
    })

    /* Four slides, dots reachable, then the checklist. */
    for (let i = 0; i < 3; i += 1) {
      await user.click(screen.getByRole('button', { name: en('onboarding.welcome.next') }))
    }
    await user.click(screen.getByRole('button', { name: en('onboarding.welcome.start') }))
    const layer = await screen.findByRole('dialog')
    expect(within(layer).getByText(en('onboarding.title'))).toBeInTheDocument()
  })

  it('tells Support which workspaces they reach, and Financials is not among them (AC-916)', async () => {
    const support = await userWithRole('Support')
    const session = await switchMockUser(support)
    renderShell(session.landingRoute)

    const welcome = await screen.findByRole('dialog')
    const reach = within(welcome).getByText(en('onboarding.welcome.step1.reach').slice(0, 17), {
      exact: false,
    })
    expect(reach).toHaveTextContent(en('workspace.support'))
    expect(reach).not.toHaveTextContent(en('workspace.financials'))
  })

  it('leaves the layer closed after Not now, and shows the beacon instead', async () => {
    const owner = await userWithRole('Owner')
    const session = await switchMockUser(owner)
    const user = userEvent.setup()
    renderShell(session.landingRoute)

    await screen.findByRole('dialog')
    await user.click(screen.getByRole('button', { name: en('onboarding.welcome.later') }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByTestId('onboarding-beacon')).toBeInTheDocument()
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

describe('Beacon — "a ring with the percentage opens a small panel of the steps"', () => {
  it('shows the percentage, lists the steps, and opens the full checklist on the next one', async () => {
    const owner = await userWithRole('Owner')
    const session = await switchMockUser(owner)
    await markOnboardingAutoOpened(owner)
    await completeStep('common.account', 'manual', owner)
    const user = userEvent.setup()
    renderShell(session.landingRoute)

    const beacon = await screen.findByTestId('onboarding-beacon')
    const ring = within(beacon).getByRole('button', {
      name: new RegExp(en('onboarding.beacon.label').replace('{done}', '1').replace('{total}', '7')),
    })
    expect(ring).toHaveTextContent('14%')
    await user.click(ring)

    const panel = await screen.findByTestId('onboarding-beacon-panel')
    expect(within(panel).getByText(en('onboarding.step.common.mywork.title'))).toBeInTheDocument()
    expect(within(panel).getByText('14%')).toBeInTheDocument()
    await user.click(within(panel).getByRole('button', { name: en('onboarding.beacon.open') }))

    const layer = await screen.findByRole('dialog')
    expect(within(layer).getByText(en('onboarding.step.common.mywork.body'))).toBeInTheDocument()
    expect(screen.queryByTestId('onboarding-beacon')).toBeNull()
  })

  it("goes straight to a step's screen from the panel", async () => {
    const owner = await userWithRole('Owner')
    const session = await switchMockUser(owner)
    await markOnboardingAutoOpened(owner)
    const user = userEvent.setup()
    renderShell(session.landingRoute)

    await user.click(within(await screen.findByTestId('onboarding-beacon')).getByRole('button'))
    const panel = await screen.findByTestId('onboarding-beacon-panel')
    await user.click(within(panel).getByText(en('onboarding.step.common.audit.title')))
    expect(await screen.findByText('screen: admin-activity')).toBeInTheDocument()
    expect(screen.queryByTestId('onboarding-beacon-panel')).toBeNull()
  })

  it('hides for the session, and never shows for a dismissed track', async () => {
    const owner = await userWithRole('Owner')
    const session = await switchMockUser(owner)
    await markOnboardingAutoOpened(owner)
    const user = userEvent.setup()
    const first = renderShell(session.landingRoute)
    await user.click(within(await screen.findByTestId('onboarding-beacon')).getByRole('button'))
    await user.click(
      within(await screen.findByTestId('onboarding-beacon-panel')).getByRole('button', {
        name: en('onboarding.beacon.hide'),
      }),
    )
    expect(screen.queryByTestId('onboarding-beacon')).toBeNull()
    first.unmount()

    await dismissOnboarding(owner)
    renderShell(session.landingRoute)
    await settle()
    expect(screen.queryByTestId('onboarding-beacon')).toBeNull()
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
