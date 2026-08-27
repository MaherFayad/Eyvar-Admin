/**
 * The auth surfaces' **presentation** model — `design/08-auth-and-onboarding.md`
 * §2.3, §2.4, §3.2, §4.1, §4.3–§4.5, §7.3, §8.2.
 *
 * **Pure functions and types only.** No React, no fetching, no fixtures, and —
 * deliberately — **no duplicate of the data layer's domain types**. `Session`,
 * `SignInOutcome`, `VerifyCodeOutcome`, `DeviceSession` and the rest live in
 * `src/data/types/auth.ts` and are imported, never restated. An early draft of
 * this file declared its own copies; they were deleted the moment the seam
 * landed, because two spellings of `VerifyFailureReason` is a defect waiting
 * for the first divergence.
 *
 * What is left is the half the data layer does not own: **which of the 28 named
 * states is on screen, which banner that is, and what tone it takes.**
 *
 * ## Why the client returns domain outcomes and throws only on transport
 *
 * Design §2.3 orders the card's one banner slot:
 *
 * ```
 * 1  offline              nothing else can be acted on
 * 2  transport error      the request never reached the server
 * 3  challenge-locked / resend-exhausted
 * 4  domain rejection     actionable now
 * 5  informational        nothing is wrong
 * ```
 *
 * Rank 2 has to be able to outrank rank 4. If a wrong password and a dropped
 * connection both arrived as exceptions, a screen would have one `catch` and no
 * way to tell them apart without string-matching an error — so a rejected
 * password during an outage would render *"That email address and password
 * don't match"*, which is a lie about the operator's credentials. The data
 * layer honours this: a domain answer is a value, and `ApiError` means the
 * request did not complete.
 */

import { toLatinDigits } from '@/lib'
import { AUTH_OPERATIONS, DEVICE_OPERATIONS } from '@/data/clients'
import type { IsoDateTime } from '@/data/types/common'
import type { VerifyFailureReason } from '@/data/types/auth'

/** Every operation id these surfaces can fail on, as one union. */
export type AuthOperationId =
  | (typeof AUTH_OPERATIONS)[keyof typeof AUTH_OPERATIONS]
  | (typeof DEVICE_OPERATIONS)[keyof typeof DEVICE_OPERATIONS]

/* ─────────────────────────────── conditions ──────────────────────────────── */

/**
 * Every condition that can occupy an auth surface's **one** banner slot.
 *
 * `specs/04` §9.1's state list, plus the two states design §15 overrule 6 added
 * — `challenge-missing` (which replaces the whole card, so it is a
 * `CardReplacement` below rather than a condition) and
 * `challenge-completed-elsewhere`.
 */
export type AuthCondition =
  /**
   * 1 — offline.
   *
   * The **surface** is carried because the body is not the same sentence on all
   * three: `Sign-in needs a connection.` on the card, `Codes can't be checked
   * without a connection.` on the code screen, and `Your changes are still
   * here.` in the re-auth modal, where the operator's unsaved work is the thing
   * they are actually worried about. One condition, three true sentences.
   */
  | { readonly kind: 'offline'; readonly surface: 'signin' | 'verify' | 'reauth' }
  /* 2 — transport. The operation is carried so the copy can name what failed. */
  | { readonly kind: 'transport-error'; readonly operation: AuthOperationId }
  /* 3 — a timed wall; the operator cannot retry now. */
  | { readonly kind: 'challenge-locked'; readonly minutes: number }
  | { readonly kind: 'resend-exhausted' }
  /* 4 — domain rejection, actionable now. */
  | { readonly kind: 'credentials-rejected' }
  | { readonly kind: 'password-wrong' }
  | { readonly kind: 'account-cannot-sign-in' }
  /**
   * A wrong code on attempt 1, 2 or 4. **Red means the attempt counted** — the
   * system design §2.4 names — so the three non-counting outcomes below are
   * deliberately not this.
   */
  | { readonly kind: 'code-wrong'; readonly attempt: 1 | 2 | 4 }
  | { readonly kind: 'code-invalidated' }
  | { readonly kind: 'code-superseded' }
  | { readonly kind: 'code-expired' }
  | { readonly kind: 'challenge-completed-elsewhere' }
  /* 5 — informational. Nothing is wrong. */
  | { readonly kind: 'code-resent' }
  | { readonly kind: 'reset-requested' }
  | { readonly kind: 'reset-succeeded'; readonly endedSessions: number }
  | { readonly kind: 'session-ended-idle'; readonly minutes: number }
  | { readonly kind: 'session-ended-absolute' }

export type AuthConditionKind = AuthCondition['kind']

/**
 * Design §2.3's ladder, as a number. Lower wins.
 *
 * **This is §5.2's merge clause applied, not suspended** (design §14 A-2). An
 * auth card has at most two conditions and only one is ever actionable, so the
 * resolution is precedence rather than a count — and exactly one banner renders
 * either way, which is R10's actual invariant.
 */
