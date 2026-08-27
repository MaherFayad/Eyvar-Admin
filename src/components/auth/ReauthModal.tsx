/**
 * The re-authentication modal — design §8.2, §8.3. **R4-3: a modal, not a
 * fifth shell layer.**
 *
 * ```
 *   ░░░░░░░░░░░ scrim ░░░░░░░░░░░░░░░░░░░░░
 *   ░ ┌─ 440 ─────────────────────────┐  ░
 *   ░ │ Your session expired          │  ░  h2 17/600
 *   ░ │ Your unsaved changes are still│  ░  13/20 --ev-text-2
 *   ░ │ here. Sign in to keep working.│  ░
 *   ░ │ [ BANNER SLOT ]               │  ░
 *   ░ │ Signed in as fahad@eyvar.com  │  ░  NOT a field
 *   ░ │ Password  [ ……………………… ◉ ]     │  ░
 *   ░ │        [ Sign out ] [ Sign in ]  ░  footer
 *   ░ └───────────────────────────────┘  ░
 *   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
 *       ▲ behind: the console, mounted, FROZEN, SaveBar up
 * ```
 *
 * ## Why a modal and not a layer
 *
 * §7.3.3's focus law: **the scrim decides the trap.** A no-scrim layer does not
 * trap, so `Tab` would walk the operator out of the only working control on
 * screen into a field of frozen ones, with nothing to tell them they had left.
 * This surface has a scrim, so it owns the keyboard — and it has **no route and
 * no URL param**, because a re-auth surface with an address is one an operator
 * can navigate past.
 *
 * ## Four behaviours that are not defaults
 *
 * | | |
 * |---|---|
 * | `Escape` | **does not close.** `onEscapeKeyDown` is prevented; Radix closes on it otherwise |
 * | Outside click | does not close — `alert-dialog`'s own behaviour, and the reason it is `alert-dialog` and not `dialog` |
 * | Close `✕` | **absent.** There is nothing to dismiss to |
 * | `onCloseAutoFocus` | **prevented.** See below — this one is a race, not a preference |
 *
 * ### The `onCloseAutoFocus` race
 *
 * `DECISIONS.md` CARRIED item 1, and it is worth the paragraph:
 *
 * > Radix restores focus to whatever was focused when the dialog opened — by
 * > then `<body>`, because the freeze disabled the real element **first** — and
 * > **two restores in one commit race.** `useFocusCapture` owns the correct
 * > restore; Radix's must be told to stand down.
 *
 * `useFocusCapture` captures in the **render** phase, before React commits the
 * freeze and before §8.1 rule 5 closes every open shell layer — each of which
 * would otherwise restore focus to *its own* opener and be the last writer. So
 * the two mechanisms are not interchangeable and the order matters: capture
 * early, restore late, and switch Radix's off in between.
 *
 * ## There is no identifier field, and that is how §7.6 is enforced
 *
 * **AC-567 (a)** enumerates every focusable element inside this dialog and
 * fails on anything not on its list: the account line as **static text**, one
 * password field, its reveal, `Sign out`, `Sign in`. An `<input>` of any type
 * other than `password` fails outright. A refusal is a check that can be
 * forgotten; an absent field cannot be. `AuthCredentialForm`'s `mode="reauth"`
 * is where that absence lives.
 *
 * ## `Sign out` while dirty swaps this modal's own body
 *
 * §5.5 forbids a modal nested inside another surface, so §8.3's confirmation is
 * **the same modal with a different body**. One modal, two bodies, no nesting.
 * Its primary is **blue, not red**: §5.3 restricts red, it does not mandate it,
 * and the shell already took this position for `navigate-away-dirty`.
 *
 * ## Three bodies, one modal, and none of them is a second surface
 *
 * | Body | When | What changes |
 * |---|---|---|
 * | `password` | always first | the §8.1 form at `mode="reauth"` |
 * | `code` | **AC-573**, untrusted device | the §4 field, centred, `dir="ltr"`, plus a full-width `Resend code` above the footer |
 * | `signout-confirm` | §8.3, `Sign out` while dirty | the confirmation, blue primary |
 *
 * **The dirty form behind is untouched throughout all three.** No second modal,
 * no route change, no remount — §5.5 forbids a modal nested inside another
 * surface, so a body swap is the only shape available and it is also the right
 * one: the operator never loses the scrim, never loses the trap, and never sees
 * the console flash between steps.
 *
 * The code step **reuses `verifyCode` and `resendCode`**, not a second pair of
 * operations. A separate pair for the same six digits would be a second attempt
 * counter, a second cooldown schedule and a second place for §4.3's ladder to
 * drift. **AC-567 (c) survives it**: the challenge is opened against the
 * identity the *server* recorded as signed in — an *expired* trust counts as
 * untrusted, so `USR-3`'s seeded device reaches this body — and
 * `ReauthenticateInput` has no identity to send, so the session that comes back
 * is the one that expired.
 */

