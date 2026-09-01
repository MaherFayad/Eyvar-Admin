/**
 * Every operator-facing string on the six auth screens, the re-authentication
 * modal, the session banners and the device list.
 *
 * **Quoted verbatim from `design/08-auth-and-onboarding.md`.** Its §3–§9 are
 * final and its `TODO` count is zero, so nothing here was written by an
 * engineer and nothing here may be improved by one. If a sentence reads oddly,
 * the design spec is the place to argue with it.
 *
 * Rules this file exists to make mechanical:
 *   **AC-669 / AC-616** every string resolves through a key; an empty Arabic
 *   dictionary renders English for all of them and never a raw key.
 *   **AC-670 / AC-671** nothing is concatenated. Every interpolation is a named
 *   placeholder inside a single key, and a missing one throws in `interpolate`
 *   rather than rendering `{count}` to an operator.
 *   **AC-680** sentence case; every button label is a verb or verb + object,
 *   with `Cancel` the one permitted non-verb.
 *   **AC-656** no `please`, no `invalid`, no `failed`, no exclamation mark.
 *   **R6** full sentences take a period; titles and fragments do not.
 *
 * ## The plural families
 *
 * A key ending `#one` / `#other` / `#0` is a **family**, read through
 * `t.plural`, never through `t`. The bare key deliberately does not exist so
 * that `t('auth.reset.done')` throws in dev rather than rendering nothing.
 * Arabic has six categories; `Intl.PluralRules` holds the table and the caller
 * does not. Only the English forms are declared here — the Arabic dictionary is
 * empty by decision (see `src/i18n/dictionaries.ts`), and whole-family fallback
 * is what stops an Arabic `#other` pairing with an English `#few`.
 *
 * `auth.reset.done` carries an explicit **`=0`** form, and it is the design
 * (§7.5), not a gap: `0 other sessions ended` is not a sentence anyone should
 * ship. **AC-552** was corrected on the spec side to scope its count
 * requirement to the non-zero case.
 */

import type { Dictionary } from '@/lib'

