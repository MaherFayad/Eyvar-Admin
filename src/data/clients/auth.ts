/**
 * Authentication — the eleven operations of spec §10.2, plus the device list.
 *
 * ## Read this before writing a screen against it
 *
 * > **Every function here returns an outcome. Only a transport failure throws.**
 *
 * `signIn` resolves with `{ kind: 'failed', reason: 'rejected' }`; it does not
 * reject. `?mockFail=auth.signIn` still throws an `ApiError`, because that is a
 * different thing and design **§2.3** orders the two — transport above domain
 * in the card's single banner slot. A precedence rule cannot order two things
 * that arrive by the same channel.
 *
 * ## Every clock is a deadline
 *
 * `resendAvailableAt`, `lockedUntil`, `expiresAt`, `retryAfter`,
 * `trustedUntil` — all `IsoDateTime`, all server-issued. **No function here
 * returns a duration**, and `RESEND_COOLDOWN_SECONDS` never leaves this layer:
 * it is the policy the deadlines are computed *from*, not a number a component
 * schedules against.
 *
 * ## Mock state, and what it is for
 *
 * The challenge store is session-scoped and in memory. It exists so that
 * supersession (§5.3), attempt counting (§5.4) and the escalating cooldown
 * (§4.4) are **behaviours a QA engineer can drive**, rather than three states a
 * fixture asserts and nothing produces.
 */

import { DATA_SOURCE } from '../config'
import { EYVAR_NOW, offsetFromNow, toEpochMs } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import {
  AUTH_BREACHED_PASSWORDS,
  AUTH_FIXTURE_CODES,
  AUTH_FIXTURE_PASSWORD,
  AUTH_FIXTURE_TOTP,
  CHALLENGE_LOCKOUT_MINUTES,
  CODE_LIFETIME_MINUTES,
  MAX_CODES_PER_CHALLENGE,
  MAX_CODE_ATTEMPTS,
  RESEND_COOLDOWN_SECONDS,
  TRUSTED_DEVICE_DAYS,
  authIdentityFixtures,
  authTokenFixtures,
  deviceSessionFixtures,
} from '../fixtures/authIdentities'
import { CURRENT_USER_ID, DEFAULT_LANDING, ROLE_LANDING, teamUserFixtures } from '../fixtures/teamUsers'
import { claimFixtures } from '../fixtures/claims'
import type { IsoDateTime } from '../types/common'
import { ApiError } from '../types/common'
import type { WorkspaceId } from '../types/navigation'
import type { Session } from '../types/session'
import type {
  AuthIdentity,
  DeviceSession,
  TotpEnrolment,
  ReauthenticateInput,
  ReauthenticateOutcome,
  RequestPasswordResetOutcome,
  ResendCodeOutcome,
  ResetPasswordOutcome,
  SecondFactor,
  SignInOutcome,
  TokenState,
  ValidateTokenOutcome,
  VerifyCodeOutcome,
  VerifyFailureReason,
} from '../types/auth'
import { http } from './http'

export const AUTH_OPERATIONS = {
  signIn: 'auth.signIn',
  verifyCode: 'auth.verifyCode',
  resendCode: 'auth.resendCode',
  enrollSecondFactor: 'auth.enrollSecondFactor',
  beginTotpEnrolment: 'auth.beginTotpEnrolment',
  requestPasswordReset: 'auth.requestPasswordReset',
  validateResetToken: 'auth.validateResetToken',
  resetPassword: 'auth.resetPassword',
  activateInvite: 'auth.activateInvite',
  reauthenticate: 'auth.reauthenticate',
  signOut: 'auth.signOut',
  signOutEverywhere: 'auth.signOutEverywhere',
} as const

/**
 * **Re-exported from the client, not reachable from the fixture.**
 *
 * A screen test needs the one password every seeded identity accepts — it is a
 * *fixture credential*, exactly like `?token=valid` — and `src/data/fixtures/`
 * is off limits above this directory (`seam.test.ts` §4 fails the build for it).
 * So it leaves through the seam, where every other fixture-driven constant does.
 */
export { AUTH_FIXTURE_PASSWORD, AUTH_FIXTURE_CODES, AUTH_FIXTURE_TOKENS } from '../fixtures/authIdentities'

export const DEVICE_OPERATIONS = {
  list: 'session.devices',
  trust: 'session.trustDevice',
  revoke: 'session.revokeDevice',
} as const

/* ──────────────────────── in-memory challenge store ───────────────────── */

/**
 * **One row per code; the *sign-in* is the chain of rows.**
 *
 * That distinction is the whole of design §4.3's last paragraph — *"attempts 4
 * and 5 run against a new code, because 3 cancelled the old one — the counter
 * is per **challenge**, spanning codes."* A resend supersedes the current row
 * and opens the next one **carrying `attemptsUsed` and `codesSent` forward**.
 *
 * Without the carry, the ladder is unreachable: three wrong attempts cancel the
 * code, the only move left is a resend, and a resend that reset the counter to
 * zero would mean **attempt 4 and attempt 5 never happen** and `challenge-locked`
 * (**AC-527**) could only ever be reached through the `999999` QA shortcut. A
 * lockout that no amount of getting it wrong can produce is not a lockout.
 */
