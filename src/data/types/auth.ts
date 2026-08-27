/**
 * Authentication — six screens, one modal, one device list.
 *
 * Spec `docs/05-restructure/specs/04-auth-and-onboarding.md` §4–§7; design
 * `docs/05-restructure/design/08-auth-and-onboarding.md` §3–§9.
 *
 * ## The one shape decision everything else follows from
 *
 * > **A domain outcome is a RETURNED discriminated union. Only a transport
 * > failure throws.**
 *
 * A wrong password is not a 503, and a screen that treats it as one shows a
 * `Retry` button where it owes a field error. But the deeper reason is
 * ordering: design **§2.3** gives the card **one** banner slot and puts
 * transport failures **above** domain outcomes in its precedence list. A
 * precedence rule cannot order two things that arrive by the same channel — if
 * both were exceptions, the `catch` block would have to re-derive which kind it
 * caught from a `code` string, which is the branch this union exists to
 * replace.
 *
 * So every operation below returns `Promise<XOutcome>`, and `ApiError` is
 * reserved for *the request did not complete*. `?mockFail=auth.signIn` still
 * reaches all of them — §10.3's two paths, and both must work.
 *
 * ## Cooldowns and lockouts are **deadlines**, never durations
 *
 * Every clock this layer emits is an `IsoDateTime` the server issued. Never a
 * `seconds: 30`.
 *
 * A duration is only correct at the instant it is read. A tab backgrounded for
 * four minutes resumes and counts down from a number that expired while it was
 * asleep, and the operator watches a resend button stay dead for thirty seconds
 * it already served. `useCooldown` is deadline-driven for this reason, and
 * **30 / 60 / 120 is server policy** — no client-side schedule constant exists
 * in this layer or above it.
 *
 * The lockout is stronger still: §3.2 says its minutes are **re-read per
 * attempt and never tick in the browser**, so `lockedUntil` is a fact to
 * render, not a countdown to run.
 */

import type { IsoDateTime } from './common'
import type { PermissionKey } from './navigation'
import type { RoleName, Session } from './session'

/* ───────────────────────── second factor ────────────────────── */

/**
 * Replaces `TeamUser.twoFactorEnabled` (§4.2, §10.1).
 *
 * **`null` means enrolment pending**, and forces `signin-enroll` at the next
 * sign-in — it does not mean "this operator opted out". Spec §4.2 retires both
 * legacy switches: the per-user `twoFA` toggle (`:3047`) and the workspace
 * `require2FA` setting (`:8028`). *"A policy whose 'off' state is 'an operator
 * who can release escrow may sign in with one factor' is not a policy anyone
 * should be able to set from a settings pane."*
 *
 * The legacy app **declares two-factor twice and enforces it zero times**;
 * turning the workspace policy on paints a red `⚠ 2FA off` badge (`:10456`) and
 * blocks nothing, because there is no sign-in for it to block.
 */
export interface SecondFactor {
  method: 'sms' | 'totp'
  /**
   * What the code screen shows: `••••••67` for SMS, the app name for TOTP.
   *
   * **Masked to two digits, not four.** **AC-519**, and spec §19.1 records that
   * §12.2's own illustrative string exposed four and violated the criterion
   * that wrote it. An LTR-pinned run — `<bdi dir="ltr">` (design §12).
   */
  hint: string
}

/* ─────────────────────────── outcomes ───────────────────────── */

/**
 * Why a credential submission did not produce a session.
 *
 * **`rejected` covers every account-state refusal on purpose** — wrong
 * password, no such account, `Invited` and never activated, `Suspended`. §4.5:
 * one message, one latency, so the form cannot be used to enumerate accounts.
 * The distinctions exist in the fixtures and are deliberately not on the wire.
 */
export type SignInFailureReason =
  | 'rejected'
  /** §3.2. `lockedUntil` carries the deadline; the browser never ticks it. */
  | 'locked'
  /** 429. Distinct from `locked`: this is the transport's rate limit, not the account's. */
  | 'rate-limited'

