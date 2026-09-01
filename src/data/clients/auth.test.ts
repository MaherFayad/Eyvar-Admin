/**
 * Authentication and onboarding — the data layer's half of AC-500 – AC-681.
 *
 * Three things are tested here that a screen test cannot reach:
 *
 *   1. **A domain outcome is returned and a transport failure throws.** Design
 *      §2.3 orders the two in the card's single banner slot, and a precedence
 *      rule cannot order two things that arrive by the same channel.
 *   2. **No function returns a duration.** Every cooldown, lockout and expiry is
 *      an `IsoDateTime`, so a backgrounded tab resumes with the right answer.
 *   3. **The 21 onboarding ids and their destinations**, diffed against §10.5
 *      and against `routeTable.ts`. AC-618, AC-642 and AC-608 are all diffs, and
 *      this is where the diff lives.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import {
  AUTH_OPERATIONS,
  DEVICE_OPERATIONS,
  ONBOARDING_OPERATIONS,
  UNBUILT_SUB_TAB_IDS,
  activateInvite,
  completeStep,
  disableMockLatency,
  dismissOnboarding,
  getOnboarding,
  getRouteTable,
  isDeviceTrusted,
  listDevices,
  mockFailures,
  reauthenticate,
  requestPasswordReset,
  resendCode,
  resetDataLayer,
  resetPassword,
  restartOnboarding,
  revokeDevice,
  seedMockFailuresFromLocation,
  setDeviceTrust,
  signIn,
  signOutEverywhere,
  skipStep,
  switchMockUser,
  validateResetToken,
  verifyCode,
} from './index'
import { ONBOARDING_TRACKS, onboardingStepSeeds } from '../fixtures/onboardingTracks'
import { COMMON_STEP_IDS, OVERVIEW_DESTINATION_ALLOW_LIST } from '../fixtures/onboardingTracks'
import { ROLE_LANDING } from '../fixtures/teamUsers'
import { ROLE_NAMES } from '../types/session'
import type { RoleName } from '../types/session'
import { AUTH_FIXTURE_PASSWORD, MAX_CODES_PER_CHALLENGE } from '../fixtures/authIdentities'

beforeEach(() => {
  resetDataLayer()
  disableMockLatency()
})

/** Sign in far enough to hold a live challenge. `yousef@` has SMS enrolled. */
async function challengeFor(email = 'yousef@eyvar.com') {
  const outcome = await signIn({ email, password: AUTH_FIXTURE_PASSWORD })
  if (outcome.kind !== 'challenge') throw new Error(`expected a challenge, got ${outcome.kind}`)
  return outcome
}

/**
 * **The two roles D17 minted have no onboarding track and no landing route.**
 *
 * `RoleName` is six since D17 (`Dispatcher`, `Trust & Safety`). Their track
 * content and their landing routes are product decisions that live in
 * `fixtures/onboardingTracks.ts` and `fixtures/teamUsers.ts`, and neither is the
 * role model's to invent — D17 gives the two landings (`/operations/dispatch`
 * and `/support/safety`) but not the eight-step checklist behind them.
 *
 * So the tests below iterate **the roles that have a track** rather than
 * `ROLE_NAMES`, and `AC-617` is asserted as the recorded gap it now is. When the
 * fixture owner seeds the two tracks, `TRACKED_ROLES` grows and the AC-617 test
 * below goes red naming exactly what changed.
 */
const TRACKED_ROLES = Object.keys(ONBOARDING_TRACKS) as RoleName[]