interface Challenge {
  id: string
  email: string
  expiresAt: IsoDateTime
  /** **Spans codes.** Carried across a resend; five of these end the sign-in. */
  attemptsUsed: number
  /** **Spans codes.** How many codes this sign-in has been sent, this one included. Starts at 1. */
  codesSent: number
  resendAvailableAt: IsoDateTime
  /**
   * `invalidated` is the third-wrong-attempt state, and it is **not** a synonym
   * for any of the others. `superseded` means *a newer code exists*;
   * `invalidated` means *this code was cancelled and no newer one exists yet* —
   * which is precisely why the resend has to be accepted while it stands,
   * cooldown or no cooldown.
   */
  state: 'open' | 'invalidated' | 'superseded' | 'locked' | 'completed'
}

let challenges: Challenge[] = []
let challengeSeq = 0
/** The account whose sign-in produced the live session. Reset per test file. */
let signedInUserId: string | null = null
let revokedDeviceIds: string[] = []
let trustOverrides: Record<string, IsoDateTime | null> = {}

export function resetAuth(): void {
  challenges = []
  challengeSeq = 0
  signedInUserId = null
  revokedDeviceIds = []
  trustOverrides = {}
}

function identity(email: string): AuthIdentity | null {
  const normalised = email.trim().toLowerCase()
  return authIdentityFixtures.find((i) => i.email === normalised) ?? null
}

function nextCooldown(resendCount: number): IsoDateTime {
  /* 30 → 60 → 120, then held at 120. Escalating, per challenge (§4.4). */
  const last = RESEND_COOLDOWN_SECONDS[RESEND_COOLDOWN_SECONDS.length - 1] ?? 120
  const seconds = RESEND_COOLDOWN_SECONDS[resendCount] ?? last
  return offsetFromNow({ minutes: seconds / 60 })
}

/**
 * Issue a code.
 *
 * `carry` is set **only by a resend**, which continues the same sign-in and
 * therefore keeps its counters. A fresh `signIn` passes nothing, because a new
 * sign-in is a new budget — carrying attempts across sign-ins would mean an
 * operator who mistyped a code an hour ago starts today two attempts down.
 */
function openChallenge(
  email: string,
  carry?: { attemptsUsed: number; codesSent: number },
): Challenge {
  /**
   * **§5.3's supersession rule, and it is the most useful decision on the
   * screen.** Issuing a new challenge invalidates every earlier one for the
   * same account — so the operator who pressed `Resend` twice and then typed
   * the *first* code gets `superseded`, which is a different sentence from
   * `incorrect` and, crucially, **does not count against their attempts**.
   *
   * An `invalidated` row is superseded too: once a new code exists, *"a newer
   * code was sent"* is the truer of the two sentences and is the one **AC-534**
   * asks for.
   */
  challenges = challenges.map((c) =>
    c.email === email && (c.state === 'open' || c.state === 'invalidated')
      ? { ...c, state: 'superseded' as const }
      : c,
  )
  challengeSeq += 1
  const codesSent = (carry?.codesSent ?? 0) + 1
  const challenge: Challenge = {
    id: `CHL-${String(challengeSeq).padStart(4, '0')}`,
    email,
    expiresAt: offsetFromNow({ minutes: CODE_LIFETIME_MINUTES }),
    attemptsUsed: carry?.attemptsUsed ?? 0,
    codesSent,
    /* The escalation is driven by how many codes have gone out, so it keeps
       climbing across a resend instead of resetting to 30 s each time. */
    resendAvailableAt: nextCooldown(codesSent - 1),
    state: 'open',
  }
  challenges = [...challenges, challenge]
  return challenge
}

/**
 * The operator's own phone from their `TeamUser` row, for design §5.1's
 * shortcut. `null` for an identity with no operator record — the three §10.3
 * fixtures — and for a row whose `phone` is `null`.
 */
function profilePhoneFor(userId: string | null): string | null {
  if (userId === null) return null
  return teamUserFixtures.find((u) => u.id === userId)?.phone ?? null
}

function buildSessionFor(userId: string): Session {
  const user = teamUserFixtures.find((u) => u.id === userId)
  if (!user) {
    throw new ApiError({ status: 500, message: `No team user ${userId} to build a session from` })
  }
  const landing = ROLE_LANDING[user.role] ?? DEFAULT_LANDING
  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    photoUrl: user.photoUrl,
    role: user.role,
    permissions: user.permissions,
    landingRoute: landing.path,
    landingWorkspaceId: landing.workspaceId as WorkspaceId,
    /* Still empty — **Q4**. See `clients/session.ts`; nothing about auth
       landing changes that, and fabricating the 34 entries here would ship an
       answer nobody gave. */
    subTabPermissions: {},
    isImpersonating: false,
    impersonatedUser: null,
    claimedCount: claimFixtures.filter((c) => c.state === 'claimed' && c.ownerId === user.id).length,
    issuedAt: EYVAR_NOW,
  }
}

/* ──────────────────────────── sign in ─────────────────────────────────── */