export type SignInOutcome =
  | {
      kind: 'challenge'
      /** The verification-code challenge this attempt opened. */
      challengeId: string
      secondFactor: SecondFactor
      /** When the code stops being accepted. §5.3's supersession compares against it. */
      expiresAt: IsoDateTime
      /** Earliest instant `Resend` may be pressed. **A deadline, never a duration.** */
      resendAvailableAt: IsoDateTime
    }
  | {
      /** §4.4 — no second factor enrolled. Enrolment is not optional and not skippable. */
      kind: 'enrolment-required'
      enrolmentToken: string
      methods: ReadonlyArray<SecondFactor['method']>
      /**
       * **Design §5.1's `Use {phone} from your profile`, and the reason it is
       * on *this* outcome rather than read from the shell.**
       *
       * At `/signin/enroll` the operator has proved their password and has **no
       * session** (**AC-515**). `useShell().session` is therefore either absent
       * or — worse — a *different* operator's, on a console the previous person
       * left open. A screen that read the phone from there would offer one
       * operator the other's number and call it "your profile".
       *
       * So the server, which is the only party that knows who just
       * authenticated, returns it with the enrolment token. `null` for an
       * operator whose `TeamUser.phone` is `null` — the option then renders
       * without the shortcut rather than with an empty one.
       *
       * **Unmasked, deliberately.** §5.2's step B shows the number unmasked too,
       * because the operator is confirming *that* number and a masked one
       * cannot be confirmed. It is the operator's own number, shown to them,
       * after a password.
       */
      profilePhone: string | null
    }
  | {
      kind: 'failed'
      reason: SignInFailureReason
      /** Set iff `reason === 'locked'`. Absolute, server-issued. */
      lockedUntil: IsoDateTime | null
      /** Set iff `reason === 'rate-limited'`. When another attempt will be accepted. */
      retryAfter: IsoDateTime | null
    }

/**
 * §5.1 and §5.4. **`attemptsRemaining` is on the *failure*, not on the
 * challenge**: a screen may only learn how many attempts are left by using one,
 * which is what stops the number being read off a fresh challenge.
 */
export type VerifyFailureReason =
  /** Wrong six digits. `attemptsRemaining` counts down. */
  | 'incorrect'
  /**
   * **The third wrong attempt cancelled the code, and the code really is
   * cancelled** — design §4.3 row 3, **AC-526**, **AC-534**.
   *
   * This member exists because the surface was asserting something the seam
   * could not make true. The banner reads *"This code was cancelled / Three
   * wrong attempts, so the code no longer works. Send a new one."* while the
   * old mock returned `incorrect` and left the code working. **A banner that
   * announces a cancellation which did not happen is worse than no banner**: it
   * teaches an operator that the message is decorative, and the next security
   * message they are shown is one they have been trained to ignore.
   *
   * The effect, not just the word: after this outcome the original code is
   * refused, `verifyCode` consumes no further attempts against it, and the only
   * move that produces a working code is `resendCode` — which is accepted
   * **immediately, ignoring the cooldown**, because otherwise there is no way
   * forward at all.
   *
   * **The counter is per challenge and spans codes** (§4.3): attempts 4 and 5
   * run against the *new* code, which is what keeps `locked` (**AC-527**)
   * reachable through the designed path rather than only through `999999`.
   */
  | 'invalidated'
  /** Past `expiresAt`. **Does not count against attempts** (§4.4 of the design). */
  | 'expired'
  /** A newer challenge was issued for this account. Does not count (§5.3). */
  | 'superseded'
  /** The 5th wrong attempt. The challenge is dead; `lockedUntil` says for how long. */
  | 'locked'
  /** §9.1's `challenge-missing` — no such challenge id, ever or any more. */
  | 'missing'
  /** §9.1's `challenge-completed-elsewhere` — another tab finished this one. */
  | 'completed-elsewhere'

