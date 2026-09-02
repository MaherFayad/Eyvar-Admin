/**
 * The guided onboarding checklist — spec §8, design §10.
 *
 * Five operations, all registered so `?mockFail=` reaches them, because **every
 * one of them has a designed failure state**: `onboarding.get` is AC-649's
 * card-scoped error inside the layer, and `completeStep` / `skipStep` /
 * `dismiss` are AC-646 and AC-647's **row-scoped** ones. A mock that could only
 * succeed would leave three of those unbuildable.
 *
 * ## Everything derived is derived here, and a component recomputes none of it
 *
 * `available`, `reachable`, `doneCount`, `totalCount`, `isComplete` and the two
 * permission counts arrive resolved. §8.2's rule — *a derived value is not a
 * disabled input* — plus the specific trap in this feature: **`totalCount`
 * counts reachable steps and `steps.length` does not**, and a layer that
 * computed its own progress line would eventually disagree with the account
 * menu's `n / m` about the same track.
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { EYVAR_NOW } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import type { OnboardingStepSeed } from '../fixtures/onboardingTracks'
/**
 * **The signed-in operator, not the seeded constant.**
 *
 * Every `userId ?? …` default below used to read the Owner's fixture
 * constant. That made `switchMockUser` invisible to this whole client:
 * `getOnboarding()` with no argument returned the Owner's track no matter
 * who was signed in. `session.ts` names this exact defect in
 * `currentMockPermissions`'s doc comment — *"reading the constant instead,
 * as some older clients do, would make `switchMockUser` invisible to it"* —
 * and this was one of the older clients.
 *
 * Low impact at runtime, because the shell passes an explicit id. High
 * impact on test integrity: a helper that switched user and then asked bare
 * got one track four times, which silently narrowed five acceptance criteria
 * to a third of the rows they claimed to cover.
 */
import { currentMockUserId } from './session'
import { PERMISSION_KEYS, type PermissionKey } from '../types/navigation'
import type { RoleName } from '../types/session'
import type {
  OnboardingChecklist,
  OnboardingState,
  OnboardingStep,
} from '../types/onboarding'
import { http } from './http'
import { findShellLayer, isSubTabBuilt } from './routes'
import { onFixturesLoaded, type Fixtures } from '../mock/fixtures'
import { effectivePermissions } from '../types/session'

/* Late-bound fixture rows. `mock/fixtures.ts` says why this is not a static
   import: a static one pins seeded data into every build, including the http
   build that can never read it. Bound before any mock read, because `mock()`
   and `mockMutation()` await `loadFixtures()`. */
let ONBOARDING_TRACKS!: Fixtures['ONBOARDING_TRACKS']
let onboardingStepSeeds!: Fixtures['onboardingStepSeeds']
let teamUserFixtures!: Fixtures['teamUserFixtures']
let authIdentityFixtures!: Fixtures['authIdentityFixtures']
onFixturesLoaded((f) => {
  ONBOARDING_TRACKS = f.ONBOARDING_TRACKS
  onboardingStepSeeds = f.onboardingStepSeeds
  teamUserFixtures = f.teamUserFixtures
  authIdentityFixtures = f.authIdentityFixtures
})

export const ONBOARDING_OPERATIONS = {
  get: 'onboarding.get',
  completeStep: 'onboarding.completeStep',
  skipStep: 'onboarding.skipStep',
  dismiss: 'onboarding.dismiss',
  restart: 'onboarding.restart',
  markAutoOpened: 'onboarding.markAutoOpened',
} as const

/* Registered at module load, not on first call. `config.ts` says *"each client
   registers its ids here at module load"*, and `mock()` only registers when it
   runs — so an operation nobody has invoked yet is missing from a QA panel's
   list and from any validation of `?mockFail=`. Every id in this module is
   listed the moment the module is imported. */
registerOperations(...Object.values(ONBOARDING_OPERATIONS))

/**
 * The intro's denominator — *"You hold 3 of N permissions."*
 *
 * **Derived, not a literal.** It was hardcoded to `13`, the count from before
 * D17 split `manage_settings` into four; the model has had **21** since. Every
 * role's intro therefore quoted a denominator that had been wrong for a whole
 * decision cycle, on the first screen a new operator reads.
 */