/**
 * POST /api/v1/auth/sign-in
 *   body: { email, password, rememberDevice?: boolean }
 *   -> SignInOutcome   { challenge | enrolment-required | failed }
 *   429 with `Retry-After` when the transport rate-limits
 *
 * **Password *plus* a second factor, for everyone, every time** (§4.2). Not
 * password-only, and not passwordless: passwordless would make possession of
 * one phone the sole factor for a payout console, and would make the
 * `Forgot password` flow the owner asked for meaningless.
 *
 * **Every account-state refusal returns the same `rejected`.** Wrong password,
 * no such account, `Invited`, `Suspended` — one message, one latency (§4.5).
 * The fixtures know the difference; the wire does not, because a form that
 * answers differently is an account-enumeration oracle in front of
 * `release_escrow`.
 *
 * `rememberDevice` is accepted here and applied on `verifyCode`, because a
 * device is not remembered until the second factor has actually been cleared.
 */
export async function signIn(
  input: { email: string; password: string; rememberDevice?: boolean },
  signal?: AbortSignal,
): Promise<SignInOutcome> {
  if (DATA_SOURCE === 'http') {
    return http.post<SignInOutcome>('/auth/sign-in', input, { signal })
  }
  return mockMutation(AUTH_OPERATIONS.signIn, signal, () => {
    const found = identity(input.email)

    /**
     * **The fourth cause of AC-506, and it is now reachable from the outside.**
     *
     * The password is read *before* the account state is looked at and produces
     * the **same** `rejected` as an unknown address, an `Invited` account and a
     * `Suspended` one — one message, one latency, four causes (§4.5). It is
     * ordered first so that a wrong password against a *suspended* account
     * cannot be told apart from a wrong password against a live one, which is
     * the same enumeration leak one step further in.
     *
     * `locked` is checked after it, because a locked account with the right
     * password still owes the operator its deadline (**AC-577**) — and a
     * locked account with the wrong password owes them nothing more than
     * anyone else typing a wrong password.
     */
    const passwordOk = input.password === AUTH_FIXTURE_PASSWORD

    /* Unknown, invited, suspended and wrong-password are indistinguishable on the wire. */
    if (!found || found.outcome === 'invited' || found.outcome === 'suspended' || !passwordOk) {
      return { kind: 'failed', reason: 'rejected', lockedUntil: null, retryAfter: null }
    }

    if (found.outcome === 'locked') {
      return { kind: 'failed', reason: 'locked', lockedUntil: found.lockedUntil, retryAfter: null }
    }

    if (found.secondFactor === null) {
      /* §4.4 — enrolment is not optional and not skippable. */
      return {
        kind: 'enrolment-required',
        enrolmentToken: `ENR-${found.email}`,
        methods: ['sms', 'totp'],
        /* §5.1's `Use {phone} from your profile`. Read from the operator who
           just proved their password — never from a session, because at this
           point in the flow there is not one (**AC-515**). */
        profilePhone: profilePhoneFor(found.userId),
      }
    }

    const challenge = openChallenge(found.email)
    return {
      kind: 'challenge',
      challengeId: challenge.id,
      secondFactor: found.secondFactor,
      expiresAt: challenge.expiresAt,
      resendAvailableAt: challenge.resendAvailableAt,
    }
  })
}

/**
 * POST /api/v1/auth/verify-code
 *   body: { challengeId, code, rememberDevice?: boolean }
 *   -> VerifyCodeOutcome   { signed-in | failed }
 *
 * **Only a wrong code counts against the five attempts** (§4.4 of the design).
 * `expired`, `superseded`, `missing` and `completed-elsewhere` are the three
 * non-counting outcomes plus the tab race, and each returns
 * `attemptsRemaining: null` rather than a number — because there is no number
 * to show for an outcome the operator did not cause.
 *
 * **There is no auto-submit** (§5.2). The client sends when the operator sends.
 */