export const AUTH_EN: Dictionary = {
  /* ─────────────────────── shared field labels (§2.2) ─────────────────── */
  'auth.field.email': 'Email',
  'auth.field.password': 'Password',
  'auth.field.showPassword': 'Show password',
  'auth.field.hidePassword': 'Hide password',
  'auth.signOut': 'Sign out',
  'auth.tryAgain': 'Try again',

  /* The legal row (§1.3). `Help` is deliberately absent — Eyvar has no help
     centre, and a dead `Help` on a sign-in page is worse than no `Help`. When
     Admin › Workspace's `legal` pane provides none of these, the row is not
     rendered at all rather than rendered empty.

     **These two keys are currently UNRENDERED, and that is deliberate.**
     `legal.ts` returns an empty list because Eyvar has no privacy page and no
     terms page — the same rule that removes `Help`, applied to the other two.
     The keys stay so that restoring the row is a one-line change there and
     nothing here; see `legal.ts`'s header for the decision and its grounds. */
  'auth.legal.privacy': 'Privacy',
  'auth.legal.terms': 'Terms',

  /* ───────────────────────── 1 · signin (§3) ──────────────────────────── */
  'auth.signin.title': 'Sign in',
  'auth.signin.subtitle': 'Eyvar operations console',
  'auth.signin.forgot': 'Forgot password?',
  'auth.signin.remember': 'Remember this device',
  /* §7.4 — off by default. This sentence is the only place the operator is
     told they are agreeing to weaken one factor for a month, which is why it
     is helper text under the control and never a tooltip (`copy.md` rule 7). */
  'auth.signin.rememberHelper':
    'Skips the code on this browser for 30 days. It never skips your password.',
  'auth.signin.submit': 'Sign in',

  /* **AC-506 / AC-508 / AC-578 — byte-identical for four different causes**:
     an unknown identifier, a wrong password, a `Suspended` account and an
     `Invited` one. The words "invited", "activate", "pending", "suspended",
     "disabled" and "deactivated" appear nowhere on the surface. One key is how
     that stays true: four call sites cannot drift if there is one string. */
  'auth.error.credentials.title': "That email address and password don't match",
  'auth.error.credentials.body': 'Check both and try again.',

  /* **AC-504.** The period is R6's, and `docs/ref/copy.md:33` now agrees —
     spec §19.3 C-2, closed on both sides. One string, one spelling. */
  'auth.error.email': 'Enter a valid email address.',

  /* §3.2 — the primary stays ENABLED, because disabling it would freeze this
     number on screen forever and **AC-528** requires the duration to fall on
     subsequent attempts. The number never ticks in the browser: it is re-read
     from the server per attempt (contrast the resend cooldown, §4.4). */
  'auth.lockout.title': 'Too many attempts',
  'auth.lockout.retryIn#one': 'Wait {minutes} minute, then sign in again.',
  'auth.lockout.retryIn#other': 'Wait {minutes} minutes, then sign in again.',

  /* The one card state where disabling the primary is right: there is
     genuinely no path. Nothing typed is cleared (**AC-512**). */
  'auth.offline.title': "You're offline",
  'auth.offline.signin': 'Sign-in needs a connection. Nothing you typed has been lost.',
  'auth.offline.verify': "Codes can't be checked without a connection. Nothing you typed has been lost.",
  'auth.offline.reauth': "Your changes are still here. They'll save when you're back and signed in.",

  /* **AC-511.** Identifier kept, password cleared. */
  'auth.error.signin.title': "Couldn't reach the console",
  'auth.error.signin.body': 'Nothing was sent. Try again.',

  'auth.session.endedIdle.title': 'Your session ended',
  'auth.session.endedIdle#one': 'You were inactive for {minutes} minute. Sign in to continue.',
  'auth.session.endedIdle#other': 'You were inactive for {minutes} minutes. Sign in to continue.',
  /* **AC-560** — visibly distinct from the idle reason, here and in the modal. */
  'auth.session.endedAbsolute.title': 'Your session reached its 12-hour limit',
  'auth.session.endedAbsolute.body': 'Sign in to continue.',

  /* ─────────────────── 2 · signin-verify (§4) ─────────────────────────── */
  'auth.otp.title.sms': 'Check your messages',
  'auth.otp.title.totp': 'Check your authenticator app',
  /* The masked run is a numeric run: `<bdi dir="ltr">`, no reorder (**AC-675**),
     and never more than the last two digits (**AC-519**). */
  'auth.otp.sentTo': 'Sent to {hint}',
  'auth.otp.fromApp': 'Enter the current code from the app',
  'auth.otp.label': 'Verification code',
  /* **D-OTP-3** — the helper carries the format, because the reference's
     `000000` placeholder is indistinguishable from a filled value at 17 px. */
  'auth.otp.helper.sms': "6 digits. Codes expire 10 minutes after they're sent.",
  'auth.otp.helper.totp': '6 digits, from the app on your phone.',
  'auth.otp.submit': 'Verify',
  'auth.otp.resend': 'Resend code',
  'auth.otp.resendNew': 'Send a new code',
  'auth.otp.resendIn#one': 'Resend code in {seconds}s',
  'auth.otp.resendIn#other': 'Resend code in {seconds}s',
  /* §4.4 — the ONE polite announcement. The ticking number itself sits inside
     `aria-live="off"`, because a per-second live region is unusable. */
  'auth.otp.resendReady': 'Resend code is available.',
  'auth.otp.resendsLeft#one': "{count} resend left before you'll need to sign in again.",
  'auth.otp.resendsLeft#other': "{count} resends left before you'll need to sign in again.",
  'auth.otp.otherAccount': 'Use a different account',
  'auth.otp.goToSignIn': 'Go to sign in',

  /* §4.3 — five strings, three tones, and the tone tells the operator whether
     the attempt counted. Attempts 1, 2 and 4 are `critical`: red means it
     counted. */
  'auth.otp.wrong.title': 'That code is incorrect',
  'auth.otp.wrong.body': 'Check the newest message and try again.',
  'auth.otp.wrong2.body':
    'Check the newest message and try again. One more wrong attempt cancels this code.',
  'auth.otp.wrong4.body': "One more wrong attempt and you'll need to sign in again.",
  /* Warning, not red: the condition is "this code is gone", not "you got it
     wrong" — the wrongness was already announced on attempts 1 and 2. */
  'auth.otp.invalidated.title': 'This code was cancelled',
  'auth.otp.invalidated.body':
    'Three wrong attempts, so the code no longer works. Send a new one.',
  /* Info: nothing is wrong and no attempt was consumed. */
  'auth.otp.superseded.title': 'That code has been replaced',
  'auth.otp.superseded.body': 'A newer code was sent. Enter the one from the most recent message.',
  /* Warning: a timer ran out; no attempt consumed. */
  'auth.otp.expired.title': 'That code has expired',
  'auth.otp.expired.body': 'Codes last 10 minutes. Send a new one.',
  'auth.otp.exhausted.title': 'That verification expired',
  'auth.otp.exhausted.body':
    'Five codes were sent for this sign-in. Sign in again to start over.',
  /* §4.4 — the supersession trap closed BEFORE it springs. Telling the
     operator the instant they press Resend is a prevention; telling them after
     they have typed the older code is a recovery. It costs one sentence. */
  'auth.otp.resent.title': 'A new code is on its way',
  'auth.otp.resent.body': 'Enter the newest code. Earlier codes no longer work.',

  /* **AC-535** — the entered digits are preserved. */
  'auth.error.verify.title': "Couldn't check that code",
  'auth.error.verify.body': 'Nothing was counted against your attempts. Try again.',
  /* **AC-536** — the existing code remains valid. */
  'auth.error.resend.title': "Couldn't send a new code",
  'auth.error.resend.body': 'Your current code still works. Try again.',

  /* Whole-card replacement (§15 overrule 6). Reached by browser-back-then-
     forward (**AC-582**), by a code issued in another browser context
     (**AC-531**), by a replay of a consumed code (**AC-530**), and by opening
     `/signin/verify` directly. */
  'auth.otp.missing.title': 'That verification is no longer open',
  'auth.otp.missing.body': 'Sign in again to get a new code.',
  /* **AC-583** — it says so rather than hanging. */
  'auth.otp.elsewhere.title': 'This sign-in finished in another tab',
  'auth.otp.elsewhere.body':
    'The console is already open there. Sign in again here if you need a second session.',

  /* ─────────────────── 3 · signin-enroll (§5) ─────────────────────────── */
  'auth.enroll.title': 'Set up your verification code',
  'auth.enroll.subtitle': "Every sign-in needs a code. This can't be turned off.",
  'auth.enroll.sms': 'Text message',
  'auth.enroll.smsHelp': 'A 6-digit code by SMS, each time you sign in.',
  'auth.enroll.totp': 'Authenticator app',
  'auth.enroll.totpHelp': 'A code from an app on your phone. Works without signal.',
  'auth.enroll.phone': 'Mobile number',
  /* A placeholder as a FORMAT EXAMPLE, which is the one thing §4.2 permits one
     for. It is not the label and never becomes one (§7.4.5). */
  'auth.enroll.phonePlaceholder': '+966 5X XXX XXXX',
  /* The suggestion is a BUTTON that fills the field, so accepting it is an act
     (spec §4.4: "never as a default the operator can accept without reading").
     Unmasked, because the whole point is that they read it. */
  'auth.enroll.usePhone': 'Use {phone} from your profile',
  'auth.enroll.secret': "Can't scan it? Enter this key in the app",
  'auth.enroll.send': 'Send code',
  'auth.enroll.continue': 'Continue',
  'auth.enroll.phoneInvalid': 'Enter a mobile number with its country code.',
  /* Step B (§5.2) — the number is UNMASKED here, because the operator is
     confirming the number they just typed and masking would defeat it. */
  'auth.enroll.confirmSms': 'Confirm your number',
  'auth.enroll.confirmTotp': 'Confirm your app',
  'auth.enroll.sentTo': 'Sent to {phone}',
  'auth.enroll.otherMethod': 'Use a different method',
  /* **AC-516** — the operator is still not signed in. */
  'auth.error.enroll.title': "Couldn't set up your verification code",
  'auth.error.enroll.body': 'Nothing was saved. Try again.',

  /* ─────────────────── 4 · forgot-password (§6) ───────────────────────── */
  'auth.forgot.title': 'Forgot your password?',
  'auth.forgot.subtitle': 'Enter the email address you sign in with.',
  'auth.forgot.submit': 'Send reset link',
  /* Verb-first (`copy.md` rule 2). `Back to sign in` is not, which is why it
     is not used. */
  'auth.forgot.return': 'Return to sign in',
  /* **AC-549** — visibly different from the confirmation, which is the whole
     point of the criterion. */
  'auth.error.forgot.title': "Couldn't send a reset link",
  'auth.error.forgot.body': 'Nothing was sent. Try again.',

  /* §7.2 — `info`, NOT `success`, and that is the decision. Success asserts
     that something happened, which is the exact claim this banner exists to
     refuse. **AC-539** byte-identical for known and unknown; **AC-541** the
     copy contains none of "found", "exists", "no account", and no holder's
     name; **AC-540** the expiry is in words, in the `/signin` card's banner
     slot, not a toast. The title addresses the operator (who has an inbox)
     rather than the address (which may not have an account). */
  'auth.reset.requested.title': 'Check your inbox',
  'auth.reset.requested.body':
    'If that address has an Eyvar account, a reset link is on its way. It expires in 60 minutes.',

  /* ─────────────────── 5 · reset-password (§7.3) ──────────────────────── */
  'auth.reset.title': 'Choose a new password',
  'auth.reset.forAccount': 'For {email}',
  'auth.reset.newPassword': 'New password',
  'auth.reset.confirmPassword': 'Confirm new password',
  'auth.reset.submit': 'Reset password',
  /* **AC-545** — present at mount, before the operator types. The second
     clause is doing real work: it is what stops an operator producing
     `Password1!` and believing they complied. */
  'auth.reset.policy': 'At least 12 characters. Longer is better than more complicated.',
  'auth.reset.strength.short': 'At least 12 characters',
  'auth.reset.strength.weak': 'Password strength: weak',
  'auth.reset.strength.strong': 'Password strength: strong',
  'auth.reset.tooShort': 'Use at least 12 characters.',
  'auth.reset.mismatch': 'Enter the same password in both fields.',
  'auth.reset.breached': 'This password has appeared in a known breach. Choose a different one.',
  /* One state for all four invalid-token causes — unknown, used, superseded,
     expired. Distinguishing them tells a link-holder which kind of link they
     are holding (**AC-543**, **AC-544**). */
  'auth.reset.tokenInvalid.title': 'This link is no longer valid',
  'auth.reset.tokenInvalid.body':
    'Reset links work once and expire after 60 minutes. Request a new one.',
  'auth.reset.tokenInvalid.action': 'Request a new link',
  /* **AC-550** — explicitly NOT the invalid-link state. */
  'auth.error.tokenCheck.title': "Couldn't check that link",
  'auth.error.tokenCheck.body': 'Nothing has changed. Try again.',
  /* **AC-551** — both fields keep their values. */
  'auth.error.reset.title': "Couldn't reset your password",
  'auth.error.reset.body': 'Nothing was changed. Try again.',

  /* §7.5 — R10's paired case: the action completed AND left a next step. The
     `=0` branch names no count, deliberately. */
  'auth.reset.done.title': 'Your password was reset',
  /* The exact-integer selector is `#0`, not ICU's `#=0` — `pluralFormKey`
     spells an exact form `key#<integer>`, and exact beats category. Same
     semantics, one spelling. */
  'auth.reset.done#0':
    'Every remembered device will ask for a code again. Sign in with your new password.',
  'auth.reset.done#one':
    '{count} other session ended, and every remembered device will ask for a code again. Sign in with your new password.',
  'auth.reset.done#other':
    '{count} other sessions ended, and every remembered device will ask for a code again. Sign in with your new password.',

  /* ─────────────────── 6 · set-password (§7.4) ────────────────────────── */
  'auth.activate.title': 'Set your password',
  /* `{role}` is itself a key (`role.opsManager`), never an English literal
     interpolated into Arabic. */
  'auth.activate.subtitle': "You've been invited to Eyvar as {role}.",
  'auth.activate.submit': 'Set password',
  'auth.activate.tokenInvalid.title': 'This invite is no longer valid',
  'auth.activate.tokenInvalid.body':
    'Invites expire after 7 days. Ask the person who invited you to send a new one.',
  /* **AC-581** — the stated next action is the exit; the button stops it being
     a cul-de-sac. */
  'auth.activate.tokenInvalid.action': 'Go to sign in',
  /* **AC-556** — status is still `Invited`. */
  'auth.error.activate.title': "Couldn't set your password",
  'auth.error.activate.body': 'Your account is unchanged. Try again.',

  /* ─────────────────── the re-authentication modal (§8.2) ─────────────── */
  'auth.reauth.title': 'Your session expired',
  'auth.reauth.body': 'Your unsaved changes are still here. Sign in to keep working.',
  /* NOT a field, and that absence is how §7.6 is enforced (**AC-567**). */
  'auth.reauth.signedInAs': 'Signed in as {email}',
  'auth.reauth.submit': 'Sign in',
  /* This one MAY name the password, unlike §3.2's generic rejection: the
     identity is fixed and displayed, so there is no enumeration to protect. */
  'auth.reauth.wrongPassword.title': 'That password is wrong',
  'auth.reauth.wrongPassword.body': 'Try again, or sign out and start over.',
  'auth.reauth.blocked.title': 'This account can no longer sign in',
  'auth.reauth.blocked.body': 'Sign out, then ask an owner in Admin › Team & Access.',
  /* **AC-574** — the app stays mounted and the dirty form is intact. */
  'auth.error.reauth.title': "Couldn't sign you in",
  'auth.error.reauth.body': 'Your changes are still here. Try again.',
  /* **AC-573** — the SAME modal swaps its body in place. No second modal, no
     route change, no remount, and the dirty form is untouched throughout. */
  'auth.reauth.code.title': 'Enter your verification code',
  /* §8.3 — `Sign out` while dirty swaps the modal's own body into the
     confirmation. One modal, two bodies, no nesting, because §5.5 forbids a
     modal inside another surface. The primary is BLUE, not red: §5.3 restricts
     red, it does not mandate it. */
  'auth.reauth.signOutConfirm.title': 'Sign out and lose your changes?',
  'auth.reauth.signOutConfirm.body':
    'Your unsaved {entity} will be discarded. Anything you saved earlier is unaffected.',
  'auth.reauth.signOutConfirm.confirm': 'Discard and sign out',
  'common.cancel': 'Cancel',

  /* ─────────────────── the session banners (§8.5, §8.6) ───────────────── */
  /* One string, one id, referenced by `aria-describedby` from every frozen
     control (**AC-563**). A `title` attribute is hover-only and fails outright. */
  'session.expiredReason': 'Your session expired. Sign in again to save your changes.',
  'session.idleWarning#one': 'Your session ends in {minutes} minute.',
  'session.idleWarning#other': 'Your session ends in {minutes} minutes.',
  /* The third render. Three renders, three polite announcements — per minute,
     never per second (§8.6). */
  'session.idleWarningSoon': 'Your session ends in less than a minute.',
  'session.staySignedIn': 'Stay signed in',
  /* §8.5 — one page-level `critical` banner (R5a use #2). The clause "copy
     anything you need before discarding" is the whole point of the state:
     without it the operator has a screen full of work and no stated way to
     keep any of it. */
  'session.writeRevoked.title': 'You can no longer save this change',
  'session.writeRevoked.body':
    'The "{permission}" permission was removed while you were editing. Your changes are still here — copy anything you need before discarding.',
  /* §8.4 — the shell's existing `navigate-away-dirty` modal, with one word
     changed. Cancelling leaves the operator signed in and the form dirty. */
  'session.signOutDirty.confirm': 'Discard and sign out',

  /* ─────────────────────── devices (§9) ───────────────────────────────── */
  'auth.devices.title': 'Active sessions',
  'auth.devices.thisDevice': 'This device',
  'auth.devices.activeNow': 'Active now',
  'auth.devices.trustedUntil': 'Trusted until {date}',
  'auth.devices.notTrusted': 'Not trusted',
  'auth.devices.stopTrusting': 'Stop trusting',
  'auth.devices.signOut': 'Sign out',
  'auth.devices.signOutAll': 'Sign out everywhere',
  /* **D-A9** — replaces the native `confirm()` at `:3059`. The confirmation
     expands IN PLACE; §5.5 forbids a modal nested inside a no-scrim drawer. */
  'auth.devices.signOutConfirm': 'Sign out of {device}?',
  'auth.devices.signOutConfirmBody':
    'That device will need your password and a code to sign in again. This device is unaffected.',
  /* **AC-576** — the count is stated BEFORE it acts. */
  'auth.devices.signOutAllConfirm#one':
    '{count} other session will end. Every remembered device will ask for a code again.',
  'auth.devices.signOutAllConfirm#other':
    '{count} other sessions will end. Every remembered device will ask for a code again.',
  /* **AC-653** — `no-match` kind: one grey sentence, no illustration (R8). */
  'auth.devices.empty': "You're only signed in on this device.",
  /* **AC-652** — card scope, inside this card only. */
  'auth.devices.error': "Couldn't load your sessions. Try again.",
  /* **AC-660**-adjacent: a per-row failure is row-scoped, and every other row
     stays interactive. */
  'auth.devices.rowError': "Couldn't sign out of this device.",

  /* ────────────────────────── role names ──────────────────────────────── */
  /* Role names are KEYS, never English literals interpolated into Arabic
     (§11). The four that exist; D4 adding two is two more rows here. */
  'role.owner': 'Owner',
  'role.opsManager': 'Ops Manager',
  'role.finance': 'Finance',
  'role.support': 'Support',
}

/**
 * `RoleName` → its i18n key.
 *
 * **Role names are keys, never English literals interpolated into Arabic**
 * (§11), which is the whole reason this map exists rather than
 * `role.toLowerCase()` — `Ops Manager` does not fold to `opsManager` by any
 * rule a reader could predict, and a fold that worked for three of four roles
 * would be worse than one that worked for none.
 *
 * It lives beside the strings it names. The onboarding layer re-exports it
 * rather than declaring a second copy: two maps from the same four roles is
 * how one surface starts calling a role something the other does not.
 *
 * **D4 adding two roles is two entries here and two strings above.**
 */
export const ROLE_KEYS: Readonly<Record<string, string>> = {
  Owner: 'role.owner',
  'Ops Manager': 'role.opsManager',
  Finance: 'role.finance',
  Support: 'role.support',
}