export function conditionRank(condition: AuthCondition): number {
  switch (condition.kind) {
    case 'offline':
      return 1
    case 'transport-error':
      return 2
    case 'challenge-locked':
    case 'resend-exhausted':
      return 3
    case 'credentials-rejected':
    case 'password-wrong':
    case 'account-cannot-sign-in':
    case 'code-wrong':
    case 'code-invalidated':
    case 'code-superseded':
    case 'code-expired':
    case 'challenge-completed-elsewhere':
      return 4
    default:
      return 5
  }
}

/**
 * The one condition that renders. `null` in, `null` out; a list in, the highest
 * rank out — **and ties resolve to the first**, so a caller's own order is the
 * tiebreak rather than an accident of `sort` stability.
 */
export function resolveCondition(
  conditions: readonly (AuthCondition | null | undefined)[],
): AuthCondition | null {
  let winner: AuthCondition | null = null
  let winningRank = Number.POSITIVE_INFINITY
  for (const condition of conditions) {
    if (!condition) continue
    const rank = conditionRank(condition)
    if (rank < winningRank) {
      winner = condition
      winningRank = rank
    }
  }
  return winner
}

/**
 * Design §2.4's exhaustive table of where red is spent and where it is
 * deliberately not.
 *
 * `code-superseded` is **info** and `code-expired` / `code-invalidated` /
 * `resend-exhausted` are **warning**, because on this screen *red means the
 * attempt counted* and none of those consumed one. Colour is never the sole
 * carrier — every one of them says so in words too — but the redundancy is what
 * makes the rule learnable in one shift.
 */
export function conditionTone(
  condition: AuthCondition,
): 'info' | 'success' | 'warning' | 'critical' {
  switch (condition.kind) {
    /* Matches the shell's own `offline` banner (00-shell §11.6 row 20). Nothing
       is wrong with the operator's credentials; there is simply no path. */
    case 'offline':
      return 'warning'
    case 'challenge-locked':
    case 'transport-error':
    case 'credentials-rejected':
    case 'password-wrong':
    case 'account-cannot-sign-in':
    case 'code-wrong':
      return 'critical'
    case 'resend-exhausted':
    case 'code-invalidated':
    case 'code-expired':
      return 'warning'
    case 'reset-succeeded':
      return 'success'
    default:
      return 'info'
  }
}

/**
 * **AC-678.** `role="alert"` when the banner announces a rejection or a
 * failure, `role="status"` when it is informational. Announced without stealing
 * focus either way — design §3.2's `credentials-rejected` row.
 */
export function conditionRole(condition: AuthCondition): 'alert' | 'status' {
  const tone = conditionTone(condition)
  return tone === 'critical' || tone === 'warning' ? 'alert' : 'status'
}

/**
 * `VerifyFailureReason` + `attemptsRemaining` → the designed condition.
 *
 * **§4.3's ladder is keyed on attempts remaining, and remaining is what the
 * server sends** — which is the whole reason there is no client-side counter
 * here. Five attempts per challenge (`MAX_CODE_ATTEMPTS`, server policy):
 *
 * | remaining | attempt | condition | tone |
 * |---:|---:|---|---|
 * | 4 | 1 | `code-wrong` | critical — it counted |
 * | 3 | 2 | `code-wrong`, naming the next consequence | critical |
 * | 2 | 3 | **`code-invalidated`** — the code is gone, and the seam sends the reason | warning |
 * | 1 | 4 | `code-wrong`, naming the lockout | critical |
 * | 0 | 5 | `challenge-locked` — the client returns `locked`, not `incorrect` |
 *
 * **`attemptsRemaining` is a number iff the call consumed an attempt**, which is
 * the seam expressing the same distinction the tone does.
 *
 * > **The seam gap is closed.** This function used to infer row 3 from
 * > `attemptsRemaining === 2`, because `VerifyFailureReason` had no
 * > `invalidated` and the mock returned `incorrect` on the third wrong attempt
 * > — so the banner said *"This code was cancelled"* **while the code still
 * > worked**. `invalidated` now exists and the data layer actually cancels the
 * > code: the original is refused afterwards and only a resend moves the
 * > operator on. The mapping below is therefore **by reason**, not by
 * > arithmetic on a count, which is what it should always have been.
 */