export async function verifyCode(
  input: { challengeId: string; code: string; rememberDevice?: boolean },
  signal?: AbortSignal,
): Promise<VerifyCodeOutcome> {
  if (DATA_SOURCE === 'http') {
    return http.post<VerifyCodeOutcome>('/auth/verify-code', input, { signal })
  }
  return mockMutation(AUTH_OPERATIONS.verifyCode, signal, () => {
    const challenge = challenges.find((c) => c.id === input.challengeId)
    if (!challenge) return failVerify('missing')
    if (challenge.state === 'completed') return failVerify('completed-elsewhere')
    if (challenge.state === 'superseded') return failVerify('superseded')
    if (challenge.state === 'locked') {
      return failVerify('locked', null, offsetFromNow({ minutes: CHALLENGE_LOCKOUT_MINUTES }))
    }
    /**
     * **The cancellation, enforced rather than announced.**
     *
     * Once the third wrong attempt has cancelled the code, submitting it again
     * — by a second tab, by browser-back, by an operator who did not read the
     * banner — is refused **before** the digits are even compared. Not even
     * `123456` gets through, which is the point: it is the code that is dead,
     * not the guess.
     *
     * It consumes nothing (`attemptsRemaining: null`), because there is no
     * attempt to spend against a code that no longer exists. The only outcome
     * that changes this row's state is a resend.
     */
    if (challenge.state === 'invalidated') return failVerify('invalidated')
    if (toEpochMs(EYVAR_NOW) > toEpochMs(challenge.expiresAt)) return failVerify('expired')

    /* The four fixture codes are checked before the real one, so a QA engineer
       can drive an outcome on any account without knowing its state. */
    if (input.code === AUTH_FIXTURE_CODES.expired) {
      /**
       * **`000000` expires the code for real, and AC-525 requires it to.**
       *
       * *"Entering `000000` shows the expired message, does not increment the
       * counter, and **enables the resend control immediately regardless of any
       * running cooldown**."* That last clause is a **server** behaviour: a
       * client that merely un-disabled its own button would press it and be
       * told to cool down. So the expiry is written to the challenge, and
       * `resendCode` reads it.
       *
       * Same class of fix as `invalidated`: a fixture code that *announced* a
       * state without *producing* it left the surface asserting something the
       * seam could not make true.
       *
       * Sticky, because a real expiry is: every later submission against this
       * code — including the correct one — falls through the ordinary
       * `expiresAt` check above and is refused.
       */
      mutate(challenge, { expiresAt: offsetFromNow({ minutes: -1 }) })
      return failVerify('expired')
    }
    if (input.code === AUTH_FIXTURE_CODES.superseded) return failVerify('superseded')
    if (input.code === AUTH_FIXTURE_CODES.challengeLocked) {
      mutate(challenge, { state: 'locked' })
      return failVerify('locked', null, offsetFromNow({ minutes: CHALLENGE_LOCKOUT_MINUTES }))
    }

    if (input.code !== AUTH_FIXTURE_CODES.correct) {
      const used = challenge.attemptsUsed + 1
      if (used >= MAX_CODE_ATTEMPTS) {
        mutate(challenge, { attemptsUsed: used, state: 'locked' })
        return failVerify('locked', 0, offsetFromNow({ minutes: CHALLENGE_LOCKOUT_MINUTES }))
      }
      /**
       * **§4.3 row 3 — the third wrong attempt cancels the code.**
       *
       * The attempt counted (it is the third of five, and `attemptsRemaining`
       * says `2` because that is what is left for the *next* code), and the
       * code stops working in the same breath. `INVALIDATE_AT_ATTEMPT` is
       * derived from the copy rather than typed as `3`: the banner says
       * *"Three wrong attempts"* and a constant that disagreed with the
       * sentence would be the same defect this whole change exists to close.
       */
      if (used === INVALIDATE_AT_ATTEMPT) {
        mutate(challenge, { attemptsUsed: used, state: 'invalidated' })
        return failVerify('invalidated', MAX_CODE_ATTEMPTS - used)
      }
      mutate(challenge, { attemptsUsed: used })
      return failVerify('incorrect', MAX_CODE_ATTEMPTS - used)
    }

    mutate(challenge, { state: 'completed' })
    const found = identity(challenge.email)
    /**
     * **`newrole@`, `locked@` and `suspended@` have no `TeamUser` row**, so
     * there is no session to build. They exist to be refused at the door or to
     * make an onboarding state reachable, and a signed-in session for an
     * identity with no operator record would be a fiction. Modelled as
     * `rejected` rather than as a 500.
     */
    if (!found?.userId) return failVerify('missing')

    if (input.rememberDevice) {
      const current = devicesFor(found.userId).find((d) => d.isCurrent)
      if (current) trustOverrides[current.id] = offsetFromNow({ days: TRUSTED_DEVICE_DAYS })
    }
    signedInUserId = found.userId
    return { kind: 'signed-in', session: buildSessionFor(found.userId) }
  })
}

/**
 * §4.3 row 3. **Third**, not second and not fourth — and spec **AC-524** is
 * emphatic about it: a superseded code *"never increments the counter"*, so the
 * *third wrong entry — not a second —* is what triggers **AC-526**.
 */
const INVALIDATE_AT_ATTEMPT = 3

function failVerify(
  reason: VerifyFailureReason,
  attemptsRemaining: number | null = null,
  lockedUntil: IsoDateTime | null = null,
): VerifyCodeOutcome {
  return { kind: 'failed', reason, attemptsRemaining, lockedUntil }
}

function mutate(challenge: Challenge, patch: Partial<Challenge>): void {
  challenges = challenges.map((c) => (c.id === challenge.id ? { ...c, ...patch } : c))
}

/**
 * POST /api/v1/auth/resend-code
 *   body: { challengeId }
 *   -> ResendCodeOutcome   { sent | cooling-down | failed }
 *
 * **Returns the next deadline, never a duration**, and the escalation
 * 30 → 60 → 120 s is applied here because it is server policy. A client that
 * knew the schedule would be a client that could be wrong about it.
 *
 * Pressing early is `cooling-down` rather than an error: the button should not
 * have been pressable, and the honest response is to hand back the deadline so
 * it can re-arm itself instead of guessing.
 */