const PERMISSION_TOTAL = PERMISSION_KEYS.length

/* ─────────────────────── in-memory operator state ─────────────────────── */

const states = new Map<string, OnboardingState>()

export function resetOnboarding(): void {
  states.clear()
}

function blankState(userId: string, role: RoleName): OnboardingState {
  return {
    userId,
    trackRole: role,
    startedAt: EYVAR_NOW,
    completedStepIds: [],
    skippedStepIds: [],
    archivedStepIds: [],
    dismissedAt: null,
    completedAt: null,
    /* **AC-594.** Blank state is created on the first read, and this is the
       field that makes that harmless: *never auto-opened* stays askable after
       any number of reads, because only a mutation can change it. */
    autoOpenedAt: null,
  }
}

/**
 * **AC-594 — should the layer open itself right now?**
 *
 * Derived here rather than in the shell so there is **one** answer to the
 * question. Two screens computing "has this operator seen the guide" from two
 * combinations of the same three fields is how one of them ends up re-opening a
 * dismissed layer.
 *
 * Never auto-opened, and never dismissed. Nothing about completion enters into
 * it: an operator who finished the whole track in one sitting and never closed
 * the layer has still seen it.
 */
export function shouldAutoOpen(state: OnboardingState): boolean {
  return state.autoOpenedAt === null && state.dismissedAt === null
}

/**
 * **AC-642 — a role change archives, it does not delete.**
 *
 * *"A demotion must not read as regression."* Step ids present in **both**
 * tracks and already completed **stay completed** — which is exactly what makes
 * the three shared `common.*` ids worth having one row each: nobody redoes them.
 * Ids the new track cannot reach move to `archivedStepIds` and render read-only
 * in a collapsed group (**AC-644**), excluded from `total`.
 */
function retrackFor(state: OnboardingState, role: RoleName): OnboardingState {
  if (state.trackRole === role) return state
  const nextIds = new Set(ONBOARDING_TRACKS[role] ?? [])
  const stillReachable = state.completedStepIds.filter((id) => nextIds.has(id))
  const nowArchived = state.completedStepIds.filter((id) => !nextIds.has(id))
  return {
    ...state,
    trackRole: role,
    completedStepIds: stillReachable,
    skippedStepIds: state.skippedStepIds.filter((id) => nextIds.has(id)),
    archivedStepIds: [...new Set([...state.archivedStepIds, ...nowArchived])],
  }
}

function stateFor(userId: string, role: RoleName): OnboardingState {
  const existing = states.get(userId)
  const next = existing ? retrackFor(existing, role) : blankState(userId, role)
  states.set(userId, next)
  return next
}

/* ───────────────────────────── resolution ─────────────────────────────── */

/**
 * `available` — **the destination's sub-tab exists AND is built**.
 *
 * A `layer` destination is always available: the three shell layers are built
 * and a layer needs no sub-tab. A `null` destination is available too — a step
 * with no destination is completed by stating a fact, not by going somewhere.
 *
 * The build fact comes from `UNBUILT_SUB_TAB_IDS` in `clients/routes.ts`, which
 * is why **AC-626 holds**: `ops.dispatch` becomes enabled by deleting one line
 * there, with **no change to `fixtures/onboardingTracks.ts`**.
 */
function isAvailable(seed: OnboardingStepSeed): boolean {
  const dest = seed.destination
  if (dest === null) return true
  if (dest.layer !== null) return findShellLayer(dest.layer === 'profile' ? 'entity' : 'account') !== null
  if (dest.subTabId === null) return false
  return isSubTabBuilt(dest.subTabId)
}

/**
 * `reachable` — `available` **and** the operator holds `requiredPermission`.
 *
 * **Collapses to `available` today**, because every `requiredPermission` is
 * `null` (**Q4**). The branch is written anyway: the day Q4 lands, this is the
 * one line that changes and every screen already reads the right field.
 */
function isReachable(seed: OnboardingStepSeed, held: readonly PermissionKey[]): boolean {
  if (!isAvailable(seed)) return false
  if (seed.requiredPermission === null) return true
  return held.includes(seed.requiredPermission)
}

