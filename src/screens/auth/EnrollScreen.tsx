/**
 * Screen 3 — `signin-enroll` · `/signin/enroll`. Design §5.
 *
 * **Not skippable, not dismissible, and it is not onboarding** (spec §4.4).
 * Two steps, one card, one route — step B is the §4 code card with three
 * strings changed, so it is `/signin/verify` with an `enroll` origin rather
 * than a second copy of the same field.
 *
 * ```
 * ▣ Eyvar
 * Set up your verification code
 * Every sign-in needs a code. This can't be turned off.
 * [ BANNER SLOT ]
 * ⦿ Text message
 *   A 6-digit code by SMS, each time you sign in.
 *   Mobile number  [ +966 5X XXX XXXX ]
 * ○ Authenticator app
 *   A code from an app on your phone. Works without signal.
 * [           Send code            ]
 * Sign out
 * ```
 *
 * Rules applied
 *   AC-515      **no route out and no skip.** The operator receives no session
 *               until enrolment completes.
 *   AC-581      …but a dead end is forbidden, so the exit must be *visible*:
 *               `Sign out`, a 12 px plain button at the card's foot, is the
 *               smallest honest one.
 *   §4.3        a `radio-group`, not a toggle and not a select: two mutually
 *               exclusive options, both needing a description. **One tab stop**
 *               for the group; `↑ ↓` move within it (§13).
 *   AC-517/664  **no control anywhere in this product disables the second
 *               factor**, for any role, including Owner. The legacy per-user
 *               `twoFA` toggle (`:3023`, `:3047`) and the workspace
 *               `require2FA` setting (`:8028`) are drawn on no screen in this
 *               document. **Their absence is the design.**
 *   AC-516      a transport failure says nothing was saved, and the operator is
 *               still not signed in.
 *
 * ## The TOTP branch
 *
 * `beginTotpEnrolment` now issues the secret and the `otpauth://` URI, so
 * §5.1's **144 px QR canvas and the `font-mono` secret beneath it** are drawn
 * — `TotpPanel`, from a matrix this codebase encodes itself so the square can
 * be `currentColor` rather than a baked hex. **The secret is the server's**:
 * a client that could mint one is a client that decides what the second factor
 * is, which is the one thing §4.2 puts beyond the console's reach.
 *
 * The read is deferred until the option is actually chosen. An operator who
 * picks SMS never causes a TOTP secret to be issued, which matters because
 * issuing one is not free — it is a credential the account now has a record of.
 *
 * ## One thing the design asks for that this screen still does not render
 *
 * **`Use {phone} from your profile`** (§5.1). The suggestion is a button that
 * fills the field, so accepting it is an act rather than a default. Its source
 * is `TeamUser.phone` — and this operator has **no session yet**, by
 * **AC-515**. `useShell().session` holds a *different* operator (the mock's
 * ambient identity), so rendering it would offer one person another person's
 * mobile number to enrol with. That is a worse defect than an absent
 * convenience, so the button is absent. **Needs an `enrolmentToken`-scoped
 * profile read on the seam.**
 */

import { useCallback, useState, type ReactNode } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { beginTotpEnrolment, enrollSecondFactor } from '@/data/clients'
import type { TotpEnrolment } from '@/data/types/auth'
import { AuthBanner } from '@/components/auth/AuthBanner'
import { AUTH_BANNER_SLOT_ID, AuthCard } from '@/components/auth/AuthCard'
import { AuthPlainButton, AuthPrimary, AuthTextField } from '@/components/auth/AuthFields'
import { TotpPanel } from '@/components/auth/TotpPanel'
import { resolveCondition, type AuthCondition } from '@/components/auth/authContract'
import { useAsync, useOnline } from '@/hooks'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useShell } from '@/shell/ShellContext'
import { asEnrolHandoff } from './flowState'
import { legalLinks } from './legal'