export async function resendCode(
  challengeId: string,
  signal?: AbortSignal,
): Promise<ResendCodeOutcome> {
  if (DATA_SOURCE === 'http') {
    return http.post<ResendCodeOutcome>('/auth/resend-code', { challengeId }, { signal })
  }
  return mockMutation(AUTH_OPERATIONS.resendCode, signal, () => {
    const challenge = challenges.find((c) => c.id === challengeId)
    if (!challenge) return { kind: 'failed', reason: 'missing', lockedUntil: null }
    if (challenge.state === 'locked') {
      return {
        kind: 'failed',
        reason: 'locked',
        lockedUntil: offsetFromNow({ minutes: CHALLENGE_LOCKOUT_MINUTES }),
      }
    }
    /* **AC-533.** Five codes is the whole budget for one sign-in; the sixth
       press has nothing to give. The control is replaced by `Go to sign in`,
       so this is the end of the screen rather than an error on it. */
    if (challenge.codesSent >= MAX_CODES_PER_CHALLENGE) {
      return { kind: 'exhausted', codesSent: challenge.codesSent }
    }
    /**
     * **The cooldown is waived exactly where the operator has no working code**
     * — design §4.3 row 3 and §4.4 row 2, both of which say the resend is
     * *"enabled immediately, ignoring the cooldown"*.
     *
     * This is not a courtesy; without it the third wrong attempt is a **dead
     * end**. The code is cancelled, `verifyCode` refuses it, and a server that
     * answered `cooling-down` for the next 120 seconds would leave the operator
     * with nothing on the screen that works. The client already re-labels the
     * button `Send a new code`; the server has to actually honour the press.
     */
    const owedANewCode =
      challenge.state === 'invalidated' || toEpochMs(EYVAR_NOW) > toEpochMs(challenge.expiresAt)
    if (!owedANewCode && toEpochMs(EYVAR_NOW) < toEpochMs(challenge.resendAvailableAt)) {
      return { kind: 'cooling-down', resendAvailableAt: challenge.resendAvailableAt }
    }
    /* A resend issues a new code and supersedes the old one — **carrying the
       attempt count and the code budget forward**, because both are properties
       of the sign-in and not of the code (§4.3). */
    const next = openChallenge(challenge.email, {
      attemptsUsed: challenge.attemptsUsed,
      codesSent: challenge.codesSent,
    })
    return {
      kind: 'sent',
      challengeId: next.id,
      expiresAt: next.expiresAt,
      resendAvailableAt: next.resendAvailableAt,
      resendsRemaining: MAX_CODES_PER_CHALLENGE - next.codesSent,
    }
  })
}

/**
 * POST /api/v1/auth/enroll-second-factor
 *   body: { enrolmentToken, method: 'sms' | 'totp', destination }
 *   -> SignInOutcome   (a `challenge`, because enrolment confirms with a code)
 *
 * §4.4 Step B. Enrolling does not sign the operator in — it opens the ordinary
 * challenge, so the enrolled factor is proved once before it is trusted.
 */
export async function enrollSecondFactor(
  input: { enrolmentToken: string; method: SecondFactor['method']; destination: string },
  signal?: AbortSignal,
): Promise<SignInOutcome> {
  if (DATA_SOURCE === 'http') {
    return http.post<SignInOutcome>('/auth/enroll-second-factor', input, { signal })
  }
  return mockMutation(AUTH_OPERATIONS.enrollSecondFactor, signal, () => {
    const email = input.enrolmentToken.replace(/^ENR-/, '')
    const found = identity(email)
    if (!found) return { kind: 'failed', reason: 'rejected', lockedUntil: null, retryAfter: null }
    const challenge = openChallenge(found.email)
    return {
      kind: 'challenge',
      challengeId: challenge.id,
      secondFactor: {
        method: input.method,
        hint: input.method === 'totp' ? 'Authenticator app' : maskPhone(input.destination),
      },
      expiresAt: challenge.expiresAt,
      resendAvailableAt: challenge.resendAvailableAt,
    }
  })
}

/** **AC-519** — two digits, not four. Spec §19.1 records the illustration that got this wrong. */
function maskPhone(destination: string): string {
  return `••••••${destination.slice(-2)}`
}

/**
 * POST /api/v1/auth/totp-secret
 *   body: { enrolmentToken }
 *   -> TotpEnrolment   { secret, otpauthUri, enrolmentToken }
 *
 * **Design §5.1's TOTP option — the 144 px QR canvas and the `font-mono` secret
 * beneath it.** Both were designed, keyed and left undrawn, because the secret
 * had no source: there was no operation that produced one and a browser must
 * not invent one.
 *
 * **The secret is the server's** (spec §11.1 — code generation is the server's
 * guarantee, and a secret the client chose is a second factor the console
 * chose). It is issued against the enrolment token, so it belongs to the
 * operator who just proved their password and to nobody else.
 *
 * **Separate from `enrollSecondFactor` on purpose.** Enrolment *confirms* a
 * secret with a code (§4.4 step B); this *hands one out*. Merging them would
 * mean the act of displaying a QR code enrolled the factor, and an operator who
 * looked at the screen and walked away would be enrolled in an authenticator
 * they never scanned.
 */
export async function beginTotpEnrolment(
  enrolmentToken: string,
  signal?: AbortSignal,
): Promise<TotpEnrolment> {
  if (DATA_SOURCE === 'http') {
    return http.post<TotpEnrolment>('/auth/totp-secret', { enrolmentToken }, { signal })
  }
  return mock(AUTH_OPERATIONS.beginTotpEnrolment, signal, () => {
    const email = enrolmentToken.replace(/^ENR-/, '')
    const found = identity(email)
    if (!found) throw notFound('enrolment token', enrolmentToken)
    return {
      secret: AUTH_FIXTURE_TOTP.secret,
      /* The issuer and account labels are the server's naming decision — two
         clients composing their own produce two entries in the operator's
         authenticator app for one account. */
      otpauthUri: AUTH_FIXTURE_TOTP.otpauthUri.replace('{email}', encodeURIComponent(found.email)),
      enrolmentToken,
    }
  })
}

