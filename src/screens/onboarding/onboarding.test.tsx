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
 *
 * **Three are SYNTHETICALLY covered and labelled `SYNTHETIC —` in their names:
 * AC-609, AC-611 and AC-626.** `UNBUILT_SUB_TAB_IDS` is empty since Live
 * Dispatch and Support › Tickets shipped, so **no step in any track is
 * unavailable today** and the unavailable row has no real fixture to reach it.
 * The behaviour is still tested — against a checklist assembled in this file —
 * and a `TRIPWIRE` case fails the day real data can carry it again. See the
 * block's own header for why this is labelled rather than deleted or left to
 * pass vacuously.
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
import { PERMISSION_KEYS } from '@/data/types/navigation'
import { ROLE_PERMISSIONS } from '@/data/types/session'

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
 *
 * **Asked for by id, not by signing in.** This used to `switchMockUser(user.id)`
 * and then call `getOnboarding()` bare — but the bare call reads the
 * `CURRENT_USER_ID` **constant**, not the operator the mock session is on, so
 * all four iterations returned `USR-1`'s Owner track. The map still had four
 * keys, because the keys come from the roster, and every consumer below
 * therefore checked **7 rows while its comment said 21**. Reported as a data
 * layer defect; corrected here so the union is real.
 */
async function tracks(): Promise<Map<string, OnboardingStep[]>> {
  const users = await listTeamUsers()
  const byRole = new Map<string, OnboardingStep[]>()
  for (const user of users) {
    if (byRole.has(user.role)) continue
    const checklist = await getOnboarding(user.id)
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
  const all = [...byId.values()]
  /* The count is the assertion. Every criterion below that says "all 21 rows"
     is only worth its wording if 21 rows actually arrived; a helper that
     quietly returned one track's seven would flatter five of them at once. */
  expect(all, 'the union of the four tracks').toHaveLength(21)
  return all
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

describe('AC-610 — the forbidden step is reachable at last', () => {
  /**
   * **This was `KNOWN-FAILING, and it must stay that way`.** It asserted
   * `requiredPermission: null` on all 21 rows and explained that making it pass
   * would need a permission model, *"and an invented one is indistinguishable
   * from a real one once it is in a fixture."* That reasoning was right.
   *
   * What changed is that the model is no longer hypothetical: D17 landed 21
   * permission keys and 35 of 36 route rows now carry a `viewPermission`. So the
   * gate is **derived** from each step's own destination — nothing invented —
   * and the forbidden treatment stops being unreachable.
   *
   * It was not academic. Support's track sent them into a Financials screen and
   * Finance's into an Operations queue; both roles hold neither permission.
   */
  it('gates each step by the permission its destination actually requires', async () => {
    const steps = await allSteps()
    const gated = steps.filter((step) => step.requiredPermission !== null)
    expect(gated.length, 'no step is gated, so the forbidden state is unreachable').toBeGreaterThan(0)

    /* The three that stay null are correct: two target a shell layer, and
       `admin-activity` is the one route open to every authenticated operator. */
    for (const step of steps) {
      if (step.requiredPermission !== null) continue
      const subTabId = step.destination?.subTabId ?? null
      expect(subTabId === null || subTabId === 'admin-activity', step.id).toBe(true)
    }
  })

  it('still carries the forbidden copy the treatment renders', () => {
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
       holds, and it is derived server-side so two screens cannot disagree.

       Both numbers are now DERIVED rather than written here. The literals were
       `3 of 13`, and both were wrong: the numerator read a stale stored list
       instead of `effectivePermissions`, and the denominator predated D17
       splitting `manage_settings` into four. Support holds 7 of 21. */
    const held = ROLE_PERMISSIONS['Support'].length
    expect(
      screen.getByText(`You hold ${held} of ${PERMISSION_KEYS.length} permissions.`),
    ).toBeInTheDocument()
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

/**
 * ═══ AC-609 / AC-611 / AC-626 — SYNTHETIC COVERAGE, and it says so ═══
 *
 * **These three criteria have no real fixture left to exercise them.**
 *
 * `available` was never fixture data: it is derived in `clients/onboarding.ts`
 * from `UNBUILT_SUB_TAB_IDS` in `clients/routes.ts` — which is precisely what
 * **AC-626** asks for, *"becomes enabled with no change to
 * `fixtures/onboardingTracks.ts`"*. Live Dispatch (`operations-dispatch`) and
 * Support › Tickets (`support-tickets`) have since shipped, the route-table
 * owner emptied that register, and **`UNBUILT_SUB_TAB_IDS` is now `[]`**. Every
 * destination in all four tracks resolves and is built, so **no step in the
 * product is unavailable today**. AC-626 is therefore *satisfied by
 * observation*: the two steps became enabled and this fixture did not move.
 *
 * The criteria are **not deleted** — the unavailable treatment is still the
 * designed behaviour for the next unbuilt destination, and the day one appears
 * an operator meets this row. So it is tested against a checklist **built in
 * this file**, and the label is deliberate: DECISIONS.md § *"a negative
 * assertion can pass vacuously"* — the general test is *what would have to be
 * broken for this to fail?* For a real-data version of this test the answer is
 * now **nothing I can construct**, which makes it vacuous, and a vacuous test
 * is a false tick. Labelling it synthetic is the honest alternative to
 * quietly reporting a green criterion that measured nothing.
 *
 * The synthetic checklist is the **real** Ops Manager checklist with exactly
 * the two fields the data layer would flip flipped — nothing else is invented.
 * The tripwire below fails the day real data can carry this again.
 */
describe('AC-609 / AC-611 / AC-626 — an unbuilt destination renders disabled IN PLACE', () => {
  /**
   * The real Ops Manager checklist with `ops.dispatch` demoted to unavailable —
   * byte-for-byte what `assemble()` returns if `operations-dispatch` goes back
   * into `UNBUILT_SUB_TAB_IDS`. `totalCount` is recomputed the way the client
   * computes it (reachable only, **AC-603**) rather than hard-coded to 7.
   */
  async function withUnbuiltDispatch() {
    /* Asked for **by id**. `getOnboarding()` with no argument reads the
       `CURRENT_USER_ID` constant rather than the operator `switchMockUser` last
       signed in as, so switching and then calling it bare returns somebody
       else's track — reported separately, worked around here. */
    const real = await getOnboarding(await userWithRole('Ops Manager'))
    const steps = real.steps.map((step) =>
      step.id === 'ops.dispatch' ? { ...step, available: false, reachable: false } : step,
    )
    const reachable = steps.filter((step) => step.reachable)
    return {
      ...real,
      steps,
      totalCount: reachable.length,
      doneCount: reachable.filter((step) => real.state.completedStepIds.includes(step.id)).length,
    }
  }

  it('SYNTHETIC — shows the Live Dispatch step, disabled, with the reason named', async () => {
    const checklist = await withUnbuiltDispatch()
    const get = vi.spyOn(onboardingClient, 'getOnboarding').mockResolvedValue(checklist)
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
      screen.getByText(en('onboarding.step.unbuilt').replace('{subTab}', 'Live Dispatch')),
    ).toBeInTheDocument()
    get.mockRestore()
  })

  it('SYNTHETIC — renders eight rows and a progress line out of seven — AC-603 vs AC-624', async () => {
    /* The two counts measure different things (spec §19.3): every step is in
       `steps`, only the reachable ones are in `total`. Asserted through the
       layer, because conflating them is what makes a QA engineer file a defect
       against a correct screen. */
    const checklist = await withUnbuiltDispatch()
    expect(checklist.steps).toHaveLength(8)
    expect(checklist.totalCount).toBe(7)
    const get = vi.spyOn(onboardingClient, 'getOnboarding').mockResolvedValue(checklist)
    renderLayer()

    expect(
      await screen.findByText(
        en('onboarding.progress').replace('{done}', '0').replace('{total}', '7'),
      ),
    ).toBeInTheDocument()
    /* AC-611 — eight rows on screen, none hidden, including the disabled one. */
    const titles = checklist.steps.map((step) => en(step.titleKey))
    for (const title of titles) {
      expect(screen.getByText(title), title).toBeInTheDocument()
    }
    expect(titles).toHaveLength(8)
    get.mockRestore()
  })

  it('TRIPWIRE — no real step is unavailable today, so the case above must stay synthetic', async () => {
    /**
     * **Delete the synthetic scaffolding above and retarget it at real data the
     * day this fails.** It fails when some step's destination stops being built
     * — a new sub-tab lands in `UNBUILT_SUB_TAB_IDS`, or a destination is
     * renamed out of the route table — which is exactly the condition that
     * gives AC-609/AC-611 a real fixture again.
     *
     * It is also the guard the old test was silently doing: that test read as
     * *"the unavailable treatment works"* and had degenerated into *"Live
     * Dispatch is still unbuilt"*, which stopped being true without anyone
     * being told.
     */
    const unavailable = (await allSteps()).filter((step) => !step.available)
    expect(unavailable.map((step) => step.id)).toEqual([])
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
