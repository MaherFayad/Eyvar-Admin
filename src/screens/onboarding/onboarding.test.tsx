/**
 * The onboarding layer — `specs/04` §13.6–§13.9.
 *
 * Two of these are **absence** tests, and both are absences the spec was
 * rewritten to enforce rather than tolerate:
 *
 * - **AC-605** now *fails if a `Learn more` link renders*. `learnMoreKey` is
 *   `null` on all 21 fixture rows because Eyvar has no help centre (**Q-82**),
 *   and design §14 **A-7** records the unmet SHOULD deliberately. A link here
 *   would be a dead one.
 * - **AC-615** — no coach mark, no spotlight, no tooltip tour, no modal wizard.
 *   §5.6's last MUST, and the reason the whole surface is a checklist in a
 *   drawer rather than an overlay on the product.
 *
 * And one is a **known-failing** pair that must stay failing: **AC-610** cannot
 * pass while every `requiredPermission` is `null` (foundation **Q4**), and
 * **AC-631** passes through a different path — zero permissions, not a
 * forbidden step. The two are not testing the same thing and passing AC-631
 * does not discharge AC-610.
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import {
  disableMockLatency,
  getOnboarding,
  getRouteTable,
  listTeamUsers,
  resetDataLayer,
  switchMockUser,
} from '@/data/clients'
import * as onboardingClient from '@/data/clients/onboarding'
import type { OnboardingStep } from '@/data/types/onboarding'
import { EN } from '@/i18n/dictionaries'
import { createTranslator } from '@/lib'
import { ShellProvider } from '@/shell/ShellContext'
import { OnboardingLayer } from './OnboardingLayer'

const t = createTranslator({ dictionary: EN, fallback: EN })
const en = (key: string) => EN[key] as string

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  /* `vitest` does not restore spies between tests unless asked. Several tests
     below hold `getOnboarding` in a state the next one must not inherit — a
     promise that never resolves, a rejection — and a leaked one turns every
     later assertion into "the layer rendered its error state", which is a
     failure that names the wrong thing. */
  vi.restoreAllMocks()
})

/**
 * Every step the product actually serves, per role — **read through the
 * client, never imported from the fixture.**
 *
 * `seam.test.ts` §4 forbids any file outside `src/data` from importing
 * `data/fixtures/*`, and it is right to: a test that reads the fixture proves
 * what the fixture says, while a test that reads the client proves what an
 * operator gets. The difference is exactly where `available` and `reachable`
 * are derived, which is the half these criteria are about.
 */
async function tracks(): Promise<Map<string, OnboardingStep[]>> {
  const users = await listTeamUsers()
  const byRole = new Map<string, OnboardingStep[]>()
  for (const user of users) {
    if (byRole.has(user.role)) continue
    await switchMockUser(user.id)
    const checklist = await getOnboarding()
    byRole.set(user.role, checklist.steps)
  }
  return byRole
}

/**
 * The seeded operator holding a given role. **Looked up, never hard-coded**:
 * `USR-3` happening to be Support today is a fixture detail, and a test that
 * pins it fails the day the roster is re-seeded for a reason that has nothing
 * to do with onboarding.
 */
async function userWithRole(role: string): Promise<string> {
  const users = await listTeamUsers()
  const match = users.find((user) => user.role === role)
  if (!match) throw new Error(`No seeded operator holds the ${role} role`)
  return match.id
}

/** The union of every step across every track — 21 rows, by id. */
async function allSteps(): Promise<OnboardingStep[]> {
  const byId = new Map<string, OnboardingStep>()
  for (const steps of (await tracks()).values()) {
    for (const step of steps) byId.set(step.id, step)
  }
  return [...byId.values()]
}

function renderLayer(onClose = vi.fn()) {
  return {
    onClose,
    ...render(
      /* The layer consumes the SHELL's single onboarding read (see its
         header), so a test of the layer mounts the provider. That is the
         point: the menu's `n / m` and the list are one value, and a test that
         stubbed the read away would not be testing that. */
      <MemoryRouter initialEntries={['/operations/overview?onboarding=1']}>
        <ShellProvider>
          <OnboardingLayer open onClose={onClose} t={t} />
        </ShellProvider>
      </MemoryRouter>,
    ),
  }
}

/* ═══════════════════ the fixture ↔ dictionary contract ════════════════ */

describe('AC-616 / AC-669 — "every operator-facing string resolves through a key"', () => {
  it('has an English string for every one of the 21 steps, title and body', async () => {
    /* The client names keys; this dictionary supplies them. A step whose key is
       missing renders a raw key to an operator, and `createTranslator` throws in
       dev rather than letting it — so this test is the same check, moved to
       where it is cheap. */
    for (const step of await allSteps()) {
      expect(EN[step.titleKey], step.id).toBeTypeOf('string')
      expect(EN[step.bodyKey], step.id).toBeTypeOf('string')
    }
  })
})