export type VerifyCodeOutcome =
  | { kind: 'signed-in'; session: Session }
  | {
      kind: 'failed'
      reason: VerifyFailureReason
      /**
       * **A number iff *this call* consumed an attempt; `null` otherwise.**
       *
       * That is the whole rule, and `invalidated` is what sharpened it. The
       * older wording — *"null on every non-counting outcome"* — listed four
       * reasons and left the fifth ambiguous, because the attempt that cancels
       * the code **does** count (it is the third of five) while a replay against
       * the already-cancelled code does not.
       *
       *   `incorrect`             a number, always
       *   `invalidated`           the cancelling attempt: **2**; a replay: `null`
       *   `locked`                **0** on the fifth attempt; `null` on a replay
       *   `expired` `superseded`  `null` — a different code
       *   `missing` `completed-elsewhere` `null` — a different challenge
       */
      attemptsRemaining: number | null
      lockedUntil: IsoDateTime | null
    }

export type ResendCodeOutcome =
  | {
      kind: 'sent'
      challengeId: string
      expiresAt: IsoDateTime
      /** The **next** cooldown deadline. 30 → 60 → 120 s is server policy; the client never schedules. */
      resendAvailableAt: IsoDateTime
      /**
       * **How many more codes this sign-in may be sent** — design §4.4's
       * *"`{count}` resends left before you'll need to sign in again."*, which
       * renders as a 12 px line under the button when it drops to 2 or fewer.
       *
       * On the outcome rather than on the challenge, for the same reason
       * `attemptsRemaining` is on the failure: a screen learns the budget by
       * spending from it. Counting down in the client from a schedule it was
       * told once is how a client becomes wrong about a limit only the server
       * enforces.
       *
       * At the first challenge this is `MAX_CODES_PER_CHALLENGE - 1` and the
       * line does not render, so nothing is shown until it is worth showing.
       */
      resendsRemaining: number
    }
  | {
      /** Pressed early. The deadline is returned so the button can re-arm itself correctly. */
      kind: 'cooling-down'
      resendAvailableAt: IsoDateTime
    }
  | {
      /**
       * **AC-533 · design §4.4's `resend-exhausted`.** The sign-in has had every
       * code it is going to get. The resend control is replaced by a full-width
       * `Go to sign in`, because there is nothing left on this screen to press.
       *
       * **A top-level member and not a third `failed.reason`, on purpose.** A
       * caller that has handled `sent` and `cooling-down` and then reads
       * `result.reason` gets a **compile error** here rather than a run-time
       * fall-through into the `challenge-locked` branch — which would show a
       * lockout with `0 minutes` for a challenge that is not locked at all.
       * `missing` and `locked` are failures of the resend; this is the
       * challenge being spent, and the surface differs accordingly.
       *
       * `codesSent` is stated rather than assumed: design's copy is *"Five codes
       * were sent for this sign-in."* and a sentence that names a number should
       * be able to get it from the answer.
       */
      kind: 'exhausted'
      codesSent: number
    }
  | { kind: 'failed'; reason: 'missing' | 'locked'; lockedUntil: IsoDateTime | null }

/**
 * §6.2, and the sentence is deliberately non-committal.
 *
 * **There is exactly one outcome and it carries no signal.** A response that
 * differed for a known and an unknown address would turn the reset form into an
 * account-enumeration oracle, which is the whole point of §6.2's copy. The mock
 * takes the same latency either way — `mockMutation`'s delay is not
 * conditional.
 */
export interface RequestPasswordResetOutcome {
  kind: 'accepted'
}

/** §6.3. Four named failure modes plus valid — the five fixture tokens of §10.3. */
export type TokenState = 'valid' | 'expired' | 'used' | 'superseded' | 'unknown'

export interface ValidateTokenOutcome {
  state: TokenState
  /** Whose token it is, shown on the card. `null` on anything but `valid`. */
  email: string | null
  /** `reset` re-sets a password; `invite` activates an account (§6.6). */
  purpose: 'reset' | 'invite' | null
  /**
   * **Design §7.4's subtitle — `You've been invited to Eyvar as {role}.`**
   *
   * A `RoleName`, **not a translated string**: `{role}` is itself a key
   * (`role.opsManager`), and an English literal interpolated into an Arabic
   * sentence is the bug §7.4 calls out by name. The seam sends the domain
   * value; the UI keys it.
   *
   * `null` on anything but a `valid` token, and `null` on a `reset` token —
   * a reset does not announce a role, and a field populated on a purpose that
   * never renders it is a field somebody will eventually render.
   *
   * Reachable from `?token=invite`, which is `noura.f@eyvar.com` — the seeded
   * `Invited` row (`:2837`) that the whole `Invited → Active` transition exists
   * for.
   */
  role: RoleName | null
}