function resolveSteps(role: RoleName, held: readonly PermissionKey[]): OnboardingStep[] {
  const ids = ONBOARDING_TRACKS[role]
  /* **AC-617 — no default and no fallback.** A role with no track is a bug and
     must read as one, not quietly inherit somebody else's checklist. */
  if (!ids) throw notFound('onboarding track', role)
  return ids.map((id) => {
    const seed = onboardingStepSeeds.find((s) => s.id === id)
    if (!seed) throw notFound('onboarding step', id)
    return { ...seed, available: isAvailable(seed), reachable: isReachable(seed, held) }
  })
}

/**
 * Every seeded operator plus the three §10.3 identities, by whichever id was used.
 *
 * **`effectivePermissions`, not the raw fixture field.** `clients/session.ts`
 * derives what an operator holds as the D17 role baseline plus their
 * `permissionDelta`; this read `user.permissions` directly, which is the
 * *stored* list and predates the five workspace read keys. The two disagreed, so
 * onboarding gated against a narrower set than the rest of the product — the
 * Owner, who can open every workspace in the app, was measured holding 14 of 21
 * here and would have had five of seven track steps hidden from them.
 *
 * It was invisible while every `requiredPermission` was `null`. The moment the
 * gates became real, so did the divergence. One source for "what may this
 * operator do", and it is `effectivePermissions`.
 */
function actorFor(userId: string): { role: RoleName; permissions: PermissionKey[] } {
  const user = teamUserFixtures.find((u) => u.id === userId)
  if (user) return { role: user.role, permissions: effectivePermissions(user.role, user.permissionDelta) }
  const found = authIdentityFixtures.find((i) => i.email === userId || i.userId === userId)
  /* **Auth identities keep their explicit list.** These are deliberate §10.3
     personas — `newrole@eyvar.com` holds ZERO permissions on purpose, to reach
     the empty track — and running them through the role baseline would hand
     that persona a full Owner track and delete the state it exists to test.
     The divergence being fixed above is about SEEDED OPERATORS, whose stored
     list had fallen behind the role model; a persona has no such list to fall
     behind. */
  if (found) return { role: found.role, permissions: found.permissions }
  throw notFound('operator', userId)
}

function assemble(userId: string): OnboardingChecklist {
  const { role, permissions } = actorFor(userId)
  const state = stateFor(userId, role)
  const steps = resolveSteps(role, permissions)
  const reachable = steps.filter((s) => s.reachable)
  const doneCount = reachable.filter((s) => state.completedStepIds.includes(s.id)).length
  const settled = reachable.filter(
    (s) => state.completedStepIds.includes(s.id) || state.skippedStepIds.includes(s.id),
  ).length

  return {
    userId,
    role,
    /* **AC-611 — no step is hidden.** The unreachable ones are in this array and
       render disabled in place with the reason named. They are only out of
       `totalCount`. */
    steps,
    state,
    permissionsHeld: permissions.length,
    permissionsTotal: PERMISSION_TOTAL,
    /* **AC-634 — a skip does not fake progress.** Completed only. */
    doneCount,
    /* **AC-603 — reachable only.** An Ops Manager sees 8 rows and `n of 7`. */
    totalCount: reachable.length,
    /* **AC-635.** `0 of 0` is complete — which is `track-empty`'s neighbour and
       deliberately not the same state: §10.3 renders `track-empty` when there
       is nothing to be `0 of 0` about. */
    isComplete: settled === reachable.length,
  }
}

/* ──────────────────────────────── reads ───────────────────────────────── */

/**
 * GET /api/v1/me/onboarding
 *   params: userId  (omit for the caller; another operator's needs `manage_team`)
 *   -> OnboardingChecklist  { steps[], state, counts }
 *
 * **One request, not three.** The layer lays out as a unit — intro card,
 * progress line, step list — and a panel that resolves in three stages reflows
 * twice before it settles. Same reason `getMetricBoard` is one call.
 *
 * The four states this endpoint owes (§10.3): **content**, **`track-empty`**
 * (`steps` empty — one grey sentence, no illustration, no intro and no progress
 * line), **loading** (a skeleton shaped like the step list, never a spinner)
 * and **error** (card-scoped, inside the layer, console behind it still
 * working).
 */
export async function getOnboarding(
  userId?: string,
  signal?: AbortSignal,
): Promise<OnboardingChecklist> {
  if (DATA_SOURCE === 'http') {
    return http.get<OnboardingChecklist>('/me/onboarding', { userId }, { signal })
  }
  return mock(ONBOARDING_OPERATIONS.get, signal, () => assemble(userId ?? currentMockUserId()))
}

