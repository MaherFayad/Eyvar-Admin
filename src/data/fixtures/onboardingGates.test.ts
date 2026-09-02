/**
 * **An onboarding step may never point somewhere its reader cannot go.**
 *
 * All 22 steps shipped `requiredPermission: null`, blocked on a foundation
 * question that had since been answered — 35 of 36 route rows now carry a
 * `viewPermission`, and nobody closed the loop. The consequence was on screen:
 *
 *   - **Support** step 6 (`support.goodwill`) sent them to
 *     `financials-rider-wallets`, which needs `view_finance`. The permission
 *     model's own comment says *"No `view_finance`, so the Financials tile does
 *     not render at all."*
 *   - **Finance** step 2 (`common.mywork`) sent them to `operations-my-work`,
 *     which needs `view_operations`.
 *
 * So two of the four tracks walked an operator into a workspace their role
 * forbids — the exact failure a role-varied track exists to prevent.
 *
 * The gate is now **derived** from the destination rather than hand-written,
 * and this test is what keeps them equal. A hand-written list would drift the
 * first time a route moved workspace.
 */

import { describe, expect, it } from 'vitest'
import { onboardingStepSeeds as ONBOARDING_STEPS } from './onboardingTracks'
import { SUB_TABS } from './routeTable'

const permissionOf = new Map(SUB_TABS.map((row) => [row.subTabId, row.viewPermission]))

describe('an onboarding step is gated by the permission its destination requires', () => {
  it('matches every step against its own route row', () => {
    const mismatched = ONBOARDING_STEPS.filter((step) => {
      const subTabId = step.destination?.subTabId ?? null
      if (subTabId === null) return false
      return step.requiredPermission !== permissionOf.get(subTabId)
    }).map((step) => `${step.id} -> ${step.destination?.subTabId}`)

    expect(mismatched, 'a step gated differently from where it sends the operator').toEqual([])
  })

  it('leaves a shell-layer step ungated, because a layer has no route permission', () => {
    for (const step of ONBOARDING_STEPS) {
      if ((step.destination?.subTabId ?? null) !== null) continue
      expect(step.requiredPermission, `${step.id} targets a layer`).toBeNull()
    }
  })

  it('names a real route for every step that names one at all', () => {
    const unknown = ONBOARDING_STEPS.filter(
      (step) =>
        (step.destination?.subTabId ?? null) !== null &&
        !permissionOf.has(step.destination!.subTabId as string),
    ).map((step) => `${step.id} -> ${step.destination?.subTabId}`)

    expect(unknown, 'a step pointing at a sub-tab that does not exist').toEqual([])
  })

  /* The regression that started this, asserted by name so it cannot come back
     quietly under a different step id. */
  it('does not send Support into Financials or Finance into Operations', () => {
    const goodwill = ONBOARDING_STEPS.find((s) => s.id === 'support.goodwill')
    expect(goodwill?.requiredPermission).toBe('view_finance')

    const mywork = ONBOARDING_STEPS.find((s) => s.id === 'common.mywork')
    expect(mywork?.requiredPermission).toBe('view_operations')
  })
})