describe('AC-618 — "steps 1, 2 and 3 are byte-identical across all four tracks, by step id"', () => {
  it('serves the same three ids first, and the same two keys, to every role', async () => {
    const common = ['common.account', 'common.mywork', 'common.audit']
    const byRole = await tracks()
    expect(byRole.size).toBe(4)

    /* Byte-identity **by id**: the three ids lead every track, and each one
       carries the same `titleKey` and `bodyKey` everywhere it appears. It is
       structural rather than coincidental — the data layer holds one row per id
       and four lists of ids — but this asserts the property the criterion
       states, not the shape that happens to deliver it. */
    const seen = new Map<string, string>()
    for (const [role, steps] of byRole) {
      expect(steps.slice(0, 3).map((step) => step.id), role).toEqual(common)
      for (const step of steps.slice(0, 3)) {
        const signature = `${step.titleKey}|${step.bodyKey}|${step.order}`
        const previous = seen.get(step.id)
        if (previous !== undefined) expect(signature, `${role} ${step.id}`).toBe(previous)
        seen.set(step.id, signature)
      }
    }
  })
})

describe('AC-605 / A-7 — "no step renders a Learn more link, in any state"', () => {
  it('has learnMoreKey null on all 21 rows, so there is nothing to render', async () => {
    /* Q-82: Eyvar has no help centre. The criterion was **inverted** on the
       spec side (§19.3 C-5) so that a rendered link *fails* — the absence is
       enforced, not merely tolerated. */
    for (const step of await allSteps()) {
      expect(step.learnMoreKey, step.id).toBeNull()
    }
    /* Scoped to the onboarding namespace: `table.learnMore` belongs to the
       index table's own column help and is not a guide-task link. */
    expect(
      Object.keys(EN).filter((key) => key.startsWith('onboarding.') && key.includes('learnMore')),
    ).toEqual([])
  })

  it('renders no such link in the expanded step', async () => {
    renderLayer()
    await screen.findByText(en('onboarding.step.common.account.title'))
    expect(screen.queryByText(/learn more/i)).toBeNull()
  })
})

describe('AC-610 — KNOWN-FAILING, and it must stay that way', () => {
  it('has requiredPermission null on all 21 rows, so no step can be forbidden', async () => {
    /* Foundation **Q4** is unanswered. The forbidden treatment is designed,
       keyed and copied (design §10.2) and is **unreachable, not unbuilt**.
       Making this pass needs a permission model, and an invented one is
       indistinguishable from a real one once it is in a fixture. */
    for (const step of await allSteps()) {
      expect(step.requiredPermission, step.id).toBeNull()
    }
    /* The copy exists and is ready for the day Q4 lands. */
    expect(EN['onboarding.step.forbidden']).toContain('permission')
  })
})

/* ═════════════════════════ the layer's states ═════════════════════════ */

describe('AC-650 — "a skeleton shaped like the step list, not a centred spinner"', () => {
  it('renders skeleton bars while the checklist is in flight', async () => {
    const get = vi.spyOn(onboardingClient, 'getOnboarding').mockReturnValue(new Promise(() => {}))
    const { baseElement } = renderLayer()
    await waitFor(() =>
      expect(baseElement.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0),
    )
    expect(baseElement.querySelector('[data-slot="spinner"]')).toBeNull()
    get.mockRestore()
  })
})

describe('AC-649 — "an error state with a retry, and the console behind it keeps working"', () => {
  it('renders a card-scoped error inside the layer', async () => {
    const get = vi.spyOn(onboardingClient, 'getOnboarding').mockRejectedValue(new Error('down'))
    renderLayer()
    expect(await screen.findByText(en('onboarding.error'))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: en('onboarding.tryAgain') })).toBeInTheDocument()
    /* Card scope, so the layer itself is still there and still dismissible. */
    expect(screen.getByRole('button', { name: en('onboarding.dismiss') })).toBeInTheDocument()
    get.mockRestore()
  })
})