/* ────────────────────────────── mutations ─────────────────────────────── */

/**
 * POST /api/v1/me/onboarding/steps/:stepId/complete
 *   body: { source: 'manual' | 'auto' }
 *   -> OnboardingChecklist
 *
 * **`Mark as done` exists on every step** whether or not it auto-detects
 * (**AC-606**, §5.6's MUST), so `source` records which path was taken rather
 * than gating the call.
 *
 * **Auto-completion produces no toast** (**AC-612**). The operator already got
 * the real task's own toast; a second one for a checklist tick is a toast where
 * nothing is needed, and the standing signal is the account menu's `n / m` —
 * which is where R10 routes a standing condition. Stated because an engineer
 * will otherwise add the toast.
 *
 * **Completing a step already completed is not an error** — **AC-648**'s
 * `stale-state`: two tabs race, the second one finds the work already done, and
 * the layer re-reads rather than raising a banner. A 409 here would turn a
 * benign race into a page condition.
 */
export async function completeStep(
  stepId: string,
  source: 'manual' | 'auto' = 'manual',
  userId?: string,
  signal?: AbortSignal,
): Promise<OnboardingChecklist> {
  if (DATA_SOURCE === 'http') {
    return http.post<OnboardingChecklist>(
      `/me/onboarding/steps/${stepId}/complete`,
      { source, userId },
      { signal },
    )
  }
  return mockMutation(ONBOARDING_OPERATIONS.completeStep, signal, () => {
    const id = userId ?? currentMockUserId()
    const checklist = assemble(id)
    if (!checklist.steps.some((s) => s.id === stepId)) throw notFound('onboarding step', stepId)
    const state = checklist.state
    states.set(id, {
      ...state,
      completedStepIds: [...new Set([...state.completedStepIds, stepId])],
      /* Completing an earlier-skipped step un-skips it. The two lists are
         disjoint by construction, so a step cannot be counted twice. */
      skippedStepIds: state.skippedStepIds.filter((s) => s !== stepId),
    })
    return finish(id)
  })
}

/**
 * POST /api/v1/me/onboarding/steps/:stepId/skip
 *   body: { skipped: boolean }   ← `false` is AC-633's `Do this step`
 *   -> OnboardingChecklist
 *
 * **Any step, any time, no confirmation** (§10.4). Recorded **distinctly from
 * done**, because §5.6's progress line counts completions and a skip that
 * counted would let an operator finish a checklist by pressing skip seven times
 * (**AC-634**).
 *
 * `skipped: false` un-skips: the row leaves the `Skipped (n)` group, returns to
 * its position in the list and expands (**AC-633**).
 */
export async function skipStep(
  stepId: string,
  skipped = true,
  userId?: string,
  signal?: AbortSignal,
): Promise<OnboardingChecklist> {
  if (DATA_SOURCE === 'http') {
    return http.post<OnboardingChecklist>(
      `/me/onboarding/steps/${stepId}/skip`,
      { skipped, userId },
      { signal },
    )
  }
  return mockMutation(ONBOARDING_OPERATIONS.skipStep, signal, () => {
    const id = userId ?? currentMockUserId()
    const checklist = assemble(id)
    if (!checklist.steps.some((s) => s.id === stepId)) throw notFound('onboarding step', stepId)
    const state = checklist.state
    states.set(id, {
      ...state,
      skippedStepIds: skipped
        ? [...new Set([...state.skippedStepIds, stepId])]
        : state.skippedStepIds.filter((s) => s !== stepId),
    })
    return finish(id)
  })
}

/**
 * POST /api/v1/me/onboarding/auto-opened
 *   -> OnboardingChecklist
 *
 * **Records that the layer opened itself. AC-593 and AC-594's other half.**
 *
 * Called by the shell **at the moment it auto-opens the layer**, not when it
 * decides to. The distinction is the whole reason this is a mutation rather
 * than a flag flipped inside `getOnboarding`: a read that stamped would answer
 * *"already seen"* for a session that never rendered the layer at all —
 * an operator whose tab closed between the read and the paint would lose their
 * one automatic opening and never be offered it again.
 *
 * **Idempotent.** A second call keeps the first instant, because the field
 * records *when the layer first opened itself* and a re-stamp would make a
 * remount look like a second automatic opening. Two tabs racing at sign-in is
 * the ordinary case, not the exotic one.
 *
 * It does **not** mark anything complete (**AC-597**) and it does not dismiss.
 */