import { useCallback, useRef, useState } from 'react'
import { reauthenticate, resendCode, verifyCode } from '@/data/clients'
import type { SecondFactor } from '@/data/types/auth'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import type { Translator } from '@/lib'
import { useCooldown } from '@/hooks'
import { AuthBanner } from './AuthBanner'
import { AuthCredentialForm } from './AuthCredentialForm'
import { IsolatedValue } from './IsolatedValue'
import { OtpField } from './OtpField'
import {
  OTP_LENGTH,
  conditionForVerifyFailure,
  minutesUntil,
  resolveCondition,
  type AuthCondition,
} from './authContract'

export interface ReauthModalProps {
  open: boolean
  t: Translator
  /** The expired session's own address, rendered as text and bound to its `userId`. */
  email: string
  /** **AC-560** — the reason is distinguished here too, not only on `/signin`. */
  reason: 'idle' | 'absolute'
  /** The SaveBar's dirty noun (`Unsaved plan` → `plan`), so §8.3 names the same object. */
  dirtyEntity: string | null
  online: boolean
  /** Success: the freeze lifts, focus restores, scroll is unchanged, SaveBar still `dirty`. */
  onResumed: () => void
  /** `Discard and sign out` — the console is torn down, so focus is released rather than restored. */
  onSignOut: () => void
}

type Body = 'password' | 'code' | 'signout-confirm'

/** The live challenge, once an untrusted device has asked for one (**AC-573**). */
interface ModalChallenge {
  challengeId: string
  secondFactor: SecondFactor
  resendAvailableAt: string
}