export type ResetPasswordOutcome =
  | {
      kind: 'reset'
      /**
       * **How many OTHER sessions ended.** §7.5 gives `auth.reset.done` an
       * explicit ICU **`=0`** form that names no count, because *"0 other
       * sessions ended"* is not a sentence anyone should ship. Spec §19.3 C-3
       * corrected AC-552 to match: the design was right and the criterion was
       * wrong.
       */
      otherSessionsEnded: number
    }
  | {
      kind: 'failed'
      /**
       * **`breached` is not a token state, and that is why it is a union
       * member rather than a sixth `TokenState`** — **AC-548**.
       *
       * Every other reason here says *the link is dead*, and the card answers
       * all four with one whole-card replacement (§7.3). `breached` says the
       * opposite: the link is fine, the operator is still on the form, and the
       * password they chose is the only thing wrong. It renders as an **inline
       * error under the first field** and **both fields keep their contents**.
       * Folding it into `TokenState` would put it one `switch` away from
       * replacing the card and losing what they typed.
       *
       * **It cannot be a client-side list** (spec §11.1): the breach check is a
       * server guarantee, which is exactly why it has to arrive as an outcome
       * and cannot be pre-empted by the strength meter. The fixture password
       * `Password123!` is 12 characters with four character classes — the meter
       * calls it **strong** and the server refuses it, which is §7.3's *"the
       * meter never gates submission"* made observable instead of asserted.
       */
      reason: Exclude<TokenState, 'valid'> | 'breached'
    }

/**
 * §7.3 and §7.6 — **identity does not change on re-authentication, and it is
 * enforced by an absent field rather than by a check.**
 *
 * `ReauthenticateInput` carries a password and nothing else. There is no
 * `email`, no `userId`, no `identifier`. **AC-567** as rewritten in spec §19.2
 * is three clauses, and the second is *"the request carries no operator-supplied
 * identity"* — which this type makes structurally true rather than
 * conditionally true. A refusal is a line of code somebody can delete; an
 * absent field cannot be forgotten into existence.
 *
 * The third clause is `userId` continuity, and it is asserted in
 * `clients/auth.test.ts` against the session that expired.
 */
export interface ReauthenticateInput {
  password: string
}

export type ReauthenticateOutcome =
  | { kind: 'resumed'; session: Session }
  | {
      /**
       * **AC-573 — on an untrusted device the modal asks for the password *and*
       * a code.** Design §8.2's `second factor needed` row: **the same modal
       * swaps its body in place.** No second modal, no route change, no
       * remount, and the dirty form is untouched throughout.
       *
       * The shape is `SignInOutcome`'s `challenge`, deliberately, because it
       * **is** one: the code step is verified with the ordinary
       * `verifyCode({ challengeId, code })` and resent with the ordinary
       * `resendCode(challengeId)`. A second pair of operations for the same
       * six digits would be a second attempt counter, a second cooldown
       * schedule and a second place for §4.3's ladder to drift.
       *
       * **AC-567 (c) still holds through it**: the challenge is opened against
       * the identity the *server* has recorded as signed in, never against
       * anything the form sent — `ReauthenticateInput` has no identity to send
       * — so the session `verifyCode` returns carries the `userId` of the
       * session that expired.
       *
       * Which arm fires is the current device's trust, read at
       * `isDeviceTrusted`: `USR-1`'s `SESS-1` is trusted 30 days and takes the
       * password-only arm; `USR-2`'s `SESS-4` is untrusted and `USR-3`'s
       * `SESS-5` is trust-**expired**, and both take this one. Both arms are
       * reachable from the seeded fixtures without a hand edit.
       */
      kind: 'challenge'
      challengeId: string
      secondFactor: SecondFactor
      expiresAt: IsoDateTime
      resendAvailableAt: IsoDateTime
    }
  | { kind: 'failed'; reason: SignInFailureReason; lockedUntil: IsoDateTime | null }