export async function markOnboardingAutoOpened(
  userId?: string,
  signal?: AbortSignal,
): Promise<OnboardingChecklist> {
  if (DATA_SOURCE === 'http') {
    return http.post<OnboardingChecklist>('/me/onboarding/auto-opened', { userId }, { signal })
  }
  return mockMutation(ONBOARDING_OPERATIONS.markAutoOpened, signal, () => {
    const id = userId ?? currentMockUserId()
    const state = assemble(id).state
    if (state.autoOpenedAt === null) states.set(id, { ...state, autoOpenedAt: EYVAR_NOW })
    return finish(id)
  })
}

/**
 * POST /api/v1/me/onboarding/dismiss
 *   -> OnboardingChecklist
 *
 * **Available at any time, not only at completion** (**AC-636**) — a deliberate
 * extension of §5.6, which only makes a *completed* guide dismissible. The
 * reason is operational: an operator on their first shift can be handed a live
 * safety incident in minute four, and a checklist they cannot close is a trap.
 *
 * §5.6's *"MUST NOT resurrect it afterwards"* is honoured exactly — **no
 * auto-open and no banner, ever again** (**AC-637**, **AC-638**). The account
 * menu entry stays, without its count indicator, so it is dismissed and not
 * destroyed.
 */
export async function dismissOnboarding(
  userId?: string,
  signal?: AbortSignal,
): Promise<OnboardingChecklist> {
  if (DATA_SOURCE === 'http') {
    return http.post<OnboardingChecklist>('/me/onboarding/dismiss', { userId }, { signal })
  }
  return mockMutation(ONBOARDING_OPERATIONS.dismiss, signal, () => {
    const id = userId ?? currentMockUserId()
    const state = assemble(id).state
    states.set(id, { ...state, dismissedAt: EYVAR_NOW })
    return finish(id)
  })
}

/**
 * POST /api/v1/me/onboarding/restart
 *   body: { userId? }   ← another operator's needs `manage_team` (**AC-641**)
 *   -> OnboardingChecklist
 *
 * Clears completions **for the current track only** (**AC-640**), un-dismisses,
 * and re-renders at `0 of {total}`.
 *
 * **`archivedStepIds` survives a restart.** Restarting the *current* track is
 * not a claim about what an operator did under a previous role, and deleting
 * that record would make a demotion read as a regression twice over.
 *
 * **So does `autoOpenedAt`, and it is the more important of the two.** A
 * restart is the operator's own act, taken from the account menu, with the
 * layer already open in front of them — it is not a new account and it is not a
 * first session. Clearing the stamp would re-arm the automatic opening and give
 * them a layer that reappears at the next sign-in, which §5.6 forbids in the
 * same sentence that permits the restart (**AC-637**, **AC-638**).
 */
export async function restartOnboarding(
  userId?: string,
  signal?: AbortSignal,
): Promise<OnboardingChecklist> {
  if (DATA_SOURCE === 'http') {
    return http.post<OnboardingChecklist>('/me/onboarding/restart', { userId }, { signal })
  }
  return mockMutation(ONBOARDING_OPERATIONS.restart, signal, () => {
    const id = userId ?? currentMockUserId()
    const state = assemble(id).state
    states.set(id, {
      ...state,
      completedStepIds: [],
      skippedStepIds: [],
      dismissedAt: null,
      completedAt: null,
      startedAt: EYVAR_NOW,
    })
    return finish(id)
  })
}

/** Re-assemble, then stamp `completedAt` once the track has just become complete. */
function finish(userId: string): OnboardingChecklist {
  const checklist = assemble(userId)
  const shouldStamp = checklist.isComplete && checklist.totalCount > 0
  if (shouldStamp !== (checklist.state.completedAt !== null)) {
    const next = { ...checklist.state, completedAt: shouldStamp ? EYVAR_NOW : null }
    states.set(userId, next)
    return { ...checklist, state: next }
  }
  return checklist
}