export function ReauthModal({
  open,
  t,
  email,
  reason,
  dirtyEntity,
  online,
  onResumed,
  onSignOut,
}: ReauthModalProps) {
  const [body, setBody] = useState<Body>('password')
  const [password, setPassword] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [condition, setCondition] = useState<AuthCondition | null>(null)
  const [challenge, setChallenge] = useState<ModalChallenge | null>(null)
  const [code, setCode] = useState('')
  const [needsNewCode, setNeedsNewCode] = useState(false)
  const verifyRef = useRef<HTMLButtonElement>(null)

  /* Deadline-driven, holds no timer, and announces exactly once when it
     re-enables — the same hook and the same rules as `/signin/verify`, because
     it is the same cooldown on the same challenge. */
  const cooldown = useCooldown({
    deadline: needsNewCode ? null : (challenge?.resendAvailableAt ?? null),
    readyMessage: t('auth.otp.resendReady'),
    enabled: body === 'code' && !needsNewCode,
  })

  const surfaceCondition = resolveCondition([
    online ? null : ({ kind: 'offline', surface: 'reauth' } as const),
    condition,
  ])

  const submit = useCallback(async () => {
    setCondition(null)
    setBusy(true)
    try {
      /* **AC-567 (b)** — the payload is `{ password }` and nothing else. There
         is no identity in it because there is no control that could supply
         one, and the type has no field for one either. */
      const result = await reauthenticate({ password })
      if (result.kind === 'resumed') {
        setPassword('')
        onResumed()
        return
      }
      setPassword('')
      /* **AC-573** — an untrusted device asks for the password *and* a code.
         The **same modal swaps its body in place**: no second modal, no route
         change, no remount, and the dirty form is untouched throughout. */
      if (result.kind === 'challenge') {
        setChallenge({
          challengeId: result.challengeId,
          secondFactor: result.secondFactor,
          resendAvailableAt: result.resendAvailableAt,
        })
        setBody('code')
        return
      }
      setCondition(
        result.reason === 'rejected'
          ? { kind: 'password-wrong' }
          : { kind: 'account-cannot-sign-in' },
      )
    } catch {
      /* **AC-574** — the app stays mounted and the dirty form is intact. */
      setCondition({ kind: 'transport-error', operation: 'auth.reauthenticate' })
    } finally {
      setBusy(false)
    }
  }, [password, onResumed])

  const submitCode = useCallback(async () => {
    if (challenge === null || code.length !== OTP_LENGTH) return
    setCondition(null)
    setBusy(true)
    try {
      const result = await verifyCode({ challengeId: challenge.challengeId, code })
      if (result.kind === 'signed-in') {
        setCode('')
        onResumed()
        return
      }
      const next = conditionForVerifyFailure(
        result.reason,
        result.attemptsRemaining,
        minutesUntil(result.lockedUntil),
      )
      setCondition(next)
      setNeedsNewCode(next.kind === 'code-invalidated' || next.kind === 'code-expired')
      if (next.kind === 'code-wrong' || next.kind === 'code-invalidated') setCode('')
    } catch {
      /* **AC-535**'s rule, in this container: the entered digits are preserved
         and the copy says nothing was counted against the attempts. */
      setCondition({ kind: 'transport-error', operation: 'auth.verifyCode' })
    } finally {
      setBusy(false)
    }
  }, [challenge, code, onResumed])

  const resend = useCallback(async () => {
    if (challenge === null) return
    setCondition(null)
    setBusy(true)
    try {
      const result = await resendCode(challenge.challengeId)
      if (result.kind === 'sent') {
        setChallenge({
          challengeId: result.challengeId,
          secondFactor: challenge.secondFactor,
          resendAvailableAt: result.resendAvailableAt,
        })
        setNeedsNewCode(false)
        setCode('')
        /* The supersession trap closed **before** it springs — the same
           sentence, for the same reason, as `/signin/verify`. */
        setCondition({ kind: 'code-resent' })
        return
      }
      if (result.kind === 'cooling-down') {
        setChallenge({ ...challenge, resendAvailableAt: result.resendAvailableAt })
        setNeedsNewCode(false)
        return
      }
      if (result.kind === 'exhausted') {
        setCondition({ kind: 'resend-exhausted' })
        return
      }
      setCondition({ kind: 'challenge-locked', minutes: minutesUntil(result.lockedUntil) })
    } catch {
      setCondition({ kind: 'transport-error', operation: 'auth.resendCode' })
    } finally {
      setBusy(false)
    }
  }, [challenge])

  const blocked = condition?.kind === 'account-cannot-sign-in'

  return (
    <AlertDialog open={open}>
      <AlertDialogContent
        /* `Escape` **does not close** (§8.2). There is nothing behind this
           surface an operator can usefully reach, and a dismissable freeze is
           a freeze that can be walked past. */
        onEscapeKeyDown={(event) => event.preventDefault()}
        /* CARRIED item 1 — see the file header. `useFocusCapture` owns the
           restore; Radix's would target `<body>` and race with it. */
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        {body === 'password' ? (
          <>
            <AlertDialogHeader>
              {/* **AC-560** — idle and absolute are visibly distinct here too. */}
              <AlertDialogTitle>
                {reason === 'absolute'
                  ? t('auth.session.endedAbsolute.title')
                  : t('auth.reauth.title')}
              </AlertDialogTitle>
              <AlertDialogDescription>{t('auth.reauth.body')}</AlertDialogDescription>
            </AlertDialogHeader>

            <AuthBanner
              condition={surfaceCondition}
              t={t}
              onRetry={
                surfaceCondition?.kind === 'transport-error' ? () => void submit() : undefined
              }
            />

            {/* **One `<AuthCredentialForm>`, mounted twice** — this is the
                second mount point, and the whole of design §8.1's reduction.
                One form, one validation path, one copy set, two containers. */}
            <AuthCredentialForm
              mode="reauth"
              t={t}
              email={email}
              password={password}
              onPasswordChange={setPassword}
              revealed={revealed}
              onToggleReveal={() => setRevealed((current) => !current)}
              onSubmit={() => void submit()}
              busy={busy}
              primaryLabel={t('auth.reauth.submit')}
              footer={
                <AlertDialogFooter>
                  {/* §13 — trapped tab order: password → reveal → `Sign out` →
                      `Sign in`. DOM order is that order. */}
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy}
                    onClick={() =>
                      /* §8.3 — while dirty, `Sign out` needs a confirmation,
                         and §5.5 forbids nesting one. So the modal swaps its
                         own body in place. With nothing dirty there is nothing
                         to confirm and it signs out directly. */
                      dirtyEntity === null ? onSignOut() : setBody('signout-confirm')
                    }
                  >
                    {t('auth.signOut')}
                  </Button>
                  <Button
                    type="submit"
                    variant="default"
                    disabled={busy || !online || blocked}
                  >
                    {t('auth.reauth.submit')}
                  </Button>
                </AlertDialogFooter>
              }
            />
          </>
        ) : body === 'code' && challenge !== null ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('auth.reauth.code.title')}</AlertDialogTitle>
              <AlertDialogDescription asChild>
                {/* §8.2's row: `Sent to {hint}` — the masked run, never more
                    than two digits, in an LTR-pinned `<bdi>` (**AC-519**,
                    **AC-675**). */}
                <IsolatedValue
                  t={t}
                  tKey="auth.otp.sentTo"
                  name="hint"
                  value={challenge.secondFactor.hint}
                  ltr="maskedHint"
                />
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AuthBanner
              condition={surfaceCondition}
              t={t}
              onRetry={
                surfaceCondition?.kind === 'transport-error'
                  ? surfaceCondition.operation === 'auth.resendCode'
                    ? () => void resend()
                    : () => void submitCode()
                  : undefined
              }
            />

            <form
              className="flex flex-col gap-3"
              noValidate
              onSubmit={(event) => {
                event.preventDefault()
                void submitCode()
              }}
            >
              {/* One input, centred, `dir="ltr"` — the same field as
                  `/signin/verify`, because it is the same six digits and a
                  second implementation is a second set of paste rules. */}
              <OtpField
                label={t('auth.otp.label')}
                value={code}
                onChange={setCode}
                helper={
                  challenge.secondFactor.method === 'totp'
                    ? t('auth.otp.helper.totp')
                    : t('auth.otp.helper.sms')
                }
                readOnly={busy || needsNewCode}
                primaryRef={verifyRef}
              />

              {/* §8.2 — `Resend code` as a full-width secondary **above the
                  footer**, so the footer stays the two decisions it was. */}
              {challenge.secondFactor.method === 'sms' && (
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  className="w-full"
                  onClick={() => void resend()}
                  disabled={!cooldown.isReady || busy || !online}
                  /* The ticking number sits inside `aria-live="off"`; the one
                     announcement is `useCooldown`'s, on the re-enable edge. */
                  {...cooldown.tickerProps}
                >
                  {needsNewCode
                    ? t('auth.otp.resendNew')
                    : cooldown.isReady
                      ? t('auth.otp.resend')
                      : t.plural('auth.otp.resendIn', { seconds: cooldown.secondsRemaining })}
                </Button>
              )}

              <AlertDialogFooter>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() =>
                    dirtyEntity === null ? onSignOut() : setBody('signout-confirm')
                  }
                >
                  {t('auth.signOut')}
                </Button>
                <Button
                  ref={verifyRef}
                  type="submit"
                  variant="default"
                  disabled={busy || !online || code.length !== OTP_LENGTH || needsNewCode}
                >
                  {t('auth.otp.submit')}
                </Button>
              </AlertDialogFooter>
            </form>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('auth.reauth.signOutConfirm.title')}</AlertDialogTitle>
              <AlertDialogDescription>
                {/* `{entity}` comes from the SaveBar's own dirty label
                    (`Unsaved plan` → `plan`), so the two surfaces name the same
                    object (`copy.md` rule 5). The body says what does NOT
                    change (`copy.md` rule 9). */}
                {t('auth.reauth.signOutConfirm.body', { entity: dirtyEntity ?? '' })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={(event) => {
                  /* Returns to whichever body raised the confirmation, with the
                     credential cleared. Radix would close the whole dialog; the
                     freeze is still on, so it must not. */
                  event.preventDefault()
                  setPassword('')
                  setCode('')
                  setBody(challenge === null ? 'password' : 'code')
                }}
              >
                {t('common.cancel')}
              </AlertDialogCancel>
              {/* **Blue, not red.** §5.3 restricts red, it does not mandate it,
                  and the shell already took this position for
                  `navigate-away-dirty` (00-shell §11.6 row 10). */}
              <AlertDialogAction variant="default" onClick={onSignOut}>
                {t('auth.reauth.signOutConfirm.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
