/**
 * Screen 2 — `signin-verify` · `/signin/verify`. Design §4.
 *
 * > *"This is the screen an operator meets when they are already annoyed.
 * > Everything below is decided against that."*
 *
 * ```
 * ▣ Eyvar
 * Check your messages
 * Sent to ••••••67                     ← <bdi dir="ltr">, two digits (AC-519)
 * [ BANNER SLOT ]
 * Verification code
 * [        4 2 8 9 1 6        ]        ← ONE input, centred, dir="ltr"
 * 6 digits. Codes expire 10 minutes after they're sent.
 * [           Verify           ]
 * [      Resend code in 27s    ]        ← full-width SECONDARY, not a link
 * Use a different account
 * ```
 *
 * ## The three things most likely to be got wrong here
 *
 * **1. The resend cooldown ticks and the lockout does not.** They look
 * identical on screen and are opposites underneath. The cooldown is an
 * *admitted courtesy* over a deadline the server enforces anyway, so a browser
 * two seconds out costs nothing (`useCooldown`). The lockout **is** the fact,
 * and a browser counting it to zero invites the operator to try again into a
 * refusal — so it is re-read per attempt and rendered once (§3.2, §4.4).
 *
 * **2. `aria-live="off"` on the ticking number.** A per-second live region is
 * unusable with a screen reader. Exactly **one** polite announcement fires,
 * when the control re-enables: `Resend code is available.` `useCooldown` owns
 * both halves; the screen supplies the sentence, already translated.
 *
 * **3. The supersession trap is closed before it springs.** The instant
 * `Resend` succeeds the banner reads *"A new code is on its way / Enter the
 * newest code. Earlier codes no longer work."* Spec §5.3's real failure is an
 * operator who pressed Resend and then typed the **first** SMS because it
 * arrived first and is higher up the list. Telling them afterwards is a
 * recovery; telling them at the moment they press it is a prevention, and it
 * costs one sentence.
 *
 * Rules applied
 *   §4.5        `challenge-missing` **replaces the whole card** — reached by
 *               opening this route directly, by a code issued in another
 *               browser context (**AC-531**), and by a replay of a consumed
 *               code (**AC-530**).
 *   AC-535      a transport failure on `verifyCode` **preserves the entered
 *               digits** and says nothing was counted.
 *   AC-536      a transport failure on `resendCode` says the current code still
 *               works.
 *   §4.3        five distinct strings, three tones, and the tone tells the
 *               operator whether the attempt counted.
 *   §4.4        `code-expired` and `code-invalidated` enable the resend
 *               **immediately, ignoring the cooldown**, and relabel it
 *               `Send a new code`.
 *   §5.2/D-OTP-4 **no auto-submit, ever.**
 */