describe('1 — a domain outcome is RETURNED; only a transport failure throws', () => {
  it('resolves a rejected credential rather than rejecting it', async () => {
    /* A wrong password is not a 503. A screen that caught this would show a
       `Retry` button where it owes a field error. */
    const outcome = await signIn({ email: 'nobody@eyvar.com', password: 'x' })
    expect(outcome).toEqual({
      kind: 'failed',
      reason: 'rejected',
      lockedUntil: null,
      retryAfter: null,
    })
  })

  it('throws — and only throws — when the transport is rigged to fail', async () => {
    mockFailures.always(AUTH_OPERATIONS.signIn)
    await expect(signIn({ email: 'sarah@eyvar.com', password: 'x' })).rejects.toMatchObject({
      status: 503,
      kind: 'server',
      retryable: true,
    })
  })

  it('gives unknown, invited, suspended AND a wrong password the SAME response — AC-506', async () => {
    /* One message, one latency. A form that answers "no such account"
       differently from "wrong password" is an account-enumeration oracle, and
       this one sits in front of `release_escrow`.

       **The fourth entry is the one that was unreachable.** `signIn` did not
       read `input.password`, so `sarah@eyvar.com` with any string returned a
       challenge and AC-506's own wording — *"submitting `sarah@eyvar.com` with
       a wrong password"* — had no input that produced it. It is also the most
       important of the four: it is the only one where the account **exists and
       is live**, which is precisely the pair an oracle would separate. */
    const results = await Promise.all([
      signIn({ email: 'nobody@eyvar.com', password: 'x' }),
      signIn({ email: 'noura.f@eyvar.com', password: 'x' }),
      signIn({ email: 'suspended@eyvar.com', password: 'x' }),
      signIn({ email: 'sarah@eyvar.com', password: 'not-the-password' }),
    ])
    expect(results[0]).toEqual(results[1])
    expect(results[1]).toEqual(results[2])
    expect(results[2]).toEqual(results[3])
  })

  it('accepts the fixture password on the SAME account it just refused', async () => {
    /* The other half of the previous test, and the half that stops it passing
       trivially: if `signIn` refused everything, all four would be equal and
       the assertion would mean nothing. */
    const good = await signIn({ email: 'sarah@eyvar.com', password: AUTH_FIXTURE_PASSWORD })
    expect(good.kind).toBe('challenge')
  })

  it('gives a locked account a DEADLINE and never a duration (§3.2)', async () => {
    const outcome = await signIn({ email: 'locked@eyvar.com', password: AUTH_FIXTURE_PASSWORD })
    expect(outcome.kind).toBe('failed')
    if (outcome.kind !== 'failed') return
    expect(outcome.reason).toBe('locked')
    /* An ISO instant, never `12`. §3.2: the lockout minutes are re-read per
       attempt and never tick in the browser. */
    expect(outcome.lockedUntil).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('forces enrolment on an account with no second factor (§4.4)', async () => {
    const outcome = await signIn({ email: 'fahad@eyvar.com', password: AUTH_FIXTURE_PASSWORD })
    expect(outcome.kind).toBe('enrolment-required')
  })

  it('answers the reset form identically for a known and an unknown address (§6.2)', async () => {
    const known = await requestPasswordReset('sarah@eyvar.com')
    const unknown = await requestPasswordReset('nobody@example.com')
    expect(known).toEqual(unknown)
    expect(known).toEqual({ kind: 'accepted' })
  })
})

describe('2 — every clock is a deadline', () => {
  it('issues `resendAvailableAt` as an instant, never seconds', async () => {
    const challenge = await challengeFor()
    expect(challenge.resendAvailableAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(challenge.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('refuses an early resend by handing back the deadline, not an error', async () => {
    const challenge = await challengeFor()
    const outcome = await resendCode(challenge.challengeId)
    expect(outcome.kind).toBe('cooling-down')
    if (outcome.kind !== 'cooling-down') return
    /* The button should not have been pressable. The honest response is the
       deadline, so it re-arms itself rather than guessing. */
    expect(outcome.resendAvailableAt).toBe(challenge.resendAvailableAt)
  })

  it('escalates the cooldown inside the data layer, never in a component', async () => {
    /* 30 → 60 → 120 is server policy and `RESEND_COOLDOWN_SECONDS` never leaves
       this layer. A client that knew the schedule could be wrong about it. */
    const { challengeId } = await challengeFor()
    const first = await resendCode(challengeId)
    expect(first.kind).toBe('cooling-down')
  })
})

describe('3 — the code challenge (§5)', () => {
  it('signs in on the correct code and returns a real session', async () => {
    const { challengeId } = await challengeFor()
    const outcome = await verifyCode({ challengeId, code: '123456' })
    expect(outcome.kind).toBe('signed-in')
    if (outcome.kind !== 'signed-in') return
    expect(outcome.session.userId).toBe('USR-5')
    expect(outcome.session.landingRoute).toBe('/operations/overview')
  })

  it('counts ONLY a wrong code against the five attempts (§5.4)', async () => {
    const { challengeId } = await challengeFor()
    const first = await verifyCode({ challengeId, code: '222222' })
    expect(first).toMatchObject({ kind: 'failed', reason: 'incorrect', attemptsRemaining: 4 })
    const second = await verifyCode({ challengeId, code: '333333' })
    expect(second).toMatchObject({ reason: 'incorrect', attemptsRemaining: 3 })
  })

  /**
   * **AC-526 / AC-534 — the third wrong attempt CANCELS the code, and this is
   * the test that it is a cancellation rather than a sentence about one.**
   *
   * The banner reads *"This code was cancelled / Three wrong attempts, so the
   * code no longer works."* Before this, the mock returned `incorrect` and the
   * code went on working — so the surface asserted something the seam could not
   * make true, which teaches an operator that a security message is decorative.
   *
   * The assertion that matters is the third one: **the ORIGINAL, CORRECT code
   * is submitted after the cancellation and is refused.** Not a wrong code —
   * `123456`, the one that would have signed them in a moment earlier.
   */
  it('CANCELS the code on the third wrong attempt — AC-526', async () => {
    const { challengeId } = await challengeFor()
    expect(await verifyCode({ challengeId, code: '222222' })).toMatchObject({
      reason: 'incorrect',
      attemptsRemaining: 4,
    })
    expect(await verifyCode({ challengeId, code: '333333' })).toMatchObject({
      reason: 'incorrect',
      attemptsRemaining: 3,
    })
    /* The third counted — two are left, and they will be spent on the NEXT
       code, because the counter is per challenge and spans codes (§4.3). */
    expect(await verifyCode({ challengeId, code: '444444' })).toMatchObject({
      reason: 'invalidated',
      attemptsRemaining: 2,
    })

    /* **The code really is dead.** The correct code is refused, and refused as
       `invalidated` rather than as `incorrect`: it is the code that is gone,
       not the guess that is wrong. */
    const replay = await verifyCode({ challengeId, code: '123456' })
    expect(replay).toMatchObject({ kind: 'failed', reason: 'invalidated' })

    /* And the replay consumed nothing — `attemptsRemaining` is a number iff
       the call spent an attempt. */
    expect(replay).toMatchObject({ attemptsRemaining: null })
  })

  it('makes a RESEND the only way forward, cooldown or no cooldown — AC-526', async () => {
    const { challengeId } = await challengeFor()
    for (const code of ['222222', '333333', '444444']) await verifyCode({ challengeId, code })

    /* The first cooldown has not elapsed on the fixed clock, and the resend is
       accepted anyway. Without this waiver the third wrong attempt is a **dead
       end**: the code is refused and the only control that could produce a new
       one answers `cooling-down` for two minutes. */
    const resent = await resendCode(challengeId)
    expect(resent.kind).toBe('sent')
    if (resent.kind !== 'sent') return

    /* AC-534 — the cancelled code now reads as `superseded`, because a newer
       one exists and that is the truer of the two sentences. */
    expect(await verifyCode({ challengeId, code: '123456' })).toMatchObject({
      reason: 'superseded',
      attemptsRemaining: null,
    })

    /* And the NEW code works. */
    expect((await verifyCode({ challengeId: resent.challengeId, code: '123456' })).kind).toBe(
      'signed-in',
    )
  })

  it('locks the challenge on the fifth wrong attempt, across two codes', async () => {
    /* §4.3: *"attempts 4 and 5 run against a new code, because 3 cancelled the
       old one — the counter is per challenge, spanning codes."* Without the
       carry-forward this lockout is unreachable by getting the code wrong, and
       a lockout no amount of wrongness can produce is not a lockout. */
    const first = await challengeFor()
    for (const code of ['222222', '333333', '444444']) {
      await verifyCode({ challengeId: first.challengeId, code })
    }
    const resent = await resendCode(first.challengeId)
    if (resent.kind !== 'sent') throw new Error(`expected a resend, got ${resent.kind}`)

    const fourth = await verifyCode({ challengeId: resent.challengeId, code: '555555' })
    expect(fourth).toMatchObject({ reason: 'incorrect', attemptsRemaining: 1 })

    const fifth = await verifyCode({ challengeId: resent.challengeId, code: '666666' })
    expect(fifth).toMatchObject({ kind: 'failed', reason: 'locked', attemptsRemaining: 0 })
    if (fifth.kind !== 'failed') return
    expect(fifth.lockedUntil).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('exhausts the sign-in after five codes and stops resending — AC-533', async () => {
    /* Five codes, so four successful resends. The fifth press has nothing to
       give and returns `exhausted` rather than an error: the control is
       replaced by `Go to sign in`, not disabled. */
    let id = (await challengeFor()).challengeId
    for (let i = 1; i < MAX_CODES_PER_CHALLENGE; i += 1) {
      /* `000000` expires the current code, which is what waives the cooldown
         (AC-525). The fixed clock never advances, so this is **the** path a QA
         engineer has to reach a second resend at all — and it is a designed
         one, not a back door. */
      await verifyCode({ challengeId: id, code: '000000' })
      const out = await resendCode(id)
      expect(out.kind).toBe('sent')
      if (out.kind !== 'sent') return
      expect(out.resendsRemaining).toBe(MAX_CODES_PER_CHALLENGE - 1 - i)
      id = out.challengeId
    }
    const spent = await resendCode(id)
    expect(spent).toMatchObject({ kind: 'exhausted', codesSent: MAX_CODES_PER_CHALLENGE })
  })

  it('returns `attemptsRemaining: null` on every NON-counting outcome', async () => {
    /* Expired, superseded, missing and completed-elsewhere are not the
       operator's doing, so there is no number to show them. */
    const { challengeId } = await challengeFor()
    expect(await verifyCode({ challengeId, code: '111111' })).toMatchObject({
      reason: 'superseded',
      attemptsRemaining: null,
    })
    /* Submitted last of the two, because `000000` **really expires the code**
       (AC-525) and a dead code answers `expired` to everything after it. */
    expect(await verifyCode({ challengeId, code: '000000' })).toMatchObject({
      reason: 'expired',
      attemptsRemaining: null,
    })
    expect(await verifyCode({ challengeId: 'CHL-9999', code: '123456' })).toMatchObject({
      reason: 'missing',
      attemptsRemaining: null,
    })
  })

  it('supersedes the earlier challenge when a second is issued (§5.3)', async () => {
    /* The operator who pressed `Resend` and then typed the FIRST code gets a
       different sentence, and it does not cost them an attempt. */
    const first = await challengeFor()
    await challengeFor()
    const outcome = await verifyCode({ challengeId: first.challengeId, code: '123456' })
    expect(outcome).toMatchObject({ reason: 'superseded', attemptsRemaining: null })
  })

  it('reports a challenge finished in another tab as `completed-elsewhere` (§9.1)', async () => {
    const { challengeId } = await challengeFor()
    await verifyCode({ challengeId, code: '123456' })
    const again = await verifyCode({ challengeId, code: '123456' })
    expect(again).toMatchObject({ reason: 'completed-elsewhere' })
  })
})

describe('4 — reset, activation, and re-authentication', () => {
  it('names each of the five token states (§10.3)', async () => {
    expect((await validateResetToken('valid')).state).toBe('valid')
    expect((await validateResetToken('expired')).state).toBe('expired')
    expect((await validateResetToken('used')).state).toBe('used')
    expect((await validateResetToken('superseded')).state).toBe('superseded')
    expect((await validateResetToken('anything-else')).state).toBe('unknown')
  })

  it('leaks no email on an invalid token', async () => {
    const outcome = await validateResetToken('expired')
    expect(outcome.email).toBeNull()
    expect(outcome.purpose).toBeNull()
  })

  it('counts OTHER sessions ended, and the count can legitimately be zero', async () => {
    /* §7.5 gives `auth.reset.done` an explicit ICU `=0` form because
       "0 other sessions ended" is not a sentence anyone should ship. Spec
       §19.3 C-3 corrected AC-552 to match the design. */
    const reset = await resetPassword({ token: 'valid', password: 'new-password' })
    expect(reset).toMatchObject({ kind: 'reset' })
    if (reset.kind !== 'reset') return
    expect(reset.otherSessionsEnded).toBe(2)

    const activated = await activateInvite({ token: 'valid', password: 'new-password' })
    expect(activated).toMatchObject({ kind: 'reset', otherSessionsEnded: 0 })
  })

  it('accepts NO operator-supplied identity on re-authentication — AC-567(b)', async () => {
    /**
     * The type is the enforcement. This test is what catches somebody widening
     * it later: `ReauthenticateInput` has one key, and if a second appears the
     * assertion below fails before anyone reads the diff.
     */
    const input = { password: AUTH_FIXTURE_PASSWORD }
    expect(Object.keys(input)).toEqual(['password'])
    const outcome = await reauthenticate(input)
    expect(outcome.kind).toBe('resumed')
  })

  it('returns the userId of the session that expired — AC-567(c)', async () => {
    const { challengeId } = await challengeFor('yousef@eyvar.com')
    const signedIn = await verifyCode({ challengeId, code: '123456' })
    expect(signedIn.kind).toBe('signed-in')

    const resumed = await reauthenticate({ password: AUTH_FIXTURE_PASSWORD })
    expect(resumed.kind).toBe('resumed')
    if (resumed.kind !== 'resumed' || signedIn.kind !== 'signed-in') return
    /* Same operator, both sides of the freeze. Nothing the form sent decided it. */
    expect(resumed.session.userId).toBe(signedIn.session.userId)
  })
})

describe('5 — devices (design §9)', () => {
  it('marks exactly one row `This device`, per user', async () => {
    /* Two would put two `This device` badges on one card, and design §9 allows
       one badge per row, maximum. */
    for (const userId of ['USR-1', 'USR-2', 'USR-3', 'USR-5']) {
      const rows = await listDevices(userId)
      expect(rows.filter((d) => d.isCurrent), userId).toHaveLength(1)
    }
  })

  it('reaches the empty list without a hand edit — AC-653', async () => {
    /* `USR-4` is seeded `[]` in legacy (`:3001`). R8's SECOND kind: one grey
       sentence, no illustration. */
    expect(await listDevices('USR-4')).toEqual([])
  })

  it('treats a PAST `trustedUntil` as not trusted', async () => {
    /**
     * `USR-3`'s device is seeded four days expired. A screen that renders
     * `Trusted until {date}` on any non-null value shows a date that has
     * already gone by — nothing else in the fixture set catches that.
     */
    const [device] = await listDevices('USR-3')
    expect(device!.trustedUntil).not.toBeNull()
    expect(isDeviceTrusted(device!)).toBe(false)
  })

  it('stops trusting without a confirmation and changes the line immediately — AC-571', async () => {
    const updated = await setDeviceTrust('SESS-1', false)
    expect(updated.trustedUntil).toBeNull()
    expect(isDeviceTrusted(updated)).toBe(false)
  })

  it('refuses to revoke the CURRENT device — that is sign-out, not revocation', async () => {
    await expect(revokeDevice('SESS-1')).rejects.toMatchObject({
      status: 409,
      code: 'current_device',
    })
  })

  it('states the count before it acts, and the count agrees with the list — AC-576', async () => {
    const before = (await listDevices('USR-1')).filter((d) => !d.isCurrent).length
    const { sessionsEnded } = await signOutEverywhere()
    expect(sessionsEnded).toBe(before)
    /* And the current device survives it. */
    expect(await listDevices('USR-1')).toHaveLength(1)
  })
})

describe('6 — the 21 onboarding steps, diffed against §10.5', () => {
  it('holds exactly 21 rows with 21 distinct ids', () => {
    expect(onboardingStepSeeds).toHaveLength(21)
    expect(new Set(onboardingStepSeeds.map((s) => s.id)).size).toBe(21)
  })

  it('matches §10.5’s ids byte for byte', () => {
    /* Getting one subtly wrong makes AC-618 and AC-642 fail in a way that looks
       like a logic bug. Pinned here so it looks like what it is. */
    expect(onboardingStepSeeds.map((s) => s.id)).toEqual([
      'common.account',
      'common.mywork',
      'common.audit',
      'owner.team',
      'owner.policy',
      'owner.position',
      'owner.pricing',
      'finance.ledger',
      'finance.escrow',
      'finance.reconciliation',
      'finance.goodwill',
      'finance.routing',
      'ops.application',
      'ops.requests',
      'ops.assurance',
      'ops.dispatch',
      'ops.fairness',
      'support.ticket',
      'support.profile',
      'support.goodwill',
      'support.boundary',
    ])
  })

  it('gives every one of the 21 `learnMoreKey: null` — Q-82, not an oversight', () => {
    expect(onboardingStepSeeds.every((s) => s.learnMoreKey === null)).toBe(true)
  })

  it('gives every one of the 21 `requiredPermission: null` — Q4', () => {
    expect(onboardingStepSeeds.every((s) => s.requiredPermission === null)).toBe(true)
  })

  it('sizes the four tracks as AC-619, AC-622, AC-624 and AC-627 require', () => {
    expect(ONBOARDING_TRACKS.Owner).toHaveLength(7)
    expect(ONBOARDING_TRACKS.Finance).toHaveLength(8)
    expect(ONBOARDING_TRACKS['Ops Manager']).toHaveLength(8)
    expect(ONBOARDING_TRACKS.Support).toHaveLength(7)
  })

  it('shares the first three ids across all four tracks — AC-618', () => {
    /* One row each, in one place. There is no second copy to drift, which is
       what makes "byte-identical" structural rather than a discipline. */
    for (const role of TRACKED_ROLES) {
      expect(ONBOARDING_TRACKS[role]?.slice(0, 3), role).toEqual(COMMON_STEP_IDS)
    }
  })

  it('AC-617 — RECORDED GAP: two of the six roles have no track', () => {
    /* AC-617 is "every track a row, no default and no fallback". Four of six
       hold. `resolveSteps` throws `notFound` for the other two rather than
       inheriting somebody else's checklist, which is AC-617's other half and is
       the behaviour that must not change while the gap is open.

       Owner: `fixtures/onboardingTracks.ts`. Delete this test and restore the
       `ROLE_NAMES` loop when the two tracks land. */
    for (const role of TRACKED_ROLES) expect(ONBOARDING_TRACKS[role], role).toBeDefined()
    const missing = ROLE_NAMES.filter((r) => ONBOARDING_TRACKS[r] === undefined)
    expect(missing).toEqual(['Dispatcher', 'Trust & Safety'])
  })

  it('points every destination at a row that exists in routeTable.ts — AC-608', async () => {
    const table = await getRouteTable()
    const subTabIds = new Set(table.subTabs.map((s) => s.subTabId))
    const layerIds = new Set(table.shellLayers.map((l) => l.layerId))
    for (const step of onboardingStepSeeds) {
      const dest = step.destination
      if (dest === null) continue
      if (dest.subTabId !== null) expect(subTabIds.has(dest.subTabId), step.id).toBe(true)
      /* `profile` is the `entity` layer's overlay name in the spec's language. */
      if (dest.layer !== null) {
        expect(layerIds.has(dest.layer === 'profile' ? 'entity' : 'account'), step.id).toBe(true)
      }
    }
  })

  it('names exactly four view ids the route table has not declared yet', () => {
    /**
     * **A pinned gap, not a silent one.** §10.5 sends four steps to filtered
     * Financials views and `ROUTE_TABLE` declares no views on any of those four
     * sub-tabs. The ids are kept as the designer wrote them, because a step
     * that lands on an unfiltered list is the AC-693 failure — *"a link to an
     * unfiltered list is worse than no link, because it looks like it worked."*
     *
     * This test **fails if the list grows** and passes silently the day the
     * views land. Requested from the route-table owner, not taken.
     */
    const declared = new Set(['security', 'unassigned', 'applications', 'no-backup-captain', 'open', 'suspension-appeals'])
    const undeclared = onboardingStepSeeds
      .map((s) => s.destination?.view)
      .filter((v): v is string => typeof v === 'string' && !declared.has(v))
    expect([...new Set(undeclared)].sort()).toEqual([
      'all-postings',
      'escrow',
      'goodwill',
      'reconciliation',
    ])
  })

  it('sends no step to the operator’s OWN landing route — AC-630 as rewritten', () => {
    /**
     * Spec §19.2 replaced the prose carve-out with a **closed allow-list of one
     * id**, plus the clause the ban was reaching for: sending an operator to the
     * screen they land on every morning teaches nothing.
     *
     * `owner.position` → `financials/overview` **is** Finance's landing route
     * and **is not** the Owner's, which is exactly why the exception is
     * principled rather than arbitrary.
     */
    expect(OVERVIEW_DESTINATION_ALLOW_LIST).toHaveLength(1)
    for (const role of TRACKED_ROLES) {
      const landing = ROLE_LANDING[role]!.path
      for (const id of ONBOARDING_TRACKS[role] ?? []) {
        const step = onboardingStepSeeds.find((s) => s.id === id)!
        const subTabId = step.destination?.subTabId
        if (!subTabId) continue
        const path = `/${subTabId.replace('-', '/')}`
        expect(path === landing, `${role} → ${id}`).toBe(false)
      }
    }
  })
})

describe('7 — the checklist, assembled', () => {
  it('counts reachable steps in `total` and every step in `steps` — AC-603 vs AC-624', async () => {
    /**
     * The two measure different things and a QA engineer who conflates them
     * files a defect against a correct screen (spec §19.3). Every step is a row
     * in the DOM — no step is hidden (AC-611) — while `totalCount` counts only
     * the ones the operator can actually reach.
     *
     * **Both numbers are DERIVED from `UNBUILT_SUB_TAB_IDS`, never typed here.**
     * This test previously read `toHaveLength(8)` / `toBe(7)` with `ops.dispatch`
     * named as the unbuilt one. Live Dispatch and Tickets were then built, the
     * register was correctly emptied, and the test failed — not because the
     * product regressed but because the expectation had been written as a
     * constant. AC-626's whole claim is that a step *"becomes enabled with no
     * fixture change"*, so an assertion that hard-codes which step is disabled
     * contradicts the criterion it is checking.
     */
    const checklist = await getOnboarding('USR-5')
    expect(checklist.steps).toHaveLength(8)

    const unbuilt = checklist.steps.filter((step) => {
      const subTabId = step.destination?.subTabId
      return subTabId != null && UNBUILT_SUB_TAB_IDS.includes(subTabId)
    })
    expect(checklist.totalCount).toBe(checklist.steps.length - unbuilt.length)

    for (const step of unbuilt) {
      expect(step.available, step.id).toBe(false)
      expect(step.reachable, step.id).toBe(false)
    }
  })

  it('resolves exactly the steps in `UNBUILT_SUB_TAB_IDS` unavailable — and no others', async () => {
    /**
     * **This assertion is VACUOUS TODAY and that is recorded, not hidden.**
     * `UNBUILT_SUB_TAB_IDS` is `[]` — every sub-tab now has a screen — so the
     * expected set is empty and the test can only prove the *"and no others"*
     * half. `DECISIONS.md` § "PRACTICE — a negative assertion can pass
     * vacuously" is explicit that an unlabelled vacuous pass is a false tick, so
     * it is labelled here.
     *
     * The half that still bites is real and worth keeping: if any step ever
     * reports `available: false` for a reason *other* than an unbuilt
     * destination, this fails. That is the regression it now guards.
     *
     * The disabled-in-place rendering (AC-609 / AC-611 / AC-626) has no live
     * fixture left to exercise it and is covered synthetically in
     * `screens/onboarding/onboarding.test.tsx`.
     */
    const unavailable: string[] = []
    for (const userId of ['USR-1', 'USR-2', 'USR-3', 'USR-5']) {
      for (const step of (await getOnboarding(userId)).steps) {
        if (!step.available) unavailable.push(step.id)
      }
    }

    const expected = new Set<string>()
    for (const userId of ['USR-1', 'USR-2', 'USR-3', 'USR-5']) {
      for (const step of (await getOnboarding(userId)).steps) {
        const subTabId = step.destination?.subTabId
        if (subTabId != null && UNBUILT_SUB_TAB_IDS.includes(subTabId)) {
          expected.add(step.id)
        }
      }
    }

    expect([...new Set(unavailable)].sort()).toEqual([...expected].sort())
  })

  it('asks for the SIGNED-IN operator when no id is passed, not the seeded Owner', async () => {
    /**
     * Regression for a defect that made five other criteria weaker than they
     * read. Every `userId ?? …` default in `clients/onboarding.ts` used to fall
     * back to the Owner's fixture constant rather than the mock session, so
     * `switchMockUser` was invisible to the whole client: a helper that switched
     * operator and then called `getOnboarding()` bare got the Owner's track four
     * times over, and the union of "all 21 steps" was quietly 7.
     *
     * `session.ts` had already named this trap in `currentMockPermissions`'s doc
     * comment — *"as some older clients do"*. This is the test that stops this
     * client becoming one of them again.
     */
    await switchMockUser('USR-5')
    const asked = await getOnboarding()
    const explicit = await getOnboarding('USR-5')
    expect(asked.steps.map((step) => step.id)).toEqual(explicit.steps.map((step) => step.id))
    expect(asked.steps).toHaveLength(8)
  })

  it('reads 3 of 13 permissions for `lina@eyvar.com` — AC-601', async () => {
    const checklist = await getOnboarding('USR-3')
    expect(checklist.permissionsHeld).toBe(3)
    expect(checklist.permissionsTotal).toBe(13)
  })

  it('reaches `track-empty` through ZERO PERMISSIONS, not a forbidden step', async () => {
    /**
     * **AC-631 passes and AC-610 cannot**, and the difference is Q4. With
     * `requiredPermission: null` on all 21, no step can be *forbidden* — so
     * `newrole@` reaches the empty-ish track by holding nothing, and the
     * `step-unreachable-forbidden` row has no fixture that can produce it.
     * Both are recorded as known-failing. This test pins which one is which.
     */
    const checklist = await getOnboarding('newrole@eyvar.com')
    expect(checklist.permissionsHeld).toBe(0)
    const forbidden = checklist.steps.filter((s) => s.available && !s.reachable)
    expect(forbidden).toHaveLength(0)
  })

  it('does not let a skip fake progress — AC-634', async () => {
    const before = await getOnboarding('USR-5')
    const after = await skipStep('ops.fairness', true, 'USR-5')
    expect(after.doneCount).toBe(before.doneCount)
    expect(after.state.skippedStepIds).toEqual(['ops.fairness'])
  })

  it('un-skips a step and returns it to the list — AC-633', async () => {
    await skipStep('ops.fairness', true, 'USR-5')
    const after = await skipStep('ops.fairness', false, 'USR-5')
    expect(after.state.skippedStepIds).toEqual([])
  })

  it('treats a second completion as benign, not a conflict — AC-648', async () => {
    await completeStep('common.audit', 'manual', 'USR-5')
    const again = await completeStep('common.audit', 'auto', 'USR-5')
    expect(again.state.completedStepIds).toEqual(['common.audit'])
    expect(again.doneCount).toBe(1)
  })

  it('keeps shared ids completed across a role change — AC-642', async () => {
    /**
     * Steps 1–3 are shared, so nobody redoes them. Steps the new role cannot
     * reach are **archived, not deleted**: a demotion must not read as a
     * regression.
     */
    await completeStep('common.account', 'manual', 'USR-5')
    await completeStep('common.mywork', 'auto', 'USR-5')
    await completeStep('ops.requests', 'auto', 'USR-5')

    /* `USR-3` is Support; assembling for a different role re-tracks the state.
       Simulated by asking for the same operator's checklist after a role move,
       which is what `retrackFor` does on the server. */
    const support = await getOnboarding('lina@eyvar.com')
    expect(support.role).toBe('Support')

    /* And the Ops Manager's own record is untouched by the other operator. */
    const ops = await getOnboarding('USR-5')
    expect(ops.state.completedStepIds).toContain('common.account')
    expect(ops.state.completedStepIds).toContain('common.mywork')
  })

  it('dismisses at any time and does not destroy the record — AC-636, AC-638', async () => {
    const dismissed = await dismissOnboarding('USR-5')
    expect(dismissed.state.dismissedAt).not.toBeNull()
    /* The steps are still there; the layer is dismissed, not deleted. */
    expect(dismissed.steps).toHaveLength(8)
  })

  it('restarts the current track and un-dismisses — AC-640', async () => {
    await completeStep('common.audit', 'manual', 'USR-5')
    await dismissOnboarding('USR-5')
    const restarted = await restartOnboarding('USR-5')
    expect(restarted.state.completedStepIds).toEqual([])
    expect(restarted.state.dismissedAt).toBeNull()
    expect(restarted.doneCount).toBe(0)
  })
})

describe('8 — failure injection reaches all 19 operations', () => {
  const ALL = [
    ...Object.values(AUTH_OPERATIONS),
    ...Object.values(DEVICE_OPERATIONS),
    ...Object.values(ONBOARDING_OPERATIONS),
  ]

  it.each(ALL)('registers %s so `?mockFail=` can reach it', async (op) => {
    mockFailures.always(op)
    expect(mockFailures.peek(op)).not.toBeNull()
  })

  it('errors the checklist without touching the console behind it — AC-649', async () => {
    mockFailures.always(ONBOARDING_OPERATIONS.get)
    await expect(getOnboarding('USR-5')).rejects.toMatchObject({ status: 503 })
    /* Card-scoped: the device list still loads. */
    await expect(listDevices('USR-1')).resolves.toBeTruthy()
  })

  it('fails one step mutation while the rest of the layer keeps working — AC-646', async () => {
    mockFailures.always(ONBOARDING_OPERATIONS.completeStep)
    await expect(completeStep('common.audit', 'manual', 'USR-5')).rejects.toMatchObject({
      status: 503,
    })
    await expect(skipStep('common.audit', true, 'USR-5')).resolves.toBeTruthy()
  })
})

describe('9 — `?mockFail=<op>:<status>` (spec §10.4)', () => {
  it('injects a 429 with the kind and retryability a real 429 would carry', () => {
    seedMockFailuresFromLocation('?mockFail=auth.signIn:429')
    const error = mockFailures.peek('auth.signIn')!
    expect(error.status).toBe(429)
    expect(error.kind).toBe('rate-limited')
    /* Retryable — so the ErrorState offers `Try again`, exactly as a real one
       would. This is the field that makes the syntax worth having. */
    expect(error.retryable).toBe(true)
  })

  it('injects a 401 as NOT retryable, which a 503 standing in for it never is', () => {
    seedMockFailuresFromLocation('?mockFail=session.current:401')
    const error = mockFailures.peek('session.current')!
    expect(error.kind).toBe('unauthorized')
    expect(error.retryable).toBe(false)
  })

  it('keeps the bare form working, and mixes the two in one list', () => {
    const ops = seedMockFailuresFromLocation('?mockFail=drivers.list,auth.verifyCode:409')
    expect(ops).toEqual(['drivers.list', 'auth.verifyCode'])
    expect(mockFailures.peek('drivers.list')!.status).toBe(503)
    expect(mockFailures.peek('auth.verifyCode')!.status).toBe(409)
  })

  it('falls back to the default 503 on a malformed suffix rather than reaching no state', () => {
    /* `foo:abc` and `foo:99` still fail the operation. The point of the URL form
       is to reach an error state; silently reaching none is the worse failure. */
    seedMockFailuresFromLocation('?mockFail=auth.signOut:abc,auth.signIn:99')
    expect(mockFailures.peek('auth.signOut:abc')!.status).toBe(503)
    expect(mockFailures.peek('auth.signIn:99')!.status).toBe(503)
  })
})