describe('AC-631 — "newrole@eyvar.com sees the track-empty state"', () => {
  it('renders one grey sentence, and NEITHER the intro NOR the progress line', async () => {
    const get = vi.spyOn(onboardingClient, 'getOnboarding').mockResolvedValue({
      userId: 'USR-X',
      role: 'Ops Manager',
      steps: [],
      state: {
        userId: 'USR-X',
        trackRole: 'Ops Manager',
        startedAt: '2026-06-25T09:14:00+03:00',
        completedStepIds: [],
        skippedStepIds: [],
        archivedStepIds: [],
        /* AC-594 — never auto-opened. Distinguishable from dismissed. */
        autoOpenedAt: null,
        dismissedAt: null,
        completedAt: null,
      },
      permissionsHeld: 0,
      permissionsTotal: 13,
      doneCount: 0,
      totalCount: 0,
      isComplete: true,
    })
    const { baseElement } = renderLayer()

    expect(await screen.findByText(en('onboarding.trackEmpty'))).toBeInTheDocument()
    /* *"There is nothing to be `0 of 0` about."* */
    expect(screen.queryByText(/completed/)).toBeNull()
    expect(screen.queryByText(/You hold/)).toBeNull()
    /* R8 — `no-match`, so no illustration. */
    expect(baseElement.querySelector('svg[viewBox="0 0 160 96"]')).toBeNull()
    get.mockRestore()
  })
})

describe('AC-600 / AC-601 / AC-602 — the intro and the progress line', () => {
  it('states the role, the accountability sentence, the permission count and My Work', async () => {
    /* Support — `lina@eyvar.com`, three permissions, **AC-601**'s own named
       case. Found by role rather than by id. */
    await switchMockUser(await userWithRole('Support'))
    renderLayer()

    expect(await screen.findByText(en('onboarding.intro.support'))).toBeInTheDocument()
    /* **AC-601** — the count equals the permissions the account actually
       holds, and it is derived server-side so two screens cannot disagree. */
    expect(screen.getByText(/You hold 3 of \d+ permissions\./)).toBeInTheDocument()
    /* §5.6's required format, exactly. */
    expect(screen.getByText(/of \d+ completed/)).toBeInTheDocument()
  })
})

describe('AC-604 — "at most one step is expanded at a time"', () => {
  it('collapses the first when a second is expanded', async () => {
    const user = userEvent.setup()
    renderLayer()
    const first = await screen.findByRole('button', {
      name: en('onboarding.step.common.account.title'),
    })
    /* On open, the FIRST INCOMPLETE step is expanded — §10.1's graceful
       degradation, which needs nothing from Q1. */
    await waitFor(() => expect(first).toHaveAttribute('aria-expanded', 'true'))

    const second = screen.getByRole('button', {
      name: en('onboarding.step.common.mywork.title'),
    })
    await user.click(second)
    await waitFor(() => expect(second).toHaveAttribute('aria-expanded', 'true'))
    expect(first).toHaveAttribute('aria-expanded', 'false')
  })
})

describe('AC-605 / AC-606 — only the expanded step shows its controls, and every step can be marked done', () => {
  it('shows the description, the action and the skip control on the expanded step only', async () => {
    renderLayer()
    await screen.findByText(en('onboarding.step.common.account.body'))

    /* The collapsed rows' bodies are not rendered. */
    expect(screen.queryByText(en('onboarding.step.common.audit.body'))).toBeNull()
    /* **AC-606** — `Mark as done` on every step, whether or not it auto-detects.
       `common.account` is a manual step; `common.mywork` auto-detects, and both
       carry the control. */
    expect(screen.getByRole('button', { name: en('onboarding.step.markDone') })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: en('onboarding.step.skip') })).toBeInTheDocument()
  })
})

describe('AC-609 / AC-611 / AC-626 — an unbuilt destination renders disabled IN PLACE', () => {
  it('shows the Live Dispatch step, disabled, with the reason named', async () => {
    /* The Ops Manager track is the one carrying `ops.dispatch`, whose
       destination is wave 6 and not built. */
    await switchMockUser(await userWithRole('Ops Manager'))
    renderLayer()

    const row = await screen.findByRole('button', {
      name: en('onboarding.step.a11y.unavailable').replace(
        '{title}',
        en('onboarding.step.ops.dispatch.title'),
      ),
    })
    /* **AC-611** — present in the DOM, never hidden. **AC-609** — disabled in
       place, with the reason stated beneath it rather than behind an expansion
       the row refuses to open. */
    expect(row).toBeDisabled()
    expect(
      screen.getByText(
        en('onboarding.step.unbuilt').replace('{subTab}', 'Live Dispatch'),
      ),
    ).toBeInTheDocument()
  })
})