import { useCallback, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { resendCode, verifyCode } from '@/data/clients'
import { AuthBanner } from '@/components/auth/AuthBanner'
import { AUTH_BANNER_SLOT_ID, AuthCard, AuthCardReplacement } from '@/components/auth/AuthCard'
import { AuthPlainButton, AuthPrimary } from '@/components/auth/AuthFields'
import { IsolatedValue } from '@/components/auth/IsolatedValue'
import { OtpField } from '@/components/auth/OtpField'
import {
  OTP_LENGTH,
  conditionForVerifyFailure,
  minutesUntil,
  resolveCondition,
  type AuthCondition,
} from '@/components/auth/authContract'
import { Button } from '@/components/ui/button'
import { useCooldown, useOnline } from '@/hooks'
import { useShell } from '@/shell/ShellContext'
import { asChallengeHandoff } from './flowState'
import { legalLinks } from './legal'

export function VerifyScreen() {
  const shell = useShell()
  const t = shell.language.t
  const navigate = useNavigate()
  const location = useLocation()
  const online = useOnline()

  const handoff = asChallengeHandoff(location.state)

  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [resending, setResending] = useState(false)
  const [condition, setCondition] = useState<AuthCondition | null>(null)
  const [missing, setMissing] = useState(false)
  /**
   * §4.3 row 3 and §4.4 row 2 — after a cancelled or an expired code the resend
   * is **enabled immediately, ignoring the cooldown**, and its label becomes
   * `Send a new code`. Held as its own flag rather than derived from
   * `condition`, because the operator can dismiss nothing here and the banner
   * is replaced by the next outcome while the control must stay open.
   */
  const [needsNewCode, setNeedsNewCode] = useState(false)
  /** The live challenge. A resend replaces it, which is what supersedes the old code. */
  const [challengeId, setChallengeId] = useState(handoff?.challengeId ?? null)
  const [resendDeadline, setResendDeadline] = useState(handoff?.resendAvailableAt ?? null)
  /**
   * §4.4 — *"when 2 or fewer remain, a 12 px `--ev-text-2` line under the
   * button"*. `null` until a resend has been spent, because the budget is
   * learned by spending from it and nothing is shown until it is worth showing.
   */
  const [resendsLeft, setResendsLeft] = useState<number | null>(null)
  /**
   * **AC-533 / §4.4's `resend-exhausted`.** The resend control is not disabled,
   * it is **replaced** by a full-width primary `Go to sign in` — there is
   * nothing left on this screen to press, and a disabled button that will never
   * re-enable is a control that lies about its own future.
   */
  const [exhausted, setExhausted] = useState(false)
  /**
   * §4.3 row 3 — the field goes **`readOnly` until a new code lands**. Never
   * `disabled`: the digits the operator typed stay readable and selectable,
   * which is the same rule the freeze runs on.
   */
  const fieldReadOnly = busy || needsNewCode

  const primaryRef = useRef<HTMLButtonElement>(null)

  /* §4.4 — deadline-driven, holds no timer, and announces exactly once when it
     re-enables. `enabled: false` once a new code is owed, because the control
     is already usable and a countdown beside an enabled button is noise. */
  const cooldown = useCooldown({
    deadline: needsNewCode ? null : resendDeadline,
    readyMessage: t('auth.otp.resendReady'),
    enabled: !needsNewCode,
  })

  const surfaceCondition = resolveCondition([
    online ? null : ({ kind: 'offline', surface: 'verify' } as const),
    condition,
  ])

  const method = handoff?.secondFactor.method ?? 'sms'

  const submit = useCallback(async () => {
    if (challengeId === null || code.length !== OTP_LENGTH) return
    setBusy(true)
    setCondition(null)
    try {
      const result = await verifyCode({ challengeId, code })
      if (result.kind === 'signed-in') {
        shell.session_lifecycle.signedIn()
        /* **AC-501** — back to the route they originally asked for, not to
           `session.landingRoute`. `replace`, so browser Back does not return
           them to a challenge that is now consumed. */
        navigate(handoff?.from ?? result.session.landingRoute, { replace: true })
        return
      }
      /* §4.5 — `missing` replaces the whole card rather than bannering it.
         A banner above an absent form is nonsense. */
      if (result.reason === 'missing') {
        setMissing(true)
        return
      }
      if (result.reason === 'locked') {
        /* §4.3 — on the fifth wrong attempt the operator is **returned to
           `/signin`**, whose card then shows `challenge-locked`. Nothing here
           is a permanent lock (**AC-527**, **AC-528**). */
        navigate('/signin', {
          replace: true,
          state: {
            condition: {
              kind: 'challenge-locked',
              minutes: minutesUntil(result.lockedUntil),
            },
            from: handoff?.from,
          },
        })
        return
      }
      const next = conditionForVerifyFailure(
        result.reason,
        result.attemptsRemaining,
        minutesUntil(result.lockedUntil),
      )
      setCondition(next)
      /* §4.3 / §4.4 — the two states that owe the operator a new code. */
      setNeedsNewCode(next.kind === 'code-invalidated' || next.kind === 'code-expired')
      /* Cleared and focused on every counting outcome; the non-counting ones
         leave the digits alone, because the operator did not get them wrong. */
      if (next.kind === 'code-wrong' || next.kind === 'code-invalidated') setCode('')
    } catch {
      /* **AC-535** — the entered digits are **preserved** and the copy says
         nothing was counted against the attempts. */
      setCondition({ kind: 'transport-error', operation: 'auth.verifyCode' })
    } finally {
      setBusy(false)
    }
  }, [challengeId, code, navigate, handoff?.from, shell.session_lifecycle])

  const resend = useCallback(async () => {
    if (challengeId === null) return
    setResending(true)
    setCondition(null)
    try {
      const result = await resendCode(challengeId)
      if (result.kind === 'sent') {
        setChallengeId(result.challengeId)
        setResendDeadline(result.resendAvailableAt)
        setResendsLeft(result.resendsRemaining)
        setNeedsNewCode(false)
        setCode('')
        /* The prevention, not the recovery — see the file header. */
        setCondition({ kind: 'code-resent' })
        return
      }
      if (result.kind === 'cooling-down') {
        /* The button should not have been pressable. The honest response is to
           re-arm it from the deadline the server returned rather than to raise
           an error about a press the UI allowed. */
        setResendDeadline(result.resendAvailableAt)
        setNeedsNewCode(false)
        return
      }
      /**
       * **AC-533 / §4.4** — five codes is the whole budget for one sign-in.
       *
       * The state renders **on this card**, not by bouncing the operator to
       * `/signin`: §4.5 lists `resend-exhausted` among the verify card's own
       * states and §2.3 ranks it third in *this* card's banner precedence,
       * which only means anything if it renders here. The design's reason is
       * better than the criterion's shortcut — the operator is told *why*
       * before they move, and `Go to sign in` is the move. Bouncing them
       * silently is the same fact delivered as a surprise.
       *
       * **AC-533's own wording still holds**: they are returned to `/signin`
       * and told to start again. One press later, and having read it.
       */
      if (result.kind === 'exhausted') {
        setExhausted(true)
        setCondition({ kind: 'resend-exhausted' })
        return
      }
      if (result.reason === 'missing') {
        setMissing(true)
        return
      }
      navigate('/signin', {
        replace: true,
        state: {
          condition: { kind: 'challenge-locked', minutes: minutesUntil(result.lockedUntil) },
          from: handoff?.from,
        },
      })
    } catch {
      /* **AC-536** — the existing code remains valid, and the copy says so. */
      setCondition({ kind: 'transport-error', operation: 'auth.resendCode' })
    } finally {
      setResending(false)
    }
  }, [challengeId, navigate, handoff?.from])

  /**
   * §5.2 — **step B is this card with three strings changed.** The h1 becomes
   * `Confirm your number` / `Confirm your app`, and the subtitle shows the
   * number the operator just typed **unmasked**, because they are confirming
   * that number and masking it would defeat the confirmation. Everything else
   * — the field, the paste rule, every §4.3 attempt rule — is unchanged, which
   * is the whole reason enrolment's step B is this route rather than a second
   * implementation of the same field.
   */
  const confirming = handoff?.origin === 'enroll'
  const destination = handoff?.destination ?? null

  const subtitle = useMemo(() => {
    if (confirming && destination !== null) {
      return (
        <IsolatedValue
          t={t}
          tKey="auth.enroll.sentTo"
          name="phone"
          value={destination}
          ltr="phone"
          as="span"
        />
      )
    }
    if (method === 'totp') return t('auth.otp.fromApp')
    return (
      <IsolatedValue
        t={t}
        tKey="auth.otp.sentTo"
        name="hint"
        value={handoff?.secondFactor.hint ?? ''}
        ltr="maskedHint"
        as="span"
      />
    )
  }, [confirming, destination, method, t, handoff?.secondFactor.hint])

  const title = confirming
    ? method === 'totp'
      ? t('auth.enroll.confirmTotp')
      : t('auth.enroll.confirmSms')
    : method === 'totp'
      ? t('auth.otp.title.totp')
      : t('auth.otp.title.sms')

  /* §4.5 — reached by opening this route directly, by browser-back-then-forward
     onto a consumed challenge (**AC-582**), by a code issued in another browser
     context (**AC-531**), and by a replay (**AC-530**). */
  if (handoff === null || missing) {
    return (
      <AuthCardReplacement
        title={t('auth.otp.missing.title')}
        body={t('auth.otp.missing.body')}
        action={{
          label: t('auth.otp.goToSignIn'),
          onClick: () => navigate('/signin', { replace: true }),
        }}
        legal={legalLinks(t)}
      />
    )
  }

  const codeComplete = code.length === OTP_LENGTH

  return (
    <AuthCard
      title={title}
      subtitle={subtitle}
      legal={legalLinks(t)}
      banner={
        <AuthBanner
          condition={surfaceCondition}
          t={t}
          onRetry={
            surfaceCondition?.kind === 'transport-error'
              ? surfaceCondition.operation === 'auth.resendCode'
                ? () => void resend()
                : () => void submit()
              : undefined
          }
        />
      }
    >
      <form
        className="flex flex-col gap-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <OtpField
          label={t('auth.otp.label')}
          value={code}
          onChange={setCode}
          helper={method === 'totp' ? t('auth.otp.helper.totp') : t('auth.otp.helper.sms')}
          readOnly={fieldReadOnly}
          primaryRef={primaryRef}
        />

        <div className="flex flex-col gap-2">
          <AuthPrimary
            buttonRef={primaryRef}
            label={t('auth.otp.submit')}
            busy={busy}
            /* Six digits or nothing. **No auto-submit** either way — D-OTP-4:
               the cost of not auto-submitting is one keystroke; the cost of
               auto-submitting is a consumed attempt on a screen where the fifth
               costs fifteen minutes. */
            disabled={!codeComplete || !online || needsNewCode || exhausted}
            describedBy={!online ? AUTH_BANNER_SLOT_ID : undefined}
          />

          {/* **AC-533** — the budget is spent, so the resend is **replaced**
              rather than disabled, by the one move left on this card. */}
          {method === 'sms' && exhausted && (
            <AuthPrimary
              type="button"
              label={t('auth.otp.goToSignIn')}
              onClick={() =>
                navigate('/signin', { replace: true, state: { from: handoff.from } })
              }
            />
          )}

          {/* §4.2 — a **full-width secondary button**, not a link. The
              reference puts its alternate action (`Use a recovery code`) in
              exactly this slot and shape; Eyvar has no recovery codes, so the
              slot carries the action Eyvar does have. A full-width button also
              gives the countdown somewhere to live without the label
              reflowing. TOTP renders none: an authenticator app generates its
              own codes and there is nothing to resend. */}
          {method === 'sms' && !exhausted && (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={() => void resend()}
              disabled={!cooldown.isReady || resending || !online}
              /* §4.4 — the ticking number sits inside `aria-live="off"`. The
                 ONE announcement is `useCooldown`'s, on the re-enable edge. */
              {...cooldown.tickerProps}
            >
              {needsNewCode
                ? t('auth.otp.resendNew')
                : cooldown.isReady
                  ? t('auth.otp.resend')
                  : t.plural('auth.otp.resendIn', { seconds: cooldown.secondsRemaining })}
            </Button>
          )}

          {/* §4.4 — *"when 2 or fewer remain"*, and not before. A budget
              announced at five is pressure; announced at two it is a warning
              the operator can act on. One key, one plural rule, no
              concatenation (**AC-670**). */}
          {resendsLeft !== null && resendsLeft <= 2 && resendsLeft > 0 && !exhausted && (
            <p className="text-xs text-muted-foreground">
              {t.plural('auth.otp.resendsLeft', { count: resendsLeft })}
            </p>
          )}
        </div>
      </form>

      <div className="mt-4">
        {/* §4.2 — returns to `/signin` with the identifier **cleared** and the
            challenge abandoned. From `/signin/enroll` the same slot reads
            `Use a different method` and returns to step A (§5.2). */}
        <AuthPlainButton
          size="xs"
          label={
            handoff.origin === 'enroll'
              ? t('auth.enroll.otherMethod')
              : t('auth.otp.otherAccount')
          }
          onClick={() =>
            handoff.origin === 'enroll'
              ? navigate(-1)
              : navigate('/signin', { replace: true, state: { from: handoff.from } })
          }
        />
      </div>
    </AuthCard>
  )
}