/* ─────────────────── forgot password, reset, activation ───────────────── */

/**
 * POST /api/v1/auth/request-password-reset
 *   body: { email }
 *   -> RequestPasswordResetOutcome   — always `{ kind: 'accepted' }`
 *
 * **One outcome, deliberately** (§6.2). A response that differed for a known and
 * an unknown address turns this form into an account-enumeration oracle. The
 * latency is not conditional either — the mock does the same work regardless,
 * because a timing difference is the same leak more quietly.
 */
export async function requestPasswordReset(
  email: string,
  signal?: AbortSignal,
): Promise<RequestPasswordResetOutcome> {
  if (DATA_SOURCE === 'http') {
    return http.post<RequestPasswordResetOutcome>('/auth/request-password-reset', { email }, { signal })
  }
  return mockMutation(AUTH_OPERATIONS.requestPasswordReset, signal, () => ({ kind: 'accepted' }))
}

/**
 * GET /api/v1/auth/reset-token/:token
 *   -> ValidateTokenOutcome   { state, email, purpose }
 *
 * Called on landing at `/reset-password?token=…` and `/activate?token=…`, so
 * the card can say what is wrong **before** the operator types a password they
 * cannot save. §10.3's five tokens: `valid` · `expired` · `used` ·
 * `superseded` · anything else `unknown`.
 */
export async function validateResetToken(
  token: string,
  signal?: AbortSignal,
): Promise<ValidateTokenOutcome> {
  if (DATA_SOURCE === 'http') {
    return http.get<ValidateTokenOutcome>(`/auth/reset-token/${token}`, undefined, { signal })
  }
  return mock(AUTH_OPERATIONS.validateResetToken, signal, () => {
    const row = authTokenFixtures.find((t) => t.token === token)
    /* Anything not seeded is `unknown`, and it leaks nothing: no email, no
       purpose, no role (**AC-543**). */
    if (!row) return { state: 'unknown', email: null, purpose: null, role: null }
    return { state: row.state, email: row.email, purpose: row.purpose, role: row.role }
  })
}

/**
 * POST /api/v1/auth/reset-password
 *   body: { token, password }
 *   -> ResetPasswordOutcome
 *
 * **`otherSessionsEnded` is a count of OTHER sessions**, and it can legitimately
 * be `0`. §7.5's `auth.reset.done` has an explicit ICU `=0` form that names no
 * count, because *"0 other sessions ended"* is not a sentence anyone should
 * ship — spec §19.3 **C-3** corrected AC-552 to match the design rather than the
 * other way round.
 */
export async function resetPassword(
  input: { token: string; password: string },
  signal?: AbortSignal,
): Promise<ResetPasswordOutcome> {
  if (DATA_SOURCE === 'http') {
    return http.post<ResetPasswordOutcome>('/auth/reset-password', input, { signal })
  }
  return mockMutation(AUTH_OPERATIONS.resetPassword, signal, () => {
    const dead = deadToken(input.token)
    if (dead) return dead
    /* **AC-548 — the token is fine and the password is not.** Checked *after*
       the token, because a dead link is the bigger fact and replaces the whole
       card; a breached password leaves the operator on the form with both
       fields intact. */
    if (AUTH_BREACHED_PASSWORDS.includes(input.password)) {
      return { kind: 'failed', reason: 'breached' }
    }
    /* `USR-1` holds three device sessions; two of them are other devices. */
    const others = devicesFor('USR-1').filter((d) => !d.isCurrent).length
    return { kind: 'reset', otherSessionsEnded: others }
  })
}

/**
 * `null` when the token is live, the failure when it is not.
 *
 * One helper for both forms, because §7.4 is *"the §7.3 form, four strings
 * changed"* and two copies of a token check is where the two forms start
 * disagreeing about which links still work.
 */
function deadToken(token: string): { kind: 'failed'; reason: Exclude<TokenState, 'valid'> } | null {
  const row = authTokenFixtures.find((t) => t.token === token)
  if (!row) return { kind: 'failed', reason: 'unknown' }
  if (row.state === 'valid') return null
  return { kind: 'failed', reason: row.state }
}

/**
 * POST /api/v1/auth/activate
 *   body: { token, password }
 *   -> ResetPasswordOutcome
 *
 * §6.6 — activation from an invite. **The transition that does not exist in the
 * legacy app**: `Invited` is a seeded status (`:2837`) with no path out of it.
 * `USR-4` is the fixture that makes `Invited → Active` real for the first time,
 * and the operator lands on their role's landing route with the onboarding
 * layer open (**AC-593**).
 */