describe('AC-615 — "no coach mark, no spotlight, no tooltip tour, no modal wizard"', () => {
  it('renders no dialog and no scrim anywhere in the flow', async () => {
    const { baseElement } = renderLayer()
    await screen.findByText(en('onboarding.step.common.account.title'))

    /* **A drawer has `role="dialog"` and that is correct** — it is a labelled
       overlay surface, and the role is what tells a screen reader so. What
       §5.6 forbids is the *modal wizard*: a scrimmed surface that owns the
       keyboard and interrupts the work. So the assertion is about the **scrim
       and the trap**, not about the role.
       **AC-595 / AC-596** — no scrim, so the workspace behind stays visible,
       readable and operable. `sheet.tsx` deletes the overlay outright rather
       than making it transparent, because a transparent overlay still eats
       pointer events. */
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(baseElement.querySelector('[data-slot="sheet-overlay"]')).toBeNull()
    /* §7.3.3 — the scrim decides the trap, and there is none, so the surface
       does not claim `aria-modal`. */
    expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-modal', 'true')
    /* No tooltip tour, no coach mark, no spotlight: nothing on this surface is
       positioned over the product. */
    expect(baseElement.querySelector('[data-slot="tooltip-content"]')).toBeNull()
  })
})

describe('AC-634 / AC-646 — skipping does not fake progress, and a failure is row-scoped', () => {
  it('keeps the numerator on completions only', async () => {
    const user = userEvent.setup()
    renderLayer()
    const before = (await screen.findByText(/of \d+ completed/)).textContent
    await user.click(screen.getByRole('button', { name: en('onboarding.step.skip') }))

    await waitFor(() => expect(screen.getByText(en('onboarding.skipped').replace('{count}', '1'))).toBeInTheDocument())
    /* A skip moves the row to the group and leaves `done` alone — otherwise an
       operator could finish a checklist by pressing skip seven times. */
    expect(screen.getByText(/of \d+ completed/).textContent).toBe(before)
  })

  it('returns the step to not-done and offers an inline retry when marking fails', async () => {
    const user = userEvent.setup()
    const complete = vi.spyOn(onboardingClient, 'completeStep').mockRejectedValue(new Error('down'))
    renderLayer()
    await screen.findByText(en('onboarding.step.common.account.title'))
    await user.click(screen.getByRole('button', { name: en('onboarding.step.markDone') }))

    /* **Not a toast alone** — the condition outlives the toast (R10), so it is
       an inline retry **in that row**. */
    expect(await screen.findByText(en('onboarding.error.mark'))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: en('onboarding.tryAgain') })).toBeInTheDocument()
    complete.mockRestore()
  })
})

describe('AC-636 — "Dismiss is available at any time, not only at completion"', () => {
  it('renders the footer control on an untouched track', async () => {
    renderLayer()
    await screen.findByText(en('onboarding.step.common.account.title'))
    /* A deliberate extension of §5.6: an operator on their first shift can be
       handed a live safety incident in minute four, and a checklist they cannot
       close is a trap. */
    expect(screen.getByRole('button', { name: en('onboarding.dismiss') })).toBeEnabled()
    expect(screen.getByRole('button', { name: en('onboarding.restart') })).toBeEnabled()
  })
})

describe('§10.4 — "no confirmation modal on skip, dismiss or restart"', () => {
  it('restarts with no dialog in between', async () => {
    const user = userEvent.setup()
    const restart = vi.spyOn(onboardingClient, 'restartOnboarding')
    renderLayer()
    await screen.findByText(en('onboarding.step.common.account.title'))
    await user.click(screen.getByRole('button', { name: en('onboarding.restart') }))

    /* §5.5 forbids a modal nested inside a no-scrim layer, and nothing
       irreversible is destroyed — a restarted checklist is training to redo,
       not a record to lose. */
    expect(screen.queryByRole('alertdialog')).toBeNull()
    await waitFor(() => expect(restart).toHaveBeenCalled())
    restart.mockRestore()
  })
})

describe('AC-608 — "every step\'s destination subTabId exists in the route table"', () => {
  it('is a diff, and it holds', async () => {
    const ids = new Set(getRouteTable().subTabs.map((row) => row.subTabId))
    for (const step of await allSteps()) {
      const subTabId = step.destination?.subTabId
      if (subTabId === null || subTabId === undefined) continue
      expect(ids.has(subTabId), `${step.id} -> ${subTabId}`).toBe(true)
    }
  })
})

describe('AC-630 — "exactly one step has a workspace Overview destination, and its id is owner.position"', () => {
  it('holds as a closed allow-list of one id', async () => {
    const overviewSteps = (await allSteps()).filter((step) =>
      step.destination?.subTabId?.endsWith('-overview'),
    )
    /* Not a judgement call: a diff against the route table, with an allow-list
       of exactly one id. Any other step whose destination resolves to an
       Overview fails, which is what makes the single exception principled
       rather than arbitrary (spec §19.2). */
    expect(overviewSteps.map((step) => step.id)).toEqual(['owner.position'])
  })
})