export function conditionForVerifyFailure(
  reason: VerifyFailureReason,
  attemptsRemaining: number | null,
  lockoutMinutes: number,
): AuthCondition {
  switch (reason) {
    /* Row 3, and the seam says so rather than the client deducing it. */
    case 'invalidated':
      return { kind: 'code-invalidated' }
    case 'incorrect':
      if (attemptsRemaining === 3) return { kind: 'code-wrong', attempt: 2 }
      if (attemptsRemaining === 1) return { kind: 'code-wrong', attempt: 4 }
      return { kind: 'code-wrong', attempt: 1 }
    case 'expired':
      return { kind: 'code-expired' }
    case 'superseded':
      return { kind: 'code-superseded' }
    case 'locked':
      return { kind: 'challenge-locked', minutes: lockoutMinutes }
    case 'completed-elsewhere':
      return { kind: 'challenge-completed-elsewhere' }
    case 'missing':
      /* Unreachable: `missing` replaces the whole card (§4.5) and never renders
         a banner. Kept exhaustive so a new reason is a compile error rather
         than a silent fall-through. */
      return { kind: 'challenge-completed-elsewhere' }
  }
}

/**
 * Whole minutes until a server-issued deadline, **read once at render and never
 * ticked**.
 *
 * §3.2 is explicit: the lockout duration *"never ticks in the browser: it is
 * re-read from the server per attempt"*, which is what lets **AC-528** see the
 * number fall. Contrast the resend cooldown, which *does* tick — `useCooldown`
 * — because it is an admitted courtesy over a fact the server enforces anyway.
 * The two look identical on screen and are opposites underneath, so they are
 * two different mechanisms on purpose.
 *
 * Rounds **up**, so a lockout with 30 seconds left says `1 minute` rather than
 * `0 minutes`, which is not a duration anyone should be asked to wait.
 */
export function minutesUntil(deadline: IsoDateTime | null, now: number = Date.now()): number {
  if (deadline === null) return 0
  const remaining = new Date(deadline).getTime() - now
  return remaining <= 0 ? 0 : Math.ceil(remaining / 60_000)
}

/* ───────────────────────────── whole-card states ─────────────────────────── */

/**
 * The three cases where design replaces the **entire card** rather than
 * bannering it. A banner above an absent form is nonsense (design §7.3): it
 * summarises a thing that is not there. And a card that pretends to still be a
 * form when its token is spent is a dead end, which **AC-581** forbids.
 */
export type CardReplacement =
  | 'challenge-missing'
  | 'reset-token-invalid'
  | 'invite-token-invalid'

/* ───────────────────────────── field validation ──────────────────────────── */

/**
 * **AC-504** — *"submitting an identifier that is not a plausible email address
 * … does not issue a network request."* Deliberately permissive: this exists to
 * catch `fahad@eyvar` and `fahad eyvar.com`, not to adjudicate RFC 5322. A
 * stricter rule here rejects real addresses and teaches the operator that the
 * form is wrong about them.
 */
export function isPlausibleEmail(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed.length === 0 || /\s/.test(trimmed)) return false
  const at = trimmed.indexOf('@')
  if (at <= 0 || at !== trimmed.lastIndexOf('@')) return false
  const domain = trimmed.slice(at + 1)
  return domain.includes('.') && !domain.startsWith('.') && !domain.endsWith('.')
}

/** Design §7.3 — the only length rule, stated before the operator types (**AC-545**). */
export const PASSWORD_MIN_LENGTH = 12

export type PasswordStrength = 'short' | 'weak' | 'strong'

/**
 * Three levels, two tones, **no red and no blue** (design §7.3).
 *
 * *The meter never gates submission.* It is a courtesy (spec §11.2); only the
 * 12-character minimum, the match check and the server's breach list gate the
 * primary. Stated here because an engineer will otherwise disable `Save` on
 * `weak`, and the function that returns the level is where they would do it.
 */
export function passwordStrength(value: string): PasswordStrength {
  if (value.length < PASSWORD_MIN_LENGTH) return 'short'
  /* "Longer is better than more complicated" is the helper text's claim, so the
     meter has to agree with it: length carries most of the signal, and variety
     only rescues a password that is barely over the floor. A rule demanding a
     symbol would contradict the sentence directly above the bar. */
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^\w\s]/].filter((re) => re.test(value)).length
  if (value.length >= 16) return 'strong'
  return classes >= 3 ? 'strong' : 'weak'
}

/* ──────────────────────────── the OTP field's rules ──────────────────────── */

export const OTP_LENGTH = 6

/**
 * **D-OTP-5.** Pasted content is stripped of spaces, hyphens, en-dashes,
 * non-breaking spaces and every other non-digit **before** it is measured,
 * because `123 456` and `123-456` are what an SMS client copies (**AC-521**),
 * and Arabic-Indic digits are what an Arabic-locale keyboard produces.
 *
 * `toLatinDigits` is `src/lib/parse/input.ts`'s, not a second copy: the code
 * field and every numeric input in the product must fold the same way, and two
 * implementations of "which characters are digits" is how one screen accepts
 * `٤٢٨٩١٦` and the next one does not.
 */
export function sanitiseCode(raw: string): string {
  return toLatinDigits(raw).replace(/\D/g, '').slice(0, OTP_LENGTH)
}