export async function activateInvite(
  input: { token: string; password: string },
  signal?: AbortSignal,
): Promise<ResetPasswordOutcome> {
  if (DATA_SOURCE === 'http') {
    return http.post<ResetPasswordOutcome>('/auth/activate', input, { signal })
  }
  return mockMutation(AUTH_OPERATIONS.activateInvite, signal, () => {
    const dead = deadToken(input.token)
    if (dead) return dead
    /* **AC-548 applies to the invite form too.** §7.4 is *"the §7.3 form, four
       strings changed"*, and a breach list that only ran on one of the two
       would be a policy an operator could route around by using their invite
       link instead of a reset link. */
    if (AUTH_BREACHED_PASSWORDS.includes(input.password)) {
      return { kind: 'failed', reason: 'breached' }
    }
    /* An invited account has never signed in anywhere, so nothing is ended. */
    return { kind: 'reset', otherSessionsEnded: 0 }
  })
}

/* ────────────────────────── session lifecycle ─────────────────────────── */

/**
 * POST /api/v1/auth/reauthenticate
 *   body: { password }        ← and **nothing else**
 *   -> ReauthenticateOutcome
 *
 * ## §7.6 — identity does not change here, and an absent field is the enforcement
 *
 * `ReauthenticateInput` has no `email`, no `userId`, no `identifier`. **AC-567**
 * as rewritten in spec §19.2 is three clauses:
 *
 *   (a) the surface's control list is closed and diffable;
 *   (b) **the request carries no operator-supplied identity** — this signature;
 *   (c) the session returned carries the `userId` of the session that expired,
 *       and the save that follows is attributed to the operator who typed the
 *       form.
 *
 * (b) is structural rather than conditional. A refusal is a check, a check is a
 * line of code, and a line of code can be deleted by somebody who does not know
 * why it is there — `00c` **F5** is the price of forgetting once. An absent
 * field cannot be forgotten into existence.
 *
 * **This is a modal, not a layer** (R4-3). It has no route and no URL param, so
 * there is nothing to navigate past.
 */
export async function reauthenticate(
  input: ReauthenticateInput,
  signal?: AbortSignal,
): Promise<ReauthenticateOutcome> {
  if (DATA_SOURCE === 'http') {
    return http.post<ReauthenticateOutcome>('/auth/reauthenticate', input, { signal })
  }
  return mockMutation(AUTH_OPERATIONS.reauthenticate, signal, () => {
    /* (c) — the session that comes back is the session that expired. The user
       is read from the server's own record of who was signed in, never from
       anything the form sent. */
    const userId = signedInUserId ?? CURRENT_USER_ID
    /**
     * **Wrong password, and here the copy may say so.** Design §8.2's row is
     * `That password is wrong` — unlike §3.2's deliberately generic rejection,
     * because the identity is fixed and displayed on the modal and there is no
     * enumeration left to protect.
     */
    if (input.password !== AUTH_FIXTURE_PASSWORD) {
      return { kind: 'failed', reason: 'rejected', lockedUntil: null }
    }

    /**
     * **AC-573 — the device decides whether a code is owed.**
     *
     * *"Re-authentication after an idle expiry on a **trusted** device asks for
     * the password only; on an untrusted device it asks for the password and a
     * code."* The trust is read from the operator's own current device row, and
     * `isDeviceTrusted` is used rather than `trustedUntil !== null`, so a trust
     * that **expired** counts as untrusted — `USR-3`'s `SESS-5` is seeded four
     * days past its expiry for exactly this off-by-one.
     *
     * A device the operator has no row for is untrusted. The default is the
     * stricter arm, which is the direction a security default has to fail in.
     */
    const current = devicesFor(userId).find((d) => d.isCurrent)
    if (current && isDeviceTrusted(current)) {
      return { kind: 'resumed', session: buildSessionFor(userId) }
    }

    /* The ordinary challenge, opened against the identity the **server** holds.
       `verifyCode` finishes it and returns the session — same operation, same
       attempt ladder, same cooldown. */
    const email = teamUserFixtures.find((u) => u.id === userId)?.email ?? null
    const found = email === null ? null : identity(email)
    if (!found?.secondFactor) {
      /* No enrolled factor to challenge. Nothing to prove beyond the password
         that was just proved, so the session resumes. */
      return { kind: 'resumed', session: buildSessionFor(userId) }
    }
    const challenge = openChallenge(found.email)
    return {
      kind: 'challenge',
      challengeId: challenge.id,
      secondFactor: found.secondFactor,
      expiresAt: challenge.expiresAt,
      resendAvailableAt: challenge.resendAvailableAt,
    }
  })
}

/**
 * POST /api/v1/auth/sign-out
 *   -> { signedOut: true }
 *
 * This session only. The device list keeps every other row.
 */
export async function signOut(signal?: AbortSignal): Promise<{ signedOut: true }> {
  if (DATA_SOURCE === 'http') {
    return http.post<{ signedOut: true }>('/auth/sign-out', undefined, { signal })
  }
  return mockMutation(AUTH_OPERATIONS.signOut, signal, () => {
    signedInUserId = null
    return { signedOut: true }
  })
}

/**
 * POST /api/v1/auth/sign-out-everywhere
 *   -> { sessionsEnded: number }
 *
 * **AC-576 — the count is stated before it acts**, so the confirmation that
 * expands in place can say `{count} other sessions will end.` This endpoint
 * returns what actually ended; the count shown *beforehand* comes from
 * `listDevices()`, which is why the two must agree and why the test asserts it.
 */
