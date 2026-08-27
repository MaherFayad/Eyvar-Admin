/**
 * What one auth screen hands the next — typed router `location.state`.
 *
 * ## Why `location.state` and not a context
 *
 * Three things fall out of it that a React context would have to be taught:
 *
 * 1. **`/signin/verify` opened directly renders `challenge-missing`** (design
 *    §4.5, **AC-582**). With no handoff there is no challenge, which is
 *    exactly the state the design draws. A context would have to be asked
 *    whether it was populated deliberately or by a stale render.
 * 2. **Browser back-then-forward restores it** (**AC-582**), because history
 *    entries carry their own state. The forward entry gets its `challengeId`
 *    back and the server refuses the consumed code — the operator is told, and
 *    no second session is issued (**AC-530**).
 * 3. **A refresh loses it**, which is correct: a reload of `/signin/verify` is
 *    a request for a challenge nobody is holding.
 *
 * ## What is NOT in here
 *
 * **No password, no verification code, no token** (**AC-591**). Router state is
 * `history.state`, which is `sessionStorage`-backed in some browsers and is
 * readable from the console in all of them. The only credentials-adjacent value
 * below is the *masked* hint, which the server has already reduced to two
 * digits.
 */

import type { IsoDateTime } from '@/data/types/common'
import type { SecondFactor } from '@/data/types/auth'
import type { AuthCondition } from '@/components/auth/authContract'

/**
 * Handed to `/signin`. Every field is optional because `/signin` is also
 * reached with nothing at all, which is its ordinary case.
 */
export interface SignInHandoff {
  /**
   * **AC-513's return leg** — `/forgot-password` was reached with the typed
   * identifier and hands it back, so the operator does not retype it.
   */
  email?: string
  /**
   * The banner to render on arrival: `reset-requested` (§7.2),
   * `reset-succeeded` (§7.5), `session-ended-idle` / `session-ended-absolute`
   * (§3.2), `challenge-locked` after a fifth wrong code (§4.3).
   */
  condition?: AuthCondition
  /**
   * **AC-501** — the route the operator originally asked for. After a
   * successful sign-in they land **there**, not on `session.landingRoute`.
   *
   * It is never rendered. Design §3.1: *"the redirect target is an
   * attacker-controllable URL parameter, and rendering its title on an
   * unauthenticated page is a text-injection surface bought for no operator
   * benefit."* So the card says nothing about where the operator was going.
   */
  from?: string
}

/** Handed to `/signin/verify`. Absent ⇒ `challenge-missing` (§4.5). */
export interface ChallengeHandoff {
  challengeId: string
  secondFactor: SecondFactor
  expiresAt: IsoDateTime
  /** **A deadline, never a duration.** `useCooldown` takes it as-is. */
  resendAvailableAt: IsoDateTime
  /**
   * Which screen opened the challenge. Decides one control's copy: the escape
   * is `Use a different account` from `/signin` (§4.2) and
   * `Use a different method` from `/signin/enroll` (§5.2).
   */
  origin: 'signin' | 'enroll'
  /**
   * §5.2 — step B's subtitle shows the number **unmasked**, because the
   * operator is confirming the number they just typed and masking it would
   * defeat the confirmation. `null` for the TOTP branch, which has no
   * destination to confirm. Absent entirely on the `signin` origin, where the
   * server's masked hint is the only thing the client is allowed to hold.
   */
  destination?: string | null
  /** Carried through so **AC-501** survives the code step. */
  from?: string
}

/** Handed to `/signin/enroll`. Absent ⇒ back to `/signin`. */
export interface EnrolHandoff {
  enrolmentToken: string
  methods: ReadonlyArray<SecondFactor['method']>
  from?: string
}

/**
 * Narrowing helpers. Router state is `unknown` and a cast is how a screen ends
 * up reading `undefined.challengeId` after a hand-typed URL.
 */
export function asSignInHandoff(state: unknown): SignInHandoff {
  return isRecord(state) ? (state as SignInHandoff) : {}
}

export function asChallengeHandoff(state: unknown): ChallengeHandoff | null {
  if (!isRecord(state)) return null
  const candidate = state as Partial<ChallengeHandoff>
  if (typeof candidate.challengeId !== 'string') return null
  if (!isRecord(candidate.secondFactor)) return null
  return candidate as ChallengeHandoff
}

export function asEnrolHandoff(state: unknown): EnrolHandoff | null {
  if (!isRecord(state)) return null
  const candidate = state as Partial<EnrolHandoff>
  if (typeof candidate.enrolmentToken !== 'string') return null
  return candidate as EnrolHandoff
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