/**
 * §5.3 — *"Enter a mobile number with its country code."* Deliberately loose:
 * a leading `+`, then 8–15 digits once separators are dropped, which is E.164's
 * own range. A stricter rule here would reject a real number and teach the
 * operator that the form is wrong about them.
 */
function isPlausiblePhone(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed.startsWith('+')) return false
  const digits = trimmed.slice(1).replace(/[\s-]/g, '')
  return /^\d{8,15}$/.test(digits)
}

export function EnrollScreen() {
  const shell = useShell()
  const t = shell.language.t
  const navigate = useNavigate()
  const location = useLocation()
  const online = useOnline()

  const handoff = asEnrolHandoff(location.state)

  const [method, setMethod] = useState<'sms' | 'totp'>('sms')

  /* §5.1 — read **only once the option is chosen**. `enabled: false` holds
     `useAsync` in `loading` without firing, so picking SMS never causes a TOTP
     secret to be issued against the account. */
  const totp = useAsync<TotpEnrolment>(
    (signal) => beginTotpEnrolment(handoff?.enrolmentToken ?? '', signal),
    { deps: [handoff?.enrolmentToken], enabled: method === 'totp' && handoff !== null },
  )
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [condition, setCondition] = useState<AuthCondition | null>(null)

  const surfaceCondition = resolveCondition([
    online ? null : ({ kind: 'offline', surface: 'signin' } as const),
    condition,
    /* A failed secret read is a failed *enrolment setup*, and it says so with
       the enrolment's own words — `Nothing was saved.` is true, because
       nothing was. It is deliberately not a bare `Try again` on the card: the
       operator's next act is to pick the option again, not to resubmit a form
       they have not filled in. */
    totp.status === 'error'
      ? ({ kind: 'transport-error', operation: 'auth.enrollSecondFactor' } as const)
      : null,
  ])

  const submit = useCallback(async () => {
    if (handoff === null) return
    if (method === 'sms' && !isPlausiblePhone(phone)) {
      /* No request is issued — the same rule as **AC-504**'s email check, for
         the same reason: a round trip to be told a `+` is missing is a round
         trip the operator paid for nothing. */
      setPhoneError(t('auth.enroll.phoneInvalid'))
      return
    }
    setPhoneError(null)
    setCondition(null)
    setBusy(true)
    try {
      const result = await enrollSecondFactor({
        enrolmentToken: handoff.enrolmentToken,
        method,
        /* For SMS the destination is the number the server masks back as the
           code screen's hint. For TOTP there is nothing to send: the secret is
           the server's own and `enrollSecondFactor` confirms it with a code
           rather than being told it. */
        destination: method === 'sms' ? phone : '',
      })
      if (result.kind === 'challenge') {
        /* §5.2 — step B **is** the §4 card. One field implementation, one paste
           rule, one attempt ladder; three strings differ and they are decided
           by `origin` on the far side. The number is carried **unmasked**,
           because the operator is confirming the number they just typed and
           masking it would defeat the confirmation. */
        navigate('/signin/verify', {
          replace: true,
          state: {
            challengeId: result.challengeId,
            secondFactor: result.secondFactor,
            expiresAt: result.expiresAt,
            resendAvailableAt: result.resendAvailableAt,
            origin: 'enroll',
            destination: method === 'sms' ? phone : null,
            from: handoff.from,
          },
        })
        return
      }
      /* `enrolment-required` again, or a rejection: either way nothing was
         saved and the operator is still not signed in (**AC-516**). */
      setCondition({ kind: 'transport-error', operation: 'auth.enrollSecondFactor' })
    } catch {
      setCondition({ kind: 'transport-error', operation: 'auth.enrollSecondFactor' })
    } finally {
      setBusy(false)
    }
  }, [handoff, method, phone, navigate, t])

  /* Arriving here without an enrolment token is arriving without a credential
     step. There is nothing to enrol against, so the operator goes back to the
     card that produces one — not to an error, because nothing has failed. */
  if (handoff === null) {
    return <Navigate to="/signin" replace />
  }

  return (
    <AuthCard
      title={t('auth.enroll.title')}
      subtitle={t('auth.enroll.subtitle')}
      legal={legalLinks(t)}
      banner={
        <AuthBanner
          condition={surfaceCondition}
          t={t}
          onRetry={surfaceCondition?.kind === 'transport-error' ? () => void submit() : undefined}
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
        <RadioGroup
          value={method}
          onValueChange={(next) => setMethod(next === 'totp' ? 'totp' : 'sms')}
          className="gap-4"
          aria-label={t('auth.enroll.title')}
        >
          <MethodOption
            value="sms"
            label={t('auth.enroll.sms')}
            help={t('auth.enroll.smsHelp')}
            selected={method === 'sms'}
          >
            {/* Revealed only when chosen (§5.1's wireframe). `ms-6` indents to
                the option's LABEL, not to its radio box — §10.2's rule for a
                control's dependent content. */}
            <div className="ms-6 mt-2">
              <AuthTextField
                label={t('auth.enroll.phone')}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                placeholder={t('auth.enroll.phonePlaceholder')}
                value={phone}
                onChange={(next) => {
                  setPhone(next)
                  if (phoneError) setPhoneError(null)
                }}
                error={phoneError}
                readOnly={busy}
              />
            </div>
          </MethodOption>

          <MethodOption
            value="totp"
            label={t('auth.enroll.totp')}
            help={t('auth.enroll.totpHelp')}
            selected={method === 'totp'}
          >
            {/* Shaped like what it replaces — a 144 px square and two lines —
                so the card does not resize when the secret lands (**AC-654**'s
                rule, applied to a panel rather than a form). */}
            {totp.status === 'loading' ? (
              <div className="ms-6 mt-3 flex flex-col gap-2" aria-hidden="true">
                <Skeleton className="size-36 rounded-lg" />
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : totp.data !== null ? (
              <TotpPanel enrolment={totp.data} t={t} />
            ) : null}
          </MethodOption>
        </RadioGroup>

        <AuthPrimary
          label={method === 'totp' ? t('auth.enroll.continue') : t('auth.enroll.send')}
          busy={busy}
          disabled={!online}
          describedBy={!online ? AUTH_BANNER_SLOT_ID : undefined}
        />
      </form>

      {/* **AC-515** says there is no route out; **AC-581** says no state may be
          a dead end. Both are true at once only if the exit is a real, visible,
          keyboard-reachable control that ends the attempt rather than escaping
          it. This is that control. */}
      <div className="mt-4">
        <AuthPlainButton
          size="xs"
          label={t('auth.signOut')}
          onClick={() => {
            shell.session_lifecycle.signOut()
            navigate('/signin', { replace: true })
          }}
        />
      </div>
    </AuthCard>
  )
}

/**
 * One radio option: 13/600 label, a 12 px description, and the dependent
 * content revealed when it is chosen.
 *
 * The description is bound with `aria-describedby` rather than folded into the
 * label, so a screen reader announces the choice and then the consequence
 * instead of one long run-on name.
 */
function MethodOption({
  value,
  label,
  help,
  selected,
  children,
}: {
  value: string
  label: string
  help: string
  selected: boolean
  children?: ReactNode
}) {
  const id = `enrol-method-${value}`
  const helpId = `${id}-help`
  return (
    <div className="flex flex-col">
      <div className="flex items-start gap-2">
        <RadioGroupItem id={id} value={value} aria-describedby={helpId} className="mt-0.5" />
        <div className="flex flex-col gap-0.5">
          <Label htmlFor={id} className="font-semibold">
            {label}
          </Label>
          <p id={helpId} className="text-xs text-muted-foreground">
            {help}
          </p>
        </div>
      </div>
      {selected ? children : null}
    </div>
  )
}