export async function signOutEverywhere(signal?: AbortSignal): Promise<{ sessionsEnded: number }> {
  if (DATA_SOURCE === 'http') {
    return http.post<{ sessionsEnded: number }>('/auth/sign-out-everywhere', undefined, { signal })
  }
  return mockMutation(AUTH_OPERATIONS.signOutEverywhere, signal, () => {
    const userId = signedInUserId ?? CURRENT_USER_ID
    const others = devicesFor(userId).filter((d) => !d.isCurrent)
    revokedDeviceIds = [...revokedDeviceIds, ...others.map((d) => d.id)]
    return { sessionsEnded: others.length }
  })
}

/* ──────────────────────────── device list ─────────────────────────────── */

function devicesFor(userId: string): DeviceSession[] {
  return (deviceSessionFixtures[userId] ?? [])
    .filter((d) => !revokedDeviceIds.includes(d.id))
    .map((d) => (d.id in trustOverrides ? { ...d, trustedUntil: trustOverrides[d.id] ?? null } : d))
}

/**
 * GET /api/v1/me/devices
 *   -> { items: DeviceSession[] }
 *
 * `DB.loginSessions` (`:2994`) made real. Design §9 is the surface.
 *
 * **`AC-661 / AC-662`**: an operator always sees their **own** list with no
 * permission gate; another account's sessions need `manage_team`, which is why
 * `userId` is optional here and defaults to the caller.
 *
 * **Empty is R8's second kind** — one grey sentence, no illustration:
 * *"You're only signed in on this device."* `USR-4` is seeded `[]` and reaches
 * it without a hand edit (**AC-653**).
 *
 * **`trustedUntil` may be in the past** and the row is then *not* trusted.
 * `USR-3`'s device is seeded four days expired for exactly that reason: a
 * screen that renders `Trusted until {date}` on any non-null value shows a date
 * that has already gone by. Use `isDeviceTrusted`.
 */
export async function listDevices(
  userId?: string,
  signal?: AbortSignal,
): Promise<DeviceSession[]> {
  if (DATA_SOURCE === 'http') {
    const res = await http.get<{ items: DeviceSession[] }>('/me/devices', { userId }, { signal })
    return res.items
  }
  return mock(DEVICE_OPERATIONS.list, signal, () =>
    devicesFor(userId ?? signedInUserId ?? CURRENT_USER_ID),
  )
}

/** Trusted **now**, not merely stamped. The past-dated fixture is what this exists for. */
export function isDeviceTrusted(device: DeviceSession, now: IsoDateTime = EYVAR_NOW): boolean {
  return device.trustedUntil !== null && toEpochMs(device.trustedUntil) > toEpochMs(now)
}

/**
 * POST /api/v1/me/devices/:deviceId/trust
 *   body: { trusted: boolean }
 *   -> DeviceSession
 *
 * **AC-571 — `Stop trusting` takes no confirmation.** It is recoverable, cheap,
 * and the row's line changes immediately. Trusting sets a **30-day expiry**
 * (§7.1), stored as the instant rather than as a duration plus a policy
 * constant, so the row renders the date the server means.
 */
export async function setDeviceTrust(
  deviceId: string,
  trusted: boolean,
  signal?: AbortSignal,
): Promise<DeviceSession> {
  if (DATA_SOURCE === 'http') {
    return http.post<DeviceSession>(`/me/devices/${deviceId}/trust`, { trusted }, { signal })
  }
  return mockMutation(DEVICE_OPERATIONS.trust, signal, () => {
    trustOverrides[deviceId] = trusted ? offsetFromNow({ days: TRUSTED_DEVICE_DAYS }) : null
    const userId = signedInUserId ?? CURRENT_USER_ID
    const row = devicesFor(userId).find((d) => d.id === deviceId)
    if (!row) throw new ApiError({ status: 404, message: `No device ${deviceId}` })
    return row
  })
}

/**
 * DELETE /api/v1/me/devices/:deviceId
 *   -> { revoked: true }
 *
 * Per-row `Sign out`. **Replaces the native `confirm()` at `:3059`** —
 * **D-A9**; the confirmation expands in the row, because §5.5 forbids a modal
 * nested inside a no-scrim drawer.
 *
 * **409 on the current device.** Legacy simply omits the button (`:3032`);
 * an API has to answer, and *"sign yourself out of the session you are using"*
 * is `signOut`, not this.
 */
export async function revokeDevice(
  deviceId: string,
  signal?: AbortSignal,
): Promise<{ revoked: true }> {
  if (DATA_SOURCE === 'http') {
    return http.delete<{ revoked: true }>(`/me/devices/${deviceId}`, { signal })
  }
  return mockMutation(DEVICE_OPERATIONS.revoke, signal, () => {
    const userId = signedInUserId ?? CURRENT_USER_ID
    const row = devicesFor(userId).find((d) => d.id === deviceId)
    if (!row) throw new ApiError({ status: 404, message: `No device ${deviceId}` })
    if (row.isCurrent) {
      throw new ApiError({
        status: 409,
        code: 'current_device',
        message: 'Signing out of the current device is `auth.signOut`, not a device revocation',
        retryable: false,
      })
    }
    revokedDeviceIds = [...revokedDeviceIds, deviceId]
    return { revoked: true }
  })
}