/* ─────────────────────── TOTP enrolment ─────────────────────── */

/**
 * What design §5.1's TOTP option needs to draw: **a 144 px QR canvas and the
 * secret in `font-mono` beneath it**, for an operator whose phone camera cannot
 * see their own screen.
 *
 * **The secret is issued by the server and never generated in the browser.** A
 * client that could mint a TOTP secret is a client that decides what the second
 * factor is, which is the one thing §4.2 puts beyond the console's reach.
 *
 * The mock's secret is a **fixed literal**, like every other value in this
 * layer: a QR code that changes per run cannot be diffed by a visual regression
 * test, and a QA engineer reproducing a scan failure needs the same square
 * twice.
 */
export interface TotpEnrolment {
  /** The base32 secret, shown in `font-mono`, grouped in fours for reading aloud. */
  secret: string
  /**
   * The `otpauth://` URI the QR encodes. **The server composes it**, because
   * the issuer label and the account label are its naming decision and not the
   * console's — two clients composing their own would produce two different
   * entries in the operator's authenticator app.
   */
  otpauthUri: string
  /** Carried through to `enrollSecondFactor`, which confirms the secret with a code. */
  enrolmentToken: string
}

/* ──────────────────────────── devices ───────────────────────── */

/**
 * One active session on one device — `DB.loginSessions` (`:2994`–`:3001`), made
 * real. Design §9 is the surface.
 *
 * Legacy stores `lastActive: 'Active now'` / `'3 days ago'` — display strings
 * that cannot be sorted or localised. ISO here, and the UI formats.
 */
export interface DeviceSession {
  id: string
  /** `Chrome on Windows`. Legacy's `device`. */
  device: string
  /** `Riyadh`. Legacy's `location`, minus the `, SA` suffix the UI does not need. */
  location: string
  /**
   * Rendered on the operator's **own** list, which is what makes it defensible
   * — recorded as **D-A10**, PII on a screen nobody reviewed for it. A single
   * LTR token: `<bdi dir="ltr">` (design §9).
   */
  ip: string
  lastActiveAt: IsoDateTime
  /**
   * **The `This device` badge** (design §9). Exactly one row carries `true`.
   *
   * `neutral` tone, and it is the row's **only** badge: trusted state is carried
   * by the `Trusted until {date}` line, never by a second badge, because two
   * badges on a 13 px row is where a list stops being scannable.
   */
  isCurrent: boolean
  /**
   * **`Trusted until {date}`, or `Not trusted`.** `null` means not trusted —
   * `Remember this device` was never used, or `Stop trusting` was.
   *
   * A 30-day lifetime (§7.1, `[inferred]`), stored as its **expiry** and not as
   * a `trustedAt` plus a policy constant, so the row renders the date the
   * server means rather than a date the client computed from a duration it
   * guessed.
   */
  trustedUntil: IsoDateTime | null
}

/* ────────────────────── identity fixtures ───────────────────── */

/**
 * What a seeded identity is for. **Domain outcomes are fixtures, not injected
 * failures** (§10.3) — `?mockFail=` produces a 503, and a wrong password is not
 * a 503.
 */
export type AuthIdentityOutcome =
  /** Signs in, gets a challenge, reaches a session. */
  | 'happy'
  /** `Invited`, never activated. **Generic rejection** — §9.1 `account-invited`. */
  | 'invited'
  /** `Suspended`. **Generic rejection**, same copy and same latency. */
  | 'suspended'
  /** Challenge locked with minutes remaining. */
  | 'locked'
  /** Ops Manager with `permissions: []`, so `track-empty` is reachable (§9.2). */
  | 'no-permissions'

export interface AuthIdentity {
  email: string
  /** `null` for an identity with no `TeamUser` row — none today. */
  userId: string | null
  outcome: AuthIdentityOutcome
  role: RoleName
  permissions: PermissionKey[]
  /** `null` = enrolment pending, which forces `signin-enroll` (§4.4). */
  secondFactor: SecondFactor | null
  /** Set iff `outcome === 'locked'`. */
  lockedUntil: IsoDateTime | null
}
